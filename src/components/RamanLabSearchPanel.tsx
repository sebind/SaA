import React, { useMemo, useRef, useState } from 'react';
import { PeakData, ReferenceMaterial } from '../types/spectrum';
import {
  RamanLabEntry,
  RamanLabFilterCriteria,
  RamanLabMatchResult,
  screenRamanLabDatabase
} from '../utils/ramanLabDatabase';
import {
  Database,
  Search,
  FolderOpen,
  CheckCircle2,
  ExternalLink,
  Layers
} from 'lucide-react';

interface RamanLabSearchPanelProps {
  queryX: number[];
  queryY: number[];
  detectedPeaks: PeakData[];
  ramanLabDb: RamanLabEntry[];
  dbSourcePath: string;
  isLoadingDb: boolean;
  onLoadDbFromFile: (file: File) => void;
  onLoadDbFromPath: (pathOrUrl: string) => void;
  onApplyMatchAsReference: (ref: ReferenceMaterial) => void;
}

export const RamanLabSearchPanel: React.FC<RamanLabSearchPanelProps> = ({
  queryX,
  queryY,
  detectedPeaks,
  ramanLabDb,
  dbSourcePath,
  isLoadingDb,
  onLoadDbFromFile,
  onLoadDbFromPath,
  onApplyMatchAsReference
}) => {
  const [pathInput, setPathInput] = useState<string>(
    dbSourcePath || './RamanLab_Database_20250602.pkl'
  );
  const [criteria, setCriteria] = useState<RamanLabFilterCriteria>({
    queryText: '',
    chemicalFamily: '',
    requiredElements: '',
    onlyElements: '',
    excludeElements: '',
    userPeaks: '',
    peakTolerance: 10,
    algorithm: 'combined',
    threshold: 0.15,
    maxResults: 15
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const chemicalFamilies = useMemo(() => {
    const set = new Set<string>();
    for (const e of ramanLabDb) {
      if (e.chemicalFamily) set.add(e.chemicalFamily);
    }
    return Array.from(set).sort();
  }, [ramanLabDb]);

  const { filteredCount, matches } = useMemo(() => {
    if (ramanLabDb.length === 0) {
      return { filteredCount: 0, matches: [] as RamanLabMatchResult[] };
    }
    return screenRamanLabDatabase(
      ramanLabDb,
      queryX,
      queryY,
      detectedPeaks,
      criteria
    );
  }, [ramanLabDb, queryX, queryY, detectedPeaks, criteria]);

  const handleSelectMatch = (m: RamanLabMatchResult) => {
    const ref: ReferenceMaterial = {
      id: `ramanlab-${m.entry.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      name: m.entry.name,
      formula: m.entry.formula || m.entry.elements.join(', ') || 'RamanLab Entry',
      category: m.entry.chemicalFamily || 'RamanLab Database',
      notes: `Score ${(m.score * 100).toFixed(1)}% (Corr ${m.correlationScore}, Peak ${m.peakScore})`,
      spectrumX: m.entry.wavenumbers,
      spectrumY: m.entry.intensities,
      peaks: m.entry.peaks.map((wn, idx) => ({
        wavenumber: Number(wn.toFixed(1)),
        relativeIntensity: 0.85,
        label: `Mode ${idx + 1}`,
        symmetry: ''
      }))
    };
    onApplyMatchAsReference(ref);
  };

  return (
    <div className="p-4 space-y-4">
      {/* 1. Local Database Path / File Loader Bar */}
      <div className="p-3 rounded-lg bg-purple-50/50 border border-purple-200/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-[240px] flex-1">
          <Database className="w-4 h-4 text-purple-600 shrink-0" />
          <input
            type="text"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            placeholder="Path/URL to RamanLab_Database_20250602.pkl"
            className="flex-1 bg-white border border-purple-200 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-700 focus:outline-none focus:border-purple-600"
          />
          <button
            type="button"
            disabled={isLoadingDb}
            onClick={() => onLoadDbFromPath(pathInput)}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-purple-100 text-violet-800 border border-purple-200 text-xs font-semibold transition"
          >
            {isLoadingDb ? 'Loading...' : 'Load Path'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pkl,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) {
                setPathInput(f.name);
                onLoadDbFromFile(f);
                e.target.value = '';
              }
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-violet-800 hover:from-purple-700 hover:to-violet-900 text-white text-xs font-semibold transition shadow-sm"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            Browse Local .pkl
          </button>

          <a
            href="https://zenodo.org/records/15742626"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-violet-800 text-xs font-medium transition"
            title="Download RamanLab_Database_20250602.pkl from Zenodo"
          >
            Zenodo
            <ExternalLink className="w-3 h-3" />
          </a>

          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-violet-900 font-mono text-[11px] font-semibold">
            {ramanLabDb.length.toLocaleString()} spectra
          </span>
        </div>
      </div>

      {/* 2. Material & Chemistry Screening Filters (RamanLab style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 bg-slate-50/70 p-3 rounded-lg border border-slate-200/80">
        <div>
          <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
            Material / Formula
          </label>
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              value={criteria.queryText}
              onChange={(e) =>
                setCriteria((prev) => ({ ...prev, queryText: e.target.value }))
              }
              placeholder="e.g. Quartz, SiO2"
              className="w-full bg-white border border-slate-200 rounded-md pl-7 pr-2 py-1 text-xs focus:outline-none focus:border-purple-600"
            />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
            Required Elements
          </label>
          <input
            type="text"
            value={criteria.requiredElements}
            onChange={(e) =>
              setCriteria((prev) => ({ ...prev, requiredElements: e.target.value }))
            }
            placeholder="e.g. Si, O"
            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-mono focus:outline-none focus:border-purple-600"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
            Only Elements
          </label>
          <input
            type="text"
            value={criteria.onlyElements}
            onChange={(e) =>
              setCriteria((prev) => ({ ...prev, onlyElements: e.target.value }))
            }
            placeholder="e.g. Ca, C, O"
            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-mono focus:outline-none focus:border-purple-600"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
            Exclude Elements
          </label>
          <input
            type="text"
            value={criteria.excludeElements}
            onChange={(e) =>
              setCriteria((prev) => ({ ...prev, excludeElements: e.target.value }))
            }
            placeholder="e.g. Fe, Mg"
            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs font-mono focus:outline-none focus:border-purple-600"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
            Chemical Family
          </label>
          <input
            type="text"
            list="ramanlab-families"
            value={criteria.chemicalFamily}
            onChange={(e) =>
              setCriteria((prev) => ({ ...prev, chemicalFamily: e.target.value }))
            }
            placeholder="e.g. Silicate, Oxide"
            className="w-full bg-white border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-purple-600"
          />
          <datalist id="ramanlab-families">
            {chemicalFamilies.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
            Algorithm & Tol (±{criteria.peakTolerance} cm⁻¹)
          </label>
          <div className="flex gap-1">
            <select
              value={criteria.algorithm}
              onChange={(e) =>
                setCriteria((prev) => ({
                  ...prev,
                  algorithm: e.target.value as RamanLabFilterCriteria['algorithm']
                }))
              }
              className="flex-1 bg-white border border-slate-200 rounded-md px-1.5 py-1 text-xs focus:outline-none focus:border-purple-600"
            >
              <option value="combined">Combined</option>
              <option value="peak">Peak Match</option>
              <option value="correlation">Correlation</option>
              <option value="multi-window">Multi-Window</option>
            </select>
            <input
              type="number"
              min={1}
              max={50}
              value={criteria.peakTolerance}
              onChange={(e) =>
                setCriteria((prev) => ({
                  ...prev,
                  peakTolerance: Number(e.target.value) || 10
                }))
              }
              className="w-12 bg-white border border-slate-200 rounded-md px-1.5 py-1 text-xs font-mono text-center"
              title="Peak position tolerance (cm⁻¹)"
            />
          </div>
        </div>
      </div>

      {/* 3. Screened & Ranked Candidate Results */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            Screened <strong className="text-violet-900">{filteredCount.toLocaleString()}</strong> candidates • Top{' '}
            <strong className="text-violet-900">{matches.length}</strong> matches
          </span>
          <input
            type="text"
            value={criteria.userPeaks}
            onChange={(e) =>
              setCriteria((prev) => ({ ...prev, userPeaks: e.target.value }))
            }
            placeholder="Optional target peaks (e.g. 144, 399, 639)"
            className="w-64 bg-white border border-slate-200 rounded-md px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-purple-600"
          />
        </div>

        {matches.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
            No matching spectra. Adjust element/formula filters or browse your local{' '}
            <code className="font-mono text-violet-800">RamanLab_Database_20250602.pkl</code>.
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase text-slate-500">
                  <th className="py-2 px-3">Material</th>
                  <th className="py-2 px-3">Formula / Elements</th>
                  <th className="py-2 px-3">Family</th>
                  <th className="py-2 px-3">Score</th>
                  <th className="py-2 px-3">Matched Peaks (Exp → DB)</th>
                  <th className="py-2 px-3 text-right">Overlay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matches.map((m, i) => (
                  <tr key={`${m.entry.name}-${i}`} className="hover:bg-purple-50/40">
                    <td className="py-2 px-3 font-semibold text-slate-800">
                      {m.entry.name}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-600">
                      {m.entry.formula || m.entry.elements.join(', ') || '—'}
                    </td>
                    <td className="py-2 px-3 text-slate-500">
                      {m.entry.chemicalFamily || '—'}
                    </td>
                    <td className="py-2 px-3 font-mono">
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-violet-900 font-semibold">
                        {(m.score * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                      {m.matchedPeaks.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {m.matchedPeaks.slice(0, 5).map((mp, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-violet-900"
                            >
                              <CheckCircle2 className="w-3 h-3 text-purple-600" />
                              {mp.expPeak}→{mp.dbPeak}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400">Spectral shape match</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleSelectMatch(m)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-600 hover:bg-violet-800 text-white text-[11px] font-semibold transition"
                      >
                        <Layers className="w-3 h-3" />
                        Match
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
