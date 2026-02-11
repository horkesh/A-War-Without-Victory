/**
 * Phase H1.11: Baseline ops sensitivity harness tests.
 * Determinism, monotonicity + intensity ordering, safety (control unchanged).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';


import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runSensitivityHarness } from '../src/scenario/baseline_ops_sensitivity.js';
import type { BaselineOpsScopeMode } from '../src/scenario/scenario_runner.js';


const BASE_TEST = join(process.cwd(), 'data', 'derived', '_test');
const SCENARIO_DIR = join(process.cwd(), 'data', 'scenarios');

async function ensureRemoved(dir: string): Promise<void> {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true });
  }
}

test('sensitivity harness: determinism (two runs yield byte-identical report)', async () => {
  const prereq = checkDataPrereqs({ baseDir: process.cwd() });
  if (!prereq.ok) return;

  const dir1 = join(BASE_TEST, 'sensitivity_run_1');
  const dir2 = join(BASE_TEST, 'sensitivity_run_2');
  await ensureRemoved(dir1);
  await ensureRemoved(dir2);

  const config = {
    scalars: [0.5, 1.0],
    weeks: [26],
    scope_modes: ['all_front_active'] as BaselineOpsScopeMode[],
    outDir: '',
    scenarioDir: SCENARIO_DIR
  };

  await runSensitivityHarness({ ...config, outDir: dir1 });
  await runSensitivityHarness({ ...config, outDir: dir2 });

  const reportPath1 = join(dir1, 'baseline_ops_sensitivity_report.json');
  const reportPath2 = join(dir2, 'baseline_ops_sensitivity_report.json');
  assert(existsSync(reportPath1), 'report 1 should exist');
  assert(existsSync(reportPath2), 'report 2 should exist');

  const raw1 = await readFile(reportPath1, 'utf8');
  const raw2 = await readFile(reportPath2, 'utf8');
  assert.strictEqual(raw1, raw2, 'aggregated report should be byte-identical across two runs');

  const runFolder = 'run_all_front_active_26w_x0_5';
  const metricsPath1 = join(dir1, runFolder, 'sensitivity_run_metrics.json');
  assert(existsSync(metricsPath1), 'at least one per-run sensitivity_run_metrics.json should exist');
  const rawM1 = await readFile(metricsPath1, 'utf8');
  const rawM2 = await readFile(join(dir2, runFolder, 'sensitivity_run_metrics.json'), 'utf8');
  assert.strictEqual(rawM1, rawM2, 'per-run metrics should be byte-identical');

  await ensureRemoved(dir1);
  await ensureRemoved(dir2);
});

test('sensitivity harness: monotonicity and intensity ordering (exhaustion and displacement non-decreasing with scalar)', async () => {
  const prereq = checkDataPrereqs({ baseDir: process.cwd() });
  if (!prereq.ok) return;

  const dir = join(BASE_TEST, 'sensitivity_ordering');
  await ensureRemoved(dir);

  await runSensitivityHarness({
    scalars: [0.5, 1.0, 2.0],
    weeks: [26],
    scope_modes: ['all_front_active'],
    outDir: dir,
    scenarioDir: SCENARIO_DIR
  });

  const reportPath = join(dir, 'baseline_ops_sensitivity_report.json');
  const raw = await readFile(reportPath, 'utf8');
  const report = JSON.parse(raw) as {
    per_run: Array<{
      scope: string;
      weeks: number;
      scalar: number;
      factions: { exhaustion_end: Record<string, number> };
      displacement_end_mean: number;
    }>;
    checks: { monotonicity: { pass: boolean }; intensity_ordering: { pass: boolean } };
  };

  assert(report.checks.monotonicity.pass, 'monotonicity check should pass');
  assert(report.checks.intensity_ordering.pass, 'intensity ordering check should pass');

  const allFront26 = report.per_run.filter((r) => r.scope === 'all_front_active' && r.weeks === 26);
  allFront26.sort((a, b) => a.scalar - b.scalar);
  for (let i = 1; i < allFront26.length; i++) {
    const prev = allFront26[i - 1]!;
    const curr = allFront26[i]!;
    for (const fid of Object.keys(curr.factions.exhaustion_end)) {
      const prevEx = prev.factions.exhaustion_end[fid] ?? 0;
      const currEx = curr.factions.exhaustion_end[fid] ?? 0;
      assert(currEx >= prevEx, `exhaustion_end ${fid} should be non-decreasing with scalar: ${prevEx} -> ${currEx}`);
    }
    assert(
      curr.displacement_end_mean >= prev.displacement_end_mean,
      `displacement_end_mean should be non-decreasing with scalar: ${prev.displacement_end_mean} -> ${curr.displacement_end_mean}`
    );
  }

  await ensureRemoved(dir);
});

test('sensitivity harness: safety (political control unchanged in run)', async () => {
  const prereq = checkDataPrereqs({ baseDir: process.cwd() });
  if (!prereq.ok) return;

  const dir = join(BASE_TEST, 'sensitivity_safety');
  await ensureRemoved(dir);

  await runSensitivityHarness({
    scalars: [0.5],
    weeks: [26],
    scope_modes: ['all_front_active'],
    outDir: dir,
    scenarioDir: SCENARIO_DIR
  });

  const runFolder = 'run_all_front_active_26w_x0_5';
  const initialPath = join(dir, runFolder, 'initial_save.json');
  const finalPath = join(dir, runFolder, 'final_save.json');
  assert(existsSync(initialPath), 'initial_save should exist');
  assert(existsSync(finalPath), 'final_save should exist');

  const initialRaw = await readFile(initialPath, 'utf8');
  const finalRaw = await readFile(finalPath, 'utf8');
  const initial = JSON.parse(initialRaw) as { political_controllers?: Record<string, string | null> };
  const final = JSON.parse(finalRaw) as { political_controllers?: Record<string, string | null> };

  const pcInitial = initial.political_controllers ?? {};
  const pcFinal = final.political_controllers ?? {};
  const allSids = new Set([...Object.keys(pcInitial), ...Object.keys(pcFinal)]);
  for (const sid of allSids) {
    const a = pcInitial[sid] ?? null;
    const b = pcFinal[sid] ?? null;
    assert.strictEqual(a, b, `political_controllers[${sid}] should be unchanged`);
  }

  await ensureRemoved(dir);
});
