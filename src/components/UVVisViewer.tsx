import React, { useMemo, useState } from 'react';
import { UVVisConfig, UVVisPipelineResult } from '../types/uvvis';
import { Columns, Maximize2, Eye } from 'lucide-react';

interface UVVisViewerProps {
  sampleName: string;
  materialFormula?: string;
  config: UVVisConfig;
  result: UVVisPipelineResult;
  svgRef: React.RefObject<SVGSVGElement>;
}

type PlotLayoutMode = 'dual' | 'tauc-only' | 'spectrum-only' | 'raw-only';

/**
 * Compute a clean power-of-10 scale factor (e.g. 10^4, 10^10) if axis values are very large or very small,
 * keeping tick labels compact and readable in publication figures.
 */
function computeAxisScale(maxVal: number): { divisor: number; exponent: number | null } {
  const absMax = Math.abs(maxVal);
  if (absMax === 0 || !Number.isFinite(absMax)) {
    return { divisor: 1, exponent: null };
  }
  if (absMax >= 1000 || absMax < 0.01) {
    const exp = Math.floor(Math.log10(absMax));
    return { divisor: Math.pow(10, exp), exponent: exp };
  }
  return { divisor: 1, exponent: null };
}

function buildNiceTicks(minVal: number, maxVal: number, targetCount: number = 5): {
  majors: number[];
  minors: number[];
} {
  const span = Math.max(1e-9, maxVal - minVal);
  const rawStep = span / targetCount;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / mag;
  let niceStep = mag;
  if (residual > 5) niceStep = 10 * mag;
  else if (residual > 2.5) niceStep = 5 * mag;
  else if (residual > 1.5) niceStep = 2 * mag;

  const firstMajor = Math.ceil(minVal / niceStep) * niceStep;
  const majors: number[] = [];
  for (let v = firstMajor; v <= maxVal + niceStep * 1e-4; v += niceStep) {
    majors.push(Number(v.toPrecision(8)));
  }

  const minorStep = niceStep / 2;
  const firstMinor = Math.ceil(minVal / minorStep) * minorStep;
  const minors: number[] = [];
  for (let v = firstMinor; v <= maxVal + minorStep * 1e-4; v += minorStep) {
    const isMajor = majors.some((m) => Math.abs(m - v) < niceStep * 1e-3);
    if (!isMajor) {
      minors.push(Number(v.toPrecision(8)));
    }
  }

  return { majors, minors };
}

export const UVVisViewer: React.FC<UVVisViewerProps> = ({
  sampleName,
  materialFormula,
  config,
  result,
  svgRef
}) => {
  const [layoutMode, setLayoutMode] = useState<PlotLayoutMode>('dual');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const isDrs = config.measurementMode === 'drs';
  const width = 940;
  const height = 435;

  const {
    wavelengthNm,
    photonEnergyEv,
    primarySpectrumY,
    rawSignal,
    taucY,
    fit
  } = result;

  // Wavelength domain
  const lamMin = wavelengthNm.length > 0 ? wavelengthNm[0] : 250;
  const lamMax = wavelengthNm.length > 0 ? wavelengthNm[wavelengthNm.length - 1] : 900;

  // Photon energy domain (ascending from longest lambda to shortest lambda)
  const eMinRaw = photonEnergyEv.length > 0 ? Math.min(...photonEnergyEv) : 1.4;
  const eMaxRaw = photonEnergyEv.length > 0 ? Math.max(...photonEnergyEv) : 4.2;
  // Ensure Eg is well within visible Tauc X-axis range
  const eMin = Math.min(eMinRaw, Math.max(0.5, fit.bandGapEg - 0.35));
  const eMax = eMaxRaw;

  // Spectrum Y array (either alpha / F(R_inf) or raw input signal)
  const activeSpectrumY = layoutMode === 'raw-only' ? rawSignal : primarySpectrumY;
  const maxSpecY = useMemo(() => {
    let m = 0;
    for (const v of activeSpectrumY) {
      if (v > m) m = v;
    }
    return m || 1;
  }, [activeSpectrumY]);

  const specScale = useMemo(() => computeAxisScale(maxSpecY), [maxSpecY]);
  const specYMin = 0;
  const specYMax = (maxSpecY / specScale.divisor) * 1.15;

  // Tauc Y domain
  const maxTaucY = useMemo(() => {
    let m = 0;
    for (const v of taucY) {
      if (v > m) m = v;
    }
    return m || 1;
  }, [taucY]);

  const taucScale = useMemo(() => computeAxisScale(maxTaucY), [maxTaucY]);
  const taucYMin = 0;
  const taucYMax = (maxTaucY / taucScale.divisor) * 1.16;

  // Render helper for a single coordinate panel inside the SVG
  const renderSpectrumSubPlot = (box: {
    left: number;
    top: number;
    plotW: number;
    plotH: number;
    panelBadge?: string;
  }) => {
    const { left, top, plotW, plotH, panelBadge } = box;
    const toX = (lam: number) => left + ((lam - lamMin) / (lamMax - lamMin || 1)) * plotW;
    const toY = (scaledVal: number) =>
      top + plotH - ((scaledVal - specYMin) / (specYMax - specYMin || 1)) * plotH;

    const xTicks = buildNiceTicks(lamMin, lamMax, plotW > 500 ? 7 : 5);
    const yTicks = buildNiceTicks(specYMin, specYMax, 5);

    const pts = wavelengthNm.map((lam, i) => {
      const sy = activeSpectrumY[i] / specScale.divisor;
      return `${toX(lam).toFixed(1)},${toY(sy).toFixed(1)}`;
    });
    const curvePath = pts.length > 1 ? `M ${pts.join(' L ')}` : '';
    const areaPath =
      pts.length > 1
        ? `M ${toX(wavelengthNm[0]).toFixed(1)},${toY(0).toFixed(1)} L ${pts.join(
            ' L '
          )} L ${toX(wavelengthNm[wavelengthNm.length - 1]).toFixed(1)},${toY(0).toFixed(1)} Z`
        : '';

    const onsetLam = fit.onsetWavelengthNm;
    const showOnsetLine = onsetLam >= lamMin && onsetLam <= lamMax;
    const onsetPx = toX(onsetLam);

    const yAxisTitle =
      layoutMode === 'raw-only'
        ? isDrs
          ? 'Diffuse Reflectance (%R / R)'
          : 'Raw Signal (Abs / %T)'
        : isDrs
        ? `Kubelka-Munk F(R∞)${
            specScale.exponent !== null ? ` (×10^${specScale.exponent} a.u.)` : ' (a.u.)'
          }`
        : `Absorption Coeff. α${
            specScale.exponent !== null
              ? ` (×10^${specScale.exponent} cm⁻¹)`
              : ' (cm⁻¹)'
          }`;

    return (
      <g>
        <defs>
          <clipPath id="uvvis-spec-clip">
            <rect x={left} y={top} width={plotW} height={plotH} />
          </clipPath>
          <linearGradient id="powder-blue-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#89cfdc" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#b0e0e6" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {/* Horizontal grid & Y ticks */}
        {yTicks.majors.map((yt, idx) => {
          const py = toY(yt);
          return (
            <g key={`spec-ymaj-${idx}`}>
              <line
                x1={left}
                y1={py}
                x2={left + plotW}
                y2={py}
                stroke="#f1f5f9"
                strokeWidth={0.9}
              />
              <line
                x1={left - 5}
                y1={py}
                x2={left}
                y2={py}
                stroke="#0f172a"
                strokeWidth={1.5}
              />
              <line
                x1={left + plotW - 4}
                y1={py}
                x2={left + plotW}
                y2={py}
                stroke="#0f172a"
                strokeWidth={1.3}
              />
              <text
                x={left - 8}
                y={py + 4}
                textAnchor="end"
                fill="#0f172a"
                fontSize="11"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="600"
              >
                {Number(yt.toFixed(2))}
              </text>
            </g>
          );
        })}

        {/* X ticks */}
        {xTicks.majors.map((xt, idx) => {
          const px = toX(xt);
          return (
            <g key={`spec-xmaj-${idx}`}>
              <line
                x1={px}
                y1={top + plotH}
                x2={px}
                y2={top + plotH + 6}
                stroke="#0f172a"
                strokeWidth={1.6}
              />
              <line
                x1={px}
                y1={top}
                x2={px}
                y2={top + 5}
                stroke="#0f172a"
                strokeWidth={1.3}
              />
              <text
                x={px}
                y={top + plotH + 19}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="11.5"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="600"
              >
                {xt}
              </text>
            </g>
          );
        })}

        {xTicks.minors.map((xt, idx) => {
          const px = toX(xt);
          return (
            <g key={`spec-xmin-${idx}`}>
              <line
                x1={px}
                y1={top + plotH}
                x2={px}
                y2={top + plotH + 3.5}
                stroke="#0f172a"
                strokeWidth={1.1}
              />
              <line
                x1={px}
                y1={top}
                x2={px}
                y2={top + 3.5}
                stroke="#0f172a"
                strokeWidth={1.1}
              />
            </g>
          );
        })}

        {/* Plot Content */}
        <g clipPath="url(#uvvis-spec-clip)">
          {areaPath && <path d={areaPath} fill="url(#powder-blue-fill)" />}
          {curvePath && (
            <path
              d={curvePath}
              fill="none"
              stroke="#1f6477"
              strokeWidth={2.2}
              strokeLinejoin="round"
            />
          )}

          {/* Optical Absorption Edge Onset Wavelength Line (Racing Orange) */}
          {showOnsetLine && layoutMode !== 'raw-only' && (
            <g>
              <line
                x1={onsetPx}
                y1={top}
                x2={onsetPx}
                y2={top + plotH}
                stroke="#ff4f00"
                strokeWidth={1.6}
                strokeDasharray="5 4"
              />
              <rect
                x={Math.min(left + plotW - 102, Math.max(left + 4, onsetPx + 5))}
                y={top + 34}
                width={96}
                height={20}
                rx={4}
                fill="#fff5f0"
                stroke="#ff4f00"
                strokeWidth={1}
              />
              <text
                x={Math.min(left + plotW - 54, Math.max(left + 52, onsetPx + 53))}
                y={top + 48}
                textAnchor="middle"
                fill="#bf3700"
                fontSize="10.5"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="700"
              >
                λg = {onsetLam.toFixed(0)} nm
              </text>
            </g>
          )}

          {/* Hover Marker */}
          {hoverIdx !== null && wavelengthNm[hoverIdx] !== undefined && (
            <g>
              <line
                x1={toX(wavelengthNm[hoverIdx])}
                y1={top}
                x2={toX(wavelengthNm[hoverIdx])}
                y2={top + plotH}
                stroke="#58b7ca"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle
                cx={toX(wavelengthNm[hoverIdx])}
                cy={toY(activeSpectrumY[hoverIdx] / specScale.divisor)}
                r={4.2}
                fill="#ff4f00"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            </g>
          )}
        </g>

        {/* Crisp Border Box */}
        <rect
          x={left}
          y={top}
          width={plotW}
          height={plotH}
          fill="none"
          stroke="#0f172a"
          strokeWidth={1.7}
        />

        {/* Panel Title Badge */}
        {panelBadge && (
          <text
            x={left + 10}
            y={top + 19}
            fill="#1e5262"
            fontSize="11.5"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="700"
          >
            {panelBadge}
          </text>
        )}

        {/* Axis Titles */}
        <text
          x={left + plotW / 2}
          y={top + plotH + 40}
          textAnchor="middle"
          fill="#0f172a"
          fontSize="13"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="700"
        >
          Wavelength λ (nm)
        </text>
        <text
          x={left - 42}
          y={top + plotH / 2}
          textAnchor="middle"
          fill="#0f172a"
          fontSize="12.5"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="700"
          transform={`rotate(-90, ${left - 42}, ${top + plotH / 2})`}
        >
          {yAxisTitle}
        </text>
      </g>
    );
  };

  // Render helper for the Tauc Plot / Kubelka-Munk Tauc Plot
  const renderTaucSubPlot = (box: {
    left: number;
    top: number;
    plotW: number;
    plotH: number;
    panelBadge?: string;
  }) => {
    const { left, top, plotW, plotH, panelBadge } = box;
    const toX = (eEv: number) => left + ((eEv - eMin) / (eMax - eMin || 1)) * plotW;
    const toY = (scaledVal: number) =>
      top + plotH - ((scaledVal - taucYMin) / (taucYMax - taucYMin || 1)) * plotH;

    const xTicks = buildNiceTicks(eMin, eMax, plotW > 500 ? 7 : 5);
    const yTicks = buildNiceTicks(taucYMin, taucYMax, 5);

    // Order points by ascending energy for smooth path
    const orderedPairs = photonEnergyEv
      .map((e, i) => ({ e, y: taucY[i] / taucScale.divisor, idx: i }))
      .sort((a, b) => a.e - b.e);

    const curvePts = orderedPairs.map(
      (p) => `${toX(p.e).toFixed(1)},${toY(p.y).toFixed(1)}`
    );
    const curvePath = curvePts.length > 1 ? `M ${curvePts.join(' L ')}` : '';

    // Highlighted points in the linear fit region [fitEnergyMin, fitEnergyMax]
    const linearSegmentPts = orderedPairs
      .filter((p) => p.e >= fit.fitEnergyMin && p.e <= fit.fitEnergyMax)
      .map((p) => `${toX(p.e).toFixed(1)},${toY(p.y).toFixed(1)}`);
    const linearSegPath =
      linearSegmentPts.length > 1 ? `M ${linearSegmentPts.join(' L ')}` : '';

    // Extrapolated Tangent Line in Vibrant Racing Orange (#ff4f00)
    const { x1, y1, x2, y2 } = fit.extrapolatedLinePoints;
    const extX1 = toX(x1);
    const extY1 = toY(y1 / taucScale.divisor);
    const extX2 = toX(x2);
    const extY2 = toY(y2 / taucScale.divisor);

    const superscript =
      config.transitionType === 'direct-allowed'
        ? '²'
        : config.transitionType === 'indirect-allowed'
        ? '¹ᐟ²'
        : config.transitionType === 'direct-forbidden'
        ? '²ᐟ³'
        : '¹ᐟ³';

    const scaleSuffix =
      taucScale.exponent !== null ? ` (×10^${taucScale.exponent})` : '';

    const yAxisTitle = isDrs
      ? `[F(R∞)·hν]${superscript}${scaleSuffix}`
      : `(αhν)${superscript}${scaleSuffix}`;

    return (
      <g>
        <defs>
          <clipPath id="uvvis-tauc-clip">
            <rect x={left} y={top} width={plotW} height={plotH} />
          </clipPath>
        </defs>

        {/* Grid & Y Ticks */}
        {yTicks.majors.map((yt, idx) => {
          const py = toY(yt);
          return (
            <g key={`tauc-ymaj-${idx}`}>
              <line
                x1={left}
                y1={py}
                x2={left + plotW}
                y2={py}
                stroke="#f1f5f9"
                strokeWidth={0.9}
              />
              <line
                x1={left - 5}
                y1={py}
                x2={left}
                y2={py}
                stroke="#0f172a"
                strokeWidth={1.5}
              />
              <line
                x1={left + plotW - 4}
                y1={py}
                x2={left + plotW}
                y2={py}
                stroke="#0f172a"
                strokeWidth={1.3}
              />
              <text
                x={left - 8}
                y={py + 4}
                textAnchor="end"
                fill="#0f172a"
                fontSize="11"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="600"
              >
                {Number(yt.toFixed(2))}
              </text>
            </g>
          );
        })}

        {/* X Ticks */}
        {xTicks.majors.map((xt, idx) => {
          const px = toX(xt);
          return (
            <g key={`tauc-xmaj-${idx}`}>
              <line
                x1={px}
                y1={top + plotH}
                x2={px}
                y2={top + plotH + 6}
                stroke="#0f172a"
                strokeWidth={1.6}
              />
              <line
                x1={px}
                y1={top}
                x2={px}
                y2={top + 5}
                stroke="#0f172a"
                strokeWidth={1.3}
              />
              <text
                x={px}
                y={top + plotH + 19}
                textAnchor="middle"
                fill="#0f172a"
                fontSize="11.5"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="600"
              >
                {Number(xt.toFixed(2))}
              </text>
            </g>
          );
        })}

        {xTicks.minors.map((xt, idx) => {
          const px = toX(xt);
          return (
            <g key={`tauc-xmin-${idx}`}>
              <line
                x1={px}
                y1={top + plotH}
                x2={px}
                y2={top + plotH + 3.5}
                stroke="#0f172a"
                strokeWidth={1.1}
              />
              <line
                x1={px}
                y1={top}
                x2={px}
                y2={top + 3.5}
                stroke="#0f172a"
                strokeWidth={1.1}
              />
            </g>
          );
        })}

        {/* Plot Curves */}
        <g clipPath="url(#uvvis-tauc-clip)">
          {/* Optional sub-bandgap baseline line if enabled */}
          {config.useBaselineOffset && (
            <line
              x1={toX(eMin)}
              y1={toY(
                (fit.baselineSlope * eMin + fit.baselineIntercept) /
                  taucScale.divisor
              )}
              x2={toX(eMax)}
              y2={toY(
                (fit.baselineSlope * eMax + fit.baselineIntercept) /
                  taucScale.divisor
              )}
              stroke="#64748b"
              strokeWidth={1.3}
              strokeDasharray="4 3"
            />
          )}

          {/* Full Tauc Curve in Powder-Slate */}
          {curvePath && (
            <path
              d={curvePath}
              fill="none"
              stroke="#1e5262"
              strokeWidth={2.1}
              strokeLinejoin="round"
            />
          )}

          {/* Highlighted Linear Segment on Tauc Curve (Powder Blue glow + dark core) */}
          {linearSegPath && (
            <>
              <path
                d={linearSegPath}
                fill="none"
                stroke="#89cfdc"
                strokeWidth={6.5}
                strokeLinecap="round"
                opacity={0.75}
              />
              <path
                d={linearSegPath}
                fill="none"
                stroke="#0f172a"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            </>
          )}

          {/* Vibrant Racing Orange Extrapolation Tangent Line down to Eg */}
          {fit.bandGapEg > 0 && (
            <>
              <line
                x1={extX2}
                y1={extY2}
                x2={extX1}
                y2={extY1}
                stroke="#ff4f00"
                strokeWidth={2.4}
                strokeDasharray="6 4"
              />
              {/* Solid segment over the fitted linear window */}
              <line
                x1={toX(fit.fitEnergyMin)}
                y1={toY(
                  (fit.slope * fit.fitEnergyMin + fit.intercept) /
                    taucScale.divisor
                )}
                x2={extX2}
                y2={extY2}
                stroke="#ff4f00"
                strokeWidth={2.5}
              />

              {/* Bullseye Marker at Extrapolated Band Gap Intercept (Eg, 0) */}
              <circle
                cx={extX1}
                cy={extY1}
                r={7}
                fill="#ff4f00"
                fillOpacity={0.22}
              />
              <circle
                cx={extX1}
                cy={extY1}
                r={4.2}
                fill="#ff4f00"
                stroke="#ffffff"
                strokeWidth={1.6}
              />

              {/* Publication Callout Badge for Eg inside Tauc plot */}
              <g
                transform={`translate(${Math.min(
                  left + plotW - 142,
                  Math.max(left + 12, extX1 - 65)
                )}, ${Math.max(top + 32, extY1 - 54)})`}
              >
                <rect
                  x={0}
                  y={0}
                  width={134}
                  height={38}
                  rx={6}
                  fill="#ffffff"
                  stroke="#ff4f00"
                  strokeWidth={1.6}
                />
                <text
                  x={67}
                  y={16}
                  textAnchor="middle"
                  fill="#ff4f00"
                  fontSize="12"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="800"
                >
                  Eg = {fit.bandGapEg.toFixed(2)} eV
                </text>
                <text
                  x={67}
                  y={30}
                  textAnchor="middle"
                  fill="#1e5262"
                  fontSize="10"
                  fontFamily="Inter, system-ui, sans-serif"
                  fontWeight="600"
                >
                  R² = {fit.rSquared.toFixed(4)} • {fit.onsetWavelengthNm.toFixed(0)} nm
                </text>
              </g>
            </>
          )}

          {/* Hover Marker */}
          {hoverIdx !== null && photonEnergyEv[hoverIdx] !== undefined && (
            <g>
              <line
                x1={toX(photonEnergyEv[hoverIdx])}
                y1={top}
                x2={toX(photonEnergyEv[hoverIdx])}
                y2={top + plotH}
                stroke="#58b7ca"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle
                cx={toX(photonEnergyEv[hoverIdx])}
                cy={toY(taucY[hoverIdx] / taucScale.divisor)}
                r={4.2}
                fill="#ff4f00"
                stroke="#ffffff"
                strokeWidth={1.5}
              />
            </g>
          )}
        </g>

        {/* Crisp Border Box */}
        <rect
          x={left}
          y={top}
          width={plotW}
          height={plotH}
          fill="none"
          stroke="#0f172a"
          strokeWidth={1.7}
        />

        {/* Panel Title Badge */}
        {panelBadge && (
          <text
            x={left + 10}
            y={top + 19}
            fill="#1e5262"
            fontSize="11.5"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="700"
          >
            {panelBadge}
          </text>
        )}

        {/* Top-Right Sample Metadata Annotation */}
        <g transform={`translate(${left + plotW - 10}, ${top + 19})`}>
          <text
            x={0}
            y={0}
            textAnchor="end"
            fill="#0f172a"
            fontSize="11"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="700"
          >
            {materialFormula || sampleName}
          </text>
          <text
            x={0}
            y={14}
            textAnchor="end"
            fill="#247c92"
            fontSize="10"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="600"
          >
            {isDrs
              ? 'Kubelka-Munk DRS'
              : `t = ${config.thicknessValue} ${
                  config.thicknessUnit === 'um' ? 'µm' : config.thicknessUnit
                }`}
          </text>
        </g>

        {/* Axis Titles */}
        <text
          x={left + plotW / 2}
          y={top + plotH + 40}
          textAnchor="middle"
          fill="#0f172a"
          fontSize="13"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="700"
        >
          Photon Energy hν (eV)
        </text>
        <text
          x={left - 42}
          y={top + plotH / 2}
          textAnchor="middle"
          fill="#0f172a"
          fontSize="12.5"
          fontFamily="Inter, system-ui, sans-serif"
          fontWeight="700"
          transform={`rotate(-90, ${left - 42}, ${top + plotH / 2})`}
        >
          {yAxisTitle}
        </text>
      </g>
    );
  };

  const updateHoverFromClientX = (clientX: number) => {
    if (!svgRef.current || wavelengthNm.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * width;

    if (layoutMode === 'dual') {
      // Left panel is [60..445], Right panel is [520..915]
      if (relX <= 465) {
        const frac = Math.max(0, Math.min(1, (relX - 60) / 385));
        const targetLam = lamMin + frac * (lamMax - lamMin);
        let best = 0;
        let bestDist = Infinity;
        for (let i = 0; i < wavelengthNm.length; i++) {
          const d = Math.abs(wavelengthNm[i] - targetLam);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
        setHoverIdx(best);
      } else {
        const frac = Math.max(0, Math.min(1, (relX - 525) / 390));
        const targetE = eMin + frac * (eMax - eMin);
        let best = 0;
        let bestDist = Infinity;
        for (let i = 0; i < photonEnergyEv.length; i++) {
          const d = Math.abs(photonEnergyEv[i] - targetE);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        }
        setHoverIdx(best);
      }
    } else if (layoutMode === 'tauc-only') {
      const frac = Math.max(0, Math.min(1, (relX - 66) / (width - 94)));
      const targetE = eMin + frac * (eMax - eMin);
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < photonEnergyEv.length; i++) {
        const d = Math.abs(photonEnergyEv[i] - targetE);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      setHoverIdx(best);
    } else {
      const frac = Math.max(0, Math.min(1, (relX - 66) / (width - 94)));
      const targetLam = lamMin + frac * (lamMax - lamMin);
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < wavelengthNm.length; i++) {
        const d = Math.abs(wavelengthNm[i] - targetLam);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      setHoverIdx(best);
    }
  };

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    updateHoverFromClientX(e.clientX);
  };

  const handleSvgTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    const touch = e.touches[0];
    if (touch) {
      updateHoverFromClientX(touch.clientX);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-powder-300 shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="px-3 sm:px-4 py-2 border-b border-powder-200 flex flex-wrap items-center justify-between gap-2 bg-white">
        <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto">
          <div className="grid grid-cols-2 sm:inline-flex w-full sm:w-auto gap-1 sm:gap-0.5 rounded-lg p-1 sm:p-0.5 bg-powder-100/80 text-xs font-medium">
            <button
              type="button"
              onClick={() => setLayoutMode('dual')}
              className={`inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 rounded-md transition truncate ${
                layoutMode === 'dual'
                  ? 'bg-racing-500 text-white shadow-sm font-semibold'
                  : 'text-powder-900 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3.5 h-3.5 shrink-0" />
              <span className="md:hidden truncate">Dual Plot</span>
              <span className="hidden md:inline truncate">
                {isDrs ? 'K-M + Tauc (Dual)' : 'α vs. λ + Tauc (Dual)'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutMode('tauc-only')}
              className={`inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 rounded-md transition truncate ${
                layoutMode === 'tauc-only'
                  ? 'bg-racing-500 text-white shadow-sm font-semibold'
                  : 'text-powder-900 hover:text-slate-900'
              }`}
            >
              <Maximize2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{isDrs ? 'K-M Tauc' : 'Tauc Plot'}</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutMode('spectrum-only')}
              className={`inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 rounded-md transition truncate ${
                layoutMode === 'spectrum-only'
                  ? 'bg-racing-500 text-white shadow-sm font-semibold'
                  : 'text-powder-900 hover:text-slate-900'
              }`}
            >
              <Maximize2 className="w-3 h-3 shrink-0" />
              <span className="truncate">{isDrs ? 'F(R∞) vs. λ' : 'α vs. λ'}</span>
            </button>

            <button
              type="button"
              onClick={() => setLayoutMode('raw-only')}
              className={`inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 py-1 rounded-md transition truncate ${
                layoutMode === 'raw-only'
                  ? 'bg-racing-500 text-white shadow-sm font-semibold'
                  : 'text-powder-900 hover:text-slate-900'
              }`}
            >
              <Eye className="w-3 h-3 shrink-0" />
              <span className="truncate">Raw Signal</span>
            </button>
          </div>
        </div>

        {/* Live Band Gap Pill + Cursor Readout */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {hoverIdx !== null && wavelengthNm[hoverIdx] !== undefined && (
            <div className="font-mono bg-powder-50 px-2 py-1 rounded-md text-slate-900 border border-powder-300 text-[11px] sm:text-xs">
              <span className="font-bold text-powder-900">
                {wavelengthNm[hoverIdx].toFixed(1)} nm
              </span>
              <span className="mx-1 text-powder-400">•</span>
              <span className="font-semibold text-racing-600">
                {photonEnergyEv[hoverIdx].toFixed(2)} eV
              </span>
              <span className="mx-1 text-powder-400">|</span>
              <span>
                {isDrs
                  ? `F(R∞)=${primarySpectrumY[hoverIdx].toFixed(3)}`
                  : `α=${primarySpectrumY[hoverIdx].toExponential(2)}`}
              </span>
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-racing-50 border border-racing-200 text-racing-700 font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-racing-500 inline-block shrink-0" />
            <span>Eg = {fit.bandGapEg.toFixed(2)} eV</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative select-none touch-pan-y">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block cursor-crosshair bg-white"
          onMouseMove={handleSvgMouseMove}
          onTouchStart={handleSvgTouchMove}
          onTouchMove={handleSvgTouchMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          {layoutMode === 'dual' && (
            <>
              {renderSpectrumSubPlot({
                left: 60,
                top: 26,
                plotW: 385,
                plotH: 355,
                panelBadge: isDrs
                  ? '(a) Kubelka-Munk F(R∞) vs. λ'
                  : '(a) Absorption α vs. Wavelength'
              })}
              {renderTaucSubPlot({
                left: 525,
                top: 26,
                plotW: 390,
                plotH: 355,
                panelBadge: isDrs
                  ? '(b) K-M Tauc Plot (Eg Fit)'
                  : '(b) Tauc Plot (Eg Fit)'
              })}
            </>
          )}

          {layoutMode === 'tauc-only' &&
            renderTaucSubPlot({
              left: 66,
              top: 26,
              plotW: width - 94,
              plotH: 355,
              panelBadge: isDrs
                ? 'Kubelka-Munk Tauc Plot & Linear Band Gap Extrapolation'
                : 'Tauc Plot & Automatic Linear Band Gap Extrapolation'
            })}

          {(layoutMode === 'spectrum-only' || layoutMode === 'raw-only') &&
            renderSpectrumSubPlot({
              left: 66,
              top: 26,
              plotW: width - 94,
              plotH: 355,
              panelBadge:
                layoutMode === 'raw-only'
                  ? 'Raw Experimental UV-Vis-NIR Spectrum'
                  : isDrs
                  ? 'Kubelka-Munk Remission Function F(R∞) vs. Wavelength'
                  : 'Absorption Coefficient α (cm⁻¹) vs. Wavelength (nm)'
            })}
        </svg>
      </div>
    </div>
  );
};
