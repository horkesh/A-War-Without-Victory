import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { LoadedSettlementGraph } from '../src/map/settlements.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { prepareNewGameState } from '../src/state/initialize_new_game_state.js';

const created: string[] = [];

function baseState(seed: string): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 0, seed, phase: 'war' },
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as GameState['military'],
        political: {} as GameState['political'],
        displacement: {} as GameState['displacement'],
    };
}

const graph: LoadedSettlementGraph = {
    settlements: new Map([
        ['op:mun-a:a', {
            sid: 'op:mun-a:a',
            source_id: 'a',
            mun_code: 'mun-a',
            mun: 'Municipality A',
            mun1990_id: 'mun-a',
        }],
    ]),
    edges: [],
};

async function fixtureFile(name: string, value: unknown): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'awwv-bc07-init-'));
    created.push(dir);
    const path = join(dir, name);
    await writeFile(path, JSON.stringify(value), 'utf8');
    return path;
}

afterEach(async () => {
    await Promise.all(created.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function initializeWithSentinel(
    mode: 'ethnic_1991' | 'hybrid_1992' | undefined,
    stabilityScore: number,
): Promise<GameState> {
    const inputPath = await fixtureFile('initial-control.json', {
        controllers_by_mun1990_id: { 'mun-a': 'RBiH' },
        settlements: [{
            sid: 'op:mun-a:a',
            mun1990_id: 'mun-a',
            political_controller: 'RBiH',
            contested_control: false,
            control_status: 'SECURE',
            stability_score: stabilityScore,
        }],
    });
    const ethnicityPath = await fixtureFile('ethnicity.json', {
        by_settlement_id: {
            'op:mun-a:a': {
                majority: 'bosniak',
                composition: { bosniak: 1, croat: 0, serb: 0, other: 0 },
            },
        },
    });
    const state = baseState(mode ?? 'modeless');
    await prepareNewGameState(
        state,
        graph,
        inputPath,
        mode == null ? undefined : { init_control_mode: mode, ethnicity_data_path: ethnicityPath },
    );
    return state;
}

describe('BC07 operational initial-master consumption boundary', () => {
    it('consumes each settlement-master stability sentinel on the modeless path', async () => {
        const state37 = await initializeWithSentinel(undefined, 37);
        const state83 = await initializeWithSentinel(undefined, 83);

        expect(state37.political.political_controllers?.['op:mun-a:a']).toBe('RBiH');
        expect(state83.political.political_controllers?.['op:mun-a:a']).toBe('RBiH');
        expect(state37.political.municipalities).toHaveProperty('mun-a');
        expect(state83.political.municipalities).toHaveProperty('mun-a');
        expect(state37.political.municipalities?.['mun-a']?.stability_score).toBe(37);
        expect(state83.political.municipalities?.['mun-a']?.stability_score).toBe(83);
    });

    it.each(['ethnic_1991', 'hybrid_1992'] as const)(
        '%s ignores differing settlement-master stability sentinels',
        async (mode) => {
            const state37 = await initializeWithSentinel(mode, 37);
            const state83 = await initializeWithSentinel(mode, 83);

            expect(state37.political.political_controllers?.['op:mun-a:a']).toBe('RBiH');
            expect(state83.political.political_controllers?.['op:mun-a:a']).toBe('RBiH');
            expect(state37.political.municipalities).toHaveProperty('mun-a');
            expect(state83.political.municipalities).toHaveProperty('mun-a');
            expect(state37.political.municipalities?.['mun-a']?.stability_score).toBeUndefined();
            expect(state83.political.municipalities?.['mun-a']?.stability_score).toBeUndefined();
            expect(state37).toEqual(state83);
        },
    );
});
