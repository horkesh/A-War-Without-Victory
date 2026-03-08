/**
 * Front geometry analysis for corps-level AI intelligence.
 *
 * Detects salients (own and enemy), computes line-shortening scores for
 * potential targets, and identifies critical hold OSIDs based on geometric
 * vulnerability and ethnic composition.
 *
 * Deterministic: sorted iteration, BFS with deterministic seeds, strictCompare tiebreaks.
 */

import type { FactionId } from '../../state/game_state.js';
import type { OsidEthnicComposition } from './ethnic_defense.js';
import { getCoEthnicShare } from './ethnic_defense.js';
import { strictCompare } from '../../state/validateGameState.js';

// ── Types ─────────────────────────────────────────────────────────────────

export interface SalientRecord {
    salient_id: string;
    side: 'own' | 'enemy';
    body_osids: string[];       // Sorted
    neck_osids: string[];       // Sorted — critical connection points
    neck_width: number;
    body_size: number;
    vulnerability: number;      // body_size / neck_width
    front_exposure: number;     // Fraction of body perimeter touching enemy
}

export interface CriticalHold {
    osid: string;
    reason: 'salient_neck' | 'ethnic_hold' | 'chokepoint';
    salient_id?: string;
    co_ethnic_share: number;
    priority: number;           // Higher = more critical
}

export interface FrontGeometryAssessment {
    own_salients: SalientRecord[];
    enemy_salients: SalientRecord[];
    line_shortening_scores: Map<string, number>;
    critical_holds: CriticalHold[];
}

// ── Constants ─────────────────────────────────────────────────────────────

/** Minimum vulnerability score (body_size / neck_width) to qualify as a salient. */
const MIN_VULNERABILITY = 2.0;

/** Maximum neck width — wider connections are normal front, not a salient. */
const MAX_NECK_WIDTH = 3;

/** Minimum body size to bother detecting. Single-OSID "salients" are just front positions. */
const MIN_BODY_SIZE = 2;

// ── Salient Detection ─────────────────────────────────────────────────────

/**
 * BFS reachability through a set of allowed OSIDs.
 * Returns the set of OSIDs reachable from `seed`.
 */
function bfsReachable(
    seed: string,
    adjacency: Map<string, string[]>,
    allowed: Set<string>,
): Set<string> {
    const visited = new Set<string>();
    const queue: string[] = [seed];
    visited.add(seed);
    while (queue.length > 0) {
        const current = queue.shift()!;
        for (const neighbor of adjacency.get(current) ?? []) {
            if (!neighbor.startsWith('op:')) continue;
            if (allowed.has(neighbor) && !visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
    return visited;
}

/**
 * Detect salients in faction-controlled territory within a sector.
 *
 * A salient is a cluster of front-line OSIDs connected to the main body
 * through a narrow neck (≤ MAX_NECK_WIDTH OSIDs). Losing the neck
 * creates a pocket.
 *
 * Algorithm:
 * 1. Build friendly subgraph (faction-controlled OSIDs in sector)
 * 2. Identify front-line OSIDs (have enemy neighbors)
 * 3. For each front-line OSID, test if removing it disconnects territory
 * 4. Merge adjacent articulation points guarding the same component
 * 5. Filter by vulnerability threshold
 */
export function detectSalients(
    factionOsids: string[],
    enemyOsids: Set<string>,
    adjacency: Map<string, string[]>,
): SalientRecord[] {
    const factionSet = new Set(factionOsids);
    if (factionSet.size < 3) return []; // Too small for salients

    // Identify front-line OSIDs (have at least one enemy neighbor)
    const frontLine = new Set<string>();
    for (const osid of factionOsids) {
        for (const neighbor of adjacency.get(osid) ?? []) {
            if (enemyOsids.has(neighbor)) {
                frontLine.add(osid);
                break;
            }
        }
    }
    if (frontLine.size < 2) return [];

    // Find the largest connected component (the "main body")
    const sortedFaction = [...factionSet].sort(strictCompare);
    const mainBody = bfsReachable(sortedFaction[0]!, adjacency, factionSet);

    // If not all connected, the smallest components are already pockets, not salients
    // (salients are connected to the main body by definition)
    if (mainBody.size < factionSet.size) {
        // Work only with the main body
        for (const osid of factionSet) {
            if (!mainBody.has(osid)) factionSet.delete(osid);
        }
    }

    // Find articulation points among front-line OSIDs
    // For each front-line OSID, remove it and check if any friendly neighbor
    // becomes disconnected from the rest
    const articulationCuts: Map<string, { removed: string; disconnected: Set<string> }> = new Map();

    for (const candidate of [...frontLine].sort(strictCompare)) {
        const remaining = new Set(factionSet);
        remaining.delete(candidate);
        if (remaining.size === 0) continue;

        // Find friendly neighbors of the removed OSID
        const friendlyNeighbors = (adjacency.get(candidate) ?? [])
            .filter(n => remaining.has(n));
        if (friendlyNeighbors.length < 2) continue; // Can't disconnect with < 2 neighbors

        // BFS from first friendly neighbor
        const reachable = bfsReachable(friendlyNeighbors[0]!, adjacency, remaining);

        // Check if any friendly neighbor is unreachable
        const disconnectedNeighbors = friendlyNeighbors.filter(n => !reachable.has(n));
        if (disconnectedNeighbors.length === 0) continue;

        // Find the full disconnected component
        const disconnected = bfsReachable(disconnectedNeighbors[0]!, adjacency, remaining);

        articulationCuts.set(candidate, { removed: candidate, disconnected });
    }

    if (articulationCuts.size === 0) return [];

    // Group articulation points that guard the same component
    // (adjacent articulation points whose disconnected sets overlap)
    const used = new Set<string>();
    const salients: SalientRecord[] = [];

    for (const [apOsid, cut] of [...articulationCuts.entries()].sort(([a], [b]) => strictCompare(a, b))) {
        if (used.has(apOsid)) continue;

        const neckOsids = [apOsid];
        let bodyOsids = new Set(cut.disconnected);
        used.add(apOsid);

        // Try to merge adjacent articulation points guarding overlapping components
        for (const [otherAp, otherCut] of articulationCuts.entries()) {
            if (used.has(otherAp)) continue;
            // Check adjacency between neck OSIDs
            const isAdjacent = neckOsids.some(neck =>
                (adjacency.get(neck) ?? []).includes(otherAp)
            );
            if (!isAdjacent) continue;
            // Check overlap in disconnected components
            let overlap = false;
            for (const osid of otherCut.disconnected) {
                if (bodyOsids.has(osid)) { overlap = true; break; }
            }
            if (!overlap) continue;
            // Merge
            neckOsids.push(otherAp);
            for (const osid of otherCut.disconnected) bodyOsids.add(osid);
            used.add(otherAp);
        }

        if (neckOsids.length > MAX_NECK_WIDTH) continue;

        // Remove neck OSIDs from body (they're the connection, not the bulge)
        for (const neck of neckOsids) bodyOsids.delete(neck);

        if (bodyOsids.size < MIN_BODY_SIZE) continue;

        const vulnerability = bodyOsids.size / neckOsids.length;
        if (vulnerability < MIN_VULNERABILITY) continue;

        // Compute front exposure: fraction of body's edges touching enemy
        let totalEdges = 0;
        let enemyEdges = 0;
        for (const osid of bodyOsids) {
            for (const neighbor of adjacency.get(osid) ?? []) {
                if (!neighbor.startsWith('op:')) continue;
                totalEdges++;
                if (enemyOsids.has(neighbor)) enemyEdges++;
            }
        }
        const frontExposure = totalEdges > 0 ? enemyEdges / totalEdges : 0;

        const sortedBody = [...bodyOsids].sort(strictCompare);
        const sortedNeck = [...neckOsids].sort(strictCompare);
        const salientId = `sal_${sortedBody[0]}_${sortedBody.length}`;

        salients.push({
            salient_id: salientId,
            side: 'own', // Caller sets this; detectSalients works for either side
            body_osids: sortedBody,
            neck_osids: sortedNeck,
            neck_width: sortedNeck.length,
            body_size: sortedBody.length,
            vulnerability,
            front_exposure: frontExposure,
        });
    }

    return salients.sort((a, b) => b.vulnerability - a.vulnerability || strictCompare(a.salient_id, b.salient_id));
}

// ── Line-Shortening Score ─────────────────────────────────────────────────

/**
 * Compute the net front perimeter change if target OSID were captured.
 *
 * Negative = line gets shorter (good for attacker).
 * Positive = line gets longer (creates more front to defend).
 * Zero = neutral.
 */
export function getLineShorteningScore(
    target: string,
    adjacency: Map<string, string[]>,
    factionOsids: Set<string>,
): number {
    const neighbors = adjacency.get(target) ?? [];
    let friendlyNeighbors = 0;
    let enemyNeighbors = 0;
    for (const n of neighbors) {
        if (!n.startsWith('op:')) continue;
        if (factionOsids.has(n)) friendlyNeighbors++;
        else enemyNeighbors++;
    }
    // Capturing removes friendly edges from front, adds enemy edges
    return enemyNeighbors - friendlyNeighbors;
}

/**
 * Compute line-shortening scores for a list of target OSIDs.
 */
function computeLineShorteningScores(
    targets: string[],
    adjacency: Map<string, string[]>,
    factionOsids: Set<string>,
): Map<string, number> {
    const scores = new Map<string, number>();
    for (const t of targets) {
        scores.set(t, getLineShorteningScore(t, adjacency, factionOsids));
    }
    return scores;
}

// ── Ethnic Hold Constraints ───────────────────────────────────────────────

/** Default co-ethnic threshold for neck OSIDs to trigger ethnic hold. */
export const DEFAULT_ETHNIC_NECK_THRESHOLD = 0.40;

/** Co-ethnic threshold for salient body OSIDs to trigger ethnic hold zone. */
const ETHNIC_BODY_THRESHOLD = 0.50;

/**
 * Build critical hold list from own salients + ethnic composition.
 */
function buildCriticalHolds(
    ownSalients: SalientRecord[],
    faction: FactionId,
    ethnicMap: OsidEthnicComposition | null | undefined,
    ethnicNeckThreshold: number,
): CriticalHold[] {
    const holds: CriticalHold[] = [];
    const seen = new Set<string>();

    for (const salient of ownSalients) {
        // Neck OSIDs are always critical holds
        for (const neck of salient.neck_osids) {
            if (seen.has(neck)) continue;
            seen.add(neck);
            const coEthnic = getCoEthnicShare(neck, faction, ethnicMap);
            const isEthnic = coEthnic >= ethnicNeckThreshold;
            holds.push({
                osid: neck,
                reason: isEthnic ? 'ethnic_hold' : 'salient_neck',
                salient_id: salient.salient_id,
                co_ethnic_share: coEthnic,
                priority: isEthnic ? 100 : 60,
            });
        }

        // Body OSIDs with co-ethnic majority → ethnic hold zone
        let totalCoEthnic = 0;
        let bodyCount = 0;
        for (const osid of salient.body_osids) {
            const share = getCoEthnicShare(osid, faction, ethnicMap);
            totalCoEthnic += share;
            bodyCount++;
        }
        const avgCoEthnic = bodyCount > 0 ? totalCoEthnic / bodyCount : 0;

        if (avgCoEthnic >= ETHNIC_BODY_THRESHOLD) {
            for (const osid of salient.body_osids) {
                if (seen.has(osid)) continue;
                seen.add(osid);
                holds.push({
                    osid,
                    reason: 'ethnic_hold',
                    salient_id: salient.salient_id,
                    co_ethnic_share: getCoEthnicShare(osid, faction, ethnicMap),
                    priority: 40,
                });
            }
        }
    }

    return holds.sort((a, b) => b.priority - a.priority || strictCompare(a.osid, b.osid));
}

// ── Main Assessment Function ──────────────────────────────────────────────

/**
 * Analyze front geometry for a single corps sector.
 *
 * Detects own and enemy salients, computes line-shortening scores for
 * potential targets, and identifies critical hold OSIDs.
 *
 * @param faction - The faction being analyzed
 * @param factionOsids - All faction-controlled OSIDs in this sector (territory_osids + front osids)
 * @param enemyOsids - Enemy-controlled OSIDs adjacent to this sector
 * @param targetOsids - Candidate offensive target OSIDs (for line-shortening scoring)
 * @param adjacency - Full OSID adjacency graph
 * @param ethnicMap - Per-OSID ethnic composition (null if unavailable)
 * @param ethnicNeckThreshold - Co-ethnic threshold for neck holds (default 0.40, modulated by officer)
 */
export function analyzeFrontGeometry(
    faction: FactionId,
    factionOsids: string[],
    enemyOsids: string[],
    targetOsids: string[],
    adjacency: Map<string, string[]>,
    ethnicMap: OsidEthnicComposition | null | undefined,
    ethnicNeckThreshold: number = DEFAULT_ETHNIC_NECK_THRESHOLD,
): FrontGeometryAssessment {
    const factionSet = new Set(factionOsids);
    const enemySet = new Set(enemyOsids);

    // Detect own salients (our territory bulging into enemy)
    const ownSalients = detectSalients(factionOsids, enemySet, adjacency)
        .map(s => ({ ...s, side: 'own' as const }));

    // Detect enemy salients (enemy territory bulging into ours)
    const enemySalients = detectSalients(enemyOsids, factionSet, adjacency)
        .map(s => ({ ...s, side: 'enemy' as const }));

    // Line-shortening scores for all candidate targets
    const line_shortening_scores = computeLineShorteningScores(
        targetOsids, adjacency, factionSet
    );

    // Critical holds from own salients + ethnic composition
    const critical_holds = buildCriticalHolds(
        ownSalients, faction, ethnicMap, ethnicNeckThreshold
    );

    return {
        own_salients: ownSalients,
        enemy_salients: enemySalients,
        line_shortening_scores,
        critical_holds,
    };
}
