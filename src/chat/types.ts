// What make_report (taskforce-ai tools_function/construction/const_report_tool.py) sends as the "report" event and
// saves with the answer: every number is already counted by the server, the page only draws it. The words (story,
// takeaway, insight, highlight) are written by report_story.py from those numbers, and may be missing.

export type ChartKind = "bar" | "hbar" | "grouped_bar" | "stacked_bar" | "line" | "pie";

export type KpiItem = {
  label: string;
  value: number | null;
  unit?: string | null;
  footnote?: string;
  empty?: string;
  compare?: { label: string; value: number; delta: number };   // the same number for the period before
};

// a chart's or table's words: the point it makes (title), why it matters, and the category the insight is about
type Words = { takeaway?: string; insight?: string; highlight?: string };

// show_map (const_map_tool.py): the road program's roads (a line from start to end point) and driveways (dots)
export type RoadProgress = "completed" | "partly_done" | "not_started" | "no_inspection";
export type MapBlockData = {
  type: "map";
  title: string;
  roads: { name: string; jde: string; progress: RoadProgress; pct_complete: number | null; task_status: string | null;
           last_inspected: string | null; line: [number, number][] | null; follows_street?: boolean }[];
  driveways: { uid: string; road: string; status: string; address?: string | null; lat: number; lng: number }[];
  footnote?: string;
  empty?: string;
};

export type ReportBlock =
  | MapBlockData
  | { type: "kpis"; items: KpiItem[]; empty?: string; title?: string }
  | ({
      type: "chart";
      chart: ChartKind;
      title: string;
      labels: string[];
      unit?: string | null;
      series: { label: string; values: number[] }[];
      footnote?: string;
      not_recorded?: string;
      empty?: string;
    } & Words)
  | ({ type: "table"; title: string; columns: string[]; rows: unknown[][]; footnote?: string; empty?: string } & Words)
  | { type: "text"; heading?: string; body?: string; title?: string; empty?: string };

export type Tone = "good" | "watch" | "concern" | "neutral";

export type ReportStory = {
  headline?: string;
  findings?: { text: string; tone: Tone }[];
  next_steps?: string[];
  data_notes?: string[];
};

export type Report = { title: string; made_on: string; blocks: ReportBlock[]; story?: ReportStory; sources?: string[] };
