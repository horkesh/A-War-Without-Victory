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

// Build full RBiH friendly OSID set (correct path!)
const pc = save.political.political_controllers;
const friendlyOsids = new Set();
for (const [osid, ctrl] of Object.entries(pc)) {
  if (ctrl === 'RBiH') friendlyOsids.add(osid);
}
console.log('Total RBiH OSIDs:', friendlyOsids.size);

// BFS connected components
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
for (const [comp, size] of sortedComps) {
  // Find sample OSID
  const sample = [...componentOf.entries()].find(([,c]) => c === comp)?.[0];
  console.log(`  Component ${comp}: ${size} OSIDs (sample: ${sample})`);
}

// Check sector territory
const secs = save.military.corps_front_sectors;
const sector = secs['sector:arbih_2nd_corps:4'];
console.log('\nSector arbih_2nd_corps:4 territory components:');
const compGroupsInSector = new Map();
for (const osid of sector.territory_osids) {
  const comp = componentOf.get(osid);
  if (comp === undefined) {
    // Check if it's even RBiH controlled
    console.log('  WARNING:', osid, '-> controller:', pc[osid]);
    continue;
  }
  if (!compGroupsInSector.has(comp)) compGroupsInSector.set(comp, []);
  compGroupsInSector.get(comp).push(osid);
}
console.log('  Spans', compGroupsInSector.size, 'connected component(s)');
for (const [comp, osids] of [...compGroupsInSector.entries()].sort((a,b) => a-b)) {
  console.log(`  Component ${comp} (total ${compSizes.get(comp)} RBiH OSIDs):`);
  for (const o of osids.sort()) console.log('    ', o);
}
