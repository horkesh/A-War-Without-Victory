/**
 * Phase H1.1: Determinism test for headless scenario harness.
 * Same scenario run twice => identical final_save.json (and weekly_report.jsonl).
 * Skips when municipality controller mapping is missing (same requirement as sim_run).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import { runScenario } from '../src/scenario/scenario_runner.js';
import { loadScenario, computeRunId } from '../src/scenario/scenario_loader.js';

const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'noop_52w.json');
const OUT_A = join(process.cwd(), '.tmp_scenario_test_a');
const OUT_B = join(process.cwd(), '.tmp_scenario_test_b');

function isMissingMappingError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('Municipality controller mapping file not found') ||
    msg.includes('not in municipality_political_controllers')
  );
}

async function ensureRemoved(dir: string): Promise<void> {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true });
  }
}

test('scenario determinism: same scenario run twice yields identical final_save.json', async () => {
  await ensureRemoved(OUT_A);
  await ensureRemoved(OUT_B);

  const scenario = await loadScenario(SCENARIO_PATH);
  const run_id = computeRunId(scenario);

  let ranA = false;
  let ranB = false;
  try {
    await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: OUT_A });
    ranA = true;
    await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: OUT_B });
    ranB = true;
  } catch (err) {
    if (isMissingMappingError(err)) {
      return;
    }
    throw err;
  }

  if (!ranA || !ranB) return;

  const pathA = join(OUT_A, run_id, 'final_save.json');
  const pathB = join(OUT_B, run_id, 'final_save.json');

  const bytesA = await readFile(pathA, 'utf8');
  const bytesB = await readFile(pathB, 'utf8');

  assert.strictEqual(bytesA, bytesB, 'final_save.json must be byte-identical across two runs');

  const reportA = await readFile(join(OUT_A, run_id, 'weekly_report.jsonl'), 'utf8');
  const reportB = await readFile(join(OUT_B, run_id, 'weekly_report.jsonl'), 'utf8');
  assert.strictEqual(reportA, reportB, 'weekly_report.jsonl must be byte-identical across two runs');

  const controlEventsA = await readFile(join(OUT_A, run_id, 'control_events.jsonl'), 'utf8');
  const controlEventsB = await readFile(join(OUT_B, run_id, 'control_events.jsonl'), 'utf8');
  assert.strictEqual(controlEventsA, controlEventsB, 'control_events.jsonl must be byte-identical across two runs');

  const formationDeltaA = await readFile(join(OUT_A, run_id, 'formation_delta.json'), 'utf8');
  const formationDeltaB = await readFile(join(OUT_B, run_id, 'formation_delta.json'), 'utf8');
  assert.strictEqual(formationDeltaA, formationDeltaB, 'formation_delta.json must be byte-identical across two runs');

  await ensureRemoved(OUT_A);
  await ensureRemoved(OUT_B);
});
