const s = require('../data/derived/latest_run_final_save.json');
const formations = s.military.formations || {};
const ledger = s.military.casualty_ledger || {};

// Total casualties
let totalCas = { KIA: 0, WIA: 0, MIA: 0 };
let byCas = {};
for (const [fid, entry] of Object.entries(ledger)) {
  const f = formations[fid];
  const faction = f?.faction || entry?.faction || 'unknown';
  if (!byCas[faction]) byCas[faction] = { KIA: 0, WIA: 0, MIA: 0 };
  byCas[faction].KIA += (entry.kia || 0);
  byCas[faction].WIA += (entry.wia || 0);
  byCas[faction].MIA += (entry.mia || 0);
  totalCas.KIA += (entry.kia || 0);
  totalCas.WIA += (entry.wia || 0);
  totalCas.MIA += (entry.mia || 0);
}
console.log('=== Casualties ===');
for (const [f, c] of Object.entries(byCas).sort()) {
  console.log(f, '— KIA:', c.KIA, 'WIA:', c.WIA, 'MIA:', c.MIA, 'Total:', c.KIA + c.WIA + c.MIA);
}
console.log('TOTAL — KIA:', totalCas.KIA, 'WIA:', totalCas.WIA, 'MIA:', totalCas.MIA, 'Total:', totalCas.KIA + totalCas.WIA + totalCas.MIA);

// Destroyed brigades
console.log('\n=== Destroyed/Inactive Brigades ===');
let destroyedCount = 0;
for (const [fid, f] of Object.entries(formations)) {
  if (f.status === 'inactive' && f.kind === 'brigade') {
    destroyedCount++;
    const entry = ledger[fid];
    const battles = f.brigade_history?.battle_count || f.brigade_history?.engagements?.length || 0;
    console.log(' ', fid, '— pers:', f.personnel, 'lifecycle:', f.lifecycle_status, 'battles:', battles, 'cas:', entry ? entry.kia + entry.wia + entry.mia : 0);
  }
}
console.log('Total destroyed brigades:', destroyedCount);

// Gorazde enclave
console.log('\n=== Goražde Enclave Brigades ===');
const enclaveIds = ['arbih_801st_light', 'arbih_802nd_light', 'arbih_803rd_light', 'arbih_807th_muslim_liberation', 'arbih_808th_liberation', 'arbih_843rd_light', 'arbih_851st_vitezka_liberation'];
for (const id of enclaveIds) {
  const f = formations[id];
  if (f) console.log(' ', id, '— status:', f.status, 'pers:', f.personnel, 'morale:', f.morale, 'coh:', typeof f.cohesion === 'number' ? f.cohesion.toFixed(1) : f.cohesion);
  else console.log(' ', id, '— NOT FOUND');
}

// Near-dissolution
console.log('\n=== Active brigades <300 personnel ===');
let nearDiss = 0;
for (const [fid, f] of Object.entries(formations)) {
  if (f.status === 'active' && f.kind === 'brigade' && (f.personnel || 0) < 300) {
    nearDiss++;
    console.log(' ', fid, '— pers:', f.personnel, 'morale:', f.morale, 'faction:', f.faction);
  }
}
console.log('Count:', nearDiss);
