const fs = require('fs');

const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));

// Build adjacency (CORRECT: edges use .a and .b)
const adj = new Map();
for (const edge of graph.edges) {
  if (!adj.has(edge.a)) adj.set(edge.a, []);
  if (!adj.has(edge.b)) adj.set(edge.b, []);
  adj.get(edge.a).push(edge.b);
  adj.get(edge.b).push(edge.a);
}
console.log('Graph nodes:', adj.size, 'edges:', graph.edges.length);

// Build full RBiH friendly OSID set
const pc = save.political.political_controllers;
const friendlyOsids = new Set();
for (const [osid, ctrl] of Object.entries(pc)) {
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
for (const [, comp] of componentOf) {
  compSizes.set(comp, (compSizes.get(comp) || 0) + 1);
}
const sortedComps = [...compSizes.entries()].sort((a,b) => b[1] - a[1]);
console.log('Component sizes (top 10):');
for (const [comp, size] of sortedComps.slice(0, 10)) {
  const sample = [...componentOf.entries()].find(([,c]) => c === comp)?.[0];
  console.log(`  Component ${comp}: ${size} OSIDs (sample: ${sample})`);
}

// Check sector territory
const secs = save.military.corps_front_sectors;
const sector = secs['sector:arbih_2nd_corps:4'];
console.log('\nSector arbih_2nd_corps:4 territory by component:');
const compGroupsInSector = new Map();
for (const osid of sector.territory_osids) {
  const comp = componentOf.get(osid);
  if (comp === undefined) {
    console.log('  WARNING:', osid, 'not in RBiH component');
    continue;
  }
  if (!compGroupsInSector.has(comp)) compGroupsInSector.set(comp, []);
  compGroupsInSector.get(comp).push(osid);
}
console.log('  Spans', compGroupsInSector.size, 'connected component(s)');
for (const [comp, osids] of [...compGroupsInSector.entries()].sort((a,b) => a-b)) {
  const total = compSizes.get(comp);
  console.log(`  Component ${comp} (total ${total} RBiH OSIDs):`, osids.sort());
}
