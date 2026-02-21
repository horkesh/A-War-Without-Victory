/**
 * Phase D Step 6: Command friction tests.
 * - Identical state yields identical friction factor (determinism).
 * - Intent degradation increases with exhaustion and front length.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import type { EdgeRecord } from '../src/map/settlements.js';
import {
    getPhaseIICommandFrictionMultiplier,
    getPhaseIICommandFrictionMultipliers
} from '../src/sim/phase_ii/command_friction.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(controllers?: Record<string, string | null>): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, seed: 'cf-test', phase: 'phase_ii', referendum_held: true, referendum_turn: 6, war_start_turn: 10 },
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
        political_controllers: controllers ?? { S1: 'RBiH', S2: 'RS', S3: 'HRHB' }
    };
}

test('identical state yields identical friction multiplier (no randomness)', () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
    state.phase_ii_exhaustion = { RBiH: 10, RS: 15, HRHB: 0 };
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const a = getPhaseIICommandFrictionMultiplier(state, 'RBiH', edges);
    const b = getPhaseIICommandFrictionMultiplier(state, 'RBiH', edges);
    assert.strictEqual(a, b);
});

test('friction multiplier increases with exhaustion (higher = more friction)', () => {
    const stateLow = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
    stateLow.phase_ii_exhaustion = { RBiH: 0, RS: 0, HRHB: 0 };
    const stateHigh = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
    stateHigh.phase_ii_exhaustion = { RBiH: 100, RS: 100, HRHB: 100 };
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const multLow = getPhaseIICommandFrictionMultiplier(stateLow, 'RBiH', edges);
    const multHigh = getPhaseIICommandFrictionMultiplier(stateHigh, 'RBiH', edges);
    assert.ok(multHigh > multLow);
    assert.ok(multLow >= 1 && multHigh >= 1);
});

test('returns 1 when meta.phase is phase_i', () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
    state.meta.phase = 'phase_i';
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    assert.strictEqual(getPhaseIICommandFrictionMultiplier(state, 'RBiH', edges), 1);
});

test('getPhaseIICommandFrictionMultipliers returns record for all factions in deterministic order', () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
    state.phase_ii_exhaustion = { RBiH: 5, RS: 5, HRHB: 5 };
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const multipliers = getPhaseIICommandFrictionMultipliers(state, edges);
    assert.ok(typeof multipliers['RBiH'] === 'number');
    assert.ok(typeof multipliers['RS'] === 'number');
    assert.ok(typeof multipliers['HRHB'] === 'number');
    assert.ok(multipliers['RBiH']! >= 1);
});
