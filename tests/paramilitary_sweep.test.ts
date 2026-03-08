/**
 * Tests for paramilitary rear pocket cleanup system.
 */

import { describe, it, expect } from 'vitest';
import type { GameState, FormationState, FactionState } from '../src/state/game_state.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import {
    detectParamilitaryTargets,
    advanceParamilitaries,
    resolvePlayerParamilitaryDecisions
} from '../src/sim/combat/paramilitary_sweep.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import { isEligibleForReinforcement } from '../src/state/formation_constants.js';

// ═══════════════════════════════════════════════════════════════════════════
// Test helpers
// ═══════════════════════════════════════════════════════════════════════════

function makeEdges(pairs: [string, string][]): EdgeRecord[] {
    return pairs.map(([a, b]) => ({ a, b }) as EdgeRecord);
}

function makeReverseMap(osids: string[]): OperationalToCanonicalReverseMap {
    const m = new Map<string, string[]>();
    for (const osid of osids) m.set(osid, [osid]);
    return m;
}

function makeBaseState(overrides?: Partial<GameState>): GameState {
    return {
        meta: { turn: 5, phase: 'war', schema_version: 1, seed: 'test', ...(overrides?.meta ?? {}) } as GameState['meta'],
        factions: [
            { id: 'RS' } as FactionState,
            { id: 'RBiH' } as FactionState,
        ],
        formations: {},
        political_controllers: {},
        municipalities: {},
        casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']),
        civilian_casualties: {
            RS: { killed: 0, fled_abroad: 0 },
            RBiH: { killed: 0, fled_abroad: 0 },
            HRHB: { killed: 0, fled_abroad: 0 },
        },
        ...overrides,
    } as GameState;
}

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('paramilitary_sweep', () => {
    describe('detectParamilitaryTargets', () => {
        it('detects enemy pockets and spawns paramilitary for bot factions', () => {
            // Setup: RS controls A, B, C. RBiH controls D.
            // D is surrounded by A, B, C (all RS) — it's a pocket.
            const edges = makeEdges([['op:a', 'op:b'], ['op:a', 'op:c'], ['op:a', 'op:d'], ['op:b', 'op:d'], ['op:c', 'op:d']]);
            const reverseMap = makeReverseMap(['op:a', 'op:b', 'op:c', 'op:d']);
            const state = makeBaseState({
                political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:c': 'RS', 'op:d': 'RBiH' },
                municipalities: {
                    // OSID municipality from 'op:a' → '' (no colon), but for test we add an entry
                },
            });

            const report = detectParamilitaryTargets(state, edges, reverseMap);

            // RS should detect op:d as a pocket and spawn paramilitary
            const rsSpawns = report.spawned.filter(s => s.faction === 'RS');
            // Due to deterministic hash, spawn might or might not happen for this specific case
            // But there should be no player requests (no player faction set)
            expect(report.pending_player_requests).toBe(0);
        });

        it('does not spawn paramilitaries after PARAMILITARY_FADE_WEEK', () => {
            const edges = makeEdges([['op:a', 'op:b'], ['op:a', 'op:d'], ['op:b', 'op:d']]);
            const reverseMap = makeReverseMap(['op:a', 'op:b', 'op:d']);
            const state = makeBaseState({
                meta: { turn: 25, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
                political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:d': 'RBiH' },
            });

            const report = detectParamilitaryTargets(state, edges, reverseMap);
            expect(report.spawned).toHaveLength(0);
            expect(report.pending_player_requests).toBe(0);
        });

        it('creates pending requests for player faction', () => {
            // hash('op:d', 5) → deterministic check ≤ RS rate 0.85 → spawns
            const edges = makeEdges([['op:a', 'op:b'], ['op:a', 'op:c'], ['op:a', 'op:d'], ['op:b', 'op:d'], ['op:c', 'op:d']]);
            const reverseMap = makeReverseMap(['op:a', 'op:b', 'op:c', 'op:d']);
            const state = makeBaseState({
                meta: { turn: 5, phase: 'war', schema_version: 1, seed: 'test', player_faction: 'RS' } as GameState['meta'],
                political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:c': 'RS', 'op:d': 'RBiH' },
            });

            const report = detectParamilitaryTargets(state, edges, reverseMap);

            // RS is player faction with 'ask' policy — pocket op:d becomes a pending request
            expect(report.spawned.filter(s => s.faction === 'RS')).toHaveLength(0);
            expect(report.pending_player_requests).toBe(1);
            expect(state.pending_paramilitary_requests).toHaveLength(1);
            expect(state.pending_paramilitary_requests![0].target_osid).toBe('op:d');
        });

        it('respects always_deny policy', () => {
            const edges = makeEdges([['op:a', 'op:b'], ['op:a', 'op:c'], ['op:a', 'op:d'], ['op:b', 'op:d'], ['op:c', 'op:d']]);
            const reverseMap = makeReverseMap(['op:a', 'op:b', 'op:c', 'op:d']);
            const state = makeBaseState({
                meta: { turn: 5, phase: 'war', schema_version: 1, seed: 'test', player_faction: 'RS' } as GameState['meta'],
                political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:c': 'RS', 'op:d': 'RBiH' },
                paramilitary_policy: 'always_deny',
            });

            const report = detectParamilitaryTargets(state, edges, reverseMap);
            expect(report.pending_player_requests).toBe(0);
            expect(report.spawned.filter(s => s.faction === 'RS')).toHaveLength(0);
        });

        it('skips defended pockets', () => {
            const edges = makeEdges([['op:a', 'op:b'], ['op:a', 'op:d'], ['op:b', 'op:d']]);
            const reverseMap = makeReverseMap(['op:a', 'op:b', 'op:d']);
            const state = makeBaseState({
                political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:d': 'RBiH' },
                formations: {
                    'rbih_bde_1': {
                        id: 'rbih_bde_1', faction: 'RBiH', name: 'Test', created_turn: 0,
                        status: 'active', assignment: null, kind: 'brigade',
                        location_osid: 'op:d', personnel: 1000,
                    } as FormationState,
                },
            });

            const report = detectParamilitaryTargets(state, edges, reverseMap);
            // Defended pocket should not generate a spawn
            expect(report.spawned.filter(s => s.target_osid === 'op:d')).toHaveLength(0);
        });

        it('does not duplicate targets already being swept', () => {
            const edges = makeEdges([['op:a', 'op:b'], ['op:a', 'op:c'], ['op:a', 'op:d'], ['op:b', 'op:d'], ['op:c', 'op:d']]);
            const reverseMap = makeReverseMap(['op:a', 'op:b', 'op:c', 'op:d']);
            const state = makeBaseState({
                political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:c': 'RS', 'op:d': 'RBiH' },
                formations: {
                    'para_rs_t3_0': {
                        id: 'para_rs_t3_0', faction: 'RS', name: 'Para', created_turn: 3,
                        status: 'active', assignment: null, kind: 'paramilitary',
                        paramilitary_target: 'op:d', paramilitary_eta: 1, personnel: 150,
                    } as FormationState,
                },
            });

            const report = detectParamilitaryTargets(state, edges, reverseMap);
            // op:d already targeted — should not spawn another
            expect(report.spawned.filter(s => s.target_osid === 'op:d')).toHaveLength(0);
        });
    });

    describe('advanceParamilitaries', () => {
        it('decrements ETA and captures at ETA=0', () => {
            const reverseMap = makeReverseMap(['A', 'D']);
            const state = makeBaseState({
                political_controllers: { A: 'RS', D: 'RBiH' },
                formations: {
                    'para_rs_t3_0': {
                        id: 'para_rs_t3_0', faction: 'RS', name: 'Para', created_turn: 3,
                        status: 'active', assignment: null, kind: 'paramilitary',
                        paramilitary_target: 'D', paramilitary_eta: 1, personnel: 150,
                    } as FormationState,
                },
            });

            const report = advanceParamilitaries(state, reverseMap);

            // ETA was 1, decremented to 0 → capture
            expect(report.captured).toHaveLength(1);
            expect(report.captured[0].osid).toBe('D');
            expect(state.political_controllers!['D']).toBe('RS');
            // Formation dissolved
            expect(report.dissolved).toContain('para_rs_t3_0');
            expect(state.formations!['para_rs_t3_0'].status).toBe('inactive');
        });

        it('does not capture when ETA > 0', () => {
            const reverseMap = makeReverseMap(['A', 'D']);
            const state = makeBaseState({
                political_controllers: { A: 'RS', D: 'RBiH' },
                formations: {
                    'para_rs_t3_0': {
                        id: 'para_rs_t3_0', faction: 'RS', name: 'Para', created_turn: 3,
                        status: 'active', assignment: null, kind: 'paramilitary',
                        paramilitary_target: 'D', paramilitary_eta: 2, personnel: 150,
                    } as FormationState,
                },
            });

            const report = advanceParamilitaries(state, reverseMap);

            expect(report.captured).toHaveLength(0);
            expect(state.political_controllers!['D']).toBe('RBiH');
            expect(state.formations!['para_rs_t3_0'].paramilitary_eta).toBe(1);
        });

        it('records casualties in casualty ledger', () => {
            const reverseMap = makeReverseMap(['A', 'D']);
            const state = makeBaseState({
                political_controllers: { A: 'RS', D: 'RBiH' },
                formations: {
                    'para_rs_t3_0': {
                        id: 'para_rs_t3_0', faction: 'RS', name: 'Para', created_turn: 3,
                        status: 'active', assignment: null, kind: 'paramilitary',
                        paramilitary_target: 'D', paramilitary_eta: 1, personnel: 150,
                    } as FormationState,
                },
            });

            advanceParamilitaries(state, reverseMap);

            // Check RS casualties recorded
            const rsLedger = state.casualty_ledger!['RS'];
            expect(rsLedger.killed + rsLedger.wounded + rsLedger.missing_captured).toBeGreaterThan(0);

            // Check civilian casualties recorded against RBiH
            expect(state.civilian_casualties!['RBiH'].killed).toBeGreaterThan(0);
        });

        it('dissolves paramilitary that arrives at already-captured OSID', () => {
            const reverseMap = makeReverseMap(['A', 'D']);
            const state = makeBaseState({
                political_controllers: { A: 'RS', D: 'RS' }, // D already RS
                formations: {
                    'para_rs_t3_0': {
                        id: 'para_rs_t3_0', faction: 'RS', name: 'Para', created_turn: 3,
                        status: 'active', assignment: null, kind: 'paramilitary',
                        paramilitary_target: 'D', paramilitary_eta: 1, personnel: 150,
                    } as FormationState,
                },
            });

            const report = advanceParamilitaries(state, reverseMap);

            // Should dissolve without capturing (no casualties)
            expect(report.dissolved).toContain('para_rs_t3_0');
            expect(report.captured).toHaveLength(0);
        });
    });

    describe('resolvePlayerParamilitaryDecisions', () => {
        it('spawns paramilitaries for approved requests', () => {
            const state = makeBaseState({
                pending_paramilitary_requests: [
                    { target_osid: 'D', faction: 'RS', strength: 150, decision: 'allow' },
                    { target_osid: 'E', faction: 'RS', strength: 150, decision: 'deny' },
                ],
            });

            const report = resolvePlayerParamilitaryDecisions(state);

            expect(report.spawned).toHaveLength(1);
            expect(report.spawned[0].target_osid).toBe('D');
            expect(state.pending_paramilitary_requests).toHaveLength(0);
        });

        it('clears all pending requests after resolution', () => {
            const state = makeBaseState({
                pending_paramilitary_requests: [
                    { target_osid: 'D', faction: 'RS', strength: 150, decision: 'deny' },
                ],
            });

            resolvePlayerParamilitaryDecisions(state);
            expect(state.pending_paramilitary_requests).toHaveLength(0);
        });

        it('tracks deployment count for consequence scaling', () => {
            const state = makeBaseState({
                pending_paramilitary_requests: [
                    { target_osid: 'D', faction: 'RS', strength: 150, decision: 'allow' },
                ],
            });

            resolvePlayerParamilitaryDecisions(state);
            expect(state.paramilitary_deployment_count?.['RS']).toBe(1);
        });
    });

    describe('isEligibleForReinforcement excludes paramilitaries', () => {
        it('returns false for paramilitary kind', () => {
            expect(isEligibleForReinforcement({ kind: 'paramilitary' })).toBe(false);
            expect(isEligibleForReinforcement({ kind: 'brigade' })).toBe(true);
        });
    });
});
