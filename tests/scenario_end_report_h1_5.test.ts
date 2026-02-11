/**
 * Phase H1.5: End-of-run report artifacts and control_delta structure.
 * Skips when prerequisites missing (same as scenario harness smoke tests).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { readFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';


import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';


const BASE_OUT = join(process.cwd(), '.tmp_scenario_end_report_h1_5');
const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_4w.json');

async function ensureRemoved(dir: string): Promise<void> {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true });
  }
}

test('end-of-run report artifacts exist', async () => {
  const prereq = checkDataPrereqs({ baseDir: process.cwd() });
  if (!prereq.ok) {
    return;
  }

  await ensureRemoved(BASE_OUT);
  await mkdir(BASE_OUT, { recursive: true });

  const result = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT });

  assert(existsSync(result.paths.initial_save), 'initial_save.json should exist');
  assert(existsSync(result.paths.final_save), 'final_save.json should exist');
  assert(existsSync(result.paths.control_delta), 'control_delta.json should exist');
  assert(existsSync(result.paths.end_report), 'end_report.md should exist');

  await ensureRemoved(BASE_OUT);
});

test('control_delta.json is stable and ordered', async () => {
  const prereq = checkDataPrereqs({ baseDir: process.cwd() });
  if (!prereq.ok) {
    return;
  }

  await ensureRemoved(BASE_OUT);
  await mkdir(BASE_OUT, { recursive: true });
  const result = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT });

  const raw = await readFile(result.paths.control_delta, 'utf8');
  const delta = JSON.parse(raw) as {
    total_flips?: number;
    flips?: unknown[];
    flips_by_direction?: Array<{ from: string | null; to: string | null; count: number }>;
    flips_by_municipality?: Array<{ municipality_id: string | null; count: number }>;
    net_control_counts_before?: unknown[];
    net_control_counts_after?: unknown[];
    net_control_count_delta?: unknown[];
  };

  assert(typeof delta.total_flips === 'number', 'total_flips should exist');
  assert(Array.isArray(delta.flips), 'flips should be array');
  assert(Array.isArray(delta.flips_by_direction), 'flips_by_direction should be array');
  assert(Array.isArray(delta.flips_by_municipality), 'flips_by_municipality should be array');
  assert(Array.isArray(delta.net_control_counts_before), 'net_control_counts_before should be array');
  assert(Array.isArray(delta.net_control_counts_after), 'net_control_counts_after should be array');
  assert(Array.isArray(delta.net_control_count_delta), 'net_control_count_delta should be array');

  for (let i = 1; i < (delta.flips_by_municipality?.length ?? 0); i++) {
    const a = delta.flips_by_municipality![i - 1];
    const b = delta.flips_by_municipality![i];
    assert(b.count <= a.count, 'flips_by_municipality should be sorted by count desc');
    if (b.count === a.count) {
      const aid = a.municipality_id ?? 'null';
      const bid = b.municipality_id ?? 'null';
      assert(
        aid.localeCompare(bid) <= 0,
        'flips_by_municipality same count should be sorted by municipality_id'
      );
    }
  }

  for (let i = 1; i < (delta.flips_by_direction?.length ?? 0); i++) {
    const a = delta.flips_by_direction![i - 1];
    const b = delta.flips_by_direction![i];
    const aKey = `${a.from ?? 'null'}\t${a.to ?? 'null'}`;
    const bKey = `${b.from ?? 'null'}\t${b.to ?? 'null'}`;
    assert(aKey <= bKey, 'flips_by_direction should be sorted lexicographically');
  }

  await ensureRemoved(BASE_OUT);
});
