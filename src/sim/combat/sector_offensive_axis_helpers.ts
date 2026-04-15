import type {
    CorpsOperation,
    FormationId,
    FormationState,
    GameState,
    OperationAxis,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { basePower } from './combat_math.js';

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

export function getCurrentLaunchObjectives(op: CorpsOperation): string[] {
    if (!isMultiAxis(op)) {
        const currentObjective = op.objectives?.[op.current_objective_index ?? 0];
        return currentObjective ? [currentObjective] : [];
    }

    const seen = new Set<string>();
    const objectives: string[] = [];
    for (const axis of op.axes!) {
        const currentObjective = axis.objectives[axis.current_objective_index ?? 0];
        if (!currentObjective || seen.has(currentObjective)) continue;
        seen.add(currentObjective);
        objectives.push(currentObjective);
    }
    return objectives;
}

/** Check if all axes are terminal (complete or stalled). */
export function allAxesTerminal(axes: OperationAxis[]): boolean {
    return axes.every(a => a.status === 'complete' || a.status === 'stalled');
}

/** Sum a numeric field across all axes. */
export function sumAxesField(axes: OperationAxis[], field: keyof OperationAxis): number {
    let total = 0;
    for (const axis of axes) {
        const val = axis[field];
        if (typeof val === 'number') total += val;
    }
    return total;
}

/** Reset an axis to execution-start state. */
export function resetAxisForExecution(axis: OperationAxis): void {
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
    formations?: Record<string, FormationState>,
): OperationAxis {
    const sorted = brigades.sort(strictCompare);
    const { main, support } = assignBrigadeRoles(sorted, formations);
    return {
        axis_id: 'main',
        name: 'Main Advance',
        assigned_brigades: sorted,
        ...(main && { main_brigade: main }),
        ...(support.length > 0 && { support_brigades: support }),
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

/**
 * Assign main/support roles to brigades on an axis.
 * Main brigade = highest basePower (deterministic tiebreak by ID).
 * All others = support.
 */
export function assignBrigadeRoles(
    brigadeIds: FormationId[],
    formations?: Record<string, FormationState>,
): { main: FormationId | undefined; support: FormationId[] } {
    if (!formations || brigadeIds.length === 0) {
        return { main: undefined, support: [] };
    }
    if (brigadeIds.length === 1) {
        return { main: brigadeIds[0], support: [] };
    }
    const ranked = [...brigadeIds].sort((a, b) => {
        const fa = formations[a];
        const fb = formations[b];
        const pa = fa ? basePower(fa) : 0;
        const pb = fb ? basePower(fb) : 0;
        if (pb !== pa) return pb - pa;
        return strictCompare(a, b);
    });
    return {
        main: ranked[0],
        support: ranked.slice(1).sort(strictCompare),
    };
}

/**
 * Check whether a brigade is a SUPPORT brigade on its corps' active operation.
 * Main brigades and non-participants return false.
 */
export function isSupportBrigadeOnActiveOp(
    state: GameState,
    brigadeId: FormationId,
    corpsId: FormationId | null | undefined,
): boolean {
    if (!corpsId) return false;
    const cmd = state.military.corps_command?.[corpsId];
    if (!cmd) return false;
    for (const op of cmd.active_operations) {
        if (op.phase !== 'execution') continue;
        if (!op.axes) continue;
        for (const axis of op.axes) {
            if (axis.support_brigades?.includes(brigadeId)) return true;
        }
    }
    return false;
}

/** Compute planning duration for multi-axis ops: based on longest axis. */
export function computeMultiAxisPlanningDuration(
    axes: OperationAxis[],
    computePlanningDuration: (objectiveCount: number) => number,
): number {
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
    for (let i = 0; i < axis.objectives.length; i++) {
        const obj = axis.objectives[i];
        if (i === 0) {
            if (axis.staging_osid) {
                const neighbors = adjacency.get(axis.staging_osid) ?? [];
                if (!neighbors.includes(obj)) {
                    return `Axis "${axis.name}": objective[0] "${obj}" is not adjacent to staging "${axis.staging_osid}"`;
                }
            }
        } else {
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
    }
    return null;
}
