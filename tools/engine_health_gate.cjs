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
const stranded = formations.filter(
  (f) => f && (f.stranded_status === 'holding' || f.stranded_status === 'reconnected')
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

const matchedOsids =
  (summary.historical_fit &&
    summary.historical_fit.osid_pair_match &&
    summary.historical_fit.osid_pair_match.matched_osids) || 0;

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
const consistencyFailures = consistencyMatch
  ? parseInt(consistencyMatch[1], 10)
  : consistency.status === 0
  ? 0
  : 1; // exited non-zero but no parseable count → treat as >=1

const measured = {
  horizon,
  weeks,
  zero_eligible_ops: cc.zero_eligible_attacker_operation_count || 0,
  dead_ops: cc.invalid_operation_count || 0,
  ghost_destroyed: ghostDestroyed,
  stranded_brigades: stranded,
  consistency_failures: consistencyFailures,
  matched_osids: matchedOsids,
  kw_ratio: kwRatio,
  total_killed: killed,
  total_wounded: wounded,
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
    // advisory band (informational unless --strict)
    kw_ratio_lo: +(measured.kw_ratio * 0.85).toFixed(3),
    kw_ratio_hi: +(measured.kw_ratio * 1.15).toFixed(3),
  };
}
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
    kw_ratio_lo: band.kw_ratio_lo,
    kw_ratio_hi: band.kw_ratio_hi,
  };
}

let thresholds = {};
if (fs.existsSync(THRESH_PATH)) thresholds = JSON.parse(fs.readFileSync(THRESH_PATH, 'utf8'));

if (flags.update) {
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
hard('dead_ops', measured.dead_ops <= band.dead_ops_max, `${measured.dead_ops} <= ${band.dead_ops_max}`);
hard('ghost_destroyed', measured.ghost_destroyed <= band.ghost_destroyed_max, `${measured.ghost_destroyed} <= ${band.ghost_destroyed_max}`);
hard('stranded_brigades', measured.stranded_brigades <= band.stranded_brigades_max, `${measured.stranded_brigades} <= ${band.stranded_brigades_max}`);
hard('matched_osids', measured.matched_osids >= band.matched_osids_min, `${measured.matched_osids} >= ${band.matched_osids_min}`);
hard('consistency_failures', measured.consistency_failures <= band.consistency_failures_max, `${measured.consistency_failures} <= ${band.consistency_failures_max} (validate_run_consistency)`);
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
  console.log(`  metrics: ${JSON.stringify(measured)}`);
  if (measured.consistency_failures > band.consistency_failures_max) {
    console.log('  --- validate_run_consistency output (tail) — failures exceeded ceiling ---');
    if (consistency.stdout) console.log(consistency.stdout.split('\n').slice(-14).join('\n'));
    if (consistency.stderr) console.log('  [stderr] ' + consistency.stderr.split('\n').slice(-6).join('\n'));
  }
  console.log(`[engine_health_gate] ${fail ? 'FAIL' : 'PASS'}${softFail && !flags.strict ? ' (advisory K:W warning, non-fatal)' : ''}`);
}

process.exit(fail ? 1 : 0);
