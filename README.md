# TaskForce AI demo: Dixie Road & Mayfield Road

A hands-free presentation of TaskForce AI, the TaskForce assistant, for a company owner or COO. Press **Play** and it runs on its own.

The story: one job, one Monday. Dufferin Construction Company is widening Dixie Road and Mayfield Road for the Region of Peel (contract Peel 2026-289T). The narrator asks each question aloud while it is typed into the chat, word for word with her voice, and TaskForce AI answers from the live project records with a one-page report:

1. **Monday briefing**: what to worry about on Dixie this week.
2. **Idle crews**: where we are paying for crews that aren't producing.
3. **Cash**: how much the job is owed right now, and what to chase first.
4. **Delay claims**: which Dixie delays we can bill back to the Region. It ends on the job's map.
5. **Daily Site Report**: Gurpreet Sandhu, the site supervisor, says his day in short sentences and the form fills itself. He asks "What's still missing?", the form jumps to the weather, and he answers.

It is a static site: no login, no backend, no keys in the browser.

- **The screens** are TaskForce AI's own components and styles, copied from `taskforce-construction-frontend` (`src/chat/`; the report card is from branch `tfAi-v2.2`, commit c9fcc6c2).
- **The answers are real.** They are recorded once from the TaskForce AI service on the staging data (tenant `schema_3`, user 119) (`src/answers.json`). The demo replays them as they streamed in, with the 15–35 s of thinking cut to about 3 s.
- **The voices** are recorded once with ElevenLabs (`public/audio/`): Sarah narrates as the presenter and asks the questions (`<step>-ask`, typed into the chat at the word times in `src/alignment.json`), and Jessica stands in for Gurpreet Sandhu, the site supervisor, in the DSR scene (voice `supervisor`). Sarah also reads TaskForce AI's answer to "What's still missing?".

## Run it

```bash
npm install
npm run dev        # http://localhost:5180
```

Controls: **Space** pauses, **←** and **→** go to the previous or next chapter, **Esc** stops. The bar at the bottom has the same buttons, plus Mute.

Until the answers and voices are recorded, the show still runs: a missing answer shows a "not recorded yet" note, and a missing voice line is given its reading time in silence.

## Record it

Record the answers first, then fill in the narration numbers from what is on screen, then record the voices.

### 1. Answers

Needs the TaskForce AI service running (default `http://127.0.0.1:8000`) against the staging database, and its service key. Record one step at a time: staging Postgres runs out of connections under parallel load.

```bash
USER_ID=119 REPORT_DATE=2026-11-23 AI_SERVICE_KEY=… npm run record:answers -- brief
# then crews, cash, schedule, dsr, one per run
```

- `REPORT_DATE` is the day the Daily Site Report is for. It is sent to the filler as `today`, put in the form as `reportDate`, and saved with the answer so the form shows that date. Without it, today is used.
- Other settings: `AI_URL`, `TENANT` (default `schema_3`), `USER_ID` (default `1`).
- The DSR fill is sent the way the app's form sends it (its payload, open questions and shown list carried from one sentence to the next). Each turn keeps the filler's `focus` (the form field it points at). Check the reply to "What's still missing?" is "Still empty: Weather, Temperature." with focus `weather`.
- Each answer is printed; a chart or table that came back empty is flagged with `!`.

### 2. Narration

Every line is in `src/narration.json`; `NARRATION_KEYS.md` lists each key and where it plays. A line whose text is still `TODO` is given a short silent pause in the show and skipped by `npm run record:voice`.

A narrator line can also move the page on a word: `"cues": [{ "word": "Dixie", "show": "<heading text or a CSS selector>" }]`. A point line without cues scrolls on through the answer while it is spoken.

### 3. Voices

```bash
npm run record:voice            # reads ELEVENLABS_API_KEY from .env.local; records only lines without an mp3
```

After changing a line's text, delete its `public/audio/<id>.mp3` (and its entry in `src/alignment.json`) and run it again, or pass `--force` to redo every line.

## Deploy on Vercel

Import the repository in Vercel. It detects Vite: the build command is `npm run build` and the output directory is `dist`. Nothing else needs setting up: no environment variables are used by the site.

## Change it

| To change | Edit | Then |
|---|---|---|
| What the voice says | `src/narration.json` | delete that line's `public/audio/<id>.mp3`, run `npm run record:voice` |
| The narrator or supervisor voice | `voices` in `src/narration.json` | `npm run record:voice -- --force` |
| A question or Gurpreet's lines | `src/script.json` (and the matching `<step>-ask` or `fill-` line in `src/narration.json`) | `REPORT_DATE=… AI_SERVICE_KEY=… npm run record:answers -- <step id>`, then the voice |
| The order of the show | `CHAPTERS` and `RUN` in `src/App.tsx` | |

## What is where

- `src/App.tsx`: the page (modules bar, conversations, chat, mic) and the show itself, scene by scene
- `src/DsrPanel.tsx`: the Daily Site Report pane, filled from what the real filler returned
- `src/Sidebar.tsx`: the TaskForce modules bar
- `src/chat/`: TaskForce AI's report card, map, markdown, thinking panel and styles, as they are in the app
- `src/script.json`: the questions and Gurpreet's seven DSR sentences; `src/narration.json`: every voice line; `src/answers.json`: the recorded answers
- `scripts/`: the two recorders
