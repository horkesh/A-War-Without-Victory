# Strict Null Phase 2 Batch 14

**Date:** 2026-05-18
**Baseline:** Phase 2 combat strict-null inventory at 80 after Batch 13
**Result:** Phase 2 combat strict-null inventory at 75 after Batch 14

## Summary
- Cleaned `src/sim/combat/jna_phantom_brigades.ts`, a disjoint combat slice outside the excluded sector-building and UI/AAR lanes.
- Removed 5 inventory-counted strict-null escapes: 3 `as FactionId` casts and 2 indexed non-null assertions.
- Added a focused Batch 14 progress assertion that failed before cleanup with `expected 5 to be +0`, then passed after the source cleanup.

## Changes Made
### Progress Guard
- Added `PHASE_2_COMBAT_BATCH_14_FILES` to `tests/strict_null_inventory_progress.test.ts`.
- Added a Batch 14 assertion requiring the selected combat slice to have zero counted strict-null escapes.

### Combat Cleanup
- Typed phantom definition `kind_tag` as `FormationState['kind']`, removing the spawn-time kind cast.
- Carried `faction` as a `FactionId` local through control-flip writes and displacement seeding, removing redundant faction casts.
- Reused narrowed local `formations` maps after guard checks in withdrawal and countdown scans, removing non-null assertions inside filter closures.

## Counts
| Scope | Before | After | Delta |
|------|--------|-------|-------|
| Batch 14 slice | 5 | 0 | -5 |
| Phase 2 combat total | 80 | 75 | -5 |

After category counts for Phase 2 combat:

| Category | Count |
|----------|-------|
| `as_factionid_casts` | 38 |
| `as_unknown_casts` | 4 |
| `as_any_casts` | 11 |
| `non_null_assertions_dot` | 16 |
| `non_null_assertions_index` | 6 |

## Verification
| Command | Result |
|---------|--------|
| `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts` before cleanup | Failed as expected: Batch 14 received 5, expected 0 |
| `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/jna_phantom_brigades.test.ts` | Passed: 2 files, 24 tests |
| Parent focused integration | Passed: `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/jna_phantom_brigades.test.ts tests/sector_partition_instrumentation.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/sector_frontline_truth.test.ts tests/ui/operation_aar_records_review.test.ts --reporter=dot` (6 files, 74 tests) |
| Parent typecheck / scenario | Passed: `npm.cmd run typecheck`; 40w n1890 `248202ee4fd13027` byte-identical to n1888/n1889; run consistency validation PASS |

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/jna_phantom_brigades.ts` | Removed typed casts/assertions without behavior changes |
| `tests/strict_null_inventory_progress.test.ts` | Added Batch 14 progress assertion |
| `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` | Updated Phase 2 combat count and Batch 14 ledger note |

## Residual Risk
- This was a type-only cleanup over existing control-flow and map guards; no serialization, schema, ordering, random source, or scenario behavior was intentionally changed.
- Residual Phase 2 combat inventory remains at 75 and still includes larger shared files such as attack resolution, commander emission, sector offensive, and excluded sector-building lanes.
