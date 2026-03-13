const fs = require('fs');
const g = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));

// Distribution of min_dist
const dist = g.edges.filter(e => e.min_dist !== undefined && e.min_dist > 0)
  .map(e => e.min_dist)
  .sort((a, b) => a - b);

console.log(`Total edges: ${g.edges.length}`);
console.log(`No min_dist: ${g.edges.filter(e => e.min_dist === undefined).length}`);
console.log(`min_dist=0: ${g.edges.filter(e => e.min_dist === 0).length}`);
console.log(`min_dist>0: ${dist.length}`);

// Percentiles
const pcts = [0, 1, 5, 10, 25, 50, 75, 90, 95, 99, 100];
for (const p of pcts) {
  const idx = Math.min(Math.floor(dist.length * p / 100), dist.length - 1);
  console.log(`  p${p}: ${dist[idx]}`);
}

// Buckets
const buckets = [0.0001, 0.001, 0.01, 0.1, 1.0, 10.0];
for (const t of buckets) {
  const count = dist.filter(d => d <= t).length;
  console.log(`  min_dist <= ${t}: ${count} / ${dist.length}`);
}

// Type distribution
const typeByMinDist = {};
for (const e of g.edges) {
  const bucket = e.min_dist === undefined ? 'undefined'
    : e.min_dist === 0 ? '0'
    : e.min_dist <= 0.001 ? '<=0.001'
    : e.min_dist <= 0.01 ? '<=0.01'
    : '>0.01';
  if (!typeByMinDist[bucket]) typeByMinDist[bucket] = {};
  typeByMinDist[bucket][e.type || 'none'] = (typeByMinDist[bucket][e.type || 'none'] || 0) + 1;
}
console.log('\nType distribution by min_dist bucket:');
for (const [bucket, types] of Object.entries(typeByMinDist)) {
  console.log(`  ${bucket}: ${JSON.stringify(types)}`);
}

// Check specific bridge edges
console.log('\nBridge-relevant edges:');
const bridgeOsids = ['op:vlasenica:sebiocina', 'op:bratunac:pobudje_2', 'op:srebrenica:bostahovine_2', 'op:vlasenica:milici_2'];
for (const e of g.edges) {
  if (bridgeOsids.includes(e.a) && bridgeOsids.includes(e.b)) {
    console.log(`  ${e.a} <-> ${e.b}: type=${e.type}, min_dist=${e.min_dist}`);
  }
}
