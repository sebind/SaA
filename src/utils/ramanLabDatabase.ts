import { Parser } from 'pickleparser';
import { PeakData } from '../types/spectrum';

export interface RamanLabEntry {
  name: string;
  wavenumbers: number[];
  intensities: number[];
  peaks: number[];
  metadata: Record<string, string>;
  elements: string[];
  formula: string;
  chemicalFamily: string;
  heyClassification: string;
}

export interface RamanLabFilterCriteria {
  queryText: string; // Material name or formula substring
  chemicalFamily: string;
  requiredElements: string; // e.g., "Si, O"
  onlyElements: string; // e.g., "Si, O, Al"
  excludeElements: string; // e.g., "Fe, Mg"
  userPeaks: string; // e.g., "464, 1085"
  peakTolerance: number; // default 10 cm^-1
  algorithm: 'combined' | 'correlation' | 'peak' | 'multi-window';
  threshold: number; // minimum score 0..1
  maxResults: number;
}

export interface RamanLabMatchResult {
  entry: RamanLabEntry;
  score: number;
  correlationScore: number;
  peakScore: number;
  matchedPeaks: {
    expPeak: number;
    dbPeak: number;
    delta: number;
  }[];
}

/**
 * Helper to decode a Python object or numpy ndarray reconstructed by pickleparser into number[].
 */
function extractNumberArray(raw: unknown): number[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map((v) => Number(v)).filter((v) => Number.isFinite(v));
  }
  if (raw instanceof Float64Array || raw instanceof Float32Array || raw instanceof Int32Array) {
    return Array.from(raw);
  }
  // Check if it's a reconstructed numpy ndarray object
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) {
      return obj.data.map(Number).filter(Number.isFinite);
    }
  }
  return [];
}

/**
 * Extract chemical element symbols (e.g. ["SI", "O", "CA"]) from metadata fields or formula string.
 */
export function extractElementsFromMetadata(
  metadata: Record<string, string>,
  fallbackName: string
): {
  elements: string[];
  formula: string;
  chemicalFamily: string;
  heyClassification: string;
} {
  const getField = (...keys: string[]) => {
    for (const k of keys) {
      if (metadata[k]) return String(metadata[k]).trim();
      const foundKey = Object.keys(metadata).find(
        (mk) => mk.toLowerCase() === k.toLowerCase()
      );
      if (foundKey && metadata[foundKey]) return String(metadata[foundKey]).trim();
    }
    return '';
  };

  const chemistryElements = getField(
    'CHEMISTRY ELEMENTS',
    'Chemistry Elements',
    'chemistry_elements',
    'ELEMENTS',
    'elements'
  );
  const formula = getField(
    'FORMULA',
    'Formula',
    'formula',
    'IDEAL CHEMISTRY',
    'chemical_formula'
  );
  const chemicalFamily = getField(
    'CHEMICAL FAMILY',
    'Chemical Family',
    'chemical_family',
    'FAMILY'
  );
  const heyClassification = getField(
    'HEY CLASSIFICATION',
    'Hey Classification',
    'hey_classification'
  );

  const elementSet = new Set<string>();

  if (chemistryElements) {
    chemistryElements
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((el) => {
        if (/^[A-Z][a-z]?$/.test(el)) {
          elementSet.add(el.toUpperCase());
        }
      });
  }

  const formulaSource = formula || fallbackName;
  if (elementSet.size === 0 && formulaSource) {
    const matches = formulaSource.match(/[A-Z][a-z]?/g);
    if (matches) {
      // Valid periodic table symbols check
      const VALID_ELEMENTS = new Set([
        'H','HE','LI','BE','B','C','N','O','F','NE','NA','MG','AL','SI','P','S','CL','AR',
        'K','CA','SC','TI','V','CR','MN','FE','CO','NI','CU','ZN','GA','GE','AS','SE','BR','KR',
        'RB','SR','Y','ZR','NB','MO','TC','RU','RH','PD','AG','CD','IN','SN','SB','TE','I','XE',
        'CS','BA','LA','CE','PR','ND','PM','SM','EU','GD','TB','DY','HO','ER','TM','YB','LU',
        'HF','TA','W','RE','OS','IR','PT','AU','HG','TL','PB','BI','PO','AT','RN','FR','RA',
        'AC','TH','PA','U','NP','PU','AM','CM','BK','CF'
      ]);
      for (const m of matches) {
        const up = m.toUpperCase();
        if (VALID_ELEMENTS.has(up)) {
          elementSet.add(up);
        }
      }
    }
  }

  return {
    elements: Array.from(elementSet),
    formula,
    chemicalFamily,
    heyClassification
  };
}

/**
 * Detect local maxima peaks for database entries that don't have pre-computed peaks.
 */
function findLocalPeaksSimple(wavenumbers: number[], intensities: number[]): number[] {
  if (wavenumbers.length < 5) return [];
  let maxInt = -Infinity;
  let minInt = Infinity;
  for (const v of intensities) {
    if (v > maxInt) maxInt = v;
    if (v < minInt) minInt = v;
  }
  const threshold = minInt + (maxInt - minInt) * 0.12;
  const peaks: { wn: number; val: number }[] = [];

  for (let i = 2; i < intensities.length - 2; i++) {
    const y = intensities[i];
    if (
      y >= threshold &&
      y >= intensities[i - 1] &&
      y >= intensities[i + 1] &&
      (y > intensities[i - 1] || y > intensities[i + 1]) &&
      y >= intensities[i - 2] &&
      y >= intensities[i + 2]
    ) {
      peaks.push({ wn: Number(wavenumbers[i].toFixed(1)), val: y });
    }
  }

  peaks.sort((a, b) => b.val - a.val);
  const selected: number[] = [];
  for (const p of peaks) {
    if (!selected.some((s) => Math.abs(s - p.wn) < 12)) {
      selected.push(p.wn);
    }
    if (selected.length >= 18) break;
  }
  return selected.sort((a, b) => a - b);
}

/**
 * Parse a RamanLab_Database_20250602.pkl (or .json export) ArrayBuffer into RamanLabEntry[].
 * Supports Python pickle protocol 2–5 including numpy.core.multiarray._reconstruct.
 */
export function parseRamanLabDatabaseBuffer(
  buffer: ArrayBuffer,
  filename: string
): RamanLabEntry[] {
  let rawDict: Record<string, unknown> = {};

  if (filename.toLowerCase().endsWith('.json')) {
    const text = new TextDecoder('utf-8').decode(buffer);
    const parsed = JSON.parse(text);
    rawDict =
      parsed && typeof parsed === 'object' && 'spectra' in parsed
        ? (parsed.spectra as Record<string, unknown>)
        : (parsed as Record<string, unknown>);
  } else {
    // Configure pickleparser with custom resolvers for numpy arrays & scalars
    const parser = new Parser({
      nameResolver: {
        resolve: (module: string, name: string) => {
          if (
            (module.includes('numpy') && name === '_reconstruct') ||
            name === 'ndarray'
          ) {
            return function (..._args: unknown[]) {
              return {
                __is_ndarray__: true,
                data: [] as number[],
                __setstate__(state: unknown[]) {
                  // numpy ndarray state tuple: (version, shape, dtype, isFortran, rawBytesOrList)
                  if (Array.isArray(state) && state.length >= 5) {
                    const rawData = state[4];
                    if (rawData instanceof Uint8Array) {
                      // Decode float64 or float32 buffer
                      const byteLen = rawData.byteLength;
                      const shape = Array.isArray(state[1]) ? state[1] : [0];
                      const expectedLen = Number(shape[0]) || 0;
                      const aligned = rawData.buffer.slice(
                        rawData.byteOffset,
                        rawData.byteOffset + byteLen
                      );
                      if (expectedLen > 0 && byteLen === expectedLen * 4) {
                        this.data = Array.from(new Float32Array(aligned));
                      } else if (byteLen % 8 === 0) {
                        this.data = Array.from(new Float64Array(aligned));
                      } else if (byteLen % 4 === 0) {
                        this.data = Array.from(new Float32Array(aligned));
                      }
                    } else if (Array.isArray(rawData)) {
                      this.data = rawData.map(Number);
                    }
                  }
                }
              };
            };
          }
          if (module.includes('numpy') && name === 'scalar') {
            return function (_dtype: unknown, rawBytes: unknown) {
              if (rawBytes instanceof Uint8Array && rawBytes.byteLength >= 8) {
                const aligned = rawBytes.buffer.slice(
                  rawBytes.byteOffset,
                  rawBytes.byteOffset + 8
                );
                return new Float64Array(aligned)[0];
              }
              return Number(rawBytes) || 0;
            };
          }
          // Default fallback constructor/function
          const Fallback = function (this: Record<string, unknown>, ...args: unknown[]) {
            if (new.target) {
              this.args = args;
            } else {
              return { __module__: module, __name__: name, args };
            }
          } as unknown as new (...args: unknown[]) => unknown;
          return Fallback;
        }
      }
    });

    const uint8 = new Uint8Array(buffer);
    const unpickled = parser.parse<Record<string, unknown>>(uint8);
    if (unpickled && typeof unpickled === 'object') {
      rawDict =
        'spectra' in unpickled && typeof unpickled.spectra === 'object'
          ? (unpickled.spectra as Record<string, unknown>)
          : unpickled;
    }
  }

  const entries: RamanLabEntry[] = [];

  for (const [key, val] of Object.entries(rawDict)) {
    if (!val || typeof val !== 'object') continue;
    const item = val as Record<string, unknown>;
    const wavenumbers = extractNumberArray(item.wavenumbers ?? item.x);
    const intensities = extractNumberArray(item.intensities ?? item.y);
    if (wavenumbers.length < 5 || intensities.length < 5) continue;

    let peaks = extractNumberArray(item.peaks);
    if (peaks.length === 0) {
      peaks = findLocalPeaksSimple(wavenumbers, intensities);
    }

    const rawMeta = (item.metadata ?? {}) as Record<string, unknown>;
    const metadata: Record<string, string> = {};
    for (const [mk, mv] of Object.entries(rawMeta)) {
      if (mv !== null && mv !== undefined) {
        metadata[mk] = String(mv);
      }
    }

    const displayName = String(item.name || metadata['MINERAL NAME'] || metadata['mineral_name'] || key);
    const { elements, formula, chemicalFamily, heyClassification } =
      extractElementsFromMetadata(metadata, displayName);

    entries.push({
      name: displayName,
      wavenumbers,
      intensities,
      peaks,
      metadata,
      elements,
      formula,
      chemicalFamily,
      heyClassification
    });
  }

  return entries;
}

/**
 * Linear interpolation of (x, y) onto target grid xGrid.
 */
function interpolateLinear(xGrid: number[], x: number[], y: number[]): number[] {
  const n = x.length;
  const out = new Array(xGrid.length).fill(0);
  let j = 0;

  for (let i = 0; i < xGrid.length; i++) {
    const target = xGrid[i];
    if (target <= x[0]) {
      out[i] = y[0];
      continue;
    }
    if (target >= x[n - 1]) {
      out[i] = y[n - 1];
      continue;
    }
    while (j < n - 2 && x[j + 1] < target) {
      j++;
    }
    const x0 = x[j];
    const x1 = x[j + 1];
    const y0 = y[j];
    const y1 = y[j + 1];
    const t = x1 !== x0 ? (target - x0) / (x1 - x0) : 0;
    out[i] = y0 + t * (y1 - y0);
  }
  return out;
}

/**
 * Calculate Pearson correlation score on common wavenumber grid (RamanLab calculate_correlation_score).
 */
export function calculateCorrelationScore(
  queryX: number[],
  queryY: number[],
  dbX: number[],
  dbY: number[],
  gridPoints = 250
): number {
  const commonMin = Math.max(queryX[0], dbX[0]);
  const commonMax = Math.min(queryX[queryX.length - 1], dbX[dbX.length - 1]);
  if (commonMax - commonMin < 40) return 0;

  const step = (commonMax - commonMin) / (gridPoints - 1);
  const grid = Array.from({ length: gridPoints }, (_, i) => commonMin + i * step);

  const qInterp = interpolateLinear(grid, queryX, queryY);
  const dInterp = interpolateLinear(grid, dbX, dbY);

  let qMean = 0;
  let dMean = 0;
  for (let i = 0; i < gridPoints; i++) {
    qMean += qInterp[i];
    dMean += dInterp[i];
  }
  qMean /= gridPoints;
  dMean /= gridPoints;

  let cov = 0;
  let qVar = 0;
  let dVar = 0;
  for (let i = 0; i < gridPoints; i++) {
    const dq = qInterp[i] - qMean;
    const dd = dInterp[i] - dMean;
    cov += dq * dd;
    qVar += dq * dq;
    dVar += dd * dd;
  }

  const denom = Math.sqrt(qVar * dVar);
  if (denom < 1e-12) return 0;
  return Math.max(0, Math.min(1, Math.abs(cov / denom)));
}

/**
 * Multi-window correlation score across diagnostic Raman regions (Lattice, Bending, Stretching, High)
 * exactly as implemented in RamanLab's calculate_multi_window_score.
 */
export function calculateMultiWindowScore(
  queryX: number[],
  queryY: number[],
  dbX: number[],
  dbY: number[]
): number {
  const windows: { range: [number, number]; weight: number }[] = [
    { range: [50, 400], weight: 0.2 },
    { range: [400, 800], weight: 0.3 },
    { range: [800, 1200], weight: 0.4 },
    { range: [1200, 1800], weight: 0.1 }
  ];

  let totalScore = 0;
  let totalWeight = 0;

  for (const w of windows) {
    const start = Math.max(w.range[0], queryX[0], dbX[0]);
    const end = Math.min(
      w.range[1],
      queryX[queryX.length - 1],
      dbX[dbX.length - 1]
    );
    if (end - start < 25) continue;

    const nPts = 45;
    const step = (end - start) / (nPts - 1);
    const grid = Array.from({ length: nPts }, (_, i) => start + i * step);
    const qInterp = interpolateLinear(grid, queryX, queryY);
    const dInterp = interpolateLinear(grid, dbX, dbY);

    const qMean = qInterp.reduce((a, b) => a + b, 0) / nPts;
    const dMean = dInterp.reduce((a, b) => a + b, 0) / nPts;
    let cov = 0;
    let qVar = 0;
    let dVar = 0;
    for (let i = 0; i < nPts; i++) {
      const dq = qInterp[i] - qMean;
      const dd = dInterp[i] - dMean;
      cov += dq * dd;
      qVar += dq * dq;
      dVar += dd * dd;
    }
    const denom = Math.sqrt(qVar * dVar);
    if (denom > 1e-10) {
      const corr = Math.max(0, Math.min(1, Math.abs(cov / denom)));
      totalScore += corr * w.weight;
      totalWeight += w.weight;
    }
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

/**
 * Screen and rank the loaded RamanLab database using RamanLab's element/metadata filters
 * and peak/spectral correlation algorithms.
 */
export function screenRamanLabDatabase(
  database: RamanLabEntry[],
  queryX: number[],
  queryY: number[],
  detectedPeaks: PeakData[],
  criteria: RamanLabFilterCriteria
): {
  filteredCount: number;
  matches: RamanLabMatchResult[];
} {
  const reqElems = criteria.requiredElements
    .split(/[,;\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const onlyElems = criteria.onlyElements
    .split(/[,;\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const exclElems = criteria.excludeElements
    .split(/[,;\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  const userPeakList = criteria.userPeaks
    .split(/[,;\s]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);

  const queryTextLower = criteria.queryText.trim().toLowerCase();
  const familyLower = criteria.chemicalFamily.trim().toLowerCase();

  // Step 1: Apply RamanLab metadata & element screening filters
  const candidates = database.filter((entry) => {
    if (queryTextLower) {
      const inName = entry.name.toLowerCase().includes(queryTextLower);
      const inFormula = entry.formula.toLowerCase().includes(queryTextLower);
      const inMeta = Object.values(entry.metadata).some((v) =>
        v.toLowerCase().includes(queryTextLower)
      );
      if (!inName && !inFormula && !inMeta) return false;
    }

    if (familyLower) {
      const fam = (entry.chemicalFamily || entry.heyClassification || '').toLowerCase();
      if (!fam.includes(familyLower)) return false;
    }

    if (reqElems.length > 0 || onlyElems.length > 0 || exclElems.length > 0) {
      const entrySet = new Set(entry.elements.map((e) => e.toUpperCase()));
      if (entrySet.size === 0) return false;

      if (reqElems.length > 0) {
        for (const req of reqElems) {
          if (!entrySet.has(req)) return false;
        }
      }

      if (onlyElems.length > 0) {
        const allowed = new Set(onlyElems);
        for (const el of entrySet) {
          if (!allowed.has(el)) return false;
        }
      }

      if (exclElems.length > 0) {
        for (const ex of exclElems) {
          if (entrySet.has(ex)) return false;
        }
      }
    }

    return true;
  });

  // Target peaks to compare (either user-specified peaks or detected experimental peaks)
  const targetPeaks =
    userPeakList.length > 0
      ? userPeakList
      : detectedPeaks.map((p) => p.center);
  const tolerance = Math.max(1, criteria.peakTolerance || 10);

  const results: RamanLabMatchResult[] = [];

  for (const entry of candidates) {
    const corrScore = calculateCorrelationScore(
      queryX,
      queryY,
      entry.wavenumbers,
      entry.intensities
    );

    // Peak matching score
    const matchedPeaks: { expPeak: number; dbPeak: number; delta: number }[] = [];
    if (targetPeaks.length > 0 && entry.peaks.length > 0) {
      for (const qPeak of targetPeaks) {
        let bestDbPeak = entry.peaks[0];
        let minDist = Math.abs(bestDbPeak - qPeak);
        for (const dbP of entry.peaks) {
          const d = Math.abs(dbP - qPeak);
          if (d < minDist) {
            minDist = d;
            bestDbPeak = dbP;
          }
        }
        if (minDist <= tolerance) {
          matchedPeaks.push({
            expPeak: Number(qPeak.toFixed(1)),
            dbPeak: Number(bestDbPeak.toFixed(1)),
            delta: Number((qPeak - bestDbPeak).toFixed(1))
          });
        }
      }
    }

    const peakMatchRatio =
      targetPeaks.length > 0 ? matchedPeaks.length / targetPeaks.length : 0;
    const proximityBonus =
      matchedPeaks.length > 0
        ? matchedPeaks.reduce(
            (acc, m) => acc + (1 - Math.abs(m.delta) / tolerance),
            0
          ) / matchedPeaks.length
        : 0;
    const peakScore =
      matchedPeaks.length > 0
        ? Math.min(1, 0.75 * peakMatchRatio + 0.25 * proximityBonus)
        : 0;

    let finalScore = corrScore;
    if (criteria.algorithm === 'peak') {
      finalScore = peakScore;
    } else if (criteria.algorithm === 'multi-window') {
      finalScore = calculateMultiWindowScore(
        queryX,
        queryY,
        entry.wavenumbers,
        entry.intensities
      );
    } else if (criteria.algorithm === 'combined') {
      finalScore =
        targetPeaks.length > 0
          ? 0.55 * corrScore + 0.45 * peakScore
          : corrScore;
    }

    if (finalScore >= criteria.threshold) {
      results.push({
        entry,
        score: Number(finalScore.toFixed(3)),
        correlationScore: Number(corrScore.toFixed(3)),
        peakScore: Number(peakScore.toFixed(3)),
        matchedPeaks
      });
    }
  }

  results.sort((a, b) => b.score - a.score);

  return {
    filteredCount: candidates.length,
    matches: results.slice(0, criteria.maxResults || 15)
  };
}
