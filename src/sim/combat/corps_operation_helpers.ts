import type { CorpsCommandState, CorpsOperation } from '../../state/game_state.js';

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
