# AWWV Command Board

**Role:** Derived execution view

**Authority:** [MASTER_ROADMAP.md](MASTER_ROADMAP.md) is the sole planning authority and wins on any conflict.

**Updated:** 2026-08-01

**Program state:** EXECUTING; R1 and R3 are complete, R7 Phase 0 inventories are complete, all R2 source packets are independently approved, and R2/R5 remain active

## Activation

- `Execute the master roadmap`: begin R1 and continue autonomously through local R9 readiness under the authority matrix in the master roadmap.
- `Execute Rn`: execute only the named workstream and required prerequisite checks.
- `Publish 1.0`: after R9 is green, authorize signing, upload, public tag/push, and release-state change.

The owner activated full roadmap execution on 2026-07-31 and separately authorized commits, pushes, final merge, documentation propagation, and repository cleanup. Signing, store upload, public release creation, and a public `1.0` tag remain outside that authority.

## Dispatch Queue

| Order | ID | Status | Next executable action | Plan |
|---:|---|---|---|---|
| 1 | R1 | **COMPLETE** | No further R1 action. Acceptance: warm p95 139.515 ms, cold p95 78.8 ms, zero warm graphics/static churn, three-launch player-visible proof, zero unexpected diagnostics. | [Seamless map transition](2026-07-31-seamless-command-room-map-transition-plan.md) |
| 2 | R2 | IN PROGRESS — SOURCE COMPLETE; FRESH PACKAGED RS ACCEPTANCE NEXT | Rebuild the transient package, run a fresh no-resume 104-week RS owner campaign, require clean final diagnostics plus measured map/OOB/path geometry, and file the completed diary. The prior failed final-tour run is negative evidence only. | [RS friction remediation](2026-07-31-rs-104week-friction-remediation-plan.md) |
| 3 | R3 | **COMPLETE** | Verified lifecycle/state floor is available to R5; no further R3 action. | [TG convergence](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) |
| 4 | R4 | IN PROGRESS — PHASE 2 COMPLETE; PHASE 3 NEXT | Execute Phase 3 event reachability and two-level surfacing: repair only inventory-proven residuals, retain nonblocking notices, and preserve authored deterministic defaults and stable ordering. | [Command/event/Codex convergence](2026-07-31-command-event-codex-convergence-plan.md) |
| 5 | R5 | IN PROGRESS — DENSE OCCUPANCY FULL-STATE GREEN; BYTE/PROFILE NEXT | Run the excluded 40-week byte gate for the occupancy-only candidate; only on exact control identity, collect same-lease current-owner and replicated candidate/control timing, then accept or fully revert before any reachability work. | [Engine quality](2026-07-31-engine-quality-performance-stability-plan.md) / [Phase 2c](2026-08-01-r5-phase2c-amortized-sector-topology-plan.md) |
| 6 | R6 | IN PROGRESS — TASK 0.1 CLOSED; WAITING ON R5 FLOOR | Keep the corrected Goražde current-state baseline frozen; after the R5 floor closes, execute Phase 0.2 and the serialized adopt-or-retire experiments, Sarajevo/E-B1 work, and final calibration proof. | [Historical gameplay/calibration](2026-07-31-historical-gameplay-depth-calibration-plan.md) |
| 7 | R7 | IN PROGRESS — PHASE 0 CORRECTION/REVIEW; REMEDIATION OPEN | Correct and independently review the inventories, then remediate the explicit historical/source, identity, `bs` migration, pseudo-locale, licensing/audio, accessibility, and packaged-Electron findings in phase order. | [Content/localization/audio](2026-07-31-content-history-localization-audio-plan.md) |
| 8 | R8 | WAITING ON R1–R7 GREEN | Run fresh full-duration packaged-Electron RBiH, RS, and HRHB campaigns; fix bugs before friction; repeat until two final diaries are 5/5. | [Electron validation](2026-07-31-full-campaign-electron-validation-plan.md) |
| 9 | R9 | WAITING ON R8 | Freeze an immutable RC, produce reproducible clean-machine artifacts/evidence, and prepare publication inputs. | [Release candidate/gold](2026-07-31-release-candidate-gold-publication-plan.md) |

## Current Critical Path

`R2 -> R4`, alongside `R5 -> R6`; R1 and R3 are complete, and both active paths converge before `R7 -> R8 -> R9`.

R1 and R3 are integrated on `codex/master-roadmap-execution`. R2 source, harness, and WebGL repairs are independently approved; a rebuilt fresh packaged 104-week RS acceptance and completed diary remain. R4 Phase 2 is complete: three serial turn-104 headless campaigns are byte-identical, actual decision gaps remain distinct from ordinary activity/notices, and all eleven unsupported long intervals have source-attested holds bound to exact endpoint turns and receipt-ID sets. The corrected RBiH `82-97` hold ends on the turn-97 NATO ultimatum response, not Washington at turn 102. The registry still admits zero optional initiatives, generic Authority-spend matches are zero, manifest process/stdout rows are explicitly limited to attestations without raw snapshots/logs, and retained simulation-anomaly warnings remain open and separate from cadence bugs. R4 advances to Phase 3 event reachability and two-level surfacing. R5 has closed state classification, three byte-identical reuse checkpoints, and a correctness-repaired turn-local receipt foundation. Same-parent control disproves the historical packet's apparent 18.155% receipt regression; the accepted best remains 1,189.962 ms/turn and the target gap remains 11.8996x. A fresh corrected-source profile now confirms sector reconstruction at 14,170.635 ms inclusive (29.699% of sampled application time); the three profiled sector phases consume 377.315 ms/turn. A canonical status-result reuse spike showed no owner win and was fully reverted. Phase 2c now proceeds with the red-first call-scoped dense occupancy contract, followed by bounded helper parity and a mandatory full-profile handoff. R6 Task 0.1 is closed with the reviewed Goražde current-state correction; Phase 0.2 waits on the R5 floor. R7 inventory correction and independent review are active before remediation.

## Fixed Decisions

- Five presidential levers; Decision Room owns action.
- Quiet historical intervals use positive-hold briefings, never fabricated decisions.
- TG constants: 12-turn maximum, 4 cohesion drain, dissolve at 15, four-turn Army-HQ cap tail.
- ADR-0007 Phase C remains retired; narrower live Standing-OG behavior is documented.
- Unknown historical identities/content are omitted.
- `bs`/`bs-BA`; legacy `bcs` migrates.
- First-party/CC0/approved CC BY audio only.
- Steam primary; signed Windows, notarized macOS, Linux AppImage.
- Publication is separately authorized; credentials are injected inputs.

See [Master Roadmap §6](MASTER_ROADMAP.md#6-locked-product-and-historical-decisions) for the complete decision record and sources.

## Workstream Update Protocol

When a workstream changes state:

1. update its plan checklist/evidence;
2. update the authoritative row in the master roadmap;
3. mirror the state and next action here in the same change;
4. append the ledger entry required by the plan;
5. verify links, diff hygiene, and applicable tests;
6. locally commit only when the active execution authority permits it.

Do not add another active row for a finding. Route it to R1–R9 using [Master Roadmap §10](MASTER_ROADMAP.md#10-finding-routing). Closed work is removed from this dispatch table; history belongs in Git, the ledger, and reports.

## Execution Hygiene

- Inspect status, branch, and worktrees before every packet.
- Never reset, clean, delete, stash, or overwrite unrelated user work.
- One workstream owns a shared file at a time.
- Failed experiments close as evidence-backed no-go results.
- Unexplained drift, determinism failure, unsupported history, or failing package diagnostics blocks the faulty change, not the rest of the queue.
- Do not edit `docs/10_canon/FORAWWV.md`.

## Completion

This board becomes all green only when R1–R9 satisfy [the master definition of completion](MASTER_ROADMAP.md#12-definition-of-program-completion). “Prepared for publication” and “published” are separate states.
