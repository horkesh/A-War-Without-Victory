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
import {
    isEligibleForReinforcement,
    OFFENSIVE_PARA_MAX_DEPLOYMENTS_PER_FACTION_TURN,
    PARAMILITARY_MAX_REAR_DEPLOYMENTS_PER_FACTION_TURN,
} from '../src/state/formation_constants.js';

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

function makeHubAndTargets(
    hub: string,
    targets: string[]
): { edges: EdgeRecord[]; reverseMap: OperationalToCanonicalReverseMap } {
    return {
        edges: targets.map((target) => ({ a: hub, b: target }) as EdgeRecord),
        reverseMap: makeReverseMap([hub, ...targets]),
    };
}

function makeBaseState(overrides?: Partial<GameState>): GameState {
    const controllers = overrides?.political?.political_controllers ?? {};
    const defaultMunicipalities: Record<string, any> = {};
    for (const osid of Object.keys(controllers).sort()) {
        const municipalityId = osid.split(':')[1] ?? osid;
        defaultMunicipalities[municipalityId] ??= {
            organizational_penetration: {
                sda_penetration: 40,
                sds_penetration: 85,
                hdz_penetration: 20,
                patriotska_liga: 25,
                paramilitary_rs: 60,
                paramilitary_hrhb: 5,
            },
        };
    }
    const explicitMunicipalities = overrides?.political?.municipalities ?? {};
    const municipalities = { ...defaultMunicipalities };
    for (const municipalityId of Object.keys(explicitMunicipalities).sort()) {
        const explicit = explicitMunicipalities[municipalityId] as any;
        municipalities[municipalityId] = {
            ...(municipalities[municipalityId] ?? {}),
            ...explicit,
            organizational_penetration: {
                ...(municipalities[municipalityId]?.organizational_penetration ?? {}),
                ...(explicit?.organizational_penetration ?? {}),
            },
        };
    }

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
      ...(overrides?.political || {}),
    municipalities,
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

            // RS should detect op:d as the strongest eligible pocket and spawn paramilitary.
            const rsSpawns = report.spawned.filter(s => s.faction === 'RS');
            expect(rsSpawns.map((spawn) => spawn.target_osid)).toContain('op:d');
            // There should be no player requests (no player faction set).
            expect(report.pending_player_requests).toBe(0);
        });

        it('does not spawn paramilitaries after week 20', () => {
            const edges = makeEdges([['op:a', 'op:b'], ['op:a', 'op:d'], ['op:b', 'op:d']]);
            const reverseMap = makeReverseMap(['op:a', 'op:b', 'op:d']);
            const state = makeBaseState({
  meta: { turn: 21, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
  political: {
    political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:d': 'RBiH' },
  } as any,
});

            const report = detectParamilitaryTargets(state, edges, reverseMap);
            expect(report.spawned).toHaveLength(0);
            expect(report.pending_player_requests).toBe(0);
        });

        it('creates pending requests for player faction', () => {
            // The eligible RS pocket is surfaced as a player request.
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

        it('defers player requests until the enabled paramilitary policy decision is resolved', () => {
            const edges = makeEdges([['op:a', 'op:b'], ['op:a', 'op:c'], ['op:a', 'op:d'], ['op:b', 'op:d'], ['op:c', 'op:d']]);
            const reverseMap = makeReverseMap(['op:a', 'op:b', 'op:c', 'op:d']);
            const state = makeBaseState({
                meta: { turn: 1, phase: 'war', schema_version: 1, seed: 'test', player_faction: 'RS' } as GameState['meta'],
                military: {
                    enabled_event_ids: ['rs_paramilitary_policy_1992'],
                } as any,
                political: {
                    political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:c': 'RS', 'op:d': 'RBiH' },
                } as any,
            });

            const beforePolicy = detectParamilitaryTargets(state, edges, reverseMap);

            expect(beforePolicy.pending_player_requests).toBe(0);
            expect(state.pending_paramilitary_requests ?? []).toHaveLength(0);

            state.military.event_decision_log = [{ event_id: 'rs_paramilitary_policy_1992' }] as any;
            const afterPolicy = detectParamilitaryTargets(state, edges, reverseMap);

            expect(afterPolicy.pending_player_requests).toBe(1);
            expect(state.pending_paramilitary_requests).toHaveLength(1);
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

        it('does not generate rear-pocket deployments against an allied faction', () => {
            const targets = ['op:test:t0', 'op:test:t1'];
            const { edges, reverseMap } = makeHubAndTargets('op:test:hub', targets);
            const state = makeBaseState({
                political: {
                    war_alliance_rbih_hrhb: 0.75,
                    political_controllers: Object.fromEntries([
                        ['op:test:hub', 'RBiH'],
                        ...targets.map((target) => [target, 'HRHB'] as const),
                    ]),
                } as any,
            });

            const report = detectParamilitaryTargets(state, edges, reverseMap);

            expect(report.spawned.filter((spawn) => spawn.faction === 'RBiH')).toHaveLength(0);
            expect(report.pending_player_requests).toBe(0);
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

        it('caps rear-pocket bot deployments per faction per turn', () => {
            const targets = Array.from({ length: 40 }, (_, i) => `op:municipality_${i}:target`);
            const { edges, reverseMap } = makeHubAndTargets('op:hub:rs', targets);
            const state = makeBaseState({
                political: {
                    political_controllers: Object.fromEntries([
                        ['op:hub:rs', 'RS'],
                        ...targets.map((target) => [target, 'RBiH'] as const),
                    ]),
                } as any,
            });

            const report = detectParamilitaryTargets(state, edges, reverseMap);

            expect(report.spawned.filter((spawn) => spawn.faction === 'RS')).toHaveLength(
                PARAMILITARY_MAX_REAR_DEPLOYMENTS_PER_FACTION_TURN
            );
        });

        it('ranks rear-pocket targets by adjacent friendly support before OSID', () => {
            const targets = ['op:zvornik:strong', 'op:bratunac:weak_a', 'op:vlasenica:weak_b'];
            const edges = makeEdges([
                ['op:zvornik:hub_a', 'op:zvornik:strong'],
                ['op:zvornik:hub_b', 'op:zvornik:strong'],
                ['op:zvornik:hub_a', 'op:bratunac:weak_a'],
                ['op:zvornik:hub_a', 'op:vlasenica:weak_b'],
            ]);
            const reverseMap = makeReverseMap(['op:zvornik:hub_a', 'op:zvornik:hub_b', ...targets]);
            const state = makeBaseState({
                political: {
                    political_controllers: {
                        'op:zvornik:hub_a': 'RS',
                        'op:zvornik:hub_b': 'RS',
                        'op:zvornik:strong': 'RBiH',
                        'op:bratunac:weak_a': 'RBiH',
                        'op:vlasenica:weak_b': 'RBiH',
                    },
                } as any,
            });

            const report = detectParamilitaryTargets(state, edges, reverseMap);
            const rsTargets = report.spawned
                .filter((spawn) => spawn.faction === 'RS')
                .map((spawn) => spawn.target_osid);

            expect(rsTargets).toEqual(['op:zvornik:strong', 'op:bratunac:weak_a']);
        });

        it('retains support priority when the rear-pocket cap truncates candidates', () => {
            const targets = ['op:zvornik:t0', 'op:bratunac:t1', 'op:vlasenica:t2'];
            const edges = makeEdges([
                ['op:zvornik:hub_a', 'op:zvornik:t0'],
                ['op:zvornik:hub_a', 'op:bratunac:t1'],
                ['op:zvornik:hub_b', 'op:bratunac:t1'],
                ['op:zvornik:hub_a', 'op:vlasenica:t2'],
                ['op:zvornik:hub_b', 'op:vlasenica:t2'],
                ['op:zvornik:hub_c', 'op:vlasenica:t2'],
            ]);
            const reverseMap = makeReverseMap([
                'op:zvornik:hub_a',
                'op:zvornik:hub_b',
                'op:zvornik:hub_c',
                ...targets,
            ]);
            const state = makeBaseState({
                political: {
                    political_controllers: {
                        'op:zvornik:hub_a': 'RS',
                        'op:zvornik:hub_b': 'RS',
                        'op:zvornik:hub_c': 'RS',
                        'op:zvornik:t0': 'RBiH',
                        'op:bratunac:t1': 'RBiH',
                        'op:vlasenica:t2': 'RBiH',
                    },
                } as any,
            });

            const rsTargets = detectParamilitaryTargets(state, edges, reverseMap).spawned
                .filter((spawn) => spawn.faction === 'RS')
                .map((spawn) => spawn.target_osid);

            expect(rsTargets).toEqual(['op:vlasenica:t2', 'op:bratunac:t1']);
        });

        it('requires local paramilitary capacity and superiority over the controller', () => {
            const targets = ['op:ambient:target', 'op:parity:target', 'op:superior:target'];
            const { edges, reverseMap } = makeHubAndTargets('op:hub:rs', targets);
            const state = makeBaseState({
                political: {
                    political_controllers: Object.fromEntries([
                        ['op:hub:rs', 'RS'],
                        ...targets.map((target) => [target, 'RBiH'] as const),
                    ]),
                    municipalities: {
                        ambient: {
                            organizational_penetration: {
                                paramilitary_rs: 5,
                                patriotska_liga: 0,
                            },
                        },
                        parity: {
                            organizational_penetration: {
                                paramilitary_rs: 25,
                                patriotska_liga: 25,
                            },
                        },
                        superior: {
                            organizational_penetration: {
                                paramilitary_rs: 60,
                                patriotska_liga: 25,
                            },
                        },
                    },
                } as any,
            });

            const rsTargets = detectParamilitaryTargets(state, edges, reverseMap).spawned
                .filter((spawn) => spawn.faction === 'RS')
                .map((spawn) => spawn.target_osid);

            expect(rsTargets).toEqual(['op:superior:target']);
        });

        it('ranks adjacent friendly support before dominance when attacker organization is equal', () => {
            const targets = ['op:narrow:target', 'op:dominant:target'];
            const edges = makeEdges([
                ['op:hub:a', 'op:narrow:target'],
                ['op:hub:b', 'op:narrow:target'],
                ['op:hub:a', 'op:dominant:target'],
            ]);
            const reverseMap = makeReverseMap(['op:hub:a', 'op:hub:b', ...targets]);
            const state = makeBaseState({
                political: {
                    political_controllers: {
                        'op:hub:a': 'RS',
                        'op:hub:b': 'RS',
                        'op:narrow:target': 'RBiH',
                        'op:dominant:target': 'RBiH',
                    },
                    municipalities: {
                        narrow: {
                            organizational_penetration: {
                                paramilitary_rs: 60,
                                patriotska_liga: 55,
                            },
                        },
                        dominant: {
                            organizational_penetration: {
                                paramilitary_rs: 60,
                                patriotska_liga: 25,
                            },
                        },
                    },
                } as any,
            });

            const rsTargets = detectParamilitaryTargets(state, edges, reverseMap).spawned
                .filter((spawn) => spawn.faction === 'RS')
                .map((spawn) => spawn.target_osid);

            expect(rsTargets).toEqual(['op:narrow:target', 'op:dominant:target']);
        });

        it('issues at most one deployment per municipality and respects pending requests on re-entry', () => {
            const targets = [
                'op:zvornik:first',
                'op:zvornik:second',
                'op:bratunac:first',
                'op:vlasenica:first',
            ];
            const { edges, reverseMap } = makeHubAndTargets('op:hub:rs', targets);
            const state = makeBaseState({
                meta: {
                    turn: 5,
                    phase: 'war',
                    schema_version: 1,
                    seed: 'test',
                    player_faction: 'RS',
                } as GameState['meta'],
                political: {
                    political_controllers: Object.fromEntries([
                        ['op:hub:rs', 'RS'],
                        ...targets.map((target) => [target, 'RBiH'] as const),
                    ]),
                } as any,
            });

            const first = detectParamilitaryTargets(state, edges, reverseMap);
            const second = detectParamilitaryTargets(state, edges, reverseMap);

            expect(first.pending_player_requests).toBe(PARAMILITARY_MAX_REAR_DEPLOYMENTS_PER_FACTION_TURN);
            expect(second.pending_player_requests).toBe(0);
            expect(state.pending_paramilitary_requests).toHaveLength(
                PARAMILITARY_MAX_REAR_DEPLOYMENTS_PER_FACTION_TURN
            );
            expect(new Set(state.pending_paramilitary_requests?.map((request) => request.target_osid.split(':')[1])).size)
                .toBe(PARAMILITARY_MAX_REAR_DEPLOYMENTS_PER_FACTION_TURN);
        });

        it('leaves current attack-order targets to regular forces without reserving future operation objectives', () => {
            const targets = ['op:attack_order:target', 'op:operation:target'];
            const { edges, reverseMap } = makeHubAndTargets('op:hub:rs', targets);
            const state = makeBaseState({
                military: {
                    brigade_attack_orders: {
                        rs_brigade: 'op:attack_order:target',
                    },
                    corps_command: {
                        rs_corps: {
                            active_operations: [{
                                name: 'Regular operation',
                                type: 'sector_attack',
                                phase: 'execution',
                                started_turn: 4,
                                phase_started_turn: 4,
                                participating_brigades: ['rs_brigade'],
                                objectives: ['op:operation:target'],
                            }],
                        },
                    },
                } as any,
                political: {
                    political_controllers: Object.fromEntries([
                        ['op:hub:rs', 'RS'],
                        ...targets.map((target) => [target, 'RBiH'] as const),
                    ]),
                } as any,
            });

            const report = detectParamilitaryTargets(state, edges, reverseMap);

            expect(report.spawned.filter((spawn) => spawn.faction === 'RS').map((spawn) => spawn.target_osid))
                .toEqual(['op:operation:target']);
        });

        it('does not re-offer a target denied or assigned to regular forces this turn', () => {
            const targets = ['op:denied:target', 'op:regular:target'];
            const { edges, reverseMap } = makeHubAndTargets('op:hub:rs', targets);
            const state = makeBaseState({
                meta: {
                    turn: 5,
                    phase: 'war',
                    schema_version: 1,
                    seed: 'test',
                    player_faction: 'RS',
                } as GameState['meta'],
                paramilitary_decision_history: targets.map((target, index) => ({
                    id: `paramilitary:5:${target}`,
                    turn: 5,
                    target_osid: target,
                    faction: 'RS',
                    strength: 150,
                    decision: index === 0 ? 'deny' : 'regular',
                    mode: 'rear_pocket',
                })),
                political: {
                    political_controllers: Object.fromEntries([
                        ['op:hub:rs', 'RS'],
                        ...targets.map((target) => [target, 'RBiH'] as const),
                    ]),
                } as any,
            });

            const report = detectParamilitaryTargets(state, edges, reverseMap);

            expect(report.pending_player_requests).toBe(0);
            expect(state.pending_paramilitary_requests ?? []).toHaveLength(0);
        });

        it('preserves an existing same-turn formation when assigning the next deterministic id', () => {
            const targets = ['op:existing:target', 'op:new:target'];
            const { edges, reverseMap } = makeHubAndTargets('op:hub:rs', targets);
            const existing = {
                id: 'para_rs_t5_0',
                faction: 'RS',
                name: 'Existing paramilitary',
                created_turn: 5,
                status: 'active',
                assignment: null,
                kind: 'paramilitary',
                paramilitary_target: 'op:existing:target',
                paramilitary_eta: 1,
                personnel: 150,
            } as FormationState;
            const state = makeBaseState({
                military: {
                    formations: {
                        [existing.id]: existing,
                    },
                } as any,
                political: {
                    political_controllers: Object.fromEntries([
                        ['op:hub:rs', 'RS'],
                        ...targets.map((target) => [target, 'RBiH'] as const),
                    ]),
                } as any,
            });

            const report = detectParamilitaryTargets(state, edges, reverseMap);

            expect(state.military.formations?.[existing.id]?.paramilitary_target).toBe('op:existing:target');
            expect(report.spawned).toContainEqual(expect.objectContaining({
                target_osid: 'op:new:target',
                formation_id: 'para_rs_t5_1',
            }));
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
                        readiness: 'active', paramilitary_target: 'D', paramilitary_eta: 1, personnel: 150,
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
            expect(state.military.formations!['para_rs_t3_0'].readiness).toBe('degraded');
        });

        it('expires active paramilitaries after week 20 without allowing a final capture', () => {
            const reverseMap = makeReverseMap(['A', 'D']);
            const state = makeBaseState({
                meta: { turn: 21, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
                military: {
                    formations: {
                        'para_rs_t20_0': {
                            id: 'para_rs_t20_0', faction: 'RS', name: 'Para', created_turn: 20,
                            status: 'active', assignment: null, kind: 'paramilitary', readiness: 'active',
                            paramilitary_target: 'D', paramilitary_eta: 1, personnel: 150,
                        } as FormationState,
                    },
                } as any,
                political: {
                    political_controllers: { A: 'RS', D: 'RBiH' },
                    control_events: [],
                } as any,
            });

            const report = advanceParamilitaries(state, [], reverseMap);

            expect(report.captured).toHaveLength(0);
            expect(report.dissolved).toEqual(['para_rs_t20_0']);
            expect(state.political.political_controllers!['D']).toBe('RBiH');
            expect(state.political.control_events).toHaveLength(0);
            expect(state.displacement.civilian_casualties!['RBiH'].killed).toBe(0);
            expect(state.military.formations!['para_rs_t20_0']).toMatchObject({
                status: 'inactive',
                lifecycle_status: 'disbanded',
                readiness: 'degraded',
                personnel: 0,
            });
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

        it('dissolves an in-transit deployment when bilateral combat is blocked', () => {
            const edges = makeEdges([['op:test:hub', 'op:test:target']]);
            const reverseMap = makeReverseMap(['op:test:hub', 'op:test:target']);
            const state = makeBaseState({
                meta: { turn: 5, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
                military: {
                    formations: {
                        para_rbih_t4_0: {
                            id: 'para_rbih_t4_0',
                            faction: 'RBiH',
                            name: 'Paramilitary',
                            created_turn: 4,
                            status: 'active',
                            assignment: null,
                            kind: 'paramilitary',
                            paramilitary_target: 'op:test:target',
                            paramilitary_eta: 1,
                            personnel: 150,
                        } as FormationState,
                    },
                } as any,
                political: {
                    war_alliance_rbih_hrhb: 0.75,
                    political_controllers: {
                        'op:test:hub': 'RBiH',
                        'op:test:target': 'HRHB',
                    },
                } as any,
            });

            const report = advanceParamilitaries(state, edges, reverseMap);

            expect(state.political.political_controllers?.['op:test:target']).toBe('HRHB');
            expect(state.military.formations?.para_rbih_t4_0?.status).toBe('inactive');
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

        it('consumes stale pending player requests when a standing paramilitary policy is active', () => {
            const state = makeBaseState({
                paramilitary_policy: 'always_deny',
                meta: { turn: 5, player_faction: 'RS', phase: 'war', seed: 1 } as any,
                pending_paramilitary_requests: [
                    { target_osid: 'D', faction: 'RS', strength: 150 },
                ],
            });

            detectParamilitaryTargets(state, [], new Map());

            expect(state.pending_paramilitary_requests).toHaveLength(0);
            expect(state.paramilitary_decision_history).toEqual([
                {
                    id: 'paramilitary:5:D',
                    turn: 5,
                    target_osid: 'D',
                    faction: 'RS',
                    strength: 150,
                    decision: 'deny',
                },
            ]);
        });

        it('consumes stale pending player requests even after rear-pocket sweep has faded', () => {
            const state = makeBaseState({
                paramilitary_policy: 'always_deny',
                meta: { turn: 99, player_faction: 'RS', phase: 'war', seed: 1 } as any,
                pending_paramilitary_requests: [
                    { target_osid: 'late-pocket', faction: 'RS', strength: 150 },
                ],
            });

            detectParamilitaryTargets(state, [], new Map());

            expect(state.pending_paramilitary_requests).toHaveLength(0);
            expect(state.paramilitary_decision_history?.[0]?.decision).toBe('deny');
        });

        it('records but does not deploy an approved rear-pocket request after week 20', () => {
            const state = makeBaseState({
                meta: { turn: 21, player_faction: 'RS', phase: 'war', seed: 1 } as any,
                pending_paramilitary_requests: [
                    { target_osid: 'late-pocket', faction: 'RS', strength: 150, decision: 'allow' },
                ],
            });

            const report = resolvePlayerParamilitaryDecisions(state);

            expect(report.spawned).toHaveLength(0);
            expect(state.pending_paramilitary_requests).toHaveLength(0);
            expect(state.paramilitary_deployment_count?.['RS'] ?? 0).toBe(0);
            expect(state.paramilitary_decision_history?.[0]?.decision).toBe('allow');
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

        it('preserves offensive mode when an offensive player request is allowed', () => {
            const state = makeBaseState({
                pending_paramilitary_requests: [
                    {
                        target_osid: 'D',
                        faction: 'RS',
                        strength: 600,
                        decision: 'allow',
                        mode: 'offensive',
                    },
                ],
            });

            const report = resolvePlayerParamilitaryDecisions(state);

            expect(report.spawned).toEqual([
                { faction: 'RS', target_osid: 'D', formation_id: 'opara_rs_t5_0' },
            ]);
            expect(state.military.formations?.opara_rs_t5_0).toMatchObject({
                personnel: 600,
                paramilitary_mode: 'offensive',
                paramilitary_eta: 1,
            });
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
                    { target_osid: 'D', faction: 'RS', strength: 150, decision: 'allow', estimated_civilian_risk: 12, mode: 'offensive' },
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
                    mode: 'offensive',
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
            // RS should detect op:zvornik:b as an offensive target (in scope, hostile, with friendly support).
            const rsSpawns = report.spawned.filter(s => s.faction === 'RS');
            expect(rsSpawns.map((spawn) => spawn.target_osid)).toContain('op:zvornik:b');
            // RBiH is explicitly ineligible for offensive paramilitary deployments.
            const rbihSpawns = report.spawned.filter(s => s.faction === 'RBiH');
            expect(rbihSpawns).toHaveLength(0);
        });

        it('does not generate an offensive deployment against an exactly defended OSID', () => {
            const edges = makeEdges([['op:zvornik:a', 'op:zvornik:b']]);
            const reverseMap = makeReverseMap(['op:zvornik:a', 'op:zvornik:b']);
            const state = makeBaseState({
                meta: { turn: 3, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
                military: {
                    formations: {
                        rbih_local_defense: {
                            id: 'rbih_local_defense',
                            faction: 'RBiH',
                            name: 'Local Defense',
                            created_turn: 0,
                            status: 'active',
                            assignment: null,
                            kind: 'brigade',
                            location_osid: 'op:zvornik:b',
                            personnel: 300,
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

            expect(report.spawned).toHaveLength(0);
            expect(report.pending_player_requests).toBe(0);
        });

        it('does not generate offensive deployments against an allied faction', () => {
            const edges = makeEdges([['op:stolac:a', 'op:stolac:b']]);
            const reverseMap = makeReverseMap(['op:stolac:a', 'op:stolac:b']);
            const state = makeBaseState({
                meta: { turn: 3, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
                factions: [{ id: 'HRHB' } as FactionState],
                political: {
                    war_alliance_rbih_hrhb: 0.75,
                    political_controllers: {
                        'op:stolac:a': 'HRHB',
                        'op:stolac:b': 'RBiH',
                    },
                } as any,
            });

            const report = detectOffensiveParamilitaryTargets(state, edges, reverseMap);

            expect(report.spawned).toHaveLength(0);
            expect(report.pending_player_requests).toBe(0);
        });

        it('does not offer the player an offensive request against an exactly defended OSID', () => {
            const edges = makeEdges([['op:zvornik:a', 'op:zvornik:b']]);
            const reverseMap = makeReverseMap(['op:zvornik:a', 'op:zvornik:b']);
            const state = makeBaseState({
                meta: {
                    turn: 3,
                    phase: 'war',
                    schema_version: 1,
                    seed: 'test',
                    player_faction: 'RS',
                } as GameState['meta'],
                military: {
                    formations: {
                        rbih_local_defense: {
                            id: 'rbih_local_defense',
                            faction: 'RBiH',
                            name: 'Local Defense',
                            created_turn: 0,
                            status: 'active',
                            assignment: null,
                            kind: 'brigade',
                            location_osid: 'op:zvornik:b',
                            personnel: 300,
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

            expect(report.spawned).toHaveLength(0);
            expect(report.pending_player_requests).toBe(0);
            expect(state.pending_paramilitary_requests ?? []).toHaveLength(0);
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

        it('RBiH is not an eligible offensive paramilitary faction', () => {
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

        it('caps offensive bot deployments per faction per turn', () => {
            const targets = ['op:zvornik:target', 'op:bratunac:target', 'op:vlasenica:target'];
            const { edges, reverseMap } = makeHubAndTargets('op:hub:rs', targets);
            const state = makeBaseState({
                meta: { turn: 5, phase: 'war', schema_version: 1, seed: 'test' } as GameState['meta'],
                political: {
                    political_controllers: Object.fromEntries([
                        ['op:hub:rs', 'RS'],
                        ...targets.map((target) => [target, 'RBiH'] as const),
                    ]),
                } as any,
            });

            const report = detectOffensiveParamilitaryTargets(state, edges, reverseMap);

            expect(report.spawned.filter((spawn) => spawn.faction === 'RS')).toHaveLength(
                OFFENSIVE_PARA_MAX_DEPLOYMENTS_PER_FACTION_TURN
            );
        });

        it('marks player offensive requests as offensive so the review modal is truthful', () => {
            const targets = ['op:zvornik:target', 'op:bratunac:target', 'op:vlasenica:target'];
            const { edges, reverseMap } = makeHubAndTargets('op:hub:rs', targets);
            const state = makeBaseState({
                meta: { turn: 5, phase: 'war', schema_version: 1, seed: 'test', player_faction: 'RS' } as GameState['meta'],
                political: {
                    political_controllers: Object.fromEntries([
                        ['op:hub:rs', 'RS'],
                        ...targets.map((target) => [target, 'RBiH'] as const),
                    ]),
                } as any,
            });

            const report = detectOffensiveParamilitaryTargets(state, edges, reverseMap);

            expect(report.pending_player_requests).toBeGreaterThan(0);
            expect(state.pending_paramilitary_requests).toHaveLength(report.pending_player_requests);
            expect(state.pending_paramilitary_requests?.every((request) => request.mode === 'offensive')).toBe(true);
        });

        it('defers offensive player requests while the enabled paramilitary policy decision is unresolved', () => {
            const targets = Array.from({ length: 4 }, (_, i) => `op:zvornik:t${i}`);
            const { edges, reverseMap } = makeHubAndTargets('op:zvornik:hub', targets);
            const state = makeBaseState({
                meta: { turn: 1, phase: 'war', schema_version: 1, seed: 'test', player_faction: 'RS' } as GameState['meta'],
                military: {
                    enabled_event_ids: ['rs_paramilitary_policy_1992'],
                } as any,
                political: {
                    political_controllers: Object.fromEntries([
                        ['op:zvornik:hub', 'RS'],
                        ...targets.map((target) => [target, 'RBiH'] as const),
                    ]),
                } as any,
            });

            const report = detectOffensiveParamilitaryTargets(state, edges, reverseMap);

            expect(report.pending_player_requests).toBe(0);
            expect(state.pending_paramilitary_requests ?? []).toHaveLength(0);
        });

        it('consumes stale pending player requests before offensive sweep when a standing policy is active', () => {
            const state = makeBaseState({
                paramilitary_policy: 'always_deny',
                meta: { turn: 6, phase: 'war', schema_version: 1, seed: 'test', player_faction: 'RS' } as GameState['meta'],
                pending_paramilitary_requests: [
                    {
                        target_osid: 'op:zvornik:stale',
                        faction: 'RS',
                        strength: 600,
                        estimated_civilian_risk: 35,
                        mode: 'offensive',
                    },
                ],
            });

            detectOffensiveParamilitaryTargets(state, [], new Map());

            expect(state.pending_paramilitary_requests).toHaveLength(0);
            expect(state.paramilitary_decision_history).toEqual([
                {
                    id: 'paramilitary:6:op:zvornik:stale',
                    turn: 6,
                    target_osid: 'op:zvornik:stale',
                    faction: 'RS',
                    strength: 600,
                    decision: 'deny',
                    estimated_civilian_risk: 35,
                    mode: 'offensive',
                },
            ]);
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
            expect(state.political.control_events).toContainEqual(expect.objectContaining({
                settlement_id: 'op:zvornik:b',
                mechanism: 'paramilitary',
            }));
            // War crime should be recorded
            expect(state.military.negotiation!.capital['RS'].war_crimes_events).toBe(1);
            // Civilian casualties at offensive rate (0.05 * 5000 = 250)
            expect(state.displacement.civilian_casualties!['RBiH'].killed).toBe(250);
        });

        it('retreats without capture when any organized defense arrives at the target', () => {
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

            // Any organized defender blocks autonomous paramilitary capture.
            expect(report.captured).toHaveLength(0);
            expect(report.dissolved).toContain('opara_rs_t2_0');
            expect(state.political.political_controllers!['op:zvornik:b']).toBe('RBiH');
            // Autonomous paramilitaries retreat without resolving combat against the defender.
            const defender = state.military.formations!['rbih_to_1'];
            expect(defender.personnel).toBe(300);
        });

        it('retreats without capture when organized defense is adjacent at arrival', () => {
            const edges = makeEdges([['op:zvornik:target', 'op:zvornik:defender']]);
            const reverseMap = makeReverseMap(['op:zvornik:target', 'op:zvornik:defender']);
            const state = makeBaseState({
                military: {
                    formations: {
                        'opara_rs_t2_0': {
                            id: 'opara_rs_t2_0',
                            faction: 'RS',
                            name: 'Offensive Para',
                            created_turn: 2,
                            status: 'active',
                            assignment: null,
                            kind: 'paramilitary',
                            paramilitary_target: 'op:zvornik:target',
                            paramilitary_eta: 1,
                            paramilitary_mode: 'offensive',
                            personnel: 600,
                        } as FormationState,
                        'rbih_adjacent': {
                            id: 'rbih_adjacent',
                            faction: 'RBiH',
                            name: 'Adjacent Defense',
                            created_turn: 0,
                            status: 'active',
                            assignment: null,
                            kind: 'brigade',
                            location_osid: 'op:zvornik:defender',
                            personnel: 900,
                        } as FormationState,
                    },
                } as any,
                political: {
                    political_controllers: {
                        'op:zvornik:target': 'RBiH',
                        'op:zvornik:defender': 'RBiH',
                    },
                } as any,
            });

            const report = advanceParamilitaries(state, edges, reverseMap);

            expect(report.captured).toHaveLength(0);
            expect(report.dissolved).toContain('opara_rs_t2_0');
            expect(state.political.political_controllers!['op:zvornik:target']).toBe('RBiH');
            expect(state.military.formations?.rbih_adjacent?.personnel).toBe(900);
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

            // Strong defense also blocks capture.
            expect(report.captured).toHaveLength(0);
            expect(state.political.political_controllers!['op:zvornik:b']).toBe('RBiH');
            // Paramilitary should be dissolved (heavy casualties, retreat)
            expect(report.dissolved).toContain('opara_rs_t2_0');
        });

        it('records killed civilians in casualty and municipal population ledgers', () => {
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
                displacement: {
                    displacement_state: {
                        zvornik: {
                            mun_id: 'zvornik',
                            original_population: 50_000,
                            displaced_out: 1_000,
                            displaced_in: 500,
                            lost_population: 25,
                            last_updated_turn: 2,
                        },
                    },
                } as any,
            });

            advanceParamilitaries(state, [], reverseMap);

            // Offensive rate: 0.05 * 5000 = 250 civilian casualties
            expect(state.displacement.civilian_casualties!['RBiH'].killed).toBe(250);
            expect(state.displacement.displacement_state!['zvornik'].lost_population).toBe(275);
            expect(state.displacement.displacement_state!['zvornik'].last_updated_turn).toBe(5);
            expect(state.displacement.displacement_event_log).toContainEqual(expect.objectContaining({
                origin_mun: 'zvornik',
                origin_osid: 'op:zvornik:b',
                killed: 250,
            }));
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

            // RS brigade at kozluk_2 is attacker-faction, not defender, so it does not block the sweep.
            expect(report.spawned).toContainEqual(expect.objectContaining({
                faction: 'RS',
                target_osid: 'op:zvornik:rastosnica_2',
            }));
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
