# Strict Null Phase 2 Batch 15

**Date:** 2026-05-18
**Baseline:** Phase 2 combat strict-null inventory at 75 after Batch 14
**Result:** Phase 2 combat strict-null inventory at 71 after Batch 15
**Integrated proof:** Parent Batch 15 proof passed typecheck and 40w n1891 `0d8d9ccdc477d77a`.

## Summary
- Cleaned `src/sim/combat/army_reserve_system.ts`, a disjoint combat slice outside the excluded sector, intel, AAR, Chronicle, and UI lanes.
- Removed 4 inventory-counted strict-null escapes, all redundant `as FactionId` casts on values already typed as `FormationState.faction`.
- Added a focused Batch 15 progress assertion that failed before cleanup with `expected 4 to be +0`, then passed after the source cleanup.

## Changes Made
### Progress Guard
- Added `PHASE_2_COMBAT_BATCH_15_FILES` to `tests/strict_null_inventory_progress.test.ts`.
- Added a Batch 15 assertion requiring the selected combat slice to have zero counted strict-null escapes.

### Combat Cleanup
- Passed `formation.faction` directly into friendly-distance and target-resolution helpers after existing formation guards.
- Reused the already-narrowed `f.faction` value during elite-loan voluntary recall reachability checks.
- No behavioral guards, defaults, sorting, serialization, or random sources were changed.

## Counts
| Scope | Before | After | Delta |
|------|--------|-------|-------|
| Batch 15 slice | 4 | 0 | -4 |
| Phase 2 combat total | 75 | 71 | -4 |

After category counts for Phase 2 combat:

| Category | Count |
|----------|-------|
| `as_factionid_casts` | 34 |
| `as_unknown_casts` | 4 |
| `as_any_casts` | 11 |
| `non_null_assertions_dot` | 16 |
| `non_null_assertions_index` | 6 |

## Verification
| Command | Result |
|---------|--------|
| `npm.cmd exec -- vitest run tests/strict_null_inventory_progress.test.ts` before cleanup | Failed as expected: Batch 15 received 4, expected 0 |
| `npm.cmd exec -- vitest run tests/strict_null_inventory_progress.test.ts` | Passed: 1 file, 12 tests |
| `npm.cmd exec -- vitest run tests/army_reserve_system.test.ts tests/elite_loan_recall.test.ts` | Passed: 2 files, 43 tests |
| Parent integrated focused run | Passed in `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/army_reserve_system.test.ts tests/elite_loan_recall.test.ts tests/attack_resolution_osid_intel_friction.test.ts --reporter=dot`: 4 files, 61 tests |
| Parent integrated 40w run | Passed n1891 `0d8d9ccdc477d77a`, 27/27 anchors, 6/6 bot benchmarks; consistency validation passed |

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/army_reserve_system.ts` | Removed redundant faction casts without behavior changes |
| `tests/strict_null_inventory_progress.test.ts` | Added Batch 15 progress assertion |
| `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` | Updated Phase 2 combat count and Batch 15 ledger note |
| `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH15.md` | Added implementation report |

## Residual Risk
- This was a type-only cleanup over already typed `FormationState.faction` values; the integrated Batch 15 scenario hash moved because of the separate intel ambush lane, not this strict-null cleanup.
- Residual Phase 2 combat inventory remains at 71 and still includes larger or excluded shared files such as attack resolution, sector building/offensive, sector intel, AAR, and commander emission/planning lanes.
