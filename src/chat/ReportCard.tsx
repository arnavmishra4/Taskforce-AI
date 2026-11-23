import React, { Suspense, lazy, useMemo, useRef, useState } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  type ChartOptions,
} from "chart.js";
import { Bar, Line, Pie } from "react-chartjs-2";
import styles from "./report.module.css";
import type { ChartKind, KpiItem, MapBlockData, Report, ReportBlock, ReportStory, Tone } from "./types";
import { ROAD_COLOURS, ROAD_LABELS, driveColour } from "./mapColours";
import { addMapPage } from "./mapPdf";
import { splitFigures } from "./numbers";

// leaflet is loaded with the first map only
const LazyMap = lazy(() => import("./MapView"));
const MapView = (props: { block: MapBlockData; height: number }) => (
  <Suspense fallback={<div className={styles.empty} style={{ height: 380 }}>Loading map…</div>}>
    <LazyMap {...props} />
  </Suspense>
);

ChartJS.register(ArcElement, BarElement, CategoryScale, Filler, LinearScale, LineElement, PointElement, Tooltip, Legend);

// Categorical colours in fixed order (the dataviz reference palette, colour-blind checked as adjacent pairs);
// a report never has more than 4 series, and a pie at most 6 slices
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
const RECEDE = "#b7d3f6";                 // the other bars when one is highlighted (a lighter step of series 1)
const NOT_RECORDED = "#c9c8c2";            // "(not recorded)" and "Other": recessive grey
const NOT_RECORDED_STRONG = "#8f8d86";     // the same, when the insight is about it
const INK = "#1F2937";
const MUTED = "#6B7280";
const GRID = "#EEF0F4";
const LOCALE = "en-CA";                  // the same dates and numbers on the server and in every browser
const SHORT = 18;                          // chat: longer category names are cut (the tooltip shows them in full)
// a finding's state: an icon and a word, never colour alone (status colours of the dataviz palette). The icon
// marks are drawn as SVG paths: the PDF capture shifts text set inside a small circle.
const TONES: Record<Tone, { mark: string; label: string; colour: string }> = {
  good: { mark: "M5 9.2l2.6 2.6L13 6.4", label: "Good", colour: "#0ca30c" },
  watch: { mark: "M9 4.8v5.4M9 12.8v.4", label: "Warning", colour: "#fab219" },
  concern: { mark: "M5.6 5.6l6.8 6.8M12.4 5.6l-6.8 6.8", label: "Critical", colour: "#d03b3b" },
  neutral: { mark: "M9 8.4v4.8M9 5.2v.4", label: "Note", colour: "#898781" },
};

type Mode = "chat" | "pdf";

// PDF page: A4 with 10mm margins (14mm at the foot, for the page line); the layout is 718px wide (= 190mm), so a
// page holds PAGE_PX of it. A report up to ONE_PAGE_STRETCH pages long is scaled onto one page.
const PDF_MARGIN = 10;
const PAGE_MM = { w: 190, h: 273 };
const PAGE_PX = (718 * PAGE_MM.h) / PAGE_MM.w;
const ONE_PAGE_STRETCH = 1.22;            // at most ~18% smaller: text stays about 7-8pt

const fmt = (v: number | null | undefined, unit?: string | null, scale = "") => {
  if (v === null || v === undefined || Number.isNaN(v)) return "n/a";
  const n = Number.isInteger(v) ? v.toLocaleString(LOCALE) : v.toLocaleString(LOCALE, { maximumFractionDigits: unit ? 2 : 1 });
  // a currency sign sits on the number ("$512,300"); any other unit keeps a non-breaking space, never wrapping apart
  return unit ? (/^[$€£¥]$/.test(unit) ? `${unit}${n}${scale}` : `${unit}\u00a0${n}${scale}`) : `${n}${scale}`;
};
// "Money stuck ($M)", "At risk ($K)": the scale goes on the number ("$3.4M"), not only in the label
const SCALE = /\s*\(\s*[$€£¥]\s*([MKB])\s*\)/i;
const scaleOf = (text?: string | null) => (text ?? "").match(SCALE)?.[1]?.toUpperCase() ?? "";
const unscaled = (text: string) => text.replace(SCALE, "");
// 2026-10-19 -> "Oct 19" (hover: "Mon, Oct 19"); 2026-10 -> "Oct 2026" (day / week / month groupings)
const nice = (s: string, long = false) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s))
    return new Date(`${s}T00:00:00`).toLocaleDateString(LOCALE, { weekday: long ? "short" : undefined, day: "numeric", month: "short" });
  if (/^\d{4}-\d{2}$/.test(s))
    return new Date(`${s}-01T00:00:00`).toLocaleDateString(LOCALE, { month: "short", year: "numeric" });
  return s;
};
const cut = (s: string, mode: Mode) => {
  const t = nice(s);
  return mode === "chat" && t.length > SHORT ? `${t.slice(0, SHORT - 1)}…` : t;
};
const longDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(LOCALE, { day: "numeric", month: "short", year: "numeric" });
};
// last_dsr_date -> "Last DSR date"
const heading = (c: string) => {
  const t = c.replace(/_/g, " ").replace(/\bdsr\b/gi, "DSR");
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const grey = (label: string, notRecorded?: string) => label === notRecorded || label === "Other";
// numbers in the written words stand out, the whole figure: "spent <b>$2.90M</b>, <b>41.9%</b> of it" (numbers.ts)
const emph = (text: string) =>
  splitFigures(text).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
// a long category name on a bar chart: up to two lines (the row height allows two) instead of cut short
const wrap = (s: string, mode: Mode): string | string[] => {
  const width = 20, most = 2;
  const lines: string[] = [];
  for (const w of nice(s).split(" ")) {
    const last = lines[lines.length - 1];
    if (last !== undefined && (last + " " + w).length <= width) lines[lines.length - 1] = last + " " + w;
    else lines.push(w);
  }
  if (lines.length <= 1) return lines[0] ?? "";
  const kept = lines.slice(0, most);
  if (lines.length > most) kept[most - 1] = `${kept[most - 1].slice(0, width - 1)}…`;
  return kept;
};
// a date in a table: "Oct 26" this year, "Oct 26, 2025" otherwise
const tableDate = (iso: string) => iso.startsWith(String(new Date().getFullYear()))
  ? new Date(`${iso}T00:00:00`).toLocaleDateString(LOCALE, { day: "numeric", month: "short" }) : longDate(iso);

// A series label keeps its colour across the whole report ("Draft" is the same colour in every chart)
function seriesColours(blocks: ReportBlock[]) {
  const seen = new Map<string, string>();
  for (const b of blocks)
    if (b.type === "chart" && !b.empty && b.series?.length > 1)
      for (const s of b.series) if (!seen.has(s.label)) seen.set(s.label, SERIES[seen.size % 4]);
  return seen;
}

function ChartBlock({ block, colours, mode }: {
  block: Extract<ReportBlock, { type: "chart" }>; colours: Map<string, string>; mode: Mode;
}) {
  const { chart, labels, series, unit, not_recorded: nr, highlight } = block;
  const many = series.length > 1;
  const horizontal = chart === "hbar";
  const stacked = chart === "stacked_bar";
  const tick = { color: MUTED, font: { size: mode === "pdf" ? 10 : 11 } };
  const value = (v: number | string) => fmt(Number(v), unit, scaleOf(block.title));
  const fullLabel = (items: { dataIndex: number }[]) => nice(labels[items[0]?.dataIndex ?? 0] ?? "", true);
  const animation = mode === "pdf" ? (false as const) : undefined;

  if (chart === "pie") {
    const data = {
      labels,
      datasets: [{
        data: series[0].values,
        backgroundColor: labels.map((l, i) => (grey(l, nr) ? NOT_RECORDED : SERIES[i % SERIES.length])),
        borderColor: "#ffffff",
        borderWidth: 2,
        offset: labels.map((l) => (l === highlight ? 10 : 0)),   // the slice the insight is about stands out
      }],
    };
    const total = series[0].values.reduce((a, b) => a + b, 0) || 1;
    const options: ChartOptions<"pie"> = {
      responsive: true, maintainAspectRatio: false, animation, layout: { padding: 10 },
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => ` ${value(c.raw as number)} (${Math.round(((c.raw as number) / total) * 100)}%)` } },
      },
    };
    // the legend in HTML beside the pie: full names, value and share, wrapping instead of cut off (chat and PDF)
    return (
      <div className={styles.pieRow}>
        <div className={styles.pieCanvas} style={{ height: chartHeight("pie", 0, mode) }}><Pie data={data} options={options} /></div>
        <ul className={styles.pieLegend}>
          {labels.map((l, i) => (
            <li key={i}>
              <span className={styles.pieSwatch} style={{ background: data.datasets[0].backgroundColor[i] }} />
              <span>{nice(l)} <span className={styles.pieValue}>
                {fmt(series[0].values[i], unit, scaleOf(block.title))} ({Math.round((series[0].values[i] / total) * 100)}%)</span></span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const datasets = series.map((s, i) => {
    const colour = many ? colours.get(s.label) ?? SERIES[i % 4] : SERIES[0];
    // one series: "(not recorded)" / "Other" in grey, and with a highlight the other bars recede
    // a highlighted "(not recorded)" / "Other" bar turns darker grey, the others keep their colour
    const greyHighlight = !!highlight && grey(highlight, nr);
    const bar = (l: string) => grey(l, nr) ? (greyHighlight && l === highlight ? NOT_RECORDED_STRONG : NOT_RECORDED)
      : highlight && !greyHighlight && l !== highlight ? RECEDE : colour;
    return chart === "line"
      ? { label: s.label, data: s.values, borderColor: colour, borderWidth: 2,
          // one line: a soft fill under it; several: lines only, so they stay readable
          fill: !many, backgroundColor: many ? colour : `${colour}1a`, pointBackgroundColor: colour,
          pointRadius: labels.map((l) => (l === highlight ? 6 : labels.length > 31 ? 0 : 3)), pointHoverRadius: 6,
          tension: 0 }
      : { label: s.label, data: s.values, borderRadius: 4, borderSkipped: "start" as const,
          backgroundColor: many ? colour : labels.map(bar),
          borderColor: "#ffffff", borderWidth: stacked ? 2 : 0, maxBarThickness: 36 };
  });
  const valueAxis = {
    beginAtZero: true, stacked, grid: { color: GRID }, border: { display: false },
    ticks: { ...tick, precision: series.every((s) => s.values.every(Number.isInteger)) ? 0 : undefined,
             callback: (v: number | string) => value(v) },
  };
  const categoryAxis = {
    stacked, grid: { display: chart === "line", color: GRID }, border: { display: false },
    // dates may skip some (the line shows every day); names never skip, they tilt when crowded
    ticks: { ...tick, autoSkip: !horizontal && (chart === "line" || labels.length > 12), maxRotation: horizontal ? 0 : 45,
             callback(this: any, v: number | string) {
               const label = String(this.getLabelForValue(Number(v)));
               return horizontal ? wrap(label, mode) : cut(label, mode);
             } },
  };
  const options: ChartOptions<"bar" | "line"> = {
    responsive: true, maintainAspectRatio: false, animation,
    indexAxis: horizontal ? "y" : "x",
    interaction: { mode: chart === "line" || many ? "index" : "nearest", intersect: chart !== "line" && !many },
    scales: horizontal ? { x: valueAxis, y: categoryAxis } : { x: categoryAxis, y: valueAxis },
    plugins: {
      legend: { display: many, position: "top", align: "end",
                labels: { color: INK, boxWidth: 11, boxHeight: 11, font: { size: mode === "pdf" ? 10.5 : 12 } } },
      tooltip: { callbacks: { title: fullLabel, label: (c) => ` ${many ? `${c.dataset.label}: ` : ""}${value(c.raw as number)}` } },
    },
  };
  const data = { labels, datasets };
  return chart === "line"
    ? <Line data={data as any} options={options as ChartOptions<"line">} />
    : <Bar data={data as any} options={options as ChartOptions<"bar">} />;
}

function chartHeight(kind: ChartKind, n: number, mode: Mode, wrapped = false) {
  const pdf = mode === "pdf";                                  // the PDF packs tighter: 1-2 pages for a usual report
  // a row per name, taller when names run onto two lines
  const row = (pdf ? 17 : 28) + (wrapped ? (pdf ? 7 : 10) : 0);
  if (kind === "hbar") return Math.max(pdf ? 110 : 160, n * row + (pdf ? 34 : 48));
  if (kind === "pie") return pdf ? 150 : 220;
  return n <= 3 ? (pdf ? 150 : 200) : (pdf ? 180 : 260);       // two or three bars need less height
}

function Change({ c, unit, scale }: { c: NonNullable<KpiItem["compare"]>; unit?: string | null; scale?: string }) {
  // up / down only, never judged good or bad: more DSRs is good, more delays is not
  const arrow = c.delta > 0 ? "▲" : c.delta < 0 ? "▼" : "=";
  const text = c.delta === 0 ? `same as ${c.label}` : `${fmt(Math.abs(c.delta), unit, scale)} vs ${c.label}`;
  return <div className={styles.tileChange}><span aria-hidden="true">{arrow}</span> {text}</div>;
}

// rows of even length: 5 -> 3+2, 6 -> 3+3, 7 -> 4+3, 8 -> 4+4 (never one tile alone on a row)
const tileColumns = (n: number) => (n <= 4 ? n : Math.ceil(n / Math.ceil(n / 4)));

function Tiles({ items }: { items: KpiItem[] }) {
  return (
    <div className={styles.tiles} style={{ "--cols": tileColumns(items.length) } as React.CSSProperties}>
      {items.map((k, i) => (
        <div key={i} className={styles.tile} title={k.footnote}>
          <div className={styles.tileValue}>{k.value === null ? "n/a" : fmt(k.value, k.unit, scaleOf(k.label))}</div>
          <div className={styles.tileLabel}>{unscaled(k.label)}</div>
          {k.compare && <Change c={k.compare} unit={k.unit} scale={scaleOf(k.label)} />}
          {k.note && <div className={styles.tileChange}>{k.note}</div>}
          {k.empty && k.empty !== "n/a" && <div className={styles.empty}>{k.empty}</div>}
        </div>
      ))}
    </div>
  );
}

function Table({ block }: { block: Extract<ReportBlock, { type: "table" }> }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr>{block.columns.map((c) => <th key={c}>{heading(c)}</th>)}</tr></thead>
        <tbody>
          {block.rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                // numbers right-aligned; short values (refs, dates, types) kept on one line
                <td key={j} className={typeof v === "number" ? styles.num
                  : String(v ?? "").length <= 18 ? styles.nowrap : undefined}>
                  {typeof v === "number" ? fmt(v)
                    : v === null || v === undefined ? ""
                    : /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? tableDate(String(v)) : String(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// show_map: the map, then a legend with the counts (the colours are explained, never colour alone), then its note
function MapSection({ block, mode, titled = true }: { block: MapBlockData; mode: Mode; titled?: boolean }) {
  const roads = (Object.keys(ROAD_LABELS) as (keyof typeof ROAD_LABELS)[])
    .map((p) => ({ p, n: block.roads.filter((r) => r.progress === p).length })).filter((x) => x.n);
  const statuses = Array.from(block.driveways.reduce((m, d) => m.set(d.status, (m.get(d.status) ?? 0) + 1),
                                                     new Map<string, number>()));
  return (
    <section className={styles.block}>
      {titled && <h4 className={styles.blockTitle}>{block.title}</h4>}
      <div className={styles.visual} style={{ marginTop: titled ? 8 : 0 }}>
        {mode === "pdf"
          ? <div className={styles.empty}>The map is shown in TaskForce AI.</div>
          : <MapView block={block} height={380} />}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendTitle}>Roads:</span>
        {roads.map(({ p, n }) => (
          <span key={p} className={styles.legendItem}>
            <span className={styles.legendLine} style={{ background: ROAD_COLOURS[p] }} />
            {ROAD_LABELS[p]} <strong>{n}</strong>
          </span>
        ))}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendTitle}>Driveways:</span>
        {statuses.map(([s, n]) => (
          <span key={s} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: driveColour(s) }} />
            {s} <strong>{n}</strong>
          </span>
        ))}
      </div>
      {block.footnote && <p className={styles.footnote}>{block.footnote}</p>}
    </section>
  );
}

function Block({ block, colours, mode, paired = false }: {
  block: ReportBlock; colours: Map<string, string>; mode: Mode; paired?: boolean;   // paired: half a PDF row
}) {
  if (block.type === "kpis") {
    const notes = Array.from(new Set(block.items.map((k) => k.footnote).filter(Boolean)));
    return (
      <section className={styles.block}>
        {block.empty ? <div className={styles.empty}>No data · {block.empty}</div> : <Tiles items={block.items} />}
        {notes.length === 1 && <p className={styles.footnote}>{notes[0]}</p>}
      </section>
    );
  }
  if (block.type === "map") return <MapSection block={block} mode={mode} />;
  if (block.type === "text") {
    return (
      <section className={paired ? styles.cell : styles.block}>
        {block.heading && <h4 className={styles.blockTitle}>{block.heading}</h4>}
        <p className={styles.text}>{block.body}</p>
      </section>
    );
  }
  // a chart or table: the point it makes as its title (the plain label under it), the visual, and beside it (or
  // under a table) what it shows and why it matters
  const insight = !block.empty && block.insight;
  const visual = block.empty ? <div className={styles.empty}>No data · {block.empty}</div>
    : block.type === "chart" ? (
      <div className={block.chart === "pie" ? styles.pie : undefined}
           style={block.chart === "pie" ? undefined : { height: chartHeight(block.chart, block.labels.length, mode,
                                        block.labels.some((l) => nice(l).length > 20)) }}>
        <ChartBlock block={block} colours={colours} mode={mode} />
      </div>
    ) : <Table block={block} />;
  // beside a chart (under it when it shares a PDF row): the highlighted category's own number, large (counted by the
  // server, like the bars), the insight, and the chart's footnote at the foot of the box
  const beside = !!insight && block.type === "chart" && !paired;
  const at = block.type === "chart" && block.highlight && block.series.length === 1 ? block.labels.indexOf(block.highlight) : -1;
  const footnote = !block.empty && block.footnote ? <p className={styles.footnote}>{block.footnote}</p> : null;
  return (
    <section className={paired ? styles.cell : styles.block}>
      <h4 className={styles.blockTitle}>{block.takeaway || block.title}</h4>
      {block.takeaway && block.title && <p className={styles.blockLabel}>{block.title}</p>}
      <div className={`${styles.row} ${beside ? styles.withAside : ""}`}>
        <div className={styles.visual}>{visual}</div>
        {insight && (
          <aside className={styles.insight}>
            <div className={styles.insightHead}>
              <span className={styles.insightLabel}>What this shows</span>
              {block.type === "chart" && at >= 0 && (
                <div className={styles.keyStat}>
                  <span className={styles.keyValue}>{fmt(block.series[0].values[at], block.unit, scaleOf(block.title))}</span>
                  <span className={styles.keyLabel}>{nice(block.labels[at], true)}</span>
                </div>
              )}
            </div>
            <p>{emph(insight)}</p>
            {beside && footnote && <div className={styles.asideFoot}>{footnote}</div>}
          </aside>
        )}
      </div>
      {!beside && footnote}
    </section>
  );
}

function Summary({ story }: { story: ReportStory }) {
  if (!story.headline && !story.findings?.length) return null;
  return (
    <section className={`${styles.block} ${styles.summaryPanel}`}>
      <span className={styles.insightLabel}>Summary</span>
      {story.headline && <p className={styles.headline}>{emph(story.headline)}</p>}
      {!!story.findings?.length && (
        <ul className={styles.findings}>
          {story.findings.map((f, i) => {
            const t = TONES[f.tone] ?? TONES.neutral;
            return (
              <li key={i}>
                <span className={styles.tone}>
                  <svg className={styles.toneIcon} viewBox="0 0 18 18" aria-hidden="true">
                    <circle cx="9" cy="9" r="9" fill={t.colour} />
                    <path d={t.mark} stroke={f.tone === "watch" ? "#0b0b0b" : "#ffffff"} strokeWidth="2"
                          strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                  {t.label && <span className={styles.toneLabel}>{t.label}</span>}
                </span>
                <span>{emph(f.text)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Closing({ story, sources, madeOn }: { story?: ReportStory; sources?: string[]; madeOn: string }) {
  const steps = story?.next_steps ?? [];
  const notes = story?.data_notes ?? [];
  return (
    <div className={`${styles.block} ${styles.closing}`}>
      {steps.length > 0 && (
        <section className={styles.nextPanel}>
          <h4 className={styles.blockTitle}>What to look at next</h4>
          {/* numbers and bullets as text: the PDF capture misplaces the browser's own list markers */}
          <ol className={styles.steps}>
            {steps.map((s, i) => <li key={i}><span className={styles.marker}>{i + 1}.</span><span>{emph(s)}</span></li>)}
          </ol>
        </section>
      )}
      <section className={styles.about}>
        <h4 className={styles.aboutTitle}>About this data</h4>
        <ul>
          {notes.map((n, i) => <li key={i}><span className={styles.marker}>•</span><span>{n}</span></li>)}
          <li>
            <span className={styles.marker}>•</span>
            <span>
            Counted from TaskForce on {longDate(madeOn)}
            {sources?.length ? ` · ${sources.join(", ")}` : ""}. Words written by TaskForce AI from these counts.
            </span>
          </li>
        </ul>
      </section>
    </div>
  );
}

// The PDF puts two narrow sections side by side (each with its insight under it): the same report on fewer pages.
// Narrow: a chart, a note, or a small table (3 columns, 8 rows at most); a wider table keeps the full width.
const narrow = (x?: ReportBlock) => !!x && !x.empty && (x.type === "chart" || x.type === "text"
  || (x.type === "table" && x.columns.length <= 3 && x.rows.length <= 8));

function rows(blocks: ReportBlock[], mode: Mode): ReportBlock[][] {
  const out: ReportBlock[][] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (mode === "pdf" && narrow(blocks[i]) && narrow(blocks[i + 1])) out.push([blocks[i], blocks[++i]]);
    else out.push([blocks[i]]);
  }
  return out;
}

function Body({ report, colours, mode }: { report: Report; colours: Map<string, string>; mode: Mode }) {
  // the PDF gives a map its own landscape page at the end (mapPdf.ts), with its legend and note
  const blocks = mode === "pdf" ? report.blocks.filter((b) => b.type !== "map" || b.empty) : report.blocks;
  return (
    <>
      {report.story && <Summary story={report.story} />}
      {rows(blocks, mode).map((row, i) => row.length === 2 ? (
        <div key={i} className={`${styles.block} ${styles.pair}`}>
          {row.map((b, j) => <Block key={j} block={b} colours={colours} mode={mode} paired />)}
        </div>
      ) : <Block key={i} block={row[0]} colours={colours} mode={mode} />)}
      <Closing story={report.story} sources={report.sources} madeOn={report.made_on} />
    </>
  );
}

// The report under an answer: its summary, tiles, charts and tables with what each shows, next steps, and a
// Download PDF button that lays the same report out on A4 pages (header, every section, page numbers)
export default function ReportCard({ report, summary }: { report: Report; summary?: React.ReactNode }) {
  const colours = useMemo(() => seriesColours(report.blocks), [report.blocks]);
  const [printing, setPrinting] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const hasStory = !!(report.story?.headline || report.story?.findings?.length);
  // a map on its own (show_map): the map and its legend, without the report's closing or a PDF of map tiles
  const mapOnly = report.blocks.length > 0 && report.blocks.every((b) => b.type === "map");

  const download = async () => {
    setPrinting(true);
    try {
      // the A4 layout is drawn off-screen only now; two frames let its charts paint before the capture
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const html2pdf = (await import("html2pdf.js")).default;
      const name = report.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_") || "report";
      const footer = (pdf: any) => {
        const pages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
          pdf.setPage(i);
          const w = pdf.internal.pageSize.getWidth(), h = pdf.internal.pageSize.getHeight();   // the map page is landscape
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(107, 114, 128);
          pdf.text(`${report.title} · counted from TaskForce on ${longDate(report.made_on)}`, 10, h - 6);
          pdf.text(`Page ${i} of ${pages}`, w - 10, h - 6, { align: "right" });
        }
      };
      // each map gets its own landscape page at the end; a map that can't be drawn leaves the rest of the PDF as is
      const maps = async (pdf: any) => {
        for (const b of report.blocks) {
          if (b.type !== "map" || b.empty) continue;
          try { await addMapPage(pdf, b as MapBlockData); } catch (e) { console.error("Report map page failed", e); }
        }
      };
      const options = {
        margin: [PDF_MARGIN, PDF_MARGIN, PDF_MARGIN + 4, PDF_MARGIN],
        filename: `${name}.pdf`,
        html2canvas: { scale: 2, backgroundColor: "#ffffff" },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"], avoid: `.${styles.block}` },
      };
      const page = pageRef.current!;
      if (page.scrollHeight <= PAGE_PX * ONE_PAGE_STRETCH) {
        // a little over one page: one A4 page with the whole report scaled down evenly (nothing moved or cut),
        // instead of a second page holding only the last few lines
        // no page-break rules here: their spacers push a section to where page 2 would start, leaving a gap
        // and an image taller than the page
        const canvas: HTMLCanvasElement = await html2pdf().from(page).set({ ...options, pagebreak: { mode: [] } })
          .toCanvas().get("canvas");
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
        const tall = (canvas.height / canvas.width) * PAGE_MM.w;          // mm at full width
        const fit = Math.min(1, PAGE_MM.h / tall);
        const w = PAGE_MM.w * fit;
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", PDF_MARGIN + (PAGE_MM.w - w) / 2, PDF_MARGIN, w,
                     tall * fit);
        await maps(pdf);
        footer(pdf);
        pdf.save(`${name}.pdf`);
      } else {
        const pdf = await html2pdf().from(page).set(options).toPdf().get("pdf");
        await maps(pdf);
        footer(pdf);
        pdf.save(`${name}.pdf`);
      }
    } catch (e) {
      console.error("Report PDF failed", e);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className={styles.card} role="region" aria-label={report.title}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>{report.title}</h3>
          <p className={styles.subtitle}>Prepared by TaskForce AI · {longDate(report.made_on)}</p>
        </div>
        {!mapOnly && (
          <div className={styles.actions}>
            {/* share shortcuts: shown as in the app, not wired up */}
            <span className={styles.shareIcons} aria-hidden="true">
              <span title="Share on WhatsApp" className={styles.shareIcon} style={{ color: "#25D366" }}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.75 13.96c.25.13.41.2.46.3.06.11.04.61-.21 1.18-.2.56-1.24 1.1-1.7 1.12-.46.02-.47.36-2.96-.73-2.49-1.09-3.99-3.75-4.11-3.92-.12-.17-.96-1.38-.92-2.61.05-1.22.69-1.8.95-2.04.24-.26.51-.29.68-.26h.47c.15 0 .36-.06.55.45l.69 1.87c.06.13.1.28.01.44l-.27.41-.39.42c-.12.12-.26.25-.12.5.12.26.62 1.09 1.32 1.78.91.88 1.71 1.17 1.95 1.3.24.14.39.12.54-.04l.81-.94c.19-.25.35-.19.58-.11l1.67.88M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10c-1.97 0-3.8-.57-5.35-1.55L2 22l1.55-4.65A9.969 9.969 0 0 1 2 12 10 10 0 0 1 12 2m0 2a8 8 0 0 0-8 8c0 1.72.54 3.31 1.46 4.61L4.5 19.5l2.89-.96A7.95 7.95 0 0 0 12 20a8 8 0 0 0 8-8 8 8 0 0 0-8-8z" /></svg></span>
              <span title="Email" className={styles.shareIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 14H4V8l8 5 8-5zm-8-7L4 6h16z" /></svg></span>
              <span title="Share" className={styles.shareIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92M18 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1M6 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1m12 7.02c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1" /></svg></span>
            </span>
            <button type="button" className={styles.download} onClick={() => void download()} disabled={printing}>
              {printing ? "Preparing…" : "Download PDF"}
            </button>
          </div>
        )}
      </div>
      <div className={styles.stack}>
        {mapOnly
          ? report.blocks.map((b, i) => (
              <MapSection key={i} block={b as MapBlockData} mode="chat" titled={(b as MapBlockData).title !== report.title} />
            ))
          : <Body report={report} colours={colours} mode="chat" />}
      </div>

      {printing && (
        <div className={styles.offscreen} aria-hidden="true">
          <div ref={pageRef} className={styles.page}>
            <header className={styles.pageHeader}>
              <h1>{report.title}</h1>
              <p>Prepared by TaskForce AI · {longDate(report.made_on)}</p>
            </header>
            {/* a report made before it had its own words carries the chat answer as its summary */}
            {!hasStory && summary && (
              <section className={`${styles.block} ${styles.summaryPanel}`}>
                <span className={styles.insightLabel}>Summary</span>
                <div className={styles.summaryText}>{summary}</div>
              </section>
            )}
            <Body report={report} colours={colours} mode="pdf" />
          </div>
        </div>
      )}
    </div>
  );
}
