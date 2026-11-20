# Firstsong Design System (v2)

Firstsong is a free six-week beginner guitar and songwriting studio built with Next.js (static export), React 19, Tailwind CSS v4, OGL WebGL, GSAP, and Web Audio API.

## Architecture & Visual Direction

- **Ground & Polarity:** Dual-mode gallery monochrome implemented with native CSS `color-scheme: light dark`, CSS `light-dark()`, and a zero-FOUC `<meta name="color-scheme">` override (`lib/theme.ts`).
  - Gallery Light: `#ffffff` ground, `#f5f5f4` recessed well, `#111111` ink, `#5e5e64` muted ink, `rgb(17 17 17 / 0.11)` hairlines.
  - Studio Obsidian: `#0c0c0d` ground, `#141416` recessed well, `#ededeb` warm bone ink, `#8c8c88` muted ink, `rgb(237 237 235 / 0.12)` hairlines.
  - Earned semantic signals only (< 2% area): vermilion (`#cc3318` / `#f0573a`) for active pluck energy, primary accents, and live recording; emerald (`#0f7546` / `#32c97d`) for in-tune microphone pitch lock (`±4¢`) and completed steps; phosphor-bronze (`#9a6f3a` / `#cfa269`) for wound bass strings.
- **Typography:** Self-hosted `Geist` (variable sans, weights 400 and 500 only; tight negative display tracking `-0.035em` to `-0.042em`) paired with `IBM Plex Mono` (400 and 500 strictly for Hz, cents, BPM, TAB frets, keycaps, and timers). Three `.woff2` files (57.6 KB total, OFL licensed in `public/font-licenses/`).
- **Layout:** Single equal-edge container (`.shell-wrap`, max `1320px`, responsive gutter `20px` / `40px` / `64px`). Zero nested bordered cards; separation via whitespace and `1px` hairlines. Authored compositions for `390px`, `768px`, `1280px`, `1440px`, and `1920px`.
- **Icons:** Single uniform icon family (`lucide-react`, `1.5px` stroke).

## Core Interactive Engines

- **WebGL Playable 6-String Neck (`components/webgl-strings.tsx`):** Custom OGL fragment shader rendering specular-lit wound bass and plain steel treble strings, fret wires, nut, and physically bounded standing-wave vibration from the active fretted position to the bridge. Capped at DPR `1.5` and automatically unsubscribes from the shared RAF ticker (`lib/ticker.ts`) when strings settle.
- **Physical Acoustic Guitar Audio (`lib/sound.ts`):** Extended Karplus-Strong string synthesis with fractional delay tuning (`A4 = 440 Hz`), pick-position comb filtering, cached `AudioBuffer`s, and a dreadnought soundboard body filter chain.
- **Live Microphone Pitch Tuner (`lib/pitch.ts`, `components/practice-tools.tsx`):** Pure TypeScript YIN autocorrelation pitch detector (`65–440 Hz`, zero per-frame allocations) driving a ref-mutated strobe/cents needle with zero React re-renders.
- **Orbital Chord Wheel (`components/orbital-wheel.tsx`):** Shortest-path GPU-transformed orbital selector (desktop/tablet) paired with a thumb-first horizontal chord strip on mobile (`< 640px`), supporting pointer drag, click, and `← / →` keyboard rotation.
- **Native Top-Layer Command Palette & Mobile Sheet (`components/site-frame.tsx`, `lib/dialog-close.ts`):** `<dialog>` overlays animated via `@starting-style` and `transition-behavior: allow-discrete` with automatic Firefox/Safari exit animation fallback.
