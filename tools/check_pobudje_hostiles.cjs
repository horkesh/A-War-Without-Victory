const fs = require('fs');
const g = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const sec = save.military.corps_front_sectors['sector:arbih_2nd_corps:4'];
const allF = new Set();
for (const ss of sec.sub_segments) for (const o of ss.friendly_osids) allF.add(o);

// Get all hostile OSIDs that pobudje_2 faces
const pobudjeHostiles = [];
for (const eid of sec.edge_ids) {
  const sep = eid.indexOf('__');
  const a = eid.slice(0, sep), b = eid.slice(sep + 2);
  const friendly = allF.has(a) ? a : b;
  const hostile = friendly === a ? b : a;
  if (friendly === 'op:bratunac:pobudje_2') pobudjeHostiles.push(hostile);
}
console.log('pobudje_2 faces:', pobudjeHostiles);

// Build shared boundary adj (min_dist === 0 or undefined only)
const sharedAdj = new Map();
for (const e of g.edges) {
  if (e.min_dist !== undefined && e.min_dist > 0) continue;
  if (!sharedAdj.has(e.a)) sharedAdj.set(e.a, []);
  if (!sharedAdj.has(e.b)) sharedAdj.set(e.b, []);
  sharedAdj.get(e.a).push(e.b);
  sharedAdj.get(e.b).push(e.a);
}

// Build full adj
const fullAdj = new Map();
for (const e of g.edges) {
  if (!fullAdj.has(e.a)) fullAdj.set(e.a, []);
  if (!fullAdj.has(e.b)) fullAdj.set(e.b, []);
  fullAdj.get(e.a).push(e.b);
  fullAdj.get(e.b).push(e.a);
}

console.log('\nAll adjacencies between pobudje_2 hostile pairs:');
for (let i = 0; i < pobudjeHostiles.length; i++) {
  for (let j = i + 1; j < pobudjeHostiles.length; j++) {
    const a = pobudjeHostiles[i], b = pobudjeHostiles[j];
    const shared = (sharedAdj.get(a) || []).includes(b);
    const full = (fullAdj.get(a) || []).includes(b);
    if (shared || full) {
      console.log(`  ${a} <-> ${b}  shared:${shared}  full:${full}`);
    }
  }
}

// Also check: which OTHER friendly OSIDs bridge Srebrenica ↔ Cerska?
// i.e. same-friendly edges from BOTH Srebrenica and Cerska hostile OSIDs
console.log('\n--- ALL bridge-capable friendly OSIDs ---');
const edgeByFriendly = new Map();
for (const eid of sec.edge_ids) {
  const sep = eid.indexOf('__');
  const a = eid.slice(0, sep), b = eid.slice(sep + 2);
  const friendly = allF.has(a) ? a : b;
  const hostile = friendly === a ? b : a;
  if (!edgeByFriendly.has(friendly)) edgeByFriendly.set(friendly, []);
  edgeByFriendly.get(friendly).push({ eid, hostile });
}

const srebMunis = new Set(['srebrenica', 'bratunac']);
const cerskaMunis = new Set(['vlasenica', 'milici', 'zvornik']);

for (const [friendly, edges] of edgeByFriendly) {
  const hasSreb = edges.some(e => srebMunis.has(e.hostile.split(':')[1]));
  const hasCerska = edges.some(e => cerskaMunis.has(e.hostile.split(':')[1]));
  if (hasSreb && hasCerska) {
    console.log(`BRIDGE: ${friendly}`);
    for (const e of edges) {
      const mun = e.hostile.split(':')[1];
      const side = srebMunis.has(mun) ? 'SREB' : cerskaMunis.has(mun) ? 'CERSKA' : 'OTHER';
      console.log(`  -> ${e.hostile} [${side}]`);
    }
    // Check hostile pair adj via shared boundary
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const hi = edges[i].hostile, hj = edges[j].hostile;
        const side_i = srebMunis.has(hi.split(':')[1]) ? 'SREB' : 'CERSKA';
        const side_j = srebMunis.has(hj.split(':')[1]) ? 'SREB' : 'CERSKA';
        if (side_i !== side_j) {
          const shared = (sharedAdj.get(hi) || []).includes(hj);
          const full = (fullAdj.get(hi) || []).includes(hj);
          if (shared) console.log(`  SHARED BOUNDARY BRIDGE: ${hi} <-> ${hj}`);
          else if (full) console.log(`  DISTANCE CONTACT ONLY: ${hi} <-> ${hj}`);
        }
      }
    }
  }
}

// Also check Case B bridges: same hostile, friendly OSIDs from different clusters
console.log('\n--- Case B bridge check ---');
const edgeByHostile = new Map();
for (const eid of sec.edge_ids) {
  const sep = eid.indexOf('__');
  const a = eid.slice(0, sep), b = eid.slice(sep + 2);
  const friendly = allF.has(a) ? a : b;
  const hostile = friendly === a ? b : a;
  if (!edgeByHostile.has(hostile)) edgeByHostile.set(hostile, []);
  edgeByHostile.get(hostile).push({ eid, friendly });
}

for (const [hostile, edges] of edgeByHostile) {
  const hasSreb = edges.some(e => srebMunis.has(e.friendly.split(':')[1]));
  const hasCerska = edges.some(e => cerskaMunis.has(e.friendly.split(':')[1]));
  if (hasSreb && hasCerska) {
    console.log(`Case B BRIDGE hostile: ${hostile}`);
    for (const e of edges) console.log(`  friendly: ${e.friendly}`);
    // Check friendly pair adj
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const fi = edges[i].friendly, fj = edges[j].friendly;
        const shared = (sharedAdj.get(fi) || []).includes(fj);
        if (shared) console.log(`  SHARED BOUNDARY: ${fi} <-> ${fj}`);
      }
    }
  }
}
