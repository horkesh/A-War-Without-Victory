const s = require('../data/derived/latest_run_final_save.json');

// Check for battle history in save
if (s.military.battle_history) {
  console.log('Battle history entries:', s.military.battle_history.length);
} else {
  console.log('No battle_history in save');
}

// Check weekly summary if present
if (s.military.weekly_summary) {
  console.log('Weekly summary present');
} else {
  console.log('No weekly_summary');
}

// Check for any battle-count tracking on formations
const f = s.military.formations;
let totalBattleCount = 0;
let brigWithBattles = 0;
for (const [id, fm] of Object.entries(f)) {
  if (fm.kind !== 'brigade') continue;
  const bc = fm.brigade_history?.battle_count || fm.brigade_history?.engagements?.length || 0;
  if (bc > 0) {
    totalBattleCount += bc;
    brigWithBattles++;
  }
}
console.log('Brigades with battle history:', brigWithBattles, 'Total battle count:', totalBattleCount);

// Analyze per-formation casualty ledger
const ledger = s.military.casualty_ledger;
let formationEntries = 0;
let combatCas = 0, attritionCas = 0;
for (const [key, entry] of Object.entries(ledger)) {
  if (key === 'RS' || key === 'RBiH' || key === 'HRHB') continue; // faction-level
  if (typeof entry.killed === 'number') {
    formationEntries++;
  }
}
console.log('Formation-level ledger entries:', formationEntries);

// Check top casualties by formation
const formCas = [];
for (const [key, entry] of Object.entries(ledger)) {
  if (key === 'RS' || key === 'RBiH' || key === 'HRHB') continue;
  if (typeof entry.killed !== 'number') continue;
  const total = entry.killed + entry.wounded + entry.missing_captured;
  const fm = f[key];
  formCas.push({ id: key, total, killed: entry.killed, faction: fm?.faction || '?', status: fm?.status || '?', pers: fm?.personnel || 0 });
}
formCas.sort((a, b) => b.total - a.total);
console.log('\nTop 20 casualties by formation:');
for (const e of formCas.slice(0, 20)) {
  console.log(`  ${e.id} - cas: ${e.total} (KIA ${e.killed}) faction: ${e.faction} status: ${e.status} pers: ${e.pers}`);
}

// Check: are formation casualties double-counted vs faction totals?
const factionFromFormations = {};
for (const [key, entry] of Object.entries(ledger)) {
  if (key === 'RS' || key === 'RBiH' || key === 'HRHB') continue;
  if (typeof entry.killed !== 'number') continue;
  const fm = f[key];
  const fac = fm?.faction || 'unknown';
  if (!factionFromFormations[fac]) factionFromFormations[fac] = { killed: 0, wounded: 0, mia: 0 };
  factionFromFormations[fac].killed += entry.killed;
  factionFromFormations[fac].wounded += entry.wounded;
  factionFromFormations[fac].mia += entry.missing_captured;
}
console.log('\nFaction casualties from formation ledger sum:');
for (const [fac, d] of Object.entries(factionFromFormations).sort()) {
  console.log(`  ${fac}: KIA ${d.killed} WIA ${d.wounded} MIA ${d.mia} Total ${d.killed + d.wounded + d.mia}`);
}

console.log('\nFaction-level ledger (direct):');
for (const fac of ['RS', 'RBiH', 'HRHB']) {
  const e = ledger[fac];
  if (e && typeof e.killed === 'number') {
    console.log(`  ${fac}: KIA ${e.killed} WIA ${e.wounded} MIA ${e.missing_captured} Total ${e.killed + e.wounded + e.missing_captured}`);
  }
}
