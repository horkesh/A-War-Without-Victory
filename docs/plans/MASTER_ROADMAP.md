# A War Without Victory — Master Roadmap

**Status:** IN AUTONOMOUS EXECUTION. **Engine health is sacrosanct, and calibration works on top
of it** (owner, 2026-08-26, restated 2026-09-01). Engine-health defects are fixed before tuning;
calibration builds on a healthy engine rather than compensating for a sick one.

**RE — 1.0 Engine Integrity is CLOSED (owner, 2026-09-01), and calibration is OPEN and ONGOING.**
The accepted January-1993 slice remains landed evidence. RE no longer gates calibration, R7 or R8,
and the P2B packaged-proof blocker is history rather than a live constraint. The original probe
channel remains closed history at `b711cffa9`. R7 continues; R8 follows; R9 follows R8.

**Read this file, not the older prose below it, for current state.** Sections further down retain
their original wording as a record of how decisions were reached; where they say calibration is
paused or RE is blocked, they are describing 2026-08-28, not today.

**Last updated:** 2026-09-10 (open-gates register added; WR01 warroom presentation packet scheduled under R7)

**Execution branch:** `codex/r7-english-readability` (integration target: `main` after all workstreams are green)

**Authority:** This file is the sole source of truth for unfinished product work.

**Execution view:** [COMMAND_BOARD.md](COMMAND_BOARD.md) is a derived convenience view; this roadmap wins if they differ.

**Plan index:** [README.md](README.md)

**Open gates:** [open_gates.yml](../open_gates.yml) — named gates and their evidence, checked by `npm run gates`. Derived; this roadmap wins.

## ★ PROBE CHANNEL — CLOSED 2026-08-26. Scope: `docs/plans/2026-08-26-probe-channel-scope.md`

**Owner rulings, both of which bind downstream work:**
1. The quiet war was ruled correct modelling; once the cause was found it was ruled *"blindness"*.
   **Ruling 2 supersedes ruling 1 on the CAUSE.** What survives from 1: a besieged corps still does
   not mount offensives (`arbih_1st_corps` stopped flailing, it did not start attacking). Full quotes
   and data in the closed scope; `REAL_WAR_MASTER #40` carries both.
2. **Do not re-raise "the war is too quiet" as a defect**, and do not treat a post-fix tempo rise as
   a regression. Any control pinning `sector_attack` near 44 was pinning a number the BUG produced.

**Closed evidence:** stable sector-pair identity, edgeless-ghost exclusion and `occupies_on_victory` landed. The fixed-home probe exclusion was reverted (the tag covered 180/184 brigades); any future proposal requires an explicit tag and an enumerated predicted set before execution. Measurements, non-blocking follow-ups, the unmeasured orphan-rate proof and the post-1.0 enclave-targeting disposition are retained in the [closed probe scope](2026-08-26-probe-channel-scope.md).

---

## Current Execution Snapshot (2026-09-07)

- **Final calibration follows finite behavior settlement:** the [closure register](#41-finite-behavior-closure-register-2026-09-07) inventories known pre-freeze work inside existing lanes. This is planning only: D1's HOLD FOR R8 remains; R7 continues on disjoint presentation files. No RE revival, new lane, implementation, or baseline refresh is authorized by registration.

- **Calibration: OPEN AND ONGOING (2026-09-01).** The pause described here ended when RE closed.
  The January-1993 slice remains landed evidence, and reference, `init_control`, objective, axis,
  timing, roster and outcome work is live again — `d9f0451b0 calibration(foca): earn takeover
  through operation` landed, the upper-Drina Cajnice/Foca/Kalinovik axes were developed on
  2026-08-31, and the Gorazde lane in `codex/apr1994-operational-corrections` has recent runs.
  Calibration runs ON TOP OF engine health, never instead of it. `docs/40_reports/CALIBRATION_MASTER.md` records that n374 is inadmissible as
  an RE baseline because its own metadata says commit `b3d759a3…`, `git_dirty:true`, Node 24.
- **Original probe channel:** **CLOSED at `b711cffa9`.** Stable sector identity and
  `occupies_on_victory` landed; the fixed-home exclusion was reverted. RE preserves that
  disposition and does not reopen probe work.
- **Historical auxiliary proof:** terminal NO_VERDICT; exact hypothesis rolled back at `48909e1d6`. [Closed recovery record](2026-08-28-packaged-probe-recovery-plan.md). RE closure makes this non-blocking.
- **RE — CLOSED (owner, 2026-09-01).** It gates nothing; P2B and the reduced packet contract are retired history. Engine-health defects still outrank tuning.

- **Complete:** R1, R2, R3, R4, R5, and the defined pre-1.0 scope of R6.
- **Unscheduled work landed 2026-08-29/30, recorded so it is not mistaken for roadmap progress.**
  Verifying the R7 opening art in a packaged build exposed three pre-existing defects, all now fixed:
  the packaged app was dead on startup on a missing `build.files` entry; beneath it the production
  tactical-map bundle never booted at all (cyclic chunk graph from source-level `manualChunks`, 26
  cycles); and `srebrenica_enclave_forms_1992` gated the whole atrocity chain on a global territory
  share that had already failed silently at `037396e3c` by three OSIDs and one week. The enclave
  re-gating was owner-approved after a split four-seat panel
  ([record](../40_reports/proposals/20260830_PANEL_63671dd8c_ENCLAVE_TRIGGER_AND_PLANNING_CANON.md)),
  and carries a new anomaly detector proven against the original failing run. **None of this was
  scheduled**; the only enclave items on this roadmap are deferred post-1.0. R7's own open gates and
  RE's packet queue are untouched by it.
- **Historical breach, superseded as current baseline status by n392:** the jan1993 checkpoint floor was **688 against 694**, attributed
  to `175bea593` (ops-only attack doctrine); no commit in the RE-0C/0D chain repairs it, and the
  baseline manifest must not be re-reconciled to hide it. `037396e3c` additionally cut `total_killed`
  by 24% and tripled `political_blocked` planning deaths, and warrants reconsideration on its own.
  On 2026-09-06 the owner accepted n392 at **702/678/672/665**, against unchanged floors **694/674/668/641**. The improvement from n388 is unattributed; this is not proof that a named engine defect was repaired. [Current authority](../40_reports/CALIBRATION_MASTER.md). Historical per-commit evidence:
  [S0 ladder](../40_reports/20260829_RE_S0_CHECKPOINT_LADDER_AND_FLOOR_BREACH.md).
- **Complete RC narrow packet:** the default-OFF v3 selector plus reversible D-shape is retained. Paired 188-week runs produced hash `70d5e04c6f49e041`, fingerprint `22cf3c5d8884bfb8`, 31/31 anchors, 6/6 bot benchmarks, 7/7 health gates, one live non-enclave HRHB damage/capacity write, and full Section 6 pass. Bucovaca peaked at strain 62 and recovered to 37; Sipovo/Drvar peaks remained 11/7.5. D-topology neighbour cascade remains owner-reserved and is post-1.0.
- **Parallel non-engine lane:** R7 audio implementation landed at `2d106e5e0`. Cinematic-opening
  mechanics, unified typography, and the five-viewport browser proof are complete, and the two
  required analogue-first owner plates (splash and neutral monitoring room) are integrated, so that
  art gate is CLOSED. The separately approved atmospheric map-portal texture is also integrated; it
  is decorative terrain relief, not a gameplay map and not faction/control truth. Live packaged-Electron first-paint acceptance was RUN on 2026-08-29 and **PASSES**. Closing it
  required fixing two pre-existing defects: a missing `build.files` entry that killed the packaged
  app at startup, and a cyclic chunk graph from source-level `manualChunks` that stopped the
  production bundle booting at all. Both are fixed and both now have gates. Three-resolution English
  screenshot inspection and clean POST-A neutrality proof now pass. Human audio/sensitivity,
  scoped offline-runtime evidence and baseline acceptance remain open; use the existing R7 plan's
  closeout checklist. Multilingual localization remains post-1.0.
- **R7 presentation/English-readability amendment registered 2026-09-05.** Capturing the publisher
  pitch at full HD produced a frozen 29-finding
  [showcase screenshot GUI audit](../40_reports/working/20260903_SHOWCASE_SCREENSHOT_GUI_AUDIT.md); a
  four-specialist Tier-1 panel with disjoint finding ownership then root-caused it
  ([panel record](../40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md), each item
  carrying its field's WRITER and its READING SURFACE at `file.ts:line`). The located English and
  presentation half is scheduled as an
  [R7 amendment](2026-09-05-r7-presentation-and-english-readability-amendment-plan.md) — renderer-only,
  byte-neutral to the simulation, **no new lane**. **No bugs are fixed by it** (owner decision D1,
  2026-09-04: HOLD FOR R8); the eight bugs pre-seed into R8's own plan as an inert finding register
  that starts nothing while R8 waits. Three findings close with no code at all: 19b's unrounded
  `−4.04` precision is **canon-required** by `SENSITIVE_HISTORY_DESIGN_GATE.md:143`, 27 is generated-art
  content, and 8e is a content-authoring template. Two audit premises were **wrong** and were caught
  only by requiring writer+reader before planning: finding 2 is a municipality-level economic-collapse
  ratchet, not EH-3 `stranded_status`; and finding 10's `FORCE BALANCE: REDACTED` is not fog-of-war as
  designed but a field with **no writer anywhere in `src/`**. Three findings remain HELD with
  exhaustive negative evidence and one named unblocking query each.
- **R7:** dates/POST-A pass; baseline open.
- **R7 ARBiH brigade honorific name correction, IMPLEMENTED 2026-09-07.** 33 brigades displayed
  earn-in-play combat honors as already granted at t0; fixed display name only, `id` untouched.
  Mechanical fields unchanged; saved/displayed name text changes. Integrated from `r7-arbih-honorific-names`. [Plan](2026-09-07-arbih-brigade-honorific-name-correction-plan.md).
- **Unscheduled work landed 2026-09-01/04, recorded so it is not mistaken for roadmap progress.**
  PRs #491–#497 touched no lane and no lane row's status changes for them. #491 fixed the tactical
  toolbar collision and added the geometric (not `scrollWidth`) verifier `tools/ui/verify_toolbar_fit.mjs`
  — which still reports **PARTIAL** coverage, because it exercises only the chips present in the one
  tracked save it loads. #492–#495 covered calibration-state reporting for merge children and
  merged-away OSID rendering; #494 turned the 744-drawn-versus-712-simulated OSID gap into an
  executable invariant. **#496/#497 net position:** the committed `operational_initial_master.json`
  and its derive script disagree on **269 of 712 rows**; the ~227 `stability_score` rows are real and
  reach the sim through `control_flip.ts:384`, while the 42 `contested_control` flips are **cosmetic**
  — no reader in `src/sim/`, and the field is zeroed for every OSID at init. The earlier "168 rows"
  and "`contested_control` is the headline" figures were retracted by those same PRs; do not carry
  them forward.
- **BC08 CLOSED by verification/disposition (2026-09-07):** historical red receipt retained. The 2026-09-08 combined-branch full gate passes with child-scoped Git Bash (13,717 passed, 31 skipped); cleanup plan records the repair. Final R8 acceptance stays open. [Evidence](../40_reports/audits/20260907_BC08_CURRENT_ENGINE_HEALTH_VERIFICATION.md).
- **Canon landed this cycle:** `SENSITIVE_HISTORY_DESIGN_GATE.md` **§10, "Provenance and the Integrity of the Historical Record"** — ratified by unanimous Pyrrhic panel (`5f462e8aa`), twelve conditions discharged across two rounds. `FORAWWV.md` §XIII temporal scope is drafted-but-**HELD** behind two engineering items (provenance channel separation + the determinism-scan pair) and is **not** canon.
- **Historical RE evidence:** corrected clean Node-22 pair at `177882fc2`; mixed-tree/Node-24 runs remain inadmissible. See the closed RE contract for provenance.
- **RE is closed and gates nothing.** Deferred and retired findings do not silently re-enter the critical path.
- **Remaining order:** R7; R8 behavior/cleanup plus R9 build preparation (§4.2); final calibration; final packaged acceptance; R9 freeze/readiness.
- **Publication boundary:** signing, store upload, public release creation, and a public `1.0` tag still require a separate explicit `Publish 1.0` instruction.

This snapshot governs any older status or "next" wording retained later in long workstream-history cells. Detailed evidence remains in the linked reports and project ledger; the derived command board must mirror this snapshot.

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

**Current sequence (2026-09-07):** R7 -> R8 behavior/cleanup and early R9 build preparation
(§4.2) -> final calibration -> final R8 packaged acceptance -> R9 freeze/readiness.
Diagnostic calibration stays open; D1 and BC04's current owner/panel conditions remain intact.

### 4.1 Finite behavior-closure register (2026-09-07)

**Current disposition:** BC01/02/03/08 CLOSED; BC04 campaign acceptance and BC05–BC06 open; BC07 retention settled.
BC09 Phase 1 locally implemented and reviewed (GO), final acceptance deferred. BC10 planned.

**BC02:** CLOSED 2026-09-07; Electron load/display only. No campaign or calibration change. BC03 CLOSED; BC04 P1 is implemented/reviewed with campaign acceptance deferred to next calibration (clean before/after retained; P1 repeat/ON companion retired); P2 implemented/reviewed; campaigns deferred.

**Register authority; completed and separately scheduled work is identified above.** These IDs index existing work, not milestones or a new lane.
FIX means planned repair **when scheduled**, not authority to implement. VERIFY/DISPOSITION means
bounded evidence followed by an accepted fix, proof of no relevant effect, or evidenced release
exclusion. D1 HOLD FOR R8 remains. R1–R5, the accepted R6 slice, RC and RE stay closed; calibration
stays open. [Detailed acceptance and sources](2026-07-31-full-campaign-electron-validation-plan.md#behavior-closure-acceptance-detail-2026-09-07)
live in the existing R8 plan; its previously proposed B10–B13/F1 are now registered, not scheduled.

| ID / existing home | Owner | Impact / pre-freeze disposition |
|---|---|---|
| BC01 player opportunities / R8 | Gameplay/operations + Game Designer + QA | **CLOSED — owner accepted repair and retired territory similarity (2026-09-07).** Verified L0/L1 review, L2 auto-apply/no queue, L3 observer across three factions. |
| BC02 B2/B9 sector/rating truth / R8 | Systems + QA | **CLOSED — verified 2026-09-07.** Electron save load rebuilds only transient ratings before player projection; canonical bytes and privacy remain intact. |
| BC03 B10 narrated Dayton / R8 | Events/systems + Game Designer + QA | **CLOSED 2026-09-07** — termination owner/COHA/signing repaired and verified; owner deferred post-horizon acceptance/tickers. Working negotiation preserved; no headless change. |
| BC04 B11 chronology + P1/P2 / R8/panel | Historian + systems + calibration + independent §6 panel | **P1/P2 IMPLEMENTED/REVIEWED; campaign acceptance deferred.** Preserve attribution and retired P1 repeat/ON runs; barracks stagger excluded. Ratified P2 targets and panel amendment: [BC04 evidence](2026-07-31-full-campaign-electron-validation-plan.md#bc04-bounded-implementation-plan--2026-09-07). |
| BC05 B12 NATO/Lukavac gates / R8 | Events/systems + Historian + QA | **NATO fixed (`0690a47ea`); Lukavac removed; reviewed GO.** Trnovo remains calibration-owned. Campaign/downstream acceptance open. [Evidence](2026-07-31-full-campaign-electron-validation-plan.md#bc05-bounded-nato-repair-and-lukavac-disposition--2026-09-07). |
| BC06 B13 posture/gestures / R8 | Gameplay/desktop + Game Designer + QA | **Local repairs reviewed GO; design disposed 2026-09-08.** Six new escalation stages deferred post-1.0; packaged acceptance open. [Repairs, live proof and disposition](2026-07-31-full-campaign-electron-validation-plan.md#bc06-bounded-posture-and-gesture-repair--2026-09-07). |
| BC07 stability divergence / calibration-data | Asset/data integration + Systems + calibration | **DISPOSED — RETAIN (GO).** Hybrid/ethnic bypass master stability; mode-less operational starts can consume it. Preserve committed values; no regeneration/repaint. [Disposition](2026-07-31-full-campaign-electron-validation-plan.md#bc07-stability-data-disposition--2026-09-08). |
| BC08 inherited test residual / verification | QA + owning Systems/Game Design | **CLOSED — verification/disposition.** Current simulation suites pass; one environmental full-suite failure classified, not erased. [Receipt](../40_reports/audits/20260907_BC08_CURRENT_ENGINE_HEALTH_VERIFICATION.md). |
| BC09 shared production inputs / R8 | Systems + QA | **LOCAL PACKET REVIEWED (GO).** [Phase 1 evidence](2026-09-07-r8-runtime-input-ai-integrity-plan.md): shared validation; real IPC 25/25 and one-turn baseline bytes match. Final acceptance deferred; BC07 policy separate. |
| BC10 optional AI ownership/replay / R8 | Commander + Systems + QA | **PLANNED:** [runtime packet Phase 2](2026-09-07-r8-runtime-input-ai-integrity-plan.md). Canonical commander owns final emit; recorded inputs replay without API calls. Cadet preserved; required Phase 0 review before code. |

**Acceptance boundary:** settle every row before final calibration acceptance, retain one-change-per-
controlled-run and applicable paired deterministic proof, then finish R8 packaged acceptance and R9.
No forced re-floor: n392 and unchanged floors remain until explained, authorized replacement.
B3/B4 serialized text/hash changes require exact delta and gameplay-equivalence evidence, not automatic
recalibration. New behavioral findings explicitly reopen affected closure/calibration evidence; they
never silently enlarge this finite list. Implementer and reviewer remain different people.

**Excluded:** retired RE/R6 work, D-topology, new mechanics, broad recurrence, horizon extension,
orphan-flag debt activation and broad drought authoring. F1 is diary triage with truthful positive
holds, not an event quota. The byte-neutral orphan ratchet may be scheduled separately and gates
nothing here. R7 continues disjoint presentation work; publication authority remains separate.

### 4.2 Repository audit integration (2026-09-07)

BC09 and cleanup Tasks 1–8 are GO; script handoff is ready. No new workstream:

| Owner / packet | Slot and overlap |
|---|---|
| R8 [deletion cleanup](2026-09-07-bounded-deletion-cleanup-plan.md) | Tasks 1–8 GO; health repair verified. A 13-worktree recheck found no executable RE consumer; final R8 acceptance is open. |
| R8 [runtime integrity](2026-09-07-r8-runtime-input-ai-integrity-plan.md) | BC09 integrated/reviewed GO; campaigns deferred. BC07 RETAIN disposition verified; BC10 planned. No regeneration. |
| R9 [build preparation](2026-09-07-r9-build-validation-preparation-plan.md) | P1–3 complete/review GO. |

R7 retains live English/readability work; R4/R5/RE stay closed. Package/lockfile edits are serial.
Keep live viewers/recovery, main-process composition and existing IPC contracts; no code-generation task.
BC04 conditions and retired P1 repeats remain unchanged. Existing gates apply; reuse evidence only
on matching contracts/inputs. No baseline refresh, remote configuration change or publication is implied.

## 5. Workstream Register

| ID | Workstream | Status | Executable plan | Complete when |
|---|---|---|---|---|
| R1 | Seamless Command Room ↔ Tactical Map | **COMPLETE — CLOSED 2026-08-01** | [Map-transition plan](2026-07-31-seamless-command-room-map-transition-plan.md) | Warm switch shows current-turn/current-fingerprint truth without renderer reconstruction, static refetch, WebGL error, or visible wait; cold entry meets the measured plan budget. |
| R2 | RS Desk → Decision → Advance friction | **COMPLETE — CLOSED 2026-08-03 (v14 clean pass)** | [RS friction plan](2026-07-31-rs-104week-friction-remediation-plan.md) | Five diary findings close; no contradictory urgency; sourced opportunity/positive-hold cadence is intelligible; ultrawide and map handoff pass Electron proof. |
| R3 | Operational/Tactical Group convergence | **COMPLETE** | [TG closeout plan](2026-07-31-operational-tactical-group-closeout-implementation-plan.md) | One offensive task-organization path, synchronized lifecycle/AHQ receipts, terminal telemetry, unique sourced promotions, locked exhaustion constants, and aligned Standing-OG doctrine. |
| R4 | Command, event, and Dynamic Codex convergence | **COMPLETE — CLOSED 2026-08-06** (Phase 6 merged, PR #481 → main `40d3c5452`). Twelve-specialist panel fixes 6.1–6.5 landed; calibration byte-identical, independent Code Review + QA GO. Detail in [archive](MASTER_ROADMAP_ARCHIVE.md#closed-lane-detail-moved-2026-09-10). | [Command/event/Codex plan](2026-07-31-command-event-codex-convergence-plan.md) (Phase 6) | Five presidential levers remain; Decision Room owns action; Desk owns triage; events, Chronicle, Cost Ledger, and Codex share deterministic receipts and priority truth. |
| R5 | Engine quality, performance, and stability | **COMPLETE — CLOSED 2026-08-05** at the ~1,086 ms/turn floor. Every self-executable item done; Phase 2e reverted on a measured regression; Task 6 DECLINED, not deferred, and the 100 ms/turn target is retired. Detail in [archive](MASTER_ROADMAP_ARCHIVE.md#closed-lane-detail-moved-2026-09-10). | [Engine-quality plan](2026-07-31-engine-quality-performance-stability-plan.md) / [Phase 2c/2d packet](2026-08-01-r5-phase2c-amortized-sector-topology-plan.md) / [Phase 2e pure solve](2026-08-02-r5-phase2e-pure-full-solve-serial-commit-plan.md) | Optional state is classified, measured hot paths improve without byte drift, save/replay contracts are stable, generated artifacts have owners, and local/CI release checks match. |
| R6 | Historical gameplay depth and final calibration | **PRE-1.0 SCOPE COMPLETE — CLOSED 2026-08-09** (`n163`: 634 matched, 30/31 anchors, Section 6 correct, 40w fingerprint golden). Do not conflate the later 629/31-of-31 integration baseline with this closeout snapshot. Remaining items are post-1.0 debt. Detail in [archive](MASTER_ROADMAP_ARCHIVE.md#closed-lane-detail-moved-2026-09-10). | [Historical-gameplay plan](2026-07-31-historical-gameplay-depth-calibration-plan.md) · [exhaustion/scoring plan](2026-08-06-exhaustion-scoring-redesign-plan.md) | Calendar/weak-predicate events cannot manufacture control; experiments close by predeclared criteria; long-run evidence remains deterministic and Section 6-safe. |
| RC | Pressure → exhaustion → **COLLAPSE** pipeline | **PRE-1.0 NARROW SCOPE COMPLETE — CLOSED 2026-08-15.** Retained v3 selection plus reversible D-shape; deterministic and trajectory-flat, 31/31 anchors, 6/6 benchmarks, 7/7 health gates, full Section 6 pass. D-topology is explicitly post-1.0. Detail in [archive](MASTER_ROADMAP_ARCHIVE.md#closed-lane-detail-moved-2026-09-10). | [Scope](../40_reports/proposals/20260609_SCOPE_collapse_pipeline.md) · [build spec](../40_reports/proposals/20260609_COLLAPSE_PIPELINE_BUILD_SPEC.md) · [measurement plan](2026-08-15-collapse-d-selection-measurement-plan.md) · [D-shape design](2026-08-15-collapse-d-shape-design.md) · [Stage 0/2 panel record](../40_reports/20260813_RC_COLLAPSE_PANEL_FROZEN_ARTIFACT.md) | The default-OFF local collapse model measures historically discriminating combat pressure, recovers on quiet turns, reaches a bounded live writer, preserves Section 6, and leaves neighbour cascade to an explicit post-1.0 topology packet. |
| RE | 1.0 engine integrity: seven outcomes, no general cleanup | **CLOSED — owner, 2026-09-01.** RE gates nothing: not calibration, not R7, not R8. P2B and the auxiliary prerequisite are retired history. Engine health remains sacrosanct as a principle, not as an RE gate. Detail in [archive](MASTER_ROADMAP_ARCHIVE.md#closed-lane-detail-moved-2026-09-10). | [1.0 contract](2026-08-26-engine-integrity-plan.md) · [recovery plan](2026-08-28-packaged-probe-recovery-plan.md) · [living audit](../40_reports/audits/20260826_RE_LEAN_ENGINE_INTEGRITY_EXECUTION.md) | The unproven prerequisite config/test hypothesis was rolled back exactly and its receipt closed. P2B–P7 and final-pair/profile gates are retired historical acceptance, not unfinished current work; no successor proof route is active. |
| R7 | Content, historical attribution, audio, accessibility, and opening experience | **ACTIVE — OPENING AND ENGLISH SCREENSHOT PROOF COMPLETE; ACCEPTANCE OPEN.** Mechanics, typography, required owner art and browser proof pass; live packaged first-paint acceptance passed 2026-08-29. The decorative map-portal texture carries no gameplay state; the optional foreground asset does not gate. The readability amendment has reviewed image proof at 1920x1080, 1366x768 and 3440x1440 plus clean POST-A neutrality evidence. Use the parent plan's reconciled listening/approval checklist for human audio/sensitivity, scoped offline-runtime evidence and remaining acceptance. The inherited six-pin baseline gate remains open; n392 is accepted, POST-B is dirty and the one-PRE/two-POST budget is consumed. No pin refresh or duplicate campaign. D1 HOLD FOR R8 remains; Phase 3 localization stays post-1.0. The ARBiH name correction is integrated. WR01 (warroom whiteboard date and corkboard map presentation) is scheduled inside the amendment plan and does not gate current R7 acceptance. | [Content/history/audio plan](2026-07-31-content-history-localization-audio-plan.md) · [accepted functional opening plan](2026-08-23-opening-screens-implementation-plan.md) · [cinematic opening and typography amendment](2026-08-28-cinematic-opening-typography-implementation-plan.md) · [presentation and English-readability amendment](2026-09-05-r7-presentation-and-english-readability-amendment-plan.md) · [ARBiH names](2026-09-07-arbih-brigade-honorific-name-correction-plan.md) · [WR01 warroom presentation design](2026-09-10-warroom-whiteboard-date-and-corkboard-map-design.md) | Claims, identities, English strings and audio have audited provenance; unsupported content is absent; opening and English presentation evidence passes; human audio/sensitivity, offline runtime, baseline and remaining closeout acceptance pass. |
| R8 | Full-campaign packaged-Electron validation and diaries | **WAITING ON R7.** §4.1/4.2 owns remaining behavior, cleanup and build-preparation dependencies. BC01 is closed; [earlier headless D2 evidence](../40_reports/playtests/20260901_d2_full_campaign_all_three_factions.md) is not final packaged acceptance. | [Electron-validation plan](2026-07-31-full-campaign-electron-validation-plan.md) | Fresh three-faction full-duration campaigns and final two clean 5/5 diaries on settled behavior/build inputs. |
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

Local source anchors:

- [Early-war territorial progression](../../data/derived/knowledge_base/balkan_battlegrounds/extractions/EARLY_WAR_TERRITORIAL_PROGRESSION_APR_JAN1993.md)
- [Balkan Battlegrounds Volume II page 453 extraction](../../data/derived/knowledge_base/balkan_battlegrounds/pages/BB2_p0453.json)
- [Balkan Battlegrounds Volume II page 454 extraction](../../data/derived/knowledge_base/balkan_battlegrounds/pages/BB2_p0454.json)

Official corroboration:

- [IRMCT: Sarajevo](https://www.irmct.org/en/mip/features/sarajevo)
- [ICTY/IRMCT: Prosecutor v. Sefer Halilović judgment summary](https://r.irmct.org/en/press/judgement-case-prosecutor-v-sefer-halilovic)
- [ICTY/IRMCT: Krstić appeal judgment summary](https://aomenduchangnvrenshuqian.irmct.org/en/press/appeals-chamber-judgement-case-prosecutor-v-radislav-krstic)
- [United Nations A/54/549: The fall of Srebrenica](https://documents.un.org/api/symbol/access?l=en&s=A%2F54%2F549&t=pdf)

### 6.5 Post-1.0 localization and pre-1.0 audio

- **Owner decision 2026-08-15:** unfinished multilingual localization no longer gates 1.0. English is the only required release language for 1.0; existing translated/compatibility work remains in place but is not represented as production-complete.
- Post-1.0 localization retains the settled contract: canonical Bosnian locale `bs`, formatting `bs-BA`, legacy `bcs` migration/alias, deterministic pseudolocalization before visual LQA, and explicit Preview labeling until native review is complete.
- Audio priority: first-party/generated UI sound, then CC0, then explicitly approved CC BY with title/author/source/license and checksum.
- Do not use CC BY-NC, unverified anthem/folk recordings, speeches, screams, or gunfire/atrocity spectacle.

Standards and licensing references:

- [W3C language-tag overview](https://www.w3.org/International/articles/language-tags/Overview.en)
- [Unicode CLDR Bosnian summary](https://unicode.org/cldr/charts/49/summary/bs.html)
- [Microsoft pseudolocalization method](https://learn.microsoft.com/en-us/globalization/methodology/pseudolocalization)
- [W3C WCAG](https://www.w3.org/WAI/standards-guidelines/wcag/)
- [Creative Commons CC0](https://creativecommons.org/public-domain/)
- [Creative Commons attribution/TASL guidance](https://creativecommons.org/reusing-cc-licensed-content/)
- [Freesound licensing FAQ](https://freesound.org/help/faq/)

### 6.6 Map, Electron, and release architecture

- Measure cold and warm map entry before optimizing.
- Keep campaign-scoped map renderers mounted; visibility is not lifecycle.
- Cache immutable static resources per renderer session; current campaign/control/decision/fog truth remains live.
- Defer noncritical enrichment until after the meaningful current-state frame.
- Preserve Electron isolation/security while optimizing; never trade security for startup time.
- Steam is the primary store. Direct artifacts are signed Windows, notarized macOS, and Linux AppImage.
- Windows signing uses Microsoft Artifact Signing/SignTool; macOS uses Developer ID and `notarytool`.
- Credentials are secure injected inputs, never repository content or a reason to leave product planning unresolved.

Primary references:

- [Electron performance guide](https://www.electronjs.org/docs/latest/tutorial/performance)
- [Electron security guide](https://www.electronjs.org/docs/latest/tutorial/security)
- [MapLibre GL JS documentation](https://maplibre.org/maplibre-gl-js/docs)
- [Microsoft SmartScreen and Artifact Signing](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation)
- [Microsoft SignTool](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool)
- [Apple notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
- [SteamPipe](https://partner.steamgames.com/doc/sdk/uploading)

## 7. Experiment Outcome Matrix

| Experiment | Adopt when | Retire when | Always preserve |
|---|---|---|---|
| Political `intl_only` | Historical direction, faction separation, engine health, determinism, and control/casualty bounds all pass the R6 thresholds | Any hard criterion fails or the effect is materially redundant | Recorded seed/config/baseline and a concise result report |
| Political `cohesion_only` | Same criteria, evaluated only after the first branch is dispositioned | Same failure rule | Same evidence |
| Intel ambush | Adds readable uncertainty and historically plausible cost without hidden-truth leakage or destabilizing calibration | Fails comprehension, determinism, or historical/calibration bounds | Focused test/report and clean revert |
| Fall-1995 E-A6 | E-B1 evidence leaves the exact named residual and E-A6 corrects it without breaking other bounds | E-B1 closes the residual or E-A6 causes collateral drift | E-B1 remains; E-A6 row closes as not needed |
| Performance optimization | Profiled bottleneck improves materially and byte/state/render truth is unchanged | Noise, regression, stale truth, or complexity exceeds benefit | Characterization and before/after measurements |
| Sourced cadence initiative | Source, existing lever, deterministic eligibility, optionality, and cadence value all pass | No source-backed lever exists | Explicit positive-hold interval |

No experiment remains “partial” after evaluation.

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
| 2026-09-08 | Six address/decoration escalation stages; retain static 1.0 behavior. | [BC06 disposition](2026-07-31-full-campaign-electron-validation-plan.md#bc06-final-design-disposition-and-bc09-authorization--2026-09-08) | **DEFERRED POST-1.0**, owner-delegated scope exception; not full canon compliance. Packaged gate remains. |
| 2026-08-15 | Collapse D-topology: add an explicitly reviewed neighbour-loss/cascade mechanism only if post-1.0 thesis-depth work requires territorial propagation beyond the retained local selection/shape model. Must reopen ordinary Section 6 review and fresh 188-week re-floor; do not reopen struck breadth tuning. | [RC panel synthesis](../40_reports/20260813_RC_COLLAPSE_PANEL_RECONCILER_SYNTHESIS.md#option-d--address-the-model-three-variants-priced-very-differently) | **RESERVED POST-1.0**; narrow RC lanes 1-3 are complete and this does not gate R7, R8, R9, or 1.0 |
| 2026-08-15 | Multilingual localization: canonicalize `bs`/`bs-BA`, migrate legacy `bcs`, add deterministic pseudolocalization, complete Bosnian strings, obtain native linguistic/in-product review, and run locale-specific packaged visual proof. Existing translations/compatibility remain; English is the sole required 1.0 language. | [R7 plan Phase 3](2026-07-31-content-history-localization-audio-plan.md#phase-3----deferred-post-10----bosnian-locale-contract-and-localizability) | **DEFERRED POST-1.0 by owner decision**; does not gate R7, R8, R9, or the 1.0 release |
| 2026-08-05 | Faction-wide current equipment totals visibility (Warroom Faction Overview MILITARY quadrant + Army HQ corps-list rollup) | [Design note](2026-08-05-faction-equipment-totals-visibility-design.md) | Proposed — not implemented; does not gate any R1–R9 lane |
| 2026-08-05 | Local Support presidential lever reads as a mandatory free weekly click rather than a real decision — Game Designer's Pyrrhic panel review confirms the underlying mechanic (single expiring weekly slot, no CA cost) is intentional two-tier lever design, not a bug, but there's currently never a reason not to fire it. Candidate (not approved): 4-week commitment lock-in instead of a per-turn overwrite. | `docs/40_reports/20260805_RS_PLAYTHROUGH_PYRRHIC_PANEL_SYNTHESIS.md` | Proposed — not implemented; canon-silent per Game Designer's own review; does not gate any R1–R9 lane |
| 2026-08-06 | Rename player-facing "sector" → "Operational Group" (OG) and auto-name EVERY OG with a real historical name (attested OG/TG/OZ verbatim where known — the existing `ATTESTED_OG_NAMES`/`resolveAttestedOgName` in `GameStateAdapter.ts`; geographic `"{dominant_mun} OG"` fallback for the rest). DISPLAY-LAYER ONLY per ADR-0006 (engine `sector_id` unchanged, no sector-removal refactor). Zero calibration/engine risk; deterministic; §6-safe (attested names historian-sourced, place-name fallback). | [Design](2026-08-06-sectors-to-og-naming-design.md) | SCOPED (owner-requested 2026-08-06, tackle eventually) — not implemented; schedulable any time, no lane dependency |
| 2026-09-05 | **Casualty-formatter consolidation.** Four competing formatters render the same casualty numbers on the same screens: `fmtK` (`formatters.ts:125-128`), `formatPersonnel` (`formatters.ts:120-122`), `localizedInteger`, and raw `String(...)`. Two components additionally **inline-duplicate** `formatPersonnel`'s exact `>=1000 ? toFixed(1)+'k'` logic without importing it (`BrigadeRow.tsx:153`, `SettlementDetailContent.tsx:921`). The R7 amendment fixes the four surfaces the audit caught (missing M-scale branch, mixed styles on one screen, a raw unseparated third style) but deliberately does **not** sweep the repo. | [R7 amendment §9.4](2026-09-05-r7-presentation-and-english-readability-amendment-plan.md) · [panel record §3](../40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md) | Proposed — a `code-simplifier` pass, not a lane; does not gate any R1–R9 lane |
| 2026-09-05 | **Full turns→weeks sweep.** A turn is a week and the player is never shown "turns", but ~20 keys beyond the three the audit named still say so. **The list is recorded here so it is not re-grepped:** `opsPlanning.commander.optionAria`, `commanderSelect.personalityPrep`, `turnAftermath.campaignCost.briefing.*`, `deskAuthority.cadence`, `eventDecision.effect.*` (×7), `eventModal.effect.duration`, `commandStrain.recovery.resolving.*`, `commandBriefing.item.enclave.detail`. The R7 amendment changes only `messages.en.ts:2166,1892,1894` plus `officerCharacter.ts:211-215`'s month branch. | [R7 amendment §9.4](2026-09-05-r7-presentation-and-english-readability-amendment-plan.md) · [panel record §4](../40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md) | Proposed — string-only, zero engine risk; does not gate any R1–R9 lane |
| 2026-09-05 | **Per-candidate decorate-a-unit content (audit finding 8e).** Three real, distinct formations offer byte-identical body copy and byte-identical effect rows because one authored response template per faction (`data/scenarios/events/war_1993.json:8172-8194`) is cloned verbatim over every eligible candidate by `src/desktop/decorate_unit_contract.cjs` — whose own comment confirms this is deliberate ("authored effects come straight from the authored event, no fabricated"). Neither a duplicate-render bug nor two coincidentally-identical entities: **a content-authoring gap**. Needs per-candidate variation authored, not a code fix. | [panel record §5](../40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md) | Proposed — routes to Narrative Designer / Game Designer; belongs to neither the R7 amendment nor R8's bug register |
| 2026-09-05 | **HRHB warroom wall-map plate regeneration (audit finding 27).** The HRHB corkboard is mostly empty with a tiny outline confined to one corner, where the RS plate fills the frame. All three plates composite through the **same** `WarroomScenePlate` with no faction-conditional sizing, cropping, or filter — the difference is entirely in the generated `.webp` content, so **no code fix exists**. The owner generates all images externally. | [panel record §1, §5](../40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md) | Proposed — an owner art action, not an engineering lane; does not gate any R1–R9 lane |
| 2026-09-05 | **Dead export cleanup: `PRESIDENTIAL_DESK_BACKGROUND`.** `grep -rn` returns exactly one hit repo-wide — its own declaration at `src/ui/map/data/presidentialDeskAssets.ts:28`. Zero importers in `src/`, zero in `tools/`. Removing it also retires its unused `hq_presidential_desk_1992.webp` import. Found incidentally while tracing audit finding 24. | [panel record §1, §5](../40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md) | Proposed — trivial, but it is cleanup and therefore not 1.0 scope; does not gate any R1–R9 lane |
| 2026-09-06 | **Event-catalog consolidation: ratchet FIRST, then the debt, then drought authoring.** One row, not three, because all three touch the same six files and doing them separately costs three re-floor runs instead of one. **(a) The orphan-flag ratchet is the load-bearing half and is byte-neutral.** MEASURED: 234 flags written by the catalog, 134 read by triggers, **32 read but never written by catalog or engine, gating 70 events**. The decisive fact is that this **regenerates**: [`2026-03-23-event-flag-wiring-plan.md`](2026-03-23-event-flag-wiring-plan.md) closed 2026-03-25 stating *"Zero orphan flags remain"* — and `consequences.json` **did not exist until 2026-04-22**, so all 32 arrived afterwards with the Wave 4-18 authoring, which was itself signed off as *"condition-kind utilization healthy"* while counting the very reads that had no writers. Wiring the 32 without the check means Wave 19 recreates them. Fix: a whole-catalog pass at load — every flag an event reads must resolve to a writer (another event's `sets_flags`, or an explicit engine allowlist); allowlist the current 32 as recorded debt so the build stays green, and **fail on anything new**. The loader already fail-closes row-by-row via `failRow` and `EVENT_FILES` loads all six files together, so the cross-file pass has an obvious home. Cannot move a calibration number — it passes or breaks the build. **(b) The debt itself, in three tiers**: 7 flags whose meaning is unambiguous and whose state already exists; ~10 where the number exists but the *definition* does not (what is `cumulative_casualties_x100` a percentage OF? what makes an offensive "major"?); ~6 authored against mechanics that were never built at all (no grain corridor, no corridor-hostility concept, no corps reorganisation) — **likely deleted rather than built**. **NOT a pacing fix: only 2 of the 70 blocked events carry `response_options`**, so the whole layer adds two player decisions in 188 weeks. Re-floor class — ~69 consequence events with real supply/morale/patron effects firing for the first time. **(c) Drought authoring** — the sourced-candidate coverage ledger for w139-188, acceptance being zero open AUTHORABLE rows with the resulting cadence an *output*, never a per-week quota (`MASTER_ROADMAP.md:217` forbids *"'invent a decision' to fill a quiet historical interval"*; §6.1 ranks a truthful quiet week above a fabricated choice). | [Observations](../40_reports/audits/20260906_ORPHAN_EVENT_FLAGS_OBSERVATIONS.md) · [Investigation](../40_reports/20260905_EVENT_FIRING_SATURATION_AND_DEAD_CATALOG.md) · [P3 sweep](../40_reports/audits/20260906_FACTION_CONTROLS_MUNICIPALITY_THRESHOLD_SWEEP.md) | Proposed — **(a) is schedulable any time** (byte-neutral, no lane dependency); (b) and (c) sit **after D2** and need their own controlled 188w. Does not gate R7, R8, R9 or 1.0. Dayton-ending, chronology and the one-turn-window lint are **already routed to R8's pre-seeded register** and are NOT part of this row |

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

For each workstream, the orchestrator records:

```text
Workstream:
Plan:
Base and final commit:
Tasks completed:
Focused verification:
Long-run/package evidence:
Behavior/baseline disposition:
Historical/source review:
Bug findings:
Friction findings:
Ledger/canon/docs propagation:
Remaining dependency:
Next workstream:
```

At program close, append one final ledger entry, link the R8 diaries and R9 manifest, mark R1–R9 and RE complete here and on the command board, and run the full verification set. Do not publish implicitly.
