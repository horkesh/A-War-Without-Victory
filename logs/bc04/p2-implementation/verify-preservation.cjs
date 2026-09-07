const fs = require('node:fs');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const baseline = 'f117fe47536398add3a966d177b3dce54fc820ac';
const catalogPath = 'data/scenarios/events/war_1995.json';
const before = JSON.parse(cp.execFileSync('git', ['show', `${baseline}:${catalogPath}`], {encoding:'utf8'}));
const after = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const windows = new Set(['tuzla_gate_massacre_1995', 'un_hostage_crisis_1995']);
const dates = new Set([...windows, 'srebrenica_falls_1995', 'srebrenica_column_breakout_1995', 'second_markale_massacre_1995', 'nato_deliberate_force_1995']);
const optins = new Set(['srebrenica_column_breakout_1995', 'nato_deliberate_force_1995']);
function protectedContent(rows) {
  return rows.map(row => {
    const copy = structuredClone(row);
    if (dates.has(copy.id)) delete copy.trigger.turn_min;
    if (windows.has(copy.id)) delete copy.trigger.turn_max;
    if (optins.has(copy.id)) delete copy.same_turn_requires_events;
    return copy;
  });
}
assert.deepEqual(protectedContent(after), protectedContent(before), 'Unapproved catalog content changed');
const paths = cp.execFileSync('git', ['diff', '--name-only', baseline, '--', 'data', 'src'], {encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const allowed = new Set([catalogPath, 'src/sim/events/event_types.ts', 'src/sim/events/event_loader.ts', 'src/sim/events/evaluate_events.ts', 'src/ui/map/utils/formatters.ts', 'src/ui/map/components/chronicle/ChronicleOverlay.tsx', 'src/ui/map/components/SettlementTimeline.tsx', 'src/ui/map/components/army_hq/DecisionConsequenceRecordsPanel.tsx']);
assert.deepEqual(paths.filter(path => !allowed.has(path)), [], 'Unexpected production changes');
const expectedLock = fs.readFileSync('logs/bc04/p2-implementation/lock-start.sha256', 'utf8').trim().toLowerCase();
assert.equal(crypto.createHash('sha256').update(fs.readFileSync('.claude/scheduled_tasks.lock')).digest('hex'), expectedLock);
assert.equal(cp.execFileSync('git', ['rev-parse', 'HEAD'], {encoding:'utf8'}).trim(), baseline, 'Unexpected commit');
console.log('PASS: catalog effects/prerequisites/protected maxima/order unchanged; production scope bounded; lock and HEAD preserved.');
