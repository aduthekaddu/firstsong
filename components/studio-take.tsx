"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Mic, Share, Square } from "lucide-react";
import { scheduleMetronomeClick } from "../lib/sound";
import { audioExtension, downloadFile, encodeWav, formatClock, getTake, hasRecordingInput, interruptedTakeMessage, sameStudioTake, saveTake, subscribeToPageReturn, subscribeToTakeChanges, type StudioTake as Take } from "../lib/studio-audio";
import type { TakeSpec } from "../lib/song-project";

type Phase = "idle" | "mic" | "count" | "record" | "save";

export function StudioTake({ spec, onBusy, readOnly = false, disabled = false, hideEmpty = false, filenameId = spec.id, heading: Heading = "h4" }: {
  spec: TakeSpec; onBusy?: (busy: boolean) => void; readOnly?: boolean; disabled?: boolean; hideEmpty?: boolean; filenameId?: string; heading?: "h2" | "h4";
}) {
  const [take, setTake] = useState<Take | null>(null);
  const [ready, setReady] = useState(false);
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [tempo, setTempo] = useState(60);
  const [beat, setBeat] = useState(1);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState("");
  const [refreshCount, refresh] = useState(0);
  const phaseRef = useRef<Phase>("idle");
  const epoch = useRef(0);
  const mic = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const ctx = useRef<AudioContext | null>(null);
  const clock = useRef<number[]>([]);
  const ticks = useRef(0);
  const playback = useRef<HTMLAudioElement>(null);
  const storageError = useRef(false);

  function release() {
    for (const t of clock.current) window.clearTimeout(t);
    clock.current = [];
    window.clearInterval(ticks.current);
    mic.current?.getTracks().forEach((track) => track.stop());
    mic.current = null;
    recorder.current = null;
    const audio = ctx.current;
    ctx.current = null;
    if (audio && audio.state !== "closed") void audio.close().catch(() => {});
  }

  useEffect(() => {
    const requestRefresh = () => refresh((value) => value + 1);
    const stopWatching = subscribeToTakeChanges((id) => { if (id === spec.id) requestRefresh(); });
    const stopPageReturn = subscribeToPageReturn(requestRefresh);
    return () => {
      stopWatching();
      stopPageReturn();
      epoch.current++;
      if (recorder.current?.state === "recording") recorder.current.stop();
      release();
    };
  }, [spec.id]);

  useEffect(() => {
    if (phase !== "idle") return;
    let active = true;
    getTake(spec.id).then(
      (data) => { if (active) setTake((prior) => sameStudioTake(prior, data) ? prior : data); },
      () => { if (active) setMessage((prior) => prior || "Saved takes could not be read. If you record, download the take before closing this page."); },
    ).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [spec.id, phase, refreshCount]);

  useEffect(() => {
    if (!take) return;
    const objectUrl = URL.createObjectURL(take.blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [take]);

  function change(target: Phase) {
    phaseRef.current = target;
    setPhase(target);
  }

  function finish(text: string) {
    release();
    change("idle");
    setMessage(text);
    onBusy?.(false);
  }

  function interrupt() {
    epoch.current++;
    if (recorder.current?.state === "recording") recorder.current.stop();
    finish(interruptedTakeMessage);
  }

  function stop() {
    if (phaseRef.current === "record" && recorder.current?.state === "recording") {
      if (!hasRecordingInput(mic.current)) {
        interrupt();
        return;
      }
      change("save");
      recorder.current.stop();
    } else if (phaseRef.current === "mic" || phaseRef.current === "count") {
      epoch.current++;
      finish("Recording cancelled. Any earlier take is unchanged.");
    }
  }

  async function start() {
    if (phaseRef.current !== "idle" || disabled || !ready) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMessage("Recording needs microphone support on HTTPS or localhost. You can still write and practice without it.");
      return;
    }
    const request = ++epoch.current;
    change("mic");
    onBusy?.(true);
    playback.current?.pause();
    setMessage("");
    setElapsed(0);
    storageError.current = false;
    try {
      // Unlock audio in the same gesture; the permission request can outlive it.
      let audio: AudioContext | null = null;
      if (spec.bars) {
        try {
          audio = new AudioContext();
          ctx.current = audio;
          // Do not block the visual count if gesture audio is unavailable.
          if (audio.state === "suspended") void audio.resume().catch(() => {});
        } catch {
          // The four-beat visual count is still usable.
        }
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      if (request !== epoch.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mic.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"]
        .find((format) => MediaRecorder.isTypeSupported(format));
      const capture = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 96_000 } : undefined);
      recorder.current = capture;
      let started = 0;
      const chunks: Blob[] = [];
      capture.ondataavailable = ({ data }) => { if (data.size) chunks.push(data); };
      capture.onerror = () => {
        if (request !== epoch.current) return;
        epoch.current++;
        finish("The recording did not finish. Any earlier take is unchanged.");
      };
      capture.onstop = async () => {
        if (request !== epoch.current) return;
        // MediaRecorder also stops itself when all input tracks end. Do not
        // replace a saved take with the partial data from that interruption.
        if (phaseRef.current !== "save") {
          finish(interruptedTakeMessage);
          return;
        }
        const next = {
          blob: new Blob(chunks, { type: capture.mimeType || chunks[0]?.type || "" }),
          seconds: Math.max(0, (performance.now() - started) / 1000),
          createdAt: Date.now(),
        };
        release();
        if (!next.blob.size) {
          finish("No audio was captured. Any earlier take is unchanged.");
          return;
        }
        try {
          await saveTake(spec.id, next);
        } catch {
          storageError.current = true;
        }
        if (request !== epoch.current) return;
        setTake(next);
        finish(storageError.current ? "This take could not be saved for your next visit. Download a copy now." : "Take saved on this device.");
      };
      function record() {
        if (request !== epoch.current) return;
        if (!hasRecordingInput(stream)) {
          interrupt();
          return;
        }
        try {
          // A live but muted track still produces silence in MediaRecorder.
          stream.getAudioTracks().forEach((track) => track.addEventListener("mute", () => {
            if (request === epoch.current && phaseRef.current === "record") interrupt();
          }, { once: true }));
          started = performance.now();
          capture.start();
          change("record");
          const seconds = spec.bars ? spec.bars * 4 * 60 / tempo : spec.maxSeconds;
          ticks.current = window.setInterval(() => setElapsed(Math.min(seconds, (performance.now() - started) / 1000)), 180);
          clock.current.push(window.setTimeout(stop, seconds * 1000));
        } catch {
          epoch.current++;
          finish("Recording could not start. Try again.");
        }
      }
      if (spec.bars) {
        change("count");
        setBeat(1);
        const gap = 60 / tempo;
        const first = (audio?.currentTime ?? 0) + 0.06;
        for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
          if (audio?.state === "running") scheduleMetronomeClick({ context: audio, start: first + beatIndex * gap, accent: beatIndex === 0 });
          clock.current.push(window.setTimeout(() => setBeat(beatIndex + 1), 60 + beatIndex * gap * 1000));
        }
        clock.current.push(window.setTimeout(record, 60 + 4 * gap * 1000));
      } else {
        record();
      }
    } catch (error) {
      if (request !== epoch.current) return;
      epoch.current++;
      finish(error instanceof DOMException && error.name === "NotAllowedError"
        ? "Microphone access was declined. Allow it in your browser settings, or keep working without recording."
        : "The microphone could not start. Check it is connected and try again.");
    }
  }

  const fileName = take ? `firstsong-${filenameId}.${audioExtension(take.blob.type)}` : "";
  let shareFile: File | undefined;
  if (take && typeof navigator !== "undefined" && typeof navigator.canShare === "function" && typeof navigator.share === "function") {
    try {
      const candidate = new File([take.blob], fileName, { type: take.blob.type });
      if (navigator.canShare({ files: [candidate] })) shareFile = candidate;
    } catch {
      // Some browsers won't share every media format. Download remains available.
    }
  }

  async function share(file: File) {
    try {
      await navigator.share({ files: [file] });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setMessage("Sharing did not open. Download the audio instead.");
      }
    }
  }

  const active = phase === "mic" || phase === "count" || phase === "record";
  const ending = phase === "save";
  const duration = spec.bars ? spec.bars * 4 * 60 / tempo : spec.maxSeconds;
  const bar = Math.min(spec.bars ?? 1, Math.floor(elapsed / (4 * 60 / tempo)) + 1);
  if (hideEmpty && !take && !message) return null;
  return (
    <section aria-label={spec.label} className="min-w-0 space-y-3 border-t border-[var(--line)] pt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Heading className="m-0 text-[16px] font-medium text-[var(--ink)]">{spec.label}</Heading>
        <span className="font-mono-num text-[13px] text-[var(--muted)]">
          {phase === "count" ? `Count in · ${beat}/4`
            : phase === "record" ? `${spec.bars ? `Bar ${bar}/${spec.bars} · ` : ""}${formatClock(elapsed)} / ${formatClock(duration)}`
              : take ? formatClock(take.seconds) : spec.bars ? `${spec.bars} bars` : `Up to ${formatClock(duration)}`}
        </span>
      </div>
      {spec.bars && !readOnly && (
        <label className="flex min-h-11 flex-wrap items-center gap-3 text-[14px] text-[var(--ink-soft)]">
          Tempo
          <select aria-label={`${spec.label} tempo`} value={tempo} onChange={(event) => setTempo(Number(event.target.value))} disabled={active || ending || disabled} className="min-h-11 rounded-[var(--r-sm)] border border-[var(--line-strong)] bg-[var(--surface)] px-3">
            {[40, 50, 60, 70, 80, 90].map((bpm) => <option key={bpm} value={bpm}>{bpm} BPM</option>)}
          </select>
          <span className="text-[13px] text-[var(--muted)]">Four-beat count-in, then the click goes quiet.</span>
        </label>
      )}
      {phase === "count" && (
        <div aria-label={`Count-in beat ${beat} of 4`} className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((value) => <span key={value} className={`h-1 rounded-full ${value <= beat ? "bg-[var(--accent)]" : "bg-[var(--line-strong)]"}`} />)}
        </div>
      )}
      {take && url && !active && (
        <audio ref={playback} className="studio-audio w-full" controls preload="metadata" src={url} aria-label={`${spec.label} playback`} />
      )}
      {ready && !take && readOnly && <p className="text-[14px] text-[var(--muted)]">No take saved yet. Review the recording step to make one.</p>}
      <div className="flex flex-wrap gap-2">
        {!readOnly && (
          <button className={phase === "record" ? "btn-primary" : "btn-secondary"} data-tone={phase === "record" ? "accent" : undefined} type="button"
            onClick={active ? stop : () => void start()} disabled={!ready || ending || (disabled && !active)}>
            {active ? <Square size={14} aria-hidden="true" /> : <Mic size={15} aria-hidden="true" />}
            {phase === "mic" || phase === "count" ? "Cancel recording" : phase === "record" ? "Stop recording" : ending ? "Saving take" : take ? `Record ${spec.label.toLowerCase()} again` : `Record ${spec.label.toLowerCase()}`}
          </button>
        )}
        {take && !active && !ending && (
          <button type="button" className="btn-secondary" onClick={() => downloadFile(take.blob, fileName)}>
            <Download size={14} aria-hidden="true" /> Download {spec.trim ? "original" : "take"}
          </button>
        )}
        {shareFile && !active && !ending && (
          <button type="button" className="btn-secondary" onClick={() => { if (shareFile) void share(shareFile); }}><Share size={14} aria-hidden="true" /> Share audio</button>
        )}
      </div>
      {message && <p className="text-[13px] text-[var(--muted)]" role="status">{message}</p>}
      {take && spec.trim && !active && !ending && <TrimTake key={take.createdAt} take={take} filenameId={filenameId} />}
    </section>
  );
}

function TrimTake({ take, filenameId }: { take: Take; filenameId: string }) {
  const [from, setFrom] = useState("0");
  const [to, setTo] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [trimmed, setTrimmed] = useState<Blob | null>(null);
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!trimmed) return;
    const nextUrl = URL.createObjectURL(trimmed);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [trimmed]);

  async function preview() {
    setWorking(true);
    setMessage("");
    let audio: AudioContext | undefined;
    try {
      audio = new AudioContext();
      const decoded = await audio.decodeAudioData(await take.blob.arrayBuffer());
      const start = Number(from);
      const end = to === "" ? decoded.duration : Number(to);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > decoded.duration + 0.05) {
        setMessage(`Choose a start before the end, within the ${decoded.duration.toFixed(1)}-second take.`);
        return;
      }
      setTrimmed(encodeWav(Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i)), decoded.sampleRate, start, end));
      setMessage("Trimmed preview ready. Your original is unchanged.");
    } catch {
      setMessage("This browser could not trim this recording. You can still download the original.");
    } finally {
      if (audio && audio.state !== "closed") void audio.close().catch(() => {});
      setWorking(false);
    }
  }

  return (
    <details className="ledger-disclosure border-t border-[var(--line)] pt-3">
      <summary className="inline-flex min-h-11 cursor-pointer items-center text-[14px] font-medium">Trim the edges</summary>
      <div className="mt-2 space-y-3">
        <p className="text-[14px] text-[var(--muted)]">Cut the count-in or silence. The original stays saved.</p>
        <div className="flex flex-wrap gap-3">
          <label className="grid min-w-0 gap-1 text-[14px]">Start (seconds)<input className="w-32 rounded-[var(--r-sm)] border border-[var(--line-strong)] bg-[var(--surface)] p-2.5 text-base" type="number" min="0" step="0.1" value={from} onChange={(event) => { setFrom(event.target.value); setTrimmed(null); }} disabled={working} /></label>
          <label className="grid min-w-0 gap-1 text-[14px]">End (seconds)<input className="w-32 rounded-[var(--r-sm)] border border-[var(--line-strong)] bg-[var(--surface)] p-2.5 text-base" type="number" min="0" step="0.1" placeholder="End of take" value={to} onChange={(event) => { setTo(event.target.value); setTrimmed(null); }} disabled={working} /></label>
        </div>
        <button type="button" className="btn-secondary" disabled={working} onClick={() => void preview()}>{working ? "Preparing preview" : "Preview trim"}</button>
        {trimmed && url && <div className="space-y-3">
          <audio className="studio-audio w-full" src={url} controls aria-label="Trimmed take playback" />
          <button type="button" className="btn-secondary" onClick={() => downloadFile(trimmed, `firstsong-${filenameId}-trimmed.wav`)}><Download size={14} aria-hidden="true" /> Download trimmed WAV</button>
        </div>}
        {message && <p role="status" className="text-[13px] text-[var(--muted)]">{message}</p>}
      </div>
    </details>
  );
}
