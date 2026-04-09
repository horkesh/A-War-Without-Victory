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
    createEliteLoanState,
    ELITE_LOAN_MIN_DURATION,
    ELITE_CASUALTY_THRESHOLD,
    ELITE_MORALE_RECALL,
    MAX_AUTO_DEPLOY_HOPS,
} from '../src/state/elite_loan_types.js';
import type { GameState, FormationState } from '../src/state/game_state.js';
import type { Osid } from '../src/sim/combat/osid_adjacency.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeElite(id: string, faction: string, locationOsid: string, overrides: Partial<FormationState> = {}): FormationState {
    return {
        id,
        faction,
        name: id,
        created_turn: 0,
        status: 'active',
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
        expect(state.military.pending_reserve_requests?.[0].description).toContain('Commander requested 3 brigade(s)');
        expect(state.military.pending_reserve_requests?.[0].description).toContain('critical priority');
        expect(state.military.pending_reserve_requests?.[0].priority).toBeGreaterThan(0);
    });
});
