import React, { useMemo, useState } from 'react';
import { UVVisConfig, UVVisPipelineResult } from '../types/uvvis';
import { SEMICONDUCTOR_BENCHMARKS } from '../data/uvvisReferenceData';
import { getTaucExponentPower } from '../utils/uvvisMath';
import {
  Sparkles,
  Copy,
  Check,
  Compass,
  Award
} from 'lucide-react';

interface UVVisAnalysisPanelProps {
  sampleName: string;
  config: UVVisConfig;
  result: UVVisPipelineResult;
}

function classifyOpticalRegime(egEv: number): {
  regime: string;
  colorClass: string;
} {
  if (egEv >= 3.1) {
    return {
      regime: 'UV Absorber (> 3.1 eV)',
      colorClass: 'bg-powder-100 text-powder-900 border-powder-300'
    };
  }
  if (egEv >= 1.75) {
    return {
      regime: 'Visible-Light Semiconductor',
      colorClass: 'bg-racing-50 text-racing-700 border-racing-200'
    };
  }
  return {
    regime: 'Near-IR Narrow-Bandgap',
    colorClass: 'bg-amber-50 text-amber-800 border-amber-200'
  };
}

export const UVVisAnalysisPanel: React.FC<UVVisAnalysisPanelProps> = ({
  sampleName,
  config,
  result
}) => {
  const [copiedReport, setCopiedReport] = useState(false);

  const isDrs = config.measurementMode === 'drs';
  const { fit, urbachEnergyMeV, peakAbsorbanceLambdaNm, peakPrimaryValue } = result;
  const { nLabel, superscriptLabel } = getTaucExponentPower(config.transitionType);
  const regimeInfo = classifyOpticalRegime(fit.bandGapEg);

  // Rank reference semiconductors by closeness to experimental Eg
  const rankedBenchmarks = useMemo(() => {
    return [...SEMICONDUCTOR_BENCHMARKS]
      .map((b) => ({
        ...b,
        deltaEg: Number((fit.bandGapEg - b.egEv).toFixed(2)),
        absDelta: Math.abs(fit.bandGapEg - b.egEv)
      }))
      .sort((a, b) => a.absDelta - b.absDelta);
  }, [fit.bandGapEg]);

  const closestBenchmark = rankedBenchmarks[0];

  const manuscriptParagraph = useMemo(() => {
    const modePhrase = isDrs
      ? `diffuse reflectance spectroscopy (DRS) transformed via the Kubelka-Munk remission function F(R∞) = (1 − R∞)² / (2R∞)`
      : `UV-Vis-NIR optical absorption spectroscopy using a film thickness of t = ${
          config.thicknessValue
        } ${config.thicknessUnit === 'um' ? 'µm' : config.thicknessUnit} (α = 2.303·A / t)`;

    const taucExpr = isDrs
      ? `[F(R∞)·hν]${superscriptLabel}`
      : `(αhν)${superscriptLabel}`;

    return `The optical properties of ${sampleName} were evaluated by ${modePhrase}. Plotting ${taucExpr} versus photon energy (hν) for a ${nLabel.toLowerCase()} transition and extrapolating the linear absorption edge regime (${fit.fitEnergyMin.toFixed(
      2
    )}–${fit.fitEnergyMax.toFixed(2)} eV, R² = ${fit.rSquared.toFixed(
      4
    )}) to the baseline intercept yields an optical band gap of Eg = ${fit.bandGapEg.toFixed(
      2
    )} eV, corresponding to a fundamental absorption edge onset at λg = ${fit.onsetWavelengthNm.toFixed(
      1
    )} nm.${
      urbachEnergyMeV
        ? ` Sub-bandgap tail analysis indicates an Urbach energy of Eu ≈ ${urbachEnergyMeV} meV.`
        : ''
    }`;
  }, [
    sampleName,
    isDrs,
    config.thicknessValue,
    config.thicknessUnit,
    superscriptLabel,
    nLabel,
    fit,
    urbachEnergyMeV
  ]);

  const handleCopyParagraph = () => {
    navigator.clipboard.writeText(manuscriptParagraph);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 1800);
  };

  return (
    <div className="bg-white rounded-xl border border-powder-200 shadow-sm overflow-hidden">
      {/* Header Bar */}
      <div className="px-3 sm:px-4 py-2.5 border-b border-powder-200 flex flex-wrap items-center justify-between gap-2 bg-powder-50/50">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Sparkles className="w-4 h-4 text-racing-500 shrink-0" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-powder-900">
            <span className="sm:hidden">Band Gap & Tauc Report</span>
            <span className="hidden sm:inline">
              Optical Band Gap & Tauc Extrapolation Report
            </span>
          </h2>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${regimeInfo.colorClass}`}
          >
            {regimeInfo.regime}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopyParagraph}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-powder-300 bg-white hover:bg-racing-50 hover:border-racing-300 text-xs font-medium text-slate-700 hover:text-racing-700 transition shrink-0"
        >
          {copiedReport ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="text-emerald-700 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-racing-500 shrink-0" />
              <span className="sm:hidden">Copy Text</span>
              <span className="hidden sm:inline">Copy Manuscript Text</span>
            </>
          )}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Key Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Band Gap Eg */}
          <div className="rounded-xl border border-racing-200 bg-racing-50/40 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-racing-700">
              Extrapolated Band Gap (Eg)
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-racing-600">
                {fit.bandGapEg.toFixed(2)} eV
              </span>
              <span className="text-xs font-mono font-semibold text-slate-600">
                ({fit.onsetWavelengthNm.toFixed(1)} nm)
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-600">
              {nLabel}
            </div>
          </div>

          {/* 2. Linear Fit Region & R^2 */}
          <div className="rounded-xl border border-powder-200 bg-powder-50/50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-powder-800">
              Tauc Linear Fit Quality
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-powder-900">
                R² = {fit.rSquared.toFixed(4)}
              </span>
            </div>
            <div className="mt-1 text-[11px] font-mono text-slate-600">
              Window: {fit.fitEnergyMin.toFixed(2)} – {fit.fitEnergyMax.toFixed(2)} eV
            </div>
          </div>

          {/* 3. Peak Alpha or Kubelka-Munk F(R_inf) */}
          <div className="rounded-xl border border-powder-200 bg-powder-50/50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-powder-800">
              {isDrs ? 'Max Kubelka-Munk F(R∞)' : 'Max Absorption Coeff. (α)'}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-extrabold font-mono text-slate-900">
                {isDrs
                  ? peakPrimaryValue.toFixed(2)
                  : `${peakPrimaryValue.toExponential(2)} cm⁻¹`}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-600">
              Peak at λ = <span className="font-mono font-semibold">{peakAbsorbanceLambdaNm.toFixed(1)} nm</span>
              {urbachEnergyMeV ? ` • Eu ≈ ${urbachEnergyMeV} meV` : ''}
            </div>
          </div>

          {/* 4. Closest Semiconductor Match */}
          <div className="rounded-xl border border-powder-200 bg-white p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-powder-800 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-racing-500" />
              <span>Closest Benchmark</span>
            </div>
            <div className="mt-1 text-sm font-bold text-slate-900 truncate">
              {closestBenchmark.name} ({closestBenchmark.formula})
            </div>
            <div className="mt-1 text-[11px] text-slate-600 font-mono">
              Ref Eg = {closestBenchmark.egEv.toFixed(2)} eV (Δ ={' '}
              <span className="text-racing-600 font-bold">
                {closestBenchmark.deltaEg >= 0
                  ? `+${closestBenchmark.deltaEg.toFixed(2)}`
                  : closestBenchmark.deltaEg.toFixed(2)}{' '}
                eV
              </span>
              )
            </div>
          </div>
        </div>

        {/* Manuscript Paragraph Box */}
        <div className="rounded-xl border border-powder-200 bg-powder-50/30 p-3 text-xs text-slate-700 leading-relaxed">
          <div className="font-semibold text-powder-900 mb-1 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-racing-500" />
            <span>Automated Optical Characterization Summary</span>
          </div>
          <p>{manuscriptParagraph}</p>
        </div>

        {/* Reference Semiconductor Comparison Table */}
        <div>
          <div className="text-xs font-semibold text-powder-900 mb-2">
            Reference Semiconductor Band Gap Comparison
          </div>
          <div className="overflow-x-auto rounded-lg border border-powder-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-powder-50/80 border-b border-powder-200 text-[11px] font-semibold uppercase tracking-wider text-powder-900">
                  <th className="py-2 px-3">Material</th>
                  <th className="py-2 px-3">Formula</th>
                  <th className="py-2 px-3">Transition</th>
                  <th className="py-2 px-3">Ref Eg (eV)</th>
                  <th className="py-2 px-3">Ref Edge (nm)</th>
                  <th className="py-2 px-3">ΔEg vs. Sample</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rankedBenchmarks.slice(0, 5).map((item, idx) => {
                  const isTopMatch = idx === 0;
                  return (
                    <tr
                      key={item.name}
                      className={
                        isTopMatch
                          ? 'bg-racing-50/40 font-medium'
                          : 'hover:bg-powder-50/30'
                      }
                    >
                      <td className="py-2 px-3 text-slate-900 font-semibold flex items-center gap-1.5">
                        {isTopMatch && (
                          <span className="w-2 h-2 rounded-full bg-racing-500 inline-block" />
                        )}
                        {item.name}
                      </td>
                      <td className="py-2 px-3 font-mono text-powder-800 font-semibold">
                        {item.formula}
                      </td>
                      <td className="py-2 px-3 text-slate-600 capitalize">
                        {item.transition.replace('-', ' ')}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-slate-800">
                        {item.egEv.toFixed(2)} eV
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600">
                        {(1239.84 / item.egEv).toFixed(0)} nm
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold">
                        <span
                          className={
                            Math.abs(item.deltaEg) <= 0.15
                              ? 'text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200'
                              : 'text-slate-600'
                          }
                        >
                          {item.deltaEg >= 0
                            ? `+${item.deltaEg.toFixed(2)}`
                            : item.deltaEg.toFixed(2)}{' '}
                          eV
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
