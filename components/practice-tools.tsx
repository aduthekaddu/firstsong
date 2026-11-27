"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock, Mic, MicOff, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { em, guitarStrings } from "../lib/chords";
import { detectGuitarPitch, guitarAnalyserWindow } from "../lib/pitch";
import { openAudio, pluckString, scheduleMetronomeClick } from "../lib/sound";
import { ticker } from "../lib/ticker";
import { ChordDiagram } from "./chord-diagram";

/**
 * Studio Tuner:
 * Combines 6 physical Karplus-Strong acoustic reference strings (E2-E4)
 * with a live microphone YIN autocorrelation strobe pitch detector.
 * Per-frame mic analysis updates DOM refs directly inside the shared ticker
 * for zero React re-renders during live tuning.
 */
export function Tuner() {
  const audioRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const requestRef = useRef(0);

  // Live mic tuner refs (mutated imperatively at 60fps, zero React re-renders)
  const micStreamRef = useRef<MediaStream | null>(null);
  const micRequestRef = useRef<symbol | null>(null);
  const micCtxRef = useRef<AudioContext | null>(null);
  const micUnsubRef = useRef<(() => void) | null>(null);
  const needleRef = useRef<HTMLDivElement | null>(null);
  const strobeNoteRef = useRef<HTMLSpanElement | null>(null);
  const strobeHzRef = useRef<HTMLSpanElement | null>(null);
  const strobeCentsRef = useRef<HTMLSpanElement | null>(null);
  const strobeGuideRef = useRef<HTMLSpanElement | null>(null);
  const strobeTrackRef = useRef<HTMLDivElement | null>(null);

  const [playing, setPlaying] = useState("");
  const [heard, setHeard] = useState<string[]>([]);
  const [micActive, setMicActive] = useState(false);
  const [micPending, setMicPending] = useState(false);
  const [micError, setMicError] = useState("");
  const [message, setMessage] = useState("");

  function releaseMic() {
    micRequestRef.current = null;
    if (micUnsubRef.current) {
      micUnsubRef.current();
      micUnsubRef.current = null;
    }
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    const ctx = micCtxRef.current;
    micCtxRef.current = null;
    if (ctx && ctx.state !== "closed") void ctx.close().catch(() => {});
  }

  function stopMic() {
    releaseMic();
    setMicPending(false);
    setMicActive(false);
    if (needleRef.current) {
      needleRef.current.style.transform = "translate3d(0px, 0, 0)";
      needleRef.current.style.opacity = "0.35";
    }
  }

  useEffect(() => {
    return () => {
      requestRef.current++;
      releaseMic();
      try {
        activeSourceRef.current?.stop();
      } catch {
        // Already ended
      }
    };
  }, []);

  async function toggleMic() {
    if (micRequestRef.current) return;
    if (micStreamRef.current) {
      stopMic();
      setMessage("Microphone tuner paused.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError("Microphone tuning requires HTTPS or localhost. Use the six reference strings below.");
      return;
    }

    const request = Symbol();
    micRequestRef.current = request;
    setMicPending(true);
    setMessage("");
    setMicError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (micRequestRef.current !== request) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      // Register resources before setup so errors can release partial work.
      micStreamRef.current = stream;
      const ctx = new AudioContext();
      micCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = guitarAnalyserWindow(ctx.sampleRate);
      source.connect(analyser);

      setMicActive(true);
      setMessage("Listening to your guitar. Pluck one open string at a time.");

      const timeBuf = new Float32Array(analyser.fftSize);
      const diffScratch = new Float32Array(analyser.fftSize >> 1);
      let smoothedCents = 0;
      let holdFrames = 0;

      micUnsubRef.current = ticker.subscribe(() => {
        analyser.getFloatTimeDomainData(timeBuf);
        const reading = detectGuitarPitch(timeBuf, ctx.sampleRate, diffScratch);

        if (reading) {
          holdFrames = 24;
          const clampedCents = Math.max(-50, Math.min(50, reading.nearestStringCents));
          smoothedCents = smoothedCents * 0.72 + clampedCents * 0.28;
          const inTune = Math.abs(smoothedCents) <= 4.5;
          const target = guitarStrings[reading.nearestStringIndex];

          if (strobeNoteRef.current) {
            strobeNoteRef.current.textContent = target.name;
            strobeNoteRef.current.style.color = inTune ? "var(--lock)" : "var(--ink)";
          }
          if (strobeHzRef.current) {
            strobeHzRef.current.textContent = `${reading.hz.toFixed(1)} Hz`;
          }
          if (strobeCentsRef.current) {
            const sign = smoothedCents > 0.5 ? "+" : "";
            strobeCentsRef.current.textContent = `${sign}${Math.round(smoothedCents)}¢`;
            strobeCentsRef.current.style.color = inTune ? "var(--lock)" : "var(--ink-soft)";
          }
          if (strobeGuideRef.current) {
            strobeGuideRef.current.textContent = inTune
              ? `${target.label} is in tune`
              : smoothedCents < 0
                ? `${target.label} is flat · tighten peg slowly`
                : `${target.label} is sharp · loosen peg slowly`;
            strobeGuideRef.current.style.color = inTune ? "var(--lock)" : "var(--muted)";
          }

          if (needleRef.current && strobeTrackRef.current) {
            const halfW = (strobeTrackRef.current.clientWidth - 4) / 2;
            const offsetPx = (smoothedCents / 50) * halfW;
            needleRef.current.style.transform = `translate3d(${offsetPx.toFixed(1)}px, 0, 0)`;
            needleRef.current.style.opacity = "1";
            needleRef.current.style.backgroundColor = inTune ? "var(--lock)" : "var(--accent)";
          }
        } else if (holdFrames > 0) {
          holdFrames--;
          if (holdFrames === 0 && needleRef.current) {
            needleRef.current.style.opacity = "0.35";
          }
        }
      });
    } catch (error) {
      if (micRequestRef.current !== request) return;
      stopMic();
      setMicError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Microphone access was declined. Tune by ear with the six reference strings below."
          : "Microphone could not start. Tune by ear with the six reference strings below."
      );
    } finally {
      if (micRequestRef.current === request) {
        micRequestRef.current = null;
        setMicPending(false);
      }
    }
  }

  async function playReference(note: (typeof guitarStrings)[number], index: number) {
    const id = ++requestRef.current;
    setPlaying(note.name);
    setHeard((prev) => (prev.includes(note.name) ? prev : [...prev, note.name]));

    try {
      const ctx = await openAudio(audioRef.current);
      if (id !== requestRef.current) return;
      audioRef.current = ctx;
      try {
        activeSourceRef.current?.stop();
      } catch {
        // Already stopped
      }
      const source = pluckString({
        context: ctx,
        hz: note.hz,
        duration: 2.6,
        volume: 0.36,
        brightness: index < 3 ? 0.48 : 0.64,
      });
      activeSourceRef.current = source;
      setMessage(`Reference pitch: ${note.label} (${note.name}, ${note.hz.toFixed(2)} Hz)`);
      source.onended = () => {
        if (id === requestRef.current) {
          activeSourceRef.current = null;
          setPlaying("");
        }
      };
    } catch {
      if (id === requestRef.current) {
        setMessage("Your browser could not play audio.");
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Live Microphone Pitch Detector Strip (borderless hairline architecture) */}
      <div className="border-y border-[var(--line)] py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-[15px] font-medium text-[var(--ink)]">
              Live microphone tuner
            </p>
            <p className="text-[13px] text-[var(--muted)]">
              <span ref={strobeGuideRef}>
                {micActive
                  ? "Pluck one open string clearly near your mic"
                  : "Optional pitch needle, or tune directly by ear below"}
              </span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => void toggleMic()}
            disabled={micPending}
            className={micActive ? "btn-primary" : "btn-secondary"}
            data-tone={micActive ? "accent" : undefined}
          >
            {micActive ? (
              <MicOff size={15} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Mic size={15} strokeWidth={1.5} aria-hidden="true" />
            )}
            <span>{micActive ? "Stop mic tuner" : micPending ? "Waiting for microphone…" : "Listen with mic"}</span>
          </button>
        </div>

        {micActive && (
          <div className="mt-5 space-y-3">
            <div className="flex items-baseline justify-between gap-4">
              <span
                ref={strobeNoteRef}
                className="font-mono-num text-[32px] leading-none font-medium tracking-[-0.03em] text-[var(--ink)]"
              >
                --
              </span>
              <div className="font-mono-num flex items-baseline gap-4 text-[14px] text-[var(--muted)]">
                <span ref={strobeHzRef}>0.0 Hz</span>
                <span ref={strobeCentsRef} className="min-w-[44px] text-right text-[var(--ink-soft)]">
                  0¢
                </span>
              </div>
            </div>

            {/* Precision Flat / In-Tune / Sharp Track */}
            <div
              ref={strobeTrackRef}
              aria-hidden="true"
              className="relative flex h-8 items-center justify-center bg-[var(--surface)]"
            >
              <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-[var(--line-strong)]" />
              <div className="absolute top-1.5 bottom-1.5 left-1/2 w-px -translate-x-1/2 bg-[var(--lock)]" />
              <div
                ref={needleRef}
                className="h-5 w-1 rounded-full bg-[var(--accent)] opacity-35 transition-colors duration-100"
                style={{ transform: "translate3d(0px, 0, 0)" }}
              />
            </div>

            <div className="font-mono-num flex justify-between text-[12px] text-[var(--muted)]" aria-hidden="true">
              <span>-50¢ flat</span>
              <span>0¢ in tune</span>
              <span>+50¢ sharp</span>
            </div>
          </div>
        )}

        {micError && (
          <p className="mt-3 text-[13px] text-[var(--accent)]" role="status">
            {micError}
          </p>
        )}
      </div>

      {/* Six Acoustic Reference Strings (E2 -> E4) */}
      <div className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[14px] font-medium text-[var(--ink)]">
            Reference strings (thickest to thinnest)
          </p>
          <span className="font-mono-num text-[13px] text-[var(--muted)]">
            {heard.length}/6 checked
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {guitarStrings.map((note, idx) => {
            const isPlaying = playing === note.name;
            const isHeard = heard.includes(note.name);
            return (
              <button
                key={note.name}
                type="button"
                data-playing={isPlaying}
                onClick={() => void playReference(note, idx)}
                className={`group flex min-h-[84px] cursor-pointer flex-col justify-between rounded-[var(--r-sm)] border p-3 text-left transition-colors duration-150 ${
                  isPlaying
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                    : "border-[var(--line-strong)] bg-transparent text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--surface)]"
                }`}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={`font-mono-num text-[12px] ${
                      isPlaying ? "opacity-85" : "text-[var(--muted)]"
                    }`}
                  >
                    0{idx + 1}
                  </span>
                  {isHeard ? (
                    <Check
                      size={13}
                      strokeWidth={1.75}
                      aria-hidden="true"
                      className={isPlaying ? "text-[var(--accent-ink)]" : "text-[var(--lock)]"}
                    />
                  ) : (
                    <Volume2
                      size={13}
                      strokeWidth={1.5}
                      aria-hidden="true"
                      className={isPlaying ? "text-[var(--accent-ink)]" : "text-[var(--muted)] opacity-60"}
                    />
                  )}
                </div>

                <div>
                  <span className="block text-[15px] font-medium leading-tight">
                    {note.label}
                  </span>
                  <span
                    className={`font-mono-num mt-0.5 block text-[12px] ${
                      isPlaying ? "opacity-85" : "text-[var(--muted)]"
                    }`}
                  >
                    {note.name} · {Math.round(note.hz)} Hz
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-[13px] text-[var(--muted)]" role="status">
          {message || "Start with Low E (01) and work toward High E (06)."}
        </p>
      </div>
    </div>
  );
}

function BeatStrip({
  active = 0,
  filled = 0,
  pulseKey = 0,
}: {
  active?: number;
  filled?: number;
  pulseKey?: number;
}) {
  return (
    <div className="grid grid-cols-4 gap-2" aria-hidden="true">
      {[1, 2, 3, 4].map((beat) => {
        const isCurrent = beat === active;
        const isLit = isCurrent || beat <= filled;
        const isDownbeat = beat === 1;
        return (
          <div
            key={`${beat}-${isCurrent ? pulseKey : 0}`}
            className={`flex h-20 flex-col items-center justify-center rounded-[var(--r-sm)] border transition-colors duration-150 ${
              isCurrent ? "beat-pulse" : ""
            } ${
              isLit
                ? isDownbeat
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                  : "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                : "border-[var(--line-strong)] bg-transparent text-[var(--muted)]"
            }`}
          >
            <span className="font-mono-num text-[26px] leading-none font-normal">{beat}</span>
          </div>
        );
      })}
    </div>
  );
}

export function TapTrainer() {
  const tapsRef = useRef<number[]>([]);
  const [count, setCount] = useState(0);
  const [tempo, setTempo] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);

  function tap() {
    if (tapsRef.current.length === 4) tapsRef.current = [];
    const now = performance.now();
    tapsRef.current.push(now);
    const nextCount = tapsRef.current.length;
    setCount(nextCount);
    setPulseKey((k) => k + 1);
    if (nextCount === 4) {
      setTempo(Math.round(180_000 / Math.max(1, now - tapsRef.current[0])));
    }
  }

  return (
    <div className="space-y-4 border-y border-[var(--line)] py-6">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[15px] font-medium text-[var(--ink)]">Four-beat pulse</p>
        <span
          key={count === 4 ? `bpm-${tempo}` : `beat-${count}`}
          className="roll-enter font-mono-num text-[14px] text-[var(--ink)]"
        >
          {count === 4 ? `${tempo} BPM` : `${count} / 4`}
        </span>
      </div>

      <BeatStrip active={count} filled={count} pulseKey={pulseKey} />

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button type="button" onClick={tap} className="btn-primary flex-1">
          <span>Tap beat (or press Space)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            tapsRef.current = [];
            setCount(0);
            setTempo(0);
          }}
          className="btn-secondary"
        >
          <RotateCcw size={14} strokeWidth={1.5} aria-hidden="true" />
          <span>Reset</span>
        </button>
      </div>

      <p className="text-[13px] text-[var(--muted)]" role="status">
        {count === 4
          ? `Four taps at about ${tempo} beats per minute. Tap again to count a fresh bar.`
          : `${count} of 4 beats tapped.`}
      </p>
    </div>
  );
}

export function EmChord() {
  return (
    <div className="grid items-center gap-8 border-y border-[var(--line)] py-6 sm:grid-cols-[1fr_auto]">
      <div className="space-y-3">
        <p className="type-h3 text-[var(--ink)]">
          Em (E minor)
        </p>
        <p className="max-w-[46ch] text-[15px] leading-relaxed text-[var(--ink-soft)]">
          Press finger 2 (middle) on the second fret of the A string and finger 3 (ring) directly underneath it on the second fret of the D string. Let the other four strings ring open.
        </p>
        <p className="text-[13px] text-[var(--muted)]">
          Click any string on the diagram to hear it, or strum all six together.
        </p>
      </div>

      <div className="flex justify-center">
        <ChordDiagram chord={em} showStrum />
      </div>
    </div>
  );
}

type DrillState =
  | { kind: "ready" | "starting" | "done" }
  | { kind: "playing"; beat: number };

const TEMPOS = [40, 50, 60, 70, 80, 90] as const;

export function DownstrokeTrainer() {
  const [bpm, setBpm] = useState<number>(60);
  const [state, setState] = useState<DrillState>({ kind: "ready" });
  const [message, setMessage] = useState("");
  const [pulseKey, setPulseKey] = useState(0);

  const audioRef = useRef<AudioContext | null>(null);
  const timeoutsRef = useRef<number[]>([]);
  const tonesRef = useRef<OscillatorNode[]>([]);
  const runRef = useRef(0);
  const pendulumRef = useRef<HTMLDivElement | null>(null);
  const unsubPendulumRef = useRef<(() => void) | null>(null);

  const locked = state.kind === "playing" || state.kind === "starting";

  function stopPendulum() {
    if (unsubPendulumRef.current) {
      unsubPendulumRef.current();
      unsubPendulumRef.current = null;
    }
    if (pendulumRef.current) {
      pendulumRef.current.style.transform = "rotate(0deg)";
    }
  }

  function cancel() {
    runRef.current++;
    timeoutsRef.current.forEach((t) => window.clearTimeout(t));
    tonesRef.current.forEach((o) => {
      try {
        o.stop();
      } catch {
        // Already stopped
      }
    });
    timeoutsRef.current = [];
    tonesRef.current = [];
    stopPendulum();
  }

  useEffect(() => () => cancel(), []);

  async function start() {
    if (locked) return;
    const id = ++runRef.current;
    const interval = 60_000 / bpm;
    setMessage("");
    setState({ kind: "starting" });

    let ctx: AudioContext | null = null;
    try {
      ctx = await openAudio(audioRef.current);
    } catch {
      if (id === runRef.current) {
        setMessage("Sound is unavailable. Follow the pendulum and four numbered beats.");
      }
    }
    if (id !== runRef.current) return;
    audioRef.current = ctx;

    const startPerf = performance.now() + 90;
    const startAt = ctx ? ctx.currentTime + 0.09 : 0;

    unsubPendulumRef.current = ticker.subscribe((now) => {
      if (!pendulumRef.current) return;
      const elapsedMs = Math.max(0, now - startPerf);
      const beatPhase = (elapsedMs / interval) * Math.PI;
      const deg = Math.cos(beatPhase) * -28;
      pendulumRef.current.style.transform = `rotate(${deg.toFixed(2)}deg)`;
    });

    for (let beat = 1; beat <= 4; beat++) {
      const delay = (beat - 1) * interval;
      if (ctx) {
        tonesRef.current.push(
          scheduleMetronomeClick({
            context: ctx,
            start: startAt + delay / 1000,
            accent: beat === 1,
            volume: 0.24,
          })
        );
      }
      timeoutsRef.current.push(
        window.setTimeout(() => {
          setPulseKey((k) => k + 1);
          setState({ kind: "playing", beat });
        }, 90 + delay)
      );
    }

    timeoutsRef.current.push(
      window.setTimeout(() => {
        timeoutsRef.current = [];
        tonesRef.current = [];
        stopPendulum();
        setState({ kind: "done" });
      }, 90 + interval * 4)
    );
  }

  return (
    <div className="space-y-5 border-b border-[var(--line)] pb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-[15px] font-medium text-[var(--ink)]">
          Downstroke metronome
        </p>

        <div
          className="inline-flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Tempo in beats per minute"
        >
          {TEMPOS.map((tempo) => (
            <button
              key={tempo}
              type="button"
              disabled={locked}
              onClick={() => setBpm(tempo)}
              aria-pressed={bpm === tempo}
              className={`font-mono-num min-h-11 min-w-11 cursor-pointer rounded-[var(--r-sm)] border px-2.5 text-[13px] transition-colors duration-150 disabled:opacity-40 ${
                bpm === tempo
                  ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                  : "border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
              }`}
            >
              {tempo}
            </button>
          ))}
          <span className="font-mono-num pl-1.5 text-[12px] text-[var(--muted)]">BPM</span>
        </div>
      </div>

      {/* Architectural Pendulum + Four Beat Strip */}
      <div className="grid items-center gap-5 sm:grid-cols-[124px_1fr]">
        <div
          aria-hidden="true"
          className="relative flex h-24 items-end justify-center overflow-hidden rounded-[var(--r-sm)] bg-[var(--surface)] pb-2.5"
        >
          <svg viewBox="0 0 120 84" className="pointer-events-none absolute inset-0 h-full w-full">
            <path
              d="M 22 44 A 46 46 0 0 1 98 44"
              fill="none"
              stroke="var(--line-strong)"
              strokeWidth="1"
            />
            <line x1="60" y1="12" x2="60" y2="20" stroke="var(--accent)" strokeWidth="1.5" />
          </svg>
          <div
            ref={pendulumRef}
            className="relative h-[68px] w-[1.5px] origin-bottom bg-[var(--ink)]"
            style={{ transform: "rotate(0deg)" }}
          >
            <span className="absolute left-1/2 top-2.5 h-3 w-3 -translate-x-1/2 rounded-full bg-[var(--accent)]" />
          </div>
          <span className="absolute bottom-2 h-2 w-2 rounded-full bg-[var(--ink)]" />
        </div>

        <BeatStrip
          active={state.kind === "playing" ? state.beat : 0}
          filled={state.kind === "done" ? 4 : 0}
          pulseKey={pulseKey}
        />
      </div>

      <button
        type="button"
        onClick={() => {
          if (locked) {
            cancel();
            setState({ kind: "ready" });
          } else {
            void start();
          }
        }}
        data-tone={locked ? "accent" : undefined}
        className="btn-primary w-full"
      >
        <span>{locked ? "Stop four beats" : `Play four slow beats (${bpm} BPM)`}</span>
      </button>

      <p className="text-[13px] text-[var(--muted)]" role="status">
        {state.kind === "done"
          ? "Four beats finished. Relax your fretting hand before repeating."
          : message || "Brush down across all six strings once on each beat."}
      </p>
    </div>
  );
}

type TimerState =
  | { kind: "paused"; remaining: number }
  | { kind: "running"; deadline: number }
  | { kind: "done" };

export function PracticeTimer({ minutes }: { minutes: number }) {
  const duration = minutes * 60;
  const [timer, setTimer] = useState<TimerState>({ kind: "paused", remaining: duration });
  const [now, setNow] = useState(0);

  // Reset cleanly when switching steps with different target durations
  useEffect(() => {
    setTimer({ kind: "paused", remaining: minutes * 60 });
  }, [minutes]);

  const remaining =
    timer.kind === "running"
      ? Math.max(0, Math.ceil((timer.deadline - now) / 1000))
      : timer.kind === "paused"
        ? timer.remaining
        : 0;
  const ratio = duration > 0 ? Math.max(0, Math.min(1, 1 - remaining / duration)) : 1;
  const display = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (timer.kind !== "running") return;
    const interval = window.setInterval(() => {
      const currentTime = performance.now();
      setNow(currentTime);
      if (currentTime >= timer.deadline) setTimer({ kind: "done" });
    }, 200);
    return () => window.clearInterval(interval);
  }, [timer]);

  function toggle() {
    if (timer.kind === "running") {
      setTimer({ kind: "paused", remaining });
    } else {
      const currentTime = performance.now();
      setNow(currentTime);
      setTimer({
        kind: "running",
        deadline: currentTime + (timer.kind === "done" ? duration : remaining) * 1000,
      });
    }
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Clock size={15} strokeWidth={1.5} className="text-[var(--muted)]" aria-hidden="true" />
          <span className="text-[14px] text-[var(--muted)]">Practice timer</span>
          <span
            className="font-mono-num text-[15px] font-medium text-[var(--ink)]"
            role="timer"
            aria-label="Practice time remaining"
          >
            {display}
          </span>
          {timer.kind === "done" && (
            <span role="status" className="inline-flex items-center gap-1 text-[13px] font-medium text-[var(--lock)]">
              <Check size={14} strokeWidth={1.75} aria-hidden="true" />
              <span>Time is up</span>
            </span>
          )}
        </div>

        <button type="button" onClick={toggle} className="btn-secondary min-h-11 px-4 text-[14px]">
          {timer.kind === "running" ? (
            <Pause size={14} strokeWidth={1.5} aria-hidden="true" />
          ) : (
            <Play size={14} strokeWidth={1.5} aria-hidden="true" />
          )}
          <span>
            {timer.kind === "running"
              ? "Pause timer"
              : timer.kind === "done"
                ? "Restart timer"
                : "Start timer"}
          </span>
        </button>
      </div>

      <div className="h-[2px] w-full overflow-hidden bg-[var(--line)]" aria-hidden="true">
        <div
          className="h-full w-full origin-left bg-[var(--ink)] transition-transform duration-200 ease-out"
          style={{ transform: `scale3d(${ratio.toFixed(4)}, 1, 1)` }}
        />
      </div>
    </div>
  );
}
