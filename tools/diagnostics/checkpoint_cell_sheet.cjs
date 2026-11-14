/**
 * DA1 decision sheet: per checkpoint, every cell whose match against the painted reference
 * differs between a baseline run and any later run, with each run's controller and the
 * capture that decided it (turn, attacker, operation). Read-only.
 * Usage: node tools/diagnostics/checkpoint_cell_sheet.cjs <label=runDir> <label=runDir> ...
 *   (the first run is the baseline)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const KEYS = ['jan1993', 'apr1994', 'apr1995', 'oct1995'];
const WEEK = { jan1993: 39, apr1994: 104, apr1995: 156, oct1995: 188 };
const ref = {};
for (const k of KEYS) {
  ref[k] = JSON.parse(fs.readFileSync(path.join('data/source/calibration', `painted_control_${k}.json`), 'utf8')).by_settlement_id;
}

const runs = process.argv.slice(2).map((arg) => {
  const [label, dir] = arg.split('=');
  const save = JSON.parse(fs.readFileSync(path.join(dir, 'final_save.json'), 'utf8'));
  const events = (save.political.control_events || []).slice().sort((a, b) => a.turn - b.turn);
  const battles = new Map();
  for (const line of fs.readFileSync(path.join(dir, 'weekly_report.jsonl'), 'utf8').trim().split('\n')) {
    const o = JSON.parse(line);
    for (const b of o.battles || []) battles.set(b.battle_id, b);
  }
  return { label, init: save.political.initial_political_controllers, events, battles };
});

function at(run, week) {
  const st = { ...run.init };
  for (const e of run.events) if (e.turn <= week) st[e.settlement_id] = e.to;
  return st;
}
function decider(run, osid, week) {
  const evs = run.events.filter((e) => e.settlement_id === osid && e.turn <= week);
  const e = evs[evs.length - 1];
  if (!e) return 'never changed';
  const b = run.battles.get(e.battle_id);
  const op = b && b.operation_name ? b.operation_name : (b && b.operation_id) || '-';
  return `t${e.turn} ${e.mechanism} ${e.from}->${e.to} by ${e.attacker_brigade || '-'} [${op}]`;
}

const rows = [];
for (const k of KEYS) {
  const states = runs.map((r) => at(r, WEEK[k]));
  const net = runs.map((r, i) => Object.keys(ref[k]).filter((o) => states[i][o] === ref[k][o]).length);
  console.log(`\n## ${k} (w${WEEK[k]}): ` + runs.map((r, i) => `${r.label} ${net[i]}`).join(', '));
  for (const osid of Object.keys(ref[k]).sort()) {
    const ok = states.map((s) => s[osid] === ref[k][osid]);
    if (ok.every((v) => v === ok[0])) continue;
    const firstMoved = runs.findIndex((_, i) => i > 0 && ok[i] !== ok[0]);
    console.log(`| ${osid} | ref ${ref[k][osid]} | ` + runs.map((r, i) => `${r.label} ${states[i][osid]}${ok[i] ? '' : ' ✗'}`).join(' | ')
      + ` | first moved: ${runs[firstMoved].label}`);
    for (let i = 0; i < runs.length; i++) console.log(`    ${runs[i].label}: ${decider(runs[i], osid, WEEK[k])}`);
    rows.push(osid);
  }
}
