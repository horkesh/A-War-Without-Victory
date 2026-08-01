# AWWV Command Board

**Role:** Derived execution view

**Authority:** [MASTER_ROADMAP.md](MASTER_ROADMAP.md) is the sole planning authority and wins on any conflict.

**Updated:** 2026-08-01

**Program state:** ACTIVE; R1 is closed locally and R2 is unlocked for integration/execution

## Activation

- `Execute the master roadmap`: begin R1 and continue autonomously through local R9 readiness under the authority matrix in the master roadmap.
- `Execute Rn`: execute only the named workstream and required prerequisite checks.
- `Publish 1.0`: after R9 is green, authorize signing, upload, public tag/push, and release-state change.

This planning pass authorizes none of those implementation or publication actions.

## Dispatch Queue

| Order | ID | Status | Next executable action | Plan |
|---:|---|---|---|---|
| 1 | R1 | CLOSED | Integrate the reviewed local commits. Acceptance: warm p95 139.515 ms, cold p95 78.8 ms, zero warm graphics/static churn, three-launch player-visible proof, zero unexpected diagnostics. | [Seamless map transition](2026-07-31-seamless-command-room-map-transition-plan.md) |
| 2 | R2 | READY — R1 HANDOFF COMPLETE | Rebase FR-03 on R1; execute the five RS information-hierarchy, map-handoff, cadence, ultrawide, and presentation packets. | [RS friction remediation](2026-07-31-rs-104week-friction-remediation-plan.md) |
| 3 | R3 | READY | Characterize lifecycle state, then execute Phases 0–6 with locked TG constants and the decided Standing-OG model. | [TG convergence](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) |
| 4 | R4 | WAITING ON R2 PRIORITY/CADENCE CONTRACT | Inventory command/event/Codex projections, converge them on deterministic receipts, and absorb Free War residuals. | [Command/event/Codex convergence](2026-07-31-command-event-codex-convergence-plan.md) |
| 5 | R5 | WAITING ON R1–R3 STATE FLOOR | Classify optional state and artifacts, profile measured hot paths, close save/replay and CI parity. | [Engine quality](2026-07-31-engine-quality-performance-stability-plan.md) |
| 6 | R6 | WAITING ON R3/R5 FLOOR | Run the serialized adopt-or-retire experiments, Sarajevo/E-B1 work, and final calibration proof. | [Historical gameplay/calibration](2026-07-31-historical-gameplay-depth-calibration-plan.md) |
| 7 | R7 | WAITING ON R4 INVENTORY AND R1/R2 UI | Build claim/identity/string/audio inventories; complete sourced content, `bs` localization, licensing, and audio proof. | [Content/localization/audio](2026-07-31-content-history-localization-audio-plan.md) |
| 8 | R8 | WAITING ON R1–R7 GREEN | Run fresh full-duration packaged-Electron RBiH, RS, and HRHB campaigns; fix bugs before friction; repeat until two final diaries are 5/5. | [Electron validation](2026-07-31-full-campaign-electron-validation-plan.md) |
| 9 | R9 | WAITING ON R8 | Freeze an immutable RC, produce reproducible clean-machine artifacts/evidence, and prepare publication inputs. | [Release candidate/gold](2026-07-31-release-candidate-gold-publication-plan.md) |

## Current Critical Path

`R2 -> R3 -> R4 -> R5 -> R6 -> R7 -> R8 -> R9` (`R1` closed 2026-08-01)

R3 is technically ready beside R1/R2, but serial execution is the default to minimize dirty-worktree and integration risk. Parallel execution requires a fresh shared-file inspection proving independence.

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
