import React, { useMemo, useRef, useState } from 'react';
import { PeakData, ReferenceMaterial } from '../types/spectrum';
import { evaluatePeakProfile } from '../utils/ramanMath';
import { RotateCcw, Eye, EyeOff, Layers } from 'lucide-react';

interface SpectrumViewerProps {
  sampleName?: string;
  laserWavelength?: string;
  x: number[];
  rawY: number[];
  baseline: number[];
  processedY: number[];
  compositeFit: number[];
  peaks: PeakData[];
  selectedPeakId: string | null;
  onSelectPeak: (id: string | null) => void;
  referenceMaterial?: ReferenceMaterial;
  showReferenceOverlay: boolean;
  onToggleReferenceOverlay: () => void;
  svgRef: React.RefObject<SVGSVGElement>;
}

/**
 * Extract a concise publication-style symmetry/mode symbol (e.g. "E'(Γ)", "A₁g", "2LA(M)", "Si")
 * from a longer vibrational mode description.
 */
function formatShortModeLabel(rawMode?: string): string {
  if (!rawMode) return '';
  const parenRemoved = rawMode.split('—')[0].split('-')[0].trim();
  const tokens = parenRemoved.split(/\s+/);
  if (tokens.length <= 2) return parenRemoved;
  return tokens.slice(0, 2).join(' ');
}

export const SpectrumViewer: React.FC<SpectrumViewerProps> = ({
  sampleName,
  laserWavelength,
  x,
  rawY,
  baseline,
  processedY,
  compositeFit,
  peaks,
  selectedPeakId,
  onSelectPeak,
  referenceMaterial,
  showReferenceOverlay,
  onToggleReferenceOverlay,
  svgRef
}) => {
  const [viewMode, setViewMode] = useState<'processed' | 'raw'>('processed');
  const [showIndividualPeaks, setShowIndividualPeaks] = useState<boolean>(true);
  const [showCompositeFit, setShowCompositeFit] = useState<boolean>(true);
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const width = 920;
  const height = 430;
  const pad = { top: 32, right: 28, bottom: 54, left: 66 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const fullXMin = x.length > 0 ? x[0] : 100;
  const fullXMax = x.length > 0 ? x[x.length - 1] : 3000;
  const [xMin, xMax] = zoomDomain || [fullXMin, fullXMax];

  const visibleIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < x.length; i++) {
      if (x[i] >= xMin && x[i] <= xMax) {
        indices.push(i);
      }
    }
    return indices;
  }, [x, xMin, xMax]);

  const { yMin, yMax } = useMemo(() => {
    if (visibleIndices.length === 0) return { yMin: 0, yMax: 1 };
    let minVal = Infinity;
    let maxVal = -Infinity;

    if (viewMode === 'raw') {
      for (const i of visibleIndices) {
        if (rawY[i] < minVal) minVal = rawY[i];
        if (rawY[i] > maxVal) maxVal = rawY[i];
        if (baseline[i] < minVal) minVal = baseline[i];
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
      yMin: minVal - span * 0.05,
      yMax: maxVal + span * 0.24
    };
  }, [visibleIndices, viewMode, rawY, baseline, processedY, compositeFit, showCompositeFit]);

  const toSvgX = (wn: number) =>
    pad.left + ((wn - xMin) / (xMax - xMin || 1)) * plotW;

  const toSvgY = (intensity: number) =>
    pad.top + plotH - ((intensity - yMin) / (yMax - yMin || 1)) * plotH;

  const fromSvgX = (px: number) =>
    xMin + ((px - pad.left) / plotW) * (xMax - xMin);

  const buildPath = (yArr: number[]) => {
    if (visibleIndices.length === 0) return '';
    const pts = visibleIndices.map(
      (i) => `${toSvgX(x[i]).toFixed(1)},${toSvgY(yArr[i]).toFixed(1)}`
    );
    return `M ${pts.join(' L ')}`;
  };

  const referenceCurvePath = useMemo(() => {
    if (
      !showReferenceOverlay ||
      !referenceMaterial?.spectrumX ||
      !referenceMaterial?.spectrumY ||
      referenceMaterial.spectrumX.length < 5
    ) {
      return '';
    }
    const rx = referenceMaterial.spectrumX;
    const ry = referenceMaterial.spectrumY;
    let minR = Infinity;
    let maxR = -Infinity;
    for (let i = 0; i < rx.length; i++) {
      if (rx[i] >= xMin && rx[i] <= xMax) {
        if (ry[i] < minR) minR = ry[i];
        if (ry[i] > maxR) maxR = ry[i];
      }
    }
    const spanR = maxR - minR || 1;
    const targetSpan = (yMax - yMin) * 0.72;
    const pts: string[] = [];
    for (let i = 0; i < rx.length; i++) {
      if (rx[i] >= xMin && rx[i] <= xMax) {
        const scaledY = ((ry[i] - minR) / spanR) * targetSpan;
        pts.push(`${toSvgX(rx[i]).toFixed(1)},${toSvgY(scaledY).toFixed(1)}`);
      }
    }
    return pts.length > 1 ? `M ${pts.join(' L ')}` : '';
  }, [showReferenceOverlay, referenceMaterial, xMin, xMax, yMin, yMax]);

  const buildPeakAreaAndCurve = (peak: PeakData) => {
    if (visibleIndices.length === 0) return { areaPath: '', curvePath: '' };
    const relevant = visibleIndices.filter(
      (i) => Math.abs(x[i] - peak.center) <= Math.max(peak.fwhm * 4.5, 28)
    );
    if (relevant.length < 2) return { areaPath: '', curvePath: '' };
    const baseLineY = toSvgY(0).toFixed(1);
    const startX = toSvgX(x[relevant[0]]).toFixed(1);
    const endX = toSvgX(x[relevant[relevant.length - 1]]).toFixed(1);
    const curvePts = relevant.map((i) => {
      const val = evaluatePeakProfile(x[i], peak.center, peak.amplitude, peak.fwhm, peak.shape);
      return `${toSvgX(x[i]).toFixed(1)},${toSvgY(val).toFixed(1)}`;
    });
    return {
      areaPath: `M ${startX},${baseLineY} L ${curvePts.join(' L ')} L ${endX},${baseLineY} Z`,
      curvePath: `M ${curvePts.join(' L ')}`
    };
  };

  // Compute clean publication-style major and minor ticks for X-axis
  const { xMajorTicks, xMinorTicks } = useMemo(() => {
    const span = Math.max(1, xMax - xMin);
    const rawStep = span / 8;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / mag;
    let niceStep = mag;
    if (residual > 5) niceStep = 10 * mag;
    else if (residual > 2.5) niceStep = 5 * mag;
    else if (residual > 1.5) niceStep = 2 * mag;

    const firstMajor = Math.ceil(xMin / niceStep) * niceStep;
    const majors: number[] = [];
    for (let val = firstMajor; val <= xMax + 1e-6; val += niceStep) {
      majors.push(Number(val.toFixed(2)));
    }

    const minorStep = niceStep / 2;
    const firstMinor = Math.ceil(xMin / minorStep) * minorStep;
    const minors: number[] = [];
    for (let val = firstMinor; val <= xMax + 1e-6; val += minorStep) {
      const isMajor = majors.some((m) => Math.abs(m - val) < 1e-4);
      if (!isMajor) {
        minors.push(Number(val.toFixed(2)));
      }
    }

    return { xMajorTicks: majors, xMinorTicks: minors };
  }, [xMin, xMax]);

  const { yMajorTicks, yMinorTicks } = useMemo(() => {
    const count = 5;
    const step = (yMax - yMin) / count;
    const majors = Array.from({ length: count + 1 }, (_, i) => yMin + i * step);
    const minors = Array.from({ length: count }, (_, i) => yMin + (i + 0.5) * step);
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

    const targetWn = fromSvgX(sx);
    let bestIdx = visibleIndices[0] ?? 0;
    let bestDist = Infinity;
    for (const i of visibleIndices) {
      const d = Math.abs(x[i] - targetWn);
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
        const w1 = fromSvgX(Math.min(dragStartX, dragCurrentX));
        const w2 = fromSvgX(Math.max(dragStartX, dragCurrentX));
        if (w2 - w1 > 15) {
          setZoomDomain([Number(w1.toFixed(1)), Number(w2.toFixed(1))]);
        }
      }
    }
    setDragStartX(null);
    setDragCurrentX(null);
  };

  const activeYArray = viewMode === 'processed' ? processedY : rawY;

  return (
    <div ref={containerRef} className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-white">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="inline-flex rounded-lg p-0.5 bg-slate-100 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('processed')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'processed'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Processed
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'raw'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Raw + Baseline
            </button>
          </div>

          {viewMode === 'processed' && (
            <>
              <button
                type="button"
                onClick={() => setShowIndividualPeaks(!showIndividualPeaks)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                  showIndividualPeaks
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {showIndividualPeaks ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                Peak Fit Areas
              </button>

              <button
                type="button"
                onClick={() => setShowCompositeFit(!showCompositeFit)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                  showCompositeFit
                    ? 'bg-red-50 border-red-300 text-red-800 font-semibold'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
                Fit Envelope
              </button>
            </>
          )}

          {referenceMaterial && (
            <button
              type="button"
              onClick={onToggleReferenceOverlay}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                showReferenceOverlay
                  ? 'bg-gradient-to-r from-purple-600 to-violet-800 border-violet-700 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Ref: {referenceMaterial.name.split(' ')[0]}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-600">
          {hoverIndex !== null && x[hoverIndex] !== undefined && (
            <div className="font-mono bg-slate-100 px-2.5 py-1 rounded-md text-slate-900 border border-slate-300">
              <span className="font-bold">{x[hoverIndex].toFixed(1)} cm⁻¹</span>
              <span className="mx-1.5 text-slate-400">|</span>
              <span>{activeYArray[hoverIndex]?.toFixed(2)}</span>
            </div>
          )}

          {zoomDomain && (
            <button
              type="button"
              onClick={() => setZoomDomain(null)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 font-medium transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Zoom
            </button>
          )}
        </div>
      </div>

      {/* SVG Canvas (Published Raman Spectrum Style) */}
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
            <clipPath id="spectrum-plot-clip">
              <rect x={pad.left} y={pad.top} width={plotW} height={plotH} />
            </clipPath>
            <marker
              id="peak-arrow"
              viewBox="0 0 10 10"
              refX="5"
              refY="8"
              markerWidth="5.5"
              markerHeight="5.5"
              orient="auto"
            >
              <path d="M 1.5 1 L 5 9 L 8.5 1 z" fill="#0f172a" />
            </marker>
            <marker
              id="peak-arrow-selected"
              viewBox="0 0 10 10"
              refX="5"
              refY="8"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M 1 1 L 5 9.5 L 9 1 z" fill="#dc2626" />
            </marker>
          </defs>

          {/* Subtle Y-grid + Dark Y-Axis Major Ticks & Labels */}
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
                {/* Left outward major tick */}
                <line
                  x1={pad.left - 6}
                  y1={py}
                  x2={pad.left}
                  y2={py}
                  stroke="#0f172a"
                  strokeWidth={1.6}
                />
                {/* Right inward major tick */}
                <line
                  x1={width - pad.right - 5}
                  y1={py}
                  x2={width - pad.right}
                  y2={py}
                  stroke="#0f172a"
                  strokeWidth={1.4}
                />
                <text
                  x={pad.left - 10}
                  y={py + 4}
                  textAnchor="end"
                  fill="#0f172a"
                  fontSize="11"
                  fontFamily="Inter, system-ui, sans-serif"
                  fontWeight="600"
                  className="text-[11px] font-sans font-semibold"
                >
                  {Math.abs(yt) >= 10 ? yt.toFixed(0) : yt.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Dark Y-Axis Minor Ticks */}
          {yMinorTicks.map((yt, idx) => {
            const py = toSvgY(yt);
            return (
              <g key={`y-minor-${idx}`}>
                <line
                  x1={pad.left - 3.5}
                  y1={py}
                  x2={pad.left}
                  y2={py}
                  stroke="#0f172a"
                  strokeWidth={1.2}
                />
                <line
                  x1={width - pad.right - 3}
                  y1={py}
                  x2={width - pad.right}
                  y2={py}
                  stroke="#0f172a"
                  strokeWidth={1.1}
                />
              </g>
            );
          })}

          {/* Dark X-Axis Major Ticks (Bottom & Top) + Tick Labels */}
          {xMajorTicks.map((xt, idx) => {
            const px = toSvgX(xt);
            return (
              <g key={`x-major-${idx}`}>
                {/* Bottom outward major tick */}
                <line
                  x1={px}
                  y1={height - pad.bottom}
                  x2={px}
                  y2={height - pad.bottom + 7}
                  stroke="#0f172a"
                  strokeWidth={1.7}
                />
                {/* Top inward major tick (mirrors published Raman figure) */}
                <line
                  x1={px}
                  y1={pad.top}
                  x2={px}
                  y2={pad.top + 6}
                  stroke="#0f172a"
                  strokeWidth={1.5}
                />
                <text
                  x={px}
                  y={height - pad.bottom + 21}
                  textAnchor="middle"
                  fill="#0f172a"
                  fontSize="12"
                  fontFamily="Inter, system-ui, sans-serif"
                  fontWeight="600"
                  className="text-[12px] font-sans font-semibold"
                >
                  {xt}
                </text>
              </g>
            );
          })}

          {/* Dark X-Axis Minor Ticks (Bottom & Top) */}
          {xMinorTicks.map((xt, idx) => {
            const px = toSvgX(xt);
            return (
              <g key={`x-minor-${idx}`}>
                <line
                  x1={px}
                  y1={height - pad.bottom}
                  x2={px}
                  y2={height - pad.bottom + 4}
                  stroke="#0f172a"
                  strokeWidth={1.3}
                />
                <line
                  x1={px}
                  y1={pad.top}
                  x2={px}
                  y2={pad.top + 4}
                  stroke="#0f172a"
                  strokeWidth={1.2}
                />
              </g>
            );
          })}

          {/* Dark Publication Axis Titles */}
          <text
            x={pad.left + plotW / 2}
            y={height - 10}
            textAnchor="middle"
            fill="#0f172a"
            fontSize="14"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="700"
            className="text-[14px] font-sans font-bold tracking-tight"
          >
            Raman Shift (cm⁻¹)
          </text>
          <text
            x={18}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            fill="#0f172a"
            fontSize="13"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="700"
            transform={`rotate(-90, 18, ${pad.top + plotH / 2})`}
            className="text-[13px] font-sans font-bold tracking-tight"
          >
            Intensity (a.u.)
          </text>

          <g clipPath="url(#spectrum-plot-clip)">
            {/* Zero-intensity baseline reference line */}
            {viewMode === 'processed' && yMin <= 0 && yMax >= 0 && (
              <line
                x1={pad.left}
                y1={toSvgY(0)}
                x2={width - pad.right}
                y2={toSvgY(0)}
                stroke="#475569"
                strokeWidth={1.1}
              />
            )}

            {/* Reference Overlay */}
            {referenceCurvePath && (
              <path
                d={referenceCurvePath}
                fill="none"
                stroke="#9333ea"
                strokeWidth={1.4}
                strokeDasharray="4 3"
                opacity={0.55}
              />
            )}
            {showReferenceOverlay &&
              referenceMaterial &&
              referenceMaterial.peaks.map((refPeak, idx) => {
                if (refPeak.wavenumber < xMin || refPeak.wavenumber > xMax) return null;
                const rx = toSvgX(refPeak.wavenumber);
                const topY = toSvgY(yMin + (yMax - yMin) * (0.78 * refPeak.relativeIntensity));
                const botY = toSvgY(0);
                return (
                  <g key={`ref-peak-${idx}`}>
                    <line
                      x1={rx}
                      y1={topY}
                      x2={rx}
                      y2={botY}
                      stroke="#9333ea"
                      strokeWidth={1.2}
                      strokeDasharray="3 3"
                      opacity={0.45}
                    />
                  </g>
                );
              })}

            {/* Multi-Color Deconvoluted Peak Fitted Areas & Component Curves */}
            {viewMode === 'processed' &&
              showIndividualPeaks &&
              peaks.map((peak) => {
                const isSelected = peak.id === selectedPeakId;
                const { areaPath, curvePath } = buildPeakAreaAndCurve(peak);
                if (!areaPath) return null;
                return (
                  <g
                    key={`fit-area-${peak.id}`}
                    className="cursor-pointer transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPeak(isSelected ? null : peak.id);
                    }}
                  >
                    <path
                      d={areaPath}
                      fill={peak.color}
                      fillOpacity={isSelected ? 0.42 : 0.25}
                      stroke="none"
                    />
                    <path
                      d={curvePath}
                      fill="none"
                      stroke={peak.color}
                      strokeWidth={isSelected ? 2.4 : 1.55}
                    />
                  </g>
                );
              })}

            {/* Raw + Baseline curves */}
            {viewMode === 'raw' && (
              <>
                <path
                  d={buildPath(rawY)}
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth={1.75}
                />
                <path
                  d={buildPath(baseline)}
                  fill="none"
                  stroke="#dc2626"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                />
              </>
            )}

            {/* Processed Experimental Spectrum + Composite Fit Envelope (Published Raman Style) */}
            {viewMode === 'processed' && (
              <>
                <path
                  d={buildPath(processedY)}
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth={1.6}
                  opacity={0.92}
                />
                {showCompositeFit && peaks.length > 0 && (
                  <path
                    d={buildPath(compositeFit)}
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth={1.85}
                  />
                )}
              </>
            )}

            {/* Published-Style Peak Callout Annotations (Mode in Italic + Wavenumber in Bold + Arrow) */}
            {viewMode === 'processed' &&
              peaks.map((peak, idx) => {
                if (peak.center < xMin || peak.center > xMax) return null;
                const px = toSvgX(peak.center);
                const py = toSvgY(peak.amplitude);
                const isSelected = peak.id === selectedPeakId;

                // Stagger vertical height slightly if neighboring peak is very close in X
                const prevPeak = idx > 0 ? peaks[idx - 1] : null;
                const isCrowded =
                  prevPeak && Math.abs(toSvgX(prevPeak.center) - px) < 42;
                const arrowLen = isCrowded && idx % 2 === 1 ? 30 : 18;

                const arrowTipY = Math.max(pad.top + 34, py - 4);
                const arrowStartY = Math.max(pad.top + 18, arrowTipY - arrowLen);
                const shortMode = formatShortModeLabel(peak.assignedMode?.mode);

                return (
                  <g
                    key={`marker-${peak.id}`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPeak(isSelected ? null : peak.id);
                    }}
                  >
                    {/* Downward pointer arrow (like published WS2 spectrum) */}
                    <line
                      x1={px}
                      y1={arrowStartY}
                      x2={px}
                      y2={arrowTipY}
                      stroke={isSelected ? '#dc2626' : '#0f172a'}
                      strokeWidth={isSelected ? 1.7 : 1.3}
                      markerEnd={
                        isSelected ? 'url(#peak-arrow-selected)' : 'url(#peak-arrow)'
                      }
                    />

                    {/* Color indicator dot at peak apex */}
                    <circle
                      cx={px}
                      cy={py}
                      r={isSelected ? 4.2 : 2.8}
                      fill={peak.color}
                      stroke="#ffffff"
                      strokeWidth={1}
                    />

                    {/* Bold Wavenumber (e.g. 351, 418, 520) */}
                    <text
                      x={px}
                      y={arrowStartY - 4}
                      textAnchor="middle"
                      fill={isSelected ? '#dc2626' : '#0f172a'}
                      fontSize="11"
                      fontFamily="Inter, system-ui, sans-serif"
                      fontWeight="800"
                      className="text-[11px] font-sans font-extrabold"
                    >
                      {peak.center.toFixed(0)}
                    </text>

                    {/* Italic Vibrational Mode Assignment above wavenumber */}
                    {shortMode && (
                      <text
                        x={px}
                        y={arrowStartY - 16}
                        textAnchor="middle"
                        fill="#1e293b"
                        fontSize="10"
                        fontFamily="Georgia, Cambria, serif"
                        fontStyle="italic"
                        fontWeight="600"
                        className="text-[10px] font-serif italic font-semibold"
                      >
                        {shortMode}
                      </text>
                    )}
                  </g>
                );
              })}

            {/* Top-Right Publication Annotation Block (Sample Name & Laser Excitation) */}
            <g transform={`translate(${width - pad.right - 14}, ${pad.top + 22})`}>
              {sampleName && (
                <text
                  x={0}
                  y={0}
                  textAnchor="end"
                  fill="#0f172a"
                  fontSize="13"
                  fontFamily="Inter, system-ui, sans-serif"
                  fontWeight="700"
                  className="text-[13px] font-sans font-bold"
                >
                  {sampleName}
                </text>
              )}
              {laserWavelength && (
                <text
                  x={0}
                  y={17}
                  textAnchor="end"
                  fill="#0f172a"
                  fontSize="11.5"
                  fontFamily="Inter, system-ui, sans-serif"
                  fontWeight="600"
                  className="text-[11.5px] font-sans font-semibold"
                >
                  <tspan fontFamily="Georgia, Cambria, serif" fontStyle="italic">λ</tspan>
                  <tspan baselineShift="sub" fontSize="8.5">exc</tspan>
                  {` = ${laserWavelength}`}
                </text>
              )}
            </g>

            {/* Crosshair on Hover */}
            {hoverIndex !== null && x[hoverIndex] !== undefined && (
              <g>
                <line
                  x1={toSvgX(x[hoverIndex])}
                  y1={pad.top}
                  x2={toSvgX(x[hoverIndex])}
                  y2={height - pad.bottom}
                  stroke="#475569"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
                <circle
                  cx={toSvgX(x[hoverIndex])}
                  cy={toSvgY(activeYArray[hoverIndex])}
                  r={3.5}
                  fill="#dc2626"
                  stroke="#ffffff"
                  strokeWidth={1}
                />
              </g>
            )}

            {/* Drag-to-Zoom Selection Box */}
            {dragStartX !== null && dragCurrentX !== null && Math.abs(dragCurrentX - dragStartX) > 4 && (
              <rect
                x={Math.min(dragStartX, dragCurrentX)}
                y={pad.top}
                width={Math.abs(dragCurrentX - dragStartX)}
                height={plotH}
                fill="#2563eb"
                fillOpacity={0.12}
                stroke="#1d4ed8"
                strokeWidth={1.2}
              />
            )}
          </g>

          {/* Heavy Dark Publication Bounding Frame */}
          <rect
            x={pad.left}
            y={pad.top}
            width={plotW}
            height={plotH}
            fill="none"
            stroke="#0f172a"
            strokeWidth={1.8}
          />
        </svg>
      </div>

      {/* Color-Coded Fitted Peak Area Legend Strip */}
      {viewMode === 'processed' && peaks.length > 0 && (
        <div className="px-4 py-2 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-3 text-slate-700 font-medium">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-slate-800 inline-block" />
              Experimental
            </span>
            {showCompositeFit && (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-red-600 inline-block" />
                Envelope Fit
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {peaks.map((p, idx) => {
              const isSelected = p.id === selectedPeakId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPeak(isSelected ? null : p.id)}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-mono transition ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 font-semibold shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block shrink-0"
                    style={{
                      backgroundColor: p.color,
                      border: `1px solid ${p.color}`
                    }}
                  />
                  <span>P{idx + 1}: {p.center.toFixed(0)} cm⁻¹</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
