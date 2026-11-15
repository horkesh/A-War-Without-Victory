// node minority_potential.cjs <run_dir>  (cwd = repo root)
// Census Bosniaks in HRHB-held OSIDs and Croats in RBiH-held OSIDs at war start (t49) — the pool
// that the bilateral war never seeds displacement timers for.
const fs = require('fs');
const path = require('path');
const runDir = process.argv[2];
const save = JSON.parse(fs.readFileSync(path.join(runDir, 'final_save.json'), 'utf8'));
const gj = JSON.parse(fs.readFileSync('data/derived/operational/operational_settlements.geojson', 'utf8'));
const props = {};
for (const f of gj.features) { const p = f.properties; const id = p.osid; props[id] = p; }
const events = save.political.control_events.slice().sort((a, b) => a.turn - b.turn);
const init = save.political.initial_political_controllers;
const stateAt = (w) => { const st = { ...init }; for (const e of events) if (e.turn <= w) st[e.settlement_id] = e.to; return st; };
const wt = save.political.rbih_hrhb_state.war_started_turn;
const st = stateAt(wt);
const byMun = {};
let bosInHrhb = 0, croInRbih = 0, missing = 0;
for (const [o, c] of Object.entries(st)) {
  const p = props[o]; if (!p) { missing++; continue; }
  const mun = o.split(':')[1];
  const b = p.population_bosniaks || 0, cr = p.population_croats || 0;
  if (c === 'HRHB' && b > 0) { bosInHrhb += b; (byMun[mun] ??= { bos_in_hrhb: 0, cro_in_rbih: 0 }).bos_in_hrhb += b; }
  if (c === 'RBiH' && cr > 0) { croInRbih += cr; (byMun[mun] ??= { bos_in_hrhb: 0, cro_in_rbih: 0 }).cro_in_rbih += cr; }
}
console.log('war_started_turn', wt, 'missing props', missing, 'sample keys', Object.keys(gj.features[0].properties).join(','));
console.log('Bosniaks (1991) living in HRHB-held OSIDs at war start:', bosInHrhb);
console.log('Croats (1991) living in RBiH-held OSIDs at war start:', croInRbih);
const rows = Object.entries(byMun).sort((a, b) => (b[1].bos_in_hrhb + b[1].cro_in_rbih) - (a[1].bos_in_hrhb + a[1].cro_in_rbih));
for (const [m, v] of rows.slice(0, 30)) console.log(m.padEnd(22), JSON.stringify(v));
// What remained at war start after earlier displacement? settlement_displacement in final save is end-state; report it for context
