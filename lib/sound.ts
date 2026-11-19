import { guitarStrings, type Chord } from "./chords";

let sharedAudio: AudioContext | null = null;

export async function openAudio(existing?: AudioContext | null) {
  const context = existing ?? sharedAudio ?? new AudioContext();
  if (!existing) sharedAudio = context;
  try {
    if (context.state === "suspended") await context.resume();
    return context;
  } catch (error) {
    if (!existing && sharedAudio === context) {
      sharedAudio = null;
      void context.close();
    }
    throw error;
  }
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

/** Crisp acoustic woodblock / rim click for Downstroke Trainer */
export function scheduleMetronomeClick({
  context,
  start,
  accent = false,
  volume = 0.22,
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
  osc.frequency.setValueAtTime(accent ? 1180 : 780, start);
  osc.frequency.exponentialRampToValueAtTime(accent ? 640 : 440, start + 0.045);

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(accent ? 1500 : 950, start);
  filter.Q.value = 2.6;

  gain.gain.setValueAtTime(0.0008, start);
  gain.gain.linearRampToValueAtTime(accent ? volume : volume * 0.72, start + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.07);

  osc.connect(filter).connect(gain).connect(context.destination);
  osc.start(start);
  osc.stop(start + 0.08);
  return osc;
}

export function fretHz(stringIndex: number, fret: number): number {
  const base = guitarStrings[stringIndex]?.hz ?? 82.41;
  return Number((base * Math.pow(2, fret / 12)).toFixed(2));
}

/**
 * Warm acoustic plucked-string synthesis:
 * combines a brief filtered pick transient (short noise burst) with a body-resonant
 * harmonic ladder whose upper partials decay faster than the fundamental, matching
 * a real phosphor-bronze acoustic guitar string.
 */
export function pluckString({
  context,
  hz,
  start = context.currentTime,
  duration = 2.35,
  volume = 0.22,
}: {
  context: AudioContext;
  hz: number;
  start?: number;
  duration?: number;
  volume?: number;
}) {
  // Warm acoustic soundboard resonance + high-frequency string damping
  const body = context.createBiquadFilter();
  body.type = "peaking";
  body.frequency.value = 195;
  body.Q.value = 1.4;
  body.gain.value = 4.2;

  const damper = context.createBiquadFilter();
  damper.type = "lowpass";
  damper.frequency.setValueAtTime(Math.min(5200, hz * 11), start);
  damper.frequency.exponentialRampToValueAtTime(Math.max(240, hz * 2.1), start + duration * 0.72);
  damper.Q.value = 0.9;

  const master = context.createGain();
  master.gain.setValueAtTime(0.0001, start);
  master.gain.linearRampToValueAtTime(volume, start + 0.006);
  master.gain.exponentialRampToValueAtTime(volume * 0.42, start + 0.26);
  master.gain.exponentialRampToValueAtTime(0.0006, start + duration);

  damper.connect(body).connect(master).connect(context.destination);

  // Brief acoustic finger/pick attack transient (14ms filtered noise burst)
  const burstLen = Math.max(1, Math.floor(context.sampleRate * 0.016));
  const noiseBuf = context.createBuffer(1, burstLen, context.sampleRate);
  const ch = noiseBuf.getChannelData(0);
  for (let i = 0; i < burstLen; i++) {
    ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (burstLen * 0.28));
  }
  const noise = context.createBufferSource();
  noise.buffer = noiseBuf;
  const noiseFilter = context.createBiquadFilter();
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = Math.min(3200, Math.max(600, hz * 5));
  noiseFilter.Q.value = 1.6;
  const noiseGain = context.createGain();
  noiseGain.gain.setValueAtTime(volume * 0.45, start);
  noise.connect(noiseFilter).connect(noiseGain).connect(body);
  noise.start(start);

  // Harmonic partials with natural acoustic detune & relative decay
  const partials: Array<{ ratio: number; gain: number; type: OscillatorType; detune: number }> = [
    { ratio: 1, gain: 0.64, type: "triangle", detune: 0 },
    { ratio: 2, gain: 0.24, type: "sine", detune: 1.5 },
    { ratio: 3, gain: 0.09, type: "sawtooth", detune: -1.8 },
    { ratio: 4, gain: 0.04, type: "sine", detune: 2.2 },
  ];

  const nodes = partials.map((part) => {
    const osc = context.createOscillator();
    const g = context.createGain();
    osc.type = part.type;
    osc.frequency.setValueAtTime(hz * part.ratio, start);
    osc.detune.setValueAtTime(part.detune, start);
    g.gain.setValueAtTime(part.gain, start);
    if (part.ratio >= 3) {
      g.gain.exponentialRampToValueAtTime(0.001, start + duration * 0.45);
    }
    osc.connect(g).connect(damper);
    osc.start(start);
    osc.stop(start + duration + 0.03);
    return osc;
  });

  return nodes[0];
}

export function strumChord({
  context,
  chord,
  spreadSeconds = 0.038,
  direction = "down",
  volume = 0.15,
  onStringPluck,
}: {
  context: AudioContext;
  chord: Chord;
  spreadSeconds?: number;
  direction?: "down" | "up";
  volume?: number;
  onStringPluck?: (stringIndex: number) => void;
}) {
  const now = context.currentTime + 0.015;
  const order = direction === "down" ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];
  let played = 0;

  for (const index of order) {
    const pos = chord.strings[index];
    if (pos === "x") continue;
    const fret = pos === 0 ? 0 : pos[0];
    const hz = fretHz(index, fret);
    const delay = played * spreadSeconds;
    pluckString({
      context,
      hz,
      start: now + delay,
      duration: 2.4,
      volume,
    });
    if (onStringPluck) {
      window.setTimeout(() => onStringPluck(index), Math.round(delay * 1000));
    }
    played++;
  }
}
