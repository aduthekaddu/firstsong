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

export function readStageZeroWriting(storage: Pick<Storage, "getItem">, onUnreadable?: (key: string) => void) {
  function read<T>(key: string, parse: (data: unknown) => T, isValid: (data: unknown) => boolean): T {
    try {
      const raw = storage.getItem(`firstsong:v1:${key}`);
      if (raw === null) return parse(null);
      const value: unknown = JSON.parse(raw);
      if (isValid(value)) return parse(value);
    } catch {
      // Read the other field even if this one is damaged or unavailable.
    }
    onUnreadable?.(key);
    return parse(null);
  }
  return {
    firstLine: read(firstLineKey, parseFirstLine, (value) => typeof value === "string"),
    rhythm: read(rhythmKey, parseRhythm, (value) => value === null || parseRhythm(value) !== null),
  };
}
