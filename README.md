# FIRSTSONG

FIRSTSONG is a free guitar and songwriting course for complete beginners. Open the home page with a guitar and spend 15 minutes tuning, playing an E minor chord, and making a short hook of your own. You can start without an account.

Stage 0 includes reference tones, a four-beat tap trainer, one lyric prompt, and a recorder for two hums and a final hook. Week 1 has an E minor downstroke drill and the rest of the week's practice outline. The chord library has ten open chord diagrams.

Your progress, lyric, captions, and takes stay in this browser on this device. Clearing the site's browser data removes them. Microphone recording works on localhost and HTTPS and needs your permission.

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

## Roadmap

- Complete Week 1's lyric, melody, and four-bar memo activities.
- Build Weeks 2 through 4 around a verse, a contrasting chorus, and a complete draft.
- Build Weeks 5 and 6 around arrangement, revision, and audio export.
- Add the optional lessons on recording layers and mixing.

## Contribute

Read [the curriculum](CURRICULUM.md) before changing a lesson. It defines what each stage teaches and what the learner keeps. Edit the lesson data in [`lib/lessons.ts`](lib/lessons.ts) and check the affected step in the static export. For interface changes, see the [design notes](DESIGN.md) and try the lesson with a keyboard and a phone-sized viewport.

Open an issue to discuss a change to the curriculum. For a fix or a small improvement, open a pull request and include the checks you ran.

[MIT License](LICENSE).
