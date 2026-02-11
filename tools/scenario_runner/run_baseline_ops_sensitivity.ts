#!/usr/bin/env node
/**
 * Phase H1.11: Baseline ops sensitivity harness CLI.
 * Runs multiple (scalar, weeks, scope) tuples; writes per-run artifacts and aggregated report.
 */


import { checkDataPrereqs, formatMissingRemediation } from '../../src/data_prereq/check_data_prereqs.js';
import {
  runSensitivityHarness,
  DEFAULT_SCALARS,
  DEFAULT_WEEKS,
  DEFAULT_SCOPE_MODES
} from '../../src/scenario/baseline_ops_sensitivity.js';
import type { BaselineOpsScopeMode } from '../../src/scenario/scenario_runner.js';
import { join } from 'node:path';


const DEFAULT_OUT = join(process.cwd(), 'data', 'derived', 'scenario', 'baseline_ops_sensitivity');
const DEFAULT_SCENARIO_DIR = join(process.cwd(), 'data', 'scenarios');

function parseScalars(s: string): number[] {
  return s
    .split(',')
    .map((x) => parseFloat(x.trim()))
    .filter((n) => Number.isFinite(n));
}

function parseWeeks(s: string): number[] {
  return s
    .split(',')
    .map((x) => parseInt(x.trim(), 10))
    .filter((n) => Number.isInteger(n) && n > 0);
}

function parseScope(s: string): BaselineOpsScopeMode[] {
  const v = s.trim().toLowerCase();
  if (v === 'all') {
    return [...DEFAULT_SCOPE_MODES];
  }
  const allowed = new Set<BaselineOpsScopeMode>(['all_front_active', 'static_front_only', 'fluid_front_only']);
  const list = s.split(',').map((x) => x.trim() as BaselineOpsScopeMode);
  return list.filter((x) => allowed.has(x));
}

function parseArgs(): {
  scalars: number[];
  weeks: number[];
  scope: BaselineOpsScopeMode[];
  outDir: string;
  scenarioDir: string;
} {
  const args = process.argv.slice(2);
  let scalars = DEFAULT_SCALARS;
  let weeks = DEFAULT_WEEKS;
  let scope: BaselineOpsScopeMode[] = ['all_front_active'];
  let outDir = DEFAULT_OUT;
  let scenarioDir = DEFAULT_SCENARIO_DIR;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scalars' && args[i + 1]) {
      scalars = parseScalars(args[++i]!);
      if (scalars.length === 0) scalars = DEFAULT_SCALARS;
    } else if (args[i] === '--weeks' && args[i + 1]) {
      weeks = parseWeeks(args[++i]!);
      if (weeks.length === 0) weeks = DEFAULT_WEEKS;
    } else if (args[i] === '--scope' && args[i + 1]) {
      scope = parseScope(args[++i]!);
      if (scope.length === 0) scope = ['all_front_active'];
    } else if (args[i] === '--outDir' && args[i + 1]) {
      outDir = args[++i]!.startsWith('/') || /^[A-Za-z]:/.test(args[i]!) ? args[i]! : join(process.cwd(), args[i]!);
    } else if (args[i] === '--scenarioDir' && args[i + 1]) {
      scenarioDir = args[++i]!.startsWith('/') || /^[A-Za-z]:/.test(args[i]!) ? args[i]! : join(process.cwd(), args[i]!);
    }
  }
  return { scalars, weeks, scope, outDir, scenarioDir };
}

async function main(): Promise<void> {
  const prereq = checkDataPrereqs({ baseDir: process.cwd() });
  if (!prereq.ok) {
    process.stderr.write(formatMissingRemediation(prereq));
    process.exit(1);
  }

  const { scalars, weeks, scope, outDir, scenarioDir } = parseArgs();

  const report = await runSensitivityHarness({
    scalars,
    weeks,
    scope_modes: scope,
    outDir,
    scenarioDir
  });

  process.stdout.write(`Report: ${join(outDir, 'baseline_ops_sensitivity_report.json')}\n`);
  process.stdout.write(`Monotonicity: ${report.checks.monotonicity.pass ? 'pass' : 'fail'}\n`);
  process.stdout.write(`Intensity ordering: ${report.checks.intensity_ordering.pass ? 'pass' : 'fail'}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
