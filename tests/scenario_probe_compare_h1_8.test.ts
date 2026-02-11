/**
 * Phase H1.8: Probe compare test — baseline vs probe run produces probe_compare.json and probe_compare.md.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';


import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runProbeCompare } from '../src/scenario/scenario_runner.js';


const BASE_OUT = join(process.cwd(), '.tmp_probe_compare_h1_8');
const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_4w_probe_intent.json');

async function ensureRemoved(dir: string): Promise<void> {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true });
  }
}

test('scenario probe compare: probe_compare.json and probe_compare.md exist with required keys', async () => {
  const prereq = checkDataPrereqs({ baseDir: process.cwd() });
  if (!prereq.ok) {
    return;
  }

  await ensureRemoved(BASE_OUT);

  const result = await runProbeCompare({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT });

  assert(existsSync(result.paths.probe_compare_json), 'probe_compare.json should exist');
  assert(existsSync(result.paths.probe_compare_md), 'probe_compare.md should exist');
  assert(existsSync(result.baselineOutDir), 'baseline run dir should exist');
  assert(existsSync(result.probeOutDir), 'probe run dir should exist');

  const compareRaw = await readFile(result.paths.probe_compare_json, 'utf8');
  const compare = JSON.parse(compareRaw) as {
    scenario_id?: string;
    weeks?: number;
    run_ids?: { baseline: string; probe: string };
    deltas?: unknown;
    conclusion?: string[];
  };

  assert(typeof compare.scenario_id === 'string', 'probe_compare.json should have scenario_id');
  assert(typeof compare.weeks === 'number', 'probe_compare.json should have weeks');
  assert(compare.run_ids != null, 'probe_compare.json should have run_ids');
  assert(typeof compare.run_ids!.baseline === 'string', 'run_ids.baseline should be string');
  assert(typeof compare.run_ids!.probe === 'string', 'run_ids.probe should be string');
  assert(compare.deltas != null, 'probe_compare.json should have deltas');
  assert(Array.isArray(compare.conclusion), 'probe_compare.json should have conclusion array');

  const mdContent = await readFile(result.paths.probe_compare_md, 'utf8');
  assert(mdContent.includes('Probe compare report'), 'probe_compare.md should contain header');
  assert(mdContent.includes('Conclusion'), 'probe_compare.md should contain Conclusion section');

  await ensureRemoved(BASE_OUT);
});
