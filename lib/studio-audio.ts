export type StudioTake = { blob: Blob; seconds: number; createdAt: number };
type StoredTake = Omit<StudioTake, "blob"> & { bytes: ArrayBuffer; type: string };

export const interruptedTakeMessage = "The recording was interrupted. Any earlier take is unchanged.";

export function hasRecordingInput(stream: MediaStream | null): boolean {
  return stream?.getAudioTracks().some((track) => track.readyState === "live" && !track.muted) ?? false;
}

const volatile = new Map<string, StudioTake>();

type TakeListener = (id: string) => void;
const takeListeners = new Set<TakeListener>();
const takeChannelName = "firstsong:studio-takes:v1";
let takeChannel: BroadcastChannel | undefined;

export function subscribeToTakeChanges(listener: TakeListener) {
  takeListeners.add(listener);
  if (!takeChannel && typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
    try {
      takeChannel = new BroadcastChannel(takeChannelName);
      takeChannel.onmessage = ({ data }) => {
        if (typeof data === "string") for (const receive of takeListeners) receive(data);
      };
    } catch {
      // Focus and page restoration refresh views when broadcasting is unavailable.
    }
  }
  return () => {
    takeListeners.delete(listener);
    if (!takeListeners.size) {
      takeChannel?.close();
      takeChannel = undefined;
    }
  };
}

function notifyTakeChanged(id: string, shared: boolean) {
  for (const listener of takeListeners) listener(id);
  if (!shared || typeof window === "undefined" || typeof BroadcastChannel === "undefined") return;
  try {
    const sender = takeChannel ?? new BroadcastChannel(takeChannelName);
    try {
      sender.postMessage(id);
    } finally {
      if (sender !== takeChannel) sender.close();
    }
  } catch {
    // A committed take is still saved if another tab cannot be notified.
  }
}

export function subscribeToPageReturn(refresh: () => void) {
  function visible() {
    if (document.visibilityState === "visible") refresh();
  }
  window.addEventListener("focus", refresh);
  window.addEventListener("pageshow", refresh);
  document.addEventListener("visibilitychange", visible);
  return () => {
    window.removeEventListener("focus", refresh);
    window.removeEventListener("pageshow", refresh);
    document.removeEventListener("visibilitychange", visible);
  };
}

export function sameStudioTake(a: StudioTake | null, b: StudioTake | null) {
  if (a === b) return true;
  return !!a && !!b && a.createdAt === b.createdAt && a.seconds === b.seconds
    && a.blob.size === b.blob.size && a.blob.type === b.blob.type;
}

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

export function getTemporaryTake(id: string) {
  return volatile.get(id);
}

export async function getTake(id: string): Promise<StudioTake | null> {
  const temporary = getTemporaryTake(id);
  if (temporary) return temporary;
  const saved: unknown = await transact("readonly", (store) => store.get(id));
  if (saved === undefined) return null;
  if (!saved || typeof saved !== "object") throw new Error("Invalid saved take.");
  const { seconds, createdAt } = saved as Partial<StudioTake>;
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0 ||
    typeof createdAt !== "number" || !Number.isFinite(createdAt) || createdAt < 0) {
    throw new Error("Invalid saved take metadata.");
  }
  if ("blob" in saved && saved.blob instanceof Blob && saved.blob.size) return { blob: saved.blob, seconds, createdAt };
  const { bytes, type } = saved as Partial<StoredTake>;
  if (!(bytes instanceof ArrayBuffer) || !bytes.byteLength || typeof type !== "string") throw new Error("Invalid saved audio.");
  return { blob: new Blob([bytes], { type }), seconds, createdAt };
}

export async function saveTake(id: string, take: StudioTake) {
  try {
    // Store plain bytes rather than relying on IndexedDB's Blob backing store.
    // Read the Blob before opening a transaction, which may auto-close on await.
    const { blob, seconds, createdAt } = take;
    const stored: StoredTake = { bytes: await blob.arrayBuffer(), type: blob.type, seconds, createdAt };
    await transact("readwrite", (store) => store.put(stored, id));
  } catch (error) {
    volatile.set(id, take);
    // This tab can still play or export the take. Other tabs only know about
    // committed data and must not be told that their saved copy changed.
    notifyTakeChanged(id, false);
    throw error;
  }
  volatile.delete(id);
  notifyTakeChanged(id, true);
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

export async function decodeTake(blob: Blob) {
  const audio = new AudioContext();
  try {
    return await audio.decodeAudioData(await blob.arrayBuffer());
  } finally {
    if (audio.state !== "closed") void audio.close().catch(() => {});
  }
}

export function encodeDecodedWav(buffer: AudioBuffer, from = 0, to = buffer.duration) {
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, index) => buffer.getChannelData(index));
  return encodeWav(channels, buffer.sampleRate, from, to);
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

export function buildSongSheet(
  fields: { title: string; hook: string; verseOne: string; verseTwo: string; chorus: string; chords: string; ending: string; arrangement: string },
  { stageZeroLine = "", independent = false } = {},
) {
  return [
    fields.title.trim() || "Untitled song",
    ...([
      ["Chords", fields.chords], [independent ? "First line" : "Hook", fields.hook],
      ["Verse 1", fields.verseOne], ["Chorus", fields.chorus], ["Verse 2", fields.verseTwo],
      ["Ending", fields.ending], ["Arrangement notes", fields.arrangement],
      ["Stage 0 first line", stageZeroLine],
    ].filter(([, value]) => value.trim()).map(([label, value]) => `${label}\n${value.trim()}`)),
  ].join("\n\n") + "\n";
}
