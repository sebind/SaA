import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PLConfig,
  PLMaterialReference,
  PLPeakData,
  PLPipelineResult
} from '../types/pl';
import { evaluatePLPeakProfile } from '../utils/plMath';
import { RotateCcw, Eye, EyeOff, Layers, Activity } from 'lucide-react';

interface PLViewerProps {
  sampleName: string;
  materialFormula: string;
  config: PLConfig;
  result: PLPipelineResult;
  selectedPeakId: string | null;
  onSelectPeak: (id: string | null) => void;
  referenceMaterial?: PLMaterialReference;
  showReferenceOverlay: boolean;
  onToggleReferenceOverlay: () => void;
  svgRef: React.RefObject<SVGSVGElement>;
}

export const PLViewer: React.FC<PLViewerProps> = ({
  sampleName,
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
  const [viewMode, setViewMode] = useState<'processed' | 'raw-envelope'>('processed');
  const [showIndividualPeaks, setShowIndividualPeaks] = useState<boolean>(true);
  const [showCompositeFit, setShowCompositeFit] = useState<boolean>(true);
  const [showResiduals, setShowResiduals] = useState<boolean>(true);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const {
    wavelengthNm,
    photonEnergyEv,
    rawIntensity,
    baseline,
    processedY,
    compositeFit,
    rawCompositeEnvelope,
    residual,
    envelopeRSquared,
    nbeToDefectRatio,
    cie1931,
    peaks
  } = result;

  const isEnergyAxis = config.xAxisMode === 'energy';
  const xArr = isEnergyAxis ? photonEnergyEv : wavelengthNm;

  const width = 920;
  const height = 450;
  const pad = { top: showResiduals ? 64 : 32, right: 28, bottom: 56, left: 72 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const fullXMin = xArr.length > 0 ? Math.min(...xArr) : isEnergyAxis ? 1.5 : 350;
  const fullXMax = xArr.length > 0 ? Math.max(...xArr) : isEnergyAxis ? 3.5 : 750;
  const [xMin, xMax] = zoomDomain || [fullXMin, fullXMax];

  useEffect(() => {
    setZoomDomain(null);
    setHoverIndex(null);
  }, [sampleName, isEnergyAxis, fullXMin, fullXMax]);

  const visibleIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < xArr.length; i++) {
      if (xArr[i] >= xMin && xArr[i] <= xMax) {
        indices.push(i);
      }
    }
    return indices;
  }, [xArr, xMin, xMax]);

  const midNm =
    wavelengthNm.length > 0
      ? wavelengthNm[Math.floor(wavelengthNm.length / 2)]
      : 520;

  // Scale factor to map processedY component peaks onto raw counts + baseline when in raw-envelope mode
  const scaleToRaw = useMemo(() => {
    if (config.normMethod === 'none') return 1;
    let maxCorr = 1e-6;
    let maxProc = 1e-6;
    for (let i = 0; i < wavelengthNm.length; i++) {
      const c = Math.max(0, rawIntensity[i] - baseline[i]);
      const jac =
        isEnergyAxis && config.applyJacobianInEnergy
          ? Math.pow(wavelengthNm[i] / midNm, 2)
          : 1;
      if (c * jac > maxCorr) maxCorr = c * jac;
      if (processedY[i] > maxProc) maxProc = processedY[i];
    }
    return maxCorr / maxProc;
  }, [
    config.normMethod,
    config.applyJacobianInEnergy,
    isEnergyAxis,
    midNm,
    wavelengthNm,
    rawIntensity,
    baseline,
    processedY
  ]);

  const { yMin, yMax } = useMemo(() => {
    if (visibleIndices.length === 0) return { yMin: 0, yMax: 1 };
    let minVal = Infinity;
    let maxVal = -Infinity;

    if (viewMode === 'raw-envelope') {
      for (const i of visibleIndices) {
        if (rawIntensity[i] < minVal) minVal = rawIntensity[i];
        if (rawIntensity[i] > maxVal) maxVal = rawIntensity[i];
        if (baseline[i] < minVal) minVal = baseline[i];
        if (showCompositeFit && rawCompositeEnvelope[i] > maxVal) {
          maxVal = rawCompositeEnvelope[i];
        }
      }
    } else {
      for (const i of visibleIndices) {
        if (processedY[i] < minVal) minVal = processedY[i];
        if (processedY[i] > maxVal) maxVal = processedY[i];
        if (showCompositeFit && compositeFit[i] > maxVal) {
          maxVal = compositeFit[i];
        }
      }
      minVal = Math.min(0, minVal);
    }

    const span = maxVal - minVal || 1;
    return {
      yMin: minVal - span * 0.05,
      yMax: maxVal + span * 0.25
    };
  }, [
    visibleIndices,
    viewMode,
    rawIntensity,
    baseline,
    rawCompositeEnvelope,
    processedY,
    compositeFit,
    showCompositeFit
  ]);

  const toSvgX = (val: number) => {
    const frac = (val - xMin) / (xMax - xMin || 1);
    return pad.left + frac * plotW;
  };

  const fromSvgX = (px: number) => {
    const frac = (px - pad.left) / plotW;
    return xMin + frac * (xMax - xMin);
  };

  const toSvgY = (intensity: number) =>
    pad.top + plotH - ((intensity - yMin) / (yMax - yMin || 1)) * plotH;

  const buildPath = (yArr: number[]) => {
    if (visibleIndices.length === 0) return '';
    const pts = visibleIndices.map(
      (i) => `${toSvgX(xArr[i]).toFixed(1)},${toSvgY(yArr[i]).toFixed(1)}`
    );
    return `M ${pts.join(' L ')}`;
  };

  const buildPeakAreaAndCurve = (peak: PLPeakData) => {
    if (visibleIndices.length === 0) return { areaPath: '', curvePath: '' };
    const relevant = visibleIndices.filter(
      (i) =>
        Math.abs(wavelengthNm[i] - peak.centerNm) <=
        Math.max(peak.fwhmNm * 3.4, 24)
    );
    if (relevant.length < 2) return { areaPath: '', curvePath: '' };

    const topPts = relevant.map((i) => {
      const compVal = evaluatePLPeakProfile(
        wavelengthNm[i],
        peak.centerNm,
        peak.amplitude,
        peak.fwhmNm,
        peak.shape,
        peak.voigtMixRatio
      );
      const jac =
        isEnergyAxis && config.applyJacobianInEnergy
          ? Math.pow(wavelengthNm[i] / midNm, 2)
          : 1;
      const yVal =
        viewMode === 'raw-envelope'
          ? baseline[i] + (compVal * scaleToRaw) / Math.max(1e-6, jac)
          : compVal;
      return `${toSvgX(xArr[i]).toFixed(1)},${toSvgY(yVal).toFixed(1)}`;
    });

    const bottomPts = [...relevant].reverse().map((i) => {
      const baseVal = viewMode === 'raw-envelope' ? baseline[i] : 0;
      return `${toSvgX(xArr[i]).toFixed(1)},${toSvgY(baseVal).toFixed(1)}`;
    });

    return {
      areaPath: `M ${topPts.join(' L ')} L ${bottomPts.join(' L ')} Z`,
      curvePath: `M ${topPts.join(' L ')}`
    };
  };

  // Top fit residual strip path
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
      return `${toSvgX(xArr[i]).toFixed(1)},${py.toFixed(1)}`;
    });
    return `M ${pts.join(' L ')}`;
  }, [showResiduals, visibleIndices, residual, xArr, xMin, xMax]);

  const { xMajorTicks, xMinorTicks } = useMemo(() => {
    const span = Math.max(isEnergyAxis ? 0.1 : 5, xMax - xMin);
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
      majors.push(Number(val.toFixed(isEnergyAxis ? 2 : 0)));
    }

    const minorStep = niceStep / 2;
    const firstMinor = Math.ceil(xMin / minorStep) * minorStep;
    const minors: number[] = [];
    for (let val = firstMinor; val <= xMax + 1e-6; val += minorStep) {
      if (!majors.some((m) => Math.abs(m - val) < 1e-4)) {
        minors.push(Number(val.toFixed(isEnergyAxis ? 2 : 1)));
      }
    }
    return { xMajorTicks: majors, xMinorTicks: minors };
  }, [xMin, xMax, isEnergyAxis]);

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

  const getRelativeSvgX = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    return Math.max(pad.left, Math.min(width - pad.right, relX));
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
    const targetX = fromSvgX(sx);
    let bestIdx = visibleIndices[0] ?? 0;
    let bestDist = Infinity;
    for (const i of visibleIndices) {
      const d = Math.abs(xArr[i] - targetX);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    setHoverIndex(bestIdx);
  };

  const handleMouseUp = () => {
    if (dragStartX !== null && dragCurrentX !== null) {
      const dist = Math.abs(dragCurrentX - dragStartX);
      if (dist > 14) {
        const v1 = fromSvgX(dragStartX);
        const v2 = fromSvgX(dragCurrentX);
        const low = Math.min(v1, v2);
        const high = Math.max(v1, v2);
        const minSpan = isEnergyAxis ? 0.08 : 8;
        if (high - low > minSpan) {
          setZoomDomain([
            Number(low.toFixed(isEnergyAxis ? 3 : 1)),
            Number(high.toFixed(isEnergyAxis ? 3 : 1))
          ]);
        }
      }
    }
    setDragStartX(null);
    setDragCurrentX(null);
  };

  const activeYArray =
    viewMode === 'raw-envelope' ? rawIntensity : processedY;

  const refBandgapX = isEnergyAxis
    ? config.referenceBandgapEv
    : 1239.84193 / Math.max(0.5, config.referenceBandgapEv);

  return (
    <div
      ref={containerRef}
      className="bg-white rounded-xl border border-sage-200 shadow-sm overflow-hidden"
    >
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-sage-100 flex flex-wrap items-center justify-between gap-2 bg-white">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="inline-flex rounded-lg p-0.5 bg-sage-50 border border-sage-200 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('processed')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'processed'
                  ? 'bg-maroon-800 text-white shadow-sm font-semibold'
                  : 'text-maroon-900 hover:text-sage-700'
              }`}
            >
              Processed PL
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw-envelope')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'raw-envelope'
                  ? 'bg-maroon-800 text-white shadow-sm font-semibold'
                  : 'text-maroon-900 hover:text-sage-700'
              }`}
            >
              Raw + Baseline + Fit
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowIndividualPeaks(!showIndividualPeaks)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              showIndividualPeaks
                ? 'bg-sage-50 border-sage-300 text-maroon-900 font-semibold'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            {showIndividualPeaks ? (
              <Eye className="w-3.5 h-3.5 text-sage-700" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            Sub-Bands ({peaks.length})
          </button>

          <button
            type="button"
            onClick={() => setShowCompositeFit(!showCompositeFit)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              showCompositeFit
                ? 'bg-maroon-50 border-maroon-300 text-maroon-900 font-semibold'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sage-600 inline-block" />
            Σ Fit (R² = {envelopeRSquared.toFixed(4)})
          </button>

          <button
            type="button"
            onClick={() => setShowResiduals(!showResiduals)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
              showResiduals
                ? 'bg-maroon-900 border-maroon-900 text-white font-semibold'
                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-sage-300" />
            Residuals
          </button>

          {referenceMaterial && (
            <button
              type="button"
              onClick={onToggleReferenceOverlay}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                showReferenceOverlay
                  ? 'bg-gradient-to-r from-maroon-800 to-sage-600 border-maroon-800 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Ref: {referenceMaterial.formula}
            </button>
          )}
        </div>

        {/* Right Side: Live Hover Readout + CIE 1931 Swatch Pill */}
        <div className="flex items-center gap-2 text-xs text-slate-600">
          {hoverIndex !== null && wavelengthNm[hoverIndex] !== undefined ? (
            <div className="font-mono bg-sage-50 px-2.5 py-1 rounded-md text-maroon-950 border border-sage-200">
              <span className="font-bold text-maroon-800">
                λ: {wavelengthNm[hoverIndex].toFixed(1)} nm
              </span>
              <span className="mx-1.5 text-slate-300">|</span>
              <span className="text-sage-700 font-semibold">
                hν: {photonEnergyEv[hoverIndex]?.toFixed(3)} eV
              </span>
              <span className="mx-1.5 text-slate-300">|</span>
              <span>
                {Math.abs(activeYArray[hoverIndex]) >= 100
                  ? activeYArray[hoverIndex]?.toFixed(0)
                  : activeYArray[hoverIndex]?.toFixed(2)}
              </span>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-sage-50/80 border border-sage-200 text-[11px] font-mono text-maroon-900"
              title={`CIE 1931 Chromaticity: (${cie1931.x.toFixed(4)}, ${cie1931.y.toFixed(4)}) — ${cie1931.colorName}`}
            >
              <span
                className="w-3 h-3 rounded-full border border-slate-300 shadow-inner shrink-0"
                style={{ backgroundColor: cie1931.hexColor }}
              />
              <span className="font-semibold">
                CIE ({cie1931.x.toFixed(3)}, {cie1931.y.toFixed(3)})
              </span>
              <span className="text-sage-700 font-bold">
                • {cie1931.dominantWavelengthNm.toFixed(0)} nm
              </span>
            </div>
          )}

          {zoomDomain && (
            <button
              type="button"
              onClick={() => setZoomDomain(null)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-maroon-800 text-white hover:bg-sage-600 font-medium transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Zoom
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas (Publication Steady-State PL Style in Deep Maroon & Sage Green) */}
      <div className="relative select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block cursor-crosshair bg-white"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            setHoverIndex(null);
            setDragStartX(null);
            setDragCurrentX(null);
          }}
        >
          <defs>
            <clipPath id="pl-plot-clip">
              <rect x={pad.left} y={pad.top} width={plotW} height={plotH} />
            </clipPath>
            <clipPath id="pl-residual-clip">
              <rect x={pad.left} y={14} width={plotW} height={40} />
            </clipPath>
            <marker
              id="pl-peak-arrow"
              viewBox="0 0 10 10"
              refX="5"
              refY="8"
              markerWidth="5.5"
              markerHeight="5.5"
              orient="auto"
            >
              <path d="M 1.5 1 L 5 9 L 8.5 1 z" fill="#4d0013" />
            </marker>
            <marker
              id="pl-peak-arrow-selected"
              viewBox="0 0 10 10"
              refX="5"
              refY="8"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 1 1 L 5 9.5 L 9 1 z" fill="#5b875e" />
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
                fill="#f8faf8"
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
                fill="#660019"
                fontSize="10"
                fontWeight="700"
                fontFamily="Inter, system-ui, sans-serif"
              >
                Residual
              </text>
              <g clipPath="url(#pl-residual-clip)">
                <path
                  d={residualPath}
                  fill="none"
                  stroke="#800020"
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
                  stroke="#4d0013"
                  strokeWidth={1.6}
                />
                <line
                  x1={width - pad.right - 5}
                  y1={py}
                  x2={width - pad.right}
                  y2={py}
                  stroke="#4d0013"
                  strokeWidth={1.4}
                />
                <text
                  x={pad.left - 10}
                  y={py + 4}
                  textAnchor="end"
                  fill="#4d0013"
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
                  stroke="#4d0013"
                  strokeWidth={1.2}
                />
                <line
                  x1={width - pad.right - 3}
                  y1={py}
                  x2={width - pad.right}
                  y2={py}
                  stroke="#4d0013"
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
                  stroke="#4d0013"
                  strokeWidth={1.7}
                />
                <line
                  x1={px}
                  y1={pad.top}
                  x2={px}
                  y2={pad.top + 6}
                  stroke="#4d0013"
                  strokeWidth={1.5}
                />
                <text
                  x={px}
                  y={height - pad.bottom + 21}
                  textAnchor="middle"
                  fill="#4d0013"
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
                  stroke="#4d0013"
                  strokeWidth={1.3}
                />
                <line
                  x1={px}
                  y1={pad.top}
                  x2={px}
                  y2={pad.top + 4}
                  stroke="#4d0013"
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
            fill="#4d0013"
            fontSize="14"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="700"
          >
            {isEnergyAxis ? 'Photon Energy, hν (eV)' : 'Emission Wavelength, λ (nm)'}
          </text>
          <text
            x={18}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            fill="#4d0013"
            fontSize="13"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="700"
            transform={`rotate(-90, 18, ${pad.top + plotH / 2})`}
          >
            {config.normMethod === 'none'
              ? 'PL Intensity (counts / a.u.)'
              : 'Normalized PL Intensity (a.u.)'}
          </text>

          <g clipPath="url(#pl-plot-clip)">
            {/* Zero-intensity baseline in processed mode */}
            {viewMode === 'processed' && yMin <= 0 && yMax >= 0 && (
              <line
                x1={pad.left}
                y1={toSvgY(0)}
                x2={width - pad.right}
                y2={toSvgY(0)}
                stroke="#64748b"
                strokeWidth={1.1}
              />
            )}

            {/* Reference Bandgap (Eg) Vertical Marker if within plot bounds */}
            {refBandgapX >= xMin && refBandgapX <= xMax && (
              <g>
                <line
                  x1={toSvgX(refBandgapX)}
                  y1={pad.top}
                  x2={toSvgX(refBandgapX)}
                  y2={height - pad.bottom}
                  stroke="#5b875e"
                  strokeWidth={1.3}
                  strokeDasharray="6 3"
                  opacity={0.75}
                />
                <text
                  x={toSvgX(refBandgapX) + 5}
                  y={pad.top + 14}
                  fill="#39563b"
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="700"
                >
                  E_g ({config.referenceBandgapEv.toFixed(2)} eV)
                </text>
              </g>
            )}

            {/* Reference Material Transition Markers */}
            {showReferenceOverlay &&
              referenceMaterial &&
              referenceMaterial.transitions.map((refT, idx) => {
                const refVal = isEnergyAxis ? refT.energyEv : refT.wavelengthNm;
                if (refVal < xMin || refVal > xMax) return null;
                const rx = toSvgX(refVal);
                const topY = toSvgY(
                  yMin + (yMax - yMin) * (0.75 * refT.relativeIntensity)
                );
                const botY = toSvgY(yMin);
                return (
                  <g key={`pl-ref-${idx}`}>
                    <line
                      x1={rx}
                      y1={topY}
                      x2={rx}
                      y2={botY}
                      stroke="#5b875e"
                      strokeWidth={1.4}
                      strokeDasharray="4 3"
                      opacity={0.5}
                    />
                  </g>
                );
              })}

            {/* Deconvoluted Emission Sub-Band Areas & Curves */}
            {showIndividualPeaks &&
              peaks.map((peak) => {
                const isSelected = peak.id === selectedPeakId;
                const { areaPath, curvePath } = buildPeakAreaAndCurve(peak);
                if (!areaPath) return null;
                return (
                  <g
                    key={`pl-fit-area-${peak.id}`}
                    className="cursor-pointer transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPeak(isSelected ? null : peak.id);
                    }}
                  >
                    <path
                      d={areaPath}
                      fill={peak.color}
                      fillOpacity={isSelected ? 0.38 : 0.22}
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

            {/* Baseline curve in Raw + Baseline + Fit mode */}
            {viewMode === 'raw-envelope' && config.baselineMethod !== 'none' && (
              <path
                d={buildPath(baseline)}
                fill="none"
                stroke="#64748b"
                strokeWidth={1.6}
                strokeDasharray="5 4"
              />
            )}

            {/* Experimental PL Spectrum Curve (Deep Maroon #4d0013) */}
            <path
              d={buildPath(activeYArray)}
              fill="none"
              stroke="#4d0013"
              strokeWidth={1.75}
              opacity={0.92}
            />

            {/* Composite Fit Envelope (Rich Sage Green #466c49) */}
            {showCompositeFit && peaks.length > 0 && (
              <path
                d={buildPath(
                  viewMode === 'raw-envelope'
                    ? rawCompositeEnvelope
                    : compositeFit
                )}
                fill="none"
                stroke="#466c49"
                strokeWidth={2.2}
              />
            )}

            {/* Peak Callout Annotations */}
            {peaks.map((peak, idx) => {
              const pVal = isEnergyAxis ? peak.centerEv : peak.centerNm;
              if (pVal < xMin || pVal > xMax) return null;
              const px = toSvgX(pVal);
              const labelX = Math.max(
                pad.left + 58,
                Math.min(width - pad.right - 58, px)
              );

              const nearIdx = peak.index;
              const jacApex =
                isEnergyAxis && config.applyJacobianInEnergy
                  ? Math.pow(peak.centerNm / midNm, 2)
                  : 1;
              const apexVal =
                viewMode === 'raw-envelope'
                  ? (baseline[nearIdx] || 0) +
                    (peak.amplitude * scaleToRaw) / Math.max(1e-6, jacApex)
                  : peak.amplitude;
              const py = toSvgY(apexVal);
              const isSelected = peak.id === selectedPeakId;

              const prevPeak = idx > 0 ? peaks[idx - 1] : null;
              const prevX = prevPeak
                ? toSvgX(isEnergyAxis ? prevPeak.centerEv : prevPeak.centerNm)
                : -999;
              const isCrowded = Math.abs(prevX - px) < 58;
              const arrowLen = isCrowded && idx % 2 === 1 ? 30 : 18;

              const arrowTipY = Math.max(pad.top + 36, py - 4);
              const arrowStartY = Math.max(pad.top + 20, arrowTipY - arrowLen);
              const shortCode =
                peak.assignedTransition?.shortCode ||
                (peak.originCategory === 'NBE / Excitonic' ? 'NBE' : 'Defect');

              return (
                <g
                  key={`pl-marker-${peak.id}`}
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
                    stroke={isSelected ? '#466c49' : '#4d0013'}
                    strokeWidth={isSelected ? 1.8 : 1.3}
                    markerEnd={
                      isSelected
                        ? 'url(#pl-peak-arrow-selected)'
                        : 'url(#pl-peak-arrow)'
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

                  {/* Peak Wavelength / Photon Energy */}
                  <text
                    x={labelX}
                    y={arrowStartY - 4}
                    textAnchor="middle"
                    fill={isSelected ? '#39563b' : '#660019'}
                    fontSize="10.5"
                    fontFamily="Inter, system-ui, sans-serif"
                    fontWeight="800"
                  >
                    {isEnergyAxis
                      ? `${peak.centerEv.toFixed(2)} eV (${peak.centerNm.toFixed(0)} nm)`
                      : `${peak.centerNm.toFixed(1)} nm (${peak.centerEv.toFixed(2)} eV)`}
                  </text>

                  {/* Transition Short Label + Area % */}
                  <text
                    x={labelX}
                    y={arrowStartY - 16}
                    textAnchor="middle"
                    fill="#39563b"
                    fontSize="10"
                    fontFamily="Georgia, Cambria, serif"
                    fontStyle="italic"
                    fontWeight="700"
                  >
                    {shortCode} ({peak.relativeAreaPercent.toFixed(0)}%)
                  </text>
                </g>
              );
            })}

            {/* Adaptive Publication Annotation Block (avoids overlapping dominant peak) */}
            {(() => {
              const tallestPeak =
                peaks.length > 0
                  ? [...peaks].sort((a, b) => b.amplitude - a.amplitude)[0]
                  : null;
              const tallestPx = tallestPeak
                ? toSvgX(
                    isEnergyAxis ? tallestPeak.centerEv : tallestPeak.centerNm
                  )
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
                    fill="#4d0013"
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
                    fill="#39563b"
                    fontSize="11"
                    fontFamily="Inter, system-ui, sans-serif"
                    fontWeight="700"
                  >
                    {materialFormula} • λ_exc = {config.laserWavelengthNm} nm •{' '}
                    {nbeToDefectRatio !== null
                      ? `I_NBE/I_DLE = ${nbeToDefectRatio.toFixed(2)}`
                      : `T = ${config.temperatureK} K`}
                  </text>
                  <text
                    x={0}
                    y={31}
                    textAnchor={textAnchor}
                    fill="#64748b"
                    fontSize="10.5"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="600"
                  >
                    CIE ({cie1931.x.toFixed(3)}, {cie1931.y.toFixed(3)}) •{' '}
                    {config.fitShape === 'pseudo-voigt'
                      ? `Voigt(${config.voigtMixRatio})`
                      : config.fitShape}{' '}
                    • R² = {envelopeRSquared.toFixed(4)}
                  </text>
                </g>
              );
            })()}

            {/* Hover Crosshair */}
            {hoverIndex !== null && xArr[hoverIndex] !== undefined && (
              <g>
                <line
                  x1={toSvgX(xArr[hoverIndex])}
                  y1={pad.top}
                  x2={toSvgX(xArr[hoverIndex])}
                  y2={height - pad.bottom}
                  stroke="#94a3b8"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <circle
                  cx={toSvgX(xArr[hoverIndex])}
                  cy={toSvgY(activeYArray[hoverIndex])}
                  r={3.8}
                  fill="#800020"
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
                fill="#5b875e"
                fillOpacity={0.14}
                stroke="#800020"
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
            stroke="#4d0013"
            strokeWidth={1.8}
          />
        </svg>
      </div>
    </div>
  );
};
