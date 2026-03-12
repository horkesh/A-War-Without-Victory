/**
 * Diagnostic: Investigate ALL destroyed/dissolved/inactive brigades in the latest 40w save.
 * Categorizes: combat-killed vs dissolution vs phantom withdrawal vs bugs.
 */
const fs = require('fs');
const path = require('path');

const savePath = path.join(__dirname, '..', 'data', 'derived', 'latest_run_final_save.json');
const raw = fs.readFileSync(savePath, 'utf-8');
const save = JSON.parse(raw);

const state = save.state || save;
const formations = state.military?.formations || {};
const politicalControllers = state.political?.political_controllers || {};
const casualtyLedger = state.military?.casualty_ledger || {};
const currentTurn = state.current_turn || state.turn || 'unknown';

console.log(`=== BRIGADE DESTRUCTION DIAGNOSTIC ===`);
console.log(`Save turn: ${currentTurn}`);
console.log(`Total formations: ${Object.keys(formations).length}`);
console.log();

// Collect all non-active formations
const nonActive = [];
const active = [];
const zombies = []; // active but 0 or near-0 personnel
const MIN_COMBAT_PERSONNEL = 100;

for (const [fid, f] of Object.entries(formations)) {
  if (f.status !== 'active') {
    nonActive.push({ id: fid, ...f });
  } else {
    active.push({ id: fid, ...f });
    if ((f.personnel || 0) <= 0) {
      zombies.push({ id: fid, personnel: f.personnel, faction: f.faction, name: f.name });
    }
  }
}

console.log(`Active formations: ${active.length}`);
console.log(`Non-active formations: ${nonActive.length}`);
console.log();

// Helper: check if OSID is controlled by faction
function isOsidFriendly(osid, faction) {
  if (!osid || !faction) return 'N/A';
  const controller = politicalControllers[osid];
  return controller === faction ? 'YES' : `NO (${controller || 'uncontrolled'})`;
}

// Helper: get formation casualties from ledger
function getLedgerCasualties(fid, faction) {
  for (const factionId of Object.keys(casualtyLedger)) {
    const fl = casualtyLedger[factionId];
    if (fl?.per_formation?.[fid]) {
      const c = fl.per_formation[fid];
      return { killed: c.killed || 0, wounded: c.wounded || 0, missing: c.missing_captured || 0, total: (c.killed||0) + (c.wounded||0) + (c.missing_captured||0) };
    }
  }
  return null;
}

// Categorize non-active formations
const categories = {
  combat_destroyed: [],    // Has battle history + casualties
  dissolution: [],         // Low stats, dissolved by dissolution system
  phantom_withdrawal: [],  // JNA phantoms withdrawn
  never_fought: [],        // No battle history at all
  other: [],
};

for (const f of nonActive) {
  const history = f.brigade_history || f.history || null;
  const battlesFought = history?.battles_fought || 0;
  const engagements = history?.engagements || [];
  const ledgerCas = getLedgerCasualties(f.id, f.faction);
  const hasBattleHistory = battlesFought > 0 || engagements.length > 0;
  const hasCasualties = ledgerCas && ledgerCas.total > 0;
  const isPhantom = (f.tags || []).some(t => t.startsWith('phantom:') || t === 'phantom') || f.is_phantom || f.withdrawal_turn != null;
  const locOsid = f.location_osid || f.osid || null;

  const record = {
    id: f.id,
    name: f.name || f.id,
    faction: f.faction,
    corps_id: f.corps_id,
    kind: f.kind,
    status: f.status,
    lifecycle_status: f.lifecycle_status || 'N/A',
    personnel: f.personnel ?? 'N/A',
    morale: f.morale ?? 'N/A',
    cohesion: f.cohesion ?? 'N/A',
    location_osid: locOsid,
    home_osid: f.home_osid || 'N/A',
    home_osid_valid: f.home_osid ? (politicalControllers[f.home_osid] !== undefined ? 'EXISTS' : 'MISSING') : 'N/A',
    location_friendly: isOsidFriendly(locOsid, f.faction),
    battles_fought: battlesFought,
    engagements_count: engagements.length,
    has_battle_history: hasBattleHistory,
    ledger_casualties: ledgerCas,
    total_casualties_taken: history?.total_casualties_taken || 0,
    total_casualties_inflicted: history?.total_casualties_inflicted || 0,
    is_phantom: isPhantom,
    withdrawal_turn: f.withdrawal_turn,
    tags: f.tags || [],
    dissolution_reason: f.dissolution_reason || null,
    disrupted_turns: f.disrupted_turns || 0,
    first_battle_turn: history?.first_battle_turn ?? null,
    last_engagement: engagements.length > 0 ? engagements[engagements.length - 1] : null,
  };

  // Categorize
  if (isPhantom && (f.lifecycle_status === 'withdrawn' || f.withdrawal_turn != null)) {
    categories.phantom_withdrawal.push(record);
  } else if (!hasBattleHistory && !hasCasualties) {
    categories.never_fought.push(record);
  } else if (f.lifecycle_status === 'destroyed' && hasBattleHistory) {
    // Check if likely dissolution (low stats) vs combat kill
    // Dissolution sets personnel=0 after the fact, but history tells us
    const lastEng = engagements.length > 0 ? engagements[engagements.length - 1] : null;
    // If total_casualties_taken is high relative to peak, likely combat attrition → dissolution
    categories.combat_destroyed.push(record);
  } else if (f.lifecycle_status === 'destroyed' && !hasBattleHistory && hasCasualties) {
    // Casualties but no engagements? Suspicious
    categories.other.push(record);
  } else {
    categories.other.push(record);
  }
}

// Print report
function printFormation(r, idx) {
  console.log(`  ${idx + 1}. ${r.id} — "${r.name}"`);
  console.log(`     Faction: ${r.faction} | Corps: ${r.corps_id} | Kind: ${r.kind}`);
  console.log(`     Status: ${r.status} | Lifecycle: ${r.lifecycle_status}`);
  console.log(`     Personnel: ${r.personnel} | Morale: ${r.morale} | Cohesion: ${r.cohesion}`);
  console.log(`     Location: ${r.location_osid} (friendly: ${r.location_friendly})`);
  console.log(`     Home OSID: ${r.home_osid} (valid: ${r.home_osid_valid})`);
  console.log(`     Battles fought: ${r.battles_fought} | Engagements recorded: ${r.engagements_count}`);
  console.log(`     Casualties taken (history): ${r.total_casualties_taken} | Inflicted: ${r.total_casualties_inflicted}`);
  if (r.ledger_casualties) {
    console.log(`     Casualty ledger: KIA=${r.ledger_casualties.killed} WIA=${r.ledger_casualties.wounded} MIA=${r.ledger_casualties.missing} TOTAL=${r.ledger_casualties.total}`);
  } else {
    console.log(`     Casualty ledger: NO ENTRY`);
  }
  if (r.is_phantom) console.log(`     PHANTOM: withdrawal_turn=${r.withdrawal_turn}`);
  if (r.dissolution_reason) console.log(`     Dissolution reason: ${r.dissolution_reason}`);
  if (r.tags.length > 0) console.log(`     Tags: ${r.tags.join(', ')}`);
  if (r.first_battle_turn != null) console.log(`     First battle: turn ${r.first_battle_turn}`);
  if (r.last_engagement) {
    const le = r.last_engagement;
    console.log(`     Last engagement: turn ${le.turn}, ${le.role} at ${le.osid}, outcome=${le.outcome}, cas_taken=${le.casualties_taken}`);
  }
  if (r.disrupted_turns > 0) console.log(`     Disrupted turns remaining: ${r.disrupted_turns}`);
  console.log();
}

// ============ COMBAT DESTROYED ============
console.log(`\n${'='.repeat(70)}`);
console.log(`CATEGORY 1: COMBAT-DESTROYED (has battle history + destroyed lifecycle)`);
console.log(`Count: ${categories.combat_destroyed.length}`);
console.log(`${'='.repeat(70)}`);
categories.combat_destroyed.forEach(printFormation);

// ============ PHANTOM WITHDRAWAL ============
console.log(`\n${'='.repeat(70)}`);
console.log(`CATEGORY 2: PHANTOM/JNA WITHDRAWAL`);
console.log(`Count: ${categories.phantom_withdrawal.length}`);
console.log(`${'='.repeat(70)}`);
categories.phantom_withdrawal.forEach(printFormation);

// ============ NEVER FOUGHT ============
console.log(`\n${'='.repeat(70)}`);
console.log(`CATEGORY 3: NEVER FOUGHT (no battle history, no casualties)`);
console.log(`Count: ${categories.never_fought.length}`);
console.log(`${'='.repeat(70)}`);
categories.never_fought.forEach(printFormation);

// ============ OTHER ============
console.log(`\n${'='.repeat(70)}`);
console.log(`CATEGORY 4: OTHER / UNCATEGORIZED`);
console.log(`Count: ${categories.other.length}`);
console.log(`${'='.repeat(70)}`);
categories.other.forEach(printFormation);

// ============ ZOMBIE CHECK ============
console.log(`\n${'='.repeat(70)}`);
console.log(`ZOMBIE CHECK: Active formations with 0 personnel`);
console.log(`Count: ${zombies.length}`);
console.log(`${'='.repeat(70)}`);
zombies.forEach((z, i) => {
  console.log(`  ${i+1}. ${z.id} — "${z.name}" (${z.faction}) personnel=${z.personnel}`);
});

// Near-zombie check (at MIN_COMBAT_PERSONNEL threshold)
const nearZombies = active.filter(f => (f.personnel || 0) > 0 && (f.personnel || 0) <= MIN_COMBAT_PERSONNEL);
console.log(`\nNEAR-ZOMBIE: Active formations with 1-${MIN_COMBAT_PERSONNEL} personnel`);
console.log(`Count: ${nearZombies.length}`);
nearZombies.forEach((f, i) => {
  console.log(`  ${i+1}. ${f.id} — "${f.name}" (${f.faction}) personnel=${f.personnel} morale=${f.morale} cohesion=${f.cohesion}`);
});

// Low-personnel active (100-300 range)
const lowPersonnel = active.filter(f => (f.personnel || 0) > MIN_COMBAT_PERSONNEL && (f.personnel || 0) <= 300);
console.log(`\nLOW PERSONNEL: Active formations with ${MIN_COMBAT_PERSONNEL+1}-300 personnel`);
console.log(`Count: ${lowPersonnel.length}`);
lowPersonnel.forEach((f, i) => {
  const h = f.brigade_history || {};
  console.log(`  ${i+1}. ${f.id} — "${f.name}" (${f.faction}) pers=${f.personnel} morale=${f.morale} coh=${f.cohesion} battles=${h.battles_fought||0}`);
});

// ============ SUMMARY ============
console.log(`\n${'='.repeat(70)}`);
console.log(`SUMMARY`);
console.log(`${'='.repeat(70)}`);
console.log(`Total formations: ${Object.keys(formations).length}`);
console.log(`  Active: ${active.length}`);
console.log(`  Non-active: ${nonActive.length}`);
console.log(`    Combat-destroyed (fought): ${categories.combat_destroyed.length}`);
console.log(`    Phantom withdrawal: ${categories.phantom_withdrawal.length}`);
console.log(`    Never fought: ${categories.never_fought.length}`);
console.log(`    Other: ${categories.other.length}`);
console.log(`  Zombies (active, 0 pers): ${zombies.length}`);
console.log(`  Near-zombies (active, 1-${MIN_COMBAT_PERSONNEL} pers): ${nearZombies.length}`);
console.log(`  Low-personnel (active, ${MIN_COMBAT_PERSONNEL+1}-300 pers): ${lowPersonnel.length}`);

// Faction breakdown of destroyed
console.log(`\nDestroyed by faction:`);
const byFaction = {};
for (const r of nonActive) {
  const key = r.faction || 'unknown';
  byFaction[key] = (byFaction[key] || 0) + 1;
}
for (const [f, c] of Object.entries(byFaction).sort()) {
  console.log(`  ${f}: ${c}`);
}

// Cross-check: destroyed formations WITH ledger entries vs WITHOUT
const withLedger = nonActive.filter(f => getLedgerCasualties(f.id, f.faction) !== null);
const withoutLedger = nonActive.filter(f => getLedgerCasualties(f.id, f.faction) === null);
console.log(`\nCasualty ledger cross-check:`);
console.log(`  Non-active WITH ledger entry: ${withLedger.length}`);
console.log(`  Non-active WITHOUT ledger entry: ${withoutLedger.length}`);

// Check: formations in enemy territory at death
const inEnemyTerritory = categories.combat_destroyed.filter(r =>
  r.location_friendly && !r.location_friendly.startsWith('YES') && r.location_friendly !== 'N/A'
);
console.log(`\nCombat-destroyed in enemy territory at death: ${inEnemyTerritory.length}`);
inEnemyTerritory.forEach(r => {
  console.log(`  ${r.id} at ${r.location_osid} (${r.location_friendly})`);
});

// Check: non-active whose home_osid is in enemy hands
const homeLost = nonActive.filter(f => {
  const homeCtrl = politicalControllers[f.home_osid];
  return homeCtrl && homeCtrl !== f.faction;
});
console.log(`\nNon-active whose home_osid fell to enemy: ${homeLost.length}`);
homeLost.forEach(f => {
  const ctrl = politicalControllers[f.home_osid];
  console.log(`  ${f.id} (${f.faction}) home=${f.home_osid} now controlled by ${ctrl}`);
});
