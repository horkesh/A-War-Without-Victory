import { describe, expect, it } from 'vitest';

import type { CorpsOperation, FactionId, FormationState, GameState } from '../src/state/game_state.js';
import { advanceSectorOffensives } from '../src/sim/combat/sector_offensive.js';
import { hasAvailableSlot } from '../src/sim/combat/corps_operation_helpers.js';
import {
    buildCombatCausalitySummary,
    buildOperationCombatDiagnostics,
} from '../src/scenario/combat_causality.js';

// P3 mismatch rider, class 3: a planning op that outlives its planning_duration is visible
// as `planning_grace_op_weeks` (report-only); the existing grace exit still ends it.

function makeMinimalState(turn: number, formations: Record<string, Partial<FormationState>>): GameState {
    const fmts: Record<string, FormationState> = {};
    for (const [id, partial] of Object.entries(formations)) {
        fmts[id] = {
            id,
            name: id,
            faction: 'RS' as FactionId,
            kind: 'brigade',
            status: 'active',
            personnel: 2000,
            location_osid: 'op:test:1',
            ...partial,
        } as FormationState;
    }
    return {
        meta: { turn, phase: 'war', scenario_start_date: { year: 1992, month: 4, day: 6 }, seed: 'test' } as GameState['meta'],
        factions: [{ id: 'RS' as FactionId }] as GameState['factions'],
        military: {
            formations: fmts,
            corps_command: {},
            corps_front_sectors: {},
        } as any,
        political: {
            political_controllers: {},
        } as any,
    } as GameState;
}

function makeStalledPlanningState(turn: number): GameState {
    const state = makeMinimalState(turn, {
        corps_1: { kind: 'corps' as any, personnel: 50 },
        b1: { corps_id: 'corps_1' as any, location_osid: 'op:rear:far', personnel: 2000, cohesion: 70 },
        d1: { faction: 'RBiH' as FactionId, location_osid: 'op:e:1', personnel: 1500 },
    });
    state.political = {
        political_controllers: {
            'op:a:1': 'RS',
            'op:rear:far': 'RS',
            'op:e:1': 'RBiH',
        },
    } as any;
    state.military.corps_front_sectors = {
        'sector:corps_1:0': {
            sector_id: 'sector:corps_1:0',
            corps_id: 'corps_1',
            faction: 'RS',
            sub_segments: [{ sub_segment_id: 'ss:0', friendly_osids: ['op:a:1'], enemy_osids: ['op:e:1'] }],
            territory_osids: ['op:a:1', 'op:rear:far'],
            assigned_brigade_ids: ['b1'],
            reserve_brigade_ids: [],
        },
    } as any;
    const operation: CorpsOperation = {
        name: 'Operacija Zastoj',
        type: 'sector_attack',
        phase: 'planning',
        started_turn: 10,
        phase_started_turn: 10,
        planning_duration: 1,
        participating_brigades: ['b1'] as any,
        objectives: ['op:e:1'],
        current_objective_index: 0,
        sector_id: 'sector:corps_1:0',
        axes: [{
            axis_id: 'main',
            name: 'Main Axis',
            assigned_brigades: ['b1'] as any,
            objectives: ['op:e:1'],
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
    } as CorpsOperation;
    state.military.corps_command = {
        corps_1: {
            command_span: 1,
            subordinate_count: 1,
            og_slots: 0,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'offensive',
            active_operations: [operation],
        },
    } as any;
    return state;
}

function opOf(state: GameState): CorpsOperation | undefined {
    return state.military.corps_command!.corps_1!.active_operations[0];
}

describe('planning stall visibility', () => {
    it('counts planning weeks past planning_duration as planning_grace_op_weeks', () => {
        const state = makeStalledPlanningState(12);

        advanceSectorOffensives(state);
        expect(opOf(state)?.phase).toBe('planning');
        const week12 = buildOperationCombatDiagnostics(state, undefined, undefined);
        const summary12 = buildCombatCausalitySummary(week12, undefined, undefined);
        expect(week12[0]!.planning_grace_week).toBe(true);
        expect(summary12.planning_grace_op_weeks).toBe(1);

        state.meta.turn = 13;
        advanceSectorOffensives(state);
        expect(opOf(state)?.phase).toBe('planning');
        const week13 = buildOperationCombatDiagnostics(state, undefined, undefined);
        const summary13 = buildCombatCausalitySummary(week13, undefined, undefined);
        expect(summary12.planning_grace_op_weeks + summary13.planning_grace_op_weeks).toBe(2);
        expect(summary13.invalid_operation_count).toBe(0);
    });

    it('does not count a planning week inside planning_duration', () => {
        const state = makeStalledPlanningState(11);
        const diagnostics = buildOperationCombatDiagnostics(state, undefined, undefined);
        expect(diagnostics[0]!.planning_grace_week).toBeUndefined();
        expect(buildCombatCausalitySummary(diagnostics, undefined, undefined).planning_grace_op_weeks).toBe(0);
    });

    it('pin: the existing grace exit ends the stalled plan zero_eligible_axis and frees the slot next turn', () => {
        const state = makeStalledPlanningState(14);

        advanceSectorOffensives(state);
        expect(opOf(state)?.phase).toBe('recovery');
        expect(opOf(state)?.recovery_reason).toBe('zero_eligible_axis');

        state.meta.turn = 15;
        advanceSectorOffensives(state);
        const cmd = state.military.corps_command!.corps_1!;
        expect(hasAvailableSlot(cmd, 1)).toBe(true);
    });

    it('pin: a COHA-frozen plan does not end and its clock shifts; the week counts as paused, not grace', () => {
        const state = makeStalledPlanningState(14);
        (state.military as any).event_flags = { coha_active: true };

        advanceSectorOffensives(state);
        expect(opOf(state)?.phase).toBe('planning');
        expect(opOf(state)?.phase_started_turn).toBe(11);

        const diagnostics = buildOperationCombatDiagnostics(state, undefined, undefined);
        const summary = buildCombatCausalitySummary(diagnostics, undefined, undefined);
        expect(diagnostics[0]!.planning_grace_week).toBeUndefined();
        expect(summary.planning_grace_op_weeks).toBe(0);
        expect(summary.paused_op_weeks).toBe(1);
    });
});
