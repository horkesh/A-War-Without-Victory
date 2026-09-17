const fs = require('fs');
const rd = 'runs/apr1992_definitive_188w__9137f75e9f35be20__w39_n402';
const save = JSON.parse(fs.readFileSync(rd + '/final_save.json', 'utf8'));
const ref = JSON.parse(fs.readFileSync('data/source/calibration/painted_control_jan1993.json', 'utf8')).by_settlement_id;
const refs = {};
for (const cp of ['jan1993', 'apr1994', 'apr1995', 'oct1995']) refs[cp] = JSON.parse(fs.readFileSync('data/source/calibration/painted_control_' + cp + '.json', 'utf8')).by_settlement_id;
const init = save.political.initial_political_controllers;
const events = (save.political.control_events || []).slice().sort((a, b) => a.turn - b.turn);
const st = { ...init };
for (const e of events) if (e.turn <= 39) st[e.settlement_id] = e.to;
const mm = Object.keys(ref).filter((o) => st[o] !== ref[o]).sort();

console.log('=== 11-row jan1993 mismatch list (n402) ===');
for (const o of mm) {
  const own = events.filter((e) => e.settlement_id === o);
  const chain = own.map((e) => `t${e.turn} ${e.from}->${e.to} ${e.mechanism}${e.attacker_brigade ? ' by ' + e.attacker_brigade : ''}${e.operation_name ? ' op=' + e.operation_name : ''}`).join(' ; ') || '(no control event; held init)';
  console.log(o);
  console.log('   expected=' + ref[o], 'actual=' + st[o], 'init=' + init[o]);
  console.log('   profile jan/94/95/oct:', ['jan1993', 'apr1994', 'apr1995', 'oct1995'].map((c) => refs[c][o] || '-').join(' / '));
  console.log('   history:', chain);
}

console.log('');
console.log('=== vranjevici_2 / kruzanj_2 focused ===');
for (const o of ['op:mostar:vranjevici_2', 'op:mostar:kruzanj_2', 'op:mostar:hodbina_2', 'op:mostar:blagaj_2']) {
  const own = events.filter((e) => e.settlement_id === o);
  console.log(o, 'init=' + (init[o] || '-'), 'ref jan/94/95/oct=' + ['jan1993', 'apr1994', 'apr1995', 'oct1995'].map((c) => refs[c][o] || '-').join('/'), 'actual39=' + (st[o] || '-'));
  for (const e of own) console.log('    t' + e.turn, e.from + '->' + e.to, e.mechanism, e.attacker_brigade || '', e.operation_name || '');
}
