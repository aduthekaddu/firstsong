# FIRSTSONG design

FIRSTSONG is designed as a living **Urtext music plate and playable six-string acoustic instrument**. The home page opens with a full-bleed playable six-string guitar neck above a scroll-synced five-chord morphing fretboard (`Em → Asus2 → C → G → D`) and the Stage 0 Studio Bench.

## Color and typography

All tokens live in [`app/globals.css`](app/globals.css) in OKLCH (WCAG AA verified across all routes):

| Token | OKLCH | Use |
| --- | --- | --- |
| `--paper` | `oklch(0.972 0.008 90)` | Cotton engraving rag page ground |
| `--folio` | `oklch(0.994 0.003 90)` | Elevated studio bench & chord plates |
| `--vellum` | `oklch(0.936 0.011 90)` | Recessed fretboard & progression trays |
| `--ink` | `oklch(0.18 0.022 256)` | Intaglio blue-black primary ink |
| `--ink-muted` | `oklch(0.43 0.024 254)` | Annotations, captions, secondary copy |
| `--prussian` / `--cobalt` | `oklch(0.24 0.068 256)` / `oklch(0.43 0.145 254)` | Urtext sheet-music plates, interactive fretboard, focus & active states |
| `--cinnabar` | `oklch(0.51 0.188 28)` | Pressed fret finger dots, live audio, downbeat 1, active REC |
| `--bronze` | `oklch(0.75 0.115 78)` | 80/20 phosphor-bronze wound strings & open-string nut halos |
| `--verdigris` | `oklch(0.44 0.095 164)` | Verified tuned strings, kept rhythm takes, completed steps |

Three open-licensed (SIL OFL 1.1) Latin-subsetted variable fonts ship locally via `next/font/local` (preloaded, zero CLS) with licenses in [`public/font-licenses/`](public/font-licenses/):
- **Fraunces** (optical-size variable display serif, normal + italic)
- **Hanken Grotesk** (variable UI & instruction body)
- **Chivo Mono** (variable tabular monospace for Hz, BPM, TAB numerals, and plate indices)

## Motion and performance architecture

- One shared `requestAnimationFrame` ticker ([`lib/ticker.ts`](lib/ticker.ts)) drives Lenis smooth scroll and all active string/chord/metronome/meter animations, pausing automatically offscreen and when idle.
- Plucked strings render as GPU-composited standing-wave spindles and harmonic cores (`scale3d` + `opacity` only). Scroll-synced chord morphing and reveals drive zero React re-renders during scroll.
- `prefers-reduced-motion: reduce` disables Lenis and resolves all transitions immediately.

## Lesson data and browser storage

[`CURRICULUM.md`](CURRICULUM.md) and [`lib/lessons.ts`](lib/lessons.ts) define all stages, steps, stall responses, and checkpoints. Progress, lyric lines, rhythm choices, and 20-second audio takes stay in `localStorage` under `firstsong:v1:*`.
