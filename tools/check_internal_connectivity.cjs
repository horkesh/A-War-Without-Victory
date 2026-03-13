const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));

const pc = save.political.political_controllers;
const rbihOsids = new Set();
for (const [osid, ctrl] of Object.entries(pc)) {
  if (ctrl === 'RBiH') rbihOsids.add(osid);
}

// Build adjacency with different thresholds
function buildAdj(maxDist) {
  const adj = new Map();
  for (const e of graph.edges) {
    if (maxDist !== Infinity && e.min_dist !== undefined && e.min_dist > maxDist) continue;
    if (!adj.has(e.a)) adj.set(e.a, []);
    if (!adj.has(e.b)) adj.set(e.b, []);
    adj.get(e.a).push(e.b);
    adj.get(e.b).push(e.a);
  }
  return adj;
}

// Check connectivity of sector's friendly OSIDs at different thresholds
const sec = save.military.corps_front_sectors['sector:arbih_2nd_corps:4'];
const friendlyOsids = new Set();
for (const ss of sec.sub_segments) {
  for (const o of ss.friendly_osids) friendlyOsids.add(o);
}

const srebMunis = new Set(['srebrenica', 'bratunac']);
const cerskaMunis = new Set(['vlasenica']);

const thresholds = [0, 0.00001, 0.0001, 0.001, 0.01, 0.1, Infinity];

for (const threshold of thresholds) {
  const adj = buildAdj(threshold);

  // Find connected components of friendly OSIDs through RBiH territory
  const visited = new Set();
  const components = [];
  for (const osid of [...friendlyOsids].sort()) {
    if (visited.has(osid)) continue;
    const comp = new Set();
    const queue = [osid];
    visited.add(osid);
    while (queue.length > 0) {
      const curr = queue.shift();
      comp.add(curr);
      for (const nb of (adj.get(curr) || [])) {
        if (visited.has(nb)) continue;
        if (!friendlyOsids.has(nb)) continue; // Only friendly OSIDs
        visited.add(nb);
        queue.push(nb);
      }
    }
    components.push(comp);
  }

  const compInfo = components.map(c => {
    const hasSreb = [...c].some(o => srebMunis.has(o.split(':')[1]));
    const hasCerska = [...c].some(o => cerskaMunis.has(o.split(':')[1]));
    return `${c.size} [${hasSreb ? 'SREB' : ''}${hasCerska ? 'CERSKA' : ''}${!hasSreb && !hasCerska ? 'OTHER' : ''}]`;
  });

  console.log(`threshold=${threshold}: ${components.length} components — ${compInfo.join(', ')}`);
}

// Also check: using RBiH territory BFS (not just friendly OSIDs)
console.log('\n--- Using ALL RBiH territory for BFS ---');
for (const threshold of thresholds) {
  const adj = buildAdj(threshold);

  const visited = new Set();
  const components = [];
  for (const osid of [...friendlyOsids].sort()) {
    if (visited.has(osid)) continue;
    const comp = new Set();
    const queue = [osid];
    visited.add(osid);
    while (queue.length > 0) {
      const curr = queue.shift();
      if (friendlyOsids.has(curr)) comp.add(curr);
      for (const nb of (adj.get(curr) || [])) {
        if (visited.has(nb)) continue;
        if (!rbihOsids.has(nb)) continue; // Through ANY RBiH territory
        visited.add(nb);
        queue.push(nb);
      }
    }
    components.push(comp);
  }

  const compInfo = components.map(c => {
    const hasSreb = [...c].some(o => srebMunis.has(o.split(':')[1]));
    const hasCerska = [...c].some(o => cerskaMunis.has(o.split(':')[1]));
    return `${c.size} [${hasSreb ? 'SREB' : ''}${hasCerska ? 'CERSKA' : ''}${!hasSreb && !hasCerska ? 'OTHER' : ''}]`;
  });

  console.log(`threshold=${threshold}: ${components.length} components — ${compInfo.join(', ')}`);
}
