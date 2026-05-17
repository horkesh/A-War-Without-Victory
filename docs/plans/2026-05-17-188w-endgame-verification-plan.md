# 188w Endgame Verification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Produce a fresh, reproducible 188-week endgame proof and decide whether the current line is accepted baseline, diagnostic evidence, or a blocker follow-up.

**Architecture:** Run current canonical scenario, capture hash and diagnostics, compare painted control, and update calibration/endgame reports without changing sim behavior.

**Tech Stack:** Scenario runner, diagnostics scripts, painted-control compare tools, Markdown evidence reports.

---

## Files

- `docs/40_reports/ENGINE_HEALTH_AUDIT_n1842_2026-05-16.md`
- `docs/40_reports/CALIBRATION_MASTER.md`
- `docs/plans/2026-05-16-engine-health-n1842-plan.md`
- `src/sim/war_termination.ts`
- `src/sim/endgame/endgame_snapshot.ts`
- `src/scenario/scenario_end_report.ts`
- `tools/scenario_runner/run_baseline_regression.ts`
- `tools/compare_painted_vs_sim.cjs`

## Implementation Tasks

1. Run a fresh 188w scenario from clean `main` and record run directory, command, final hash, final-save size, and elapsed time.
2. Run sector truth, scenario diagnostics, operation delivery, sensitive-history status, and painted-control comparisons for `apr1994`, `apr1995`, and `oct1995`.
3. Add or extend report-contract tests for final `meta.game_over`, frozen endgame snapshot, end-report supply condition, and watched-operation status rows if the evidence path exposes missing fields.
4. Compare current hash and diagnostic deltas against n1741/n1842/n1844 evidence and label each difference as expected, explained drift, or blocker.
5. Decide whether endgame baseline is accepted, accepted-with-known-gaps, or blocked; document the decision with exact evidence paths.
6. Update roadmap/backlog status and ledger.

## Verification

- `npm.cmd run typecheck`
- `npm.cmd run test:vitest:scenario:anchors`
- `npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --out runs`
- `tsx.cmd tools/scenario_runner/audit_sector_truth.ts <run-dir>\final_save.json`
- `node tools/compare_painted_vs_sim.cjs <run-dir> --target oct1995`

## Documentation And Ledger

- Update `docs/40_reports/CALIBRATION_MASTER.md`.
- Update or append an engine-health/endgame evidence report under `docs/40_reports/`.
- Add `docs/PROJECT_LEDGER.md` evidence entry.

## Stop Gates

- Stop if an identical-config rerun changes hash.
- Stop if `oct1995` painted match drops materially without a documented cause.
- Stop for design review if sensitive-history enclave capture newly delivers and changes accepted historical interpretation.
