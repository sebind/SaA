export type PLXAxisMode = 'wavelength' | 'energy';
export type PLBaselineMethod = 'none' | 'linear' | 'polynomial' | 'dark-offset';
export type PLSmoothMethod = 'none' | 'savgol' | 'moving';
export type PLNormMethod = 'none' | 'minmax' | 'max' | 'area';
export type PLFitShape = 'gaussian' | 'lorentzian' | 'pseudo-voigt';
export type PLEmissionOriginCategory = 'NBE / Excitonic' | 'Defect / Deep-Level' | 'Phonon / Vibronic' | 'Dopant / Activator';

export interface PLManualPeakSeed {
  id: string;
  centerNm: number;
  fwhmNm?: number;
  label?: string;
}

export interface PLConfig {
  xAxisMode: PLXAxisMode; // Plot in Wavelength (nm) or Photon Energy (eV)
  applyJacobianInEnergy: boolean; // I(E) = I(λ) * (λ^2 / hc) spectral density rescale
  laserWavelengthNm: number; // Excitation laser wavelength (e.g. 325, 405, 488, 532 nm)
  referenceBandgapEv: number; // Material reference absorption/optical bandgap (eV) for Stokes shift & NBE classification
  temperatureK: number; // Measurement temperature (K), e.g. 300 K
  baselineMethod: PLBaselineMethod;
  polyDegree: number;
  smoothMethod: PLSmoothMethod;
  smoothWindow: number;
  normMethod: PLNormMethod;
  autoFit: boolean;
  fitShape: PLFitShape;
  voigtMixRatio: number; // 0 = pure Gaussian, 50 = 50% Lorentzian, 100 = pure Lorentzian
  prominence: number; // 0.04 to 0.45
  minDistanceNm: number; // Minimum peak separation in nm (e.g. 8 nm)
  maxComponents: number; // Max deconvoluted emission sub-bands (1 to 7)
  enableShoulderDetection: boolean; // Resolve excitonic trion / defect shoulders
  customPeakSeeds: PLManualPeakSeed[];
}

export interface PLTransitionMatch {
  id: string;
  materialSystem: string; // e.g., "ZnO", "MoS₂ (1L)", "CsPbBr₃", "GaN", "CdSe/ZnS", "MAPbI₃"
  transitionLabel: string; // e.g., "Free Exciton (FX / A⁰)", "Oxygen Vacancy (V_O) Green Band", "Negative Trion (A⁻)"
  originCategory: PLEmissionOriginCategory;
  shortCode: string; // e.g., "FX (NBE)", "A⁰ Exciton", "A⁻ Trion", "V_O Defect", "YL Band"
  referenceNm: number;
  referenceEv: number;
  rangeNm: [number, number];
  physicalMechanism: string;
  confidence: 'High' | 'Moderate' | 'Candidate';
}

export interface PLPeakData {
  id: string;
  index: number;
  centerNm: number; // Fitted emission peak center in nm
  centerEv: number; // Photon energy E = 1239.84193 / centerNm (eV)
  stokesShiftMeV: number; // (E_ref_or_exc - E_peak) in meV
  amplitude: number; // Peak height in processed space
  rawIntensity: number; // Raw intensity at peak apex
  fwhmNm: number; // Full Width at Half Maximum in nm
  fwhmMeV: number; // Full Width at Half Maximum in meV
  area: number; // Integrated emission area
  relativeAreaPercent: number; // Relative integrated emission fraction (%)
  shape: PLFitShape;
  voigtMixRatio: number;
  rSquared: number; // Local component fit quality
  isShoulder: boolean;
  originCategory: PLEmissionOriginCategory;
  assignedTransition?: PLTransitionMatch;
  alternatives: PLTransitionMatch[];
  color: string;
}

export interface PLCIE1931Result {
  x: number; // CIE 1931 x chromaticity coordinate
  y: number; // CIE 1931 y chromaticity coordinate
  z: number; // CIE 1931 z coordinate
  uPrime: number; // CIE 1976 u'
  vPrime: number; // CIE 1976 v'
  dominantWavelengthNm: number; // Dominant perceptual wavelength (nm)
  colorPurityPercent: number; // Excitation purity (%) relative to D65 white point
  cctKelvin: number | null; // Correlated Color Temperature (K) via McCamy's approximation
  hexColor: string; // sRGB hex color for UI preview
  colorName: string; // e.g., "Near-UV / Violet", "Emerald Green", "excitonic Crimson Red"
  visibleFractionPercent: number; // % of total PL emission falling in 380-780 nm visible window
}

export interface PLMaterialReference {
  id: string;
  name: string;
  formula: string;
  category: string;
  bandgapEv: number;
  bandgapNm: number;
  excitonBindingMeV: number;
  recommendedLaserNm: number;
  transitions: {
    wavelengthNm: number;
    energyEv: number;
    relativeIntensity: number;
    transitionLabel: string;
    originCategory: PLEmissionOriginCategory;
    physicalMechanism: string;
  }[];
  notes: string;
}

export interface PLSampleDataset {
  id: string;
  name: string;
  subtitle: string;
  materialFormula: string;
  laserWavelengthNm: number;
  referenceBandgapEv: number;
  temperatureK: number;
  referenceId: string;
  defaultProminence: number;
  defaultMinDistanceNm: number;
  defaultVoigtMix: number;
  notes: string;
  wavelengthNm: number[]; // Ascending wavelength in nm
  intensity: number[]; // Steady-state PL intensity (CPS / a.u.)
}

export interface PLPipelineResult {
  wavelengthNm: number[]; // Sorted ascending (nm)
  photonEnergyEv: number[]; // Corresponding 1239.84193 / nm
  rawIntensity: number[];
  baseline: number[];
  correctedY: number[];
  processedY: number[]; // Smoothed + Normalized (+ optional Jacobian if energy mode)
  compositeFit: number[]; // Sum of deconvoluted emission peaks in processedY space
  rawCompositeEnvelope: number[]; // Baseline + compositeFit scaled back to raw counts
  residual: number[]; // processedY - compositeFit
  envelopeRSquared: number;
  reducedChiSquare: number;
  totalIntegratedArea: number;
  nbeAreaPercent: number; // % of integrated intensity from Near-Band-Edge / Excitonic transitions
  defectAreaPercent: number; // % of integrated intensity from Deep-Level / Defect transitions
  nbeToDefectRatio: number | null; // I_NBE / I_DLE integrated area ratio
  dominantPeakNm: number | null;
  dominantPeakEv: number | null;
  dominantFwhmNm: number | null;
  dominantFwhmMeV: number | null;
  apparentBandgapEv: number | null; // Estimated optical bandgap from NBE emission + thermal correction
  stokesShiftMeV: number | null; // Stokes shift relative to reference bandgap (meV)
  cie1931: PLCIE1931Result;
  peaks: PLPeakData[];
}
