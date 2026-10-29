// Records the demo's voices with ElevenLabs, once, into public/audio/<id>.mp3 (lines and voices: src/narration.json).
// A line already recorded is kept; after changing a line's text, delete its mp3 (or pass --force to redo them all).
// Every line also gets the time each word is said (ElevenLabs forced alignment, src/alignment.json): the words heard
// appear on screen as they are spoken, and the narrator's cues (narration.json) land on their words.
//
// Usage: npm run record:voice   (reads ELEVENLABS_API_KEY from .env.local)

import fs from "fs";
import path from "path";

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) { console.error("Set ELEVENLABS_API_KEY in .env.local"); process.exit(1); }

const { voices, lines } = JSON.parse(fs.readFileSync("src/narration.json", "utf8"));
const OUT = path.resolve("public/audio");
const force = process.argv.includes("--force");
const ALIGN = path.resolve("src/alignment.json");
const alignment = fs.existsSync(ALIGN) ? JSON.parse(fs.readFileSync(ALIGN, "utf8")) : {};

// word start times (seconds into the recording), one per word of the line as split on spaces
async function align(file, text) {
  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(file)], { type: "audio/mpeg" }), path.basename(file));
  form.append("text", text);
  const res = await fetch("https://api.elevenlabs.io/v1/forced-alignment", { method: "POST", headers: { "xi-api-key": KEY }, body: form });
  if (!res.ok) throw new Error(`alignment ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).words.filter((w) => w.text.trim()).map((w) => Math.round(w.start * 1000) / 1000);
}
fs.mkdirSync(OUT, { recursive: true });

let made = 0;
for (const [id, { voice, text }] of Object.entries(lines)) {
  const out = path.join(OUT, `${id}.mp3`);
  if (!force && fs.existsSync(out)) {
    if (!alignment[id]) alignment[id] = await align(out, text);
    continue;
  }
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voices[voice].id}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": KEY },
    // eleven_v3: the most natural delivery; stability 0.5 ("natural") keeps every take on script
    body: JSON.stringify({ text, model_id: "eleven_v3", voice_settings: { stability: 0.5 } }),
  });
  if (!res.ok) { console.log(`  ${id}: ERROR ${res.status} ${(await res.text()).slice(0, 200)}`); continue; }
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  alignment[id] = await align(out, text);
  made++;
  console.log(`  ${id} (${voices[voice].name})`);
}
fs.writeFileSync(ALIGN, JSON.stringify(alignment) + "\n");
console.log(`Done: ${made} recorded into ${OUT}`);
