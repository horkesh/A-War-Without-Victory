import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';

const BASE_OUT = join(process.cwd(), '.tmp_scenario_no_initial_brigades');
const SCENARIO_PATH = join(BASE_OUT, 'scenario.json');

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true });
    }
}

function formationCounts(state: { formations?: Record<string, { kind?: string }> }): {
    brigades: number;
    corpsLike: number;
} {
    let brigades = 0;
    let corpsLike = 0;
    for (const f of Object.values(state.formations ?? {})) {
        const kind = f?.kind ?? 'brigade';
        if (kind === 'brigade') brigades += 1;
        if (kind === 'corps_asset' || kind === 'army_hq') corpsLike += 1;
    }
    return { brigades, corpsLike };
}

test('player_choice + no_initial_brigade_formations starts with corps only, then recruits brigades', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) return;

    await ensureRemoved(BASE_OUT);
    await mkdir(BASE_OUT, { recursive: true });

    const scenario = {
        scenario_id: 'tmp_deferred_recruitment_phaseii_1w',
        start_phase: 'phase_ii',
        weeks: 1,
        init_control: 'apr1992',
        recruitment_mode: 'player_choice',
        no_initial_brigade_formations: true,
        recruitment_capital: { RS: 250, RBiH: 150, HRHB: 100 },
        equipment_points: { RS: 300, RBiH: 60, HRHB: 120 },
        turns: []
    };
    await writeFile(SCENARIO_PATH, JSON.stringify(scenario, null, 2) + '\n', 'utf8');

    const result = await runScenario({ scenarioPath: SCENARIO_PATH, outDirBase: BASE_OUT });

    const initialState = JSON.parse(await readFile(result.paths.initial_save, 'utf8')) as {
        formations?: Record<string, { kind?: string }>;
    };
    const finalState = JSON.parse(await readFile(result.paths.final_save, 'utf8')) as {
        formations?: Record<string, { kind?: string }>;
    };

    const initial = formationCounts(initialState);
    const final = formationCounts(finalState);

    assert.strictEqual(initial.brigades, 0, 'initial state should have no brigade formations');
    assert.ok(initial.corpsLike > 0, 'initial state should contain corps/army_hq formations');
    assert.ok(final.brigades > 0, 'after one turn, at least one brigade should be recruited');

    await ensureRemoved(BASE_OUT);
});
