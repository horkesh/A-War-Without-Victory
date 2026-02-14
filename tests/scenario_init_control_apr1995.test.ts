/**
 * April 1995 scenario: validate municipal anchors against apr1995 source snapshot.
 * SKIPs when data prereqs missing. Uses apr1995_start with init_control apr1995 (4-week run for speed).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';
import { loadSettlementGraph } from '../src/map/settlements.js';


const BASE_OUT = join(process.cwd(), '.tmp_scenario_init_control_apr1995');

function strictCompare(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

async function ensureRemoved(dir: string): Promise<void> {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true });
  }
}

test('init_control apr1995: municipal anchors match apr1995 source snapshot', async () => {
  const prereq = checkDataPrereqs({ baseDir: process.cwd() });
  if (!prereq.ok) {
    return;
  }

  const graph = await loadSettlementGraph();
  const sidToMun = new Map<string, string>();
  for (const [sid, rec] of graph.settlements) {
    if (!rec.mun1990_id) continue;
    sidToMun.set(sid, rec.mun1990_id);
  }

  await ensureRemoved(BASE_OUT);
  const scenarioPath = join(process.cwd(), 'data', 'scenarios', 'apr1995_start.json');
  const result = await runScenario({ scenarioPath, outDirBase: BASE_OUT, weeksOverride: 4 });

  assert(existsSync(result.paths.initial_save), 'initial_save.json should exist');
  const initialContent = await readFile(result.paths.initial_save, 'utf8');
  const state = JSON.parse(initialContent) as { political_controllers?: Record<string, string | null> };
  const pc = state.political_controllers ?? {};
  const expectedContent = await readFile(
    join(process.cwd(), 'data', 'source', 'municipalities_1990_initial_political_controllers_apr1995.json'),
    'utf8'
  );
  const expected = JSON.parse(expectedContent) as { controllers_by_mun1990_id?: Record<string, string> };
  const expectedByMun = expected.controllers_by_mun1990_id ?? {};
  const targetMuns = ['srebrenica', 'jajce'];
  const countsByMun = new Map<string, Map<string, number>>();
  for (const [sid, controller] of Object.entries(pc)) {
    if (!controller) continue;
    const mun = sidToMun.get(sid);
    if (!mun || !targetMuns.includes(mun)) continue;
    const munCounts = countsByMun.get(mun) ?? new Map<string, number>();
    munCounts.set(controller, (munCounts.get(controller) ?? 0) + 1);
    countsByMun.set(mun, munCounts);
  }
  for (const mun of targetMuns) {
    const munCounts = countsByMun.get(mun);
    assert(munCounts != null && munCounts.size > 0, `${mun} should have initialized settlements`);
    const sortedControllers = Array.from(munCounts.keys()).sort(strictCompare);
    let bestController = sortedControllers[0];
    let bestCount = munCounts.get(bestController) ?? 0;
    for (const controller of sortedControllers) {
      const count = munCounts.get(controller) ?? 0;
      if (count > bestCount) {
        bestController = controller;
        bestCount = count;
      }
    }
    const expectedController = expectedByMun[mun];
    assert(expectedController != null, `${mun} must exist in apr1995 source snapshot`);
    assert.strictEqual(
      bestController,
      expectedController,
      `${mun} majority controller should match apr1995 source snapshot`
    );
  }

  await ensureRemoved(BASE_OUT);
});
