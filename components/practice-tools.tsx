"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock3, Guitar, Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { em, guitarStrings } from "../lib/chords";
import { openAudio, scheduleTone } from "../lib/sound";
import { ChordDiagram } from "./chord-diagram";

export function Tuner() {
  const audio = useRef<AudioContext | null>(null);
  const tone = useRef<OscillatorNode | null>(null);
  const request = useRef(0);
  const [playing, setPlaying] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => () => {
    request.current++;
    if (audio.current) void audio.current.close();
  }, []);

  async function play(note: (typeof guitarStrings)[number]) {
    const id = ++request.current;
    try {
      const context = await openAudio(audio.current);
      if (id !== request.current) {
        if (context !== audio.current) void context.close();
        return;
      }
      audio.current = context;
      tone.current?.stop();
      const nextTone = scheduleTone({
        context, hz: note.hz, start: context.currentTime, duration: 2, volume: 0.23, type: "triangle",
      });
      tone.current = nextTone;
      setPlaying(note.name);
      setMessage(`Reference tone: ${note.label} • ${note.name} • ${note.hz} Hz`);
      nextTone.onended = () => {
        if (id === request.current) {
          tone.current = null;
          setPlaying("");
        }
      };
    } catch {
      if (id === request.current) setMessage("Your browser could not play the reference tone.");
    }
  }

  return (
    <div className="tool tuner">
      <div className="tool-heading"><Volume2 size={19} aria-hidden="true" /><h4>Reference tones</h4></div>
      <div className="tone-grid">
        {guitarStrings.map((note) => (
          <button key={note.name} className="tone" data-playing={playing === note.name} type="button" onClick={() => void play(note)}>
            <Volume2 size={17} aria-hidden="true" />
            <strong>{note.label}</strong>
            <span>{note.name}</span>
          </button>
        ))}
      </div>
      <p className="tool-note" role="status">{message || "Select a string to hear its pitch."}</p>
    </div>
  );
}

function BeatDots({ active = 0, filled = 0 }: { active?: number; filled?: number }) {
  return (
    <div className="beat-row" aria-hidden="true">
      {[1, 2, 3, 4].map((beat) => (
        <span key={beat} data-active={beat === active || beat <= filled}>{beat}</span>
      ))}
    </div>
  );
}

export function TapTrainer() {
  const taps = useRef<number[]>([]);
  const [count, setCount] = useState(0);
  const [tempo, setTempo] = useState(0);

  function tap() {
    if (taps.current.length === 4) taps.current = [];
    const now = performance.now();
    taps.current.push(now);
    setCount(taps.current.length);
    if (taps.current.length === 4) setTempo(Math.round(180_000 / Math.max(1, now - taps.current[0])));
  }

  return (
    <div className="tool">
      <div className="tool-heading"><Clock3 size={19} aria-hidden="true" /><h4>Four-beat tap trainer</h4></div>
      <BeatDots filled={count} />
      <div className="tool-actions">
        <button className="button primary" type="button" onClick={tap}>Tap the beat</button>
        <button className="button secondary" type="button" onClick={() => { taps.current = []; setCount(0); setTempo(0); }}>
          <RotateCcw size={16} aria-hidden="true" /> Reset
        </button>
      </div>
      <p className="tool-note" role="status">{count === 4 ? `Four taps at about ${tempo} beats per minute. Tap again to start over.` : `${count} of 4 beats tapped.`}</p>
    </div>
  );
}

export function EmChord() {
  return (
    <div className="tool chord-tool">
      <div>
        <div className="tool-heading"><Guitar size={19} aria-hidden="true" /><h4>Em · E minor</h4></div>
        <p className="tool-note">The thickest string is on the left. An open circle means play the string without pressing it. The 2 is your middle finger and the 3 is your ring finger.</p>
      </div>
      <ChordDiagram chord={em} />
    </div>
  );
}

type DrillState = { kind: "ready" | "starting" | "done" } | { kind: "playing"; beat: number };

export function DownstrokeTrainer() {
  const [bpm, setBpm] = useState(60);
  const [state, setState] = useState<DrillState>({ kind: "ready" });
  const [message, setMessage] = useState("");
  const audio = useRef<AudioContext | null>(null);
  const timeouts = useRef<number[]>([]);
  const tones = useRef<OscillatorNode[]>([]);
  const run = useRef(0);
  const locked = state.kind === "playing" || state.kind === "starting";

  function cancel() {
    run.current++;
    timeouts.current.forEach((timeout) => window.clearTimeout(timeout));
    tones.current.forEach((tone) => tone.stop());
    timeouts.current = [];
    tones.current = [];
  }

  useEffect(() => () => {
    cancel();
    if (audio.current) void audio.current.close();
  }, []);

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
      if (id === run.current) setMessage("Sound is unavailable. Follow the four numbered beats.");
    }
    if (id !== run.current) {
      if (context && context !== audio.current) void context.close();
      return;
    }
    audio.current = context;
    const startAt = context ? context.currentTime + 0.09 : 0;
    for (let beat = 1; beat <= 4; beat++) {
      const delay = (beat - 1) * interval;
      if (context) tones.current.push(scheduleTone({
        context, hz: beat === 1 ? 880 : 660, duration: 0.09, start: startAt + delay / 1000, volume: 0.13,
      }));
      timeouts.current.push(window.setTimeout(() => setState({ kind: "playing", beat }), 90 + delay));
    }
    timeouts.current.push(window.setTimeout(() => {
      timeouts.current = [];
      tones.current = [];
      setState({ kind: "done" });
    }, 90 + interval * 4));
  }

  return (
    <div className="tool">
      <div className="tool-heading"><Clock3 size={19} aria-hidden="true" /><h4>Downstroke trainer</h4></div>
      <BeatDots active={state.kind === "playing" ? state.beat : 0} filled={state.kind === "done" ? 4 : 0} />
      <div className="tool-actions">
        <label className="tempo-label">
          Tempo
          <select value={bpm} disabled={locked} onChange={(event) => setBpm(Number(event.target.value))}>
            {[40, 50, 60, 70, 80, 90].map((tempo) => <option key={tempo} value={tempo}>{tempo} bpm</option>)}
          </select>
        </label>
        <button type="button" className="button primary" onClick={() => {
          if (locked) { cancel(); setState({ kind: "ready" }); }
          else void start();
        }}>
          {locked ? "Stop beats" : "Play four beats"}
        </button>
      </div>
      <p className="tool-note" role="status">
        {state.kind === "done" ? "Four beats complete. Relax your hand before repeating." : message || "Strum down once as each beat lights up."}
      </p>
    </div>
  );
}

type TimerState = { kind: "paused"; remaining: number } | { kind: "running"; deadline: number } | { kind: "done" };

export function PracticeTimer({ minutes }: { minutes: number }) {
  const duration = minutes * 60;
  const [timer, setTimer] = useState<TimerState>({ kind: "paused", remaining: duration });
  const [now, setNow] = useState(0);
  const remaining = timer.kind === "running" ? Math.max(0, Math.ceil((timer.deadline - now) / 1000)) :
    timer.kind === "paused" ? timer.remaining : 0;
  const display = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (timer.kind !== "running") return;
    const interval = window.setInterval(() => {
      const currentTime = performance.now();
      setNow(currentTime);
      if (currentTime >= timer.deadline) setTimer({ kind: "done" });
    }, 150);
    return () => window.clearInterval(interval);
  }, [timer]);

  function toggle() {
    if (timer.kind === "running") {
      setTimer({ kind: "paused", remaining });
    } else {
      const currentTime = performance.now();
      setNow(currentTime);
      setTimer({ kind: "running", deadline: currentTime + (timer.kind === "done" ? duration : remaining) * 1000 });
    }
  }

  return (
    <div className="practice-timer">
      <Clock3 size={18} aria-hidden="true" />
      <span className="timer-text" role="timer" aria-label="Practice time remaining">{display}</span>
      <button type="button" className="timer-button" onClick={toggle}>
        {timer.kind === "running" ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
        {timer.kind === "running" ? "Pause timer" : timer.kind === "done" ? "Restart timer" : "Start timer"}
      </button>
      {timer.kind === "done" && <span role="status" className="timer-done"><Check size={16} aria-hidden="true" /> Time’s up</span>}
    </div>
  );
}
