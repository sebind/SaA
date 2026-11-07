export type XPSBackgroundMethod = 'shirley' | 'tougaard' | 'linear' | 'none';
export type XPSSmoothMethod = 'none' | 'savgol' | 'moving';
export type XPSNormMethod = 'none' | 'minmax' | 'max' | 'area';
export type XPSFitShape = 'pseudo-voigt' | 'gaussian' | 'lorentzian';
export type XraySourceType = 'Al-Ka' | 'Mg-Ka';

export interface XPSManualPeakSeed {
  id: string;
  centerEv: number;
  fwhmEv?: number;
  label?: string;
}

export interface XPSConfig {
  xraySource: XraySourceType; // Al Kα (1486.6 eV) or Mg Kα (1253.6 eV)
  chargeShiftEv: number; // Binding energy shift (eV) for charge referencing (e.g. C 1s = 284.8 eV)
  reversedAxis: boolean; // Standard XPS convention: High BE on left -> Low BE on right
  backgroundMethod: XPSBackgroundMethod;
  tougaardB: number; // Tougaard B parameter (default ~2866 eV^2)
  smoothMethod: XPSSmoothMethod;
  smoothWindow: number;
  normMethod: XPSNormMethod;
  autoFit: boolean;
  fitShape: XPSFitShape;
  glMixRatio: number; // 0 = pure Gaussian, 30 = GL(30), 100 = pure Lorentzian
  prominence: number; // 0.04 to 0.45
  minDistanceEv: number; // Minimum peak separation in eV (e.g. 0.9 eV)
  maxComponents: number; // Max deconvoluted sub-peaks (2 to 8)
  enableShoulderDetection: boolean; // Detect overlapping chemical state shoulders via curvature
  customPeakSeeds: XPSManualPeakSeed[]; // Optional user-added peak centers
}

export interface XPSChemicalStateMatch {
  id: string;
  coreLevel: string; // e.g., "C 1s", "Ti 2p", "O 1s", "Mo 3d"
  element: string; // e.g., "C", "Ti", "O", "Mo"
  stateLabel: string; // e.g., "C–C / C=C (sp²)", "Ti⁴⁺ 2p₃/₂ (TiO₂)"
  oxidationState: string; // e.g., "0 / sp²", "+4", "-2"
  bondEnvironment: string; // e.g., "Graphitic carbon", "TiO₂ lattice"
  referenceBeEv: number;
  rangeEv: [number, number];
  shiftDeltaEv: number; // Exp BE - Ref BE
  spinOrbitSplittingEv?: number; // e.g. 5.7 eV for Ti 2p, 3.15 eV for Mo 3d
  branchingRatio?: string; // e.g. "2:1 (2p₃/₂ : 2p₁/₂)"
  scofieldRsf: number; // Relative Sensitivity Factor (Al Kα)
  confidence: 'High' | 'Moderate' | 'Candidate';
}

export interface XPSPeakData {
  id: string;
  index: number;
  centerEv: number; // Fitted Binding Energy (eV)
  rawCenterEv: number;
  kineticEnergyEv: number; // hν - BE
  amplitude: number; // Peak height above background
  rawIntensity: number; // Raw intensity at peak center
  fwhmEv: number; // Full Width at Half Maximum (eV)
  area: number; // Integrated peak area (CPS · eV)
  atomicPercent: number; // Relative component percentage (%) within region
  rsfCorrectedPercent: number; // RSF-corrected atomic %
  shape: XPSFitShape;
  glMixRatio: number;
  rSquared: number; // Local component fit quality
  isShoulder: boolean;
  doubletPartnerId?: string; // Linked spin-orbit partner peak ID if detected
  measuredSplittingEv?: number; // Measured ΔE_SO if paired
  assignedState?: XPSChemicalStateMatch;
  alternatives: XPSChemicalStateMatch[];
  color: string;
}

export interface XPSCoreLevelReference {
  id: string;
  coreLevel: string; // e.g. "C 1s", "Ti 2p", "Mo 3d", "O 1s", "Si 2p", "N 1s"
  element: string;
  name: string;
  formula: string;
  category: string;
  scofieldRsf: number;
  spinOrbitSplittingEv: number | null; // null for s orbitals (1s, 2s)
  branchingRatioLabel: string; // e.g. "Singlet (l = 0)", "2:1 (2p₃/₂ : 2p₁/₂)", "3:2 (3d₅/₂ : 3d₃/₂)"
  states: {
    bindingEnergyEv: number;
    relativeIntensity: number; // 0 to 1
    stateLabel: string;
    oxidationState: string;
    bondEnvironment: string;
  }[];
  notes: string;
}

export interface XPSSampleDataset {
  id: string;
  name: string;
  subtitle: string;
  coreLevel: string;
  materialFormula: string;
  xraySource: XraySourceType;
  passEnergyEv: number;
  referenceId: string;
  defaultChargeShiftEv: number;
  defaultProminence: number;
  defaultMinDistanceEv: number;
  defaultGlMix: number;
  notes: string;
  bindingEnergyEv: number[]; // eV
  intensityCps: number[]; // Counts per second (CPS)
}

export interface XPSPipelineResult {
  shiftedBeEv: number[]; // Charge-corrected Binding Energy (sorted ascending internally)
  kineticEnergyEv: number[]; // Kinetic Energy = hν - BE
  rawIntensity: number[]; // Original CPS
  background: number[]; // Shirley / Tougaard / Linear background
  correctedY: number[]; // Background-subtracted intensity
  processedY: number[]; // Smoothed + Normalized background-subtracted intensity
  compositeFit: number[]; // Sum of fitted peaks (in processedY space)
  rawCompositeEnvelope: number[]; // Background + composite fit (in raw CPS space)
  residual: number[]; // processedY - compositeFit
  envelopeRSquared: number; // Overall multi-peak envelope R^2
  reducedChiSquare: number;
  totalIntegratedArea: number;
  peaks: XPSPeakData[];
}
