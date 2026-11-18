"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Check, CircleHelp, Clock3, LockKeyhole, Music2 } from "lucide-react";
import type { Lesson, LessonStep } from "../lib/lessons";
import { useLocalValue } from "../lib/local-value";
import { DownstrokeTrainer, EmChord, PracticeTimer, TapTrainer, Tuner } from "./practice-tools";
import { Recordings, type Rhythm } from "./recordings";

type Progress = { current: string; visited: string[]; finished: boolean };

const emptyProgress: Progress = { current: "", visited: [], finished: false };
const maxLineLength = 180;

function parseProgress(value: unknown): Progress {
  if (typeof value !== "object" || value === null ||
    !("current" in value) || typeof value.current !== "string" ||
    !("visited" in value) || !Array.isArray(value.visited) ||
    !("finished" in value) || typeof value.finished !== "boolean") return emptyProgress;
  const visited = value.visited.filter((item: unknown) => typeof item === "string");
  return { current: value.current, visited, finished: value.finished };
}

function parseLine(value: unknown) {
  return typeof value === "string" ? value.slice(0, maxLineLength) : "";
}

function parseRhythm(value: unknown): Rhythm | null {
  return value === "rhythm-a" || value === "rhythm-b" ? value : null;
}

export function LessonPlayer({ lesson, home = false }: { lesson: Lesson; home?: boolean }) {
  const progress = useLocalValue({ key: `lesson:${lesson.id}`, initial: emptyProgress, parse: parseProgress });
  const line = useLocalValue({ key: "line", initial: "", parse: parseLine });
  const rhythm = useLocalValue<Rhythm | null>({ key: "rhythm", initial: null, parse: parseRhythm });
  const [busy, setBusy] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusNext = useRef(false);
  const progressValue = progress.value;
  const index = Math.max(0, lesson.steps.findIndex((step) => step.id === progressValue.current));
  const step = lesson.steps[index];
  const next = lesson.steps[index + 1];
  const finished = progressValue.finished;
  const visited = new Set(progressValue.visited.filter((id) => lesson.steps.some((item) => item.id === id)));
  const minutes = lesson.steps.reduce((sum, item) => sum + item.minutes, 0);
  const warning = progress.warning || line.warning || rhythm.warning;

  function focusStep() {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: "start" });
  }

  function go(target: LessonStep) {
    if (!progress.ready || busy) return;
    if (target.id === step.id && !finished) {
      focusStep();
      return;
    }
    focusNext.current = true;
    progress.save({ ...progressValue, current: target.id, finished: false });
  }

  function advance() {
    if (!progress.ready || busy) return;
    visited.add(step.id);
    focusNext.current = true;
    progress.save({ current: next?.id ?? step.id, visited: [...visited], finished: !next });
  }

  return (
    <>
      {home && (
        <header className="hero">
          <div className="hero-copy">
            <p className="eyebrow"><span /> A free guitar &amp; songwriting course</p>
            <h1><span>From your first chord to </span><em>your first song</em></h1>
            <p className="hero-lead">Pick up your guitar. In 15 minutes, you’ll play a chord, write one line, and record a hook of your own.</p>
            <div className="hero-actions">
              <a className="button primary hero-button" href="#lesson" onClick={(event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                focusStep();
              }}>
                {finished ? "Review your first session" : progressValue.current ? "Resume your first session" : "Start your first session"}
                <ArrowDown size={19} aria-hidden="true" />
              </a>
              <span className="hero-time"><Clock3 size={16} aria-hidden="true" /> {minutes} min</span>
            </div>
          </div>
          <div className="hero-image">
            <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/guitar.webp`} alt="" width="1120" height="747" fetchPriority="high" />
          </div>
        </header>
      )}
      <section id="lesson" className="lesson-section" aria-labelledby="session-title">
        <header className="section-header">
          <div>
            <p className="eyebrow"><span /> {lesson.stage} <span className="eyebrow-divider" /> {minutes} min</p>
            {home ? <h2 id="session-title">{lesson.title}</h2> : <h1 id="session-title">{lesson.title}</h1>}
            <p>{lesson.objective}</p>
          </div>
          {home && <span className="private-note"><LockKeyhole size={15} aria-hidden="true" /> Progress stays on this device</span>}
        </header>

        <div className="lesson-grid">
          <div className="lesson-card">
            <div className="step-content" key={finished ? "complete" : step.id}>
              <div className="step-top">
                <p className="step-label">{finished ? "Session complete" : `Step ${index + 1} of ${lesson.steps.length}`}</p>
                {!finished && <span className="step-duration"><Clock3 size={15} aria-hidden="true" /> {step.minutes} min</span>}
              </div>
              <h3 tabIndex={-1} ref={(element) => {
                heading.current = element;
                if (element && focusNext.current) {
                  focusNext.current = false;
                  focusStep();
                }
              }}>{finished ? (home ? "Your first hook checkpoint" : "Your Week 1 checkpoint") : step.title}</h3>

              {finished ? <>
                <p className="step-instruction">{lesson.checkpoint}</p>
                {home && <Recordings mode="hook" line={line.value} rhythm={rhythm.value} onRhythm={rhythm.save} onBusy={setBusy} />}
              </> : <>
                <p className="step-instruction">{step.instruction}</p>
                {step.kind === "tune" && <Tuner />}
                {step.kind === "tap" && <TapTrainer />}
                {step.kind === "chord" && <EmChord />}
                {step.kind === "write" && (
                  <div className="tool writing-tool">
                    <label className="field" htmlFor="hook-line">Your line</label>
                    <p className="tool-note" id="line-hint">Example: The kitchen smelled like rain on your coat.</p>
                    <textarea id="hook-line" aria-describedby="line-hint" rows={3} maxLength={maxLineLength} disabled={!line.ready}
                      value={line.value} onChange={(event) => line.save(event.target.value)} />
                    <p className="character-count">{line.value.length}/{maxLineLength}</p>
                  </div>
                )}
                {(step.kind === "compare" || step.kind === "hook") && (
                  <>
                    {line.value.trim() && <blockquote className="lyric-preview">{line.value}</blockquote>}
                    <Recordings mode={step.kind} line={line.value} rhythm={rhythm.value} onRhythm={rhythm.save} onBusy={setBusy} />
                  </>
                )}
                {step.kind === "drill" && <><EmChord /><DownstrokeTrainer /></>}
                <PracticeTimer minutes={step.minutes} />
                {step.tip && (
                  <details className="step-help">
                    <summary><CircleHelp size={17} aria-hidden="true" /> Need a hand?</summary>
                    <p>{step.tip}</p>
                  </details>
                )}
              </>}
              {warning && <p className="tool-note" role="status">{warning}</p>}
            </div>
            <div className="step-footer">
              <button className="button quiet" type="button" disabled={busy || !progress.ready || (!finished && index === 0)}
                onClick={() => go(finished ? step : lesson.steps[Math.max(0, index - 1)])}>
                <ArrowLeft size={18} aria-hidden="true" /> {finished ? "Review last step" : "Back"}
              </button>
              {finished ? (
                home ? <Link className="button primary" href="/week-1/">Continue to Week 1 <ArrowRight size={18} aria-hidden="true" /></Link> :
                  <Link className="button primary" href="/chords/">Open chord library <ArrowRight size={18} aria-hidden="true" /></Link>
              ) : (
                <button className="button primary" type="button" disabled={busy || !progress.ready} onClick={advance}>
                  {next ? "Next step" : home ? "Finish session" : "Finish Week 1"}
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <aside className="session-outline" aria-labelledby="outline-title">
            <div className="outline-header">
              <h3 id="outline-title">Session steps</h3>
              <span>{visited.size} of {lesson.steps.length} done</span>
            </div>
            <progress aria-label="Session steps done" value={visited.size} max={lesson.steps.length} />
            <ol role="list">
              {lesson.steps.map((item, itemIndex) => {
                const active = !finished && item.id === step.id;
                const done = visited.has(item.id);
                return (
                  <li key={item.id}>
                    <button type="button" aria-current={active ? "step" : undefined} disabled={busy || !progress.ready} onClick={() => go(item)}>
                      <span className="outline-number" aria-hidden="true">{done ? <Check size={15} /> : itemIndex + 1}</span>
                      <span><span className="sr-only">Go to </span>{item.title}{done && <span className="sr-only">, done</span>}</span>
                      {active ? <span className="active-step-dot" aria-hidden="true" /> : <span className="outline-time">{item.minutes} min</span>}
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="outline-goal">
              <Music2 size={18} aria-hidden="true" />
              <p>{lesson.checkpoint}</p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
