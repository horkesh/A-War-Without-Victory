# AWWV Command Board

**Status — 2026-11-14:** Derived dispatch view. Main stands at 712/711/711/708 (Apr 1995 711 accepted after #583; Oct 1995 708 accepted after #604). The sequence is RF pre-freeze fidelity pass → ENGINE FREEZE → R8 qualifying packaged campaigns → R9. DC closed (#560); R6 and R7 closed (owner, 2026-11-08); the PS steps 1-6 are all merged and wait for the owner to close the lane. Superseded status prose: [status archive](../_old/plans/superseded/2026-10-27-master-roadmap-status-history.md#superseded-derived-command-board-status) and [roadmap archive](MASTER_ROADMAP_ARCHIVE.md#command-board-history-moved-2026-11-13).

**Authority:** [MASTER_ROADMAP.md](MASTER_ROADMAP.md) is the sole authority for unfinished work and wins if this board differs.

**Open gates:** [open_gates.yml](../open_gates.yml) enumerates every named gate and the evidence that would close it — `npm run gates` lists the open rows, and `tests/open_gates_register.test.ts` fails if a gate is claimed closed without evidence that exists. It is derived like this board; the roadmap still wins. The RF pass closes through `RF-CALIBRATION-RESIGNOFF` and `RF-ENGINE-FREEZE`.

## Activation

The owner activated full roadmap execution on 2026-07-31. Local implementation, tests, evidence, local commits, transient validation builds, documentation propagation, and non-destructive workspace maintenance are authorized within the roadmap. Signing, store upload, public release creation, and a public `1.0` tag remain outside that authority and require a separate explicit `Publish 1.0` instruction.

## Dispatch Queue

| Order | ID | Status | Next executable action | Plan |
|---:|---|---|---|---|
| 1-5 | R1-R5 | **COMPLETE — CLOSED** (R1 2026-08-01, R2 2026-08-03, R3, R4 2026-08-06, R5 2026-08-05) | None. | [R1](2026-07-31-seamless-command-room-map-transition-plan.md) · [R2](2026-07-31-rs-104week-friction-remediation-plan.md) · [R3](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) · [R4](2026-07-31-command-event-codex-convergence-plan.md) · [R5](2026-07-31-engine-quality-performance-stability-plan.md) |
| 6 | R6 | **CLOSED — owner, 2026-11-08** | None. Signed off 2026-11-06 at 712/711/712/710, live = headless. Main is now 712/711/711/708 (see RF). | [Calibration authority](../40_reports/CALIBRATION_MASTER.md) |
| 6.5 | RC | **PRE-1.0 NARROW SCOPE COMPLETE — CLOSED 2026-08-15** | None. D-topology is reserved post-1.0. | [Collapse build spec](../40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md) |
| 7 | R7 | **CLOSED — owner, 2026-11-08** | None. All 17 interface cues accepted, ambient beds retired for 1.0. | [Content/history/audio](2026-07-31-content-history-localization-audio-plan.md) |
| 7.5 | RE | **CLOSED — owner, 2026-09-01** | None. RE gates nothing; engine-health defects are still fixed before tuning. | [Closed RE contract](2026-08-26-engine-integrity-plan.md) |
| 7a | DC | **CLOSED 2026-11-12 — merged #560** | None. | [Handoff](../../handoffs/20261107_dayton_end_map_to_conference.md) |
| 7b | PS | **STEPS 1-6 ALL MERGED — READY FOR THE OWNER TO CLOSE** | Owner decision. Steps: #568, #579, #570, #572, #585, posture model #580. | [Posture plan](2026-11-12-posture-model-option2-stance-matters.md) |
| 7c | RF | **ACTIVE — pre-freeze fidelity pass** (roadmap §4.1, BC14-BC19) | Merge one item at a time, in this order, each re-measured on the one before: **BC14** 7th Corps (Phase A #590 merged; Phase B [#591](https://github.com/horkesh/A-War-Without-Victory/pull/591) draft, in diagnosis), **BC15** stance effects (SE4, SE2, SE7 merged in #604; SE6 held until SE10), **BC16** siege displacement path (§6 panel), **BC17** officer tenure data, **BC19** realism-audit fixes as triaged. **BC18** HVO-ARBiH 1993 war waits for an owner decision and, if built, goes last. Then `RF-CALIBRATION-RESIGNOFF` and `RF-ENGINE-FREEZE`. | Roadmap §4.1 (no separate plan) |
| 8 | R8 | **DRY RUNS NOW; QUALIFYING CAMPAIGNS AFTER THE ENGINE FREEZE** | Dry runs find product and harness faults and never count. After the freeze: three 24-turn shakedowns on one package, then three 188-turn campaigns with scored diaries, per-faction Save/load, same-input determinism, strict runtime/audio. | [Active plan](2026-07-31-full-campaign-electron-validation-plan.md#active-owner-priority--playerbot-capability-parity-2026-10-24) |
| 9 | R9 | **FREEZE WAITING ON R8; LIMITED PREPARATION AT §4.2** | Freeze an immutable RC, produce reproducible clean-machine evidence, and prepare publication inputs. | [Release candidate/gold](2026-07-31-release-candidate-gold-publication-plan.md) |

Non-calibration lanes (UI, copy, i18n, tooling, docs, CI) merge any time they are green, before or after the freeze. After the freeze, a calibration-moving change needs an owner OK.

## Current Critical Path

`RF (BC14 → BC15 → BC16 → BC17 → BC19; BC18 on the owner's decision) -> RF-CALIBRATION-RESIGNOFF -> RF-ENGINE-FREEZE -> R8 qualifying campaigns and diaries -> R9 -> owner says "Publish 1.0"`

**Finite closure register:** [Master §4.1](MASTER_ROADMAP.md#41-finite-behavior-closure-register-2026-09-07) owns BC01-BC10 (BC01, BC02, BC03, BC08 closed; BC04, BC05, BC06 packaged or campaign acceptance open; BC07 retention settled; BC09 Phase 1 reviewed GO with final acceptance deferred; BC10 planned) and the RF rows BC14-BC19. FIX means planned repair when scheduled; VERIFY/DISPOSITION needs bounded evidence. New findings never silently enlarge the register. Dated 2026-09 detail for BC05-BC09 now lives in the [roadmap archive](MASTER_ROADMAP_ARCHIVE.md#command-board-history-moved-2026-11-13).

## Fixed Decisions

- Five presidential levers; Decision Room owns action.
- Posture is the commanders' to set; the president approves or declines proposals (posture model option 2, owner 2026-11-12).
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

This board becomes all green only when R1-R9, RC, and RE satisfy the [master definition of program completion](MASTER_ROADMAP.md#12-definition-of-program-completion). Prepared for publication and published are separate states.
