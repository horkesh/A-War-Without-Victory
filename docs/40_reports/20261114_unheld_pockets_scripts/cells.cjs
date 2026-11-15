// For each cell: initial controller, flip events, painted value at 4 checkpoints, sim value at 4 checkpoints.
const fs = require('fs');
const path = require('path');
const runDir = process.argv[2];
const cells = process.argv[3].split(',');
const save = JSON.parse(fs.readFileSync(path.join(runDir, 'final_save.json'), 'utf8'));
const events = (save.political.control_events || []).slice().sort((a, b) => a.turn - b.turn);
const init = save.political.initial_political_controllers;
const W = { jan1993: 39, apr1994: 104, apr1995: 156, oct1995: 188 };
const ref = {};
for (const k of Object.keys(W)) ref[k] = JSON.parse(fs.readFileSync(`data/source/calibration/painted_control_${k}.json`, 'utf8')).by_settlement_id;
const at = (o, w) => { let c = init[o]; for (const e of events) if (e.settlement_id === o && e.turn <= w) c = e.to; return c; };
// also: when would this cell be counted if it had stayed with its initial controller forever
for (const o of cells) {
  const ev = events.filter((e) => e.settlement_id === o).map((e) => `t${e.turn}:${e.from}->${e.to}(${e.mechanism})`).join(' ');
  const row = Object.keys(W).map((k) => `${k.slice(0, 3)}${k.slice(-2)} sim=${at(o, W[k])} ref=${ref[k][o]}${at(o, W[k]) === ref[k][o] ? ' ok' : ' MISS'}${init[o] === ref[k][o] ? ' (frozen-ok)' : ' (frozen-MISS)'}`).join(' | ');
  console.log(o.replace('op:', ''), 'init', init[o], '|', row, '|', ev);
}
