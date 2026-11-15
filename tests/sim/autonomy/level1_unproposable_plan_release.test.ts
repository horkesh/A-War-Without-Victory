/**
 * L3c (2026-11-15): a Level-1 plan that can never be put to the President is released, not held.
 *
 * WHY. `tryCreateFromPrePlanned` (removed in RF-L3d) read `briefing.pre_planned_ops[0]` as an operation definition, but
 * the briefing passes `corps_command.queued_operations`, which is a list of operation NAMES. The
 * adopted plan therefore has no name (`..._pre_planned_op`) and no `target_osids`. In live Assisted
 * play `arbih_1st_corps` held `plan_arbih_1st_corps_t15_pre_planned_op` at `ready` from turn 15 to the
 * end: `generateLevel1OpProposals` never proposes a plan without targets, so the hold waited for an
 * answer that could never be asked, and no new plan could start. A bot corps' identical plan emits
 * no operation (a non-opportunity plan needs targets) and is cleared on its next pass.
 *
 * Contract pinned here:
 *   - One rule (`isLevel1ProposablePlan`) decides both "can be proposed" and "may be held".
 *   - Player corps at Level 1: a plan without targets is released (no operation, commander replans).
 *   - A plan with targets is still held for an answer (unchanged).
 *   - Bot corps and headless auto-control never reach the guard (unchanged).
 */

import { describe, it, expect } from 'vitest';
import type { CorpsCommandState, FactionId, GameState } from '../../../src/state/game_state.js';
import { applyCommanderOutput } from '../../../src/sim/combat/commander/commander_loop.js';
import { generateLevel1OpProposals } from '../../../src/sim/ai_commander/proposal_generation.js';
import { isLevel1ProposablePlan } from '../../../src/sim/bot/staff_control.js';

const PLAYER = 'arbih_1st_corps';
const BOT = 'vrs_1st_krajina_corps';
const EMPTY_PLAN_ID = `plan_${PLAYER}_t15_pre_planned_op`;

function makeState(opts: { headless?: boolean; targets?: string[] } = {}): GameState {
    const corps = (id: string, faction: FactionId) => ({
        formation: { id, faction, name: id, kind: 'corps', status: 'active', created_turn: 1, assignment: null },
        command: {
            command_span: 5, subordinate_count: 2, og_slots: 0, active_ogs: [], corps_exhaustion: 0,
            faction_war_exhaustion: 0, stance: 'offensive', active_operations: [],
            commander_state: {
                current_plan: {
                    plan_id: id === PLAYER ? EMPTY_PLAN_ID : `plan_${id}_t15_pre_planned_op`,
                    objective_description: 'pre_planned_op', status: 'ready', source: 'pre_planned',
                    target_osids: opts.targets ?? [], assigned_brigades: [], staging_zone: `zone:${id}:0`,
                },
            },
        } as unknown as CorpsCommandState,
    });
    const player = corps(PLAYER, 'RBiH');
    const bot = corps(BOT, 'RS');
    return {
        meta: {
            turn: 16, seed: 'l3c', phase: 'war', autonomy_level: 1, player_faction: 'RBiH',
            headless_scenario_auto_control: opts.headless ?? false,
        },
        factions: [{ id: 'RBiH' }, { id: 'RS' }],
        military: {
            formations: { [PLAYER]: player.formation, [BOT]: bot.formation },
            corps_command: { [PLAYER]: player.command, [BOT]: bot.command },
            brigade_movement_orders: {},
        },
    } as unknown as GameState;
}

/** The commander advanced its ready plan to executing; `operations` is what emit produced. */
function applyExecuting(state: GameState, id: string, targets: string[], operations: unknown[] = []): void {
    const planId = state.military.corps_command![id]!.commander_state!.current_plan!.plan_id;
    applyCommanderOutput(state, id, {
        directive: { type: 'hold', target_zone: null },
        operations,
        sector_stances: [],
        updated_state: { current_plan: { plan_id: planId, status: 'executing', source: 'pre_planned', target_osids: targets } },
        reinforcement_requests: [], prepositioning_orders: [], plan_updates: [], garrison_locks: [],
    } as any);
}

const cmd = (state: GameState, id: string) => state.military.corps_command![id]!;
const op = (id: string) => ({
    name: `op_${id}`, type: 'sector_attack', phase: 'planning', sector_id: `sector:${id}:0`,
    objectives: ['op:test:objective'], participating_brigades: [`${id}_b1`, `${id}_b2`], commander_officer_id: `officer_${id}`,
});

describe('L3c: a Level-1 plan with no objective is released, not held for an answer that cannot come', () => {
    it('one rule decides what can be proposed', () => {
        expect(isLevel1ProposablePlan({ target_osids: ['op:x:1'] })).toBe(true);
        expect(isLevel1ProposablePlan({ target_osids: [] })).toBe(false);
        expect(isLevel1ProposablePlan({})).toBe(false);
        expect(isLevel1ProposablePlan(null)).toBe(false);
    });

    it('the empty-target plan is never proposed (precondition of the old stuck state)', () => {
        expect(generateLevel1OpProposals(makeState(), 'RBiH')).toEqual([]);
        expect(generateLevel1OpProposals(makeState({ targets: ['op:test:objective'] }), 'RBiH')).toHaveLength(1);
    });

    it('a player corps at Level 1 releases it: no operation, the commander replans', () => {
        const state = makeState();
        applyExecuting(state, PLAYER, []);
        expect(cmd(state, PLAYER).active_operations).toEqual([]);
        expect(cmd(state, PLAYER).commander_state?.current_plan).toBeNull();
        expect(cmd(state, PLAYER).status_reason).toBe('plan released: no objective to put to the president at Level 1');
    });

    it('control: a plan with targets is still held at ready for the President\'s answer', () => {
        const state = makeState({ targets: ['op:test:objective'] });
        applyExecuting(state, PLAYER, ['op:test:objective'], [op(PLAYER)]);
        expect(cmd(state, PLAYER).active_operations).toEqual([]);
        expect(cmd(state, PLAYER).commander_state?.current_plan?.status).toBe('ready');
        expect(cmd(state, PLAYER).status_reason).toBe('plan held at ready: awaiting player approval at Level 1');
    });

    it('bot corps and headless auto-control are unchanged (no guard, plan proceeds)', () => {
        const state = makeState();
        applyExecuting(state, BOT, []);
        expect(cmd(state, BOT).commander_state?.current_plan?.status).toBe('executing');
        expect(cmd(state, BOT).status_reason ?? '').not.toMatch(/Level 1/);

        const headless = makeState({ headless: true });
        applyExecuting(headless, PLAYER, []);
        expect(cmd(headless, PLAYER).commander_state?.current_plan?.status).toBe('executing');
    });
});
