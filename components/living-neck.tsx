"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chords, guitarStrings, type Chord } from "../lib/chords";
import { fretHz, openAudio, pluckString, strumChord } from "../lib/sound";
import { ticker } from "../lib/ticker";
import { IconVolume } from "./icons";
import { useMotionSystem } from "./motion-provider";

const OPEN_CHORD: Chord = {
  name: "Open",
  fullName: "Six open strings",
  strings: [0, 0, 0, 0, 0, 0],
};

const STAGE_CHORDS: readonly Chord[] = [
  chords[0], // Em
  chords[1], // Asus2
  chords[2], // C
  chords[3], // G
  chords[4], // D
  OPEN_CHORD,
];

const FRET_ROMAN = ["I", "II", "III", "IV"] as const;
const STRING_THICKNESS = [2.9, 2.5, 2.15, 1.8, 1.45, 1.2] as const;
const STRING_Y_PCT = [16, 29.6, 43.2, 56.8, 70.4, 84] as const;

type StringPhysics = {
  amp: number;
  phase: number;
  omega: number;
  decay: number;
  lastPluck: number;
};

type FingerPos = { x: number; y: number; o: number };

function getFingerTargets(chord: Chord): Record<1 | 2 | 3, { fret: number; stringIdx: number } | null> {
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
 * Signature Full-Bleed Playable 6-String Acoustic Stage.
 * - Pure GPU-compositor standing-wave strings (static SVG paths animated strictly via scale3d + opacity)
 * - Spring-gliding cinnabar finger dots (translate3d + opacity)
 * - Pointer-velocity coupled swiping across all 6 strings with warm Web Audio synthesis
 * - Pauses automatically when offscreen via IntersectionObserver and idle-stops ticker
 */
export function LivingNeck() {
  const { reducedMotion } = useMotionSystem();
  const [selectedName, setSelectedName] = useState("Em");
  const [entered, setEntered] = useState(false);
  const [readout, setReadout] = useState("Swipe vertically across strings or click to pluck");

  const boardRef = useRef<HTMLDivElement | null>(null);
  const spindleRefs = useRef<Array<SVGSVGElement | null>>([]);
  const waveRefs = useRef<Array<SVGSVGElement | null>>([]);
  const dotRefs = useRef<Record<1 | 2 | 3, HTMLDivElement | null>>({ 1: null, 2: null, 3: null });

  const audioRef = useRef<AudioContext | null>(null);
  const inViewRef = useRef(true);
  const pointerLastY = useRef<number | null>(null);
  const pointerLastTime = useRef(0);
  const activeChordRef = useRef<Chord>(STAGE_CHORDS[0]);
  const boardSizeRef = useRef({ w: 1280, h: 278 });
  const unsubRef = useRef<(() => void) | null>(null);
  const dotsDirtyRef = useRef(true);

  const physicsRef = useRef<StringPhysics[]>(
    guitarStrings.map((_, i) => ({
      amp: 0,
      phase: 0,
      omega: (34 - i * 2.6) * Math.PI * 2,
      decay: 2.35 + i * 0.22,
      lastPluck: 0,
    }))
  );

  // Normalized coordinates (% of fretboard width/height) converted cleanly on paint
  const fingerStateRef = useRef<Record<1 | 2 | 3, FingerPos>>({
    1: { x: 24, y: STRING_Y_PCT[1], o: 0 },
    2: { x: 24, y: STRING_Y_PCT[1], o: 1 },
    3: { x: 24, y: STRING_Y_PCT[2], o: 1 },
  });

  const activeChord = STAGE_CHORDS.find((c) => c.name === selectedName) ?? STAGE_CHORDS[0];
  activeChordRef.current = activeChord;

  // Fret center X in % of full string bed width (adapts cleanly for mobile nut spacing)
  const fretPctX = (fret: number, widthPx: number) => {
    const isNarrow = widthPx < 640;
    const nut = isNarrow ? 15 : 9;
    const step = isNarrow ? 19 : 14;
    return nut + (fret - 0.5) * step;
  };

  const ensureRunning = useCallback(() => {
    if (unsubRef.current || !inViewRef.current) return;

    unsubRef.current = ticker.subscribe((_now, dt) => {
      if (!inViewRef.current) return;
      let anyActive = false;

      // 1. Update 6 standing-wave strings (pure compositor scale3d + opacity)
      for (let i = 0; i < 6; i++) {
        const st = physicsRef.current[i];
        const spindle = spindleRefs.current[i];
        const wave = waveRefs.current[i];
        if (!spindle || !wave) continue;

        if (st.amp > 0.012) {
          anyActive = true;
          st.phase += st.omega * dt;
          st.amp *= Math.exp(-st.decay * dt);
          if (st.amp <= 0.012) {
            st.amp = 0;
            spindle.style.transform = "scale3d(1, 0, 1)";
            spindle.style.opacity = "0";
            spindle.style.willChange = "auto";
            wave.style.transform = "scale3d(1, 0, 1)";
            wave.style.opacity = "0";
            wave.style.willChange = "auto";
          } else {
            const osc = Math.sin(st.phase) * st.amp;
            spindle.style.transform = `scale3d(1, ${st.amp.toFixed(3)}, 1)`;
            spindle.style.opacity = Math.min(1, st.amp * 1.15).toFixed(3);
            wave.style.transform = `scale3d(1, ${osc.toFixed(3)}, 1)`;
            wave.style.opacity = Math.min(1, st.amp * 1.45).toFixed(3);
          }
        }
      }

      // 2. Spring-glide finger dots across frets/strings (uses cached size — zero layout read in RAF!)
      if (dotsDirtyRef.current) {
        const { w, h } = boardSizeRef.current;
        const targets = getFingerTargets(activeChordRef.current);
        const lerp = reducedMotion ? 1 : 1 - Math.exp(-16 * dt);
        let stillMoving = false;

        ([1, 2, 3] as const).forEach((k) => {
          const el = dotRefs.current[k];
          if (!el) return;
          const tgt = targets[k];
          const cur = fingerStateRef.current[k];
          const tx = tgt ? fretPctX(tgt.fret, w) : cur.x;
          const ty = tgt ? STRING_Y_PCT[tgt.stringIdx] : cur.y;
          const to = tgt ? 1 : 0;

          const dx = tx - cur.x;
          const dy = ty - cur.y;
          const do_ = to - cur.o;

          if (Math.abs(dx) > 0.04 || Math.abs(dy) > 0.04 || Math.abs(do_) > 0.008) {
            stillMoving = true;
            cur.x += dx * lerp;
            cur.y += dy * lerp;
            cur.o += do_ * lerp;
            const px = (cur.x / 100) * w;
            const py = (cur.y / 100) * h;
            const sc = 0.68 + 0.32 * cur.o;
            el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(${sc.toFixed(3)})`;
            el.style.opacity = cur.o.toFixed(3);
          } else {
            cur.x = tx;
            cur.y = ty;
            cur.o = to;
            const px = (cur.x / 100) * w;
            const py = (cur.y / 100) * h;
            const sc = 0.68 + 0.32 * cur.o;
            el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(${sc.toFixed(3)})`;
            el.style.opacity = cur.o.toFixed(3);
            el.style.willChange = "auto";
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

  const exciteString = useCallback(
    (index: number, strength = 1) => {
      if (reducedMotion) return;
      const now = performance.now();
      const st = physicsRef.current[index];
      if (now - st.lastPluck < 48) return;
      st.lastPluck = now;
      st.amp = Math.min(1.15, Math.max(0.35, strength));
      st.phase = 0;
      const sp = spindleRefs.current[index];
      const wv = waveRefs.current[index];
      if (sp) sp.style.willChange = "transform, opacity";
      if (wv) wv.style.willChange = "transform, opacity";
      ensureRunning();
    },
    [ensureRunning, reducedMotion]
  );

  // Orchestrated mount entrance + subtle silent harmonic shimmer
  useEffect(() => {
    const id = window.requestAnimationFrame(() => {
      setEntered(true);
      dotsDirtyRef.current = true;
      ensureRunning();
    });
    const shimmerTimer = window.setTimeout(() => {
      if (reducedMotion) return;
      [0, 1, 2, 3, 4, 5].forEach((idx) => {
        window.setTimeout(() => exciteString(idx, 0.45), idx * 45);
      });
    }, 520);

    return () => {
      window.cancelAnimationFrame(id);
      window.clearTimeout(shimmerTimer);
    };
  }, [ensureRunning, exciteString, reducedMotion]);

  // Pause automatically offscreen + keep dot positions synced on resize
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        inViewRef.current = entries.some((e) => e.isIntersecting);
        if (!inViewRef.current && unsubRef.current) {
          unsubRef.current();
          unsubRef.current = null;
        }
      },
      { rootMargin: "80px 0px 80px 0px" }
    );
    obs.observe(el);

    const syncSize = () => {
      boardSizeRef.current = {
        w: el.clientWidth || 1280,
        h: el.clientHeight || 278,
      };
      dotsDirtyRef.current = true;
      ensureRunning();
    };
    syncSize();
    window.addEventListener("resize", syncSize, { passive: true });

    return () => {
      obs.disconnect();
      window.removeEventListener("resize", syncSize);
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [ensureRunning]);

  // Trigger smooth finger dot morph whenever selected chord changes
  useEffect(() => {
    ([1, 2, 3] as const).forEach((k) => {
      const el = dotRefs.current[k];
      if (el) el.style.willChange = "transform, opacity";
    });
    dotsDirtyRef.current = true;
    ensureRunning();
  }, [selectedName, ensureRunning]);

  const pluck = useCallback(
    async (index: number, strength = 1, fromSwipe = false) => {
      const pos = activeChordRef.current.strings[index];
      if (pos === "x") return;
      exciteString(index, strength);

      const fret = pos === 0 ? 0 : pos[0];
      const hz = fretHz(index, fret);
      const str = guitarStrings[index];
      setReadout(`${str.label} (${str.name})${fret > 0 ? ` · Fret ${fret}` : " · Open"} — ${hz.toFixed(2)} Hz`);

      try {
        const ctx = await openAudio(audioRef.current);
        audioRef.current = ctx;
        const vol = fromSwipe ? Math.min(0.22, 0.1 + strength * 0.1) : 0.23;
        pluckString({ context: ctx, hz, volume: vol });
      } catch {
        // Requires user click gesture before hover audio in locked browsers
      }
    },
    [exciteString]
  );

  const strum = useCallback(
    async (chordToPlay: Chord = activeChordRef.current) => {
      setReadout(`${chordToPlay.name} · ${chordToPlay.fullName}`);
      try {
        const ctx = await openAudio(audioRef.current);
        audioRef.current = ctx;
        strumChord({
          context: ctx,
          chord: chordToPlay,
          spreadSeconds: 0.038,
          onStringPluck: (idx) => exciteString(idx, 1.0),
        });
      } catch {
        chordToPlay.strings.forEach((pos, idx) => {
          if (pos !== "x") window.setTimeout(() => exciteString(idx, 0.9), idx * 38);
        });
      }
    },
    [exciteString]
  );

  // Velocity-sensitive vertical pointer swipe across the 6 strings
  const handleStringEnter = (index: number, clientY: number) => {
    const now = performance.now();
    let strength = 0.72;
    if (pointerLastY.current !== null) {
      const dt = Math.max(8, now - pointerLastTime.current);
      const velocity = Math.abs(clientY - pointerLastY.current) / dt; // px/ms
      strength = Math.min(1.12, Math.max(0.45, 0.45 + velocity * 0.42));
    }
    pointerLastY.current = clientY;
    pointerLastTime.current = now;
    void pluck(index, strength, true);
  };

  return (
    <section
      aria-label="Interactive six-string acoustic instrument"
      className="surface-prussian relative w-full border-y border-[var(--prussian-deep)] bg-[var(--prussian)] text-[var(--prussian-ink)]"
    >
      {/* Top Bezel: Plate identifier + Chord voicing selector */}
      <div className="urtext-container flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-3">
        <div className="flex items-center gap-3">
          <span className="font-mono-score text-[10px] uppercase text-[var(--bronze)]">
            Instrument 00
          </span>
          <span className="hidden text-xs text-[var(--prussian-muted)] sm:inline">
            Playable Acoustic Neck · Standard EADGBE
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Select chord shape">
          {STAGE_CHORDS.map((c) => {
            const active = c.name === activeChord.name;
            return (
              <button
                key={c.name}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSelectedName(c.name);
                  void strum(c);
                }}
                className={`tactile font-mono-score min-h-8 cursor-pointer rounded-[2px] border px-3 py-1 text-[11px] font-medium ${
                  active
                    ? "border-[var(--bronze)] bg-[var(--bronze)] text-[var(--prussian-deep)]"
                    : "border-white/15 bg-transparent text-[var(--prussian-ink)]/80 hover:border-white/40 hover:text-[var(--folio)]"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Full-Bleed 6-String Acoustic Stage */}
      <div
        ref={boardRef}
        className="relative h-[244px] w-full select-none overflow-hidden sm:h-[268px] md:h-[278px]"
        style={{ contain: "strict" }}
        onMouseLeave={() => {
          pointerLastY.current = null;
        }}
      >
        {/* Engraved Soundhole Rosette on Right (tablet/desktop) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 320 320"
          className="pointer-events-none absolute right-[4%] top-1/2 hidden h-[280px] w-[280px] -translate-y-1/2 opacity-90 sm:block sm:right-[7%] md:h-[310px] md:w-[310px]"
        >
          <circle cx="160" cy="160" r="118" fill="var(--prussian-deep)" stroke="rgba(199,158,89,0.28)" strokeWidth="1.5" />
          <circle cx="160" cy="160" r="130" fill="none" stroke="rgba(245,243,236,0.12)" strokeWidth="1" />
          <circle cx="160" cy="160" r="138" fill="none" stroke="rgba(199,158,89,0.18)" strokeWidth="1" strokeDasharray="3 6" />
        </svg>

        {/* Ivory Bone Nut */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-4 left-[15%] w-[5px] bg-[var(--paper)]/90 sm:left-[9%]"
        />

        {/* 4 Engraved Fret Wires + Roman Inlays */}
        {FRET_ROMAN.map((numeral, idx) => {
          const lineDesktop = `${9 + (idx + 1) * 14}%`;
          const centerDesktop = `${9 + (idx + 0.5) * 14}%`;
          const lineMobile = `${15 + (idx + 1) * 19}%`;
          const centerMobile = `${15 + (idx + 0.5) * 19}%`;
          return (
            <div key={numeral} aria-hidden="true">
              <div
                className="pointer-events-none absolute inset-y-4 hidden w-px bg-white/14 sm:block"
                style={{ left: lineDesktop }}
              />
              <div
                className="pointer-events-none absolute inset-y-4 w-px bg-white/14 sm:hidden"
                style={{ left: lineMobile }}
              />
              <span
                className="font-mono-score pointer-events-none absolute bottom-2 hidden -translate-x-1/2 text-[10px] text-[var(--prussian-muted)] sm:block"
                style={{ left: centerDesktop }}
              >
                {numeral}
              </span>
              <span
                className="font-mono-score pointer-events-none absolute bottom-2 -translate-x-1/2 text-[10px] text-[var(--prussian-muted)] sm:hidden"
                style={{ left: centerMobile }}
              >
                {numeral}
              </span>
              {idx === 2 && (
                <span
                  className="pointer-events-none absolute top-1/2 hidden h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/14 sm:block"
                  style={{ left: centerDesktop }}
                />
              )}
            </div>
          );
        })}

        {/* Six Tensioned Strings */}
        {guitarStrings.map((str, idx) => {
          const topPct = STRING_Y_PCT[idx];
          const pos = activeChord.strings[idx];
          const isMuted = pos === "x";
          const isOpen = pos === 0;
          const thickness = STRING_THICKNESS[idx];

          return (
            <div
              key={str.name}
              className="absolute inset-x-0 h-[44px] -translate-y-1/2"
              style={{ top: `${topPct}%` }}
            >
              {/* Tuning label at left edge */}
              <span className="font-mono-score pointer-events-none absolute left-[2.5%] top-1/2 -translate-y-1/2 text-[10px] text-[var(--prussian-muted)] sm:left-[2.8%]">
                {str.name}
              </span>

              {/* Open (bronze halo) or Muted (×) marker beside the nut */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-[10.8%] top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center sm:left-[6.8%]"
              >
                {isOpen && (
                  <span className="h-2.5 w-2.5 rounded-full border-[1.8px] border-[var(--bronze)]" />
                )}
                {isMuted && (
                  <span className="font-mono-score text-xs font-medium text-[var(--prussian-muted)]">
                    ×
                  </span>
                )}
              </span>

              {/* String span (from Nut cleanly off the right edge!) */}
              <div
                className="pointer-events-none absolute inset-y-0 left-[15%] right-0 origin-left transition-transform duration-700 ease-[var(--ease-out-expo)] sm:left-[9%]"
                style={{
                  transform: entered ? "scale3d(1, 1, 1)" : "scale3d(0, 1, 1)",
                  transitionDelay: `${160 + idx * 45}ms`,
                }}
              >
                {/* Standing-wave luminous envelope */}
                <svg
                  ref={(el) => {
                    spindleRefs.current[idx] = el;
                  }}
                  aria-hidden="true"
                  viewBox="0 0 1000 44"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full"
                  style={{ transform: "scale3d(1, 0, 1)", opacity: 0 }}
                >
                  <path
                    d="M 0 22 Q 500 2 1000 22 Q 500 42 0 22 Z"
                    fill="rgba(229, 130, 82, 0.34)"
                  />
                </svg>

                {/* Resting acoustic string */}
                <div
                  className="absolute inset-x-0 top-1/2 -translate-y-1/2 transition-opacity duration-200"
                  style={{
                    height: `${thickness}px`,
                    backgroundColor: isMuted
                      ? "rgba(245, 243, 236, 0.16)"
                      : idx < 4
                        ? "var(--bronze)"
                        : "rgba(244, 242, 235, 0.86)",
                  }}
                />

                {/* High-frequency oscillating string core */}
                <svg
                  ref={(el) => {
                    waveRefs.current[idx] = el;
                  }}
                  aria-hidden="true"
                  viewBox="0 0 1000 44"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full"
                  style={{ transform: "scale3d(1, 0, 1)", opacity: 0 }}
                >
                  <path
                    d="M 0 22 Q 500 4 1000 22"
                    fill="none"
                    stroke="#f79f72"
                    strokeWidth={Math.max(1.6, thickness)}
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>

              {/* Accessible interactive pluck/swipe hit lane */}
              {!isMuted && (
                <button
                  type="button"
                  aria-label={`Pluck ${str.label} string (${str.name}) in ${activeChord.name}`}
                  onMouseEnter={(e) => handleStringEnter(idx, e.clientY)}
                  onClick={() => void pluck(idx, 1.0, false)}
                  className="absolute inset-y-0 left-[15%] right-0 cursor-pointer bg-transparent focus-visible:bg-white/5 sm:left-[9%]"
                />
              )}
            </div>
          );
        })}

        {/* Spring-Gliding Cinnabar Finger Dots (1, 2, 3) — pure GPU translate3d */}
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

      {/* Bottom Telemetry Strip & Acoustic Strum Trigger */}
      <div className="urtext-container flex flex-wrap items-center justify-between gap-4 border-t border-white/10 py-3">
        <p className="font-mono-score text-[11px] text-[var(--prussian-muted)]" role="status">
          {readout}
        </p>

        <button
          type="button"
          onClick={() => void strum(activeChord)}
          className="tactile font-mono-score inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border border-[var(--bronze)] bg-[var(--bronze)] px-4 py-2 text-[11px] font-semibold uppercase text-[var(--prussian-deep)] hover:border-[var(--folio)] hover:bg-[var(--folio)]"
        >
          <IconVolume size={14} />
          <span>Strum {activeChord.name}</span>
        </button>
      </div>
    </section>
  );
}
