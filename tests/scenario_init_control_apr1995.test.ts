/**
 * April 1995 scenario: assert init_control "apr1995" yields expected anchors (srebrenica→RBiH, jajce→RS).
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

async function ensureRemoved(dir: string): Promise<void> {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true });
  }
}

test('init_control apr1995: srebrenica RBiH and jajce RS (validation anchors)', async () => {
  const prereq = checkDataPrereqs({ baseDir: process.cwd() });
  if (!prereq.ok) {
    return;
  }

  const graph = await loadSettlementGraph();
  let sidSrebrenica: string | null = null;
  let sidJajce: string | null = null;
  for (const [sid, rec] of graph.settlements) {
    if (rec.mun1990_id === 'srebrenica' && sidSrebrenica == null) sidSrebrenica = sid;
    if (rec.mun1990_id === 'jajce' && sidJajce == null) sidJajce = sid;
    if (sidSrebrenica != null && sidJajce != null) break;
  }
  assert(sidSrebrenica != null, 'graph should have at least one settlement in srebrenica');
  assert(sidJajce != null, 'graph should have at least one settlement in jajce');

  await ensureRemoved(BASE_OUT);
  const scenarioPath = join(process.cwd(), 'data', 'scenarios', 'apr1995_start.json');
  const result = await runScenario({ scenarioPath, outDirBase: BASE_OUT, weeksOverride: 4 });

  assert(existsSync(result.paths.initial_save), 'initial_save.json should exist');
  const initialContent = await readFile(result.paths.initial_save, 'utf8');
  const state = JSON.parse(initialContent) as { political_controllers?: Record<string, string | null> };
  const pc = state.political_controllers ?? {};
  assert.strictEqual(pc[sidSrebrenica!], 'RBiH', 'srebrenica (April 1995) should be RBiH');
  assert.strictEqual(pc[sidJajce!], 'RS', 'jajce (April 1995) should be RS');

  await ensureRemoved(BASE_OUT);
});
