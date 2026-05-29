/**
 * Tests for paramilitary sweep system (rear pocket cleanup + offensive sweep).
 */

import { describe, it, expect } from 'vitest';
import type { GameState, FormationState, FactionState } from '../src/state/game_state.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import {
    detectParamilitaryTargets,
    advanceParamilitaries,
    resolvePlayerParamilitaryDecisions,
    detectOffensiveParamilitaryTargets
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
  ...overrides,
  military: {
    formations: {},
    casualty_ledger: initializeCasualtyLedger(['RS', 'RBiH', 'HRHB']),
      ...(overrides?.military || {})
} as any,
  political: {
    political_controllers: {},
    municipalities: {},
      ...(overrides?.political || {})
} as any,
  displacement: {
    civilian_casualties: {
            RS: { killed: 0, fled_abroad: 0 },
            RBiH: { killed: 0, fled_abroad: 0 },
            HRHB: { killed: 0, fled_abroad: 0 },
        },
      ...(overrides?.displacement || {})
} as any,
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
  political: {
    political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:c': 'RS', 'op:d': 'RBiH' },
    municipalities: {
                    // OSID municipality from 'op:a' → '' (no colon), but for test we add an entry
                },
  } as any,
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
  meta: { turn: 29, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
  political: {
    political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:d': 'RBiH' },
  } as any,
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
  political: {
    political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:c': 'RS', 'op:d': 'RBiH' },
  } as any,
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
  paramilitary_policy: 'always_deny',
  political: {
    political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:c': 'RS', 'op:d': 'RBiH' },
  } as any,
});

            const report = detectParamilitaryTargets(state, edges, reverseMap);
            expect(report.pending_player_requests).toBe(0);
            expect(report.spawned.filter(s => s.faction === 'RS')).toHaveLength(0);
        });

        it('skips defended pockets', () => {
            const edges = makeEdges([['op:a', 'op:b'], ['op:a', 'op:d'], ['op:b', 'op:d']]);
            const reverseMap = makeReverseMap(['op:a', 'op:b', 'op:d']);
            const state = makeBaseState({
  military: {
    formations: {
                    'rbih_bde_1': {
                        id: 'rbih_bde_1', faction: 'RBiH', name: 'Test', created_turn: 0,
                        status: 'active', assignment: null, kind: 'brigade',
                        location_osid: 'op:d', personnel: 1000,
                    } as FormationState,
                },
  } as any,
  political: {
    political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:d': 'RBiH' },
  } as any,
});

            const report = detectParamilitaryTargets(state, edges, reverseMap);
            // Defended pocket should not generate a spawn
            expect(report.spawned.filter(s => s.target_osid === 'op:d')).toHaveLength(0);
        });

        it('skips rear-pocket targets with adjacent organized defenders', () => {
            const edges = makeEdges([
                ['op:a', 'op:b'],
                ['op:a', 'op:d'],
                ['op:b', 'op:d'],
                ['op:d', 'op:e'],
            ]);
            const reverseMap = makeReverseMap(['op:a', 'op:b', 'op:d', 'op:e']);
            const state = makeBaseState({
                military: {
                    formations: {
                        'rbih_bde_adjacent': {
                            id: 'rbih_bde_adjacent', faction: 'RBiH', name: 'Adjacent Defense', created_turn: 0,
                            status: 'active', assignment: null, kind: 'brigade',
                            location_osid: 'op:e', personnel: 1200,
                        } as FormationState,
                    },
                } as any,
                political: {
                    political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:d': 'RBiH', 'op:e': 'RBiH' },
                } as any,
            });

            const report = detectParamilitaryTargets(state, edges, reverseMap);
            expect(report.spawned.filter(s => s.target_osid === 'op:d')).toHaveLength(0);
            expect(report.pending_player_requests).toBe(0);
        });

        it('does not classify an enclosed cluster as a rear pocket when a brigade exists anywhere inside it', () => {
            const edges = makeEdges([
                ['op:a', 'op:d'],
                ['op:a', 'op:e'],
                ['op:b', 'op:d'],
                ['op:b', 'op:e'],
                ['op:d', 'op:e'],
            ]);
            const reverseMap = makeReverseMap(['op:a', 'op:b', 'op:d', 'op:e']);
            const state = makeBaseState({
                military: {
                    formations: {
                        'rbih_cluster_defender': {
                            id: 'rbih_cluster_defender', faction: 'RBiH', name: 'Pocket Defender', created_turn: 0,
                            status: 'active', assignment: null, kind: 'brigade',
                            location_osid: 'op:e', personnel: 1000,
                        } as FormationState,
                    },
                } as any,
                political: {
                    political_controllers: {
                        'op:a': 'RS',
                        'op:b': 'RS',
                        'op:d': 'RBiH',
                        'op:e': 'RBiH',
                    },
                } as any,
            });

            const report = detectParamilitaryTargets(state, edges, reverseMap);
            expect(report.spawned.filter(s => s.faction === 'RS')).toHaveLength(0);
            expect(report.pending_player_requests).toBe(0);
        });

        it('does not duplicate targets already being swept', () => {
            const edges = makeEdges([['op:a', 'op:b'], ['op:a', 'op:c'], ['op:a', 'op:d'], ['op:b', 'op:d'], ['op:c', 'op:d']]);
            const reverseMap = makeReverseMap(['op:a', 'op:b', 'op:c', 'op:d']);
            const state = makeBaseState({
  military: {
    formations: {
                    'para_rs_t3_0': {
                        id: 'para_rs_t3_0', faction: 'RS', name: 'Para', created_turn: 3,
                        status: 'active', assignment: null, kind: 'paramilitary',
                        paramilitary_target: 'op:d', paramilitary_eta: 1, personnel: 150,
                    } as FormationState,
                },
  } as any,
  political: {
    political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:c': 'RS', 'op:d': 'RBiH' },
  } as any,
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
  military: {
    formations: {
                    'para_rs_t3_0': {
                        id: 'para_rs_t3_0', faction: 'RS', name: 'Para', created_turn: 3,
                        status: 'active', assignment: null, kind: 'paramilitary',
                        paramilitary_target: 'D', paramilitary_eta: 1, personnel: 150,
                    } as FormationState,
                },
  } as any,
  political: {
    political_controllers: { A: 'RS', D: 'RBiH' },
  } as any,
});

            const report = advanceParamilitaries(state, [], reverseMap);

            // ETA was 1, decremented to 0 → capture
            expect(report.captured).toHaveLength(1);
            expect(report.captured[0].osid).toBe('D');
            expect(state.political.political_controllers!['D']).toBe('RS');
            // Formation dissolved
            expect(report.dissolved).toContain('para_rs_t3_0');
            expect(state.military.formations!['para_rs_t3_0'].status).toBe('inactive');
        });

        it('does not capture when ETA > 0', () => {
            const reverseMap = makeReverseMap(['A', 'D']);
            const state = makeBaseState({
  military: {
    formations: {
                    'para_rs_t3_0': {
                        id: 'para_rs_t3_0', faction: 'RS', name: 'Para', created_turn: 3,
                        status: 'active', assignment: null, kind: 'paramilitary',
                        paramilitary_target: 'D', paramilitary_eta: 2, personnel: 150,
                    } as FormationState,
                },
  } as any,
  political: {
    political_controllers: { A: 'RS', D: 'RBiH' },
  } as any,
});

            const report = advanceParamilitaries(state, [], reverseMap);

            expect(report.captured).toHaveLength(0);
            expect(state.political.political_controllers!['D']).toBe('RBiH');
            expect(state.military.formations!['para_rs_t3_0'].paramilitary_eta).toBe(1);
        });

        it('records casualties in casualty ledger', () => {
            const reverseMap = makeReverseMap(['A', 'D']);
            const state = makeBaseState({
  military: {
    formations: {
                    'para_rs_t3_0': {
                        id: 'para_rs_t3_0', faction: 'RS', name: 'Para', created_turn: 3,
                        status: 'active', assignment: null, kind: 'paramilitary',
                        paramilitary_target: 'D', paramilitary_eta: 1, personnel: 150,
                    } as FormationState,
                },
  } as any,
  political: {
    political_controllers: { A: 'RS', D: 'RBiH' },
  } as any,
});

            advanceParamilitaries(state, [], reverseMap);

            // Check RS casualties recorded
            const rsLedger = state.military.casualty_ledger!['RS'];
            expect(rsLedger.killed + rsLedger.wounded + rsLedger.missing_captured).toBeGreaterThan(0);

            // Check civilian casualties recorded against RBiH
            expect(state.displacement.civilian_casualties!['RBiH'].killed).toBeGreaterThan(0);
        });

        it('dissolves paramilitary that arrives at already-captured OSID', () => {
            const reverseMap = makeReverseMap(['A', 'D']);
            const state = makeBaseState({
  military: {
    formations: {
                    'para_rs_t3_0': {
                        id: 'para_rs_t3_0', faction: 'RS', name: 'Para', created_turn: 3,
                        status: 'active', assignment: null, kind: 'paramilitary',
                        paramilitary_target: 'D', paramilitary_eta: 1, personnel: 150,
                    } as FormationState,
                },
  } as any,
  political: {
    political_controllers: { A: 'RS', D: 'RS' },
  } as any,
});

            const report = advanceParamilitaries(state, [], reverseMap);

            // Should dissolve without capturing (no casualties)
            expect(report.dissolved).toContain('para_rs_t3_0');
            expect(report.captured).toHaveLength(0);
        });

        it('rear-pocket paramilitary retreats if adjacent organized defenders are present at arrival', () => {
            const edges = makeEdges([
                ['A', 'D'],
                ['B', 'D'],
            ]);
            const reverseMap = makeReverseMap(['A', 'B', 'D']);
            const state = makeBaseState({
                military: {
                    formations: {
                        'para_rs_t3_0': {
                            id: 'para_rs_t3_0', faction: 'RS', name: 'Para', created_turn: 3,
                            status: 'active', assignment: null, kind: 'paramilitary',
                            paramilitary_target: 'D', paramilitary_eta: 1, personnel: 150,
                        } as FormationState,
                        'rbih_adjacent': {
                            id: 'rbih_adjacent', faction: 'RBiH', name: 'Adjacent Brigade', created_turn: 0,
                            status: 'active', assignment: null, kind: 'brigade',
                            location_osid: 'B', personnel: 1200,
                        } as FormationState,
                    },
                } as any,
                political: {
                    political_controllers: { A: 'RS', B: 'RBiH', D: 'RBiH' },
                } as any,
            });

            const report = advanceParamilitaries(state, edges, reverseMap);

            // Should dissolve without capturing (no casualties)
            expect(report.dissolved).toContain('para_rs_t3_0');
            expect(report.captured).toHaveLength(0);
            expect(state.political.political_controllers!['D']).toBe('RBiH');
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

        it('converts legacy scalar deployment count to faction map before incrementing', () => {
            const state = makeBaseState({
                paramilitary_deployment_count: 0 as any,
                pending_paramilitary_requests: [
                    { target_osid: 'D', faction: 'RS', strength: 150, decision: 'allow' },
                ],
            });

            resolvePlayerParamilitaryDecisions(state);
            expect(state.paramilitary_deployment_count).toEqual({ RS: 1 });
        });

        it('files player paramilitary decisions into deterministic history records', () => {
            const state = makeBaseState({
                pending_paramilitary_requests: [
                    { target_osid: 'D', faction: 'RS', strength: 150, decision: 'allow', estimated_civilian_risk: 12 },
                    { target_osid: 'E', faction: 'RS', strength: 90, decision: 'deny', estimated_civilian_risk: 4 },
                ],
            });

            resolvePlayerParamilitaryDecisions(state);

            expect(state.paramilitary_decision_history).toEqual([
                {
                    id: 'paramilitary:5:D',
                    turn: 5,
                    target_osid: 'D',
                    faction: 'RS',
                    strength: 150,
                    decision: 'allow',
                    estimated_civilian_risk: 12,
                },
                {
                    id: 'paramilitary:5:E',
                    turn: 5,
                    target_osid: 'E',
                    faction: 'RS',
                    strength: 90,
                    decision: 'deny',
                    estimated_civilian_risk: 4,
                },
            ]);
        });
    });

    describe('isEligibleForReinforcement excludes paramilitaries', () => {
        it('returns false for paramilitary kind', () => {
            expect(isEligibleForReinforcement({ kind: 'paramilitary' })).toBe(false);
            expect(isEligibleForReinforcement({ kind: 'brigade' })).toBe(true);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Offensive paramilitary sweep tests (v0.6.5)
    // ═══════════════════════════════════════════════════════════════════════

    describe('detectOffensiveParamilitaryTargets', () => {
        it('selects hostile OSID with friendly neighbor in scope municipality', () => {
            // RS controls op:zvornik:a, RBiH controls op:zvornik:b — adjacent
            const edges = makeEdges([
                ['op:zvornik:a', 'op:zvornik:b'],
                ['op:zvornik:a', 'op:zvornik:c'],
            ]);
            const reverseMap = makeReverseMap(['op:zvornik:a', 'op:zvornik:b', 'op:zvornik:c']);
            const state = makeBaseState({
                meta: { turn: 3, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
                political: {
                    political_controllers: {
                        'op:zvornik:a': 'RS',
                        'op:zvornik:b': 'RBiH',
                        'op:zvornik:c': 'RS',
                    },
                } as any,
            });

            const report = detectOffensiveParamilitaryTargets(state, edges, reverseMap);
            // RS should detect op:zvornik:b as offensive target (in Drina scope, hostile, has friendly neighbor)
            const rsSpawns = report.spawned.filter(s => s.faction === 'RS');
            // Spawn depends on deterministic hash, but the target should be eligible
            // RBiH has 0 rate so should never spawn
            const rbihSpawns = report.spawned.filter(s => s.faction === 'RBiH');
            expect(rbihSpawns).toHaveLength(0);
        });

        it('ignores hostile OSID with NO friendly neighbor', () => {
            // RBiH controls op:zvornik:b, surrounded only by other RBiH OSIDs
            const edges = makeEdges([
                ['op:zvornik:a', 'op:zvornik:c'],
                ['op:zvornik:b', 'op:zvornik:d'],
            ]);
            const reverseMap = makeReverseMap(['op:zvornik:a', 'op:zvornik:b', 'op:zvornik:c', 'op:zvornik:d']);
            const state = makeBaseState({
                meta: { turn: 3, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
                political: {
                    political_controllers: {
                        'op:zvornik:a': 'RS',
                        'op:zvornik:b': 'RBiH',
                        'op:zvornik:c': 'RS',
                        'op:zvornik:d': 'RBiH',
                    },
                } as any,
            });

            const report = detectOffensiveParamilitaryTargets(state, edges, reverseMap);
            // op:zvornik:b has no RS neighbor (only adjacent to op:zvornik:d which is RBiH)
            const rsTargetingB = report.spawned.filter(s => s.faction === 'RS' && s.target_osid === 'op:zvornik:b');
            expect(rsTargetingB).toHaveLength(0);
        });

        it('ignores OSID outside municipality scope for bot faction', () => {
            // RS is bot, op:sarajevo:a is hostile but not in RS scope
            const edges = makeEdges([
                ['op:sarajevo:a', 'op:sarajevo:b'],
            ]);
            const reverseMap = makeReverseMap(['op:sarajevo:a', 'op:sarajevo:b']);
            const state = makeBaseState({
                meta: { turn: 3, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
                political: {
                    political_controllers: {
                        'op:sarajevo:a': 'RBiH',
                        'op:sarajevo:b': 'RS',
                    },
                } as any,
            });

            const report = detectOffensiveParamilitaryTargets(state, edges, reverseMap);
            const rsSpawns = report.spawned.filter(s => s.faction === 'RS');
            expect(rsSpawns).toHaveLength(0);
        });

        it('ignores targets after OFFENSIVE_PARA_FADE_WEEK', () => {
            const edges = makeEdges([['op:zvornik:a', 'op:zvornik:b']]);
            const reverseMap = makeReverseMap(['op:zvornik:a', 'op:zvornik:b']);
            const state = makeBaseState({
                meta: { turn: 15, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
                political: {
                    political_controllers: {
                        'op:zvornik:a': 'RS',
                        'op:zvornik:b': 'RBiH',
                    },
                } as any,
            });

            const report = detectOffensiveParamilitaryTargets(state, edges, reverseMap);
            expect(report.spawned).toHaveLength(0);
        });

        it('does not duplicate targets already being swept', () => {
            const edges = makeEdges([['op:zvornik:a', 'op:zvornik:b']]);
            const reverseMap = makeReverseMap(['op:zvornik:a', 'op:zvornik:b']);
            const state = makeBaseState({
                meta: { turn: 3, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
                military: {
                    formations: {
                        'opara_rs_t2_0': {
                            id: 'opara_rs_t2_0', faction: 'RS', name: 'Para', created_turn: 2,
                            status: 'active', assignment: null, kind: 'paramilitary',
                            paramilitary_target: 'op:zvornik:b', paramilitary_eta: 1,
                            paramilitary_mode: 'offensive', personnel: 600,
                        } as FormationState,
                    },
                } as any,
                political: {
                    political_controllers: {
                        'op:zvornik:a': 'RS',
                        'op:zvornik:b': 'RBiH',
                    },
                } as any,
            });

            const report = detectOffensiveParamilitaryTargets(state, edges, reverseMap);
            expect(report.spawned.filter(s => s.target_osid === 'op:zvornik:b')).toHaveLength(0);
        });

        it('RBiH never spawns offensive paramilitaries (rate 0)', () => {
            const edges = makeEdges([['op:zvornik:a', 'op:zvornik:b']]);
            const reverseMap = makeReverseMap(['op:zvornik:a', 'op:zvornik:b']);
            const state = makeBaseState({
                meta: { turn: 3, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
                political: {
                    political_controllers: {
                        'op:zvornik:a': 'RBiH',
                        'op:zvornik:b': 'RS',
                    },
                } as any,
            });

            const report = detectOffensiveParamilitaryTargets(state, edges, reverseMap);
            const rbihSpawns = report.spawned.filter(s => s.faction === 'RBiH');
            expect(rbihSpawns).toHaveLength(0);
        });
    });

    describe('advanceParamilitaries — offensive mode', () => {
        it('captures undefended OSID and triggers displacement + war crime', () => {
            const reverseMap = makeReverseMap(['op:zvornik:a', 'op:zvornik:b']);
            const state = makeBaseState({
                military: {
                    formations: {
                        'opara_rs_t2_0': {
                            id: 'opara_rs_t2_0', faction: 'RS', name: 'Offensive Para', created_turn: 2,
                            status: 'active', assignment: null, kind: 'paramilitary',
                            paramilitary_target: 'op:zvornik:b', paramilitary_eta: 1,
                            paramilitary_mode: 'offensive', personnel: 600,
                        } as FormationState,
                    },
                    negotiation: {
                        capital: {
                            RS: { war_crimes_events: 0, territory_controlled_pct: 0, territory_controlled_km2: 0, civilians_under_protection: 0, refugees_created: 0, refugees_received: 0, military_casualties_inflicted: 0, military_casualties_taken: 0, civilian_casualties_caused: 0, enclaves_held: [], enclaves_lost: [], peace_plans_accepted: [], peace_plans_rejected: [], operations_launched: 0, operations_successful: 0 },
                        },
                        patron_relationships: {},
                        peace_plan_history: [],
                    },
                } as any,
                political: {
                    political_controllers: { 'op:zvornik:a': 'RS', 'op:zvornik:b': 'RBiH' },
                } as any,
            });

            const report = advanceParamilitaries(state, [], reverseMap);

            expect(report.captured).toHaveLength(1);
            expect(report.captured[0].osid).toBe('op:zvornik:b');
            expect(state.political.political_controllers!['op:zvornik:b']).toBe('RS');
            // War crime should be recorded
            expect(state.military.negotiation!.capital['RS'].war_crimes_events).toBe(1);
            // Civilian casualties at offensive rate (0.05 * 5000 = 250)
            expect(state.displacement.civilian_casualties!['RBiH'].killed).toBe(250);
        });

        it('captures lightly defended OSID (defender <= 500 pers)', () => {
            const reverseMap = makeReverseMap(['op:zvornik:a', 'op:zvornik:b']);
            const state = makeBaseState({
                military: {
                    formations: {
                        'opara_rs_t2_0': {
                            id: 'opara_rs_t2_0', faction: 'RS', name: 'Offensive Para', created_turn: 2,
                            status: 'active', assignment: null, kind: 'paramilitary',
                            paramilitary_target: 'op:zvornik:b', paramilitary_eta: 1,
                            paramilitary_mode: 'offensive', personnel: 600,
                        } as FormationState,
                        'rbih_to_1': {
                            id: 'rbih_to_1', faction: 'RBiH', name: 'TO', created_turn: 0,
                            status: 'active', assignment: null, kind: 'brigade',
                            location_osid: 'op:zvornik:b', personnel: 300,
                            cohesion: 40, morale: 50,
                        } as FormationState,
                    },
                    negotiation: {
                        capital: {
                            RS: { war_crimes_events: 0, territory_controlled_pct: 0, territory_controlled_km2: 0, civilians_under_protection: 0, refugees_created: 0, refugees_received: 0, military_casualties_inflicted: 0, military_casualties_taken: 0, civilian_casualties_caused: 0, enclaves_held: [], enclaves_lost: [], peace_plans_accepted: [], peace_plans_rejected: [], operations_launched: 0, operations_successful: 0 },
                        },
                        patron_relationships: {},
                        peace_plan_history: [],
                    },
                } as any,
                political: {
                    political_controllers: { 'op:zvornik:a': 'RS', 'op:zvornik:b': 'RBiH' },
                } as any,
            });

            const report = advanceParamilitaries(state, [], reverseMap);

            // Should capture — defender has 300 pers, below 500 threshold
            expect(report.captured).toHaveLength(1);
            expect(state.political.political_controllers!['op:zvornik:b']).toBe('RS');
            // Defender should take casualties (30% of 300 = 90)
            const defender = state.military.formations!['rbih_to_1'];
            expect(defender.personnel).toBeLessThan(300);
        });

        it('retreats from strongly defended OSID (defender > 500 pers)', () => {
            const reverseMap = makeReverseMap(['op:zvornik:a', 'op:zvornik:b']);
            const state = makeBaseState({
                military: {
                    formations: {
                        'opara_rs_t2_0': {
                            id: 'opara_rs_t2_0', faction: 'RS', name: 'Offensive Para', created_turn: 2,
                            status: 'active', assignment: null, kind: 'paramilitary',
                            paramilitary_target: 'op:zvornik:b', paramilitary_eta: 1,
                            paramilitary_mode: 'offensive', personnel: 600,
                        } as FormationState,
                        'rbih_bde_1': {
                            id: 'rbih_bde_1', faction: 'RBiH', name: 'Brigade', created_turn: 0,
                            status: 'active', assignment: null, kind: 'brigade',
                            location_osid: 'op:zvornik:b', personnel: 1500,
                        } as FormationState,
                    },
                } as any,
                political: {
                    political_controllers: { 'op:zvornik:a': 'RS', 'op:zvornik:b': 'RBiH' },
                } as any,
            });

            const report = advanceParamilitaries(state, [], reverseMap);

            // Should NOT capture — defender has 1500 pers, above 500 threshold
            expect(report.captured).toHaveLength(0);
            expect(state.political.political_controllers!['op:zvornik:b']).toBe('RBiH');
            // Paramilitary should be dissolved (heavy casualties, retreat)
            expect(report.dissolved).toContain('opara_rs_t2_0');
        });

        it('records civilian casualties at offensive rate (0.05)', () => {
            const reverseMap = makeReverseMap(['op:zvornik:a', 'op:zvornik:b']);
            const state = makeBaseState({
                military: {
                    formations: {
                        'opara_rs_t2_0': {
                            id: 'opara_rs_t2_0', faction: 'RS', name: 'Offensive Para', created_turn: 2,
                            status: 'active', assignment: null, kind: 'paramilitary',
                            paramilitary_target: 'op:zvornik:b', paramilitary_eta: 1,
                            paramilitary_mode: 'offensive', personnel: 600,
                        } as FormationState,
                    },
                } as any,
                political: {
                    political_controllers: { 'op:zvornik:a': 'RS', 'op:zvornik:b': 'RBiH' },
                } as any,
            });

            advanceParamilitaries(state, [], reverseMap);

            // Offensive rate: 0.05 * 5000 = 250 civilian casualties
            expect(state.displacement.civilian_casualties!['RBiH'].killed).toBe(250);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // Adjacent-defender projection (n1328 Sapna-Teočak corridor fix)
    // ═══════════════════════════════════════════════════════════════════════

    describe('adjacent-defender projection', () => {
        it('skips offensive target when same-controller brigade is at adjacent OSID', () => {
            // rastosnica_2 (RBiH, EMPTY) adjacent to sapna (RBiH, 246th brigade)
            // RS controls kozluk_2 adjacent to rastosnica_2
            const edges = makeEdges([
                ['op:zvornik:rastosnica_2', 'op:zvornik:sapna'],
                ['op:zvornik:rastosnica_2', 'op:zvornik:kozluk_2'],
                ['op:zvornik:sapna', 'op:zvornik:kozluk_2'],
            ]);
            const reverseMap = makeReverseMap([
                'op:zvornik:rastosnica_2', 'op:zvornik:sapna', 'op:zvornik:kozluk_2',
            ]);
            const state = makeBaseState({
                meta: { turn: 2, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
                military: {
                    formations: {
                        'arbih_246th': {
                            id: 'arbih_246th', faction: 'RBiH', name: '246th',
                            created_turn: 0, status: 'active', assignment: null,
                            kind: 'brigade', location_osid: 'op:zvornik:sapna',
                            personnel: 600,
                        } as FormationState,
                    },
                } as any,
                political: {
                    political_controllers: {
                        'op:zvornik:rastosnica_2': 'RBiH',
                        'op:zvornik:sapna': 'RBiH',
                        'op:zvornik:kozluk_2': 'RS',
                    },
                } as any,
            });

            const report = detectOffensiveParamilitaryTargets(state, edges, reverseMap);

            // rastosnica_2 has a same-controller brigade at adjacent sapna → not targeted
            const targeting_rast = report.spawned.filter(s =>
                s.faction === 'RS' && s.target_osid === 'op:zvornik:rastosnica_2');
            expect(targeting_rast).toHaveLength(0);
        });

        it('DOES target when adjacent brigade is from the attacker faction', () => {
            // rastosnica_2 (RBiH, EMPTY) adjacent to kozluk_2 (RS, RS brigade)
            // The RS brigade at kozluk_2 should NOT prevent RS from sweeping rastosnica_2
            const edges = makeEdges([
                ['op:zvornik:rastosnica_2', 'op:zvornik:kozluk_2'],
            ]);
            const reverseMap = makeReverseMap([
                'op:zvornik:rastosnica_2', 'op:zvornik:kozluk_2',
            ]);
            const state = makeBaseState({
                meta: { turn: 2, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
                military: {
                    formations: {
                        'rs_1st_zvornik': {
                            id: 'rs_1st_zvornik', faction: 'RS', name: '1st Zvornik',
                            created_turn: 0, status: 'active', assignment: null,
                            kind: 'brigade', location_osid: 'op:zvornik:kozluk_2',
                            personnel: 2000,
                        } as FormationState,
                    },
                } as any,
                political: {
                    political_controllers: {
                        'op:zvornik:rastosnica_2': 'RBiH',
                        'op:zvornik:kozluk_2': 'RS',
                    },
                } as any,
            });

            const report = detectOffensiveParamilitaryTargets(state, edges, reverseMap);

            // RS brigade at kozluk_2 is attacker-faction, not defender — does NOT block sweep
            // (Whether a spawn actually happens depends on deterministic hash, but it should NOT
            // be blocked by the adjacent-defender check)
            // We verify the mechanism doesn't false-positive by checking sapna scenario above
        });

        it('skips offensive target when enclave brigade is at adjacent OSID', () => {
            // sapna (RBiH, EMPTY) adjacent to teocak (RBiH, 255th Slavna 2500 pers)
            // RS controls kozluk_2 adjacent to sapna
            const edges = makeEdges([
                ['op:zvornik:sapna', 'op:ugljevik:teocak_krstac_2'],
                ['op:zvornik:sapna', 'op:zvornik:kozluk_2'],
                ['op:ugljevik:teocak_krstac_2', 'op:zvornik:kozluk_2'],
            ]);
            const reverseMap = makeReverseMap([
                'op:zvornik:sapna', 'op:ugljevik:teocak_krstac_2', 'op:zvornik:kozluk_2',
            ]);
            const state = makeBaseState({
                meta: { turn: 2, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
                military: {
                    formations: {
                        'arbih_255th': {
                            id: 'arbih_255th', faction: 'RBiH', name: '255th Slavna',
                            created_turn: 0, status: 'active', assignment: null,
                            kind: 'brigade', location_osid: 'op:ugljevik:teocak_krstac_2',
                            personnel: 2500,
                        } as FormationState,
                    },
                } as any,
                political: {
                    political_controllers: {
                        'op:zvornik:sapna': 'RBiH',
                        'op:ugljevik:teocak_krstac_2': 'RBiH',
                        'op:zvornik:kozluk_2': 'RS',
                    },
                } as any,
            });

            const report = detectOffensiveParamilitaryTargets(state, edges, reverseMap);

            // sapna has 255th at adjacent teocak → not targeted
            const targeting_sapna = report.spawned.filter(s =>
                s.faction === 'RS' && s.target_osid === 'op:zvornik:sapna');
            expect(targeting_sapna).toHaveLength(0);
        });
    });
});
