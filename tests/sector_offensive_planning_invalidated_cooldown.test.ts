/**
 * LANE-2026-05-02-B1-PLANNING-INVALIDATED-COOLDOWN — Cooldown contract test.
 *
 * Asserts that an op recovering with `recovery_reason: 'planning_invalidated'`
 * records each of its objectives into `failed_offensive_objectives`, mirroring
 * the existing combat-failure path (max_failures / brigade_attrition).
 *
 * Background (from /operations-expert + /anomaly-triage Tier 1 panel on n1621):
 *   - 6 sequential commander ops emitted at the same target_osids tuple
 *     `[op:doboj:brijesnica_velika, op:doboj:grapska_gornja_2]` by
 *     `cmd_vrs_1st_krajina_main` between t125 and t166, all
 *     `recovery_reason: 'planning_invalidated'`, all `total_attacks: 0`.
 *   - Root cause: `recordFailedObjectives` (`sector_offensive.ts:318-346`)
 *     explicitly skipped `planning_invalidated` recoveries:
 *       `if (op.recovery_reason === 'planning_invalidated') return;`
 *   - `failed_offensive_objectives` cooldown (threshold=2, 8-turn cooldown)
 *     was therefore never triggered, and the corps re-emitted the same plan
 *     every turn until terrain shifted.
 *
 * Truth this test asserts:
 *   T1 — A single planning_invalidated op on a fresh corps records
 *        `failure_count = 1` and `cooldown_until_turn = 0` on each of its
 *        objectives (parity with max_failures path).
 *   T2 — A second planning_invalidated op on the same corps + same osid
 *        crosses the threshold and sets `cooldown_until_turn = turn + 8`.
 *   T3 — Multi-axis planning_invalidated records every uncaptured axis
 *        objective deterministically.
 *   T4 — Other recovery reasons that should still skip (probe_complete,
 *        political_blocked) remain skipped.
 *
 * Determinism: pure synchronous assertions over hand-built minimal GameState.
 * No I/O, no async, no random, no timestamps.
 */

import { describe, it, expect } from 'vitest';
import { advanceSectorOffensives } from '../src/sim/combat/sector_offensive.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { CorpsCommandState, CorpsOperation, GameState } from '../src/state/game_state.js';

function makeOp(name: string, objectives: string[], turn: number): CorpsOperation {
    // An op already in recovery with planning_invalidated. advanceSectorOffensives
    // calls finalize on recovery-phase ops which routes through recordFailedObjectives.
    return {
        name,
        type: 'sector_attack',
        phase: 'recovery',
        started_turn: turn - 5,
        phase_started_turn: turn - 1,
        participating_brigades: ['rs_brigade_a'],
        objectives,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        recovery_reason: 'planning_invalidated',
    };
}

function makeState(turn: number, ops: CorpsOperation[], existingFailed?: CorpsCommandState['failed_offensive_objectives']): GameState {
    const cmd: CorpsCommandState = {
        command_span: 1,
        subordinate_count: 1,
        og_slots: 0,
        active_ogs: [],
        corps_exhaustion: 0,
        stance: 'defensive',
        active_operations: ops,
        failed_offensive_objectives: existingFailed ?? {},
    };
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, phase: 'war', seed: 'planning-invalidated-cooldown' } as any,
        military: {
            formations: {
                rs_corps: {
                    id: 'rs_corps',
                    faction: 'RS',
                    name: 'Corps',
                    created_turn: 1,
                    status: 'active',
                    assignment: null,
                    kind: 'corps',
                } as any,
                rs_brigade_a: {
                    id: 'rs_brigade_a',
                    faction: 'RS',
                    name: 'Brigade A',
                    created_turn: 1,
                    status: 'active',
                    assignment: null,
                    kind: 'brigade',
                    corps_id: 'rs_corps',
                    location_osid: 'op:base:home',
                    personnel: 1500,
                } as any,
            },
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            corps_command: { rs_corps: cmd },
        } as any,
        political: {
            political_controllers: {
                'op:target:objective_a': 'RBiH',
                'op:target:objective_b': 'RBiH',
            },
        } as any,
    } as unknown as GameState;
}

describe('LANE-B1 planning_invalidated cooldown', () => {
    it('T1 — first planning_invalidated records failure_count=1, no cooldown yet', () => {
        const state = makeState(10, [makeOp('Op First', ['op:target:objective_a'], 10)]);
        advanceSectorOffensives(state, null);
        const failed = state.military.corps_command?.rs_corps?.failed_offensive_objectives?.['op:target:objective_a'];
        expect(failed).toBeDefined();
        expect(failed?.failure_count).toBe(1);
        expect(failed?.cooldown_until_turn ?? 0).toBe(0);
    });

    it('T2 — second planning_invalidated on same osid triggers cooldown', () => {
        const existingFailed = {
            'op:target:objective_a': { failure_count: 1, cooldown_until_turn: 0 },
        };
        const state = makeState(20, [makeOp('Op Second', ['op:target:objective_a'], 20)], existingFailed);
        advanceSectorOffensives(state, null);
        const failed = state.military.corps_command?.rs_corps?.failed_offensive_objectives?.['op:target:objective_a'];
        expect(failed?.failure_count).toBe(2);
        // OBJECTIVE_FAILURE_THRESHOLD=2, OBJECTIVE_FAILURE_COOLDOWN_TURNS=8 per
        // sector_offensive.ts L170,L177. Cooldown = current_turn + 8 = 28.
        expect(failed?.cooldown_until_turn).toBe(28);
    });

    it('T3 — multi-axis planning_invalidated records each axis objective', () => {
        const op: CorpsOperation = {
            name: 'Op Multi',
            type: 'sector_attack',
            phase: 'recovery',
            started_turn: 5,
            phase_started_turn: 9,
            participating_brigades: ['rs_brigade_a'],
            attack_attempt_count: 0,
            objective_capture_count: 0,
            recovery_reason: 'planning_invalidated',
            axes: [
                {
                    axis_id: 'axis_a',
                    status: 'planning',
                    objectives: ['op:target:objective_a'],
                    assigned_brigades: ['rs_brigade_a'],
                    momentum: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                    attack_attempt_count: 0,
                    objective_capture_count: 0,
                } as any,
                {
                    axis_id: 'axis_b',
                    status: 'planning',
                    objectives: ['op:target:objective_b'],
                    assigned_brigades: [],
                    momentum: 0,
                    failure_count: 0,
                    consecutive_failures_on_current: 0,
                    attack_attempt_count: 0,
                    objective_capture_count: 0,
                } as any,
            ],
        };
        const state = makeState(10, [op]);
        advanceSectorOffensives(state, null);
        const fa = state.military.corps_command?.rs_corps?.failed_offensive_objectives?.['op:target:objective_a'];
        const fb = state.military.corps_command?.rs_corps?.failed_offensive_objectives?.['op:target:objective_b'];
        expect(fa?.failure_count).toBe(1);
        expect(fb?.failure_count).toBe(1);
    });

    it('T4 — probe_complete and political_blocked recoveries STILL skip (regression guard)', () => {
        for (const reason of ['probe_complete', 'political_blocked'] as const) {
            const op = makeOp(`Op ${reason}`, ['op:target:objective_a'], 10);
            op.recovery_reason = reason;
            const state = makeState(10, [op]);
            advanceSectorOffensives(state, null);
            const failed = state.military.corps_command?.rs_corps?.failed_offensive_objectives?.['op:target:objective_a'];
            expect(failed, `${reason} should NOT record a failure`).toBeUndefined();
        }
    });
});
