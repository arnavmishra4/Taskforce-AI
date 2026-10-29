// The TaskForce AI demo: the app's modules bar, the TaskForce AI page and its Daily Site Report pane, driven hands-free.
// A voice-over (ElevenLabs, public/audio/<id>.mp3, lines in narration.json) walks through it; the questions are typed
// or spoken into the chat and the answers that come back are TaskForce AI's real ones, recorded once from the AI service
// (answers.json, scripts/record-answers.mjs) and replayed as they streamed, with the waiting cut short.
import React, { useEffect, useRef, useState } from "react";
import chat from "./chat/tfai.module.css";
import dsrStyles from "./chat/dsr.module.css";
import ui from "./demo.module.css";
import ReportCard from "./chat/ReportCard";
import type { Report } from "./chat/types";
import { LiveCaption } from "./chat/LiveCaption";
import { ThinkingPanel, renderMarkdown, type Step } from "./chat/parts";
import Sidebar from "./Sidebar";
import DsrPanel, { type Summary } from "./DsrPanel";
import script from "./script.json";
import narration from "./narration.json";
import recorded from "./answers.json";
import * as voice from "./voice";
import alignment from "./alignment.json";

type Msg = {
  role: "user" | "assistant";
  content: string;
  steps?: Step[];
  pending?: boolean;
  report?: Report;
  thoughtMs?: number;
  startedAt?: number;
};
type Recorded = Record<string, {
  events: { t: number; e: Record<string, any> }[];
  fills: { said: string; reply: string; summary: Summary }[];
}>;
type MicState = "off" | "connecting" | "listening" | "hearing" | "working";
type LineId = keyof typeof narration.lines;

const answers = recorded as unknown as Recorded;
const sessions: string[] = [];
const THINK_MS = 3200;      // the lookups play out over this long (the real ones took 20-35 s)
const STREAM_MS = 2600;     // and the written answer streams in over at most this long
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const readMs = (text: string) => Math.max(1600, text.split(/\s+/).length * 360);
class Stopped extends Error {}

// The chapters of the show, in the bar at the bottom: what each one shows, as tags above it
const CHAPTERS = [
  { key: "intro", label: "Intro", title: "TaskForce and TaskForce AI", tags: ["Modules bar", "Live records", "Meet TaskForce AI"] },
  { key: "live", label: "1", title: "Live data", tags: ["Plain-English question", "Live inspection records", "Thinking steps", "Source"] },
  { key: "report", label: "2", title: "Smart report", tags: ["Report built on its own", "Charts and tables", "Findings", "Next steps", "PDF export"] },
  { key: "intel", label: "3", title: "Smart intel", tags: ["Street-by-street breakdown", "Highlights", "Data gaps flagged"] },
  { key: "map", label: "4", title: "Maps", tags: ["Roads on a map", "Coloured by progress", "Grey · Colour · Satellite", "Chat history"] },
  { key: "voice", label: "5", title: "Voice", tags: ["Tap the mic", "Live transcript", "Spoken question"] },
  { key: "dsr", label: "6", title: "Daily Site Report", tags: ["Opened by voice", "Form filled from speech", "Matched to real records", "Review before submit"] },
  { key: "end", label: "End", title: "Wrap-up", tags: ["Everything in one place"] },
] as const;
type ChapterKey = (typeof CHAPTERS)[number]["key"];

const STAR = "M12 3C12 3 13 8 15.5 10.5C18 13 23 13 23 13C23 13 18 13 15.5 15.5C13 18 12 23 12 23C12 23 11 18 8.5 15.5C6 13 1 13 1 13C1 13 6 13 8.5 10.5C11 8 12 3 12 3Z";

export default function App() {
  // ── what the page shows ──
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chats, setChats] = useState<string[]>(sessions);
  const [mic, setMic] = useState<MicState>("off");
  const [focus, setFocus] = useState(false);   // someone is talking: the rest of the page steps back
  const [heard, setHeard] = useState("");
  const [dsrOpen, setDsrOpen] = useState(false);
  const [form, setForm] = useState<{ now: Summary | null; was: Summary | null }>({ now: null, was: null });
  const [dsrBusy, setDsrBusy] = useState(false);
  const [dsrLine, setDsrLine] = useState<{ said: string; did: string; working: boolean } | null>(null);
  const [review, setReview] = useState(false);
  const [moduleLit, setModuleLit] = useState<string>();
  const [moduleOpen, setModuleOpen] = useState<string>();
  // ── the presentation ──
  const [phase, setPhase] = useState<"ready" | "running" | "done">("ready");
  const [paused, setPaused] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  const areaRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLFormElement>(null);
  const follow = useRef(true);   // the chat keeps to its newest message (off while the demo scrolls it itself)
  const ctl = useRef({ run: 0, paused: false });

  useEffect(() => {
    if (follow.current) areaRef.current?.scrollTo({ top: areaRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ── waiting, stopping, pausing ──
  const live = (run: number) => { if (run !== ctl.current.run) throw new Stopped(); };
  const wait = async (ms: number, run: number) => {
    for (let t = 0; t < ms;) { live(run); await sleep(50); if (!ctl.current.paused) t += 50; }
  };

  // ── the voices: the narrator, and the person talking to TaskForce AI ──
  const play = async (id: LineId, run: number, onTime?: (at: number, of: number, from: number) => void,
                      level?: HTMLElement | null) => {
    if (!(await voice.play(id, () => run === ctl.current.run, onTime, level))) {
      // no recording: the line is given its time, silently
      const ms = readMs(narration.lines[id].text);
      for (let t = 0; t < ms; t += 50) { onTime?.(t, ms, 0); await wait(50, run); }
      onTime?.(1, 1, 0);
    }
    live(run);
  };
  // two lines back to back, with the breath a speaker takes between them
  const say = async (ids: LineId[], run: number) => {
    for (const [n, id] of ids.entries()) { if (n) await wait(220, run); await play(id, run); }
  };

  // ── moving through the page ──
  const glide = async (box: HTMLElement | null, to: number, ms: number, run: number) => {
    if (!box) return;
    const from = box.scrollTop;
    const target = Math.max(0, Math.min(to, box.scrollHeight - box.clientHeight));
    for (let t = 0; t <= ms; t += 16) {
      live(run);
      await sleep(16);
      if (ctl.current.paused) { t -= 16; continue; }
      const k = t / ms;
      box.scrollTop = from + (target - from) * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);
    }
  };
  const topIn = (el: Element, box: HTMLElement) =>
    el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 16;
  const spot = (el: Element | null | undefined, ms: number) => {
    if (!el) return;
    el.classList.add(ui.spot);
    setTimeout(() => el.classList.remove(ui.spot), ms);
  };
  const $ = (q: string) => document.querySelector(q) as HTMLElement | null;
  const lastAnswer = () => {
    const rows = areaRef.current?.querySelectorAll(`.${chat.assistantRow}`);
    return rows?.length ? (rows[rows.length - 1] as HTMLElement) : null;
  };

  // ── asking: typed, or said into the mic ──
  const type = async (text: string, run: number) => {
    for (let i = 1; i <= text.length; i++) { await wait(18 + Math.random() * 34, run); setInput(text.slice(0, i)); }
    await wait(280, run);
    spot($(`.${chat.sendButton}`), 600);
    await wait(180, run);
    setInput("");
  };
  const speak = async (id: LineId, run: number) => {
    const words = narration.lines[id].text.split(" ");
    // each word appears as it is said: its start in the recording (alignment.json, ElevenLabs forced alignment),
    // a little early for the caption's fade-in; evenly over the clip when there is none
    const starts = (alignment as Record<string, number[]>)[id];
    const said = (at: number, of: number, from: number) =>
      starts ? starts.filter((t) => t <= from + at + 0.06).length : Math.ceil((at / of) * words.length);
    setFocus(true);
    setMic("hearing");
    await play(id, run, (at, of, from) => setHeard(words.slice(0, said(at, of, from)).join(" ")), composerRef.current);
    setMic("listening");
    await wait(350, run);   // the pause that sends it
    setHeard("");
    setFocus(false);
  };

  // the recorded answer, replayed as it streamed: the lookups first, then the report, then the written answer
  type Built = { steps: Step[]; text: string; report?: Report };
  const fold = (a: Built, e: Record<string, any>, textOnly: boolean): Built => {
    let { steps, text, report } = a;
    if (e.step?.id) {
      const s = e.step as Step;
      steps = steps.some((x) => x.id === s.id) ? steps.map((x) => (x.id === s.id ? { ...x, ...s } : x)) : [...steps, s];
    }
    if (e.report?.blocks && !textOnly) report = e.report as Report;
    if (e.text) text += e.text;
    return { steps, text, report };
  };
  const askOf = (id: string) => script.steps.find((s) => s.id === id)!;
  const textOnlyOf = (id: string) => { const s = askOf(id); return "textOnly" in s && !!s.textOnly; };
  const listChat = (asked: string) =>
    setChats((c) => [asked.slice(0, 40) + (asked.length > 40 ? "…" : ""), ...c.filter((x) => !asked.startsWith(x.replace(/…$/, "")))]);

  // textOnly: the written answer alone (a quick question: "not everything needs a report")
  const answer = async (id: string, asked: string, run: number, textOnly = false) => {
    setMessages((m) => [...m, { role: "user", content: asked }]);
    listChat(asked);
    const { events } = answers[id];
    const first = events.find(({ e }) => e.text)?.t ?? events[events.length - 1]?.t ?? 1;
    const last = events[events.length - 1]?.t ?? first;
    const k = Math.min(1, STREAM_MS / Math.max(1, last - first));
    const at = (t: number) => (t < first ? (t / first) * THINK_MS : THINK_MS + (t - first) * k);
    const startedAt = Date.now();
    let built: Built = { steps: [], text: "" }, thoughtMs: number | undefined;
    const show = (pending: boolean) => setMessages((m) => [...m.slice(0, -1),
      { role: "assistant", content: built.text, steps: built.steps, report: built.report, pending, thoughtMs, startedAt }]);
    setMessages((m) => [...m, { role: "assistant", content: "", steps: [], pending: true, startedAt }]);
    let clock = 0;
    for (const { t, e } of events) {
      await wait(at(t) - clock, run);
      clock = at(t);
      if (e.text) thoughtMs ??= Date.now() - startedAt;
      built = fold(built, e, textOnly);
      if (e.dsr?.start) setDsrOpen(true);
      if (e.step || e.report || e.text) show(built.text === "");
    }
    built = { ...built, steps: built.steps.map((s) => (s.state === "running" ? { ...s, state: "done" as const } : s)) };
    show(false);
    await wait(500, run);   // charts draw, the map loads its tiles
  };

  // the voice points at the answer while the chat moves down through it
  const walk = async (lines: LineId[], run: number) => {
    follow.current = false;
    const box = areaRef.current, row = lastAnswer();
    const ms = lines.reduce((n, id) => n + readMs(narration.lines[id].text), 0);
    await Promise.all([
      (async () => { await wait(250, run); await say(lines, run); })(),
      (async () => {
        if (box && row) await glide(box, topIn(row, box), 800, run);
        await glide(box, box?.scrollHeight ?? 0, ms, run);
      })(),
    ]);
    follow.current = true;
  };

  // ── the show ──
  const showModules = async (run: number) => {
    const list = $('[data-demo="module-list"]');
    spot($('[data-demo="modules"]'), 9000);
    const lighting = (async () => {
      for (const m of ["Projects", "Daily Site Report", "Finance", "Equipment", "Document Control", "Quality Control", "Timesheet"]) {
        setModuleLit(m);
        const el = list?.querySelector(`[data-module="${m}"]`);
        if (el && list) await glide(list, topIn(el, list) - 80, 450, run);
        await wait(700, run);
      }
      if (list) await glide(list, 0, 600, run);
      setModuleLit("Daily Site Report");
      setModuleOpen("Daily Site Report");
    })();
    await Promise.all([play("intro-1", run), lighting]);
    await wait(220, run);
    await play("intro-2", run);
    setModuleOpen(undefined);
    setModuleLit(undefined);
  };

  const showAssistant = async (run: number) => {
    spot($(`.${chat.mainContent}`), 3500);
    await play("meet-1", run);
  };

  const showHistory = async (run: number) => {
    setHistoryOpen(true);
    await wait(400, run);
    spot($(`.${chat.chatHistory}`), 4200);
    await play("history-1", run);
    setHistoryOpen(false);
    await wait(500, run);
  };

  const ask = async (id: string, title: string, run: number, extra?: (run: number) => Promise<void>) => {
    const step = script.steps.find((s) => s.id === id)!;
    await play(`${id}-lead` as LineId, run);
    await wait(150, run);
    await type(step.ask, run);
    await answer(id, step.ask, run, "textOnly" in step && !!step.textOnly);
    await walk([`${id}-point` as LineId], run);
    if (extra) await extra(run);
  };

  const downloadPdf = async (run: number) => {
    const box = areaRef.current, row = lastAnswer();
    const button = row && Array.from(row.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Download PDF");
    if (!box || !row || !button) return;
    follow.current = false;
    await glide(box, topIn(row.querySelector('[role="region"]') ?? row, box), 900, run);
    spot(button, 3000);
    await Promise.all([play("report-pdf", run), (async () => {
      await wait(1400, run);
      button.click();
      for (let t = 0; t < 30000 && button.textContent?.trim() === "Preparing…"; t += 100) await wait(100, run);
    })()]);
    follow.current = true;
  };

  const tourMap = async (run: number) => {
    const box = areaRef.current, row = lastAnswer();
    const map = row?.querySelector(".leaflet-container");
    const control = row?.querySelector(".leaflet-control-layers");
    if (!box || !map || !control) return;
    follow.current = false;
    await glide(box, topIn(map, box) - 60, 900, run);
    const pick = (name: string) => Array.from(control.querySelectorAll("label"))
      .find((l) => l.textContent?.trim() === name)?.querySelector("input")?.click();
    await Promise.all([play("map-looks", run), (async () => {
      await wait(500, run);
      control.classList.add("leaflet-control-layers-expanded");
      spot(control, 7500);
      for (const [name, ms] of [["Colour", 900], ["Satellite", 1900], ["Grey", 2300]] as const) { await wait(ms, run); pick(name); }
      await wait(500, run);
      control.classList.remove("leaflet-control-layers-expanded");
    })()]);
    follow.current = true;
  };

  const showVoice = async (run: number) => {
    const step = script.steps.find((s) => s.id === "voice")!;
    spot($(`.${dsrStyles.orb}`), 3000);
    await play("voice-lead", run);
    setFocus(true);
    setMic("connecting");
    await wait(600, run);
    setMic("listening");
    await wait(350, run);
    await speak("voice-ask", run);
    setMic("working");
    await answer("voice", step.ask, run);
    setMic("listening");
    await walk(["voice-point"], run);
  };

  const showDsr = async (run: number) => {
    const step = script.steps.find((s) => s.id === "dsr")!;
    await play("dsr-lead", run);
    await speak("dsr-ask", run);
    setMic("working");
    await answer("dsr", step.ask, run);
    setMic("listening");
    await play("dsr-open", run);
    const body = $('[data-demo="dsr-body"]');
    for (const [n, fill] of answers.dsr.fills.entries()) {
      await speak(`fill-${n + 1}` as LineId, run);
      setDsrLine({ said: fill.said, did: "", working: true });
      setDsrBusy(true);
      setMic("working");
      await wait(1000, run);
      setForm((f) => ({ was: f.now, now: fill.summary }));
      setDsrBusy(false);
      setMic("listening");
      setDsrLine({ said: fill.said, did: fill.reply.replace(/\s*Summary updated\./, ""), working: false });
      await wait(300, run);
      const target = body?.querySelector(`[data-section="${n === 0 ? "Labor Tracking" : "Materials"}"]`);
      const lines = [`fill-${n + 1}-point` as LineId];
      await Promise.all([
        (async () => { for (const id of lines) await play(id, run); })(),
        (async () => {
          if (body) await glide(body, 0, 700, run);
          await wait(1800, run);
          if (body && target) await glide(body, topIn(target, body), 2600, run);
        })(),
      ]);
    }
    setMic("off");
    if (body) await glide(body, body.scrollHeight, 1200, run);
    spot($('[data-demo="submit"]'), 2000);
    await wait(600, run);
    setReview(true);
    await wait(300, run);
    await play("dsr-review", run);
    spot($('[data-demo="submit-report"]'), 2600);
    await wait(700, run);
  };

  // a chapter jumped past: the chat (and the report) as that chapter left them, at once
  const restore = (key: ChapterKey) => {
    if (!(key in answers)) return;
    const asked = askOf(key).ask;
    const built = answers[key].events.reduce((a, { e }) => fold(a, e, textOnlyOf(key)), { steps: [], text: "" } as Built);
    const steps = built.steps.map((s) => ({ ...s, state: "done" as const }));
    setMessages((m) => [...m, { role: "user", content: asked },
      { role: "assistant", content: built.text, steps, report: built.report, thoughtMs: THINK_MS, startedAt: 0 }]);
    listChat(asked);
    if (key === "dsr") {
      const last = answers.dsr.fills[answers.dsr.fills.length - 1];
      setDsrOpen(true);
      setForm({ was: last.summary, now: last.summary });
      setDsrLine({ said: last.said, did: last.reply.replace(/\s*Summary updated\./, ""), working: false });
    }
  };

  const reset = () => {
    setMessages([]); setInput(""); setHistoryOpen(false); setChats(sessions); setMic("off"); setHeard(""); setFocus(false);
    setDsrOpen(false); setForm({ now: null, was: null }); setDsrBusy(false); setDsrLine(null); setReview(false);
    setModuleLit(undefined); setModuleOpen(undefined); follow.current = true;
  };

  const RUN: Record<ChapterKey, (run: number) => Promise<void>> = {
    intro: async (run) => { await showModules(run); await showAssistant(run); },
    live: (run) => ask("live", "Live data", run),
    report: (run) => ask("report", "Smart reports", run, downloadPdf),
    intel: (run) => ask("intel", "Smart intel", run),
    map: async (run) => { await ask("map", "Maps", run, tourMap); await showHistory(run); },
    voice: showVoice,
    dsr: showDsr,
    end: async (run) => { setReview(false); await play("outro-1", run); },
  };

  // plays the show from a chapter on (the chapters before it are shown as they ended)
  const start = async (from = 0) => {
    const run = ++ctl.current.run;
    ctl.current.paused = false;
    setPaused(false);
    voice.resume();
    reset();
    setPhase("running");
    voice.unlock();
    Object.keys(narration.lines).forEach((id) => void voice.load(id));
    CHAPTERS.slice(0, from).forEach((c) => restore(c.key));
    try {
      await wait(from ? 400 : 600, run);
      for (let i = from; i < CHAPTERS.length; i++) {
        setChapter(i);
        if (i) await wait(300, run);
        await RUN[CHAPTERS[i].key](run);
      }
      setPhase("done");
    } catch (e) {
      if (!(e instanceof Stopped)) { console.error("Demo stopped", e); setPhase("done"); }
    }
  };
  const togglePause = () => {
    const p = !ctl.current.paused;
    ctl.current.paused = p;
    setPaused(p);
    if (p) voice.pause(); else voice.resume();
  };
  const keys = useRef({ togglePause });
  keys.current = { togglePause };
  useEffect(() => {
    if (phase !== "running") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); keys.current.togglePause(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const micMode = dsrOpen ? "report" : "chat";
  const micOn = mic !== "off";

  return (
    <div className={ui.app}>
      <div className={focus ? ui.dimmed : ui.undimmed} style={{ display: "flex" }}><Sidebar open={moduleOpen} lit={moduleLit} /></div>

      <div className={chat.container} style={{ height: "100vh", flex: 1, minWidth: 0 }}>
        {/* ══ conversations (the TaskForce AI page's own sidebar) ══ */}
        <div className={`${chat.sidemenu} ${historyOpen ? "" : chat.sidemenuCollapsed} ${focus ? ui.dimmed : ui.undimmed}`}>
          <div className={chat.rail} aria-hidden={historyOpen}>
            <button type="button" className={chat.railBrand} aria-label="Open sidebar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d={STAR} fill="white" /></svg>
            </button>
            <button type="button" className={chat.railButton} aria-label="New conversation">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button type="button" className={chat.railButton} aria-label="Conversation history">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" />
              </svg>
              {chats.length > 0 && <span className={chat.railBadge}>{chats.length}</span>}
            </button>
          </div>
          <div className={chat.sidemenuInner} aria-hidden={!historyOpen}>
            <div className={chat.sidebarHeader}>
              <div className={chat.sidebarBrand}>
                <div className={chat.sidebarBrandIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d={STAR} fill="white" /></svg>
                </div>
                <div className={chat.sidebarBrandName}>
                  <span className={chat.sidebarBrandTitle}>TaskForce AI</span>
                  <span className={chat.sidebarBrandSub}>Powered by Claude</span>
                </div>
              </div>
              <button className={chat.newChatButton}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Conversation
              </button>
            </div>
            <div className={chat.historySection}>
              <span className={chat.sectionLabel}>Recent</span>
              <input type="text" placeholder="Search conversations…" className={chat.searchInput} readOnly />
              <div className={chat.chatHistory}>
                {chats.map((title, i) => (
                  <div key={`${title}-${i}`} className={`${chat.chatCard} ${i === 0 && messages.length ? chat.active : ""}`}>
                    <span className={chat.chatCardIcon}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                    </span>
                    <div className={chat.chatCardText}><h5 className={chat.chatTitle}>{title}</h5></div>
                  </div>
                ))}
              </div>
            </div>
            <div className={chat.sidebarFooter}>
              <div className={chat.footerBadge}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                End-to-end encrypted · Enterprise
              </div>
            </div>
          </div>
        </div>

        {dsrOpen && <DsrPanel now={form.now} was={form.was} busy={dsrBusy} review={review} dim={focus} />}

        {/* ══ the chat ══ */}
        <div className={`${chat.mainContent} ${dsrOpen ? dsrStyles.chatNarrow : ""}`}>
          <div className={`${chat.mainContentHeader} ${focus ? ui.dimmed : ui.undimmed}`}>
            <div className={chat.headerLeft}>
              <span className={chat.statusDot} />
              <span className={chat.headerTitle}>TaskForce AI</span>
            </div>
            <button type="button" className={`${dsrStyles.headerButton} ${dsrOpen ? dsrStyles.headerButtonOn : ""}`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" />
              </svg>
              {dsrOpen ? "Hide the report" : "Daily report"}
            </button>
          </div>

          <div className={`${chat.messageArea} ${focus ? ui.dimmed : ui.undimmed}`} ref={areaRef}>
            {messages.length === 0 && (
              <div className={chat.welcomeMessage}>
                <div className={chat.welcomeIconWrap}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d={STAR} fill="white" /></svg>
                </div>
                <h2>How can I help you today?</h2>
                <p>Ask anything about your projects, team, finances, and operations.</p>
                <div className={chat.capabilityGrid}>
                  {[["📋", "Projects & Tasks", "Status, deadlines and assignments"], ["💰", "Finance", "Invoices, purchase orders and budgets"],
                    ["👥", "Team & HR", "Employees, timesheets and org chart"], ["📊", "Reports & Insights", "Daily sheets, proposals, RFPs and lessons learned"]]
                    .map(([emoji, title, desc]) => (
                      <div key={title} className={chat.capabilityCard} role="button" tabIndex={0}>
                        <span className={chat.capabilityEmoji}>{emoji}</span><strong>{title}</strong><p>{desc}</p>
                      </div>
                    ))}
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`${chat.messageRow} ${msg.role === "user" ? chat.userRow : chat.assistantRow} ${msg.report ? chat.reportRow : ""}`}>
                {msg.role === "assistant" && (
                  <div className={`${chat.avatarWrap} ${chat.botAvatar} ${msg.pending ? chat.botAvatarLive : ""}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d={STAR} fill="white" /></svg>
                  </div>
                )}
                {msg.role === "assistant" ? (
                  <div className={chat.assistantStack}>
                    {(msg.pending || (msg.steps && msg.steps.length > 0)) && (
                      <ThinkingPanel steps={msg.steps ?? []} pending={!!msg.pending} thoughtMs={msg.thoughtMs} startedAt={msg.startedAt} />
                    )}
                    {msg.content !== "" && (
                      <div className={`${chat.message} ${chat.assistant}`}>
                        <div className={chat.markdownContent}>{renderMarkdown(msg.content)}</div>
                      </div>
                    )}
                    {msg.report && <ReportCard report={msg.report} summary={msg.content ? renderMarkdown(msg.content) : undefined} />}
                  </div>
                ) : (
                  <div className={`${chat.message} ${chat.user}`}>
                    <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{msg.content}</p>
                  </div>
                )}
                {msg.role === "user" && (
                  <div className={`${chat.avatarWrap} ${chat.userAvatarIcon}`}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className={chat.inputWrapper}>
            {dsrOpen && dsrLine && (
              <div className={dsrStyles.reportLine} aria-live="polite">
                <span className={dsrStyles.reportSaid}>“{dsrLine.said}”</span>
                <span className={dsrStyles.reportDid}>{dsrLine.working ? "filling…" : dsrLine.did}</span>
              </div>
            )}
            {micOn && mic !== "connecting" && (
              <div className={`${dsrStyles.hearing} ${focus ? ui.heardLarge : ""}`} data-voice={mic} aria-live="polite">
                <span className={dsrStyles.hearingDot} />
                <LiveCaption text={heard} idle={
                  <span className={dsrStyles.hearingIdle}>
                    {dsrOpen
                      ? "Listening. Say what happened on site; it goes into the report when you pause, and the mic turns off when you stop."
                      : "Listening. Ask anything, or say “fill the DSR”. It's sent when you pause, and the mic turns off when you stop."}
                  </span>
                } />
              </div>
            )}
            <form ref={composerRef} onSubmit={(e) => e.preventDefault()}
                  className={`${chat.inputArea} ${micOn && mic !== "connecting" ? dsrStyles.voiceComposer : ""}`} data-voice={mic}>
              {micOn && mic !== "connecting" && (
                <span className={dsrStyles.voicePill} data-mode={micMode}>{micMode === "report" ? "Daily report" : "Chat"}</span>
              )}
              <textarea value={input} readOnly rows={1} className={chat.inputField}
                        placeholder={dsrOpen ? "Say or type what happened on site, or ask for options…" : "Ask about projects, tasks, team, finances…"} />
              <div className={chat.inputActions}>
                <button type="button" className={chat.uploadButton} aria-label="Attach file">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>
                <button type="button" className={`${dsrStyles.micButton} ${dsrStyles.orb}`} data-state={mic} aria-pressed={micOn} aria-label="Talk to TaskForce AI">
                  {micOn && mic !== "connecting" && <span className={dsrStyles.orbSky} aria-hidden="true"><span /><span /><span /></span>}
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v1a7 7 0 0 0 14 0v-1" /><line x1="12" y1="18" x2="12" y2="22" />
                  </svg>
                </button>
                <button type="submit" className={chat.sendButton} disabled={!input.trim()} aria-label="Send message">
                  <img src="/images/ai_send.png" width={16} height={16} alt="Send" />
                </button>
              </div>
            </form>
            <p className={chat.inputHint}>Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>

      {phase === "ready" ? (
        <div className={ui.overlay}>
          <div className={ui.startCard}>
            <div className={ui.brand}><svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d={STAR} fill="white" /></svg></div>
            <h2>TaskForce AI</h2>
            <p>Live data, smart reports, maps, voice, and the Daily Site Report, hands-free.</p>
            <button type="button" className={ui.play} onClick={() => void start()} autoFocus>▶ Play</button>
            <span className={ui.hint}>Sound on · Space pauses</span>
          </div>
        </div>
      ) : (
        <div className={ui.nav} role="navigation" aria-label="Demo chapters">
          {(() => {
            const shown = CHAPTERS[hover ?? chapter];
            return (
              <div className={ui.tags} key={shown.key}>
                <span className={ui.tagsTitle}>{shown.label === "Intro" || shown.label === "End" ? shown.title : `${shown.label} · ${shown.title}`}</span>
                {shown.tags.map((t) => <span key={t} className={ui.tag}>{t}</span>)}
              </div>
            );
          })()}
          <div className={ui.navBar}>
            <button type="button" className={ui.navButton} onClick={() => void start(Math.max(0, chapter - 1))}
                    disabled={chapter === 0} aria-label="Previous chapter" title="Previous">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" className={`${ui.navButton} ${ui.navPlay}`}
                    onClick={phase === "done" ? () => void start() : togglePause}
                    aria-label={phase === "done" ? "Play again" : paused ? "Play" : "Pause"}
                    title={phase === "done" ? "Play again" : paused ? "Play" : "Pause"}>
              {phase === "done" ? <span aria-hidden="true">↻</span> : paused
                ? <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor" /></svg>
                : <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" /><rect x="14" y="4.5" width="4" height="15" rx="1.2" fill="currentColor" /></svg>}
            </button>
            <button type="button" className={ui.navButton} onClick={() => void start(Math.min(CHAPTERS.length - 1, chapter + 1))}
                    disabled={chapter === CHAPTERS.length - 1} aria-label="Next chapter" title="Next">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <span className={ui.navDivider} aria-hidden="true" />
            {CHAPTERS.map((c, i) => (
              <button key={c.key} type="button" onClick={() => void start(i)}
                      onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover(i)} onBlur={() => setHover(null)}
                      className={`${ui.chip} ${i === chapter ? ui.chipOn : i < chapter ? ui.chipDone : ""}`}
                      aria-current={i === chapter ? "step" : undefined} aria-label={`${c.label}: ${c.title}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
