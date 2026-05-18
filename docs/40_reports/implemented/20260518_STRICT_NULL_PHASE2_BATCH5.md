# Strict Null Phase 2 Batch 5

**Date:** 2026-05-18
**Result:** Phase 2 combat strict-null continuation, hash-stable

## Summary
- Cleaned four additional Phase 2 combat files outside the Batch 4 commit and outside event notification/UI/docs scope.
- Replaced `as FactionId` and non-null assertion paths with explicit guards, typed accessors, and narrow local variables.
- Added an inventory progress assertion for the Batch 5 slice.

## Changes Made
### Combat strict-null cleanup
- `src/sim/combat/combat_math.ts`: guarded optional corps-command and officer lookups, removed array index non-null assertions, and made the empty-defender precondition explicit.
- `src/sim/combat/faction_progression.ts`: replaced keyframe tuple assertions with a helper, removed unused asserted report access, and narrowed selected formation composition before mutation while preserving the prior missing-count-as-zero update behavior.
- `src/sim/combat/operation_casualty_attribution.ts`: changed axis-entry creation into a typed return helper.
- `src/sim/combat/warlord_friction.ts`: replaced the faction cast with a local faction-id reader and guarded officer-state reads.

### Inventory test
- `tests/strict_null_inventory_progress.test.ts`: added the Batch 5 Phase 2 combat continuation assertion.

## Scenario Results
- 40w scenario run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1880` (parent closeout after behavior-preserving composition update)
- Final-state hash: `42607f83870e01d5`
- Baseline comparison: hash-stable against the current 40w baseline.

## Determinism
- No random, time, filesystem ordering, serialization, schema, or scenario data changes.
- Existing sorted iteration and strict comparison paths were preserved.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/combat_math.ts` | Explicit optional guards and array-index narrowing |
| `src/sim/combat/faction_progression.ts` | Keyframe helper and composition/report narrowing |
| `src/sim/combat/operation_casualty_attribution.ts` | Typed axis-entry helper |
| `src/sim/combat/warlord_friction.ts` | Faction-id reader and officer-state guard |
| `tests/strict_null_inventory_progress.test.ts` | Batch 5 inventory assertion |
| `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` | Phase ledger note and remaining scope |

## Verification
- `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts` passed 3/3.
- `npm.cmd run typecheck` passed.
- `npm.cmd run sim:scenario:run:40w` passed with final-state hash `42607f83870e01d5`.

## Next Steps
- Continue Phase 2 on the remaining 110 combat inventory escapes.
- Avoid the conflict-prone `paramilitary_sweep.ts`, supply-related files, and fatigue-related files until the parallel lanes are clear.
