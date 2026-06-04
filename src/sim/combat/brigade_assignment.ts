/**
 * Brigade classification, coverage, deduplication, and power/threat recomputation.
 * Extracted from corps_front_sectors.ts — pure refactoring, zero behavior change.
 */

import type {
    CorpsFrontSector,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { computeLocalFrontDefensivePower } from './local_front_defense.js';
import { effectivePersonnel } from './tactical_group_personnel.js';
import { getFormationCorpsId } from './corps_sector_partition.js';
import { munFromOsid, type Osid } from './osid_adjacency.js';
import { strictCompare } from '../../state/validateGameState.js';
import { emitRoutineConsoleDebug, emitRoutineConsoleWarn } from '../../utils/routine_console_diagnostics.js';
import {
    GARRISON_BUDGET_EDGES_PER_BRIGADE,
    isSectorAssignmentExemptCorpsId,
    PHASE_2C_MAX_HOPS,
} from './corps_front_sectors_constants.js';
import { getSectorComponent, getSectorFrontOsids, bfsDistance } from './sector_utils.js';
import type { CorpsCommanderProfile } from './commander_override.js';
import {
    removeFromActiveOperation,
    DISSOLUTION_PERSONNEL_TO_RESERVE_RATE,
    DISSOLUTION_EQUIPMENT_TRANSFER_RATE,
} from './brigade_dissolution.js';

const POCKET_BRIGADE_FORCE_DISSOLUTION_IDS = new Set<string>([
    'hrhb_105th_modrica_brigade',
    'hvo_hrvoje_vukcic_brigade',
]);
const REAR_GUARD_CORPS = new Set<string>(['vrs_1st_krajina', 'vrs_2nd_krajina']);
const COLLAPSED_REAR_GUARD_ABSORPTION_CORPS = new Set<string>(['vrs_2nd_krajina']);
const VRS_1K_LINE_DISTANCE_MAX_HOPS = 6;

/**
 * Brigades more than this many hops from home_osid are skipped for sector
 * assignment so that existing recall mechanisms (evaluateHomeReturn,
 * recall-drifted-brigades) can pull them back instead of locking them
 * into a distant sector.
 */
export const DRIFT_RECALL_SECTOR_SKIP_HOPS = 6;
const FEINT_THREAT_MULTIPLIER = 1.5;
/**
 * Maximum BFS hops for truthful sector reachability checks.
 * A brigade beyond this many hops from a sector's unique front OSIDs cannot
 * truthfully staff it — the sector is unstaffable and should be skipped.
 * Exported for use in corps_front_sectors.ts FIX 1 unique-front-OSID guard.
 */
export const TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS = 30;

type FrontEdgeSnapshot = {
    edge_id?: string;
    a?: string;
    b?: string;
    side_a?: string | null;
    side_b?: string | null;
};

function operationObjectives(op: { axes?: Array<{ objectives?: string[] }>; objectives?: string[] }): string[] {
    if (op.axes && op.axes.length > 0) {
        return op.axes.flatMap((axis) => axis.objectives ?? []);
    }
    return op.objectives ?? [];
}

function hasActiveEnemyFeintAgainstSector(
    state: GameState,
    sector: CorpsFrontSector,
    faction: FactionId,
): boolean {
    const corpsCommand = state.military.corps_command ?? {};
    const territoryOsids = new Set(sector.territory_osids);

    for (const command of Object.values(corpsCommand)) {
        if (!command?.active_operations) continue;
        for (const operation of command.active_operations) {
            if (operation.type !== 'feint') continue;
            if (operation.phase !== 'planning' && operation.phase !== 'execution') continue;

            const participatingFaction = operation.participating_brigades
                .map((brigadeId) => state.military.formations?.[brigadeId]?.faction)
                .find((candidate): candidate is FactionId => candidate != null);
            if (!participatingFaction || participatingFaction === faction) continue;

            for (const objective of operationObjectives(operation)) {
                if (territoryOsids.has(objective)) {
                    return true;
                }
            }
        }
    }

    return false;
}

function friendlyDistanceToAny(
    startOsid: string,
    targets: Set<string>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    maxHops = 30
): number | null {
    if (!startOsid || targets.size === 0) return null;
    if (targets.has(startOsid)) return 0;
    const visited = new Set<string>([startOsid]);
    let frontier: string[] = [startOsid];
    for (let hop = 1; hop <= maxHops; hop++) {
        const next: string[] = [];
        for (const osid of frontier) {
            for (const nb of adjacency.get(osid as Osid) ?? []) {
                if (visited.has(nb)) continue;
                visited.add(nb);
                if (!friendlyOsids.has(nb)) continue;
                if (targets.has(nb)) return hop;
                next.push(nb);
            }
        }
        if (next.length === 0) break;
        frontier = next;
    }
    return null;
}

function friendlyPathToAny(
    startOsid: string,
    targets: Set<string>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    maxHops = 30
): string[] | null {
    if (!startOsid || targets.size === 0) return null;
    if (targets.has(startOsid)) return [startOsid];
    const visited = new Set<string>([startOsid]);
    const parent = new Map<string, string>();
    let frontier: string[] = [startOsid];
    for (let hop = 1; hop <= maxHops; hop++) {
        const next: string[] = [];
        for (const osid of frontier.sort(strictCompare)) {
            const neighbors = [...(adjacency.get(osid as Osid) ?? [])].sort(strictCompare);
            for (const nb of neighbors) {
                if (visited.has(nb)) continue;
                visited.add(nb);
                if (!friendlyOsids.has(nb)) continue;
                parent.set(nb, osid);
                if (targets.has(nb)) {
                    const path = [nb];
                    let cursor = nb;
                    while (parent.has(cursor)) {
                        cursor = parent.get(cursor)!;
                        path.push(cursor);
                    }
                    return path.reverse();
                }
                next.push(nb);
            }
        }
        if (next.length === 0) break;
        frontier = next;
    }
    return null;
}

function nearestSameCorpsRearSectorInComponent(
    locationOsid: string,
    corpsId: string | undefined,
    brigComp: number,
    sectorNeed: Array<{ sector: CorpsFrontSector; need: number; comp: number }>,
    sectorFrontOsidSets: Map<CorpsFrontSector, Set<string>>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
): CorpsFrontSector | null {
    if (!corpsId) return null;
    const candidates = sectorNeed
        .map((sn) => {
            if (sn.sector.corps_id !== corpsId || sn.comp !== brigComp) return null;
            const claimOsids = new Set<string>([
                ...sn.sector.territory_osids,
                ...(sectorFrontOsidSets.get(sn.sector) ?? new Set<string>()),
            ]);
            const dist = friendlyDistanceToAny(
                locationOsid,
                claimOsids,
                adjacency,
                friendlyOsids,
                Number.MAX_SAFE_INTEGER,
            );
            if (dist == null) return null;
            const load =
                sn.sector.assigned_brigade_ids.length
                + sn.sector.reserve_brigade_ids.length
                + (sn.sector.rear_brigade_ids?.length ?? 0);
            return { sector: sn.sector, dist, need: sn.need, load };
        })
        .filter((candidate): candidate is { sector: CorpsFrontSector; dist: number; need: number; load: number } => candidate != null)
        .sort((a, b) =>
            a.dist - b.dist
            || b.need - a.need
            || a.load - b.load
            || strictCompare(a.sector.sector_id, b.sector.sector_id)
        );

    return candidates[0]?.sector ?? null;
}

export function buildOneHopReserveBand(
    frontSet: Set<string>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
): Set<string> {
    const oneHopBehind = new Set<string>();
    for (const frontOsid of frontSet) {
        // Skip the `?? []` empty-array allocation when an OSID has no adjacency
        // entry; iterating the same neighbor list produces an identical result set.
        const neighbors = adjacency.get(frontOsid as Osid);
        if (!neighbors) continue;
        for (const neighbor of neighbors) {
            if (frontSet.has(neighbor)) continue;
            if (!friendlyOsids.has(neighbor)) continue;
            oneHopBehind.add(neighbor);
        }
    }
    return oneHopBehind;
}

function buildOperationParticipantSet(state: GameState | undefined): Set<FormationId> {
    const participants = new Set<FormationId>();
    if (!state) return participants;
    const corpsCommand = state.military.corps_command ?? {};
    for (const command of Object.values(corpsCommand)) {
        for (const operation of command?.active_operations ?? []) {
            for (const brigadeId of operation.participating_brigades ?? []) {
                participants.add(brigadeId);
            }
        }
    }
    return participants;
}

function countActiveBrigadesByOsid(
    formations: Record<FormationId, FormationState>,
): Map<string, number> {
    const counts = new Map<string, number>();
    for (const formation of Object.values(formations)) {
        if (!formation || formation.status !== 'active') continue;
        if (formation.kind !== 'brigade' && formation.kind !== 'og' && formation.kind !== 'operational_group') continue;
        const locationOsid = formation.location_osid;
        if (!locationOsid) continue;
        counts.set(locationOsid, (counts.get(locationOsid) ?? 0) + 1);
    }
    return counts;
}

function countActiveEnemyPersonnelByOsid(
    formations: Record<FormationId, FormationState>,
    faction: FactionId,
): Map<string, number> {
    const personnelByOsid = new Map<string, number>();
    for (const fid of Object.keys(formations).sort(strictCompare)) {
        const formation = formations[fid];
        if (!formation || formation.faction === faction || formation.status !== 'active') continue;
        if (formation.kind !== 'brigade' && formation.kind !== 'og' && formation.kind !== 'operational_group') continue;
        const locationOsid = formation.location_osid;
        if (!locationOsid) continue;
        // Phase 0 (ADR-0005): enemy strength-at-OSID is a home-availability read — a brigade
        // that has lent personnel to a TG is correspondingly weaker at this location. Flag-off:
        // effectivePersonnel === personnel.
        personnelByOsid.set(
            locationOsid,
            (personnelByOsid.get(locationOsid) ?? 0) + effectivePersonnel(formation),
        );
    }
    return personnelByOsid;
}

function classifySectorPosition(
    locationOsid: string | undefined,
    frontSet: Set<string>,
    oneHopBehind: Set<string>,
): 'front' | 'reserve' | null {
    if (!locationOsid) return null;
    if (frontSet.has(locationOsid)) return 'front';
    if (oneHopBehind.has(locationOsid)) return 'reserve';
    return null;
}

export function isMovementOwnedHomeReturn(
    state: GameState | undefined,
    formationId: FormationId,
    formation: FormationState,
): boolean {
    if (!state || !formation.home_osid || formation.assignment?.kind != null) return false;
    const moveOrder = state.military.brigade_movement_orders?.[formationId];
    const orderedDestination = moveOrder?.destination_sids?.[0];
    if (orderedDestination === formation.home_osid) return true;
    const movementState = state.military.brigade_movement_state?.[formationId];
    const activeDestination = movementState?.destination_sids?.[0];
    return movementState?.status === 'in_transit'
        && movementState?.stance === 'column'
        && activeDestination === formation.home_osid;
}

export function isMovementOwnedReturnToCorps(
    state: GameState | undefined,
    formationId: FormationId,
    formation: FormationState,
    sectors: CorpsFrontSector[],
): boolean {
    if (!state || formation.assignment?.kind != null || !formation.location_osid) return false;
    const effectiveCorpsId =
        (formation.elite_loan_state?.on_loan && formation.elite_loan_state.loaned_to_corps)
            ? formation.elite_loan_state.loaned_to_corps
            : getFormationCorpsId(formation);
    if (!effectiveCorpsId) return false;

    const ownCorpsTerritory = new Set<string>();
    for (const sector of sectors) {
        if (sector.corps_id !== effectiveCorpsId) continue;
        for (const osid of sector.territory_osids ?? []) ownCorpsTerritory.add(osid);
    }
    if (ownCorpsTerritory.size === 0 || ownCorpsTerritory.has(formation.location_osid)) return false;

    const moveOrder = state.military.brigade_movement_orders?.[formationId] as { destination_sids?: string[]; stance?: string } | undefined;
    const orderedDestination = moveOrder?.destination_sids?.[0];
    if (moveOrder?.stance === 'column' && orderedDestination && ownCorpsTerritory.has(orderedDestination)) return true;

    const movementState = state.military.brigade_movement_state?.[formationId];
    const activeDestination = movementState?.destination_sids?.[0];
    return movementState?.status === 'in_transit'
        && movementState?.stance === 'column'
        && activeDestination != null
        && ownCorpsTerritory.has(activeDestination);
}

function dissolvePocketDestroyableBrigade(
    state: GameState,
    formations: Record<FormationId, FormationState>,
    brigadeId: FormationId
): void {
    const f = formations[brigadeId];
    if (!f || f.status !== 'active') return;
    const personnel = f.personnel ?? 0;
    const personnelToReserve = Math.floor(personnel * DISSOLUTION_PERSONNEL_TO_RESERVE_RATE);
    if (state.military.strategic_reserves && f.faction) {
        const factionReserve = state.military.strategic_reserves[f.faction];
        if (typeof factionReserve === 'number') {
            (state.military.strategic_reserves as Record<string, number>)[f.faction] = factionReserve + personnelToReserve;
        }
    }
    if (f.composition && f.corps_id) {
        const salvageRate = DISSOLUTION_EQUIPMENT_TRANSFER_RATE;
        const tanksToTransfer = Math.floor((f.composition.tanks ?? 0) * salvageRate);
        const artilleryToTransfer = Math.floor((f.composition.artillery ?? 0) * salvageRate);
        const sortedIds = Object.keys(formations).sort((a, b) => strictCompare(a, b));
        let targetBrigade: FormationState | null = null;
        for (const tid of sortedIds) {
            const t = formations[tid];
            if (!t || t.status !== 'active' || tid === brigadeId) continue;
            if (t.faction !== f.faction || t.corps_id !== f.corps_id) continue;
            if (t.kind !== 'brigade' && t.kind !== 'og') continue;
            targetBrigade = t;
            break;
        }
        if (targetBrigade && targetBrigade.composition) {
            targetBrigade.composition.tanks = (targetBrigade.composition.tanks ?? 0) + tanksToTransfer;
            targetBrigade.composition.artillery = (targetBrigade.composition.artillery ?? 0) + artilleryToTransfer;
        }
        f.composition.tanks = 0;
        f.composition.artillery = 0;
        f.composition.aa_systems = 0;
    }
    removeFromActiveOperation(state, brigadeId, f.corps_id);
    f.status = 'inactive';
    f.lifecycle_status = 'destroyed';
    f.personnel = 0;
    f.destruction_turn = state.meta?.turn ?? 0;
}

/**
 * Classify brigades into sectors based on territory membership.
 *
 * - Brigade at an OSID in a sector's territory_osids → assigned to that sector.
 * - Brigade in friendly territory but not in any sector's territory → assigned
 *   to the nearest sector (BFS through friendly territory).
 * - Idle army-HQ / main-staff reserve brigades are exempt until loaned.
 *
 * GOLDEN RULE: Only brigades that can be placed truthfully should be written into
 * sector truth. If a brigade falls through all classification priorities, keep it
 * unresolved and let recall / movement / enclave logic repair it next turn.
 *
 * Clears existing assigned/reserve lists and rebuilds from scratch.
 * Deterministic: sorted iteration via strictCompare.
 */
export function classifyBrigadesByTerritory(
    sectors: CorpsFrontSector[],
    faction: FactionId,
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    componentOf: Map<string, number>,
    commanderProfiles: Map<string, CorpsCommanderProfile>,
    playerOverrides?: Record<string, string>, // brigadeId → sector_id
    state?: GameState,
): void {
    if (sectors.length === 0) return;

    // Clear existing assignments (will be rebuilt)
    for (const s of sectors) {
        s.assigned_brigade_ids = [];
        s.reserve_brigade_ids = [];
    }

    // ── Player override: pin brigades to player-assigned sectors ─────────
    const playerOverridden = new Set<FormationId>();
    if (playerOverrides) {
        const sectorById = new Map(sectors.map(s => [s.sector_id, s]));
        for (const bid of Object.keys(playerOverrides).sort(strictCompare)) {
            const sectorId = playerOverrides[bid];
            if (!sectorId) continue;
            const f = formations[bid];
            if (!f || f.faction !== faction || f.status !== 'active') continue;
            if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
            const fCorpsId = getFormationCorpsId(f);
            if (!fCorpsId) continue;
            const sector = sectorById.get(sectorId);
            if (!sector || sector.corps_id !== fCorpsId) continue; // stale/wrong corps — fall through
            if (!f.location_osid) continue;
            const brigComp = componentOf.get(f.location_osid) ?? -2;
            const sectorComp = getSectorComponent(sector, componentOf);
            if (sectorComp !== brigComp) {
                emitRoutineConsoleWarn(`[brigade_assignment] Ignored stale player override ${bid} -> ${sector.sector_id}: component ${brigComp} cannot reach component ${sectorComp}`);
                continue;
            }
            sector.assigned_brigade_ids.push(bid);
            playerOverridden.add(bid);
        }
    }

    // ── Pre-compute enemy personnel per sector for budget-aware Phase 1 ──
    const preEnemyPers = new Map<string, number>();
    {
        const enemyPersonnelByOsid = countActiveEnemyPersonnelByOsid(formations, faction);
        for (const s of sectors) {
            const enemyOsids = new Set<string>();
            for (const ss of s.sub_segments) for (const eo of ss.enemy_osids) enemyOsids.add(eo);
            let ep = 0;
            for (const osid of enemyOsids) {
                ep += enemyPersonnelByOsid.get(osid) ?? 0;
            }
            preEnemyPers.set(s.sector_id, ep);
        }
    }

    // Pre-compute sector components (avoids repeated getSectorComponent calls in Phase 1 filter)
    const sectorComponentCache = new Map<string, number>();
    for (const s of sectors) {
        sectorComponentCache.set(s.sector_id, getSectorComponent(s, componentOf));
    }

    // ── Phase 1: Assign frontline brigades by position ──────────────────
    const frontOsidToSectorIndices = new Map<string, number[]>();
    for (let i = 0; i < sectors.length; i++) {
        for (const ss of sectors[i]!.sub_segments) {
            for (const o of ss.friendly_osids) {
                const existing = frontOsidToSectorIndices.get(o);
                if (existing) {
                    if (!existing.includes(i)) existing.push(i);
                } else {
                    frontOsidToSectorIndices.set(o, [i]);
                }
            }
        }
    }

    // Per-corps unassigned brigade pool (corps decides where they go)
    const corpsPool = new Map<FormationId, FormationId[]>();

    // ── Phase 0a: Elite loan routing ─────────────────────────────────────────
    const loanedCorpsMap = new Map<FormationId, string>();
    for (const [fid, f] of Object.entries(formations)) {
        const ls = f.elite_loan_state;
        if (ls?.on_loan && ls.loaned_to_corps) loanedCorpsMap.set(fid, ls.loaned_to_corps);
    }

    const sortedFormIds = Object.keys(formations).sort(strictCompare);
    for (const fid of sortedFormIds) {
        if (playerOverridden.has(fid)) continue;
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid) continue;
        if (state && POCKET_BRIGADE_FORCE_DISSOLUTION_IDS.has(fid)) {
            dissolvePocketDestroyableBrigade(state, formations, fid);
            emitRoutineConsoleWarn(`[brigade_assignment] Destroyed designated pocket brigade ${fid}`);
            continue;
        }

        const fCorpsId = getFormationCorpsId(f);
        if (isSectorAssignmentExemptCorpsId(fCorpsId) && !loanedCorpsMap.has(fid)) continue;

        // ── Drift note: brigades far from home are still assigned where they ARE ──
        // Previously, drifted brigades (>6 hops from home) were silently excluded
        // from the pool, leaving them unassigned despite being active and at full
        // strength. Now they enter the pool normally — recall mechanisms can still
        // pull them back on subsequent turns, but they won't sit idle in the
        // meantime. (FIX 1: drift skip caused 23 unassigned brigades)

        const effectiveCorpsId = loanedCorpsMap.get(fid) ?? fCorpsId;
        const loc = f.location_osid;

        const frontIndices = frontOsidToSectorIndices.get(loc);
        if (frontIndices && frontIndices.length > 0) {
            // Reachability guard: only consider sectors in the same connected component
            const brigComp = componentOf.get(loc) ?? -2;
            const corpsIndices = frontIndices.filter(idx => {
                const s = sectors[idx]!;
                return s.corps_id === effectiveCorpsId
                    && (sectorComponentCache.get(s.sector_id) ?? -1) === brigComp;
            });
            if (corpsIndices.length === 1) {
                sectors[corpsIndices[0]!]!.assigned_brigade_ids.push(fid);
                continue;
            } else if (corpsIndices.length > 1) {
                let bestIdx = corpsIndices[0]!;
                for (const idx of corpsIndices) {
                    const s = sectors[idx]!;
                    const incumbent = sectors[bestIdx]!;
                    const currentNeed = Math.max(0, s.length_edges - s.assigned_brigade_ids.length);
                    const bestNeed = Math.max(0, incumbent.length_edges - incumbent.assigned_brigade_ids.length);
                    const currentIsEmpty = s.assigned_brigade_ids.length === 0;
                    const bestIsEmpty = incumbent.assigned_brigade_ids.length === 0;
                    const currentThreat = preEnemyPers.get(s.sector_id) ?? 0;
                    const bestThreat = preEnemyPers.get(incumbent.sector_id) ?? 0;
                    if (
                        (currentIsEmpty && !bestIsEmpty) ||
                        (currentIsEmpty === bestIsEmpty && currentNeed > bestNeed) ||
                        (
                            currentIsEmpty === bestIsEmpty &&
                            currentNeed === bestNeed &&
                            currentThreat > bestThreat
                        ) ||
                        (
                            currentIsEmpty === bestIsEmpty &&
                            currentNeed === bestNeed &&
                            currentThreat === bestThreat &&
                            strictCompare(s.sector_id, incumbent.sector_id) < 0
                        )
                    ) {
                        bestIdx = idx;
                    }
                }
                sectors[bestIdx]!.assigned_brigade_ids.push(fid);
                continue;
            }
        }

        if (effectiveCorpsId) {
            const pool = corpsPool.get(effectiveCorpsId) ?? [];
            pool.push(fid);
            corpsPool.set(effectiveCorpsId, pool);
        }
    }

    // ── Phase 1.5: Territory-based assignment ─────────────────────────────
    // Brigades sitting in a sector's depth territory (territory_osids) but NOT
    // on the front line were missed by Phase 1.  Assign them to their home
    // sector before Phase 2 scatters them by BFS distance.
    {
        const territoryOsidToSectorIndices = new Map<string, number[]>();
        for (let i = 0; i < sectors.length; i++) {
            for (const osid of sectors[i]!.territory_osids) {
                const existing = territoryOsidToSectorIndices.get(osid);
                if (existing) {
                    if (!existing.includes(i)) existing.push(i);
                } else {
                    territoryOsidToSectorIndices.set(osid, [i]);
                }
            }
        }

        for (const corpsId of [...corpsPool.keys()].sort(strictCompare)) {
            const pool = corpsPool.get(corpsId)!;
            const remaining: FormationId[] = [];
            for (const bid of pool) {
                const f = formations[bid];
                if (!f?.location_osid) { remaining.push(bid); continue; }

                const loc = f.location_osid;
                const territoryIndices = territoryOsidToSectorIndices.get(loc);
                if (!territoryIndices || territoryIndices.length === 0) {
                    remaining.push(bid);
                    continue;
                }

                const effectiveCorpsId = loanedCorpsMap.get(bid) ?? corpsId;
                const brigComp = componentOf.get(loc) ?? -2;

                const matching = territoryIndices.filter(idx => {
                    const s = sectors[idx]!;
                    return s.corps_id === effectiveCorpsId
                        && (sectorComponentCache.get(s.sector_id) ?? -1) === brigComp;
                });

                if (matching.length === 0) {
                    remaining.push(bid);
                    continue;
                }

                // Phase 1.5 guard: territory presence alone is insufficient; brigade must be
                // within TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS of sector front to count as
                // assigned.
                const frontReachableMatching = matching.map((idx) => {
                    const s = sectors[idx]!;
                    const frontSet = new Set<string>();
                    for (const ss of s.sub_segments) for (const o of ss.friendly_osids) frontSet.add(o);
                    if (frontSet.size === 0) return { idx, dist: 0 };
                    const dist = friendlyDistanceToAny(loc, frontSet, adjacency, friendlyOsids, TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS);
                    if (dist === null) return null;
                    return { idx, dist };
                }).filter((candidate): candidate is { idx: number; dist: number } => candidate != null);

                if (frontReachableMatching.length === 0) {
                    // Brigade is in territory but cannot reach any sector front within
                    // TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS hops. Do not assign or reserve
                    // here — let Phase 2 and downstream repair passes handle placement.
                    // Premature Phase 1.5 reserve insertion causes false state when the brigade
                    // is in a disconnected or topologically ambiguous position.
                    remaining.push(bid);
                    continue;
                }

                if (frontReachableMatching.length === 1) {
                    const candidate = frontReachableMatching[0]!;
                    sectors[candidate.idx]!.assigned_brigade_ids.push(bid);
                } else {
                    // Pick the most understaffed sector (highest deficit of edges vs assigned)
                    let best = frontReachableMatching[0]!;
                    let bestNeed = sectors[best.idx]!.length_edges - sectors[best.idx]!.assigned_brigade_ids.length;
                    for (let m = 1; m < frontReachableMatching.length; m++) {
                        const candidate = frontReachableMatching[m]!;
                        const s = sectors[candidate.idx]!;
                        const need = s.length_edges - s.assigned_brigade_ids.length;
                        if (need > bestNeed || (need === bestNeed && strictCompare(s.sector_id, sectors[best.idx]!.sector_id) < 0)) {
                            bestNeed = need;
                            best = candidate;
                        }
                    }
                    sectors[best.idx]!.assigned_brigade_ids.push(bid);
                }
            }
            corpsPool.set(corpsId, remaining);
        }
    }

    // ── Phase 2: Corps distributes pooled brigades to sectors by need ───
    const sectorsByCorps = new Map<FormationId, CorpsFrontSector[]>();
    for (const s of sectors) {
        if (s.length_edges === 0) continue;
        const list = sectorsByCorps.get(s.corps_id) ?? [];
        list.push(s);
        sectorsByCorps.set(s.corps_id, list);
    }

    for (const [corpsId, pool] of [...corpsPool.entries()].sort((a, b) => strictCompare(a[0], b[0]))) {
        const corpsSectors = sectorsByCorps.get(corpsId);
        if (!corpsSectors || corpsSectors.length === 0) {
            // Corps has brigades but no sectors with edges. Do not mint fake
            // sector ownership across disconnected fronts; leave them unresolved.
            for (const bid of pool) {
                const f = formations[bid];
                if (!f) continue;
                if (isMovementOwnedHomeReturn(state, bid, f) || isMovementOwnedReturnToCorps(state, bid, f, sectors)) continue;
                emitRoutineConsoleWarn(`[brigade_assignment] [PROVISIONAL] UNASSIGNED ${bid}: corps ${corpsId} has no sectors with edges`);
            }
            continue;
        }

        const sectorMunicipalities = new Map<CorpsFrontSector, Set<string>>();
        for (const s of corpsSectors) {
            const muns = new Set<string>();
            for (const osid of s.territory_osids) {
                const m = munFromOsid(osid);
                if (m) muns.add(m);
            }
            sectorMunicipalities.set(s, muns);
        }

        const EDGES_PER_GARRISON_BRIGADE = GARRISON_BUDGET_EDGES_PER_BRIGADE;
        const THREAT_BASELINE = 2000;

        const allFormIds = Object.keys(formations).sort(strictCompare);
        const sectorEnemyPers = new Map<CorpsFrontSector, number>();
        for (const s of corpsSectors) {
            const enemyOsids = new Set<string>();
            for (const ss of s.sub_segments) {
                for (const eo of ss.enemy_osids) enemyOsids.add(eo);
            }
            let enemyPers = 0;
            for (const fid of allFormIds) {
                const f = formations[fid];
                if (!f || f.faction === faction || f.status !== 'active') continue;
                if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
                if (!f.location_osid || !enemyOsids.has(f.location_osid)) continue;
                enemyPers += f.personnel ?? 0;
            }
            sectorEnemyPers.set(s, enemyPers);
        }

        // Step 1: Compute garrison budgets
        const totalPooled = pool.length;
        const totalAlreadyAssigned = corpsSectors.reduce((sum, s) => sum + s.assigned_brigade_ids.length, 0);
        const totalAvailable = totalPooled + totalAlreadyAssigned;

        const sectorBudget = new Map<CorpsFrontSector, number>();
        let totalMinGarrison = 0;
        for (const s of corpsSectors) {
            const ep = sectorEnemyPers.get(s) ?? 0;
            const threatMult = Math.min(3.0, Math.max(1.0, Math.sqrt(ep / THREAT_BASELINE)));
            const raw = Math.ceil(s.length_edges / EDGES_PER_GARRISON_BRIGADE) * threatMult;
            sectorBudget.set(s, raw);
            totalMinGarrison += raw;
        }

        const sectorAllocation = new Map<CorpsFrontSector, number>();
        if (totalMinGarrison <= totalAvailable) {
            for (const s of corpsSectors) sectorAllocation.set(s, Math.ceil(sectorBudget.get(s)!));
        } else {
            let allocated = 0;
            const frontSectors = corpsSectors.filter(s => s.length_edges > 0);
            for (const s of frontSectors) { sectorAllocation.set(s, 1); allocated++; }
            for (const s of corpsSectors) { if (!sectorAllocation.has(s)) sectorAllocation.set(s, 0); }
            const remaining = totalAvailable - allocated;
            if (remaining > 0 && totalMinGarrison > 0) {
                const proportional: Array<{ sector: CorpsFrontSector; frac: number }> = [];
                for (const s of frontSectors) {
                    proportional.push({ sector: s, frac: (sectorBudget.get(s)! / totalMinGarrison) * remaining });
                }
                for (const p of proportional) {
                    const extra = Math.floor(p.frac);
                    sectorAllocation.set(p.sector, sectorAllocation.get(p.sector)! + extra);
                    allocated += extra;
                }
                const leftover = totalAvailable - allocated;
                if (leftover > 0) {
                    const byThreat = [...proportional]
                        .sort((a, b) => (sectorEnemyPers.get(b.sector) ?? 0) - (sectorEnemyPers.get(a.sector) ?? 0)
                            || strictCompare(a.sector.sector_id, b.sector.sector_id));
                    for (let i = 0; i < leftover && i < byThreat.length; i++) {
                        sectorAllocation.set(byThreat[i]!.sector, sectorAllocation.get(byThreat[i]!.sector)! + 1);
                    }
                }
            }
        }

        const sectorNeed: Array<{ sector: CorpsFrontSector; need: number; comp: number }> = [];
        const sortedSectors = [...corpsSectors].sort((a, b) =>
            (sectorEnemyPers.get(b) ?? 0) - (sectorEnemyPers.get(a) ?? 0)
            || strictCompare(a.sector_id, b.sector_id));
        for (const s of sortedSectors) {
            const comp = getSectorComponent(s, componentOf);
            const alloc = sectorAllocation.get(s) ?? 0;
            const need = Math.max(0, alloc - s.assigned_brigade_ids.length);
            sectorNeed.push({ sector: s, need, comp });
        }

        const sectorFrontOsidSets = new Map<CorpsFrontSector, Set<string>>();
        for (const sn of sectorNeed) {
            const frontSet = new Set<string>();
            for (const ss of sn.sector.sub_segments) {
                for (const o of ss.friendly_osids) frontSet.add(o);
            }
            sectorFrontOsidSets.set(sn.sector, frontSet);
        }

        // Step 2: Fill garrisons — highest-threat sectors first
        const unmatched: FormationId[] = [];
        for (const sn of sectorNeed) {
            if (sn.need <= 0) continue;
            const candidates: Array<{ bid: FormationId; dist: number }> = [];
            for (const bid of pool) {
                if (sn.sector.assigned_brigade_ids.includes(bid)) continue;
                const f = formations[bid];
                if (!f?.location_osid) continue;
                const brigComp = componentOf.get(f.location_osid) ?? -2;
                if (brigComp !== sn.comp) continue;

                let dist = Infinity;
                const brigLoc = f.location_osid;
                if (sectorFrontOsidSets.get(sn.sector)?.has(brigLoc)) {
                    dist = 0;
                } else {
                    const visited = new Set<string>([brigLoc]);
                    let frontier = [brigLoc];
                    for (let hop = 1; hop <= PHASE_2C_MAX_HOPS && dist === Infinity; hop++) {
                        const next: string[] = [];
                        for (const osid of frontier) {
                            for (const nb of (adjacency.get(osid as Osid) ?? [])) {
                                if (visited.has(nb)) continue;
                                visited.add(nb);
                                if (!friendlyOsids.has(nb)) continue;
                                if (sectorFrontOsidSets.get(sn.sector)?.has(nb)) { dist = hop; break; }
                                next.push(nb);
                            }
                            if (dist !== Infinity) break;
                        }
                        frontier = next;
                    }
                }
                if (dist === Infinity) continue;

                const homeMun = f.home_osid ? munFromOsid(f.home_osid) : undefined;
                const isHome = homeMun && sectorMunicipalities.get(sn.sector)?.has(homeMun);
                const effectiveDist = isHome ? Math.max(0, dist - 2) : dist;

                candidates.push({ bid, dist: effectiveDist });
            }

            candidates.sort((a, b) => a.dist - b.dist || strictCompare(a.bid, b.bid));
            let filled = 0;
            for (const c of candidates) {
                if (filled >= sn.need) break;
                sn.sector.assigned_brigade_ids.push(c.bid);
                const poolIdx = pool.indexOf(c.bid);
                if (poolIdx >= 0) pool.splice(poolIdx, 1);
                filled++;
            }
            sn.need -= filled;
        }

        // Step 3: Surplus allocation — remaining pool brigades
        for (const bid of [...pool]) {
            const f = formations[bid];
            if (!f?.location_osid) {
                emitRoutineConsoleWarn(`[brigade_assignment] UNASSIGNED ${bid}: no location_osid`);
                continue;
            }
            const brigComp = componentOf.get(f.location_osid) ?? -2;
            const homeMun = f.home_osid ? munFromOsid(f.home_osid) : undefined;

            const reachable = sectorNeed
                .map(sn => {
                    if (sn.comp !== brigComp) return null;
                    const frontSet = sectorFrontOsidSets.get(sn.sector) ?? new Set<string>();
                    const d = friendlyDistanceToAny(f.location_osid as string, frontSet, adjacency, friendlyOsids, PHASE_2C_MAX_HOPS);
                    if (d == null) return null;
                    return { sn, dist: d };
                })
                .filter((x): x is { sn: { sector: CorpsFrontSector; need: number; comp: number }; dist: number } => x != null)
                .sort((a, b) => {
                    if (a.dist !== b.dist) return a.dist - b.dist;
                    if (a.sn.need > 0 && b.sn.need <= 0) return -1;
                    if (b.sn.need > 0 && a.sn.need <= 0) return 1;
                    const aHome = homeMun && sectorMunicipalities.get(a.sn.sector)?.has(homeMun) ? 1 : 0;
                    const bHome = homeMun && sectorMunicipalities.get(b.sn.sector)?.has(homeMun) ? 1 : 0;
                    if (bHome !== aHome) return bHome - aHome;
                    return (sectorEnemyPers.get(b.sn.sector) ?? 0) - (sectorEnemyPers.get(a.sn.sector) ?? 0)
                        || strictCompare(a.sn.sector.sector_id, b.sn.sector.sector_id);
                });

            if (reachable.length > 0) {
                const target = reachable[0]!.sn;
                target.sector.assigned_brigade_ids.push(bid);
                target.need = Math.max(0, target.need - 1);
            } else if (sectorNeed.length > 0) {
                if (isMovementOwnedHomeReturn(state, bid, f) || isMovementOwnedReturnToCorps(state, bid, f, sectors)) {
                    continue;
                }
                if ((state?.meta?.turn ?? 0) === 0) {
                    const rearSector = nearestSameCorpsRearSectorInComponent(
                        f.location_osid,
                        corpsId,
                        brigComp,
                        sectorNeed,
                        sectorFrontOsidSets,
                        adjacency,
                        friendlyOsids,
                    );
                    if (rearSector) {
                        rearSector.rear_brigade_ids ??= [];
                        rearSector.rear_brigade_ids.push(bid);
                        continue;
                    }
                }
                if (REAR_GUARD_CORPS.has(corpsId)) {
                    emitRoutineConsoleWarn(`[brigade_assignment] [PROVISIONAL] UNASSIGNED ${bid}: rear-guard corps brigade cannot reach any same-component sector`);
                    continue;
                }
                const hasFactionSectorInComponent = sectors.some((s) =>
                    s.faction === faction
                    && getSectorComponent(s, componentOf) === brigComp
                );
                if (hasFactionSectorInComponent) {
                    continue;
                }
                // Brigade is in a disconnected component with no matching sector.
                // Leave it unresolved rather than inventing false canonical sector truth.

                // Pocket-destroyable brigades: dissolve instead of teleporting 200km.
                // Historical: when the Posavina pocket fell, its brigades ceased to exist.
                if (Array.isArray(f.tags) && f.tags.includes('pocket_destroyable') && state) {
                    dissolvePocketDestroyableBrigade(state, formations, bid);
                    emitRoutineConsoleWarn(`[brigade_assignment] Pocket brigade ${f.name ?? bid} destroyed: home pocket overrun`);
                    continue; // Skip force-assignment
                }
                emitRoutineConsoleWarn(`[brigade_assignment] [PROVISIONAL] UNASSIGNED ${bid}: no reachable same-component sector from ${f.location_osid}`);
            }
        }

    }

    // ── Loaned elites: only place them when the target corps has a truthful same-component sector ──
    for (const [fid, targetCorpsId] of loanedCorpsMap) {
        // Only process loaned brigades belonging to the current faction.
        // The pass runs per-faction; cross-faction entries would find zero
        // matching sectors and silently fall through.
        const loanedFormation = formations[fid];
        if (!loanedFormation || loanedFormation.faction !== faction) continue;

        let alreadyAssigned = false;
        for (const sec of sectors) {
            if (sec.assigned_brigade_ids.includes(fid) || sec.reserve_brigade_ids?.includes(fid)) {
                alreadyAssigned = true;
                break;
            }
        }
        if (alreadyAssigned) continue;

        const formation = formations[fid];
        const location = formation?.location_osid;
        const brigadeComponent = location ? (componentOf.get(location) ?? -2) : -2;
        let bestSector: CorpsFrontSector | null = null;
        let bestCount = -1;
        for (const sec of sectors) {
            if (sec.corps_id !== targetCorpsId) continue;
            if ((sectorComponentCache.get(sec.sector_id) ?? -1) !== brigadeComponent) continue;
            const count = sec.assigned_brigade_ids.length;
            if (count > bestCount || (count === bestCount && bestSector && strictCompare(sec.sector_id, bestSector.sector_id) < 0)) {
                bestCount = count;
                bestSector = sec;
            }
        }

        if (bestSector) {
            bestSector.assigned_brigade_ids.push(fid);
        }
    }

    // Trap remediation pass:
    // if an assigned brigade cannot reach its assigned sector front via friendly path,
    // try reassigning to nearest reachable same-corps sector. If none reachable and
    // brigade is pocket-destroyable, dissolve it (deterministic).
    if (state) {
        const frontBySector = new Map<string, Set<string>>();
        for (const s of sectors) frontBySector.set(s.sector_id, getSectorFrontOsids(s));
        for (const sector of sectors) {
            const assignedNow = [...sector.assigned_brigade_ids].sort(strictCompare);
            for (const bid of assignedNow) {
                const f = formations[bid];
                if (!f || f.status !== 'active' || !f.location_osid) continue;
                const frontSet = frontBySector.get(sector.sector_id) ?? new Set<string>();
                const reachCurrent = friendlyDistanceToAny(
                    f.location_osid,
                    frontSet,
                    adjacency,
                    friendlyOsids,
                    TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS,
                );
                if (reachCurrent != null) continue;
                const brigComp = componentOf.get(f.location_osid) ?? -2;
                const territoryMatches = sectors
                    .filter(s =>
                        s.corps_id === sector.corps_id
                        && s.sector_id !== sector.sector_id
                        && s.territory_osids.includes(f.location_osid!)
                        && getSectorComponent(s, componentOf) === brigComp
                    )
                    .sort((a, b) => {
                        const aNeed = a.length_edges - a.assigned_brigade_ids.length;
                        const bNeed = b.length_edges - b.assigned_brigade_ids.length;
                        return bNeed - aNeed || strictCompare(a.sector_id, b.sector_id);
                    });
                if (territoryMatches.length > 0) {
                    const idx = sector.assigned_brigade_ids.indexOf(bid);
                    if (idx >= 0) sector.assigned_brigade_ids.splice(idx, 1);
                    territoryMatches[0]!.assigned_brigade_ids.push(bid);
                    emitRoutineConsoleDebug(`[brigade_assignment] Reassigned unreachable ${bid} from ${sector.sector_id} to territory-owning ${territoryMatches[0]!.sector_id}`);
                    continue;
                }
                const sameCorps = sectors
                    .filter(s =>
                        s.corps_id === sector.corps_id
                        && s.sector_id !== sector.sector_id
                        && getSectorComponent(s, componentOf) === brigComp
                    )
                    .map(s => {
                        const d = friendlyDistanceToAny(
                            f.location_osid as string,
                            frontBySector.get(s.sector_id) ?? new Set<string>(),
                            adjacency,
                            friendlyOsids,
                            TRUTHFUL_SECTOR_REACHABILITY_MAX_HOPS
                        );
                        return { sector: s, dist: d };
                    })
                    .filter((x): x is { sector: CorpsFrontSector; dist: number } => x.dist != null)
                    .sort((a, b) => a.dist - b.dist || strictCompare(a.sector.sector_id, b.sector.sector_id));
                if (sameCorps.length > 0) {
                    const idx = sector.assigned_brigade_ids.indexOf(bid);
                    if (idx >= 0) sector.assigned_brigade_ids.splice(idx, 1);
                    sameCorps[0]!.sector.assigned_brigade_ids.push(bid);
                    emitRoutineConsoleDebug(`[brigade_assignment] Reassigned unreachable ${bid} from ${sector.sector_id} to ${sameCorps[0]!.sector.sector_id}`);
                    continue;
                }
                if (Array.isArray(f.tags) && f.tags.includes('pocket_destroyable')) {
                    const idx = sector.assigned_brigade_ids.indexOf(bid);
                    if (idx >= 0) sector.assigned_brigade_ids.splice(idx, 1);
                    dissolvePocketDestroyableBrigade(state, formations, bid);
                    emitRoutineConsoleWarn(`[brigade_assignment] Destroyed unreachable pocket brigade ${bid} (no reachable same-corps sector)`);
                    continue;
                }
                const idx = sector.assigned_brigade_ids.indexOf(bid);
                if (idx >= 0) sector.assigned_brigade_ids.splice(idx, 1);
                emitRoutineConsoleWarn(`[brigade_assignment] [PROVISIONAL] UNRESOLVED ${bid}: assigned sector ${sector.sector_id} became unreachable and no same-corps sector could absorb it`);
            }
        }

        // Rear-guard corps line-distance rebalance:
        // keep line brigades near their own sector front by forcibly moving deep-rear
        // assignments to the nearest reachable same-corps sector.
        const rearGuardSectors = sectors.filter(s => REAR_GUARD_CORPS.has(s.corps_id));
        const rearGuardFrontBySector = new Map<string, Set<string>>();
        for (const s of rearGuardSectors) rearGuardFrontBySector.set(s.sector_id, getSectorFrontOsids(s));
        for (const sector of rearGuardSectors) {
            const assignedNow = [...sector.assigned_brigade_ids].sort(strictCompare);
            for (const bid of assignedNow) {
                const f = formations[bid];
                if (!f || f.status !== 'active' || f.kind !== 'brigade' || !f.location_osid) continue;
                const ownFront = rearGuardFrontBySector.get(sector.sector_id) ?? new Set<string>();
                const ownDist = friendlyDistanceToAny(
                    f.location_osid,
                    ownFront,
                    adjacency,
                    friendlyOsids,
                    PHASE_2C_MAX_HOPS
                );
                if (ownDist == null || ownDist <= VRS_1K_LINE_DISTANCE_MAX_HOPS) continue;
                const candidates = rearGuardSectors
                    .filter(s =>
                        s.sector_id !== sector.sector_id
                        && s.corps_id === sector.corps_id
                        && getSectorComponent(s, componentOf) === (componentOf.get(f.location_osid!) ?? -2)
                    )
                    .map(s => {
                        const d = friendlyDistanceToAny(
                            f.location_osid as string,
                            rearGuardFrontBySector.get(s.sector_id) ?? new Set<string>(),
                            adjacency,
                            friendlyOsids,
                            PHASE_2C_MAX_HOPS
                        );
                        return { sector: s, dist: d };
                    })
                    .filter((x): x is { sector: CorpsFrontSector; dist: number } => x.dist != null)
                    .sort((a, b) =>
                        a.dist - b.dist
                        || a.sector.assigned_brigade_ids.length - b.sector.assigned_brigade_ids.length
                        || strictCompare(a.sector.sector_id, b.sector.sector_id)
                    );
                if (candidates.length === 0) continue;
                const best = candidates[0]!;
                if (best.dist >= ownDist) continue;
                const idx = sector.assigned_brigade_ids.indexOf(bid);
                if (idx >= 0) sector.assigned_brigade_ids.splice(idx, 1);
                best.sector.assigned_brigade_ids.push(bid);
                emitRoutineConsoleDebug(
                    `[brigade_assignment] rear-guard rebalance ${bid}: ${sector.sector_id} (dist ${ownDist}) -> ${best.sector.sector_id} (dist ${best.dist})`
                );
            }
        }
    }

    // Sort for determinism
    for (const s of sectors) {
        s.assigned_brigade_ids.sort(strictCompare);
        s.reserve_brigade_ids.sort(strictCompare);
    }
}

/**
 * Step 6b: Legacy enclave-rescue hook.
 *
 * Final cross-corps sector assignment for non-elite field brigades is
 * forbidden. Until the sim grows an explicit non-elite attachment owner,
 * leave these brigades unresolved so recall logic and diagnostics can treat
 * them honestly instead of laundering them into another corps's sector.
 */
export function assignCrossCorpsEnclaveDefenders(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    faction: FactionId,
    componentOf: Map<string, number>,
): void {
    void sectors;
    void formations;
    void faction;
    void componentOf;
}

/**
 * After equalization and coverage, classify assigned brigades by position:
 * - On sector front OSID → stays assigned (frontline duty)
 * - 1 hop behind front → reserve candidate (recovery/reaction force)
 * - Deeper rear → stays sector-owned, but no longer in the frontline-assigned bucket
 *
 * GOLDEN RULE 1: Every active non-exempt field brigade should resolve into a
 * truthful sector by the end of the assignment pipeline.
 * GOLDEN RULE 2: Brigades in a sector should be on the frontline, except
 * one reserve per sector (1 hop behind, recovering or reaction force).
 */
export function reclassifyRearBrigades(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>
): void {
    for (const sector of sectors) {
        const frontSet = getSectorFrontOsids(sector);
        if (frontSet.size === 0) continue;

        const oneHopBehind = buildOneHopReserveBand(frontSet, adjacency, friendlyOsids);

        const keepAssigned: FormationId[] = [];
        const keepRear: FormationId[] = [];
        let reserveCandidates: Array<{ bid: FormationId; personnel: number }> = [];

        for (const bid of [...sector.assigned_brigade_ids, ...sector.reserve_brigade_ids, ...(sector.rear_brigade_ids ?? [])]) {
            const f = formations[bid];
            if (!f?.location_osid) { keepRear.push(bid); continue; }
            const position = classifySectorPosition(f.location_osid, frontSet, oneHopBehind);
            if (position === 'front') {
                keepAssigned.push(bid);
            } else if (position === 'reserve') {
                // Phase 0 (ADR-0005): reserve ranking is home-availability — prefer the brigade
                // with the most personnel actually present at home (lent slice excluded).
                reserveCandidates.push({ bid, personnel: effectivePersonnel(f) });
            } else {
                keepRear.push(bid);
            }
        }

        reserveCandidates.sort((a, b) => b.personnel - a.personnel || strictCompare(a.bid, b.bid));
        const reserveBrigade = reserveCandidates.length > 0 ? reserveCandidates[0]!.bid : null;
        for (const rc of reserveCandidates.slice(1)) {
            keepRear.push(rc.bid);
        }

        sector.assigned_brigade_ids = keepAssigned.sort(strictCompare);
        sector.reserve_brigade_ids = reserveBrigade ? [reserveBrigade] : [];
        sector.rear_brigade_ids = keepRear.sort(strictCompare);
    }

    for (const s of sectors) {
        s.density = s.length_edges > 0
            ? s.assigned_brigade_ids.length / s.length_edges : 0;
    }
}

/**
 * Final truth pass: a sector may only keep brigades it physically owns.
 *
 * Ownership is truthful when the brigade's current location is on the sector
 * frontline, inside the sector's territory, or one hop behind the frontline
 * as a reserve position. Anything else is future intent, not current
 * frontline truth, and must be stripped before sectors are returned.
 */
export function enforcePhysicalSectorOwnership(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
): void {
    for (const sector of sectors) {
        const frontSet = getSectorFrontOsids(sector);
        const territorySet = new Set(sector.territory_osids);
        const oneHopBehind = buildOneHopReserveBand(frontSet, adjacency, friendlyOsids);

        const nextAssigned: FormationId[] = [];
        const nextReserve: FormationId[] = [];
        const nextRear: FormationId[] = [];

        const claimForLocation = (locationOsid: string | undefined): 'front' | 'territory' | 'reserve' | null => (
            locationOsid
                ? (frontSet.has(locationOsid) ? 'front' : oneHopBehind.has(locationOsid) ? 'reserve' : territorySet.has(locationOsid) ? 'territory' : null)
                : null
        );

        for (const bid of sector.assigned_brigade_ids) {
            const claim = claimForLocation(formations[bid]?.location_osid);
            if (claim === 'front') {
                nextAssigned.push(bid);
            } else if (claim === 'territory') {
                nextRear.push(bid);
            } else if (claim === 'reserve') {
                nextReserve.push(bid);
            }
        }

        for (const bid of sector.reserve_brigade_ids) {
            const claim = claimForLocation(formations[bid]?.location_osid);
            if (claim === 'front') {
                nextAssigned.push(bid);
            } else if (claim === 'territory') {
                nextRear.push(bid);
            } else if (claim === 'reserve') {
                nextReserve.push(bid);
            }
        }

        for (const bid of sector.rear_brigade_ids ?? []) {
            const claim = claimForLocation(formations[bid]?.location_osid);
            if (claim === 'front') {
                nextAssigned.push(bid);
            } else if (claim === 'territory') {
                nextRear.push(bid);
            } else if (claim === 'reserve') {
                nextReserve.push(bid);
            }
        }

        nextAssigned.sort(strictCompare);
        nextReserve.sort(strictCompare);
        nextRear.sort(strictCompare);
        sector.assigned_brigade_ids = nextAssigned;
        sector.reserve_brigade_ids = nextReserve;
        sector.rear_brigade_ids = nextRear;
    }
}

/**
 * Final canonical repair: if a brigade still has no sector after the late
 * writers have run, but its own corps still has a sector that truthfully owns
 * its current location, attach it back to that sector.
 *
 * This is not a permissive fallback. Primary candidates must already own the
 * brigade's current position by frontline, sector territory, or one-hop reserve
 * truth, and the final owner must match the brigade's resolved corps. If no
 * primary claim exists but the brigade can still path through friendly territory
 * to an own-corps sector, keep its current OSID sector-owned as a deep rear
 * position rather than serializing it as ownerless.
 */
export function rehomeUnassignedBrigadesToPhysicalSectorOwners(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    options?: { allowDeepRearOwnership?: boolean; allowCollapsedRearGuardAbsorption?: boolean },
): void {
    const sectorClaims = sectors.map((sector) => {
        const frontSet = getSectorFrontOsids(sector);
        const territorySet = new Set(sector.territory_osids);
        const oneHopBehind = buildOneHopReserveBand(frontSet, adjacency, friendlyOsids);
        return { sector, frontSet, territorySet, oneHopBehind };
    });

    const assigned = new Set<FormationId>();
    for (const { sector, frontSet, territorySet, oneHopBehind } of sectorClaims) {
        for (const bid of sector.assigned_brigade_ids) {
            const locationOsid = formations[bid]?.location_osid;
            if (locationOsid && frontSet.has(locationOsid)) assigned.add(bid);
        }
        for (const bid of sector.reserve_brigade_ids) {
            const locationOsid = formations[bid]?.location_osid;
            if (locationOsid && oneHopBehind.has(locationOsid)) assigned.add(bid);
        }
        for (const bid of sector.rear_brigade_ids ?? []) {
            const locationOsid = formations[bid]?.location_osid;
            if (locationOsid && territorySet.has(locationOsid)) assigned.add(bid);
        }
    }

    const formIds = Object.keys(formations).sort(strictCompare);
    for (const fid of formIds) {
        if (assigned.has(fid)) continue;
        const formation = formations[fid];
        if (!formation || formation.faction !== faction || formation.status !== 'active') continue;
        if (formation.kind !== 'brigade' && formation.kind !== 'og' && formation.kind !== 'operational_group') continue;
        const corpsId = getFormationCorpsId(formation);
        const isLoaned = !!formation.elite_loan_state?.on_loan && !!formation.elite_loan_state?.loaned_to_corps;
        if (isSectorAssignmentExemptCorpsId(corpsId) && !isLoaned) continue;
        const locationOsid = formation.location_osid;
        if (!locationOsid) continue;

        // Drifted-brigade gate: if the brigade's home_osid is still claimed by
        // any own-corps sector, it has merely drifted — don't rehome it cross-corps.
        // Let recall mechanisms (evaluateHomeReturn, recall-drifted-brigades) pull it back.
        const hasSameCorpsClaim = sectorClaims.some(({ sector, frontSet, territorySet, oneHopBehind }) =>
            sector.corps_id === corpsId
            && (frontSet.has(locationOsid) || territorySet.has(locationOsid) || oneHopBehind.has(locationOsid))
        );
        if (!hasSameCorpsClaim && formation.home_osid) {
            const ownCorpsSectors = sectorClaims.filter(c => c.sector.corps_id === corpsId);
            const homeStillOwnCorps = ownCorpsSectors.some(c => c.territorySet.has(formation.home_osid!));
            if (homeStillOwnCorps) {
                emitRoutineConsoleDebug(`[brigade_assignment] Skipping cross-corps rehome for drifted ${fid} — home_osid ${formation.home_osid} still in own-corps territory`);
                continue;
            }
        }

        const candidates = sectorClaims
            .map(({ sector, frontSet, territorySet, oneHopBehind }) => {
                if (sector.corps_id !== corpsId) return null;
                let claim: 'front' | 'territory' | 'reserve' | null = null;
                if (frontSet.has(locationOsid)) claim = 'front';
                else if (oneHopBehind.has(locationOsid)) claim = 'reserve';
                else if (territorySet.has(locationOsid)) claim = 'territory';
                if (!claim) return null;
                const claimRank = claim === 'front' ? 0 : claim === 'reserve' ? 1 : 2;
                const load = sector.assigned_brigade_ids.length + sector.reserve_brigade_ids.length + (sector.rear_brigade_ids?.length ?? 0);
                return { sector, claim, claimRank, load };
            })
            .filter((x): x is { sector: CorpsFrontSector; claim: 'front' | 'territory' | 'reserve'; claimRank: number; load: number } => x != null)
            .sort((a, b) =>
                a.claimRank - b.claimRank
                || a.load - b.load
                || strictCompare(a.sector.sector_id, b.sector.sector_id)
            );

        if (candidates.length === 0
            && options?.allowCollapsedRearGuardAbsorption === true
            && corpsId != null
            && COLLAPSED_REAR_GUARD_ABSORPTION_CORPS.has(corpsId)) {
            const collapsedRearGuardCandidates = sectorClaims
                .map(({ sector, frontSet, territorySet, oneHopBehind }) => {
                    if (sector.faction !== faction) return null;
                    if (!REAR_GUARD_CORPS.has(sector.corps_id)) return null;
                    let claim: 'front' | 'territory' | 'reserve' | null = null;
                    if (frontSet.has(locationOsid)) claim = 'front';
                    else if (oneHopBehind.has(locationOsid)) claim = 'reserve';
                    else if (territorySet.has(locationOsid)) claim = 'territory';
                    if (!claim) return null;
                    const claimRank = claim === 'front' ? 0 : claim === 'reserve' ? 1 : 2;
                    const load = sector.assigned_brigade_ids.length + sector.reserve_brigade_ids.length + (sector.rear_brigade_ids?.length ?? 0);
                    return { sector, claim, claimRank, load };
                })
                .filter((x): x is { sector: CorpsFrontSector; claim: 'front' | 'territory' | 'reserve'; claimRank: number; load: number } => x != null)
                .sort((a, b) =>
                    a.claimRank - b.claimRank
                    || a.load - b.load
                    || strictCompare(a.sector.sector_id, b.sector.sector_id)
                );
            const collapsedBest = collapsedRearGuardCandidates[0];
            if (collapsedBest) {
                if (collapsedBest.claim === 'front') {
                    collapsedBest.sector.assigned_brigade_ids.push(fid);
                } else if (collapsedBest.claim === 'territory') {
                    collapsedBest.sector.rear_brigade_ids ??= [];
                    collapsedBest.sector.rear_brigade_ids.push(fid);
                } else {
                    collapsedBest.sector.reserve_brigade_ids.push(fid);
                }
                assigned.add(fid);
                emitRoutineConsoleDebug(`[brigade_assignment] Rehomed collapsed rear-guard ${fid} into truthful sector owner ${collapsedBest.sector.sector_id} (${collapsedBest.claim})`);
                continue;
            }
        }

        if (candidates.length === 0 && options?.allowDeepRearOwnership === true) {
            const rearCandidates = sectorClaims
                .map(({ sector, frontSet, territorySet, oneHopBehind }) => {
                    if (sector.corps_id !== corpsId) return null;
                    const claimOsids = new Set<string>([
                        ...frontSet,
                        ...territorySet,
                        ...oneHopBehind,
                    ]);
                    const path = friendlyPathToAny(
                        locationOsid,
                        claimOsids,
                        adjacency,
                        friendlyOsids,
                        Number.MAX_SAFE_INTEGER,
                    );
                    if (!path) return null;
                    const dist = path.length - 1;
                    const load =
                        sector.assigned_brigade_ids.length
                        + sector.reserve_brigade_ids.length
                        + (sector.rear_brigade_ids?.length ?? 0);
                    return { sector, dist, load, path };
                })
                .filter((candidate): candidate is { sector: CorpsFrontSector; dist: number; load: number; path: string[] } => candidate != null)
                .sort((a, b) =>
                    a.dist - b.dist
                    || a.load - b.load
                    || strictCompare(a.sector.sector_id, b.sector.sector_id)
                );
            const rearBest = rearCandidates[0];
            if (!rearBest) continue;
            rearBest.sector.rear_brigade_ids ??= [];
            rearBest.sector.rear_brigade_ids.push(fid);
            rearBest.sector.territory_osids = [...new Set([
                ...rearBest.sector.territory_osids,
                locationOsid,
            ])].sort(strictCompare);
            assigned.add(fid);
            emitRoutineConsoleDebug(`[brigade_assignment] Rehomed ${fid} into truthful sector owner ${rearBest.sector.sector_id} (deep-rear)`);
            continue;
        }
        if (candidates.length === 0) continue;
        const best = candidates[0]!;
        if (best.claim === 'front') {
            best.sector.assigned_brigade_ids.push(fid);
        } else if (best.claim === 'territory') {
            best.sector.rear_brigade_ids ??= [];
            best.sector.rear_brigade_ids.push(fid);
        } else {
            best.sector.reserve_brigade_ids.push(fid);
        }
        assigned.add(fid);
        emitRoutineConsoleDebug(`[brigade_assignment] Rehomed ${fid} into truthful sector owner ${best.sector.sector_id} (${best.claim})`);
    }
}

function isAtOrOneHopFromAny(
    startOsid: string,
    targets: Set<string>,
    adjacency: Map<Osid, Osid[]>,
): boolean {
    if (!startOsid || targets.size === 0) return false;
    if (targets.has(startOsid)) return true;
    for (const neighbor of adjacency.get(startOsid as Osid) ?? []) {
        if (targets.has(neighbor)) return true;
    }
    return false;
}

function frontOsidsForFaction(
    frontEdges: FrontEdgeSnapshot[],
    faction: FactionId,
): Set<string> {
    const result = new Set<string>();
    for (const edge of frontEdges) {
        if (edge.side_a === faction && edge.a) result.add(edge.a);
        if (edge.side_b === faction && edge.b) result.add(edge.b);
    }
    return result;
}

export function brigadeRequiresSectorAssignment(
    formation: FormationState,
    sectors: CorpsFrontSector[],
    adjacency: Map<Osid, Osid[]>,
    frontEdges: FrontEdgeSnapshot[],
): boolean {
    const loc = formation.location_osid;
    if (!loc) return false;

    const effectiveCorpsId =
        (formation.elite_loan_state?.on_loan && formation.elite_loan_state.loaned_to_corps)
            ? formation.elite_loan_state.loaned_to_corps
            : getFormationCorpsId(formation);
    if (!effectiveCorpsId) return false;

    const factionFrontOsids = frontOsidsForFaction(frontEdges, formation.faction);
    const nearFactionFront = isAtOrOneHopFromAny(loc, factionFrontOsids, adjacency);

    const sameCorpsSectors = sectors.filter((sector) => sector.corps_id === effectiveCorpsId);
    for (const sector of sameCorpsSectors) {
        if (isAtOrOneHopFromAny(loc, getSectorFrontOsids(sector), adjacency)) return true;
    }

    if (sameCorpsSectors.length > 0) return nearFactionFront;

    return nearFactionFront;
}

/**
 * Surface any brigades that truly fell through the full sector pipeline.
 *
 * Call this only after same-corps assignment, enclave rescue, and minimum
 * coverage steps have all had their chance to assign the brigade.
 *
 * @deprecated Not called in production. The canonical emission path is
 * `emitFinalUnresolvedSectorWarnings()` in `corps_front_sectors.ts`, gated
 * by `isFinalPass` so it fires only on the genuinely final pipeline
 * invocation. Retained for test usage only.
 */
export function warnUnresolvedSectorAssignments(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    faction: FactionId,
    adjacency?: Map<Osid, Osid[]>,
    frontEdges: FrontEdgeSnapshot[] = [],
): void {
    const allAssigned = new Set<string>();
    for (const s of sectors) {
        for (const bid of s.assigned_brigade_ids) allAssigned.add(bid);
        for (const bid of s.reserve_brigade_ids) allAssigned.add(bid);
        for (const bid of s.rear_brigade_ids ?? []) allAssigned.add(bid);
    }

    const sortedFormIds = Object.keys(formations).sort(strictCompare);
    for (const fid of sortedFormIds) {
        if (allAssigned.has(fid)) continue;
        const f = formations[fid];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        const fCorpsId = getFormationCorpsId(f);
        const isLoaned = !!f.elite_loan_state?.on_loan && !!f.elite_loan_state?.loaned_to_corps;
        if (isSectorAssignmentExemptCorpsId(fCorpsId) && !isLoaned) continue;
        if (adjacency && !brigadeRequiresSectorAssignment(f, sectors, adjacency, frontEdges)) continue;
        emitRoutineConsoleWarn(`[brigade_assignment] UNRESOLVED ${fid} (${f.personnel ?? 0} pers): fell through sector pipeline, corps=${fCorpsId}`);
    }
}

/**
 * Ensure every sector has at least one assigned brigade.
 */
type EnsureMinimumSectorCoveragePerfTimer = <T>(label: string, fn: () => T) => T;

export function ensureMinimumSectorCoverage(
    allSectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    adjacency: Map<Osid, Osid[]>,
    friendlyOsids: Set<string>,
    componentOf: Map<string, number>,
    state?: GameState,
    perfTime: EnsureMinimumSectorCoveragePerfTimer = (_label, fn) => fn(),
): void {
    const opParticipants = buildOperationParticipantSet(state);
    const brigadeMovementState = state?.military.brigade_movement_state;
    const brigadeMovementOrders = state?.military.brigade_movement_orders;
    const LOCAL_FRONT_RELIEF_MAX_HOPS = 3;

    const canReachSectorFront = (bid: string, sector: CorpsFrontSector): boolean => {
        const f = formations[bid];
        const startOsid = f?.location_osid;
        if (!startOsid) return false;
        const sectorFriendly = getSectorFrontOsids(sector);
        if (sectorFriendly.size === 0) return false;
        if (sectorFriendly.has(startOsid)) return true;

        const visited = new Set<string>([startOsid]);
        const queue: string[] = [startOsid];
        let head = 0;
        while (head < queue.length) {
            const osid = queue[head++]!;
            const neighbors = adjacency.get(osid as Osid);
            if (!neighbors) continue;
            for (const neighbor of neighbors) {
                if (visited.has(neighbor)) continue;
                if (!friendlyOsids.has(neighbor)) continue;
                if (sectorFriendly.has(neighbor)) return true;
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
        return false;
    };

    const claimTypeForSector = (
        sector: CorpsFrontSector,
        brigadeId: FormationId,
    ): 'front' | 'territory' | 'reserve' | null => {
        const formation = formations[brigadeId];
        const locationOsid = formation?.location_osid;
        if (!locationOsid) return null;
        const frontSet = getSectorFrontOsids(sector);
        if (frontSet.has(locationOsid)) return 'front';
        const oneHopBehind = buildOneHopReserveBand(frontSet, adjacency, friendlyOsids);
        if (oneHopBehind.has(locationOsid)) return 'reserve';
        if (sector.territory_osids.includes(locationOsid)) return 'territory';
        return null;
    };

    const pickVacantLocalFrontTargetFromFrontSet = (
        bid: FormationId,
        sectorFrontOsids: ReadonlySet<string>,
        activeCounts: Map<string, number>,
        maxHops = LOCAL_FRONT_RELIEF_MAX_HOPS,
    ): { target: string; dist: number } | null => {
        const formation = formations[bid];
        if (!formation?.location_osid) return null;
        const candidates: Array<{ target: string; dist: number }> = [];
        for (const target of sectorFrontOsids) {
            if ((activeCounts.get(target) ?? 0) !== 0) continue;
            const dist = bfsDistance(formation.location_osid, target, adjacency, friendlyOsids);
            if (!Number.isFinite(dist) || dist > maxHops) continue;
            candidates.push({ target, dist });
        }
        candidates.sort((a, b) => a.dist - b.dist || strictCompare(a.target, b.target));
        return candidates[0] ?? null;
    };

    const pickVacantLocalFrontTarget = (
        bid: FormationId,
        sector: CorpsFrontSector,
        activeCounts: Map<string, number>,
        maxHops = LOCAL_FRONT_RELIEF_MAX_HOPS,
    ): { target: string; dist: number } | null => (
        pickVacantLocalFrontTargetFromFrontSet(
            bid,
            getSectorFrontOsids(sector),
            activeCounts,
            maxHops,
        )
    );

    const moveBrigadeToFrontTarget = (
        bid: FormationId,
        target: string,
        activeCounts: Map<string, number>,
    ): void => {
        const formation = formations[bid];
        if (!formation?.location_osid) return;
        const previous = formation.location_osid;
        formation.location_osid = target;
        formation.entrenchment_turns = 0;
        activeCounts.set(previous, Math.max(0, (activeCounts.get(previous) ?? 0) - 1));
        activeCounts.set(target, (activeCounts.get(target) ?? 0) + 1);
    };

    const sectorsByCorps = new Map<FormationId, CorpsFrontSector[]>();
    for (const s of allSectors) {
        const list = sectorsByCorps.get(s.corps_id) ?? [];
        list.push(s);
        sectorsByCorps.set(s.corps_id, list);
    }
    const sortedCorpsSectorGroups = [...sectorsByCorps.entries()]
        .sort((a, b) => strictCompare(a[0], b[0]));

    // ── Hoisted shared closures ──
    // `needed` and the density-floor constants are declared at function-body scope
    // because Phase E (severe-rescue) references `needed` at 10+ sites and the
    // _perfTime phase wrappers below would otherwise hide Phase B's local
    // declarations from later phases.
    const DENSITY_FLOOR_EDGES_PER_BRIGADE = 8;
    const DENSITY_FLOOR_THREAT_GATE = 300;
    const needed = (s: CorpsFrontSector): number =>
        Math.max(1, Math.ceil(s.length_edges / DENSITY_FLOOR_EDGES_PER_BRIGADE));
    const sectorComponentCache = new Map<CorpsFrontSector, number>();
    const componentForSector = (sector: CorpsFrontSector): number => {
        const cached = sectorComponentCache.get(sector);
        if (cached !== undefined) return cached;
        const computed = getSectorComponent(sector, componentOf);
        sectorComponentCache.set(sector, computed);
        return computed;
    };

    perfTime('ensureMinimumSectorCoverage:territory-claim-rescue', () => {
    // ── Pre-pass: territory-claim rescue for zero-brigade split children ──────────
    // splitNonContiguousSectors intentionally emits non-largest children with empty
    // brigade lists, relying on classifyBrigadesByTerritory to fill them. That fill
    // fails when Phase 1 exhausts all brigades into the largest child and the
    // cross-component filter in Step 2 prevents donation across the disconnected
    // front. This pass resolves it by treating physical territory membership as
    // authoritative: if a brigade's location_osid is in the zero-child's
    // territory_osids, it belongs there regardless of component boundaries.
    // No BFS required — the brigade is already there.
    perfTime('ensureMinimumSectorCoverage:territory-claim-rescue:zero-front', () => {
    for (const [, corpsSectors] of sortedCorpsSectorGroups) {
        const zeroFrontSectors = corpsSectors
            .filter(s => s.assigned_brigade_ids.length === 0 && s.length_edges > 0)
            .sort((a, b) => strictCompare(a.sector_id, b.sector_id));

        for (const zero of zeroFrontSectors) {
            const zeroTerritory = new Set(zero.territory_osids);
            const zeroFrontOsids = getSectorFrontOsids(zero);
            if (zeroTerritory.size === 0) continue;

            // Collect (donor sector, brigade id) candidates: brigades physically in
            // the zero-child's territory that can be spared (donor retains ≥ 1).
            const candidates: Array<{
                donor: CorpsFrontSector;
                bid: FormationId;
                rescueKind: 'territory' | 'shared_front_overlap';
            }> = [];
            for (const s of corpsSectors) {
                if (s.sector_id === zero.sector_id) continue;
                if (s.corps_id !== zero.corps_id) continue;
                if (s.assigned_brigade_ids.length <= 1) continue; // donor must retain ≥ 1

                const donorFrontOsids = getSectorFrontOsids(s);
                for (const bid of [...s.assigned_brigade_ids].sort(strictCompare)) {
                    const f = formations[bid];
                    if (!f?.location_osid) continue;
                    if (!zeroTerritory.has(f.location_osid)) continue;  // not in zero-child territory
                    if (donorFrontOsids.has(f.location_osid)) {
                        const sharedFrontOverlap = zeroFrontOsids.has(f.location_osid);
                        const sameComponent = componentForSector(s) === componentForSector(zero);
                        if (!sharedFrontOverlap) continue;
                        if (!sameComponent) continue;
                        candidates.push({ donor: s, bid, rescueKind: 'shared_front_overlap' });
                        continue;
                    }
                    candidates.push({ donor: s, bid, rescueKind: 'territory' });
                }
            }

            if (candidates.length === 0) continue;

            // Best candidate: prefer pure territory rescues, then donor with most surplus.
            candidates.sort((a, b) =>
                Number(a.rescueKind !== 'territory') - Number(b.rescueKind !== 'territory')
                || b.donor.assigned_brigade_ids.length - a.donor.assigned_brigade_ids.length
                || strictCompare(a.donor.sector_id, b.donor.sector_id)
                || strictCompare(a.bid, b.bid)
            );

            const { donor, bid } = candidates[0]!;
            const idx = donor.assigned_brigade_ids.indexOf(bid);
            if (idx >= 0) {
                donor.assigned_brigade_ids.splice(idx, 1);
                zero.assigned_brigade_ids.push(bid);
            }
        }
    }
    });

    perfTime('ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned', () => {
    for (const [, corpsSectors] of sortedCorpsSectorGroups) {
        for (const sector of corpsSectors) {
            if (sector.assigned_brigade_ids.length > 0) continue;

            const sectorComp = componentForSector(sector);
            const sectorFrontOsids = getSectorFrontOsids(sector);
            const sameComponentDonors = corpsSectors
                .filter(s =>
                    s.sector_id !== sector.sector_id
                    && componentForSector(s) === sectorComp);

            // Step 1: promote first connected reserve to assigned
            const promotedReserve = perfTime('ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned:promote-reserve', () => {
                if (sector.reserve_brigade_ids.length === 0) return false;
                const activeCounts = countActiveBrigadesByOsid(formations);
                for (let ri = 0; ri < sector.reserve_brigade_ids.length; ri++) {
                    const bid = sector.reserve_brigade_ids[ri]!;
                    const target = pickVacantLocalFrontTargetFromFrontSet(bid, sectorFrontOsids, activeCounts);
                    if (target) {
                        sector.reserve_brigade_ids.splice(ri, 1);
                        moveBrigadeToFrontTarget(bid, target.target, activeCounts);
                        sector.assigned_brigade_ids.push(bid);
                        return true;
                    }
                }
                return false;
            });
            if (promotedReserve) continue;

            // Step 1b: pull the nearest reachable same-corps rear brigade.
            const pulledRear = perfTime('ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned:pull-rear', () => {
                const rearDonors = sameComponentDonors
                    .filter(s => (s.rear_brigade_ids?.length ?? 0) > 0);
                if (rearDonors.length === 0) return false;
                // Hoisted from inside the flatMap callback: formations is read-only
                // across donor iterations within this step, so the per-donor rebuild
                // produced identical activeCounts maps. Byte-identical because
                // pickVacantLocalFrontTargetFromFrontSet(...) consumes activeCounts read-only;
                // the post-pick moveBrigadeToFrontTarget below can reuse the same
                // map because no formation location changes between pick and move.
                const stepActiveCounts = countActiveBrigadesByOsid(formations);
                const rearCandidates = rearDonors
                    .flatMap((donor) => {
                        return [...(donor.rear_brigade_ids ?? [])]
                            .sort(strictCompare)
                            .map((bid) => {
                                const target = pickVacantLocalFrontTargetFromFrontSet(bid, sectorFrontOsids, stepActiveCounts);
                                return target ? { donor, bid, dist: target.dist, target: target.target } : null;
                            });
                    })
                    .filter((entry): entry is { donor: CorpsFrontSector; bid: FormationId; dist: number; target: string } => entry != null)
                    .sort((a, b) =>
                        a.dist - b.dist
                        || strictCompare(a.donor.sector_id, b.donor.sector_id)
                        || strictCompare(a.bid, b.bid)
                    );
                if (rearCandidates.length > 0) {
                    const { donor, bid, target } = rearCandidates[0]!;
                    donor.rear_brigade_ids = (donor.rear_brigade_ids ?? []).filter((candidate) => candidate !== bid);
                    moveBrigadeToFrontTarget(bid, target, stepActiveCounts);
                    sector.assigned_brigade_ids.push(bid);
                    return true;
                }
                return false;
            });
            if (pulledRear) continue;

            // Step 1c: if no rear brigade exists, pull the nearest reachable same-corps reserve.
            const pulledReserve = perfTime('ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned:pull-reserve', () => {
                const reserveDonors = sameComponentDonors
                    .filter(s => s.reserve_brigade_ids.length > 0);
                if (reserveDonors.length === 0) return false;
                // Hoisted from inside the flatMap callback (same justification as Step 1b).
                const stepActiveCounts = countActiveBrigadesByOsid(formations);
                const reserveCandidates = reserveDonors
                    .flatMap((donor) => {
                        return [...donor.reserve_brigade_ids]
                            .sort(strictCompare)
                            .map((bid) => {
                                const target = pickVacantLocalFrontTargetFromFrontSet(bid, sectorFrontOsids, stepActiveCounts);
                                return target ? { donor, bid, dist: target.dist, target: target.target } : null;
                            });
                    })
                    .filter((entry): entry is { donor: CorpsFrontSector; bid: FormationId; dist: number; target: string } => entry != null)
                    .sort((a, b) =>
                        a.dist - b.dist
                        || strictCompare(a.donor.sector_id, b.donor.sector_id)
                        || strictCompare(a.bid, b.bid)
                    );
                if (reserveCandidates.length > 0) {
                    const { donor, bid, target } = reserveCandidates[0]!;
                    donor.reserve_brigade_ids = donor.reserve_brigade_ids.filter((candidate) => candidate !== bid);
                    moveBrigadeToFrontTarget(bid, target, stepActiveCounts);
                    sector.assigned_brigade_ids.push(bid);
                    return true;
                }
                return false;
            });
            if (pulledReserve) continue;

            // Step 2: transfer from surplus within the same connected component only.
            // If a component has no donor, the sector stays under-covered rather than
            // minting false cross-component sector truth.
            // NOTE on hop ceiling: bfsToNearestSector used here has no explicit max-hop
            // limit by design. If a brigade cannot reach the sector front through friendly
            // territory at all (returns null), the transfer is skipped and the sector
            // remains understaffed. This is intentional — pulling a physically unreachable
            // brigade across a disconnected front would manufacture false assignment truth.
            perfTime('ensureMinimumSectorCoverage:territory-claim-rescue:zero-assigned:transfer-surplus', () => {
                let transferred = false;

                // Pass A: same connected component (original behavior)
                const sameCompSectors = sameComponentDonors
                    .filter(s => s.assigned_brigade_ids.length > 1
                        && s.sector_id !== sector.sector_id)
                    .sort((a, b) => b.assigned_brigade_ids.length - a.assigned_brigade_ids.length || strictCompare(a.sector_id, b.sector_id));

                for (const donor of sameCompSectors) {
                    const donorFront = getSectorFrontOsids(donor);
                    for (const bid of [...donor.assigned_brigade_ids].sort(strictCompare)) {
                        const f = formations[bid];
                        if (!f?.location_osid) continue;
                        if (donorFront.has(f.location_osid)) continue;
                        if (claimTypeForSector(donor, bid) !== null) continue;
                        if (!canReachSectorFront(bid, sector)) continue;
                        const idx = donor.assigned_brigade_ids.indexOf(bid);
                        if (idx >= 0) donor.assigned_brigade_ids.splice(idx, 1);
                        sector.assigned_brigade_ids.push(bid);
                        transferred = true;
                        break;
                    }
                    if (transferred) break;
                }
                if (!transferred) {
                    for (const donor of sameCompSectors) {
                        if (donor.assigned_brigade_ids.length <= 1) continue;
                        const bid = [...donor.assigned_brigade_ids]
                            .sort(strictCompare)
                            .reverse()
                            .find((candidateBid) => claimTypeForSector(donor, candidateBid) === null);
                        if (!bid) continue;
                        if (!canReachSectorFront(bid, sector)) continue;
                        const idx = donor.assigned_brigade_ids.indexOf(bid);
                        if (idx >= 0) donor.assigned_brigade_ids.splice(idx, 1);
                        sector.assigned_brigade_ids.push(bid);
                        transferred = true;
                        break;
                    }
                }
            });
        }
    }

    });
    });

    perfTime('ensureMinimumSectorCoverage:density-floor', () => {
    // ── Density floor pass (n701→n750) ──
    // DENSITY_FLOOR_EDGES_PER_BRIGADE / DENSITY_FLOOR_THREAT_GATE / `needed`
    // are hoisted to function-body scope above so Phase E can reference them.

    for (const [, corpsSectors] of sortedCorpsSectorGroups) {
        const underStaffed = corpsSectors
            .filter(s =>
                s.assigned_brigade_ids.length > 0
                && s.assigned_brigade_ids.length < needed(s)
                && (s.threat_ratio ?? 0) > DENSITY_FLOOR_THREAT_GATE)
            .sort((a, b) =>
                (needed(b) - b.assigned_brigade_ids.length) - (needed(a) - a.assigned_brigade_ids.length)
                || strictCompare(a.sector_id, b.sector_id));

        for (const recipient of underStaffed) {
            const deficit = needed(recipient) - recipient.assigned_brigade_ids.length;
            const recipComp = componentForSector(recipient);
            const donors = corpsSectors
                .filter(s =>
                    s.sector_id !== recipient.sector_id
                    && componentForSector(s) === recipComp
                    && s.assigned_brigade_ids.length > needed(s))
                .sort((a, b) =>
                    (b.assigned_brigade_ids.length - needed(b)) - (a.assigned_brigade_ids.length - needed(a))
                    || strictCompare(a.sector_id, b.sector_id));

            let transferred = 0;
            for (const donor of donors) {
                if (transferred >= deficit) break;
                if (donor.assigned_brigade_ids.length <= needed(donor)) continue;

                const donorFront = getSectorFrontOsids(donor);
                let bid: string | undefined;
                for (const b of [...donor.assigned_brigade_ids].sort(strictCompare)) {
                    const f = formations[b];
                    if (f?.location_osid && !donorFront.has(f.location_osid)) { bid = b; break; }
                }
                if (!bid && donor.assigned_brigade_ids.length > needed(donor)) {
                    bid = [...donor.assigned_brigade_ids]
                        .sort(strictCompare)
                        .reverse()
                        .find((candidateBid) => claimTypeForSector(donor, candidateBid) === null);
                }
                if (!bid) continue;
                if (claimTypeForSector(donor, bid) !== null) continue;
                if (!canReachSectorFront(bid, recipient)) continue;

                const idx = donor.assigned_brigade_ids.indexOf(bid);
                if (idx >= 0) {
                    donor.assigned_brigade_ids.splice(idx, 1);
                    recipient.assigned_brigade_ids.push(bid);
                    transferred++;
                }
            }
        }
    }

    });

    perfTime('ensureMinimumSectorCoverage:idle-equalization', () => {
    // ── Idle equalization pass (Step 7c) ──
    const EQUALIZATION_DONOR_MAX_THREAT = 25;
    const EQUALIZATION_MIN_DONOR_DENSITY = 0.90;
    const EQUALIZATION_MAX_RECIP_DENSITY = 0.25;
    const EQUALIZATION_MAX_TRANSFERS = 1;

    for (const [, corpsSectors] of sortedCorpsSectorGroups) {
        const overDense = corpsSectors
            .filter(s =>
                s.assigned_brigade_ids.length > 1
                && s.length_edges > 0
                && s.assigned_brigade_ids.length / s.length_edges >= EQUALIZATION_MIN_DONOR_DENSITY
                && (s.threat_ratio ?? 0) <= EQUALIZATION_DONOR_MAX_THREAT)
            .sort((a, b) =>
                (b.assigned_brigade_ids.length / b.length_edges)
                - (a.assigned_brigade_ids.length / a.length_edges)
                || strictCompare(a.sector_id, b.sector_id));

        const thin = corpsSectors
            .filter(s =>
                s.assigned_brigade_ids.length > 0
                && s.length_edges > 0
                && s.assigned_brigade_ids.length / s.length_edges < EQUALIZATION_MAX_RECIP_DENSITY)
            .sort((a, b) =>
                (a.assigned_brigade_ids.length / a.length_edges)
                - (b.assigned_brigade_ids.length / b.length_edges)
                || strictCompare(a.sector_id, b.sector_id));

        for (const recipient of thin) {
            const recipComp = componentForSector(recipient);
            let transferred = 0;

            for (const donor of overDense) {
                if (transferred >= EQUALIZATION_MAX_TRANSFERS) break;
                if (donor.sector_id === recipient.sector_id) continue;
                if (componentForSector(donor) !== recipComp) continue;
                if (donor.assigned_brigade_ids.length / donor.length_edges < EQUALIZATION_MIN_DONOR_DENSITY) continue;

                const donorFront = getSectorFrontOsids(donor);
                let bid: string | undefined;
                for (const b of [...donor.assigned_brigade_ids].sort(strictCompare)) {
                    const f = formations[b];
                    if (!f?.location_osid || donorFront.has(f.location_osid)) continue;
                    if (claimTypeForSector(donor, b) !== null) continue;
                    bid = b;
                    break;
                }
                if (!bid) continue;
                if (claimTypeForSector(donor, bid) !== null) continue;
                if (!canReachSectorFront(bid, recipient)) continue;

                const idx = donor.assigned_brigade_ids.indexOf(bid);
                if (idx >= 0) {
                    donor.assigned_brigade_ids.splice(idx, 1);
                    recipient.assigned_brigade_ids.push(bid);
                    transferred++;
                }
            }
        }
    }

    });

    perfTime('ensureMinimumSectorCoverage:moderate-reinforcement', () => {
    // ── Moderate-pressure reinforcement pass (Step 7d) ──
    const PASS_7D_RECIPIENT_MAX_DENSITY = 0.25;
    const PASS_7D_RECIPIENT_MIN_THREAT = 50;
    const PASS_7D_DONOR_MIN_DENSITY = 0.75;
    const PASS_7D_MAX_TRANSFERS = 2;

    for (const [, corpsSectors] of sortedCorpsSectorGroups) {
        const recipients = corpsSectors
            .filter(s =>
                s.assigned_brigade_ids.length > 0
                && s.length_edges > 0
                && s.assigned_brigade_ids.length / s.length_edges < PASS_7D_RECIPIENT_MAX_DENSITY
                && (s.threat_ratio ?? 0) >= PASS_7D_RECIPIENT_MIN_THREAT)
            .sort((a, b) =>
                (a.assigned_brigade_ids.length / a.length_edges)
                - (b.assigned_brigade_ids.length / b.length_edges)
                || strictCompare(a.sector_id, b.sector_id));

        for (const recipient of recipients) {
            const recipComp = componentForSector(recipient);
            let transferred = 0;

            const donors = corpsSectors
                .filter(s =>
                    s.sector_id !== recipient.sector_id
                    && s.assigned_brigade_ids.length > 1
                    && s.length_edges > 0
                    && s.assigned_brigade_ids.length / s.length_edges >= PASS_7D_DONOR_MIN_DENSITY
                    && componentForSector(s) === recipComp)
                .sort((a, b) =>
                    (b.assigned_brigade_ids.length / b.length_edges)
                    - (a.assigned_brigade_ids.length / a.length_edges)
                    || strictCompare(a.sector_id, b.sector_id));

            for (const donor of donors) {
                if (transferred >= PASS_7D_MAX_TRANSFERS) break;
                if (donor.assigned_brigade_ids.length / donor.length_edges < PASS_7D_DONOR_MIN_DENSITY) continue;

                const donorFront = getSectorFrontOsids(donor);
                let bid: string | undefined;
                for (const b of [...donor.assigned_brigade_ids].sort(strictCompare)) {
                    const f = formations[b];
                    if (!f?.location_osid || donorFront.has(f.location_osid)) continue;
                    if (claimTypeForSector(donor, b) !== null) continue;
                    bid = b;
                    break;
                }
                if (!bid) continue;
                if (claimTypeForSector(donor, bid) !== null) continue;
                if (!canReachSectorFront(bid, recipient)) continue;

                const idx = donor.assigned_brigade_ids.indexOf(bid);
                if (idx >= 0) {
                    donor.assigned_brigade_ids.splice(idx, 1);
                    recipient.assigned_brigade_ids.push(bid);
                    transferred++;
                }
            }
        }
    }

    });

    perfTime('ensureMinimumSectorCoverage:severe-rescue', () => {
    // ── Severe undercoverage rescue pass ──
    // Late same-corps rebalance for sectors that remain critically thin even after the
    // ordinary density/equalization passes. Keep this physically truthful: only nearby
    // same-corps reserve/rear brigades are eligible, and they are relocated directly onto
    // the recipient front before the final assignment sync.
    // Late floor-completion pass for quiet but visibly under-held fronts. This is
    // not pressure reinforcement: it only borrows from same-component sectors
    // that remain above their own edge-based floor after the transfer.
    // Quiet self-relief pass:
    // if a sector is already manned but still below its frontage floor, first
    // consume any reachable rear/reserve brigade it already owns before asking a
    // sibling sector to donate. This fixes quiet floor deficits without
    // cannibalizing another sector or requiring threat-gated rescue.
    perfTime('ensureMinimumSectorCoverage:severe-rescue:quiet-self-relief', () => {
    for (const [, corpsSectors] of sortedCorpsSectorGroups) {
        for (const sector of corpsSectors) {
            if (sector.assigned_brigade_ids.length === 0) continue;
            const deficit = Math.max(0, needed(sector) - sector.assigned_brigade_ids.length);
            if (deficit <= 0) continue;

            let promoted = 0;
            while (promoted < deficit) {
                const activeCounts = countActiveBrigadesByOsid(formations);
                const candidates = [
                    ...(sector.rear_brigade_ids ?? []).map((bid) => ({ bid, role: 'rear' as const })),
                    ...sector.reserve_brigade_ids.map((bid) => ({ bid, role: 'reserve' as const })),
                ]
                    .map((entry) => {
                        const formation = formations[entry.bid];
                        if (!formation?.location_osid) return null;
                        if (formation.status !== 'active') return null;
                        if ((formation.disrupted_turns ?? 0) > 0) return null;
                        if (opParticipants.has(entry.bid)) return null;
                        if (brigadeMovementState?.[entry.bid]?.status === 'in_transit') return null;
                        if (brigadeMovementOrders?.[entry.bid]) return null;
                        const target = pickVacantLocalFrontTarget(entry.bid, sector, activeCounts, LOCAL_FRONT_RELIEF_MAX_HOPS);
                        if (!target) return null;
                        return { ...entry, target: target.target, dist: target.dist };
                    })
                    .filter((entry): entry is { bid: FormationId; role: 'rear' | 'reserve'; target: string; dist: number } => entry != null)
                    .sort((a, b) =>
                        Number(a.role !== 'rear') - Number(b.role !== 'rear')
                        || a.dist - b.dist
                        || strictCompare(a.bid, b.bid));

                if (candidates.length === 0) break;
                const best = candidates[0]!;
                if (best.role === 'rear') {
                    sector.rear_brigade_ids = (sector.rear_brigade_ids ?? []).filter((bid) => bid !== best.bid);
                } else {
                    sector.reserve_brigade_ids = sector.reserve_brigade_ids.filter((bid) => bid !== best.bid);
                }
                moveBrigadeToFrontTarget(best.bid, best.target, activeCounts);
                sector.assigned_brigade_ids.push(best.bid);
                promoted++;
            }
        }
    }

    });

    perfTime('ensureMinimumSectorCoverage:severe-rescue:floor-completion', () => {
    const FLOOR_COMPLETION_MAX_RECIPIENT_DENSITY = 0.125;
    const FLOOR_COMPLETION_DONOR_MAX_THREAT = 100;
    const FLOOR_COMPLETION_MIN_DENSITY_ADVANTAGE = 0.05;
    const FLOOR_COMPLETION_MAX_HOPS = LOCAL_FRONT_RELIEF_MAX_HOPS;
    const FLOOR_COMPLETION_MAX_TRANSFERS = 2;

    for (const [, corpsSectors] of sortedCorpsSectorGroups) {
        const recipients = corpsSectors
            .filter((sector) =>
                sector.assigned_brigade_ids.length > 0
                && sector.length_edges > 0
                && sector.assigned_brigade_ids.length < needed(sector)
                && sector.assigned_brigade_ids.length / sector.length_edges < FLOOR_COMPLETION_MAX_RECIPIENT_DENSITY)
            .sort((a, b) =>
                (needed(b) - b.assigned_brigade_ids.length) - (needed(a) - a.assigned_brigade_ids.length)
                || (a.assigned_brigade_ids.length / a.length_edges) - (b.assigned_brigade_ids.length / b.length_edges)
                || strictCompare(a.sector_id, b.sector_id));

        // Per-recipient rebuild kept deliberately. Batch 27 attempted to hoist
        // `countActiveBrigadesByOsid(formations)` to once-per-pass on the theory
        // that moveBrigadeToFrontTarget below updates activeCounts in-place with
        // an identical delta. Byte-identity held (40w hash unchanged) but the
        // hoisted measurement consistently regressed `:floor-completion` from
        // 696 ms to 907 ms across two confirmation runs (n1904 and n1905). The
        // suspected cause is Map sparseness: the hoisted Map accumulates entries
        // for transient OSIDs across the whole pass and V8's lookup cost grows
        // with that footprint, while the per-recipient fresh build produces a
        // tighter Map. Revert documented in BATCH27_FLOOR_COMPLETION_HOIST_REVERT.
        for (const recipient of recipients) {
            const recipComp = componentForSector(recipient);
            const recipientDensity = recipient.assigned_brigade_ids.length / Math.max(1, recipient.length_edges);
            const activeCounts = countActiveBrigadesByOsid(formations);
            const deficit = Math.max(0, needed(recipient) - recipient.assigned_brigade_ids.length);
            let transferred = 0;

            const candidates = corpsSectors
                .filter((donor) =>
                    donor.sector_id !== recipient.sector_id
                    && donor.length_edges > 0
                    && donor.assigned_brigade_ids.length > needed(donor)
                    && (donor.threat_ratio ?? 0) <= FLOOR_COMPLETION_DONOR_MAX_THREAT
                    && donor.assigned_brigade_ids.length / donor.length_edges
                        >= recipientDensity + FLOOR_COMPLETION_MIN_DENSITY_ADVANTAGE
                    && componentForSector(donor) === recipComp)
                .flatMap((donor) => donor.assigned_brigade_ids.map((bid) => ({ donor, bid })))
                .map((entry) => {
                    const formation = formations[entry.bid];
                    if (!formation?.location_osid) return null;
                    if (formation.status !== 'active') return null;
                    if ((formation.disrupted_turns ?? 0) > 0) return null;
                    if (opParticipants.has(entry.bid)) return null;
                    if (brigadeMovementState?.[entry.bid]?.status === 'in_transit') return null;
                    if (brigadeMovementOrders?.[entry.bid]) return null;
                    if (claimTypeForSector(entry.donor, entry.bid) !== 'front') return null;
                    if (entry.donor.assigned_brigade_ids.length <= needed(entry.donor)) return null;

                    const bestTarget = pickVacantLocalFrontTarget(
                        entry.bid,
                        recipient,
                        activeCounts,
                        FLOOR_COMPLETION_MAX_HOPS,
                    );
                    if (!bestTarget) return null;

                    return {
                        ...entry,
                        target: bestTarget.target,
                        dist: bestTarget.dist,
                        // Phase 0 (ADR-0005): redistribution ranking is home-availability.
                        personnel: effectivePersonnel(formation),
                    };
                })
                .filter((entry): entry is {
                    donor: CorpsFrontSector;
                    bid: FormationId;
                    target: string;
                    dist: number;
                    personnel: number;
                } => entry != null)
                .sort((a, b) =>
                    a.dist - b.dist
                    || (a.donor.threat_ratio ?? 0) - (b.donor.threat_ratio ?? 0)
                    || (b.donor.assigned_brigade_ids.length / Math.max(1, b.donor.length_edges))
                        - (a.donor.assigned_brigade_ids.length / Math.max(1, a.donor.length_edges))
                    || b.personnel - a.personnel
                    || strictCompare(a.donor.sector_id, b.donor.sector_id)
                    || strictCompare(a.bid, b.bid));

            for (const candidate of candidates) {
                if (transferred >= Math.min(deficit, FLOOR_COMPLETION_MAX_TRANSFERS)) break;
                if (recipient.assigned_brigade_ids.includes(candidate.bid)) continue;
                if (candidate.donor.assigned_brigade_ids.length <= needed(candidate.donor)) continue;

                const retargeted = pickVacantLocalFrontTarget(
                    candidate.bid,
                    recipient,
                    activeCounts,
                    FLOOR_COMPLETION_MAX_HOPS,
                );
                if (!retargeted) continue;

                candidate.donor.assigned_brigade_ids = candidate.donor.assigned_brigade_ids
                    .filter((bid) => bid !== candidate.bid);
                moveBrigadeToFrontTarget(candidate.bid, retargeted.target, activeCounts);
                recipient.assigned_brigade_ids.push(candidate.bid);
                transferred++;
            }
        }
    }

    });

    perfTime('ensureMinimumSectorCoverage:severe-rescue:severe-relief', () => {
    const SEVERE_RECIPIENT_MAX_DENSITY = 0.125;
    const SEVERE_RECIPIENT_MIN_THREAT = 150;
    const SEVERE_NEARBY_RELIEF_MAX_HOPS = LOCAL_FRONT_RELIEF_MAX_HOPS;
    const SEVERE_MAX_TRANSFERS = 2;
    const SEVERE_FRONT_DONOR_MAX_THREAT = 250;
    const SEVERE_FRONT_DONOR_MIN_DENSITY_ADVANTAGE = 0.05;
    const SEVERE_FRONT_DONOR_RELATIVE_THREAT_FACTOR = 1.2;
    const severeRoleRank = (role: 'rear' | 'reserve' | 'front'): number => (
        role === 'rear' ? 0 : role === 'reserve' ? 1 : 2
    );

    for (const [, corpsSectors] of sortedCorpsSectorGroups) {
        const recipients = corpsSectors
            .filter((sector) =>
                sector.assigned_brigade_ids.length > 0
                && sector.length_edges > 0
                && sector.assigned_brigade_ids.length / sector.length_edges < SEVERE_RECIPIENT_MAX_DENSITY
                && (sector.threat_ratio ?? 0) >= SEVERE_RECIPIENT_MIN_THREAT)
            .sort((a, b) =>
                (a.assigned_brigade_ids.length / a.length_edges) - (b.assigned_brigade_ids.length / b.length_edges)
                || (needed(b) - b.assigned_brigade_ids.length) - (needed(a) - a.assigned_brigade_ids.length)
                || strictCompare(a.sector_id, b.sector_id));

        for (const recipient of recipients) {
            const recipComp = componentForSector(recipient);
            const deficit = Math.max(0, needed(recipient) - recipient.assigned_brigade_ids.length);
            const activeCounts = countActiveBrigadesByOsid(formations);
            const recipientDensity = recipient.assigned_brigade_ids.length / Math.max(1, recipient.length_edges);
            const recipientThreat = recipient.threat_ratio ?? 0;
            let transferred = 0;

            const candidates = corpsSectors
                .filter((sector) =>
                    sector.sector_id !== recipient.sector_id
                    && componentForSector(sector) === recipComp)
                .flatMap((donor) => {
                    const donorDensity = donor.assigned_brigade_ids.length / Math.max(1, donor.length_edges);
                    const donorThreat = donor.threat_ratio ?? 0;
                    const canDonateFront =
                        donor.length_edges > 0
                        && donor.assigned_brigade_ids.length > needed(donor)
                        && donorDensity >= recipientDensity + SEVERE_FRONT_DONOR_MIN_DENSITY_ADVANTAGE
                        && donorThreat <= SEVERE_FRONT_DONOR_MAX_THREAT
                        && recipientThreat >= donorThreat * SEVERE_FRONT_DONOR_RELATIVE_THREAT_FACTOR;
                    const donorEntries = [
                        ...(donor.rear_brigade_ids ?? []).map((bid) => ({ donor, bid, donorRole: 'rear' as const })),
                        ...donor.reserve_brigade_ids.map((bid) => ({ donor, bid, donorRole: 'reserve' as const })),
                        ...(canDonateFront
                            ? donor.assigned_brigade_ids.map((bid) => ({ donor, bid, donorRole: 'front' as const }))
                            : []),
                    ];
                    return donorEntries
                        .map((entry) => {
                            const formation = formations[entry.bid];
                            if (!formation?.location_osid) return null;
                            if (formation.status !== 'active') return null;
                            if ((formation.disrupted_turns ?? 0) > 0) return null;
                            if (opParticipants.has(entry.bid)) return null;
                            if (brigadeMovementState?.[entry.bid]?.status === 'in_transit') return null;
                            if (brigadeMovementOrders?.[entry.bid]) return null;
                            if (entry.donorRole === 'front') {
                                if (claimTypeForSector(entry.donor, entry.bid) !== 'front') return null;
                                if (entry.donor.assigned_brigade_ids.length <= needed(entry.donor)) return null;
                            }

                            const bestTarget = pickVacantLocalFrontTarget(
                                entry.bid,
                                recipient,
                                activeCounts,
                                SEVERE_NEARBY_RELIEF_MAX_HOPS,
                            );
                            if (!bestTarget) return null;

                            return {
                                ...entry,
                                target: bestTarget.target,
                                dist: bestTarget.dist,
                                // Phase 0 (ADR-0005): redistribution ranking is home-availability.
                                personnel: effectivePersonnel(formation),
                            };
                        })
                        .filter((entry): entry is {
                            donor: CorpsFrontSector;
                            bid: FormationId;
                            donorRole: 'rear' | 'reserve' | 'front';
                            target: string;
                            dist: number;
                            personnel: number;
                        } => entry != null);
                })
                .sort((a, b) =>
                    severeRoleRank(a.donorRole) - severeRoleRank(b.donorRole)
                    || a.dist - b.dist
                    || (a.donor.threat_ratio ?? 0) - (b.donor.threat_ratio ?? 0)
                    || (b.donor.assigned_brigade_ids.length / Math.max(1, b.donor.length_edges))
                        - (a.donor.assigned_brigade_ids.length / Math.max(1, a.donor.length_edges))
                    || b.personnel - a.personnel
                    || strictCompare(a.donor.sector_id, b.donor.sector_id)
                    || strictCompare(a.bid, b.bid));

            for (const candidate of candidates) {
                if (transferred >= Math.min(deficit, SEVERE_MAX_TRANSFERS)) break;
                if (recipient.assigned_brigade_ids.includes(candidate.bid)) continue;
                const retargeted = pickVacantLocalFrontTarget(
                    candidate.bid,
                    recipient,
                    activeCounts,
                    SEVERE_NEARBY_RELIEF_MAX_HOPS,
                );
                if (!retargeted) continue;
                const formation = formations[candidate.bid];
                if (!formation?.location_osid) continue;

                if (candidate.donorRole === 'rear') {
                    candidate.donor.rear_brigade_ids = (candidate.donor.rear_brigade_ids ?? [])
                        .filter((bid) => bid !== candidate.bid);
                } else if (candidate.donorRole === 'reserve') {
                    candidate.donor.reserve_brigade_ids = candidate.donor.reserve_brigade_ids
                        .filter((bid) => bid !== candidate.bid);
                } else {
                    if (candidate.donor.assigned_brigade_ids.length <= needed(candidate.donor)) continue;
                    candidate.donor.assigned_brigade_ids = candidate.donor.assigned_brigade_ids
                        .filter((bid) => bid !== candidate.bid);
                }

                moveBrigadeToFrontTarget(candidate.bid, retargeted.target, activeCounts);
                recipient.assigned_brigade_ids.push(candidate.bid);
                transferred++;
            }
        }
    }
    });

    });

    // Sort for determinism
    for (const s of allSectors) s.assigned_brigade_ids.sort(strictCompare);

}

/**
 * Remove brigades that appear in multiple sectors, keeping only the first
 * claim in sector_id order.
 */
export function deduplicateBrigadesAcrossSectors(sectors: CorpsFrontSector[]): void {
    if (sectors.length <= 1) return;
    const claimed = new Set<FormationId>();
    const sorted = [...sectors].sort((a, b) => strictCompare(a.sector_id, b.sector_id));
    for (const sector of sorted) {
        sector.assigned_brigade_ids = sector.assigned_brigade_ids.filter(bid => {
            if (claimed.has(bid)) return false;
            claimed.add(bid);
            return true;
        });
        sector.reserve_brigade_ids = sector.reserve_brigade_ids.filter(bid => {
            if (claimed.has(bid)) return false;
            claimed.add(bid);
            return true;
        });
        sector.rear_brigade_ids = (sector.rear_brigade_ids ?? []).filter(bid => {
            if (claimed.has(bid)) return false;
            claimed.add(bid);
            return true;
        });
    }
}

/**
 * Recompute density, defensive_power, and threat_ratio for all sectors.
 * This MUST run AFTER all brigade-assignment steps.
 */
export function recomputeSectorPowerAndThreat(
    sectors: CorpsFrontSector[],
    formations: Record<FormationId, FormationState>,
    faction: FactionId,
    state: GameState,
): void {
    const enemyPersonnelByOsid = countActiveEnemyPersonnelByOsid(formations, faction);
    for (const s of sectors) {
        s.density = s.length_edges > 0
            ? s.assigned_brigade_ids.length / s.length_edges : 0;
        s.defensive_power = computeLocalFrontDefensivePower(
            formations, s.assigned_brigade_ids, s.length_edges
        );

        const enemyOsids = new Set<string>();
        for (const ss of s.sub_segments) {
            for (const eo of ss.enemy_osids) enemyOsids.add(eo);
        }
        let enemyPower = 0;
        for (const osid of enemyOsids) {
            enemyPower += enemyPersonnelByOsid.get(osid) ?? 0;
        }
        s.threat_ratio = s.defensive_power > 0
            ? enemyPower / s.defensive_power
            : (enemyPower > 0 ? 9999 : 0);

        if (s.threat_ratio > 0 && hasActiveEnemyFeintAgainstSector(state, s, faction)) {
            s.threat_ratio *= FEINT_THREAT_MULTIPLIER;
        }
    }
}

/**
 * Sync sector assignments back to formation.assignment.
 * Clears all brigade assignments first, then populates from sector data.
 * Must run AFTER all sector assignment steps are complete.
 */
export function syncSectorAssignmentsToFormations(
    sectors: Record<string, CorpsFrontSector>,
    formations: Record<FormationId, FormationState>,
    adjacency?: Map<Osid, Osid[]>,
): void {
    // Step 1: Clear assignment for all brigade-kind formations
    const formIds = Object.keys(formations).sort(strictCompare);
    for (const fid of formIds) {
        const f = formations[fid];
        if (!f) continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group'
            && f.kind !== undefined) continue;
        // Only clear sector assignments — preserve edge/region assignments from other systems
        if (f.assignment && f.assignment.kind === 'sector') {
            f.assignment = null;
        }
        // Sub-segment ownership is derived from current frontline sector truth.
        // If a brigade is no longer sector-owned, stale residue must not survive.
        f.assigned_sub_segment_id = undefined;
    }

    // Step 2: Set assignment from sector data
    const sectorIds = Object.keys(sectors).sort(strictCompare);
    for (const sid of sectorIds) {
        const sector = sectors[sid];
        if (!sector) continue;
        const frontSet = getSectorFrontOsids(sector);
        const oneHopBehind = adjacency
            ? buildOneHopReserveBand(
                frontSet,
                adjacency,
                new Set<string>([...sector.territory_osids, ...frontSet]),
            )
            : null;
        const assignmentRoleForClaim = (claim: 'front' | 'reserve' | 'territory'): 'front' | 'reserve' | 'rear' => (
            claim === 'territory' ? 'rear' : claim
        );

        for (const bid of sector.assigned_brigade_ids) {
            const f = formations[bid];
            if (!f) continue;
            const locationOsid = f.location_osid ?? '';
            const assignedClaim = frontSet.has(locationOsid)
                ? 'front'
                : (oneHopBehind?.has(locationOsid))
                    ? 'reserve'
                    : sector.territory_osids.includes(locationOsid)
                        ? 'territory'
                    : null;
            if (!assignedClaim) continue;
            f.assignment = { kind: 'sector', sector_id: sid, role: assignmentRoleForClaim(assignedClaim) };
        }
        for (const bid of sector.reserve_brigade_ids) {
            const f = formations[bid];
            if (!f) continue;
            const locationOsid = f.location_osid ?? '';
            const reserveClaim = frontSet.has(locationOsid)
                ? 'front'
                : (oneHopBehind?.has(locationOsid))
                    ? 'reserve'
                    : sector.territory_osids.includes(locationOsid)
                        ? 'territory'
                        : (oneHopBehind
                            ? classifySectorPosition(locationOsid, frontSet, oneHopBehind)
                            : 'reserve');
            if (!reserveClaim) continue;
            f.assignment = { kind: 'sector', sector_id: sid, role: assignmentRoleForClaim(reserveClaim) };
        }
        for (const bid of sector.rear_brigade_ids ?? []) {
            const f = formations[bid];
            if (!f) continue;
            const locationOsid = f.location_osid ?? '';
            const rearClaim = frontSet.has(locationOsid)
                ? 'front'
                : (oneHopBehind?.has(locationOsid))
                    ? 'reserve'
                    : sector.territory_osids.includes(locationOsid)
                        ? 'territory'
                    : (oneHopBehind
                        ? classifySectorPosition(locationOsid, frontSet, oneHopBehind)
                        : null);
            if (!rearClaim) continue;
            const rearRole: 'front' | 'rear' = rearClaim === 'front' ? 'front' : 'rear';
            f.assignment = { kind: 'sector', sector_id: sid, role: rearRole };
        }
    }
}
