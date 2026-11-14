/**
 * DA1 diagnostic: replay two runs' control events and report the first turn their OSID
 * control differs, plus the differing cells at chosen turns. Read-only.
 * Usage: node tools/diagnostics/control_divergence.cjs <runDirA> <runDirB> [turn,turn,...]
 */
'use strict';
const fs = require('fs');
const path = require('path');

function load(runDir) {
  const init = JSON.parse(fs.readFileSync(path.join(runDir, 'initial_save.json'), 'utf8'));
  const fin = JSON.parse(fs.readFileSync(path.join(runDir, 'final_save.json'), 'utf8'));
  const events = (fin.political.control_events || fin.control_events || []).slice()
    .sort((a, b) => a.turn - b.turn || (a.settlement_id < b.settlement_id ? -1 : 1));
  return { start: { ...init.political.political_controllers }, events };
}

function controlAt(run, turn) {
  const pc = { ...run.start };
  for (const e of run.events) {
    if (e.turn > turn) break;
    pc[e.settlement_id] = e.to;
  }
  return pc;
}

const [a, b, turnsArg] = process.argv.slice(2);
const A = load(a);
const B = load(b);
let first = null;
for (let t = 0; t <= 188 && first === null; t++) {
  const pa = controlAt(A, t);
  const pb = controlAt(B, t);
  for (const k of Object.keys({ ...pa, ...pb })) if (pa[k] !== pb[k]) { first = t; break; }
}
console.log('first divergence turn:', first);
for (const t of (turnsArg ? turnsArg.split(',').map(Number) : [first])) {
  const pa = controlAt(A, t);
  const pb = controlAt(B, t);
  const diff = Object.keys({ ...pa, ...pb }).sort().filter((k) => pa[k] !== pb[k]);
  console.log(`t${t}: ${diff.length} differ: ` + diff.map((k) => `${k} ${pa[k]}->${pb[k]}`).join('; '));
}
