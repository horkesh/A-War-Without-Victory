import type { CorpsCommandState, CorpsOperation, FormationId, OperationAxis } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

// ─── Minimal type for pre-planned op fields consumed by buildCorpsOperation ──
interface PrePlannedOpDef {
    name: string;
    planning_duration?: number;
    staging_osid: string;
    min_attack_outcome?: CorpsOperation['min_attack_outcome'];
}

/** Max concurrent operation slots for a corps based on brigade count */
export function getMaxOperationSlots(activeBrigadeCount: number): number {
    return Math.max(1, Math.floor(activeBrigadeCount / 12));
}

/** Whether the corps has a free operation slot */
export function hasAvailableSlot(cmd: CorpsCommandState, activeBrigadeCount: number): boolean {
    return cmd.active_operations.length < getMaxOperationSlots(activeBrigadeCount);
}

/** Find which operation (if any) a brigade participates in */
export function findBrigadeOperation(cmd: CorpsCommandState, brigadeId: string): CorpsOperation | null {
    for (const op of cmd.active_operations) {
        if (op.participating_brigades.includes(brigadeId)) return op;
    }
    return null;
}

/** Get brigade IDs not committed to any active operation */
export function getAvailableBrigades(cmd: CorpsCommandState, allCorpsBrigadeIds: string[]): string[] {
    const busy = new Set<string>();
    for (const op of cmd.active_operations) {
        for (const bid of op.participating_brigades) busy.add(bid);
    }
    return allCorpsBrigadeIds.filter(bid => !busy.has(bid));
}

/** Whether the corps has ANY active operation (replaces `if (cmd.active_operation)`) */
export function hasActiveOperation(cmd: CorpsCommandState): boolean {
    return cmd.active_operations.length > 0;
}

/**
 * Whether slot 0 is available for a queued pre-planned operation.
 * Queued ops are sequential and always occupy slot 0. Bot AI ops (probe/sector_attack)
 * in slots 1+ do NOT block queued op injection — only an existing pre-planned op does.
 */
export function isSlot0AvailableForQueue(cmd: CorpsCommandState): boolean {
    return !cmd.active_operations.some(op => op.is_pre_planned);
}

/** Get the primary (first/oldest) active operation, or null */
export function getPrimaryOperation(cmd: CorpsCommandState): CorpsOperation | null {
    return cmd.active_operations[0] ?? null;
}

/** Remove a specific operation from the active list by reference or name */
export function removeOperation(cmd: CorpsCommandState, op: CorpsOperation): void {
    const idx = cmd.active_operations.indexOf(op);
    if (idx >= 0) cmd.active_operations.splice(idx, 1);
}

// ═══════════════════════════════════════════════════════════════════════════
// CorpsOperation factory functions — canonical construction entry points.
// ALL CorpsOperation objects must be built via one of these factories.
// Entry points: buildCorpsOperation (pre-planned), buildCommanderOperation,
// buildProbeOperation (commander-generated).
// ═══════════════════════════════════════════════════════════════════════════

/** Factory for pre-planned, player-queued, and triggered operations. */
export function buildCorpsOperation(
    def: PrePlannedOpDef,
    axes: OperationAxis[],
    participating: FormationId[],
    turn: number,
    isPrePlanned = true,
): CorpsOperation {
    const allObjectives = axes.flatMap(a => a.objectives);
    return {
        name: def.name,
        type: 'sector_attack',
        phase: 'planning',
        started_turn: turn,
        phase_started_turn: turn,
        participating_brigades: [...new Set(participating)].sort(strictCompare),
        axes,
        objectives: [...new Set(allObjectives)],
        current_objective_index: 0,
        planning_duration: def.planning_duration ?? 1,
        supply_readiness: 1.0,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        staging_osid: def.staging_osid,
        ...(isPrePlanned ? { is_pre_planned: true } : {}),
        ...(def.min_attack_outcome ? { min_attack_outcome: def.min_attack_outcome } : {}),
    };
}

/** Factory for commander-generated sector-attack operations. */
export function buildCommanderOperation(
    corpsId: string,
    turn: number,
    participatingBrigades: string[],
    sectorId: string | undefined,
    objectives: string[],
    initialStrength: number,
    name?: string,
): CorpsOperation {
    return {
        name: name ?? `cmd_${corpsId}_t${turn}`,
        type: 'sector_attack',
        phase: 'planning',
        started_turn: turn,
        phase_started_turn: turn,
        participating_brigades: participatingBrigades,
        sector_id: sectorId ?? undefined,
        objectives,
        current_objective_index: 0,
        planning_duration: 1,
        supply_readiness: 1.0,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
        // Commander-generated ops: attack at rough parity (≥0.7 ratio).
        // Default costly_victory (≥1.0) causes drought when defenders are entrenched.
        // Pre-planned ops use 'repulsed' (≥0.5); 'stalemate' is appropriate for AI ops.
        min_attack_outcome: 'stalemate',
        // Set at emit time so power-attrition abort gate fires correctly for
        // commander-generated ops (operation_aar.ts skips the write when already set).
        initial_strength: initialStrength,
    };
}

/** Factory for commander-generated probe operations (single surplus brigade). */
export function buildProbeOperation(
    corpsId: string,
    turn: number,
    brigadeId: string,
): CorpsOperation {
    return {
        name: `probe_${corpsId}_t${turn}`,
        type: 'probe',
        phase: 'planning',
        started_turn: turn,
        phase_started_turn: turn,
        participating_brigades: [brigadeId],
        planning_duration: 0,
        supply_readiness: 1.0,
        momentum: 0,
        failure_count: 0,
        consecutive_failures_on_current: 0,
        attack_attempt_count: 0,
        objective_capture_count: 0,
        movement_only_execution_turns: 0,
        idle_execution_turn_streak: 0,
    };
}
