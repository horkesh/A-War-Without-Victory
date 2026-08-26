#!/usr/bin/env node
/**
 * verify_checkpoints.cjs — score a run against ALL FOUR historical checkpoints,
 * check the enclave guard, and check the documented cascade blast radius.
 *
 *   node tools/verify_checkpoints.cjs <run_dir> [--base jan=N,apr94=N,apr95=N,oct=N] [--cascade-base N]
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
 *  - ENCLAVE GUARD (canon H1.8) — NINE cells, REPAIRED 2026-08-26. Until then this
 *    block checked ONE cell while this header claimed all of them, the cascade block
 *    compared nothing, and the exit code ignored both. Now: Goražde, Bihać, Teočak and
 *    the four Sarajevo-core municipalities must HOLD; Srebrenica and Žepa must FALL,
 *    asserted two-sided so an early fall fails as loudly as a missing one. A change that
 *    buys matched OSIDs by breaching the guard is not a gain, and the guard is the
 *    Pyrrhic panel's to rule on. See 20260826_S6_REFERRAL_ENCLAVE_GUARD_VACUITY.md.
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
  console.error('usage: node tools/verify_checkpoints.cjs <run_dir> [--base jan=N,apr94=N,apr95=N,oct=N] [--cascade-base N]');
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

// Tolerances. A guard that fires on jitter gets disabled, and a permanently-red gate is
// worse than a missing one — this repo's own lesson. -3 matches the decision rule's
// JITTER band; the cascade site is smaller and tighter.
const SCORE_TOLERANCE = 3;
const CASCADE_TOLERANCE = 2;

let cascadeBase = null;
const cbArg = process.argv.find((x) => x.startsWith('--cascade-base'));
if (cbArg) {
  const raw = cbArg.includes('=') ? cbArg.split('=')[1] : process.argv[process.argv.indexOf(cbArg) + 1];
  const n = Number(raw);
  if (Number.isFinite(n)) cascadeBase = n;
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
//
// REPAIRED 2026-08-26 after a §6 panel found this instrument vacuous on four counts.
// It checked ONE cell (Teočak) while this file's own header claimed all nine; the
// cascade block below printed a string and compared nothing; and `process.exit` was
// driven by the Teočak loop alone, so a run could lose forty OSIDs at every checkpoint
// and still exit 0. Every §6 verdict citing this tool established exactly one
// proposition: Teočak held RBiH at four checkpoints.
//
// A HOLD is "== RBiH at all four checkpoints".
// A FALL is a TRANSITION and is asserted TWO-SIDED — RBiH through w156 AND RS at w188.
// Asserting `== 'RS'` at all four would be historically wrong (Srebrenica is RBiH until
// ~w168); asserting only at w188 would pass a scenario where the cell was never RBiH,
// vacuous in exactly the way this repair exists to prevent. An early fall is an
// atrocity-rewarded breach and fails as loudly as a missing one.
//
// The expected values are not invented: every cell below was read out of the CURRENT
// painted references at all four checkpoints on 2026-08-26.
// CONTEST COUNTS — added 2026-08-26 after the red-team seat measured that the repair which took
// this guard from one cell to nine fixed the FAIL-OPEN defect but WIDENED the VACUOUS-PASS one.
// On n373, 8 of the 9 guard cells are never the target of a single battle in 188 weeks. Goražde:
// zero, in every run checked. Srebrenica: zero. Žepa: zero. The sting is that Teočak — the one
// cell the old guard checked — is the only consistently contested one, so expanding to nine
// surrounded the single live cell with eight that pass for free.
//
// "Goražde held" is currently indistinguishable from "nothing ever attacked Goražde."
//
// This does NOT hard-fail on zero: for Žepa and the Sarajevo core, uncontested may be correct
// history (the SRK strangle-not-capture posture is canon; Galić Appeal §389). The value is that
// the guard stops CLAIMING something it did not test.
//
// ⚠ NARROW BY CONSTRUCTION: this counts battles where the cell IS THE TARGET. A cell can be
// pressured through its adjacency ring without ever being targeted, so 0 means "never directly
// attacked", NOT "never threatened". Do not let these zeros be quoted as "Goražde was never under
// threat." The ring version needs data/derived/operational/operational_contact_graph.json.
const contestCount = {};
try {
  const wrPath = path.join(runDir, 'weekly_report.jsonl');
  for (const line of fs.readFileSync(wrPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    for (const b of rec.battles || []) {
      if (!b || !b.target_osid) continue;
      contestCount[b.target_osid] = (contestCount[b.target_osid] || 0) + 1;
    }
  }
} catch {
  // weekly_report.jsonl absent => print UNKNOWN rather than a misleading 0.
  contestCount.__missing = true;
}
const contestLabel = (osid) => {
  if (contestCount.__missing) return 'contested? UNKNOWN (no weekly_report.jsonl)';
  const n = contestCount[osid] || 0;
  return n > 0 ? `CONTESTED-AND-HELD (${n} battles)` : 'UNCONTESTED (0 battles as target)';
};

const HOLDS = [
  ['Gorazde', 'op:gorazde:gorazde_2'],
  ['Bihac', 'op:bihac:bihac_2'],
  ['Teocak', 'op:ugljevik:teocak_krstac_2'],
  ['Sarajevo-centar', 'op:centar_sarajevo:sarajevo_dio_centar_sajarevo'],
  ['Sarajevo-stari grad', 'op:stari_grad_sarajevo:sarajevo_dio_stari_grad_sarajevo'],
  ['Sarajevo-novo', 'op:novo_sarajevo:sarajevo_dio_novo_sarajevo'],
  ['Sarajevo-novi grad', 'op:novi_grad_sarajevo:sarajevo_dio_novi_grad_sarajevo'],
];
const FALLS = [
  ['Srebrenica', 'op:srebrenica:srebrenica_2'],
  ['Zepa', 'op:rogatica:zepa_2'],
];

let breached = false;
const CPS = [39, 104, 156, 188];

console.log('');
console.log('ENCLAVE GUARD (canon H1.8) — holds');
for (const [name, osid] of HOLDS) {
  const prof = CPS.map((w) => stateAt(w)[osid]);
  const missing = prof.some((x) => x === undefined);
  const ok = !missing && prof.every((x) => x === 'RBiH');
  if (!ok) breached = true;
  const verdict = missing
    ? '*** OSID NOT IN RUN — guard cannot assert; treat as BREACH ***'
    : ok ? '** HOLDS **' : '*** BREACHED — panel matter, do not merge ***';
  console.log(`  ${name.padEnd(21)} ${prof.map((x) => String(x).padEnd(4)).join(' ')} ${verdict}`);
  if (ok) console.log(`  ${' '.repeat(21)} ${' '.repeat(19)} ${contestLabel(osid)}`);
}

console.log('');
console.log('ENCLAVE GUARD (canon H1.8) — falls (two-sided: RBiH through w156, RS at w188)');
for (const [name, osid] of FALLS) {
  const prof = CPS.map((w) => stateAt(w)[osid]);
  const missing = prof.some((x) => x === undefined);
  const heldBefore = prof.slice(0, 3).every((x) => x === 'RBiH');
  const fellBy188 = prof[3] === 'RS';
  const ok = !missing && heldBefore && fellBy188;
  if (!ok) breached = true;
  let verdict = '** FALLS ON SCHEDULE **';
  if (missing) verdict = '*** OSID NOT IN RUN — guard cannot assert; treat as BREACH ***';
  else if (!heldBefore) verdict = '*** FELL EARLY — atrocity rewarded ahead of schedule; panel matter ***';
  else if (!fellBy188) verdict = '*** DID NOT FALL — event-owned outcome suppressed; panel matter ***';
  console.log(`  ${name.padEnd(21)} ${prof.map((x) => String(x).padEnd(4)).join(' ')} ${verdict}`);
}

// LIVENESS: assert how much was COMPARED, not only that nothing tripped. A guard that
// silently checks zero cells prints a clean board — this repair is its own case study.
const guardCells = HOLDS.length + FALLS.length;
console.log('');
console.log(`  guard cells compared: ${guardCells} (${HOLDS.length} holds + ${FALLS.length} falls)`);

// ─────────────────────────────────────────────────────────────────────────────
// EASTERN-SURPLUS CHECK (Historian exit condition, 2026-08-26). TWO-SIDED BY DESIGN.
//
// WHY. Turning on enclave-column displacement produced RBiH captures around Lopare and
// Šekovići. All were measured RS in ALL FOUR painted checkpoints — they never changed hands
// in the war — and Lopare and Šekovići were VRS brigade HQs in 1995 (3rd Majevica, 1st Birač;
// VRS Main Staff Directive 02/2-15, 31 March 1995). A §6 panel ruled the outcome NON-COMPLIANT:
// the destruction of the enclave was converting into offensive capacity on ground that never fell.
//
// THE FIRST EXIT CONDITION WAS A CELL LIST, AND A CELL LIST IS WHACK-A-MOLE. An eligibility fix
// removed three Lopare cells and the corps promptly took four others two valleys over — four wrong
// cells became five. The Historian superseded the list with a REGION, which is checkable and not a
// judgement call: the painted reference records ZERO RBiH gains in any of these nine municipalities
// across the whole apr1995 -> oct1995 window.
//
// ★ THE POSITIVE HALF IS NOT OPTIONAL. The negative half alone can be satisfied by suppressing
// 2nd Corps — which the OWNER explicitly ruled out, supplying history the panel did not have:
// 2nd Corps mounted Operation FARZ (BB calls it "Uragan 95"; BB never uses the name Farz) jointly
// with 3rd Corps, taking Vozuća on 13 September 1995 and ~280 km² over 30 days — "a very sizable
// operation, well executed". The corps was NOT spent. So the fix is a TARGETING error, never a
// CAPABILITY one, and any change that reduces this corps' tempo or operation size is fixing the
// wrong variable. The positive half catches exactly that failure and is verified passing today.
//
// Scoped to FLIPS: cells already RBiH (the Sapna Thumb, the Teočak salient) are untouched here and
// are covered by the enclave guard above.
const EASTERN_SURPLUS_MUNS = ['sekovici', 'vlasenica', 'milici', 'zvornik', 'bratunac', 'lopare', 'ugljevik', 'kalesija', 'osmaci'];
const FARZ_CELLS = [
  ['Vozuća (13 Sep 1995)', 'op:zavidovici:vozuca_2'],
  ['Maglaj — donja bočinja', 'op:maglaj:donja_bocinja_2'],
  ['Maglaj — gornja bočinja', 'op:maglaj:gornja_bocinja'],
  ['Spreča / north Ozren', 'op:lukavac:brijesnica_donja_2'],
];

console.log('');
console.log('EASTERN SURPLUS — Birač / Majevica / north Podrinje (painted reference: ZERO RBiH gains)');
// Local: the shared `st188` is declared further down, in the cascade block. Reaching it from
// here would be a temporal-dead-zone crash — the exact error this session already made once,
// in emit.ts, and caught only when a 188-week run died at turn 23.
const at188 = stateAt(188);
const surplus = [];
for (const osid of Object.keys(ref.oct1995)) {
  const mun = osid.split(':')[1];
  if (!EASTERN_SURPLUS_MUNS.includes(mun)) continue;
  // A "gain" is RBiH at w188 where the painted reference says RS.
  if (at188[osid] === 'RBiH' && ref.oct1995[osid] === 'RS') surplus.push(osid);
}
if (surplus.length === 0) {
  console.log(`  none across ${EASTERN_SURPLUS_MUNS.length} municipalities ** CLEAN **`);
} else {
  breached = true;
  console.log(`  *** ${surplus.length} AHISTORICAL RBiH GAIN(S) — §6 panel matter, do not merge ***`);
  for (const o of surplus) console.log(`      ${o}`);
}

console.log('');
console.log('OPERATION FARZ / "Uragan 95" — the positive half; a fix that breaks this is the WRONG fix');
let farzBroken = 0;
for (const [name, osid] of FARZ_CELLS) {
  const got = at188[osid];
  const ok = got === 'RBiH';
  if (!ok) farzBroken++;
  console.log(`  ${name.padEnd(26)} ${String(got)}  ${ok ? '** TAKEN **' : '*** NOT TAKEN — 2nd/3rd Corps suppressed; this is not a pass ***'}`);
}
if (farzBroken > 0) breached = true;
// LIVENESS: say how much was compared, not merely that nothing tripped.
console.log(`  compared: ${EASTERN_SURPLUS_MUNS.length} municipalities (negative) + ${FARZ_CELLS.length} cells (positive)`);
if (guardCells !== 9) {
  console.error('  LIVENESS FAILURE — guard cell count changed unexpectedly; this report is not trustworthy.');
  process.exit(2);
}

// ---- documented cascade blast radius ----
// Was PRINT-ONLY: it built the counts, printed them, and compared nothing. It now has a
// threshold and feeds the exit code. The baseline is supplied, never hardcoded — a
// literal here would silently misreport every future run, the defect the score baseline
// already avoids.
console.log('');
console.log('HRHB WESTERN-BOSNIA CASCADE (documented regression site) — at oct1995');
const st188 = stateAt(188);
const bySection = {};
for (const o of Object.keys(ref.oct1995)) {
  const mun = o.split(':')[1];
  bySection[mun] = bySection[mun] || [0, 0];
  bySection[mun][1]++;
  if (st188[o] === ref.oct1995[o]) bySection[mun][0]++;
}
// `titov_drvar`, NOT `drvar` — the painted references are keyed on 1990 municipality names, and
// Drvar was Titov Drvar until 1992. The first version of this list said `drvar`, matched zero
// OSIDs, printed `-`, and contributed 0 to the gated `cascadeTotal` — a watch entry that could
// not have found what it was looking for, inside the very block repaired to remove vacuity.
// Verified 2026-08-26: all eight keys below exist in `painted_control_oct1995.json`.
const WATCH = ['bosansko_grahovo', 'sipovo', 'glamoc', 'titov_drvar', 'bosanski_petrovac', 'mrkonjic_grad', 'kljuc', 'sanski_most'];

// LIVENESS: a watch name matching zero OSIDs is a BROKEN WATCH LIST, not an empty municipality.
// It must fail loudly — printing `-` and summing 0 is how the bug above survived its own review.
const unmatched = WATCH.filter((m) => !bySection[m]);
if (unmatched.length > 0) {
  console.error(`  LIVENESS FAILURE — watch municipalities match zero OSIDs: ${unmatched.join(', ')}`);
  console.error('  The painted references are keyed on 1990 municipality names. Fix the key, do not delete the row.');
  process.exit(2);
}

console.log('  ' + WATCH.map((m) => `${m} ${bySection[m][0]}/${bySection[m][1]}`).join('  '));
let cascadeTotal = 0;
for (const m of WATCH) cascadeTotal += bySection[m][0];
console.log(`  cascade matched: ${cascadeTotal} across ${WATCH.length} municipalities`);
if (cascadeBase != null) {
  const cd = cascadeTotal - cascadeBase;
  console.log(`  cascade base ${cascadeBase}   ${cd >= 0 ? '+' : ''}${cd}`);
  if (cd < -CASCADE_TOLERANCE) {
    breached = true;
    console.log(`  *** CASCADE REGRESSION worse than -${CASCADE_TOLERANCE} at the documented 2026-05-26 site — do not merge on this evidence ***`);
  }
} else {
  console.log('  (no --cascade-base supplied — reported, not gated)');
}

// ---- exit status ----
// Previously `process.exit(breached ? 1 : 0)` with `breached` set by the Teočak loop
// alone, so checkpoint scores and the cascade were NON-GATING. Scores now gate whenever
// a baseline is supplied.
let regressed = false;
if (base) {
  for (const k of KEYS) {
    if (base[k] == null) continue;
    const st = stateAt(WEEK[k]);
    const matched = Object.keys(ref[k]).filter((o) => st[o] === ref[k][o]).length;
    const d = matched - base[k];
    if (d < -SCORE_TOLERANCE) {
      regressed = true;
      console.log('');
      console.log(`  *** ${k} REGRESSED ${d} against base ${base[k]} (tolerance -${SCORE_TOLERANCE}) ***`);
    }
  }
}

console.log('');
if (breached) console.log('RESULT: GUARD BREACHED — §6 panel matter. Do not merge.');
else if (regressed) console.log('RESULT: SCORE REGRESSION beyond tolerance. Not a guard breach; explain or revert.');
else console.log('RESULT: guard intact.');

process.exit(breached || regressed ? 1 : 0);
