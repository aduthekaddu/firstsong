import { guitarStrings, type Chord } from "./chords";

let sharedAudio: AudioContext | null = null;
let bodyBus: { input: GainNode } | null = null;
const stringBufferCache = new Map<string, AudioBuffer>();

export async function openAudio(existing?: AudioContext | null) {
  const context = existing ?? sharedAudio ?? new AudioContext();
  if (!existing) sharedAudio = context;
  try {
    if (context.state === "suspended") await context.resume();
    return context;
  } catch (error) {
    if (!existing && sharedAudio === context) {
      sharedAudio = null;
      bodyBus = null;
      stringBufferCache.clear();
      void context.close();
    }
    throw error;
  }
}

/**
 * Shared dreadnought spruce soundboard body bus:
 * Helmholtz air resonance (~104 Hz), spruce top mode (~212 Hz), gentle high sheen control,
 * and subtle soft limiter so full 6-string strums sound woody and balanced without clipping.
 */
function getAcousticBody(context: AudioContext): AudioNode {
  if (context === sharedAudio && bodyBus) return bodyBus.input;

  const input = context.createGain();
  input.gain.value = 0.92;

  const airMode = context.createBiquadFilter();
  airMode.type = "peaking";
  airMode.frequency.value = 104;
  airMode.Q.value = 2.4;
  airMode.gain.value = 3.2;

  const topMode = context.createBiquadFilter();
  topMode.type = "peaking";
  topMode.frequency.value = 212;
  topMode.Q.value = 1.6;
  topMode.gain.value = 2.6;

  const woodyMid = context.createBiquadFilter();
  woodyMid.type = "peaking";
  woodyMid.frequency.value = 430;
  woodyMid.Q.value = 1.8;
  woodyMid.gain.value = -1.8;

  const airSheen = context.createBiquadFilter();
  airSheen.type = "lowpass";
  airSheen.frequency.value = 6200;
  airSheen.Q.value = 0.65;

  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -14;
  compressor.knee.value = 16;
  compressor.ratio.value = 3.2;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.16;

  input
    .connect(airMode)
    .connect(topMode)
    .connect(woodyMid)
    .connect(airSheen)
    .connect(compressor)
    .connect(context.destination);

  if (context === sharedAudio) {
    bodyBus = { input };
  }
  return input;
}

/**
 * Extended Karplus-Strong physical acoustic guitar string model with fractional delay
 * (exact concert pitch A4 = 440 Hz), pick-position comb filtering, and string-gauge damping.
 * Synthesized once per (hz, duration) into a cached AudioBuffer (< 2ms compute, 0ms replay).
 */
function buildAcousticStringBuffer(
  context: AudioContext,
  hz: number,
  durationSeconds: number,
  brightness = 0.56
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const key = `${sampleRate}:${hz.toFixed(2)}:${durationSeconds.toFixed(1)}:${brightness.toFixed(2)}`;
  const cached = stringBufferCache.get(key);
  if (cached) return cached;

  const length = Math.max(1, Math.floor(sampleRate * durationSeconds));
  const buffer = context.createBuffer(1, length, sampleRate);
  const out = buffer.getChannelData(0);

  // Exact fractional period length (compensates 0.5-sample phase lag of 2-point lowpass loop)
  const exactPeriod = sampleRate / hz;
  const delayInt = Math.max(2, Math.floor(exactPeriod - 0.5));
  const frac = Math.max(0, Math.min(0.999, exactPeriod - 0.5 - delayInt));

  // Deterministic pseudo-random excitation so tone is consistent and crisp
  let seed = Math.floor(hz * 997) ^ 0x5bd1e995;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };

  // Seed delay line with warm low-passed pick impulse + pick-position comb notch (22% from bridge)
  const rawNoise = new Float32Array(delayInt + 2);
  let lp = 0;
  const initCoeff = 0.34 + brightness * 0.28;
  for (let i = 0; i < rawNoise.length; i++) {
    const n = nextRand();
    lp = lp + initCoeff * (n - lp);
    rawNoise[i] = lp;
  }

  const pickOffset = Math.max(1, Math.round(delayInt * 0.22));
  const ring = new Float32Array(delayInt + 1);
  let dcMean = 0;
  for (let i = 0; i <= delayInt; i++) {
    const combed = rawNoise[i] - 0.58 * rawNoise[(i + pickOffset) % rawNoise.length];
    ring[i] = combed;
    dcMean += combed;
  }
  dcMean /= delayInt + 1;
  for (let i = 0; i <= delayInt; i++) {
    ring[i] -= dcMean;
  }

  // Natural acoustic decay tuned by frequency: bass strings ring longer, high frets tighten slightly
  const decay = hz < 150 ? 0.9974 : hz < 260 ? 0.9968 : 0.996;
  const blend = 0.48 + brightness * 0.14; // lowpass smoothness inside the loop
  let readIdx = 0;
  let allpassPrev = 0;

  const attackSamples = Math.max(1, Math.floor(sampleRate * 0.0045));
  const tailStart = Math.floor(length * 0.84);
  const tailLen = Math.max(1, length - tailStart);

  for (let i = 0; i < length; i++) {
    const cur = ring[readIdx];
    const nextIdx = readIdx + 1 > delayInt ? 0 : readIdx + 1;
    const nxt = ring[nextIdx];

    // 2-point weighted damping filter + fractional delay linear interpolation
    const filtered = decay * (blend * cur + (1 - blend) * nxt);
    const interp = (1 - frac) * filtered + frac * allpassPrev;
    allpassPrev = filtered;

    ring[readIdx] = interp;
    readIdx = nextIdx;

    // Gentle pick transient shaping and smooth fade-out tail (zero click at buffer end)
    let env = 1;
    if (i < attackSamples) {
      env = i / attackSamples;
    } else if (i > tailStart) {
      const t = (i - tailStart) / tailLen;
      env = 1 - t * t;
    }
    out[i] = cur * env;
  }

  // Normalize peak to 0.88 so every string has consistent acoustic loudness
  let peak = 0.001;
  for (let i = 0; i < length; i++) {
    const a = Math.abs(out[i]);
    if (a > peak) peak = a;
  }
  const scale = 0.88 / peak;
  for (let i = 0; i < length; i++) {
    out[i] *= scale;
  }

  // Cap cache size to 96 notes
  if (stringBufferCache.size > 96) {
    const firstKey = stringBufferCache.keys().next().value;
    if (firstKey) stringBufferCache.delete(firstKey);
  }
  stringBufferCache.set(key, buffer);
  return buffer;
}

export function scheduleTone({
  context,
  hz,
  duration,
  start,
  volume,
  type = "sine",
}: {
  context: AudioContext;
  hz: number;
  duration: number;
  start: number;
  volume: number;
  type?: OscillatorType;
}) {
  const tone = context.createOscillator();
  const envelope = context.createGain();
  tone.type = type;
  tone.frequency.setValueAtTime(hz, start);
  tone.connect(envelope).connect(context.destination);
  envelope.gain.setValueAtTime(0.0008, start);
  envelope.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0008, start + duration);
  tone.start(start);
  tone.stop(start + duration + 0.015);
  return tone;
}

/** Crisp acoustic woodblock click for the Week 1 Downstroke Trainer */
export function scheduleMetronomeClick({
  context,
  start,
  accent = false,
  volume = 0.24,
}: {
  context: AudioContext;
  start: number;
  accent?: boolean;
  volume?: number;
}) {
  const osc = context.createOscillator();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(accent ? 1240 : 820, start);
  osc.frequency.exponentialRampToValueAtTime(accent ? 680 : 460, start + 0.042);

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(accent ? 1580 : 980, start);
  filter.Q.value = 2.8;

  gain.gain.setValueAtTime(0.0008, start);
  gain.gain.linearRampToValueAtTime(accent ? volume : volume * 0.72, start + 0.0025);
  gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.068);

  osc.connect(filter).connect(gain).connect(context.destination);
  osc.start(start);
  osc.stop(start + 0.075);
  return osc;
}

export function fretHz(stringIndex: number, fret: number): number {
  const base = guitarStrings[stringIndex]?.hz ?? 82.41;
  return Number((base * Math.pow(2, fret / 12)).toFixed(2));
}

export function pluckString({
  context,
  hz,
  start = context.currentTime,
  duration = 2.5,
  volume = 0.34,
  brightness = 0.56,
}: {
  context: AudioContext;
  hz: number;
  start?: number;
  duration?: number;
  volume?: number;
  brightness?: number;
}): AudioBufferSourceNode {
  const buffer = buildAcousticStringBuffer(context, hz, duration, brightness);
  const src = context.createBufferSource();
  src.buffer = buffer;

  const gain = context.createGain();
  gain.gain.setValueAtTime(volume, start);

  const destination = getAcousticBody(context);
  src.connect(gain).connect(destination);
  src.start(start);
  return src;
}

export function strumChord({
  context,
  chord,
  spreadSeconds = 0.034,
  direction = "down",
  volume = 0.24,
  onStringPluck,
}: {
  context: AudioContext;
  chord: Chord;
  spreadSeconds?: number;
  direction?: "down" | "up";
  volume?: number;
  onStringPluck?: (stringIndex: number) => void;
}) {
  const now = context.currentTime + 0.012;
  const order = direction === "down" ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];
  let played = 0;

  for (const index of order) {
    const pos = chord.strings[index];
    if (pos === "x") continue;
    const fret = pos === 0 ? 0 : pos[0];
    const hz = fretHz(index, fret);
    const delay = played * spreadSeconds;
    const stringBrightness = index < 3 ? 0.48 : 0.64;
    pluckString({
      context,
      hz,
      start: now + delay,
      duration: 2.6,
      volume: volume * (index === 0 ? 1.08 : 1),
      brightness: stringBrightness,
    });
    if (onStringPluck) {
      window.setTimeout(() => onStringPluck(index), Math.round(delay * 1000));
    }
    played++;
  }
}
