import {
  PLEmissionOriginCategory,
  PLMaterialReference,
  PLSampleDataset,
  PLTransitionMatch
} from '../types/pl';

export interface PLDatabaseTransitionEntry {
  id: string;
  materialSystem: string;
  transitionLabel: string;
  originCategory: PLEmissionOriginCategory;
  shortCode: string;
  referenceNm: number;
  referenceEv: number;
  rangeNm: [number, number];
  physicalMechanism: string;
}

export const PL_TRANSITIONS_DB: PLDatabaseTransitionEntry[] = [
  // --- ZnO (Wurtzite Zinc Oxide) ---
  {
    id: 'zno-fx-nbe',
    materialSystem: 'ZnO',
    transitionLabel: 'Free Exciton (FX / NBE)',
    originCategory: 'NBE / Excitonic',
    shortCode: 'FX (NBE)',
    referenceNm: 380.0,
    referenceEv: 3.263,
    rangeNm: [372, 386],
    physicalMechanism: 'Radiative recombination of free A-excitons across the direct wurtzite bandgap (E_b = 60 meV)'
  },
  {
    id: 'zno-fx-1lo',
    materialSystem: 'ZnO',
    transitionLabel: 'FX–1LO Phonon Replica & Zn_i Shallow Donor',
    originCategory: 'Phonon / Vibronic',
    shortCode: 'FX-1LO / Zn_i',
    referenceNm: 392.0,
    referenceEv: 3.163,
    rangeNm: [386.5, 405],
    physicalMechanism: 'First longitudinal optical phonon replica (E_LO ≈ 72 meV) coupled with shallow zinc interstitial (Zn_i) donor state'
  },
  {
    id: 'zno-vo-green',
    materialSystem: 'ZnO',
    transitionLabel: 'Oxygen Vacancy (V_O) Deep-Level Green Band',
    originCategory: 'Defect / Deep-Level',
    shortCode: 'V_O Green Defect',
    referenceNm: 520.0,
    referenceEv: 2.384,
    rangeNm: [495, 545],
    physicalMechanism: 'Singly ionized oxygen vacancy (V_O•) radiative recombination with photoexcited valence band holes'
  },
  {
    id: 'zno-oi-yellow',
    materialSystem: 'ZnO',
    transitionLabel: 'Oxygen Interstitial (O_i) Yellow-Orange Defect',
    originCategory: 'Defect / Deep-Level',
    shortCode: 'O_i Defect',
    referenceNm: 575.0,
    referenceEv: 2.156,
    rangeNm: [548, 605],
    physicalMechanism: 'Deep acceptor oxygen interstitial (O_i) / hydroxyl surface trap transition'
  },

  // --- Monolayer MoS2 (2D TMD) ---
  {
    id: 'mos2-b-exciton',
    materialSystem: 'MoS₂ (1L)',
    transitionLabel: 'B⁰ Spin-Orbit Split Exciton (K-Valley)',
    originCategory: 'NBE / Excitonic',
    shortCode: 'B⁰ Exciton',
    referenceNm: 612.0,
    referenceEv: 2.026,
    rangeNm: [600, 628],
    physicalMechanism: 'Direct K-valley transition from lower valence band split by Mo 4d spin-orbit coupling (Δ_SO ≈ 150 meV)'
  },
  {
    id: 'mos2-a-exciton',
    materialSystem: 'MoS₂ (1L)',
    transitionLabel: 'Neutral A⁰ Exciton (Direct K-Valley)',
    originCategory: 'NBE / Excitonic',
    shortCode: 'A⁰ Exciton',
    referenceNm: 658.0,
    referenceEv: 1.884,
    rangeNm: [648, 666],
    physicalMechanism: 'Direct K–K′ optical transition of neutral two-body exciton in monolayer MoS₂'
  },
  {
    id: 'mos2-a-trion',
    materialSystem: 'MoS₂ (1L)',
    transitionLabel: 'Negative Trion (A⁻ Charged Exciton)',
    originCategory: 'NBE / Excitonic',
    shortCode: 'A⁻ Trion',
    referenceNm: 673.0,
    referenceEv: 1.842,
    rangeNm: [666.5, 688],
    physicalMechanism: 'Three-body negatively charged exciton (2e⁻ + 1h⁺) with ~35–42 meV trion binding energy'
  },
  {
    id: 'mos2-defect-bound',
    materialSystem: 'MoS₂ (1L)',
    transitionLabel: 'Sulfur Vacancy (V_S) Bound Exciton (X_D)',
    originCategory: 'Defect / Deep-Level',
    shortCode: 'X_D (V_S)',
    referenceNm: 715.0,
    referenceEv: 1.734,
    rangeNm: [695, 745],
    physicalMechanism: 'Exciton localized at monosulfur vacancy (V_S) mid-gap chalcogen defect sites'
  },

  // --- CsPbBr3 Perovskite Nanocrystals ---
  {
    id: 'cspbbr3-exciton',
    materialSystem: 'CsPbBr₃',
    transitionLabel: 'Band-Edge Free Exciton Emission',
    originCategory: 'NBE / Excitonic',
    shortCode: 'FX (CsPbBr₃)',
    referenceNm: 515.0,
    referenceEv: 2.407,
    rangeNm: [505, 522],
    physicalMechanism: 'Radiative recombination of quantum-confined band-edge excitons in orthorhombic/cubic CsPbBr₃ nanocrystals'
  },
  {
    id: 'cspbbr3-tail',
    materialSystem: 'CsPbBr₃',
    transitionLabel: 'Surface Br-Vacancy / Phonon-Coupled Tail',
    originCategory: 'Phonon / Vibronic',
    shortCode: 'Surface / LO Tail',
    referenceNm: 529.0,
    referenceEv: 2.344,
    rangeNm: [522.5, 545],
    physicalMechanism: 'Fröhlich longitudinal optical phonon coupling and shallow surface under-coordinated Pb²⁺ trap state'
  },

  // --- GaN Epilayer (Wurtzite Gallium Nitride) ---
  {
    id: 'gan-nbe',
    materialSystem: 'GaN',
    transitionLabel: 'Near-Band-Edge Free/Bound Exciton (FX / D⁰X)',
    originCategory: 'NBE / Excitonic',
    shortCode: 'FX / D⁰X (NBE)',
    referenceNm: 364.0,
    referenceEv: 3.406,
    rangeNm: [358, 371],
    physicalMechanism: 'Direct wurtzite GaN band-edge excitonic recombination at 3.41 eV'
  },
  {
    id: 'gan-dap',
    materialSystem: 'GaN',
    transitionLabel: 'Shallow Donor-Acceptor Pair (DAP)',
    originCategory: 'Phonon / Vibronic',
    shortCode: 'DAP / 1LO',
    referenceNm: 382.0,
    referenceEv: 3.246,
    rangeNm: [372, 396],
    physicalMechanism: 'Shallow Si_Ga / O_N donor to Mg/C acceptor pair transition and LO-phonon replica'
  },
  {
    id: 'gan-yl',
    materialSystem: 'GaN',
    transitionLabel: 'Yellow Luminescence (YL: V_Ga–O_N / C_N)',
    originCategory: 'Defect / Deep-Level',
    shortCode: 'YL Defect Band',
    referenceNm: 556.0,
    referenceEv: 2.230,
    rangeNm: [525, 590],
    physicalMechanism: 'Deep-level transition involving gallium vacancy complexes (V_Ga–O_N) or carbon-on-nitrogen (C_N) deep acceptors'
  },

  // --- CdSe/ZnS Core-Shell Quantum Dots ---
  {
    id: 'cdse-1s1s',
    materialSystem: 'CdSe/ZnS QDs',
    transitionLabel: '1S_e–1S_{3/2} Quantum-Confined Core Exciton',
    originCategory: 'NBE / Excitonic',
    shortCode: '1S_e–1S_h Core',
    referenceNm: 610.0,
    referenceEv: 2.033,
    rangeNm: [595, 625],
    physicalMechanism: 'Lowest-energy quantized electron-hole 1S_e–1S_{3/2} core excitonic emission'
  },
  {
    id: 'cdse-surface-trap',
    materialSystem: 'CdSe/ZnS QDs',
    transitionLabel: 'Interfacial Se²⁻ Surface Trap Emission',
    originCategory: 'Defect / Deep-Level',
    shortCode: 'Surface Trap',
    referenceNm: 646.0,
    referenceEv: 1.919,
    rangeNm: [628, 675],
    physicalMechanism: 'Radiative recombination through unpassivated interfacial chalcogen hole traps at the CdSe/ZnS boundary'
  },

  // --- MAPbI3 Hybrid Perovskite ---
  {
    id: 'mapbi3-bb',
    materialSystem: 'MAPbI₃',
    transitionLabel: 'Direct Band-to-Band Bimolecular Emission',
    originCategory: 'NBE / Excitonic',
    shortCode: 'Band-to-Band',
    referenceNm: 772.0,
    referenceEv: 1.606,
    rangeNm: [755, 784],
    physicalMechanism: 'Direct tetragonal-phase conduction-to-valence band radiative recombination of free carriers'
  },
  {
    id: 'mapbi3-trap',
    materialSystem: 'MAPbI₃',
    transitionLabel: 'Shallow Grain-Boundary I_i / V_I Trap Recombination',
    originCategory: 'Defect / Deep-Level',
    shortCode: 'Sub-Bandgap Trap',
    referenceNm: 798.0,
    referenceEv: 1.554,
    rangeNm: [785, 825],
    physicalMechanism: 'Photon recycling and radiative tail from shallow halide interstitial/vacancy grain-boundary states'
  }
];

export const PL_MATERIAL_REFERENCES: PLMaterialReference[] = [
  {
    id: 'zno-wurtzite-ref',
    name: 'ZnO Wurtzite Nanorods (NBE + V_O Defect)',
    formula: 'ZnO',
    category: 'Wide-Bandgap II–VI Oxide',
    bandgapEv: 3.37,
    bandgapNm: 368.0,
    excitonBindingMeV: 60,
    recommendedLaserNm: 325,
    transitions: [
      {
        wavelengthNm: 380.0,
        energyEv: 3.263,
        relativeIntensity: 1.0,
        transitionLabel: 'Free Exciton (FX / NBE)',
        originCategory: 'NBE / Excitonic',
        physicalMechanism: 'Direct wurtzite free exciton recombination'
      },
      {
        wavelengthNm: 392.0,
        energyEv: 3.163,
        relativeIntensity: 0.24,
        transitionLabel: 'FX–1LO Phonon Replica / Zn_i',
        originCategory: 'Phonon / Vibronic',
        physicalMechanism: 'LO-phonon-assisted free exciton emission'
      },
      {
        wavelengthNm: 520.0,
        energyEv: 2.384,
        relativeIntensity: 0.58,
        transitionLabel: 'Oxygen Vacancy (V_O) Green Defect Band',
        originCategory: 'Defect / Deep-Level',
        physicalMechanism: 'Singly ionized oxygen vacancy deep-level recombination'
      }
    ],
    notes:
      'In wurtzite ZnO (E_g = 3.37 eV, E_b = 60 meV), the integrated intensity ratio I_NBE / I_DLE between the UV free-exciton peak (~380 nm) and green V_O defect band (~520 nm) is the primary metric for stoichiometric crystal quality.'
  },
  {
    id: 'mos2-monolayer-ref',
    name: 'Monolayer MoS₂ (A⁰ Exciton, A⁻ Trion & B⁰)',
    formula: 'MoS₂ (1L)',
    category: '2D Transition Metal Dichalcogenide',
    bandgapEv: 1.90,
    bandgapNm: 652.5,
    excitonBindingMeV: 320,
    recommendedLaserNm: 532,
    transitions: [
      {
        wavelengthNm: 612.0,
        energyEv: 2.026,
        relativeIntensity: 0.22,
        transitionLabel: 'B⁰ Spin-Orbit Split Exciton',
        originCategory: 'NBE / Excitonic',
        physicalMechanism: 'K-valley spin-orbit split valence band transition'
      },
      {
        wavelengthNm: 658.0,
        energyEv: 1.884,
        relativeIntensity: 1.0,
        transitionLabel: 'Neutral A⁰ Exciton',
        originCategory: 'NBE / Excitonic',
        physicalMechanism: 'Primary K-valley neutral exciton emission'
      },
      {
        wavelengthNm: 673.0,
        energyEv: 1.842,
        relativeIntensity: 0.44,
        transitionLabel: 'Negative Trion (A⁻)',
        originCategory: 'NBE / Excitonic',
        physicalMechanism: 'Charged three-body trion (~42 meV below A⁰)'
      }
    ],
    notes:
      'Deconvoluting the A⁰ neutral exciton (~1.88 eV / 658 nm) from the lower-energy A⁻ negative trion shoulder (~1.84 eV / 673 nm) reveals substrate-induced n-type doping and electrostatic screening in 1L-MoS₂.'
  },
  {
    id: 'cspbbr3-nc-ref',
    name: 'CsPbBr₃ Perovskite Nanocrystals (Green Emitter)',
    formula: 'CsPbBr₃',
    category: 'All-Inorganic Halide Perovskite',
    bandgapEv: 2.43,
    bandgapNm: 510.2,
    excitonBindingMeV: 40,
    recommendedLaserNm: 405,
    transitions: [
      {
        wavelengthNm: 515.0,
        energyEv: 2.407,
        relativeIntensity: 1.0,
        transitionLabel: 'Band-Edge Exciton (FX)',
        originCategory: 'NBE / Excitonic',
        physicalMechanism: 'Radiative excitonic emission with Rec. 2020 pure green chromaticity'
      },
      {
        wavelengthNm: 529.0,
        energyEv: 2.344,
        relativeIntensity: 0.16,
        transitionLabel: 'LO-Phonon / Surface Br-Vacancy Tail',
        originCategory: 'Phonon / Vibronic',
        physicalMechanism: 'Low-energy asymmetric vibronic/trap tail'
      }
    ],
    notes:
      'CsPbBr₃ colloidal nanocrystals exhibit ultra-narrow emission around 515 nm (FWHM < 22 nm / ~90 meV) with >90% color purity near the CIE 1931 green perimeter.'
  },
  {
    id: 'gan-epilayer-ref',
    name: 'GaN Epilayer on Sapphire (NBE + Yellow Luminescence)',
    formula: 'GaN',
    category: 'III-Nitride Wide-Bandgap Semiconductor',
    bandgapEv: 3.44,
    bandgapNm: 360.4,
    excitonBindingMeV: 25,
    recommendedLaserNm: 325,
    transitions: [
      {
        wavelengthNm: 364.0,
        energyEv: 3.406,
        relativeIntensity: 1.0,
        transitionLabel: 'Near-Band-Edge Exciton (FX / D⁰X)',
        originCategory: 'NBE / Excitonic',
        physicalMechanism: 'Wurtzite GaN band-edge excitonic peak'
      },
      {
        wavelengthNm: 382.0,
        energyEv: 3.246,
        relativeIntensity: 0.25,
        transitionLabel: 'Donor-Acceptor Pair (DAP)',
        originCategory: 'Phonon / Vibronic',
        physicalMechanism: 'Shallow donor-acceptor pair recombination'
      },
      {
        wavelengthNm: 556.0,
        energyEv: 2.230,
        relativeIntensity: 0.42,
        transitionLabel: 'Yellow Luminescence (V_Ga–O_N / C_N)',
        originCategory: 'Defect / Deep-Level',
        physicalMechanism: 'Deep acceptor defect band centered near 2.23 eV'
      }
    ],
    notes:
      'Room-temperature PL of MOCVD GaN shows a sharp UV NBE peak at 364 nm (3.41 eV) alongside the broad parasitic Yellow Luminescence (YL) band at ~556 nm (2.23 eV) caused by V_Ga complexes or C_N acceptors.'
  },
  {
    id: 'cdse-zns-qd-ref',
    name: 'CdSe/ZnS Core-Shell Quantum Dots (610 nm Red-Orange)',
    formula: 'CdSe/ZnS',
    category: 'II–VI Colloidal Quantum Dots',
    bandgapEv: 2.08,
    bandgapNm: 596.0,
    excitonBindingMeV: 110,
    recommendedLaserNm: 405,
    transitions: [
      {
        wavelengthNm: 610.0,
        energyEv: 2.033,
        relativeIntensity: 1.0,
        transitionLabel: '1S_e–1S_{3/2} Core Exciton',
        originCategory: 'NBE / Excitonic',
        physicalMechanism: 'Quantized core excitonic radiative transition'
      },
      {
        wavelengthNm: 646.0,
        energyEv: 1.919,
        relativeIntensity: 0.14,
        transitionLabel: 'Interfacial Se²⁻ Surface Trap State',
        originCategory: 'Defect / Deep-Level',
        physicalMechanism: 'Sub-bandgap interfacial shell trap emission'
      }
    ],
    notes:
      'Epitaxial ZnS shell passivation suppresses the broad red-shifted surface trap tail (~646 nm) and narrows the 1S_e–1S_{3/2} core exciton line width.'
  },
  {
    id: 'mapbi3-film-ref',
    name: 'MAPbI₃ Hybrid Perovskite Thin Film (NIR Photovoltaics)',
    formula: 'CH₃NH₃PbI₃',
    category: 'Hybrid Halide Perovskite',
    bandgapEv: 1.63,
    bandgapNm: 760.6,
    excitonBindingMeV: 16,
    recommendedLaserNm: 532,
    transitions: [
      {
        wavelengthNm: 772.0,
        energyEv: 1.606,
        relativeIntensity: 1.0,
        transitionLabel: 'Band-to-Band Free Carrier Emission',
        originCategory: 'NBE / Excitonic',
        physicalMechanism: 'Direct radiative recombination across the 1.61 eV bandgap'
      },
      {
        wavelengthNm: 798.0,
        energyEv: 1.554,
        relativeIntensity: 0.28,
        transitionLabel: 'Shallow Halide Vacancy/Interstitial Tail',
        originCategory: 'Defect / Deep-Level',
        physicalMechanism: 'Sub-bandgap trap-assisted and photon-recycled tail'
      }
    ],
    notes:
      'Steady-state PL of MAPbI₃ solar absorber films peaks near 772 nm (1.61 eV) with a low-energy shoulder (~798 nm) sensitive to grain-boundary halide defect passivation.'
  }
];

/**
 * Helper to match a fitted peak wavelength (nm) against the PL transition database.
 */
export function matchPLTransitions(
  centerNm: number,
  materialHint?: string
): {
  bestMatch?: PLTransitionMatch;
  alternatives: PLTransitionMatch[];
  inferredOrigin: PLEmissionOriginCategory;
} {
  const centerEv = 1239.84193 / Math.max(100, centerNm);
  const scored: { entry: PLDatabaseTransitionEntry; score: number }[] = [];

  for (const entry of PL_TRANSITIONS_DB) {
    const distNm = Math.abs(entry.referenceNm - centerNm);
    const inRange = centerNm >= entry.rangeNm[0] && centerNm <= entry.rangeNm[1];
    const hintMatch =
      materialHint &&
      (entry.materialSystem.toLowerCase().includes(materialHint.toLowerCase()) ||
        materialHint.toLowerCase().includes(entry.materialSystem.split(' ')[0].toLowerCase()));

    if (distNm <= 32 || inRange) {
      let score = 100 - distNm * 2.4;
      if (inRange) score += 18;
      if (hintMatch) score += 35;
      scored.push({ entry, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const toMatch = (item: { entry: PLDatabaseTransitionEntry; score: number }): PLTransitionMatch => {
    const distNm = Math.abs(item.entry.referenceNm - centerNm);
    const confidence: 'High' | 'Moderate' | 'Candidate' =
      distNm <= 6 ? 'High' : distNm <= 15 ? 'Moderate' : 'Candidate';
    return {
      ...item.entry,
      confidence
    };
  };

  const matches = scored.map(toMatch);
  const bestMatch = matches[0];
  const alternatives = matches.slice(1, 4);

  const inferredOrigin: PLEmissionOriginCategory = bestMatch
    ? bestMatch.originCategory
    : centerEv >= 2.8
    ? 'NBE / Excitonic'
    : 'Defect / Deep-Level';

  return { bestMatch, alternatives, inferredOrigin };
}

/**
 * Synthesize realistic steady-state PL spectra with deterministic experimental shot noise.
 */
function buildSyntheticPLSpectrum(
  minNm: number,
  maxNm: number,
  stepNm: number,
  baselineFn: (nm: number) => number,
  peaks: { centerNm: number; amp: number; fwhmNm: number; lorentzFrac: number }[],
  seed: number
): { wavelengthNm: number[]; intensity: number[] } {
  const wavelengthNm: number[] = [];
  const intensity: number[] = [];

  let s = seed;
  const nextRand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296 - 0.5;
  };

  for (let nm = minNm; nm <= maxNm + 1e-6; nm += stepNm) {
    const w = Number(nm.toFixed(2));
    wavelengthNm.push(w);

    let signal = baselineFn(w);
    for (const p of peaks) {
      const sigma = p.fwhmNm / 2.35482;
      const gamma = p.fwhmNm / 2;
      const g = Math.exp(-0.5 * Math.pow((w - p.centerNm) / sigma, 2));
      const l = 1 / (1 + Math.pow((w - p.centerNm) / gamma, 2));
      signal += p.amp * ((1 - p.lorentzFrac) * g + p.lorentzFrac * l);
    }

    const noise = nextRand() * Math.sqrt(Math.max(25, signal)) * 0.45;
    intensity.push(Number(Math.max(10, signal + noise).toFixed(1)));
  }

  return { wavelengthNm, intensity };
}

export const PL_SAMPLE_DATASETS: PLSampleDataset[] = [
  (() => {
    const { wavelengthNm, intensity } = buildSyntheticPLSpectrum(
      345,
      650,
      1.5,
      (nm) => 115 + 0.08 * (nm - 345),
      [
        { centerNm: 380.0, amp: 8900, fwhmNm: 14.5, lorentzFrac: 0.35 },
        { centerNm: 392.5, amp: 2150, fwhmNm: 18.0, lorentzFrac: 0.30 },
        { centerNm: 520.0, amp: 5200, fwhmNm: 76.0, lorentzFrac: 0.15 }
      ],
      4101
    );
    return {
      id: 'pl-zno-nanorods',
      name: 'ZnO Nanorods (UV NBE + Green V_O Defect)',
      subtitle: '325 nm He-Cd • NBE / DLE Ratio',
      materialFormula: 'ZnO',
      laserWavelengthNm: 325,
      referenceBandgapEv: 3.37,
      temperatureK: 300,
      referenceId: 'zno-wurtzite-ref',
      defaultProminence: 0.06,
      defaultMinDistanceNm: 10,
      defaultVoigtMix: 25,
      notes:
        'Hydrothermal wurtzite ZnO nanorod array excited at 325 nm showing sharp near-band-edge (NBE) free-exciton emission at 380 nm (3.26 eV), a 1LO phonon replica shoulder at 392.5 nm, and a broad oxygen-vacancy (V_O) green defect band centered at 520 nm (2.38 eV).',
      wavelengthNm,
      intensity
    };
  })(),

  (() => {
    const { wavelengthNm, intensity } = buildSyntheticPLSpectrum(
      575,
      745,
      1.0,
      (nm) => 95 + 0.05 * (nm - 575),
      [
        { centerNm: 612.0, amp: 1850, fwhmNm: 24.0, lorentzFrac: 0.40 },
        { centerNm: 658.0, amp: 9400, fwhmNm: 16.5, lorentzFrac: 0.45 },
        { centerNm: 673.5, amp: 4100, fwhmNm: 22.0, lorentzFrac: 0.45 }
      ],
      5202
    );
    return {
      id: 'pl-mos2-monolayer',
      name: 'Monolayer MoS₂ (A⁰ Exciton & A⁻ Trion)',
      subtitle: '532 nm Exc. • K-Valley Excitons',
      materialFormula: 'MoS₂ (1L)',
      laserWavelengthNm: 532,
      referenceBandgapEv: 1.90,
      temperatureK: 300,
      referenceId: 'mos2-monolayer-ref',
      defaultProminence: 0.06,
      defaultMinDistanceNm: 11,
      defaultVoigtMix: 40,
      notes:
        'CVD-grown monolayer MoS₂ on SiO₂/Si showing the spin-orbit split B⁰ exciton at 612 nm (2.03 eV), primary neutral A⁰ exciton at 658 nm (1.88 eV), and negatively charged A⁻ trion shoulder at 673.5 nm (1.84 eV).',
      wavelengthNm,
      intensity
    };
  })(),

  (() => {
    const { wavelengthNm, intensity } = buildSyntheticPLSpectrum(
      460,
      585,
      0.8,
      (nm) => 80 + 0.04 * (nm - 460),
      [
        { centerNm: 515.0, amp: 11200, fwhmNm: 18.5, lorentzFrac: 0.25 },
        { centerNm: 529.0, amp: 1750, fwhmNm: 24.0, lorentzFrac: 0.25 }
      ],
      6303
    );
    return {
      id: 'pl-cspbbr3-nc',
      name: 'CsPbBr₃ Perovskite Nanocrystals (515 nm)',
      subtitle: '405 nm Exc. • Rec. 2020 Green',
      materialFormula: 'CsPbBr₃',
      laserWavelengthNm: 405,
      referenceBandgapEv: 2.43,
      temperatureK: 300,
      referenceId: 'cspbbr3-nc-ref',
      defaultProminence: 0.05,
      defaultMinDistanceNm: 10,
      defaultVoigtMix: 25,
      notes:
        'All-inorganic CsPbBr₃ perovskite nanocrystal film exhibiting ultra-pure green band-edge excitonic emission at 515.0 nm (2.41 eV) with a low-energy LO-phonon/surface trap tail at 529 nm.',
      wavelengthNm,
      intensity
    };
  })(),

  (() => {
    const { wavelengthNm, intensity } = buildSyntheticPLSpectrum(
      340,
      640,
      1.5,
      (nm) => 110 + 0.06 * (nm - 340),
      [
        { centerNm: 364.0, amp: 9600, fwhmNm: 11.5, lorentzFrac: 0.35 },
        { centerNm: 382.0, amp: 2300, fwhmNm: 17.0, lorentzFrac: 0.30 },
        { centerNm: 556.0, amp: 3950, fwhmNm: 82.0, lorentzFrac: 0.15 }
      ],
      7404
    );
    return {
      id: 'pl-gan-epilayer',
      name: 'GaN Epilayer (UV Band-Edge + Yellow Band)',
      subtitle: '325 nm Exc. • NBE vs. YL Defect',
      materialFormula: 'GaN',
      laserWavelengthNm: 325,
      referenceBandgapEv: 3.44,
      temperatureK: 300,
      referenceId: 'gan-epilayer-ref',
      defaultProminence: 0.06,
      defaultMinDistanceNm: 12,
      defaultVoigtMix: 30,
      notes:
        'Wurtzite GaN epilayer on c-plane sapphire displaying sharp UV band-edge emission at 364 nm (3.41 eV), shallow DAP replica at 382 nm, and the deep-level Yellow Luminescence (YL) band at 556 nm (2.23 eV).',
      wavelengthNm,
      intensity
    };
  })(),

  (() => {
    const { wavelengthNm, intensity } = buildSyntheticPLSpectrum(
      540,
      700,
      1.0,
      (nm) => 90 + 0.05 * (nm - 540),
      [
        { centerNm: 610.0, amp: 10400, fwhmNm: 26.0, lorentzFrac: 0.20 },
        { centerNm: 646.0, amp: 1450, fwhmNm: 38.0, lorentzFrac: 0.20 }
      ],
      8505
    );
    return {
      id: 'pl-cdse-zns-qd',
      name: 'CdSe/ZnS Core-Shell Quantum Dots (610 nm)',
      subtitle: '405 nm Exc. • 1Se–1Sh Core Exciton',
      materialFormula: 'CdSe/ZnS',
      laserWavelengthNm: 405,
      referenceBandgapEv: 2.08,
      temperatureK: 300,
      referenceId: 'cdse-zns-qd-ref',
      defaultProminence: 0.05,
      defaultMinDistanceNm: 16,
      defaultVoigtMix: 20,
      notes:
        'Colloidal CdSe/ZnS core-shell quantum dots emitting at 610 nm (2.03 eV) with a minor red-shifted interfacial trap band at 646 nm.',
      wavelengthNm,
      intensity
    };
  })(),

  (() => {
    const { wavelengthNm, intensity } = buildSyntheticPLSpectrum(
      700,
      855,
      1.0,
      (nm) => 105 + 0.04 * (nm - 700),
      [
        { centerNm: 772.0, amp: 9200, fwhmNm: 34.0, lorentzFrac: 0.30 },
        { centerNm: 798.5, amp: 2650, fwhmNm: 38.0, lorentzFrac: 0.30 }
      ],
      9606
    );
    return {
      id: 'pl-mapbi3-film',
      name: 'MAPbI₃ Perovskite Solar Absorber Film',
      subtitle: '532 nm Exc. • NIR Band-to-Band',
      materialFormula: 'CH₃NH₃PbI₃',
      laserWavelengthNm: 532,
      referenceBandgapEv: 1.63,
      temperatureK: 300,
      referenceId: 'mapbi3-film-ref',
      defaultProminence: 0.05,
      defaultMinDistanceNm: 16,
      defaultVoigtMix: 30,
      notes:
        'Solution-processed CH₃NH₃PbI₃ thin film showing strong near-infrared band-to-band radiative recombination at 772 nm (1.61 eV) and a shallow sub-bandgap grain-boundary tail at 798.5 nm (1.55 eV).',
      wavelengthNm,
      intensity
    };
  })()
];
