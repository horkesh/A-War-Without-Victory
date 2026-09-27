#!/usr/bin/env node
/**
 * Calibration control timeline viewer.
 *
 * Builds a self-contained interactive HTML map of OSID control for EVERY week of a
 * run, with painted-reference scoring at the four historical checkpoints.
 *
 * WHY THIS EXISTS. `matched_osids` is NON-INJECTIVE: two runs have scored an
 * identical 637 over DIFFERENT maps, four cells apart. A score is not an identity,
 * so a number alone cannot tell you whether a change moved the right cells. This
 * renders the cells themselves, per week, so a delta can be inspected rather than
 * inferred.
 *
 * WHERE THE TIME AXIS COMES FROM. Nothing new is emitted by the engine for this.
 * `final_save.json` already carries `political.control_events` — the complete flip
 * log for the whole campaign ({turn, settlement_id, mechanism, from, to}) — plus
 * `political.initial_political_controllers`. Replaying the log over turn-0 control
 * yields the exact controller map at any week. This is the same `stateAt()` replay
 * `tools/verify_checkpoints.cjs` scores from, and match counts here are computed the
 * same way, so the two tools agree by construction.
 *
 * THE FOUR-SNAPSHOT RULE (read before trusting a mismatch). Painted historical truth
 * exists at FOUR weeks only — jan1993 w39, apr1994 w104, apr1995 w156, oct1995 w188.
 * There is no historical reference for week 73. Control is therefore shown for every
 * week, but MISMATCH IS ONLY DEFINED AT THE FOUR CHECKPOINTS, and the viewer refuses
 * to colour mismatches anywhere else. Comparing a mid-period week against its era's
 * painted snapshot would report "mismatches" that are only the war not having
 * happened yet — a confident, wrong instrument. Do not add that.
 *
 * PROVENANCE. A run's own `historical_fit` is scored against the painted files AS OF
 * THE RUN DATE (the same run has read 673 then, 675 replayed), and painted files are
 * not in `consumed_inputs.files`, so a repaint silently re-bases every recorded score
 * with nothing recording it. This tool always replays against the painted files ON
 * DISK NOW and stamps their sha256 + revision, the run directory, and the run's own
 * commit/node/dirty metadata into the page. Latest is not the same as valid: a run
 * whose metadata says dirty tree or the wrong Node major is inadmissible as a
 * baseline no matter how recent it is, and the page says so.
 *
 * Usage:
 *   node tools/calibration_timeline.mjs [run_dir] [--out <path>]
 *
 *   run_dir   Defaults to the most recently modified runs/<dir> holding a final_save.json.
 *   --out     Defaults to <run_dir>/control_timeline.html (runs/ is gitignored).
 */

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * ONE SCENARIO, MANY SNAPSHOTS (owner, 2026-08-24: *"All we should have is one
 * definitive 188-weeks scenario. Then we take our relevant snapshots from its runs."*).
 *
 * Intermediate checkpoints are views of the definitive campaign, NOT separate campaigns.
 * The shorter `apr1992_definitive_{40,52,104,156}w` forks exist only because a scored
 * intermediate once required a scenario whose duration selected that reference, and they
 * DRIFTED: `apr1992_definitive_104w` was measured missing `firepower_deficit_penalty_enabled`
 * and `must_hold_osids_by_corps`, scoring 639 where the 188w line scored 647 at the same
 * week 104 — a fossil answering for an engine two fixes old.
 *
 * So this tool prefers the master when auto-discovering, and when asked to read anything
 * else it says so loudly rather than presenting fossil scores as calibration truth. It does
 * not refuse: 40w remains a legitimate DEVELOPMENT loop (and the structural-fingerprint
 * gate's scenario). The rule it enforces is that a non-master score is never adoptable.
 */
const MASTER_SCENARIO_ID = 'apr1992_definitive_188w';

/** Forks the repo has explicitly measured as drifted from the master line. */
const KNOWN_DRIFTED_SCENARIOS = new Set(['apr1992_definitive_104w']);

/** The only weeks at which painted historical truth exists. */
const CHECKPOINTS = [
    { key: 'jan1993', week: 39, label: 'January 1993' },
    { key: 'apr1994', week: 104, label: 'April 1994' },
    { key: 'apr1995', week: 156, label: 'April 1995' },
    { key: 'oct1995', week: 188, label: 'October 1995' },
];

const FACTION_COLOR = { RBiH: '#4a7c54', RS: '#b03636', HRHB: '#486ebe' };
// Two-letter marker labels. The circle is colour-keyed to the legend; the letters
// are there so colour is not the only channel carrying the expected owner.
const FACTION_SHORT = { RBiH: 'RB', RS: 'RS', HRHB: 'HR' };
const MECHANISM_COLOR = {
    combat: '#c98e26',
    paramilitary: '#8b3fa8',
    consolidation: '#2f8f8f',
    abandoned: '#7a7263',
    event: '#c0453f',
    setup_control: '#5c6b7a',
};

// ---------------------------------------------------------------------------
// Arguments

const argv = process.argv.slice(2);
let runDirArg = null;
let outArg = null;
for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--out') { outArg = argv[i + 1]; i += 1; continue; }
    if (a.startsWith('--out=')) { outArg = a.slice('--out='.length); continue; }
    if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(2); }
    if (runDirArg === null) runDirArg = a;
}

/**
 * Newest run directory that actually holds a final_save.json, PREFERRING the master
 * scenario.
 *
 * Two filters, each for a reason:
 *  - A partial or interrupted run leaves a directory with no final save; picking it would
 *    fail confusingly, so incomplete directories are skipped.
 *  - Newest-wins alone will happily select a run of a drifted fork and score it with full
 *    confidence. Master runs are therefore preferred outright, and a fallback to any other
 *    scenario is reported rather than made silently.
 */
function findLatestRunDir() {
    const runsRoot = join(ROOT, 'runs');
    if (!existsSync(runsRoot)) return null;
    const candidates = [];
    for (const name of readdirSync(runsRoot)) {
        const dir = join(runsRoot, name);
        let st;
        try { st = statSync(dir); } catch { continue; }
        if (!st.isDirectory()) continue;
        const save = join(dir, 'final_save.json');
        if (!existsSync(save)) continue;
        let scenarioId = null;
        try {
            scenarioId = JSON.parse(readFileSync(join(dir, 'run_meta.json'), 'utf8')).scenario_id ?? null;
        } catch { scenarioId = null; }
        candidates.push({ dir, scenarioId, mtime: statSync(save).mtimeMs });
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.mtime - a.mtime || (a.dir < b.dir ? 1 : -1));
    const master = candidates.find((c) => c.scenarioId === MASTER_SCENARIO_ID);
    if (master) return master.dir;
    console.log(`NOTE      no run of the master scenario (${MASTER_SCENARIO_ID}) found in runs/;`);
    console.log(`          falling back to the newest run available: ${candidates[0].scenarioId ?? 'unknown scenario'}`);
    return candidates[0].dir;
}

const runDir = runDirArg ? resolve(runDirArg) : findLatestRunDir();
if (!runDir) {
    console.error('No run directory given and no runs/<dir>/final_save.json found.');
    console.error('Usage: node tools/calibration_timeline.mjs [run_dir] [--out <path>]');
    process.exit(2);
}
const savePath = join(runDir, 'final_save.json');
if (!existsSync(savePath)) {
    console.error(`No final_save.json in ${runDir}`);
    console.error('(An interrupted run leaves a directory without one.)');
    process.exit(2);
}

// ---------------------------------------------------------------------------
// Load

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

const save = readJson(savePath);
const init = save?.political?.initial_political_controllers;
const events = [...(save?.political?.control_events ?? [])];
if (!init || typeof init !== 'object') {
    console.error('final_save.json has no political.initial_political_controllers — cannot replay control.');
    process.exit(1);
}

// Deterministic order: the replay must not depend on emission order.
events.sort((a, b) => a.turn - b.turn
    || (a.settlement_id < b.settlement_id ? -1 : a.settlement_id > b.settlement_id ? 1 : 0));

let runMeta = null;
const runMetaPath = join(runDir, 'run_meta.json');
if (existsSync(runMetaPath)) { try { runMeta = readJson(runMetaPath); } catch { runMeta = null; } }

const geoPath = join(ROOT, 'data/derived/operational/operational_settlements.geojson');
const geo = readJson(geoPath);

// Sub-1km² cells are merged into a parent for scoring; a child renders with, and is
// scored under, its parent's control. Without this the map shows phantom holes.
let mergeMap = {};
const mergePath = join(ROOT, 'data/derived/operational/micro_osid_merge_map.json');
try { mergeMap = readJson(mergePath); } catch { mergeMap = {}; }

const painted = {};
const paintedMeta = {};
for (const { key } of CHECKPOINTS) {
    const p = join(ROOT, 'data/source/calibration', `painted_control_${key}.json`);
    const raw = readFileSync(p);
    const parsed = JSON.parse(raw.toString('utf8'));
    painted[key] = parsed.by_settlement_id;
    paintedMeta[key] = {
        sha256: sha256(raw).slice(0, 16),
        revision: parsed?.meta?.revision ?? null,
        painted_at: parsed?.meta?.painted_at ?? null,
        osids: Object.keys(parsed.by_settlement_id).length,
    };
}

// ---------------------------------------------------------------------------
// Replay + score
//
// Identical in form to verify_checkpoints.cjs stateAt(), so the numbers agree.

function stateAt(week) {
    const st = { ...init };
    for (const e of events) {
        if (e.turn > week) break;
        st[e.settlement_id] = e.to;
    }
    return st;
}

const maxEventTurn = events.length ? events[events.length - 1].turn : 0;
const declaredWeeks = Number(runMeta?.weeks ?? runMeta?.scenario?.weeks ?? 0) || 0;
const maxWeek = Math.max(declaredWeeks, maxEventTurn);

const scores = [];
for (const cp of CHECKPOINTS) {
    if (cp.week > maxWeek) {
        scores.push({ ...cp, reached: false, matched: null, total: Object.keys(painted[cp.key]).length, mismatches: [] });
        continue;
    }
    const st = stateAt(cp.week);
    const ref = painted[cp.key];
    const mismatches = [];
    let matched = 0;
    for (const osid of Object.keys(ref).sort()) {
        if (st[osid] === ref[osid]) matched += 1;
        else mismatches.push({ osid, sim: st[osid] ?? null, want: ref[osid] });
    }
    scores.push({ ...cp, reached: true, matched, total: Object.keys(ref).length, mismatches });
}

// ---------------------------------------------------------------------------
// Geometry → SVG paths (same projection as tools/build_calibration_map_html.mjs)

const features = [...(geo?.features ?? [])]
    .filter((f) => typeof f?.properties?.osid === 'string')
    .sort((a, b) => (a.properties.osid < b.properties.osid ? -1 : a.properties.osid > b.properties.osid ? 1 : 0));

let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
const depthFor = (t) => (t === 'Polygon' ? 2 : t === 'MultiPolygon' ? 3 : 1);
function visitCoords(coords, depth) {
    if (depth === 0) {
        const [x, y] = coords;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
        return;
    }
    for (const c of coords) visitCoords(c, depth - 1);
}
for (const f of features) visitCoords(f.geometry.coordinates, depthFor(f.geometry.type));

const WIDTH = 1600, HEIGHT = 1500, PAD = 0.02;
{
    const spanX = maxX - minX, spanY = maxY - minY;
    minX -= spanX * PAD; maxX += spanX * PAD;
    minY -= spanY * PAD; maxY += spanY * PAD;
}
const scale = Math.min(WIDTH / (maxX - minX), HEIGHT / (maxY - minY));
const offX = (WIDTH - (maxX - minX) * scale) / 2;
const offY = (HEIGHT - (maxY - minY) * scale) / 2;
const fmt = (v) => Number(v.toFixed(2)).toString();
const project = ([x, y]) => [fmt((x - minX) * scale + offX), fmt(HEIGHT - ((y - minY) * scale + offY))];
const ringPath = (ring) => ring.map((pt, i) => {
    const [x, y] = project(pt);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
}).join('') + 'Z';
const geometryPath = (g) => {
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    return polys.flatMap((poly) => poly.map(ringPath)).join('');
};

// --- Mismatch marker anchors -----------------------------------------------
// Each mismatched cell gets a circle naming the faction that SHOULD hold it, so
// the expected owner is readable without selecting the cell. The anchor must lie
// INSIDE the polygon: an area centroid falls outside a crescent-shaped or
// two-lobed municipality, which would park the circle on a neighbour and assert
// something false about that neighbour. So the centroid is tested, and when it
// lands outside it is replaced by the midpoint of the widest interior span at
// that height — always inside, and stable for a fixed ring.
// Computed here in projected SVG units; the client does no geometry maths.
const outerRingsOf = (g) => (g.type === 'Polygon' ? [g.coordinates] : g.coordinates)
    .map((poly) => poly[0]).filter((r) => Array.isArray(r) && r.length >= 4);
const projectRing = (ring) => ring.map((pt) => project(pt).map(Number));
function ringArea(r) {
    let a = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
    return a / 2;
}
function ringCentroid(r) {
    let cx = 0, cy = 0, a = 0;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
        a += f; cx += (r[j][0] + r[i][0]) * f; cy += (r[j][1] + r[i][1]) * f;
    }
    if (a === 0) return null;
    return [cx / (3 * a), cy / (3 * a)];
}
function pointInRing([px, py], r) {
    let inside = false;
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i], [xj, yj] = r[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
}
// Midpoint of the widest run of interior at height y: the x-crossings of the
// ring at y, paired off, longest pair wins.
function widestSpanMidpoint(r, y) {
    const xs = [];
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i], [xj, yj] = r[j];
        if ((yi > y) !== (yj > y)) xs.push(((xj - xi) * (y - yi)) / (yj - yi) + xi);
    }
    xs.sort((a, b) => a - b);
    let best = null, bestW = -1;
    for (let k = 0; k + 1 < xs.length; k += 2) {
        const w = xs[k + 1] - xs[k];
        if (w > bestW) { bestW = w; best = (xs[k] + xs[k + 1]) / 2; }
    }
    return best === null ? null : [best, y];
}
function representativePoint(r) {
    const c = ringCentroid(r);
    if (c && pointInRing(c, r)) return c;
    const ys = r.map((p) => p[1]);
    const mid = c ? c[1] : (Math.min(...ys) + Math.max(...ys)) / 2;
    return widestSpanMidpoint(r, mid) ?? c;
}

// One anchor per SCORED cell, taken from its largest outer ring. A scored cell
// may be drawn as several paths (merged sub-1km² children); the marker belongs
// to the parent that is actually scored, drawn once on its biggest body.
const bestRingByScored = new Map();
for (const f of features) {
    const scored = mergeMap[f.properties.osid] ?? f.properties.osid;
    for (const ring of outerRingsOf(f.geometry)) {
        const projected = projectRing(ring);
        const area = Math.abs(ringArea(projected));
        const current = bestRingByScored.get(scored);
        if (!current || area > current.area) bestRingByScored.set(scored, { area, ring: projected });
    }
}
const markers = {};
for (const scored of [...bestRingByScored.keys()].sort()) {
    const point = representativePoint(bestRingByScored.get(scored).ring);
    if (point) markers[scored] = [Number(point[0].toFixed(1)), Number(point[1].toFixed(1))];
}

const cells = features.map((f) => {
    const osid = f.properties.osid;
    const mergedInto = mergeMap[osid] ?? null;
    return {
        o: osid,
        s: mergedInto ?? osid,          // scored/controlled under the parent
        m: mergedInto ? 1 : 0,
        n: f.properties.settlement_name ?? '',
        u: f.properties.mun1990_name ?? f.properties.mun1990_id ?? '',
        d: geometryPath(f.geometry),
    };
});

// ---------------------------------------------------------------------------
// Emit

const provenance = {
    run_name: basename(runDir),
    run_id: runMeta?.run_id ?? null,
    run_fingerprint: runMeta?.run_id?.match(/__([a-f0-9]{16})__/i)?.[1] ?? sha256(readFileSync(savePath)).slice(0, 16),
    run_commit: runMeta?.git_commit ?? runMeta?.commit ?? runMeta?.provenance?.git_commit ?? null,
    run_dirty: runMeta?.git_dirty ?? runMeta?.provenance?.git_dirty ?? null,
    run_node: runMeta?.node_version ?? runMeta?.provenance?.node_version ?? null,
    scenario: runMeta?.scenario_id ?? runMeta?.scenario ?? null,
    weeks: maxWeek,
    events: events.length,
    generated: new Date().toISOString(),
    painted: paintedMeta,
    geojson_features: features.length,
    scored_osids: Object.keys(painted.oct1995).length,
};

const admissibility = [];
if (provenance.scenario !== MASTER_SCENARIO_ID) {
    admissibility.push(
        `NOT THE MASTER SCENARIO. This run is \`${provenance.scenario ?? 'unknown'}\`, not `
        + `\`${MASTER_SCENARIO_ID}\`. Canon is one definitive 188-week scenario with intermediate `
        + `checkpoints taken as snapshots of ITS runs, so these scores are development-loop `
        + `evidence only and are NOT adoptable as calibration figures.`
    );
    if (KNOWN_DRIFTED_SCENARIOS.has(String(provenance.scenario))) {
        admissibility.push(
            `\`${provenance.scenario}\` is a MEASURED-DRIFTED fork — missing `
            + `firepower_deficit_penalty_enabled and must_hold_osids_by_corps, and known to score `
            + `below the 188w line at the same week. Treat every number on this page as a fossil.`
        );
    }
}
if (provenance.run_dirty === true) admissibility.push('run metadata says git_dirty:true — inadmissible as a baseline');
if (provenance.run_node && !/^v?22\./.test(String(provenance.run_node))) {
    admissibility.push(`run metadata says Node ${provenance.run_node} — .nvmrc pins 22`);
}

const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const payload = (obj) => JSON.stringify(obj).replaceAll('<', '\\u003c');

const scoreRows = scores.map((s) => `<tr${s.reached ? '' : ' class="unreached"'}>
<td><button class="cp" data-week="${s.week}"${s.reached ? '' : ' disabled'}>${esc(s.label)}</button></td><td class="wk">w${s.week}</td>
<td class="num">${s.reached ? s.matched : '—'}</td><td class="den">/ ${s.total}</td>
<td class="num miss">${s.reached ? s.mismatches.length : '—'}</td></tr>`).join('');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="data:,">
<title>Control timeline — ${esc(provenance.scenario ?? 'run')}</title><style>
:root{--ink:#29261f;--dim:#70695d;--line:rgba(54,45,31,.18);--panel:rgba(255,255,255,.5);--amber:#c98e26}
*{box-sizing:border-box}html,body{margin:0;height:100%}
body{color:var(--ink);font:14px/1.5 Georgia,'Times New Roman',serif;background:linear-gradient(145deg,#e7dcc7,#f5eee2 68%,#ded2be)}
.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
/* minmax(0,1fr) on the row, not the default auto: an auto row is sized by its
   content and would let the map grow past the viewport instead of fitting it. */
.wrap{display:grid;grid-template-columns:minmax(0,1fr) 340px;grid-template-rows:minmax(0,1fr);gap:14px;height:100%;padding:12px}
.mapcol{display:flex;flex-direction:column;min-width:0;gap:8px}
.mapbox{position:relative;flex:1;min-height:0;background:#0a0e14;overflow:hidden;box-shadow:0 14px 40px rgba(42,34,22,.22)}
svg{width:100%;height:100%;display:block;touch-action:none;cursor:grab}
svg.dragging{cursor:grabbing}svg:focus-visible{outline:3px solid var(--amber);outline-offset:-3px}
.mapcontrols{position:absolute;z-index:4;top:8px;right:8px;display:flex;gap:4px;align-items:center;padding:4px;
background:rgba(8,12,17,.84);border:1px solid rgba(255,255,255,.2);border-radius:5px;color:#fff;font-family:ui-monospace,monospace}
.mapcontrols button{min-width:44px;min-height:44px;padding:4px 9px;border-color:rgba(255,255,255,.25);background:rgba(255,255,255,.12);color:#fff;font:700 18px/1 ui-monospace,monospace}
.mapcontrols button:hover{background:rgba(255,255,255,.24)}.mapcontrols button:disabled{opacity:.4}
.mapcontrols .reset{font-size:12px}.zoomlevel{min-width:48px;text-align:center;font-size:11px}
.cell{stroke:#0a0e14;stroke-width:.6;cursor:pointer}
.cell.mismatch{stroke:var(--amber);stroke-width:3;vector-effect:non-scaling-stroke}
.hide-mismatch .cell.mismatch{stroke:#0a0e14;stroke-width:.6;vector-effect:none}
.cell.sel{stroke:#fff;stroke-width:3;vector-effect:non-scaling-stroke;filter:drop-shadow(0 0 3px #fff)}
.cell.mismatch.sel{stroke:var(--amber);stroke-width:5;filter:drop-shadow(0 0 3px #fff)}
.hide-mismatch .cell.mismatch.sel{stroke:#fff;stroke-width:3;vector-effect:non-scaling-stroke}
/* Expected-owner markers. pointer-events:none so a circle never steals the click
   from the cell under it — the polygon stays the click target it always was. */
#markers{pointer-events:none}
.hide-mismatch #markers{display:none}
.mk circle{stroke:var(--amber);stroke-width:2;vector-effect:non-scaling-stroke}
/* No font-size here on purpose: it is set per-render in user units so the label
   holds a constant on-screen size. A CSS font shorthand would override it. */
.mk text{fill:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:700;
text-anchor:middle;dominant-baseline:central;paint-order:stroke;stroke:rgba(8,12,17,.55);stroke-width:2.5px}
.marker-key{display:inline-block;width:13px;height:13px;margin-right:5px;vertical-align:-2px;border-radius:50%;
border:2px solid var(--amber);background:${FACTION_COLOR.RS}}
.bar{display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--panel);border:1px solid var(--line)}
input[type=range]{flex:1;min-width:0}
button,input[type=search]{font:inherit;border:1px solid var(--line);background:rgba(255,255,255,.6);color:inherit}
button{min-height:44px;padding:7px 10px;cursor:pointer}button:disabled{cursor:not-allowed;opacity:.45}
button:hover{background:#fff}
.side{display:flex;flex-direction:column;gap:10px;overflow:auto;min-height:0}
.panel{background:var(--panel);border:1px solid var(--line);padding:10px}
h2{font:600 11px/1 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);margin:0 0 8px}
table{width:100%;border-collapse:collapse;font-family:ui-monospace,monospace;font-size:12px}
td{padding:2px 3px}.num{text-align:right;font-weight:700}.den,.wk{color:var(--dim)}
.miss{color:#b03636}tr.unreached{opacity:.42}
tr.active td{background:rgba(201,142,38,.22)}
.cp{width:100%;min-height:40px;padding:4px 3px;border:0;background:transparent;text-align:left;text-decoration:underline dotted}
.legend{display:flex;flex-wrap:wrap;gap:4px 12px;font-family:ui-monospace,monospace;font-size:11px}
.legend i{display:inline-block;width:9px;height:9px;margin-right:4px;vertical-align:baseline}
.mismatch-key{display:inline-block;width:12px;height:12px;margin-right:5px;vertical-align:-2px;border:3px solid var(--amber);background:transparent}
.toggle{display:flex;align-items:center;min-height:44px;cursor:pointer}.toggle input{width:20px;height:20px;margin:0 7px 0 0}
.list{max-height:230px;overflow:auto;font-family:ui-monospace,monospace;font-size:11px;line-height:1.55}
.list div{cursor:pointer;padding:1px 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.list div:hover{background:rgba(201,142,38,.22)}
.flip{cursor:pointer;padding:1px 2px;font-family:ui-monospace,monospace;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.flip:hover{background:rgba(0,0,0,.07)}
.warn{border-left:3px solid #b03636;padding-left:8px;color:#b03636;font-size:12px}
.note{color:var(--dim);font-size:11.5px;line-height:1.45}
.prov{font-family:ui-monospace,monospace;font-size:10.5px;color:var(--dim);line-height:1.5;word-break:break-all}
.runid{margin:0;font-family:ui-monospace,monospace;font-size:11px;overflow-wrap:anywhere}
.search-label{display:block;margin-bottom:5px;color:var(--dim);font-size:12px}.search{width:100%;min-height:44px;padding:8px 10px}
.search-results{display:grid;gap:3px;max-height:220px;overflow:auto;margin-top:5px}.search-results button{text-align:left;line-height:1.25}
.detail{margin-top:10px;padding-top:9px;border-top:1px solid var(--line)}.detail-name{font-weight:700}.detail-row{margin-top:3px;font-family:ui-monospace,monospace;font-size:11.5px}
.tip{position:absolute;display:none;pointer-events:none;z-index:5;padding:8px 10px;background:rgba(8,12,17,.95);color:#fff;border-radius:5px;
font-family:ui-monospace,monospace;font-size:11.5px;line-height:1.45;max-width:290px}
.tip[data-open=true]{display:block}
@media(max-width:1000px){.wrap{grid-template-columns:minmax(0,1fr);height:auto}.mapbox{height:62vh}.side{overflow:visible}
/* Below this width the map is too small for a legible two-letter label. The
   amber-ringed colour dot still names the expected owner against the legend. */
.mk text{display:none}}
@media(max-width:480px){.wrap{padding:6px;gap:8px}.timelinebar{display:grid;grid-template-columns:1fr 1fr}.timelinebar input{grid-column:1/-1;grid-row:1;min-height:44px}.timelinebar #prev{grid-column:1}.timelinebar #next{grid-column:2}.timelinebar #weeklabel{grid-column:1/-1;text-align:center}.mapbox{height:55vh}.bar{padding:6px;gap:6px}.legend{gap:2px 10px}.panel{padding:9px}}
@media(prefers-color-scheme:dark){:root{--ink:#eee5d6;--dim:#aaa092;--line:rgba(255,255,255,.14);--panel:rgba(255,255,255,.05)}
body{background:linear-gradient(145deg,#17140f,#211d17 68%,#15120e)}button,input[type=search]{background:rgba(255,255,255,.08);color:inherit}button:hover{background:rgba(255,255,255,.16)}}
</style></head><body>
<div class="wrap">
<div class="mapcol">
  <div class="bar timelinebar">
    <button id="prev" title="Previous week with a flip">◀ flip</button>
    <input type="range" id="week" min="0" max="${maxWeek}" value="${maxWeek}" step="1">
    <button id="next" title="Next week with a flip">flip ▶</button>
    <strong class="mono" id="weeklabel"></strong>
  </div>
  <div class="mapbox">
    <svg id="map" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMid meet" tabindex="0" role="img" aria-label="Control map. Use plus and minus to zoom, or drag to pan."></svg>
    <div class="mapcontrols" aria-label="Map zoom controls">
      <button id="zoomout" type="button" aria-label="Zoom out" title="Zoom out">−</button>
      <span id="zoomlevel" class="zoomlevel" aria-live="polite">100%</span>
      <button id="zoomin" type="button" aria-label="Zoom in" title="Zoom in">+</button>
      <button id="zoomreset" class="reset" type="button" aria-label="Reset map view" title="Reset map view">Reset</button>
    </div>
    <div class="tip" id="tip"></div>
  </div>
  <div class="bar legend">
    <span><i style="background:${FACTION_COLOR.RBiH}"></i>RBiH</span>
    <span><i style="background:${FACTION_COLOR.RS}"></i>RS</span>
    <span><i style="background:${FACTION_COLOR.HRHB}"></i>HRHB</span>
    <label class="toggle"><input id="showmismatch" type="checkbox" checked><span class="mismatch-key"></span><span class="marker-key"></span>Show mismatches (checkpoints only)</label>
    <span style="opacity:.7">Fill always means actual controller. An amber outline marks a mismatch, and its circle is the faction that <em>should</em> hold the cell — the circle is painted historical truth, never simulated control. Merged sub-1km² cells draw with their parent, so outlined polygons can exceed the scored mismatch count — the panel number is the score.</span>
  </div>
</div>
<div class="side">
  <div class="panel">
    <h2>Source run</h2>
    <p class="runid">${esc(provenance.run_name)} · ${esc(provenance.run_fingerprint)}</p>
  </div>
  <div class="panel">
    <h2>Settlement selection</h2>
    <label class="search-label" for="settlement-search">Search by settlement, municipality, or OSID</label>
    <input class="search" id="settlement-search" type="search" autocomplete="off" placeholder="Type a name or OSID">
    <div class="search-results" id="search-results" role="listbox"></div>
    <div class="detail" id="selection-detail" aria-live="polite"></div>
  </div>
  <div class="panel">
    <h2>Checkpoint scores</h2>
    <table><tbody id="scores">${scoreRows}</tbody></table>
    <p class="note" style="margin:8px 0 0">Replayed against the painted files on disk now, not the run's recorded <span class="mono">historical_fit</span>. Click a checkpoint to jump.</p>
  </div>
  <div class="panel">
    <h2>Mismatches <span id="mmwhen" class="mono" style="text-transform:none;letter-spacing:0"></span></h2>
    <div id="mmnote" class="note"></div>
    <div class="list" id="mmlist"></div>
  </div>
  <div class="panel">
    <h2>Flips this week</h2>
    <div class="legend" style="margin-bottom:6px">${Object.entries(MECHANISM_COLOR).map(([k, v]) => `<span><i style="background:${v}"></i>${k}</span>`).join('')}</div>
    <div class="list" id="fliplist"></div>
  </div>
  <div class="panel">
    <h2>Provenance</h2>${admissibility.length ? `
    <p class="warn">${admissibility.map(esc).join('<br>')}</p>` : ''}
    <div class="prov" id="prov"></div>
  </div>
</div>
</div>
<script>
const CELLS=${payload(cells)};
const INIT=${payload(init)};
const EVENTS=${payload(events.map((e) => ({ t: e.turn, o: e.settlement_id, f: e.from, x: e.to, m: e.mechanism })))};
const PAINTED=${payload(painted)};
const SCORES=${payload(scores.map((s) => ({ key: s.key, week: s.week, label: s.label, reached: s.reached, matched: s.matched, total: s.total, mismatches: s.mismatches })))};
const PROV=${payload(provenance)};
const FCOLOR=${payload(FACTION_COLOR)};
const MCOLOR=${payload(MECHANISM_COLOR)};
const MARKERS=${payload(markers)};
const FSHORT=${payload(FACTION_SHORT)};
const MAXWEEK=${maxWeek};

const svg=document.getElementById('map'),tip=document.getElementById('tip');
const NS='http://www.w3.org/2000/svg';
const nodes=new Map();          // osid -> <path>
const byScored=new Map();       // scored osid -> [<path>...]
const frag=document.createDocumentFragment();
for(const c of CELLS){
  const p=document.createElementNS(NS,'path');
  p.setAttribute('d',c.d);p.setAttribute('class','cell');p.dataset.o=c.o;p.dataset.s=c.s;
  nodes.set(c.o,p);
  if(!byScored.has(c.s))byScored.set(c.s,[]);
  byScored.get(c.s).push(p);
  frag.appendChild(p);
}
svg.appendChild(frag);
// Markers ride above every cell, so a circle is never buried under a neighbour
// drawn later. Appended after the cell fragment for that reason.
const markerLayer=document.createElementNS(NS,'g');
markerLayer.setAttribute('id','markers');
svg.appendChild(markerLayer);

// Marker size is specified in SCREEN pixels and converted to user units per
// render. A fixed user-unit radius measured correct in the payload and rendered
// as a 2px sliver of fill inside a 6px amber ring: the faction colour, which is
// the whole point of the marker, was invisible. Constant screen size also keeps
// the circles usable as the map is resized.
const MK_R=10,MK_FONT=11;
function mapScale(){
  const box=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;
  if(!box.width||!box.height||!vb.width||!vb.height)return 1;
  return Math.min(box.width/vb.width,box.height/vb.height)||1;
}
function sizeMarkers(){
  const s=mapScale(),r=(MK_R/s).toFixed(1),f=(MK_FONT/s).toFixed(1);
  for(const c of markerLayer.querySelectorAll('circle'))c.setAttribute('r',r);
  for(const t of markerLayer.querySelectorAll('text'))t.setAttribute('font-size',f);
}
addEventListener('resize',sizeMarkers);

// Bounded viewBox camera. It changes only the viewport: paths, replay state and
// reference data remain untouched. Pointer math accounts for the letterboxing
// introduced by preserveAspectRatio="xMidYMid meet".
const BASE_VIEW={x:0,y:0,w:${WIDTH},h:${HEIGHT}},MIN_ZOOM=1,MAX_ZOOM=12;
let camera={...BASE_VIEW,zoom:1};
const zoomIn=document.getElementById('zoomin'),zoomOut=document.getElementById('zoomout');
const zoomReset=document.getElementById('zoomreset'),zoomLevel=document.getElementById('zoomlevel');
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function constrainedCamera(next){
  const zoom=clamp(next.zoom,MIN_ZOOM,MAX_ZOOM),w=BASE_VIEW.w/zoom,h=BASE_VIEW.h/zoom;
  return {zoom,w,h,x:clamp(next.x,BASE_VIEW.x,BASE_VIEW.x+BASE_VIEW.w-w),y:clamp(next.y,BASE_VIEW.y,BASE_VIEW.y+BASE_VIEW.h-h)};
}
function applyCamera(next){
  camera=constrainedCamera(next);
  svg.setAttribute('viewBox',camera.x+' '+camera.y+' '+camera.w+' '+camera.h);
  zoomLevel.textContent=Math.round(camera.zoom*100)+'%';
  zoomIn.disabled=camera.zoom>=MAX_ZOOM-.001;
  zoomOut.disabled=camera.zoom<=MIN_ZOOM+.001;
  zoomReset.disabled=camera.zoom<=MIN_ZOOM+.001;
  sizeMarkers();
}
function viewportMetrics(cam=camera){
  const box=svg.getBoundingClientRect(),scale=Math.min(box.width/cam.w,box.height/cam.h)||1;
  return {box,scale,offsetX:(box.width-cam.w*scale)/2,offsetY:(box.height-cam.h*scale)/2};
}
function clientToMap(clientX,clientY,cam=camera){
  const m=viewportMetrics(cam);
  return {x:cam.x+(clientX-m.box.left-m.offsetX)/m.scale,y:cam.y+(clientY-m.box.top-m.offsetY)/m.scale};
}
function zoomAt(nextZoom,clientX,clientY,anchor=clientToMap(clientX,clientY)){
  const zoom=clamp(nextZoom,MIN_ZOOM,MAX_ZOOM),w=BASE_VIEW.w/zoom,h=BASE_VIEW.h/zoom;
  const box=svg.getBoundingClientRect(),scale=Math.min(box.width/w,box.height/h)||1;
  const offsetX=(box.width-w*scale)/2,offsetY=(box.height-h*scale)/2;
  applyCamera({zoom,w,h,x:anchor.x-(clientX-box.left-offsetX)/scale,y:anchor.y-(clientY-box.top-offsetY)/scale});
}
function zoomFromCenter(factor){
  const box=svg.getBoundingClientRect();
  zoomAt(camera.zoom*factor,box.left+box.width/2,box.top+box.height/2);
}
zoomIn.addEventListener('click',()=>zoomFromCenter(1.5));
zoomOut.addEventListener('click',()=>zoomFromCenter(1/1.5));
zoomReset.addEventListener('click',()=>applyCamera({...BASE_VIEW,zoom:1}));
svg.addEventListener('wheel',e=>{
  e.preventDefault();tip.dataset.open='false';
  const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?svg.clientHeight:1);
  zoomAt(camera.zoom*Math.exp(-delta*.002),e.clientX,e.clientY);
},{passive:false});
svg.addEventListener('keydown',e=>{
  if(e.key==='+'||e.key==='='){e.preventDefault();zoomFromCenter(1.5)}
  else if(e.key==='-'){e.preventDefault();zoomFromCenter(1/1.5)}
  else if(e.key==='0'){e.preventDefault();applyCamera({...BASE_VIEW,zoom:1})}
});
applyCamera(camera);

const activePointers=new Map();
let gesture=null,gestureHadMovement=false,suppressClickUntil=0;
const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function beginSingle(pointer){gesture={kind:'pan',start:pointer,startCamera:{...camera},moved:false,tapOsid:gestureHadMovement?null:pointer.osid}}
function beginPinch(){
  const [a,b]=[...activePointers.values()],mid=midpoint(a,b);
  gesture={kind:'pinch',startDistance:Math.max(1,distance(a,b)),startCamera:{...camera},anchor:clientToMap(mid.x,mid.y),moved:true};
  gestureHadMovement=true;
  tip.dataset.open='false';
}
svg.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  if(activePointers.size===0)gestureHadMovement=false;
  activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY,osid:e.target.closest('.cell')?.dataset.s||null});
  svg.setPointerCapture(e.pointerId);svg.classList.add('dragging');
  if(activePointers.size===1)beginSingle(activePointers.get(e.pointerId));
  else if(activePointers.size===2)beginPinch();
});
svg.addEventListener('pointermove',e=>{
  if(!activePointers.has(e.pointerId))return;
  activePointers.set(e.pointerId,{...activePointers.get(e.pointerId),x:e.clientX,y:e.clientY});
  if(activePointers.size>=2){
    if(gesture?.kind!=='pinch')beginPinch();
    const [a,b]=[...activePointers.values()],mid=midpoint(a,b);
    zoomAt(gesture.startCamera.zoom*distance(a,b)/gesture.startDistance,mid.x,mid.y,gesture.anchor);
    return;
  }
  if(gesture?.kind!=='pan')beginSingle(activePointers.get(e.pointerId));
  const pointer=activePointers.get(e.pointerId),dx=pointer.x-gesture.start.x,dy=pointer.y-gesture.start.y;
  if(Math.hypot(dx,dy)>4){gesture.moved=true;gestureHadMovement=true;tip.dataset.open='false'}
  if(gesture.moved){
    const scale=viewportMetrics(gesture.startCamera).scale;
    applyCamera({...gesture.startCamera,x:gesture.startCamera.x-dx/scale,y:gesture.startCamera.y-dy/scale});
  }
});
function endPointer(e){
  if(!activePointers.has(e.pointerId))return;
  const tapOsid=e.type==='pointerup'&&!gestureHadMovement&&gesture?.tapOsid;
  activePointers.delete(e.pointerId);
  if(activePointers.size===1)beginSingle([...activePointers.values()][0]);
  else if(activePointers.size===0){
    if(gestureHadMovement)suppressClickUntil=performance.now()+350;
    else if(tapOsid)highlight(tapOsid);
    gesture=null;gestureHadMovement=false;svg.classList.remove('dragging');
  }
  else beginPinch();
}
svg.addEventListener('pointerup',endPointer);
svg.addEventListener('pointercancel',endPointer);
const META=new Map(CELLS.map(c=>[c.o,c]));

// Weeks that actually contain a flip — the map is static between them, so the
// arrows step through events rather than through empty weeks.
const flipWeeks=[...new Set(EVENTS.map(e=>e.t))].sort((a,b)=>a-b);
const CPBYWEEK=new Map(SCORES.map(s=>[s.week,s]));

// Names and ids come from repo data files, not from a user, but they still reach
// innerHTML — escape rather than trust, so one odd character cannot break the page.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function stateAt(w){const st=Object.assign({},INIT);for(const e of EVENTS){if(e.t>w)break;st[e.o]=e.x}return st}

const SCORED_META=new Map();
for(const c of CELLS)if(!SCORED_META.has(c.s)||c.o===c.s)SCORED_META.set(c.s,c);
const SEARCHABLE=[...SCORED_META.entries()].map(([osid,c])=>({osid,n:c.n||'',u:c.u||''}))
  .sort((a,b)=>(a.n||a.osid).localeCompare(b.n||b.osid)||a.osid.localeCompare(b.osid));
let week=MAXWEEK,selected=SEARCHABLE[0]?.osid||null;
function renderSelection(st,cp){
  const box=document.getElementById('selection-detail');
  if(!selected){box.innerHTML='<div class="note">Choose a settlement from search, the map, a mismatch, or a flip.</div>';return}
  const c=SCORED_META.get(selected),controller=st[selected]||'—';
  const hasReference=Boolean(cp&&cp.reached&&Object.prototype.hasOwnProperty.call(PAINTED[cp.key],selected));
  const historical=hasReference?PAINTED[cp.key][selected]:null;
  const last=[...EVENTS].reverse().find(e=>e.o===selected&&e.t<=week);
  box.innerHTML='<div class="detail-name">'+esc(c?.n||selected)+'</div>'
    +(c?.u?'<div class="note">'+esc(c.u)+'</div>':'')
    +'<div class="detail-row">OSID: '+esc(selected)+'</div>'
    +'<div class="detail-row">Controller: <strong>'+esc(controller)+'</strong></div>'
    +'<div class="detail-row">Historical owner: '+(hasReference?'<strong>'+esc(historical)+'</strong>':'no reference at week '+esc(week))+'</div>'
    +'<div class="detail-row">Last change week: '+(last?'week '+esc(last.t):'none (initial control)')+'</div>';
}
function render(){
  const st=stateAt(week);
  for(const [osid,p] of nodes){
    const f=st[META.get(osid).s];
    p.setAttribute('fill',FCOLOR[f]||'#3a3f47');
    p.classList.remove('mismatch');
  }
  const cp=CPBYWEEK.get(week);
  const mmlist=document.getElementById('mmlist'),mmnote=document.getElementById('mmnote'),mmwhen=document.getElementById('mmwhen');
  markerLayer.textContent='';
  if(cp&&cp.reached){
    for(const m of cp.mismatches){const arr=byScored.get(m.osid);if(arr)for(const p of arr)p.classList.add('mismatch')}
    // One circle per MISMATCH, not per drawn polygon: merged children share the
    // parent's anchor, so a scored cell is named once rather than once per lobe.
    const mfrag=document.createDocumentFragment();
    for(const m of cp.mismatches){
      const pt=MARKERS[m.osid];if(!pt)continue;
      const g=document.createElementNS(NS,'g');g.setAttribute('class','mk');
      const ci=document.createElementNS(NS,'circle');
      ci.setAttribute('cx',pt[0]);ci.setAttribute('cy',pt[1]);
      ci.setAttribute('fill',FCOLOR[m.want]||'#3a3f47');
      g.appendChild(ci);
      const tx=document.createElementNS(NS,'text');
      tx.setAttribute('x',pt[0]);tx.setAttribute('y',pt[1]);
      tx.textContent=FSHORT[m.want]||'?';
      g.appendChild(tx);
      const ttl=document.createElementNS(NS,'title');
      ttl.textContent=(META.get(m.osid)?.n||m.osid)+' — should be '+(m.want||'—')+', is '+(m.sim||'—');
      g.appendChild(ttl);
      mfrag.appendChild(g);
    }
    markerLayer.appendChild(mfrag);
    sizeMarkers();
    mmwhen.textContent='· '+cp.label+' (w'+cp.week+')';
    mmnote.textContent=cp.mismatches.length+' of '+cp.total+' OSIDs differ from painted control.';
    mmlist.innerHTML=cp.mismatches.map(m=>'<div data-o="'+esc(m.osid)+'">'+esc(m.osid)+' — controller '+esc(m.sim||'—')+' · historical '+esc(m.want)+'</div>').join('');
  }else{
    mmwhen.textContent='';
    // Deliberate: painted truth exists at four weeks only. Comparing any other week
    // against an era snapshot would invent mismatches that are just unfought war.
    mmnote.innerHTML='No painted reference at week '+week+'. Historical truth exists only at w39, w104, w156 and w188 — mismatch is undefined here, so none is shown.';
    mmlist.innerHTML='';
  }
  document.querySelectorAll('#scores tr').forEach(tr=>tr.classList.remove('active'));
  const idx=SCORES.findIndex(s=>s.week===week);
  if(idx>=0)document.querySelectorAll('#scores tr')[idx].classList.add('active');

  const fl=EVENTS.filter(e=>e.t===week);
  document.getElementById('fliplist').innerHTML=fl.length
    ?fl.map(e=>'<div class="flip" data-o="'+esc(e.o)+'"><span style="color:'+(MCOLOR[e.m]||'#888')+'">■</span> '+esc(e.o)+' — '+esc(e.f||'—')+' → '+esc(e.x||'—')+' <span style="opacity:.65">('+esc(e.m)+')</span></div>').join('')
    :'<div class="note">No control changes this week.</div>';
  document.getElementById('weeklabel').textContent='week '+week+(cp?' · '+cp.label:'');
  if(selected)highlight(selected);else renderSelection(st,cp);
}
function highlight(osid){
  document.querySelectorAll('.cell.sel').forEach(p=>p.classList.remove('sel'));
  const arr=byScored.get(osid)||(nodes.has(osid)?[nodes.get(osid)]:[]);
  for(const p of arr)p.classList.add('sel');
  selected=osid;
  renderSelection(stateAt(week),CPBYWEEK.get(week));
}
const slider=document.getElementById('week');
slider.addEventListener('input',()=>{week=Number(slider.value);render()});
document.getElementById('prev').onclick=()=>{const c=[...flipWeeks].reverse().find(w=>w<week);if(c!==undefined){week=c;slider.value=week;render()}};
document.getElementById('next').onclick=()=>{const c=flipWeeks.find(w=>w>week);if(c!==undefined){week=c;slider.value=week;render()}};
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,button'))return;
  if(e.key==='ArrowLeft'&&week>0){week-=1;slider.value=week;render()}
  if(e.key==='ArrowRight'&&week<MAXWEEK){week+=1;slider.value=week;render()}
});
document.getElementById('scores').addEventListener('click',e=>{
  const control=e.target.closest('button.cp');if(!control)return;
  week=Number(control.dataset.week);slider.value=week;render();
});
for(const id of ['mmlist','fliplist'])document.getElementById(id).addEventListener('click',e=>{
  const el=e.target.closest('[data-o]');if(!el)return;highlight(el.dataset.o);
});
svg.addEventListener('mousemove',e=>{
  if(activePointers.size){tip.dataset.open='false';return}
  const p=e.target.closest('.cell');
  if(!p){tip.dataset.open='false';return}
  const c=META.get(p.dataset.o),st=stateAt(week),cp=CPBYWEEK.get(week);
  const sim=st[c.s]||'—';
  let painted='—',verdict='not compared at this week';
  if(cp&&cp.reached){const want=PAINTED[cp.key][c.s];if(want!==undefined){painted=want;verdict=(want===sim)?'correct':'MISMATCH'}}
  tip.innerHTML='<strong>'+esc(c.o)+'</strong><br>'+esc([c.n,c.u].filter(Boolean).join(' · '))
    +'<br>sim: '+esc(sim)+'<br>painted: '+esc(painted)+'<br>'+esc(verdict)
    +(c.m?'<br><span style="opacity:.7">merged into '+esc(c.s)+' — control shown is that cell\\'s</span>':'');
  tip.dataset.open='true';
  const r=svg.getBoundingClientRect();
  let x=e.clientX-r.left+14,y=e.clientY-r.top+14;
  const b=tip.getBoundingClientRect();
  if(x+b.width>r.width)x=Math.max(4,e.clientX-r.left-b.width-14);
  if(y+b.height>r.height)y=Math.max(4,e.clientY-r.top-b.height-14);
  tip.style.left=x+'px';tip.style.top=y+'px';
});
svg.addEventListener('mouseleave',()=>{tip.dataset.open='false'});
svg.addEventListener('click',e=>{
  if(activePointers.size||performance.now()<suppressClickUntil){e.preventDefault();return}
  const p=e.target.closest('.cell');if(p)highlight(p.dataset.s);
});

document.getElementById('showmismatch').addEventListener('change',e=>{
  document.body.classList.toggle('hide-mismatch',!e.target.checked);
});
const search=document.getElementById('settlement-search'),searchResults=document.getElementById('search-results');
function renderSearchResults(){
  const q=search.value.trim().toLocaleLowerCase();
  if(!q){searchResults.innerHTML='';return}
  const hits=SEARCHABLE.filter(c=>(c.n+' '+c.u+' '+c.osid).toLocaleLowerCase().includes(q)).slice(0,12);
  searchResults.innerHTML=hits.length?hits.map(c=>'<button type="button" role="option" data-o="'+esc(c.osid)+'">'+esc(c.n||c.osid)+(c.u?' · '+esc(c.u):'')+'<br><span class="note">'+esc(c.osid)+'</span></button>').join(''):'<div class="note">No matching settlement.</div>';
}
search.addEventListener('input',renderSearchResults);
search.addEventListener('keydown',e=>{if(e.key==='Enter'){const first=searchResults.querySelector('[data-o]');if(first){e.preventDefault();highlight(first.dataset.o)}}});
searchResults.addEventListener('click',e=>{const choice=e.target.closest('[data-o]');if(choice)highlight(choice.dataset.o)});

document.getElementById('prov').innerHTML=[
  'run: '+esc(PROV.run_name),
  'run id: '+esc(PROV.run_id||'—')+' · fingerprint '+esc(PROV.run_fingerprint),
  'scenario: '+esc(PROV.scenario||'—')+' · weeks '+esc(PROV.weeks)+' · '+esc(PROV.events)+' flips',
  'run commit: '+esc(PROV.run_commit||'—')+(PROV.run_dirty===true?' (DIRTY)':'')+' · node '+esc(PROV.run_node||'—'),
  'geojson: '+esc(PROV.geojson_features)+' drawn / '+esc(PROV.scored_osids)+' scored',
  'painted: '+Object.entries(PROV.painted).map(([k,v])=>esc(k)+' r'+esc(v.revision??'?')+' '+esc(v.sha256)).join('<br>&nbsp;&nbsp;'),
  'generated: '+esc(PROV.generated),
].join('<br>');
render();
</script></body></html>`;

const outPath = outArg ? resolve(outArg) : join(runDir, 'control_timeline.html');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html, 'utf8');

// ---------------------------------------------------------------------------
// stdout summary — the same numbers the page shows, so CI/logs can read them.

console.log(`run       ${runDir}`);
console.log(`weeks     ${maxWeek}   flips ${events.length}   drawn ${features.length}   scored ${Object.keys(painted.oct1995).length}`);
if (admissibility.length) for (const a of admissibility) console.log(`WARNING   ${a}`);
console.log('');
console.log('CHECKPOINT SCORES  (replayed against the painted files on disk now)');
for (const s of scores) {
    if (!s.reached) { console.log(`  ${s.key.padEnd(9)} w${String(s.week).padEnd(4)} not reached by this run`); continue; }
    console.log(`  ${s.key.padEnd(9)} w${String(s.week).padEnd(4)} ${String(s.matched).padStart(3)} / ${s.total}   ${s.mismatches.length} mismatched`);
}
console.log('');
console.log(`wrote ${outPath}`);
