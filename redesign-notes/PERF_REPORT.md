# FIRSTSONG — Performance & Baseline Report

## Phase 0: Baseline ("Before")

Captured from the existing static export (`out/`, Next.js 16.4.6 + React 19.2 + Tailwind v4 + `motion` 14.14 + `lucide-react`) served locally and audited with Desktop Lighthouse + Playwright Chromium at 1440×900 (1× and 4× CPU throttle).

### Routes & Stack
- `/` — Stage 0 (Hero + Interactive String Bed + 6-step interactive lesson player: Tuner, TapTrainer, EmChord, Lyric input, 2-take Recordings compare, Hook recorder, PracticeTimer, Stall tips)
- `/week-1/` — Week 1 (4-step lesson player: DownstrokeTrainer 40–90 BPM + EmChord + 3 practice steps)
- `/chords/` — Chord Library (Legend + ProgressionPlayer + 10 interactive chord diagrams)
- Navigation modal: 6-Week Curriculum Index (`course` in `lib/lessons.ts`)
- Local persistence (`firstsong:v1:*`): lesson progress, lyric line, rhythm choice, audio takes (base64 data URLs + captions)

### Bundle Size (Before)
| Asset Type | Files | Raw Size | Gzipped Size | Notes |
| --- | ---: | ---: | ---: | --- |
| JavaScript | 13 | 766.1 KB | 241.2 KB | Includes full `motion` bundle (~112 KB raw / 39.5 KB gz); Lighthouse flags 237 KiB unused JS |
| CSS | 1 | 31.7 KB | 6.7 KB | Tailwind v4 + Fontsource imports |
| Fonts | 16 | 260.3 KB | 260.3 KB | DM Sans Variable + Instrument Serif (woff + woff2) + JetBrains Mono Variable (includes unused Cyrillic/Greek subsets) |
| Images | 1 | 183.1 KB | 183.1 KB | `guitar.webp` (1120×747 loaded into a 96×56px box — 182 KiB wasted) |

### Desktop Lighthouse (Before — `/`)
| Category | Score |
| --- | ---: |
| Performance | 100 |
| Accessibility | 96 (failed `color-contrast`) |
| Best Practices | 96 (failed `errors-in-console`: 404 `/favicon.ico`) |
| SEO | 100 |

| Metric | Value |
| --- | ---: |
| FCP | 283 ms |
| LCP | 283 ms |
| CLS | 0.0013 |
| TBT | 0 ms |
| Speed Index | 283 ms |

### Scroll Performance Trace (Before — `/`, 1440×900)
| Condition | Avg FPS | p95 Frame | Max Frame | Dropped (>20ms) | Long Tasks (>50ms) | Layout Delta | Active Animations |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1× CPU | 60.0 | 16.8 ms | 16.8 ms | 0 | 0 | 0 | **0** |
| 4× CPU | 60.0 | 16.7 ms | 16.8 ms | 0 | 0 | 0 | **0** |

### Diagnosis of What Failed Previously
1. **Dead & static:** `activeAnimations: 0` on scroll; zero smooth scroll, zero scroll choreography, zero route transitions, stiff un-choreographed hero.
2. **Unsafe animation patterns in components:** `PracticeTools` Tuner animates `height` on 32 motion spans; `LessonPlayer` animates `width` on progress bar; `Recordings` calls React `setLevels` on every `requestAnimationFrame` tick during recording; sticky header uses `backdrop-blur-sm`.
3. **Generic AI-redesign aesthetic:** Uninspired beige/chalk + 1px black grid + vermilion + Instrument Serif / DM Sans / JetBrains Mono template; fails AA contrast; missing favicon causes console 404; loads 183 KB `guitar.webp` into a tiny thumbnail.

### Screenshots (Before — 1440px)
- `redesign-notes/before/home-1440.png`
- `redesign-notes/before/week-1-1440.png`
- `redesign-notes/before/chords-1440.png`

---

## Final ("After")
*(To be recorded after Phase 7 completion and compared against Before numbers.)*
