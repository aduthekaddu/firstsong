import { normalizeAudioDataUrl } from "./studio-audio";

export type LegacyTake = { audio: string; seconds: number; caption: string };
export const legacyTakes = [
  { id: "rhythm-a", label: "First rhythm A" },
  { id: "rhythm-b", label: "First rhythm B" },
  { id: "hook", label: "Stage 0 hook" },
] as const;

export const MAX_CAPTION_LENGTH = 240;

export function parseLegacyTake(value: unknown): LegacyTake | null {
  if (typeof value !== "object" || value === null) return null;
  const audio = "audio" in value && typeof value.audio === "string" ? normalizeAudioDataUrl(value.audio) : null;
  if (!audio) return null;
  if (
    !("seconds" in value) ||
    typeof value.seconds !== "number" ||
    !Number.isFinite(value.seconds) ||
    value.seconds < 0
  ) {
    return null;
  }
  if (!("caption" in value) || typeof value.caption !== "string") return null;
  return {
    audio,
    seconds: value.seconds,
    caption: value.caption.slice(0, MAX_CAPTION_LENGTH),
  };
}

export type LegacyTakeId = (typeof legacyTakes)[number]["id"];
export const legacyTakeKey = (id: LegacyTakeId) => `firstsong:v1:take:${id}`;

const temporaryTakes = new Map<LegacyTakeId, LegacyTake>();
const listeners = new Set<(id: LegacyTakeId) => void>();

export function subscribeToLegacyTakeChanges(listener: (id: LegacyTakeId) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function readLegacyTake(id: LegacyTakeId) {
  const temporary = temporaryTakes.get(id);
  if (temporary) return { value: temporary, temporary: true };
  const stored = localStorage.getItem(legacyTakeKey(id));
  const value = stored === null ? null : parseLegacyTake(JSON.parse(stored));
  if (stored !== null && !value) throw new Error("Invalid Stage 0 recording.");
  return { value, temporary: false };
}

export function writeLegacyTake(id: LegacyTakeId, take: LegacyTake) {
  let saved = false;
  try {
    localStorage.setItem(legacyTakeKey(id), JSON.stringify(take));
    temporaryTakes.delete(id);
    saved = true;
  } catch {
    temporaryTakes.set(id, take);
  }
  // Only this document hears about failed writes; successful writes also
  // produce the browser's normal storage event in other tabs.
  for (const listener of listeners) listener(id);
  return saved;
}
