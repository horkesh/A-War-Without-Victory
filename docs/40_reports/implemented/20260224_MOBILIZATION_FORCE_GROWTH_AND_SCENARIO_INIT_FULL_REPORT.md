# Mobilization & Force Growth — Full Implementation Report

**Date:** 2026-02-24  
**Plan source:** [MOBILIZATION_AND_FORCE_GROWTH_PLAN.md](../backlog/MOBILIZATION_AND_FORCE_GROWTH_PLAN.md)  
**Architect decisions:** [MOBILIZATION_ARCHITECT_DECISIONS.md](../backlog/MOBILIZATION_ARCHITECT_DECISIONS.md)

---

## Summary

The full **Mobilization & Force Growth** plan was executed in ordered phases: Parts 1–7 (ongoing mobilization, RS JNA bonus, VRS initial personnel, faction initial cohesion, ARBiH available_from shifts, experience gain, cohesion drift, exhaustion penalty) are implemented and wired. Part 8 (casualty calibration) was initially blocked by a Phase F3 scenario init invariant; a separate fix (skip OSID promotion when political_controllers are already OSID-keyed) unblocked 52-week scenario runs. This report documents all phases, the scenario init fix, verification, and architect decisions for user review.

---

## 1. Phase 0 — Canon and architecture gate

- Canon coverage confirmed and implementation-notes added where needed (Phase II Spec §5, Systems Manual §13).
- Architect decision log created: [MOBILIZATION_ARCHITECT_DECISIONS.md](../backlog/MOBILIZATION_ARCHITECT_DECISIONS.md).
- Decisions locked: exhaustion tracking (optional `mobilized_cumulative`; do not overload `exhausted`), municipality controller tie-break (`localeCompare(factionId)`), pipeline order (ongoing-mobilization before brigade-reinforcement), RS JNA bonus one-time at scenario init.

---

## 2. Phase 1 — Part 1: Phase II ongoing mobilization

- **New module:** `src/sim/phase_ii/ongoing_mobilization.ts` — `runPhaseIIOngoingMobilization()`: conscription by eligible pop × BASE_MOBILIZATION_RATE × faction scale × surge(turn) × exhaustion mult × authority mult; exhaustion cap; then `runDisplacedAndCrossEthnicContributions()`.
- **pool_population.ts:** Deterministic tie-break `localeCompare(factionId)` for municipality controller; exported `runDisplacedAndCrossEthnicContributions()` and `buildSettlementsByMun()`; `runPoolPopulation()` delegates displaced + cross-ethnic to shared function.
- **turn_pipeline.ts:** New step `phase-ii-ongoing-mobilization` (async, loads graph) immediately before `phase-ii-brigade-reinforcement`; report type `OngoingMobilizationReport`.
- **Tests:** `tests/ongoing_mobilization.test.ts` (3 tests).
- **Canon:** Phase II Spec §5 step 14; Systems Manual §13 implementation-note.

---

## 3. Phase 2 — Part 3: VRS initial personnel

- **formation_constants.ts:** `FACTION_INITIAL_PERSONNEL` — RS 1,200, RBiH 800, HRHB 800.
- **oob_phase_i_entry.ts:** `createOobFormationsAtPhaseIEntry` uses FACTION_INITIAL_PERSONNEL for brigade personnel at OOB creation.
- **Tests:** `oob_phase_i_entry.test.ts` — regression coverage.
- Emergent spawn from pools remains MIN_BRIGADE_SPAWN (800).

---

## 4. Phase 3 — Part 4: Faction initial cohesion

- **formation_constants.ts:** `FACTION_INITIAL_COHESION` — RS 72, HRHB 62, RBiH 55.
- **formation_lifecycle.ts:** `computeBaseCohesion(kind, createdTurn, faction?)` uses FACTION_INITIAL_COHESION for brigade/operational_group; militia/TD unchanged.
- **formation_spawn.ts** and formation_lifecycle call sites pass faction into `computeBaseCohesion`.

---

## 5. Phase 4 — Part 2: RS JNA inheritance bonus

- **pool_population.ts:** `RS_JNA_INHERITANCE_BONUS = 20_000`; `applyRsJnaInheritanceBonus(state, population1991ByMun)` — distributed by eligible Serb population; if no pop data, even split across RS pools; deterministic sorted pool keys.
- **scenario_runner.ts:** Import and call `applyRsJnaInheritanceBonus` immediately after both `runPoolPopulation` usages (Phase I entry and Phase II start).
- **Tests:** `tests/phase_i_pool_population.test.ts` — RS bonus: total added, proportionality, MUN_A vs MUN_B when Serb pop differs.

---

## 6. Phase 5 — Part 5: ARBiH available_from OOB shifts

- **data/source/oob_brigades.json:** 30 RBiH brigades (3rd/4th corps only; 1st and 5th unchanged) had `available_from` updated:
  - **15 → 8:** e.g. arbih_7th_vitezka_muslim_liberation, 303rd, 314th, 319th, 330th, 327th, 328th, 329th, 351st, 372nd, 373rd, 374th, 375th, 377th, arbih_4th_muslim_light.
  - **10 → 16:** 443rd, 444th, 445th, 446th, 447th, 450th, 441st, 442nd, 448th, 449th_eastern_herzegovina_mountain.
  - **5 → 26:** 17th_vitezka_mountain, 706th_muslim_mountain, 708th_mountain, 712th_mountain, 725th_light.

---

## 7. Phase 6 — Part 7a: Experience gain from combat

- **attack_resolution_osid.ts:**
  - Constants: `BASE_EXPERIENCE_GAIN`, `VICTORY_EXPERIENCE_BONUS`, `DEFEAT_EXPERIENCE_GAIN`, `FACTION_LEARNING_RATE` (RBiH 1.5, RS 0.7, HRHB 1.0), `COMMANDER_EXP_LOSS = 0.15`.
  - **Commander casualty:** When defender cohesion &lt; 20 after combat, defender `experience` reduced by `COMMANDER_EXP_LOSS` if current experience &gt; 0.3.
  - **Experience gain:** After pyrrhic/ammo block, for each surviving attacker and defender: `applyExperienceGain(f, won)` — base gain × faction rate, extra for winners, diminishing returns `gain * (1.0 - experience * 0.5)`, then `experience = min(1.0, experience + effectiveGain)`.
- Deterministic formation iteration (sorted).

---

## 8. Phase 7 — Part 7b: Ambient cohesion drift

- **attack_resolution_osid.ts:** `AttackResolutionOsidReport` extended with `engaged_formation_ids: FormationId[]`; after each battle, attacker and defender formation ids pushed into report.
- **cohesion_drift.ts (new):** `getFactionCohesionDrift(faction, turn)` — RS 0 then decay (-0.15→-0.7), RBiH growth (0.4→0.05), HRHB 0.05 then 0. `runPhaseIICohesionDrift(state, engagedFormationIds)` applies drift only to formations **not** in `engagedFormationIds`; only `brigade` and `operational_group`; cohesion clamped 0–100; deterministic sorted formation ids.
- **turn_pipeline.ts:** New step `phase-ii-cohesion-drift` after `phase-ii-resolve-attack-orders`; runs `runPhaseIICohesionDrift(context.state, context.report.phase_ii_attack_resolution_osid?.engaged_formation_ids ?? [])`; report type `CohesionDriftReport`.

---

## 9. Phase 8 — Part 7c: Manpower exhaustion cohesion penalty

- **cohesion_drift.ts:**
  - `getFactionExhaustionRatio(state, faction)` — committed / (committed + available) per faction from `militia_pools`; deterministic sorted pool keys.
  - Thresholds: `EXHAUSTION_COHESION_THRESHOLD = 0.8` → -0.5 cohesion/turn; `CRITICAL_EXHAUSTION_THRESHOLD = 0.95` → -1.5.
  - Report field `exhaustion_penalties_applied`; drift and exhaustion applied after ambient drift; same skip-if-engaged rule for brigade/operational_group.

---

## 10. Phase 9 — Part 8: Casualty calibration

- **Status:** Code-complete for Parts 1–7. Part 8 (52-week run to collect force/KIA metrics and optionally tune casualty constants) was initially blocked by Phase F3 invariant (753 settlements with `political_controller === null` after init). Once scenario init was fixed (see §11), 52-week run completes successfully.
- **Calibration:** Optional tuning of casualty constants in `attack_resolution_osid.ts` and determinism rerun can be performed using the same scenario run; baselines may be updated as needed. Ledger and architect log document the unblock.

---

## 11. Scenario init fix (Phase F3 invariant)

- **Problem:** With operational graph and init modes that already key `political_controllers` by OSID (hybrid_1992, ethnic_1991, mun1990-only, or operational initial master), `promotePoliticalControllersToOsid()` was still called. That function expects **SID-keyed** state and builds OSID values by majority over `pc[sid]` for canonical SIDs. With OSID-keyed state, every `pc[sid]` is undefined, so it overwrote every OSID with `null` → Phase F3 invariant failure.
- **Fix:** **political_control_init.ts**
  - Added `isPoliticalControllersAlreadyOsidKeyed(state, operationalToCanonical)`: returns true when every key in `state.political_controllers` is in `operationalToCanonical.keys()`.
  - Before calling `promotePoliticalControllersToOsid` in: ethnic_1991 path, hybrid_1992 path, mun1990-only path, and initial-master path — we now check `isPoliticalControllersAlreadyOsidKeyed` and **skip promotion** when true.
- **Verification:** `npm run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_52w.json --out data/derived/_test/mob_calib` completes; init log shows `753 settlements, RBiH=285, RS=333, HRHB=135, null=0`; `final_state_hash: f67cacdb7377efbb`.

---

## 12. Refactor passes

- Refactor A (after Part 1), B (after Part 3): completed.
- Refactor C–H (after Parts 4, 2, 5, 7a, 7b, 7c): cancelled per plan to avoid scope creep; code remains consistent and test-covered.

---

## 13. Determinism and verification

- **Determinism:** All new code uses sorted iteration (`strictCompare` or `localeCompare`); no timestamps or randomness; pool keys, formation ids, and faction lists sorted.
- **Type-check:** `npx tsc --noEmit` — pass.
- **Vitest:** 157 passed, 13 skipped (preexisting AoR-related).
- **52-week scenario:** apr1992_definitive_52w runs to completion after scenario init fix.

---

## 14. Files created

| File | Purpose |
|------|---------|
| `src/sim/phase_ii/ongoing_mobilization.ts` | Phase II per-turn pool growth (conscription + displaced + cross-ethnic). |
| `src/sim/phase_ii/cohesion_drift.ts` | Ambient faction cohesion drift and exhaustion penalty. |
| `tests/ongoing_mobilization.test.ts` | Ongoing mobilization tests. |
| `docs/40_reports/backlog/MOBILIZATION_ARCHITECT_DECISIONS.md` | Architect decision log (all phases). |

---

## 15. Files modified

| File | Changes |
|------|---------|
| `src/sim/phase_i/pool_population.ts` | Tie-break, shared displaced/cross-ethnic export, RS JNA bonus. |
| `src/sim/turn_pipeline.ts` | Steps: phase-ii-ongoing-mobilization, phase-ii-cohesion-drift; report types. |
| `src/state/formation_constants.ts` | FACTION_INITIAL_PERSONNEL, FACTION_INITIAL_COHESION. |
| `src/state/formation_lifecycle.ts` | computeBaseCohesion(kind, createdTurn, faction?). |
| `src/sim/formation_spawn.ts` | Pass faction into computeBaseCohesion. |
| `src/scenario/oob_phase_i_entry.ts` | Use FACTION_INITIAL_PERSONNEL at OOB creation. |
| `src/scenario/scenario_runner.ts` | applyRsJnaInheritanceBonus after runPoolPopulation. |
| `src/sim/phase_ii/attack_resolution_osid.ts` | engaged_formation_ids, experience gain, commander exp loss. |
| `src/state/political_control_init.ts` | isPoliticalControllersAlreadyOsidKeyed; skip promotion when already OSID-keyed. |
| `data/source/oob_brigades.json` | ARBiH available_from shifts (30 brigades, 3rd/4th corps). |
| `docs/10_canon/Phase_II_Specification_v0_5_0.md` | §5 step 14 (ongoing mobilization). |
| `docs/10_canon/Systems_Manual_v0_5_0.md` | §13 implementation-note. |
| `vitest.config.ts` | ongoing_mobilization.test.ts. |
| `docs/PROJECT_LEDGER.md` | Entries for Parts 1–4, 7b+7c, Part 8 blocked, scenario init fix. |
| `docs/40_reports/backlog/MOBILIZATION_ARCHITECT_DECISIONS.md` | Phase 0–9 decisions and final review note. |
| `.agent/napkin.md` | Session notes (mobilization completion, scenario init fix). |

---

## 16. Architect decisions (user review)

All decisions are recorded in [MOBILIZATION_ARCHITECT_DECISIONS.md](../backlog/MOBILIZATION_ARCHITECT_DECISIONS.md). Summary:

| Phase | Key decisions |
|-------|----------------|
| 0 | Exhaustion tracking optional; tie-break localeCompare; pipeline order; RS bonus one-time. |
| 2 | FACTION_INITIAL_PERSONNEL RS 1200, RBiH/HRHB 800. |
| 3 | FACTION_INITIAL_COHESION RS 72, HRHB 62, RBiH 55. |
| 4 | RS_JNA_INHERITANCE_BONUS 20_000; one-time at init. |
| 5 | ARBiH available_from: 15→8, 10→16, 5→26 (3rd/4th corps). |
| 6 | Experience in attack_resolution_osid; FACTION_LEARNING_RATE; commander exp loss. |
| 7 | phase-ii-cohesion-drift after resolve-attack-orders; drift curves per faction. |
| 8 | Exhaustion ratio committed/(committed+available); thresholds 0.8 / 0.95. |
| 9 | 52w calibration unblocked after scenario init fix. |

---

## 17. Ledger and canon

- **PROJECT_LEDGER.md:** Entries for Mobilization Parts 1–4, Part 7b+7c, Part 8 (blocked then unblocked), and scenario init fix.
- **Canon:** Phase II Spec §5, Systems Manual §13; no FORAWWV edits.

---

*This report is the single full reference for the Mobilization & Force Growth implementation and the scenario init fix. For backlog and architect decisions, see the linked backlog documents.*
