import * as XLSX from 'xlsx';
import { ReferenceMaterial } from '../types/spectrum';
import { VibrationalEntry } from '../data/ramanReferenceData';

export interface ExcelReferenceRow {
  Compound?: string;
  Formula?: string;
  Peak_Position?: number | string;
  Vibrational_Mode?: string;
  Relative_Intensity?: number | string;
}

/**
 * Parse an ArrayBuffer from an Excel (.xlsx / .xls / .csv) file into ReferenceMaterial[] and VibrationalEntry[].
 *
 * Expected Excel columns:
 * Column 1: Compound (or Compound Name)
 * Column 2: Formula
 * Column 3+: Peak_Position & Vibrational_Mode (either one peak per row OR multiple peak columns like Peak_1, Mode_1...)
 */
export function parseReferenceExcelBuffer(buffer: ArrayBuffer): {
  references: ReferenceMaterial[];
  modesDb: VibrationalEntry[];
} {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: ''
  });

  const compoundMap = new Map<string, ReferenceMaterial>();
  const modesDb: VibrationalEntry[] = [];

  rows.forEach((row, idx) => {
    const keys = Object.keys(row);
    if (keys.length < 2) return;

    const compoundName = String(
      row['Compound'] ?? row['Compound Name'] ?? row[keys[0]] ?? ''
    ).trim();
    const formula = String(
      row['Formula'] ?? row['Chemical Formula'] ?? row[keys[1]] ?? ''
    ).trim();

    if (!compoundName) return;

    const id = compoundName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (!compoundMap.has(id)) {
      compoundMap.set(id, {
        id,
        name: compoundName,
        formula: formula || '—',
        category: 'Reference',
        notes: '',
        peaks: []
      });
    }

    const material = compoundMap.get(id)!;

    // Case A: Standard tabular format (Col 1: Compound, Col 2: Formula, Col 3: Peak_Position, Col 4: Vibrational_Mode)
    const rawPos =
      row['Peak_Position'] ??
      row['Peak Position'] ??
      row['Wavenumber'] ??
      row[keys[2]];
    const rawMode =
      row['Vibrational_Mode'] ??
      row['Vibrational Mode'] ??
      row['Mode'] ??
      row[keys[3]];
    const rawRelInt =
      row['Relative_Intensity'] ??
      row['Relative Intensity'] ??
      row['Intensity'] ??
      1.0;

    // Support either numeric Peak_Position + Vibrational_Mode columns OR combined "144 (Eg)" strings across columns 3+
    const parsedNum = Number(rawPos);
    if (Number.isFinite(parsedNum) && parsedNum > 0) {
      const modeLabel = String(rawMode || 'Raman Mode').trim();
      const relInt = Number(rawRelInt);
      material.peaks.push({
        wavenumber: parsedNum,
        relativeIntensity: Number.isFinite(relInt) && relInt > 0 ? relInt : 0.8,
        label: modeLabel,
        symmetry: ''
      });

      modesDb.push({
        id: `excel-${id}-${idx}`,
        mode: modeLabel,
        bond: formula || compoundName,
        materialGroup: compoundName,
        referenceWavenumber: parsedNum,
        range: [parsedNum - 12, parsedNum + 12],
        description: `${compoundName} (${formula})`
      });
    } else {
      // Check columns from index 2 onwards for entries like "1350: D Band" or "1350 (D Band)"
      for (let c = 2; c < keys.length; c++) {
        const cellVal = String(row[keys[c]] ?? '').trim();
        if (!cellVal) continue;
        const match = cellVal.match(/^(\d+(?:\.\d+)?)\s*(?:[:\-–(]\s*(.+?)\)?)?$/);
        if (match) {
          const wn = Number(match[1]);
          const modeLabel = (match[2] || keys[c] || 'Mode').trim();
          if (Number.isFinite(wn) && wn > 0) {
            material.peaks.push({
              wavenumber: wn,
              relativeIntensity: 0.85,
              label: modeLabel,
              symmetry: ''
            });
            modesDb.push({
              id: `excel-${id}-${idx}-${c}`,
              mode: modeLabel,
              bond: formula || compoundName,
              materialGroup: compoundName,
              referenceWavenumber: wn,
              range: [wn - 12, wn + 12],
              description: `${compoundName} (${formula})`
            });
          }
        }
      }
    }
  });

  const references = Array.from(compoundMap.values()).filter(
    (r) => r.peaks.length > 0
  );

  return { references, modesDb };
}
