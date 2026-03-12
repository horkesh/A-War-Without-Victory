/**
 * Invariant assertion: every political control flip during a turn must produce
 * a corresponding control_event entry. Assertion-only — never throws, never
 * modifies state. Logs violations via console.error.
 */

import { strictCompare } from '../../state/validateGameState.js';
import type { GameState } from '../../state/game_state.js';

/**
 * Snapshot political_controllers at turn start. Returns a shallow copy.
 * Call this at the beginning of the turn pipeline.
 */
export function snapshotPoliticalControllers(state: GameState): Record<string, string | null> {
    return { ...(state.political?.political_controllers ?? {}) };
}

/**
 * Assert that every OSID whose controller changed since the snapshot has
 * a corresponding control_event for this turn. Logs violations.
 */
export function assertControlEventConsistency(
    state: GameState,
    turnStartSnapshot: Record<string, string | null>,
): void {
    const pc = state.political?.political_controllers ?? {};
    const turn = state.meta?.turn ?? 0;

    // Collect this turn's control events by OSID (settlement_id)
    const events = state.political?.control_events ?? [];
    const thisTurnEventOsids = new Set<string>();
    for (const evt of events) {
        if (evt.turn === turn) thisTurnEventOsids.add(evt.settlement_id);
    }

    const violations: string[] = [];

    // Check OSIDs that changed controller
    for (const osid of Object.keys(pc).sort(strictCompare)) {
        const prev = turnStartSnapshot[osid];
        const curr = pc[osid];
        if (prev !== curr && !thisTurnEventOsids.has(osid)) {
            violations.push(`${osid}: ${prev ?? 'null'} → ${curr} (no control_event for turn ${turn})`);
        }
    }

    // Check OSIDs that were in snapshot but removed from pc
    for (const osid of Object.keys(turnStartSnapshot).sort(strictCompare)) {
        if (!(osid in pc) && !thisTurnEventOsids.has(osid)) {
            violations.push(`${osid}: ${turnStartSnapshot[osid]} → removed (no control_event for turn ${turn})`);
        }
    }

    if (violations.length > 0) {
        console.error(`CONTROL EVENT CONSISTENCY VIOLATION (${violations.length} flips without events):\n  ${violations.join('\n  ')}`);
    }
}
