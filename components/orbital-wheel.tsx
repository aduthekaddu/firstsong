"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Volume2 } from "lucide-react";
import type { Chord } from "../lib/chords";

function formatFingering(chord: Chord): string {
  return chord.strings
    .map((s) => (s === "x" ? "x" : s === 0 ? "0" : String(s[0])))
    .join(" ");
}

/**
 * Vitra-inspired spatial orbital chord selector (desktop/tablet) +
 * authored thumb-first horizontal selector (phone < 640px).
 * Zero nested card boxes: floats directly on the gallery/obsidian ground.
 */
export function OrbitalChordWheel({
  items,
  activeIndex,
  onSelect,
  onStrum,
  size = "compact",
}: {
  items: readonly Chord[];
  activeIndex: number;
  onSelect: (index: number, shouldAudition?: boolean) => void;
  onStrum: (chord: Chord) => void;
  size?: "compact" | "stage";
}) {
  const count = items.length;
  const activeChord = items[activeIndex] ?? items[0];

  // Track continuous shortest-path rotation angle in degrees so wheel never whips backward
  const [rotationDeg, setRotationDeg] = useState(0);
  const prevIdxRef = useRef(activeIndex);
  const dragRef = useRef<{ active: boolean; startAngle: number; startRot: number; moved: boolean }>({
    active: false,
    startAngle: 0,
    startRot: 0,
    moved: false,
  });
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = prevIdxRef.current;
    if (prev === activeIndex) return;
    const stepDeg = 360 / count;
    let delta = activeIndex - prev;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    prevIdxRef.current = activeIndex;
    setRotationDeg((r) => r - delta * stepDeg);
  }, [activeIndex, count]);

  const radius = size === "stage" ? 156 : 122;
  const boxSize = size === "stage" ? 372 : 300;
  const stepDeg = 360 / count;

  function stepBy(dir: -1 | 1) {
    const next = (activeIndex + dir + count) % count;
    onSelect(next, true);
  }

  function pointerAngle(clientX: number, clientY: number): number {
    const rect = wheelRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(clientY - cy, clientX - cx) * 180) / Math.PI;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    dragRef.current = {
      active: true,
      startAngle: pointerAngle(event.clientX, event.clientY),
      startRot: rotationDeg,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current.active) return;
    const current = pointerAngle(event.clientX, event.clientY);
    let diff = current - dragRef.current.startAngle;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    if (Math.abs(diff) > 4) dragRef.current.moved = true;
    setRotationDeg(dragRef.current.startRot + diff);
  }

  function handlePointerUp() {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (!dragRef.current.moved) return;
    // Snap to closest index
    const snappedSteps = Math.round(-rotationDeg / stepDeg);
    const nextIdx = ((snappedSteps % count) + count) % count;
    prevIdxRef.current = nextIdx;
    setRotationDeg(-snappedSteps * stepDeg);
    onSelect(nextIdx, true);
  }

  return (
    <div className="flex flex-col items-center">
      {/* Authored Phone Composition (< 640px): clean touch chord strip + centerpiece */}
      <div className="w-full space-y-4 sm:hidden">
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Choose a chord"
        >
          {items.map((chord, idx) => {
            const active = idx === activeIndex;
            return (
              <button
                key={chord.name}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelect(idx, true)}
                className={`min-h-11 min-w-[54px] flex-1 cursor-pointer rounded-[var(--r-sm)] border px-3 text-[14px] font-medium transition-colors duration-150 ${
                  active
                    ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                    : "border-[var(--line-strong)] bg-transparent text-[var(--ink)]"
                }`}
              >
                {chord.name}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] pt-3">
          <div key={activeChord.name} className="roll-enter">
            <p className="text-[24px] leading-tight tracking-[-0.03em] text-[var(--ink)]">
              {activeChord.name}{" "}
              <span className="text-[15px] text-[var(--muted)]">{activeChord.fullName}</span>
            </p>
            <p className="font-mono-num mt-0.5 text-[13px] text-[var(--muted)]">
              {formatFingering(activeChord)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onStrum(activeChord)}
            className="btn-primary shrink-0"
          >
            <Volume2 size={15} strokeWidth={1.5} aria-hidden="true" />
            <span>Strum {activeChord.name}</span>
          </button>
        </div>
      </div>

      {/* Tablet & Desktop Composition (>= 640px): Vitra Orbital Ring */}
      <div className="hidden sm:flex sm:flex-col sm:items-center">
        <div
          ref={wheelRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{ width: boxSize, height: boxSize }}
          className="relative flex cursor-grab items-center justify-center select-none touch-none active:cursor-grabbing"
          aria-label="Orbital chord wheel"
        >
          {/* Precision hairline orbital track + 12 o'clock index tick */}
          <svg
            aria-hidden="true"
            viewBox={`0 0 ${boxSize} ${boxSize}`}
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <circle
              cx={boxSize / 2}
              cy={boxSize / 2}
              r={radius}
              fill="none"
              stroke="var(--line)"
              strokeWidth="1"
            />
            <line
              x1={boxSize / 2}
              y1={boxSize / 2 - radius + 29}
              x2={boxSize / 2}
              y2={boxSize / 2 - radius + 37}
              stroke="var(--accent)"
              strokeWidth="1.5"
            />
          </svg>

          {/* Orbiting chord nodes */}
          {items.map((chord, idx) => {
            const angleDeg = idx * stepDeg + rotationDeg - 90;
            const rad = (angleDeg * Math.PI) / 180;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            const active = idx === activeIndex;
            const nodeSize = count > 6 ? 48 : 54;

            return (
              <button
                key={chord.name}
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(idx, true)}
                style={{
                  width: nodeSize,
                  height: nodeSize,
                  marginLeft: -nodeSize / 2,
                  marginTop: -nodeSize / 2,
                  transform: `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${active ? 1.08 : 0.94})`,
                }}
                className={`absolute left-1/2 top-1/2 flex cursor-pointer items-center justify-center rounded-full border text-[14px] font-medium transition-[transform,background-color,color,border-color] duration-300 ease-[var(--ease-enter)] ${
                  active
                    ? "z-20 border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]"
                    : "z-10 border-[var(--line-strong)] bg-[var(--bg)] text-[var(--ink-soft)] hover:border-[var(--ink)] hover:text-[var(--ink)]"
                }`}
              >
                {chord.name}
              </button>
            );
          })}

          {/* Center Monolith Readout */}
          <div className="z-10 flex flex-col items-center text-center">
            <div key={activeChord.name} className="flex flex-col items-center">
              <span
                style={{ color: "var(--ink)" }}
                className={`${
                  size === "stage" ? "text-[52px]" : "text-[40px]"
                } leading-none font-normal tracking-[-0.04em]`}
              >
                {activeChord.name}
              </span>
              <span className="mt-1.5 text-[13px] text-[var(--muted)]">
                {activeChord.fullName}
              </span>
              <span className="font-mono-num mt-1 text-[13px] text-[var(--ink-soft)]">
                {formatFingering(activeChord)}
              </span>
            </div>

            <div className="mt-3.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => stepBy(-1)}
                aria-label="Previous chord"
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--ink)]"
              >
                <ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => onStrum(activeChord)}
                className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--line-strong)] px-3.5 text-[13px] font-medium text-[var(--ink)] transition-colors duration-150 hover:border-[var(--ink)] hover:bg-[var(--surface)]"
              >
                <Volume2 size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>Strum</span>
              </button>
              <button
                type="button"
                onClick={() => stepBy(1)}
                aria-label="Next chord"
                className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-[var(--muted)] transition-colors duration-150 hover:bg-[var(--surface)] hover:text-[var(--ink)]"
              >
                <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
