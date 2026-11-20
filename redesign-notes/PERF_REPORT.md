# Performance & Verification Report (v2)

Measured on the production static export (`out/`) in headless Chrome via Playwright and Lighthouse.

## Lighthouse Desktop Scores

| Route | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- |
| `/` (Stage 0) | **100** | **100** | **100** | **100** |
| `/week-1/` (Week 1) | **100** | **100** | **100** | **100** |
| `/chords/` (10 Chords) | **100** | **100** | **100** | **100** |

## Core Web Vitals (`/`)

- **FCP:** `282 ms`
- **LCP:** `282 ms`
- **CLS:** `0.000`
- **TBT:** `0 ms`
- **Speed Index:** `582 ms`

## Scroll & Motion Frame Rate

| Condition | Avg FPS | p95 Frame Time | Max Frame Time | Long Tasks (> 50ms) | Layout Delta During Scroll |
| --- | --- | --- | --- | --- | --- |
| 1× CPU | **60.0** | `16.7 ms` | `16.8 ms` | **0** | **0** |
| 4× CPU Throttle | **60.0** | `16.7 ms` | `16.8 ms` | **0** | **0** |

## Bundle & Asset Weight

- **CSS:** `38.5 KB` raw / `8.0 KB` gzip
- **Fonts:** `57.6 KB` total (`Geist` variable + `IBM Plex Mono` 400 & 500)
- **Images:** `53.2 KB` total
- **JS (all static chunks combined):** `811.3 KB` raw / `255.9 KB` gzip (includes Next.js runtime, React 19, OGL, GSAP, Lucide)

## Responsive & Quality Checks

- **Breakpoints verified (`0` horizontal overflow):** `390px`, `768px`, `1280px`, `1440px`, `1920px` across `/`, `/week-1/`, and `/chords/`.
- **Copy lint (`design-taste-frontend` `copy-lint.mjs`):** `0 FAIL` across all three routes.
- **Console errors / WebGL uniform warnings:** `0` application errors and `0` shader/uniform warnings.
- **Build & Typecheck:** `npm run typecheck` and `npm run build` pass cleanly.
