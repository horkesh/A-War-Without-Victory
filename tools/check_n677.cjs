const save = require('../data/derived/latest_run_final_save.json');
const brigs = save.military.formations;

// Check 707th location
const b707 = brigs['arbih_707th_slavna_mountain'];
if (b707) {
  console.log('707th: home=' + b707.home_osid + ' loc=' + b707.location_osid + ' corps_id=' + b707.corps_id + ' pers=' + b707.personnel);
}

// RS territory
const ctrl = save.political.political_controllers;
const counts = { RS: 0, RBiH: 0, HRHB: 0 };
for (const v of Object.values(ctrl)) counts[v] = (counts[v] || 0) + 1;
console.log('\nTerritory counts:', JSON.stringify(counts));
console.log('RS fraction:', (counts.RS / 744).toFixed(3));

// Benchmark check: RS w40 territory fraction
console.log('\n=== SECTOR CHECK: any sector crossing enemy territory? ===');
const sectors = save.military.corps_front_sectors;
for (const [sid, s] of Object.entries(sectors)) {
  if (!sid.startsWith('sector:arbih_')) continue;
  // Get all friendly OSIDs
  const friendlies = new Set();
  for (const eid of s.edge_ids) {
    const sep = eid.indexOf('__');
    const a = eid.slice(0, sep), b = eid.slice(sep + 2);
    if (ctrl[a] === 'RBiH') friendlies.add(a);
    else friendlies.add(b);
  }
  // Check lat span
  const muns = new Set();
  for (const f of friendlies) muns.add(f.split(':')[1]);
  if (muns.size >= 3) {
    console.log('  ' + sid + ': ' + s.edge_ids.length + ' edges, ' + muns.size + ' municipalities: ' + [...muns].join(', '));
  }
}

// Check 3rd Corps sectors — why does 3rd Corps have Ilijas/Olovo/Vares sectors?
console.log('\n=== 3rd Corps sector details ===');
for (const [sid, s] of Object.entries(sectors)) {
  if (!sid.startsWith('sector:arbih_3rd_corps:')) continue;
  const muns = new Set();
  for (const eid of s.edge_ids) {
    const sep = eid.indexOf('__');
    const a = eid.slice(0, sep).split(':')[1];
    const b = eid.slice(sep + 2).split(':')[1];
    muns.add(a);
    muns.add(b);
  }
  console.log('  ' + sid + ': ' + s.edge_ids.length + ' edges, muns: ' + [...muns].join(', '));
}

// What 3rd Corps brigades are in Ilijas/Olovo?
console.log('\n=== 3rd Corps brigades far from home ===');
for (const [id, f] of Object.entries(brigs)) {
  if (f.corps_id !== 'arbih_3rd_corps' || f.faction !== 'RBiH') continue;
  if (!f.location_osid) continue;
  const locMun = f.location_osid.split(':')[1];
  const homeMun = f.home_osid ? f.home_osid.split(':')[1] : '?';
  if (['ilijas', 'olovo', 'vares', 'breza', 'visoko'].includes(locMun)) {
    console.log('  ' + id + ': home=' + homeMun + ' loc=' + locMun + '(' + f.location_osid + ')');
  }
}
