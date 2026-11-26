/**
 * FARZ-END (§26, lane C s22 seats): an operation whose capture counter is full is not finished
 * while an objective it credited is back under hostile control. `resolveCompletionOrReopen`
 * (sector_offensive.ts) reopens it, or refuses with a non-completed reason.
 */
import { describe, expect, it } from 'vitest';

import { advanceSectorOffensives, updateSectorOffensiveResults } from '../src/sim/combat/sector_offensive.js';
import { buildOperationCombatDiagnostics } from '../src/scenario/combat_causality.js';
import {
    deriveOperationEndRule,
    operationEndRuleKey,
    snapshotOperationEndRulePriors,
    type OperationEndRuleReceipt,
} from '../src/scenario/operation_end_rule.js';
import type { CorpsOperation, GameState, OperationAxis } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';

const A = 'op:farz:a';
const B = 'op:farz:b';
const STAGING = 'op:front:staging';

function brigade(id: string, corpsId: string, faction: string, personnel = 1200): Record<string, unknown> {
    return {
        id, faction, corps_id: corpsId, name: id, created_turn: 1, status: 'active', assignment: null,
        kind: 'brigade', personnel, cohesion: 70, hq_sid: 'S1', location_osid: STAGING, posture: 'defend', tags: [],
    };
}

function corps(id: string, faction: string): Record<string, unknown> {
    return {
        id, faction, name: id, created_turn: 1, status: 'active', assignment: null,
        kind: 'corps', personnel: 0, cohesion: 80, hq_sid: 'S1', tags: [],
    };
}

function axis(overrides: Partial<OperationAxis> = {}): OperationAxis {
    return {
        axis_id: 'farz_main',
        name: 'Main',
        assigned_brigades: ['b1', 'b2'],
        objectives: [A, B],
        current_objective_index: 2,
        status: 'complete',
        failure_count: 0,
        consecutive_failures_on_current: 0,
        momentum: 2,
        attack_attempt_count: 2,
        objective_capture_count: 2,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
        last_result: 'captured',
        ...overrides,
    } as OperationAxis;
}

function farzOperation(overrides: Partial<CorpsOperation> = {}): CorpsOperation {
    return {
        name: 'Fixture Farz',
        type: 'sector_attack',
        phase: 'recovery',
        recovery_reason: 'completed',
        started_turn: 30,
        phase_started_turn: 40,
        participating_brigades: ['b1', 'b2'],
        objectives: [A, B],
        objective_capture_count: 2,
        attack_attempt_count: 2,
        sector_id: 'sector:corps_1:0',
        axes: [axis()],
        ...overrides,
    } as CorpsOperation;
}

function makeState(operation: CorpsOperation, controllers: Record<string, string | null>, turn = 41): GameState {
    const formations: Record<string, unknown> = {
        corps_1: corps('corps_1', 'RBiH'),
        corps_2: corps('corps_2', 'RBiH'),
        b1: brigade('b1', 'corps_1', 'RBiH'),
        b2: brigade('b2', 'corps_1', 'RBiH'),
    };
    const political_controllers: Record<string, string> = { [STAGING]: 'RBiH' };
    for (const [osid, controller] of Object.entries(controllers)) {
        if (controller !== null) political_controllers[osid] = controller;
    }
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, phase: 'war', seed: 'farz-end-reopen' } as any,
        factions: [{ id: 'RBiH' }, { id: 'RS' }],
        formations,
        military: {
            formations,
            corps_command: {
                corps_1: {
                    command_span: 3, subordinate_count: 2, og_slots: 1, active_ogs: [],
                    corps_exhaustion: 0, stance: 'offensive', active_operations: [operation],
                },
            },
            corps_front_sectors: {
                'sector:corps_1:0': {
                    sector_id: 'sector:corps_1:0', corps_id: 'corps_1', faction: 'RBiH', opposing_factions: ['RS'],
                    edge_ids: ['edge:1'],
                    sub_segments: [{
                        sub_segment_id: 'subseg:sector:corps_1:0:0', edge_ids: ['edge:1'],
                        friendly_osids: [STAGING], enemy_osids: [A, B], primary_brigade_ids: [], length_edges: 1,
                    }],
                    length_edges: 1, territory_osids: [STAGING], assigned_brigade_ids: ['b1', 'b2'],
                    reserve_brigade_ids: [], density: 1, threat_ratio: 1, defensive_power: 100,
                    sector_stance: 'attack', stance_source: 'bot',
                },
            },
        } as any,
        political: { political_controllers, control_events: [] } as any,
        displacement: {} as any,
    } as unknown as GameState;
}

function hostedOperation(state: GameState): CorpsOperation | undefined {
    return state.military.corps_command?.corps_1?.active_operations[0];
}

describe('FARZ-END: completion reopens when a credited objective is lost', () => {
    it('(1) a loss during a completed recovery reopens the operation', () => {
        const op = farzOperation({ planning_phase_started_turn: 28 } as Partial<CorpsOperation>);
        const state = makeState(op, { [A]: 'RS', [B]: 'RBiH' });
        state.military.army_hq_operations = {
            'ahq:farz': {
                name: 'Fixture Farz', anchor_corps_id: 'corps_1', faction_id: 'RBiH',
                status: 'recovering', recovery_started_turn: 40,
            },
        } as any;

        advanceSectorOffensives(state, null);

        const reopened = hostedOperation(state);
        expect(reopened).toBe(op);
        expect(op.phase).toBe('execution');
        expect(op.phase_started_turn).toBe(41);
        expect(op.started_turn).toBe(30);
        expect(op.recovery_reason).toBeUndefined();
        expect(op.planning_phase_started_turn).toBeUndefined();
        const main = op.axes![0]!;
        expect(main.status).toBe('executing');
        expect(main.current_objective_index).toBe(0);
        expect(main.objective_capture_count).toBe(0);
        expect(op.objective_capture_count).toBe(0);
        expect(main.failure_count).toBe(1);
        expect(main.consecutive_failures_on_current).toBe(1);
        // s23 ops seat amendment 2: momentum resets on reopen, as at launch (fixture had 2).
        expect(main.momentum).toBe(0);
        expect(state.operation_history ?? []).toHaveLength(0);
        const armyHq = (state.military.army_hq_operations as any)['ahq:farz'];
        expect(armyHq.status).toBe('executing');
        expect(armyHq.recovery_started_turn).toBeUndefined();
    });

    it('(2) a loss in the same turn as completion reopens instead of completing', () => {
        const op = farzOperation({
            phase: 'execution',
            recovery_reason: undefined,
            phase_started_turn: 35,
            objective_capture_count: 1,
            attack_attempt_count: 1,
            axes: [axis({ status: 'executing', current_objective_index: 1, objective_capture_count: 1, attack_attempt_count: 1 })],
        });
        // B is taken this turn while a counterattack retakes A.
        const state = makeState(op, { [A]: 'RS', [B]: 'RBiH' }, 41);

        updateSectorOffensiveResults(state);

        expect(op.phase).toBe('execution');
        expect(op.recovery_reason).toBeUndefined();
        expect(op.phase_started_turn).toBe(35);
        const main = op.axes![0]!;
        expect(main.status).toBe('executing');
        expect(main.current_objective_index).toBe(0);
        expect(main.objective_capture_count).toBe(0);
        expect(main.failure_count).toBe(1);

        // Control: with A still held the same pass completes as before.
        const held = farzOperation({
            phase: 'execution',
            recovery_reason: undefined,
            phase_started_turn: 35,
            objective_capture_count: 1,
            attack_attempt_count: 1,
            axes: [axis({ status: 'executing', current_objective_index: 1, objective_capture_count: 1, attack_attempt_count: 1 })],
        });
        const heldState = makeState(held, { [A]: 'RBiH', [B]: 'RBiH' }, 41);
        updateSectorOffensiveResults(heldState);
        expect(held.phase).toBe('recovery');
        expect(held.recovery_reason).toBe('completed');
    });

    it('(3) no eligible brigade gives a non-completed reason and a non-objectives_taken label', () => {
        const op = farzOperation();
        const state = makeState(op, { [A]: 'RS', [B]: 'RBiH' });
        // b1 is now committed to a live operation of another corps; b2 is below the attack floor.
        (state.military.formations as any).b2.personnel = 300;
        (state.military.formations as any).b9 = brigade('b9', 'corps_2', 'RBiH');
        state.military.corps_command!.corps_2 = {
            command_span: 3, subordinate_count: 1, og_slots: 1, active_ogs: [],
            corps_exhaustion: 0, stance: 'offensive',
            active_operations: [{
                name: 'Other Op', type: 'sector_attack', phase: 'execution', started_turn: 39, phase_started_turn: 40,
                participating_brigades: ['b1', 'b9'], objectives: [], objective_capture_count: 0, attack_attempt_count: 0,
            }],
        } as any;
        const priors = snapshotOperationEndRulePriors(state);
        const operationId = operationEndRuleKey('corps_1', op);
        const sink = new Map<string, OperationEndRuleReceipt>([[operationId, { end_rule: 'objectives_taken' }]]);

        advanceSectorOffensives(state, null);

        expect(hostedOperation(state)).toBe(op);
        expect(op.phase).toBe('recovery');
        expect(op.recovery_reason).toBe('participants_below_attack_floor');
        expect(op.phase_started_turn).toBe(40);
        expect(op.axes![0]!.status).toBe('stalled');
        expect(op.participating_brigades).toEqual(['b1', 'b2']);
        expect(deriveOperationEndRule(op, { turn: 41 }).end_rule).not.toBe('objectives_taken');

        // The report side re-emits the receipt the week the reason changed (cac A11).
        buildOperationCombatDiagnostics(state, undefined, undefined, { priors, sink });
        expect(sink.get(operationId)?.end_rule).toBe('opening_readiness:participants_below_attack_floor');

        // The refused operation then finalizes through the ordinary recovery tick.
        state.meta.turn = 42;
        advanceSectorOffensives(state, null);
        expect(hostedOperation(state)).toBeUndefined();
        expect(state.operation_history?.[0]?.recovery_reason).toBe('participants_below_attack_floor');
    });

    it('(4) a capture-loss ping-pong terminates within the existing failure caps', () => {
        const op = farzOperation({
            phase: 'execution',
            recovery_reason: undefined,
            phase_started_turn: 35,
            objective_capture_count: 1,
            attack_attempt_count: 1,
            axes: [axis({ status: 'executing', current_objective_index: 1, objective_capture_count: 1, attack_attempt_count: 1 })],
        });
        const state = makeState(op, { [A]: 'RBiH', [B]: 'RS' }, 41);
        const controllers = state.political.political_controllers!;
        let completions = 0;
        for (let cycle = 0; cycle < 10 && op.phase === 'execution'; cycle += 1) {
            // The attacker takes B while A falls again: the axis completes over a lost cell.
            controllers[A] = 'RS';
            controllers[B] = 'RBiH';
            updateSectorOffensiveResults(state);
            completions += 1;
            const main = op.axes![0]!;
            expect(main.objective_capture_count).toBeLessThanOrEqual(main.objectives.length);
            if (op.phase !== 'execution') break;
            // Next week the attacker retakes A (B still held).
            controllers[A] = 'RBiH';
            state.meta.turn += 1;
            updateSectorOffensiveResults(state);
            state.meta.turn += 1;
        }
        expect(op.phase).toBe('recovery');
        expect(op.recovery_reason).toBe('max_failures');
        // Three reopens book failures 1..3; the fourth would reach the single-axis cap of 4.
        expect(completions).toBe(4);
        expect(op.axes![0]!.status).toBe('stalled');
    });

    it('(5) the October 1995 ceasefire refuses the reopen', () => {
        const op = farzOperation();
        const state = makeState(op, { [A]: 'RS', [B]: 'RBiH' });
        state.military.event_flags = { ceasefire_oct1995_in_force: true } as any;

        advanceSectorOffensives(state, null);

        expect(op.phase).toBe('recovery');
        expect(op.phase_started_turn).toBe(40);
        expect(op.recovery_reason).not.toBe('completed');
        // s23 ops seat amendment 1: the ceasefire refusal keeps its own reason, so it books no
        // failed objective or defeatism count (council fix 3).
        expect(op.recovery_reason).toBe('ceasefire');
        expect(op.axes![0]!.status).toBe('stalled');
        expect(op.axes![0]!.failure_count).toBe(0);
    });

    it('(6) an ally-held or uncontrolled objective never counts as lost', () => {
        // Usora-shaped: RBiH corps, objective held by the allied HRHB; B has no controller.
        const op = farzOperation();
        const state = makeState(op, { [A]: 'HRHB', [B]: null });

        advanceSectorOffensives(state, null);

        expect(hostedOperation(state)).toBeUndefined();
        expect(state.operation_history?.[0]?.recovery_reason).toBe('completed');
    });

    it('(legacy flat) a same-turn loss reopens a flat operation at the earliest lost index', () => {
        const op = {
            name: 'Fixture Flat',
            type: 'sector_attack',
            phase: 'execution',
            started_turn: 30,
            phase_started_turn: 35,
            participating_brigades: ['b1', 'b2'],
            objectives: [A, B],
            current_objective_index: 1,
            objective_capture_count: 1,
            attack_attempt_count: 1,
            failure_count: 0,
            consecutive_failures_on_current: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
            sector_id: 'sector:corps_1:0',
        } as unknown as CorpsOperation;
        const state = makeState(op, { [A]: 'RS', [B]: 'RBiH' }, 41);

        updateSectorOffensiveResults(state);

        expect(op.phase).toBe('execution');
        expect(op.current_objective_index).toBe(0);
        expect(op.objective_capture_count).toBe(0);
        expect(op.failure_count).toBe(1);
    });
});
