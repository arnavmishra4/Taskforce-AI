# TaskForce AI: client demo voice-over

Audience: COO of a $2.6B Canadian heavy-civil contractor. Sceptical, short on time, commercially sharp.
This is a client demo, not a skit: the narrator is the presenter. The narrator also asks the questions: each is said aloud and typed into the chat as she says it (no separate "owner" character). Only the narrator and the site supervisor's DSR speech are voiced.
One job, one Monday: **Dixie Road & Mayfield Road Widening** (Peel Region). The voice-over is a story the viewer steps into, in the second person ("Dixie Road and Mayfield Road is your job"), the viewer is the one asking. The contractor is never named.
This is the final narration: it matches `src/narration.json` line for line. Every figure is read off the recorded answers (`src/answers.json`, recorded 2026-11-23 from staging, tenant schema_3, user 119).

## The story in one breath

1. Picture it: Dixie is your job, it's Monday, seven a.m. The weekend's updates (site reports, a schedule that moved, costs in finance, extra work awaiting sign-off) are scattered and don't talk to each other, so answering "are we okay?" takes phone calls until Thursday.
2. Now you just ask. TaskForce AI goes through every one of those updates and comes back with one page: what's wrong, how bad, what to do first. Every number comes straight from your own records.
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
| intro-1 | narrator | 9 | Picture this. Dixie Road and Mayfield Road is your job. Two roads, crews out every day, the Region watching. It's Monday, seven a.m. |
| intro-2 | narrator | 11 | Over the weekend, the updates piled up. Daily site reports from the field. A schedule that moved. Costs landing in finance. Extra work waiting on the client's sign-off. |
| intro-3 | narrator | 8 | Every one of them matters. None of them talk to each other. And the one question you actually have, are we okay, isn't answered in any of them. |
| intro-4 | narrator | 8 | So you start calling. The project manager, the superintendent, accounting. By Thursday you have an answer. By then, it's already cost you. |

## 2. Meet TaskForce AI

| Key | Speaker | Sec | Line |
|---|---|---|---|
| meet-1 | narrator | 10 | Now imagine you just ask. TaskForce AI goes through every one of those updates for you, and comes back with one page: what's wrong, how bad, and what to do first. |
| meet-2 | narrator | 3 | Every number on it comes straight from your own records. |

## 3. The Monday briefing (`brief`)

On screen: schedule KPIs, change orders awaiting approval ($214.3K add days, $65K no impact), delay causes (3 of 6 unforeseen / third party), overdue RFIs, map.

| Key | Speaker | Sec | Line |
|---|---|---|---|
| brief-lead | narrator | 3 | So. Monday, seven a.m. One question. |
| brief-ask | narrator (typed as she says it) | 2 | What should I worry about on Dixie this week? |
| _(dwell)_ | | ~5 | |
| brief-point | narrator | 8 | It starts with the schedule. Dixie is behind, and half of the delays logged on site came from third parties. |
| brief-verify | narrator | 10 | One page, from the live records, instead of three reports from three departments. Let's pull each thread. |

## 4. Crews on standby (`crews`)

On screen: 819 standby hours on own forces; by trade Foreman (Open Cut) 273, Labourer (Open Cut) 261; by subcontractor; monthly trend peaking at 429 in July.

| Key | Speaker | Sec | Line |
|---|---|---|---|
| crews-lead | narrator | 6 | Start with the leak nobody reports: crews being paid to wait. Let's ask it. |
| crews-ask | narrator (typed as she says it) | 3 | Where are we paying for crews that aren't producing on Dixie? |
| _(dwell)_ | | ~5 | |
| crews-point | narrator | 7 | Open-cut foremen, two hundred seventy-three standby hours. Open-cut labourers, two hundred sixty-one. And it peaked in July. |
| crews-verify | narrator | 8 | Three daily reports, D-S-R forty-three, fifty-seven and forty-four, carry the most standby. That's where the conversation with the superintendent starts this week. |

## 5. Cash (`cash`)

On screen: $20.29M stuck, $20.01M work done not yet approved for billing, $279.3K extra work awaiting sign-off; "Claim $1.82M on item C-15 b)".

| Key | Speaker | Sec | Line |
|---|---|---|---|
| cash-lead | narrator | 1 | Now the money. |
| cash-ask | narrator (typed as she says it) | 5 | How much money is the Dixie & Mayfield job owed right now, and what should we chase first? |
| _(dwell)_ | | ~5 | |
| cash-point | narrator | 9 | Twenty point two nine million dollars is stuck. Almost all of it is work in the ground, not yet approved for billing. |
| cash-verify | narrator | 8 | First move: put one point eight two million on item C-fifteen b, Granular A, in this month's progress claim. |

## 6. Delay claims (`schedule`)

The old question ("Why is Dixie behind schedule, and what's it costing us?") returned the same page as the briefing, so it was replaced.
On screen: "Half of 6 delay entries are third-party, billable to the Region."; 1,131 standby hours; delays by type; standby by trade; delays per month; map.

| Key | Speaker | Sec | Line |
|---|---|---|---|
| schedule-lead | narrator | 4 | Now the delays, and which of them belong on a claim. |
| schedule-ask | narrator (typed as she says it) | 2 | Which Dixie delays can we bill back to the Region? |
| _(dwell)_ | | ~5 | |
| schedule-point | narrator | 8 | Three of the six delays logged on site came from third parties. Those are the ones to take to the Region. |
| schedule-verify | narrator | 8 | An unmarked Bell duct bank, nesting birds, an archaeological find: each one logged by date and report. That's the evidence a claim is built on. |
| schedule-map | narrator | 10 | And here's where it's happening: Dixie Road, thirteen plus five-twenty to sixteen plus five hundred, and Mayfield Road, thirty-nine plus seven-fourteen to forty-one plus three seventy-six. |

## 7. The field (`dsr`)

Gurpreet's lines are `DSR_DEMO_SPEECH.md`, word for word (tested clean: turn 6 answers "Still empty: Weather, Temperature." and jumps to the weather).

| Key | Speaker | Sec | Line |
|---|---|---|---|
| dsr-lead | narrator | 11 | Every answer you just saw is only as good as what comes in from site. So here's what a site supervisor says at the end of his day. |
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

Three outcomes the COO can repeat to the CEO, then the closing line.

| Key | Speaker | Sec | Line |
|---|---|---|---|
| outro-1 | narrator | 13 | Know where a job stands in one minute, not one week. Find idle crews and unbilled work while it's still recoverable. Every delay logged the same day it happens, ready for a claim. |
| outro-2 | narrator | 6 | You don't need more reports. You need fewer steps between the question and the answer. |

## Running time

About 4 min 30 s of voice (the questions are now part of it), plus about 1 min of screen time (answers building, form filling, map): **about 5 min 30 s**. To reach 6 to 8 minutes, let each answer sit longer on screen; don't add words.
