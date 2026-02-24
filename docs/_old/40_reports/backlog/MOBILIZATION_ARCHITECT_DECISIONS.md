# Mobilization & Force Growth — Architect Decision Log

**Purpose:** Decisions made during implementation; flagged for user review at end of run. Do not remove; append only.

---

## Phase 0 (Pre-Implementation)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Mobilization exhaustion tracking | Use **optional `mobilized_cumulative`** on pool when implemented; do not overload `exhausted` | Preserve `exhausted` for future attrition/displacement; plan's use of committed+exhausted conflicts with existing semantics. |
| Municipality controller tie-break | **Deterministic: `localeCompare(factionId)`** when counts tie | Canon/settlement_control pattern; no insertion-order dependence. |
| Pipeline order | **phase-ii-ongoing-mobilization** immediately before **phase-ii-brigade-reinforcement** | Fresh mobilized manpower available same turn for reinforcement. |
| RS JNA bonus | **One-time at scenario init** after runPoolPopulation; not per-turn | Historically discrete event (12 May 1992); independently tunable. |

---

---

## Phase 2 (Part 3: VRS Initial Personnel)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| FACTION_INITIAL_PERSONNEL | RS 1200, RBiH 800, HRHB 800 in formation_constants.ts | Option B per report; applied only at OOB creation in createOobFormationsAtPhaseIEntry. Emergent spawn from pools remains MIN_BRIGADE_SPAWN (800). |

---

## Phase 3 (Part 4: Faction Initial Cohesion)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| FACTION_INITIAL_COHESION | RS 72, HRHB 62, RBiH 55 in formation_constants.ts | Per report; computeBaseCohesion(kind, createdTurn, faction?) uses it for brigade/OG; militia/TD unchanged. |

---

## Phase 4 (Part 2: RS JNA Inheritance Bonus)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| RS_JNA_INHERITANCE_BONUS | 20_000 in pool_population.ts | One-time at scenario init; distributed by eligible Serb pop; applyRsJnaInheritanceBonus called after runPoolPopulation in scenario_runner (Phase I and Phase II start). |

---

## Phase 5 (Part 5: ARBiH available_from shifts)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Delayed RBiH brigades | 15→available_from 8, 10→16, 5→26 (3rd/4th corps only; 1st/5th unchanged) | Per report; IDs in MOBILIZATION_ARCHITECT_DECISIONS or oob_brigades.json. |

---

---

## Phase 6 (Part 7a: Experience gain)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Experience gain location | In **attack_resolution_osid.ts** after pyrrhic/ammo block; per surviving attacker/defender | Single place for combat outcome; deterministic formation iteration. |
| FACTION_LEARNING_RATE | RBiH 1.5, RS 0.7, HRHB 1.0 | Per plan; RBiH steepest learning curve. |
| Commander exp loss | When defender cohesion &lt; 20 after combat, defender experience reduced by 0.15 if experience &gt; 0.3 | Models leadership casualty effect. |

---

## Phase 7 (Part 7b: Ambient cohesion drift)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pipeline step | **phase-ii-cohesion-drift** immediately after **phase-ii-resolve-attack-orders** | Uses engaged_formation_ids from attack report; non-engaged formations get drift. |
| Drift curves | RS: 0 then decay (-0.15→-0.7); RBiH: growth (0.4→0.05); HRHB: 0.05 then 0 | Per report; turn-based curves. |

---

## Phase 8 (Part 7c: Manpower exhaustion cohesion penalty)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Exhaustion ratio | committed / (committed + available) per faction from militia_pools | Deterministic; sorted pool keys. |
| Thresholds | ratio ≥ 0.80 → -0.5 cohesion/turn; ≥ 0.95 → -1.5 | Per plan; applied after ambient drift; same skip-if-engaged rule. |

---

## Phase 9 (Part 8: Casualty calibration)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 52w calibration run | **Blocked** by pre-existing Phase F3 invariant (753 settlements with political_controller === null after init) | Scenario harness fails at createInitialGameState; not caused by mobilization changes. Calibration and optional tuning to be run once init is fixed. |

---

## Final review (user)

All entries above are flagged for your review. No further implementation phases pending for this plan; calibration run deferred until scenario init invariant is resolved.
