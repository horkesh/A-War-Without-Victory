# Strict Null Phase 2 Batch 16

**Date:** 2026-05-18
**Run ID:** N/A
**Baseline:** Phase 2 combat strict-null inventory after Batch 15: 71 counted escapes
**Result:** Phase 2 combat strict-null inventory after Batch 16: 69 counted escapes

## Summary
- Removed the two remaining counted strict-null `FactionId` casts from `src/sim/combat/army_order_interpretation.ts`.
- Added a Batch 16 inventory progress assertion that fails while those counted escapes remain.
- Preserved runtime behavior: the edited arrays are still derived from `Map<FactionId, ...>` and `Set<FactionId>` keys, then sorted as before.

## Changes Made
### Phase 2 Combat Slice
- Replaced redundant `Array.from(...keys()) as FactionId[]` and `Array.from(set) as FactionId[]` casts with direct typed array inference.
- Left telemetry serialization, ordering, and state mutation behavior unchanged.

### Progress Ledger
- Added `PHASE_2_COMBAT_BATCH_16_FILES` to `tests/strict_null_inventory_progress.test.ts`.
- Updated the strict-null phase ledger from 71 to 69 remaining Phase 2 combat escapes.

## Lessons Learned
- Small continuation slices are safest when the source collection already carries the target type; removing the cast can become a pure type cleanup with no control-flow or fallback changes.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/army_order_interpretation.ts` | Removed 2 redundant `FactionId[]` casts from C2 telemetry ordering helpers. |
| `tests/strict_null_inventory_progress.test.ts` | Added Batch 16 red/green inventory assertion. |
| `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` | Updated Phase 2 counts and Batch 16 ledger note. |
| `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH16.md` | Added implementation report. |

## Verification
| Command | Result |
|---|---|
| `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts` before implementation | Failed as expected on the new Batch 16 expectation while 2 counted escapes remained. |
| `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts` after implementation | Passed locally. |
| Focused army-order interpretation suites | Passed locally across C2/directive/commander directive coverage. |
| `npm.cmd run typecheck` | Passed locally. |
| `npm.cmd run sim:scenario:run:40w` parent integration | Passed; produced n1893 `b14179d65639860c`, 27/27 anchors, 6/6 bot benchmarks. |

## Next Steps
- Continue Phase 2 with another narrow combat file that is outside protected ownership, preferably one with one to three counted escapes.
