import React, { useRef, useState } from 'react';
import {
  XPSBackgroundMethod,
  XPSConfig,
  XPSFitShape,
  XPSNormMethod,
  XPSSampleDataset,
  XPSSmoothMethod,
  XraySourceType
} from '../types/xps';
import {
  Upload,
  Sliders,
  Sparkles,
  Atom,
  RotateCcw,
  FileSpreadsheet,
  Plus,
  X,
  ArrowLeftRight,
  Zap
} from 'lucide-react';

interface XPSSidebarProps {
  config: XPSConfig;
  onChangeConfig: (partial: Partial<XPSConfig>) => void;
  onResetConfig: () => void;
  samples: XPSSampleDataset[];
  activeSampleId: string;
  onSelectSample: (sample: XPSSampleDataset) => void;
  onFileUpload: (file: File) => void;
  beBoundsEv: [number, number];
  dominantPeakBeEv: number | null;
}

export const XPSSidebar: React.FC<XPSSidebarProps> = ({
  config,
  onChangeConfig,
  onResetConfig,
  samples,
  activeSampleId,
  onSelectSample,
  onFileUpload,
  beBoundsEv,
  dominantPeakBeEv
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [seedInputBe, setSeedInputBe] = useState<string>('');

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
    const val = parseFloat(seedInputBe);
    if (!Number.isFinite(val)) return;
    const clamped = Math.max(beBoundsEv[0], Math.min(beBoundsEv[1], val));
    const newSeed = {
      id: `seed-${Date.now()}`,
      centerEv: Number(clamped.toFixed(2)),
      fwhmEv: 1.25
    };
    onChangeConfig({
      customPeakSeeds: [...config.customPeakSeeds, newSeed]
    });
    setSeedInputBe('');
  };

  const handleRemoveSeed = (id: string) => {
    onChangeConfig({
      customPeakSeeds: config.customPeakSeeds.filter((s) => s.id !== id)
    });
  };

  const handleCalibrateToC1s = () => {
    if (dominantPeakBeEv === null) return;
    // Shift so that current dominant peak lands at 284.80 eV (or nearest reference)
    const rawDom = dominantPeakBeEv - config.chargeShiftEv;
    const targetShift = Number((284.8 - rawDom).toFixed(2));
    if (Math.abs(targetShift) <= 15) {
      onChangeConfig({ chargeShiftEv: targetShift });
    }
  };

  return (
    <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-3">
      {/* 1. XPS Spectrum Import & Core-Level Presets */}
      <div className="bg-white rounded-xl border border-deepblue-200 p-3.5 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-deepblue-800">
            <FileSpreadsheet className="w-3.5 h-3.5 text-bubblegum-500" />
            <span>XPS Core-Level</span>
          </div>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-bubblegum-50 text-bubblegum-700 border border-bubblegum-200">
            {config.xraySource === 'Al-Ka' ? 'Al Kα 1486.6 eV' : 'Mg Kα 1253.6 eV'}
          </span>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-bubblegum-300 hover:border-bubblegum-500 bg-bubblegum-50/40 hover:bg-bubblegum-50/80 transition rounded-lg p-2.5 text-center cursor-pointer"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.dat,.tsv"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="w-4 h-4 text-bubblegum-500 mx-auto mb-0.5" />
          <p className="text-xs font-medium text-deepblue-900">
            Import <span className="text-bubblegum-600 font-semibold">CSV / TXT</span> Spectrum
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Binding Energy (eV) vs. CPS / Counts
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
                className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition truncate font-medium ${
                  active
                    ? 'bg-gradient-to-r from-deepblue-800 via-deepblue-700 to-bubblegum-600 border-deepblue-800 text-white shadow-sm'
                    : 'bg-deepblue-50/50 border-deepblue-100 text-deepblue-900 hover:border-bubblegum-300 hover:bg-bubblegum-50/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate font-bold">{s.coreLevel}</span>
                  <span
                    className={`text-[9px] px-1 rounded font-mono ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-bubblegum-600 border border-bubblegum-200'
                    }`}
                  >
                    {s.materialFormula.split('/')[0].trim()}
                  </span>
                </div>
                <div
                  className={`text-[10px] truncate mt-0.5 ${
                    active ? 'text-bubblegum-100' : 'text-slate-500'
                  }`}
                >
                  {s.name.split('(')[0].trim()}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Background Subtraction, Charge Shift & Axis Convention */}
      <div className="bg-white rounded-xl border border-deepblue-200 p-3.5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-deepblue-800">
            <Sliders className="w-3.5 h-3.5 text-bubblegum-500" />
            <span>Background & Energy</span>
          </div>
          <button
            type="button"
            onClick={onResetConfig}
            title="Reset XPS parameters"
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-bubblegum-600 transition"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Inelastic Background Method (Shirley / Tougaard / Linear / Off) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700">
              Inelastic Background
            </label>
            <span className="text-[10px] font-mono font-semibold text-bubblegum-600 uppercase">
              {config.backgroundMethod}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1 bg-deepblue-50 p-0.5 rounded-lg text-[11px] font-medium">
            {(
              [
                ['shirley', 'Shirley'],
                ['tougaard', 'Tougaard'],
                ['linear', 'Linear'],
                ['none', 'Off']
              ] as [XPSBackgroundMethod, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeConfig({ backgroundMethod: val })}
                className={`py-1 rounded-md transition ${
                  config.backgroundMethod === val
                    ? 'bg-deepblue-800 text-white shadow-sm font-semibold'
                    : 'text-deepblue-900 hover:text-bubblegum-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Charge Referencing (ΔBE Shift) */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
              <Zap className="w-3 h-3 text-bubblegum-500" />
              <span>Charge Shift (ΔBE)</span>
            </label>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono font-bold text-deepblue-800">
                {config.chargeShiftEv >= 0
                  ? `+${config.chargeShiftEv.toFixed(2)}`
                  : config.chargeShiftEv.toFixed(2)}{' '}
                eV
              </span>
              {config.chargeShiftEv !== 0 && (
                <button
                  type="button"
                  onClick={() => onChangeConfig({ chargeShiftEv: 0 })}
                  className="text-[10px] px-1 py-0.2 rounded bg-slate-100 hover:bg-bubblegum-100 text-slate-600 hover:text-bubblegum-700"
                >
                  0
                </button>
              )}
            </div>
          </div>

          <input
            type="range"
            min={-3.5}
            max={3.5}
            step={0.05}
            value={config.chargeShiftEv}
            onChange={(e) =>
              onChangeConfig({ chargeShiftEv: Number(e.target.value) })
            }
            className="w-full h-1.5 bg-deepblue-100 rounded-lg cursor-pointer range-bubblegum"
          />

          {dominantPeakBeEv !== null &&
            dominantPeakBeEv >= 280 &&
            dominantPeakBeEv <= 292 && (
              <button
                type="button"
                onClick={handleCalibrateToC1s}
                className="w-full py-1 px-2 rounded-md bg-bubblegum-50 hover:bg-bubblegum-100 border border-bubblegum-200 text-[10px] font-semibold text-bubblegum-700 transition"
              >
                Align Main C 1s Peak → 284.80 eV (Adv. C)
              </button>
            )}
        </div>

        {/* X-Ray Source & Reversed Axis Convention */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-1.5">
          <div>
            <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
              Anode Source
            </label>
            <div className="grid grid-cols-2 gap-0.5 bg-deepblue-50 p-0.5 rounded-lg text-[10px] font-medium">
              {(
                [
                  ['Al-Ka', 'Al Kα'],
                  ['Mg-Ka', 'Mg Kα']
                ] as [XraySourceType, string][]
              ).map(([src, lbl]) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => onChangeConfig({ xraySource: src })}
                  className={`py-1 rounded transition ${
                    config.xraySource === src
                      ? 'bg-white text-deepblue-800 shadow-sm font-bold'
                      : 'text-slate-600'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase text-slate-500 block mb-1">
              BE X-Axis
            </label>
            <button
              type="button"
              onClick={() =>
                onChangeConfig({ reversedAxis: !config.reversedAxis })
              }
              className={`w-full py-1 px-2 rounded-lg border text-[10px] font-semibold inline-flex items-center justify-center gap-1 transition ${
                config.reversedAxis
                  ? 'bg-deepblue-800 border-deepblue-800 text-white'
                  : 'bg-white border-deepblue-200 text-deepblue-800'
              }`}
              title="Toggle between standard XPS decreasing Binding Energy (High -> Low) and ascending BE"
            >
              <ArrowLeftRight className="w-3 h-3 text-bubblegum-300" />
              {config.reversedAxis ? 'High → Low' : 'Low → High'}
            </button>
          </div>
        </div>

        {/* Smoothing & Normalization */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-700">Smoothing</label>
            {config.smoothMethod !== 'none' && (
              <span className="text-[11px] font-mono text-bubblegum-600 font-semibold">
                {config.smoothWindow} pts
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1 bg-deepblue-50 p-0.5 rounded-lg text-[11px] font-medium">
            {(
              [
                ['none', 'Off'],
                ['savgol', 'SavGol'],
                ['moving', 'Moving']
              ] as [XPSSmoothMethod, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeConfig({ smoothMethod: val })}
                className={`py-1 rounded-md transition ${
                  config.smoothMethod === val
                    ? 'bg-white text-deepblue-800 shadow-sm font-semibold'
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
              className="w-full h-1.5 bg-deepblue-100 rounded-lg cursor-pointer range-bubblegum"
            />
          )}

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Intensity Scale
            </label>
            <div className="grid grid-cols-4 gap-1 bg-deepblue-50 p-0.5 rounded-lg text-[11px] font-medium">
              {(
                [
                  ['none', 'CPS'],
                  ['minmax', '0–1'],
                  ['max', 'Max'],
                  ['area', 'Area']
                ] as [XPSNormMethod, string][]
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onChangeConfig({ normMethod: val })}
                  className={`py-1 rounded-md transition ${
                    config.normMethod === val
                      ? 'bg-white text-deepblue-800 shadow-sm font-semibold'
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

      {/* 3. Auto Peak Deconvolution & GL(m) Line Shape */}
      <div className="bg-white rounded-xl border border-deepblue-200 p-3.5 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-deepblue-800">
            <Atom className="w-3.5 h-3.5 text-bubblegum-500" />
            <span>Auto Peak Fitting</span>
          </div>
          <button
            type="button"
            onClick={() => onChangeConfig({ autoFit: !config.autoFit })}
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition inline-flex items-center gap-1 ${
              config.autoFit
                ? 'bg-bubblegum-500 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            {config.autoFit ? 'Auto Fit ON' : 'Manual Only'}
          </button>
        </div>

        {/* Line Shape Selector: Pseudo-Voigt GL(m), Gaussian, Lorentzian */}
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">
            Core-Level Line Shape
          </label>
          <div className="grid grid-cols-3 gap-1 bg-deepblue-50 p-1 rounded-lg text-[11px] font-medium">
            {(
              [
                ['pseudo-voigt', `GL(${config.glMixRatio})`],
                ['gaussian', 'Gauss'],
                ['lorentzian', 'Lorentz']
              ] as [XPSFitShape, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeConfig({ fitShape: val })}
                className={`py-1.5 rounded-md transition flex items-center justify-center gap-1 ${
                  config.fitShape === val
                    ? 'bg-gradient-to-r from-deepblue-800 to-bubblegum-600 text-white shadow-sm font-semibold'
                    : 'text-deepblue-900 hover:text-slate-900'
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
              <span className="text-slate-600">Lorentzian Mix GL(m)</span>
              <span className="font-mono text-bubblegum-600 font-semibold">
                {config.glMixRatio}% L / {100 - config.glMixRatio}% G
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={config.glMixRatio}
              onChange={(e) =>
                onChangeConfig({ glMixRatio: Number(e.target.value) })
              }
              className="w-full h-1.5 bg-deepblue-100 rounded-lg cursor-pointer range-bubblegum"
            />
          </div>
        )}

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600">Peak Prominence</span>
            <span className="font-mono text-deepblue-800 font-semibold">
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
            className="w-full h-1.5 bg-deepblue-100 rounded-lg cursor-pointer range-bubblegum"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600">Min Peak Separation</span>
            <span className="font-mono text-deepblue-800 font-semibold">
              {config.minDistanceEv.toFixed(2)} eV
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.05}
            value={config.minDistanceEv}
            onChange={(e) =>
              onChangeConfig({ minDistanceEv: Number(e.target.value) })
            }
            className="w-full h-1.5 bg-deepblue-100 rounded-lg cursor-pointer range-bubblegum"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-600">Max Sub-Peaks</span>
            <span className="font-mono text-bubblegum-600 font-semibold">
              {config.maxComponents} components
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={8}
            step={1}
            value={config.maxComponents}
            onChange={(e) =>
              onChangeConfig({ maxComponents: Number(e.target.value) })
            }
            className="w-full h-1.5 bg-deepblue-100 rounded-lg cursor-pointer range-bubblegum"
          />
        </div>

        {/* Residual Shoulder Detection Checkbox */}
        <label className="flex items-center justify-between gap-2 pt-1 cursor-pointer select-none">
          <span className="text-xs text-slate-700 font-medium">
            Resolve chemical-state shoulders
          </span>
          <input
            type="checkbox"
            checked={config.enableShoulderDetection}
            onChange={(e) =>
              onChangeConfig({ enableShoulderDetection: e.target.checked })
            }
            className="rounded border-deepblue-300 text-bubblegum-500 focus:ring-bubblegum-500 accent-[#ff2e93] w-3.5 h-3.5"
          />
        </label>

        {/* Manual Sub-Peak Seed Input */}
        <div className="pt-2 border-t border-slate-100 space-y-1.5">
          <label className="text-[11px] font-semibold text-deepblue-800 block">
            Add Custom Sub-Peak Center (eV)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="0.1"
              placeholder={`${((beBoundsEv[0] + beBoundsEv[1]) / 2).toFixed(1)} eV`}
              value={seedInputBe}
              onChange={(e) => setSeedInputBe(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCustomSeed();
              }}
              className="w-full px-2 py-1 rounded-lg border border-deepblue-200 focus:border-bubblegum-500 focus:outline-none text-xs font-mono"
            />
            <button
              type="button"
              onClick={handleAddCustomSeed}
              className="px-2.5 py-1 rounded-lg bg-deepblue-800 hover:bg-bubblegum-600 text-white text-xs font-semibold inline-flex items-center gap-1 transition shrink-0"
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
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bubblegum-50 border border-bubblegum-200 text-[10px] font-mono font-semibold text-bubblegum-700"
                >
                  {seed.centerEv.toFixed(2)} eV
                  <button
                    type="button"
                    onClick={() => handleRemoveSeed(seed.id)}
                    className="hover:text-bubblegum-900"
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
