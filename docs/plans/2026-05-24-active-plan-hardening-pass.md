# Active Plan Hardening Pass

**Date:** 2026-05-24
**Status:** ACTIVE docs/process lane
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

Status: **IN PROGRESS**

Tasks:

- [x] Add `docs/plans/PLAN_EXECUTION_STANDARD.md`.
- [x] Add this hardening pass as the controlling matrix.
- [ ] For each command-board row, identify the active handoff plan or plans.
- [ ] Mark each plan as `execution-grade`, `needs expansion`, `needs split`, `operator checklist only`, or `closed/no rewrite`.

Verification:

- `git diff --check`

Stop gate:

- Do not touch runtime code or feature data in this pass.

## Phase 1 - P0/P1 Plans

| Lane | Candidate plan(s) | Hardening action |
| --- | --- | --- |
| Branch/CI/release hygiene | `docs/plans/2026-05-20-release-evidence-ci-proof-packet-plan.md`, `docs/plans/2026-05-18-autonomous-merge-pr-evidence-plan.md` | Convert to execution packet for current-tip proof, CI polling, dirty-worktree handling, and merge acceptance. |
| GUI polish / presidential shell | `docs/plans/2026-05-24-gui-shell-reorganization-scope.md`, `docs/plans/2026-05-24-presidential-blocker-flow-plan.md`, `docs/plans/2026-05-24-presidential-ui-redesign-research.md` | Keep owned-elsewhere warning; add merge/review packet and collision-safe file targets. |
| Calibration / army arc / HVO-HV operations | external calibration branch prompt plus `docs/40_reports/CALIBRATION_MASTER.md` and HVO synthesis docs | Do not rewrite calibration work while owned elsewhere; prepare verification/merge acceptance packet only. |
| Event system presidential core upgrade | `docs/plans/2026-05-24-event-system-presidential-core-upgrade-plan.md` | Already execution-grade. Keep as template. |
| Dynamic Codex and sensitive-history consequence arcs | `docs/plans/2026-05-18-autonomous-content-codex-arc-bank.md`, `docs/plans/2026-05-17-two-level-event-surfacing-and-codex-visibility-plan.md`, notification sensitive-content plans | Split into safe Codex sweep packet, sensitive-history gated packet, and notification residual packet. |
| Sector/frontline performance residuals | `docs/plans/2026-05-20-sector-performance-next-target-plan.md`, `docs/plans/2026-05-18-sector-reconstruction-performance-plan.md` | Add profile-first external-agent packet, exact profiling commands, byte-stability gates, and forbidden unmeasured caches. |
| Optional `GameState` schema contract | `docs/plans/2026-05-20-strict-null-post-factionid-roadmap.md`, `docs/plans/2026-05-20-strict-null-schema-boundary-validation-plan.md` | Convert optional-field classification into phase packets with migration/validator/test commands. |
| Save/load/replay and generated-artifact stability | `docs/plans/2026-05-18-autonomous-save-replay-determinism-bank.md`, `docs/plans/2026-05-17-save-migration-hardening-plan.md` | Add artifact-owner map, generated-output command ownership, and baseline-refresh stop gates. |
| Localization Bosnian LQA | `docs/plans/2026-05-17-bcs-localization-plan.md` | Add Bosnian-specific LQA checklist, Croatian/Serbian leakage gates, and native-review handoff packet. |

Phase 1 closeout:

- Each P0/P1 lane has either an execution-grade plan or a documented reason it is owned elsewhere/operator-gated.
- `COMMAND_BOARD.md` links exact plan files where useful.
- Ledger records the phase.

## Phase 2 - P2/P3 Plans

| Lane | Candidate plan(s) | Hardening action |
| --- | --- | --- |
| Intel surprise / ambush depth | `docs/plans/2026-05-17-intel-extensions-plan.md` | Add hidden-truth/player-safe gates, exact combat/AAR tests, scenario hash rules. |
| Supply/logistics comprehension outside GUI branch | `docs/plans/2026-05-17-supply-design-completion-plan.md`, logistics plans | Add read-model-only boundary, GUI collision rules, and no-new-authority gates. |
| Officer/OOB/source attribution and essay rosters | `docs/plans/2026-05-17-officer-character-mini-bio-plan.md`, OOB/source plans | Add source hierarchy, identity uncertainty gates, roster tests, and historian review triggers. |
| Soundscape and high-value assets | `docs/plans/2026-05-17-soundscape-integration-plan.md`, `docs/plans/2026-05-17-soundscape-kickoff-audio-stub-plan.md`, product/assets bank | Split repo-wirable substrate from user/operator asset approval. |
| Telemetry/playtest diagnostics | `docs/plans/2026-05-17-telemetry-crash-reporting-plan.md`, playtest readiness plans | Add default-off/no-upload proof, provider decision gates, and privacy stop gates. |
| Packaging, signing, clean VM, store, press, trailer | platform/launch plans | Convert to operator checklist packets; repo agents may prepare artifacts but not claim external proof. |
| FORAWWV / open design decisions | canon decision-prep bank | Add decision-packet template only; no implementation or FORAWWV edits. |

Phase 2 closeout:

- Every P2/P3 lane has a standard-compliant handoff or an explicit operator/canon gate.
- `COMMAND_BOARD.md` remains concise and points to the controlling packet.

## Phase 3 - Future Plan Gate

Tasks:

- [x] Add the standard to the command-board maintenance rules.
- [ ] Update `docs/plans/2026-05-18-autonomous-dispatch-index.md` to require execution-grade plans for future dispatches.
- [ ] Add a lightweight check/audit command only if useful; do not over-automate prose.

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
