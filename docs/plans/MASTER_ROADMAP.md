# A War Without Victory — Master Roadmap

**Current state — 2026-11-15:** Main stands at **709/709/708/681** out of 712 (January 1993, April 1994, April 1995, October 1995) on headless 188 turns, strict health PASS, after #591 (RF-1 Phase B, the ARBiH 7th Corps forms at week 99; measured and recorded under the hold; the one lost cell is Oborci in October 1995, a one-week tail slip because the Donji Vakuf 95 captures land at t183-184 and the ceasefire binds first; guards intact, baselines re-blessed). Before it, #647 (RF-L3d: the commander no longer adopts queued pre-planned operations; the lost cells were matches the defect bought) gave 709/709/708/682, #636 (the October 1995 ceasefire binds) gave 712/705/706/676 and #619 (RF-AI2) gave 712/705/706/698 (owner accepted 2026-11-14). The owner signed off 712/711/712/710 under `live-equivalent-desktop-v1` on 2026-11-06. Accepted moves: #583, #604, #600 and #619. Under the calibration hold (owner, 2026-11-14) later scores are recorded, not chased. Brka and Ilijaš Krivajevići stay open by owner direction and are not calibration levers. Per-move detail is in the archive ([pass 7](MASTER_ROADMAP_ARCHIVE.md#merged-list-and-current-state-narrative-moved-2026-11-14-steward-pass-7), [pass 8](MASTER_ROADMAP_ARCHIVE.md#merged-list-and-current-state-narrative-moved-2026-11-14-steward-pass-8)). See the [calibration master](../40_reports/CALIBRATION_MASTER.md).

**Merged since 2026-11-12:** the freeze cut and work list (#681) and the emergent-mode ruling (#692); the re-pin of `rbih_state_identity` and `rbih_paramilitary_policy_1992` (#689, string-only, three seats; the pinned-contract allowlist is empty); F7, false supply-reserve events no longer fire where the reserve model is off (#690, control-identical; the headless `final_state_hash` moved to 799e43a7ee2f4764, state only, the main hash at #690); the CODE4 tie-break (#691, byte-identical); F7b, the Army HQ plan's unread army stance and aggression modifier and the three theater statuses that fed them retired, with the reserves-off supply bug (#696, control-identical: 0 cells differ at w39, w104, w156 and w188, all 251 control events identical, scores unchanged; the headless `final_state_hash` is now 70f4dc05bf375bc7, state only, the six retired fields, the main hash at #696; save-compatibility test included); package P0, `coordinateMultiCorpsOffensive` retired (#694, all 8 artifacts byte-identical, so the headless `final_state_hash` stays 799e43a7ee2f4764; it also removes an override of a President's accepted stance, a player-path fix); citation audit batch 3 (#695); the `address_to_nation_rbih` closing line made year-neutral (#698, string only); the corps_plan and corps_exhaustion receipts (#686, default off, byte-identical: they showed the ARBiH plan lockout is the exhaustion gate fed by the corps' own probes); RF-ROSTER, army-chief stubbornness comes from the roster (#677; 709/709/708/681, outcome-identical; the headless `final_state_hash` moved from 19262a0b19df1567 to 518de17970af5914 on officer state values only; 518de17970af5914 is the main hash at #677, not the freeze hash); the Brčko Tactical Group relocates only onto held ground (#680, latent behind its flag, byte-identical); the SE7E-h run validator counts a relief already in transit (#685, validator only, consistency back to 0); the emergency defensive operation retired (#683, byte-identical); player-visible truth fixes after the citation audit, `rbih_state_identity` re-pinned and the identity card tolerant of wording drift (#684, hash unchanged); citation audit batch 2 (#687); three test Presidents in the desktop harness (#682, tooling); the presidential gestures cost 20 Authority, a held step (#678); the Prlić hidden-text citation fixes, batch 1 (#676); the corridor-breach pass retired, byte-identical (#672); a recalled elite never returns to a base its side has lost, the t73 live-game freeze (#675); the ARBiH 7th Corps, RF-1 Phase B (#591, 709/709/708/681, FORAWWV §XIII.1 amended 4/4; registers SE7E-h, fixed in #685, and the ARBiH plan lockout (army-wide), first filed as RF-3C-EXH, now in the 1994-95 package); Earlier items (#670, #673, #667, #665, #663, #669, #671, #674, #666, #668, #661, #660, #657, #655, #656, #647, #640, #653, #649 to #651, #654, #635, #636, #625, #639, #643, #642, #645, #641, #623, #619, #631, #621, #632, #633, #634, and #629, #628, #618, #630, #614, #622, #617, #616, #620, #615, #600, #604 with SE6 held at `archive/claude/stance-effects-se6`) are in the archive.

**Sequence — 2026-11-14:** RF fidelity pass (mechanics, §4.1, BC14-BC19) → ENGINE FREEZE → ONE calibration pass → R8 qualifying campaigns → R9. The freeze is condition-based, not dated (owner, 2026-11-13), and a byte test (orchestrator ruling 2026-11-15, Fable consult 2): from the frozen commit a change merges freely if the 188-week headless `final_state_hash` is unchanged, and a change that moves the hash needs the owner's OK. Owner, 2026-11-15: no engine change follows 1.0, and everything after it is an add-on, so every engine finding is fixed before the freeze, retired, or accepted as final with a written reason (the "post-1.0" tag is gone). Only a change that moves the hash must precede the freeze; inert retirements and player-path fixes may follow it, before 1.0, each proving the hash unchanged. The intake is closed by the four criteria in BC19, and every new finding gets fix, retire or accept-as-final, with a one-line reason, when it is filed. Owner, 2026-11-14: hold calibration until the other changes are done. Checkpoint scores are recorded on every RF change but are not a merge bar; pure calibration (data, constant or op tuning toward the checkpoints, tail timing, RF-4 officer dates as a lever) is held for the calibration pass. Guards, health, determinism, anchors and one change per run are unchanged, and a guard breach still stops a merge. Gates: `RF-ENGINE-FREEZE` and `RF-CALIBRATION-RESIGNOFF` in [open_gates.yml](../open_gates.yml). The 2026-10-27 owner scope ruling and the status prose it governed are preserved in the [archive](MASTER_ROADMAP_ARCHIVE.md#roadmap-header-prose-moved-2026-11-13).

**Owner delegation — 2026-10-06:** Codex is the approval authority for routine
work within the current goal and drives prioritization, implementation, targeted
validation/correction and integration against unchanged criteria. Routine
approvals must not return to the owner. Surface substantive decisions about the
goal, acceptance criteria, canon/protected boundaries, material scope/cost
tradeoffs or irreversible/external actions with concrete options and a
recommendation. Required evidence, review panels and cost-control gates remain.

**Authority:** This file is the sole source of truth for unfinished product work.

**DC — Dayton conference redesign. CLOSED 2026-11-12 (#560).** It no longer blocks R8; plan and gates are in §5.

**R8 — packaged player campaigns.** Players reach the bots' calibration through ordinary play (owner priority, 2026-10-24). What remains is the packaged-Electron evidence in the [Electron-validation plan](2026-07-31-full-campaign-electron-validation-plan.md): three 24-turn shakedowns (RBiH, RS, HRHB) on one fresh package, then three full 188-turn campaigns with diaries, per-faction Save/load, same-input determinism and strict runtime/audio. The [player hard gates](2026-07-31-full-campaign-electron-validation-plan.md#player-campaign-acceptance-contract--owner-decision-2026-10-24) still apply. Qualifying runs start after the engine freeze; no qualifying campaign has run yet.

**Execution view:** [COMMAND_BOARD.md](COMMAND_BOARD.md) is a derived convenience view; this roadmap wins if they differ.

**Plan index:** [README.md](README.md)

**Open gates:** [open_gates.yml](../open_gates.yml) — named gates and their evidence, checked by `npm run gates`. Derived; this roadmap wins.

## ★ PROBE CHANNEL — CLOSED 2026-08-26. Scope: `docs/plans/2026-08-26-probe-channel-scope.md`

Two owner rulings bind downstream work: a besieged corps still does not mount offensives, and **do not re-raise "the war is too quiet" as a defect**. Full text and evidence: [archive](MASTER_ROADMAP_ARCHIVE.md#probe-channel-section-moved-2026-11-14) and the [closed probe scope](2026-08-26-probe-channel-scope.md).

---

## Current Execution Snapshot (2026-11-13)

- **Calibration runs on top of engine health, never instead of it.** The baseline authority is [CALIBRATION_MASTER.md](../40_reports/CALIBRATION_MASTER.md), not this file.
- **Lane order: RF → ENGINE FREEZE → ONE calibration pass → R8 qualifying campaigns → R9.** DC closed (#560), RD closed, R6 and R7 closed by the owner on 2026-11-08; RC's narrow pre-1.0 packet and RE are closed. Section 5 carries each lane's verdict and plan link; §4.1 carries the RF items.
- **Open gates are enumerated in [open_gates.yml](../open_gates.yml)**, not in prose here. Run
  `npm run gates`.
- **Publication boundary unchanged.** Signing, store upload, public release creation and a public
  `1.0` tag remain outside roadmap execution authority and require a separate explicit
  `Publish 1.0` instruction.

Dated execution detail through 2026-09-07 — unscheduled work records, the superseded jan1993 floor
breach, BC08, canon landed this cycle, and historical RE/probe evidence — is retained verbatim in
[MASTER_ROADMAP_ARCHIVE.md](MASTER_ROADMAP_ARCHIVE.md#current-execution-snapshot-2026-09-07-archived-2026-09-10).

## 1. Outcome

Ship a historically grounded, deterministic, polished 1.0 in which the player can move through:

`Desk -> Decision Room -> evidence/map/Army HQ -> decision or explicit hold -> Advance`

without hidden required work, long unexplained decision droughts, map-entry stalls, duplicate operational systems, unsupported historical claims, or release-only surprises.

The program is now finite:

- nine executable product workstreams, R1–R9, the closed RC gate, and the inserted RE gate;
- one plan per R1–R9 workstream and one sole reduced RE contract, with RC evidence linked separately;
- one dependency order;
- no unresolved RE or probe choice silently blocks execution; deferred items are explicit;
- evidence-led adopt-or-retire branches where an experiment may legitimately fail;
- external signing credentials and publication authority treated as inputs, not design questions.

Prior roadmap history remains in Git before this consolidation and in [PROJECT_LEDGER.md](../PROJECT_LEDGER.md), [PROJECT_LEDGER_KNOWLEDGE.md](../PROJECT_LEDGER_KNOWLEDGE.md), and the [D2 owner-diary closeout](../40_reports/implemented/20260731_D2_OWNER_DIARY_REMEDIATION_AND_REPOSITORY_CLOSEOUT.md). It is not duplicated here.

## 2. Authority and Activation

The owner activated complete roadmap execution on 2026-07-31. That authorizes local implementation,
tests, evidence, local commits, transient validation builds, documentation propagation, and
non-destructive workspace maintenance within each plan's scope. It does not authorize remote push
or final merge.

Signing, store upload, public release creation, and a public `1.0` tag remain unauthorized until the owner separately says `Publish 1.0` (or equally explicit wording). Transient local/directory Electron builds and immutable release-candidate evidence remain authorized where R8/R9 require them.

| Owner instruction | Autonomous authority granted |
|---|---|
| `Execute the master roadmap` | Implement R1–R9 and the inserted RE gate in the recorded dependency order; create/reuse isolated `codex/` worktrees; edit in-scope source/docs/tests/data; run research and verification; make local commits; create transient unpacked/directory Electron builds needed for validation. |
| An explicit named workstream, such as `Execute R3` | Perform that workstream and its required prerequisite checks only. |
| `Publish 1.0` or equally explicit wording | After R9 readiness is green, use supplied secure credentials, sign/notarize, upload, push the release branch/tag, and change public release state. |

`Execute the master roadmap` does **not** authorize a remote push, public tag, signing, store upload, installer publication, or public release. Those remain behind the separate publication instruction because they affect external systems and are difficult to undo.

## 3. What “No Gates” Means

The old queue repeatedly stopped for an owner verdict even when research, canon, code, or a bounded experiment could resolve the issue. Those pauses are removed.

The following are no longer allowed:

- “ask the owner which design option to use” when this roadmap already chooses one;
- “wait for historian approval” with no stated evidence rule;
- “tune until it feels right” with no adoption criteria;
- “refresh the baseline” merely because output changed;
- “invent a decision” to fill a quiet historical interval;
- keeping a residual lane alive after it has an adopt-or-retire result.

The following safeguards remain mandatory:

- failing tests, determinism, conservation, migration, accessibility, security, historical-substantiation, or clean-package criteria stop the faulty change;
- unexplained baseline drift is investigated, never re-blessed automatically;
- unsupported historical claims and identities are omitted;
- secrets and signing credentials never enter the repository;
- external publication waits for `Publish 1.0`;
- `docs/10_canon/FORAWWV.md` is not edited by this roadmap.

These are verification barriers and authority boundaries, not unresolved product choices.

## 4. Program Sequence

**Current sequence (2026-11-14):** RF mechanics (BC14-BC19 below) -> ENGINE FREEZE -> ONE calibration pass -> R8 qualifying packaged campaigns -> R9. DC closed (#560); R7 closed 2026-11-08. RF items merge one at a time, each measured on top of the one before (scores recorded, not a bar); order BC14, BC15, BC16, BC19 as triaged, BC18 last if built; BC17 is held for the calibration pass.
Final calibration was signed off on 2026-11-06 and the owner closed the lane; D1 and BC04's current owner/panel conditions remain intact.

### 4.1 Finite behavior-closure register (2026-09-07)

**Current disposition:** BC01/02/03/08 CLOSED; BC04 campaign acceptance and BC05–BC06 open; BC07 retention settled.
BC09 Phase 1 locally implemented and reviewed (GO), final acceptance deferred. BC10 planned.

**BC02:** CLOSED 2026-09-07; Electron load/display only. No campaign or calibration change. BC03 CLOSED; BC04 P1 is implemented/reviewed with campaign acceptance deferred to next calibration (clean before/after retained; P1 repeat/ON companion retired); P2 implemented/reviewed; campaigns deferred.

**Register authority; completed and separately scheduled work is identified above.** These IDs index existing work, not milestones or a new lane.
FIX means planned repair **when scheduled**, not authority to implement. VERIFY/DISPOSITION means
bounded evidence followed by an accepted fix, proof of no relevant effect, or evidenced release
exclusion. D1 HOLD FOR R8 remains. R1–R5, the accepted R6 slice, RC and RE stay closed; calibration
closed on 2026-11-06. [Detailed acceptance and sources](2026-07-31-full-campaign-electron-validation-plan.md#behavior-closure-acceptance-detail-2026-09-07)
live in the existing R8 plan; its previously proposed B10–B13/F1 are now registered, not scheduled.

| ID / existing home | Owner | Impact / pre-freeze disposition |
|---|---|---|
| BC01 player opportunities / R8 | Gameplay/operations + Game Designer + QA | **CLOSED — owner accepted repair and retired territory similarity (2026-09-07).** |
| BC02 B2/B9 sector/rating truth / R8 | Systems + QA | **CLOSED — verified 2026-09-07.** |
| BC03 B10 narrated Dayton / R8 | Events/systems + Game Designer + QA | **CLOSED 2026-09-07** — termination owner/COHA/signing repaired and verified; post-horizon acceptance deferred by the owner. |
| BC04 B11 chronology + P1/P2 / R8/panel | Historian + systems + calibration + independent §6 panel | **P1/P2 IMPLEMENTED/REVIEWED; campaign acceptance deferred.** Preserve attribution and retired P1 repeat/ON runs; barracks stagger excluded. Ratified P2 targets and panel amendment: [BC04 evidence](2026-07-31-full-campaign-electron-validation-plan.md#bc04-bounded-implementation-plan--2026-09-07). |
| BC05 B12 NATO/Lukavac gates / R8 | Events/systems + Historian + QA | **NATO fixed (`0690a47ea`); Lukavac removed; reviewed GO.** Trnovo remains calibration-owned. Campaign/downstream acceptance open. [Evidence](2026-07-31-full-campaign-electron-validation-plan.md#bc05-bounded-nato-repair-and-lukavac-disposition--2026-09-07). |
| BC06 B13 posture/gestures / R8 | Gameplay/desktop + Game Designer + QA | **Local repairs reviewed GO; design disposed 2026-09-08.** The six address and decoration rows stay static, accepted as final on 2026-11-16 by a game-designer and historian sitting (gestures are renewable since #673, so the five-use stages no longer mean anything; record in the final-behaviour record); packaged acceptance open. [Repairs, live proof and disposition](2026-07-31-full-campaign-electron-validation-plan.md#bc06-bounded-posture-and-gesture-repair--2026-09-07). |
| BC07 stability divergence / calibration-data | Asset/data integration + Systems + calibration | **DISPOSED — RETAIN (GO).** Hybrid/ethnic bypass master stability; mode-less operational starts can consume it. Preserve committed values; no regeneration/repaint. [Disposition](2026-07-31-full-campaign-electron-validation-plan.md#bc07-stability-data-disposition--2026-09-08). |
| BC08 inherited test residual / verification | QA + owning Systems/Game Design | **CLOSED — verification/disposition.** [Receipt](../40_reports/audits/20260907_BC08_CURRENT_ENGINE_HEALTH_VERIFICATION.md). |
| BC09 shared production inputs / R8 | Systems + QA | **LOCAL PACKET REVIEWED (GO).** [Phase 1 evidence](2026-09-07-r8-runtime-input-ai-integrity-plan.md): shared validation; real IPC 25/25 and one-turn baseline bytes match. Final acceptance deferred; BC07 policy separate. |
| BC10 optional AI ownership/replay / R8 | Commander + Systems + QA | **PLANNED:** [runtime packet Phase 2](2026-09-07-r8-runtime-input-ai-integrity-plan.md). Canonical commander owns final emit; recorded inputs replay without API calls. Cadet preserved; required Phase 0 review before code. |
| BC14 RF-1 ARBiH 7th Corps / RF | Calibration + Historian + Corps/Operations + scenario-creator-runner-tester; Pyrrhic merge gate | **MERGED — PHASE A ([#590](https://github.com/horkesh/A-War-Without-Victory/pull/590), inert) AND PHASE B ([#591](https://github.com/horkesh/A-War-Without-Victory/pull/591), 709/709/708/681).** The corps forms at week 99 with 12 brigades from the 3rd Corps (11 move in the measured run; the 706th is destroyed at t31); Alagić is seated once by a `commander_handover` that never displaces a commander the President chose. FORAWWV §XIII.1 amended (row-level `strict_available_from`, panel 4/4). Guards held (enclave 9/9, Farz pass, cascade 31 = main), strict health PASS. The one lost cell, Oborci in October 1995, is a timing loss (the Donji Vakuf 95 captures land a week late and the ceasefire binds first); it goes to the Donji Vakuf timing item, never to a restored 7C5. **Open registers from the merge:** SE7E-h (the validator did not count a march under way, so consistency read 1 against 0 for the Prusac sector; fixed in #685, validator only); the ARBiH plan lockout (army-wide) (first filed as RF-3C-EXH: after the split the 3rd Corps made 1 commander plan against 12 on main, and the seats found the lockout covers the whole ARBiH army; the trace (#686) shows the corps' own probes add 5 exhaustion each and keep it above the planning gate of 30, and the probe gate designed at 40 was never wired; the post-split Ozren/Teslić matches and the Farz P-B pass depend on it; it is fixed in the 1994-95 package, BC19 Part 2 (step P5), after the defence repairs that precede it); Alagić still dies on the tenure clock near t168, which the dated corps schedule (L8, calibration pass) fixes. Run history in the [archive](MASTER_ROADMAP_ARCHIVE.md#merged-list-and-current-state-narrative-moved-2026-11-14-steward-pass-7). |
| BC15 RF-2 stance effects / RF | Calibration + Historian + Corps/Operations + scenario-creator-runner-tester; Pyrrhic merge gate | **PARTLY MERGED — SE4, SE2 and SE7 in [#604](https://github.com/horkesh/A-War-Without-Victory/pull/604) (Oct 1995 708 accepted); SE6 HELD.** The stance engine bundle merged in [#583](https://github.com/horkesh/A-War-Without-Victory/pull/583). #604 added local "enemy massing" (SE4), the commander loop as the only OG-stance writer (SE2) and a validator fix (SE7). SE6 (stance-based entrenchment) is parked at `archive/claude/stance-effects-se6`; SE10 then SE6 are candidates for the defence repairs of the 1994-95 package (BC19 P2), decided by the measured result of the P2 steps; SE9 is a batch C fix, SE11 (the corps-wide "offensive prep" label) is due before R8 qualifying, and the SE8 live = headless re-check is the measurement now running (RBiH, autonomy 2). Detail in the [archive](MASTER_ROADMAP_ARCHIVE.md#merged-list-and-current-state-narrative-moved-2026-11-14-steward-pass-7). One calibration change per measured run. |
| BC16 RF-3 siege displacement path / RF, §6 | Calibration + Historian + §6 panel (unanimous independent seats) | **MERGED — [#600](https://github.com/horkesh/A-War-Without-Victory/pull/600) (712/709/710/705, owner accepted 2026-11-14).** Attribution merged earlier in [#587](https://github.com/horkesh/A-War-Without-Victory/pull/587). #600 revives the siege path on the OSID front at a sourced 0.1% a week and sets Bosniak flight abroad at displacement (F4b). §6 panel unanimous GO ([record](../40_reports/implemented/20261114_SIEGE_DISPLACEMENT_PANEL.md)). Open follow-ups: SD15, SD10, SD13, DA3; detail in the [archive](MASTER_ROADMAP_ARCHIVE.md#merged-list-and-current-state-narrative-moved-2026-11-14-steward-pass-7). |
| BC17 RF-4 officer tenure data / RF | Historian + Calibration (data) | **HELD FOR THE CALIBRATION PASS (owner, 2026-11-14).** Officer dates are a calibration lever, so RF-4 waits for the engine freeze. The one exception (owner, 2026-11-14 evening): the corps succession mechanism (command-loop lane L4) merged in [#640](https://github.com/horkesh/A-War-Without-Victory/pull/640) with an empty roster, so it is inert (FORAWWV §X.3 panel unanimous); its dates go in the calibration pass (L8), which must also stamp the deferred run-provenance entry (17 → 18). The [#594](https://github.com/horkesh/A-War-Without-Victory/pull/594) write-up ([succession dates](../40_reports/20261113_ARMY_CO_SUCCESSION_DATES_AND_STALE_LINES.md)) has the weeks; detail in the [archive](MASTER_ROADMAP_ARCHIVE.md#merged-list-and-current-state-narrative-moved-2026-11-14-steward-pass-7). |
| BC18 RF-5 HVO-ARBiH 1993 war / RF | Owner decision, then Calibration + Historian + §6 panel | **DECIDED by the owner, 2026-11-14: A now, B before 1.0, C after 1.0.** The diagnosis ([proposal](../40_reports/proposals/20261114_HVO_ARBIH_WAR_DIAGNOSIS.md), merged in #598) found HVO-against-Bosniak displacement of 1,279 against 43,267 the other way in 188 weeks (DA2). **A** (truthful 1993 HVO-ARBiH event cards, copy only) is merged ([record](../40_reports/implemented/20261114_HVO_ARBIH_TRUTHFUL_CARDS_PANEL.md)). **B** (bilateral displacement, bot-only policy expulsion) is merged as RF-5B ([#623](https://github.com/horkesh/A-War-Without-Victory/pull/623)). **C** (the HVO-ARBiH military war) is a post-1.0 add-on candidate: opt-in content that must not change 1.0's base-game engine behaviour (the owner's 2026-11-14 decision, read with the 2026-11-15 rule that only add-ons follow 1.0). Nothing in BC18 is open before the freeze. |
| BC19 RF-6 realism-audit fixes / RF | scenario-creator-runner-tester + historian + orchestrator triage | **AUDIT REPORT MERGED ([#596](https://github.com/horkesh/A-War-Without-Victory/pull/596)); F1 MERGED ([#617](https://github.com/horkesh/A-War-Without-Victory/pull/617)); INTAKE CLOSED; EVERY ITEM IS FIX, RETIRE OR ACCEPT AS FINAL (orchestrator, 2026-11-15; Fable consult 2, revision 2).** [Report](../40_reports/proposals/20261114_PRE_1_0_REALISM_AUDIT.md): 15 findings. F1 is closed in #617 ([sweep](../40_reports/implemented/20261114_RF_F1_SID_SWEEP.md)). F4 went into BC16; F6 copy, F9 and F10 merged in [#602](https://github.com/horkesh/A-War-Without-Victory/pull/602). **Rules.** The owner ruled on 2026-11-15 that no engine change follows 1.0 and that a finished game reproduces history if left alone while the player can still create ahistorical outcomes. Every finding gets fix, retire or accept-as-final with a one-line reason when it is filed; accept-as-final is narrow (right for a finished game, never because of cost). Only a change that moves the 188-week hash must precede the freeze; inert retirements and player-path fixes may follow it, before 1.0, each proving the hash unchanged. Only four doors earn a lane before the freeze: a live player can be stuck, crash or hit an invariant failure; a §6 number or claim shown to the player is wrong; a guard or determinism breaks; live and headless differ. No new audit starts. **Work list** (item tables in the [pre-freeze work list](2026-11-15-pre-freeze-work-list.md)). **Part 1, fix before the freeze:** batch A, §6 displacement (RF-ROSTER lane): RF-PM1, RB1, RB9, RB2, SD7, SD9, SD11, SD12, then SD13 and SD10 re-measured, and A10, RB8's root (the refuge definition); batch B, officers and politics (Batch B lane): B0 first, the peace-plan floor (RS and Contact Group compare a settlement-count share with an area share, so in emergent mode RS accepts Vance-Owen at week 40; a must-fix), then retire the autonomous-launch gate, linear competence decay, the officer-event queue, retire the bot-only directive producer, Wave 6 coupling and RS corps-role overlay; batch C, singles (L7 lane; C4 and C6 to the UI lane): F7 (merged, #690), SE9 (waits for the package's P2), RB8 (the corps-adoption guard, after A10), RB6, CODE4 (merged, #691), the identity-card week, the PK5 queue head, F1i. **Emergent triage (E1; owner, 2026-11-16: the improvising mode ships and stays the default):** after B0, a hands-off emergent 188-week run; engine defects fixed before the freeze, option weights to the calibration pass, the historian accepts the rest; new freeze condition 7, and live = headless is re-run in emergent mode too. **Part 2, fix before the freeze, the 1994-95 attack and defence package (F1g lane, P0 to P6):** the #686 trace and the retirement of RF-STRENGTH's dead sites, a defence trace with receipts, the defence repair P2 (Fable consult 3 and its addendum, accepted 2026-11-16: no new mechanic; bots `dig_in` only at cohesion 40 or more, so sub-40 brigades slide to their floor; four measured repairs in order: the complete posture rule, the army-reserve repair, a retake-only stance-free counter-attack, stance coherence; plus the Lašva stranding fix and an open disposition for the EH-3 Path C respawn; and F3, a defect: operations like Zvezda 94 and the November 1994 Kulen Vakuf counter-offensive must become possible), planner odds (AI1, RF-L3d follow-ups 1, 3 and 4, VRS operations reaching battle, F2 re-measured), RF-STRENGTH's live change (the fixed 3,000 yardstick calls 10 of 125 ARBiH brigades healthy against 117 by designed strength), the ARBiH plan lockout (wire the probe gate at 40) and RF-PK; the Farz P1, P-A, P-B and enclave guards pass at every merge and the historian accepts the share of 1st to 4th Corps operations that succeed. Shipping the passive army as final behaviour is not on the list. **Parts 3 and 4, before 1.0, each proving the hash unchanged:** player-path fixes (the enclave-fall handler, L4-1, L4-2, L4-6, RB5 (the withholding at autonomy 1 to 3: the §6 panel decides the design, no lane touches it before then; plus a copy fix so Verdict and ending text never presents the missing waves as restraint), SE11, the warroom `political_controllers` key, the B14 re-check, DEC1, CODE5) and inert retirements (F1h's dead term, SD2, F1j, F1k, PK4, two CODE2 constants, the feint reserve write, DA3). **Part 5, accept as final** (game-designer and historian in one sitting; each item passes a left-alone and a played test): CODE3, RB5 for an active human HRHB President, PK5, SD6 with SD8, and BC06's six static gesture rows; reasons and seats in the [final-behaviour record](../40_reports/governance/20261115_FINAL_BEHAVIOUR_AT_1_0.md). **Part 6, calibration pass:** L8 with RF-4, the Donji Vakuf 95 timing, the Mistral 2 assembly slip, the painted-reference questions, RF-F1b's constant, H-C4, F1f, SD14, emergent-mode constants, SD5 and, once the package lands, the 1994-95 offensives the historian listed as authored operations. **Before publication:** the paused §6 copy lane and the citation audit to the end. **Done:** F1g ([#667](https://github.com/horkesh/A-War-Without-Victory/pull/667): the corps threat ratio reads the OSID front, allied brigades are not counted as enemy, live in 607 corps-turns), F1a and F1c retired ([#672](https://github.com/horkesh/A-War-Without-Victory/pull/672) the corridor-breach pass and [#683](https://github.com/horkesh/A-War-Without-Victory/pull/683) the emergency defensive operation, both byte-identical; the capability is delivered at P2), the t73 hard-stuck Advance ([#675](https://github.com/horkesh/A-War-Without-Victory/pull/675)), RF-AI2 ([#619](https://github.com/horkesh/A-War-Without-Victory/pull/619)), RF-5B ([#623](https://github.com/horkesh/A-War-Without-Victory/pull/623)), RF-ROSTER ([#677](https://github.com/horkesh/A-War-Without-Victory/pull/677)), SE7E-h ([#685](https://github.com/horkesh/A-War-Without-Victory/pull/685)) and the corps_plan trace ([#686](https://github.com/horkesh/A-War-Without-Victory/pull/686)). An item enters the freeze list only by the four doors above; no fix lands without its own measured run. |

BC11-BC13 are not in use. RF rows are pre-freeze fidelity work, not a new plan: each is amended in its own PR, and the gates `RF-ENGINE-FREEZE` and `RF-CALIBRATION-RESIGNOFF` in [open_gates.yml](../open_gates.yml) close the pass.

**Acceptance boundary:** settle every row before final calibration acceptance, retain one-change-per-
controlled-run and applicable paired deterministic proof, then finish R8 packaged acceptance and R9.
No forced re-floor: n392 and unchanged floors remain until explained, authorized replacement.
B3/B4 serialized text/hash changes require exact delta and gameplay-equivalence evidence, not automatic
recalibration. New behavioral findings explicitly reopen affected closure/calibration evidence; they
never silently enlarge this finite list. Implementer and reviewer remain different people.

**Excluded:** retired RE/R6 work, D-topology, new mechanics, broad recurrence, horizon extension,
orphan-flag debt activation and broad drought authoring. F1 is diary triage with truthful positive
holds, not an event quota. The byte-neutral orphan ratchet may be scheduled separately and gates
nothing here. R7 is closed; publication authority remains separate.

### 4.2 Repository audit integration (2026-09-07)

BC09 and cleanup Tasks 1–8 are GO; script handoff is ready. No new workstream. The R8 cleanup, R8 runtime-integrity and R9 build-preparation packets stay with their plans; R4/R5/R7/RE stay closed, package/lockfile edits are serial, and no baseline refresh, remote configuration change or publication is implied. The packet table and conditions are in the [archive](MASTER_ROADMAP_ARCHIVE.md#roadmap-sections-moved-2026-11-15-steward-pass-12-archive-pass).

## 5. Workstream Register

| ID | Workstream | Status | Executable plan | Complete when |
|---|---|---|---|---|
| R1 | Seamless Command Room ↔ Tactical Map | **COMPLETE — CLOSED 2026-08-01** | [Map-transition plan](2026-07-31-seamless-command-room-map-transition-plan.md) | Warm switch shows current-turn/current-fingerprint truth without renderer reconstruction, static refetch, WebGL error, or visible wait; cold entry meets the measured plan budget. |
| R2 | RS Desk → Decision → Advance friction | **COMPLETE — CLOSED 2026-08-03 (v14 clean pass)** | [RS friction plan](2026-07-31-rs-104week-friction-remediation-plan.md) | Five diary findings close; no contradictory urgency; sourced opportunity/positive-hold cadence is intelligible; ultrawide and map handoff pass Electron proof. |
| R3 | Operational/Tactical Group convergence | **COMPLETE** | [TG closeout plan](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) | One offensive task-organization path, synchronized lifecycle/AHQ receipts, terminal telemetry, unique sourced promotions, locked exhaustion constants, and aligned Standing-OG doctrine. |
| R4 | Command, event, and Dynamic Codex convergence | **COMPLETE — CLOSED 2026-08-06** (Phase 6 merged, PR #481 → main `40d3c5452`). Twelve-specialist panel fixes 6.1–6.5 landed; calibration byte-identical, independent Code Review + QA GO. Detail in [archive](MASTER_ROADMAP_ARCHIVE.md#closed-lane-detail-moved-2026-09-10). | [Command/event/Codex plan](2026-07-31-command-event-codex-convergence-plan.md) (Phase 6) | Five presidential levers remain; Decision Room owns action; Desk owns triage; events, Chronicle, Cost Ledger, and Codex share deterministic receipts and priority truth. |
| R5 | Engine quality, performance, and stability | **COMPLETE — CLOSED 2026-08-05** at the ~1,086 ms/turn floor. Every self-executable item done; Phase 2e reverted on a measured regression; Task 6 DECLINED, not deferred, and the 100 ms/turn target is retired. Detail in [archive](MASTER_ROADMAP_ARCHIVE.md#closed-lane-detail-moved-2026-09-10). | [Engine-quality plan](2026-07-31-engine-quality-performance-stability-plan.md) / [Phase 2c/2d packet](2026-08-01-r5-phase2c-amortized-sector-topology-plan.md) / [Phase 2e pure solve](2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md) | Optional state is classified, measured hot paths improve without byte drift, save/replay contracts are stable, generated artifacts have owners, and local/CI release checks match. |
| R6 | Historical gameplay depth and final calibration | **CLOSED — owner, 2026-11-08.** Calibration signed off 2026-11-06 at 712/711/712/710 (live = headless, all three player factions; strict health PASS; Farz guard enforced). `R6-CALIBRATION-INTEGRATION` closed. Brka and Ilijaš Krivajevići stay open by owner direction. | [Historical-gameplay plan](2026-07-31-historical-gameplay-depth-calibration-plan.md) · [exhaustion/scoring plan](2026-08-06-exhaustion-scoring-redesign-plan.md) | Preserve protected data, legal capture, determinism, final clean-source acceptance and every other unchanged gate. |
| RC | Pressure → exhaustion → **COLLAPSE** pipeline | **PRE-1.0 NARROW SCOPE COMPLETE — CLOSED 2026-08-15.** Retained v3 selection plus reversible D-shape; deterministic and trajectory-flat, 31/31 anchors, 6/6 benchmarks, 7/7 health gates, full Section 6 pass. D-topology (the neighbour-loss cascade) is dropped (orchestrator, 2026-11-16): it gates nothing and would reopen Section 6 and a fresh re-floor. Detail in [archive](MASTER_ROADMAP_ARCHIVE.md#closed-lane-detail-moved-2026-09-10). | [Scope](../40_reports/proposals/20260609_SCOPE_collapse_pipeline.md) · [build spec](../40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md) · [measurement plan](2026-08-15-collapse-d-selection-measurement-plan.md) · [D-shape design](2026-08-15-collapse-d-shape-design.md) · [Stage 0/2 panel record](../40_reports/20260813_RC_COLLAPSE_PANEL_FROZEN_ARTIFACT.md) | The default-OFF local collapse model measures historically discriminating combat pressure, recovers on quiet turns, reaches a bounded live writer, preserves Section 6, and leaves the neighbour cascade out of 1.0 (dropped). |
| RE | 1.0 engine integrity: seven outcomes, no general cleanup | **CLOSED — owner, 2026-09-01.** RE gates nothing: not calibration, not R7, not R8. P2B and the auxiliary prerequisite are retired history. Engine health remains sacrosanct as a principle, not as an RE gate. Detail in [archive](MASTER_ROADMAP_ARCHIVE.md#closed-lane-detail-moved-2026-09-10). | [1.0 contract](2026-08-26-engine-integrity-plan.md) · [recovery plan](2026-08-28-packaged-probe-recovery-plan.md) · [living audit](../40_reports/audits/20260826_RE_LEAN_ENGINE_INTEGRITY_EXECUTION.md) | The unproven prerequisite config/test hypothesis was rolled back exactly and its receipt closed. P2B–P7 and final-pair/profile gates are retired historical acceptance, not unfinished current work; no successor proof route is active. |
| R7 | Content, historical attribution, audio, accessibility, and opening experience | **CLOSED — owner, 2026-11-08.** Every R7 gate is closed (all 17 interface cues accepted, ambient beds retired for 1.0); in-game audio checks pass to R8 packaged play. [Closure record](../../logs/r7-english-readability/closeout-human-audio-listen-round2.md). | [Content/history/audio plan](2026-07-31-content-history-localization-audio-plan.md) · [accepted functional opening plan](2026-08-23-opening-screens-implementation-plan.md) · [cinematic opening and typography amendment](2026-08-28-cinematic-opening-typography-implementation-plan.md) · [presentation and English-readability amendment](2026-09-05-r7-presentation-and-english-readability-amendment-plan.md) · [ARBiH names](2026-09-07-arbih-brigade-honorific-name-correction-plan.md) · [WR01 warroom presentation design](2026-09-10-warroom-whiteboard-date-and-corkboard-map-design.md) · [visual polish and art-direction packet](2026-11-05-visual-polish-art-direction-plan.md) (CLOSED 2026-11-06) / [visual polish follow-ups](2026-11-06-visual-polish-follow-ups-plan.md) · [command palette and scalable UI](2026-11-06-command-palette-ui-scale-plan.md) (VERIFIED LOCAL; integration pending) | Closed. Phase 3 localization stays post-1.0. |
| RD | Dayton settlement and end map | **CLOSED — owner, 2026-11-07.** Peace plans settle on their maps; the OSID-level Dayton map has no isolated pockets outside the Posavina canton; the verdict reads the settled share; the settled map reaches the renderer. Table changes stay as interim rules owned by DC. All `RD-*` gates closed; baseline re-pinned with owner approval (enclave-loss fix, territory unchanged). | [RD plan](2026-11-07-rd-dayton-settlement-lane.md) · [closeout](../40_reports/20261107_RD_CLOSEOUT.md) | Met: 188w pins re-pinned with the reason recorded, maximum territory re-measured for all three factions, canon propagated, independent, sensitive-history and run reviews recorded. |
| DC | Dayton conference redesign | **CLOSED 2026-11-12 — merged #560 (`4a67bd516`); Codex handoff CL-055 records every Next item done.** Reworked the Dayton table (conference room, live bargaining, data contract) on RD's end-map contract. No longer blocks R8. | [DC plan](2026-11-08-dc-dayton-conference-plan.md) · [RD handoff](../../handoffs/20261107_dayton_end_map_to_conference.md) | All `DC-*` gates closed; 188w pins intact or owner re-pinned; the conference hands signed terms to `applyPeaceSettlement`. |
| R8 | Full-campaign packaged-Electron validation and diaries | **DRY RUNS NOW; QUALIFYING CAMPAIGNS AFTER THE ENGINE FREEZE (2026-11-13).** Live = headless parity held at 712/711/712/710 on 2026-11-07 and is re-proved at the freeze (`RF-ENGINE-FREEZE`); main is now 709/709/708/681. Dry runs find product and harness faults early but never count as qualifying. The first RBiH dry run finished on 2026-11-14 ([#622](https://github.com/horkesh/A-War-Without-Victory/pull/622)); RS, HRHB, determinism and audio did not run. **The PK1 fix ([#631](https://github.com/horkesh/A-War-Without-Victory/pull/631), canon amended by panel) and EV1 ([#621](https://github.com/horkesh/A-War-Without-Victory/pull/621)) are merged, and R8 strategic runs now use level 2; all earlier R8 strategic runs ran at autonomy 1**, which froze the enemy bot commanders, so their enemy-behaviour evidence is skewed (end-of-campaign, save and Verdict evidence stays valid). | [Electron-validation plan](2026-07-31-full-campaign-electron-validation-plan.md) · [player criteria](2026-07-31-full-campaign-electron-validation-plan.md#player-campaign-acceptance-contract--owner-decision-2026-10-24) | Per-faction packaged 24/188 runs with diaries, Save/load, same-input determinism, protected/canon and strict runtime/audio remain open. No tuning or pin adoption follows from R8 runs. |
| PS | Player surface and agency review, steps 1-6 | **CLOSED — owner, 2026-11-14 (steps 1-6 all merged: #568, #579, #570, #572, #585, posture model #580; redesign base #566).** Owner chose posture option 2, 2026-11-12. Gates no R8/R9 item. | [Posture plan](2026-11-12-posture-model-option2-stance-matters.md) | Each step: redesign gates, EN and BCS copy. Posture: no bot, headless or calibration change. |
| R9 | Release candidate, gold, and publication | Build preparation passes (§4.2); freeze/readiness after R8 | [Release plan](2026-07-31-release-candidate-gold-publication-plan.md) | One immutable RC passes clean-machine/security/license/store proofs; artifacts are reproducible; publication remains separately authorized. |

The linked plan is the task-level contract for each row. A workstream may not gain a second active plan; amend the linked plan and this register together.

> **Closed-phase amendment logs** (R1–R7 phase-closure notes, Aug 2026) are archived in [MASTER_ROADMAP_ARCHIVE.md](MASTER_ROADMAP_ARCHIVE.md) to keep this file within the conciseness guard. The Workstream Register above is the live authority.

## 6. Locked Product and Historical Decisions

### 6.1 Presidential role and cadence

- The final player command model has five levers. Do not add a sixth.
- The Decision Room is the only action owner. The Desk triages; map/Army HQ supplies evidence; Chronicle, Cost Ledger, and Codex hold receipts.
- The president does not assign brigades, draw axes, select tactical targets, or manage operational timing.
- A quiet week may be a truthful positive hold. It is better than a fabricated choice.
- Optional initiatives require a cited authored row, deterministic conditions, an existing presidential lever, a once/cooldown rule, and non-blocking presentation.
- The former “Free War” residual is absorbed into R4 as event/command/Codex texture; it is not a new system or lever.

### 6.2 Tactical and Standing Operational Groups

- `CorpsOperation.phase` is the sole offensive lifecycle clock.
- Donor-backed Tactical Groups are the only new offensive task-organization path; legacy `kind: 'og'` production becomes compatibility-only.
- Phase 3 constants are final: maximum 12 turns, cohesion drain 4 per engaged turn, dissolve at cohesion 15, Army-HQ cap recovery tail 4 turns.
- Promotion identities require an explicit verified `(corps_id, ordinal) -> division_number` mapping. Unknown means no promotion, never a guessed number.
- Corps sectors remain standing OGs. Actual contributors share the immediate combat cost already produced by the live path; downstream aftermath remains primarily owned by the primary defender.
- ADR-0007 Phase C stays retired. R3 aligns ADR-0006/0007, the Systems Manual, and Rulebook to live behavior; it does not resurrect broader shared defense.

### 6.3 Behavior experiments

- Political-dimension isolation runs `intl_only` first, then `cohesion_only`. Each is adopted only if its predeclared historical and engine-health bounds pass; otherwise it is retired.
- Intel ambush runs only after the combat floor is stable and is adopted or retired by the R6 criteria.
- Supply work improves comprehension only. It creates no new presidential authority and reveals no hidden enemy truth.
- Sarajevo becomes a continuous supply/lifeline condition. It is not an atrocity-management lever.
- Fall 1995: E-A5 is already shipped; implement E-B1. Add E-A6 only if the post-E-B1 residual evidence still requires it; otherwise retire E-A6.
- Failed experiments leave a report, removed/reverted implementation, and a closed no-go row. They do not wait for another owner decision.

### 6.4 Sensitive history and chronology

- Sensitive outcomes are informational consequences, not player choices or optimization rewards.
- Every claim uses the source hierarchy and claim ledger in R7. Unsupported claims are omitted.
- Named officer/OOB identities require exact sourced mappings. Unknown identities are omitted, not inferred.
- Zvornik and Foča takeover chronology belongs to April 1992. Neretva/Grabovica/Uzdol belongs to 1993; Uzdol is dated 14 September 1993 in the local source extraction. No June-1992 fallback may carry those 1993 events.
- Sarajevo history is bounded by tribunal evidence; Srebrenica content is bounded by tribunal and UN evidence.

Source anchors and official corroboration links (BB2 extractions, IRMCT Sarajevo, Halilović, Krstić, UN A/54/549) are in the [archive](MASTER_ROADMAP_ARCHIVE.md#roadmap-sections-moved-2026-11-15-steward-pass-12-archive-pass).

### 6.5 Post-1.0 localization and pre-1.0 audio

- **Owner decision 2026-08-15:** unfinished multilingual localization no longer gates 1.0. English is the only required release language for 1.0; existing translated/compatibility work remains in place but is not represented as production-complete.
- Post-1.0 localization retains the settled contract: canonical Bosnian locale `bs`, formatting `bs-BA`, legacy `bcs` migration/alias, deterministic pseudolocalization before visual LQA, and explicit Preview labeling until native review is complete.
- Audio priority: first-party/generated UI sound, then CC0, then explicitly approved CC BY with title/author/source/license and checksum.
- Do not use CC BY-NC, unverified anthem/folk recordings, speeches, screams, or gunfire/atrocity spectacle.

Standards and licensing reference links (W3C, CLDR, pseudolocalization, WCAG, Creative Commons, Freesound) are in the [archive](MASTER_ROADMAP_ARCHIVE.md#roadmap-sections-moved-2026-11-15-steward-pass-12-archive-pass).

### 6.6 Map, Electron, and release architecture

- Measure cold and warm map entry before optimizing.
- Keep campaign-scoped map renderers mounted; visibility is not lifecycle.
- Cache immutable static resources per renderer session; current campaign/control/decision/fog truth remains live.
- Defer noncritical enrichment until after the meaningful current-state frame.
- Preserve Electron isolation/security while optimizing; never trade security for startup time.
- Steam is the primary store. Direct artifacts are signed Windows, notarized macOS, and Linux AppImage.
- Windows signing uses Microsoft Artifact Signing/SignTool; macOS uses Developer ID and `notarytool`.
- Credentials are secure injected inputs, never repository content or a reason to leave product planning unresolved.

Primary references (Electron performance and security, MapLibre, SmartScreen and Artifact Signing, SignTool, Apple notarization, SteamPipe) are in the [archive](MASTER_ROADMAP_ARCHIVE.md#roadmap-sections-moved-2026-11-15-steward-pass-12-archive-pass).

## 7. Experiment Outcome Matrix

The adopt-or-retire matrix (political `intl_only` and `cohesion_only`, intel ambush, Fall-1995 E-A6, performance optimization, sourced cadence initiative) is settled history and lives in the [archive](MASTER_ROADMAP_ARCHIVE.md#roadmap-sections-moved-2026-11-15-steward-pass-12-archive-pass). No experiment remains "partial" after evaluation.

## 8. Cross-Workstream Collision Rules

| Shared surface | Ownership order |
|---|---|
| `App.tsx`, `MapContainer.tsx`, `shellNavigation.ts`, `gameStore.ts` | R1 first; R2 FR-03 rebases on R1. |
| Decision priority/cadence read models and authored initiatives | R2 first; R4 consumes and generalizes the accepted contract. |
| Tactical Group/GameState lifecycle | R3 first; R5 persistence work rebases on R3 schema. |
| Combat, input delivery and calibration | RE is closed. BC09 delivery precedes BC07 final policy acceptance; BC10 follows command settlement. Freeze each source/input tree for attribution. Diagnostic calibration is open; final calibration follows §4.2 integration. |
| Event/essay authored rows | R4 inventory/convergence first; R7 attribution/content pass second. |
| Map/Desk English layout strings | R1/R2 layout first; R7 accessibility/readability proof second. Multilingual expansion is post-1.0. |
| Package/release configuration | R9 owns package/CI edits after cleanup. Final R8 proof precedes freeze; changed inputs need new proof. |

Before each workstream:

1. inspect `git status --short`, current branch, and worktrees;
2. inspect the preceding workstream closeout and shared-file diff;
3. rebase/merge only through normal non-destructive Git operations;
4. update the master and command board together if evidence changes ordering;
5. never delete, clean, reset, or overwrite an unrelated dirty worktree.

## 9. Legacy 30-Lane Disposition

The former command board had duplicate, closed, paused, and owner-gated rows. Every row now has one finite home.

| # | Former lane | Disposition |
|---:|---|---|
| 1 | Seamless map transition | R1 |
| 2 | Operational/Tactical Group closeout | R3 |
| 3 | Presidential Command Model | R4 |
| 4 | Presidential Surface | Closed foundation; R4 regression coverage only |
| 5 | Free War | Absorbed into R4 texture/cadence; no new system |
| 6 | Branch protection / CI / release blockers | R5 CI parity and R9 release proof |
| 7 | GUI polish | Closed foundation; new diary findings route through R2/R8 |
| 8 | Army-arc calibration | Closed historical packet; final bounded calibration belongs to R6 |
| 9 | Standing OG no-go | R3 doctrine convergence; R6 preserves Phase C retirement |
| 10 | Tactical Groups duplicate row | Merged into R3 |
| 11 | Event core | R4 |
| 12 | Dynamic Codex | R4 |
| 13 | Optional GameState cleanup | R5 |
| 14 | Sector performance | R5 |
| 15 | Save/load/replay determinism | R5 |
| 16 | Bosnian localization/LQA | Post-1.0 backlog; R7 Phase 3 retained as the executable packet |
| 17 | Casualty model | Closed foundation; R6 regression only |
| 18 | Intel ambush | R6 adopt-or-retire experiment |
| 19 | Supply comprehension | R6 explanation-only slice |
| 20 | Officer/OOB depth | R7 exact-source inventory |
| 21 | Soundscape | R7 licensed bounded audio |
| 22 | Telemetry/playtest | R8 |
| 23 | Cohesion divisor | Closed; retained as regression |
| 24 | Political dimensions | R6 serialized adopt-or-retire experiments |
| 25 | Patron/military credibility | Closed; R4/R6 regression only |
| 26 | Ring 3 content | R7 |
| 27 | Sarajevo continuous condition | R6 |
| 28 | Packaging/signing/store/press/trailer | R9 |
| 29 | FORAWWV owner decisions | Waiting lane retired; decisions are locked here; FORAWWV remains untouched |
| 30 | Fall-1995 combat | R6 E-B1, then evidence-conditional E-A6 |

Closed rows are not carried as active status rows. Their history lives in Git, the ledger, and implementation reports.

## 10. Finding Routing

During R8 and R9:

| Finding | Route |
|---|---|
| Incorrect result, broken control, crash, diagnostic error, stale save/map truth, determinism or migration failure | **Bug** -> RE while RE is open when it concerns authority/accounting/ordering/locality, otherwise the owning R1–R7 plan -> fix/test -> restart affected fresh campaign |
| Understandable but slow, unclear, repetitive, badly prioritized, or unpolished flow | **Friction** -> R2 for Desk/Decision/map loop, R4 for command/event truth, R7 for content/audio/accessibility, otherwise owning lane; multilingual expansion routes post-1.0 |
| Historically unsupported or misplaced content | **Bug** if factual/chronological; **friction** if sourcing is correct but presentation is unclear -> R6/R7 |
| Optional improvement outside 1.0 outcome and not required for 5/5 | Record in post-1.0 backlog; do not expand this roadmap |

Bugs are fixed before friction. A repaired packaged-Electron session restarts from a clean campaign; it is never continued across a source-changing fix.

### Post-1.0 / non-blocking backlog

Optional improvements identified outside the 1.0 outcome, per the routing rule above: recorded here, not folded into an active R-lane.

| Date | Item | Design doc | Status |
|---|---|---|---|
| 2026-09-08 | Six address/decoration escalation stages; static 1.0 behavior retained. | [BC06 disposition](2026-07-31-full-campaign-electron-validation-plan.md#bc06-final-design-disposition-and-bc09-authorization--2026-09-08) | **ACCEPTED AS FINAL** as static (sitting of 2026-11-16); packaged gate remains. |
| 2026-08-15 | Collapse D-topology (neighbour-loss cascade), only if 1.0 needs it; reopens ordinary Section 6 review and a fresh 188-week re-floor. | [RC panel synthesis](../40_reports/20260813_RC_COLLAPSE_PANEL_RECONCILER_SYNTHESIS.md#option-d--address-the-model-three-variants-priced-very-differently) | **DROPPED** (orchestrator, 2026-11-16); gates nothing. |
| 2026-08-15 | Multilingual localization (`bs`/`bs-BA`, legacy `bcs`, pseudolocalization, native review, locale visual proof); English is the sole required 1.0 language. | [R7 plan Phase 3](2026-07-31-content-history-localization-audio-plan.md#phase-3----deferred-post-10----bosnian-locale-contract-and-localizability) | **DEFERRED POST-1.0 by owner decision**; gates nothing. |
| 2026-08-05 | Faction-wide current equipment totals visibility. | [Design note](2026-08-05-faction-equipment-totals-visibility-design.md) | Proposed; gates nothing. |
| 2026-08-05 | Local Support lever reads as a free weekly click (candidate, not approved: 4-week commitment lock-in). | `docs/40_reports/20260805_RS_PLAYTHROUGH_PYRRHIC_PANEL_SYNTHESIS.md` | Proposed; canon-silent. |
| 2026-08-06 | Player-facing "sector" renamed "Operational Group", every OG auto-named; display layer only (ADR-0006). | [Design](2026-08-06-sectors-to-og-naming-design.md) | SCOPED (owner-requested), not implemented. |
| 2026-09-05 | Casualty-formatter consolidation (four competing formatters, two inline duplicates). | [R7 amendment §9.4](2026-09-05-r7-presentation-and-english-readability-amendment-plan.md) · [panel record §3](../40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md) | Proposed (a `code-simplifier` pass). |
| 2026-09-05 | Full turns→weeks string sweep (about 20 keys beyond the three fixed in R7; key list in the archive). | [R7 amendment §9.4](2026-09-05-r7-presentation-and-english-readability-amendment-plan.md) · [panel record §4](../40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md) | Proposed; string-only. |
| 2026-09-05 | Per-candidate decorate-a-unit content (audit finding 8e): one authored template cloned over every eligible candidate. | [panel record §5](../40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md) | Proposed; a content-authoring gap. |
| 2026-09-05 | HRHB warroom wall-map plate (audit finding 27). | [panel record §1, §5](../40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md) | **CLOSED 2026-11-06** (WR01 sizes the sheet from the measured cork box). |
| 2026-09-05 | Dead export `PRESIDENTIAL_DESK_BACKGROUND` cleanup. | [panel record §1, §5](../40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md) | Proposed; trivial, not 1.0 scope. |
| 2026-09-06 | Event-catalog consolidation: orphan-flag ratchet first (byte-neutral, schedulable any time), then the debt, then drought authoring; measurements in the archive. | [Observations](../40_reports/audits/20260906_ORPHAN_EVENT_FLAGS_OBSERVATIONS.md) · [Investigation](../40_reports/20260905_EVENT_FIRING_SATURATION_AND_DEAD_CATALOG.md) · [P3 sweep](../40_reports/audits/20260906_FACTION_CONTROLS_MUNICIPALITY_THRESHOLD_SWEEP.md) | Proposed; (b) and (c) sit after D2 and need their own controlled 188w. Gates nothing. |
| 2026-11-08 | Army HQ on paper, further slices; slices 1–2 shipped in R7. | [Visual polish follow-ups](2026-11-06-visual-polish-follow-ups-plan.md) | Post-1.0 |

## 11. Global Verification Barriers

Each plan contains focused commands. Before a workstream closes, run its focused suite plus every applicable global command:

```powershell
if (!(Test-Path 'data/derived/scenario/baselines/manifest.json' -PathType Leaf)) { throw 'Missing required baseline manifest' }
npm.cmd run typecheck
npm.cmd run canon:check
if ($LASTEXITCODE) { throw "canon:check exit $LASTEXITCODE" }
npm.cmd run engine:health:gate
npm.cmd run test:vitest -- --pool=forks --reporter=dot
git diff --check
```

Additional rules:

- Stop on nonzero exits. The manifest preflight prevents `canon:check` skipping baselines; it runs them once.
- Run two byte-identical long scenarios after any deterministic simulation/output change.
- Run save migration and round-trip tests after any persisted-state change.
- Run packaged/local-Electron console, network, renderer, WebGL, accessibility, and screenshot proof after player-facing or shell changes.
- Do not refresh a baseline until the changed behavior is explained, accepted by this roadmap’s locked criteria, and recorded in the ledger.
- Test commands must pass from the documented supported Windows entrypoint.
- R9 adds clean-machine, malware/security, license/SBOM, checksum, signing/notarization, install/uninstall, offline-start, store-depot, and rollback proof.

## 12. Definition of Program Completion

The roadmap is complete only when:

- RC and R1–R7 acceptance criteria and plan checklists are green; RE remains owner-closed;
- every §4.1 BC row has accepted fix/verification or an evidenced release exclusion before final calibration acceptance; new behavioral findings explicitly reopen affected closure and calibration evidence, never silently enlarge the finite register;
- R8 completes fresh full-duration RBiH, RS, and HRHB coverage and the final two owner-style diaries score 5/5;
- every R8 finding is either fixed and reverified or explicitly proven outside the 1.0 definition of done;
- bugs and friction remain separately reported;
- deterministic, migration, canon, accessibility, security, and clean-runtime barriers are green;
- R9 creates a reproducible immutable RC and complete publication packet;
- the command board, plan index, documentation index, ledger, and knowledge ledger match this state;
- no stale active lane, duplicate plan, unresolved design choice, or unexplained baseline drift remains.

Public release is complete only after the owner separately says `Publish 1.0` and the R9 signing/upload/tag/push steps succeed.

## 13. Orchestrator Closeout Contract

For each workstream the orchestrator records a closeout (workstream, plan, base and final commit, tasks, focused verification, long-run and package evidence, behavior and baseline disposition, historical and source review, bug and friction findings, propagation, remaining dependency, next workstream); the template is in the [archive](MASTER_ROADMAP_ARCHIVE.md#roadmap-sections-moved-2026-11-15-steward-pass-12-archive-pass). At program close, append one final ledger entry, link the R8 diaries and R9 manifest, mark R1–R9 and RE complete here and on the command board, and run the full verification set. Do not publish implicitly.

Superseded 2026-10-26 combat-fatigue and R8 calibration notes: [archive](MASTER_ROADMAP_ARCHIVE.md#combat-fatigue-and-r8-calibration-updates-moved-2026-11-14).
