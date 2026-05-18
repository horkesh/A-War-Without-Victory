# Batch 21 — Autonomous Multi-Lane Closeout

**Date:** 2026-05-18
**Baseline:** Batch 20 / 40w n1897 `b14179d65639860c`
**Result:** Three lanes shipped — strict-null Phase 2 Batch 20 (18 escapes; Phase 2 39 → 21), sector reconstruction `normalizeFinalSectorBuckets` 4-child attribution, and sector reconstruction `sealMergedSectorTruth` 7-child attribution. 40w byte-identity preserved at `b14179d65639860c`.

## Summary

| Lane | Status | Net change |
|---|---|---|
| A — Strict-null Phase 2 Batch 20 | implemented | 18 inventory escapes removed across `attack_resolution_osid.ts`, `commander/emit.ts`, `commander/plan.ts`; Phase 2 remaining 39 → 21 |
| B — `normalizeFinalSectorBuckets` deeper attribution | implemented | 4 sidecar `_perfTime` children; evidence: `:friendly-universe` is 89% of normalize cost (1897ms / 2131ms parent); clear optimization target |
| C — `sealMergedSectorTruth` deeper attribution | implemented | 7 sidecar `_perfTime` children; evidence: `:ensure-coverage` is 72% of seal cost (2666ms / 3694ms attribution total); clear optimization target |
| D — Report + propagation + commit | this report | Parent docs updated; commit closes Batch 21 |

## Lane A: Strict-null Phase 2 Batch 20

| File | Escapes | Cleanup pattern |
|---|---:|---|
| `src/sim/combat/attack_resolution_osid.ts` | 8 | Dropped 6 redundant `as FactionId` casts on `f.faction` / `firstAttacker.faction` / `attackerFaction` / `(controller ?? attackerFaction)`; restructured `activeOp!.name` access via narrowed `executionOp` local; dropped `state.meta as any` since `ai_commander_config?` is typed on `StateMeta`. |
| `src/sim/combat/commander/emit.ts` | 6 | Replaced 6 `X as any` casts with bare `X` because `Osid = string` type alias makes `Map<Osid, V>.get(string)` directly assignable. |
| `src/sim/combat/commander/plan.ts` | 4 | Same `as any` → bare-string pattern. |
| **Total** | **18** | |

Phase 2 remaining inventory: 39 → **21** (final breakdown: `as_factionid_casts`: 6, `as_unknown_casts`: 2, `as_any_casts`: 2, `non_null_assertions_dot`: 9, `non_null_assertions_index`: 4 — of which 2 `non_null_assertions_index` are the deliberately preserved `commander_march_correction.ts` sites and 7 `non_null_assertions_dot` live in `corps_front_sectors.ts`).

## Lane B: `normalizeFinalSectorBuckets` Deeper Attribution

**Wrapped four phases** of the per-sector body in `_perfTime`:

| Label | Aggregate ms / 40w | Count | ms/call |
|---|---:|---:|---:|
| `normalizeFinalSectorBuckets:friendly-universe` | **1897.3** | 42227 | 0.045 |
| `normalizeFinalSectorBuckets:brigade-classify` | 110.2 | 42227 | 0.003 |
| `normalizeFinalSectorBuckets:write-back` | 88.8 | 42227 | 0.002 |
| `normalizeFinalSectorBuckets:reserve-band` | 86.1 | 42227 | 0.002 |
| Sum of children | 2182.4 | — | — |
| Parent (`applyFinalSectorOwnerTruthPass:normalize-buckets`) | 2131.0 | 335 | 6.36 |

The call count 42227 = 335 parent calls × ~126 sectors per call. **`:friendly-universe` dominates at 89% of normalize cost** — the per-sector `Object.entries(politicalControllers).filter(...).map(...)` rebuilds the same per-faction set ~42k times. Clear hoist target: precompute `friendlyUniverse` once per faction at the start of the function.

Wrappers use closure mutation (`nextAssigned`, `nextRear`, `reserveCandidates` declared outside `_perfTime` callbacks and mutated inside) so the per-sector data structures stay coherent across phase boundaries. Byte-identical at 40w `b14179d65639860c`.

## Lane C: `sealMergedSectorTruth` Deeper Attribution

**Wrapped seven helper-call sites** inside the per-faction loop:

| Label | Aggregate ms / 40w | Count | ms/call |
|---|---:|---:|---:|
| `sealMergedSectorTruth:ensure-coverage` | **2665.5** | 1502 | 1.78 |
| `sealMergedSectorTruth:rehome-unassigned` | 277.0 | 1502 | 0.18 |
| `sealMergedSectorTruth:absorb-unstaffed` | 222.4 | 1410 | 0.16 |
| `sealMergedSectorTruth:enforce-ownership` | 213.7 | 1502 | 0.14 |
| `sealMergedSectorTruth:reclassify-rear` | 150.9 | 1502 | 0.10 |
| `sealMergedSectorTruth:friendly-osids-and-components` | 100.6 | 1410 | 0.07 |
| `sealMergedSectorTruth:dedup-brigades` | 64.1 | 3004 | 0.02 |
| Sum of children | 3694.2 | — | — |
| Parent (`sealMergedSectorTruth:1–:5`) | 3721.3 | 470 | — |

Counts: `1410` = 5 passes × 3 factions × 94 turns. `1502` = same as `1410` plus the conditional `absorbed` block (~92 extra invocations across the run). `3004` = `dedup-brigades` is called twice per pass per faction. Overhead between parent total and children sum is 27ms (0.7%) — clean attribution.

**`:ensure-coverage` (which calls `ensureMinimumSectorCoverage(...)`) dominates at 72% of the seal cost.** Clear next-target candidate either for one more level of attribution or for byte-identical optimization.

## Lane B + C — Byte-identity Proof

Run: `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1898`
Final state hash: `b14179d65639860c` — matches Batch 17 baseline literally.

| Check | Result |
|---|---|
| 40w hash matches `b14179d65639860c` | yes |
| `node tools/validate_run_consistency.cjs runs/.../n1898` | PASS (13/13 checks; 3 pre-existing below-floor advisories unchanged) |
| run_summary anchors | 27/27 PASS |
| run_summary bot benchmarks | 6/6 PASS |
| `tests/sector_partition_instrumentation.test.ts` (15 tests) | PASS — includes new static contracts for `normalizeFinalSectorBuckets` and `sealMergedSectorTruth` |
| `tests/sector_partition_buildCorpsFrontSectors_integration.test.ts` etc. (6 files / 64 tests) | PASS |
| `npm.cmd run typecheck` | PASS |

Scenario expert verification: "GO. All three lanes (Lane A 18 escape removals, Lane B 4 sidecar wrappers, Lane C 7 sidecar wrappers) are confirmed runtime no-ops. Final state hash byte-identical to Batch 17, all anchors and bot benchmarks pass."

## Files Changed

| File | Lane | Change |
|---|---|---|
| `src/sim/combat/attack_resolution_osid.ts` | A | Dropped 6 redundant `as FactionId` casts; restructured `executionOp` local; dropped `state.meta as any`. |
| `src/sim/combat/commander/emit.ts` | A | Dropped 6 `as any` casts (target/probeTarget/osid/reachabilityObjectiveOsid passed to `Map<Osid, ...>.get`). |
| `src/sim/combat/commander/plan.ts` | A | Dropped 4 `as any` casts (same pattern). |
| `src/sim/combat/corps_front_sectors.ts` | B + C | Wrapped 4 inner phases of `normalizeFinalSectorBuckets(...)` and 7 inner helpers of `sealMergedSectorTruth(...)` with `_perfTime`. |
| `tests/strict_null_inventory_progress.test.ts` | A | Added `PHASE_2_COMBAT_BATCH_20_FILES` slice and `cleans the Batch 20 Phase 2 combat continuation slice` assertion (`toBe(0)`). |
| `tests/sector_partition_instrumentation.test.ts` | B + C | Added two new `static contract:` tests for the two function-bodies' label sets. |
| `docs/plans/2026-05-17-strict-null-checks-migration-phases.md` | A | Phase 2 remaining count 39 → 21. |
| `docs/40_reports/SECTOR_MASTER.md` | B + C | Header date update + Batch 21 entry with profile evidence and dual next-target identification. |
| `docs/40_reports/audits/20260518_MASTER_BACKLOG_EXECUTION_QUEUE.md` | D | Batch 21 row. |
| `docs/PROJECT_LEDGER.md` | D | Batch 21 entry. |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | D | Durable rule for closure-mutation attribution wrappers. |
| `.claude/napkin.md` | D | Batch 21 entry. |
| `docs/40_reports/implemented/20260518_BATCH21_AUTONOMOUS_MULTI_LANE.md` | D | This report. |

Plus the Batch 20 post-commit verification footer added to `docs/40_reports/implemented/20260518_BATCH20_AUTONOMOUS_MULTI_LANE.md` (carried in this commit).

## Next Targets

1. **Sector perf Batch 22 (clear optimization)**: hoist `friendlyUniverse` construction in `normalizeFinalSectorBuckets(...)` out of the per-sector loop into a per-faction precompute. Evidence-backed at 89% of `:normalize-buckets` cost. Behavior-preserving by construction since each sector's `friendlyUniverse` is a function of `sector.faction` alone.
2. **Sector perf Batch 22 (deeper attribution)**: drill into `ensureMinimumSectorCoverage(...)` for the next level of `sealMergedSectorTruth:ensure-coverage` attribution (2666ms / 1502 calls = 1.78ms/call).
3. **Strict-null Phase 2**: 21 remaining combat escapes. Of those: 7 `non_null_assertions_dot` in `corps_front_sectors.ts` (Lane B/C territory), 5 in `sector_offensive.ts` and 1 in `sector_building.ts` (Lane B/C-adjacent), 3 in `paramilitary_sweep.ts` (gated), 1 in `supply_condition.ts` (gated). Remaining clean candidates: `sector_offensive_launch_helpers.ts` (2 `as_unknown_casts`) plus a few stragglers in `attack_history_recording.ts` / `attack_retreat_displacement.ts` / `front_emergence.ts`-adjacent files that should be re-verified — Phase 2 may be entering the long-tail stage where most remaining escapes are inside currently-active lane territory.
