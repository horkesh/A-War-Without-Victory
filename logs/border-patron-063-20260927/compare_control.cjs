const fs = require('node:fs');
const path = require('node:path');

const base = 'runs/apr1992_definitive_188w__6deb5845c150c196__w188_n0';
const candidate = 'runs/apr1992_definitive_188w__6deb5845c150c196__w188_n1';
const load = (dir) => JSON.parse(fs.readFileSync(path.join(dir, 'final_save.json'), 'utf8')).political;
const oldRun = load(base);
const newRun = load(candidate);
const sorted = (items) => [...items].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

function controlAt(political, turn) {
  const controllers = { ...political.initial_political_controllers };
  for (const event of political.control_events) {
    if (event.turn <= turn) controllers[event.settlement_id] = event.to;
  }
  return controllers;
}

const result = { base, candidate, changes: {} };
for (const turn of [156, 188]) {
  const oldControl = controlAt(oldRun, turn);
  const newControl = controlAt(newRun, turn);
  const all = sorted(new Set([...Object.keys(oldControl), ...Object.keys(newControl)]));
  result.changes[turn] = all
    .filter((osid) => oldControl[osid] !== newControl[osid])
    .map((osid) => ({ osid, n0: oldControl[osid] ?? null, n1: newControl[osid] ?? null }));
  if (turn === 188) {
    for (const [name, political, reconstructed] of [
      ['n0', oldRun, oldControl],
      ['n1', newRun, newControl],
    ]) {
      const mismatches = all.filter((osid) => reconstructed[osid] !== political.political_controllers[osid]);
      if (mismatches.length > 0) throw new Error(`${name} reconstruction differs from final save: ${mismatches.join(', ')}`);
    }
  }
}

fs.writeFileSync('logs/border-patron-063-20260927/control_comparison.json', `${JSON.stringify(result, null, 2)}\n`);
console.log(`w156 changes: ${result.changes[156].length}`);
console.log(`w188 changes: ${result.changes[188].length}`);
console.log(`Donja w156: n0=${controlAt(oldRun, 156)['op:orasje:donja_mahala']} n1=${controlAt(newRun, 156)['op:orasje:donja_mahala']}`);
console.log(`Donja w188: n0=${controlAt(oldRun, 188)['op:orasje:donja_mahala']} n1=${controlAt(newRun, 188)['op:orasje:donja_mahala']}`);
