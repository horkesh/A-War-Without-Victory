// node tools/diagnostics/hvo_arbih_war/bilateral_minority_census.cjs <run_dir> [turn]
// (cwd = repo root). RF-5B premise census.
// At the bilateral war start (or the given turn), counts the 1991-census Bosniaks living in
// HRHB-held OSIDs and the Croats living in RBiH-held OSIDs, split by whether the OSID touches
// the other faction (contact graph) and by municipality. Reads control from the run's
// control_events replayed onto initial_political_controllers.
const fs = require('fs');
const path = require('path');
const runDir = process.argv[2];
const save = JSON.parse(fs.readFileSync(path.join(runDir, 'final_save.json'), 'utf8'));
const gj = JSON.parse(fs.readFileSync('data/derived/operational/operational_settlements.geojson', 'utf8'));
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));
const props = {};
for (const f of gj.features) props[f.properties.osid] = f.properties;
const events = save.political.control_events.slice().sort((a, b) => a.turn - b.turn);
const init = save.political.initial_political_controllers;
const turn = process.argv[3] ? Number(process.argv[3]) : save.political.rbih_hrhb_state.war_started_turn;
const st = { ...init };
for (const e of events) if (e.turn <= turn) st[e.settlement_id] = e.to;
const adj = {};
for (const e of graph.edges) { (adj[e.a] ??= []).push(e.b); (adj[e.b] ??= []).push(e.a); }
const touches = (o, faction) => (adj[o] || []).some((n) => st[n] === faction);
const rows = {};
const tot = { bos_in_hrhb: 0, bos_in_hrhb_front: 0, cro_in_rbih: 0, cro_in_rbih_front: 0 };
for (const [o, c] of Object.entries(st)) {
  const p = props[o]; if (!p) continue;
  const mun = o.split(':')[1];
  const r = (rows[mun] ??= { bos_in_hrhb: 0, bos_in_hrhb_front: 0, cro_in_rbih: 0, cro_in_rbih_front: 0, hrhb_osids: 0, rbih_osids: 0 });
  if (c === 'HRHB') {
    r.hrhb_osids++;
    const b = p.population_bosniaks || 0;
    r.bos_in_hrhb += b; tot.bos_in_hrhb += b;
    if (touches(o, 'RBiH')) { r.bos_in_hrhb_front += b; tot.bos_in_hrhb_front += b; }
  } else if (c === 'RBiH') {
    r.rbih_osids++;
    const cr = p.population_croats || 0;
    r.cro_in_rbih += cr; tot.cro_in_rbih += cr;
    if (touches(o, 'HRHB')) { r.cro_in_rbih_front += cr; tot.cro_in_rbih_front += cr; }
  }
}
console.log('turn', turn, JSON.stringify(tot));
const mixed = Object.entries(rows).filter(([, v]) => v.hrhb_osids > 0 && v.rbih_osids > 0).map(([m]) => m).sort();
console.log('municipalities where both RBiH and HRHB hold OSIDs:', mixed.length, mixed.join(','));
const sorted = Object.entries(rows).filter(([, v]) => v.bos_in_hrhb + v.cro_in_rbih > 300)
  .sort((a, b) => (b[1].bos_in_hrhb) - (a[1].bos_in_hrhb));
console.log('mun'.padEnd(22), 'bosInHRHB front | croInRBiH front | osids H/R | mixed');
for (const [m, v] of sorted) {
  console.log(m.padEnd(22), String(v.bos_in_hrhb).padStart(7), String(v.bos_in_hrhb_front).padStart(7), '|',
    String(v.cro_in_rbih).padStart(7), String(v.cro_in_rbih_front).padStart(7), '|', `${v.hrhb_osids}/${v.rbih_osids}`, mixed.includes(m) ? 'M' : '');
}
