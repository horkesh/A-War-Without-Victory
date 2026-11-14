// Battles targeting the given OSIDs: who attacked, under which op, and outcome.
const fs = require('fs');
const path = require('path');
const runDir = process.argv[2];
const targets = new Set(process.argv[3].split(','));
for (const line of fs.readFileSync(path.join(runDir, 'weekly_report.jsonl'), 'utf8').split('\n')) {
  if (!line) continue;
  const o = JSON.parse(line);
  for (const b of o.battles || []) {
    const tgt = b.target_osid || b.defender_osid || b.settlement_id || (b.battle_id || '').split(':').slice(1, 4).join(':');
    if (![...targets].some((t) => (b.battle_id || '').includes(t) || tgt === t)) continue;
    console.log('t' + o.week_index, b.battle_id, 'att', b.attacker_brigade, b.attacker_faction, 'won', b.attacker_won, 'def', b.defender_brigade || '-', 'op', b.operation_id || b.op_id || b.source || '-');
  }
}
