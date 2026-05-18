# Intel Per-OSID Target Scoring Batch 13

**Date:** 2026-05-18
**Result:** Bounded per-OSID intel confidence now affects bot objective selection

## Summary
- Corps offensive launch now ranks otherwise comparable objective candidates by the attacking corps' public sector-intel confidence for each target OSID.
- The scoring hook reads `state.military.sector_intel` only, preferring `SectorIntelRecord.osid_confidence` and falling back to the sector-pair confidence only when the target OSID belongs to that observed enemy sector.
- No UI/read-model data was changed, and no hidden defender truth is exposed.

## Changes Made
### Target Selection
- `src/sim/combat/sector_offensive.ts` adds `getTargetOsidIntelConfidenceForCorps(...)` and uses it to sort operation-launch candidate targets before the existing contiguous-chain objective selection.
- Target confidence is deterministic: friendly corps sectors are scanned in sorted sector-id order, intel records are sorted by enemy sector id, and the highest matching confidence is used.
- If two candidate targets have equal or missing confidence, the original directive order is preserved, with `strictCompare` as the final deterministic tie-break.

### Tests
- `tests/corps_level_operations.test.ts` adds a red/green regression where two reachable targets are otherwise comparable and the lower-confidence target appears first in the directive. The operation now chooses the higher-confidence OSID.

## Determinism Note
- The implementation adds no randomness, timestamps, or hidden-state sampling.
- Ordering is explicit and stable: sorted sector traversal, sorted intel-record traversal, original directive-order preservation, and `strictCompare` final fallback.
- The only new scoring input is public/intel belief state already serialized in `sector_intel`.

## Verification
- Red test observed before implementation:
  - `npx.cmd vitest run tests/corps_level_operations.test.ts --reporter=dot`
  - Failed as expected: selected `op:e:stale` instead of `op:e:fresh`.
- Focused green test:
  - `npx.cmd vitest run tests/corps_level_operations.test.ts --reporter=dot`
  - Passed: 1 file / 12 tests.
- Focused target/intel regression suite:
  - `npx.cmd vitest run tests/corps_level_operations.test.ts tests/sector_intel.test.ts tests/attack_resolution_osid_intel_friction.test.ts tests/bot_supply_awareness_target_scoring.test.ts --reporter=dot`
  - Passed: 4 files / 37 tests.
- Parent integration:
  - `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/ongoing_mobilization.test.ts tests/corps_level_operations.test.ts tests/sector_intel.test.ts tests/attack_resolution_osid_intel_friction.test.ts tests/bot_supply_awareness_target_scoring.test.ts tests/sector_partition_instrumentation.test.ts tests/sector_rearrangement.test.ts tests/sector_contiguity_split.test.ts tests/sector_split_brigade_assignment.test.ts tests/sector_frontline_truth.test.ts --reporter=dot`
  - Passed: 11 files / 118 tests.
  - `npm.cmd run typecheck` passed.
  - `npm.cmd run sim:scenario:run:40w` produced n1889 hash `248202ee4fd13027`, byte-identical to n1888, with 27/27 anchors and 6/6 bot benchmarks.
  - `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1889` passed.

## Residual Risk
- This is a narrow operation-launch objective ordering hook. It does not attempt broader deterministic ambush modeling or deeper brigade-level target scoring outside active operation launch.
- The default April 1992 40w path stayed byte-identical to n1888. Future scenarios may move if comparable target candidates have different per-OSID intel confidence; that movement is expected behavior for this lane when it occurs.

## Files Changed
| File | Change |
|------|--------|
| `src/sim/combat/sector_offensive.ts` | Added confidence-aware objective candidate ordering for corps offensive launch |
| `tests/corps_level_operations.test.ts` | Added regression for per-OSID confidence target preference |
| `docs/40_reports/implemented/20260518_INTEL_PER_OSID_TARGET_SCORING_BATCH13.md` | Implementation report |
