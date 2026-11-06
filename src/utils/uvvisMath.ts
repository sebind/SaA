import {
  InputSignalType,
  ThicknessUnit,
  TransitionType,
  TaucFitResult,
  UVVisConfig,
  UVVisPipelineResult
} from '../types/uvvis';
import { applySmoothing } from './ramanMath';

const HC_EV_NM = 1239.84193; // Planck constant * speed of light (eV * nm)
const LN_10 = 2.302585092994046;

/**
 * Parse UV-Vis-NIR spectrum text file (CSV, TXT, TSV, DAT) into ascending wavelength (nm) and signal arrays.
 */
export function parseUVVisSpectrumText(text: string): {
  wavelengthNm: number[];
  signalY: number[];
  detectedSignalType: Exclude<InputSignalType, 'auto'>;
} {
  const lines = text.split(/\r?\n/);
  const points: { x: number; y: number }[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith('%')) {
      continue;
    }
    const parts = line.split(/[,;\t\s]+/).filter(Boolean);
    if (parts.length >= 2) {
      const xVal = Number(parts[0]);
      const yVal = Number(parts[1]);
      if (Number.isFinite(xVal) && Number.isFinite(yVal) && xVal > 0) {
        points.push({ x: xVal, y: yVal });
      }
    }
  }

  if (points.length < 8) {
    throw new Error(
      'Could not find enough valid (Wavelength_nm, Signal) numeric rows in file.'
    );
  }

  // Sort ascending by wavelength (nm)
  points.sort((a, b) => a.x - b.x);

  const wavelengthNm = points.map((p) => p.x);
  const signalY = points.map((p) => p.y);

  // Heuristic detection of signal type from value range and wavelength trend
  let maxVal = -Infinity;
  for (const v of signalY) {
    if (v > maxVal) maxVal = v;
  }

  // Compare average signal at short wavelengths (UV) vs long wavelengths (Vis/NIR)
  const third = Math.max(1, Math.floor(signalY.length / 3));
  const avgShortLambda =
    signalY.slice(0, third).reduce((a, b) => a + b, 0) / third;
  const avgLongLambda =
    signalY.slice(-third).reduce((a, b) => a + b, 0) / third;

  let detectedSignalType: Exclude<InputSignalType, 'auto'> = 'absorbance';
  if (maxVal > 500) {
    detectedSignalType = 'alpha';
  } else if (maxVal > 6.5) {
    // Percentage scale (0 - 100%): both %R and %T are typically lower in UV and higher in Vis/NIR
    detectedSignalType = 'reflectance';
  } else if (avgShortLambda < avgLongLambda * 0.65 && maxVal <= 1.2) {
    // Fractional reflectance or transmittance in [0, 1]
    detectedSignalType = 'transmittance';
  } else {
    detectedSignalType = 'absorbance';
  }

  return { wavelengthNm, signalY, detectedSignalType };
}

/**
 * Convert film thickness to centimeters (cm).
 */
export function thicknessToCm(value: number, unit: ThicknessUnit): number {
  const safeVal = Math.max(1e-3, value);
  switch (unit) {
    case 'nm':
      return safeVal * 1e-7; // 1 nm = 1e-7 cm
    case 'um':
      return safeVal * 1e-4; // 1 um = 1e-4 cm
    case 'mm':
      return safeVal * 0.1; // 1 mm = 0.1 cm
  }
}

/**
 * Get the Tauc power exponent gamma = 1/n in (alpha * h * nu)^(1/n) = A * (h * nu - Eg).
 */
export function getTaucExponentPower(transition: TransitionType): {
  power: number;
  superscriptLabel: string;
  nLabel: string;
} {
  switch (transition) {
    case 'direct-allowed':
      return { power: 2, superscriptLabel: '²', nLabel: 'n = 1/2 (Direct Allowed)' };
    case 'indirect-allowed':
      return { power: 0.5, superscriptLabel: '¹ᐟ²', nLabel: 'n = 2 (Indirect Allowed)' };
    case 'direct-forbidden':
      return { power: 2 / 3, superscriptLabel: '²ᐟ³', nLabel: 'n = 3/2 (Direct Forbidden)' };
    case 'indirect-forbidden':
      return { power: 1 / 3, superscriptLabel: '¹ᐟ³', nLabel: 'n = 3 (Indirect Forbidden)' };
  }
}

/**
 * Ordinary Least Squares linear regression y = slope * x + intercept on slice [startIdx..endIdx].
 */
function fitLinearSegment(
  x: number[],
  y: number[],
  startIdx: number,
  endIdx: number
): { slope: number; intercept: number; rSquared: number } {
  const count = endIdx - startIdx + 1;
  if (count < 2) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  for (let i = startIdx; i <= endIdx; i++) {
    sumX += x[i];
    sumY += y[i];
  }
  const meanX = sumX / count;
  const meanY = sumY / count;

  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = startIdx; i <= endIdx; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }

  if (sxx < 1e-12 || syy < 1e-12) {
    return { slope: 0, intercept: meanY, rSquared: 0 };
  }

  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const rSquared = Math.max(0, Math.min(1, (sxy * sxy) / (sxx * syy)));

  return { slope, intercept, rSquared };
}

/**
 * Automatically locate the linear absorption edge region of a Tauc plot and extrapolate to find Eg.
 * Also supports manual energy range [E_min, E_max] when autoFit is false.
 */
export function findTaucBandGapAutomatically(
  energyEvAsc: number[],
  taucYAsc: number[],
  useBaselineOffset: boolean,
  autoFit: boolean,
  manualEnergyRange: [number, number] | null
): TaucFitResult {
  const n = energyEvAsc.length;
  if (n < 6) {
    return {
      bandGapEg: 0,
      onsetWavelengthNm: 0,
      slope: 0,
      intercept: 0,
      rSquared: 0,
      fitEnergyMin: 0,
      fitEnergyMax: 0,
      baselineSlope: 0,
      baselineIntercept: 0,
      extrapolatedLinePoints: { x1: 0, y1: 0, x2: 0, y2: 0 }
    };
  }

  const eMin = energyEvAsc[0];
  const eMax = energyEvAsc[n - 1];
  const eSpan = eMax - eMin || 1;

  // Lightly smooth Tauc curve for robust derivative / inflection detection
  const smoothedTauc = applySmoothing(taucYAsc, 'savgol', 7);

  let maxTauc = -Infinity;
  let minTauc = Infinity;
  for (const v of smoothedTauc) {
    if (v > maxTauc) maxTauc = v;
    if (v < minTauc) minTauc = v;
  }
  const taucSpan = maxTauc - minTauc || 1;

  // Estimate low-energy sub-bandgap baseline (first 12% of energy points)
  const baseEndIdx = Math.max(2, Math.floor(n * 0.12));
  const baseFit = useBaselineOffset
    ? fitLinearSegment(energyEvAsc, smoothedTauc, 0, baseEndIdx)
    : { slope: 0, intercept: 0, rSquared: 0 };

  let bestStart = Math.floor(n * 0.35);
  let bestEnd = Math.min(n - 1, bestStart + 8);
  let bestFit = fitLinearSegment(energyEvAsc, taucYAsc, bestStart, bestEnd);

  if (!autoFit && manualEnergyRange) {
    const [mMin, mMax] = [
      Math.min(manualEnergyRange[0], manualEnergyRange[1]),
      Math.max(manualEnergyRange[0], manualEnergyRange[1])
    ];
    let sIdx = 0;
    let eIdx = n - 1;
    for (let i = 0; i < n; i++) {
      if (energyEvAsc[i] >= mMin) {
        sIdx = i;
        break;
      }
    }
    for (let i = n - 1; i >= sIdx; i--) {
      if (energyEvAsc[i] <= mMax) {
        eIdx = i;
        break;
      }
    }
    if (eIdx - sIdx < 3) {
      eIdx = Math.min(n - 1, sIdx + 3);
    }
    bestStart = sIdx;
    bestEnd = eIdx;
    bestFit = fitLinearSegment(energyEvAsc, taucYAsc, bestStart, bestEnd);
  } else {
    // Automatic Steepest Linear Segment Detection
    // Window sizes between ~4% and ~12% of total points (at least 6 points)
    const minWin = Math.max(6, Math.floor(n * 0.04));
    const maxWin = Math.max(minWin + 4, Math.min(28, Math.floor(n * 0.13)));

    let bestScore = -Infinity;

    for (let win = minWin; win <= maxWin; win += 2) {
      for (let i = 2; i <= n - win - 2; i++) {
        const j = i + win;
        const yStart = smoothedTauc[i];
        const yEnd = smoothedTauc[j];
        const yMid = 0.5 * (yStart + yEnd);

        // Must be rising in the main absorption edge (above 6% of max, below 88% of max)
        if (yEnd <= yStart) continue;
        if (yMid < minTauc + taucSpan * 0.06 || yMid > minTauc + taucSpan * 0.88) {
          continue;
        }

        const seg = fitLinearSegment(energyEvAsc, smoothedTauc, i, j);
        if (seg.slope <= 0 || seg.rSquared < 0.96) continue;

        // Compute candidate Eg intercept
        const denomSlope = seg.slope - baseFit.slope;
        if (denomSlope <= 1e-9) continue;
        const candEg = (baseFit.intercept - seg.intercept) / denomSlope;

        // Eg must be physically reasonable: within spectrum range and below the fit window start
        if (candEg < eMin - 0.15 * eSpan || candEg > energyEvAsc[i] + 0.02) {
          continue;
        }

        // Normalized slope & high power of R^2 rewards the steepest, most linear segment
        const normSlope = seg.slope / (taucSpan / eSpan);
        const r2Weight = Math.pow(seg.rSquared, 8);
        // Prefer the fundamental (lowest-energy) strong edge if multiple edges exist
        const edgeOrderFactor = 1.0 - 0.08 * ((energyEvAsc[i] - eMin) / eSpan);
        const score = normSlope * r2Weight * edgeOrderFactor;

        if (score > bestScore) {
          bestScore = score;
          bestStart = i;
          bestEnd = j;
        }
      }
    }

    // Refine final OLS fit on the unsmoothed Tauc curve across [bestStart, bestEnd]
    bestFit = fitLinearSegment(energyEvAsc, taucYAsc, bestStart, bestEnd);
  }

  const denom = bestFit.slope - baseFit.slope;
  const rawEg =
    Math.abs(denom) > 1e-10
      ? (baseFit.intercept - bestFit.intercept) / denom
      : energyEvAsc[bestStart];

  const bandGapEg = Math.max(0.1, Number(rawEg.toFixed(3)));
  const onsetWavelengthNm = Number((HC_EV_NM / bandGapEg).toFixed(1));

  const yAtIntercept = useBaselineOffset
    ? Math.max(0, baseFit.slope * bandGapEg + baseFit.intercept)
    : 0;

  const fitEnergyMin = Number(energyEvAsc[bestStart].toFixed(3));
  const fitEnergyMax = Number(energyEvAsc[bestEnd].toFixed(3));
  const x2 = energyEvAsc[bestEnd];
  const y2 = bestFit.slope * x2 + bestFit.intercept;

  return {
    bandGapEg,
    onsetWavelengthNm,
    slope: bestFit.slope,
    intercept: bestFit.intercept,
    rSquared: Number(bestFit.rSquared.toFixed(4)),
    fitEnergyMin,
    fitEnergyMax,
    baselineSlope: baseFit.slope,
    baselineIntercept: baseFit.intercept,
    extrapolatedLinePoints: {
      x1: bandGapEg,
      y1: yAtIntercept,
      x2,
      y2
    }
  };
}

/**
 * Estimate Urbach Energy Eu (meV) from the sub-bandgap exponential tail:
 * ln(alpha) = ln(alpha_0) + (h*nu) / Eu  =>  Eu = 1 / slope(ln(alpha) vs h*nu)
 */
function estimateUrbachEnergyMeV(
  energyEvAsc: number[],
  primaryAsc: number[],
  egEv: number
): number | null {
  if (egEv <= 0.2) return null;
  const tailIndices: number[] = [];
  for (let i = 0; i < energyEvAsc.length; i++) {
    const E = energyEvAsc[i];
    if (E >= egEv - 0.28 && E <= egEv - 0.03 && primaryAsc[i] > 1e-6) {
      tailIndices.push(i);
    }
  }
  if (tailIndices.length < 4) return null;

  const xSub = tailIndices.map((idx) => energyEvAsc[idx]);
  const lnYSub = tailIndices.map((idx) => Math.log(primaryAsc[idx]));
  const fit = fitLinearSegment(xSub, lnYSub, 0, xSub.length - 1);

  if (fit.slope <= 0.5 || fit.rSquared < 0.85) return null;
  const euEv = 1 / fit.slope;
  const euMeV = Math.round(euEv * 1000);
  if (euMeV < 10 || euMeV > 600) return null;
  return euMeV;
}

/**
 * Run complete UV-Vis-NIR & DRS Kubelka-Munk / Tauc analysis pipeline.
 */
export function runUVVisPipeline(
  rawWavelengthNm: number[],
  rawSignalY: number[],
  config: UVVisConfig
): UVVisPipelineResult {
  const n = rawWavelengthNm.length;
  const smoothedSignal =
    config.smoothWindow > 1
      ? applySmoothing(rawSignalY, 'savgol', config.smoothWindow)
      : [...rawSignalY];

  // Resolve effective signal type if set to 'auto'
  let maxSig = -Infinity;
  for (const v of smoothedSignal) {
    if (v > maxSig) maxSig = v;
  }

  let effectiveSignalType = config.inputSignalType;
  if (effectiveSignalType === 'auto') {
    if (config.measurementMode === 'drs') {
      effectiveSignalType = maxSig > 3.5 ? 'reflectance' : 'absorbance';
    } else {
      if (maxSig > 500) effectiveSignalType = 'alpha';
      else if (maxSig > 4.5) effectiveSignalType = 'transmittance';
      else effectiveSignalType = 'absorbance';
    }
  }

  const thicknessCm = thicknessToCm(config.thicknessValue, config.thicknessUnit);

  const absorbance: number[] = new Array(n).fill(0);
  const absorptionCoeffAlpha: number[] = new Array(n).fill(0);
  const kubelkaMunkF: number[] = new Array(n).fill(0);
  const photonEnergyEv: number[] = new Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    const lam = Math.max(100, rawWavelengthNm[i]);
    photonEnergyEv[i] = HC_EV_NM / lam;
    const sig = smoothedSignal[i];

    // 1. Compute Absorbance A & Thin-Film Absorption Coefficient alpha (cm^-1)
    if (effectiveSignalType === 'alpha') {
      const aVal = Math.max(0, sig);
      absorptionCoeffAlpha[i] = aVal;
      absorbance[i] = (aVal * thicknessCm) / LN_10;
    } else if (effectiveSignalType === 'transmittance') {
      const T = maxSig > 1.5 ? Math.max(1e-4, Math.min(0.9999, sig / 100)) : Math.max(1e-4, Math.min(0.9999, sig));
      const A = -Math.log10(T);
      absorbance[i] = Math.max(0, A);
      absorptionCoeffAlpha[i] = (absorbance[i] * LN_10) / thicknessCm;
    } else if (effectiveSignalType === 'reflectance') {
      const R = maxSig > 1.5 ? Math.max(1e-4, Math.min(0.9999, sig / 100)) : Math.max(1e-4, Math.min(0.9999, sig));
      const A = -Math.log10(R);
      absorbance[i] = Math.max(0, A);
      absorptionCoeffAlpha[i] = (absorbance[i] * LN_10) / thicknessCm;
    } else {
      // Absorbance A
      const A = Math.max(0, sig);
      absorbance[i] = A;
      absorptionCoeffAlpha[i] = (A * LN_10) / thicknessCm;
    }

    // 2. Compute Kubelka-Munk F(R_inf) = (1 - R_inf)^2 / (2 * R_inf)
    let R_inf = 0.5;
    if (effectiveSignalType === 'reflectance' || effectiveSignalType === 'transmittance') {
      R_inf =
        maxSig > 1.5
          ? Math.max(5e-4, Math.min(0.9995, sig / 100))
          : Math.max(5e-4, Math.min(0.9995, sig));
    } else {
      // If user uploaded Absorbance log10(1/R), recover R_inf = 10^(-A)
      R_inf = Math.max(5e-4, Math.min(0.9995, Math.pow(10, -Math.max(0, sig))));
    }
    kubelkaMunkF[i] = Math.pow(1 - R_inf, 2) / (2 * R_inf);
  }

  const isDrs = config.measurementMode === 'drs';
  const primarySpectrumY = isDrs ? kubelkaMunkF : absorptionCoeffAlpha;
  const { power, superscriptLabel } = getTaucExponentPower(config.transitionType);

  // Compute Tauc ordinate: (alpha * h*nu)^(1/n) or (F(R_inf) * h*nu)^(1/n)
  const taucY = primarySpectrumY.map((val, i) => {
    const prod = Math.max(0, val * photonEnergyEv[i]);
    return Math.pow(prod, power);
  });

  // For Tauc extrapolation, order points by ascending Photon Energy (which is reverse of ascending wavelength)
  const indicesAscE = Array.from({ length: n }, (_, i) => n - 1 - i);
  const energyAsc = indicesAscE.map((idx) => photonEnergyEv[idx]);
  const taucAsc = indicesAscE.map((idx) => taucY[idx]);
  const primaryAsc = indicesAscE.map((idx) => primarySpectrumY[idx]);

  const fit = findTaucBandGapAutomatically(
    energyAsc,
    taucAsc,
    config.useBaselineOffset,
    config.autoFit,
    config.manualEnergyRange
  );

  const urbachEnergyMeV = estimateUrbachEnergyMeV(energyAsc, primaryAsc, fit.bandGapEg);

  // Peak absorption wavelength
  let peakIdx = 0;
  for (let i = 1; i < n; i++) {
    if (primarySpectrumY[i] > primarySpectrumY[peakIdx]) {
      peakIdx = i;
    }
  }

  const primaryYAxisLabel = isDrs
    ? 'Kubelka-Munk F(R∞) (a.u.)'
    : 'Absorption Coefficient α (cm⁻¹)';

  const taucYAxisLabel = isDrs
    ? `(F(R∞)·hν)${superscriptLabel} (eV${superscriptLabel})`
    : `(αhν)${superscriptLabel} (cm⁻¹·eV)${superscriptLabel}`;

  return {
    wavelengthNm: rawWavelengthNm,
    photonEnergyEv,
    rawSignal: rawSignalY,
    absorbance,
    absorptionCoeffAlpha,
    kubelkaMunkF,
    primarySpectrumY,
    taucY,
    taucExponentPower: power,
    taucYAxisLabel,
    primaryYAxisLabel,
    fit,
    urbachEnergyMeV,
    peakAbsorbanceLambdaNm: rawWavelengthNm[peakIdx] || 0,
    peakPrimaryValue: primarySpectrumY[peakIdx] || 0
  };
}

/**
 * Export UV-Vis-NIR & Tauc / Kubelka-Munk Analysis to CSV.
 */
export function exportUVVisAnalysisToCSV(
  sampleName: string,
  config: UVVisConfig,
  result: UVVisPipelineResult
) {
  const lines: string[] = [];
  lines.push(`# aiSA — UV-Vis-NIR & Tauc Band Gap Analysis Export — ${sampleName}`);
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push(`# Measurement Mode: ${config.measurementMode === 'drs' ? 'DRS (Kubelka-Munk)' : 'Thin Film'}`);
  if (config.measurementMode === 'thin-film') {
    lines.push(`# Film Thickness: ${config.thicknessValue} ${config.thicknessUnit}`);
  }
  lines.push(`# Transition Type: ${config.transitionType}`);
  lines.push(`# Extrapolated Optical Band Gap (Eg): ${result.fit.bandGapEg.toFixed(3)} eV`);
  lines.push(`# Absorption Edge Onset Wavelength: ${result.fit.onsetWavelengthNm.toFixed(1)} nm`);
  lines.push(`# Linear Fit Window: ${result.fit.fitEnergyMin.toFixed(3)} to ${result.fit.fitEnergyMax.toFixed(3)} eV (R^2 = ${result.fit.rSquared.toFixed(4)})`);
  lines.push('');
  lines.push(
    'Wavelength_nm,Photon_Energy_eV,Raw_Signal,Absorbance_A,Absorption_Coeff_Alpha_cm-1,Kubelka_Munk_F_Rinf,Tauc_Ordinate'
  );

  for (let i = 0; i < result.wavelengthNm.length; i++) {
    lines.push(
      [
        result.wavelengthNm[i].toFixed(2),
        result.photonEnergyEv[i].toFixed(4),
        result.rawSignal[i].toFixed(5),
        result.absorbance[i].toFixed(5),
        result.absorptionCoeffAlpha[i].toFixed(2),
        result.kubelkaMunkF[i].toFixed(5),
        result.taucY[i].toExponential(5)
      ].join(',')
    );
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = sampleName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  a.href = url;
  a.download = `${safeName}-uvvis-tauc-analysis.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
