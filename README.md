# TaskForce AI demo

A hands-free presentation of TaskForce AI, the TaskForce assistant. Press **Play** and it runs on its own: a voice-over walks through the TaskForce modules bar, then TaskForce AI answers questions from live data, builds reports and a PDF, draws a map, takes a question by voice, and fills a Daily Site Report from two spoken updates.

It is a static site: no login, no backend, no keys in the browser.

- **The screens** are TaskForce AI's own components and styles, copied from `taskforce-construction-frontend` (`src/chat/`).
- **The answers are real.** They were recorded once from the TaskForce AI service on the City of Kawartha Lakes Rural Resurfacing Program data (`src/answers.json`). The demo replays them as they streamed in, with the 20–35 s of thinking cut to about 3 s.
- **The voices** were recorded once with ElevenLabs (`public/audio/`): Sarah narrates, and Chris is the site supervisor talking into the mic.

## Run it

```bash
npm install
npm run dev        # http://localhost:5180
```

Controls while it plays: **Space** pauses, **→** skips the current line, **Esc** stops. The bar at the bottom has the same buttons, plus Mute.

## Deploy on Vercel

Import the repository in Vercel. It detects Vite: the build command is `npm run build` and the output directory is `dist`. Nothing else needs setting up: no environment variables are used by the site.

## Change it

| To change | Edit | Then |
|---|---|---|
| What the voice says | `src/narration.json` | delete that line's `public/audio/<id>.mp3`, run `npm run record:voice` |
| The narrator or supervisor voice | `voices` in `src/narration.json` | `npm run record:voice -- --force` |
| A question | `src/script.json` | `AI_SERVICE_KEY=… npm run record:answers -- <step id>` (needs the AI service; see the script's header) |
| The order of the show | `start()` in `src/App.tsx` | |

`npm run record:voice` reads `ELEVENLABS_API_KEY` from `.env.local` (not committed). Recording answers needs the TaskForce AI service running (default `http://127.0.0.1:8000`) and its service key.

## What is where

- `src/App.tsx`: the page (modules bar, conversations, chat, mic) and the show itself, step by step
- `src/DsrPanel.tsx`: the Daily Site Report pane, filled from what the real filler returned
- `src/Sidebar.tsx`: the TaskForce modules bar
- `src/chat/`: TaskForce AI's report card, map, markdown, thinking panel and styles, as they are in the app
- `scripts/`: the two recorders
