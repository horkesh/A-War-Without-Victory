/**
 * Level 1 (Assisted) approval gates apply to the HUMAN PLAYER's corps only (2026-11-14).
 *
 * WHY. R8 dry-run run m (packaged app, "strategic autonomy" = Level 1) showed every RS and HRHB
 * corps commander plan "held at ready: awaiting player approval at Level 1" for the whole war,
 * because `applyCommanderOutput` and commander local occupation read the GLOBAL autonomy level with
 * no faction check, and only the human player can ever write `player_op_response`. RS generated
 * zero commander operations after week 20 and the 1992 islands it normally clears survived to 1995
 * (docs/40_reports/20261114_UNHELD_POCKETS_DIAGNOSIS.md §8).
 *
 * Contract pinned here:
 *   - Level 1: the player's corps are held until approved; bot corps plan and launch normally.
 *   - Levels 0 and 2: nothing is held, for any faction (unchanged).
 *   - Headless auto-control (no human player): nothing is held, even at Level 1.
 */

import { describe, it, expect } from 'vitest';
import type { CorpsCommandState, FactionId, GameState } from '../../../src/state/game_state.js';
import { applyCommanderOutput } from '../../../src/sim/combat/commander/commander_loop.js';
import { isLevel1PlayerApprovalFaction } from '../../../src/sim/bot/staff_control.js';

const CORPS: Record<FactionId, string> = {
    RBiH: 'arbih_test_corps',
    RS: 'vrs_test_corps',
    HRHB: 'hvo_test_corps',
};
const FACTIONS: FactionId[] = ['HRHB', 'RBiH', 'RS'];

function makeState(autonomyLevel: number, playerFaction: FactionId | undefined, headless = false): GameState {
    const formations: Record<string, unknown> = {};
    const corpsCommand: Record<string, CorpsCommandState> = {};
    for (const faction of FACTIONS) {
        const id = CORPS[faction];
        formations[id] = { id, faction, name: id, kind: 'corps', status: 'active', created_turn: 1, assignment: null };
        corpsCommand[id] = {
            command_span: 5,
            subordinate_count: 2,
            og_slots: 0,
            active_ogs: [],
            corps_exhaustion: 0,
            faction_war_exhaustion: 0,
            stance: 'offensive',
            active_operations: [],
            commander_state: {
                current_plan: { plan_id: `plan_${id}_t10`, status: 'ready' },
            },
        } as unknown as CorpsCommandState;
    }
    return {
        meta: {
            turn: 10,
            seed: 'level1-player-only',
            phase: 'war',
            autonomy_level: autonomyLevel,
            player_faction: playerFaction,
            headless_scenario_auto_control: headless,
        },
        factions: FACTIONS.map((id) => ({ id })),
        military: {
            formations,
            corps_command: corpsCommand,
            brigade_movement_orders: {},
        },
    } as unknown as GameState;
}

/** The commander advanced its plan to executing and emitted one operation this turn. */
function applyExecutingPlan(state: GameState, faction: FactionId): void {
    const id = CORPS[faction];
    applyCommanderOutput(state, id, {
        directive: { type: 'hold', target_zone: null },
        operations: [{
            name: `op_${id}`,
            type: 'sector_attack',
            phase: 'planning',
            sector_id: `sector:${id}:0`,
            objectives: [`op:test:${faction.toLowerCase()}_objective`],
            participating_brigades: [`${id}_b1`, `${id}_b2`],
            commander_officer_id: `officer_${id}`,
        }],
        sector_stances: [],
        updated_state: {
            current_plan: { plan_id: `plan_${id}_t10`, status: 'executing' },
        },
        reinforcement_requests: [],
        prepositioning_orders: [],
        plan_updates: [],
        garrison_locks: [],
    } as any);
}

function launched(state: GameState, faction: FactionId): string[] {
    return (state.military.corps_command?.[CORPS[faction]]?.active_operations ?? []).map((op) => op.name);
}

function planStatus(state: GameState, faction: FactionId): string | undefined {
    return state.military.corps_command?.[CORPS[faction]]?.commander_state?.current_plan?.status;
}

describe('Level 1 holds only the human player\'s corps', () => {
    it('at Level 1 with an RBiH player, RBiH is held while RS and HRHB bot corps launch', () => {
        const state = makeState(1, 'RBiH');
        for (const faction of FACTIONS) applyExecutingPlan(state, faction);

        expect(launched(state, 'RBiH')).toEqual([]);
        expect(planStatus(state, 'RBiH')).toBe('ready');
        expect(state.military.corps_command?.[CORPS.RBiH]?.status_reason)
            .toBe('plan held at ready: awaiting player approval at Level 1');

        for (const bot of ['RS', 'HRHB'] as FactionId[]) {
            expect(launched(state, bot)).toEqual([`op_${CORPS[bot]}`]);
            expect(planStatus(state, bot)).toBe('executing');
            expect(state.military.corps_command?.[CORPS[bot]]?.status_reason ?? '').not.toMatch(/Level 1/);
        }
    });

    it('at Level 1 with an RS player, RS is held while RBiH and HRHB bot corps launch', () => {
        const state = makeState(1, 'RS');
        for (const faction of FACTIONS) applyExecutingPlan(state, faction);

        expect(launched(state, 'RS')).toEqual([]);
        expect(planStatus(state, 'RS')).toBe('ready');
        expect(launched(state, 'RBiH')).toEqual([`op_${CORPS.RBiH}`]);
        expect(launched(state, 'HRHB')).toEqual([`op_${CORPS.HRHB}`]);
    });

    it('at Level 1 the player\'s approved plan still launches', () => {
        const state = makeState(1, 'RBiH');
        state.military.corps_command![CORPS.RBiH]!.player_op_response = {
            plan_id: `plan_${CORPS.RBiH}_t10`, approved: true, turn: 10,
        };
        applyExecutingPlan(state, 'RBiH');
        expect(launched(state, 'RBiH')).toEqual([`op_${CORPS.RBiH}`]);
        expect(state.military.corps_command?.[CORPS.RBiH]?.player_op_response).toBeUndefined();
    });

    it('in a headless auto-control run nothing is held, even at Level 1', () => {
        const state = makeState(1, undefined, true);
        for (const faction of FACTIONS) applyExecutingPlan(state, faction);
        for (const faction of FACTIONS) expect(launched(state, faction)).toEqual([`op_${CORPS[faction]}`]);
    });

    it.each([0, 2])('at Level %i nothing is held for any faction (unchanged)', (level) => {
        const state = makeState(level, 'RBiH');
        for (const faction of FACTIONS) applyExecutingPlan(state, faction);
        for (const faction of FACTIONS) {
            expect(launched(state, faction)).toEqual([`op_${CORPS[faction]}`]);
            expect(planStatus(state, faction)).toBe('executing');
        }
    });
});

describe('isLevel1PlayerApprovalFaction', () => {
    it('is true only for the human player faction at exactly Level 1', () => {
        expect(isLevel1PlayerApprovalFaction(makeState(1, 'RBiH'), 'RBiH')).toBe(true);
        expect(isLevel1PlayerApprovalFaction(makeState(1, 'RBiH'), 'RS')).toBe(false);
        expect(isLevel1PlayerApprovalFaction(makeState(1, 'RBiH'), 'HRHB')).toBe(false);
        expect(isLevel1PlayerApprovalFaction(makeState(1, 'RBiH'), undefined)).toBe(false);
        expect(isLevel1PlayerApprovalFaction(makeState(0, 'RBiH'), 'RBiH')).toBe(false);
        expect(isLevel1PlayerApprovalFaction(makeState(2, 'RBiH'), 'RBiH')).toBe(false);
        expect(isLevel1PlayerApprovalFaction(makeState(3, 'RBiH'), 'RBiH')).toBe(false);
        expect(isLevel1PlayerApprovalFaction(makeState(1, undefined), 'RBiH')).toBe(false);
        expect(isLevel1PlayerApprovalFaction(makeState(1, 'RBiH', true), 'RBiH')).toBe(false);
    });
});
