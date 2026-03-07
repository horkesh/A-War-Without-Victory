/**
 * Consolidate rear pockets: auto-flip enemy OSIDs that are completely
 * surrounded by a single faction with no enemy brigade present.
 *
 * These represent territory that no faction is actively defending —
 * the surrounding faction naturally absorbs them without combat.
 * Runs after attack resolution and displacement, before post-combat steps.
 *
 * Deterministic: iterates sorted OSID keys, stable tie-break.
 */

import type { FactionId, GameState } from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { buildOsidAdjacency, type Osid } from './osid_adjacency.js';
import type { EdgeRecord } from '../../map/settlements.js';
import { strictCompare } from '../../state/validateGameState.js';

export interface RearPocketConsolidationReport {
    flipped: Array<{ osid: string; from: string; to: string }>;
}

/**
 * For each OSID controlled by faction X where ALL neighbors are controlled
 * by faction Y and no faction-X brigade is present, flip control to Y.
 *
 * Caps flips per turn to avoid cascading chain reactions.
 */
const MAX_FLIPS_PER_TURN = 8;

export function consolidateRearPockets(
    state: GameState,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap
): RearPocketConsolidationReport {
    const report: RearPocketConsolidationReport = { flipped: [] };
    const adjacency = buildOsidAdjacency(edges);
    const pc = state.political_controllers ?? {};
    const formations = state.formations ?? {};

    // Build set of OSIDs with active brigades by faction
    const brigadeLocs = new Map<string, Set<string>>(); // osid → set of factions with brigades there
    for (const f of Object.values(formations)) {
        if (!f || f.status !== 'active') continue;
        const loc = (f as { location_osid?: string }).location_osid;
        if (!loc) continue;
        const factionSet = brigadeLocs.get(loc) ?? new Set();
        factionSet.add(f.faction as string);
        brigadeLocs.set(loc, factionSet);
    }

    // Collect candidate pockets: sorted for determinism
    const candidates: Array<{ osid: string; from: string; to: string }> = [];

    const sortedOsids = [...adjacency.keys()].sort(strictCompare);
    for (const osid of sortedOsids) {
        const controller = getPoliticalControllerOSID(state, osid, reverseMap);
        if (!controller) continue;

        const neighbors = adjacency.get(osid) ?? [];
        if (neighbors.length === 0) continue;

        // Check if all neighbors are controlled by a single OTHER faction
        let surroundingFaction: string | null = null;
        let allSame = true;
        for (const n of neighbors) {
            const nc = getPoliticalControllerOSID(state, n, reverseMap);
            if (!nc || nc === controller) { allSame = false; break; }
            if (surroundingFaction === null) {
                surroundingFaction = nc;
            } else if (nc !== surroundingFaction) {
                allSame = false; break;
            }
        }
        if (!allSame || !surroundingFaction) continue;

        // Verify no defending brigade is present
        const factionsAtOsid = brigadeLocs.get(osid);
        if (factionsAtOsid?.has(controller)) continue;

        candidates.push({ osid, from: controller, to: surroundingFaction });
    }

    // Apply flips (capped)
    for (const c of candidates) {
        if (report.flipped.length >= MAX_FLIPS_PER_TURN) break;
        pc[c.osid] = c.to as FactionId;
        report.flipped.push(c);
    }

    return report;
}
