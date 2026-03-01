/**
 * Phase II: Apply movement orders respecting ZoC (HoI OSID model).
 *
 * Valid moves: (a) stay; (b) move to friendly OSID not in enemy ZoC; (c) move into enemy OSID = attack (adjacent only).
 * When ZoC-locked: only stay, retreat (to non–enemy-ZoC friendly), or attack ZoC source.
 * On move: update location_osid, reset entrenchment_turns, set movement_state deployed.
 * Each turn: decrement disrupted_turns; increment entrenchment_turns for deployed brigades that did not move.
 *
 * Linked ZoC enforcement: movement into an enemy faction's linked ZoC is blocked.
 * Linked ZoC = ZoC OSIDs that connect two or more enemy brigades through a chain.
 * The enemy cannot slip through the gap between linked brigades.
 * Movement into linked ZoC is only allowed as an ATTACK (into enemy-controlled territory).
 *
 * Determinism: process formations in sorted ID order; no randomness.
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { FactionId, FormationId, GameState } from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { buildOsidAdjacency, type Osid } from './osid_adjacency.js';

export interface ZocConstrainedMovementReport {
    moves_applied: number;
    moves_blocked_by_linked_zoc: number;
    entrenchment_incremented: number;
    disrupted_decremented: number;
}

/**
 * Apply ZoC-constrained movement and update entrenchment/disrupted state.
 * When operational data (edges + reverseMap) is missing, skips movement and only runs entrenchment/disrupted bookkeeping.
 * Mutates state: formations (location_osid, entrenchment_turns), brigade_movement_state, brigade_movement_orders.
 *
 * linkedZocByFaction: optional map of faction → set of linked ZoC OSIDs that faction projects.
 * When present, a brigade of faction X cannot move into an OSID that is in the linked ZoC
 * of any enemy faction UNLESS the destination is enemy-controlled (attack intent).
 */
export function applyZocConstrainedMovement(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap,
    linkedZocByFaction?: Map<FactionId, Set<Osid>>
): ZocConstrainedMovementReport {
    const report: ZocConstrainedMovementReport = { moves_applied: 0, moves_blocked_by_linked_zoc: 0, entrenchment_incremented: 0, disrupted_decremented: 0 };
    const formations = state.formations ?? {};
    const adjacency = buildOsidAdjacency(edges);
    const movementOrders = state.brigade_movement_orders ?? {};
    const formationIds = Object.keys(formations).filter(id => {
        const f = formations[id];
        return f?.status === 'active' && (f as { location_osid?: string }).location_osid != null && (f.kind === 'brigade' || f.kind === 'og' || f.kind === 'operational_group');
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
        const factionId = f.faction as FactionId;
        const neighbors = adjacency.get(loc) ?? [];

        const canMove = Boolean(
            destOsid && destOsid !== loc && neighbors.includes(destOsid) && (() => {
                const controller = getPoliticalControllerOSID(state, destOsid, reverseMap);
                if (controller === null) return false; // Uncontrolled — can't move there

                // Linked ZoC check: block movement into enemy's linked ZoC
                // Exception: allow movement into enemy-controlled territory (= attack intent)
                if (linkedZocByFaction && controller === factionId) {
                    // Moving into friendly territory — check if blocked by enemy linked ZoC
                    for (const [enemyFid, linkedSet] of linkedZocByFaction) {
                        if (enemyFid === factionId) continue; // Our own linked ZoC doesn't block us
                        if (linkedSet.has(destOsid)) {
                            report.moves_blocked_by_linked_zoc += 1;
                            return false; // Blocked by enemy linked ZoC
                        }
                    }
                }

                return true; // Friendly move (no linked ZoC block) or attack move
            })()
        );

        if (canMove && destOsid) {
            (f as { location_osid?: string }).location_osid = destOsid;
            (f as { entrenchment_turns?: number }).entrenchment_turns = 0;
            if (state.brigade_movement_state) {
                const m = state.brigade_movement_state[formationId];
                if (m) m.status = 'deployed';
            }
            report.moves_applied += 1;
        } else {
            const et = (f as { entrenchment_turns?: number }).entrenchment_turns ?? 0;
            (f as { entrenchment_turns?: number }).entrenchment_turns = Math.min(12, et + 1);
            report.entrenchment_incremented += 1;
        }
    }

    state.brigade_movement_orders = undefined;
    return report;
}
