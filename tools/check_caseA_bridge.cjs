const fs = require('fs');
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));

// Check: are milici_2 and sebiocina adjacent?
const e1 = graph.edges.find(e =>
  (e.a === 'op:vlasenica:milici_2' && e.b === 'op:vlasenica:sebiocina') ||
  (e.a === 'op:vlasenica:sebiocina' && e.b === 'op:vlasenica:milici_2'));
console.log('milici_2 <-> sebiocina:', e1 ? `type=${e1.type} min_dist=${e1.min_dist}` : 'NO EDGE');

// Check: pobudje_2 faces both milici_2 and sebiocina (from same friendly OSID)
// Case A: same friendly=pobudje_2, hostile milici_2 adj sebiocina → connects ALL edges from pobudje_2
// This means a Cerska edge (cerska_2 ↔ milici_2) connects to a Srebrenica edge (milacevici ↔ sebiocina)
// through the intermediate pobudje_2 edges.

// Let's trace the full chain:
// pobudje_2 ↔ milici_2 (Cerska hostile) -- Case A link via pobudje_2 -- pobudje_2 ↔ sebiocina (shared hostile)
// Then from pobudje_2 ↔ sebiocina, Case B (same hostile=sebiocina) or Case A (same friendly=pobudje_2)
// connects to other Srebrenica edges.

// So the bridge is: pobudje_2 is a SINGLE friendly OSID that faces enemies on BOTH sides.
// Case A correctly connects all its edges. This is genuine front connectivity.

console.log('\nBridge OSID analysis: op:bratunac:pobudje_2');
console.log('This OSID faces enemies in both the Srebrenica and Cerska directions.');
console.log('Case A correctly connects all edges from this OSID because the hostile OSIDs are adjacent.');
console.log('The front IS one continuous line passing through pobudje_2.');
console.log('\nThe issue is not connectivity — the sector is genuinely contiguous along the front.');
console.log('The issue is SIZE: 23 edges in one sector (just under MAX_SECTOR_EDGES=25).');

// Count edges per friendly OSID to show pobudje_2 is the bridge
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const sector = save.military.corps_front_sectors['sector:arbih_2nd_corps:4'];
const allFriendly = new Set();
for (const ss of sector.sub_segments) {
  for (const o of ss.friendly_osids) allFriendly.add(o);
}

console.log('\n--- pobudje_2 edges ---');
for (const eid of sector.edge_ids) {
  const sep = eid.indexOf('__');
  const a = eid.slice(0, sep);
  const b = eid.slice(sep + 2);
  const friendly = allFriendly.has(a) ? a : b;
  const hostile = friendly === a ? b : a;
  if (friendly === 'op:bratunac:pobudje_2') {
    const isCerska = hostile.includes('vlasenica') || hostile.includes('zvornik');
    const isSreb = hostile.includes('bratunac') || hostile.includes('srebrenica');
    console.log(`  ${hostile} [${isCerska ? 'CERSKA' : isSreb ? 'SREB' : 'OTHER'}]`);
  }
}
