/**
 * War phase: Apply brigade movement orders (OSID model).
 *
 * Valid moves: (a) stay; (b) move to adjacent OSID with a controller.
 * On move: update location_osid, reset entrenchment_turns, set movement_state deployed.
 * Each turn: decrement disrupted_turns; increment entrenchment_turns for deployed brigades that did not move.
 *
 * Determinism: process formations in sorted ID order; no randomness.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { FormationId, GameState } from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { isFriendlyFaction } from '../early_war/alliance_update.js';
import { buildOsidAdjacency, type Osid } from './osid_adjacency.js';

export interface BrigadeMovementReport {
    moves_applied: number;
    entrenchment_incremented: number;
    disrupted_decremented: number;
}

/**
 * Apply movement orders and update entrenchment/disrupted state.
 * Mutates state: formations (location_osid, entrenchment_turns), brigade_movement_state, brigade_movement_orders.
 */
export function applyBrigadeMovementOrders(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap,
): BrigadeMovementReport {
    const report: BrigadeMovementReport = { moves_applied: 0, entrenchment_incremented: 0, disrupted_decremented: 0 };
    const formations = state.military.formations ?? {};
    const adjacency = buildOsidAdjacency(edges);
    const movementOrders = state.military.brigade_movement_orders ?? {};
    const formationIds = Object.keys(formations).filter(id => {
        const f = formations[id];
        return f?.status === 'active' && (f as { location_osid?: string }).location_osid != null && (f.kind === 'brigade' || f.kind === 'og' || f.kind === 'operational_group' || f.kind === 'jna_phantom');
    }).sort(strictCompare) as FormationId[];

    for (const formationId of formationIds) {
        const f = formations[formationId]!;
        const loc = (f as { location_osid?: string }).location_osid as Osid | undefined;
        if (!loc) continue;

        const disruptedTurns = (f as { disrupted_turns?: number }).disrupted_turns ?? 0;
        if (disruptedTurns > 0) {
            (f as { disrupted_turns?: number }).disrupted_turns = disruptedTurns - 1;
            report.disrupted_decremented += 1;
        }

        const order = movementOrders[formationId] as { destination_sids?: string[] } | undefined;
        const destOsid = order?.destination_sids?.[0] as Osid | undefined;
        const neighbors = adjacency.get(loc) ?? [];

        const factionId = (f as { faction?: string }).faction;
        const destController = destOsid ? getPoliticalControllerOSID(state, destOsid, reverseMap) : null;
        const canMove = Boolean(
            destOsid && destOsid !== loc && neighbors.includes(destOsid) && factionId
            && (isFriendlyFaction(destController, factionId, state) || destController === null)
        );

        if (canMove && destOsid) {
            (f as { location_osid?: string }).location_osid = destOsid;
            (f as { entrenchment_turns?: number }).entrenchment_turns = 0;
            if (state.military.brigade_movement_state) {
                const m = state.military.brigade_movement_state[formationId];
                if (m) m.status = 'deployed';
            }
            report.moves_applied += 1;
        } else {
            const et = (f as { entrenchment_turns?: number }).entrenchment_turns ?? 0;
            (f as { entrenchment_turns?: number }).entrenchment_turns = Math.min(12, et + 1);
            report.entrenchment_incremented += 1;
        }
    }

    state.military.brigade_movement_orders = undefined;
    return report;
}
