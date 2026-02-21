import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { createStateFromScenario, runScenario } from '../src/scenario/scenario_runner.js';
import { runOneTurn } from '../src/state/turn_pipeline.js';

const SCENARIO_PATH = join(process.cwd(), 'data', 'scenarios', 'sep_1991_phase0.json');

test('sep_1991 phase0 starts pre-referendum with scheduled handoff metadata', async () => {
    const state = await createStateFromScenario(SCENARIO_PATH, process.cwd());
    const rs = state.factions.find((f) => f.id === 'RS');
    const hrhb = state.factions.find((f) => f.id === 'HRHB');
    assert.strictEqual(state.meta.phase, 'phase_0');
    assert.strictEqual(state.meta.turn, 0);
    assert.strictEqual(state.meta.referendum_held, false);
    assert.strictEqual(state.meta.referendum_turn, null);
    assert.strictEqual(state.meta.war_start_turn, null);
    assert.strictEqual(state.meta.phase_0_scheduled_referendum_turn, 26);
    assert.strictEqual(state.meta.phase_0_scheduled_war_start_turn, 30);
    assert.strictEqual(rs?.declared, false);
    assert.strictEqual(rs?.declaration_turn, null);
    assert.strictEqual(hrhb?.declared, false);
    assert.strictEqual(hrhb?.declaration_turn, null);
    assert.ok(
        (state.meta.phase_0_war_start_control_path ?? '').endsWith(
            'data\\source\\municipalities_1990_initial_political_controllers_apr1992.json'
        )
    );
});

test('sep_1991 scheduled referendum transitions to phase_i at scheduled war-start turn', async () => {
    let state = await createStateFromScenario(SCENARIO_PATH, process.cwd());

    while (state.meta.phase === 'phase_0' && state.meta.turn <= 30) {
        state = runOneTurn(state, { seed: `sep-1991-phase0-${state.meta.turn}` }).state;
    }

    const rs = state.factions.find((f) => f.id === 'RS');
    const hrhb = state.factions.find((f) => f.id === 'HRHB');
    assert.strictEqual(hrhb?.declaration_turn, 11);
    assert.strictEqual(rs?.declaration_turn, 18);
    assert.strictEqual(state.meta.referendum_held, true);
    assert.strictEqual(state.meta.referendum_turn, 26);
    assert.strictEqual(state.meta.war_start_turn, 30);
    assert.strictEqual(state.meta.phase, 'phase_i');
});

test('sep_1991 applies apr1992 control map at war start before phase_i progression', async () => {
    const outDirBase = join(process.cwd(), '.tmp_sep_1991_phase0_schedule');
    const result = await runScenario({
        scenarioPath: SCENARIO_PATH,
        weeksOverride: 31,
        outDirBase
    });
    const initial = JSON.parse(await readFile(result.paths.initial_save, 'utf8')) as {
        political_controllers?: Record<string, string>;
    };
    const final = JSON.parse(await readFile(result.paths.final_save, 'utf8')) as {
        meta: { phase?: string; referendum_turn?: number | null; war_start_turn?: number | null };
        political_controllers?: Record<string, string>;
    };

    const countByFaction = (controllers: Record<string, string> | undefined): Record<string, number> => {
        const out: Record<string, number> = { RBiH: 0, RS: 0, HRHB: 0 };
        for (const value of Object.values(controllers ?? {})) {
            if (value === 'RBiH' || value === 'RS' || value === 'HRHB') out[value] += 1;
        }
        return out;
    };

    const initialCounts = countByFaction(initial.political_controllers);
    const finalCounts = countByFaction(final.political_controllers);

    assert.strictEqual(final.meta.phase, 'phase_i');
    assert.strictEqual(final.meta.referendum_turn, 26);
    assert.strictEqual(final.meta.war_start_turn, 30);
    assert.notDeepStrictEqual(finalCounts, initialCounts);
    assert.deepStrictEqual(finalCounts, { RBiH: 2158, RS: 2545, HRHB: 1119 });
});
