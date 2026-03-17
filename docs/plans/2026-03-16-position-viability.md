# Position Viability — 5th Commander Override Criterion

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a position viability criterion to the commander override that pulls exposed brigades (≤1 friendly neighbor, not mission-critical) to safer positions. Prevents brigades from dying in untenable salients.

**Architecture:** New `applyPositionViability()` function in `commander_override.ts`, called as the 5th criterion in `commanderReviewAssignment`. Unlike the other 4 criteria (which use `transferBrigadesBetweenSectors`), this one issues direct per-brigade overrides — it finds exposed brigades, checks if their position is mission-critical, then moves them to the nearest safe sector. Needs `adjacency` and `friendlyOsids` passed through from the call site.

**Tech Stack:** TypeScript, Vitest, existing CommanderOverride type.

---

## File Structure

```
src/sim/combat/commander_override.ts  — add applyPositionViability + reason type
src/sim/combat/corps_front_sectors.ts — pass adjacency + friendlyOsids to commanderReviewAssignment
tests/commander_override.test.ts      — add viability tests
```

---

## Task 1: Add 'position_viability' reason + pass adjacency/friendlyOsids

**Files:**
- Modify: `src/sim/combat/commander_override.ts` — add reason to union type
- Modify: `src/sim/combat/corps_front_sectors.ts` — pass new params at call site
- Test: `tests/commander_override.test.ts`

- [ ] **Step 1: Update CommanderOverride reason union**

In `commander_override.ts`, line 35, add `'position_viability'` to the reason union:

```typescript
reason: 'mission_priority' | 'non_priority_excess' | 'offensive_staging' | 'defensive_critical' | 'position_viability';
```

- [ ] **Step 2: Add adjacency + friendlyOsids params to commanderReviewAssignment**

Update the function signature (line 160-166) to add two new parameters:

```typescript
export function commanderReviewAssignment(
    corpsId: string,
    sectors: CorpsFrontSector[],
    formations: Record<string, FormationState>,
    armyPriorities: ArmyOperationPriority[],
    commanderProfile: CorpsCommanderProfile,
    componentOf: Map<string, number>,
    adjacency: Map<string, string[]>,
    friendlyOsids: Set<string>,
): CommanderOverride[] {
```

Add a stub call after `applyDefensiveCoherence` (line 186):

```typescript
    applyPositionViability(corpsSectors, formations, armyPriorities, commanderProfile, overrides, overriddenBrigadeIds, componentOf, adjacency, friendlyOsids);
```

Add the stub function at the bottom of the file:

```typescript
/** Pull exposed brigades from untenable positions to safer OSIDs. */
function applyPositionViability(
    _corpsSectors: CorpsFrontSector[],
    _formations: Record<string, FormationState>,
    _armyPriorities: ArmyOperationPriority[],
    _commanderProfile: CorpsCommanderProfile,
    _overrides: CommanderOverride[],
    _overriddenBrigadeIds: Set<string>,
    _componentOf: Map<string, number>,
    _adjacency: Map<string, string[]>,
    _friendlyOsids: Set<string>,
): void {
    // Implemented in Task 2
}
```

- [ ] **Step 3: Update call site in corps_front_sectors.ts**

At line 221-224, pass the new parameters:

```typescript
            commanderReviewAssignment(
                cid, sectors, formations, priorities, profile,
                componentOf, adjacency, friendlyOsids,
            );
```

- [ ] **Step 4: Update test call sites**

All test calls to `commanderReviewAssignment` need two new params. Add `new Map()` for adjacency and `new Set()` for friendlyOsids to every existing test call:

```typescript
commanderReviewAssignment(
    corpsId, sectors, formations, priorities, profile,
    new Map(), new Map(), new Set(),
);
```

- [ ] **Step 5: Typecheck + run tests**

```bash
npx tsc --noEmit
npx vitest run tests/commander_override.test.ts
```

All existing tests pass (stub does nothing).

- [ ] **Step 6: Commit**

```bash
git add src/sim/combat/commander_override.ts src/sim/combat/corps_front_sectors.ts tests/commander_override.test.ts
git commit -m "feat: position viability stub + adjacency/friendlyOsids passthrough"
```

---

## Task 2: Implement applyPositionViability

**Files:**
- Modify: `src/sim/combat/commander_override.ts` — implement the function
- Modify: `tests/commander_override.test.ts` — add tests

- [ ] **Step 1: Write tests**

```typescript
describe('position viability', () => {
    // Helper: build adjacency + friendlyOsids for viability tests
    function makeViabilityContext(
        friendlyList: string[],
        adjacencyPairs: [string, string][],
    ): { adjacency: Map<string, string[]>; friendlyOsids: Set<string> } {
        const friendlyOsids = new Set(friendlyList);
        const adjacency = new Map<string, string[]>();
        for (const [a, b] of adjacencyPairs) {
            if (!adjacency.has(a)) adjacency.set(a, []);
            if (!adjacency.has(b)) adjacency.set(b, []);
            adjacency.get(a)!.push(b);
            adjacency.get(b)!.push(a);
        }
        return { adjacency, friendlyOsids };
    }

    it('withdraws brigade with 0 friendly neighbors (encircled)', () => {
        // b1 at osid_exposed: 0 friendly neighbors, 3 enemy
        // b2 at osid_safe: 3 friendly neighbors
        const sectors = [
            makeSector('s1', 'vrs_drina', ['b1'], 4, 1.0),
            makeSector('s2', 'vrs_drina', ['b2'], 4, 0.5),
        ];
        const formations: Record<string, any> = {
            b1: makeFormation('b1', 'op:srebrenik:tinja', 'vrs_drina', 800),
            b2: makeFormation('b2', 'op:bijeljina:safe', 'vrs_drina', 800),
        };
        const { adjacency, friendlyOsids } = makeViabilityContext(
            ['op:bijeljina:safe', 'op:bijeljina:n1', 'op:bijeljina:n2'],
            [
                ['op:srebrenik:tinja', 'op:enemy:e1'],
                ['op:srebrenik:tinja', 'op:enemy:e2'],
                ['op:srebrenik:tinja', 'op:enemy:e3'],
                ['op:bijeljina:safe', 'op:bijeljina:n1'],
                ['op:bijeljina:safe', 'op:bijeljina:n2'],
                ['op:bijeljina:safe', 'op:bijeljina:n3'],
            ],
        );
        const profile = { competence: 0.6, aggressiveness: 0.5, preStagingSectorWeights: new Map() };
        const componentOf = new Map<string, number>();
        const result = commanderReviewAssignment(
            'vrs_drina', sectors, formations, [], profile,
            componentOf, adjacency, friendlyOsids,
        );
        expect(result.some(o => o.brigade_id === 'b1' && o.reason === 'position_viability')).toBe(true);
    });

    it('withdraws brigade with 1 friendly neighbor (balanced commander)', () => {
        const sectors = [
            makeSector('s1', 'vrs_drina', ['b1'], 4, 1.0),
            makeSector('s2', 'vrs_drina', ['b2'], 4, 0.5),
        ];
        const formations: Record<string, any> = {
            b1: makeFormation('b1', 'op:test:exposed', 'vrs_drina', 800),
            b2: makeFormation('b2', 'op:test:safe', 'vrs_drina', 800),
        };
        const { adjacency, friendlyOsids } = makeViabilityContext(
            ['op:test:exposed', 'op:test:safe', 'op:test:n1', 'op:test:n2'],
            [
                ['op:test:exposed', 'op:test:safe'],    // 1 friendly neighbor
                ['op:test:exposed', 'op:enemy:e1'],
                ['op:test:exposed', 'op:enemy:e2'],
                ['op:test:safe', 'op:test:n1'],
                ['op:test:safe', 'op:test:n2'],
            ],
        );
        const profile = { competence: 0.6, aggressiveness: 0.5, preStagingSectorWeights: new Map() };
        const result = commanderReviewAssignment(
            'vrs_drina', sectors, formations, [], profile,
            new Map(), adjacency, friendlyOsids,
        );
        expect(result.some(o => o.brigade_id === 'b1' && o.reason === 'position_viability')).toBe(true);
    });

    it('aggressive commander only withdraws at 0 neighbors', () => {
        const sectors = [
            makeSector('s1', 'vrs_drina', ['b1'], 4, 1.0),
            makeSector('s2', 'vrs_drina', ['b2'], 4, 0.5),
        ];
        const formations: Record<string, any> = {
            b1: makeFormation('b1', 'op:test:exposed', 'vrs_drina', 800),
            b2: makeFormation('b2', 'op:test:safe', 'vrs_drina', 800),
        };
        const { adjacency, friendlyOsids } = makeViabilityContext(
            ['op:test:exposed', 'op:test:safe', 'op:test:n1'],
            [
                ['op:test:exposed', 'op:test:safe'],    // 1 friendly neighbor
                ['op:test:exposed', 'op:enemy:e1'],
                ['op:test:safe', 'op:test:n1'],
            ],
        );
        // Aggressive commander (0.8) — only withdraws at 0 neighbors
        const profile = { competence: 0.6, aggressiveness: 0.8, preStagingSectorWeights: new Map() };
        const result = commanderReviewAssignment(
            'vrs_drina', sectors, formations, [], profile,
            new Map(), adjacency, friendlyOsids,
        );
        // Should NOT withdraw — 1 friendly neighbor is acceptable for aggressive
        expect(result.filter(o => o.reason === 'position_viability').length).toBe(0);
    });

    it('does not withdraw from mission-critical position', () => {
        const sectors = [
            makeSector('s1', 'vrs_drina', ['b1'], 4, 1.0),
            makeSector('s2', 'vrs_drina', ['b2'], 4, 0.5),
        ];
        const formations: Record<string, any> = {
            b1: makeFormation('b1', 'op:srebrenica:srebrenica_2', 'vrs_drina', 800),
            b2: makeFormation('b2', 'op:test:safe', 'vrs_drina', 800),
        };
        const { adjacency, friendlyOsids } = makeViabilityContext(
            ['op:srebrenica:srebrenica_2', 'op:test:safe'],
            [
                ['op:srebrenica:srebrenica_2', 'op:enemy:e1'],
                ['op:srebrenica:srebrenica_2', 'op:enemy:e2'],
                ['op:test:safe', 'op:test:n1'],
            ],
        );
        const priorities = [{
            name: 'Hold Srebrenica', corps_id: 'vrs_drina',
            target_municipalities: [], hold_municipalities: ['srebrenica'],
            start_week: 0, end_week: 52, weight: 100,
            min_outcome: 'stalemate' as const,
        }];
        const profile = { competence: 0.6, aggressiveness: 0.5, preStagingSectorWeights: new Map() };
        const result = commanderReviewAssignment(
            'vrs_drina', sectors, formations, priorities, profile,
            new Map(), adjacency, friendlyOsids,
        );
        // Should NOT withdraw — Srebrenica is in hold_municipalities
        expect(result.filter(o => o.reason === 'position_viability').length).toBe(0);
    });

    it('caps withdrawals at MAX_VIABILITY_WITHDRAWALS_PER_CORPS', () => {
        // 3 exposed brigades but cap is 2
        const sectors = [
            makeSector('s1', 'vrs_drina', ['b1', 'b2', 'b3'], 6, 1.0),
            makeSector('s2', 'vrs_drina', ['b4'], 4, 0.5),
        ];
        const formations: Record<string, any> = {
            b1: makeFormation('b1', 'op:test:exp1', 'vrs_drina', 800),
            b2: makeFormation('b2', 'op:test:exp2', 'vrs_drina', 700),
            b3: makeFormation('b3', 'op:test:exp3', 'vrs_drina', 600),
            b4: makeFormation('b4', 'op:test:safe', 'vrs_drina', 800),
        };
        const { adjacency, friendlyOsids } = makeViabilityContext(
            ['op:test:exp1', 'op:test:exp2', 'op:test:exp3', 'op:test:safe', 'op:test:n1', 'op:test:n2'],
            [
                ['op:test:exp1', 'op:enemy:e1'],
                ['op:test:exp2', 'op:enemy:e2'],
                ['op:test:exp3', 'op:enemy:e3'],
                ['op:test:safe', 'op:test:n1'],
                ['op:test:safe', 'op:test:n2'],
            ],
        );
        const profile = { competence: 0.6, aggressiveness: 0.5, preStagingSectorWeights: new Map() };
        const result = commanderReviewAssignment(
            'vrs_drina', sectors, formations, [], profile,
            new Map(), adjacency, friendlyOsids,
        );
        const viabilityOverrides = result.filter(o => o.reason === 'position_viability');
        expect(viabilityOverrides.length).toBeLessThanOrEqual(2);
    });
});
```

- [ ] **Step 2: Implement applyPositionViability**

Replace the stub with:

```typescript
const MAX_VIABILITY_WITHDRAWALS_PER_CORPS = 2;
const SAFE_FRIENDLY_NEIGHBOR_COUNT = 2;

/**
 * Pull exposed brigades from untenable positions to safer sectors.
 * Exposed = ≤1 friendly neighbor (one attack from encirclement).
 * Mission-critical positions (hold/target municipalities) are exempt.
 * Aggressive commanders only withdraw at 0 neighbors (encircled).
 */
function applyPositionViability(
    corpsSectors: CorpsFrontSector[],
    formations: Record<string, FormationState>,
    armyPriorities: ArmyOperationPriority[],
    commanderProfile: CorpsCommanderProfile,
    overrides: CommanderOverride[],
    overriddenBrigadeIds: Set<string>,
    _componentOf: Map<string, number>,
    adjacency: Map<string, string[]>,
    friendlyOsids: Set<string>,
): void {
    // Commander personality: aggressive holds longer
    const withdrawThreshold = commanderProfile.aggressiveness >= 0.6 ? 0 : 1;

    // Build mission-critical municipality set
    const missionMunicipalities = new Set<string>();
    for (const p of armyPriorities) {
        for (const m of p.target_municipalities) missionMunicipalities.add(m);
        if (p.hold_municipalities) {
            for (const m of p.hold_municipalities) missionMunicipalities.add(m);
        }
    }

    // Count friendly neighbors per OSID for all brigade locations
    const countFriendlyNeighbors = (osid: string): number => {
        const neighbors = adjacency.get(osid) ?? [];
        let count = 0;
        for (const n of neighbors) {
            if (friendlyOsids.has(n)) count++;
        }
        return count;
    };

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

            const friendlyCount = countFriendlyNeighbors(f.location_osid);
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

    // Sort: most exposed first (0 neighbors before 1), then by personnel ascending
    exposedBrigades.sort((a, b) =>
        a.friendlyNeighborCount - b.friendlyNeighborCount
        || a.personnel - b.personnel
        || strictCompare(a.brigadeId, b.brigadeId)
    );

    // Find safest sector to receive withdrawing brigades (most friendly territory, lowest threat)
    const safestSector = [...corpsSectors]
        .filter(s => s.assigned_brigade_ids.length > 0 || s.territory_osids.length > 0)
        .sort((a, b) => a.threat_ratio - b.threat_ratio || strictCompare(a.sector_id, b.sector_id))[0];

    if (!safestSector) return;

    // Issue withdrawal overrides (capped)
    let withdrawCount = 0;
    for (const exposed of exposedBrigades) {
        if (withdrawCount >= MAX_VIABILITY_WITHDRAWALS_PER_CORPS) break;
        if (exposed.sectorId === safestSector.sector_id) continue; // already in safest sector

        overrides.push({
            brigade_id: exposed.brigadeId,
            from_sector_id: exposed.sectorId,
            to_sector_id: safestSector.sector_id,
            reason: 'position_viability',
        });
        overriddenBrigadeIds.add(exposed.brigadeId);
        withdrawCount++;
    }
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run tests/commander_override.test.ts
```

All tests pass (existing + 5 new).

- [ ] **Step 4: Typecheck + full suite**

```bash
npx tsc --noEmit
npx vitest run
```

- [ ] **Step 5: Commit**

```bash
git add src/sim/combat/commander_override.ts tests/commander_override.test.ts
git commit -m "feat: position viability — 5th commander override criterion"
```

---

## Task 3: Integration — 40w scenario + verification

- [ ] **Step 1: Run 40w scenario**

```bash
npm run sim:scenario:run:40w
```

- [ ] **Step 2: Run comparison tool**

```bash
node tools/compare_painted_vs_sim.cjs <run_dir>
```

Check: no regression from n824 baseline (89.4% area, 6/6 benchmarks, 13/13 anchors).

- [ ] **Step 3: Check for position viability in action**

Verify the reachability violations are reduced (the 2 known brigades). Check if Drina improves further.

- [ ] **Step 4: Commit results + docs**

Record in CALIBRATION_MASTER. Update napkin backlog (salient retreat → RESOLVED).

---

## Execution Checklist

| Step | Task | Gate |
|------|------|------|
| 1 | Reason type + param passthrough + stub | Existing tests pass |
| 2 | Implement applyPositionViability + 5 tests | All tests pass |
| 3 | 40w scenario + /war-or-game if needed | No regression |
