// Diagnostic script for latest_run_final_save.json
const data = require('../data/derived/latest_run_final_save.json');
const mil = data.military;
const fmns = mil.formations;

console.log('=== SAVE DIAGNOSTIC ===');
console.log(`Turn: ${data.meta?.turn ?? 'unknown'}, Schema: ${data.schema_version}`);
console.log(`Total formations: ${Object.keys(fmns).length}\n`);

// 1. Destroyed/inactive formations
console.log('=== 1. DESTROYED / INACTIVE FORMATIONS ===');
const inactive = [];
for (const [id, f] of Object.entries(fmns)) {
  if (f.status !== 'active') {
    const bh = f.brigade_history || {};
    inactive.push({
      id,
      faction: f.faction,
      personnel: f.personnel,
      status: f.status,
      battles: bh.battles_fought || 0,
      engagements: (bh.engagements || []).length,
    });
  }
}
console.log(`Count: ${inactive.length}`);
if (inactive.length > 0) {
  console.table(inactive);
}

// 2. Goražde enclave brigades
console.log('\n=== 2. GORAŽDE ENCLAVE BRIGADES ===');
const gorazde = [
  'arbih_801st_light',
  'arbih_802nd_light',
  'arbih_803rd_light',
  'arbih_807th_muslim_liberation',
  'arbih_808th_liberation',
  'arbih_843rd_light',
  'arbih_851st_vitezka_liberation',
];
const gorazdeData = gorazde.map(id => {
  const f = fmns[id];
  if (!f) return { id, found: false };
  return {
    id,
    status: f.status,
    personnel: f.personnel,
    morale: f.morale,
    cohesion: f.cohesion,
    location_osid: f.location_osid,
    battles: (f.brigade_history || {}).battles_fought || 0,
  };
});
console.table(gorazdeData);

// 3. Casualty ledger
console.log('\n=== 3. CASUALTY LEDGER BY FACTION ===');
const cl = mil.casualty_ledger;
for (const faction of ['RBiH', 'RS', 'HRHB']) {
  const fc = cl[faction];
  if (!fc) { console.log(`${faction}: no data`); continue; }
  const kia = fc.killed || 0;
  const wia = fc.wounded || 0;
  const mia = fc.missing_captured || 0;
  console.log(`${faction}: KIA=${kia}, WIA=${wia}, MIA=${mia}, Total=${kia + wia + mia}`);
}
// Grand total
const allFactions = ['RBiH', 'RS', 'HRHB'];
let gKia = 0, gWia = 0, gMia = 0;
for (const f of allFactions) {
  const fc = cl[f];
  if (!fc) continue;
  gKia += fc.killed || 0;
  gWia += fc.wounded || 0;
  gMia += fc.missing_captured || 0;
}
console.log(`TOTAL: KIA=${gKia}, WIA=${gWia}, MIA=${gMia}, Grand=${gKia + gWia + gMia}`);

// 4. Inactive formations with personnel > 0 (dead-brigade-gets-reinforced bug)
console.log('\n=== 4. INACTIVE FORMATIONS WITH PERSONNEL > 0 (BUG CHECK) ===');
const buggy = inactive.filter(f => fmns[f.id].personnel > 0);
if (buggy.length === 0) {
  console.log('PASS: No inactive formations with personnel > 0');
} else {
  console.log(`BUG DETECTED: ${buggy.length} inactive formations have personnel > 0`);
  console.table(buggy.map(b => ({
    id: b.id,
    faction: b.faction,
    personnel: fmns[b.id].personnel,
    status: b.status,
  })));
}

// 5. rs_4th_ozren_light_infantry
console.log('\n=== 5. RS 4TH OZREN LIGHT INFANTRY ===');
const ozren = fmns['rs_4th_ozren_light_infantry'];
if (!ozren) {
  // Try fuzzy match
  const matches = Object.keys(fmns).filter(k => k.includes('ozren'));
  console.log('Not found by exact ID. Matches containing "ozren":', matches);
  if (matches.length > 0) {
    const f = fmns[matches[0]];
    console.log(`Using ${matches[0]}:`);
    console.log(JSON.stringify({
      status: f.status, personnel: f.personnel, morale: f.morale,
      cohesion: f.cohesion, location_osid: f.location_osid,
      corps_id: f.corps_id, posture: f.posture,
      battles: (f.brigade_history || {}).battles_fought || 0,
      home_osid: f.home_osid,
    }, null, 2));
  }
} else {
  console.log(JSON.stringify({
    status: ozren.status, personnel: ozren.personnel, morale: ozren.morale,
    cohesion: ozren.cohesion, location_osid: ozren.location_osid,
    corps_id: ozren.corps_id, posture: ozren.posture,
    battles: (ozren.brigade_history || {}).battles_fought || 0,
    home_osid: ozren.home_osid,
  }, null, 2));
}

// 6. Active brigades with personnel < 300
console.log('\n=== 6. ACTIVE BRIGADES WITH PERSONNEL < 300 (NEAR-DISSOLUTION) ===');
const lowPers = [];
for (const [id, f] of Object.entries(fmns)) {
  if (f.status === 'active' && f.personnel < 300) {
    lowPers.push({
      id,
      faction: f.faction,
      personnel: f.personnel,
      morale: f.morale,
      cohesion: f.cohesion,
      location_osid: f.location_osid,
      battles: (f.brigade_history || {}).battles_fought || 0,
    });
  }
}
lowPers.sort((a, b) => a.personnel - b.personnel);
console.log(`Count: ${lowPers.length}`);
if (lowPers.length > 0) {
  console.table(lowPers);
}

// Summary
console.log('\n=== SUMMARY ===');
const activeCount = Object.values(fmns).filter(f => f.status === 'active').length;
console.log(`Active: ${activeCount}, Inactive: ${inactive.length}`);
console.log(`Near-dissolution (active, <300 pers): ${lowPers.length}`);
console.log(`Bug (inactive w/ pers>0): ${buggy.length}`);
console.log(`Total casualties: ${gKia + gWia + gMia} (KIA ${gKia})`);
