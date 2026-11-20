/**
 * Tests for paramilitary sweep system (rear pocket cleanup; the offensive read side for old saves).
 */

import { describe, it, expect } from 'vitest';
import type { GameState, FormationState, FactionState } from '../src/state/game_state.js';
import { initializeCasualtyLedger } from '../src/state/casualty_ledger.js';
import {
    detectParamilitaryTargets,
    advanceParamilitaries,
    resolvePlayerParamilitaryDecisions,
} from '../src/sim/combat/paramilitary_sweep.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import {
    isEligibleForReinforcement,
    PARAMILITARY_MAX_REAR_DEPLOYMENTS_PER_FACTION_TURN,
} from '../src/state/formation_constants.js';
import { loadEventDefinitions } from '../src/sim/events/event_loader.js';

/** The real event catalog (start week 0), for tests that exercise the bot's historical default. */
const EVENT_CATALOG = loadEventDefinitions(0);

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

/**
 * §6 design T3: a manual player's requests are held until the player's own policy card has APPLIED an
 * answer (fired, receipted, valid flag). Player-path tests that exercise the request/standing-order path
 * itself start from that applied state (tests/s6_opening_timing_manual_gate.test.ts pins the hold).
 */
function withAppliedPolicyCard(
    state: GameState,
    order: 'always_deny' | 'ask' | 'always_allow' = state.paramilitary_policy ?? 'ask',
): GameState {
    const faction = state.meta.player_faction;
    const card = faction === 'RS' ? 'rs_paramilitary_policy_1992' : 'rbih_paramilitary_policy_1992';
    const flag = faction === 'RS' ? 'rs_paramilitary_policy' : 'rbih_paramilitary_policy';
    const military = state.military as any;
    military.fired_event_ids = [...(military.fired_event_ids ?? []), card];
    military.event_fire_counts = { ...(military.event_fire_counts ?? {}), [card]: 1 };
    military.event_last_fired_turn = { ...(military.event_last_fired_turn ?? {}), [card]: 2 };
    military.event_decision_log = [...(military.event_decision_log ?? []),
        { event_id: card, response_id: order, decision_source: 'player', faction, turn: 2 }];
    military.event_flags = { ...(military.event_flags ?? {}), [flag]: order };
    return state;
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

            const report = detectParamilitaryTargets(state, edges, reverseMap, undefined);

            // RS should detect op:d as the strongest eligible pocket and spawn paramilitary.
            const rsSpawns = report.spawned.filter(s => s.faction === 'RS');
            expect(rsSpawns.map((spawn) => spawn.target_osid)).toContain('op:d');
            // There should be no player requests (no player faction set).
            expect(report.pending_player_requests).toBe(0);
        });

        it('does not let a besieged enclave expand through rear-pocket cleanup', () => {
            const target = 'op:gorazde:podkozara_donja_2';
            const neighbors = [
                'op:gorazde:gorazde_2',
                'op:gorazde:kolovarice',
                'op:gorazde:ustipraca_2',
            ];
            const edges = makeEdges(neighbors.map((neighbor) => [neighbor, target]));
            const reverseMap = makeReverseMap([target, ...neighbors]);
            const controllers = Object.fromEntries([
                [target, 'RS'],
                ...neighbors.map((neighbor) => [neighbor, 'RBiH']),
            ]);
            const state = makeBaseState({
                political: {
                    political_controllers: controllers,
                    municipalities: {
                        gorazde: {
                            organizational_penetration: {
                                patriotska_liga: 90,
                                paramilitary_rs: 5,
                            },
                        },
                    },
                } as any,
            });

            const report = detectParamilitaryTargets(state, edges, reverseMap, undefined);

            expect(report.spawned.some((spawn) =>
                spawn.faction === 'RBiH' && spawn.target_osid === target,
            )).toBe(false);
        });

        // §6 D1 stage 2 rewrite: the stage-1 version pinned an RBiH bot sweep of Obadi, the artefact
        // itself. The enclave-boundary rule is kept under an explicit Always allow; the RBiH historical
        // default (Refuse, read from the card) sends none.
        function obadiPocketState(rbihFlag?: 'always_allow'): GameState {
            const target = 'op:srebrenica:obadi';
            const neighbors = [
                'op:srebrenica:srebrenica_2',
                'op:srebrenica:donji_potocari_2',
                'op:srebrenica:ljeskovik_2',
            ];
            const controllers = Object.fromEntries([
                [target, 'RS'],
                ...neighbors.map((neighbor) => [neighbor, 'RBiH']),
            ]);
            const state = makeBaseState({
                political: {
                    political_controllers: controllers,
                    municipalities: {
                        srebrenica: {
                            organizational_penetration: {
                                patriotska_liga: 90,
                                paramilitary_rs: 5,
                            },
                        },
                    },
                } as any,
            });
            if (rbihFlag) state.military.event_flags = { rbih_paramilitary_policy: rbihFlag };
            return state;
        }
        const obadiEdges = makeEdges([
            'op:srebrenica:srebrenica_2',
            'op:srebrenica:donji_potocari_2',
            'op:srebrenica:ljeskovik_2',
        ].map((neighbor) => [neighbor, 'op:srebrenica:obadi']));
        const obadiReverseMap = makeReverseMap([
            'op:srebrenica:obadi',
            'op:srebrenica:srebrenica_2',
            'op:srebrenica:donji_potocari_2',
            'op:srebrenica:ljeskovik_2',
        ]);

        it('still permits rear-pocket consolidation inside the defined enclave boundary under an explicit Always allow', () => {
            const state = obadiPocketState('always_allow');
            const report = detectParamilitaryTargets(
                state, obadiEdges, obadiReverseMap, EVENT_CATALOG,
            );

            expect(report.spawned.some((spawn) =>
                spawn.faction === 'RBiH' && spawn.target_osid === 'op:srebrenica:obadi',
            )).toBe(true);
        });

        it('the RBiH historical default (Refuse, from the card) sends no sweep into Obadi', () => {
            const state = obadiPocketState();
            const report = detectParamilitaryTargets(
                state, obadiEdges, obadiReverseMap, EVENT_CATALOG,
            );

            expect(report.spawned.filter((spawn) => spawn.faction === 'RBiH')).toEqual([]);
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

            const report = detectParamilitaryTargets(state, edges, reverseMap, undefined);
            expect(report.spawned).toHaveLength(0);
            expect(report.pending_player_requests).toBe(0);
        });

        it('creates pending requests for player faction', () => {
            // The eligible RS pocket is surfaced as a player request.
            const edges = makeEdges([['op:a', 'op:b'], ['op:a', 'op:c'], ['op:a', 'op:d'], ['op:b', 'op:d'], ['op:c', 'op:d']]);
            const reverseMap = makeReverseMap(['op:a', 'op:b', 'op:c', 'op:d']);
            const state = withAppliedPolicyCard(makeBaseState({
  meta: { turn: 5, phase: 'war', schema_version: 1, seed: 'test', player_faction: 'RS' } as GameState['meta'],
  political: {
    political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:c': 'RS', 'op:d': 'RBiH' },
  } as any,
}));

            const report = detectParamilitaryTargets(state, edges, reverseMap, undefined);

            // RS is player faction with 'ask' policy — pocket op:d becomes a pending request
            expect(report.spawned.filter(s => s.faction === 'RS')).toHaveLength(0);
            expect(report.pending_player_requests).toBe(1);
            expect(state.pending_paramilitary_requests).toHaveLength(1);
            expect(state.pending_paramilitary_requests![0].target_osid).toBe('op:d');
        });

        it('defers player requests until the paramilitary policy decision has applied (a receipt alone is not enough)', () => {
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

            const beforePolicy = detectParamilitaryTargets(state, edges, reverseMap, undefined);

            expect(beforePolicy.pending_player_requests).toBe(0);
            expect(state.pending_paramilitary_requests ?? []).toHaveLength(0);

            // §6 design T3: a receipt with the card unfired (an answer filed ahead) does not release.
            state.military.event_decision_log = [{ event_id: 'rs_paramilitary_policy_1992', response_id: 'ask' }] as any;
            const filedOnly = detectParamilitaryTargets(state, edges, reverseMap, undefined);
            expect(filedOnly.pending_player_requests).toBe(0);

            state.military.event_decision_log = [];
            withAppliedPolicyCard(state, 'ask');
            const afterPolicy = detectParamilitaryTargets(state, edges, reverseMap, undefined);

            expect(afterPolicy.pending_player_requests).toBe(1);
            expect(state.pending_paramilitary_requests).toHaveLength(1);
        });

        it('respects always_deny policy', () => {
            const edges = makeEdges([['op:a', 'op:b'], ['op:a', 'op:c'], ['op:a', 'op:d'], ['op:b', 'op:d'], ['op:c', 'op:d']]);
            const reverseMap = makeReverseMap(['op:a', 'op:b', 'op:c', 'op:d']);
            const state = withAppliedPolicyCard(makeBaseState({
  meta: { turn: 5, phase: 'war', schema_version: 1, seed: 'test', player_faction: 'RS' } as GameState['meta'],
  paramilitary_policy: 'always_deny',
  political: {
    political_controllers: { 'op:a': 'RS', 'op:b': 'RS', 'op:c': 'RS', 'op:d': 'RBiH' },
  } as any,
}));

            const report = detectParamilitaryTargets(state, edges, reverseMap, undefined);
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

            const report = detectParamilitaryTargets(state, edges, reverseMap, undefined);
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

            const report = detectParamilitaryTargets(state, edges, reverseMap, undefined);

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

            const report = detectParamilitaryTargets(state, edges, reverseMap, undefined);
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

            const report = detectParamilitaryTargets(state, edges, reverseMap, undefined);
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

            const report = detectParamilitaryTargets(state, edges, reverseMap, undefined);
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

            const report = detectParamilitaryTargets(state, edges, reverseMap, undefined);

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

            const report = detectParamilitaryTargets(state, edges, reverseMap, undefined);
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

            const rsTargets = detectParamilitaryTargets(state, edges, reverseMap, undefined).spawned
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

            const rsTargets = detectParamilitaryTargets(state, edges, reverseMap, undefined).spawned
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

            const rsTargets = detectParamilitaryTargets(state, edges, reverseMap, undefined).spawned
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
            const state = withAppliedPolicyCard(makeBaseState({
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
            }));

            const first = detectParamilitaryTargets(state, edges, reverseMap, undefined);
            const second = detectParamilitaryTargets(state, edges, reverseMap, undefined);

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

            const report = detectParamilitaryTargets(state, edges, reverseMap, undefined);

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
            withAppliedPolicyCard(state, 'ask');

            const report = detectParamilitaryTargets(state, edges, reverseMap, undefined);

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

            const report = detectParamilitaryTargets(state, edges, reverseMap, undefined);

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
            const state = withAppliedPolicyCard(makeBaseState({
                paramilitary_policy: 'always_deny',
                meta: { turn: 5, player_faction: 'RS', phase: 'war', seed: 1 } as any,
                pending_paramilitary_requests: [
                    { target_osid: 'D', faction: 'RS', strength: 150 },
                ],
            }));

            detectParamilitaryTargets(state, [], new Map(), undefined);

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
            const state = withAppliedPolicyCard(makeBaseState({
                paramilitary_policy: 'always_deny',
                meta: { turn: 99, player_faction: 'RS', phase: 'war', seed: 1 } as any,
                pending_paramilitary_requests: [
                    { target_osid: 'late-pocket', faction: 'RS', strength: 150 },
                ],
            }));

            detectParamilitaryTargets(state, [], new Map(), undefined);

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
    // Offensive paramilitary read side (v0.6.5). The detector was never called by a turn
    // phase and was retired in §6 D1 stage 2 with its detector tests; an old save's
    // offensive paramilitary still advances and resolves, so these stay.
    // ═══════════════════════════════════════════════════════════════════════

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
});
