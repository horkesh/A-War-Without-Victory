// node snap_inspect.cjs <run_dir> — per-snapshot alliance, HVO supply/stranded state, RBiH-HRHB front edges
const fs = require('fs');
const path = require('path');
const dir = process.argv[2];
const files = fs.readdirSync(dir).filter((f) => /^save_w\d+\.json$/.test(f)).sort((a, b) => +a.match(/\d+/)[0] - +b.match(/\d+/)[0]);
for (const f of files) {
  const s = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  const rhs = s.political.rbih_hrhb_state || {};
  const pc = s.political.political_controllers;
  const sup = s.political.last_supply_state_by_osid || {};
  const edges = s.military.war_front_edges_osid || [];
  const pairEdges = edges.filter((e) => { const a = pc[e.a], b = pc[e.b]; return (a === 'RBiH' && b === 'HRHB') || (a === 'HRHB' && b === 'RBiH'); });
  const pairMuns = {};
  for (const e of pairEdges) { const m = [e.a.split(':')[1], e.b.split(':')[1]].sort().join('/'); pairMuns[m] = (pairMuns[m] || 0) + 1; }
  const hrhbSup = {};
  for (const [o, c] of Object.entries(pc)) if (c === 'HRHB') hrhbSup[sup[o] || 'none'] = (hrhbSup[sup[o] || 'none'] || 0) + 1;
  console.log(`\n== ${f} turn ${s.meta.turn} alliance ${(+s.political.war_alliance_rbih_hrhb).toFixed(3)} mob ${rhs.mobilization_started_turn} war ${rhs.war_started_turn} cf ${rhs.ceasefire_active} wa ${rhs.washington_signed}`);
  console.log(' total front edges', edges.length, 'RBiH-HRHB edges', pairEdges.length, JSON.stringify(pairMuns));
  console.log(' HRHB OSID supply states', JSON.stringify(hrhbSup));
  const F = s.military.formations;
  const rows = [];
  for (const id of Object.keys(F).sort()) {
    const x = F[id];
    if (x.faction !== 'HRHB' || x.kind !== 'brigade' || x.status !== 'active') continue;
    if (!/central_bosnia|southeast/.test(x.corps_id || '')) continue;
    rows.push(`${id}@${x.location_osid}[${sup[x.location_osid] || '-'}] coh=${(x.cohesion ?? 0).toFixed(0)} str=${x.stranded_status || '-'} post=${x.posture || '-'}`);
  }
  console.log(' ' + rows.join('\n '));
  for (const c of ['hvo_central_bosnia', 'hvo_southeast_herzegovina', 'arbih_3rd_corps', 'arbih_4th_corps']) {
    const cc = s.military.corps_command?.[c];
    if (!cc) continue;
    console.log(` ${c}: stance=${cc.stance} ops=${(cc.active_operations || []).map((o) => o.name || o.id).join(';')} dir.offensive_targets=${JSON.stringify(cc.directive?.offensive_targets || []).slice(0, 200)} status=${cc.status_reason || ''}`);
  }
}
