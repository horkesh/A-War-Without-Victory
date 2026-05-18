# Strict Null Phase 2 Batch 12

**Date:** 2026-05-18
**Baseline:** Phase 2 combat strict-null inventory after Batch 11: 92 counted escapes
**Result:** Phase 2 combat strict-null inventory after Batch 12: 87 counted escapes

## Summary
- Cleaned a bounded combat-adjacent strict-null slice in `rear_pocket_consolidation.ts`, `sector_rearrangement.ts`, and `subsegment_assignment.ts`.
- Removed five inventory-counted `as FactionId` casts where `FactionId` is already a string alias and the surrounding data flow is string-typed.
- Added a focused Batch 12 inventory assertion to lock the selected files at zero counted escapes.

## Inventory Delta
| Category | Before | After | Delta |
|---|---:|---:|---:|
| `as_factionid_casts` | 53 | 48 | -5 |
| `as_unknown_casts` | 4 | 4 | 0 |
| `as_any_casts` | 11 | 11 | 0 |
| `non_null_assertions_dot` | 16 | 16 | 0 |
| `non_null_assertions_index` | 8 | 8 | 0 |
| **Total** | **92** | **87** | **-5** |

## Changes Made
### Batch 12 Owned Files
- `rear_pocket_consolidation.ts`: passed existing string faction locals directly into displacement timer seeding.
- `sector_rearrangement.ts`: removed the array-level `as FactionId[]` cast from sorted opposing factions.
- `subsegment_assignment.ts`: used the existing political controller string directly as the `Map<FactionId, Set<string>>` key.

### Test Coverage
- `tests/strict_null_inventory_progress.test.ts`: added `PHASE_2_COMBAT_BATCH_12_FILES` and a Batch 12 assertion requiring zero counted escapes in the owned slice.

## Verification
- `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts`
  - Red before cleanup: failed with Batch 12 `currentTotal` 5.
  - Green after cleanup: 9 tests passed.
- `npm.cmd run typecheck`
  - Passed: `tsc --noEmit -p tsconfig.json`.
- Parent focused integration: `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/attack_resolution_osid_intel_friction.test.ts tests/sector_intel.test.ts tests/sector_offensive.test.ts tests/sector_partition_instrumentation.test.ts tests/profile_hotspot_report.test.ts tests/ui_shell_frame_contract.test.ts tests/ui/paramilitary_inbox_items.test.ts tests/ui/paramilitary_review_modal.test.ts tests/ui/inbox_items.test.ts tests/ui_presidential_decision_room_wiring.test.ts --reporter=dot` passed with 11 files / 111 tests.
- Parent 40w integration: n1888 hash `248202ee4fd13027`, 27/27 anchors, 6/6 bot benchmarks, consistency validator passed.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/rear_pocket_consolidation.ts` | Removed 2 counted `as FactionId` casts |
| `src/sim/combat/sector_rearrangement.ts` | Removed 1 counted `as FactionId[]` cast |
| `src/sim/combat/subsegment_assignment.ts` | Removed 2 counted `as FactionId` casts |
| `tests/strict_null_inventory_progress.test.ts` | Added Batch 12 zero-escape assertion |
| `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` | Updated Phase 2 Batch 12 delta and remaining count |

## Parent Integration Notes
- No commits were made.
- Excluded files named by the parent lane were not edited.
- No defaults, schema changes, random source changes, ordering changes, or serialized output changes were introduced.
