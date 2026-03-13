const aars = require('../runs/apr1992_definitive_40w__1062074ab386fe0c__w40_n665/operation_aars.json');
const summary = require('../runs/apr1992_definitive_40w__1062074ab386fe0c__w40_n665/run_summary.json');

// Overall attack stats
const ar = summary.attack_resolution;
console.log('=== ATTACK RESOLUTION (n665, REACTIVE_DEFENSE_RATIO=1.5) ===');
console.log('Orders:', ar.orders_processed, '(RS:', ar.orders_by_faction.RS, ', RBiH:', ar.orders_by_faction.RBiH, ', HRHB:', ar.orders_by_faction.HRHB + ')');
console.log('Battles (defender present):', ar.defender_present_battles);
console.log('Undefended captures:', ar.defender_absent_battles);
console.log('Flips:', ar.flips_applied);
console.log('Attacker casualties:', ar.casualty_attacker);
console.log('Defender casualties:', ar.casualty_defender);
console.log('Exchange ratio (att:def):', (ar.casualty_attacker / ar.casualty_defender).toFixed(2) + ':1');

// Per-faction operation analysis
console.log('\n=== FACTION OPERATION SUMMARY ===');
const byFaction = {};
for (const aar of aars) {
  const f = aar.faction;
  if (!byFaction[f]) byFaction[f] = { ops: 0, successes: 0, failures: 0, objsCaptured: 0, objsTargeted: 0, totalKIA: 0, totalInflictedKIA: 0, attacks: 0 };
  byFaction[f].ops++;
  if (aar.outcome === 'success' || aar.outcome === 'partial_success') byFaction[f].successes++;
  else byFaction[f].failures++;
  byFaction[f].objsCaptured += (aar.objectives_captured || []).length;
  byFaction[f].objsTargeted += (aar.objectives_targeted || []).length;
  byFaction[f].totalKIA += aar.casualties_suffered ? aar.casualties_suffered.killed : 0;
  byFaction[f].totalInflictedKIA += aar.casualties_inflicted ? aar.casualties_inflicted.killed : 0;
  byFaction[f].attacks += aar.total_attacks || 0;
}

for (const [f, d] of Object.entries(byFaction).sort()) {
  const sr = d.ops > 0 ? (d.successes / d.ops * 100).toFixed(1) : '0';
  const er = d.totalInflictedKIA > 0 ? (d.totalKIA / d.totalInflictedKIA).toFixed(1) : 'inf';
  const cr = d.objsTargeted > 0 ? (d.objsCaptured / d.objsTargeted * 100).toFixed(1) : '0';
  console.log(f + ': ' + d.ops + ' ops, ' + d.successes + '/' + d.ops + ' success (' + sr + '%), ' + d.attacks + ' attacks, obj ' + d.objsCaptured + '/' + d.objsTargeted + ' (' + cr + '%), ' + d.totalKIA + ' KIA, exch ' + er + ':1');
}

// Per-op detail
console.log('\n=== ALL OPERATIONS (by stars desc) ===');
aars.sort((a, b) => (b.grade ? b.grade.stars : 0) - (a.grade ? a.grade.stars : 0));
for (const aar of aars) {
  const stars = aar.grade ? aar.grade.stars : 0;
  const verdict = aar.grade ? aar.grade.verdict : 'n/a';
  const objs = (aar.objectives_captured || []).length + '/' + (aar.objectives_targeted || []).length;
  const kia = aar.casualties_suffered ? aar.casualties_suffered.killed : 0;
  const inflicted = aar.casualties_inflicted ? aar.casualties_inflicted.killed : 0;
  const exch = inflicted > 0 ? (kia / inflicted).toFixed(1) : 'inf';
  const strength = aar.initial_strength > 0 ? ((1 - aar.final_strength / aar.initial_strength) * 100).toFixed(0) : '?';
  console.log('  [' + '*'.repeat(stars) + '-'.repeat(5 - stars) + '] ' + aar.operation_name + ' (' + aar.faction + ' ' + aar.corps_id + ') — ' + verdict);
  console.log('         w' + aar.started_turn + '-w' + aar.ended_turn + ' | ' + aar.total_attacks + ' atk | obj ' + objs + ' | ' + kia + ' KIA (exch ' + exch + ':1) | -' + strength + '% str | cmd: ' + (aar.commander_name || 'none'));
}

// Casualty exchange per week
console.log('\n=== WEEKLY CASUALTY EXCHANGE ===');
const weekly = summary.attack_resolution_weekly || [];
for (const w of weekly) {
  if (w.casualty_attacker === 0 && w.casualty_defender === 0) continue;
  const ratio = w.casualty_defender > 0 ? (w.casualty_attacker / w.casualty_defender).toFixed(2) : 'inf';
  console.log('  w' + w.week + ': att=' + w.casualty_attacker + ' def=' + w.casualty_defender + ' ratio=' + ratio + ':1 battles=' + (w.defender_present_battles || 0) + ' flips=' + (w.flips_applied || 0));
}
