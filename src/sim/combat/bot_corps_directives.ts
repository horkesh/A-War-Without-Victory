/**
 * Corps directive generation: the HoI-style command hierarchy layer that
 * tells subordinate brigades what to attack, hold, and avoid.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random().
 */

import type { EdgeRecord } from '../../map/settlements.js';
import type { OsidEthnicComposition } from './ethnic_defense.js';
import type {
    CorpsDirective,
    FactionId,
    FormationId,
    FormationState,
    GameState,
} from '../../state/game_state.js';
import type { CorpsFrontSector } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import {
    FACTION_STRATEGIES,
    getActiveDoctrinePhase,
    getCorpsArmyPriorities,
} from './bot_strategy.js';
import { buildOsidAdjacency, type Osid } from './osid_adjacency.js';
import { analyzeFrontGeometry, type FrontGeometryAssessment } from './front_geometry_analysis.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import type { SupplyStateByOsidReport } from '../../state/supply_state_derivation.js';
import { getSeasonalModifiers } from './seasonal_effects.js';
import { evaluateSectorOffensiveLaunch } from './sector_offensive.js';
import { CONFIDENCE_ROUGH_STRENGTH } from './sector_intel_constants.js';
import { getTruceBreakAggressionBonus, shouldGrazBlockAttack, isGrazAccordsActive } from '../local_truces.js';
import { getCorpsCommander, getEffectiveCompetence, assignOperationCommander } from './officer_system.js';
import { concentrateSectorsForOffensive, rearrangeSectorsForCorps } from './sector_rearrangement.js';
import { splitNonContiguousSectors } from './corps_front_sectors.js';
import type { FactionGraphAnalysis } from './osid_graph_analysis.js';
import {
    assessCorpsSupplyHealth,
    getFactionCorps,
    getCorpsSubordinates,
} from './bot_corps_helpers.js';

export const AGGRESSION_FLOOR: Record<string, number> = {
    'offensive': 0.0,
    'balanced': -0.10,
    'defensive': -0.30,
    'reorganize': -0.50,
};

/**
 * Derive which front segments a corps covers, based on where its brigades are.
 * A corps "covers" a front segment if any of its brigades are at an OSID that
 * is an endpoint of one of the segment's hostile boundary edges.
 *
 * Returns Record<corpsId, frontId[]> (sorted).
 * Deterministic: sorted iteration throughout.
 */
export function deriveCorpsFrontMapping(
    state: GameState,
    faction: FactionId
): Map<FormationId, string[]> {
    const result = new Map<FormationId, string[]>();
    const segments = state.assignable_front_segments ?? [];
    const formations = state.formations ?? {};

    // Build brigade_osid → corps_id mapping
    const osidToCorps = new Map<string, Set<string>>();
    for (const id of Object.keys(formations).sort(strictCompare)) {
        const f = formations[id];
        if (!f || f.faction !== faction || f.status !== 'active') continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;
        if (!f.location_osid || !f.corps_id) continue;
        let set = osidToCorps.get(f.location_osid);
        if (!set) { set = new Set(); osidToCorps.set(f.location_osid, set); }
        set.add(f.corps_id);
    }

    // For each front segment, find which corps have brigades at its edge endpoints
    for (const seg of segments) {
        if (seg.side_a !== faction && seg.side_b !== faction) continue;
        // Extract OSIDs from edge_ids (format: "osidA__osidB")
        const segOsids = new Set<string>();
        for (const eid of seg.edge_ids) {
            const parts = eid.split('__');
            if (parts.length === 2) {
                segOsids.add(parts[0]!);
                segOsids.add(parts[1]!);
            }
        }
        // Find corps with brigades at or adjacent to segment OSIDs
        for (const osid of segOsids) {
            const corpsSet = osidToCorps.get(osid);
            if (corpsSet) {
                for (const corpsId of corpsSet) {
                    let list = result.get(corpsId);
                    if (!list) { list = []; result.set(corpsId, list); }
                    if (!list.includes(seg.front_id)) list.push(seg.front_id);
                }
            }
        }
    }

    // Sort each corps's front list
    for (const list of result.values()) list.sort(strictCompare);
    return result;
}

export function collectSectorFriendlyOsids(sector: CorpsFrontSector): string[] {
    const friendlyOsids: string[] = [];
    for (const ss of sector.sub_segments) {
        for (const osid of ss.friendly_osids) {
            if (!friendlyOsids.includes(osid)) {
                friendlyOsids.push(osid);
            }
        }
    }
    friendlyOsids.sort(strictCompare);
    return friendlyOsids;
}

export function collectSectorEnemyOsids(sector: CorpsFrontSector): string[] {
    const enemyOsids: string[] = [];
    for (const ss of sector.sub_segments) {
        for (const osid of ss.enemy_osids) {
            if (!enemyOsids.includes(osid)) {
                enemyOsids.push(osid);
            }
        }
    }
    enemyOsids.sort(strictCompare);
    return enemyOsids;
}

export function areDirectiveSectorsAdjacent(
    a: CorpsFrontSector,
    b: CorpsFrontSector,
    adjacency: Map<Osid, Osid[]>,
): boolean {
    const bFriendly = new Set(collectSectorFriendlyOsids(b));
    for (const osid of collectSectorFriendlyOsids(a)) {
        if (bFriendly.has(osid)) return true;
        for (const neighbor of adjacency.get(osid) ?? []) {
            if (bFriendly.has(neighbor)) return true;
        }
    }
    return false;
}

/**
 * Find OSIDs matching municipality patterns that are enemy-controlled and adjacent to friendly territory.
 * These become offensive targets in the corps directive.
 *
 * Deterministic: sorted output.
 */
export function findTargetOsidsFromMunicipalities(
    state: GameState,
    faction: FactionId,
    targetMunicipalities: string[],
    reverseMap: OperationalToCanonicalReverseMap
): Osid[] {
    if (targetMunicipalities.length === 0) return [];
    const targetSet = new Set(targetMunicipalities);
    const result: Osid[] = [];

    // Iterate over all known OSIDs (from reverseMap keys, not political_controllers)
    const allOsids = [...reverseMap.keys()].sort(strictCompare);
    for (const osid of allOsids) {
        // Check if OSID matches target municipality (OSID format: op:municipality:slug)
        const munMatch = osid.match(/^op:([^:]+):/);
        if (!munMatch) continue;
        const mun = munMatch[1]!;
        if (!targetSet.has(mun)) continue;

        // Must be enemy-controlled
        const ctrl = getPoliticalControllerOSID(state, osid, reverseMap);
        if (ctrl === faction || ctrl === null) continue;

        // No adjacency filter — brigade AI handles reachability via BFS march (Rule 5b)
        // and only attacks adjacent enemies (Rule 5a). Corps lists strategic objectives.
        result.push(osid);
    }
    return result.sort(strictCompare);
}

/**
 * Find OSIDs matching municipality patterns that are friendly-controlled.
 * These become avoid_osids or hold_osids in the corps directive.
 *
 * Deterministic: sorted output.
 */
export function findFriendlyOsidsFromMunicipalities(
    state: GameState,
    faction: FactionId,
    municipalities: string[],
    reverseMap: OperationalToCanonicalReverseMap
): Osid[] {
    if (municipalities.length === 0) return [];
    const munSet = new Set(municipalities);
    const result: Osid[] = [];
    for (const osid of [...reverseMap.keys()].sort(strictCompare)) {
        const munMatch = osid.match(/^op:([^:]+):/);
        if (!munMatch) continue;
        if (!munSet.has(munMatch[1]!)) continue;
        const ctrl = getPoliticalControllerOSID(state, osid, reverseMap);
        if (ctrl === faction) result.push(osid);
    }
    return result;
}

/**
 * Generate CorpsDirective for each corps of a faction.
 *
 * The directive tells subordinate brigades:
 * - Which front segments to cover
 * - Which OSIDs to attack (from army priorities + named operations)
 * - Which OSIDs to hold (chokepoints, corridors, enclaves)
 * - Which OSIDs to avoid
 * - Reserve policy and attack thresholds
 *
 * Called after stance selection and operation management.
 * Deterministic: sorted iteration, no randomness.
 */
export function generateCorpsDirectives(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap | null,
    graphAnalysis: FactionGraphAnalysis | null,
    supplyByOsid?: SupplyStateByOsidReport | null,
    ethnicMap?: OsidEthnicComposition | null
): void {
    const corpsCommand = state.corps_command;
    if (!corpsCommand) return;
    if (!reverseMap) return; // Need operational data for OSID targeting

    const corpsList = getFactionCorps(state, faction);
    const turn = state.meta?.turn ?? 0;
    const corpsFrontMapping = deriveCorpsFrontMapping(state, faction);
    const sectorLookup = state.corps_front_sectors ?? {};
    const adjacency = buildOsidAdjacency(edges);
    const strategy = FACTION_STRATEGIES[faction];
    const doctrinePhase = getActiveDoctrinePhase(faction, turn, state.war_timeline);

    // Army stance is recorded but does not artificially constrain corps behavior.
    // Offensive/defensive posture emerges organically from material capacity.
    const armyStance = state.army_stance?.[faction] ?? 'balanced';
    const armyAggressionBonus = 0;
    const armyReserveModifier = 0;

    for (const corps of corpsList) {
        const cmd = corpsCommand[corps.id];
        if (!cmd) continue;

        const subordinates = getCorpsSubordinates(state, corps.id);
        if (subordinates.length === 0) {
            cmd.directive = null;
            continue;
        }

        // Front segments this corps covers — always use front_id-based mapping so downstream
        // consumers (front_assignment.ts, brigade AI) can match against assignable_front_segments.
        // Sector sub_segment IDs are a separate organizational layer for target filtering only.
        const rawCorpsSectors = Object.values(sectorLookup)
            .filter(s => s.corps_id === corps.id)
            .sort((a, b) => strictCompare(a.sector_id, b.sector_id));

        const pc = state.political_controllers ?? {};
        let corpsSectors = rearrangeSectorsForCorps(
            rawCorpsSectors, corps.id, adjacency,
            {
                politicalControllers: pc as Record<string, string>,
                faction,
            }
        );
        const assignedFrontIds = corpsFrontMapping.get(corps.id) ?? [];

        // Army-level priorities for this corps
        const armyPriorities = getCorpsArmyPriorities(faction, corps.id, turn);

        // Collect offensive targets from army priorities
        const offensiveTargetSet = new Set<Osid>();
        let bestMinOutcome: CorpsDirective['min_attack_outcome'] = 'stalemate';
        const avoidOsids: Osid[] = [...(state.meta.avoided_osids_by_faction?.[faction] ?? [])];

        for (const priority of armyPriorities) {
            // Direct OSID targets (if specified)
            if (priority.target_osids && priority.target_osids.length > 0) {
                for (const osid of priority.target_osids) {
                    const ctrl = getPoliticalControllerOSID(state, osid, reverseMap);
                    if (ctrl !== faction && ctrl !== null && !offensiveTargetSet.has(osid)) {
                        offensiveTargetSet.add(osid);
                    }
                }
            }
            // Municipality-derived targets (always run — additive)
            const targets = findTargetOsidsFromMunicipalities(
                state, faction, priority.target_municipalities, reverseMap
            );
            for (const t of targets) {
                if (!offensiveTargetSet.has(t)) offensiveTargetSet.add(t);
            }
            // Use the most permissive min_outcome from active priorities
            const outcomeRank: Record<string, number> = { decisive_victory: 5, victory: 4, costly_victory: 3, stalemate: 2, repulsed: 1 };
            if ((outcomeRank[priority.min_outcome] ?? 2) < (outcomeRank[bestMinOutcome] ?? 2)) {
                bestMinOutcome = priority.min_outcome;
            }
            // avoid_municipalities removed — bipolar co-ethnic scoring handles deterrence emergently
        }
        // P3: Collect priority municipality slugs for opportunistic target filtering.
        // Opportunistic targets outside these municipalities are filtered to prevent
        // corps spreading into non-priority areas (e.g. 1KK sprawling into Central Corridor).
        const priorityMunicipalities = new Set<string>();
        for (const p of armyPriorities) {
            for (const m of p.target_municipalities) priorityMunicipalities.add(m);
        }

        // Rear-area cleanup: target undefended faction-controlled OSIDs
        // behind the front line with enemy formations. All factions
        // historically secured their rear before pushing forward (BB1 pp496-501).
        // No time gate — rear pockets should be cleared throughout the war.
        if (graphAnalysis) {
            for (const sub of subordinates) {
                const subOsid = sub.location_osid;
                if (!subOsid) continue;
                const neighbors = adjacency.get(subOsid) ?? [];
                for (const neighborOsid of neighbors) {
                    const controller = pc[neighborOsid];
                    if (controller !== faction) continue; // Must be own-controlled
                    // Skip if already a target
                    if (offensiveTargetSet.has(neighborOsid)) continue;
                    // Must have no enemy neighbors (behind front)
                    const neighborNeighbors = adjacency.get(neighborOsid) ?? [];
                    const hasEnemyNeighbor = neighborNeighbors.some(nn => {
                        const nnController = pc[nn];
                        return nnController && nnController !== faction;
                    });
                    if (hasEnemyNeighbor) continue;
                    // Must have enemy formation present (uncleared pocket/holdout)
                    const fmtsEnemy = state.formations ?? {};
                    // Order-independent: existence check via .some()
                    const hasEnemyFormation = Object.values(fmtsEnemy).some(f =>
                        f && f.status === 'active' && f.faction !== faction && f.location_osid === neighborOsid
                    );
                    if (!hasEnemyFormation) continue;
                    offensiveTargetSet.add(neighborOsid);
                }
            }
        }

        // Add targets from active named operation
        if (cmd.active_operation?.phase === 'execution' && cmd.active_operation.target_settlements) {
            for (const sid of cmd.active_operation.target_settlements) {
                const pc = state.political_controllers ?? {};
                if (pc[sid] !== faction && !offensiveTargetSet.has(sid)) {
                    offensiveTargetSet.add(sid);
                }
            }
        }

        // Opportunistic targets: enemy sectors with zero assigned brigades are
        // undefended — add their OSIDs as targets, but only if the enemy sector
        // is adjacent to one of this corps's own sectors. Without this filter,
        // corps accumulate 60+ targets from distant undefended sectors they
        // cannot actually reach.
        {
            const allSectors = state.corps_front_sectors ?? {};
            const corpsEnemyOsids = new Set<string>();
            for (const sec of corpsSectors) {
                for (const sub of sec.sub_segments) {
                    for (const osid of sub.enemy_osids) corpsEnemyOsids.add(osid);
                }
            }
            for (const [_sId, enemySector] of Object.entries(allSectors).sort((a, b) => strictCompare(a[0], b[0]))) {
                if (enemySector.faction === faction) continue;
                if (enemySector.assigned_brigade_ids.length > 0) continue;
                // Only target undefended sectors adjacent to this corps — check if
                // any of the enemy sector's friendly OSIDs appear in our enemy OSIDs
                let isAdjacent = false;
                for (const ss of enemySector.sub_segments) {
                    for (const osid of ss.friendly_osids) {
                        if (corpsEnemyOsids.has(osid)) {
                            isAdjacent = true;
                            break;
                        }
                    }
                    if (isAdjacent) break;
                }
                if (!isAdjacent) continue;
                for (const ss of enemySector.sub_segments) {
                    for (const osid of ss.friendly_osids) {
                        if (!offensiveTargetSet.has(osid)) {
                            offensiveTargetSet.add(osid);
                        }
                    }
                }
            }
        }

        // Pocket targets: enemy OSIDs completely surrounded by faction territory — always attack these.
        // Rear pockets (all neighbors faction-controlled) are targeted even without an adjacent brigade,
        // so reserves will move toward them. Front pockets still require an adjacent brigade.
        // Rear pockets bypass the municipality constraint — they're free territory that should always
        // be consolidated. Front pockets still require operational-area membership to prevent adventurism.
        // Pocket targets: enemy OSIDs from cluster detection (1-3 connected same-controller OSIDs
        // completely surrounded by faction territory). All cluster members are in enemy_pockets.
        // Rear pockets bypass the municipality constraint — they're free territory to consolidate.
        // Front pockets still require operational-area membership to prevent adventurism.
        const rearPocketOsids = new Set<string>();
        if (graphAnalysis?.enemy_pockets.length) {
            const corpsMunSet = new Set<string>(
                armyPriorities.flatMap(p => p.target_municipalities ?? [])
            );
            const pc = state.political_controllers ?? {};
            const pocketSubLocations = new Set(subordinates.map(b => b.location_osid).filter(Boolean));
            // Skip rear pockets that already have a paramilitary dispatched — let paramilitaries handle them
            const paramilitaryTargets = new Set<string>();
            for (const [fid, f] of Object.entries(state.formations ?? {})) {
                if (f.kind === 'paramilitary' && f.status === 'active' && f.paramilitary_target && f.faction === faction) {
                    paramilitaryTargets.add(f.paramilitary_target);
                }
            }
            // Build set of all pocket OSIDs for intra-cluster neighbor filtering
            const allPocketSet = new Set(graphAnalysis.enemy_pockets);
            for (const pocketOsid of graphAnalysis.enemy_pockets) {
                if (offensiveTargetSet.has(pocketOsid)) continue;
                if (paramilitaryTargets.has(pocketOsid)) continue;
                const neighbors = adjacency.get(pocketOsid) ?? [];
                // Rear pocket: all non-cluster neighbors are faction-controlled
                const isRearPocket = neighbors.length > 0 && neighbors.every(n =>
                    allPocketSet.has(n) || (pc[n] ?? '') === faction
                );
                if (isRearPocket) {
                    offensiveTargetSet.add(pocketOsid);
                    rearPocketOsids.add(pocketOsid);
                } else {
                    // Front pockets: still require operational-area membership
                    const pocketMun = pocketOsid.split(':')[1];
                    if (!pocketMun || !corpsMunSet.has(pocketMun)) continue;
                    if (neighbors.some(n => pocketSubLocations.has(n))) {
                        offensiveTargetSet.add(pocketOsid);
                    }
                }
            }
        }

        // Convert to array for filtering/sorting phase
        const offensiveTargets: Osid[] = [...offensiveTargetSet].sort(strictCompare);

        corpsSectors = concentrateSectorsForOffensive(
            corpsSectors,
            corps.id,
            adjacency,
            offensiveTargets,
        );
        // Re-split any non-contiguous sectors created by concentration merges
        corpsSectors = splitNonContiguousSectors(corpsSectors, adjacency);
        for (const oldSec of rawCorpsSectors) {
            delete sectorLookup[oldSec.sector_id];
        }
        for (const newSec of corpsSectors) {
            sectorLookup[newSec.sector_id] = newSec;
        }
        const directiveEligibleSectors = corpsSectors.filter((sec) => sec.length_edges > 0);

        // Hold OSIDs: chokepoints + friendly OSIDs in defensive priority municipalities
        const holdOsids: Osid[] = [];
        // Add chokepoints from graph analysis
        if (graphAnalysis) {
            for (const cp of graphAnalysis.chokepoints) {
                // Only hold if a subordinate brigade is near
                const hasBrigade = subordinates.some(b => b.location_osid === cp);
                if (hasBrigade) holdOsids.push(cp);
            }
        }
        // Add friendly OSIDs in corridor/defensive priority municipalities — but only for
        // non-offensive corps. Offensive corps should be free to attack from defensive-priority
        // positions, not locked into defending. Chokepoints (above) still hold for all stances.
        if (cmd.stance !== 'offensive') {
            const corpsTerritory = new Set<string>();
            for (const sec of corpsSectors) {
                for (const osid of sec.territory_osids) corpsTerritory.add(osid);
                for (const sub of sec.sub_segments) {
                    for (const osid of sub.friendly_osids) corpsTerritory.add(osid);
                }
            }
            const defPriorityOsids = findFriendlyOsidsFromMunicipalities(state, faction, strategy.defensive_priorities, reverseMap);
            for (const osid of defPriorityOsids) {
                if (!corpsTerritory.has(osid)) continue;
                if (graphAnalysis) {
                    const analysis = graphAnalysis.osid_analysis.get(osid);
                    if (analysis && analysis.enemy_neighbors.length > 0 && !holdOsids.includes(osid)) {
                        holdOsids.push(osid);
                    }
                }
            }
        }

        // ── Front Geometry Analysis ──────────────────────────────────────
        const allSectorFriendlyOsids: string[] = [];
        const allSectorEnemyOsids: string[] = [];
        for (const sec of corpsSectors) {
            for (const sub of sec.sub_segments ?? []) {
                for (const osid of sub.friendly_osids) allSectorFriendlyOsids.push(osid);
                for (const osid of sub.enemy_osids) allSectorEnemyOsids.push(osid);
            }
            if (sec.territory_osids) {
                for (const osid of sec.territory_osids) {
                    if (!allSectorFriendlyOsids.includes(osid)) allSectorFriendlyOsids.push(osid);
                }
            }
        }

        let geometry: FrontGeometryAssessment | null = null;
        if (allSectorFriendlyOsids.length > 0 && allSectorEnemyOsids.length > 0) {
            let ethnicNeckThreshold = 0.40;
            if (state.named_officers && state.named_officer_data) {
                const cmdr = getCorpsCommander(corps.id, state);
                if (cmdr) {
                    ethnicNeckThreshold = 0.40 + (3 - cmdr.data.political_reliability) * 0.05;
                }
            }
            geometry = analyzeFrontGeometry(
                faction,
                allSectorFriendlyOsids,
                allSectorEnemyOsids,
                offensiveTargets,
                adjacency,
                ethnicMap,
                ethnicNeckThreshold,
            );
        }

        if (geometry) {
            const cmdr2 = state.named_officers && state.named_officer_data
                ? getCorpsCommander(corps.id, state)
                : null;
            const salientPriorityBoost = cmdr2 ? cmdr2.data.aggressiveness >= 4 : false;

            for (const salient of geometry.enemy_salients) {
                for (const neckOsid of salient.neck_osids) {
                    if (!offensiveTargets.includes(neckOsid) && !avoidOsids.includes(neckOsid)) {
                        if (salientPriorityBoost) {
                            offensiveTargets.unshift(neckOsid);
                        } else {
                            offensiveTargets.push(neckOsid);
                        }
                    }
                }
            }
        }

        // Inject geometry-derived critical holds (unconditional)
        if (geometry) {
            for (const hold of geometry.critical_holds) {
                if (!holdOsids.includes(hold.osid)) {
                    holdOsids.push(hold.osid);
                }
            }
        }

        // Reserve fraction: corps stance base + army stance modifier
        let reserveFraction: number;
        switch (cmd.stance) {
            case 'offensive': reserveFraction = 0.1; break;
            case 'balanced': reserveFraction = 0.2; break;
            case 'defensive': reserveFraction = 0.3; break;
            case 'reorganize': reserveFraction = 0.0; break;
            default: reserveFraction = 0.2;
        }
        reserveFraction = Math.max(0, Math.min(0.5, reserveFraction + armyReserveModifier));

        // Max attackers: offensive/balanced allow concentration, defensive is more cautious
        let maxAttackersPerTarget = cmd.stance === 'defensive' || cmd.stance === 'reorganize' ? 2 : 3;

        // Aggression modifier: doctrine phase + army stance bonus + seasonal adjustment + officer aggressiveness
        const seasonalAdj = getSeasonalModifiers(
            state.meta?.turn ?? 0, state.meta?.scenario_start_date
        ).aggression_adj;
        // Truce-break retaliation: opponent faction broke truce → this faction gets aggression spike
        const truceBreakBonus = getTruceBreakAggressionBonus(faction, state);
        let aggressionModifier = (doctrinePhase?.aggression_modifier ?? 0) + armyAggressionBonus + seasonalAdj + truceBreakBonus;

        // C.1: Named officer aggressiveness shifts corps aggression
        if (state.named_officers && state.named_officer_data) {
            const commander = getCorpsCommander(corps.id, state);
            if (commander) {
                // Shift aggression by (aggressiveness - 3) × 0.08
                const officerAggressionShift = (commander.data.aggressiveness - 3) * 0.08;
                aggressionModifier += officerAggressionShift;
                // Aggressive commanders concentrate more force per target
                if (commander.data.aggressiveness >= 4) {
                    maxAttackersPerTarget = Math.min(maxAttackersPerTarget + 1, 5);
                }
                // Defensive skill modulates reserve fraction
                const defSkillAdj = (commander.data.defensive_skill - 3) * 0.03;
                reserveFraction = Math.max(0.05, Math.min(0.40, reserveFraction + defSkillAdj));
                // High-competence commanders (≥4) accept riskier attacks
                const effComp = getEffectiveCompetence(commander.state, commander.data);
                if (effComp >= 5) {
                    if (bestMinOutcome === 'victory' || bestMinOutcome === 'decisive_victory') {
                        bestMinOutcome = 'costly_victory';
                    }
                } else if (effComp >= 4) {
                    if (bestMinOutcome === 'victory') {
                        bestMinOutcome = 'costly_victory';
                    }
                } else if (effComp <= 2) {
                    if (bestMinOutcome === 'costly_victory') {
                        bestMinOutcome = 'victory';
                    }
                }
            }
        }

        aggressionModifier = Math.max(
            AGGRESSION_FLOOR[cmd.stance] ?? -0.30,
            aggressionModifier
        );

        // Min attack outcome comes from doctrine phase + officer competence.
        // No artificial stance-based overrides.

        // Opportunistic targets are always retained — factions limit their own
        // offensive ambition organically through combat readiness and supply.

        // Supply health gating: critical majority → strip offensive targets
        const supplyHealth = assessCorpsSupplyHealth(subordinates, faction, supplyByOsid);
        if (supplyHealth.critical_fraction > 0.5) {
            offensiveTargets.length = 0;
        }
        // Near-complete supply isolation → upgrade minimum outcome by one rank (max costly_victory).
        // Only applies when almost no brigades have adequate supply (< 5%).
        if (supplyHealth.adequate_fraction < 0.05) {
            const outcomeRank: Record<string, number> = { decisive_victory: 5, victory: 4, costly_victory: 3, stalemate: 2, repulsed: 1 };
            const rankVal = outcomeRank[bestMinOutcome] ?? 2;
            if (rankVal < 3) { // below costly_victory → upgrade to costly_victory
                bestMinOutcome = 'costly_victory';
            }
        }

        // Graz Accords truce: corps-pair truce (Herzegovina) + OSID-level Kiseljak exclusion.
        // Posavina and Krajina HRHB cells are NOT protected — VRS attacks freely.
        if (isGrazAccordsActive(state)) {
            const pc = state.political_controllers ?? {};
            for (let i = offensiveTargets.length - 1; i >= 0; i--) {
                const osid = offensiveTargets[i]!;
                if (shouldGrazBlockAttack(state, corps.id, faction, osid, pc[osid] ?? '')) {
                    offensiveTargets.splice(i, 1);
                }
            }
        }

        // Hard-enforce avoided_osids_by_faction before sector and sort steps:
        // remove any avoided OSID from offensive_targets regardless of how it got there.
        // Must run before sectorTargets is built so avoid list is respected in sector_targets too.
        // Without this, rear-pocket targeting bypasses the avoid list because pioneer attacks
        // skip the score filter and trigger purely on offensive_targets membership.
        if (avoidOsids.length > 0) {
            const avoidSet = new Set(avoidOsids);
            for (let i = offensiveTargets.length - 1; i >= 0; i--) {
                if (avoidSet.has(offensiveTargets[i]!)) offensiveTargets.splice(i, 1);
            }
        }

        // Sector-aware target filtering: restrict to OSIDs adjacent to corps' sectors.
        // Exempt: rear pockets (behind front, always consolidate) and targets adjacent
        // to a subordinate brigade (brigade is right there — don't filter just because
        // the sector assignment doesn't cover that part of the map).
        const subLocsForFilter = new Set(subordinates.map(b => b.location_osid).filter(Boolean));
        const hasAdjacentSubordinate = (osid: Osid): boolean => {
            for (const n of adjacency.get(osid) ?? []) {
                if (subLocsForFilter.has(n)) return true;
            }
            return false;
        };
        if (corpsSectors.length > 0 && offensiveTargets.length > 0) {
            const allSectorEnemyOsids = new Set<string>();
            for (const sec of corpsSectors) {
                for (const ss of sec.sub_segments) {
                    for (const eo of ss.enemy_osids) allSectorEnemyOsids.add(eo);
                }
            }
            const filtered = offensiveTargets.filter(t =>
                allSectorEnemyOsids.has(t) || rearPocketOsids.has(t) || hasAdjacentSubordinate(t)
            );
            // Keep all if filter removes everything (corps needs SOMETHING to aim at)
            if (filtered.length > 0) {
                offensiveTargets.length = 0;
                offensiveTargets.push(...filtered);
            }
        }

        // Multi-sector: populate per-sector offensive targets
        const sectorTargets: Record<string, string[]> = {};
        if (corpsSectors.length > 1 && offensiveTargets.length > 0) {
            for (const sec of corpsSectors) {
                const secEnemyOsids = new Set<string>();
                for (const ss of sec.sub_segments) {
                    for (const eo of ss.enemy_osids) secEnemyOsids.add(eo);
                }
                const secTargets = offensiveTargets.filter(t => secEnemyOsids.has(t));
                if (secTargets.length > 0) {
                    sectorTargets[sec.sector_id] = secTargets.sort(strictCompare);
                }
            }
        }

        // Sector-intel target scoring: prefer thin sectors, deprioritize fortress sectors.
        // Soft weight (+/-2) applied within the supply-aware sort below.
        const intelScoreByOsid = new Map<string, number>();
        if (state.sector_intel && corpsSectors.length > 0) {
            // target OSID -> friendly sector that faces it
            const targetToFriendlySector = new Map<string, string>();
            for (const sec of corpsSectors) {
                for (const ss of sec.sub_segments) {
                    for (const eo of ss.enemy_osids) targetToFriendlySector.set(eo, sec.sector_id);
                }
            }
            // target OSID -> enemy sector that owns it
            const targetToEnemySector = new Map<string, string>();
            for (const [sId, sec] of Object.entries(state.corps_front_sectors!)) {
                if (sec.faction === faction) continue;
                for (const ss of sec.sub_segments) {
                    for (const fo of ss.friendly_osids) targetToEnemySector.set(fo, sId);
                }
            }
            for (const osid of offensiveTargets) {
                const friendlySectorId = targetToFriendlySector.get(osid);
                const enemySectorId = targetToEnemySector.get(osid);
                if (!friendlySectorId || !enemySectorId) continue;
                const rec = state.sector_intel[friendlySectorId]?.find(r => r.enemy_sector_id === enemySectorId);
                if (!rec || rec.confidence < CONFIDENCE_ROUGH_STRENGTH) continue;
                if (rec.strength_category === 'thin') intelScoreByOsid.set(osid, -2);
                else if (rec.strength_category === 'fortress') intelScoreByOsid.set(osid, 2);
                else if (rec.strength_category === 'dense') intelScoreByOsid.set(osid, 1);
            }
        }

        // Supply-aware target sorting: prefer attacking enemy OSIDs with critical/strained supply.
        // Then prefer targets that shorten the line (many friendly neighbors — e.g. Teočak, Šapna:
        // capturing bulges reduces front length and consolidation cost).
        // Deterministic: ties broken by strictCompare (stable for same-supply-state targets).
        offensiveTargets.sort((a, b) => {
            const getSupplyPriority = (osid: string): number => {
                if (!supplyByOsid?.factions) return 2;
                const controller = (state.political_controllers ?? {})[osid];
                if (!controller || controller === faction) return 2;
                const facEntry = supplyByOsid.factions.find(f => f.faction_id === controller);
                if (!facEntry) return 2;
                const osidEntry = facEntry.by_osid.find(e => e.osid === osid);
                if (!osidEntry) return 2;
                if (osidEntry.state === 'critical') return 0;
                if (osidEntry.state === 'strained') return 1;
                return 2;
            };
            const getTargetShapeScore = (osid: string): number => {
                if (geometry?.line_shortening_scores.has(osid)) {
                    return geometry.line_shortening_scores.get(osid)!;
                }
                const neighbors = adjacency.get(osid) ?? [];
                return -(neighbors.filter(n => getPoliticalControllerOSID(state, n, reverseMap) === faction).length);
            };
            const supplyDiff = getSupplyPriority(a) - getSupplyPriority(b);
            if (supplyDiff !== 0) return supplyDiff;
            const intelDiff = (intelScoreByOsid.get(a) ?? 0) - (intelScoreByOsid.get(b) ?? 0);
            if (intelDiff !== 0) return intelDiff;
            const shapeDiff = getTargetShapeScore(a) - getTargetShapeScore(b);
            if (shapeDiff !== 0) return shapeDiff;
            return strictCompare(a, b);
        });
        holdOsids.sort(strictCompare);
        avoidOsids.sort(strictCompare);

        // Sector density balancing: find under-density sectors needing reinforcement.
        // Threat-weighted: sectors facing more enemy forces get proportionally more brigades.
        // Minimum weight of 0.25 per edge ensures undefended fronts still get some coverage.
        const reinforceSectorIds: string[] = [];
        if (directiveEligibleSectors.length > 1) {
            let totalAssigned = 0;
            let totalThreatWeight = 0;
            for (const sec of directiveEligibleSectors) {
                totalAssigned += sec.assigned_brigade_ids.length;
                const threatWeight = sec.length_edges * Math.max(0.25, sec.threat_ratio);
                totalThreatWeight += threatWeight;
            }
            for (const sec of directiveEligibleSectors) {
                const sectorThreatWeight = sec.length_edges * Math.max(0.25, sec.threat_ratio);
                const desiredShare = totalThreatWeight > 0 ? sectorThreatWeight / totalThreatWeight : 0;
                const desiredBrigades = totalAssigned * desiredShare;
                const actual = sec.assigned_brigade_ids.length;
                if (desiredBrigades > 0 && actual < desiredBrigades * 0.5) {
                    reinforceSectorIds.push(sec.sector_id);
                }
            }
            reinforceSectorIds.sort(strictCompare);
        }

        // High defensive_skill commanders prioritize reinforcing sectors with own salients
        if (geometry && geometry.own_salients.length > 0) {
            const cmdr3 = state.named_officers && state.named_officer_data
                ? getCorpsCommander(corps.id, state)
                : null;
            if (cmdr3 && cmdr3.data.defensive_skill >= 4) {
                for (const salient of geometry.own_salients) {
                    for (const sec of corpsSectors) {
                        const secFriendly = new Set<string>();
                        for (const sub of sec.sub_segments ?? []) {
                            for (const osid of sub.friendly_osids) secFriendly.add(osid);
                        }
                        const neckInSector = salient.neck_osids.some(n => secFriendly.has(n));
                        if (neckInSector && reinforceSectorIds.indexOf(sec.sector_id) === -1) {
                            reinforceSectorIds.push(sec.sector_id);
                        }
                    }
                }
            }
        }

        // Priority sector: for offensive/balanced corps, pick the sector with the most
        // offensive targets in its enemy_osids. Brigades will concentrate there.
        let prioritySectorId: string | undefined;
        if ((cmd.stance === 'offensive' || cmd.stance === 'balanced') &&
            directiveEligibleSectors.length > 0 && offensiveTargets.length > 0) {
            const targetSet = new Set(offensiveTargets);
            let bestOverlap = 0;
            for (const sec of directiveEligibleSectors) {
                let overlap = 0;
                for (const ss of sec.sub_segments) {
                    for (const eo of ss.enemy_osids) {
                        if (targetSet.has(eo)) overlap++;
                    }
                }
                if (overlap > bestOverlap) {
                    bestOverlap = overlap;
                    prioritySectorId = sec.sector_id;
                }
            }
        }

        // ── Density equalization: issue explicit brigade reassignment orders ──
        // Identify surplus (>1.3× target) and deficit (<0.7× target) sectors.
        // Move brigades from surplus to deficit, preferring brigades whose home_osid
        // is near the deficit sector and avoiding entrenched brigades.
        const sectorReassignmentOrders: Array<{ brigade_id: string; to_sector_id: string }> = [];
        if (directiveEligibleSectors.length > 1) {
            // ── Intel-driven threat weighting ──
            // Sectors where intel detects enemy offensive preparation or massing
            // get boosted threat weight, attracting more brigades proactively.
            const intelThreatBoost = new Map<string, number>();
            if (state.sector_intel) {
                for (const sec of directiveEligibleSectors) {
                    const records = state.sector_intel[sec.sector_id];
                    if (!records) continue;
                    let maxBoost = 0;
                    for (const rec of records) {
                        if (rec.confidence < CONFIDENCE_ROUGH_STRENGTH) continue;
                        if (rec.offensive_signs) maxBoost = Math.max(maxBoost, 2.0);
                        else if (rec.strength_category === 'fortress') maxBoost = Math.max(maxBoost, 1.5);
                        else if (rec.strength_category === 'dense') maxBoost = Math.max(maxBoost, 1.0);
                    }
                    if (maxBoost > 0) intelThreatBoost.set(sec.sector_id, maxBoost);
                }
            }

            // Pre-compute threat-weighted sector weights (one pass)
            const sectorWeights = new Map<string, number>();
            let totalAssignedForRebalance = 0;
            let totalThreatWeightForRebalance = 0;
            for (const sec of directiveEligibleSectors) {
                totalAssignedForRebalance += sec.assigned_brigade_ids.length;
                const intelBoost = 1.0 + (intelThreatBoost.get(sec.sector_id) ?? 0);
                const w = sec.length_edges * Math.max(0.25, sec.threat_ratio) * intelBoost;
                sectorWeights.set(sec.sector_id, w);
                totalThreatWeightForRebalance += w;
            }
            const sectorDesired = new Map<string, number>();
            const surplusSectors: typeof directiveEligibleSectors = [];
            const deficitSectors: typeof directiveEligibleSectors = [];
            for (const sec of directiveEligibleSectors) {
                const w = sectorWeights.get(sec.sector_id) ?? 0;
                const desired = totalThreatWeightForRebalance > 0
                    ? totalAssignedForRebalance * (w / totalThreatWeightForRebalance) : 0;
                sectorDesired.set(sec.sector_id, desired);
                if (sec.assigned_brigade_ids.length > desired * 1.3 && sec.assigned_brigade_ids.length >= 2) {
                    surplusSectors.push(sec);
                } else if (desired > 0 && sec.assigned_brigade_ids.length < desired * 0.7) {
                    deficitSectors.push(sec);
                }
            }
            // Sort deficit sectors by severity (most under-staffed first)
            deficitSectors.sort((a, b) => {
                const aRatio = a.assigned_brigade_ids.length / (sectorDesired.get(a.sector_id) ?? 1);
                const bRatio = b.assigned_brigade_ids.length / (sectorDesired.get(b.sector_id) ?? 1);
                if (aRatio !== bRatio) return aRatio - bRatio;
                return strictCompare(a.sector_id, b.sector_id);
            });
            const alreadyMoved = new Set<string>();
            const homeCache = state.home_distance_cache ?? {};
            for (const deficit of deficitSectors) {
                const needed = Math.ceil((sectorDesired.get(deficit.sector_id) ?? 0) * 0.7) - deficit.assigned_brigade_ids.length;
                if (needed <= 0) continue;
                let moved = 0;
                // Look for candidates from surplus sectors
                for (const surplus of surplusSectors) {
                    if (moved >= needed) break;
                    const surplusDesired = sectorDesired.get(surplus.sector_id) ?? 0;
                    const canDonate = surplus.assigned_brigade_ids.length - Math.ceil(surplusDesired);
                    if (canDonate <= 0) continue;
                    // Rank surplus brigades: prefer low entrenchment, low home distance to deficit sector
                    const candidates = surplus.assigned_brigade_ids
                        .filter(bid => !alreadyMoved.has(bid))
                        .map(bid => {
                            const bf = state.formations?.[bid];
                            const entrench = bf?.entrenchment_turns ?? 0;
                            const homeDist = homeCache[bid] ?? 0;
                            return { bid, entrench, homeDist };
                        })
                        .filter(c => c.entrench <= 3) // Don't move heavily entrenched brigades
                        .sort((a, b) => {
                            // Prefer less entrenched, then lower home distance (already far from home = more "loose")
                            if (a.entrench !== b.entrench) return a.entrench - b.entrench;
                            if (a.homeDist !== b.homeDist) return b.homeDist - a.homeDist;
                            return strictCompare(a.bid, b.bid);
                        });
                    let donated = 0;
                    for (const c of candidates) {
                        if (moved >= needed || donated >= canDonate) break;
                        sectorReassignmentOrders.push({ brigade_id: c.bid, to_sector_id: deficit.sector_id });
                        alreadyMoved.add(c.bid);
                        moved++;
                        donated++;
                    }
                }
            }
        }

        const directive: CorpsDirective = {
            assigned_front_ids: assignedFrontIds,
            offensive_targets: offensiveTargets,
            hold_osids: holdOsids,
            avoid_osids: avoidOsids,
            max_attackers_per_target: maxAttackersPerTarget,
            reserve_fraction: reserveFraction,
            min_attack_outcome: bestMinOutcome,
            aggression_modifier: aggressionModifier,
            sector_targets: Object.keys(sectorTargets).length > 0 ? sectorTargets : undefined,
            reinforce_sector_ids: reinforceSectorIds.length > 0 ? reinforceSectorIds : undefined,
            priority_sector_id: prioritySectorId,
            sector_reassignment_orders: sectorReassignmentOrders.length > 0 ? sectorReassignmentOrders : undefined,
        };

        cmd.directive = directive;

        // Sector offensive launch evaluation:
        // Launch if offensive/balanced, no active SECTOR operation, and multi-sector corps.
        // Sector offensives replace general_offensive/strategic_defense with targeted multi-OSID push.
        const existingOp = cmd.active_operation;
        // If corps has queued operations, don't launch auto-ops — let queued injection handle it.
        // Don't replace recovery-phase ops — they must complete to accumulate exhaustion.
        const hasQueuedOps = cmd.queued_operations && cmd.queued_operations.length > 0;
        const canLaunchSectorOp = !hasQueuedOps && !existingOp;
        if (canLaunchSectorOp &&
            (cmd.stance === 'offensive' || cmd.stance === 'balanced') &&
            directiveEligibleSectors.length > 0 && offensiveTargets.length > 0) {

            for (const sec of directiveEligibleSectors) {
                const clusterSectors = [sec];
                const clusterFriendlyOsids = new Set(collectSectorFriendlyOsids(sec));
                const clusterEnemyOsids = new Set(collectSectorEnemyOsids(sec));
                let secBrigadeIds = subordinates
                    .filter((b) => b.location_osid && clusterFriendlyOsids.has(b.location_osid))
                    .map((b) => b.id)
                    .sort(strictCompare);

                while (secBrigadeIds.length < 3) {
                    const donorCandidates = directiveEligibleSectors
                        .filter((candidate) =>
                            !clusterSectors.includes(candidate) &&
                            clusterSectors.some((clusterSector) => areDirectiveSectorsAdjacent(clusterSector, candidate, adjacency))
                        )
                        .map((candidate) => {
                            const candidateEnemyOsids = collectSectorEnemyOsids(candidate);
                            const overlap = candidateEnemyOsids.filter((osid) => offensiveTargets.includes(osid)).length;
                            const candidateFriendlyOsids = new Set(collectSectorFriendlyOsids(candidate));
                            const brigadeCount = subordinates.filter((b) => b.location_osid && candidateFriendlyOsids.has(b.location_osid)).length;
                            return { candidate, overlap, brigadeCount, candidateEnemyOsids, candidateFriendlyOsids };
                        })
                        .sort((a, b) => {
                            if (b.overlap !== a.overlap) return b.overlap - a.overlap;
                            if (b.brigadeCount !== a.brigadeCount) return b.brigadeCount - a.brigadeCount;
                            if (a.candidate.length_edges !== b.candidate.length_edges) {
                                return a.candidate.length_edges - b.candidate.length_edges;
                            }
                            return strictCompare(a.candidate.sector_id, b.candidate.sector_id);
                        });
                    const donor = donorCandidates[0];
                    if (!donor) {
                        break;
                    }
                    clusterSectors.push(donor.candidate);
                    for (const osid of donor.candidateFriendlyOsids) clusterFriendlyOsids.add(osid);
                    for (const osid of donor.candidateEnemyOsids) clusterEnemyOsids.add(osid);
                    secBrigadeIds = subordinates
                        .filter((b) => b.location_osid && clusterFriendlyOsids.has(b.location_osid))
                        .map((b) => b.id)
                        .sort(strictCompare);
                }

                const secEnemyOsids = [...clusterEnemyOsids].sort(strictCompare);

                // Only brigades already in the sector cluster participate.
                // If the cluster lacks enough brigades, skip — corps density
                // balancing should reinforce the sector first.
                const finalBrigadeIds = secBrigadeIds;

                // Filter targets to only those adjacent to at least one friendly-held OSID.
                // Removes unreachable deep-enemy targets from operation objectives, preventing
                // operations from launching into cells that have no adjacent RS position to attack from.
                const reachableTargets = offensiveTargets.filter((target) => {
                    const neighbors = adjacency.get(target) ?? [];
                    return neighbors.some((n) => getPoliticalControllerOSID(state, n, reverseMap) === faction);
                });

                const op = evaluateSectorOffensiveLaunch(
                    state, corps.id, sec.sector_id, faction,
                    finalBrigadeIds, secEnemyOsids, reachableTargets, supplyByOsid
                );
                if (op) {
                    cmd.active_operation = op;
                    assignOperationCommander(state, op, corps.id, faction);
                    break; // One offensive at a time per corps
                }
            }
        }
    }
}
