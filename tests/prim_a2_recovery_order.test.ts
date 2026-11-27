/**
 * PRIM-A2 (rulings §25.3): the political gate is read before the estimate floor.
 * An operation whose current cells are all combat-blocked (here: HRHB against RBiH before
 * their war may start) must end as `political_blocked`, which records no failed objective,
 * never as `defender_power_too_high`, which counts toward the objective cooldown.
 * Before the fix both planning sites (the preparation estimate and the pre-reconcile floor)
 * read the floor first.
 */
import { describe, expect, it } from 'vitest';

import { advanceSectorOffensives, recordFailedObjectives } from '../src/sim/combat/sector_offensive.js';
import { CURRENT_SCHEMA_VERSION } from '../src/state/game_state.js';
import type { CorpsCommandState, CorpsOperation, FactionId, GameState } from '../src/state/game_state.js';

function makeOp(overrides: Partial<CorpsOperation>): CorpsOperation {
    return {
        name: 'Op Blocked', type: 'sector_attack', phase: 'planning',
        started_turn: 9, phase_started_turn: 9,
        participating_brigades: ['brigade_a'], objectives: ['op:target:objective'],
        attack_attempt_count: 0, objective_capture_count: 0,
        preparation_sub_phase: 'ready', preparation_turns_elapsed: 5, preparation_max_turns: 5,
        ...overrides,
    } as CorpsOperation;
}

function makeState(attacker: FactionId, defender: FactionId, op: CorpsOperation): GameState {
    const cmd: CorpsCommandState = {
        command_span: 1, subordinate_count: 1, og_slots: 0, active_ogs: [],
        corps_exhaustion: 0, stance: 'offensive', active_operations: [op],
    };
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn: 10, phase: 'war', seed: 'prim-a2', rbih_hrhb_war_earliest_turn: 50 } as any,
        military: {
            formations: {
                corps_a: { id: 'corps_a', faction: attacker, name: 'Corps', created_turn: 1, status: 'active', assignment: null, kind: 'corps' } as any,
                brigade_a: {
                    id: 'brigade_a', faction: attacker, name: 'Brigade A', created_turn: 1, status: 'active',
                    assignment: null, kind: 'brigade', corps_id: 'corps_a', location_osid: 'op:target:approach', personnel: 1500,
                } as any,
            },
            front_segments: {}, front_posture: {}, front_posture_regions: {}, front_pressure: {}, militia_pools: {},
            corps_command: { corps_a: cmd },
        } as any,
        political: {
            political_controllers: { 'op:target:objective': defender, 'op:target:approach': attacker },
            rbih_hrhb_state: {},
        } as any,
    } as unknown as GameState;
}

const after = (s: GameState) => s.military.corps_command!.corps_a!.active_operations![0]!;

describe('PRIM-A2: the political gate is read before the estimate floor', () => {
    it('a ready operation below the floor whose cell is combat-blocked ends political_blocked', () => {
        const s = makeState('HRHB', 'RBiH', makeOp({ force_ratio_estimate: 0.09 }));
        advanceSectorOffensives(s, null);
        expect(after(s).phase).toBe('recovery');
        expect(after(s).recovery_reason).toBe('political_blocked');
    });

    it('an operation in preparation whose estimate falls below the floor at a blocked cell ends political_blocked', () => {
        // Still preparing: tickPreparation takes the estimate (the lone brigade faces no
        // defender, so it is the sentinel) and the preparation site decides. Force the low
        // estimate with an attacker that has no attack power.
        const op = makeOp({ preparation_sub_phase: 'intel_gathering' as any, preparation_turns_elapsed: 0, preparation_max_turns: 9 });
        const s = makeState('HRHB', 'RBiH', op);
        (s.military.formations.brigade_a as any).personnel = 0;
        advanceSectorOffensives(s, null);
        const o = after(s);
        expect(o.phase).toBe('recovery');
        expect(o.recovery_reason).toBe('political_blocked');
    });

    it('an operation that skips preparation (RS blitz, weeks 0-12) below the floor at a Graz-blocked HRHB cell ends political_blocked', () => {
        // The pre-reconcile site: the blitz phase skips tickPreparation, so the stored
        // estimate is read there. Graz (RS and HRHB both accepted) blocks RS attacks on HRHB.
        const s = makeState('RS', 'HRHB', makeOp({ force_ratio_estimate: 0.09 }));
        (s.political as any).vienna_declaration_turn = 5;
        (s.political as any).vienna_accepted = { RS: true, HRHB: true };
        advanceSectorOffensives(s, null);
        expect(after(s).phase).toBe('recovery');
        expect(after(s).recovery_reason).toBe('political_blocked');
    });

    it('the same operation against an open cell still ends defender_power_too_high (the floor is unchanged)', () => {
        const s = makeState('RS', 'RBiH', makeOp({ force_ratio_estimate: 0.09 }));
        advanceSectorOffensives(s, null);
        expect(after(s).recovery_reason).toBe('defender_power_too_high');
    });

    it('political_blocked records no failed objective; defender_power_too_high does', () => {
        const cmd = (): CorpsCommandState => ({
            command_span: 1, subordinate_count: 1, og_slots: 0, active_ogs: [], corps_exhaustion: 0, stance: 'offensive', active_operations: [],
        });
        const blocked = cmd();
        recordFailedObjectives(blocked, makeOp({ phase: 'recovery', recovery_reason: 'political_blocked' }), 10);
        expect(JSON.stringify(blocked)).toBe(JSON.stringify(cmd()));
        const failed = cmd();
        recordFailedObjectives(failed, makeOp({ phase: 'recovery', recovery_reason: 'defender_power_too_high' }), 10);
        expect(JSON.stringify(failed)).not.toBe(JSON.stringify(cmd()));
    });
});
