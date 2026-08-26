#!/usr/bin/env node
/**
 * engine_health_gate.cjs — EH-1 Part B (engine-health pivot).
 *
 * A thin post-run engine-health check. Reads a completed scenario run directory
 * (run_summary.json + final_save.json) and asserts / reports state-integrity and
 * casualty-health signals that the existing territory gates do NOT catch.
 *
 * WHY: the scenario-anchors gate (~30 named OSIDs) and the 40w structural-fingerprint
 * gate both passed the EH-3 fix(a) −39 late-war regression (2026-06-11). Net-territory
 * and state-integrity regressions need their own guard. This is that guard, as a
 * standalone tool first (usable by the bundle+track local-188w workflow); the CI wiring
 * is a separate, owner-gated step.
 *
 * USAGE:
 *   node tools/engine_health_gate.cjs <run_dir> [--horizon 40w|188w] [--update] [--force] [--strict] [--json]
 *
 *   <run_dir>     a dir containing run_summary.json AND final_save.json
 *   --horizon     which threshold band to check against. Default inferred from weeks
 *                 (<=60 -> 40w, else 188w). Only '40w' and '188w' bands are seeded today;
 *                 a 52w run would infer '40w' — pass --horizon explicitly for other lengths.
 *   --update      write the CURRENT measured values (+ headroom) into the thresholds file and exit 0
 *   --force       with --update, allow LOWERING the matched_osids floor (otherwise refused)
 *   --strict      treat ADVISORY metrics (K:W band, casualty totals) as hard-fail too
 *   --json        emit a machine-readable JSON result line
 *
 * NOTE on ratchet drift: count ceilings get +15%/+3 headroom, so an --update on a slightly
 * worse run can creep a ceiling up ~3/cycle. The gate catches sudden spikes better than slow
 * drift; periodically re-seed from a known-good run rather than chained --updates.
 *
 * EXIT: 0 = pass (or --update); 1 = a HARD metric regressed; 2 = bad input.
 *
 * Thresholds: data/calibration/engine_health_thresholds.json (keyed by horizon).
 * Counts/territory are RATCHETING (use --update to bless a new bound — same governance
 * as ci:structural-fingerprint:update). K:W + casualty totals are ADVISORY (casualty-model
 * retunes legitimately move them — high false-red), reported but non-fatal unless --strict.
 */

'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const THRESH_PATH = path.join(REPO_ROOT, 'data', 'calibration', 'engine_health_thresholds.json');

function die(msg, code) {
  console.error('[engine_health_gate] ' + msg);
  process.exit(code == null ? 2 : code);
}

// ---- args ----
const args = process.argv.slice(2);
const flags = { update: false, strict: false, json: false, force: false, horizon: null };
const positionals = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--update') flags.update = true;
  else if (a === '--strict') flags.strict = true;
  else if (a === '--json') flags.json = true;
  else if (a === '--force') flags.force = true;
  else if (a === '--horizon') flags.horizon = args[++i];
  else positionals.push(a);
}
const runDir = positionals[0];
if (!runDir) die('usage: node tools/engine_health_gate.cjs <run_dir> [--horizon 40w|188w] [--update] [--strict] [--json]', 2);

const summaryPath = path.join(runDir, 'run_summary.json');
const savePath = path.join(runDir, 'final_save.json');
if (!fs.existsSync(summaryPath)) die('run_summary.json not found in ' + runDir, 2);
if (!fs.existsSync(savePath)) die('final_save.json not found in ' + runDir, 2);

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const save = JSON.parse(fs.readFileSync(savePath, 'utf8'));

// ---- horizon ----
const weeks = summary.weeks != null ? summary.weeks : (save.meta && save.meta.turn);
let horizon = flags.horizon;
if (!horizon) horizon = weeks != null && weeks <= 60 ? '40w' : '188w';

// ---- measure ----
// M1: combat_causality is hoisted to the top level only when weeks_at_war > 0; the
// always-populated copy lives under behavioral_health. Fall back so a no-combat run
// doesn't silently report 0/0 (masking issues) instead of the real figures.
const cc =
  summary.combat_causality ||
  (summary.behavioral_health && summary.behavioral_health.combat_causality) ||
  {};
const destroyed = Array.isArray(summary.destroyed_brigades) ? summary.destroyed_brigades : [];
const ghostDestroyed = destroyed.filter(
  (b) => (b.battles_fought || 0) === 0 && (b.total_casualties_taken || 0) === 0
).length;

const mil = save.military || {};
const formationsRaw = mil.formations || {};
const formations = Array.isArray(formationsRaw) ? formationsRaw : Object.values(formationsRaw);
// M3: count only GENUINELY-stranded-alive brigades ('holding', plus the transient
// 'reconnected'). 'collapsed' is the TERMINAL dead-stranded marker (load-bearing
// permanent-death state per EH-3 2026-06-11) — those are intentional, numerous, and
// counting them would saturate the metric. We want the live cut-off-from-front signal.
// LIFECYCLE GUARD (2026-08-12). The comment above always SAID "alive", but the
// filter never checked, so this metric was counting DESTROYED formations that
// merely retained a stale `stranded_status`. It credited the theater-scoped
// cohesion change with an 8 -> 7 "improvement" it did not make: the delta was
// entirely `rs_1st_novigrad_infantry`, a destroyed brigade at personnel 0, no
// longer being destroyed. Living formations carry `lifecycle_status: undefined`
// and `status: 'active'`; the dead ones carry `lifecycle_status: 'destroyed'`
// and `status: 'inactive'` — both are checked because neither field alone is
// reliably populated across the formation set.
const isAliveFormation = (f) =>
  f.lifecycle_status !== 'destroyed' && f.status !== 'inactive';
const stranded = formations.filter(
  (f) => f
    && (f.stranded_status === 'holding' || f.stranded_status === 'reconnected')
    && isAliveFormation(f)
).length;

// K:W from faction-level casualty_ledger (fall back to summing per_formation).
const ledger = mil.casualty_ledger || {};
let killed = 0;
let wounded = 0;
for (const faction of Object.keys(ledger)) {
  const fl = ledger[faction] || {};
  if (typeof fl.killed === 'number' && typeof fl.wounded === 'number') {
    killed += fl.killed;
    wounded += fl.wounded;
  } else if (fl.per_formation) {
    for (const fid of Object.keys(fl.per_formation)) {
      const pf = fl.per_formation[fid] || {};
      killed += pf.killed || 0;
      wounded += pf.wounded || 0;
    }
  }
}
const kwRatio = killed > 0 ? +(wounded / killed).toFixed(3) : 0;

// R6 Task 0.3 Step 8 instrumentation (2026-08-06): mean brigade morale + combat-effective
// brigade count per faction, mirroring computeCombatEffectiveBrigades EXACTLY
// (src/sim/negotiation/compute_combat_effective.ts): active brigade-kind formations
// (kind === 'brigade' || undefined), personnel >= 200 && morale >= 40 (defaults 1000/100).
// ADVISORY / diagnostic only — NO gate, NO threshold — so it unblocks measuring the RS
// brigade-destruction / morale-compounding asymmetry without a rerun. Territory-flat:
// reads the existing final_save, changes no sim behavior.
const HEALTH_FACTIONS = ['RBiH', 'RS', 'HRHB'];
const EFFECTIVE_PERSONNEL_MIN = 200;
const EFFECTIVE_MORALE_MIN = 40;
const moraleSum = { RBiH: 0, RS: 0, HRHB: 0 };
const activeBrigades = { RBiH: 0, RS: 0, HRHB: 0 };
const combatEffective = { RBiH: 0, RS: 0, HRHB: 0 };
for (const f of formations) {
  if (!f) continue;
  const faction = f.faction;
  if (!faction || HEALTH_FACTIONS.indexOf(faction) === -1) continue;
  if (f.status !== 'active') continue;
  if (f.kind !== 'brigade' && f.kind !== undefined) continue;
  const personnel = typeof f.personnel === 'number' ? f.personnel : 1000;
  const morale = typeof f.morale === 'number' ? f.morale : 100;
  activeBrigades[faction]++;
  moraleSum[faction] += morale;
  if (personnel >= EFFECTIVE_PERSONNEL_MIN && morale >= EFFECTIVE_MORALE_MIN) combatEffective[faction]++;
}
const meanMoraleByFaction = {};
for (const faction of HEALTH_FACTIONS) {
  meanMoraleByFaction[faction] = activeBrigades[faction] > 0
    ? +(moraleSum[faction] / activeBrigades[faction]).toFixed(1)
    : 0;
}

// R6 exhaustion/scoring lane — Phase 1 exhaustion-curve gate (2026-08-06,
// docs/plans/2026-08-06-exhaustion-scoring-redesign-plan.md). Reads the per-faction
// per-week `exhaustion` series already emitted in weekly_report.jsonl (no new
// instrumentation) and computes the panel's exhaustion-CURVE health metrics. ADVISORY —
// reported, never hard-fails — because the 17-specialist panel expects these to FAIL on
// the current (pre-fix) engine; capturing that failing baseline is the falsifiable
// artifact that distinguishes this fix cycle from the two that shipped green. Territory-
// flat (reads existing run output; no sim behavior). CAP = 10000 (current war_exhaustion
// scale). Metrics 4-5 (cost-index saturation/spread) need computeWarCostIndex (scoring.ts)
// and are a wired-in follow-up.
const EXHAUSTION_CAP = 10000;
const weeklyPath = path.join(runDir, 'weekly_report.jsonl');
let exhaustionCurve = null;
if (fs.existsSync(weeklyPath)) {
  const series = { RBiH: [], RS: [], HRHB: [] };
  for (const line of fs.readFileSync(weeklyPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let w;
    try { w = JSON.parse(line); } catch (e) { continue; }
    const facs = Array.isArray(w.factions) ? w.factions : [];
    for (const fe of facs) {
      if (fe && HEALTH_FACTIONS.indexOf(fe.id) !== -1 && typeof fe.exhaustion === 'number') {
        series[fe.id].push(fe.exhaustion);
      }
    }
  }
  const weeksN = Math.min(series.RBiH.length, series.RS.length, series.HRHB.length);
  if (weeksN > 0) {
    // (1) first week ANY faction saturates (>= 0.99*cap); null if never. Floor >= 150.
    let firstSat = null;
    for (let i = 0; i < weeksN; i++) {
      if (HEALTH_FACTIONS.some((f) => series[f][i] >= 0.99 * EXHAUSTION_CAP)) { firstSat = i + 1; break; }
    }
    // (2) KEYSTONE — % of weeks where cross-faction spread < 1% of cap. Ceiling <= 15.
    let deadWeeks = 0;
    for (let i = 0; i < weeksN; i++) {
      const vals = HEALTH_FACTIONS.map((f) => series[f][i]);
      if (Math.max.apply(null, vals) - Math.min.apply(null, vals) < 0.01 * EXHAUSTION_CAP) deadWeeks++;
    }
    // (3) smallest pairwise gap at the final week, as % of cap. Floor >= 5.
    const last = HEALTH_FACTIONS.map((f) => series[f][weeksN - 1]);
    let minGap = Infinity;
    for (let a = 0; a < last.length; a++) {
      for (let b = a + 1; b < last.length; b++) minGap = Math.min(minGap, Math.abs(last[a] - last[b]));
    }
    exhaustionCurve = {
      weeks: weeksN,
      first_saturation_week: firstSat,
      dead_weeks_pct: +((deadWeeks / weeksN) * 100).toFixed(1),
      terminal_min_gap_pct: +((minGap / EXHAUSTION_CAP) * 100).toFixed(2),
      terminal_by_faction: { RBiH: Math.round(last[0]), RS: Math.round(last[1]), HRHB: Math.round(last[2]) },
    };
  }
}

const matchedOsids =
  (summary.historical_fit &&
    summary.historical_fit.osid_pair_match &&
    summary.historical_fit.osid_pair_match.matched_osids) || 0;

// CHECKPOINT FLOORS (2026-08-24). matchedOsids above is the TERMINAL reference only
// (oct1995 at 188w). A single definitive run now scores four historical checkpoints, and
// until this block existed the gate could not see three of them: a change could regress
// jan1993 by 20 OSIDs and pass green so long as oct1995 held. Same semantics as
// matched_osids -- a ratcheting floor with NO headroom.
const checkpointMatched = {};
for (const c of (summary.historical_fit && summary.historical_fit.checkpoints) || []) {
  if (c && c.reference_key && c.osid_pair_match) {
    checkpointMatched[c.reference_key] = c.osid_pair_match.matched_osids || 0;
  }
}

// ---- state-integrity delegation ----
// T2: use process.execPath so the child runs the same Node as the parent.
const consistency = spawnSync(
  process.execPath,
  [path.join('tools', 'validate_run_consistency.cjs'), runDir],
  { cwd: REPO_ROOT, encoding: 'utf8' }
);
// validate_run_consistency.cjs hard-fails (exit 1) on KNOWN-tolerated conditions that are
// present even on the blessed 658 baseline (sector-floor shortfalls with no legal donor,
// undefended subsegments, uncontested adjacencies — 3 at 188w, 0 at 40w). So we do NOT use
// its binary exit as a hard gate (that would red the baseline). Instead we parse its failure
// COUNT and RATCHET it — a regression that ADDS new state-integrity failures is caught, the
// baseline's known ones are tolerated.
const consistencyOut = (consistency.stdout || '') + '\n' + (consistency.stderr || '');
const consistencyMatch = consistencyOut.match(/(\d+)\s+failure\(s\)\s+detected/i);
// If the validator exited non-zero WITHOUT a parseable "N failure(s) detected" summary
// (crash / truncated output / bad cwd / unhandled exception), we cannot trust the count.
// Recording a tolerable "1" here would let the gate PASS (ceilings tolerate 3/6) while the
// validator never actually counted the state-integrity issues — a false green. So flag it
// and HARD-FAIL the consistency check regardless of ceiling. (Codex P2, 2026-06-11.)
const consistencyParseError = !consistencyMatch && consistency.status !== 0;
const consistencyFailures = consistencyMatch
  ? parseInt(consistencyMatch[1], 10)
  : consistency.status === 0
  ? 0
  : NaN; // unparseable non-zero exit → NaN sentinel; consistencyParseError forces a hard fail

// ── CORRECTED OPERATION PREDICATES — RE Phase 0 item 0.2. REPORTED, NEVER GATED. ─────────────
//
// The two shipped counters below come from engine-side accumulators
// (`invalid_operation_count`, `zero_eligible_attacker_operation_count`). They read 0 on runs where
// operations demonstrably never attacked: measured 2026-08-26, n374 has SIX of forty operations
// and NINE of sixty axes with `total_attacks === 0`, and n294 has NINETEEN of fifty-two — while
// both shipped counters report 0. The gate is green on a measure that is not counting this.
//
// These corrected figures are computed from `operation_aars.json` and are ADVISORY ONLY. They are
// deliberately NOT gated: blessing today's numbers as the ceiling would ratchet the defect in as
// the floor, which is exactly what the plan warns against. Promote to a hard ceiling only after
// the underlying tempo work (REAL_WAR_MASTER #40, raised to P0 on 2026-08-26) lands.
//
// ⚠ FIELD NAME: it is `total_attacks` on an axis summary, NOT `attack_attempt_count`. A first
// version of this read the latter, got `undefined ?? 0` for every axis, and reported all 40
// operations as dead. The `undefined` counter below exists so that failure can never be silent.
function correctedOpPredicates(dir) {
  const p = path.join(dir, 'operation_aars.json');
  if (!fs.existsSync(p)) return null;
  let list;
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    list = Array.isArray(raw) ? raw : (raw.aars || raw.operations || []);
  } catch { return null; }
  let zeroOps = 0, zeroAxes = 0, totalAxes = 0, missingField = 0;
  for (const op of list) {
    let opAttacks = 0;
    for (const ax of (op.axis_summaries || [])) {
      totalAxes++;
      if (ax.total_attacks === undefined) missingField++;
      const t = ax.total_attacks ?? 0;
      opAttacks += t;
      if (t === 0) zeroAxes++;
    }
    if (opAttacks === 0) zeroOps++;
  }
  return { ops: list.length, zeroOps, axes: totalAxes, zeroAxes, missingField };
}
const correctedOps = correctedOpPredicates(runDir);

// ── PLANNING-DEATH COUNTER — owner-approved 2026-08-26. REPORTED, NOT GATED. ─────────────────
//
// "The counter for ops that die in planning sounds useful." — owner.
//
// THE BLIND SPOT IT CLOSES: every existing invalidation predicate is EXECUTION-SCOPED.
// `combat_causality.ts` requires `operation.phase === 'execution'`, and anomaly check #12
// (`anomaly_detector.ts`) opens with `if (!enteredExecution) continue;`. So an operation that is
// created, sits in planning, and is killed there is invisible to `invalid_operation_count`,
// `zero_eligible_attacker_operation_count` and the anomaly detector alike — all three report 0
// while it happens. The engine had NO counter for "created and never executed".
//
// Measured 2026-08-26: n374 has 8 sector_attack + 71 probe deaths in planning out of 259 distinct
// operations; n294 has 23 + 64 out of 255. The 8 reconciles exactly with 44 sector_attacks minus
// the 36 that reached execution — and it sees two that the AAR-based view misses, because four
// operations were still live at t188 and never produced an AAR at all.
//
// ⚠ NOT GATED, and deliberately so. Some planning deaths are CORRECT — a corps refusing an
// unwinnable attack is the force-ratio floor doing its job. This counts them so they can be READ,
// not so they can be minimised. Do not bless today's figure as a ceiling; that would ratchet in a
// defect as the floor, the same trap the corrected-op predicate above avoids.
//
// ⚠ AND THE TEMPO ITSELF IS CORRECT MODELLING — owner ruling, same date: a besieged corps does not
// mount offensives, and probes are a legitimate intel instrument. Do not read a high count here as
// "the engine under-fights."
function planningDeathCounter(dir) {
  const p = path.join(dir, 'weekly_report.jsonl');
  if (!fs.existsSync(p)) return null;
  const ops = new Map();
  let rows = 0, missingPhase = 0;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    let rec;
    try { rec = JSON.parse(line); } catch { continue; }
    for (const od of (rec.operation_diagnostics || [])) {
      rows++;
      if (od.operation_phase === undefined) missingPhase++;
      const key = `${od.corps_id ?? '?'}|${od.operation_name ?? '?'}`;
      if (!ops.has(key)) ops.set(key, { reachedExecution: false, recovery: null, type: od.operation_type ?? 'unknown' });
      const e = ops.get(key);
      if (od.operation_phase === 'execution') e.reachedExecution = true;
      if (od.recovery_reason) e.recovery = od.recovery_reason;
    }
  }
  if (rows === 0) return { unavailable: 'no operation_diagnostics rows' };
  if (missingPhase === rows) return { unavailable: `all ${rows} diagnostic rows lack operation_phase` };
  const byType = {};
  const totalByType = {};
  const reasons = {};
  for (const [, e] of ops) {
    totalByType[e.type] = (totalByType[e.type] || 0) + 1;
    if (!e.reachedExecution && e.recovery) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      reasons[e.recovery] = (reasons[e.recovery] || 0) + 1;
    }
  }
  return { distinctOps: ops.size, totalByType, byType, reasons };
}
const planningDeaths = planningDeathCounter(runDir);

const measured = {
  horizon,
  weeks,
  zero_eligible_ops: cc.zero_eligible_attacker_operation_count || 0,
  // Renamed in the REPORT (Phase 0 item 0.2) to say what it actually counts — op x turn instances,
  // not operations. The THRESHOLD KEY stays `dead_ops_max` so no threshold file needs migrating.
  dead_ops: cc.invalid_operation_count || 0,
  ghost_destroyed: ghostDestroyed,
  stranded_brigades: stranded,
  consistency_failures: consistencyFailures,
  matched_osids: matchedOsids,
  checkpoint_matched: checkpointMatched,
  kw_ratio: kwRatio,
  total_killed: killed,
  total_wounded: wounded,
  // Advisory diagnostics (R6 exhaustion/scoring lane) — reported, never gated (yet).
  // Ratified thresholds (Pyrrhic panel 2026-08-06, unanimous GO-WITH-CONDITION):
  //   BINDING (when promoted): first_saturation_week >= 150, dead_weeks_pct <= 15 (keystone).
  //   ADVISORY: terminal_min_gap_pct > 0 (DEMOTED from a 5% target — proven decoupled from
  //     downstream grade/§6; re-collapse is enforced by the binding dead_weeks_pct, not here).
  // Adopted engine PASSES both binding metrics (first_saturation null, dead_weeks 0.5%).
  // See data/calibration/exhaustion_curve_baseline.json for the binding/advisory split.
  exhaustion_curve: exhaustionCurve,
  // Advisory diagnostics (R6 Task 0.3 Step 8) — reported, never gated.
  mean_morale_by_faction: meanMoraleByFaction,
  combat_effective_by_faction: combatEffective,
  active_brigades_by_faction: activeBrigades,
  // HOLLOW RATIO (2026-08-12) — combat_effective / active_brigades, per faction.
  // REPORTED, NEVER GATED, and deliberately carries NO band: there is no evidence
  // base for a threshold yet, and inventing one would be the same error this metric
  // exists to expose.
  //
  // WHY IT EXISTS. The gate could see how many brigades EXIST but not how many can
  // FIGHT, and that blind spot was exploited twice on 2026-08-12. The theater-scoped
  // cohesion floor removed a dissolution CRITERION without restoring any capability
  // (brigade_dissolution.ts is a 2-of-3 gate — personnel<400, cohesion<=20,
  // morale<=15 — and the RS faction floor of 20 sits EXACTLY on the cohesion
  // criterion, so clamping the east to 30 simply un-ticks it). Result: RS active
  // brigades 65 -> 68 while RS combat-effective FELL 27 -> 22 and mean morale fell
  // 42.3 -> 37.6. Hollow ratio 0.42 -> 0.32. Every hard check passed.
  //
  // This is the brigade-ledger form of the same trap recorded as EH-F7 for the
  // operation ledger ("a larger op ledger is not by itself evidence of health").
  // Read it alongside mean_morale_by_faction: a ratio falling while active_brigades
  // rises means formations are being kept alive but hollow.
  hollow_ratio_by_faction: Object.fromEntries(
    Object.keys(activeBrigades).sort().map((faction) => {
      const active = activeBrigades[faction] || 0;
      const effective = combatEffective[faction] || 0;
      return [faction, active > 0 ? Number((effective / active).toFixed(3)) : null];
    })
  ),
};

// ---- thresholds ----
function defaultBand() {
  return {
    // ratcheting ceilings (lower is better)
    zero_eligible_ops_max: measured.zero_eligible_ops,
    dead_ops_max: measured.dead_ops,
    ghost_destroyed_max: measured.ghost_destroyed,
    stranded_brigades_max: measured.stranded_brigades,
    consistency_failures_max: measured.consistency_failures,
    // ratcheting floor (higher is better)
    matched_osids_min: measured.matched_osids,
    // per-checkpoint floors, same no-headroom semantics
    checkpoint_matched_min: { ...measured.checkpoint_matched },
    // advisory band (informational unless --strict)
    kw_ratio_lo: +(measured.kw_ratio * 0.85).toFixed(3),
    kw_ratio_hi: +(measured.kw_ratio * 1.15).toFixed(3),
  };
}
/** Turn-boundary jitter absorbed by each per-checkpoint floor. See withHeadroom. */
const CHECKPOINT_JITTER_TOLERANCE = 3;

function withHeadroom(band) {
  // counts get +15% or +3 headroom (whichever larger) so trivial noise doesn't false-red;
  // matched_osids floor takes NO headroom (a single-OSID regression must be caught).
  const ceilH = (v) => Math.max(Math.ceil(v * 1.15), v + 3);
  return {
    zero_eligible_ops_max: ceilH(band.zero_eligible_ops_max),
    dead_ops_max: ceilH(band.dead_ops_max),
    ghost_destroyed_max: ceilH(band.ghost_destroyed_max),
    stranded_brigades_max: ceilH(band.stranded_brigades_max),
    consistency_failures_max: ceilH(band.consistency_failures_max),
    matched_osids_min: band.matched_osids_min,
    // Checkpoint floors DO take a small tolerance, unlike matched_osids. Turn-boundary
    // jitter is endemic and real: adding two captures at t9/t10 shifted ~two dozen
    // unrelated captures across the map by one turn, and a capture that lands on turn 188
    // in one run falls off the end in the next. Pinning a checkpoint at its exact measured
    // value would red the gate on that noise and teach everyone to pass --force, which is
    // strictly worse than a floor with a stated tolerance. 3 still catches the regression
    // class this exists for (a 20-OSID checkpoint collapse passing green on oct1995 alone).
    checkpoint_matched_min: Object.fromEntries(
      Object.entries(band.checkpoint_matched_min || {}).map(([k, v]) => [k, Math.max(0, v - CHECKPOINT_JITTER_TOLERANCE)])
    ),
    kw_ratio_lo: band.kw_ratio_lo,
    kw_ratio_hi: band.kw_ratio_hi,
  };
}

let thresholds = {};
if (fs.existsSync(THRESH_PATH)) thresholds = JSON.parse(fs.readFileSync(THRESH_PATH, 'utf8'));

if (flags.update) {
  // Never seed thresholds from a run whose validator failed to report a count — the
  // consistency_failures_max would become NaN (→ null) and silently disable the check.
  if (consistencyParseError) {
    die(
      `cannot --update: validate_run_consistency exited ${consistency.status} with no ` +
        `parseable failure count. Fix the validator/run before seeding thresholds.`,
      2
    );
  }
  // N3: never let --update silently LOWER the territory floor (that would defeat its
  // purpose — a degraded run could quietly ratchet the floor down). Require --force.
  const existingFloor = thresholds[horizon] && thresholds[horizon].matched_osids_min;
  if (existingFloor != null && measured.matched_osids < existingFloor && !flags.force) {
    die(
      `refusing to lower matched_osids floor ${existingFloor} -> ${measured.matched_osids} ` +
        `for ${horizon}. This run is WORSE than the blessed floor. Pass --force only if you ` +
        `deliberately intend to drop the floor.`,
      2
    );
  }
  // Same N3 protection for every per-checkpoint floor: an --update must never quietly
  // ratchet a checkpoint DOWN. Without this, blessing a run that traded 8 points of
  // jan1993 for 1 point of oct1995 would lock the loss in as the new floor.
  const existingCp = (thresholds[horizon] && thresholds[horizon].checkpoint_matched_min) || {};
  const lowered = Object.keys(existingCp)
    .filter((k) => measured.checkpoint_matched[k] != null && measured.checkpoint_matched[k] < existingCp[k])
    .map((k) => `${k} ${existingCp[k]} -> ${measured.checkpoint_matched[k]}`);
  if (lowered.length && !flags.force) {
    die(
      `refusing to lower checkpoint floor(s) for ${horizon}: ${lowered.join(', ')}. ` +
        `This run is WORSE at those checkpoints than the blessed floor. Pass --force only ` +
        `if you deliberately intend to drop them.`,
      2
    );
  }
  thresholds[horizon] = withHeadroom(defaultBand());
  thresholds._note =
    'Engine-health gate thresholds (EH-1 Part B). Counts = ratcheting ceilings (+15%/+3 headroom); ' +
    'matched_osids = floor (no headroom); kw_ratio = advisory band. Re-bless via: ' +
    'node tools/engine_health_gate.cjs <run_dir> --horizon <h> --update';
  fs.mkdirSync(path.dirname(THRESH_PATH), { recursive: true });
  fs.writeFileSync(THRESH_PATH, JSON.stringify(thresholds, null, 2) + '\n');
  console.log(`[engine_health_gate] --update wrote ${horizon} band to ${path.relative(REPO_ROOT, THRESH_PATH)}:`);
  console.log(JSON.stringify(thresholds[horizon], null, 2));
  process.exit(0);
}

const band = thresholds[horizon];
if (!band) die(`no thresholds for horizon '${horizon}' in ${path.relative(REPO_ROOT, THRESH_PATH)}; seed with --update`, 2);

// ---- evaluate ----
const checks = [];
const hard = (name, ok, detail) => checks.push({ name, ok, hard: true, detail });
const soft = (name, ok, detail) => checks.push({ name, ok, hard: false, detail });

hard('zero_eligible_ops', measured.zero_eligible_ops <= band.zero_eligible_ops_max, `${measured.zero_eligible_ops} <= ${band.zero_eligible_ops_max}`);
// Label says `invalid_op_weeks` because that is what the engine counter measures — op x turn
// instances, not operations. The threshold key remains `dead_ops_max`; nothing migrates.
hard('invalid_op_weeks', measured.dead_ops <= band.dead_ops_max, `${measured.dead_ops} <= ${band.dead_ops_max}`);

// ── ADVISORY, NEVER GATED (Phase 0 item 0.2) ────────────────────────────────────────────────
// The corrected, axis-scoped view of the same question, computed from operation_aars.json.
// Printed beside the gated numbers precisely so the disagreement is visible: the shipped
// counters can read 0 while operations in the same run never attacked at all.
if (correctedOps) {
  if (correctedOps.missingField > 0) {
    console.log(`  [ADVISORY] corrected_ops   UNAVAILABLE — ${correctedOps.missingField}/${correctedOps.axes} axes lack \`total_attacks\`; NOT reporting a 0 that would be a lookup failure`);
  } else if (correctedOps.axes === 0) {
    console.log('  [ADVISORY] corrected_ops   UNAVAILABLE — run carries zero axes; a 0 here would mean nothing');
  } else {
    console.log(
      `  [ADVISORY] dead_ops_corrected  ${correctedOps.zeroOps}/${correctedOps.ops} operations and `
      + `${correctedOps.zeroAxes}/${correctedOps.axes} axes recorded ZERO attacks`
      + `   <- reported not gated; gating today's figure would ratchet the defect in as the floor (REAL_WAR_MASTER #40)`,
    );
  }
}

// ── PLANNING-DEATH COUNTER (owner-approved 2026-08-26). ADVISORY. ───────────────────────────
if (planningDeaths) {
  if (planningDeaths.unavailable) {
    console.log(`  [ADVISORY] planning_deaths  UNAVAILABLE — ${planningDeaths.unavailable}; NOT reporting a 0 that would be a lookup failure`);
  } else {
    const parts = Object.keys(planningDeaths.byType).sort()
      .map((t) => `${t} ${planningDeaths.byType[t]}/${planningDeaths.totalByType[t] ?? '?'}`);
    const top = Object.entries(planningDeaths.reasons).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([r, n]) => `${r} ${n}`).join(', ');
    console.log(
      `  [ADVISORY] planning_deaths   ${parts.join('  ')}  of ${planningDeaths.distinctOps} distinct ops`
      + `   <- created, never executed; INVISIBLE to every other counter`,
    );
    if (top) console.log(`  [ADVISORY]                   top reasons: ${top}`);
  }
}
hard('ghost_destroyed', measured.ghost_destroyed <= band.ghost_destroyed_max, `${measured.ghost_destroyed} <= ${band.ghost_destroyed_max}`);
hard('stranded_brigades', measured.stranded_brigades <= band.stranded_brigades_max, `${measured.stranded_brigades} <= ${band.stranded_brigades_max}`);
hard('matched_osids', measured.matched_osids >= band.matched_osids_min, `${measured.matched_osids} >= ${band.matched_osids_min}`);
// One hard check per checkpoint the band knows about. A band predating this feature has
// no checkpoint_matched_min, so nothing is checked and the gate stays green until blessed.
for (const key of Object.keys((band && band.checkpoint_matched_min) || {}).sort()) {
  const floor = band.checkpoint_matched_min[key];
  const got = measured.checkpoint_matched[key];
  hard(
    `checkpoint_${key}`,
    got != null && got >= floor,
    got == null
      ? `run emitted no ${key} checkpoint (expected >= ${floor}) — scoring may be off`
      : `${got} >= ${floor}`
  );
}

hard(
  'consistency_failures',
  !consistencyParseError && measured.consistency_failures <= band.consistency_failures_max,
  consistencyParseError
    ? `validate_run_consistency exited ${consistency.status} with no parseable "N failure(s) detected" summary — cannot trust count (hard fail)`
    : `${measured.consistency_failures} <= ${band.consistency_failures_max} (validate_run_consistency)`,
);
soft('kw_ratio', measured.kw_ratio >= band.kw_ratio_lo && measured.kw_ratio <= band.kw_ratio_hi, `${measured.kw_ratio} in [${band.kw_ratio_lo}, ${band.kw_ratio_hi}]`);

const hardFail = checks.some((c) => c.hard && !c.ok);
const softFail = checks.some((c) => !c.hard && !c.ok);
const fail = hardFail || (flags.strict && softFail);

// ---- report ----
if (flags.json) {
  console.log(JSON.stringify({ horizon, measured, band, checks, pass: !fail }, null, 0));
} else {
  console.log(`[engine_health_gate] horizon=${horizon} weeks=${weeks}`);
  for (const c of checks) {
    const tag = c.ok ? 'PASS' : c.hard ? 'FAIL' : 'WARN';
    console.log(`  [${tag}] ${c.name.padEnd(18)} ${c.detail}`);
  }
  // Surfaced on its own line because it is the one signal the hard checks cannot
  // see: a faction can gain brigades while losing the ability to fight with them.
  // Advisory — no band, never gated. See hollow_ratio_by_faction above.
  const hollow = Object.entries(measured.hollow_ratio_by_faction || {})
    .map(([f, r]) => `${f} ${r === null ? 'n/a' : r.toFixed(2)} (${measured.combat_effective_by_faction[f] || 0}/${measured.active_brigades_by_faction[f] || 0})`)
    .join('  ');
  console.log(`  [ADVISORY] hollow_ratio     ${hollow}   <- combat-effective / active; falling while active rises = hollow ledger`);
  console.log(`  metrics: ${JSON.stringify(measured)}`);
  if (measured.consistency_failures > band.consistency_failures_max) {
    console.log('  --- validate_run_consistency output (tail) — failures exceeded ceiling ---');
    if (consistency.stdout) console.log(consistency.stdout.split('\n').slice(-14).join('\n'));
    if (consistency.stderr) console.log('  [stderr] ' + consistency.stderr.split('\n').slice(-6).join('\n'));
  }
  console.log(`[engine_health_gate] ${fail ? 'FAIL' : 'PASS'}${softFail && !flags.strict ? ' (advisory K:W warning, non-fatal)' : ''}`);
}

process.exit(fail ? 1 : 0);
