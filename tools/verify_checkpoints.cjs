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
 *
 *  - OPERATION FARZ RECEIPTS, in three tiers (Fable consult 10, orchestrator ruling §26,
 *    2026-11-26). GATE rows fail the run (exit 1) at every merge, in both modes. SHAPE rows
 *    are printed and do not fail it: they are the calibration pass's target. TRIPWIRE rows
 *    fail it (exit 1, "hold and trace") when the shape drifts past bounds set from the 57
 *    runs measured in consult 10. The tier logic lives in tools/lib/farz_objective_gate.cjs.
 */
const fs = require('fs');
const path = require('path');
const { classifyCombatCapture } = require('./lib/capture_provenance.cjs');
const {
  checkFarzObjectiveCaptures, LATE_SCAN_START, FARZ_LIVENESS_TURN, TRIPWIRE_BOUNDS,
  easternCaptureGate, operationOwnershipGate, farzLivenessGate, earlyFarzFalls, stoppingLineRows,
  splitG1ExpectedRed,
  anchorContract, receiptTripwire, distinctCells,
} = require('./lib/farz_objective_gate.cjs');

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
const battleById = new Map();
// Every battle with its turn (the weekly row's `week_index` is the turn), for the Farz liveness gate.
const battlesWithTurn = [];
try {
  const wrPath = path.join(runDir, 'weekly_report.jsonl');
  let lineNo = 0;
  for (const line of fs.readFileSync(wrPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    lineNo++;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    const turn = Number.isFinite(rec.week_index) ? rec.week_index : lineNo;
    for (const b of rec.battles || []) {
      if (!b || !b.target_osid) continue;
      contestCount[b.target_osid] = (contestCount[b.target_osid] || 0) + 1;
      if (typeof b.battle_id === 'string' && b.battle_id.length > 0) battleById.set(b.battle_id, b);
      battlesWithTurn.push({ turn, battle: b });
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
// EASTERN-CAPTURE PROVENANCE CHECK. TWO-SIDED BY DESIGN.
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
console.log('EASTERN CAPTURE PROVENANCE — Birač / Majevica / north Podrinje');
// Local: the shared `st188` is declared further down, in the cascade block. Reaching it from
// here would be a temporal-dead-zone crash — the exact error this session already made once,
// in emit.ts, and caught only when a 188-week run died at turn 23.
const at188 = stateAt(188);
// ★ A GAIN IS A CAPTURE, NOT A DISAGREEMENT (corrected 2026-08-26, owner-prompted).
//
// This block previously flagged any cell reading RBiH at w188 where the October reference says RS,
// and called every one an "AHISTORICAL RBiH GAIN". **Three of the four it was reporting had NO
// CONTROL EVENT AT ALL** — `bratunac:pobudje_2`, `kalesija:seher_2`, `vlasenica:cerska_2` are RBiH
// from t0 and were never captured by anything. The engine did not take them; it never lost them.
//
// That is the same defect this file was repaired to remove: **a check answering a narrower question
// than the claim it carries.** It said "gain" and measured "disagreement at week 188".
//
// The distinction is load-bearing because the two have different owners:
//   - CAPTURED                → inspect exact battle/operation provenance; geography alone does
//                               not establish an engine defect.
//   - NEVER LOST              → calibration for a window that is not the current target.
// Owner, 2026-08-26: *"that is calibration work and 1995 is not yet our calibration target."*
// Both `pobudje_2` and `cerska_2` are painted **RBiH in jan1993** and RS by oct1995 — i.e. they are
// correct for the checkpoint actually being calibrated.
//
// Captures gate only when their battle causality is missing, contradictory, or not operation-owned.
// An operation-owned capture is mechanically admissible and is reported as calibration variance;
// geography alone cannot prove an engine defect. Counterattacks are a valid operationless exception,
// but the default artifact does not carry their order reason, so an operationless receipt remains a
// fail-closed review stop rather than being mislabeled as a proven defect.
const provenanceStops = [];
const operationOwnedVariance = [];
const neverLost = [];
for (const osid of Object.keys(ref.oct1995)) {
  const mun = osid.split(':')[1];
  if (!EASTERN_SURPLUS_MUNS.includes(mun)) continue;
  if (at188[osid] !== 'RBiH' || ref.oct1995[osid] !== 'RS') continue;
  // Did the engine ever TAKE it? A capture leaves a control event with `to: 'RBiH'`.
  const captures = events.filter((e) => e.settlement_id === osid && e.to === 'RBiH');
  if (captures.length === 0) {
    neverLost.push(osid);
    continue;
  }
  const capture = captures[captures.length - 1];
  const provenance = classifyCombatCapture(capture, battleById.get(capture.battle_id));
  if (provenance.gates) provenanceStops.push({ osid, capture, provenance });
  else operationOwnedVariance.push({ osid, capture, provenance });
}
if (provenanceStops.length === 0) {
  console.log(`  no unattributed/off-operation capture stops across ${EASTERN_SURPLUS_MUNS.length} municipalities ** CLEAN **`);
} else {
  breached = true;
  console.log(`  *** ${provenanceStops.length} CAPTURE PROVENANCE STOP(S) — §6 attribution required; do not merge ***`);
  for (const row of provenanceStops) {
    console.log(`      ${row.osid}  t${row.capture.turn ?? '?'}  ${row.provenance.kind}`);
  }
}
if (operationOwnedVariance.length > 0) {
  console.log(`  ${operationOwnedVariance.length} operation-owned eastern capture(s) — CALIBRATION VARIANCE, not by itself an engine defect:`);
  for (const row of operationOwnedVariance) {
    const owner = row.provenance.kind === 'operation_owned'
      ? row.provenance.operation_ids.join(', ')
      : row.provenance.kind;
    console.log(`      ${row.osid}  t${row.capture.turn ?? '?'}  ${owner}`);
  }
}
if (neverLost.length > 0) {
  // NOT gating, and deliberately so — see the note above. These are cells the engine never
  // captured and never lost; they disagree with the 1995 reference, which is a calibration
  // question for a window that is not the current target.
  console.log(`  ${neverLost.length} never-captured cell(s) still RBiH at w188 — CALIBRATION (1995 window), not an engine defect:`);
  for (const o of neverLost) {
    const j = ref.jan1993[o];
    console.log(`      ${o}   jan1993 reference: ${j ?? '(absent)'}${j === 'RBiH' ? '  <- engine is CORRECT for the active checkpoint' : ''}`);
  }
}

// ENFORCED (2026-11-07). Parked from 2026-11-04 until the October 1995 checkpoint; that checkpoint
// was signed off on 2026-11-06 and the self-blocking Army HQ cap behind the P-A failure is fixed
// (docs/40_reports/audits/20261104_handover/FARZ-TG-ROOT-CAUSE.md). `--no-farz-guard` reports
// the guard without breaching, for diagnosing older runs; `--farz-guard` is accepted and is a no-op.
const FARZ_GUARD_ENFORCED = !process.argv.includes('--no-farz-guard');


// ── Farz objective receipts and 2nd-Corps diagnostic ──
//
// Uragan 95 was a JOINT 2nd + 3rd Corps operation (BB1 printed 386): 2nd Corps' 22nd
// Division and 3rd Corps' 35th Division linked up at Vozuća. The older gate used the
// final capturer of one cell as a proxy for that participation. The proxy was too narrow:
// a joint operation can have either corps make the final capture. The AAR participation
// diagnostic below reports what the simulation actually records without claiming that
// objective control alone proves the historical link-up.
//
// Owner ruling 2026-09-29: either corps may make an objective's final capture. Require the
// authored operation's logged, operation-owned combat capture of all four objectives instead.
// Report actual 2nd-Corps participation separately; an objective pass does not assert it.
//
// ⚠ NAME-FREE BY CONSTRUCTION: the authored Army HQ marker distinguishes this operation
// from a generic name collision; the operation's AAR, combat events and battle receipts
// must agree. The emergent name pool once emitted another `Farz` at t70.
// Seats' ruling (2026-11-17; scenario tester, operations expert, historian): the P-A window opens
// at t177 (21-27 Aug 1995, the week of the planning order; Uragan 95 ran 10-14 Sep 1995, BB1 file
// p.423; Uragan's enqueue/prestage turn is 177). An RBiH capture of a Farz cell in [160, 177) is
// the early fall the guard exists to catch and fails that cell. The late 2nd/3rd Corps scans keep
// their own start (LATE_SCAN_START, 160), so tightening P-A does not shrink them.
// Under the §26 tiers the credit rows below are SHAPE; the early-fall SHAPE row reads every week.
const FARZ_PA_WINDOW_START = FARZ_LIVENESS_TURN;
const FARZ_EARLY_FALL_START = LATE_SCAN_START;
// Emergent mode (GameStateMeta.decision_mode === 'emergent') credits any RBiH operation-owned
// capture inside the window; historical mode (or no mode recorded) keeps the authored Farz/Uragan
// receipts, plus the joint-offensive path (orchestrator ruling 2026-11-22; BB1 printed pp. 384-388):
// another 2nd or 3rd Corps operation that started in the window and targeted the cell may take it
// between the joint launch and Farz's end, provided Farz itself took a cell
// (tools/lib/farz_objective_gate.cjs).
const farzMode = (save.meta && save.meta.decision_mode) === 'emergent' ? 'emergent' : 'historical';

// Corps attribution needs formation -> corps, which lives in the save this tool already loaded.
const formationsForAttribution = (save.military && save.military.formations) || {};
const corpsOf = (brigadeId) => (formationsForAttribution[brigadeId] || {}).corps_id ?? null;

let operationAars = [];
try {
  operationAars = JSON.parse(fs.readFileSync(path.join(runDir, 'operation_aars.json'), 'utf8'));
} catch { /* A missing or unreadable AAR fails the objective gate below. */ }
if (!Array.isArray(operationAars)) operationAars = [];
// A Farz still executing or recovering at the last turn has no AAR yet; the gate then reads
// the live operation from the final save (same operation-owned capture standard).
const liveOperations = [];
for (const [corpsId, cmd] of Object.entries((save.military && save.military.corps_command) || {})) {
  for (const op of (cmd && cmd.active_operations) || []) liveOperations.push({ corps_id: corpsId, op });
}
const farz = checkFarzObjectiveCaptures({
  cells: FARZ_CELLS, at188, events, battleById, aars: operationAars, corpsOf,
  windowStart: FARZ_PA_WINDOW_START, earlyStart: FARZ_EARLY_FALL_START, mode: farzMode,
  liveOperations, finalTurn: save.meta && save.meta.turn,
  // The engine's own Army HQ registry: identifies the authored Farz even when no TG formed.
  armyHqOperations: (save.military && save.military.army_hq_operations) || {},
});
const factionOf = (brigadeId) => (formationsForAttribution[brigadeId] || {}).faction ?? null;
let runSummary = null;
try { runSummary = JSON.parse(fs.readFileSync(path.join(runDir, 'run_summary.json'), 'utf8')); } catch { /* unknown anchors trip below */ }

// ── GATE tier: checked at every merge, both modes. A red fails the run. ──
let farzGateBroken = 0;
const eastRows = easternCaptureGate({ events, ref, factionOf, easternMuns: EASTERN_SURPLUS_MUNS });
const ownershipRows = operationOwnershipGate({ events, battleById, cells: FARZ_CELLS, corpsOf });
const liveness = farzLivenessGate({ cells: FARZ_CELLS, stateAt, farz, battles: battlesWithTurn, events, battleById });

console.log('');
console.log(`OPERATION FARZ / "Uragan 95" RECEIPTS — GATE tier (every merge, both modes; mode read: ${farz.mode})${FARZ_GUARD_ENFORCED ? '' : '  [--no-farz-guard: informational, not a breach]'}`);
console.log(`  G1 eastern municipalities (§6, any ARBiH corps, from t${LATE_SCAN_START}) — a red goes to the §6 panel`);
// §77: a dated single-cell EXPECTED-RED owned by an engine row. It does not break the gate, and
// it is never printed as a pass. Every other row stays a red (lib: splitG1ExpectedRed).
const g1 = splitG1ExpectedRed(eastRows, { mode: farzMode, corpsOf });
if (eastRows.length === 0) console.log(`    no late ARBiH capture in ${EASTERN_SURPLUS_MUNS.length} municipalities ** PASS **`);
for (const r of g1.matched) {
  console.log(`    RED-EXPECTED t${r.turn} ${r.osid} by ${r.attacker} (${corpsOf(r.attacker) ?? '?'}) — engine row ${r.entry.row} (${r.entry.ruling}, recorded ${r.entry.recorded}); NOT green, expires when that row lands`);
}
if (g1.unexpected.length > 0) {
  farzGateBroken++;
  for (const r of g1.unexpected) console.log(`    *** t${r.turn} ${r.osid} by ${r.attacker} (${corpsOf(r.attacker) ?? '?'}) — §6 panel matter; do not merge ***`);
}
for (const x of g1.unused) console.log(`    (expected-red entry ${x.osid} t${x.turn} did not fire in this run; ${x.row}'s PR removes it)`);
console.log(`  G2 operation ownership — every Farz-cell capture, and every late (t${LATE_SCAN_START}+) 2nd/3rd Corps capture, is operation-owned combat`);
if (ownershipRows.length === 0) console.log('    all operation-owned ** PASS **');
else {
  farzGateBroken++;
  for (const r of ownershipRows) console.log(`    *** t${r.turn} ${r.osid} by ${r.attacker ?? '?'} — ${r.kind}${r.farz_cell ? ' (Farz cell)' : ''} ***`);
}
console.log(`  G3 Farz liveness — an objective still not RBiH entering t${FARZ_LIVENESS_TURN}: the authored Farz starts (t${LATE_SCAN_START}+) with its roster; Farz/Uragan attacks it or an operation takes it`);
if (farz.provisional) console.log('    (Farz has no AAR yet: still in progress at the last turn; read from the live operation)');
if (liveness.rows.length === 0) console.log(`    every objective was RBiH before t${FARZ_LIVENESS_TURN}; nothing to attack (see the early-fall row and the tripwire)`);
for (const r of liveness.rows) {
  console.log(`    ${r.name.padEnd(26)} ${r.ok ? (r.reason === 'attacked' ? `attacked by Farz/Uragan t${r.attack_turn} ** PASS **` : `taken t${r.taken_turn} by ${r.operation_ids.join('+')} ** PASS **`) : `*** ${r.reason.toUpperCase()} ***`}`);
}
if (!liveness.ok) farzGateBroken++;
if (farzGateBroken > 0 && FARZ_GUARD_ENFORCED) breached = true;
else if (farzGateBroken > 0) console.log(`  Farz gates NOT ENFORCED (--no-farz-guard): ${farzGateBroken} finding(s) above are informational.`);

// ── SHAPE tier: recorded, exit 0; must be green at the end of the calibration pass. ──
const early = earlyFarzFalls({ cells: FARZ_CELLS, events, battleById });
const earlyCells = distinctCells(early);
const stopRows = stoppingLineRows({ events, battleById, ref, corpsOf, easternMuns: EASTERN_SURPLUS_MUNS });
const stopCells = distinctCells(stopRows);
const anchors = anchorContract(runSummary);
const heldAt188 = FARZ_CELLS.filter(([, osid]) => at188[osid] === 'RBiH').length;
let shapeRed = 0;

console.log('');
console.log('OPERATION FARZ RECEIPTS — SHAPE tier (recorded, not gating; the calibration pass\'s target)');
console.log(`  S1 P1 — all four Ozren cells RBiH at w188: ${heldAt188}/${FARZ_CELLS.length}`);
for (const [name, osid] of FARZ_CELLS) {
  if (at188[osid] !== 'RBiH') { shapeRed++; console.log(`    ${name.padEnd(26)} ${String(at188[osid])}  -- SHAPE RED`); }
}
console.log(`  S2 early falls — a Farz cell taken before t${FARZ_LIVENESS_TURN}, any week: ${earlyCells.length} cell(s)`);
for (const r of early) {
  shapeRed++;
  console.log(`    t${r.turn} ${r.osid} by ${r.attacker ?? '?'}${r.operation_ids.length ? ` (${r.operation_ids.join('+')})` : ''}  -- SHAPE RED`);
}
console.log(`  S3 credit per cell (${farz.mode === 'emergent' ? 'emergent: any operation in the window' : 'historical: Farz, Uragan or the joint path'}, t${FARZ_PA_WINDOW_START}+)`);
for (const row of farz.rows) {
  const viaLabel = row.via === 'uragan' ? ' (2nd Corps, Uragan 95)'
    : row.via === 'joint' ? ` (joint offensive: ${row.operation_id})`
      : row.via === 'operation' ? ' (operation-owned)' : row.via === 'farz' ? ' (Farz)' : '';
  if (!row.ok) shapeRed++;
  console.log(`    ${row.name.padEnd(26)} ${row.ok ? `t${row.turn} credited${viaLabel}` : '-- SHAPE RED: no credited capture'}`);
}
console.log(`    authored Farz AAR(s): ${farz.authoredCount}; 2nd Corps participation: ${farz.secondCorpsParticipated ? 'recorded' : 'NOT RECORDED'}`);
console.log(`  S4 stopping line — late (t${LATE_SCAN_START}+) 2nd/3rd Corps captures of cells the oct1995 reference does not have RBiH (outside the §6 municipalities): ${stopCells.length} cell(s)`);
for (const r of stopRows) {
  shapeRed++;
  console.log(`    t${r.turn} ${r.osid} by ${r.attacker} (${r.corps})${r.operation_ids.length ? ` ${r.operation_ids.join('+')}` : ''}  oct95=${ref.oct1995[r.osid] ?? '-'}  -- SHAPE RED`);
}
if (!anchors.known) console.log('  S5 anchor contract: UNKNOWN (run_summary.json has no anchor checks)');
else {
  console.log(`  S5 anchor contract: ${anchors.passed}/${anchors.total}${anchors.failed.length ? `  failed: ${anchors.failed.join(', ')}  -- SHAPE RED` : ''}`);
  if (anchors.failed.length) shapeRed++;
}
console.log(`  shape rows red: ${shapeRed}`);

// ── TRIPWIRE tier: hold and trace. ──
const trips = receiptTripwire({ earlyCells, stoppingCells: stopCells, farzCellsAt188: heldAt188, anchors });
console.log('');
console.log(`OPERATION FARZ RECEIPTS — TRIPWIRE (bounds: early <= ${TRIPWIRE_BOUNDS.maxEarlyFarzCells}, stopping line <= ${TRIPWIRE_BOUNDS.maxStoppingLineCells}, held at w188 >= ${TRIPWIRE_BOUNDS.minFarzCellsAt188}, anchors >= ${TRIPWIRE_BOUNDS.minAnchorsPassed})`);
if (trips.length === 0) console.log('  within bounds ** PASS **');
else for (const t of trips) console.log(`  *** TRIPPED: ${t} — hold and trace ***`);
const tripped = trips.length > 0 && FARZ_GUARD_ENFORCED;
if (trips.length > 0 && !FARZ_GUARD_ENFORCED) console.log('  tripwire NOT ENFORCED (--no-farz-guard): informational.');

// P-B, THE UNIVERSAL GUARD, is now two rows: G1 (the nine eastern municipalities, every ARBiH corps)
// and S4 (the stopping line everywhere else, the 2nd and 3rd Corps). Both are universal over what the
// corps DO rather than a cell list, and so self-maintaining: `gracanica` was absent from the old negative
// list, so an ahistorical capture of `op:gracanica:petrovo_2` (RS at all four painted checkpoints)
// slipped through it. The stopping line is the operation's historical limit: Doboj held ("these
// elite additions at last secured Doboj from the threat of further ARBiH advances", BB1 printed 388;
// the painted reference has 13 cells, 10 still RS at oct1995, zero flips), and Petrovo held: Vozuća
// took the southern Ozren tip, not the northern. The old P-B read the 2nd Corps alone and missed the
// 3rd Corps' Jelen 2 at Boljanić and Petrovo (Fable consult 10), and its warrant (apr95 RS and oct95
// RBiH) flagged a retake of a cell the reference keeps RBiH (Maglaj Jablanica).
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
if (breached) console.log('RESULT: GUARD BREACHED — inspect failed guard(s). Do not merge.');
else if (tripped) console.log('RESULT: TRIPWIRE — the Farz shape drifted past its bounds. Hold and trace.');
else if (regressed) console.log('RESULT: SCORE REGRESSION beyond tolerance. Not a guard breach; explain or revert.');
else console.log(`RESULT: guard intact.${g1.matched.length > 0 ? ` G1 RED-EXPECTED: ${g1.matched.length} cell(s) owned by an engine row (§77); G1 is NOT green.` : ''}${shapeRed > 0 ? ` ${shapeRed} SHAPE row(s) red: list them on Part 6.` : ''}`);

process.exit(breached || tripped || regressed ? 1 : 0);
