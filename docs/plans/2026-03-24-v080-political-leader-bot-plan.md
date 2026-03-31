# v0.8.2 Political Leader Bot

**Date:** 2026-03-24
**Status:** PLAN — NOT STARTED
**Roadmap slot:** v0.8.2 (renumbered 2026-03-30; was v0.8.1)
**Gate:** v0.8.1 Commander Maturity must be complete before starting this plan. Political behavior built on a threshold machine produces illusion, not command.
**Prerequisite:** v0.7.0 (event flag wiring, Dynamic Codex scaffolding complete)
**Estimated tasks:** 38
**Overseer:** Orchestrator
**Architect:** Technical Architect / Architect - flags architectural decisions for user review
**Primary implementer roles:** Gameplay Programmer, Systems Programmer, Game Designer, QA Engineer
**Primary reviewer roles:** `/simplify`, Code Review, Canon Compliance Reviewer, War-or-Game
**Sign-off:** Orchestrator, Architect, War-or-Game

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: Calibration % means nothing if reached through broken mechanics
- `docs/life_lessons.md`: NEVER fabricate historical claims - dispatch /historian, don't speculate
- `docs/life_lessons.md`: Decisions without traces are undebuggable - instrument before investigating
- `docs/life_lessons.md`: One change per calibration run

---

## Context

The player IS the unnamed wartime political leader — the President of the Presidency for RBiH, President of RS, or President of HRHB. The existing bot AI operates at three tiers (army strategy, corps directives, brigade targeting) but has no political-level decision layer. Non-player factions make event decisions via `pickBotResponseV1`, which is a thin personality-weighted scorer that defaults to "historical" or "first option" for most response logic types (`capital_based`, `capital_weighted`, `strategic_weighted` all fall through to first-option). There are 20 decision events across 4 event files, and 4 peace plans with simple territory-comparison bot logic.

The political layer already has substantial infrastructure:
- **Strategic dimensions** (6 axes, 0-100 each, faction-weighted): `strategic_dimensions.ts`
- **Patron pressure engine**: `patron_pressure.ts` (override authority, support level, sanctions)
- **Patron events** (scripted): `patron_events.ts` (4 historical events)
- **Peace plan evaluation**: `peace_plans.ts` (territory-comparison acceptance logic)
- **Dayton negotiation bot**: `bot_negotiation.ts` (capital-based proposal evaluation)
- **Event constraint bus**: `event_constraints.ts` (operation blocks, doctrine overrides, scope restrictions)
- **Alliance system**: `alliance_update.ts` (RBiH-HRHB alliance value with drivers)
- **Negotiation capital**: `compute_capital.ts` (territory, casualties, war crimes, operations)
- **Named officers**: personality ratings (competence, aggressiveness, defensive_skill, political_reliability)

What is missing: a **unified political decision-maker** that reads game state + strategic dimensions and produces coherent political behavior across all these systems. Currently, bot factions have no strategic personality — they react to individual events in isolation with no memory of prior decisions or coherent long-term goals.

---

## Design Decisions

### 1. Distinct Political Personality Profiles — YES

Each faction gets a `PoliticalPersonality` profile with weighted priorities that reflect their historical leaders' strategic calculus:

| Faction | Archetype | Primary Drive | Secondary Drive | Vulnerability |
|---------|-----------|--------------|-----------------|---------------|
| **RS (Karadzic)** | Expansionist-Nationalist | `territorial_legitimacy` (0.30) | `patron_confidence` (0.25) | International isolation |
| **RBiH (Izetbegovic)** | Survival-Internationalist | `international_standing` (0.30) | `internal_cohesion` (0.25) | Military weakness |
| **HRHB (Boban)** | Opportunist-Patron-Dependent | `patron_confidence` (0.30) | `territorial_legitimacy` (0.25) | Zagreb's leash |

These are NOT the existing `DIMENSION_WEIGHTS` (which score the Dayton outcome). These are **decision-making weights** — what the political bot cares about when evaluating options mid-war.

### 2. Dimension vs Military Situation Weighting

The bot uses a **dual-track evaluator**:
- **Situation Assessment** (0-100): military strength ratio, territory trend (gaining/losing), supply health, casualty exchange rate. Pure numbers.
- **Dimension Assessment** (0-100): weighted composite of the 6 strategic dimensions using the faction's political personality weights.

The decision function blends them: `score = situation_weight * situation + (1 - situation_weight) * dimensions`, where `situation_weight` starts at 0.7 (military reality dominates early war) and shifts to 0.4 by late war (political/diplomatic considerations dominate as exhaustion sets in). This models the historical pattern: early war is about facts on the ground, late war is about negotiation positioning.

### 3. Ahistorical "Surprise" Decisions — YES, but Constrained

The bot CAN deviate from history when the game state diverges sufficiently from the historical baseline. The mechanism:

- Each event response option gets a `historical_baseline` flag (true/false). The historical option is the default.
- The bot evaluates ALL options using the political personality scorer.
- If the best non-historical option scores >15 points higher than the historical option, AND the game state has diverged from history (measured by territory deviation >5% from historical baseline for that week), the bot picks the non-historical option.
- This threshold is tunable per faction: RS divergence_threshold=12 (Karadzic was erratic), RBiH=18 (Izetbegovic was cautious), HRHB=8 (Boban was reactive to Zagreb).

This creates meaningful ahistorical branching without every game being random.

### 4. Political Bot <-> Military Bot Chain

The political bot does NOT replace the army/corps/brigade chain. It sits ABOVE it:

```
Political Leader Bot (new)
  |-- Sets faction-wide doctrine constraints via EventConstraints
  |-- Responds to events (peace plans, diplomatic events, crises)
  |-- Adjusts alliance posture (Graz Accords break timing)
  |-- Influences corps stance ceiling via "political directive"
  |-- Does NOT micromanage operations (that's the army tier)
  v
Army Strategy Bot (existing: bot_strategy.ts, bot_corps_directives.ts)
  |-- Generates corps directives based on doctrine + front geometry
  v
Corps AI (existing: bot_corps_ai.ts, sector_offensive.ts)
  |-- Launches operations, manages sectors
  v
Brigade AI (existing: bot_brigade_ai_osid.ts)
  |-- Executes attack/defend/move at OSID level
```

The political bot writes to state fields that the military chain already reads:
- `event_constraints` (operation blocks, doctrine overrides)
- `event_aggression_modifiers` (tempo changes)
- `war_alliance_rbih_hrhb` (alliance value, via event effects)
- `negotiation.patron_relationships` (patron pressure responses)
- Corps stance ceiling (new field: `political_stance_ceiling` per corps)

---

## Phases

All phases below are Pyrrhic execution phases. Each phase ends with `/simplify`, smoke-test triad, verification-before-completion, pre-commit-check, and a commit before the next phase begins.

### Phase 1: Political Personality Framework (6 tasks)
**Assigned to:** Gameplay Programmer + Game Designer  
**Reviewer:** `/simplify`, Code Review, Canon Compliance Reviewer  
**Sign-off:** Orchestrator, Architect, War-or-Game

- [ ] **1.1** Define `PoliticalPersonality` interface in new file `src/sim/political/political_personality.ts`. Fields: `faction`, `archetype` (string label), `dimension_weights` (Record<DimensionId, number>, must sum to 1.0), `risk_tolerance` (0-1), `patron_sensitivity` (0-1), `divergence_threshold` (number), `situation_weight_curve` (early/late war blend), `war_crimes_tolerance` (0-1, RS=0.7, RBiH=0.1, HRHB=0.4). Acceptance: types compile, no runtime code yet.

- [ ] **1.2** Define static `POLITICAL_PERSONALITIES` constant for RS, RBiH, HRHB in same file. Acceptance: data matches the table in Design Decision 1. Add `getPoliticalPersonality(faction: FactionId): PoliticalPersonality` accessor.

- [ ] **1.3** Define `PoliticalAssessment` interface: `{ situation_score: number, dimension_score: number, blended_score: number, territory_trend: 'gaining' | 'stable' | 'losing', military_strength: number, patron_pressure: number, exhaustion_level: number }`. Acceptance: types compile.

- [ ] **1.4** Implement `computePoliticalAssessment(state: GameState, faction: FactionId, personality: PoliticalPersonality): PoliticalAssessment`. Reads strategic dimensions, military strength ratio (from `patron_pressure.ts`), territory trend (from turn summaries), patron override authority. Acceptance: unit test — given known state, returns expected assessment. Deterministic.

- [ ] **1.5** Implement `computeSituationWeight(state: GameState, faction: FactionId, personality: PoliticalPersonality): number`. Returns 0.7 at war start, decays to 0.4 by week 120, using personality's `situation_weight_curve`. Acceptance: unit test — weight decreases monotonically with war week.

- [ ] **1.6** Write 15+ unit tests for personality framework. Cover: all 3 factions produce valid assessments, situation weight curve bounds, dimension score matches manual calculation. File: `tests/sim/political/political_personality.test.ts`. Acceptance: all tests pass.

### Phase 2: Event Decision Engine (8 tasks)
**Assigned to:** Gameplay Programmer + Systems Programmer  
**Reviewer:** `/simplify`, Code Review, Canon Compliance Reviewer  
**Sign-off:** Orchestrator, Architect, War-or-Game

- [ ] **2.1** Create `src/sim/political/political_event_decision.ts`. Implement `scorePoliticalOption(option: EventResponseOption, assessment: PoliticalAssessment, personality: PoliticalPersonality): number`. Score formula: `dimension_shift_value * personality_weight + aggression_affinity * risk_tolerance + (1 - risk_level) * (1 - risk_tolerance) + patron_pressure_alignment`. Acceptance: unit test — RS scores expansionist options higher, RBiH scores diplomatic options higher.

- [ ] **2.2** Implement `pickPoliticalResponse(options: EventResponseOption[], state: GameState, faction: FactionId): EventResponseOption`. This replaces `pickBotResponseV1` for non-player factions. Computes assessment, scores all options, applies divergence threshold logic (Design Decision 3). Acceptance: deterministic — same state = same pick. Unit tests for each faction archetype.

- [ ] **2.3** Implement `capital_based` response logic: score options by net negotiation capital impact (sum of dimension_shifts weighted by DIMENSION_WEIGHTS for faction). Acceptance: option with best net capital change wins. Unit test.

- [ ] **2.4** Implement `strategic_weighted` response logic: score options using full PoliticalAssessment (blended situation + dimension score). This is the "smart" mode — reads game state, not just option metadata. Acceptance: RS in strong military position picks aggressive option; RS under patron pressure picks cautious option.

- [ ] **2.5** Wire `pickPoliticalResponse` into `evaluateEvents()` in `evaluate_events.ts`. Replace the `pickBotResponseV1(def.response_options, def.bot_response_logic, DEFAULT_BOT_COMMANDER)` call at line ~214 with a dispatch: if `bot_response_logic` is `'strategic_weighted'` or `'capital_based'`, use `pickPoliticalResponse`; else fall through to `pickBotResponseV1` for backward compat (`historical`, `accept_first`, `reject_all`, `personality_weighted`). Acceptance: existing tests still pass; new tests verify dispatch.

- [ ] **2.6** Add `historical_baseline?: boolean` field to `EventResponseOption` type. Default `true` for first option, `false` for others (convention). Update 20 decision events in JSON to explicitly tag historical options. Acceptance: event JSON validates; no functional change until divergence logic reads the flag.

- [ ] **2.7** Implement divergence detection: `hasGameDiverged(state: GameState, faction: FactionId): boolean`. Compares current territory percentage against a `HISTORICAL_TERRITORY_BASELINE` lookup table (per faction, per 10-week bracket). Returns true if deviation > 5%. Data: RS starts ~50%, peaks ~70% w12, settles ~49% w52. RBiH inverse. HRHB ~15-17% stable. Acceptance: unit test with synthetic state.

- [ ] **2.8** Write 25+ tests for event decision engine. Cover: all `bot_response_logic` modes, divergence threshold, faction-specific scoring, edge cases (single option, no dimension_shifts). Acceptance: all tests pass, no regressions in existing event tests.

### Phase 3: Peace Plan & Negotiation Intelligence (6 tasks)
**Assigned to:** Gameplay Programmer + Game Designer  
**Reviewer:** `/simplify`, Code Review, Canon Compliance Reviewer  
**Sign-off:** Orchestrator, Architect, War-or-Game

- [ ] **3.1** Replace `computeBotResponse` in `peace_plans.ts` with `computePoliticalPeacePlanResponse(state, plan, faction)`. Logic: (a) if patron override > personality's `patron_sensitivity * 100`, accept; (b) compute "plan attractiveness" = `(proposed_split[faction] - currentTerritory) * territorial_weight + intl_standing_impact + patron_impact`; (c) accept if attractiveness > `risk_tolerance * -10` (risk-tolerant leaders accept worse deals). Acceptance: RS rejects Vance-Owen when holding >45% (historical). RBiH accepts Contact Group under patron pressure. Unit tests.

- [ ] **3.2** Enhance `evaluateBotResponse` in `bot_negotiation.ts` to use `PoliticalAssessment`. Replace flat `BASE_SPENDING_WILLINGNESS` with personality-derived willingness: RS=0.5 (stubborn), RBiH=0.65 (pragmatic), HRHB=0.75 (patron-driven). Patron pressure thresholds scaled by `patron_sensitivity`. Acceptance: Dayton bot responses differ meaningfully between factions. Unit tests.

- [ ] **3.3** Implement `evaluateCounterProposalStrategy(state, faction, proposal): 'maximalist' | 'pragmatic' | 'patron_aligned'`. RS defaults to maximalist (drops fewest demands). RBiH defaults to pragmatic (optimizes capital efficiency). HRHB defaults to patron_aligned (accepts whatever Croatia would accept). Acceptance: unit test per faction.

- [ ] **3.4** Add "walkaway threshold" to Dayton negotiation: if bot's assessment is high enough (strong military + low patron pressure), bot can refuse to negotiate entirely. `shouldRefuseNegotiation(state, faction): boolean`. Returns true if `blended_score > 75 AND patron_override < 40`. Historically relevant: RS walked away from multiple plans. Acceptance: unit test; RS refuses at w20 (peak strength), accepts at w120 (under pressure).

- [ ] **3.5** Wire peace plan political response into pipeline. `evaluatePeacePlans` now calls `computePoliticalPeacePlanResponse` instead of `computeBotResponse`. Acceptance: scenario runs produce different peace plan outcomes when game state diverges from history.

- [ ] **3.6** Write 15+ tests for peace plan and negotiation intelligence. Acceptance: all pass.

### Phase 4: Alliance & Diplomacy Management (5 tasks)
**Assigned to:** Gameplay Programmer + Systems Programmer  
**Reviewer:** `/simplify`, Code Review, Canon Compliance Reviewer  
**Sign-off:** Orchestrator, Architect, War-or-Game

- [ ] **4.1** Implement `evaluateGrazAccordsBreak(state: GameState, faction: FactionId): { should_break: boolean, reason: string }`. Logic for RS: break when `territorial_legitimacy > 60 AND military_credibility > 55` (confident enough to fight on two fronts). For HRHB: break when `patron_confidence < 40` (Zagreb withdrawing support) or `territory under threat`. Never for RBiH (they don't control it). Acceptance: unit test per faction. Deterministic.

- [ ] **4.2** Implement `evaluateAlliancePosture(state: GameState, faction: FactionId): { target_alliance_delta: number, reason: string }`. For HRHB: when `patron_confidence` drops below 50, actively degrade alliance (push toward war). When patron_confidence rises above 70 (Zagreb wants peace), slow alliance degradation. For RBiH: always try to preserve alliance (positive delta). Acceptance: unit tests.

- [ ] **4.3** Create `src/sim/political/political_directives.ts`. Implement `generatePoliticalDirectives(state: GameState, faction: FactionId): PoliticalDirective[]`. A `PoliticalDirective` is one of: `{ type: 'stance_ceiling', corps_id: string, max_stance: 'offensive' | 'balanced' | 'defensive' }`, `{ type: 'operation_block', reason: string, duration_turns: number }`, `{ type: 'aggression_modifier', delta: number, duration_turns: number }`, `{ type: 'scope_restriction', allowed_municipalities?: string[], blocked_municipalities?: string[] }`. Acceptance: type-safe, unit tests for each directive type.

- [ ] **4.4** Wire `generatePoliticalDirectives` into the war_phases pipeline as a new step `'political-directives'` running BEFORE `'generate-corps-directives'`. Writes to `state.military.event_constraints` and `state.military.event_aggression_modifiers`. Acceptance: step appears in pipeline, no regressions, scenario runs complete.

- [ ] **4.5** Write 10+ tests for alliance and diplomacy management. Acceptance: all pass.

### Phase 5: War Crimes Policy (4 tasks)
**Assigned to:** Gameplay Programmer + Game Designer  
**Reviewer:** `/simplify`, Code Review, Canon Compliance Reviewer  
**Sign-off:** Orchestrator, Architect, War-or-Game

- [ ] **5.1** Define `WarCrimesPolicy` type: `'restrained' | 'permissive' | 'encouraged'`. Add to `PoliticalPersonality` as `default_war_crimes_policy`. RS=permissive, RBiH=restrained, HRHB=permissive. Acceptance: type compiles.

- [ ] **5.2** Implement `evaluateWarCrimesPolicy(state: GameState, faction: FactionId): WarCrimesPolicy`. Dynamic: policy tightens under international pressure (`international_standing < 30` forces `restrained` regardless of personality). Policy loosens under extreme military pressure (`situation_score < 25` AND `risk_tolerance > 0.5` allows `encouraged`). Acceptance: unit tests — RS shifts to restrained after Srebrenica-level international_standing crash.

- [ ] **5.3** Wire war crimes policy into event responses. Events with `humanitarian_impact` effects: if policy is `restrained`, bot will avoid options that increase war_crimes_events. If `encouraged`, bot prefers options with territorial gain even at humanitarian cost. Modify `scorePoliticalOption` to include war crimes policy weighting. Acceptance: unit tests — restrained RBiH never picks "enable ethnic cleansing" option; permissive RS does when territorial gain is high.

- [ ] **5.4** Wire war crimes policy into `civilian_casualties_caused` tracking. When policy is `encouraged`, ethnic cleansing events fire more frequently (add pressure rate modifier gated by `event_flags.war_crimes_policy_[faction] = 'encouraged'`). When `restrained`, pressure rate reduced. Acceptance: integration test — scenario run with restrained RS produces fewer war crimes events.

### Phase 6: Resource Allocation (3 tasks)
**Assigned to:** Gameplay Programmer  
**Reviewer:** `/simplify`, Code Review  
**Sign-off:** Orchestrator, Architect

- [ ] **6.1** Define `ResourcePriority` type: `{ military: number, diplomatic: number, humanitarian: number }` (weights summing to 1.0). Add `default_resource_priority` to `PoliticalPersonality`. RS: {military: 0.6, diplomatic: 0.15, humanitarian: 0.25}. RBiH: {military: 0.45, diplomatic: 0.30, humanitarian: 0.25}. HRHB: {military: 0.5, diplomatic: 0.25, humanitarian: 0.25}. Acceptance: types compile.

- [ ] **6.2** Implement `computeResourceAllocation(state, faction, personality): ResourceAllocation`. Dynamic adjustment: if `military_credibility < 30`, shift weight toward military. If `international_standing < 30`, shift toward diplomatic/humanitarian. Output: multipliers on supply allocation, patron aid effectiveness, and event scoring. Acceptance: unit tests.

- [ ] **6.3** Wire resource allocation into supply system. `military` weight scales `PATRON_AID_SCALE` for the faction. `diplomatic` weight scales peace plan acceptance flexibility. `humanitarian` weight reduces war crimes pressure accumulation rate. Acceptance: integration test — RBiH with high diplomatic priority gets slightly better international standing over time.

### Phase 7: Integration & Pipeline (6 tasks)
**Assigned to:** Systems Programmer + QA Engineer  
**Reviewer:** `/simplify`, Code Review, War-or-Game  
**Sign-off:** Orchestrator, Architect, War-or-Game

- [ ] **7.1** Create `src/sim/political/political_leader_bot.ts` — the top-level orchestrator. `runPoliticalLeaderBot(state: GameState, faction: FactionId): PoliticalLeaderReport`. Calls: `computePoliticalAssessment`, `generatePoliticalDirectives`, `evaluateWarCrimesPolicy`, `computeResourceAllocation`. Writes all outputs to state. Returns a report for logging/debugging. Acceptance: full integration — all sub-systems called in correct order, state mutated correctly.

- [ ] **7.2** Add `'run-political-leader-bot'` step to war_phases pipeline for each non-player faction. Runs AFTER `'evaluate-events'` and BEFORE `'generate-corps-directives'`. Skips the player's faction (player makes their own political decisions). Acceptance: pipeline runs clean, no regressions, 40w scenario completes.

- [ ] **7.3** Add `PoliticalLeaderState` to GameState: `{ war_crimes_policy: Record<FactionId, WarCrimesPolicy>, resource_priority: Record<FactionId, ResourcePriority>, political_directives: Record<FactionId, PoliticalDirective[]>, assessment_history: Record<FactionId, PoliticalAssessment[]> }`. Initialize in scenario loader. Acceptance: state serializes/deserializes correctly in save files.

- [ ] **7.4** Run full calibration pass: `npm run sim:scenario:run:40w`. Compare territory outcomes with and without political bot. Target: <1% area-weighted deviation from current baseline (political bot should NOT break calibration — it's a refinement layer, not a combat change). If deviation >1%, adjust personality parameters until calibration holds. Acceptance: 40w scenario within 1% of baseline.

- [ ] **7.5** Run smoke-test triad: `tsc --noEmit` + `vitest run` + `desktop:map:build`. All must pass. Acceptance: zero errors.

- [ ] **7.6** Update `docs/PROJECT_LEDGER.md` with v0.8.2 changelog. Update `MEMORY.md` with political bot architecture summary. Acceptance: ledger and memory updated.

---

## Risk Assessment

### High Risk
- **Calibration regression**: The political bot modifies aggression, doctrine, and operation constraints. Even small changes cascade through the combat pipeline. Mitigation: Phase 7.4 calibration gate. If bot decisions change combat outcomes, adjust political personality parameters (not combat constants).
- **Non-determinism**: Any use of `Math.random()`, unsorted iteration, or timestamp-dependent logic in the political bot would break the sacred determinism invariant. Mitigation: all functions must be pure or deterministic; sorted iteration via `strictCompare`; no `Date.now()`.

### Medium Risk
- **Event JSON migration**: Tagging 20 decision events with `historical_baseline` and updating `bot_response_logic` values requires careful data work. Mitigation: validate JSON schema after each change; run event evaluation tests.
- **Over-smart bot**: If the political bot makes "optimal" decisions, it may produce unrealistic outcomes (e.g., RS never committing war crimes because the bot correctly predicts international consequences). Mitigation: `risk_tolerance` and `war_crimes_tolerance` parameters ensure faction-appropriate irrationality.

### Low Risk
- **State bloat**: `assessment_history` could grow large over 180-week campaigns. Mitigation: cap history at last 20 entries (ring buffer).
- **Player impact**: Political bot only runs for non-player factions. Player decisions remain fully manual. No risk of the bot overriding player agency.

---

## File Inventory (new files)

| File | Purpose |
|------|---------|
| `src/sim/political/political_personality.ts` | Personality types, static profiles, assessment computation |
| `src/sim/political/political_event_decision.ts` | Event option scoring, response selection |
| `src/sim/political/political_directives.ts` | Corps stance ceiling, operation blocks, scope restrictions |
| `src/sim/political/political_leader_bot.ts` | Top-level orchestrator, pipeline integration |
| `tests/sim/political/political_personality.test.ts` | Personality framework tests |
| `tests/sim/political/political_event_decision.test.ts` | Event decision engine tests |
| `tests/sim/political/political_directives.test.ts` | Directive generation tests |
| `tests/sim/political/political_leader_bot.test.ts` | Integration tests |

---

## Done Gate

All of the following must be true:

1. All 3 non-player factions have distinct political personalities that produce measurably different event responses.
2. `pickPoliticalResponse` correctly dispatches for all 6 `bot_response_logic` modes.
3. Peace plan acceptance/rejection varies by game state (not just territory comparison).
4. Graz Accords break timing is faction-personality-driven.
5. War crimes policy affects event scoring and civilian casualty rates.
6. Resource allocation modifies supply/diplomatic systems.
7. Political directives (stance ceiling, operation blocks) flow through to corps AI.
8. 40w calibration within 1% of pre-v0.8.0 baseline.
9. 65+ new unit tests, all passing.
10. Smoke-test triad passes: `tsc --noEmit` + `vitest run` + `desktop:map:build`.
11. Determinism verified: two identical runs produce identical save files.
12. Ledger and memory updated.

## Protocol Enforcement

- [ ] Orchestrator oversees every phase
- [ ] Architect flags any new state fields, IPC, or command-chain ownership changes for user review
- [ ] `.claude/napkin.md` read at session start and updated during work
- [ ] `docs/life_lessons.md` scanned before each phase
- [ ] smoke-test triad runs after every phase, not just at the end
- [ ] one change per calibration run is respected whenever simulation behavior changes
- [ ] `/create-report` writes a completion report to `docs/40_reports/implemented/` when the milestone closes

## Completion Checklist

- [ ] completion report created in `docs/40_reports/implemented/`
- [ ] `docs/plans/MASTER_ROADMAP.md` updated if scope/gates/status changed
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated with recurring lessons
- [ ] relevant canon/engineering docs updated if political command flow changed materially
- [ ] `package.json` version bumped when the milestone completes
- [ ] version tag created and pushed when the milestone completes
