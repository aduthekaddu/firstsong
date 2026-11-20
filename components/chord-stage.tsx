"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Grid2X2, Orbit, Play, Square, Volume2 } from "lucide-react";
import { chords, guitarStrings, type Chord } from "../lib/chords";
import { openAudio, strumChord } from "../lib/sound";
import { ChordDiagram, describeChord } from "./chord-diagram";
import { OrbitalChordWheel } from "./orbital-wheel";
import { WebGLStrings, type WebGLStringsHandle } from "./webgl-strings";

const PROGRESSIONS = [
  { id: "stage-0", label: "Em → Asus2 → C → G", chords: ["Em", "Asus2", "C", "G"] },
  { id: "folk", label: "G → D → Em → C", chords: ["G", "D", "Em", "C"] },
  { id: "minor", label: "Am → C → G → D", chords: ["Am", "C", "G", "D"] },
  { id: "turnaround", label: "D → A → Em → G", chords: ["D", "A", "Em", "G"] },
] as const;

const FINGER_TEXT = ["", "Index (1)", "Middle (2)", "Ring (3)", "Pinky (4)"] as const;

export function ChordStage() {
  const [view, setView] = useState<"orbit" | "grid">("orbit");
  const [activeIndex, setActiveIndex] = useState(0);
  const [progId, setProgId] = useState<string>(PROGRESSIONS[0].id);
  const [playingProg, setPlayingProg] = useState(false);
  const [progStep, setProgStep] = useState(-1);
  const [statusLine, setStatusLine] = useState("");

  const neckRef = useRef<WebGLStringsHandle>(null);
  const timersRef = useRef<number[]>([]);

  const activeChord = chords[activeIndex] ?? chords[0];
  const currentProg = PROGRESSIONS.find((p) => p.id === progId) ?? PROGRESSIONS[0];

  const stopProgression = useCallback(() => {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    setPlayingProg(false);
    setProgStep(-1);
  }, []);

  useEffect(() => () => stopProgression(), [stopProgression]);

  const handleSelectChord = useCallback(
    (idx: number, shouldAudition = true) => {
      stopProgression();
      const safe = ((idx % chords.length) + chords.length) % chords.length;
      setActiveIndex(safe);
      const chosen = chords[safe];
      setStatusLine(`${chosen.name} (${chosen.fullName})`);
      if (shouldAudition) {
        if (neckRef.current) {
          neckRef.current.strum(chosen);
        } else {
          void openAudio()
            .then((ctx) => strumChord({ context: ctx, chord: chosen }))
            .catch(() => {});
        }
      }
    },
    [stopProgression]
  );

  const handleStrum = useCallback((chord: Chord) => {
    if (neckRef.current) {
      neckRef.current.strum(chord);
    } else {
      void openAudio()
        .then((ctx) => strumChord({ context: ctx, chord }))
        .catch(() => {});
    }
  }, []);

  function toggleProgression() {
    if (playingProg) {
      stopProgression();
      return;
    }

    setPlayingProg(true);
    const beatMs = 1500;

    currentProg.chords.forEach((name, stepIdx) => {
      const t = window.setTimeout(() => {
        const chordIdx = chords.findIndex((c) => c.name === name);
        if (chordIdx !== -1) {
          setActiveIndex(chordIdx);
          setProgStep(stepIdx);
          const c = chords[chordIdx];
          setStatusLine(`Playing ${currentProg.label} · bar ${stepIdx + 1} (${c.name})`);
          if (neckRef.current) {
            neckRef.current.strum(c);
          } else {
            void openAudio()
              .then((ctx) => strumChord({ context: ctx, chord: c }))
              .catch(() => {});
          }
        }
      }, stepIdx * beatMs);
      timersRef.current.push(t);
    });

    const endTimer = window.setTimeout(() => {
      setPlayingProg(false);
      setProgStep(-1);
      timersRef.current = [];
    }, currentProg.chords.length * beatMs + 300);
    timersRef.current.push(endTimer);
  }

  // Keyboard arrow rotation in Orbit view
  useEffect(() => {
    if (view !== "orbit") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector("dialog[open]")) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleSelectChord(activeIndex + 1, true);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleSelectChord(activeIndex - 1, true);
      } else if (event.key >= "1" && event.key <= "6") {
        neckRef.current?.pluck(Number(event.key) - 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, handleSelectChord, view]);

  return (
    <div className="pt-10 pb-8 sm:pt-14">
      <div className="shell-wrap space-y-10">
        {/* Top Architectural Header + Orbit/Grid Toggle */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <div className="space-y-3 lg:col-span-7">
            <h1 className="type-h1 text-[var(--ink)]">Ten open chords</h1>
            <p className="type-lead max-w-[48ch]">
              Rotate the wheel or switch to the full sheet. Click any string to audition its pitch, or hear how four-bar progressions move between shapes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:col-span-5 lg:justify-end">
            <div
              role="group"
              aria-label="Chord display layout"
              className="inline-flex rounded-[var(--r-sm)] border border-[var(--line-strong)] p-1"
            >
              <button
                type="button"
                aria-pressed={view === "orbit"}
                onClick={() => setView("orbit")}
                className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[3px] px-3.5 text-[14px] font-medium transition-colors duration-150 ${
                  view === "orbit"
                    ? "bg-[var(--ink)] text-[var(--bg)]"
                    : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
                }`}
              >
                <Orbit size={15} strokeWidth={1.5} aria-hidden="true" />
                <span>Orbit</span>
              </button>
              <button
                type="button"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
                className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[3px] px-3.5 text-[14px] font-medium transition-colors duration-150 ${
                  view === "grid"
                    ? "bg-[var(--ink)] text-[var(--bg)]"
                    : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
                }`}
              >
                <Grid2X2 size={15} strokeWidth={1.5} aria-hidden="true" />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* Four-Bar Progression Audition Bar (Borderless Hairline Strip) */}
        <div className="flex flex-col gap-4 border-y border-[var(--line)] py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Chord progressions">
            {PROGRESSIONS.map((prog) => {
              const selected = prog.id === progId;
              return (
                <button
                  key={prog.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    stopProgression();
                    setProgId(prog.id);
                  }}
                  className={`font-mono-num min-h-11 cursor-pointer rounded-[var(--r-sm)] border px-3.5 text-[13px] transition-colors duration-150 ${
                    selected
                      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                      : "border-[var(--line-strong)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                  }`}
                >
                  {prog.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            {playingProg && progStep >= 0 && (
              <span className="font-mono-num text-[13px] text-[var(--accent)]" role="status">
                Bar {progStep + 1} / 4 · {currentProg.chords[progStep]}
              </span>
            )}
            <button
              type="button"
              onClick={toggleProgression}
              data-tone={playingProg ? "accent" : undefined}
              className="btn-primary w-full sm:w-auto"
            >
              {playingProg ? (
                <Square size={13} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <Play size={14} strokeWidth={1.5} aria-hidden="true" />
              )}
              <span>{playingProg ? "Stop progression" : "Play progression"}</span>
            </button>
          </div>
        </div>

        {/* ORBIT MODE: Vitra 10-Chord Wheel + Precision Diagram + Live WebGL Neck */}
        {view === "orbit" ? (
          <div className="space-y-10">
            <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="min-w-0 lg:col-span-6">
                <OrbitalChordWheel
                  items={chords}
                  activeIndex={activeIndex}
                  onSelect={handleSelectChord}
                  onStrum={handleStrum}
                  size="stage"
                />
              </div>

              <div className="min-w-0 space-y-6 border-t border-[var(--line)] pt-8 lg:col-span-6 lg:border-t-0 lg:border-l lg:pl-12 lg:pt-0">
                <div className="grid items-center gap-8 sm:grid-cols-[auto_1fr]">
                  <ChordDiagram chord={activeChord} showStrum />

                  <div className="space-y-4">
                    <div key={activeChord.name} className="roll-enter space-y-1">
                      <h2 className="type-h2 text-[var(--ink)]">{activeChord.name}</h2>
                      <p className="text-[15px] text-[var(--muted)]">{activeChord.fullName}</p>
                    </div>

                    <dl className="m-0 divide-y divide-[var(--line)] border-t border-[var(--line)] text-[14px]">
                      {activeChord.strings.map((pos, idx) => (
                        <div
                          key={guitarStrings[idx].name}
                          className="flex items-baseline justify-between gap-4 py-2"
                        >
                          <dt className="font-mono-num text-[13px] text-[var(--muted)]">
                            {guitarStrings[idx].label} ({guitarStrings[idx].name})
                          </dt>
                          <dd className="m-0 text-[var(--ink)]">
                            {pos === "x"
                              ? "Muted"
                              : pos === 0
                                ? "Open"
                                : `Fret ${pos[0]} · ${FINGER_TEXT[pos[1]]}`}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Playable WebGL Neck synchronized with the selected chord */}
            <div className="space-y-3">
              <WebGLStrings
                ref={neckRef}
                chord={activeChord}
                compact
                onNoteSounded={setStatusLine}
              />
              <div className="flex flex-wrap items-center justify-between gap-4 text-[13px] text-[var(--muted)]">
                <span className="font-mono-num">
                  Click or swipe across strings · ← → rotate wheel · 1–6 pluck
                </span>
                <span className="font-mono-num text-[var(--ink-soft)]" role="status">
                  {statusLine || `${activeChord.name} · ${activeChord.fullName}`}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* GRID MODE: Full 10-Chord Hairline Reference Sheet */
          <div className="grid border-t border-[var(--line)] sm:grid-cols-2 lg:grid-cols-5">
            {chords.map((chord, idx) => (
              <article
                key={chord.name}
                className="flex flex-col items-center justify-between gap-4 border-b border-[var(--line)] px-4 py-8 sm:odd:border-r lg:border-r lg:[&:nth-child(5n)]:border-r-0"
              >
                <div className="w-full flex items-baseline justify-between gap-2">
                  <h2 className="text-[22px] font-normal tracking-[-0.03em] text-[var(--ink)]">
                    {chord.name}
                  </h2>
                  <span className="font-mono-num text-[12px] text-[var(--muted)]">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>

                <ChordDiagram chord={chord} compact />

                <div className="w-full space-y-3">
                  <p className="text-center text-[13px] text-[var(--muted)]">
                    {chord.fullName}
                  </p>
                  <p className="sr-only">{describeChord(chord)}</p>
                  <button
                    type="button"
                    onClick={() => handleStrum(chord)}
                    className="btn-secondary w-full min-h-11 text-[13px]"
                    aria-label={`Strum ${chord.fullName}`}
                  >
                    <Volume2 size={14} strokeWidth={1.5} aria-hidden="true" />
                    <span>Strum {chord.name}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
