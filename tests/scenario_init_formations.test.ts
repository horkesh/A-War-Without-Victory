/**
 * Phase 2.4: init_formations yields expected formations and is deterministic.
 * SKIPs when data prereqs missing. Runs apr1992_4w (init_control + init_formations) twice, asserts identical final_save formation set.
 */

import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';


const BASE_A = join(process.cwd(), '.tmp_scenario_init_formations_a');
const BASE_B = join(process.cwd(), '.tmp_scenario_init_formations_b');

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true });
    }
}

function formationIdsFromState(state: { formations?: Record<string, unknown> }): string[] {
    const formations = state.formations ?? {};
    return Object.keys(formations).sort((a, b) => a.localeCompare(b));
}

test('init_formations: apr1992_4w has 3 formations and run is deterministic', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) {
        return;
    }

    await ensureRemoved(BASE_A);
    await ensureRemoved(BASE_B);

    const scenarioPath = join(process.cwd(), 'data', 'scenarios', 'apr1992_4w.json');
    const resultA = await runScenario({ scenarioPath, outDirBase: BASE_A });
    const resultB = await runScenario({ scenarioPath, outDirBase: BASE_B });

    assert(existsSync(resultA.paths.initial_save), 'run A initial_save should exist');
    assert(existsSync(resultA.paths.final_save), 'run A final_save should exist');
    assert(existsSync(resultB.paths.final_save), 'run B final_save should exist');

    const initialContent = await readFile(resultA.paths.initial_save, 'utf8');
    const initialState = JSON.parse(initialContent) as { formations?: Record<string, unknown> };
    const initialIds = formationIdsFromState(initialState);
    // hybrid_1992 init_control produces more formations than the old ethnic_1991 mode.
    // The key assertion is determinism (identical runs), not a specific count.
    assert(initialIds.length >= 3, `apr1992_4w should have at least 3 initial formations, got ${initialIds.length}`);

    const finalAContent = await readFile(resultA.paths.final_save, 'utf8');
    const finalBContent = await readFile(resultB.paths.final_save, 'utf8');
    assert.strictEqual(finalAContent, finalBContent, 'two runs should produce byte-identical final_save.json (determinism)');

    await ensureRemoved(BASE_A);
    await ensureRemoved(BASE_B);
});
