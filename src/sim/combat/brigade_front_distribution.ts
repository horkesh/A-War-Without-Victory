/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Repair
 * DOMAIN:    Front distribution — unstacking and march-to-front repair
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   Whether brigades are stacked or far from front, and how to spread them
 * WRITES:    location_osid (Phase A: unstack to adjacent empty front OSID),
 *            brigade_movement_orders (Phase B: column march for brigades not at any front OSID)
 * READS:     sector sub_segments, brigade locations, stacking state
 * MUST NOT:  override sector assignment — only spread brigades within their already-assigned sector
 *
 * UPSTREAM:  sector system (sub_segment assignments), T1 sector assignment (authoritative)
 * DOWNSTREAM: osid_column_movement.ts (executes Phase B column march)
 *
 * TRUTH INVARIANTS:
 * - Unresolved-is-honest (Codex principle #6) — never force-assigns cross-component
 * - Does not reassign brigades between sectors; only redistributes within assigned sector
 * - Deterministic: sorted iteration via strictCompare, no Math.random(), no timestamps
 *
 * MOVEMENT TIER: T6 — Repair (Front Distribution) (see MOVEMENT_AUTHORITY.md)
 * ═══════════════════════════════════════════════════════════════
 */

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

import type { CorpsFrontSector, CorpsCommandState, FactionId, FormationState, GameState, OperationAxis } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { bfsDistance } from './sector_utils.js';
import { createColumnMovementOrder } from './brigade_movement_order_helpers.js';
import { ENABLE_STANDING_OG_RESERVE_COMMIT } from './standing_og_defense.js';

type CorpsAssetFormationState = FormationState & {
    active_operations?: CorpsCommandState['active_operations'];
};

interface FrontDistributionOptions {
    rearDirectRepairMaxHops?: number;
    frontGapRepairMaxHops?: number;
    enableStandingOgReserveCommit?: boolean;
}

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
 * At 0.3, a 7-hop march to an empty OSID (cost 2.1) ties a 2-hop march to a position
 * with 1 brigade (cost 1.6) — modest locality bias without over-pinning brigades in place.
 * Higher values (tested: 1.0) produce wrong-direction battles and net calibration regression.
 */
const PHASE_B_DISTANCE_WEIGHT = 0.3;

/** Brigades with this many entrenchment turns or more are NOT redistributed in Phase A.
 *  Only freshly-arrived brigades get spread — entrenched positions are too valuable to abandon. */
const ENTRENCHMENT_REDISTRIBUTION_THRESHOLD = 1;

/** Corps IDs whose siege sectors may legitimately keep dense front stacks. */
const SIEGE_EXEMPT_CORPS = new Set(['arbih_1st_corps', 'vrs_sarajevo_romanija']);

function isSarajevoSiegeSector(sector: CorpsFrontSector): boolean {
    if (!SIEGE_EXEMPT_CORPS.has(sector.corps_id)) return false;
    return (sector.sub_segments ?? []).some((subSegment) =>
        (subSegment.friendly_osids ?? []).some((osid) => osid.includes('sarajevo_dio'))
        || (subSegment.enemy_osids ?? []).some((osid) => osid.includes('sarajevo_dio'))
    );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Pre-compute the set of all brigade IDs currently participating in active operations.
 * O(formations) once, then O(1) lookup per brigade — avoids O(brigades × formations) per-sector.
 */
function buildOperationParticipantSet(state: GameState): Set<string> {
    const participants = new Set<string>();
    const formations: Record<string, CorpsAssetFormationState> = state.military.formations ?? {};
    for (const fid of Object.keys(formations)) {
        const f = formations[fid];
        if (!f) continue;
        if (f.kind !== 'corps_asset') continue;
        const ops = f.active_operations;
        if (!ops) continue;
        for (const op of ops) {
            if (op.axes) {
                for (const axis of op.axes as OperationAxis[]) {
                    for (const bid of axis.assigned_brigades ?? []) participants.add(bid);
                }
            }
            if (op.participating_brigades) for (const bid of op.participating_brigades) participants.add(bid);
        }
    }
    const corpsCommand = state.military.corps_command ?? {};
    for (const cid of Object.keys(corpsCommand).sort(strictCompare)) {
        const command = corpsCommand[cid];
        for (const op of command?.active_operations ?? []) {
            if (op.axes) {
                for (const axis of op.axes as OperationAxis[]) {
                    for (const bid of axis.assigned_brigades ?? []) participants.add(bid);
                }
            }
            for (const bid of op.participating_brigades ?? []) participants.add(bid);
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
 * Tie-break: deterministic sort (strictCompare).
 */
function pickLeastStackedTarget(
    frontOsids: string[],
    osidCount: Map<string, number>,
    distToTarget?: Map<string, number>,
): string {
    const effectiveCost = (osid: string): number => {
        const count = osidCount.get(osid) ?? 0;
        const dist = distToTarget?.get(osid) ?? 0;
        return count + PHASE_B_DISTANCE_WEIGHT * dist;
    };

    let bestOsid = frontOsids[0]!;
    let bestCost = effectiveCost(bestOsid);

    for (let i = 1; i < frontOsids.length; i++) {
        const osid = frontOsids[i]!;
        const cost = effectiveCost(osid);

        if (
            cost < bestCost ||
            (cost === bestCost && strictCompare(osid, bestOsid) < 0)
        ) {
            bestOsid = osid;
            bestCost = cost;
        }
    }

    return bestOsid;
}

function countActiveBrigadesByOsid(formations: GameState['military']['formations']): Map<string, number> {
    const counts = new Map<string, number>();
    for (const f of Object.values(formations)) {
        if (!f || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        const loc = f.location_osid;
        if (!loc) continue;
        counts.set(loc, (counts.get(loc) ?? 0) + 1);
    }
    return counts;
}

function disperseStackedRearBrigadesForSector(
    state: GameState,
    sector: CorpsFrontSector,
    adjacency: Map<string, string[]>,
    friendlySet: Set<string> | undefined,
    opParticipants: Set<string>,
    options: FrontDistributionOptions = {},
): void {
    const formations = state.military.formations ?? {};
    const sectorTerritory = new Set(sector.territory_osids ?? []);
    if (sectorTerritory.size === 0) return;

    const frontOsids = new Set<string>();
    for (const subSegment of sector.sub_segments ?? []) {
        for (const osid of subSegment.friendly_osids ?? []) frontOsids.add(osid);
    }

    const targetPool = [...sectorTerritory]
        .filter(osid => !frontOsids.has(osid))
        .filter(osid => !friendlySet || friendlySet.has(osid))
        .sort(strictCompare);
    if (targetPool.length === 0) return;

    const rearOwned = new Set([
        ...(sector.assigned_brigade_ids ?? []),
        ...(sector.reserve_brigade_ids ?? []),
        ...(sector.rear_brigade_ids ?? []),
    ]);
    if (rearOwned.size < 2) return;

    const activeCounts = countActiveBrigadesByOsid(formations);
    const rearByOsid = new Map<string, string[]>();
    for (const bid of [...rearOwned].sort(strictCompare)) {
        const f = formations[bid];
        if (!f || f.status !== 'active' || !f.location_osid) continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (opParticipants.has(bid)) continue;
        if ((f.disrupted_turns ?? 0) > 0) continue;
        if (frontOsids.has(f.location_osid)) continue;
        const movementState = state.military.brigade_movement_state;
        if (movementState?.[bid]?.status === 'in_transit') continue;
        const list = rearByOsid.get(f.location_osid) ?? [];
        list.push(bid);
        rearByOsid.set(f.location_osid, list);
    }

    for (const osid of [...rearByOsid.keys()].sort(strictCompare)) {
        const candidates = (rearByOsid.get(osid) ?? []).sort(strictCompare);
        if ((activeCounts.get(osid) ?? 0) < 2 || candidates.length === 0) continue;

        // If only rear-owned brigades occupy the OSID, keep one local anchor in place.
        const nonRearOccupants = (activeCounts.get(osid) ?? 0) - candidates.length;
        const movable = nonRearOccupants > 0 ? candidates : candidates.slice(1);
        for (const bid of movable) {
            const f = formations[bid];
            if (!f?.location_osid) continue;

            const reachableTargets = targetPool
                .filter(target => (activeCounts.get(target) ?? 0) === 0)
                .map(target => ({
                    target,
                    dist: bfsDistance(f.location_osid as string, target, adjacency, friendlySet),
                }))
                .filter((entry) => Number.isFinite(entry.dist) && entry.dist <= MAX_REDISTRIBUTION_DISTANCE)
                .sort((a, b) => a.dist - b.dist || strictCompare(a.target, b.target));

            const best = reachableTargets[0];
            if (!best) continue;

            const directRepairMaxHops = options.rearDirectRepairMaxHops ?? 1;
            if (best.dist <= directRepairMaxHops) {
                f.location_osid = best.target;
                f.entrenchment_turns = 0;
                activeCounts.set(osid, Math.max(0, (activeCounts.get(osid) ?? 0) - 1));
                activeCounts.set(best.target, (activeCounts.get(best.target) ?? 0) + 1);
                continue;
            }

            if (!state.military.brigade_movement_orders) {
                state.military.brigade_movement_orders = {};
            }
            state.military.brigade_movement_orders[bid] = createColumnMovementOrder(best.target);
            activeCounts.set(best.target, (activeCounts.get(best.target) ?? 0) + 1);
        }
    }
}


// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Distribute brigades across sector front OSIDs to reduce stacking and bring
 * rear brigades forward.
 *
 * Mutates state.military.formations (location_osid, entrenchment_turns) and
 * state.military.brigade_movement_orders.
 */
function commitReserveToThreatenedFront(
    state: GameState,
    sector: CorpsFrontSector,
    adjacency: Map<string, string[]>,
    friendlySet: Set<string> | undefined,
    opParticipants: Set<string>,
    options: FrontDistributionOptions = {},
): void {
    if (!(options.enableStandingOgReserveCommit ?? ENABLE_STANDING_OG_RESERVE_COMMIT)) return;
    if ((sector.threat_ratio ?? 0) < 1.5) return;

    const formations = state.military.formations ?? {};
    const activeCounts = countActiveBrigadesByOsid(formations);
    const reserveCandidates = [
        ...(sector.reserve_brigade_ids ?? []),
        ...(sector.rear_brigade_ids ?? []),
    ].sort(strictCompare);
    if (reserveCandidates.length === 0) return;

    const targetSubSegment = [...(sector.sub_segments ?? [])]
        .filter((subSegment) => (subSegment.enemy_osids?.length ?? 0) > 0)
        .filter((subSegment) => (subSegment.friendly_osids?.length ?? 0) > 0)
        .sort((a, b) =>
            (b.enemy_osids?.length ?? 0) - (a.enemy_osids?.length ?? 0)
            || (b.length_edges ?? 0) - (a.length_edges ?? 0)
            || strictCompare(a.sub_segment_id, b.sub_segment_id)
        )[0];
    if (!targetSubSegment) return;

    const targetFrontOsids = [...new Set(targetSubSegment.friendly_osids ?? [])]
        .filter((target) => !friendlySet || friendlySet.has(target))
        .sort(strictCompare);
    if (targetFrontOsids.length === 0) return;

    const viable = reserveCandidates
        .map((bid) => ({ bid, formation: formations[bid] }))
        .filter((entry): entry is { bid: string; formation: FormationState } => !!entry.formation)
        .filter((entry) => entry.formation.status === 'active')
        .filter((entry) => entry.formation.kind === 'brigade' || entry.formation.kind === 'og' || entry.formation.kind === 'operational_group')
        .filter((entry) => !!entry.formation.location_osid)
        .filter((entry) => !opParticipants.has(entry.bid))
        .filter((entry) => (entry.formation.disrupted_turns ?? 0) === 0)
        .filter((entry) => !(state.military.brigade_movement_state?.[entry.bid]?.status === 'in_transit'))
        .filter((entry) => !state.military.brigade_movement_orders?.[entry.bid])
        .map((entry) => {
            const reachableTargets = targetFrontOsids
                .map((target) => ({
                    target,
                    dist: bfsDistance(entry.formation.location_osid as string, target, adjacency, friendlySet),
                    count: activeCounts.get(target) ?? 0,
                }))
                .filter((target) => Number.isFinite(target.dist) && target.dist <= MAX_REDISTRIBUTION_DISTANCE)
                .sort((a, b) =>
                    a.count - b.count
                    || a.dist - b.dist
                    || strictCompare(a.target, b.target)
                );
            const bestTarget = reachableTargets[0];
            return bestTarget ? {
                bid: entry.bid,
                formation: entry.formation,
                target: bestTarget.target,
                dist: bestTarget.dist,
                targetCount: bestTarget.count,
            } : null;
        })
        .filter((entry): entry is { bid: string; formation: FormationState; target: string; dist: number; targetCount: number } => entry != null)
        .sort((a, b) =>
            a.targetCount - b.targetCount
            || a.dist - b.dist
            || (b.formation.personnel ?? 0) - (a.formation.personnel ?? 0)
            || strictCompare(a.bid, b.bid)
        );

    const best = viable[0];
    if (!best) return;

    if (best.dist <= 1) {
        best.formation.location_osid = best.target;
        best.formation.entrenchment_turns = 0;
        activeCounts.set(best.target, (activeCounts.get(best.target) ?? 0) + 1);
        return;
    }

    if (!state.military.brigade_movement_orders) {
        state.military.brigade_movement_orders = {};
    }
    state.military.brigade_movement_orders[best.bid] = createColumnMovementOrder(best.target);
    activeCounts.set(best.target, (activeCounts.get(best.target) ?? 0) + 1);
}

function fillEmptyFrontSubsegmentsFromSectorReserve(
    state: GameState,
    sector: CorpsFrontSector,
    adjacency: Map<string, string[]>,
    friendlySet: Set<string> | undefined,
    opParticipants: Set<string>,
    options: FrontDistributionOptions = {},
): void {
    const formations = state.military.formations ?? {};
    const allFrontOsids = new Set<string>();
    for (const subSegment of sector.sub_segments ?? []) {
        for (const osid of subSegment.friendly_osids ?? []) allFrontOsids.add(osid);
    }
    const frontlineWidth = allFrontOsids.size;
    if (frontlineWidth === 0) return;

    const sectorPoolIds = new Set([
        ...(sector.assigned_brigade_ids ?? []),
        ...(sector.reserve_brigade_ids ?? []),
        ...(sector.rear_brigade_ids ?? []),
    ]);
    const activeSectorPoolCount = [...sectorPoolIds]
        .map((bid) => formations[bid])
        .filter((formation): formation is FormationState => !!formation)
        .filter((formation) => formation.status === 'active')
        .filter((formation) => formation.kind === 'brigade' || formation.kind === 'og' || formation.kind === 'operational_group')
        .filter((formation) => !!formation.location_osid)
        .length;
    if (activeSectorPoolCount === 0) return;

    const candidateIds = [...new Set([
        ...(sector.assigned_brigade_ids ?? []),
        ...(sector.reserve_brigade_ids ?? []),
        ...(sector.rear_brigade_ids ?? []),
    ])].sort(strictCompare);
    const used = new Set<string>();
    const activeCounts = countActiveBrigadesByOsid(formations);

    const underfilledSubSegments = [...(sector.sub_segments ?? [])]
        .filter((subSegment) => (subSegment.friendly_osids?.length ?? 0) > 0)
        .filter((subSegment) =>
            (subSegment.friendly_osids ?? []).some((target) => (activeCounts.get(target) ?? 0) === 0))
        .filter((subSegment) => {
            const primaryCount = subSegment.primary_brigade_ids?.length ?? 0;
            const frontWidth = subSegment.friendly_osids?.length ?? 0;
            return primaryCount === 0 || primaryCount < frontWidth;
        })
        .sort((a, b) => strictCompare(a.sub_segment_id, b.sub_segment_id));

    for (const subSegment of underfilledSubSegments) {
        const viable = candidateIds
            .filter((bid) => !used.has(bid))
            .map((bid) => ({ bid, formation: formations[bid] }))
            .filter((entry): entry is { bid: string; formation: FormationState } => !!entry.formation)
            .filter((entry) => entry.formation.status === 'active')
            .filter((entry) => entry.formation.kind === 'brigade' || entry.formation.kind === 'og' || entry.formation.kind === 'operational_group')
            .filter((entry) => !!entry.formation.location_osid)
            .filter((entry) => !allFrontOsids.has(entry.formation.location_osid!))
            .filter((entry) => !opParticipants.has(entry.bid))
            .filter((entry) => (entry.formation.disrupted_turns ?? 0) === 0)
            .filter((entry) => !(state.military.brigade_movement_state?.[entry.bid]?.status === 'in_transit'))
            .filter((entry) => !state.military.brigade_movement_orders?.[entry.bid])
            .map((entry) => {
                const distToTargets = (subSegment.friendly_osids ?? [])
                    .filter((target) => (activeCounts.get(target) ?? 0) === 0)
                    .filter((target) => !friendlySet || friendlySet.has(target))
                    .map((target) => ({
                        target,
                        dist: bfsDistance(entry.formation.location_osid as string, target, adjacency, friendlySet),
                    }))
                    .filter((target) => Number.isFinite(target.dist) && target.dist <= (options.frontGapRepairMaxHops ?? MAX_REDISTRIBUTION_DISTANCE))
                    .sort((a, b) => a.dist - b.dist || strictCompare(a.target, b.target));
                const bestTarget = distToTargets[0];
                return bestTarget ? {
                    bid: entry.bid,
                    formation: entry.formation,
                    target: bestTarget.target,
                    dist: bestTarget.dist,
                } : null;
            })
            .filter((entry): entry is { bid: string; formation: FormationState; target: string; dist: number } => entry != null)
            .sort((a, b) =>
                a.dist - b.dist
                || (b.formation.personnel ?? 0) - (a.formation.personnel ?? 0)
                || strictCompare(a.bid, b.bid)
            );

        const best = viable[0];
        if (!best) continue;

        if (best.dist === 1) {
            best.formation.location_osid = best.target;
            best.formation.entrenchment_turns = 0;
            activeCounts.set(best.target, (activeCounts.get(best.target) ?? 0) + 1);
        } else {
            if (!state.military.brigade_movement_orders) {
                state.military.brigade_movement_orders = {};
            }
            state.military.brigade_movement_orders[best.bid] = createColumnMovementOrder(best.target);
            activeCounts.set(best.target, (activeCounts.get(best.target) ?? 0) + 1);
        }
        used.add(best.bid);
    }
}

function deconflictSharedFrontOsidStacks(
    state: GameState,
    sectors: CorpsFrontSector[],
    adjacency: Map<string, string[]>,
    friendlyByFaction: Map<FactionId, Set<string>>,
    opParticipants: Set<string>,
): void {
    const formations = state.military.formations ?? {};
    const activeCounts = countActiveBrigadesByOsid(formations);

    const claimsByOsid = new Map<string, Array<{
        sector: CorpsFrontSector;
        bid: string;
        formation: FormationState;
        frontOsids: string[];
    }>>();

    for (const sector of sectors) {
        if (!sector.sub_segments || sector.sub_segments.length === 0) continue;
        if (isSarajevoSiegeSector(sector)) continue;

        const frontOsids = [...new Set(
            sector.sub_segments.flatMap((subSegment) => subSegment.friendly_osids ?? [])
        )].sort(strictCompare);
        const frontSet = new Set(frontOsids);
        if (frontSet.size <= 1) continue;

        for (const bid of [...(sector.assigned_brigade_ids ?? [])].sort(strictCompare)) {
            const formation = formations[bid];
            if (!formation || formation.status !== 'active') continue;
            if (formation.kind !== 'brigade' && formation.kind !== 'og' && formation.kind !== 'operational_group') continue;
            const loc = formation.location_osid;
            if (!loc || !frontSet.has(loc)) continue;
            const list = claimsByOsid.get(loc) ?? [];
            list.push({ sector, bid, formation, frontOsids });
            claimsByOsid.set(loc, list);
        }
    }

    const findBestTarget = (
        claim: {
            sector: CorpsFrontSector;
            formation: FormationState;
            frontOsids: string[];
        },
        sharedOsid: string,
    ): { target: string; dist: number } | null => {
        const friendlySet = friendlyByFaction.get(claim.sector.faction);
        const loc = claim.formation.location_osid;
        if (!loc) return null;

        const targets = claim.frontOsids
            .filter((target) => target !== sharedOsid)
            .filter((target) => (activeCounts.get(target) ?? 0) === 0)
            .filter((target) => !friendlySet || friendlySet.has(target))
            .map((target) => ({
                target,
                dist: bfsDistance(loc, target, adjacency, friendlySet),
            }))
            .filter((entry) => Number.isFinite(entry.dist) && entry.dist <= MAX_REDISTRIBUTION_DISTANCE)
            .sort((a, b) => a.dist - b.dist || strictCompare(a.target, b.target));
        return targets[0] ?? null;
    };

    for (const osid of [...claimsByOsid.keys()].sort(strictCompare)) {
        if ((activeCounts.get(osid) ?? 0) < 2) continue;

        const claims = (claimsByOsid.get(osid) ?? [])
            .filter((claim) => !opParticipants.has(claim.bid))
            .filter((claim) => (claim.formation.disrupted_turns ?? 0) === 0)
            .filter((claim) => !(state.military.brigade_movement_state?.[claim.bid]?.status === 'in_transit'))
            .filter((claim) => !state.military.brigade_movement_orders?.[claim.bid])
            .sort((a, b) =>
                strictCompare(a.sector.sector_id, b.sector.sector_id)
                || strictCompare(a.bid, b.bid)
            );
        const sectorIds = new Set(claims.map((claim) => claim.sector.sector_id));
        if (sectorIds.size <= 1) continue;

        const ranked = claims
            .map((claim) => ({
                claim,
                target: findBestTarget(claim, osid),
            }))
            .sort((a, b) =>
                Number(!!a.target) - Number(!!b.target)
                || (b.claim.formation.personnel ?? 0) - (a.claim.formation.personnel ?? 0)
                || (b.claim.formation.entrenchment_turns ?? 0) - (a.claim.formation.entrenchment_turns ?? 0)
                || strictCompare(a.claim.sector.sector_id, b.claim.sector.sector_id)
                || strictCompare(a.claim.bid, b.claim.bid)
            );
        const keeper = ranked[0]?.claim.bid;
        if (!keeper) continue;

        for (const entry of ranked) {
            if ((activeCounts.get(osid) ?? 0) < 2) break;
            if (entry.claim.bid === keeper) continue;
            if (!entry.target) continue;

            if (entry.target.dist === 1) {
                entry.claim.formation.location_osid = entry.target.target;
                entry.claim.formation.entrenchment_turns = 0;
            } else {
                if (!state.military.brigade_movement_orders) {
                    state.military.brigade_movement_orders = {};
                }
                state.military.brigade_movement_orders[entry.claim.bid] = createColumnMovementOrder(entry.target.target);
            }
            activeCounts.set(osid, Math.max(0, (activeCounts.get(osid) ?? 0) - 1));
            activeCounts.set(entry.target.target, (activeCounts.get(entry.target.target) ?? 0) + 1);
        }
    }
}

export function distributeBrigadesToFront(
    state: GameState,
    sectors: CorpsFrontSector[],
    adjacency: Map<string, string[]>,
    options: FrontDistributionOptions = {},
): void {
    const formations = state.military.formations ?? {};
    const opParticipants = buildOperationParticipantSet(state);

    // Build friendly OSID sets per faction (BFS should not path through enemy territory)
    const friendlyByFaction = new Map<FactionId, Set<string>>();
    const pc = state.political?.political_controllers ?? {};
    for (const [osid, controller] of Object.entries(pc)) {
        if (!controller) continue;
        const factionId = controller;
        let s = friendlyByFaction.get(factionId);
        if (!s) { s = new Set<string>(); friendlyByFaction.set(factionId, s); }
        s.add(osid);
    }

    for (const sector of sectors) {
        // Skip sectors with no sub-segments
        if (!sector.sub_segments || sector.sub_segments.length === 0) continue;

        // Siege corps keep their dense front packets, but rear/support stacks
        // still need dispersion so army-HQ loans do not pile up behind the line.
        if (SIEGE_EXEMPT_CORPS.has(sector.corps_id)) {
            disperseStackedRearBrigadesForSector(
                state,
                sector,
                adjacency,
                friendlyByFaction.get(sector.faction),
                opParticipants,
                options,
            );
            continue;
        }

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

            const globalActiveCounts = countActiveBrigadesByOsid(formations);

            // Build stacking map from all active occupants, not only this
            // sub-segment's own primary list. Sibling-sector overlaps must be
            // visible or both sectors can serialize a "not stacked" local truth
            // for the same physical OSID.
            const osidCount = new Map<string, number>();
            for (const osid of frontOsids) {
                osidCount.set(osid, globalActiveCounts.get(osid) ?? 0);
            }

            const frontOsidSet = new Set(frontOsids);
            const sortedFrontOsids = [...frontOsids].sort(strictCompare);

            // ── Phase A: Redistribute stacked brigades to adjacent empty front OSIDs ──
            // Sort purely by ID for determinism.
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
                .sort(strictCompare);

            for (const bid of phaseABrigades) {
                const f = formations[bid]!;
                const loc = f.location_osid;
                if (!loc) continue;
                if ((osidCount.get(loc) ?? 0) < 2) continue; // No longer stacked (earlier move resolved it)

                // Find adjacent empty front OSID
                const neighbors = adjacency.get(loc) ?? [];
                const candidates = neighbors
                    .filter(n => frontOsidSet.has(n) && (osidCount.get(n) ?? 0) === 0)
                    .sort(strictCompare);

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

                // Skip brigades already in transit — re-issuing orders resets their progress
                const movementState = state.military.brigade_movement_state;
                if (movementState?.[bid]?.status === 'in_transit') continue;

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
                const resolvedFrontOsids = candidateFrontOsids.length > 0 ? candidateFrontOsids : sortedFrontOsids;

                // Island guard: exclude OSIDs with zero friendly-controlled neighbors.
                // A 0-neighbor OSID is a single-node island — marching there strands the brigade.
                // Uses friendlyByFaction (already built above) so the guard is a no-op when
                // political_controllers is empty (friendlySet undefined → every OSID passes).
                const friendlySet = friendlyByFaction.get(sector.faction);
                const effectiveFrontOsids = friendlySet
                    ? resolvedFrontOsids.filter(osid =>
                        (adjacency.get(osid) ?? []).some(n => friendlySet.has(n)))
                    : resolvedFrontOsids;
                // If every candidate is an isolated island, skip Phase B for this brigade.
                if (effectiveFrontOsids.length === 0) continue;

                // BFS friendly set: intersect with corps boundary when available
                const bfsFriendly = (useCorpsBoundary && friendlySet)
                    ? new Set([...friendlySet].filter(o => corpsAllowed.has(o)))
                    : friendlySet;

                // Pre-compute distances to all candidates so target selection is distance-aware
                const distToTarget = new Map<string, number>();
                for (const osid of effectiveFrontOsids) {
                    distToTarget.set(osid, bfsDistance(loc, osid, adjacency, bfsFriendly));
                }

                // Pick distance-weighted least-cost target (score = stack_count + weight × dist)
                const target = pickLeastStackedTarget(effectiveFrontOsids, osidCount, distToTarget);

                // Use pre-computed distance for march decision
                const dist = distToTarget.get(target) ?? Infinity;

                if (dist === 1) {
                    // Adjacent: move directly
                    f.location_osid = target;
                    f.entrenchment_turns = 0;
                    osidCount.set(target, (osidCount.get(target) ?? 0) + 1);
                } else if (dist > 1 && dist <= MAX_REDISTRIBUTION_DISTANCE) {
                    // Issue column march order and reserve the target so later brigades
                    // in this loop see it as occupied (prevents simultaneous pileup)
                    if (!state.military.brigade_movement_orders) {
                        state.military.brigade_movement_orders = {};
                    }
                    const movementOrders = state.military.brigade_movement_orders;
                    movementOrders[bid] = createColumnMovementOrder(target);
                    osidCount.set(target, (osidCount.get(target) ?? 0) + 1);
                }
                // If dist > MAX_REDISTRIBUTION_DISTANCE or Infinity: skip
            }
        }

        commitReserveToThreatenedFront(
            state,
            sector,
            adjacency,
            friendlyByFaction.get(sector.faction),
            opParticipants,
            options,
        );

        fillEmptyFrontSubsegmentsFromSectorReserve(
            state,
            sector,
            adjacency,
            friendlyByFaction.get(sector.faction),
            opParticipants,
            options,
        );

        disperseStackedRearBrigadesForSector(
            state,
            sector,
            adjacency,
            friendlyByFaction.get(sector.faction),
            opParticipants,
            options,
        );
    }

    deconflictSharedFrontOsidStacks(state, sectors, adjacency, friendlyByFaction, opParticipants);
}
