# Displacement System: Three Critical Bug Fixes

**Date:** 2026-03-01
**Phase:** War simulation — displacement pipeline
**Severity:** Critical — system was producing 4.36M displaced vs ~1M historical by Jan 1993

---

## Problem Statement

The displacement system was producing catastrophically wrong results:
- **4.36M total displaced** across 110 municipalities — roughly 4× the historical ~1M by January 1993
- Every RS-controlled OSID showed **zero remaining population** in the map viewer
- Friendly ethnicity was being expelled along with hostile ethnicity (should remain)

## Root Cause Investigation

Three independent bugs were identified, each compounding the others:

### Bug 1: OSID/SID Key Mismatch (displacement.ts)

**Root cause:** `getEffectiveSettlementSide()` looks up control via canonical SIDs (`S123456`), but `political_controllers` is keyed by OSIDs (`op:municipality:slug`) during war phase. Every lookup returned `null`.

**Impact chain:**
1. `isMunicipalityEncircled()` BFS starts from a settlement, checks each neighbor via `getEffectiveSettlementSide()` → all null → can't find any friendly neighbor
2. ALL 110 municipalities appear encircled
3. 10%/turn encirclement displacement applied to ALL population
4. 99.1% of the 4.36M displaced came from this false encirclement trigger

**Evidence:** Displacement event log showed `reason: ['encircled']` for nearly every municipality every turn.

### Bug 2: Minority Flight Dead (minority_flight.ts)

**Root cause:** Same SID mismatch. `processMinorityFlight()` calls `getEffectiveSettlementSide(state, sid)` to determine the controller of each settlement → returns `null` → every settlement skipped.

**Impact:** 215,414 settlements evaluated, 0 displaced. Minority flight (the correct ethnicity-specific mechanism that distinguishes which ethnic groups flee based on the controlling faction) was completely non-functional. This meant:
- RS-controlled areas should have displaced Bosniaks and Croats (100% immediate) — didn't happen
- RBiH-controlled areas should have displaced Serbs (50% gradual over 26 turns) — didn't happen
- Instead, the blunt encirclement trigger displaced ALL population indiscriminately

### Bug 3: Double-Counting in Displacement Accounting

**Root cause:** Across all three displacement files, the accounting formula double-counted killed and fled-abroad populations:

```
displaced_out += displacementAmount    // includes killed + fled + routed
lost_population += killed + fled_abroad  // killed + fled counted AGAIN

remaining = original - displaced_out - lost_population  // subtracts killed+fled TWICE
```

**Impact:** 76 out of 110 municipalities had **negative** remaining population. The recruitment ceiling enforcement then zeroed out militia pools, further compounding errors.

## Fixes Applied

### Fix 1: OSID-Aware Control Lookups

**displacement.ts:**
- Added `buildMunControlFromOsids(state)` — reads OSID keys from `political_controllers`, builds `Map<MunicipalityId, Set<FactionId>>`
- Added `isMunControlledByFaction(munId, factionId, munControl)` — checks if faction controls any OSID in municipality
- Added `isMunicipalityEncircledOsid(munId, factionId, munControl)` — replaces broken BFS with municipality-level check: faction is encircled only if NO other municipality has any OSID controlled by them
- Replaced `routeDisplacedPopulation()` candidate discovery — uses `munControl` lookup instead of BFS over null-returning SID graph
- Removed dead functions: `isMunicipalityEncircled()` (old BFS), `findShortestPathToFriendlyMunicipality()` (also BFS-based)

**minority_flight.ts:**
- Added `buildMunDominantController(state)` — determines dominant faction per municipality from OSID counts (ties broken alphabetically for determinism)
- Replaced `getEffectiveSettlementSide(state, sid)` with `munDominantController.get(munId)` — municipality-level lookup from OSID data

**displacement_takeover.ts:**
- Removed dead SID-level branch from `buildFriendlyMunicipalitiesByFaction()` — was always returning null; OSID branch already worked correctly

### Fix 2: Correct Displacement Accounting

Changed across all three files:

**Before (wrong):**
```typescript
dispState.displaced_out += displacementAmount;  // full amount
dispState.lost_population += lostAmount;         // killed + fled (overlap!)
```

**After (correct):**
```typescript
dispState.displaced_out += totalRouted;          // only actually-routed
dispState.lost_population += lostAmount;         // killed + fled + unrouted (no overlap)
```

Semantic contract:
- `displaced_out` = people who were successfully routed to another municipality or camp
- `lost_population` = people who died, fled abroad, or couldn't be routed
- `remaining = original - displaced_out - lost_population + displaced_in` — no overlap

### Refactor Pass

- Removed unused `state` param from `isMunicipalityEncircledOsid`
- Simplified `routeDisplacedPopulation` from 9 to 5 params (removed 3 dead SID-era params)
- Removed vestigial `distance: 0` field from candidate municipalities
- Hoisted `buildMunControlFromOsids()` out of per-municipality loop
- Fixed stale Phase I/II comments to canonical Peace/War terms
- Removed `getEffectiveSettlementSide` import from all three files

## Files Modified

| File | Changes |
|------|---------|
| `src/state/displacement.ts` | OSID helpers, routing fix, double-count fix, dead code removal, refactor |
| `src/state/minority_flight.ts` | OSID dominant controller, double-count fix, removed broken import |
| `src/state/displacement_takeover.ts` | Removed dead SID branch, double-count fix, removed broken import |

## Verification

- `tsc --noEmit` — clean compile
- `npm run test:vitest` — 18 suites, 193 tests pass, 13 skipped
- No displacement-specific test files exist (tests cover settlement_control, displacement_reporting_fix)

## Determinism

All fixes are deterministic:
- `buildMunControlFromOsids()` iterates `Object.entries()` (insertion order) — OSID keys are alphabetically ordered from scenario init
- `buildMunDominantController()` breaks ties alphabetically
- `candidateMuns` sorted by `localeCompare()`
- No `Math.random()`, no timestamps, no nondeterministic iteration

## Expected Behavioral Change

| Metric | Before (n284) | Expected After |
|--------|---------------|----------------|
| Total displaced | 4.36M | ~1M (historical target by Jan 1993) |
| Municipalities with zero pop | ~100/110 | Few (only truly overrun enclaves) |
| Minority flight displaced | 0 | Dominant mechanism (ethnicity-specific) |
| Encirclement displaced | 4.33M (99.1%) | Small fraction (truly isolated municipalities) |
| Negative-population municipalities | 76/110 | 0 |

## Diagnostic Notes

To verify the fix produces correct results, run the 40-week calibration scenario:
```bash
npm run sim:scenario:run:40w
```

Check the summary for displacement totals. Key indicators:
- `displacement_state` should show realistic remaining populations per municipality
- Minority flight should be the dominant mechanism (most displaced should be ethnic minorities under hostile control)
- Encirclement should only affect genuinely isolated municipalities (e.g., enclaves)
- No municipality should have negative remaining population

## Related Documents

- `docs/20_engineering/DISPLACEMENT_MASTER.md` — comprehensive displacement system reference
- `docs/PROJECT_LEDGER.md` — 2026-03-01 entry
- `.claude/napkin.md` — OSID/SID mismatch and accounting rules added
