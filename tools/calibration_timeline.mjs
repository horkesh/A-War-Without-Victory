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
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The only weeks at which painted historical truth exists. */
const CHECKPOINTS = [
    { key: 'jan1993', week: 39, label: 'January 1993' },
    { key: 'apr1994', week: 104, label: 'April 1994' },
    { key: 'apr1995', week: 156, label: 'April 1995' },
    { key: 'oct1995', week: 188, label: 'October 1995' },
];

const FACTION_COLOR = { RBiH: '#4a7c54', RS: '#b03636', HRHB: '#486ebe' };
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
 * Newest run directory that actually holds a final_save.json.
 *
 * A partial or interrupted run leaves a directory with no final save; picking it
 * would fail confusingly, so incomplete directories are skipped rather than
 * treated as the answer.
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
        candidates.push({ dir, mtime: statSync(save).mtimeMs });
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.mtime - a.mtime || (a.dir < b.dir ? 1 : -1));
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
    run_dir: runDir.replace(/\\/g, '/'),
    run_commit: runMeta?.git_commit ?? runMeta?.commit ?? null,
    run_dirty: runMeta?.git_dirty ?? null,
    run_node: runMeta?.node_version ?? null,
    scenario: runMeta?.scenario_id ?? runMeta?.scenario ?? null,
    weeks: maxWeek,
    events: events.length,
    generated: new Date().toISOString(),
    painted: paintedMeta,
    geojson_features: features.length,
    scored_osids: Object.keys(painted.oct1995).length,
};

const admissibility = [];
if (provenance.run_dirty === true) admissibility.push('run metadata says git_dirty:true — inadmissible as a baseline');
if (provenance.run_node && !/^v?22\./.test(String(provenance.run_node))) {
    admissibility.push(`run metadata says Node ${provenance.run_node} — .nvmrc pins 22`);
}

const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const payload = (obj) => JSON.stringify(obj).replaceAll('<', '\\u003c');

const scoreRows = scores.map((s) => `<tr${s.reached ? '' : ' class="unreached"'}>
<td class="cp" data-week="${s.week}">${esc(s.label)}</td><td class="wk">w${s.week}</td>
<td class="num">${s.reached ? s.matched : '—'}</td><td class="den">/ ${s.total}</td>
<td class="num miss">${s.reached ? s.mismatches.length : '—'}</td></tr>`).join('');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
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
svg{width:100%;height:100%;display:block}
.cell{stroke:#0a0e14;stroke-width:.6;cursor:pointer}
.cell.sel{stroke:#fff;stroke-width:2.4}
.mismatch{fill:var(--amber)!important}
.bar{display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--panel);border:1px solid var(--line)}
input[type=range]{flex:1;min-width:0}
button{font:inherit;padding:4px 10px;border:1px solid var(--line);background:rgba(255,255,255,.6);cursor:pointer}
button:hover{background:#fff}
.side{display:flex;flex-direction:column;gap:10px;overflow:auto;min-height:0}
.panel{background:var(--panel);border:1px solid var(--line);padding:10px}
h2{font:600 11px/1 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);margin:0 0 8px}
table{width:100%;border-collapse:collapse;font-family:ui-monospace,monospace;font-size:12px}
td{padding:2px 3px}.num{text-align:right;font-weight:700}.den,.wk{color:var(--dim)}
.miss{color:#b03636}tr.unreached{opacity:.42}
tr.active td{background:rgba(201,142,38,.22)}
td.cp{cursor:pointer;text-decoration:underline dotted}
.legend{display:flex;flex-wrap:wrap;gap:4px 12px;font-family:ui-monospace,monospace;font-size:11px}
.legend i{display:inline-block;width:9px;height:9px;margin-right:4px;vertical-align:baseline}
.list{max-height:230px;overflow:auto;font-family:ui-monospace,monospace;font-size:11px;line-height:1.55}
.list div{cursor:pointer;padding:1px 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.list div:hover{background:rgba(201,142,38,.22)}
.flip{cursor:pointer;padding:1px 2px;font-family:ui-monospace,monospace;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.flip:hover{background:rgba(0,0,0,.07)}
.warn{border-left:3px solid #b03636;padding-left:8px;color:#b03636;font-size:12px}
.note{color:var(--dim);font-size:11.5px;line-height:1.45}
.prov{font-family:ui-monospace,monospace;font-size:10.5px;color:var(--dim);line-height:1.5;word-break:break-all}
.tip{position:absolute;display:none;pointer-events:none;z-index:5;padding:8px 10px;background:rgba(8,12,17,.95);color:#fff;border-radius:5px;
font-family:ui-monospace,monospace;font-size:11.5px;line-height:1.45;max-width:290px}
.tip[data-open=true]{display:block}
@media(max-width:1000px){.wrap{grid-template-columns:1fr;height:auto}.mapbox{height:62vh}}
@media(prefers-color-scheme:dark){:root{--ink:#eee5d6;--dim:#aaa092;--line:rgba(255,255,255,.14);--panel:rgba(255,255,255,.05)}
body{background:linear-gradient(145deg,#17140f,#211d17 68%,#15120e)}button{background:rgba(255,255,255,.08);color:inherit}button:hover{background:rgba(255,255,255,.16)}}
</style></head><body>
<div class="wrap">
<div class="mapcol">
  <div class="bar">
    <button id="prev" title="Previous week with a flip">◀ flip</button>
    <input type="range" id="week" min="0" max="${maxWeek}" value="${maxWeek}" step="1">
    <button id="next" title="Next week with a flip">flip ▶</button>
    <strong class="mono" id="weeklabel"></strong>
  </div>
  <div class="mapbox">
    <svg id="map" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMid meet"></svg>
    <div class="tip" id="tip"></div>
  </div>
  <div class="bar legend">
    <span><i style="background:${FACTION_COLOR.RBiH}"></i>RBiH</span>
    <span><i style="background:${FACTION_COLOR.RS}"></i>RS</span>
    <span><i style="background:${FACTION_COLOR.HRHB}"></i>HRHB</span>
    <span><i style="background:${'#c98e26'}"></i>mismatch vs painted (checkpoints only)</span>
    <span style="opacity:.7">merged sub-1km² cells draw with their parent, so amber polygons can exceed the scored mismatch count — the panel number is the score</span>
  </div>
</div>
<div class="side">
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
    <h2>Provenance</h2>
    ${admissibility.length ? `<p class="warn">${admissibility.map(esc).join('<br>')}</p>` : ''}
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
const META=new Map(CELLS.map(c=>[c.o,c]));

// Weeks that actually contain a flip — the map is static between them, so the
// arrows step through events rather than through empty weeks.
const flipWeeks=[...new Set(EVENTS.map(e=>e.t))].sort((a,b)=>a-b);
const CPBYWEEK=new Map(SCORES.map(s=>[s.week,s]));

// Names and ids come from repo data files, not from a user, but they still reach
// innerHTML — escape rather than trust, so one odd character cannot break the page.
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function stateAt(w){const st=Object.assign({},INIT);for(const e of EVENTS){if(e.t>w)break;st[e.o]=e.x}return st}

let week=MAXWEEK,selected=null;
function render(){
  const st=stateAt(week);
  for(const [osid,p] of nodes){
    const f=st[META.get(osid).s];
    p.setAttribute('fill',FCOLOR[f]||'#3a3f47');
    p.classList.remove('mismatch');
  }
  const cp=CPBYWEEK.get(week);
  const mmlist=document.getElementById('mmlist'),mmnote=document.getElementById('mmnote'),mmwhen=document.getElementById('mmwhen');
  if(cp&&cp.reached){
    for(const m of cp.mismatches){const arr=byScored.get(m.osid);if(arr)for(const p of arr)p.classList.add('mismatch')}
    mmwhen.textContent='· '+cp.label+' (w'+cp.week+')';
    mmnote.textContent=cp.mismatches.length+' of '+cp.total+' OSIDs differ from painted control.';
    mmlist.innerHTML=cp.mismatches.map(m=>'<div data-o="'+esc(m.osid)+'">'+esc(m.osid)+' — sim '+esc(m.sim||'—')+' · want '+esc(m.want)+'</div>').join('');
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
  if(selected)highlight(selected);
}
function highlight(osid){
  document.querySelectorAll('.cell.sel').forEach(p=>p.classList.remove('sel'));
  const arr=byScored.get(osid)||(nodes.has(osid)?[nodes.get(osid)]:[]);
  for(const p of arr)p.classList.add('sel');
  selected=osid;
}
const slider=document.getElementById('week');
slider.addEventListener('input',()=>{week=Number(slider.value);render()});
document.getElementById('prev').onclick=()=>{const c=[...flipWeeks].reverse().find(w=>w<week);if(c!==undefined){week=c;slider.value=week;render()}};
document.getElementById('next').onclick=()=>{const c=flipWeeks.find(w=>w>week);if(c!==undefined){week=c;slider.value=week;render()}};
document.addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft'&&week>0){week-=1;slider.value=week;render()}
  if(e.key==='ArrowRight'&&week<MAXWEEK){week+=1;slider.value=week;render()}
});
document.getElementById('scores').addEventListener('click',e=>{
  const td=e.target.closest('td.cp');if(!td)return;
  week=Number(td.dataset.week);slider.value=week;render();
});
for(const id of ['mmlist','fliplist'])document.getElementById(id).addEventListener('click',e=>{
  const el=e.target.closest('[data-o]');if(!el)return;highlight(el.dataset.o);
});
svg.addEventListener('mousemove',e=>{
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
svg.addEventListener('click',e=>{const p=e.target.closest('.cell');if(p)highlight(p.dataset.s)});

document.getElementById('prov').innerHTML=[
  'run: '+esc(PROV.run_dir),
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
