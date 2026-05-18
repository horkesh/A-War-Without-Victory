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
 *
 * LANE-NIGHTSHIFT-ANALYZE-FACTION-GRAPH-TIER-2 (2026-05-05): public entry point
 * dispatches to the optimized body. The legacy body (`analyzeFactionGraphLegacy`)
 * is retained below for the G1 property test (`__test_analyzeFactionGraphLegacy`)
 * and for the G2 parity wrapper. Optimized + legacy MUST return structurally-
 * identical output by construction; G1 enforces this over 10,000 LCG-seeded
 * trials and the existing `ANALYZE_FACTION_GRAPH_PARITY_CHECK=true` env flag
 * also exercises optimized vs legacy on every cache hit.
 */
export function analyzeFactionGraph(
    state: GameState,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
): FactionGraphAnalysis {
    return analyzeFactionGraphOptimized(state, faction, adjacency, reverseMap);
}

// ═══════════════════════════════════════════════════════════════════════════
// LANE-NIGHTSHIFT-ANALYZE-FACTION-GRAPH-TIER-2 — formations-by-OSID index
// ═══════════════════════════════════════════════════════════════════════════
//
// The Wave 5 audit named `analyzeFactionGraph` as 63.3% of bot-orders cost
// (≈398 ms/turn over 40w). Wave 7 Lane A (`72a040fc`) deduplicated the per-
// turn calls (4 of 5 call sites cached) for a ~35% bot-orders drop. Tier 2
// optimizes the body itself.
//
// Hidden hotspot: `getBrigadePowerAtOsid` iterated `Object.entries(formations)`
// (O(F) ≈ 700 formations late-war) on EVERY call, and was called O(V·avg_deg)
// times per analysis. For 712 OSIDs that's ~500k Object.entries iterations
// per faction per turn — the dominating sub-cost.
//
// Tier 2 builds a formations-by-OSID index ONCE per call (single O(F) pass)
// and converts every `getBrigadePowerAtOsid`-shaped lookup to O(1) Map reads.
// All tie-break orderings preserved (bestId selection, neighbor iteration
// order, sorted output arrays) — outputs structurally byte-identical to legacy.
//
// Determinism: no Math.random / Date.now / new Date / locale-sort /
// environment leak. Faction-agnostic — same code path for all factions.
// Sorted iteration unchanged. Single-pass — no cross-call shared state.
// No new timing surface (Wave 7 Lane A's G3 drift was a cross-step timing
// issue from the WeakMap cache crossing pipeline boundaries; Tier 2 is
// inner-loop only and creates no such surface).

interface FormationPowerEntry {
    id: string;
    formation: FormationState;
    power: number;
}

interface FormationsIndex {
    /** Per-(osid, faction) total power. Key: `${osid}\x00${faction}`. */
    factionTotalByOsid: Map<string, number>;
    /** Per-(osid, faction) strongest single brigade (for legacy bestId tie-break). */
    factionBestByOsid: Map<string, FormationPowerEntry>;
    /** Per-osid total power across all factions (for unfiltered enemy threat reads). */
    anyTotalByOsid: Map<Osid, number>;
    /** Per-osid strongest single brigade across all factions (for weak-enemy `formation` field). */
    anyBestByOsid: Map<Osid, FormationPowerEntry>;
}

/**
 * Build a formations-by-OSID index in a single O(F) pass.
 * Tie-break for `bestId` mirrors legacy: stronger power wins; on equal power,
 * lexicographically-smaller id wins (via `strictCompare`).
 *
 * Iterates `Object.entries(formations)` ONCE; the legacy body did this O(V·avg_deg)
 * times via `getBrigadePowerAtOsid`.
 */
function buildFormationsIndex(state: GameState): FormationsIndex {
    const factionTotalByOsid = new Map<string, number>();
    const factionBestByOsid = new Map<string, FormationPowerEntry>();
    const anyTotalByOsid = new Map<Osid, number>();
    const anyBestByOsid = new Map<Osid, FormationPowerEntry>();

    const formations = state.military.formations ?? {};
    for (const [id, f] of Object.entries(formations)) {
        if (f.status !== 'active') continue;
        if (f.location_osid == null) continue;
        if (f.kind !== 'brigade' && f.kind !== 'og' && f.kind !== 'operational_group') continue;

        const osid = f.location_osid as Osid;
        const personnel = f.personnel ?? 0;
        const eq = Math.max(0.1, f.experience ?? 0.3);
        const coh = Math.max(0.1, (f.cohesion ?? 60) / 100);
        const power = personnel * eq * coh;

        // Any-faction total + best
        anyTotalByOsid.set(osid, (anyTotalByOsid.get(osid) ?? 0) + power);
        const anyBest = anyBestByOsid.get(osid);
        if (anyBest === undefined || power > anyBest.power || (power === anyBest.power && strictCompare(id, anyBest.id) < 0)) {
            anyBestByOsid.set(osid, { id, formation: f, power });
        }

        // Per-faction total + best (keyed by `${osid}\x00${faction}` to avoid Map<Map> indirection)
        const fkey = `${osid}\x00${f.faction}`;
        factionTotalByOsid.set(fkey, (factionTotalByOsid.get(fkey) ?? 0) + power);
        const factionBest = factionBestByOsid.get(fkey);
        if (factionBest === undefined || power > factionBest.power || (power === factionBest.power && strictCompare(id, factionBest.id) < 0)) {
            factionBestByOsid.set(fkey, { id, formation: f, power });
        }
    }

    return { factionTotalByOsid, factionBestByOsid, anyTotalByOsid, anyBestByOsid };
}

/**
 * Tier 2 optimized body of `analyzeFactionGraph`. See block comment above for
 * the optimization summary. Output is structurally identical to the legacy
 * body (`analyzeFactionGraphLegacy`); G1 property test enforces equivalence.
 */
function analyzeFactionGraphOptimized(
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

    // O1: pre-index formations by OSID — single O(F) pass replaces O(V·avg_deg) repeated scans.
    const idx = buildFormationsIndex(state);
    const factionKey = (osid: Osid, fac: FactionId): string => `${osid}\x00${fac}`;

    // 1. Identify all faction-controlled OSIDs. Loop 1 already populates the controller
    //    cache for every key in adjacency; subsequent reads skip the `?? getPoliticalControllerOSID(...)`
    //    fallback (O3 — vestigial defensive read).
    const allOsids = Array.from(adjacency.keys()).sort(strictCompare);
    const controlledSet = new Set<Osid>();
    const controllerCache = new Map<Osid, FactionId | null>();

    for (const osid of allOsids) {
        const controller = getPoliticalControllerOSID(state, osid, reverseMap);
        controllerCache.set(osid, controller);
        if (controller === faction) controlledSet.add(osid);
    }

    // 2. Analyze each controlled OSID. Single-pass neighbor classification (O2 —
    //    advance_enemy_adjacency = enemyNeighbors.length, no second loop needed).
    for (const osid of allOsids) {
        if (!controlledSet.has(osid)) continue;

        const neighbors = adjacency.get(osid) ?? [];
        const enemyNeighbors: Osid[] = [];
        const friendlyNeighbors: Osid[] = [];

        for (const n of neighbors) {
            const c = controllerCache.get(n);
            // controllerCache covers every adjacency key; defensive fallback retained
            // only for the rare case `n` is not a key in adjacency (mirrors legacy semantics).
            const ctrl = c !== undefined ? c : getPoliticalControllerOSID(state, n, reverseMap);
            if (ctrl === faction) friendlyNeighbors.push(n);
            else if (ctrl !== null) enemyNeighbors.push(n);
        }

        // Brigade at this OSID — index lookup replaces O(F) scan.
        const ownKey = factionKey(osid, faction);
        const brigadePower = idx.factionTotalByOsid.get(ownKey) ?? 0;
        const brigadeId = idx.factionBestByOsid.get(ownKey)?.id ?? null;

        // Enemy threat — index lookup per enemy neighbor.
        let enemyThreat = 0;
        for (const en of enemyNeighbors) {
            enemyThreat += idx.anyTotalByOsid.get(en) ?? 0;
        }

        // Front classification (semantics preserved verbatim from legacy).
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
            civilianWeight += 10000;
        }

        // O2: advance_enemy_adjacency = enemyNeighbors.length (counts neighbors with
        //     non-null controller != faction). Identical to legacy's second-pass count.
        const advanceEnemyAdj = enemyNeighbors.length;

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

    // 3. Detect weak enemy OSIDs (attack opportunities) — index lookups.
    const enemyChecked = new Set<Osid>();
    for (const frontOsid of result.front_osids) {
        const analysis = result.osid_analysis.get(frontOsid)!;
        for (const enemyOsid of analysis.enemy_neighbors) {
            if (enemyChecked.has(enemyOsid)) continue;
            enemyChecked.add(enemyOsid);

            const totalPower = idx.anyTotalByOsid.get(enemyOsid) ?? 0;
            const best = idx.anyBestByOsid.get(enemyOsid);
            const formation = best ? best.formation : null;

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

    // 4. Detect enemy pockets (semantics preserved verbatim).
    const MAX_POCKET_CLUSTER = 6;
    const pocketChecked = new Set<Osid>();
    for (const osid2 of allOsids) {
        if (!osid2.startsWith('op:')) continue;
        if (!controlledSet.has(osid2)) continue;
        const neighbors2 = adjacency.get(osid2) ?? [];
        for (const enemyOsid of neighbors2) {
            if (!enemyOsid.startsWith('op:')) continue;
            if (controlledSet.has(enemyOsid)) continue;
            if (pocketChecked.has(enemyOsid)) continue;

            const enemyControllerCached = controllerCache.get(enemyOsid);
            const enemyController = enemyControllerCached !== undefined
                ? enemyControllerCached
                : getPoliticalControllerOSID(state, enemyOsid, reverseMap);
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
                    if (!n.startsWith('op:')) continue;
                    if (clusterSet.has(n)) continue;
                    const nCachedCtrl = controllerCache.get(n);
                    const nCtrl = nCachedCtrl !== undefined
                        ? nCachedCtrl
                        : getPoliticalControllerOSID(state, n, reverseMap);
                    if (nCtrl === enemyController) {
                        clusterSet.add(n);
                        bfsQueue.push(n);
                    }
                }
            }

            for (const c of clusterSet) pocketChecked.add(c);
            if (tooLarge) continue;

            // Pocket-defense check via index lookup (was O(F) per cluster member).
            let hasOrganizedDefense = false;
            for (const c of cluster) {
                const total = idx.factionTotalByOsid.get(factionKey(c, enemyController)) ?? 0;
                if (total > 0) {
                    hasOrganizedDefense = true;
                    break;
                }
            }
            if (hasOrganizedDefense) continue;

            let allSurrounded = true;
            for (const c of cluster) {
                for (const n of (adjacency.get(c) ?? [])) {
                    if (!n.startsWith('op:')) continue;
                    if (clusterSet.has(n)) continue;
                    const nCachedCtrl = controllerCache.get(n);
                    const nCtrl = nCachedCtrl !== undefined
                        ? nCachedCtrl
                        : getPoliticalControllerOSID(state, n, reverseMap);
                    if (nCtrl !== faction) { allSurrounded = false; break; }
                }
                if (!allSurrounded) break;
            }

            if (allSurrounded) {
                for (const c of cluster) result.enemy_pockets.push(c);
            }
        }
    }

    // Sort all output arrays for determinism (semantics identical to legacy).
    result.front_osids.sort(strictCompare);
    result.chokepoints.sort(strictCompare);
    result.salients.sort(strictCompare);
    result.undefended_front.sort(strictCompare);
    result.weak_enemy_osids.sort((a, b) => strictCompare(a.osid, b.osid));
    result.enemy_pockets.sort(strictCompare);

    return result;
}

/**
 * LEGACY body — retained for the G1 property test (compares optimized vs this
 * over 10,000 LCG-seeded trials) and for the G2 parity wrapper. Behavior MUST
 * remain frozen at the pre-Tier-2 implementation; do not edit unless the
 * intent is to modify the property-test reference.
 *
 * Pre-Tier-2 history: this body was the public `analyzeFactionGraph` entry
 * through Wave 7 Lane A (`72a040fc`). Tier 2 (this lane) introduces
 * `analyzeFactionGraphOptimized` and dispatches the public entry to it.
 */
function analyzeFactionGraphLegacy(
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

    const allOsids = Array.from(adjacency.keys()).sort(strictCompare);
    const controlledSet = new Set<Osid>();
    const controllerCache = new Map<Osid, FactionId | null>();

    for (const osid of allOsids) {
        const controller = getPoliticalControllerOSID(state, osid, reverseMap);
        controllerCache.set(osid, controller);
        if (controller === faction) controlledSet.add(osid);
    }

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

        const { totalPower: brigadePower, brigadeId } = getBrigadePowerAtOsid(state, osid, faction);

        let enemyThreat = 0;
        for (const en of enemyNeighbors) {
            const { totalPower } = getBrigadePowerAtOsid(state, en);
            enemyThreat += totalPower;
        }

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

        const coethnicPop = getCoethnicPop(state, osid, faction, reverseMap);
        let civilianWeight = coethnicPop;

        const choke = isChokepoint(osid, adjacency, controlledSet);
        if (choke) {
            civilianWeight += 10000;
        }

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

    const MAX_POCKET_CLUSTER = 6;
    const pocketChecked = new Set<Osid>();
    for (const osid2 of allOsids) {
        if (!osid2.startsWith('op:')) continue;
        if (!controlledSet.has(osid2)) continue;
        const neighbors2 = adjacency.get(osid2) ?? [];
        for (const enemyOsid of neighbors2) {
            if (!enemyOsid.startsWith('op:')) continue;
            if (controlledSet.has(enemyOsid)) continue;
            if (pocketChecked.has(enemyOsid)) continue;

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
                    if (!n.startsWith('op:')) continue;
                    if (clusterSet.has(n)) continue;
                    const nCtrl = controllerCache.get(n) ?? getPoliticalControllerOSID(state, n, reverseMap);
                    if (nCtrl === enemyController) {
                        clusterSet.add(n);
                        bfsQueue.push(n);
                    }
                }
            }

            for (const c of clusterSet) pocketChecked.add(c);
            if (tooLarge) continue;

            let hasOrganizedDefense = false;
            for (const c of cluster) {
                const { totalPower } = getBrigadePowerAtOsid(state, c, enemyController);
                if (totalPower > 0) {
                    hasOrganizedDefense = true;
                    break;
                }
            }
            if (hasOrganizedDefense) continue;

            let allSurrounded = true;
            for (const c of cluster) {
                for (const n of (adjacency.get(c) ?? [])) {
                    if (!n.startsWith('op:')) continue;
                    if (clusterSet.has(n)) continue;
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
    const factions: FactionId[] = (state.factions ?? []).map(f => f.id).sort(strictCompare);
    const result = new Map<FactionId, FactionGraphAnalysis>();
    for (const faction of factions) {
        result.set(faction, analyzeFactionGraphCached(state, faction, adjacency, reverseMap));
    }
    return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// LANE-NIGHTSHIFT-ANALYZE-FACTION-GRAPH-DEDUPE — PARTIAL FIX (2026-05-05)
//
// Per-turn memoization for analyzeFactionGraph. Wave 5 audit
// (`docs/40_reports/audits/20260504_BOT_ORDERS_HOT_PATH_PROFILE.md`) measured
// this function at 63.3% of bot-orders cost (≈398 ms/turn over 40w), called
// twice per faction per turn from `bot_corps_ai.ts:225` and
// `bot_brigade_ai_osid.ts:556` with identical inputs. Deduping these two
// is the audit's primary win.
//
// CALL-SITE DEPLOYMENT (post-G3-bisect):
//   - bot_corps_ai.ts:225            → analyzeFactionGraphCached  ✓ (hash-clean)
//   - bot_brigade_ai_osid.ts:556     → analyzeFactionGraphCached  ✓ (hash-clean)
//   - oob_early_war_entry.ts:349     → analyzeFactionGraphCached  ✓ (hash-clean)
//   - osid_graph_analysis.ts:441     → analyzeFactionGraphCached  ✓ (hash-clean)
//   - paramilitary_sweep.ts:190      → analyzeFactionGraph (legacy) — DELIBERATELY UNCACHED
//
// Bisect evidence: routing paramilitary_sweep through the cache produced
// reproducible drift `51dca710b9db7d37` vs baseline `ef03ab4d6c5ecd28` (n1642,
// n1643 deterministic). Reverting ONLY paramilitary_sweep restored byte-
// identity (n1648). The corps_ai + brigade_ai dedup is hash-safe by itself
// — paramilitary's structural position (war_phases:809, BEFORE bot-orders at
// :1148) means a paramilitary-seeded cache entry serves the bot-orders
// pipeline pre-mutation; re-fresh at paramilitary keeps the bot-orders
// cache-fill clean.
//
// Cache shape: WeakMap<GameState, Map<FactionId, {turn, result}>>. The
// WeakMap is keyed on the state object reference so cached entries are
// garbage-collected with the state. The inner Map carries a turn
// fingerprint to defensively evict if the same state reference is reused
// across turns (unusual, but cheap to guard against).
//
// Determinism: no Math.random / Date.now / new Date / environment leak.
// Faction-agnostic — same code path for all factions. Sorted iteration
// inside `analyzeFactionGraph` unchanged.
//
// Mission C precedent (`a60d39c9`, 2026-05-04): hot-path optimizations that
// previously failed hash-identity ship only with G1+G2+G3 gates. G2 parity
// wrapper is `ANALYZE_FACTION_GRAPH_PARITY_CHECK=true` (default off,
// zero production cost).
//
// G3 verdict: PASS at the SHIPPED CONFIGURATION (n1648 = baseline ef03ab4d6c5ecd28).
// ═══════════════════════════════════════════════════════════════════════════

interface CachedFactionGraph {
    turn: number;
    result: FactionGraphAnalysis;
}

const factionGraphCache: WeakMap<GameState, Map<FactionId, CachedFactionGraph>> = new WeakMap();

/**
 * Per-turn memoized variant of `analyzeFactionGraph`.
 * Returns the cached result on hit (same reference); recomputes on miss.
 *
 * Hit predicate: same state reference AND same faction AND same `state.meta.turn`.
 *
 * The cache invalidates per turn: a cached entry whose turn fingerprint
 * does not match the current turn is evicted and recomputed. This guards
 * against the unusual case of the same state reference being reused
 * across turns (e.g. test harnesses).
 *
 * Faction-agnostic, deterministic, no environment leak.
 */
export function analyzeFactionGraphCached(
    state: GameState,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
    reverseMap: OperationalToCanonicalReverseMap,
): FactionGraphAnalysis {
    const currentTurn = state.meta?.turn ?? 0;
    let perFaction = factionGraphCache.get(state);
    if (perFaction !== undefined) {
        const entry = perFaction.get(faction);
        if (entry !== undefined && entry.turn === currentTurn) {
            // G2 parity wrapper — opt-in via env flag, default off.
            // Wave 7 Lane A: cached vs fresh recompute (cache-correctness).
            if (process.env.ANALYZE_FACTION_GRAPH_PARITY_CHECK === 'true') {
                const fresh = analyzeFactionGraph(state, faction, adjacency, reverseMap);
                assertFactionGraphAnalysisEqual(entry.result, fresh, state, faction, adjacency);
            }
            // LANE-NIGHTSHIFT-ANALYZE-FACTION-GRAPH-TIER-2 G2 parity wrapper:
            // cached vs LEGACY body (body-correctness). Catches drift between
            // the optimized body and the frozen legacy reference. Default off,
            // zero production cost.
            if (process.env.ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK === 'true') {
                const legacy = analyzeFactionGraphLegacy(state, faction, adjacency, reverseMap);
                assertFactionGraphAnalysisEqual(entry.result, legacy, state, faction, adjacency);
            }
            return entry.result;
        }
    } else {
        perFaction = new Map<FactionId, CachedFactionGraph>();
        factionGraphCache.set(state, perFaction);
    }
    const result = analyzeFactionGraph(state, faction, adjacency, reverseMap);
    // Tier 2 G2 parity wrapper also fires on cache miss (fresh recompute).
    if (process.env.ANALYZE_FACTION_GRAPH_TIER_2_PARITY_CHECK === 'true') {
        const legacy = analyzeFactionGraphLegacy(state, faction, adjacency, reverseMap);
        assertFactionGraphAnalysisEqual(result, legacy, state, faction, adjacency);
    }
    perFaction.set(faction, { turn: currentTurn, result });
    return result;
}

/**
 * G2 parity-wrapper assertion. Throws on any structural mismatch between
 * the cached and freshly-recomputed `FactionGraphAnalysis`. Default off
 * (zero production cost). Run a 40w smoke with the env flag set to catch
 * real-scenario divergence before merge.
 */
function assertFactionGraphAnalysisEqual(
    cached: FactionGraphAnalysis,
    fresh: FactionGraphAnalysis,
    state: GameState,
    faction: FactionId,
    adjacency: Map<Osid, Osid[]>,
): void {
    const errs: string[] = [];
    if (cached.faction !== fresh.faction) errs.push(`faction:${cached.faction}!=${fresh.faction}`);
    if (cached.osid_analysis.size !== fresh.osid_analysis.size) {
        errs.push(`osid_analysis.size:${cached.osid_analysis.size}!=${fresh.osid_analysis.size}`);
    }
    const arrayKeys: Array<keyof FactionGraphAnalysis> = [
        'front_osids', 'chokepoints', 'salients', 'undefended_front', 'enemy_pockets'
    ];
    for (const k of arrayKeys) {
        const a = cached[k] as Osid[];
        const b = fresh[k] as Osid[];
        if (a.length !== b.length) { errs.push(`${k}.length:${a.length}!=${b.length}`); continue; }
        for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) { errs.push(`${k}[${i}]:${a[i]}!=${b[i]}`); break; }
        }
    }
    if (cached.weak_enemy_osids.length !== fresh.weak_enemy_osids.length) {
        errs.push(`weak_enemy_osids.length:${cached.weak_enemy_osids.length}!=${fresh.weak_enemy_osids.length}`);
    } else {
        for (let i = 0; i < cached.weak_enemy_osids.length; i++) {
            const a = cached.weak_enemy_osids[i]!;
            const b = fresh.weak_enemy_osids[i]!;
            if (a.osid !== b.osid || a.reason !== b.reason) {
                errs.push(`weak_enemy_osids[${i}]:${a.osid}/${a.reason}!=${b.osid}/${b.reason}`);
                break;
            }
        }
    }
    // Deep compare osid_analysis values for any keys that exist in both
    for (const [osid, freshAnalysis] of fresh.osid_analysis) {
        const cachedAnalysis = cached.osid_analysis.get(osid);
        if (!cachedAnalysis) { errs.push(`osid_analysis missing osid:${osid}`); break; }
        if (cachedAnalysis.classification !== freshAnalysis.classification) {
            errs.push(`osid_analysis[${osid}].classification:${cachedAnalysis.classification}!=${freshAnalysis.classification}`);
            break;
        }
        if (cachedAnalysis.brigade_power !== freshAnalysis.brigade_power
            || cachedAnalysis.enemy_threat !== freshAnalysis.enemy_threat
            || cachedAnalysis.civilian_weight !== freshAnalysis.civilian_weight
            || cachedAnalysis.is_chokepoint !== freshAnalysis.is_chokepoint
            || cachedAnalysis.advance_enemy_adjacency !== freshAnalysis.advance_enemy_adjacency) {
            errs.push(`osid_analysis[${osid}] scalar fields diverge`);
            break;
        }
    }
    if (errs.length > 0) {
        const detail = JSON.stringify({
            faction,
            turn: state.meta?.turn ?? null,
            adjacency_size: adjacency.size,
            errors: errs.slice(0, 10),
        });
        throw new Error(`ANALYZE_FACTION_GRAPH_PARITY_CHECK mismatch: ${detail}`);
    }
}

// Test-only re-export so the G1 property test can compare cached vs the LEGACY body.
// LANE-NIGHTSHIFT-ANALYZE-FACTION-GRAPH-TIER-2 (2026-05-05): now points at
// `analyzeFactionGraphLegacy` (the pre-Tier-2 frozen reference body) instead
// of the public `analyzeFactionGraph` dispatcher (which now calls the
// optimized body). Property test invariant preserved: cached === legacy
// structurally over 10k LCG-seeded trials.
export { analyzeFactionGraphLegacy as __test_analyzeFactionGraphLegacy };

// Test-only re-export of the Tier 2 optimized body so a direct optimized-vs-legacy
// property test can compare without going through the per-turn cache.
export { analyzeFactionGraphOptimized as __test_analyzeFactionGraphOptimized };
