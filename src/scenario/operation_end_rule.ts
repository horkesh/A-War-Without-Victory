/**
 * End-rule receipt rider (REPORT-ONLY). Names the specific rule that ended an operation.
 *
 * Every CorpsOperation end writes one coarse `recovery_reason` (game_state.ts), and the first
 * reason wins. About nine different exit rules all record `max_failures` (or
 * `no_logged_attempt` when the operation never attacked), so that string alone cannot say
 * which rule fired. This module derives a distinct `end_rule` label on the week an operation
 * enters recovery, from the counters that survive on the operation, plus a report-side
 * snapshot of the previous week (`beginRecovery` deletes `silent_execution_turn_streak`).
 *
 * It reads; it never writes. Nothing here is GameState, nothing here is read by the sim, and
 * `operation_history` is untouched: the label is joined onto copies of the AARs when
 * `operation_aars.json` is written (scenario_runner.ts). final_state_hash cannot move.
 *
 * Where the surviving counters cannot tell two rules apart the label says so:
 * `<recorded reason>:ambiguous(<rule>|<rule>)`, candidates in strictCompare order. Where no
 * rule fits: `unattributed:<recorded reason>`. Nothing is guessed silently.
 *
 * Rule -> label. SO = src/sim/combat/sector_offensive.ts (line numbers as of 1f149b7ab).
 *   Recorded reasons that already name one rule:
 *   - completed                         -> objectives_taken            SO:1899 2134 3336, getCompletedObjectiveRecoveryReason SO:1425
 *       (type reorganization)            -> reorganization_complete     corps_command.ts:276
 *   - probe_complete, attempts > 0      -> probe_contact               SO:2134 2595
 *       (no participants left)           -> preempted                   operation_opportunities.ts:1673
 *   - participants_below_attack_floor | participants_below_assembly_floor | no_approach_osid |
 *     zero_eligible_axis                -> opening_readiness:<blocker> SO:1756 1970 (evaluateOpeningAttackReadiness)
 *   - zero_eligible_axis, launch_demotion_count >= 2 -> launch_demotion SO:1065-1069
 *   - ceasefire                         -> ceasefire                   SO:979 2002
 *   - defender_power_too_high           -> defender_too_strong         SO:1813 1869 1983
 *   - political_blocked                 -> political_blocked           SO:1877 1945 2062
 *   - offensive_ops_suppressed          -> offensive_ops_suppressed    SO:1995
 *   - planning_invalidated (planning)   -> planning_invalidated        SO:1906
 *   - no_launch_readiness               -> not_ready                   SO:1923 (probe) 1958
 *   - manual_termination                -> manual_termination          SO:1722 (player), war_phases.ts:502, corps_reorganisation.ts:519
 *       (commander_assessment 'abort')   -> preparation_abort           SO:1819 (operation_preparation.ts:1495)
 *       (type feint)                     -> feint_expiry                SO:1930
 *       (no participants left)           -> preempted                   operation_opportunities.ts:1673 (supersession)
 *   - brigade_attrition                 -> brigade_attrition:<sub>     SO:3232 (sub-reason from this turn's reevaluation_log abort)
 *       (no abort logged this turn)      -> brigade_attrition:no_active_participants  final_operation_truth_reconciliation.ts:128
 *   - orphaned_sector                   -> orphaned_sector             SO:1711
 *   - tg_cohesion_exhausted | tg_max_lifecycle -> same label           SO:2058 3324
 *   - insufficient_donation             -> retired:insufficient_donation (retired; old saves only)
 *   Recorded max_failures / no_logged_attempt (getNoAttemptRecoveryReason SO:1401; a probe
 *   records planning_invalidated instead, and probe_complete when every axis went terminal
 *   without an attempt) -- derived from counters:
 *   - never launched, planning           -> orphaned_sector             SO:1711 (zero-attempt orphan)
 *   - legacy current_objective_index past the end -> objective_failures_exhausted  SO:2095 2820 (3-in-a-row skip SO:2766)
 *   - legacy failure_count >= 8          -> total_failure_cap           SO:2105 2822
 *   - zero lifetime attacks, >= 5 execution turns -> lifetime_no_attack SO:2118-2121
 *   - attacked earlier, prior-week silent_execution_turn_streak >= 5 -> silent_execution  SO:2128 (streak SO:1160)
 *       The streak is written after order emission (recordExecutionOrderSilence, war_phases.ts:2863)
 *       and read by the exit in the NEXT turn's advanceSectorOffensives (war_phases.ts:2023). The
 *       weekly row is built after the whole turn, so the previous week's row holds exactly the
 *       value the exit compared: the threshold is >= 5, not >= 4.
 *   - zero attacks, idle streak >= 4 (probe 1) -> axis_idle_stall      SO:2545 (axis), SO:2802 (legacy)
 *   - movement_only_execution_turns >= 4 -> movement_only_stall         SO:2555 (axis), SO:2811 (legacy)
 *   - general_offensive / strategic_defense: execution < 6 turns -> general_op_progress_failure  SO:3341
 *                                          execution >= 6 turns -> general_op_execution_timeout SO:3341 3348
 *   Per axis (multi-axis and single-axis wrappers; the op ends when every axis is terminal,
 *   SO:2095 2624 3221):
 *   - consecutive_catastrophic_on_current >= 2 -> consecutive_catastrophic  SO:2477
 *   - launch_blocker recent_catastrophic_losses_at_objective -> recent_catastrophic_stall  SO:2083
 *   - late_phase.terminal_reason          -> late_phase_main_terminal    operation_phase_gate.ts:365
 *   - zero attacks, idle streak >= 4 (probe 1) -> axis_idle_stall       SO:2545
 *   - movement_only_execution_turns >= 4 -> movement_only_stall          SO:2555
 *   - failure_count >= cap (4 single-axis, 8 multi-axis) -> axis_failure_cap  SO:2571-2573
 *   - failures >= 5, no capture, >= 1 attack, below cap -> zero_progress SO:2613-2618
 *   - no active brigade left on the axis  -> axis_no_active_brigades     SO:3212
 *   - complete, every objective captured  -> objectives_taken; else objective_failures_exhausted
 *   Operation label from its axes: one axis -> that axis's rule; several axes with a capture
 *   but not all -> partial_capture_axes_terminal; no capture and one shared rule -> that rule;
 *   otherwise axes_terminal_mixed. `end_rule_axes` lists each axis's rule.
 *
 * Deterministic: no clock, no randomness; axis receipts keyed in strictCompare order.
 */

import { EXECUTION_MAX_DURATION } from '../sim/combat/bot_constants.js';
import type { CorpsOperation, GameState, OperationAxis } from '../state/game_state.js';
import { strictCompare } from '../state/validateGameState.js';

/**
 * Thresholds copied from sector_offensive.ts, where they are module-private. A test asserts each
 * `const NAME = value;` still appears there, so a retune cannot silently desynchronise them.
 */
export const END_RULE_MIRRORED_CONSTANTS = {
    MAX_TOTAL_FAILURES: 8,
    MAX_TOTAL_FAILURES_SINGLE_AXIS: 4,
    MAX_MOVEMENT_ONLY_EXECUTION_TURNS: 4,
    MAX_EXECUTION_TURNS_ZERO_ATTACKS: 5,
    MAX_OPERATION_ZERO_PROGRESS_FAILURES: 5,
    MAX_CONSECUTIVE_CATASTROPHIC_ON_CURRENT: 2,
} as const;

const C = END_RULE_MIRRORED_CONSTANTS;
/** Idle-stall threshold (inline literal at SO:2522 and SO:2801). */
const IDLE_STALL_THRESHOLD = 4;
const PROBE_IDLE_STALL_THRESHOLD = 1;

/** The previous week's view of an operation (report-side, never GameState). */
export interface OperationEndRulePrior {
    phase: CorpsOperation['phase'];
    phase_started_turn: number;
    silent_execution_turn_streak?: number;
    /** Recorded reason while in recovery; a change re-derives the receipt (FARZ-END, §26). */
    recovery_reason?: CorpsOperation['recovery_reason'];
}

export interface OperationEndRuleContext {
    /** The turn the operation entered recovery. */
    turn: number;
    /** The operation as it stood at the end of the previous week, when known. */
    prior?: OperationEndRulePrior;
    /** The operation's sector no longer exists (candidate for the orphaned-sector exit). */
    sector_missing?: boolean;
    /** Axes with no active assigned brigade. */
    inactive_axis_ids?: readonly string[];
}

export interface OperationEndRuleReceipt {
    end_rule: string;
    /** Per-axis rule, keyed by axis_id in strictCompare order. Only when the op has axes. */
    end_rule_axes?: Record<string, string>;
}

export function operationEndRuleKey(corpsId: string, op: Pick<CorpsOperation, 'name' | 'started_turn'>): string {
    return `${corpsId}:${op.name}:t${op.started_turn}`;
}

export function snapshotOperationEndRulePrior(op: CorpsOperation): OperationEndRulePrior {
    const streak = op.silent_execution_turn_streak ?? 0;
    return {
        phase: op.phase,
        phase_started_turn: op.phase_started_turn,
        ...(streak > 0 ? { silent_execution_turn_streak: streak } : {}),
        ...(op.phase === 'recovery' && op.recovery_reason !== undefined ? { recovery_reason: op.recovery_reason } : {}),
    };
}

/**
 * The end-of-week view of every hosted operation, keyed by `operationEndRuleKey`. The scenario
 * runner keeps one map per week and hands it to the next week's diagnostics; lookups only, so
 * the Map's insertion order never reaches an artifact.
 */
export function snapshotOperationEndRulePriors(state: GameState): Map<string, OperationEndRulePrior> {
    const priors = new Map<string, OperationEndRulePrior>();
    const corpsCommand = state.military.corps_command ?? {};
    for (const corpsId of Object.keys(corpsCommand).sort(strictCompare)) {
        for (const op of corpsCommand[corpsId]?.active_operations ?? []) {
            priors.set(operationEndRuleKey(corpsId, op), snapshotOperationEndRulePrior(op));
        }
    }
    return priors;
}

function resolveCandidates(recorded: string, candidates: readonly string[], fallback?: string): string {
    const unique = Array.from(new Set(candidates)).sort(strictCompare);
    if (unique.length === 1) return unique[0]!;
    if (unique.length > 1) return `${recorded}:ambiguous(${unique.join('|')})`;
    return fallback ?? `unattributed:${recorded}`;
}

function isAxisTerminal(axis: OperationAxis): boolean {
    return axis.status === 'complete' || axis.status === 'stalled';
}

function deriveAxisRule(axis: OperationAxis, axisCount: number, op: CorpsOperation, inactive: boolean): string {
    if (axis.status === 'complete') {
        return (axis.objective_capture_count ?? 0) >= axis.objectives.length
            ? 'objectives_taken'
            : 'objective_failures_exhausted';
    }
    if (axis.status !== 'stalled') return 'axis_still_executing';
    // Markers written at the stall itself: decisive.
    if ((axis.consecutive_catastrophic_on_current ?? 0) >= C.MAX_CONSECUTIVE_CATASTROPHIC_ON_CURRENT) {
        return 'consecutive_catastrophic';
    }
    if (axis.launch_blocker === 'recent_catastrophic_losses_at_objective') return 'recent_catastrophic_stall';
    if (axis.late_phase?.terminal_reason === 'main_axis_terminal_without_prerequisites') return 'late_phase_main_terminal';

    const attempts = axis.attack_attempt_count ?? 0;
    const failures = axis.failure_count ?? 0;
    const captures = axis.objective_capture_count ?? 0;
    const idleThreshold = op.type === 'probe' ? PROBE_IDLE_STALL_THRESHOLD : IDLE_STALL_THRESHOLD;
    const candidates: string[] = [];
    // The idle stall fires in the same pass its streak reaches the threshold, before any cap.
    if (attempts === 0 && (axis.idle_execution_turn_streak ?? 0) >= idleThreshold) {
        candidates.push('axis_idle_stall');
    } else {
        const cap = axisCount === 1 ? C.MAX_TOTAL_FAILURES_SINGLE_AXIS : C.MAX_TOTAL_FAILURES;
        if ((axis.movement_only_execution_turns ?? 0) >= C.MAX_MOVEMENT_ONLY_EXECUTION_TURNS) {
            candidates.push('movement_only_stall');
        }
        if (failures >= cap) candidates.push('axis_failure_cap');
        // Zero-progress is checked every pass after the cap, so it can only be the rule below the cap.
        if (failures < cap && failures >= C.MAX_OPERATION_ZERO_PROGRESS_FAILURES && captures === 0 && attempts >= 1) {
            candidates.push('zero_progress');
        }
    }
    if (inactive) candidates.push('axis_no_active_brigades');
    return resolveCandidates('stalled', candidates, 'axis_stall_unattributed');
}

function deriveAxesRule(op: CorpsOperation, axes: readonly OperationAxis[], ctx: OperationEndRuleContext): OperationEndRuleReceipt {
    const inactive = new Set(ctx.inactive_axis_ids ?? []);
    const sorted = [...axes].sort((a, b) => strictCompare(a.axis_id, b.axis_id));
    const end_rule_axes: Record<string, string> = {};
    for (const axis of sorted) {
        end_rule_axes[axis.axis_id] = deriveAxisRule(axis, axes.length, op, inactive.has(axis.axis_id));
    }
    const rules = sorted.map((axis) => end_rule_axes[axis.axis_id]!);
    let end_rule: string;
    if (axes.length === 1) {
        end_rule = rules[0]!;
    } else if ((op.objective_capture_count ?? 0) > 0) {
        end_rule = 'partial_capture_axes_terminal';
    } else {
        const distinct = Array.from(new Set(rules));
        end_rule = distinct.length === 1 ? distinct[0]! : 'axes_terminal_mixed';
    }
    return { end_rule, end_rule_axes };
}

function deriveExecutionExit(op: CorpsOperation, recorded: string, ctx: OperationEndRuleContext): OperationEndRuleReceipt {
    const prior = ctx.prior;
    const launchedThisWeek = prior?.phase !== 'execution' && op.planning_phase_started_turn !== undefined;
    const executed = prior?.phase === 'execution' || launchedThisWeek;
    const executionStart = prior?.phase === 'execution'
        ? prior.phase_started_turn
        : launchedThisWeek ? ctx.turn : undefined;
    const elapsed = executionStart !== undefined ? ctx.turn - executionStart : undefined;

    if (op.type === 'general_offensive' || op.type === 'strategic_defense') {
        if (elapsed === undefined || prior?.phase !== 'execution') {
            return { end_rule: resolveCandidates(recorded, ['general_op_progress_failure', 'general_op_execution_timeout']) };
        }
        return { end_rule: elapsed < EXECUTION_MAX_DURATION ? 'general_op_progress_failure' : 'general_op_execution_timeout' };
    }

    // Never launched: the only planning-phase path to a no-attempt reason is the orphan check.
    if (prior !== undefined && !executed) return { end_rule: 'orphaned_sector' };

    const axes = op.axes ?? [];
    if (axes.length > 0 && axes.every(isAxisTerminal)) {
        // allAxesTerminal is checked before the lifetime-0 and silent exits (SO:2095 vs 2118/2128),
        // and the results pass ends the op the moment its last axis goes terminal.
        const receipt = deriveAxesRule(op, axes, ctx);
        if (ctx.sector_missing) {
            return { ...receipt, end_rule: resolveCandidates(recorded, ['orphaned_sector', receipt.end_rule]) };
        }
        return receipt;
    }

    const attempts = op.attack_attempt_count ?? 0;
    const candidates: string[] = [];
    if (ctx.sector_missing) candidates.push('orphaned_sector');

    if (axes.length === 0) {
        const objectives = op.objectives ?? [];
        const idleThreshold = op.type === 'probe' ? PROBE_IDLE_STALL_THRESHOLD : IDLE_STALL_THRESHOLD;
        if ((op.current_objective_index ?? 0) >= objectives.length && objectives.length > 0) {
            // Completion is checked before the failure cap at both sites.
            candidates.push('objective_failures_exhausted');
        } else if (attempts === 0 && (op.idle_execution_turn_streak ?? 0) >= idleThreshold) {
            candidates.push('axis_idle_stall');
        } else {
            if ((op.failure_count ?? 0) >= C.MAX_TOTAL_FAILURES) candidates.push('total_failure_cap');
            if ((op.movement_only_execution_turns ?? 0) >= C.MAX_MOVEMENT_ONLY_EXECUTION_TURNS) {
                candidates.push('movement_only_stall');
            }
        }
    }
    if (!candidates.some((c) => c === 'objective_failures_exhausted' || c === 'axis_idle_stall' || c === 'total_failure_cap')) {
        // The lifetime-0 exit precedes the silent exit, and a silent streak can never be longer
        // than the execution clock, so with zero attempts the silent exit can never be the rule.
        if (attempts === 0) {
            if (elapsed === undefined || elapsed >= C.MAX_EXECUTION_TURNS_ZERO_ATTACKS) candidates.push('lifetime_no_attack');
        } else if ((prior?.silent_execution_turn_streak ?? 0) >= C.MAX_EXECUTION_TURNS_ZERO_ATTACKS) {
            candidates.push('silent_execution');
        }
    }
    return { end_rule: resolveCandidates(recorded, candidates) };
}

/** Last abort entry this turn's attrition re-evaluation wrote, as a bare code. */
function attritionSubReason(op: CorpsOperation, turn: number): string | undefined {
    const log = op.reevaluation_log ?? [];
    for (let i = log.length - 1; i >= 0; i -= 1) {
        const entry = log[i]!;
        if (entry.turn === turn && entry.decision === 'abort') {
            return entry.reason.split(' ')[0];
        }
    }
    return undefined;
}

/**
 * Derive the end rule of an operation on the week it entered recovery. Pure: reads `op` and
 * `ctx` only. See the module header for the full rule -> label table.
 */
export function deriveOperationEndRule(op: CorpsOperation, ctx: OperationEndRuleContext): OperationEndRuleReceipt {
    const reason = op.recovery_reason;
    const noParticipants = (op.participating_brigades ?? []).length === 0;
    const attempts = op.attack_attempt_count ?? 0;
    switch (reason) {
        case 'completed':
            return { end_rule: op.type === 'reorganization' ? 'reorganization_complete' : 'objectives_taken' };
        case 'probe_complete':
            if (attempts > 0) {
                return { end_rule: noParticipants ? resolveCandidates(reason, ['probe_contact', 'preempted']) : 'probe_contact' };
            }
            if (noParticipants) return { end_rule: 'preempted' };
            return deriveExecutionExit(op, reason, ctx);
        case 'participants_below_attack_floor':
        case 'participants_below_assembly_floor':
        case 'no_approach_osid':
            return { end_rule: `opening_readiness:${reason}` };
        case 'zero_eligible_axis':
            return { end_rule: (op.launch_demotion_count ?? 0) >= 2 ? 'launch_demotion' : `opening_readiness:${reason}` };
        case 'ceasefire':
            return { end_rule: 'ceasefire' };
        case 'defender_power_too_high':
            return { end_rule: 'defender_too_strong' };
        case 'political_blocked':
            return { end_rule: 'political_blocked' };
        case 'offensive_ops_suppressed':
            return { end_rule: 'offensive_ops_suppressed' };
        case 'no_launch_readiness':
            return { end_rule: 'not_ready' };
        case 'manual_termination':
            if (op.commander_assessment === 'abort') return { end_rule: 'preparation_abort' };
            if (noParticipants) return { end_rule: 'preempted' };
            if (op.type === 'feint') return { end_rule: 'feint_expiry' };
            return { end_rule: 'manual_termination' };
        case 'brigade_attrition':
            return { end_rule: `brigade_attrition:${attritionSubReason(op, ctx.turn) ?? 'no_active_participants'}` };
        case 'orphaned_sector':
            return { end_rule: 'orphaned_sector' };
        case 'tg_cohesion_exhausted':
        case 'tg_max_lifecycle':
            return { end_rule: reason };
        case 'insufficient_donation':
            return { end_rule: `retired:${reason}` };
        case 'planning_invalidated': {
            // A probe records planning_invalidated for every no-attempt exit (SO:1402), from
            // execution as well as planning.
            const executed = ctx.prior?.phase === 'execution' || op.planning_phase_started_turn !== undefined;
            if (op.type === 'probe' && executed) return deriveExecutionExit(op, reason, ctx);
            if (ctx.sector_missing) return { end_rule: resolveCandidates(reason, ['planning_invalidated', 'orphaned_sector']) };
            return { end_rule: 'planning_invalidated' };
        }
        case 'max_failures':
        case 'no_logged_attempt':
            return deriveExecutionExit(op, reason, ctx);
        default:
            return { end_rule: `unattributed:${reason ?? 'none'}` };
    }
}

/**
 * Join end-rule receipts onto copies of the AARs for `operation_aars.json`. The input array and
 * its objects are not mutated (they are `state.operation_history`, sim state). An AAR whose
 * recovery week was never observed by a weekly row gets `end_rule: 'unobserved'`.
 */
export function joinEndRulesIntoAars<T extends { operation_id: string }>(
    aars: readonly T[],
    receipts: ReadonlyMap<string, OperationEndRuleReceipt>,
): Array<T & OperationEndRuleReceipt> {
    return aars.map((aar) => {
        const receipt = receipts.get(aar.operation_id);
        return {
            ...aar,
            end_rule: receipt?.end_rule ?? 'unobserved',
            ...(receipt?.end_rule_axes !== undefined ? { end_rule_axes: receipt.end_rule_axes } : {}),
        };
    });
}
