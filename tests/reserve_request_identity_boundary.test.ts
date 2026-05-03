import { describe, expect, it } from 'vitest';
import { approveReserveRequest } from '../src/desktop/desktop_sim.js';
import type { FormationState, GameState } from '../src/state/game_state.js';

function makeElite(id: string, faction: string, locationOsid: string): FormationState {
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
        elite_loan_state: {
            on_loan: false,
            loaned_to_corps: null,
            loan_start_turn: null,
            last_recall_turn: null,
            loan_start_personnel: 2000,
            permanently_degraded: false,
            current_episode_id: null,
        },
    } as FormationState;
}

function makeState(overrides: {
    formations?: Record<string, FormationState>;
    corps_front_sectors?: Record<string, any>;
    pending_reserve_requests?: any[];
    turn?: number;
} = {}): GameState {
    return {
        meta: {
            turn: overrides.turn ?? 10,
            phase: 'war',
            player_faction: 'RBiH',
        },
        military: {
            formations: overrides.formations ?? {},
            brigade_movement_orders: {},
            brigade_movement_state: {},
            corps_front_sectors: overrides.corps_front_sectors ?? {},
            pending_reserve_requests: overrides.pending_reserve_requests ?? [],
            reserve_request_history: [],
            elite_brigade_tracker: {},
        },
        factions: [],
        political: { political_controllers: {} },
    } as unknown as GameState;
}

describe('reserve request identity boundary', () => {
    it('approves only the selected request_id even when multiple pending requests share a corps', async () => {
        const brigade = makeElite('arbih_guards', 'RBiH', 'op:bihac:bihac_2');
        const state = makeState({
            formations: { arbih_guards: brigade },
            corps_front_sectors: {
                sec_a: {
                    corps_id: 'arbih_1st_corps',
                    territory_osids: ['op:bihac:bihac_2'],
                    assigned_brigade_ids: [],
                    reserve_brigade_ids: [],
                },
            },
            pending_reserve_requests: [
                {
                    request_id: 'req-alpha',
                    corps_id: 'arbih_1st_corps',
                    faction: 'RBiH',
                    reason: 'defensive_gap',
                    description: 'Hold the line',
                    turn_requested: 10,
                    travel_hops: 0,
                    suggested_brigade_id: 'arbih_guards',
                },
                {
                    request_id: 'req-beta',
                    corps_id: 'arbih_1st_corps',
                    faction: 'RBiH',
                    reason: 'offensive_support',
                    description: 'Exploit the breach',
                    turn_requested: 10,
                    travel_hops: 0,
                    suggested_brigade_id: 'arbih_guards',
                },
            ],
        });
        state.political.political_controllers = {
            'op:bihac:bihac_2': 'RBiH',
        } as any;

        const result = await approveReserveRequest(
            state,
            'req-beta',
            'arbih_guards',
            'Army CO accepts the selected request.',
            process.cwd(),
        );

        expect(result.ok).toBe(true);
        expect(state.military.pending_reserve_requests?.map((request) => request.request_id)).toEqual(['req-alpha']);
        expect(state.military.reserve_request_history).toHaveLength(1);
        expect(state.military.reserve_request_history?.[0]?.request_id).toBe('req-beta');
        expect(state.military.reserve_request_history?.[0]?.reason).toBe('Army CO accepts the selected request.');
    });

});
