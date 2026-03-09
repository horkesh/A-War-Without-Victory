/**
 * Sector offensive lifecycle management.
 *
 * A sector offensive IS a CorpsOperation with type === 'sector_attack'.
 * Lifecycle: planning → execution → recovery → removed from state.
 *
 * Pipeline integration:
 *   advance-sector-offensives  (after corps orders, before brigade orders)
 *   update-sector-offensive-results (after attack resolution)
 *
 * Deterministic: sorted iteration, no randomness, no timestamps.
 */

import type {
    CorpsOperation,
    FactionId,
    FormationId,
    GameState,
    OperationAxis,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { SupplyStateByOsidReport, SupplyStateLevel } from '../../state/supply_state_derivation.js';
import { getEffectiveSupplyState } from '../../state/supply_reserves.js';
import { pickOperationName } from './operation_names.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { releaseOperationCommander } from './officer_system.js';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

/** Minimum brigades in sector to launch an offensive. */
const MIN_BRIGADES_FOR_OFFENSIVE = 3;

/** Maximum objectives per offensive. */
const MAX_OBJECTIVES = 6;

/** Maximum brigades participating in a single sector offensive. */
const MAX_PARTICIPATING_BRIGADES = 12;

/** Momentum cap. */
const MOMENTUM_CAP = 3;

/** Maximum total failures before abort. */
const MAX_TOTAL_FAILURES = 5;

/** Consecutive failures on same objective before skip. */
const MAX_CONSECUTIVE_FAILURES_ON_CURRENT = 3;
const EARLY_LAUNCH_COHESION_PENALTY = 15;
const ALL_OUT_EXTRA_COHESION_COST = 1;
const BOMBARDMENT_PREP_COST = 2;
const FEINT_PLANNING_TURNS = 2;

// ═══════════════════════════════════════════════════════════════════════════
// Multi-axis helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Check if an operation uses the multi-axis structure. */
export function isMultiAxis(op: CorpsOperation): boolean {
    return Array.isArray(op.axes) && op.axes.length > 0;
}

/** Get all objectives across all axes (deduplicated, sorted). */
export function getAllAxisObjectives(op: CorpsOperation): string[] {
    if (!isMultiAxis(op)) return op.objectives ?? [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const axis of op.axes!) {
        for (const obj of axis.objectives) {
            if (!seen.has(obj)) {
                seen.add(obj);
                result.push(obj);
            }
        }
    }
    return result;
}

/** Get all participating brigades across all axes (deduplicated, sorted). */
export function getAllAxisBrigades(op: CorpsOperation): FormationId[] {
    if (!isMultiAxis(op)) return op.participating_brigades;
    const seen = new Set<string>();
    const result: FormationId[] = [];
    for (const axis of op.axes!) {
        for (const bid of axis.assigned_brigades) {
            if (!seen.has(bid)) {
                seen.add(bid);
                result.push(bid);
            }
        }
    }
    return result.sort(strictCompare);
}

/** Check if all axes are terminal (complete or stalled). */
function allAxesTerminal(axes: OperationAxis[]): boolean {
    return axes.every(a => a.status === 'complete' || a.status === 'stalled');
}

/** Sum a numeric field across all axes. */
function sumAxesField(axes: OperationAxis[], field: keyof OperationAxis): number {
    let total = 0;
    for (const axis of axes) {
        const val = axis[field];
        if (typeof val === 'number') total += val;
    }
    return total;
}

/** Reset an axis to execution-start state. */
function resetAxisForExecution(axis: OperationAxis): void {
    axis.current_objective_index = 0;
    axis.status = 'executing';
    axis.failure_count = 0;
    axis.consecutive_failures_on_current = 0;
    axis.momentum = 0;
    axis.last_result = undefined;
    axis.attack_attempt_count = 0;
    axis.objective_capture_count = 0;
    axis.movement_only_execution_turns = 0;
    axis.idle_execution_turn_streak = 0;
}

/** Create a single-axis wrapper for bot-generated operations. */
export function createSingleAxis(
    brigades: FormationId[],
    objectives: string[],
    stagingOsid?: string,
): OperationAxis {
    return {
        axis_id: 'main',
        name: 'Main Advance',
        assigned_brigades: brigades.sort(strictCompare),
        objectives,
        current_objective_index: 0,
        status: 'executing',
        failure_count: 0,
        consecutive_failures_on_current: 0,
        momentum: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
        ...(stagingOsid && { staging_osid: stagingOsid }),
    };
}

/** Compute planning duration for multi-axis ops: based on longest axis. */
function computeMultiAxisPlanningDuration(axes: OperationAxis[]): number {
    let maxLen = 0;
    for (const axis of axes) {
        if (axis.objectives.length > maxLen) maxLen = axis.objectives.length;
    }
    return computePlanningDuration(maxLen);
}

/**
 * Validate that an axis's objective chain is contiguous via the adjacency map.
 * Each objective must be adjacent to the staging OSID or to a prior objective in the chain.
 * Returns null if valid, or an error string if invalid.
 */
export function validateAxisContiguity(
    axis: OperationAxis,
    adjacency: Map<string, string[]>,
): string | null {
    if (axis.objectives.length === 0) return null;
    const reachable = new Set<string>();
    if (axis.staging_osid) reachable.add(axis.staging_osid);
    for (let i = 0; i < axis.objectives.length; i++) {
        const obj = axis.objectives[i];
        if (i === 0) {
            // First objective must be adjacent to staging or we skip the check if no staging
            if (axis.staging_osid) {
                const neighbors = adjacency.get(axis.staging_osid) ?? [];
                if (!neighbors.includes(obj)) {
                    return `Axis "${axis.name}": objective[0] "${obj}" is not adjacent to staging "${axis.staging_osid}"`;
                }
            }
        } else {
            // Must be adjacent to any prior objective (branching chains allowed)
            let connected = false;
            for (const prior of axis.objectives.slice(0, i)) {
                const neighbors = adjacency.get(prior) ?? [];
                if (neighbors.includes(obj)) {
                    connected = true;
                    break;
                }
            }
            if (!connected) {
                return `Axis "${axis.name}": objective[${i}] "${obj}" is not adjacent to any prior objective`;
            }
        }
        reachable.add(obj);
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Planning duration
// ═══════════════════════════════════════════════════════════════════════════

/** Compute planning duration from number of objectives. */
export function computePlanningDuration(objectiveCount: number): number {
    if (objectiveCount <= 2) return 1;
    if (objectiveCount <= 5) return Math.ceil(objectiveCount * 0.6);
    return Math.min(5, Math.ceil(objectiveCount * 0.8));
}

function collectObjectiveApproachOsids(
    state: GameState,
    corpsId: FormationId,
    objectives: string[]
): Set<string> {
    const approachOsids = new Set<string>();
    if (!state.corps_front_sectors || objectives.length === 0) return approachOsids;
    const objectiveSet = new Set(objectives);
    for (const sector of Object.values(state.corps_front_sectors)) {
        if (sector.corps_id !== corpsId) continue;
        for (const subSegment of sector.sub_segments ?? []) {
            const touchesObjective = subSegment.enemy_osids.some((osid) => objectiveSet.has(osid));
            if (!touchesObjective) continue;
            for (const osid of subSegment.friendly_osids) {
                approachOsids.add(osid);
            }
        }
    }
    return approachOsids;
}

function areParticipantsReadyForExecution(
    state: GameState,
    corpsId: FormationId,
    participatingBrigades: FormationId[],
    stagingOsid: string | undefined,
    objectives: string[]
): boolean {
    const objectiveApproachOsids = collectObjectiveApproachOsids(state, corpsId, objectives);
    let activeParticipantCount = 0;
    for (const brigadeId of participatingBrigades) {
        const brigade = state.formations?.[brigadeId];
        if (!brigade || brigade.status !== 'active') continue;
        const location = brigade.location_osid;
        if (typeof location !== 'string' || location.length === 0) return false;
        activeParticipantCount += 1;
        if (location === stagingOsid) continue;
        if (objectiveApproachOsids.has(location)) continue;
        return false;
    }
    return activeParticipantCount > 0;
}

function beginRecovery(op: CorpsOperation, turn: number, reason: CorpsOperation['recovery_reason']): void {
    op.phase = 'recovery';
    op.phase_started_turn = turn;
    op.recovery_reason = reason;
    op.force_launch = false;
}

function getRecoveryDuration(op: CorpsOperation): number {
    const objectiveCount = op.objectives?.length ?? 2;
    switch (op.recovery_reason) {
        case 'no_logged_attempt':
        case 'manual_termination':
            return 1;
        case 'completed':
            return Math.max(1, Math.ceil(objectiveCount / 2));
        case 'max_failures':
        case 'orphaned_sector':
        default:
            return Math.max(2, Math.ceil(objectiveCount / 2));
    }
}

function getNoAttemptRecoveryReason(op: CorpsOperation): CorpsOperation['recovery_reason'] {
    if (isMultiAxis(op)) {
        return sumAxesField(op.axes!, 'attack_attempt_count') > 0 ? 'max_failures' : 'no_logged_attempt';
    }
    return (op.attack_attempt_count ?? 0) > 0 ? 'max_failures' : 'no_logged_attempt';
}

function getMultiAxisRecoveryDuration(op: CorpsOperation): number {
    let maxLen = 0;
    for (const axis of op.axes ?? []) {
        if (axis.objectives.length > maxLen) maxLen = axis.objectives.length;
    }
    switch (op.recovery_reason) {
        case 'no_logged_attempt':
        case 'manual_termination':
            return 1;
        case 'completed':
            return Math.max(1, Math.ceil(maxLen / 2));
        case 'max_failures':
        case 'orphaned_sector':
        default:
            return Math.max(2, Math.ceil(maxLen / 2));
    }
}

function applyCohesionDelta(state: GameState, brigadeIds: FormationId[], delta: number): void {
    for (const brigadeId of [...brigadeIds].sort(strictCompare)) {
        const brigade = state.formations?.[brigadeId];
        if (!brigade || brigade.status !== 'active') continue;
        const next = Math.max(0, Math.min(100, (brigade.cohesion ?? 100) + delta));
        brigade.cohesion = Math.round(next * 10) / 10;
    }
}

function applyDigInOnHalt(state: GameState, brigadeIds: FormationId[]): void {
    for (const brigadeId of [...brigadeIds].sort(strictCompare)) {
        const brigade = state.formations?.[brigadeId];
        if (!brigade || brigade.status !== 'active') continue;
        brigade.posture = 'dig_in';
    }
}

function applyArtilleryPreparation(
    state: GameState,
    faction: FactionId,
    operation: CorpsOperation
): void {
    if (!operation.artillery_preparation || operation.artillery_preparation_consumed) return;
    const currentObjective = operation.objectives?.[operation.current_objective_index ?? 0];
    if (typeof currentObjective !== 'string' || currentObjective.length === 0) return;
    if (!state.heavy_munitions_reserve) state.heavy_munitions_reserve = {};
    const currentReserve = state.heavy_munitions_reserve[faction] ?? 0;
    if (currentReserve < BOMBARDMENT_PREP_COST) return;
    state.heavy_munitions_reserve[faction] = Math.max(0, currentReserve - BOMBARDMENT_PREP_COST);
    for (const formationId of Object.keys(state.formations ?? {}).sort(strictCompare)) {
        const formation = state.formations?.[formationId];
        if (!formation || formation.status !== 'active') continue;
        if (formation.location_osid !== currentObjective || formation.faction === faction) continue;
        formation.dig_in_progress = 0;
        formation.cohesion = Math.max(0, (formation.cohesion ?? 100) - 10);
    }
    operation.artillery_preparation_consumed = true;
}

function fullyRevealProbeSectorIntel(state: GameState, operation: CorpsOperation): void {
    if (operation.type !== 'probe' || !operation.sector_id || !state.sector_intel?.[operation.sector_id]) return;
    for (const record of state.sector_intel[operation.sector_id]) {
        record.confidence = 1;
    }
}

function resolveOperationSectorId(
    state: GameState,
    corpsId: FormationId,
    objectives: string[],
): string | null {
    if (!state.corps_front_sectors || objectives.length === 0) return null;
    const objectiveSet = new Set(objectives);
    let bestSectorId: string | null = null;
    let bestOverlap = 0;
    for (const sector of Object.values(state.corps_front_sectors)) {
        if (sector.corps_id !== corpsId) continue;
        let overlap = 0;
        for (const ss of sector.sub_segments ?? []) {
            for (const eo of ss.enemy_osids) {
                if (objectiveSet.has(eo)) overlap += 1;
            }
        }
        if (overlap > bestOverlap) {
            bestOverlap = overlap;
            bestSectorId = sector.sector_id;
        }
    }
    return bestSectorId;
}

// ═══════════════════════════════════════════════════════════════════════════
// Supply readiness
// ═══════════════════════════════════════════════════════════════════════════

/** Compute supply readiness as fraction of participating brigades with adequate supply. */
function computeSupplyReadiness(
    state: GameState,
    participatingBrigades: FormationId[],
    faction: FactionId,
    supplyByOsid?: SupplyStateByOsidReport | null
): number {
    // Supply readiness only meaningful when full supply reserves system is active
    if (!state.meta?.supply_reserves_enabled) return 1.0;
    if (!supplyByOsid?.factions || participatingBrigades.length === 0) return 1.0;
    const fac = supplyByOsid.factions.find(f => f.faction_id === faction);
    if (!fac?.by_osid) return 1.0;
    const osidState = new Map<string, SupplyStateLevel>();
    for (const e of fac.by_osid) osidState.set(e.osid, e.state);

    const reserveLevel = state.meta?.supply_reserves_enabled
        ? ((state.general_supply_reserve as Record<string, number> | undefined)?.[faction] ?? 100)
        : 100;

    let adequate = 0;
    for (const bid of participatingBrigades) {
        const b = state.formations?.[bid];
        if (!b || b.status !== 'active') continue;
        const rawSt = b.location_osid ? (osidState.get(b.location_osid) ?? 'adequate') : 'adequate';
        const st = state.meta?.supply_reserves_enabled
            ? getEffectiveSupplyState(rawSt, reserveLevel)
            : rawSt;
        if (st === 'adequate') adequate++;
    }
    return participatingBrigades.length > 0 ? adequate / participatingBrigades.length : 1.0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Advance sector offensives (phase transitions, validation)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Advance all sector offensives: manage phase transitions, supply readiness, sector validation.
 * Called after generate-bot-corps-orders, before generate-bot-brigade-orders.
 *
 * Supports both multi-axis (op.axes[]) and legacy flat-field operations.
 */
export function advanceSectorOffensives(
    state: GameState,
    supplyByOsid?: SupplyStateByOsidReport | null
): void {
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return;

    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    for (const corpsId of corpsIds) {
        const cmd = corpsCommand[corpsId];
        if (!cmd?.active_operation) continue;
        const op = cmd.active_operation;
        if (op.type !== 'sector_attack' && op.type !== 'feint' && op.type !== 'probe') continue;

        const turn = state.meta?.turn ?? 0;
        const corps = state.formations?.[corpsId];
        const faction = (corps?.faction ?? 'RS') as FactionId;
        const multiAxis = isMultiAxis(op);

        const allObjectives = multiAxis ? getAllAxisObjectives(op) : (op.objectives ?? []);
        const allBrigades = multiAxis ? getAllAxisBrigades(op) : op.participating_brigades;

        const resolvedSectorId = resolveOperationSectorId(state, corpsId, allObjectives);
        if (resolvedSectorId) {
            op.sector_id = resolvedSectorId;
        }

        // Validate sector still exists
        if (op.sector_id && state.corps_front_sectors) {
            if (!state.corps_front_sectors[op.sector_id]) {
                if (op.phase !== 'recovery') {
                    const anyAttempts = multiAxis
                        ? sumAxesField(op.axes!, 'attack_attempt_count') > 0
                        : (op.attack_attempt_count ?? 0) > 0;
                    beginRecovery(op, turn, anyAttempts ? 'orphaned_sector' : 'no_logged_attempt');
                    continue;
                }
            }
        }

        // Recompute supply readiness
        op.supply_readiness = computeSupplyReadiness(state, allBrigades, faction, supplyByOsid);

        if (op.recovery_reason === 'manual_termination' && op.phase !== 'recovery') {
            if (op.dig_in_on_halt) {
                applyDigInOnHalt(state, allBrigades);
            }
            beginRecovery(op, turn, 'manual_termination');
            continue;
        }

        if (op.phase === 'planning') {
            if (op.type === 'probe') {
                op.planning_duration = 1;
                op.participating_brigades = [...(op.participating_brigades ?? [])].sort(strictCompare).slice(0, 2);
            }
            const elapsed = turn - op.phase_started_turn;
            const planDuration = op.planning_duration
                ?? (multiAxis ? computeMultiAxisPlanningDuration(op.axes!) : 1);
            const stagedEarly = elapsed >= 1 && areParticipantsReadyForExecution(
                state,
                corpsId,
                allBrigades,
                op.staging_osid,
                allObjectives
            );
            const forcedLaunch = op.force_launch === true && elapsed >= 1;

            if (op.type === 'feint' && elapsed >= FEINT_PLANNING_TURNS) {
                applyCohesionDelta(state, allBrigades, -5);
                if (!state.general_supply_reserve) state.general_supply_reserve = {};
                state.general_supply_reserve[faction] = Math.max(0, (state.general_supply_reserve[faction] ?? 0) - 0.5);
                beginRecovery(op, turn, 'manual_termination');
                continue;
            }
            if (elapsed > planDuration || stagedEarly || forcedLaunch) {
                op.phase = 'execution';
                op.phase_started_turn = turn;
                op.recovery_reason = undefined;

                if (multiAxis) {
                    for (const axis of op.axes!) resetAxisForExecution(axis);
                } else {
                    op.current_objective_index = 0;
                    op.momentum = 0;
                    op.failure_count = 0;
                    op.consecutive_failures_on_current = 0;
                    op.attack_attempt_count = 0;
                    op.objective_capture_count = 0;
                    op.movement_only_execution_turns = 0;
                    op.idle_execution_turn_streak = 0;
                }

                if (op.sector_id && Array.isArray(state.opsec_sectors)) {
                    state.opsec_sectors = state.opsec_sectors.filter((sectorId) => sectorId !== op.sector_id);
                }
                if (forcedLaunch) {
                    applyCohesionDelta(state, allBrigades, -EARLY_LAUNCH_COHESION_PENALTY);
                    op.force_launch = false;
                }
                applyArtilleryPreparation(state, faction, op);
            }
        } else if (op.phase === 'execution') {
            if (op.tempo === 'all_out') {
                applyCohesionDelta(state, allBrigades, -ALL_OUT_EXTRA_COHESION_COST);
            }

            if (multiAxis) {
                // Multi-axis: check if all axes are terminal
                if (allAxesTerminal(op.axes!)) {
                    const allComplete = op.axes!.every(a => a.status === 'complete');
                    beginRecovery(op, turn, allComplete ? 'completed' : 'max_failures');
                    continue;
                }
            } else {
                // Legacy flat: check completion and failures
                const objectives = op.objectives ?? [];
                if ((op.current_objective_index ?? 0) >= objectives.length) {
                    beginRecovery(op, turn, 'completed');
                    continue;
                }
                if ((op.failure_count ?? 0) >= MAX_TOTAL_FAILURES) {
                    beginRecovery(op, turn, getNoAttemptRecoveryReason(op));
                    continue;
                }
            }

            if (op.type === 'probe' && !multiAxis && (op.attack_attempt_count ?? 0) > 0) {
                beginRecovery(op, turn, op.last_result === 'captured' ? 'completed' : 'manual_termination');
                continue;
            }
        } else if (op.phase === 'recovery') {
            const elapsed = turn - op.phase_started_turn;
            const recoveryDuration = multiAxis
                ? getMultiAxisRecoveryDuration(op)
                : getRecoveryDuration(op);
            if (elapsed >= recoveryDuration) {
                const exhaustionCost = op.type === 'feint' || op.type === 'probe' ? 5 : 15;
                cmd.corps_exhaustion = Math.min(100, (cmd.corps_exhaustion ?? 0) + exhaustionCost);
                releaseOperationCommander(state, op);
                cmd.active_operation = null;
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Update sector offensive results (post-combat)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if objectives were captured after combat resolution.
 * Called after phase-ii-resolve-attack-orders.
 *
 * Supports both multi-axis (op.axes[]) and legacy flat-field operations.
 * For multi-axis: each axis is evaluated independently; convergence objectives
 * (shared terminal targets) are captured for all axes when any axis captures them.
 */
export function updateSectorOffensiveResults(
    state: GameState,
    reverseMap?: OperationalToCanonicalReverseMap | null
): void {
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return;

    const corpsIds = Object.keys(corpsCommand).sort(strictCompare);
    for (const corpsId of corpsIds) {
        const cmd = corpsCommand[corpsId];
        if (!cmd?.active_operation) continue;
        const op = cmd.active_operation;
        if ((op.type !== 'sector_attack' && op.type !== 'probe') || op.phase !== 'execution') continue;

        const corps = state.formations?.[corpsId];
        const faction = (corps?.faction ?? 'RS') as FactionId;
        const turn = state.meta?.turn ?? 0;

        if (isMultiAxis(op)) {
            updateMultiAxisResults(state, op, corpsId, faction, turn, reverseMap);
        } else {
            updateLegacyFlatResults(state, op, corpsId, faction, turn, reverseMap);
        }
    }
}

/** Update results for multi-axis operations. */
function updateMultiAxisResults(
    state: GameState,
    op: CorpsOperation,
    corpsId: FormationId,
    faction: FactionId,
    turn: number,
    reverseMap?: OperationalToCanonicalReverseMap | null
): void {
    const axes = op.axes!;

    // First pass: check for convergence captures (shared objectives captured by any axis)
    const capturedThisTurn = new Set<string>();
    for (const axis of axes) {
        if (axis.status !== 'executing') continue;
        const currentIdx = axis.current_objective_index;
        if (currentIdx >= axis.objectives.length) continue;
        const currentObj = axis.objectives[currentIdx]!;
        const controller = getPoliticalControllerOSID(state, currentObj, reverseMap ?? undefined);
        if (controller === faction) capturedThisTurn.add(currentObj);
    }

    // Second pass: advance each axis
    for (const axis of axes) {
        if (axis.status !== 'executing') continue;
        const currentIdx = axis.current_objective_index;
        if (currentIdx >= axis.objectives.length) {
            axis.status = 'complete';
            continue;
        }

        const currentObjective = axis.objectives[currentIdx]!;

        if (capturedThisTurn.has(currentObjective)) {
            // Captured (either by this axis's brigades or convergence from another axis)
            axis.attack_attempt_count += 1;
            axis.objective_capture_count += 1;
            axis.idle_execution_turn_streak = 0;
            axis.last_result = 'captured';
            axis.momentum = Math.min(MOMENTUM_CAP, axis.momentum + 1);
            axis.current_objective_index = currentIdx + 1;
            axis.consecutive_failures_on_current = 0;
            fullyRevealProbeSectorIntel(state, op);
        } else {
            // Check if any of THIS AXIS's brigades attacked this objective
            const adjacentFriendlyOsids = collectAdjacentFriendlyOsids(state, corpsId, currentObjective);
            const anyAttacked = axis.assigned_brigades.some(bid => {
                const b = state.formations?.[bid];
                if (!b || (b.posture !== 'attack' && b.posture !== 'assault')) return false;
                return b.location_osid ? adjacentFriendlyOsids.has(b.location_osid) : false;
            });
            const anyMoved = axis.assigned_brigades.some(bid => {
                const movement = state.brigade_movement_orders?.[bid];
                return Array.isArray(movement?.destination_sids) && movement.destination_sids.length > 0;
            });

            if (anyAttacked) {
                axis.attack_attempt_count += 1;
                axis.idle_execution_turn_streak = 0;
                axis.last_result = 'failed';
                axis.momentum = 0;
                axis.failure_count += 1;
                axis.consecutive_failures_on_current += 1;
                fullyRevealProbeSectorIntel(state, op);

                if (axis.consecutive_failures_on_current >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT) {
                    axis.current_objective_index = currentIdx + 1;
                    axis.consecutive_failures_on_current = 0;
                }
            } else {
                if (anyMoved) {
                    // Approach movement: brigade is marching toward objective.
                    // This is not a combat failure — don't increment failure counts.
                    axis.movement_only_execution_turns += 1;
                    axis.idle_execution_turn_streak = 0;
                    axis.last_result = 'approach';
                    axis.momentum = 0;
                } else {
                    // Truly idle: no movement, no attack.
                    axis.idle_execution_turn_streak += 1;
                    axis.last_result = 'stalemate';
                    axis.momentum = 0;
                    axis.failure_count += 1;
                    axis.consecutive_failures_on_current += 1;
                }

                if (!anyMoved && !anyAttacked && axis.attack_attempt_count === 0 && axis.idle_execution_turn_streak >= 2) {
                    axis.movement_only_execution_turns = Math.max(1, axis.movement_only_execution_turns);
                    axis.status = 'stalled';
                    continue;
                }

                if (axis.consecutive_failures_on_current >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT) {
                    axis.current_objective_index = currentIdx + 1;
                    axis.consecutive_failures_on_current = 0;
                }
            }
        }

        // Check axis completion or stall
        if (axis.current_objective_index >= axis.objectives.length) {
            axis.status = 'complete';
        }
        if (axis.failure_count >= MAX_TOTAL_FAILURES) {
            axis.status = 'stalled';
        }
    }

    // Aggregate axis-level captures to operation level
    let totalCaptures = 0;
    let totalAttempts = 0;
    for (const axis of axes) {
        totalCaptures += axis.objective_capture_count ?? 0;
        totalAttempts += axis.attack_attempt_count ?? 0;
    }
    op.objective_capture_count = totalCaptures;
    op.attack_attempt_count = totalAttempts;

    // Check if all axes terminal → operation enters recovery
    if (allAxesTerminal(axes)) {
        const allComplete = axes.every(a => a.status === 'complete');
        beginRecovery(op, turn, allComplete ? 'completed' : 'max_failures');
    }
}

/** Collect friendly OSIDs adjacent to a target objective for attack detection. */
function collectAdjacentFriendlyOsids(state: GameState, corpsId: FormationId, targetOsid: string): Set<string> {
    const result = new Set<string>();
    if (!state.corps_front_sectors) return result;
    for (const sector of Object.values(state.corps_front_sectors)) {
        if (sector.corps_id !== corpsId) continue;
        for (const ss of sector.sub_segments) {
            if (ss.enemy_osids.includes(targetOsid)) {
                for (const fo of ss.friendly_osids) result.add(fo);
            }
        }
    }
    return result;
}

/** Update results for legacy flat-field operations (no axes). */
function updateLegacyFlatResults(
    state: GameState,
    op: CorpsOperation,
    corpsId: FormationId,
    faction: FactionId,
    turn: number,
    reverseMap?: OperationalToCanonicalReverseMap | null
): void {
    const objectives = op.objectives ?? [];
    const currentIdx = op.current_objective_index ?? 0;
    if (currentIdx >= objectives.length) return;

    const currentObjective = objectives[currentIdx]!;
    const controller = getPoliticalControllerOSID(state, currentObjective, reverseMap ?? undefined);

    if (controller === faction) {
        op.attack_attempt_count = (op.attack_attempt_count ?? 0) + 1;
        op.objective_capture_count = (op.objective_capture_count ?? 0) + 1;
        op.idle_execution_turn_streak = 0;
        op.last_result = 'captured';
        op.momentum = Math.min(MOMENTUM_CAP, (op.momentum ?? 0) + 1);
        op.current_objective_index = currentIdx + 1;
        op.consecutive_failures_on_current = 0;
        fullyRevealProbeSectorIntel(state, op);
    } else {
        const adjacentFriendlyOsids = collectAdjacentFriendlyOsids(state, corpsId, currentObjective);
        const anyAttacked = op.participating_brigades.some(bid => {
            const b = state.formations?.[bid];
            if (!b || (b.posture !== 'attack' && b.posture !== 'assault')) return false;
            return b.location_osid ? adjacentFriendlyOsids.has(b.location_osid) : false;
        });
        const anyMoved = op.participating_brigades.some(bid => {
            const movement = state.brigade_movement_orders?.[bid];
            return Array.isArray(movement?.destination_sids) && movement.destination_sids.length > 0;
        });

        if (anyAttacked) {
            op.attack_attempt_count = (op.attack_attempt_count ?? 0) + 1;
            op.idle_execution_turn_streak = 0;
            op.last_result = 'failed';
            op.momentum = 0;
            op.failure_count = (op.failure_count ?? 0) + 1;
            op.consecutive_failures_on_current = (op.consecutive_failures_on_current ?? 0) + 1;
            fullyRevealProbeSectorIntel(state, op);

            if ((op.consecutive_failures_on_current ?? 0) >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT) {
                op.current_objective_index = currentIdx + 1;
                op.consecutive_failures_on_current = 0;
            }
        } else {
            if (anyMoved) {
                // Approach movement: brigade is marching toward objective.
                // Not a combat failure — don't increment failure counts.
                op.movement_only_execution_turns = (op.movement_only_execution_turns ?? 0) + 1;
                op.idle_execution_turn_streak = 0;
                op.last_result = 'approach';
                op.momentum = 0;
            } else {
                // Truly idle: no movement, no attack.
                op.idle_execution_turn_streak = (op.idle_execution_turn_streak ?? 0) + 1;
                op.last_result = 'stalemate';
                op.momentum = 0;
                op.failure_count = (op.failure_count ?? 0) + 1;
                op.consecutive_failures_on_current = (op.consecutive_failures_on_current ?? 0) + 1;
            }

            if (!anyMoved && !anyAttacked && (op.attack_attempt_count ?? 0) === 0 && (op.idle_execution_turn_streak ?? 0) >= 2) {
                op.movement_only_execution_turns = Math.max(1, op.movement_only_execution_turns ?? 0);
                beginRecovery(op, turn, 'no_logged_attempt');
                return;
            }

            if ((op.consecutive_failures_on_current ?? 0) >= MAX_CONSECUTIVE_FAILURES_ON_CURRENT) {
                op.current_objective_index = currentIdx + 1;
                op.consecutive_failures_on_current = 0;
            }
        }
    }

    if ((op.current_objective_index ?? 0) >= objectives.length) {
        beginRecovery(op, turn, 'completed');
    }
    if ((op.failure_count ?? 0) >= MAX_TOTAL_FAILURES) {
        beginRecovery(op, turn, getNoAttemptRecoveryReason(op));
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Evaluate & launch sector offensives
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Evaluate whether a corps should launch a sector offensive from a given sector.
 * Called from bot_corps_ai.ts during directive generation.
 *
 * Requirements:
 * - Corps stance is offensive or balanced
 * - No active operation for this corps
 * - >= MIN_BRIGADES_FOR_OFFENSIVE brigades in sector
 * - Supply readiness is recorded on the operation but does not block launch
 * - >= 2 enemy OSIDs adjacent to sector
 *
 * Returns the operation to launch, or null.
 */
export function evaluateSectorOffensiveLaunch(
    state: GameState,
    corpsId: FormationId,
    sectorId: string,
    faction: FactionId,
    sectorBrigadeIds: FormationId[],
    sectorEnemyOsids: string[],
    offensiveTargets: string[],
    supplyByOsid?: SupplyStateByOsidReport | null
): CorpsOperation | null {
    const turn = state.meta?.turn ?? 0;

    // Must have enough brigades
    if (sectorBrigadeIds.length < MIN_BRIGADES_FOR_OFFENSIVE) return null;

    // Must have enough enemy targets
    if (sectorEnemyOsids.length < 2) return null;

    // Record supply readiness for diagnostics and downstream brigade-level attack gating.
    // Launch itself is allowed even under poor sector-wide supply so the force can stage and
    // reposition toward the next objective. Individual brigades still remain supply-gated when
    // bot_brigade_ai_osid decides whether an attack order is actually eligible.
    const supplyReadiness = computeSupplyReadiness(state, sectorBrigadeIds, faction, supplyByOsid);

    // Select objectives: offensive targets that are in this sector's enemy OSIDs
    const sectorTargetSet = new Set(sectorEnemyOsids);
    const objectives = offensiveTargets
        .filter(t => sectorTargetSet.has(t))
        .slice(0, MAX_OBJECTIVES);

    // Need at least 1 objective for a sector offensive
    if (objectives.length < 1) return null;

    const planningDuration = computePlanningDuration(objectives.length);
    const name = pickOperationName(corpsId, turn, faction, state);

    // Reserve fraction: keep 1 brigade in reserve, rest participate (capped)
    const reserveCount = Math.max(1, Math.floor(sectorBrigadeIds.length * 0.15));
    const participating = sectorBrigadeIds
        .slice(0, sectorBrigadeIds.length - reserveCount)
        .slice(0, MAX_PARTICIPATING_BRIGADES);

    // Pick staging OSID: first friendly OSID in the sector (deterministic, sorted)
    let stagingOsid: string | undefined;
    const sector = state.corps_front_sectors?.[sectorId];
    if (sector) {
        const friendlyOsids: string[] = [];
        for (const ss of sector.sub_segments) {
            for (const o of ss.friendly_osids) friendlyOsids.push(o);
        }
        friendlyOsids.sort(strictCompare);
        if (friendlyOsids.length > 0) stagingOsid = friendlyOsids[0];
    }

    const sortedParticipating = participating.sort(strictCompare);

    return {
        name,
        type: 'sector_attack',
        phase: 'planning',
        started_turn: turn,
        phase_started_turn: turn,
        participating_brigades: sortedParticipating,
        sector_id: sectorId,
        axes: [createSingleAxis(sortedParticipating, objectives, stagingOsid)],
        objectives,
        current_objective_index: 0,
        planning_duration: planningDuration,
        supply_readiness: supplyReadiness,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
        ...(stagingOsid && { staging_osid: stagingOsid }),
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Momentum bonuses (used by brigade AI)
// ═══════════════════════════════════════════════════════════════════════════

/** Get momentum-based aggression bonus for a sector offensive. */
export function getMomentumAggressionBonus(momentum: number): number {
    if (momentum >= 3) return 0.15;
    if (momentum >= 2) return 0.10;
    if (momentum >= 1) return 0.05;
    return 0;
}

/** Get momentum-based minimum outcome relaxation. Returns the relaxed min_outcome. */
export function getMomentumMinOutcome(momentum: number, base: string): string {
    const rank: Record<string, number> = {
        decisive_victory: 5, victory: 4, costly_victory: 3, stalemate: 2, repulsed: 1
    };
    const baseRank = rank[base] ?? 2;
    if (momentum >= 3 && baseRank > 2) return 'stalemate';
    if (momentum >= 2 && baseRank > 3) return 'costly_victory';
    if (momentum >= 1 && baseRank > 4) return 'victory';
    return base;
}
