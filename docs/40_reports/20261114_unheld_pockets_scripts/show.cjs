const fs = require('fs');
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const t of Object.keys(d.at)) {
  console.log('=== t' + t);
  for (const p of d.at[t]) console.log(' ', p.faction, p.size, 'borders', p.borderers.join('/'), 'own', p.own_formations, p.own_ids.join(','), '|', p.osids.join(' '));
}
console.log('=== pocket records lasting >= 20 turns');
for (const h of d.hist) {
  if (h.last_turn - h.first_turn < 20) continue;
  console.log(h.faction, 't' + h.first_turn + '-t' + h.last_turn, 'unheld', h.turns_unheld, 'held', h.turns_held, 'engineflag', h.engine_flag_turns, 'borders', h.borderers.join('/'), 'own', h.own_ids.join(','), '|', h.osids.join(' '));
}
