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
import { strictCompare } from '../../state/validateGameState.js';
import { munFromOsid } from './osid_adjacency.js';
import { bfsDistance } from './sector_utils.js';
import { createColumnMovementOrder } from './brigade_movement_order_helpers.js';
import { ENABLE_STANDING_OG_RESERVE_COMMIT } from './standing_og_defense.js';
import { isEnclaveMovementDestinationAllowed } from './enclave_resilience.js';
import { getQueuedDatedPrestageBrigadeIds } from './pre_planned_operations.js';
import { createFrontDistributionRecorder, type FrontDistributionCallsite, type FrontDistributionDiagnostics, type FrontDistributionRecorder } from './front_distribution_diagnostic.js';
import { COUNTER_ATTACK_MIN_COHESION, COUNTER_ATTACK_MIN_PERSONNEL, COUNTER_ATTACK_RETREAT_WINDOW } from './bot_constants.js';
import { collectRecentCombatLosses } from './recent_combat_losses.js';
import { effectiveBreachCorpsId, isBreachAnswerDonor, isBreachAnswerTarget } from './brigade_routine_scope.js';

type CorpsAssetFormationState = FormationState & {
    active_operations?: CorpsCommandState['active_operations'];
};

export interface FrontDistributionOptions {
    rearDirectRepairMaxHops?: number;
    frontGapRepairMaxHops?: number;
    enableStandingOgReserveCommit?: boolean;
    population1991ByMun?: MunicipalityPopulation1991Map;
    diagnosticCallsite?: FrontDistributionCallsite;
    completedTurn?: number;
    invocationOrdinal?: number;
    /** Ruling D (2026-11-17): run the corps breach answer. Set only on the final pass of a turn, so a corps answers at most once per turn. */
    breachAnswer?: boolean;
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

/** Ruling D: a breach-answer donor must arrive inside the retake window, so it moves at most this many friendly hops. */
const BREACH_ANSWER_MAX_HOPS = COUNTER_ATTACK_RETREAT_WINDOW;

/**
 * The corps breach answer (orchestrator ruling D on #774, 2026-11-17; corps-army-commander,
 * operations-expert and historian seats, round 2).
 *
 * When a corps has just lost a front cell in combat (`collectRecentCombatLosses`: within the retake
 * window and not taken back) and no healthy brigade stands next to it or is on its way, the corps
 * sends its strongest spare brigade to a friendly front cell next to the lost one, so the P2 step-3
 * retake counter-attack has someone in reach. Movement only: the retake still needs at least a
 * costly victory against what now holds the cell, at most twice per sector per turn.
 *
 * Why: the VRS answered Ozren break-ins with OG-9 and corps intervention units within days
 * (BB2 pp.486-487; BB1 p.385). In-game nothing reached the Maglaj face: front distribution never
 * moves a front brigade toward a hot cell and the army reserve was held by another corps' standing
 * request, so a four-brigade ARBiH op took Donja Bočinja in Aug 1994 and nobody counter-attacked.
 * When the line has nothing spare (Sept 1995: every surviving Ozren brigade holds its cell alone,
 * BB1 p.386) there is no donor and no answer.
 *
 * Rules (all factions; no dates, no unit ids):
 *  - Breaches are ranked per corps: the sector with the most fresh losses first, then sector id;
 *    within it, the lost cell by id. A lost cell counts only when it borders a friendly front cell of
 *    that sector and no healthy non-participant brigade (`COUNTER_ATTACK_MIN_*`) stands on, or is
 *    ordered or marching to, a cell next to it.
 *  - Donors: `isBreachAnswerDonor` (never a lone holder; no operation; retake strength), of this
 *    corps or an elite on loan to it, with no order and not moving, and not taken from another
 *    breached sector of the corps.
 *  - Target: a cell that passes `isBreachAnswerTarget` (inside the donor's movement scope) within
 *    `BREACH_ANSWER_MAX_HOPS` friendly hops; fewest brigades, then fewest hops, then id. Donor: most
 *    personnel × cohesion, then fewest hops, then id.
 *  - One answer per corps per call; the caller runs it once per turn (final pass). One hop or less:
 *    placed directly, as `commitReserveToThreatenedFront` does; otherwise an untagged column order,
 *    whose `dig_in` release `processOsidColumnMovement` grants via `isBreachAnswerColumnOrder`.
 */
function commitCorpsBreachAnswer(
    state: GameState,
    sectors: CorpsFrontSector[],
    adjacency: Map<string, string[]>,
    friendlyByFaction: Map<FactionId, Set<string>>,
    opParticipants: Set<string>,
    recorder?: FrontDistributionRecorder,
): void {
    const formations = state.military.formations ?? {};
    const liveSectors = sectors
        .filter((sector) => (sector.sub_segments?.length ?? 0) > 0 && !SIEGE_EXEMPT_CORPS.has(sector.corps_id))
        .sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    if (liveSectors.length === 0) return;

    const frontByFaction = new Map<string, Set<string>>();
    for (const sector of liveSectors) {
        const front = frontByFaction.get(sector.faction) ?? new Set<string>();
        for (const subSegment of sector.sub_segments ?? []) for (const osid of subSegment.friendly_osids ?? []) front.add(osid);
        frontByFaction.set(sector.faction, front);
    }
    const lostByFaction = new Map<string, Set<string>>();
    const activeCounts = countActiveBrigadesByOsid(formations);
    const formationIds = Object.keys(formations).sort(strictCompare);

    const heading = (id: string): string | undefined => {
        const order = state.military.brigade_movement_orders?.[id];
        if (order?.destination_sids?.[0]) return order.destination_sids[0];
        const move = state.military.brigade_movement_state?.[id];
        return move && move.status !== 'deployed' ? move.destination_sids?.[0] : undefined;
    };
    const hasRetakerInReach = (faction: string, lostCell: string): boolean => {
        const around = new Set(adjacency.get(lostCell) ?? []);
        for (const id of formationIds) {
            const f = formations[id];
            if (!f || f.status !== 'active' || f.faction !== faction || opParticipants.has(id)) continue;
            if ((f.kind ?? 'brigade') !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group' && f.kind !== 'hv_phantom') continue;
            if ((f.personnel ?? 0) < COUNTER_ATTACK_MIN_PERSONNEL || (f.cohesion ?? 0) < COUNTER_ATTACK_MIN_COHESION) continue;
            const dest = heading(id);
            if ((f.location_osid && around.has(f.location_osid)) || (dest && around.has(dest))) return true;
        }
        return false;
    };

    const corpsIds = [...new Set(liveSectors.map((sector) => sector.corps_id))].sort(strictCompare);
    for (const corpsId of corpsIds) {
        const corpsSectors = liveSectors.filter((sector) => sector.corps_id === corpsId);
        const faction = corpsSectors[0]!.faction;
        let lost = lostByFaction.get(faction);
        if (!lost) { lost = collectRecentCombatLosses(state, faction); lostByFaction.set(faction, lost); }
        if (lost.size === 0) continue;
        const friendly = friendlyByFaction.get(faction);
        const front = frontByFaction.get(faction) ?? new Set<string>();

        const breaches: Array<{ sectorId: string; lostCell: string; targets: string[] }> = [];
        const breachCount = new Map<string, number>();
        for (const sector of corpsSectors) {
            const sectorFront = new Set((sector.sub_segments ?? []).flatMap((subSegment) => subSegment.friendly_osids ?? []));
            for (const lostCell of [...lost].sort(strictCompare)) {
                const targets = (adjacency.get(lostCell) ?? [])
                    .filter((osid) => sectorFront.has(osid) && (!friendly || friendly.has(osid)))
                    .sort(strictCompare);
                if (targets.length === 0 || hasRetakerInReach(faction, lostCell)) continue;
                breaches.push({ sectorId: sector.sector_id, lostCell, targets });
                breachCount.set(sector.sector_id, (breachCount.get(sector.sector_id) ?? 0) + 1);
            }
        }
        if (breaches.length === 0) continue;
        breaches.sort((a, b) => (breachCount.get(b.sectorId)! - breachCount.get(a.sectorId)!)
            || strictCompare(a.sectorId, b.sectorId) || strictCompare(a.lostCell, b.lostCell));

        for (const breach of breaches) {
            let pick: { id: string; formation: FormationState; target: string; dist: number; count: number; strength: number } | null = null;
            for (const id of formationIds) {
                const formation = formations[id];
                if (!formation || effectiveBreachCorpsId(formation) !== corpsId) continue;
                if (opParticipants.has(id) || heading(id) !== undefined) continue;
                if (!isBreachAnswerDonor(state, formation, front)) continue;
                const fromOtherBreach = corpsSectors.some((sector) => sector.sector_id !== breach.sectorId
                    && breachCount.has(sector.sector_id)
                    && [...(sector.assigned_brigade_ids ?? []), ...(sector.reserve_brigade_ids ?? []), ...(sector.rear_brigade_ids ?? [])].includes(id));
                if (fromOtherBreach) continue;
                let best: { target: string; dist: number; count: number } | null = null;
                for (const target of breach.targets) {
                    if (!isFormationDestinationAllowed(formation, target)) continue;
                    if (!isBreachAnswerTarget(state, formation, target, adjacency, lost)) continue;
                    const dist = bfsDistance(formation.location_osid as string, target, adjacency, friendly);
                    if (!Number.isFinite(dist) || dist < 1 || dist > BREACH_ANSWER_MAX_HOPS) continue;
                    const count = activeCounts.get(target) ?? 0;
                    if (!best || count < best.count || (count === best.count && (dist < best.dist
                        || (dist === best.dist && strictCompare(target, best.target) < 0)))) {
                        best = { target, dist, count };
                    }
                }
                if (!best) continue;
                const strength = (formation.personnel ?? 0) * (formation.cohesion ?? 0);
                if (!pick || strength > pick.strength || (strength === pick.strength && (best.dist < pick.dist
                    || (best.dist === pick.dist && strictCompare(id, pick.id) < 0)))) {
                    pick = { id, formation, ...best, strength };
                }
            }
            if (!pick) continue;

            recorder?.recordWrite({ helper: 'corps_breach_answer', action_kind: pick.dist <= 1 ? 'direct_location' : 'column_order', formation_id: pick.id, sectors: corpsSectors, op_participants: opParticipants,
                candidate_ids: formationIds.filter((id) => effectiveBreachCorpsId(formations[id]!) === corpsId), target_ids: breach.targets, target_osid: pick.target, distance: pick.dist,
                score: pick.strength, feature_inputs: { sector_id: breach.sectorId, lost_cell: breach.lostCell, target_count: pick.count } });
            if (pick.dist <= 1) {
                pick.formation.location_osid = pick.target;
                pick.formation.entrenchment_turns = 0;
            } else {
                if (!state.military.brigade_movement_orders) state.military.brigade_movement_orders = {};
                state.military.brigade_movement_orders[pick.id] = createColumnMovementOrder(pick.target);
            }
            activeCounts.set(pick.target, (activeCounts.get(pick.target) ?? 0) + 1);
            break; // one answer per corps
        }
    }
}

function fillEmptyFrontSubsegmentsFromSectorReserve(
    state: GameState,
    sector: CorpsFrontSector,
    adjacency: Map<string, string[]>,
    friendlySet: Set<string> | undefined,
    opParticipants: Set<string>,
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
            options,
            recorder,
        );

        fillEmptyFrontSubsegmentsFromSectorReserve(
            state,
            sector,
            adjacency,
            friendlyByFaction.get(sector.faction),
            opParticipants,
            options,
            recorder,
        );

        disperseStackedRearBrigadesForSector(
            state,
            sector,
            adjacency,
            friendlyByFaction.get(sector.faction),
            opParticipants,
            options,
            recorder,
        );
    }

    // Ruling D (2026-11-17): the corps breach answer, after the per-sector loop so Phase A cannot
    // unstack a just-placed donor in the same pass; final pass only (`options.breachAnswer`).
    if (options.breachAnswer === true) {
        commitCorpsBreachAnswer(state, sectors, adjacency, friendlyByFaction, opParticipants, recorder);
    }

    deconflictSharedFrontOsidStacks(state, sectors, adjacency, friendlyByFaction, opParticipants, recorder);

    // Scenario-authored garrison repair: pin an idle same-corps brigade onto any
    // friendly, currently-undefended must-hold OSID. Narrowly scoped; see guards above.
    pinGarrisonToMustHoldFrontEdge(state, adjacency, friendlyByFaction, opParticipants, sectors, recorder);
    return recorder?.finish();
}
