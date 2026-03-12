/**
 * Invariant assertion: operation lifecycle consistency.
 *
 * 1. participating_brigades must all be active formations.
 * 2. Operations in 'execution' phase must have at least one active participant.
 *
 * Assertion-only — never throws, never modifies state. Logs violations via console.error.
 */

import type { GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';

/**
 * Assert that all active operations reference only active formations
 * and have at least one participant in execution phase.
 */
export function assertOperationLifecycle(state: GameState): void {
    const corpsCmd = state.military.corps_command;
    if (!corpsCmd) return;

    const formations = state.military.formations ?? {};
    const violations: string[] = [];

    for (const cid of Object.keys(corpsCmd).sort(strictCompare)) {
        const cmd = corpsCmd[cid]!;
        const op = cmd.active_operation;
        if (!op) continue;

        const participants = op.participating_brigades ?? [];
        let activeCount = 0;

        for (const bid of participants) {
            const f = formations[bid];
            if (!f) {
                violations.push(
                    `${cid} op '${op.name}': participant ${bid} not found in formations`
                );
            } else if (f.status !== 'active') {
                violations.push(
                    `${cid} op '${op.name}': participant ${bid} has status='${f.status}'`
                );
            } else {
                activeCount++;
            }
        }

        // Execution-phase operations with zero active participants are stale
        if (op.phase === 'execution' && activeCount === 0 && participants.length > 0) {
            violations.push(
                `${cid} op '${op.name}': execution phase with 0/${participants.length} active participants`
            );
        }
    }

    if (violations.length > 0) {
        console.error(
            `OPERATION LIFECYCLE VIOLATION (${violations.length} issues):\n  ${violations.join('\n  ')}`
        );
    }
}
