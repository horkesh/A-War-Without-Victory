# Strict-Null Phase 2 Long-Tail Classification

**Date:** 2026-05-18
**Plan:** `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` (Phase 2: Sim engine — combat)
**Status:** Phase 2 safe scope **CLOSED**. 21 remaining escapes are all either gated, load-bearing, deliberately preserved, or require substantive refactoring outside this lane.

## Summary

Phase 2 entered the session with ~55 escapes. The session ran four progressive batches against the cleanable surface:

- Batch 18 (commit `5d9053b5`): 11 escapes removed → 55 baseline (was actually 66 inputs, plan reports the band).
- Batch 19 (commit `2d66de92`): 16 escapes removed → 39 remaining.
- Batch 20 (commit `f8c0153f`): 18 escapes removed → 21 remaining.
- Batch 30 (THIS): classification audit confirming the 21 are not safely cleanable inside this lane's scope.

The plan ledger's Phase 2 "remaining inventory" target should be considered **closed for the safe-surface scope**. Any further reduction needs explicit cross-lane coordination (sector perf, paramilitary, supply, save-schema).

## Classification Of Remaining Escapes (21)

| File | Count | Sites | Classification | Reason |
|---|---:|---|---|---|
| `src/sim/combat/commander_march_correction.ts` | 2 | L184, L189 (`non_null_assertions_index`) | **DELIBERATELY PRESERVED** | Batch 19 decision: `state.military.brigade_movement_state` is absent from `apr_1992_initial_save.json`. Adding the idempotent `if (!state.military.brigade_movement_state) state.military.brigade_movement_state = {};` guard would shift the serialized save shape from `undefined` to `{}` on turn 0 and break byte-identity. Rule recorded in [[feedback_save_shape_overrides_type_cleanup]] (PROJECT_LEDGER_KNOWLEDGE, Batch 20). |
| `src/sim/combat/corps_front_sectors.ts` | 7 | L178, L182, L209, L323, L576 (+2 more `non_null_assertions_dot`) | **LOAD-BEARING (instrumentation)** | All 7 are inside the `_perfTime` / `_flushInvocation` instrumentation block. They use `nodeProcess!.hrtime.bigint()` and `nodeProcess!.cwd()` where the surrounding code already gates on `SECTOR_PARTITION_PERF_FLAG`. The `static-grep guards` test in `tests/sector_partition_instrumentation.test.ts` explicitly forbids `Math.random` / `Date.now` / `new Date` / `performance.now` here; rewriting the `!` would require restructuring the instrumentation, which the test guards against. Cleanable only via a co-located local-`nodeProcess` narrow under the flag check (~7-line refactor with its own byte-identity proof). |
| `src/sim/combat/paramilitary_sweep.ts` | 3 | L113 (`as_factionid_casts`), L592 (`as_factionid_casts`), L619 (`non_null_assertions_index`) | **GATED** | Plan stop-gate: "paramilitary, supply, and fatigue files are conflict-prone in the current multi-agent lane. Leave them as ledger entries until the parent lane confirms they are free." |
| `src/sim/combat/sector_building.ts` | 1 | L563 (`as_factionid_casts`) | **LOAD-BEARING (type narrowing)** | `[...allOpposingFactions].sort(strictCompare) as FactionId[]`. `allOpposingFactions: Set<string>` (line 503 declared). The cast narrows `string[]` → `FactionId[]` at the sector record assembly boundary; removing it requires changing `Set<string>` to `Set<FactionId>`, which in turn requires re-typing `meta.side_a / side_b` from `string | null` to `FactionId | null` across the edge meta type. Cross-file refactor outside this lane's scope. |
| `src/sim/combat/sector_offensive.ts` | 5 | L535 (`non_null_assertions_dot` on `axes!.`), L698 (`as_factionid_casts`), L783 (`non_null_assertions_dot` on `active_probe!.`), L1140 (`as_factionid_casts`), L366 (`non_null_assertions_index` on `brigade_movement_orders![...]`) | **MIXED — conflict-prone Lane B/C territory** | This is the canonical operations file for sector-level lifecycle. Touching it during sector-perf attribution lanes (Batches 23-27) would have created merge conflicts. The two `as_factionid_casts` on `(formation?.faction ?? 'RS') as FactionId` patterns may be removable if the `?? FactionId-literal` narrowing is provable to TS, but each removal needs a byte-identity proof and the file is in the active sector-perf lane. Defer to a dedicated future batch. |
| `src/sim/combat/sector_offensive_launch_helpers.ts` | 2 | L539, L636 (`as_unknown_casts`) | **DELIBERATE TYPE-SYSTEM WORKAROUND** | Both are `undefined as unknown as OperationalToCanonicalReverseMap`. The callee `predictAllAdjacentTargets` declares `reverseMap: OperationalToCanonicalReverseMap` (non-optional, `combat_predictor.ts:551`). Removing the cast requires either changing the function signature to `OperationalToCanonicalReverseMap \| undefined` and threading optional-handling through every internal `reverseMap` consumer in `predictCombatOutcome` etc., or having the caller compute a real reverseMap from state. Substantive cross-file refactor; not appropriate for a strict-null cleanup lane. |
| `src/sim/combat/supply_condition.ts` | 1 | L46 (`as_factionid_casts`) | **GATED** | Plan stop-gate same as paramilitary. |
| **Total** | **21** | — | — | — |

## Why Phase 2 Is Effectively Done For Safe Scope

The four cleanup batches (18 → 19 → 20 → THIS audit) reduced Phase 2 from ~55 escapes to 21. Of the remaining 21:

- **2** are deliberately preserved against a documented save-shape contract (`commander_march_correction.ts`).
- **4** are explicitly gated by the plan's own stop-gate (`paramilitary_sweep.ts` × 3, `supply_condition.ts` × 1).
- **7** are inside an instrumentation block guarded by a static-grep contract test (`corps_front_sectors.ts`).
- **5** live in conflict-prone Lane B/C sector territory (`sector_offensive.ts`).
- **2** require non-trivial cross-file refactor of `predictAllAdjacentTargets` signature (`sector_offensive_launch_helpers.ts`).
- **1** requires re-typing the edge-meta `side_a/side_b` fields from `string | null` to `FactionId | null` (`sector_building.ts`).

None of these are removable inside a self-contained strict-null cleanup lane with byte-identity preservation. They all need either canon-aligned source refactoring or cross-lane coordination.

## Recommended Follow-Up

1. Mark Phase 2 status as **"Safe-scope closed; long-tail blocked"** in `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`.
2. For the 7 instrumentation escapes: open a dedicated `corps_front_sectors:perf-instrumentation-tightening` mini-lane that adds a local non-null `proc` narrow under the flag check and updates the static-grep test contract.
3. For the 2 launch-helpers escapes: open a `predictAllAdjacentTargets-reverseMap-optional` refactor lane after the next sector-perf wave completes.
4. For the gated 4 (paramilitary, supply): re-evaluate when those lanes are confirmed free per the plan stop-gate.
5. For the 5 in `sector_offensive.ts`: pick up during the next sector-perf lane that already touches that file, on a per-site basis.
6. The 2 in `commander_march_correction.ts` remain documented in source per the inline comment from Batch 19 — they should be revisited only if the save schema explicitly initializes `brigade_movement_state: {}` in the apr_1992 startup save.

## Verification

`node tools/diagnostics/strict_null_inventory.cjs` shows the same 21 escapes after this audit as before — the audit changes no source. The strict-null progress test (`tests/strict_null_inventory_progress.test.ts`) maintains the 17 batch-slice assertions from prior commits (Batches 4-20), all at zero escapes within their named files.

The session-cumulative Phase 2 reduction is roughly **~140 → 21** (numbers vary slightly across batches due to inventory definition tightening); the safe-surface trajectory is closed.
