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
  FileSpreadsheet
} from 'lucide-react';

interface ProcessingSidebarProps {
  config: ProcessingConfig;
  onChangeConfig: (partial: Partial<ProcessingConfig>) => void;
  onResetConfig: () => void;
  samples: SampleDataset[];
  activeSampleId: string;
  onSelectSample: (sample: SampleDataset) => void;
  onFileUpload: (file: File) => void;
  pointCount: number;
  wavenumberSpan: [number, number];
}

export const ProcessingSidebar: React.FC<ProcessingSidebarProps> = ({
  config,
  onChangeConfig,
  onResetConfig,
  samples,
  activeSampleId,
  onSelectSample,
  onFileUpload,
  pointCount,
  wavenumberSpan
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
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
    <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-3.5">
      {/* 1. Spectrum Import & Preset Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Spectrum Data</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {pointCount} pts ({wavenumberSpan[0]}–{wavenumberSpan[1]} cm⁻¹)
          </span>
        </div>

        {/* Drag and Drop CSV/TXT Upload Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-teal-200 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50/80 transition rounded-lg p-3 text-center cursor-pointer mb-3"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.dat,.tsv"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="w-4 h-4 text-teal-600 mx-auto mb-1" />
          <p className="text-xs font-medium text-slate-700">
            Import <span className="text-teal-700 font-semibold">CSV</span> or{' '}
            <span className="text-teal-700 font-semibold">TXT</span> Spectrum
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            2-column Wavenumber (cm⁻¹) & Intensity
          </p>
        </div>

        {/* Built-in Reference Sample Presets */}
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-500 block">
            Sample Presets
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {samples.map((s) => {
              const active = s.id === activeSampleId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSelectSample(s)}
                  className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition ${
                    active
                      ? 'bg-teal-600 border-teal-600 text-white shadow-sm'
                      : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:border-teal-300 hover:bg-teal-50/30'
                  }`}
                >
                  <div className="font-semibold truncate">{s.name.split(' ')[0]} {s.name.split(' ')[1]}</div>
                  <div
                    className={`text-[10px] truncate ${
                      active ? 'text-teal-100' : 'text-slate-400'
                    }`}
                  >
                    {s.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Baseline Correction & Preprocessing */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
            <Sliders className="w-4 h-4" />
            <span>Signal Processing</span>
          </div>
          <button
            type="button"
            onClick={onResetConfig}
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-teal-700 transition"
            title="Reset processing parameters"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        {/* Baseline Correction */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700">Baseline Correction</label>
            {config.baselineMethod === 'polynomial' && (
              <span className="text-[11px] font-mono text-teal-700">
                Order {config.polyDegree}
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium">
            {(
              [
                ['none', 'Off'],
                ['linear', 'Linear'],
                ['polynomial', 'Poly'],
                ['rollingball', 'Rolling']
              ] as [BaselineMethod, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeConfig({ baselineMethod: val })}
                className={`py-1 rounded-md transition ${
                  config.baselineMethod === val
                    ? 'bg-white text-teal-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {config.baselineMethod === 'polynomial' && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] text-slate-500 w-16">Degree</span>
              <input
                type="range"
                min={1}
                max={6}
                step={1}
                value={config.polyDegree}
                onChange={(e) => onChangeConfig({ polyDegree: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {config.baselineMethod === 'rollingball' && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] text-slate-500 w-16">Radius ({config.rollingRadius})</span>
              <input
                type="range"
                min={15}
                max={120}
                step={5}
                value={config.rollingRadius}
                onChange={(e) => onChangeConfig({ rollingRadius: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Smoothing */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700">Smoothing Filter</label>
            {config.smoothMethod !== 'none' && (
              <span className="text-[11px] font-mono text-teal-700">
                {config.smoothWindow} pts
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-medium">
            {(
              [
                ['none', 'None'],
                ['savgol', 'Savitzky–Golay'],
                ['moving', 'Moving Avg']
              ] as [SmoothMethod, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeConfig({ smoothMethod: val })}
                className={`py-1 rounded-md transition ${
                  config.smoothMethod === val
                    ? 'bg-white text-teal-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {config.smoothMethod !== 'none' && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] text-slate-500 w-16">Window</span>
              <input
                type="range"
                min={5}
                max={25}
                step={2}
                value={config.smoothWindow}
                onChange={(e) => onChangeConfig({ smoothWindow: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Normalization */}
        <div className="pt-2 border-t border-slate-100">
          <label className="text-xs font-medium text-slate-700 block mb-1">
            Intensity Normalization
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
                    ? 'bg-white text-teal-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Peak Detection & Profile Fitting */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-700">
          <Activity className="w-4 h-4" />
          <span>Peak Detection & Fitting</span>
        </div>

        {/* Profile Fit Shape: Gaussian vs Lorentzian */}
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">
            Deconvolution Profile
          </label>
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
                className={`py-1.5 rounded-md transition flex items-center justify-center gap-1.5 ${
                  config.fitShape === val
                    ? 'bg-teal-600 text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Prominence Sensitivity */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 font-medium">Prominence Threshold</span>
            <span className="font-mono text-teal-700 font-semibold">
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

        {/* Minimum Peak Separation */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600 font-medium">Min Peak Distance</span>
            <span className="font-mono text-teal-700 font-semibold">
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
