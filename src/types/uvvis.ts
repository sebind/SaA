export type MeasurementMode = 'thin-film' | 'drs';

export type InputSignalType = 'auto' | 'absorbance' | 'transmittance' | 'reflectance' | 'alpha';

/**
 * Tauc exponent n in (alpha * h * nu)^(1/n) = A * (h * nu - Eg)
 * - direct-allowed: n = 0.5  => power (1/n) = 2
 * - indirect-allowed: n = 2  => power (1/n) = 0.5
 * - direct-forbidden: n = 1.5 => power (1/n) = 2/3
 * - indirect-forbidden: n = 3 => power (1/n) = 1/3
 */
export type TransitionType =
  | 'direct-allowed'
  | 'indirect-allowed'
  | 'direct-forbidden'
  | 'indirect-forbidden';

export type ThicknessUnit = 'nm' | 'um' | 'mm';

export interface UVVisConfig {
  measurementMode: MeasurementMode;
  inputSignalType: InputSignalType;
  thicknessValue: number; // e.g. 250
  thicknessUnit: ThicknessUnit;
  transitionType: TransitionType;
  smoothWindow: number; // odd Savitzky-Golay window (1 = off)
  useBaselineOffset: boolean; // Makuła baseline correction on Tauc plot
  autoFit: boolean;
  manualEnergyRange: [number, number] | null; // [E_min, E_max] in eV when autoFit is false
}

export interface TaucFitResult {
  bandGapEg: number; // eV
  onsetWavelengthNm: number; // 1239.84 / Eg (nm)
  slope: number;
  intercept: number;
  rSquared: number;
  fitEnergyMin: number; // eV
  fitEnergyMax: number; // eV
  baselineSlope: number;
  baselineIntercept: number;
  extrapolatedLinePoints: {
    x1: number; // eV at baseline intercept (Eg)
    y1: number; // Tauc value at baseline intercept (0 or baseline line)
    x2: number; // eV at top of linear fit segment
    y2: number; // Tauc value at top of linear fit segment
  };
}

export interface UVVisPipelineResult {
  wavelengthNm: number[]; // sorted ascending (nm)
  photonEnergyEv: number[]; // corresponding h*nu (eV) = 1239.84193 / lambda
  rawSignal: number[]; // input A, %T, or %R
  absorbance: number[]; // Absorbance A (for thin film)
  absorptionCoeffAlpha: number[]; // alpha (cm^-1) for thin film
  kubelkaMunkF: number[]; // F(R_inf) = (1-R)^2 / (2R) for DRS
  primarySpectrumY: number[]; // alpha (cm^-1) if thin-film, F(R_inf) if DRS
  taucY: number[]; // (alpha * h*nu)^(1/n) or (F(R_inf) * h*nu)^(1/n)
  taucExponentPower: number; // 2, 0.5, 0.667, or 0.333
  taucYAxisLabel: string;
  primaryYAxisLabel: string;
  fit: TaucFitResult;
  urbachEnergyMeV: number | null; // estimated Urbach tail energy Eu (meV)
  peakAbsorbanceLambdaNm: number;
  peakPrimaryValue: number;
}

export interface UVVisSampleDataset {
  id: string;
  name: string;
  subtitle: string;
  materialFormula: string;
  measurementMode: MeasurementMode;
  inputSignalType: Exclude<InputSignalType, 'auto'>;
  defaultThicknessNm: number;
  defaultTransition: TransitionType;
  referenceEgEv: number;
  notes: string;
  wavelengthNm: number[];
  signalY: number[];
}
