/**
 * Phase E Step 4: AoR instantiation tests.
 * - AoRs emerge only under sustained conditions (pressure + active_streak >= thresholds)
 * - AoRs dissolve if conditions weaken (pressure drops, streak resets)
 * - AoRs do not serialize geometry (derived each turn)
 * - Overlapping allowed (multiple formations may have influence on same edge)
 * - AoR assignment does not flip control or authority
 */

import assert from 'node:assert';
import { test } from 'node:test';
import { deriveAoRMembership, getFrontActiveSettlements, isSettlementFrontActive } from '../src/sim/phase_e/aor_instantiation.js';
import { getEligiblePressureEdges } from '../src/sim/phase_e/pressure_eligibility.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalPhaseIIState(): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, seed: 'aor-test', phase: 'phase_ii', referendum_held: true, referendum_turn: 0, war_start_turn: 1 },
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] }
        ],
        formations: {
            'F1': { id: 'F1', faction: 'RBiH', name: 'Brigade 1', created_turn: 0, status: 'active', assignment: null },
            'F2': { id: 'F2', faction: 'RS', name: 'Brigade 2', created_turn: 0, status: 'active', assignment: null }
        },
        front_segments: {},
        front_posture: {},
        front_posture_regions: {},
        front_pressure: {},
        militia_pools: {},
        political_controllers: {}
    };
}

test('AoR: no AoRs when phase_i', () => {
    const state = minimalPhaseIIState();
    state.meta.phase = 'phase_i';
    state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS' };
    const edges = [{ a: 'S1', b: 'S2' }];
    const aor = deriveAoRMembership(state, edges);
    assert.strictEqual(Object.keys(aor.by_formation).length, 0, 'No AoRs in phase_i');
});

test('AoR: no AoRs when no eligible edges', () => {
    const state = minimalPhaseIIState();
    state.political_controllers = { 'S1': 'RBiH', 'S2': 'RBiH' }; // same control
    const edges = [{ a: 'S1', b: 'S2' }];
    const aor = deriveAoRMembership(state, edges);
    assert.strictEqual(Object.keys(aor.by_formation).length, 0, 'No AoRs when no opposing control');
});

test('AoR: no AoRs when pressure below threshold', () => {
    const state = minimalPhaseIIState();
    state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS' };
    state.front_pressure = { 'S1__S2': { edge_id: 'S1__S2', value: 2, max_abs: 2, last_updated_turn: 10 } }; // below threshold (5)
    state.front_segments = { 'S1__S2': { edge_id: 'S1__S2', active: true, created_turn: 0, since_turn: 0, last_active_turn: 10, active_streak: 5, max_active_streak: 5, friction: 0, max_friction: 0 } };
    const edges = [{ a: 'S1', b: 'S2' }];
    const aor = deriveAoRMembership(state, edges);
    assert.strictEqual(Object.keys(aor.by_formation).length, 0, 'No AoRs when pressure < threshold');
});

test('AoR: no AoRs when active_streak below threshold', () => {
    const state = minimalPhaseIIState();
    state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS' };
    state.front_pressure = { 'S1__S2': { edge_id: 'S1__S2', value: 10, max_abs: 10, last_updated_turn: 10 } };
    state.front_segments = { 'S1__S2': { edge_id: 'S1__S2', active: true, created_turn: 8, since_turn: 8, last_active_turn: 10, active_streak: 2, max_active_streak: 2, friction: 0, max_friction: 0 } }; // below threshold (3)
    const edges = [{ a: 'S1', b: 'S2' }];
    const aor = deriveAoRMembership(state, edges);
    assert.strictEqual(Object.keys(aor.by_formation).length, 0, 'No AoRs when active_streak < threshold');
});

test('AoR: AoRs emerge when sustained conditions met (pressure + streak >= thresholds)', () => {
    const state = minimalPhaseIIState();
    state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS' };
    state.front_pressure = { 'S1__S2': { edge_id: 'S1__S2', value: 10, max_abs: 10, last_updated_turn: 10 } }; // >= 5
    state.front_segments = { 'S1__S2': { edge_id: 'S1__S2', active: true, created_turn: 7, since_turn: 7, last_active_turn: 10, active_streak: 3, max_active_streak: 3, friction: 0, max_friction: 0 } }; // >= 3
    const edges = [{ a: 'S1', b: 'S2' }];
    const aor = deriveAoRMembership(state, edges);
    const formationIds = Object.keys(aor.by_formation).sort();
    assert.ok(formationIds.length > 0, 'AoRs emerge when conditions met');
    // Both factions have control on one endpoint → both formations may have AoR
    assert.ok(formationIds.includes('F1') || formationIds.includes('F2'), 'At least one formation has AoR');
    for (const fid of formationIds) {
        const entry = aor.by_formation[fid];
        assert.ok(entry.edge_ids.includes('S1__S2'), 'AoR includes edge S1__S2');
        assert.ok(entry.influence_weight >= 0 && entry.influence_weight <= 1, 'Influence weight in [0,1]');
    }
});

test('AoR: AoRs dissolve when conditions weaken (pressure drops)', () => {
    const state = minimalPhaseIIState();
    state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS' };
    state.front_pressure = { 'S1__S2': { edge_id: 'S1__S2', value: 3, max_abs: 10, last_updated_turn: 10 } }; // dropped below threshold
    state.front_segments = { 'S1__S2': { edge_id: 'S1__S2', active: true, created_turn: 7, since_turn: 7, last_active_turn: 10, active_streak: 5, max_active_streak: 5, friction: 0, max_friction: 0 } };
    const edges = [{ a: 'S1', b: 'S2' }];
    const aor = deriveAoRMembership(state, edges);
    assert.strictEqual(Object.keys(aor.by_formation).length, 0, 'AoRs dissolve when pressure drops below threshold');
});

test('AoR: AoRs dissolve when active_streak resets', () => {
    const state = minimalPhaseIIState();
    state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS' };
    state.front_pressure = { 'S1__S2': { edge_id: 'S1__S2', value: 10, max_abs: 10, last_updated_turn: 10 } };
    state.front_segments = { 'S1__S2': { edge_id: 'S1__S2', active: true, created_turn: 10, since_turn: 10, last_active_turn: 10, active_streak: 1, max_active_streak: 5, friction: 0, max_friction: 0 } }; // streak reset
    const edges = [{ a: 'S1', b: 'S2' }];
    const aor = deriveAoRMembership(state, edges);
    assert.strictEqual(Object.keys(aor.by_formation).length, 0, 'AoRs dissolve when active_streak resets below threshold');
});

test('AoR: overlapping allowed (multiple formations may have influence on same edge)', () => {
    const state = minimalPhaseIIState();
    state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS', 'S3': 'RBiH' };
    state.formations['F3'] = { id: 'F3', faction: 'RBiH', name: 'Brigade 3', created_turn: 0, status: 'active', assignment: null };
    state.front_pressure = {
        'S1__S2': { edge_id: 'S1__S2', value: 10, max_abs: 10, last_updated_turn: 10 },
        'S2__S3': { edge_id: 'S2__S3', value: 8, max_abs: 8, last_updated_turn: 10 }
    };
    state.front_segments = {
        'S1__S2': { edge_id: 'S1__S2', active: true, created_turn: 7, since_turn: 7, last_active_turn: 10, active_streak: 3, max_active_streak: 3, friction: 0, max_friction: 0 },
        'S2__S3': { edge_id: 'S2__S3', active: true, created_turn: 7, since_turn: 7, last_active_turn: 10, active_streak: 3, max_active_streak: 3, friction: 0, max_friction: 0 }
    };
    const edges = [{ a: 'S1', b: 'S2' }, { a: 'S2', b: 'S3' }];
    const aor = deriveAoRMembership(state, edges);
    const formationIds = Object.keys(aor.by_formation).sort();
    // RBiH formations (F1, F3) may both have influence on edges where RBiH has control
    const rbihFormations = formationIds.filter((fid) => aor.by_formation[fid].formation_id.startsWith('F') && state.formations[fid]?.faction === 'RBiH');
    assert.ok(rbihFormations.length >= 1, 'Multiple RBiH formations may have AoRs (overlapping allowed)');
});

test('AoR: AoR assignment does not flip control', () => {
    const state = minimalPhaseIIState();
    state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS' };
    const originalControl = { ...state.political_controllers };
    state.front_pressure = { 'S1__S2': { edge_id: 'S1__S2', value: 10, max_abs: 10, last_updated_turn: 10 } };
    state.front_segments = { 'S1__S2': { edge_id: 'S1__S2', active: true, created_turn: 7, since_turn: 7, last_active_turn: 10, active_streak: 3, max_active_streak: 3, friction: 0, max_friction: 0 } };
    const edges = [{ a: 'S1', b: 'S2' }];
    deriveAoRMembership(state, edges); // should not mutate state.political_controllers
    assert.deepStrictEqual(state.political_controllers, originalControl, 'AoR derivation does not flip control');
});

test('AoR: isSettlementFrontActive returns true for settlements on eligible edges', () => {
    const state = minimalPhaseIIState();
    state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS', 'S3': 'RBiH' };
    const edges = [{ a: 'S1', b: 'S2' }];
    const eligible = getEligiblePressureEdges(state, edges);
    assert.strictEqual(isSettlementFrontActive('S1', eligible), true, 'S1 is front-active');
    assert.strictEqual(isSettlementFrontActive('S2', eligible), true, 'S2 is front-active');
    assert.strictEqual(isSettlementFrontActive('S3', eligible), false, 'S3 is not front-active (no eligible edge)');
});

test('AoR: getFrontActiveSettlements returns all settlements on eligible edges', () => {
    const state = minimalPhaseIIState();
    state.political_controllers = { 'S1': 'RBiH', 'S2': 'RS', 'S3': 'HRHB', 'S4': 'RBiH' };
    const edges = [{ a: 'S1', b: 'S2' }, { a: 'S2', b: 'S3' }];
    const eligible = getEligiblePressureEdges(state, edges);
    const frontActive = getFrontActiveSettlements(eligible);
    assert.ok(frontActive.has('S1'), 'S1 is front-active');
    assert.ok(frontActive.has('S2'), 'S2 is front-active');
    assert.ok(frontActive.has('S3'), 'S3 is front-active');
    assert.ok(!frontActive.has('S4'), 'S4 is not front-active');
});
