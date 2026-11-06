import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const rows = [
  // Anatase TiO2
  {
    Compound: 'Anatase Titanium Dioxide',
    Formula: 'TiO₂',
    Peak_Position: 144,
    Vibrational_Mode: 'Eg (O–Ti–O symmetric bending)',
    Relative_Intensity: 1.0
  },
  {
    Compound: 'Anatase Titanium Dioxide',
    Formula: 'TiO₂',
    Peak_Position: 197,
    Vibrational_Mode: 'Eg (Ti–O bending)',
    Relative_Intensity: 0.08
  },
  {
    Compound: 'Anatase Titanium Dioxide',
    Formula: 'TiO₂',
    Peak_Position: 399,
    Vibrational_Mode: 'B1g (O–Ti–O bending)',
    Relative_Intensity: 0.38
  },
  {
    Compound: 'Anatase Titanium Dioxide',
    Formula: 'TiO₂',
    Peak_Position: 516,
    Vibrational_Mode: 'A1g + B1g (Ti–O stretching)',
    Relative_Intensity: 0.34
  },
  {
    Compound: 'Anatase Titanium Dioxide',
    Formula: 'TiO₂',
    Peak_Position: 639,
    Vibrational_Mode: 'Eg (Ti–O symmetric stretching)',
    Relative_Intensity: 0.48
  },

  // Graphene
  {
    Compound: 'Defective Monolayer Graphene',
    Formula: 'C (sp²)',
    Peak_Position: 1350,
    Vibrational_Mode: 'D Band (A1g ring breathing)',
    Relative_Intensity: 0.55
  },
  {
    Compound: 'Defective Monolayer Graphene',
    Formula: 'C (sp²)',
    Peak_Position: 1582,
    Vibrational_Mode: 'G Band (E2g in-plane C=C stretch)',
    Relative_Intensity: 1.0
  },
  {
    Compound: 'Defective Monolayer Graphene',
    Formula: 'C (sp²)',
    Peak_Position: 1620,
    Vibrational_Mode: "D' Band (defect scattering)",
    Relative_Intensity: 0.22
  },
  {
    Compound: 'Defective Monolayer Graphene',
    Formula: 'C (sp²)',
    Peak_Position: 2690,
    Vibrational_Mode: '2D Band (G′ second-order phonon)',
    Relative_Intensity: 0.78
  },
  {
    Compound: 'Defective Monolayer Graphene',
    Formula: 'C (sp²)',
    Peak_Position: 2935,
    Vibrational_Mode: 'D+D′ Combination Band',
    Relative_Intensity: 0.16
  },

  // Paracetamol
  {
    Compound: 'Paracetamol (Form I)',
    Formula: 'C₈H₉NO₂',
    Peak_Position: 858,
    Vibrational_Mode: 'ν(C–C) Aliphatic Skeletal Stretch',
    Relative_Intensity: 0.72
  },
  {
    Compound: 'Paracetamol (Form I)',
    Formula: 'C₈H₉NO₂',
    Peak_Position: 1168,
    Vibrational_Mode: 'δ(C–H) In-Plane Aryl Deformation',
    Relative_Intensity: 0.58
  },
  {
    Compound: 'Paracetamol (Form I)',
    Formula: 'C₈H₉NO₂',
    Peak_Position: 1237,
    Vibrational_Mode: 'Amide III / ν(C–N) + δ(N–H)',
    Relative_Intensity: 0.65
  },
  {
    Compound: 'Paracetamol (Form I)',
    Formula: 'C₈H₉NO₂',
    Peak_Position: 1324,
    Vibrational_Mode: 'δs(CH₃) Symmetric Deformation',
    Relative_Intensity: 0.82
  },
  {
    Compound: 'Paracetamol (Form I)',
    Formula: 'C₈H₉NO₂',
    Peak_Position: 1610,
    Vibrational_Mode: 'ν(C=C) Aromatic Ring Stretch',
    Relative_Intensity: 1.0
  },
  {
    Compound: 'Paracetamol (Form I)',
    Formula: 'C₈H₉NO₂',
    Peak_Position: 1648,
    Vibrational_Mode: 'Amide I / ν(C=O) Stretch',
    Relative_Intensity: 0.68
  },

  // Crystalline Silicon
  {
    Compound: 'Crystalline Silicon (c-Si)',
    Formula: 'Si',
    Peak_Position: 302,
    Vibrational_Mode: '2TA Acoustic Overtone',
    Relative_Intensity: 0.14
  },
  {
    Compound: 'Crystalline Silicon (c-Si)',
    Formula: 'Si',
    Peak_Position: 520.7,
    Vibrational_Mode: 'F2g First-Order LO/TO Phonon',
    Relative_Intensity: 1.0
  },
  {
    Compound: 'Crystalline Silicon (c-Si)',
    Formula: 'Si',
    Peak_Position: 965,
    Vibrational_Mode: '2TO Optical Overtone',
    Relative_Intensity: 0.18
  },

  // Calcite
  {
    Compound: 'Calcite Standard',
    Formula: 'CaCO₃',
    Peak_Position: 281,
    Vibrational_Mode: 'Eg Translational Lattice Mode',
    Relative_Intensity: 0.42
  },
  {
    Compound: 'Calcite Standard',
    Formula: 'CaCO₃',
    Peak_Position: 712,
    Vibrational_Mode: 'ν₄(Eg) In-Plane CO₃²⁻ Bending',
    Relative_Intensity: 0.24
  },
  {
    Compound: 'Calcite Standard',
    Formula: 'CaCO₃',
    Peak_Position: 1085,
    Vibrational_Mode: 'ν₁(A1g) Symmetric CO₃²⁻ Stretch',
    Relative_Intensity: 1.0
  },

  // Alpha-Quartz
  {
    Compound: 'Alpha-Quartz',
    Formula: 'SiO₂',
    Peak_Position: 464,
    Vibrational_Mode: 'A1 Symmetric Si–O–Si Bending',
    Relative_Intensity: 1.0
  }
];

const ws = XLSX.utils.json_to_sheet(rows);
ws['!cols'] = [
  { wch: 28 },
  { wch: 14 },
  { wch: 16 },
  { wch: 36 },
  { wch: 18 }
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'ReferenceData');

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

XLSX.writeFile(wb, path.join(publicDir, 'reference_data.xlsx'));
XLSX.writeFile(wb, path.resolve('reference_data.xlsx'));
console.log('Generated public/reference_data.xlsx and reference_data.xlsx');
