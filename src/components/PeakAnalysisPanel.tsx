import React, { useState } from 'react';
import { PeakData, ReferenceMaterial } from '../types/spectrum';
import { generateCharacterizationSummary } from '../utils/exportUtils';
import { RamanLabEntry } from '../utils/ramanLabDatabase';
import { RamanLabSearchPanel } from './RamanLabSearchPanel';
import {
  Table,
  Compass,
  FileText,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Database
} from 'lucide-react';

interface PeakAnalysisPanelProps {
  sampleName: string;
  queryX: number[];
  queryY: number[];
  peaks: PeakData[];
  selectedPeakId: string | null;
  onSelectPeak: (id: string | null) => void;
  references: ReferenceMaterial[];
  selectedReferenceId: string;
  onSelectReferenceId: (id: string) => void;
  ramanLabDb: RamanLabEntry[];
  dbSourcePath: string;
  isLoadingDb: boolean;
  onLoadDbFromFile: (file: File) => void;
  onLoadDbFromPath: (pathOrUrl: string) => void;
  onApplyMatchAsReference: (ref: ReferenceMaterial) => void;
}

export const PeakAnalysisPanel: React.FC<PeakAnalysisPanelProps> = ({
  sampleName,
  queryX,
  queryY,
  peaks,
  selectedPeakId,
  onSelectPeak,
  references,
  selectedReferenceId,
  onSelectReferenceId,
  ramanLabDb,
  dbSourcePath,
  isLoadingDb,
  onLoadDbFromFile,
  onLoadDbFromPath,
  onApplyMatchAsReference
}) => {
  const [activeTab, setActiveTab] = useState<'table' | 'ramanlab' | 'reference' | 'summary'>('table');
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
      <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-white">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('table')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'table'
                ? 'bg-gradient-to-r from-purple-600 to-violet-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Peaks ({peaks.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ramanlab')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'ramanlab'
                ? 'bg-gradient-to-r from-purple-600 to-violet-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            RamanLab DB ({ramanLabDb.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reference')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'reference'
                ? 'bg-gradient-to-r from-purple-600 to-violet-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Reference Match
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'summary'
                ? 'bg-gradient-to-r from-purple-600 to-violet-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Summary
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={selectedReferenceId}
            onChange={(e) => onSelectReferenceId(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 focus:outline-none focus:border-purple-600"
          >
            {references.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.formula})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 1: PEAK PARAMETER TABLE */}
      {activeTab === 'table' && (
        <div className="overflow-x-auto">
          {peaks.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No peaks detected.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Center (cm⁻¹)</th>
                  <th className="py-2 px-3">Amplitude</th>
                  <th className="py-2 px-3">FWHM</th>
                  <th className="py-2 px-3">Area</th>
                  <th className="py-2 px-3">R²</th>
                  <th className="py-2 px-3">Vibrational Mode</th>
                  <th className="py-2 px-3">Δ (cm⁻¹)</th>
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
                          ? 'bg-purple-50/80 text-slate-900'
                          : 'hover:bg-slate-50 text-slate-700'
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
                      <td className="py-2 px-3 font-mono font-semibold text-violet-800">
                        {p.center.toFixed(1)}
                      </td>
                      <td className="py-2 px-3 font-mono">{p.amplitude.toFixed(2)}</td>
                      <td className="py-2 px-3 font-mono">{p.fwhm.toFixed(1)}</td>
                      <td className="py-2 px-3 font-mono">{p.area.toFixed(1)}</td>
                      <td className="py-2 px-3 font-mono text-slate-500">
                        {p.rSquared.toFixed(3)}
                      </td>
                      <td className="py-2 px-3">
                        {p.assignedMode ? (
                          <span className="font-medium text-slate-800">
                            {p.assignedMode.mode}{' '}
                            <span className="text-slate-400 font-normal">
                              ({p.assignedMode.materialGroup})
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono">
                        {delta !== undefined ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                              Math.abs(delta) <= 4
                                ? 'bg-purple-50 text-violet-800 border border-purple-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {delta >= 0 ? `+${delta}` : delta}
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

      {/* TAB 2: RAMANLAB DATABASE SCREENING */}
      {activeTab === 'ramanlab' && (
        <RamanLabSearchPanel
          queryX={queryX}
          queryY={queryY}
          detectedPeaks={peaks}
          ramanLabDb={ramanLabDb}
          dbSourcePath={dbSourcePath}
          isLoadingDb={isLoadingDb}
          onLoadDbFromFile={onLoadDbFromFile}
          onLoadDbFromPath={onLoadDbFromPath}
          onApplyMatchAsReference={(ref) => {
            onApplyMatchAsReference(ref);
            setActiveTab('reference');
          }}
        />
      )}

      {/* TAB 3: REFERENCE MATCH */}
      {activeTab === 'reference' && activeReference && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/40">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-slate-800">
                {activeReference.name}{' '}
                <span className="text-slate-400 font-mono">({activeReference.formula})</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-violet-800 text-xs font-semibold">
                {summary.matchScore}% Match
              </span>
            </div>

            <table className="w-full text-left text-xs border-t border-slate-200">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-200">
                  <th className="py-1.5">Vibrational Mode</th>
                  <th className="py-1.5">Ref (cm⁻¹)</th>
                  <th className="py-1.5">Exp (cm⁻¹)</th>
                  <th className="py-1.5">Δ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {activeReference.peaks.map((rp, i) => {
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
                      <td className="py-1.5 font-medium">{rp.label}</td>
                      <td className="py-1.5 font-mono text-slate-600">{rp.wavenumber}</td>
                      <td className="py-1.5 font-mono">
                        {isMatched && closest ? (
                          <span className="inline-flex items-center gap-1 text-violet-800 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                            {closest.center}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <AlertCircle className="w-3.5 h-3.5" />—
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 font-mono text-violet-800">
                        {isMatched && delta !== null
                          ? `${delta >= 0 ? `+${delta}` : delta}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="border border-slate-200 rounded-lg p-3 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-violet-800">
                Candidate Assignments
              </span>
              <div className="flex gap-1">
                {peaks.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPeak(p.id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                      (selectedPeak?.id || '') === p.id
                        ? 'bg-purple-600 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    P{idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {selectedPeak ? (
              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-purple-50/70 border border-purple-100 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-violet-900">
                    {selectedPeak.center} cm⁻¹ (FWHM {selectedPeak.fwhm} cm⁻¹)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white text-violet-800 border border-purple-200 text-[10px] font-semibold uppercase">
                    {selectedPeak.shape}
                  </span>
                </div>

                {selectedPeak.assignedMode && (
                  <div className="p-2.5 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {selectedPeak.assignedMode.mode}
                      </div>
                      <div className="text-slate-500">
                        {selectedPeak.assignedMode.materialGroup} • Ref {selectedPeak.assignedMode.referenceWavenumber} cm⁻¹
                      </div>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-violet-900 font-medium">
                      {selectedPeak.assignedMode.confidence}
                    </span>
                  </div>
                )}

                {selectedPeak.alternatives.map((alt) => (
                  <div
                    key={alt.id}
                    className="text-xs flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-50 border border-slate-100"
                  >
                    <span className="font-medium text-slate-700">
                      {alt.mode} <span className="text-slate-400">({alt.materialGroup})</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      {alt.referenceWavenumber} cm⁻¹
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* TAB 3: SUMMARY */}
      {activeTab === 'summary' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-violet-800">{summary.headline}</span>
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-violet-800 hover:from-purple-700 hover:to-violet-900 text-white text-xs font-medium transition shadow-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ul className="bg-slate-50/70 rounded-lg p-3 border border-slate-200/80 space-y-1 text-xs text-slate-600 list-disc list-inside">
              {summary.keyFindings.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>

            <div className="bg-purple-50/40 rounded-lg p-3 border border-purple-200/70 text-xs text-slate-700 leading-relaxed select-all">
              {summary.manuscriptParagraph}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
