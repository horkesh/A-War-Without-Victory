# Command Chain Truth Wave 2 — Implementation Report

**Date:** 2026-04-04
**Scope:** Sub-segment assignment truth — demotion clearing + adapter canonical derivation
**Verification:** tsc clean, 6/6 Wave 2 tests pass, governance OK

---

## What Was Fixed

### GAP 1 — Stale `assigned_sub_segment_id` on demoted brigades (concrete live bug)

**File:** `src/sim/combat/corps_front_sectors.ts`

**The bug:** When `assertBrigadeReachability()` detected an unreachable brigade, the demotion loop moved the brigade ID from `assigned_brigade_ids` → `reserve_brigade_ids` correctly. However, it did NOT clear `assigned_sub_segment_id` on the formation object. A demoted brigade still carried `assigned_sub_segment_id = 'seg-X'` even though it no longer held that sub-segment. The `GameStateAdapter` reads `f.assigned_sub_segment_id` from the formation field directly — so a demoted brigade appeared assigned to a sub-segment in the UI even after demotion.

**Fix:** In the demotion loop, for each demoted brigade, also set `f.assigned_sub_segment_id = undefined`. This is a single-line addition inside the existing `for (const bid of demoted)` loop.

**Location:** `corps_front_sectors.ts` lines ~594–614 (the `unreachableIds` consumer block).

---

### GAP 2 — Adapter reads formation field instead of canonical sector truth

**File:** `src/ui/map/data/GameStateAdapter.ts`

**The gap:** The adapter computed `assigned_sub_segment_id` directly from `f.assigned_sub_segment_id` (the formation-level field). This field is set by `syncSectorAssignmentsToFormations()` and `assignBrigadesToSubSegments()` at the end of each turn's sector pipeline — but it can be stale for a turn after a brigade is demoted (before GAP 1 fix it was never cleared at all).

**Fix:** Before the formations loop, build a reverse map `brigadeId → sub_segment_id` from `state.military.corps_front_sectors[*].sub_segments[*].primary_brigade_ids`. This reverse map is the authoritative post-sync source. In the formation loop, derive `assigned_sub_segment_id` from this map first; fall back to the formation field only if the brigade is not present in any sector sub_segment.

**Performance:** Built once O(sectors × sub_segments × primary_brigade_ids) before the formations loop; lookups are O(1) per formation. No per-brigade nested loop over sectors.

**Location:** `GameStateAdapter.ts` — `brigadeSubSegmentFromSectors` map built at ~line 558 (before formations loop); used at the `assigned_sub_segment_id` derivation ~line 630.

---

## What Was Already Aligned (per audit — no changes needed)

The audit also found that engine consumers of sub_segment assignment (exhaustion, officer_quality_update, supply_pressure) read from `corps_front_sectors` directly via the sector pipeline, not from the formation's `assigned_sub_segment_id` field. These systems were already reading canonical truth. No changes required there.

---

## Tests Written

**File:** `tests/sector_frontline_truth_wave2.test.ts` — 6 tests across 3 suites.

**P0 — GAP 1 demotion clearing:**
1. `demoted brigade has assigned_sub_segment_id cleared to undefined` — brigade in wrong component, demotion loop runs, formation field cleared.
2. `reachable brigade retains its assigned_sub_segment_id after demotion pass` — brigade in correct component, no demotion, field untouched.

**P0 — GAP 2 adapter derivation:**
3. `adapter reverse map: canonical sub_segment_id wins over stale formation field` — brigade in `primary_brigade_ids` → canonical wins.
4. `adapter falls back to formation field when brigade not in any sector sub_segment` — reserve brigade not in sub_segment → fallback fires.
5. `adapter returns undefined when neither sector nor formation has sub_segment` — both sources absent → undefined.

**Wave 1 regression:**
6. `else-branch: System C = 0 and System A has 5 municipalities → System A fires once (no double-count)` — verifies displacement guard from Wave 1 still holds.

---

## Verification

```
tsc --noEmit:       CLEAN (0 errors)
Wave 2 tests:       6/6 PASS
governance check:   OK
```

---

## Canonical ownership after Wave 2

| Concern | Canonical owner |
|---|---|
| Sub-segment assignment truth | `corps_front_sectors` sub_segments[].primary_brigade_ids |
| Demotion path | `corps_front_sectors.ts` unreachableIds loop (clears formation field) |
| UI sub-segment display | `GameStateAdapter` reverse map from corps_front_sectors (formation field is fallback only) |
| Formation field `assigned_sub_segment_id` | Written by `syncSectorAssignmentsToFormations` + `assignBrigadesToSubSegments`; cleared on demotion; fallback for UI only |
