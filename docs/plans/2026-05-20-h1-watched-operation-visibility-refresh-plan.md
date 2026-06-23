# H1 Watched Operation Visibility Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refresh H1 so Krivaja, Stupcanica, and Cerska-Kamenica work is diagnostic and evidence-first before anyone changes operation behavior.

> **2026-06-23 clarification:** This dated H1 plan is diagnostic/reporting-only for Krivaja/Stupcanica/Cerska-Kamenica operation-health and AAR visibility. Srebrenica/Zepa fall receipts are event-owned through sensitive-history events, not operation-delivery targets. Treat the legacy `delivery_status` vocabulary below as diagnostic artifact terminology only; it is not authority to tune Krivaja/Stupcanica for fall delivery.

**2026-05-21 status, clarified 2026-06-23:** Task 1, Task 2, Task 3, and Task 5 diagnostic packet are complete in `docs/40_reports/audits/20260521_H1_WATCHED_OPERATION_VISIBILITY_PACKET.md`. Follow-up implementation added deterministic `state.military.watched_operations` rows and scenario `watched_operations.json` output for skip/block/inject outcomes. Fresh trace-backed 188w packet `docs/40_reports/audits/20260521_H1_TRACE_BACKED_188W_PACKET.md` now proves Cerska-Kamenica, Krivaja-95, and Stupcanica-95 are catalog-present runtime rows, not source-scan inference. Current blockers are `build_defender_power_too_high` for all three, with compact ratio/attacker/defender power inputs, objective OSIDs, defender rosters, per-defender raw/stacked power contributions, per-defender modifier breakdowns, and Krivaja also preserving `brigade_ineligible` on `rs_skelani_battalion`. `docs/40_reports/audits/20260521_H1_DEFENDER_POWER_COMPONENT_REVIEW.md` closes the autonomous component-review boundary. Remaining H1 work is operation-health/AAR diagnostics only; the former Q-H1-KRIVAJA-OUTCOME fall-delivery lane is superseded by event-owned Srebrenica/Zepa receipts.

**Architecture:** Separate four questions: catalog presence, eligibility status, execution/blocker status, and report visibility. No outcome tuning is authorized from this plan; evidence rows only distinguish where an operation is catalog-present, ineligible, blocked, or absent from reporting.

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
- Compact fixtures for catalog-missing, operation-blocked, event-receipt/legacy-delivered, and report-invisible diagnostic statuses.
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
| `legacy_delivery_status` | diagnostic-only legacy values: `delivered`, `blocked`, `missing`, `unknown`; not operation-fall authority |

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
5. If a fall receipt is present, record whether it came from the event-owned path; do not merge operation behavior from this plan.

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
3. Keep labels neutral: `catalog missing`, `operation blocked`, `event receipt present`, or `report not visible`.
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
- Exact next diagnostic owner if any operation remains catalog-missing, operation-blocked, or report-invisible.

## Required Verification

```powershell
npm.cmd run typecheck
npx.cmd vitest run tests/sensitive_history_status_diagnostic.test.ts --reporter=dot
git diff --check
```

Run `npm.cmd run test:baselines` only if source behavior changes. For diagnostic/report-only changes, explain why baseline scenario outputs are unchanged or which report artifact intentionally changed.

## Stop Gates

- Stop before any operation behavior change.
- Stop before any operation behavior change; a newly present fall receipt is event-owned evidence unless a fresh Section 6 design says otherwise.
- Stop if evidence cannot distinguish missing from blocked.
- Stop if a watched operation needs new historical claims.
- Stop if a fix would retune unrelated operation behavior.
