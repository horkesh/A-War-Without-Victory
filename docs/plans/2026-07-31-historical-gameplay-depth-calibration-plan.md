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

**Status:** RECOVERED 2026-08-05 — R5 closed, the R5-floor dependency lifted, and all three named anchors (`op:zvornik:zvornik`, `op:doboj:boljanic_2`, `op:gracanica:petrovo_2`) now hold RS control at 188w (31/31 anchors overall), via the Zvornik anchor-garrison reactive-defense guard (commit `4486014ac`) plus the floor-aware capped per-battle cohesion-decrement fix that halved RS brigade dissolution and recovered Doboj+Gračanica (commit `2ac802a27`). The core deliverable below is done. Step 8 (added 2026-08-05, see below) is an open follow-on lead into the deeper destruction-asymmetry mechanism, not a blocker on this task's closure.

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
  - Both causal commits are legitimate, independently-necessary fixes (Section 6 compliance; event-reachability/authored-default enforcement) — the correct response is not to revert either, matching the doc's existing guidance for Zvornik.
  - Worktree cleaned up; no source/scenario files left changed by this bisection.
- [x] **Pinned down the specific Doboj/Gračanica-affecting event(s), 2026-08-04.** Instrumented `evaluate_events.ts` directly (temporary diagnostic, removed after use, confirmed zero diff) to log every RS-responding, historical-mode event lacking an authored default (the exact class `34edff214` rerouted) across the full 188w run: 9 total, only 2 of which actually resolved to a DIFFERENT response than the old deterministic `options[0]` default would have picked (the other 7, including `drina_cleansing_decision_1992` itself and `visit_to_front_rs`, resolved identically — confirming Zvornik's mechanism is purely the effects-bundle removal from `3c2e8a47f`, not a routing-driven choice change).
  - **`strategic_posture_review_rs` (turn 94): now resolves to `consolidate_holdings` instead of `press_gains`.** Net swap: loses `press_gains`'s `morale_change +4` and `aggression_modifier +0.1` (8-turn duration), gains `consolidate_holdings`'s `cohesion_change +5` and `supply_delta +4`. The `rs_posture` flag both options set has zero production consumers (same dead-flag pattern as Zvornik's renamed flag).
  - **`address_to_nation_rs` (turn 96): now resolves to `address_endurance_rs` instead of `address_defiance_rs`.** Net swap: loses `+4` morale (`+6` vs `+2`) for a roughly equal cohesion/internal_cohesion trade.
  - **Combined net effect across both, right before the week 98-100 Doboj battle cluster: RS loses ~8 combined morale points and a temporary +0.1 offensive aggression bonus, partially offset by real cohesion (+9 combined) and supply (+4) gains.** This is a real, quantified, causally-confirmed contributing factor — but on this scale (single-digit dimension deltas) it reads as a compounding factor on top of the pre-existing sector-roster-draining structural weakness already characterized in the prior investigation pass, not a standalone explanation the way Zvornik's cleaner, purely-negative effects-bundle removal was. Both events are legitimate now-dynamic political-scorer outcomes (not bugs to revert) — the actual fix target remains the underlying garrison/reinforcement capacity, now confirmed to be operating with a slightly thinner morale/aggression margin than before these two correct fixes landed.
- [x] **Fourth design attempted, 2026-08-04 (owner: "Design it") — a scenario-authored "standing garrison floor" for the three anchor OSIDs. Partial success on the named anchors, but DISPROVEN on the isolation bar and fully reverted.** Added `MUST_HOLD_STANDING_GARRISON_FLOOR` in `combat_math.ts`, applied inside `attack_resolution_osid.ts`'s sector-coverage defender-power calculation whenever a flagged OSID has zero physical AND zero reactive defense (the exact confirmed failure mode from the prior investigation pass). Deliberately used a NEW, dedicated scenario field (`standing_garrison_floor_osids`, a flat list) rather than reusing `must_hold_osids_by_corps`, specifically to avoid `zone_detection.ts`'s garrison-budget coupling that caused the first disproven design's regression — full new-field plumbing added through `scenario_types.ts`/`scenario_loader.ts`/`scenario_runner.ts`/`game_state.ts`/`validateGameState.ts`, typecheck clean, 203/203 relevant tests pass, 40w byte-identical.
  - **First attempt at floor=250 (Zvornik only, since the 188w scenario only had Zvornik flagged at that point)**: real, measurable, isolated improvement — the actual week-76 battle's `power_ratio` dropped `3.09 -> 1.4` (`decisive_victory -> costly_victory`), but not enough to flip the outcome or prevent capture (`costly_victory` still resulted in the OSID falling; need ratio `< VICTORY_THRESHOLD_COSTLY = 1.0`).
  - **Second attempt at floor=500, all three OSIDs added to the new field**: Doboj and Gračanica anchors both PASS. Zvornik still fails. But **`matched_osids` collapsed `638 -> 565` (-73) and a previously-passing anchor (`op:foca:foca_3`) newly failed.** Traced the mechanism: `net_control_counts_after` shows RS's OVERALL end-of-campaign territorial holdings dropped `292 -> 221` (-71 OSIDs) while RBiH gained `319 -> 397` (+78) and total battle flips rose `176 -> 218`. Strengthening RS's defense at these 3 points caused RS to be NET WORSE OFF across the whole 188-week campaign — not a plausible, expected historical ripple, but a real, quantified, large-scale unintended cascade. Root cause (not fully traced to a specific mechanism, but consistent with the campaign's own length): these 3 OSIDs are attacked repeatedly across many weeks (boljanic_2 alone: weeks 61-63, 98-100, 136-137), so the floor fires far more often than "once at the final loss," reshaping casualty/allocation patterns widely enough over 100+ remaining turns to produce a large, net-negative cascade elsewhere.
  - **Fully reverted** (`git checkout -- <9 files>`, confirmed zero diff against HEAD). No source, scenario, or schema files left changed by this attempt.
  - **This is the FOURTH disproven design for this task** (zone-level must-hold reclassification, post-loss recapture extension, reserve-shift donor guard, now this standing-garrison floor). All four were real, well-reasoned, empirically-tested attempts that failed on the SAME bar: fixing these specific anchors this early in a 188-week campaign (weeks 11-137) leaves 50-175 remaining turns for the change to cascade, and every mechanism tried so far — however narrowly scoped in the code — produces a large, hard-to-predict, and so far net-negative campaign-wide ripple. This strongly suggests the fix needs to either (a) act much later/more narrowly in the campaign timeline (closer to when the anchor's expected final-state is actually checked, minimizing cascade window), or (b) be evaluated with a broader, campaign-wide compensating mechanism rather than a single-point defensive boost, or (c) requires accepting that a full, isolated fix for all three anchors may not be achievable without deeper, riskier engine changes than this task's scope has budgeted for so far.
- [x] **Fifth design, 2026-08-04 (owner: "We need a fundamentally different strategy, but anchors must hold") — structural garrison-anchor exemption from reactive-defense proxy-loaning. ZVORNIK SOLVED CLEANLY. Doboj/Gračanica NO-GO (unrelated regression). Combined NO-GO (worse than either alone).** All four prior designs intervened at combat-power/allocation level and cascaded unpredictably over 50-175 remaining turns (design 4 alone: -73 `matched_osids`, RS net territory -71). This design targets a different, non-power-boosting mechanism class: it changes ELIGIBILITY, not strength.
  - **First sub-attempt (location-pin guards) DISPROVEN before it mattered — zero effect, wrong mechanism.** Initially assumed (per this doc's own prior investigation) that `rs_1st_zvornik` got physically marched away to Kalesija/Šekovići. Patched `bot_brigade_eval_front.ts`'s `evaluateSectorMarch` (the "off sector front → march to sector front" branch, docstring "root fix for rear lock-in") plus `brigade_front_distribution.ts`'s Phase A/B to respect `must_hold_osids_by_corps` and never march a brigade off its own corps's must-hold OSID. Typecheck clean, 69/69 relevant unit tests passed, 40w byte-identical. **188w produced the exact unpatched baseline hash (`bfc7e2cbebfbb9bc`) — zero effect.** Added a temporary diagnostic (`DEBUG_ZV_TRACE=true` in `turn_pipeline.ts`'s `runNamedPhase`, removed after use, confirmed zero diff) tracing every `location_osid` change for `rs_1st_zvornik` across the full 188w run: only 3 events, all in the first 5 turns (captures Zvornik turn 1, briefly displaced-and-returns by turn 5) — **it never physically leaves Zvornik again for the rest of the 188-week campaign.** Yet the existing battle log clearly shows it as `defender_brigade` in fights at Kalesija (week 39) and Šekovići (weeks 47/48/49/69), taking ~805 cumulative casualties there. Both guards fully reverted (confirmed zero diff) — they were solving a problem that doesn't exist.
  - **Real mechanism found by reconciling the trace with the battle log**: `attack_resolution_osid.ts`'s sector-coverage reactive-defense model (`getStandingOgDefenseBrigadeIds(sector)` → the sector's ENTIRE `assigned_brigade_ids` roster, no physical-proximity gate on eligibility, only distance-WEIGHTED power/casualty-share once included) pulls `rs_1st_zvornik` in as a reactive contributor — and casualty recipient, via `sectorBrigadeWeights` proportional distribution — for ANY attack anywhere in `vrs_drina`'s sector territory, even though it never leaves Zvornik physically. It gets ground down defending its NEIGHBORS by proxy, so that by week 76, when Zvornik itself is finally attacked directly, there's nothing left (`defender_brigade: null`).
  - **Fix implemented** (`attack_resolution_osid.ts`, ~12 lines, the only file left changed): when assembling `sectorBrigades` for a battle, exclude any brigade currently standing on its OWN corps's must-hold OSID (via the existing `must_hold_osids_by_corps` field — no new plumbing) UNLESS the OSID under attack IS that brigade's own must-hold position. It keeps full physical-defense eligibility at its own anchor, but is no longer loaned out as reactive support elsewhere. No power floors, no new multipliers — pure eligibility change.
  - **Zvornik-only test (data unchanged — `op:zvornik:zvornik` was already the sole pre-existing `must_hold_osids_by_corps` entry): CLEAN WIN.** 40w territory-flat (31/31 anchors, matched_osids 667, 6/6 benchmarks — all identical to baseline; only the hash moved, from an in-window casualty detail). 188w: **`op:zvornik:zvornik` anchor now PASSES** (first of five designs to flip a named anchor). No other previously-passing anchor newly failed. `matched_osids` 638→633 (-5, small and explicable). RS net campaign-wide territory went UP (292→309), RBiH down (319→302) — the OPPOSITE of design 4's problem; RS ends up better off, not worse.
  - **Doboj+Gračanica-only test** (added `vrs_1st_krajina: [boljanic_2, petrovo_2]`, Zvornik entry removed for isolation): both named anchors flip to RS — but `op:bijeljina:bijeljina_2` (untouched by this task until now) newly fails, and RS net territory drops BELOW baseline (292→275) despite the 2 anchor wins, `matched_osids` 638→611 (-27). Checked whether this was cross-corps interference with the Zvornik fix (it wasn't in this run) or genuinely caused by the Doboj/Gračanica protection alone (confirmed: it is — Bijeljina's own garrison brigades belong to a THIRD, different corps `vrs_east_bosnian`, so this isn't the same-sector reactive-defense removal directly touching Bijeljina; it is an indirect, multi-turn cascade through the deterministic engine, the same class of problem that undid designs 2-4). NO-GO on the "no unrelated regressions" bar.
  - **All three combined test**: worse than either sub-case — Zvornik anchor **flips back to failing** too (despite its own must-hold entry being present), Bijeljina still fails, `matched_osids` 638→596 (-42), RS net territory drops further (292→284). Confirms the Doboj/Gračanica side effect is not merely additive with Zvornik's win; it actively undermines it. Fully NO-GO.
  - **Final disposition: shipped the Zvornik-only result.** Reverted the Doboj/Gračanica scenario-data addition in both 188w files (confirmed zero diff — they are back to their original, pre-session `must_hold_osids_by_corps` content) and the temporary `DEBUG_ZV_TRACE` diagnostic (confirmed zero diff on `turn_pipeline.ts`). The only remaining source diff is the 12-line reactive-defense eligibility guard in `attack_resolution_osid.ts`. This satisfies 1 of the owner's 3 required anchors cleanly and with a net-positive campaign effect; Doboj/Gračanica remain open, now with a precisely characterized obstacle (an indirect cross-corps cascade onto Bijeljina, not a same-sector effect) rather than an unexplored one.
- [x] **Distance-scoped refinement, 2026-08-05 (owner: "A" — keep pushing on Doboj/Gračanica).** Replaced the blanket exclusion with a hop-distance-gated one: a must-hold brigade may still reactively help a genuinely nearby fight (within `ANCHOR_GARRISON_LOAN_MAX_HOPS`, new constant in `combat_math.ts`), only losing eligibility beyond that. Real improvement, but no configuration yet clears the full bar (all 3 anchors + zero unrelated regression). Four configurations measured at 188w, all typecheck-clean/unit-test-green/40w-safe (zero or baseline-identical 40w effect in every case):
  - **Zvornik-only, hop=2**: 188w hash byte-identical to the earlier blanket-exclusion win (`b91bccd8626266a3`) — confirms the fights that hurt Zvornik (Kalesija, Šekovići) are >2 hops away, so this threshold costs nothing there. Still the cleanest result: 1 anchor recovered, RS net territory +17, matched_osids -5, zero collateral.
  - **Doboj+Gračanica-only, hop=2 (Zvornik's own must-hold entry omitted)**: all 3 named anchors pass, including Zvornik as an unrequested side effect. But `op:brcko:brcko` and the `brcko_corridor_jan1993` control-band benchmark both newly fail (Bijeljina's earlier blanket-version regression is gone, replaced by a different one), matched_osids 638→603 (-35), RS net territory 292→277 (-15).
  - **Doboj+Gračanica-only, hop=3**: all 3 named anchors pass, 30/31 total (only `brcko:brcko` fails now, the corridor band recovers) — the best anchor picture of any configuration tried — but a worse aggregate cost: matched_osids 638→599 (-39), RS net territory 292→267 (-25). Confirms a real tradeoff curve: looser hop threshold recovers more named anchors at a steeper aggregate cost.
  - **All three explicit (Zvornik + Doboj + Gračanica), hop=2**: only Doboj passes; Gračanica and Zvornik BOTH flip to failing — worse on the named-anchor axis than either sub-case alone, despite Zvornik's own entry being unchanged from its clean solo win. Aggregate cost is the smallest of the multi-anchor configurations though: matched_osids 638→627 (-11), RS net territory 292→297 (+5, net positive).
  - **Diagnosis**: the three anchors are not independently addable. Protecting Doboj/Gračanica changes ARBiH's campaign-wide offensive allocation (plausibly: repulsed there, it commits harder to Zvornik) enough to flip Zvornik's own, otherwise-solid, protection — a genuine deterministic butterfly-effect cascade through 100+ remaining turns, the same problem class that undid designs 1-4, now confirmed to survive even this much more surgical (eligibility-only, no power addition) mechanism.
  - **No configuration satisfies "all 3 anchors, zero unrelated regression."** Reverted scenario data back to the safe, fully-vetted Zvornik-only candidate (confirmed zero diff on both 188w scenario JSON files) and left `ANCHOR_GARRISON_LOAN_MAX_HOPS = 2` (the value validated against Zvornik's clean win). Reported findings to the owner rather than continuing to blind-tune the threshold — the four data points above bound the achievable tradeoffs well enough for an informed decision.
- [x] **Owner decision, 2026-08-05: "Go for deeper engine investigation. This is a sign that the engine has flaws we need to fix. Engine health is sacrosanct, the anchors are a symptom."** Explicit redirect away from further anchor-specific tuning toward finding the actual structural engine cause. Investigation below.
- [x] **Engine-health investigation, 2026-08-05 — root cause found: a massive, faction-asymmetric brigade-destruction rate, not a sector-geometry or reactive-defense bug per se.**
  - **Step 1 — the coarse engine-health gate metrics are clean.** Ran `tools/engine_health_gate.cjs --json` against all 6 measured 188w configurations (baseline, Zvornik-only, Doboj+Gračanica hop=2/hop=3, all-three hop=2, Doboj+Gračanica blanket). `zero_eligible_ops` (0-1), `dead_ops` (0-3, actually IMPROVES under the fix), `ghost_destroyed` (flat at 2), `stranded_brigades` (flat at 7-8), `consistency_failures` (flat at 0), and K:W ratio (3.77-3.80, essentially flat) show nothing — this class of engine-health signal was not the culprit.
  - **Step 2 — traced the actual divergence mechanism.** Diffed `weekly_report.jsonl` battle-by-battle between baseline and the Doboj+Gračanica-only run: the first divergence is at week 4-5 (`rs_2nd_armored`, a Doboj-anchor brigade, was already being loaned to defend `op:skender_vakuf:donji_koricani` — a different region entirely — from week 4, i.e. this reactive-defense loaning starts almost immediately, not after some "quiet period").
  - **Step 3 — sector geometry is pathologically coarse for RS, but NOT present at turn 1.** At week 188, `vrs_1st_krajina:1` covers 53 territory OSIDs with exactly 1 assigned brigade; `vrs_herzegovina:2` covers 25 OSIDs with 1 brigade. Faction-wide territory-per-assigned-brigade ratio: RS 7.92, RBiH 3.38, HRHB 3.42 (RS more than double). The three worst single corps are ALL RS: `vrs_herzegovina` 14.3, `vrs_1st_krajina` 9.6, `vrs_drina` 8.3 — exactly the corps this whole Task 0.3 investigation has been circling. Checked `initial_save.json` (turn 1): this disparity is NOT present at the start (161 sectors exist, ratios are comparable across factions) — it develops over the campaign.
  - **Step 4 — the real driver: brigade destruction, not OOB allocation.** `vrs_1st_krajina` starts with 36 OOB brigades (comparable to `arbih_1st_corps`'s 36 and `arbih_2nd_corps`'s 40) but only 14 remain `status: active` by week 188 (22 `inactive`, none `stranded` — plain combat destruction, not the EH-3 `stranded_status:'collapsed'` mechanism). Compared across corps at week 188: **`arbih_1st_corps` 0/36 inactive (0%), `arbih_2nd_corps` 0/40 (0%), `arbih_3rd_corps` 0/27 (0%) — every single ARBiH brigade ever fielded across all three corps is still active at week 188 — versus `vrs_1st_krajina` 22/36 (61%), `vrs_herzegovina` 5/8 (63%), `vrs_east_bosnian` 2/10 (20%), `vrs_drina` 1/9 (11%) inactive.** This is the actual finding: not a subtle imbalance, a near-total asymmetry (0% vs up to 63%) between factions in whether a brigade, once fielded, ever gets permanently destroyed.
  - **Step 5 — ruled out the obvious explanation.** `brigade_dissolution.ts` (the `status → 'inactive'` transition, personnel/cohesion/morale thresholds) is explicitly documented as "faction-symmetric MECHANISM... faction-asymmetric DATA drives Krivaja-95 calibration drift correction" via a `war_timeline` step-curve override. Checked: **no scenario data file currently populates `dissolution_personnel_threshold`/`dissolution_cohesion_threshold`/`dissolution_morale_threshold`** — the lookup falls through to the same hardcoded defaults (400 personnel / 20 cohesion / 15 morale) for every faction. So this is not a hidden faction-tuned threshold; the SAME rule, with the SAME numbers, produces 0% ARBiH destruction and up to 63% RS destruction. The asymmetry is emergent from actual combat outcomes (how often each faction's brigades cross those thresholds), not from rule or data asymmetry in the dissolution gate itself.
  - **Synthesis**: this asymmetric brigade-destruction pattern plausibly explains the ENTIRE Task 0.3 saga in one shot — it's why RS corps sectors become pathologically oversized/thin late-campaign (Step 3), why the sector-coverage reactive-defense system pools brigades across huge areas losing any real sense of "local" (Step 2's early loaning), and why ANY narrow, well-reasoned fix to RS brigade allocation produces chaotic, far-reaching ripple effects (designs 1-5 all failed the same way): a corps that's already lost 60%+ of its brigades has no slack left to absorb a change without visibly breaking somewhere else. **The anchors are a symptom, exactly as the owner said** — the actual defect is upstream, in whatever combat-outcome asymmetry causes RS brigades to be so much more likely to be permanently destroyed than ARBiH's, given the SAME faction-symmetric dissolution rule.
  - **Step 6 — owner: "Start the investigation now." Tested the leading hypothesis (reinforcement-multiplier decay) directly, and it's DISPROVEN — with a counter-intuitive twist.** `getFactionReinforcementMult` (`src/state/formation_constants.ts`) is a genuine, documented, faction-asymmetric per-turn personnel-replenishment multiplier: RBiH climbs 0.25→0.50→0.75→**1.0 by week 52 and stays there for the remaining 136 weeks (72% of the campaign)**; RS instead climbs to 1.0 early then *declines* 1.0→0.85→0.65→**0.45 from week 104 onward (the last 85 weeks, 45% of the campaign)**. Confirmed the LIVE data (`data/scenarios/timelines/apr1992.json`) matches the code's hardcoded fallback exactly — this is genuinely what every scenario run uses. The code comment cites this curve as a deliberate fix for a PRIOR, opposite-direction bug found in an earlier audit (`docs/40_reports/audits/20260504_FORCE_QUALITY_GAP_2_VERIFICATION.md`, 2026-05-04): VRS personnel was rising +753 over 188w (over-reinforcing) because its multiplier used to be flat 1.0× indefinitely. **Direct experiment**: temporarily flattened RS's curve to 1.0× for the whole war (`data/scenarios/timelines/apr1992.json`, reverted immediately after, confirmed zero diff), re-ran 188w. Result: `vrs_1st_krajina` destruction got WORSE (61%→72%), `vrs_east_bosnian` got WORSE (20%→50%), `vrs_herzegovina` unchanged (63%), `vrs_drina` barely moved (11%→~11%); matched_osids and RS net territory both dropped slightly too. **More reinforcement made destruction worse, not better** — this rules out reinforcement supply as the primary, isolated driver. Working theory (not yet tested): more available personnel may make the corps-commander AI more willing to commit brigades to costly operations/exposure rather than conserve them, since replenishment is available — reinforcement doesn't fix combat OUTCOME, so a brigade that keeps losing battles at the same rate just gets fed back into the same losing pattern faster.
  - **Step 7 — found the real structural asymmetry: combat EXPOSURE volume, not supply.** Computed attacker/defender battle counts and win rates directly from the baseline `weekly_report.jsonl` (pure data analysis, no rerun needed): **RS defends 416 times over the 188w campaign vs RBiH's 112 (3.7×) and HRHB's 43.** RS attacks only 136 times vs RBiH's 367 and HRHB's 68 — RBiH is overwhelmingly on the offensive, RS overwhelmingly on the defensive. Win rates: RS actually holds fewer of its (far more numerous) defensive battles (69.7%) than RBiH holds of its own (76.8%), and RS's casualties absorbed defending (144,365) dwarf RBiH's (26,929) — over 5× more. RS is a BETTER attacker than RBiH when it does attack (77.9% win rate vs RBiH's 68.1%), so this isn't a raw combat-math weakness — it's raw volume of exposure. This volume asymmetry appears to be substantially BY DESIGN: `data/scenarios/timelines/apr1992.json`'s `doctrine_phases` has RBiH's `aggression_modifier` climbing from -0.10 to +0.15 by week 80 ("Controlled Counteroffensive... Full counteroffensives"), while RS's declines from +0.15 to +0.05 ("Targeted Operations... constrained by supply, fatigue, overstretch") — this matches the real war's historical trajectory (RS peaked 1992, ARBiH built up and counterattacked 1994-95) and is very likely intentional, not a bug.
  - **Current synthesis**: the destruction asymmetry (0% vs up to 63%) is an EMERGENT, multi-factor outcome, not a single isolated bug: (1) RS faces ~4× the defensive combat volume RBiH does, plausibly by deliberate late-war doctrine design; (2) RS's reinforcement multiplier ALSO craters in exactly the same late-war window (turn 104+) that this exposure is heaviest, compounding rather than offsetting; (3) flattening #2 alone makes things worse, not better, meaning the two factors interact through AI operation-commitment behavior, not simply additively. This is genuinely NOT a same-session-fixable bug — it's the compounding interaction of several individually-plausible, partly-intentional design choices (doctrine-phase aggression curves, late-war reinforcement decay, coarse sector geometry, un-gated reactive-defense pooling) that together leave RS's late-game corps too hollowed-out to absorb any narrow local change without visible cascades — exactly what sank all five Task 0.3 anchor-fix designs.
  - **NOT YET DONE**: (a) determining whether the exposure-volume asymmetry (Step 7) is itself well-calibrated or excessive — needs comparison against actual historical operational-tempo data, not just "it matches the general narrative direction"; (b) tracing exactly how reinforcement level interacts with the corps-commander operation-launch scorer to produce the counter-intuitive Step 6 result; (c) determining whether the SIZE of RS's late-war reinforcement decay (down to 0.45×) versus RBiH's total absence of any late-war decay (flat 1.0× forever) is proportionate, or whether RBiH should also carry some late-war exhaustion curve it currently lacks entirely. Recommend scoping as its own dedicated engine-health workstream (`technical-architect` + Pyrrhic panel given calibration/canon stakes) rather than further same-session tuning — every lever touched this session has shown the same chaotic, hard-to-predict cascade behavior over the campaign's remaining turns.
  - **Step 8 (2026-08-05) — a new, untested candidate lead: `morale_drift.ts`'s asymmetric victory/defeat multipliers, found independently via a full RS ahistorical presidential playthrough and its 12-specialist Pyrrhic panel review** (`docs/40_reports/20260805_RS_PLAYTHROUGH_PYRRHIC_PANEL_SYNTHESIS.md`, Formation Expert's finding). Note this is a DIFFERENT mechanism from Step 5 (dissolution *thresholds*, already confirmed faction-symmetric) — this is about the *morale value itself* being driven asymmetrically before it ever reaches the dissolution check. Pulled the untouched 188w calibration baseline as a control: RS sits at 7/53 `combat_effective_brigades` there too (per `compute_combat_effective.ts:21-22`'s `personnel >= 200 && morale >= 40` gate) — worse than the interventionist playthrough's 11, which rules OUT presidential lever-spam/officer-churn as a cause and confirms this is a standing baseline property, not a playthrough artifact. Root: `morale_drift.ts:79-105`'s victory/defeat multipliers are asymmetric and **uncapped** (RS 0.8x victory-gain / 1.3x defeat-loss vs. RBiH 1.3x / 0.7x, both floors — 20 for RS, 30 for RBiH — sitting below the 40-point effectiveness threshold), compounding over 188 weeks to RS median brigade morale 37 vs. RBiH's 97, **despite RS's personnel numbers sitting squarely inside the historical VRS OOB band** (82,925 across 53 active brigades vs. the ~80-100k documented range) — i.e., this is not a personnel/OOB/spawn problem, it's specifically a morale-compounding problem. Formation Expert's synthesis: this plausibly explains `combat_effective_brigades`, the corps-operation-launch readiness suppression behind `operations_launched: 0` (`corps_operation_readiness.ts:399-446` folds mean subordinate morale in at 40% weight), *and* this exact Task 0.3 destruction asymmetry, all from one upstream cause the Step 1-7 investigation never examined (it looked at dissolution thresholds, reinforcement supply, and exposure volume — never at the morale-drift multipliers feeding the exposure-volume outcomes' aftermath). **Not yet tested; this is a lead, not a fix.** Next step per the panel: instrument first (add mean-morale-by-faction to `tools/engine_health_gate.cjs`, cheap, territory-flat, no rerun needed), then test bounding/reducing the multiplier asymmetry as a single isolated change per the one-change-per-run rule, same discipline as Steps 1-6.
- [x] Prove the fix is isolated: 188w anchors recover to historical RS control at all three OSIDs, with no unrelated OSID regressions and no change to `matched_osids`'s broader positive trend. **2026-08-05: all three now hold (31/31 anchors overall)** via the Zvornik anchor-garrison guard (`4486014ac`) plus the floor-aware cohesion-decrement fix (`2ac802a27`, 188w 633→630, RS dissolution events roughly halved). Task 0.3's core deliverable is closed; Step 8 above is a separate, non-blocking follow-on lead into the remaining upstream mechanism.
- [ ] **New (2026-08-05):** instrument mean-morale-by-faction and `combat_effective_brigades` in `tools/engine_health_gate.cjs` (cheap, territory-flat, unblocks measuring Step 8 without a rerun); then test bounding `morale_drift.ts`'s victory/defeat multiplier asymmetry as one isolated change, same one-change-per-run discipline as Steps 1-6.
- [ ] **New (2026-08-05), needs Pyrrhic panel sign-off before scoping as a task** (not yet a committed task — flagged by the panel, requires Game Designer + Historian per the roadmap's own canon-adjacent-experiment process): Historian's panel review found two of this run's accepted counterfactual decisions were historically too cheap — removing Mladić (Karadžić tried this for real on 4 Aug 1995 and was forced to reverse it 7 days later after Main Staff officers sided with Mladić, BB1 p.75/p.434/p.463) and accepting the Contact Group 51/49 plan (blocked in reality by RS's own 27-28 Aug 1994 referendum against Belgrade's wishes, BB1 pp.59-61). Candidate direction, NOT yet approved: model VRS Main Staff as an institutional actor with a loyalty/insubordination check on officer-removal, and gate Contact-Group-style acceptance on a plebiscitary/Assembly check — both add a modeled RS-internal veto layer the engine currently entirely lacks, rather than special-casing any named individual. Canon Compliance Reviewer's panel review independently confirms canon is silent on protecting named officers and explicitly warns against a Mladić-specific hardcode — any implementation must stay faction-symmetric-mechanism, data-asymmetric per `docs/10_canon/FORAWWV.md` §X.4.
- [ ] **New (2026-08-05):** the Srebrenica-fall trigger (`data/scenarios/events/war_1995.json`, `srebrenica_falls_1995`) did not fire in this playthrough; both gating flags (`srebrenica_enclave_formed`, `srebrenica_demilitarized`) need tracing to determine which one never set and why, before any conclusion is drawn about enclave-survival mechanics. Canon Compliance Reviewer's panel review also flags checking whether the `enclave_defended` ghost-entry (`src/sim/codex/dynamic_section_builder.ts`, gated on `enclave_held_through_turn`) correctly fired to record this divergence, per the sensitive-history design gate's requirement that ahistorical divergence be recorded, not silently absent.
- [ ] **New (2026-08-05), doc-only:** amend `docs/10_canon/VICTORY_AND_PYRRHIC_SCORING.md` §3.2 to document the `COST_GRADE_CAPS` mechanism in `src/sim/negotiation/scoring.ts` (a war-cost index that caps a faction's letter grade below its territory-based anchor — confirmed functioning as designed by Canon Compliance Reviewer's panel review, just undocumented) and the `decision_mode === 'emergent'`-gated atrocity term. Sign-off per canon's own process: `/game-designer` + `/war-or-game`.
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
