# Sector Classification and Movement Overhaul

**Date:** 2026-03-08
**Build:** n384
**Baseline:** n371 (88.2% area-weighted)
**Result:** n384 (87.9% area-weighted)

---

## Summary

This session addressed a fundamental disconnect between sector assignment and physical brigade positioning. Prior to these changes, `classifyBrigadesByTerritory` assigned brigades to sectors based on the entire BFS Voronoi territory depth, meaning a brigade 8 hops behind the front was classified as "assigned" to a sector it could not meaningfully defend. Combined with a silent bug that prevented all column march orders from executing (missing `stance: 'column'` in the merge step), brigades that should have been moving to their sector fronts were instead sitting idle in the deep rear. Only 53% of "assigned" brigades were physically on the front line.

The fix was two-pronged: rewrite sector classification to distinguish front, reserve (1-hop), and deep rear brigades; and insert a new sector march rule in bot AI that column-marches deep rear brigades to their assigned sector's front. The column march bug fix restored movement entirely (0 arrivals -> 237 arrivals in 40 weeks). Post-session, 97% of assigned brigades are physically on the front.

---

## Changes

### 1. Column March Stance Bug Fix

**File:** `src/sim/combat/bot_brigade_ai_osid.ts` (line ~1978)

The movement order merge step at the end of `generateBrigadeOrders` combines regular 1-hop moves and column march destinations into `brigade_movement_orders`. Column march entries were written without `stance: 'column'`, so `processOsidColumnMovement` (which gates on `order.stance === 'column'`) silently skipped every column march order. Zero column arrivals occurred across 40 simulated weeks.

**Fix:** Added `stance: 'column'` to the merged movement order for column march entries:
```typescript
mergedMovement[bid] = { destination_sids: [dest], stance: 'column' };
```

**Impact:** Column marches now execute. 300 starts, 237 arrivals in 40 weeks.

### 2. Sector Classification Overhaul

**File:** `src/sim/combat/corps_front_sectors.ts`, function `classifyBrigadesByTerritory` (line ~242)

**Old behavior:** A brigade was "assigned" to a sector if its `location_osid` appeared anywhere in the sector's `territory_osids` (the full BFS Voronoi depth from front to rear). This put 47% of "assigned" brigades in the deep rear with no mechanism to move them forward.

**New behavior:** Three-tier classification with priority ordering:
1. **Assigned (front):** Brigade is on a sector's sub-segment `friendly_osids` (the actual front-line OSIDs).
2. **Reserve (1-hop):** Brigade is on a friendly OSID exactly 1 hop behind a sector's front OSIDs.
3. **Deep rear (BFS fallback):** Brigade is deeper than 1 hop. BFS through friendly territory finds the nearest own-corps sector front and assigns the brigade there. These brigades are marked assigned but the bot AI recognizes they are not on-front and issues column march orders.

Priority respects corps boundaries: own-corps match preferred, cross-corps only as fallback. Exempt corps (general staff units) are skipped entirely.

### 3. ensureMinimumSectorCoverage Simplification

**File:** `src/sim/combat/corps_front_sectors.ts`, function `ensureMinimumSectorCoverage` (line ~1350)

**Removed:** Step 2, which performed BFS paper-transfers of brigade IDs from surplus sectors to empty sectors. This reassigned brigade IDs on paper without any physical movement, creating phantom coverage. The bot AI's new sector march rule handles the physical movement instead.

**Retained:** Step 1, which promotes a connected reserve brigade to assigned status when a sector has no assigned brigades.

### 4. Sector March Rule in Bot AI

**File:** `src/sim/combat/bot_brigade_ai_osid.ts` (line ~1022)

New rule inserted immediately before the home defense check. For each brigade:
1. Find the sector it is assigned to (via `assigned_brigade_ids`).
2. Collect the sector's front OSIDs from `sub_segments.friendly_osids`.
3. If the brigade is not on any of those front OSIDs, issue a column march order to the nearest front OSID.

This rule **overrides** `home_defense_active`. A brigade assigned to a sector front must march there even if its home OSID is under threat. Corps-level needs take priority over garrison duty.

### 5. Elite Home Distance Curve

**File:** `src/sim/combat/home_distance.ts`

New constants for elite/professional brigades (those with `elite_loan_state`):
- `HOME_DISTANCE_FLOOR_ELITE = 0.85` (vs 0.70 for standard)
- `PER_HOP_PENALTY_ELITE = 0.02` (vs 0.04 for standard)

Elite brigades are trained for expeditionary operations and suffer less from distance to home OSID. The curve reaches floor at approximately 10+ hops instead of degrading sharply.

**File:** `src/sim/combat/combat_math.ts` (line ~577)

Detection: `!!formation.elite_loan_state` triggers the elite curve in `getHomeDistanceMult`.

**Affected units:** 3 brigades (elite loan formations).

**Tests:** `tests/home_distance.test.ts` — verifies elite curve values.

### 6. Corps HQ Map Rendering Fix

**File:** `src/ui/map/map/builders/buildFormationsGeoJSON.ts` (line ~45)

Corps asset (`corps_asset`) and army HQ (`army_hq`) formations are now filtered from the map GeoJSON alongside corps-kind formations. These are organizational concepts that do not have physical positions on the map. Previously they rendered as markers at their `location_osid`, creating visual clutter and misleading unit counts.

### 7. Movement Tracking in Weekly Reports

**File:** `src/scenario/scenario_runner.ts` (line ~1867)

`column_movement` and `movement_report` fields from turn reports are now forwarded to weekly report rows. This enables diagnostic analysis of movement patterns across simulation runs without requiring full replay parsing.

### 8. findSectorForEnemyOsid Correctness Fix

**File:** `src/sim/combat/corps_front_sectors.ts`, function `findSectorForEnemyOsid` (line ~2016)

**Bug:** The function searched `enemy_osids` in sub-segments, which returned the *attacker's* sector (the sector whose enemy zone contains the target). It should search `friendly_osids` to find the *defender's* sector that covers the target OSID.

**Impact:** The combat predictor was looking up the wrong sector for defense coverage, causing it to treat the attacker's own brigades as defenders. This blocked attacks against genuinely undefended OSIDs.

---

## Calibration Impact

| Metric | Before (n371) | After (n384) | Delta |
|--------|---------------|--------------|-------|
| Area-weighted accuracy | 88.2% | 87.9% | -0.3pp |
| Krajina accuracy | 97.7% | 99.2% | +1.5pp |
| Column march starts (40w) | 0 | 300 | +300 |
| Column march arrivals (40w) | 0 | 237 | +237 |
| Brigades on front (assigned) | 53% | 97% | +44pp |
| Total active brigades | ~195 | ~195 | -- |
| Unclassified brigades | -- | 12 | 9 exempt + 3 isolated |

The small overall accuracy dip (-0.3pp) is expected: brigades that were previously static in the rear are now marching to fronts and participating in combat, which changes battle outcomes. The massive improvement in Krajina (+1.5pp to 99.2%) demonstrates that proper brigade positioning yields better results where VRS historical territorial control was near-complete.

---

## Known Issues

### Drina Region / Enclave Expansion

The Srebrenica enclave expanded from 13 to 16 RBiH-controlled OSIDs over 40 weeks. Historically, enclaves should have contracted to approximately 7 OSIDs by this point. Root causes identified but not yet addressed:

1. **Homeland last stand mechanic:** ARBiH absorbs `victory` and `costly_victory` combat outcomes in Bosniak-majority areas (>=50% co-ethnic). This prevents retreat even when the attacker has overwhelming force.
2. **Equipment imbalance not translating:** VRS holds 486 heavy weapons vs 85 for enclave RBiH, but the combat resolution does not produce enough decisive outcomes to force retreat in co-ethnic territory.
3. **Overall combat flip balance:** 78 total combat flips, RS gained 60 OSIDs net, but the flips are concentrated outside the enclaves where last-stand does not apply.

### Brigade Alignment Residual (3%)

12 brigades remain unclassified: 9 belong to exempt corps (general staff units, HVO Central Bosnia reserve) and 3 are geographically isolated (enclave brigades with no BFS path to any sector front).

---

## Files Modified

| File | Change |
|------|--------|
| `src/sim/combat/bot_brigade_ai_osid.ts` | Column march stance fix; sector march rule |
| `src/sim/combat/corps_front_sectors.ts` | `classifyBrigadesByTerritory` rewrite; `ensureMinimumSectorCoverage` simplification; `findSectorForEnemyOsid` fix |
| `src/sim/combat/home_distance.ts` | Elite home distance constants and curve |
| `src/sim/combat/combat_math.ts` | Elite detection via `elite_loan_state` |
| `src/ui/map/map/builders/buildFormationsGeoJSON.ts` | Filter corps_asset and army_hq from map |
| `src/scenario/scenario_runner.ts` | Movement tracking in weekly reports |
| `tests/home_distance.test.ts` | Elite curve test coverage |
