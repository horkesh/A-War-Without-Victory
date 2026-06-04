# Sector Performance Next Target Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

> **Status:** Current closeout 2026-06-04: `ensureMinimumSectorCoverage(...)` now reuses the target front OSID set, same-component donor filter, and active-count maps inside the zero-assigned territory-claim rescue path. See `docs/40_reports/implemented/20260604_SECTOR_ZERO_ASSIGNED_RESCUE_REUSE.md`. The earlier 2026-06-04 reachability-elision closeout remains historical evidence in `docs/40_reports/implemented/20260604_SECTOR_COVERAGE_REACHABILITY_ELISION.md`, and the prior 2026-06-03 component-cache closeout remains historical evidence in `docs/40_reports/implemented/20260603_SECTOR_COVERAGE_COMPONENT_CACHE.md`. This plan remains the active template for the next sector-performance pass: re-profile first, pick one remaining owner, and keep byte-identity gates.

> **Current clean pre-change baseline:** `41c72b13ad2e91b9` as of 2026-06-04. The zero-assigned rescue reuse slice preserved this hash and passed `validate_run_consistency` plus baseline regression. The prior `e086afbefcef01e6` sector-performance floor is superseded by the accepted final-sector seal correction from PR #159 / commit `1a823d5e`; current validation passes on `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n2019`, while the old `e086...` run now fails current consistency checks. The older `5d94adbfdb09bbda` and `f219401f4a17f311` comparison hashes remain superseded for this lane; use fresh profiling from current main before the next slice. After the zero-assigned slice, the largest sector children were `buildFactionSectors:RBiH`, `buildFactionSectors:RS`, `sealMergedSectorTruth:ensure-coverage`, and `ensureMinimumSectorCoverage:severe-rescue`.

**Goal:** Turn the sector reconstruction performance lane into one measured next-target implementation plan with byte-identity proof gates.

**Architecture:** Profile first, choose the hottest repeated child function from current evidence, then allow only single-call-frame caches or precomputed lookup maps scoped to one sector reconstruction invocation. Any hash drift is a stop condition, not an optimization result.

**Tech Stack:** TypeScript sector reconstruction code, `tools/perf/profile_scenario.ts`, existing perf report scripts, Vitest sector tests, baseline regression.

---

## Source Evidence

Existing plan: `docs/plans/2026-05-18-sector-reconstruction-performance-plan.md`.

Known historical evidence:
- Batch 6 identified `partition-corps-front-sectors`, `reconcile-final-sector-truth`, and `reconcile-final-sector-truth-after-ops` as dominant sector costs.
- Batch 8/9 narrowed an earlier candidate to `recoverDroppedFrontEdges:faction-front-claim-setup`, then Batch 9 implemented build-scoped reuse with a coldstart equivalence bypass.
- Batch 10 and later notes pointed the next target back toward `buildFactionSectors:RS/RBiH` and deeper `buildMultiSectorsForCorps(...)` / `buildSectorFromSubSegments(...)` attribution.

Do not assume those historical rankings still hold. Re-profile before choosing an implementation target.

## Scope

In scope:
- Refreshing current profile evidence on main.
- Selecting one next target function from measured candidates.
- Adding opt-in attribution if the measured target is too broad.
- Implementing one bounded optimization if and only if evidence points to a repeated, local computation.
- Proving output byte identity.

Out of scope:
- Cross-turn caches.
- Module-level mutable caches.
- Sector truth algorithm redesign.
- Changing sector packet ordering.
- Changing combat, operation, or brigade assignment semantics.

## Task 1: Refresh Current Performance Evidence

**Commands:**

```powershell
npm.cmd run sim:scenario:run:40w:timed
npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_next_target_profile --report data/derived/_debug/sector_next_target_profile_40w.json
$env:PERF_PROFILE_SECTOR_PARTITION='true'; npx.cmd tsx tools/perf/profile_scenario.ts --scenario data/scenarios/apr1992_definitive_40w.json --out runs_perf/sector_next_target_partition_profile --report data/derived/_debug/sector_next_target_partition_profile_40w.json
```

**Steps:**
1. Record final hash and run directory.
2. Record top 10 global timing buckets.
3. Record top 10 sector child labels.
4. Compare to the prior accepted 40w hash in `docs/plans/MASTER_ROADMAP.md`.

**Gate:** Stop if the final hash differs from current floor `41c72b13ad2e91b9` before any code change, or if sector reconstruction is no longer a top hotspot. If a later accepted engine-health fix deliberately changes final-sector truth, reconcile the hash and consistency evidence in roadmap/command-board/sector master before optimizing.

## Task 2: Select The Next Target

**Candidate priority order, subject to current measurements:**
1. `buildFactionSectors:RS` / `buildFactionSectors:RBiH` child work if still dominant.
2. `buildMultiSectorsForCorps(...)` internal repeated scans if profiling shows it.
3. `buildSectorFromSubSegments(...)` object construction or repeated sort/build work if profiling shows it.
4. `recoverDroppedFrontEdges(...)` only if it has re-emerged after Batch 9.

**Selection rules:**
- Pick one function family only.
- The candidate must be repeated across calls and have a local input set.
- The candidate must account for at least 10 percent of sector partition child time or be the highest repeated child after already-optimized paths.
- The implementation must have a cache-off or equivalence path if cache behavior is nontrivial.

**Acceptance:** The implementation report states why the chosen target outranks the others based on current numbers.

## Task 3: Add Opt-In Attribution If Needed

**Files:**
- Modify: `src/sim/combat/corps_front_sectors.ts`
- Modify or add focused instrumentation tests.

**Allowed attribution labels:**
- `buildFactionSectors:<faction>:front-edge-scan`
- `buildFactionSectors:<faction>:corps-claim-lookup`
- `buildMultiSectorsForCorps:<corps>:component-build`
- `buildMultiSectorsForCorps:<corps>:territory-bfs`
- `buildSectorFromSubSegments:<corps>:object-build`
- `buildSectorFromSubSegments:<corps>:sort-and-dedupe`

**Rules:**
- Attribution must be behind `PERF_PROFILE_SECTOR_PARTITION=true`.
- No profile values may enter save, reports consumed by game logic, or scenario truth artifacts.
- No timestamps or random values.
- Labels must be deterministic and sorted where emitted as JSONL groups.

**Verification:**

```powershell
npx.cmd vitest run tests/sector_partition_instrumentation.test.ts tests/profile_hotspot_report.test.ts --reporter=dot
```

**Gate:** Stop if attribution itself changes a baseline artifact.

## Task 4: Implement One Single-Call-Frame Cache

**Allowed patterns:**
- Cache scoped inside one `buildCorpsFrontSectors(...)` invocation.
- Precomputed sorted map derived from inputs already read in that invocation.
- Reuse of adjacency, ownership, or component facts already computed earlier in the same call.
- Environment-controlled coldstart bypass only if needed for equivalence tests.

**Disallowed patterns:**
- Module-level cache.
- Cross-turn cache.
- Cache keyed only by array length.
- Cache that stores mutable sector packet objects across reconstruction passes.
- Any change to `sector_id`, `edge_ids`, `sub_segments`, `territory_osids`, `assigned_brigade_ids`, `reserve_brigade_ids`, or `rear_brigade_ids` ordering.

**Required tests:**

```powershell
npx.cmd vitest run tests/sector_partition_buildCorpsFrontSectors_integration.test.ts --reporter=dot
npx.cmd vitest run tests/final_sector_truth_reconciliation_cache.test.ts tests/final_sector_truth_reconciliation.test.ts tests/war_phase_step_order.test.ts --reporter=dot
```

**Gate:** Revert if cached and uncached sector snapshots differ on any fixture.

## Task 5: Prove Byte Identity And Performance Direction

**Commands:**

```powershell
npm.cmd run typecheck
npm.cmd run sim:scenario:run:40w:timed
npm.cmd run test:baselines
git diff --check
```

**Artifact comparison:**
- `final_save.json`
- `run_summary.json`
- `weekly_report.jsonl`
- `end_report.md`

**Acceptance:** Baselines are byte-identical. Performance claim requires both the local profile and full timed run to move in the same direction. If wall-clock noise is inconclusive, report the optimization as byte-identical but performance-inconclusive.

## Stop Gates

- Stop on any hash drift.
- Stop if the measured target is not sector reconstruction.
- Stop if the optimization needs cross-turn memory.
- Stop if output ordering changes.
- Stop if implementation touches combat outcome math, operation selection, or brigade assignment semantics.
- Stop if the current profile contradicts the historical target.
