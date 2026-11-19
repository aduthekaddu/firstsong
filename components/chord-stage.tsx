"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chords, guitarStrings, type Chord } from "../lib/chords";
import { fretHz, openAudio, pluckString, strumChord } from "../lib/sound";
import { ticker } from "../lib/ticker";
import { IconPlay, IconStop, IconVolume } from "./icons";
import { useMotionSystem } from "./motion-provider";

const PROGRESSIONS = [
  { id: "week2", label: "Week 2 verse", sequence: ["Em", "Asus2", "Em", "Asus2"] },
  { id: "classic", label: "Four-chord folk", sequence: ["Em", "C", "G", "D"] },
  { id: "minor", label: "Minor ballad", sequence: ["Am", "Dm", "E", "Am"] },
] as const;

const STRING_Y_PCT = [16, 29.6, 43.2, 56.8, 70.4, 84] as const;
const STRING_THICKNESS = [2.7, 2.35, 2.0, 1.7, 1.4, 1.15] as const;

function getFingerMap(chord: Chord): Record<1 | 2 | 3, { fret: number; stringIdx: number } | null> {
  const out: Record<1 | 2 | 3, { fret: number; stringIdx: number } | null> = { 1: null, 2: null, 3: null };
  chord.strings.forEach((pos, stringIdx) => {
    if (typeof pos === "object") {
      const [fret, finger] = pos;
      if (finger === 1 || finger === 2 || finger === 3) {
        out[finger] = { fret, stringIdx };
      }
    }
  });
  return out;
}

/**
 * Interactive Morphing Chord Progression Stage for /chords/:
 * Watch finger dots spring-glide across a live Prussian fretboard while hearing
 * real acoustic strums across any of the 10 open chords or 3 curriculum progressions.
 */
export function ChordStage() {
  const { reducedMotion } = useMotionSystem();
  const [selectedProgId, setSelectedProgId] = useState<string>("week2");
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [focusedChordName, setFocusedChordName] = useState<string>("Em");

  const boardRef = useRef<HTMLDivElement | null>(null);
  const spindleRefs = useRef<Array<SVGSVGElement | null>>([]);
  const waveRefs = useRef<Array<SVGSVGElement | null>>([]);
  const dotRefs = useRef<Record<1 | 2 | 3, HTMLDivElement | null>>({ 1: null, 2: null, 3: null });

  const audioRef = useRef<AudioContext | null>(null);
  const timersRef = useRef<number[]>([]);
  const runRef = useRef(0);
  const boardSizeRef = useRef({ w: 680, h: 248 });
  const unsubRef = useRef<(() => void) | null>(null);
  const dotsDirtyRef = useRef(true);
  const chordRef = useRef<Chord>(chords[0]);

  const strPhys = useRef(
    guitarStrings.map((_, i) => ({
      amp: 0,
      phase: 0,
      omega: (34 - i * 2.5) * Math.PI * 2,
      decay: 2.5 + i * 0.2,
    }))
  );

  const fingerPos = useRef<Record<1 | 2 | 3, { x: number; y: number; o: number }>>({
    1: { x: 40, y: STRING_Y_PCT[1], o: 0 },
    2: { x: 40, y: STRING_Y_PCT[1], o: 1 },
    3: { x: 40, y: STRING_Y_PCT[2], o: 1 },
  });

  const currentProg = PROGRESSIONS.find((p) => p.id === selectedProgId) ?? PROGRESSIONS[0];
  const focusedChord = chords.find((c) => c.name === focusedChordName) ?? chords[0];
  chordRef.current = focusedChord;

  const fretPctX = (fret: number) => 16 + (fret - 0.5) * 20;

  const ensureTicker = useCallback(() => {
    if (unsubRef.current) return;
    unsubRef.current = ticker.subscribe((_now, dt) => {
      let anyActive = false;

      for (let i = 0; i < 6; i++) {
        const s = strPhys.current[i];
        const sp = spindleRefs.current[i];
        const wv = waveRefs.current[i];
        if (!sp || !wv) continue;
        if (s.amp > 0.015) {
          anyActive = true;
          s.phase += s.omega * dt;
          s.amp *= Math.exp(-s.decay * dt);
          if (s.amp <= 0.015) {
            s.amp = 0;
            sp.style.transform = "scale3d(1, 0, 1)";
            sp.style.opacity = "0";
            wv.style.transform = "scale3d(1, 0, 1)";
            wv.style.opacity = "0";
          } else {
            const osc = Math.sin(s.phase) * s.amp;
            sp.style.transform = `scale3d(1, ${s.amp.toFixed(3)}, 1)`;
            sp.style.opacity = Math.min(1, s.amp * 1.1).toFixed(3);
            wv.style.transform = `scale3d(1, ${osc.toFixed(3)}, 1)`;
            wv.style.opacity = Math.min(1, s.amp * 1.4).toFixed(3);
          }
        }
      }

      if (dotsDirtyRef.current) {
        const { w, h } = boardSizeRef.current;
        const targets = getFingerMap(chordRef.current);
        const lerp = reducedMotion ? 1 : 1 - Math.exp(-15 * dt);
        let stillMoving = false;

        ([1, 2, 3] as const).forEach((k) => {
          const el = dotRefs.current[k];
          if (!el) return;
          const tgt = targets[k];
          const cur = fingerPos.current[k];
          const tx = tgt ? fretPctX(tgt.fret) : cur.x;
          const ty = tgt ? STRING_Y_PCT[tgt.stringIdx] : cur.y;
          const to = tgt ? 1 : 0;
          const dx = tx - cur.x;
          const dy = ty - cur.y;
          const do_ = to - cur.o;
          if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05 || Math.abs(do_) > 0.008) {
            stillMoving = true;
            cur.x += dx * lerp;
            cur.y += dy * lerp;
            cur.o += do_ * lerp;
            const px = (cur.x / 100) * w;
            const py = (cur.y / 100) * h;
            const sc = 0.65 + 0.35 * cur.o;
            el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(${sc.toFixed(3)})`;
            el.style.opacity = cur.o.toFixed(3);
          } else {
            cur.x = tx;
            cur.y = ty;
            cur.o = to;
            const px = (cur.x / 100) * w;
            const py = (cur.y / 100) * h;
            const sc = 0.65 + 0.35 * cur.o;
            el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(${sc.toFixed(3)})`;
            el.style.opacity = cur.o.toFixed(3);
          }
        });

        dotsDirtyRef.current = stillMoving;
        if (stillMoving) anyActive = true;
      }

      if (!anyActive && unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    });
  }, [reducedMotion]);

  const exciteChord = useCallback(
    (chord: Chord) => {
      if (reducedMotion) return;
      chord.strings.forEach((pos, i) => {
        if (pos === "x") return;
        strPhys.current[i].amp = 0.92 - i * 0.05;
        strPhys.current[i].phase = i * 0.3;
      });
      ensureTicker();
    },
    [ensureTicker, reducedMotion]
  );

  const stop = useCallback(() => {
    runRef.current++;
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
    setActiveSlot(null);
  }, []);

  useEffect(() => {
    dotsDirtyRef.current = true;
    ensureTicker();
  }, [focusedChordName, ensureTicker]);

  useEffect(() => {
    const onResize = () => {
      if (boardRef.current) {
        boardSizeRef.current = {
          w: boardRef.current.clientWidth || 680,
          h: boardRef.current.clientHeight || 248,
        };
      }
      dotsDirtyRef.current = true;
      ensureTicker();
    };
    onResize();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      stop();
      window.removeEventListener("resize", onResize);
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [ensureTicker, stop]);

  async function auditionChord(chord: Chord) {
    setFocusedChordName(chord.name);
    exciteChord(chord);
    try {
      const ctx = await openAudio(audioRef.current);
      audioRef.current = ctx;
      strumChord({ context: ctx, chord, spreadSeconds: 0.04 });
    } catch {
      // Ignore audio block
    }
  }

  async function togglePlay() {
    if (activeSlot !== null) {
      stop();
      return;
    }
    const id = ++runRef.current;
    try {
      const ctx = await openAudio(audioRef.current);
      audioRef.current = ctx;
      const stepMs = 1450;

      currentProg.sequence.forEach((name, idx) => {
        const timer = window.setTimeout(() => {
          if (id !== runRef.current) return;
          const chord = chords.find((c) => c.name === name);
          if (!chord) return;
          setActiveSlot(idx);
          setFocusedChordName(chord.name);
          exciteChord(chord);
          strumChord({ context: ctx, chord, spreadSeconds: 0.04 });
        }, idx * stepMs);
        timersRef.current.push(timer);
      });

      const endTimer = window.setTimeout(() => {
        if (id === runRef.current) setActiveSlot(null);
      }, currentProg.sequence.length * stepMs);
      timersRef.current.push(endTimer);
    } catch {
      setActiveSlot(null);
    }
  }

  return (
    <section
      aria-label="Hear chord progressions on live fretboard"
      className="grid overflow-hidden rounded-[var(--radius-plate)] border border-[var(--prussian)] bg-[var(--folio)] lg:grid-cols-12"
    >
      {/* Left Progression Controls (5 cols) */}
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--rule)] p-6 md:p-8 lg:col-span-5 lg:border-b-0 lg:border-r">
        <div className="space-y-4">
          <p className="font-mono-score text-[11px] font-medium uppercase text-[var(--cobalt)]">
            Progression Audition
          </p>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose progression">
            {PROGRESSIONS.map((prog) => {
              const active = prog.id === currentProg.id;
              return (
                <button
                  key={prog.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    stop();
                    setSelectedProgId(prog.id);
                    setFocusedChordName(prog.sequence[0]);
                  }}
                  className={`tactile font-mono-score min-h-9 cursor-pointer rounded-[var(--radius-control)] border px-3 py-1.5 text-[11px] ${
                    active
                      ? "border-[var(--prussian)] bg-[var(--prussian)] text-[var(--prussian-ink)]"
                      : "border-[var(--rule-mid)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--prussian)]"
                  }`}
                >
                  {prog.label}
                </button>
              );
            })}
          </div>

          {/* 4 Measure Slots */}
          <div className="grid grid-cols-4 gap-2 pt-2" aria-label="Chord progression sequence">
            {currentProg.sequence.map((name, idx) => {
              const playingHere = activeSlot === idx;
              const chordObj = chords.find((c) => c.name === name);
              return (
                <button
                  key={`${name}-${idx}`}
                  type="button"
                  onClick={() => {
                    stop();
                    if (chordObj) void auditionChord(chordObj);
                  }}
                  className={`tactile flex h-16 cursor-pointer flex-col items-center justify-center rounded-[var(--radius-control)] border ${
                    playingHere
                      ? "beat-hit border-[var(--cinnabar)] bg-[var(--cinnabar)] text-[var(--folio)]"
                      : focusedChordName === name && activeSlot === null
                        ? "border-[var(--cobalt)] bg-[var(--cobalt-tint)] text-[var(--prussian)]"
                        : "border-[var(--rule-mid)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--prussian)]"
                  }`}
                >
                  <span className="font-mono-score text-[9px] uppercase opacity-70">
                    Bar 0{idx + 1}
                  </span>
                  <span className="font-display text-2xl leading-none">{name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--rule)] pt-5">
          <button
            type="button"
            onClick={() => void togglePlay()}
            className={`tactile font-mono-score inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-control)] border px-5 py-2.5 text-xs uppercase ${
              activeSlot !== null
                ? "border-[var(--cinnabar)] bg-[var(--cinnabar)] text-[var(--folio)]"
                : "border-[var(--prussian)] bg-[var(--prussian)] text-[var(--prussian-ink)] hover:border-[var(--cobalt)] hover:bg-[var(--cobalt)]"
            }`}
          >
            {activeSlot !== null ? <IconStop size={12} /> : <IconPlay size={13} />}
            <span>{activeSlot !== null ? "Stop progression" : "Play 4-bar progression"}</span>
          </button>

          <button
            type="button"
            onClick={() => void auditionChord(focusedChord)}
            className="tactile font-mono-score inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--rule-mid)] bg-[var(--paper)] px-4 py-2.5 text-xs uppercase text-[var(--ink)] hover:border-[var(--prussian)]"
          >
            <IconVolume size={13} />
            <span>Strum {focusedChord.name}</span>
          </button>
        </div>
      </div>

      {/* Right Live Prussian Morphing Neck (7 cols) */}
      <div className="surface-prussian flex flex-col justify-between bg-[var(--prussian)] lg:col-span-7">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-3">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl text-[var(--prussian-ink)]">
              {focusedChord.name}
            </span>
            <span className="font-mono-score text-[11px] uppercase text-[var(--bronze)]">
              {focusedChord.fullName}
            </span>
          </div>
          <span className="font-mono-score text-[10px] uppercase text-[var(--prussian-muted)]">
            Click any string to pluck
          </span>
        </div>

        <div
          ref={boardRef}
          className="relative h-[248px] w-full overflow-hidden"
          style={{ contain: "strict" }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-4 left-[16%] w-[5px] bg-[var(--paper)]/90"
          />
          {["I", "II", "III", "IV"].map((roman, fIdx) => (
            <div key={roman} aria-hidden="true">
              <div
                className="pointer-events-none absolute inset-y-4 w-px bg-white/15"
                style={{ left: `${16 + (fIdx + 1) * 20}%` }}
              />
              <span
                className="font-mono-score pointer-events-none absolute bottom-1.5 -translate-x-1/2 text-[10px] text-[var(--prussian-muted)]"
                style={{ left: `${16 + (fIdx + 0.5) * 20}%` }}
              >
                {roman}
              </span>
            </div>
          ))}

          {guitarStrings.map((str, idx) => {
            const pos = focusedChord.strings[idx];
            const isMuted = pos === "x";
            const isOpen = pos === 0;
            const thick = STRING_THICKNESS[idx];
            return (
              <div
                key={str.name}
                className="absolute inset-x-0 h-[38px] -translate-y-1/2"
                style={{ top: `${STRING_Y_PCT[idx]}%` }}
              >
                <span className="font-mono-score pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[10px] text-[var(--prussian-muted)]">
                  {str.name}
                </span>
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-[11.5%] top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                >
                  {isOpen && (
                    <span className="h-2.5 w-2.5 rounded-full border-[1.8px] border-[var(--bronze)]" />
                  )}
                  {isMuted && (
                    <span className="font-mono-score text-xs text-[var(--prussian-muted)]/75">×</span>
                  )}
                </span>
                <div className="pointer-events-none absolute inset-y-0 left-[16%] right-4">
                  <svg
                    ref={(el) => {
                      spindleRefs.current[idx] = el;
                    }}
                    aria-hidden="true"
                    viewBox="0 0 800 38"
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full"
                    style={{ transform: "scale3d(1, 0, 1)", opacity: 0 }}
                  >
                    <path
                      d="M 0 19 Q 400 2 800 19 Q 400 36 0 19 Z"
                      fill="rgba(229, 130, 82, 0.34)"
                    />
                  </svg>
                  <div
                    className="absolute inset-x-0 top-1/2 -translate-y-1/2"
                    style={{
                      height: `${thick}px`,
                      backgroundColor: isMuted
                        ? "rgba(245, 243, 236, 0.16)"
                        : idx < 4
                          ? "var(--bronze)"
                          : "rgba(244, 242, 235, 0.85)",
                    }}
                  />
                  <svg
                    ref={(el) => {
                      waveRefs.current[idx] = el;
                    }}
                    aria-hidden="true"
                    viewBox="0 0 800 38"
                    preserveAspectRatio="none"
                    className="absolute inset-0 h-full w-full"
                    style={{ transform: "scale3d(1, 0, 1)", opacity: 0 }}
                  >
                    <path
                      d="M 0 19 Q 400 4 800 19"
                      fill="none"
                      stroke="#f79f72"
                      strokeWidth={Math.max(1.5, thick)}
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>
                {!isMuted && (
                  <button
                    type="button"
                    aria-label={`Pluck ${str.label} in ${focusedChord.name}`}
                    onClick={async () => {
                      const fret = pos === 0 ? 0 : pos[0];
                      strPhys.current[idx].amp = 0.95;
                      strPhys.current[idx].phase = 0;
                      ensureTicker();
                      try {
                        const ctx = await openAudio(audioRef.current);
                        audioRef.current = ctx;
                        pluckString({ context: ctx, hz: fretHz(idx, fret), volume: 0.22 });
                      } catch {
                        // Ignore audio block
                      }
                    }}
                    className="absolute inset-y-0 left-[16%] right-4 cursor-pointer bg-transparent"
                  />
                )}
              </div>
            );
          })}

          {([1, 2, 3] as const).map((finger) => (
            <div
              key={finger}
              ref={(el) => {
                dotRefs.current[finger] = el;
              }}
              aria-hidden="true"
              className="font-mono-score pointer-events-none absolute left-0 top-0 -ml-4 -mt-4 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--folio)] bg-[var(--cinnabar)] text-xs font-bold text-[var(--folio)]"
              style={{ opacity: 0, transform: "translate3d(0, 0, 0) scale(0.7)" }}
            >
              {finger}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
