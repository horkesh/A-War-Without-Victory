const fs = require('fs');

// 1. Contact-graph neighbours around the Stolac cells.
const cg = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));
console.log('contact graph top keys:', Object.keys(cg));
const edges = cg.edges || cg.contacts || cg;
function neighbors(osid) {
  const out = new Set();
  for (const e of edges) {
    const a = e.a || e.from || e.osid_a || e.source;
    const b = e.b || e.to || e.osid_b || e.target;
    if (a === osid) out.add(b);
    if (b === osid) out.add(a);
  }
  return [...out].sort();
}
for (const o of ['op:stolac:pjesivac_kula_2', 'op:stolac:stolac_2', 'op:stolac:rotimlja_2', 'op:stolac:hatelji_2', 'op:stolac:prenj']) {
  console.log(o, '->', neighbors(o).join(', '));
}

// 2. Constituent settlement names for the Pjesivac-Kula OSID.
const geoms = JSON.parse(fs.readFileSync('data/derived/operational/operational_settlements.geojson', 'utf8'));
const feats = geoms.features || geoms;
const target = feats.find((f) => (f.properties || {}).osid === 'op:stolac:pjesivac_kula_2');
const sids = (target.properties.constituent_sids || []).concat([target.properties.sid]);
console.log('pjesivac_kula_2 constituent SIDs:', sids.join(', '));
const master = JSON.parse(fs.readFileSync('data/source/settlements_initial_master.json', 'utf8'));
const arr = Array.isArray(master) ? master : (master.settlements || master.features || Object.values(master));
const bySid = new Map();
for (const s of arr) {
  const sid = s.sid || s.SID || s.id || (s.properties && (s.properties.sid || s.properties.id));
  const name = s.name || s.settlement_name || (s.properties && s.properties.name);
  if (sid) bySid.set(sid, name);
}
for (const sid of sids) console.log('  ', sid, '=', bySid.get(sid) || '(name not found)');
