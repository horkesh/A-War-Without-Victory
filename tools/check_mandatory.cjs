const fs = require('fs');
const oob = JSON.parse(fs.readFileSync('data/source/oob_brigades.json', 'utf8'));

const mand = oob.filter(b => b.mandatory === true);
console.log('Brigades with mandatory=true:', mand.length);
const byFaction = {};
for (const b of mand) {
  byFaction[b.faction] = (byFaction[b.faction] || 0) + 1;
}
console.log('By faction:', JSON.stringify(byFaction));

// Check RBiH 2nd Corps specifically
const corps2 = oob.filter(b => b.corps === 'arbih_2nd_corps');
const corps2mand = corps2.filter(b => b.mandatory === true);
console.log('\nRBiH 2nd Corps mandatory:', corps2mand.length, '/', corps2.length);

// Check RS East Bosnia
const rsEB = oob.filter(b => b.corps === 'vrs_east_bosnian');
const rsEBmand = rsEB.filter(b => b.mandatory === true);
console.log('RS East Bosnia mandatory:', rsEBmand.length, '/', rsEB.length);

// What does the mandatory field look like across all brigades?
const mandValues = {};
for (const b of oob) {
  const v = String(b.mandatory);
  mandValues[v] = (mandValues[v] || 0) + 1;
}
console.log('\nmandatory field values:', JSON.stringify(mandValues));

// How many are spawned at w0 per corps?
const isave = JSON.parse(fs.readFileSync('runs/apr1992_definitive_40w__3d15da15e1712ac8__w40_n627/initial_save.json', 'utf8'));
const w0ids = new Set(Object.keys(isave.military.formations));
console.log('\n--- Spawn rates by corps ---');
const corps = {};
for (const b of oob) {
  if (!corps[b.corps]) corps[b.corps] = { total: 0, spawned: 0 };
  corps[b.corps].total++;
  if (w0ids.has(b.id)) corps[b.corps].spawned++;
}
for (const [c, d] of Object.entries(corps).sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log(`  ${c}: ${d.spawned}/${d.total} (${(100*d.spawned/d.total).toFixed(0)}%)`);
}
