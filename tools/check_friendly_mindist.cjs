const fs = require('fs');
const graph = JSON.parse(fs.readFileSync('data/derived/operational/operational_contact_graph.json', 'utf8'));
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));

const sec = save.military.corps_front_sectors['sector:arbih_2nd_corps:4'];
const allF = new Set();
for (const ss of sec.sub_segments) for (const o of ss.friendly_osids) allF.add(o);

const srebMunis = new Set(['srebrenica', 'bratunac']);
const cerskaMunis = new Set(['vlasenica']);

// Find all edges between sector friendly OSIDs
const friendlyEdges = [];
for (const e of graph.edges) {
  if (allF.has(e.a) && allF.has(e.b)) {
    const aSreb = srebMunis.has(e.a.split(':')[1]);
    const bSreb = srebMunis.has(e.b.split(':')[1]);
    const aCerska = cerskaMunis.has(e.a.split(':')[1]);
    const bCerska = cerskaMunis.has(e.b.split(':')[1]);
    const crossArea = (aSreb && bCerska) || (aCerska && bSreb);
    friendlyEdges.push({
      a: e.a, b: e.b,
      min_dist: e.min_dist,
      type: e.type,
      crossArea
    });
  }
}

friendlyEdges.sort((a, b) => (a.min_dist || 0) - (b.min_dist || 0));

console.log('Edges between sector friendly OSIDs:');
for (const e of friendlyEdges) {
  const tag = e.crossArea ? '*** CROSS-AREA ***' : 'within-area';
  console.log(`  ${e.a.split(':').slice(1).join(':')} <-> ${e.b.split(':').slice(1).join(':')} min_dist=${e.min_dist} [${tag}]`);
}

// Also check ALL RBiH OSID pairs in the area (not just front OSIDs)
const pc = save.political.political_controllers;
const areaRbihOsids = new Set();
for (const [osid, ctrl] of Object.entries(pc)) {
  if (ctrl !== 'RBiH') continue;
  const mun = osid.split(':')[1];
  if (srebMunis.has(mun) || cerskaMunis.has(mun)) areaRbihOsids.add(osid);
}

console.log('\nAll RBiH edges in the area:');
const areaEdges = [];
for (const e of graph.edges) {
  if (areaRbihOsids.has(e.a) && areaRbihOsids.has(e.b)) {
    const aSreb = srebMunis.has(e.a.split(':')[1]);
    const bSreb = srebMunis.has(e.b.split(':')[1]);
    const aCerska = cerskaMunis.has(e.a.split(':')[1]);
    const bCerska = cerskaMunis.has(e.b.split(':')[1]);
    const crossArea = (aSreb && bCerska) || (aCerska && bSreb);
    areaEdges.push({ a: e.a, b: e.b, min_dist: e.min_dist, crossArea });
  }
}
areaEdges.sort((a, b) => (a.min_dist || 0) - (b.min_dist || 0));

const withinArea = areaEdges.filter(e => !e.crossArea);
const crossArea = areaEdges.filter(e => e.crossArea);
console.log(`  Within-area: ${withinArea.length} edges, min_dist range: ${withinArea[0]?.min_dist} - ${withinArea[withinArea.length-1]?.min_dist}`);
console.log(`  Cross-area: ${crossArea.length} edges`);
for (const e of crossArea) {
  console.log(`    ${e.a.split(':').slice(1).join(':')} <-> ${e.b.split(':').slice(1).join(':')} min_dist=${e.min_dist}`);
}

// Find a threshold that separates cross-area from within-area
if (crossArea.length > 0 && withinArea.length > 0) {
  const maxWithin = Math.max(...withinArea.map(e => e.min_dist || 0));
  const minCross = Math.min(...crossArea.map(e => e.min_dist || 0));
  console.log(`\nMax within-area min_dist: ${maxWithin}`);
  console.log(`Min cross-area min_dist: ${minCross}`);
  if (minCross > maxWithin) {
    console.log(`SEPARABLE! Threshold between ${maxWithin} and ${minCross}`);
  } else {
    console.log(`NOT separable by min_dist alone`);
  }
}
