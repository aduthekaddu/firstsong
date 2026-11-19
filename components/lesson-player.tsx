"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Lesson, LessonStep } from "../lib/lessons";
import { useLocalValue } from "../lib/local-value";
import { ChordMorphChapter } from "./chord-morph-chapter";
import { CourseArc } from "./course-arc";
import {
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconHelp,
} from "./icons";
import { LivingNeck } from "./living-neck";
import {
  Magnetic,
  ParallaxLayer,
  RevealPlate,
  SplitReveal,
  StaveRule,
} from "./motion-primitives";
import { useMotionSystem } from "./motion-provider";
import {
  DownstrokeTrainer,
  EmChord,
  PracticeTimer,
  TapTrainer,
  Tuner,
} from "./practice-tools";
import { Recordings, type Rhythm } from "./recordings";
import { PlateEyebrow } from "./ui";

type Progress = { current: string; visited: string[]; finished: boolean };

const emptyProgress: Progress = { current: "", visited: [], finished: false };
const maxLineLength = 180;
const maxNotesLength = 320;

function parseProgress(value: unknown): Progress {
  if (
    typeof value !== "object" ||
    value === null ||
    !("current" in value) ||
    typeof value.current !== "string" ||
    !("visited" in value) ||
    !Array.isArray(value.visited) ||
    !("finished" in value) ||
    typeof value.finished !== "boolean"
  ) {
    return emptyProgress;
  }
  const visited = value.visited.filter((item: unknown) => typeof item === "string");
  return { current: value.current, visited, finished: value.finished };
}

function parseLine(value: unknown) {
  return typeof value === "string" ? value.slice(0, maxLineLength) : "";
}

function parseNotes(value: unknown) {
  return typeof value === "string" ? value.slice(0, maxNotesLength) : "";
}

function parseRhythm(value: unknown): Rhythm | null {
  return value === "rhythm-a" || value === "rhythm-b" ? value : null;
}

export function LessonPlayer({ lesson, home = false }: { lesson: Lesson; home?: boolean }) {
  const { scrollTo } = useMotionSystem();
  const progress = useLocalValue({
    key: `lesson:${lesson.id}`,
    initial: emptyProgress,
    parse: parseProgress,
  });
  const line = useLocalValue({ key: "line", initial: "", parse: parseLine });
  const weekOneNotes = useLocalValue({
    key: "week-1:notes",
    initial: "",
    parse: parseNotes,
  });
  const rhythm = useLocalValue<Rhythm | null>({
    key: "rhythm",
    initial: null,
    parse: parseRhythm,
  });
  const [busy, setBusy] = useState(false);

  const heading = useRef<HTMLHeadingElement>(null);
  const focusNext = useRef(false);

  const progressValue = progress.value;
  const index = Math.max(0, lesson.steps.findIndex((s) => s.id === progressValue.current));
  const step = lesson.steps[index];
  const next = lesson.steps[index + 1];
  const finished = progressValue.finished;
  const visited = new Set(
    progressValue.visited.filter((id) => lesson.steps.some((item) => item.id === id))
  );
  const minutes = lesson.steps.reduce((sum, item) => sum + item.minutes, 0);
  const completionRatio = lesson.steps.length > 0 ? visited.size / lesson.steps.length : 0;
  const warning = progress.warning || line.warning || rhythm.warning || weekOneNotes.warning;

  function focusStep() {
    heading.current?.focus({ preventScroll: true });
    if (heading.current) {
      scrollTo(heading.current, { offset: -120 });
    }
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
    progress.save({
      current: next?.id ?? step.id,
      visited: [...visited],
      finished: !next,
    });
  }

  return (
    <div>
      {/* ── HOME HERO: Monumental Urtext Opening Stage + Full-Bleed Playable Neck ── */}
      {home ? (
        <header className="relative flex flex-col justify-between pt-6 md:min-h-[calc(100svh-68px)] md:pt-8">
          <div className="urtext-container relative pb-5 md:pb-6">
            {/* Subtle background engraved plate numeral with gentle scroll parallax */}
            <ParallaxLayer
              speed={-24}
              className="pointer-events-none absolute right-[var(--gutter)] top-0 hidden select-none lg:block"
            >
              <span
                aria-hidden="true"
                className="font-display text-[10rem] leading-none text-[var(--prussian)]/[0.045]"
              >
                00
              </span>
            </ParallaxLayer>

            <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
              <div className="space-y-3 lg:col-span-8">
                <RevealPlate immediate delayMs={40}>
                  <PlateEyebrow
                    index="Plate 00"
                    label="Free Guitar & Songwriting Field Manual"
                  />
                </RevealPlate>

                <SplitReveal
                  as="h1"
                  immediate
                  delayMs={90}
                  className="font-display-hero text-[var(--ink)]"
                  lines={[
                    "Six strings.",
                    "One chord.",
                    <em key="song" className="text-[var(--cobalt)]">
                      Your first song.
                    </em>,
                  ]}
                />
              </div>

              <RevealPlate immediate delayMs={320} className="space-y-4 lg:col-span-4 lg:pb-1">
                <p className="text-base leading-relaxed text-[var(--ink-soft)] md:text-[1.05rem]">
                  Pick up your guitar. In fifteen minutes you’ll tune six strings, ring out E minor, write one concrete line from memory, and record a personal hook you can play back.
                </p>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--rule)] pt-3">
                  <span className="font-mono-score text-[11px] uppercase text-[var(--ink)]">
                    {minutes} min session
                  </span>
                  <span className="font-mono-score text-[11px] uppercase text-[var(--ink-muted)]">
                    Zero accounts · Free forever
                  </span>
                </div>
              </RevealPlate>
            </div>
          </div>

          {/* Signature Grid Break: Full-Bleed Playable 6-String Acoustic Stage */}
          <LivingNeck />

          {/* Opening Stage Action Footer Strip */}
          <div className="urtext-container flex flex-wrap items-center justify-between gap-4 py-4 md:py-5">
            <div className="flex flex-wrap items-center gap-4">
              <Magnetic strength={6}>
                <a
                  href="#lesson"
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    scrollTo("#lesson", { offset: -72 });
                    window.setTimeout(() => heading.current?.focus({ preventScroll: true }), 450);
                  }}
                  className="tactile inline-flex min-h-12 items-center gap-3 rounded-[var(--radius-control)] border border-[var(--prussian)] bg-[var(--prussian)] px-7 py-3.5 text-sm font-medium text-[var(--prussian-ink)] hover:border-[var(--cobalt)] hover:bg-[var(--cobalt)]"
                >
                  <span>
                    {finished
                      ? "Review your first session"
                      : progressValue.current
                        ? "Resume Stage 0 session"
                        : "Start your 15-minute session"}
                  </span>
                  <IconArrowDown size={16} />
                </a>
              </Magnetic>

              <Link
                href="/chords/"
                className="score-link font-mono-score px-2 py-2 text-[11px] font-medium uppercase text-[var(--ink-muted)] hover:text-[var(--prussian)]"
              >
                Or open the 10-chord library
                <IconArrowRight size={13} />
              </Link>
            </div>

            <p className="font-mono-score hidden text-[11px] uppercase text-[var(--ink-muted)] md:block">
              Scroll to morph five open chords ↓
            </p>
          </div>
        </header>
      ) : (
        /* ── WEEK 1 CHAPTER HEADER ── */
        <header className="urtext-container pt-10 pb-10 md:pt-14 md:pb-12">
          <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="space-y-4 lg:col-span-8">
              <RevealPlate immediate delayMs={40}>
                <PlateEyebrow
                  index="Plate 02"
                  label={`${lesson.stage} · ${minutes} Min Session`}
                  tone="cinnabar"
                />
              </RevealPlate>
              <SplitReveal
                as="h1"
                immediate
                delayMs={90}
                className="font-display-hero text-[var(--ink)]"
                lines={[
                  "A repeatable",
                  <em key="hook" className="text-[var(--cobalt)]">
                    hook.
                  </em>,
                ]}
              />
            </div>

            <RevealPlate immediate delayMs={260} className="space-y-4 lg:col-span-4 lg:pb-2">
              <p className="text-base leading-relaxed text-[var(--ink-soft)] md:text-lg">
                {lesson.objective} Relax your fretting hand, find one sensory title line, shape a two- or three-note melody, and save a four-bar memo you can play again tomorrow.
              </p>
              <div className="border-l-2 border-[var(--verdigris)] pl-3.5 text-xs leading-relaxed text-[var(--ink-muted)]">
                <span className="font-mono-score block text-[10px] uppercase text-[var(--verdigris)]">
                  Week 1 Checkpoint
                </span>
                {lesson.checkpoint}
              </div>
            </RevealPlate>
          </div>
          <StaveRule immediate delayMs={220} className="mt-10" />
        </header>
      )}

      {/* ── HOME SIGNATURE CHAPTER: Scroll-Synced Chord Morph & TAB Playhead ── */}
      {home && <ChordMorphChapter />}

      {/* ── STUDIO BENCH: Interactive Stage 0 / Week 1 Session ── */}
      <section
        id="lesson"
        className="urtext-container scroll-mt-24 pt-16 md:pt-24"
        aria-labelledby="session-title"
      >
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <PlateEyebrow
              index={home ? "Plate 02" : "Bench"}
              label={`${lesson.stage} · ${minutes} min · ${lesson.steps.length} steps`}
              tone="cinnabar"
            />
            {home ? (
              <h2 id="session-title" className="font-display-section text-[var(--ink)]">
                {lesson.title}
              </h2>
            ) : (
              <h2 id="session-title" className="font-display-section text-[var(--ink)]">
                Practice workbench
              </h2>
            )}
            <p className="max-w-2xl text-base text-[var(--ink-muted)]">{lesson.objective}</p>
          </div>

          <span className="font-mono-score rounded-[var(--radius-control)] border border-[var(--rule)] bg-[var(--folio)] px-3 py-1.5 text-[10px] uppercase text-[var(--ink-muted)]">
            Saved locally in this browser
          </span>
        </div>

        {/* Asymmetric Two-Pane Urtext Studio Bench */}
        <div className="grid overflow-hidden rounded-[var(--radius-plate)] border border-[var(--prussian)]/85 bg-[var(--folio)] lg:grid-cols-[320px_1fr]">
          {/* Active Step Bench comes FIRST in DOM on mobile/tablet visual order via CSS order */}
          <div className="order-1 flex min-h-[540px] flex-col justify-between p-6 md:p-10 lg:order-2">
            <div key={finished ? "complete" : step.id} className="bench-enter space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rule)] pb-4">
                <span className="font-mono-score text-xs font-medium uppercase text-[var(--cinnabar)]">
                  {finished
                    ? "Session complete"
                    : `Step ${String(index + 1).padStart(2, "0")} / ${String(lesson.steps.length).padStart(2, "0")}`}
                </span>
                {!finished && (
                  <span className="font-mono-score rounded-[2px] bg-[var(--vellum)] px-2.5 py-0.5 text-xs text-[var(--ink-muted)]">
                    ~{step.minutes} min
                  </span>
                )}
              </div>

              <h3
                tabIndex={-1}
                ref={(element) => {
                  heading.current = element;
                  if (element && focusNext.current) {
                    focusNext.current = false;
                    focusStep();
                  }
                }}
                className="font-display text-3xl leading-tight text-[var(--ink)] outline-none md:text-5xl"
              >
                {finished
                  ? home
                    ? "Your first hook checkpoint"
                    : "Your Week 1 checkpoint"
                  : step.title}
              </h3>

              {finished ? (
                <div className="space-y-6">
                  <p className="max-w-2xl text-base leading-relaxed text-[var(--ink-soft)] md:text-lg">
                    {lesson.checkpoint}
                  </p>
                  {home && (
                    <Recordings
                      mode="hook"
                      line={line.value}
                      rhythm={rhythm.value}
                      onRhythm={rhythm.save}
                      onBusy={setBusy}
                    />
                  )}
                  {!home && weekOneNotes.value.trim() && (
                    <blockquote className="border-l-2 border-[var(--verdigris)] bg-[var(--paper)] px-5 py-4 font-display text-2xl italic text-[var(--prussian)]">
                      “{weekOneNotes.value.trim()}”
                    </blockquote>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="max-w-2xl text-base leading-relaxed text-[var(--ink-soft)] md:text-[1.08rem]">
                    {step.instruction}
                  </p>

                  {step.kind === "tune" && <Tuner />}
                  {step.kind === "tap" && <TapTrainer />}
                  {step.kind === "chord" && <EmChord />}

                  {step.kind === "write" && (
                    <div className="space-y-4 rounded-[var(--radius-plate)] border border-[var(--rule-mid)] bg-[var(--paper)] p-5 md:p-6">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          className="font-mono-score text-[11px] font-medium uppercase text-[var(--ink)]"
                          htmlFor="hook-line"
                        >
                          Your Concrete Line
                        </label>
                        <span className="font-mono-score text-[11px] text-[var(--ink-muted)]">
                          {line.value.length}/{maxLineLength}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--ink-muted)]" id="line-hint">
                        Name a place and an object. Example: “The kitchen smelled like rain on your coat.”
                      </p>
                      <textarea
                        id="hook-line"
                        aria-describedby="line-hint"
                        rows={3}
                        maxLength={maxLineLength}
                        disabled={!line.ready}
                        value={line.value}
                        onChange={(event) => line.save(event.target.value)}
                        placeholder="Write one sentence you would actually say out loud…"
                        className="w-full rounded-[var(--radius-control)] border border-[var(--rule-mid)] bg-[var(--folio)] p-4 text-base text-[var(--ink)] placeholder:text-[var(--ink-muted)]/60 focus:border-[var(--cobalt)]"
                      />
                      {line.value.trim() && (
                        <div className="border-l-2 border-[var(--cobalt)] bg-[var(--folio)] px-4 py-3">
                          <span className="font-mono-score block text-[10px] uppercase text-[var(--cobalt)]">
                            Engraved Lyric Preview
                          </span>
                          <p className="font-display mt-1 text-2xl italic text-[var(--prussian)]">
                            “{line.value.trim()}”
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {(step.kind === "compare" || step.kind === "hook") && (
                    <div className="space-y-4">
                      {line.value.trim() && (
                        <blockquote className="border-l-2 border-[var(--cinnabar)] bg-[var(--paper)] px-5 py-4 font-display text-2xl italic text-[var(--prussian)] md:text-3xl">
                          “{line.value}”
                        </blockquote>
                      )}
                      <Recordings
                        mode={step.kind}
                        line={line.value}
                        rhythm={rhythm.value}
                        onRhythm={rhythm.save}
                        onBusy={setBusy}
                      />
                    </div>
                  )}

                  {step.kind === "drill" && (
                    <div className="space-y-5">
                      <EmChord />
                      <DownstrokeTrainer />
                    </div>
                  )}

                  {step.kind === "practice" && (
                    <div className="space-y-4 rounded-[var(--radius-plate)] border border-[var(--rule-mid)] bg-[var(--paper)] p-5 md:p-6">
                      {line.value.trim() && (
                        <div className="border-b border-[var(--rule)] pb-3.5">
                          <span className="font-mono-score block text-[10px] uppercase text-[var(--ink-muted)]">
                            Carried over from Stage 0
                          </span>
                          <p className="font-display mt-1 text-xl italic text-[var(--prussian)]">
                            “{line.value.trim()}”
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor="week1-scratch"
                          className="font-mono-score text-[11px] font-medium uppercase text-[var(--ink)]"
                        >
                          Week 1 Working Lyric &amp; Title Notes
                        </label>
                        <span className="font-mono-score text-[11px] text-[var(--ink-muted)]">
                          {weekOneNotes.value.length}/{maxNotesLength}
                        </span>
                      </div>
                      <textarea
                        id="week1-scratch"
                        rows={3}
                        maxLength={maxNotesLength}
                        disabled={!weekOneNotes.ready}
                        value={weekOneNotes.value}
                        onChange={(e) => weekOneNotes.save(e.target.value)}
                        placeholder="Jot four sensory details, circle your title line, or mark the stressed word…"
                        className="w-full rounded-[var(--radius-control)] border border-[var(--rule-mid)] bg-[var(--folio)] p-4 text-sm text-[var(--ink)] placeholder:text-[var(--ink-muted)]/60"
                      />
                    </div>
                  )}

                  <PracticeTimer minutes={step.minutes} />

                  {step.tip && (
                    <details className="rounded-[var(--radius-plate)] border border-[var(--rule)] bg-[var(--paper)] px-4 py-3.5 text-sm">
                      <summary className="flex cursor-pointer select-none items-center gap-2.5 font-medium text-[var(--prussian)]">
                        <IconHelp size={15} className="text-[var(--cinnabar)]" />
                        <span>Stuck? Need a hand?</span>
                      </summary>
                      <p className="mt-3 border-t border-[var(--rule)] pt-3 text-sm leading-relaxed text-[var(--ink-soft)]">
                        {step.tip}
                      </p>
                    </details>
                  )}
                </div>
              )}

              {warning && (
                <p className="font-mono-score text-xs text-[var(--cinnabar)]" role="status">
                  {warning}
                </p>
              )}
            </div>

            {/* Bench Navigation Footer */}
            <div className="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--rule)] pt-6">
              <button
                type="button"
                disabled={busy || !progress.ready || (!finished && index === 0)}
                onClick={() => go(finished ? step : lesson.steps[Math.max(0, index - 1)])}
                className="tactile inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-[var(--rule-mid)] bg-[var(--folio)] px-5 py-2.5 text-sm font-medium text-[var(--ink)] hover:border-[var(--prussian)] disabled:cursor-not-allowed disabled:opacity-35"
              >
                <IconArrowLeft size={15} />
                <span>{finished ? "Review last step" : "Back"}</span>
              </button>

              {finished ? (
                home ? (
                  <Magnetic strength={5}>
                    <Link
                      href="/week-1/"
                      className="tactile inline-flex min-h-11 items-center gap-2.5 rounded-[var(--radius-control)] border border-[var(--prussian)] bg-[var(--prussian)] px-6 py-2.5 text-sm font-medium text-[var(--prussian-ink)] hover:border-[var(--cobalt)] hover:bg-[var(--cobalt)]"
                    >
                      <span>Continue to Week 1</span>
                      <IconArrowRight size={15} />
                    </Link>
                  </Magnetic>
                ) : (
                  <Magnetic strength={5}>
                    <Link
                      href="/chords/"
                      className="tactile inline-flex min-h-11 items-center gap-2.5 rounded-[var(--radius-control)] border border-[var(--prussian)] bg-[var(--prussian)] px-6 py-2.5 text-sm font-medium text-[var(--prussian-ink)] hover:border-[var(--cobalt)] hover:bg-[var(--cobalt)]"
                    >
                      <span>Open 10-Chord Library</span>
                      <IconArrowRight size={15} />
                    </Link>
                  </Magnetic>
                )
              ) : (
                <Magnetic strength={5}>
                  <button
                    type="button"
                    disabled={busy || !progress.ready}
                    onClick={advance}
                    className="tactile inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[var(--radius-control)] border border-[var(--prussian)] bg-[var(--prussian)] px-6 py-2.5 text-sm font-medium text-[var(--prussian-ink)] hover:border-[var(--cobalt)] hover:bg-[var(--cobalt)] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <span>
                      {next ? "Next step" : home ? "Finish Stage 0" : "Finish Week 1"}
                    </span>
                    <IconArrowRight size={15} />
                  </button>
                </Magnetic>
              )}
            </div>
          </div>

          {/* Left Session Index Rail (below bench on mobile, left rail on desktop!) */}
          <aside
            className="order-2 flex flex-col justify-between border-t border-[var(--rule-mid)] bg-[var(--paper)] lg:order-1 lg:border-r lg:border-t-0"
            aria-labelledby="outline-title"
          >
            <div>
              <div className="flex items-center justify-between border-b border-[var(--rule)] px-5 py-4">
                <h3
                  id="outline-title"
                  className="font-mono-score text-[11px] font-medium uppercase text-[var(--ink)]"
                >
                  Session Steps
                </h3>
                <span className="font-mono-score text-xs text-[var(--ink-muted)]">
                  {visited.size} / {lesson.steps.length}
                </span>
              </div>

              {/* Pure GPU scaleX progress bar (zero width animation!) */}
              <div className="h-[3px] w-full overflow-hidden bg-[var(--rule)]" aria-hidden="true">
                <div
                  className="h-full w-full origin-left bg-[var(--verdigris)] transition-transform duration-300 ease-[var(--ease-out-expo)]"
                  style={{ transform: `scale3d(${completionRatio.toFixed(4)}, 1, 1)` }}
                />
              </div>

              <ol role="list" className="divide-y divide-[var(--rule)] border-b border-[var(--rule)]">
                {lesson.steps.map((item, itemIndex) => {
                  const active = !finished && item.id === step.id;
                  const done = visited.has(item.id);
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        aria-current={active ? "step" : undefined}
                        disabled={busy || !progress.ready}
                        onClick={() => go(item)}
                        className={`relative flex min-h-[52px] w-full cursor-pointer items-center justify-between gap-3 px-5 py-3.5 text-left text-sm transition-colors duration-150 disabled:cursor-not-allowed ${
                          active
                            ? "bg-[var(--prussian)] text-[var(--prussian-ink)]"
                            : done
                              ? "bg-[var(--verdigris-tint)] text-[var(--verdigris)] hover:bg-[var(--verdigris)]/15"
                              : "bg-transparent text-[var(--ink-soft)] hover:bg-[var(--vellum)]/80 hover:text-[var(--ink)]"
                        }`}
                      >
                        {active && (
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-0 left-0 w-[3px] bg-[var(--cinnabar)]"
                          />
                        )}
                        <span className="flex items-center gap-3">
                          <span
                            className={`font-mono-score w-5 text-xs ${
                              active
                                ? "font-semibold text-[var(--bronze)]"
                                : done
                                  ? "text-[var(--verdigris)]"
                                  : "text-[var(--ink-muted)]"
                            }`}
                            aria-hidden="true"
                          >
                            {done ? (
                              <IconCheck size={14} />
                            ) : (
                              String(itemIndex + 1).padStart(2, "0")
                            )}
                          </span>
                          <span className={active ? "font-medium" : ""}>
                            <span className="sr-only">Go to </span>
                            {item.title}
                            {done && <span className="sr-only">, done</span>}
                          </span>
                        </span>
                        <span
                          className={`font-mono-score text-[11px] ${
                            active ? "text-[var(--prussian-muted)]" : "text-[var(--ink-muted)]"
                          }`}
                        >
                          {item.minutes}m
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="surface-prussian bg-[var(--prussian)] p-5 text-[var(--prussian-ink)]">
              <p className="font-mono-score mb-1.5 text-[10px] uppercase text-[var(--bronze)]">
                Keep This Artifact
              </p>
              <p className="text-xs leading-relaxed text-[var(--prussian-ink)]/90">
                {lesson.checkpoint}
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* ── HOME SIX-WEEK ARC ── */}
      {home && <CourseArc />}

      {/* ── WEEK 1 NEXT PLATE CALLOUT ── */}
      {!home && (
        <section className="urtext-container pt-14 pb-4">
          <div className="grid items-center gap-6 rounded-[var(--radius-plate)] border border-[var(--rule-mid)] bg-[var(--folio)] p-6 md:grid-cols-[1fr_auto] md:p-8">
            <div className="space-y-1.5">
              <PlateEyebrow index="Next Reference" label="Ready for Week 2’s second chord?" />
              <p className="font-display text-2xl text-[var(--ink)] md:text-3xl">
                Hear how Em moves cleanly into Asus2, C, G, and D.
              </p>
            </div>
            <Magnetic strength={5}>
              <Link
                href="/chords/"
                className="tactile inline-flex min-h-11 items-center gap-2.5 rounded-[var(--radius-control)] border border-[var(--prussian)] bg-[var(--prussian)] px-6 py-2.5 text-sm font-medium text-[var(--prussian-ink)] hover:border-[var(--cobalt)] hover:bg-[var(--cobalt)]"
              >
                <span>Open 10-Chord Library</span>
                <IconArrowRight size={15} />
              </Link>
            </Magnetic>
          </div>
        </section>
      )}
    </div>
  );
}
