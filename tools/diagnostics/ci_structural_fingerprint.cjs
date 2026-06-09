'use strict';

/**
 * CI driver for the platform-stable structural fingerprint (C1, 2026-06-09).
 *
 * 1. Runs a fresh 40w scenario (the calibration-flat horizon) via the preflight runner.
 * 2. Parses the `outDir: <path>` line the runner prints to stdout to locate the artifacts.
 * 3. Runs tools/diagnostics/structural_fingerprint.cjs in --check (default) or --update mode
 *    against the committed expected file.
 *
 * Modes:
 *   node tools/diagnostics/ci_structural_fingerprint.cjs            # check (CI default; fails on drift)
 *   node tools/diagnostics/ci_structural_fingerprint.cjs --update   # regenerate expected (deliberate)
 *
 * Reference platform: Linux/Node 22. The committed expected fingerprint is generated on
 * that platform; Windows==Linux byte-hashes are NOT promised, but the STRUCTURAL fields
 * (OSID control map + anchors + benchmarks) are platform-stable by construction (DoD C2).
 *
 * Determinism: no wall-clock / RNG here; the scenario itself is deterministic.
 */

const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { join, isAbsolute } = require('node:path');

const REPO_ROOT = process.cwd();
const SCENARIO = 'data/scenarios/apr1992_definitive_40w.json';
const OUT_ROOT = 'runs';
const EXPECTED = join('data', 'calibration', 'structural_fingerprint_40w.json');
const FINGERPRINT_TOOL = join('tools', 'diagnostics', 'structural_fingerprint.cjs');

function runScenario() {
  const tsxCli = join(REPO_ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  const runner = join(REPO_ROOT, 'tools', 'scenario_runner', 'run_scenario_with_preflight.ts');
  const result = spawnSync(
    process.execPath,
    [tsxCli, runner, '--scenario', SCENARIO, '--unique', '--out', OUT_ROOT],
    { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`Scenario run failed with exit code ${result.status}`);
  }
  // The runner prints `outDir: <path>`; take the last one if multiple.
  const matches = [...(result.stdout || '').matchAll(/^outDir:\s*(.+)\s*$/gm)];
  if (matches.length === 0) {
    throw new Error('Could not parse `outDir:` from scenario runner stdout.');
  }
  const raw = matches[matches.length - 1][1].trim();
  const outDir = isAbsolute(raw) ? raw : join(REPO_ROOT, raw);
  if (!existsSync(join(outDir, 'run_summary.json'))) {
    throw new Error(`Run dir ${outDir} has no run_summary.json`);
  }
  return outDir;
}

function main(argv) {
  const update = argv.includes('--update');
  const outDir = runScenario();

  const mode = update ? '--update' : '--check';
  const result = spawnSync(
    process.execPath,
    [join(REPO_ROOT, FINGERPRINT_TOOL), outDir, mode, '--expected', join(REPO_ROOT, EXPECTED)],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result.status ?? 1;
}

if (require.main === module) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}
