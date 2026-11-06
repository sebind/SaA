import React, { useState } from 'react';
import { PeakData, ReferenceMaterial } from '../types/spectrum';
import { generateCharacterizationSummary } from '../utils/exportUtils';
import {
  Table,
  Compass,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface PeakAnalysisPanelProps {
  sampleName: string;
  peaks: PeakData[];
  selectedPeakId: string | null;
  onSelectPeak: (id: string | null) => void;
  references: ReferenceMaterial[];
  selectedReferenceId: string;
  onSelectReferenceId: (id: string) => void;
}

export const PeakAnalysisPanel: React.FC<PeakAnalysisPanelProps> = ({
  sampleName,
  peaks,
  selectedPeakId,
  onSelectPeak,
  references,
  selectedReferenceId,
  onSelectReferenceId
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'reference' | 'summary'>('table');
  const [copied, setCopied] = useState(false);

  const activeReference = references.find((r) => r.id === selectedReferenceId) || references[0];
  const selectedPeak = peaks.find((p) => p.id === selectedPeakId) || peaks[0] || null;

  const summary = generateCharacterizationSummary(sampleName, peaks, activeReference);

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summary.manuscriptParagraph);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header Tabs */}
      <div className="px-4 py-2.5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'table'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Peak Parameter Table
            <span
              className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === 'table'
                  ? 'bg-teal-700 text-teal-50'
                  : 'bg-slate-200 text-slate-700'
              }`}
            >
              {peaks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reference')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'reference'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Modes & Reference Match
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'summary'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Characterization Summary
          </button>
        </div>

        {/* Reference Standard Quick Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Reference:</span>
          <select
            value={selectedReferenceId}
            onChange={(e) => onSelectReferenceId(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:border-teal-500"
          >
            {references.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.formula.split(' ')[0]})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 1: PEAK PARAMETER TABLE */}
      {activeTab === 'table' && (
        <div className="overflow-x-auto">
          {peaks.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No peaks detected. Lower the prominence threshold in the sidebar.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Center (cm⁻¹)</th>
                  <th className="py-2.5 px-3">Amplitude</th>
                  <th className="py-2.5 px-3">FWHM (cm⁻¹)</th>
                  <th className="py-2.5 px-3">Area</th>
                  <th className="py-2.5 px-3">Fit (R²)</th>
                  <th className="py-2.5 px-3">Vibrational Assignment</th>
                  <th className="py-2.5 px-3">Ref Shift (Δ)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {peaks.map((p, idx) => {
                  const isSelected = p.id === selectedPeakId;
                  const delta = p.assignedMode?.shiftDelta;
                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectPeak(isSelected ? null : p.id)}
                      className={`cursor-pointer transition ${
                        isSelected
                          ? 'bg-teal-50/80 text-slate-900'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-mono font-semibold">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: p.color }}
                          />
                          P{idx + 1}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-teal-700">
                        {p.center.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3 font-mono">{p.amplitude.toFixed(2)}</td>
                      <td className="py-2.5 px-3 font-mono">{p.fwhm.toFixed(1)}</td>
                      <td className="py-2.5 px-3 font-mono">{p.area.toFixed(1)}</td>
                      <td className="py-2.5 px-3 font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px]">
                          {p.rSquared.toFixed(3)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {p.assignedMode ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              {p.assignedMode.mode}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {p.assignedMode.bond} • {p.assignedMode.materialGroup}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned lattice/overtone</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono">
                        {delta !== undefined ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              Math.abs(delta) <= 4
                                ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {delta >= 0 ? `+${delta}` : delta} cm⁻¹
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
      )}

      {/* TAB 2: VIBRATIONAL MODES & REFERENCE COMPARISON */}
      {activeTab === 'reference' && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Reference Peak Alignment Table */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/40">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-xs font-semibold text-slate-800">
                  {activeReference.name}
                </h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  {activeReference.formula} • {activeReference.category}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold">
                {summary.matchScore}% Match
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3">{activeReference.notes}</p>

            <table className="w-full text-left text-xs border-t border-slate-200">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-200">
                  <th className="py-1.5">Ref Mode</th>
                  <th className="py-1.5">Ref (cm⁻¹)</th>
                  <th className="py-1.5">Exp Peak (cm⁻¹)</th>
                  <th className="py-1.5">Shift Δ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {activeReference.peaks.map((rp, i) => {
                  // Find closest experimental peak
                  let closest: PeakData | null = null;
                  let minDiff = Infinity;
                  for (const p of peaks) {
                    const d = Math.abs(p.center - rp.wavenumber);
                    if (d < minDiff) {
                      minDiff = d;
                      closest = p;
                    }
                  }
                  const isMatched = closest && minDiff <= 18;
                  const delta = closest ? Number((closest.center - rp.wavenumber).toFixed(1)) : null;

                  return (
                    <tr key={i} className="text-slate-700">
                      <td className="py-2 font-medium">
                        {rp.label}{' '}
                        <span className="text-[10px] text-slate-400">({rp.symmetry})</span>
                      </td>
                      <td className="py-2 font-mono text-slate-600">{rp.wavenumber}</td>
                      <td className="py-2 font-mono">
                        {isMatched && closest ? (
                          <span className="inline-flex items-center gap-1 text-teal-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                            {closest.center}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Not detected
                          </span>
                        )}
                      </td>
                      <td className="py-2 font-mono">
                        {isMatched && delta !== null ? (
                          <span className="text-teal-700">
                            {delta >= 0 ? `+${delta}` : delta} cm⁻¹
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
          </div>

          {/* Right: Selected Peak Vibrational Mode Inspector */}
          <div className="border border-slate-200 rounded-lg p-3.5 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                Vibrational Mode Explorer
              </span>
              <div className="flex gap-1">
                {peaks.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPeak(p.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                      (selectedPeak?.id || '') === p.id
                        ? 'bg-teal-600 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    P{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {selectedPeak ? (
              <div className="space-y-2.5">
                <div className="p-2.5 rounded-lg bg-teal-50/70 border border-teal-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">Selected Experimental Band</div>
                    <div className="text-sm font-mono font-bold text-teal-800">
                      {selectedPeak.center} cm⁻¹{' '}
                      <span className="text-xs font-normal text-slate-600">
                        (FWHM: {selectedPeak.fwhm} cm⁻¹, Area: {selectedPeak.area})
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-white text-teal-700 border border-teal-200 text-[11px] font-semibold uppercase">
                    {selectedPeak.shape}
                  </span>
                </div>

                {selectedPeak.assignedMode ? (
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800">
                        Primary Assignment: {selectedPeak.assignedMode.mode}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-medium">
                        {selectedPeak.assignedMode.confidence} Match
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      Bond: {selectedPeak.assignedMode.bond} • Literature Range:{' '}
                      {selectedPeak.assignedMode.range[0]}–{selectedPeak.assignedMode.range[1]} cm⁻¹
                    </div>
                    <p className="text-xs text-slate-600 pt-1">
                      {selectedPeak.assignedMode.description}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    No direct fundamental match within ±32 cm⁻¹ in the reference library.
                  </p>
                )}

                {selectedPeak.alternatives.length > 0 && (
                  <div>
                    <div className="text-[11px] font-medium text-slate-400 mb-1">
                      Alternative Candidate Modes Nearby:
                    </div>
                    <div className="space-y-1">
                      {selectedPeak.alternatives.map((alt) => (
                        <div
                          key={alt.id}
                          className="text-xs flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-50 border border-slate-100"
                        >
                          <span className="font-medium text-slate-700">
                            {alt.mode} <span className="text-slate-400">({alt.bond})</span>
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            Ref {alt.referenceWavenumber} cm⁻¹ (Δ {alt.shiftDelta > 0 ? `+${alt.shiftDelta}` : alt.shiftDelta})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Select a peak to view assignments.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CHARACTERIZATION SUMMARY */}
      {activeTab === 'summary' && (
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-teal-700">
                Automated Raman Characterization Report
              </h4>
              <p className="text-xs text-slate-500">{summary.headline}</p>
            </div>
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard' : 'Copy Manuscript Summary'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Key Quantitative Findings */}
            <div className="bg-slate-50/70 rounded-lg p-3 border border-slate-200/80 space-y-1.5">
              <div className="text-xs font-semibold text-slate-700">Key Spectral Findings</div>
              <ul className="space-y-1.5 text-xs text-slate-600 list-disc list-inside">
                {summary.keyFindings.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Manuscript-Ready Paragraph */}
            <div className="bg-teal-50/40 rounded-lg p-3 border border-teal-200/70">
              <div className="text-xs font-semibold text-teal-800 mb-1">
                Publication-Ready Text
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-sans select-all">
                {summary.manuscriptParagraph}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
