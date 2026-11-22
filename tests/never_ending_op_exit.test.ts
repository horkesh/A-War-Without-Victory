import { describe, expect, it } from 'vitest';

import {
    advanceSectorOffensives,
    recordExecutionOrderSilence,
} from '../src/sim/combat/sector_offensive.js';
import type { CorpsOperation, GameState } from '../src/state/game_state.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import { makeCorps, makeFormation } from './test_factories.js';

// Never-ending-op exit (P3 brief 13, ruling 1). The 5-turn no-attack exit fired only while an
// operation's LIFETIME attack count was 0, so an operation that attacked early and then went
// silent sat in execution until max_failures (Operation Posavina Corridor, weeks 34-111 in the
// candidate-B run). An executing operation whose participants issue no attack order and have no
// move in flight for 5 consecutive emission turns now leaves through the same exit.

const APPROACH = 'op:front:approach_a';
const OBJECTIVE = 'op:target:objective';
const SECTOR = 'sector:rbih_corps:0';
const OP_NAME = 'Operation Silent Front';

function makeExecutionState(opts: { lifetimeAttacks: number; launchTurn?: number }): GameState {
    const launchTurn = opts.launchTurn ?? 20;
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: launchTurn, phase: 'war', seed: 'never-ending-op-exit' } as any,
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
                    // Attack posture with no order: the posture loophole that kept the zombie alive.
                    posture: 'attack',
                }),
                enemy_main: makeFormation({
                    id: 'enemy_main',
                    faction: 'RS',
                    corps_id: 'rs_corps',
                    hq_sid: 'S2',
                    location_osid: OBJECTIVE,
                    personnel: 60000,
                    cohesion: 80,
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
                        name: OP_NAME,
                        type: 'sector_attack',
                        phase: 'execution',
                        started_turn: launchTurn - 2,
                        phase_started_turn: launchTurn,
                        planning_duration: 1,
                        is_pre_planned: true,
                        participating_brigades: ['b1'],
                        objectives: [OBJECTIVE],
                        current_objective_index: 0,
                        sector_id: SECTOR,
                        attack_attempt_count: opts.lifetimeAttacks,
                        objective_capture_count: 0,
                        axes: [{
                            axis_id: 'main',
                            name: 'Main Axis',
                            assigned_brigades: ['b1'],
                            objectives: [OBJECTIVE],
                            current_objective_index: 0,
                            status: 'executing',
                            failure_count: opts.lifetimeAttacks > 0 ? 1 : 0,
                            consecutive_failures_on_current: 0,
                            momentum: 0,
                            attack_attempt_count: opts.lifetimeAttacks,
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

function opOf(state: GameState): CorpsOperation {
    return state.military.corps_command!.rbih_corps!.active_operations[0]!;
}

type Emission = 'silent' | 'moving' | 'packing' | 'attacking';

/** One turn: lifecycle advance, then this turn's emission as given, then the silence pass. */
function runTurn(state: GameState, turn: number, emission: Emission): void {
    state.meta.turn = turn;
    advanceSectorOffensives(state);
    state.military.brigade_attack_orders = emission === 'attacking' ? { b1: OBJECTIVE } : undefined;
    state.military.brigade_movement_orders = emission === 'moving'
        ? { b1: { destination_sids: [OBJECTIVE] } } as any
        : undefined;
    state.military.brigade_movement_state = emission === 'packing'
        ? { b1: { status: 'packing' } } as any
        : undefined;
    recordExecutionOrderSilence(state, ['RBiH']);
}

describe('never-ending-op exit', () => {
    it('ends an op that attacked and then issued no orders for 5 consecutive turns, via the no-attack exit', () => {
        const state = makeExecutionState({ lifetimeAttacks: 3 });
        for (let turn = 20; turn <= 24; turn++) {
            runTurn(state, turn, 'silent');
            expect(opOf(state).phase).toBe('execution');
        }
        expect(opOf(state).silent_execution_turn_streak).toBe(5);

        state.meta.turn = 25;
        advanceSectorOffensives(state);
        expect(opOf(state).phase).toBe('recovery');
        expect(opOf(state).phase_started_turn).toBe(25);
        // Same outcome class as the existing no-attack exit for an op that attacked.
        expect(opOf(state).recovery_reason).toBe('max_failures');
        expect(opOf(state).silent_execution_turn_streak).toBeUndefined();
    });

    it('does not end a silent op with move orders or a column in flight', () => {
        const state = makeExecutionState({ lifetimeAttacks: 3 });
        const emissions: Emission[] = ['silent', 'moving', 'silent', 'packing', 'silent', 'silent', 'moving', 'silent'];
        emissions.forEach((emission, i) => runTurn(state, 20 + i, emission));
        state.meta.turn = 20 + emissions.length;
        advanceSectorOffensives(state);
        expect(opOf(state).phase).toBe('execution');
        expect(opOf(state).silent_execution_turn_streak).toBe(1);
    });

    it('an attack order resets the silence streak', () => {
        const state = makeExecutionState({ lifetimeAttacks: 3 });
        const emissions: Emission[] = ['silent', 'silent', 'silent', 'silent', 'attacking', 'silent', 'silent'];
        emissions.forEach((emission, i) => runTurn(state, 20 + i, emission));
        expect(opOf(state).phase).toBe('execution');
        expect(opOf(state).silent_execution_turn_streak).toBe(2);
    });

    it('freezes the streak for factions that did not emit bot orders (manual player)', () => {
        const state = makeExecutionState({ lifetimeAttacks: 3 });
        for (let turn = 20; turn <= 26; turn++) {
            state.meta.turn = turn;
            advanceSectorOffensives(state);
            recordExecutionOrderSilence(state, ['RS']);
        }
        expect(opOf(state).phase).toBe('execution');
        expect(opOf(state).silent_execution_turn_streak).toBeUndefined();
    });

    it('clears the streak while every axis is in a late-phase hold', () => {
        const state = makeExecutionState({ lifetimeAttacks: 3 });
        opOf(state).axes![0]!.late_phase = { phase: 'holding' } as any;
        for (let turn = 20; turn <= 26; turn++) {
            state.meta.turn = turn;
            recordExecutionOrderSilence(state, ['RBiH']);
        }
        expect(opOf(state).silent_execution_turn_streak).toBeUndefined();
    });

    it('pin: the lifetime-0 no-attack exit is unchanged (5 turns after launch, no_logged_attempt)', () => {
        // Without the silence pass at all: the existing exit alone.
        const bare = makeExecutionState({ lifetimeAttacks: 0 });
        for (let turn = 20; turn <= 24; turn++) {
            bare.meta.turn = turn;
            advanceSectorOffensives(bare);
            expect(opOf(bare).phase).toBe('execution');
        }
        bare.meta.turn = 25;
        advanceSectorOffensives(bare);
        expect(opOf(bare).phase).toBe('recovery');
        expect(opOf(bare).recovery_reason).toBe('no_logged_attempt');

        // With the silence pass running: the same turn and the same reason.
        const withPass = makeExecutionState({ lifetimeAttacks: 0 });
        for (let turn = 20; turn <= 24; turn++) runTurn(withPass, turn, 'silent');
        expect(opOf(withPass).phase).toBe('execution');
        withPass.meta.turn = 25;
        advanceSectorOffensives(withPass);
        expect(opOf(withPass).phase).toBe('recovery');
        expect(opOf(withPass).phase_started_turn).toBe(25);
        expect(opOf(withPass).recovery_reason).toBe('no_logged_attempt');
    });

    it('control: without the silence pass, an op that attacked stays in execution while silent', () => {
        const state = makeExecutionState({ lifetimeAttacks: 3 });
        for (let turn = 20; turn <= 30; turn++) {
            state.meta.turn = turn;
            advanceSectorOffensives(state);
        }
        expect(opOf(state).phase).toBe('execution');
    });

    it('is deterministic', () => {
        const a = makeExecutionState({ lifetimeAttacks: 3 });
        const b = makeExecutionState({ lifetimeAttacks: 3 });
        for (let turn = 20; turn <= 25; turn++) {
            runTurn(a, turn, 'silent');
            runTurn(b, turn, 'silent');
        }
        expect(JSON.stringify(a.military.corps_command)).toBe(JSON.stringify(b.military.corps_command));
    });
});
