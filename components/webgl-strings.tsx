"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";
import { guitarStrings, type Chord } from "../lib/chords";
import { fretHz, openAudio, pluckString, strumChord } from "../lib/sound";
import { getResolvedTheme } from "../lib/theme";
import { ticker } from "../lib/ticker";

export type WebGLStringsHandle = {
  pluck: (stringIndex: number, silent?: boolean) => void;
  strum: (targetChord?: Chord, direction?: "down" | "up") => void;
};

// Display rows top-to-bottom: High E (idx 5) at top, Low E (idx 0) at bottom (standard TAB layout)
const DISPLAY_ORDER = [5, 4, 3, 2, 1, 0] as const;

// Exact fret line x positions in normalized [0..1] UV space (nut + 4 frets + bridge span)
const NUT_X = 0.088;
const FRET_LINES = [0.26, 0.43, 0.6, 0.77] as const;
const FRET_CENTERS = [0.174, 0.345, 0.515, 0.685] as const;

function stringRowY(displayRow: number): number {
  return 0.12 + (displayRow / 5) * 0.72;
}

const VERTEX_SHADER = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

/**
 * Specular-lit 6-string physical guitar fretboard shader.
 * Uses vec3 pairs (A = rows 0..2, B = rows 3..5) instead of GLSL uniform arrays
 * so OGL uniform binding is 100% warning-free across all WebGL 1/2 drivers.
 */
const FRAGMENT_SHADER = `
precision highp float;
varying vec2 vUv;

uniform vec2 uRes;
uniform float uDark;
uniform vec3 uAmpA;
uniform vec3 uAmpB;
uniform vec3 uPhaseA;
uniform vec3 uPhaseB;
uniform vec3 uFretA;
uniform vec3 uFretB;
uniform vec3 uMutedA;
uniform vec3 uMutedB;

float pick6(vec3 a, vec3 b, int i) {
  if (i == 0) return a.x;
  if (i == 1) return a.y;
  if (i == 2) return a.z;
  if (i == 3) return b.x;
  if (i == 4) return b.y;
  return b.z;
}

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
  float aspect = uRes.x / max(uRes.y, 1.0);

  // Architectural fingerboard ground (gallery stone-white or matte obsidian ebony)
  vec3 bgLight = mix(vec3(0.969, 0.967, 0.962), vec3(0.948, 0.946, 0.940), uv.y);
  vec3 bgDark  = mix(vec3(0.072, 0.072, 0.078), vec3(0.050, 0.050, 0.055), uv.y);
  vec3 col = mix(bgLight, bgDark, uDark);

  // Subtle wood-grain micro-sheen
  float grain = sin(uv.y * 190.0 + sin(uv.x * 9.0) * 1.4) * 0.5 + 0.5;
  col += (grain - 0.5) * mix(0.007, 0.011, uDark);

  // Left nut margin
  float nutX = 0.088;
  if (uv.x < nutX - 0.004) {
    col = mix(col, mix(vec3(0.992, 0.992, 0.990), vec3(0.047, 0.047, 0.051), uDark), 0.85);
  }

  // Machined nut bar
  float dNut = abs(uv.x - nutX) * uRes.x;
  float nutMask = 1.0 - smoothstep(1.2, 2.8, dNut);
  vec3 nutCol = mix(vec3(0.14, 0.14, 0.15), vec3(0.76, 0.75, 0.72), uDark);
  col = mix(col, nutCol, nutMask * 0.92);

  // Machined nickel-silver fret wires (frets 1..4)
  float frets[4];
  frets[0] = 0.26;
  frets[1] = 0.43;
  frets[2] = 0.60;
  frets[3] = 0.77;

  for (int f = 0; f < 4; f++) {
    float fx = frets[f];
    float dx = (uv.x - fx) * uRes.x;
    float wire = exp(-dx * dx * 0.78);
    float shadow = exp(-(dx - 2.2) * (dx - 2.2) * 0.35);
    vec3 wireCol = mix(vec3(0.72, 0.72, 0.74), vec3(0.42, 0.42, 0.46), uDark);
    col = mix(col, col * mix(0.92, 0.62, uDark), shadow * 0.45);
    col = mix(col, wireCol, wire * 0.85);
  }

  // Fret-3 center pearl inlay landmark
  vec2 inlayPos = vec2(0.515, 0.48);
  vec2 dInlay = (uv - inlayPos) * vec2(aspect, 1.0);
  float rInlay = length(dInlay);
  float dotMask = 1.0 - smoothstep(0.016, 0.022, rInlay);
  vec3 dotCol = mix(vec3(0.84, 0.84, 0.82), vec3(0.22, 0.22, 0.24), uDark);
  col = mix(col, dotCol, dotMask * 0.65);

  // Render all 6 strings (row 0 = High e4 at top, row 5 = Low E2 at bottom)
  for (int row = 0; row < 6; row++) {
    float baseY = 0.12 + (float(row) / 5.0) * 0.72;
    float amp = pick6(uAmpA, uAmpB, row);
    float phase = pick6(uPhaseA, uPhaseB, row);
    float fretStart = pick6(uFretA, uFretB, row);
    float muted = pick6(uMutedA, uMutedB, row);

    float radiusPx = mix(0.75, 2.05, float(row) / 5.0);

    // Physical standing-wave displacement strictly from fretted point to right bridge
    float disp = 0.0;
    float envSpan = 0.0;
    if (uv.x > fretStart && muted < 0.5) {
      float spanT = clamp((uv.x - fretStart) / max(0.05, 1.0 - fretStart), 0.0, 1.0);
      float shape = sin(3.14159265 * spanT);
      envSpan = shape * amp;
      float fundamental = sin(phase) * shape;
      float overtone = 0.26 * sin(phase * 2.03 + 0.6) * sin(6.2831853 * spanT);
      disp = (fundamental + overtone) * amp * 0.036;
    }

    float dyPx = (uv.y - (baseY + disp)) * uRes.y;
    float dist = abs(dyPx);

    // Contact shadow cast onto the fretboard beneath the string (starts at nut)
    if (uv.x >= nutX) {
      float shadowDy = (uv.y - (baseY + disp * 0.45 + 0.013)) * uRes.y;
      float shadowAmt = exp(-(shadowDy * shadowDy) / (radiusPx * radiusPx * 5.2));
      col *= 1.0 - shadowAmt * mix(0.09, 0.34, uDark) * (1.0 - muted * 0.6);
    }

    // Motion-blur standing-wave envelope while ringing
    if (envSpan > 0.01 && uv.x >= nutX) {
      float envHalfPx = envSpan * 0.038 * uRes.y + radiusPx;
      float envDist = abs((uv.y - baseY) * uRes.y);
      float blurMask = exp(-(envDist * envDist) / max(1.0, envHalfPx * envHalfPx * 0.55));
      vec3 energyCol = mix(vec3(0.80, 0.20, 0.09), vec3(0.94, 0.34, 0.23), uDark);
      col = mix(col, energyCol, blurMask * envSpan * 0.28);
    }

    // Core metallic wire starts cleanly from the nut rightward so left nut labels read clear
    if (uv.x >= nutX - 0.002) {
      float core = 1.0 - smoothstep(radiusPx * 0.55, radiusPx * 1.25, dist);
      if (core > 0.001) {
        float isWound = step(2.5, float(row));
        float winding = 0.5 + 0.5 * sin(uv.x * uRes.x * 1.85);

        vec3 bronzeLight = vec3(0.54, 0.38, 0.20);
        vec3 bronzeDark  = vec3(0.82, 0.64, 0.40);
        vec3 steelLight  = vec3(0.24, 0.25, 0.27);
        vec3 steelDark   = vec3(0.76, 0.77, 0.80);

        vec3 wireBase = mix(
          mix(steelLight, steelDark, uDark),
          mix(bronzeLight, bronzeDark, uDark),
          isWound
        );

        float normY = clamp(dyPx / max(radiusPx, 0.5), -1.0, 1.0);
        float spec = pow(max(0.0, 1.0 - abs(normY + 0.32)), 3.2);
        wireBase += spec * mix(0.28, 0.36, uDark);
        wireBase *= 1.0 - isWound * (1.0 - winding) * 0.14;

        vec3 activeTint = mix(vec3(0.80, 0.20, 0.09), vec3(0.95, 0.44, 0.30), uDark);
        wireBase = mix(wireBase, activeTint, clamp(envSpan * 0.9, 0.0, 0.72));

        float alpha = core * mix(1.0, 0.24, muted);
        col = mix(col, wireBase, alpha);
      }
    }
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

export const WebGLStrings = forwardRef<
  WebGLStringsHandle,
  {
    chord: Chord;
    onNoteSounded?: (info: string) => void;
    compact?: boolean;
  }
>(function WebGLStrings({ chord, onNoteSounded, compact = false }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [lastPluckedRow, setLastPluckedRow] = useState<number | null>(null);

  const chordRef = useRef(chord);
  chordRef.current = chord;

  // Per-row physics state (row 0 = High e4 .. row 5 = Low E2)
  const ampRef = useRef<Float32Array>(new Float32Array(6));
  const phaseRef = useRef<Float32Array>(new Float32Array(6));
  const omegaRef = useRef<Float32Array>(new Float32Array([235, 198, 170, 145, 122, 102]));
  const fretXRef = useRef<Float32Array>(new Float32Array(6));
  const mutedRef = useRef<Float32Array>(new Float32Array(6));

  // Reusable vec3 uniform arrays (zero per-frame allocations)
  const uAmpA = useRef(new Float32Array(3));
  const uAmpB = useRef(new Float32Array(3));
  const uPhaseA = useRef(new Float32Array(3));
  const uPhaseB = useRef(new Float32Array(3));
  const uFretA = useRef(new Float32Array(3));
  const uFretB = useRef(new Float32Array(3));
  const uMutedA = useRef(new Float32Array(3));
  const uMutedB = useRef(new Float32Array(3));

  const glStateRef = useRef<{
    renderer: Renderer;
    mesh: Mesh;
    program: Program;
  } | null>(null);
  const tickUnsubRef = useRef<(() => void) | null>(null);
  const draggingRef = useRef(false);
  const lastDragRowRef = useRef(-1);
  const reducedMotionRef = useRef(false);

  const syncChordUniforms = useCallback((nextChord: Chord) => {
    for (let row = 0; row < 6; row++) {
      const sIdx = DISPLAY_ORDER[row];
      const pos = nextChord.strings[sIdx];
      if (pos === "x") {
        mutedRef.current[row] = 1;
        fretXRef.current[row] = NUT_X;
      } else if (pos === 0) {
        mutedRef.current[row] = 0;
        fretXRef.current[row] = NUT_X;
      } else {
        mutedRef.current[row] = 0;
        const fretIndex = Math.max(0, Math.min(3, pos[0] - 1));
        fretXRef.current[row] = FRET_LINES[fretIndex];
      }
    }
  }, []);

  const renderSingleFrame = useCallback(() => {
    const glState = glStateRef.current;
    if (!glState) return;
    const { renderer, mesh, program } = glState;

    const a = ampRef.current;
    const p = phaseRef.current;
    const f = fretXRef.current;
    const m = mutedRef.current;

    uAmpA.current[0] = a[0];
    uAmpA.current[1] = a[1];
    uAmpA.current[2] = a[2];
    uAmpB.current[0] = a[3];
    uAmpB.current[1] = a[4];
    uAmpB.current[2] = a[5];

    uPhaseA.current[0] = p[0];
    uPhaseA.current[1] = p[1];
    uPhaseA.current[2] = p[2];
    uPhaseB.current[0] = p[3];
    uPhaseB.current[1] = p[4];
    uPhaseB.current[2] = p[5];

    uFretA.current[0] = f[0];
    uFretA.current[1] = f[1];
    uFretA.current[2] = f[2];
    uFretB.current[0] = f[3];
    uFretB.current[1] = f[4];
    uFretB.current[2] = f[5];

    uMutedA.current[0] = m[0];
    uMutedA.current[1] = m[1];
    uMutedA.current[2] = m[2];
    uMutedB.current[0] = m[3];
    uMutedB.current[1] = m[4];
    uMutedB.current[2] = m[5];

    program.uniforms.uDark.value = getResolvedTheme() === "dark" ? 1 : 0;
    renderer.render({ scene: mesh });
  }, []);

  const ensureLoop = useCallback(() => {
    if (reducedMotionRef.current) {
      renderSingleFrame();
      return;
    }
    if (tickUnsubRef.current) return;
    tickUnsubRef.current = ticker.subscribe((_now, dt) => {
      let maxAmp = 0;
      for (let row = 0; row < 6; row++) {
        if (ampRef.current[row] > 0.002) {
          phaseRef.current[row] += omegaRef.current[row] * dt;
          ampRef.current[row] *= Math.exp(-1.72 * dt);
          if (ampRef.current[row] > maxAmp) maxAmp = ampRef.current[row];
        } else {
          ampRef.current[row] = 0;
        }
      }
      renderSingleFrame();
      if (maxAmp <= 0.002) {
        if (tickUnsubRef.current) {
          tickUnsubRef.current();
          tickUnsubRef.current = null;
        }
      }
    });
  }, [renderSingleFrame]);

  const exciteRow = useCallback(
    (stringIndex: number, silent = false) => {
      const row = DISPLAY_ORDER.indexOf(stringIndex as (typeof DISPLAY_ORDER)[number]);
      if (row === -1) return;
      const pos = chordRef.current.strings[stringIndex];
      if (pos === "x") return;
      const fret = pos === 0 ? 0 : pos[0];
      const hz = fretHz(stringIndex, fret);

      ampRef.current[row] = 1.0;
      phaseRef.current[row] = 0;
      ensureLoop();
      setLastPluckedRow(row);

      const noteInfo = `${guitarStrings[stringIndex].label} (${guitarStrings[stringIndex].name}${fret > 0 ? ` · fret ${fret}` : " · open"}) · ${hz.toFixed(1)} Hz`;
      onNoteSounded?.(noteInfo);

      if (!silent) {
        void openAudio()
          .then((ctx) => {
            pluckString({
              context: ctx,
              hz,
              volume: 0.34,
              brightness: stringIndex < 3 ? 0.48 : 0.64,
            });
          })
          .catch(() => {
            // Audio unavailable
          });
      }
    },
    [ensureLoop, onNoteSounded]
  );

  const performStrum = useCallback(
    (targetChord?: Chord, direction: "down" | "up" = "down") => {
      const c = targetChord ?? chordRef.current;
      syncChordUniforms(c);
      onNoteSounded?.(`${c.name} · ${c.fullName}`);

      void openAudio()
        .then((ctx) => {
          strumChord({
            context: ctx,
            chord: c,
            direction,
            spreadSeconds: 0.032,
            onStringPluck: (sIdx) => {
              const row = DISPLAY_ORDER.indexOf(sIdx as (typeof DISPLAY_ORDER)[number]);
              if (row !== -1) {
                ampRef.current[row] = 0.92;
                phaseRef.current[row] = 0;
                ensureLoop();
              }
            },
          });
        })
        .catch(() => {
          for (let i = 0; i < 6; i++) {
            if (c.strings[i] !== "x") {
              const row = DISPLAY_ORDER.indexOf(i as (typeof DISPLAY_ORDER)[number]);
              if (row !== -1) ampRef.current[row] = 0.85;
            }
          }
          ensureLoop();
        });
    },
    [ensureLoop, onNoteSounded, syncChordUniforms]
  );

  useImperativeHandle(
    ref,
    () => ({
      pluck: exciteRow,
      strum: performStrum,
    }),
    [exciteRow, performStrum]
  );

  useEffect(() => {
    syncChordUniforms(chord);
    renderSingleFrame();
  }, [chord, renderSingleFrame, syncChordUniforms]);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let renderer: Renderer | null = null;
    try {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      renderer = new Renderer({
        canvas,
        dpr,
        alpha: false,
        antialias: false,
        powerPreference: "low-power",
      });
      const gl = renderer.gl;
      if (!gl) throw new Error("No WebGL context");

      const geometry = new Triangle(gl);
      const program = new Program(gl, {
        vertex: VERTEX_SHADER,
        fragment: FRAGMENT_SHADER,
        uniforms: {
          uRes: { value: new Float32Array([800, 320]) },
          uDark: { value: getResolvedTheme() === "dark" ? 1 : 0 },
          uAmpA: { value: uAmpA.current },
          uAmpB: { value: uAmpB.current },
          uPhaseA: { value: uPhaseA.current },
          uPhaseB: { value: uPhaseB.current },
          uFretA: { value: uFretA.current },
          uFretB: { value: uFretB.current },
          uMutedA: { value: uMutedA.current },
          uMutedB: { value: uMutedB.current },
        },
      });
      const mesh = new Mesh(gl, { geometry, program });
      glStateRef.current = { renderer, mesh, program };
      syncChordUniforms(chordRef.current);

      const resize = () => {
        if (!containerRef.current || !glStateRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const w = Math.max(200, Math.round(rect.width));
        const h = Math.max(180, Math.round(rect.height));
        glStateRef.current.renderer.setSize(w, h);
        // Clear inline pixel dimensions set by OGL so CSS absolute inset-0 governs layout cleanly
        canvas.style.width = "";
        canvas.style.height = "";
        glStateRef.current.program.uniforms.uRes.value = new Float32Array([w, h]);
        renderSingleFrame();
      };

      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(container);

      const onTheme = () => renderSingleFrame();
      window.addEventListener("firstsong:theme-change", onTheme);

      const mediaTheme = window.matchMedia("(prefers-color-scheme: dark)");
      mediaTheme.addEventListener("change", onTheme);

      return () => {
        ro.disconnect();
        window.removeEventListener("firstsong:theme-change", onTheme);
        mediaTheme.removeEventListener("change", onTheme);
        if (tickUnsubRef.current) {
          tickUnsubRef.current();
          tickUnsubRef.current = null;
        }
        glStateRef.current = null;
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
    } catch {
      setFallbackMode(true);
      return undefined;
    }
  }, [renderSingleFrame, syncChordUniforms]);

  function rowFromClientY(clientY: number): number {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.height <= 0) return -1;
    const relY = (clientY - rect.top) / rect.height;
    let closest = 0;
    let bestDist = Infinity;
    for (let row = 0; row < 6; row++) {
      const d = Math.abs(relY - stringRowY(row));
      if (d < bestDist) {
        bestDist = d;
        closest = row;
      }
    }
    return bestDist < 0.085 ? closest : -1;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const row = rowFromClientY(event.clientY);
    lastDragRowRef.current = row;
    if (row !== -1) {
      exciteRow(DISPLAY_ORDER[row]);
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!draggingRef.current) return;
    const row = rowFromClientY(event.clientY);
    if (row !== -1 && row !== lastDragRowRef.current) {
      lastDragRowRef.current = row;
      exciteRow(DISPLAY_ORDER[row]);
    }
  }

  function handlePointerUp() {
    draggingRef.current = false;
    lastDragRowRef.current = -1;
  }

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-full min-w-0 select-none touch-none overflow-hidden rounded-[var(--r-sm)] border border-[var(--line)] bg-[var(--surface)] ${
        compact ? "h-[248px] sm:h-[280px]" : "h-[268px] sm:h-[310px] lg:h-[348px]"
      }`}
      aria-label={`Interactive six-string guitar neck showing ${chord.fullName}`}
    >
      {/* OGL WebGL Specular String Canvas (absolute inset-0 so it never expands intrinsic grid width) */}
      {!fallbackMode ? (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full cursor-crosshair"
        />
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 1000 340"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <line x1="88" y1="0" x2="88" y2="340" stroke="var(--ink)" strokeWidth="4" />
          {FRET_LINES.map((fx, i) => (
            <line
              key={i}
              x1={fx * 1000}
              y1="0"
              x2={fx * 1000}
              y2="340"
              stroke="var(--line-strong)"
              strokeWidth="2"
            />
          ))}
          {DISPLAY_ORDER.map((sIdx, row) => {
            const y = stringRowY(row) * 340;
            const muted = chord.strings[sIdx] === "x";
            return (
              <line
                key={sIdx}
                x1="88"
                y1={y}
                x2="1000"
                y2={y}
                stroke={row >= 3 ? "var(--brass)" : "var(--ink-soft)"}
                strokeWidth={1.2 + row * 0.45}
                opacity={muted ? 0.25 : lastPluckedRow === row ? 1 : 0.85}
              />
            );
          })}
        </svg>
      )}

      {/* Left Nut Accessible String Pluck Buttons (High e top -> Low E bottom) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[8.8%] min-w-[34px]">
        {DISPLAY_ORDER.map((sIdx, row) => {
          const pos = chord.strings[sIdx];
          const muted = pos === "x";
          const note = guitarStrings[sIdx];
          const fret = pos === "x" || pos === 0 ? 0 : pos[0];
          const letter = sIdx === 5 ? "e" : note.name.replace(/\d/, "");
          return (
            <button
              key={note.name}
              type="button"
              disabled={muted}
              onClick={() => exciteRow(sIdx)}
              aria-label={
                muted
                  ? `${note.label} string muted in ${chord.name}`
                  : `Pluck ${note.label} string (${note.name}${fret > 0 ? `, fret ${fret}` : ", open"})`
              }
              style={{ top: `${stringRowY(row) * 100}%` }}
              className="pointer-events-auto absolute left-0 flex h-11 w-full -translate-y-1/2 cursor-pointer items-center justify-center font-mono-num text-[13px] font-medium text-[var(--ink-soft)] transition-colors duration-150 hover:text-[var(--accent)] disabled:cursor-default disabled:opacity-35"
            >
              <span aria-hidden="true">{muted ? "×" : letter}</span>
            </button>
          );
        })}
      </div>

      {/* Chord Finger Markers (GPU transform: translate3d + scale) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {DISPLAY_ORDER.map((sIdx, row) => {
          const pos = chord.strings[sIdx];
          const isFretted = Array.isArray(pos);
          const fret = isFretted ? pos[0] : 1;
          const finger = isFretted ? pos[1] : 0;
          const leftPct = FRET_CENTERS[Math.max(0, Math.min(3, fret - 1))] * 100;
          const topPct = stringRowY(row) * 100;

          return (
            <span
              key={sIdx}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: isFretted
                  ? "translate3d(-50%, -50%, 0) scale(1)"
                  : "translate3d(-50%, -50%, 0) scale(0.55)",
                opacity: isFretted ? 1 : 0,
              }}
              className="font-mono-num absolute flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ink)] text-[13px] font-medium text-[var(--bg)] transition-[transform,opacity] duration-250 ease-[var(--ease-enter)]"
            >
              {finger || ""}
            </span>
          );
        })}
      </div>

      {/* Bottom Fret Numbers (cleanly positioned inside bottom margin, zero clipping) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-2 h-4 text-[12px] leading-none text-[var(--muted)]"
      >
        {FRET_CENTERS.map((cx, i) => (
          <span
            key={i}
            style={{ left: `${cx * 100}%` }}
            className="font-mono-num absolute bottom-0 -translate-x-1/2"
          >
            {i + 1}
          </span>
        ))}
      </div>
    </div>
  );
});
