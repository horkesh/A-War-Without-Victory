/**
 * Canonical executed-attack count of a corps operation, read from its lifecycle
 * counters: the axis sum when any axis carries a counter, else the op-level
 * counter. Type-only imports keep this leaf importable from the event layer
 * without pulling the combat module graph into it.
 */

import type { CorpsOperation } from '../../state/game_state.js';

/** Recorded attack count, or undefined when the op carries no counter at all. */
export function recordedOperationAttackCount(op: CorpsOperation): number | undefined {
    if (op.axes && op.axes.length > 0) {
        let total = 0;
        let hasAxisCounter = false;
        for (const axis of op.axes) {
            if (typeof axis.attack_attempt_count === 'number') {
                total += axis.attack_attempt_count;
                hasAxisCounter = true;
            }
        }
        if (hasAxisCounter) return total;
    }
    if (typeof op.attack_attempt_count === 'number') return op.attack_attempt_count;
    return undefined;
}

/** Executed attacks on an op (0 when none recorded). */
export function operationExecutedAttackCount(op: CorpsOperation): number {
    return recordedOperationAttackCount(op) ?? 0;
}
