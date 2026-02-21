/**
 * Phase D Step 2/3: Front emergence and stabilization tests.
 * - No fronts when meta.phase !== 'phase_ii'.
 * - Fronts emerge deterministically when phase_ii and opposing control on edges.
 * - No geometry created (descriptors have edge_ids only).
 * - Fronts can harden (static) or remain fluid; no front guarantees victory.
 */

import assert from 'node:assert';
import { test } from 'node:test';
import type { EdgeRecord } from '../src/map/settlements.js';
import {
    deriveFrontStability,
    detectPhaseIIFronts,
    STABILIZATION_TURNS
} from '../src/sim/phase_ii/front_emergence.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalState(phase: 'phase_0' | 'phase_i' | 'phase_ii', controllers?: Record<string, string | null>): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 20,
            seed: 'fe-test',
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

test('detectPhaseIIFronts returns empty when meta.phase is phase_i', () => {
    const state = minimalState('phase_i');
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const fronts = detectPhaseIIFronts(state, edges);
    assert.deepStrictEqual(fronts, []);
});

test('detectPhaseIIFronts returns empty when meta.phase is phase_0', () => {
    const state = minimalState('phase_0');
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const fronts = detectPhaseIIFronts(state, edges);
    assert.deepStrictEqual(fronts, []);
});

test('detectPhaseIIFronts returns empty when phase_ii but no opposing control', () => {
    const state = minimalState('phase_ii', { S1: 'RBiH', S2: 'RBiH', S3: 'RBiH' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const fronts = detectPhaseIIFronts(state, edges);
    assert.deepStrictEqual(fronts, []);
});

test('detectPhaseIIFronts returns descriptors when phase_ii and opposing control on edge', () => {
    const state = minimalState('phase_ii', { S1: 'RBiH', S2: 'RS', S3: 'HRHB' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const fronts = detectPhaseIIFronts(state, edges);
    assert.strictEqual(fronts.length, 1);
    assert.strictEqual(fronts[0].edge_ids.length, 1);
    assert.ok(fronts[0].edge_ids[0] === 'S1__S2' || fronts[0].edge_ids[0] === 'S2__S1');
    assert.strictEqual(fronts[0].stability, 'fluid');
    assert.ok(typeof fronts[0].id === 'string' && fronts[0].id.startsWith('F_'));
    assert.ok(Number.isInteger(fronts[0].created_turn));
});

test('detectPhaseIIFronts produces no geometry (only edge_ids and scalar fields)', () => {
    const state = minimalState('phase_ii', { S1: 'RBiH', S2: 'RS' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const fronts = detectPhaseIIFronts(state, edges);
    for (const f of fronts) {
        assert.ok(!('geometry' in f));
        assert.ok(!('coordinates' in f));
        assert.ok(Array.isArray(f.edge_ids));
        assert.ok(f.edge_ids.every((id) => typeof id === 'string'));
    }
});

test('detectPhaseIIFronts is deterministic: same state and edges yield same result', () => {
    const state = minimalState('phase_ii', { S1: 'RBiH', S2: 'RS', S3: 'HRHB', S4: 'RBiH' });
    const edges: EdgeRecord[] = [
        { a: 'S1', b: 'S2' },
        { a: 'S3', b: 'S4' }
    ];
    const run1 = detectPhaseIIFronts(state, edges);
    const run2 = detectPhaseIIFronts(state, edges);
    assert.deepStrictEqual(run1, run2);
});

test('detectPhaseIIFronts returns empty when settlementEdges is empty', () => {
    const state = minimalState('phase_ii', { S1: 'RBiH', S2: 'RS' });
    const fronts = detectPhaseIIFronts(state, []);
    assert.deepStrictEqual(fronts, []);
});

// --- Step 3: Front stabilization vs fluidity ---

test('deriveFrontStability returns fluid when active_streak below threshold', () => {
    const edgeIds = ['S1__S2'];
    const segments = { 'S1__S2': { active_streak: 2, max_active_streak: 2 } };
    assert.strictEqual(deriveFrontStability(edgeIds, segments), 'fluid');
});

test('deriveFrontStability returns static when all edges have active_streak >= STABILIZATION_TURNS', () => {
    const edgeIds = ['S1__S2'];
    const segments = {
        'S1__S2': { active_streak: STABILIZATION_TURNS, max_active_streak: STABILIZATION_TURNS }
    };
    assert.strictEqual(deriveFrontStability(edgeIds, segments), 'static');
});

test('deriveFrontStability returns oscillating when edge has streak 1 and max_streak > 1', () => {
    const edgeIds = ['S1__S2'];
    const segments = { 'S1__S2': { active_streak: 1, max_active_streak: 5 } };
    assert.strictEqual(deriveFrontStability(edgeIds, segments), 'oscillating');
});

test('detectPhaseIIFronts returns static stability when segment has active_streak >= STABILIZATION_TURNS', () => {
    const state = minimalState('phase_ii', { S1: 'RBiH', S2: 'RS' });
    state.front_segments = {
        S1__S2: {
            edge_id: 'S1__S2',
            active: true,
            created_turn: 10,
            since_turn: 10,
            last_active_turn: 20,
            active_streak: STABILIZATION_TURNS,
            max_active_streak: STABILIZATION_TURNS,
            friction: 1,
            max_friction: 1
        }
    };
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const fronts = detectPhaseIIFronts(state, edges);
    assert.strictEqual(fronts.length, 1);
    assert.strictEqual(fronts[0].stability, 'static');
});

test('no front guarantees victory: descriptors do not contain control or victory fields', () => {
    const state = minimalState('phase_ii', { S1: 'RBiH', S2: 'RS' });
    const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
    const fronts = detectPhaseIIFronts(state, edges);
    for (const f of fronts) {
        assert.ok(!('control_flip' in f));
        assert.ok(!('victory' in f));
        assert.ok(!('decisive' in f));
    }
});
