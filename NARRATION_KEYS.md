# Narration keys

Every voice line of the show, in the order it plays. Text goes in `src/narration.json` → `lines.<key>.text`.
A key still at `TODO` plays as a short silence. A `fill-N-point` / `fill-N-answer` key is optional: delete it and that beat is skipped.

Voices: `narrator` (Sarah, the presenter), `supervisor` (Gurpreet Sandhu; Jessica's voice for now). The questions are said by the narrator (`brief-ask`, `crews-ask`, `cash-ask`, `schedule-ask`, the presenter asking TaskForce AI) and typed into the chat composer in time with her voice, word by word at the times in `src/alignment.json`, then sent about 0.3 s after she finishes. Their text must stay the same as `ask` in `src/script.json`. Without a recording, the question is typed silently.
The `dsr-ask` and `fill-N` lines are already the exact words sent to TaskForce AI. Change them only together with `src/script.json` (and re-record the answers): the on-screen caption is built from this text.

| Key | Voice | Chapter | Plays when |
|---|---|---|---|
| intro-1 | narrator | Intro | First line. Modules bar on screen, nothing lit yet. |
| intro-2 | narrator | Intro | While the modules bar lights Projects, Daily Site Report, Finance, Scheduling, Change Order, Document Control in turn. |
| intro-3 | narrator | Intro | After the lighting, modules bar still shown. |
| intro-4 | narrator | Intro | Right after intro-3, modules bar still shown. |
| meet-1 | narrator | Intro | The modules bar slides away; the TaskForce AI chat page is spotlit. |
| meet-2 | narrator | Intro | Right after meet-1, same screen. |
| brief-lead | narrator | 1 Monday briefing | Empty chat, before the question. |
| brief-ask | narrator | 1 | Said while it is typed into the composer; sent when she finishes. Then the answer streams in. |
| brief-wait | narrator | 1 | While the answer comes in ("Watch it work"). |
| brief-point | narrator | 1 | After the report is on screen; the chat scrolls slowly down the report while it plays. |
| brief-verify | narrator | 1 | Right after brief-point, scroll continues to the bottom of the report. |
| send-lead | narrator | 1 | After the briefing: the report goes to Arnav. |
| send-ask | narrator | 1 | Typed into the chat as it is said ("Send this report to Arnav Mishra and …"). |
| send-yes | narrator | 1 | "Yes", typed as it is said, to the AI's "Want me to send…?". |
| send-point | narrator | 1 | After "Sent to Arnav Mishra and … by email." |
| crews-lead | narrator | 2 Idle crews | Before the question. |
| crews-ask | narrator | 2 | Said while it is typed into the composer; sent when she finishes. Then the answer streams in. |
| crews-point | narrator | 2 | Report on screen, scrolling down it. |
| crews-verify | narrator | 2 | After crews-point, scrolling to the end. |
| cash-lead | narrator | 3 Cash | Before the question. |
| cash-ask | narrator | 3 | Said while it is typed into the composer; sent when she finishes. Then the answer streams in. |
| cash-point | narrator | 3 | Report on screen, scrolling down it. |
| cash-verify | narrator | 3 | After cash-point, scrolling to the end. |
| schedule-lead | narrator | 4 Delay claims | Before the question. |
| schedule-ask | narrator | 4 | Said while it is typed into the composer; sent when she finishes. Then the answer streams in. |
| schedule-point | narrator | 4 | Report on screen, scrolling down it. |
| schedule-verify | narrator | 4 | After schedule-point. |
| schedule-map | narrator | 4 | The chat glides to the report's map and spotlights it. May take `"cues"` (e.g. `{"word": "here", "show": ".leaflet-container"}`). |
| dsr-lead | narrator | 5 Daily Site Report | Before the mic turns on; chat still shows the earlier answers. |
| dsr-ask | supervisor | 5 | Spoken into the mic ("I want to fill today's daily site report."). Answer streams in and the form opens beside the chat. Audio already recorded and still matches. |
| dsr-open | narrator | 5 | The empty form has just opened. |
| fill-1 | supervisor | 5 | Spoken into the mic. Then Project, Site, Shift, Site supervisor fill; form shows Site Information (about 1.2 s pause). |
| fill-2 | supervisor | 5 | Then the Labour rows fill; form scrolls to Labor Tracking. |
| fill-3 | supervisor | 5 | Then the Equipment rows fill; form scrolls to Equipment. |
| fill-4 | supervisor | 5 | Then Quantity Tracking fills (C-15 a), 300); form scrolls to Quantity Tracking. |
| fill-5 | supervisor | 5 | Then the Bell delay fills; form scrolls to Delays & Issues. |
| fill-5-point | narrator | 5 | Right after the delay row appears (replaces the 1.2 s pause). Optional; may take cues like `{"word": "crew", "show": "[data-section='Labor Tracking']"}`. |
| fill-6 | supervisor | 5 | "What's still missing?" spoken. The question and TaskForce AI's reply "Still empty: Weather, Temperature." appear in the chat. |
| fill-6-point | narrator | 5 | After the "still missing" reply; the form jumps to the weather. |
| fill-7 | supervisor | 5 | "Partly cloudy, twelve degrees." Weather and Temperature fill; form scrolls to Weather Conditions. |
| dsr-review | narrator | 5 | The form scrolls to Submit, then the review-before-submit box opens. |
| outro-1 | narrator | End | Over the finished chat and form: the three outcomes. |
| outro-2 | narrator | End | Last line, right after outro-1. |

Removed: the `user` voice (the narrator asks the questions now). Removed (old Halcrest story): `invoices-*`, `claim-*`, `fill-1-ask`, `fill-1-missing`, `fill-2-point`; the `maria` voice is now `supervisor`.
