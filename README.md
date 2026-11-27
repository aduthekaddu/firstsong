# FIRSTSONG

FIRSTSONG is a free guitar and songwriting course for complete beginners. Open the home page with a guitar and spend 15 minutes tuning, playing an E minor chord, and making a short hook of your own. You can start without an account.

Stage 0 includes reference tones, a four-beat tap trainer, a lyric prompt, and short recordings. The six-week course takes you through a four-bar hook, an eight-bar verse, a contrasting chorus, a full draft, two revisions, and a finished take. Play back your work in the songbook, download the original or a trimmed WAV, and save a separate lyric and chord sheet. The optional lessons introduce layers and mixing in an external recording program.

Your progress, lyric, captions, and takes stay in this browser on this device. Stage 0 recordings remain in their original local storage; longer studio recordings use IndexedDB. Clearing the site's browser data removes them, so keep downloaded copies. Microphone recording works on localhost and HTTPS and needs your permission. You can continue the lessons if you do not grant it.

## Run locally

Use Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open the local URL that Next.js prints.

To check the production export, run these commands and open the URL that `serve` prints.

```sh
npm run typecheck
npm run build
npx serve out
```

## GitHub Pages

In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. The Pages workflow builds on pushes to `main` and can also run manually. It reads the site's base path from GitHub Pages and uploads the static files in `out/`.

For a local export, leave `NEXT_PUBLIC_BASE_PATH` unset to serve at the domain root. Set it to the deployment prefix, such as `/firstsong`, if you serve the files from that subdirectory.

## Verify the full course

```sh
npm test
npm run typecheck
NEXT_PUBLIC_BASE_PATH=/firstsong npm run build
npx playwright install chromium --only-shell
npm run test:e2e
```

The browser test serves the static export under the GitHub Pages path. It uses Chromium's fake microphone to exercise capture, persistence, playback availability, and actual downloads. It also covers denied microphone access and checks all routes at 320 px. For release, repeat capture and export on a physical iPhone in Safari over HTTPS; simulated input and Chromium do not prove iPhone audio behavior.

The Songbook and Week 6 can prepare a ZIP with your original takes, lyric/chord sheet and a versioned song manifest. It is a portable copy, not an in-app restore: extract it in your file manager to read or listen. The ZIP is built locally; no recordings or lyrics are uploaded. A trimmed WAV remains a separate download.

Design references: [Ableton Learning Music](https://www.ableton.com/en/blog/learn-music-in-your-browser/) for learning by making something, [JustinGuitar's first steps](https://www.justinguitar.com/modules/beginner-1-first-steps) for approachable chord practice, and [MDN MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) for local recording and format negotiation. Lesson writing follows this repo's own curriculum.

## Contribute

Read [the curriculum](CURRICULUM.md) before changing a lesson. It defines what each stage teaches and what the learner keeps. Edit the lesson data in [`lib/lessons.ts`](lib/lessons.ts) and check the affected step in the static export. For interface changes, see the [design notes](DESIGN.md) and try the lesson with a keyboard and a phone-sized viewport.

Open an issue to discuss a change to the curriculum. For a fix or a small improvement, open a pull request and include the checks you ran.

[MIT License](LICENSE).
