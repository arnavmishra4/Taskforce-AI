// Records TaskForce AI's real answers for the demo (src/script.json), once, into src/answers.json.
// Each question is asked in a chat of its own; every event the AI service streams is kept with the time it arrived,
// so the demo replays the answer as it came in. A step with "fill" then has its sentences
// put into a Daily Site Report the way the app's DSR form does (POST /dsr/turn in form mode: the form's payload, its
// open questions and the shown list carried from one sentence to the next). Form mode is what asks back for what is
// missing ("What was the weather and temperature on site?").
//
// Usage: AI_SERVICE_KEY=… node scripts/record-answers.mjs [step ids…]   (ids given: only those are asked again)
// Env: AI_URL (default http://127.0.0.1:8000), TENANT (schema_3), USER_ID (1, Demo User). X-App construction.
//      REPORT_DATE (YYYY-MM-DD, default today): the day the Daily Site Report is for (the seed's empty voice day).

import fs from "fs";

const URL = process.env.AI_URL ?? "http://127.0.0.1:8000";
const KEY = process.env.AI_SERVICE_KEY;
if (!KEY) { console.error("Set AI_SERVICE_KEY"); process.exit(1); }

const script = JSON.parse(fs.readFileSync("src/script.json", "utf8"));
const headers = { "X-Service-Key": KEY, "X-User-Id": process.env.USER_ID ?? "1",
                  "X-Tenant-Schema": process.env.TENANT ?? "schema_3", "X-Unrestricted": "true", "X-App": "construction" };
const today = process.env.REPORT_DATE ?? new Date().toLocaleDateString("en-CA");
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) { console.error("REPORT_DATE must be YYYY-MM-DD"); process.exit(1); }

async function ask(prompt, chatId) {
  const form = new FormData();
  form.append("prompt", prompt);
  if (chatId) form.append("chat_id", chatId);
  const started = Date.now();
  const res = await fetch(`${URL}/chat`, { method: "POST", headers, body: form });
  if (!res.ok) throw new Error(`chat HTTP ${res.status}: ${await res.text()}`);
  const events = [];
  const decoder = new TextDecoder();
  let buffer = "";
  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      if (!part.startsWith("data: ") || part === "data: [DONE]") continue;
      try { events.push({ t: Date.now() - started, e: JSON.parse(part.slice(6)) }); } catch { /* skipped, as the page does */ }
    }
  }
  return events;
}

async function fill(text, form, earlier) {
  const res = await fetch(`${URL}/dsr/turn`, {
    method: "POST", headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ text, ...form, earlier, today, with_summary: true }),
  });
  if (!res.ok) throw new Error(`dsr/turn HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

const only = process.argv.slice(2);
const answers = only.length && fs.existsSync("src/answers.json") ? JSON.parse(fs.readFileSync("src/answers.json", "utf8")) : {};
for (const step of script.steps.filter((s) => !only.length || only.includes(s.id))) {
  console.log(`\n> ${step.ask}`);
  const t0 = Date.now();
  const events = await ask(step.ask);
  const text = events.map(({ e }) => e.text ?? "").join("");
  const report = events.find(({ e }) => e.report)?.e.report;
  console.log(`  ${((Date.now() - t0) / 1000).toFixed(1)}s${report ? ` · report "${report.title}"` : ""}`);
  // a chart or table that came back empty shows "No data" in the demo: worth asking again
  const empty = (report?.blocks ?? []).filter((b) => b.empty || (b.type === "chart" && !b.labels?.length));
  if (empty.length) console.log(`  ! empty: ${empty.map((b) => b.title).join(", ")}`);
  console.log(`  ${text.replace(/\n+/g, " ").slice(0, 600)}`);
  const fills = [];
  let form = { payload: { reportDate: today }, review: [], shown: null };
  for (const said of step.fill ?? []) {
    const r = await fill(said, form, fills.map((f) => f.said.slice(-600)).slice(-2));
    if (r.status !== "ok") throw new Error(`dsr/turn ${r.status}: ${r.note ?? ""}`);
    form = { payload: r.payload, review: r.review ?? [], shown: r.shown ?? null };
    fills.push({ said, reply: r.reply, summary: r.summary, changed: r.changed, review: r.review ?? [] });
    console.log(`  DSR: ${r.reply}`);
  }
  answers[step.id] = step.fill ? { events, fills, reportDate: today } : { events, fills };
}
fs.writeFileSync("src/answers.json", JSON.stringify(answers));
console.log("\nSaved src/answers.json");
