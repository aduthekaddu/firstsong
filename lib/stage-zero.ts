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

type StageZeroFields = { [firstLineKey]: string; [rhythmKey]: Rhythm | null };
type StageZeroKey = keyof StageZeroFields;
const storageKey = (key: StageZeroKey) => `firstsong:v1:${key}`;
export const stageZeroWritingKeys = [storageKey(firstLineKey), storageKey(rhythmKey)];

// Rejected writes are visible only to this document. Never overwrite another
// field or another tab's saved value with an unsaved snapshot.
const temporaryWriting = new Map<StageZeroKey, StageZeroFields[StageZeroKey]>();
const listeners = new Set<() => void>();

export function subscribeToStageZeroWriting(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function isStageZeroWritingTemporary(key: StageZeroKey) {
  return temporaryWriting.has(key);
}

export function writeStageZeroField<K extends StageZeroKey>(key: K, value: StageZeroFields[K], storage: Pick<Storage, "setItem">) {
  const next = key === firstLineKey ? parseFirstLine(value) : parseRhythm(value);
  try {
    storage.setItem(storageKey(key), JSON.stringify(next));
    temporaryWriting.delete(key);
  } catch {
    temporaryWriting.set(key, next);
  }
  for (const listener of listeners) listener();
}

export function readStageZeroWriting(storage: Pick<Storage, "getItem">, onUnreadable?: (key: StageZeroKey) => void) {
  function read<T>(key: StageZeroKey, parse: (data: unknown) => T, isValid: (data: unknown) => boolean): T {
    if (temporaryWriting.has(key)) return parse(temporaryWriting.get(key));
    try {
      const raw = storage.getItem(storageKey(key));
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
