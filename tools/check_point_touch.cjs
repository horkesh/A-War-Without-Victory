const fs = require('fs');
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));

// point_touch and shared_border edges
const realEdges = graph.edges.filter(e => e.type === 'point_touch' || e.type === 'shared_border' || e.min_dist === undefined);
console.log(`"Real" edges (point_touch/shared_border/no min_dist): ${realEdges.length}`);

const pc = save.political.political_controllers;
const rbihOsids = new Set();
for (const [osid, ctrl] of Object.entries(pc)) {
  if (ctrl === 'RBiH') rbihOsids.add(osid);
}

// Count real edges where at least one end is RBiH and in the Srebrenica/Cerska area
const areaOsids = new Set();
const sec = save.military.corps_front_sectors['sector:arbih_2nd_corps:4'];
for (const ss of sec.sub_segments) {
  for (const o of ss.friendly_osids) areaOsids.add(o);
}

// Real edges touching area OSIDs
const areaRealEdges = realEdges.filter(e => areaOsids.has(e.a) || areaOsids.has(e.b));
console.log(`Real edges touching sector friendly OSIDs: ${areaRealEdges.length}`);
for (const e of areaRealEdges) {
  console.log(`  ${e.a} <-> ${e.b} type=${e.type} min_dist=${e.min_dist}`);
}

// Build real-edge-only adjacency for ALL RBiH OSIDs
const realAdj = new Map();
for (const e of realEdges) {
  if (!realAdj.has(e.a)) realAdj.set(e.a, []);
  if (!realAdj.has(e.b)) realAdj.set(e.b, []);
  realAdj.get(e.a).push(e.b);
  realAdj.get(e.b).push(e.a);
}

// BFS from each area friendly OSID through RBiH territory using real edges only
const visited = new Set();
const components = [];
for (const osid of [...areaOsids].sort()) {
  if (visited.has(osid)) continue;
  const comp = new Set();
  const queue = [osid];
  visited.add(osid);
  while (queue.length > 0) {
    const curr = queue.shift();
    if (areaOsids.has(curr)) comp.add(curr);
    for (const nb of (realAdj.get(curr) || [])) {
      if (visited.has(nb)) continue;
      if (!rbihOsids.has(nb)) continue;
      visited.add(nb);
      queue.push(nb);
    }
  }
  if (comp.size > 0) components.push(comp);
}

const srebMunis = new Set(['srebrenica', 'bratunac']);
console.log(`\nComponents (real edges, RBiH territory): ${components.length}`);
for (let i = 0; i < components.length; i++) {
  const c = components[i];
  const hasSreb = [...c].some(o => srebMunis.has(o.split(':')[1]));
  const hasCerska = [...c].some(o => o.includes('vlasenica'));
  console.log(`  Component ${i}: ${c.size} OSIDs [${hasSreb ? 'SREB' : ''}${hasCerska ? 'CERSKA' : ''}${!hasSreb && !hasCerska ? 'OTHER' : ''}]`);
  for (const o of [...c].sort()) console.log(`    ${o}`);
}
