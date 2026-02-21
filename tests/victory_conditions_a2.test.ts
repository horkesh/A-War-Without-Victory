import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { runScenario } from '../src/scenario/scenario_runner.js';
import { evaluateVictoryConditions } from '../src/scenario/victory_conditions.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function baseState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'victory-test', phase: 'phase_ii' },
        factions: [
            { id: 'RBiH', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 10 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 40 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 50, legitimacy: 50, control: 50, logistics: 50, exhaustion: 20 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: {
            S1: 'RBiH',
            S2: 'RBiH',
            S3: 'RS'
        }
    };
}

async function ensureRemoved(dir: string): Promise<void> {
    if (existsSync(dir)) {
        await rm(dir, { recursive: true });
    }
}

test('victory evaluator returns single winner when one faction meets all checks', () => {
    const state = baseState();
    const result = evaluateVictoryConditions(state, {
        by_faction: {
            RBiH: { min_controlled_settlements: 2, max_exhaustion: 20, required_settlements_all: ['S1'] },
            RS: { min_controlled_settlements: 3 },
            HRHB: { min_controlled_settlements: 1 }
        }
    });
    assert.ok(result);
    assert.strictEqual(result?.result, 'winner');
    assert.strictEqual(result?.winner, 'RBiH');
});

test('scenario runner writes victory section to run_summary when victory_conditions provided', async () => {
    const prereq = checkDataPrereqs({ baseDir: process.cwd() });
    if (!prereq.ok) return;

    const baseOut = join(process.cwd(), '.tmp_victory_a2');
    const scenarioPath = join(baseOut, 'victory_scenario.json');
    await ensureRemoved(baseOut);
    await mkdir(baseOut, { recursive: true });
    const scenarioJson = {
        scenario_id: 'victory_eval_2w',
        weeks: 2,
        turns: [],
        victory_conditions: {
            by_faction: {
                RBiH: { min_controlled_settlements: 0 },
                RS: { min_controlled_settlements: 0 },
                HRHB: { min_controlled_settlements: 0 }
            }
        }
    };
    await writeFile(scenarioPath, JSON.stringify(scenarioJson, null, 2), 'utf8');
    const result = await runScenario({ scenarioPath, outDirBase: baseOut });
    const summaryRaw = await readFile(result.paths.run_summary, 'utf8');
    const summary = JSON.parse(summaryRaw) as { victory?: { result?: string } };
    assert.ok(summary.victory, 'run_summary should include victory block');
    assert.ok(summary.victory?.result, 'victory result should be set');
    await ensureRemoved(baseOut);
});
