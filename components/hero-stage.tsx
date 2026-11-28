"use client";

import { RecordingLink as Link } from "./recording-navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowDown, ArrowRight } from "lucide-react";
import { chords, type Chord } from "../lib/chords";
import { OrbitalChordWheel } from "./orbital-wheel";
import { WebGLStrings, type WebGLStringsHandle } from "./webgl-strings";

// Five open beginner chords featured on the opening stage
const STAGE_CHORDS: readonly Chord[] = chords.slice(0, 5);

function fingeringSummary(chord: Chord): string {
  return chord.strings
    .map((s) => (s === "x" ? "x" : s === 0 ? "0" : String(s[0])))
    .join(" ");
}

export function HeroStage({
  ctaLabel,
  ctaHref,
  onStartSession,
}: {
  ctaLabel: string;
  ctaHref?: string;
  onStartSession: () => void;
}) {
  const [chordIndex, setChordIndex] = useState(0);
  const [readout, setReadout] = useState("");
  const neckRef = useRef<WebGLStringsHandle>(null);
  const heroRef = useRef<HTMLElement>(null);

  const activeChord = STAGE_CHORDS[chordIndex] ?? STAGE_CHORDS[0];

  // One-shot GSAP hero entrance on mount (honors prefers-reduced-motion, never hides content)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = heroRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      gsap.from("[data-hero-line]", {
        yPercent: 105,
        duration: 0.72,
        stagger: 0.08,
        ease: "power3.out",
        clearProps: "transform",
      });
      gsap.from("[data-hero-fade]", {
        y: 12,
        opacity: 0,
        duration: 0.54,
        stagger: 0.06,
        delay: 0.16,
        ease: "power2.out",
        clearProps: "transform,opacity",
      });
    }, root);

    return () => ctx.revert();
  }, []);

  const handleSelectChord = useCallback((nextIndex: number, shouldAudition = true) => {
    const safeIdx = ((nextIndex % STAGE_CHORDS.length) + STAGE_CHORDS.length) % STAGE_CHORDS.length;
    setChordIndex(safeIdx);
    const chosen = STAGE_CHORDS[safeIdx];
    setReadout(`${chosen.name} · ${chosen.fullName} · ${fingeringSummary(chosen)}`);
    if (shouldAudition) {
      neckRef.current?.strum(chosen);
    }
  }, []);

  const handleStrum = useCallback((chord: Chord) => {
    neckRef.current?.strum(chord);
  }, []);

  // Studio keyboard controls (1-6 pluck, Space strum when not focused on interactive control, Left/Right rotate wheel)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (document.querySelector("dialog[open]")) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable
      ) {
        return;
      }

      // Only bind hero shortcuts while the hero stage is visible on screen
      const rect = heroRef.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 120) return;

      if (event.key >= "1" && event.key <= "6") {
        const stringIdx = Number(event.key) - 1;
        neckRef.current?.pluck(stringIdx);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleSelectChord(chordIndex + 1, true);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handleSelectChord(chordIndex - 1, true);
        return;
      }

      if (event.key === " " && tag !== "BUTTON" && tag !== "A" && tag !== "SUMMARY") {
        event.preventDefault();
        neckRef.current?.strum(activeChord);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeChord, chordIndex, handleSelectChord]);

  return (
    <section
      ref={heroRef}
      aria-labelledby="hero-heading"
      className="flex flex-col justify-between py-8 sm:py-10 lg:min-h-[calc(100svh-var(--nav-h))] lg:py-10"
    >
      <div className="shell-wrap flex flex-1 flex-col justify-between gap-8 lg:gap-10">
        {/* Top Architectural Split: Headline (cols 1-7) + Plain Lead & Two Actions (cols 8-12) */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-8">
          <div className="lg:col-span-7">
            <h1 id="hero-heading" className="type-h1 text-[var(--ink)]">
              <span className="block overflow-clip">
                <span data-hero-line className="block">
                  Learn guitar and write{" "}
                </span>
              </span>
              <span className="block overflow-clip">
                <span data-hero-line className="block">
                  your first song
                </span>
              </span>
            </h1>
          </div>

          <div className="space-y-5 lg:col-span-5">
            <p data-hero-fade className="type-lead max-w-[46ch]">
              Tune six strings, play E minor, write one concrete line, and record a 20-second hook in fifteen minutes. Free, six weeks, saved in this browser.
            </p>

            <div data-hero-fade className="flex flex-wrap items-center gap-3">
              {ctaHref ? (
                <Link href={ctaHref} className="btn-primary w-full sm:w-auto">
                  <span>{ctaLabel}</span>
                  <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
                </Link>
              ) : (
                <button type="button" onClick={onStartSession} className="btn-primary w-full sm:w-auto">
                  <span>{ctaLabel}</span>
                  <ArrowDown size={15} strokeWidth={1.5} aria-hidden="true" />
                </button>
              )}

              <Link href="/chords/" className="btn-secondary w-full sm:w-auto">
                <span>Open 10 chords</span>
                <ArrowRight size={15} strokeWidth={1.5} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        {/* Center Spatial Stage: WebGL 6-String Neck (left 8 cols) + Vitra Orbital Chord Wheel (right 4 cols) */}
        <div className="grid items-center gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-8">
            <WebGLStrings
              ref={neckRef}
              chord={activeChord}
              onNoteSounded={setReadout}
            />
          </div>

          <div className="min-w-0 lg:col-span-4">
            <OrbitalChordWheel
              items={STAGE_CHORDS}
              activeIndex={chordIndex}
              onSelect={handleSelectChord}
              onStrum={handleStrum}
              size="compact"
            />
          </div>
        </div>

        {/* Quiet Single-Line Instrument Bar (Desktop/Tablet) */}
        <div className="hidden items-center justify-between gap-4 border-t border-[var(--line)] pt-3.5 text-[13px] text-[var(--muted)] sm:flex">
          <div className="font-mono-num flex flex-wrap items-center gap-x-5 gap-y-1">
            <span>1–6 pluck string</span>
            <span>Space strum</span>
            <span>← → rotate chord</span>
            <span>: index</span>
          </div>
          <p className="font-mono-num text-[var(--ink-soft)]" role="status">
            {readout || `${activeChord.name} · ${activeChord.fullName} · ${fingeringSummary(activeChord)}`}
          </p>
        </div>
      </div>
    </section>
  );
}
