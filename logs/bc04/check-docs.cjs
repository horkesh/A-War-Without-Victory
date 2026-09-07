const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const before = JSON.parse(fs.readFileSync('logs/bc04/pre-session-hashes.json', 'utf8').replace(/^\uFEFF/, ''));
const allowed = new Set(['docs/plans/MASTER_ROADMAP.md', 'docs/plans/COMMAND_BOARD.md', 'docs/plans/2026-07-31-full-campaign-electron-validation-plan.md', 'docs/PROJECT_LEDGER.md', 'docs/PROJECT_LEDGER_KNOWLEDGE.md', 'docs/40_reports/20260905_EVENT_FIRING_SATURATION_AND_DEAD_CATALOG.md']);
let count = 0;
function check(ok, label) { if (!ok) throw new Error(label); console.log(`PASS ${label}`); count++; }
check(cp.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() === 'be5d7690470e9ce38a6fe98abd08199137bb5386', 'HEAD unchanged');
for (const [file, hash] of Object.entries(before)) {
  if (allowed.has(file)) continue;
  check(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase() === hash, `preserved ${file}`);
}
const changed = cp.execFileSync('git', ['diff', '--name-only'], { encoding: 'utf8' }).trim().split(/\r?\n/);
for (const file of changed) check(file in before || allowed.has(file), `no unexpected tracked edit: ${file}`);
const plan = fs.readFileSync('docs/plans/2026-07-31-full-campaign-electron-validation-plan.md', 'utf8');
check(plan.includes('### BC04 bounded implementation plan — 2026-09-07'), 'BC04 canonical plan home and heading');
check(plan.includes('### BC03 bounded implementation — 2026-09-07') && plan.includes('BC03 is CLOSED'), 'BC03 closure retained');
for (const file of allowed) {
  if (!changed.includes(file)) continue;
  const diff = cp.execFileSync('git', ['diff', '--', file], { encoding: 'utf8' });
  for (const line of diff.split(/\r?\n/).filter(l => l.startsWith('+') && !l.startsWith('+++'))) {
    for (const match of line.matchAll(/\]\(([^)]+)\)/g)) {
      const link = match[1].replace(/^<|>$/g, '').split('#')[0];
      if (!link || /^[a-z]+:\/\//i.test(link)) continue;
      check(fs.existsSync(path.resolve(path.dirname(file), link)), `local link ${file}: ${link}`);
    }
  }
}
console.log(`${count} checks passed`);
