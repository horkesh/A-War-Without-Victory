# Strict Null Phase 2 Batch 11

**Date:** 2026-05-18
**Run ID:** N/A
**Baseline:** Batch 11 owned combat slice had 8 inventory-counted strict-null escapes.
**Result:** Batch 11 owned combat slice has 0 inventory-counted strict-null escapes.

## Summary
- Removed the Batch 11 inventory-counted escape hatches from brigade home return, brigade movement, and brigade front distribution.
- Added a focused strict-null inventory progress assertion for the Batch 11 owned combat slice.
- Preserved existing state shape, ordering, and behavior; no schema changes, defaults, or randomness changes were introduced.

## Changes Made
### Inventory Gate
- Extended `tests/strict_null_inventory_progress.test.ts` with `PHASE_2_COMBAT_BATCH_11_FILES`.
- Added a focused assertion that the owned Batch 11 slice has zero counted escapes across the existing strict-null categories.

### Combat Cleanup
- Replaced `as unknown` corps-asset operation reads with a typed local formation view that exposes optional `active_operations`.
- Removed `as FactionId` casts where state types already narrow the value to `FactionId`.
- Removed non-null assertions on `brigade_movement_orders` writes by retaining the initialized map in a local variable.

## Inventory Delta
| Category | Before | After | Delta |
|---|---:|---:|---:|
| `as_factionid_casts` | 4 | 0 | -4 |
| `as_unknown_casts` | 2 | 0 | -2 |
| `as_any_casts` | 0 | 0 | 0 |
| `non_null_assertions_dot` | 0 | 0 | 0 |
| `non_null_assertions_index` | 2 | 0 | -2 |
| **Total** | **8** | **0** | **-8** |

## Verification
- Red check: `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` failed as expected before implementation with `expected 8 to be +0`.
- Green check: `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` passed with 8 tests.
- Parent typecheck after Batch 11 lane integration: `npm.cmd run typecheck` passed.
- Parent focused integration check: `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/attack_resolution_osid_intel_friction.test.ts tests/sector_intel.test.ts tests/sector_offensive.test.ts tests/sector_partition_instrumentation.test.ts tests/profile_hotspot_report.test.ts --reporter=dot` passed with 6 files / 53 tests.
- Parent 40w integration check: n1887 hash `38fcfed23b5b5c11`, 27/27 anchors, 6/6 bot benchmarks, consistency validator passed.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/brigade_home_return.ts` | Removed one `as_unknown` cast and one indexed non-null assertion. |
| `src/sim/combat/brigade_movement.ts` | Removed two `as FactionId` casts. |
| `src/sim/combat/brigade_front_distribution.ts` | Removed one `as_unknown` cast, two `as FactionId` casts, and one indexed non-null assertion. |
| `tests/strict_null_inventory_progress.test.ts` | Added the Batch 11 focused inventory assertion. |
| `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH11.md` | Recorded implementation, inventory delta, and verification status. |

## Next Steps
- Continue Phase 2 in another bounded combat-adjacent slice; 92 inventory-counted escapes remain after Batch 11.
