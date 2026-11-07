import React, { useRef } from 'react';
import {
  InputSignalType,
  MeasurementMode,
  ThicknessUnit,
  TransitionType,
  UVVisConfig,
  UVVisSampleDataset
} from '../types/uvvis';
import {
  Upload,
  Sliders,
  Sparkles,
  RotateCcw,
  FileSpreadsheet,
  Layers,
  Ruler,
  Zap
} from 'lucide-react';

interface UVVisSidebarProps {
  config: UVVisConfig;
  onChangeConfig: (partial: Partial<UVVisConfig>) => void;
  onResetConfig: () => void;
  samples: UVVisSampleDataset[];
  activeSampleId: string;
  onSelectSample: (sample: UVVisSampleDataset) => void;
  onFileUpload: (file: File) => void;
  energyBoundsEv: [number, number];
  detectedFitRangeEv: [number, number];
}

export const UVVisSidebar: React.FC<UVVisSidebarProps> = ({
  config,
  onChangeConfig,
  onResetConfig,
  samples,
  activeSampleId,
  onSelectSample,
  onFileUpload,
  energyBoundsEv,
  detectedFitRangeEv
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

  const [eMinBound, eMaxBound] = energyBoundsEv;
  const activeManualMin = config.manualEnergyRange?.[0] ?? detectedFitRangeEv[0];
  const activeManualMax = config.manualEnergyRange?.[1] ?? detectedFitRangeEv[1];

  return (
    <aside className="w-full lg:w-72 shrink-0 grid grid-cols-1 md:grid-cols-3 lg:flex lg:flex-col gap-3">
      {/* 1. Spectrum Import & Presets */}
      <div className="bg-white rounded-xl border border-powder-200 p-3.5 shadow-sm space-y-2.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-powder-800 truncate">
            <FileSpreadsheet className="w-3.5 h-3.5 text-racing-500 shrink-0" />
            <span className="truncate">UV-Vis-NIR</span>
          </div>
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-powder-100 text-powder-800 shrink-0">
            {config.measurementMode === 'drs' ? 'DRS Mode' : 'Thin Film'}
          </span>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-powder-300 hover:border-racing-500 bg-powder-50/70 hover:bg-powder-100/70 transition rounded-lg p-2.5 text-center cursor-pointer"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt,.dat,.tsv"
            onChange={handleFileChange}
            className="hidden"
          />
          <Upload className="w-4 h-4 text-racing-500 mx-auto mb-0.5" />
          <p className="text-xs font-medium text-slate-700 truncate">
            Import <span className="text-racing-600 font-semibold">CSV / TXT</span> Spectrum
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
            Wavelength (nm) vs. Abs, %T, or %R
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {samples.map((s) => {
            const active = s.id === activeSampleId;
            const shortLabel = s.name.split('(')[0].trim();
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSample(s)}
                title={`${s.name} — ${s.subtitle}`}
                className={`text-left px-2 py-1.5 rounded-lg border text-xs transition truncate font-medium ${
                  active
                    ? 'bg-gradient-to-r from-racing-500 to-racing-600 border-racing-600 text-white shadow-sm'
                    : 'bg-powder-50/60 border-powder-200 text-slate-700 hover:border-racing-300 hover:bg-powder-100/60'
                }`}
              >
                <div className="truncate font-semibold">{shortLabel}</div>
                <div
                  className={`text-[10px] truncate ${
                    active ? 'text-orange-100' : 'text-powder-700'
                  }`}
                >
                  {s.measurementMode === 'drs' ? 'DRS (K-M)' : `${s.defaultThicknessNm} nm Film`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Measurement Mode & Sample Thickness */}
      <div className="bg-white rounded-xl border border-powder-200 p-3.5 shadow-sm space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-powder-800 truncate">
            <Layers className="w-3.5 h-3.5 text-racing-500 shrink-0" />
            <span className="truncate">Sample & Mode</span>
          </div>
          <button
            type="button"
            onClick={onResetConfig}
            title="Reset parameters"
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-racing-600 transition shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Thin Film vs DRS (Kubelka-Munk) Toggle */}
        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">
            Measurement Geometry
          </label>
          <div className="grid grid-cols-2 gap-1 bg-powder-100/80 p-1 rounded-lg text-xs font-medium">
            {(
              [
                ['thin-film', 'Thin Film (α)'],
                ['drs', 'DRS (K-M)']
              ] as [MeasurementMode, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() =>
                  onChangeConfig({
                    measurementMode: val,
                    inputSignalType: val === 'drs' ? 'reflectance' : 'absorbance'
                  })
                }
                className={`py-1.5 px-1.5 rounded-md transition text-[11px] truncate ${
                  config.measurementMode === val
                    ? 'bg-gradient-to-r from-racing-500 to-racing-600 text-white shadow-sm font-semibold'
                    : 'text-powder-900 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Film Thickness Input (Shown for Thin Film mode) */}
        {config.measurementMode === 'thin-film' ? (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700 inline-flex items-center gap-1">
                <Ruler className="w-3.5 h-3.5 text-powder-600" />
                <span>Film Thickness (t)</span>
              </label>
              <span className="text-[11px] font-mono font-semibold text-racing-600">
                {config.thicknessValue} {config.thicknessUnit === 'um' ? 'µm' : config.thicknessUnit}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0.1}
                step="any"
                value={config.thicknessValue}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (Number.isFinite(v) && v > 0) {
                    onChangeConfig({ thicknessValue: v });
                  }
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-powder-300 focus:border-racing-500 focus:outline-none text-xs font-mono font-semibold text-slate-800 bg-white"
                placeholder="Thickness"
              />
              <select
                value={config.thicknessUnit}
                onChange={(e) =>
                  onChangeConfig({ thicknessUnit: e.target.value as ThicknessUnit })
                }
                className="px-2 py-1.5 rounded-lg border border-powder-300 bg-powder-50 text-xs font-semibold text-powder-900 focus:border-racing-500 focus:outline-none"
              >
                <option value="nm">nm</option>
                <option value="um">µm</option>
                <option value="mm">mm</option>
              </select>
            </div>

            <input
              type="range"
              min={config.thicknessUnit === 'nm' ? 20 : 0.1}
              max={config.thicknessUnit === 'nm' ? 2000 : 50}
              step={config.thicknessUnit === 'nm' ? 10 : 0.1}
              value={Math.min(
                config.thicknessUnit === 'nm' ? 2000 : 50,
                config.thicknessValue
              )}
              onChange={(e) =>
                onChangeConfig({ thicknessValue: Number(e.target.value) })
              }
              className="w-full h-1.5 bg-powder-200 rounded-lg cursor-pointer range-racing-orange"
            />
            <p className="text-[10px] text-slate-500 leading-tight">
              Calculates <span className="font-mono font-semibold text-slate-700">α = 2.303·A / t</span> in cm⁻¹ from film thickness.
            </p>
          </div>
        ) : (
          <div className="pt-2 border-t border-slate-100">
            <div className="rounded-lg bg-powder-50 border border-powder-200 p-2.5 text-[11px] text-powder-900 space-y-1">
              <div className="font-semibold text-powder-800 flex items-center justify-between">
                <span>Kubelka-Munk Remission</span>
                <span className="font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-powder-200 text-racing-600 font-bold">
                  F(R∞) = (1−R∞)² / 2R∞
                </span>
              </div>
              <p className="text-[10px] text-slate-600 leading-relaxed">
                Transforms diffuse reflectance (%R or R∞) into the Kubelka-Munk function proportional to absorption coefficient α.
              </p>
            </div>
          </div>
        )}

        {/* Input Signal Type */}
        <div className="pt-2 border-t border-slate-100">
          <label className="text-xs font-medium text-slate-700 block mb-1">
            Input Y-Column Signal
          </label>
          <div className="grid grid-cols-4 gap-1 bg-powder-100/70 p-0.5 rounded-lg text-[11px] font-medium">
            {(
              [
                ['auto', 'Auto'],
                ['absorbance', 'Abs'],
                ['transmittance', '%T'],
                ['reflectance', '%R']
              ] as [InputSignalType, string][]
            ).map(([val, label]) => (
              <button
                key={val}
                type="button"
                onClick={() => onChangeConfig({ inputSignalType: val })}
                className={`py-1 px-1 rounded-md transition truncate ${
                  config.inputSignalType === val
                    ? 'bg-white text-racing-600 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Smoothing */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-slate-700 inline-flex items-center gap-1">
              <Sliders className="w-3 h-3 text-powder-600" />
              <span>SavGol Smoothing</span>
            </label>
            <span className="text-[11px] font-mono text-racing-600 font-semibold">
              {config.smoothWindow <= 1 ? 'Off' : `${config.smoothWindow} pts`}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={21}
            step={2}
            value={config.smoothWindow}
            onChange={(e) =>
              onChangeConfig({ smoothWindow: Number(e.target.value) })
            }
            className="w-full h-1.5 bg-powder-200 rounded-lg cursor-pointer range-racing-orange"
          />
        </div>
      </div>

      {/* 3. Tauc Plot & Band Gap Extrapolation */}
      <div className="bg-white rounded-xl border border-powder-200 p-3.5 shadow-sm space-y-2.5 min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-powder-800">
          <Zap className="w-3.5 h-3.5 text-racing-500 shrink-0" />
          <span className="truncate">Tauc Extrapolation</span>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-700 block mb-1">
            Electronic Transition Exponent
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                ['direct-allowed', 'Direct (n=½)', '(αhν)²'],
                ['indirect-allowed', 'Indirect (n=2)', '(αhν)¹ᐟ²'],
                ['direct-forbidden', 'Dir. Forb. (3/2)', '(αhν)²ᐟ³'],
                ['indirect-forbidden', 'Ind. Forb. (3)', '(αhν)¹ᐟ³']
              ] as [TransitionType, string, string][]
            ).map(([val, title, formula]) => {
              const active = config.transitionType === val;
              const displayFormula =
                config.measurementMode === 'drs'
                  ? formula.replace('α', 'F(R∞)·')
                  : formula;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => onChangeConfig({ transitionType: val })}
                  className={`p-1.5 rounded-lg border text-left transition min-w-0 ${
                    active
                      ? 'bg-gradient-to-r from-racing-500 to-racing-600 border-racing-600 text-white shadow-sm'
                      : 'bg-powder-50/50 border-powder-200 text-slate-700 hover:border-racing-300'
                  }`}
                >
                  <div className="text-[11px] font-semibold leading-tight truncate">{title}</div>
                  <div
                    className={`text-[10px] font-mono mt-0.5 truncate ${
                      active ? 'text-orange-100' : 'text-powder-700'
                    }`}
                  >
                    {displayFormula}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Auto vs Manual Linear Region Extrapolation */}
        <div className="pt-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-700">Linear Fit Region</span>
            <div className="inline-flex rounded-lg p-0.5 bg-powder-100 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => onChangeConfig({ autoFit: true })}
                className={`px-2 py-0.5 rounded-md transition flex items-center gap-1 ${
                  config.autoFit
                    ? 'bg-racing-500 text-white shadow-sm font-semibold'
                    : 'text-powder-900 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-2.5 h-2.5" />
                Auto
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangeConfig({
                    autoFit: false,
                    manualEnergyRange: [detectedFitRangeEv[0], detectedFitRangeEv[1]]
                  })
                }
                className={`px-2 py-0.5 rounded-md transition ${
                  !config.autoFit
                    ? 'bg-racing-500 text-white shadow-sm font-semibold'
                    : 'text-powder-900 hover:text-slate-900'
                }`}
              >
                Manual
              </button>
            </div>
          </div>

          {!config.autoFit && (
            <div className="p-2 rounded-lg bg-powder-50 border border-powder-200 space-y-2">
              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-600">Fit Start (E₁)</span>
                  <span className="font-mono font-semibold text-racing-600">
                    {activeManualMin.toFixed(2)} eV
                  </span>
                </div>
                <input
                  type="range"
                  min={Number(eMinBound.toFixed(2))}
                  max={Number((eMaxBound - 0.1).toFixed(2))}
                  step={0.02}
                  value={activeManualMin}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    onChangeConfig({
                      manualEnergyRange: [
                        Math.min(v, activeManualMax - 0.06),
                        activeManualMax
                      ]
                    });
                  }}
                  className="w-full h-1.5 bg-powder-200 rounded-lg cursor-pointer range-racing-orange"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-600">Fit End (E₂)</span>
                  <span className="font-mono font-semibold text-racing-600">
                    {activeManualMax.toFixed(2)} eV
                  </span>
                </div>
                <input
                  type="range"
                  min={Number((eMinBound + 0.1).toFixed(2))}
                  max={Number(eMaxBound.toFixed(2))}
                  step={0.02}
                  value={activeManualMax}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    onChangeConfig({
                      manualEnergyRange: [
                        activeManualMin,
                        Math.max(v, activeManualMin + 0.06)
                      ]
                    });
                  }}
                  className="w-full h-1.5 bg-powder-200 rounded-lg cursor-pointer range-racing-orange"
                />
              </div>
            </div>
          )}

          {/* Baseline Offset Checkbox */}
          <label className="flex items-center justify-between gap-2 pt-1 cursor-pointer select-none">
            <span className="text-xs text-slate-600">
              Sub-bandgap baseline intersection
            </span>
            <input
              type="checkbox"
              checked={config.useBaselineOffset}
              onChange={(e) =>
                onChangeConfig({ useBaselineOffset: e.target.checked })
              }
              className="rounded border-powder-300 text-racing-500 focus:ring-racing-500 accent-[#ff4f00] w-3.5 h-3.5"
            />
          </label>
        </div>
      </div>
    </aside>
  );
};
