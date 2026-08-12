/**
 * Render a settlement-level (OSID) control map from a scenario save, shading
 * every OSID whose engine controller disagrees with a painted-control snapshot.
 *
 * Usage:
 *   node tools/render_control_map.mjs <save.json> <paintedKey> <outPath> "<title>" ["<caveat>"]
 *
 *   paintedKey  one of jan1993 | apr1994 | apr1995 | oct1995, or "none" to skip
 *               mismatch shading entirely (pure control map).
 *   caveat      optional second header line, e.g. when the painted reference is
 *               the nearest available rather than an exact date match.
 *
 * PALETTE NOTE: blue is reserved for MISMATCH here, so HRHB is drawn amber
 * rather than its usual slate blue. The legend states this on every image so a
 * reader never has to guess.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';

const ROOT = 'F:/A-War-Without-Victory';
const [SAVE_PATH, PAINTED_KEY, OUT_PATH, TITLE, CAVEAT] = process.argv.slice(2);
if (!SAVE_PATH || !PAINTED_KEY || !OUT_PATH) {
  console.error('usage: node tools/render_control_map.mjs <save.json> <paintedKey|none> <out.png> "<title>" ["<caveat>"]');
  process.exit(2);
}

const FACTION_COLORS = {
  RBiH: 'rgb(74, 124, 84)',
  RS: 'rgb(176, 54, 54)',
  HRHB: 'rgb(198, 148, 58)', // amber — blue is reserved for mismatch on this map
  null: '#6b7280',
};
const MISMATCH_FILL = 'rgb(20, 34, 122)';
const MISMATCH_EDGE = 'rgb(125, 211, 252)';

const geo = JSON.parse(readFileSync(`${ROOT}/data/derived/operational/operational_settlements.geojson`, 'utf-8'));
const save = JSON.parse(readFileSync(SAVE_PATH, 'utf-8'));
const pc = save.political.political_controllers;
const turn = save.meta?.turn ?? '?';
const painted = PAINTED_KEY === 'none'
  ? null
  : JSON.parse(readFileSync(`${ROOT}/data/source/calibration/painted_control_${PAINTED_KEY}.json`, 'utf-8')).by_settlement_id;

const features = geo.features;

let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
function visitCoords(coords, depth) {
  if (depth === 0) {
    const [x, y] = coords;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  } else {
    for (const c of coords) visitCoords(c, depth - 1);
  }
}
const depthFor = (t) => (t === 'Polygon' ? 2 : t === 'MultiPolygon' ? 3 : 1);
for (const f of features) visitCoords(f.geometry.coordinates, depthFor(f.geometry.type));

const PAD = 0.02;
const spanX = maxX - minX, spanY = maxY - minY;
minX -= spanX * PAD; maxX += spanX * PAD; minY -= spanY * PAD; maxY += spanY * PAD;

const WIDTH = 1600, HEIGHT = 1500;
const scale = Math.min(WIDTH / (maxX - minX), HEIGHT / (maxY - minY));
const offX = (WIDTH - (maxX - minX) * scale) / 2;
const offY = (HEIGHT - (maxY - minY) * scale) / 2;
// Latitude increases north; canvas Y increases downward — flip to keep north up.
const project = ([x, y]) => [(x - minX) * scale + offX, HEIGHT - ((y - minY) * scale + offY)];

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#0a0e14';
ctx.fillRect(0, 0, WIDTH, HEIGHT);

function tracePolygon(coords) {
  ctx.beginPath();
  for (const ring of coords) {
    ring.forEach((pt, i) => {
      const [px, py] = project(pt);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.closePath();
  }
}

let mismatched = 0, compared = 0, unpainted = 0;
const mismatchList = [];

// Two passes so mismatch outlines are never overdrawn by a later neighbour.
for (const pass of ['fill', 'outline']) {
  for (const f of features) {
    const osid = f.properties.osid;
    const controller = pc[osid] ?? null;
    const want = painted ? painted[osid] : undefined;
    const isMismatch = want !== undefined && controller !== want;

    if (pass === 'fill') {
      if (want === undefined) { if (painted) unpainted += 1; } else { compared += 1; }
      if (isMismatch) { mismatched += 1; mismatchList.push({ osid, engine: controller, want }); }
      ctx.fillStyle = isMismatch ? MISMATCH_FILL : (FACTION_COLORS[controller ?? 'null'] ?? FACTION_COLORS.null);
      ctx.strokeStyle = 'rgba(255,255,255,0.30)';
      ctx.lineWidth = 0.6;
    } else {
      if (!isMismatch) continue;
      ctx.strokeStyle = MISMATCH_EDGE;
      ctx.lineWidth = 1.6;
    }

    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) {
      tracePolygon(poly);
      if (pass === 'fill') { ctx.fill(); ctx.stroke(); } else { ctx.stroke(); }
    }
  }
}

// Orientation anchors.
const LABEL_OSIDS = [
  'op:bihac:bihac_2', 'op:banja_luka:banja_luka_2', 'op:centar_sarajevo:sarajevo_dio_centar_sajarevo',
  'op:mostar:mostar_zapad_2', 'op:bijeljina:bijeljina_2', 'op:trebinje:trebinje_2',
  'op:zvornik:zvornik', 'op:brcko:brcko', 'op:tuzla:tuzla_2', 'op:gorazde:gorazde_2', 'op:livno:livno_2',
];
for (const f of features) {
  if (!LABEL_OSIDS.includes(f.properties.osid)) continue;
  const ring = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : f.geometry.coordinates[0][0];
  let cx = 0, cy = 0;
  for (const pt of ring) { cx += pt[0]; cy += pt[1]; }
  const [px, py] = project([cx / ring.length, cy / ring.length]);
  // settlement_name carries a " (+N)" merged-constituent suffix — drop it for labels.
  const label = String(f.properties.settlement_name ?? f.properties.osid).replace(/\s*\(\+\d+\)\s*$/, '');
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(label, px, py);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, px, py);
}

ctx.textAlign = 'left';
ctx.fillStyle = '#fff';
ctx.font = 'bold 22px sans-serif';
ctx.fillText(TITLE ?? `OSID control — turn ${turn}`, 20, 32);
ctx.font = '15px sans-serif';
ctx.fillStyle = '#9ca3af';
ctx.fillText(`engine turn ${turn}  ·  reference: ${painted ? `painted_control_${PAINTED_KEY}` : 'none'}`, 20, 56);
if (CAVEAT) {
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'italic 15px sans-serif';
  ctx.fillText(CAVEAT, 20, 78);
}

let ly = CAVEAT ? 112 : 92;
const legend = [
  ['RBiH', FACTION_COLORS.RBiH],
  ['RS', FACTION_COLORS.RS],
  ['HRHB  (amber here — blue is reserved for mismatch)', FACTION_COLORS.HRHB],
];
if (painted) legend.push([`MISMATCH vs painted — ${mismatched} OSIDs`, MISMATCH_FILL]);
for (const [name, color] of legend) {
  ctx.fillStyle = color;
  ctx.fillRect(20, ly - 14, 20, 20);
  if (color === MISMATCH_FILL) { ctx.strokeStyle = MISMATCH_EDGE; ctx.lineWidth = 1.6; ctx.strokeRect(20, ly - 14, 20, 20); }
  ctx.fillStyle = '#e5e7eb';
  ctx.font = '16px sans-serif';
  ctx.fillText(name, 48, ly + 2);
  ly += 26;
}
if (painted) {
  ctx.fillStyle = '#9ca3af';
  ctx.font = '14px sans-serif';
  ctx.fillText(`${compared} OSIDs compared · ${unpainted} unpainted (no reference, drawn by faction)`, 20, ly + 4);
}

writeFileSync(OUT_PATH, canvas.toBuffer('image/png'));
console.log(`${OUT_PATH}  turn=${turn}  ref=${PAINTED_KEY}  mismatched=${mismatched}/${compared}  unpainted=${unpainted}`);
