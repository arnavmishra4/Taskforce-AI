# TaskForce AI demo: Halcrest

A hands-free presentation of TaskForce AI, the TaskForce assistant, for a company owner. Press **Play** and it runs on its own.

The story: you own Halcrest Civil Constructors, a fictional company with four public jobs (roads, a watermain, a bridge and a street rebuild), and it is Monday morning. Every question is asked by voice, and TaskForce AI answers from the live project records with a one-page report:

1. **Cash**: where cash is stuck across all the jobs, and the fastest way to get it back.
2. **Invoice check**: are we paying for work that never happened? Each invoice is checked against the subcontract, the agreed rates and the crews the site reports logged.
3. **Schedule**: why Ridgeline is late and what it costs, cross-checked across the schedule, the daily site reports and finance. It ends on the Ridgeline map.
4. **Delay claim**: what the Hydro delay at Harwood has cost, using only the days the records link to it.
5. **Daily Site Report**: Maria, the superintendent, describes her day and the form fills itself. She leaves out the weather, so TaskForce AI asks for it, and she answers.

It is a static site: no login, no backend, no keys in the browser.

- **The screens** are TaskForce AI's own components and styles, copied from `taskforce-construction-frontend` (`src/chat/`; the report card is from branch `tfAi-v2.2`, commit c9fcc6c2).
- **The answers are real.** They are recorded once from the TaskForce AI service on the Halcrest demo data (`src/answers.json`). The demo replays them as they streamed in, with the 20–35 s of thinking cut to about 3 s.
- **The voices** are recorded once with ElevenLabs (`public/audio/`): Sarah narrates, and Chris says the questions and Maria's lines into the mic. Sarah also says the question TaskForce AI asks back in the DSR scene.

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

Needs the TaskForce AI service running (default `http://127.0.0.1:8000`) against the database with the Halcrest demo data, and its service key.

```bash
REPORT_DATE=<voice day, YYYY-MM-DD> AI_SERVICE_KEY=… npm run record:answers
# one or more steps again: … npm run record:answers -- cash schedule
```

- `REPORT_DATE` is the day the Daily Site Report is for: the demo data's voice day, which has no report yet (`voice_day()` in `taskforce-ai/scripts/demo_seed/story.py`, the last working day up to the seed date). It is sent to the filler as `today`, put in the form as `reportDate`, and saved with the answer so the form shows that date. Without it, today is used.
- Other settings: `AI_URL`, `TENANT` (default `schema_3`), `USER_ID` (default `1`).
- The DSR fill is sent the way the app's form sends it (its payload, open questions and shown list carried from one sentence to the next). That is what makes the filler ask back for what is missing. Check the printed reply to the first sentence ends with "What was the weather and temperature on site?". If it asks something else, or asks nothing, fix the data or the sentence and record `dsr` again.
- Each answer is printed; a chart or table that came back empty is flagged with `!`.

### 2. Narration numbers

<!--
Narration placeholders (src/narration.json), to replace with the figures on screen after recording the answers:
  {cash_total}            cash-point      total cash stuck across the four jobs
  {cash_top_job}          cash-point      the job holding the most
  {cash_top_job_amount}   cash-point      how much that job holds
  {cash_fastest}          cash-point      the fastest money back (what it is)
  {cash_fastest_amount}   cash-point      how much that is
  {invoice_flag_count}    invoices-point  how many invoices were flagged
  {invoice_at_risk}       invoices-point  the money at risk on them
  {invoice_top_vendor}    invoices-point  the vendor of the biggest flag
  {invoice_top_issue}     invoices-point  what is wrong with it, in a few words
  {invoice_top_amount}    invoices-point  its amount
  {ridgeline_days_late}   schedule-point  days Ridgeline is behind
  {ridgeline_cause}       schedule-point  the cause, in a few words
  {ridgeline_cost}        schedule-point  what it has cost so far
  {claim_days}            claim-point     the delay days counted in the claim
  {claim_total}           claim-point     the claim total
-->

The point lines in `src/narration.json` (`cash-point`, `invoices-point`, `schedule-point`, `claim-point`) hold placeholders like `{cash_total}`. Replace each one with the figure as the recorded answer shows it on screen, written as it should be said ("four point two million dollars"), and only use figures that are on screen. The full list is in a comment at the top of this section. `npm run record:voice` skips a line that still has a placeholder.

A narrator line can also move the page on a word: `"cues": [{ "word": "Ridgeline", "show": "<heading text or a CSS selector>" }]`. A point line without cues scrolls on through the answer while it is spoken.

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
| A question or Maria's lines | `src/script.json` (and the matching `-ask` / `fill-` line in `src/narration.json`) | `REPORT_DATE=… AI_SERVICE_KEY=… npm run record:answers -- <step id>`, then the voice |
| The order of the show | `CHAPTERS` and `RUN` in `src/App.tsx` | |

## What is where

- `src/App.tsx`: the page (modules bar, conversations, chat, mic) and the show itself, scene by scene
- `src/DsrPanel.tsx`: the Daily Site Report pane, filled from what the real filler returned
- `src/Sidebar.tsx`: the TaskForce modules bar
- `src/chat/`: TaskForce AI's report card, map, markdown, thinking panel and styles, as they are in the app
- `src/script.json`: the questions and Maria's two DSR turns; `src/narration.json`: every voice line; `src/answers.json`: the recorded answers
- `scripts/`: the two recorders
