# Strict Null Phase 2 Batch 13

**Date:** 2026-05-18
**Baseline:** Phase 2 combat strict-null inventory after Batch 12: 87 counted escapes
**Result:** Phase 2 combat strict-null inventory after Batch 13: 80 counted escapes

## Summary
- Cleaned the Batch 13 combat strict-null slice in `ongoing_mobilization.ts`.
- Removed seven redundant `as FactionId` casts from typed faction literals while leaving unrelated `MunicipalityId` casts untouched.
- Added a focused Batch 13 inventory assertion to keep the selected file at zero counted strict-null escapes.

## Inventory Delta
| Category | Before | After | Delta |
|---|---:|---:|---:|
| `as_factionid_casts` | 48 | 41 | -7 |
| `as_unknown_casts` | 4 | 4 | 0 |
| `as_any_casts` | 11 | 11 | 0 |
| `non_null_assertions_dot` | 16 | 16 | 0 |
| `non_null_assertions_index` | 8 | 8 | 0 |
| **Total** | **87** | **80** | **-7** |

## Changes Made
### Batch 13 Owned File
- `ongoing_mobilization.ts`: removed literal `FactionId` casts from cross-faction HRHB pool seeds and the RBiH displacement-reroute pool initializer.

### Test Coverage
- `tests/strict_null_inventory_progress.test.ts`: added `PHASE_2_COMBAT_BATCH_13_FILES` and a Batch 13 assertion requiring zero counted escapes in `ongoing_mobilization.ts`.

## Verification
- `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts`
  - Red before cleanup: failed with Batch 13 `currentTotal` 7.
  - Green after cleanup: 10 tests passed.
- `npx.cmd vitest run tests/ongoing_mobilization.test.ts`
  - Passed: 4 tests passed.
- Inventory recount:
  - `as_factionid_casts`: 41
  - `as_unknown_casts`: 4
  - `as_any_casts`: 11
  - `non_null_assertions_dot`: 16
  - `non_null_assertions_index`: 8
  - Total: 80
- Parent integration:
  - `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/ongoing_mobilization.test.ts tests/corps_level_operations.test.ts tests/sector_intel.test.ts tests/attack_resolution_osid_intel_friction.test.ts tests/bot_supply_awareness_target_scoring.test.ts tests/sector_partition_instrumentation.test.ts tests/sector_rearrangement.test.ts tests/sector_contiguity_split.test.ts tests/sector_split_brigade_assignment.test.ts tests/sector_frontline_truth.test.ts --reporter=dot` passed: 11 files / 118 tests.
  - `npm.cmd run typecheck` passed.
  - `npm.cmd run sim:scenario:run:40w` produced n1889 hash `248202ee4fd13027`, byte-identical to n1888, with 27/27 anchors and 6/6 bot benchmarks.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/ongoing_mobilization.ts` | Removed 7 counted `as FactionId` casts |
| `tests/strict_null_inventory_progress.test.ts` | Added Batch 13 zero-escape assertion |
| `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` | Updated Phase 2 Batch 13 delta and remaining count |

## Residual Risk
- This was a type-only cleanup of string-alias casts. No runtime defaults, schema fields, ordering logic, or serialized output paths were changed.
- Parent integration ran the full 40w proof and preserved the active n1888 hash.
