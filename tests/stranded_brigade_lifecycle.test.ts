/**
 * Tests for stranded_brigade_lifecycle.ts — isolated brigade state machine.
 *
 * Deterministic: same input -> same output. No randomness.
 * Unit-level: minimal GameState fixtures, no scenario runner.
 */

import { describe, it, expect } from 'vitest';
import {
    updateStrandedBrigadeLifecycle,
    STRANDED_COHESION_DECAY,
    STRANDED_MORALE_DECAY,
    STRANDED_COLLAPSE_COHESION,
    STRANDED_MAX_HOLD_TURNS,
} from '../src/sim/combat/stranded_brigade_lifecycle.js';
import type { GameState, FormationState, CorpsFrontSector, CorpsCommandState } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeBrigade(id: string, faction: string, corpsId: string, locationOsid: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id,
        faction,
        name: `Brigade ${id}`,
        created_turn: 0,
        status: 'active',
        assignment: null,
        kind: 'brigade',
        personnel: 1500,
        cohesion: 60,
        morale: 50,
        corps_id: corpsId,
        location_osid: locationOsid,
        ...overrides,
    } as FormationState;
}

function makeSector(corpsId: string, faction: string, territoryOsids: string[]): CorpsFrontSector {
    return {
        sector_id: `sector:${corpsId}`,
        corps_id: corpsId,
        faction,
        opposing_factions: [],
        edge_ids: [],
        sub_segments: [],
        length_edges: 1,
        territory_osids: territoryOsids,
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 0,
        threat_ratio: 0,
        defensive_power: 0,
        sector_stance: 'defend',
        stance_source: 'bot',
    } as CorpsFrontSector;
}

function makeCorpsCommand(activeOps: { participating_brigades: string[] }[] = []): CorpsCommandState {
    return {
        command_span: 5,
        subordinate_count: 3,
        og_slots: 1,
        active_ogs: [],
        corps_exhaustion: 0,
        stance: 'defensive',
        active_operations: activeOps.map((op, i) => ({
            name: `op_${i}`,
            type: 'sector_attack' as const,
            phase: 'execution' as const,
            started_turn: 0,
            phase_started_turn: 0,
            participating_brigades: op.participating_brigades,
        })),
    } as CorpsCommandState;
}

/**
 * Build adjacency: a chain of connected OSIDs.
 * osids[0] -- osids[1] -- ... -- osids[N-1]
 */
function chainAdj(osids: string[]): Map<Osid, Osid[]> {
    const adj = new Map<Osid, Osid[]>();
    for (let i = 0; i < osids.length; i++) {
        const neighbors: Osid[] = [];
        if (i > 0) neighbors.push(osids[i - 1] as Osid);
        if (i < osids.length - 1) neighbors.push(osids[i + 1] as Osid);
        adj.set(osids[i] as Osid, neighbors);
    }
    return adj;
}

/** Build adjacency with an explicit disconnected node (no edges to it). */
function disconnectedAdj(connected: string[], disconnected: string[]): Map<Osid, Osid[]> {
    const adj = chainAdj(connected);
    for (const osid of disconnected) {
        adj.set(osid as Osid, []);
    }
    return adj;
}

function makeState(overrides: {
    formations?: Record<string, FormationState>;
    political_controllers?: Record<string, string | null>;
    corps_front_sectors?: Record<string, CorpsFrontSector>;
    corps_command?: Record<string, CorpsCommandState>;
    turn?: number;
} = {}): GameState {
    return {
        meta: {
            turn: overrides.turn ?? 10,
            phase: 'war',
            player_faction: null,
        },
        military: {
            formations: overrides.formations ?? {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_front_sectors: overrides.corps_front_sectors ?? {},
            corps_command: overrides.corps_command ?? {},
        },
        factions: [],
        political: {
            political_controllers: overrides.political_controllers ?? {},
        },
    } as unknown as GameState;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('stranded_brigade_lifecycle', () => {

    describe('newly stranded detection', () => {
        it('classifies an unreachable brigade as holding', () => {
            // Layout: sector at o1, brigade at o3, enemy at o2 blocks path
            const formations = {
                brig_1: makeBrigade('brig_1', 'RBiH', 'corps_5', 'op:mun:o3'),
            };
            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:o1']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:o1': 'RBiH',
                'op:mun:o2': 'RS', // Enemy blocks path
                'op:mun:o3': 'RBiH',
            };
            const adj = chainAdj(['op:mun:o1', 'op:mun:o2', 'op:mun:o3']);
            const state = makeState({ formations, corps_front_sectors: sectors, political_controllers: controllers, turn: 5 });

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.newly_stranded).toEqual(['brig_1']);
            expect(formations.brig_1.stranded_status).toBe('holding');
            expect(formations.brig_1.stranded_since_turn).toBe(5);
        });

        it('does NOT classify a reachable brigade as stranded', () => {
            // Layout: sector at o1, brigade at o2, all friendly
            const formations = {
                brig_1: makeBrigade('brig_1', 'RBiH', 'corps_5', 'op:mun:o2'),
            };
            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:o1']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:o1': 'RBiH',
                'op:mun:o2': 'RBiH',
            };
            const adj = chainAdj(['op:mun:o1', 'op:mun:o2']);
            const state = makeState({ formations, corps_front_sectors: sectors, political_controllers: controllers });

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.newly_stranded).toEqual([]);
            expect(report.updated).toBe(0);
        });
    });

    describe('degradation while holding', () => {
        it('reduces cohesion and morale each turn while stranded', () => {
            const formations = {
                brig_1: makeBrigade('brig_1', 'RBiH', 'corps_5', 'op:mun:o3', {
                    stranded_status: 'holding',
                    stranded_since_turn: 5,
                    cohesion: 60,
                    morale: 50,
                }),
            };
            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:o1']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:o1': 'RBiH',
                'op:mun:o2': 'RS',
                'op:mun:o3': 'RBiH',
            };
            const adj = chainAdj(['op:mun:o1', 'op:mun:o2', 'op:mun:o3']);
            const state = makeState({ formations, corps_front_sectors: sectors, political_controllers: controllers, turn: 8 });

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.still_holding).toEqual(['brig_1']);
            expect(formations.brig_1.cohesion).toBe(60 - STRANDED_COHESION_DECAY);
            expect(formations.brig_1.morale).toBe(50 - STRANDED_MORALE_DECAY);
        });
    });

    describe('reconnection', () => {
        it('transitions holding -> reconnected when path restored', () => {
            const formations = {
                brig_1: makeBrigade('brig_1', 'RBiH', 'corps_5', 'op:mun:o3', {
                    stranded_status: 'holding',
                    stranded_since_turn: 5,
                }),
            };
            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:o1']),
            };
            // All friendly now — path is open
            const controllers: Record<string, string | null> = {
                'op:mun:o1': 'RBiH',
                'op:mun:o2': 'RBiH',
                'op:mun:o3': 'RBiH',
            };
            const adj = chainAdj(['op:mun:o1', 'op:mun:o2', 'op:mun:o3']);
            const state = makeState({ formations, corps_front_sectors: sectors, political_controllers: controllers, turn: 10 });

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.reconnected).toEqual(['brig_1']);
            expect(formations.brig_1.stranded_status).toBe('reconnected');
        });

        it('clears reconnected status to none on next turn', () => {
            const formations = {
                brig_1: makeBrigade('brig_1', 'RBiH', 'corps_5', 'op:mun:o2', {
                    stranded_status: 'reconnected',
                    stranded_since_turn: 5,
                }),
            };
            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:o1']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:o1': 'RBiH',
                'op:mun:o2': 'RBiH',
            };
            const adj = chainAdj(['op:mun:o1', 'op:mun:o2']);
            const state = makeState({ formations, corps_front_sectors: sectors, political_controllers: controllers, turn: 11 });

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(formations.brig_1.stranded_status).toBe('none');
            expect(formations.brig_1.stranded_since_turn).toBeUndefined();
        });
    });

    describe('collapse from low cohesion', () => {
        it('collapses when cohesion drops to threshold', () => {
            const formations = {
                brig_1: makeBrigade('brig_1', 'RBiH', 'corps_5', 'op:mun:o3', {
                    stranded_status: 'holding',
                    stranded_since_turn: 5,
                    cohesion: STRANDED_COLLAPSE_COHESION + STRANDED_COHESION_DECAY, // Will hit threshold after decay
                    morale: 50,
                    personnel: 800,
                }),
            };
            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:o1']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:o1': 'RBiH',
                'op:mun:o2': 'RS',
                'op:mun:o3': 'RBiH',
            };
            const adj = chainAdj(['op:mun:o1', 'op:mun:o2', 'op:mun:o3']);
            const state = makeState({ formations, corps_front_sectors: sectors, political_controllers: controllers, turn: 8 });

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.collapsed).toEqual(['brig_1']);
            expect(formations.brig_1.stranded_status).toBe('collapsed');
            expect(formations.brig_1.lifecycle_status).toBe('destroyed');
            expect(formations.brig_1.status).toBe('inactive');
            expect(formations.brig_1.personnel).toBe(0);
        });
    });

    describe('collapse from max hold turns', () => {
        it('collapses after 12+ turns stranded', () => {
            const strandedSince = 5;
            const currentTurn = strandedSince + STRANDED_MAX_HOLD_TURNS;
            const formations = {
                brig_1: makeBrigade('brig_1', 'RBiH', 'corps_5', 'op:mun:o3', {
                    stranded_status: 'holding',
                    stranded_since_turn: strandedSince,
                    cohesion: 80, // High cohesion — collapse from time, not cohesion
                    morale: 70,
                    personnel: 1000,
                }),
            };
            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:o1']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:o1': 'RBiH',
                'op:mun:o2': 'RS',
                'op:mun:o3': 'RBiH',
            };
            const adj = chainAdj(['op:mun:o1', 'op:mun:o2', 'op:mun:o3']);
            const state = makeState({ formations, corps_front_sectors: sectors, political_controllers: controllers, turn: currentTurn });

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.collapsed).toEqual(['brig_1']);
            expect(formations.brig_1.stranded_status).toBe('collapsed');
            expect(formations.brig_1.lifecycle_status).toBe('destroyed');
        });
    });

    describe('exclusions', () => {
        it('excludes enclave brigades from stranded classification', () => {
            const formations = {
                brig_enc: makeBrigade('brig_enc', 'RBiH', 'corps_5', 'op:mun:o3', {
                    tags: ['enclave'],
                }),
            };
            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:o1']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:o1': 'RBiH',
                'op:mun:o2': 'RS',
                'op:mun:o3': 'RBiH',
            };
            const adj = chainAdj(['op:mun:o1', 'op:mun:o2', 'op:mun:o3']);
            const state = makeState({ formations, corps_front_sectors: sectors, political_controllers: controllers });

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.newly_stranded).toEqual([]);
            expect(report.updated).toBe(0);
        });

        it('excludes brigades in active operations', () => {
            const formations = {
                brig_op: makeBrigade('brig_op', 'RBiH', 'corps_5', 'op:mun:o3'),
            };
            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:o1']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:o1': 'RBiH',
                'op:mun:o2': 'RS',
                'op:mun:o3': 'RBiH',
            };
            const corps_command = {
                corps_5: makeCorpsCommand([{ participating_brigades: ['brig_op'] }]),
            };
            const adj = chainAdj(['op:mun:o1', 'op:mun:o2', 'op:mun:o3']);
            const state = makeState({ formations, corps_front_sectors: sectors, political_controllers: controllers, corps_command });

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.newly_stranded).toEqual([]);
            expect(report.updated).toBe(0);
        });

        it('excludes inactive brigades', () => {
            const formations = {
                brig_dead: makeBrigade('brig_dead', 'RBiH', 'corps_5', 'op:mun:o3', {
                    status: 'inactive',
                    lifecycle_status: 'destroyed',
                }),
            };
            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:o1']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:o1': 'RBiH',
                'op:mun:o2': 'RS',
                'op:mun:o3': 'RBiH',
            };
            const adj = chainAdj(['op:mun:o1', 'op:mun:o2', 'op:mun:o3']);
            const state = makeState({ formations, corps_front_sectors: sectors, political_controllers: controllers });

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.newly_stranded).toEqual([]);
            expect(report.updated).toBe(0);
        });
    });

    describe('determinism', () => {
        it('produces identical output for identical input', () => {
            const makeTestState = () => {
                const formations = {
                    brig_a: makeBrigade('brig_a', 'RBiH', 'corps_5', 'op:mun:o3'),
                    brig_b: makeBrigade('brig_b', 'RBiH', 'corps_5', 'op:mun:o4'),
                };
                const sectors = {
                    'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:o1']),
                };
                const controllers: Record<string, string | null> = {
                    'op:mun:o1': 'RBiH',
                    'op:mun:o2': 'RS',
                    'op:mun:o3': 'RBiH',
                    'op:mun:o4': 'RBiH',
                };
                return makeState({ formations, corps_front_sectors: sectors, political_controllers: controllers, turn: 5 });
            };

            const adj = disconnectedAdj(['op:mun:o1', 'op:mun:o2'], ['op:mun:o3', 'op:mun:o4']);

            const report1 = updateStrandedBrigadeLifecycle(makeTestState(), adj);
            const report2 = updateStrandedBrigadeLifecycle(makeTestState(), adj);

            expect(report1).toEqual(report2);
        });

        it('processes brigades in sorted formation ID order', () => {
            // Insert in reverse order to verify sorting
            const formations: Record<string, FormationState> = {};
            formations['brig_z'] = makeBrigade('brig_z', 'RBiH', 'corps_5', 'op:mun:o3');
            formations['brig_a'] = makeBrigade('brig_a', 'RBiH', 'corps_5', 'op:mun:o4');
            formations['brig_m'] = makeBrigade('brig_m', 'RBiH', 'corps_5', 'op:mun:o5');

            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:o1']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:o1': 'RBiH',
                'op:mun:o2': 'RS',
                'op:mun:o3': 'RBiH',
                'op:mun:o4': 'RBiH',
                'op:mun:o5': 'RBiH',
            };
            const adj = disconnectedAdj(['op:mun:o1', 'op:mun:o2'], ['op:mun:o3', 'op:mun:o4', 'op:mun:o5']);
            const state = makeState({ formations, corps_front_sectors: sectors, political_controllers: controllers, turn: 5 });

            const report = updateStrandedBrigadeLifecycle(state, adj);

            // Sorted order: brig_a, brig_m, brig_z
            expect(report.newly_stranded).toEqual(['brig_a', 'brig_m', 'brig_z']);
        });
    });

    describe('brigade on sector territory is not stranded', () => {
        it('brigade located on a same-corps sector territory OSID is reachable', () => {
            const formations = {
                brig_1: makeBrigade('brig_1', 'RBiH', 'corps_5', 'op:mun:o1'),
            };
            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:o1', 'op:mun:o2']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:o1': 'RBiH',
                'op:mun:o2': 'RBiH',
            };
            const adj = chainAdj(['op:mun:o1', 'op:mun:o2']);
            const state = makeState({ formations, corps_front_sectors: sectors, political_controllers: controllers });

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.newly_stranded).toEqual([]);
            expect(report.updated).toBe(0);
        });
    });

    describe('corps with no sectors', () => {
        it('does not classify brigade as stranded if corps has no sectors', () => {
            // Corps has no sectors — entire corps is in reserve/rear
            const formations = {
                brig_1: makeBrigade('brig_1', 'RBiH', 'corps_5', 'op:mun:o1'),
            };
            // No sectors for corps_5
            const sectors = {
                'sector:corps_other': makeSector('corps_other', 'RBiH', ['op:mun:o2']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:o1': 'RBiH',
                'op:mun:o2': 'RBiH',
            };
            const adj = chainAdj(['op:mun:o1', 'op:mun:o2']);
            const state = makeState({ formations, corps_front_sectors: sectors, political_controllers: controllers });

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.newly_stranded).toEqual([]);
            expect(report.updated).toBe(0);
        });
    });
});
