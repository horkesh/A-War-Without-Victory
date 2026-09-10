# AWWV Command Board

**Status:** Derived dispatch view, synchronized 2026-09-09.

**Authority:** [MASTER_ROADMAP.md](MASTER_ROADMAP.md) is the sole authority for unfinished work and wins if this board differs.

## Activation

The owner activated full roadmap execution on 2026-07-31. Local implementation, tests, evidence,
local commits, transient validation builds, documentation propagation, and non-destructive
workspace maintenance are authorized within the roadmap. Remote push and final merge are not.

Signing, store upload, public release creation, and a public `1.0` tag remain outside that authority and require a separate explicit `Publish 1.0` instruction.

## Dispatch Queue

| Order | ID | Status | Next executable action | Plan |
|---:|---|---|---|---|
| 1 | R1 | **COMPLETE -- CLOSED 2026-08-01** | None. | [Seamless map transition](2026-07-31-seamless-command-room-map-transition-plan.md) |
| 2 | R2 | **COMPLETE -- CLOSED 2026-08-03** | None; v14 is the accepted clean RS campaign proof. | [RS friction remediation](2026-07-31-rs-104week-friction-remediation-plan.md) |
| 3 | R3 | **COMPLETE** | None. | [TG convergence](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) |
| 4 | R4 | **COMPLETE** | None; Phase 6 and its packaging follow-up are closed. | [Command/event/Codex convergence](2026-07-31-command-event-codex-convergence-plan.md) |
| 5 | R5 | **COMPLETE -- CLOSED 2026-08-05** | None. The accepted performance floor is approximately 1.09 seconds per turn; the 100 ms target and incremental-reuse Task 6 are retired from 1.0 scope. | [Engine quality](2026-07-31-engine-quality-performance-stability-plan.md) |
| 6 | R6 | **JANUARY 1993 SLICE LANDED; CALIBRATION OPEN AND ONGOING (RE closed 2026-09-01)** | Preserve the landed evidence. Reference, init-control, objective, axis, timing, roster and outcome work is live again. Engine health is sacrosanct — fix engine-health defects before tuning. | [Calibration authority](../40_reports/CALIBRATION_MASTER.md) |
| 6.5 | RC | **PRE-1.0 NARROW SCOPE COMPLETE -- CLOSED 2026-08-15** | None. V3 selection plus reversible D-shape is retained; D-topology is reserved post-1.0. | [Collapse build spec](../40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md) / [D-shape result](2026-08-15-collapse-d-shape-design.md) |
| 7 | R7 | **ACTIVE — DATE REPAIR PACKAGED; ACCEPTANCE OPEN** | Date correction `ea33b23a5` retains nine-case image/UI/hook GO and fixed column/artwork; included in Inbox package `7d97b72fc`. Fresh RBiH reaches turn 24 but fails opening/setup font and two status-contrast checks before Save/load; follow-up proposed in R8. Prior English/POST-A receipts retain their scope. Human listening waits for owner inspection; audio/sensitivity, offline runtime and six-pin baseline gate remain open. No pin refresh or new baseline run. | [Content/history/audio](2026-07-31-content-history-localization-audio-plan.md) / [accepted functional opening](2026-08-23-opening-screens-implementation-plan.md) / [cinematic opening and typography amendment](2026-08-28-cinematic-opening-typography-implementation-plan.md) / [presentation and English-readability amendment](2026-09-05-r7-presentation-and-english-readability-amendment-plan.md) |
| 7.5 | RE | **CLOSED — owner, 2026-09-01** | None. RE gates nothing; engine-health defects are still fixed before tuning. | [Closed recovery record](2026-08-28-packaged-probe-recovery-plan.md) / [closed RE contract](2026-08-26-engine-integrity-plan.md) |
| 8 | R8 | **INBOX/PACKAGE REPAIRED; SHAKEDOWN BLOCKED — 2026-09-10.** | Product `7d97b72fc`, packaged route, build and hook pass; sole UI-boundary failure reconciled by 45/45 targeted checks, original exit 1 retained. Harness `c31135f35` reaches RBiH turn 24/577 captures, then fails readability before Save/load. Nineteen local request aborts and one final-sector warning need disposition; RS/HRHB unlaunched. Further narrow repair/build proposed, not activated. Old package/evidence preserved; full campaigns and final acceptance remain open. | [Electron validation](2026-07-31-full-campaign-electron-validation-plan.md) |
| 9 | R9 | **FREEZE WAITING ON R8; LIMITED PREPARATION AT §4.2** | Freeze an immutable RC, produce reproducible clean-machine evidence, and prepare publication inputs. | [Release candidate/gold](2026-07-31-release-candidate-gold-publication-plan.md) |

**R7 readability execution — 2026-09-09:** The authorized date-label expansion now has nine-case initial/maximum-scroll proof, preserving the fixed Desk column, header and artwork. Final UI/typecheck/build checks and independent review pass; Desk/date commit `88996a23d` and its hook pass. Clean POST-A completes 188 weeks with health/hash checks passing; PRE/POST-A/POST-B match all eight artifacts and inputs. The fixed run budget is consumed. Earlier phases and unaffected global Vitest/player-experience receipts remain reviewed. Baseline investigation is GO: pins match accepted n392, while four consumed inputs changed before R7; PRE/POST-B match all eight artifacts. Retain the six-pin failing baseline gate and dirty POST-B disclosure. No R7 closure or downstream lane is claimed. See the amendment and designated report.

**R7 closeout audit — 2026-09-09:** The existing parent plan now carries the listening/approval
checklist. The supplied set is 20 assets (17 neutral UI cues and three ambient beds); 16 optional
placeholders remain absent. A named human listening/sensitivity acceptance receipt was not located
in the scoped search. Retained package evidence proves the 20 emitted OGGs match source, but does
not record playback/control observations or zero remote audio requests. **Owner sequencing:**
human listening waits for the owner's eventual game inspection; it is not the next engineering
task. The owner scheduled the bounded R8 usability packet and three 24-turn shakedowns below.
Audio/offline acceptance and the six-pin baseline gate remain open.

**R7 name correction integrated:** [ARBiH honorific-name packet](2026-09-07-arbih-brigade-honorific-name-correction-plan.md); IDs and mechanical fields preserved, saved/displayed text changed. Remaining R7 gates stay open.

**BC05 scheduled separately (2026-09-07):** bounded NATO deadline/loader repair is
**implemented and independently reviewed (GO), 115 focused tests pass**. n392 disproves the inherited
Lukavac dead-gate premise: it fires at t70, with 3/6 RS Trnovo
cells and a `comply` decision. **Owner disposition implemented: separate Lukavac event removed and
independently reviewed (GO)**. Military Operation Trnovo is preserved; its execution belongs to calibration and is outside
this packet. Campaign/downstream acceptance remains open. [BC05 scope/evidence](2026-07-31-full-campaign-electron-validation-plan.md#bc05-bounded-nato-repair-and-lukavac-disposition--2026-09-07).

**BC06 — owner scheduled 2026-09-07; bounded repair implemented/reviewed (GO).**
Voluntary posture controls and authored third-use posture/front-visit choices are wired; pending
guards and decision/notification receipts are repaired. Owner-authorized per-unit decoration
targeting now passes all three local faction action paths (2026-09-08 follow-up). The owner-delegated
2026-09-08 disposition retains static address/decoration behavior for 1.0 and defers six new
escalation stages post-1.0 as an explicit scope exception. Final packaged acceptance remains open. No campaign or calibration change is
claimed. [BC06 scope/evidence](2026-07-31-full-campaign-electron-validation-plan.md#bc06-bounded-posture-and-gesture-repair--2026-09-07).

**BC09 — LOCAL PACKET REVIEWED (GO) (2026-09-08).** Shared input validation
and real IPC 25/25 preserve failed-advance state/save/broadcast boundaries; the valid synthetic
turn matches untouched baseline bytes. [Evidence and matrix](2026-09-07-r8-runtime-input-ai-integrity-plan.md).
Integrated unchanged into main as `fa900ba89`. Final acceptance remains deferred; BC10 is not activated.

**BC07 — DISPOSED — RETAIN (GO).** Preserve the committed stability
values; hybrid/ethnic starts bypass them while mode-less operational starts can consume them.
[Disposition and acceptance order](2026-07-31-full-campaign-electron-validation-plan.md#bc07-stability-data-disposition--2026-09-08).

**Repository audit packets — BC09 reviewed (GO); cleanup Tasks 1–8 complete (GO):** [Master §4.2](MASTER_ROADMAP.md#42-repository-audit-integration-2026-09-07) assigns three subordinate packets:

| Packet | Existing owner and sequence |
|---|---|
| [Deletion cleanup](2026-09-07-bounded-deletion-cleanup-plan.md) | R8; Tasks 1–8 reviewed GO. A 13-worktree recheck found no executable RE consumer; script handoff ready. Final R8 acceptance remains separate. |
| [Runtime integrity](2026-09-07-r8-runtime-input-ai-integrity-plan.md) | R8; BC09 Phase 1 is integrated and supplied the verified BC07 retention disposition. BC10 remains planned after BC01/06 and BC09. |
| [Build preparation](2026-09-07-r9-build-validation-preparation-plan.md) | Phases 1–3 complete/review GO. Package/resource/route proof and combined suite pass (13,520 passed / 31 skipped); final R8 gates remain. |

All precede final calibration and packaged acceptance. Owner-authorized cleanup Task 1
follows the integrated BC09 repair and BC07 retention decision; no campaign has run. Other packet registration creates
no execution authority or new workstream; D1 and separately authorized BC04 work are preserved.

## Current Critical Path

`Scheduled R8 usability repairs + 24-turn shakedowns -> remaining behavior settlement (§§4.1–4.2) -> final calibration -> final packaged acceptance and owner inspection (including listening) -> R9`

**Finite closure register (2026-09-07; BC01 separately scheduled):** [Master §4.1](MASTER_ROADMAP.md#41-finite-behavior-closure-register-2026-09-07) owns BC01 CLOSED (owner accepted verified repair and retired territory similarity, 2026-09-07; [verification](../40_reports/audits/20260907_BC01_PLAYER_OPPORTUNITY_IMPLEMENTATION_VERIFICATION.md)), BC02 CLOSED by the owner-approved verified Electron load/display repair, BC03 CLOSED by verified repair and owner-approved deferrals, BC04 campaign acceptance and BC05–BC06 remain open; BC07 retention is settled; BC09 Phase 1 is locally reviewed GO with final acceptance deferred, BC10 remains planned, and BC08 is closed by bounded disposition: BC01 opportunity decisions; BC02 sector/rating truth; BC03 narrated Dayton; BC04 chronology/P1/P2; BC05 NATO/Lukavac gates; BC06 posture/gesture controls; BC07 stability-data policy; BC08 inherited tests. FIX means planned disposition when scheduled; VERIFY/DISPOSITION needs bounded evidence. D1 HOLD FOR R8 remains. Registration creates no new lane, RE revival, broader repair authorization, or automatic baseline refresh. BC02 changed no canonical save bytes, campaign result, calibration or baseline. BC03 is closed; BC03 is committed as c95e25241; BC04 P1 is owner-authorized, implemented and independently reviewed; campaign acceptance is deferred to the next calibration, preserving clean before/after attribution; extra P1 repeat/ON runs are owner-retired. P2 completed-week targets are historically ratified; the owner approved the bounded same-turn follow-up/display packet and scoped panel-condition amendment. P2 is implemented, focused checks passed, and independent review returned GO; campaign acceptance remains deferred. Diagnostic calibration stays open; final calibration follows accepted behavior settlement. n392 is 702/678/672/665 against unchanged floors 694/674/668/641; the older 688 breach is historical, and improvement attribution remains unknown.

**BC08 CLOSED by verification/disposition, 2026-09-07.** The historical red invocation is retained. The 2026-09-08 combined-branch full gate now passes: 13,717 tests passed, 31 skipped, exit 0, with child-scoped Git Bash. See the [health repair receipt](2026-09-07-bounded-deletion-cleanup-plan.md#combined-branch-health-repair-closeout--2026-09-08). Final R8 acceptance remains open. [Report](../40_reports/audits/20260907_BC08_CURRENT_ENGINE_HEALTH_VERIFICATION.md).

**Unscheduled work landed 2026-09-01/04, recorded so it is not mistaken for roadmap progress.**
PRs #491-#497 changed no lane row's status. #491 fixed the tactical toolbar collision and added the
geometric verifier `tools/ui/verify_toolbar_fit.mjs`, which still reports **PARTIAL** coverage --
it exercises only the chips present in the one tracked save it loads. #492-#495 covered
calibration-state reporting for merge children and merged-away OSID rendering; #494 made the
744-drawn-versus-712-simulated OSID gap an executable invariant. **#496/#497 net position:** the
committed `operational_initial_master.json` and its derive script disagree on **269 of 712 rows**;
the ~227 `stability_score` rows are real and reach the sim through `control_flip.ts:384`, while the
42 `contested_control` flips are **cosmetic** (no reader in `src/sim/`, zeroed for every OSID at
init). The earlier "168 rows" and "`contested_control` is the headline" figures were retracted by
those same PRs.

**Closed RE/probe history:** the [master execution snapshot](MASTER_ROADMAP.md#current-execution-snapshot-2026-09-07)
governs current work. The [closed RE contract](2026-08-26-engine-integrity-plan.md)
retains P1/P2A acceptance and the corrected Node-22 pair at `177882fc2`; mixed-tree/Node-24
runs remain inadmissible as RE evidence. The [closed recovery record](2026-08-28-packaged-probe-recovery-plan.md)
retains the terminal `NO_VERDICT`, exact rollback at `48909e1d6`, and consumed authority.
These records authorize no RE retry, diagnosis, instrumentation or successor proof route.
RE is closed and gates nothing; its retired gates and deferred mechanics do not re-enter
the critical path. Engine health remains a standing requirement, with defects fixed before tuning.

**Canon landed 2026-08-17:** `SENSITIVE_HISTORY_DESIGN_GATE.md` §10, "Provenance and the Integrity of the Historical Record", ratified by unanimous Pyrrhic panel. `FORAWWV.md` §XIII temporal scope is drafted but **HELD** behind the provenance channel-separation and determinism-scan packets, and is not canon.

RC's narrow pre-1.0 scope is complete. Frontage-days and same-turn selection were retired; the retained v3 two-turn selector preserves the registered Sipovo/Drvar distinction. Reversible D-shape then fixed the event-only persistence clock and produced one bounded live HRHB write at Bucovaca while preserving all anchors, health gates, deterministic artifacts, and Section 6 exclusions. Neighbour-cascade D-topology is reserved post-1.0 and must not be replaced by struck breadth tuning. RE gates nothing; the remaining R7 gates and §4.1 settlement sequence govern R8 acceptance.

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

This board becomes all green only when R1-R9, RC, and RE satisfy the [master definition of program completion](MASTER_ROADMAP.md#12-definition-of-program-completion). Prepared for publication and published are separate states.
