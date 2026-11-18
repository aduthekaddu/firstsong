# FIRSTSONG design

The home page opens with Stage 0. Its main button moves focus to the current step on the same page. Each step gives learners one task and puts its controls beside the instructions. The session outline shows what is done and lets learners revisit any step.

## Color and typography

The tokens live in [`app/globals.css`](app/globals.css).

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#faf7f1` | Page background |
| Card | `#fffdf9` | Lesson and reference cards |
| Ink | `#2c241f` | Main text |
| Muted | `#65564c` | Instructions and details |
| Line | `#e6dbce` | Dividers and card borders |
| Accent | `#913e2a` | Main buttons, links, and focus rings |
| Accent hover | `#763020` | Main button hover |
| Blush | `#f5e5d9` | Current or selected step |
| Sand | `#f6f0e8` | Practice tools |

Instrument Serif sets page and lesson titles. DM Sans sets instructions and controls. Both fonts ship with the site under their [font licenses](public/font-licenses). Body text starts at 16 pixels with 1.55 line spacing. Main instructions use at least 17 pixels at the default browser size. Title sizes grow with the viewport.

## Layout and controls

- Keep the active step above the session outline on phones. Let recorder cards stack when they run out of room so playback and record controls fit on screen.
- Give primary controls and navigation at least 44 pixels of height at the default browser size. Use 12-pixel control corners and 22-pixel card corners.
- Use native buttons, inputs, and audio controls. Keep the rust focus ring visible and move focus to the new step title when the learner advances.
- Label reference pitches and number all four beats. Give each chord diagram a text description of its strings, frets, and fingers.
- Show an editable text caption beside each take. Use WebVTT captions and a transcript if a future lesson adds video.

## Lesson data and browser storage

[The curriculum](CURRICULUM.md) defines each stage, objective, practice steps, and checkpoint. A step's type selects its practice tool. The tuner and downstroke drill use Web Audio for reference sound. The timer starts on request and lets the learner control the pace.

The browser records one take at a time. It saves each short recording together with its caption in local storage, which also holds the lyric, rhythm choice, and lesson progress. A 20-second cap keeps the takes short. If saving fails, the app keeps the take available until the learner leaves the step and shows a message about the failed save.
