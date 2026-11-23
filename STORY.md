# TaskForce AI: COO demo voice-over

Audience: COO of a $2.6B Canadian heavy-civil contractor. Sceptical, short on time, commercially sharp.
One job, one Monday: **Dixie Road & Mayfield Road Widening** (Peel Region). The contractor is "your company" / "we" in the voice-over; it is never named.
This is the final narration: it matches `src/narration.json` line for line. Every figure is read off the recorded answers (`src/answers.json`, recorded 2026-11-23 from staging, tenant schema_3, user 119).

## The story in one breath

1. The answers to "are we on track, what is it costing, where is our cash" exist, but they sit with four people, so a decision arrives days late and already filtered.
2. TaskForce already holds every one of those records; TaskForce AI reads across all of them at once and hands back one page.
3. On one job, one Monday: a briefing, crews on standby, $20.29M stuck, and which delays we can bill back, each in about a minute.
4. It all rests on the field: the site supervisor files a complete report by talking, the same day, which is why the answers can be trusted.

## Rules for every line

- Never say a "% behind" or a number of slip days (the schedule data is being re-migrated), even though the briefing shows them.
- We **claim**; the Region **certifies**. Never "certify" for us.
- Only causes and figures printed on screen. "Peaked in July" is said only because the crews chart shows it.
- Sec is speaking time at about 2.5 words a second; each line stays within 4 to 12 s where it can.

## 1. The problem (TaskForce home, modules bar)

| Key | Speaker | Sec | Line |
|---|---|---|---|
| intro-1 | narrator | 6 | It's Monday morning. You have one simple question: is the Dixie Road job on track? |
| intro-2 | narrator | 10 | The answer exists. But it's split across the schedule, the daily site reports, finance and the contract, and each of those belongs to someone else. |
| intro-3 | narrator | 11 | So someone stitches it together. It reaches you days old, tidied on the way up. And every day a problem waits is margin you don't get back. |

## 2. Meet TaskForce AI

| Key | Speaker | Sec | Line |
|---|---|---|---|
| meet-1 | narrator | 12 | Those records already live in TaskForce. Ask TaskForce AI in plain words, and it reads them all at once: one page, with the numbers, the evidence, and what to do first. |

## 3. The Monday briefing (`brief`)

On screen: schedule KPIs, change orders awaiting approval ($214.3K add days, $65K no impact), delay causes (3 of 6 unforeseen / third party), overdue RFIs, map.

| Key | Speaker | Sec | Line |
|---|---|---|---|
| brief-lead | narrator | 6 | One job, one Monday: the Dixie Road and Mayfield Road widening, for Peel Region. |
| brief-ask | owner | 4 | What should I worry about on Dixie this week? |
| _(dwell)_ | | ~5 | |
| brief-point | narrator | 8 | It starts with the schedule. Dixie is behind, and half of the delays logged on site came from third parties. |
| brief-verify | narrator | 10 | Two hundred fourteen thousand dollars of change orders that add days are still waiting on approval. One page, from the live records. Let's pull each thread. |

## 4. Crews on standby (`crews`)

On screen: 819 standby hours on own forces; by trade Foreman (Open Cut) 273, Labourer (Open Cut) 261; by subcontractor; monthly trend peaking at 429 in July.

| Key | Speaker | Sec | Line |
|---|---|---|---|
| crews-lead | narrator | 4 | Start with the leak nobody reports: crews being paid to wait. |
| crews-ask | owner | 4 | Where are we paying for crews that aren't producing on Dixie? |
| _(dwell)_ | | ~5 | |
| crews-point | narrator | 7 | Open-cut foremen, two hundred seventy-three standby hours. Open-cut labourers, two hundred sixty-one. And it peaked in July. |
| crews-verify | narrator | 8 | Eight hundred nineteen of those hours are our own forces, not subcontractors. That's the conversation with the superintendent this week. |

## 5. Cash (`cash`)

On screen: $20.29M stuck, $20.01M work done not yet approved for billing, $279.3K extra work awaiting sign-off; "Claim $1.82M on item C-15 b)".

| Key | Speaker | Sec | Line |
|---|---|---|---|
| cash-lead | narrator | 1 | Now the money. |
| cash-ask | owner | 7 | How much money is the Dixie & Mayfield job owed right now, and what should we chase first? |
| _(dwell)_ | | ~5 | |
| cash-point | narrator | 9 | Twenty point two nine million dollars is stuck. Almost all of it is work in the ground, not yet approved for billing. |
| cash-verify | narrator | 8 | First move: put one point eight two million on item C-fifteen b, Granular A, in this month's progress claim. |

## 6. Delay claims (`schedule`)

The old question ("Why is Dixie behind schedule, and what's it costing us?") returned the same page as the briefing, so it was replaced.
On screen: "Half of 6 delay entries are third-party, billable to the Region."; 1,131 standby hours; delays by type; standby by trade; delays per month; map.

| Key | Speaker | Sec | Line |
|---|---|---|---|
| schedule-lead | narrator | 4 | And the delays. Which ones can we bill back? |
| schedule-ask | owner | 4 | Which Dixie delays can we bill back to the Region? |
| _(dwell)_ | | ~5 | |
| schedule-point | narrator | 8 | Three of the six delays logged on site came from third parties. Those are the ones to take to the Region. |
| schedule-verify | narrator | 8 | Beside them, eleven hundred thirty-one standby hours from the same site reports. That's the evidence a claim is built on. |
| schedule-map | narrator | 10 | And here's where it's happening: Dixie Road, thirteen plus five-twenty to sixteen plus five hundred, and Mayfield Road, thirty-nine plus seven-fourteen to forty-one plus three seventy-six. |

## 7. The field (`dsr`)

Gurpreet's lines are `DSR_DEMO_SPEECH.md`, word for word (tested clean: turn 6 answers "Still empty: Weather, Temperature." and jumps to the weather).

| Key | Speaker | Sec | Line |
|---|---|---|---|
| dsr-lead | narrator | 11 | Every answer you just saw is only as good as what comes in from site. So here's Gurpreet Sandhu, the site supervisor, at the end of his day. |
| dsr-ask | supervisor | 3 | I want to fill today's daily site report. |
| _(dwell)_ | | ~5 | |
| dsr-open | narrator | 5 | The report opens beside the chat. No typing, no dropdowns. He just talks. |
| fill-1 | supervisor | 8 | Start a daily report for Dixie Road and Mayfield Road, on the Dixie corridor site. Day shift, Gurpreet Sandhu supervising. |
| fill-2 | supervisor | 7 | On the storm sewer we had one open-cut foreman, four open-cut labourers and two pipelayers, ten hours each. |
| fill-3 | supervisor | 6 | We ran the 40 tonne excavator and three tri-axle dump trucks, ten hours each. |
| fill-4 | supervisor | 4 | On item C-15 a we placed three hundred tonnes. |
| fill-5 | supervisor | 7 | We lost two hours waiting for Bell to locate a duct bank at station fourteen plus two-eighty. |
| fill-5-point | narrator | 7 | Crew, equipment, quantities against the contract item, and the Bell delay, each matched to your real records. |
| fill-6 | supervisor | 1 | What's still missing? |
| fill-6-answer | narrator | 2 | Still empty: Weather, Temperature. |
| fill-6-point | narrator | 3 | And the form jumps straight to it. |
| fill-7 | supervisor | 2 | Partly cloudy, twelve degrees. |
| dsr-review | narrator | 13 | That two-hour Bell delay is on the record, at a station, the same day: the paper trail that wins a delay claim. And these hours and quantities feed tomorrow's standby and billing answers. |

If the show runs long, `fill-3` (equipment) is the line to cut (with its sentence in `src/script.json`, then re-record the DSR).

## 8. Close

Three outcomes a COO can repeat to the CEO, then the closing line.

| Key | Speaker | Sec | Line |
|---|---|---|---|
| outro-1 | narrator | 13 | Know where a job stands in one minute, not one week. Find idle crews and unbilled work while it's still recoverable. Every delay logged the same day it happens, ready for a claim. |
| outro-2 | narrator | 6 | You don't need more reports. You need fewer steps between the question and the answer. |

## Running time

About 4 min 10 s of voice, plus about 1 min of screen time (answers building, mic, form filling, map): **about 5 min 10 s**. To reach 6 to 8 minutes, let each answer sit longer on screen; don't add words.
