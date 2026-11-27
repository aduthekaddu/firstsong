"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Mic, Square } from "lucide-react";
import { useLocalValue } from "../lib/local-value";
import { ticker } from "../lib/ticker";
import { audioExtension, hasRecordingInput, interruptedTakeMessage, normalizeAudioDataUrl } from "../lib/studio-audio";

type TakeId = "rhythm-a" | "rhythm-b" | "hook";
export type Rhythm = Exclude<TakeId, "hook">;

type Take = { audio: string; seconds: number; caption: string };

type RecorderState =
  | { kind: "idle" }
  | { kind: "requesting" | "saving"; take: TakeId }
  | { kind: "recording"; take: TakeId; started: number };

const MAX_SECONDS = 20;
const MAX_CAPTION_LENGTH = 240;
const METER_BARS = 24;
const CLEAR_STATE: RecorderState = { kind: "idle" };

const defaultCaptions: Record<TakeId, string> = {
  "rhythm-a": "Hummed melody with the syllables close together.",
  "rhythm-b": "Hummed melody with a pause before the key word.",
  hook: "An E minor chord and the first hook.",
};

function parseTake(value: unknown): Take | null {
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

function readAudio(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Invalid audio data."));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function Recordings({
  mode,
  line,
  rhythm,
  onRhythm,
  onBusy,
}: {
  mode: "compare" | "hook";
  line: string;
  rhythm: Rhythm | null;
  onRhythm: (rhythm: Rhythm) => void;
  onBusy: (busy: boolean) => void;
}) {
  const takeA = useLocalValue<Take | null>({ key: "take:rhythm-a", initial: null, parse: parseTake });
  const takeB = useLocalValue<Take | null>({ key: "take:rhythm-b", initial: null, parse: parseTake });
  const hook = useLocalValue<Take | null>({ key: "take:hook", initial: null, parse: parseTake });
  const takes = { "rhythm-a": takeA, "rhythm-b": takeB, hook };

  const [state, setState] = useState<RecorderState>(CLEAR_STATE);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState("");

  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const meterAudio = useRef<AudioContext | null>(null);
  const meterUnsub = useRef<(() => void) | null>(null);
  const barRefs = useRef<Record<TakeId, Array<HTMLSpanElement | null>>>({
    "rhythm-a": [],
    "rhythm-b": [],
    hook: [],
  });
  const stopAt = useRef(0);
  const operation = useRef(0);
  const recordingLocked = useRef(false);
  const saveRequested = useRef(false);
  const group = useRef<HTMLDivElement>(null);

  function stopMeter() {
    if (meterUnsub.current) {
      meterUnsub.current();
      meterUnsub.current = null;
    }
    if (meterAudio.current) {
      void meterAudio.current.close();
      meterAudio.current = null;
    }
    (Object.keys(barRefs.current) as TakeId[]).forEach((k) => {
      barRefs.current[k].forEach((bar) => {
        if (bar) bar.style.transform = "scale3d(1, 0.14, 1)";
      });
    });
  }

  function releaseMic() {
    window.clearTimeout(stopAt.current);
    stopMeter();
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    recorder.current = null;
  }

  useEffect(
    () => () => {
      operation.current++;
      if (recorder.current?.state === "recording") recorder.current.stop();
      releaseMic();
    },
    []
  );

  useEffect(() => {
    if (state.kind !== "recording") return;
    const interval = window.setInterval(() => {
      setElapsed(Math.min(MAX_SECONDS, Math.floor((performance.now() - state.started) / 1000)));
    }, 200);
    return () => window.clearInterval(interval);
  }, [state]);

  function finish(msg: string) {
    setMessage(msg);
    setState(CLEAR_STATE);
    recordingLocked.current = false;
    onBusy(false);
  }

  function interrupt() {
    operation.current++;
    if (recorder.current?.state === "recording") recorder.current.stop();
    releaseMic();
    finish(interruptedTakeMessage);
  }

  function stop(id: TakeId) {
    if (recorder.current?.state === "recording") {
      if (!hasRecordingInput(stream.current)) {
        interrupt();
        return;
      }
      saveRequested.current = true;
      setState({ kind: "saving", take: id });
      recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
    }
  }

  function startMeter(input: MediaStream, id: TakeId) {
    try {
      const ctx = new AudioContext();
      meterAudio.current = ctx;
      const src = ctx.createMediaStreamSource(input);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      meterUnsub.current = ticker.subscribe(() => {
        analyser.getByteFrequencyData(data);
        const bars = barRefs.current[id];
        for (let i = 0; i < METER_BARS; i++) {
          const bar = bars[i];
          if (!bar) continue;
          const raw = data[i % data.length] ?? 0;
          const level = Math.max(0.14, Math.min(1, raw / 165));
          bar.style.transform = `scale3d(1, ${level.toFixed(3)}, 1)`;
        }
      });
    } catch {
      // Optional meter
    }
  }

  async function start(id: TakeId) {
    if (recordingLocked.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage(
        "Recording needs microphone support on HTTPS or localhost. You can continue with your written line."
      );
      return;
    }

    recordingLocked.current = true;
    saveRequested.current = false;
    onBusy(true);
    const request = ++operation.current;
    setMessage("");
    setElapsed(0);
    setState({ kind: "requesting", take: id });
    group.current?.querySelectorAll("audio").forEach((audio) => audio.pause());

    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (request !== operation.current) {
        input.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = input;
      if (!hasRecordingInput(input)) {
        interrupt();
        return;
      }
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));

      const recording = new MediaRecorder(input, { mimeType, audioBitsPerSecond: 32_000 });
      recorder.current = recording;
      input.getAudioTracks().forEach((track) => track.addEventListener("mute", () => {
        if (request === operation.current && !saveRequested.current && recording.state === "recording") interrupt();
      }, { once: true }));
      const chunks: Blob[] = [];
      const started = performance.now();
      let failed = false;

      recording.ondataavailable = ({ data }) => {
        if (data.size) chunks.push(data);
      };
      recording.onerror = () => {
        failed = true;
        if (request !== operation.current) return;
        operation.current++;
        releaseMic();
        finish("The recording failed. Try again.");
      };
      recording.onstop = async () => {
        if (request !== operation.current || failed) return;
        releaseMic();
        if (!saveRequested.current) {
          finish(interruptedTakeMessage);
          return;
        }
        const blob = new Blob(chunks, { type: recording.mimeType || chunks[0]?.type });
        try {
          if (!blob.size) throw new Error("No audio was captured.");
          const audio = await readAudio(blob);
          if (request !== operation.current) return;
          const caption =
            id === "hook" && line.trim() ? `[Em chord] ${line.trim()}` : defaultCaptions[id];
          const take = parseTake({
            audio,
            seconds: (performance.now() - started) / 1000,
            caption,
          });
          if (!take) throw new Error("Unsupported recording format.");
          const saved = takes[id].save(take);
          finish(saved
            ? "Take saved in this browser and ready to play back."
            : "This take is playable now but could not be saved for your next visit.");
        } catch {
          if (request === operation.current) finish("The take could not be read. Try recording again.");
        }
      };

      recording.start();
      setState({ kind: "recording", take: id, started });
      window.requestAnimationFrame(() => {
        if (request === operation.current && stream.current === input) startMeter(input, id);
      });
      stopAt.current = window.setTimeout(() => stop(id), MAX_SECONDS * 1000);
    } catch (error) {
      if (request !== operation.current) return;
      releaseMic();
      finish(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone access was declined. Allow it in your browser to record, or continue with your written line."
          : "The microphone could not start. Check that it is connected and try again."
      );
    }
  }

  const slotIds: TakeId[] = mode === "compare" ? ["rhythm-a", "rhythm-b"] : ["hook"];

  return (
    <div
      className="space-y-4 border-y border-[var(--line)] py-6"
      ref={group}
      onPlay={(event) => {
        event.currentTarget.querySelectorAll("audio").forEach((audio) => {
          if (audio !== event.target) audio.pause();
        });
      }}
    >
      {mode === "hook" && rhythm && (
        <p className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--lock)]">
          <Check size={15} strokeWidth={1.75} aria-hidden="true" />
          <span>
            Rhythm kept:{" "}
            {rhythm === "rhythm-a" ? "Take A (syllables close)" : "Take B (pause before key word)"}
          </span>
        </p>
      )}

      <div
        className={`grid gap-8 ${
          mode === "compare"
            ? "md:grid-cols-2 md:divide-x md:divide-[var(--line)]"
            : "grid-cols-1"
        }`}
      >
        {slotIds.map((id, idx) => (
          <div key={id} className={mode === "compare" && idx === 1 ? "md:pl-8" : ""}>
            <TakeSlot
              id={id}
              take={takes[id].value}
              ready={takes[id].ready}
              warning={takes[id].warning}
              state={state}
              elapsed={elapsed}
              preferred={rhythm === id}
              onStart={() => void start(id)}
              onStop={() => stop(id)}
              onSave={takes[id].save}
              onChoose={onRhythm}
              registerBar={(barIdx, el) => {
                barRefs.current[id][barIdx] = el;
              }}
            />
          </div>
        ))}
      </div>

      <p className="text-[13px] text-[var(--muted)]" role="status">
        {message || "Takes stay on this device in browser storage. Each recording stops at 20 seconds."}
      </p>
    </div>
  );
}

function TakeSlot({
  id,
  take,
  ready,
  warning,
  state,
  elapsed,
  preferred,
  onStart,
  onStop,
  onSave,
  onChoose,
  registerBar,
}: {
  id: TakeId;
  take: Take | null;
  ready: boolean;
  warning: string;
  state: RecorderState;
  elapsed: number;
  preferred: boolean;
  onStart: () => void;
  onStop: () => void;
  onSave: (take: Take) => void;
  onChoose: (rhythm: Rhythm) => void;
  registerBar: (index: number, el: HTMLSpanElement | null) => void;
}) {
  const captionId = useId();
  const title = id === "rhythm-a" ? "Take A" : id === "rhythm-b" ? "Take B" : "Your hook";
  const detail =
    id === "rhythm-a"
      ? "Keep the syllables close together."
      : id === "rhythm-b"
        ? "Leave a pause before your most important word."
        : "Play Em once, then sing or say your line in time.";
  const stage = state.kind !== "idle" && state.take === id ? state.kind : "idle";
  const isRecording = stage === "recording";

  return (
    <div className="flex flex-col justify-between gap-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[15px] font-medium text-[var(--ink)]">{title}</p>
          {isRecording && (
            <span className="font-mono-num inline-flex items-center gap-2 text-[13px] font-medium text-[var(--accent)]">
              <span className="rec-dot h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden="true" />
              00:{String(elapsed).padStart(2, "0")} / 00:{MAX_SECONDS}
            </span>
          )}
          {!isRecording && preferred && (
            <span className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--lock)]">
              <Check size={14} strokeWidth={1.75} aria-hidden="true" />
              <span>Kept</span>
            </span>
          )}
        </div>

        <p className="text-[14px] text-[var(--muted)]">{detail}</p>

        {/* Live GPU-composited audio level meter */}
        {isRecording && (
          <div
            aria-hidden="true"
            className="flex h-11 items-end justify-between gap-1 rounded-[var(--r-sm)] bg-[var(--surface)] px-3 py-2"
          >
            {Array.from({ length: METER_BARS }).map((_, idx) => (
              <span
                key={idx}
                ref={(el) => registerBar(idx, el)}
                className="h-full w-1 origin-bottom bg-[var(--accent)]"
                style={{ transform: "scale3d(1, 0.14, 1)" }}
              />
            ))}
          </div>
        )}

        {take && !isRecording && (
          <div className="space-y-2.5 pt-1">
            <audio
              className="studio-audio"
              src={take.audio}
              controls
              preload="metadata"
              aria-label={`${title} playback`}
              aria-describedby={captionId}
              onError={(event) => event.currentTarget.setAttribute("data-playback-error", "true")}
              onLoadedMetadata={(event) => event.currentTarget.removeAttribute("data-playback-error")}
            />
            <p className="text-[13px] text-[var(--ink-soft)]" id={captionId}>
              {take.caption || defaultCaptions[id]}
            </p>
            <details className="text-[13px] text-[var(--muted)]">
              <summary className="cursor-pointer font-medium hover:text-[var(--ink)]">
                Edit caption
              </summary>
              <label className="mt-2 block">
                <span className="sr-only">Words or sounds in {title.toLowerCase()}</span>
                <textarea
                  rows={2}
                  maxLength={MAX_CAPTION_LENGTH}
                  value={take.caption}
                  onChange={(event) => onSave({ ...take, caption: event.target.value })}
                  className="mt-1 w-full rounded-[var(--r-sm)] border border-[var(--line-strong)] bg-[var(--bg)] p-3 text-[14px] text-[var(--ink)]"
                />
              </label>
            </details>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <button
          type="button"
          data-tone={isRecording ? "accent" : undefined}
          className={isRecording ? "btn-primary flex-1" : "btn-secondary flex-1"}
          disabled={!ready || (state.kind !== "idle" && stage !== "recording")}
          onClick={isRecording ? onStop : onStart}
        >
          {isRecording ? (
            <Square size={13} strokeWidth={1.75} aria-hidden="true" />
          ) : (
            <Mic size={15} strokeWidth={1.5} aria-hidden="true" />
          )}
          <span>
            {isRecording
              ? `Stop recording (${elapsed}s)`
              : stage === "requesting"
                ? "Waiting for mic"
                : stage === "saving"
                  ? "Saving take"
                  : take
                    ? `Record ${title} again`
                    : `Record ${title}`}
          </span>
        </button>

        {take && id !== "hook" && (
          <button
            type="button"
            aria-pressed={preferred}
            onClick={() => onChoose(id)}
            data-tone={preferred ? "lock" : undefined}
            className={preferred ? "btn-primary" : "btn-secondary"}
          >
            {preferred && <Check size={14} strokeWidth={1.75} aria-hidden="true" />}
            <span>Keep {id === "rhythm-a" ? "A" : "B"}</span>
          </button>
        )}
      </div>

      {warning && (
        <p className="text-[13px] text-[var(--accent)]" role="status">
          {warning}
        </p>
      )}
    </div>
  );
}

export function LegacyTakeShelf() {
  const takeA = useLocalValue<Take | null>({ key: "take:rhythm-a", initial: null, parse: parseTake });
  const takeB = useLocalValue<Take | null>({ key: "take:rhythm-b", initial: null, parse: parseTake });
  const hook = useLocalValue<Take | null>({ key: "take:hook", initial: null, parse: parseTake });
  const saved = [
    { key: "rhythm-a", title: "First rhythm A", take: takeA.value },
    { key: "rhythm-b", title: "First rhythm B", take: takeB.value },
    { key: "hook", title: "Stage 0 hook", take: hook.value },
  ].filter(({ take }) => take !== null);
  if (!saved.length) return null;

  return (
    <section aria-labelledby="legacy-takes" className="space-y-4 border-t border-[var(--line)] pt-5">
      <h2 id="legacy-takes" className="text-[16px] font-medium">From your first session</h2>
      {saved.map(({ key, title, take }) => {
        if (!take) return null;
        const type = take.audio.slice(5, take.audio.indexOf(";"));
        return (
          <div key={key} className="space-y-2">
            <h3 className="text-[14px]">{title}</h3>
            <audio className="studio-audio w-full" controls preload="metadata" src={take.audio} aria-label={`${title} playback`} />
            <a className="ui-link min-h-11 text-[14px]" href={take.audio} download={`firstsong-${key}.${audioExtension(type)}`}>Download take</a>
          </div>
        );
      })}
    </section>
  );
}
