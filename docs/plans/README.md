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
| R6 | [Historical gameplay depth and final calibration](2026-07-31-historical-gameplay-depth-calibration-plan.md) | January evidence accepted; all further calibration is paused until RE closes |
| RC | [Collapse scope](../40_reports/proposals/20260609_SCOPE_collapse_pipeline.md) / [build spec](../40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md) / [D-shape result](2026-08-15-collapse-d-shape-design.md) | Pre-1.0 narrow scope complete; D-topology reserved post-1.0 |
| R7 | [Content, history, audio, accessibility, and opening experience](2026-07-31-content-history-localization-audio-plan.md) / [case-file opening implementation](2026-08-23-opening-screens-implementation-plan.md) | Audio implementation landed `2d106e5e0`; human listen/sensitivity, English accessibility/readability, offline browser, packaged proof, and closeout remain |
| RE | [1.0 Engine Integrity contract](2026-08-26-engine-integrity-plan.md) / [auxiliary packaged-proof recovery](2026-08-28-packaged-probe-recovery-plan.md) | P1/P2A accepted; P2B HELD and P3 waiting. R2 instrumentation closed/rejected at its valid sole RED with zero packaged invocations and no R3. Close the zero-run receipt, then separately lock read-only alternate-proof discovery. |
| R8 | [Full-campaign packaged-Electron validation](2026-07-31-full-campaign-electron-validation-plan.md) | RC, R1-R7, and RE green |
| R9 | [Release candidate, gold, and publication](2026-07-31-release-candidate-gold-publication-plan.md) | R8 produces two clean 5/5 diaries |

Each R1–R9 workstream has exactly one detailed plan with named files, red-first tests, evidence,
acceptance, and collision rules. RC uses its linked closed packet; RE uses the single reduced
contract above. The original probe channel remains closed at `b711cffa9`; auxiliary packaged-proof
recovery currently remains active only to close its zero-execution receipt, not as a competing
outcome plan. Read-only discovery is queued and unauthorized until its fresh exact-base docs-only
lock is reviewed, pinned, and accepted. Its instrumentation path is closed. Frozen
RE discovery records and old T0–T14 text remain evidence only.

## Activation Boundary

The owner activated full roadmap execution on 2026-07-31. Local commits, documentation
propagation, and non-destructive workspace maintenance are authorized; remote push and final merge
are not.

- `Execute the master roadmap` authorizes autonomous local implementation, testing, evidence, local commits, and transient validation builds.
- Signing, store upload, public release creation, and a public `1.0` tag remain unauthorized.
- `Publish 1.0` separately authorizes those external publication actions after R9 is green.

See [Master Roadmap §2](MASTER_ROADMAP.md#2-authority-and-activation) for the exact authority matrix.

## Current State

The seven RBiH/RS/HRHB owner-style Electron diaries and completed bug-first repair history are indexed in the [D2 owner-diary closeout](../40_reports/implemented/20260731_D2_OWNER_DIARY_REMEDIATION_AND_REPOSITORY_CLOSEOUT.md). The case-file opening and audio implementation have landed. The original probe channel is closed history at `b711cffa9`. RE's corrected foundation and clean Node-22 baseline pair at `177882fc2` pass engine-only health, direct consistency, byte identity outside normalized metadata, and save/replay. P1 and P2A are accepted; P2B is held before implementation by its packaged-probe NO VERDICT and P3 waits. R2 instrumentation is closed/rejected at its valid sole RED: no production edit, GREEN, syntax/diff, package/probe invocation, candidate, or R3 occurred; invocation count is zero and unused package authority is nontransferable. The current zero-execution stop receipt is on `f674ff0e…`; after it closes, only a separately locked read-only alternate-proof discovery may route P2B. Recovery earns no RE credit. The measured `+3.62853%` correction cost remains watch-only; further calibration stays paused. There are no separate active old-T-task, performance-remediation, RC/D3/D4, Free War, FORAWWV-decision, Standing-OG-verdict, localization-reviewer, signing-credential, or release-operator queues.

Research has resolved the product choices. Verification barriers remain: determinism, conservation, migration, baselines, canon, historical substantiation, accessibility, security, licensing, clean package/runtime, and explicit external publication authority.

## Historical Plans

Dated plans not listed in the executable-workstreams table are retained for traceability. They are not active unless the master roadmap explicitly reactivates them. Prior master-roadmap prose and closed lane history remain available through Git and the project ledgers rather than being repeated in current planning docs.

The original RE investigation is preserved as the
[frozen discovery record](../40_reports/proposals/20260826_ENGINE_INTEGRITY_DISCOVERY_RECORD.md);
it is evidence, not an active plan.

## Archive Policy

- Keep R1–R9 and RE plans in `docs/plans/` until program completion.
- Move superseded or implemented packets only after inbound-link checks and ledger/report propagation.
- Never treat a file’s date or historical “active” label as current authority; the master workstream register is definitive.
