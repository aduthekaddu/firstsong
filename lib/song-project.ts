export const songFields = ["title", "hook", "keyword", "details", "verseOne", "verseTwo", "chorus", "chords", "ending", "arrangement", "revision"] as const;
export type SongField = (typeof songFields)[number];
export type SongProject = Record<SongField, string>;

export const emptySong = Object.fromEntries(songFields.map((field) => [field, ""])) as SongProject;

export function songFieldLimit(field: SongField) {
  return field === "title" || field === "keyword" ? 100 : 4000;
}

export function parseSong(value: unknown): SongProject {
  if (!value || typeof value !== "object") return emptySong;
  const input = value as Record<string, unknown>;
  return Object.fromEntries(songFields.map((field) => [
    field,
    typeof input[field] === "string" ? input[field].slice(0, songFieldLimit(field)) : "",
  ])) as SongProject;
}

export type TakeSpec = { id: string; label: string; maxSeconds: number; bars?: number; trim?: boolean; fullWav?: boolean };

export const studioTakes = {
  melody: { id: "melody", label: "Melody sketch", maxSeconds: 30 },
  memo: { id: "memo", label: "Four-bar memo", maxSeconds: 24, bars: 4 },
  verse: { id: "verse", label: "Eight-bar verse", maxSeconds: 48, bars: 8 },
  contrast: { id: "contrast", label: "Verse and chorus", maxSeconds: 90 },
  draft: { id: "draft", label: "Full draft", maxSeconds: 300 },
  chorusA: { id: "chorus-a", label: "Chorus A", maxSeconds: 90 },
  chorusB: { id: "chorus-b", label: "Chorus B", maxSeconds: 90 },
  soundcheck: { id: "soundcheck", label: "Sound check", maxSeconds: 25 },
  final: { id: "final", label: "Final song", maxSeconds: 360, trim: true },
  guitar: { id: "guitar", label: "Guitar pass (optional)", maxSeconds: 360, fullWav: true },
  vocal: { id: "vocal", label: "Voice pass (optional)", maxSeconds: 360, fullWav: true },
} satisfies Record<string, TakeSpec>;
