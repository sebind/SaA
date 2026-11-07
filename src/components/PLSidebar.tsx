import React, { useRef, useState } from 'react';
import {
  PLBaselineMethod,
  PLConfig,
  PLFitShape,
  PLNormMethod,
  PLSampleDataset,
  PLSmoothMethod,
  PLXAxisMode
} from '../types/pl';
import {
  Upload,
  Sliders,
  Sparkles,
  RotateCcw,
  FileSpreadsheet,
  Plus,
  X,
  Zap,
  ArrowLeftRight
} from 'lucide-react';

interface PLSidebarProps {
  config: PLConfig;
  onChangeConfig: (partial: Partial<PLConfig>) => void;
  onResetConfig: () => void;
  samples: PLSampleDataset[];
  activeSampleId: string;
  onSelectSample: (sample: PLSampleDataset) => void;
  onFileUpload: (file: File) => void;
  wavelengthBoundsNm: [number, number];
}

export const PLSidebar: React.FC<PLSidebarProps> = ({
  config,
  onChangeConfig,
  onResetConfig,
  samples,
  activeSampleId,
  onSelectSample,
  onFileUpload,
  wavelengthBoundsNm
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [seedInputVal, setSeedInputVal] = useState<string>('');

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

  const handleAddCustomSeed = () => {
    const raw = parseFloat(seedInputVal);
    if (!Number.isFinite(raw) || raw <= 0) return;
    // Allow user to enter either wavelength (nm > 100) or photon energy (eV <= 12)
    const nmVal = raw <= 12 ? 1239.84193 / raw : raw;
    const clamped = Math.max(
      wavelengthBoundsNm[0],
      Math.min(wavelengthBoundsNm[1], nmVal)
    );
    const newSeed = {
      id: `pl-seed-${Date.now()}`,
      centerNm: Number(clamped.toFixed(1)),
      fwhmNm: 18.0
    };
    onChangeConfig({
      customPeakSeeds: [...config.customPeakSeeds, newSeed]
    });
    setSeedInputVal('');
  };

  const handleRemoveSeed = (id: string) => {
    onChangeConfig({
      customPeakSeeds: config.customPeakSeeds.filter((s) => s.id !== id)
    });
  };

  return (
    <aside className="w-full lg:w-72 shrink-0 grid grid-cols-1 md:grid-cols-3 lg:flex lg:flex-col gap-3">
      {/* 1. PL Spectrum Import & Semiconductor/Emitter Presets */}
      <div className="bg-white rounded-xl border border-sage-200 p-3.5 shadow-sm space-y-2.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-maroon-800 truncate">
            <FileSpreadsheet className="w-3.5 h-3.5 text-sage-600 shrink-0" />
            <span className="truncate">PL Spectrum</span>
          </div>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sage-50 text-sage-800 border border-sage-200 font-mono shrink-0">
            λ_exc = {config.laserWavelengthNm} nm
          </span>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-sage-300 hover:border-maroon-700 bg-sage-50/50 hover:bg-maroon-50/40 transition rounded-lg p-2.5 text-center cursor-pointer"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.dat,.tsv"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="w-4 h-4 text-maroon-700 mx-auto mb-0.5" />
          <p className="text-xs font-medium text-maroon-900 truncate">
            Import <span className="text-maroon-700 font-semibold">CSV / TXT</span> PL Spectrum
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
            Wavelength (nm) or Energy (eV) vs. PL Counts
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
                title={`${s.name} — ${s.subtitle}`}
                className={`text-left px-2 py-1.5 rounded-lg border text-xs transition truncate font-medium ${
                  active
                    ? 'bg-gradient-to-r from-maroon-800 via-maroon-700 to-sage-600 border-maroon-800 text-white shadow-sm'
                    : 'bg-sage-50/50 border-sage-200 text-maroon-900 hover:border-maroon-400 hover:bg-maroon-50/30'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate font-bold">
                    {s.materialFormula}
                  </span>
                  <span
                    className={`text-[9px] px-1 rounded font-mono shrink-0 ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-sage-700 border border-sage-200'
                    }`}
                  >
                    {s.laserWavelengthNm}nm
                  </span>
                </div>
                <div
                  className={`text-[10px] truncate mt-0.5 ${
                    active ? 'text-sage-100' : 'text-slate-500'
                  }`}
                >
                  {s.name.split('(')[0].trim()}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Excitation, X-Axis Domain & Baseline Processing */}
      <div className="bg-white rounded-xl border border-sage-200 p-3.5 shadow-sm space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-maroon-800 truncate">
            <Sliders className="w-3.5 h-3.5 text-sage-600 shrink-0" />
            <span className="truncate">Axis & Excitation</span>
          </div>
          <button
            type="button"
            onClick={onResetConfig}
            title="Reset PL parameters"
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-maroon-700 transition shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Spectral X-Axis Domain: Wavelength (nm) vs Photon Energy (eV) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
              <ArrowLeftRight className="w-3 h-3 text-maroon-700" />
              <span>Spectral X-Axis</span>
            </label>
            <span className="text-[10px] font-mono font-semibold text-sage-700 uppercase">
              {config.xAxisMode === 'wavelength' ? 'λ (nm)' : 'hν (eV)'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 bg-sage-50 p-0.5 rounded-lg text-[11px] font-medium border border-sage-200/70">
            {(
              [
                ['wavelength', 'Wavelength (nm)'],
                ['energy', 'Energy (eV)']
              ] as [PLXAxisMode, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeConfig({ xAxisMode: val })}
                className={`py-1 px-1 rounded-md transition truncate ${
                  config.xAxisMode === val
                    ? 'bg-maroon-800 text-white shadow-sm font-semibold'
                    : 'text-maroon-900 hover:text-maroon-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {config.xAxisMode === 'energy' && (
            <label className="flex items-center justify-between gap-2 pt-1.5 cursor-pointer select-none">
              <span className="text-[11px] text-slate-600 font-medium">
                Jacobian I(E) ∝ I(λ)·λ² transform
              </span>
              <input
                type="checkbox"
                checked={config.applyJacobianInEnergy}
                onChange={(e) =>
                  onChangeConfig({ applyJacobianInEnergy: e.target.checked })
                }
                className="rounded border-sage-300 text-maroon-700 focus:ring-maroon-700 accent-[#800020] w-3.5 h-3.5"
              />
            </label>
          )}
        </div>

        {/* Excitation Laser Presets & Reference Bandgap (Eg) */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                <Zap className="w-3 h-3 text-maroon-700" />
                <span>Excitation Laser (λ_exc)</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-maroon-800">
                {config.laserWavelengthNm} nm (
                {(1239.84 / config.laserWavelengthNm).toFixed(2)} eV)
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1 bg-sage-50 p-0.5 rounded-lg text-[10px] font-mono font-semibold">
              {[325, 405, 488, 532, 633].map((laserNm) => (
                <button
                  key={laserNm}
                  type="button"
                  onClick={() => onChangeConfig({ laserWavelengthNm: laserNm })}
                  className={`py-1 rounded transition ${
                    config.laserWavelengthNm === laserNm
                      ? 'bg-sage-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-maroon-800'
                  }`}
                >
                  {laserNm}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-600">Temperature (T)</span>
            <div className="grid grid-cols-3 gap-1 bg-sage-50 p-0.5 rounded-lg text-[10px] font-mono font-semibold w-36">
              {[4, 77, 300].map((tempK) => (
                <button
                  key={tempK}
                  type="button"
                  onClick={() => onChangeConfig({ temperatureK: tempK })}
                  className={`py-0.5 rounded transition ${
                    config.temperatureK === tempK
                      ? 'bg-maroon-800 text-white shadow-sm'
                      : 'text-slate-600 hover:text-maroon-800'
                  }`}
                >
                  {tempK} K
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600">Ref. Bandgap (E_g)</span>
              <span className="font-mono text-maroon-800 font-semibold">
                {config.referenceBandgapEv.toFixed(2)} eV (
                {(1239.84 / config.referenceBandgapEv).toFixed(0)} nm)
              </span>
            </div>
            <input
              type="range"
              min={1.1}
              max={4.0}
              step={0.01}
              value={config.referenceBandgapEv}
              onChange={(e) =>
                onChangeConfig({ referenceBandgapEv: Number(e.target.value) })
              }
              className="w-full h-1.5 bg-sage-100 rounded-lg cursor-pointer range-maroon"
            />
          </div>
        </div>

        {/* Baseline Subtraction Method */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-700">
              Dark / Baseline Subtraction
            </label>
            <span className="text-[10px] font-mono font-semibold text-sage-700 uppercase">
              {config.baselineMethod}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1 bg-sage-50 p-0.5 rounded-lg text-[11px] font-medium">
            {(
              [
                ['dark-offset', 'Dark'],
                ['linear', 'Linear'],
                ['polynomial', 'Poly'],
                ['none', 'Off']
              ] as [PLBaselineMethod, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeConfig({ baselineMethod: val })}
                className={`py-1 rounded-md transition ${
                  config.baselineMethod === val
                    ? 'bg-maroon-800 text-white shadow-sm font-semibold'
                    : 'text-maroon-900 hover:text-sage-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Smoothing & Intensity Normalization */}
          <div className="flex items-center justify-between pt-1">
            <label className="text-xs font-medium text-slate-700">Smoothing</label>
            {config.smoothMethod !== 'none' && (
              <span className="text-[11px] font-mono text-sage-700 font-semibold">
                {config.smoothWindow} pts
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1 bg-sage-50 p-0.5 rounded-lg text-[11px] font-medium">
            {(
              [
                ['none', 'Off'],
                ['savgol', 'SavGol'],
                ['moving', 'Moving']
              ] as [PLSmoothMethod, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeConfig({ smoothMethod: val })}
                className={`py-1 rounded-md transition ${
                  config.smoothMethod === val
                    ? 'bg-white text-maroon-800 shadow-sm font-semibold'
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
              min={3}
              max={15}
              step={2}
              value={config.smoothWindow}
              onChange={(e) =>
                onChangeConfig({ smoothWindow: Number(e.target.value) })
              }
              className="w-full h-1.5 bg-sage-100 rounded-lg cursor-pointer range-sage"
            />
          )}

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Intensity Scale
            </label>
            <div className="grid grid-cols-4 gap-1 bg-sage-50 p-0.5 rounded-lg text-[11px] font-medium">
              {(
                [
                  ['none', 'Counts'],
                  ['minmax', '0–1'],
                  ['max', 'Max'],
                  ['area', 'Area']
                ] as [PLNormMethod, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onChangeConfig({ normMethod: val })}
                  className={`py-1 rounded-md transition ${
                    config.normMethod === val
                      ? 'bg-white text-maroon-800 shadow-sm font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Multi-Peak Emission Deconvolution (NBE vs Defect States) */}
      <div className="bg-white rounded-xl border border-sage-200 p-3.5 shadow-sm space-y-2.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-maroon-800 truncate">
            <Sparkles className="w-3.5 h-3.5 text-sage-600 shrink-0" />
            <span className="truncate">Deconvolution</span>
          </div>
          <button
            type="button"
            onClick={() => onChangeConfig({ autoFit: !config.autoFit })}
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition inline-flex items-center gap-1 shrink-0 ${
              config.autoFit
                ? 'bg-sage-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Sparkles className="w-2.5 h-2.5 shrink-0" />
            <span>{config.autoFit ? 'Auto ON' : 'Manual'}</span>
          </button>
        </div>

        {/* Emission Line Shape */}
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">
            Emission Line Shape
          </label>
          <div className="grid grid-cols-3 gap-1 bg-sage-50 p-1 rounded-lg text-[11px] font-medium">
            {(
              [
                ['pseudo-voigt', `Voigt(${config.voigtMixRatio})`],
                ['gaussian', 'Gauss'],
                ['lorentzian', 'Lorentz']
              ] as [PLFitShape, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeConfig({ fitShape: val })}
                className={`py-1.5 rounded-md transition flex items-center justify-center gap-1 ${
                  config.fitShape === val
                    ? 'bg-gradient-to-r from-maroon-800 to-sage-600 text-white shadow-sm font-semibold'
                    : 'text-maroon-900 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {config.fitShape === 'pseudo-voigt' && (
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600">Lorentzian Mix</span>
              <span className="font-mono text-sage-700 font-semibold">
                {config.voigtMixRatio}% L / {100 - config.voigtMixRatio}% G
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={config.voigtMixRatio}
              onChange={(e) =>
                onChangeConfig({ voigtMixRatio: Number(e.target.value) })
              }
              className="w-full h-1.5 bg-sage-100 rounded-lg cursor-pointer range-maroon"
            />
          </div>
        )}

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600">Peak Prominence</span>
            <span className="font-mono text-maroon-800 font-semibold">
              {Math.round(config.prominence * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.03}
            max={0.4}
            step={0.01}
            value={config.prominence}
            onChange={(e) =>
              onChangeConfig({ prominence: Number(e.target.value) })
            }
            className="w-full h-1.5 bg-sage-100 rounded-lg cursor-pointer range-maroon"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600">Min Peak Separation</span>
            <span className="font-mono text-maroon-800 font-semibold">
              {config.minDistanceNm.toFixed(0)} nm
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={40}
            step={1}
            value={config.minDistanceNm}
            onChange={(e) =>
              onChangeConfig({ minDistanceNm: Number(e.target.value) })
            }
            className="w-full h-1.5 bg-sage-100 rounded-lg cursor-pointer range-sage"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600">Max Sub-Bands</span>
            <span className="font-mono text-sage-700 font-semibold">
              {config.maxComponents} bands
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={7}
            step={1}
            value={config.maxComponents}
            onChange={(e) =>
              onChangeConfig({ maxComponents: Number(e.target.value) })
            }
            className="w-full h-1.5 bg-sage-100 rounded-lg cursor-pointer range-maroon"
          />
        </div>

        {/* Trion / Phonon Shoulder Detection */}
        <label className="flex items-center justify-between gap-2 pt-1 cursor-pointer select-none">
          <span className="text-xs text-slate-700 font-medium">
            Resolve trion & vibronic shoulders
          </span>
          <input
            type="checkbox"
            checked={config.enableShoulderDetection}
            onChange={(e) =>
              onChangeConfig({ enableShoulderDetection: e.target.checked })
            }
            className="rounded border-sage-300 text-maroon-700 focus:ring-maroon-700 accent-[#800020] w-3.5 h-3.5"
          />
        </label>

        {/* Custom Sub-Band Seed Input */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <label className="text-[11px] font-semibold text-maroon-800 block">
            Add Custom Emission Peak (nm or eV)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="0.5"
              placeholder={`${Math.round((wavelengthBoundsNm[0] + wavelengthBoundsNm[1]) / 2)} nm`}
              value={seedInputVal}
              onChange={(e) => setSeedInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCustomSeed();
              }}
              className="w-full px-2 py-1 rounded-lg border border-sage-200 focus:border-maroon-700 focus:outline-none text-xs font-mono"
            />
            <button
              type="button"
              onClick={handleAddCustomSeed}
              className="px-2.5 py-1 rounded-lg bg-maroon-800 hover:bg-sage-600 text-white text-xs font-semibold inline-flex items-center gap-1 transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {config.customPeakSeeds.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {config.customPeakSeeds.map((seed) => (
                <span
                  key={seed.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sage-50 border border-sage-200 text-[10px] font-mono font-semibold text-maroon-800"
                >
                  {seed.centerNm.toFixed(1)} nm
                  <button
                    type="button"
                    onClick={() => handleRemoveSeed(seed.id)}
                    className="hover:text-maroon-950"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
