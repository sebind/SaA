import { TransitionType, UVVisSampleDataset } from '../types/uvvis';

export interface SemiconductorBenchmark {
  name: string;
  formula: string;
  egEv: number;
  transition: TransitionType;
  category: string;
  notes: string;
}

export const SEMICONDUCTOR_BENCHMARKS: SemiconductorBenchmark[] = [
  {
    name: 'Zinc Oxide (Wurtzite)',
    formula: 'ZnO',
    egEv: 3.26,
    transition: 'direct-allowed',
    category: 'Wide-Bandgap Oxide',
    notes: 'Direct wide-bandgap transparent conductive & UV-absorbing oxide (~380 nm edge).'
  },
  {
    name: 'Titanium Dioxide (Anatase)',
    formula: 'TiO₂',
    egEv: 3.20,
    transition: 'indirect-allowed',
    category: 'Photocatalyst Oxide',
    notes: 'Canonical UV photocatalyst (~387 nm onset); often evaluated via Kubelka-Munk DRS.'
  },
  {
    name: 'Titanium Dioxide (Rutile)',
    formula: 'TiO₂',
    egEv: 3.02,
    transition: 'direct-allowed',
    category: 'Photocatalyst Oxide',
    notes: 'Thermodynamically stable polymorph with ~410 nm optical edge.'
  },
  {
    name: 'Graphitic Carbon Nitride',
    formula: 'g-C₃N₄',
    egEv: 2.71,
    transition: 'indirect-allowed',
    category: '2D Polymeric Semiconductor',
    notes: 'Visible-light metal-free photocatalyst (~457 nm absorption edge).'
  },
  {
    name: 'Bismuth Vanadate (Monoclinic)',
    formula: 'BiVO₄',
    egEv: 2.42,
    transition: 'direct-allowed',
    category: 'Photoanode Oxide',
    notes: 'Visible-light photoelectrochemical water-splitting semiconductor (~512 nm edge).'
  },
  {
    name: 'Cadmium Sulfide',
    formula: 'CdS',
    egEv: 2.42,
    transition: 'direct-allowed',
    category: 'II-VI Chalcogenide',
    notes: 'Direct-gap visible-light chalcogenide (~512 nm absorption edge).'
  },
  {
    name: 'Hematite Iron Oxide',
    formula: 'α-Fe₂O₃',
    egEv: 2.10,
    transition: 'direct-allowed',
    category: 'Transition Metal Oxide',
    notes: 'Earth-abundant visible absorber (~590 nm onset).'
  },
  {
    name: 'Cadmium Selenide',
    formula: 'CdSe',
    egEv: 1.74,
    transition: 'direct-allowed',
    category: 'II-VI Chalcogenide',
    notes: 'Direct-bandgap optoelectronic thin film (~712 nm NIR edge).'
  },
  {
    name: 'Methylammonium Lead Iodide',
    formula: 'MAPbI₃',
    egEv: 1.59,
    transition: 'direct-allowed',
    category: 'Halide Perovskite',
    notes: 'Direct-gap hybrid perovskite photovoltaic absorber (~780 nm NIR edge).'
  },
  {
    name: 'Crystalline Silicon',
    formula: 'c-Si',
    egEv: 1.12,
    transition: 'indirect-allowed',
    category: 'Elemental Semiconductor',
    notes: 'Indirect NIR band gap (~1107 nm onset).'
  }
];

/**
 * Generate a realistic thin-film absorbance spectrum A(lambda) with exact Tauc behavior:
 * Above Eg: (alpha * E)^(1/n) = C * (E - Eg)  =>  alpha(E) = [C * (E - Eg)]^n / E
 * Below Eg: smooth Urbach tail + weak sub-bandgap interference/scattering baseline.
 */
function buildThinFilmAbsorbanceSpectrum(params: {
  lambdaMin: number;
  lambdaMax: number;
  stepNm: number;
  egEv: number;
  nExponent: number; // 0.5 for direct-allowed, 2 for indirect-allowed
  thicknessNm: number;
  alphaScaleCm: number; // scale in cm^-1 at E = Eg + 1 eV
  urbachEv: number;
  baselineAbs: number;
}): { wavelengthNm: number[]; signalY: number[] } {
  const {
    lambdaMin,
    lambdaMax,
    stepNm,
    egEv,
    nExponent,
    thicknessNm,
    alphaScaleCm,
    urbachEv,
    baselineAbs
  } = params;

  const wavelengthNm: number[] = [];
  const signalY: number[] = [];
  const tCm = thicknessNm * 1e-7; // 1 nm = 1e-7 cm

  for (let lam = lambdaMin; lam <= lambdaMax + 1e-6; lam += stepNm) {
    const E = 1239.84193 / lam;
    let alpha = 0;

    if (E >= egEv) {
      const deltaE = E - egEv;
      // Soft saturation at high energy above Eg + 1.1 eV to mimic real valence-band density of states
      const effDelta = deltaE / (1 + 0.16 * Math.pow(deltaE, 2));
      const taucTerm = Math.pow(effDelta, nExponent) / E;
      const refTerm = Math.pow(1.0, nExponent) / (egEv + 1.0);
      alpha = alphaScaleCm * (taucTerm / refTerm);
      // Continuity with Urbach tail at E = egEv
      alpha += alphaScaleCm * 0.012 * Math.exp(-Math.pow((E - egEv) / 0.18, 2));
    } else {
      // Exponential Urbach tail below Eg
      const edgeAlpha = alphaScaleCm * 0.012;
      alpha = edgeAlpha * Math.exp((E - egEv) / urbachEv);
    }

    // Convert alpha (cm^-1) to Absorbance A = alpha * t / 2.302585 + baseline
    const deterministicRipple =
      0.0018 * Math.sin(lam * 0.085) + 0.0009 * Math.cos(lam * 0.23);
    const A = Math.max(0.002, (alpha * tCm) / 2.302585093 + baselineAbs + deterministicRipple);

    wavelengthNm.push(Number(lam.toFixed(1)));
    signalY.push(Number(A.toFixed(5)));
  }

  return { wavelengthNm, signalY };
}

/**
 * Generate a realistic Diffuse Reflectance (%R) powder spectrum obeying Kubelka-Munk theory:
 * F(R_inf) = (1 - R_inf)^2 / (2 * R_inf)
 * Inverting F(R) -> R_inf = 1 + F - sqrt(F^2 + 2*F).
 */
function buildDrsReflectanceSpectrum(params: {
  lambdaMin: number;
  lambdaMax: number;
  stepNm: number;
  egEv: number;
  nExponent: number; // 0.5 for direct, 2.0 for indirect
  kmScale: number; // F(R) scale at E = Eg + 0.8 eV
  urbachEv: number;
  baselineF: number;
}): { wavelengthNm: number[]; signalY: number[] } {
  const {
    lambdaMin,
    lambdaMax,
    stepNm,
    egEv,
    nExponent,
    kmScale,
    urbachEv,
    baselineF
  } = params;

  const wavelengthNm: number[] = [];
  const signalY: number[] = [];

  for (let lam = lambdaMin; lam <= lambdaMax + 1e-6; lam += stepNm) {
    const E = 1239.84193 / lam;
    let F = baselineF;

    if (E >= egEv) {
      const deltaE = E - egEv;
      const effDelta = deltaE / (1 + 0.14 * Math.pow(deltaE, 2));
      const taucTerm = Math.pow(effDelta, nExponent) / E;
      const refTerm = Math.pow(0.8, nExponent) / (egEv + 0.8);
      F += kmScale * (taucTerm / refTerm);
      F += kmScale * 0.01 * Math.exp(-Math.pow((E - egEv) / 0.15, 2));
    } else {
      const edgeF = kmScale * 0.01;
      F += edgeF * Math.exp((E - egEv) / urbachEv);
    }

    // Invert Kubelka-Munk F(R) = (1 - R)^2 / (2R)  =>  R = 1 + F - sqrt(F^2 + 2F)
    const R_inf = 1 + F - Math.sqrt(F * F + 2 * F);
    const noise = 0.08 * Math.sin(lam * 0.17) + 0.04 * Math.cos(lam * 0.31);
    const percentR = Math.min(98.5, Math.max(2.0, R_inf * 100 + noise));

    wavelengthNm.push(Number(lam.toFixed(1)));
    signalY.push(Number(percentR.toFixed(3)));
  }

  return { wavelengthNm, signalY };
}

const znoFilm = buildThinFilmAbsorbanceSpectrum({
  lambdaMin: 290,
  lambdaMax: 850,
  stepNm: 2,
  egEv: 3.26,
  nExponent: 0.5,
  thicknessNm: 250,
  alphaScaleCm: 1.45e5,
  urbachEv: 0.055,
  baselineAbs: 0.025
});

const tio2Drs = buildDrsReflectanceSpectrum({
  lambdaMin: 270,
  lambdaMax: 800,
  stepNm: 2,
  egEv: 3.20,
  nExponent: 2.0,
  kmScale: 4.2,
  urbachEv: 0.06,
  baselineF: 0.004
});

const mapbi3Film = buildThinFilmAbsorbanceSpectrum({
  lambdaMin: 400,
  lambdaMax: 980,
  stepNm: 2.5,
  egEv: 1.59,
  nExponent: 0.5,
  thicknessNm: 320,
  alphaScaleCm: 1.15e5,
  urbachEv: 0.042,
  baselineAbs: 0.03
});

const bivo4Drs = buildDrsReflectanceSpectrum({
  lambdaMin: 320,
  lambdaMax: 850,
  stepNm: 2,
  egEv: 2.42,
  nExponent: 0.5,
  kmScale: 3.8,
  urbachEv: 0.05,
  baselineF: 0.005
});

const gC3N4Drs = buildDrsReflectanceSpectrum({
  lambdaMin: 290,
  lambdaMax: 750,
  stepNm: 2,
  egEv: 2.71,
  nExponent: 2.0,
  kmScale: 3.5,
  urbachEv: 0.065,
  baselineF: 0.005
});

const cdseFilm = buildThinFilmAbsorbanceSpectrum({
  lambdaMin: 380,
  lambdaMax: 950,
  stepNm: 2.5,
  egEv: 1.74,
  nExponent: 0.5,
  thicknessNm: 180,
  alphaScaleCm: 1.25e5,
  urbachEv: 0.048,
  baselineAbs: 0.02
});

export const UVVIS_SAMPLE_DATASETS: UVVisSampleDataset[] = [
  {
    id: 'zno-thin-film',
    name: 'ZnO Thin Film (250 nm)',
    subtitle: 'Thin Film • Absorbance',
    materialFormula: 'ZnO (Wurtzite)',
    measurementMode: 'thin-film',
    inputSignalType: 'absorbance',
    defaultThicknessNm: 250,
    defaultTransition: 'direct-allowed',
    referenceEgEv: 3.26,
    notes: 'Sputtered wurtzite ZnO thin film on quartz substrate (t = 250 nm, direct allowed Eg ≈ 3.26 eV).',
    wavelengthNm: znoFilm.wavelengthNm,
    signalY: znoFilm.signalY
  },
  {
    id: 'tio2-anatase-drs',
    name: 'TiO₂ Anatase Powder (DRS)',
    subtitle: 'DRS • % Reflectance',
    materialFormula: 'TiO₂ (Anatase)',
    measurementMode: 'drs',
    inputSignalType: 'reflectance',
    defaultThicknessNm: 500,
    defaultTransition: 'indirect-allowed',
    referenceEgEv: 3.20,
    notes: 'Diffuse reflectance spectrum (%R) of anatase TiO₂ nanoparticles evaluated via Kubelka-Munk function F(R∞).',
    wavelengthNm: tio2Drs.wavelengthNm,
    signalY: tio2Drs.signalY
  },
  {
    id: 'mapbi3-perovskite-film',
    name: 'MAPbI₃ Perovskite (320 nm)',
    subtitle: 'Thin Film • UV-Vis-NIR',
    materialFormula: 'CH₃NH₃PbI₃',
    measurementMode: 'thin-film',
    inputSignalType: 'absorbance',
    defaultThicknessNm: 320,
    defaultTransition: 'direct-allowed',
    referenceEgEv: 1.59,
    notes: 'Spin-coated hybrid halide perovskite thin film exhibiting sharp NIR onset near 780 nm (Eg ≈ 1.59 eV).',
    wavelengthNm: mapbi3Film.wavelengthNm,
    signalY: mapbi3Film.signalY
  },
  {
    id: 'bivo4-powder-drs',
    name: 'BiVO₄ Photocatalyst (DRS)',
    subtitle: 'DRS • % Reflectance',
    materialFormula: 'm-BiVO₄',
    measurementMode: 'drs',
    inputSignalType: 'reflectance',
    defaultThicknessNm: 500,
    defaultTransition: 'direct-allowed',
    referenceEgEv: 2.42,
    notes: 'Monoclinic scheelite BiVO₄ powder diffuse reflectance spectrum with visible absorption edge at ~512 nm.',
    wavelengthNm: bivo4Drs.wavelengthNm,
    signalY: bivo4Drs.signalY
  },
  {
    id: 'gc3n4-nanosheets-drs',
    name: 'g-C₃N₄ Nanosheets (DRS)',
    subtitle: 'DRS • % Reflectance',
    materialFormula: 'g-C₃N₄',
    measurementMode: 'drs',
    inputSignalType: 'reflectance',
    defaultThicknessNm: 500,
    defaultTransition: 'indirect-allowed',
    referenceEgEv: 2.71,
    notes: 'Exfoliated graphitic carbon nitride powder DRS spectrum showing indirect band gap near 2.71 eV.',
    wavelengthNm: gC3N4Drs.wavelengthNm,
    signalY: gC3N4Drs.signalY
  },
  {
    id: 'cdse-thin-film',
    name: 'CdSe Thin Film (180 nm)',
    subtitle: 'Thin Film • UV-Vis-NIR',
    materialFormula: 'CdSe',
    measurementMode: 'thin-film',
    inputSignalType: 'absorbance',
    defaultThicknessNm: 180,
    defaultTransition: 'direct-allowed',
    referenceEgEv: 1.74,
    notes: 'Thermally evaporated CdSe thin film (t = 180 nm) with direct optical band gap in the near-infrared (1.74 eV).',
    wavelengthNm: cdseFilm.wavelengthNm,
    signalY: cdseFilm.signalY
  }
];
