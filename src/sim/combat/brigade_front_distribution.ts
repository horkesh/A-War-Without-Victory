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

import type { CorpsFrontSector, CorpsCommandState, FactionId, FormationState, GameState, SettlementId } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { bfsDistance } from './sector_utils.js';

// ── Corps boundary helpers ─────────────────────────────────────────────────────

/**
 * Build the set of OSIDs that belong to a given corps, derived from
 * `state.military.corps_front_sectors`. Includes all territory_osids and
 * sub_segment friendly_osids for every sector owned by this corps.
 *
 * Returns an empty set (not undefined) when the corps has no sectors, so
 * callers can detect the "no sectors" case and fall back to faction-wide BFS.
 */
function getCorpsAllowedOsids(corpsId: string, state: GameState): Set<string> {
    const allowed = new Set<string>();
    for (const sector of Object.values(state.military.corps_front_sectors ?? {})) {
        if (sector.corps_id !== corpsId) continue;
        for (const osid of sector.territory_osids ?? []) allowed.add(osid);
        for (const seg of sector.sub_segments ?? []) {
            for (const osid of seg.friendly_osids ?? []) allowed.add(osid);
        }
    }
    return allowed;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Max hops before we skip redistribution (brigade too far, will be reassigned). */
const MAX_REDISTRIBUTION_DISTANCE = 20;

/**
 * Weight applied to BFS distance in Phase B target scoring.
 * Score = stack_count + PHASE_B_DISTANCE_WEIGHT × distance.
 * At 0.3, a 7-hop march to an empty OSID costs the same as a 2-hop march to a position
 * with 1 brigade — keeping brigades near their current front instead of chasing distant vacancies.
 */
const PHASE_B_DISTANCE_WEIGHT = 0.3;

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
        const ops = (f as unknown as Partial<CorpsCommandState>).active_operations;
        if (!ops) continue;
        for (const op of ops) {
            if (op.participating_brigades) for (const bid of op.participating_brigades) participants.add(bid);
        }
    }
    return participants;
}

/**
 * Pick the best target front OSID for a rear brigade.
 *
 * When distToTarget is provided (Phase B), scoring is:
 *   effective_cost = stack_count + PHASE_B_DISTANCE_WEIGHT × distance
 * This keeps brigades near their current position instead of chasing distant vacancies.
 *
 * Without distToTarget (Phase A adjacency checks), falls back to pure stack count.
 *
 * Tie-break: home_osid match → deterministic sort.
 */
function pickLeastStackedTarget(
    frontOsids: string[],
    osidCount: Map<string, number>,
    homeOsid: string | undefined,
    distToTarget?: Map<string, number>,
): string {
    const effectiveCost = (osid: string): number => {
        const count = osidCount.get(osid) ?? 0;
        const dist = distToTarget?.get(osid) ?? 0;
        return count + PHASE_B_DISTANCE_WEIGHT * dist;
    };

    let bestOsid = frontOsids[0]!;
    let bestCost = effectiveCost(bestOsid);
    let bestIsHome = bestOsid === homeOsid;

    for (let i = 1; i < frontOsids.length; i++) {
        const osid = frontOsids[i]!;
        const cost = effectiveCost(osid);
        const isHome = osid === homeOsid;

        if (
            cost < bestCost ||
            (cost === bestCost && isHome && !bestIsHome) ||
            (cost === bestCost && isHome === bestIsHome && strictCompare(osid, bestOsid) < 0)
        ) {
            bestOsid = osid;
            bestCost = cost;
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

    // Build friendly OSID sets per faction (BFS should not path through enemy territory)
    const friendlyByFaction = new Map<FactionId, Set<string>>();
    const pc = state.political?.political_controllers ?? {};
    for (const [osid, controller] of Object.entries(pc)) {
        if (!controller) continue;
        let s = friendlyByFaction.get(controller as FactionId);
        if (!s) { s = new Set<string>(); friendlyByFaction.set(controller as FactionId, s); }
        s.add(osid);
    }

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

                // Corps boundary guard: restrict BFS traversal and target pool to
                // OSIDs within this brigade's own corps territory. Falls back to
                // faction-wide set when the brigade has no corps or corps has no sectors.
                const corpsId = f.corps_id;
                const corpsAllowed = corpsId ? getCorpsAllowedOsids(corpsId, state) : new Set<string>();
                const useCorpsBoundary = corpsAllowed.size > 0;

                // Filter front OSIDs to only those reachable within corps territory
                const candidateFrontOsids = useCorpsBoundary
                    ? sortedFrontOsids.filter(o => corpsAllowed.has(o))
                    : sortedFrontOsids;
                // If all targets are outside corps territory, fall back to full set
                const effectiveFrontOsids = candidateFrontOsids.length > 0 ? candidateFrontOsids : sortedFrontOsids;

                // BFS friendly set: intersect with corps boundary when available
                const factionFriendly = friendlyByFaction.get(sector.faction);
                const bfsFriendly = (useCorpsBoundary && factionFriendly)
                    ? new Set([...factionFriendly].filter(o => corpsAllowed.has(o)))
                    : factionFriendly;

                // Pre-compute distances to all candidates so target selection is distance-aware
                const distToTarget = new Map<string, number>();
                for (const osid of effectiveFrontOsids) {
                    distToTarget.set(osid, bfsDistance(loc, osid, adjacency, bfsFriendly));
                }

                // Pick distance-weighted least-cost target (score = stack_count + weight × dist)
                const target = pickLeastStackedTarget(effectiveFrontOsids, osidCount, f.home_osid, distToTarget);

                // Use pre-computed distance for march decision
                const dist = distToTarget.get(target) ?? Infinity;

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
