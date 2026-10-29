// The map's colours (MapView.tsx draws them, ReportCard.tsx's legend explains them): kept apart from MapView so
// the legend does not load leaflet on the server.
import type { RoadProgress } from "./types";

// a road's line: where it stands at its latest site inspection (the report's series colours, grey for none)
export const ROAD_COLOURS: Record<RoadProgress, string> = {
  completed: "#1baf7a",
  partly_done: "#2a78d6",
  not_started: "#eb6834",
  no_inspection: "#a8adb5",
};
export const ROAD_LABELS: Record<RoadProgress, string> = {
  completed: "Completed",
  partly_done: "Partly done",
  not_started: "Not started",
  no_inspection: "No inspection yet",
};
// a driveway's dot, by its status in the inspection (anything else: grey)
export const driveColour = (status: string) => {
  const s = status.toLowerCase();
  if (s.startsWith("completed")) return "#1baf7a";
  if (s.startsWith("in progress") || s.startsWith("partially")) return "#2a78d6";
  if (s.startsWith("pending")) return "#eda100";
  if (s.startsWith("hold")) return "#d03b3b";
  return "#b8b6ae";
};
