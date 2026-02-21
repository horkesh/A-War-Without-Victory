/**
 * Phase D Step 4: Supply pressure tests.
 * - Isolation increases pressure (critical/strained from supply report).
 * - Overextension (front edges) increases pressure.
 * - Deterministic accumulation; no free supply (pressure never decreased).
 */

import assert from 'node:assert';
import { test } from 'node:test';
import type { EdgeRecord } from '../src/map/settlements.js';
import { updatePhaseIISupplyPressure } from '../src/sim/phase_ii/supply_pressure.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { SupplyStateDerivationReport } from '../src/state/supply_state_derivation.js';

function minimalPhaseIIState(controllers?: Record<string, string | null>): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, seed: 'sp-test', phase: 'phase_ii', referendum_held: true, referendum_turn: 6, war_start_turn: 10 },
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

test('supply pressure increases with front edges (overextension)', () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    updatePhaseIISupplyPressure(state, edges);
    assert.ok(state.phase_ii_supply_pressure);
    assert.ok(state.phase_ii_supply_pressure!['RBiH']! >= 3);
    assert.ok(state.phase_ii_supply_pressure!['RS']! >= 3);
});

test('isolation increases pressure when supply report has critical count', () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
    state.phase_ii_supply_pressure = { RBiH: 0, RS: 0, HRHB: 0 };
    const edges: EdgeRecord[] = [];
    const supplyReport: SupplyStateDerivationReport = {
        schema: 1,
        turn: 20,
        factions: [
            { faction_id: 'RBiH', by_settlement: [], adequate_count: 0, strained_count: 0, critical_count: 2 },
            { faction_id: 'RS', by_settlement: [], adequate_count: 0, strained_count: 0, critical_count: 0 },
            { faction_id: 'HRHB', by_settlement: [], adequate_count: 0, strained_count: 0, critical_count: 0 }
        ]
    };
    updatePhaseIISupplyPressure(state, edges, supplyReport);
    assert.ok(state.phase_ii_supply_pressure!['RBiH']! >= 20);
});

test('supply pressure is deterministic: same inputs yield same pressure', () => {
    const state1 = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
    const state2 = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    updatePhaseIISupplyPressure(state1, edges);
    updatePhaseIISupplyPressure(state2, edges);
    assert.deepStrictEqual(state1.phase_ii_supply_pressure, state2.phase_ii_supply_pressure);
});

test('supply pressure never decreases (no free supply)', () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
    state.phase_ii_supply_pressure = { RBiH: 50, RS: 50, HRHB: 0 };
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    updatePhaseIISupplyPressure(state, edges);
    assert.ok(state.phase_ii_supply_pressure!['RBiH']! >= 50);
    assert.ok(state.phase_ii_supply_pressure!['RS']! >= 50);
});

test('updatePhaseIISupplyPressure does nothing when meta.phase is phase_i', () => {
    const state = minimalPhaseIIState({ S1: 'RBiH', S2: 'RS' });
    state.meta.phase = 'phase_i';
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    updatePhaseIISupplyPressure(state, edges);
    assert.strictEqual(state.phase_ii_supply_pressure === undefined || Object.keys(state.phase_ii_supply_pressure).length === 0, true);
});
