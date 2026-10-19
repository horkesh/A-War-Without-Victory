/**
 * operation_phase_gate.ts
 *
 * Opt-in phased-operation contract for multi-axis opportunity operations (Mistral 2:
 * Sipovo/Jajce main effort first, Drvar capture second). Owner of:
 *   - the operation-instance identity used for emitted-order ownership,
 *   - emitted-order ownership records (`military.brigade_attack_order_owners`),
 *   - operation-owned capture receipts (`OperationAxis.late_phase.receipts`),
 *   - the held-axis capture-authority test used by the resolver's final consumer filter,
 *   - the hold -> capture activation / terminal lifecycle (called by the sector-offensive
 *     results pass).
 *
 * DEFAULT BEHAVIOR: every function is inert unless an operation carries an axis with
 * `late_phase` (authored `phase_gate` on the opportunity axis). Operations without the
 * opt-in never acquire new fields and never take a different branch.
 *
 * DOES NOT: transfer forces, move brigades, change readiness, clocks, power, speed, dates,
 * controls or references. GUI-only `ControlEvent` is not read.
 *
 * Determinism: sorted/ordered iteration only; no randomness or wall-clock.
 */

import type {
    BrigadeAttackOrderOwner,
    CorpsOperation,
    FactionId,
    FormationId,
    GameState,
    OperationAxis,
    OperationCaptureReceipt,
} from '../../state/game_state.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { isEligibleOperationFormation } from '../../state/formation_constants.js';
import { findBrigadeOperationAnywhere } from './corps_operation_helpers.js';
import { getBrigadeAxis } from './operation_approach_osids.js';
import { assignBrigadeRoles } from './sector_offensive_axis_helpers.js';
import { emitMistralTgActivationRecord, isReasonCodeTopicEnabled } from './reason_code_debug.js';

/** Exact operation instance id: the same string the resolver stamps on battle reports. */
export function operationInstanceId(corpsId: string, op: CorpsOperation): string {
    return `${corpsId}:${op.name}:t${op.started_turn}`;
}

/** True iff the operation carries at least one axis with the opt-in phase gate. */
export function operationHasPhaseGate(op: CorpsOperation): boolean {
    return Array.isArray(op.axes) && op.axes.some((axis) => axis.late_phase !== undefined);
}

/** True iff any live operation anywhere carries the opt-in (cheap per-call guard). */
export function anyOperationHasPhaseGate(state: GameState): boolean {
    const corpsCommand = state.military?.corps_command;
    if (!corpsCommand) return false;
    for (const cmd of Object.values(corpsCommand)) {
        for (const op of cmd?.active_operations ?? []) {
            if (operationHasPhaseGate(op)) return true;
        }
    }
    return false;
}

/** The axis is in its holding phase (approach/hold only; capture authority withheld). */
export function isAxisCaptureHeld(axis: OperationAxis | null | undefined): boolean {
    return axis?.late_phase?.phase === 'holding';
}

/** The axis is holding AND `osid` is in its complete capture-authority target set. */
export function isGatedObjectiveHeld(axis: OperationAxis | null | undefined, osid: string): boolean {
    return axis?.late_phase?.phase === 'holding' && axis.late_phase.gated_objectives.includes(osid);
}

/**
 * Final-consumer test: would honoring this brigade's attack order capture-attack a gated
 * objective of an axis that is still holding? Covers every order writer (direct, intermediate,
 * counterattack, merged, GUI) because it is evaluated at resolver consumption.
 */
export function isHeldCaptureOrder(state: GameState, brigadeId: string, targetOsid: string): boolean {
    // EVERY operation the brigade belongs to is inspected, not the first deterministic match:
    // production admission permits a probe overlap, and `findBrigadeOperationAnywhere` would then
    // classify the order through whichever operation sorts first and miss a held-axis membership.
    // A brigade with no held-axis membership (and unrelated operations) stays free.
    const corpsCommand = state.military?.corps_command;
    if (!corpsCommand) return false;
    for (const corpsId of Object.keys(corpsCommand).sort()) {
        for (const op of corpsCommand[corpsId]?.active_operations ?? []) {
            if (!operationHasPhaseGate(op)) continue;
            if (isGatedObjectiveHeld(getBrigadeAxis(op, brigadeId as FormationId), targetOsid)) return true;
        }
    }
    return false;
}

/**
 * Own finite TG lifetime for an opt-in late-axis group: the turn its lifetime is measured from.
 * Returns the group's formation turn (never earlier than the axis activation turn) when its anchor
 * belongs to an activated late axis of `op`; null for every ordinary group, which keeps the
 * operation-owned clock (`op.phase_started_turn`). No global clock is reset or extended.
 */
export function lateTgLifecycleStartTurn(
    op: CorpsOperation,
    group: { anchor_brigade_id: FormationId; formed_on_turn: number },
): number | null {
    const gate = getBrigadeAxis(op, group.anchor_brigade_id)?.late_phase;
    if (!gate || gate.phase !== 'capture' || gate.activated_turn === undefined) return null;
    return Math.max(group.formed_on_turn, gate.activated_turn);
}

/** The axis takes no ordinary result progression this pass: holding, or activated this very turn. */
export function isLatePhaseResultPassIdle(axis: OperationAxis, turn: number): boolean {
    const gate = axis.late_phase;
    if (!gate) return false;
    return gate.phase === 'holding' || gate.activated_turn === turn;
}

/**
 * Control-change boundary (resolver, after post-revert flip handling): an operation-owned receipt
 * for `osid` is void once the OSID is controlled by anyone other than the receipt's operation
 * faction. A later foreign recapture therefore cannot resurrect it; only a new owned capture by
 * this exact operation (recorded after this call) writes a fresh receipt.
 */
export function invalidateReceiptsOnControlChange(state: GameState, osid: string, newController: FactionId): void {
    const corpsCommand = state.military?.corps_command;
    if (!corpsCommand) return;
    for (const corpsId of Object.keys(corpsCommand).sort()) {
        const corpsFaction = state.military.formations?.[corpsId]?.faction;
        if (corpsFaction === newController) continue;
        for (const op of corpsCommand[corpsId]?.active_operations ?? []) {
            for (const axis of op.axes ?? []) {
                const gate = axis.late_phase;
                if (!gate || gate.receipts.length === 0) continue;
                if (gate.receipts.some((r) => r.osid === osid)) {
                    gate.receipts = gate.receipts.filter((r) => r.osid !== osid);
                }
            }
        }
    }
}

/**
 * Emitted-order ownership for an order the OPERATION EVALUATOR is about to write. Returns null
 * (and the caller writes nothing) unless the brigade belongs to an operation with the opt-in.
 */
export function buildAttackOrderOwner(
    state: GameState,
    brigadeId: string,
    targetOsid: string,
    turn: number,
): BrigadeAttackOrderOwner | null {
    const match = findBrigadeOperationAnywhere(state, brigadeId);
    if (!match || !operationHasPhaseGate(match.op)) return null;
    const axis = getBrigadeAxis(match.op, brigadeId as FormationId);
    if (!axis) return null;
    return {
        operation_id: operationInstanceId(match.corps_id, match.op),
        axis_id: axis.axis_id,
        target: targetOsid,
        turn,
    };
}

/** Evaluator write boundary: attach ownership to an operation-evaluator attack order (opt-in only). */
export function recordOperationOrderOwner(
    state: GameState,
    result: { attack_order_owners?: Record<FormationId, BrigadeAttackOrderOwner> },
    brigadeId: FormationId,
    targetOsid: string,
): void {
    const owner = buildAttackOrderOwner(state, brigadeId, targetOsid, state.meta?.turn ?? 0);
    if (owner) (result.attack_order_owners ??= {})[brigadeId] = owner;
}

export interface OwnedCaptureArgs {
    op: CorpsOperation;
    corpsId: string;
    leadId: string;
    targetOsid: string;
    battleId: string;
    turn: number;
}

/**
 * Record an operation-owned capture receipt. Call ONLY after the resolver finalized the flip
 * (revert handling included) for a real enemy-to-friendly combat flip. The ACTUAL resolving
 * lead's surviving emitted order must belong to this exact operation instance, axis and target
 * and be from this turn; mixed-operation support does not invalidate an owned lead capture, an
 * unowned or foreign lead never satisfies. Returns whether a receipt was recorded.
 */
export function recordOwnedCaptureReceipt(state: GameState, args: OwnedCaptureArgs): boolean {
    const { op, corpsId, leadId, targetOsid, battleId, turn } = args;
    if (!operationHasPhaseGate(op)) return false;
    const survivingTarget = state.military.brigade_attack_orders?.[leadId as FormationId];
    if (survivingTarget !== targetOsid) return false;
    const owner = state.military.brigade_attack_order_owners?.[leadId as FormationId];
    if (!owner) return false;
    const leadAxis = getBrigadeAxis(op, leadId as FormationId);
    if (!leadAxis) return false;
    const opId = operationInstanceId(corpsId, op);
    if (owner.turn !== turn || owner.target !== targetOsid || owner.operation_id !== opId || owner.axis_id !== leadAxis.axis_id) {
        return false;
    }
    let recorded = false;
    for (const axis of op.axes ?? []) {
        const gate = axis.late_phase;
        if (!gate || gate.phase !== 'holding') continue;
        if (gate.main_axis_id !== leadAxis.axis_id || !gate.requires.includes(targetOsid)) continue;
        const receipt: OperationCaptureReceipt = {
            osid: targetOsid,
            turn,
            battle_id: battleId,
            attacker_brigade: leadId,
            operation_id: opId,
            axis_id: leadAxis.axis_id,
        };
        gate.receipts = gate.receipts.filter((existing) => existing.osid !== targetOsid);
        gate.receipts.push(receipt);
        gate.receipts.sort((a, b) => (a.osid < b.osid ? -1 : a.osid > b.osid ? 1 : 0));
        recorded = true;
    }
    return recorded;
}

/** Set `hold_started_turn` exactly once, at the planning -> execution transition. */
export function startLatePhaseHold(op: CorpsOperation, turn: number): void {
    for (const axis of op.axes ?? []) {
        const gate = axis.late_phase;
        if (gate && gate.phase === 'holding' && gate.hold_started_turn === undefined) {
            gate.hold_started_turn = turn;
        }
    }
}

function prerequisitesSatisfied(
    state: GameState,
    op: CorpsOperation,
    axis: OperationAxis,
    corpsId: string,
    faction: FactionId,
    reverseMap?: OperationalToCanonicalReverseMap | null,
): boolean {
    const gate = axis.late_phase!;
    const opId = operationInstanceId(corpsId, op);
    for (const osid of gate.requires) {
        const receipt = gate.receipts.find((r) => r.osid === osid && r.operation_id === opId);
        if (!receipt) return false;
        // Later control loss invalidates the live prerequisite.
        if (getPoliticalControllerOSID(state, osid, reverseMap ?? undefined) !== faction) return false;
    }
    return true;
}

function applyGateHandoff(
    state: GameState,
    op: CorpsOperation,
    destination: OperationAxis,
    faction: FactionId,
): boolean {
    const latePhase = destination.late_phase;
    const handoff = latePhase?.handoff;
    if (!handoff) return true;
    const brigadeId = handoff.brigade_id;
    const source = (op.axes ?? []).find((candidate) => candidate.axis_id === handoff.source_axis_id);
    const formation = state.military.formations?.[brigadeId];
    if (!source || source === destination || handoff.source_axis_id !== latePhase.main_axis_id) return false;
    if (!formation || formation.faction !== faction || !isEligibleOperationFormation(formation)) return false;

    const membershipCount = (op.axes ?? []).reduce(
        (count, candidate) => count + candidate.assigned_brigades.filter((id) => id === brigadeId).length,
        0,
    );
    if (membershipCount !== 1 || source.assigned_brigades.filter((id) => id === brigadeId).length !== 1) return false;
    if (destination.assigned_brigades.length !== 0) return false;
    if (op.participating_brigades.filter((id) => id === brigadeId).length !== 1) return false;

    const corpsCommand = state.military.corps_command;
    if (!corpsCommand) return false;
    for (const corpsId of Object.keys(corpsCommand).sort()) {
        for (const candidate of corpsCommand[corpsId]?.active_operations ?? []) {
            if (candidate === op || (candidate.phase !== 'planning' && candidate.phase !== 'execution')) continue;
            if (
                candidate.participating_brigades.includes(brigadeId)
                || candidate.axes?.some((axis) => axis.assigned_brigades.includes(brigadeId))
            ) return false;
        }
    }

    const nextSource = source.assigned_brigades.filter((id) => id !== brigadeId);
    const nextDestination = [...destination.assigned_brigades, brigadeId].sort();
    const sourceRoles = assignBrigadeRoles(nextSource, state.military.formations);
    const destinationRoles = assignBrigadeRoles(nextDestination, state.military.formations);

    source.assigned_brigades = nextSource;
    source.main_brigade = sourceRoles.main;
    source.support_brigades = sourceRoles.support.length > 0 ? sourceRoles.support : undefined;
    destination.assigned_brigades = nextDestination;
    destination.main_brigade = destinationRoles.main;
    destination.support_brigades = destinationRoles.support.length > 0 ? destinationRoles.support : undefined;
    return true;
}

/**
 * Hold -> capture lifecycle for every holding axis of the operation. Idempotent per call:
 *   - activates exactly once when every required OSID has an owned receipt AND is still held,
 *     resetting the axis-local counters exactly once (current objective index untouched) and
 *     forming that axis's TG through `formAxisTg`;
 *   - stalls the held axis terminally when its main axis is terminal without them.
 * Never resets or extends any global/operation clock.
 */
export function advanceLatePhaseGates(
    state: GameState,
    op: CorpsOperation,
    corpsId: string,
    faction: FactionId,
    turn: number,
    reverseMap?: OperationalToCanonicalReverseMap | null,
    formAxisTg?: (axis: OperationAxis) => void,
    callerStage: 'pre_results' | 'post_results' | 'direct' = 'direct',
): void {
    const observe = isReasonCodeTopicEnabled('mistral_tg_activation');
    const opId = operationInstanceId(corpsId, op);
    if (observe) emitMistralTgActivationRecord({
        kind: 'caller_pass_start', turn, corps_id: corpsId, operation_id: opId, operation_name: op.name,
        caller_stage: callerStage, callback_present: formAxisTg !== undefined, axis_count: (op.axes ?? []).length,
        axes: (op.axes ?? []).map((candidate) => ({
            axis_id: candidate.axis_id, status: candidate.status,
            gate_phase: candidate.late_phase?.phase ?? null,
            terminal_reason: candidate.late_phase?.terminal_reason ?? null,
        })),
    });
    for (const axis of op.axes ?? []) {
        const gate = axis.late_phase;
        if (!gate || gate.phase !== 'holding' || gate.terminal_reason) continue;
        if (axis.status !== 'executing') continue;
        // Non-resolver control writers: any receipt whose OSID is no longer held is void NOW, so a
        // later foreign recapture cannot resurrect it (the resolver boundary handles combat flips).
        gate.receipts = gate.receipts.filter(
            (r) => getPoliticalControllerOSID(state, r.osid, reverseMap ?? undefined) === faction,
        );
        if (prerequisitesSatisfied(state, op, axis, corpsId, faction, reverseMap)) {
            if (!applyGateHandoff(state, op, axis, faction)) continue;
            gate.phase = 'capture';
            gate.activated_turn = turn;
            axis.failure_count = 0;
            axis.consecutive_failures_on_current = 0;
            axis.momentum = 0;
            axis.last_result = undefined;
            axis.attack_attempt_count = 0;
            axis.objective_capture_count = 0;
            axis.movement_only_execution_turns = 0;
            axis.idle_execution_turn_streak = 0;
            axis.shared_objective_wait_turns = 0;
            axis.consecutive_catastrophic_on_current = 0;
            if (observe && formAxisTg !== undefined) emitMistralTgActivationRecord({
                kind: 'activation_callback_start', turn, corps_id: corpsId, operation_id: opId,
                operation_name: op.name, axis_id: axis.axis_id, caller_stage: callerStage,
            });
            formAxisTg?.(axis);
            if (observe && formAxisTg !== undefined) emitMistralTgActivationRecord({
                kind: 'activation_callback_end', turn, corps_id: corpsId, operation_id: opId,
                operation_name: op.name, axis_id: axis.axis_id, caller_stage: callerStage,
            });
            continue;
        }
        const main = (op.axes ?? []).find((candidate) => candidate.axis_id === gate.main_axis_id);
        if (!main || main.status === 'complete' || main.status === 'stalled') {
            axis.status = 'stalled';
            gate.terminal_reason = 'main_axis_terminal_without_prerequisites';
        }
    }
    if (observe) emitMistralTgActivationRecord({
        kind: 'caller_pass_end', turn, corps_id: corpsId, operation_id: opId, operation_name: op.name,
        caller_stage: callerStage, callback_present: formAxisTg !== undefined, axis_count: (op.axes ?? []).length,
        axes: (op.axes ?? []).map((candidate) => ({
            axis_id: candidate.axis_id, status: candidate.status,
            gate_phase: candidate.late_phase?.phase ?? null,
            terminal_reason: candidate.late_phase?.terminal_reason ?? null,
        })),
    });
}

/**
 * Dispatcher write boundary: reconcile `military.brigade_attack_order_owners` with the orders that
 * actually WON the dispatcher merge. Ownership survives only for an order that is still the final
 * order for that brigade and target; overwrite, removal, suppression and trimming therefore clear
 * it, and an alternate/GUI/defensive writer never inherits a stale attribution. In merge mode an
 * existing order for the same brigade stays authoritative and the new owner is dropped. The field
 * is never created when no owner survives.
 */
export function syncAttackOrderOwners(
    state: GameState,
    newOwners: Record<FormationId, BrigadeAttackOrderOwner>,
    priorOwners: Record<FormationId, BrigadeAttackOrderOwner>,
    existingOrdersBefore: Record<string, string | null | undefined>,
    mergeWithExistingOrders: boolean,
    isPreservedOrder: (brigadeId: string) => boolean,
): void {
    const finalOrders = state.military.brigade_attack_orders ?? {};
    const next: Record<FormationId, BrigadeAttackOrderOwner> = {};
    for (const bid of Object.keys(newOwners).sort() as FormationId[]) {
        if (mergeWithExistingOrders && existingOrdersBefore[bid]) continue; // existing order wins the merge
        next[bid] = newOwners[bid]!;
    }
    for (const bid of Object.keys(priorOwners).sort() as FormationId[]) {
        if (next[bid] !== undefined) continue;
        // A prior owner is retained only when its order was preserved, not replaced, by this call.
        if (mergeWithExistingOrders || isPreservedOrder(bid)) next[bid] = priorOwners[bid]!;
    }
    const pruned: Record<FormationId, BrigadeAttackOrderOwner> = {};
    for (const bid of Object.keys(next).sort() as FormationId[]) {
        const owner = next[bid]!;
        if (finalOrders[bid] === owner.target) pruned[bid] = owner;
    }
    if (Object.keys(pruned).length > 0) {
        state.military.brigade_attack_order_owners = pruned;
    } else if (state.military.brigade_attack_order_owners !== undefined) {
        delete state.military.brigade_attack_order_owners;
    }
}

/** Drop ownership whose order no longer stands (resolver-side suppression); never creates the field. */
export function pruneAttackOrderOwners(state: GameState): void {
    const owners = state.military.brigade_attack_order_owners;
    if (owners === undefined) return;
    const orders = state.military.brigade_attack_orders ?? {};
    for (const bid of Object.keys(owners) as FormationId[]) {
        if (orders[bid] !== owners[bid]!.target) delete owners[bid];
    }
    if (Object.keys(owners).length === 0) delete state.military.brigade_attack_order_owners;
}

/** Clear pending order ownership once orders are consumed (resolver end) or suppressed. */
export function clearAttackOrderOwners(state: GameState): void {
    if (state.military.brigade_attack_order_owners !== undefined) {
        delete state.military.brigade_attack_order_owners;
    }
}
