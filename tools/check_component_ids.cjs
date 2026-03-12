const fs = require('fs');

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

// Build full RBiH friendly OSID set
const friendlyOsids = new Set();
for (const [osid, ctrl] of Object.entries(save.political_controllers || {})) {
  if (ctrl === 'RBiH') friendlyOsids.add(osid);
}
console.log('Total RBiH OSIDs:', friendlyOsids.size);

// BFS connected components through ALL RBiH territory
const componentOf = new Map();
let nextComp = 0;
const sorted = [...friendlyOsids].sort();
for (const start of sorted) {
  if (componentOf.has(start)) continue;
  const compId = nextComp++;
  componentOf.set(start, compId);
  const queue = [start];
  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    for (const nb of (adj.get(curr) || [])) {
      if (componentOf.has(nb)) continue;
      if (!friendlyOsids.has(nb)) continue;
      componentOf.set(nb, compId);
      queue.push(nb);
    }
  }
}

console.log('Total RBiH components:', nextComp);

// Count sizes
const compSizes = new Map();
for (const [osid, comp] of componentOf) {
  compSizes.set(comp, (compSizes.get(comp) || 0) + 1);
}
const sortedComps = [...compSizes.entries()].sort((a,b) => b[1] - a[1]);
for (const [comp, size] of sortedComps.slice(0, 10)) {
  console.log(`  Component ${comp}: ${size} OSIDs`);
}

// Now check the sector's territory OSIDs
const secs = save.military.corps_front_sectors;
const sector = secs['sector:arbih_2nd_corps:4'];
console.log('\nSector arbih_2nd_corps:4 territory components:');
const compGroupsInSector = new Map();
for (const osid of sector.territory_osids) {
  const comp = componentOf.get(osid);
  if (comp === undefined) {
    console.log('  WARNING:', osid, 'not in any RBiH component (not RBiH controlled?)');
    continue;
  }
  if (!compGroupsInSector.has(comp)) compGroupsInSector.set(comp, []);
  compGroupsInSector.get(comp).push(osid);
}
console.log('  Spans', compGroupsInSector.size, 'component(s)');
for (const [comp, osids] of [...compGroupsInSector.entries()].sort((a,b) => a[0]-b[0])) {
  console.log(`  Component ${comp} (${compSizes.get(comp)} total RBiH OSIDs): ${osids.length} in sector`);
  for (const o of osids.sort()) console.log('    ', o);
}

// Also check front edge friendly OSIDs
console.log('\nFront edge friendly OSID components:');
const frontComps = new Map();
for (const ss of sector.sub_segments) {
  for (const o of ss.friendly_osids) {
    const comp = componentOf.get(o);
    if (!frontComps.has(comp)) frontComps.set(comp, []);
    frontComps.get(comp).push(o);
  }
}
for (const [comp, osids] of [...frontComps.entries()].sort((a,b) => (a??-1) - (b??-1))) {
  console.log(`  Component ${comp} (${compSizes.get(comp)} total): ${osids.sort().join(', ')}`);
}
