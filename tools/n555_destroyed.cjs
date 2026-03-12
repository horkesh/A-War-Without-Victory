const s = require('../data/derived/latest_run_final_save.json');
const f = s.military.formations;
const l = s.military.casualty_ledger;

console.log('=== Destroyed Brigades Detail ===');
for (const [id, fm] of Object.entries(f)) {
  if (fm.kind !== 'brigade' || fm.status !== 'inactive') continue;
  const isEnclave = fm.tags && fm.tags.includes('enclave');
  const battles = fm.brigade_history?.battle_count || fm.brigade_history?.engagements?.length || 0;
  const homeOsid = fm.home_osid || '?';
  const locOsid = fm.location_osid || '?';
  const corps = fm.corps_id || '?';
  // Check if home OSID is still faction-controlled
  const pc = s.political_controllers || {};
  const homeCtrl = pc[homeOsid] || '?';
  const homeLost = homeCtrl !== fm.faction;
  console.log(`  ${id}`);
  console.log(`    faction: ${fm.faction}, corps: ${corps}, enclave: ${isEnclave || false}`);
  console.log(`    home: ${homeOsid} (ctrl: ${homeCtrl}, lost: ${homeLost})`);
  console.log(`    last_loc: ${locOsid}, battles: ${battles}`);
  console.log(`    lifecycle: ${fm.lifecycle_status}`);
  console.log(`    final morale: ${fm.morale}, cohesion: ${fm.cohesion}`);
}

// Also show near-dissolution active brigades
console.log('\n=== Near-dissolution active brigades (pers < 300) ===');
for (const [id, fm] of Object.entries(f)) {
  if (fm.kind !== 'brigade' || fm.status !== 'active') continue;
  if ((fm.personnel || 0) >= 300) continue;
  const isEnclave = fm.tags && fm.tags.includes('enclave');
  const homeOsid = fm.home_osid || '?';
  const pc = s.political_controllers || {};
  const homeCtrl = pc[homeOsid] || '?';
  const homeLost = homeCtrl !== fm.faction;
  console.log(`  ${id} — pers: ${fm.personnel}, morale: ${fm.morale}, coh: ${fm.cohesion}, home: ${homeOsid} (lost: ${homeLost}) ${isEnclave ? '[ENCLAVE]' : ''}`);
}
