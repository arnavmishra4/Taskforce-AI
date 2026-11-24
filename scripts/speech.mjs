// Writes SPEECH_FLOW.md from the show's own lines (src/narration.json, in the order they play), so the speech read
// live is word for word what the demo says. Lines typed or said to TaskForce AI (the questions, "Yes", the DSR
// sentences) are in bold quotes. Usage: npm run speech
import fs from "fs";

const { lines } = JSON.parse(fs.readFileSync("src/narration.json", "utf8"));
const toAi = (id) => id.endsWith("-ask") || id === "send-yes" || /^fill-\d+$/.test(id);
const wrap = (text, width = 118) => text.split(" ").reduce((out, w) => {
  const last = out[out.length - 1];
  if (last && (last + " " + w).length <= width) out[out.length - 1] = last + " " + w; else out.push(w);
  return out;
}, []).join("\n");

// Live, the report goes to Talha Asif; the video keeps Arnav Mishra (its voices are recorded with him)
const LIVE = [["Send this report to Arnav Mishra and mishraarnav32@gmail.com", "Send this report to Talha Asif"],
              ["It found Arnav's work email in your staff records. His personal address works just as well.",
               "It found Talha's work email in your staff records."],
              ["Arnav Mishra", "Talha Asif"], ["Arnav", "Talha"],
              // the DSR lines in the presenter's own wording, with the item still on every work line
              ["On item C-15 a today, we had one open-cut foreman", "For work progress, on item C-15 a today, we had one open-cut foreman"],
              ["On the same item, we had the 40 tonne excavator going", "For equipment, on the same item, we had the 40 tonne excavator going"],
              ["And we got three hundred tonnes placed on C-15 a.", "On item C-15 a, we got three hundred tonnes placed."]];
const live = (text) => LIVE.reduce((t, [from, to]) => t.split(from).join(to), text);
const body = Object.entries(lines).map(([id, { text }]) => wrap(toAi(id) ? `**"${live(text)}"**` : live(text))).join("\n\n");
fs.writeFileSync("SPEECH_FLOW.md", `# TaskForce AI: the speech (Dixie Road & Mayfield Road)

*Read it straight through. Lines in quotes inside the speech are typed or said to TaskForce AI as you say them. The
reports are built live, so never say a number until it is on the screen: point, then read.*

---

${body}

---

<sub>**For the DSR, say these words exactly** (otherwise it stops to ask "which one?"): "open-cut foreman",
"open-cut labourers", "40 tonne excavator", "granular trucks", and the item on every work line: "On item C-15 a", "On
the same item", "on C-15 a" (the Submit check wants every crew, equipment and quantity row on an item). After the first
line it asks for the weather once: keep going. Start from a fresh report (New report in the form's menu). This file is
made from the demo's lines (src/narration.json) by \`npm run speech\`: change the lines there, not here.</sub>
`);
console.log("Wrote SPEECH_FLOW.md");
