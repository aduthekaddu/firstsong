"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chords, guitarStrings, type Chord } from "../lib/chords";
import { fretHz, openAudio, pluckString, strumChord } from "../lib/sound";
import { ticker } from "../lib/ticker";
import { IconVolume, IconVolumeOff } from "./icons";
import { useMotionSystem } from "./motion-provider";

type JourneyChord = {
  chord: Chord;
  stageTag: string;
  note: string;
  tab: readonly string[]; // High e -> Low E (standard TAB top-to-bottom order)
};

const JOURNEY: readonly JourneyChord[] = [
  {
    chord: chords[0], // Em
    stageTag: "Stage 0 · Your first chord",
    note: "Two fingers on the second fret; four strings ring wide open. This single chord carries your entire 15-minute first session.",
    tab: ["0", "0", "0", "2", "2", "0"],
  },
  {
    chord: chords[1], // Asus2
    stageTag: "Week 2 · Your first change",
    note: "Slide the exact same two-finger shape one string toward the floor. Your hand barely moves, yet the harmony opens up.",
    tab: ["0", "0", "2", "2", "0", "×"],
  },
  {
    chord: chords[2], // C
    stageTag: "Week 3 · Chorus brightness",
    note: "Fingers step diagonally across frets 1, 2, and 3—giving your chorus a clean harmonic lift away from the verse.",
    tab: ["0", "1", "0", "2", "3", "×"],
  },
  {
    chord: chords[3], // G
    stageTag: "Week 3 · Full six-string ring",
    note: "Both outer E strings anchor the third fret while the center stays resonant and wide open.",
    tab: ["3", "0", "0", "0", "2", "3"],
  },
  {
    chord: chords[4], // D
    stageTag: "Week 4 · Forward pull",
    note: "Strum only the top four strings for a crisp, bright lift that wants to fall right back home to E minor.",
    tab: ["2", "3", "2", "0", "×", "×"],
  },
];

const TAB_LABELS = ["e", "B", "G", "D", "A", "E"] as const;
const STRING_Y_PCT = [16, 29.6, 43.2, 56.8, 70.4, 84] as const;
const STRING_THICKNESS = [2.8, 2.4, 2.05, 1.75, 1.4, 1.15] as const;

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
 * Signature Moment #2 — Scroll = Playing & Morphing Fretboard:
 * Scrubs cleanly through 5 core open chords (Em → Asus2 → C → G → D) as you scroll.
 * - ZERO React re-renders during scroll! Active chord state updates purely via DOM attributes
 *   and GPU transforms inside the single shared RAF ticker.
 * - ZERO layout recalculations during scroll (all dynamic labels pre-layered in `contain: strict`,
 *   all nut markers pre-mounted and toggled via opacity only, cached board dimensions).
 */
export function ChordMorphChapter() {
  const { reducedMotion, subscribeScroll } = useMotionSystem();
  const [soundOnScroll, setSoundOnScroll] = useState(false);

  const sectionRef = useRef<HTMLElement | null>(null);
  const stageRootRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const playheadRef = useRef<HTMLDivElement | null>(null);

  const spindleRefs = useRef<Array<SVGSVGElement | null>>([]);
  const waveRefs = useRef<Array<SVGSVGElement | null>>([]);
  const stringLineRefs = useRef<Array<HTMLDivElement | null>>([]);
  const openMarkerRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const muteMarkerRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const dotRefs = useRef<Record<1 | 2 | 3, HTMLDivElement | null>>({ 1: null, 2: null, 3: null });

  const tagRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const titleRefs = useRef<Array<HTMLDivElement | null>>([]);
  const noteRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const strumLabelRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const chordBtnRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabColRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const audioRef = useRef<AudioContext | null>(null);
  const soundOnScrollRef = useRef(false);
  const activeIdxRef = useRef(0);
  const inViewRef = useRef(false);
  const anchorRef = useRef({ top: 0, span: 1 });
  const boardSizeRef = useRef({ w: 720, h: 296 });
  const unsubTickerRef = useRef<(() => void) | null>(null);
  const dotsDirtyRef = useRef(true);

  const strPhys = useRef(
    guitarStrings.map((_, i) => ({
      amp: 0,
      phase: 0,
      omega: (34 - i * 2.5) * Math.PI * 2,
      decay: 2.5 + i * 0.22,
    }))
  );

  const fingerPos = useRef<Record<1 | 2 | 3, { x: number; y: number; o: number }>>({
    1: { x: 40, y: STRING_Y_PCT[1], o: 0 },
    2: { x: 40, y: STRING_Y_PCT[1], o: 1 },
    3: { x: 40, y: STRING_Y_PCT[2], o: 1 },
  });

  soundOnScrollRef.current = soundOnScroll;

  const fretPctX = (fret: number) => 16 + (fret - 0.5) * 20;

  /** Sync all pre-layered DOM visuals for chord `idx` with ZERO React re-renders and ZERO layouts */
  const syncChordDom = useCallback((idx: number) => {
    const chord = JOURNEY[idx].chord;
    if (stageRootRef.current) stageRootRef.current.dataset.chord = String(idx);

    JOURNEY.forEach((_, i) => {
      const isCur = i === idx;
      const tag = tagRefs.current[i];
      if (tag) {
        tag.style.opacity = isCur ? "1" : "0";
        tag.setAttribute("aria-hidden", isCur ? "false" : "true");
      }
      const title = titleRefs.current[i];
      if (title) {
        title.style.opacity = isCur ? "1" : "0";
        title.style.transform = isCur
          ? "translate3d(0, 0, 0)"
          : i < idx
            ? "translate3d(0, -18px, 0)"
            : "translate3d(0, 18px, 0)";
        title.setAttribute("aria-hidden", isCur ? "false" : "true");
      }
      const note = noteRefs.current[i];
      if (note) {
        note.style.opacity = isCur ? "1" : "0";
        note.setAttribute("aria-hidden", isCur ? "false" : "true");
      }
      const strumLbl = strumLabelRefs.current[i];
      if (strumLbl) {
        strumLbl.style.opacity = isCur ? "1" : "0";
        strumLbl.setAttribute("aria-hidden", isCur ? "false" : "true");
      }
      const btn = chordBtnRefs.current[i];
      if (btn) {
        btn.setAttribute("aria-pressed", isCur ? "true" : "false");
        btn.dataset.active = isCur ? "true" : "false";
      }
      const tabCol = tabColRefs.current[i];
      if (tabCol) {
        tabCol.dataset.active = isCur ? "true" : "false";
      }
    });

    // Update nut open/muted halos and resting string opacity purely via style (zero DOM insert/remove!)
    chord.strings.forEach((pos, sIdx) => {
      const isOpen = pos === 0;
      const isMuted = pos === "x";
      const om = openMarkerRefs.current[sIdx];
      const mm = muteMarkerRefs.current[sIdx];
      const line = stringLineRefs.current[sIdx];
      if (om) om.style.opacity = isOpen ? "1" : "0";
      if (mm) mm.style.opacity = isMuted ? "1" : "0";
      if (line) line.style.opacity = isMuted ? "0.2" : "1";
    });
  }, []);

  const ensureTicker = useCallback(() => {
    if (unsubTickerRef.current || !inViewRef.current) return;
    unsubTickerRef.current = ticker.subscribe((_now, dt) => {
      if (!inViewRef.current) return;
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
            sp.style.willChange = "auto";
            wv.style.transform = "scale3d(1, 0, 1)";
            wv.style.opacity = "0";
            wv.style.willChange = "auto";
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
        const targets = getFingerMap(JOURNEY[activeIdxRef.current].chord);
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
            el.style.willChange = "auto";
          }
        });
        dotsDirtyRef.current = stillMoving;
        if (stillMoving) anyActive = true;
      }

      if (!anyActive && unsubTickerRef.current) {
        unsubTickerRef.current();
        unsubTickerRef.current = null;
      }
    });
  }, [reducedMotion]);

  const exciteChordStrings = useCallback(
    (chord: Chord, strength = 0.85) => {
      if (reducedMotion) return;
      chord.strings.forEach((pos, i) => {
        if (pos === "x") return;
        const s = strPhys.current[i];
        s.amp = strength * (1 - i * 0.05);
        s.phase = i * 0.35;
        const sp = spindleRefs.current[i];
        const wv = waveRefs.current[i];
        if (sp) sp.style.willChange = "transform, opacity";
        if (wv) wv.style.willChange = "transform, opacity";
      });
      ensureTicker();
    },
    [ensureTicker, reducedMotion]
  );

  const playChordAudio = useCallback(
    async (chord: Chord) => {
      exciteChordStrings(chord, 0.95);
      try {
        const ctx = await openAudio(audioRef.current);
        audioRef.current = ctx;
        strumChord({
          context: ctx,
          chord,
          spreadSeconds: 0.038,
          volume: 0.14,
        });
      } catch {
        // Requires gesture before audio
      }
    },
    [exciteChordStrings]
  );

  const activateChord = useCallback(
    (idx: number, triggerAudio: boolean) => {
      if (idx === activeIdxRef.current && !triggerAudio) return;
      activeIdxRef.current = idx;
      syncChordDom(idx);
      ([1, 2, 3] as const).forEach((k) => {
        const el = dotRefs.current[k];
        if (el) el.style.willChange = "transform, opacity";
      });
      dotsDirtyRef.current = true;
      const chord = JOURNEY[idx].chord;
      if (triggerAudio) {
        void playChordAudio(chord);
      } else {
        exciteChordStrings(chord, 0.72);
      }
    },
    [exciteChordStrings, playChordAudio, syncChordDom]
  );

  const paintDotsImmediate = useCallback((idx: number) => {
    const { w, h } = boardSizeRef.current;
    const targets = getFingerMap(JOURNEY[idx].chord);
    ([1, 2, 3] as const).forEach((k) => {
      const el = dotRefs.current[k];
      if (!el) return;
      const tgt = targets[k];
      const cur = fingerPos.current[k];
      if (tgt) {
        cur.x = fretPctX(tgt.fret);
        cur.y = STRING_Y_PCT[tgt.stringIdx];
        cur.o = 1;
      } else {
        cur.o = 0;
      }
      const px = (cur.x / 100) * w;
      const py = (cur.y / 100) * h;
      const sc = 0.65 + 0.35 * cur.o;
      el.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(${sc.toFixed(3)})`;
      el.style.opacity = cur.o.toFixed(3);
    });
    dotsDirtyRef.current = false;
  }, []);

  useEffect(() => {
    const sec = sectionRef.current;
    if (!sec) return;

    const measure = () => {
      const rect = sec.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const span = Math.max(1, sec.offsetHeight - window.innerHeight);
      anchorRef.current = { top, span };
      if (boardRef.current) {
        boardSizeRef.current = {
          w: boardRef.current.clientWidth || 720,
          h: boardRef.current.clientHeight || 296,
        };
      }
      syncChordDom(activeIdxRef.current);
      paintDotsImmediate(activeIdxRef.current);
    };
    measure();

    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.some((e) => e.isIntersecting);
        inViewRef.current = vis;
        if (vis) {
          dotsDirtyRef.current = true;
          ensureTicker();
        } else if (unsubTickerRef.current) {
          unsubTickerRef.current();
          unsubTickerRef.current = null;
        }
      },
      { rootMargin: "120px 0px 120px 0px" }
    );
    obs.observe(sec);
    window.addEventListener("resize", measure, { passive: true });

    const unsubScroll = subscribeScroll(({ scrollY }) => {
      if (!inViewRef.current) return;
      const { top, span } = anchorRef.current;
      if (span < 240) return;
      const p = Math.max(0, Math.min(0.9999, (scrollY - top) / span));

      if (playheadRef.current) {
        playheadRef.current.style.transform = `translate3d(${(p * 400).toFixed(1)}%, 0, 0)`;
      }

      const idx = Math.min(JOURNEY.length - 1, Math.floor(p * JOURNEY.length));
      if (idx !== activeIdxRef.current) {
        activateChord(idx, soundOnScrollRef.current);
      }
    });

    return () => {
      unsubScroll();
      obs.disconnect();
      window.removeEventListener("resize", measure);
      if (unsubTickerRef.current) {
        unsubTickerRef.current();
        unsubTickerRef.current = null;
      }
    };
  }, [activateChord, ensureTicker, paintDotsImmediate, subscribeScroll, syncChordDom]);

  return (
    <section
      ref={sectionRef}
      aria-labelledby="morph-chapter-title"
      className="relative bg-[var(--vellum)]/65 py-16 lg:h-[205vh] lg:py-0"
    >
      <div
        ref={stageRootRef}
        data-chord="0"
        className="urtext-container lg:sticky lg:top-[76px] lg:flex lg:min-h-[calc(100svh-76px)] lg:flex-col lg:justify-center lg:py-10"
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--rule-mid)] pb-5">
          <div>
            <p className="font-mono-score text-[11px] font-medium uppercase text-[var(--cobalt)]">
              Plate 01 · Scroll-Synced Chord Morph
            </p>
            <h2 id="morph-chapter-title" className="font-display-section mt-1.5 text-[var(--ink)]">
              Five open shapes, <em className="text-[var(--cobalt)]">one hand movement.</em>
            </h2>
          </div>

          <button
            type="button"
            aria-pressed={soundOnScroll}
            onClick={async () => {
              const next = !soundOnScroll;
              setSoundOnScroll(next);
              if (next) {
                await playChordAudio(JOURNEY[activeIdxRef.current].chord);
              }
            }}
            className={`tactile font-mono-score inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border px-3.5 py-2 text-[11px] uppercase ${
              soundOnScroll
                ? "border-[var(--cinnabar)] bg-[var(--cinnabar)] text-[var(--folio)]"
                : "border-[var(--rule-mid)] bg-[var(--folio)] text-[var(--ink)] hover:border-[var(--prussian)]"
            }`}
          >
            {soundOnScroll ? <IconVolume size={14} /> : <IconVolumeOff size={14} />}
            <span>Sound on scroll: {soundOnScroll ? "On" : "Off"}</span>
          </button>
        </div>

        {/* Asymmetric 5 / 7 Stage */}
        <div className="grid items-stretch gap-6 lg:grid-cols-12">
          {/* Left Narrative & Chord Selector (5 cols) */}
          <div
            className="flex flex-col justify-between rounded-[var(--radius-plate)] border border-[var(--rule-mid)] bg-[var(--folio)] p-6 md:p-8 lg:col-span-5"
            style={{ contain: "layout style" }}
          >
            <div>
              {/* Pre-layered stage tags (contain: strict -> 0 layouts) */}
              <div className="relative h-7 overflow-hidden" style={{ contain: "strict" }}>
                {JOURNEY.map((item, idx) => (
                  <span
                    key={item.chord.name}
                    ref={(el) => {
                      tagRefs.current[idx] = el;
                    }}
                    aria-hidden={idx !== 0}
                    className="font-mono-score absolute left-0 top-0 inline-block rounded-[2px] bg-[var(--cobalt-tint)] px-2.5 py-1 text-[10px] font-medium uppercase text-[var(--cobalt)] transition-opacity duration-200"
                    style={{ opacity: idx === 0 ? 1 : 0 }}
                  >
                    {item.stageTag}
                  </span>
                ))}
              </div>

              {/* Pre-layered giant chord titles (contain: strict -> 0 layouts) */}
              <div
                className="relative mt-4 h-[92px] overflow-hidden md:h-[108px]"
                style={{ contain: "strict" }}
              >
                {JOURNEY.map((item, idx) => (
                  <div
                    key={item.chord.name}
                    ref={(el) => {
                      titleRefs.current[idx] = el;
                    }}
                    aria-hidden={idx !== 0}
                    className="absolute inset-0 flex items-baseline gap-4 transition-[transform,opacity] duration-300 ease-[var(--ease-out-expo)]"
                    style={{
                      opacity: idx === 0 ? 1 : 0,
                      transform: idx === 0 ? "translate3d(0, 0, 0)" : "translate3d(0, 18px, 0)",
                    }}
                  >
                    <span className="font-display text-7xl leading-none text-[var(--prussian)] md:text-8xl">
                      {item.chord.name}
                    </span>
                    <span className="font-mono-score text-xs uppercase text-[var(--ink-muted)]">
                      {item.chord.fullName}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pre-layered descriptions (contain: strict -> 0 layouts) */}
              <div className="relative mt-3 h-[84px] overflow-hidden" style={{ contain: "strict" }}>
                {JOURNEY.map((item, idx) => (
                  <p
                    key={item.chord.name}
                    ref={(el) => {
                      noteRefs.current[idx] = el;
                    }}
                    aria-hidden={idx !== 0}
                    className="absolute inset-0 text-sm leading-relaxed text-[var(--ink-soft)] transition-opacity duration-200 md:text-base"
                    style={{ opacity: idx === 0 ? 1 : 0 }}
                  >
                    {item.note}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-4 border-t border-[var(--rule)] pt-5">
              {/* Direct chord buttons */}
              <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Jump to chord">
                {JOURNEY.map((item, idx) => (
                  <button
                    key={item.chord.name}
                    ref={(el) => {
                      chordBtnRefs.current[idx] = el;
                    }}
                    type="button"
                    data-active={idx === 0 ? "true" : "false"}
                    aria-pressed={idx === 0}
                    onClick={() => {
                      activateChord(idx, true);
                      if (playheadRef.current) {
                        playheadRef.current.style.transform = `translate3d(${idx * 100}%, 0, 0)`;
                      }
                    }}
                    className="tactile font-mono-score min-h-10 cursor-pointer rounded-[var(--radius-control)] border border-[var(--rule-mid)] bg-[var(--paper)] text-xs font-medium text-[var(--ink)] hover:border-[var(--prussian)] data-[active=true]:border-[var(--prussian)] data-[active=true]:bg-[var(--prussian)] data-[active=true]:text-[var(--prussian-ink)]"
                  >
                    {item.chord.name}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void playChordAudio(JOURNEY[activeIdxRef.current].chord)}
                className="tactile font-mono-score relative inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-control)] border border-[var(--prussian)] bg-[var(--prussian)] px-5 text-xs uppercase text-[var(--prussian-ink)] hover:border-[var(--cobalt)] hover:bg-[var(--cobalt)]"
                style={{ contain: "strict" }}
              >
                <IconVolume size={14} />
                <span className="relative inline-block h-4 w-28 text-left">
                  {JOURNEY.map((item, idx) => (
                    <span
                      key={item.chord.name}
                      ref={(el) => {
                        strumLabelRefs.current[idx] = el;
                      }}
                      aria-hidden={idx !== 0}
                      className="absolute inset-0 flex items-center transition-opacity duration-150"
                      style={{ opacity: idx === 0 ? 1 : 0 }}
                    >
                      Strum {item.chord.name}
                    </span>
                  ))}
                </span>
              </button>
            </div>
          </div>

          {/* Right Morphing Prussian Fretboard + Scroll-Synced TAB Bar (7 cols) */}
          <div className="flex flex-col gap-4 lg:col-span-7">
            <div
              ref={boardRef}
              className="surface-prussian relative h-[264px] w-full overflow-hidden rounded-[var(--radius-plate)] border border-[var(--prussian-deep)] bg-[var(--prussian)] sm:h-[296px]"
              style={{ contain: "strict" }}
            >
              {/* Nut at 16% */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-4 left-[16%] w-[5px] bg-[var(--paper)]/90"
              />

              {/* 4 Frets */}
              {["I", "II", "III", "IV"].map((roman, fIdx) => (
                <div key={roman} aria-hidden="true">
                  <div
                    className="pointer-events-none absolute inset-y-4 w-px bg-white/15"
                    style={{ left: `${16 + (fIdx + 1) * 20}%` }}
                  />
                  <span
                    className="font-mono-score pointer-events-none absolute bottom-2 -translate-x-1/2 text-[10px] text-[var(--prussian-muted)]"
                    style={{ left: `${16 + (fIdx + 0.5) * 20}%` }}
                  >
                    {roman}
                  </span>
                </div>
              ))}

              {/* 6 Strings (all nut markers pre-mounted; opacity toggled without DOM insertion/removal!) */}
              {guitarStrings.map((str, idx) => {
                const initPos = JOURNEY[0].chord.strings[idx];
                const yPct = STRING_Y_PCT[idx];
                const thick = STRING_THICKNESS[idx];

                return (
                  <div
                    key={str.name}
                    className="absolute inset-x-0 h-[40px] -translate-y-1/2"
                    style={{ top: `${yPct}%` }}
                  >
                    <span className="font-mono-score pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--prussian-muted)] sm:left-4">
                      {str.name}
                    </span>

                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-[11.5%] top-1/2 flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                    >
                      <span
                        ref={(el) => {
                          openMarkerRefs.current[idx] = el;
                        }}
                        className="absolute h-2.5 w-2.5 rounded-full border-[1.8px] border-[var(--bronze)] transition-opacity duration-200"
                        style={{ opacity: initPos === 0 ? 1 : 0 }}
                      />
                      <span
                        ref={(el) => {
                          muteMarkerRefs.current[idx] = el;
                        }}
                        className="font-mono-score absolute text-xs text-[var(--prussian-muted)] transition-opacity duration-200"
                        style={{ opacity: initPos === "x" ? 1 : 0 }}
                      >
                        ×
                      </span>
                    </span>

                    <div className="pointer-events-none absolute inset-y-0 left-[16%] right-4">
                      <svg
                        ref={(el) => {
                          spindleRefs.current[idx] = el;
                        }}
                        aria-hidden="true"
                        viewBox="0 0 800 40"
                        preserveAspectRatio="none"
                        className="absolute inset-0 h-full w-full"
                        style={{ transform: "scale3d(1, 0, 1)", opacity: 0 }}
                      >
                        <path
                          d="M 0 20 Q 400 2 800 20 Q 400 38 0 20 Z"
                          fill="rgba(229, 130, 82, 0.34)"
                        />
                      </svg>
                      <div
                        ref={(el) => {
                          stringLineRefs.current[idx] = el;
                        }}
                        className="absolute inset-x-0 top-1/2 -translate-y-1/2 transition-opacity duration-200"
                        style={{
                          height: `${thick}px`,
                          backgroundColor:
                            idx < 4 ? "var(--bronze)" : "rgba(244, 242, 235, 0.85)",
                          opacity: initPos === "x" ? 0.2 : 1,
                        }}
                      />
                      <svg
                        ref={(el) => {
                          waveRefs.current[idx] = el;
                        }}
                        aria-hidden="true"
                        viewBox="0 0 800 40"
                        preserveAspectRatio="none"
                        className="absolute inset-0 h-full w-full"
                        style={{ transform: "scale3d(1, 0, 1)", opacity: 0 }}
                      >
                        <path
                          d="M 0 20 Q 400 4 800 20"
                          fill="none"
                          stroke="#f79f72"
                          strokeWidth={Math.max(1.6, thick)}
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    </div>

                    <button
                      type="button"
                      aria-label={`Pluck ${str.label} string`}
                      onClick={async () => {
                        const ch = JOURNEY[activeIdxRef.current].chord;
                        const pos = ch.strings[idx];
                        if (pos === "x") return;
                        const fret = pos === 0 ? 0 : pos[0];
                        exciteChordStrings(ch, 0.72);
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
                  </div>
                );
              })}

              {/* Spring-Gliding Finger Dots */}
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

            {/* Synchronized 6-Line Guitar TAB Strip */}
            <div
              className="relative overflow-hidden rounded-[var(--radius-plate)] border border-[var(--rule-mid)] bg-[var(--folio)] px-4 py-4 md:px-6"
              style={{ contain: "layout style" }}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono-score text-[10px] uppercase text-[var(--ink-muted)]">
                  Tablature · Measure 01–05
                </span>
                <span className="font-mono-score text-[10px] uppercase text-[var(--cobalt)]">
                  Scroll to advance playhead
                </span>
              </div>

              <div className="relative grid grid-cols-[24px_1fr] items-center gap-3">
                <div className="font-mono-score flex flex-col justify-between gap-1 text-[10px] text-[var(--ink-muted)]">
                  {TAB_LABELS.map((l) => (
                    <span key={l} className="leading-[18px]">
                      {l}
                    </span>
                  ))}
                </div>

                <div className="relative">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 flex flex-col justify-between py-[8px]"
                  >
                    {TAB_LABELS.map((l) => (
                      <div key={l} className="h-px w-full bg-[var(--rule)]" />
                    ))}
                  </div>

                  {/* Gliding Active Measure Playhead (pure GPU translate3d) */}
                  <div
                    ref={playheadRef}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 w-1/5 rounded-[2px] border-l-2 border-[var(--cinnabar)] bg-[var(--cobalt-tint)]"
                    style={{ transform: "translate3d(0%, 0, 0)" }}
                  />

                  <div className="relative grid grid-cols-5">
                    {JOURNEY.map((item, idx) => (
                      <button
                        key={item.chord.name}
                        ref={(el) => {
                          tabColRefs.current[idx] = el;
                        }}
                        type="button"
                        data-active={idx === 0 ? "true" : "false"}
                        onClick={() => {
                          activateChord(idx, true);
                          if (playheadRef.current) {
                            playheadRef.current.style.transform = `translate3d(${idx * 100}%, 0, 0)`;
                          }
                        }}
                        className="group relative flex cursor-pointer flex-col items-center gap-1 py-0.5 focus-visible:bg-[var(--cobalt-tint)]"
                        aria-label={`Select ${item.chord.name} tablature`}
                      >
                        {item.tab.map((fretChar, lineIdx) => {
                          const isFret = fretChar !== "×" && fretChar !== "0";
                          return (
                            <span
                              key={lineIdx}
                              aria-hidden="true"
                              className={`font-mono-score inline-block rounded-[2px] bg-[var(--folio)] px-1 text-[11px] font-medium leading-[18px] text-[var(--ink-muted)] transition-colors duration-200 ${
                                isFret
                                  ? "group-data-[active=true]:bg-[var(--cinnabar)] group-data-[active=true]:text-[var(--folio)]"
                                  : "group-data-[active=true]:text-[var(--prussian)]"
                              }`}
                            >
                              {fretChar}
                            </span>
                          );
                        })}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
