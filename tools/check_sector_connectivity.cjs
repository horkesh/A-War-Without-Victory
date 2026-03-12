const fs = require('fs');

// Load save + adjacency
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));

// Build adjacency
const adj = new Map();
for (const edge of graph.edges) {
  const a = edge.source || edge[0];
  const b = edge.target || edge[1];
  if (!adj.has(a)) adj.set(a, []);
  if (!adj.has(b)) adj.set(b, []);
  adj.get(a).push(b);
  adj.get(b).push(a);
}

// Find the problematic sector
const secs = save.military.corps_front_sectors;
const sid = 'sector:arbih_2nd_corps:4';
const sector = secs[sid];
if (!sector) { console.log('Sector not found:', sid); process.exit(1); }

console.log('Sector:', sid);
console.log('Territory OSIDs:', sector.territory_osids.length);
console.log('Front edges:', sector.edge_ids.length);

// Check which territory OSIDs are Srebrenica vs Cerska
const srebrenica = sector.territory_osids.filter(o =>
  o.includes('srebrenica') || o.includes('bratunac') || o.includes('skelani'));
const cerska = sector.territory_osids.filter(o =>
  o.includes('cerska') || o.includes('vlasenica') || o.includes('milici') || o.includes('osmace'));
const other = sector.territory_osids.filter(o =>
  !srebrenica.includes(o) && !cerska.includes(o));

console.log('\nTerritory by area:');
console.log('  Srebrenica area:', srebrenica.length, srebrenica);
console.log('  Cerska/Vlasenica area:', cerska.length, cerska);
console.log('  Other:', other.length, other);

// BFS to check connectivity WITHIN territory
const terrSet = new Set(sector.territory_osids);
const visited = new Set();
const components = [];
for (const start of sector.territory_osids.sort()) {
  if (visited.has(start)) continue;
  const comp = [];
  const queue = [start];
  visited.add(start);
  while (queue.length > 0) {
    const curr = queue.shift();
    comp.push(curr);
    for (const nb of (adj.get(curr) || [])) {
      if (!visited.has(nb) && terrSet.has(nb)) {
        visited.add(nb);
        queue.push(nb);
      }
    }
  }
  components.push(comp);
}

console.log('\nTerritory connected components:', components.length);
for (let i = 0; i < components.length; i++) {
  const comp = components[i];
  const hasSreb = comp.some(o => o.includes('srebrenica') || o.includes('bratunac'));
  const hasCerska = comp.some(o => o.includes('cerska') || o.includes('vlasenica'));
  console.log(`  Component ${i}: ${comp.length} OSIDs`,
    hasSreb ? '[SREBRENICA]' : '', hasCerska ? '[CERSKA/VLASENICA]' : '');
  console.log('    OSIDs:', comp.sort());
}

// Also check: which faction controls the corridor between them?
// Check political_controllers for key corridor OSIDs
console.log('\nCorridor check:');
const corridorMunis = ['konjevic_polje', 'nova_kasaba', 'milici', 'bratunac'];
for (const mun of corridorMunis) {
  const osids = Object.keys(save.political_controllers || {}).filter(o => o.includes(mun));
  for (const o of osids.sort()) {
    const ctrl = save.political_controllers[o];
    console.log('  ', o, '→', ctrl);
  }
}

// Check front edges
console.log('\nFront edge friendly OSIDs:');
const friendlyOsids = new Set();
const enemyOsids = new Set();
for (const ss of sector.sub_segments) {
  for (const o of ss.friendly_osids) friendlyOsids.add(o);
  for (const o of ss.enemy_osids) enemyOsids.add(o);
}
console.log('  Friendly:', [...friendlyOsids].sort());

// BFS connectivity of friendly front OSIDs through RBiH territory only
const rbihOsids = new Set();
for (const [osid, ctrl] of Object.entries(save.political_controllers || {})) {
  if (ctrl === 'RBiH') rbihOsids.add(osid);
}
console.log('\nFront OSID connectivity through ALL RBiH territory:');
const frontList = [...friendlyOsids].sort();
const fVisited = new Set();
const fComponents = [];
for (const start of frontList) {
  if (fVisited.has(start)) continue;
  const comp = [];
  const queue = [start];
  fVisited.add(start);
  while (queue.length > 0) {
    const curr = queue.shift();
    comp.push(curr);
    for (const nb of (adj.get(curr) || [])) {
      if (!fVisited.has(nb) && friendlyOsids.has(nb) && rbihOsids.has(nb)) {
        fVisited.add(nb);
        queue.push(nb);
      }
    }
  }
  fComponents.push(comp);
}
console.log('  Front OSID components (through RBiH only):', fComponents.length);
for (let i = 0; i < fComponents.length; i++) {
  console.log(`  Component ${i}:`, fComponents[i].sort());
}
