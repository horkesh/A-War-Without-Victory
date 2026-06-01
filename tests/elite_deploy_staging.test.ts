/**
 * ELITE-DEPLOY presidential lever (Presidential Command Model) — CA cost tests.
 *
 * Covers the command-authority guard + debit added to approveReserveRequest (the
 * PLAYER IPC path) in src/desktop/desktop_sim.ts:
 *   1. Successful approve debits ELITE_DEPLOY_COST from current/spent_this_turn/lifetime_spent.
 *   2. Insufficient command authority rejects with insufficient_command_authority,
 *      deploying NOTHING and debiting NOTHING (no partial charge for a rejected approval).
 *   3. Absent command_authority (headless / pre-Phase-2 saves) is a no-op — deploy proceeds,
 *      nothing is charged (the bot/calibration auto-deploy path is unaffected).
 *   4. TS↔CJS parity of the ELITE_DEPLOY_COST constant.
 *
 * Fixture mirrors reserve_request_identity_boundary.test.ts: a co-located elite
 * brigade + corps sector on the SAME OSID makes the friendly route reachable with
 * the real on-disk adjacency (process.cwd() baseDir), so route validation passes
 * and the CA guard/debit ordering (validate → guard → debit → deploy) is exercised.
 */
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { approveReserveRequest } from '../src/desktop/desktop_sim.js';
import { ELITE_DEPLOY_COST } from '../src/ui/map/utils/commandAuthority.js';
import type { CommandAuthority, FormationState, GameState } from '../src/state/game_state.js';

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

function makeState(commandAuthority?: CommandAuthority): GameState {
    const brigade = makeElite('arbih_guards', 'RBiH', 'op:bihac:bihac_2');
    const state = {
        meta: { turn: 10, phase: 'war', player_faction: 'RBiH' },
        military: {
            formations: { arbih_guards: brigade },
            brigade_movement_orders: {},
            brigade_movement_state: {},
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
            ],
            reserve_request_history: [],
            elite_brigade_tracker: {},
            ...(commandAuthority ? { command_authority: commandAuthority } : {}),
        },
        factions: [],
        political: { political_controllers: { 'op:bihac:bihac_2': 'RBiH' } },
    } as unknown as GameState;
    return state;
}

describe('ELITE-DEPLOY — command-authority guard + debit (player IPC path)', () => {
    it('debits ELITE_DEPLOY_COST on a successful approve', async () => {
        const state = makeState({ current: 80, max: 100, spent_this_turn: 5, lifetime_spent: 20 });
        const result = await approveReserveRequest(state, 'req-alpha', 'arbih_guards', undefined, process.cwd());

        expect(result.ok).toBe(true);
        const auth = state.military.command_authority!;
        expect(auth.current).toBe(80 - ELITE_DEPLOY_COST);
        expect(auth.spent_this_turn).toBe(5 + ELITE_DEPLOY_COST);
        expect(auth.lifetime_spent).toBe(20 + ELITE_DEPLOY_COST);
        // The brigade was actually deployed (loan committed).
        expect(state.military.formations!.arbih_guards.elite_loan_state!.on_loan).toBe(true);
    });

    it('rejects with insufficient_command_authority and debits/deploys NOTHING', async () => {
        const state = makeState({ current: ELITE_DEPLOY_COST - 1, max: 100, spent_this_turn: 0, lifetime_spent: 0 });
        const result = await approveReserveRequest(state, 'req-alpha', 'arbih_guards', undefined, process.cwd());

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.error).toContain('insufficient_command_authority');
        const auth = state.military.command_authority!;
        // Nothing charged.
        expect(auth.current).toBe(ELITE_DEPLOY_COST - 1);
        expect(auth.spent_this_turn).toBe(0);
        expect(auth.lifetime_spent).toBe(0);
        // Nothing deployed.
        expect(state.military.formations!.arbih_guards.elite_loan_state!.on_loan).toBe(false);
        // Request remains pending (not consumed).
        expect(state.military.pending_reserve_requests?.map((r) => r.request_id)).toEqual(['req-alpha']);
    });

    it('is a no-op when command_authority is absent (headless / pre-Phase-2): deploys, charges nothing', async () => {
        const state = makeState(); // no command_authority
        const result = await approveReserveRequest(state, 'req-alpha', 'arbih_guards', undefined, process.cwd());

        expect(result.ok).toBe(true);
        expect(state.military.command_authority).toBeUndefined();
        expect(state.military.formations!.arbih_guards.elite_loan_state!.on_loan).toBe(true);
    });
});

describe('ELITE_DEPLOY_COST — TS ↔ CJS contract parity', () => {
    it('matches the CJS mirror in autonomy_ipc_contract.cjs', () => {
        const require = createRequire(import.meta.url);
        const cjs = require('../src/desktop/autonomy_ipc_contract.cjs') as { ELITE_DEPLOY_COST: number };
        expect(cjs.ELITE_DEPLOY_COST).toBe(ELITE_DEPLOY_COST);
    });
});
