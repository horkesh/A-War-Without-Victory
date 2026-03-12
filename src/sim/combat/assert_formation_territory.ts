/**
 * Invariant assertion: active brigades must be in friendly territory.
 *
 * Every active brigade with a location_osid must be at an OSID controlled
 * by its own faction or a friendly faction (RBiH↔HRHB when allied).
 *
 * Exceptions:
 *   - Formations with no location_osid (HQ, undeployed)
 *   - Non-brigade/og formations (corps HQ, etc.)
 *   - Formations in column transit (being redeployed)
 *
 * Assertion-only — never throws, never modifies state. Logs violations via console.error.
 */

import type { GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { isFriendlyFaction } from '../early_war/alliance_update.js';

/**
 * Assert all active brigades are in friendly-controlled territory.
 */
export function assertFormationsInFriendlyTerritory(state: GameState): void {
    const pc = state.political.political_controllers ?? {};
    const formations = state.military.formations ?? {};
    const violations: string[] = [];

    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const f = formations[fid]!;
        if (f.status !== 'active') continue;
        if (!f.location_osid) continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;

        const controller = pc[f.location_osid];
        // null controller = unclaimed territory, acceptable during early war
        if (controller === null || controller === undefined) continue;
        if (!isFriendlyFaction(controller, f.faction, state)) {
            violations.push(
                `${fid} (${f.faction}) at ${f.location_osid} controlled by ${controller}`
            );
        }
    }

    if (violations.length > 0) {
        console.error(
            `FORMATION IN ENEMY TERRITORY (${violations.length} violations):\n  ${violations.join('\n  ')}`
        );
    }
}
