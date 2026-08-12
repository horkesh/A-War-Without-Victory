/**
 * TEMPORARY DIAGNOSTIC — axis opening-attack readiness tracing.
 *
 * Purpose: settle whether a multi-axis operation is being held out of execution
 * by the `anyApproaching` term in `evaluateOpeningAttackReadiness`
 * (`sector_offensive_launch_helpers.ts`), which sets itself on ANY axis
 * returning `zero_eligible_axis`. That blocker means "no assigned brigade is
 * adjacent to the objective with a sufficient predicted outcome" — it does NOT
 * mean "brigades are still marching", which is what the term's comment assumes.
 * When an axis is present-but-too-weak, the whole operation waits forever while
 * ambient morale/cohesion drift makes it monotonically worse.
 *
 * This module is OBSERVATION ONLY:
 *   - reads state, never writes it
 *   - emits to stdout, never to GameState or any artifact the sim reads back
 *   - is inert unless `AWWV_DEBUG_AXIS_READINESS` is set, so default runs stay
 *     byte-identical
 *   - contains no wall-clock, no timestamps, and no RNG (determinism is sacred)
 *
 * STATUS (2026-08-12): the question this was built for is ANSWERED — run n205
 * confirmed the deadlock (trnovo_town executable in 4/4 evaluations, operation
 * refused in 4/4; see
 * `docs/40_reports/20260811_SARAJEVO_ROMANIJA_DRINA_CORRIDOR_MISMATCH_TRIAGE.md`).
 * The probe is RETAINED rather than deleted only because the validation gate for
 * the eventual `anyApproaching` fix requires this same trace again to measure it.
 *
 * DELETE THIS FILE, and its two call sites in
 * `sector_offensive_launch_helpers.ts`, once that fix has landed and been signed
 * off. It is a probe, not a diagnostic channel intended to survive long-term.
 *
 * Usage: AWWV_DEBUG_AXIS_READINESS=Trnovo npm run <scenario script>
 * The value is a case-insensitive substring matched against the operation name,
 * so the trace stays scoped to one operation instead of every op in the game.
 * The values `*` and `all` match every operation — needed for the blast-radius
 * measurement, at the cost of far more output.
 */

import type { CorpsOperation, FormationId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

const DEBUG_PREFIX = 'AXIS_READINESS_DEBUG ';

function debugOperationFilter(): string | undefined {
    if (typeof process === 'undefined') return undefined;
    const raw = process.env.AWWV_DEBUG_AXIS_READINESS;
    if (typeof raw !== 'string' || raw.length === 0) return undefined;
    return raw.toLowerCase();
}

/** True when tracing is on AND this operation matches the configured filter. */
export function isAxisReadinessDebugEnabled(operationName: string): boolean {
    const filter = debugOperationFilter();
    if (filter === undefined) return false;
    if (filter === '*' || filter === 'all') return true;
    return operationName.toLowerCase().includes(filter);
}

function emit(payload: Record<string, unknown>): void {
    // eslint-disable-next-line no-console -- temporary diagnostic, stdout only
    console.log(DEBUG_PREFIX + JSON.stringify(payload));
}

function describeBrigades(
    state: GameState,
    brigadeIds: readonly FormationId[],
): Array<Record<string, unknown>> {
    return [...brigadeIds].sort(strictCompare).map((id) => {
        const brigade = state.military.formations?.[id];
        if (brigade === undefined) return { id, present: false };
        return {
            id,
            present: true,
            location_osid: brigade.location_osid ?? null,
            status: brigade.status ?? null,
            personnel: brigade.personnel ?? null,
            morale: brigade.morale ?? null,
            cohesion: brigade.cohesion ?? null,
            disrupted_turns: brigade.disrupted_turns ?? 0,
        };
    });
}

/**
 * Context handed down into `axisHasExecutableOpeningAttack` so the executability
 * probe can name the operation/axis it is reporting on. Optional everywhere —
 * when absent, nothing is emitted.
 */
export interface AxisReadinessDebugContext {
    opName: string;
    axisId: string;
}

/** Per-brigade prediction facts, one record per brigade considered. */
export interface BrigadePredictionFact {
    id: FormationId;
    /** false when the brigade was skipped before any prediction was attempted. */
    considered: boolean;
    skip_reason?: 'missing' | 'wrong_faction' | 'inactive' | 'below_personnel_floor' | 'disrupted';
    /** Whether predictAllAdjacentTargets returned the objective from this brigade's position. */
    found_in_predictor?: boolean;
    predicted_outcome?: string;
    power_ratio?: number;
    concentrated_outcome?: string | null;
}

/**
 * THE DECISIVE RECORD for the pre-committed Q1 rule. Distinguishes the three
 * states that `zero_eligible_axis` collapses into one `false`:
 *
 *   STATE 1  gate_adjacent === 0                  — dead axis: nobody adjacent, nobody marching.
 *   STATE 2  found_in_predictor false for all     — the objective is not reachable from where the
 *                                                   brigades actually are (this is the en-route case).
 *   STATE 3  found_in_predictor true, outcome     — present and targetable but too weak.
 *            below threshold
 *
 * If Operation Trnovo's east axis reports STATE 2 rather than STATE 3, the
 * `isCommittedInTransitTo` remedy does not apply to it and the lane is re-scoped.
 */
export function emitExecutabilityTrace(
    state: GameState,
    ctx: AxisReadinessDebugContext,
    objective: string | undefined,
    gateAdjacent: number,
    stagedAdjacent: number,
    threshold: string,
    brigades: readonly BrigadePredictionFact[],
    result: boolean,
): void {
    if (!isAxisReadinessDebugEnabled(ctx.opName)) return;
    const anyFound = brigades.some((b) => b.found_in_predictor === true);
    const stateLabel = gateAdjacent <= 0
        ? 'STATE_1_dead_axis'
        : (anyFound ? 'STATE_3_present_too_weak' : 'STATE_2_not_reachable_from_position');
    emit({
        kind: 'executability',
        turn: state.meta.turn,
        op: ctx.opName,
        axis_id: ctx.axisId,
        objective: objective ?? null,
        gate_adjacent: gateAdjacent,
        staged_adjacent: stagedAdjacent,
        threshold,
        executable: result,
        collapsed_state: result ? 'EXECUTABLE' : stateLabel,
        brigades,
    });
}

/** One line per axis per evaluation: what the axis was told, and why. */
export function emitAxisReadinessTrace(
    state: GameState,
    corpsId: FormationId,
    op: CorpsOperation,
    axis: NonNullable<CorpsOperation['axes']>[number],
    executable: boolean,
    blocker: string | undefined,
): void {
    if (!isAxisReadinessDebugEnabled(op.name)) return;
    emit({
        kind: 'axis',
        turn: state.meta.turn,
        op: op.name,
        corps: corpsId,
        phase: op.phase,
        axis_id: axis.axis_id,
        axis_status: axis.status,
        objective: axis.objectives[axis.current_objective_index ?? 0] ?? null,
        objective_index: axis.current_objective_index ?? 0,
        staging_osid: axis.staging_osid ?? null,
        executable,
        blocker: blocker ?? null,
        brigades: describeBrigades(state, axis.assigned_brigades),
    });
}

/**
 * One line per evaluation for the operation as a whole — the decisive record.
 * `held_by_approaching` true means at least one axis WAS executable and the op
 * was nonetheless refused execution because a sibling axis reported
 * `zero_eligible_axis`. That is the deadlock this probe exists to detect.
 */
export function emitOperationReadinessTrace(
    state: GameState,
    corpsId: FormationId,
    op: CorpsOperation,
    anyExecutable: boolean,
    anyApproaching: boolean,
): void {
    if (!isAxisReadinessDebugEnabled(op.name)) return;
    emit({
        kind: 'operation',
        turn: state.meta.turn,
        op: op.name,
        corps: corpsId,
        phase: op.phase,
        any_executable: anyExecutable,
        any_approaching: anyApproaching,
        executed: anyExecutable && !anyApproaching,
        held_by_approaching: anyExecutable && anyApproaching,
    });
}
