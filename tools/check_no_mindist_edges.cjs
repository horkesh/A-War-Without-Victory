const fs = require('fs');
const g = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));

// Edges without min_dist
const noMinDist = g.edges.filter(e => e.min_dist === undefined || e.min_dist === null);
console.log(`Edges without min_dist: ${noMinDist.length}`);

// Check what types they have
const typeCounts = {};
for (const e of noMinDist) {
  typeCounts[e.type || 'NO_TYPE'] = (typeCounts[e.type || 'NO_TYPE'] || 0) + 1;
}
console.log('Types:', typeCounts);

// Check if any connect Srebrenica/Bratunac to Vlasenica/Milici/Zvornik areas
const srebMunis = new Set(['srebrenica', 'bratunac']);
const cerskaMunis = new Set(['vlasenica', 'milici', 'zvornik']);
function getMun(osid) { return osid.split(':')[1]; }

const crossEdges = noMinDist.filter(e => {
  const ma = getMun(e.a), mb = getMun(e.b);
  return (srebMunis.has(ma) && cerskaMunis.has(mb)) || (cerskaMunis.has(ma) && srebMunis.has(mb));
});
console.log(`\nCross-area edges (no min_dist): ${crossEdges.length}`);
for (const e of crossEdges) {
  console.log(`  ${e.a} <-> ${e.b} type=${e.type}`);
}

// Also check: edges with min_dist=0
const zeroMinDist = g.edges.filter(e => e.min_dist === 0);
const zeroCross = zeroMinDist.filter(e => {
  const ma = getMun(e.a), mb = getMun(e.b);
  return (srebMunis.has(ma) && cerskaMunis.has(mb)) || (cerskaMunis.has(ma) && srebMunis.has(mb));
});
console.log(`\nCross-area edges (min_dist=0): ${zeroCross.length}`);
for (const e of zeroCross) {
  console.log(`  ${e.a} <-> ${e.b} type=${e.type}`);
}

// BFS: can you reach Cerska from Srebrenica using ONLY shared boundary edges?
const sharedAdj = new Map();
for (const e of g.edges) {
  if (e.min_dist !== undefined && e.min_dist > 0) continue;
  if (!sharedAdj.has(e.a)) sharedAdj.set(e.a, []);
  if (!sharedAdj.has(e.b)) sharedAdj.set(e.b, []);
  sharedAdj.get(e.a).push(e.b);
  sharedAdj.get(e.b).push(e.a);
}

// BFS from any Srebrenica/Bratunac OSID
const starts = [...sharedAdj.keys()].filter(k => srebMunis.has(getMun(k)));
const targets = new Set([...sharedAdj.keys()].filter(k => cerskaMunis.has(getMun(k))));
const visited = new Set();
const parent = new Map();
const queue = [];
for (const s of starts) {
  visited.add(s);
  queue.push(s);
}
let found = null;
let head = 0;
while (head < queue.length) {
  const curr = queue[head++];
  if (targets.has(curr)) {
    found = curr;
    break;
  }
  for (const nb of (sharedAdj.get(curr) || [])) {
    if (!visited.has(nb)) {
      visited.add(nb);
      parent.set(nb, curr);
      queue.push(nb);
    }
  }
}

if (found) {
  console.log(`\nBFS found path to ${found}!`);
  const path = [found];
  let c = found;
  while (parent.has(c)) {
    c = parent.get(c);
    path.unshift(c);
  }
  console.log('Path:', path.join(' -> '));
} else {
  console.log('\nNo shared-boundary path between Srebrenica and Cerska areas');
}
