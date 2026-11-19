"use client";

import { useEffect, useRef, useState } from "react";
import { em, guitarStrings } from "../lib/chords";
import { openAudio, pluckString, scheduleMetronomeClick } from "../lib/sound";
import { ticker } from "../lib/ticker";
import { ChordDiagram } from "./chord-diagram";
import {
  IconCheck,
  IconClock,
  IconPause,
  IconPlay,
  IconReset,
  IconVolume,
} from "./icons";

/**
 * Reference Pitch Tuner:
 * Features a real pure-compositor standing-wave reference string inside a
 * Prussian acoustic chamber (replacing layout-thrashing animated-height bars).
 */
export function Tuner() {
  const audio = useRef<AudioContext | null>(null);
  const tone = useRef<OscillatorNode | null>(null);
  const request = useRef(0);
  const spindleRef = useRef<SVGSVGElement | null>(null);
  const waveRef = useRef<SVGSVGElement | null>(null);
  const vibRef = useRef({ amp: 0, phase: 0, omega: 40 });
  const unsubRef = useRef<(() => void) | null>(null);

  const [playing, setPlaying] = useState("");
  const [heard, setHeard] = useState<string[]>([]);
  const [activeNote, setActiveNote] = useState<(typeof guitarStrings)[number] | null>(null);
  const [message, setMessage] = useState("");

  const startWave = (hz: number) => {
    vibRef.current = {
      amp: 1,
      phase: 0,
      omega: Math.max(22, Math.min(48, 22 + (hz / 330) * 26)) * Math.PI * 2,
    };
    if (unsubRef.current) return;
    if (spindleRef.current) spindleRef.current.style.willChange = "transform, opacity";
    if (waveRef.current) waveRef.current.style.willChange = "transform, opacity";

    unsubRef.current = ticker.subscribe((_now, dt) => {
      const v = vibRef.current;
      v.phase += v.omega * dt;
      v.amp *= Math.exp(-1.55 * dt);

      if (v.amp <= 0.015) {
        v.amp = 0;
        if (spindleRef.current) {
          spindleRef.current.style.transform = "scale3d(1, 0, 1)";
          spindleRef.current.style.opacity = "0";
          spindleRef.current.style.willChange = "auto";
        }
        if (waveRef.current) {
          waveRef.current.style.transform = "scale3d(1, 0, 1)";
          waveRef.current.style.opacity = "0";
          waveRef.current.style.willChange = "auto";
        }
        if (unsubRef.current) {
          unsubRef.current();
          unsubRef.current = null;
        }
        return;
      }

      const osc = Math.sin(v.phase) * v.amp;
      if (spindleRef.current) {
        spindleRef.current.style.transform = `scale3d(1, ${v.amp.toFixed(3)}, 1)`;
        spindleRef.current.style.opacity = Math.min(1, v.amp * 1.1).toFixed(3);
      }
      if (waveRef.current) {
        waveRef.current.style.transform = `scale3d(1, ${osc.toFixed(3)}, 1)`;
        waveRef.current.style.opacity = Math.min(1, v.amp * 1.4).toFixed(3);
      }
    });
  };

  useEffect(() => {
    return () => {
      request.current++;
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, []);

  async function play(note: (typeof guitarStrings)[number]) {
    const id = ++request.current;
    startWave(note.hz);
    setActiveNote(note);
    setPlaying(note.name);
    setHeard((prev) => (prev.includes(note.name) ? prev : [...prev, note.name]));

    try {
      const context = await openAudio(audio.current);
      if (id !== request.current) return;
      audio.current = context;
      try {
        tone.current?.stop();
      } catch {
        // Already stopped
      }
      const nextTone = pluckString({
        context,
        hz: note.hz,
        start: context.currentTime,
        duration: 2.5,
        volume: 0.25,
      });
      tone.current = nextTone;
      setMessage(`Sounding ${note.label} (${note.name}) — ${note.hz.toFixed(2)} Hz`);
      nextTone.onended = () => {
        if (id === request.current) {
          tone.current = null;
          setPlaying("");
        }
      };
    } catch {
      if (id === request.current) {
        setMessage("Your browser could not play the reference tone.");
      }
    }
  }

  return (
    <div className="rounded-[var(--radius-plate)] border border-[var(--rule-mid)] bg-[var(--paper)] p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <IconVolume size={15} className="text-[var(--cobalt)]" />
          <h4 className="font-mono-score text-[11px] font-medium uppercase text-[var(--ink)]">
            Six-String Reference Pitch
          </h4>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono-score text-[10px] uppercase text-[var(--ink-muted)]">
            {heard.length}/6 checked
          </span>
          <span className="font-mono-score rounded-[2px] bg-[var(--prussian)] px-2.5 py-1 text-[11px] text-[var(--prussian-ink)]">
            {activeNote ? `${activeNote.name} · ${activeNote.hz.toFixed(2)} HZ` : "A4 = 440.00 HZ"}
          </span>
        </div>
      </div>

      {/* Prussian Resonance Chamber with live standing-wave pitch string */}
      <div className="surface-prussian relative mb-5 flex h-16 items-center overflow-hidden rounded-[var(--radius-plate)] border border-[var(--prussian-deep)] bg-[var(--prussian)] px-5">
        {/* Resting bronze string */}
        <div
          aria-hidden="true"
          className="absolute inset-x-5 top-1/2 h-[2px] -translate-y-1/2 bg-[var(--bronze)]/70"
        />
        {/* Standing-wave spindle envelope (pure scale3d) */}
        <svg
          ref={spindleRef}
          aria-hidden="true"
          viewBox="0 0 1000 56"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-5 top-1/2 h-14 w-[calc(100%-2.5rem)] -translate-y-1/2"
          style={{ transform: "scale3d(1, 0, 1)", opacity: 0 }}
        >
          <path
            d="M 0 28 Q 500 2 1000 28 Q 500 54 0 28 Z"
            fill="rgba(229, 130, 82, 0.34)"
          />
        </svg>
        {/* Oscillating core string */}
        <svg
          ref={waveRef}
          aria-hidden="true"
          viewBox="0 0 1000 56"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-5 top-1/2 h-14 w-[calc(100%-2.5rem)] -translate-y-1/2"
          style={{ transform: "scale3d(1, 0, 1)", opacity: 0 }}
        >
          <path
            d="M 0 28 Q 500 4 1000 28"
            fill="none"
            stroke="#f59a6e"
            strokeWidth="2.4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="relative z-10 flex w-full items-center justify-between">
          <span className="font-mono-score rounded-[2px] bg-[var(--prussian)]/90 px-2 py-0.5 text-[10px] uppercase text-[var(--prussian-muted)]">
            {playing
              ? `Resonating · ${activeNote?.label}`
              : "Press strings 01 → 06 to sound reference pitch"}
          </span>
          {activeNote && (
            <span className="font-mono-score rounded-[2px] bg-[var(--prussian)]/90 px-2 py-0.5 text-[10px] text-[var(--bronze)]">
              {activeNote.hz.toFixed(2)} Hz
            </span>
          )}
        </div>
      </div>

      {/* 6 Tuning Peg Pads */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
        {guitarStrings.map((note, idx) => {
          const isPlaying = playing === note.name;
          const isHeard = heard.includes(note.name);
          return (
            <button
              key={note.name}
              type="button"
              data-playing={isPlaying}
              onClick={() => void play(note)}
              className={`tactile group flex min-h-[88px] cursor-pointer flex-col justify-between rounded-[var(--radius-control)] border p-3 text-left ${
                isPlaying
                  ? "border-[var(--cinnabar)] bg-[var(--cinnabar)] text-[var(--folio)]"
                  : "border-[var(--rule-mid)] bg-[var(--folio)] text-[var(--ink)] hover:border-[var(--prussian)]"
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span
                  className={`font-mono-score text-[10px] ${
                    isPlaying ? "text-[var(--folio)]/85" : "text-[var(--ink-muted)]"
                  }`}
                >
                  0{idx + 1}
                </span>
                {isHeard && (
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isPlaying ? "bg-[var(--folio)]" : "bg-[var(--verdigris)]"
                    }`}
                    aria-hidden="true"
                  />
                )}
              </div>

              <div>
                <strong className="block text-sm font-semibold leading-tight">
                  {note.label}
                </strong>
                <span
                  className={`font-mono-score mt-0.5 block text-[11px] ${
                    isPlaying ? "text-[var(--folio)]/90" : "text-[var(--ink-muted)]"
                  }`}
                >
                  {note.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <p className="font-mono-score mt-3.5 text-[11px] text-[var(--ink-muted)]" role="status">
        {message || "Start with the thickest string (01 · Low E) and tune up toward High E (06)."}
      </p>
    </div>
  );
}

function BeatGrid({
  active = 0,
  filled = 0,
  pulseKey = 0,
}: {
  active?: number;
  filled?: number;
  pulseKey?: number;
}) {
  return (
    <div className="grid grid-cols-4 gap-2.5" aria-hidden="true">
      {[1, 2, 3, 4].map((beat) => {
        const isCurrent = beat === active;
        const lit = isCurrent || beat <= filled;
        const isDownbeat = beat === 1;
        return (
          <div
            key={`${beat}-${isCurrent ? pulseKey : 0}`}
            className={`flex h-20 flex-col items-center justify-center rounded-[var(--radius-plate)] border transition-colors duration-150 ${
              isCurrent ? "beat-hit" : ""
            } ${
              lit
                ? isDownbeat
                  ? "border-[var(--cinnabar)] bg-[var(--cinnabar)] text-[var(--folio)]"
                  : "border-[var(--prussian)] bg-[var(--prussian)] text-[var(--prussian-ink)]"
                : "border-[var(--rule-mid)] bg-[var(--folio)] text-[var(--ink-muted)]"
            }`}
          >
            <span className="font-display text-3xl leading-none">{beat}</span>
            <span className="font-mono-score mt-1 text-[9px] uppercase opacity-80">
              {isDownbeat ? "One" : "Beat"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function TapTrainer() {
  const taps = useRef<number[]>([]);
  const [count, setCount] = useState(0);
  const [tempo, setTempo] = useState(0);
  const [pulseKey, setPulseKey] = useState(0);

  function tap() {
    if (taps.current.length === 4) taps.current = [];
    const now = performance.now();
    taps.current.push(now);
    const nextCount = taps.current.length;
    setCount(nextCount);
    setPulseKey((k) => k + 1);
    if (nextCount === 4) {
      setTempo(Math.round(180_000 / Math.max(1, now - taps.current[0])));
    }
  }

  return (
    <div className="rounded-[var(--radius-plate)] border border-[var(--rule-mid)] bg-[var(--paper)] p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <IconClock size={15} className="text-[var(--cobalt)]" />
          <h4 className="font-mono-score text-[11px] font-medium uppercase text-[var(--ink)]">
            Four-Beat Pulse Pad
          </h4>
        </div>
        <span className="font-mono-score rounded-[2px] bg-[var(--prussian)] px-2.5 py-1 text-[11px] text-[var(--prussian-ink)]">
          {count === 4 ? `${tempo} BPM` : `${count} / 4 BEATS`}
        </span>
      </div>

      <BeatGrid active={count} filled={count} pulseKey={pulseKey} />

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={tap}
          className="tactile min-h-12 flex-1 cursor-pointer rounded-[var(--radius-control)] border border-[var(--prussian)] bg-[var(--prussian)] px-5 py-3 text-sm font-medium text-[var(--prussian-ink)] hover:border-[var(--cobalt)] hover:bg-[var(--cobalt)]"
        >
          Tap the beat (or press Space)
        </button>
        <button
          type="button"
          onClick={() => {
            taps.current = [];
            setCount(0);
            setTempo(0);
          }}
          className="tactile inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-[var(--rule-mid)] bg-[var(--folio)] px-4 py-3 text-sm text-[var(--ink)] hover:border-[var(--prussian)]"
        >
          <IconReset size={14} />
          <span>Reset</span>
        </button>
      </div>

      <p className="font-mono-score mt-3.5 text-[11px] text-[var(--ink-muted)]" role="status">
        {count === 4
          ? `Four taps at about ${tempo} beats per minute. Tap again to count a fresh bar.`
          : `${count} of 4 beats tapped.`}
      </p>
    </div>
  );
}

export function EmChord() {
  return (
    <div className="grid items-center gap-6 rounded-[var(--radius-plate)] border border-[var(--rule-mid)] bg-[var(--paper)] p-5 sm:grid-cols-[1fr_auto] md:p-6">
      <div className="space-y-3">
        <p className="font-mono-score text-[11px] font-medium uppercase text-[var(--cobalt)]">
          Chord Plate 01 · Em (E minor)
        </p>
        <p className="font-display text-2xl leading-snug text-[var(--ink)]">
          Two fingers on the second fret. Four strings ring wide open.
        </p>
        <p className="max-w-md text-sm leading-relaxed text-[var(--ink-soft)]">
          The thickest string sits on the left. Bronze circles mean let that string ring open. Press{" "}
          <strong className="font-semibold text-[var(--ink)]">2</strong> (middle finger) on the A string and{" "}
          <strong className="font-semibold text-[var(--ink)]">3</strong> (ring finger) right underneath it on D.
        </p>
        <p className="font-mono-score text-[11px] text-[var(--ink-muted)]">
          Click any string to audition it, or press Strum Em.
        </p>
      </div>

      <div className="flex justify-center rounded-[var(--radius-plate)] border border-[var(--rule)] bg-[var(--folio)] px-6 py-5">
        <ChordDiagram chord={em} showStrum />
      </div>
    </div>
  );
}

type DrillState =
  | { kind: "ready" | "starting" | "done" }
  | { kind: "playing"; beat: number };

/**
 * Week 1 Downstroke Trainer:
 * Combines 40-90 BPM tempo selection, crisp Web Audio woodblock clicks,
 * 4-beat pads, and a physical swinging GPU-composited metronome pendulum!
 */
export function DownstrokeTrainer() {
  const [bpm, setBpm] = useState(60);
  const [state, setState] = useState<DrillState>({ kind: "ready" });
  const [message, setMessage] = useState("");
  const [pulseKey, setPulseKey] = useState(0);
  const audio = useRef<AudioContext | null>(null);
  const timeouts = useRef<number[]>([]);
  const tones = useRef<OscillatorNode[]>([]);
  const run = useRef(0);
  const pendulumRef = useRef<HTMLDivElement | null>(null);
  const unsubPendulum = useRef<(() => void) | null>(null);

  const locked = state.kind === "playing" || state.kind === "starting";

  function stopPendulum() {
    if (unsubPendulum.current) {
      unsubPendulum.current();
      unsubPendulum.current = null;
    }
    if (pendulumRef.current) {
      pendulumRef.current.style.transform = "rotate(0deg)";
      pendulumRef.current.style.willChange = "auto";
    }
  }

  function cancel() {
    run.current++;
    timeouts.current.forEach((timeout) => window.clearTimeout(timeout));
    tones.current.forEach((t) => {
      try {
        t.stop();
      } catch {
        // Already ended
      }
    });
    timeouts.current = [];
    tones.current = [];
    stopPendulum();
  }

  useEffect(() => () => cancel(), []);

  async function start() {
    if (locked) return;
    const id = ++run.current;
    const interval = 60_000 / bpm;
    setMessage("");
    setState({ kind: "starting" });

    let context: AudioContext | null = null;
    try {
      context = await openAudio(audio.current);
    } catch {
      if (id === run.current) {
        setMessage("Sound is unavailable. Follow the swinging pendulum and four numbered beats.");
      }
    }
    if (id !== run.current) return;
    audio.current = context;

    const startPerf = performance.now() + 90;
    const startAt = context ? context.currentTime + 0.09 : 0;

    // Physical metronome pendulum synced to exact BPM in the shared RAF ticker
    if (pendulumRef.current) pendulumRef.current.style.willChange = "transform";
    unsubPendulum.current = ticker.subscribe((now) => {
      if (!pendulumRef.current) return;
      const elapsedMs = Math.max(0, now - startPerf);
      const beatPhase = (elapsedMs / interval) * Math.PI;
      const deg = Math.cos(beatPhase) * -28;
      pendulumRef.current.style.transform = `rotate(${deg.toFixed(2)}deg)`;
    });

    for (let beat = 1; beat <= 4; beat++) {
      const delay = (beat - 1) * interval;
      if (context) {
        tones.current.push(
          scheduleMetronomeClick({
            context,
            start: startAt + delay / 1000,
            accent: beat === 1,
            volume: 0.22,
          })
        );
      }
      timeouts.current.push(
        window.setTimeout(() => {
          setPulseKey((k) => k + 1);
          setState({ kind: "playing", beat });
        }, 90 + delay)
      );
    }

    timeouts.current.push(
      window.setTimeout(() => {
        timeouts.current = [];
        tones.current = [];
        stopPendulum();
        setState({ kind: "done" });
      }, 90 + interval * 4)
    );
  }

  return (
    <div className="rounded-[var(--radius-plate)] border border-[var(--rule-mid)] bg-[var(--paper)] p-5 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <IconClock size={15} className="text-[var(--cobalt)]" />
          <h4 className="font-mono-score text-[11px] font-medium uppercase text-[var(--ink)]">
            Downstroke Metronome
          </h4>
        </div>

        <div
          className="inline-flex flex-wrap items-center rounded-[var(--radius-control)] border border-[var(--rule-mid)] bg-[var(--folio)] p-0.5"
          role="group"
          aria-label="Tempo in beats per minute"
        >
          {[40, 50, 60, 70, 80, 90].map((tempo) => (
            <button
              key={tempo}
              type="button"
              disabled={locked}
              onClick={() => setBpm(tempo)}
              className={`font-mono-score min-h-8 cursor-pointer rounded-[2px] px-2.5 py-1 text-[11px] transition-colors disabled:opacity-45 ${
                bpm === tempo
                  ? "bg-[var(--prussian)] font-semibold text-[var(--prussian-ink)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {tempo}
            </button>
          ))}
          <span className="font-mono-score border-l border-[var(--rule)] px-2.5 text-[10px] text-[var(--ink-muted)]">
            BPM
          </span>
        </div>
      </div>

      {/* Swinging Physical Metronome Arc */}
      <div className="mb-5 grid items-center gap-5 sm:grid-cols-[136px_1fr]">
        <div
          aria-hidden="true"
          className="surface-prussian relative flex h-28 items-end justify-center overflow-hidden rounded-[var(--radius-plate)] bg-[var(--prussian)] pb-3"
        >
          {/* Engraved degree scale ticks */}
          <svg
            viewBox="0 0 120 88"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <path
              d="M 22 46 A 48 48 0 0 1 98 46"
              fill="none"
              stroke="rgba(245,243,236,0.18)"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
            <line x1="60" y1="14" x2="60" y2="24" stroke="var(--bronze)" strokeWidth="1.5" />
          </svg>
          {/* Pivoting brass pendulum arm (pure GPU rotate) */}
          <div
            ref={pendulumRef}
            className="relative h-20 w-[2px] origin-bottom bg-[var(--bronze)]"
            style={{ transform: "rotate(0deg)" }}
          >
            <span className="absolute left-1/2 top-3 h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-[var(--folio)] bg-[var(--cinnabar)]" />
          </div>
          <span className="absolute bottom-2 h-2.5 w-2.5 rounded-full bg-[var(--folio)]" />
        </div>

        <BeatGrid
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
        className={`tactile min-h-12 w-full cursor-pointer rounded-[var(--radius-control)] border px-5 py-3 text-sm font-medium ${
          locked
            ? "border-[var(--cinnabar)] bg-[var(--cinnabar)] text-[var(--folio)]"
            : "border-[var(--prussian)] bg-[var(--prussian)] text-[var(--prussian-ink)] hover:border-[var(--cobalt)] hover:bg-[var(--cobalt)]"
        }`}
      >
        {locked ? "Stop four beats" : `Play four slow beats (${bpm} BPM)`}
      </button>

      <p className="font-mono-score mt-3.5 text-[11px] text-[var(--ink-muted)]" role="status">
        {state.kind === "done"
          ? "Four beats complete. Shake out your fretting hand before repeating."
          : message || "Brush down across all six strings once on every beat."}
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
    <div className="space-y-2.5 border-y border-[var(--rule)] py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <IconClock size={15} className="text-[var(--ink-muted)]" />
          <span className="font-mono-score text-[11px] uppercase text-[var(--ink-muted)]">
            Practice Timer
          </span>
          <span
            className="font-mono-score rounded-[2px] bg-[var(--prussian)] px-2.5 py-0.5 text-sm font-medium text-[var(--prussian-ink)]"
            role="timer"
            aria-label="Practice time remaining"
          >
            {display}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {timer.kind === "done" && (
            <span
              role="status"
              className="font-mono-score inline-flex items-center gap-1.5 text-xs font-medium text-[var(--verdigris)]"
            >
              <IconCheck size={14} /> Time’s up
            </span>
          )}
          <button
            type="button"
            onClick={toggle}
            className="tactile font-mono-score inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-[var(--rule-mid)] bg-[var(--folio)] px-3.5 py-1.5 text-[11px] uppercase text-[var(--prussian)] hover:border-[var(--prussian)] hover:bg-[var(--prussian)] hover:text-[var(--prussian-ink)]"
          >
            {timer.kind === "running" ? <IconPause size={12} /> : <IconPlay size={12} />}
            <span>
              {timer.kind === "running"
                ? "Pause"
                : timer.kind === "done"
                  ? "Restart"
                  : "Start timer"}
            </span>
          </button>
        </div>
      </div>

      {/* Pure compositor progress line (scaleX only — zero width animation!) */}
      <div className="h-[2px] w-full overflow-hidden bg-[var(--rule)]" aria-hidden="true">
        <div
          className="h-full w-full origin-left bg-[var(--cobalt)] transition-transform duration-200 ease-[var(--ease-snap)]"
          style={{ transform: `scale3d(${ratio.toFixed(4)}, 1, 1)` }}
        />
      </div>
    </div>
  );
}
