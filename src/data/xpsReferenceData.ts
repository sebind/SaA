import {
  XPSChemicalStateMatch,
  XPSCoreLevelReference,
  XPSSampleDataset
} from '../types/xps';

export interface XPSStateDatabaseEntry {
  id: string;
  coreLevel: string;
  element: string;
  stateLabel: string;
  oxidationState: string;
  bondEnvironment: string;
  referenceBeEv: number;
  rangeEv: [number, number];
  spinOrbitSplittingEv?: number;
  branchingRatio?: string;
  scofieldRsf: number;
}

export const XPS_CHEMICAL_STATES_DB: XPSStateDatabaseEntry[] = [
  // --- C 1s (RSF = 1.00) ---
  {
    id: 'c1s-carbide',
    coreLevel: 'C 1s',
    element: 'C',
    stateLabel: 'Metal Carbide (M–C)',
    oxidationState: 'C⁴⁻ / Carbide',
    bondEnvironment: 'TiC / WC / SiC lattice',
    referenceBeEv: 281.8,
    rangeEv: [281.0, 282.8],
    scofieldRsf: 1.0
  },
  {
    id: 'c1s-sp2',
    coreLevel: 'C 1s',
    element: 'C',
    stateLabel: 'C=C sp² (Graphitic)',
    oxidationState: '0 (sp²)',
    bondEnvironment: 'Aromatic / Delocalized sp² carbon',
    referenceBeEv: 284.5,
    rangeEv: [284.1, 284.75],
    scofieldRsf: 1.0
  },
  {
    id: 'c1s-sp3',
    coreLevel: 'C 1s',
    element: 'C',
    stateLabel: 'C–C / C–H sp³ (Adventitious)',
    oxidationState: '0 (sp³)',
    bondEnvironment: 'Aliphatic / Adventitious hydrocarbon',
    referenceBeEv: 284.8,
    rangeEv: [284.6, 285.3],
    scofieldRsf: 1.0
  },
  {
    id: 'c1s-cn',
    coreLevel: 'C 1s',
    element: 'C',
    stateLabel: 'C–N / C–OH (Hydroxyl / Amine)',
    oxidationState: '+1',
    bondEnvironment: 'Alcohol, phenol, or C–N bond',
    referenceBeEv: 286.1,
    rangeEv: [285.6, 286.45],
    scofieldRsf: 1.0
  },
  {
    id: 'c1s-co-epoxy',
    coreLevel: 'C 1s',
    element: 'C',
    stateLabel: 'C–O–C / C–OH (Epoxy / Ether)',
    oxidationState: '+1',
    bondEnvironment: 'Epoxide / Ether / Hydroxyl carbon',
    referenceBeEv: 286.6,
    rangeEv: [286.2, 287.2],
    scofieldRsf: 1.0
  },
  {
    id: 'c1s-carbonyl',
    coreLevel: 'C 1s',
    element: 'C',
    stateLabel: 'C=O (Carbonyl / Quinone)',
    oxidationState: '+2',
    bondEnvironment: 'Ketone, aldehyde, or quinone group',
    referenceBeEv: 288.1,
    rangeEv: [287.5, 288.6],
    scofieldRsf: 1.0
  },
  {
    id: 'c1s-carboxyl',
    coreLevel: 'C 1s',
    element: 'C',
    stateLabel: 'O–C=O (Carboxyl / Ester)',
    oxidationState: '+3',
    bondEnvironment: 'Carboxylic acid or ester carbon',
    referenceBeEv: 289.2,
    rangeEv: [288.7, 289.9],
    scofieldRsf: 1.0
  },
  {
    id: 'c1s-pi-satellite',
    coreLevel: 'C 1s',
    element: 'C',
    stateLabel: 'π–π* Shake-Up Satellite',
    oxidationState: 'Satellite',
    bondEnvironment: 'Delocalized aromatic ring excitation',
    referenceBeEv: 290.9,
    rangeEv: [290.1, 292.2],
    scofieldRsf: 1.0
  },

  // --- O 1s (RSF = 2.93) ---
  {
    id: 'o1s-lattice',
    coreLevel: 'O 1s',
    element: 'O',
    stateLabel: 'Lattice Oxygen (M–O²⁻)',
    oxidationState: 'O²⁻',
    bondEnvironment: 'Stoichiometric metal oxide (Ti–O, Zn–O)',
    referenceBeEv: 530.0,
    rangeEv: [529.3, 530.6],
    scofieldRsf: 2.93
  },
  {
    id: 'o1s-vacancy-oh',
    coreLevel: 'O 1s',
    element: 'O',
    stateLabel: 'O Vacancy / Surface –OH',
    oxidationState: 'O⁻ / –OH',
    bondEnvironment: 'Defective oxide / Chemisorbed hydroxyl',
    referenceBeEv: 531.5,
    rangeEv: [531.0, 532.1],
    scofieldRsf: 2.93
  },
  {
    id: 'o1s-adsorbed-h2o',
    coreLevel: 'O 1s',
    element: 'O',
    stateLabel: 'C–O / Adsorbed H₂O',
    oxidationState: 'Physisorbed / Organic O',
    bondEnvironment: 'Surface H₂O or organic C–O–C species',
    referenceBeEv: 532.8,
    rangeEv: [532.3, 533.8],
    scofieldRsf: 2.93
  },

  // --- Ti 2p (RSF = 7.91, ΔE_SO = 5.7 eV) ---
  {
    id: 'ti2p-metal-32',
    coreLevel: 'Ti 2p',
    element: 'Ti',
    stateLabel: 'Ti⁰ 2p₃/₂ (Metallic)',
    oxidationState: '0',
    bondEnvironment: 'Metallic Ti⁰',
    referenceBeEv: 454.0,
    rangeEv: [453.5, 454.7],
    spinOrbitSplittingEv: 6.1,
    branchingRatio: '2:1 (2p₃/₂ : 2p₁/₂)',
    scofieldRsf: 7.91
  },
  {
    id: 'ti2p-ti3-32',
    coreLevel: 'Ti 2p',
    element: 'Ti',
    stateLabel: 'Ti³⁺ 2p₃/₂ (Sub-oxide Defect)',
    oxidationState: '+3',
    bondEnvironment: 'Reduced Ti₂O₃ / Oxygen-vacancy site',
    referenceBeEv: 457.1,
    rangeEv: [456.4, 457.8],
    spinOrbitSplittingEv: 5.6,
    branchingRatio: '2:1 (2p₃/₂ : 2p₁/₂)',
    scofieldRsf: 7.91
  },
  {
    id: 'ti2p-ti4-32',
    coreLevel: 'Ti 2p',
    element: 'Ti',
    stateLabel: 'Ti⁴⁺ 2p₃/₂ (TiO₂)',
    oxidationState: '+4',
    bondEnvironment: 'Octahedral TiO₂ lattice',
    referenceBeEv: 458.7,
    rangeEv: [458.2, 459.3],
    spinOrbitSplittingEv: 5.7,
    branchingRatio: '2:1 (2p₃/₂ : 2p₁/₂)',
    scofieldRsf: 7.91
  },
  {
    id: 'ti2p-ti3-12',
    coreLevel: 'Ti 2p',
    element: 'Ti',
    stateLabel: 'Ti³⁺ 2p₁/₂ (Sub-oxide Doublet)',
    oxidationState: '+3',
    bondEnvironment: 'Spin-orbit partner of Ti³⁺ 2p₃/₂',
    referenceBeEv: 462.7,
    rangeEv: [462.0, 463.4],
    spinOrbitSplittingEv: 5.6,
    branchingRatio: '2:1 (2p₃/₂ : 2p₁/₂)',
    scofieldRsf: 7.91
  },
  {
    id: 'ti2p-ti4-12',
    coreLevel: 'Ti 2p',
    element: 'Ti',
    stateLabel: 'Ti⁴⁺ 2p₁/₂ (TiO₂ Doublet)',
    oxidationState: '+4',
    bondEnvironment: 'Spin-orbit partner of Ti⁴⁺ 2p₃/₂ (ΔE = 5.7 eV)',
    referenceBeEv: 464.4,
    rangeEv: [463.9, 465.1],
    spinOrbitSplittingEv: 5.7,
    branchingRatio: '2:1 (2p₃/₂ : 2p₁/₂)',
    scofieldRsf: 7.91
  },

  // --- Mo 3d + S 2s (RSF = 9.50, ΔE_SO = 3.15 eV) ---
  {
    id: 's2s-sulfide',
    coreLevel: 'Mo 3d',
    element: 'S',
    stateLabel: 'S 2s (S²⁻ in MoS₂)',
    oxidationState: 'S²⁻ (−2)',
    bondEnvironment: 'Divalent sulfide overlapping Mo 3d region',
    referenceBeEv: 226.5,
    rangeEv: [225.8, 227.3],
    scofieldRsf: 1.43
  },
  {
    id: 'mo3d-mo4-52',
    coreLevel: 'Mo 3d',
    element: 'Mo',
    stateLabel: 'Mo⁴⁺ 3d₅/₂ (2H-MoS₂)',
    oxidationState: '+4',
    bondEnvironment: 'Trigonal prismatic Mo–S in 2H-MoS₂',
    referenceBeEv: 229.3,
    rangeEv: [228.8, 229.9],
    spinOrbitSplittingEv: 3.15,
    branchingRatio: '3:2 (3d₅/₂ : 3d₃/₂)',
    scofieldRsf: 9.5
  },
  {
    id: 'mo3d-mo4-32',
    coreLevel: 'Mo 3d',
    element: 'Mo',
    stateLabel: 'Mo⁴⁺ 3d₃/₂ (2H-MoS₂ Doublet)',
    oxidationState: '+4',
    bondEnvironment: 'Spin-orbit partner of Mo⁴⁺ 3d₅/₂ (ΔE = 3.15 eV)',
    referenceBeEv: 232.45,
    rangeEv: [231.9, 232.85],
    spinOrbitSplittingEv: 3.15,
    branchingRatio: '3:2 (3d₅/₂ : 3d₃/₂)',
    scofieldRsf: 9.5
  },
  {
    id: 'mo3d-mo6-52',
    coreLevel: 'Mo 3d',
    element: 'Mo',
    stateLabel: 'Mo⁶⁺ 3d₅/₂ (MoO₃ Oxide)',
    oxidationState: '+6',
    bondEnvironment: 'Surface oxidized MoO₃ / MoOₓ',
    referenceBeEv: 233.1,
    rangeEv: [232.85, 233.7],
    spinOrbitSplittingEv: 3.15,
    branchingRatio: '3:2 (3d₅/₂ : 3d₃/₂)',
    scofieldRsf: 9.5
  },
  {
    id: 'mo3d-mo6-32',
    coreLevel: 'Mo 3d',
    element: 'Mo',
    stateLabel: 'Mo⁶⁺ 3d₃/₂ (MoO₃ Doublet)',
    oxidationState: '+6',
    bondEnvironment: 'Spin-orbit partner of Mo⁶⁺ 3d₅/₂',
    referenceBeEv: 236.25,
    rangeEv: [235.6, 236.8],
    spinOrbitSplittingEv: 3.15,
    branchingRatio: '3:2 (3d₅/₂ : 3d₃/₂)',
    scofieldRsf: 9.5
  },

  // --- Si 2p (RSF = 0.817, ΔE_SO = 0.61 eV) ---
  {
    id: 'si2p-elemental',
    coreLevel: 'Si 2p',
    element: 'Si',
    stateLabel: 'Si⁰ 2p (Bulk Crystalline Si)',
    oxidationState: '0',
    bondEnvironment: 'Diamond cubic Si–Si substrate',
    referenceBeEv: 99.4,
    rangeEv: [98.9, 99.9],
    spinOrbitSplittingEv: 0.61,
    branchingRatio: '2:1 (2p₃/₂ : 2p₁/₂)',
    scofieldRsf: 0.817
  },
  {
    id: 'si2p-suboxide',
    coreLevel: 'Si 2p',
    element: 'Si',
    stateLabel: 'Si²⁺ / Si³⁺ (Interfacial SiOₓ)',
    oxidationState: '+2 / +3',
    bondEnvironment: 'Sub-stoichiometric Si₂O₃ / SiO interface',
    referenceBeEv: 101.8,
    rangeEv: [100.8, 102.6],
    scofieldRsf: 0.817
  },
  {
    id: 'si2p-sio2',
    coreLevel: 'Si 2p',
    element: 'Si',
    stateLabel: 'Si⁴⁺ 2p (Stoichiometric SiO₂)',
    oxidationState: '+4',
    bondEnvironment: 'Tetrahedral SiO₄ native / thermal oxide',
    referenceBeEv: 103.5,
    rangeEv: [102.9, 104.2],
    scofieldRsf: 0.817
  },

  // --- N 1s (RSF = 1.80) ---
  {
    id: 'n1s-pyridinic',
    coreLevel: 'N 1s',
    element: 'N',
    stateLabel: 'Pyridinic-N (C–N=C)',
    oxidationState: 'sp² Edge N',
    bondEnvironment: 'Six-membered ring edge nitrogen',
    referenceBeEv: 398.3,
    rangeEv: [397.8, 399.0],
    scofieldRsf: 1.8
  },
  {
    id: 'n1s-pyrrolic',
    coreLevel: 'N 1s',
    element: 'N',
    stateLabel: 'Pyrrolic-N / Amine (C–NH–C)',
    oxidationState: 'sp³ / 5-ring N',
    bondEnvironment: 'Five-membered ring or amine nitrogen',
    referenceBeEv: 399.9,
    rangeEv: [399.3, 400.5],
    scofieldRsf: 1.8
  },
  {
    id: 'n1s-graphitic',
    coreLevel: 'N 1s',
    element: 'N',
    stateLabel: 'Graphitic / Quaternary-N (N–C₃)',
    oxidationState: 'Substitutional N',
    bondEnvironment: 'Nitrogen substituting carbon in basal plane',
    referenceBeEv: 401.2,
    rangeEv: [400.7, 401.9],
    scofieldRsf: 1.8
  },
  {
    id: 'n1s-oxidized',
    coreLevel: 'N 1s',
    element: 'N',
    stateLabel: 'Oxidized-N (Pyridine-N⁺–O⁻)',
    oxidationState: '+1 / N–O',
    bondEnvironment: 'N-oxide functional group',
    referenceBeEv: 402.9,
    rangeEv: [402.2, 404.2],
    scofieldRsf: 1.8
  }
];

export const XPS_CORE_LEVEL_REFERENCES: XPSCoreLevelReference[] = [
  {
    id: 'c1s-go-ref',
    coreLevel: 'C 1s',
    element: 'C',
    name: 'Graphene Oxide / Functionalized Carbon (C 1s)',
    formula: 'C₁s (GO / rGO)',
    category: 'Carbon Nanomaterials',
    scofieldRsf: 1.0,
    spinOrbitSplittingEv: null,
    branchingRatioLabel: 'Singlet (1s, l = 0)',
    states: [
      {
        bindingEnergyEv: 284.5,
        relativeIntensity: 1.0,
        stateLabel: 'C=C sp² (Graphitic)',
        oxidationState: '0 (sp²)',
        bondEnvironment: 'Conjugated honeycomb lattice'
      },
      {
        bindingEnergyEv: 286.6,
        relativeIntensity: 0.58,
        stateLabel: 'C–O–C / C–OH (Epoxy & Hydroxyl)',
        oxidationState: '+1',
        bondEnvironment: 'Basal-plane epoxide and hydroxyl'
      },
      {
        bindingEnergyEv: 288.1,
        relativeIntensity: 0.28,
        stateLabel: 'C=O (Carbonyl)',
        oxidationState: '+2',
        bondEnvironment: 'Edge ketone / carbonyl'
      },
      {
        bindingEnergyEv: 289.2,
        relativeIntensity: 0.16,
        stateLabel: 'O–C=O (Carboxyl)',
        oxidationState: '+3',
        bondEnvironment: 'Edge carboxylic acid group'
      },
      {
        bindingEnergyEv: 290.9,
        relativeIntensity: 0.08,
        stateLabel: 'π–π* Satellite',
        oxidationState: 'Shake-up',
        bondEnvironment: 'Delocalized π-electron transition'
      }
    ],
    notes: 'Standard C 1s deconvolution benchmark for GO, rGO, and oxidized carbon surfaces.'
  },
  {
    id: 'ti2p-tio2-ref',
    coreLevel: 'Ti 2p',
    element: 'Ti',
    name: 'Anatase TiO₂ with Ti³⁺ Defects (Ti 2p)',
    formula: 'TiO₂₋ₓ (Ti 2p₃/₂ & 2p₁/₂)',
    category: 'Transition Metal Oxides',
    scofieldRsf: 7.91,
    spinOrbitSplittingEv: 5.7,
    branchingRatioLabel: '2:1 (2p₃/₂ : 2p₁/₂)',
    states: [
      {
        bindingEnergyEv: 457.1,
        relativeIntensity: 0.16,
        stateLabel: 'Ti³⁺ 2p₃/₂ (Defect)',
        oxidationState: '+3',
        bondEnvironment: 'Oxygen vacancy adjacent Ti³⁺'
      },
      {
        bindingEnergyEv: 458.7,
        relativeIntensity: 1.0,
        stateLabel: 'Ti⁴⁺ 2p₃/₂ (TiO₂)',
        oxidationState: '+4',
        bondEnvironment: 'Octahedral Ti⁴⁺ lattice'
      },
      {
        bindingEnergyEv: 462.7,
        relativeIntensity: 0.08,
        stateLabel: 'Ti³⁺ 2p₁/₂ (Defect)',
        oxidationState: '+3',
        bondEnvironment: 'Spin-orbit partner of Ti³⁺ 2p₃/₂'
      },
      {
        bindingEnergyEv: 464.4,
        relativeIntensity: 0.5,
        stateLabel: 'Ti⁴⁺ 2p₁/₂ (TiO₂)',
        oxidationState: '+4',
        bondEnvironment: 'Spin-orbit partner of Ti⁴⁺ 2p₃/₂ (ΔE = 5.7 eV)'
      }
    ],
    notes: 'Ti 2p spin-orbit doublet showing 5.72 eV splitting and 2:1 area ratio between 2p₃/₂ and 2p₁/₂.'
  },
  {
    id: 'mo3d-mos2-ref',
    coreLevel: 'Mo 3d',
    element: 'Mo',
    name: '2H-MoS₂ with Surface MoO₃ Oxidation (Mo 3d + S 2s)',
    formula: 'MoS₂ / MoO₃ (Mo 3d)',
    category: '2D Transition Metal Dichalcogenides',
    scofieldRsf: 9.5,
    spinOrbitSplittingEv: 3.15,
    branchingRatioLabel: '3:2 (3d₅/₂ : 3d₃/₂)',
    states: [
      {
        bindingEnergyEv: 226.5,
        relativeIntensity: 0.28,
        stateLabel: 'S 2s (S²⁻)',
        oxidationState: '−2',
        bondEnvironment: 'Sulfide S 2s core level'
      },
      {
        bindingEnergyEv: 229.3,
        relativeIntensity: 1.0,
        stateLabel: 'Mo⁴⁺ 3d₅/₂ (MoS₂)',
        oxidationState: '+4',
        bondEnvironment: '2H-MoS₂ lattice'
      },
      {
        bindingEnergyEv: 232.45,
        relativeIntensity: 0.67,
        stateLabel: 'Mo⁴⁺ 3d₃/₂ (MoS₂)',
        oxidationState: '+4',
        bondEnvironment: 'Spin-orbit partner (ΔE = 3.15 eV)'
      },
      {
        bindingEnergyEv: 233.1,
        relativeIntensity: 0.22,
        stateLabel: 'Mo⁶⁺ 3d₅/₂ (MoO₃)',
        oxidationState: '+6',
        bondEnvironment: 'Surface MoO₃ oxidation'
      },
      {
        bindingEnergyEv: 236.25,
        relativeIntensity: 0.15,
        stateLabel: 'Mo⁶⁺ 3d₃/₂ (MoO₃)',
        oxidationState: '+6',
        bondEnvironment: 'Spin-orbit partner of Mo⁶⁺ 3d₅/₂'
      }
    ],
    notes: 'Mo 3d region requires simultaneous fitting of the S 2s singlet (~226.5 eV) and Mo⁴⁺ / Mo⁶⁺ 3d doublets (ΔE = 3.15 eV, 3:2 ratio).'
  },
  {
    id: 'o1s-oxide-ref',
    coreLevel: 'O 1s',
    element: 'O',
    name: 'Metal Oxide Lattice, Vacancy & Hydroxyl (O 1s)',
    formula: 'MOₓ (O 1s)',
    category: 'Metal Oxides & Catalysts',
    scofieldRsf: 2.93,
    spinOrbitSplittingEv: null,
    branchingRatioLabel: 'Singlet (1s, l = 0)',
    states: [
      {
        bindingEnergyEv: 530.0,
        relativeIntensity: 1.0,
        stateLabel: 'Lattice Oxygen (O_L, M–O²⁻)',
        oxidationState: '−2',
        bondEnvironment: 'Crystalline metal-oxygen bond'
      },
      {
        bindingEnergyEv: 531.5,
        relativeIntensity: 0.48,
        stateLabel: 'Oxygen Vacancy / –OH (O_V)',
        oxidationState: 'Defect / –OH',
        bondEnvironment: 'Low-coordination oxygen at vacancy sites'
      },
      {
        bindingEnergyEv: 532.8,
        relativeIntensity: 0.22,
        stateLabel: 'Adsorbed H₂O / C–O (O_ads)',
        oxidationState: 'Physisorbed',
        bondEnvironment: 'Chemisorbed water or organic oxygen'
      }
    ],
    notes: 'Three-component O 1s resolution used to quantify surface oxygen vacancy ratio (O_V / O_L).'
  },
  {
    id: 'si2p-sio2-ref',
    coreLevel: 'Si 2p',
    element: 'Si',
    name: 'Ultrathin SiO₂ / Si(100) Interface (Si 2p)',
    formula: 'SiO₂ / Si⁰ (Si 2p)',
    category: 'Semiconductor Interfaces',
    scofieldRsf: 0.817,
    spinOrbitSplittingEv: 0.61,
    branchingRatioLabel: '2:1 (2p₃/₂ : 2p₁/₂)',
    states: [
      {
        bindingEnergyEv: 99.4,
        relativeIntensity: 1.0,
        stateLabel: 'Si⁰ 2p (Bulk Si)',
        oxidationState: '0',
        bondEnvironment: 'Elemental Si(100) substrate'
      },
      {
        bindingEnergyEv: 101.8,
        relativeIntensity: 0.22,
        stateLabel: 'Si²⁺ / Si³⁺ (Sub-oxide SiOₓ)',
        oxidationState: '+2 / +3',
        bondEnvironment: 'Interfacial transition layer'
      },
      {
        bindingEnergyEv: 103.5,
        relativeIntensity: 0.68,
        stateLabel: 'Si⁴⁺ 2p (Stoichiometric SiO₂)',
        oxidationState: '+4',
        bondEnvironment: 'Thermal / native SiO₂ overlayer'
      }
    ],
    notes: 'Chemical shift of +4.1 eV between elemental Si⁰ (99.4 eV) and full oxide Si⁴⁺ (103.5 eV).'
  },
  {
    id: 'n1s-ndoped-ref',
    coreLevel: 'N 1s',
    element: 'N',
    name: 'N-Doped Graphene Electrocatalyst (N 1s)',
    formula: 'N-C (N 1s)',
    category: 'Electrocatalysts',
    scofieldRsf: 1.8,
    spinOrbitSplittingEv: null,
    branchingRatioLabel: 'Singlet (1s, l = 0)',
    states: [
      {
        bindingEnergyEv: 398.3,
        relativeIntensity: 0.82,
        stateLabel: 'Pyridinic-N',
        oxidationState: 'sp² Edge',
        bondEnvironment: 'Active ORR/HER edge site'
      },
      {
        bindingEnergyEv: 399.9,
        relativeIntensity: 0.65,
        stateLabel: 'Pyrrolic-N',
        oxidationState: '5-Ring N',
        bondEnvironment: 'Five-membered heterocycle'
      },
      {
        bindingEnergyEv: 401.2,
        relativeIntensity: 1.0,
        stateLabel: 'Graphitic-N',
        oxidationState: 'Quaternary N',
        bondEnvironment: 'Basal-plane n-type dopant'
      },
      {
        bindingEnergyEv: 402.9,
        relativeIntensity: 0.25,
        stateLabel: 'Oxidized-N (N⁺–O⁻)',
        oxidationState: '+1',
        bondEnvironment: 'Pyridine N-oxide'
      }
    ],
    notes: 'Quantifies active Pyridinic-N vs Graphitic-N catalytic sites in heteroatom-doped carbons.'
  }
];

/**
 * Helper to synthesize realistic high-resolution XPS core-level spectra
 * with Pseudo-Voigt GL(30) components + authentic Shirley inelastic background step.
 */
function buildSyntheticXPSSpectrum(
  beMin: number,
  beMax: number,
  numPoints: number,
  components: { center: number; amp: number; fwhm: number; glMix?: number }[],
  baseCps: number,
  shirleyStepCps: number
): { bindingEnergyEv: number[]; intensityCps: number[] } {
  const bindingEnergyEv: number[] = [];
  const purePeaks: number[] = [];

  for (let i = 0; i < numPoints; i++) {
    const be = Number((beMin + ((beMax - beMin) * i) / (numPoints - 1)).toFixed(3));
    bindingEnergyEv.push(be);

    let yPeak = 0;
    for (const c of components) {
      const m = (c.glMix ?? 30) / 100;
      const sigma = c.fwhm / 2.35482;
      const gamma = c.fwhm / 2;
      const g = Math.exp(-0.5 * Math.pow((be - c.center) / sigma, 2));
      const l = 1 / (1 + Math.pow((be - c.center) / gamma, 2));
      yPeak += c.amp * ((1 - m) * g + m * l);
    }
    purePeaks.push(yPeak);
  }

  // Cumulative area from low BE to high BE (since electrons at higher BE suffered inelastic loss from lower BE photoelectrons)
  const cumulativeFromRight: number[] = new Array(numPoints).fill(0);
  let totalArea = 0;
  for (let i = 0; i < numPoints; i++) {
    totalArea += purePeaks[i];
    cumulativeFromRight[i] = totalArea;
  }
  const normArea = totalArea || 1;

  const intensityCps = bindingEnergyEv.map((be, i) => {
    const shirleyBg = baseCps + shirleyStepCps * (cumulativeFromRight[i] / normArea);
    // Deterministic gentle ripple to mimic experimental counting statistics
    const noise =
      Math.sin(be * 17.3) * (shirleyStepCps * 0.008) +
      Math.cos(be * 31.7) * (shirleyStepCps * 0.005);
    return Number((purePeaks[i] + shirleyBg + noise).toFixed(1));
  });

  return { bindingEnergyEv, intensityCps };
}

const c1sGoData = buildSyntheticXPSSpectrum(
  281.0,
  293.0,
  260,
  [
    { center: 284.5, amp: 42000, fwhm: 1.15, glMix: 30 }, // C=C sp2
    { center: 286.6, amp: 24500, fwhm: 1.28, glMix: 30 }, // C-O epoxy/hydroxyl
    { center: 288.1, amp: 11800, fwhm: 1.32, glMix: 30 }, // C=O carbonyl
    { center: 289.25, amp: 6800, fwhm: 1.35, glMix: 30 }, // O-C=O carboxyl
    { center: 290.9, amp: 3200, fwhm: 1.55, glMix: 35 } // pi-pi* shake-up
  ],
  4200,
  6400
);

const ti2pData = buildSyntheticXPSSpectrum(
  454.5,
  467.5,
  260,
  [
    { center: 457.1, amp: 7600, fwhm: 1.35, glMix: 30 }, // Ti3+ 2p3/2 defect
    { center: 458.7, amp: 54000, fwhm: 1.18, glMix: 30 }, // Ti4+ 2p3/2
    { center: 462.7, amp: 3800, fwhm: 1.55, glMix: 35 }, // Ti3+ 2p1/2
    { center: 464.4, amp: 26800, fwhm: 1.48, glMix: 35 } // Ti4+ 2p1/2 (Coster-Kronig broader)
  ],
  5500,
  9800
);

const mo3dData = buildSyntheticXPSSpectrum(
  224.0,
  238.5,
  280,
  [
    { center: 226.5, amp: 11200, fwhm: 1.45, glMix: 30 }, // S 2s
    { center: 229.3, amp: 46000, fwhm: 0.98, glMix: 30 }, // Mo4+ 3d5/2
    { center: 232.45, amp: 30600, fwhm: 1.02, glMix: 30 }, // Mo4+ 3d3/2
    { center: 233.2, amp: 9500, fwhm: 1.28, glMix: 30 }, // Mo6+ 3d5/2
    { center: 236.3, amp: 6300, fwhm: 1.32, glMix: 30 } // Mo6+ 3d3/2
  ],
  3800,
  7200
);

const o1sData = buildSyntheticXPSSpectrum(
  527.0,
  535.8,
  240,
  [
    { center: 530.0, amp: 48500, fwhm: 1.15, glMix: 30 }, // Lattice O2-
    { center: 531.5, amp: 23200, fwhm: 1.32, glMix: 30 }, // O vacancy / -OH
    { center: 532.85, amp: 10400, fwhm: 1.45, glMix: 30 } // Adsorbed H2O / C-O
  ],
  6100,
  8400
);

const si2pData = buildSyntheticXPSSpectrum(
  97.2,
  106.2,
  240,
  [
    { center: 99.4, amp: 39000, fwhm: 0.96, glMix: 25 }, // Si0 bulk
    { center: 101.8, amp: 8600, fwhm: 1.35, glMix: 25 }, // SiOx suboxide
    { center: 103.5, amp: 26800, fwhm: 1.38, glMix: 25 } // Si4+ SiO2
  ],
  2900,
  4500
);

const n1sData = buildSyntheticXPSSpectrum(
  395.8,
  405.2,
  240,
  [
    { center: 398.3, amp: 19500, fwhm: 1.2, glMix: 30 }, // Pyridinic-N
    { center: 399.9, amp: 15200, fwhm: 1.25, glMix: 30 }, // Pyrrolic-N
    { center: 401.25, amp: 24000, fwhm: 1.28, glMix: 30 }, // Graphitic-N
    { center: 402.95, amp: 5800, fwhm: 1.4, glMix: 30 } // Oxidized-N
  ],
  3100,
  4200
);

export const XPS_SAMPLE_DATASETS: XPSSampleDataset[] = [
  {
    id: 'xps-c1s-rgo',
    name: 'Reduced Graphene Oxide (C 1s)',
    subtitle: 'sp² C=C, C–O, C=O & O–C=O',
    coreLevel: 'C 1s',
    materialFormula: 'rGO / GO',
    xraySource: 'Al-Ka',
    passEnergyEv: 20,
    referenceId: 'c1s-go-ref',
    defaultChargeShiftEv: 0.0,
    defaultProminence: 0.06,
    defaultMinDistanceEv: 0.95,
    defaultGlMix: 30,
    notes:
      'High-resolution C 1s spectrum of partially reduced graphene oxide resolving sp² C=C (284.5 eV) and oxygenated functional groups.',
    bindingEnergyEv: c1sGoData.bindingEnergyEv,
    intensityCps: c1sGoData.intensityCps
  },
  {
    id: 'xps-ti2p-tio2',
    name: 'Defect-Engineered TiO₂₋ₓ (Ti 2p)',
    subtitle: 'Ti⁴⁺ Doublet + Ti³⁺ Vacancy Shoulder',
    coreLevel: 'Ti 2p',
    materialFormula: 'TiO₂₋ₓ',
    xraySource: 'Al-Ka',
    passEnergyEv: 20,
    referenceId: 'ti2p-tio2-ref',
    defaultChargeShiftEv: 0.0,
    defaultProminence: 0.06,
    defaultMinDistanceEv: 1.1,
    defaultGlMix: 30,
    notes:
      'Ti 2p spin-orbit doublet (2p₃/₂ at 458.7 eV, 2p₁/₂ at 464.4 eV, ΔE = 5.7 eV) with low-BE Ti³⁺ defect shoulder at 457.1 eV.',
    bindingEnergyEv: ti2pData.bindingEnergyEv,
    intensityCps: ti2pData.intensityCps
  },
  {
    id: 'xps-mo3d-mos2',
    name: 'Monolayer 2H-MoS₂ (Mo 3d + S 2s)',
    subtitle: 'Mo⁴⁺ Doublet, S 2s & Mo⁶⁺ Oxide',
    coreLevel: 'Mo 3d',
    materialFormula: 'MoS₂ / MoOₓ',
    xraySource: 'Al-Ka',
    passEnergyEv: 20,
    referenceId: 'mo3d-mos2-ref',
    defaultChargeShiftEv: 0.0,
    defaultProminence: 0.07,
    defaultMinDistanceEv: 0.75,
    defaultGlMix: 30,
    notes:
      'Mo 3d core-level region showing S 2s (226.5 eV), intrinsic 2H-MoS₂ Mo⁴⁺ doublet (229.3 / 232.45 eV), and minor Mo⁶⁺ oxidation.',
    bindingEnergyEv: mo3dData.bindingEnergyEv,
    intensityCps: mo3dData.intensityCps
  },
  {
    id: 'xps-o1s-oxide',
    name: 'Metal Oxide Catalyst (O 1s)',
    subtitle: 'Lattice O²⁻, O Vacancy & –OH',
    coreLevel: 'O 1s',
    materialFormula: 'TiO₂ / ZnO',
    xraySource: 'Al-Ka',
    passEnergyEv: 20,
    referenceId: 'o1s-oxide-ref',
    defaultChargeShiftEv: 0.0,
    defaultProminence: 0.08,
    defaultMinDistanceEv: 1.0,
    defaultGlMix: 30,
    notes:
      'O 1s core level resolved into lattice oxide O_L (530.0 eV), defect/vacancy O_V (531.5 eV), and surface chemisorbed H₂O (532.85 eV).',
    bindingEnergyEv: o1sData.bindingEnergyEv,
    intensityCps: o1sData.intensityCps
  },
  {
    id: 'xps-si2p-native',
    name: 'Native Oxide SiO₂ / Si(100) (Si 2p)',
    subtitle: 'Elemental Si⁰, Sub-oxide & Si⁴⁺',
    coreLevel: 'Si 2p',
    materialFormula: 'SiO₂ / Si',
    xraySource: 'Al-Ka',
    passEnergyEv: 20,
    referenceId: 'si2p-sio2-ref',
    defaultChargeShiftEv: 0.0,
    defaultProminence: 0.08,
    defaultMinDistanceEv: 1.1,
    defaultGlMix: 25,
    notes:
      'Si 2p core-level spectrum resolving bulk Si⁰ (99.4 eV), interfacial sub-oxides SiOₓ (101.8 eV), and SiO₂ overlayer (103.5 eV).',
    bindingEnergyEv: si2pData.bindingEnergyEv,
    intensityCps: si2pData.intensityCps
  },
  {
    id: 'xps-n1s-catalyst',
    name: 'N-Doped Carbon Catalyst (N 1s)',
    subtitle: 'Pyridinic, Pyrrolic, Graphitic & N–O',
    coreLevel: 'N 1s',
    materialFormula: 'N-Graphene',
    xraySource: 'Al-Ka',
    passEnergyEv: 20,
    referenceId: 'n1s-ndoped-ref',
    defaultChargeShiftEv: 0.0,
    defaultProminence: 0.08,
    defaultMinDistanceEv: 1.0,
    defaultGlMix: 30,
    notes:
      'N 1s deconvolution quantifying Pyridinic-N (398.3 eV), Pyrrolic-N (399.9 eV), Graphitic-N (401.25 eV), and N-oxide (402.95 eV).',
    bindingEnergyEv: n1sData.bindingEnergyEv,
    intensityCps: n1sData.intensityCps
  }
];

/**
 * Match a fitted XPS Binding Energy (eV) against the NIST Chemical State database.
 */
export function matchXPSChemicalStates(
  centerEv: number,
  coreLevelHint?: string
): {
  bestMatch?: XPSChemicalStateMatch;
  alternatives: XPSChemicalStateMatch[];
} {
  const scored = XPS_CHEMICAL_STATES_DB.map((entry) => {
    const delta = Number((centerEv - entry.referenceBeEv).toFixed(2));
    const absDelta = Math.abs(delta);
    const inRange = centerEv >= entry.rangeEv[0] && centerEv <= entry.rangeEv[1];
    const matchesCoreHint =
      coreLevelHint &&
      entry.coreLevel.toLowerCase() === coreLevelHint.toLowerCase();

    // Score closeness (prefer entries matching the active core level if within 4 eV)
    const penalty = absDelta - (matchesCoreHint ? 0.35 : 0) - (inRange ? 0.25 : 0);

    let confidence: 'High' | 'Moderate' | 'Candidate' = 'Candidate';
    if (absDelta <= 0.35 && inRange) confidence = 'High';
    else if (absDelta <= 0.85) confidence = 'Moderate';

    const matchObj: XPSChemicalStateMatch = {
      id: entry.id,
      coreLevel: entry.coreLevel,
      element: entry.element,
      stateLabel: entry.stateLabel,
      oxidationState: entry.oxidationState,
      bondEnvironment: entry.bondEnvironment,
      referenceBeEv: entry.referenceBeEv,
      rangeEv: entry.rangeEv,
      shiftDeltaEv: delta,
      spinOrbitSplittingEv: entry.spinOrbitSplittingEv,
      branchingRatio: entry.branchingRatio,
      scofieldRsf: entry.scofieldRsf,
      confidence
    };

    return { matchObj, absDelta, penalty };
  })
    .filter((item) => item.absDelta <= 3.2)
    .sort((a, b) => a.penalty - b.penalty);

  if (scored.length === 0) {
    return { bestMatch: undefined, alternatives: [] };
  }

  return {
    bestMatch: scored[0].matchObj,
    alternatives: scored.slice(1, 4).map((s) => s.matchObj)
  };
}
