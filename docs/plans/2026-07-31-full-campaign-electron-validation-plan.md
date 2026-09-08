# Full-Campaign Electron Validation and Diary Implementation Plan

> **For implementation:** REQUIRED SUB-SKILL: use `executing-plans` and execute one phase at a time.

**Goal:** Validate the completed roadmap through owner-style packaged Electron play as RBiH, RS, and HRHB, produce reproducible evidence and diaries, and automatically route every confirmed bug or top friction item back to its owning workstream until the final sessions are clean.

**Architecture:** Extend the existing Electron QA harness rather than creating a second player. Bind every session to its package, commit, scenario, faction, action transcript, autosave, replay, screenshots, console/network diagnostics, and cadence report. Use a fixed historical-choice policy, exercise the real Desk -> Decision -> map/Army HQ -> Advance loop, and classify findings as bugs or friction before remediation.

**Tech stack:** Electron, Playwright/CDP, packaged directory build, `paradox_local_qa.cjs`, deterministic autosave/replay comparison, Markdown diary template.

**Date:** 2026-07-31
**Status:** READY -- executes after R1-R7 are green
**Roadmap workstream:** R8
**Canonical owner:** packaged Electron UI and bound autosave/replay; diary is the product verdict
**Collision rule:** This plan does not repair source while a session is running. Findings are routed to the owning plan, verified, then the affected session restarts from a fresh campaign.
**Activation:** `Execute the master roadmap` authorizes transient local directory packages for this validation, but not installer publication, signing, upload, tag, or release.

---

## Subordinate audit packets (2026-09-07)

2026-09-08: cleanup Tasks 1–8 and R9 preparation Phase 1 are reviewed GO.
Phase 1 committed as `38066eec2`; Phase 2 check ownership is complete/review GO.
These focused receipts do not replace final packaged acceptance on matching inputs.
Phase 3 exclusions and focused same-package input/turn/route proof pass; the combined
suite passes 13,520 tests with 31 skips, with independent review GO. Final R8 package acceptance remains open.

[Master §4.2](MASTER_ROADMAP.md#42-repository-audit-integration-2026-09-07) integrates the repository
audit into existing owners. The original planning turn made no implementation changes.

- [Deletion cleanup](2026-09-07-bounded-deletion-cleanup-plan.md), Tasks 1–8: original four plus
  obsolete commands/tools/UI/smoke/hooks. Script handoff precedes dependency work; event/UI tasks
  wait for their BC04/05/06 and R7 owners. KEEP with evidence is valid.
  **2026-09-08:** cleanup Tasks 1–2 are complete with independent review GO. Task 1
  deleted the unused runner/import; Task 2 removed the global event-registry fallback
  while preserving injected catalogs and optional pipeline omission. Tasks 3–8 remain
  planned. Focused event/pipeline tests and typecheck pass; final campaigns and packaged
  acceptance remain deferred.
- [Runtime integrity](2026-09-07-r8-runtime-input-ai-integrity-plan.md): BC09 shared validated inputs
  supplies BC07 delivery evidence; BC10 optional-AI authority/replay follows BC09 and command
  settlement. These are explicit new behavior rows, not reopening R4/R5/RE or absorbing BC07 policy.
- [R9 build preparation](2026-09-07-r9-build-validation-preparation-plan.md): limited early R9
  dependency/CI/payload work must finish before final calibration and final packaged diaries.

R7 remains ahead of R8. Preserve D1, BC04's current panel/owner conditions and retired P1 repeats.
Finish integration before final calibration; final diaries use that exact build. R9 freeze follows
R8 and does not repeat these corrections on an already accepted artifact. Keep existing campaign
and platform acceptance; only matching-input evidence can satisfy the same check twice.

## 1. Resolved decisions

1. Validation uses the packaged directory build produced by `npm.cmd run desktop:package:dir`, not a loose Vite/browser session. Package output remains transient and uncommitted.
2. RBiH, RS, and HRHB each receive a 24-turn shakedown and a fresh 188-turn full-campaign session.
3. Choice policy, in order: authored historical default; accepted historical operation; explicitly sourced faction doctrine; least-intervention/restraint option. Never invent an undocumented historical default.
4. If no option can be ranked by that policy, choose the UI's staff recommendation only as a clearly logged player input, not as a historical claim.
5. The player must actively inspect the map, Army HQ, Records, Chronicle, Codex, Cost Ledger, and settings; this is not an Advance-button soak.
6. Bugs are repaired before friction. A bug is broken promised behavior, stale/incorrect state, crash/error, blocked progress, or inconsistent surface truth. Friction is working behavior that is slow, obscure, repetitive, or insufficiently presidential.
7. Final acceptance requires two consecutive diaries with no new Desk -> Decision -> Advance friction, no confirmed bug, and President-feel 5/5. If a faction scores below 5, its top reason becomes a remediation packet and that faction reruns.

## 2. Purpose and non-goals

### In scope

- packaged runtime launch and evidence binding;
- historical-choice transcript and decision provenance;
- 24-turn and 188-turn sessions for all three factions;
- real map/presentation/polish exploration;
- console, network, WebGL, timing, clipping, accessibility, save/replay, cadence, and state diagnostics;
- complete diaries from `docs/40_reports/playtests/TEMPLATE.md`;
- automatic bug-first then friction remediation routing and rerun.

### Non-goals

- no headless run presented as player evidence;
- no fabricated choice or undocumented historical-default claim;
- no reuse of a contaminated save after source changes;
- no committed package/evidence binaries;
- no installer signing, upload, version, tag, or public release.

## 3. External-agent execution contract

```powershell
git status --short --branch
Get-Content -Raw .claude/napkin.md
Get-Content -Raw docs/life_lessons.md
Get-Content -Raw docs/plans/MASTER_ROADMAP.md
Get-Content -Raw docs/40_reports/playtests/TEMPLATE.md
Get-Content -Raw docs/40_reports/implemented/20260731_D2_OWNER_DIARY_REMEDIATION_AND_REPOSITORY_CLOSEOUT.md
Get-Content -Raw tools/ui/paradox_local_qa.cjs
npm.cmd run desktop:release:check
```

Evidence roots must be unique `tmp-playtest-<date>-<faction>-<run>/` directories. The harness refuses to overwrite an existing evidence archive. Every screenshot and canonical save copy receives SHA-256 provenance.

## 4. Historical-choice policy contract

Create one transcript row per decision:

| Field | Required value |
|---|---|
| Turn/date | Exact current turn and rendered date |
| Decision id/family | Stable runtime id |
| Options | Player-visible option labels/ids |
| Choice | Exact selected id |
| Basis class | `authored_historical_default`, `historical_operation`, `sourced_doctrine`, `restraint`, or `staff_recommendation` |
| Source | Event source note, BB volume/page, official source URL, or `none` for staff recommendation |
| Player input | Always `true`; never imply headless equivalence |
| Screenshot | Pre-choice and receipt paths |

The harness may automate clicking but must not generate an option or source.

## 5. Phase sequence

## Phase 0 -- Harness and evidence contract

**Assigned role:** QA Engineer + Platform Specialist
**Independent review:** Determinism Auditor

### Task 0.1 -- Pin packaged-runtime launch

**Files:**

- Modify `tools/ui/paradox_local_qa.cjs`
- Modify `tools/desktop_packaged_runtime_probe.mjs`
- Modify `tests/desktop_packaged_runtime_probe.test.ts`
- Modify `tests/playtest_evidence_packet.test.ts`

- [ ] Accept an explicit packaged executable path and reject a dev Electron binary for R8 runs.
- [ ] Record package path, size, SHA-256, package version, commit, scenario, faction, viewport, OS, GPU/WebGL renderer, and harness command.
- [ ] Start/verify the tactical local host exactly as packaged runtime requires.
- [ ] Treat HTTP >=400, request failure, uncaught exception, console error, GPU/WebGL context loss, and stale readiness as findings.

### Task 0.2 -- Add action/cadence/performance evidence

**Files:**

- Modify `tools/ui/paradox_local_qa.cjs`
- Modify `tools/ai_play/desktop_calibration_compare.ts`
- Modify `tests/playtest_telemetry.test.ts`
- Modify `tests/playtest_evidence_packet.test.ts`

- [ ] Record every navigation, decision, Command Authority action, recruitment, map focus, counter selection, filter change, advance, and save.
- [ ] Record Command Room -> map cold/warm timing and current-turn/fingerprint readiness.
- [ ] Record consequential decision and presidential-beat gaps.
- [ ] Bind initial/final autosaves and replay to the exact Electron transcript.
- [ ] Keep playtest telemetry local/default-off outside the harness.

```powershell
npm.cmd run test:vitest -- tests/desktop_packaged_runtime_probe.test.ts tests/playtest_evidence_packet.test.ts tests/playtest_telemetry.test.ts tests/playtest_telemetry_flag.test.ts tests/desktop_replay_live_wire_smoke.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run desktop:release:check
```

`/simplify` -> review -> commit `test(playtest): bind packaged diary evidence`

## Phase 1 -- Three-faction 24-turn shakedown

**Assigned role:** QA Engineer acting as player
**Independent review:** Process QA

For each faction in fixed order `RBiH`, `RS`, `HRHB`:

- [ ] Build once from the exact commit; reuse the same package for all three shakedowns.
- [ ] Start a fresh campaign and verify faction/scenario/opening date.
- [ ] Set the intended autonomy explicitly and record it.
- [ ] Resolve decisions with the historical-choice policy.
- [ ] On turns 1, 4, 8, 12, 16, 20, and 24 inspect Desk, map, Army HQ, Records/Chronicle, and any active decision source.
- [ ] Exercise exact counter/stack selection, map filters/modes, operation dossier focus/return, Save, and one load/replay route.
- [ ] Capture initial, each decision, each required checkpoint, every anomaly, and final evidence.
- [ ] Require exact final turn 24 and matching autosave/replay/transcript state.

**Immediate handling:** A crash, corrupt save, blocker, stale map, wrong-faction truth, incorrect historical date, or deterministic mismatch ends that faction's run. File the evidence, repair in its owner plan, and restart all affected shakedowns on a fresh package.

## Phase 2 -- Three full 188-turn owner-style campaigns

**Assigned role:** QA Engineer acting as player
**Independent review:** Historian + Wargame Advisor

For each faction, start from a fresh campaign:

- [ ] Play to exact turn 188 or the canonical terminal Dayton verdict, whichever the scenario contract declares.
- [ ] Use the historical-choice policy for every decision and retain the full transcript.
- [ ] Inspect the map at least every four turns and on every operation, control shock, siege/safe-area change, or route requested by a dossier.
- [ ] Use Army HQ at least every eight turns and whenever a corps/op/reserve/personnel decision references it.
- [ ] Inspect Records/Chronicle/Codex after every major operation/peace/sensitive-history receipt and at 40/52/104/156/188 checkpoints.
- [ ] Exercise settings, Bosnian/pseudo smoke, audio mute/volume, accessibility, replay, and save/load without contaminating the main historical transcript.
- [ ] Record visual polish observations: hierarchy, spacing, dead canvas, clipping, repetition, transition, map readability, audio restraint, and offline completeness.
- [ ] Require final autosave/replay/control timeline consistency and zero unlocated active formation.

### Required screenshot set

- opening Desk and first decision;
- first map entry plus three warm returns;
- first operation dossier/map focus/return;
- first Army HQ command review;
- each decision family at least once when encountered;
- turns 40, 52, 104, 156, and 188/terminal on Desk, map, Army HQ, Records/Chronicle;
- every bug/friction candidate before and after action;
- final Cost Ledger/Codex/verdict.

## Phase 3 -- Diary synthesis and bug/friction split

**Assigned role:** Product Manager + QA Engineer
**Independent review:** Reports Custodian

**Files:**

- Create `docs/40_reports/playtests/YYYYMMDD_rbih_188turn_diary.md`
- Create `docs/40_reports/playtests/YYYYMMDD_rs_188turn_diary.md`
- Create `docs/40_reports/playtests/YYYYMMDD_hrhb_188turn_diary.md`
- Create `docs/40_reports/playtests/YYYYMMDD_three_faction_validation_synthesis.md`

Each diary must include:

- [ ] complete template metadata and evidence paths;
- [ ] three worst Desk -> Decision -> Advance friction moments;
- [ ] one best presidential moment;
- [ ] President-feel score and reason;
- [ ] Command Authority spent/earned/cap waste and whether levers were remembered/affordable;
- [ ] bug/friction table with distinct definitions;
- [ ] actual decision-gap and presidential-beat-gap analysis;
- [ ] map transition cold/warm statistics;
- [ ] historical-choice transcript summary and all `staff_recommendation` fallbacks;
- [ ] presentation/polish findings from the player's perspective.

### BC02 existing-save investigation — 2026-09-07

**Current finding:** the missing ratings in the inspected canonical saves are caused by intentional serialization, not evidence of a late sector rebuild. The B2/B9 explanations below are historical and superseded on this point. BC02's Electron load/display gap is closed by the focused repair below; no engine or browser-fallback repair and no full campaign were run.

Accepted n392 and the byte-identical BC01 POST final save each contain 49 sectors and omit `sector_combat_ratings`; both hash to `723726ab301b0b8483a13e014f67535bb18f4a4c56176e328efa1440f4cbe301`. The serializer classifies ratings as transient and removes them (`src/state/serializeGameState.ts:37-49,163-175`). A small in-memory sentinel check confirmed canonical serialization strips the field while runtime serialization retains it. Final reconciliation/sealing compute ratings before persistence (`src/scenario/scenario_runner.ts:3177-3224`; `src/sim/combat/final_sector_truth_reconciliation.ts:234-356`). Local evidence: `runs/bc02_20260907/evidence.json` (gitignored).

At the investigated pre-fix commit, the Electron load path did not hydrate these ratings before the initial UI projection (`src/desktop/electron-main.cjs:2253-2270`); the adapter exposes optional rating fields (`src/ui/map/data/GameStateAdapter.ts:2600-2615`). The next-turn rating recompute precedes the traced Army HQ consumer (`src/sim/turn_phases/war_phases.ts:1670-1679,2340-2348`). No effect on simulation decisions is demonstrated by this investigation. This is not proof that every runtime turn is free of rating issues. The seven historical mid-war snapshots have unresolved file provenance; their counts cannot establish canonical-save parity.

**Closed repair — owner approved and independently verified 2026-09-07:** `loadStateFromPath` now runs the authoritative `computeSectorCombatRatings(state, null)` immediately after canonical deserialization and before Electron creates its runtime snapshot and player-visible renderer projection. It rebuilds only the transient rating cache from already-loaded state, does not rebuild sectors, and canonical serialization still omits the cache.

**Implementation and verification:**

1. The new focused regression reproduced the missing cache, then passed with exact equality to a direct authoritative computation: 172/172 startup sector keys, visible offensive/defensive/per-edge/strength/personnel values, canonical-byte identity, and no state delta outside `sector_combat_ratings`.
2. Player visibility retained ratings only for the loaded player's own sectors before `GameStateAdapter` exposed the display fields. The accepted n392 final save hydrated 49/49 keys while preserving canonical SHA-256 `723726ab301b0b8483a13e014f67535bb18f4a4c56176e328efa1440f4cbe301`.
3. Focused load/persistence/serialization/adapter/privacy tests passed 95/95; typecheck, desktop simulation bundle plus startup-snapshot check, tactical-map build (1,378 modules), and desktop bundle smoke passed. No campaign ran.
4. Independent Sol review returned GO with no findings. It confirmed all three Electron save-load entrypoints converge on this load path, optional null inputs use existing rating fallbacks, and no sector rebuild or simulation-decision mutation was introduced. Browser-only raw-JSON fallback loading remains outside this Electron-scoped repair.

**Stop/cost:** the load contract is satisfied with tests measured in seconds/minutes. No new engine input or simulation change was required; no campaign or calibration tuning ran. Scope stops here.

### BC03 bounded implementation — 2026-09-07

Owner scheduled BC03 from verified main `be5d7690470e9ce38a6fe98abd08199137bb5386`.
The pre-existing `.claude/scheduled_tasks.lock` change is preserved. BC03 is CLOSED by verified repair and owner-approved deferral;
BC01/BC02 remain closed and final calibration remains open.

**Question:** can the narrated ceasefire/talks/signing sequence run without preempting
the working Electron Dayton negotiation, player choice, complete verdict snapshot or receipts?
The corrected diagnosis in the event investigation §§10–11 is confirmed: COHA expiry writes
`coha_active: false`, while the ceasefire tests key absence. Enabling it would expose the
redundant `dayton_signed` terminal writer, which omits the negotiation result and snapshot.

**Separate reviewable steps:** first remove that writer in `src/sim/turn_pipeline.ts`
with a failing-then-passing regression; then change the ceasefire condition in
`data/scenarios/events/war_1995.json` to explicit `flag_equals coha_active false`.
Use existing `tests/turn_pipeline.test.ts` and `tests/event_conditions.test.ts` for late-war ordering,
absent/false/true COHA, horizon negotiation reachability and complete resolution receipts.
No global predicate, headless closeout, initial control, scoring horizon or floor changes.
**Owner disposition (2026-09-07):** defer turn-190 RS/HRHB acceptance events and turn-195–207 ticker chronology from BC03; keep their authored dates and the 188-week horizon unchanged. Require `rbih_dayton_acceptance === 'accept'` before the signing narrative. Absent or hardline responses must not narrate signing; either response retains the mandatory horizon negotiation. This explicitly dispositions the deferred content for BC03 closure, without claiming that content now fires.

**Initial validation budget and stopping rule:** focused RED/GREEN tests take seconds;
the affected condition/event/Dayton/snapshot/desktop advance-gate suite is expected to
take 1–3 minutes. Run `npm run typecheck`, `npm run desktop:sim:build` and
`npm run warroom:build` (approximately 1–3 minutes each), plus focused documentation
checks and diff hygiene. Use an existing late-war save for in-memory resolution evidence;
do not launch a campaign. Pass requires no premature termination, reachable negotiation,
preserved choices, complete verdict/cost/comparison snapshot and receipts, deterministic
fixture results, and exit 0 from affected checks. Keep logs and exit codes in `logs/bc03/`.
One independent Sol review covers correctness, canon, determinism and evidence, followed
only by targeted corrections. Stop when this declared contract and owner dispositions pass;
additional expensive campaigns and headless changes require a separate owner decision.

**Implementation evidence:** the termination regression failed before removal and passed
afterward; the COHA regression likewise failed before the data change and passed afterward.
The paired controlled fixture fires ceasefire at 181, talks at 184 and signing at 185,
retaining `pending_dayton` at 188 without early termination. Resolving n392's existing final
save in memory produces a populated `dayton_result`, verdict, cost ledger and historical
comparison snapshot at 188. This does not change headless closeout or claim campaign parity.

Focused command: `npx vitest run tests/turn_pipeline.test.ts tests/condition_evaluator.test.ts tests/event_conditions.test.ts tests/dayton_negotiation.test.ts tests/endgame_snapshot_freeze.test.ts tests/endgame_save_load_round_trip.test.ts tests/desktop_game_over_advance_gate.test.ts tests/ui/dayton_negotiation_modal.test.ts tests/ui/endgame_snapshot_verdict_fidelity.test.ts`.
Result: **111/111 passed, exit 0**, `logs/bc03/focused-regression.log` (about 65 seconds).
Documentation truth checks passed **9/9**, `logs/bc03/docs-check.log`. Typecheck, desktop
simulation build (including startup-snapshot check), and warroom build passed, with matching
log names and exit-code sidecars. Independent review identified premature settlement claims
in the newly enabled ceasefire card. The corrected copy describes upcoming negotiations;
its targeted RED/GREEN check passed **15/15** (`stage2-narrative-green.log`). No date or
effect changed. Canonical n392 deserialize/resolve/serialize/deserialize proof passed (exit 0): the result, verdict, cost ledger and historical comparison survive reload. Reproduce with `npx tsx logs/bc03/n392-in-memory-closeout.ts`. Separate production patches are retained as `stage1-termination.patch` and `stage2-event-data.patch`. Independent Sol review returned GO for this bounded patch after the one targeted copy correction, with no remaining review findings. That initial review withheld closure until the owner decisions recorded above were resolved. No fresh packaged Electron runtime or full campaign was run.
**Approved follow-up validation:** run `npx vitest run tests/turn_pipeline.test.ts tests/event_conditions.test.ts` for absent/accept/hardline gates and accepted/rejected real pipeline branches, plus `npm run typecheck` and documentation truth checks (a few minutes). Reuse the independent Sol reviewer for this delta only. Stop once the approved gate preserves horizon reachability, targeted checks pass, and current documentation records the explicit deferral.

**Owner-approved signing delta:** `dayton_signed_1995` now requires
`flag_equals rbih_dayton_acceptance accept`. Missing and hardline flags fail closed.
The autonomy-0 regression queues the real talks decision, resolves `hardline` through
`resolveEventDecisionCore`, and reaches turn 188 with no signing event/flag and an open
horizon Dayton negotiation. The accepted branch preserves the deterministic 181/184/185
sequence. RED reproduced the missing gate and false signing; GREEN passed **20/20**
(`logs/bc03/approval-green.log`, exit 0). The same independent Sol reviewer returned
GO on this delta, with no findings. Follow-up typecheck passed (exit 0, `approval-typecheck.log`). BC03 is CLOSED under these explicit dispositions; final calibration remains open. Prior complete-verdict, canonical n392 roundtrip,
UI, build and 111-test evidence stands; there is no new packaged run or campaign claim.
### BC04 bounded implementation plan — 2026-09-07

**Status and authority.** Plan independently reviewed; **P1 implementation authorized by the owner
on 2026-09-07; implemented and independently reviewed as a candidate**. BC04 is not closed. P2 is implemented and independently reviewed (GO); campaign acceptance remains deferred. The existing [§6 panel record](../40_reports/proposals/20260906_S6_PANEL_RECORD_EVENT_FIDELITY.md)
originally authorized planning only; subsequent owner implementation approvals are recorded below. Reuse its Historian, scenario/calibration,
engine/systems, red-team and game-design seats; do not reconvene a panel. The four Battle of the Barracks
windows already landed in `2c2aa72a8` (`3-4`, `4-9`, `6-7`, `7-8`) and are outside BC04. BC01-BC03 are
closed. BC03's previously uncommitted edits in `src/sim/turn_pipeline.ts`,
`data/scenarios/events/war_1995.json`, tests and closure docs were committed separately as
`c95e2524176cffee63ea6d45e5b2d357aab75b74` after owner authorization. They were never part of
the planning-start HEAD `be5d7690470e9ce38a6fe98abd08199137bb5386`. BC04 does not reopen BC03's
Dayton verdict/receipt contract or the settled post-horizon deferrals.

The sensitive-history gate §6, War-only phase specification (one week per turn), Engine
Invariants §§9.8–9.9, canonical `GameState` schema and `CALIBRATION_MASTER.md` remain controlling.
Neither packet introduces a GameState field or migration. P2 adds one bounded follow-up wave within the existing event phase; retain canonical event
ordering and stable OSID ordering; introduce no wall-clock timestamps, randomness or unsorted
simulation traversal. Existing panel outcome-ownership questions remain outside this plan.

**Accepted evidence and calendar semantics.** `n392` remains the owner-blessed reference with unchanged
floors `694/674/668/641`, not a fresh current-HEAD run. Its actual receipts are Ahmići absent; Tuzla
Gate `t160`; hostage crisis `t160`; RRF `t168`; Srebrenica `t162`; column `t163`; Žepa `t164`;
Markale II `t170`; Deliberate Force `t171`; Storm `t174`; Mistral 2 `t179`.
**Calendar convention resolved by pipeline trace, 2026-09-07:** `runTurn` advances the counter
from N−1 to N before producing the event receipt and `TurnSummary.turn=N`. With this scenario's
zero start, runner `week_index=N−1`; receipt `tN` closes the interval from `date(N−1)` through
`date(N)−1 day`. Thus `t54` completes 12–18 Apr 1993, `t164` completes 22–28 May 1995,
`t171` completes 10–16 Jul, `t173` completes 24–30 Jul and `t178` completes 28 Aug–3 Sep.
The current-week header shows the following boundary date (19 Apr, 29 May, 17 Jul, 31 Jul and
4 Sep respectively). Existing Chronicle/record readers also use that boundary date directly;
it is not evidence that the event occurred in the following completed week.
The earlier helper-only review identified different labels but did not trace what the receipt
closed. Its calendar ambiguity is superseded: the panel's historical week targets remain valid.
No epoch, P1 date or raw receipt migration is needed. Retain raw turn, completed interval and
post-advance header date as distinct evidence. The accepted artifact also shows the five 280th-284th
East Bosnian Light Brigades displaced at `t162` to `op:zivinice:gracanica_2` with 319 personnel each,
then rebuilding to 710 each at `t167`; this is the P2 force-economy blast radius. Evidence and exit 0:
`logs/bc04/n392-summary.json` and `logs/bc04/n392-summary.exitcode`; the fuller extraction remains at
`logs/bc04/n392-receipts.json`. The summary's original calendar bucket annotation was corrected
after independent review; receipt extraction is unchanged.

**P1 — Ahmići, one catalog gate.** Change only
`data/scenarios/events/war_1993.json`: in `ahmici_massacre_1993`, replace the
`faction_controls_municipality(vitez, HRHB, 0.5)` clause with
`territory_control(op:vitez:vitez_2, HRHB)`. Preserve `turn_min:54`, `turn_max:70`, the
`croat_bosniak_war_begins_1993` prerequisite, the tensions flag, effects, cited narrative, and the
hybrid/census-derived initial map. Never gate on victim cell `op:vitez:preocica_3`, delete the control
gate, repaint Vitez, or lower a municipality threshold. Extend `tests/event_timeline_integrity.test.ts`
to pin the exact basing-cell predicate and unchanged date/prerequisites, and `tests/events_evaluate.test.ts`
with positive/negative catalog-backed fixtures: it fires at `t54` when HRHB holds `vitez_2`, and stays
blocked when RBiH holds that cell. No production TypeScript or schema change is proposed.

The focused event timeline/loader/evaluator tests have passed. At the next planned calibration,
compare a clean Node-22 188-week P1 run against its clean pre-P1 base, without the retired P1
repeat or collapse companion requirements, recording both commits,
`git_dirty:false`, scenario id/hash, normalized consumed-input path list/digest, command log and exit code.
Pass requires exactly one Ahmići receipt at `t54`, the direct `+3` HRHB war-crimes and `-25`
international-credibility effects, no unexpected event/decision deltas, byte-identical
`control_delta.json`, zero rung-4 operation divergence from `tools/op_schedule_diff.cjs`, unchanged
four checkpoint matched counts and complete `anchor_checks`, unchanged displacement/formation outputs,
and no new §6 or health failure. Run `tools/verify_checkpoints.cjs`, preserving and naming its accepted
Farz P-A residual rather than claiming a green exit, `tools/engine_health_gate.cjs --horizon 188w`
without `--strict`/`--update`, and applicable absolute enclave checks. This is not full collapse
ON/OFF proof. Do not raise floors or update manifests.
Stop P1 on any territory, operation, formation, displacement, or unexplained receipt delta; explain it
before acceptance rather than tuning around it.

**P2 — one coherent 1995 chronology packet; implementation approved, campaign acceptance deferred.** The catalog part is
`data/scenarios/events/war_1995.json`; the bounded temporal investigation below establishes why
catalog-only changes are insufficient and proposes an explicit evaluator opt-in. Preserve all event effects, control lists, prerequisites,
pressure constants, `turn_max:185` for Srebrenica, `turn_max:190` for the column/Žepa/Markale, and
`turn_max:195` for Deliberate Force. Preserve `CONTAIN_RELEASE_TURN_BACKSTOP=160` in
`src/sim/combat/enclave_resilience.ts`; it is not a BC04 edit. Do not edit Žepa's inert `turn_min:160`,
initial control, painted references, calibration floors, or any operation. The candidate catalog packet
is: Tuzla Gate `160→164` (single-turn receipt); hostage crisis shift `160-163→164-167` (same width,
no narrower expiry); Srebrenica `turn_min 160→169` as the smallest current-code candidate for a `t171`
receipt; column `turn_min 160→171`; Markale II candidate `turn_min 165→177` for a `t178` receipt;
Deliberate Force `turn_min 165→178`. The Srebrenica candidate is based on the live brake-on rate
`1 + 2 (coha_expired) - 0.5 (rrf_deployed) + 1 (hostage) = 3.5`, yielding readiness
`3.5/7.0/10.5` at `t169/t170/t171`; the earlier Historian seat's 3/2.5 discussion omitted the hostage
modifier, so the receipt must be proved from current code rather than inferred from that arithmetic.

**P2 temporal investigation — 2026-09-07; bounded implementation subsequently owner-approved.** Source tracing and
one isolated real-function fixture establish the distinction above. Evidence:
`logs/bc04/p2-temporal/trace.md`, `temporal_fixture.ts`, `fixture-output.json`, `commands.txt`
(exit 0; empty stderr). The fixture uses the live loader, readiness and evaluator functions with
controlled late-war flags and stripped unrelated effects. It establishes eligibility/readiness,
not full campaign behavior. It measures Srebrenica at 171 (3.5/7/10.5), column at 172, Žepa at
173 (3 then 6), Markale at 178 (3.3 then 6.6) and Deliberate Force at 179. These last two
dependent lags agree with the existing n392 receipt relationships. Readiness runs before event
evaluation; eligibility is collected before the firing phase appends receipts, so catalog order
or priority cannot make a same-turn prerequisite visible.

The historical targets remain unchanged. Srebrenica fell on 11 July and the column began moving
around midnight that night ([Krstić Trial Judgment, §§36, 62](https://www.icty.org/x/cases/krstic/tjug/en/krs-tj010802e-1.htm)).
The existing Žepa target is 25 July; civilian transport began that day
([Tolimir Trial Judgment, §§640–641](https://www.icty.org/x/cases/tolimir/tjug/en/121212.pdf)),
without compressing every phase into one date. Markale II on 28 August and Deliberate Force on
30 August belong to the same completed week ([NATO chronology](https://www.nato.int/en/news-and-events/events/transcripts/2005/07/01/crossing-the-rubicon);
BB1 printed pp.377/386, local KB pages 414/423). The independently reviewed late-May grouping
for Tuzla/hostage onset is retained; primary evidence and procedural-posture notes are in
`logs/bc04/p2-temporal/historical-targets.md`.

| Receipt | Target raw turn | Completed historical week | Current catalog-only fixture |
|---|---:|---|---|
| Tuzla Gate / hostage crisis | 164 | 22–28 May 1995 | Window proposals; not a new campaign receipt |
| Srebrenica | 171 | 10–16 Jul 1995 | 171 |
| Column departure | 171, after Srebrenica in the report | 10–16 Jul 1995 | 172: one week late |
| Žepa, unchanged row | 173 | 24–30 Jul 1995 | 173 |
| Markale II | 178 | 28 Aug–3 Sep 1995 | 178 |
| Deliberate Force | 178, after Markale in the report | 28 Aug–3 Sep 1995 | 179: one week late |

**Recommended implementation decision:** preserve that tuple and enable same-turn causal
follow-ups only for `srebrenica_column_breakout_1995` and `nato_deliberate_force_1995`.
Add an explicit event-definition boolean such as `same_turn_requires_events` in
`src/sim/events/event_types.ts`, validate it in `src/sim/events/event_loader.ts`, and enable it
only on those two catalog rows. `true` requires `once:true`, nonempty `trigger.requires_events`,
no pressure definition and no response options. After the normal firing phase, collect exactly
one snapshot of still-unprocessed opted-in rows against updated receipts/flags, then fire that
snapshot through the existing effect/receipt path. Preserve ordinary conditions, priorities,
stable ordering, shared admission limits and once-only receipts. Do not recurse, rerun readiness, bypass a prerequisite,
or re-evaluate the entire catalog to a fixed point. Non-opted rows retain existing semantics;
Žepa still first accrues at 172 and fires at 173. `un_safe_areas_fail_1995` is not opted in and
retains its next-turn relationship. Missing parent receipts must keep either child blocked.

The exact core edit set is `war_1995.json`, `event_types.ts`, `event_loader.ts` and
`src/sim/events/evaluate_events.ts`. Add regressions in `tests/events_evaluate.test.ts`
(ordered same-report parent/child, missing parent, default next-turn behavior, one snapshot
without third-level cascading, no duplicate effects/receipts), `tests/event_loader.test.ts`
(invalid opt-in shapes fail closed), `tests/pressure_system.test.ts` (single update and Žepa
delay retained), `tests/event_timeline_integrity.test.ts` (whole packet and unchanged protected
fields), and `tests/integration_event_system.test.ts` (whole target sequence). Reuse the existing
application/receipt writer; do not duplicate its implementation for the follow-up wave.

For player-facing occurrence dates, propose a derived completed-week-range formatter in
`src/ui/map/utils/formatters.ts`, used only at receipt groups in
`src/ui/map/components/chronicle/ChronicleOverlay.tsx`,
`src/ui/map/components/SettlementTimeline.tsx` and
`src/ui/map/components/army_hq/DecisionConsequenceRecordsPanel.tsx`. Keep current-state headers
on their boundary date, raw receipt identities unchanged, and no epoch/save-schema migration.
Pin ranges/localization and safe turn-0 behavior in `tests/ui/settlement_timeline_i18n.test.ts`,
`tests/ui/chronicle_spine_scrubber.test.ts`, `tests/ui/chronicle_focus_routing.test.ts` and
`tests/ui/decision_consequence_records_panel.test.ts`. Avoid re-dating unrelated decision
timestamps or rewriting other calendar surfaces.

The owner approved this bounded proposal on 2026-09-07; implementation and focused verification are now authorized. Accepting
late dependent receipts, shifting their parents earlier, removing/duplicating prerequisite
conditions, or merging distinct event IDs would compromise the retained chronology or causality;
none is the recommended remedy. The existing panel record and newly reviewed historical date
evidence remain authoritative; required distinct sign-off seats are not collapsed, and no
outcome-ownership question is reopened.

**Independent review and exact owner decision.** The independent Historian/technical review
ratifies `164/164/171/171/173/178/178` as completed-week placement and supports the bounded
mechanism and receipt-only display correction. Its overall verdict is **CHANGES NEEDED before
implementation authorization**, because two conditions in the existing panel signature remain:

- [Scenario/calibration seat, condition 2](../40_reports/proposals/20260906_S6_PANEL_SEAT_SCENARIO_CALIBRATION.md):
  “P2 moves `turn_min` only.”
- [Engine/systems seat, condition 4](../40_reports/proposals/20260906_S6_PANEL_SEAT_ENGINE_SYSTEMS.md):
  “Write the D3 loader lint FIRST, with the two P2-derived siblings”.

**Owner approval — 2026-09-07:** the owner accepted the plain-language recommendation and authorized this exact P2 packet, amending those two process
conditions. Permit the two-row opt-in and receipt-only formatter alongside the coherent date
packet, including the already-proposed same-width hostage-window shift; keep the wide enclave,
Markale and Deliberate Force maxima unchanged. Replace the generalized lint-first prerequisite
for this packet with pre-change regressions covering (1) a non-opted same-turn prerequisite's
unreachable window, (2) a pressure modifier whose writer has not yet fired, and (3) brake-on
readiness versus expiry. Keep strict loader validation for the new opt-in and the complete
sequence tests above. This is an owner-approved scoped exception, not retirement of
the general lint work or its BC05 routing. The exception applies only to this packet; all other panel conditions remain binding. No new broad panel or
change to historical dates is proposed. The review and source notes are in
`logs/bc04/p2-temporal/review.md` and `historical-targets.md`.

**P2 implementation evidence — 2026-09-07; reviewed candidate (GO), committed as `558f253a2`.** The approved eight-file
production packet is implemented. Exactly the column and Deliberate Force rows opt in to
one nonrecursive, canonical-order follow-up snapshot through the shared effect/receipt writer.
All event effects, prerequisites, protected maxima and catalog order compare equal to f117fe475
outside the approved date/opt-in fields. Focused integration tests establish the ratified
receipt sequence under controlled readiness conditions; they are not campaign evidence.

The initial regression run failed for the expected missing behavior. The affected twelve-file
suite then passed 187/187; the subsequently added direct missing-parent test passed in the
45/45 evaluator suite. Independent review found that real consequence receipts carry both
receipt and decision IDs. The formatter now distinguishes those receipts from actual decisions;
the corrected Chronicle suite passed 3/3. Condensed chapter cards retain their original boundary
dates because their references do not carry the required receipt metadata. Full receipt groups,
Settlement historical events and fired-receipt records use the completed-week formatter.
Typecheck and the final affected map build passed after this correction. Independent review returned GO with no open findings. Desktop simulation and warroom builds also passed. Logs and literal commands
are retained in `logs/bc04/p2-implementation/`. This commit includes no campaign, save migration, baseline
refresh, initial-map change or BC04 closure is implied.

For a later separately approved calibration session, run one clean Node-22 controlled 188-week P2 POST against
the accepted clean P1 run, with the same provenance record and the explicitly authorized P2
catalog/evaluator packet as the only simulation source/input delta. Record receipt dates and readiness at every eligible turn; full
`anchor_checks` and all four checkpoint scores; `engine_health_gate`; the complete §6 HOLDS/FALLS and
capture-provenance output; final and per-turn control diffs; `op_schedule_diff.cjs` rung 4 plus
`operation_aars.json`/`watched_operations.json`; displacement totals/events; and formation/location/
personnel diffs for the 280th-284th brigades, especially Živinice-Lopare-Posavina and the
Storm/Sana/Mistral-2 window. P2 passes only with the ratified receipts, Srebrenica and Žepa still
event-owned and fallen by `t188`, protected enclaves and all previously passing anchors intact, all
unchanged health thresholds met, and every territory/operation/displacement delta causally explained
and explicitly accepted. Scores must remain above the unchanged floors; do not re-floor or refresh a
manifest from an unexplained run. Stop after the fixed run matrix and one independent review with
at most one targeted correction pass. A run beyond that matrix, evaluator redesign, containment
change, isolated date edit, or calibration tuning requires a new owner decision.

**Owner-revised validation disposition — 2026-09-07.** Commit the locally verified P1 candidate
now; defer campaign acceptance to the next planned calibration session. The owner retired P1's
extra same-input repeat and collapse-ON companion requirements unless a concrete failure justifies
them. Preserve the clean P1 before/after comparison, receipt/anchor/health and displacement/operation
checks, unchanged floors and applicable absolute enclave protections. This does not claim full
collapse ON/OFF proof for P1. No campaign is authorized in this closeout.

**Later validation matrix — deferred/proposed, not scheduled.** A is the clean pre-P1 source
commit `c95e2524176cffee63ea6d45e5b2d357aab75b74`; B is P1 commit `f117fe47536398add3a966d177b3dce54fc820ac`. C is reviewed P2 commit `558f253a2` (before the brigade-name merge). Preserve A even if other changes land before calibration;
never attribute a mixed later-tree difference to P1. Use the same Node 22 version and scenario:

| Run | Commit | Collapse | Purpose |
|---|---|---|---|
| A-OFF | A | unset | Clean P1 control, reconciled against n392 |
| B-OFF | B | unset | P1 attribution against A, deferred to next calibration |
| C-OFF-1 / C-OFF-2 | C | unset | P2 attribution against accepted B; deterministic repeat |
| C-ON | C | `true` | P2 §6 companion against C-OFF-1 |

The preflight's historical cost is approximately 55 minutes per serialized 188-week run:
P1's retained before/after comparison is at most **two runs, approximately 110 minutes** before
proven-equivalent reuse, deferred rather than launched as a separate campaign now. The P2-only
repeat and ON companion remain proposed, not newly authorized or retired by this P1 decision.
The old seven-run / 385-minute proposal is superseded; there is no seven-run acceptance mandate.
Reuse an existing run only if its exact candidate commit, normalized consumed bytes/path list,
Node version, environment and artifacts establish equivalence; an n392 score alone cannot replace A.
Stop at the first failed preflight, receipt target, determinism comparison or acceptance gate;
diagnose before advancing to the next matrix stage. Unexplained deltas do not authorize tuning.

Commands for later execution (placeholders must resolve to recorded run paths, not newest-by-time):

```powershell
npx.cmd vitest run tests/event_timeline_integrity.test.ts tests/event_loader.test.ts tests/events_evaluate.test.ts tests/pressure_system.test.ts tests/enclave_formation_displacement.test.ts tests/turn_pipeline.test.ts tests/event_conditions.test.ts
npm.cmd run typecheck
npm.cmd run desktop:sim:build
npm.cmd run warroom:build
$env:AWWV_S6_GRADE_RUN = 'true'
Remove-Item Env:ENABLE_COLLAPSE -ErrorAction SilentlyContinue
npm.cmd run sim:scenario:run:188w
# For a separately authorized P2 C-ON only, before the same gated entrypoint:
$env:ENABLE_COLLAPSE = 'true'
npm.cmd run sim:scenario:run:188w
node tools/verify_checkpoints.cjs <run_dir>
node tools/engine_health_gate.cjs <run_dir> --horizon 188w
node tools/op_schedule_diff.cjs <chronology_PRE> <chronology_POST> --list
node tools/verify_collapse_section6.cjs <same_commit_ON>/final_save.json --compare <same_commit_OFF>/final_save.json
```

Record/restore environment values explicitly between rows. Redirect each command's stdout/stderr
to `logs/bc04/<row>-<check>.log`, retain its literal command in `.command.txt` and exit code in
`.exit.txt`. Before comparisons, verify `run_meta.json` clean commit/Node/scenario and normalized
consumed-input path list/digest: no production input difference in repeats or ON/OFF; only the
declared P1 catalog or P2 catalog/evaluator packet differs in its respective chronology PRE/POST. Record the separately controlled collapse
flag and scoring-reference hashes. Same-input repeats must match the canonical simulation artifacts
and final-state hash, excluding only documented observational timing metadata. Compare all named
receipts, anchors, displacement and operation outputs, not just a score. The proposed P2 collapse
comparison is C-ON/C-OFF; P1 has no required ON companion under the owner revision. A chronology
pair is never a collapse flag pair. Artifact-only verifier success does not
establish source attribution by itself. The accepted Farz P-A verifier residual remains explicitly
classified, never generalized into permission for another failed check. No baseline manifest refresh.

**Planning-session verification:** one independent Sol review requested three corrections (calendar
convention, full receipt tuple and controlled-run matrix); targeted verification returned **GO for
this planning artifact only**, with no residual finding. See `logs/bc04/independent-review.md`.
Documentation truth tests passed 9/9 (`docs-tests.log`, exit 0); preservation/local-link checks passed
35 checks (`docs-preservation.log`, exit 0); `git diff --check` passed (`diff-check.log`, exit 0).
BC03 production/tests and the scheduled-task lock retain their starting hashes. No production
implementation, campaign, commit, canon change, floor refresh or BC04 closure occurred.

**Owner-approved P1 implementation — 2026-09-07.** After accepting the recommendation to commit
BC03 and proceed with P1, the owner authorized the exact basing-cell repair and focused verification.
BC03 was staged from the pre-BC04 snapshot and committed with its closure docs; its pre-commit
typecheck passed. The scheduled-task lock and all BC04 planning changes stayed outside that commit.
P1 changes only the Ahmići control clause in `war_1993.json`; the two planned regression files
pin the full event contract and exercise the real evaluator's positive/negative, prerequisite,
window, once-only and direct-effect behavior. Focused RED reproduced three expected failures;
GREEN passed 63/63 (exit 0), with logs in `logs/bc04/p1/`.
The affected four-file suite passed **108/108**, exit 0 (`authorized-suites.log`). Typecheck,
desktop simulation/startup-snapshot build and warroom build passed, exit 0 (matching log and
exit-code sidecars). Independent Sol implementation review returned **GO for the bounded P1
candidate**, no findings (`logs/bc04/p1/independent-review.md`), using the existing panel record.
The owner subsequently authorized committing this locally verified candidate and deferring campaign
acceptance under the revised disposition above. P1 and P2 campaign acceptance
and final calibration remain open. No P2 code, date, initial control, schema or baseline changed.
### BC05 bounded NATO repair and Lukavac disposition — 2026-09-07

**Owner authorization:** investigate current code and accepted evidence; implement the smallest
canon-supported NATO timing repair and focused loader protection, obtain one independent Sol review,
synchronize existing documentation and commit. Lukavac changes require an already determined
historical/design correction. No campaigns (including the structural-fingerprint wrapper), calibration
changes, baseline refreshes, remote pushes or publication. Starting main HEAD was
`fd8d5e66c615fa4731cde01122d6050fbc86619f`, with a clean working tree.

**Status: NATO implementation and independent review complete (GO, no findings), committed
`0690a47ea`.** The owner subsequently ruled that Lukavac must not be a separate event; its removal
is **implemented and independently reviewed (GO)** below. Military-operation execution is calibration territory and outside this packet.
BC05 campaign/downstream acceptance remains open; local implementation does not waive it.

**Consumed-baseline reconciliation:** accepted `n392` records Markale I at **t96**, the RBiH NATO
compliance companion at **t97**, and no RS ultimatum or exclusion-zone receipt. Current code retains
the impossible RS window `96–96`: the ordinary candidate pass cannot see a prerequisite fired later
in that pass. The smallest repair is **only `turn_max:96 → 97`**. Preserve `turn_min:96`, Markale,
the siege condition, player decisions, all effects, and the exclusion-zone window `97–98`; this allows
ordinary-pass receipts at **t97** and **t98**. Do not add a same-turn opt-in to a decision event or
broaden BC04's follow-up mechanism. The existing D3 diagnosis and the already live RBiH sibling
establish the one-week slack; this is not new event authoring.

The unchanged catalog cites the **North Atlantic Council decision of 9 February 1994
(UN S/1994/154)** for the ultimatum. That date belongs to completed t97; the existing exclusion
deadline fits completed t98. The repair preserves this already authored historical authority.

**Preserved downstream limitation:** the existing exclusion-zone row requires the ultimatum receipt,
not a compliance flag. It therefore applies the same relief effects and withdrawal narrative after
either response. Both branches are tested as the unchanged contract; this timing packet does not
establish that the defiance branch's withdrawal narrative is substantively correct. Any branch
redesign is outside the authorized preservation of downstream effects.

**Calendar evidence:** receipt t96 completes 31 Jan–6 Feb 1994, t97 completes 7–13 Feb, and t98
completes 14–20 Feb. Current-state headers show the next boundaries (7, 14 and 21 Feb). The runner
loop index is zero-based, but **persisted `weekly_report.jsonl.week_index` equals `state.meta.turn`**
(`scenario_reporting.ts`, `buildWeeklyReport`). Do not add one to that persisted field. This clarifies
the BC04 loop-index statement without changing its receipt dates, epoch, targets or raw receipts.

**Accepted n392 reconciliation, before event removal:** Lukavac is not blocked in that baseline. Replaying its complete
`political.control_events` over `initial_political_controllers` yields **3/6 RS** at t68–71:
`gornja_presjenica`, `kijevo_2`, and `tosici`. Only `kijevo_2` changes in the Trnovo log (combat,
t25). `operation_lukavac_93` fires at **t70**, and `event_decision_log` records RS `comply` at t70.
Its catalog row at `0690a47ea` was unchanged from n392's clean source commit
`c2f6592ec1e2f049d93ade595760c19633bb2ce7`; the intervening 1993 catalog diff is only BC04 P1.
The corrected six-run sweep remains historical evidence about those runs, not a present dead-gate
verdict. This finding alone supported no threshold, initial control, operation or event edit;
the later owner disposition independently authorizes removal.

**Initial design question — superseded by the owner disposition below:** the event is a post-advance withdrawal confrontation, not
an operation-launch notice. BB2 printed pp.391–392 (KB scan pages 410–411, the catalog's citation)
describes capture of Trnovo, the later Igman/Bjelašnica advance, and withdrawal under UN/NATO pressure.
Yet n392's Trnovo town remains RBiH-held when its 3/6 municipal proxy admits that narrative. Existing
authority does not select a replacement predicate that establishes all those territorial claims.
The initial question asked whether to retain this abstract proxy with that limitation, or require
simulation-backed territorial evidence and authorize a separately scoped historical/design correction.
Lowering the threshold or changing the date cannot resolve this mismatch. This assessment did not
authorize repair of the wider military operation; the owner has now rejected the duplicate event.

**Fixed local validation plan:** inspect wrappers/configuration, run direct focused Vitest loader,
timeline and evaluator regressions plus TypeScript checking and `git diff --check`; retain logs in
`logs/bc05/`. Expected cost: seconds to a few minutes, no simulation campaign. Prove impossible
direct prerequisite windows are detected, legitimate same-week follow-ups and ordinary slack remain
valid, and the NATO chain preserves choices/effects with t96/t97/t98 fixture receipts. Read-only n392
extraction: `logs/bc05/read_n392.cjs`, `n392-evidence.json`, `n392-read.log` and exit 0. One independent
review follows implementation; only targeted corrections/retests follow findings. Focused fixtures
establish mechanism behavior, not a current-HEAD campaign, territorial neutrality or calibration
acceptance. Preserve BC04 attribution A=`c95e25241`, P1=`f117fe475`, P2=`558f253a2`; the integrated
`c2c8300d6` honorific-name changes explain serialized display-name differences, not mechanical drift.

**Local implementation results:** three expected pre-fix failures demonstrated the defect and
missing guard. Final direct Vitest run of `event_loader`, `event_timeline_integrity` and
`events_evaluate`: **115/115 tests, 3 files, exit 0** (`logs/bc05/final-focused-tests.log`). Both RS
responses are resolved at t97 before t98 and preserve their flags/dimension shifts plus the existing
exclusion-zone effects. Direct `tsc --noEmit -p tsconfig.json` passed without diagnostics
(`logs/bc05/typecheck.log`, exit 0); `git diff --check` passed. Independent Sol review returned
**GO, no findings**, covering correctness, history/canon, deterministic ordering, preserved player
branches and scope (`logs/bc05/independent-review.md`). `logs/bc05/validation.json` records command
exits and reviewed source/test hashes; `verify_scope.cjs` checks catalog-field preservation,
untouched BC04/Dayton/Lukavac source, append-only ledger continuity and added documentation links.

**Subsequent owner disposition — remove the duplicate Lukavac event.** The owner clarified:
"That is calibration territory, which is not in our scope. Lukavac should not be an event."
Remove `operation_lukavac_93` from the live event catalog and reconcile its necessary live wiring
and tests. Do not substitute a stronger control gate, artificial territorial transfer, or another
Lukavac event. Preserve the historical essay and sources, with obsolete live-choice references
reconciled. Preserve old saved receipts as historical records where applicable; do not migrate or
erase accepted n392 evidence.

Legacy compatibility uses the existing save contract: pending decisions carry their own response
options and effects, and resolution reads that saved record rather than reloading the catalog.
Retain the essay's legacy event/response linkage for old recorded decisions, while removing prose
that advertises a currently available Lukavac choice. No live compatibility event or engine shim
is needed. Focused regressions must cover both old pending-decision resolution and old essay receipts.

The military **Operation Trnovo** remains authored in `pre_planned_operations.ts`, available from
t69. Its n392 AAR records start t69, end t79, zero attacks/captures and `zero_eligible_axis`;
the separately named political event fired t70. These are distinct mechanisms. The event has no
direct OSID-transfer effect. Operation execution, territory and calibration investigation are
explicitly outside this removal. This disposition supersedes the abstract-proxy question above.

**Removal validation boundary:** one Sol implementer and one independent Sol reviewer; targeted
event/pressure/reporting/essay tests, direct TypeScript checking and diff/scope checks only, with
logs under `logs/bc05/lukavac-removal/`. Expected cost: a few minutes, no campaign. Prove the live
event is absent, necessary references are reconciled, generic decision/pressure coverage survives,
historical material is preserved, and operation/NATO/BC04/Dayton code remains unchanged. No new
campaigns, structural-fingerprint wrapper, tuning, baseline refresh, remote push or publication.

The retained 1993 NATO notice and its essay also advertise a separate Lukavac decision. Remove only
those stale live-choice references as necessary wiring cleanup. Preserve that notice's date, trigger,
effects and sources, and every 1994/1995 NATO field; no replacement choice is authored.

**Removal implementation and verification:** the live event is removed. Historical essays and their
sources remain; legacy response sections and self-contained pending choices still work for old
saves. Generic pressure/decision tests now use synthetic fixtures rather than the removed catalog
row. All production source, military Operation Trnovo, initial control and calibration inputs remain
unchanged. The 1993 NATO notice has only stale-choice narrative cleanup; its mechanics are preserved.

The first absence regression failed as expected. The 12-file focused run recorded **287 passed,
2 failed (289 tests)**, with failures in stale catalog-count and safe-claim inventory expectations.
The catalog now has 158 entries in the tested year-file subset, rather than 159. The inventory
correction removes the rewritten NATO essay from the expected finding set because its stale-choice
finding is gone; all six remaining safe-file entries stay asserted, and the NATO essay's provenance
is checked separately. Retained Lukavac provenance and legacy sections remain checked. Only the affected two files were
rerun: **52/52 passed, exit 0**. Together with the ten unchanged passing files, this verifies
**289 tests across 12 files**; it is not a claim of one all-green 12-file invocation. TypeScript,
`git diff --check` and the **13-check scope verifier** pass. Evidence is under
`logs/bc05/lukavac-removal/` (`final-focused-tests.log`, `correction-tests.log`, `typecheck.log`,
`scope.log`). No campaign or calibration acceptance is claimed.

Independent Sol review returned **GO, no blocking findings**, including the targeted stale-reference
and test-inventory corrections. `logs/bc05/lukavac-removal/independent-review.md` records the review;
`validation.json` preserves all command exits, the evidence union and final reviewed file hashes.
This completes the owner-directed Lukavac removal disposition, not campaign/calibration acceptance.

### Pre-seeded finding register

**R8 remains WAITING ON R7. This register is inert until R8 opens** -- it starts nothing and claims
no R8 progress. It exists so that bugs found before R8 survive to the R8 gate, where roadmap §12
requires that *"every R8 finding is either fixed and reverified or explicitly proven outside the 1.0
definition of done."* Without it they would be orphans: their owning lanes (R2, R4) are CLOSED.

**Owner decision D1, 2026-09-04 -- HOLD FOR R8.** No unscheduled defect repair is authorized.
Carve-out: a bug found during R7 Phase 5 to be a pure display-layer fix may ride the
[R7 presentation amendment](2026-09-05-r7-presentation-and-english-readability-amendment-plan.md)
**as a readability fix, recorded as such**. The `Discharged early?` column is what keeps that
carve-out from becoming a hole in this register.

Sources: [frozen audit](../40_reports/working/20260903_SHOWCASE_SCREENSHOT_GUI_AUDIT.md) ·
[panel record](../40_reports/working/20260905_SHOWCASE_AUDIT_PANEL_SPECIALIST_REPORTS.md).

| ID | Bug | Writer | Reader | Layer | Discharged early? |
|---|---|---|---|---|---|
| B1 (10b) | `CorpsFrontSector.intel_confidence` has **no writer anywhere in `src/`**, so `hasReliableThreatIntel` (`>= 0.4`) can never be true and **every OG's FORCE BALANCE reads REDACTED, unconditionally, forever**. Not fog-of-war as designed. The real system is built and one hop away: `state.military.sector_intel[sid].confidence`, computed every turn at `sector_intel.ts:91-129` with a consumption helper at `:402`; the adapter never wired to it. **2026-09-05: MEASURED DISPLAY-ONLY** -- exhaustive reader list is `CorpsFrontPanel.tsx:405-407,626`, `SectorsSection.tsx:152,157-158`, `SituationTab.tsx:487`, `GameStateAdapter.ts:2578`, all under `src/ui/`; no bot/AI/targeting path branches on it. **D1 covers B1; this row is final and returns to the owner for nothing** | **none exists** | `CorpsFrontPanel.tsx:405-407,626-627` | display (adapter) | N |
| B2 (10a) | `sector_combat_ratings[sid]` can be absent for a sector with an active friendly line, producing blank `OFFENSIVE POWER` + a sentence in the `STRENGTH` number slot. `displayDefensivePower` has a two-level fallback; `displayOffensivePower` and `displayStrengthClass` have none -- **the asymmetry is the bug**. **2026-09-05: MEASURED ENDGAME-ONLY** -- 7/7 mid-war snapshots show perfect `corps_front_sectors`/`sector_combat_ratings` parity (0 missing); 63/63 missing only at turn 188. **D1 covers B2; this row is final** | `sector_combat_rating.ts:144-154` | `CorpsFrontPanel.tsx:336,369,370-376` **plus `army_hq_gathering.ts:269,340-360`** | engine + display | N |
| B3 (8a) | `generateTacticalGroupName` RS branch is **non-injective for ordinal ≥ 2** (`ordinal <= 1 ? "TG {place}" : "{place} OG"`), so distinct sectors collapse to byte-identical names. The two "OG MAGLAJ" rows are two real sectors, correctly counted, wrongly named | `tactical_group_naming.ts:79` | `playerFacingLabels.ts:36-46` → `CorpsFrontPanel.tsx:335,520` | `src/sim/` | N |
| B4 | `army_reserve_system.ts:716,755` bake `` Op "${op.name}" `` into a sentence inside `src/sim/`, reaching the player raw via `why_needed` → `GameStateAdapter.ts:3958` (zero player-safe processing -- the name is mid-sentence, so no humanizer touches it). **The R7 display-name fixes will NOT close this** | `army_reserve_system.ts:716,755` | `GameStateAdapter.ts:3958` → Decision Room evidence rows | `src/sim/` | N |
| B5 (8b) | Two `Commander Replacement` inbox cards recommend different appointees and both claim the same consequence. `officerEventDedupeKey()` does not key on the incumbent for `replacement_suggested` | n/a (UI dedupe) | `inboxItems.ts:186-193` | display | N |
| B6 (15) | Around the Sarajevo ring, markers and EN contact chips belonging to **geographically distinct** OSIDs overlap each other — click targets obstructing click targets. Not a failure of the same-OSID stack mechanism, which works (a correct "12" badge is visible in the same frame). Every marker anchors at its own OSID centroid `[osidCenter[0], osidCenter[1]]` (`:114`) computed **with no awareness of any other OSID's marker position**; there is no zoom-dependent declutter and no cross-OSID screen-space collision check anywhere in the render path (grep finds no `collision`/`declutter` term). **Priced L — multi-day, graphics-programmer, real regression risk to marker hit-testing. An explicit candidate for R8 to prove outside the 1.0 definition of done (roadmap §12) rather than to fix** | `buildFormationsGeoJSON.ts:90-115` | deck.gl render path; hit-testing at `MapContainer.tsx:2004-2025` | display (rendering layer) | N |
| B7 (8d) | Review-before-advance lists the same two decisions twice: "Vance Owen Peace Plan" appears as a `REQUIRED / PEACE PROPOSAL` card *and* as a `DECISION/BLOCKING` row; same for "Paramilitary authorization". **Two real decisions, each listed twice** — two independently-computed "what blocks advance" pipelines with no shared identity check, rendered sequentially with no dedup. Fix: dedupe `review.items` against `blockers` by decision id before rendering, or merge upstream | `AdvanceTurnModal.tsx:197-198` (`derivePresidentialBlockers`) + `:189-196` (`buildPreAdvanceCommandReviewView`, from `data/preAdvanceCommandReview.ts`) | same file, `:421-435` (`BlockerRow`) and `:437-450` (`ReviewItemRow`) | display | N |
| B8 (8f) | "Preserve international standing" and "Maintain internal cohesion" both show `Next available lever: Decision Room / Review political decisions` — identical label, identical navigation target, so the CTA is false for at least one of them. The `!config.militaryOwner` branch returns **one hardcoded lever for every non-military objective** with no per-objective branching, so any two political objectives always collide. Fix: branch `objectiveLever()` on `config.dimension`/`config.id` for the political case as it already does for the military case; **verify all four objective cards still resolve sensibly** — the function is shared | `GameStateAdapter.ts:251-266` (`objectiveLever()`) | `WarSummaryContent.tsx` objective-card CTA, via `buildFactionStrategicObjectiveViews` → `nextLever` | display | N |
| B9 | **Not an audit finding** -- surfaced by B2's measurement, and previously unnamed. The `final_sector_truth_reconciliation.ts` guard clauses fire when sectors momentarily go empty near war-end, and then **something rebuilds `corps_front_sectors` back to 63 later in the same turn WITHOUT a paired rating recompute**. That asymmetry, not the wipe, is what leaves the final state inconsistent. **Recorded, not scheduled**; its only measured consequence is the same bounded final-turn one as B2, so it does not trigger the escalation rule as it stands -- **if anyone finds a mid-war manifestation, it does, and the call returns to the owner**. **First step: the rebuild site was NOT identified** -- find what re-populates `corps_front_sectors` after the guard fires without calling `computeSectorCombatRatings`; everything else is downstream of that | **unidentified** | endgame state | engine path | N |

**2026-09-07 routing reconciliation — planning only.** The event investigation previously proposed the following rows but had not added them here. They are now registered, not scheduled. [Master §4.1](MASTER_ROADMAP.md#41-finite-behavior-closure-register-2026-09-07) owns the finite behavior dispositions and final-calibration sequence. D1 remains in force. B10–B13 and BC01–BC10 do not authorize repairs by their existence; scheduled behavioral settlement precedes final calibration and fresh final campaign acceptance. Subsequent owner-authorized BC01–BC04 work is recorded above; the original panel planning-only permission has explicit P1/P2 implementation amendments.

| ID | Bug / routing | Writer / consumer | Impact and disposition |
|---|---|---|---|
| B10 | Dead narrated COHA/ceasefire/Dayton chain; mechanical packaged negotiation works | `event_types.ts`, `war_1995.json`, event termination and negotiation paths | BC03 **CLOSED 2026-09-07**: verified repair; owner deferred post-horizon acceptance/tickers; signing requires accepted talks. One terminal owner, complete verdict/receipts; no global predicate shortcut or horizon extension. See [investigation corrections](../40_reports/20260905_EVENT_FIRING_SATURATION_AND_DEAD_CATALOG.md). |
| B11 | Historical chronology findings; sensitive P1 Ahmići/P2 enclave packet retain panel ownership | Catalog gates/dates and downstream displacement/NATO | BC04 **P1 IMPLEMENTED/REVIEWED; campaign acceptance pending**. P2 IMPLEMENTED/REVIEWED (GO); campaign acceptance remains deferred. Current n392 reconciliation and separate P1/P2 scopes are recorded in the BC04 subsection above; landed barracks work is excluded. [Conditional panel record](../40_reports/proposals/20260906_S6_PANEL_RECORD_EVENT_FIDELITY.md); no isolated Srebrenica date edit or map repaint. |
| B12 | Same-turn prerequisite dead NATO windows; duplicate Lukavac event | Event loader/catalog and firing pass | BC05 **NATO IMPLEMENTED/REVIEWED (GO); Lukavac event REMOVED/REVIEWED (GO)** by owner disposition. Military Operation Trnovo is preserved; its execution/calibration is outside scope. Campaign/downstream acceptance remains unmeasured. See BC05 above; [historical sweep with current annotation](../40_reports/audits/20260906_FACTION_CONTROLS_MUNICIPALITY_THRESHOLD_SWEEP.md). |
| B13 | Three posture-review handlers unwired; bounded gesture-escalation gap | Desktop player-action handlers and `action_cadence` | BC06 **bounded repair implemented/reviewed (GO)**. Voluntary posture wiring and authored third-use posture/front-visit choices; per-unit decoration targeting passes all three local faction paths in the owner-authorized follow-up. Six address/decoration escalation stages are deferred post-1.0 by the 2026-09-08 owner-delegated disposition; final packaged acceptance remains open. [BC06 evidence](#bc06-bounded-posture-and-gesture-repair--2026-09-07); [PM ruling](../40_reports/audits/20260905_EVENT_ROADMAP_FIT_PM_RULING.md). |

**Friction, separate from bugs:** **F1 — endgame decision drought** is R8 diary triage, not a repair or authoring commission. Inspect the player path and truthful positive-hold coverage; source-supported omissions are evidence, never a per-week quota. Broad drought authoring and orphan-flag activation remain the explicit post-1.0 backlog.

**B2 IS MEASURED ENDGAME-ONLY. D1 covers it; this row is final (2026-09-05).**
`sector_combat_ratings` is not display-only in the source -- `army_hq_gathering.ts:269,340-360`
(`computeSectorThreatAvg`) feeds `CorpsAssessment.sector_threat_avg`, which feeds
`computeOpportunityScore` (`:521-522`) and the skip test at `:875`, and `CorpsAssessment` is consumed
by `bot_corps_directives`, `bot_corps_stance`, `bot_strategy`, `army_co_lifecycle`,
`army_order_interpretation`, `operation_preparation` and the commander modules -- which is why it was
measured rather than assumed.

**The measurement: ZERO mid-war occurrences.** Seven mid-war full-state snapshots (turns 41, 44,
60 x3, 70, 80) show the two maps in perfect parity every time -- 79/79, 79/79, 89/89 x3, 83/83,
89/89. **0 missing, 7/7.** At turn 188 of `apr1992_definitive_188w__46834a3b41033bff__w188_n388`:
63 active sectors, ratings map empty, 63/63 missing.

**Explained by code, not merely correlated.** Every writer of `corps_front_sectors`' key set -- the
`partition-corps-front-sectors` step and all four entry points in
`final_sector_truth_reconciliation.ts` -- calls `computeSectorCombatRatings` immediately afterward in
the same function, and that function emits one entry per key unconditionally, even for 0-brigade
sectors (`sector_combat_rating.ts:81-98`). The one standalone mutator outside the pairing,
`bot_corps_ai.ts:431`, only ever REMOVES keys (it can leave a stale extra rating, never a missing
one) and is resynced the same turn by `recompute-sector-combat-ratings` (`war_phases.ts:2614`).

**CORRECTION -- this register previously stated the consequence wrongly.** It said an absent sector
is excluded from both numerator and denominator, skewing the average. **That is the *partial*-absence
case and it does not occur.** Absence is all-or-nothing: with the map empty the loop never executes,
`count === 0`, and every corps takes the flat `0.5` fallback (`army_hq_gathering.ts:341-360`).
`0.5 > 0`, so the `sector_threat_avg <= 0` skip test at `:875` never fires. The real consequence is
narrower: **at the final turn only**, LOW/HIGH_THREAT bonus logic runs on a uniform `0.5` instead of
a real signal.

**Evidence limitation, recorded so it is not overstated later.** The seven snapshots are
opportunistic saves from different playtest configurations, not a systematic per-turn trace. A fresh
instrumented run was offered and deliberately declined: seven clean mid-war samples plus the
code-level pairing argument suffices to route a defect nobody is repairing. If B2 is ever scheduled
for repair, run it first.

**B1's fix is bigger than the blank panel suggests.** The UI is reading a **dead twin of a live
system**. `state.military.sector_intel[sectorId][].confidence`, computed every turn at
`sector_intel.ts:91-129`, **does gate simulation behaviour**: `bot_corps_directives.ts:58-59,286`
(`INTEL_GATE_LAUNCH_THRESHOLD`, default `0.30`, gates whether a corps may launch an operation at
all), `combat_predictor.ts:82`, `sector_offensive.ts:716,1105-1106`, and
`commander/{briefing,belief,decide,emit}.ts`. So closing B1 is not filling in a blank label -- it is
wiring a dead field to a load-bearing one, and `sector_intel` is the structure already documented as
corrupted by per-turn sector-id churn. Schedule it as such; it is not a UI patch.

**Does D1 cover B1-B4? ASKED AND ANSWERED.** They are not among the 29 audited findings -- they were
surfaced by the panel and were not in front of the owner when D1 was decided. The full record is at
section 9.6 of the
[R7 presentation amendment](2026-09-05-r7-presentation-and-english-readability-amendment-plan.md).
In short: **D1 governs scheduling, so it covers a defect whose only consequence is player-facing
presentation.** That disposed of **B3** and **B4** at once. The two bounded read-only queries were
then run -- a grep and a read each, changing no code -- and settled the rest: **B1 is measured
display-only**, and **B2 is measured endgame-only** (7/7 mid-war snapshots in perfect parity), so D1
covers both and both are final here. **All four are closed into this register; none returns to the
owner.** B9 was surfaced by B2's measurement and is recorded, not scheduled.

**These are BUGS. Friction is reported separately and is not in this table.** Roadmap §12 requires
that *"bugs and friction remain separately reported"*. The friction half of the same audit — voice,
wording, number formatting, unit disclosure, and English that will not render legibly — is
discharged by the R7 amendment above and must never be merged into this register.

**Findings that close with no code, recorded so they are not re-reported as R8 bugs:** 19b (canon at
`SENSITIVE_HISTORY_DESIGN_GATE.md:143` **requires** the unrounded `−4.04` precision — working as
designed), 27 (a generated-art content difference; all three plates share one code path), and 8e
(one authored response template in `war_1993.json:8172-8194` stamped over N real formations — a
content-authoring gap for Narrative/Game Design, not a code item for this register).

### Behavior closure acceptance detail (2026-09-07)

**Owner-authorized planning only.** These BC identifiers index existing work, not milestones or a
new lane. **FIX** is the planned disposition when scheduled, not permission to implement today.
**VERIFY/DISPOSITION** closes with bounded evidence: fix a demonstrated in-scope defect, prove no
relevant effect, or explicitly defer outside the 1.0 definition of done. D1's HOLD FOR R8 remains;
the event findings previously proposed as B10–B13/F1 are now recorded in R8's existing register.
R1–R5, the accepted R6 slice, RC and RE stay closed; calibration remains ongoing. Implementer and reviewer remain different people.

| ID / existing home | Owner | Impact | Pre-freeze disposition and acceptance evidence |
|---|---|---|---|
| **BC01 — player opportunity path / R8** | Gameplay/operations + Game Designer; QA | Player campaign territory and operation decisions; observer parity alone cannot test it | **CLOSED — owner accepted verified repair and retired territory similarity, 2026-09-07** ([verification](../40_reports/audits/20260907_BC01_PLAYER_OPPORTUNITY_IMPLEMENTATION_VERIFICATION.md)), using the [corrected contract](2026-09-01-player-opportunity-sweep-gap.md). L0 gets live review, L1 retains review, L2 auto-applies military opportunities without queuing, L3 remains observer. Verify all four modes, no duplicate decision/application, preserved human authorization at L0/L1, and fresh RBiH/HRHB player-path evidence against observer plus RS regression proof; do not copy a blanket post-turn sweep. |
| **BC02 — B2/B9 sector/rating truth / R8** | Systems + QA | Canonical saves omit derived ratings; immediate load/display gap, no demonstrated simulation effect | **CLOSED — owner-approved Electron load/display repair verified 2026-09-07.** Loaded saves rebuild only the transient rating cache before runtime/player projection; canonical bytes, other state, privacy, and next-turn simulation ordering remain unchanged. Browser raw-JSON fallback is outside this repair. [Implementation and verification](#bc02-existing-save-investigation--2026-09-07). |
| **BC03 — B10 narrated Dayton / R8** | Events/systems + Game Designer + QA | Event effects, termination ordering, receipts and endgame state | **CLOSED 2026-09-07 — verified repair and owner-approved post-horizon deferral.** Repaired the narrated chain with one coherent terminal owner; preserve the working packaged negotiation. Resolve the redundant event game-over writer first, then the catalog gate/window; verify COHA false-key semantics, firing/termination order and complete packaged verdict snapshot/receipts. The headless terminal contract is VERIFY/DISPOSITION, not a mandate to add a headless closeout. Do not globally redefine `flag_not_set` or extend the 188-week horizon as a shortcut. [Investigation corrections §10–11](../40_reports/20260905_EVENT_FIRING_SATURATION_AND_DEAD_CATALOG.md). |
| **BC04 — B11 chronology + P1/P2 / R8, panel-owned history** | Historian + events/systems + scenario/calibration + independent §6 panel | Event timing/effects, displacement, personnel, NATO and downstream operations | **P1 IMPLEMENTED/REVIEWED; campaign acceptance pending; P2 implemented/reviewed; campaigns deferred**: current code and n392 receipts reconciled in the BC04 subsection above; completed barracks stagger excluded. P1/P2 follow the [existing conditional panel record](../40_reports/proposals/20260906_S6_PANEL_RECORD_EVENT_FIDELITY.md), with the subsequent owner-approved P1/P2 implementation amendments recorded above. P1 preserves the historical date and map; P2 is a coherent chronology packet, measured receipt dates with brakes active, no narrowed expiry/backstop shortcut. Separate P1 and P2 controlled runs, full anchors/health/§6 and displacement/operation diffs; no fresh re-floor until explained and accepted. |
| **BC05 — B12 dead event windows/control gates / R8** | Events/systems + Historian + QA | Enabling NATO events and removing a political decision can change outcomes; a loader lint alone is byte-neutral | **NATO IMPLEMENTED/REVIEWED (GO); Lukavac event REMOVED/REVIEWED (GO)** by owner disposition; removal verified across 12 focused files/289 tests by recorded evidence union. Military Operation Trnovo is preserved; its execution/calibration is outside scope. Focused checks do not establish campaign/downstream acceptance. No initial repaint, threshold reduction, baseline refresh or campaign authorized. |
| **BC06 — B13 posture/gesture controls / R8** | Gameplay/desktop + Game Designer + QA | Player-action decisions/effects; headless neutrality is insufficient | **BOUNDED REPAIR IMPLEMENTED/REVIEWED (GO), BC06 OPEN.** Voluntary posture wiring, authored third-use choices, receipts and owner-authorized per-unit decoration targeting verified locally. Six undefined escalation stages are deferred post-1.0 by the 2026-09-08 owner-delegated disposition; final packaged acceptance remains open. [Evidence and limits](#bc06-bounded-posture-and-gesture-repair--2026-09-07); no general recurrence-system redesign. |
| **BC07 — initial-master stability divergence / calibration-data authority** | Asset/data integration + Systems + calibration | Mode-dependent stability consumption | **DISPOSED — RETAIN (GO), 2026-09-08.** Keep committed values: hybrid/ethnic starts bypass master stability; mode-less operational starts can consume it. Paired sentinel characterization passes 3/3; no regeneration/repaint or changed data. [Evidence and policy](#bc07-stability-data-disposition--2026-09-08). |
| **BC08 — inherited suite residual / verification** | QA + owning Systems/Game Design seats | Current-suite environment failure, not a reproduced simulation residual | **CLOSED — verification/disposition, 2026-09-07.** Full suite exit 1 retained: one Bash-resolution failure; unchanged focused file 8/8 with child-scoped Git Bash. Located deployment/diagnostics suites and peace plans pass; n392 artifact gates pass with source/input-equivalence and transient coverage limits. [Complete receipt](../40_reports/audits/20260907_BC08_CURRENT_ENGINE_HEALTH_VERIFICATION.md); no overall-green or whole-engine claim. |
| **BC09 — shared production inputs / R8** | Systems + QA | Required census/ethnicity inputs and runner equivalence | **LOCAL PACKET REVIEWED (GO).** [Runtime integrity Phase 1](2026-09-07-r8-runtime-input-ai-integrity-plan.md) records shared validation and real IPC 25/25 with matching one-turn baseline bytes. Campaign/final packaged gates deferred; BC07 data policy remains separate. |
| **BC10 — optional external AI ownership/replay / R8** | Commander + Systems + QA | One final command writer and stable recorded inputs | **PLANNED, not implemented.** [Runtime integrity Phase 2](2026-09-07-r8-runtime-input-ai-integrity-plan.md) follows BC01/BC06 and BC09, including its required Phase 0 review. Commander keeps final authority; recorded decisions replay without API calls; cadet mode and player authorization remain intact. |

**Freeze and evidence rule.** Every BC row needs a linked fix-and-verification receipt or explicit
bounded disposition before final calibration acceptance; the register is not closed merely because
RE is closed or headless hashes match. Behavioral changes retain one-change-per-controlled-run
discipline and applicable deterministic paired proof. Group final acceptance after the last accepted
behavior change; do not skip causal intermediate measurements to save runs. n392 remains the accepted
reference and its floors remain unchanged until an explained, authorized acceptance supersedes it.
Text-only B3/B4 fixes can change serialized strings/hashes without changing game behavior: explain
that exact delta, prove numeric/decision/control equivalence, and do not call it a calibration re-floor.
If later R8 play uncovers a new behavior defect, fix/disposition it and revalidate the affected evidence;
a freeze is a controlled change boundary, not a promise that no bug can ever be found.

**Explicit exclusions:** no revival of retired RE packets or closed R6 experiments; no D-topology,
new mechanics, broad recurrence redesign, 190/193-week horizon expansion, or 32-orphan-flag debt
activation. The [event-catalog backlog](MASTER_ROADMAP.md#10-finding-routing) and broad drought authoring stay post-1.0;
its byte-neutral orphan ratchet may be scheduled separately but does not gate this freeze. **F1** stays
R8 diary triage (truthful positive-hold intervals are valid), not an event quota or automatic authoring
commission. Presentation-only findings and R9 packaging remain governed by their existing plans.

### Repository audit behavior additions — BC09/BC10 (2026-09-07)

Owner-requested planning explicitly adds these rows to the finite register; the original BC01–BC08
dispositions remain intact. The [runtime packet](2026-09-07-r8-runtime-input-ai-integrity-plan.md)
is their sole task-level contract.

| ID | Owner / overlap | Required acceptance |
|---|---|---|
| BC09 | Systems/QA; delivery prerequisite to BC07 final stability policy, not a replacement for it | One shared input preparation; explicit fixture contracts; malformed/missing required inputs fail before mutation; valid desktop/scenario parity and controlled evidence. No data regeneration. |
| BC10 | Commander/Systems/QA; after BC01/BC06 and BC09 | Canonical commander consumes validated scoped proposals once; record/replay order is stable for identical inputs; no API on replay; cadet and player authorization preserved. Required Phase 0 experts before code; no new AI commands. |

Both settle before final calibration/packaged acceptance. Commit phases separately; preserve
attribution and master §11/§6 requirements. Fake/recorded clients avoid live API spending. New
failures are not permission to reset baselines, weaken a test, or enlarge the repair.

## BC06 bounded posture and gesture repair — 2026-09-07

Owner scheduled BC06 after clean HEAD `4c419c464adce4e59d9046b37b79d163979d5c7d`.
Investigate the three reported posture-review handlers against current code, trace visible
player actions through authoritative decisions/effects, and repair only confirmed defects
plus the PM-ratified bounded `action_cadence` escalation. General recurrence and option-decay
authoring are outside this packet. One Sol/medium implementer and one independent Sol/medium
reviewer; orchestrator owns live proof, synthesis, documentation and commit.

Fixed validation: direct Vitest on affected event/cadence/desktop/UI contracts; direct
TypeScript check; tactical map build and desktop simulation bundle for a local Electron
fixture loaded through the real player surface. Inspect wrappers before execution. Capture
visible actions, before/after effects, cooldown/repeated-input behavior and persisted receipts
under `logs/bc06/`. Expected cost: local tests/builds in minutes plus fixture preparation.
Stop after one review and targeted corrections. No campaign, structural-fingerprint check,
calibration or baseline refresh, remote push, publication, or separately PLANNED audit packet.
Local fixture proof cannot close final packaged/full-campaign acceptance.

Preserve BC04 same-week follow-up restrictions, NATO timing, Dayton prerequisites/receipts,
protected expiry/backstops, owner-deferred post-horizon rows, initial control, 188-week horizon,
calibration floors and event-owned enclave outcomes. Lukavac's event disposition is retired;
military Operation Trnovo execution remains outside scope. Chronology attribution remains
pre-P1 `c95e25241`, P1 `f117fe475`, P2 `558f253a2`; `c2c8300d6` changed display/catalog and
saved names, not IDs or mechanics. BC04/BC05 campaign acceptance remains open; BC09 precedes
BC07 final data policy and BC10 follows input/command settlement.

**Current-code findings (2026-09-08):** the three reported IDs are
`strategic_posture_review_rbih`, `strategic_posture_review_rs`, and
`strategic_posture_review_hrhb`. Their natural event decisions already use the generic
event-response resolver; the missing wiring is voluntary player initiation and repeat use.
Visits, addresses and decorations already have that initiation path. The catalog actually
contains three escalating postures and nine static gestures, correcting the historical
"11 of 12" count without rewriting the original audit.

Bounded escalation means enforcing existing `available_from_fire: 3` options for voluntary
posture/front-visit decisions and classifying the three front visits as escalating. No effect
delta, max-fire count, cooldown, natural-event evaluator, option-decay rule, or multiplier is
authored here. Six address/decoration rows have no authored escalation stages or numerical
rule; their broader escalation gap remains unresolved, not satisfied by an inert label flip.
The new posture control uses the established leadership-gesture price of 10 CA by explicit
implementation parity inference; no posture-specific price clause was found. Independent
review must assess that inference and the bounded authority claim.

**Review correction and remaining boundary:** per-unit decoration response IDs are expanded
from an authored template; notification lookup needs matching aliases for those expanded IDs.
The existing payload is reused, with no new notification content. Separately,
`target_formation_id` is not consumed by the effect applier: selecting one regular formation
still applies the authored faction-wide morale/cohesion effects. That existing targeting
mismatch remains an unmet BC06 criterion requiring a separately authorized targeting repair;
it is not waived by the cadence/receipt repair or by other passing tests.

**Validation (2026-09-08):** the final 10-file focused run passed 150/150. A targeted
notification-alias correction then passed 48/48 across leadership actions and event decisions;
these overlap and are not a claimed single 198-test run. Both RED logs are retained. The first
TypeScript pass found the missing exhaustive directive-art entry; after correction, final
TypeScript and tactical-map build passed. Desktop simulation bundle/startup-snapshot check
passed. `logs/bc06/validation.json` binds current source hashes, local command exits and live
case evidence; `logs/bc06/scope-check.log` records preserved protected inputs/evaluator.

Six first/third posture cases (all factions), two first/third RBiH front-visit cases and one
RBiH address case passed through visible Desk -> Command Surface -> Command & Personnel ->
Dossier -> Issue -> response controls, real IPC and canonical autosaves. They establish
offered options, actual effects/receipts, one CA debit/count and rejected immediate reissue with
unchanged autosave bytes. Fixture turn 90 and prior counts are synthetic inputs, not campaign
history or natural timing evidence. All nine cases captured no page/network diagnostics.
Per-unit decoration's separate non-target acceptance check failed: unselected
`arbih_102nd_motorized` morale became 55 rather than remaining 50. Keep that failed evidence
and unmet criterion. A separate targeted live check verifies the corrected notification receipt;
it does not certify decoration target isolation. No campaign, packaged acceptance, calibration
neutrality measurement or baseline refresh is claimed.

**Final independent review: GO for the bounded repair**, with BC06 residual gates retained.
The reviewer independently passed 151/151 across the affected ten files after notification
alias correction. Screenshot inspection found the generic next-turn staging receipt was false
for leadership decisions; the dedicated EN/BCS receipt now explains that the decision is open,
authority is spent, and effects await the selected response. The affected UI suite passed
28/28 (implementer and independent reviewer), the map rebuilt successfully, and
`live-posture-receipt-final-01/result.json` records the exact new text in a rendered status box
before modal navigation, plus unchanged effect/receipt/repeat-rejection checks. This is live DOM
observation; the transition screenshot is not cited as stable readable receipt proof.
Earlier nine effect fixtures are retained rather than rerun for a shared message-only change.
Review: `logs/bc06/independent-review.md`; consolidated receipts: `logs/bc06/validation.json`.
The reviewer accepts 10 CA only as explicit parity inference. Nonblocking stale builder comments
were aligned with actual pre-queue filtering; no behavioral retest was needed for those comments.

### BC06 decoration target follow-up — 2026-09-08

After bounded repair commit `d7fb720353c2b6b37a80269261ec1e193a205161`, the owner
authorized the separate per-unit targeting repair ("Sure, wrap it up"). The earlier
failed non-target check above remains historical evidence. Scope is consuming the
existing selected formation in the authoritative decision/effect path, preserving
authored deltas, broad/decline choices, command ownership, cadence and receipts.
Invalid or stale targets must fail before mutation rather than apply faction-wide effects.

Fixed validation plan: focused leadership/event decision and affected effect tests,
TypeScript, tactical-map build, read-only startup-snapshot check/desktop-sim rebuild,
then the existing isolated Electron harness with all three faction fixtures. Each live
case must prove selected-unit +5 morale/+2 cohesion, unchanged friendly and foreign
controls, one command-authority debit and decision receipt, opponent notifications,
and cooldown rejection with unchanged autosave bytes. Expected cost is a few minutes
of local checks and one independent Sol/medium review. Stop after review and targeted
corrections; no campaign, calibration, fingerprint simulation or packaged acceptance.
The six unauthored address/decoration escalation rules remain outside this repair.

Implementation validates generated response suffix/metadata, event/faction and active
regular friendly target before effects or any other decision mutation. The existing
authored morale/cohesion deltas then affect only that target. Broad/decline and legacy
unsuffixed responses retain their authored semantics. Missing status is ineligible,
matching the required formation schema and authoritative resolver.

Focused tests passed 62/62; TypeScript, map build and desktop-sim/startup-snapshot check
passed. All three live Electron cases (`logs/bc06/targeting/live-{rbih,rs,hrhb}-02`)
passed the declared effects, friendly/foreign controls, receipts, authority, cadence and
repeat-rejection assertions, with zero page/network diagnostics. Foreign controls are
checked in canonical autosaves because the player projection hides them. The first
RBiH follow-up config incorrectly queried that projection; its failed harness result
is retained alongside the earlier genuine targeting failure. No production correction
was needed for that fixture assertion. Reproducible configs and consolidated receipts
are under `logs/bc06/targeting/`; synthetic turn 90 does not establish campaign timing.

Independent Sol/medium review returned **GO** for this follow-up, with a fresh 62/62
focused run and inspection of all three live cases. See the dated addendum in
`logs/bc06/independent-review.md`. The earlier target-isolation criterion is satisfied;
BC06 remains open for the six undefined escalation rules and final packaged acceptance.

### BC06 final design disposition and BC09 authorization — 2026-09-08

Following commit `491cf2110`, the owner delegated "Resolve then authorize".
The orchestrator's disposition is to **retain static behavior for 1.0** for
`address_to_nation_{rbih,rs,hrhb}` and `decorate_a_unit_{rbih,rs,hrhb}`. New escalation
stages for these six rows are explicitly **deferred post-1.0**, removing this
design-authoring gap from the 1.0 acceptance scope. This is a delegated release-scope
exception, not a claim of full Rulebook §17.5 compliance or a canon amendment.

Rationale: all six have five-use limits and ten-turn cooldowns but no authored
later-use options or numerical escalation rule. Existing costs, choices, effects,
cadence and per-unit targeting remain intact. Neither an inert `escalating` label
nor invented effect scaling would implement the PM ruling's intended behavior.
Already-authored third-use posture/front-visit choices remain implemented and
verified. General recurrence and option narrowing stay deferred under the existing
PM ruling. Post-1.0 authoring must define explicit stages, player choices and
effect/receipt expectations before implementation; this disposition commissions
no new mechanic. Historical reports and earlier unresolved-gate records remain intact.

BC06's local implementation and design disposition are complete; **final packaged
acceptance remains open**, so BC06 is not declared fully closed. BC09 Phase 1 is
now **AUTHORIZED/SCHEDULED, implementation not started**, under the bounded
[runtime-input authorization](2026-09-07-r8-runtime-input-ai-integrity-plan.md#2026-09-08--owner-delegated-bc09-scheduling).
BC09 precedes BC07's final policy. No new campaigns, calibration changes, data
regeneration, baseline refresh, remote push or publication. Applicable campaign
acceptance is deferred, not waived. BC10, cleanup and build preparation remain planned.

## Phase 4 -- Automatic remediation loop

**Assigned role:** Orchestrator
**Independent review:** relevant domain reviewer + QA Engineer

1. Route confirmed bugs before friction:
   - map lifecycle/performance -> R1;
   - Desk/Decision/Advance UX -> R2 or R4;
   - TG/system lifecycle -> R3;
   - state/performance/save/replay/CI -> R5;
   - historical mechanics/calibration -> R6;
   - content/localization/audio -> R7.
2. Turn each accepted finding into a failing test in the owning plan.
3. Implement, `/simplify`, verify focused and broad gates, and rebuild the transient package.
4. Rerun the affected faction from a fresh campaign through the original reproduction turn; if the fix can affect later state, rerun the full 188 turns.
5. Repeat until the final acceptance rule is met.

Once R8 repair work is scheduled under D1, no owner decision is required for an in-scope repair whose correct behavior is already defined. The §4.1 register itself supplies no scheduling authority. A new behavior finding explicitly reopens the affected closure and calibration evidence before final acceptance; it does not silently enlarge the frozen list. A genuine canon contradiction is documented as an unsupported/omitted behavior rather than improvised into runtime.

## Phase 5 -- Final two clean diaries and closeout

**Assigned role:** QA Engineer acting as player
**Independent review:** Verification Before Completion

- [ ] Produce two consecutive final validation diaries with no confirmed bug and no new Desk -> Decision -> Advance friction.
- [ ] Require President-feel 5/5 in both. A lower score reopens its stated top friction owner.
- [ ] Require no unexplained decision drought: sourced reviews meet the 8-10-week target; unsupported intervals show explicit positive-hold truth.
- [ ] Require warm map P95 <=150 ms, cold P50/P95 <=1000/1500 ms on the recorded machine, and zero stale/blank/error samples.
- [ ] Require clean console/network/WebGL diagnostics and exact autosave/replay provenance.
- [ ] Create `docs/40_reports/implemented/20260731_FULL_CAMPAIGN_ELECTRON_VALIDATION.md`.
- [ ] Update master roadmap, ledger, and reusable knowledge.

```powershell
npm.cmd run typecheck
npm.cmd run test:vitest -- --pool=forks --reporter=dot
npm.cmd run test:baselines
npm.cmd run engine:health:gate
npm.cmd run qa:player-experience
npm.cmd run qa:first-hour:browser
npm.cmd run qa:live-surface:browser
npm.cmd run qa:electron-runtime-contracts
npm.cmd run desktop:release:check
npm.cmd run desktop:package:dir
npm.cmd run desktop:package:probe
git diff --check
```

## 6. Success criteria

- [ ] Three 24-turn and three full 188-turn fresh packaged Electron sessions are provenance-bound.
- [ ] Every decision has a noninvented basis classification.
- [ ] Map, Army HQ, Records, Chronicle, Codex, settings, audio, replay, and endgame were actively exercised.
- [ ] Every finding is explicitly bug or friction and routed to an owner.
- [ ] All confirmed bugs are fixed before friction work.
- [ ] Two consecutive clean diaries score President-feel 5/5 with no new loop friction.

## 7. Copy-ready execution prompt

```text
Role and objective: Execute roadmap R8 from docs/plans/2026-07-31-full-campaign-electron-validation-plan.md as the player in the transient packaged Electron build. Validate RBiH, RS, and HRHB; do not substitute headless evidence.

Choice policy: authored historical default -> accepted historical operation -> sourced faction doctrine -> restraint -> explicitly logged staff recommendation. Never invent a historical default.

Read first: .claude/napkin.md, docs/life_lessons.md, docs/plans/MASTER_ROADMAP.md, docs/40_reports/playtests/TEMPLATE.md, and current implementation reports.

Constraints: bind package/transcript/autosave/replay/screenshots/diagnostics; exercise the map and presentation; bugs before friction; fresh campaign after source changes; transient packages/evidence only; no signing/upload/version/tag/release.

Handoff: session metadata, exact turns, evidence root, decision provenance, diagnostics, three worst friction moments, best moment, President-feel score, bug/friction split, cadence and map timings, fixes/reruns, and next phase.
```

## 8. Orchestrator completion block

**Canonical owner:** packaged Electron player path plus bound autosave/replay.
**Demoted path:** headless-as-player proof, invented choices, unbound screenshots, one-button soak.
**Player-visible truth:** the complete president's loop across three factions and a full campaign.
**Canonical UI surface:** Desk -> Decision Room/evidence -> Advance, with map/Army HQ/Records/Codex.
**Done means:** two consecutive 5/5 clean diaries after three-faction full-campaign evidence and bug-first remediation.

### BC07 stability-data disposition — 2026-09-08

The owner authorized integrating BC09 and proceeding to the stability-data decision.
BC09 commit `fa900ba89` is now integrated unchanged into local main. Its reviewed
40-test/25-IPC-case evidence remains applicable; integration made no new source change.

**Disposition: RETAIN the committed operational initial master.** Do not
regenerate it, repaint control, change calibration floors, or treat the derive script
as a no-op. The real-initializer characterization passes 3/3; independent Sol review returned GO.

The accepted `apr1992_definitive_188w` scenario uses `hybrid_1992`. Both hybrid and
`ethnic_1991` return before the operational-master stability-copy branch in
`src/state/political_control_init.ts` (mode dispatch around lines 855–876; master
selection/copy around 894–995). The scenario builder explicitly loads the canonical
graph and passes its selected mode; desktop scenario starts use that builder or the
startup snapshot. Thus the historical roughly 227 disputed stability rows do not
establish 227 effects in the normal campaign. This is a startup-path finding, not a
new campaign outcome or a claim that stability never matters.

Mode-less operational-graph entry points can consume those committed values, including
raw simulation/developer entry points. The early-war control-flip reader uses municipal
stability, falling back to 50 when absent (`src/sim/early_war/control_flip.ts`, around
381–391 and 577–600). Regeneration could therefore alter supported legacy behavior.
The historical 269/712 disagreement and its roughly 227 stability/42 cosmetic split
are reused evidence, not a new generator run. `contested_control` supplies no war-rule
reader and is reset on scenario operational starts; it does not justify a repaint.

Retain the current artifact as the compatibility input for these legacy paths. The
derive script may produce a comparison candidate, but its output must not overwrite
the retained file without a separately reviewed provenance/mode-impact decision and
applicable controlled campaign evidence. This disposition does not certify the
historical accuracy of every retained bucket or authorize data generation.

**Validation plan:** a small temporary-fixture characterization of the actual initializer
must show a changed sentinel stability value changes mode-less operational initialization,
while hybrid/ethnic initialization remains identical. Run only that focused test and
relevant documentation checks, then independent Sol review. Expected cost: minutes.
Stop on unexpected mode consumption or any need to change historical data. Root owns
documentation; the worker owns only the characterization test. No production edits.

**Acceptance order:** the owner's go-ahead does not remove the existing prerequisites.
Runtime Phase 1 §5 and the R9 build-preparation plan require settled build inputs before
final calibration/package acceptance; cleanup and other scheduled behavior work also
remain. Do not launch final campaigns or packaged diaries on this intermediate tree.
Those checks remain required, and no final BC09/R8 closure follows from this disposition.

**Local evidence:** `tests/bc07_operational_initial_master_consumption.test.ts` varies
sentinel stability 37/83. Mode-less initialization copies each value; both other modes
successfully initialize RBiH control and produce deep-equal completed states. Command:
`npx.cmd vitest run tests/bc07_operational_initial_master_consumption.test.ts` — 3/3,
exit 0 (`logs/r8-runtime-integrity/bc07-consumption-final.log`). No production/data diff.

Independent review: `logs/r8-runtime-integrity/bc07-independent-review.md` — GO.
TypeScript and 13 focused documentation checks pass (`bc07-typecheck.log` and
`bc07-docs-tests.log` in the same evidence directory).

### 2026-09-08 — Cleanup Task 3 packaged-validation continuation

Task 3 source/documentation acceptance remains settled; integration remains NO-GO
because five-route packaged navigation proof is absent. A fresh clean-package
continuation was blocked before build: automatic approval review rejected deletion
of the verified generated `dist-packaged/win-unpacked` directory (“blocked by policy”).
No command exit code exists for either rejected deletion; neither ran. Historical
package/runtime retry exit-0 receipts do not establish route acceptance. See the
[existing cleanup evidence](2026-09-07-bounded-deletion-cleanup-plan.md#2026-09-08--fresh-packaged-validation-continuation-blocked-before-build)
and `logs/bounded-deletion-cleanup/task3-fresh-package-diagnosis.log`.
Local main stays at reviewed Task 2; Task 4 is not started. This local Task 3
validation does not discharge final R8 packaged-game acceptance.

### 2026-09-08 — Cleanup Task 3 fresh local packaged proof

Owner cleanup resolved the earlier policy blocker. Fresh Windows package and PE
checks pass; the existing runtime probe passes after one preserved transient-cache
retry. All five pre-advance modal routes now prove destination, dismissal, shell,
return and safe text in the completed package. Distinct Decision Room callback
behavior and natural pre-advance/docket entrypoints also have receipts. Navigation
diagnostics are empty. See the [Task 3 closeout](../../logs/bounded-deletion-cleanup/task3-validation-closeout.md#latest-local-task-3-packaged-evidence--2026-09-08).
Targeted independent Sol/medium review returned GO for local integration. Task 4 is untouched;
these local fixture checks do not discharge final R8 packaged-game acceptance.
