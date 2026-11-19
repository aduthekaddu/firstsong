"use client";

import { useEffect, useRef } from "react";
import { guitarStrings, type Chord } from "../lib/chords";
import { fretHz, openAudio, pluckString, strumChord } from "../lib/sound";
import { ticker } from "../lib/ticker";
import { IconVolume } from "./icons";

const FRET_Y = [34, 62, 90, 118, 146] as const;
const stringX = (i: number) => 27 + i * 23;
const STRING_LETTERS = ["E", "A", "D", "G", "B", "e"] as const;

type StringVib = { amp: number; phase: number; omega: number };

export function ChordDiagram({
  chord,
  showStrum = false,
  compact = false,
  tone = "paper",
}: {
  chord: Chord;
  showStrum?: boolean;
  compact?: boolean;
  tone?: "paper" | "prussian";
}) {
  const audioRef = useRef<AudioContext | null>(null);
  const spindleRefs = useRef<Array<SVGPathElement | null>>([]);
  const vibRef = useRef<StringVib[]>(
    guitarStrings.map((_, i) => ({
      amp: 0,
      phase: 0,
      omega: (34 - i * 2.5) * Math.PI * 2,
    }))
  );
  const unsubRef = useRef<(() => void) | null>(null);
  const dark = tone === "prussian";

  const ensureTicker = () => {
    if (unsubRef.current) return;
    unsubRef.current = ticker.subscribe((_now, dt) => {
      let anyActive = false;
      for (let i = 0; i < 6; i++) {
        const st = vibRef.current[i];
        const el = spindleRefs.current[i];
        if (!el) continue;
        if (st.amp > 0.015) {
          anyActive = true;
          st.phase += st.omega * dt;
          st.amp *= Math.exp(-(3.4 + i * 0.2) * dt);
          if (st.amp <= 0.015) {
            st.amp = 0;
            el.style.transform = "scale3d(0, 1, 1)";
            el.style.opacity = "0";
          } else {
            const sx = (0.35 + Math.abs(Math.sin(st.phase)) * 0.65) * st.amp;
            el.style.transform = `scale3d(${sx.toFixed(3)}, 1, 1)`;
            el.style.opacity = Math.min(1, st.amp * 1.25).toFixed(3);
          }
        }
      }
      if (!anyActive && unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    });
  };

  useEffect(() => {
    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, []);

  const exciteString = (index: number) => {
    const st = vibRef.current[index];
    st.amp = 1;
    st.phase = 0;
    ensureTicker();
  };

  async function handlePluck(index: number) {
    const pos = chord.strings[index];
    if (pos === "x") return;
    const fret = pos === 0 ? 0 : pos[0];
    exciteString(index);
    try {
      const ctx = await openAudio(audioRef.current);
      audioRef.current = ctx;
      pluckString({ context: ctx, hz: fretHz(index, fret), volume: 0.21 });
    } catch {
      // Browser audio gesture restriction
    }
  }

  async function handleStrum() {
    try {
      const ctx = await openAudio(audioRef.current);
      audioRef.current = ctx;
      strumChord({
        context: ctx,
        chord,
        spreadSeconds: 0.042,
        onStringPluck: (idx) => exciteString(idx),
      });
    } catch {
      // Visual-only fallback if audio fails
      chord.strings.forEach((pos, idx) => {
        if (pos !== "x") window.setTimeout(() => exciteString(idx), idx * 42);
      });
    }
  }

  const description = chord.strings
    .map((position, index) => {
      const label = guitarStrings[index].label;
      if (position === "x") return `${label} muted`;
      if (position === 0) return `${label} open`;
      return `${label} fret ${position[0]}, finger ${position[1]}`;
    })
    .join(". ");

  const fieldFill = dark ? "rgba(255,255,255,0.04)" : "var(--vellum)";
  const nutColor = dark ? "var(--prussian-ink)" : "var(--prussian)";
  const fretColor = dark ? "rgba(245,243,236,0.18)" : "rgba(24,43,73,0.18)";
  const mutedColor = dark ? "rgba(245,243,236,0.22)" : "rgba(24,43,73,0.20)";
  const trebleColor = dark ? "rgba(245,243,236,0.72)" : "var(--ink-soft)";
  const labelColor = dark ? "var(--prussian-muted)" : "var(--ink-muted)";

  return (
    <div className="flex flex-col items-center gap-3.5">
      <svg
        className={`${compact ? "w-[144px]" : "w-[172px]"} select-none overflow-visible`}
        viewBox="0 0 169 174"
        role="img"
        aria-label={`${chord.fullName}. ${description}.`}
      >
        <title>{`${chord.fullName}. ${description}.`}</title>

        {/* Engraved fingerboard field */}
        <rect
          x="27"
          y="34"
          width="115"
          height="112"
          rx="1"
          fill={fieldFill}
        />

        {/* Fret wires & nut */}
        {FRET_Y.map((y, index) => (
          <line
            key={y}
            x1="27"
            x2="142"
            y1={y}
            y2={y}
            stroke={index === 0 ? nutColor : fretColor}
            strokeWidth={index === 0 ? 4.4 : 1.15}
          />
        ))}

        {/* 6 Strings + pure-compositor vertical standing-wave spindles */}
        {chord.strings.map((pos, index) => {
          const x = stringX(index);
          const isMuted = pos === "x";
          const width = 2.05 - index * 0.2;

          return (
            <g key={index}>
              {!isMuted && (
                <path
                  ref={(el) => {
                    spindleRefs.current[index] = el;
                  }}
                  d={`M ${x} 34 Q ${x - 6.5} 90 ${x} 146 Q ${x + 6.5} 90 ${x} 34 Z`}
                  fill="var(--cinnabar-bright)"
                  style={{
                    transformOrigin: `${x}px 90px`,
                    transform: "scale3d(0, 1, 1)",
                    opacity: 0,
                  }}
                />
              )}

              <line
                x1={x}
                x2={x}
                y1="34"
                y2="146"
                stroke={
                  isMuted
                    ? mutedColor
                    : index < 4
                      ? dark
                        ? "var(--bronze)"
                        : "var(--bronze-dark)"
                      : trebleColor
                }
                strokeWidth={width}
              />

              {!isMuted && (
                <rect
                  x={x - 10}
                  y="28"
                  width="20"
                  height="124"
                  fill="transparent"
                  className="cursor-pointer"
                  onClick={() => void handlePluck(index)}
                />
              )}
            </g>
          );
        })}

        {/* Open / muted / fretted finger dots */}
        {chord.strings.map((position, index) => {
          const x = stringX(index);
          if (position === "x") {
            return (
              <path
                key={index}
                d={`M ${x - 4} 13 l 8 8 m -8 0 l 8 -8`}
                fill="none"
                stroke={labelColor}
                strokeWidth="1.65"
                strokeLinecap="round"
              />
            );
          }
          if (position === 0) {
            return (
              <circle
                key={index}
                cx={x}
                cy="17"
                r="4.5"
                fill="none"
                stroke={dark ? "var(--bronze)" : "var(--bronze-dark)"}
                strokeWidth="2"
                className="cursor-pointer"
                onClick={() => void handlePluck(index)}
              />
            );
          }
          const [fret, finger] = position;
          const y = 34 + (fret - 0.5) * 28;
          return (
            <g
              key={index}
              className="cursor-pointer"
              onClick={() => void handlePluck(index)}
            >
              <circle cx={x} cy={y} r="9.8" fill="var(--cinnabar)" />
              <text
                x={x}
                y={y}
                dy=".35em"
                textAnchor="middle"
                fill="var(--folio)"
                className="font-mono-score text-[10.5px] font-semibold"
              >
                {finger}
              </text>
            </g>
          );
        })}

        {/* String names */}
        {STRING_LETTERS.map((letter, index) => (
          <text
            key={letter}
            x={stringX(index)}
            y="166"
            textAnchor="middle"
            fill={labelColor}
            className="font-mono-score text-[11px]"
          >
            {letter}
          </text>
        ))}
      </svg>

      {showStrum && (
        <button
          type="button"
          onClick={() => void handleStrum()}
          className={`tactile font-mono-score inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border px-3.5 py-1.5 text-[11px] uppercase ${
            dark
              ? "border-[var(--prussian-ink)]/30 bg-[var(--prussian-deep)] text-[var(--prussian-ink)] hover:border-[var(--bronze)] hover:bg-[var(--bronze)] hover:text-[var(--prussian-deep)]"
              : "border-[var(--rule-mid)] bg-[var(--paper)] text-[var(--prussian)] hover:border-[var(--prussian)] hover:bg-[var(--prussian)] hover:text-[var(--prussian-ink)]"
          }`}
        >
          <IconVolume size={13} />
          <span>Strum {chord.name}</span>
        </button>
      )}
    </div>
  );
}
