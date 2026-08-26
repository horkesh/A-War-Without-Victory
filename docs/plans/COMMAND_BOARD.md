# AWWV Command Board

**Status:** Derived dispatch view, synchronized 2026-08-26.

**Authority:** [MASTER_ROADMAP.md](MASTER_ROADMAP.md) is the sole authority for unfinished work and wins if this board differs.

## Activation

The owner activated full roadmap execution on 2026-07-31. Local implementation, tests, evidence, commits, approved remote pushes, final merge to `main`, documentation propagation, and repository cleanup are authorized within the roadmap.

Signing, store upload, public release creation, and a public `1.0` tag remain outside that authority and require a separate explicit `Publish 1.0` instruction.

## Dispatch Queue

| Order | ID | Status | Next executable action | Plan |
|---:|---|---|---|---|
| 1 | R1 | **COMPLETE -- CLOSED 2026-08-01** | None. | [Seamless map transition](2026-07-31-seamless-command-room-map-transition-plan.md) |
| 2 | R2 | **COMPLETE -- CLOSED 2026-08-03** | None; v14 is the accepted clean RS campaign proof. | [RS friction remediation](2026-07-31-rs-104week-friction-remediation-plan.md) |
| 3 | R3 | **COMPLETE** | None. | [TG convergence](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) |
| 4 | R4 | **COMPLETE** | None; Phase 6 and its packaging follow-up are closed. | [Command/event/Codex convergence](2026-07-31-command-event-codex-convergence-plan.md) |
| 5 | R5 | **COMPLETE -- CLOSED 2026-08-05** | None. The accepted performance floor is approximately 1.09 seconds per turn; the 100 ms target and incremental-reuse Task 6 are retired from 1.0 scope. | [Engine quality](2026-07-31-engine-quality-performance-stability-plan.md) |
| 6 | R6 | **PRE-1.0 SCOPE COMPLETE -- CLOSED 2026-08-09** | None in the pre-1.0 R6 packet. Named Brcko, exhaustion re-pacing, casualty-grade, cohesion, and institutional-veto work remains post-1.0 debt unless explicitly reactivated. | [Historical gameplay/calibration](2026-07-31-historical-gameplay-depth-calibration-plan.md) |
| 6.5 | RC | **PRE-1.0 NARROW SCOPE COMPLETE -- CLOSED 2026-08-15** | None. V3 selection plus reversible D-shape is retained; D-topology is reserved post-1.0. | [Collapse build spec](../40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md) / [D-shape result](2026-08-15-collapse-d-shape-design.md) |
| 7 | R7 | **ACTIVE -- PHASE 2 AND OPENING EXPERIENCE COMPLETE 2026-08-23** | The provenance/OOB reopening is closed with source-bound and controlled-run evidence. The case-file opening, explicit campaign mode, safe Field Records, and real browser proofs are merged. Next: audio/licensing, English accessibility/readability, then integrated packaged proof. Localization Phase 3 is post-1.0. | [Content/history/audio](2026-07-31-content-history-localization-audio-plan.md) / [opening implementation](2026-08-23-opening-screens-implementation-plan.md) |
| 7.5 | RE | **SCOPED 2026-08-26 — OWNER-INSTRUCTED, PRECEDES FURTHER CALIBRATION, GATES R8** | Phase 0, which costs **zero scenario runs**: build the op-schedule fingerprint, correct the health-gate predicate as reported-not-gated, land a clean four-checkpoint 188w pin, and write the pre-committed decision rule into CALIBRATION_MASTER before run 1. Then **Phase 1 — the probe memory repair (~10 lines, the highest-value change on the board)**, Phase 2 legibility, Phase 3 operation supply, Phase 4 cost loop. | [Engine integrity](2026-08-26-engine-integrity-plan.md) |
| 8 | R8 | **WAITING ON RC, R1-R7, AND RE GREEN** | Run fresh full-duration packaged-Electron RBiH, RS, and HRHB campaigns; fix bugs before friction; repeat until the final two diaries score 5/5. | [Electron validation](2026-07-31-full-campaign-electron-validation-plan.md) |
| 9 | R9 | **WAITING ON R8** | Freeze an immutable RC, produce reproducible clean-machine evidence, and prepare publication inputs. | [Release candidate/gold](2026-07-31-release-candidate-gold-publication-plan.md) |

## Current Critical Path

`R7 content/history/audio/accessibility/opening + RE engine integrity -> R8 -> R9`

**RE INSERTED 2026-08-26 BY OWNER INSTRUCTION** — *"engine health is sacrosanct; deal with these before more calibration work."* RE may run in parallel with R7 (disjoint ownership: engine/sim against content/audio/UI) but precedes any further calibration on combat resolution, the manpower economy, or operation injection, and gates R8. The headline measurement: **365 of 585 battles at 188 weeks (62%) are probe operations that cannot capture ground by construction** — 201 wins, zero territory, 131,577 attacker casualties, more than every real operation combined. The panel traced it to **two small defects in probe memory**: a probe that fights never records an objective failure, and the probe cooldown scans a history field nothing ever writes. Phase 1 is roughly ten lines. Scoring or diary-testing this engine ratifies the defect as the floor.

**MEASUREMENT BLOCKER CLOSED.** Run provenance now stamps commit, consumed-input evidence, and flag state; the pair selector hard-fails on incomparable artifacts. A fresh same-commit collapse OFF/ON pair passed the Section 6 discriminator with positive controls. The old mixed-tree n222/n223 pair remains permanently inadmissible and must not be reused.

**CURRENT EXECUTION:** R7 audio/licensing, then English accessibility/readability and integrated packaged proof. The opening experience and test-suite recovery are complete; R8 remains gated on the remaining R7 work rather than on provenance instrumentation.

**Canon landed 2026-08-17:** `SENSITIVE_HISTORY_DESIGN_GATE.md` §10, "Provenance and the Integrity of the Historical Record", ratified by unanimous Pyrrhic panel. `FORAWWV.md` §XIII temporal scope is drafted but **HELD** behind the provenance channel-separation and determinism-scan packets, and is not canon.

RC's narrow pre-1.0 scope is complete. Frontage-days and same-turn selection were retired; the retained v3 two-turn selector preserves the registered Sipovo/Drvar distinction. Reversible D-shape then fixed the event-only persistence clock and produced one bounded live HRHB write at Bucovaca while preserving all anchors, health gates, deterministic artifacts, and Section 6 exclusions. Neighbour-cascade D-topology is reserved post-1.0 and must not be replaced by struck breadth tuning. R7 is now the live lane.

## Fixed Decisions

- Five presidential levers; Decision Room owns action.
- Quiet historical intervals use positive-hold briefings, never fabricated decisions.
- TG constants: 12-turn maximum, 4 cohesion drain, dissolve at 15, four-turn Army-HQ cap tail.
- ADR-0007 Phase C remains retired; narrower live Standing-OG behavior is documented.
- Unknown historical identities/content are omitted.
- English is the sole required 1.0 language. The settled `bs`/`bs-BA` and legacy-`bcs` migration contract is retained for post-1.0 localization.
- First-party, CC0, or approved CC BY audio only.
- Steam primary; signed Windows, notarized macOS, Linux AppImage.
- Publication is separately authorized; credentials are injected inputs.

See [Master Roadmap Section 6](MASTER_ROADMAP.md#6-locked-product-and-historical-decisions) for the complete decision record and sources.

## Backlog (Non-Blocking)

Optional improvements outside the 1.0 outcome live in [Master Roadmap Section 10](MASTER_ROADMAP.md#10-finding-routing), not as dispatch rows. Current entries include post-1.0 multilingual localization, faction-wide equipment totals visibility, Local Support commitment redesign, and player-facing Sector-to-Operational-Group naming.

## Workstream Update Protocol

When a workstream changes state:

1. Update its plan checklist and evidence.
2. Update the authoritative master-roadmap snapshot and workstream row.
3. Mirror the state and next action here in the same change.
4. Append the ledger entry required by the plan.
5. Verify links, diff hygiene, and applicable tests.
6. Commit only when active execution authority permits it.

Do not add a competing active queue. Route new findings through [Master Roadmap Section 10](MASTER_ROADMAP.md#10-finding-routing).

## Execution Hygiene

- Inspect status, branch, and worktrees before every packet.
- Never reset, clean, delete, stash, or overwrite unrelated user work.
- One workstream owns a shared file at a time.
- Failed experiments close as evidence-backed no-go results.
- Unexplained drift, determinism failure, unsupported history, or failing package diagnostics blocks the faulty change, not the rest of the queue.
- Do not edit `docs/10_canon/FORAWWV.md`.

## Completion

This board becomes all green only when R1-R9 and RC satisfy the [master definition of program completion](MASTER_ROADMAP.md#12-definition-of-program-completion). Prepared for publication and published are separate states.
