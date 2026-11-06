import { ReferenceMaterial, SampleDataset, VibrationalModeMatch } from '../types/spectrum';

export interface VibrationalEntry {
  id: string;
  mode: string;
  bond: string;
  materialGroup: string;
  referenceWavenumber: number;
  range: [number, number];
  description: string;
}

export const VIBRATIONAL_MODES_DB: VibrationalEntry[] = [
  // TiO2 / Metal Oxides
  {
    id: 'tio2-eg-1',
    mode: 'Eg (O–Ti–O symmetric bending)',
    bond: 'Ti–O',
    materialGroup: 'Anatase TiO₂ / Metal Oxide',
    referenceWavenumber: 144,
    range: [135, 155],
    description: 'Characteristic intense low-frequency Eg lattice mode of Anatase TiO₂.'
  },
  {
    id: 'tio2-eg-2',
    mode: 'Eg (Ti–O bending)',
    bond: 'Ti–O',
    materialGroup: 'Anatase TiO₂',
    referenceWavenumber: 197,
    range: [190, 208],
    description: 'Weak Eg vibrational mode of octahedral TiO₆ units.'
  },
  {
    id: 'tio2-b1g-1',
    mode: 'B1g (O–Ti–O bending)',
    bond: 'Ti–O',
    materialGroup: 'Anatase TiO₂',
    referenceWavenumber: 399,
    range: [388, 412],
    description: 'Symmetric B1g bending vibration in Anatase crystal lattice.'
  },
  {
    id: 'tio2-a1g-b1g',
    mode: 'A1g + B1g (Ti–O stretching doublet)',
    bond: 'Ti–O',
    materialGroup: 'Anatase TiO₂',
    referenceWavenumber: 516,
    range: [505, 528],
    description: 'Overlapping A1g and B1g antisymmetric Ti–O stretching modes.'
  },
  {
    id: 'tio2-eg-3',
    mode: 'Eg (Ti–O symmetric stretching)',
    bond: 'Ti–O',
    materialGroup: 'Anatase TiO₂',
    referenceWavenumber: 639,
    range: [625, 652],
    description: 'High-frequency Eg symmetric stretching vibration of TiO₆ octahedra.'
  },
  // Silicon & Semiconductors
  {
    id: 'si-2ta',
    mode: '2TA (Second-order transverse acoustic)',
    bond: 'Si–Si',
    materialGroup: 'Crystalline Silicon (c-Si)',
    referenceWavenumber: 302,
    range: [292, 312],
    description: 'Two-phonon transverse acoustic overtone in crystalline silicon.'
  },
  {
    id: 'si-lo-to',
    mode: 'F2g (First-order LO/TO phonon)',
    bond: 'Si–Si',
    materialGroup: 'Crystalline Silicon (c-Si)',
    referenceWavenumber: 520.7,
    range: [514, 527],
    description: 'Primary triply-degenerate zone-center optical phonon of c-Si; sensitive to tensile/compressive stress.'
  },
  {
    id: 'si-2to',
    mode: '2TO (Second-order optical overtone)',
    bond: 'Si–Si',
    materialGroup: 'Crystalline Silicon / SiO₂',
    referenceWavenumber: 965,
    range: [940, 990],
    description: 'Broad second-order transverse optical phonon band of silicon.'
  },
  // Carbon Nanomaterials (Graphene / CNT / DLC)
  {
    id: 'carbon-d',
    mode: 'D Band (A1g breathing mode of sp² rings)',
    bond: 'C–C (sp² defect)',
    materialGroup: 'Graphene / Carbon Nanotubes',
    referenceWavenumber: 1350,
    range: [1325, 1375],
    description: 'Disorder-induced ring breathing mode activated by structural defects or grain boundaries.'
  },
  {
    id: 'carbon-g',
    mode: 'G Band (E2g in-plane sp² C=C stretch)',
    bond: 'C=C (sp²)',
    materialGroup: 'Graphene / Graphite / Carbon',
    referenceWavenumber: 1582,
    range: [1568, 1600],
    description: 'Primary first-order in-plane bond stretching of pairs of sp² carbon atoms.'
  },
  {
    id: 'carbon-d-prime',
    mode: "D' Band (Intravalley defect scattering)",
    bond: 'C=C (disordered sp²)',
    materialGroup: 'Defective Graphene / Carbon',
    referenceWavenumber: 1620,
    range: [1612, 1630],
    description: 'Shoulder peak associated with high defect density or edge states.'
  },
  {
    id: 'carbon-2d',
    mode: '2D (G′) Band (Second-order two-phonon)',
    bond: 'C=C (sp² stacking)',
    materialGroup: 'Graphene / Graphite',
    referenceWavenumber: 2690,
    range: [2650, 2730],
    description: 'Second-order zone-boundary phonon; FWHM and position indicate graphene layer count.'
  },
  {
    id: 'carbon-d-plus-d',
    mode: 'D + D′ Combination Band',
    bond: 'C–C / C=C',
    materialGroup: 'Defective Graphene / GO',
    referenceWavenumber: 2935,
    range: [2910, 2960],
    description: 'Combination mode requiring defects for momentum conservation.'
  },
  // Organic / Aromatics / Polymers / Paracetamol / Benzenoid
  {
    id: 'org-c-c-aliphatic',
    mode: 'ν(C–C) Aliphatic Skeletal Stretch',
    bond: 'C–C',
    materialGroup: 'Organic / Polymer',
    referenceWavenumber: 858,
    range: [835, 880],
    description: 'Out-of-plane C–H wagging coupled with skeletal C–C stretching.'
  },
  {
    id: 'org-ring-breathing',
    mode: 'Aromatic Ring Breathing (ν₁₂)',
    bond: 'Aromatic C–C',
    materialGroup: 'Aromatic / Polystyrene / API',
    referenceWavenumber: 1001,
    range: [990, 1015],
    description: 'Very strong trigonal symmetric ring breathing mode of monosubstituted/para-substituted benzene.'
  },
  {
    id: 'org-ch-inplane',
    mode: 'δ(C–H) In-Plane Aromatic Deformation',
    bond: 'C–H (aryl)',
    materialGroup: 'Aromatic / Organic',
    referenceWavenumber: 1168,
    range: [1150, 1188],
    description: 'In-plane C–H bending vibration of aromatic rings.'
  },
  {
    id: 'org-amide-iii',
    mode: 'Amide III / ν(C–N) + δ(N–H)',
    bond: 'C–N / N–H',
    materialGroup: 'Amides / Paracetamol / Proteins',
    referenceWavenumber: 1237,
    range: [1220, 1265],
    description: 'Coupled C–N stretching and N–H in-plane bending mode (Amide III) or C–Oaryl stretch.'
  },
  {
    id: 'org-ch3-umb',
    mode: 'δs(CH₃) Symmetric Deformation',
    bond: '–CH₃',
    materialGroup: 'Organic / Acetamide',
    referenceWavenumber: 1324,
    range: [1310, 1340],
    description: 'Symmetric umbrella bending of methyl group coupled with aryl C–N.'
  },
  {
    id: 'org-ch2-sciss',
    mode: 'δ(CH₂) Scissoring / δas(CH₃)',
    bond: '–CH₂– / –CH₃',
    materialGroup: 'Polymers / Aliphatics',
    referenceWavenumber: 1450,
    range: [1435, 1475],
    description: 'Methylene scissoring or asymmetric methyl deformation.'
  },
  {
    id: 'org-aryl-cc',
    mode: 'ν(C=C) Aromatic Ring Stretch',
    bond: 'C=C (aryl)',
    materialGroup: 'Aromatics / Pharmaceuticals',
    referenceWavenumber: 1610,
    range: [1595, 1625],
    description: 'Quadrant stretching vibration of conjugated aromatic carbon ring.'
  },
  {
    id: 'org-amide-i',
    mode: 'Amide I / ν(C=O) Carbonyl Stretch',
    bond: 'C=O',
    materialGroup: 'Amides / Esters / Ketones',
    referenceWavenumber: 1648,
    range: [1635, 1690],
    description: 'Hydrogen-bonded carbonyl C=O stretching vibration (Amide I band).'
  },
  // Minerals (Calcite / Quartz)
  {
    id: 'min-calcite-lib',
    mode: 'Eg Translational Lattice Mode',
    bond: 'Ca²⁺–CO₃²⁻',
    materialGroup: 'Calcite (CaCO₃)',
    referenceWavenumber: 281,
    range: [272, 290],
    description: 'External librational lattice mode of carbonate ions relative to Ca²⁺.'
  },
  {
    id: 'min-quartz-a1',
    mode: 'A1 Symmetric Si–O–Si Bending',
    bond: 'Si–O–Si',
    materialGroup: 'α-Quartz (SiO₂)',
    referenceWavenumber: 464,
    range: [455, 475],
    description: 'Six-membered ring breathing mode of SiO₄ tetrahedra in α-Quartz.'
  },
  {
    id: 'min-co3-bend',
    mode: 'ν₄(Eg) In-Plane CO₃²⁻ Bending',
    bond: 'C–O',
    materialGroup: 'Carbonate Minerals (Calcite)',
    referenceWavenumber: 712,
    range: [705, 722],
    description: 'Doubly degenerate in-plane bending mode of carbonate anion.'
  },
  {
    id: 'min-co3-sym',
    mode: 'ν₁(A1g) Symmetric CO₃²⁻ Stretch',
    bond: 'C–O (CO₃²⁻)',
    materialGroup: 'Calcite / Carbonates',
    referenceWavenumber: 1085,
    range: [1075, 1096],
    description: 'Intense symmetric stretching vibration of planar carbonate group.'
  }
];

export const REFERENCE_MATERIALS: ReferenceMaterial[] = [
  {
    id: 'graphene',
    name: 'Defective Monolayer Graphene',
    formula: 'C (sp² honeycomb)',
    category: 'Carbon Nanomaterials',
    notes: 'Diagnostic D (1350 cm⁻¹), G (1582 cm⁻¹), and 2D (2690 cm⁻¹) bands used to quantify defect density (ID/IG) and layer thickness (I2D/IG).',
    peaks: [
      { wavenumber: 1350, relativeIntensity: 0.55, label: 'D Band (A1g)', symmetry: 'A1g' },
      { wavenumber: 1582, relativeIntensity: 1.0, label: 'G Band (E2g)', symmetry: 'E2g' },
      { wavenumber: 1620, relativeIntensity: 0.22, label: "D' Shoulder", symmetry: 'E2g' },
      { wavenumber: 2690, relativeIntensity: 0.78, label: '2D Band (G′)', symmetry: 'A1g' },
      { wavenumber: 2935, relativeIntensity: 0.16, label: 'D+D′ Mode', symmetry: 'Comb.' }
    ]
  },
  {
    id: 'anatase-tio2',
    name: 'Anatase Titanium Dioxide',
    formula: 'TiO₂ (Tetragonal I4₁/amd)',
    category: 'Metal Oxides',
    notes: 'Six Raman-active fundamental modes (A1g + 2B1g + 3Eg), dominated by the intense Eg phonon at 144 cm⁻¹.',
    peaks: [
      { wavenumber: 144, relativeIntensity: 1.0, label: 'Eg(1)', symmetry: 'Eg' },
      { wavenumber: 197, relativeIntensity: 0.08, label: 'Eg(2)', symmetry: 'Eg' },
      { wavenumber: 399, relativeIntensity: 0.38, label: 'B1g(1)', symmetry: 'B1g' },
      { wavenumber: 516, relativeIntensity: 0.34, label: 'A1g + B1g(2)', symmetry: 'A1g/B1g' },
      { wavenumber: 639, relativeIntensity: 0.48, label: 'Eg(3)', symmetry: 'Eg' }
    ]
  },
  {
    id: 'paracetamol',
    name: 'Paracetamol (Form I Monoclinic)',
    formula: 'C₈H₉NO₂',
    category: 'Pharmaceuticals / Organics',
    notes: 'Rich fingerprint region exhibiting para-substituted aryl ring breathing (858, 1168 cm⁻¹), Amide III (1237 cm⁻¹), aryl C=C (1610 cm⁻¹), and Amide I (1648 cm⁻¹).',
    peaks: [
      { wavenumber: 858, relativeIntensity: 0.72, label: 'ν(C–C) Skeletal', symmetry: 'Ag' },
      { wavenumber: 1168, relativeIntensity: 0.58, label: 'δ(C–H) Aryl', symmetry: 'Ag' },
      { wavenumber: 1237, relativeIntensity: 0.65, label: 'Amide III / ν(C–N)', symmetry: 'Ag' },
      { wavenumber: 1324, relativeIntensity: 0.82, label: 'δs(CH₃)', symmetry: 'Ag' },
      { wavenumber: 1610, relativeIntensity: 1.0, label: 'ν(C=C) Ring', symmetry: 'Ag' },
      { wavenumber: 1648, relativeIntensity: 0.68, label: 'Amide I ν(C=O)', symmetry: 'Ag' }
    ]
  },
  {
    id: 'silicon',
    name: 'Crystalline Silicon Wafer (100)',
    formula: 'c-Si (Fd3̄m)',
    category: 'Semiconductors',
    notes: 'Calibration standard with a sharp first-order optical phonon at 520.7 cm⁻¹ and second-order acoustic/optical overtones at 302 and 965 cm⁻¹.',
    peaks: [
      { wavenumber: 302, relativeIntensity: 0.14, label: '2TA Acoustic', symmetry: '2TA' },
      { wavenumber: 520.7, relativeIntensity: 1.0, label: 'LO/TO Phonon', symmetry: 'F2g' },
      { wavenumber: 965, relativeIntensity: 0.18, label: '2TO Overtone', symmetry: '2TO' }
    ]
  },
  {
    id: 'calcite',
    name: 'Calcite Carbonate Standard',
    formula: 'CaCO₃ (R3̄c)',
    category: 'Minerals',
    notes: 'Characterized by intense symmetric CO₃²⁻ stretching (ν₁ at 1085 cm⁻¹), in-plane bending (ν₄ at 712 cm⁻¹), and lattice libration at 281 cm⁻¹.',
    peaks: [
      { wavenumber: 281, relativeIntensity: 0.42, label: 'Lattice Eg', symmetry: 'Eg' },
      { wavenumber: 712, relativeIntensity: 0.24, label: 'ν₄(CO₃²⁻)', symmetry: 'Eg' },
      { wavenumber: 1085, relativeIntensity: 1.0, label: 'ν₁(CO₃²⁻)', symmetry: 'A1g' }
    ]
  }
];

export function matchVibrationalModes(
  wavenumber: number,
  customModesDb?: VibrationalEntry[]
): {
  bestMatch?: VibrationalModeMatch;
  alternatives: VibrationalModeMatch[];
} {
  const candidates: VibrationalModeMatch[] = [];
  const db = customModesDb && customModesDb.length > 0 ? customModesDb : VIBRATIONAL_MODES_DB;

  for (const entry of db) {
    const delta = wavenumber - entry.referenceWavenumber;
    const absDelta = Math.abs(delta);
    const inRange = wavenumber >= entry.range[0] && wavenumber <= entry.range[1];

    if (inRange || absDelta <= 32) {
      let confidence: 'High' | 'Moderate' | 'Candidate' = 'Candidate';
      if (absDelta <= 6 || (inRange && absDelta <= 10)) {
        confidence = 'High';
      } else if (inRange || absDelta <= 18) {
        confidence = 'Moderate';
      }

      candidates.push({
        id: entry.id,
        mode: entry.mode,
        bond: entry.bond,
        materialGroup: entry.materialGroup,
        referenceWavenumber: entry.referenceWavenumber,
        range: entry.range,
        shiftDelta: Number(delta.toFixed(1)),
        description: entry.description,
        confidence
      });
    }
  }

  candidates.sort((a, b) => Math.abs(a.shiftDelta) - Math.abs(b.shiftDelta));

  return {
    bestMatch: candidates[0],
    alternatives: candidates.slice(1, 4)
  };
}

// Helper to synthesize realistic noisy Raman spectra with fluorescence baseline
function generateSpectrum(
  xMin: number,
  xMax: number,
  step: number,
  peaks: { x0: number; amp: number; fwhm: number; lorentzFraction?: number }[],
  baselineFn: (x: number) => number,
  noiseAmp: number,
  seed = 42
): { x: number[]; y: number[] } {
  const x: number[] = [];
  const y: number[] = [];
  let s = seed;
  const rand = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296 - 0.5;
  };

  for (let wn = xMin; wn <= xMax; wn += step) {
    let val = baselineFn(wn);
    for (const p of peaks) {
      const lFrac = p.lorentzFraction ?? 0.65;
      const sigma = p.fwhm / 2.35482;
      const gamma = p.fwhm / 2;
      const gauss = Math.exp(-0.5 * Math.pow((wn - p.x0) / sigma, 2));
      const lorentz = 1 / (1 + Math.pow((wn - p.x0) / gamma, 2));
      val += p.amp * (lFrac * lorentz + (1 - lFrac) * gauss);
    }
    val += rand() * noiseAmp;
    x.push(Number(wn.toFixed(1)));
    y.push(Number(Math.max(10, val).toFixed(2)));
  }

  return { x, y };
}

const grapheneData = generateSpectrum(
  1000,
  3100,
  3,
  [
    { x0: 1351.2, amp: 520, fwhm: 42, lorentzFraction: 0.75 },
    { x0: 1583.4, amp: 960, fwhm: 28, lorentzFraction: 0.8 },
    { x0: 1621.0, amp: 195, fwhm: 22, lorentzFraction: 0.7 },
    { x0: 2688.5, amp: 740, fwhm: 54, lorentzFraction: 0.85 },
    { x0: 2936.0, amp: 145, fwhm: 60, lorentzFraction: 0.5 }
  ],
  (x) => 180 + 0.085 * (x - 1000) - 0.000028 * Math.pow(x - 1000, 2),
  22,
  101
);

const anataseData = generateSpectrum(
  80,
  900,
  1.5,
  [
    { x0: 144.3, amp: 1250, fwhm: 15, lorentzFraction: 0.85 },
    { x0: 197.2, amp: 95, fwhm: 18, lorentzFraction: 0.7 },
    { x0: 398.6, amp: 470, fwhm: 24, lorentzFraction: 0.75 },
    { x0: 515.8, amp: 425, fwhm: 27, lorentzFraction: 0.65 },
    { x0: 639.1, amp: 590, fwhm: 26, lorentzFraction: 0.8 }
  ],
  (x) => 140 + 180 * Math.exp(-(x - 80) / 380) + 0.04 * x,
  18,
  202
);

const paracetamolData = generateSpectrum(
  750,
  1780,
  2,
  [
    { x0: 857.8, amp: 690, fwhm: 16, lorentzFraction: 0.6 },
    { x0: 1168.4, amp: 540, fwhm: 18, lorentzFraction: 0.6 },
    { x0: 1236.9, amp: 620, fwhm: 20, lorentzFraction: 0.65 },
    { x0: 1324.2, amp: 790, fwhm: 19, lorentzFraction: 0.7 },
    { x0: 1609.6, amp: 950, fwhm: 18, lorentzFraction: 0.75 },
    { x0: 1648.5, amp: 650, fwhm: 21, lorentzFraction: 0.6 }
  ],
  (x) => 220 + 0.25 * (x - 750) - 0.00014 * Math.pow(x - 750, 2),
  19,
  303
);

const siliconData = generateSpectrum(
  150,
  1150,
  2,
  [
    { x0: 301.8, amp: 155, fwhm: 28, lorentzFraction: 0.5 },
    { x0: 520.6, amp: 1380, fwhm: 11.5, lorentzFraction: 0.9 },
    { x0: 964.2, amp: 210, fwhm: 58, lorentzFraction: 0.4 }
  ],
  (x) => 95 + 0.05 * x,
  14,
  404
);

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: 'sample-graphene',
    name: 'CVD Graphene on SiO₂',
    subtitle: 'D, G & 2D Carbon Modes',
    laserWavelength: '532 nm',
    referenceId: 'graphene',
    x: grapheneData.x,
    y: grapheneData.y
  },
  {
    id: 'sample-anatase',
    name: 'Anatase TiO₂ Nanopowder',
    subtitle: 'Eg, B1g & A1g Phonons',
    laserWavelength: '532 nm',
    referenceId: 'anatase-tio2',
    x: anataseData.x,
    y: anataseData.y
  },
  {
    id: 'sample-paracetamol',
    name: 'Paracetamol (Form I)',
    subtitle: 'Aryl & Amide Fingerprint',
    laserWavelength: '785 nm',
    referenceId: 'paracetamol',
    x: paracetamolData.x,
    y: paracetamolData.y
  },
  {
    id: 'sample-silicon',
    name: 'c-Si (100) Calibration',
    subtitle: '520.7 cm⁻¹ Optical Phonon',
    laserWavelength: '532 nm',
    referenceId: 'silicon',
    x: siliconData.x,
    y: siliconData.y
  }
];
