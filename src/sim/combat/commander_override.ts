/**
 * Commander override layer: strategic review of mechanical assignments.
 * Extracted from corps_front_sectors.ts — pure refactoring, zero behavior change.
 */

import type {
    CorpsFrontSector,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getCorpsCommander } from './officer_system.js';
import type { ArmyOperationPriority } from './bot_strategy.js';
import { munFromOsid } from './osid_adjacency.js';
import { getSectorComponent, getSectorFrontOsids } from './sector_utils.js';
import {
    COMMANDER_COMPETENCE_OVERRIDE_THRESHOLD,
    GARRISON_BUDGET_EDGES_PER_BRIGADE,
    PRE_OP_STAGING_WEIGHT_INTEL,
    PRE_OP_STAGING_WEIGHT_STAGING,
} from './corps_front_sectors_constants.js';

export interface CorpsCommanderProfile {
    competence: number;
    aggressiveness: number;
    /** Priority sector from the corps directive (offensive concentration point). */
    prioritySectorId?: string;
    /** sector_id → weight multiplier from active op preparation phases. */
    preStagingSectorWeights: Map<string, number>;
}

export interface CommanderOverride {
    brigade_id: string;
    from_sector_id: string;
    to_sector_id: string;
    reason: 'mission_priority' | 'non_priority_excess' | 'offensive_staging' | 'defensive_critical' | 'position_viability';
}

const DEFENSIVE_CRITICAL_THREAT = 2.0;
const MIN_DONOR_BRIGADES = 1;
const MAX_VIABILITY_WITHDRAWALS_PER_CORPS = 2;
const REAR_GUARD_CORPS = new Set(['vrs_1st_krajina', 'vrs_2nd_krajina']);
const REAR_GUARD_LINE_MAX_HOPS = 6;

function friendlyDistanceToAny(
    startOsid: string,
    targets: Set<string>,
    adjacency: Map<string, string[]>,
    friendlyOsids: Set<string>,
    maxHops = 20
): number | null {
    if (!startOsid || targets.size === 0) return null;
    if (targets.has(startOsid)) return 0;
    const visited = new Set<string>([startOsid]);
    let frontier = [startOsid];
    for (let hop = 1; hop <= maxHops; hop++) {
        const next: string[] = [];
        for (const osid of frontier) {
            for (const nb of adjacency.get(osid) ?? []) {
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

/**
 * Build a CorpsCommanderProfile for each corps that has sectors.
 * Reads named_officers + corps_command from state. Pure — no side effects.
 */
export function buildCorpsCommanderProfiles(
    state: GameState,
    sectors: CorpsFrontSector[],
): Map<string, CorpsCommanderProfile> {
    const profiles = new Map<string, CorpsCommanderProfile>();

    const corpsIds = [...new Set(sectors.map(s => s.corps_id))].sort(strictCompare);

    for (const corpsId of corpsIds) {
        const commander = getCorpsCommander(corpsId, state);
        let competence = 0.3; // generic placeholder when no named commander
        let aggressiveness = 0.5;

        if (commander) {
            const penalty = commander.state.effective_competence_penalty ?? 0;
            // officer_types.ts: competence is 1–5, normalize to 0–1
            competence = Math.max(0, (commander.data.competence - penalty) / 5);
            aggressiveness = commander.data.aggressiveness / 5;
        }

        const corpsCmd = state.military.corps_command?.[corpsId];
        // priority_sector_id is on the CorpsDirective (generated prior turn)
        const prioritySectorId = corpsCmd?.directive?.priority_sector_id;

        // Build pre-op staging weights from the active operation's preparation phase.
        const preStagingSectorWeights = new Map<string, number>();
        for (const op of corpsCmd?.active_operations ?? []) {
            const subPhase = op.preparation_sub_phase;
            const opSectorId = op.sector_id;
            if (subPhase && opSectorId) {
                const weight = subPhase === 'intel_gathering'
                    ? PRE_OP_STAGING_WEIGHT_INTEL
                    : PRE_OP_STAGING_WEIGHT_STAGING;
                const existing = preStagingSectorWeights.get(opSectorId) ?? 0;
                if (weight > existing) preStagingSectorWeights.set(opSectorId, weight);
            }
        }
        if (prioritySectorId && !preStagingSectorWeights.has(prioritySectorId)) {
            preStagingSectorWeights.set(prioritySectorId, PRE_OP_STAGING_WEIGHT_INTEL);
        }

        profiles.set(corpsId, { competence, aggressiveness, prioritySectorId, preStagingSectorWeights });
    }

    return profiles;
}

/**
 * Transfer brigades from surplus sectors to deficit sectors.
 * Shared implementation for all 4 commander override criteria.
 */
function transferBrigadesBetweenSectors(
    deficits: Array<{ sector: CorpsFrontSector; need: number }>,
    donors: CorpsFrontSector[],
    formations: Record<string, FormationState>,
    overrides: CommanderOverride[],
    overriddenBrigadeIds: Set<string>,
    reason: CommanderOverride['reason'],
    componentOf: Map<string, number>,
    floorModifier?: number,
    adjacency?: Map<string, string[]>,
    friendlyOsids?: Set<string>,
): void {
    const takenFromSector = new Map<string, number>();
    for (const { sector: deficit, need: initialNeed } of deficits) {
        let need = initialNeed;
        if (need <= 0) continue;

        const deficitComp = deficit.territory_osids.length > 0
            ? (componentOf.get(deficit.territory_osids[0]) ?? -1)
            : -1;

        for (const donor of donors) {
            if (need <= 0) break;
            const taken = takenFromSector.get(donor.sector_id) ?? 0;
            const currentCount = donor.assigned_brigade_ids.length - taken;
            const donorBudget = Math.ceil(donor.length_edges / GARRISON_BUDGET_EDGES_PER_BRIGADE);
            const floor = Math.max(donorBudget, MIN_DONOR_BRIGADES) + (floorModifier ?? 0);
            const available = currentCount - floor;
            if (available <= 0) continue;

            const candidates = donor.assigned_brigade_ids
                .filter(bid => {
                    if (overriddenBrigadeIds.has(bid)) return false;
                    const f = formations[bid];
                    if (!f) return false;
                    if (!f.location_osid) return false;
                    const brigComp = componentOf.get(f.location_osid) ?? -2;
                    if (!(deficitComp < 0 || brigComp === deficitComp)) return false;
                    if (
                        adjacency && friendlyOsids
                        && REAR_GUARD_CORPS.has(deficit.corps_id)
                        && deficit.corps_id === donor.corps_id
                    ) {
                        const frontSet = new Set<string>();
                        for (const ss of deficit.sub_segments) {
                            for (const o of ss.friendly_osids) frontSet.add(o);
                        }
                        const d = friendlyDistanceToAny(f.location_osid, frontSet, adjacency, friendlyOsids, 20);
                        if (d == null || d > REAR_GUARD_LINE_MAX_HOPS) return false;
                    }
                    return true;
                })
                .map(bid => ({ bid, personnel: formations[bid]?.personnel ?? 0 }))
                .sort((a, b) => a.personnel - b.personnel || strictCompare(a.bid, b.bid));

            const toTransfer = Math.min(need, available, candidates.length);
            for (let i = 0; i < toTransfer; i++) {
                overrides.push({
                    brigade_id: candidates[i].bid,
                    from_sector_id: donor.sector_id,
                    to_sector_id: deficit.sector_id,
                    reason,
                });
                overriddenBrigadeIds.add(candidates[i].bid);
                takenFromSector.set(donor.sector_id, (takenFromSector.get(donor.sector_id) ?? 0) + 1);
                need--;
            }
        }
    }
}

/**
 * Commander review of mechanical brigade-to-sector assignments.
 * A competent corps commander evaluates whether the budget-based assignment
 * serves strategic intent, and issues overrides when it doesn't.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */
export function commanderReviewAssignment(
    corpsId: string,
    sectors: CorpsFrontSector[],
    formations: Record<string, FormationState>,
    armyPriorities: ArmyOperationPriority[],
    commanderProfile: CorpsCommanderProfile,
    componentOf: Map<string, number>,
    adjacency: Map<string, string[]>,
    friendlyOsids: Set<string>,
    opParticipants?: Set<string>,
): CommanderOverride[] {
    if (commanderProfile.competence < COMMANDER_COMPETENCE_OVERRIDE_THRESHOLD) {
        return [];
    }

    const corpsSectors = sectors
        .filter(s => s.corps_id === corpsId)
        .sort((a, b) => strictCompare(a.sector_id, b.sector_id));

    if (corpsSectors.length < 2) {
        return [];
    }

    const overrides: CommanderOverride[] = [];
    const overriddenBrigadeIds = new Set<string>();
    // Pre-seed with operation participants — never reassign brigades mid-operation
    if (opParticipants) {
        for (const bid of opParticipants) overriddenBrigadeIds.add(bid);
    }

    applyMissionCompliance(corpsSectors, formations, armyPriorities, commanderProfile, overrides, overriddenBrigadeIds, componentOf, adjacency, friendlyOsids);
    applyNonPriorityExcess(corpsSectors, formations, armyPriorities, commanderProfile, overrides, overriddenBrigadeIds, componentOf, adjacency, friendlyOsids);
    applyOffensiveStaging(corpsSectors, formations, commanderProfile, overrides, overriddenBrigadeIds, componentOf, adjacency, friendlyOsids);
    applyDefensiveCoherence(corpsSectors, formations, commanderProfile, overrides, overriddenBrigadeIds, componentOf, adjacency, friendlyOsids);
    applyPositionViability(corpsSectors, formations, armyPriorities, commanderProfile, overrides, overriddenBrigadeIds, componentOf, adjacency, friendlyOsids);

    // Execute overrides: splice from source sector, push to target sector
    for (const ov of overrides) {
        const fromSector = corpsSectors.find(s => s.sector_id === ov.from_sector_id);
        const toSector = corpsSectors.find(s => s.sector_id === ov.to_sector_id);
        if (fromSector && toSector) {
            const idx = fromSector.assigned_brigade_ids.indexOf(ov.brigade_id);
            if (idx !== -1) {
                fromSector.assigned_brigade_ids.splice(idx, 1);
                toSector.assigned_brigade_ids.push(ov.brigade_id);
            }
        }
    }

    return overrides;
}

/**
 * Enforce army-level mission priorities: concentrate brigades at sectors
 * facing target municipalities specified by army operation priorities.
 */
function applyMissionCompliance(
    corpsSectors: CorpsFrontSector[],
    formations: Record<string, FormationState>,
    armyPriorities: ArmyOperationPriority[],
    commanderProfile: CorpsCommanderProfile,
    overrides: CommanderOverride[],
    overriddenBrigadeIds: Set<string>,
    componentOf: Map<string, number>,
    adjacency: Map<string, string[]>,
    friendlyOsids: Set<string>,
): void {
    if (armyPriorities.length === 0) return;

    const targetMunicipalities = new Set<string>();
    const municipalityWeight = new Map<string, number>();
    for (const p of armyPriorities) {
        for (const m of p.target_municipalities) {
            targetMunicipalities.add(m);
            const existing = municipalityWeight.get(m) ?? 0;
            if (p.weight > existing) municipalityWeight.set(m, p.weight);
        }
    }
    if (targetMunicipalities.size === 0) return;

    const getMissionWeight = (sector: CorpsFrontSector): number => {
        let maxW = 0;
        for (const seg of sector.sub_segments) {
            for (const hosid of (seg.enemy_osids ?? [])) {
                const muni = munFromOsid(hosid);
                if (muni && targetMunicipalities.has(muni)) {
                    const w = municipalityWeight.get(muni) ?? 0;
                    if (w > maxW) maxW = w;
                }
            }
        }
        return maxW;
    };

    const aggressiveBonus = commanderProfile.aggressiveness >= 0.6 ? 1 : 0;

    const missionDeficits: { sector: CorpsFrontSector; need: number; weight: number }[] = [];
    const nonMissionSurplus: CorpsFrontSector[] = [];

    for (const s of corpsSectors) {
        const mw = getMissionWeight(s);
        const budget = Math.ceil(s.length_edges / GARRISON_BUDGET_EDGES_PER_BRIGADE) + (mw > 0 ? aggressiveBonus : 0);
        if (mw > 0 && s.assigned_brigade_ids.length < budget) {
            missionDeficits.push({ sector: s, need: budget - s.assigned_brigade_ids.length, weight: mw });
        } else if (mw === 0) {
            const sBudget = Math.ceil(s.length_edges / GARRISON_BUDGET_EDGES_PER_BRIGADE);
            if (s.assigned_brigade_ids.length > sBudget && s.assigned_brigade_ids.length > MIN_DONOR_BRIGADES) {
                nonMissionSurplus.push(s);
            }
        }
    }

    if (missionDeficits.length === 0 || nonMissionSurplus.length === 0) return;

    missionDeficits.sort((a, b) => b.weight - a.weight || strictCompare(a.sector.sector_id, b.sector.sector_id));
    nonMissionSurplus.sort((a, b) => a.threat_ratio - b.threat_ratio || strictCompare(a.sector_id, b.sector_id));

    transferBrigadesBetweenSectors(missionDeficits, nonMissionSurplus, formations, overrides, overriddenBrigadeIds, 'mission_priority', componentOf, undefined, adjacency, friendlyOsids);
}

/**
 * Redistribute excess brigades from non-priority sectors to under-garrisoned sectors.
 */
function applyNonPriorityExcess(
    corpsSectors: CorpsFrontSector[],
    formations: Record<string, FormationState>,
    armyPriorities: ArmyOperationPriority[],
    commanderProfile: CorpsCommanderProfile,
    overrides: CommanderOverride[],
    overriddenBrigadeIds: Set<string>,
    componentOf: Map<string, number>,
    adjacency: Map<string, string[]>,
    friendlyOsids: Set<string>,
): void {
    if (armyPriorities.length === 0) return;

    const priorityMunicipalities = new Set<string>();
    for (const p of armyPriorities) {
        for (const m of p.target_municipalities) priorityMunicipalities.add(m);
        if (p.hold_municipalities) {
            for (const m of p.hold_municipalities) priorityMunicipalities.add(m);
        }
    }
    if (priorityMunicipalities.size === 0) return;

    const isSectorPriority = (s: CorpsFrontSector): boolean => {
        for (const seg of s.sub_segments) {
            for (const hosid of (seg.enemy_osids ?? [])) {
                const muni = munFromOsid(hosid);
                if (muni && priorityMunicipalities.has(muni)) return true;
            }
        }
        return false;
    };

    const defensiveKeep = commanderProfile.aggressiveness <= 0.4 ? 1 : 0;

    const donors: CorpsFrontSector[] = [];
    const recipients: { sector: CorpsFrontSector; need: number }[] = [];

    for (const s of corpsSectors) {
        const budget = Math.ceil(s.length_edges / GARRISON_BUDGET_EDGES_PER_BRIGADE);
        const isPriority = isSectorPriority(s);

        if (!isPriority) {
            const effectiveMin = Math.max(budget, MIN_DONOR_BRIGADES) + defensiveKeep;
            if (s.assigned_brigade_ids.length > effectiveMin) {
                donors.push(s);
            }
        }

        if (s.assigned_brigade_ids.length < budget) {
            recipients.push({ sector: s, need: budget - s.assigned_brigade_ids.length });
        }
    }

    if (donors.length === 0 || recipients.length === 0) return;

    recipients.sort((a, b) => b.sector.threat_ratio - a.sector.threat_ratio || strictCompare(a.sector.sector_id, b.sector.sector_id));
    donors.sort((a, b) => a.threat_ratio - b.threat_ratio || strictCompare(a.sector_id, b.sector_id));

    transferBrigadesBetweenSectors(recipients, donors, formations, overrides, overriddenBrigadeIds, 'non_priority_excess', componentOf, defensiveKeep, adjacency, friendlyOsids);
}

/**
 * Stage brigades for planned offensive operations.
 */
function applyOffensiveStaging(
    corpsSectors: CorpsFrontSector[],
    formations: Record<string, FormationState>,
    commanderProfile: CorpsCommanderProfile,
    overrides: CommanderOverride[],
    overriddenBrigadeIds: Set<string>,
    componentOf: Map<string, number>,
    adjacency: Map<string, string[]>,
    friendlyOsids: Set<string>,
): void {
    const weights = commanderProfile.preStagingSectorWeights;
    if (weights.size === 0) return;

    let stagingBonus: number;
    if (commanderProfile.aggressiveness >= 0.6) {
        stagingBonus = 2;
    } else if (commanderProfile.aggressiveness <= 0.4) {
        stagingBonus = 0;
    } else {
        stagingBonus = 1;
    }

    const stagingDeficits: { sector: CorpsFrontSector; need: number }[] = [];
    const stagingSectorIds = new Set<string>();

    for (const s of corpsSectors) {
        const w = weights.get(s.sector_id);
        if (w !== undefined && w >= 1.5) {
            stagingSectorIds.add(s.sector_id);
            const budget = Math.ceil(s.length_edges / GARRISON_BUDGET_EDGES_PER_BRIGADE);
            const desired = budget + stagingBonus;
            if (s.assigned_brigade_ids.length < desired) {
                stagingDeficits.push({ sector: s, need: desired - s.assigned_brigade_ids.length });
            }
        }
    }

    if (stagingDeficits.length === 0) return;

    const donors: CorpsFrontSector[] = [];
    for (const s of corpsSectors) {
        if (stagingSectorIds.has(s.sector_id)) continue;
        if (s.threat_ratio >= DEFENSIVE_CRITICAL_THREAT) continue;
        const budget = Math.ceil(s.length_edges / GARRISON_BUDGET_EDGES_PER_BRIGADE);
        if (s.assigned_brigade_ids.length > budget && s.assigned_brigade_ids.length > MIN_DONOR_BRIGADES) {
            donors.push(s);
        }
    }

    if (donors.length === 0) return;

    stagingDeficits.sort((a, b) => strictCompare(a.sector.sector_id, b.sector.sector_id));
    donors.sort((a, b) => a.threat_ratio - b.threat_ratio || strictCompare(a.sector_id, b.sector_id));

    transferBrigadesBetweenSectors(stagingDeficits, donors, formations, overrides, overriddenBrigadeIds, 'offensive_staging', componentOf, undefined, adjacency, friendlyOsids);
}

/** Reinforce critically threatened defensive sectors by pulling from safe surplus sectors. */
function applyDefensiveCoherence(
    corpsSectors: CorpsFrontSector[],
    formations: Record<string, FormationState>,
    _commanderProfile: CorpsCommanderProfile,
    overrides: CommanderOverride[],
    overriddenBrigadeIds: Set<string>,
    componentOf: Map<string, number>,
    adjacency: Map<string, string[]>,
    friendlyOsids: Set<string>,
): void {
    const deficitSectors = corpsSectors
        .filter(s => {
            const budget = Math.ceil(s.length_edges / GARRISON_BUDGET_EDGES_PER_BRIGADE);
            return s.threat_ratio >= DEFENSIVE_CRITICAL_THREAT && s.assigned_brigade_ids.length < budget;
        })
        .map(s => {
            const budget = Math.ceil(s.length_edges / GARRISON_BUDGET_EDGES_PER_BRIGADE);
            return { sector: s, need: budget - s.assigned_brigade_ids.length };
        })
        .sort((a, b) => b.sector.threat_ratio - a.sector.threat_ratio || strictCompare(a.sector.sector_id, b.sector.sector_id));

    const surplusSectors = corpsSectors
        .filter(s => {
            const budget = Math.ceil(s.length_edges / GARRISON_BUDGET_EDGES_PER_BRIGADE);
            return s.assigned_brigade_ids.length > budget && s.assigned_brigade_ids.length > MIN_DONOR_BRIGADES;
        })
        .sort((a, b) => a.threat_ratio - b.threat_ratio || strictCompare(a.sector_id, b.sector_id));

    if (deficitSectors.length === 0 || surplusSectors.length === 0) return;

    transferBrigadesBetweenSectors(deficitSectors, surplusSectors, formations, overrides, overriddenBrigadeIds, 'defensive_critical', componentOf, undefined, adjacency, friendlyOsids);
}

/**
 * Pull exposed brigades from untenable positions to safer sectors.
 * Exposed = friendly neighbors <= threshold (personality-dependent).
 * Mission-critical positions (hold/target municipalities) are exempt.
 * Cap: MAX_VIABILITY_WITHDRAWALS_PER_CORPS per turn to prevent cascade.
 */
function applyPositionViability(
    corpsSectors: CorpsFrontSector[],
    formations: Record<string, FormationState>,
    armyPriorities: ArmyOperationPriority[],
    commanderProfile: CorpsCommanderProfile,
    overrides: CommanderOverride[],
    overriddenBrigadeIds: Set<string>,
    componentOf: Map<string, number>,
    adjacency: Map<string, string[]>,
    friendlyOsids: Set<string>,
): void {
    // Aggressive commanders (>=0.6) only withdraw when fully encircled (0 friendly neighbors)
    // Balanced/defensive withdraw when nearly encircled (<=1 friendly neighbor)
    const withdrawThreshold = commanderProfile.aggressiveness >= 0.6 ? 0 : 1;

    // Build mission-critical municipality set from army priorities
    const missionMunicipalities = new Set<string>();
    for (const p of armyPriorities) {
        for (const m of p.target_municipalities) missionMunicipalities.add(m);
        if (p.hold_municipalities) {
            for (const m of p.hold_municipalities) missionMunicipalities.add(m);
        }
    }

    // Find exposed brigades across all corps sectors
    const exposedBrigades: Array<{
        brigadeId: string;
        sectorId: string;
        friendlyNeighborCount: number;
        personnel: number;
    }> = [];

    for (const sector of corpsSectors) {
        for (const bid of sector.assigned_brigade_ids) {
            if (overriddenBrigadeIds.has(bid)) continue;
            const f = formations[bid];
            if (!f?.location_osid) continue;

            // Count friendly neighbors
            const neighbors = adjacency.get(f.location_osid) ?? [];
            let friendlyCount = 0;
            for (const n of neighbors) {
                if (friendlyOsids.has(n)) friendlyCount++;
            }

            if (friendlyCount > withdrawThreshold) continue;

            // Check if position is mission-critical
            const mun = munFromOsid(f.location_osid);
            if (mun && missionMunicipalities.has(mun)) continue;

            exposedBrigades.push({
                brigadeId: bid,
                sectorId: sector.sector_id,
                friendlyNeighborCount: friendlyCount,
                personnel: f.personnel ?? 0,
            });
        }
    }

    if (exposedBrigades.length === 0) return;

    // Sort: most exposed first (0 before 1), then weakest first
    exposedBrigades.sort((a, b) =>
        a.friendlyNeighborCount - b.friendlyNeighborCount
        || a.personnel - b.personnel
        || strictCompare(a.brigadeId, b.brigadeId)
    );

    let withdrawCount = 0;
    for (const exposed of exposedBrigades) {
        if (withdrawCount >= MAX_VIABILITY_WITHDRAWALS_PER_CORPS) break;
        const formation = formations[exposed.brigadeId];
        if (!formation?.location_osid) continue;
        const brigadeComponent = componentOf.get(formation.location_osid) ?? -2;

        const safestReachableSector = [...corpsSectors]
            .filter(s => s.sector_id !== exposed.sectorId)
            .map((sector) => {
                if (sector.territory_osids.length === 0) return null;
                const sectorComponent = getSectorComponent(sector, componentOf);
                if (sectorComponent !== brigadeComponent) return null;
                const frontSet = getSectorFrontOsids(sector);
                const distance = friendlyDistanceToAny(
                    formation.location_osid!,
                    frontSet,
                    adjacency,
                    friendlyOsids,
                    20,
                );
                if (distance == null) return null;
                return { sector, distance };
            })
            .filter((candidate): candidate is { sector: CorpsFrontSector; distance: number } => candidate != null)
            .sort((a, b) =>
                a.sector.threat_ratio - b.sector.threat_ratio
                || a.distance - b.distance
                || strictCompare(a.sector.sector_id, b.sector.sector_id)
            )[0];

        if (!safestReachableSector) continue;

        overrides.push({
            brigade_id: exposed.brigadeId,
            from_sector_id: exposed.sectorId,
            to_sector_id: safestReachableSector.sector.sector_id,
            reason: 'position_viability',
        });
        overriddenBrigadeIds.add(exposed.brigadeId);
        withdrawCount++;
    }
}
