# FIRSTSONG — Design Brief (Phase 2)

> Gate document: written and verified (including a 4× CPU throttle isolation spike) before writing any UI code. Re-read at the start of every phase so direction never drifts.

---

## 1. Three Concepts Explored & Selection

### Concept A — "URTEXT SCORE: THE LIVING INSTRUMENT" *(SELECTED)*
- **World:** G. Henle Verlag *Urtext* classical sheet-music engraving × ECM Records sleeve silence × physical acoustic guitar luthier elevation.
- **Palette:** Cotton rag score paper + deep Prussian-cobalt Urtext chapters + intaglio blue-black ink + cinnabar wax live-sound accent + phosphor-bronze wound strings + copper verdigris completion.
- **Type:** `Fraunces` (optical-size variable display serif with calligraphic italic) + `Hanken Grotesk` (clean humanist-grotesk UI/body) + `Chivo Mono` (engraved measure/Hz/BPM numerals).
- **Layout:** Asymmetric 12-column editorial sheet music grid anchored by a full-bleed 6-string tensioned instrument stage, a continuous scroll-synced fretboard neck margin, and bold Prussian-ink chapter bands.
- **Motion:** Plucked-string standing-wave physics, spring-gliding chord finger morphing synced to scroll, crisp mechanical detents, and curtain-wipe Urtext route transitions.

### Concept B — "PORTASTUDIO 4-TRACK" *(KILLED)*
- **World:** Late-night analog 4-track cassette desk (dark pine-felt charcoal, warm tungsten ochre VU meters, wide `Syne` + `Space Grotesk`).
- **Why killed:** Beginners sit with a guitar in their lap and read chord diagrams at arm's length on laptops and phones in lit rooms; dark-on-light engraving paper has dramatically better glanceable readability *and* avoids drifting anywhere near dark-mode DAW/SaaS clichés.

### Concept C — "CONCERT BROADSHEET" *(KILLED)*
- **World:** Brutalist Zurich *Musica Viva* concert poster (stark black/white, huge condensed uppercase `Anton`, kinetic tickers).
- **Why killed:** Shouts instead of listening. FIRSTSONG teaches an intimate human act — writing one true line from memory and singing it over an E minor chord. It needs sculptural drama *and* warmth/restraint.

**Why Concept A wins:** Nobody in guitar education has ever built an interface rooted in fine sheet-music engraving (*Urtext*) fused with a real, playable, scroll-responsive physical string instrument. It rejects both the EdTech subscription-funnel trope (JustinGuitar/Yousician/Fender Play) and the fake beige/vermilion Swiss-hardware template from the rejected UI.

---

## 2. The One Unifying Concept

**FIRSTSONG is a living Urtext music plate and playable acoustic guitar: six tensioned strings, engraved musical typography, and scroll-synced chord morphing guide a complete beginner from their first plucked open E to a recorded 15-second original song.**

Every visual element derives from two physical objects:
1. **The Engraved Sheet (`Urtext`):** Rag paper, deep Prussian-cobalt ink plates, fine stave hairlines, measure numbers (`00`, `01`, `I–IV`), optical serif headlines with singing italics.
2. **The Acoustic Instrument:** Six gauged strings (phosphor bronze wound E–G, bare steel B–e), fret wires as section markers, standing-wave vibration on touch, finger positions gliding between open chords, and real plucked-string Karplus-Strong Web Audio.

---

## 3. Palette (OKLCH — Neutrals + 4 Deliberate Colours)

All colours are specified in perceptually uniform OKLCH and verified for WCAG AA (≥ 4.5:1 body, ≥ 3:1 large display/UI).

### Neutrals
| Token | OKLCH | Role |
| --- | --- | --- |
| `--paper` | `oklch(0.972 0.008 90)` | Primary page canvas — bright cotton engraving rag |
| `--folio` | `oklch(0.994 0.003 90)` | Elevated sheet / lesson desk surface |
| `--vellum` | `oklch(0.938 0.011 90)` | Recessed bench, chord diagram field, practice tray |
| `--rule` | `oklch(0.18 0.022 256 / 0.14)` | Stave hairlines and plate borders |
| `--rule-strong` | `oklch(0.18 0.022 256 / 0.82)` | Primary plate dividers and nut bars |
| `--ink` | `oklch(0.18 0.022 256)` | Intaglio blue-black primary ink (~14.8:1 on `--paper`) |
| `--ink-muted` | `oklch(0.43 0.024 254)` | Annotations, captions, secondary copy (~6.4:1 on `--paper`) |

### The 4 Deliberate Colours
| Token | OKLCH | Rationale & Usage |
| --- | --- | --- |
| 1. `--prussian` / `--cobalt` | Deep `oklch(0.24 0.068 256)` / Bright `oklch(0.43 0.145 254)` | **Urtext Publishing Heritage** (inspired by G. Henle Verlag scores). Deep Prussian anchors the full-bleed instrument stage, scroll-morphing fretboard plate, and route transition curtain; Cobalt marks active links, italic accents, and focus (~7.1:1 on `--paper`). |
| 2. `--cinnabar` | `oklch(0.51 0.188 28)` | **Live Sound & Action** (wax seal / studio REC tally). Strictly reserved for pressed fret finger dots, plucked string energy, active REC indicators, and downbeat `1` (~5.1:1 with `--folio`). |
| 3. `--bronze` | `oklch(0.60 0.115 74)` | **80/20 Phosphor Bronze** (real acoustic wound strings E2–G3 and open-string nut halos). Warm metallic counterpoint to Prussian cobalt. |
| 4. `--verdigris` | `oklch(0.44 0.095 164)` | **Kept & Tuned** (oxidized acoustic copper-green). Marks completed lesson steps, tuned strings, and "Kept" rhythm choices (~5.7:1 on `--paper`). |

*(No gradients, no glow orbs, no translucent frosted glass.)*

---

## 4. Typography (2 Families + Mono, Open-Licensed OFL Variable)

Tested 3 real pairings visually in Chromium with real FIRSTSONG copy (`redesign-notes` specimen):
- **Pairing 01 (WINNER): `Fraunces` + `Hanken Grotesk` + `Chivo Mono`** — unmistakable musical/sculptural personality at display scale, effortless readability in UI, crisp editorial mono numerals.
- *Pairing 02 (`Newsreader` + `Bricolage Grotesque` + `Azeret Mono`):* rejected — slightly newspaper-stiff serif, wide UI sans.
- *Pairing 03 (`Cormorant` + `Figtree` + `IBM Plex Mono`):* rejected — fragile serif hairlines at mid-sizes.

### Font Stack & Licensing
- **Display:** `@fontsource-variable/fraunces` (OFL 1.1, Latin woff2 subset only, `opsz` 9–144, `SOFT` 30, `WONK` 1, normal + italic). Preloaded.
- **Body / UI:** `@fontsource-variable/hanken-grotesk` (OFL 1.1, Latin woff2 subset only, `wght` 400–700).
- **Notation / Technical Mono:** `@fontsource-variable/chivo-mono` (OFL 1.1, Latin woff2 subset only, `wght` 400–600, `font-variant-numeric: tabular-nums`).
- *(Remove `@fontsource/instrument-serif`, `@fontsource-variable/dm-sans`, `@fontsource-variable/jetbrains-mono` completely — and only import Latin subsets to cut font payload from 260 KB across 16 files down to ~110 KB across 4 woff2 files!)*

### Fluid Type Scale (Extreme Display-to-Micro Contrast: ~9.5×)
- `--text-hero`: `clamp(3.25rem, 7.2vw, 7.25rem)` (52px → 116px!), `line-height: 0.90`, `letter-spacing: -0.035em`
- `--text-display`: `clamp(2.25rem, 4.4vw, 4.25rem)` (36px → 68px), `line-height: 0.98`, `letter-spacing: -0.025em`
- `--text-heading`: `clamp(1.625rem, 2.6vw, 2.5rem)` (26px → 40px), `line-height: 1.08`
- `--text-lead`: `clamp(1.0625rem, 1.3vw, 1.25rem)` (17px → 20px), `line-height: 1.55`
- `--text-body`: `1rem` (16px), `line-height: 1.6`
- `--text-mono`: `0.75rem` (12px), `letter-spacing: 0.12em`, uppercase for plate labels, Hz, BPM, TAB numerals

---

## 5. Layout System & Signature Grid Breaks

- **Grid:** 12-column asymmetric fluid editorial grid (`max-width: 1440px`, fluid gutter `clamp(1.25rem, 3.2vw, 3.5rem)`).
- **Spacing scale:** Harmonic 4px/8px cadence (`0.5rem`, `1rem`, `1.5rem`, `2.5rem`, `4rem`, `6.5rem`, `9rem`).
- **Signature Layout Move — The Full-Bleed Prussian Acoustic Stage & Continuous Fret Rail:**
  - The opening viewport (`min-height: 100svh` on desktop) stages monumental Fraunces typography at the top-left (offset asymmetrically across cols 1–9), a **full-bleed edge-to-edge 6-string playable Prussian soundboard** slicing straight through the middle of the viewport (breaking out of the page container cleanly!), and a crisp horizontal architectural telemetry strip pinned at the base (`STAGE 00 · 15 MIN · NO ACCOUNT | Pluck any string | Start session ↓`).
  - Along the right edge on wide desktops (≥ 1280px), a slim **Fret Inlay Scroll Indicator** (`00 · I · II · III · IV`) tracks scroll progress like inlays on a guitar neck without obstructing content.
- **Deliberate Grid Breaks:**
  1. The 6-string playable hero soundboard bleeds **100% viewport width** (nut anchored to left grid edge, strings running cleanly off the right edge like a real guitar neck entering the frame).
  2. The **Scroll-Synced Chord Morph Chapter** breaks into a full-bleed deep Prussian-cobalt plate between the opening rag-paper stage and the rag-paper Studio Bench, creating physical chapter cadence.
  3. On `/chords/`, the featured chord showcase + Progression Sequencer breaks 5/7 asymmetrically above the 10-chord engraved plate ledger (varying featured weight instead of a monotonous 5×2 spreadsheet!).

---

## 6. Motion Language

### What Moves vs. What Never Moves
- **Moves:** Plucked string standing-wave spindles & harmonic cores; chord finger dots gliding across frets/strings; orchestrated hero masked line-up reveals; scroll-synced TAB measure playhead & chord transitions; step bench transitions; magnetic subtle hover shifts on primary actions; engraved hairline wipes (`scaleX`); tactile press depression (`translateY(1.5px)`); curtain/stave route transitions.
- **Never Moves:** Body copy paragraphs once settled; form inputs, audio controls, and lyric textareas during typing/recording; keyboard-triggered rapid beat taps (instantaneous 0ms response on downstroke/tap!); structural borders/containers that would shift reading lines.

### Custom Easing & Duration Tokens (Never `ease` or `linear`)
- `--ease-out-expo`: `cubic-bezier(0.19, 1, 0.22, 1)` — Hero reveals, dramatic plate entrances (550–850ms)
- `--ease-out-quint`: `cubic-bezier(0.23, 1, 0.32, 1)` — Scroll reveals, tab steps, panel slides (280–450ms)
- `--ease-in-quint`: `cubic-bezier(0.64, 0, 0.78, 0)` — Exits and dismissals (180–240ms)
- `--ease-snap`: `cubic-bezier(0.32, 0.72, 0, 1)` — Tactile UI feedback, hover/focus, toggles (160–240ms)
- `--ease-spring`: `cubic-bezier(0.34, 1.42, 0.64, 1)` — Playful detents, finger dot settling, kept badges (320–420ms)
- **Stagger rules:** Line reveals `75ms * var(--i)`; grid/chord items `45ms * var(--i)` capped at `360ms`; never stagger body text.

### Architecture — Single RAF Ticker & Smooth Scroll
- **Smooth scroll:** `lenis` (single instance in `MotionProvider`, disabled automatically when `prefers-reduced-motion: reduce`, `smoothWheel: true`, `lerp: 0.1`, native scrollbar preserved, zero scroll hijacking).
- **One shared RAF ticker (`lib/ticker.ts`):** Drives `lenis.raf(now)` PLUS every subscribed animation callback (standing-wave string vibration, scroll-synced chord morph, magnetic buttons, live recording meter). Any component that is offscreen (via `IntersectionObserver`) or idle (`amp === 0`) automatically pauses its callback so idle CPU is **0%**.
- **Route transitions:** Lightweight custom `RouteTransition` overlay (stave hairline sweep + subtle opacity/translateY content entrance synced with Next.js App Router pathname changes — fast ~260ms total, never blocks interaction!).
- **Orchestrated Load Sequence (~1.05s total, non-blocking):**
  - `0ms`: Nav hairline draws across (`scaleX(0 → 1)`), plate tag fades in.
  - `80ms–380ms`: Masked hero display lines rise from clip baseline (`translate3d(0, 105%, 0) → 0`, staggered `85ms`).
  - `240ms–650ms`: The 6 acoustic strings sweep into tension left-to-right (`scaleX(0 → 1)`, `45ms` per string) and settle with a subtle silent harmonic shimmer.
  - `480ms–900ms`: Bottom telemetry strip + CTA enter cleanly. All buttons and strings are clickable from `t = 0ms`.

### Scroll Choreography Per Page
- **Home (`/`):**
  1. *Hero (0–100svh):* Full-bleed playable 6-string guitar neck + monumental Fraunces title + gentle scroll parallax separation on background fret numerals (`transform: translate3d`).
  2. *Signature Chapter — "Four Chords, One Movement" (Pinned/Sticky Scroll-Synced Fretboard):* Scrolling scrubs cleanly through `Em → Asus2 → C → G → D`. Finger dots (`1`, `2`, `3`) spring-glide across strings and frets; nut open/mute symbols cross-fade; synchronized 6-line TAB strip illuminates each chord's tablature (`0–2–2–0–0–0` etc.); plucking any string or clicking a chord plays real Karplus-Strong acoustic guitar audio (plus an explicit opt-in **"Play as I scroll"** toggle!).
  3. *Stage 0 Studio Bench (`#lesson`):* Architectural score-sheet entrance; step rail + interactive workbench (Tuner with standing-wave pitch string + live Hz readout, TapTrainer with physical beat pulse, EmChord, Lyric Sheet with live Fraunces quote preview, 2-take Recorder with compositor-only `scaleY` VU bars, Hook Recorder, PracticeTimer, Stall drawer).
  4. *Six-Week Arc (Editorial Index Strip on page + full drawer):* Scroll-revealed horizontal score timeline of Stage 0 → Week 6 (+ optional 7–8) showing what artifact you keep each week.
- **Week 1 (`/week-1/`):**
  - Editorial score header with kinetic split-line entrance + Week 1 4-step Studio Bench (DownstrokeTrainer featuring a physical swinging **metronome pendulum** on pure `transform: rotate()` synced to 40–90 BPM + EmChord + 3 songwriting steps) + scroll-linked checkpoint card.
- **Chord Library (`/chords/`):**
  - Asymmetric hero + **Interactive Morphing Chord Stage** (select any of the 10 open chords OR play any of the 3 song progressions — finger dots physically glide between shapes on a large playable fretboard with real acoustic strumming!) + engraved 10-chord plate catalog with staggered scroll reveal and one-click string plucking/strumming.

---

## 7. Performance Plan & Phase 2 Spike Proof

### Dependency Changes (Justified)
- **REMOVE:** `motion` (`-112.6 KB raw / -39.5 KB gz`), `lucide-react` (replaced with ~12 bespoke 1.25px inline SVG icons: `-18 KB raw`), `@fontsource/instrument-serif`, `@fontsource-variable/dm-sans`, `@fontsource-variable/jetbrains-mono` (replaced with Latin-only variable woff2 imports).
- **ADD:** `lenis` (`~14 KB raw / ~4.8 KB gz`) — industry-standard silky inertia smooth scroll with zero layout reads, native scrollbars, and full accessibility.
- **Net JS bundle target:** Significantly *smaller* than the 241 KB gzipped baseline while delivering rich 60fps choreography!

### Effect Budget Table
| Effect | Cost | Implementation | Notes |
| --- | --- | --- | --- |
| Lenis smooth scroll | Cheap | Single shared RAF ticker (`lib/ticker.ts`), paused on `prefers-reduced-motion` | Zero scroll-hijack |
| 6-String Standing-Wave Vibration | Cheap | Static SVG spindle + harmonic wave paths animated **strictly** via `transform: scale3d(1, s, 1)` & `opacity` | Zero Canvas clear, zero SVG `d` mutation, `will-change` only while vibrating |
| Scroll-Synced Chord Morph | Cheap | GPU `transform: translate3d(x,y,0) scale(s)` on 3 finger dots + pre-layered chord titles with `contain: strict` | 0 layouts, 0 long tasks |
| Karplus-Strong Acoustic Audio | Cheap | Pure Web Audio API (plucked-string delay-line / warm filtered multi-harmonic synthesis) | Runs on audio thread, opt-in on user gesture |
| Recorder Live Audio Meter | Cheap | 20 pre-mounted `<span>` bars driven via `ref` + `transform: scaleY(v)` inside shared RAF ticker | Replaces baseline's React `setLevels` per-frame re-render bug! |
| Metronome Pendulum & Beat Pulse | Cheap | Pure CSS/RAF `transform: rotate()` + `scale3d()` | Synced to Web Audio clock |
| Subtle Rag Paper Grain | Cheap | Tiny 96×96 pre-encoded static SVG noise tile at 2.5% opacity | Static background-image, never animated filter |
| Hero Masked Line Reveals & Stave Wipes | Cheap | CSS transitions/animations on `transform` + `opacity` | Triggered once via mount / `IntersectionObserver` |
| **Expensive Effects On Screen** | **0** | Never >1 expensive effect; zero `backdrop-filter`, zero large-area blur, zero WebGL overhead | Guarantees 60fps at 4× CPU throttle |

### Phase 2 Isolation Spike Benchmark (4× CPU Throttle, DPR=2, 1440×900)
We prototyped and benchmarked our riskiest combined effect (6 vibrating guitar strings + scroll-scrubbed 5-chord morphing fretboard) in Chromium at **4× CPU throttle & DPR=2**:
- **Attempt 1 (DPR=2 2D Canvas + DOM text swap):** `58.8 FPS`, `2 long tasks >50ms`, `4 layouts`, `max frame 33.4ms`.
- **Attempt 2 (Canvas dirty-flag + `contain: strict`):** `53.0 FPS`, `p95 33.3ms`, `21 dropped frames` — software-rasterizing a 2560×840 Canvas at 4× throttle is too heavy on CPU-bound machines.
- **Attempt 3 — REDESIGNED (Pure Compositor Standing-Wave SVG `scale3d` + `contain: strict` + dirty-checked `translate3d` dots):**
  - **59.7 FPS** (`avg 16.75ms`, `p95 16.7ms`)
  - **0 long tasks > 50ms**
  - **0 layout recalculations** during the entire scroll + chord morph + 6-string vibration!
  - **Bonus:** Visually truer to real high-frequency guitar string optics (luminous standing-wave envelope + oscillating core).

This redesigned pure-compositor architecture is now locked into our brief.

---

## 8. Anti-Slop Commitments (Explicit Refusals)

For FIRSTSONG we explicitly refuse:
1. Any remnant of the previous beige/chalk (`#f2f0eb`) + black 1px Teenage-Engineering clone or `Instrument Serif` / `DM Sans` / `JetBrains Mono`.
2. AI-generated stock photo crutches (we retire `public/guitar.webp` completely — the live playable instrument IS the visual hero!).
3. Purple/indigo/blue gradients, glow orbs, `backdrop-filter` glassmorphism, neon-on-black dark mode, or drop-shadow pill cards.
4. Centered H1 + subhead + two buttons hero, or 3-up feature cards with icon-in-rounded-square.
5. Music clichés: wood grain textures, guitar-pick shaped buttons, sunburst gradients, spinning vinyl records, decorative bouncing EQ bars (the Tuner uses a real damped standing-wave pitch string; the Recorder meter only moves from live microphone RMS!).
6. EdTech / SaaS copy ("Unlock your musical potential", "Elevate your songwriting", "Seamless workflow", fake testimonials, signup walls). Copy is direct, human, concrete, and grounded in `CURRICULUM.md`.
