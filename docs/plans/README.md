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
| R1 | [Seamless Command Room ↔ Tactical Map](2026-07-31-seamless-command-room-map-transition-plan.md) | Complete; closed 2026-08-01 |
| R2 | [RS Desk → Decision → Advance friction](2026-07-31-rs-104week-friction-remediation-plan.md) | Complete; closed 2026-08-03 on the clean v14 acceptance |
| R3 | [Operational/Tactical Group convergence](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) | Complete; final full fast slice green |
| R4 | [Command, event, and Dynamic Codex convergence](2026-07-31-command-event-codex-convergence-plan.md) | Complete; Phase 6 packaging follow-up closed 2026-08-07 |
| R5 | [Engine quality, performance, and stability](2026-07-31-engine-quality-performance-stability-plan.md) / [Phase 2c/2d](2026-08-01-r5-phase2c-amortized-sector-topology-plan.md) / [Phase 2e pure solve](2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md) | Complete; current ~1.09 s/turn floor accepted and 100 ms target retired |
| R6 | [Historical gameplay depth and final calibration](2026-07-31-historical-gameplay-depth-calibration-plan.md) | Pre-1.0 calibration scope closed 2026-08-09; remaining named debt is post-1.0 |
| RC | [Collapse scope](../40_reports/proposals/20260609_SCOPE_collapse_pipeline.md) / [build spec](../40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md) / [D-shape result](2026-08-15-collapse-d-shape-design.md) | Pre-1.0 narrow scope complete; D-topology reserved post-1.0 |
| R7 | [Content, history, audio, accessibility, and opening experience](2026-07-31-content-history-localization-audio-plan.md) / [case-file opening implementation](2026-08-23-opening-screens-implementation-plan.md) | Active current lane; Phase 2 and opening experience complete, audio/accessibility/packaged proof remain; localization Phase 3 is post-1.0 |
| R8 | [Full-campaign packaged-Electron validation](2026-07-31-full-campaign-electron-validation-plan.md) | RC and R1-R7 green |
| R9 | [Release candidate, gold, and publication](2026-07-31-release-candidate-gold-publication-plan.md) | R8 produces two clean 5/5 diaries |

Each R1–R9 workstream has exactly one detailed plan with named files, red-first tests, commands, evidence, acceptance, collision rules, and an orchestrator closeout. The reactivated RC lane uses its linked scope, build specification, and Section 6 gate packet. If new evidence changes a workstream, amend that packet and the master roadmap instead of creating a competing active plan.

## Activation Boundary

The owner activated full roadmap execution on 2026-07-31 and separately authorized commits, remote pushes, final merge to `main`, documentation propagation, and repository cleanup.

- `Execute the master roadmap` authorizes autonomous local implementation, testing, evidence, local commits, and transient validation builds.
- Signing, store upload, public release creation, and a public `1.0` tag remain unauthorized.
- `Publish 1.0` separately authorizes those external publication actions after R9 is green.

See [Master Roadmap §2](MASTER_ROADMAP.md#2-authority-and-activation) for the exact authority matrix.

## Current State

The seven RBiH/RS/HRHB owner-style Electron diaries and completed bug-first repair history are indexed in the [D2 owner-diary closeout](../40_reports/implemented/20260731_D2_OWNER_DIARY_REMEDIATION_AND_REPOSITORY_CLOSEOUT.md). The merged case-file opening flow is specified by the [opening implementation plan](2026-08-23-opening-screens-implementation-plan.md), and complete-suite validation now uses `npm run test:vitest:balanced`. Remaining pre-1.0 work is consolidated into R7-R9; there are no separate active RC/D3/D4, Free War, FORAWWV-decision, Standing-OG-verdict, localization-reviewer, signing-credential, or release-operator queues.

Research has resolved the product choices. Verification barriers remain: determinism, conservation, migration, baselines, canon, historical substantiation, accessibility, security, licensing, clean package/runtime, and explicit external publication authority.

## Historical Plans

Dated plans not listed in the R1–R9 table are retained for traceability. They are not active unless the master roadmap explicitly reactivates them. Prior master-roadmap prose and closed lane history remain available through Git and the project ledgers rather than being repeated in current planning docs.

## Archive Policy

- Keep R1–R9 plans in `docs/plans/` until program completion.
- Move superseded or implemented packets only after inbound-link checks and ledger/report propagation.
- Never treat a file’s date or historical “active” label as current authority; the master workstream register is definitive.
