/**
 * Phase 2.4: init_formations yields expected formations and is deterministic.
 * SKIPs when data prereqs missing. Runs apr1992_4w (init_control + init_formations) twice, asserts identical final_save formation set.
 */

import { expect, test } from 'vitest';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';

const BASE_A = join(process.cwd(), '.tmp_scenario_init_formations_a');
const BASE_B = join(process.cwd(), '.tmp_scenario_init_formations_b');

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true });
    }
}

function formationIdsFromState(state: { military: { formations?: Record<string, unknown> } }): string[] {
    const formations = state.military.formations ?? {};
    return Object.keys(formations).sort((a, b) => a.localeCompare(b));
}

test('init_formations: apr1992_4w has 3 formations and run is deterministic', { timeout: 30000 }, async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) {
        return;
    }

    await ensureRemoved(BASE_A);
    await ensureRemoved(BASE_B);

    const scenarioPath = join(process.cwd(), 'data', 'scenarios', 'apr1992_4w.json');
    const resultA = await runScenario({ scenarioPath, outDirBase: BASE_A });
    const resultB = await runScenario({ scenarioPath, outDirBase: BASE_B });

    expect(existsSync(resultA.paths.initial_save)).toBe(true);
    expect(existsSync(resultA.paths.final_save)).toBe(true);
    expect(existsSync(resultB.paths.final_save)).toBe(true);

    const initialContent = await readFile(resultA.paths.initial_save, 'utf8');
    const initialState = JSON.parse(initialContent) as { military: { formations?: Record<string, unknown> } };
    const initialIds = formationIdsFromState(initialState);
    expect(initialIds.length).toBeGreaterThanOrEqual(3);

    const finalAContent = await readFile(resultA.paths.final_save, 'utf8');
    const finalBContent = await readFile(resultB.paths.final_save, 'utf8');
    expect(finalAContent).toBe(finalBContent);

    await ensureRemoved(BASE_A);
    await ensureRemoved(BASE_B);
});
