/**
 * Render a settlement-level (OSID) control map from a scenario save, shading
 * every OSID whose engine controller disagrees with a painted-control snapshot
 * AND indicating which faction the reference says SHOULD hold it.
 *
 * Usage:
 *   node tools/render_control_map.mjs <save.json> <paintedKey> <outPath> "<title>" ["<caveat>"]
 *
 *   paintedKey  one of jan1993 | apr1994 | apr1995 | oct1995, or "none" to skip
 *               mismatch shading entirely (pure control map).
 *   caveat      optional second header line, e.g. when the painted reference is
 *               the nearest available rather than an exact date match.
 *
 * PALETTE CHANGE 2026-08-12 — this is the INVERSE of the original scheme.
 * Mismatch is now AMBER and HRHB keeps its usual slate BLUE. Images rendered
 * before this date used blue-for-mismatch / amber-for-HRHB and their baked-in
 * legends say so; do not compare legends across that boundary.
 *
 * A mismatched OSID carries THREE marks, all keyed to the EXPECTED controller:
 *   - amber fill            "the engine has this wrong"
 *   - coloured outline      who the reference says should hold it
 *   - coloured centroid dot same, legible where the polygon is too small to
 *                           show an outline colour
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';

const ROOT = 'F:/A-War-Without-Victory';
const [SAVE_PATH, PAINTED_KEY, OUT_PATH, TITLE, CAVEAT] = process.argv.slice(2);
if (!SAVE_PATH || !PAINTED_KEY || !OUT_PATH) {
  console.error('usage: node tools/render_control_map.mjs <save.json> <paintedKey|none> <out.png> "<title>" ["<caveat>"]');
  process.exit(2);
}

/** Fill colours for a CORRECTLY-held OSID. HRHB is blue again (see header). */
const FACTION_COLORS = {
  RBiH: 'rgb(74, 124, 84)',
  RS: 'rgb(176, 54, 54)',
  HRHB: 'rgb(72, 110, 190)',
  null: '#6b7280',
};
/** Brightened variants used ONLY to say "this faction should hold it". */
const EXPECTED_COLORS = {
  RBiH: 'rgb(122, 200, 140)',
  RS: 'rgb(255, 110, 110)',
  HRHB: 'rgb(130, 175, 255)',
  null: '#d1d5db',
};
const MISMATCH_FILL = 'rgb(201, 142, 38)';

const geo = JSON.parse(readFileSync(`${ROOT}/data/derived/operational/operational_settlements.geojson`, 'utf-8'));
// orphan -> merge parent (tools/merge_micro_osids.cjs); absent map degrades to
// the previous behaviour rather than failing the render.
let mergeMap = {};
try { mergeMap = JSON.parse(readFileSync(`${ROOT}/tools/micro_osid_merge_map.json`, 'utf-8')); } catch { mergeMap = {}; }
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

/** Centroid of the largest outer ring — good enough to place a marker dot. */
function largestRingCentroid(f) {
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let best = null, bestLen = -1;
  for (const poly of polys) {
    const ring = poly[0];
    if (ring && ring.length > bestLen) { bestLen = ring.length; best = ring; }
  }
  if (!best) return null;
  let cx = 0, cy = 0;
  for (const pt of best) { cx += pt[0]; cy += pt[1]; }
  return project([cx / best.length, cy / best.length]);
}

let mismatched = 0, compared = 0, unpainted = 0;
const byExpected = { RBiH: 0, RS: 0, HRHB: 0 };
const mismatchList = [];

// Three passes so an outline/dot is never overdrawn by a later neighbour's fill.
for (const pass of ['fill', 'outline', 'dot']) {
  for (const f of features) {
    const osid = f.properties.osid;
    // A merge child is drawn as, and scored as, its parent cell.
    const mergedInto = pc[osid] === undefined ? (mergeMap[osid] ?? null) : null;
    const scoredOsid = mergedInto ?? osid;
    const controller = pc[scoredOsid] ?? null;
    const want = painted ? painted[scoredOsid] : undefined;
    const isMismatch = want !== undefined && controller !== want;

    if (pass === 'fill') {
      // statistics belong to the SCORED set (712) — never count a merge child,
      // or its parent is double-counted and the denominator drifts to 744.
      if (!mergedInto) {
        if (want === undefined) { if (painted) unpainted += 1; } else { compared += 1; }
      }
      if (isMismatch && !mergedInto) {
        mismatched += 1;
        if (want in byExpected) byExpected[want] += 1;
        mismatchList.push({ osid, engine: controller, want });
      }
      ctx.fillStyle = isMismatch ? MISMATCH_FILL : (FACTION_COLORS[controller ?? 'null'] ?? FACTION_COLORS.null);
      ctx.strokeStyle = 'rgba(255,255,255,0.30)';
      ctx.lineWidth = 0.6;
    } else {
      if (!isMismatch) continue;
    }

    if (pass === 'dot') {
      const c = largestRingCentroid(f);
      if (!c) continue;
      ctx.beginPath();
      ctx.arc(c[0], c[1], 3.4, 0, Math.PI * 2);
      ctx.fillStyle = EXPECTED_COLORS[want ?? 'null'] ?? EXPECTED_COLORS.null;
      ctx.fill();
      ctx.lineWidth = 1.1;
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.stroke();
      continue;
    }

    if (pass === 'outline') {
      ctx.strokeStyle = EXPECTED_COLORS[want ?? 'null'] ?? EXPECTED_COLORS.null;
      ctx.lineWidth = 2.0;
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
  const c = largestRingCentroid(f);
  if (!c) continue;
  // settlement_name carries a " (+N)" merged-constituent suffix — drop it for labels.
  const label = String(f.properties.settlement_name ?? f.properties.osid).replace(/\s*\(\+\d+\)\s*$/, '');
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.strokeText(label, c[0], c[1]);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, c[0], c[1]);
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
  ['RBiH holds, correct', FACTION_COLORS.RBiH, null],
  ['RS holds, correct', FACTION_COLORS.RS, null],
  ['HRHB holds, correct', FACTION_COLORS.HRHB, null],
];
if (painted) {
  legend.push([`WRONG vs painted — ${mismatched} OSIDs (amber fill)`, MISMATCH_FILL, null]);
  legend.push([`  \u2192 should be RBiH — ${byExpected.RBiH}`, MISMATCH_FILL, EXPECTED_COLORS.RBiH]);
  legend.push([`  \u2192 should be RS — ${byExpected.RS}`, MISMATCH_FILL, EXPECTED_COLORS.RS]);
  legend.push([`  \u2192 should be HRHB — ${byExpected.HRHB}`, MISMATCH_FILL, EXPECTED_COLORS.HRHB]);
}
for (const [name, color, expected] of legend) {
  ctx.fillStyle = color;
  ctx.fillRect(20, ly - 14, 20, 20);
  if (expected) {
    // Mirror the map: amber swatch, expected-controller outline + dot.
    ctx.strokeStyle = expected;
    ctx.lineWidth = 2.0;
    ctx.strokeRect(20, ly - 14, 20, 20);
    ctx.beginPath();
    ctx.arc(30, ly - 4, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = expected;
    ctx.fill();
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.stroke();
  }
  ctx.fillStyle = '#e5e7eb';
  ctx.font = '16px sans-serif';
  ctx.fillText(name, 48, ly + 2);
  ly += 26;
}
if (painted) {
  ctx.fillStyle = '#9ca3af';
  ctx.font = '14px sans-serif';
  ctx.fillText('outline + dot colour = which faction the reference says should hold it', 20, ly + 4);
  ctx.fillText(`${compared} OSIDs compared · ${unpainted} unpainted (no reference, drawn by faction)`, 20, ly + 24);
}

writeFileSync(OUT_PATH, canvas.toBuffer('image/png'));
console.log(`${OUT_PATH}  turn=${turn}  ref=${PAINTED_KEY}  mismatched=${mismatched}/${compared}  unpainted=${unpainted}`);
console.log(`  expected-controller split: RBiH ${byExpected.RBiH} · RS ${byExpected.RS} · HRHB ${byExpected.HRHB}`);
