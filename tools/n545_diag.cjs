const s = require('../data/derived/latest_run_final_save.json');
const f = s.military.formations;
let active = 0, inactive = 0, enclave = 0, enclaveActive = 0;
const byFac = {};
for (const [id, fm] of Object.entries(f)) {
  if (fm.kind !== 'brigade') continue;
  const fac = fm.faction;
  if (!byFac[fac]) byFac[fac] = {a: 0, i: 0, p: 0};
  if (fm.status === 'active') { active++; byFac[fac].a++; byFac[fac].p += (fm.personnel || 0); }
  else { inactive++; byFac[fac].i++; }
  if (fm.tags && fm.tags.includes('enclave')) { enclave++; if (fm.status === 'active') enclaveActive++; }
}
console.log('Active:', active, 'Inactive:', inactive, 'Enclave active:', enclaveActive, '/', enclave);
for (const [fac, d] of Object.entries(byFac).sort()) {
  console.log(fac, '- active:', d.a, 'inactive:', d.i, 'totalPers:', d.p);
}

// Casualty ledger
const l = s.military.casualty_ledger;
let grandKIA = 0, grandWIA = 0, grandMIA = 0;
for (const [fac, entry] of Object.entries(l)) {
  if (typeof entry.killed !== 'number') continue;
  const total = entry.killed + entry.wounded + entry.missing_captured;
  console.log('\nCasualties', fac, '- KIA:', entry.killed, 'WIA:', entry.wounded, 'MIA:', entry.missing_captured, 'Total:', total);
  grandKIA += entry.killed;
  grandWIA += entry.wounded;
  grandMIA += entry.missing_captured;
}
console.log('TOTAL - KIA:', grandKIA, 'WIA:', grandWIA, 'MIA:', grandMIA, 'Grand:', grandKIA + grandWIA + grandMIA);

// Count destroyed brigades and their lifecycle
console.log('\n=== Destroyed Brigades ===');
let destroyed = 0;
for (const [id, fm] of Object.entries(f)) {
  if (fm.kind !== 'brigade') continue;
  if (fm.status === 'inactive') {
    destroyed++;
    console.log(' ', id, '- lifecycle:', fm.lifecycle_status, 'pers:', fm.personnel, 'faction:', fm.faction);
  }
}
console.log('Total destroyed:', destroyed);

// Low-personnel active brigades
console.log('\n=== Active brigades <500 personnel ===');
let low = 0;
for (const [id, fm] of Object.entries(f)) {
  if (fm.kind !== 'brigade' || fm.status !== 'active') continue;
  if ((fm.personnel || 0) < 500) {
    low++;
    const isEnc = fm.tags && fm.tags.includes('enclave') ? ' [ENCLAVE]' : '';
    console.log(' ', id, '- pers:', fm.personnel, 'morale:', fm.morale, 'faction:', fm.faction + isEnc);
  }
}
console.log('Count:', low);

// Turn count
console.log('\nTurn:', s.meta.turn, 'Week:', Math.floor(s.meta.turn));
