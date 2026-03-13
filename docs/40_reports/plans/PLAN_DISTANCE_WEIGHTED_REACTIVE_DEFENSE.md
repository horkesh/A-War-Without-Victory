# Plan: Distance-Weighted Reactive Defense (n663)

**Date:** 2026-03-13
**Status:** PROPOSED — awaiting approval
**Triggered by:** Operation Jackal regression (n615→n616). Unified sector defense pools entire sector reserves instantly to any attack point regardless of brigade distance. HVO 4-brigade Jackal force (ratio 3.45 in n615) collapsed to ratio 0.51 when all 4 VRS Herzegovina brigades teleported to the defense.

---

## Problem Statement

The current unified sector defense model (`attack_resolution_osid.ts:631-641`) computes reactive defense as:

```
reactiveResponse = min(sectorReserves, numAttackers × avgBrigadePower × 1.5)
```

This treats the sector as having **instant** reserve mobilization — a brigade at Trebinje (5 hops away) responds to an attack at Tasovčići identically to a brigade at the adjacent OSID. The formula is distance-blind.

**Consequences:**
- Concentrated attacks at weak points are impossible — every point is equally strong
- Pre-planned operations (Jackal, Corridor) can't punch through even with 4:1 local superiority
- Broken since n616 (sector restructuring); never recovered through n662
- 6 Jackal target OSIDs remain RS at w40 (historically HRHB/RBiH after June 1992)

## Design: Distance-Weighted Reactive Response

### Core Principle

Defense = full power of brigades AT the OSID + proximity-weighted contributions from the rest of the sector + a minimum sector presence floor.

### Formula

```
physicalPower = sum(computeDefenderPower(b) for b AT attacked OSID)  // unchanged

reactiveResponse = sum over each sector brigade NOT at attacked OSID:
    bfsDistance = BFS hops from brigade.location → attacked OSID (through friendly territory)
    weight = PROXIMITY_BASE / (1 + bfsDistance × PROXIMITY_DECAY)
    contribution = computeDefenderPower(brigade) × weight

reactiveResponse = min(reactiveResponse, numAttackers × avgBrigadePower × REACTIVE_CAP)

sectorPresence = avgBrigadePower × SECTOR_PRESENCE_FLOOR

defenderPower = max(physicalPower + reactiveResponse, sectorPresence) + enclaveGarrisonPower
```

### Constants

| Constant | Value | Location | Rationale |
|---|---|---|---|
| `PROXIMITY_BASE` | 0.75 | `combat_math.ts` | Adjacent brigade commits 75% (transit time ~hours) |
| `PROXIMITY_DECAY` | 0.5 | `combat_math.ts` | Each hop roughly halves remaining response capability |
| `REACTIVE_CAP` | 1.0 | `combat_math.ts` | Cap reactive at 1× attacker force (down from 1.5×) |
| `SECTOR_PRESENCE_FLOOR` | 0.20 | `combat_math.ts` | Unoccupied front OSID gets 20% of avg brigade power (mines, wire, TDF) |

**Replaces:** `REACTIVE_DEFENSE_RATIO` (1.5) and `MIN_DEFENSE_FLOOR_FRACTION` (0.75) — both retired.

### Weight Table

| BFS hops | Weight | Interpretation |
|---|---|---|
| 1 (adjacent) | 0.50 | Fast reaction — partial commitment |
| 2 | 0.375 | Arrives within hours |
| 3 | 0.30 | ~1 day march, depleted on arrival |
| 4 | 0.25 | Multi-day — token commitment |
| 5+ | 0.19→0.15 | Symbolic presence |

### Expected Effect on Jackal (Herzegovina)

**VRS defenders at Tasovčići (w10):** No brigade present.
- rs_nevesinje_brigade (~3 hops): power × 0.30 = ~300
- rs_bilea_brigade (~4 hops): power × 0.25 = ~250
- rs_trebinje_brigade (~5 hops): power × 0.19 = ~190
- rs_gacko_brigade (~5 hops): power × 0.19 = ~190
- Raw reactive ≈ 930; sectorPresence ≈ 200
- **defenderPower ≈ 930** (after terrain/entrenchment ~1200)
- HVO 4-brigade attack ≈ 4700 → **ratio ≈ 3.9** (decisive_victory)

**Dense fronts (Sarajevo, Posavina):** Brigades at 0-1 hops → weights 0.75-0.50 → essentially unchanged from current behavior. Lines with stacked brigades remain very strong.

---

## Stepwise Implementation Plan

### Step 1: New helper function — `computeBfsDistances`

**File:** `src/sim/combat/attack_resolution_osid.ts` (add near existing `bfsDistanceToCapital`)

Create a function that computes BFS distances from a target OSID to a set of brigade locations through enemy-controlled territory (since the attacked OSID is in enemy territory, we BFS through the DEFENDER's friendly territory).

```typescript
function computeDefenderBfsDistances(
    targetOsid: Osid,
    brigadeLocations: Osid[],
    adjacency: Map<Osid, Osid[]>,
    state: GameState,
    defenderFaction: FactionId,
    reverseMap: OperationalToCanonicalReverseMap,
): Map<Osid, number>
```

Returns `Map<brigadeLocationOsid, hopCount>`. Uses existing `getPoliticalControllerOSID` for faction check. BFS from the target OSID outward through defender-faction territory. Cap at 20 hops.

**Determinism:** BFS frontier uses sorted OSID iteration (adjacency map is pre-sorted). No randomness.

### Step 2: New helper — `computeProximityWeight`

**File:** `src/sim/combat/combat_math.ts`

```typescript
export const PROXIMITY_BASE = 0.75;
export const PROXIMITY_DECAY = 0.5;
export const REACTIVE_CAP = 1.0;
export const SECTOR_PRESENCE_FLOOR = 0.20;

export function computeProximityWeight(bfsDistance: number): number {
    if (bfsDistance <= 0) return 1.0; // at the OSID — handled by physicalPower, shouldn't reach here
    return PROXIMITY_BASE / (1 + bfsDistance * PROXIMITY_DECAY);
}
```

### Step 3: Replace reactive defense in resolver

**File:** `src/sim/combat/attack_resolution_osid.ts` (lines 631-641)

Replace the flat reactive formula with distance-weighted version:

```typescript
// Old:
// const sectorReserves = totalPower - physicalPower;
// const reactiveResponse = Math.min(
//     sectorReserves,
//     attackerFormations.length * avgBrigadePower * REACTIVE_DEFENSE_RATIO
// );

// New: distance-weighted reactive defense
const bfsDistances = computeDefenderBfsDistances(
    targetOsid as Osid,
    nonPhysicalBrigades.map(b => (b as { location_osid?: string }).location_osid as Osid),
    adjacency, state, controller, reverseMap
);
let reactiveResponse = 0;
for (const rb of nonPhysicalBrigades) {
    const loc = (rb as { location_osid?: string }).location_osid as Osid;
    const dist = bfsDistances.get(loc) ?? Infinity;
    const weight = computeProximityWeight(dist);
    reactiveResponse += computeDefenderPower(state, rb, targetOsid as Osid,
        terrainMultByOsid, artSuppression, supplyStateByOsid, ethBonus(rb)) * weight;
}
reactiveResponse = Math.min(
    reactiveResponse,
    attackerFormations.length * avgBrigadePower * REACTIVE_CAP
);

defenderPower = physicalPower + reactiveResponse;
const minFloor = avgBrigadePower * SECTOR_PRESENCE_FLOOR;
defenderPower = Math.max(defenderPower, minFloor);
```

Where `nonPhysicalBrigades = sectorBrigades.filter(b => b.location_osid !== targetOsid)`.

### Step 4: Mirror in predictor

**File:** `src/sim/combat/combat_predictor.ts` (lines 231-240)

Exact same formula change. The predictor must mirror the resolver for bot AI accuracy. Pass `adjacency` and `reverseMap` through — check if already available in predictor scope (they are, via `predictAttackOutcome` parameters).

### Step 5: Update constants file

**File:** `src/sim/combat/combat_math.ts`

- Add: `PROXIMITY_BASE`, `PROXIMITY_DECAY`, `REACTIVE_CAP`, `SECTOR_PRESENCE_FLOOR`, `computeProximityWeight()`
- Mark `REACTIVE_DEFENSE_RATIO` as deprecated (keep exported to avoid breaking imports, add `/** @deprecated Use REACTIVE_CAP + computeProximityWeight */` comment)
- Mark `MIN_DEFENSE_FLOOR_FRACTION` as deprecated (keep for same reason)

### Step 6: Tests

**File:** `tests/distance_weighted_defense.test.ts` (new)

Test cases:
1. **Brigade at attacked OSID**: physicalPower dominates, reactive is 0 from that brigade
2. **Brigade 1 hop away**: weight ≈ 0.50
3. **Brigade 5 hops away**: weight ≈ 0.19
4. **Unreachable brigade (different component)**: weight = 0 (Infinity distance → near-zero)
5. **Multiple brigades at varying distances**: Sum of weighted contributions
6. **Sector presence floor**: When no brigades nearby, floor kicks in
7. **Cap enforcement**: reactive capped at REACTIVE_CAP × avgBrigadePower × numAttackers
8. **Dense front (brigades at 0-1 hops)**: Defense should be ~80-90% of old unified model
9. **Sparse front (all brigades 3+ hops)**: Defense should be 25-40% of old unified model
10. **Determinism**: Same inputs produce same output (no ordering sensitivity)

**File:** Update `tests/war_phase_step_order.test.ts` if step count changes (it shouldn't — no new pipeline steps).

### Step 7: Calibration run + Jackal verification

1. Run `npm run sim:scenario:run:40w` (n663)
2. Run `node tools/check_jackal.cjs` — verify Jackal captures ≥3 of 6 objectives
3. Run `node tools/compare_painted_vs_sim.cjs` — verify area-weighted ≥85%
4. Run `node tools/check_benchmarks.cjs` (bot_benchmark_evaluation) — verify 6/6 PASS
5. Check dense fronts (Sarajevo, Posavina) haven't collapsed — VRS shouldn't lose territory it holds today

### Step 8: Ledger + memory

- Append to `docs/PROJECT_LEDGER.md`: n663 entry with before/after Jackal outcomes and calibration delta
- Update `memory/MEMORY.md`: calibration state to n663
- Update napkin if relevant

---

## Determinism Checklist

- [ ] BFS uses sorted adjacency (already sorted by `strictCompare` in `buildOsidAdjacency`)
- [ ] No `Math.random()`, no `Date.now()`, no `new Set()` iteration without sorting
- [ ] Brigade iteration over `sectorBrigades` is sorted (comes from `assigned_brigade_ids` which is sorted)
- [ ] `computeProximityWeight` is a pure function of distance
- [ ] `computeDefenderBfsDistances` BFS frontier: process neighbors in adjacency order (pre-sorted)

## Risk Assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| Dense fronts weaken too much | Medium | SECTOR_PRESENCE_FLOOR ensures minimum, and brigades at 0-1 hops still contribute strongly |
| Sarajevo siege breaks | Low | Enclave garrison power + urban mult + entrenchment are independent of reactive defense |
| Bot AI diverges from resolver | Low | Step 4 mirrors exactly; test confirms parity |
| BFS performance in hot path | Low | Sector brigades < 10, BFS bounded by sector territory (~20-50 OSIDs). Called once per battle, not per turn |
| Calibration regression > 2pp | Medium | Constants are tunable: PROXIMITY_DECAY and REACTIVE_CAP are the primary levers |

## Files Modified

| File | Change |
|---|---|
| `src/sim/combat/combat_math.ts` | Add constants + `computeProximityWeight()` |
| `src/sim/combat/attack_resolution_osid.ts` | Add `computeDefenderBfsDistances()`, replace reactive formula |
| `src/sim/combat/combat_predictor.ts` | Mirror reactive formula change |
| `tests/distance_weighted_defense.test.ts` | New test suite |

## Canon Compliance

- **Engine Invariants**: No new invariant violations — defense power is still computed deterministically per OSID
- **Systems Manual**: Sector defense model is an implementation detail, not canon. The principle "front is a continuous line" is preserved — just with distance gradient instead of uniform distribution
- **Phase Specs**: No phase logic changes
- **Rulebook**: Combat resolution formula changes are within the spec's "implementation detail" scope

## Ledger Note (draft)

```
### n663 — Distance-weighted reactive defense (2026-03-13)
- **Problem**: Unified sector defense (n500) pooled entire sector reserves to any attack point instantly, regardless of brigade distance. Made concentrated attacks impossible. Operation Jackal broken since n616 (power ratio 3.45→0.51 at Tasovčići).
- **Fix**: Reactive defense contributions weighted by BFS distance through defender territory. Adjacent brigades (1 hop) contribute 50%; distant brigades (5+ hops) contribute ~19%. Sector presence floor (20% avg brigade power) ensures no OSID is undefended.
- **Constants**: PROXIMITY_BASE=0.75, PROXIMITY_DECAY=0.5, REACTIVE_CAP=1.0, SECTOR_PRESENCE_FLOOR=0.20
- **Result**: [TBD after calibration run]
- **Replaces**: Flat REACTIVE_DEFENSE_RATIO=1.5 + MIN_DEFENSE_FLOOR_FRACTION=0.75
```
