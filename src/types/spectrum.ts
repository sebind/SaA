export type BaselineMethod = 'none' | 'linear' | 'polynomial' | 'rollingball';
export type SmoothMethod = 'none' | 'savgol' | 'moving';
export type NormMethod = 'none' | 'minmax' | 'max' | 'snv' | 'area';
export type FitShape = 'gaussian' | 'lorentzian';

export interface ProcessingConfig {
  baselineMethod: BaselineMethod;
  polyDegree: number;
  rollingRadius: number;
  smoothMethod: SmoothMethod;
  smoothWindow: number;
  normMethod: NormMethod;
  prominence: number;
  minDistance: number;
  fitShape: FitShape;
}

export interface VibrationalModeMatch {
  id: string;
  mode: string;
  bond: string;
  materialGroup: string;
  referenceWavenumber: number;
  range: [number, number];
  shiftDelta: number;
  description: string;
  confidence: 'High' | 'Moderate' | 'Candidate';
}

export interface PeakData {
  id: string;
  index: number;
  center: number; // x0 (cm^-1)
  rawCenter: number;
  amplitude: number; // fitted amplitude A
  rawIntensity: number;
  fwhm: number; // Full Width at Half Maximum (cm^-1)
  area: number; // Integrated peak area
  shape: FitShape;
  rSquared: number;
  assignedMode?: VibrationalModeMatch;
  alternatives: VibrationalModeMatch[];
  color: string;
}

export interface ReferenceMaterial {
  id: string;
  name: string;
  formula: string;
  category: string;
  peaks: {
    wavenumber: number;
    relativeIntensity: number; // 0 to 1
    label: string;
    symmetry: string;
  }[];
  notes: string;
}

export interface SampleDataset {
  id: string;
  name: string;
  subtitle: string;
  laserWavelength: string;
  referenceId: string;
  x: number[];
  y: number[];
}
