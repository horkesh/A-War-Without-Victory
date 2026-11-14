// Per-turn unheld encircled pocket census.
// usage: node pockets.cjs <run_dir> <out_json>
const fs = require('fs');
const path = require('path');
const runDir = process.argv[2];
const outPath = process.argv[3];

const save = JSON.parse(fs.readFileSync(path.join(runDir, 'final_save.json'), 'utf8'));
const events = (save.political.control_events || []).slice().sort((a, b) => a.turn - b.turn);
const init = save.political.initial_political_controllers;
const g = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));
const adj = new Map();
for (const n of g.nodes) adj.set(n.id, []);
for (const e of g.edges) { adj.get(e.a).push(e.b); adj.get(e.b).push(e.a); }
const nodes = g.nodes.map((n) => n.id).sort();

// formations per turn: turn -> Map(osid -> [{id,faction,kind,personnel}])
const formByTurn = new Map();
for (const line of fs.readFileSync(path.join(runDir, 'brigade_temporal_log.jsonl'), 'utf8').split('\n')) {
  if (!line) continue;
  const r = JSON.parse(line);
  if (r.status !== 'active' || !r.location_osid) continue;
  let m = formByTurn.get(r.turn); if (!m) { m = new Map(); formByTurn.set(r.turn, m); }
  let a = m.get(r.location_osid); if (!a) { a = []; m.set(r.location_osid, a); }
  a.push({ id: r.brigade_id, faction: r.faction, kind: r.kind, personnel: r.personnel });
}
const turns = [...formByTurn.keys()].sort((a, b) => a - b);
const maxTurn = Math.max(...turns, 188);

const ctrl = { ...init };
let ei = 0;
const pocketHistory = new Map(); // key = sorted osids joined -> record
const perTurn = [];
const mun = (o) => o.split(':')[1];

for (let t = 0; t <= maxTurn; t++) {
  while (ei < events.length && events[ei].turn <= t) { ctrl[events[ei].settlement_id] = events[ei].to; ei++; }
  // components per faction
  const seen = new Set();
  const comps = [];
  for (const o of nodes) {
    if (seen.has(o)) continue;
    const f = ctrl[o]; if (!f) { seen.add(o); continue; }
    const q = [o]; seen.add(o); const c = [];
    while (q.length) { const x = q.pop(); c.push(x); for (const n of adj.get(x)) if (!seen.has(n) && ctrl[n] === f) { seen.add(n); q.push(n); } }
    comps.push({ faction: f, osids: c.sort() });
  }
  const largest = {};
  for (const c of comps) if (!largest[c.faction] || c.osids.length > largest[c.faction].osids.length) largest[c.faction] = c;
  const fm = formByTurn.get(t) || new Map();
  const rows = [];
  for (const c of comps) {
    if (c === largest[c.faction]) continue;
    const set = new Set(c.osids);
    const borderers = new Set();
    for (const o of c.osids) for (const n of adj.get(o)) if (!set.has(n)) borderers.add(ctrl[n]);
    const own = []; const enemyInside = [];
    for (const o of c.osids) for (const f of (fm.get(o) || [])) (f.faction === c.faction ? own : enemyInside).push({ ...f, osid: o });
    // engine predicate (osid_graph_analysis enemy_pockets, from each borderer's view)
    const engineFlags = [...borderers].filter((b) => borderers.size === 1 && c.osids.length <= 6 && own.length === 0);
    rows.push({ faction: c.faction, osids: c.osids, size: c.osids.length, borderers: [...borderers].sort(), own_formations: own.length, own_ids: own.map((x) => x.id), engine_pocket_for: engineFlags });
  }
  perTurn.push({ turn: t, pockets: rows });
  for (const r of rows) {
    const key = r.faction + '|' + r.osids.join(',');
    let h = pocketHistory.get(key);
    if (!h) { h = { faction: r.faction, osids: r.osids, municipalities: [...new Set(r.osids.map(mun))], first_turn: t, last_turn: t, turns_unheld: 0, turns_held: 0, borderers: new Set(), engine_flag_turns: 0, own_ids: new Set() }; pocketHistory.set(key, h); }
    h.last_turn = t;
    if (r.own_formations === 0) h.turns_unheld++; else h.turns_held++;
    r.borderers.forEach((b) => h.borderers.add(b));
    r.own_ids.forEach((b) => h.own_ids.add(b));
    if (r.engine_pocket_for.length) h.engine_flag_turns++;
  }
}

// fate: for each pocket record, after last_turn, what happened to its osids
const finalCtrl = ctrl;
const hist = [...pocketHistory.values()].map((h) => {
  const fates = h.osids.map((o) => {
    const ev = events.filter((e) => e.settlement_id === o && e.turn > h.last_turn).slice(0, 1)[0];
    const evIn = events.filter((e) => e.settlement_id === o && e.turn >= h.first_turn && e.turn <= h.last_turn + 1);
    return { osid: o, init: init[o], final: finalCtrl[o], next_event: ev || null, events_in_window: evIn };
  });
  return { ...h, borderers: [...h.borderers].sort(), own_ids: [...h.own_ids].sort(), fates };
}).sort((a, b) => a.first_turn - b.first_turn || a.osids[0].localeCompare(b.osids[0]));

fs.writeFileSync(outPath, JSON.stringify({ perTurnCounts: perTurn.map((p) => ({ turn: p.turn, n: p.pockets.length, unheld: p.pockets.filter((x) => x.own_formations === 0).length, unheld_osids: p.pockets.filter((x) => x.own_formations === 0).reduce((s, x) => s + x.size, 0) })), at: Object.fromEntries([39, 104, 135, 156, 188].map((t) => [t, perTurn[t].pockets])), hist }, null, 1));
console.log('pocket records', hist.length);
for (const t of [1, 10, 26, 39, 104, 135, 156, 188]) {
  const p = perTurn[t].pockets;
  console.log('t' + t, 'pockets', p.length, 'unheld', p.filter((x) => x.own_formations === 0).length, 'unheld osids', p.filter((x) => x.own_formations === 0).reduce((s, x) => s + x.size, 0));
}
