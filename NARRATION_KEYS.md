# Narration keys

Every voice line of the show, in the order it plays. Text goes in `src/narration.json` → `lines.<key>.text`.
A key still at `TODO` plays as a short silence. A `fill-N-point` / `fill-N-answer` key is optional: delete it and that beat is skipped.

Voices: `narrator` (Sarah), `user` (Chris, the owner asking), `supervisor` (Gurpreet Sandhu; Jessica's voice for now).
The `-ask` and `fill-N` lines are already the exact words sent to TaskForce AI. Change them only together with `src/script.json` (and re-record the answers): the on-screen caption is built from this text.

| Key | Voice | Chapter | Plays when |
|---|---|---|---|
| intro-1 | narrator | Intro | First line. Modules bar on screen, nothing lit yet. |
| intro-2 | narrator | Intro | While the modules bar lights Projects, Daily Site Report, Finance, Scheduling, Change Order, Document Control in turn. |
| intro-3 | narrator | Intro | After the lighting, modules bar still shown. |
| intro-4 | narrator | Intro | Right after intro-3. |
| meet-1 | narrator | Intro | The modules bar slides away; the TaskForce AI chat page is spotlit. |
| brief-lead | narrator | 1 Monday briefing | Empty chat, before the mic turns on. |
| brief-ask | user | 1 | Spoken into the mic; words appear in the composer as said. Then the answer streams in (about 5 s). |
| brief-point | narrator | 1 | After the report is on screen; the chat scrolls slowly down the report while it plays. |
| brief-verify | narrator | 1 | Right after brief-point, scroll continues to the bottom of the report. |
| crews-lead | narrator | 2 Idle crews | Before the mic turns on. |
| crews-ask | user | 2 | Spoken into the mic, then the answer streams in. |
| crews-point | narrator | 2 | Report on screen, scrolling down it. |
| crews-verify | narrator | 2 | After crews-point, scrolling to the end. |
| cash-lead | narrator | 3 Cash | Before the mic turns on. |
| cash-ask | user | 3 | Spoken into the mic, then the answer streams in. |
| cash-point | narrator | 3 | Report on screen, scrolling down it. |
| cash-verify | narrator | 3 | After cash-point, scrolling to the end. |
| schedule-lead | narrator | 4 Schedule | Before the mic turns on. |
| schedule-ask | user | 4 | Spoken into the mic, then the answer streams in. |
| schedule-point | narrator | 4 | Report on screen, scrolling down it. |
| schedule-verify | narrator | 4 | After schedule-point. |
| schedule-map | narrator | 4 | The chat glides to the report's map and spotlights it. May take `"cues"` (e.g. `{"word": "here", "show": ".leaflet-container"}`). |
| dsr-lead | narrator | 5 Daily Site Report | Before the mic turns on; chat still shows the earlier answers. |
| dsr-ask | supervisor | 5 | Spoken into the mic ("I want to fill today's daily site report."). Answer streams in and the form opens beside the chat. Audio already recorded and still matches. |
| dsr-open | narrator | 5 | The empty form has just opened. |
| fill-1 | supervisor | 5 | Spoken into the mic. Then Project, Site, Shift, Site supervisor fill; form shows Site Information (about 1.2 s pause). |
| fill-2 | supervisor | 5 | Then the Labour rows fill; form scrolls to Labor Tracking. |
| fill-3 | supervisor | 5 | Then the Equipment rows fill; form scrolls to Equipment. |
| fill-4 | supervisor | 5 | Then Materials and Quantity Tracking fill; form scrolls to Materials. |
| fill-5 | supervisor | 5 | Then the Bell delay fills; form scrolls to Delays & Issues. |
| fill-5-point | narrator | 5 | Right after the delay row appears (replaces the 1.2 s pause). Optional; may take cues like `{"word": "crew", "show": "[data-section='Labor Tracking']"}`. |
| fill-6 | supervisor | 5 | "What's still missing?" spoken. The question and TaskForce AI's reply "Still empty: Weather, Temperature." appear in the chat. |
| fill-6-answer | narrator | 5 | Right after that reply appears (reads it out). Optional. |
| fill-6-point | narrator | 5 | Plays while the form jumps to Weather Type and flashes it purple for 2 s. Optional. |
| fill-7 | supervisor | 5 | "Partly cloudy, twelve degrees." Weather and Temperature fill; form scrolls to Weather Conditions. |
| dsr-review | narrator | 5 | The form scrolls to Submit, then the review-before-submit box opens. |
| outro-1 | narrator | End | Last line, over the finished chat and form. |

Removed (old Halcrest story): `invoices-*`, `claim-*`, `fill-1-ask`, `fill-1-missing`, `fill-2-point`; the `maria` voice is now `supervisor`.
