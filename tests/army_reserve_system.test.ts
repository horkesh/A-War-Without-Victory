/**
 * Tests for army_reserve_system.ts — elite brigade loan management.
 */

import { describe, it, expect } from 'vitest';
import {
    computeDeployPriority,
    deployEliteLoan,
    recallEliteLoan,
    tickEliteLoans,
    evaluateArmyReserveAssignments,
    generateArmyReserveRequests,
} from '../src/sim/combat/army_reserve_system.js';
import {
    classifyBrigadesByTerritory,
    collectUnresolvedSectorBrigades,
    syncSectorAssignmentsToFormations,
} from '../src/sim/combat/corps_front_sectors.js';
import { processOsidColumnMovement } from '../src/sim/combat/osid_column_movement.js';
import {
    createEliteLoanState,
    ELITE_LOAN_MIN_DURATION,
    ELITE_CASUALTY_THRESHOLD,
    ELITE_MORALE_RECALL,
    MAX_AUTO_DEPLOY_HOPS,
} from '../src/state/elite_loan_types.js';
import type { CorpsFrontSector, FactionId, GameState, FormationState } from '../src/state/game_state.js';
import type { EdgeRecord } from '../src/map/settlements.js';
import type { OperationalToCanonicalReverseMap } from '../src/data/operational_data.js';
import type { TerrainScalars, TerrainScalarsData } from '../src/map/terrain_scalars.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeElite(id: string, faction: string, locationOsid: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id,
        faction,
        name: id,
        created_turn: 0,
        status: 'active',
        kind: 'brigade',
        assignment: null,
        personnel: 2000,
        morale: 70,
        cohesion: 60,
        corps_id: `${faction.toLowerCase()}_main_staff`,
        location_osid: locationOsid,
        home_osid: locationOsid,
        elite_loan_state: createEliteLoanState(),
        ...overrides,
    } as FormationState;
}

function makeSector(corpsId: string, faction: FactionId, targetOsid = 'op:mun:o3', overrides: Partial<CorpsFrontSector> = {}): CorpsFrontSector {
    return {
        sector_id: `sector:${corpsId}:0`,
        corps_id: corpsId,
        faction,
        opposing_factions: [faction === 'RS' ? 'RBiH' : 'RS'] as FactionId[],
        edge_ids: [`${targetOsid}__op:enemy:e0`],
        sub_segments: [{
            sub_segment_id: `subseg:${corpsId}:0`,
            edge_ids: [`${targetOsid}__op:enemy:e0`],
            friendly_osids: [targetOsid],
            enemy_osids: ['op:enemy:e0'],
            primary_brigade_ids: [],
            length_edges: 1,
        }],
        length_edges: 1,
        territory_osids: [targetOsid],
        assigned_brigade_ids: [],
        reserve_brigade_ids: [],
        density: 0,
        threat_ratio: 2.5,
        defensive_power: 100,
        sector_stance: 'defend',
        stance_source: 'bot',
        ...overrides,
    } as CorpsFrontSector;
}

function makeEdge(a: string, b: string): EdgeRecord {
    return { a, b } as EdgeRecord;
}

function mockReverseMap(osids: string[]): OperationalToCanonicalReverseMap {
    const map = new Map<string, string[]>();
    for (const osid of osids) map.set(osid, [osid]);
    return map;
}

function flatTerrain(): TerrainScalarsData {
    const flat: TerrainScalars = {
        road_access_index: 0.5,
        river_crossing_penalty: 0,
        elevation_mean_m: 200,
        elevation_stddev_m: 10,
        slope_index: 0.1,
        terrain_friction_index: 0.1,
    };
    return {
        by_sid: {},
        by_osid: {},
        by_municipality: {},
        default: flat,
    } as TerrainScalarsData;
}

function makeState(overrides: {
    formations?: Record<string, FormationState>;
    corps_command?: Record<string, any>;
    corps_front_sectors?: Record<string, any>;
    pending_reserve_requests?: any[];
    player_faction?: string | null;
    turn?: number;
} = {}): GameState {
    return {
        meta: {
            turn: overrides.turn ?? 10,
            phase: 'war',
            player_faction: overrides.player_faction ?? null,
        },
        military: {
            formations: overrides.formations ?? {},
            brigade_movement_orders: {},
            brigade_movement_state: {},
            corps_command: overrides.corps_command ?? {},
            corps_front_sectors: overrides.corps_front_sectors ?? {},
            pending_reserve_requests: overrides.pending_reserve_requests ?? [],
            elite_brigade_tracker: {},
        },
        factions: [],
        political: { political_controllers: {} },
    } as unknown as GameState;
}

/** Build empty adjacency (disconnected nodes — hops = Infinity). */
function emptyAdj(): Map<Osid, Osid[]> {
    return new Map();
}

/** Build chain adjacency: osid_0 — osid_1 — ... — osid_N-1 */
function chainAdj(n: number, prefix = 'op:mun:o'): Map<Osid, Osid[]> {
    const adj = new Map<Osid, Osid[]>();
    for (let i = 0; i < n; i++) {
        const cur = `${prefix}${i}` as Osid;
        const neighbors: Osid[] = [];
        if (i > 0) neighbors.push(`${prefix}${i - 1}` as Osid);
        if (i < n - 1) neighbors.push(`${prefix}${i + 1}` as Osid);
        adj.set(cur, neighbors);
    }
    return adj;
}

function makeChainFriendlyToCorps(state: GameState, faction: FactionId, count = 6): void {
    state.political.political_controllers = Object.fromEntries(
        Array.from({ length: count }, (_, index) => [`op:mun:o${index}`, faction]),
    ) as GameState['political']['political_controllers'];
    for (const sector of Object.values(state.military.corps_front_sectors ?? {})) {
        if ((sector.territory_osids ?? []).length > 0) continue;
        const formation = Object.values(state.military.formations ?? {})
            .find((entry) => entry.corps_id === sector.corps_id && entry.status === 'active');
        const location = formation?.location_osid ?? formation?.home_osid;
        if (location) sector.territory_osids = [location];
    }
}

// ── computeDeployPriority ─────────────────────────────────────────────────────

describe('computeDeployPriority', () => {
    it('returns full priority for ≤3 hops', () => {
        expect(computeDeployPriority(80, 0)).toBe(80);
        expect(computeDeployPriority(80, 3)).toBe(80);
    });

    it('applies 0.6× multiplier for 4-6 hops', () => {
        expect(computeDeployPriority(80, 4)).toBeCloseTo(48, 5);
        expect(computeDeployPriority(80, 6)).toBeCloseTo(48, 5);
    });

    it('applies 0.3× multiplier for 7-8 hops', () => {
        expect(computeDeployPriority(80, 7)).toBeCloseTo(24, 5);
        expect(computeDeployPriority(80, 8)).toBeCloseTo(24, 5);
    });

    it('returns -1 for >MAX_AUTO_DEPLOY_HOPS', () => {
        expect(computeDeployPriority(80, MAX_AUTO_DEPLOY_HOPS + 1)).toBe(-1);
        expect(computeDeployPriority(80, 99)).toBe(-1);
    });
});

// ── deployEliteLoan ───────────────────────────────────────────────────────────

describe('deployEliteLoan', () => {
    it('sets on_loan and creates episode in tracker', () => {
        const brigade = makeElite('arbih_guards', 'RBiH', 'op:bihac:bihac_1');
        const state = makeState({ formations: { arbih_guards: brigade }, turn: 5 });

        deployEliteLoan(state, 'arbih_guards', 'arbih_1st_corps', 'offensive_support', 2, 5);

        const ls = state.military.formations!['arbih_guards'].elite_loan_state!;
        expect(ls.on_loan).toBe(true);
        expect(ls.loaned_to_corps).toBe('arbih_1st_corps');
        expect(ls.loan_start_turn).toBe(5);
        expect(ls.current_episode_id).toBe(0);

        const tracker = state.military.elite_brigade_tracker!['arbih_guards'];
        expect(tracker.total_loans).toBe(1);
        expect(tracker.episodes).toHaveLength(1);
        expect(tracker.episodes[0].corps_id).toBe('arbih_1st_corps');
        expect(tracker.episodes[0].reason).toBe('offensive_support');
        expect(tracker.episodes[0].travel_hops).toBe(2);
    });

    it('clears stale homeward movement when redeploying a recalled elite', () => {
        const brigade = makeElite('arbih_guards', 'RBiH', 'op:bihac:bihac_1');
        const state = makeState({ formations: { arbih_guards: brigade }, turn: 5 });
        state.military.brigade_movement_orders = {
            arbih_guards: { destination_sids: ['op:bihac:bihac_1'], stance: 'column' } as any,
        };
        state.military.brigade_movement_state = {
            arbih_guards: { destination_sids: ['op:bihac:bihac_1'], path: ['op:mid', 'op:bihac:bihac_1'], stance: 'column', status: 'in_transit', turns_remaining: 2 } as any,
        };

        deployEliteLoan(state, 'arbih_guards', 'arbih_1st_corps', 'offensive_support', 2, 5);

        expect(state.military.brigade_movement_orders?.arbih_guards).toBeUndefined();
        expect(state.military.brigade_movement_state?.arbih_guards).toBeUndefined();
    });

    it('adds offensive loan elites to a live execution axis, not just the flat participant list', () => {
        const brigade = makeElite('arbih_guards', 'RBiH', 'op:bihac:bihac_1');
        const state = makeState({
            formations: { arbih_guards: brigade },
            corps_command: {
                arbih_1st_corps: {
                    active_operations: [{
                        name: 'Operation Test',
                        phase: 'execution',
                        participating_brigades: ['arbih_line_1'],
                        axes: [
                            { axis_id: 'axis:a', assigned_brigades: ['arbih_line_1'], objectives: ['enemy_a'], current_objective_index: 0, status: 'executing', failure_count: 0, consecutive_failures_on_current: 0, momentum: 0, attack_attempt_count: 0, objective_capture_count: 0, movement_only_execution_turns: 0, idle_execution_turn_streak: 0 },
                            { axis_id: 'axis:b', assigned_brigades: [], objectives: ['enemy_b'], current_objective_index: 0, status: 'executing', failure_count: 0, consecutive_failures_on_current: 0, momentum: 0, attack_attempt_count: 0, objective_capture_count: 0, movement_only_execution_turns: 0, idle_execution_turn_streak: 0 },
                        ],
                    }],
                },
            },
            turn: 5,
        });

        deployEliteLoan(state, 'arbih_guards', 'arbih_1st_corps', 'offensive_support', 2, 5);

        const activeOp = state.military.corps_command!.arbih_1st_corps.active_operations[0];
        expect(activeOp.participating_brigades).toEqual(['arbih_guards', 'arbih_line_1']);
        expect(activeOp.axes?.[1]?.assigned_brigades).toEqual(['arbih_guards']);
    });

    it('adds offensive loan elites to planning operations that drive deployment staging', () => {
        const brigade = makeElite('arbih_guards', 'RBiH', 'op:mun:o0', { corps_id: 'arbih_general_staff' });
        const state = makeState({
            formations: { arbih_guards: brigade },
            corps_command: {
                arbih_1st_corps: {
                    active_operations: [{
                        name: 'Operation Planning',
                        phase: 'planning',
                        preparation_sub_phase: 'force_staging',
                        participating_brigades: ['arbih_line_1'],
                        axes: [{
                            axis_id: 'axis:main',
                            assigned_brigades: ['arbih_line_1'],
                            objectives: ['op:enemy:e0'],
                            current_objective_index: 0,
                            status: 'preparing',
                            failure_count: 0,
                            consecutive_failures_on_current: 0,
                            momentum: 0,
                            attack_attempt_count: 0,
                            objective_capture_count: 0,
                            movement_only_execution_turns: 0,
                            idle_execution_turn_streak: 0,
                            staging_osid: 'op:mun:o2',
                        }],
                    }],
                },
            },
            corps_front_sectors: {
                'sector:arbih_1st_corps:0': makeSector('arbih_1st_corps', 'RBiH', 'op:mun:o3'),
            },
            turn: 5,
        });

        deployEliteLoan(state, 'arbih_guards', 'arbih_1st_corps', 'offensive_support', 2, 5, undefined, undefined, 'army_ai', chainAdj(4));

        const activeOp = state.military.corps_command!.arbih_1st_corps.active_operations[0];
        expect(activeOp.participating_brigades).toEqual(['arbih_guards', 'arbih_line_1']);
        expect(activeOp.axes?.[0]?.assigned_brigades).toEqual(['arbih_guards', 'arbih_line_1']);
        expect(state.military.brigade_movement_orders?.arbih_guards).toEqual({
            destination_sids: ['op:mun:o2'],
            stance: 'column',
        });
    });

    it('issues a column deployment order to the receiving corps sector when the loan is accepted', () => {
        const brigade = makeElite('arbih_guards', 'RBiH', 'op:mun:o0', { corps_id: 'arbih_general_staff' });
        const state = makeState({
            formations: { arbih_guards: brigade },
            corps_front_sectors: {
                'sector:arbih_1st_corps:0': makeSector('arbih_1st_corps', 'RBiH', 'op:mun:o3'),
            },
            turn: 5,
        });

        deployEliteLoan(state, 'arbih_guards', 'arbih_1st_corps', 'defensive_gap', 3, 5, undefined, undefined, 'army_ai', chainAdj(4));

        expect(state.military.brigade_movement_orders?.arbih_guards).toEqual({
            destination_sids: ['op:mun:o3'],
            stance: 'column',
        });
    });

    it('uses active operation axis staging evidence before generic threatened-sector evidence', () => {
        const brigade = makeElite('arbih_guards', 'RBiH', 'op:mun:o0', { corps_id: 'arbih_general_staff' });
        const state = makeState({
            formations: { arbih_guards: brigade },
            corps_command: {
                arbih_1st_corps: {
                    active_operations: [{
                        name: 'Operation Staged',
                        phase: 'execution',
                        participating_brigades: [],
                        axes: [{
                            axis_id: 'axis:main',
                            assigned_brigades: [],
                            objectives: ['op:enemy:e0'],
                            current_objective_index: 0,
                            status: 'executing',
                            failure_count: 0,
                            consecutive_failures_on_current: 0,
                            momentum: 0,
                            attack_attempt_count: 0,
                            objective_capture_count: 0,
                            movement_only_execution_turns: 0,
                            idle_execution_turn_streak: 0,
                            staging_osid: 'op:mun:o2',
                        }],
                    }],
                },
            },
            corps_front_sectors: {
                'sector:arbih_1st_corps:0': makeSector('arbih_1st_corps', 'RBiH', 'op:mun:o3'),
            },
            turn: 5,
        });

        deployEliteLoan(state, 'arbih_guards', 'arbih_1st_corps', 'offensive_support', 3, 5, undefined, undefined, 'army_ai', chainAdj(4));

        expect(state.military.brigade_movement_orders?.arbih_guards).toEqual({
            destination_sids: ['op:mun:o2'],
            stance: 'column',
        });
    });

    it('uses nearest target-corps sector when no active operation or threatened sector exists', () => {
        const brigade = makeElite('arbih_guards', 'RBiH', 'op:mun:o0', { corps_id: 'arbih_general_staff' });
        const state = makeState({
            formations: { arbih_guards: brigade },
            corps_front_sectors: {
                'sector:arbih_1st_corps:0': makeSector('arbih_1st_corps', 'RBiH', 'op:mun:o4', { threat_ratio: 0 }),
                'sector:arbih_1st_corps:1': makeSector('arbih_1st_corps', 'RBiH', 'op:mun:o1', {
                    sector_id: 'sector:arbih_1st_corps:1',
                    threat_ratio: 0,
                }),
            },
            turn: 5,
        });

        deployEliteLoan(state, 'arbih_guards', 'arbih_1st_corps', 'defensive_gap', 1, 5, undefined, undefined, 'army_ai', chainAdj(5));

        expect(state.military.brigade_movement_orders?.arbih_guards).toEqual({
            destination_sids: ['op:mun:o1'],
            stance: 'column',
        });
    });

    const eliteLoanCases: Array<[string, string, string, string]> = [
        ['arbih_guards_brigade', 'RBiH', 'arbih_general_staff', 'arbih_1st_corps'],
        ['arbih_120th_liberation_black_swans', 'RBiH', 'arbih_general_staff', 'arbih_2nd_corps'],
        ['rs_1st_guards_motorized', 'RS', 'vrs_main_staff', 'vrs_drina'],
        ['rs_65th_protection_motorized_regiment', 'RS', 'vrs_main_staff', 'vrs_sarajevo_romanija'],
        ['hvo_1st_guard_abb', 'HRHB', 'hvo_main_staff', 'hvo_central_bosnia'],
        ['hvo_2nd_guard_mechanized', 'HRHB', 'hvo_main_staff', 'hvo_tomislavgrad'],
        ['hvo_3rd_guard_jastrebovi', 'HRHB', 'hvo_main_staff', 'hvo_tomislavgrad'],
    ];

    for (const [brigadeId, faction, staffCorps, targetCorps] of eliteLoanCases) {
        it(`creates a concrete deployment order for ${brigadeId}`, () => {
            const brigade = makeElite(brigadeId, faction, 'op:mun:o0', { corps_id: staffCorps });
            const state = makeState({
                formations: { [brigadeId]: brigade },
                corps_front_sectors: {
                    [`sector:${targetCorps}:0`]: makeSector(targetCorps, faction as FactionId, 'op:mun:o1'),
                },
                turn: 5,
            });

            deployEliteLoan(state, brigadeId, targetCorps, 'defensive_gap', 1, 5, undefined, undefined, 'army_ai', chainAdj(2));

            expect(state.military.brigade_movement_orders?.[brigadeId]).toEqual({
                destination_sids: ['op:mun:o1'],
                stance: 'column',
            });
        });
    }

    it('does not report a loaned elite with a valid column deployment order as fallen through', () => {
        const brigade = makeElite('arbih_guards_brigade', 'RBiH', 'op:mun:o0', { corps_id: 'arbih_general_staff' });
        brigade.elite_loan_state!.on_loan = true;
        brigade.elite_loan_state!.loaned_to_corps = 'arbih_1st_corps';
        const sector = makeSector('arbih_1st_corps', 'RBiH', 'op:mun:o1');
        const state = makeState({
            formations: { arbih_guards_brigade: brigade },
            corps_front_sectors: { [sector.sector_id]: sector },
            turn: 5,
        });
        state.military.war_front_edges_osid = [{
            edge_id: 'op:mun:o1__op:enemy:e0',
            a: 'op:mun:o1',
            b: 'op:enemy:e0',
            side_a: 'RBiH',
            side_b: 'RS',
        }] as any;
        state.military.brigade_movement_orders = {
            arbih_guards_brigade: { destination_sids: ['op:mun:o1'], stance: 'column' } as any,
        };

        expect(collectUnresolvedSectorBrigades(state, { [sector.sector_id]: sector }, state.military.formations!, chainAdj(2))).toEqual([]);
    });

    it('does not report a loaned elite with a column assembly order before operation attachment', () => {
        const brigade = makeElite('arbih_guards_brigade', 'RBiH', 'op:mun:o0', { corps_id: 'arbih_general_staff' });
        brigade.elite_loan_state!.on_loan = true;
        brigade.elite_loan_state!.loaned_to_corps = 'arbih_1st_corps';
        const sector = makeSector('arbih_1st_corps', 'RBiH', 'op:mun:o1');
        const state = makeState({
            formations: { arbih_guards_brigade: brigade },
            corps_front_sectors: { [sector.sector_id]: sector },
            turn: 5,
        });
        state.military.war_front_edges_osid = [{
            edge_id: 'op:mun:o1__op:enemy:e0',
            a: 'op:mun:o1',
            b: 'op:enemy:e0',
            side_a: 'RBiH',
            side_b: 'RS',
        }] as any;
        state.military.brigade_movement_orders = {
            arbih_guards_brigade: { destination_sids: ['op:mun:assembly'], stance: 'column' } as any,
        };

        expect(collectUnresolvedSectorBrigades(state, { [sector.sector_id]: sector }, state.military.formations!, chainAdj(2))).toEqual([]);
    });

    it('does not report a newly loaned elite before the same-turn movement planner attaches orders', () => {
        const brigade = makeElite('arbih_guards_brigade', 'RBiH', 'op:mun:o0', { corps_id: 'arbih_general_staff' });
        brigade.elite_loan_state!.on_loan = true;
        brigade.elite_loan_state!.loaned_to_corps = 'arbih_1st_corps';
        brigade.elite_loan_state!.loan_start_turn = 5;
        const sector = makeSector('arbih_1st_corps', 'RBiH', 'op:mun:o1');
        const state = makeState({
            formations: { arbih_guards_brigade: brigade },
            corps_front_sectors: { [sector.sector_id]: sector },
            turn: 5,
        });
        state.military.war_front_edges_osid = [{
            edge_id: 'op:mun:o1__op:enemy:e0',
            a: 'op:mun:o1',
            b: 'op:enemy:e0',
            side_a: 'RBiH',
            side_b: 'RS',
        }] as any;

        expect(collectUnresolvedSectorBrigades(state, { [sector.sector_id]: sector }, state.military.formations!, chainAdj(2))).toEqual([]);
    });

    it('still reports a loaned elite when the only movement order lacks column deployment ownership', () => {
        const brigade = makeElite('arbih_guards_brigade', 'RBiH', 'op:mun:o0', { corps_id: 'arbih_general_staff' });
        brigade.elite_loan_state!.on_loan = true;
        brigade.elite_loan_state!.loaned_to_corps = 'arbih_1st_corps';
        const sector = makeSector('arbih_1st_corps', 'RBiH', 'op:mun:o1');
        const state = makeState({
            formations: { arbih_guards_brigade: brigade },
            corps_front_sectors: { [sector.sector_id]: sector },
            turn: 5,
        });
        state.military.war_front_edges_osid = [{
            edge_id: 'op:mun:o1__op:enemy:e0',
            a: 'op:mun:o1',
            b: 'op:enemy:e0',
            side_a: 'RBiH',
            side_b: 'RS',
        }] as any;
        state.military.brigade_movement_orders = {
            arbih_guards_brigade: { destination_sids: ['op:mun:o1'] },
        };

        expect(collectUnresolvedSectorBrigades(state, { [sector.sector_id]: sector }, state.military.formations!, chainAdj(2))).toEqual(['arbih_guards_brigade']);
    });

    it('does not report an active loaned elite that is column-deploying to receiving corps operation staging', () => {
        const brigade = makeElite('rs_65th_protection_motorized_regiment', 'RS', 'op:mun:o0', { corps_id: 'vrs_main_staff' });
        brigade.elite_loan_state!.on_loan = true;
        brigade.elite_loan_state!.loaned_to_corps = 'vrs_sarajevo_romanija';
        const sector = makeSector('vrs_sarajevo_romanija', 'RS', 'op:mun:o1');
        const state = makeState({
            formations: { rs_65th_protection_motorized_regiment: brigade },
            corps_command: {
                vrs_sarajevo_romanija: {
                    active_operations: [{
                        name: 'Operation Prsten',
                        phase: 'execution',
                        participating_brigades: ['rs_65th_protection_motorized_regiment'],
                        staging_osid: 'op:mun:corps_staging',
                        axes: [{
                            axis_id: 'axis:romanija',
                            objectives: ['op:mun:o2'],
                            staging_osid: 'op:mun:o3',
                            assigned_brigades: ['rs_65th_protection_motorized_regiment'],
                        }],
                    }],
                },
            },
            corps_front_sectors: { [sector.sector_id]: sector },
            turn: 5,
        });
        state.military.war_front_edges_osid = [{
            edge_id: 'op:mun:o1__op:enemy:e0',
            a: 'op:mun:o1',
            b: 'op:enemy:e0',
            side_a: 'RS',
            side_b: 'RBiH',
        }] as any;
        state.military.brigade_movement_orders = {
            rs_65th_protection_motorized_regiment: { destination_sids: ['op:mun:o3'], stance: 'column' } as any,
        };

        expect(collectUnresolvedSectorBrigades(state, { [sector.sector_id]: sector }, state.military.formations!, chainAdj(3))).toEqual([]);
    });

    it('does not report an active loaned elite operation participant with a column assembly move', () => {
        const brigade = makeElite('rs_65th_protection_motorized_regiment', 'RS', 'op:mun:o0', { corps_id: 'vrs_main_staff' });
        brigade.elite_loan_state!.on_loan = true;
        brigade.elite_loan_state!.loaned_to_corps = 'vrs_sarajevo_romanija';
        const sector = makeSector('vrs_sarajevo_romanija', 'RS', 'op:mun:o1');
        const state = makeState({
            formations: { rs_65th_protection_motorized_regiment: brigade },
            corps_command: {
                vrs_sarajevo_romanija: {
                    active_operations: [{
                        name: 'Operation Prsten',
                        phase: 'execution',
                        participating_brigades: ['rs_65th_protection_motorized_regiment'],
                        staging_osid: 'op:mun:corps_staging',
                        axes: [{
                            axis_id: 'axis:romanija',
                            objectives: ['op:mun:o2'],
                            staging_osid: 'op:mun:o3',
                            assigned_brigades: ['rs_65th_protection_motorized_regiment'],
                        }],
                    }],
                },
            },
            corps_front_sectors: { [sector.sector_id]: sector },
            turn: 5,
        });
        state.military.war_front_edges_osid = [{
            edge_id: 'op:mun:o1__op:enemy:e0',
            a: 'op:mun:o1',
            b: 'op:enemy:e0',
            side_a: 'RS',
            side_b: 'RBiH',
        }] as any;
        state.military.brigade_movement_orders = {
            rs_65th_protection_motorized_regiment: { destination_sids: ['op:mun:assembly'], stance: 'column' } as any,
        };

        expect(collectUnresolvedSectorBrigades(state, { [sector.sector_id]: sector }, state.military.formations!, chainAdj(3))).toEqual([]);
    });

    it('syncs a loaned army-HQ elite into receiving corps sector assignment after column arrival', () => {
        const brigade = makeElite('arbih_guards_brigade', 'RBiH', 'op:mun:o0', { corps_id: 'arbih_general_staff' });
        const sector = makeSector('arbih_1st_corps', 'RBiH', 'op:mun:o1');
        const state = makeState({
            formations: { arbih_guards_brigade: brigade },
            corps_front_sectors: { [sector.sector_id]: sector },
            turn: 5,
        });
        state.political.political_controllers = {
            'op:mun:o0': 'RBiH',
            'op:mun:o1': 'RBiH',
            'op:enemy:e0': 'RS',
        } as any;

        deployEliteLoan(state, 'arbih_guards_brigade', 'arbih_1st_corps', 'defensive_gap', 1, 5, undefined, undefined, 'army_ai', chainAdj(2));
        processOsidColumnMovement(
            state,
            [makeEdge('op:mun:o0', 'op:mun:o1')],
            mockReverseMap(['op:mun:o0', 'op:mun:o1']),
            flatTerrain(),
        );
        state.military.brigade_movement_state!.arbih_guards_brigade.turns_remaining = 1;
        processOsidColumnMovement(
            state,
            [makeEdge('op:mun:o0', 'op:mun:o1')],
            mockReverseMap(['op:mun:o0', 'op:mun:o1']),
            flatTerrain(),
        );

        classifyBrigadesByTerritory(
            [sector],
            'RBiH',
            state.military.formations!,
            chainAdj(2),
            new Set(['op:mun:o0', 'op:mun:o1']),
            new Map([
                ['op:mun:o0', 0],
                ['op:mun:o1', 0],
            ]),
            new Map(),
            undefined,
            state,
        );
        syncSectorAssignmentsToFormations({ [sector.sector_id]: sector }, state.military.formations!, chainAdj(2));

        expect(state.military.formations!.arbih_guards_brigade.location_osid).toBe('op:mun:o1');
        expect(sector.assigned_brigade_ids).toEqual(['arbih_guards_brigade']);
        expect(state.military.formations!.arbih_guards_brigade.assignment).toEqual({
            kind: 'sector',
            role: 'front',
            sector_id: 'sector:arbih_1st_corps:0',
        });
    });

    it('keeps idle not-on-loan army-HQ elites sector-exempt', () => {
        const brigade = makeElite('arbih_guards_brigade', 'RBiH', 'op:mun:o0', { corps_id: 'arbih_general_staff' });
        const sector = makeSector('arbih_1st_corps', 'RBiH', 'op:mun:o1');
        const state = makeState({
            formations: { arbih_guards_brigade: brigade },
            corps_front_sectors: { [sector.sector_id]: sector },
            turn: 5,
        });
        state.military.war_front_edges_osid = [{
            edge_id: 'op:mun:o1__op:enemy:e0',
            a: 'op:mun:o1',
            b: 'op:enemy:e0',
            side_a: 'RBiH',
            side_b: 'RS',
        }] as any;

        expect(collectUnresolvedSectorBrigades(state, { [sector.sector_id]: sector }, state.military.formations!, chainAdj(2))).toEqual([]);
    });
});

// ── recallEliteLoan ───────────────────────────────────────────────────────────

describe('recallEliteLoan', () => {
    it('closes episode and clears loan state', () => {
        const brigade = makeElite('arbih_guards', 'RBiH', 'op:bihac:bihac_1', { personnel: 2000 });
        const state = makeState({ formations: { arbih_guards: brigade }, turn: 5 });

        deployEliteLoan(state, 'arbih_guards', 'arbih_1st_corps', 'offensive_support', 2, 5);

        // Simulate some casualties
        state.military.formations!['arbih_guards'].personnel = 1800;

        recallEliteLoan(state, 'arbih_guards', 'op_complete', 12);

        const ls = state.military.formations!['arbih_guards'].elite_loan_state!;
        expect(ls.on_loan).toBe(false);
        expect(ls.loaned_to_corps).toBeNull();
        expect(ls.last_recall_turn).toBe(12);
        expect(ls.current_episode_id).toBeNull();

        const ep = state.military.elite_brigade_tracker!['arbih_guards'].episodes[0];
        expect(ep.loan_end_turn).toBe(12);
        expect(ep.recall_reason).toBe('op_complete');
        expect(ep.casualties_taken).toBe(200);
    });

    it('removes the recalled elite from the receiving corps active operation and axes', () => {
        const brigade = makeElite('arbih_guards', 'RBiH', 'op:bihac:bihac_1');
        const state = makeState({
            formations: { arbih_guards: brigade },
            corps_command: {
                arbih_1st_corps: {
                    active_operations: [{
                        name: 'Operation Test',
                        phase: 'execution',
                        participating_brigades: ['arbih_guards', 'arbih_line_1'],
                        axes: [
                            { assigned_brigades: ['arbih_guards'] },
                            { assigned_brigades: ['arbih_line_1', 'arbih_guards'] },
                        ],
                    }],
                },
            },
            turn: 5,
        });

        deployEliteLoan(state, 'arbih_guards', 'arbih_1st_corps', 'offensive_support', 2, 5);
        recallEliteLoan(state, 'arbih_guards', 'op_complete', 12);

        const activeOp = state.military.corps_command!.arbih_1st_corps.active_operations[0];
        expect(activeOp.participating_brigades).toEqual(['arbih_line_1']);
        expect(activeOp.axes?.[0]?.assigned_brigades).toEqual([]);
        expect(activeOp.axes?.[1]?.assigned_brigades).toEqual(['arbih_line_1']);
    });
});

// ── tickEliteLoans — force recalls ────────────────────────────────────────────

describe('tickEliteLoans', () => {
    function makeOnLoanBrigade(id: string, opts: {
        personnel?: number;
        startPersonnel?: number;
        morale?: number;
        loanStartTurn?: number;
    } = {}): FormationState {
        const brigade = makeElite(id, 'RS', 'op:brcko:brcko_1', {
            personnel: opts.personnel ?? 2000,
            morale: opts.morale ?? 70,
            corps_id: 'vrs_main_staff',
        });
        brigade.elite_loan_state = {
            on_loan: true,
            loaned_to_corps: 'vrs_drina',
            loan_start_turn: opts.loanStartTurn ?? 0,
            last_recall_turn: null,
            loan_start_personnel: opts.startPersonnel ?? 2000,
            permanently_degraded: false,
            current_episode_id: 0,
        };
        return brigade;
    }

    it('force-recalls on casualty threshold (>30% loss)', () => {
        const brigade = makeOnLoanBrigade('rs_1st_guards', {
            personnel: 1300, // 35% loss from 2000
            startPersonnel: 2000,
        });
        const state = makeState({
            formations: { rs_1st_guards: brigade },
            corps_command: { vrs_drina: {} },
            turn: 10,
        });
        // Seed tracker
        deployEliteLoan(state, 'rs_1st_guards', 'vrs_drina', 'offensive_support', 1, 0);
        // Re-apply loan state (deployEliteLoan resets on_loan)
        brigade.elite_loan_state!.loan_start_personnel = 2000;
        brigade.elite_loan_state!.on_loan = true;
        brigade.elite_loan_state!.loaned_to_corps = 'vrs_drina';
        brigade.elite_loan_state!.loan_start_turn = 0;
        brigade.personnel = 1300;

        tickEliteLoans(state, 10);

        expect(brigade.elite_loan_state!.on_loan).toBe(false);
    });

    it('force-recalls on morale collapse', () => {
        const brigade = makeOnLoanBrigade('rs_1st_guards', {
            morale: ELITE_MORALE_RECALL - 1,
            loanStartTurn: 0,
        });
        const state = makeState({
            formations: { rs_1st_guards: brigade },
            corps_command: { vrs_drina: {} },
            turn: 10,
        });
        deployEliteLoan(state, 'rs_1st_guards', 'vrs_drina', 'offensive_support', 1, 0);
        brigade.elite_loan_state!.on_loan = true;
        brigade.elite_loan_state!.loaned_to_corps = 'vrs_drina';
        brigade.elite_loan_state!.loan_start_turn = 0;
        brigade.morale = ELITE_MORALE_RECALL - 1;

        tickEliteLoans(state, 10);

        expect(brigade.elite_loan_state!.on_loan).toBe(false);
    });

    it('does NOT recall before min duration even if op ended', () => {
        const brigade = makeOnLoanBrigade('rs_1st_guards', { loanStartTurn: 8 });
        const state = makeState({
            formations: { rs_1st_guards: brigade },
            corps_command: { vrs_drina: { active_operations: [] } },
            corps_front_sectors: {},
            turn: 10, // only 2 turns — below ELITE_LOAN_MIN_DURATION=6
        });
        deployEliteLoan(state, 'rs_1st_guards', 'vrs_drina', 'offensive_support', 1, 8);
        brigade.elite_loan_state!.on_loan = true;
        brigade.elite_loan_state!.loaned_to_corps = 'vrs_drina';
        brigade.elite_loan_state!.loan_start_turn = 8;

        tickEliteLoans(state, 10);

        // Still on loan (min duration not met)
        expect(brigade.elite_loan_state!.on_loan).toBe(true);
    });

    it('voluntary recalls after min duration when op ended and threat low', () => {
        const loanStart = 0;
        const currentTurn = loanStart + ELITE_LOAN_MIN_DURATION + 1;
        const brigade = makeOnLoanBrigade('rs_1st_guards', { loanStartTurn: loanStart });
        const state = makeState({
            formations: { rs_1st_guards: brigade },
            corps_command: { vrs_drina: { active_operations: [] } },
            corps_front_sectors: {
                sector_a: { corps_id: 'vrs_drina', threat_ratio: 0.8, assigned_brigade_ids: ['rs_1st_guards'] },
            },
            turn: currentTurn,
        });
        deployEliteLoan(state, 'rs_1st_guards', 'vrs_drina', 'offensive_support', 1, loanStart);
        brigade.elite_loan_state!.on_loan = true;
        brigade.elite_loan_state!.loaned_to_corps = 'vrs_drina';
        brigade.elite_loan_state!.loan_start_turn = loanStart;

        tickEliteLoans(state, currentTurn);

        expect(brigade.elite_loan_state!.on_loan).toBe(false);
    });

    it('recalls a stranded loan when no friendly route to receiving corps territory remains', () => {
        const brigade = makeOnLoanBrigade('rs_1st_guards', { loanStartTurn: 0 });
        brigade.location_osid = 'op:mun:o0';
        const state = makeState({
            formations: { rs_1st_guards: brigade },
            corps_command: { vrs_drina: { active_operations: [{ phase: 'execution', participating_brigades: [] }] } },
            corps_front_sectors: {
                sector_a: {
                    corps_id: 'vrs_drina',
                    territory_osids: ['op:mun:o2'],
                    assigned_brigade_ids: ['rs_1st_guards'],
                    reserve_brigade_ids: [],
                    threat_ratio: 2.0,
                },
            },
            turn: 10,
        });
        state.political.political_controllers = {
            'op:mun:o0': 'RS',
            'op:mun:o1': 'RBiH',
            'op:mun:o2': 'RS',
        } as any;
        brigade.elite_loan_state!.on_loan = true;
        brigade.elite_loan_state!.loaned_to_corps = 'vrs_drina';
        brigade.elite_loan_state!.loan_start_turn = 0;

        tickEliteLoans(state, 10, chainAdj(3));

        expect(brigade.elite_loan_state!.on_loan).toBe(false);
    });

    it('refreshes deployment orders when an active army-HQ loan remains outside receiving-corps territory', () => {
        const brigade = makeOnLoanBrigade('rs_1st_guards', { loanStartTurn: 0 });
        brigade.location_osid = 'op:mun:o0';
        brigade.assignment = null;
        const sector = makeSector('vrs_drina', 'RS', 'op:mun:o2');
        const state = makeState({
            formations: { rs_1st_guards: brigade },
            corps_command: { vrs_drina: { active_operations: [] } },
            corps_front_sectors: { [sector.sector_id]: sector },
            turn: 10,
        });
        state.political.political_controllers = {
            'op:mun:o0': 'RS',
            'op:mun:o1': 'RS',
            'op:mun:o2': 'RS',
        } as any;
        brigade.elite_loan_state!.on_loan = true;
        brigade.elite_loan_state!.loaned_to_corps = 'vrs_drina';
        brigade.elite_loan_state!.loan_start_turn = 0;
        delete state.military.brigade_movement_orders?.rs_1st_guards;

        tickEliteLoans(state, 10, chainAdj(3));

        expect(brigade.elite_loan_state!.on_loan).toBe(true);
        expect(state.military.brigade_movement_orders?.rs_1st_guards).toEqual({
            destination_sids: ['op:mun:o2'],
            stance: 'column',
        });
        expect(collectUnresolvedSectorBrigades(
            state,
            { [sector.sector_id]: sector },
            state.military.formations!,
            chainAdj(3),
        )).toEqual([]);
    });

    it('refreshes deployment orders for any active loan still outside receiving-corps territory', () => {
        const brigade = makeOnLoanBrigade('rs_line_elite', { loanStartTurn: 0 });
        brigade.corps_id = 'vrs_1st_krajina';
        brigade.location_osid = 'op:mun:o0';
        brigade.assignment = null;
        const sector = makeSector('vrs_drina', 'RS', 'op:mun:o2');
        const state = makeState({
            formations: { rs_line_elite: brigade },
            corps_command: { vrs_drina: { active_operations: [] } },
            corps_front_sectors: { [sector.sector_id]: sector },
            turn: 10,
        });
        state.political.political_controllers = {
            'op:mun:o0': 'RS',
            'op:mun:o1': 'RS',
            'op:mun:o2': 'RS',
        } as any;
        brigade.elite_loan_state!.on_loan = true;
        brigade.elite_loan_state!.loaned_to_corps = 'vrs_drina';
        brigade.elite_loan_state!.loan_start_turn = 0;
        delete state.military.brigade_movement_orders?.rs_line_elite;

        tickEliteLoans(state, 10, chainAdj(3));

        expect(brigade.elite_loan_state!.on_loan).toBe(true);
        expect(state.military.brigade_movement_orders?.rs_line_elite).toEqual({
            destination_sids: ['op:mun:o2'],
            stance: 'column',
        });
    });

    it('auto-joins a newly launched execution operation through axis membership as well', () => {
        const brigade = makeOnLoanBrigade('rs_1st_guards', { loanStartTurn: 0 });
        const state = makeState({
            formations: { rs_1st_guards: brigade },
            corps_command: {
                vrs_drina: {
                    active_operations: [{
                        name: 'Operation New',
                        phase: 'execution',
                        participating_brigades: ['rs_line_1'],
                        axes: [
                            { axis_id: 'axis:a', assigned_brigades: ['rs_line_1'], objectives: ['enemy_a'], current_objective_index: 0, status: 'executing', failure_count: 0, consecutive_failures_on_current: 0, momentum: 0, attack_attempt_count: 0, objective_capture_count: 0, movement_only_execution_turns: 0, idle_execution_turn_streak: 0 },
                            { axis_id: 'axis:b', assigned_brigades: [], objectives: ['enemy_b'], current_objective_index: 0, status: 'executing', failure_count: 0, consecutive_failures_on_current: 0, momentum: 0, attack_attempt_count: 0, objective_capture_count: 0, movement_only_execution_turns: 0, idle_execution_turn_streak: 0 },
                        ],
                    }],
                },
            },
            turn: 10,
        });
        brigade.elite_loan_state!.on_loan = true;
        brigade.elite_loan_state!.loaned_to_corps = 'vrs_drina';
        brigade.elite_loan_state!.loan_start_turn = 0;

        tickEliteLoans(state, 10);

        const activeOp = state.military.corps_command!.vrs_drina.active_operations[0];
        expect(activeOp.participating_brigades).toEqual(['rs_1st_guards', 'rs_line_1']);
        expect(activeOp.axes?.[1]?.assigned_brigades).toEqual(['rs_1st_guards']);
    });
});

// ── evaluateArmyReserveAssignments ────────────────────────────────────────────

describe('evaluateArmyReserveAssignments', () => {
    it('auto-assigns bot faction request when elite is available and nearby', () => {
        const adj = chainAdj(10);
        const brigadeOsid = 'op:mun:o1' as Osid;
        const corpsOsid = 'op:mun:o3' as Osid;

        const elite = makeElite('rs_1st_guards', 'RS', brigadeOsid);
        const corpsHq = {
            id: 'vrs_2nd_krajina',
            faction: 'RS',
            kind: 'corps_hq',
            status: 'active',
            corps_id: 'vrs_2nd_krajina',
            location_osid: corpsOsid,
            home_osid: corpsOsid,
            personnel: 1000,
        } as unknown as FormationState;

        const state = makeState({
            formations: { rs_1st_guards: elite, vrs_2nd_krajina: corpsHq },
            corps_front_sectors: {
                sec_a: {
                    corps_id: 'vrs_2nd_krajina',
                    territory_osids: ['op:mun:o3'],
                    assigned_brigade_ids: [],
                    reserve_brigade_ids: [],
                },
            },
            pending_reserve_requests: [{
                corps_id: 'vrs_2nd_krajina',
                faction: 'RS',
                reason: 'offensive_support',
                priority: 70,
                raw_priority: 70,
                travel_hops: 2,
                turn_requested: 10,
                description: 'test',
                suggested_brigade_id: 'rs_1st_guards',
            }],
            player_faction: 'RBiH', // RS is bot
            turn: 10,
        });
        state.political.political_controllers = {
            'op:mun:o1': 'RS',
            'op:mun:o2': 'RS',
            'op:mun:o3': 'RS',
        } as any;

        evaluateArmyReserveAssignments(state, adj);

        expect(state.military.formations!['rs_1st_guards'].elite_loan_state!.on_loan).toBe(true);
        expect(state.military.formations!['rs_1st_guards'].elite_loan_state!.loaned_to_corps).toBe('vrs_2nd_krajina');
        // Fulfilled requests are removed from pending list
        expect(state.military.pending_reserve_requests).toHaveLength(0);
    });

    it('does not auto-assign a loan when the receiving corps has no reachable friendly sector territory', () => {
        const adj = chainAdj(3);
        const elite = makeElite('arbih_black_swans', 'RBiH', 'op:mun:o0');

        const state = makeState({
            formations: { arbih_black_swans: elite },
            corps_front_sectors: {
                sec_a: {
                    corps_id: 'arbih_2nd_corps',
                    territory_osids: ['op:mun:o2'],
                    assigned_brigade_ids: [],
                    reserve_brigade_ids: [],
                },
            },
            pending_reserve_requests: [{
                corps_id: 'arbih_2nd_corps',
                faction: 'RBiH',
                reason: 'defensive_gap',
                priority: 60,
                raw_priority: 60,
                travel_hops: 2,
                turn_requested: 10,
                description: 'test',
                suggested_brigade_id: 'arbih_black_swans',
            }],
            player_faction: 'RS',
            turn: 10,
        });
        state.political.political_controllers = {
            'op:mun:o0': 'RBiH',
            'op:mun:o1': 'RS',
            'op:mun:o2': 'RBiH',
        } as any;

        evaluateArmyReserveAssignments(state, adj);

        expect(elite.elite_loan_state!.on_loan).toBe(false);
        expect(state.military.pending_reserve_requests).toHaveLength(1);
    });

    it('leaves player faction requests in pending list (not auto-assigned)', () => {
        const adj = chainAdj(5);
        const elite = makeElite('arbih_guards', 'RBiH', 'op:mun:o0');

        const state = makeState({
            formations: { arbih_guards: elite },
            pending_reserve_requests: [{
                corps_id: 'arbih_1st_corps',
                faction: 'RBiH',
                reason: 'defensive_gap',
                priority: 60,
                raw_priority: 60,
                travel_hops: 1,
                turn_requested: 10,
                description: 'test',
                suggested_brigade_id: 'arbih_guards',
            }],
            player_faction: 'RBiH', // player faction — must NOT auto-assign
            turn: 10,
        });

        evaluateArmyReserveAssignments(state, adj);

        expect(elite.elite_loan_state!.on_loan).toBe(false);
        expect(state.military.pending_reserve_requests).toHaveLength(1);
    });
});

describe('generateArmyReserveRequests', () => {
    it('emits one actionable request when multiple corps compete for the same elite brigade', () => {
        const adj = chainAdj(5);
        const state = makeState({
            formations: {
                rs_shared_elite: makeElite('rs_shared_elite', 'RS', 'op:mun:o2'),
                corps_alpha_line: {
                    id: 'corps_alpha_line',
                    faction: 'RS',
                    name: 'Alpha Line Brigade',
                    created_turn: 0,
                    status: 'active',
                    kind: 'brigade',
                    assignment: null,
                    personnel: 1200,
                    morale: 60,
                    cohesion: 55,
                    corps_id: 'corps_alpha',
                    location_osid: 'op:mun:o0',
                    home_osid: 'op:mun:o0',
                } as FormationState,
                corps_zulu_line: {
                    id: 'corps_zulu_line',
                    faction: 'RS',
                    name: 'Zulu Line Brigade',
                    created_turn: 0,
                    status: 'active',
                    kind: 'brigade',
                    assignment: null,
                    personnel: 1200,
                    morale: 60,
                    cohesion: 55,
                    corps_id: 'corps_zulu',
                    location_osid: 'op:mun:o4',
                    home_osid: 'op:mun:o4',
                } as FormationState,
            },
            corps_command: {
                corps_alpha: {
                    commander_reinforcement_requests: [
                        { zone_id: 'zone:alpha', brigades_needed: 1, priority: 'high' },
                    ],
                    active_operations: [],
                },
                corps_zulu: {
                    commander_reinforcement_requests: [
                        { zone_id: 'zone:zulu', brigades_needed: 1, priority: 'critical' },
                    ],
                    active_operations: [],
                },
            },
            corps_front_sectors: {
                alpha_sector: makeSector('corps_alpha', 'RS', 'op:mun:o0', { threat_ratio: 1 }),
                zulu_sector: makeSector('corps_zulu', 'RS', 'op:mun:o4', { threat_ratio: 1 }),
            },
            player_faction: 'RS',
            turn: 12,
        });
        makeChainFriendlyToCorps(state, 'RS', 5);

        generateArmyReserveRequests(state, adj);

        expect(state.military.pending_reserve_requests).toHaveLength(1);
        expect(state.military.pending_reserve_requests?.[0]).toMatchObject({
            corps_id: 'corps_zulu',
            suggested_brigade_id: 'rs_shared_elite',
        });
    });

    it('uses a deterministic augmenting path when a later corps has only one feasible elite', () => {
        const adj = chainAdj(11);
        const state = makeState({
            formations: {
                rs_elite_a: makeElite('rs_elite_a', 'RS', 'op:mun:o1'),
                rs_elite_b: makeElite('rs_elite_b', 'RS', 'op:mun:o10'),
                corps_high_line: {
                    id: 'corps_high_line',
                    faction: 'RS',
                    name: 'High Priority Line Brigade',
                    created_turn: 0,
                    status: 'active',
                    kind: 'brigade',
                    assignment: null,
                    personnel: 1200,
                    morale: 60,
                    cohesion: 55,
                    corps_id: 'corps_high',
                    location_osid: 'op:mun:o2',
                    home_osid: 'op:mun:o2',
                } as FormationState,
                corps_low_line: {
                    id: 'corps_low_line',
                    faction: 'RS',
                    name: 'Lower Priority Line Brigade',
                    created_turn: 0,
                    status: 'active',
                    kind: 'brigade',
                    assignment: null,
                    personnel: 1200,
                    morale: 60,
                    cohesion: 55,
                    corps_id: 'corps_low',
                    location_osid: 'op:mun:o0',
                    home_osid: 'op:mun:o0',
                } as FormationState,
            },
            corps_command: {
                corps_low: {
                    commander_reinforcement_requests: [
                        { zone_id: 'zone:low', brigades_needed: 1, priority: 'high' },
                    ],
                    active_operations: [],
                },
                corps_high: {
                    commander_reinforcement_requests: [
                        { zone_id: 'zone:high', brigades_needed: 1, priority: 'critical' },
                    ],
                    active_operations: [],
                },
            },
            corps_front_sectors: {
                low_sector: makeSector('corps_low', 'RS', 'op:mun:o0', { threat_ratio: 1 }),
                high_sector: makeSector('corps_high', 'RS', 'op:mun:o2', { threat_ratio: 1 }),
            },
            player_faction: 'RS',
            turn: 12,
        });
        makeChainFriendlyToCorps(state, 'RS', 11);

        generateArmyReserveRequests(state, adj);

        expect(state.military.pending_reserve_requests).toHaveLength(2);
        const byCorps = Object.fromEntries(
            (state.military.pending_reserve_requests ?? []).map(request => [request.corps_id, request]),
        );
        expect(byCorps.corps_high).toMatchObject({
            suggested_brigade_id: 'rs_elite_b',
            travel_hops: 8,
        });
        expect(byCorps.corps_low).toMatchObject({
            suggested_brigade_id: 'rs_elite_a',
            travel_hops: 1,
        });
        expect(new Set(
            (state.military.pending_reserve_requests ?? []).map(request => request.suggested_brigade_id),
        ).size).toBe(2);
    });

    it('breaks equal-priority and equal-distance matches by corps and formation ID', () => {
        const adj = chainAdj(3);
        const state = makeState({
            formations: {
                rs_elite_z: makeElite('rs_elite_z', 'RS', 'op:mun:o1'),
                rs_elite_a: makeElite('rs_elite_a', 'RS', 'op:mun:o1'),
                corps_zulu_line: {
                    id: 'corps_zulu_line',
                    faction: 'RS',
                    name: 'Zulu Line Brigade',
                    created_turn: 0,
                    status: 'active',
                    kind: 'brigade',
                    assignment: null,
                    personnel: 1200,
                    morale: 60,
                    cohesion: 55,
                    corps_id: 'corps_zulu',
                    location_osid: 'op:mun:o2',
                    home_osid: 'op:mun:o2',
                } as FormationState,
                corps_alpha_line: {
                    id: 'corps_alpha_line',
                    faction: 'RS',
                    name: 'Alpha Line Brigade',
                    created_turn: 0,
                    status: 'active',
                    kind: 'brigade',
                    assignment: null,
                    personnel: 1200,
                    morale: 60,
                    cohesion: 55,
                    corps_id: 'corps_alpha',
                    location_osid: 'op:mun:o0',
                    home_osid: 'op:mun:o0',
                } as FormationState,
            },
            corps_command: {
                corps_zulu: {
                    commander_reinforcement_requests: [
                        { zone_id: 'zone:zulu', brigades_needed: 1, priority: 'high' },
                    ],
                    active_operations: [],
                },
                corps_alpha: {
                    commander_reinforcement_requests: [
                        { zone_id: 'zone:alpha', brigades_needed: 1, priority: 'high' },
                    ],
                    active_operations: [],
                },
            },
            corps_front_sectors: {
                zulu_sector: makeSector('corps_zulu', 'RS', 'op:mun:o2', { threat_ratio: 1 }),
                alpha_sector: makeSector('corps_alpha', 'RS', 'op:mun:o0', { threat_ratio: 1 }),
            },
            player_faction: 'RS',
            turn: 12,
        });
        makeChainFriendlyToCorps(state, 'RS', 3);

        generateArmyReserveRequests(state, adj);

        expect((state.military.pending_reserve_requests ?? []).map(request => request.corps_id)).toEqual([
            'corps_alpha',
            'corps_zulu',
        ]);
        expect(state.military.pending_reserve_requests?.[0].suggested_brigade_id).toBe('rs_elite_a');
        expect(state.military.pending_reserve_requests?.[1].suggested_brigade_id).toBe('rs_elite_z');
    });

    it('suggests the nearest elite with a friendly route to receiving corps territory', () => {
        const adj = new Map<Osid, Osid[]>([
            ['op:test:isolated', ['op:test:enemy'] as Osid[]],
            ['op:test:enemy', ['op:test:isolated', 'op:test:target'] as Osid[]],
            ['op:test:reachable', ['op:test:friendly-1'] as Osid[]],
            ['op:test:friendly-1', ['op:test:reachable', 'op:test:friendly-2'] as Osid[]],
            ['op:test:friendly-2', ['op:test:friendly-1', 'op:test:target'] as Osid[]],
            ['op:test:target', ['op:test:enemy', 'op:test:friendly-2'] as Osid[]],
        ]);
        const state = makeState({
            formations: {
                elite_isolated: makeElite('elite_isolated', 'RS', 'op:test:isolated'),
                elite_reachable: makeElite('elite_reachable', 'RS', 'op:test:reachable'),
                corps_line: {
                    id: 'corps_line',
                    faction: 'RS',
                    name: 'Corps Line Brigade',
                    created_turn: 0,
                    status: 'active',
                    kind: 'brigade',
                    assignment: null,
                    personnel: 1200,
                    morale: 60,
                    cohesion: 55,
                    corps_id: 'vrs_test_corps',
                    location_osid: 'op:test:target',
                    home_osid: 'op:test:target',
                } as FormationState,
            },
            corps_command: {
                vrs_test_corps: {
                    commander_reinforcement_requests: [],
                    active_operations: [{
                        name: 'Operation Reachability',
                        phase: 'execution',
                        momentum: 1,
                        participating_brigades: ['corps_line'],
                        axes: [],
                    }],
                },
            },
            corps_front_sectors: {
                test_sector: makeSector('vrs_test_corps', 'RS', 'op:test:target', {
                    threat_ratio: 1,
                    assigned_brigade_ids: ['corps_line'],
                }),
            },
            player_faction: 'RS',
            turn: 1,
        });
        state.political.political_controllers = {
            'op:test:isolated': 'RS',
            'op:test:enemy': 'RBiH',
            'op:test:reachable': 'RS',
            'op:test:friendly-1': 'RS',
            'op:test:friendly-2': 'RS',
            'op:test:target': 'RS',
        } as GameState['political']['political_controllers'];

        generateArmyReserveRequests(state, adj);

        expect(state.military.pending_reserve_requests).toHaveLength(1);
        expect(state.military.pending_reserve_requests?.[0]).toMatchObject({
            corps_id: 'vrs_test_corps',
            suggested_brigade_id: 'elite_reachable',
            travel_hops: 3,
        });
    });

    it('preserves active-operation execution evidence when a live offensive drives a reserve request', () => {
        const adj = chainAdj(6);
        const elite = makeElite('arbih_guards', 'RBiH', 'op:mun:o1');
        const frontline = {
            id: 'arbih_1st_corps_bde_1',
            faction: 'RBiH',
            name: '1st Corps Brigade',
            created_turn: 0,
            status: 'active',
            assignment: null,
            personnel: 1200,
            morale: 65,
            cohesion: 55,
            corps_id: 'arbih_1st_corps',
            location_osid: 'op:mun:o3',
            home_osid: 'op:mun:o3',
        } as unknown as FormationState;

        const state = makeState({
            formations: {
                arbih_guards: elite,
                arbih_1st_corps_bde_1: frontline,
            },
            corps_command: {
                arbih_1st_corps: {
                    commander_reinforcement_requests: [],
                    active_operations: [{
                        name: 'Operation Drina Spear',
                        phase: 'execution',
                        momentum: 2,
                        participating_brigades: ['arbih_1st_corps_bde_1'],
                        objectives: ['op:enemy:ridge'],
                        current_objective_index: 0,
                        axes: [{
                            axis_id: 'axis:main',
                            assigned_brigades: ['arbih_1st_corps_bde_1'],
                            objectives: ['op:enemy:ridge'],
                            current_objective_index: 0,
                            status: 'executing',
                            failure_count: 0,
                            consecutive_failures_on_current: 0,
                            momentum: 2,
                            attack_attempt_count: 1,
                            objective_capture_count: 0,
                            movement_only_execution_turns: 0,
                            idle_execution_turn_streak: 0,
                        }],
                    }],
                },
            },
            corps_front_sectors: {
                sec_a: {
                    corps_id: 'arbih_1st_corps',
                    threat_ratio: 1.2,
                    assigned_brigade_ids: ['arbih_1st_corps_bde_1'],
                },
            },
            player_faction: 'RBiH',
            turn: 10,
        });

        makeChainFriendlyToCorps(state, 'RBiH');
        generateArmyReserveRequests(state, adj);

        expect(state.military.pending_reserve_requests).toHaveLength(1);
        expect(state.military.pending_reserve_requests?.[0]).toMatchObject({
            corps_id: 'arbih_1st_corps',
            faction: 'RBiH',
            reason: 'offensive_support',
            provenance_driver: 'active_operation',
            operation_name: 'Operation Drina Spear',
            operation_phase: 'execution',
            operation_momentum: 2,
            suggested_brigade_id: 'arbih_guards',
        });
    });

    it('preserves preparation-sub-phase evidence when a staged operation drives a reserve request', () => {
        const adj = chainAdj(6);
        const elite = makeElite('arbih_guards', 'RBiH', 'op:mun:o1');
        const frontline = {
            id: 'arbih_2nd_corps_bde_1',
            faction: 'RBiH',
            name: '2nd Corps Brigade',
            created_turn: 0,
            status: 'active',
            assignment: null,
            personnel: 1200,
            morale: 65,
            cohesion: 55,
            corps_id: 'arbih_2nd_corps',
            location_osid: 'op:mun:o3',
            home_osid: 'op:mun:o3',
        } as unknown as FormationState;

        const state = makeState({
            formations: {
                arbih_guards: elite,
                arbih_2nd_corps_bde_1: frontline,
            },
            corps_command: {
                arbih_2nd_corps: {
                    commander_reinforcement_requests: [],
                    active_operations: [{
                        name: 'Operation Shield',
                        phase: 'planning',
                        preparation_sub_phase: 'ready',
                        participating_brigades: ['arbih_2nd_corps_bde_1'],
                        objectives: ['op:enemy:line'],
                        current_objective_index: 0,
                    }],
                },
            },
            corps_front_sectors: {
                sec_a: {
                    corps_id: 'arbih_2nd_corps',
                    threat_ratio: 1.2,
                    assigned_brigade_ids: ['arbih_2nd_corps_bde_1'],
                },
            },
            player_faction: 'RBiH',
            turn: 10,
        });

        makeChainFriendlyToCorps(state, 'RBiH');
        generateArmyReserveRequests(state, adj);

        expect(state.military.pending_reserve_requests).toHaveLength(1);
        expect(state.military.pending_reserve_requests?.[0]).toMatchObject({
            corps_id: 'arbih_2nd_corps',
            faction: 'RBiH',
            reason: 'offensive_support',
            provenance_driver: 'active_operation',
            operation_name: 'Operation Shield',
            operation_phase: 'planning',
            operation_preparation_sub_phase: 'ready',
            suggested_brigade_id: 'arbih_guards',
        });
    });

    it('preserves captured-objective evidence when recent gains open an exploitation request', () => {
        const adj = chainAdj(6);
        const elite = makeElite('arbih_guards', 'RBiH', 'op:mun:o1');
        const frontline = {
            id: 'arbih_5th_corps_bde_1',
            faction: 'RBiH',
            name: '5th Corps Brigade',
            created_turn: 0,
            status: 'active',
            assignment: null,
            personnel: 1200,
            morale: 65,
            cohesion: 55,
            corps_id: 'arbih_5th_corps',
            location_osid: 'op:mun:o3',
            home_osid: 'op:mun:o3',
        } as unknown as FormationState;

        const state = makeState({
            formations: {
                arbih_guards: elite,
                arbih_5th_corps_bde_1: frontline,
            },
            corps_command: {
                arbih_5th_corps: {
                    commander_reinforcement_requests: [],
                    active_operations: [{
                        name: 'Operation Pocket Break',
                        phase: 'execution',
                        momentum: 1,
                        objective_capture_count: 2,
                        participating_brigades: ['arbih_5th_corps_bde_1'],
                        objectives: ['op:enemy:ridge', 'op:enemy:crossroads'],
                        current_objective_index: 1,
                        axes: [{
                            axis_id: 'axis:main',
                            assigned_brigades: ['arbih_5th_corps_bde_1'],
                            objectives: ['op:enemy:ridge', 'op:enemy:crossroads'],
                            current_objective_index: 1,
                            status: 'executing',
                            failure_count: 0,
                            consecutive_failures_on_current: 0,
                            momentum: 1,
                            attack_attempt_count: 2,
                            objective_capture_count: 2,
                            movement_only_execution_turns: 0,
                            idle_execution_turn_streak: 0,
                        }],
                    }],
                },
            },
            corps_front_sectors: {
                sec_a: {
                    corps_id: 'arbih_5th_corps',
                    threat_ratio: 1.0,
                    assigned_brigade_ids: ['arbih_5th_corps_bde_1'],
                },
            },
            player_faction: 'RBiH',
            turn: 10,
        });

        makeChainFriendlyToCorps(state, 'RBiH');
        generateArmyReserveRequests(state, adj);

        expect(state.military.pending_reserve_requests).toHaveLength(1);
        expect(state.military.pending_reserve_requests?.[0]).toMatchObject({
            corps_id: 'arbih_5th_corps',
            faction: 'RBiH',
            reason: 'exploitation',
            provenance_driver: 'captured_objectives',
            operation_name: 'Operation Pocket Break',
            operation_phase: 'execution',
            operation_objective_capture_count: 2,
            suggested_brigade_id: 'arbih_guards',
        });
    });

    it('preserves concrete sector-threat evidence when a thin front triggers a reserve request', () => {
        const adj = chainAdj(6);
        const elite = makeElite('arbih_guards', 'RBiH', 'op:mun:o1');
        const frontline = {
            id: 'arbih_1st_corps_bde_1',
            faction: 'RBiH',
            name: '1st Corps Brigade',
            created_turn: 0,
            status: 'active',
            assignment: null,
            personnel: 1200,
            morale: 65,
            cohesion: 55,
            corps_id: 'arbih_1st_corps',
            location_osid: 'op:mun:o3',
            home_osid: 'op:mun:o3',
        } as unknown as FormationState;

        const state = makeState({
            formations: {
                arbih_guards: elite,
                arbih_1st_corps_bde_1: frontline,
            },
            corps_command: {
                arbih_1st_corps: {
                    commander_reinforcement_requests: [],
                    active_operations: [],
                },
            },
            corps_front_sectors: {
                sec_a: {
                    corps_id: 'arbih_1st_corps',
                    threat_ratio: 2.6,
                    assigned_brigade_ids: ['arbih_1st_corps_bde_1'],
                },
            },
            player_faction: 'RBiH',
            turn: 10,
        });

        makeChainFriendlyToCorps(state, 'RBiH');
        generateArmyReserveRequests(state, adj);

        expect(state.military.pending_reserve_requests).toHaveLength(1);
        expect(state.military.pending_reserve_requests?.[0]).toMatchObject({
            corps_id: 'arbih_1st_corps',
            faction: 'RBiH',
            reason: 'defensive_gap',
            provenance_driver: 'sector_threat',
            sector_threat_ratio: 2.6,
            sector_assigned_brigade_count: 1,
            suggested_brigade_id: 'arbih_guards',
        });
    });

    it('turns commander reinforcement pressure into a real reserve request even without heuristic sector triggers', () => {
        const adj = chainAdj(6);
        const elite = makeElite('rs_1st_guards', 'RS', 'op:mun:o1');
        const frontline = {
            id: 'vrs_2nd_krajina_bde_1',
            faction: 'RS',
            name: '2nd Krajina Brigade',
            created_turn: 0,
            status: 'active',
            assignment: null,
            personnel: 1200,
            morale: 65,
            cohesion: 55,
            corps_id: 'vrs_2nd_krajina',
            location_osid: 'op:mun:o3',
            home_osid: 'op:mun:o3',
        } as unknown as FormationState;

        const state = makeState({
            formations: {
                rs_1st_guards: elite,
                vrs_2nd_krajina_bde_1: frontline,
            },
            corps_command: {
                vrs_2nd_krajina: {
                    commander_reinforcement_requests: [
                        { zone_id: 'zone:vrs_2nd_krajina:ozren', brigades_needed: 2, priority: 'critical' },
                        { zone_id: 'zone:vrs_2nd_krajina:doboj', brigades_needed: 1, priority: 'medium' },
                    ],
                    active_operations: [],
                },
            },
            corps_front_sectors: {
                sec_a: {
                    corps_id: 'vrs_2nd_krajina',
                    threat_ratio: 1.2,
                    assigned_brigade_ids: ['vrs_2nd_krajina_bde_1'],
                },
            },
            player_faction: 'RBiH',
            turn: 10,
        });

        makeChainFriendlyToCorps(state, 'RS');
        generateArmyReserveRequests(state, adj);

        expect(state.military.pending_reserve_requests).toHaveLength(1);
        expect(state.military.pending_reserve_requests?.[0]).toMatchObject({
            corps_id: 'vrs_2nd_krajina',
            faction: 'RS',
            reason: 'defensive_gap',
            provenance_driver: 'commander_request',
            commander_request_priority: 'critical',
            commander_request_brigades_needed: 3,
            commander_focus_zone_id: 'zone:vrs_2nd_krajina:ozren',
            suggested_brigade_id: 'rs_1st_guards',
        });
        expect(state.military.pending_reserve_requests?.[0].description).toBe(
            'Commander reports critical reinforcement pressure across the active front',
        );
        expect(state.military.pending_reserve_requests?.[0].why_needed).not.toMatch(
            /vrs_2nd_krajina|zone:|3 brigade\(s\)/,
        );
        expect(state.military.pending_reserve_requests?.[0].priority).toBeGreaterThan(0);
    });
});
