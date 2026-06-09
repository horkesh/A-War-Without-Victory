'use strict';

/**
 * Platform-stable structural fingerprint of a scenario run.
 *
 * WHY THIS EXISTS
 * ---------------
 * The byte-hash baseline CI job (SHA256 of run artifacts incl. final_save.json) was
 * removed 2026-05-04 because the save byte-hash diverges between the Windows dev box
 * and the Linux CI runner (floating-point / serialization-order platform differences).
 * That left determinism regression with NO machine signal on CI
 * (TODO: LANE-NIGHTSHIFT-PLATFORM-STABLE-MANIFEST).
 *
 * This tool replaces the byte-hash with a fingerprint over MEANINGFUL, platform-stable
 * fields only — integers, strings, and booleans that are invariant across Win/Linux:
 *   - per-faction OSID control counts (the control map)        <- control_delta.json
 *   - anchor pass/fail map (the calibration anchors)           <- run_summary.anchor_checks
 *   - bot benchmark pass/fail/not_reached/evaluated            <- run_summary.bot_benchmark_evaluation
 *   - run shape (scenario_id, weeks, final_turn)
 *
 * It DELIBERATELY EXCLUDES per-faction formation/brigade counts
 * (historical_alignment.final.brigades_*). Empirically those vary run-to-run even at an
 * IDENTICAL territory byte-hash (verified: three same-hash 40w runs gave identical
 * control maps + anchors but DIFFERENT brigades_active), so brigade tallies are a
 * non-deterministic run-snapshot artifact, not part of the territory/anchor contract that
 * the calibration floor pins. Including them would make the fingerprint flap and erode the
 * signal. Territory control + anchors + benchmarks ARE the stable calibration contract.
 *
 * It DELIBERATELY EXCLUDES final_state_hash (the platform-divergent save byte-hash) and
 * any floating-point fields. The resulting fingerprint is the determinism regression
 * signal on the CI reference platform (Linux/Node 22). If it moves without a deliberate
 * `--update`, the run changed structurally.
 *
 * Determinism: pure function of the input artifacts. No wall-clock, no RNG, no Date.now().
 * Stable key ordering via stableStringify + sorted arrays.
 *
 * Usage:
 *   node tools/diagnostics/structural_fingerprint.cjs <run_dir> [--json] [--full]
 *   node tools/diagnostics/structural_fingerprint.cjs --check <run_dir> --expected <file.json>
 *   node tools/diagnostics/structural_fingerprint.cjs --update <run_dir> --expected <file.json>
 */

const { createHash } = require('node:crypto');
const { readFileSync, writeFileSync, existsSync } = require('node:fs');
const { join } = require('node:path');

const SCHEMA_VERSION = 1;

/** Deterministic JSON: object keys sorted recursively, arrays preserved as given. */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sortByKey(arr, key) {
  return [...arr].sort((a, b) => {
    const av = String(a[key]);
    const bv = String(b[key]);
    return av < bv ? -1 : av > bv ? 1 : 0;
  });
}

/**
 * Build the canonical structural object from a run directory's artifacts.
 * Throws if a required artifact is missing (a missing artifact IS a regression).
 */
function buildStructuralFields(runDir) {
  const runSummaryPath = join(runDir, 'run_summary.json');
  const controlDeltaPath = join(runDir, 'control_delta.json');
  if (!existsSync(runSummaryPath)) {
    throw new Error(`Missing run_summary.json in ${runDir}`);
  }
  if (!existsSync(controlDeltaPath)) {
    throw new Error(`Missing control_delta.json in ${runDir}`);
  }
  const runSummary = readJson(runSummaryPath);
  const controlDelta = readJson(controlDeltaPath);

  // --- Per-faction OSID control map (sorted by controller) ---
  const controlCounts = {};
  const rawControl = Array.isArray(controlDelta.net_control_counts_after)
    ? controlDelta.net_control_counts_after
    : [];
  for (const row of sortByKey(rawControl, 'controller')) {
    controlCounts[row.controller] = row.count;
  }

  // --- Anchor pass/fail map (sorted by anchor_id) ---
  const anchorChecks = {};
  const rawAnchors = runSummary.anchor_checks
    ? Object.values(runSummary.anchor_checks)
    : [];
  let anchorsPassed = 0;
  for (const a of sortByKey(rawAnchors, 'anchor_id')) {
    anchorChecks[a.anchor_id] = a.passed === true;
    if (a.passed === true) anchorsPassed += 1;
  }

  // --- Bot benchmark tallies (integers only) ---
  const bench = runSummary.bot_benchmark_evaluation || {};
  const benchmark = {
    evaluated: bench.evaluated ?? 0,
    passed: bench.passed ?? 0,
    failed: bench.failed ?? 0,
    not_reached: bench.not_reached ?? 0,
  };

  return {
    schema_version: SCHEMA_VERSION,
    scenario_id: runSummary.scenario_id ?? null,
    weeks: runSummary.weeks ?? null,
    final_turn: runSummary.summary?.final_turn ?? null,
    control_counts: controlCounts,
    anchors_passed: anchorsPassed,
    anchors_total: Object.keys(anchorChecks).length,
    anchor_checks: anchorChecks,
    benchmark,
  };
}

/** 16-hex-char fingerprint (SHA256 truncated, matching the repo's final_state_hash width). */
function fingerprintOf(fields) {
  return createHash('sha256').update(stableStringify(fields)).digest('hex').slice(0, 16);
}

function buildFingerprint(runDir) {
  const fields = buildStructuralFields(runDir);
  return { fingerprint: fingerprintOf(fields), fields };
}

function parseArgs(argv) {
  const out = { runDir: null, json: false, full: false, check: false, update: false, expected: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') out.json = true;
    else if (arg === '--full') out.full = true;
    else if (arg === '--check') out.check = true;
    else if (arg === '--update') out.update = true;
    else if (arg === '--expected') { out.expected = argv[i + 1]; i += 1; }
    else if (!out.runDir) out.runDir = arg;
  }
  return out;
}

function main(argv) {
  const args = parseArgs(argv);
  if (!args.runDir) {
    process.stderr.write(
      'Usage: structural_fingerprint.cjs <run_dir> [--json] [--full] ' +
        '[--check|--update --expected <file.json>]\n',
    );
    return 2;
  }

  const { fingerprint, fields } = buildFingerprint(args.runDir);

  if (args.update) {
    if (!args.expected) {
      process.stderr.write('--update requires --expected <file.json>\n');
      return 2;
    }
    const payload = { schema_version: SCHEMA_VERSION, fingerprint, fields };
    writeFileSync(args.expected, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    process.stdout.write(`Updated ${args.expected} -> ${fingerprint}\n`);
    return 0;
  }

  if (args.check) {
    if (!args.expected || !existsSync(args.expected)) {
      process.stderr.write(`--check requires an existing --expected file (got ${args.expected})\n`);
      return 2;
    }
    const expected = readJson(args.expected);
    if (expected.fingerprint === fingerprint) {
      process.stdout.write(`OK structural fingerprint ${fingerprint} matches expected.\n`);
      return 0;
    }
    process.stderr.write(
      `STRUCTURAL FINGERPRINT MISMATCH\n` +
        `  expected: ${expected.fingerprint}\n` +
        `  actual:   ${fingerprint}\n` +
        `The scenario run changed structurally (control map / anchors / benchmarks).\n` +
        `If this is intentional, re-run with --update and commit the new expected file.\n`,
    );
    // Field-level diff to make the regression legible.
    const expFields = expected.fields || {};
    const diffs = [];
    const collect = (path, a, b) => {
      const as = stableStringify(a);
      const bs = stableStringify(b);
      if (as !== bs) diffs.push(`  ${path}: expected ${as} got ${bs}`);
    };
    collect('control_counts', expFields.control_counts, fields.control_counts);
    collect('anchors_passed', expFields.anchors_passed, fields.anchors_passed);
    collect('anchor_checks', expFields.anchor_checks, fields.anchor_checks);
    collect('benchmark', expFields.benchmark, fields.benchmark);
    if (diffs.length) process.stderr.write(`Field diffs:\n${diffs.join('\n')}\n`);
    return 1;
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify({ fingerprint, fields }, null, args.full ? 2 : 0)}\n`);
  } else {
    process.stdout.write(`${fingerprint}\n`);
    if (args.full) process.stdout.write(`${JSON.stringify(fields, null, 2)}\n`);
  }
  return 0;
}

module.exports = { buildStructuralFields, buildFingerprint, fingerprintOf, stableStringify, SCHEMA_VERSION };

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}
