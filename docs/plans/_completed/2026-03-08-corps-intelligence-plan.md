# Corps Intelligence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add front geometry analysis (salient detection, line-shortening, ethnic holds) and expanded commander personality to corps AI.

**Architecture:** New `front_geometry_analysis.ts` module produces a `FrontGeometryAssessment` per corps sector. The assessment is computed inline at the start of `generateCorpsDirectives()` and injected into the existing directive pipeline (offensive_targets, hold_osids, target sort). Commander traits (aggressiveness, defensive_skill, competence, political_reliability) modulate response to geometry findings. Ethnic composition data threaded from pipeline step through `generateAllCorpsOrders` → `generateCorpsDirectives`.

**Tech Stack:** TypeScript, Vitest, existing OSID adjacency graph + `isChokepoint()` BFS infrastructure from `osid_graph_analysis.ts`, `getCoEthnicShare()` from `ethnic_defense.ts`.

**Design doc:** `docs/plans/2026-03-08-corps-intelligence-design.md`

---

### Task 1: Create `front_geometry_analysis.ts` — Types and Salient Detection

**Files:**
- Create: `src/sim/combat/front_geometry_analysis.ts`

**Step 1: Define types and exports**

```typescript
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
```

**Step 2: Implement `detectSalients()`**

Core algorithm using articulation-point BFS (same pattern as existing `isChokepoint()` in `osid_graph_analysis.ts`).

```typescript
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
```

**Step 3: Commit**

```bash
git add src/sim/combat/front_geometry_analysis.ts
git commit -m "feat(corps-intel): salient detection core — types + detectSalients()"
```

---

### Task 2: Add Line-Shortening Score, Ethnic Holds, and Assessment Function

**Files:**
- Modify: `src/sim/combat/front_geometry_analysis.ts`

**Step 1: Add `getLineShorteningScore()` and `computeLineShorteningScores()`**

Append to `front_geometry_analysis.ts`:

```typescript
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
```

**Step 2: Add ethnic hold analysis and the main assessment function**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/sim/combat/front_geometry_analysis.ts
git commit -m "feat(corps-intel): line-shortening score + ethnic holds + analyzeFrontGeometry()"
```

---

### Task 3: Write Tests — Salient Detection

**Files:**
- Create: `tests/front_geometry_analysis.test.ts`

**Step 1: Build test fixtures and write salient detection tests**

```typescript
import { describe, it, expect } from 'vitest';
import { detectSalients, getLineShorteningScore, analyzeFrontGeometry, DEFAULT_ETHNIC_NECK_THRESHOLD } from '../src/sim/combat/front_geometry_analysis.js';
import type { OsidEthnicComposition } from '../src/sim/combat/ethnic_defense.js';

// ── Helper: build adjacency from edge pairs ───────────────────────────────

function buildAdj(pairs: [string, string][]): Map<string, string[]> {
    const adj = new Map<string, string[]>();
    for (const [a, b] of pairs) {
        if (!adj.has(a)) adj.set(a, []);
        if (!adj.has(b)) adj.set(b, []);
        adj.get(a)!.push(b);
        adj.get(b)!.push(a);
    }
    // Sort for determinism
    for (const [, neighbors] of adj) neighbors.sort();
    return adj;
}

// ── Salient Detection ─────────────────────────────────────────────────────

describe('detectSalients', () => {
    it('detects a simple salient connected through one neck OSID', () => {
        // Topology:
        //   main_1 -- main_2 -- NECK -- bulge_1 -- bulge_2
        //                                  |
        //                               bulge_3
        // Enemy surrounds the bulge
        const adj = buildAdj([
            ['op:a:main_1', 'op:a:main_2'],
            ['op:a:main_2', 'op:a:neck'],
            ['op:a:neck', 'op:a:bulge_1'],
            ['op:a:bulge_1', 'op:a:bulge_2'],
            ['op:a:bulge_1', 'op:a:bulge_3'],
            // Enemy adjacency
            ['op:a:bulge_1', 'op:e:enemy_1'],
            ['op:a:bulge_2', 'op:e:enemy_2'],
            ['op:a:bulge_3', 'op:e:enemy_3'],
            ['op:a:neck', 'op:e:enemy_4'],
        ]);

        const factionOsids = ['op:a:main_1', 'op:a:main_2', 'op:a:neck', 'op:a:bulge_1', 'op:a:bulge_2', 'op:a:bulge_3'];
        const enemyOsids = new Set(['op:e:enemy_1', 'op:e:enemy_2', 'op:e:enemy_3', 'op:e:enemy_4']);

        const result = detectSalients(factionOsids, enemyOsids, adj);

        expect(result.length).toBe(1);
        expect(result[0]!.neck_osids).toEqual(['op:a:neck']);
        expect(result[0]!.neck_width).toBe(1);
        expect(result[0]!.body_size).toBe(3); // bulge_1, bulge_2, bulge_3
        expect(result[0]!.vulnerability).toBe(3); // 3 / 1
    });

    it('detects a two-neck salient', () => {
        // Topology:
        //   main_1 -- neck_a -- bulge_1 -- bulge_2
        //   main_2 -- neck_b -- bulge_1
        // neck_a and neck_b are adjacent
        const adj = buildAdj([
            ['op:a:main_1', 'op:a:neck_a'],
            ['op:a:main_2', 'op:a:neck_b'],
            ['op:a:main_1', 'op:a:main_2'],
            ['op:a:neck_a', 'op:a:neck_b'],
            ['op:a:neck_a', 'op:a:bulge_1'],
            ['op:a:neck_b', 'op:a:bulge_1'],
            ['op:a:bulge_1', 'op:a:bulge_2'],
            // Enemy adjacency
            ['op:a:bulge_1', 'op:e:enemy_1'],
            ['op:a:bulge_2', 'op:e:enemy_2'],
            ['op:a:neck_a', 'op:e:enemy_3'],
            ['op:a:neck_b', 'op:e:enemy_4'],
        ]);

        const factionOsids = ['op:a:main_1', 'op:a:main_2', 'op:a:neck_a', 'op:a:neck_b', 'op:a:bulge_1', 'op:a:bulge_2'];
        const enemyOsids = new Set(['op:e:enemy_1', 'op:e:enemy_2', 'op:e:enemy_3', 'op:e:enemy_4']);

        const result = detectSalients(factionOsids, enemyOsids, adj);

        expect(result.length).toBe(1);
        expect(result[0]!.neck_width).toBe(2);
        expect(result[0]!.body_size).toBe(2); // bulge_1, bulge_2
        expect(result[0]!.vulnerability).toBe(1); // 2 / 2 = 1.0 — below MIN_VULNERABILITY
    });

    it('returns empty for a straight front line (no salient)', () => {
        // All OSIDs are evenly distributed — no narrow neck
        const adj = buildAdj([
            ['op:a:f1', 'op:a:f2'],
            ['op:a:f2', 'op:a:f3'],
            ['op:a:f3', 'op:a:f4'],
            ['op:a:f1', 'op:e:e1'],
            ['op:a:f2', 'op:e:e2'],
            ['op:a:f3', 'op:e:e3'],
            ['op:a:f4', 'op:e:e4'],
        ]);

        const factionOsids = ['op:a:f1', 'op:a:f2', 'op:a:f3', 'op:a:f4'];
        const enemyOsids = new Set(['op:e:e1', 'op:e:e2', 'op:e:e3', 'op:e:e4']);

        const result = detectSalients(factionOsids, enemyOsids, adj);
        expect(result).toEqual([]);
    });

    it('ignores salients with body_size < MIN_BODY_SIZE', () => {
        // Single OSID "salient" — just a normal front position
        const adj = buildAdj([
            ['op:a:main_1', 'op:a:main_2'],
            ['op:a:main_2', 'op:a:neck'],
            ['op:a:neck', 'op:a:tip'],
            ['op:a:tip', 'op:e:e1'],
            ['op:a:neck', 'op:e:e2'],
        ]);

        const factionOsids = ['op:a:main_1', 'op:a:main_2', 'op:a:neck', 'op:a:tip'];
        const enemyOsids = new Set(['op:e:e1', 'op:e:e2']);

        const result = detectSalients(factionOsids, enemyOsids, adj);
        expect(result).toEqual([]); // body_size=1 < MIN_BODY_SIZE=2
    });

    it('is deterministic — same input produces same output', () => {
        const adj = buildAdj([
            ['op:a:main_1', 'op:a:main_2'],
            ['op:a:main_2', 'op:a:neck'],
            ['op:a:neck', 'op:a:bulge_1'],
            ['op:a:bulge_1', 'op:a:bulge_2'],
            ['op:a:bulge_1', 'op:e:enemy_1'],
            ['op:a:bulge_2', 'op:e:enemy_2'],
            ['op:a:neck', 'op:e:enemy_3'],
        ]);

        const factionOsids = ['op:a:main_1', 'op:a:main_2', 'op:a:neck', 'op:a:bulge_1', 'op:a:bulge_2'];
        const enemyOsids = new Set(['op:e:enemy_1', 'op:e:enemy_2', 'op:e:enemy_3']);

        const r1 = detectSalients(factionOsids, enemyOsids, adj);
        const r2 = detectSalients(factionOsids, enemyOsids, adj);
        expect(r1).toEqual(r2);
    });
});

// ── Line-Shortening Score ─────────────────────────────────────────────────

describe('getLineShorteningScore', () => {
    it('returns negative for targets that shorten the line', () => {
        // Target has 4 friendly neighbors and 1 enemy → capturing removes 4 front edges, adds 0 new
        // (the 1 enemy edge becomes part of internal territory)
        // Wait — let's think about this correctly:
        // edges_removed = friendly neighbors (these were front edges, now become interior)
        // NO — line shortening = enemy_remaining - friendly_neighbors
        // 4 friendly, 1 enemy → score = 1 - 4 = -3
        const adj = buildAdj([
            ['op:target', 'op:f1'],
            ['op:target', 'op:f2'],
            ['op:target', 'op:f3'],
            ['op:target', 'op:f4'],
            ['op:target', 'op:e1'],
        ]);
        const factionSet = new Set(['op:f1', 'op:f2', 'op:f3', 'op:f4']);

        expect(getLineShorteningScore('op:target', adj, factionSet)).toBe(-3);
    });

    it('returns positive for targets that lengthen the line', () => {
        // 1 friendly, 4 enemy → score = 4 - 1 = 3
        const adj = buildAdj([
            ['op:target', 'op:f1'],
            ['op:target', 'op:e1'],
            ['op:target', 'op:e2'],
            ['op:target', 'op:e3'],
            ['op:target', 'op:e4'],
        ]);
        const factionSet = new Set(['op:f1']);

        expect(getLineShorteningScore('op:target', adj, factionSet)).toBe(3);
    });

    it('returns zero for neutral captures', () => {
        // 2 friendly, 2 enemy → score = 0
        const adj = buildAdj([
            ['op:target', 'op:f1'],
            ['op:target', 'op:f2'],
            ['op:target', 'op:e1'],
            ['op:target', 'op:e2'],
        ]);
        const factionSet = new Set(['op:f1', 'op:f2']);

        expect(getLineShorteningScore('op:target', adj, factionSet)).toBe(0);
    });
});

// ── Ethnic Hold Constraints ───────────────────────────────────────────────

describe('analyzeFrontGeometry ethnic holds', () => {
    it('marks salient neck as ethnically critical when co-ethnic share >= threshold', () => {
        const adj = buildAdj([
            ['op:a:main_1', 'op:a:main_2'],
            ['op:a:main_2', 'op:a:neck'],
            ['op:a:neck', 'op:a:bulge_1'],
            ['op:a:bulge_1', 'op:a:bulge_2'],
            ['op:a:bulge_1', 'op:e:enemy_1'],
            ['op:a:bulge_2', 'op:e:enemy_2'],
            ['op:a:neck', 'op:e:enemy_3'],
        ]);

        const ethnicMap: OsidEthnicComposition = new Map([
            ['op:a:neck', { bosniak: 0.10, serb: 0.70, croat: 0.20 }],
            ['op:a:bulge_1', { bosniak: 0.15, serb: 0.65, croat: 0.20 }],
            ['op:a:bulge_2', { bosniak: 0.20, serb: 0.55, croat: 0.25 }],
        ]);

        const result = analyzeFrontGeometry(
            'RS',
            ['op:a:main_1', 'op:a:main_2', 'op:a:neck', 'op:a:bulge_1', 'op:a:bulge_2'],
            ['op:e:enemy_1', 'op:e:enemy_2', 'op:e:enemy_3'],
            [],
            adj,
            ethnicMap,
        );

        // Neck should be ethnically critical (70% Serb > 40% threshold)
        const neckHold = result.critical_holds.find(h => h.osid === 'op:a:neck');
        expect(neckHold).toBeDefined();
        expect(neckHold!.reason).toBe('ethnic_hold');
        expect(neckHold!.priority).toBe(100);
    });

    it('marks salient neck as structural hold when no ethnic majority', () => {
        const adj = buildAdj([
            ['op:a:main_1', 'op:a:main_2'],
            ['op:a:main_2', 'op:a:neck'],
            ['op:a:neck', 'op:a:bulge_1'],
            ['op:a:bulge_1', 'op:a:bulge_2'],
            ['op:a:bulge_1', 'op:e:enemy_1'],
            ['op:a:bulge_2', 'op:e:enemy_2'],
            ['op:a:neck', 'op:e:enemy_3'],
        ]);

        const ethnicMap: OsidEthnicComposition = new Map([
            ['op:a:neck', { bosniak: 0.40, serb: 0.30, croat: 0.30 }],
        ]);

        const result = analyzeFrontGeometry(
            'RS',
            ['op:a:main_1', 'op:a:main_2', 'op:a:neck', 'op:a:bulge_1', 'op:a:bulge_2'],
            ['op:e:enemy_1', 'op:e:enemy_2', 'op:e:enemy_3'],
            [],
            adj,
            ethnicMap,
        );

        const neckHold = result.critical_holds.find(h => h.osid === 'op:a:neck');
        expect(neckHold).toBeDefined();
        expect(neckHold!.reason).toBe('salient_neck');
        expect(neckHold!.priority).toBe(60);
    });

    it('detects enemy salients for offensive exploitation', () => {
        const adj = buildAdj([
            ['op:e:main_1', 'op:e:main_2'],
            ['op:e:main_2', 'op:e:neck'],
            ['op:e:neck', 'op:e:bulge_1'],
            ['op:e:bulge_1', 'op:e:bulge_2'],
            // Friendly adjacency to enemy
            ['op:e:bulge_1', 'op:a:f1'],
            ['op:e:bulge_2', 'op:a:f2'],
            ['op:e:neck', 'op:a:f3'],
        ]);

        const result = analyzeFrontGeometry(
            'RS',
            ['op:a:f1', 'op:a:f2', 'op:a:f3'],
            ['op:e:main_1', 'op:e:main_2', 'op:e:neck', 'op:e:bulge_1', 'op:e:bulge_2'],
            ['op:e:neck'], // targeting the neck
            adj,
            null,
        );

        expect(result.enemy_salients.length).toBe(1);
        expect(result.enemy_salients[0]!.neck_osids).toContain('op:e:neck');
        expect(result.enemy_salients[0]!.side).toBe('enemy');
    });
});
```

**Step 2: Run tests**

```bash
npx vitest run tests/front_geometry_analysis.test.ts
```

Expected: All tests pass (after Task 1+2 implementation is complete).

**Step 3: Commit**

```bash
git add tests/front_geometry_analysis.test.ts
git commit -m "test(corps-intel): salient detection, line-shortening, ethnic hold tests"
```

---

### Task 4: Wire Ethnic Composition into Corps Directive Pipeline

**Files:**
- Modify: `src/sim/combat/bot_corps_ai.ts` — add `ethnicMap` parameter
- Modify: `src/sim/turn_phases/war_phases.ts` — compute and pass ethnic data

The ethnic composition map is currently only computed for the brigade AI step
and attack resolution step. We need it in `generateCorpsDirectives` too.

**Step 1: Add `ethnicMap` parameter to `generateCorpsDirectives`**

In `src/sim/combat/bot_corps_ai.ts`, find the function signature (around line 1238):

```typescript
// BEFORE:
export function generateCorpsDirectives(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap | null,
    graphAnalysis: FactionGraphAnalysis | null,
    supplyByOsid?: SupplyStateByOsidReport | null
): void {

// AFTER:
export function generateCorpsDirectives(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    reverseMap: OperationalToCanonicalReverseMap | null,
    graphAnalysis: FactionGraphAnalysis | null,
    supplyByOsid?: SupplyStateByOsidReport | null,
    ethnicMap?: OsidEthnicComposition | null,
): void {
```

Add import at top of file:
```typescript
import type { OsidEthnicComposition } from './ethnic_defense.js';
```

**Step 2: Thread `ethnicMap` through `generateAllCorpsOrders`**

In `src/sim/combat/bot_corps_ai.ts`, find `generateAllCorpsOrders` (around line 2000):

```typescript
// BEFORE:
export function generateAllCorpsOrders(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    sidToMun: Map<SettlementId, string>,
    reverseMap?: OperationalToCanonicalReverseMap | null,
    osidEdges?: EdgeRecord[],
    supplyByOsid?: SupplyStateByOsidReport | null
): void {

// AFTER:
export function generateAllCorpsOrders(
    state: GameState,
    faction: FactionId,
    edges: EdgeRecord[],
    sidToMun: Map<SettlementId, string>,
    reverseMap?: OperationalToCanonicalReverseMap | null,
    osidEdges?: EdgeRecord[],
    supplyByOsid?: SupplyStateByOsidReport | null,
    ethnicMap?: OsidEthnicComposition | null,
): void {
```

And update the call to `generateCorpsDirectives` (around line 2042):

```typescript
// BEFORE:
generateCorpsDirectives(state, faction, effectiveOsidEdges, reverseMap ?? null, graphAnalysis, supplyByOsid);

// AFTER:
generateCorpsDirectives(state, faction, effectiveOsidEdges, reverseMap ?? null, graphAnalysis, supplyByOsid, ethnicMap);
```

**Step 3: Compute and pass ethnic data in war_phases.ts**

In `src/sim/turn_phases/war_phases.ts`, find the `generate-all-corps-orders` step
(around line 630). The ethnic composition is computed later for brigade AI; we need
it here too.

```typescript
// Find the step block that calls generateAllCorpsOrders (around line 630-646)
// Add ethnic composition computation before the corps loop:

// BEFORE the faction loop:
let corpsEthnicComposition: OsidEthnicComposition | undefined;
try {
    const ethnicityData = await loadSettlementEthnicityData();
    corpsEthnicComposition = computeOsidEthnicComposition(od.opData.operationalToCanonical, ethnicityData);
} catch {
    // Non-fatal: ethnic scoring is a bonus
}

// THEN update the call:
// BEFORE:
generateAllCorpsOrders(context.state, faction, edges, sidToMun, reverseMap, osidEdges, supplyByOsid);

// AFTER:
generateAllCorpsOrders(context.state, faction, edges, sidToMun, reverseMap, osidEdges, supplyByOsid, corpsEthnicComposition);
```

Add the import for `OsidEthnicComposition` if not already present (it should be
available through the existing `computeOsidEthnicComposition` import chain).

**Step 4: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: Clean.

**Step 5: Commit**

```bash
git add src/sim/combat/bot_corps_ai.ts src/sim/turn_phases/war_phases.ts
git commit -m "feat(corps-intel): thread ethnic composition into corps directive pipeline"
```

---

### Task 5: Inject Geometry Results into Directive Construction

**Files:**
- Modify: `src/sim/combat/bot_corps_ai.ts`

This is the core integration. After computing `offensiveTargets` and `holdOsids`
but before sorting, call `analyzeFrontGeometry()` and inject results.

**Step 1: Add imports and call geometry analysis**

At the top of `bot_corps_ai.ts`, add:

```typescript
import { analyzeFrontGeometry, type FrontGeometryAssessment } from './front_geometry_analysis.js';
import { getCoEthnicShare } from './ethnic_defense.js';
import { getCorpsCommander, getEffectiveCompetence } from './officer_system.js';
```

(Some of these may already be imported — merge as needed.)

Inside the per-corps loop in `generateCorpsDirectives`, after `holdOsids` assembly
(around line 1485) and before the target sort (around line 1643), add:

```typescript
        // ── Front Geometry Analysis ──────────────────────────────────────
        // Detect salients, compute line-shortening, identify critical holds.
        // Results feed into offensive_targets, hold_osids, and target sorting.
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
            // Officer political_reliability modulates ethnic neck threshold
            let ethnicNeckThreshold = 0.40; // DEFAULT_ETHNIC_NECK_THRESHOLD
            if (state.named_officers && state.named_officer_data) {
                const commander = getCorpsCommander(corps.id, state);
                if (commander) {
                    ethnicNeckThreshold = 0.40 + (3 - commander.data.political_reliability) * 0.05;
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
```

**Step 2: Inject enemy salient necks into offensive targets**

After the geometry call, before the sort:

```typescript
        // Inject enemy salient neck OSIDs as high-priority offensive targets
        if (geometry) {
            const commander = state.named_officers && state.named_officer_data
                ? getCorpsCommander(corps.id, state)
                : null;
            const salientPriorityBoost = commander ? commander.data.aggressiveness >= 4 : false;

            for (const salient of geometry.enemy_salients) {
                for (const neckOsid of salient.neck_osids) {
                    if (!offensiveTargets.includes(neckOsid) && !avoidOsids.includes(neckOsid)) {
                        if (salientPriorityBoost) {
                            // Aggressive commanders: insert at front
                            offensiveTargets.unshift(neckOsid);
                        } else {
                            // Normal commanders: append (will be sorted by normal criteria)
                            offensiveTargets.push(neckOsid);
                        }
                    }
                }
            }
        }
```

**Step 3: Inject critical holds into hold_osids**

```typescript
        // Inject geometry-derived critical holds (unconditional — all commanders)
        if (geometry) {
            for (const hold of geometry.critical_holds) {
                if (!holdOsids.includes(hold.osid)) {
                    holdOsids.push(hold.osid);
                }
            }
        }
```

**Step 4: Replace consolidation score with line-shortening in sort**

Find the target sort (around line 1643). Replace the `getConsolidationScore` lambda
and its usage in the sort:

```typescript
        // BEFORE (inside sort):
        // const getConsolidationScore = (osid: string): number => {
        //     const neighbors = adjacency.get(osid) ?? [];
        //     return neighbors.filter(n => getPoliticalControllerOSID(state, n, reverseMap) === faction).length;
        // };
        // ...
        // const consolidationDiff = getConsolidationScore(b) - getConsolidationScore(a);

        // AFTER — use line-shortening scores from geometry if available, fall back to consolidation:
        const getTargetShapeScore = (osid: string): number => {
            if (geometry?.line_shortening_scores.has(osid)) {
                return geometry.line_shortening_scores.get(osid)!;
            }
            // Fallback: simple consolidation (negative = more friendly neighbors = better)
            const neighbors = adjacency.get(osid) ?? [];
            return -(neighbors.filter(n => getPoliticalControllerOSID(state, n, reverseMap) === faction).length);
        };

        // In the sort comparator, replace the consolidation comparison:
        // BEFORE: const consolidationDiff = getConsolidationScore(b) - getConsolidationScore(a);
        // AFTER:
        const shapeDiff = getTargetShapeScore(a) - getTargetShapeScore(b);
        if (shapeDiff !== 0) return shapeDiff;
```

Note: line-shortening is negative=good (shortens), so we sort ascending (a - b).
The old consolidation was high=good, sorted descending (b - a). The new score
already inverts the sign in the fallback so both paths sort ascending.

**Step 5: Run typecheck + tests**

```bash
npx tsc --noEmit
npx vitest run tests/front_geometry_analysis.test.ts
```

**Step 6: Commit**

```bash
git add src/sim/combat/bot_corps_ai.ts
git commit -m "feat(corps-intel): inject geometry into directives — salient targets, holds, line-shortening sort"
```

---

### Task 6: Commander Personality Expansion

**Files:**
- Modify: `src/sim/combat/bot_corps_ai.ts`

Expand officer trait influence beyond the current `(agg - 3) × 0.05`.

**Step 1: Expand aggression modifier range**

Find the aggression computation (around line 1516):

```typescript
// BEFORE:
const officerAggressionShift = (commander.data.aggressiveness - 3) * 0.05;

// AFTER:
const officerAggressionShift = (commander.data.aggressiveness - 3) * 0.08;
```

**Step 2: Add max_attackers modulation by aggressiveness**

Find `maxAttackersPerTarget` (around line 1490):

```typescript
// BEFORE:
const maxAttackersPerTarget = cmd.stance === 'defensive' || cmd.stance === 'reorganize' ? 2 : 3;

// AFTER:
let maxAttackersPerTarget = cmd.stance === 'defensive' || cmd.stance === 'reorganize' ? 2 : 3;
```

Then after the officer trait block (after `aggressionModifier +=`):

```typescript
// Aggressive commanders concentrate more force per target
if (commander && commander.data.aggressiveness >= 4) {
    maxAttackersPerTarget = Math.min(maxAttackersPerTarget + 1, 5);
}
```

**Step 3: Add reserve fraction modulation by defensive_skill**

Find the reserve fraction assignment. Currently it's set by stance (around lines 1495-1502
based on the exploration). After the stance-based assignment:

```typescript
// BEFORE (reserve_fraction set by stance):
// offensive → 0.1, balanced → 0.2, defensive → 0.3, reorganize → 0.0

// AFTER — modulate by defensive_skill:
if (commander) {
    const defSkillAdj = (commander.data.defensive_skill - 3) * 0.03;
    reserveFraction = Math.max(0.05, Math.min(0.40, reserveFraction + defSkillAdj));
}
```

**Step 4: Expand competence-based risk tolerance**

Find the competence check (around line 1523):

```typescript
// BEFORE:
if (effComp >= 4 && bestMinOutcome === 'victory') {
    bestMinOutcome = 'costly_victory';
}

// AFTER:
if (effComp >= 5) {
    // Elite: accept costly_victory on everything
    if (bestMinOutcome === 'victory' || bestMinOutcome === 'decisive_victory') {
        bestMinOutcome = 'costly_victory';
    }
} else if (effComp >= 4) {
    // Experienced: accept costly_victory when current is victory
    if (bestMinOutcome === 'victory') {
        bestMinOutcome = 'costly_victory';
    }
} else if (effComp <= 2) {
    // Poor: overly cautious — upgrade minimum outcome
    if (bestMinOutcome === 'costly_victory') {
        bestMinOutcome = 'victory';
    }
}
```

**Step 5: Add salient reinforcement priority for high defensive_skill**

After the geometry injection block (from Task 5), add sector reinforcement logic:

```typescript
        // High defensive_skill commanders prioritize reinforcing sectors with own salients
        if (geometry && geometry.own_salients.length > 0 && commander && commander.data.defensive_skill >= 4) {
            for (const salient of geometry.own_salients) {
                // Find which sector contains the salient neck
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
```

**Step 6: Run typecheck + tests**

```bash
npx tsc --noEmit
npx vitest run
```

**Step 7: Commit**

```bash
git add src/sim/combat/bot_corps_ai.ts
git commit -m "feat(corps-intel): expand commander personality — aggression, reserves, risk, reinforcement"
```

---

### Task 7: Typecheck + Full Test Suite + Smoke Run

**Step 1: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: Clean (0 errors).

**Step 2: Run full vitest suite**

```bash
npx vitest run
```

Expected: All 378+ tests pass (new tests from Task 3 included).

**Step 3: Run 40w scenario**

```bash
npm run sim:scenario:run:40w
```

Expected: Completes without crashes. Check the output for:
- Territory match rate (should be near 85-88% baseline — geometry changes may shift ±2pp)
- Troop strengths (should be in historical bands)
- No new `invalid_operation_count` errors

**Step 4: Spot-check geometry in weekly reports**

Look at `weekly_report.jsonl` for any corps directives with `hold_osids` that
include the new geometry-derived holds. Verify enemy salient necks appear in
`offensive_targets`.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(corps-intel): front geometry analysis + commander personality — complete"
```

---

## Implementation Order Summary

| Task | What | Approx Lines | Depends On |
|------|------|-------------|------------|
| 1 | Salient detection core | ~150 | — |
| 2 | Line-shortening + ethnic holds + assessment | ~120 | Task 1 |
| 3 | Tests | ~200 | Tasks 1–2 |
| 4 | Thread ethnic data into corps pipeline | ~30 | — |
| 5 | Inject geometry into directives | ~80 | Tasks 1–4 |
| 6 | Commander personality expansion | ~40 | Task 5 |
| 7 | Full verification + scenario run | — | Tasks 1–6 |

Total: ~620 lines new/modified code.
