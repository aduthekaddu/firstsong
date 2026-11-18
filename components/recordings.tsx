"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Mic, Square } from "lucide-react";
import { useLocalValue } from "../lib/local-value";

type TakeId = "rhythm-a" | "rhythm-b" | "hook";
export type Rhythm = Exclude<TakeId, "hook">;

type Take = { audio: string; seconds: number; caption: string };

type RecorderState =
  | { kind: "idle" }
  | { kind: "requesting" | "saving"; take: TakeId }
  | { kind: "recording"; take: TakeId; started: number };

const maxSeconds = 20;
const maxCaptionLength = 240;
const clearState: RecorderState = { kind: "idle" };
const captions = {
  "rhythm-a": "Hummed melody with the syllables close together.",
  "rhythm-b": "Hummed melody with a pause before the key word.",
  hook: "An E minor chord and the first hook.",
};

function parseTake(value: unknown): Take | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("audio" in value) || typeof value.audio !== "string" ||
    !/^data:audio\/(?:webm|mp4|ogg|aac|wav|x-wav|mpeg)(?:;[\w=,.+-]+)*;base64,[a-z\d+/]+=*$/i.test(value.audio)) return null;
  if (!("seconds" in value) || typeof value.seconds !== "number" || !Number.isFinite(value.seconds) || value.seconds < 0) return null;
  if (!("caption" in value) || typeof value.caption !== "string") return null;
  return { audio: value.audio, seconds: value.seconds, caption: value.caption.slice(0, maxCaptionLength) };
}

function readAudio(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Invalid audio data."));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export function Recordings({
  mode, line, rhythm, onRhythm, onBusy,
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
  const [state, setState] = useState<RecorderState>(clearState);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const stopAt = useRef(0);
  const operation = useRef(0);
  const recordingLocked = useRef(false);
  const group = useRef<HTMLDivElement>(null);

  function releaseMic() {
    window.clearTimeout(stopAt.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    recorder.current = null;
  }

  useEffect(() => () => {
    operation.current++;
    if (recorder.current?.state === "recording") recorder.current.stop();
    releaseMic();
  }, []);

  useEffect(() => {
    if (state.kind !== "recording") return;
    const interval = window.setInterval(() => {
      setElapsed(Math.min(maxSeconds, Math.floor((performance.now() - state.started) / 1000)));
    }, 150);
    return () => window.clearInterval(interval);
  }, [state]);

  function finish(message: string) {
    setMessage(message);
    setState(clearState);
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

  async function start(id: TakeId) {
    if (recordingLocked.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Recording needs microphone support on HTTPS or localhost. You can continue with your written line.");
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
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported(type));
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
          const caption = id === "hook" && line.trim() ? `[Em chord] ${line.trim()}` : captions[id];
          const take = parseTake({ audio, seconds: (performance.now() - started) / 1000, caption });
          if (!take) throw new Error("Unsupported recording format.");
          takes[id].save(take);
          finish("Take ready to play.");
        } catch {
          if (request === operation.current) finish("The take could not be read. Try recording again.");
        }
      };
      recording.start();
      setState({ kind: "recording", take: id, started });
      stopAt.current = window.setTimeout(() => stop(id), maxSeconds * 1000);
    } catch (error) {
      if (request !== operation.current) return;
      releaseMic();
      finish(error instanceof DOMException && error.name === "NotAllowedError"
        ? "Microphone access was declined. Allow it in your browser to record, or continue with your written line."
        : "The microphone could not start. Check that it is connected and try again.");
    }
  }

  return (
    <div className="recordings" ref={group} onPlay={(event) => {
      event.currentTarget.querySelectorAll("audio").forEach((audio) => {
        if (audio !== event.target) audio.pause();
      });
    }}>
      {mode === "hook" && rhythm && <p className="rhythm-summary">Rhythm kept: {rhythm === "rhythm-a" ? "A · Close together" : "B · Leave a pause"}</p>}
      <div className="take-grid" data-compare={mode === "compare"}>
        {(mode === "compare" ? ["rhythm-a", "rhythm-b"] satisfies Rhythm[] : ["hook"] satisfies TakeId[]).map((id) => (
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
          />
        ))}
      </div>
      <p className="tool-note" role="status">{message || "Your takes stay in this browser. Each take stops at 20 seconds."}</p>
    </div>
  );
}

function TakeCard({
  id, take, ready, warning, state, elapsed, preferred, onStart, onStop, onSave, onChoose,
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
}) {
  const captionId = useId();
  const title = id === "rhythm-a" ? "Rhythm A" : id === "rhythm-b" ? "Rhythm B" : "Your hook";
  const detail = id === "rhythm-a" ? "Keep the syllables close together." : id === "rhythm-b" ? "Leave a pause before the key word." : "Play Em, then sing or say your line.";
  const stage = state.kind !== "idle" && state.take === id ? state.kind : "idle";

  return (
    <div className="tool take-card">
      <div className="tool-heading"><Mic size={19} aria-hidden="true" /><h4>{title}</h4></div>
      <p className="tool-note">{detail}</p>
      {take && <>
        <audio src={take.audio} controls preload="metadata" aria-label={`${title} playback`} aria-describedby={captionId}
          onError={(event) => event.currentTarget.setAttribute("data-playback-error", "true")}
          onLoadedMetadata={(event) => event.currentTarget.removeAttribute("data-playback-error")} />
        <p className="playback-error" role="status">This take can’t play in your browser. Try recording it again.</p>
        <p className="caption" id={captionId}><strong>Caption</strong> {take.caption || captions[id]}</p>
        <details className="caption-editor">
          <summary>Edit caption</summary>
          <label className="field">
            Words or sounds in {title.toLowerCase()}
            <textarea rows={2} maxLength={maxCaptionLength} value={take.caption}
              onChange={(event) => onSave({ ...take, caption: event.target.value })} />
          </label>
        </details>
      </>}
      <div className="take-actions">
        <button
          type="button"
          className={`button ${stage === "recording" ? "recording-button" : "primary"}`}
          disabled={!ready || (state.kind !== "idle" && stage !== "recording")}
          onClick={stage === "recording" ? onStop : onStart}
        >
          {stage === "recording" ? <Square size={16} aria-hidden="true" /> : <Mic size={16} aria-hidden="true" />}
          {stage === "recording" ? `Stop recording (${elapsed}s)` :
            stage === "requesting" ? "Waiting for microphone…" :
            stage === "saving" ? "Preparing take…" :
            take ? `Record ${title.toLowerCase()} again` : `Record ${title.toLowerCase()}`}
        </button>
        {take && id !== "hook" && (
          <button className="button secondary" type="button" aria-pressed={preferred} onClick={() => onChoose(id)}>
            {preferred && <Check size={16} aria-hidden="true" />} Keep {id === "rhythm-a" ? "rhythm A" : "rhythm B"}
          </button>
        )}
      </div>
      {warning && <p className="tool-note" role="status">{warning}</p>}
    </div>
  );
}
