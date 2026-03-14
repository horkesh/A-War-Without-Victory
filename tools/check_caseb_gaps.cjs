// Analyze Case B edge connections and their fi-H / fj-H distances
const graph = require('../data/derived/operational/operational_contact_graph.json');
const s = require('../data/derived/latest_run_final_save.json');
const ctrl = s.political.political_controllers;

// Build edge distance lookup
const edgeDist = new Map();
for (const e of graph.edges) {
  if (!e.a || !e.b) continue;
  const key = e.a < e.b ? e.a + '__' + e.b : e.b + '__' + e.a;
  edgeDist.set(key, e.min_dist);
}

function getDist(a, b) {
  const key = a < b ? a + '__' + b : b + '__' + a;
  return edgeDist.get(key);
}

// Look at the sectors that got split by strict Case B
// For each sector's Case B connections, check fi-H and fj-H distances
const sectors = s.military.corps_front_sectors;
const GAP = 0.0003;

// Build the frontEdgeAdj
const adj = new Map();
for (const e of graph.edges) {
  if (!e.a || !e.b) continue;
  if (e.min_dist !== undefined && e.min_dist > GAP) continue;
  if (!adj.has(e.a)) adj.set(e.a, []);
  if (!adj.has(e.b)) adj.set(e.b, []);
  adj.get(e.a).push(e.b);
  adj.get(e.b).push(e.a);
}

// For ALL front edges of RBiH, compute Case B connections and their fi-H distances
const frontEdges = [];
for (const [sid, sec] of Object.entries(sectors)) {
  if (sec.faction !== 'RBiH') continue;
  for (const eid of sec.edge_ids) {
    const sep = eid.indexOf('__');
    const a = eid.slice(0, sep), b = eid.slice(sep + 2);
    const friendly = ctrl[a] === 'RBiH' ? a : b;
    const hostile = ctrl[a] === 'RBiH' ? b : a;
    frontEdges.push({ eid, friendly, hostile, corps: sec.corps_id });
  }
}

// Group by hostile OSID (Case B groups)
const hostileGroups = new Map();
for (const fe of frontEdges) {
  let list = hostileGroups.get(fe.hostile);
  if (!list) { list = []; hostileGroups.set(fe.hostile, list); }
  list.push(fe);
}

// For each Case B pair, compute fi-H and fj-H distances
const caseBDistances = [];
for (const [h, edges] of hostileGroups) {
  if (edges.length < 2) continue;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      const fi = edges[i].friendly, fj = edges[j].friendly;
      // Check if fi-fj are adjacent (required for Case B)
      if (!(adj.get(fi) || []).includes(fj)) continue;
      const distFiH = getDist(fi, h);
      const distFjH = getDist(fj, h);
      const maxDist = Math.max(distFiH || 999, distFjH || 999);
      caseBDistances.push({ fi, fj, h, distFiH, distFjH, maxDist });
    }
  }
}

caseBDistances.sort((a, b) => a.maxDist - b.maxDist);

// Histogram by max(fi-H, fj-H) distance
const buckets = [0, 0.00001, 0.00005, 0.0001, 0.00015, 0.0002, 0.0003];
const bucketCounts = new Array(buckets.length + 1).fill(0);
for (const d of caseBDistances) {
  let placed = false;
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (d.maxDist >= buckets[i]) {
      bucketCounts[i + 1]++;
      placed = true;
      break;
    }
  }
  if (!placed) bucketCounts[0]++;
}

console.log('Case B connections (RBiH): ' + caseBDistances.length + ' total');
console.log('\nmax(fi-H, fj-H) distance distribution:');
for (let i = 0; i < buckets.length; i++) {
  const lo = (buckets[i] * 111000).toFixed(1) + 'm';
  const hi = i < buckets.length - 1 ? (buckets[i+1] * 111000).toFixed(1) + 'm' : '∞';
  console.log('  ' + lo + ' - ' + hi + ': ' + bucketCounts[i + 1]);
}

// Show the ones between 5.5m and 33m (the disputed range)
console.log('\nCase B connections with max dist between 5.5m and 33m (strict would cut, standard would keep):');
for (const d of caseBDistances) {
  if (d.maxDist > 0.00005 && d.maxDist <= 0.0003) {
    console.log('  ' + d.fi.split(':').slice(1).join(':') + ' <-> ' + d.fj.split(':').slice(1).join(':') +
      ' via ' + d.h.split(':').slice(1).join(':') +
      ' fi-H=' + (d.distFiH * 111000).toFixed(1) + 'm fj-H=' + (d.distFjH * 111000).toFixed(1) + 'm');
  }
}
