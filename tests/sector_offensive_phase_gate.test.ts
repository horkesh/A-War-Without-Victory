/**
 * Opt-in phase gate on multi-axis operations (historically phased Mistral 2): launch decision,
 * holding/capture lifecycle, activation-once, terminal main axis, clocks, TG hook, canonical spawn
 * propagation, serialization and default (absent opt-in) semantics.
 *
 * Production entry points only: `evaluateOpeningAttackReadiness`, `updateSectorOffensiveResults`,
 * `advanceLatePhaseGates`/`startLatePhaseHold`, the canonical opportunity spawn
 * (`runOpportunityEvaluationStep`/`applyOpportunityDecision`) and `serializeGameState`.
 * Hand-built states mirror the retained gate facts (main axis executable, held axis still in
 * transit); no reachable n39 save is fabricated and no actual launch turn is claimed.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    OPERATION_OPPORTUNITY_CATALOG,
    applyOpportunityDecision,
    buildProposalId,
    runOpportunityEvaluationStep,
} from '../src/sim/combat/operation_opportunities.js';
import {
    FEDERATION_WESTERN_BOSNIA_OPPORTUNITIES,
    MISTRAL_2_95_OPPORTUNITY,
} from '../src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.js';
import { OPERATION_STORM_EVENT_ID } from '../src/sim/combat/operation_storm_theater.js';
import { evaluateOpeningAttackReadiness } from '../src/sim/combat/sector_offensive_launch_helpers.js';
import { advanceSectorOffensives, reevaluateWeakenedOperations, updateSectorOffensiveResults } from '../src/sim/combat/sector_offensive.js';
import {
    advanceLatePhaseGates,
    buildAttackOrderOwner,
    isHeldCaptureOrder,
    operationInstanceId,
    startLatePhaseHold,
} from '../src/sim/combat/operation_phase_gate.js';
import { evaluateOperationTacticalGroupExhaustion } from '../src/sim/combat/tactical_group_lifecycle.js';
import { TG_MAX_LIFECYCLE_TURNS } from '../src/sim/combat/tactical_group_config.js';
import { checkDataPrereqs } from '../src/data_prereq/check_data_prereqs.js';
import { makeCorps, makeFormation } from './test_factories.js';
import { canonicalizeStartupState, createInitialGameState } from '../src/scenario/scenario_runner.js';
import { deserializeState, serializeState } from '../src/state/serialize.js';
import { serializeGameState } from '../src/state/serializeGameState.js';
import { validateGameStateShape } from '../src/state/validateGameState.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type {
    CorpsCommandState,
    CorpsOperation,
    FactionId,
    FormationId,
    FormationState,
    GameState,
    OperationAxis,
} from '../src/state/game_state.js';
import { resetReasonCodeTopicCacheForTests } from '../src/sim/combat/reason_code_debug.js';

afterEach(() => {
    delete process.env.AWWV_DEBUG_AXIS_READINESS;
    delete process.env.AWWV_DEBUG_REASON_CODES;
    resetReasonCodeTopicCacheForTests();
    vi.restoreAllMocks();
});

// ─── launch decision (evaluateOpeningAttackReadiness) ────────────────────────────

const READY_ADJ = new Map<string, string[]>([
    ['op:test:objective_a', ['op:test:approach_a']],
    ['op:test:approach_a', ['op:test:objective_a']],
    ['op:test:objective_b', ['op:test:approach_b']],
    ['op:test:approach_b', ['op:test:objective_b']],
]);

function readinessState(brigades: Record<string, { at: string; transitTo?: string[]; personnel?: number }>): GameState {
    const formations: Record<string, unknown> = {};
    const movement: Record<string, unknown> = {};
    for (const [id, b] of Object.entries(brigades)) {
        formations[id] = {
            id, kind: 'brigade', status: 'active', location_osid: b.at, personnel: b.personnel ?? 1200,
            disrupted_turns: 0, faction: 'TEST_FACTION', corps_id: 'synth_corps',
        };
        if (b.transitTo) {
            movement[id] = { status: 'in_transit', stance: 'column', destination_sids: b.transitTo, turns_remaining: 2 };
        }
    }
    return {
        meta: { turn: 100 },
        military: {
            formations,
            brigade_movement_state: movement,
            corps_front_sectors: {},
            war_front_edges_osid: [
                { edge_id: 'ea', a: 'op:test:approach_a', b: 'op:test:objective_a', side_a: 'TEST_FACTION', side_b: 'RIVAL_FACTION' },
                { edge_id: 'eb', a: 'op:test:approach_b', b: 'op:test:objective_b', side_a: 'TEST_FACTION', side_b: 'RIVAL_FACTION' },
            ],
        },
        political: {
            political_controllers: {
                'op:test:approach_a': 'TEST_FACTION', 'op:test:approach_b': 'TEST_FACTION',
                'op:test:objective_a': 'RIVAL_FACTION', 'op:test:objective_b': 'RIVAL_FACTION',
            },
        },
        operation_history: [],
    } as unknown as GameState;
}

function readinessOp(gated: boolean): CorpsOperation {
    return {
        name: 'Phase Gate Readiness',
        participating_brigades: ['main_b', 'held_b'],
        staging_osid: 'op:test:staging_a',
        sector_id: 'synth_sector_a',
        objectives: [],
        current_objective_index: 0,
        faction: 'TEST_FACTION',
        corps_id: 'synth_corps',
        is_pre_planned: true,
        axes: [
            {
                axis_id: 'axis_main', name: 'Main', objectives: ['op:test:objective_a'], current_objective_index: 0,
                assigned_brigades: ['main_b'], staging_osid: 'op:test:staging_a',
            },
            {
                // The held axis needs one brigade physically staged adjacent to its objective; its only
                // brigade is still marching, so the axis is non-executable AND approaching (raw truth).
                axis_id: 'axis_held', name: 'Held', objectives: ['op:test:objective_b'], current_objective_index: 0,
                assigned_brigades: ['held_b'], staging_osid: 'op:test:staging_b', minimum_staged_brigades: 1,
                ...(gated ? {
                    late_phase: {
                        phase: 'holding', main_axis_id: 'axis_main', requires: ['op:test:objective_a'],
                        gated_objectives: ['op:test:objective_b'], receipts: [],
                    },
                } : {}),
            },
        ],
    } as unknown as CorpsOperation;
}

function ready(state: GameState, op: CorpsOperation) {
    return evaluateOpeningAttackReadiness(state, 'synth_corps' as FormationId, 'TEST_FACTION' as never, op, READY_ADJ);
}

describe('launch decision: raw approach truth vs the approach that blocks the launch', () => {
    const mainReady = { main_b: { at: 'op:test:approach_a' }, held_b: { at: 'op:test:home_b', transitTo: ['op:test:approach_b'] } };

    it('today (absent opt-in) an approaching sibling vetoes the launch', () => {
        expect(ready(readinessState(mainReady), readinessOp(false)).executable).toBe(false);
    });

    it('opt-in: an executable main axis launches despite the held axis still approaching', () => {
        expect(ready(readinessState(mainReady), readinessOp(true)).executable).toBe(true);
    });

    it('opt-in: a NON-ready main axis still refuses the launch', () => {
        const state = readinessState({ main_b: { at: 'op:test:home_a' }, held_b: { at: 'op:test:home_b', transitTo: ['op:test:approach_b'] } });
        expect(ready(state, readinessOp(true)).executable).toBe(false);
    });

    it('opt-in: the held axis being executable by itself is not launch readiness', () => {
        const state = readinessState({ main_b: { at: 'op:test:home_a' }, held_b: { at: 'op:test:approach_b' } });
        expect(ready(state, readinessOp(false)).executable).toBe(true); // today: any executable axis suffices
        expect(ready(state, readinessOp(true)).executable).toBe(false); // gated: the main axis must be executable
    });

    it('keeps the raw approaching truth in the readiness trace and reports the blocking approach separately', () => {
        process.env.AWWV_DEBUG_AXIS_READINESS = '*';
        const logs: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line?: unknown) => { logs.push(String(line)); });
        ready(readinessState(mainReady), readinessOp(true));
        ready(readinessState(mainReady), readinessOp(false));
        const operationRecords = logs
            .filter((line) => line.startsWith('AXIS_READINESS_DEBUG '))
            .map((line) => JSON.parse(line.slice('AXIS_READINESS_DEBUG '.length)) as Record<string, unknown>)
            .filter((record) => record.kind === 'operation');
        expect(operationRecords).toHaveLength(2);
        const [gated, plain] = operationRecords;
        expect(gated).toMatchObject({ any_executable: true, any_approaching: true, any_blocking_approach: false, executed: true, held_by_approaching: false });
        expect(plain).toMatchObject({ any_executable: true, any_approaching: true, executed: false, held_by_approaching: true });
        expect('any_blocking_approach' in plain!).toBe(false);
    });
});

// ─── holding / capture lifecycle (updateSectorOffensiveResults) ─────────────────

const OP_NAME = 'Phase Gate Lifecycle';
const HOST = 'rs_corps';
const OP_ID = `${HOST}:${OP_NAME}:t15`;
const MAIN_OBJ = 'op:target:main_obj';
const MAIN_NEXT = 'op:target:main_next';
const HELD_OBJ = 'op:target:held_obj';
const HELD_NEXT = 'op:target:held_next';

function brigade(id: string, loc: string, posture: 'hold' | 'attack' = 'hold'): FormationState {
    return {
        id, faction: 'RS', corps_id: HOST, name: id, created_turn: 1, status: 'active', assignment: null,
        kind: 'brigade', personnel: 1000, cohesion: 70, hq_sid: 'S1', location_osid: loc, posture, tags: [],
    } as unknown as FormationState;
}

function axis(id: string, brigades: string[], objectives: string[], extra: Partial<OperationAxis> = {}): OperationAxis {
    return {
        axis_id: id, name: id, assigned_brigades: brigades, objectives, current_objective_index: 0, status: 'executing',
        failure_count: 0, consecutive_failures_on_current: 0, momentum: 0, attack_attempt_count: 0,
        objective_capture_count: 0, movement_only_execution_turns: 0, idle_execution_turn_streak: 0, ...extra,
    } as OperationAxis;
}

function gate(extra: Partial<NonNullable<OperationAxis['late_phase']>> = {}): NonNullable<OperationAxis['late_phase']> {
    return {
        phase: 'holding', main_axis_id: 'axis:main', requires: [MAIN_OBJ], gated_objectives: [HELD_OBJ, HELD_NEXT],
        receipts: [], hold_started_turn: 15, ...extra,
    };
}

function lifecycleState(opts: {
    gated?: boolean;
    heldGate?: Partial<NonNullable<OperationAxis['late_phase']>>;
    heldMarching?: boolean;
    mainStatus?: OperationAxis['status'];
    controllers?: Record<string, FactionId>;
} = {}): GameState {
    const gated = opts.gated ?? true;
    const heldAxis = axis('axis:held', ['m1'], [HELD_OBJ, HELD_NEXT], gated ? { late_phase: gate(opts.heldGate) } : {});
    const mainAxis = axis('axis:main', ['a1'], [MAIN_OBJ, MAIN_NEXT], { status: opts.mainStatus ?? 'executing', attack_attempt_count: 1 });
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 20, phase: 'war', seed: 'phase-gate-lifecycle' } as any,
        military: {
            formations: {
                [HOST]: { id: HOST, faction: 'RS', name: 'Corps', created_turn: 1, status: 'active', assignment: null, kind: 'corps', personnel: 50, cohesion: 80, hq_sid: 'S1', tags: [] },
                a1: brigade('a1', 'op:front:approach', 'attack'),
                m1: brigade('m1', 'op:rear:staging', 'hold'),
            },
            corps_front_sectors: {
                rs_sector: {
                    sector_id: 'rs_sector', corps_id: HOST, faction: 'RS', opposing_factions: [], edge_ids: ['e1'],
                    sub_segments: [{
                        sub_segment_id: 'subseg:rs_sector:0', edge_ids: ['e1'], friendly_osids: ['op:front:approach'],
                        enemy_osids: [MAIN_OBJ, HELD_OBJ], primary_brigade_ids: [], length_edges: 1,
                    }],
                    length_edges: 1, territory_osids: ['op:front:approach'], assigned_brigade_ids: [], reserve_brigade_ids: [],
                    density: 1, threat_ratio: 1, defensive_power: 100, sector_stance: 'defend', stance_source: 'bot' as const,
                },
            },
            corps_command: {
                [HOST]: {
                    command_span: 5, subordinate_count: 2, og_slots: 1, active_ogs: [], corps_exhaustion: 0, stance: 'offensive',
                    active_operations: [{
                        name: OP_NAME, type: 'sector_attack', phase: 'execution', started_turn: 15, phase_started_turn: 15,
                        planning_duration: 4, participating_brigades: ['a1', 'm1'], objectives: [MAIN_OBJ, MAIN_NEXT, HELD_OBJ, HELD_NEXT],
                        current_objective_index: 0, attack_attempt_count: 0, objective_capture_count: 0,
                        movement_only_execution_turns: 0, idle_execution_turn_streak: 0, failure_count: 0,
                        consecutive_failures_on_current: 0, sector_id: 'rs_sector', axes: [mainAxis, heldAxis],
                    }],
                },
            },
            ...(opts.heldMarching === false ? {} : {
                brigade_movement_state: {
                    m1: { status: 'in_transit', destination_sids: ['op:front:approach'], path: ['op:rear:staging', 'op:front:approach'], stance: 'column', turns_remaining: 3 } as any,
                },
            }),
            war_front_edges_osid: [],
        } as any,
        political: {
            political_controllers: {
                'op:rear:staging': 'RS', 'op:front:approach': 'RS',
                [MAIN_OBJ]: 'RBiH', [MAIN_NEXT]: 'RBiH', [HELD_OBJ]: 'RBiH', [HELD_NEXT]: 'RBiH',
                ...(opts.controllers ?? {}),
            },
        } as any,
    } as unknown as GameState;
}

function opOf(state: GameState): CorpsOperation {
    return state.military.corps_command![HOST]!.active_operations[0]!;
}
function heldOf(state: GameState): OperationAxis {
    return opOf(state).axes!.find((a) => a.axis_id === 'axis:held')!;
}
function receipt(osid: string, operationId = OP_ID) {
    return { osid, turn: 19, battle_id: `19:${osid}:a1:null`, attacker_brigade: 'a1', operation_id: operationId, axis_id: 'axis:main' };
}

/** Run n results passes, keeping the MAIN axis live between passes (this test is about the held axis). */
function passes(state: GameState, n: number): void {
    for (let i = 0; i < n; i++) {
        state.meta.turn = 20 + i;
        updateSectorOffensiveResults(state);
        const main = opOf(state).axes!.find((a) => a.axis_id === 'axis:main')!;
        if (main.status === 'executing') {
            main.idle_execution_turn_streak = 0;
            main.movement_only_execution_turns = 0;
            main.attack_attempt_count = Math.max(1, main.attack_attempt_count);
        }
    }
}

describe('holding phase: lawful approach only, no stall accrual, no friendly-control credit', () => {
    it('a holding axis may march for many passes without accruing the movement-only/idle/failure counters (control: the ungated axis stalls at the cap)', () => {
        const held = lifecycleState();
        passes(held, 9);
        const axisHeld = heldOf(held);
        expect(axisHeld.status).toBe('executing');
        expect(axisHeld.movement_only_execution_turns).toBe(0);
        expect(axisHeld.idle_execution_turn_streak).toBe(0);
        expect(axisHeld.failure_count).toBe(0);
        expect(axisHeld.late_phase!.phase).toBe('holding');

        const control = lifecycleState({ gated: false });
        passes(control, 5);
        expect(heldOf(control).status).toBe('stalled'); // movement-only cap 4 for every other axis
    });

    it('a holding axis neither credits nor advances through friendly control of its current objective (control: the ungated axis advances)', () => {
        const held = lifecycleState({ controllers: { [HELD_OBJ]: 'RS' } });
        passes(held, 2);
        expect(heldOf(held).current_objective_index).toBe(0);
        expect(heldOf(held).objective_capture_count).toBe(0);

        const control = lifecycleState({ gated: false, controllers: { [HELD_OBJ]: 'RS' } });
        passes(control, 1);
        expect(heldOf(control).current_objective_index).toBe(1);
    });

    it('never touches the operation clocks', () => {
        const state = lifecycleState({ heldGate: { receipts: [receipt(MAIN_OBJ)] }, controllers: { [MAIN_OBJ]: 'RS' } });
        const before = { started: opOf(state).started_turn, phaseStarted: opOf(state).phase_started_turn, planning: opOf(state).planning_duration };
        passes(state, 3);
        expect({ started: opOf(state).started_turn, phaseStarted: opOf(state).phase_started_turn, planning: opOf(state).planning_duration }).toEqual(before);
        expect(heldOf(state).late_phase!.hold_started_turn).toBe(15);
    });

    it('startLatePhaseHold sets the hold clock exactly once', () => {
        const state = lifecycleState({ heldGate: { hold_started_turn: undefined } });
        delete (heldOf(state).late_phase as any).hold_started_turn;
        startLatePhaseHold(opOf(state), 21);
        startLatePhaseHold(opOf(state), 30);
        expect(heldOf(state).late_phase!.hold_started_turn).toBe(21);
    });
});

describe('activation: only this operation\'s owned, still-held captures, exactly once', () => {
    function handoffState(): GameState {
        const state = lifecycleState({
            heldGate: {
                receipts: [receipt(MAIN_OBJ)],
                handoff: { brigade_id: 'a1', source_axis_id: 'axis:main' },
            },
            controllers: { [MAIN_OBJ]: 'RS' },
        });
        const op = opOf(state);
        const main = op.axes!.find((candidate) => candidate.axis_id === 'axis:main')!;
        const held = heldOf(state);
        state.military.formations!.s1 = brigade('s1', 'op:front:approach', 'attack');
        main.assigned_brigades = ['a1', 's1'];
        main.main_brigade = 'a1';
        main.support_brigades = ['s1'];
        held.assigned_brigades = [];
        delete held.main_brigade;
        delete held.support_brigades;
        op.participating_brigades = ['a1', 's1'];
        state.military.brigade_movement_state = {
            ...(state.military.brigade_movement_state ?? {}),
            a1: {
                status: 'in_transit', destination_sids: ['op:front:approach'],
                path: ['op:rear:staging', 'op:front:approach'], stance: 'column', turns_remaining: 2,
            } as any,
        };
        state.military.brigade_attack_orders = { a1: MAIN_NEXT };
        return state;
    }

    it('keeps an opted-in empty holding axis live from launch through weakened reevaluation until its owned capture hands off the source brigade', () => {
        const state = handoffState();
        const op = opOf(state);
        const held = heldOf(state);
        op.phase = 'planning';
        op.force_launch = true;
        op.phase_started_turn = 15;
        held.late_phase!.receipts = [];
        state.political.political_controllers![MAIN_OBJ] = 'RBiH';

        advanceSectorOffensives(state, null, undefined, new Map([
            ['op:front:approach', [MAIN_OBJ, HELD_OBJ]],
            [MAIN_OBJ, ['op:front:approach', MAIN_NEXT]],
            [MAIN_NEXT, [MAIN_OBJ]],
            [HELD_OBJ, ['op:front:approach', HELD_NEXT]],
            [HELD_NEXT, [HELD_OBJ]],
        ]));
        reevaluateWeakenedOperations(state);
        expect(op.phase).toBe('execution');
        expect(held).toMatchObject({ status: 'executing', assigned_brigades: [] });

        advanceLatePhaseGates(state, op, HOST, 'RS', 20);
        expect(held).toMatchObject({ status: 'executing', assigned_brigades: [] });
        expect(held.late_phase!.phase).toBe('holding');

        held.late_phase!.receipts = [receipt(MAIN_OBJ, 'other_corps:Other Op:t15')];
        state.political.political_controllers![MAIN_OBJ] = 'RS';
        advanceLatePhaseGates(state, op, HOST, 'RS', 21);
        expect(held).toMatchObject({ status: 'executing', assigned_brigades: [] });
        expect(held.late_phase!.phase).toBe('holding');

        held.late_phase!.receipts.push(receipt(MAIN_OBJ));
        advanceLatePhaseGates(state, op, HOST, 'RS', 22);
        expect(held).toMatchObject({ status: 'executing', assigned_brigades: ['a1'], main_brigade: 'a1' });
        expect(held.late_phase).toMatchObject({ phase: 'capture', activated_turn: 22 });
        expect(op.axes!.find((candidate) => candidate.axis_id === 'axis:main')!.assigned_brigades).toEqual(['s1']);
    });

    it.each([
        ['ordinary empty axis', undefined],
        ['holding axis without a handoff', gate()],
        ['already activated empty axis', gate({
            phase: 'capture',
            activated_turn: 19,
            handoff: { brigade_id: 'a1', source_axis_id: 'axis:main' },
        })],
    ])('still stalls an %s during weakened reevaluation', (_label, latePhase) => {
        const state = handoffState();
        const held = heldOf(state);
        if (latePhase === undefined) delete held.late_phase;
        else held.late_phase = latePhase;

        reevaluateWeakenedOperations(state);

        expect(held.status).toBe('stalled');
    });

    it('does not revive an opted-in axis that was already stalled', () => {
        const state = handoffState();
        const held = heldOf(state);
        held.status = 'stalled';

        reevaluateWeakenedOperations(state);

        expect(held.status).toBe('stalled');
    });

    it('atomically hands one active source brigade to the gated axis exactly once without moving it', () => {
        const state = handoffState();
        const op = opOf(state);
        const beforePhysical = {
            location: state.military.formations!.a1!.location_osid,
            movement: structuredClone(state.military.brigade_movement_state!.a1),
            order: state.military.brigade_attack_orders!.a1,
        };

        advanceLatePhaseGates(state, op, HOST, 'RS', 20);
        advanceLatePhaseGates(state, op, HOST, 'RS', 21);

        expect(op.axes!.find((candidate) => candidate.axis_id === 'axis:main')).toMatchObject({
            assigned_brigades: ['s1'], main_brigade: 's1',
        });
        expect(heldOf(state)).toMatchObject({ assigned_brigades: ['a1'], main_brigade: 'a1' });
        expect(heldOf(state).support_brigades).toBeUndefined();
        expect(op.participating_brigades).toEqual(['a1', 's1']);
        expect({
            location: state.military.formations!.a1!.location_osid,
            movement: state.military.brigade_movement_state!.a1,
            order: state.military.brigade_attack_orders!.a1,
        }).toEqual(beforePhysical);
        expect(heldOf(state).late_phase).toMatchObject({ phase: 'capture', activated_turn: 20 });
        expect(buildAttackOrderOwner(state, 'a1', HELD_OBJ, 21)).toMatchObject({
            operation_id: OP_ID, axis_id: 'axis:held', target: HELD_OBJ, turn: 21,
        });
    });

    it.each([
        ['missing formation', (state: GameState) => { delete state.military.formations!.a1; }],
        ['dead formation', (state: GameState) => {
            state.military.formations!.a1!.status = 'inactive';
            state.military.formations!.a1!.lifecycle_status = 'destroyed';
        }],
        ['foreign formation', (state: GameState) => { state.military.formations!.a1!.faction = 'RBiH'; }],
        ['wrong source', (state: GameState) => { heldOf(state).late_phase!.handoff!.source_axis_id = 'axis:missing'; }],
        ['duplicate axis membership', (state: GameState) => { heldOf(state).assigned_brigades.push('a1'); }],
        ['occupied dedicated destination', (state: GameState) => {
            state.military.formations!.d1 = brigade('d1', 'op:front:approach', 'attack');
            heldOf(state).assigned_brigades.push('d1');
            heldOf(state).main_brigade = 'd1';
            opOf(state).participating_brigades.push('d1');
        }],
        ['duplicate participant', (state: GameState) => { opOf(state).participating_brigades.push('a1'); }],
        ['another live operation', (state: GameState) => {
            state.military.corps_command![HOST]!.active_operations.push({
                ...opOf(state), name: 'Other Live Operation', started_turn: 16,
                participating_brigades: ['a1'], axes: undefined,
            });
        }],
        ['another live operation axis commitment', (state: GameState) => {
            state.military.corps_command![HOST]!.active_operations.push({
                ...opOf(state), name: 'Other Live Axis Operation', started_turn: 17,
                participating_brigades: [],
                axes: [axis('axis:foreign', ['a1'], ['op:test:foreign'])],
            });
        }],
    ])('handoff guard is atomic for %s', (_label, corrupt) => {
        const state = handoffState();
        corrupt(state);
        const op = opOf(state);
        const before = structuredClone({
            participants: op.participating_brigades,
            axes: op.axes,
            location: state.military.formations?.a1?.location_osid,
            movement: state.military.brigade_movement_state?.a1,
        });

        advanceLatePhaseGates(state, op, HOST, 'RS', 20);

        expect({
            participants: op.participating_brigades,
            axes: op.axes,
            location: state.military.formations?.a1?.location_osid,
            movement: state.military.brigade_movement_state?.a1,
        }).toEqual(before);
        expect(heldOf(state).late_phase!.phase).toBe('holding');
    });

    it('produces the same handoff under reversed axis and formation insertion order', () => {
        const forward = handoffState();
        const reversed = handoffState();
        reversed.military.formations = Object.fromEntries(Object.entries(reversed.military.formations!).reverse());
        opOf(reversed).axes!.reverse();
        for (const state of [forward, reversed]) {
            advanceLatePhaseGates(state, opOf(state), HOST, 'RS', 20);
        }
        const projection = (state: GameState) => ({
            phase: heldOf(state).late_phase!.phase,
            activated_turn: heldOf(state).late_phase!.activated_turn,
            memberships: opOf(state).axes!.map(({ axis_id, assigned_brigades }) => ({ axis_id, assigned_brigades }))
                .sort((a, b) => a.axis_id.localeCompare(b.axis_id)),
            participants: opOf(state).participating_brigades,
        });
        expect(projection(reversed)).toEqual(projection(forward));
    });

    it('activates once with owned receipts and held control: counters reset, objective index and clocks untouched', () => {
        const state = lifecycleState({
            heldGate: { receipts: [receipt(MAIN_OBJ)] },
            controllers: { [MAIN_OBJ]: 'RS' },
        });
        Object.assign(heldOf(state), { failure_count: 2, movement_only_execution_turns: 3, idle_execution_turn_streak: 2, attack_attempt_count: 1, shared_objective_wait_turns: 2 });
        // Production results pass (no direct helper call): the activation turn's orders/combat were
        // generated while the axis was still holding, so this pass must leave the reset counters
        // untouched and credit nothing, even though the current objective is friendly-controlled.
        state.political.political_controllers![HELD_OBJ] = 'RS';
        passes(state, 1);
        const lp = heldOf(state).late_phase!;
        expect(lp.phase).toBe('capture');
        expect(lp.activated_turn).toBe(20);
        expect(heldOf(state)).toMatchObject({
            failure_count: 0, movement_only_execution_turns: 0, idle_execution_turn_streak: 0,
            attack_attempt_count: 0, objective_capture_count: 0, shared_objective_wait_turns: 0,
            current_objective_index: 0, status: 'executing',
        });
        // First LATER turn (capture authority existed for this turn's orders): ordinary progression
        // resumes and the friendly-controlled objective is credited; activation is not repeated.
        passes(state, 2); // turns 20 (no-op for activation) and 21
        expect(heldOf(state).late_phase!.activated_turn).toBe(20);
        expect(heldOf(state).objective_capture_count).toBeGreaterThanOrEqual(1);
        expect(heldOf(state).current_objective_index).toBeGreaterThanOrEqual(1);
    });

    it('does NOT activate for pre-existing friendly control without a receipt, for another operation\'s receipt, or after control is lost', () => {
        const preExisting = lifecycleState({ controllers: { [MAIN_OBJ]: 'RS' } });
        passes(preExisting, 1);
        expect(heldOf(preExisting).late_phase!.phase).toBe('holding');

        const foreign = lifecycleState({
            heldGate: { receipts: [receipt(MAIN_OBJ, 'other_corps:Other Op:t1')] },
            controllers: { [MAIN_OBJ]: 'RS' },
        });
        passes(foreign, 1);
        expect(heldOf(foreign).late_phase!.phase).toBe('holding');

        const lost = lifecycleState({ heldGate: { receipts: [receipt(MAIN_OBJ)] } }); // MAIN_OBJ is enemy-held again
        passes(lost, 1);
        expect(heldOf(lost).late_phase!.phase).toBe('holding');
    });

    it('calls the TG hook exactly once at activation and never while holding', () => {
        const state = lifecycleState({ heldGate: { receipts: [receipt(MAIN_OBJ)] }, controllers: { [MAIN_OBJ]: 'RS' } });
        const hook = vi.fn();
        const lost = lifecycleState({ heldGate: { receipts: [receipt(MAIN_OBJ)] } });
        advanceLatePhaseGates(lost, opOf(lost), HOST, 'RS' as FactionId, 20, undefined, hook);
        expect(hook).not.toHaveBeenCalled();
        advanceLatePhaseGates(state, opOf(state), HOST, 'RS' as FactionId, 20, undefined, hook);
        advanceLatePhaseGates(state, opOf(state), HOST, 'RS' as FactionId, 21, undefined, hook);
        expect(hook).toHaveBeenCalledTimes(1);
        expect(hook.mock.calls[0]![0]).toBe(heldOf(state));
    });

    it('observes the actual activation callback with balanced caller inventory and no state change', () => {
        const offState = lifecycleState({ heldGate: { receipts: [receipt(MAIN_OBJ)] }, controllers: { [MAIN_OBJ]: 'RS' } });
        advanceLatePhaseGates(offState, opOf(offState), HOST, 'RS' as FactionId, 20, undefined, () => undefined);
        process.env.AWWV_DEBUG_REASON_CODES = 'mistral_tg_activation';
        resetReasonCodeTopicCacheForTests();
        const state = lifecycleState({ heldGate: { receipts: [receipt(MAIN_OBJ)] }, controllers: { [MAIN_OBJ]: 'RS' } });
        const lines: string[] = [];
        vi.spyOn(console, 'log').mockImplementation((line) => lines.push(String(line)));
        advanceLatePhaseGates(state, opOf(state), HOST, 'RS' as FactionId, 20, undefined, () => undefined);
        const rows = lines.map((line) => JSON.parse(line.slice(line.indexOf('{'))));
        expect(rows.map((row) => row.kind)).toEqual(['caller_pass_start', 'activation_callback_start', 'activation_callback_end', 'caller_pass_end']);
        expect(rows.every((row) => row.schema_version === 1)).toBe(true);
        expect(Buffer.from(JSON.stringify(state)).equals(Buffer.from(JSON.stringify(offState)))).toBe(true);
        expect(rows[0].axes).toHaveLength(2);
    });
});

describe('main axis terminal without the owned captures stalls the held phase', () => {
    it('stalls terminally (no phase, no indefinite hold) and the operation then recovers', () => {
        const state = lifecycleState({ mainStatus: 'complete' });
        passes(state, 1);
        const lp = heldOf(state).late_phase!;
        expect(heldOf(state).status).toBe('stalled');
        expect(lp.phase).toBe('holding');
        expect(lp.terminal_reason).toBe('main_axis_terminal_without_prerequisites');
        expect(opOf(state).phase).toBe('recovery');
    });

    it('prerequisites already satisfied take precedence over a terminal main axis', () => {
        const state = lifecycleState({
            mainStatus: 'complete', heldGate: { receipts: [receipt(MAIN_OBJ)] }, controllers: { [MAIN_OBJ]: 'RS' },
        });
        advanceLatePhaseGates(state, opOf(state), HOST, 'RS' as FactionId, 20);
        expect(heldOf(state).late_phase!.phase).toBe('capture');
        expect(heldOf(state).status).toBe('executing');
    });
});

describe('determinism and default semantics', () => {
    it('two identical runs are identical, and axis order does not change per-axis outcomes', () => {
        const run = (reverse: boolean) => {
            const state = lifecycleState({ heldGate: { receipts: [receipt(MAIN_OBJ)] }, controllers: { [MAIN_OBJ]: 'RS' } });
            if (reverse) opOf(state).axes!.reverse();
            passes(state, 3);
            return Object.fromEntries(opOf(state).axes!.map((a) => [a.axis_id, JSON.stringify(a)]));
        };
        expect(run(false)).toEqual(run(false));
        expect(run(false)).toEqual(run(true));
    });

    it('absent opt-in: an axis with no late_phase behaves exactly as before (advances on capture, no new fields)', () => {
        const state = lifecycleState({ gated: false, controllers: { [HELD_OBJ]: 'RS' } });
        passes(state, 1);
        const held = heldOf(state);
        expect(held.current_objective_index).toBe(1);
        expect('late_phase' in held).toBe(false);
        expect('brigade_attack_order_owners' in state.military).toBe(false);
    });
});

describe('late-axis TG lifetime (tactical_group_lifecycle.ts)', () => {
    function tgState(opts: { gated: boolean; lateActivated?: number; lateFormed?: number; mainFormed?: number }): GameState {
        const state = lifecycleState({ gated: opts.gated });
        const op = opOf(state);
        op.phase_started_turn = 15; // main-operation age is already spent at the turns below
        if (opts.gated) {
            heldOf(state).late_phase = gate({ phase: 'capture', activated_turn: opts.lateActivated, receipts: [receipt(MAIN_OBJ)] });
        }
        const group = (id: string, anchor: string, formed: number) => ({
            id, corps_id: HOST, op_id: OP_NAME, anchor_brigade_id: anchor, donor_contributions: [],
            location_osid: 'op:front:approach', status: 'engaged', formed_on_turn: formed, cohesion: 80,
        });
        (state.military as any).tactical_groups = {
            tg_main: group('tg_main', 'a1', opts.mainFormed ?? 15),
            ...(opts.lateFormed !== undefined ? { tg_late: group('tg_late', 'm1', opts.lateFormed) } : {}),
        };
        return state;
    }

    it('control: an ordinary operation (no late axis) still ends at the old operation-age bound', () => {
        const ordinary = tgState({ gated: false });
        expect(evaluateOperationTacticalGroupExhaustion(ordinary, HOST as FormationId, opOf(ordinary), 15 + TG_MAX_LIFECYCLE_TURNS - 1)).toBeNull();
        expect(evaluateOperationTacticalGroupExhaustion(ordinary, HOST as FormationId, opOf(ordinary), 15 + TG_MAX_LIFECYCLE_TURNS)).toBe('tg_max_lifecycle');
    });

    it('a late TG activated AFTER the operation-age cap survives initially and ends at its OWN finite bound', () => {
        const lateTurn = 15 + TG_MAX_LIFECYCLE_TURNS + 8; // operation age already well past the cap
        const state = tgState({ gated: true, lateActivated: lateTurn, lateFormed: lateTurn });
        const op = opOf(state);
        expect(evaluateOperationTacticalGroupExhaustion(state, HOST as FormationId, op, lateTurn)).toBeNull();
        expect(evaluateOperationTacticalGroupExhaustion(state, HOST as FormationId, op, lateTurn + TG_MAX_LIFECYCLE_TURNS - 1)).toBeNull();
        expect(evaluateOperationTacticalGroupExhaustion(state, HOST as FormationId, op, lateTurn + TG_MAX_LIFECYCLE_TURNS)).toBe('tg_max_lifecycle');
    });

    it('the main group is not extended: with no late group engaged the operation ends at the old bound even if the axis is late-gated', () => {
        const state = tgState({ gated: true, lateActivated: 40 });
        expect(evaluateOperationTacticalGroupExhaustion(state, HOST as FormationId, opOf(state), 15 + TG_MAX_LIFECYCLE_TURNS)).toBe('tg_max_lifecycle');
    });
});

describe('REAL late-axis TG formation and engagement (updateSectorOffensiveResults -> advanceLatePhaseGates -> formTgForAxis -> formTacticalGroup)', () => {
    const TG_CORPS = 'test_corps';
    const REAL_OP = 'Phase Real TG';
    const X_MAIN = 'op:tgx:main_obj';
    const X_HELD = 'op:tgx:held_obj';
    const X_APPROACH = 'op:tgx:approach';
    const X_REAR = 'op:tgx:rear';
    const ACTIVATION_TURN = 15 + TG_MAX_LIFECYCLE_TURNS + 8; // operation execution age is already past the cap

    function realTgState(withDonors: boolean): GameState {
        const formations: Record<string, FormationState> = {
            [TG_CORPS]: makeCorps({ id: TG_CORPS, faction: 'RS', hq_sid: 'S1' } as never),
            main_b: makeFormation({ id: 'main_b', faction: 'RS', corps_id: TG_CORPS, location_osid: X_APPROACH, personnel: 2000, cohesion: 80, posture: 'attack' }),
            late_anchor: makeFormation({ id: 'late_anchor', faction: 'RS', corps_id: TG_CORPS, location_osid: X_APPROACH, personnel: 2000, cohesion: 80 }),
        };
        if (withDonors) {
            for (const id of ['donor_a', 'donor_b']) {
                formations[id] = makeFormation({ id, faction: 'RS', corps_id: TG_CORPS, location_osid: X_REAR, personnel: 2600, cohesion: 80 });
            }
        }
        const mainAxis = axis('axis:main', ['main_b'], [X_MAIN], { attack_attempt_count: 1 });
        const lateAxis = axis('axis:late', ['late_anchor'], [X_HELD], {
            main_brigade: 'late_anchor' as FormationId, staging_osid: X_APPROACH,
            late_phase: {
                phase: 'holding', main_axis_id: 'axis:main', requires: [X_MAIN], gated_objectives: [X_HELD],
                receipts: [{
                    osid: X_MAIN, turn: 19, battle_id: `19:${X_MAIN}:main_b:null`, attacker_brigade: 'main_b',
                    operation_id: `${TG_CORPS}:${REAL_OP}:t15`, axis_id: 'axis:main',
                }],
                hold_started_turn: 15,
            },
        });
        return {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: { turn: ACTIVATION_TURN, phase: 'war', seed: 'phase-real-tg' } as any,
            factions: [{ id: 'RS' }, { id: 'RBiH' }],
            military: {
                formations,
                corps_front_sectors: {
                    rs_sector: {
                        sector_id: 'rs_sector', corps_id: TG_CORPS, faction: 'RS', opposing_factions: [], edge_ids: ['e1'],
                        sub_segments: [{
                            sub_segment_id: 'subseg:rs_sector:0', edge_ids: ['e1'], friendly_osids: [X_APPROACH],
                            enemy_osids: [X_HELD], primary_brigade_ids: [], length_edges: 1,
                        }],
                        length_edges: 1, territory_osids: [X_APPROACH], assigned_brigade_ids: [], reserve_brigade_ids: [],
                        density: 1, threat_ratio: 1, defensive_power: 100, sector_stance: 'defend', stance_source: 'bot' as const,
                    },
                },
                corps_command: {
                    [TG_CORPS]: {
                        command_span: 5, subordinate_count: 2, og_slots: 1, active_ogs: [], corps_exhaustion: 0, stance: 'offensive',
                        active_operations: [{
                            name: REAL_OP, type: 'sector_attack', phase: 'execution', started_turn: 15, phase_started_turn: 15,
                            planning_duration: 4, participating_brigades: ['main_b', 'late_anchor'], objectives: [X_MAIN, X_HELD],
                            current_objective_index: 0, attack_attempt_count: 0, objective_capture_count: 0,
                            movement_only_execution_turns: 0, idle_execution_turn_streak: 0, failure_count: 0,
                            consecutive_failures_on_current: 0, sector_id: 'rs_sector', axes: [mainAxis, lateAxis],
                        }],
                    },
                },
                tactical_groups: {
                    // An unrelated group (other corps/operation) that activation must never touch.
                    unrelated_tg: {
                        id: 'unrelated_tg', corps_id: 'other_corps', op_id: 'Other Op', anchor_brigade_id: 'other_anchor',
                        donor_contributions: [], location_osid: 'op:elsewhere:cell', status: 'forming', formed_on_turn: 3, cohesion: 77,
                    },
                },
                war_front_edges_osid: [
                    { a: X_APPROACH, b: X_HELD }, { a: X_REAR, b: X_APPROACH }, { a: X_APPROACH, b: X_MAIN },
                ],
            },
            political: {
                political_controllers: { [X_MAIN]: 'RS', [X_HELD]: 'RBiH', [X_APPROACH]: 'RS', [X_REAR]: 'RS' },
            },
        } as unknown as GameState;
    }

    const realOp = (state: GameState) => state.military.corps_command![TG_CORPS]!.active_operations[0]!;
    const lateGroups = (state: GameState) => Object.values(state.military.tactical_groups ?? {}).filter((g) => g.op_id === REAL_OP);

    it('stdout observer preserves actual formation and decline states byte-for-byte while reporting reached terminals', () => {
        for (const withDonors of [true, false]) {
            delete process.env.AWWV_DEBUG_REASON_CODES;
            resetReasonCodeTopicCacheForTests();
            const off = realTgState(withDonors);
            const offLines: string[] = [];
            vi.spyOn(console, 'log').mockImplementation((line) => offLines.push(String(line)));
            updateSectorOffensiveResults(off);
            expect(offLines.filter((line) => line.startsWith('[mistral_tg_activation] '))).toHaveLength(0);
            vi.restoreAllMocks();
            process.env.AWWV_DEBUG_REASON_CODES = 'mistral_tg_activation';
            resetReasonCodeTopicCacheForTests();
            const on = realTgState(withDonors);
            const lines: string[] = [];
            vi.spyOn(console, 'log').mockImplementation((line) => lines.push(String(line)));
            updateSectorOffensiveResults(on);
            expect(Buffer.from(JSON.stringify(on)).equals(Buffer.from(JSON.stringify(off)))).toBe(true);
            const rows = lines.map((line) => JSON.parse(line.slice(line.indexOf('{'))));
            expect(rows.filter((row) => row.kind === 'tg_call_start')).toHaveLength(1);
            expect(rows.filter((row) => row.kind === 'tg_call_end')).toHaveLength(1);
            expect(rows.find((row) => row.kind === 'tg_inner_terminal')?.reason).toBe(withDonors ? 'formed' : 'donation_below_readiness');
            vi.restoreAllMocks();
        }
    });

    it('activation forms AND engages its own TG: formed_on_turn = activation turn, anchor location mirrored, unrelated group untouched, activation once', () => {
        const state = realTgState(true);
        expect(lateGroups(state)).toHaveLength(0); // setup: nothing formed yet
        updateSectorOffensiveResults(state);

        const late = realOp(state).axes!.find((a) => a.axis_id === 'axis:late')!;
        expect(late.late_phase!.phase).toBe('capture');
        expect(late.late_phase!.activated_turn).toBe(ACTIVATION_TURN);

        const groups = lateGroups(state);
        expect(groups, 'a TG must actually have formed through the real formation path').toHaveLength(1);
        expect(groups[0]).toMatchObject({
            anchor_brigade_id: 'late_anchor', corps_id: TG_CORPS, status: 'engaged',
            formed_on_turn: ACTIVATION_TURN, location_osid: X_APPROACH,
        });
        expect(state.military.tactical_groups!.unrelated_tg).toMatchObject({ status: 'forming', formed_on_turn: 3, cohesion: 77 });

        // Activation is once: a later pass neither re-forms nor re-activates nor changes the group.
        state.meta.turn = ACTIVATION_TURN + 1;
        updateSectorOffensiveResults(state);
        expect(late.late_phase!.activated_turn).toBe(ACTIVATION_TURN);
        expect(lateGroups(state)).toHaveLength(1);
        expect(lateGroups(state)[0]!.formed_on_turn).toBe(ACTIVATION_TURN);
    });

    it('the activation-created TG survives the spent operation-age boundary initially and at +11, and is exhausted at its OWN +12', () => {
        const state = realTgState(true);
        updateSectorOffensiveResults(state);
        expect(lateGroups(state)[0]!.status).toBe('engaged');
        const op = realOp(state);
        // Operation execution age (turn - phase_started_turn) is already >= the cap at activation.
        expect(ACTIVATION_TURN - op.phase_started_turn).toBeGreaterThanOrEqual(TG_MAX_LIFECYCLE_TURNS);
        expect(evaluateOperationTacticalGroupExhaustion(state, TG_CORPS as FormationId, op, ACTIVATION_TURN)).toBeNull();
        expect(evaluateOperationTacticalGroupExhaustion(state, TG_CORPS as FormationId, op, ACTIVATION_TURN + TG_MAX_LIFECYCLE_TURNS - 1)).toBeNull();
        expect(evaluateOperationTacticalGroupExhaustion(state, TG_CORPS as FormationId, op, ACTIVATION_TURN + TG_MAX_LIFECYCLE_TURNS)).toBe('tg_max_lifecycle');
        expect(op.phase_started_turn).toBe(15); // no clock was reset or extended
    });

    it('no formation (no donors): activation still happens once, no TG exists, nothing is invented or engaged', () => {
        const state = realTgState(false);
        updateSectorOffensiveResults(state);
        const late = realOp(state).axes!.find((a) => a.axis_id === 'axis:late')!;
        expect(late.late_phase!.phase).toBe('capture');
        expect(lateGroups(state)).toHaveLength(0);
        expect(state.military.tactical_groups!.unrelated_tg!.status).toBe('forming');
        expect(evaluateOperationTacticalGroupExhaustion(state, TG_CORPS as FormationId, realOp(state), ACTIVATION_TURN)).toBeNull();
    });
});

describe('serialization and validation of the opt-in state', () => {
    // Real save boundary: serializeState -> deserializeState (migrations + shape + semantic validation),
    // starting from the canonical birth state, not JSON.parse(serializeGameState(...)).
    async function canonicalWithMidHoldOperation(): Promise<{ state: GameState; opId: string; mainBrigade: string; heldBrigade: string; mainOsid: string; heldOsid: string } | null> {
        if (!checkDataPrereqs({ baseDir: process.cwd() }).ok) return null;
        const raw = await createInitialGameState('phase-gate-save-boundary');
        raw.meta.player_faction = 'RS';
        const state = canonicalizeStartupState(raw).state;
        // The Apr 1992 birth state has no corps_command entries yet: host the operation on a real RS
        // corps formation with an ordinary (empty) command state, as the runtime lazily creates it.
        // It also has no formations (they are created at scenario start), so the fixture adds a minimal
        // RS corps with two brigades through the ordinary FormationState shape.
        const corpsId = 'rs_phase_round_trip_corps';
        const baseFormation = { faction: 'RS', created_turn: 0, status: 'active', assignment: null, personnel: 1000, cohesion: 70, tags: [] };
        const firstSid = Object.keys(state.political.political_controllers ?? {}).sort()[0] ?? 'S1';
        for (const [id, kind] of [[corpsId, 'corps'], ['rs_phase_round_trip_b1', 'brigade'], ['rs_phase_round_trip_b2', 'brigade']] as const) {
            (state.military.formations as Record<string, unknown>)[id] = {
                ...baseFormation, id, name: id, kind, hq_sid: firstSid, ...(kind === 'brigade' ? { corps_id: corpsId, location_osid: firstSid } : {}),
            };
        }
        state.military.corps_command ??= {};
        state.military.corps_command[corpsId] ??= {
            command_span: 3, subordinate_count: 2, og_slots: 1, active_ogs: [], corps_exhaustion: 0,
            stance: 'offensive', active_operations: [],
        } as CorpsCommandState;
        const brigades = Object.values(state.military.formations)
            .filter((f) => f.kind === 'brigade' && f.faction === 'RS')
            .map((f) => f.id as string)
            .sort();
        const [mainBrigade, heldBrigade] = [brigades[0]!, brigades[1]!];
        // Real OSIDs from the birth state so the post-load semantic validation accepts the controllers.
        const controllers = state.political.political_controllers ?? {};
        const osids = Object.keys(controllers).sort();
        const mainOsid = osids.find((o) => controllers[o] === 'RBiH');
        const heldOsid = osids.find((o) => o !== mainOsid && controllers[o] === 'RBiH');
        if (!mainOsid || !heldOsid) throw new Error('no RBiH-controlled OSIDs in canonical birth state: ' + osids.length);
        const op = {
            name: 'Phase Round Trip', type: 'sector_attack', phase: 'execution', started_turn: 3, phase_started_turn: 3,
            planning_duration: 1, participating_brigades: [mainBrigade, heldBrigade], objectives: [mainOsid, heldOsid],
            current_objective_index: 0, attack_attempt_count: 0, objective_capture_count: 0,
            movement_only_execution_turns: 0, idle_execution_turn_streak: 0, failure_count: 0, consecutive_failures_on_current: 0,
            axes: [
                axis('axis:main', [mainBrigade], [mainOsid]),
                axis('axis:held', [heldBrigade], [heldOsid], {
                    late_phase: {
                        phase: 'holding', main_axis_id: 'axis:main', requires: [mainOsid], gated_objectives: [heldOsid],
                        receipts: [{
                            osid: mainOsid, turn: 4, battle_id: `4:${mainOsid}:${mainBrigade}:null`,
                            attacker_brigade: mainBrigade, operation_id: `${corpsId}:Phase Round Trip:t3`, axis_id: 'axis:main',
                        }],
                        hold_started_turn: 3,
                    },
                }),
            ],
        } as unknown as CorpsOperation;
        state.military.corps_command![corpsId]!.active_operations.push(op);
        const opId = `${corpsId}:Phase Round Trip:t3`;
        (state.military as any).brigade_attack_orders = { [mainBrigade]: mainOsid };
        (state.military as any).brigade_attack_order_owners = {
            [mainBrigade]: { operation_id: opId, axis_id: 'axis:main', target: mainOsid, turn: state.meta.turn },
        };
        return { state, opId, mainBrigade, heldBrigade, mainOsid, heldOsid };
    }

    it('the canonical birth state and a mid-hold operation are actually constructible here (the save-boundary tests below do not silently skip)', async () => {
        expect(checkDataPrereqs({ baseDir: process.cwd() }).ok).toBe(true);
        const built = await canonicalWithMidHoldOperation();
        expect(built).not.toBeNull();
        expect(built!.state.military.corps_command![built!.opId.split(':')[0]!]!.active_operations.some((o) => o.name === 'Phase Round Trip')).toBe(true);
    });

    it('round-trips a mid-hold operation with pending ownership and activation-once evidence through serializeState -> deserializeState', async () => {
        const built = await canonicalWithMidHoldOperation();
        if (!built) return; // data prerequisites absent: nothing to prove here
        const { state, opId, mainBrigade, mainOsid, heldOsid } = built;
        const pendingOp = state.military.corps_command![opId.split(':')[0]!]!.active_operations.find((o) => o.name === 'Phase Round Trip')!;
        const pendingHeld = pendingOp.axes!.find((a) => a.axis_id === 'axis:held')!;
        const priorHeldBrigade = pendingHeld.assigned_brigades[0]!;
        pendingHeld.assigned_brigades = [];
        delete pendingHeld.main_brigade;
        delete pendingHeld.support_brigades;
        pendingOp.participating_brigades = pendingOp.participating_brigades.filter((id) => id !== priorHeldBrigade);
        pendingHeld.late_phase!.handoff = {
            brigade_id: mainBrigade,
            source_axis_id: 'axis:main',
        };
        const loaded = deserializeState(serializeState(state));
        const corpsId = opId.split(':')[0]!;
        const op = loaded.military.corps_command![corpsId]!.active_operations.find((o) => o.name === 'Phase Round Trip')!;
        const held = op.axes!.find((a) => a.axis_id === 'axis:held')!;
        expect(held.late_phase).toEqual({
            phase: 'holding', main_axis_id: 'axis:main', requires: [mainOsid], gated_objectives: [heldOsid],
            receipts: [expect.objectContaining({ osid: mainOsid, operation_id: opId, axis_id: 'axis:main' })],
            hold_started_turn: 3,
            handoff: { brigade_id: mainBrigade, source_axis_id: 'axis:main' },
        });
        expect((loaded.military as any).brigade_attack_order_owners[mainBrigade]).toMatchObject({ operation_id: opId, target: mainOsid });

        // Continuation after load: the receipt satisfies a (held) prerequisite exactly once and the
        // activation evidence survives a second save/load without re-activating.
        loaded.political.political_controllers![mainOsid] = 'RS';
        delete loaded.military.brigade_attack_order_owners;
        delete loaded.military.brigade_attack_orders;
        advanceLatePhaseGates(loaded, op, corpsId, 'RS' as FactionId, 30);
        expect(held.late_phase!.phase).toBe('capture');
        expect(held.late_phase!.activated_turn).toBe(30);
        expect(op.axes!.find((a) => a.axis_id === 'axis:main')!.assigned_brigades).toEqual([]);
        expect(held.assigned_brigades).toEqual([mainBrigade]);
        const reloaded = deserializeState(serializeState(loaded));
        const reloadedHeld = reloaded.military.corps_command![corpsId]!.active_operations
            .find((o) => o.name === 'Phase Round Trip')!.axes!.find((a) => a.axis_id === 'axis:held')!;
        expect(reloadedHeld.late_phase).toMatchObject({ phase: 'capture', activated_turn: 30 });
        advanceLatePhaseGates(reloaded, reloaded.military.corps_command![corpsId]!.active_operations.find((o) => o.name === 'Phase Round Trip')!, corpsId, 'RS' as FactionId, 45);
        expect(reloadedHeld.late_phase!.activated_turn).toBe(30);
    });

    it('refuses malformed persisted phase state and ownership association at load', async () => {
        const built = await canonicalWithMidHoldOperation();
        if (!built) return;
        const corpsId = built.opId.split(':')[0]!;
        const mutate = (edit: (s: GameState, gate: any) => void): string => {
            const copy = JSON.parse(serializeGameState(built.state)) as GameState;
            const heldAxis = copy.military.corps_command![corpsId]!.active_operations.find((o) => o.name === 'Phase Round Trip')!
                .axes!.find((a) => a.axis_id === 'axis:held')!;
            edit(copy, heldAxis.late_phase);
            return JSON.stringify(copy);
        };
        const bad: Array<[string, (s: GameState, g: any) => void]> = [
            ['phase', (_s, g) => { g.phase = 'sleeping'; }],
            ['main_axis_id', (_s, g) => { g.main_axis_id = 'axis:nonexistent'; }],
            ['requires', (_s, g) => { g.requires = []; }],
            ['gated_objectives', (_s, g) => { g.gated_objectives = [7]; }],
            ['receipts[0].operation_id', (_s, g) => { g.receipts[0].operation_id = 'other:Op:t1'; }],
            ['receipts[0].osid', (_s, g) => { g.receipts[0].osid = 'op:not:required'; }],
            ['activated_turn', (_s, g) => { g.phase = 'capture'; }],
            ['terminal_reason', (_s, g) => { g.terminal_reason = 'because'; }],
            ['handoff', (_s, g) => { g.handoff = 'bad'; }],
            ['handoff.brigade_id', (_s, g) => { g.handoff = { brigade_id: '', source_axis_id: 'axis:main' }; }],
            ['handoff.source_axis_id', (_s, g) => { g.handoff = { brigade_id: built.mainBrigade, source_axis_id: 'axis:held' }; }],
            ['brigade_attack_order_owners', (s) => { (s.military as any).brigade_attack_order_owners[built.mainBrigade].operation_id = 'ghost:Op:t9'; }],
        ];
        for (const [label, edit] of bad) {
            expect(() => deserializeState(mutate(edit)), label).toThrow(new RegExp(label.replace(/[[\]]/g, '.')));
        }
    });

    it('old-save / absent-opt-in controls: no late_phase and no owner field appear, and an ordinary state loads unchanged', async () => {
        if (!checkDataPrereqs({ baseDir: process.cwd() }).ok) return;
        const raw = await createInitialGameState('phase-gate-old-save');
        raw.meta.player_faction = 'RS';
        const canonical = canonicalizeStartupState(raw).state;
        const loaded = deserializeState(serializeState(canonical));
        expect('brigade_attack_order_owners' in loaded.military).toBe(false);
        for (const command of Object.values(loaded.military.corps_command ?? {})) {
            for (const op of command.active_operations ?? []) {
                expect((op.axes ?? []).every((a) => a.late_phase === undefined)).toBe(true);
            }
        }
        expect(serializeState(loaded)).toBe(serializeState(canonical));
    });

    it('validates the owner sidecar shape and omits the field when absent', () => {
        const errorsOf = (input: unknown): string[] => {
            const result = validateGameStateShape(input) as { ok: boolean; errors?: string[] };
            return result.ok ? [] : (result.errors ?? []);
        };
        const messages = errorsOf({ military: { brigade_attack_order_owners: { a1: { operation_id: '', axis_id: 5, target: null, turn: -1 } } } })
            .filter((m) => m.startsWith('military.brigade_attack_order_owners'));
        expect(messages.length).toBeGreaterThanOrEqual(4);
        const okErrors = errorsOf({ military: { brigade_attack_order_owners: { a1: { operation_id: OP_ID, axis_id: 'axis:main', target: MAIN_OBJ, turn: 20 } } } });
        expect(okErrors.filter((m) => m.startsWith('military.brigade_attack_order_owners'))).toHaveLength(0);
        expect(errorsOf({ military: {} }).filter((m) => m.includes('brigade_attack_order_owners'))).toHaveLength(0);
        expect(operationInstanceId('c', { name: 'N', started_turn: 7 } as CorpsOperation)).toBe('c:N:t7');
    });
});

// ─── canonical Mistral 2 spawn propagation ──────────────────────────────────────

const MISTRAL_BRIGADES = [
    'hvo_1st_guard_abb', 'hv_4th_guards_split', 'hvo_2nd_guard_mechanized', 'hv_112th_infantry_1995',
    'hv_1st_hgz_1995', 'hvo_3rd_guard_jastrebovi', 'hvo_rama_brigade',
];
const MISTRAL_OBJECTIVES = [
    'op:glamoc:halapic', 'op:glamoc:stekerovci_2', 'op:titov_drvar:prekaja_2', 'op:titov_drvar:drvar_2',
    'op:titov_drvar:sipovljani_2', 'op:bosansko_grahovo:crni_lug', 'op:bosansko_grahovo:bosansko_grahovo_2',
    'op:bosansko_grahovo:malesevci', 'op:bosansko_grahovo:ugarci', 'op:sipovo:brdjani', 'op:sipovo:gornji_mujdzici_2',
    'op:sipovo:sipovo_2', 'op:sipovo:volari_2', 'op:sipovo:pribeljci_2', 'op:jajce:bravnice', 'op:jajce:vinac_2',
    'op:jajce:jajce_3', 'op:jajce:lupnica', 'op:jajce:barevo_2', 'op:jajce:jezero_2', 'op:jajce:prisoje',
];

function buildMistralState(turn: number): GameState {
    const controllers: Record<string, FactionId> = {};
    for (const osid of ['op:livno:misi_2', 'op:livno:livno_2', 'op:kupres:bucovaca', 'op:glamoc:glamoc_2']) controllers[osid] = 'HRHB';
    for (const osid of MISTRAL_OBJECTIVES) controllers[osid] = 'RS';
    const formations: Record<string, unknown> = {};
    for (const id of MISTRAL_BRIGADES) {
        formations[id] = {
            id, name: id, kind: id === 'hv_112th_infantry_1995' || id === 'hv_1st_hgz_1995' ? 'hv_phantom' : 'brigade',
            status: 'active', faction: 'HRHB', corps_id: 'hvo_tomislavgrad', personnel: 1500, strength: 1500,
            officer_quality: 0.72, cohesion: 70, morale: 72,
            composition: { tanks: 1, artillery: 2, tank_condition: { operational: 1 }, artillery_condition: { operational: 2 } },
            tags: id.startsWith('hv_') ? ['hv_origin'] : [],
        };
    }
    const command = (): CorpsCommandState => ({
        command_span: 7, subordinate_count: 7, og_slots: 1, active_ogs: [], corps_exhaustion: 9, stance: 'offensive',
        active_operations: [],
        commander_state: { current_plan: null, decision_trace: null, operation_history: [] } as unknown as CorpsCommandState['commander_state'],
    });
    return {
        schema_version: 0,
        meta: { turn, seed: 'phase-gate-mistral', phase: 'war', hv_brigades_spawned: true, operation_storm_turn: 172 },
        factions: [{ id: 'HRHB', capability_profile: { training_quality: 0.7, organizational_maturity: 0.7, equipment_access: 0.7, equipment_operational: 0.7, doctrine_effectiveness: { ATTACK: 0.65, COORDINATED_STRIKE: 0.65 } } }],
        military: {
            formations, front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {}, militia_pools: {},
            fired_event_ids: [OPERATION_STORM_EVENT_ID], event_last_fired_turn: { [OPERATION_STORM_EVENT_ID]: 172 },
            corps_command: { hvo_main_staff: command(), hvo_tomislavgrad: command() },
            faction_officer_maturity: { HRHB: 3.5 },
        },
        political: {
            political_controllers: controllers, war_alliance_rbih_hrhb: 0.7, war_supply_pressure: { HRHB: 55 },
            rbih_hrhb_state: { washington_signed: true, washington_turn: 85 },
        } as unknown as GameState['political'],
        displacement: {} as GameState['displacement'],
    } as unknown as GameState;
}

describe('canonical Mistral 2 spawn propagates the opt-in to exactly the intended axis', () => {
    it('sets late_phase on the multi-axis Drvar axis only (holding, main axis = Sipovo, complete authored objective set)', () => {
        const state = buildMistralState(180);
        runOpportunityEvaluationStep(state, 180);
        const approved = applyOpportunityDecision(state, 180, buildProposalId('mistral_2_95', 180), 'approve');
        expect(approved?.status).toBe('approved');
        const op = state.military.corps_command!.hvo_tomislavgrad!.active_operations[0]!;
        const drvar = op.axes!.find((a) => a.axis_id === 'mistral_drvar_grahovo')!;
        const sipovo = op.axes!.find((a) => a.axis_id === 'mistral_sipovo')!;
        expect(drvar.late_phase).toMatchObject({
            phase: 'holding', main_axis_id: 'mistral_sipovo', receipts: [],
            requires: ['op:sipovo:sipovo_2', 'op:jajce:jajce_3'],
        });
        expect(drvar.late_phase!.gated_objectives).toEqual(drvar.objectives);
        expect(drvar.late_phase!.gated_objectives).toContain('op:titov_drvar:drvar_2');
        expect(sipovo.late_phase).toBeUndefined();
        expect(operationInstanceId('hvo_tomislavgrad', op)).toBe(`hvo_tomislavgrad:Operation Mistral 2:t${op.started_turn}`);
    });

    it('retains the COMPLETE authored gated set: a spawn-friendly Drvar objective lost during holding stays protected for every writer', () => {
        const state = buildMistralState(180);
        state.political.political_controllers!['op:titov_drvar:drvar_2'] = 'HRHB'; // friendly at spawn -> filtered out of the runtime objectives
        runOpportunityEvaluationStep(state, 180);
        applyOpportunityDecision(state, 180, buildProposalId('mistral_2_95', 180), 'approve');
        const op = state.military.corps_command!.hvo_tomislavgrad!.active_operations[0]!;
        const drvar = op.axes!.find((a) => a.axis_id === 'mistral_drvar_grahovo')!;
        expect(drvar.objectives).not.toContain('op:titov_drvar:drvar_2');
        expect(drvar.late_phase!.gated_objectives).toContain('op:titov_drvar:drvar_2');

        // Lost to the enemy while holding: a Drvar-axis brigade may not capture it by ANY writer.
        state.political.political_controllers!['op:titov_drvar:drvar_2'] = 'RS';
        const drvarBrigade = drvar.assigned_brigades[0]!;
        expect(isHeldCaptureOrder(state, drvarBrigade, 'op:titov_drvar:drvar_2')).toBe(true);
        // Lawful approach (non-gated cell), the main-axis brigade and a non-member stay free.
        expect(isHeldCaptureOrder(state, drvarBrigade, 'op:not:authored_cell')).toBe(false);
        const sipovoBrigade = op.axes!.find((a) => a.axis_id === 'mistral_sipovo')!.assigned_brigades[0]!;
        expect(isHeldCaptureOrder(state, sipovoBrigade, 'op:titov_drvar:drvar_2')).toBe(false);
        expect(isHeldCaptureOrder(state, 'unrelated_brigade', 'op:titov_drvar:drvar_2')).toBe(false);
    });

    it('authors phase_gate only on the approved Drvar, Sana, and Southern Move axes', () => {
        const gated: string[] = [];
        for (const opportunity of [...OPERATION_OPPORTUNITY_CATALOG, ...FEDERATION_WESTERN_BOSNIA_OPPORTUNITIES]) {
            const axisLists = [opportunity.axes, ...(opportunity.variants ?? []).map((variant) => variant.axes)];
            axisLists.forEach((axes, listIndex) => {
                for (const authoredAxis of axes) {
                    if (authoredAxis.phase_gate) gated.push(`${opportunity.opportunity_id}#${listIndex}:${authoredAxis.axis_id}`);
                }
            });
        }
        expect([...new Set(gated)].sort()).toEqual([
            'mistral_2_95#0:mistral_drvar_grahovo',
            'sana_95#0:sana_veliki_badic_505th',
            'sana_95#0:sana_west_sana_510th',
            'southern_move_95#0:southern_move_bjelajce_baljvine',
        ]);
        for (const variant of MISTRAL_2_95_OPPORTUNITY.variants ?? []) {
            expect(variant.axes.every((a) => a.phase_gate === undefined)).toBe(true);
        }
    });
});
