# Strict Null Phase 2 Batch 8

**Date:** 2026-05-18
**Baseline:** Batch 7 Phase 2 combat inventory: 105 counted escape hatches
**Result:** Batch 8 Phase 2 combat inventory: 103 counted escape hatches

## Summary
- Cleaned the Batch 8 strict-null continuation slice in `src/sim/combat/brigade_movement_query.ts`.
- Removed two redundant `as FactionId` casts from typed `FormationState.faction` reads.
- Added a focused Batch 8 inventory assertion to keep the slice at zero counted escape hatches.

## Changes Made
### Combat Strict-Null Slice
- `brigade_movement_query.ts`: removed two inventory-counted `as FactionId` casts. `FactionId` is currently an alias of `string`, and `FormationState.faction` is already typed as `FactionId`, so the assignments remain behavior-identical.

### Inventory Progress Test
- `strict_null_inventory_progress.test.ts`: added `PHASE_2_COMBAT_BATCH_8_FILES` and an assertion that the Batch 8 slice has zero counted escape hatches.

### Phase Ledger
- `2026-05-17-strict-null-checks-migration-phases.md`: recorded Batch 8 and lowered Phase 2 remaining inventory from 105 to 103.

## Inventory Delta
| Scope | Before | After | Delta |
|---|---:|---:|---:|
| `src/sim/combat/brigade_movement_query.ts` | 2 | 0 | -2 |
| Phase 2 combat total | 105 | 103 | -2 |

Category delta:
- `as_factionid_casts`: -2
- `as_unknown_casts`: 0
- `as_any_casts`: 0
- `non_null_assertions_dot`: 0
- `non_null_assertions_index`: 0

## Verification
- Red evidence: `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts` failed before source edits with `expected 2 to be +0` for the Batch 8 assertion.
- Green evidence: `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts` passed after source edits.
- Inventory evidence: `brigade_movement_query.ts` reports zero counted escape hatches after the edit; Phase 2 combat total is 103.

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/brigade_movement_query.ts` | Removed two redundant faction casts |
| `tests/strict_null_inventory_progress.test.ts` | Added Batch 8 focused progress assertion |
| `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` | Recorded Batch 8 remaining count |
| `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH8.md` | Added implementation report |

## Next Steps
- Continue Phase 2 with another narrow, non-sector combat slice.
- Avoid sector reconstruction and sector performance instrumentation until the owning lane is complete.
