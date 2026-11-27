"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, HelpCircle } from "lucide-react";
import { course, lessonHref, type Lesson, type LessonStep } from "../lib/lessons";
import { useLocalValue } from "../lib/local-value";
import { CourseArc } from "./course-arc";
import { HeroStage } from "./hero-stage";
import {
  DownstrokeTrainer,
  EmChord,
  PracticeTimer,
  TapTrainer,
  Tuner,
} from "./practice-tools";
import { Recordings, type Rhythm } from "./recordings";
import { RecordingLink as Link, useRecordingNavigation } from "./recording-navigation";
import { SongWorkbench } from "./song-workbench";

type Progress = { current: string; visited: string[]; finished: boolean };

const emptyProgress: Progress = { current: "", visited: [], finished: false };
const lastLessonKey = "firstsong:v1:last-course-lesson";
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

function getReturnLesson(): { href: string; label: string } | null {
  let recent: string | null = null;
  try {
    recent = localStorage.getItem(lastLessonKey);
  } catch {
    return null;
  }

  const laterLessons = course.slice(1).reverse();
  const lastOpened = laterLessons.find((item) => item.id === recent);
  const candidates = lastOpened ? [lastOpened] : laterLessons;
  for (const item of candidates) {
    let saved = emptyProgress;
    try {
      saved = parseProgress(JSON.parse(localStorage.getItem(`firstsong:v1:lesson:${item.id}`) ?? "null"));
    } catch {
      // A damaged entry should not hide the rest of the learner's progress.
    }
    const hasCheckpoint = item.steps.some((step) => step.id === saved.current);
    if (!hasCheckpoint && item !== lastOpened) continue;
    const action = hasCheckpoint && saved.finished ? "Review" : "Resume";
    const stage = item.id === "weeks-7-8" ? "Weeks 7–8" : item.stage;
    return { href: `${lessonHref(item.id)}#lesson`, label: `${action} ${stage}` };
  }
  return null;
}

export function LessonPlayer({ lesson, home = false }: { lesson: Lesson; home?: boolean }) {
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
  const { setRecording } = useRecordingNavigation();
  const handleRecordingBusy = useCallback((active: boolean) => {
    setBusy(active);
    setRecording(active);
  }, [setRecording]);
  const [returnLesson, setReturnLesson] = useState<ReturnType<typeof getReturnLesson>>(null);

  useEffect(() => {
    if (home) {
      const updateReturnLesson = () => setReturnLesson(getReturnLesson());
      updateReturnLesson();
      window.addEventListener("pageshow", updateReturnLesson);
      window.addEventListener("storage", updateReturnLesson);
      return () => {
        window.removeEventListener("pageshow", updateReturnLesson);
        window.removeEventListener("storage", updateReturnLesson);
      };
    }
    try {
      localStorage.setItem(lastLessonKey, lesson.id);
    } catch {
      // The lesson still works when storage is blocked.
    }
  }, [home, lesson.id]);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusNextRef = useRef(false);

  const progressValue = progress.value;
  const index = Math.max(0, lesson.steps.findIndex((s) => s.id === progressValue.current));
  const step = lesson.steps[index];
  const next = lesson.steps[index + 1];
  const nextLesson = course[course.findIndex((item) => item.id === lesson.id) + 1];
  const finished = progressValue.finished;
  const visited = new Set(
    progressValue.visited.filter((id) => lesson.steps.some((item) => item.id === id))
  );
  const totalMinutes = lesson.steps.reduce((sum, item) => sum + item.minutes, 0);
  const completionRatio = lesson.steps.length > 0 ? visited.size / lesson.steps.length : 0;
  const warning = progress.warning || line.warning || rhythm.warning || weekOneNotes.warning;

  function scrollToBench() {
    const target = document.getElementById("lesson");
    target?.scrollIntoView({ behavior: "auto" });
    window.requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }

  function go(target: LessonStep) {
    if (!progress.ready || busy) return;
    if (target.id === step.id && !finished) {
      headingRef.current?.focus({ preventScroll: true });
      return;
    }
    focusNextRef.current = true;
    progress.save({ ...progressValue, current: target.id, finished: false });
  }

  function advance() {
    if (!progress.ready || busy) return;
    visited.add(step.id);
    focusNextRef.current = true;
    progress.save({
      current: next?.id ?? step.id,
      visited: [...visited],
      finished: !next,
    });
  }

  const ctaLabel = finished
    ? "Review Stage 0"
    : progressValue.current
      ? "Resume Stage 0"
      : "Start Stage 0";

  return (
    <div>
      {/* Screen 1 Opening Stage (Home) OR Clean Architectural Header (Week 1) */}
      {home ? (
        <HeroStage
          ctaLabel={returnLesson?.label ?? ctaLabel}
          ctaHref={returnLesson?.href}
          onStartSession={scrollToBench}
        />
      ) : (
        <section className="pt-10 pb-12 sm:pt-14 sm:pb-16" aria-labelledby="course-lesson-heading">
          <div className="shell-wrap grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-8">
            <div className="lg:col-span-7">
              <p className="type-meta mb-3">
                {lesson.stage} · {totalMinutes} minutes · {lesson.steps.length} steps
              </p>
              <h1 id="course-lesson-heading" className="type-h1 text-[var(--ink)]">
                {lesson.title}
              </h1>
            </div>

            <div className="space-y-3 lg:col-span-5">
              <p className="type-lead max-w-[46ch]">{lesson.objective}</p>
              <p className="text-[14px] text-[var(--muted)]">{lesson.checkpoint}</p>
            </div>
          </div>
        </section>
      )}

      {/* Open Architectural Studio Workbench (Zero nested bordered card wrappers) */}
      <section
        id="lesson"
        aria-labelledby="session-heading"
        className="border-t border-[var(--line)] pt-14 sm:pt-20"
      >
        <div className="shell-wrap">
          <div className="grid gap-6 pb-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <h2 id="session-heading" className="type-h2 text-[var(--ink)]">
                {home ? `${lesson.stage}: ${lesson.title}` : "Practice workbench"}
              </h2>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-4 lg:col-span-5 lg:justify-end">
              <p className="font-mono-num text-[13px] text-[var(--muted)]">
                {visited.size} of {lesson.steps.length} steps done · {totalMinutes} min
              </p>
            </div>
          </div>

          {/* Authored Mobile/Tablet Step Strip (< lg) so steps stay immediately visible */}
          <nav
            aria-label="Session steps"
            className="mb-8 border-y border-[var(--line)] py-3 lg:hidden"
          >
            <div className="flex gap-2 overflow-x-auto pb-1">
              {lesson.steps.map((item, idx) => {
                const active = !finished && item.id === step.id;
                const done = visited.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-current={active ? "step" : undefined}
                    disabled={busy || !progress.ready}
                    onClick={() => go(item)}
                    className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-[var(--r-sm)] border px-3.5 text-[14px] transition-colors duration-150 ${
                      active
                        ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                        : done
                          ? "border-[var(--lock)] text-[var(--lock)]"
                          : "border-[var(--line-strong)] text-[var(--ink-soft)]"
                    }`}
                  >
                    <span className="font-mono-num text-[12px]" aria-hidden="true">
                      {done ? <Check size={13} strokeWidth={1.75} /> : String(idx + 1).padStart(2, "0")}
                    </span>
                    <span>{item.title}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Desktop 12-Col Open Split: Left Index Rail (3 cols) + Right Workbench (8 cols, col-start-5) */}
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Desktop Left Step Rail */}
            <aside className="hidden lg:col-span-3 lg:flex lg:flex-col lg:justify-between" aria-labelledby="outline-heading">
              <div className="space-y-4">
                <div className="flex items-baseline justify-between border-b border-[var(--line)] pb-3">
                  <h3 id="outline-heading" className="text-[14px] font-medium text-[var(--ink)]">
                    Steps
                  </h3>
                  <span className="font-mono-num text-[13px] text-[var(--muted)]">
                    {visited.size}/{lesson.steps.length}
                  </span>
                </div>

                {/* Pure GPU scaleX progress bar */}
                <div className="h-[2px] w-full overflow-hidden bg-[var(--line)]" aria-hidden="true">
                  <div
                    className="h-full w-full origin-left bg-[var(--lock)] transition-transform duration-300 ease-[var(--ease-enter)]"
                    style={{ transform: `scale3d(${completionRatio.toFixed(4)}, 1, 1)` }}
                  />
                </div>

                <ol className="m-0 list-none divide-y divide-[var(--line)] p-0">
                  {lesson.steps.map((item, idx) => {
                    const active = !finished && item.id === step.id;
                    const done = visited.has(item.id);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-current={active ? "step" : undefined}
                          disabled={busy || !progress.ready}
                          onClick={() => go(item)}
                          className={`relative flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 py-3 pl-3 pr-1 text-left text-[14px] transition-colors duration-150 disabled:cursor-not-allowed ${
                            active
                              ? "font-medium text-[var(--ink)]"
                              : done
                                ? "text-[var(--ink-soft)] hover:text-[var(--ink)]"
                                : "text-[var(--muted)] hover:text-[var(--ink)]"
                          }`}
                        >
                          {active && (
                            <span
                              aria-hidden="true"
                              className="absolute inset-y-2 left-0 w-[2px] bg-[var(--accent)]"
                            />
                          )}
                          <span className="flex items-center gap-3">
                            <span
                              aria-hidden="true"
                              className={`font-mono-num w-5 text-[12px] ${
                                done ? "text-[var(--lock)]" : active ? "text-[var(--accent)]" : "text-[var(--muted)]"
                              }`}
                            >
                              {done ? <Check size={14} strokeWidth={1.75} /> : String(idx + 1).padStart(2, "0")}
                            </span>
                            <span>
                              <span className="sr-only">Go to </span>
                              {item.title}
                              {done && <span className="sr-only">, done</span>}
                            </span>
                          </span>
                          <span className="font-mono-num text-[12px] text-[var(--muted)]">
                            {item.minutes}m
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="mt-10 border-t border-[var(--line)] pt-5">
                <p className="text-[13px] font-medium text-[var(--ink)]">Keep from this session</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">
                  {lesson.checkpoint}
                </p>
              </div>
            </aside>

            {/* Active Step Open Work Surface */}
            <div className="flex flex-col justify-between lg:col-span-8 lg:col-start-5">
              <div key={finished ? "complete" : step.id} className="roll-enter space-y-6">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-mono-num text-[13px] text-[var(--accent)]">
                    {finished
                      ? visited.size === lesson.steps.length ? "Session complete" : "Session checkpoint"
                      : `Step ${index + 1} of ${lesson.steps.length} · ${step.minutes} min`}
                  </span>
                </div>

                <h3
                  tabIndex={-1}
                  ref={(el) => {
                    headingRef.current = el;
                    if (el && focusNextRef.current) {
                      focusNextRef.current = false;
                      el.focus({ preventScroll: true });
                      window.requestAnimationFrame(() => {
                        const bounds = el.getBoundingClientRect();
                        if (bounds.top < 80 || bounds.bottom > window.innerHeight - 24) {
                          el.scrollIntoView({ block: "center", behavior: "auto" });
                        }
                      });
                    }
                  }}
                  className="type-h2 text-[var(--ink)] outline-none"
                >
                  {finished
                    ? home
                      ? "Your first hook checkpoint"
                      : `${lesson.stage} checkpoint`
                    : step.title}
                </h3>

                {finished ? (
                  <div className="space-y-6">
                    <p className="max-w-[58ch] text-[16px] leading-relaxed text-[var(--ink-soft)]">
                      {lesson.checkpoint}
                    </p>
                    {home && (
                      <Recordings
                        mode="hook"
                        line={line.value}
                        rhythm={rhythm.value}
                        onRhythm={rhythm.save}
                        onBusy={handleRecordingBusy}
                      />
                    )}
                    {!home && <SongWorkbench lessonId={lesson.id} stepId="checkpoint" />}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="max-w-[60ch] text-[16px] leading-relaxed text-[var(--ink-soft)]">
                      {step.instruction}
                    </p>

                    {step.kind === "tune" && <Tuner />}
                    {step.kind === "tap" && <TapTrainer />}
                    {step.kind === "chord" && <EmChord />}

                    {step.kind === "write" && (
                      <div className="space-y-4 border-y border-[var(--line)] py-6">
                        <div className="flex items-baseline justify-between gap-4">
                          <label htmlFor="hook-line" className="text-[14px] font-medium text-[var(--ink)]">
                            Your concrete line
                          </label>
                          <span className="font-mono-num text-[13px] text-[var(--muted)]">
                            {line.value.length}/{maxLineLength}
                          </span>
                        </div>
                        <p className="text-[14px] text-[var(--muted)]" id="line-hint">
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
                          placeholder="Write one sentence you would actually say out loud"
                          className="w-full rounded-[var(--r-sm)] border border-[var(--line-strong)] bg-[var(--surface)] p-4 text-[16px] text-[var(--ink)] placeholder:text-[var(--muted)] focus:border-[var(--ink)] focus:bg-[var(--bg)]"
                        />
                        {line.value.trim() && (
                          <div className="border-l-2 border-[var(--ink)] pl-4 pt-1">
                            <p className="text-[13px] text-[var(--muted)]">Saved line</p>
                            <p className="mt-1 text-[22px] leading-snug tracking-[-0.02em] text-[var(--ink)]">
                              “{line.value.trim()}”
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {(step.kind === "compare" || step.kind === "hook") && (
                      <div className="space-y-5">
                        {line.value.trim() && (
                          <blockquote className="m-0 border-l-2 border-[var(--accent)] pl-5 text-[22px] leading-snug tracking-[-0.02em] text-[var(--ink)]">
                            “{line.value}”
                          </blockquote>
                        )}
                        <Recordings
                          mode={step.kind}
                          line={line.value}
                          rhythm={rhythm.value}
                          onRhythm={rhythm.save}
                          onBusy={handleRecordingBusy}
                        />
                      </div>
                    )}

                    {step.kind === "drill" && (
                      <div className="space-y-6">
                        <EmChord />
                        <DownstrokeTrainer />
                      </div>
                    )}

                    {step.kind === "practice" && (
                      <SongWorkbench lessonId={lesson.id} stepId={step.id} firstLine={line.value}
                        oldNotes={weekOneNotes.value} onBusy={handleRecordingBusy} />
                    )}

                    <PracticeTimer minutes={step.minutes} />

                    {step.tip && (
                      <details className="ledger-disclosure border-t border-[var(--line)] pt-4">
                        <summary className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-[14px] font-medium text-[var(--ink-soft)] hover:text-[var(--ink)]">
                          <HelpCircle size={15} strokeWidth={1.5} className="text-[var(--accent)]" aria-hidden="true" />
                          <span>Stuck? Read a quick fix</span>
                        </summary>
                        <p className="mt-2 max-w-[58ch] text-[14px] leading-relaxed text-[var(--muted)]">
                          {step.tip}
                        </p>
                      </details>
                    )}
                  </div>
                )}

                {warning && (
                  <p className="text-[13px] text-[var(--accent)]" role="status">
                    {warning}
                  </p>
                )}
              </div>

              {/* Step Action Bar */}
              <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-6">
                <button
                  type="button"
                  disabled={busy || !progress.ready || (!finished && index === 0)}
                  onClick={() => go(finished ? step : lesson.steps[Math.max(0, index - 1)])}
                  className="btn-secondary"
                >
                  <ArrowLeft size={15} strokeWidth={1.5} aria-hidden="true" />
                  <span>{finished ? "Review last step" : "Previous step"}</span>
                </button>

                {finished ? (
                  <Link href={nextLesson ? lessonHref(nextLesson.id) : "/songbook/"} className="btn-primary">
                    <span>{nextLesson ? `Continue to ${nextLesson.stage}` : "Open your songbook"}</span>
                    <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={busy || !progress.ready}
                    onClick={advance}
                    className="btn-primary"
                  >
                    <span>
                      {next ? "Next step" : `Finish ${lesson.stage}`}
                    </span>
                    <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Six-Week Ledger (Home) OR Next Step Band (Week 1) */}
      {home ? (
        <CourseArc />
      ) : (
        <section className="mt-20 border-t border-[var(--line)] pt-12">
          <div className="shell-wrap flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="type-meta">Your recordings and lyrics</p>
              <h2 className="type-h3 text-[var(--ink)]">
                Return to the song you’re making
              </h2>
            </div>
            <Link href="/songbook/" className="btn-secondary w-full sm:w-auto">
              <span>Open your songbook</span>
              <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
