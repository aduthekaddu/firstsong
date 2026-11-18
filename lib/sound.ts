export async function openAudio(existing: AudioContext | null) {
  const context = existing ?? new AudioContext();
  try {
    if (context.state === "suspended") await context.resume();
    return context;
  } catch (error) {
    if (!existing) void context.close();
    throw error;
  }
}

export function scheduleTone({
  context, hz, duration, start, volume, type = "sine",
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
  tone.frequency.value = hz;
  tone.connect(envelope).connect(context.destination);
  envelope.gain.setValueAtTime(0.001, start);
  envelope.gain.exponentialRampToValueAtTime(volume, start + 0.018);
  envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
  tone.start(start);
  tone.stop(start + duration + 0.01);
  return tone;
}
