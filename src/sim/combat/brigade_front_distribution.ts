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
import type { MunicipalityPopulation1991Map } from '../../state/population_share.js';
import { getFactionAlignedPopulationShare } from '../../state/population_share.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import { strictCompare } from '../../state/validateGameState.js';
import { munFromOsid, type Osid } from './osid_adjacency.js';
import { bfsDistance } from './sector_utils.js';
import { createColumnMovementOrder } from './brigade_movement_order_helpers.js';
import { ENABLE_STANDING_OG_RESERVE_COMMIT } from './standing_og_defense.js';
import { isEnclaveMovementDestinationAllowed } from './enclave_resilience.js';
import { getQueuedDatedPrestageBrigadeIds, getQueuedPrePlannedBrigadeIds } from './pre_planned_operations.js';
import { createFrontDistributionRecorder, type FrontDistributionCallsite, type FrontDistributionDiagnostics, type FrontDistributionRecorder } from './front_distribution_diagnostic.js';
import { computeDefenderPower } from './combat_math.js';
import {
    buildContactOsidsByFaction,
    FRONT_DONOR_HOME_DISTANCE_MAX_HOPS,
    standsOnContactCell,
    type ContactOsidsByFaction,
} from './contact_cells.js';

type CorpsAssetFormationState = FormationState & {
    active_operations?: CorpsCommandState['active_operations'];
};

export interface FrontDistributionOptions {
    rearDirectRepairMaxHops?: number;
    frontGapRepairMaxHops?: number;
    enableStandingOgReserveCommit?: boolean;
    population1991ByMun?: MunicipalityPopulation1991Map;
    /** This turn's supply by OSID: D3 values a relief at the contact cell's supply. */
    supplyStateByOsid?: SupplyStateByOsidReport | null;
    diagnosticCallsite?: FrontDistributionCallsite;
    completedTurn?: number;
    invocationOrdinal?: number;
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
const RESERVE_COMMIT_MIN_AFFINITY = 0.30;

/** Brigades with this many entrenchment turns or more are NOT redistributed in Phase A.
 *  Only freshly-arrived brigades get spread — entrenched positions are too valuable to abandon. */
const ENTRENCHMENT_REDISTRIBUTION_THRESHOLD = 1;

function isFormationDestinationAllowed(formation: FormationState, targetOsid: string): boolean {
    const originOsid = formation.location_osid;
    return !originOsid || isEnclaveMovementDestinationAllowed(formation, originOsid, targetOsid);
}

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
    for (const brigadeId of getQueuedDatedPrestageBrigadeIds(state)) participants.add(brigadeId);
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

function hasReserveCommitPopulationAffinity(
    formation: FormationState,
    targetOsid: string,
    population1991ByMun: MunicipalityPopulation1991Map | undefined,
): boolean {
    if (!population1991ByMun) return true;
    const munId = munFromOsid(targetOsid);
    if (!munId) return true;
    const affinity = getFactionAlignedPopulationShare(munId, formation.faction, population1991ByMun, 0.5);
    return affinity >= RESERVE_COMMIT_MIN_AFFINITY;
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
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group' && f.kind !== 'hv_phantom') continue;
        const loc = f.location_osid;
        if (!loc) continue;
        counts.set(loc, (counts.get(loc) ?? 0) + 1);
    }
    return counts;
}

/**
 * Ruling D step 3 (2026-11-17): true when another brigade on `loc` outranks `bid` and is not
 * leaving (not an operation participant, not disrupted, no movement order, not in transit), so
 * `bid` can spread from the stack without exposing the cell. Rank: more entrenchment turns,
 * then more personnel, then id. The top-ranked staying brigade is never surplus.
 */
function isStackSurplus(
    state: GameState,
    bid: string,
    loc: string,
    opParticipants: Set<string>,
): boolean {
    const formations = state.military.formations ?? {};
    const self = formations[bid];
    if (!self) return false;
    const selfEntrenchment = self.entrenchment_turns ?? 0;
    const selfPersonnel = self.personnel ?? 0;
    for (const [id, other] of Object.entries(formations)) {
        if (id === bid || !other || other.status !== 'active' || other.location_osid !== loc) continue;
        if (other.faction !== self.faction) continue;
        if (other.kind !== 'brigade' && other.kind !== 'og' && other.kind !== 'operational_group') continue;
        if (opParticipants.has(id) || (other.disrupted_turns ?? 0) > 0) continue;
        if (state.military.brigade_movement_orders?.[id]) continue;
        if (state.military.brigade_movement_state?.[id]?.status === 'in_transit') continue;
        const entrenchment = other.entrenchment_turns ?? 0;
        const personnel = other.personnel ?? 0;
        if (entrenchment > selfEntrenchment
            || (entrenchment === selfEntrenchment && (personnel > selfPersonnel
                || (personnel === selfPersonnel && strictCompare(id, bid) < 0)))) {
            return true;
        }
    }
    return false;
}

function disperseStackedRearBrigadesForSector(
    state: GameState,
    sector: CorpsFrontSector,
    adjacency: Map<string, string[]>,
    friendlySet: Set<string> | undefined,
    opParticipants: Set<string>,
    contactByFaction: ContactOsidsByFaction,
    options: FrontDistributionOptions = {},
    recorder?: FrontDistributionRecorder,
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
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group' && f.kind !== 'hv_phantom') continue;
        if (opParticipants.has(bid)) continue;
        if ((f.disrupted_turns ?? 0) > 0) continue;
        if (frontOsids.has(f.location_osid)) continue;
        // D3: a brigade never leaves a contact cell (any sector's).
        if (standsOnContactCell(f, contactByFaction)) continue;
        const movementState = state.military.brigade_movement_state;
        if (movementState?.[bid]?.status === 'in_transit') continue;
        // Pending movement orders belong to the existing authority (player-staged,
        // authored, or bot). Rear-stack repair must not relocate the formation or
        // overwrite its destination; leave it to the movement/order pipeline.
        if (state.military.brigade_movement_orders?.[bid]) continue;
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
                .filter(target => isFormationDestinationAllowed(f, target))
                .map(target => ({
                    target,
                    dist: bfsDistance(f.location_osid as string, target, adjacency, friendlySet),
                }))
                .filter((entry) => Number.isFinite(entry.dist) && entry.dist <= MAX_REDISTRIBUTION_DISTANCE)
                .sort((a, b) => a.dist - b.dist || strictCompare(a.target, b.target));

            const best = reachableTargets[0];
            if (!best) continue;

            const directRepairMaxHops = options.rearDirectRepairMaxHops ?? 1;
            recorder?.recordWrite({ helper: 'rear_stack_dispersion', action_kind: best.dist <= directRepairMaxHops ? 'direct_location' : 'column_order', formation_id: bid, sectors: [sector], op_participants: opParticipants,
                candidate_ids: candidates, target_ids: reachableTargets.map((entry) => entry.target), target_osid: best.target,
                distance: best.dist, score: best.dist, feature_inputs: { origin_osid: osid, direct_repair_max_hops: directRepairMaxHops, active_origin_count: activeCounts.get(osid) ?? 0 } });
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
    contactByFaction: ContactOsidsByFaction,
    options: FrontDistributionOptions = {},
    recorder?: FrontDistributionRecorder,
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
        .filter((entry) => entry.formation.kind === 'brigade' || entry.formation.kind === 'og' || entry.formation.kind === 'operational_group' || entry.formation.kind === 'hv_phantom')
        .filter((entry) => !!entry.formation.location_osid)
        .filter((entry) => !opParticipants.has(entry.bid))
        .filter((entry) => (entry.formation.disrupted_turns ?? 0) === 0)
        .filter((entry) => !(state.military.brigade_movement_state?.[entry.bid]?.status === 'in_transit'))
        .filter((entry) => !state.military.brigade_movement_orders?.[entry.bid])
        .filter((entry) => !standsOnContactCell(entry.formation, contactByFaction))
        .map((entry) => {
            const reachableTargets = targetFrontOsids
                .filter((target) => isFormationDestinationAllowed(entry.formation, target))
                .filter((target) => hasReserveCommitPopulationAffinity(
                    entry.formation,
                    target,
                    options.population1991ByMun,
                ))
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

    recorder?.recordWrite({ helper: 'threatened_reserve_commit', action_kind: best.dist <= 1 ? 'direct_location' : 'column_order', formation_id: best.bid, sectors: [sector], op_participants: opParticipants,
        candidate_ids: reserveCandidates, target_ids: targetFrontOsids, target_osid: best.target, distance: best.dist,
        score: best.targetCount, feature_inputs: { threat_ratio: sector.threat_ratio ?? 0, target_count: best.targetCount,
            effective_enable_standing_og_reserve_commit: options.enableStandingOgReserveCommit ?? ENABLE_STANDING_OG_RESERVE_COMMIT,
            population_affinity_configured: options.population1991ByMun !== undefined } });

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
    contactByFaction: ContactOsidsByFaction,
    options: FrontDistributionOptions = {},
    recorder?: FrontDistributionRecorder,
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
        .filter((formation) => formation.kind === 'brigade' || formation.kind === 'og' || formation.kind === 'operational_group' || formation.kind === 'hv_phantom')
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
            .filter((entry) => entry.formation.kind === 'brigade' || entry.formation.kind === 'og' || entry.formation.kind === 'operational_group' || entry.formation.kind === 'hv_phantom')
            .filter((entry) => !!entry.formation.location_osid)
            .filter((entry) => !allFrontOsids.has(entry.formation.location_osid!))
            .filter((entry) => !opParticipants.has(entry.bid))
            .filter((entry) => (entry.formation.disrupted_turns ?? 0) === 0)
            .filter((entry) => !(state.military.brigade_movement_state?.[entry.bid]?.status === 'in_transit'))
            .filter((entry) => !state.military.brigade_movement_orders?.[entry.bid])
            .filter((entry) => !standsOnContactCell(entry.formation, contactByFaction))
            .map((entry) => {
                const distToTargets = (subSegment.friendly_osids ?? [])
                    .filter((target) => (activeCounts.get(target) ?? 0) === 0)
                    .filter((target) => !friendlySet || friendlySet.has(target))
                    .filter((target) => isFormationDestinationAllowed(entry.formation, target))
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

        recorder?.recordWrite({ helper: 'empty_front_subsegment_fill', action_kind: best.dist === 1 ? 'direct_location' : 'column_order', formation_id: best.bid, sectors: [sector], op_participants: opParticipants,
            candidate_ids: candidateIds, target_ids: [...(subSegment.friendly_osids ?? [])], target_osid: best.target,
            distance: best.dist, score: best.dist, feature_inputs: { sub_segment_id: subSegment.sub_segment_id,
                front_gap_repair_max_hops: options.frontGapRepairMaxHops ?? MAX_REDISTRIBUTION_DISTANCE,
                active_sector_pool_count: activeSectorPoolCount, frontline_width: frontlineWidth } });

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
    contactByFaction: ContactOsidsByFaction,
    recorder?: FrontDistributionRecorder,
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
            if (formation.kind !== 'brigade' && formation.kind !== 'og' && formation.kind !== 'operational_group' && formation.kind !== 'hv_phantom') continue;
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
            .filter((target) => isFormationDestinationAllowed(claim.formation, target))
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
            .filter((claim) => !standsOnContactCell(claim.formation, contactByFaction))
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

            recorder?.recordWrite({ helper: 'shared_front_stack_deconflict', action_kind: entry.target.dist === 1 ? 'direct_location' : 'column_order', formation_id: entry.claim.bid, sectors, op_participants: opParticipants,
                candidate_ids: claims.map((claim) => claim.bid), target_ids: entry.claim.frontOsids, target_osid: entry.target.target,
                distance: entry.target.dist, score: entry.target.dist,
                feature_inputs: { shared_osid: osid, keeper_id: keeper, active_origin_count: activeCounts.get(osid) ?? 0,
                    personnel: entry.claim.formation.personnel ?? 0, entrenchment_turns: entry.claim.formation.entrenchment_turns ?? 0 } });

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

/**
 * Minimum personnel for a brigade to be eligible as a must-hold garrison pin.
 * Sub-400 formations are too small to credibly garrison a contested must-hold OSID;
 * pinning them would strip a token force from the rear without holding the objective.
 */
const MUST_HOLD_GARRISON_MIN_PERSONNEL = 400;

/**
 * Pin ONE idle, same-corps, ≥MUST_HOLD_GARRISON_MIN_PERSONNEL brigade onto each
 * UNDEFENDED friendly scenario-authored must-hold OSID.
 *
 * This is the narrow garrison-repair lane: when a scenario flags an OSID as
 * `must_hold_osids_by_corps[corpsId]` but that OSID is currently friendly-controlled
 * AND has zero active brigades standing on it, the responsible corps has left its
 * own must-hold front edge undefended. We pin a single idle reserve brigade from
 * the SAME corps onto it (direct move if adjacent, column march otherwise).
 *
 * STRICT GUARDS (all unit-tested):
 *   1. Scoped to `must_hold_osids_by_corps` ONLY — never touches any other OSID.
 *   2. Corps-gated — candidate brigade's `corps_id` must equal the must-hold corps.
 *   3. Idle-only — candidate must NOT be an active-operation participant.
 *   4. ≥400 personnel — sub-threshold brigades are not eligible.
 *   5. Never uproots an entrenched brigade — candidates with
 *      entrenchment_turns ≥ ENTRENCHMENT_REDISTRIBUTION_THRESHOLD are excluded,
 *      and an already-defended must-hold OSID (≥1 active occupant) is skipped.
 *   6. Friendly + undefended only — the must-hold OSID must be controlled by the
 *      corps's faction and currently have zero active brigade occupants.
 *   7. Deterministic — corps, OSIDs, and candidates iterated in strictCompare order;
 *      no Date.now(), no Math.random(). Tie-break by personnel desc then bid.
 *
 * Mutates state.military.formations (location_osid, entrenchment_turns) and
 * state.military.brigade_movement_orders. One brigade per undefended must-hold OSID.
 */
function pinGarrisonToMustHoldFrontEdge(
    state: GameState,
    adjacency: Map<string, string[]>,
    friendlyByFaction: Map<FactionId, Set<string>>,
    opParticipants: Set<string>,
    sectors: CorpsFrontSector[],
    contactByFaction: ContactOsidsByFaction,
    recorder?: FrontDistributionRecorder,
): void {
    const mustHoldByCorps = state.military.must_hold_osids_by_corps;
    if (!mustHoldByCorps) return;

    const formations = state.military.formations ?? {};
    const activeCounts = countActiveBrigadesByOsid(formations);
    const movementState = state.military.brigade_movement_state;

    // Each brigade may satisfy at most ONE must-hold OSID per pass. The move-order
    // branch is protected by the brigade_movement_orders filter below; the
    // direct-move branch (dist≤1) relocates in place and leaves no movement order,
    // so we track directly-pinned brigades here to prevent double-use.
    const pinnedBrigades = new Set<string>();

    // Determine each corps's faction from its first own brigade (deterministic).
    const corpsFaction = (corpsId: string): FactionId | undefined => {
        let resolved: FactionId | undefined;
        for (const bid of Object.keys(formations).sort(strictCompare)) {
            const f = formations[bid];
            if (f?.corps_id === corpsId && f.faction) { resolved = f.faction; break; }
        }
        return resolved;
    };

    for (const corpsId of Object.keys(mustHoldByCorps).sort(strictCompare)) {
        const mustHoldOsids = [...(mustHoldByCorps[corpsId] ?? [])].sort(strictCompare);
        if (mustHoldOsids.length === 0) continue;

        const faction = corpsFaction(corpsId);
        if (!faction) continue;
        const friendlySet = friendlyByFaction.get(faction);

        // Guard 2: corps-scoped BFS friendly set, built once per corps.
        const corpsAllowed = getCorpsAllowedOsids(corpsId, state);
        const bfsFriendly = (corpsAllowed.size > 0 && friendlySet)
            ? new Set([...friendlySet].filter((o) => corpsAllowed.has(o)))
            : friendlySet;

        for (const target of mustHoldOsids) {
            // Guard 1 + 6: only friendly-controlled, currently-undefended must-hold OSIDs.
            if (friendlySet && !friendlySet.has(target)) continue;
            if ((activeCounts.get(target) ?? 0) > 0) continue;

            // Build eligible candidate brigades for THIS corps (guards 2,3,4,5).
            const candidates = Object.keys(formations)
                .sort(strictCompare)
                .map((bid) => ({ bid, f: formations[bid] }))
                .filter((e): e is { bid: string; f: FormationState } => !!e.f)
                .filter((e) => e.f.corps_id === corpsId)                                  // Guard 2
                .filter((e) => e.f.status === 'active')
                .filter((e) => e.f.kind === 'brigade' || e.f.kind === 'og' || e.f.kind === 'operational_group' || e.f.kind === 'hv_phantom')
                .filter((e) => !!e.f.location_osid)
                .filter((e) => !opParticipants.has(e.bid))                                // Guard 3 (idle)
                .filter((e) => (e.f.personnel ?? 0) >= MUST_HOLD_GARRISON_MIN_PERSONNEL)  // Guard 4
                .filter((e) => (e.f.disrupted_turns ?? 0) === 0)
                .filter((e) => (e.f.entrenchment_turns ?? 0) < ENTRENCHMENT_REDISTRIBUTION_THRESHOLD) // Guard 5
                .filter((e) => movementState?.[e.bid]?.status !== 'in_transit')
                .filter((e) => !state.military.brigade_movement_orders?.[e.bid])
                .filter((e) => !pinnedBrigades.has(e.bid))                                 // one must-hold per brigade per pass
                .filter((e) => !standsOnContactCell(e.f, contactByFaction))                // D3: never leave a contact cell
                .filter((e) => e.f.location_osid !== target)
                .filter((e) => isFormationDestinationAllowed(e.f, target))
                .map((e) => ({
                    bid: e.bid,
                    f: e.f,
                    dist: bfsDistance(e.f.location_osid as string, target, adjacency, bfsFriendly),
                }))
                .filter((e) => Number.isFinite(e.dist) && e.dist <= MAX_REDISTRIBUTION_DISTANCE)
                .sort((a, b) =>
                    a.dist - b.dist
                    || (b.f.personnel ?? 0) - (a.f.personnel ?? 0)
                    || strictCompare(a.bid, b.bid)
                );

            const best = candidates[0];
            if (!best) continue;

            recorder?.recordWrite({ helper: 'must_hold_garrison_pin', action_kind: best.dist <= 1 ? 'direct_location' : 'column_order', formation_id: best.bid, sectors, op_participants: opParticipants,
                candidate_ids: candidates.map((entry) => entry.bid), target_ids: mustHoldOsids, target_osid: target,
                distance: best.dist, score: best.dist, feature_inputs: { corps_id: corpsId, minimum_personnel: MUST_HOLD_GARRISON_MIN_PERSONNEL,
                    entrenchment_threshold: ENTRENCHMENT_REDISTRIBUTION_THRESHOLD, personnel: best.f.personnel ?? 0,
                    entrenchment_turns: best.f.entrenchment_turns ?? 0 } });

            if (best.dist <= 1) {
                best.f.location_osid = target;
                best.f.entrenchment_turns = 0;
                activeCounts.set(target, (activeCounts.get(target) ?? 0) + 1);
                // Consume this brigade so it cannot also satisfy a later must-hold
                // OSID in this pass (the move-order branch is protected by the
                // brigade_movement_orders filter; the direct-move branch is not).
                pinnedBrigades.add(best.bid);
            } else {
                if (!state.military.brigade_movement_orders) {
                    state.military.brigade_movement_orders = {};
                }
                state.military.brigade_movement_orders[best.bid] = createColumnMovementOrder(target);
                // Reserve the target so a later must-hold OSID in this loop does not double-book.
                activeCounts.set(target, (activeCounts.get(target) ?? 0) + 1);
            }
        }
    }
}

// ── Defence fix D3: relief in place on contact cells (seats r2, 2026-11-18) ──
//
// A contact cell is a front cell the faction still holds and was attacked on within the
// commander's recapture window, read from persisted brigade_history (contact_cells.ts).
// R1: an EMPTY contact cell is taken by the nearest eligible same-corps brigade of the
// same friendly component (distance, then power at the cell, then id).
// R2: when a candidate valued at the cell as arrived (entrenchment 0) strictly outpowers
// the lone occupant valued as it stands (dug in), the candidate marches in (power, then
// distance, then id). The occupant leaves only once the relief stands on the cell (G2):
// the weaker of the two then takes the cell the relief vacated when that is known
// (adjacent relief), otherwise the nearest vacant quiet front cell of its corps; failing
// both it stays. The entrenchment-0 comparison is the hysteresis against swapping back.
// Faction-blind. No new state: "relief on the way" is read from movement orders/state.

function isFieldBrigadeKind(kind: FormationState['kind']): boolean {
    return kind === 'brigade' || kind === 'og' || kind === 'operational_group' || kind === 'hv_phantom';
}

interface ContactReliefContext {
    state: GameState;
    adjacency: Map<string, string[]>;
    friendlyByFaction: Map<FactionId, Set<string>>;
    contactByFaction: ContactOsidsByFaction;
    /** G1: active-operation participants in any phase, dated prestage and queued pre-planned brigades. */
    protectedIds: Set<string>;
    mustHoldOsids: Set<string>;
    pendingDigIn: Set<string>;
    /** Every sector front cell, by faction ("is this donor on a front cell?"). */
    frontOsidsByFaction: Map<string, Set<string>>;
    /** Every sector front cell, by corps (where a relieved brigade may go). */
    frontOsidsByCorps: Map<string, Set<string>>;
    /** Own active field brigades per cell, by faction; kept current on direct moves. */
    occupantsByFaction: Map<string, Map<string, string[]>>;
    /** Cells with a relief on the way or already relieved in this pass, by faction. */
    reliefInboundByFaction: Map<string, Set<string>>;
    /** Brigades this step has already moved or ordered. */
    used: Set<string>;
    supplyStateByOsid: SupplyStateByOsidReport | null;
}

function nestedSet(map: Map<string, Set<string>>, key: string): Set<string> {
    let set = map.get(key);
    if (!set) {
        set = new Set<string>();
        map.set(key, set);
    }
    return set;
}

function buildContactReliefContext(
    state: GameState,
    sectors: CorpsFrontSector[],
    adjacency: Map<string, string[]>,
    friendlyByFaction: Map<FactionId, Set<string>>,
    opParticipants: Set<string>,
    contactByFaction: ContactOsidsByFaction,
    options: FrontDistributionOptions,
): ContactReliefContext {
    const formations = state.military.formations ?? {};
    const protectedIds = new Set<string>(opParticipants);
    for (const bid of getQueuedPrePlannedBrigadeIds(state)) protectedIds.add(bid);

    const mustHoldOsids = new Set<string>();
    for (const corpsId of Object.keys(state.military.must_hold_osids_by_corps ?? {}).sort(strictCompare)) {
        for (const osid of state.military.must_hold_osids_by_corps?.[corpsId] ?? []) mustHoldOsids.add(osid);
    }

    const pendingDigIn = new Set<string>(
        (state.military.brigade_posture_orders ?? [])
            .filter((order) => order.posture === 'dig_in')
            .map((order) => order.brigade_id),
    );

    const frontOsidsByFaction = new Map<string, Set<string>>();
    const frontOsidsByCorps = new Map<string, Set<string>>();
    for (const sector of sectors) {
        const set = nestedSet(frontOsidsByFaction, sector.faction);
        const corpsSet = nestedSet(frontOsidsByCorps, sector.corps_id);
        for (const subSegment of sector.sub_segments ?? []) {
            for (const osid of subSegment.friendly_osids ?? []) {
                set.add(osid);
                corpsSet.add(osid);
            }
        }
    }

    const occupantsByFaction = new Map<string, Map<string, string[]>>();
    const reliefInboundByFaction = new Map<string, Set<string>>();
    for (const bid of Object.keys(formations).sort(strictCompare)) {
        const formation = formations[bid];
        if (!formation || formation.status !== 'active' || !isFieldBrigadeKind(formation.kind)) continue;
        const location = formation.location_osid;
        if (location) {
            let byOsid = occupantsByFaction.get(formation.faction);
            if (!byOsid) {
                byOsid = new Map<string, string[]>();
                occupantsByFaction.set(formation.faction, byOsid);
            }
            const list = byOsid.get(location) ?? [];
            list.push(bid);
            byOsid.set(location, list);
        }
        const order = state.military.brigade_movement_orders?.[bid];
        const movement = state.military.brigade_movement_state?.[bid];
        const inbound = nestedSet(reliefInboundByFaction, formation.faction);
        for (const destination of order?.destination_sids ?? []) inbound.add(destination);
        if (movement?.status === 'in_transit') {
            for (const destination of movement.destination_sids ?? []) inbound.add(destination);
        }
    }

    return {
        state,
        adjacency,
        friendlyByFaction,
        contactByFaction,
        protectedIds,
        mustHoldOsids,
        pendingDigIn,
        frontOsidsByFaction,
        frontOsidsByCorps,
        occupantsByFaction,
        reliefInboundByFaction,
        used: new Set<string>(),
        supplyStateByOsid: options.supplyStateByOsid ?? null,
    };
}

function occupantsAt(ctx: ContactReliefContext, faction: string, osid: string): string[] {
    return ctx.occupantsByFaction.get(faction)?.get(osid) ?? [];
}

function relocateOccupant(ctx: ContactReliefContext, faction: string, bid: string, from: string, to: string): void {
    let byOsid = ctx.occupantsByFaction.get(faction);
    if (!byOsid) {
        byOsid = new Map<string, string[]>();
        ctx.occupantsByFaction.set(faction, byOsid);
    }
    byOsid.set(from, (byOsid.get(from) ?? []).filter((id) => id !== bid));
    byOsid.set(to, [...(byOsid.get(to) ?? []), bid].sort(strictCompare));
}

/**
 * Friendly-path distance from every cell to `origin`, mirroring `bfsDistance(cell, origin,
 * adjacency, friendlySet)`: intermediate cells must be friendly, the end cells need not be,
 * and the depth cap is MAX_REDISTRIBUTION_DISTANCE. One BFS per contact cell.
 */
function friendlyDistancesTo(
    origin: string,
    adjacency: Map<string, string[]>,
    friendlySet: Set<string> | undefined,
): Map<string, number> {
    const distances = new Map<string, number>([[origin, 0]]);
    let frontier = [origin];
    for (let depth = 0; depth < MAX_REDISTRIBUTION_DISTANCE && frontier.length > 0; depth++) {
        const next: string[] = [];
        for (const osid of frontier) {
            for (const neighbor of adjacency.get(osid) ?? []) {
                if (distances.has(neighbor)) continue;
                distances.set(neighbor, depth + 1);
                if (friendlySet && !friendlySet.has(neighbor)) continue;
                next.push(neighbor);
            }
        }
        frontier = next;
    }
    return distances;
}

/** Existing front-donor guard: the target stays within FRONT_DONOR_HOME_DISTANCE_MAX_HOPS of home. */
function reliefTargetPreservesHomeDistance(
    formation: FormationState,
    target: string,
    adjacency: Map<string, string[]>,
): boolean {
    const home = formation.home_osid;
    if (!home) return true;
    if (home === target) return true;
    const visited = new Set<string>([home]);
    let frontier = [home];
    for (let hop = 1; hop <= FRONT_DONOR_HOME_DISTANCE_MAX_HOPS && frontier.length > 0; hop++) {
        const next: string[] = [];
        for (const osid of frontier) {
            for (const neighbor of adjacency.get(osid) ?? []) {
                if (visited.has(neighbor)) continue;
                if (neighbor === target) return true;
                visited.add(neighbor);
                next.push(neighbor);
            }
        }
        frontier = next;
    }
    return false;
}

/**
 * Defender power at `cell`. A relief is valued "as arrived": standing on the cell at
 * entrenchment 0 with that cell's supply. An occupant is valued as it stands (dug in).
 * Terrain is common to both and omitted (no terrain cache at distribution time).
 */
function defenderPowerAtCell(
    ctx: ContactReliefContext,
    formation: FormationState,
    cell: string,
    asArrived: boolean,
): number {
    const subject: FormationState = asArrived
        ? { ...formation, location_osid: cell, entrenchment_turns: 0 }
        : formation;
    return computeDefenderPower(ctx.state, subject, cell as Osid, {}, 0, ctx.supplyStateByOsid);
}

/** Donor guards for a relief (R1 and R2). */
function isContactReliefDonorEligible(
    ctx: ContactReliefContext,
    bid: string,
    formation: FormationState | undefined,
    corpsId: string,
    faction: string,
    target: string,
): formation is FormationState {
    if (!formation || formation.status !== 'active' || !isFieldBrigadeKind(formation.kind)) return false;
    if (formation.faction !== faction || formation.corps_id !== corpsId) return false;
    const location = formation.location_osid;
    if (!location || location === target) return false;
    if (ctx.used.has(bid)) return false;
    if (ctx.protectedIds.has(bid)) return false;                                         // G1
    if ((formation.disrupted_turns ?? 0) > 0 || formation.disrupted === true) return false;
    if (ctx.state.military.brigade_movement_state?.[bid]?.status === 'in_transit') return false;
    if (ctx.state.military.brigade_movement_orders?.[bid]) return false;
    if (formation.elite_loan_state?.on_loan) return false;                               // loaned
    if (formation.posture === 'dig_in' || ctx.pendingDigIn.has(bid)) return false;       // dug in
    if (ctx.mustHoldOsids.has(location)) return false;                                   // must-hold
    const contact = ctx.contactByFaction.get(faction);
    if (contact?.has(location)) return false;                                            // never leaves a contact cell
    // Historian: a whole brigade leaves a front cell only if no neighbour is a contact cell.
    if (ctx.frontOsidsByFaction.get(faction)?.has(location)
        && (ctx.adjacency.get(location) ?? []).some((neighbor) => contact?.has(neighbor))) return false;
    if (!isFormationDestinationAllowed(formation, target)) return false;                 // enclave
    if (!reliefTargetPreservesHomeDistance(formation, target, ctx.adjacency)) return false; // home distance
    return true;
}

interface ContactReliefCandidate {
    bid: string;
    formation: FormationState;
    origin: string;
    dist: number;
    power: number;
}

function collectContactReliefCandidates(
    ctx: ContactReliefContext,
    sector: CorpsFrontSector,
    cell: string,
): ContactReliefCandidate[] {
    const formations = ctx.state.military.formations ?? {};
    const distances = friendlyDistancesTo(cell, ctx.adjacency, ctx.friendlyByFaction.get(sector.faction));
    const candidates: ContactReliefCandidate[] = [];
    for (const bid of Object.keys(formations).sort(strictCompare)) {
        const formation = formations[bid];
        if (!isContactReliefDonorEligible(ctx, bid, formation, sector.corps_id, sector.faction, cell)) continue;
        const origin = formation.location_osid as string;
        const dist = distances.get(origin);
        if (dist === undefined || dist <= 0 || dist > MAX_REDISTRIBUTION_DISTANCE) continue;  // same component
        candidates.push({ bid, formation, origin, dist, power: defenderPowerAtCell(ctx, formation, cell, true) });
    }
    return candidates;
}

/** Move directly when adjacent (the existing ≤1-hop convention), otherwise issue a column march. */
function executeContactRelief(
    ctx: ContactReliefContext,
    faction: string,
    bid: string,
    formation: FormationState,
    target: string,
    dist: number,
): void {
    const origin = formation.location_osid as string;
    if (dist <= 1) {
        formation.location_osid = target;
        formation.entrenchment_turns = 0;
        relocateOccupant(ctx, faction, bid, origin, target);
    } else {
        if (!ctx.state.military.brigade_movement_orders) ctx.state.military.brigade_movement_orders = {};
        ctx.state.military.brigade_movement_orders[bid] = createColumnMovementOrder(target);
    }
    ctx.used.add(bid);
}

/** R1: the nearest eligible same-corps, same-component brigade takes an empty contact cell. */
function relieveEmptyContactCell(
    ctx: ContactReliefContext,
    sector: CorpsFrontSector,
    cell: string,
    opParticipants: Set<string>,
    recorder?: FrontDistributionRecorder,
): void {
    const candidates = collectContactReliefCandidates(ctx, sector, cell)
        .sort((a, b) => a.dist - b.dist || b.power - a.power || strictCompare(a.bid, b.bid));
    const best = candidates[0];
    if (!best) return;
    recorder?.recordWrite({ helper: 'contact_cell_relief', action_kind: best.dist <= 1 ? 'direct_location' : 'column_order',
        formation_id: best.bid, sectors: [sector], op_participants: opParticipants,
        candidate_ids: candidates.map((entry) => entry.bid), target_ids: [cell], target_osid: cell,
        distance: best.dist, score: best.power,
        feature_inputs: { rule: 'r1_empty_contact_cell', sector_id: sector.sector_id, origin_osid: best.origin, power_as_arrived: best.power } });
    executeContactRelief(ctx, sector.faction, best.bid, best.formation, cell, best.dist);
    nestedSet(ctx.reliefInboundByFaction, sector.faction).add(cell);
}

/** G1 binds the relieved brigade too; a disrupted, moving or ordered brigade stays where it is. */
function canRelievedBrigadeLeave(
    ctx: ContactReliefContext,
    bid: string,
    formation: FormationState | undefined,
): formation is FormationState {
    if (!formation || formation.status !== 'active' || !isFieldBrigadeKind(formation.kind)) return false;
    if (ctx.used.has(bid) || ctx.protectedIds.has(bid)) return false;                   // G1
    if ((formation.disrupted_turns ?? 0) > 0 || formation.disrupted === true) return false;
    if (ctx.state.military.brigade_movement_state?.[bid]?.status === 'in_transit') return false;
    if (ctx.state.military.brigade_movement_orders?.[bid]) return false;
    return true;
}

/**
 * Where a relieved brigade goes when the cell its relief vacated is not known (the
 * relief marched in and its order is consumed): the nearest vacant quiet front cell of
 * its corps, own-held, in the same component, with nothing heading to it.
 */
function nearestVacantQuietFrontCell(
    ctx: ContactReliefContext,
    faction: string,
    formation: FormationState,
    cell: string,
): { target: string; dist: number } | null {
    const corpsFront = ctx.frontOsidsByCorps.get(formation.corps_id ?? '');
    if (!corpsFront || corpsFront.size === 0) return null;
    const contact = ctx.contactByFaction.get(faction);
    const friendlySet = ctx.friendlyByFaction.get(faction);
    const inbound = ctx.reliefInboundByFaction.get(faction);
    const distances = friendlyDistancesTo(cell, ctx.adjacency, friendlySet);
    return [...corpsFront]
        .filter((target) => target !== cell && !contact?.has(target))
        .filter((target) => !friendlySet || friendlySet.has(target))
        .filter((target) => occupantsAt(ctx, faction, target).length === 0 && !inbound?.has(target))
        .filter((target) => isFormationDestinationAllowed(formation, target))
        .map((target) => ({ target, dist: distances.get(target) ?? Infinity }))
        .filter((entry) => entry.dist > 0 && entry.dist <= MAX_REDISTRIBUTION_DISTANCE)
        .sort((a, b) => a.dist - b.dist || strictCompare(a.target, b.target))[0] ?? null;
}

/**
 * R2, second half (G2): the relief stands on the cell, so of the two brigades on it the
 * strictly weaker (both valued as they stand) leaves: to the cell the relief vacated when
 * known, else the nearest vacant quiet front cell of its corps. Failing both it stays, and
 * the cell keeps two defenders. Equal power: nobody leaves.
 */
function releaseWeakerOfReliefPair(
    ctx: ContactReliefContext,
    sector: CorpsFrontSector,
    cell: string,
    pair: readonly string[],
    opParticipants: Set<string>,
    recorder?: FrontDistributionRecorder,
    vacatedOsid?: string,
): void {
    const formations = ctx.state.military.formations ?? {};
    const [firstId, secondId] = [...pair].sort(strictCompare);
    const first = firstId ? formations[firstId] : undefined;
    const second = secondId ? formations[secondId] : undefined;
    if (!firstId || !secondId || !first || !second) return;
    const firstPower = defenderPowerAtCell(ctx, first, cell, false);
    const secondPower = defenderPowerAtCell(ctx, second, cell, false);
    if (firstPower === secondPower) return;
    const firstIsWeaker = firstPower < secondPower;
    const leaverId = firstIsWeaker ? firstId : secondId;
    const leaver = firstIsWeaker ? first : second;
    const keeperId = firstIsWeaker ? secondId : firstId;
    if (!canRelievedBrigadeLeave(ctx, leaverId, leaver)) return;

    let destination: { target: string; dist: number } | null = null;
    if (vacatedOsid
        && occupantsAt(ctx, sector.faction, vacatedOsid).length === 0
        && isFormationDestinationAllowed(leaver, vacatedOsid)) {
        destination = { target: vacatedOsid, dist: 1 };
    }
    destination ??= nearestVacantQuietFrontCell(ctx, sector.faction, leaver, cell);
    if (!destination) return;

    recorder?.recordWrite({ helper: 'contact_cell_relief', action_kind: destination.dist <= 1 ? 'direct_location' : 'column_order',
        formation_id: leaverId, sectors: [sector], op_participants: opParticipants,
        candidate_ids: [firstId, secondId], target_ids: [destination.target], target_osid: destination.target,
        distance: destination.dist, score: Math.min(firstPower, secondPower),
        feature_inputs: { rule: 'r2_relieved_brigade_leaves', sector_id: sector.sector_id, contact_osid: cell,
            keeper_id: keeperId, keeper_power: Math.max(firstPower, secondPower), leaver_power: Math.min(firstPower, secondPower),
            vacated_osid: vacatedOsid ?? null } });
    executeContactRelief(ctx, sector.faction, leaverId, leaver, destination.target, destination.dist);
    nestedSet(ctx.reliefInboundByFaction, sector.faction).add(destination.target);
}

/**
 * R2, first half: a candidate that strictly outpowers the lone occupant at the cell (the
 * candidate as arrived, the occupant as it stands) marches in; the occupant stays until
 * the relief is on the cell (G2). G1: an occupant in an operation is never relieved.
 */
function relieveOutpoweredOccupant(
    ctx: ContactReliefContext,
    sector: CorpsFrontSector,
    cell: string,
    occupantId: string,
    opParticipants: Set<string>,
    recorder?: FrontDistributionRecorder,
): void {
    const formations = ctx.state.military.formations ?? {};
    const occupant = formations[occupantId];
    if (!occupant || occupant.status !== 'active') return;
    if (ctx.protectedIds.has(occupantId)) return;                                       // G1
    if (ctx.state.military.brigade_movement_orders?.[occupantId]) return;
    if (ctx.state.military.brigade_movement_state?.[occupantId]?.status === 'in_transit') return;
    const occupantPower = defenderPowerAtCell(ctx, occupant, cell, false);
    const candidates = collectContactReliefCandidates(ctx, sector, cell)
        .filter((candidate) => candidate.power > occupantPower)                          // strict
        .sort((a, b) => b.power - a.power || a.dist - b.dist || strictCompare(a.bid, b.bid));
    const best = candidates[0];
    if (!best) return;
    recorder?.recordWrite({ helper: 'contact_cell_relief', action_kind: best.dist <= 1 ? 'direct_location' : 'column_order',
        formation_id: best.bid, sectors: [sector], op_participants: opParticipants,
        candidate_ids: candidates.map((entry) => entry.bid), target_ids: [cell], target_osid: cell,
        distance: best.dist, score: best.power,
        feature_inputs: { rule: 'r2_outpowered_occupant', sector_id: sector.sector_id, origin_osid: best.origin,
            occupant_id: occupantId, occupant_power: occupantPower, power_as_arrived: best.power } });
    executeContactRelief(ctx, sector.faction, best.bid, best.formation, cell, best.dist);
    nestedSet(ctx.reliefInboundByFaction, sector.faction).add(cell);
    // An adjacent relief is on the cell now: the occupant takes the cell it vacated.
    if (best.dist <= 1) {
        releaseWeakerOfReliefPair(ctx, sector, cell, [occupantId, best.bid], opParticipants, recorder, best.origin);
    }
}

/**
 * D3 step: relief in place on every sector's contact cells. Sectors and cells in
 * strictCompare order; one relief per cell at a time (a cell with a relief already on
 * the way is skipped). Empty cell: R1. One occupant: R2. Two (a relief has arrived):
 * the weaker leaves. Larger stacks are left alone.
 */
function relieveContactCells(
    state: GameState,
    sectors: CorpsFrontSector[],
    adjacency: Map<string, string[]>,
    friendlyByFaction: Map<FactionId, Set<string>>,
    opParticipants: Set<string>,
    contactByFaction: ContactOsidsByFaction,
    options: FrontDistributionOptions,
    recorder?: FrontDistributionRecorder,
): void {
    if (contactByFaction.size === 0) return;
    const ctx = buildContactReliefContext(state, sectors, adjacency, friendlyByFaction, opParticipants, contactByFaction, options);
    for (const sector of [...sectors].sort((a, b) => strictCompare(a.sector_id, b.sector_id))) {
        if (!sector.sub_segments || sector.sub_segments.length === 0) continue;
        const contact = contactByFaction.get(sector.faction);
        if (!contact || contact.size === 0) continue;
        const cells = [...new Set(sector.sub_segments.flatMap((subSegment) => subSegment.friendly_osids ?? []))]
            .filter((osid) => contact.has(osid))
            .sort(strictCompare);
        for (const cell of cells) {
            if (ctx.reliefInboundByFaction.get(sector.faction)?.has(cell)) continue;
            const occupants = occupantsAt(ctx, sector.faction, cell);
            if (occupants.length === 0) {
                relieveEmptyContactCell(ctx, sector, cell, opParticipants, recorder);
            } else if (occupants.length === 1) {
                const [occupantId] = occupants;
                if (occupantId) relieveOutpoweredOccupant(ctx, sector, cell, occupantId, opParticipants, recorder);
            } else if (occupants.length === 2) {
                releaseWeakerOfReliefPair(ctx, sector, cell, occupants, opParticipants, recorder);
            }
        }
    }
}

export function distributeBrigadesToFront(
    state: GameState,
    sectors: CorpsFrontSector[],
    adjacency: Map<string, string[]>,
    options: FrontDistributionOptions = {},
): FrontDistributionDiagnostics | undefined {
    const formations = state.military.formations ?? {};
    const opParticipants = buildOperationParticipantSet(state);
    const effectiveStandingOgReserveCommit = options.enableStandingOgReserveCommit ?? ENABLE_STANDING_OG_RESERVE_COMMIT;
    const recorder = createFrontDistributionRecorder(state, sectors, opParticipants, options.diagnosticCallsite ?? 'direct-call',
        options.completedTurn, options.invocationOrdinal ?? 0, effectiveStandingOgReserveCommit);

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

    // D3: contact cells at this turn. Every pass below respects "a brigade never leaves a
    // contact cell"; the relief step runs first.
    const contactByFaction = buildContactOsidsByFaction(formations, state.political?.political_controllers, state.meta?.turn);
    relieveContactCells(state, sectors, adjacency, friendlyByFaction, opParticipants, contactByFaction, options, recorder);

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
                contactByFaction,
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
                // T6 distribution must not swallow an already-owned journey. Active transit and
                // any pending movement order are left to their existing authority; they are not
                // cancelled or retargeted merely to improve distribution.
                if (state.military.brigade_movement_state?.[bid]?.status === 'in_transit') continue;
                if (state.military.brigade_movement_orders?.[bid]) continue;
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
                    // D3: a brigade never leaves a contact cell (a relief arriving at
                    // entrenchment 0 must not be unstacked off the cell it relieves).
                    if (standsOnContactCell(f, contactByFaction)) return false;
                    // Don't uproot entrenched brigades — only redistribute fresh arrivals.
                    // Ruling D step 3: an entrenched brigade that is surplus on its cell (another
                    // brigade that is not leaving holds it) may still spread; the cell stays held.
                    if ((f.entrenchment_turns ?? 0) >= ENTRENCHMENT_REDISTRIBUTION_THRESHOLD
                        && !isStackSurplus(state, bid, loc, opParticipants)) return false;
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
                    .filter(n => isFormationDestinationAllowed(f, n))
                    .sort(strictCompare);

                if (candidates.length === 0) continue;

                const target = candidates[0]!;
                recorder?.recordWrite({ helper: 'main_phase_a', action_kind: 'direct_location', formation_id: bid, sectors, op_participants: opParticipants,
                    candidate_ids: phaseABrigades, target_ids: candidates, target_osid: target, distance: 1, score: osidCount.get(target) ?? 0,
                    feature_inputs: { sector_id: sector.sector_id, sub_segment_id: subSeg.sub_segment_id,
                        origin_osid: loc, active_origin_count: osidCount.get(loc) ?? 0, entrenchment_threshold: ENTRENCHMENT_REDISTRIBUTION_THRESHOLD } });
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
                if (standsOnContactCell(f, contactByFaction)) continue; // D3: never leaves a contact cell

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
                const allowedFrontOsids = effectiveFrontOsids.filter(
                    osid => isFormationDestinationAllowed(f, osid),
                );
                // If every candidate is an isolated island, skip Phase B for this brigade.
                if (allowedFrontOsids.length === 0) continue;

                // BFS friendly set: intersect with corps boundary when available
                const bfsFriendly = (useCorpsBoundary && friendlySet)
                    ? new Set([...friendlySet].filter(o => corpsAllowed.has(o)))
                    : friendlySet;

                // Pre-compute distances to all candidates so target selection is distance-aware
                const distToTarget = new Map<string, number>();
                for (const osid of allowedFrontOsids) {
                    distToTarget.set(osid, bfsDistance(loc, osid, adjacency, bfsFriendly));
                }

                // Pick distance-weighted least-cost target (score = stack_count + weight × dist)
                const target = pickLeastStackedTarget(allowedFrontOsids, osidCount, distToTarget);

                // Use pre-computed distance for march decision
                const dist = distToTarget.get(target) ?? Infinity;

                if (dist === 1) {
                    recorder?.recordWrite({ helper: 'main_phase_b', action_kind: 'direct_location', formation_id: bid, sectors, op_participants: opParticipants,
                        candidate_ids: eligibleBrigadeIds, target_ids: allowedFrontOsids, target_osid: target, distance: dist,
                        score: (osidCount.get(target) ?? 0) + PHASE_B_DISTANCE_WEIGHT * dist,
                        feature_inputs: { sector_id: sector.sector_id, sub_segment_id: subSeg.sub_segment_id, origin_osid: loc,
                            use_corps_boundary: useCorpsBoundary, distance_weight: PHASE_B_DISTANCE_WEIGHT,
                            target_stack_count: osidCount.get(target) ?? 0 } });
                    // Adjacent: move directly
                    f.location_osid = target;
                    f.entrenchment_turns = 0;
                    osidCount.set(target, (osidCount.get(target) ?? 0) + 1);
                } else if (dist > 1 && dist <= MAX_REDISTRIBUTION_DISTANCE) {
                    recorder?.recordWrite({ helper: 'main_phase_b', action_kind: 'column_order', formation_id: bid, sectors, op_participants: opParticipants,
                        candidate_ids: eligibleBrigadeIds, target_ids: allowedFrontOsids, target_osid: target, distance: dist,
                        score: (osidCount.get(target) ?? 0) + PHASE_B_DISTANCE_WEIGHT * dist,
                        feature_inputs: { sector_id: sector.sector_id, sub_segment_id: subSeg.sub_segment_id, origin_osid: loc,
                            use_corps_boundary: useCorpsBoundary, distance_weight: PHASE_B_DISTANCE_WEIGHT,
                            target_stack_count: osidCount.get(target) ?? 0 } });
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
            contactByFaction,
            options,
            recorder,
        );

        fillEmptyFrontSubsegmentsFromSectorReserve(
            state,
            sector,
            adjacency,
            friendlyByFaction.get(sector.faction),
            opParticipants,
            contactByFaction,
            options,
            recorder,
        );

        disperseStackedRearBrigadesForSector(
            state,
            sector,
            adjacency,
            friendlyByFaction.get(sector.faction),
            opParticipants,
            contactByFaction,
            options,
            recorder,
        );
    }

    deconflictSharedFrontOsidStacks(state, sectors, adjacency, friendlyByFaction, opParticipants, contactByFaction, recorder);

    // Scenario-authored garrison repair: pin an idle same-corps brigade onto any
    // friendly, currently-undefended must-hold OSID. Narrowly scoped; see guards above.
    pinGarrisonToMustHoldFrontEdge(state, adjacency, friendlyByFaction, opParticipants, sectors, contactByFaction, recorder);
    return recorder?.finish();
}
