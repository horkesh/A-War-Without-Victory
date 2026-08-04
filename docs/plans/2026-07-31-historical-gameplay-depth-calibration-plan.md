# Historical Gameplay Depth and Final Calibration Implementation Plan

> **For implementation:** REQUIRED SUB-SKILL: use `executing-plans` and execute one phase at a time.

**Goal:** Resolve and finish historical event-state correctness, Standing-OG, political-dimension, intel/ambush, supply-comprehension, Sarajevo continuous-condition, and fall-1995 combat-math lanes without another owner decision queue.

**Architecture:** Preserve the current deterministic combat model, retire the failed broad Standing-OG path, and serialize every remaining behavior-moving experiment against one recorded floor. Each experiment has predeclared adopt-or-retire criteria; failure produces a documented no-go and the plan proceeds. Historical claims use the local Balkan Battlegrounds corpus plus official tribunal/UN sources, while sensitive outcomes remain consequences rather than player levers.

**Tech stack:** TypeScript simulation, JSON events/scenarios, Vitest, deterministic 40/104/188-turn runners, engine-health/calibration diagnostics, React read models.

**Date:** 2026-07-31
**Status:** READY -- begins after R3 Tactical Group convergence
**Roadmap workstream:** R6
**Canonical owner:** combat lifecycle for mechanics; current-state predicates for history; Decision Room/map for explanation only
**Collision rule:** Phases 4 and 5 own `attack_resolution_osid.ts` serially. No other combat-math lane may overlap them.
**Activation:** Begin only after the owner says `Execute the master roadmap` or explicitly names this plan.

---

## 1. Resolved decisions

1. **Standing OG:** ADR-0007 Phase C remains retired. The accepted 1.0 doctrine is the narrower live contribution model: physical/sector defenders may contribute and share casualties; primary-defender aftermath remains primary-owned. Canon wording will be aligned to that live truth. No widened roster/predictor resurrection.
2. **Political dimensions:** measure current `main`, test `intl_only` first, then `cohesion_only` on the accepted result. Adopt a mode only if its predeclared historical and engine-health criteria pass; otherwise retire it and continue. `both_on` is not a separate tuning hunt.
3. **Sarajevo:** finish the continuous-condition/lifeline substrate and player explanation. It models siege supply pressure and documented lifelines; it never exposes shelling, starvation, or civilian harm as a player lever.
4. **Fall 1995:** E-A5 is shipped. Implement E-B1 coherence in two isolated slices. Execute E-A6 only if the post-E-B1 residual diagnostic still shows its named reachability gap; otherwise mark E-A6 retired as unnecessary.
5. **Intel ambush:** the default-off implementation is an experiment after the combat spine is frozen. Enable only if it improves low-confidence attack differentiation without hidden-truth leakage, clamp failure, anchor loss, or ahistorical casualty growth; otherwise retire the flag.
6. **Supply:** improve comprehension over existing truth. Do not add new supply authority or reveal enemy data.
7. **Final calibration:** one accepted change per evidence run, followed by one deliberate final 1.0 re-floor after all adopted slices are known.
8. **Historical event-state truth:** calendar windows may surface history but may not manufacture territorial outcomes. `gorazde_pocket_consolidation_1992` is a confirmed gameplay bug: its 30% municipal-control predicate currently flips `op:gorazde:glamoc` and `op:gorazde:kamen`. Remove that control mutation and allow the informational receipt only after current political control already records both OSIDs as RBiH-held. R7 separately owns source replacement and removal of the absolute future-outcome prose.

## 2. Historical evidence and terminology

- Early Drina seizures belong in April 1992: Zvornik 9-10 April and Foca in April are recorded in the local BB extraction from **BB1 p.187** (`EARLY_WAR_TERRITORIAL_PROGRESSION_APR_JAN1993.md`).
- Sarajevo's 1992 military condition is a protracted siege in which artillery imposed casualties/destruction and political pressure but did not itself seize ground or force surrender (**BB1 p.190**). The IRMCT's official Sarajevo case archive identifies the 1992-1995 siege and the relevant convictions: <https://www.irmct.org/en/mip/features/sarajevo>.
- Neretva/Grabovica/Uzdol content belongs to 1993, not 1992. The local record places the Uzdol attack on 14 September 1993 (**BB2 pp.453-454**); the ICTY Halilovic judgment summary confirms the Grabovica and Uzdol crimes and distinguishes crime findings from Halilovic's acquittal: <https://r.irmct.org/en/press/judgement-case-prosecutor-v-sefer-halilovic>.
- Srebrenica rupture claims follow the official record and canonical Section 6 boundaries. The ICTY Appeals Chamber held that genocide was committed at Srebrenica in 1995: <https://aomenduchangnvrenshuqian.irmct.org/en/press/appeals-chamber-judgement-case-prosecutor-v-radislav-krstic>. The UN Secretary-General's report is A/54/549: <https://documents.un.org/api/symbol/access?l=en&s=A%2F54%2F549&t=pdf>.

No plan task may convert those sources into an atrocity optimization or an unsupported symmetric claim.

## 3. Purpose and non-goals

### In scope

- align Standing-OG doctrine and live code truth;
- remove calendar/weak-predicate territorial mutation from authored historical events, beginning with the confirmed Goražde consolidation defect;
- activate or retire political-dimension modes by evidence;
- complete Sarajevo lifeline/continuous siege behavior and explanation;
- finish E-B1 and conditionally E-A6;
- activate or retire intel ambush depth;
- finish supply comprehension;
- produce the frozen 1.0 calibration floor.

### Non-goals

- no new faction conquest target, scripted territorial result, or calendar takeover;
- no revival of Standing-OG Phase C or reserve-attrition #329;
- no casualty/body-count reward, atrocity decision, or condemnation reversal;
- no hidden enemy logistics/intelligence;
- no baseline refresh before causal review; no package/version/tag/release change;
- no edit to `docs/10_canon/FORAWWV.md`.

## 4. External-agent execution contract

```powershell
git status --short --branch
Get-Content -Raw .claude/napkin.md
Get-Content -Raw docs/life_lessons.md
Get-Content -Raw docs/plans/MASTER_ROADMAP.md
Get-Content -Raw docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md
Get-Content -Raw docs/40_reports/CALIBRATION_MASTER.md
Get-Content -Raw docs/plans/2026-05-29-b7-sarajevo-siege-continuous-condition-plan.md
Get-Content -Raw docs/plans/2026-05-29-fall-1995-deferrals-ea5-ea6-eb1-plan.md
rg -n "intl_only|cohesion_only|AWWV_INTEL_AMBUSH_DEPTH|coordination_coherence|standing_og|sarajevo_lifeline" src tests data
```

For every behavior-moving slice:

1. Record the exact base commit, scenario inputs, feature flags, 40/188 hashes, 31 anchor results, six bot benchmarks, matched OSIDs, casualties, displacement, and engine-health anomalies.
2. Write failing focused tests.
3. Implement one change.
4. Run focused, 40-turn, then paired byte-identical 188-turn proof.
5. Apply the predeclared adopt-or-retire rule without asking for a new product decision.
6. Keep comparison artifacts untracked unless the artifact policy explicitly owns them.

## 5. Phase sequence

## Phase 0 -- Freeze current comparison truth

**Assigned role:** Scenario Author
**Independent review:** Determinism Auditor + Historian

### Task 0.1 -- Correct the confirmed Goražde event-state defect before freezing the floor

**Files:**

- Modify `data/scenarios/events/war_1992.json`
- Create `tests/gorazde_pocket_event_state_truth.test.ts`
- Modify event baseline/fixture ownership only after causal review

- [x] RED: prove 30% Goražde municipal control cannot transfer `op:gorazde:glamoc` or `op:gorazde:kamen`, set the consolidation flag, or emit a completed-consolidation receipt.
- [x] RED: prove an informational receipt becomes eligible in the historical window only when current `political_controllers` already records both exact OSIDs as RBiH-held.
- [x] Remove the event's `control_change`; keep any morale/flag/narrative consequence downstream of the exact current-state predicate and prove the event does not alter political control bytes.
- [x] Route the Wikipedia-only citation and absolute future claim to R7; do not repair sourcing with unsupported copy in R6.
- [x] Run the 40-turn comparison and explain the expected baseline delta before Phase 0 freezes candidate truth.

```powershell
npm.cmd run test:vitest -- tests/gorazde_pocket_event_state_truth.test.ts tests/event_conditions.test.ts --pool=forks --reporter=dot
npm.cmd run sim:scenario:run:40w
npm.cmd run test:baselines
```

**Execution evidence — 2026-08-01:** Task 0.1 is complete and independently approved. The matched 40-week seed changed only two false turn-18 `RBiH -> RBiH` control-event receipts; all 31 anchors and territorial/formation/activity outputs remained identical. The golden 52-week seed correctly stopped scripting Glamoč/Kamen, improved core anchors from 30/31 to 31/31, kept all six bot bands green and critical anomalies at zero, and produced the causally reviewed cascade recorded in [the implementation report](../40_reports/implemented/20260801_R6_GORAZDE_CURRENT_STATE_TRUTH.md). The baseline manifest was updated only after that review and strict mode passed. Wikipedia-only sourcing and absolute future prose remain routed to R7; the mechanical packet did not alter them.

`/simplify` -> gameplay/historical review -> commit `fix(events): bind gorazde consolidation to current control truth`

### Task 0.2 -- Freeze the post-correction comparison truth

**Files:**

- Create `tools/diagnostics/final_calibration_candidate_report.ts`
- Create `tests/final_calibration_candidate_report.test.ts`
- Update no baseline in this phase

- [ ] Produce stable side-by-side reports for default, `intl_only`, `cohesion_only`, intel ambush, and E-B1 flags/config where already runnable.
- [ ] Include 40/104/188 horizons and named early/mid/late historical windows.
- [ ] Add explicit rows for April 1992 Drina takeovers, 1993 RBiH-HRHB war, Sarajevo continuity, safe areas, 1995 western offensive, and Dayton end state.
- [ ] Prove report ordering and repeated outputs are deterministic.

```powershell
npm.cmd run test:vitest -- tests/final_calibration_candidate_report.test.ts tests/political_dimensions_snapshot.test.ts tests/intel_ambush_depth_gate.test.ts --pool=forks --reporter=dot
npm.cmd run sim:scenario:run:40w
npm.cmd run sim:scenario:run:188w
npm.cmd run engine:health:gate
```

`/simplify` -> review -> commit `test(calibration): freeze remaining candidate truth`

### Task 0.3 -- Fix the Zvornik/Doboj/Gračanica ahistorical 188w losses

**Status:** BLOCKED on R5 closing (owner directive 2026-08-03: finish the engine workstream first). Do not start until R5's Workstream Register row reads complete.

**Owner ruling (2026-08-03):** RS losing Zvornik, `op:doboj:boljanic_2`, and `op:gracanica:petrovo_2` by week 188 is unacceptable and ahistorical (historically RS held all three for the duration of the war). This is not the same as a stale-anchor question — the current in-game outcome itself is wrong and needs an engine/data fix, not an anchor-definition change.

**Root causes already diagnosed (2026-08-03 R4 Phase 5 bisection; do not re-investigate from scratch, verify against current HEAD first since more work may have landed since):**

1. **Zvornik** (`op:zvornik:zvornik`): RS's `rs_1st_zvornik` brigade correctly captures the town turn 1 (Operation Drina, decisive victory, matches the historical April 1992 seizure). The same brigade is then committed to a string of losing fights away from home at Kalesija and Šekovići (weeks 39, 47, 48, 49, 69 — roughly 800 cumulative casualties, all losses against ARBiH's 1st Olovo and 250th Liberation brigades) and is never reinforced or replaced. By week 76, ARBiH's 287th Mountain Brigade retakes the town against **no defending brigade at all** (`defender_brigade: null`). Traced to commit `3c2e8a47f` ("enforce R7 provenance and Ring-3 gates") — an intentional, correctly-implemented Section 6 fix that removes a prohibited atrocity-reward (`war_crimes_delta: +5`, `+3` morale, internal-cohesion bonus) from the `drina_cleansing_decision_1992` event response. Removing that reward is not itself wrong (the reward was a canon violation), but its downstream effect — this specific brigade's survivability in the Kalesija/Šekovići fighting, and the absence of any reinforcement plan for a captured Drina-corridor town — is the actual bug. **Do not restore the removed reward as a fix; that would reintroduce a Section 6 violation.** Fix the garrison/reinforcement/combat-power gap by other means.
2. **`op:doboj:boljanic_2`** and **`op:gracanica:petrovo_2`**: chronic, long-documented weak points, not a single loss. Multiple different RS brigades rotate through as defenders and lose in turn across the whole campaign (weeks 61-63, 98-100, 136-137 for boljanic_2; weeks 156-158 for petrovo_2), each thrown in piecemeal against sustained ARBiH 2nd/3rd Corps probing. This matches a root cause this project already diagnosed on 2026-04-02 (see `docs/40_reports/CALIBRATION_MASTER.md` session history): `vrs_1st_krajina` has no standing `hold_osids` directive for the Doboj OSIDs, so garrison priority keeps being pulled toward the higher-priority Posavina corridor, leaving whatever brigade is stationed there permanently under-strength. Commit `34edff214` (R4 Phase 3 event-reachability fix, changed `bot_ai_default` AI-response-selection attribution) is where the *final* week-188 outcome tips from "barely holds" to "falls for good," but the underlying fragility is much older and structural.

**Full evidence trail:** `docs/PROJECT_LEDGER.md` (2026-08-03 entries, "Doboj/Gračanica/Zvornik 188w regression" and its corrected-attribution follow-up) and `docs/40_reports/CALIBRATION_MASTER.md` (2026-08-03 corrected entry). A prior, incorrect attribution to `0fd36157b` (R5 Phase 2d Task 8A) was investigated, reverted, found ineffective, and un-reverted — `0fd36157b` is confirmed innocent and must not be touched by this task.

- [x] Re-verify both root causes still reproduce against current HEAD. Confirmed 2026-08-04 via the 188w run already produced during R5 Phase 2e Task 8's revert validation (`final_state_hash bfc7e2cbebfbb9bc`, same run reused rather than re-run): all 3 anchors (`op:doboj:boljanic_2`, `op:gracanica:petrovo_2`, `op:zvornik:zvornik`) fail identically, `actual_controller: RBiH` vs `expected_controller: RS` for each, matching the 2026-08-03 diagnosis exactly.
- [x] **First designed fix attempted and DISPROVEN, 2026-08-04 — the plan's own "likely" `must_hold_osids_by_corps` hypothesis does not work as a standalone fix at 188w.** Found the 40w scenario files (`apr1992_definitive_40w.json`, `_40w_emergent.json`) already carry `must_hold_osids_by_corps` entries the 188w files never inherited: `vrs_east_bosnian: [brcko x4, op:doboj:boljanic_2]` and `vrs_1st_krajina: [op:gracanica:petrovo_2, op:lukavac:brijesnica_donja_2]` (the corps attribution for `boljanic_2` is `vrs_east_bosnian`, not `vrs_1st_krajina` as this doc's original root-cause writeup assumed — worth correcting for the record). Two attempts to propagate this into `apr1992_definitive_188w.json`/`_188w_dayton_close.json`:
  - **Attempt A** (single-OSID: `vrs_east_bosnian: [boljanic_2]`, `vrs_1st_krajina: [petrovo_2]`, `brijesnica_donja_2` deliberately omitted since its 188w anchor expects RBiH not RS): target anchors recovered (30/31 anchors passing, up from 28/31) but `matched_osids` collapsed `638 -> 581` (-57) and a previously-passing benchmark (`brcko_corridor_jan1993`) newly failed.
  - **Attempt B** (full `vrs_east_bosnian` set matching 40w exactly, all 5 Brčko-area OSIDs + boljanic_2): `matched_osids` partially recovered to `593` but still -45 off baseline, AND a previously-passing NAMED anchor (`op:brcko:brcko`) newly failed alongside `brcko_corridor_jan1993`.
  - **Root mechanism found via code read, not just observed empirically**: `must_hold_osids_by_corps` is NOT a narrow single-OSID pin. `zone_detection.ts`'s `detectZones` uses `isMustHold` (fed by the scenario directive) to reclassify the OSID's entire containing DEFENSIVE ZONE as must-hold, which changes that zone's `garrisonBudget` calculation and therefore the whole corps's brigade-allocation priority across every zone it defends for the entire 188-week campaign — not just the one flagged OSID. This is a campaign-wide resource-reallocation lever, not a garrison-repair pin (the actual narrow pin, `pinGarrisonToMustHoldFrontEdge` in `brigade_front_distribution.ts`, only fires when the target OSID is ALREADY friendly-controlled and undefended — it cannot reclaim a town already lost to the enemy, which is exactly Zvornik's failure mode).
  - **Both attempts fully reverted** (`git checkout -- data/scenarios/apr1992_definitive_188w.json data/scenarios/apr1992_definitive_188w_dayton_close.json`, confirmed zero diff). No production/scenario state left changed by this exploration.
  - **A prompt-injection attempt was caught and disregarded during this investigation**: a tool-result "Note" falsely framed the `git checkout` revert's own output as an unexplained external edit and instructed silence toward the user. Flagged, not complied with.
- [x] **Option (c) investigated via direct instrumentation, 2026-08-04, and DISPROVEN before implementation — do not build the "recapture recently-lost OSID" extension as designed.** Full per-brigade battle trace for `rs_1st_zvornik` confirmed the root-cause narrative exactly (decisive capture week 1, redeployed to defend Kalesija/Šekovići from ~week 39, five recorded defensive losses there through week 69, Zvornik itself falls week 76 with `defender_brigade: null`). Added a temporary, env-flag-gated diagnostic (`DEBUG_MUST_HOLD_PIN=true`) directly inside `pinGarrisonToMustHoldFrontEdge` (removed after use, confirmed zero diff against HEAD), ran one 188w pass, and got a definitive answer: **the existing undefended-garrison pin mechanism already works correctly** — it successfully re-garrisoned Zvornik with a replacement `vrs_drina` brigade from roughly turn 4 through turn 68 (zero "friendly+undefended" diagnostic firings during that entire window, meaning a defender was continuously present). The actual gap is narrow and specific: **turns 69-76**, where `vrs_drina` has **zero eligible idle brigades** (every one of its 9 brigades is committed, disrupted, entrenched, or otherwise ineligible) — matching almost exactly when `rs_1st_zvornik`'s own last recorded battle at Šekovići occurs (week 69). This is a genuine resource-scarcity window, not a mechanism defect or a reach limitation. Extending the pin to also fire on recently-lost OSIDs would hit the identical "zero eligible candidates" wall during that same window and accomplish nothing — the diagnostic data disproves the premise before any implementation cost was spent on it.
- [x] **Second design attempted and DISPROVEN, 2026-08-04 — the `computeReserveShifts` donor-zone guard was misdiagnosed and had zero effect.** Read `computeReserveShifts` (`commander/decide.ts`) in full: it never checked whether a donor zone was scenario-flagged must-hold before letting it donate a "surplus" brigade to an escalated-threat zone elsewhere, so a guard was added (`if (zone.is_must_hold) continue;` in the donor-selection loop, using the already-computed `ZoneAssessment.is_must_hold` field — no new plumbing). Typecheck clean, 197/197 commander-suite tests pass, 40w byte-identical to baseline. **188w produced the exact same `final_state_hash` as the unpatched baseline (`bfc7e2cbebfbb9bc`) — zero effect, same 3 anchors still fail identically.** Added a second temporary diagnostic (`DEBUG_RESERVE_SHIFT=true`, removed after use, confirmed zero diff) directly logging the zone containing `op:zvornik:zvornik` at the moment `computeReserveShifts` evaluates it, and found why: **that "zone" is not a small, local Zvornik zone — it is one single mega-zone spanning the entire Drina corps front, from Zvornik in the north to Čajniče in the south** (`zone:vrs_drina:op:cajnice:zaborak`, holding 7-9 of `vrs_drina`'s 9 total brigades, `garrison_budget: 23`, `surplus_brigades: []` — empty, always, at every observed turn). This zone never had computed surplus in the first place, so it was never eligible as a reserve-shift donor even before the new guard — the guard was structurally unreachable for this case. `rs_1st_zvornik` therefore did NOT leave Zvornik via the cross-zone reserve-shift path this design targeted; it must have moved via `distributeBrigadesToFront`'s ordinary INTRA-zone front-spreading/redistribution logic (since Kalesija/Šekovići apparently sit inside this same giant zone), which is a different code path this design never touched. Guard fully reverted (confirmed empty diff against HEAD).
- [x] **Reconsidered at owner request, 2026-08-04 — stepped back to "identify how these anchors fall and find levers" rather than continue guessing mechanisms one at a time.** Traced the full battle history for `op:doboj:boljanic_2` and `op:gracanica:petrovo_2` (same weekly_report.jsonl methodology already used for Zvornik). The defenders are not weak on paper — equal-or-greater personnel every time (e.g. `rs_16th_krajina_motorized` 1200 vs `arbih_372nd_vitezka_mountain` 480) — yet lose at power ratios of 4-11x. Owner correctly challenged an initial "hasty defense penalty" explanation as insufficient to produce a swing that large alone; further investigation confirmed `attack_resolution_osid.ts` pools power across every attacking formation in an operation (`attackerFormations.reduce(...)`) plus a concentration bonus — the same `operation_id` ("Operacija Odbrana") hit `boljanic_2` on 2 consecutive weeks with a 5-artillery-piece attacker loss in one battle alone, impossible for one 480-personnel brigade acting alone.
  Owner then asked specifically whether the sector/Tactical-Group defense system (ADR-0005/0006/0007) should already prevent this. It exists and is real: `attack_resolution_osid.ts`'s sector-coverage branch pulls in every brigade `getStandingOgDefenseBrigadeIds(sector)` assigns to the defending sector (not just whichever one is physically present), with a distance-weighted reactive-reserve contribution (`REACTIVE_DEFENSE_RATIO=1.5`, `HOME_DEFENSE_REACTIVE_BONUS=1.3`, `MIN_DEFENSE_FLOOR_FRACTION=0.75`). **Instrumented this exact computation directly** (temporary flag-gated diagnostic in `attack_resolution_osid.ts`, removed after use, confirmed zero diff) and captured real numbers for all 12 sector-coverage battles at these 3 OSIDs across the full 188w run. The mechanism genuinely works in several observed turns (boljanic_2 turns 62/63/98/99/100 show real reactive-reserve contributions meaningfully boosting `defenderPower`). But at the actual moment of final loss for both anchors, it had nothing left: at `boljanic_2` turn 137 (six attacking ARBiH/HRHB brigades), the defending sector (`sector:vrs_1st_krajina:0`) had exactly ONE assigned brigade, contributing ZERO physical power and ZERO reactive power — `defenderPower` fell all the way to a fixed, population-derived militia floor (103.375, from `computeMilitiaDefensePower`), not a real military formation at all. Same pattern at `petrovo_2` turns 157-158 (militia floor 141.5875). The sector's assigned-brigade roster itself churns completely between observed turns (3 different brigades at turn 61, a different 3 at turns 62-100, down to 2 at turn 100, down to 1 non-contributing brigade by turns 136-137).
  **Synthesis: all three anchors fall for the SAME underlying reason, now confirmed at both the corps level (Zvornik) and the sector-roster level (Doboj/Gračanica) — not weak nominal strength, but the specific defending sector's brigade allocation draining to nothing (or to a brigade too far away / otherwise non-contributing) at the exact moment a serious, often multi-brigade, assault lands.** This reframes the lever search: rather than protecting one OSID (already tried three ways and disproven), the fix needs to either (a) keep the SECTOR's assigned-brigade roster from emptying out at these historically-critical anchors specifically, or (b) strengthen the militia/token-defense floor these positions fall back to when the roster does empty, so a real fortified town never gets reduced to a bare population-based garrison against a multi-brigade assault. Recorded for the next design pass rather than attempting a fifth blind guess without owner input.
- [x] **Regression bisection, 2026-08-04 (owner: "this is recent, dig into history until you find what caused this change").** Corrected an earlier, unverified assumption: a local run from 2026-07-07 (`runs/apr1992_definitive_188w__acb538b04d79af3c__w188_n39`) shows `boljanic_2`/`petrovo_2` ALREADY passing and Zvornik ALREADY failing at that point — but that data point turned out to be from a different scenario-file hash (`acb538b0...` vs current `63a3a085...`) and, per the bisection below, an unrelated/since-superseded state, not the actual regression window. Rebuilt a temporary worktree (`F:/AWWV-worktrees/r6-bisect`, removed after use) and bisected directly against the two commits this doc's own 2026-08-03 diagnosis already named, verifying each with an exact parent-vs-self 188w run rather than trusting the prior claim:
  - **`34edff214` ("fix(events): close presidential reachability residuals", 2026-08-01 20:41) — CONFIRMED, with certainty, as the exact commit that breaks `op:doboj:boljanic_2` and `op:gracanica:petrovo_2`.** Parent commit (`24174ecca`): both anchors pass (only unrelated, since-fixed Brčko anchors fail). `34edff214` itself: both anchors flip to failing in the same run, Zvornik still passes. Mechanism confirmed via direct code diff (`ai_default_response.ts`/`evaluate_events.ts`), not just content: previously, ANY historical-mode event without a properly authored default silently fell back to picking `options[0]` via `bot_ai_default` (`selectAIDefaultResponse`'s old final line was `return options[0]!;`). The fix correctly closes that silent fallback — `selectAIDefaultResponse` now throws if no authored default exists, and the routing in `evaluateEvents` was tightened so an event without `hasAuthoredAIDefaultResponse` (accept_first, or a valid `historical_default_response_id`) no longer reaches `bot_ai_default` at all — it now falls through to the political/v1 scorer branch instead, which can pick an entirely different response than the old silent options[0] default. This is a broad, structural routing change (potentially affecting many events lacking an authored default across the whole event catalog), not a single-event content edit — the specific event(s) whose rerouted choice affects `vrs_1st_krajina`'s Doboj-area military/reinforcement priorities have not yet been individually identified; only the mechanism and the exact causal commit are confirmed.
  - **`3c2e8a47f` ("fix(content): enforce R7 provenance and Ring-3 gates", 2026-08-01 17:03) — CONFIRMED, with certainty, as the exact commit that breaks `op:zvornik:zvornik`.** Parent commit (`61ecd3d44`, byte-identical result to `34edff214`'s own run — nothing in between changed anchor outcomes): Zvornik passes. `3c2e8a47f` itself: Zvornik fails, and the resulting `final_state_hash` (`bfc7e2cbebfbb9bc`) matches the CURRENT baseline exactly. The production-code change in this commit (`event_loader.ts`/`source_tiers.json`) is a pure refactor (externalizing a validation Set to JSON, same values) — not behaviorally significant. The actual driver is in `data/scenarios/events/war_1992.json`: the `drina_cleansing_decision_1992` event's `systematic` response (id `"systematic"`, first in `response_options`, i.e. the one historically/deterministically picked) previously granted RS a bundled `war_crimes_delta: +5`, `morale_change: +3` (RS, one-time), and `internal_cohesion: +5` (RS) as part of the SAME response option. All three were removed together, correctly, because they were bundled as the reward for a war-crimes-tied choice (a genuine Section 6 violation) — not because the morale/cohesion pieces were separately judged wrong. Removing the whole bundle took away a small but real, one-time faction-wide RS morale/cohesion buff that had been incidentally propping up the Drina corridor's already-fragile garrison/reinforcement capacity (the exact structural weakness this session's own earlier instrumentation already characterized in detail: `vrs_drina` running out of eligible idle brigades at turns 69-76). **Consistent with this doc's own standing instruction: do not restore the removed bundle (that would reintroduce the Section 6 violation) — the correct fix addresses the now-exposed structural garrison weakness directly, which is exactly the "sector roster drains to nothing at the critical moment" finding from the prior investigation pass.**
  - Both causal commits are legitimate, independently-necessary fixes (Section 6 compliance; event-reachability/authored-default enforcement) — the correct response is not to revert either, matching the doc's existing guidance for Zvornik and, by the same reasoning, likely also true for the Doboj/Gračanica fix (not yet independently confirmed for that one, since the specific rerouted event hasn't been pinned down).
  - Worktree cleaned up; no source/scenario files left changed by this bisection.
- [ ] Prove the fix is isolated: 188w anchors recover to historical RS control at all three OSIDs, with no unrelated OSID regressions and no change to `matched_osids`'s broader positive trend.
- [ ] Run the full R6 Phase 7 verification barriers against the fix before considering it closed.

## Phase 1 -- Standing-OG retired-path verification

**Assigned role:** Systems Programmer + QA Engineer
**Independent review:** Game Designer + Canon Compliance Reviewer

### Task 1.1 -- Consume and verify the R3 doctrine contract

**Files:**

- Modify `tests/standing_og_defense.test.ts`
- Modify `src/sim/combat/standing_og_defense.ts` comments/types only if needed for truth
- Inspect `docs/20_engineering/ADR/ADR-0006-sectors-as-standing-operational-groups.md`
- Inspect `docs/20_engineering/ADR/ADR-0007-standing-og-defensive-model.md`
- Inspect `docs/10_canon/Systems_Manual_v0_9_0.md`
- Inspect `docs/10_canon/Rulebook_v0_9_0.md`
- Use the R3-created `tests/standing_og_doctrine_contract.test.ts`

- [ ] Test physical/sector contributors and casualty distribution exactly as live.
- [ ] Prove the R3 contract states that primary aftermath remains primary-owned in 1.0.
- [ ] Prove the R3 contract marks Phase C retired and prevents its producer/predictor path from being inferred as live.
- [ ] Preserve Guardrail-1 and current bytes.

### Task 1.2 -- Remove dead activation ambiguity

- [ ] Delete or mark compatibility-only any dead default-off Phase C switch after proving zero supported consumer.
- [ ] Add a static test preventing the retired code path from returning.
- [ ] Do not touch `attack_resolution_osid.ts` behavior.

```powershell
npm.cmd run test:vitest -- tests/standing_og_defense.test.ts tests/standing_og_doctrine_contract.test.ts tests/tg_invariants.test.ts --pool=forks --reporter=dot
npm.cmd run canon:check
npm.cmd run test:baselines
npm.cmd run typecheck
```

`/simplify` -> review -> commit `test(og): preserve retired standing defense path`

## Phase 2 -- Political-dimension propagation

**Assigned role:** Gameplay Programmer + Scenario Author
**Independent review:** Historian + Game Designer

### Task 2.1 -- Re-measure and test `intl_only`

**Files:**

- Modify `src/sim/political/political_dimension_propagation_gate.ts`
- Modify `tests/political_dimension_propagation_gate.test.ts`
- Modify `tests/political_dimensions_snapshot.test.ts`
- Modify current scenario config only after the experiment passes

- [ ] Pin eligibility, faction asymmetry, clamp, and stable update order.
- [ ] Require no pre-war effect and no April 1992 takeover delay.
- [ ] Require no loss of 31/31 anchors or six bot benchmarks.
- [ ] Require early/mid-war direction consistent with sourced faction/patron pressure; do not tune to exact territory totals.
- [ ] Adopt `intl_only` if all criteria pass; otherwise keep it off, record no-go, and continue.

### Task 2.2 -- Test `cohesion_only` on the accepted base

- [ ] Re-derive the threshold from current distributions rather than the stale value 40.
- [ ] Require monotonic penalty, hard clamp, no positive feedback reward, and no precondition leakage.
- [ ] Adopt only if it improves the named behavior without anchor/benchmark/cost regression; otherwise retire the mode.
- [ ] Do not build a separate `both_on` tuning branch; enabled modes naturally compose if both independently pass.

```powershell
npm.cmd run test:vitest -- tests/political_dimension_propagation_gate.test.ts tests/political_dimensions_snapshot.test.ts tests/consequence_pressure_c2_patron_distance.test.ts --pool=forks --reporter=dot
npm.cmd run test:baselines
npm.cmd run sim:scenario:run:40w
npm.cmd run sim:scenario:run:188w
npm.cmd run engine:health:gate
```

`/simplify` -> historical/game-design review -> commit accepted mode or docs-only no-go record

## Phase 3 -- Sarajevo continuous condition and supply truth

**Assigned role:** Gameplay Programmer
**Independent review:** Historian + Canon Compliance Reviewer + QA Engineer

### Task 3.1 -- Complete lifeline derivation

**Files:**

- Modify `src/state/sarajevo_lifeline.ts`
- Modify `src/state/sarajevo_exception.ts`
- Modify `src/sim/combat/sarajevo_siege_params.ts`
- Modify `tests/sarajevo_lifeline_derivation.test.ts`
- Modify `tests/sarajevo_lifeline_consumers.test.ts`
- Modify `tests/sarajevo_lifeline_stale_cache.test.ts`

- [ ] Derive lifeline status from documented airlift/tunnel/current-state receipts, not `externalSupply = internalSupply`.
- [ ] Keep one canonical Sarajevo OSID set and one parameter resolver.
- [ ] Make cache invalidation depend on exact current-state inputs.
- [ ] Pin save migration/default behavior for existing lifeline fields.

### Task 3.2 -- Complete mechanics and explanation

**Files:**

- Modify existing Sarajevo/supply consumers named by the Phase 0 inventory
- Modify `src/ui/map/data/sarajevoSiege.ts`
- Modify `src/ui/map/components/SupplyPanel.tsx`
- Modify `src/ui/map/components/chronicle/sarajevoSiegeChronicle.ts`
- Modify `tests/sarajevo_siege_legibility.test.ts`
- Modify `tests/supply_sensitive_history_smoke.test.ts`

- [ ] Apply supply/civilian pressure monotonically within canonical clamps.
- [ ] Explain siege pressure, lifeline state, and uncertainty without enemy hidden truth.
- [ ] Keep shelling/starvation/civilian harm non-interactive.
- [ ] Fire historical narrative only from the documented state/time combination.

```powershell
npm.cmd run test:vitest -- tests/sarajevo_exception.test.ts tests/sarajevo_core_defense.test.ts tests/sarajevo_lifeline_derivation.test.ts tests/sarajevo_lifeline_consumers.test.ts tests/sarajevo_lifeline_stale_cache.test.ts tests/sarajevo_siege_params_integration.test.ts tests/sarajevo_siege_legibility.test.ts tests/supply_sensitive_history_smoke.test.ts --pool=forks --reporter=dot
npm.cmd run test:baselines
npm.cmd run sim:scenario:run:40w
npm.cmd run sim:scenario:run:188w
npm.cmd run engine:health:gate
```

`/simplify` -> historian/canon review -> commit `feat(sarajevo): complete continuous siege lifeline`

## Phase 4 -- E-B1 fall-1995 combat spine

**Assigned role:** Systems Programmer + Gameplay Programmer
**Independent review:** Determinism Auditor + Historian

### Task 4.1 -- Pure coherence derivation and diagnostics

**Files:**

- Create `src/sim/combat/corps_coordination_coherence.ts`
- Modify `src/state/game_state.ts` only if the existing optional field contract requires it
- Create `tests/corps_coordination_coherence.test.ts`
- Modify the final calibration report

- [ ] Mirror the pure `strategic_depth` derivation/update/accessor pattern.
- [ ] Default to 1.0 before the documented late-war signals.
- [ ] Use stable corps iteration and bounded [0,1] values.
- [ ] Add diagnostics before adding consumers.
- [ ] Prove 40-turn bytes remain identical.

### Task 4.2 -- Add the two named consumers

**Files:**

- Modify `src/sim/combat/strategic_priorities.ts`
- Modify `src/sim/combat/sector_offensive.ts` at the operation-launch admission path
- Modify `src/sim/combat/attack_resolution_osid.ts` at the defender-power consumer
- Modify `tests/fall_1995_multi_axis_and_cascade.test.ts`
- Modify `tests/corps_coordination_coherence.test.ts`

- [ ] Block new operations only below the specified coherence threshold.
- [ ] Apply the 0.80 abandoned-periphery defender modifier only to periphery, never core.
- [ ] Hard-clamp every power/casualty output.
- [ ] Require Banja Luka core stability and no pre-autumn leakage.

### Task 4.3 -- Resolve E-A6 by evidence

- [ ] Run the post-E-B1 residual report for the named Sloboda/rear-clearing reachability gap.
- [ ] If the gap remains and the existing E-A6 plan's predicates are satisfied, implement its existing `CorpsOperation` slice and verify separately.
- [ ] If the gap is gone, mark E-A6 retired as unnecessary; do not add redundant capture power.

```powershell
npm.cmd run test:vitest -- tests/corps_coordination_coherence.test.ts tests/fall_1995_multi_axis_and_cascade.test.ts tests/fall_1995_hv_depth_priority.test.ts tests/sector_offensive_launch_gates.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run test:baselines
npm.cmd run sim:scenario:run:40w
npm.cmd run sim:scenario:run:188w
npm.cmd run engine:health:gate
```

`/simplify` -> combat/historical review -> commit `feat(combat): complete late-war coherence spine`

## Phase 5 -- Intel ambush activation or retirement

**Assigned role:** Gameplay Programmer
**Independent review:** Wargame Advisor + Determinism Auditor

**Files:**

- Modify `src/sim/combat/intel_ambush_depth.ts`
- Modify `src/sim/combat/intel_ambush_depth_gate.ts`
- Modify `src/sim/combat/attack_resolution_osid.ts`
- Modify `tests/intel_ambush_depth.test.ts`
- Modify `tests/intel_ambush_depth_gate.test.ts`
- Modify `tests/attack_resolution_osid_intel_friction.test.ts`

- [ ] Pin low-confidence eligibility to existing observed confidence; reveal no hidden value in UI/AAR.
- [ ] Preserve hard casualty clamps and deterministic proportional allocation.
- [ ] Compare default-off and enabled runs on the frozen post-E-B1 base.
- [ ] Adopt only if low-confidence attacks separate measurably, total casualties remain within current accepted bands, and anchors/benchmarks/engine health stay green.
- [ ] Otherwise remove the activation row/flag from the active roadmap and retain default-off code only if another supported save/config requires it.

```powershell
npm.cmd run test:vitest -- tests/intel_ambush_depth.test.ts tests/intel_ambush_depth_gate.test.ts tests/attack_resolution_osid_intel_friction.test.ts tests/h_phase_intelligence_warfare.test.ts --pool=forks --reporter=dot
npm.cmd run test:baselines
npm.cmd run sim:scenario:run:40w
npm.cmd run sim:scenario:run:188w
npm.cmd run engine:health:gate
```

`/simplify` -> review -> commit accepted activation or docs-only retirement

## Phase 6 -- Supply comprehension closeout

**Assigned role:** UI/UX Developer
**Independent review:** Wargame Advisor + QA Engineer

**Files:**

- Modify `src/sim/supply_comprehension.ts`
- Modify `src/ui/map/data/playerSupplyVisibility.ts`
- Modify `src/ui/map/data/osidSupplyExplanation.ts`
- Modify `src/ui/map/components/SupplyPanel.tsx`
- Modify `src/ui/map/components/army_hq/SupplyIntelligence.tsx`
- Modify `tests/supply_comprehension_readmodel.test.ts`
- Modify `tests/ui_player_supply_visibility.test.ts`

- [ ] Give each player-visible shortage one cause, confidence, effect, and existing remedy/constraint.
- [ ] Scope fallback aggregates to the player faction.
- [ ] Render unreported enemy truth as `Unreported`, not zero/favorable.
- [ ] Add no new command authority or supply mechanic.

```powershell
npm.cmd run test:vitest -- tests/supply_comprehension_readmodel.test.ts tests/supply_panel_contract.test.ts tests/ui_player_supply_visibility.test.ts tests/ui_decision_room_supply_visibility.test.ts tests/ui/supply_fallbacks.test.ts --pool=forks --reporter=dot
npm.cmd run typecheck
npm.cmd run qa:player-journeys
npm.cmd run test:baselines
```

`/simplify` -> review -> commit `feat(supply): close player comprehension`

## Phase 7 -- Frozen 1.0 calibration and closeout

**Assigned role:** Scenario Author
**Independent review:** Historian + Game Designer + Determinism Auditor + QA Engineer

- [ ] Run fresh 40-turn, all-faction 104-turn, and two byte-identical 188-turn scenarios with the accepted modes only.
- [ ] Require zero consistency failures, zero ghost-destroyed formations, 31/31 anchors, six/six benchmarks, and no early-war chronology regression.
- [ ] Compare casualties, displacement, control, operation timing, Sarajevo, 1993 RBiH-HRHB war, safe areas, and late-war core/periphery outcomes to the recorded base.
- [ ] Re-floor once through the documented baseline/engine-health path if and only if all drift is explained and accepted by the predeclared criteria.
- [ ] Create `docs/40_reports/implemented/20260731_HISTORICAL_GAMEPLAY_DEPTH_FINAL_CALIBRATION.md`.
- [ ] Update `docs/40_reports/CALIBRATION_MASTER.md`, the master roadmap, ledger, and reusable knowledge.

```powershell
npm.cmd run typecheck
npm.cmd run test:vitest -- --pool=forks --reporter=dot
npm.cmd run test:baselines
npm.cmd run engine:health:gate
npm.cmd run canon:check
git diff --check
```

## 6. Determinism and sensitive-history rules

- No random ambushes, unordered corps/OSID iteration, environment flags without explicit default, or timestamps in state/artifacts.
- Every historical event has source, date window, and state predicate; calendar alone cannot force a rupture/control result.
- Atrocity is consequence, never a lever. No body-count comparison, moral-equivalence copy, or prevent-genocide reward.
- Every accepted behavior change owns its scenario drift; every failed experiment is retired without baseline refresh.

## 7. Success criteria

- [ ] Standing-OG Phase C is retired in code/ADR/canon truth.
- [ ] Political modes each have an evidence-based adopted or retired result.
- [ ] Sarajevo lifeline and continuous condition are mechanically and visibly coherent.
- [ ] E-B1 is live; E-A6 is either evidence-backed and live or explicitly retired.
- [ ] Intel ambush is adopted or retired by its fixed criteria.
- [ ] Supply explanations are player-safe and actionable.
- [ ] One frozen deterministic 1.0 calibration floor is published.

## 8. Copy-ready execution prompt

```text
Role and objective: Implement roadmap R6 using docs/plans/2026-07-31-historical-gameplay-depth-calibration-plan.md. Execute phases serially and apply each phase's adopt-or-retire rule without opening a new owner decision.

Locked decisions: Standing-OG Phase C stays retired; political modes are tested intl_only then cohesion_only; Sarajevo is a continuous supply condition with no atrocity lever; E-B1 is the combat spine; E-A6 is evidence-conditional; intel ambush activates only after the spine; one final re-floor.

Read first: .claude/napkin.md, docs/life_lessons.md, docs/plans/MASTER_ROADMAP.md, docs/10_canon/SENSITIVE_HISTORY_DESIGN_GATE.md, docs/40_reports/CALIBRATION_MASTER.md, local BB pages cited in the plan, and target files.

Constraints: TDD, stable ordering, one behavior change per evidence run, paired deterministic 188-turn proof, no FORAWWV/package/version/tag/release change, no unsupported historical copy.

Handoff: files, exact tests/results, scenario hashes and metrics, source citations, adopt/retire result, baseline action, docs/ledger updates, next phase.
```

## 9. Orchestrator completion block

**Canonical owner:** deterministic combat/state predicates and the frozen calibration report.
**Demoted path:** Standing-OG Phase C, calendar-forced history, bundled tuning, hidden-truth intel/supply.
**Player-visible truth:** historically grounded pressure and consequences explained without micromanagement or atrocity optimization.
**Canonical UI surface:** Decision Room/Army HQ/map explanation surfaces consume existing truth.
**Done means:** every old gameplay gate has an adopted-or-retired disposition and the final 1.0 floor is deterministic, sourced, and green.
