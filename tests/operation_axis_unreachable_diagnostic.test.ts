/**
 * Phase C of the Late-War Operation Combat Delivery mega-lane.
 *
 * Engine diagnostic: when a multi-axis operation reaches the launch-readiness
 * gate (`areParticipantsReadyForExecution`), an axis whose first objective has
 * zero approach OSIDs (front-unreachable from any friendly position) is
 * silently skipped. The op still launches on its other axes; the unreachable
 * axis stays in 'executing' but never attacks.
 *
 * Phase C does NOT change that execution flow. It only writes a diagnostic
 * marker (`OperationAxis.unreachable_at_launch = true`) which carries through
 * to `AxisAAR.unreachable_at_launch` so post-mortem tooling can identify the
 * silent-skip without source spelunking.
 *
 * Red-first contract:
 *   - Multi-axis op with axis_a (reachable) + axis_b (unreachable).
 *   - After `areParticipantsReadyForExecution`:
 *       axis_b.unreachable_at_launch === true
 *       axis_a.unreachable_at_launch !== true
 *       function returns true (silent-skip preserved; op still launches).
 *   - After `finalizeOperationAAR`:
 *       AxisAAR for axis_b carries unreachable_at_launch === true
 *       AxisAAR for axis_a does not.
 */

import { describe, it, expect } from 'vitest';
import { areParticipantsReadyForExecution } from '../src/sim/combat/sector_offensive_launch_helpers.js';
import { finalizeOperationAAR, type OperationAAR } from '../src/sim/combat/operation_aar.js';
import type { CorpsOperation, FactionId, FormationId, GameState } from '../src/state/game_state.js';

// ─── Synthetic-state fixture builder ───────────────────────────────────────
// Minimal GameState shape sufficient for areParticipantsReadyForExecution +
// finalizeOperationAAR. Not the 5th Corps catalog; entirely synthetic.

interface FixtureOpts {
    corpsId: FormationId;
    faction: FactionId;
    op: CorpsOperation;
    /** OSID -> faction mapping. */
    politicalControllers: Record<string, string>;
    /**
     * Front edges. Reachable axis must have at least one front edge between
     * its first objective and a friendly-controlled neighbor; unreachable
     * axis must have NO front edges touching its first objective.
     */
    frontEdges: Array<{ a: string; b: string }>;
    /** Brigade definitions keyed by FormationId. Personnel >= MIN_ATTACK_PERSONNEL,
     *  status='active', not in transit, located at a friendly approach OSID. */
    formations: Record<string, {
        personnel: number;
        status: 'active' | 'inactive' | 'destroyed';
        location_osid: string;
        corps_id: string;
        faction: string;
    }>;
}

function makeFixtureState(opts: FixtureOpts): GameState {
    const { corpsId, op, politicalControllers, frontEdges, formations } = opts;

    const corps_command: Record<string, any> = {
        [corpsId]: {
            command_span: 5,
            subordinate_count: 3,
            og_slots: 2,
            active_ogs: [],
            corps_exhaustion: 0,
            stance: 'offensive',
            active_operations: [op],
        },
    };

    const war_front_edges_osid = frontEdges.map((e, idx) => ({
        edge_id: `e${idx}:${e.a}:${e.b}`,
        a: e.a,
        b: e.b,
        side_a: null,
        side_b: null,
    }));

    return {
        meta: { turn: 5, phase: 'war' },
        military: {
            formations,
            corps_command,
            war_front_edges_osid,
        },
        political: { political_controllers: politicalControllers },
    } as unknown as GameState;
}

// ─── Op constructor ────────────────────────────────────────────────────────

function makeMultiAxisOp(): CorpsOperation {
    return {
        name: 'Op Diagnostic Test',
        type: 'sector_attack',
        phase: 'execution',
        started_turn: 5,
        phase_started_turn: 5,
        participating_brigades: ['bde_a', 'bde_b'] as FormationId[],
        axes: [
            {
                axis_id: 'axis_a',
                name: 'Reachable Axis',
                assigned_brigades: ['bde_a'] as FormationId[],
                objectives: ['op:test:reachable_obj'],
                current_objective_index: 0,
                status: 'executing',
                failure_count: 0,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            },
            {
                axis_id: 'axis_b',
                name: 'Unreachable Axis',
                assigned_brigades: ['bde_b'] as FormationId[],
                objectives: ['op:test:unreachable_obj'],
                current_objective_index: 0,
                status: 'executing',
                failure_count: 0,
                consecutive_failures_on_current: 0,
                momentum: 0,
                attack_attempt_count: 0,
                objective_capture_count: 0,
                movement_only_execution_turns: 0,
                idle_execution_turn_streak: 0,
            },
        ],
    };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('Phase C — axis.unreachable_at_launch diagnostic', () => {
    it('marks axis as unreachable when first objective has zero approach OSIDs', () => {
        const op = makeMultiAxisOp();
        const state = makeFixtureState({
            corpsId: 'corps_test' as FormationId,
            faction: 'RBiH' as FactionId,
            op,
            politicalControllers: {
                // axis_a target is enemy-held with a friendly neighbor.
                'op:test:reachable_obj': 'RS',
                'op:test:friendly_approach': 'RBiH',
                // axis_b target is enemy-held with NO front edges anywhere.
                'op:test:unreachable_obj': 'RS',
            },
            frontEdges: [
                // axis_a reachability: edge between target and a friendly OSID.
                { a: 'op:test:reachable_obj', b: 'op:test:friendly_approach' },
                // axis_b: zero front edges touch op:test:unreachable_obj.
            ],
            formations: {
                bde_a: {
                    personnel: 1500,
                    status: 'active',
                    location_osid: 'op:test:friendly_approach',
                    corps_id: 'corps_test',
                    faction: 'RBiH',
                },
                bde_b: {
                    personnel: 1500,
                    status: 'active',
                    location_osid: 'op:test:friendly_approach',
                    corps_id: 'corps_test',
                    faction: 'RBiH',
                },
            },
        });

        const ready = areParticipantsReadyForExecution(
            state,
            'corps_test' as FormationId,
            'RBiH' as FactionId,
            op,
        );

        // Silent-skip behavior preserved: axis_a is ready, so the op launches.
        expect(ready).toBe(true);

        // Diagnostic written to axis_b only.
        expect(op.axes![1]!.unreachable_at_launch).toBe(true);
        expect(op.axes![0]!.unreachable_at_launch).not.toBe(true);
    });

    it('does not mark either axis when both have approach OSIDs', () => {
        const op = makeMultiAxisOp();
        op.axes![1]!.objectives = ['op:test:reachable_obj_b'];
        const state = makeFixtureState({
            corpsId: 'corps_test' as FormationId,
            faction: 'RBiH' as FactionId,
            op,
            politicalControllers: {
                'op:test:reachable_obj': 'RS',
                'op:test:reachable_obj_b': 'RS',
                'op:test:friendly_approach': 'RBiH',
            },
            frontEdges: [
                { a: 'op:test:reachable_obj', b: 'op:test:friendly_approach' },
                { a: 'op:test:reachable_obj_b', b: 'op:test:friendly_approach' },
            ],
            formations: {
                bde_a: {
                    personnel: 1500,
                    status: 'active',
                    location_osid: 'op:test:friendly_approach',
                    corps_id: 'corps_test',
                    faction: 'RBiH',
                },
                bde_b: {
                    personnel: 1500,
                    status: 'active',
                    location_osid: 'op:test:friendly_approach',
                    corps_id: 'corps_test',
                    faction: 'RBiH',
                },
            },
        });

        const ready = areParticipantsReadyForExecution(
            state,
            'corps_test' as FormationId,
            'RBiH' as FactionId,
            op,
        );

        expect(ready).toBe(true);
        expect(op.axes![0]!.unreachable_at_launch).not.toBe(true);
        expect(op.axes![1]!.unreachable_at_launch).not.toBe(true);
    });

    it('AxisAAR carries unreachable_at_launch through to finalize', () => {
        const op: CorpsOperation = {
            name: 'Op Diagnostic Carryover',
            type: 'sector_attack',
            phase: 'recovery',
            started_turn: 5,
            phase_started_turn: 9,
            participating_brigades: ['bde_a', 'bde_b'] as FormationId[],
            recovery_reason: 'max_failures',
            initial_strength: 3000,
            axes: [
                {
                    axis_id: 'axis_a',
                    name: 'Reachable Axis',
                    assigned_brigades: ['bde_a'] as FormationId[],
                    objectives: ['op:test:reachable_obj'],
                    current_objective_index: 0,
                    status: 'stalled',
                    failure_count: 1,
                    consecutive_failures_on_current: 1,
                    momentum: 0,
                    attack_attempt_count: 1,
                    objective_capture_count: 0,
                    movement_only_execution_turns: 0,
                    idle_execution_turn_streak: 0,
                    // axis_a was reachable; no diagnostic.
                },
                {
                    axis_id: 'axis_b',
                    name: 'Unreachable Axis',
                    assigned_brigades: ['bde_b'] as FormationId[],
                    objectives: ['op:test:unreachable_obj'],
                    current_objective_index: 0,
                    status: 'stalled',
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                    momentum: 0,
                    attack_attempt_count: 0,
                    objective_capture_count: 0,
                    movement_only_execution_turns: 0,
                    idle_execution_turn_streak: 0,
                    // Diagnostic written by Phase C engine fix.
                    unreachable_at_launch: true,
                },
            ],
            weekly_log: [],
        };

        // Minimal finalize fixture (matches operation_aar.test.ts pattern).
        const state = {
            meta: { turn: 12, phase: 'war' },
            military: {
                formations: {
                    bde_a: { personnel: 1300, faction: 'RBiH', status: 'active', corps_id: 'corps_test' },
                    bde_b: { personnel: 1200, faction: 'RBiH', status: 'active', corps_id: 'corps_test' },
                },
                corps_command: {
                    corps_test: {
                        command_span: 5,
                        subordinate_count: 3,
                        og_slots: 2,
                        active_ogs: [],
                        corps_exhaustion: 0,
                        stance: 'offensive',
                        active_operations: [op],
                    },
                },
            },
            political: {
                political_controllers: {
                    'op:test:reachable_obj': 'RS',
                    'op:test:unreachable_obj': 'RS',
                },
            },
        } as unknown as GameState;

        finalizeOperationAAR(state, 'corps_test' as FormationId, op);

        const aar: OperationAAR = (state as any).operation_history[0];
        expect(aar.axis_summaries).toBeDefined();
        const axisA = aar.axis_summaries!.find(a => a.axis_id === 'axis_a')!;
        const axisB = aar.axis_summaries!.find(a => a.axis_id === 'axis_b')!;
        expect(axisB.unreachable_at_launch).toBe(true);
        expect(axisA.unreachable_at_launch).toBeUndefined();
    });
});
