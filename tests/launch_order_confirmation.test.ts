import { describe, expect, it } from 'vitest';

import {
    advanceSectorOffensives,
    confirmLaunchedOperationOrders,
} from '../src/sim/combat/sector_offensive.js';
import { generateAllBotOrdersOsid } from '../src/sim/combat/bot_brigade_ai_osid.js';
import { hasAvailableSlotIgnoringRecovery } from '../src/sim/combat/corps_operation_helpers.js';
import type { CorpsOperation, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { makeCorps, makeFormation } from './test_factories.js';

// P3 mismatch rider, fix B: an operation that launches (planning -> execution) and then gets
// zero participant attack orders and zero participant movement from the same turn's order
// emission is demoted back to planning; a second such launch ends it `zero_eligible_axis`.

const APPROACH = 'op:front:approach_a';
const OBJECTIVE = 'op:target:objective';
const SECTOR = 'sector:rbih_corps:0';
const WEAK_DEFENDER = 1000;
const STRONG_DEFENDER = 60000;

function makeLaunchState(turn = 20): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, phase: 'war', seed: 'launch-order-confirmation' } as any,
        factions: [
            { id: 'RBiH', areasOfResponsibility: [] },
            { id: 'RS', areasOfResponsibility: [] },
        ] as any,
        military: {
            formations: {
                rbih_corps: makeCorps({ id: 'rbih_corps', faction: 'RBiH', hq_sid: 'S1' }),
                b1: makeFormation({
                    id: 'b1',
                    faction: 'RBiH',
                    corps_id: 'rbih_corps',
                    hq_sid: 'S1',
                    location_osid: APPROACH,
                    personnel: 3000,
                    cohesion: 80,
                    posture: 'defend',
                }),
                enemy_main: makeFormation({
                    id: 'enemy_main',
                    faction: 'RS',
                    corps_id: 'rs_corps',
                    hq_sid: 'S2',
                    location_osid: OBJECTIVE,
                    personnel: WEAK_DEFENDER,
                    cohesion: 40,
                }),
            },
            corps_front_sectors: {
                [SECTOR]: {
                    sector_id: SECTOR,
                    corps_id: 'rbih_corps',
                    assigned_brigade_ids: ['b1'],
                    reserve_brigade_ids: [],
                    length_edges: 1,
                    territory_osids: [APPROACH],
                    sub_segments: [{
                        sub_segment_id: 'ss:0',
                        friendly_osids: [APPROACH],
                        enemy_osids: [OBJECTIVE],
                    }],
                },
            },
            corps_command: {
                rbih_corps: {
                    command_span: 1,
                    subordinate_count: 1,
                    og_slots: 0,
                    active_ogs: [],
                    corps_exhaustion: 0,
                    stance: 'offensive',
                    active_operations: [{
                        name: 'Operation Launch Confirmation',
                        type: 'sector_attack',
                        phase: 'planning',
                        started_turn: 18,
                        phase_started_turn: 18,
                        planning_duration: 1,
                        // Author-validated preparation: the fixture tests the launch, not the
                        // preparation state machine (tickPreparation returns 'ready').
                        is_pre_planned: true,
                        participating_brigades: ['b1'],
                        objectives: [OBJECTIVE],
                        current_objective_index: 0,
                        sector_id: SECTOR,
                        axes: [{
                            axis_id: 'main',
                            name: 'Main Axis',
                            assigned_brigades: ['b1'],
                            objectives: [OBJECTIVE],
                            current_objective_index: 0,
                            status: 'executing',
                            failure_count: 0,
                            consecutive_failures_on_current: 0,
                            momentum: 0,
                            attack_attempt_count: 0,
                            objective_capture_count: 0,
                            movement_only_execution_turns: 0,
                            idle_execution_turn_streak: 0,
                        }],
                    } as CorpsOperation],
                },
            },
            war_front_edges_osid: [{
                edge_id: 'front:approach-objective',
                a: APPROACH,
                b: OBJECTIVE,
                side_a: 'RBiH',
                side_b: 'RS',
            }] as any,
        } as any,
        political: {
            political_controllers: {
                [APPROACH]: 'RBiH',
                [OBJECTIVE]: 'RS',
            },
        } as any,
    } as GameState;
}

const ORDER_CONTEXT = {
    edges: [{ a: APPROACH, b: OBJECTIVE }] as any,
    reverseMap: new Map(),
    supplyStateByOsid: {} as any,
    osidPopulationMap: new Map(),
};

function opOf(state: GameState): CorpsOperation | undefined {
    return state.military.corps_command!.rbih_corps!.active_operations[0];
}

function setDefender(state: GameState, personnel: number): void {
    state.military.formations!.enemy_main!.personnel = personnel;
}

/** Advance the lifecycle, optionally drift the defender, then emit orders and confirm the launch. */
function runTurn(state: GameState, turn: number, defenderAtEmission: number) {
    state.meta.turn = turn;
    setDefender(state, WEAK_DEFENDER);
    advanceSectorOffensives(state);
    const phaseAfterLifecycle = opOf(state)?.phase;
    setDefender(state, defenderAtEmission);
    generateAllBotOrdersOsid(state, ['RBiH'], ORDER_CONTEXT);
    const attackOrder = state.military.brigade_attack_orders?.b1;
    const confirmation = confirmLaunchedOperationOrders(state, ['RBiH']);
    return { phaseAfterLifecycle, attackOrder, confirmation };
}

describe('launch order confirmation', () => {
    it('demotes a launch that gets zero participant orders, then re-launches it with an attack order', () => {
        const state = makeLaunchState();

        const first = runTurn(state, 20, STRONG_DEFENDER);
        expect(first.phaseAfterLifecycle).toBe('execution');
        expect(first.attackOrder).toBeUndefined();
        expect(opOf(state)?.phase).toBe('planning');
        expect(opOf(state)?.phase_started_turn).toBe(18);
        expect(opOf(state)?.launch_demotion_count).toBe(1);
        expect(state.military.opsec_sectors).toContain(SECTOR);
        expect(first.confirmation.demoted).toEqual(['rbih_corps:Operation Launch Confirmation:t18']);
        expect(first.confirmation.ended).toEqual([]);

        const second = runTurn(state, 21, WEAK_DEFENDER);
        expect(second.phaseAfterLifecycle).toBe('execution');
        expect(second.attackOrder).toBe(OBJECTIVE);
        expect(opOf(state)?.phase).toBe('execution');
        expect(opOf(state)?.phase_started_turn).toBe(21);
        expect(opOf(state)?.launch_demotion_count).toBe(1);
        expect(second.confirmation.demoted).toEqual([]);
        expect(second.confirmation.ended).toEqual([]);
    });

    it('ends a second zero-order launch zero_eligible_axis and frees the slot', () => {
        const state = makeLaunchState();

        runTurn(state, 20, STRONG_DEFENDER);
        expect(opOf(state)?.phase).toBe('planning');

        const second = runTurn(state, 21, STRONG_DEFENDER);
        expect(second.phaseAfterLifecycle).toBe('execution');
        expect(opOf(state)?.phase).toBe('recovery');
        expect(opOf(state)?.recovery_reason).toBe('zero_eligible_axis');
        expect(opOf(state)?.launch_demotion_count).toBe(2);
        expect(second.confirmation.ended).toEqual(['rbih_corps:Operation Launch Confirmation:t18']);

        state.meta.turn = 22;
        advanceSectorOffensives(state);
        const cmd = state.military.corps_command!.rbih_corps!;
        expect(hasAvailableSlotIgnoringRecovery(cmd, 1)).toBe(true);
    });

    it('leaves a launch with a participant attack order untouched', () => {
        const state = makeLaunchState();
        const run = runTurn(state, 20, WEAK_DEFENDER);
        expect(run.attackOrder).toBe(OBJECTIVE);
        expect(opOf(state)?.phase).toBe('execution');
        expect(opOf(state)?.launch_demotion_count).toBeUndefined();
    });

    it('leaves a player force-launched operation untouched', () => {
        const state = makeLaunchState();
        opOf(state)!.was_force_launched = true;
        runTurn(state, 20, STRONG_DEFENDER);
        expect(opOf(state)?.phase).toBe('execution');
        expect(opOf(state)?.launch_demotion_count).toBeUndefined();
    });

    it('leaves operations of factions that did not emit bot orders untouched', () => {
        const state = makeLaunchState();
        state.meta.turn = 20;
        advanceSectorOffensives(state);
        setDefender(state, STRONG_DEFENDER);
        generateAllBotOrdersOsid(state, ['RBiH'], ORDER_CONTEXT);
        const confirmation = confirmLaunchedOperationOrders(state, ['RS']);
        expect(confirmation.demoted).toEqual([]);
        expect(opOf(state)?.phase).toBe('execution');
    });

    it('pin: a COHA-paused execution op whose clock shifted onto this turn is untouched', () => {
        const state = makeLaunchState();
        const op = opOf(state)!;
        op.phase = 'execution';
        op.phase_started_turn = 19;
        op.planning_phase_started_turn = 18;
        (state.military as any).event_flags = { coha_active: true };
        state.meta.turn = 20;

        advanceSectorOffensives(state);
        expect(op.phase_started_turn).toBe(20);
        const confirmation = confirmLaunchedOperationOrders(state, ['RBiH']);

        expect(confirmation.demoted).toEqual([]);
        expect(op.phase).toBe('execution');
        expect(op.phase_started_turn).toBe(20);
        expect(op.launch_demotion_count).toBeUndefined();
    });

    it('is deterministic: identical inputs give identical state and receipts', () => {
        const a = makeLaunchState();
        const b = makeLaunchState();
        const ra = runTurn(a, 20, STRONG_DEFENDER);
        const rb = runTurn(b, 20, STRONG_DEFENDER);
        expect(ra.confirmation).toEqual(rb.confirmation);
        expect(JSON.stringify(a.military.corps_command)).toBe(JSON.stringify(b.military.corps_command));
    });
});
