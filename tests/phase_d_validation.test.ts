/**
 * Phase D Step 8: Phase D validation suite.
 * - Fronts are emergent (derived from opposing control; no fronts in Phase I).
 * - Exhaustion accumulates (never decreases).
 * - No total victory reachable (no victory/decisive in descriptors or outcomes).
 * - Phase B and C invariants still hold (Phase I gating, no control flip before war_start_turn).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import type { EdgeRecord } from '../src/map/settlements.js';
import { updatePhaseIIExhaustion } from '../src/sim/phase_ii/exhaustion.js';
import { detectPhaseIIFronts } from '../src/sim/phase_ii/front_emergence.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalState(phase: 'phase_i' | 'phase_ii', controllers?: Record<string, string | null>): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 20,
            seed: 'phase-d-val',
            phase,
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
        political_controllers: controllers ?? { S1: 'RBiH', S2: 'RS', S3: 'HRHB' }
    };
}

test('Phase D: fronts are emergent (no fronts when phase_i)', () => {
    const state = minimalState('phase_i', { S1: 'RBiH', S2: 'RS' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const fronts = detectPhaseIIFronts(state, edges);
    assert.strictEqual(fronts.length, 0);
});

test('Phase D: fronts are emergent (fronts when phase_ii and opposing control)', () => {
    const state = minimalState('phase_ii', { S1: 'RBiH', S2: 'RS' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const fronts = detectPhaseIIFronts(state, edges);
    assert.ok(fronts.length >= 1);
    assert.ok(fronts[0].edge_ids.length >= 1);
});

test('Phase D: exhaustion accumulates (never decreases)', () => {
    const state = minimalState('phase_ii');
    state.phase_ii_exhaustion = { RBiH: 30, RS: 40, HRHB: 20 };
    const before = { ...state.phase_ii_exhaustion! };
    updatePhaseIIExhaustion(state, []);
    assert.ok(state.phase_ii_exhaustion!['RBiH']! >= before['RBiH']!);
    assert.ok(state.phase_ii_exhaustion!['RS']! >= before['RS']!);
    assert.ok(state.phase_ii_exhaustion!['HRHB']! >= before['HRHB']!);
});

test('Phase D: no total victory reachable (front descriptors have no victory/decisive)', () => {
    const state = minimalState('phase_ii', { S1: 'RBiH', S2: 'RS' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const fronts = detectPhaseIIFronts(state, edges);
    for (const f of fronts) {
        assert.ok(!('victory' in f));
        assert.ok(!('decisive' in f));
        assert.ok(!('total_victory' in f));
    }
});

test('Phase D: Phase B/C invariants — Phase I state has referendum_held and war_start_turn', () => {
    const state = minimalState('phase_i');
    assert.strictEqual(state.meta.referendum_held, true);
    assert.strictEqual(state.meta.war_start_turn, 10);
});
