import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';
import type { GameState } from '../src/state/game_state.js';
import { deserializeState } from '../src/state/serialize.js';

const BASE_OUT = join(process.cwd(), '.tmp_systems_2_3_4_7_9_10');
const PHASE_II_SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'apr1992_phase_ii_4w.json');

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true });
    }
}

test('systems 2/3/4/7/9/10 acceptance gates: phase_ii run populates required state', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) return;

    await ensureRemoved(BASE_OUT);
    const result = await runScenario({ scenarioPath: PHASE_II_SCENARIO_PATH, outDirBase: BASE_OUT, weeksOverride: 1 });
    const finalSaveRaw = await readFile(result.paths.final_save, 'utf8');
    const state = deserializeState(finalSaveRaw) as GameState;

    // System 2 + 7 + 10 gates at faction level
    assert.ok((state.factions ?? []).length > 0, 'factions should exist');
    for (const faction of state.factions ?? []) {
        assert.ok(faction.embargo_profile, `system2 embargo_profile missing for ${faction.id}`);
        assert.ok(faction.maintenance_capacity, `system3 maintenance_capacity missing for ${faction.id}`);
        assert.ok(faction.capability_profile, `system10 capability_profile missing for ${faction.id}`);
        assert.ok(faction.negotiation, `system7 negotiation state missing for ${faction.id}`);
    }

    // System 3 + 9 gates at formation level
    const formations = Object.values(state.formations ?? {});
    assert.ok(formations.length > 0, 'formations should exist for phase_ii scenario');
    for (const f of formations) {
        assert.ok(f.equipment_state, `system3 equipment_state missing for formation ${f.id}`);
        assert.ok(f.doctrine_state, `system9 doctrine_state missing for formation ${f.id}`);
    }

    // System 4 legitimacy gate at settlement level
    const settlementEntries = Object.entries(state.settlements ?? {});
    assert.ok(settlementEntries.length > 0, 'settlement state should exist');
    const legitimacyCount = settlementEntries.filter(([, s]) => s.legitimacy_state != null).length;
    assert.ok(legitimacyCount > 0, 'system4 legitimacy_state should be populated for at least one settlement');

    await ensureRemoved(BASE_OUT);
});
