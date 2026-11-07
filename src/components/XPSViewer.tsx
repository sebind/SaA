import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  XPSConfig,
  XPSCoreLevelReference,
  XPSPeakData,
  XPSPipelineResult
} from '../types/xps';
import { evaluateXPSPeakProfile } from '../utils/xpsMath';
import { RotateCcw, Eye, EyeOff, Layers, Activity } from 'lucide-react';

interface XPSViewerProps {
  sampleName: string;
  coreLevel: string;
  materialFormula: string;
  config: XPSConfig;
  result: XPSPipelineResult;
  selectedPeakId: string | null;
  onSelectPeak: (id: string | null) => void;
  referenceMaterial?: XPSCoreLevelReference;
  showReferenceOverlay: boolean;
  onToggleReferenceOverlay: () => void;
  svgRef: React.RefObject<SVGSVGElement>;
}

function formatShortStateLabel(rawLabel?: string): string {
  if (!rawLabel) return '';
  const beforeParen = rawLabel.split('(')[0].trim();
  return beforeParen.length > 18 ? beforeParen.slice(0, 18).trim() : beforeParen;
}

export const XPSViewer: React.FC<XPSViewerProps> = ({
  sampleName,
  coreLevel,
  materialFormula,
  config,
  result,
  selectedPeakId,
  onSelectPeak,
  referenceMaterial,
  showReferenceOverlay,
  onToggleReferenceOverlay,
  svgRef
}) => {
  const [viewMode, setViewMode] = useState<'subtracted' | 'casa-envelope'>('casa-envelope');
  const [showIndividualPeaks, setShowIndividualPeaks] = useState<boolean>(true);
  const [showCompositeFit, setShowCompositeFit] = useState<boolean>(true);
  const [showResiduals, setShowResiduals] = useState<boolean>(true);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const {
    shiftedBeEv: x,
    kineticEnergyEv,
    rawIntensity,
    background,
    processedY,
    compositeFit,
    rawCompositeEnvelope,
    residual,
    envelopeRSquared,
    peaks
  } = result;

  const width = 920;
  const height = 450;
  const pad = { top: showResiduals ? 64 : 32, right: 28, bottom: 56, left: 72 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const fullXMin = x.length > 0 ? x[0] : 280;
  const fullXMax = x.length > 0 ? x[x.length - 1] : 294;
  const [xMin, xMax] = zoomDomain || [fullXMin, fullXMax];

  useEffect(() => {
    setZoomDomain(null);
    setHoverIndex(null);
  }, [sampleName, fullXMin, fullXMax]);

  const visibleIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < x.length; i++) {
      if (x[i] >= xMin && x[i] <= xMax) {
        indices.push(i);
      }
    }
    return indices;
  }, [x, xMin, xMax]);

  // Scale factor to map processedY component peaks onto the raw CPS + Shirley background when in CasaXPS envelope mode
  const scaleToRaw = useMemo(() => {
    if (config.normMethod === 'none') return 1;
    let maxCorr = 1e-6;
    let maxProc = 1e-6;
    for (let i = 0; i < x.length; i++) {
      const c = Math.max(0, rawIntensity[i] - background[i]);
      if (c > maxCorr) maxCorr = c;
      if (processedY[i] > maxProc) maxProc = processedY[i];
    }
    return maxCorr / maxProc;
  }, [config.normMethod, x.length, rawIntensity, background, processedY]);

  const { yMin, yMax } = useMemo(() => {
    if (visibleIndices.length === 0) return { yMin: 0, yMax: 1 };
    let minVal = Infinity;
    let maxVal = -Infinity;

    if (viewMode === 'casa-envelope') {
      for (const i of visibleIndices) {
        if (rawIntensity[i] < minVal) minVal = rawIntensity[i];
        if (rawIntensity[i] > maxVal) maxVal = rawIntensity[i];
        if (background[i] < minVal) minVal = background[i];
        if (showCompositeFit && rawCompositeEnvelope[i] > maxVal) {
          maxVal = rawCompositeEnvelope[i];
        }
      }
    } else {
      for (const i of visibleIndices) {
        if (processedY[i] < minVal) minVal = processedY[i];
        if (processedY[i] > maxVal) maxVal = processedY[i];
        if (showCompositeFit && compositeFit[i] > maxVal) maxVal = compositeFit[i];
      }
      minVal = Math.min(0, minVal);
    }

    const span = maxVal - minVal || 1;
    return {
      yMin: minVal - span * 0.06,
      yMax: maxVal + span * 0.25
    };
  }, [
    visibleIndices,
    viewMode,
    rawIntensity,
    background,
    rawCompositeEnvelope,
    processedY,
    compositeFit,
    showCompositeFit
  ]);

  // Coordinate transforms supporting Standard XPS Reversed BE Axis (High BE left -> Low BE right)
  const toSvgX = (be: number) => {
    const frac = (be - xMin) / (xMax - xMin || 1);
    return config.reversedAxis
      ? pad.left + (1 - frac) * plotW
      : pad.left + frac * plotW;
  };

  const fromSvgX = (px: number) => {
    const frac = (px - pad.left) / plotW;
    return config.reversedAxis
      ? xMax - frac * (xMax - xMin)
      : xMin + frac * (xMax - xMin);
  };

  const toSvgY = (intensity: number) =>
    pad.top + plotH - ((intensity - yMin) / (yMax - yMin || 1)) * plotH;

  const buildPath = (yArr: number[]) => {
    if (visibleIndices.length === 0) return '';
    const pts = visibleIndices.map(
      (i) => `${toSvgX(x[i]).toFixed(1)},${toSvgY(yArr[i]).toFixed(1)}`
    );
    return `M ${pts.join(' L ')}`;
  };

  // Build individual deconvoluted peak area and curve (either anchored to 0 in subtracted mode or anchored to Shirley/Tougaard background in CasaXPS mode)
  const buildPeakAreaAndCurve = (peak: XPSPeakData) => {
    if (visibleIndices.length === 0) return { areaPath: '', curvePath: '' };
    const relevant = visibleIndices.filter(
      (i) => Math.abs(x[i] - peak.centerEv) <= Math.max(peak.fwhmEv * 3.8, 2.2)
    );
    if (relevant.length < 2) return { areaPath: '', curvePath: '' };

    const topPts = relevant.map((i) => {
      const compVal = evaluateXPSPeakProfile(
        x[i],
        peak.centerEv,
        peak.amplitude,
        peak.fwhmEv,
        peak.shape,
        peak.glMixRatio
      );
      const yVal =
        viewMode === 'casa-envelope'
          ? background[i] + compVal * scaleToRaw
          : compVal;
      return `${toSvgX(x[i]).toFixed(1)},${toSvgY(yVal).toFixed(1)}`;
    });

    const bottomPts = [...relevant].reverse().map((i) => {
      const baseVal = viewMode === 'casa-envelope' ? background[i] : 0;
      return `${toSvgX(x[i]).toFixed(1)},${toSvgY(baseVal).toFixed(1)}`;
    });

    return {
      areaPath: `M ${topPts.join(' L ')} L ${bottomPts.join(' L ')} Z`,
      curvePath: `M ${topPts.join(' L ')}`
    };
  };

  // Residual strip path at the top of the plot
  const residualPath = useMemo(() => {
    if (!showResiduals || visibleIndices.length === 0) return '';
    let maxAbsRes = 1e-6;
    for (const i of visibleIndices) {
      const r = Math.abs(residual[i]);
      if (r > maxAbsRes) maxAbsRes = r;
    }
    const resCenterY = 34;
    const resHalfH = 14;
    const pts = visibleIndices.map((i) => {
      const normR = residual[i] / (maxAbsRes * 1.2);
      const py = resCenterY - normR * resHalfH;
      return `${toSvgX(x[i]).toFixed(1)},${py.toFixed(1)}`;
    });
    return `M ${pts.join(' L ')}`;
  }, [showResiduals, visibleIndices, residual, x, xMin, xMax, config.reversedAxis]);

  // Major and minor ticks for Binding Energy X-axis
  const { xMajorTicks, xMinorTicks } = useMemo(() => {
    const span = Math.max(0.5, xMax - xMin);
    const rawStep = span / 7;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residualStep = rawStep / mag;
    let niceStep = mag;
    if (residualStep > 5) niceStep = 10 * mag;
    else if (residualStep > 2.5) niceStep = 5 * mag;
    else if (residualStep > 1.5) niceStep = 2 * mag;

    const firstMajor = Math.ceil(xMin / niceStep) * niceStep;
    const majors: number[] = [];
    for (let val = firstMajor; val <= xMax + 1e-6; val += niceStep) {
      majors.push(Number(val.toFixed(2)));
    }

    const minorStep = niceStep / 2;
    const firstMinor = Math.ceil(xMin / minorStep) * minorStep;
    const minors: number[] = [];
    for (let val = firstMinor; val <= xMax + 1e-6; val += minorStep) {
      if (!majors.some((m) => Math.abs(m - val) < 1e-4)) {
        minors.push(Number(val.toFixed(2)));
      }
    }
    return { xMajorTicks: majors, xMinorTicks: minors };
  }, [xMin, xMax]);

  const { yMajorTicks, yMinorTicks } = useMemo(() => {
    const count = 5;
    const step = (yMax - yMin) / count;
    const majors = Array.from({ length: count + 1 }, (_, i) => yMin + i * step);
    const minors = Array.from(
      { length: count },
      (_, i) => yMin + (i + 0.5) * step
    );
    return { yMajorTicks: majors, yMinorTicks: minors };
  }, [yMin, yMax]);

  const getRelativeSvgXFromClientX = (clientX: number) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * width;
    return Math.max(pad.left, Math.min(width - pad.right, relX));
  };

  const getRelativeSvgX = (e: React.MouseEvent<SVGSVGElement>) =>
    getRelativeSvgXFromClientX(e.clientX);

  const updateHoverFromSvgX = (sx: number) => {
    const targetBe = fromSvgX(sx);
    let bestIdx = visibleIndices[0] ?? 0;
    let bestDist = Infinity;
    for (const i of visibleIndices) {
      const d = Math.abs(x[i] - targetBe);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    setHoverIndex(bestIdx);
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const sx = getRelativeSvgX(e);
    if (sx !== null) {
      setDragStartX(sx);
      setDragCurrentX(sx);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const sx = getRelativeSvgX(e);
    if (sx === null) return;
    if (dragStartX !== null) {
      setDragCurrentX(sx);
    }
    updateHoverFromSvgX(sx);
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    const sx = getRelativeSvgXFromClientX(touch.clientX);
    if (sx !== null) {
      updateHoverFromSvgX(sx);
    }
  };

  const handleMouseUp = () => {
    if (dragStartX !== null && dragCurrentX !== null) {
      const dist = Math.abs(dragCurrentX - dragStartX);
      if (dist > 14) {
        const b1 = fromSvgX(dragStartX);
        const b2 = fromSvgX(dragCurrentX);
        const low = Math.min(b1, b2);
        const high = Math.max(b1, b2);
        if (high - low > 0.6) {
          setZoomDomain([Number(low.toFixed(2)), Number(high.toFixed(2))]);
        }
      }
    }
    setDragStartX(null);
    setDragCurrentX(null);
  };

  const activeYArray =
    viewMode === 'casa-envelope' ? rawIntensity : processedY;

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-xl border border-deepblue-200 shadow-sm overflow-hidden"
    >
      {/* Toolbar */}
      <div className="px-3 sm:px-4 py-2 border-b border-deepblue-100 flex flex-wrap items-center justify-between gap-2 bg-white">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="inline-flex rounded-lg p-0.5 bg-deepblue-50 border border-deepblue-100 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('casa-envelope')}
              className={`px-2 sm:px-2.5 py-1 rounded-md transition ${
                viewMode === 'casa-envelope'
                  ? 'bg-deepblue-800 text-white shadow-sm font-semibold'
                  : 'text-deepblue-900 hover:text-bubblegum-600'
              }`}
            >
              <span className="sm:hidden">Raw + Fit</span>
              <span className="hidden sm:inline">
                Raw +{' '}
                {config.backgroundMethod === 'none'
                  ? 'Envelope'
                  : `${
                      config.backgroundMethod.charAt(0).toUpperCase() +
                      config.backgroundMethod.slice(1)
                    } + Fit`}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('subtracted')}
              className={`px-2 sm:px-2.5 py-1 rounded-md transition ${
                viewMode === 'subtracted'
                  ? 'bg-deepblue-800 text-white shadow-sm font-semibold'
                  : 'text-deepblue-900 hover:text-bubblegum-600'
              }`}
            >
              <span className="sm:hidden">Subtracted</span>
              <span className="hidden sm:inline">BG-Subtracted</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowIndividualPeaks(!showIndividualPeaks)}
            className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              showIndividualPeaks
                ? 'bg-deepblue-50 border-deepblue-300 text-deepblue-900 font-semibold'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {showIndividualPeaks ? (
              <Eye className="w-3.5 h-3.5 text-deepblue-700 shrink-0" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="sm:hidden">Peaks ({peaks.length})</span>
            <span className="hidden sm:inline">Sub-Peaks ({peaks.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCompositeFit(!showCompositeFit)}
            className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              showCompositeFit
                ? 'bg-bubblegum-50 border-bubblegum-300 text-bubblegum-800 font-semibold'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-bubblegum-500 inline-block shrink-0" />
            <span className="sm:hidden">Σ Fit</span>
            <span className="hidden sm:inline">
              Σ Fit (R² = {envelopeRSquared.toFixed(4)})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowResiduals(!showResiduals)}
            className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              showResiduals
                ? 'bg-deepblue-900 border-deepblue-900 text-white font-semibold'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-bubblegum-400 shrink-0" />
            <span>Residuals</span>
          </button>

          {referenceMaterial && (
            <button
              type="button"
              onClick={onToggleReferenceOverlay}
              className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                showReferenceOverlay
                  ? 'bg-gradient-to-r from-deepblue-800 to-bubblegum-600 border-deepblue-800 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">Ref: {referenceMaterial.coreLevel}</span>
              <span className="hidden sm:inline">
                NIST Ref: {referenceMaterial.coreLevel}
              </span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600 flex-wrap">
          {hoverIndex !== null && x[hoverIndex] !== undefined && (
            <div className="font-mono bg-deepblue-50 px-2 py-1 rounded-md text-deepblue-950 border border-deepblue-200 text-[11px] sm:text-xs">
              <span className="font-bold text-deepblue-800">
                BE: {x[hoverIndex].toFixed(2)} eV
              </span>
              <span className="mx-1 text-slate-300">|</span>
              <span className="text-bubblegum-700 font-semibold">
                KE: {kineticEnergyEv[hoverIndex]?.toFixed(1)} eV
              </span>
              <span className="mx-1 text-slate-300">|</span>
              <span>
                {Math.abs(activeYArray[hoverIndex]) >= 100
                  ? activeYArray[hoverIndex]?.toFixed(0)
                  : activeYArray[hoverIndex]?.toFixed(2)}
              </span>
            </div>
          )}

          {zoomDomain && (
            <button
              type="button"
              onClick={() => setZoomDomain(null)}
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-deepblue-900 text-white hover:bg-bubblegum-600 font-medium transition"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">Reset</span>
              <span className="hidden sm:inline">Reset Zoom</span>
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas (Publication CasaXPS / Avantage Style in Deep Blue & Bubblegum Pink) */}
      <div className="relative select-none touch-pan-y">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block cursor-crosshair bg-white"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchMove}
          onTouchMove={handleTouchMove}
          onMouseLeave={() => {
            setHoverIndex(null);
            setDragStartX(null);
            setDragCurrentX(null);
          }}
        >
          <defs>
            <clipPath id="xps-plot-clip">
              <rect x={pad.left} y={pad.top} width={plotW} height={plotH} />
            </clipPath>
            <clipPath id="xps-residual-clip">
              <rect x={pad.left} y={14} width={plotW} height={40} />
            </clipPath>
            <marker
              id="xps-peak-arrow"
              viewBox="0 0 10 10"
              refX="5"
              refY="8"
              markerWidth="5.5"
              markerHeight="5.5"
              orient="auto"
            >
              <path d="M 1.5 1 L 5 9 L 8.5 1 z" fill="#0a1e5c" />
            </marker>
            <marker
              id="xps-peak-arrow-selected"
              viewBox="0 0 10 10"
              refX="5"
              refY="8"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 1 1 L 5 9.5 L 9 1 z" fill="#ff2e93" />
            </marker>
          </defs>

          {/* Optional Top Fit Residual Strip */}
          {showResiduals && (
            <g>
              <rect
                x={pad.left}
                y={16}
                width={plotW}
                height={36}
                fill="#f8faff"
                stroke="#cbd5e1"
                strokeWidth={1}
              />
              <line
                x1={pad.left}
                y1={34}
                x2={width - pad.right}
                y2={34}
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <text
                x={pad.left - 8}
                y={37}
                textAnchor="end"
                fill="#0f2c82"
                fontSize="10"
                fontWeight="700"
                fontFamily="Inter, system-ui, sans-serif"
              >
                Residual
              </text>
              <g clipPath="url(#xps-residual-clip)">
                <path
                  d={residualPath}
                  fill="none"
                  stroke="#ff2e93"
                  strokeWidth={1.35}
                />
              </g>
            </g>
          )}

          {/* Y-Axis Grid + Ticks */}
          {yMajorTicks.map((yt, idx) => {
            const py = toSvgY(yt);
            return (
              <g key={`y-major-${idx}`}>
                <line
                  x1={pad.left}
                  y1={py}
                  x2={width - pad.right}
                  y2={py}
                  stroke="#f1f5f9"
                  strokeWidth={0.8}
                />
                <line
                  x1={pad.left - 6}
                  y1={py}
                  x2={pad.left}
                  y2={py}
                  stroke="#0a1e5c"
                  strokeWidth={1.6}
                />
                <line
                  x1={width - pad.right - 5}
                  y1={py}
                  x2={width - pad.right}
                  y2={py}
                  stroke="#0a1e5c"
                  strokeWidth={1.4}
                />
                <text
                  x={pad.left - 10}
                  y={py + 4}
                  textAnchor="end"
                  fill="#0a1e5c"
                  fontSize="11"
                  fontFamily="Inter, system-ui, sans-serif"
                  fontWeight="600"
                >
                  {Math.abs(yt) >= 1000
                    ? `${(yt / 1000).toFixed(1)}k`
                    : Math.abs(yt) >= 10
                    ? yt.toFixed(0)
                    : yt.toFixed(2)}
                </text>
              </g>
            );
          })}

          {yMinorTicks.map((yt, idx) => {
            const py = toSvgY(yt);
            return (
              <g key={`y-minor-${idx}`}>
                <line
                  x1={pad.left - 3.5}
                  y1={py}
                  x2={pad.left}
                  y2={py}
                  stroke="#0a1e5c"
                  strokeWidth={1.2}
                />
                <line
                  x1={width - pad.right - 3}
                  y1={py}
                  x2={width - pad.right}
                  y2={py}
                  stroke="#0a1e5c"
                  strokeWidth={1.1}
                />
              </g>
            );
          })}

          {/* X-Axis Major & Minor Ticks */}
          {xMajorTicks.map((xt, idx) => {
            const px = toSvgX(xt);
            return (
              <g key={`x-major-${idx}`}>
                <line
                  x1={px}
                  y1={height - pad.bottom}
                  x2={px}
                  y2={height - pad.bottom + 7}
                  stroke="#0a1e5c"
                  strokeWidth={1.7}
                />
                <line
                  x1={px}
                  y1={pad.top}
                  x2={px}
                  y2={pad.top + 6}
                  stroke="#0a1e5c"
                  strokeWidth={1.5}
                />
                <text
                  x={px}
                  y={height - pad.bottom + 21}
                  textAnchor="middle"
                  fill="#0a1e5c"
                  fontSize="12"
                  fontFamily="Inter, system-ui, sans-serif"
                  fontWeight="600"
                >
                  {xt}
                </text>
              </g>
            );
          })}

          {xMinorTicks.map((xt, idx) => {
            const px = toSvgX(xt);
            return (
              <g key={`x-minor-${idx}`}>
                <line
                  x1={px}
                  y1={height - pad.bottom}
                  x2={px}
                  y2={height - pad.bottom + 4}
                  stroke="#0a1e5c"
                  strokeWidth={1.3}
                />
                <line
                  x1={px}
                  y1={pad.top}
                  x2={px}
                  y2={pad.top + 4}
                  stroke="#0a1e5c"
                  strokeWidth={1.2}
                />
              </g>
            );
          })}

          {/* Publication Axis Titles */}
          <text
            x={pad.left + plotW / 2}
            y={height - 10}
            textAnchor="middle"
            fill="#0a1e5c"
            fontSize="14"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="700"
          >
            Binding Energy (eV)
          </text>
          <text
            x={18}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            fill="#0a1e5c"
            fontSize="13"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="700"
            transform={`rotate(-90, 18, ${pad.top + plotH / 2})`}
          >
            {config.normMethod === 'none'
              ? 'Intensity (CPS)'
              : 'Normalized Intensity (a.u.)'}
          </text>

          <g clipPath="url(#xps-plot-clip)">
            {/* Zero-intensity baseline in BG-subtracted mode */}
            {viewMode === 'subtracted' && yMin <= 0 && yMax >= 0 && (
              <line
                x1={pad.left}
                y1={toSvgY(0)}
                x2={width - pad.right}
                y2={toSvgY(0)}
                stroke="#64748b"
                strokeWidth={1.1}
              />
            )}

            {/* NIST Reference Chemical State Vertical Markers */}
            {showReferenceOverlay &&
              referenceMaterial &&
              referenceMaterial.states.map((refState, idx) => {
                if (
                  refState.bindingEnergyEv < xMin ||
                  refState.bindingEnergyEv > xMax
                ) {
                  return null;
                }
                const rx = toSvgX(refState.bindingEnergyEv);
                const topY = toSvgY(
                  yMin + (yMax - yMin) * (0.76 * refState.relativeIntensity)
                );
                const botY = toSvgY(yMin);
                return (
                  <g key={`ref-state-${idx}`}>
                    <line
                      x1={rx}
                      y1={topY}
                      x2={rx}
                      y2={botY}
                      stroke="#153eaf"
                      strokeWidth={1.3}
                      strokeDasharray="4 3"
                      opacity={0.45}
                    />
                  </g>
                );
              })}

            {/* Deconvoluted Chemical State Component Areas & Curves */}
            {showIndividualPeaks &&
              peaks.map((peak) => {
                const isSelected = peak.id === selectedPeakId;
                const { areaPath, curvePath } = buildPeakAreaAndCurve(peak);
                if (!areaPath) return null;
                return (
                  <g
                    key={`xps-fit-area-${peak.id}`}
                    className="cursor-pointer transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPeak(isSelected ? null : peak.id);
                    }}
                  >
                    <path
                      d={areaPath}
                      fill={peak.color}
                      fillOpacity={isSelected ? 0.42 : 0.24}
                      stroke="none"
                    />
                    <path
                      d={curvePath}
                      fill="none"
                      stroke={peak.color}
                      strokeWidth={isSelected ? 2.5 : 1.65}
                    />
                  </g>
                );
              })}

            {/* Shirley / Tougaard Background Curve (in CasaXPS Envelope mode) */}
            {viewMode === 'casa-envelope' && config.backgroundMethod !== 'none' && (
              <path
                d={buildPath(background)}
                fill="none"
                stroke="#475569"
                strokeWidth={1.65}
                strokeDasharray="5 4"
              />
            )}

            {/* Experimental Spectrum Points / Curve (Deep Blue #0a1e5c) */}
            <path
              d={buildPath(activeYArray)}
              fill="none"
              stroke="#0a1e5c"
              strokeWidth={1.7}
              opacity={0.92}
            />

            {/* Composite Fit Envelope (Vibrant Bubblegum Pink #ff2e93) */}
            {showCompositeFit && peaks.length > 0 && (
              <path
                d={buildPath(
                  viewMode === 'casa-envelope'
                    ? rawCompositeEnvelope
                    : compositeFit
                )}
                fill="none"
                stroke="#ff2e93"
                strokeWidth={2.15}
              />
            )}

            {/* Peak Callout Annotations (Chemical State + Binding Energy eV + Atomic %) */}
            {peaks.map((peak, idx) => {
              if (peak.centerEv < xMin || peak.centerEv > xMax) return null;
              const px = toSvgX(peak.centerEv);
              const labelX = Math.max(
                pad.left + 56,
                Math.min(width - pad.right - 56, px)
              );

              // Find nearest index for background offset
              const nearIdx = peak.index;
              const apexVal =
                viewMode === 'casa-envelope'
                  ? (background[nearIdx] || 0) + peak.amplitude * scaleToRaw
                  : peak.amplitude;
              const py = toSvgY(apexVal);
              const isSelected = peak.id === selectedPeakId;

              const prevPeak = idx > 0 ? peaks[idx - 1] : null;
              const isCrowded =
                prevPeak && Math.abs(toSvgX(prevPeak.centerEv) - px) < 55;
              const arrowLen = isCrowded && idx % 2 === 1 ? 30 : 18;

              const arrowTipY = Math.max(pad.top + 36, py - 4);
              const arrowStartY = Math.max(pad.top + 20, arrowTipY - arrowLen);
              const shortState = formatShortStateLabel(
                peak.assignedState?.stateLabel
              );

              return (
                <g
                  key={`xps-marker-${peak.id}`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPeak(isSelected ? null : peak.id);
                  }}
                >
                  <line
                    x1={px}
                    y1={arrowStartY}
                    x2={px}
                    y2={arrowTipY}
                    stroke={isSelected ? '#ff2e93' : '#0a1e5c'}
                    strokeWidth={isSelected ? 1.8 : 1.3}
                    markerEnd={
                      isSelected
                        ? 'url(#xps-peak-arrow-selected)'
                        : 'url(#xps-peak-arrow)'
                    }
                  />

                  <circle
                    cx={px}
                    cy={py}
                    r={isSelected ? 4.4 : 3.0}
                    fill={peak.color}
                    stroke="#ffffff"
                    strokeWidth={1.2}
                  />

                  {/* Binding Energy (eV) */}
                  <text
                    x={labelX}
                    y={arrowStartY - 4}
                    textAnchor="middle"
                    fill={isSelected ? '#e6177c' : '#0a1e5c'}
                    fontSize="10.5"
                    fontFamily="Inter, system-ui, sans-serif"
                    fontWeight="800"
                  >
                    {peak.centerEv.toFixed(2)} eV
                  </text>

                  {/* Chemical State Label */}
                  {shortState && (
                    <text
                      x={labelX}
                      y={arrowStartY - 16}
                      textAnchor="middle"
                      fill="#153eaf"
                      fontSize="10"
                      fontFamily="Georgia, Cambria, serif"
                      fontStyle="italic"
                      fontWeight="700"
                    >
                      {shortState} ({peak.atomicPercent.toFixed(0)}%)
                    </text>
                  )}
                </g>
              );
            })}

            {/* Adaptive Publication Annotation Block */}
            {(() => {
              const tallestPeak =
                peaks.length > 0
                  ? [...peaks].sort((a, b) => b.amplitude - a.amplitude)[0]
                  : null;
              const tallestPx = tallestPeak
                ? toSvgX(tallestPeak.centerEv)
                : pad.left;
              const placeLeft = tallestPx > pad.left + plotW * 0.54;
              const anchorX = placeLeft
                ? pad.left + 14
                : width - pad.right - 14;
              const textAnchor = placeLeft ? 'start' : 'end';

              return (
                <g transform={`translate(${anchorX}, ${pad.top + 22})`}>
                  <text
                    x={0}
                    y={0}
                    textAnchor={textAnchor}
                    fill="#0a1e5c"
                    fontSize="13"
                    fontFamily="Inter, system-ui, sans-serif"
                    fontWeight="800"
                  >
                    {sampleName}
                  </text>
                  <text
                    x={0}
                    y={16}
                    textAnchor={textAnchor}
                    fill="#e6177c"
                    fontSize="11"
                    fontFamily="Inter, system-ui, sans-serif"
                    fontWeight="700"
                  >
                    {coreLevel} • {materialFormula} •{' '}
                    {config.xraySource === 'Al-Ka'
                      ? 'Al Kα (1486.6 eV)'
                      : 'Mg Kα (1253.6 eV)'}
                  </text>
                  <text
                    x={0}
                    y={31}
                    textAnchor={textAnchor}
                    fill="#475569"
                    fontSize="10.5"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="600"
                  >
                    {config.backgroundMethod.toUpperCase()} BG •{' '}
                    {config.fitShape === 'pseudo-voigt'
                      ? `GL(${config.glMixRatio})`
                      : config.fitShape}{' '}
                    • R² = {envelopeRSquared.toFixed(4)}
                  </text>
                </g>
              );
            })()}

            {/* Hover Crosshair */}
            {hoverIndex !== null && x[hoverIndex] !== undefined && (
              <g>
                <line
                  x1={toSvgX(x[hoverIndex])}
                  y1={pad.top}
                  x2={toSvgX(x[hoverIndex])}
                  y2={height - pad.bottom}
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={toSvgX(x[hoverIndex])}
                  cy={toSvgY(activeYArray[hoverIndex])}
                  r={3.8}
                  fill="#ff2e93"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
              </g>
            )}

            {/* Drag-to-Zoom Selection Box */}
            {dragStartX !== null && dragCurrentX !== null && (
              <rect
                x={Math.min(dragStartX, dragCurrentX)}
                y={pad.top}
                width={Math.abs(dragCurrentX - dragStartX)}
                height={plotH}
                fill="#ff2e93"
                fillOpacity={0.12}
                stroke="#ff2e93"
                strokeWidth={1.2}
                strokeDasharray="4 2"
              />
            )}
          </g>

          {/* Outer Publication Frame Box */}
          <rect
            x={pad.left}
            y={pad.top}
            width={plotW}
            height={plotH}
            fill="none"
            stroke="#0a1e5c"
            strokeWidth={1.8}
          />
        </svg>
      </div>
    </div>
  );
};
