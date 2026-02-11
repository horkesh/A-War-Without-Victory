/**
 * Phase H1.4: Mini scenario regression suite — smoke test for harness.
 * Runs noop_4w, noop_13w, noop_52w when prereqs exist; SKIPs when prereqs missing.
 * Asserts expected artifacts exist and line counts match weeks; noop_4w determinism check.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { readFile, rm, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';
import { loadScenario } from '../src/scenario/scenario_loader.js';


const BASE_OUT = join(process.cwd(), '.tmp_scenario_smoke_h1_4');
const BASE_A = join(process.cwd(), '.tmp_scenario_smoke_h1_4_a');
const BASE_B = join(process.cwd(), '.tmp_scenario_smoke_h1_4_b');

const SCENARIO_PATHS = [
  join(process.cwd(), 'data', 'scenarios', 'noop_4w.json'),
  join(process.cwd(), 'data', 'scenarios', 'noop_13w.json'),
  join(process.cwd(), 'data', 'scenarios', 'noop_52w.json')
];

async function ensureRemoved(dir: string): Promise<void> {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true });
  }
}

function countLines(content: string): number {
  const lines = content.split('\n').filter((line) => line.length > 0);
  return lines.length;
}

test('scenario harness smoke: noop scenarios produce expected artifacts', async () => {
  const prereq = checkDataPrereqs({ baseDir: process.cwd() });
  if (!prereq.ok) {
    return;
  }

  await ensureRemoved(BASE_OUT);
  await mkdir(BASE_OUT, { recursive: true });

  for (const scenarioPath of SCENARIO_PATHS) {
    const result = await runScenario({ scenarioPath, outDirBase: BASE_OUT });
    assert(existsSync(result.outDir), `output dir should exist: ${result.outDir}`);
    assert(existsSync(join(result.outDir, 'run_meta.json')), 'run_meta.json should exist');
    assert(existsSync(result.paths.initial_save), 'initial_save.json should exist');
    assert(existsSync(result.paths.final_save), 'final_save.json should exist');
    assert(existsSync(result.paths.weekly_report), 'weekly_report.jsonl should exist');
    assert(existsSync(result.paths.replay), 'replay.jsonl should exist');
    assert(existsSync(result.paths.run_summary), 'run_summary.json should exist');
    assert(existsSync(result.paths.control_delta), 'control_delta.json should exist');
    assert(existsSync(result.paths.end_report), 'end_report.md should exist');

    const scenario = await loadScenario(scenarioPath);
    const reportContent = await readFile(result.paths.weekly_report, 'utf8');
    const reportLines = countLines(reportContent);
    assert.strictEqual(reportLines, scenario.weeks, `weekly_report.jsonl line count should equal weeks (${scenario.weeks})`);

    const replayContent = await readFile(result.paths.replay, 'utf8');
    const replayLines = countLines(replayContent);
    assert.strictEqual(replayLines, scenario.weeks, `replay.jsonl line count should equal weeks (${scenario.weeks})`);
  }

  await ensureRemoved(BASE_OUT);
});

test('scenario harness smoke: noop_4w determinism (two runs => identical final_save.json)', async () => {
  const prereq = checkDataPrereqs({ baseDir: process.cwd() });
  if (!prereq.ok) {
    return;
  }

  const scenarioPath = join(process.cwd(), 'data', 'scenarios', 'noop_4w.json');
  await ensureRemoved(BASE_A);
  await ensureRemoved(BASE_B);
  await mkdir(BASE_A, { recursive: true });
  await mkdir(BASE_B, { recursive: true });

  const resultA = await runScenario({ scenarioPath, outDirBase: BASE_A });
  const resultB = await runScenario({ scenarioPath, outDirBase: BASE_B });

  assert.strictEqual(resultA.run_id, resultB.run_id, 'run_id should be deterministic');
  const bytesA = await readFile(resultA.paths.final_save, 'utf8');
  const bytesB = await readFile(resultB.paths.final_save, 'utf8');
  assert.strictEqual(bytesA, bytesB, 'final_save.json must be byte-identical across two runs');

  await ensureRemoved(BASE_A);
  await ensureRemoved(BASE_B);
});
