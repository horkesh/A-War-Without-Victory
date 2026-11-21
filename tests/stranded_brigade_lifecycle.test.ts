/**
 * Tests for stranded_brigade_lifecycle.ts — isolated brigade state machine.
 *
 * Deterministic: same input -> same output. No randomness.
 * Unit-level: minimal GameState fixtures, no scenario runner.
 */

import { describe, it, expect } from 'vitest';
import {
    classifyReleasedOperationParticipants,
    updateStrandedBrigadeLifecycle,
    STRANDED_COHESION_DECAY,
    STRANDED_MORALE_DECAY,
} from '../src/sim/combat/stranded_brigade_lifecycle.js';
import { dissolveCombatIneffectiveBrigades } from '../src/sim/combat/brigade_dissolution.js';
import type { GameState, FormationState, CorpsFrontSector, CorpsCommandState } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

const PREVIOUS_STRANDED_COLLAPSE_COHESION = 10;
const PREVIOUS_STRANDED_MAX_HOLD_TURNS = 12;

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

function makeCorpsCommand(activeOps: { participating_brigades?: string[]; axes?: { assigned_brigades: string[] }[] }[] = []): CorpsCommandState {
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
            participating_brigades: op.participating_brigades ?? [],
            axes: op.axes,
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
    last_supply_state_by_osid?: Record<string, string>;
    displacement_origin_dest_arrivals?: Record<string, Record<string, number>>;
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
            last_supply_state_by_osid: overrides.last_supply_state_by_osid,
        },
        ...(overrides.displacement_origin_dest_arrivals
            ? { displacement: { displacement_origin_dest_arrivals: overrides.displacement_origin_dest_arrivals } }
            : {}),
    } as unknown as GameState;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('stranded_brigade_lifecycle', () => {

    describe('newly stranded detection', () => {
        it('orders a critical brigade through allied territory without teleporting it', () => {
            const formations = {
                brig_1: makeBrigade('brig_1', 'RBiH', 'corps_5', 'pocket'),
            };
            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['rear']),
            };
            const controllers: Record<string, string | null> = {
                pocket: 'RBiH', corridor: 'HRHB', rear: 'RBiH',
            };
            const state = makeState({
                formations,
                corps_front_sectors: sectors,
                political_controllers: controllers,
                last_supply_state_by_osid: { pocket: 'critical', corridor: 'adequate', rear: 'adequate' },
                turn: 5,
            });
            state.political.war_alliance_rbih_hrhb = 0.75;

            const report = updateStrandedBrigadeLifecycle(state, chainAdj(['pocket', 'corridor', 'rear']));

            expect(report.orderly_withdrawal_orders).toEqual(['brig_1']);
            expect(formations.brig_1.location_osid).toBe('pocket');
            expect(formations.brig_1.personnel).toBe(1500);
            expect(formations.brig_1.stranded_status).toBe('holding');
            expect(state.military.brigade_movement_orders?.brig_1).toEqual({
                destination_sids: ['rear'],
                stance: 'column',
            });
            expect(state.military.brigade_movement_state?.brig_1).toBeUndefined();
        });

        it('does not withdraw a brigade reserved by a queued historical operation', () => {
            const brigadeId = 'rs_22nd_krajina_infantry';
            const corpsId = 'vrs_1st_krajina';
            const formations = {
                [brigadeId]: makeBrigade(brigadeId, 'RS', corpsId, 'pocket'),
            };
            const command = makeCorpsCommand();
            command.queued_operations = ['Operation Donji Vakuf'];
            const state = makeState({
                formations,
                corps_front_sectors: {
                    [`sector:${corpsId}`]: makeSector(corpsId, 'RS', ['rear']),
                },
                corps_command: { [corpsId]: command },
                political_controllers: { pocket: 'RS', corridor: 'RS', rear: 'RS' },
                last_supply_state_by_osid: { pocket: 'critical', corridor: 'adequate', rear: 'adequate' },
                turn: 20,
            });

            const report = updateStrandedBrigadeLifecycle(state, chainAdj(['pocket', 'corridor', 'rear']));

            expect(report.orderly_withdrawal_orders).toEqual([]);
            expect(state.military.brigade_movement_orders?.[brigadeId]).toBeUndefined();
            expect(formations[brigadeId].location_osid).toBe('pocket');
        });

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

    describe('allied reachability through canonical movement predicate', () => {
        it('reconnects a noncritical brigade through an allied bridge and clears next tick', () => {
            const formations = {
                brig_1: makeBrigade('brig_1', 'RBiH', 'corps_5', 'op:mun:start', {
                    stranded_status: 'holding',
                    stranded_since_turn: 5,
                }),
            };
            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:front']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:start': 'RBiH',
                'op:mun:bridge': 'HRHB',
                'op:mun:front': 'RBiH',
            };
            const adj = chainAdj(['op:mun:start', 'op:mun:bridge', 'op:mun:front']);
            const state = makeState({
                formations,
                corps_front_sectors: sectors,
                political_controllers: controllers,
                last_supply_state_by_osid: {
                    'op:mun:start': 'adequate',
                    'op:mun:bridge': 'adequate',
                    'op:mun:front': 'adequate',
                },
                turn: 10,
            });
            state.political.war_alliance_rbih_hrhb = 0.75;

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.reconnected).toEqual(['brig_1']);
            expect(formations.brig_1.stranded_status).toBe('reconnected');
            expect(formations.brig_1.location_osid).toBe('op:mun:start');

            const nextReport = updateStrandedBrigadeLifecycle(state, adj);

            expect(nextReport.reconnected).toEqual([]);
            expect(formations.brig_1.stranded_status).toBe('none');
            expect(formations.brig_1.stranded_since_turn).toBeUndefined();
        });

        it('keeps a noncritical brigade holding when the bridge is not allied', () => {
            const formations = {
                brig_1: makeBrigade('brig_1', 'RBiH', 'corps_5', 'op:mun:start', {
                    stranded_status: 'holding',
                    stranded_since_turn: 5,
                }),
            };
            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:front']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:start': 'RBiH',
                'op:mun:bridge': 'HRHB',
                'op:mun:front': 'RBiH',
            };
            const adj = chainAdj(['op:mun:start', 'op:mun:bridge', 'op:mun:front']);
            const state = makeState({
                formations,
                corps_front_sectors: sectors,
                political_controllers: controllers,
                last_supply_state_by_osid: {
                    'op:mun:start': 'adequate',
                    'op:mun:bridge': 'adequate',
                    'op:mun:front': 'adequate',
                },
                turn: 10,
            });
            state.political.war_alliance_rbih_hrhb = 0;

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.reconnected).toEqual([]);
            expect(formations.brig_1.stranded_status).toBe('holding');
            expect(formations.brig_1.location_osid).toBe('op:mun:start');
        });

        it('keeps a critical origin holding even with a legal allied route to a same-corps sector', () => {
            const formations = {
                brig_1: makeBrigade('brig_1', 'RBiH', 'corps_5', 'op:mun:pocket'),
            };
            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:front']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:pocket': 'RBiH',
                'op:mun:bridge': 'HRHB',
                'op:mun:front': 'RBiH',
            };
            const adj = chainAdj(['op:mun:pocket', 'op:mun:bridge', 'op:mun:front']);
            const state = makeState({
                formations,
                corps_front_sectors: sectors,
                political_controllers: controllers,
                last_supply_state_by_osid: {
                    'op:mun:pocket': 'critical',
                    'op:mun:bridge': 'adequate',
                    'op:mun:front': 'adequate',
                },
                turn: 5,
            });
            state.political.war_alliance_rbih_hrhb = 0.75;

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.newly_stranded).toEqual(['brig_1']);
            expect(formations.brig_1.stranded_status).toBe('holding');
            expect(formations.brig_1.location_osid).toBe('op:mun:pocket');
        });
    });

    describe('canonical dissolution ownership', () => {
        it('keeps Travnik Brigade active when stranded decay meets only the cohesion criterion', () => {
            const formations = {
                hrhb_travnik_brigade: makeBrigade('hrhb_travnik_brigade', 'HRHB', 'hvo_central_bosnia', 'op:mun:o3', {
                    stranded_status: 'holding',
                    stranded_since_turn: 5,
                    cohesion: PREVIOUS_STRANDED_COLLAPSE_COHESION + STRANDED_COHESION_DECAY,
                    morale: 50,
                    personnel: 700,
                    readiness: 'active',
                    lifecycle_status: 'active',
                }),
            };
            const sectors = {
                'sector:hvo_central_bosnia': makeSector('hvo_central_bosnia', 'HRHB', ['op:mun:o1']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:o1': 'HRHB',
                'op:mun:o2': 'RS',
                'op:mun:o3': 'HRHB',
            };
            const adj = chainAdj(['op:mun:o1', 'op:mun:o2', 'op:mun:o3']);
            const state = makeState({ formations, corps_front_sectors: sectors, political_controllers: controllers, turn: 8 });

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.collapsed).toEqual([]);
            expect(report.still_holding).toEqual(['hrhb_travnik_brigade']);
            expect(formations.hrhb_travnik_brigade.stranded_status).toBe('holding');
            expect(formations.hrhb_travnik_brigade.lifecycle_status).toBe('active');
            expect(formations.hrhb_travnik_brigade.status).toBe('active');
            expect(formations.hrhb_travnik_brigade.personnel).toBe(700);
        });

        it('defers destruction to canonical dissolution after stranded decay meets two criteria', () => {
            const formations = {
                hrhb_travnik_brigade: makeBrigade('hrhb_travnik_brigade', 'HRHB', 'hvo_central_bosnia', 'op:mun:o3', {
                    stranded_status: 'holding',
                    stranded_since_turn: 5,
                    cohesion: PREVIOUS_STRANDED_COLLAPSE_COHESION + STRANDED_COHESION_DECAY,
                    morale: 15 + STRANDED_MORALE_DECAY,
                    personnel: 700,
                    readiness: 'active',
                    lifecycle_status: 'active',
                }),
            };
            const sectors = {
                'sector:hvo_central_bosnia': makeSector('hvo_central_bosnia', 'HRHB', ['op:mun:o1']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:o1': 'HRHB',
                'op:mun:o2': 'RS',
                'op:mun:o3': 'HRHB',
            };
            const adj = chainAdj(['op:mun:o1', 'op:mun:o2', 'op:mun:o3']);
            const state = makeState({ formations, corps_front_sectors: sectors, political_controllers: controllers, turn: 8 });

            const strandedReport = updateStrandedBrigadeLifecycle(state, adj);

            expect(strandedReport.collapsed).toEqual([]);
            expect(formations.hrhb_travnik_brigade.status).toBe('active');

            const dissolutionReport = dissolveCombatIneffectiveBrigades(state);

            expect(dissolutionReport.dissolved_brigades.map(row => row.id)).toEqual(['hrhb_travnik_brigade']);
            expect(formations.hrhb_travnik_brigade.status).toBe('inactive');
            expect(formations.hrhb_travnik_brigade.lifecycle_status).toBe('destroyed');
            expect(formations.hrhb_travnik_brigade.readiness).toBe('degraded');
        });

        it('does not destroy a high-readiness brigade based only on elapsed stranded time', () => {
            const strandedSince = 5;
            const formations = {
                hrhb_travnik_brigade: makeBrigade('hrhb_travnik_brigade', 'HRHB', 'hvo_central_bosnia', 'op:mun:o3', {
                    stranded_status: 'holding',
                    stranded_since_turn: strandedSince,
                    cohesion: 80,
                    morale: 70,
                    personnel: 1000,
                    readiness: 'active',
                    lifecycle_status: 'active',
                }),
            };
            const sectors = {
                'sector:hvo_central_bosnia': makeSector('hvo_central_bosnia', 'HRHB', ['op:mun:o1']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:o1': 'HRHB',
                'op:mun:o2': 'RS',
                'op:mun:o3': 'HRHB',
            };
            const adj = chainAdj(['op:mun:o1', 'op:mun:o2', 'op:mun:o3']);
            const state = makeState({
                formations,
                corps_front_sectors: sectors,
                political_controllers: controllers,
                turn: strandedSince + PREVIOUS_STRANDED_MAX_HOLD_TURNS,
            });

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.collapsed).toEqual([]);
            expect(report.still_holding).toEqual(['hrhb_travnik_brigade']);
            expect(formations.hrhb_travnik_brigade.stranded_status).toBe('holding');
            expect(formations.hrhb_travnik_brigade.lifecycle_status).toBe('active');
            expect(formations.hrhb_travnik_brigade.status).toBe('active');
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

        it('excludes axis-assigned brigades in active operations', () => {
            const formations = {
                brig_axis: makeBrigade('brig_axis', 'RBiH', 'corps_5', 'op:mun:o3'),
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
                corps_5: makeCorpsCommand([{ axes: [{ assigned_brigades: ['brig_axis'] }] }]),
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

        it('classifies a fully isolated critical-supply sector cell as stranded', () => {
            const formations = {
                brig_1: makeBrigade('brig_1', 'RBiH', 'corps_5', 'op:mun:pocket'),
            };
            const sectors = {
                'sector:corps_5': makeSector('corps_5', 'RBiH', ['op:mun:pocket']),
            };
            const controllers: Record<string, string | null> = {
                'op:mun:pocket': 'RBiH',
                'op:mun:north': 'RS',
                'op:mun:south': 'RS',
            };
            const adj = new Map<Osid, Osid[]>([
                ['op:mun:pocket' as Osid, ['op:mun:north', 'op:mun:south'] as Osid[]],
                ['op:mun:north' as Osid, ['op:mun:pocket'] as Osid[]],
                ['op:mun:south' as Osid, ['op:mun:pocket'] as Osid[]],
            ]);
            const state = makeState({
                formations,
                corps_front_sectors: sectors,
                political_controllers: controllers,
                last_supply_state_by_osid: { 'op:mun:pocket': 'critical' },
                turn: 5,
            });

            const report = updateStrandedBrigadeLifecycle(state, adj);

            expect(report.newly_stranded).toEqual(['brig_1']);
            expect(formations.brig_1.stranded_status).toBe('holding');
        });
    });

    describe('garrisoned critical pockets (package P2-L)', () => {
        // pocket_a -- pocket_b form one cut-off critical pocket, ringed by RS.
        const adj = new Map<Osid, Osid[]>([
            ['op:mun:pocket_a' as Osid, ['op:mun:pocket_b', 'op:mun:north'] as Osid[]],
            ['op:mun:pocket_b' as Osid, ['op:mun:pocket_a', 'op:mun:south'] as Osid[]],
            ['op:mun:north' as Osid, ['op:mun:pocket_a'] as Osid[]],
            ['op:mun:south' as Osid, ['op:mun:pocket_b'] as Osid[]],
        ]);
        const controllers: Record<string, string | null> = {
            'op:mun:pocket_a': 'HRHB', 'op:mun:pocket_b': 'HRHB', 'op:mun:north': 'RBiH', 'op:mun:south': 'RBiH',
        };
        const supply = { 'op:mun:pocket_a': 'critical', 'op:mun:pocket_b': 'critical' };
        const sectorIn = (osid: string) => ({ 'sector:hvo_cb': makeSector('hvo_cb', 'HRHB', [osid]) });

        it('two brigades in a pocket holding their corps sector ground are a garrison, not stranded', () => {
            const formations = {
                b1: makeBrigade('b1', 'HRHB', 'hvo_cb', 'op:mun:pocket_a'),
                b2: makeBrigade('b2', 'HRHB', 'hvo_cb', 'op:mun:pocket_b'),
            };
            const state = makeState({ formations, corps_front_sectors: sectorIn('op:mun:pocket_b'), political_controllers: controllers, last_supply_state_by_osid: supply });
            const report = updateStrandedBrigadeLifecycle(state, adj);
            expect(report.newly_stranded).toEqual([]);
            expect(formations.b1.stranded_status).toBeUndefined();
            expect(formations.b1.cohesion).toBe(60);
        });

        it('a garrison already holding reconnects instead of decaying', () => {
            const formations = {
                b1: makeBrigade('b1', 'HRHB', 'hvo_cb', 'op:mun:pocket_a', { stranded_status: 'holding', stranded_since_turn: 3 }),
                b2: makeBrigade('b2', 'HRHB', 'hvo_cb', 'op:mun:pocket_b', { stranded_status: 'holding', stranded_since_turn: 3 }),
            };
            const state = makeState({ formations, corps_front_sectors: sectorIn('op:mun:pocket_a'), political_controllers: controllers, last_supply_state_by_osid: supply });
            const report = updateStrandedBrigadeLifecycle(state, adj);
            expect(report.reconnected).toEqual(['b1', 'b2']);
            expect(report.still_holding).toEqual([]);
            expect(formations.b1.cohesion).toBe(60);
        });

        it('a lone brigade in the pocket stays stranded', () => {
            const formations = { b1: makeBrigade('b1', 'HRHB', 'hvo_cb', 'op:mun:pocket_a') };
            const state = makeState({ formations, corps_front_sectors: sectorIn('op:mun:pocket_b'), political_controllers: controllers, last_supply_state_by_osid: supply });
            expect(updateStrandedBrigadeLifecycle(state, adj).newly_stranded).toEqual(['b1']);
        });

        it('two brigades in a pocket with none of their corps sector ground stay stranded', () => {
            const formations = {
                b1: makeBrigade('b1', 'HRHB', 'hvo_cb', 'op:mun:pocket_a'),
                b2: makeBrigade('b2', 'HRHB', 'hvo_cb', 'op:mun:pocket_b'),
            };
            const state = makeState({ formations, corps_front_sectors: sectorIn('op:mun:elsewhere'), political_controllers: controllers, last_supply_state_by_osid: supply });
            expect(updateStrandedBrigadeLifecycle(state, adj).newly_stranded).toEqual(['b1', 'b2']);
        });

        it('a brigade beyond a supplied own cell is not counted: the pocket is the critical component only', () => {
            const formations = {
                b1: makeBrigade('b1', 'HRHB', 'hvo_cb', 'op:mun:pocket_a'),
                b2: makeBrigade('b2', 'HRHB', 'hvo_cb', 'op:mun:pocket_b'),
            };
            const state = makeState({
                formations, corps_front_sectors: sectorIn('op:mun:pocket_a'), political_controllers: controllers,
                last_supply_state_by_osid: { 'op:mun:pocket_a': 'critical', 'op:mun:pocket_b': 'adequate' },
            });
            // b2 stands on a supplied cell and reaches its sector by friendly BFS, so it is not stranded.
            // b1 is alone in the critical component and stays stranded.
            expect(updateStrandedBrigadeLifecycle(state, adj).newly_stranded).toEqual(['b1']);
        });

        // P3 row (b), narrowed P2-L (seat ruling V3, 2026-11-21). Garrison status goes only to a
        // brigade that belongs to the pocket: enclave-tagged, home municipality (home_osid or
        // origin_mun) among the pocket's municipalities, or its people's displacement arrivals
        // landed in one. The >=2 garrison count is not narrowed: drifters still count.
        describe('drifted brigades stay eligible for stranding', () => {
            const GORAZDE = 'op:gorazde:gorazde_2';
            const IZBISNO = 'op:foca:izbisno';
            const HADZICI_HOME = 'op:hadzici:binjezevo';
            const gorazdeAdj = new Map<Osid, Osid[]>([
                [GORAZDE as Osid, [IZBISNO, 'op:gorazde:ustipraca_2'] as Osid[]],
                [IZBISNO as Osid, [GORAZDE, 'op:foca:donje_zesce'] as Osid[]],
                ['op:gorazde:ustipraca_2' as Osid, [GORAZDE] as Osid[]],
                ['op:foca:donje_zesce' as Osid, [IZBISNO] as Osid[]],
                [HADZICI_HOME as Osid, [] as Osid[]],
            ]);
            const gorazdeState = () => {
                const formations = {
                    arbih_102nd_motorized: makeBrigade('arbih_102nd_motorized', 'RBiH', 'arbih_1st_corps', IZBISNO, {
                        home_osid: HADZICI_HOME, origin_mun: 'hadzici', personnel: 100,
                    }),
                    arbih_801st_light: makeBrigade('arbih_801st_light', 'RBiH', 'arbih_1st_corps', GORAZDE, {
                        home_osid: GORAZDE, origin_mun: 'gorazde', tags: ['enclave'],
                    }),
                    arbih_831st_drina_lineage: makeBrigade('arbih_831st_drina_lineage', 'RBiH', 'arbih_1st_corps', GORAZDE, {
                        home_osid: GORAZDE, origin_mun: 'gorazde',
                    }),
                };
                const state = makeState({
                    formations,
                    corps_front_sectors: { 'sector:arbih_1st_corps': makeSector('arbih_1st_corps', 'RBiH', [GORAZDE, HADZICI_HOME]) },
                    political_controllers: {
                        [GORAZDE]: 'RBiH', [IZBISNO]: 'RBiH', [HADZICI_HOME]: 'RBiH',
                        'op:gorazde:ustipraca_2': 'RS', 'op:foca:donje_zesce': 'RS',
                    },
                    last_supply_state_by_osid: { [GORAZDE]: 'critical', [IZBISNO]: 'critical', [HADZICI_HOME]: 'adequate' },
                    // Hadžići's Bosniaks went to Sarajevo, not to the Goražde pocket.
                    displacement_origin_dest_arrivals: { 'hadzici|RBiH': { centar_sarajevo: 500 } },
                });
                return { state, formations };
            };

            it('the 102nd left in a Goražde pocket is stranded by the lifecycle; the 831st is not', () => {
                const { state, formations } = gorazdeState();
                const report = updateStrandedBrigadeLifecycle(state, gorazdeAdj);
                expect(report.newly_stranded).toEqual(['arbih_102nd_motorized']);
                expect(report.orderly_withdrawal_orders).toEqual([]);
                expect(formations.arbih_102nd_motorized.stranded_status).toBe('holding');
                expect(formations.arbih_831st_drina_lineage.stranded_status).toBeUndefined();
            });

            it('the 102nd released by an operation in a Goražde pocket is stranded at release; the 831st is not', () => {
                const { state, formations } = gorazdeState();
                const report = classifyReleasedOperationParticipants(
                    state, ['arbih_831st_drina_lineage', 'arbih_102nd_motorized'], gorazdeAdj,
                );
                expect(report.newly_stranded).toEqual(['arbih_102nd_motorized']);
                expect(formations.arbih_102nd_motorized.stranded_status).toBe('holding');
                expect(formations.arbih_831st_drina_lineage.stranded_status).toBeUndefined();
            });

            it('RS twin: the 16th Krajina in a Donji Vakuf pocket is stranded; the local 31st, counted with it, is not', () => {
                const KORENICI = 'op:donji_vakuf:korenici';
                const JEMANLICI = 'op:donji_vakuf:jemanlici';
                const BANJA_LUKA = 'op:banja_luka:banja_luka_2';
                const dvAdj = new Map<Osid, Osid[]>([
                    [KORENICI as Osid, [JEMANLICI, 'op:donji_vakuf:komar_2'] as Osid[]],
                    [JEMANLICI as Osid, [KORENICI] as Osid[]],
                    ['op:donji_vakuf:komar_2' as Osid, [KORENICI] as Osid[]],
                    [BANJA_LUKA as Osid, [] as Osid[]],
                ]);
                const formations = {
                    rs_16th_krajina_motorized: makeBrigade('rs_16th_krajina_motorized', 'RS', 'vrs_1st_krajina', JEMANLICI, {
                        home_osid: 'op:prijedor:prijedor_2', origin_mun: 'banja_luka',
                    }),
                    rs_31st_light_infantry: makeBrigade('rs_31st_light_infantry', 'RS', 'vrs_1st_krajina', KORENICI, {
                        home_osid: 'op:donji_vakuf:komar_2', origin_mun: 'donji_vakuf',
                    }),
                };
                const state = makeState({
                    formations,
                    corps_front_sectors: { 'sector:vrs_1st_krajina': makeSector('vrs_1st_krajina', 'RS', [KORENICI, BANJA_LUKA]) },
                    political_controllers: {
                        [KORENICI]: 'RS', [JEMANLICI]: 'RS', [BANJA_LUKA]: 'RS', 'op:donji_vakuf:komar_2': 'RBiH',
                    },
                    last_supply_state_by_osid: { [KORENICI]: 'critical', [JEMANLICI]: 'critical', [BANJA_LUKA]: 'adequate' },
                    displacement_origin_dest_arrivals: { 'prijedor|RS': { banja_luka: 300 } },
                });
                const report = updateStrandedBrigadeLifecycle(state, dvAdj);
                // The 31st is one of only two counters: it stays a garrison because the 16th still counts.
                expect(report.newly_stranded).toEqual(['rs_16th_krajina_motorized']);
                expect(formations.rs_31st_light_infantry.stranded_status).toBeUndefined();
            });
        });

        describe('named real garrisons still count', () => {
            it('Goražde: the 831st with only the tagged 808th (home cell lost) is a garrison', () => {
                const GORAZDE = 'op:gorazde:gorazde_2';
                const KOLOVARICE = 'op:gorazde:kolovarice';
                const adjG = new Map<Osid, Osid[]>([
                    [GORAZDE as Osid, [KOLOVARICE] as Osid[]],
                    [KOLOVARICE as Osid, [GORAZDE, 'op:gorazde:ustipraca_2'] as Osid[]],
                    ['op:gorazde:ustipraca_2' as Osid, [KOLOVARICE] as Osid[]],
                ]);
                const formations = {
                    arbih_808th_liberation: makeBrigade('arbih_808th_liberation', 'RBiH', 'arbih_1st_corps', KOLOVARICE, {
                        home_osid: 'op:gorazde:ustipraca_2', origin_mun: 'gorazde', tags: ['enclave'],
                    }),
                    arbih_831st_drina_lineage: makeBrigade('arbih_831st_drina_lineage', 'RBiH', 'arbih_1st_corps', GORAZDE, {
                        home_osid: GORAZDE, origin_mun: 'gorazde',
                    }),
                };
                const state = makeState({
                    formations,
                    corps_front_sectors: { 'sector:arbih_1st_corps': makeSector('arbih_1st_corps', 'RBiH', [GORAZDE]) },
                    political_controllers: { [GORAZDE]: 'RBiH', [KOLOVARICE]: 'RBiH', 'op:gorazde:ustipraca_2': 'RS' },
                    last_supply_state_by_osid: { [GORAZDE]: 'critical', [KOLOVARICE]: 'critical' },
                });
                expect(updateStrandedBrigadeLifecycle(state, adjG).newly_stranded).toEqual([]);
                expect(formations.arbih_831st_drina_lineage.stranded_status).toBeUndefined();
            });

            describe('Srebrenica: 1st Cerska and 1st Kamenica belong through Vlasenica arrivals', () => {
                const SREBRENICA = 'op:srebrenica:srebrenica_2';
                const POTOCARI = 'op:srebrenica:potocari';
                const CERSKA = 'op:vlasenica:cerska_2';
                const TUZLA = 'op:tuzla:tuzla_2';
                const adjS = new Map<Osid, Osid[]>([
                    [SREBRENICA as Osid, [POTOCARI, CERSKA] as Osid[]],
                    [POTOCARI as Osid, [SREBRENICA] as Osid[]],
                    [CERSKA as Osid, [SREBRENICA] as Osid[]],
                    [TUZLA as Osid, [] as Osid[]],
                ]);
                const srebrenicaState = (arrivals: Record<string, Record<string, number>>) => {
                    const formations = {
                        arbih_1st_cerska: makeBrigade('arbih_1st_cerska', 'RBiH', 'arbih_2nd_corps', SREBRENICA, {
                            home_osid: CERSKA, origin_mun: 'vlasenica',
                        }),
                        arbih_1st_kamenica: makeBrigade('arbih_1st_kamenica', 'RBiH', 'arbih_2nd_corps', POTOCARI, {
                            home_osid: CERSKA,
                        }),
                    };
                    const state = makeState({
                        formations,
                        corps_front_sectors: { 'sector:arbih_2nd_corps': makeSector('arbih_2nd_corps', 'RBiH', [SREBRENICA, TUZLA]) },
                        political_controllers: { [SREBRENICA]: 'RBiH', [POTOCARI]: 'RBiH', [TUZLA]: 'RBiH', [CERSKA]: 'RS' },
                        last_supply_state_by_osid: { [SREBRENICA]: 'critical', [POTOCARI]: 'critical', [TUZLA]: 'adequate' },
                        displacement_origin_dest_arrivals: arrivals,
                    });
                    return { state, formations };
                };

                it('both are kept while Vlasenica Bosniaks arrived in Srebrenica', () => {
                    const { state, formations } = srebrenicaState({ 'vlasenica|RBiH': { srebrenica: 4000, tuzla: 9000 } });
                    expect(updateStrandedBrigadeLifecycle(state, adjS).newly_stranded).toEqual([]);
                    expect(formations.arbih_1st_cerska.stranded_status).toBeUndefined();
                    expect(formations.arbih_1st_kamenica.stranded_status).toBeUndefined();
                });

                it('control: without Vlasenica Bosniak arrivals in Srebrenica both become holding', () => {
                    // Arrivals elsewhere, or of another people, do not tie the brigades to the pocket.
                    const { state, formations } = srebrenicaState({
                        'vlasenica|RBiH': { tuzla: 9000 },
                        'vlasenica|RS': { srebrenica: 100 },
                    });
                    expect(updateStrandedBrigadeLifecycle(state, adjS).newly_stranded).toEqual(['arbih_1st_cerska', 'arbih_1st_kamenica']);
                    expect(formations.arbih_1st_cerska.stranded_status).toBe('holding');
                    expect(formations.arbih_1st_kamenica.stranded_status).toBe('holding');
                });
            });

            it('Ozren: 1st Ozren is kept because 1st Trebava and 4th Ozren count; both of them are holding', () => {
                const PETROVO = 'op:gracanica:petrovo_2';
                const JABLANICA = 'op:maglaj:jablanica';
                const BANJA_LUKA = 'op:banja_luka:banja_luka_2';
                const adjO = new Map<Osid, Osid[]>([
                    [PETROVO as Osid, [JABLANICA, 'op:zavidovici:vozuca_2'] as Osid[]],
                    [JABLANICA as Osid, [PETROVO] as Osid[]],
                    ['op:zavidovici:vozuca_2' as Osid, [PETROVO] as Osid[]],
                    [BANJA_LUKA as Osid, [] as Osid[]],
                ]);
                const formations = {
                    rs_1st_ozren_light_infantry: makeBrigade('rs_1st_ozren_light_infantry', 'RS', 'vrs_1st_krajina', PETROVO, {
                        home_osid: PETROVO, origin_mun: 'gracanica',
                    }),
                    rs_1st_trebava_infantry: makeBrigade('rs_1st_trebava_infantry', 'RS', 'vrs_1st_krajina', JABLANICA, {
                        home_osid: 'op:modrica:skugric_gornji_2', origin_mun: 'modrica', personnel: 152,
                    }),
                    rs_4th_ozren_light_infantry: makeBrigade('rs_4th_ozren_light_infantry', 'RS', 'vrs_1st_krajina', PETROVO, {
                        home_osid: 'op:zavidovici:vozuca_2', origin_mun: 'zavidovici', personnel: 100,
                    }),
                };
                const state = makeState({
                    formations,
                    corps_front_sectors: { 'sector:vrs_1st_krajina': makeSector('vrs_1st_krajina', 'RS', [PETROVO, BANJA_LUKA]) },
                    political_controllers: {
                        [PETROVO]: 'RS', [JABLANICA]: 'RS', [BANJA_LUKA]: 'RS', 'op:zavidovici:vozuca_2': 'RBiH',
                    },
                    last_supply_state_by_osid: { [PETROVO]: 'critical', [JABLANICA]: 'critical', [BANJA_LUKA]: 'adequate' },
                });
                const report = updateStrandedBrigadeLifecycle(state, adjO);
                expect(report.newly_stranded).toEqual(['rs_1st_trebava_infantry', 'rs_4th_ozren_light_infantry']);
                expect(formations.rs_1st_ozren_light_infantry.stranded_status).toBeUndefined();
            });
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
