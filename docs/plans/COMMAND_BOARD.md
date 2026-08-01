# AWWV Command Board

**Role:** Derived execution view

**Authority:** [MASTER_ROADMAP.md](MASTER_ROADMAP.md) is the sole planning authority and wins on any conflict.

**Updated:** 2026-08-01

**Program state:** EXECUTING; R1 and R3 are complete, while R2 and R5 are active

## Activation

- `Execute the master roadmap`: begin R1 and continue autonomously through local R9 readiness under the authority matrix in the master roadmap.
- `Execute Rn`: execute only the named workstream and required prerequisite checks.
- `Publish 1.0`: after R9 is green, authorize signing, upload, public tag/push, and release-state change.

The owner activated full roadmap execution on 2026-07-31 and separately authorized commits, pushes, final merge, documentation propagation, and repository cleanup. Signing, store upload, public release creation, and a public `1.0` tag remain outside that authority.

## Dispatch Queue

| Order | ID | Status | Next executable action | Plan |
|---:|---|---|---|---|
| 1 | R1 | **COMPLETE** | No further R1 action. Acceptance: warm p95 139.515 ms, cold p95 78.8 ms, zero warm graphics/static churn, three-launch player-visible proof, zero unexpected diagnostics. | [Seamless map transition](2026-07-31-seamless-command-room-map-transition-plan.md) |
| 2 | R2 | IN PROGRESS — NON-MAP PACKETS REVIEWED; FR-03 REBASE NEXT | Complete Electron viewport proof, rebase the direct map handoff on integrated R1, and run final RS acceptance. | [RS friction remediation](2026-07-31-rs-104week-friction-remediation-plan.md) |
| 3 | R3 | **COMPLETE** | Verified lifecycle/state floor is available to R5; no further R3 action. | [TG convergence](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) |
| 4 | R4 | WAITING ON R2 PRIORITY/CADENCE CONTRACT | Inventory command/event/Codex projections, converge them on deterministic receipts, and absorb Free War residuals. | [Command/event/Codex convergence](2026-07-31-command-event-codex-convergence-plan.md) |
| 5 | R5 | IN PROGRESS — PHASES 0–1 COMPLETE; PHASE 2 CHECKPOINTS GREEN | Redesign the current `buildCorpsFrontSectors` owner under failing equivalence tests, then continue to the recorded sub-100 ms target before artifact/CI closeout. | [Engine quality](2026-07-31-engine-quality-performance-stability-plan.md) |
| 6 | R6 | WAITING ON R5 FLOOR | First remove the confirmed Goražde weak-predicate territorial mutation, then run the serialized adopt-or-retire experiments, Sarajevo/E-B1 work, and final calibration proof. | [Historical gameplay/calibration](2026-07-31-historical-gameplay-depth-calibration-plan.md) |
| 7 | R7 | WAITING ON R4 INVENTORY AND R1/R2 UI | Build claim/identity/string/audio inventories; complete sourced content, `bs` localization, licensing, and audio proof. | [Content/localization/audio](2026-07-31-content-history-localization-audio-plan.md) |
| 8 | R8 | WAITING ON R1–R7 GREEN | Run fresh full-duration packaged-Electron RBiH, RS, and HRHB campaigns; fix bugs before friction; repeat until two final diaries are 5/5. | [Electron validation](2026-07-31-full-campaign-electron-validation-plan.md) |
| 9 | R9 | WAITING ON R8 | Freeze an immutable RC, produce reproducible clean-machine artifacts/evidence, and prepare publication inputs. | [Release candidate/gold](2026-07-31-release-candidate-gold-publication-plan.md) |

## Current Critical Path

`R2 -> R4`, alongside `R5 -> R6`; R1 and R3 are complete, and both active paths converge before `R7 -> R8 -> R9`.

R1 and R3 are integrated on `codex/master-roadmap-execution`. R2 is completing its final rebase and Electron acceptance. R5 has closed state classification and three byte-identical Phase 2 reuse checkpoints; its authoritative mean is 1,189.962 ms/turn, the target gap is 11.8996x, and sector reconstruction is next.

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
