export const firstLineKey = "line";
export const rhythmKey = "rhythm";
export const maxLineLength = 180;

export type Rhythm = "rhythm-a" | "rhythm-b";

export function parseFirstLine(value: unknown) {
  return typeof value === "string" ? value.slice(0, maxLineLength) : "";
}

export function parseRhythm(value: unknown): Rhythm | null {
  return value === "rhythm-a" || value === "rhythm-b" ? value : null;
}

export const stageZeroWritingKeys = [firstLineKey, rhythmKey].map((name) => `firstsong:v1:${name}`);

export function readStageZeroWriting(storage: Pick<Storage, "getItem">) {
  function read(key: string): unknown {
    const raw = storage.getItem(`firstsong:v1:${key}`);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return { firstLine: parseFirstLine(read(firstLineKey)), rhythm: parseRhythm(read(rhythmKey)) };
}
