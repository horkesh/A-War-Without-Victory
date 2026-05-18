# Batch 20 — Autonomous Multi-Lane Closeout

**Date:** 2026-05-18
**Baseline:** Batch 19 / 40w n1895 `b14179d65639860c`
**Result:** Three lanes landed: strict-null Phase 2 Batch 19 (16 escapes, 55 → 39), sector reconstruction `applyFinalSectorOwnerTruthPass` 5-child deeper attribution (byte-identical at `b14179d65639860c`), and `apr1992_52w` baseline regression refresh closing a pre-existing accumulated-feature drift.

## Summary

| Lane | Status | Net change |
|---|---|---|
| A — Strict-null Phase 2 Batch 19 | implemented | 16 inventory escapes removed across 6 combat files; Phase 2 remaining 55 → 39 |
| B — Sector reconstruction `applyFinalSectorOwnerTruthPass` deeper attribution | implemented | 5 sidecar `_perfTime` children added; byte-identical 40w hash `b14179d65639860c`; new evidence shows `:normalize-buckets` at 2014ms / 335 calls is the next optimization target |
| C — `apr1992_52w` baseline regression refresh | implemented | All four `apr1992_52w` artifact hashes refreshed; partial `baseline_ops_4w` / `noop_4w` refresh for `formation_delta.json` + `run_summary.json`; `npm.cmd run test:baselines` PASSES across all three scenarios |
| D — Integrated report + parent propagation + commit | this report | Parent docs updated, single commit at the end |

## Lane A: Strict-null Phase 2 Batch 19

**Plan source:** `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`

### Slice selection

Phase 2 had 55 remaining combat escapes after Batch 18. Stop-gates exclude paramilitary, supply, fatigue (conflict-prone) and sector files (Lane B territory). Batch 19 targets six files outside those gates:

| File | Escapes removed | Pattern |
|---|---:|---|
| `src/sim/combat/bot_brigade_ai_osid.ts` | 3 | Inlined `Array.isArray(op.axes)` narrowing in `getBrigadeAxis` / `isOperationParticipant` so `op.axes!` becomes `axes`; removed redundant `f.faction as FactionId` cast. |
| `src/sim/combat/bot_brigade_eval_front.ts` | 2 | Captured `assignedSector.territory_osids ?? []` and `state.military.brigade_movement_orders` into locals to drop `assignedSector!` and the `state.military.brigade_movement_orders!` index access. |
| `src/sim/combat/officer_system.ts` | 3 | Inline string-literal type guard for `o.faction` in `validateOfficerData` (removed the parallel `validFactions` array and an `as unknown[]` cast that `Array.isArray` already narrows). Dropped `corpsFormation.faction as FactionId` cast. |
| `src/sim/combat/operation_preparation.ts` | 2 | Typed `attackerFaction: FactionId = attackerFormations[0]!.faction \|\| 'RBiH'`, eliminating two downstream `as FactionId` casts at `collectObjectiveApproachOsids` call sites. |
| `src/sim/combat/osid_column_movement.ts` | 4 | Tightened `ms.path` narrowing to `ms.path && ms.path.length >= 2`; dropped two `f.faction as FactionId` casts. |
| `src/sim/combat/commander_march_correction.ts` | 2 | Dropped redundant `controller as FactionId` casts inside the `Object.entries(pc)` loop in `correctMarchOrders`. |
| **Total** | **16** | |

### Deliberately NOT changed

`commander_march_correction.ts` was inspected for two further `non_null_assertions_index` escapes at `delete state.military.brigade_movement_state![bid]` (lines 184, 189). An initial auto-init pattern `if (!state.military.brigade_movement_state) state.military.brigade_movement_state = {};` was prototyped and reverted because `brigade_movement_state` is absent from `data/derived/startup/apr_1992_initial_save.json` and adding the idempotent init would have shifted the serialized save shape from `undefined` to `{}` on turn 0. The two escapes remain inventory-counted; byte-identity preserved.

### Lane A verification

```
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot
```
16/16 tests PASS (including new Batch 19 slice with `expect(currentTotal).toBe(0)`).

```
npx.cmd vitest run tests/commander/commander.test.ts tests/officer_system.test.ts
  tests/osid_column_movement.test.ts tests/sarajevo_siege_params_integration.test.ts
  tests/corps_operation_readiness.test.ts tests/combat_front_emergence.test.ts
  tests/emergence_front_emergence.test.ts tests/emergence_pipeline_integration.test.ts
  tests/strict_null_inventory_progress.test.ts --reporter=dot
```
9 files / 165 tests PASS.

`npm.cmd run typecheck` clean.

## Lane B: Sector Reconstruction `applyFinalSectorOwnerTruthPass` Deeper Attribution

**Plan source:** `docs/plans/2026-05-18-sector-reconstruction-performance-plan.md`

### Profile-driven target selection

After Batch 19 retired the staffability-filter O(N²) sharedPool rebuild, a fresh `PERF_PROFILE_SECTOR_PARTITION=true` 40w profile (n1896) showed the next-largest un-attributed parents:

| Parent label | Aggregate ms / 40w | Notes |
|---|---:|---|
| `applyFinalSectorOwnerTruthPass:1` | 808.5 | called 94× |
| `applyFinalSectorOwnerTruthPass:2` | 744.2 | called 94× |
| `applyFinalSectorOwnerTruthPass:3` | 437.1 | called 53× (sparse) |
| `applyFinalSectorOwnerTruthPass:4` | 758.1 | called 94× |
| `applyFinalSectorOwnerTruthPass:1-4` total | **2747.9** | 335 invocations across 40w |
| `sealMergedSectorTruth:1-5` total | ~3700 | 5 inner helpers per faction-loop |

`applyFinalSectorOwnerTruthPass` was picked because its 4-helper inner structure (5 perf labels) attributes cleanly without faction-loop interleaving.

### Attribution

Wrapped the five inner helpers with `_perfTime`:

```typescript
_perfTime('applyFinalSectorOwnerTruthPass:relocate-misassigned', () => relocateMisassignedBrigadesToTruthfulOwners(...));
// inside per-faction loop:
const friendlyOsids = _perfTime('applyFinalSectorOwnerTruthPass:friendly-osids', () => buildFriendlyOsidsFromState(...));
_perfTime('applyFinalSectorOwnerTruthPass:rehome-unassigned', () => rehomeUnassignedBrigadesToPhysicalSectorOwners(...));
_perfTime('applyFinalSectorOwnerTruthPass:rescue-adjacent', () => rescueAdjacentLiveOwnersForEmptyFrontSectors(...));
_perfTime('applyFinalSectorOwnerTruthPass:normalize-buckets', () => normalizeFinalSectorBuckets(...));
```

Behavior is unchanged — pure attribution. Added a `static contract: applyFinalSectorOwnerTruthPass has deterministic child attribution labels` test in `tests/sector_partition_instrumentation.test.ts` enforcing the five label literals and the absence of `timestamp` / `Date.now` / `new Date` / `performance.now` in the function body.

### Post-attribution evidence (n1897)

| Label | Aggregate ms / 40w | Count | ms/call |
|---|---:|---:|---:|
| `applyFinalSectorOwnerTruthPass:normalize-buckets` | **2013.9** | 335 | 6.01 |
| `applyFinalSectorOwnerTruthPass:relocate-misassigned` | 323.7 | 335 | 0.97 |
| `applyFinalSectorOwnerTruthPass:rehome-unassigned` | 168.0 | 1005 | 0.17 |
| `applyFinalSectorOwnerTruthPass:friendly-osids` | 146.5 | 1005 | 0.15 |
| `applyFinalSectorOwnerTruthPass:rescue-adjacent` | 82.6 | 1005 | 0.08 |
| Sum of children | 2734.7 | — | — |
| Parent (`:1`–`:4`) | 2747.9 | 335 | — |

`normalizeFinalSectorBuckets` accounts for **73% of the parent total** (2013.9 / 2747.9 ms). Children with 1005 calls (= 335 passes × 3 factions) are individually small. The next sector-perf batch should descend into `normalizeFinalSectorBuckets(...)` for either a byte-identical optimization or one more level of attribution.

### Lane B byte-identity proof

Run: `runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1897`
Final state hash: `b14179d65639860c` — **matches Batch 17 baseline literally** (same as Batch 19 hash).

| Check | Result |
|---|---|
| 40w final_state_hash matches `b14179d65639860c` | yes |
| `node tools/validate_run_consistency.cjs runs/.../n1897` | PASS (14/14 invariants; three pre-existing benign sector-floor advisories unchanged) |
| run_summary anchors | 27/27 PASS |
| run_summary bot benchmarks | 6/6 PASS |
| `tests/sector_partition_instrumentation.test.ts` | 13/13 PASS (including new static contract for `applyFinalSectorOwnerTruthPass` labels) |
| `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/sector_frontline_truth.test.ts tests/final_sector_truth_reconciliation_cache.test.ts tests/final_sector_truth_reconciliation.test.ts tests/war_phase_step_order.test.ts` | 49/49 PASS |
| `npm.cmd run typecheck` | PASS |

Scenario expert verification: "GO for byte-identity. Lane A (16 strict-null escape removals) and Lane B (5 sidecar `_perfTime` wrappers) are confirmed pure no-op transforms at the simulation layer. Final state hash is byte-identical to Batch 17, every consistency invariant holds, anchors and benchmarks match prior calibration-flat band."

## Lane C: `apr1992_52w` Baseline Regression Refresh

### Drift diagnosis

`npm.cmd run test:baselines` failed on `apr1992_52w/activity_summary.json` (expected `c29e296b…`, actual `6033b0b0…`). Drift was confirmed pre-existing in Batch 19 (same actual hash reproduced on a clean tree with all my Batch 19 changes stashed). After my Batch 20 Lane A + B changes, the same actual hash persisted, confirming Lane A + B introduced no additional drift.

Scenario expert investigation found:
- All 27/27 anchors PASS, 6/6 bot benchmarks PASS for the current 52w output.
- Casualty ratio 0.59 in canon band, RS expansion 0.514 vs 0.553 historical on-target.
- 21 anomalies detected: 1 critical (pre-existing class — disconnected sector territory in `hvo_tomislavgrad:2`), 9 warnings (pre-existing HVO Tomislavgrad dead front + density imbalance), 11 info. No regression flags.
- Drift traces to cumulative intentional behavior changes since the last manifest hash refresh at commit `6cce9b40`: `feat(sim): wire logistics priority and harden saves`, `feat(sim): add negotiation counters and Sarajevo overrides`, `feat(sim): close supply paramilitary and fatigue lanes`, `feat(sim): close alliance and supply closure lanes`, `feat(operations): add Kupres Cincar Mistral opportunities`.

Expert recommendation: REFRESH the baseline manifest.

### Surgical refresh

Initial attempt used `UPDATE_BASELINES=1 npm.cmd run test:baselines`, but that flag also EXPANDED the manifest artifact list from 4 to 7 (added `end_report.md`, `final_save.json`, `weekly_report.jsonl`), undoing the deliberate trim from commit `bf8f6246 chore(tests): test usefulness review Phase 1 — delete 10 static-grep contract tests + trim baseline manifest to platform-stable artifacts`.

Reverted that expansion and manually wrote a surgical manifest update preserving the 4-artifact trim:

| Scenario | activity_summary | control_delta | formation_delta | run_summary |
|---|---|---|---|---|
| `apr1992_52w` | c29e296b… → 6033b0b0… | 32abce26… → 3fe82c40… | d9ee2181… → 990c59e8… | 4623966a… → 94ba1162… |
| `baseline_ops_4w` | unchanged | unchanged | d9ee2181… → a741ff0b… | c41393f7… → 01200f12… |
| `noop_4w` | unchanged | unchanged | d9ee2181… → a741ff0b… | 513b0a0c… → 4da47bd5… |

The `baseline_ops_4w` and `noop_4w` drift was masked previously by the 52w short-circuit (the regression test exited on the first scenario failure). All three scenarios now pass.

```
$ npm.cmd run test:baselines
...
Baseline regression: all scenarios match.
```

## Files Changed

| File | Lane | Change |
|---|---|---|
| `src/sim/combat/bot_brigade_ai_osid.ts` | A | Inlined `Array.isArray(op.axes)` narrowing; dropped 1 `as FactionId` cast. |
| `src/sim/combat/bot_brigade_eval_front.ts` | A | Captured locals to drop `assignedSector!` and `state.military.brigade_movement_orders!`. |
| `src/sim/combat/commander_march_correction.ts` | A | Dropped 2 redundant `as FactionId` casts; intentionally preserved 2 `state.military.brigade_movement_state![bid]` sites to keep save-shape identical. |
| `src/sim/combat/officer_system.ts` | A | Inline string-literal type guard for `o.faction`; removed `validFactions` array; dropped `as unknown[]` after `Array.isArray` narrowing; dropped 1 `as FactionId` cast. |
| `src/sim/combat/operation_preparation.ts` | A | Typed `attackerFaction: FactionId` at declaration; dropped 2 downstream `as FactionId` casts. |
| `src/sim/combat/osid_column_movement.ts` | A | Tightened `ms.path && ms.path.length >= 2` narrowing; dropped 2 `as FactionId` casts. |
| `src/sim/combat/corps_front_sectors.ts` | B | Wrapped 5 inner calls in `applyFinalSectorOwnerTruthPass(...)` with `_perfTime` for `relocate-misassigned`, `friendly-osids`, `rehome-unassigned`, `rescue-adjacent`, `normalize-buckets`. |
| `tests/strict_null_inventory_progress.test.ts` | A | Added `PHASE_2_COMBAT_BATCH_19_FILES` slice (5 files) and `cleans the Batch 19 Phase 2 combat continuation slice` assertion. |
| `tests/sector_partition_instrumentation.test.ts` | B | Added `static contract: applyFinalSectorOwnerTruthPass has deterministic child attribution labels` test for the 5 new labels. |
| `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` | A | Phase 2 remaining count 55 → 39; added Batch 19 ledger entry with cleanup-pattern catalog and `correctTransitStates` auto-init non-decision rationale. |
| `docs/40_reports/SECTOR_MASTER.md` | B | Header date update; added Batch 20 entry with profile evidence table and next-target identification. |
| `data/derived/scenario/baselines/manifest.json` | C | Refreshed `apr1992_52w` (4 hashes) + `baseline_ops_4w` / `noop_4w` (2 hashes each); preserved 4-artifact trim from `bf8f6246`. |
| `docs/40_reports/implemented/20260518_BATCH20_AUTONOMOUS_MULTI_LANE.md` | D | This report. |

## Verification Summary

| Command | Result |
|---|---|
| `git status --short` (session start) | clean |
| `npm.cmd run typecheck` | PASS |
| `git diff --check` | clean (CRLF normalization warnings only) |
| `npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot` | 16/16 PASS |
| `npx.cmd vitest run tests/commander/commander.test.ts tests/officer_system.test.ts tests/osid_column_movement.test.ts tests/sarajevo_siege_params_integration.test.ts tests/corps_operation_readiness.test.ts tests/combat_front_emergence.test.ts tests/emergence_front_emergence.test.ts tests/emergence_pipeline_integration.test.ts --reporter=dot` | 165/165 PASS |
| `npx.cmd vitest run tests/sector_partition_instrumentation.test.ts tests/sector_partition_buildCorpsFrontSectors_integration.test.ts tests/sector_frontline_truth.test.ts tests/final_sector_truth_reconciliation_cache.test.ts tests/final_sector_truth_reconciliation.test.ts tests/war_phase_step_order.test.ts --reporter=dot` | 62/62 PASS |
| `PERF_PROFILE_SECTOR_PARTITION=true npm.cmd run sim:scenario:run:40w:timed` | n1896 hash `b14179d65639860c` (pre-Lane-B profile) |
| `PERF_PROFILE_SECTOR_PARTITION=true npm.cmd run sim:scenario:run:40w:timed` | n1897 hash `b14179d65639860c` (post-Lane-B profile, byte-identical) |
| `node tools/validate_run_consistency.cjs runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1897` | PASS |
| `npm.cmd run test:baselines` | PASS across all three scenarios after manifest refresh |

## Post-Commit Verification (HEAD `2d66de92`)

| Command | Result |
|---|---|
| `git log --oneline -3` | HEAD = `2d66de92` (this batch) |
| `git status --short` | clean |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run desktop:map:build` | PASS (16.64s) |
| `npm.cmd run test:baselines` | PASS across all 3 regression scenarios |

## Next Targets

1. **Strict-null Phase 2** has 39 remaining combat escapes across `attack_resolution_osid.ts` (8), `commander/emit.ts` (6), `commander/plan.ts` (4), `corps_front_sectors.ts` (7 — Lane B territory), `commander_march_correction.ts` (2 preserved for save-shape contract), `paramilitary_sweep.ts` (3 — gated), `sector_*` (8 — Lane B territory), `supply_condition.ts` (1 — gated). Clean next-slice candidates: `attack_resolution_osid.ts`, `commander/emit.ts`, `commander/plan.ts`.
2. **Sector perf Batch 21** should drill into `normalizeFinalSectorBuckets(...)` (2014ms / 335 calls / 6ms per call), either as one more level of sidecar attribution or as a byte-identical optimization once the inner hotspot is identified.
3. **`sealMergedSectorTruth:1-5`** (~3700ms aggregate) remains the other un-attributed sector parent; six inner helpers per faction-loop. Candidate for a future deeper-attribution batch.
