# Budget-Based Brigade Allocation — Design Plan

**Date:** 2026-03-15
**Status:** APPROVED — ready for implementation
**Replaces:** Current Phase 2a-2d in `classifyBrigadesByTerritory` (home-affinity-first)

---

## Problem Statement

The current brigade assignment pipeline uses home affinity as the PRIMARY driver (Phase 2a). Brigades go to sectors covering their home municipality before threat is considered. This causes:

1. **SRK siege ring (sector :0):** 2 brigades on 14 edges, threat 644 — while sector :4 (Vareš) has 5 brigades on 27 edges, threat 13. The Ilidža-homed brigades match multiple sectors and Phase 2a picks the wrong one.

2. **ARBiH Brčko counterattack blocked:** Strained supply penalty blocks ALL offensive operations. The 2nd Corps can't counterattack at Bijela despite local numerical advantage because the supply gate treats all operations equally.

## Design: Budget-Based Allocation

The corps commander's assignment changes from "home first, then fill gaps" to "secure the front first, then optimize placement."

### Step 1 — Compute Garrison Budgets

For each sector, compute minimum garrison based on enemy strength:

```
minGarrison(sector) = max(1, ceil(edges / EDGES_PER_GARRISON))
                    × clamp(sqrt(enemyPersonnel / THREAT_BASELINE), 1.0, 3.0)
```

Constants:
- `EDGES_PER_GARRISON_BRIGADE = 6`
- `THREAT_BASELINE = 2000`

When total garrison need > available brigades (common for thin corps), allocate proportionally:
```
allocation(sector) = floor(available × (minGarrison / totalMinGarrison))
```

Remainder brigades go to highest-threat sectors. Every front sector gets minimum 1.

### Step 2 — Fill Garrisons (replaces Phase 2a/2b)

Assign brigades to sectors in threat priority order (highest-threat sector filled first):

1. Sort unassigned brigades by BFS distance to sector front OSIDs
2. Home affinity acts as a **distance modifier**: brigades within home municipality get -2 hop bonus (prefer nearby, don't hard-lock)
3. Connected component constraint: brigade must be reachable via friendly territory
4. Stop filling when sector reaches its proportional allocation

Commander personality (Phase 2b) shapes the **budget curve**, not individual assignments:
- Aggressive commander: THREAT_BASELINE lower (more brigades at high-threat sectors)
- Defensive commander: EDGES_PER_GARRISON lower (more even coverage)

### Step 3 — Allocate Surplus

Brigades remaining after all garrisons are filled form the **operational surplus**:

1. **Pre-op staging:** If an operation is planned, surplus brigades assigned to the operation's staging sector
2. **Corps reserve:** Surplus brigades near high-threat sectors held as immediate reinforcement
3. **Home optimization:** Remaining surplus goes where home affinity maximizes effectiveness

Home affinity plays a larger role in surplus — these brigades have the luxury of choosing optimal positions.

### Offensive Operations Under Supply Strain

Current: strained supply blocks ALL operations.
New: strained supply constrains operations drawn from surplus:

- **Operation size limited:** max participating brigades = surplus count (can't draw from garrison)
- **Operation duration limited:** shorter planning phase, quicker abort thresholds
- **Probe/feint exception:** army HQ can direct low-cost probes regardless of supply

This allows ARBiH 2nd Corps to launch a limited Brčko counterattack with 3-5 surplus brigades while maintaining the Tuzla garrison.

### Army HQ Override (future mechanic)

Army HQ can issue explicit orders that override the corps commander's defensive budget:
- "Take Brčko at all costs" — allows drawing from garrison for a specific operation
- This should happen rarely — historically it required direct Glavna Komanda authorization
- Implementation: `army_hq_override` field on `CorpsOperation` that bypasses garrison checks

---

## What Changes

| Component | Current | New |
|-----------|---------|-----|
| Phase 2a (home affinity) | Primary driver — first pass | Removed as standalone. Becomes distance modifier (-2 hops) |
| Phase 2b (commander personality) | Shapes assignment of individual brigades | Shapes the garrison budget curve (THREAT_BASELINE, EDGES_PER_GARRISON) |
| Phase 2c (BFS distance) | Tertiary — remaining brigades | Merged into garrison filling (primary sort key) |
| Phase 2d (pre-op staging) | Standalone pass | Merged into surplus allocation |
| Strained supply gate | Blocks all new operations | Limits operation size to surplus count + duration cap |
| sectorNeed computation | Edge-based or threat-weighted | Replaced by garrison budget system |

## What Stays

- Phase 1 (positional — you defend where you stand)
- `ensureMinimumSectorCoverage` (safety net for 0-brigade sectors)
- `reclassifyRearBrigades` (front/reserve classification after assignment)
- Overstacking redistribution (isMovementDestinationRisky fix)
- Cross-corps enclave defense + guard
- `recomputeSectorPowerAndThreat` (Step 8c — post-assignment)

## Expected Outcomes

### SRK (9 brigades)

| Sector | Current | Budget-based | Why |
|--------|---------|-------------|-----|
| :0 (Sarajevo ring, 20k enemy) | 2 | **4** | Highest threat gets largest garrison |
| :3 (Hadžići, 10k enemy) | 1 | **2** | Second-highest threat |
| :4 (Vareš, 500 enemy) | 5 | **1** | Low threat, gives up surplus |
| :2 (Ilijaš, 1200 enemy) | 1 | **1** | Moderate, holds minimum |
| :1 (Pale rear, 0 enemy) | 1 | **1** | Minimum garrison |

### ARBiH 2nd Corps (33 brigades)
- Garrison need: ~28 brigades across 12 sectors
- Surplus: ~5 brigades available for Brčko counterattack
- Supply strain limits op to 3-4 brigades, short duration
- Bijela targeted with limited but decisive force

## Implementation Steps

1. Write `computeGarrisonBudgets()` function — pure computation, no side effects
2. Replace Phase 2a-2d with budget-based fill loop
3. Move home affinity to distance modifier in BFS sort
4. Add surplus allocation logic (staging, reserve, home optimization)
5. Modify strained supply gate to limit operation size instead of blocking
6. Run `/simplify` between each step
7. Fresh 40w run after completion
8. `/war-or-game` approval

## Determinism

- [x] Garrison budgets computed from sorted sector list
- [x] Brigade assignment by sorted BFS distance (strictCompare tiebreaker)
- [x] Proportional allocation uses deterministic rounding (floor + remainder to highest-threat)
- [x] No Math.random(), no Date.now()

## Future Mechanics (jotted down, not this sprint)

- **Army HQ override:** Explicit orders that draw from garrison for critical operations
- **Probes/feints:** Army HQ-directed, low supply cost, intelligence-gathering
- **Salient retreat:** Commander reviews existing positions and withdraws from indefensible ones

## Files

| File | Change |
|------|--------|
| `src/sim/combat/corps_front_sectors.ts` | Replace Phase 2a-2d with budget-based allocation |
| `src/sim/combat/bot_corps_directives.ts` | Modify strained supply gate for surplus-only operations |
| `src/state/supply_reserve_constants.ts` | Add EDGES_PER_GARRISON_BRIGADE, THREAT_BASELINE constants |
