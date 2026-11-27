export type StudioTake = { blob: Blob; seconds: number; createdAt: number };
type StoredTake = Omit<StudioTake, "blob"> & { bytes: ArrayBuffer; type: string };

const volatile = new Map<string, StudioTake>();

function openTakes(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("firstsong-studio", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("takes");
    req.onsuccess = () => {
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openTakes();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction("takes", mode);
      const req = run(tx.objectStore("takes"));
      tx.oncomplete = () => resolve(req.result);
      tx.onabort = tx.onerror = () => reject(tx.error ?? req.error);
    });
  } finally {
    db.close();
  }
}

export async function getTake(id: string): Promise<StudioTake | null> {
  if (volatile.has(id)) return volatile.get(id) ?? null;
  const saved: StudioTake | StoredTake | undefined = await transact("readonly", (store) => store.get(id));
  if (!saved) return null;
  if ("blob" in saved) return saved;
  const { bytes, type, seconds, createdAt } = saved;
  return { blob: new Blob([bytes], { type }), seconds, createdAt };
}

export async function saveTake(id: string, take: StudioTake) {
  volatile.set(id, take);
  // Store plain bytes rather than relying on IndexedDB's Blob backing store.
  // Read the Blob before opening a transaction, which may auto-close on await.
  const { blob, seconds, createdAt } = take;
  const stored: StoredTake = { bytes: await blob.arrayBuffer(), type: blob.type, seconds, createdAt };
  await transact("readwrite", (store) => store.put(stored, id));
  if (volatile.get(id) === take) volatile.delete(id);
}

export function audioExtension(type: string) {
  const kind = type.split(";")[0].toLowerCase();
  if (kind === "audio/mp4" || kind === "video/mp4") return "m4a";
  if (kind === "audio/webm" || kind === "video/webm") return "webm";
  if (kind === "audio/ogg" || kind === "application/ogg") return "ogg";
  if (kind === "audio/wav" || kind === "audio/x-wav") return "wav";
  if (kind === "audio/mpeg") return "mp3";
  if (kind === "audio/aac") return "aac";
  return "audio";
}

export function normalizeAudioDataUrl(value: string): string | null {
  // WebKit can emit parameters such as "; codecs=opus". Normalize the header
  // only; keep both the audio type allowlist and the original encoded bytes.
  const match = /^(data:audio\/(?:webm|mp4|ogg|aac|wav|x-wav|mpeg)(?:;[ \t]*[\w=,.+-]+)*;[ \t]*base64,)([a-z\d+/]+=*)$/i.exec(value);
  if (!match) return null;
  const header = match[1].replace(/[ \t]+/g, "");
  return header === match[1] ? value : header + match[2];
}

export function encodeWav(channels: readonly Float32Array[], rate: number, from: number, to: number) {
  if (!channels.length || channels.some((ch) => ch.length !== channels[0].length) || !Number.isInteger(rate) || rate <= 0) {
    throw new Error("Invalid audio data.");
  }
  const length = channels[0].length;
  const start = Math.max(0, Math.min(length, Math.round(from * rate)));
  const end = Math.max(0, Math.min(length, Math.round(to * rate)));
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) throw new Error("Choose a nonempty range.");
  const bytesPerFrame = channels.length * 2;
  const size = (end - start) * bytesPerFrame;
  const view = new DataView(new ArrayBuffer(44 + size));
  function ascii(offset: number, value: string) {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  }
  ascii(0, "RIFF");
  view.setUint32(4, size + 36, true);
  ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels.length, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * bytesPerFrame, true);
  view.setUint16(32, bytesPerFrame, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, size, true);
  let offset = 44;
  for (let i = start; i < end; i++) {
    for (const ch of channels) {
      const sample = Math.min(1, Math.max(-1, ch[i]));
      view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true);
      offset += 2;
    }
  }
  return new Blob([view.buffer], { type: "audio/wav" });
}

export function downloadFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function formatClock(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export function buildSongSheet(fields: { title: string; hook: string; verseOne: string; verseTwo: string; chorus: string; chords: string; ending: string; arrangement: string }) {
  return [
    fields.title.trim() || "Untitled song",
    "Form: verse 1 → chorus → verse 2 → chorus",
    ...([
      ["Chords", fields.chords], ["Verse 1", fields.verseOne], ["Chorus", fields.chorus || fields.hook],
      ["Verse 2", fields.verseTwo], ["Ending", fields.ending], ["Arrangement notes", fields.arrangement],
    ].filter(([, value]) => value.trim()).map(([label, value]) => `${label}\n${value.trim()}`)),
  ].join("\n\n") + "\n";
}
