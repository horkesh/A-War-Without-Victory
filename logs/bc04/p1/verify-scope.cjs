const fs = require('node:fs');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const path = require('node:path');
const git = (...args) => cp.execFileSync('git', args, { encoding: 'utf8' }).trim();
let count = 0;
function check(ok, label) { if (!ok) throw new Error(label); console.log(`PASS ${label}`); count++; }
const expectedHead = 'c95e2524176cffee63ea6d45e5b2d357aab75b74';
check(git('rev-parse', 'HEAD') === expectedHead, 'BC03 commit is HEAD');
check(git('diff', '--cached', '--name-only') === '', 'no staged P1 or unrelated work');
const originalHashes = JSON.parse(fs.readFileSync('logs/bc04/pre-session-hashes.json', 'utf8').replace(/^\uFEFF/, ''));
for (const file of ['.claude/scheduled_tasks.lock', 'data/scenarios/events/war_1995.json', 'src/sim/turn_pipeline.ts', 'tests/turn_pipeline.test.ts', 'tests/event_conditions.test.ts', 'docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md']) {
  check(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase() === originalHashes[file], `preserved ${file}`);
}
const catalogFile = 'data/scenarios/events/war_1993.json';
const before = JSON.parse(git('show', `HEAD:${catalogFile}`));
const ahmici = before.find(row => row.id === 'ahmici_massacre_1993');
check(ahmici.trigger.condition.conditions[0].type === 'faction_controls_municipality', 'positive control: original gate is municipal');
ahmici.trigger.condition.conditions[0] = { type: 'territory_control', osid: 'op:vitez:vitez_2', faction: 'HRHB' };
check(JSON.stringify(before) === JSON.stringify(JSON.parse(fs.readFileSync(catalogFile, 'utf8'))), 'whole catalog equals HEAD plus exactly one gate replacement');
const allowed = new Set([catalogFile, 'tests/event_timeline_integrity.test.ts', 'tests/events_evaluate.test.ts', '.claude/scheduled_tasks.lock', 'docs/PROJECT_LEDGER.md', 'docs/PROJECT_LEDGER_KNOWLEDGE.md', 'docs/plans/2026-07-31-full-campaign-electron-validation-plan.md', 'docs/plans/MASTER_ROADMAP.md', 'docs/plans/COMMAND_BOARD.md', 'docs/40_reports/20260905_EVENT_FIRING_SATURATION_AND_DEAD_CATALOG.md']);
for (const file of git('diff', '--name-only').split(/\r?\n/)) {
  check(allowed.has(file), `bounded tracked change ${file}`);
  if (!file.endsWith('.md')) continue;
  const additions = git('diff', '--', file).split(/\r?\n/).filter(l => l.startsWith('+') && !l.startsWith('+++'));
  for (const line of additions) for (const [, target] of line.matchAll(/\]\(([^)]+)\)/g)) {
    const local = target.replace(/^<|>$/g, '').split('#')[0];
    if (!local || /^[a-z]+:\/\//i.test(local)) continue;
    check(fs.existsSync(path.resolve(path.dirname(file), local)), `local link ${local}`);
  }
}
console.log(`${count} checks passed`);
