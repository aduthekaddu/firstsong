"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { guitarStrings, type Chord } from "../lib/chords";
import { fretHz, openAudio, pluckString, strumChord } from "../lib/sound";

const FINGER_NAMES = ["", "index finger", "middle finger", "ring finger", "pinky finger"] as const;

export function describeChord(chord: Chord): string {
  return chord.strings
    .map((pos, idx) => {
      const name = guitarStrings[idx].label;
      if (pos === "x") return `${name} string muted`;
      if (pos === 0) return `${name} string open`;
      return `${name} string fret ${pos[0]} with ${FINGER_NAMES[pos[1]]}`;
    })
    .join("; ");
}

export function ChordDiagram({
  chord,
  showStrum = false,
  compact = false,
}: {
  chord: Chord;
  showStrum?: boolean;
  compact?: boolean;
}) {
  const [activeString, setActiveString] = useState<number | null>(null);
  const [strumming, setStrumming] = useState(false);

  const width = compact ? 168 : 204;
  const height = compact ? 194 : 228;
  const padX = compact ? 22 : 28;
  const padTop = compact ? 36 : 42;
  const padBottom = 26;
  const gridW = width - padX * 2;
  const gridH = height - padTop - padBottom;
  const frets = 4;

  const stringX = (idx: number) => padX + (idx / 5) * gridW;
  const fretY = (fret: number) => padTop + (fret / frets) * gridH;

  async function handlePluck(idx: number) {
    const pos = chord.strings[idx];
    if (pos === "x") return;
    const fret = pos === 0 ? 0 : pos[0];
    setActiveString(idx);
    window.setTimeout(() => setActiveString((curr) => (curr === idx ? null : curr)), 450);

    try {
      const ctx = await openAudio();
      pluckString({
        context: ctx,
        hz: fretHz(idx, fret),
        volume: 0.32,
        brightness: idx < 3 ? 0.48 : 0.64,
      });
    } catch {
      // Audio blocked or unsupported
    }
  }

  async function handleStrum() {
    setStrumming(true);
    try {
      const ctx = await openAudio();
      strumChord({
        context: ctx,
        chord,
        onStringPluck: (sIdx) => {
          setActiveString(sIdx);
          window.setTimeout(() => setActiveString((curr) => (curr === sIdx ? null : curr)), 320);
        },
      });
    } catch {
      // Ignore audio block
    }
    window.setTimeout(() => setStrumming(false), 380);
  }

  const description = describeChord(chord);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${chord.name} (${chord.fullName}) guitar chord diagram. ${description}`}
          className="select-none overflow-visible"
        >
          {/* Nut bar */}
          <line
            x1={padX - 1}
            y1={padTop}
            x2={width - padX + 1}
            y2={padTop}
            stroke="var(--ink)"
            strokeWidth="3.5"
            strokeLinecap="square"
          />

          {/* Horizontal fret wires */}
          {[1, 2, 3, 4].map((f) => (
            <line
              key={f}
              x1={padX}
              y1={fretY(f)}
              x2={width - padX}
              y2={fretY(f)}
              stroke="var(--line-strong)"
              strokeWidth="1"
            />
          ))}

          {/* Vertical strings (Low E on left -> High E on right) */}
          {chord.strings.map((pos, idx) => {
            const x = stringX(idx);
            const muted = pos === "x";
            const isLit = activeString === idx;
            const strokeW = Math.max(1, 2.2 - idx * 0.22);

            return (
              <g key={guitarStrings[idx].name}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + gridH}
                  stroke={isLit ? "var(--accent)" : idx < 3 ? "var(--brass)" : "var(--ink-soft)"}
                  strokeWidth={isLit ? strokeW + 0.8 : strokeW}
                  opacity={muted ? 0.28 : 0.92}
                />

                {/* Top open (O) or muted (X) indicator */}
                {muted ? (
                  <g stroke="var(--muted)" strokeWidth="1.5" strokeLinecap="round">
                    <line x1={x - 4.5} y1={padTop - 19} x2={x + 4.5} y2={padTop - 10} />
                    <line x1={x + 4.5} y1={padTop - 19} x2={x - 4.5} y2={padTop - 10} />
                  </g>
                ) : pos === 0 ? (
                  <circle
                    cx={x}
                    cy={padTop - 14.5}
                    r={5}
                    fill="none"
                    stroke={isLit ? "var(--accent)" : "var(--ink)"}
                    strokeWidth="1.5"
                  />
                ) : (
                  <g>
                    <circle
                      cx={x}
                      cy={fretY(pos[0]) - gridH / (frets * 2)}
                      r={compact ? 9.5 : 11}
                      fill={isLit ? "var(--accent)" : "var(--ink)"}
                    />
                    <text
                      x={x}
                      y={fretY(pos[0]) - gridH / (frets * 2) + 4}
                      textAnchor="middle"
                      fill="var(--bg)"
                      fontSize={compact ? "11" : "12"}
                      fontFamily="var(--font-mono), monospace"
                      fontWeight="500"
                    >
                      {pos[1]}
                    </text>
                  </g>
                )}

                {/* Bottom string letter */}
                <text
                  x={x}
                  y={height - 6}
                  textAnchor="middle"
                  fill="var(--muted)"
                  fontSize="11"
                  fontFamily="var(--font-mono), monospace"
                >
                  {idx === 5 ? "e" : guitarStrings[idx].name.replace(/\d/, "")}
                </text>

                {/* Invisible clickable column hit target for plucking individual strings */}
                {!muted && (
                  <rect
                    x={x - gridW / 10}
                    y={padTop - 22}
                    width={gridW / 5}
                    height={gridH + 26}
                    fill="transparent"
                    className="cursor-pointer"
                    onClick={() => void handlePluck(idx)}
                  />
                )}
              </g>
            );
          })}
        </svg>

        <p className="sr-only">{description}</p>
      </div>

      {showStrum && (
        <button
          type="button"
          onClick={() => void handleStrum()}
          className="btn-secondary min-h-11 px-4 text-[14px]"
          aria-label={`Strum ${chord.fullName}`}
        >
          <Volume2
            size={15}
            strokeWidth={1.5}
            aria-hidden="true"
            className={strumming ? "text-[var(--accent)]" : undefined}
          />
          <span>Strum {chord.name}</span>
        </button>
      )}
    </div>
  );
}
