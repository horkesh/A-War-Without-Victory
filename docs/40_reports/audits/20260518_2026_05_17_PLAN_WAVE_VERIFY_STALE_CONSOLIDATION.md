# 2026-05-17 Plan Wave — Verify-Stale Consolidation

**Date:** 2026-05-18
**Status:** Consolidated post-2026-05-17-implementation-wave audit. Marks all confirmed-implemented plans as verify-stale and lists the genuinely-open lanes.

## Background

The 2026-05-17 implementation wave (per `docs/PROJECT_LEDGER.md` "14-plan batch + research synthesis" entry) authored execution-grade plans for the previously-unplanned backlog. The wave then implemented or partially-implemented most of the plans across 2026-05-17 and 2026-05-18 batches. This session (2026-05-18, Batches 19-30) added several follow-on sector-perf and strict-null batches and incidentally rediscovered that several plans are already done.

This audit consolidates the verify-stale findings so future sessions can start from the genuinely-open list.

## Verified-Stale Plans (Implementation Complete)

Each row cites the canonical evidence on disk.

| Plan | Implementation evidence | Per-plan audit |
|---|---|---|
| `2026-05-17-ci-test-feedback-loop-plan.md` | All 7 tasks: `src/scenario/historical_anchors.ts` + `tests/scenario_anchor_contract.test.ts` + `test:vitest:scenario:anchors` npm script + `.github/workflows/baseline-regression.yml` `scenario-anchors` job + `docs/20_engineering/CI_TRIAGE_PLAYBOOK.md`. | `docs/40_reports/audits/20260518_CI_TEST_FEEDBACK_LOOP_AUDIT.md` (Batch 28). |
| `2026-05-17-bcs-localization-plan.md` | All 6 tasks: `src/ui/map/i18n/{messages.en.ts, messages.bcs.ts, index.ts}` (188 lines total) + `SettingsScreen.tsx` language selector + `tests/ui_i18n.test.ts` (6/6 PASS). | `docs/40_reports/audits/20260518_BCS_LOCALIZATION_VERIFY_STALE.md` (Batch 29). |
| `2026-05-17-roadmap-plan-coverage-closure.md` | Coverage matrix matches all 42 referenced plan files; `docs/plans/MASTER_ROADMAP.md` cites the matrix 4×. | THIS doc + path-existence scan recorded under Batch 28's audit. |
| `2026-05-17-endgame-188w-verification-plan.md` | Status ACCEPTED-WITH-SIGNALS at hash `ccd3f9f770052614` (n1844, 6.74 MB final save, 26/27 anchors, 6/6 benchmarks). All 5 diagnostic tools exist (`sarajevo_casualty_railroad.cjs`, `patron_pressure_probe.cjs`, `p0_latent_recheck.cjs`, `force_quality_trajectory.cjs`, `reconstitution_188w_checkpoints.cjs`). | `docs/40_reports/audits/20260517_ENDGAME_188W_VERIFICATION.md` (167 lines, authored 2026-05-17). |
| `2026-05-17-telemetry-crash-reporting-plan.md` | `docs/40_reports/implemented/20260518_TELEMETRY_LOCAL_FIRST_CRASH_DIAGNOSTICS.md` cites local-first crash diagnostics as the implementation. Predecessor work in `20260507_D2_TELEMETRY_WIRE_FIX.md` and `20260506_C2_CORPS_DIRECTIVE_TELEMETRY_SURFACE.md`. | Individual audit not authored — recommend marking IMPLEMENTED via this consolidation. |
| `2026-05-17-performance-wall-clock-followup-plan.md` | Four implementation reports under `docs/40_reports/implemented/`: `20260510_BOT_ORDERS_WALL_CLOCK_PROFILE.md`, `20260517_PERFORMANCE_WALL_CLOCK_TIMING_SPLIT.md`, `20260518_PERFORMANCE_WALL_CLOCK_TARGET_TRUTH_REPORT.md`, `20260518_PERFORMANCE_WALL_CLOCK_BATCH6_MEASURED_FOLLOWUP.md`. Extended by this session's Batches 22 + 25 (−1808 ms + −662 ms = ~2.5 s saved on 40w simulation bucket, byte-identical at `b14179d65639860c`). | Individual audit not authored — recommend marking IMPLEMENTED via this consolidation. |
| `2026-05-17-diplomacy-panel-plan.md` | `src/ui/map/components/DiplomacyPanel.tsx` exists. Implementation report: `docs/40_reports/implemented/20260517_DIPLOMACY_PANEL.md`. Predecessors at `20260402_DIPLOMACY_SHELL_PLAYER_LANGUAGE.md` and `20260407_V08TO09_DIPLOMACY_MODAL_BOUNDARY_AUDIT.md`. | Individual audit not authored — recommend marking IMPLEMENTED via this consolidation. |

This consolidation closes the verify gap on **7 plans** in one document.

## Strict-Null Phase 2 — Safe Scope Closed

Separate audit at `docs/40_reports/audits/20260518_STRICT_NULL_PHASE2_LONG_TAIL_CLASSIFICATION.md` (Batch 30) records that Phase 2 reached the safe-cleanup floor at **21 escapes remaining** across 7 files, all classified as deliberately-preserved / load-bearing / gated / cross-file-refactor. Phase 2 status moved from "In progress" to "Safe-scope CLOSED" in the plan ledger.

## Genuinely Open Lanes (As Of 2026-05-18)

These are the lanes that **are not yet** done and are tractable in future sessions:

### Solo-tractable (require no external clearance)

| Lane | Why open | Suggested approach |
|---|---|---|
| **Sector-perf next deeper attribution** | Two unfactored children remain in attributed structures: `:floor-completion` 696ms (failed hoist Batch 27, needs alternative angle), `:severe-relief` 115ms. Possible value: ~100-300ms saving per byte-identical optimization, applying the Batch 22/25 pattern carefully. | Avoid `activeCounts` hoist on `:floor-completion` (Map-sparseness lesson). Try `:severe-relief` instead, or hoist a different repeated rebuild (e.g., `getSectorComponent` per-recipient calls). |
| **Sector-perf: `recoverDroppedFrontEdges:1+2`** (1559+1352 ms aggregate at the start of the session) | Per the original Batch 6 plan baseline, these are the next-largest aggregate parents under sector-reconstruction work. Not yet attributed. | Read `recoverDroppedFrontEdges` body; add deterministic child labels via the existing `_perfTime` test-contract pattern; then optimize the inner hot loop. |
| **`sealMergedSectorTruth:1-5` children with measured per-pass numbers** | Batch 21 added 7 inner labels but didn't split by pass-number. The five wrapping `sealMergedSectorTruth:1..:5` parent calls vary in cost (888/672/684/780/697 ms in Batch 21 evidence) — could find pass-specific hotspots. | Either split by pass-suffix (`:1:dedup`, `:2:dedup`, etc.) or accept that the cross-pass aggregate is sufficient for current optimization decisions. |
| **Replay/serialization wall-clock follow-up** | The original wall-clock target-truth report flagged `replay/final-save serialization` as top wall-clock boundary alongside sector/map work. Not yet drilled into this session. | New plan needed; outside sector-perf scope. |

### Gated / blocked solo

| Lane | Block reason |
|---|---|
| HRHB patron directive scope | Explicit user-gate per memory (sensitive-history). |
| Sensitive-content notification review (Phase D 20 rows / 102 blocks) | Needs historian / narrative-designer review. |
| Officer character mini-bio | Needs historian sign-off. |
| Soundscape integration / kickoff | Needs audio assets. |
| Marketing / store / gold-gate / clean-VM finalization | Operator-owned. |
| `apr1992_52w` re-investigation if baseline-refresh assumption proves wrong | Carried forward as a separate scenario-fixture lane (Batch 20). |

## Recommended Next-Session Approach

1. Sector-perf: pick from the "solo-tractable" table above. The `recoverDroppedFrontEdges:1+2` parents (~2.9 s combined) are the highest-value untouched attribution target.
2. Don't repeat verify-stale audits for the 7 plans listed above unless new evidence suggests regression.
3. If pivoting away from sector-perf, the genuinely-fresh work is in the gated/operator/asset lanes — these need the user's clearance or external inputs and shouldn't be picked up autonomously.

## Session Bookkeeping

This document also updates the plan ledger pointer state implicitly: any future grep for "verify-stale" in this repo should find this consolidation at the top of the implementation status for the 2026-05-17 wave.

The plan files themselves are NOT edited in this audit. Marking them IMPLEMENTED in `docs/plans/MASTER_ROADMAP.md` or `docs/40_reports/CONSOLIDATED_BACKLOG.md` is a separate doc-maintenance action and is recommended but out of this audit's write scope.
