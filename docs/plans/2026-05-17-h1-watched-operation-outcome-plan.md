# H1 Watched Operation Outcome Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close the remaining H1 gap where Krivaja-95, Stupcanica-95, and Cerska-Kamenica do not appear as watched-operation delivery or blocker outcomes after defender-aware launch feasibility shipped.

**Architecture:** Do not loosen sensitive-history preconditions. First prove whether the watched operations are missing because catalog injection fails, AAR extraction misses them, or delivery remains impossible after launch. Then patch only the failing owner and keep all sensitive-history outcomes behind explicit diagnostics and sign-off.

**Tech Stack:** TypeScript simulation code, existing diagnostics in `tools/diagnostics/`, Vitest, 188w scenario runner.

---

## Scope

This is a follow-up to `docs/plans/2026-05-16-engine-health-n1842-plan.md` Track H1 and `docs/40_reports/implemented/20260516_OPERATION_LAUNCH_FEASIBILITY_BLOCKERS.md`.

In scope:
- Watched-operation injection/catalog visibility for Krivaja-95, Stupcanica-95, Cerska-Kamenica.
- AAR/report visibility for watched operations and typed blockers.
- Delivery uplift investigation only after visibility is proven.

Out of scope:
- Relaxing rupture, enclave, or sensitive-history conditions without user sign-off.
- Generic operation-balance retunes.
- OOB/paint-anchor edits unless a dedicated canon review authorizes them.

## Task 1: Add a Watched-Operation Trace Fixture

**Files:**
- Modify: `tools/diagnostics/sensitive_history_status.cjs`
- Modify: `tests/sensitive_history_status_diagnostic.test.ts`
- Create: `tests/fixtures/sensitive_history_watched_operations/*.json` if no compact fixture exists.

**Steps:**
1. Write a failing test where a compact run artifact includes one watched operation with `delivery_status: "blocked"` and a typed blocker.
2. Run `npx.cmd vitest run tests\sensitive_history_status_diagnostic.test.ts`.
3. Extend the diagnostic to report watched-operation presence separately from capture delivery.
4. Rerun the focused test.

**Acceptance:** Diagnostic output distinguishes `missing`, `blocked`, `delivered`, and `aar_not_visible`.

## Task 2: Trace Catalog Injection

**Files:**
- Inspect: `src/sim/combat/triggered_operations.ts`
- Inspect: `src/sim/combat/sector_offensive.ts`
- Test: `tests/triggered_operations_late_1995.test.ts`
- Test: `tests/operation_launch_feasibility_defender_aware.test.ts`

**Steps:**
1. Add a red test proving each watched operation reaches either spawn, blocker, or explicit not-eligible status for its canonical window.
2. Run the two focused suites.
3. Patch only the missing catalog/injection edge if a watched op silently disappears.
4. Rerun focused suites.

**Acceptance:** Every watched operation emits a deterministic status row during its watched window.

## Task 3: AAR Visibility

**Files:**
- Modify: `src/scenario/scenario_end_report.ts`
- Modify: `src/scenario/scenario_reporting.ts`
- Test: add/extend `tests/scenario_reporting_contracts.test.ts` if needed.

**Steps:**
1. Add a failing report-contract test: a watched blocked operation must appear in end-report text/data with its blocker.
2. Implement report projection from the canonical operation status, not from prose scraping.
3. Rerun focused report tests.

**Acceptance:** End report can show "watched operation missing", "blocked by defender power", or "delivered" without implying a false historical outcome.

## Task 4: Scenario Proof and Sign-Off

**Commands:**
- `npm.cmd run typecheck`
- `npx.cmd vitest run tests\sensitive_history_status_diagnostic.test.ts tests\triggered_operations_late_1995.test.ts tests\operation_launch_feasibility_defender_aware.test.ts`
- `npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --out runs`
- `node tools\diagnostics\sensitive_history_status.cjs <new-run-dir>`

**Acceptance:**
- If a watched operation delivers a capture, stop for user sensitive-history sign-off before commit.
- If all watched operations are blocked, blockers must be typed and reported.
- If operations remain missing, record the exact missing owner before any balance change.

## Docs and Ledger

Update:
- `docs/40_reports/ENGINE_HEALTH_AUDIT_n1842_2026-05-16.md`
- `docs/40_reports/implemented/YYYYMMDD_H1_WATCHED_OPERATION_OUTCOME.md`
- `docs/plans/MASTER_ROADMAP.md`
- `docs/PROJECT_LEDGER.md`

Determinism statement required: this lane may change scenario outcomes only if catalog/injection behavior changes; otherwise diagnostics/reporting-only work must preserve hashes except report artifacts.
