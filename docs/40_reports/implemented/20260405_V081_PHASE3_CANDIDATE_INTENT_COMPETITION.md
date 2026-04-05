# v0.8.1 Phase 3 — Candidate Intent Competition

**Date:** 2026-04-05
**Type:** Implementation — v0.8.1 Commander Maturity Phase 3
**Phase in series:** 3 of 6
**Status:** ACCEPTED
**Baseline:** n1323 — 94.0%, 27/27 anchors, 6/6 benchmarks
**Verification:** tsc clean, 2392/2392 vitest (171 files)

---

## Purpose

Give corps commanders a genuine decision process rather than a fixed priority ladder. Each turn, the commander generates 2–5 candidate intents, scores them against current battlefield conditions (supply, threat, surplus, exhaustion, fatigue, deficit urgency, campaign role), hard-blocks ineligible families under 8 conditions, and selects the winner deterministically. The winning intent drives plan creation or early-return routing. The decision trace persists across turns.

## Deliverables

### 1. Interface Extension (plan.ts)

`PlanDecision` extended with `decision_trace?: CommanderDecisionTrace`. Populated when `selectWinningIntent` runs in the new-plan path; preserved across lifecycle turns via `emit.ts`.

### 2. `selectWinningIntent()` (plan.ts — NEW function)

Pure, deterministic function that:
- Generates 2–5 candidate intents based on current zone/supply/surplus state
- Scores each candidate with 7 weighted factors
- Hard-blocks under 8 conditions
- Selects the highest-scoring non-blocked candidate
- Returns the winning intent type + a `CommanderDecisionTrace` capturing all candidates, scores, and blocks

### 3. `managePlan()` Routing (plan.ts)

In the new-plan path, `managePlan()` now calls `selectWinningIntent` first, then routes based on winner type:
- Offensive intents (`stage_operation`, `launch_opportunity`) → existing plan-creation logic
- Non-offensive intents (`hold_line`, `reinforce_zone`, `thin_quiet_sector`, `recall_exposed_brigades`, `request_army_support`) → early return with trace attached

### 4. Decision Trace Persistence (emit.ts)

`buildUpdatedState` now resolves `decision_trace` as: `planDecision.decision_trace ?? briefing.previous_state?.decision_trace`. Active trace from the current turn takes priority; previous trace carries forward when no new competition ran.

---

## Candidate Intent Families

| Family | When Generated | Can Be Blocked? |
|---|---|---|
| `hold_line` | Always (floor candidate) | No — never blocked |
| `reinforce_zone` | Zone deficit detected OR heavy/critical pressure | Yes |
| `stage_operation` | Pre-planned ops exist AND sufficient surplus | Yes |
| `launch_opportunity` | Surplus available AND projecting/balanced zone | Yes |
| `thin_quiet_sector` | Balanced/projecting zone with no deficit | Yes |
| `recall_exposed_brigades` | Disrupted or critical-morale brigades in surplus pool | Yes |
| `request_army_support` | Heavy/critical pressure AND zero surplus | Yes |

---

## Scoring Factors

| Factor | Formula Role | Weight Direction |
|---|---|---|
| `supply_readiness` | Higher supply confidence → offensive intents score higher | Positive for offensive |
| `threat_ratio` | Higher threat → defensive intents score higher | Positive for defensive |
| `surplus_ratio` | Surplus available → action intents over hold | Positive for action |
| `exhaustion_penalty` | Corps exhaustion dampens offensive scores | Negative for offensive |
| `fatigue_readiness` | High average fatigue dampens offensive | Negative for offensive |
| `deficit_urgency` | Active zone deficit boosts reinforcement | Positive for `reinforce_zone` |
| `campaign_alignment` | Winner aligned with corps campaign role gets bonus | Role-specific bonus |

---

## Hard-Block Conditions

| Condition | Reason String | What It Blocks |
|---|---|---|
| `corps_exhaustion_exceeds_threshold` | Corps exhaustion above hard limit | All offensive intents |
| `average_fatigue_too_high` | Average brigade fatigue too high for offensive | All offensive intents |
| `campaign_role_forbids_offensive` | Corps campaign role prohibits offensive action | All offensive intents |
| `sync_role_forbids_offensive` | Corps sync role prohibits offensive this turn | All offensive intents |
| `corps_stance_forbids_offensive` | Current corps stance incompatible with offensive | All offensive intents |
| `major_operation_already_active` | Active major operation consuming available surplus | `stage_operation`, `launch_opportunity` |
| `critical_supply_belief` | Believed supply continuity too low for offensive | All offensive intents |
| `surplus_available_no_hq_request` | Surplus exists; HQ request not warranted | `request_army_support` |

---

## Persistence

`decision_trace` lives on `PlanDecision` (in-turn) and is written through to `CommanderState` via `emit.ts`. The `buildUpdatedState` resolution chain ensures:
1. If competition ran this turn → active trace stored
2. If no new-plan path triggered → previous trace carried forward
3. Old saves without a trace → field is `undefined`, no breakage

---

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/commander/plan.ts` | `PlanDecision.decision_trace` field added; `selectWinningIntent()` function added; `managePlan()` new-plan path calls competition and routes by winner type |
| `src/sim/combat/commander/emit.ts` | `buildUpdatedState` resolves `decision_trace` with `?? briefing.previous_state?.decision_trace` carry-forward |

---

## Tests

14 targeted Phase 3 tests added in `tests/commander/commander_phase3_candidate_competition.test.ts`:

| Category | Coverage |
|---|---|
| Candidate generation | `hold_line` always present; conditional families generated only when triggers met |
| Scoring | Offensive intents score higher under high supply + low threat; defensive scores higher under critical threat |
| Hard-blocking | All 8 block conditions verified individually |
| Winner selection | Highest-scoring non-blocked candidate wins deterministically |
| Non-offensive routing | `hold_line` / `reinforce_zone` winners return early without entering plan-creation path |
| Trace persistence | `decision_trace` populated on PlanDecision; carry-forward when no competition |
| Determinism | Same inputs → identical winner and trace |

---

## Verification Results

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2392/2392 (171 files, 0 failures)

---

## Deferred to Later Phases

| Item | Target Phase |
|---|---|
| Personality weighting (aggressive/cautious/balanced modifier on scores) | Phase 4 |
| Lesson memory integration (past outcomes adjust future candidate scores) | Phase 4 |
| Relationship effects (neighbor corps stance influences candidate generation) | Phase 4 |
| Formal constraint/preference separation (hard blocks vs soft discounts cleanly typed) | Phase 5 |
| UI exposure of decision trace (player-visible intent competition summary) | Phase 5/6 |

---

## Recommended Next Phase

**v0.8.1 Phase 4: Personality and Lesson Memory** in `plan.ts` and `commander_state.ts`.

Tasks:
- Apply `CommanderPersonality` (from Phase 1 type scaffolding) as score modifiers on candidate intents
- Read `CommanderLesson[]` from `CommanderState` and apply outcome-weighted adjustments to candidate scoring
- Populate `CommanderLesson` entries from operation outcomes (plan resolve path in `plan.ts`)
- Verify determinism and backward compatibility with old saves lacking lesson history
