// Read-only: the Donji Vakuf local sequence from April 1992 to the January checkpoint —
// which event fired when, and every control event on the municipality's ten cells.
//
//   node logs/donji-vakuf-early-sequence-20260917/dv_sequence.cjs <run_dir>
//
// Turn N boundary date = 1992-04-06 + 7N days (src/ui/map/utils/formatters.ts).
const fs = require('fs');
const dir = process.argv[2];

const date = (t) => {
  const d = new Date('1992-04-06T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + t * 7);
  return d.toISOString().slice(0, 10);
};

const save = JSON.parse(fs.readFileSync(dir + '/final_save.json', 'utf8'));
const init = save.political.initial_political_controllers || {};
const events = (save.political.control_events || []).slice().sort((a, b) => a.turn - b.turn);

console.log('=== event rows fired (from weekly_report) ===');
const weekly = fs.readFileSync(dir + '/weekly_report.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
let seen = 0;
for (const w of weekly) {
  for (const e of w.events_fired || []) {
    const id = typeof e === 'string' ? e : (e.id ?? e.event_id ?? JSON.stringify(e));
    if (!/donji_vakuf/.test(String(id))) continue;
    console.log('  t' + String(w.week_index).padStart(3) + ' ' + date(w.week_index) + '  ' + id);
    seen += 1;
  }
}
if (seen === 0) console.log('  (none fired)');

console.log('');
console.log('=== control history, all op:donji_vakuf cells ===');
const cells = [...new Set(Object.keys(init).filter((o) => o.startsWith('op:donji_vakuf:')))].sort();
for (const osid of cells) {
  const hits = events.filter((e) => (e.settlement_id || e.osid) === osid);
  const line = hits.map((h) => 't' + h.turn + ' ' + date(h.turn) + ' ' + h.from + '->' + h.to + ' [' + h.mechanism + (h.attacker_brigade ? ' ' + h.attacker_brigade : '') + ']').join('  |  ');
  console.log('  ' + osid.padEnd(34) + ' t0=' + String(init[osid]).padEnd(5) + ' ' + (line || '(no control events)'));
}

console.log('');
console.log('=== Operation Donji Vakuf diagnostics ===');
for (const w of weekly) {
  for (const d of w.operation_diagnostics || []) {
    if (!String(d.operation_name).includes('Donji Vakuf')) continue;
    console.log('  t' + String(w.week_index).padStart(3) + ' ' + date(w.week_index) +
      ' phase=' + String(d.operation_phase).padEnd(10) +
      ' obj=' + String(d.current_objective).padEnd(32) +
      ' atk=' + d.attack_attempt_count + ' bat=' + d.battle_count +
      ' elig=' + d.eligible_attacker_count + ' caps=' + d.objective_capture_count +
      ' rec=' + String(d.recovery_reason) +
      ' skipped=' + JSON.stringify(d.skipped_attack_orders) +
      ' invalid=' + JSON.stringify(d.invalidation_reasons));
  }
}
