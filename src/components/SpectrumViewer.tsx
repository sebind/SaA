import React, { useMemo, useRef, useState } from 'react';
import { PeakData, ReferenceMaterial } from '../types/spectrum';
import { evaluatePeakProfile } from '../utils/ramanMath';
import { RotateCcw, ZoomIn, Eye, EyeOff, Layers } from 'lucide-react';

interface SpectrumViewerProps {
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

export const SpectrumViewer: React.FC<SpectrumViewerProps> = ({
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
  const height = 400;
  const pad = { top: 28, right: 28, bottom: 46, left: 64 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const fullXMin = x.length > 0 ? x[0] : 100;
  const fullXMax = x.length > 0 ? x[x.length - 1] : 3000;
  const [xMin, xMax] = zoomDomain || [fullXMin, fullXMax];

  // Visible slice indices
  const visibleIndices = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < x.length; i++) {
      if (x[i] >= xMin && x[i] <= xMax) {
        indices.push(i);
      }
    }
    return indices;
  }, [x, xMin, xMax]);

  // Compute Y domain based on active view mode
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
      yMin: minVal - span * 0.04,
      yMax: maxVal + span * 0.14
    };
  }, [visibleIndices, viewMode, rawY, baseline, processedY, compositeFit, showCompositeFit]);

  const toSvgX = (wn: number) =>
    pad.left + ((wn - xMin) / (xMax - xMin || 1)) * plotW;

  const toSvgY = (intensity: number) =>
    pad.top + plotH - ((intensity - yMin) / (yMax - yMin || 1)) * plotH;

  const fromSvgX = (px: number) =>
    xMin + ((px - pad.left) / plotW) * (xMax - xMin);

  // Build SVG path helper
  const buildPath = (yArr: number[]) => {
    if (visibleIndices.length === 0) return '';
    const pts = visibleIndices.map(
      (i) => `${toSvgX(x[i]).toFixed(1)},${toSvgY(yArr[i]).toFixed(1)}`
    );
    return `M ${pts.join(' L ')}`;
  };

  // Build area path for individual fitted Gaussian/Lorentzian components
  const buildPeakAreaPath = (peak: PeakData) => {
    if (visibleIndices.length === 0) return '';
    const relevant = visibleIndices.filter(
      (i) => Math.abs(x[i] - peak.center) <= peak.fwhm * 3.2
    );
    if (relevant.length < 2) return '';
    const baseLineY = toSvgY(0).toFixed(1);
    const startX = toSvgX(x[relevant[0]]).toFixed(1);
    const endX = toSvgX(x[relevant[relevant.length - 1]]).toFixed(1);
    const curvePts = relevant.map((i) => {
      const val = evaluatePeakProfile(x[i], peak.center, peak.amplitude, peak.fwhm, peak.shape);
      return `${toSvgX(x[i]).toFixed(1)},${toSvgY(val).toFixed(1)}`;
    });
    return `M ${startX},${baseLineY} L ${curvePts.join(' L ')} L ${endX},${baseLineY} Z`;
  };

  // Generate clean axis ticks
  const xTicks = useMemo(() => {
    const count = 8;
    const step = (xMax - xMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => Number((xMin + i * step).toFixed(0)));
  }, [xMin, xMax]);

  const yTicks = useMemo(() => {
    const count = 5;
    const step = (yMax - yMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => yMin + i * step);
  }, [yMin, yMax]);

  // Mouse handlers for crosshair and drag-to-zoom
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

    // Find nearest point index for crosshair
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
    <div ref={containerRef} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Top Toolbar */}
      <div className="px-4 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50">
        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-lg p-0.5 bg-slate-200/70 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewMode('processed')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'processed'
                  ? 'bg-white text-teal-700 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Processed & Fits
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'raw'
                  ? 'bg-white text-teal-700 shadow-sm font-semibold'
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
                    ? 'bg-teal-50 border-teal-200 text-teal-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                {showIndividualPeaks ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                Deconvoluted Peaks
              </button>

              <button
                type="button"
                onClick={() => setShowCompositeFit(!showCompositeFit)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                  showCompositeFit
                    ? 'bg-teal-50 border-teal-200 text-teal-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                Envelope
              </button>
            </>
          )}

          {referenceMaterial && (
            <button
              type="button"
              onClick={onToggleReferenceOverlay}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                showReferenceOverlay
                  ? 'bg-teal-600 border-teal-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Toggle Reference Standard Peak Lines"
            >
              <Layers className="w-3.5 h-3.5" />
              Ref: {referenceMaterial.name.split(' ')[0]}
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500">
          {hoverIndex !== null && x[hoverIndex] !== undefined && (
            <div className="font-mono bg-slate-100 px-2.5 py-1 rounded-md text-slate-700 border border-slate-200/80">
              <span className="text-teal-700 font-semibold">{x[hoverIndex].toFixed(1)} cm⁻¹</span>
              <span className="mx-1.5 text-slate-300">|</span>
              <span>I: {activeYArray[hoverIndex]?.toFixed(2)}</span>
            </div>
          )}

          {zoomDomain ? (
            <button
              type="button"
              onClick={() => setZoomDomain(null)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 font-medium transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Zoom
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 text-slate-400">
              <ZoomIn className="w-3.5 h-3.5" /> Drag across plot to zoom
            </span>
          )}
        </div>
      </div>

      {/* Interactive SVG Canvas */}
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
          </defs>

          {/* Horizontal & Vertical Grid Lines */}
          {yTicks.map((yt, idx) => {
            const py = toSvgY(yt);
            return (
              <g key={`y-grid-${idx}`}>
                <line
                  x1={pad.left}
                  y1={py}
                  x2={width - pad.right}
                  y2={py}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                />
                <text
                  x={pad.left - 8}
                  y={py + 4}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {Math.abs(yt) >= 10 ? yt.toFixed(0) : yt.toFixed(2)}
                </text>
              </g>
            );
          })}

          {xTicks.map((xt, idx) => {
            const px = toSvgX(xt);
            return (
              <g key={`x-grid-${idx}`}>
                <line
                  x1={px}
                  y1={pad.top}
                  x2={px}
                  y2={height - pad.bottom}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                />
                <text
                  x={px}
                  y={height - pad.bottom + 16}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-mono"
                >
                  {xt}
                </text>
              </g>
            );
          })}

          {/* Axis Labels */}
          <text
            x={pad.left + plotW / 2}
            y={height - 8}
            textAnchor="middle"
            className="fill-slate-500 text-[11px] font-medium"
          >
            Raman Shift (cm⁻¹)
          </text>
          <text
            x={16}
            y={pad.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90, 16, ${pad.top + plotH / 2})`}
            className="fill-slate-500 text-[11px] font-medium"
          >
            Intensity (a.u.)
          </text>

          {/* Clipped Plot Content */}
          <g clipPath="url(#spectrum-plot-clip)">
            {/* Reference Material Overlay Lines */}
            {showReferenceOverlay &&
              referenceMaterial &&
              referenceMaterial.peaks.map((refPeak, idx) => {
                if (refPeak.wavenumber < xMin || refPeak.wavenumber > xMax) return null;
                const rx = toSvgX(refPeak.wavenumber);
                const topY = toSvgY(yMin + (yMax - yMin) * (0.82 * refPeak.relativeIntensity));
                const botY = toSvgY(0);
                return (
                  <g key={`ref-peak-${idx}`}>
                    <line
                      x1={rx}
                      y1={topY}
                      x2={rx}
                      y2={botY}
                      stroke="#0d9488"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      opacity={0.55}
                    />
                    <rect
                      x={rx - 28}
                      y={pad.top + 4}
                      width={56}
                      height={15}
                      rx={3}
                      fill="#f0fdfa"
                      stroke="#99f6e4"
                      strokeWidth={0.8}
                    />
                    <text
                      x={rx}
                      y={pad.top + 14}
                      textAnchor="middle"
                      className="fill-teal-800 text-[9px] font-mono font-semibold"
                    >
                      Ref {refPeak.wavenumber}
                    </text>
                  </g>
                );
              })}

            {/* Deconvoluted Individual Gaussian/Lorentzian Peak Areas */}
            {viewMode === 'processed' &&
              showIndividualPeaks &&
              peaks.map((peak) => {
                const isSelected = peak.id === selectedPeakId;
                return (
                  <path
                    key={`fit-area-${peak.id}`}
                    d={buildPeakAreaPath(peak)}
                    fill={peak.color}
                    fillOpacity={isSelected ? 0.28 : 0.12}
                    stroke={peak.color}
                    strokeWidth={isSelected ? 2 : 1.1}
                    strokeDasharray={isSelected ? 'none' : '3 2'}
                    className="cursor-pointer transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPeak(isSelected ? null : peak.id);
                    }}
                  />
                );
              })}

            {/* Raw + Baseline View */}
            {viewMode === 'raw' && (
              <>
                <path
                  d={buildPath(rawY)}
                  fill="none"
                  stroke="#0f766e"
                  strokeWidth={1.6}
                />
                <path
                  d={buildPath(baseline)}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                />
              </>
            )}

            {/* Processed Spectrum + Composite Fit View */}
            {viewMode === 'processed' && (
              <>
                <path
                  d={buildPath(processedY)}
                  fill="none"
                  stroke="#0f172a"
                  strokeWidth={1.65}
                  opacity={0.88}
                />
                {showCompositeFit && peaks.length > 0 && (
                  <path
                    d={buildPath(compositeFit)}
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth={1.8}
                    strokeDasharray="4 3"
                  />
                )}
              </>
            )}

            {/* Detected Peak Markers & Wavenumber Callouts */}
            {viewMode === 'processed' &&
              peaks.map((peak) => {
                if (peak.center < xMin || peak.center > xMax) return null;
                const px = toSvgX(peak.center);
                const py = toSvgY(peak.amplitude);
                const isSelected = peak.id === selectedPeakId;
                return (
                  <g
                    key={`marker-${peak.id}`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectPeak(isSelected ? null : peak.id);
                    }}
                  >
                    <line
                      x1={px}
                      y1={py - 6}
                      x2={px}
                      y2={py - 16}
                      stroke={isSelected ? '#0f766e' : '#64748b'}
                      strokeWidth={1.2}
                    />
                    <circle
                      cx={px}
                      cy={py}
                      r={isSelected ? 5 : 3.5}
                      fill={isSelected ? '#0d9488' : '#ffffff'}
                      stroke="#0d9488"
                      strokeWidth={2}
                    />
                    <rect
                      x={px - 26}
                      y={Math.max(pad.top + 2, py - 32)}
                      width={52}
                      height={15}
                      rx={4}
                      fill={isSelected ? '#0d9488' : '#ffffff'}
                      stroke={isSelected ? '#0d9488' : '#cbd5e1'}
                      strokeWidth={1}
                    />
                    <text
                      x={px}
                      y={Math.max(pad.top + 12, py - 21)}
                      textAnchor="middle"
                      className={`text-[9.5px] font-mono font-semibold ${
                        isSelected ? 'fill-white' : 'fill-slate-700'
                      }`}
                    >
                      {peak.center.toFixed(0)}
                    </text>
                  </g>
                );
              })}

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
                  strokeDasharray="2 2"
                />
                <circle
                  cx={toSvgX(x[hoverIndex])}
                  cy={toSvgY(activeYArray[hoverIndex])}
                  r={3.5}
                  fill="#0d9488"
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
                fill="#14b8a6"
                fillOpacity={0.15}
                stroke="#0d9488"
                strokeWidth={1}
              />
            )}
          </g>

          {/* Plot Border Frame */}
          <rect
            x={pad.left}
            y={pad.top}
            width={plotW}
            height={plotH}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        </svg>
      </div>

      {/* Compact Legend Footer */}
      <div className="px-4 py-2 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <div className="flex flex-wrap items-center gap-4">
          {viewMode === 'processed' ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-slate-900 inline-block rounded" />
                Experimental Spectrum
              </span>
              {showCompositeFit && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-teal-600 inline-block border-b border-dashed border-teal-600" />
                  Composite Fit Envelope
                </span>
              )}
              {showIndividualPeaks && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-teal-500/25 border border-teal-600 inline-block" />
                  Fitted Peak Profiles ({peaks[0]?.shape || 'Gaussian/Lorentzian'})
                </span>
              )}
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-teal-700 inline-block" />
                Raw Imported Spectrum
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-500 inline-block" />
                Estimated Fluorescence Baseline
              </span>
            </>
          )}
        </div>
        <span>Click any peak marker to inspect vibrational assignment</span>
      </div>
    </div>
  );
};
