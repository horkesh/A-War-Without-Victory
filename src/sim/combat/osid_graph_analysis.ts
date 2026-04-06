/**
 * OSID strategic graph analysis — computed once per turn, shared across all faction AIs.
 *
 * Provides: front classification, chokepoint detection, salient detection, civilian weight,
 * weak point detection, supply connectivity analysis.
 *
 * Deterministic: all iteration sorted; no randomness.
 * Canon: BOT_AI_DESIGN_SPEC.md §3.2–§3.4, §7.
 */

import type {
    FactionId,
    FormationState,
    GameState
} from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { OperationalToCanonicalReverseMap } from '../../data/operational_data.js';
import { type Osid } from './osid_adjacency.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type FrontClassification = 'undefended' | 'critical' | 'threatened' | 'active' | 'quiet' | 'interior';

export interface OsidAnalysis {
    osid: Osid;
    controller: FactionId | null;
    /** Adjacent enemy OSIDs. */
    enemy_neighbors: Osid[];
    /** Adjacent friendly OSIDs. */
    friendly_neighbors: Osid[];
    /** Brigade present at this OSID (if any, first match). */
    brigade_id: string | null;
    /** Brigade power at this OSID. */
    brigade_power: number;
    /** Total enemy brigade power across adjacent enemy OSIDs. */
    enemy_threat: number;
    /** Front classification for this OSID. */
    classification: FrontClassification;
    /** Civilian weight (co-ethnic population at risk if this OSID is lost). */
    civilian_weight: number;
    /** True if losing this OSID disconnects friendly territory (chokepoint). */
    is_chokepoint: boolean;
    /** Number of enemy adjacencies if a brigade were to advance here. */
    advance_enemy_adjacency: number;
}

export interface FactionGraphAnalysis {
    faction: FactionId;
    /** Per-OSID analysis for all OSIDs this faction controls. */
    osid_analysis: Map<Osid, OsidAnalysis>;
    /** OSIDs on the front (at least one enemy neighbor). */
    front_osids: Osid[];
    /** OSIDs classified as chokepoints. */
    chokepoints: Osid[];
    /** OSIDs that are salients (3+ enemy adjacency). */
    salients: Osid[];
    /** OSIDs that are undefended on the front. */
    undefended_front: Osid[];
    /** Enemy OSIDs with weak/no defense (attack opportunities). */
    weak_enemy_osids: Array<{ osid: Osid; reason: string }>;
    /** Enemy OSIDs completely surrounded by faction-controlled territory (pockets). */
    enemy_pockets: Osid[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

/** Get brigade power at an OSID. Returns 0 if no brigade present.
 *  `power` / `brigadeId` / `formation` = strongest single brigade (for weak-point details).
 *  `totalPower` / `brigadeCount` = aggregate across ALL brigades (for threat assessment). */
function getBrigadePowerAtOsid(
    state: GameState,
    osid: Osid,
    factionFilter?: FactionId
): { power: number; totalPower: number; brigadeId: string | null; formation: FormationState | null; brigadeCount: number } {
    const formations = state.military.formations ?? {};
    let bestPower = 0;
    let bestId: string | null = null;
    let bestFormation: FormationState | null = null;
    let totalPower = 0;
    let brigadeCount = 0;

    for (const [id, f] of Object.entries(formations)) {
        if (f.status !== 'active') continue;
        if (f.location_osid !== osid) continue;
        if (factionFilter && f.faction !== factionFilter) continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;

        const personnel = f.personnel ?? 0;
        const eq = Math.max(0.1, f.experience ?? 0.3);
        const coh = Math.max(0.1, (f.cohesion ?? 60) / 100);
        const power = personnel * eq * coh;
        totalPower += power;
        brigadeCount++;

        if (power > bestPower || (power === bestPower && (bestId === null || strictCompare(id, bestId) < 0))) {
            bestPower = power;
            bestId = id;
            bestFormation = f;
        }
    }
    return { power: bestPower, totalPower, brigadeId: bestId, formation: bestFormation, brigadeCount };
}

/** BFS to find all OSIDs reachable from a source through faction-controlled OSIDs. */
function bfsReachable(
    source: Osid,
    adjacency: Map<Osid, Osid[]>,
    controlledSet: Set<Osid>,
    exclude?: Osid
): Set<Osid> {
    const visited = new Set<Osid>();
    const queue: Osid[] = [source];
    visited.add(source);
    while (queue.length > 0) {
        const curr = queue.shift()!;
        const neighbors = adjacency.get(curr) ?? [];
        for (const n of neighbors) {
            if (visited.has(n)) continue;
            if (n === exclude) continue;
            if (!controlledSet.has(n)) continue;
            visited.add(n);
            queue.push(n);
        }
    }
    return visited;
}

/**
 * Check if removing an OSID from the controlled set disconnects territory.
 * Uses BFS from a seed node through remaining controlled OSIDs.
 */
function isChokepoint(
    osid: Osid,
    adjacency: Map<Osid, Osid[]>,
    controlledOsids: Set<Osid>
): boolean {
    // Must have at least 2 friendly neighbors to be a chokepoint candidate
    const neighbors = adjacency.get(osid) ?? [];
    const friendlyNeighbors = neighbors.filter(n => controlledOsids.has(n));
    if (friendlyNeighbors.length < 2) return false;

    // Check if all friendly neighbors are still connected when this OSID is removed
    const remaining = new Set(controlledOsids);
    remaining.delete(osid);
    if (remaining.size === 0) return false;

    const seed = friendlyNeighbors[0]!;
    if (!remaining.has(seed)) return false;

    const reachable = bfsReachable(seed, adjacency, remaining);
    // If any friendly neighbor is not reachable → this is a chokepoint
    for (const fn of friendlyNeighbors) {
        if (remaining.has(fn) && !reachable.has(fn)) return true;
    }
    return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// Co-ethnic population (simplified — uses current population if available)
// ═══════════════════════════════════════════════════════════════════════════

/** Faction → dominant ethnic group name used for civilian weight. */
const FACTION_ETHNICITY: Record<FactionId, string> = {
    RBiH: 'bosniak',
    RS: 'serb',
    HRHB: 'croat'
};

/**
 * Get co-ethnic population for an OSID.
 * Uses displacement-aware current population when available,
 * falls back to a rough heuristic based on political_controllers.
 */
function getCoethnicPop(
    _state: GameState,
    _osid: Osid,
    _faction: FactionId,
    _reverseMap: OperationalToCanonicalReverseMap
): number {
    // Phase 3 will implement full census+displacement-based population per OSID.
    // For Phase 1, use a constant heuristic: ~5000 civilians per faction-controlled OSID
    // scaled by whether this is a known urban center.
    const lower = _osid.toLowerCase();
    // Major urban centers get higher weight
    if (lower.includes('sarajevo') || lower.includes('tuzla') || lower.includes('zenica') || lower.includes('mostar')) return 25000;
    if (lower.includes('banja_luka') || lower.includes('bihac') || lower.includes('brcko') || lower.includes('doboj') || lower.includes('travnik')) return 15000;
    if (lower.includes('gorazde') || lower.includes('srebrenica') || lower.includes('zepa') || lower.includes('vitez') || lower.includes('stolac')) return 8000;
    return 3000; // Rural default
}

// ═══════════════════════════════════════════════════════════════════════════
// Main analysis
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute strategic graph analysis for a single faction.
 * Call once per turn per faction.
 */
export function analyzeFactionGraph(
    state: GameState,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
): FactionGraphAnalysis {
    const result: FactionGraphAnalysis = {
        faction,
        osid_analysis: new Map(),
        front_osids: [],
        chokepoints: [],
        salients: [],
        undefended_front: [],
        weak_enemy_osids: [],
        enemy_pockets: []
    };

    // 1. Identify all faction-controlled OSIDs
    const allOsids = Array.from(adjacency.keys()).sort(strictCompare);
    const controlledSet = new Set<Osid>();
    const controllerCache = new Map<Osid, FactionId | null>();

    for (const osid of allOsids) {
        const controller = getPoliticalControllerOSID(state, osid, reverseMap);
        controllerCache.set(osid, controller);
        if (controller === faction) controlledSet.add(osid);
    }

    // 2. Analyze each controlled OSID
    for (const osid of allOsids) {
        if (!controlledSet.has(osid)) continue;

        const neighbors = adjacency.get(osid) ?? [];
        const enemyNeighbors: Osid[] = [];
        const friendlyNeighbors: Osid[] = [];

        for (const n of neighbors) {
            const c = controllerCache.get(n) ?? getPoliticalControllerOSID(state, n, reverseMap);
            if (c === faction) friendlyNeighbors.push(n);
            else if (c !== null) enemyNeighbors.push(n);
        }

        // Brigade at this OSID — use totalPower for classification and OsidAnalysis
        const { totalPower: brigadePower, brigadeId } = getBrigadePowerAtOsid(state, osid, faction);

        // Enemy threat: sum of ALL enemy brigade powers on adjacent enemy OSIDs
        let enemyThreat = 0;
        for (const en of enemyNeighbors) {
            const { totalPower } = getBrigadePowerAtOsid(state, en);
            enemyThreat += totalPower;
        }

        // Front classification
        let classification: FrontClassification;
        if (enemyNeighbors.length === 0) {
            classification = 'interior';
        } else if (brigadePower === 0) {
            classification = 'undefended';
        } else if (enemyThreat > 0 && enemyThreat / brigadePower > 2.0) {
            classification = 'critical';
        } else if (enemyThreat > 0 && enemyThreat / brigadePower > 1.0) {
            classification = 'threatened';
        } else if (enemyThreat > 0) {
            classification = 'active';
        } else {
            classification = 'quiet';
        }

        // Civilian weight (simplified for Phase 1)
        const coethnicPop = getCoethnicPop(state, osid, faction, reverseMap);
        let civilianWeight = coethnicPop;

        // Chokepoint analysis: does removing this OSID disconnect territory?
        const choke = isChokepoint(osid, adjacency, controlledSet);
        if (choke) {
            // Chokepoint bonus: add population of OSIDs that would be disconnected
            civilianWeight += 10000; // Flat chokepoint premium
        }

        // Advance enemy adjacency (for attack planning)
        let advanceEnemyAdj = 0;
        for (const n of neighbors) {
            const c = controllerCache.get(n);
            if (c !== null && c !== faction) advanceEnemyAdj++;
        }

        const analysis: OsidAnalysis = {
            osid,
            controller: faction,
            enemy_neighbors: enemyNeighbors,
            friendly_neighbors: friendlyNeighbors,
            brigade_id: brigadeId,
            brigade_power: brigadePower,
            enemy_threat: enemyThreat,
            classification,
            civilian_weight: civilianWeight,
            is_chokepoint: choke,
            advance_enemy_adjacency: advanceEnemyAdj
        };

        result.osid_analysis.set(osid, analysis);

        if (enemyNeighbors.length > 0) {
            result.front_osids.push(osid);
            if (classification === 'undefended') result.undefended_front.push(osid);
            if (advanceEnemyAdj >= 3) result.salients.push(osid);
        }
        if (choke) result.chokepoints.push(osid);
    }

    // 3. Detect weak enemy OSIDs (attack opportunities)
    const enemyChecked = new Set<Osid>();
    for (const frontOsid of result.front_osids) {
        const analysis = result.osid_analysis.get(frontOsid)!;
        for (const enemyOsid of analysis.enemy_neighbors) {
            if (enemyChecked.has(enemyOsid)) continue;
            enemyChecked.add(enemyOsid);

            const { totalPower, formation } = getBrigadePowerAtOsid(state, enemyOsid);
            if (totalPower === 0) {
                result.weak_enemy_osids.push({ osid: enemyOsid, reason: 'undefended' });
            } else if (formation) {
                const entrenchment = (formation as { entrenchment_turns?: number }).entrenchment_turns ?? 0;
                const disrupted = (formation as { disrupted_turns?: number }).disrupted_turns ?? 0;
                const cohesion = formation.cohesion ?? 60;

                if (entrenchment === 0) {
                    result.weak_enemy_osids.push({ osid: enemyOsid, reason: 'no_entrenchment' });
                } else if (disrupted > 0) {
                    result.weak_enemy_osids.push({ osid: enemyOsid, reason: 'disrupted' });
                } else if (cohesion < 25) {
                    result.weak_enemy_osids.push({ osid: enemyOsid, reason: 'low_cohesion' });
                }
            }
        }
    }

    // 4. Detect enemy pockets: enemy OSID clusters (1-3 connected same-controller OSIDs)
    //    where ALL external neighbors are faction-controlled.
    //    A cluster of 2 HRHB OSIDs inside RS territory won't be caught by single-OSID
    //    detection because they neighbor each other. BFS finds the connected component first.
    //    Scan ALL controlled OSIDs (not just front) because pockets are typically deep
    //    in the interior, surrounded by friendly territory on all sides.
    const MAX_POCKET_CLUSTER = 6;
    const pocketChecked = new Set<Osid>();
    for (const osid2 of allOsids) {
        if (!osid2.startsWith('op:')) continue;
        if (!controlledSet.has(osid2)) continue;
        const neighbors2 = adjacency.get(osid2) ?? [];
        for (const enemyOsid of neighbors2) {
            if (!enemyOsid.startsWith('op:')) continue;
            if (controlledSet.has(enemyOsid)) continue; // skip friendly
            if (pocketChecked.has(enemyOsid)) continue;

            // BFS: find connected component of same-controller enemy OSIDs
            const enemyController = controllerCache.get(enemyOsid) ?? getPoliticalControllerOSID(state, enemyOsid, reverseMap);
            if (!enemyController || enemyController === faction) { pocketChecked.add(enemyOsid); continue; }

            const cluster: Osid[] = [];
            const clusterSet = new Set<Osid>();
            const bfsQueue: Osid[] = [enemyOsid];
            clusterSet.add(enemyOsid);
            let tooLarge = false;

            while (bfsQueue.length > 0) {
                const curr = bfsQueue.shift()!;
                cluster.push(curr);
                if (cluster.length > MAX_POCKET_CLUSTER) { tooLarge = true; break; }
                for (const n of (adjacency.get(curr) ?? [])) {
                    if (!n.startsWith('op:')) continue; // skip canonical SID nodes
                    if (clusterSet.has(n)) continue;
                    const nCtrl = controllerCache.get(n) ?? getPoliticalControllerOSID(state, n, reverseMap);
                    if (nCtrl === enemyController) {
                        clusterSet.add(n);
                        bfsQueue.push(n);
                    }
                }
            }

            // Mark all cluster members as checked
            for (const c of clusterSet) pocketChecked.add(c);
            if (tooLarge) continue;

            // A defended enclave is not a rear pocket. Rear-pocket cleanup is only for
            // abandoned clusters with no organized military present anywhere inside.
            let hasOrganizedDefense = false;
            for (const c of cluster) {
                const { totalPower } = getBrigadePowerAtOsid(state, c, enemyController);
                if (totalPower > 0) {
                    hasOrganizedDefense = true;
                    break;
                }
            }
            if (hasOrganizedDefense) continue;

            // Check: ALL external op: neighbors of the cluster must be faction-controlled
            // Skip canonical SID nodes (S:-prefixed) — they have no political_controllers entry
            let allSurrounded = true;
            for (const c of cluster) {
                for (const n of (adjacency.get(c) ?? [])) {
                    if (!n.startsWith('op:')) continue; // skip canonical SID nodes
                    if (clusterSet.has(n)) continue; // skip intra-cluster edges
                    const nCtrl = controllerCache.get(n) ?? getPoliticalControllerOSID(state, n, reverseMap);
                    if (nCtrl !== faction) { allSurrounded = false; break; }
                }
                if (!allSurrounded) break;
            }

            if (allSurrounded) {
                for (const c of cluster) result.enemy_pockets.push(c);
            }
        }
    }

    // Sort all output arrays for determinism
    result.front_osids.sort(strictCompare);
    result.chokepoints.sort(strictCompare);
    result.salients.sort(strictCompare);
    result.undefended_front.sort(strictCompare);
    result.weak_enemy_osids.sort((a, b) => strictCompare(a.osid, b.osid));
    result.enemy_pockets.sort(strictCompare);

    return result;
}

/**
 * Compute graph analysis for ALL factions. Call once per turn.
 * Returns map from FactionId → FactionGraphAnalysis.
 */
export function analyzeAllFactions(
    state: GameState,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
): Map<FactionId, FactionGraphAnalysis> {
    const factions = (state.factions ?? []).map(f => f.id).sort(strictCompare) as FactionId[];
    const result = new Map<FactionId, FactionGraphAnalysis>();
    for (const faction of factions) {
        result.set(faction, analyzeFactionGraph(state, faction, adjacency, reverseMap));
    }
    return result;
}
