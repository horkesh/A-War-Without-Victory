#!/usr/bin/env node
/**
 * op_schedule_diff.cjs — how much did the OPERATION SCHEDULE move between two runs?
 *
 *   node tools/op_schedule_diff.cjs <run_dir_A> <run_dir_B> [--list]
 *
 * RE Phase 0, item 0.1.
 *
 * ── WHY A LADDER AND NEVER A SINGLE NUMBER ─────────────────────────────────────────────────────
 * "N operations differ" is not one measurement, it is five, and they disagree. Operation names are
 * drawn from a shared pool, so the SAME operation can be renamed between runs (name-only says
 * "differs", corps+objectives says "identical"), and two DIFFERENT operations can collide on a name
 * (name-only says "identical", everything else says otherwise). A single name-keyed number silently
 * picks one of those failure modes and hides the other.
 *
 * The S4 band in the decision rule reads: a −4 to −10 checkpoint delta is UNATTRIBUTABLE and
 * requires this diff — and if ≥20% of operations differ in creation turn, the checkpoint number
 * told you nothing, because the whole schedule moved underneath it.
 *
 * ── WHAT THIS EARNED ON 2026-08-26 ─────────────────────────────────────────────────────────────
 * A 3-cell checkpoint delta that would normally be dismissed as jitter was fingerprinted at
 * 270 ops in union / 242 identical creation turns / 0 shifted / 28 diverged = 10.4% — BELOW the 20%
 * noise threshold, so the delta was readable rather than noise. That turned a "probably nothing"
 * into a traceable, §6-relevant cause. The lesson recorded at the time: the "harness cannot
 * attribute ±10" rule is a statement about UNFINGERPRINTED runs, not a law.
 *
 * ── RUNGS ──────────────────────────────────────────────────────────────────────────────────────
 *   1 name-only          most permissive; renames read as differences, collisions read as matches
 *   2 name+corps+turn    a rename OR a reschedule counts
 *   3 corps+turn         name-blind; "did this corps launch at this turn in both?"
 *   4 corps+objectives   ★ THE HONEST ONE — same corps attacking the same ground, whatever it is
 *                          called and whenever it launched
 *   5 corps+objectives+brigades   strictest; a single participant swap counts
 *
 * ── ACCEPTANCE, REPRODUCED 2026-08-26 ──────────────────────────────────────────────────────────
 * Phase 0 item 0.1 specifies "Reproduces the measured n286/n287 pair: 29 / 23 / 23 / 29 / 24."
 * This tool returns exactly that — as the **`both` (matched) column**, rungs 1→5:
 *
 *   node tools/op_schedule_diff.cjs runs/…w188_n286 runs/…w188_n287
 *     rung 1 both=29   rung 2 both=23   rung 3 both=23   rung 4 both=29   rung 5 both=24
 *
 * Worth stating because the ladder is easy to misread: those are MATCHES, not differences. The
 * same pair differs on 32/61 at rung 4 — 52.5%, far above the S4 20% threshold — so a checkpoint
 * delta measured across n286/n287 is unattributable. Note rungs 1 and 4 agree at 29 here by
 * coincidence, not by construction: they answer different questions and routinely diverge.
 *
 * Exit 0 always — this REPORTS. A threshold on rung 4 belongs to the caller, not here.
 * Exit 2 only on a LIVENESS failure (a run carrying zero operations), because a diff over an
 * empty schedule prints a clean board and means nothing.
 */
const fs = require('fs');
const path = require('path');

const [dirA, dirB] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const wantList = process.argv.includes('--list');
if (!dirA || !dirB) {
  console.error('usage: node tools/op_schedule_diff.cjs <run_dir_A> <run_dir_B> [--list]');
  process.exit(2);
}

function loadOps(dir) {
  const p = path.join(dir, 'operation_aars.json');
  if (!fs.existsSync(p)) { console.error(`missing ${p}`); process.exit(2); }
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  const list = Array.isArray(raw) ? raw : (raw.aars || raw.operations || []);
  return list.map((o) => {
    // Objectives: prefer the targeted set (what the op was FOR) over what it captured.
    const objectives = [...new Set([
      ...(o.objectives_targeted || []),
      ...((o.axis_summaries || []).flatMap((a) => a.objectives || [])),
    ])].sort();
    const brigades = [...new Set(
      (o.participating_brigades || []).concat(
        (o.axis_summaries || []).flatMap((a) => a.assigned_brigades || a.brigades || []),
      ),
    )].sort();
    return {
      name: o.operation_name ?? o.name ?? '(unnamed)',
      corps: o.corps_id ?? '(no-corps)',
      // started_turn is not always emitted; fall back to the earliest turn the AAR carries.
      turn: o.started_turn ?? o.launch_turn ?? o.created_turn ?? o.ended_turn ?? -1,
      objectives,
      brigades,
    };
  });
}

const A = loadOps(dirA);
const B = loadOps(dirB);

const RUNGS = [
  ['1 name-only', (o) => o.name],
  ['2 name+corps+turn', (o) => `${o.name}|${o.corps}|${o.turn}`],
  ['3 corps+turn', (o) => `${o.corps}|${o.turn}`],
  ['4 corps+objectives  ★', (o) => `${o.corps}|${o.objectives.join(',')}`],
  ['5 corps+obj+brigades', (o) => `${o.corps}|${o.objectives.join(',')}|${o.brigades.join(',')}`],
];

console.log('');
console.log(`OPERATION-SCHEDULE DIFF   A=${path.basename(dirA)}  B=${path.basename(dirB)}`);
console.log(`  operations: A=${A.length}  B=${B.length}`);
console.log('');
console.log('  rung                     union   both   only-A   only-B   differ   %differ');
console.log('  ' + '-'.repeat(68));

let rung4Differ = null;
for (const [label, keyOf] of RUNGS) {
  // Multiset semantics: two ops sharing a key in one run must not collapse into one.
  const count = (list) => { const m = new Map(); for (const o of list) { const k = keyOf(o); m.set(k, (m.get(k) || 0) + 1); } return m; };
  const ca = count(A), cb = count(B);
  const keys = new Set([...ca.keys(), ...cb.keys()]);
  let both = 0, onlyA = 0, onlyB = 0;
  for (const k of keys) {
    const a = ca.get(k) || 0, b = cb.get(k) || 0;
    both += Math.min(a, b);
    onlyA += Math.max(0, a - b);
    onlyB += Math.max(0, b - a);
  }
  const union = both + onlyA + onlyB;
  const differ = onlyA + onlyB;
  const pct = union === 0 ? 0 : (differ / union) * 100;
  if (label.startsWith('4')) rung4Differ = { differ, union, pct };
  console.log(
    `  ${label.padEnd(24)} ${String(union).padStart(5)} ${String(both).padStart(6)} `
    + `${String(onlyA).padStart(8)} ${String(onlyB).padStart(8)} ${String(differ).padStart(8)} `
    + `${pct.toFixed(1).padStart(8)}%`,
  );
}

// LIVENESS: a diff over two empty schedules prints a clean board and means nothing.
console.log('');
if (A.length === 0 || B.length === 0) {
  console.error('  LIVENESS FAILURE — one or both runs carry ZERO operations; this report is not trustworthy.');
  process.exit(2);
}

if (rung4Differ) {
  console.log(`  ★ rung 4 (corps+objectives) is the honest one: ${rung4Differ.differ}/${rung4Differ.union} differ (${rung4Differ.pct.toFixed(1)}%)`);
  if (rung4Differ.pct >= 20) {
    console.log('  ⚠ ≥20% — per decision rule S4, a checkpoint delta measured across this pair is');
    console.log('    UNATTRIBUTABLE: the schedule moved underneath it and the number told you nothing.');
  } else {
    console.log('  Below the 20% S4 noise threshold — a checkpoint delta across this pair is READABLE.');
  }
}

if (wantList) {
  const keyOf = RUNGS[3][1];
  const setB = new Set(B.map(keyOf));
  const setA = new Set(A.map(keyOf));
  console.log('');
  console.log('  only in A:');
  for (const o of A.filter((o) => !setB.has(keyOf(o)))) console.log(`    - ${o.name}  ${o.corps}  t${o.turn}  [${o.objectives.length} obj]`);
  console.log('  only in B:');
  for (const o of B.filter((o) => !setA.has(keyOf(o)))) console.log(`    + ${o.name}  ${o.corps}  t${o.turn}  [${o.objectives.length} obj]`);
}

console.log('');
