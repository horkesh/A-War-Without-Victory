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

- [ ] RED: prove 30% Goražde municipal control cannot transfer `op:gorazde:glamoc` or `op:gorazde:kamen`, set the consolidation flag, or emit a completed-consolidation receipt.
- [ ] RED: prove an informational receipt becomes eligible in the historical window only when current `political_controllers` already records both exact OSIDs as RBiH-held.
- [ ] Remove the event's `control_change`; keep any morale/flag/narrative consequence downstream of the exact current-state predicate and prove the event does not alter political control bytes.
- [ ] Route the Wikipedia-only citation and absolute future claim to R7; do not repair sourcing with unsupported copy in R6.
- [ ] Run the 40-turn comparison and explain the expected baseline delta before Phase 0 freezes candidate truth.

```powershell
npm.cmd run test:vitest -- tests/gorazde_pocket_event_state_truth.test.ts tests/event_conditions.test.ts --pool=forks --reporter=dot
npm.cmd run sim:scenario:run:40w
npm.cmd run test:baselines
```

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
