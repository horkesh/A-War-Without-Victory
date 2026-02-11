/**
 * Phase 1.3: Assert init_control "apr1992" yields expected control anchors (zvornik→RS, bijeljina→RS).
 * SKIPs when data prereqs missing. Uses apr1992_4w scenario and municipalities_1990_initial_political_controllers_apr1992.json.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';
import { loadSettlementGraph } from '../src/map/settlements.js';


const BASE_OUT = join(process.cwd(), '.tmp_scenario_init_control_apr1992');

async function ensureRemoved(dir: string): Promise<void> {
  if (existsSync(dir)) {
    await rm(dir, { recursive: true });
  }
}

test('init_control apr1992: zvornik and bijeljina are RS (validation anchors)', async () => {
  const prereq = checkDataPrereqs({ baseDir: process.cwd() });
  if (!prereq.ok) {
    return;
  }

  const graph = await loadSettlementGraph();
  let sidZvornik: string | null = null;
  let sidBijeljina: string | null = null;
  for (const [sid, rec] of graph.settlements) {
    if (rec.mun1990_id === 'zvornik' && sidZvornik == null) sidZvornik = sid;
    if (rec.mun1990_id === 'bijeljina' && sidBijeljina == null) sidBijeljina = sid;
    if (sidZvornik != null && sidBijeljina != null) break;
  }
  assert(sidZvornik != null, 'graph should have at least one settlement in zvornik');
  assert(sidBijeljina != null, 'graph should have at least one settlement in bijeljina');

  await ensureRemoved(BASE_OUT);
  const scenarioPath = join(process.cwd(), 'data', 'scenarios', 'apr1992_4w.json');
  const result = await runScenario({ scenarioPath, outDirBase: BASE_OUT });

  assert(existsSync(result.paths.initial_save), 'initial_save.json should exist');
  const initialContent = await readFile(result.paths.initial_save, 'utf8');
  const state = JSON.parse(initialContent) as { political_controllers?: Record<string, string | null> };
  const pc = state.political_controllers ?? {};
  assert.strictEqual(pc[sidZvornik!], 'RS', 'zvornik (April 1992) should be RS');
  assert.strictEqual(pc[sidBijeljina!], 'RS', 'bijeljina (April 1992) should be RS');

  await ensureRemoved(BASE_OUT);
});
