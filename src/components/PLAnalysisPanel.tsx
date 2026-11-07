import React, { useState } from 'react';
import {
  PLConfig,
  PLMaterialReference,
  PLPeakData,
  PLPipelineResult
} from '../types/pl';
import { generatePLCharacterizationSummary } from '../utils/plMath';
import {
  Table,
  Compass,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Award,
  Palette
} from 'lucide-react';

interface PLAnalysisPanelProps {
  sampleName: string;
  materialFormula: string;
  config: PLConfig;
  result: PLPipelineResult;
  selectedPeakId: string | null;
  onSelectPeak: (id: string | null) => void;
  references: PLMaterialReference[];
  selectedReferenceId: string;
  onSelectReferenceId: (id: string) => void;
}

/**
 * Standard CIE 1931 2-deg Spectral Locus perimeter points (380 nm to 700 nm) for SVG rendering.
 */
const CIE_LOCUS_POINTS: { nm: number; x: number; y: number }[] = [
  { nm: 380, x: 0.1741, y: 0.0050 },
  { nm: 400, x: 0.1733, y: 0.0048 },
  { nm: 420, x: 0.1714, y: 0.0051 },
  { nm: 440, x: 0.1644, y: 0.0109 },
  { nm: 460, x: 0.1440, y: 0.0297 },
  { nm: 470, x: 0.1241, y: 0.0578 },
  { nm: 480, x: 0.0913, y: 0.1327 },
  { nm: 490, x: 0.0454, y: 0.2950 },
  { nm: 500, x: 0.0082, y: 0.5384 },
  { nm: 510, x: 0.0139, y: 0.7502 },
  { nm: 520, x: 0.0743, y: 0.8338 },
  { nm: 530, x: 0.1547, y: 0.8059 },
  { nm: 540, x: 0.2296, y: 0.7543 },
  { nm: 550, x: 0.3016, y: 0.6923 },
  { nm: 560, x: 0.3731, y: 0.6245 },
  { nm: 570, x: 0.4441, y: 0.5547 },
  { nm: 580, x: 0.5125, y: 0.4866 },
  { nm: 590, x: 0.5752, y: 0.4242 },
  { nm: 600, x: 0.6270, y: 0.3725 },
  { nm: 610, x: 0.6658, y: 0.3340 },
  { nm: 620, x: 0.6915, y: 0.3083 },
  { nm: 640, x: 0.7190, y: 0.2809 },
  { nm: 660, x: 0.7300, y: 0.2700 },
  { nm: 700, x: 0.7347, y: 0.2653 }
];

export const PLAnalysisPanel: React.FC<PLAnalysisPanelProps> = ({
  sampleName,
  materialFormula,
  config,
  result,
  selectedPeakId,
  onSelectPeak,
  references,
  selectedReferenceId,
  onSelectReferenceId
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'cie-matcher' | 'summary'>(
    'table'
  );
  const [copied, setCopied] = useState(false);

  const {
    peaks,
    envelopeRSquared,
    nbeAreaPercent,
    defectAreaPercent,
    nbeToDefectRatio,
    dominantPeakNm,
    dominantPeakEv,
    dominantFwhmNm,
    dominantFwhmMeV,
    stokesShiftMeV,
    cie1931
  } = result;

  const activeReference =
    references.find((r) => r.id === selectedReferenceId) || references[0];
  const selectedPeak =
    peaks.find((p) => p.id === selectedPeakId) || peaks[0] || null;

  const summary = generatePLCharacterizationSummary(
    sampleName,
    materialFormula,
    config,
    result,
    activeReference
  );

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summary.manuscriptParagraph);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // CIE 1931 SVG coordinate helpers
  const cieW = 240;
  const cieH = 225;
  const ciePad = { left: 28, right: 12, top: 12, bottom: 24 };
  const toCieX = (cx: number) =>
    ciePad.left + (cx / 0.8) * (cieW - ciePad.left - ciePad.right);
  const toCieY = (cy: number) =>
    cieH - ciePad.bottom - (cy / 0.9) * (cieH - ciePad.top - ciePad.bottom);

  const locusSvgPath =
    CIE_LOCUS_POINTS.map(
      (pt, i) =>
        `${i === 0 ? 'M' : 'L'} ${toCieX(pt.x).toFixed(1)},${toCieY(pt.y).toFixed(1)}`
    ).join(' ') + ' Z';

  return (
    <div className="bg-white rounded-xl border border-sage-200 shadow-sm overflow-hidden">
      {/* Header Tabs */}
      <div className="px-4 py-2.5 border-b border-sage-100 flex flex-wrap items-center justify-between gap-2 bg-sage-50/50">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'table'
                ? 'bg-gradient-to-r from-maroon-800 to-sage-600 text-white shadow-sm'
                : 'text-maroon-900 hover:bg-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Deconvoluted Emission Bands ({peaks.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cie-matcher')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'cie-matcher'
                ? 'bg-gradient-to-r from-maroon-800 to-sage-600 text-white shadow-sm'
                : 'text-maroon-900 hover:bg-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            CIE 1931 & Exciton/Defect Match
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'summary'
                ? 'bg-gradient-to-r from-maroon-800 to-sage-600 text-white shadow-sm'
                : 'text-maroon-900 hover:bg-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            PL Report & Summary
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[11px] font-semibold text-maroon-800 hidden sm:inline">
            Reference Emitter:
          </span>
          <select
            value={selectedReferenceId}
            onChange={(e) => onSelectReferenceId(e.target.value)}
            className="bg-white border border-sage-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-maroon-900 focus:outline-none focus:border-maroon-700"
          >
            {references.map((r) => (
              <option key={r.id} value={r.id}>
                {r.formula} — {r.name.split('(')[0].trim()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 1: DECONVOLUTED EMISSION BANDS & NBE/DEFECT QUANTIFICATION */}
      {activeTab === 'table' && (
        <div>
          {/* Stacked Radiative Emission Fraction Bar */}
          {peaks.length > 0 && (
            <div className="px-4 py-3 bg-white border-b border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="font-semibold text-maroon-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sage-600" />
                  <span>
                    Radiative Recombination Spectral Weight ({materialFormula})
                  </span>
                </span>
                <div className="flex items-center gap-3 font-mono text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-sage-50 border border-sage-200 text-sage-800 font-semibold">
                    NBE/Excitonic: {nbeAreaPercent.toFixed(1)}%
                  </span>
                  <span className="px-2 py-0.5 rounded bg-maroon-50 border border-maroon-200 text-maroon-800 font-semibold">
                    Defect/DLE: {defectAreaPercent.toFixed(1)}%
                  </span>
                  {nbeToDefectRatio !== null && (
                    <span className="px-2 py-0.5 rounded bg-maroon-800 text-white font-bold">
                      I_NBE / I_DLE = {nbeToDefectRatio.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 border border-slate-200">
                {peaks.map((p) => (
                  <div
                    key={`bar-${p.id}`}
                    onClick={() =>
                      onSelectPeak(p.id === selectedPeakId ? null : p.id)
                    }
                    style={{
                      width: `${Math.max(2, p.relativeAreaPercent)}%`,
                      backgroundColor: p.color
                    }}
                    title={`${
                      p.assignedTransition?.transitionLabel || p.originCategory
                    }: ${p.centerNm} nm (${p.relativeAreaPercent}%)`}
                    className="h-full cursor-pointer transition-opacity hover:opacity-85"
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
                {peaks.map((p, idx) => (
                  <button
                    key={`leg-${p.id}`}
                    type="button"
                    onClick={() =>
                      onSelectPeak(p.id === selectedPeakId ? null : p.id)
                    }
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border transition ${
                      p.id === selectedPeakId
                        ? 'bg-maroon-50 border-maroon-300 text-maroon-950 font-bold'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-sage-50/60'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-mono font-semibold">
                      P{idx + 1} ({p.centerNm.toFixed(1)} nm / {p.centerEv.toFixed(2)} eV):
                    </span>
                    <span>
                      {p.assignedTransition?.shortCode || p.originCategory}
                    </span>
                    <span className="font-mono font-bold text-maroon-800">
                      {p.relativeAreaPercent.toFixed(1)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            {peaks.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No PL emission peaks detected. Lower the prominence threshold or enable Auto Fit.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-sage-100 bg-sage-50/60 text-[11px] font-semibold uppercase tracking-wider text-maroon-900">
                    <th className="py-2 px-3">Band</th>
                    <th className="py-2 px-3">λ_peak (nm)</th>
                    <th className="py-2 px-3">hν (eV)</th>
                    <th className="py-2 px-3">FWHM (nm / meV)</th>
                    <th className="py-2 px-3">Stokes ΔE</th>
                    <th className="py-2 px-3">Rel. Area %</th>
                    <th className="py-2 px-3">Origin Class</th>
                    <th className="py-2 px-3">Radiative Transition Assignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {peaks.map((p, idx) => {
                    const isSelected = p.id === selectedPeakId;
                    const isNbe =
                      p.originCategory === 'NBE / Excitonic' ||
                      p.originCategory === 'Phonon / Vibronic';
                    return (
                      <tr
                        key={p.id}
                        onClick={() => onSelectPeak(isSelected ? null : p.id)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-maroon-50/70 text-maroon-950'
                            : 'hover:bg-sage-50/50 text-slate-700'
                        }`}
                      >
                        <td className="py-2 px-3 font-mono font-semibold">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: p.color }}
                            />
                            P{idx + 1}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-maroon-800">
                          {p.centerNm.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold text-sage-800">
                          {p.centerEv.toFixed(3)}
                        </td>
                        <td className="py-2 px-3 font-mono">
                          {p.fwhmNm.toFixed(1)} nm{' '}
                          <span className="text-slate-400">
                            ({p.fwhmMeV.toFixed(0)} meV)
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {p.stokesShiftMeV >= 0
                            ? `+${p.stokesShiftMeV}`
                            : p.stokesShiftMeV}{' '}
                          meV
                        </td>
                        <td className="py-2 px-3 font-mono">
                          <span className="px-2 py-0.5 rounded-md bg-maroon-50 border border-maroon-200 text-maroon-800 font-bold">
                            {p.relativeAreaPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isNbe
                                ? 'bg-sage-100 text-sage-800 border border-sage-300'
                                : 'bg-maroon-100 text-maroon-800 border border-maroon-300'
                            }`}
                          >
                            {p.originCategory}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {p.assignedTransition ? (
                            <span className="font-semibold text-maroon-950">
                              {p.assignedTransition.transitionLabel}
                            </span>
                          ) : (
                            <span className="text-slate-400">
                              Unassigned emission band
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CIE 1931 CHROMATICITY & EXCITON/DEFECT TRANSITION MATCHER */}
      {activeTab === 'cie-matcher' && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column: CIE 1931 Chromaticity Diagram & Photometric Readout */}
          <div className="border border-sage-200 rounded-xl p-3.5 bg-sage-50/30 flex flex-col sm:flex-row gap-4 items-center">
            <div className="shrink-0 bg-white rounded-xl border border-sage-200 p-2 shadow-xs">
              <svg
                viewBox={`0 0 ${cieW} ${cieH}`}
                className="w-52 h-48 block select-none"
              >
                <defs>
                  <linearGradient id="cie-fill" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
                    <stop offset="45%" stopColor="#10b981" stopOpacity="0.24" />
                    <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.24" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.25" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                {[0.2, 0.4, 0.6].map((gx) => (
                  <line
                    key={`gx-${gx}`}
                    x1={toCieX(gx)}
                    y1={ciePad.top}
                    x2={toCieX(gx)}
                    y2={cieH - ciePad.bottom}
                    stroke="#e2e8f0"
                    strokeWidth={0.8}
                  />
                ))}
                {[0.2, 0.4, 0.6, 0.8].map((gy) => (
                  <line
                    key={`gy-${gy}`}
                    x1={ciePad.left}
                    y1={toCieY(gy)}
                    x2={cieW - ciePad.right}
                    y2={toCieY(gy)}
                    stroke="#e2e8f0"
                    strokeWidth={0.8}
                  />
                ))}

                {/* Spectral Horseshoe Locus */}
                <path
                  d={locusSvgPath}
                  fill="url(#cie-fill)"
                  stroke="#4d0013"
                  strokeWidth={1.5}
                />

                {/* Wavelength markers around locus */}
                {[460, 500, 520, 560, 600, 640].map((wl) => {
                  const pt = CIE_LOCUS_POINTS.find((p) => p.nm === wl);
                  if (!pt) return null;
                  return (
                    <g key={`wl-${wl}`}>
                      <circle
                        cx={toCieX(pt.x)}
                        cy={toCieY(pt.y)}
                        r={2}
                        fill="#39563b"
                      />
                      <text
                        x={toCieX(pt.x) + (wl <= 510 ? -4 : 4)}
                        y={toCieY(pt.y) - 3}
                        textAnchor={wl <= 510 ? 'end' : 'start'}
                        fontSize="7.5"
                        fill="#39563b"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {wl}
                      </text>
                    </g>
                  );
                })}

                {/* D65 White Point (0.3127, 0.3290) */}
                <circle
                  cx={toCieX(0.3127)}
                  cy={toCieY(0.3290)}
                  r={2.8}
                  fill="#ffffff"
                  stroke="#475569"
                  strokeWidth={1.3}
                />
                <text
                  x={toCieX(0.3127) + 5}
                  y={toCieY(0.3290) + 3}
                  fontSize="8"
                  fill="#475569"
                  fontWeight="600"
                >
                  D65
                </text>

                {/* Vector from D65 to Measured Sample CIE (x, y) */}
                <line
                  x1={toCieX(0.3127)}
                  y1={toCieY(0.3290)}
                  x2={toCieX(cie1931.x)}
                  y2={toCieY(cie1931.y)}
                  stroke="#800020"
                  strokeWidth={1.2}
                  strokeDasharray="3 2"
                />

                {/* Sample CIE (x, y) Point */}
                <circle
                  cx={toCieX(cie1931.x)}
                  cy={toCieY(cie1931.y)}
                  r={5.2}
                  fill={cie1931.hexColor}
                  stroke="#4d0013"
                  strokeWidth={1.8}
                />

                {/* Axes */}
                <line
                  x1={ciePad.left}
                  y1={cieH - ciePad.bottom}
                  x2={cieW - ciePad.right}
                  y2={cieH - ciePad.bottom}
                  stroke="#4d0013"
                  strokeWidth={1.2}
                />
                <line
                  x1={ciePad.left}
                  y1={ciePad.top}
                  x2={ciePad.left}
                  y2={cieH - ciePad.bottom}
                  stroke="#4d0013"
                  strokeWidth={1.2}
                />
                <text
                  x={(ciePad.left + cieW - ciePad.right) / 2}
                  y={cieH - 6}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="700"
                  fill="#4d0013"
                >
                  CIE x
                </text>
                <text
                  x={10}
                  y={(ciePad.top + cieH - ciePad.bottom) / 2}
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="700"
                  fill="#4d0013"
                  transform={`rotate(-90, 10, ${(ciePad.top + cieH - ciePad.bottom) / 2})`}
                >
                  CIE y
                </text>
              </svg>
            </div>

            <div className="flex-1 space-y-2.5 w-full">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-maroon-800">
                    CIE 1931 2° Colorimetry
                  </div>
                  <div className="text-sm font-bold text-maroon-950 mt-0.5">
                    {cie1931.colorName}
                  </div>
                </div>
                <div
                  className="w-9 h-9 rounded-xl border-2 border-maroon-900 shadow-sm shrink-0"
                  style={{ backgroundColor: cie1931.hexColor }}
                  title={`Perceived sRGB Swatch: ${cie1931.hexColor}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white rounded-lg p-2 border border-sage-200">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">
                    CIE 1931 (x, y)
                  </div>
                  <div className="font-mono font-bold text-maroon-900 mt-0.5">
                    ({cie1931.x.toFixed(4)}, {cie1931.y.toFixed(4)})
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-sage-200">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">
                    CIE 1976 (u′, v′)
                  </div>
                  <div className="font-mono font-bold text-sage-800 mt-0.5">
                    ({cie1931.uPrime.toFixed(4)}, {cie1931.vPrime.toFixed(4)})
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-sage-200">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">
                    Dominant λ_dom
                  </div>
                  <div className="font-mono font-bold text-maroon-800 mt-0.5">
                    {cie1931.dominantWavelengthNm.toFixed(1)} nm
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-sage-200">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">
                    Color Purity
                  </div>
                  <div className="font-mono font-bold text-sage-700 mt-0.5">
                    {cie1931.colorPurityPercent.toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 bg-white/80 rounded-lg px-2.5 py-1.5 border border-sage-200 flex items-center justify-between">
                <span>
                  Visible Window (380–780 nm):{' '}
                  <strong className="text-maroon-900">
                    {cie1931.visibleFractionPercent}%
                  </strong>
                </span>
                {cie1931.cctKelvin && (
                  <span className="font-mono font-semibold text-sage-800">
                    CCT ≈ {cie1931.cctKelvin} K
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Reference Emitter Comparison & Component Inspector */}
          {activeReference && (
            <div className="border border-sage-200 rounded-xl p-3.5 bg-white space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-maroon-950 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-sage-600" />
                    <span>{activeReference.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    E_g = {activeReference.bandgapEv.toFixed(2)} eV (
                    {activeReference.bandgapNm.toFixed(0)} nm) • E_b(exciton) ={' '}
                    {activeReference.excitonBindingMeV} meV
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-maroon-800 text-white text-xs font-bold shadow-sm">
                  {summary.matchScore}% Match
                </span>
              </div>

              <table className="w-full text-left text-xs border-t border-sage-100">
                <thead>
                  <tr className="text-[10px] uppercase text-maroon-800 border-b border-sage-100">
                    <th className="py-1.5">Reference Transition</th>
                    <th className="py-1.5">Ref λ (nm)</th>
                    <th className="py-1.5">Exp λ (nm)</th>
                    <th className="py-1.5">ΔE (meV)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sage-100/60">
                  {activeReference.transitions.map((rt, i) => {
                    let closest: PLPeakData | null = null;
                    let minDiff = Infinity;
                    for (const p of peaks) {
                      const d = Math.abs(p.centerNm - rt.wavelengthNm);
                      if (d < minDiff) {
                        minDiff = d;
                        closest = p;
                      }
                    }
                    const isMatched = closest && minDiff <= 16;
                    const deltaMeV = closest
                      ? Math.round((closest.centerEv - rt.energyEv) * 1000)
                      : null;

                    return (
                      <tr key={i} className="text-slate-700">
                        <td className="py-1.5 font-medium text-maroon-950">
                          {rt.transitionLabel}
                        </td>
                        <td className="py-1.5 font-mono text-slate-600">
                          {rt.wavelengthNm.toFixed(1)} ({rt.energyEv.toFixed(2)} eV)
                        </td>
                        <td className="py-1.5 font-mono">
                          {isMatched && closest ? (
                            <span className="inline-flex items-center gap-1 text-maroon-800 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-sage-600" />
                              {closest.centerNm.toFixed(1)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <AlertCircle className="w-3.5 h-3.5" />—
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 font-mono text-sage-800 font-semibold">
                          {isMatched && deltaMeV !== null
                            ? `${deltaMeV >= 0 ? `+${deltaMeV}` : deltaMeV} meV`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {selectedPeak && (
                <div className="p-2.5 rounded-lg bg-maroon-50/50 border border-maroon-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-maroon-950">
                      Selected Band ({selectedPeak.centerNm.toFixed(1)} nm /{' '}
                      {selectedPeak.centerEv.toFixed(3)} eV):
                    </span>
                    <span className="px-2 py-0.2 rounded bg-sage-600 text-white text-[10px] font-bold">
                      {selectedPeak.assignedTransition?.confidence || 'Resolved'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    {selectedPeak.assignedTransition?.physicalMechanism ||
                      activeReference.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SUMMARY & MANUSCRIPT REPORT */}
      {activeTab === 'summary' && (
        <div className="p-4 space-y-4">
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-maroon-200 bg-maroon-50/40 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-maroon-800">
                Dominant Emission Peak
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-extrabold font-mono text-maroon-900">
                  {dominantPeakNm ? `${dominantPeakNm.toFixed(1)} nm` : '—'}
                </span>
                {dominantPeakEv && (
                  <span className="text-xs font-mono font-bold text-sage-700">
                    ({dominantPeakEv.toFixed(2)} eV)
                  </span>
                )}
              </div>
              <div className="mt-1 text-[11px] text-slate-600 font-mono">
                FWHM = {dominantFwhmNm?.toFixed(1) || '—'} nm (
                {dominantFwhmMeV?.toFixed(0) || '—'} meV)
              </div>
            </div>

            <div className="rounded-xl border border-sage-200 bg-sage-50/60 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-sage-800">
                NBE / Defect Ratio (I_NBE/I_DLE)
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-extrabold font-mono text-maroon-900">
                  {nbeToDefectRatio !== null
                    ? nbeToDefectRatio.toFixed(2)
                    : 'Pure NBE'}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-600 font-mono">
                {nbeAreaPercent.toFixed(1)}% NBE vs. {defectAreaPercent.toFixed(1)}% DLE
              </div>
            </div>

            <div className="rounded-xl border border-sage-200 bg-sage-50/60 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-sage-800">
                CIE 1931 Chromaticity
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className="w-4 h-4 rounded-full border border-maroon-900 shrink-0"
                  style={{ backgroundColor: cie1931.hexColor }}
                />
                <span className="text-lg font-extrabold font-mono text-maroon-900">
                  ({cie1931.x.toFixed(3)}, {cie1931.y.toFixed(3)})
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-600">
                {cie1931.colorName} ({cie1931.colorPurityPercent}% purity)
              </div>
            </div>

            <div className="rounded-xl border border-maroon-200 bg-white p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-maroon-800 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-sage-600" />
                <span>Stokes Shift & Fit R²</span>
              </div>
              <div className="mt-1 text-lg font-extrabold font-mono text-maroon-950">
                {stokesShiftMeV !== null
                  ? `ΔE = ${stokesShiftMeV >= 0 ? `+${stokesShiftMeV}` : stokesShiftMeV} meV`
                  : `R² = ${envelopeRSquared.toFixed(4)}`}
              </div>
              <div className="mt-1 text-[11px] text-slate-600 font-mono">
                Envelope R² = {envelopeRSquared.toFixed(4)} ({peaks.length} bands)
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-maroon-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sage-600" />
              {summary.headline}
            </span>
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-maroon-800 to-sage-600 hover:from-maroon-900 hover:to-sage-700 text-white text-xs font-semibold transition shadow-sm"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              {copied ? 'Copied Manuscript Text' : 'Copy Manuscript Paragraph'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ul className="bg-sage-50/50 rounded-lg p-3 border border-sage-200 space-y-1.5 text-xs text-slate-700 list-disc list-inside">
              {summary.keyFindings.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>

            <div className="bg-maroon-50/40 rounded-lg p-3 border border-maroon-200 text-xs text-maroon-950 leading-relaxed select-all">
              {summary.manuscriptParagraph}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
