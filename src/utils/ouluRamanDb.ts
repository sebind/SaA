import { ReferenceMaterial } from '../types/spectrum';
import { VibrationalEntry } from '../data/ramanReferenceData';

interface OuluActivity {
  bandIndex: number;
  frequency: number;
  tensor: number[][];
}

/**
 * Parse a Raman tensor YAML file downloaded from https://ramandb.oulu.fi/ramandb/
 * ("Download tensors for python" -> e.g. mp-1434.yaml) or JSON document from mbagheri20/ramandb
 * using the exact CoRaPy (Bagheri & Komsa, Sci. Data 2023) Raman activity & intensity equations.
 */
export function parseOuluRamanDbYaml(
  text: string,
  filename: string
): {
  reference: ReferenceMaterial;
  modes: VibrationalEntry[];
} {
  const cleanName = filename.replace(/\.(yaml|yml|json)$/i, '');
  const activities: OuluActivity[] = [];

  // Try JSON first in case user uploads a JSON entry from mbagheri20/ramandb
  if (text.trim().startsWith('{')) {
    try {
      const obj = JSON.parse(text);
      const list = obj.raman_activities || obj.activities || [];
      for (const item of list) {
        const freq = Number(item['frequency(1/cm)'] ?? item.frequency);
        const tensor = item.raman_tensor ?? item.tensor;
        if (Number.isFinite(freq) && Array.isArray(tensor) && tensor.length === 3) {
          activities.push({
            bandIndex: Number(item.band_index ?? activities.length + 1),
            frequency: freq,
            tensor
          });
        }
      }
    } catch {
      // Fall through to YAML parser
    }
  }

  // Parse Oulu CRD YAML format
  if (activities.length === 0) {
    const blocks = text.split(/-\s*#\d+/);
    for (let b = 1; b < blocks.length; b++) {
      const block = blocks[b];
      const bandMatch = block.match(/band_index:\s*(\d+)/);
      const freqMatch = block.match(/frequency\(1\/cm\):\s*([+-]?\d+(?:\.\d+)?)/);
      const rowMatches = [...block.matchAll(/\[\s*([^\]]+)\]/g)];

      if (freqMatch && rowMatches.length >= 3) {
        const freq = Number(freqMatch[1]);
        const tensor: number[][] = [];
        for (let r = 0; r < 3; r++) {
          const nums = rowMatches[r][1]
            .split(',')
            .map((s) => Number(s.trim()));
          if (nums.length === 3 && nums.every(Number.isFinite)) {
            tensor.push(nums);
          }
        }
        if (Number.isFinite(freq) && freq > 5 && tensor.length === 3) {
          activities.push({
            bandIndex: bandMatch ? Number(bandMatch[1]) : b,
            frequency: freq,
            tensor
          });
        }
      }
    }
  }

  if (activities.length === 0) {
    throw new Error(
      'No valid Raman tensor activities found. Upload a YAML/JSON tensor file from ramandb.oulu.fi.'
    );
  }

  // Compute Raman activity & Bose-Einstein thermal intensity at 300 K (CoRaPy formula)
  const hbar = 1.054571817e-34;
  const kT = 4.11e-21; // J (300 K)
  const rawPeaks: { freq: number; intensity: number; bandIndex: number }[] = [];

  for (const act of activities) {
    const t = act.tensor;
    const alpha2 = Math.pow((t[0][0] + t[1][1] + t[2][2]) / 3.0, 2);
    const beta2 =
      (Math.pow(t[0][0] - t[1][1], 2) +
        Math.pow(t[0][0] - t[2][2], 2) +
        Math.pow(t[1][1] - t[2][2], 2) +
        6.0 * (t[0][1] * t[0][1] + t[0][2] * t[0][2] + t[1][2] * t[1][2])) /
      2.0;

    const ramanActivity = 45.0 * alpha2 + 7.0 * beta2;
    const wnRadPerSec = act.frequency * 0.02998 * 1e12 * 2 * Math.PI;
    const boseN = 1.0 / (Math.exp((hbar * wnRadPerSec) / kT) - 1.0);
    const intensity = ramanActivity * ((boseN + 1.0) / wnRadPerSec);

    if (intensity > 0) {
      rawPeaks.push({
        freq: Number(act.frequency.toFixed(1)),
        intensity,
        bandIndex: act.bandIndex
      });
    }
  }

  // Merge degenerate phonon modes within 0.8 cm^-1
  const merged: { freq: number; intensity: number; bands: number[] }[] = [];
  for (const rp of rawPeaks) {
    const existing = merged.find((m) => Math.abs(m.freq - rp.freq) <= 0.8);
    if (existing) {
      existing.intensity += rp.intensity;
      existing.bands.push(rp.bandIndex);
    } else {
      merged.push({
        freq: rp.freq,
        intensity: rp.intensity,
        bands: [rp.bandIndex]
      });
    }
  }

  const maxInt = Math.max(...merged.map((m) => m.intensity), 1e-30);

  // Filter out silent modes (< 1% of max intensity)
  const activePeaks = merged
    .filter((m) => m.intensity / maxInt >= 0.01)
    .sort((a, b) => a.freq - b.freq);

  const reference: ReferenceMaterial = {
    id: `oulu-${cleanName.toLowerCase()}`,
    name: `Oulu CRD ${cleanName}`,
    formula: cleanName,
    category: 'Oulu RamanDB (DFT)',
    notes: 'Computed from Oulu CRD Raman tensors via CoRaPy equation.',
    peaks: activePeaks.map((p) => ({
      wavenumber: p.freq,
      relativeIntensity: Number((p.intensity / maxInt).toFixed(3)),
      label: `Band ${p.bands.join('/')}`,
      symmetry: 'DFT'
    }))
  };

  const modes: VibrationalEntry[] = activePeaks.map((p, idx) => ({
    id: `oulu-mode-${cleanName}-${idx}`,
    mode: `CRD Phonon Band ${p.bands.join('/')}`,
    bond: cleanName,
    materialGroup: `Oulu CRD (${cleanName})`,
    referenceWavenumber: p.freq,
    range: [Number((p.freq - 12).toFixed(1)), Number((p.freq + 12).toFixed(1))],
    description: `First-principles Raman mode from Oulu CRD (${cleanName})`
  }));

  return { reference, modes };
}
