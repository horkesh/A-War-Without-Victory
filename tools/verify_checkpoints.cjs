#!/usr/bin/env node
/**
 * verify_checkpoints.cjs — score a run against ALL FOUR historical checkpoints,
 * check the enclave guard, and check the documented cascade blast radius.
 *
 *   node tools/verify_checkpoints.cjs <run_dir> [--base jan=N,apr94=N,apr95=N,oct=N]
 *
 * WHY THIS EXISTS. `historical_fit` in a run's own summary is scored against the painted
 * references AS THEY WERE WHEN THE RUN EXECUTED. After the 2026-08-24 owner reference
 * corrections, older run directories emit stale figures (`_baseline_tmp` reports jan1993
 * 673; replayed against the current painted files the same run is 675). This tool always
 * replays `control_events` over `initial_political_controllers` against the CURRENT
 * painted files, so two runs from different days are comparable.
 *
 * It also checks two things a raw score cannot show:
 *
 *  - ENCLAVE GUARD (canon H1.8). Teočak must hold RBiH. Srebrenica and Žepa fall;
 *    Goražde, Bihać, Teočak and the Sarajevo core hold. A change that buys matched OSIDs
 *    by breaching the guard is not a gain, and the guard is the Pyrrhic panel's to rule on.
 *
 *  - HRHB WESTERN-BOSNIA CASCADE. life_lessons/calibration.md (2026-05-26) records five
 *    consecutive additive pre-planned op changes that all regressed via this site, and
 *    pre_planned_operations.ts records a 2026-08-12 attempt that read +3 at 43w and
 *    -26 at 188w with the damage in Šipovo / Glamoč / Grahovo / Mrkonjić / Drvar. That
 *    damage lands ~200 km from a Sarajevo-belt or east-Bosnian change and is invisible
 *    in a sector check, so it is checked unconditionally here.
 */
const fs = require('fs');
const path = require('path');

const runDir = process.argv[2];
if (!runDir) {
  console.error('usage: node tools/verify_checkpoints.cjs <run_dir> [--base jan=N,apr94=N,apr95=N,oct=N]');
  process.exit(2);
}

const KEYS = ['jan1993', 'apr1994', 'apr1995', 'oct1995'];
const WEEK = { jan1993: 39, apr1994: 104, apr1995: 156, oct1995: 188 };

// Baseline is an argument, not a literal: floors move, and a hardcoded one silently
// misreports every future run. Omit it to print absolute scores only.
let base = null;
const baseArg = process.argv.find((a) => a.startsWith('--base'));
if (baseArg) {
  const raw = baseArg.includes('=') ? baseArg.split('=').slice(1).join('=') : process.argv[process.argv.indexOf(baseArg) + 1];
  base = {};
  for (const part of String(raw).split(',')) {
    const [k, v] = part.split('=');
    const key = { jan: 'jan1993', apr94: 'apr1994', apr95: 'apr1995', oct: 'oct1995' }[k.trim()];
    if (key) base[key] = Number(v);
  }
}

const save = JSON.parse(fs.readFileSync(path.join(runDir, 'final_save.json'), 'utf8'));
const events = (save.political.control_events || []).slice().sort((a, b) => a.turn - b.turn);
const init = save.political.initial_political_controllers;

const ref = {};
for (const k of KEYS) {
  ref[k] = JSON.parse(
    fs.readFileSync(path.join('data/source/calibration', `painted_control_${k}.json`), 'utf8')
  ).by_settlement_id;
}

/** Controller map as of the end of `week`, by replaying the flip log over turn-0 control. */
function stateAt(week) {
  const st = { ...init };
  for (const e of events) if (e.turn <= week) st[e.settlement_id] = e.to;
  return st;
}

console.log('CHECKPOINT SCORES  (replayed against CURRENT painted references)');
let net = 0;
for (const k of KEYS) {
  const st = stateAt(WEEK[k]);
  const matched = Object.keys(ref[k]).filter((o) => st[o] === ref[k][o]).length;
  if (base && base[k] != null) {
    const d = matched - base[k];
    net += d;
    console.log(`  ${k.padEnd(9)} ${String(matched).padStart(3)} / 712   base ${base[k]}   ${d >= 0 ? '+' : ''}${d}`);
  } else {
    console.log(`  ${k.padEnd(9)} ${String(matched).padStart(3)} / 712`);
  }
}
if (base) console.log(`  NET across checkpoints: ${net >= 0 ? '+' : ''}${net}`);

// ---- enclave guard (canon H1.8) ----
const GUARD = [['Teocak', 'op:ugljevik:teocak_krstac_2', 'RBiH']];
console.log('\nENCLAVE GUARD (canon H1.8) — these must hold');
let breached = false;
for (const [name, osid, want] of GUARD) {
  const prof = [39, 104, 156, 188].map((w) => stateAt(w)[osid]);
  const ok = prof.every((x) => x === want);
  if (!ok) breached = true;
  console.log(`  ${name.padEnd(10)} ${prof.join(' ')}  ${ok ? '** HOLDS **' : '*** BREACHED — panel matter, do not merge ***'}`);
}

// ---- documented cascade blast radius ----
console.log('\nHRHB WESTERN-BOSNIA CASCADE (documented regression site) — at oct1995');
const st188 = stateAt(188);
const bySection = {};
for (const o of Object.keys(ref.oct1995)) {
  const mun = o.split(':')[1];
  bySection[mun] = bySection[mun] || [0, 0];
  bySection[mun][1]++;
  if (st188[o] === ref.oct1995[o]) bySection[mun][0]++;
}
const WATCH = ['bosansko_grahovo', 'sipovo', 'glamoc', 'drvar', 'bosanski_petrovac', 'mrkonjic_grad', 'kljuc', 'sanski_most'];
console.log('  ' + WATCH.map((m) => `${m} ${bySection[m] ? bySection[m][0] + '/' + bySection[m][1] : '-'}`).join('  '));

process.exit(breached ? 1 : 0);
