# Strict-Null Phase 3ABC Audit Harness Tail

**Date:** 2026-05-22

## Summary

`src/cli/phase3abc_audit_harness.ts` no longer contributes any `as_any_casts` to the strict-null inventory. The harness now passes typed `EffectivePressureEdge[]`, `EdgeRecord[]`, `TurnReport`, front-pressure, front-segment, and front-posture structures through the local audit scenarios without broad `any` widening.

The stale harness faction placeholders were also replaced with canonical strategy-table IDs (`RBiH`, `RS`) and the local mock states now declare `meta.phase: 'war'`. Typed front-posture assignments now include the required `edge_id` field, matching the current engine contract instead of relying on loose object writes.

This is diagnostic harness/type-safety cleanup only. It does not change calibration/army-arc tuning, scenario data, save schema, combat math, operation behavior, or turn ordering.

## Inventory Delta

- Before: top-level `as_any_casts 64`; `src/cli/phase3abc_audit_harness.ts` contributed 33.
- After: top-level `as_any_casts 31`; `src/cli/phase3abc_audit_harness.ts` contributes 0.
- Remaining `as_any_casts` are confined to:
  - `src/state/save_migration.ts` (23)
  - `src/ui/map/data/GameStateAdapter.ts` (8)

## Verification

- `npx.cmd vitest run tests\strict_null_inventory_progress.test.ts --reporter=dot` passed 89/89 with the new Phase 3ABC harness cap.
- `npm.cmd run typecheck` passed.
- `npm.cmd run phase3:abc_audit` passed, generating deterministic A-D reports and hashes:
  - A `af234629acd600274dc686878045016f67183ff175a9a35f5c24e48288bcdbdb`
  - B `60e29e56aea11572ebcfdd814bbe34135682fe5113033212b0900518b588c924`
  - C `10b78029c549b2df04cda0ed6e1386ad2a5d41b8044df69b760573a04a05de64`
  - D `23544920575e8dfdf2a46c82574e511cec6242dc94e37576ee3b6ef0953774be`
- `node tools\diagnostics\strict_null_inventory.cjs` reported `as_any_casts 31`, `as_unknown_casts 0`, `non_null_assertions_dot 0`, and `non_null_assertions_index 0`.

## Follow-Up

The only remaining `as_any_casts` are now `src/state/save_migration.ts` and `src/ui/map/data/GameStateAdapter.ts`. `save_migration.ts` should be handled as a save-shape/default-decision lane, and `GameStateAdapter.ts` remains gated by adapter-contract and UI/engine `FactionId` decisions.
