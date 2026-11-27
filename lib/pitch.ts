import { guitarStrings } from "./chords";

export type PitchReading = {
  hz: number;
  noteName: string;
  cents: number;
  nearestStringIndex: number;
  nearestStringCents: number;
  confidence: number;
  rms: number;
};

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const MIN_PITCH_HZ = 65;
const MAX_PITCH_HZ = 440;
const MIN_WINDOW = 2048;
const MAX_WINDOW = 32768;

export function guitarAnalyserWindow(sampleRate: number): number {
  // YIN compares the first half-window with delayed samples. Leave room for
  // a whole period of the lowest expected pitch plus its interpolation samples.
  const needed = 2 * (Math.ceil(sampleRate / MIN_PITCH_HZ) + 2);
  let window = MIN_WINDOW;
  while (window < needed && window < MAX_WINDOW) window *= 2;
  return window;
}

/**
 * Pure TypeScript YIN cumulative mean normalized difference (CMNDF) pitch detector
 * tuned for acoustic/electric guitar fundamentals (65 Hz to 440 Hz).
 * Uses a caller-provided scratch buffer so per-frame RAF calls allocate zero heap memory.
 */
export function detectGuitarPitch(
  samples: Float32Array,
  sampleRate: number,
  diffScratch: Float32Array
): PitchReading | null {
  const n = samples.length;
  let sumSq = 0;
  for (let i = 0; i < n; i++) {
    const s = samples[i];
    sumSq += s * s;
  }
  const rms = Math.sqrt(sumSq / n);
  if (rms < 0.012) return null;

  const half = n >> 1;
  const minTau = Math.max(16, Math.floor(sampleRate / MAX_PITCH_HZ));
  const maxTau = Math.min(half - 2, Math.ceil(sampleRate / MIN_PITCH_HZ));
  if (maxTau <= minTau || diffScratch.length < maxTau + 2) return null;

  // Step 1: Difference function d(tau)
  diffScratch[0] = 1;
  let runningSum = 0;
  let bestTau = -1;
  const threshold = 0.16;

  for (let tau = 1; tau <= maxTau; tau++) {
    let diff = 0;
    for (let i = 0; i < half; i++) {
      const delta = samples[i] - samples[i + tau];
      diff += delta * delta;
    }
    runningSum += diff;
    const cmndf = runningSum > 0 ? (diff * tau) / runningSum : 1;
    diffScratch[tau] = cmndf;

    if (tau >= minTau && bestTau === -1 && cmndf < threshold) {
      // Walk to local minimum
      while (tau + 1 <= maxTau) {
        let nextDiff = 0;
        for (let i = 0; i < half; i++) {
          const d = samples[i] - samples[i + tau + 1];
          nextDiff += d * d;
        }
        runningSum += nextDiff;
        const nextCmndf = runningSum > 0 ? (nextDiff * (tau + 1)) / runningSum : 1;
        diffScratch[tau + 1] = nextCmndf;
        if (nextCmndf < diffScratch[tau]) {
          tau++;
        } else {
          break;
        }
      }
      bestTau = tau;
      break;
    }
  }

  // Fallback to global minimum in range if reasonably periodic
  if (bestTau === -1) {
    let minVal = 0.24;
    for (let tau = minTau; tau <= maxTau; tau++) {
      if (diffScratch[tau] < minVal) {
        minVal = diffScratch[tau];
        bestTau = tau;
      }
    }
  }

  if (bestTau === -1) return null;

  // Parabolic interpolation around bestTau for sub-cent accuracy
  const prev = diffScratch[Math.max(1, bestTau - 1)];
  const curr = diffScratch[bestTau];
  const next = diffScratch[Math.min(maxTau, bestTau + 1)];
  const denom = 2 * (prev - 2 * curr + next);
  const refinedTau = denom !== 0 ? bestTau + (prev - next) / denom : bestTau;

  const hz = sampleRate / refinedTau;
  if (!Number.isFinite(hz) || hz < MIN_PITCH_HZ || hz > MAX_PITCH_HZ) return null;

  // Chromatic pitch calculation (A4 = 440 Hz, MIDI 69)
  const midiFloat = 69 + 12 * Math.log2(hz / 440);
  const midiRound = Math.round(midiFloat);
  const cents = Math.round((midiFloat - midiRound) * 100);
  const noteName = `${NOTE_NAMES[((midiRound % 12) + 12) % 12]}${Math.floor(midiRound / 12) - 1}`;

  // Nearest standard guitar string (E2, A2, D3, G3, B3, E4)
  let nearestStringIndex = 0;
  let nearestAbsCents = Infinity;
  let nearestStringCents = 0;
  for (let i = 0; i < guitarStrings.length; i++) {
    const stringCents = Math.round(1200 * Math.log2(hz / guitarStrings[i].hz));
    const absC = Math.abs(stringCents);
    if (absC < nearestAbsCents) {
      nearestAbsCents = absC;
      nearestStringIndex = i;
      nearestStringCents = stringCents;
    }
  }

  return {
    hz,
    noteName,
    cents,
    nearestStringIndex,
    nearestStringCents,
    confidence: Math.max(0, Math.min(1, 1 - curr)),
    rms,
  };
}
