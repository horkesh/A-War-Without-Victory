/**
 * Brigade front distribution — spreads brigades across sector sub-segment front OSIDs.
 *
 * Problem: Brigades get assigned to sector sub-segments (paper assignment), but no code
 * physically distributes them across the sub-segment's friendly_osids. This causes:
 *   1. Stacking: 2-6 brigades at the same OSID instead of spreading across front
 *   2. Far from front: brigades sitting many hops behind their assigned sector front
 *
 * Algorithm:
 *   Phase A: Redistribute stacked brigades to adjacent empty front OSIDs
 *   Phase B: Issue column march for brigades NOT at any front OSID
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random(), no timestamps.
 */

import type { CorpsFrontSector, CorpsCommandState, FormationState, GameState, SettlementId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { bfsDistance } from './sector_utils.js';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Max hops before we skip redistribution (brigade too far, will be reassigned). */
const MAX_REDISTRIBUTION_DISTANCE = 8;

/** Brigades with this many entrenchment turns or more are NOT redistributed in Phase A.
 *  Only freshly-arrived brigades get spread — entrenched positions are too valuable to abandon. */
const ENTRENCHMENT_REDISTRIBUTION_THRESHOLD = 1;

/** Corps IDs exempt from redistribution (siege sectors with legitimate stacking). */
const SIEGE_EXEMPT_CORPS = new Set(['arbih_1st_corps', 'vrs_sarajevo_romanija']);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Pre-compute the set of all brigade IDs currently participating in active operations.
 * O(formations) once, then O(1) lookup per brigade — avoids O(brigades × formations) per-sector.
 */
function buildOperationParticipantSet(state: GameState): Set<string> {
    const participants = new Set<string>();
    const formations = state.military.formations ?? {};
    for (const fid of Object.keys(formations)) {
        const f = formations[fid]!;
        if (f.kind !== 'corps_asset') continue;
        const op = (f as unknown as Partial<CorpsCommandState>).active_operation;
        if (!op) continue;
        if (op.participating_brigades) for (const bid of op.participating_brigades) participants.add(bid);
    }
    return participants;
}

/**
 * Pick the best target front OSID for a rear brigade.
 * Prefers: least-stacked OSID → home_osid match → deterministic sort.
 */
function pickLeastStackedTarget(
    frontOsids: string[],
    osidCount: Map<string, number>,
    homeOsid: string | undefined,
): string {
    let bestOsid = frontOsids[0]!;
    let bestCount = osidCount.get(bestOsid) ?? 0;
    let bestIsHome = bestOsid === homeOsid;

    for (let i = 1; i < frontOsids.length; i++) {
        const osid = frontOsids[i]!;
        const count = osidCount.get(osid) ?? 0;
        const isHome = osid === homeOsid;

        if (
            count < bestCount ||
            (count === bestCount && isHome && !bestIsHome) ||
            (count === bestCount && isHome === bestIsHome && strictCompare(osid, bestOsid) < 0)
        ) {
            bestOsid = osid;
            bestCount = count;
            bestIsHome = isHome;
        }
    }

    return bestOsid;
}

/**
 * Check if a brigade's home_osid is an empty adjacent front OSID from its current location.
 * Used to prioritize brigades that want to "go home" during redistribution.
 */
function hasEmptyHomeNeighbor(
    f: FormationState | undefined,
    adjacency: Map<string, string[]>,
    frontOsidSet: Set<string>,
    osidCount: Map<string, number>,
): boolean {
    const loc = f?.location_osid;
    const home = f?.home_osid;
    if (!loc || !home || !frontOsidSet.has(home)) return false;
    if ((osidCount.get(home) ?? 0) > 0) return false; // home not empty
    const neighbors = adjacency.get(loc) ?? [];
    return neighbors.includes(home);
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Distribute brigades across sector front OSIDs to reduce stacking and bring
 * rear brigades forward.
 *
 * Mutates state.military.formations (location_osid, entrenchment_turns) and
 * state.military.brigade_movement_orders.
 */
export function distributeBrigadesToFront(
    state: GameState,
    sectors: CorpsFrontSector[],
    adjacency: Map<string, string[]>,
): void {
    const formations = state.military.formations ?? {};
    const opParticipants = buildOperationParticipantSet(state);

    for (const sector of sectors) {
        // Skip sectors with no sub-segments
        if (!sector.sub_segments || sector.sub_segments.length === 0) continue;

        // Skip besieged siege sectors
        if (SIEGE_EXEMPT_CORPS.has(sector.corps_id)) continue;

        for (const subSeg of sector.sub_segments) {
            const frontOsids = subSeg.friendly_osids;
            if (frontOsids.length <= 1) continue; // Can't spread with 1 OSID

            // Collect eligible brigades from this sub-segment
            const eligibleBrigadeIds: string[] = [];
            for (const bid of [...subSeg.primary_brigade_ids].sort(strictCompare)) {
                const f = formations[bid];
                if (!f) continue;
                if (f.status === 'inactive') continue;
                if ((f.disrupted_turns ?? 0) > 0) continue;
                if (opParticipants.has(bid)) continue;
                eligibleBrigadeIds.push(bid);
            }

            if (eligibleBrigadeIds.length === 0) continue;

            // Build stacking map: count eligible brigades per OSID
            const osidCount = new Map<string, number>();
            for (const osid of frontOsids) {
                osidCount.set(osid, 0);
            }
            for (const bid of eligibleBrigadeIds) {
                const loc = formations[bid]?.location_osid;
                if (loc && osidCount.has(loc)) {
                    osidCount.set(loc, (osidCount.get(loc) ?? 0) + 1);
                }
            }

            // Also count non-eligible brigades at front OSIDs for accurate stacking
            for (const bid of [...subSeg.primary_brigade_ids].sort(strictCompare)) {
                if (eligibleBrigadeIds.includes(bid)) continue;
                const f = formations[bid];
                if (!f) continue;
                const loc = f.location_osid;
                if (loc && osidCount.has(loc)) {
                    osidCount.set(loc, (osidCount.get(loc) ?? 0) + 1);
                }
            }

            const frontOsidSet = new Set(frontOsids);
            const sortedFrontOsids = [...frontOsids].sort(strictCompare);

            // ── Phase A: Redistribute stacked brigades to adjacent empty front OSIDs ──
            // Sort brigades: those with home_osid matching an empty adjacent front OSID go first
            // (they're motivated to move to their home). Deterministic tie-break by ID.
            const phaseABrigades = eligibleBrigadeIds
                .filter(bid => {
                    const f = formations[bid];
                    const loc = f?.location_osid;
                    if (!loc || !frontOsidSet.has(loc)) return false;
                    if ((osidCount.get(loc) ?? 0) < 2) return false;
                    // Don't uproot entrenched brigades — only redistribute fresh arrivals
                    if ((f.entrenchment_turns ?? 0) >= ENTRENCHMENT_REDISTRIBUTION_THRESHOLD) return false;
                    return true;
                })
                .sort((a, b) => {
                    const fA = formations[a];
                    const fB = formations[b];
                    const aHasHomeTarget = hasEmptyHomeNeighbor(fA, adjacency, frontOsidSet, osidCount);
                    const bHasHomeTarget = hasEmptyHomeNeighbor(fB, adjacency, frontOsidSet, osidCount);
                    if (aHasHomeTarget && !bHasHomeTarget) return -1;
                    if (!aHasHomeTarget && bHasHomeTarget) return 1;
                    return strictCompare(a, b);
                });

            for (const bid of phaseABrigades) {
                const f = formations[bid]!;
                const loc = f.location_osid;
                if (!loc) continue;
                if ((osidCount.get(loc) ?? 0) < 2) continue; // No longer stacked (earlier move resolved it)

                // Find adjacent empty front OSID
                const neighbors = adjacency.get(loc) ?? [];
                const homeOsid = f.home_osid;
                const candidates = neighbors
                    .filter(n => frontOsidSet.has(n) && (osidCount.get(n) ?? 0) === 0)
                    .sort((a, b) => {
                        const aHome = a === homeOsid ? 0 : 1;
                        const bHome = b === homeOsid ? 0 : 1;
                        if (aHome !== bHome) return aHome - bHome;
                        return strictCompare(a, b);
                    });

                if (candidates.length === 0) continue;

                const target = candidates[0]!;
                // Move brigade
                f.location_osid = target;
                f.entrenchment_turns = 0;
                // Update stacking counts
                osidCount.set(loc, (osidCount.get(loc) ?? 0) - 1);
                osidCount.set(target, (osidCount.get(target) ?? 0) + 1);
            }

            // ── Phase B: Issue column march for brigades NOT at any front OSID ──
            for (const bid of eligibleBrigadeIds) {
                const f = formations[bid]!;
                const loc = f.location_osid;
                if (!loc) continue;
                if (frontOsidSet.has(loc)) continue; // Already at front

                // Pick least-stacked front OSID, tie-break by home match then deterministic
                const target = pickLeastStackedTarget(sortedFrontOsids, osidCount, f.home_osid);

                // Compute distance
                const dist = bfsDistance(loc, target, adjacency);

                if (dist === 1) {
                    // Adjacent: move directly
                    f.location_osid = target;
                    f.entrenchment_turns = 0;
                    osidCount.set(target, (osidCount.get(target) ?? 0) + 1);
                } else if (dist > 1 && dist <= MAX_REDISTRIBUTION_DISTANCE) {
                    // Issue column march order
                    if (!state.military.brigade_movement_orders) {
                        state.military.brigade_movement_orders = {};
                    }
                    state.military.brigade_movement_orders![bid] = {
                        destination_sids: [target as SettlementId],
                        stance: 'column',
                    } as { destination_sids: SettlementId[] };
                }
                // If dist > MAX_REDISTRIBUTION_DISTANCE or Infinity: skip
            }
        }
    }
}
