# FIRSTSONG v2 Design Brief — Hybrid Signal / OS × Orbit Monolith

## 1. Anti-AI-Slop Autopsy (Why v1 & Early Prototypes Screamed AI Slop)

After analyzing `design-taste-frontend` (`copy-tells.md`, `layout-v4.md`, `system.md`, `motion.md`), `stageshow` (`craft.md`, `framing.md`, `motion.md`), `unslop`, and live inspections of `hancore.dev`, `harryjatkins.com`, `findmy.vitra.com`, `gregorcollienne.com`, and `jeen-yuhs.com`, these seven structural tells explain why generated sites still read as AI even after avoiding purple gradients:

1. **Nested boxes inside boxes:** Wrapping every sub-section in a `1px` bordered rounded card inside a bordered panel inside a tinted page. Real studio sites let the viewport ground carry the layout and separate groups with whitespace, consistent column edges, and single full-span `1px` hairlines.
2. **Tracked uppercase eyebrow soup:** Placing `10px–11px` uppercase tracked mono badges (`PLATE 00`, `FRETBOARD // LIVE`, `KEEP THIS ARTIFACT`) above every heading and box. Sentence case at `13px+` reads human and confident; monospace belongs only on numbers, frequencies, TAB frets, and keyboard hints.
3. **Fake sci-fi telemetry & decorative stat strips:** KPI boxes (`MIC TUNER READY`, `TAKES 0/3`, `~/session/em-hook`) imitate developer dashboards without carrying real state. Every readout must reflect live, truthful state (actual microphone Hz/cents, actual chord fingering, actual viewport dimensions).
4. **Second-generation copy tics:** Three-fragment slogans (`Six strings. One chord. Your first song.`), italic accent-colored hero phrases, em dashes, negation runs (`Zero accounts · Free forever`), and virtue words (`quiet`, `honest`, `calm`). Copy must name the thing plainly in concrete verbs and nouns.
5. **Toy SVG instruments & mixed hand-drawn glyphs:** Flat red circles pasted on straight horizontal lines and inconsistent custom SVG icon paths immediately signal generated UI. Use one uniform icon family (`lucide-react`, `1.5px` stroke) and genuine WebGL material lighting + physical acoustic modeling.
6. **Squeezed desktop layouts on mobile:** Taking a 12-column desktop stage and letting it stack awkwardly at `390px` or `768px`. Each breakpoint (`390`, `768`, `1280`, `1440`, `1920`) gets an intentional composition with equal left/right content edges and `>= 44px` tap targets.
7. **Motion slop & scroll hijacking:** Smooth-scroll libraries (`lenis`) hijack native scroll; scroll-triggered fade-ups on every card add visual noise without meaning. Native scroll stays untouched; motion lives strictly in hero load entrance, physical WebGL string vibration, orbital chord wheel rotation, sliding indicators, rolling value changes, and hover/press micro-feedback.

## 2. Visual System (Gallery Light + Studio Obsidian)

- **Type:** `Geist` (variable sans, weights 400 & 500 only; tight negative tracking `-0.035em` to `-0.045em` on headings) + `IBM Plex Mono` (400 & 500 strictly for Hz, cents, BPM, TAB frets, keycaps, timers). Self-hosted via `next/font/local` (3 `.woff2` files, 59 KB total, OFL licensed).
- **Color (`color-scheme: light dark` + CSS `light-dark()` + zero-FOUC `<meta name="color-scheme">`):**
  - Gallery Light (Vitra × Harry Atkins): `#ffffff` ground, `#f5f5f4` recessed well, `#111111` primary ink, `#636369` muted ink, `rgb(17 17 17 / 0.11)` hairline.
  - Studio Obsidian (hancore × jeen-yuhs): `#0c0c0d` ground, `#151517` recessed well, `#ededeb` warm bone ink, `#8a8a86` muted ink, `rgb(237 237 235 / 0.11)` hairline.
  - Earned state colors only (< 2% screen area, never violet): signal vermilion (`#d9381e` / `#ef5638`) for primary action, active pluck energy, and active recording; pitch-lock emerald (`#137a4b` / `#34c77b`) for in-tune microphone lock (`±4¢`) and completed steps; phosphor-bronze (`#b88a52` / `#d4a96e`) for wound WebGL bass strings.
- **Voice card:** Plain studio instructor — direct, concrete, second-person ("you"), sentence case everywhere, zero em dashes, zero slogans, verb + object buttons.

## 3. Architecture & Breakpoints

- **Header (`56px`, fixed, opaque, 1px hairline):** `Firstsong` wordmark + live viewport size readout (`md+`) left; `Stage 0`, `Week 1`, `Chords`, `Dark mode (N/Y)`, and `:` command index button right. Full-screen top-layer `<dialog>` menu on phone (`< 768px`) with `56px` touch rows.
- **`/` (Stage 0):**
  - Screen 1 (`100svh` on desktop): Split opening headline + lead/actions over a borderless spatial stage pairing the **OGL WebGL specular-lit 6-string guitar neck** (left 8 cols) with the **Vitra-inspired orbital 5-chord wheel** (`Em`, `Asus2`, `C`, `G`, `D`, right 4 cols) and quiet bottom keyboard strip (`1–6`, `Space`, `← →`, `:`). On `390px`, authored thumb composition: headline/CTA → touch-sized 6-string strum stage → horizontal 5-chord bar.
  - Screen 2 (`#session`): Borderless two-column Stage 0 workbench (260px step rail + open studio canvas) housing the **live microphone autocorrelation strobe tuner** + 6 acoustic reference strings, 4-beat tap trainer, interactive Em diagram, concrete line writer, A/B hum recorder, and 20-second hook recorder.
  - Screen 3 (`#curriculum`): Clean single-column horizontal hairline ledger of all 6 weeks + optional weeks 7–8 (from `CURRICULUM.md`), expanding in place via native `<details>`.
- **`/week-1/` (Week 1):** Open workbench with interactive Em diagram, 40–90 BPM downstroke metronome with GPU swinging pendulum + crisp woodblock clicks, and carried-over Stage 0 line + Week 1 lyric/title notes.
- **`/chords/` (10 Open Chords):** Interactive 10-chord Vitra orbital dial with **`Orbit` / `Grid`** toggle, 4-bar progression player that turns the wheel in real time as each chord strums, interactive chord fret diagram with accessible string descriptions, and full borderless hairline grid view.
- **Command Palette (`:` or `/`):** Native `<dialog>` with `@starting-style` + `transition-behavior: allow-discrete` top-layer transitions (and Firefox/Safari exit fallback) for instant route jumps, chord auditioning, step jumping, and light/dark switching.

## 4. Performance & Accessibility Budgets

- Native scroll only (zero scroll-jacking libraries).
- WebGL DPR capped at `1.5`, single shared RAF ticker (`lib/ticker.ts`), automatic idle sleep when strings settle (0% idle CPU/GPU).
- Zero per-frame React state updates in WebGL strings, microphone strobe tuner, metronome pendulum, or recording level meter.
- Lighthouse desktop >= 90 (target 100/100/100/100), CLS < 0.01, 60fps at 4× CPU throttle, zero long tasks > 50ms while scrolling, zero console errors across `390`, `768`, `1280`, `1440`, `1920` in both light and dark modes.
