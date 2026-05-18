# Strict Null Phase 2 Batch 17

**Date:** 2026-05-18
**Run ID:** N/A
**Baseline:** Phase 2 combat strict-null inventory after Batch 16: 69 counted escapes
**Result:** Phase 2 combat strict-null inventory after Batch 17: 66 counted escapes

## Summary
- Removed three counted strict-null `FactionId` casts from `src/sim/combat/attack_retreat_displacement.ts`.
- Added a Batch 17 inventory progress assertion that fails while those counted escapes remain.
- Preserved runtime behavior: `FormationState.faction` is already typed as `FactionId`, so the cleanup changes type inference only.

## Changes Made
### Phase 2 Combat Slice
- Replaced redundant `formation.faction as FactionId` and `f.faction as FactionId` casts with direct typed reads.
- Left retreat destination sorting, emergency retreat selection, displacement penalties, and state writes unchanged.

### Progress Ledger
- Added `PHASE_2_COMBAT_BATCH_17_FILES` to `tests/strict_null_inventory_progress.test.ts`.
- Updated the strict-null phase ledger from 69 to 66 remaining Phase 2 combat escapes.

## Lessons Learned
- `FormationState.faction` already carries the strict type in this slice, so narrow cast cleanup can be done without adding fallback branches or changing retreat control flow.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/attack_retreat_displacement.ts` | Removed 3 redundant `FactionId` casts from retreat/displacement faction reads. |
| `tests/strict_null_inventory_progress.test.ts` | Added Batch 17 red/green inventory assertion. |
| `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` | Updated Phase 2 counts and Batch 17 ledger note. |
| `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH17.md` | Added implementation report. |

## Verification
| Command | Result |
|---|---|
| `.\node_modules\.bin\vitest.cmd run tests\strict_null_inventory_progress.test.ts -t "Batch 17"` before implementation | Failed as expected: expected `0`, received `3`. |
| `.\node_modules\.bin\vitest.cmd run tests\strict_null_inventory_progress.test.ts -t "Batch 17"` after implementation | Passed locally. |
| `.\node_modules\.bin\vitest.cmd run tests\emergency_retreat_reachability.test.ts` | Passed locally: 4 tests. |
| `npm.cmd run typecheck` | Failed in protected Operation AAR UI test scope: `tests/ui/operation_aar_records_review.test.ts(86,21)` is missing required `casualties_inflicted`. No Batch 17 source or inventory type errors were reported before this failure. |

## Next Steps
- Continue Phase 2 with another narrow combat file outside protected ownership, preferably one with one to four counted escapes.
