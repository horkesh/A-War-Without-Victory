/**
 * zone_detection.ts — Zone classification and corridor detection for v0.8 Corps Commander Intelligence.
 *
 * Partitions corps territory into zones using connected components from SpatialContext.
 * Each disconnected piece of corps territory is a separate zone. Computes corridor width,
 * population value, strategic value, posture, and garrison budgets.
 *
 * Deterministic: sorted iteration via strictCompare, no Math.random(), no Date.now().
 */

import type { FactionId, FormationId, FormationState, CorpsFrontSector } from '../../../state/game_state.js';
import type { SpatialContext } from '../../spatial_context.js';
import type { OsidEthnicComposition } from '../ethnic_defense.js';
import { getCoEthnicShare } from '../ethnic_defense.js';
import { strictCompare } from '../../../state/validateGameState.js';
import type { ZoneAssessment, ZoneId, ZonePosture } from './commander_state.js';
import { GARRISON_EDGES_PER_BRIGADE } from './allocate.js';
import type { FactionGraphAnalysis } from '../osid_graph_analysis.js';

/**
 * Minimum fraction of faction-total friendly OSIDs that must be isolated by
 * removing a chokepoint for the zone to be flagged as must_hold.
 * 0.05 = 5% of faction territory: ~18 OSIDs for RS (~350), ~10 for RBiH (~200).
 * Filters minor valley chokepoints; only strategic corridors (Brcko-scale) qualify.
 */
const MUST_HOLD_MIN_ISOLATED_FRACTION = 0.05;

/**
 * BFS count of reachable OSIDs from `source` through `friendlySet`, excluding
 * `excludeOsid`. Used to measure the cluster size isolated by a chokepoint removal.
 */
function bfsCountExcluding(
    source: string,
    friendlySet: ReadonlySet<string>,
    adjacency: ReadonlyMap<string, readonly string[]>,
    excludeOsid: string,
): number {
    const visited = new Set<string>([source]);
    let frontier = [source];
    while (frontier.length > 0) {
        const next: string[] = [];
        for (const osid of frontier) {
            for (const n of (adjacency.get(osid) ?? [])) {
                if (!visited.has(n) && friendlySet.has(n) && n !== excludeOsid) {
                    visited.add(n);
                    next.push(n);
                }
            }
        }
        frontier = next;
    }
    return visited.size;
}

interface FriendlyComponentFacts {
    members: Set<string>;
    hasZoneOsid: boolean;
    hasOutsideCorpsOsid: boolean;
}

function collectFriendlyComponentsExcluding(
    friendlySet: ReadonlySet<string>,
    adjacency: ReadonlyMap<string, readonly string[]>,
    excludeOsid: string,
    zoneOsidSet: ReadonlySet<string>,
    corpsOsidSet: ReadonlySet<string>,
): FriendlyComponentFacts[] {
    const visited = new Set<string>();
    const components: FriendlyComponentFacts[] = [];

    const sortedFriendly = [...friendlySet].sort(strictCompare);
    for (const source of sortedFriendly) {
        if (source === excludeOsid || visited.has(source)) continue;

        const members = new Set<string>([source]);
        let frontier = [source];
        visited.add(source);
        let hasZoneOsid = zoneOsidSet.has(source);
        let hasOutsideCorpsOsid = !corpsOsidSet.has(source);

        while (frontier.length > 0) {
            const next: string[] = [];
            for (const osid of frontier) {
                for (const n of (adjacency.get(osid) ?? [])) {
                    if (n === excludeOsid || visited.has(n) || !friendlySet.has(n)) continue;
                    visited.add(n);
                    members.add(n);
                    if (zoneOsidSet.has(n)) hasZoneOsid = true;
                    if (!corpsOsidSet.has(n)) hasOutsideCorpsOsid = true;
                    next.push(n);
                }
            }
            next.sort(strictCompare);
            frontier = next;
        }

        components.push({ members, hasZoneOsid, hasOutsideCorpsOsid });
    }

    return components;
}

// ═══════════════════════════════════════════════════════════════════════════
// detectZones — partition corps territory into connected zones
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Partition corps territory into zones using connected components from SpatialContext.
 * Each disconnected piece of corps territory is a separate zone.
 */
export function detectZones(
    corpsId: FormationId,
    faction: FactionId,
    corpsBrigades: FormationState[],
    corpsOsids: string[],
    spatial: SpatialContext,
    sectors: CorpsFrontSector[],
    ethnicMap: OsidEthnicComposition | null,
    graphAnalysis: FactionGraphAnalysis | null = null,
    mustHoldOsids: ReadonlySet<string> = new Set(),
): ZoneAssessment[] {
    // 1. Get connected component map for this faction
    const componentMap = spatial.componentsByFaction.get(faction);
    if (!componentMap) return [];

    const corpsOsidSet = new Set(corpsOsids);
    const allFriendlyOsids = spatial.friendlyOsidsByFaction.get(faction) ?? new Set<string>();

    // 2. Group corps OSIDs by component index
    const componentGroups = new Map<number, string[]>();
    for (const osid of [...corpsOsids].sort(strictCompare)) {
        const compIdx = componentMap.get(osid);
        if (compIdx === undefined) continue;
        let group = componentGroups.get(compIdx);
        if (!group) {
            group = [];
            componentGroups.set(compIdx, group);
        }
        group.push(osid);
    }

    // 3. Find the main body (largest group by OSID count)
    let mainBodyCompIdx = -1;
    let mainBodySize = 0;
    const sortedCompIndices = [...componentGroups.keys()].sort((a, b) => a - b);
    for (const compIdx of sortedCompIndices) {
        const size = componentGroups.get(compIdx)!.length;
        if (size > mainBodySize) {
            mainBodySize = size;
            mainBodyCompIdx = compIdx;
        }
    }

    // 4. Build zone assessments
    const zones: ZoneAssessment[] = [];

    for (const compIdx of sortedCompIndices) {
        const zoneOsids = componentGroups.get(compIdx)!;
        const zoneOsidSet = new Set(zoneOsids);
        const isMainBody = compIdx === mainBodyCompIdx;
        // Use the lex-first OSID as the zone ID anchor — stable across turns even if
        // connected-component indices re-number due to sector changes or brigade movement.
        const zoneId = `zone:${corpsId}:${[...zoneOsids].sort(strictCompare)[0]}` as ZoneId;

        // Count front edges overlapping this zone and collect enemy adjacent OSIDs
        let frontEdgeCount = 0;
        const frontOsidsInZone = new Set<string>();
        const enemyAdjacentSet = new Set<string>();
        for (const sector of sectors) {
            if (sector.corps_id !== corpsId) continue;
            for (const subSeg of sector.sub_segments) {
                // Check if sub-segment overlaps this zone
                let overlapCount = 0;
                for (const osid of subSeg.friendly_osids) {
                    if (zoneOsidSet.has(osid)) {
                        overlapCount++;
                        frontOsidsInZone.add(osid);
                    }
                }
                if (overlapCount > 0) {
                    frontEdgeCount += subSeg.length_edges;
                    for (const eo of subSeg.enemy_osids) {
                        enemyAdjacentSet.add(eo);
                    }
                }
            }
        }
        const enemyAdjacentOsids = [...enemyAdjacentSet].sort(strictCompare);

        // Compute depth via BFS from front OSIDs inward
        const depth = computeZoneDepth(frontOsidsInZone, zoneOsidSet, spatial);

        // Compute corridor width
        const corridorWidth = measureCorridorWidth(
            zoneOsidSet,
            allFriendlyOsids,
            spatial.adjacency as ReadonlyMap<string, readonly string[]>,
            isMainBody,
        );

        // Compute population value (sum of co-ethnic shares)
        let populationValue = 0;
        if (ethnicMap) {
            for (const osid of zoneOsids) {
                populationValue += getCoEthnicShare(osid, faction, ethnicMap);
            }
        }

        // Compute strategic value (connectivity-based)
        const strategicValue = computeStrategicValue(zoneOsidSet, spatial);

        // Identify brigades in this zone
        const assignedBrigadeIds: FormationId[] = [];
        for (const brig of [...corpsBrigades].sort((a, b) => strictCompare(a.id, b.id))) {
            if (brig.location_osid && zoneOsidSet.has(brig.location_osid)) {
                assignedBrigadeIds.push(brig.id);
            }
        }

        // Derive posture
        const posture = derivePosture(corridorWidth, frontEdgeCount, assignedBrigadeIds.length);

        // Compute garrison budget
        const garrisonBudget = frontEdgeCount > 0
            ? Math.ceil(frontEdgeCount / GARRISON_EDGES_PER_BRIGADE[posture])
            : 0;

        // Commitment ratio
        const commitmentRatio = computeCommitmentRatio(frontEdgeCount, assignedBrigadeIds.length);

        // Surplus and deficit
        const surplus = Math.max(0, assignedBrigadeIds.length - garrisonBudget);
        const deficit = Math.max(0, garrisonBudget - assignedBrigadeIds.length);

        // Surplus brigade IDs (last N by sorted order — those beyond garrison budget)
        const surplusBrigades = surplus > 0 ? assignedBrigadeIds.slice(garrisonBudget) : [];

        // Track 1: scenario-authored must_hold.
        // Primary: any zone OSID in the scenario-authored mustHoldOsids set (from briefing).
        // Fallback: sector.must_hold flag (set by external tooling or future player UI).
        const scenarioMustHold = (mustHoldOsids.size > 0 && zoneOsids.some(o => mustHoldOsids.has(o)))
            || sectors.some(sec => sec.must_hold === true && sec.territory_osids.some(o => zoneOsidSet.has(o)));

        // Track 2: engine-derived — zone contains a structural chokepoint whose removal
        // would isolate at least MUST_HOLD_MIN_CLUSTER_SIZE friendly OSIDs.
        const chokepointSet = new Set(graphAnalysis?.chokepoints ?? []);
        const minIsolated = Math.ceil(allFriendlyOsids.size * MUST_HOLD_MIN_ISOLATED_FRACTION);
        // DISABLED: fraction-of-faction-total can't separate RS Brcko (~9%) from ARBiH Central
        // Bosnia valley passes (~8%) — both fall in the same range, so any threshold either
        // over-garrisons ARBiH 4th Corps (cascade → depletion) or misses Brcko.
        // Fix needed: replace fraction with absolute OSID count OR corps-boundary discriminator
        // (only fire if isolated cluster spans a different corps jurisdiction).
        // Track this as a P1 calibration item: run 40w scenario with logging to measure
        // actual Posavina pocket size vs ARBiH valley cluster sizes.
        const engineMustHold = chokepointSet.size > 0 && zoneOsids.some(osid => {
            if (!chokepointSet.has(osid)) return false;
            const neighbors = (spatial.adjacency.get(osid as string) ?? [])
                .filter((n: string) => allFriendlyOsids.has(n) && n !== osid);
            if (neighbors.length < 2) return false;

            const adj = spatial.adjacency as ReadonlyMap<string, readonly string[]>;
            const components = collectFriendlyComponentsExcluding(
                allFriendlyOsids,
                adj,
                osid,
                zoneOsidSet,
                corpsOsidSet,
            );

            const zoneComponent = components.find(component => component.hasZoneOsid);
            if (!zoneComponent) return false;

            return components.some(component =>
                component !== zoneComponent &&
                component.hasOutsideCorpsOsid &&
                component.members.size >= minIsolated
            );
        });

        const isMustHold = scenarioMustHold || engineMustHold;

        zones.push({
            zone_id: zoneId,
            corps_id: corpsId,
            faction,
            osids: zoneOsids,
            front_edge_count: frontEdgeCount,
            depth,
            corridor_width: corridorWidth,
            population_value: populationValue,
            strategic_value: strategicValue,
            posture,
            commitment_ratio: commitmentRatio,
            garrison_budget: garrisonBudget,
            assigned_brigades: assignedBrigadeIds,
            surplus_brigades: surplusBrigades,
            deficit,
            is_main_body: isMainBody,
            enemy_adjacent_osids: enemyAdjacentOsids,
            is_must_hold: isMustHold,
        });
    }

    return zones;
}

// ═══════════════════════════════════════════════════════════════════════════
// measureCorridorWidth — BFS corridor width detection
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BFS corridor width detection.
 * Measures the narrowest connection from a zone to the faction main body.
 * Width <= 1 OSID = besieged, = 2 pressured, >= 3 open.
 *
 * For main body: returns Infinity unless fully encircled (0 exits to friendly territory).
 * For non-main-body zones: counts boundary OSIDs that connect to friendly-but-not-in-zone OSIDs.
 * That count is the corridor width (narrowest cross-section at the zone boundary).
 */
export function measureCorridorWidth(
    zoneOsids: Set<string>,
    allFriendlyOsids: ReadonlySet<string>,
    adjacency: ReadonlyMap<string, readonly string[]>,
    isMainBody: boolean,
): number {
    if (isMainBody) {
        // Main body: check for full encirclement
        // Count zone boundary OSIDs that connect to friendly territory outside this zone
        let exitCount = 0;
        for (const osid of [...zoneOsids].sort(strictCompare)) {
            const neighbors = adjacency.get(osid);
            if (!neighbors) continue;
            for (const n of neighbors) {
                if (!zoneOsids.has(n) && allFriendlyOsids.has(n)) {
                    exitCount++;
                    break; // Count each OSID once
                }
            }
        }
        // Main body with exits to friendly territory is not encircled
        // Main body with no external friendly connections: could be the entire faction territory
        // (which is normal, not besieged) — only return 0 if zone is small subset
        // Since main body IS the largest component, return Infinity
        return Infinity;
    }

    // Non-main-body zone: count boundary OSIDs connecting to friendly-but-not-in-zone territory
    // This is the corridor width at the zone boundary
    let corridorWidth = 0;
    for (const osid of [...zoneOsids].sort(strictCompare)) {
        const neighbors = adjacency.get(osid);
        if (!neighbors) continue;
        for (const n of neighbors) {
            if (!zoneOsids.has(n) && allFriendlyOsids.has(n)) {
                corridorWidth++;
                break; // Count each zone boundary OSID with external-friendly access once
            }
        }
    }
    return corridorWidth;
}

// ═══════════════════════════════════════════════════════════════════════════
// computeCommitmentRatio
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute commitment ratio for a zone.
 * SRK example: 80 edges / 9 brigades = 8.9 = fully committed.
 */
export function computeCommitmentRatio(frontEdges: number, brigadeCount: number): number {
    if (brigadeCount <= 0) return frontEdges > 0 ? Infinity : 0;
    return frontEdges / brigadeCount;
}

// ═══════════════════════════════════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BFS depth from front OSIDs inward through the zone.
 * Returns the maximum BFS distance from any front OSID to the deepest interior OSID.
 */
function computeZoneDepth(
    frontOsids: Set<string>,
    zoneOsids: Set<string>,
    spatial: SpatialContext,
): number {
    if (frontOsids.size === 0) return 0;

    const visited = new Set<string>(frontOsids);
    let frontier = [...frontOsids].sort(strictCompare);
    let maxDepth = 0;

    while (frontier.length > 0) {
        const next: string[] = [];
        for (const osid of frontier) {
            const neighbors = spatial.adjacency.get(osid as string);
            if (!neighbors) continue;
            for (const n of neighbors) {
                if (!visited.has(n) && zoneOsids.has(n)) {
                    visited.add(n);
                    next.push(n);
                }
            }
        }
        if (next.length > 0) {
            maxDepth++;
            next.sort(strictCompare);
        }
        frontier = next;
    }

    return maxDepth;
}

/**
 * Compute strategic value from connectivity.
 * Higher connectivity = more strategically important (junction point, crossroads).
 * Counts OSIDs with >= 4 friendly neighbors (chokepoints/junctions) and uses
 * average connectivity as baseline.
 */
function computeStrategicValue(
    zoneOsids: Set<string>,
    spatial: SpatialContext,
): number {
    let totalConnections = 0;
    let chokepoints = 0;

    for (const osid of [...zoneOsids].sort(strictCompare)) {
        const neighbors = spatial.adjacency.get(osid as string);
        if (!neighbors) continue;
        let friendlyNeighborCount = 0;
        for (const n of neighbors) {
            if (zoneOsids.has(n)) friendlyNeighborCount++;
        }
        totalConnections += friendlyNeighborCount;
        if (friendlyNeighborCount >= 4) chokepoints++;
    }

    const avgConnectivity = zoneOsids.size > 0 ? totalConnections / zoneOsids.size : 0;
    // Strategic value: weighted sum of chokepoint density and average connectivity
    return chokepoints * 2 + avgConnectivity;
}

/**
 * Derive zone posture from corridor width, front edge count, and brigade count.
 */
function derivePosture(
    corridorWidth: number,
    frontEdgeCount: number,
    brigadeCount: number,
): ZonePosture {
    if (corridorWidth <= 1) return 'besieged';

    // Compute garrison budget for 'balanced' to determine surplus/deficit
    const balancedBudget = frontEdgeCount > 0
        ? Math.ceil(frontEdgeCount / GARRISON_EDGES_PER_BRIGADE.balanced)
        : 0;
    const surplus = brigadeCount - balancedBudget;

    if (surplus >= 3) return 'projecting';
    if (surplus < 0) return 'defending';
    return 'balanced';
}

