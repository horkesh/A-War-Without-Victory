# AWWV Command Board

**Role:** Derived execution view

**Authority:** [MASTER_ROADMAP.md](MASTER_ROADMAP.md) is the sole planning authority and wins on any conflict.

**Updated:** 2026-08-02

**Program state:** EXECUTING; R1 and R3 are complete, R7 Phase 0 is independently accepted and Phase 1 is active, the R2 v8 hard-clipped Desk/Army-HQ contrast repair awaits fresh packaged acceptance, and R2/R5 remain active

## Activation

- `Execute the master roadmap`: begin R1 and continue autonomously through local R9 readiness under the authority matrix in the master roadmap.
- `Execute Rn`: execute only the named workstream and required prerequisite checks.
- `Publish 1.0`: after R9 is green, authorize signing, upload, public tag/push, and release-state change.

The owner activated full roadmap execution on 2026-07-31 and separately authorized commits, pushes, final merge, documentation propagation, and repository cleanup. Signing, store upload, public release creation, and a public `1.0` tag remain outside that authority.

## Dispatch Queue

| Order | ID | Status | Next executable action | Plan |
|---:|---|---|---|---|
| 1 | R1 | **COMPLETE** | No further R1 action. Acceptance: warm p95 139.515 ms, cold p95 78.8 ms, zero warm graphics/static churn, three-launch player-visible proof, zero unexpected diagnostics. | [Seamless map transition](2026-07-31-seamless-command-room-map-transition-plan.md) |
| 2 | R2 | IN PROGRESS — V8 HARD-CLIPPED DESK/CONTRAST REPAIRED; FRESH PACKAGED RS ACCEPTANCE NEXT | Rebuild the transient package with the hard-clipped Desk viewport and Army HQ contrast repair; run a brand-new no-resume 104-week RS owner campaign; require clean diagnostics/readability plus measured map/OOB/path geometry; then file the completed diary. Runs through v8 are negative evidence only. | [RS friction remediation](2026-07-31-rs-104week-friction-remediation-plan.md) |
| 3 | R3 | **COMPLETE** | Verified lifecycle/state floor is available to R5; no further R3 action. | [TG convergence](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) |
| 4 | R4 | **COMPLETE — CLOSED 2026-08-03** | Closed on Phase 5 integrated proof: determinism, engine-health, player-experience gate, and dual-resolution visual inspection all green; one pre-existing 188w calibration finding root-caused and routed to R6 Task 0.3. | [Command/event/Codex convergence](2026-07-31-command-event-codex-convergence-plan.md) |
| 5 | R5 | IN PROGRESS — PHASE 2D TASK 8A RETAINED; PHASE 2E TASKS 1-2 COMPLETE; TASK 3 NARROW-READ-INTERFACE PREREQUISITE FULLY COMPLETE | Phase 2e Tasks 1-2 are complete and committed. Task 3's narrow-read-interface prerequisite is now FULLY complete: both `state: GameState` and `formations: Record<FormationId, FormationState>` are narrowed across the ENTIRE sector-builder call graph (13+ files, verified body-by-body, zero call-site/behavior change, 10 commits total). Task 1's own mutation-journal module was narrowed too — it directly serves what the orchestrator extraction needs. Every function the pure solver will call already accepts the narrow types (`GameState`/`FormationState` both structurally satisfy them). What remains, not started: `solveCorpsFrontSectorsPure` itself, the detached mutable working-formation projection, a new commit-to-detached-state mutation-recorder strategy, and the RED equivalence test — the genuinely large, separately-budgeted orchestrator-extraction work. Read the plan's 2026-08-03 Task 3 scoping note before resuming. | [Engine quality](2026-07-31-engine-quality-performance-stability-plan.md) / [Phase 2c/2d](2026-08-01-r5-phase2c-amortized-sector-topology-plan.md) / [Phase 2e](2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md) |
| 6 | R6 | IN PROGRESS — TASK 0.1 CLOSED; WAITING ON R5 FLOOR | Keep the corrected Goražde current-state baseline frozen; after the R5 floor closes, execute Task 0.3 (fix the ahistorical Zvornik/Doboj/Gračanica 188w losses — owner directive 2026-08-03, root causes already diagnosed, do not restore the removed atrocity-reward), then Phase 0.2, the serialized adopt-or-retire experiments, Sarajevo/E-B1 work, and final calibration proof. | [Historical gameplay/calibration](2026-07-31-historical-gameplay-depth-calibration-plan.md) |
| 7 | R7 | IN PROGRESS — PHASE 0 CORRECTED AND REVIEWED; REMEDIATION OPEN | Continue the explicit historical/source, identity, `bs` migration, pseudo-locale, licensing/audio, accessibility, and packaged-Electron queues in phase order. | [Content/localization/audio](2026-07-31-content-history-localization-audio-plan.md) |
| 8 | R8 | WAITING ON R1–R7 GREEN | Run fresh full-duration packaged-Electron RBiH, RS, and HRHB campaigns; fix bugs before friction; repeat until two final diaries are 5/5. | [Electron validation](2026-07-31-full-campaign-electron-validation-plan.md) |
| 9 | R9 | WAITING ON R8 | Freeze an immutable RC, produce reproducible clean-machine artifacts/evidence, and prepare publication inputs. | [Release candidate/gold](2026-07-31-release-candidate-gold-publication-plan.md) |

## Current Critical Path

**2026-08-02 R2 packaged-readability update:** Fresh no-resume v5 reached exact turn 104 and completed its final route, counter, Army HQ, and state-integrity tours with clean runtime diagnostics, then failed closed on four underlying readability/classifier defects. RED-first repairs now wrap long operation identities, place event metadata in normal wrapping flow, preserve Desk scroll ownership with nonshrinking cards, and exclude explicitly non-modal dialogs from the active-modal root. A rebuilt brand-new packaged acceptance and completed diary remain required; v5 is negative evidence only.

**2026-08-02 R2 v6 diagnostic update:** Fresh no-resume v6 reached exact turn 104, completed the full final tour, captured 512 screenshots, preserved state/autosave integrity, and had zero runtime diagnostics. All v5 defects were absent. It failed only because the readability classifier counted the bitmap-backed Warroom date inside an `aria-hidden="true"` decorative scene board and treated expected overlay coverage as occlusion. RED-first effective-visibility coverage now excludes ARIA-hidden ancestors across text, modal, alert, control, and overflow candidates. A rebuilt brand-new packaged acceptance and completed diary remain required; v6 is negative evidence only.

**2026-08-02 R2 v7 Desk update:** Fresh no-resume v7 reached exact turn 104, completed the full final tour, captured 512 screenshots, and had zero runtime diagnostics. Every v5/v6 finding was absent. It failed closed on a live `Intelligence brief` card painting beneath the fixed status dock because the Decision Packet and outer Desk both owned vertical scrolling. RED-first coverage now requires one outer scroll owner; the packet scroller is removed and the Desk owns containment and bottom clearance. A rebuilt brand-new packaged acceptance and completed diary remain required; v7 is negative evidence only.

**2026-08-02 R2 v8 Desk/contrast update:** Fresh no-resume v8 reached exact turn 104, completed the full final tour, captured 512 screenshots, and had zero runtime diagnostics. It failed closed on three live status labels at two checkpoints. A bounded turn-1 probe recorded the Strategic Situation `aside` as the exact occluding top hit and also found three Army HQ contrast failures. RED-first repairs hard-clip the non-scrolling Desk shell around one bounded inner scroller, raise the execution/commander/compliance tones, and retain exact top-hit identities in diagnostics. A rebuilt brand-new packaged acceptance and completed diary remain required; v8 and the probe are negative evidence only.

**2026-08-02 runtime verification update:** The R7 Ring-3 baseline delta is causally owned by the turn-11 removal of prohibited atrocity incentives. Exact bisect exonerated R5 and toolchain drift. The reviewed refresh changed exactly seven `apr1992_52w` hashes; `formation_delta.json` and every four-week hash remain exact. A fresh no-refresh baseline and `canon:check` pass. R7 Phase 1.2 and the independently blocked officer/OOB repair remain active.

`R2 -> R4`, alongside `R5 -> R6`; R1 and R3 are complete, and both active paths converge before `R7 -> R8 -> R9`.

R1 and R3 are integrated on `codex/master-roadmap-execution`. R2 source, harness, and WebGL repairs are independently approved; a rebuilt fresh packaged 104-week RS acceptance and completed diary remain. R4 Phase 4 is canonically accepted: every dynamic Codex claim names exact state/receipt proof, calendar is context only, and the Campaign Codex discriminates `14` genuine paths, `5` divergence contexts, and `1` audit context without fabricating missed conditions. One selected-player-bound five-operand receipt identity, proof, and chronology reaches Codex, Chronicle, Records, and Cost Ledger, with authored EN/BCS presentation. Seven safe inventory residuals now carry reviewed tier metadata as well as source notes; sensitive player-choice and Srebrenica presentation decisions remain with R7. Committee corrections closed ownership, proof, ordering, localization, closed-projection, Markdown, and false-classification defects; the integrated R7/R4 source matrix passes 23 files / 659 tests, TypeScript, and the strict history CLI. **R4 is CLOSED (2026-08-03)**: Phase 5 integrated proof found the engine deterministic (two byte-identical 104-turn runs), the player-experience gate green on every reachable sub-step, and a pre-existing 188w calibration finding (Zvornik/Doboj/Gračanica) that was root-caused to two legitimate, already-shipped commits and routed to R6 Task 0.3 rather than left unexplained. R5 has closed state classification, three byte-identical reuse checkpoints, a correctness-repaired turn-local receipt foundation, one accepted Phase 2c dense-occupancy packet, and retained Phase 2d Task 8A at `0fd36157b`. Task 8A keeps all 14 saves exact at `5,085,892` bytes / SHA-256 `9d2a59dc...596b4`, reduces combined adjacency inclusive time `81.610253%`, reduces the builder `7.075305%`, and improves paired mean `1.782383%` to `1,086.311 ms/turn`; two of three pairs improve and all retention gates pass. Peak heap `215.046 -> 291.752 MB`, fresh `281.242 MB`, remains a watch. The fresh profile still selects `buildCorpsFrontSectors` first at `295.866225 ms/turn`. Phase 2e now owns the explicit immutable snapshot, detached full solve, ordered mutation journal, and prevalidated serial commit proof, with complete three-mode x 100 surfaces and memory/timing stop gates. Task 6, parallel faction extraction, and the rejected reachability context remain closed until Phase 2e acceptance plus its exact fresh-profile authorization gate. R6 Task 0.1 is closed with the reviewed Goražde current-state correction; Phase 0.2 waits on the R5 floor. R7 Phase 0 is independently accepted; Phase 1 historical/source remediation is active, with integrated baseline/canon proof serialized behind R5's runtime lane.

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
