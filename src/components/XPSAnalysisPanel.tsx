import React, { useState } from 'react';
import {
  XPSConfig,
  XPSCoreLevelReference,
  XPSPeakData,
  XPSPipelineResult
} from '../types/xps';
import { generateXPSCharacterizationSummary } from '../utils/xpsMath';
import {
  Table,
  Compass,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Atom,
  Award
} from 'lucide-react';

interface XPSAnalysisPanelProps {
  sampleName: string;
  coreLevel: string;
  config: XPSConfig;
  result: XPSPipelineResult;
  selectedPeakId: string | null;
  onSelectPeak: (id: string | null) => void;
  references: XPSCoreLevelReference[];
  selectedReferenceId: string;
  onSelectReferenceId: (id: string) => void;
}

export const XPSAnalysisPanel: React.FC<XPSAnalysisPanelProps> = ({
  sampleName,
  coreLevel,
  config,
  result,
  selectedPeakId,
  onSelectPeak,
  references,
  selectedReferenceId,
  onSelectReferenceId
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'reference' | 'summary'>(
    'table'
  );
  const [copied, setCopied] = useState(false);

  const { peaks, envelopeRSquared, totalIntegratedArea } = result;
  const activeReference =
    references.find((r) => r.id === selectedReferenceId) || references[0];
  const selectedPeak =
    peaks.find((p) => p.id === selectedPeakId) || peaks[0] || null;

  const summary = generateXPSCharacterizationSummary(
    sampleName,
    coreLevel,
    config,
    result,
    activeReference
  );

  const dominantPeak =
    peaks.length > 0
      ? [...peaks].sort((a, b) => b.atomicPercent - a.atomicPercent)[0]
      : null;

  const doubletPeak = peaks.find((p) => p.measuredSplittingEv !== undefined);

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summary.manuscriptParagraph);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-deepblue-200 shadow-sm overflow-hidden">
      {/* Header Tabs */}
      <div className="px-3 sm:px-4 py-2.5 border-b border-deepblue-100 flex flex-wrap items-center justify-between gap-2 bg-deepblue-50/40">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'table'
                ? 'bg-gradient-to-r from-deepblue-800 to-bubblegum-600 text-white shadow-sm'
                : 'text-deepblue-900 hover:bg-white'
            }`}
          >
            <Table className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">Peaks ({peaks.length})</span>
            <span className="hidden sm:inline">
              Deconvoluted Peaks ({peaks.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reference')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'reference'
                ? 'bg-gradient-to-r from-deepblue-800 to-bubblegum-600 text-white shadow-sm'
                : 'text-deepblue-900 hover:bg-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">State Match</span>
            <span className="hidden sm:inline">
              Chemical State & Doublet Match
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'summary'
                ? 'bg-gradient-to-r from-deepblue-800 to-bubblegum-600 text-white shadow-sm'
                : 'text-deepblue-900 hover:bg-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5 shrink-0" />
            <span className="sm:hidden">Summary</span>
            <span className="hidden sm:inline">XPS Report & Summary</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs w-full sm:w-auto">
          <span className="text-[11px] font-semibold text-deepblue-800 hidden sm:inline shrink-0">
            NIST Reference:
          </span>
          <select
            value={selectedReferenceId}
            onChange={(e) => onSelectReferenceId(e.target.value)}
            className="w-full sm:w-auto max-w-full truncate bg-white border border-deepblue-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-deepblue-900 focus:outline-none focus:border-bubblegum-500"
          >
            {references.map((r) => (
              <option key={r.id} value={r.id}>
                {r.coreLevel} — {r.name.split('(')[0].trim()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 1: DECONVOLUTED PEAK & ATOMIC QUANTIFICATION TABLE */}
      {activeTab === 'table' && (
        <div>
          {/* Stacked Chemical State Fraction Bar */}
          {peaks.length > 0 && (
            <div className="px-4 py-3 bg-white border-b border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-deepblue-900 flex items-center gap-1.5">
                  <Atom className="w-3.5 h-3.5 text-bubblegum-500" />
                  <span>
                    Chemical State Atomic Distribution ({coreLevel})
                  </span>
                </span>
                <span className="font-mono text-[11px] font-semibold text-bubblegum-600">
                  Envelope R² = {envelopeRSquared.toFixed(4)}
                </span>
              </div>

              <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 border border-slate-200">
                {peaks.map((p) => (
                  <div
                    key={`bar-${p.id}`}
                    onClick={() =>
                      onSelectPeak(p.id === selectedPeakId ? null : p.id)
                    }
                    style={{
                      width: `${Math.max(2, p.atomicPercent)}%`,
                      backgroundColor: p.color
                    }}
                    title={`${p.assignedState?.stateLabel || p.id}: ${
                      p.centerEv
                    } eV (${p.atomicPercent}%)`}
                    className="h-full cursor-pointer transition-opacity hover:opacity-85"
                  />
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px]">
                {peaks.map((p, idx) => (
                  <button
                    key={`leg-${p.id}`}
                    type="button"
                    onClick={() =>
                      onSelectPeak(p.id === selectedPeakId ? null : p.id)
                    }
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border transition ${
                      p.id === selectedPeakId
                        ? 'bg-bubblegum-50 border-bubblegum-300 text-deepblue-950 font-bold'
                        : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-deepblue-50/50'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="font-mono font-semibold">
                      C{idx + 1} ({p.centerEv.toFixed(1)} eV):
                    </span>
                    <span>
                      {p.assignedState?.stateLabel.split('(')[0].trim() ||
                        'Sub-peak'}
                    </span>
                    <span className="font-mono font-bold text-bubblegum-600">
                      {p.atomicPercent.toFixed(1)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            {peaks.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No XPS peaks detected. Lower the prominence threshold or enable Auto Fit.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-deepblue-100 bg-deepblue-50/50 text-[11px] font-semibold uppercase tracking-wider text-deepblue-900">
                    <th className="py-2 px-3">Comp</th>
                    <th className="py-2 px-3">BE (eV)</th>
                    <th className="py-2 px-3">KE (eV)</th>
                    <th className="py-2 px-3">FWHM (eV)</th>
                    <th className="py-2 px-3">Area</th>
                    <th className="py-2 px-3">Rel. Area %</th>
                    <th className="py-2 px-3">Chemical / Oxidation State</th>
                    <th className="py-2 px-3">Doublet / ΔBE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {peaks.map((p, idx) => {
                    const isSelected = p.id === selectedPeakId;
                    const delta = p.assignedState?.shiftDeltaEv;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => onSelectPeak(isSelected ? null : p.id)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-bubblegum-50/70 text-deepblue-950'
                            : 'hover:bg-deepblue-50/40 text-slate-700'
                        }`}
                      >
                        <td className="py-2 px-3 font-mono font-semibold">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block"
                              style={{ backgroundColor: p.color }}
                            />
                            C{idx + 1}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-deepblue-800">
                          {p.centerEv.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-500">
                          {p.kineticEnergyEv.toFixed(1)}
                        </td>
                        <td className="py-2 px-3 font-mono">{p.fwhmEv.toFixed(2)}</td>
                        <td className="py-2 px-3 font-mono">
                          {p.area >= 100 ? p.area.toFixed(0) : p.area.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 font-mono">
                          <span className="px-2 py-0.5 rounded-md bg-bubblegum-50 border border-bubblegum-200 text-bubblegum-700 font-bold">
                            {p.atomicPercent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {p.assignedState ? (
                            <div>
                              <span className="font-semibold text-deepblue-950">
                                {p.assignedState.stateLabel}
                              </span>
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.2 rounded bg-deepblue-50 text-deepblue-800 border border-deepblue-200 font-mono">
                                Ox: {p.assignedState.oxidationState}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">Unassigned state</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono">
                          {p.measuredSplittingEv ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-deepblue-800 text-white">
                              ΔE_SO = {p.measuredSplittingEv.toFixed(2)} eV
                            </span>
                          ) : delta !== undefined ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                Math.abs(delta) <= 0.25
                                  ? 'bg-bubblegum-50 text-bubblegum-700 border border-bubblegum-200'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)} eV
                            </span>
                          ) : (
                            '—'
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

      {/* TAB 2: CHEMICAL STATE & SPIN-ORBIT DOUBLET MATCHER */}
      {activeTab === 'reference' && activeReference && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border border-deepblue-200 rounded-xl p-3.5 bg-deepblue-50/30 space-y-2.5 overflow-x-auto min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-deepblue-950">
                  {activeReference.name}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {activeReference.formula} • Scofield RSF ={' '}
                  {activeReference.scofieldRsf} • {activeReference.branchingRatioLabel}
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-bubblegum-500 text-white text-xs font-bold shadow-sm">
                {summary.matchScore}% Match
              </span>
            </div>

            <table className="w-full text-left text-xs border-t border-deepblue-100">
              <thead>
                <tr className="text-[10px] uppercase text-deepblue-800 border-b border-deepblue-100">
                  <th className="py-1.5">Reference Chemical State</th>
                  <th className="py-1.5">Ref BE (eV)</th>
                  <th className="py-1.5">Exp BE (eV)</th>
                  <th className="py-1.5">ΔBE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-deepblue-100/60">
                {activeReference.states.map((rs, i) => {
                  let closest: XPSPeakData | null = null;
                  let minDiff = Infinity;
                  for (const p of peaks) {
                    const d = Math.abs(p.centerEv - rs.bindingEnergyEv);
                    if (d < minDiff) {
                      minDiff = d;
                      closest = p;
                    }
                  }
                  const isMatched = closest && minDiff <= 0.75;
                  const delta = closest
                    ? Number((closest.centerEv - rs.bindingEnergyEv).toFixed(2))
                    : null;

                  return (
                    <tr key={i} className="text-slate-700">
                      <td className="py-1.5 font-medium text-deepblue-950">
                        {rs.stateLabel}
                      </td>
                      <td className="py-1.5 font-mono text-slate-600">
                        {rs.bindingEnergyEv.toFixed(2)}
                      </td>
                      <td className="py-1.5 font-mono">
                        {isMatched && closest ? (
                          <span className="inline-flex items-center gap-1 text-deepblue-800 font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-bubblegum-500" />
                            {closest.centerEv.toFixed(2)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <AlertCircle className="w-3.5 h-3.5" />—
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 font-mono text-bubblegum-700 font-semibold">
                        {isMatched && delta !== null
                          ? `${delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <p className="text-[11px] text-slate-600 bg-white/80 rounded-lg p-2 border border-deepblue-100">
              {activeReference.notes}
            </p>
          </div>

          {/* Right Column: Selected Component Chemical State Inspector */}
          <div className="border border-deepblue-200 rounded-xl p-3.5 bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-deepblue-800">
                Component State Inspector
              </span>
              <div className="flex gap-1 flex-wrap">
                {peaks.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPeak(p.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                      (selectedPeak?.id || '') === p.id
                        ? 'bg-bubblegum-500 text-white font-bold shadow-sm'
                        : 'bg-deepblue-50 text-deepblue-800 hover:bg-bubblegum-50'
                    }`}
                  >
                    C{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {selectedPeak ? (
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-lg bg-gradient-to-r from-deepblue-900 to-deepblue-800 text-white flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono font-bold">
                      BE = {selectedPeak.centerEv.toFixed(2)} eV • FWHM ={' '}
                      {selectedPeak.fwhmEv.toFixed(2)} eV
                    </div>
                    <div className="text-[11px] text-bubblegum-200 font-mono">
                      KE = {selectedPeak.kineticEnergyEv.toFixed(1)} eV • Relative Area ={' '}
                      {selectedPeak.atomicPercent.toFixed(1)}%
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-bubblegum-500 text-white text-[10px] font-bold uppercase">
                    {selectedPeak.shape === 'pseudo-voigt'
                      ? `GL(${selectedPeak.glMixRatio})`
                      : selectedPeak.shape}
                  </span>
                </div>

                {selectedPeak.assignedState && (
                  <div className="p-2.5 rounded-lg border border-bubblegum-200 bg-bubblegum-50/40 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-deepblue-950">
                        {selectedPeak.assignedState.stateLabel}
                      </div>
                      <div className="text-slate-600 text-[11px]">
                        {selectedPeak.assignedState.bondEnvironment} • NIST Ref:{' '}
                        <span className="font-mono font-semibold">
                          {selectedPeak.assignedState.referenceBeEv.toFixed(2)} eV
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-deepblue-800 text-white font-semibold">
                      {selectedPeak.assignedState.confidence}
                    </span>
                  </div>
                )}

                {selectedPeak.alternatives.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[10px] font-semibold uppercase text-slate-400">
                      Alternative Candidate Assignments
                    </div>
                    {selectedPeak.alternatives.map((alt) => (
                      <div
                        key={alt.id}
                        className="text-xs flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-50 border border-slate-100"
                      >
                        <span className="font-medium text-slate-700">
                          {alt.stateLabel}{' '}
                          <span className="text-slate-400">({alt.coreLevel})</span>
                        </span>
                        <span className="font-mono text-[11px] text-deepblue-800 font-semibold">
                          {alt.referenceBeEv.toFixed(2)} eV
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 3: SUMMARY & MANUSCRIPT REPORT */}
      {activeTab === 'summary' && (
        <div className="p-4 space-y-4">
          {/* 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-bubblegum-200 bg-bubblegum-50/40 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-bubblegum-700">
                Dominant Core-Level Peak
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-extrabold font-mono text-deepblue-900">
                  {dominantPeak ? `${dominantPeak.centerEv.toFixed(2)} eV` : '—'}
                </span>
                {dominantPeak && (
                  <span className="text-xs font-mono font-bold text-bubblegum-600">
                    ({dominantPeak.atomicPercent.toFixed(1)}%)
                  </span>
                )}
              </div>
              <div className="mt-1 text-[11px] text-slate-600 truncate">
                {dominantPeak?.assignedState?.stateLabel || coreLevel}
              </div>
            </div>

            <div className="rounded-xl border border-deepblue-200 bg-deepblue-50/50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-deepblue-800">
                Envelope Fit Quality
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-extrabold font-mono text-deepblue-900">
                  R² = {envelopeRSquared.toFixed(4)}
                </span>
              </div>
              <div className="mt-1 text-[11px] text-slate-600 font-mono">
                {peaks.length} components •{' '}
                {config.fitShape === 'pseudo-voigt'
                  ? `GL(${config.glMixRatio})`
                  : config.fitShape}
              </div>
            </div>

            <div className="rounded-xl border border-deepblue-200 bg-deepblue-50/50 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-deepblue-800">
                Background & Total Area
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-extrabold font-mono text-slate-900">
                  {totalIntegratedArea >= 1000
                    ? `${(totalIntegratedArea / 1000).toFixed(1)}k`
                    : totalIntegratedArea.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500 font-mono">CPS·eV</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-600 uppercase font-semibold">
                {config.backgroundMethod} Inelastic Subtraction
              </div>
            </div>

            <div className="rounded-xl border border-deepblue-200 bg-white p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-deepblue-800 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-bubblegum-500" />
                <span>Spin-Orbit / Reference</span>
              </div>
              <div className="mt-1 text-sm font-bold text-deepblue-950 truncate">
                {doubletPeak
                  ? `ΔE_SO = ${doubletPeak.measuredSplittingEv?.toFixed(2)} eV`
                  : activeReference?.branchingRatioLabel || 'Singlet Core Level'}
              </div>
              <div className="mt-1 text-[11px] text-slate-600">
                NIST Match Score:{' '}
                <span className="font-bold text-bubblegum-600">
                  {summary.matchScore}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold text-deepblue-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-bubblegum-500 shrink-0" />
              <span>{summary.headline}</span>
            </span>
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-deepblue-800 to-bubblegum-600 hover:from-deepblue-900 hover:to-bubblegum-700 text-white text-xs font-semibold transition shadow-sm shrink-0"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="sm:hidden">{copied ? 'Copied' : 'Copy Text'}</span>
              <span className="hidden sm:inline">
                {copied ? 'Copied Manuscript Text' : 'Copy Manuscript Paragraph'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ul className="bg-deepblue-50/40 rounded-lg p-3 border border-deepblue-200/80 space-y-1.5 text-xs text-slate-700 list-disc list-inside">
              {summary.keyFindings.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>

            <div className="bg-bubblegum-50/40 rounded-lg p-3 border border-bubblegum-200 text-xs text-deepblue-950 leading-relaxed select-all">
              {summary.manuscriptParagraph}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
