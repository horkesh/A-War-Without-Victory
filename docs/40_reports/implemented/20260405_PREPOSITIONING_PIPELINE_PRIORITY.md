# Prepositioning Pipeline Priority — Movement-Order Authority Fix

**Date:** 2026-04-05
**Mission:** Make commander-level prepositioning of elite/main-effort surplus actually take effect in live runs, without breaking movement-order determinism or sector coverage.

## Specialists Used

| Specialist | Owned | Evidence |
|---|---|---|
| Gameplay Programmer | Full pipeline audit, authority map, root-cause chain | Read all 8 movement-order files, traced exact step ordering, identified Bug 1 + Bug 2 |
| Systems Programmer | Determinism review of 4 fix candidates | Assessed all iteration orders (strictCompare), save format impact, nondeterminism vectors |
| Formation Expert | Scope verification: main_effort tier, can_launch_ops gate | Verified tier classification in force_eval.ts, assessed scope breadth, flagged gate issue |
| Technical Architect (orchestrator synthesis) | Authority model decision, fix shape selection | Selected smallest truthful fix from 4 candidates based on specialist evidence |
| QA Engineer | Targeted regression tests | 4 new tests + 1 updated test covering both bugs |
| Scenario Runner (orchestrator) | n1316 live validation | Fresh 40w run proving rs_1st_armored moved forward |

## Movement-Order Authority Map

| Step | System | File | Role | Stance |
|---|---|---|---|---|
| 546 | `osid-column-movement` | osid_column_movement.ts | Consumes orders with `stance:'column'` | requires `'column'` |
| 569 | `apply-brigade-movement` | brigade_movement_orders.ts | Consumes non-column orders (adjacent only) | — |
| 648 | `distribute-brigades-to-front` | brigade_front_distribution.ts | Writes column orders (dist ≤ 20 hops) | `'column'` |
| 954 | Commander loop (Fix B) | commander_loop.ts | Writes prepositioning orders | `'column'` |
| 1001 | `correctMarchOrders` | commander_march_correction.ts | Overwrites wrong-destination orders | **WAS MISSING** |
| 1001 | `correctTransitStates` | commander_march_correction.ts | Cancels wrong-destination transit | **WAS MISSING** |
| 1713 | `evaluateHomeReturn` | brigade_home_return.ts | Writes recall orders | `'column'` |

## Root Cause: TWO bugs

### Bug 1 (CRITICAL): `correctMarchOrders` strips `stance: 'column'`

**Location:** `commander_march_correction.ts` lines 85-88 and 168-170

`correctMarchOrders` and `correctTransitStates` create corrected orders WITHOUT `stance: 'column'`:
```typescript
state.military.brigade_movement_orders[bid] = {
    destination_sids: [bestOsid as SettlementId],
    // NO stance: 'column'!
};
```

Column movement (step 546) requires `stance: 'column'` to process orders. `apply-brigade-movement` (step 569) only handles single-hop adjacency moves. Corrected orders fell into a processing gap — **no system executed them**.

This caused brigades to appear stuck: step 648 would write a valid column order, step 1001 would correct the destination (after sector rearrangement at step 954), and the correction would strip the stance, making the order unprocessable. The brigade would get a new order from step 648 next turn, but step 1001 would strip it again — infinite loop.

### Bug 2 (BLOCKING): Fix B's `if (!existing)` guard

**Location:** `commander_loop.ts` line 175

```typescript
if (!state.military.brigade_movement_orders[order.brigade_id]) {
```

Step 648 writes movement orders for rear brigades within 20 hops. Fix B runs at step 954 and checks for existing orders. Since step 648 already wrote, the guard blocks Fix B from firing. Fix B was structurally correct but operationally inert.

## Fixes Applied

### Fix 1: Add `stance: 'column'` to march corrections

**File:** `src/sim/combat/commander_march_correction.ts`

- `correctMarchOrders` (line ~85): Added `stance: 'column'` to corrected order objects
- `correctTransitStates` (line ~168): Same fix

This ensures ALL corrected orders are processable by the column movement system.

### Fix 2: Remove `if (!existing)` guard from prepositioning

**File:** `src/sim/combat/commander/commander_loop.ts`

- Lines 173-181: Removed the `if (!existing)` guard. Prepositioning orders now unconditionally overwrite distribution orders.
- Safe because `buildPrepositioningOrders` already limits scope to main_effort surplus that is unreachable from the front (>MAX_REACHABILITY_HOPS).

## Deferred Recommendations (Formation Expert)

These are valid but represent scope expansion beyond the current mission:

1. **Expand tier filter**: Include `active_defense` in prepositioning scope (currently only `main_effort`)
2. **Relax `can_launch_ops` gate**: Change to `surplus_pool.length > 0` — brigades should preposition before ops form
3. **Exclude `is_home_defense`**: Home defense brigades should not be prepositioned away
4. **Exclude artillery-only formations**: No combat troops, only support

## Targeted Tests (4 new + 1 updated)

**File:** `tests/commander/elite_formation_utilization.test.ts`

1. `correctMarchOrders preserves stance column on corrected orders` — Bug 1 regression guard
2. `correctTransitStates preserves stance column on corrected orders` — Bug 1 regression guard
3. `prepositioning overrides existing distribution order` — Bug 2 regression guard
4. `prepositioning writes order when no existing order (regression guard)` — Base case
5. Updated existing test: `applyCommanderOutput` now asserts overwrite behavior

## Validation: n1316

### Calibration (zero-delta)

| Metric | n1315 (baseline) | n1316 (fix) | Delta |
|---|---|---|---|
| Area-weighted | 94.3% | **94.3%** | 0.0pp |
| Anchors | 27/27 | **27/27** | neutral |
| Benchmarks | 6/6 | **6/6** | neutral |
| RS w40 | 53.2% | **53.2%** | neutral |
| Battles | 69 | **69** | neutral |
| Hash | 41f63e3d2a90a159 | a8bece8bc0be9f17 | changed (expected) |

### rs_1st_armored Before/After

| Property | n1315 (before) | n1316 (after) |
|---|---|---|
| Location | `op:prijedor:maricka_2` (deep rear) | `op:skender_vakuf:donji_koricani` (front) |
| Sub-segment | assigned but stuck | `subseg:vrs_1st_krajina:split0` |
| Movement state | none (stuck) | in_transit back to Prijedor |
| Movement order | to donji_koricani (unprocessed) | to maricka_2 (home-return) |

**The fix works.** rs_1st_armored moved from deep rear (Prijedor) to the front (Skender Vakuf). It is now being pulled back by the home-return system (step 1713) — a bounded residual follow-up.

## Verification

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: **166 files, 2324 tests, 0 failures**
- `npm run desktop:map:build`: built in 7.96s
- Fresh 40w scenario: n1316, 94.3%, 27/27 anchors, 6/6 benchmarks

## Bounded Residual Follow-Up

**Home-return vs prepositioning tug-of-war:** rs_1st_armored reaches the front via corrected movement orders, but `evaluateHomeReturn` (step 1713) then issues a recall order sending it back toward Prijedor (home_osid). This creates oscillation: prepositioning pushes forward, home-return pulls back.

Fix options (separate lane):
- Exempt main_effort surplus from home-return when they have commander prepositioning orders
- Add a `prepositioning_active` flag to brigade state that suppresses home-return
- Increase RETURN_CHECK_INTERVAL for main_effort brigades

This is NOT a regression — rs_1st_armored was stuck before and now actively moves. The tug-of-war is strictly better than permanent inactivity.

## Completion Block

**Canonical owner:** `commander_march_correction.ts` (stance preservation), `commander_loop.ts` (guard removal)
**Demoted path:** Stance-stripping in march corrections; `if (!existing)` guard blocking commander intent
**Player-visible truth:** Elite formations now march toward the front instead of sitting idle in the deep rear. Calibration unchanged (94.3%, 27/27, 6/6).
**Canonical UI surface:** No new UI — behavioral engine change
**Done means:** Two bugs fixed with evidence. 4 targeted tests. Zero-delta calibration (n1316). rs_1st_armored proven to move forward. Bounded residual: home-return tug-of-war (separate lane). Full suite green (2324/2324). Smoke triad passed.
