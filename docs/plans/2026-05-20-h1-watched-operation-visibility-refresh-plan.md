# H1 Watched Operation Visibility Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refresh H1 so Krivaja, Stupcanica, and Cerska-Kamenica work is diagnostic and evidence-first before anyone changes operation behavior.

**2026-05-21 status:** Task 1, Task 2, Task 3, and Task 5 diagnostic packet are complete in `docs/40_reports/audits/20260521_H1_WATCHED_OPERATION_VISIBILITY_PACKET.md`. Current 188w evidence shows Krivaja-95 present-but-blocked via persisted `state.military.op_injection_warnings` (`brigade_ineligible` on `rs_skelani_battalion`). Cerska-Kamenica and Stupcanica-95 are now classified as catalog-present via `src/sim/combat/triggered_operations.ts`, but not launched and absent from watched-operation/AAR evidence. The next implementation owner is complete triggered-operation lifecycle tracing for non-warning skip reasons before Task 4 report projection or any behavior tuning.

**Architecture:** Separate four questions: catalog presence, eligibility status, execution/blocker status, and report visibility. No outcome tuning starts until each watched operation has an evidence row proving where it is missing or blocked.

**Tech Stack:** Existing sensitive-history diagnostics, triggered operation tests, scenario reporting tests, 188w runner.

---

## Source Evidence

Existing plan: `docs/plans/2026-05-17-h1-watched-operation-outcome-plan.md`.

Current interpretation:
- H1 blocker-surface work added typed launch blockers.
- Remaining H1 work is about evidence and visibility, not tuning.
- Sensitive-history outcome changes require user sign-off.

Watched operations:
- Krivaja / Krivaja-95.
- Stupcanica / Stupcanica-95.
- Cerska-Kamenica.

## Scope

In scope:
- Diagnostic/reporting rows for watched operation lifecycle.
- Compact fixtures for missing, blocked, delivered, and report-invisible statuses.
- 188w evidence collection.
- A sign-off packet if any operation is newly deliverable.

Out of scope:
- Relaxing launch feasibility.
- Changing operation objectives.
- Changing OOB, painted targets, rupture gates, enclave logic, or sensitive-history rules.
- Narrative claims about historical outcomes without citation/sign-off.

## Task 1: Define The Evidence Table

**Files:**
- Modify: `tools/diagnostics/sensitive_history_status.cjs`
- Modify: `tests/sensitive_history_status_diagnostic.test.ts`

**Required columns:**

| column | meaning |
|---|---|
| `operation_id` | canonical operation id or watched alias |
| `watched_label` | Krivaja, Stupcanica, or Cerska-Kamenica |
| `canonical_window` | expected turn/week window |
| `catalog_status` | `present`, `missing`, or `not_applicable` |
| `eligibility_status` | `eligible`, `not_eligible`, `unknown` |
| `launch_status` | `launched`, `blocked`, `not_launched`, `unknown` |
| `blocker_code` | typed blocker when available |
| `aar_status` | `visible`, `not_visible`, `not_applicable` |
| `delivery_status` | `delivered`, `blocked`, `missing`, `unknown` |

**Acceptance:** Diagnostic output can represent a watched operation that is present but blocked, rather than collapsing it into missing.

## Task 2: Add Compact Fixture Coverage

**Files:**
- Modify or create fixtures under `tests/fixtures/sensitive_history_watched_operations/`
- Modify: `tests/sensitive_history_status_diagnostic.test.ts`

**Steps:**
1. Add one fixture for a watched operation with typed blocker.
2. Add one fixture for a watched operation present in operation history but absent from AAR projection.
3. Add one fixture for a watched operation missing from catalog/injection.
4. Assert all statuses are distinct.

**Verification:**

```powershell
npx.cmd vitest run tests/sensitive_history_status_diagnostic.test.ts --reporter=dot
```

## Task 3: Trace Current 188w Evidence

**Commands:**

```powershell
npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --out runs
node tools\diagnostics\sensitive_history_status.cjs <new-run-dir>
```

**Steps:**
1. Record the run directory and final hash.
2. Record one row for each watched operation.
3. If a watched operation is missing, inspect catalog/injection owner files and report the exact missing seam.
4. If blocked, record blocker code and relevant launch feasibility inputs.
5. If delivered, stop for user sensitive-history sign-off before any merge.

**Acceptance:** The handoff names a precise owner for each watched operation status.

## Task 4: Report Visibility Only

**Files:**
- Modify only if needed:
  - `src/scenario/scenario_end_report.ts`
  - `src/scenario/scenario_reporting.ts`
  - report-contract tests.

**Steps:**
1. If a watched operation has a status row but is absent from end-report/AAR evidence, add a report projection from structured status.
2. Do not infer status from prose scraping.
3. Keep labels neutral: `missing`, `blocked`, or `delivered`.
4. Add report-contract tests.

**Verification:**

```powershell
npx.cmd vitest run tests/scenario_reporting_contracts.test.ts tests/sensitive_history_status_diagnostic.test.ts --reporter=dot
```

**Gate:** If report visibility requires changing operation behavior, stop and write a separate behavior plan.

## Task 5: Produce The H1 Evidence Packet

**Files:**
- Create: `docs/40_reports/audits/YYYYMMDD_H1_WATCHED_OPERATION_VISIBILITY_PACKET.md`
- Modify: `docs/plans/2026-05-16-engine-health-n1842-plan.md`
- Modify: `docs/plans/MASTER_ROADMAP.md` only when status changes are accepted.
- Modify: `docs/PROJECT_LEDGER.md`

**Packet must include:**
- Run path and final hash.
- One evidence row per watched operation.
- Whether the work was diagnostic-only or behavior-changing.
- Whether user sign-off is required.
- Exact next owner if any operation remains missing or blocked.

## Required Verification

```powershell
npm.cmd run typecheck
npx.cmd vitest run tests/sensitive_history_status_diagnostic.test.ts --reporter=dot
git diff --check
```

Run `npm.cmd run test:baselines` only if source behavior changes. For diagnostic/report-only changes, explain why baseline scenario outputs are unchanged or which report artifact intentionally changed.

## Stop Gates

- Stop before any operation behavior change.
- Stop before accepting a newly delivered sensitive-history capture outcome.
- Stop if evidence cannot distinguish missing from blocked.
- Stop if a watched operation needs new historical claims.
- Stop if a fix would retune unrelated operation behavior.
