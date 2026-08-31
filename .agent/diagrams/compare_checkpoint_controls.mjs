import { readFileSync } from 'node:fs';

const [oldPath, newPath, paintedPath] = process.argv.slice(2);
const oldSave = JSON.parse(readFileSync(oldPath, 'utf8'));
const newSave = JSON.parse(readFileSync(newPath, 'utf8'));
const painted = JSON.parse(readFileSync(paintedPath, 'utf8')).by_settlement_id;
function stateAt(save, turn) {
  const state = { ...save.political.initial_political_controllers };
  for (const event of [...(save.political.control_events ?? [])].sort((a, b) => a.turn - b.turn)) {
    if (event.turn <= turn) state[event.settlement_id] = event.to;
  }
  return state;
}
const oldPc = stateAt(oldSave, 39);
const newPc = stateAt(newSave, 39);
const rows = [];
for (const osid of Object.keys(painted).sort()) {
  const old = oldPc[osid] ?? null, next = newPc[osid] ?? null, want = painted[osid];
  if (old === next) continue;
  const oldOk = old === want, newOk = next === want;
  rows.push({ osid, old, new: next, want, effect: oldOk && !newOk ? 'LOSS' : !oldOk && newOk ? 'GAIN' : 'NEUTRAL' });
}
console.log(JSON.stringify({
  summary: Object.fromEntries(['LOSS','GAIN','NEUTRAL'].map((kind) => [kind, rows.filter((r) => r.effect === kind).length])),
  rows,
  upperDrina: rows.filter((r) => /op:(gorazde|foca|cajnice|visegrad|rogatica|pale|trnovo):/.test(r.osid)),
}, null, 2));
