# AWWV Command Board

**Status — 2026-11-15:** Derived dispatch view. Main stands at 709/709/708/681 after #591 RF-1 Phase B (the ARBiH 7th Corps forms at week 99; the one lost cell is Oborci in October 1995, a timing loss; recorded under the hold). Before it #647 RF-L3d gave 709/709/708/682 (the commander no longer adopts queued pre-planned operations), #636 gave 712/705/706/676 (the October 1995 ceasefire binds) and #619 RF-AI2 gave 712/705/706/698 (owner accepted 2026-11-14); earlier accepted moves #583, #604, #600; RF-F1 #617 changed no checkpoint. The sequence is RF fidelity pass (mechanics) → ENGINE FREEZE → ONE calibration pass → R8 qualifying packaged campaigns → R9; calibration is held until the freeze (owner, 2026-11-14). DC closed (#560); R6 and R7 closed (owner, 2026-11-08); PS closed by the owner on 2026-11-14 (steps 1-6 all merged). Superseded status prose: [status archive](../_old/plans/superseded/2026-10-27-master-roadmap-status-history.md#superseded-derived-command-board-status) and [roadmap archive](MASTER_ROADMAP_ARCHIVE.md#command-board-history-moved-2026-11-13).

**Authority:** [MASTER_ROADMAP.md](MASTER_ROADMAP.md) is the sole authority for unfinished work and wins if this board differs.

**Open gates:** [open_gates.yml](../open_gates.yml) enumerates every named gate and the evidence that would close it — `npm run gates` lists the open rows, and `tests/open_gates_register.test.ts` fails if a gate is claimed closed without evidence that exists. It is derived like this board; the roadmap still wins. The RF pass closes through `RF-CALIBRATION-RESIGNOFF` and `RF-ENGINE-FREEZE`.

## Activation

The owner activated full roadmap execution on 2026-07-31. Local implementation, tests, evidence, local commits, transient validation builds, documentation propagation, and non-destructive workspace maintenance are authorized within the roadmap. Signing, store upload, public release creation, and a public `1.0` tag remain outside that authority and require a separate explicit `Publish 1.0` instruction.

## Dispatch Queue

| Order | ID | Status | Next executable action | Plan |
|---:|---|---|---|---|
| 1-5 | R1-R5 | **COMPLETE — CLOSED** (R1 2026-08-01, R2 2026-08-03, R3, R4 2026-08-06, R5 2026-08-05) | None. | [R1](2026-07-31-seamless-command-room-map-transition-plan.md) · [R2](2026-07-31-rs-104week-friction-remediation-plan.md) · [R3](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) · [R4](2026-07-31-command-event-codex-convergence-plan.md) · [R5](2026-07-31-engine-quality-performance-stability-plan.md) |
| 6 | R6 | **CLOSED — owner, 2026-11-08** | None. Signed off 2026-11-06 at 712/711/712/710, live = headless. Main is now 709/709/708/681 (see RF). | [Calibration authority](../40_reports/CALIBRATION_MASTER.md) |
| 6.5 | RC | **PRE-1.0 NARROW SCOPE COMPLETE — CLOSED 2026-08-15** | None. D-topology (the neighbour-loss cascade) is dropped (orchestrator, 2026-11-16). | [Collapse build spec](../40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md) |
| 7 | R7 | **CLOSED — owner, 2026-11-08** | None. All 17 interface cues accepted, ambient beds retired for 1.0. | [Content/history/audio](2026-07-31-content-history-localization-audio-plan.md) |
| 7.5 | RE | **CLOSED — owner, 2026-09-01** | None. RE gates nothing; engine-health defects are still fixed before tuning. | [Closed RE contract](2026-08-26-engine-integrity-plan.md) |
| 7a | DC | **CLOSED 2026-11-12 — merged #560** | None. | [Handoff](../../handoffs/20261107_dayton_end_map_to_conference.md) |
| 7b | PS | **CLOSED — owner, 2026-11-14** | None. Steps: #568, #579, #570, #572, #585, posture model #580. | [Posture plan](2026-11-12-posture-model-option2-stance-matters.md) |
| 7c | RF | **ACTIVE — pre-freeze fidelity pass, INTAKE CLOSED, NO ENGINE CHANGE AFTER 1.0** (roadmap §4.1, BC14-BC19) | Owner, 2026-11-15: no engine change follows 1.0, and a finished game reproduces history if left alone while the player can still create ahistorical outcomes. Every engine finding is fixed, retired or accepted as final (Fable consult 2, revision 2, accepted by the orchestrator). **Batch A, §6 displacement** (RF-ROSTER lane): RF-PM1, RB1, RB9, RB2, SD7, SD9, SD11, SD12, then SD13 and SD10 re-measured, and A10 (RB8's root, the refuge definition). **Batch B, officers and politics** (Batch B lane): first the peace-plan floor (B0, a must-fix: emergent RS accepts Vance-Owen at week 40), then retire the autonomous-launch gate, linear competence decay, the officer-event queue, retire the bot-only directive producer, Wave 6 coupling and RS overlay. **Batch C, singles** (L7 lane; C4 and C6 to the UI lane): F7, SE9, RB8, RB6, CODE4, the identity-card week, the PK5 queue head, F1i. **Emergent triage (E1)** after B0: a hands-off emergent 188-week run, freeze condition 7 (owner, 2026-11-16: the improvising mode ships and stays the default). **The 1994-95 attack and defence package** (F1g lane, P0 to P6): the #686 trace and the dead-site retirements, a defence trace, the defence repair (Fable consult 3 and addendum, no new mechanic: the complete `dig_in` posture rule, the army-reserve repair, a retake-only counter-attack, stance coherence; the Lašva stranding fix; the EH-3 Path C respawn needs a disposition), planner odds (AI1, RF-L3d follow-ups, VRS operations reaching battle, F2), RF-STRENGTH's live change, the probe gate (the ARBiH plan lockout), RF-PK; the Farz and enclave guards pass at every merge. **Parts 3 and 4, before 1.0 (the freeze may come first, each proving the hash unchanged):** player-path fixes and inert retirements. **Part 5:** five items accepted as final (CODE3, RB5 for an active player, PK5, SD6 and SD8, and the six static BC06 gesture rows), in the [final-behaviour record](../40_reports/governance/20261115_FINAL_BEHAVIOUR_AT_1_0.md). The freeze is a byte test (an unchanged 188-week `final_state_hash` merges freely; a moved hash needs the owner's OK; 518de17970af5914 is the main hash at #677, not the freeze hash), with the seven conditions in `RF-ENGINE-FREEZE`. Merged and closed: **BC14** 7th Corps (Phase A #590, Phase B [#591](https://github.com/horkesh/A-War-Without-Victory/pull/591), 709/709/708/681), **BC15** stance effects (SE4, SE2, SE7 in #604; SE6 parked at its tag until the defence repairs decide), **BC16** siege displacement path (#600, 712/709/710/705), **BC18** decided 2026-11-14 (A merged, B merged as [#623](https://github.com/horkesh/A-War-Without-Victory/pull/623), C post-1.0 by the owner's decision), **BC19** merged so far (F1 #617, RF-AI2 #619, RF-F1g #667, F1a and F1c retired in #672 and #683, RF-L3d #647, RF-ROSTER #677, SE7E-h #685, the corps_plan trace #686, F7 #690, CODE4 #691). The corps succession mechanism (command-loop L4, empty schedule) merged in #640 with an empty roster, so it is inert; its dates go in the calibration pass (owner, 2026-11-14 evening). Scores are recorded per change, not a merge bar (owner, 2026-11-14). Then `RF-ENGINE-FREEZE`, the one calibration pass and `RF-CALIBRATION-RESIGNOFF`. | Roadmap §4.1 (no separate plan) |
| 7d | Held | **HELD UNTIL THE ENGINE FREEZE (owner, 2026-11-14)** | Pure calibration waits for the one calibration pass: data, constant and op tuning toward the checkpoints, tail-cell timing, **BC17** officer tenure data (RF-4) as a lever. Guards, health, determinism, anchors and one change per run still apply. | Roadmap §4.1 |
| 8 | R8 | **DRY RUNS NOW; QUALIFYING CAMPAIGNS AFTER THE ENGINE FREEZE** | Dry runs find product and harness faults and never count (first RBiH dry run recorded in #622). The PK1 fix (#631) and EV1 (#621) are merged and R8 strategic runs use level 2; all earlier R8 strategic runs ran at autonomy 1. After the freeze: three 24-turn shakedowns on one package, then three 188-turn campaigns with scored diaries, per-faction Save/load, same-input determinism, strict runtime/audio. | [Active plan](2026-07-31-full-campaign-electron-validation-plan.md#active-owner-priority--playerbot-capability-parity-2026-10-24) |
| 9 | R9 | **FREEZE WAITING ON R8; LIMITED PREPARATION AT §4.2** | Freeze an immutable RC, produce reproducible clean-machine evidence, and prepare publication inputs. | [Release candidate/gold](2026-07-31-release-candidate-gold-publication-plan.md) |

Non-calibration lanes (UI, copy, i18n, tooling, docs, CI) merge any time they are green, before or after the freeze. After the freeze, a calibration-moving change needs an owner OK.

Command-loop lanes (proposal [#632](https://github.com/horkesh/A-War-Without-Victory/pull/632), owner decisions of 2026-11-14 evening in its §7): wave 1 L1 review chip, L2 and L2h weekly dispatch, L3 and L3b defensive operations without a signature, L4 corps succession mechanism (the only measured one); wave 2 L5 dossiers and L6 Authority prices; wave 3 L7 army clashes; L8 succession dates belong to the calibration pass. L1 ([#639](https://github.com/horkesh/A-War-Without-Victory/pull/639)), L2 and L2h ([#643](https://github.com/horkesh/A-War-Without-Victory/pull/643)), L3, L3b and L3c are merged ([#642](https://github.com/horkesh/A-War-Without-Victory/pull/642), [#645](https://github.com/horkesh/A-War-Without-Victory/pull/645)); L4 ([#640](https://github.com/horkesh/A-War-Without-Victory/pull/640), empty roster) and L5 ([#653](https://github.com/horkesh/A-War-Without-Victory/pull/653), dossiers) are merged, as are RF-L3d (#647) and the UI follow-ups (OSM credit #649, order_refused copy #650, PK3 and F1e #651). Ending polish ([#655](https://github.com/horkesh/A-War-Without-Victory/pull/655), §6 record) and the sustainability projection (#656) are merged. L6 ([#661](https://github.com/horkesh/A-War-Without-Victory/pull/661), Authority prices, inert in headless) is merged but its at-cap target was not met (Authority sat at its cap 78 of 78 turns): re-measure after L7, owner decision if still non-binding. #660 (dispatch names lost formations) and #662 (event source notes) are merged. L7 ([#670](https://github.com/horkesh/A-War-Without-Victory/pull/670), army clashes: Accept, Insist, Replace) is merged and ratified (game-designer and canon-compliance; record `docs/40_reports/governance/20261115_AUTHORITY_DESIGN_RATIFICATION.md`), followed by renewable gestures ([#673](https://github.com/horkesh/A-War-Without-Victory/pull/673), a cooldown, no lifetime cap). Next in the L6 lane: the two-President test replaces the 25% target, then the L6 re-measure. RF-F1g ([#667](https://github.com/horkesh/A-War-Without-Victory/pull/667)) and RF-1 Phase B (#591) are merged; RF-ROSTER (#677), the SE7E-h validator fix (#685) and the corps_plan trace (#686) are merged, and the ARBiH plan lockout and RF-STRENGTH belong to the F1g lane's 1994-95 package (BC19 Part 2). The UI lane merged #663 (counterfactual default label), the Patriarch Paper date and distanceFromHistory ([#665](https://github.com/horkesh/A-War-Without-Victory/pull/665)). Citation sweeps ([#671](https://github.com/horkesh/A-War-Without-Victory/pull/671), [#674](https://github.com/horkesh/A-War-Without-Victory/pull/674)) and the Dayton retitle ([#669](https://github.com/horkesh/A-War-Without-Victory/pull/669)) are merged; the audit behind them found 68% of the Prlić hidden-text citations wrong and, in sweep 2, only 9 of 181 holding. Also merged: #672 (the dead corridor-breach pass retired, byte-identical), #675 (the t73 hard-stuck Advance: a recalled elite sent to a base the enemy holds), #676 (Prlić hidden fixes), #678 (gestures cost 20 Authority, a held step), #680 (the Brčko Tactical Group relocates only onto held ground), #682 (three test Presidents in the desktop harness), #683 (the emergency defensive operation retired, byte-identical), #684 (player-visible truth fixes after the citation audit) #687 (citation audit batch 2), #689 (re-pin of two identity contracts, string-only), #690 (F7, control-identical), #691 (CODE4, byte-identical), #681 (the freeze cut) and #692 (the emergent-mode ruling). The Batch B lane is running (own worktree, B0 first). The §6 ghost-entries lane (19 untranslated BCS sidecars, paramilitary gates) is PAUSED for an owner decision: a model safeguard flag stopped its panel seats. They merge in the proposal's order, not as a competing queue.

## Current Critical Path

`RF (Part 1 batches A, B and C; Part 2 the 1994-95 package; Parts 3 and 4 may follow the freeze, before 1.0; BC17 held for the calibration pass; intake closed) -> RF-ENGINE-FREEZE (a byte test) -> ONE calibration pass (RF-CALIBRATION-RESIGNOFF, incl. BC17) -> R8 qualifying campaigns and diaries -> R9 -> owner says "Publish 1.0"`

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
