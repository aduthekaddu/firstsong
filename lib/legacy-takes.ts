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
