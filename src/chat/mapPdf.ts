// The report PDF's map page: a full A4 landscape page with the road map drawn at print resolution
// (Google's grey street tiles under every road, its name, its end caps and every driveway, as MapView draws them),
// then the legend with counts and the map's note. The tiles allow cross-origin reads, so they paint into a canvas.
import type { MapBlockData } from "./types";
import { ROAD_COLOURS, ROAD_LABELS, driveColour } from "./mapColours";

const BOX = { x: 10, y: 22, w: 277, h: 160 };     // the map on the page, in mm
const PX_PER_MM = 10;                              // ~250 dpi: sharp in print, and zoomable on screen
const K = 2.4;                                     // MapView's screen sizes (px) scaled to this page
const TILE = 512;                                  // Google's scale=2 tiles: street names readable at print size
const TILE_WAIT_MS = 15000;

const inspected = (status: string) => !/^not inspected|^no inspection/i.test(status);
// Web Mercator, 0..1 across the world
const mx = (lng: number) => (lng + 180) / 360;
const my = (lat: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI);
};

function tile(src: string): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => ok(img);
    img.onerror = () => ok(null);                  // a missing tile leaves that square blank, never fails the page
    img.src = src;
  });
}

async function drawMap(block: MapBlockData): Promise<HTMLCanvasElement> {
  const W = BOX.w * PX_PER_MM, H = BOX.h * PX_PER_MM;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // fit what matters (roads and inspected driveways; every dot only when there is nothing else), as MapView does
  const main: [number, number][] = [
    ...block.roads.flatMap((r) => r.line ?? []),
    ...block.driveways.filter((d) => inspected(d.status)).map((d) => [d.lat, d.lng] as [number, number]),
  ];
  const pts = main.length ? main : block.driveways.map((d) => [d.lat, d.lng] as [number, number]);
  if (!pts.length) pts.push([44.35, -78.74]);
  const xs = pts.map(([, lng]) => mx(lng)), ys = pts.map(([lat]) => my(lat));
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const fit = Math.min((W * 0.9) / Math.max((x1 - x0) * TILE, 1e-12), (H * 0.9) / Math.max((y1 - y0) * TILE, 1e-12));
  const z = Math.max(3, Math.min(17, Math.floor(Math.log2(fit))));
  const world = TILE * 2 ** z;
  const ox = ((x0 + x1) / 2) * world - W / 2, oy = ((y0 + y1) / 2) * world - H / 2;
  const at = (lat: number, lng: number): [number, number] => [mx(lng) * world - ox, my(lat) * world - oy];

  // the grey street tiles (the chat map's default look)
  const n = 2 ** z, jobs: Promise<void>[] = [];
  for (let ty = Math.floor(oy / TILE); ty * TILE < oy + H; ty++) {
    for (let tx = Math.floor(ox / TILE); tx * TILE < ox + W; tx++) {
      if (ty < 0 || ty >= n) continue;
      const sx = tx * TILE - ox, sy = ty * TILE - oy;
      const src = `https://mt${(tx + ty) & 3}.google.com/vt/lyrs=m&x=${((tx % n) + n) % n}&y=${ty}&z=${z}&scale=2`;
      jobs.push(tile(src).then((img) => { if (img) ctx.drawImage(img, sx, sy, TILE, TILE); }));
    }
  }
  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, TILE_WAIT_MS))]);
  // grey, quiet tiles (the chat's grayscale(1) contrast(0.85) brightness(1.08) at 85%), done per pixel: some
  // browsers skip canvas filters, which leaves the map in full colour and the road colours hard to see
  const im = ctx.getImageData(0, 0, W, H), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = Math.min(255, ((g - 128) * 0.85 + 128) * 1.08) * 0.85 + 255 * 0.15;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(im, 0, 0);

  const dot = (lat: number, lng: number, r: number, fill: string, stroke?: string, sw = 0) => {
    const [x, y] = at(lat, lng);
    ctx.beginPath();
    ctx.arc(x, y, r * K, 0, 2 * Math.PI);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.lineWidth = sw * K; ctx.strokeStyle = stroke; ctx.stroke(); }
  };
  const line = (pts: [number, number][], colour: string, width: number) => {
    ctx.beginPath();
    pts.forEach(([lat, lng], i) => { const [x, y] = at(lat, lng); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    ctx.lineWidth = width * K; ctx.strokeStyle = colour; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.stroke();
  };
  const colour = (r: MapBlockData["roads"][number]) => ROAD_COLOURS[r.progress] ?? ROAD_COLOURS.no_inspection;
  const roads = block.roads.filter((r) => r.line?.length) as (MapBlockData["roads"][number] & { line: [number, number][] })[];

  // bottom to top, as MapView: faint not-inspected dots, road casings, roads, end caps, inspected dots, names
  ctx.globalAlpha = 0.45;
  block.driveways.filter((d) => !inspected(d.status)).forEach((d) => dot(d.lat, d.lng, 3, "#6b7280"));
  ctx.globalAlpha = 1;
  roads.forEach((r) => line(r.line, "#ffffff", 13));
  roads.forEach((r) => line(r.line, colour(r), r.progress === "no_inspection" ? 6 : 8));
  roads.forEach((r) => [r.line[0], r.line[r.line.length - 1]].forEach(([lat, lng]) => dot(lat, lng, 5, "#ffffff", colour(r), 3)));
  block.driveways.filter((d) => inspected(d.status)).forEach((d) => dot(d.lat, d.lng, 6.5, driveColour(d.status), "#ffffff", 2));
  ctx.font = `600 ${12 * K}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  // named roads only, as the chat map: the "Road 98326…" codes pile on top of each other at this scale
  roads.filter((r) => !r.name.startsWith("Road ")).forEach((r) => {
    const [x, y] = at(...r.line[Math.floor(r.line.length / 2)]);
    ctx.lineWidth = 4 * K; ctx.strokeStyle = "#ffffff"; ctx.lineJoin = "round";
    ctx.strokeText(r.name, x, y - 9 * K);
    ctx.fillStyle = "#111827";
    ctx.fillText(r.name, x, y - 9 * K);
  });
  return canvas;
}

// Adds the map as its own landscape page at the end of the PDF (jsPDF instance)
export async function addMapPage(pdf: any, block: MapBlockData) {
  const canvas = await drawMap(block);
  pdf.addPage("a4", "landscape");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(17, 24, 39);
  pdf.text(block.title || "Road progress on the map", BOX.x, 16);
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.9), "JPEG", BOX.x, BOX.y, BOX.w, BOX.h);
  pdf.setDrawColor(209, 213, 219);
  pdf.setLineWidth(0.2);
  pdf.rect(BOX.x, BOX.y, BOX.w, BOX.h);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(107, 114, 128);
  pdf.text("Map data © Google", BOX.x + BOX.w - 1.5, BOX.y + BOX.h - 1.5, { align: "right" });

  // the legend: every colour explained, with its count (as the chat's legend), one labelled row each for the
  // roads' lines and the driveways' dots
  const groups: { title: string; road: boolean; items: { label: string; colour: string }[] }[] = [
    { title: "Roads:", road: true, items: (Object.keys(ROAD_LABELS) as (keyof typeof ROAD_LABELS)[])
      .map((p) => ({ p, n: block.roads.filter((r) => r.progress === p).length })).filter((x) => x.n)
      .map(({ p, n }) => ({ label: `${ROAD_LABELS[p]} ${n}`, colour: ROAD_COLOURS[p] })) },
    { title: "Driveways:", road: false, items: Array.from(block.driveways.reduce((m, d) => m.set(d.status, (m.get(d.status) ?? 0) + 1), new Map<string, number>()))
      .map(([s, n]) => ({ label: `${s} ${n}`, colour: driveColour(s) })) },
  ];
  pdf.setFontSize(9);
  pdf.setTextColor(17, 24, 39);
  let y = BOX.y + BOX.h + 7 - 5.5;
  for (const g of groups) {
    if (!g.items.length) continue;
    y += 5.5;
    pdf.setFont("helvetica", "bold");
    pdf.text(g.title, BOX.x, y);
    pdf.setFont("helvetica", "normal");
    let x = BOX.x + 20;
    for (const it of g.items) {
      const w = 7 + pdf.getTextWidth(it.label) + 6;
      if (x + w > BOX.x + BOX.w) { x = BOX.x + 20; y += 5.5; }
      pdf.setFillColor(it.colour);
      if (g.road) pdf.roundedRect(x, y - 2.3, 5, 1.8, 0.9, 0.9, "F");
      else pdf.circle(x + 2.5, y - 1.4, 1.4, "F");
      pdf.text(it.label, x + 7, y);
      x += w;
    }
  }
  if (block.footnote) {
    pdf.setFontSize(7.5);
    pdf.setTextColor(107, 114, 128);
    pdf.text(pdf.splitTextToSize(block.footnote, BOX.w), BOX.x, y + 5.5);
  }
}
