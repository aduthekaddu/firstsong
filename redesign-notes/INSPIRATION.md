# FIRSTSONG — Phase 1 Research & Inspiration Log

Research conducted live in browser (Chrome via `preview_*` tools) across 16 sites spanning design galleries, music hardware & synth makers, record labels, sheet-music publishing, industrial & motion studios, category competitors (to avoid), and interaction-craft essays. (Sites gated by Cloudflare/Vercel anti-bot checkpoints — Codrops sub-articles, Siteinspire, Locomotive — were skipped immediately without bypassing.)

---

## 1. Galleries & Technique References

### 1. Recent Design (`recent.design/websites` & `?category=music`)
- **What excited me:** Ruthless spatial density in the left rail (`220px` sticky index) paired with edge-to-edge visual work; scroll-fade `mask-image: linear-gradient(...)` on overflow headers; micro SVG `stroke-dasharray` / `stroke-dashoffset` motion on badges.
- **Exact technique:** `Inter` variable (`100 900`) paired with `Departure` mono; `mask-image` gradient fades instead of hard clip edges; minimal DOM depth.
- **How I'll adapt it:** Use a crisp vertical architectural edge/index rhythm and clean SVG `stroke-dashoffset` / path drawing cues for live fretboard/notation mechanics — never the SaaS gallery sidebar look.
- **Perf cost:** Cheap (compositor-only opacity/transform + small SVG stroke).

### 2. Awwwards — Sites of the Day (`awwwards.com/websites/sites_of_the_day/`)
- **What excited me:** Extreme scale contrast and kinetic display headers across current winners (`Inter Tight` variable `100 900` tight tracking), deliberate full-bleed viewport framing, and narrative pacing across scroll chapters rather than one short dashboard box.
- **Exact technique:** Variable condensed/tight display sans (`Inter Tight`), aggressive display-to-caption ratios (6×–10×), chaptered scroll structure.
- **How I'll adapt it:** Replace FIRSTSONG's cramped 1550px page with intentional editorial pacing — a commanding 100svh acoustic opening stage that flows smoothly into the live songwriting bench and 6-week roadmap without feeling like a SaaS dashboard.
- **Perf cost:** Cheap.

### 3. Land-book (`land-book.com`)
- **What excited me:** Clean neutral paper backdrop (`rgb(247, 246, 245)`) showing how quickly generic SaaS marketing sites blur together when they all use `Inter` + 48px centered headline + white cards.
- **Exact technique:** Useful negative benchmark: standard centered hero + 3-card grids read instantly as templated.
- **How I'll adapt it:** Break symmetry aggressively; anchor the page on a musical physical metaphor rather than marketing cards.
- **Perf cost:** Cheap.

### 4. Codrops (`tympanus.net/codrops/`)
- **What excited me:** Current 2026 creative web craft themes right on the front page: *"Hear It Before You Read It"* (sound-first interaction), *"Choreographing Kinetic Typography on Scroll with GSAP"*, and *"Craft, Balance and Designing for AI"*. Clean contrast between `AlphaLyrae` (display) and `InterVariable`.
- **Exact technique:** Sound-first UX + scroll-linked kinetic typography synced with a single scroll/ticker loop.
- **How I'll adapt it:** Make the guitar *audible and pluckable immediately* on load ("hear it before you read it"), and sync scroll directly to musical progression (chord morphing + measure-by-measure tab reveal).
- **Perf cost:** Cheap–Medium (CSS transforms + single RAF ticker + Web Audio on gesture).

### 5. Lenis Showcase (`lenis.dev`)
- **What excited me:** **THE** benchmark for 60fps smooth scroll and monumental typographic staging. Opening viewport (`100vh`) puts massive edge-to-edge sculptural display type up top, wide breathing space in the middle, and a single crisp architectural bottom control bar (`SCROLL TO EXPLORE | Metadata | CTA 1 | CTA 2`).
- **Exact technique:** Native `Lenis` (`html.lenis`) smooth scroll with zero scroll-hijacking or scrollbar replacement; complete Penner custom easing token suite:
  - Expo-out: `cubic-bezier(0.19, 1, 0.22, 1)`
  - Quart-out: `cubic-bezier(0.165, 0.84, 0.44, 1)`
  - Cubic-in-out: `cubic-bezier(0.645, 0.045, 0.355, 1)`
  - Quad-out: `cubic-bezier(0.25, 0.46, 0.45, 0.94)`
  Typography: bold display (`Panchang` 700, `Anton` 400) with tight 0.9× line-height; only `transform`/`opacity` animated in scroll callbacks.
- **How I'll adapt it:** Use `lenis` in one single shared RAF ticker loop (`src/lib/motion.ts`) synced to scroll-driven CSS custom properties (`--scroll-p`) and IntersectionObserver/scroll progress callbacks; adopt the full-viewport monumental staging + pinned bottom telemetry/action strip for the hero.
- **Perf cost:** Cheap (Lenis core is ~4.5 KB gzipped; single RAF ticker, zero layout reads during scroll).

---

## 2. Identity from Outside Guitar Lessons (Hardware, Labels, Engraving, Industrial Design)

### 6. Elektron (`elektron.se`)
- **What excited me:** Deep matte studio darkness (`rgb(21, 21, 21)`) with razor-sharp cool off-white ink (`rgb(238, 238, 242)`), hardware precision without corny neon gradients, and *incredible* custom CSS easing curves and line-index staggers.
- **Exact technique:**
  - `Neue Haas Grotesk Display/Text` + custom LCD mono (`digi one v2`)
  - Pure CSS line-stagger pattern: `calc(100ms * var(--line-index))`
  - Easing curves extracted from stylesheets:
    - Dramatic reveal: `cubic-bezier(0.77, 0, 0.175, 1)`
    - Snappy mechanical snap: `cubic-bezier(0.365, 0.305, 0, 1)`
    - Subtle tactile overshoot: `cubic-bezier(0, 1.05, 0.65, 1.01)`
- **How I'll adapt it:** Steal the pure-CSS `--index` stagger pattern and mechanical snap/overshoot easing tokens! Also note the contrast discipline of dark studio surfaces vs warm tactile hardware accents.
- **Perf cost:** Cheap (pure CSS transforms + custom properties).

### 7. Teenage Engineering (`teenage.engineering`)
- **What excited me:** Studying the *real* Teenage Engineering site revealed how fake the previous beige/vermilion Swiss imitation was! Real TE uses stark black (`rgb(0,0,0)`), custom condensed geometric type (`te-20`, `TechnoType`), and ultra-tight 150–250ms mechanical transitions (`cubic-bezier(0.6, 0.2, 0, 0.8)`).
- **Exact technique:** Short, crisp transform/opacity transitions (`0.15s`–`0.25s`), zero gratuitous flourishes, hardware-first clarity.
- **How I'll adapt it:** Keep interactive feedback on buttons, tuner pads, tap pads, and recorder triggers brutally crisp (150–240ms) with tactile press physics — zero soft SaaS pillow shadows.
- **Perf cost:** Cheap.

### 8. Ableton Learning Music (`learningmusic.ableton.com`)
- **What excited me:** The single best music pedagogy UX on the web. Zero marketing fluff, zero signup wall, immediate interactive sound instrument right on the first screen, and a slim vertical left edge rail (`Chapters` rotated 90°) that gets completely out of the way of playing.
- **Exact technique:** `Futura PT` (48px bold H1, 20px generous body text), Tone.js / Web Audio direct interaction, color-coded musical roles, one clear task per step.
- **How I'll adapt it:** Keep FIRSTSONG's "play within 5 seconds, zero account" soul intact — elevate the opening interactive instrument so it *teaches* your first chord and tuning by touch before you even scroll down to Step 1, and make every step feel like an intimate studio desk rather than a form.
- **Perf cost:** Cheap (native Web Audio API — no heavy Tone.js dependency needed!).

### 9. G. Henle Verlag (`henle.de/en/`)
- **What excited me:** **HUGE BREAKTHROUGH.** G. Henle Verlag is the world's most iconic *Urtext* sheet-music publisher — instantly recognizable worldwide for its signature **Henle Urtext Slate-Cobalt Blue** (`rgb(92, 126, 151)`) engraved covers, cream cotton-rag sheet paper, razor-fine hairlines, and crisp engraved typography (`Fira Sans Condensed` from weight 100 to 700!).
- **Exact technique:** `Fira Sans Condensed` (100–700 weight contrast), `cubic-bezier(0.23, 1, 0.32, 1)` (Quint-out) and `cubic-bezier(0.68, 0.26, 0.58, 1.22)` (springy overshoot), archival music-engraving proportions (margins, measure numbers, opus/plate numbers, ledger rules).
- **How I'll adapt it:** Sheet-music / Urtext engraving + acoustic luthier plate drafting gives us a **100% original, deeply musical, non-cliché visual world** that nobody in guitar edtech has ever touched! Imagine the precision of an engraved score plate combined with physical vibrating strings and studio tape-recorder warmth — NO wood grain, NO sunburst, NO beige-vermilion TE clone!
- **Perf cost:** Cheap.

### 10. ECM Records (`ecmrecords.com`)
- **What excited me:** "The Most Beautiful Sound Next to Silence." Legendary acoustic/jazz record label whose sleeves and website treat negative space as *musical rest*. Ultra-refined light-weight display typography (`Univers` 300 at 66px, 1.1 line-height) and dramatic anticipation easing (`cubic-bezier(0.795, -0.035, 0, 1)`).
- **Exact technique:** Extreme restraint, generous silence/whitespace around catalog numbers (`ECM 00` / `FS-00`), asymmetric margins, anticipation-then-snap transitions.
- **How I'll adapt it:** Treat whitespace as musical rest; give every lesson step, lyric quote, and chord plate generous room to breathe, numbered like studio session reels / Urtext plates (`PLATE 01`, `REEL 00`).
- **Perf cost:** Cheap.

### 11. Warp Records (`warp.net`)
- **What excited me:** Unapologetic confidence — single bold accent color band, crisp `ABCFavorit` grotesk, razor-tight horizontal rhythm (`cubic-bezier(0.425, 0, 0, 1)`), zero ornamental clutter.
- **Exact technique:** Full-bleed edge-to-edge architectural bars, strong typographic contrast, clean horizontal cadence.
- **How I'll adapt it:** Confident full-bleed structural bands and bold typographic anchors that break cleanly out of a standard centered container.
- **Perf cost:** Cheap.

### 12. Vitsœ (`vitsoe.com/us`) & Studio Feixen (`studiofeixen.ch`)
- **What excited me:** Vitsœ's modular vertical aluminum track grid (`Univers Next Pro` 400/600) where every shelf aligns to real physical pin holes; Studio Feixen's playful grid-breaking typography, custom easing (`cubic-bezier(0.36, 0.07, 0.19, 0.97)` — sharp kinetic snap), and kinetic horizontal ticker/strips.
- **Exact technique:** Exposed structural alignment tracks (like guitar frets / shelving rails), kinetic hover micro-shifts, bold contrast between monumental type and tiny technical annotations.
- **How I'll adapt it:** Use the 6 guitar strings & brass/ink fret positions as the actual *structural coordinate grid* of the site — fret numbers (`I · II · III · IV`) mark scroll sections and progress!
- **Perf cost:** Cheap.

### 13. Stripe Press (`stripe.press`)
- **What excited me:** Tactile editorial craft: `Cardinal Fruit` / `Ivar Headline` display serif paired with `Suisse Mono` technical metadata and silky Quint/Quart-out curves (`cubic-bezier(0.22, 1, 0.36, 1)`, `cubic-bezier(0.33, 1, 0.68, 1)`). Feels like holding a finely printed monograph.
- **Exact technique:** Extreme contrast between sculptural literary display type and ultra-crisp mono catalog labels; subtle physical depth via clean layering rather than blurry drop shadows.
- **How I'll adapt it:** Pair a truly expressive, high-contrast open-licensed display typeface with a refined neo-grotesk + precision monospace for tuning Hz, BPM, measure counts, and plate numbers.
- **Perf cost:** Cheap.

---

## 3. Guitar & Music-Learning Sites (Conventions Learned So We AVOID Them)

### 14. JustinGuitar (`justinguitar.com`)
- **Conventions to avoid:** `Montserrat` + `Open Sans` + Slick carousels + Bootstrap Glyphicons; generic centered white-over-photo hero ("Learn How To Play Guitar"); cluttered multi-row megamenu and dashboard badges.

### 15. Pickup Music (`pickupmusic.com`)
- **Conventions to avoid:** SaaS EdTech marketing funnel ("The most effective way to learn music"), Trustpilot review stars in nav, `Inter` body, "Log in" gating, rounded card grids for learning pathways.

### 16. Yousician (`yousician.com/guitar`) & Fender Play (`fender.com/play`)
- **Conventions to avoid:** Gamified subscription funnels ("Start free trial", "Try Premium for free", "Guitar lessons that fit your life"), generic `Inter` / stock photography of smiling people holding guitars, zero interactive instrument or sound on the page itself.

---

## 4. Writing on Craft, Motion & Avoiding "AI Slop"

### 17. Emil Kowalski — *Great Animations* (`emilkowal.ski/ui/great-animations`)
- **Key takeaways:**
  - *Natural:* Nothing in the physical world snaps instantaneously without inertia — use springs for physical objects (like plucked strings!) and strong `ease-out` curves (`cubic-bezier(0.23, 1, 0.32, 1)`, `cubic-bezier(0.32, 0.72, 0, 1)`) for UI entrances.
  - *Fast:* UI feedback under 300ms feels directly connected to the hand. Never slow down high-frequency actions (like tapping beats on Spacebar!).
  - *Purposeful:* Animate state changes, cause-and-effect, and spatial continuity — never spray identical fade-ups everywhere.
  - *Performant:* Strictly `transform` and `opacity` (composite-only). Never animate `width`, `height`, `top`, `left`, or `margin`.

### 18. Rauno Freiberg — *Invisible Details of Interaction Design* (`rauno.me/craft/interaction-design`) & Frank Chimero — *The Web's Grain* (`frankchimero.com`)
- **Key takeaways on avoiding "AI slop":**
  - **Metaphors & Fidgetability (Rauno):** Great interfaces reuse one coherent physical metaphor and reward playful "fidgeting" (touching a string and feeling immediate acoustic + spring-physics feedback).
  - **Scroll Landmarks & Fluid Morphing:** Let elements morph continuously between states (like finger positions gliding from `Em` → `Asus2` → `C` → `G` → `D` across a single fretboard!) rather than hard-swapping disconnected boxes.
  - **The Web's Grain (Chimero):** Don't glue decorative skeuomorphism onto generic layouts; work *with* the native fluid grain of the browser — real sound, real fluid type, real typography as structure, zero fake stock imagery.
  - **What screams "AI slop":** Default Inter/Instrument-Serif templates, beige/vermilion or indigo-gradient SaaS skins, centered H1 + subhead + 2 CTA buttons, identical scroll fade-ups on 3-up icon cards, fake testimonials, stock/AI hero photos (`guitar.webp`!), and buzzword copy ("Unlock / Elevate / Seamless").

---

## One-Sentence Concept

**FIRSTSONG is a living Urtext field-manual and playable acoustic instrument where six tensioned strings, engraved musical notation, and scroll-synced chord morphing guide a complete beginner from their first plucked open E to a recorded original hook in 15 minutes.**
