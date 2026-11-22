import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CorpsOperation, OperationAxis } from '../src/state/game_state.js';
import {
    END_RULE_MIRRORED_CONSTANTS,
    deriveOperationEndRule,
    joinEndRulesIntoAars,
    operationEndRuleKey,
    snapshotOperationEndRulePrior,
    type OperationEndRuleContext,
} from '../src/scenario/operation_end_rule.js';

// The recovery-entry week. Every fixture enters recovery on TURN.
const TURN = 30;

function op(fields: Partial<CorpsOperation>): CorpsOperation {
    return {
        name: 'Op Test',
        type: 'sector_attack',
        phase: 'recovery',
        started_turn: 10,
        phase_started_turn: TURN,
        participating_brigades: ['b1'],
        planning_phase_started_turn: 12,
        ...fields,
    } as unknown as CorpsOperation;
}

function axis(fields: Partial<OperationAxis>): OperationAxis {
    return {
        axis_id: 'main',
        name: 'Main',
        assigned_brigades: ['b1'],
        objectives: ['o1', 'o2'],
        current_objective_index: 0,
        status: 'stalled',
        failure_count: 0,
        consecutive_failures_on_current: 0,
        momentum: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
        ...fields,
    } as OperationAxis;
}

/** The previous week the operation was executing, launched on turn 20. */
function executingPrior(streak?: number): OperationEndRuleContext['prior'] {
    return {
        phase: 'execution',
        phase_started_turn: 20,
        ...(streak !== undefined ? { silent_execution_turn_streak: streak } : {}),
    };
}

function rule(operation: CorpsOperation, ctx: Partial<OperationEndRuleContext> = {}): string {
    return deriveOperationEndRule(operation, { turn: TURN, ...ctx }).end_rule;
}

describe('deriveOperationEndRule: one label per exit rule', () => {
    it('silent_execution: attacked earlier, prior-week silence streak at the exit threshold', () => {
        const ended = op({ recovery_reason: 'max_failures', attack_attempt_count: 2, objectives: ['o1', 'o2'], failure_count: 1 });
        expect(rule(ended, { prior: executingPrior(5) })).toBe('silent_execution');
    });

    it('a prior-week streak one short of the threshold cannot have fired the silent exit', () => {
        const ended = op({ recovery_reason: 'max_failures', attack_attempt_count: 2, objectives: ['o1', 'o2'], failure_count: 1 });
        expect(rule(ended, { prior: executingPrior(4) })).toBe('unattributed:max_failures');
    });

    it('lifetime_no_attack: zero lifetime attacks after five execution turns', () => {
        const ended = op({ recovery_reason: 'no_logged_attempt', attack_attempt_count: 0, objectives: ['o1'] });
        expect(rule(ended, { prior: executingPrior(5) })).toBe('lifetime_no_attack');
    });

    it('the lifetime-0 exit and the silent exit get different labels', () => {
        const lifetime = op({ recovery_reason: 'no_logged_attempt', attack_attempt_count: 0, objectives: ['o1'] });
        const silent = op({ recovery_reason: 'max_failures', attack_attempt_count: 3, objectives: ['o1'], failure_count: 2 });
        const lifetimeRule = rule(lifetime, { prior: executingPrior(5) });
        const silentRule = rule(silent, { prior: executingPrior(5) });
        expect(lifetimeRule).toBe('lifetime_no_attack');
        expect(silentRule).toBe('silent_execution');
        expect(lifetimeRule).not.toBe(silentRule);
    });

    it('total_failure_cap: legacy flat operation at eight failures', () => {
        const ended = op({ recovery_reason: 'max_failures', attack_attempt_count: 8, failure_count: 8, objectives: ['o1', 'o2'], current_objective_index: 1 });
        expect(rule(ended, { prior: executingPrior() })).toBe('total_failure_cap');
    });

    it('total_failure_cap with a movement-only counter at its cap stays ambiguous', () => {
        const ended = op({ recovery_reason: 'max_failures', attack_attempt_count: 8, failure_count: 8, movement_only_execution_turns: 4, objectives: ['o1', 'o2'] });
        expect(rule(ended, { prior: executingPrior() })).toBe('max_failures:ambiguous(movement_only_stall|total_failure_cap)');
    });

    it('axis_failure_cap: single-axis operation at four failures', () => {
        const ended = op({ recovery_reason: 'max_failures', attack_attempt_count: 4, axes: [axis({ failure_count: 4, attack_attempt_count: 4 })] });
        expect(rule(ended, { prior: executingPrior() })).toBe('axis_failure_cap');
    });

    it('zero_progress: multi-axis axis with five failures, no capture, one attack', () => {
        const ended = op({
            recovery_reason: 'max_failures',
            attack_attempt_count: 5,
            axes: [
                axis({ axis_id: 'a', failure_count: 5, attack_attempt_count: 5 }),
                axis({ axis_id: 'b', failure_count: 5, attack_attempt_count: 1 }),
            ],
        });
        const receipt = deriveOperationEndRule(ended, { turn: TURN, prior: executingPrior() });
        expect(receipt.end_rule).toBe('zero_progress');
        expect(receipt.end_rule_axes).toEqual({ a: 'zero_progress', b: 'zero_progress' });
    });

    it('consecutive_catastrophic: two catastrophic outcomes on the current objective', () => {
        const ended = op({ recovery_reason: 'max_failures', attack_attempt_count: 2, axes: [axis({ failure_count: 2, attack_attempt_count: 2, consecutive_catastrophic_on_current: 2 })] });
        expect(rule(ended, { prior: executingPrior() })).toBe('consecutive_catastrophic');
    });

    it('recent_catastrophic_stall: the pre-results catastrophic-losses stall', () => {
        const ended = op({ recovery_reason: 'max_failures', attack_attempt_count: 1, axes: [axis({ failure_count: 1, attack_attempt_count: 1, launch_blocker: 'recent_catastrophic_losses_at_objective' })] });
        expect(rule(ended, { prior: executingPrior() })).toBe('recent_catastrophic_stall');
    });

    it('objective_failures_exhausted: objectives skipped past the end without capturing them all', () => {
        const legacy = op({ recovery_reason: 'max_failures', attack_attempt_count: 6, failure_count: 6, objectives: ['o1', 'o2'], current_objective_index: 2, objective_capture_count: 0 });
        expect(rule(legacy, { prior: executingPrior() })).toBe('objective_failures_exhausted');
        const single = op({ recovery_reason: 'max_failures', attack_attempt_count: 3, axes: [axis({ status: 'complete', objectives: ['o1'], current_objective_index: 1, attack_attempt_count: 3, failure_count: 3 })] });
        expect(rule(single, { prior: executingPrior() })).toBe('objective_failures_exhausted');
    });

    it('partial_capture_axes_terminal: multi-axis, some objectives taken, every axis terminal', () => {
        const ended = op({
            recovery_reason: 'max_failures',
            attack_attempt_count: 6,
            objective_capture_count: 1,
            axes: [
                axis({ axis_id: 'a', status: 'complete', objectives: ['o1'], current_objective_index: 1, objective_capture_count: 1, attack_attempt_count: 1 }),
                axis({ axis_id: 'b', failure_count: 8, attack_attempt_count: 5 }),
            ],
        });
        const receipt = deriveOperationEndRule(ended, { turn: TURN, prior: executingPrior() });
        expect(receipt.end_rule).toBe('partial_capture_axes_terminal');
        expect(receipt.end_rule_axes).toEqual({ a: 'objectives_taken', b: 'axis_failure_cap' });
    });

    it('axes_terminal_mixed: multi-axis, no capture, axes stalled by different rules', () => {
        const ended = op({
            recovery_reason: 'max_failures',
            attack_attempt_count: 2,
            axes: [
                axis({ axis_id: 'b', consecutive_catastrophic_on_current: 2, attack_attempt_count: 2, failure_count: 2 }),
                axis({ axis_id: 'a', idle_execution_turn_streak: 4, failure_count: 4 }),
            ],
        });
        const receipt = deriveOperationEndRule(ended, { turn: TURN, prior: executingPrior() });
        expect(receipt.end_rule).toBe('axes_terminal_mixed');
        expect(Object.keys(receipt.end_rule_axes ?? {})).toEqual(['a', 'b']);
        expect(receipt.end_rule_axes).toEqual({ a: 'axis_idle_stall', b: 'consecutive_catastrophic' });
    });

    it('axis_idle_stall: no attack ever and an idle streak at the threshold', () => {
        const single = op({ recovery_reason: 'no_logged_attempt', axes: [axis({ idle_execution_turn_streak: 4, failure_count: 4, movement_only_execution_turns: 1 })] });
        expect(rule(single, { prior: executingPrior() })).toBe('axis_idle_stall');
        const legacy = op({ recovery_reason: 'no_logged_attempt', objectives: ['o1'], idle_execution_turn_streak: 4, failure_count: 4, movement_only_execution_turns: 1 });
        expect(rule(legacy, { prior: executingPrior() })).toBe('axis_idle_stall');
    });

    it('a probe idles out at a one-turn threshold and still names the rule (recorded planning_invalidated)', () => {
        const probe = op({ type: 'probe', recovery_reason: 'planning_invalidated', objectives: ['o1'], idle_execution_turn_streak: 1, failure_count: 1 });
        expect(rule(probe, { prior: executingPrior() })).toBe('axis_idle_stall');
    });

    it('movement_only_stall: four movement-only turns', () => {
        const ended = op({ recovery_reason: 'max_failures', attack_attempt_count: 1, axes: [axis({ movement_only_execution_turns: 4, attack_attempt_count: 1, failure_count: 1 })] });
        expect(rule(ended, { prior: executingPrior() })).toBe('movement_only_stall');
    });

    it('lifetime-0 and movement-only both satisfied stay ambiguous', () => {
        const ended = op({ recovery_reason: 'no_logged_attempt', objectives: ['o1'], movement_only_execution_turns: 5 });
        expect(rule(ended, { prior: executingPrior() })).toBe('no_logged_attempt:ambiguous(lifetime_no_attack|movement_only_stall)');
    });

    it('objectives_taken: completed', () => {
        expect(rule(op({ recovery_reason: 'completed' }))).toBe('objectives_taken');
    });

    it('reorganization_complete: the reorganization clock', () => {
        expect(rule(op({ type: 'reorganization', recovery_reason: 'completed' }))).toBe('reorganization_complete');
    });

    it('probe_contact: a probe that made contact', () => {
        expect(rule(op({ type: 'probe', recovery_reason: 'probe_complete', attack_attempt_count: 1 }))).toBe('probe_contact');
    });

    it('opening_readiness carries the blocker code', () => {
        expect(rule(op({ phase: 'recovery', recovery_reason: 'participants_below_assembly_floor' })))
            .toBe('opening_readiness:participants_below_assembly_floor');
        expect(rule(op({ recovery_reason: 'zero_eligible_axis' }))).toBe('opening_readiness:zero_eligible_axis');
    });

    it('launch_demotion: second zero-order launch', () => {
        expect(rule(op({ recovery_reason: 'zero_eligible_axis', launch_demotion_count: 2 }))).toBe('launch_demotion');
    });

    it('ceasefire, defender_too_strong, political_blocked, offensive_ops_suppressed', () => {
        expect(rule(op({ recovery_reason: 'ceasefire' }))).toBe('ceasefire');
        expect(rule(op({ recovery_reason: 'defender_power_too_high' }))).toBe('defender_too_strong');
        expect(rule(op({ recovery_reason: 'political_blocked' }))).toBe('political_blocked');
        expect(rule(op({ recovery_reason: 'offensive_ops_suppressed' }))).toBe('offensive_ops_suppressed');
    });

    it('planning_invalidated: from planning', () => {
        expect(rule(op({ recovery_reason: 'planning_invalidated', planning_phase_started_turn: undefined }), {
            prior: { phase: 'planning', phase_started_turn: 25 },
        })).toBe('planning_invalidated');
    });

    it('not_ready: participants not execution-ready', () => {
        expect(rule(op({ recovery_reason: 'no_launch_readiness' }))).toBe('not_ready');
    });

    it('manual_termination, preparation_abort, feint_expiry, preempted', () => {
        expect(rule(op({ recovery_reason: 'manual_termination' }))).toBe('manual_termination');
        expect(rule(op({ recovery_reason: 'manual_termination', commander_assessment: 'abort' }))).toBe('preparation_abort');
        expect(rule(op({ type: 'feint', recovery_reason: 'manual_termination' }))).toBe('feint_expiry');
        expect(rule(op({ recovery_reason: 'manual_termination', participating_brigades: [] }))).toBe('preempted');
    });

    it('brigade_attrition carries the reevaluation sub-reason; without a log it is the final reconciliation', () => {
        const logged = op({
            recovery_reason: 'brigade_attrition',
            reevaluation_log: [
                { turn: TURN - 1, reason: 'healthy', decision: 'continue', active_brigades: 2, total_personnel: 900 },
                { turn: TURN, reason: 'below_minimum_brigades (1/2)', decision: 'abort', active_brigades: 1, total_personnel: 400 },
            ],
        } as Partial<CorpsOperation>);
        expect(rule(logged)).toBe('brigade_attrition:below_minimum_brigades');
        expect(rule(op({ recovery_reason: 'brigade_attrition' }))).toBe('brigade_attrition:no_active_participants');
    });

    it('orphaned_sector: recorded, and a zero-attempt orphan from planning', () => {
        expect(rule(op({ recovery_reason: 'orphaned_sector' }))).toBe('orphaned_sector');
        expect(rule(op({ recovery_reason: 'no_logged_attempt', planning_phase_started_turn: undefined }), {
            prior: { phase: 'planning', phase_started_turn: 25 },
        })).toBe('orphaned_sector');
    });

    it('an executing zero-attempt orphan that also meets a counter rule stays ambiguous', () => {
        const ended = op({ recovery_reason: 'no_logged_attempt', objectives: ['o1'] });
        expect(rule(ended, { prior: executingPrior(), sector_missing: true }))
            .toBe('no_logged_attempt:ambiguous(lifetime_no_attack|orphaned_sector)');
    });

    it('tg_cohesion_exhausted and tg_max_lifecycle', () => {
        expect(rule(op({ recovery_reason: 'tg_cohesion_exhausted' }))).toBe('tg_cohesion_exhausted');
        expect(rule(op({ recovery_reason: 'tg_max_lifecycle' }))).toBe('tg_max_lifecycle');
    });

    it('late_phase_main_terminal and axis_no_active_brigades', () => {
        const late = op({
            recovery_reason: 'max_failures',
            attack_attempt_count: 4,
            axes: [
                axis({ axis_id: 'a', failure_count: 8, attack_attempt_count: 4 }),
                axis({ axis_id: 'b', late_phase: { phase: 'holding', main_axis_id: 'a', terminal_reason: 'main_axis_terminal_without_prerequisites' } as OperationAxis['late_phase'] }),
            ],
        });
        expect(deriveOperationEndRule(late, { turn: TURN, prior: executingPrior() }).end_rule_axes)
            .toEqual({ a: 'axis_failure_cap', b: 'late_phase_main_terminal' });
        const empty = op({ recovery_reason: 'max_failures', attack_attempt_count: 1, axes: [axis({ attack_attempt_count: 1, failure_count: 1, assigned_brigades: [] })] });
        expect(rule(empty, { prior: executingPrior(), inactive_axis_ids: ['main'] })).toBe('axis_no_active_brigades');
    });

    it('general offensive exits read the execution clock; unknown clock stays ambiguous', () => {
        const general = op({ type: 'general_offensive', recovery_reason: 'no_logged_attempt', planning_phase_started_turn: undefined });
        expect(rule(general, { prior: { phase: 'execution', phase_started_turn: 27 } })).toBe('general_op_progress_failure');
        expect(rule(general)).toBe('no_logged_attempt:ambiguous(general_op_execution_timeout|general_op_progress_failure)');
    });

    it('a retired reason and a missing reason are named, never guessed', () => {
        expect(rule(op({ recovery_reason: 'insufficient_donation' }))).toBe('retired:insufficient_donation');
        expect(rule(op({ recovery_reason: undefined }))).toBe('unattributed:none');
    });
});

describe('end-rule report plumbing', () => {
    it('snapshotOperationEndRulePrior keeps the fields the next week needs', () => {
        const executing = op({ phase: 'execution', phase_started_turn: 20, silent_execution_turn_streak: 3 });
        expect(snapshotOperationEndRulePrior(executing)).toEqual({ phase: 'execution', phase_started_turn: 20, silent_execution_turn_streak: 3 });
        expect(snapshotOperationEndRulePrior(op({ phase: 'planning', phase_started_turn: 18 })))
            .toEqual({ phase: 'planning', phase_started_turn: 18 });
        expect(operationEndRuleKey('corps_1', executing)).toBe('corps_1:Op Test:t10');
    });

    it('joinEndRulesIntoAars copies receipts onto AARs without mutating the input', () => {
        const aars = [
            { operation_id: 'c:A:t1', recovery_reason: 'max_failures' },
            { operation_id: 'c:B:t2', recovery_reason: 'completed' },
        ];
        const receipts = new Map([
            ['c:A:t1', { end_rule: 'silent_execution' }],
        ]);
        const joined = joinEndRulesIntoAars(aars, receipts);
        expect(joined).toEqual([
            { operation_id: 'c:A:t1', recovery_reason: 'max_failures', end_rule: 'silent_execution' },
            { operation_id: 'c:B:t2', recovery_reason: 'completed', end_rule: 'unobserved' },
        ]);
        expect(aars[0]).not.toHaveProperty('end_rule');
    });

    it('mirrored thresholds match the sim source they copy', () => {
        const source = readFileSync(join(__dirname, '..', 'src', 'sim', 'combat', 'sector_offensive.ts'), 'utf8');
        for (const [name, value] of Object.entries(END_RULE_MIRRORED_CONSTANTS)) {
            expect(source).toContain(`const ${name} = ${value};`);
        }
    });
});
