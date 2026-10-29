
import React, { useEffect, useMemo } from "react";
import { CircleMarker, LayersControl, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { MapBlockData } from "./types";
import { ROAD_COLOURS, ROAD_LABELS, driveColour } from "./mapColours";
import styles from "./report.module.css";

// Google's tiles, as the app's other maps use them: lyrs m = road map, y = satellite with road names
const GOOGLE = (layer: string) => `https://{s}.google.com/vt/lyrs=${layer}&x={x}&y={y}&z={z}`;
const SUBDOMAINS = ["mt0", "mt1", "mt2", "mt3"];

// a driveway an inspection has recorded (a real status): drawn large on top; the rest small and faint
const inspected = (status: string) => !/^not inspected|^no inspection/i.test(status);

// Loaded with next/dynamic { ssr: false } (ReportCard.tsx): leaflet touches `window` when imported.

// the map fits everything drawn once its box has its size (inside the chat it is sized after it mounts)
function Fit({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => {
      map.invalidateSize();
      if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    }, 150);
    return () => clearTimeout(t);
  }, [map, points]);
  return null;
}

export default function MapView({ block, height }: { block: MapBlockData; height: number }) {
  // the map opens on what matters: the roads and the driveways an inspection recorded (the faint not-inspected dots
  // are spread over the county and would zoom it out); all the dots only when there is nothing else
  const points = useMemo<[number, number][]>(() => {
    const dot = (d: { lat: number; lng: number }) => [d.lat, d.lng] as [number, number];
    const main = [
      ...block.roads.flatMap((r) => (r.line ?? []).map(([lat, lng]) => [lat, lng] as [number, number])),
      ...block.driveways.filter((d) => inspected(d.status)).map(dot),
    ];
    return main.length ? main : block.driveways.map(dot);
  }, [block]);
  return (
    // opens fitted to everything drawn (Kawartha Lakes when there is nothing)
    <MapContainer {...(points.length ? { bounds: points, boundsOptions: { padding: [40, 40] as [number, number] } }
                                     : { center: [44.35, -78.74] as [number, number], zoom: 10 })}
                  scrollWheelZoom={false} style={{ height, width: "100%", borderRadius: 10 }}>
      {/* the tiles the app's other maps use, in three looks picked at the top right: grey (default, so only the
          roads and driveways carry colour), colour, or satellite with road names */}
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Grey">
          <TileLayer url={GOOGLE("m")} subdomains={SUBDOMAINS} attribution="Map data &copy; Google"
                     className={styles.quietTiles} />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Colour">
          <TileLayer url={GOOGLE("m")} subdomains={SUBDOMAINS} attribution="Map data &copy; Google" />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer url={GOOGLE("y")} subdomains={SUBDOMAINS} attribution="Imagery &copy; Google" />
        </LayersControl.BaseLayer>
      </LayersControl>
      <Fit points={points} />
      {/* drawn bottom to top: faint not-inspected dots, road casings, roads, end caps, inspected dots */}
      {block.driveways.filter((d) => !inspected(d.status)).map((d, i) => (
        <CircleMarker key={`q-${d.uid}-${i}`} center={[d.lat, d.lng]} radius={3}
                      pathOptions={{ stroke: false, fillColor: "#6b7280", fillOpacity: 0.45 }}>
          <Tooltip><strong>{d.uid}</strong> · {d.status}<br />{d.address || d.road}</Tooltip>
        </CircleMarker>
      ))}
      {block.roads.map((r) => r.line && (
        // a white casing under each road, so it reads on any background like a highlighted route
        <Polyline key={`c-${r.jde}`} positions={r.line} interactive={false}
                  pathOptions={{ color: "#ffffff", weight: 13, opacity: 0.95, lineCap: "round" }} />
      ))}
      {block.roads.map((r) => r.line && (
        <Polyline key={r.jde} positions={r.line}
                  pathOptions={{ color: ROAD_COLOURS[r.progress] ?? ROAD_COLOURS.no_inspection,
                                 weight: r.progress === "no_inspection" ? 6 : 8, opacity: 1, lineCap: "round" }}>
          {/* a layer holds one tooltip: the road's name (always shown when it has one); a click gives the details */}
          <Tooltip permanent={!r.name.startsWith("Road ")} sticky={r.name.startsWith("Road ")} direction="top"
                   offset={[0, -8]} className={styles.roadLabel}>{r.name}</Tooltip>
          <Popup>
            <strong>{r.name}</strong>
            <br />
            {r.pct_complete === null ? ROAD_LABELS.no_inspection : `${r.pct_complete}% · ${r.task_status ?? ROAD_LABELS[r.progress]}`}
            {r.last_inspected && <><br />Last inspected {r.last_inspected}</>}
          </Popup>
        </Polyline>
      ))}
      {/* a cap at the road's two ends only (its line follows the street through many points) */}
      {block.roads.flatMap((r) => (r.line?.length ? [r.line[0], r.line[r.line.length - 1]] : []).map((p, j) => (
        <CircleMarker key={`e-${r.jde}-${j}`} center={p} radius={5} interactive={false}
                      pathOptions={{ color: ROAD_COLOURS[r.progress] ?? ROAD_COLOURS.no_inspection, weight: 3,
                                     fillColor: "#ffffff", fillOpacity: 1 }} />
      )))}
      {block.driveways.filter((d) => inspected(d.status)).map((d, i) => (
        <CircleMarker key={`${d.uid}-${i}`} center={[d.lat, d.lng]} radius={6.5}
                      pathOptions={{ color: "#ffffff", weight: 2, fillColor: driveColour(d.status), fillOpacity: 1 }}>
          <Tooltip><strong>{d.uid}</strong> · {d.status}<br />{d.address || d.road}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
