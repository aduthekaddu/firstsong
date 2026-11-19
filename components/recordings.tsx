"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocalValue } from "../lib/local-value";
import { ticker } from "../lib/ticker";
import { IconCheck, IconMic, IconStop } from "./icons";

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
  if (
    !("audio" in value) ||
    typeof value.audio !== "string" ||
    !/^data:audio\/(?:webm|mp4|ogg|aac|wav|x-wav|mpeg)(?:;[\w=,.+-]+)*;base64,[a-z\d+/]+=*$/i.test(
      value.audio
    )
  ) {
    return null;
  }
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
    audio: value.audio,
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

  function stop(id: TakeId) {
    if (recorder.current?.state === "recording") {
      setState({ kind: "saving", take: id });
      recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
    }
  }

  /**
   * Pure GPU compositor live microphone level meter:
   * Updates bar scaleY via refs inside the ONE shared RAF ticker — ZERO React re-renders!
   */
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
      // Optional meter if Web Audio fails
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
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/mp4",
        "audio/ogg;codecs=opus",
      ].find((type) => MediaRecorder.isTypeSupported(type));

      const recording = new MediaRecorder(input, { mimeType, audioBitsPerSecond: 32_000 });
      recorder.current = recording;
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
        setState({ kind: "saving", take: id });
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
          takes[id].save(take);
          finish("Take saved to this browser and ready to play back.");
        } catch {
          if (request === operation.current) finish("The take could not be read. Try recording again.");
        }
      };

      recording.start();
      setState({ kind: "recording", take: id, started });
      window.requestAnimationFrame(() => startMeter(input, id));
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

  const cardIds: TakeId[] = mode === "compare" ? ["rhythm-a", "rhythm-b"] : ["hook"];

  return (
    <div
      className="space-y-4"
      ref={group}
      onPlay={(event) => {
        event.currentTarget.querySelectorAll("audio").forEach((audio) => {
          if (audio !== event.target) audio.pause();
        });
      }}
    >
      {mode === "hook" && rhythm && (
        <div className="font-mono-score inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-[var(--verdigris)] bg-[var(--verdigris-tint)] px-3 py-1.5 text-[11px] font-medium uppercase text-[var(--verdigris)]">
          <IconCheck size={13} />
          <span>
            Rhythm kept: {rhythm === "rhythm-a" ? "Take A · Syllables close" : "Take B · Pause before key word"}
          </span>
        </div>
      )}

      <div className={`grid gap-4 ${mode === "compare" ? "md:grid-cols-2" : "grid-cols-1"}`}>
        {cardIds.map((id) => (
          <TakeCard
            key={id}
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
            registerBar={(idx, el) => {
              barRefs.current[id][idx] = el;
            }}
          />
        ))}
      </div>

      <p className="font-mono-score text-[11px] text-[var(--ink-muted)]" role="status">
        {message || "Takes stay on this device in browser storage. Each take stops automatically at 20 seconds."}
      </p>
    </div>
  );
}

function TakeCard({
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
  const title = id === "rhythm-a" ? "Rhythm A" : id === "rhythm-b" ? "Rhythm B" : "Your Hook";
  const detail =
    id === "rhythm-a"
      ? "Keep the syllables close together."
      : id === "rhythm-b"
        ? "Leave a breath before your key word."
        : "Play Em once, then sing or say your line in time.";
  const stage = state.kind !== "idle" && state.take === id ? state.kind : "idle";
  const isRecording = stage === "recording";

  return (
    <div
      className={`flex flex-col justify-between gap-4 rounded-[var(--radius-plate)] border p-5 transition-colors duration-200 ${
        preferred
          ? "border-[var(--verdigris)] bg-[var(--verdigris-tint)]"
          : isRecording
            ? "border-[var(--cinnabar)] bg-[var(--folio)]"
            : "border-[var(--rule-mid)] bg-[var(--paper)]"
      }`}
    >
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <h4 className="font-mono-score text-[11px] font-medium uppercase text-[var(--ink)]">
            {title}
          </h4>
          {isRecording && (
            <span className="font-mono-score inline-flex items-center gap-1.5 rounded-[2px] bg-[var(--cinnabar)] px-2 py-0.5 text-[10px] font-semibold text-[var(--folio)]">
              <span className="rec-dot h-1.5 w-1.5 rounded-full bg-[var(--folio)]" />
              REC 00:{String(elapsed).padStart(2, "0")} / 00:{MAX_SECONDS}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--ink-muted)]">{detail}</p>

        {/* Live RMS Audio Level Meter (pure GPU scaleY, driven by refs in shared ticker) */}
        {isRecording && (
          <div
            aria-hidden="true"
            className="mt-4 flex h-12 items-end justify-between gap-1 rounded-[2px] bg-[var(--prussian)] px-3 py-2"
          >
            {Array.from({ length: METER_BARS }).map((_, idx) => (
              <span
                key={idx}
                ref={(el) => registerBar(idx, el)}
                className="h-full w-1.5 origin-bottom bg-[var(--cinnabar-bright)]"
                style={{ transform: "scale3d(1, 0.14, 1)" }}
              />
            ))}
          </div>
        )}

        {take && !isRecording && (
          <div className="mt-4 space-y-2.5">
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
            <p className="font-mono-score text-[11px] text-[var(--ink-soft)]" id={captionId}>
              <span className="text-[var(--ink-muted)]">CAPTION:</span>{" "}
              {take.caption || defaultCaptions[id]}
            </p>
            <details className="text-xs text-[var(--ink-muted)]">
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
                  className="mt-1 w-full rounded-[var(--radius-control)] border border-[var(--rule-mid)] bg-[var(--folio)] p-2.5 text-xs text-[var(--ink)]"
                />
              </label>
            </details>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          className={`tactile font-mono-score inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-control)] border px-4 py-2.5 text-xs font-medium uppercase disabled:cursor-not-allowed disabled:opacity-45 ${
            isRecording
              ? "border-[var(--cinnabar)] bg-[var(--cinnabar)] text-[var(--folio)]"
              : "border-[var(--prussian)] bg-[var(--folio)] text-[var(--prussian)] hover:bg-[var(--prussian)] hover:text-[var(--prussian-ink)]"
          }`}
          disabled={!ready || (state.kind !== "idle" && stage !== "recording")}
          onClick={isRecording ? onStop : onStart}
        >
          {isRecording ? <IconStop size={12} /> : <IconMic size={14} />}
          <span>
            {isRecording
              ? `Stop (${elapsed}s)`
              : stage === "requesting"
                ? "Waiting for mic…"
                : stage === "saving"
                  ? "Saving take…"
                  : take
                    ? "Re-record"
                    : `Record ${title}`}
          </span>
        </button>

        {take && id !== "hook" && (
          <button
            type="button"
            aria-pressed={preferred}
            onClick={() => onChoose(id)}
            className={`tactile font-mono-score inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[var(--radius-control)] border px-4 py-2.5 text-xs font-medium uppercase ${
              preferred
                ? "border-[var(--verdigris)] bg-[var(--verdigris)] text-[var(--folio)]"
                : "border-[var(--rule-mid)] bg-[var(--folio)] text-[var(--ink)] hover:border-[var(--verdigris)]"
            }`}
          >
            {preferred && <IconCheck size={13} />}
            <span>Keep {id === "rhythm-a" ? "A" : "B"}</span>
          </button>
        )}
      </div>

      {warning && (
        <p className="font-mono-score text-[11px] text-[var(--cinnabar)]" role="status">
          {warning}
        </p>
      )}
    </div>
  );
}
