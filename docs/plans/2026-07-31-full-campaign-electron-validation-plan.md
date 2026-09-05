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

### Pre-seeded finding register -- 2026-09-03 showcase GUI audit

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

No owner decision is required for an in-scope repair whose correct behavior is already defined. A genuine canon contradiction is documented as an unsupported/omitted behavior rather than improvised into runtime.

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
