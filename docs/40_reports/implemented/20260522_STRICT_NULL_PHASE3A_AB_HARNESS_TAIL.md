# Strict-Null Phase 3A A/B Harness Tail

**Date:** 2026-05-22

## Summary

`src/cli/phase3a_ab_harness.ts` no longer contributes any `as_any_casts` to the strict-null inventory. The harness now carries typed pressure/front records, typed settlement edges, typed effective pressure edges, and typed turn reports through the local scenario probes without broad `any` widening.

While verifying the cleaned harness, two stale fixture assumptions were also repaired: the local mock states now declare `meta.phase: 'war'`, and the fixture factions use canonical strategy-table IDs (`RBiH`, `RS`, `HRHB`) instead of placeholder IDs. This keeps the diagnostic harness executable against the current turn pipeline and bot strategy tables.

This is a diagnostic harness/type-safety cleanup only. It does not change calibration/army-arc tuning, scenario data, save schema, combat math, operation behavior, or turn ordering.

## Inventory Delta

- Before: top-level `as_any_casts 95`; `src/cli/phase3a_ab_harness.ts` contributed 31.
- After: top-level `as_any_casts 64`; `src/cli/phase3a_ab_harness.ts` contributes 0.
- Remaining `as_any_casts` are confined to:
  - `src/cli/phase3abc_audit_harness.ts` (33)
  - `src/state/save_migration.ts` (23)
  - `src/ui/map/data/GameStateAdapter.ts` (8)

## Verification

- Red guard: `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` failed before the source cleanup because the new Phase 3A A/B harness cap saw 31 `as_any_casts`.
- Green guard: `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` passed 88/88 after the source cleanup.
- `npm.cmd run typecheck` passed.
- `npm.cmd run sim:phase3a:ab` passed after the stale harness fixtures were corrected, producing the three deterministic report files under `data\derived\_debug\phase3a_pressure_ab_report_*.txt`.
- `node tools\diagnostics\strict_null_inventory.cjs` reported `as_any_casts 64`, `as_unknown_casts 0`, `non_null_assertions_dot 0`, and `non_null_assertions_index 0`.

## Follow-Up

The next non-calibration strict-null slice should target `src/cli/phase3abc_audit_harness.ts` if it can be cleaned with the same typed diagnostic-harness pattern and focused harness proof. `save_migration.ts` remains a save-shape lane, and `GameStateAdapter.ts` remains gated by adapter-contract and UI/engine `FactionId` decisions.
