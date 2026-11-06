import React, { useRef } from 'react';
import {
  BaselineMethod,
  FitShape,
  NormMethod,
  ProcessingConfig,
  SampleDataset,
  SmoothMethod
} from '../types/spectrum';
import {
  Upload,
  Sliders,
  Sparkles,
  Activity,
  RotateCcw,
  FileSpreadsheet,
  Download
} from 'lucide-react';

interface ProcessingSidebarProps {
  config: ProcessingConfig;
  onChangeConfig: (partial: Partial<ProcessingConfig>) => void;
  onResetConfig: () => void;
  samples: SampleDataset[];
  activeSampleId: string;
  onSelectSample: (sample: SampleDataset) => void;
  onFileUpload: (file: File) => void;
  onExcelReferenceUpload: (file: File) => void;
  referenceCompoundCount: number;
}

export const ProcessingSidebar: React.FC<ProcessingSidebarProps> = ({
  config,
  onChangeConfig,
  onResetConfig,
  samples,
  activeSampleId,
  onSelectSample,
  onFileUpload,
  onExcelReferenceUpload,
  referenceCompoundCount
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
      e.target.value = '';
    }
  };

  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onExcelReferenceUpload(file);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-3">
      {/* 1. Spectrum Import & Presets */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-800">
            <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
            <span>Spectrum</span>
          </div>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-purple-200 hover:border-purple-600 bg-purple-50/40 hover:bg-purple-50/80 transition rounded-lg p-2.5 text-center cursor-pointer"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.dat,.tsv"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="w-4 h-4 text-purple-600 mx-auto mb-0.5" />
          <p className="text-xs font-medium text-slate-700">
            Import <span className="text-violet-800 font-semibold">CSV / TXT</span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {samples.map((s) => {
            const active = s.id === activeSampleId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSample(s)}
                className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition truncate font-medium ${
                  active
                    ? 'bg-gradient-to-r from-purple-600 to-violet-800 border-violet-700 text-white shadow-sm'
                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-purple-50/40'
                }`}
              >
                {s.name.split(' ')[0]} {s.name.split(' ')[1]}
              </button>
            );
          })}
        </div>

        {/* Excel Reference Sheet Controls */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleExcelChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => excelInputRef.current?.click()}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-violet-800 border border-purple-200 text-[11px] font-semibold transition"
            title="Load updated reference_data.xlsx"
          >
            <Upload className="w-3 h-3 text-purple-600" />
            Ref Excel ({referenceCompoundCount})
          </button>
          <a
            href="./reference_data.xlsx"
            download="reference_data.xlsx"
            className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[11px] font-medium transition"
            title="Download reference_data.xlsx template"
          >
            <Download className="w-3 h-3 text-purple-600" />
            .xlsx
          </a>
        </div>
      </div>

      {/* 2. Preprocessing */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-800">
            <Sliders className="w-3.5 h-3.5 text-purple-600" />
            <span>Preprocessing</span>
          </div>
          <button
            type="button"
            onClick={onResetConfig}
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-violet-700 transition"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Baseline */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700">Baseline</label>
            {config.baselineMethod === 'polynomial' && (
              <span className="text-[11px] font-mono text-violet-700">
                Deg {config.polyDegree}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium">
            {(
              [
                ['none', 'Off'],
                ['linear', 'Linear'],
                ['polynomial', 'Poly'],
                ['rollingball', 'Roll']
              ] as [BaselineMethod, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeConfig({ baselineMethod: val })}
                className={`py-1 rounded-md transition ${
                  config.baselineMethod === val
                    ? 'bg-white text-violet-800 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {config.baselineMethod === 'polynomial' && (
            <input
              type="range"
              min={1}
              max={6}
              step={1}
              value={config.polyDegree}
              onChange={(e) => onChangeConfig({ polyDegree: Number(e.target.value) })}
              className="mt-2 w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
          )}

          {config.baselineMethod === 'rollingball' && (
            <input
              type="range"
              min={15}
              max={120}
              step={5}
              value={config.rollingRadius}
              onChange={(e) => onChangeConfig({ rollingRadius: Number(e.target.value) })}
              className="mt-2 w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
          )}
        </div>

        {/* Smoothing */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700">Smoothing</label>
            {config.smoothMethod !== 'none' && (
              <span className="text-[11px] font-mono text-violet-700">
                {config.smoothWindow} pts
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium">
            {(
              [
                ['none', 'Off'],
                ['savgol', 'SavGol'],
                ['moving', 'Moving']
              ] as [SmoothMethod, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeConfig({ smoothMethod: val })}
                className={`py-1 rounded-md transition ${
                  config.smoothMethod === val
                    ? 'bg-white text-violet-800 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {config.smoothMethod !== 'none' && (
            <input
              type="range"
              min={5}
              max={25}
              step={2}
              value={config.smoothWindow}
              onChange={(e) => onChangeConfig({ smoothWindow: Number(e.target.value) })}
              className="mt-2 w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
          )}
        </div>

        {/* Normalization */}
        <div className="pt-2 border-t border-slate-100">
          <label className="text-xs font-medium text-slate-700 block mb-1">
            Normalization
          </label>
          <div className="grid grid-cols-5 gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium">
            {(
              [
                ['none', 'Raw'],
                ['minmax', '0–1'],
                ['max', 'Max'],
                ['snv', 'SNV'],
                ['area', 'Area']
              ] as [NormMethod, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeConfig({ normMethod: val })}
                className={`py-1 rounded-md transition ${
                  config.normMethod === val
                    ? 'bg-white text-violet-800 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Peak Fitting */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-800">
          <Activity className="w-3.5 h-3.5 text-purple-600" />
          <span>Peak Fitting</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-lg text-xs font-medium">
          {(
            [
              ['lorentzian', 'Lorentzian'],
              ['gaussian', 'Gaussian']
            ] as [FitShape, string][]
          ).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => onChangeConfig({ fitShape: val })}
              className={`py-1.5 rounded-md transition flex items-center justify-center gap-1 ${
                config.fitShape === val
                  ? 'bg-gradient-to-r from-purple-600 to-violet-800 text-white shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600">Prominence</span>
            <span className="font-mono text-violet-800 font-semibold">
              {Math.round(config.prominence * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.04}
            max={0.45}
            step={0.01}
            value={config.prominence}
            onChange={(e) => onChangeConfig({ prominence: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600">Min Distance</span>
            <span className="font-mono text-violet-800 font-semibold">
              {config.minDistance} cm⁻¹
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={120}
            step={5}
            value={config.minDistance}
            onChange={(e) => onChangeConfig({ minDistance: Number(e.target.value) })}
            className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    </aside>
  );
};
