/**
 * Phase D Step 2/3: Front emergence and stabilization tests.
 * - No fronts when meta.phase !== 'war'.
 * - Fronts emerge deterministically when war phase and opposing control on edges.
 * - No geometry created (descriptors have edge_ids only).
 * - Fronts can harden (static) or remain fluid; no front guarantees victory.
 */

import { describe, expect, it } from 'vitest';
import type { EdgeRecord } from '../src/map/settlements.js';
import {
    deriveFrontStability,
    detectFronts,
    STABILIZATION_TURNS,
} from '../src/sim/combat/front_emergence.js';
import type { GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

function minimalState(phase: 'peace' | 'war', controllers?: Record<string, string | null>): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: {
            turn: 20,
            seed: 'fe-test',
            phase,
            referendum_held: true,
            referendum_turn: 6,
            war_start_turn: 10,
        },
        factions: [
            { id: 'RBiH', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'RS', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
            { id: 'HRHB', profile: { authority: 10, legitimacy: 10, control: 10, logistics: 10, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [] },
        ],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
        } as any,
        political: {
            political_controllers: controllers ?? { S1: 'RBiH', S2: 'RS', S3: 'HRHB' },
        } as any,
        displacement: {} as any,
    };
}

describe('front emergence and stabilization', () => {
    it('returns empty when meta.phase is peace', () => {
        const state = minimalState('war');
        state.meta.phase = 'peace';
        const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
        expect(detectFronts(state, edges)).toEqual([]);
    });

    it('returns empty in phase_0 state', () => {
        const state = minimalState('peace');
        const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
        expect(detectFronts(state, edges)).toEqual([]);
    });

    it('returns empty when there is no opposing control', () => {
        const state = minimalState('war', { S1: 'RBiH', S2: 'RBiH', S3: 'RBiH' });
        const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
        expect(detectFronts(state, edges)).toEqual([]);
    });

    it('returns descriptors when war phase has opposing control on an edge', () => {
        const state = minimalState('war', { S1: 'RBiH', S2: 'RS', S3: 'HRHB' });
        const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
        const fronts = detectFronts(state, edges);
        expect(fronts.length).toBe(1);
        expect(fronts[0].edge_ids.length).toBe(1);
        expect(fronts[0].edge_ids[0] === 'S1__S2' || fronts[0].edge_ids[0] === 'S2__S1').toBe(true);
        expect(fronts[0].stability).toBe('fluid');
        expect(typeof fronts[0].id === 'string' && fronts[0].id.startsWith('F_')).toBe(true);
        expect(Number.isInteger(fronts[0].created_turn)).toBe(true);
    });

    it('produces no geometry, only edge_ids and scalar fields', () => {
        const state = minimalState('war', { S1: 'RBiH', S2: 'RS' });
        const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
        const fronts = detectFronts(state, edges);
        for (const front of fronts) {
            expect('geometry' in front).toBe(false);
            expect('coordinates' in front).toBe(false);
            expect(Array.isArray(front.edge_ids)).toBe(true);
            expect(front.edge_ids.every((id) => typeof id === 'string')).toBe(true);
        }
    });

    it('is deterministic for the same state and edges', () => {
        const state = minimalState('war', { S1: 'RBiH', S2: 'RS', S3: 'HRHB', S4: 'RBiH' });
        const edges: EdgeRecord[] = [
            { a: 'S1', b: 'S2' },
            { a: 'S3', b: 'S4' },
        ];
        expect(detectFronts(state, edges)).toEqual(detectFronts(state, edges));
    });

    it('returns empty when settlementEdges is empty', () => {
        const state = minimalState('war', { S1: 'RBiH', S2: 'RS' });
        expect(detectFronts(state, [])).toEqual([]);
    });

    it('reports fluid stability when active_streak is below threshold', () => {
        const edgeIds = ['S1__S2'];
        const segments = { S1__S2: { active_streak: 2, max_active_streak: 2 } };
        expect(deriveFrontStability(edgeIds, segments)).toBe('fluid');
    });

    it('reports static stability when all edges reach the stabilization threshold', () => {
        const edgeIds = ['S1__S2'];
        const segments = {
            S1__S2: { active_streak: STABILIZATION_TURNS, max_active_streak: STABILIZATION_TURNS },
        };
        expect(deriveFrontStability(edgeIds, segments)).toBe('static');
    });

    it('reports oscillating stability when active streak is 1 and max streak exceeded 1', () => {
        const edgeIds = ['S1__S2'];
        const segments = { S1__S2: { active_streak: 1, max_active_streak: 5 } };
        expect(deriveFrontStability(edgeIds, segments)).toBe('oscillating');
    });

    it('returns static stability when segment has active_streak >= STABILIZATION_TURNS', () => {
        const state = minimalState('war', { S1: 'RBiH', S2: 'RS' });
        state.military.front_segments = {
            S1__S2: {
                edge_id: 'S1__S2',
                active: true,
                created_turn: 10,
                since_turn: 10,
                last_active_turn: 20,
                active_streak: STABILIZATION_TURNS,
                max_active_streak: STABILIZATION_TURNS,
                friction: 1,
                max_friction: 1,
            },
        };
        const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
        const fronts = detectFronts(state, edges);
        expect(fronts.length).toBe(1);
        expect(fronts[0].stability).toBe('static');
    });

    it('never bakes victory fields into front descriptors', () => {
        const state = minimalState('war', { S1: 'RBiH', S2: 'RS' });
        const edges: EdgeRecord[] = [{ a: 'S1', b: 'S2' }];
        const fronts = detectFronts(state, edges);
        for (const front of fronts) {
            expect('control_flip' in front).toBe(false);
            expect('victory' in front).toBe(false);
            expect('decisive' in front).toBe(false);
        }
    });
});
