# Strict Null Phase 2 Batch 9

**Date:** 2026-05-18
**Baseline:** Phase 2 combat inventory after Batch 8: 103 counted escapes
**Result:** Phase 2 combat inventory after Batch 9: 102 counted escapes

## Summary
- Cleaned one small Phase 2 combat strict-null escape in `bot_brigade_eval_attack.ts`.
- Added a Batch 9 progress assertion to keep the slice at zero counted escapes.
- Preserved behavior: no schema, data, ordering, random source, or calibration changes.

## Changes Made
### Phase 2 Combat Continuation
- Removed the unnecessary `as FactionId` cast in the cached active-formation defender lookup. `FactionId` is currently a string alias, and the preceding candidate gates already prove a non-empty controller string before the lookup.
- Added `src/sim/combat/bot_brigade_eval_attack.ts` to the strict-null progress test as the Batch 9 slice.

## Verification
- Red evidence before source edit: `node node_modules/vitest/vitest.mjs run tests/strict_null_inventory_progress.test.ts` failed with Batch 9 `expected 1 to be 0`.
- Green evidence after source edit: `node node_modules/vitest/vitest.mjs run tests/strict_null_inventory_progress.test.ts` passed 6/6.
- Focused behavior tests: `node node_modules/vitest/vitest.mjs run tests/uncontested_sector_defense_cache.test.ts tests/brigade_aor_subsegment.test.ts tests/defensive_front_gap_count_cache.test.ts` passed 26/26.
- Inventory recount: Phase 2 combat total is 102 (`as_factionid_casts`: 57, `as_unknown_casts`: 6, `as_any_casts`: 13, `non_null_assertions_dot`: 16, `non_null_assertions_index`: 10).

## Files Changed
| File | Change |
|---|---|
| `src/sim/combat/bot_brigade_eval_attack.ts` | Removed one unnecessary `as FactionId` cast |
| `tests/strict_null_inventory_progress.test.ts` | Added Batch 9 zero-inventory assertion |
| `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` | Updated Phase 2 Batch 9 count and note |
| `docs/40_reports/implemented/20260518_STRICT_NULL_PHASE2_BATCH9.md` | Added implementation report |

## Next Steps
- Continue Phase 2 with another small non-sector combat slice.
- Leave `corps_front_sectors.ts` and sector performance files to the parallel sector lane.
