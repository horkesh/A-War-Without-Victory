# Strict-Null Save Migration Tail

**Date:** 2026-05-22

## Summary

`src/state/save_migration.ts` no longer contributes any `as_any_casts` to the strict-null inventory. The cleanup replaces broad casts on `state` and `state.military` with direct typed reads or the file's existing tolerant `asRecord(...)` boundary helper.

This preserves the save-migration contract: migrations remain in-place, deterministic, version-ordered patches, and this slice does not add, remove, or change any migration defaults.

## Inventory Delta

- Before: top-level `as_any_casts 31`; `src/state/save_migration.ts` contributed 23.
- After: top-level `as_any_casts 8`; `src/state/save_migration.ts` contributes 0.
- Remaining `as_any_casts` are confined to `src/ui/map/data/GameStateAdapter.ts` (8).
- The two retained `as_factionid_casts` are also in `GameStateAdapter.ts` under the existing UI/engine `FactionId` stop-gate.

## Verification

- `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` passed 90/90 with the new save-migration cap.
- `npm.cmd run typecheck` passed.
- `npm.cmd run test:baselines` passed: `Baseline regression: all scenarios match.`
- `node tools\diagnostics\strict_null_inventory.cjs` reported `as_any_casts 8`, `as_unknown_casts 0`, `non_null_assertions_dot 0`, and `non_null_assertions_index 0`.
- `git diff --check` passed.

## Follow-Up

The only remaining strict-null visible escape owners are now `GameStateAdapter.ts`: eight `as_any_casts` and two retained `as_factionid_casts`. That file remains an adapter-contract and UI/engine `FactionId` boundary; any further cleanup should be paired with adapter-focused tests and, for imported JSON or external payloads, runtime validation rather than cosmetic casting changes.
