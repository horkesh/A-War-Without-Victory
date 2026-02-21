/**
 * Phase E1.1: Pressure determinism tests.
 * Same initial state + same edges → identical serialized output after N turns (byte-identical).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import type { EdgeRecord } from '../src/map/settlements.js';
import { runTurn } from '../src/sim/turn_pipeline.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { serializeState } from '../src/state/serialize.js';

function minimalPhaseIIState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 20,
            seed: 'det',
            phase: 'phase_ii',
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10
        },
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {},
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: { S1: 'RBiH', S2: 'RS' }
    };
}

test('same initial state + same edges yields identical serialized output after N turns', async () => {
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const seed = 'determinism-seed';
    const N = 3;

    let s1: GameState = minimalPhaseIIState();
    for (let i = 0; i < N; i++) {
        const r = await runTurn(s1, { seed, settlementEdges: edges });
        s1 = r.nextState;
    }

    let s2: GameState = minimalPhaseIIState();
    for (let i = 0; i < N; i++) {
        const r = await runTurn(s2, { seed, settlementEdges: edges });
        s2 = r.nextState;
    }

    const out1 = serializeState(s1);
    const out2 = serializeState(s2);
    assert.strictEqual(out1, out2, 'Same inputs must produce byte-identical serialized state after N turns');
});
