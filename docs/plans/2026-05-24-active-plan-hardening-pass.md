# Active Plan Hardening Pass

**Date:** 2026-05-24
**Status:** COMPLETE for current command-board rows
**Owner lane:** Roadmap/process lane
**Related command-board row:** Branch/CI/release hygiene plus all active/gated rows
**Standard:** `docs/plans/PLAN_EXECUTION_STANDARD.md`

## Purpose

Upgrade every live roadmap/backlog plan into the external-agent execution format now used by the event-system plan. This pass is not implementation of the underlying game features; it is the dispatch-quality cleanup that lets external agents execute the work without rediscovering ownership, tests, stop gates, or closeout rules.

## Scope Rule

Improve all current command-board lanes first. Do not rewrite closed historical plans unless:

- the command board points at them as the active handoff;
- a lane is reopened;
- an external agent will receive that document directly.

## Phase 0 - Standard and Inventory

Status: **COMPLETE**

Tasks:

- [x] Add `docs/plans/PLAN_EXECUTION_STANDARD.md`.
- [x] Add this hardening pass as the controlling matrix.
- [x] For each command-board row, identify the active handoff plan or plans.
- [x] Mark each plan as `execution-grade`, `needs expansion`, `needs split`, `operator checklist only`, `owned-elsewhere acceptance packet`, or `closed/no rewrite`.

### Command-Board Inventory

| Lane | Active handoff source | Current classification | Next hardening action |
| --- | --- | --- | --- |
| Branch/CI/release hygiene | `docs/plans/2026-05-24-branch-ci-release-hygiene-execution-plan.md` | execution-grade | Use for current-tip proof, CI polling, dirty-file classification, and merge/branch acceptance packets. |
| GUI polish / presidential shell | `docs/plans/2026-05-24-owned-branch-acceptance-execution-plan.md` plus GUI branch handoff | owned-elsewhere acceptance packet | Use acceptance plan for review/merge only; do not rewrite GUI implementation while GUI branch is active. |
| Calibration / army arc / HVO-HV operations | `docs/plans/2026-05-24-owned-branch-acceptance-execution-plan.md` plus calibration branch handoff | owned-elsewhere acceptance packet | Use acceptance plan for verification/merge criteria; do not author calibration while external branch owns it. |
| Event system presidential core upgrade | `docs/plans/2026-05-24-event-system-presidential-core-upgrade-plan.md` | execution-grade | Use as the template for other lane upgrades. |
| Dynamic Codex and sensitive-history consequence arcs | `docs/plans/2026-05-24-codex-sensitive-history-execution-plan.md` | execution-grade | Use for safe Codex inventory/correction, sensitive-history packets, and dynamic consequence arcs. |
| Sector/frontline performance residuals | `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md` Phase 1 | execution-grade | Use profile-first sector phase with hash/artifact gates. |
| Optional `GameState` schema contract | `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md` Phase 2 | execution-grade | Use optional-field family phase with migration/default/validator proof. |
| Save/load/replay and generated-artifact stability | `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md` Phase 3 | execution-grade | Use artifact-owner and replay determinism phase. |
| Localization Bosnian LQA | `docs/plans/2026-05-24-bosnian-localization-lqa-execution-plan.md` | execution-grade | Use Bosnian leakage audit, string-family fixes, visual-fit, and native-review gates. |
| Intel surprise / ambush depth | `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 1 | execution-grade | Use hidden-truth/player-safe gates and focused proof. |
| Supply/logistics comprehension outside GUI branch | `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 2 | execution-grade | Use read-model-only boundary and GUI collision gate. |
| Officer/OOB/source attribution and essay rosters | `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 3 | execution-grade | Use citation, uncertainty, and historian review gates. |
| Soundscape and high-value assets | `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 4 | execution-grade | Use substrate-vs-approval asset gates. |
| Telemetry/playtest diagnostics | `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 5 | execution-grade | Use default-off/no-upload and privacy gates. |
| Packaging/signing/clean VM/store/press/trailer | `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 6 | operator checklist only | Use operator-proof boundaries. |
| FORAWWV/open design decisions | `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 7 | operator/canon checklist only | Use decision packets only; do not edit `docs/10_canon/FORAWWV.md`. |

Verification:

- `git diff --check`

Stop gate:

- Do not touch runtime code or feature data in this pass.

## Phase 1 - P0/P1 Plans

| Lane | Candidate plan(s) | Hardening action |
| --- | --- | --- |
| Branch/CI/release hygiene | `docs/plans/2026-05-24-branch-ci-release-hygiene-execution-plan.md` | Execution-grade. Continue using as the P0 hygiene packet. |
| GUI polish / presidential shell | `docs/plans/2026-05-24-owned-branch-acceptance-execution-plan.md` plus GUI branch handoff | Acceptance packet available. Continue avoiding implementation while owned elsewhere. |
| Calibration / army arc / HVO-HV operations | `docs/plans/2026-05-24-owned-branch-acceptance-execution-plan.md` plus calibration branch handoff | Acceptance packet available. Continue avoiding implementation while owned elsewhere. |
| Event system presidential core upgrade | `docs/plans/2026-05-24-event-system-presidential-core-upgrade-plan.md` | Already execution-grade. Keep as template. |
| Dynamic Codex and sensitive-history consequence arcs | `docs/plans/2026-05-24-codex-sensitive-history-execution-plan.md` | Execution-grade for Codex sweep, sensitive-history packets, notification residuals, and consequence arcs. |
| Sector/frontline performance residuals | `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md` Phase 1 | Execution-grade. |
| Optional `GameState` schema contract | `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md` Phase 2 | Execution-grade. |
| Save/load/replay and generated-artifact stability | `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md` Phase 3 | Execution-grade. |
| Localization Bosnian LQA | `docs/plans/2026-05-24-bosnian-localization-lqa-execution-plan.md` | Execution-grade. |

Phase 1 closeout:

- Each P0/P1 lane has either an execution-grade plan or a documented reason it is owned elsewhere/operator-gated.
- `COMMAND_BOARD.md` links exact plan files where useful.
- Ledger records the phase.

Status: **COMPLETE** for current command-board rows.

## Phase 2 - P2/P3 Plans

| Lane | Candidate plan(s) | Hardening action |
| --- | --- | --- |
| Intel surprise / ambush depth | `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 1 | Execution-grade. |
| Supply/logistics comprehension outside GUI branch | `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 2 | Execution-grade. |
| Officer/OOB/source attribution and essay rosters | `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 3 | Execution-grade. |
| Soundscape and high-value assets | `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 4 | Execution-grade with approval gates. |
| Telemetry/playtest diagnostics | `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 5 | Execution-grade. |
| Packaging, signing, clean VM, store, press, trailer | `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 6 | Operator checklist packet available. |
| FORAWWV / open design decisions | `docs/plans/2026-05-24-p2-p3-readiness-execution-plan.md` Phase 7 | Canon decision-packet route available. |

Phase 2 closeout:

- Every P2/P3 lane has a standard-compliant handoff or an explicit operator/canon gate.
- `COMMAND_BOARD.md` remains concise and points to the controlling packet.

Status: **COMPLETE** for current command-board rows.

## Phase 3 - Future Plan Gate

Tasks:

- [x] Add the standard to the command-board maintenance rules.
- [x] Update `docs/plans/2026-05-18-autonomous-dispatch-index.md` to require execution-grade plans for future dispatches.
- [x] No separate audit command added; current board/matrix review is sufficient and avoids over-automating prose.

## Required Closeout

Every hardening commit must:

- update this matrix;
- update `docs/plans/COMMAND_BOARD.md` if next action or controlling packet changes;
- append `docs/PROJECT_LEDGER.md`;
- update `docs/PROJECT_LEDGER_KNOWLEDGE.md` if the standard or process lesson changes;
- run `git diff --check`.

## External-Agent Prompt

```text
Role and objective: You are a documentation/process agent. Upgrade the active AWWV plan named by the orchestrator to comply with docs/plans/PLAN_EXECUTION_STANDARD.md without implementing the underlying feature.

Canon references: Read .claude/napkin.md, docs/20_engineering/PYRRHIC_PLANNING_RULES.md, docs/plans/COMMAND_BOARD.md, docs/plans/PLAN_EXECUTION_STANDARD.md, this hardening matrix, and the plan being upgraded.

Determinism and ledger constraints: Docs-only unless explicitly told otherwise. Do not edit runtime code, event data, scenario data, generated artifacts, or docs/10_canon/FORAWWV.md. Preserve existing plan intent; add execution-grade ownership, file targets, tests, stop gates, verification commands, and closeout rules. Append docs/PROJECT_LEDGER.md for the roadmap/process change.

STOP AND ASK triggers: The plan requires a canon/design decision not already settled; the plan is superseded or closed; branch ownership is unclear; ledger update requirement is unclear; scope expands from plan hardening into implementation.

Output format and validation: Return changed files, the lane upgraded, standard sections added, remaining gaps, and `git diff --check` result.
```
