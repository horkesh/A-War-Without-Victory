# Batch 12 Intel Friction AAR Annotation

Date: 2026-05-18

## Summary
- Added an optional public-safe `execution_friction` annotation for battles affected by Batch 11 intel execution friction.
- The annotation records only bounded public labels and attacker confidence bands, not hidden defender truth or exact intel confidence.
- Threaded the annotation through attack-resolution reports, turn AAR summaries, weekly battle reporting, and existing battle AAR/tooltip displays.

## Annotation Shape

```ts
execution_friction?: {
  labels: Array<'stale_intel' | 'defender_opsec'>;
  attacker_confidence_band?: 'low' | 'medium' | 'high';
}
```

- `stale_intel` appears only when the attacker power multiplier was below `1.0`.
- `defender_opsec` appears only when the defender OPSEC multiplier was above `1.0`.
- `attacker_confidence_band` is emitted only with `stale_intel`.
- Neutral full-confidence/no-OPSEC battles omit the field.

## Changes Made
- `src/sim/combat/attack_resolution_types.ts`: defined the public annotation type and optional battle field.
- `src/sim/combat/attack_resolution_osid.ts`: derives the optional annotation from the already-applied Batch 11 multipliers.
- `src/sim/compile_turn_summary.ts` and `src/state/turn_summary.ts`: carry the optional field into persistent turn AAR battles.
- `src/scenario/scenario_reporting.ts` and `src/scenario/scenario_runner.ts`: carry the optional field into weekly report battle entries.
- `src/ui/map/components/AARPanel.tsx` and `src/ui/map/components/Tooltip.tsx`: show compact public labels when present.
- `tests/attack_resolution_osid_intel_friction.test.ts`: covers stale intel, OPSEC, neutral absence, and AAR propagation.

## Determinism / Hash Risk
- No randomness, clock reads, filesystem traversal, or ordering changes were added.
- The field is additive and optional, so save compatibility is preserved.
- Scenario hashes can move when serialized reports include affected battles, but combat outcomes are unchanged from Batch 11 because the annotation only records multipliers already applied.

## Verification
- Red test observed first: focused resolver/AAR tests failed because `execution_friction` was absent.
- `npx.cmd vitest run tests\attack_resolution_osid_intel_friction.test.ts --reporter=dot` passed: 1 file / 4 tests.
- `npm.cmd run typecheck` passed.
- Parent integration verification:
  - `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts tests/attack_resolution_osid_intel_friction.test.ts tests/sector_intel.test.ts tests/sector_offensive.test.ts tests/sector_partition_instrumentation.test.ts tests/profile_hotspot_report.test.ts tests/ui_shell_frame_contract.test.ts tests/ui/paramilitary_inbox_items.test.ts tests/ui/paramilitary_review_modal.test.ts tests/ui/inbox_items.test.ts tests/ui_presidential_decision_room_wiring.test.ts --reporter=dot` passed: 11 files / 111 tests.
  - `npm.cmd run sim:scenario:run:40w` produced n1888 hash `248202ee4fd13027`, 27/27 anchors, and 6/6 bot benchmarks.
  - `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1888` passed.

## Parent Integration Notes
- Parallel strict-null and sector-performance files were not touched.
- Parent should integrate this as an additive Batch 12 follow-up to Batch 11, with no save migration.
