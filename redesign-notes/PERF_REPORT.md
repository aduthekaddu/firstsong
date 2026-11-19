# FIRSTSONG — Performance & Verification Report (Before vs. After)

Audited on the production static export (`out/`, Next.js 16.4.6 + React 19.2 + Tailwind v4) served locally with Desktop Lighthouse, Playwright Chromium at 5 viewports (`390`, `768`, `1280`, `1440`, `1920`), and CDP scroll performance tracing at **1×** and **4× CPU throttle**.

---

## 1. Bundle & Asset Size (Before vs. After)

| Asset Type | Before (Raw / Gzip) | After (Raw / Gzip) | Delta | Notes |
| --- | ---: | ---: | ---: | --- |
| **JavaScript** | 766.1 KB / **241.2 KB gz** | 726.3 KB / **218.6 KB gz** | **-39.8 KB raw / -22.6 KB gz** | Removed `motion` (112.6 KB raw) & `lucide-react`; added `lenis` (~4.8 KB gz) + single shared RAF ticker + bespoke 1.25px SVG icons |
| **CSS** | 31.7 KB / 6.7 KB gz | 53.3 KB / 10.6 KB gz | +3.9 KB gz | Full OKLCH token system, custom easing tokens, GPU reveal/curtain choreography |
| **Fonts** | 260.3 KB (16 files) | **204.9 KB (4 files)** | **-55.4 KB (-12 files)** | Replaced with 4 Latin-only OFL variable `.woff2` files (`Fraunces` normal/italic, `Hanken Grotesk`, `Chivo Mono`), preloaded via `next/font/local` with zero-CLS fallback metrics |
| **Images (on-page)** | 183.1 KB (`guitar.webp`) | **1.8 KB (`icon.svg`)** | **-181.3 KB on load** | Retired stock `guitar.webp`; added bespoke SVG favicon (`1.8 KB`) and static 1200×630 OpenGraph card (`public/og-image.png`, 52.6 KB — social unfurl only, never loaded on page) |

### Dependency Changes (Justified)
- **Removed:** `motion`, `lucide-react`, `@fontsource/instrument-serif`, `@fontsource-variable/dm-sans`, `@fontsource-variable/jetbrains-mono`
- **Added:** `lenis` (`^1.3.27`) — silky inertia smooth scroll driven inside our single shared RAF ticker (`lib/ticker.ts`), automatically disabled under `prefers-reduced-motion: reduce`, native scrollbar preserved.

---

## 2. Desktop Lighthouse Scores (Before vs. After)

| Route | Performance | Accessibility | Best Practices | SEO |
| --- | ---: | ---: | ---: | ---: |
| **Before — `/`** | 100 | 96 *(contrast fail)* | 96 *(favicon 404)* | 100 |
| **After — `/` (Stage 0)** | **100** | **100** | **100** | **100** |
| **After — `/week-1/`** | **100** | **100** | **100** | **100** |
| **After — `/chords/`** | **100** | **100** | **100** | **100** |

### Core Web Vitals (`/` Desktop Lighthouse)
| Metric | Target | Before | After | Status |
| --- | --- | ---: | ---: | --- |
| Performance Score | ≥ 90 | 100 | **100** | PASS |
| FCP | < 1.8 s | 283 ms | **363 ms** | PASS |
| LCP | < 2.5 s | 283 ms | **363 ms** | PASS |
| CLS | < 0.1 | 0.0013 | **0.0000** | PASS |
| TBT | < 200 ms | 0 ms | **0 ms** | PASS |
| Interactive | — | 283 ms | **363 ms** | PASS |
| Console Errors / Warnings | 0 | 1 (404) | **0** | PASS |

---

## 3. Scroll Performance Trace (1440×900, Before vs. After)

Scrolling full page height down and back up while driving Lenis smooth scroll, parallax plate numeral, right-edge fret bead, header scroll bar, scroll-synced 5-chord fretboard morph (`Em → Asus2 → C → G → D`), standing-wave acoustic strings, gliding TAB playhead, and staggered section reveals:

| Condition | Avg FPS | p95 Frame | Max Frame | Dropped (>20ms) | Long Tasks (>50ms) | Active Motion |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Before — 1× CPU | 60.0 | 16.8 ms | 16.8 ms | 0 | 0 | **Dead (`0` animations)** |
| Before — 4× CPU | 60.0 | 16.7 ms | 16.8 ms | 0 | 0 | **Dead (`0` animations)** |
| **After — 1× CPU** | **60.0** | **16.7 ms** | **16.8 ms** | **0** | **0** | **Live 60fps choreography** |
| **After — 4× CPU Throttle** | **60.0** | **16.8 ms** | **16.8 ms** | **0** | **0** | **Live 60fps choreography** |

### Key Optimizations That Achieved Locked 60.0 FPS at 4× CPU Throttle
1. **Phase 2 Perf Spike Redesign:** Replaced DPR=2 2D Canvas string redraw (53 FPS at 4× CPU) with **pure GPU compositor standing-wave SVG spindles + harmonic cores** (`scale3d` + `opacity` only, zero SVG path `d` mutations, zero Canvas pixel clears).
2. **Zero React Re-Renders on Scroll:** Refactored `ChordMorphChapter` and `motion-primitives.tsx` (`SplitReveal`, `StaveRule`, `RevealPlate`) to flip DOM attributes/transforms directly via refs inside `IntersectionObserver` and our single shared RAF ticker — dropping 4× CPU long tasks from `4` → **`0`** and max frame time from `66.6ms` → **`16.8ms`**!
3. **Eliminated Forced Synchronous Layouts:** Cached fretboard dimensions on mount/resize instead of reading `clientWidth` inside RAF; pre-layered dynamic chord titles, tags, notes, and strum labels in `contain: strict` boxes; replaced baseline's 60fps React `setLevels` audio meter with pure ref-driven `scaleY` bars.
4. **Zero `backdrop-filter`:** Removed sticky header & modal blur entirely; replaced with crisp opaque cotton-rag and deep Prussian surfaces.

---

## 4. Multi-Viewport & Accessibility Verification
- **Viewports audited:** `390px` (mobile), `768px` (tablet), `1280px`, `1440px`, `1920px` — **0 horizontal overflow** across all 15 route/width combinations (`overflowIssues: []`).
- **Keyboard & Focus:** Visible 2px solid focus rings (`--cobalt` on rag paper, `--bronze` on Prussian surfaces), skip-to-content link, Escape-dismissible `inert`-guarded 6-Week Curriculum Drawer, step-advance heading focus transfer.
- **Reduced Motion:** Full `@media (prefers-reduced-motion: reduce)` CSS fallback + Lenis automatic disablement.

---

## 5. Visual & Motion Proof Artifacts
- **Before (1440px):** `redesign-notes/before/{home,week-1,chords}-1440.png`
- **After (390 / 768 / 1280 / 1440 / 1920):** `redesign-notes/after/{home,week-1,chords}-{390,768,1280,1440,1920}.png`
- **Motion Filmstrips:**
  - `redesign-notes/filmstrips/01-load-sequence.png` — Orchestrated hero masked text reveal & staggered 6-string tension sweep (`animCount` peak 19, `translateY` 96.2px → 0px)
  - `redesign-notes/filmstrips/02-scroll-chord-morph.png` — Scroll-synced `Em → Asus2 → C → G → D` finger dot glide + TAB playhead sweep
  - `redesign-notes/filmstrips/03-pluck-and-chord-switch.png` — Hero string plucking standing waves (`vib=6`) & live `C major` finger transition
  - `redesign-notes/filmstrips/04-route-transitions.png` — Prussian Urtext curtain sweep across `/` → `/week-1/` → `/chords/` underneath sticky header
- **Raw Metrics JSON:** `redesign-notes/baseline-metrics.json`, `redesign-notes/after-metrics.json`
