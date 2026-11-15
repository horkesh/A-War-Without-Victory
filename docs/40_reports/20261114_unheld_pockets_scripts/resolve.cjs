// Every OSID that sat in an UNHELD pocket after week 20, and how (and when) it left that state.
const fs = require('fs');
const path = require('path');
const runDir = process.argv[2];
const d = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const save = JSON.parse(fs.readFileSync(path.join(runDir, 'final_save.json'), 'utf8'));
const events = save.political.control_events.slice().sort((a, b) => a.turn - b.turn);
const battleOp = new Map(); // `${turn}|${osid}` -> op
for (const line of fs.readFileSync(path.join(runDir, 'weekly_report.jsonl'), 'utf8').split('\n')) {
  if (!line) continue;
  const o = JSON.parse(line);
  for (const b of o.battles || []) {
    if (!b.attacker_won) continue;
    const osid = (b.battle_id || '').split(':').slice(1, 4).join(':');
    battleOp.set(`${o.week_index}|${osid}`, (b.operation_id || b.op_id || b.source || '?') + ' by ' + b.attacker_brigade);
  }
}
// collect per-osid unheld-after-20 windows from per-turn census rebuilt from hist
const seen = new Map();
for (const h of d.hist) {
  if (h.turns_unheld === 0) continue;
  if (h.last_turn <= 20) continue;
  for (const o of h.osids) {
    const s = seen.get(o) || { osid: o, faction: h.faction, from: h.first_turn, to: h.last_turn, borders: new Set() };
    s.from = Math.min(s.from, h.first_turn); s.to = Math.max(s.to, h.last_turn); h.borderers.forEach((b) => s.borders.add(b));
    seen.set(o, s);
  }
}
const rows = [...seen.values()].sort((a, b) => a.from - b.from || a.osid.localeCompare(b.osid));
let byOp = 0, byOther = 0, never = 0;
for (const s of rows) {
  const ev = events.find((e) => e.settlement_id === s.osid && e.turn > s.to - 0 && e.turn <= s.to + 1) || events.find((e) => e.settlement_id === s.osid && e.turn > s.to);
  let how = 'never (still pocket at t188)';
  if (ev) {
    const op = battleOp.get(`${ev.turn}|${s.osid}`);
    how = `t${ev.turn} ${ev.mechanism} -> ${ev.to}` + (op ? ` [${op}]` : '');
    if (op && !/probe/.test(op)) byOp++; else byOther++;
  } else never++;
  console.log(s.faction, s.osid.replace('op:', ''), `unheld-pocket t${s.from}-t${s.to}`, 'by', [...s.borders].join('/'), '=>', how);
}
console.log('resolved by authored/AI operation:', byOp, ' other:', byOther, ' never:', never);
