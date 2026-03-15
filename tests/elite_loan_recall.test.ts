/**
 * Tests for elite loan cohesion recall (#37) and tracker instrumentation (#38).
 */
import { describe, it, expect } from 'vitest';
import { tickEliteLoans, deployEliteLoan, recallEliteLoan } from '../src/sim/combat/army_reserve_system.js';
import { recordBrigadeEngagement } from '../src/sim/combat/brigade_history_recorder.js';
import {
    ELITE_COHESION_RECALL,
    ELITE_MORALE_RECALL,
    createEliteLoanState,
    createEliteBrigadeTracker,
} from '../src/state/elite_loan_types.js';
import type { GameState, FormationState } from '../src/state/game_state.js';
import { createEmptyBrigadeHistory } from '../src/state/brigade_history.js';

function makeMinimalState(overrides?: Partial<GameState>): GameState {
    return {
        meta: { turn: 10, phase: 'war', player_faction: 'RBiH', ...(overrides?.meta ?? {}) } as any,
        military: {
            formations: {},
            corps_command: {},
            corps_front_sectors: {},
            elite_brigade_tracker: {},
            pending_reserve_requests: [],
            ...(overrides?.military ?? {}),
        } as any,
        political: {} as any,
        displacement: {} as any,
    } as GameState;
}

function makeEliteFormation(id: string, overrides?: Partial<FormationState>): FormationState {
    return {
        id,
        faction: 'RS',
        name: 'Test Elite',
        created_turn: 0,
        status: 'active',
        assignment: null,
        personnel: 3000,
        morale: 60,
        cohesion: 50,
        corps_id: 'vrs_main_staff',
        home_osid: 'op:pale:pale_2',
        location_osid: 'op:pale:pale_2',
        elite_loan_state: {
            ...createEliteLoanState(),
            on_loan: true,
            loaned_to_corps: 'vrs_drina',
            loan_start_turn: 1,
            loan_start_personnel: 3000,
            current_episode_id: 0,
        },
        ...overrides,
    } as FormationState;
}

describe('Elite cohesion recall (#37)', () => {
    it('force-recalls when cohesion drops below ELITE_COHESION_RECALL', () => {
        const f = makeEliteFormation('rs_1st_guards', { cohesion: ELITE_COHESION_RECALL - 1 });
        const state = makeMinimalState({
            military: {
                formations: { rs_1st_guards: f },
                corps_command: { vrs_drina: {} },
                corps_front_sectors: {},
                elite_brigade_tracker: {
                    rs_1st_guards: {
                        ...createEliteBrigadeTracker('rs_1st_guards'),
                        episodes: [{
                            episode_id: 0, corps_id: 'vrs_drina', reason: 'offensive_support',
                            loan_start_turn: 1, loan_end_turn: null, recall_reason: null,
                            travel_hops: 3, personnel_start: 3000, personnel_end: null,
                            casualties_taken: 0, battles_fought: 0, osids_captured: 0, kia_inflicted_est: 0,
                        }],
                    },
                },
                pending_reserve_requests: [],
            } as any,
        });

        tickEliteLoans(state, 10);

        expect(f.elite_loan_state!.on_loan).toBe(false);
        const episode = state.military.elite_brigade_tracker!['rs_1st_guards'].episodes[0];
        expect(episode.recall_reason).toBe('cohesion_collapse');
        expect(episode.loan_end_turn).toBe(10);
    });

    it('does NOT recall when cohesion is at or above threshold', () => {
        const f = makeEliteFormation('rs_1st_guards', { cohesion: ELITE_COHESION_RECALL });
        const state = makeMinimalState({
            military: {
                formations: { rs_1st_guards: f },
                corps_command: { vrs_drina: { active_operation: { phase: 'execution', name: 'Op Test', participating_brigades: ['rs_1st_guards'], axes: [] } } },
                corps_front_sectors: {},
                elite_brigade_tracker: {
                    rs_1st_guards: {
                        ...createEliteBrigadeTracker('rs_1st_guards'),
                        episodes: [{
                            episode_id: 0, corps_id: 'vrs_drina', reason: 'offensive_support',
                            loan_start_turn: 1, loan_end_turn: null, recall_reason: null,
                            travel_hops: 3, personnel_start: 3000, personnel_end: null,
                            casualties_taken: 0, battles_fought: 0, osids_captured: 0, kia_inflicted_est: 0,
                        }],
                    },
                },
                pending_reserve_requests: [],
            } as any,
        });

        tickEliteLoans(state, 10);

        // Should still be on loan (active op keeps it deployed)
        expect(f.elite_loan_state!.on_loan).toBe(true);
    });
});

describe('Elite tracker instrumentation (#38)', () => {
    it('updates episode counters when recording a battle engagement', () => {
        const f = makeEliteFormation('rs_1st_guards');
        const state = makeMinimalState({
            military: {
                formations: { rs_1st_guards: f },
                corps_command: {},
                corps_front_sectors: {},
                elite_brigade_tracker: {
                    rs_1st_guards: {
                        ...createEliteBrigadeTracker('rs_1st_guards'),
                        episodes: [{
                            episode_id: 0, corps_id: 'vrs_drina', reason: 'offensive_support',
                            loan_start_turn: 1, loan_end_turn: null, recall_reason: null,
                            travel_hops: 3, personnel_start: 3000, personnel_end: null,
                            casualties_taken: 0, battles_fought: 0, osids_captured: 0, kia_inflicted_est: 0,
                        }],
                    },
                },
                pending_reserve_requests: [],
            } as any,
        });

        // Record two engagements
        recordBrigadeEngagement(f, {
            turn: 5, osid: 'op:foca:foca_3', role: 'attacker', outcome: 'victory',
            casualties_taken: 120, casualties_inflicted: 200, enemy_faction: 'RBiH',
            territory_flipped: true, was_concentrated: false,
        }, state);

        recordBrigadeEngagement(f, {
            turn: 6, osid: 'op:foca:kosman', role: 'attacker', outcome: 'stalemate',
            casualties_taken: 80, casualties_inflicted: 50, enemy_faction: 'RBiH',
            territory_flipped: false, was_concentrated: false,
        }, state);

        const episode = state.military.elite_brigade_tracker!['rs_1st_guards'].episodes[0];
        expect(episode.battles_fought).toBe(2);
        expect(episode.casualties_taken).toBe(200); // 120 + 80
        expect(episode.osids_captured).toBe(1); // only the first had territory_flipped
        expect(episode.kia_inflicted_est).toBe(250); // 200 + 50
    });

    it('does not update episode when brigade is not on loan', () => {
        const f = makeEliteFormation('rs_1st_guards', {
            elite_loan_state: { ...createEliteLoanState(), on_loan: false },
        });
        const state = makeMinimalState({
            military: {
                formations: { rs_1st_guards: f },
                corps_command: {},
                corps_front_sectors: {},
                elite_brigade_tracker: {
                    rs_1st_guards: {
                        ...createEliteBrigadeTracker('rs_1st_guards'),
                        episodes: [],
                    },
                },
                pending_reserve_requests: [],
            } as any,
        });

        recordBrigadeEngagement(f, {
            turn: 5, osid: 'op:foca:foca_3', role: 'attacker', outcome: 'victory',
            casualties_taken: 120, casualties_inflicted: 200, enemy_faction: 'RBiH',
            territory_flipped: true, was_concentrated: false,
        }, state);

        // No episodes, nothing to update — should not crash
        expect(state.military.elite_brigade_tracker!['rs_1st_guards'].episodes.length).toBe(0);
    });

    it('syncs episode totals to tracker on recall', () => {
        const f = makeEliteFormation('rs_1st_guards', { personnel: 2700 });
        const state = makeMinimalState({
            military: {
                formations: { rs_1st_guards: f },
                corps_command: {},
                corps_front_sectors: {},
                elite_brigade_tracker: {
                    rs_1st_guards: {
                        ...createEliteBrigadeTracker('rs_1st_guards'),
                        total_loans: 1,
                        episodes: [{
                            episode_id: 0, corps_id: 'vrs_drina', reason: 'offensive_support',
                            loan_start_turn: 1, loan_end_turn: null, recall_reason: null,
                            travel_hops: 3, personnel_start: 3000, personnel_end: null,
                            casualties_taken: 200, battles_fought: 3, osids_captured: 1, kia_inflicted_est: 350,
                        }],
                    },
                },
                pending_reserve_requests: [],
            } as any,
        });

        recallEliteLoan(state, 'rs_1st_guards', 'op_complete', 15);

        const tracker = state.military.elite_brigade_tracker!['rs_1st_guards'];
        const episode = tracker.episodes[0];

        // Episode closed
        expect(episode.loan_end_turn).toBe(15);
        expect(episode.recall_reason).toBe('op_complete');
        expect(episode.personnel_end).toBe(2700);
        // casualties_taken: max(real-time 200, personnel delta 300) = 300
        expect(episode.casualties_taken).toBe(300);
        // Tracker totals synced from episode
        expect(tracker.total_casualties_taken).toBe(300);
        expect(tracker.total_battles).toBe(3);
        expect(tracker.total_osids_captured).toBe(1);
    });
});
