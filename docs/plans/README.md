# AWWV Plans Index

**Purpose:** Entry point for current planning truth and executable implementation packets.

## Governing Control Plane

| Document | Role |
|---|---|
| [MASTER_ROADMAP.md](MASTER_ROADMAP.md) | **Sole authority** for unfinished product work, decisions, sequence, acceptance, and activation. |
| [COMMAND_BOARD.md](COMMAND_BOARD.md) | Derived current dispatch view. It never overrides the master roadmap. |
| [PLAN_EXECUTION_STANDARD.md](PLAN_EXECUTION_STANDARD.md) | Required task-level handoff and execution format. |
| [2026-06-08-v1.0-definition-of-done.md](2026-06-08-v1.0-definition-of-done.md) | Existing 1.0 acceptance reference, subordinate to the consolidated roadmap where scope/status changed. |

The former owner-decision and post-D2 residual lists are historical inputs, not active queues. Their unresolved items have been dispositioned into R1–R9 in [Master Roadmap §9](MASTER_ROADMAP.md#9-legacy-30-lane-disposition).

## Executable Workstreams

| ID | Plan | Start condition |
|---|---|---|
| R1 | [Seamless Command Room ↔ Tactical Map](2026-07-31-seamless-command-room-map-transition-plan.md) | Complete locally; closed 2026-08-01 |
| R2 | [RS Desk → Decision → Advance friction](2026-07-31-rs-104week-friction-remediation-plan.md) | Ready; R1 shared-file handoff complete |
| R3 | [Operational/Tactical Group convergence](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) | Ready after explicit execution instruction |
| R4 | [Command, event, and Dynamic Codex convergence](2026-07-31-command-event-codex-convergence-plan.md) | R2 priority/cadence contract |
| R5 | [Engine quality, performance, and stability](2026-07-31-engine-quality-performance-stability-plan.md) | R1–R3 source/state floor |
| R6 | [Historical gameplay depth and final calibration](2026-07-31-historical-gameplay-depth-calibration-plan.md) | R3/R5 deterministic floor |
| R7 | [Content, history, Bosnian localization, and audio](2026-07-31-content-history-localization-audio-plan.md) | R4 inventory; R1/R2 UI convergence |
| R8 | [Full-campaign packaged-Electron validation](2026-07-31-full-campaign-electron-validation-plan.md) | R1–R7 green |
| R9 | [Release candidate, gold, and publication](2026-07-31-release-candidate-gold-publication-plan.md) | R8 produces two clean 5/5 diaries |

Each roadmap point has exactly one detailed plan with named files, red-first tests, commands, evidence, acceptance, collision rules, and an orchestrator closeout. If new evidence changes a workstream, amend that plan and the master roadmap instead of creating a competing active packet.

## Activation Boundary

No implementation is authorized by this planning pass.

- `Execute the master roadmap` authorizes autonomous local implementation, testing, evidence, local commits, and transient validation builds.
- It does not authorize push, public tag, signing, upload, installer publication, or release-state change.
- `Publish 1.0` separately authorizes those external publication actions after R9 is green.

See [Master Roadmap §2](MASTER_ROADMAP.md#2-authority-and-activation) for the exact authority matrix.

## Current State

The seven RBiH/RS/HRHB owner-style Electron diaries and completed bug-first repair history are indexed in the [D2 owner-diary closeout](../40_reports/implemented/20260731_D2_OWNER_DIARY_REMEDIATION_AND_REPOSITORY_CLOSEOUT.md). Remaining work is consolidated into R1–R9; there are no separate active D3/D4, Free War, FORAWWV-decision, Standing-OG-verdict, localization-reviewer, signing-credential, or release-operator queues.

Research has resolved the product choices. Verification barriers remain: determinism, conservation, migration, baselines, canon, historical substantiation, accessibility, security, licensing, clean package/runtime, and explicit external publication authority.

## Historical Plans

Dated plans not listed in the R1–R9 table are retained for traceability. They are not active unless the master roadmap explicitly reactivates them. Prior master-roadmap prose and closed lane history remain available through Git and the project ledgers rather than being repeated in current planning docs.

## Archive Policy

- Keep R1–R9 plans in `docs/plans/` until program completion.
- Move superseded or implemented packets only after inbound-link checks and ledger/report propagation.
- Never treat a file’s date or historical “active” label as current authority; the master workstream register is definitive.
