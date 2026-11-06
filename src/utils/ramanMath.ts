import {
  BaselineMethod,
  FitShape,
  NormMethod,
  PeakData,
  ProcessingConfig,
  SmoothMethod
} from '../types/spectrum';
import { matchVibrationalModes } from '../data/ramanReferenceData';

const PEAK_COLORS = [
  '#0d9488', // teal-600
  '#0284c7', // sky-600
  '#059669', // emerald-600
  '#0891b2', // cyan-600
  '#4f46e5', // indigo-600
  '#0f766e', // teal-700
  '#2563eb', // blue-600
  '#14b8a6'  // teal-500
];

/**
 * Parse CSV or TXT Raman spectrum file content into sorted (x, y) arrays.
 */
export function parseSpectrumText(text: string): { x: number[]; y: number[] } {
  const lines = text.split(/\r?\n/);
  const points: { x: number; y: number }[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith('%')) {
      continue;
    }
    // Split on comma, semicolon, tab, or whitespace
    const parts = line.split(/[,;\t\s]+/).filter(Boolean);
    if (parts.length >= 2) {
      const xVal = Number(parts[0]);
      const yVal = Number(parts[1]);
      if (Number.isFinite(xVal) && Number.isFinite(yVal)) {
        points.push({ x: xVal, y: yVal });
      }
    }
  }

  if (points.length < 5) {
    throw new Error('Could not find enough valid (Wavenumber, Intensity) numeric rows.');
  }

  // Sort ascending by wavenumber
  points.sort((a, b) => a.x - b.x);

  return {
    x: points.map((p) => p.x),
    y: points.map((p) => p.y)
  };
}

/**
 * Solve small linear system A * c = b via Gaussian elimination with partial pivoting.
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) {
        maxRow = row;
      }
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-12) continue;

    for (let j = col; j <= n; j++) {
      M[col][j] /= pivot;
    }

    for (let row = 0; row < n; row++) {
      if (row !== col) {
        const factor = M[row][col];
        for (let j = col; j <= n; j++) {
          M[row][j] -= factor * M[col][j];
        }
      }
    }
  }

  return M.map((row) => row[n]);
}

/**
 * Fit polynomial of given degree to (xNorm, y) where xNorm is scaled to [-1, 1].
 */
function fitPolynomial(xNorm: number[], y: number[], degree: number, weights?: number[]): number[] {
  const m = degree + 1;
  const A: number[][] = Array.from({ length: m }, () => Array(m).fill(0));
  const b: number[] = Array(m).fill(0);

  for (let i = 0; i < xNorm.length; i++) {
    const w = weights ? weights[i] : 1;
    const xi = xNorm[i];
    const yi = y[i];
    const powers: number[] = [1];
    for (let p = 1; p < 2 * m; p++) {
      powers.push(powers[p - 1] * xi);
    }
    for (let r = 0; r < m; r++) {
      for (let c = 0; c < m; c++) {
        A[r][c] += w * powers[r + c];
      }
      b[r] += w * yi * powers[r];
    }
  }

  const coeffs = solveLinearSystem(A, b);
  return xNorm.map((xi) => {
    let val = 0;
    let p = 1;
    for (let k = 0; k < m; k++) {
      val += coeffs[k] * p;
      p *= xi;
    }
    return val;
  });
}

/**
 * Compute estimated baseline array for spectrum (x, y).
 */
export function computeBaseline(
  x: number[],
  y: number[],
  method: BaselineMethod,
  polyDegree: number,
  rollingRadius: number
): number[] {
  const n = y.length;
  if (n === 0 || method === 'none') {
    return new Array(n).fill(0);
  }

  if (method === 'linear') {
    const x0 = x[0];
    const xEnd = x[n - 1];
    const y0 = y[0];
    const yEnd = y[n - 1];
    const span = xEnd - x0 || 1;
    return x.map((xi) => y0 + ((yEnd - y0) * (xi - x0)) / span);
  }

  if (method === 'polynomial') {
    // Iterative ModPoly baseline (clips peaks above polynomial iteratively)
    const xMin = x[0];
    const xMax = x[n - 1];
    const mid = (xMin + xMax) / 2;
    const halfSpan = (xMax - xMin) / 2 || 1;
    const xNorm = x.map((xi) => (xi - mid) / halfSpan);

    let workingY = [...y];
    let baseline = [...y];
    const deg = Math.max(1, Math.min(6, polyDegree));

    for (let iter = 0; iter < 14; iter++) {
      baseline = fitPolynomial(xNorm, workingY, deg);
      for (let i = 0; i < n; i++) {
        // Keep whichever is lower to hug the baseline underneath Raman peaks
        if (workingY[i] > baseline[i]) {
          workingY[i] = baseline[i];
        }
      }
    }
    return baseline;
  }

  if (method === 'rollingball') {
    // Morphological erosion (minimum filter) followed by dilation (maximum) + smoothing
    const r = Math.max(5, Math.min(Math.floor(n / 2), rollingRadius));
    const eroded = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let minVal = Infinity;
      const start = Math.max(0, i - r);
      const end = Math.min(n - 1, i + r);
      for (let j = start; j <= end; j++) {
        if (y[j] < minVal) minVal = y[j];
      }
      eroded[i] = minVal;
    }

    const dilated = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let maxVal = -Infinity;
      const start = Math.max(0, i - r);
      const end = Math.min(n - 1, i + r);
      for (let j = start; j <= end; j++) {
        if (eroded[j] > maxVal) maxVal = eroded[j];
      }
      dilated[i] = maxVal;
    }

    // Smooth the envelope with a boxcar window
    const smoothR = Math.max(3, Math.floor(r / 2));
    const smoothed = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      let count = 0;
      const start = Math.max(0, i - smoothR);
      const end = Math.min(n - 1, i + smoothR);
      for (let j = start; j <= end; j++) {
        sum += dilated[j];
        count++;
      }
      smoothed[i] = sum / count;
    }
    return smoothed;
  }

  return new Array(n).fill(0);
}

/**
 * Smooth spectrum using Savitzky-Golay (quadratic local least squares) or Moving Average.
 */
export function applySmoothing(
  y: number[],
  method: SmoothMethod,
  windowSize: number
): number[] {
  const n = y.length;
  if (method === 'none' || windowSize <= 1 || n < 5) {
    return [...y];
  }

  // Ensure odd window size
  const w = windowSize % 2 === 0 ? windowSize + 1 : windowSize;
  const half = Math.floor(w / 2);

  if (method === 'moving') {
    const out = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      let count = 0;
      for (let k = -half; k <= half; k++) {
        const idx = Math.min(n - 1, Math.max(0, i + k));
        sum += y[idx];
        count++;
      }
      out[i] = sum / count;
    }
    return out;
  }

  // Savitzky-Golay quadratic/cubic smoothing (degree 2 polynomial local fit at k=0)
  // For symmetric window [-half, +half], local quadratic fit at center k=0 has closed-form weights:
  // c_k = (3 * (3*half^2 + 3*half - 1 - 5*k^2)) / ((2*half - 1)*(2*half + 1)*(2*half + 3))
  const m = half;
  if (m < 2) {
    return [...y];
  }
  const denom = (2 * m - 1) * (2 * m + 1) * (2 * m + 3);
  const weights: number[] = [];
  for (let k = -m; k <= m; k++) {
    const wk = (3 * (3 * m * m + 3 * m - 1 - 5 * k * k)) / denom;
    weights.push(wk);
  }

  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let k = -m; k <= m; k++) {
      const idx = Math.min(n - 1, Math.max(0, i + k));
      acc += weights[k + m] * y[idx];
    }
    out[i] = acc;
  }
  return out;
}

/**
 * Normalize spectrum intensities.
 */
export function applyNormalization(
  x: number[],
  y: number[],
  method: NormMethod
): number[] {
  const n = y.length;
  if (n === 0 || method === 'none') {
    return [...y];
  }

  if (method === 'minmax') {
    let minVal = Infinity;
    let maxVal = -Infinity;
    for (const v of y) {
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
    const span = maxVal - minVal || 1;
    return y.map((v) => (v - minVal) / span);
  }

  if (method === 'max') {
    let maxVal = -Infinity;
    for (const v of y) {
      if (v > maxVal) maxVal = v;
    }
    const scale = maxVal > 0 ? maxVal : 1;
    return y.map((v) => v / scale);
  }

  if (method === 'snv') {
    const mean = y.reduce((a, b) => a + b, 0) / n;
    const variance = y.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
    const std = Math.sqrt(variance) || 1;
    return y.map((v) => (v - mean) / std);
  }

  if (method === 'area') {
    let area = 0;
    for (let i = 1; i < n; i++) {
      const dx = Math.abs(x[i] - x[i - 1]);
      area += 0.5 * (Math.abs(y[i]) + Math.abs(y[i - 1])) * dx;
    }
    const scale = area > 0 ? area : 1;
    return y.map((v) => (v / scale) * 1000);
  }

  return [...y];
}

/**
 * Evaluate Gaussian or Lorentzian peak profile.
 */
export function evaluatePeakProfile(
  x: number,
  center: number,
  amplitude: number,
  fwhm: number,
  shape: FitShape
): number {
  const safeFwhm = Math.max(0.5, fwhm);
  if (shape === 'gaussian') {
    const sigma = safeFwhm / 2.354820045;
    return amplitude * Math.exp(-0.5 * Math.pow((x - center) / sigma, 2));
  } else {
    const gamma = safeFwhm / 2;
    return amplitude / (1 + Math.pow((x - center) / gamma, 2));
  }
}

/**
 * Detect peaks and fit Gaussian or Lorentzian profiles to each peak.
 */
export function detectAndFitPeaks(
  x: number[],
  y: number[],
  prominenceRatio: number,
  minDistanceCm: number,
  fitShape: FitShape
): {
  peaks: PeakData[];
  compositeFit: number[];
} {
  const n = y.length;
  if (n < 5) {
    return { peaks: [], compositeFit: new Array(n).fill(0) };
  }

  let minY = Infinity;
  let maxY = -Infinity;
  for (const v of y) {
    if (v < minY) minY = v;
    if (v > maxY) maxY = v;
  }
  const rangeY = maxY - minY || 1;
  const thresholdHeight = minY + rangeY * prominenceRatio;

  // Step 1: Find local maxima candidates
  const candidates: number[] = [];
  for (let i = 2; i < n - 2; i++) {
    if (
      y[i] >= thresholdHeight &&
      y[i] >= y[i - 1] &&
      y[i] >= y[i + 1] &&
      (y[i] > y[i - 1] || y[i] > y[i + 1]) &&
      y[i] >= y[i - 2] &&
      y[i] >= y[i + 2]
    ) {
      // Check prominence in a local window
      const winRadius = Math.max(10, Math.floor(n * 0.06));
      let leftMin = y[i];
      for (let l = i - 1; l >= Math.max(0, i - winRadius); l--) {
        if (y[l] > y[i]) break;
        if (y[l] < leftMin) leftMin = y[l];
      }
      let rightMin = y[i];
      for (let r = i + 1; r <= Math.min(n - 1, i + winRadius); r++) {
        if (y[r] > y[i]) break;
        if (y[r] < rightMin) rightMin = y[r];
      }
      const localBase = Math.max(leftMin, rightMin);
      const prom = y[i] - localBase;
      if (prom >= rangeY * prominenceRatio * 0.65) {
        candidates.push(i);
      }
    }
  }

  // Step 2: Enforce minimum distance (keep highest intensity peaks first)
  candidates.sort((a, b) => y[b] - y[a]);
  const selectedIndices: number[] = [];

  for (const idx of candidates) {
    const wn = x[idx];
    const tooClose = selectedIndices.some((selIdx) => Math.abs(x[selIdx] - wn) < minDistanceCm);
    if (!tooClose) {
      selectedIndices.push(idx);
    }
    if (selectedIndices.length >= 12) break;
  }

  selectedIndices.sort((a, b) => x[a] - x[b]);

  // Step 3: Fit Gaussian or Lorentzian profile around each detected peak
  const peaks: PeakData[] = selectedIndices.map((peakIdx, i) => {
    const rawCenter = x[peakIdx];
    const rawIntensity = Math.max(0, y[peakIdx]);

    // Estimate initial half-maximum width from data points
    const halfHeight = y[peakIdx] * 0.5;
    let leftX = rawCenter - 8;
    for (let l = peakIdx; l >= 0; l--) {
      if (y[l] <= halfHeight) {
        leftX = x[l];
        break;
      }
    }
    let rightX = rawCenter + 8;
    for (let r = peakIdx; r < n; r++) {
      if (y[r] <= halfHeight) {
        rightX = x[r];
        break;
      }
    }
    const initFwhm = Math.max(4, Math.min(120, Math.abs(rightX - leftX)));

    // Local fitting window around peak
    const fitHalfWindowCm = Math.max(15, initFwhm * 1.35);
    const localIndices: number[] = [];
    for (let k = 0; k < n; k++) {
      if (Math.abs(x[k] - rawCenter) <= fitHalfWindowCm) {
        localIndices.push(k);
      }
    }

    // Refine (center, amplitude, fwhm) using coordinate descent nonlinear least-squares
    let bestCenter = rawCenter;
    let bestAmp = rawIntensity;
    let bestFwhm = initFwhm;

    const lossFn = (c: number, a: number, w: number) => {
      let sse = 0;
      for (const k of localIndices) {
        const pred = evaluatePeakProfile(x[k], c, a, w, fitShape);
        const diff = y[k] - pred;
        sse += diff * diff;
      }
      return sse;
    };

    let currentLoss = lossFn(bestCenter, bestAmp, bestFwhm);
    let stepC = 1.2;
    let stepA = Math.max(0.01, bestAmp * 0.04);
    let stepW = Math.max(0.5, bestFwhm * 0.08);

    for (let iter = 0; iter < 25; iter++) {
      let improved = false;
      for (const dc of [-stepC, stepC]) {
        const candC = bestCenter + dc;
        if (Math.abs(candC - rawCenter) <= 6) {
          const l = lossFn(candC, bestAmp, bestFwhm);
          if (l < currentLoss) {
            currentLoss = l;
            bestCenter = candC;
            improved = true;
          }
        }
      }
      for (const da of [-stepA, stepA]) {
        const candA = Math.max(0.0001, bestAmp + da);
        const l = lossFn(bestCenter, candA, bestFwhm);
        if (l < currentLoss) {
          currentLoss = l;
          bestAmp = candA;
          improved = true;
        }
      }
      for (const dw of [-stepW, stepW]) {
        const candW = Math.max(2, Math.min(180, bestFwhm + dw));
        const l = lossFn(bestCenter, bestAmp, candW);
        if (l < currentLoss) {
          currentLoss = l;
          bestFwhm = candW;
          improved = true;
        }
      }
      if (!improved) {
        stepC *= 0.55;
        stepA *= 0.55;
        stepW *= 0.55;
      }
    }

    // Compute R^2 in local window
    const meanLocalY =
      localIndices.reduce((acc, k) => acc + y[k], 0) / (localIndices.length || 1);
    let ssTot = 0;
    for (const k of localIndices) {
      ssTot += Math.pow(y[k] - meanLocalY, 2);
    }
    const rSquared = ssTot > 0 ? Math.max(0, Math.min(0.999, 1 - currentLoss / ssTot)) : 0.98;

    // Analytical integrated area:
    // Gaussian: A * sigma * sqrt(2*pi) = A * (FWHM / 2.35482) * 2.506628 = 1.064467 * A * FWHM
    // Lorentzian: A * pi * (FWHM / 2) = 1.570796 * A * FWHM
    const area =
      fitShape === 'gaussian'
        ? 1.064467 * bestAmp * bestFwhm
        : 1.570796 * bestAmp * bestFwhm;

    const { bestMatch, alternatives } = matchVibrationalModes(bestCenter);

    return {
      id: `peak-${i + 1}`,
      index: peakIdx,
      center: Number(bestCenter.toFixed(1)),
      rawCenter: Number(rawCenter.toFixed(1)),
      amplitude: Number(bestAmp.toFixed(3)),
      rawIntensity: Number(rawIntensity.toFixed(3)),
      fwhm: Number(bestFwhm.toFixed(2)),
      area: Number(area.toFixed(2)),
      shape: fitShape,
      rSquared: Number(rSquared.toFixed(3)),
      assignedMode: bestMatch,
      alternatives,
      color: PEAK_COLORS[i % PEAK_COLORS.length]
    };
  });

  // Step 4: Build composite fitted curve across all x
  const compositeFit = x.map((xi) => {
    let sum = 0;
    for (const p of peaks) {
      sum += evaluatePeakProfile(xi, p.center, p.amplitude, p.fwhm, p.shape);
    }
    return sum;
  });

  return { peaks, compositeFit };
}

/**
 * Full pipeline execution: baseline -> subtraction -> smoothing -> normalization -> peak fitting
 */
export function runRamanPipeline(
  rawX: number[],
  rawY: number[],
  config: ProcessingConfig
): {
  baseline: number[];
  correctedY: number[];
  processedY: number[];
  peaks: PeakData[];
  compositeFit: number[];
} {
  const baseline = computeBaseline(
    rawX,
    rawY,
    config.baselineMethod,
    config.polyDegree,
    config.rollingRadius
  );

  const correctedY = rawY.map((v, i) => {
    const sub = config.baselineMethod === 'none' ? v : v - baseline[i];
    return config.baselineMethod === 'none' ? sub : Math.max(0, sub);
  });

  const smoothedY = applySmoothing(correctedY, config.smoothMethod, config.smoothWindow);
  const processedY = applyNormalization(rawX, smoothedY, config.normMethod);

  const { peaks, compositeFit } = detectAndFitPeaks(
    rawX,
    processedY,
    config.prominence,
    config.minDistance,
    config.fitShape
  );

  return {
    baseline,
    correctedY,
    processedY,
    peaks,
    compositeFit
  };
}
