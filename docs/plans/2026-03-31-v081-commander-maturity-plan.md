# v0.8.1 Commander Maturity

**Date:** 2026-03-31  
**Status:** PLAN - READY FOR EXECUTION ONCE GATE OPENS  
**Roadmap slot:** v0.8.1  
**Overseer:** Orchestrator  
**Architect:** Technical Architect / Architect - may make architectural calls, but must flag them for user review  
**Primary implementer roles:** Gameplay Programmer, Systems Programmer, QA Engineer, Technical Architect  
**Primary reviewer roles:** Code Simplifier (`/simplify`) minimum every phase; Code Review for non-trivial engine phases; War-or-Game sign-off for engine-touching phase completion  
**Gate:** Starts only after `v0.8.0` P0 is fixed, the two-tier post-run panel gives go/no-go, and command/operations authority cleanup is credible enough that commander intent is not being routinely diluted downstream.  
**Prerequisites:** `v0.8.0` commander loop stabilized; operations singularity credible enough to serve as one real command object; `generateCorpsDirectives` removal path understood; post-run panel findings folded into plan adjustments before execution  
**Authoring basis:** `MASTER_ROADMAP.md`, `20260330_REPO_HEALTH_CONSOLIDATED.md`, existing commander code in `src/sim/combat/commander/`

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: Decisions without traces are undebuggable - instrument before investigating
- `docs/life_lessons.md`: Fix the symptom in ALL callers - verify the actual code path uses the change
- `docs/life_lessons.md`: Calibration % means nothing if reached through broken mechanics
- `docs/life_lessons.md`: Build diagnostic tools, not one-off scripts
- `docs/life_lessons.md`: Validate internal consistency after every run, not just calibration %

---

## 0. Purpose

`v0.8.0` created a real commander loop.
`v0.8.1` is where that loop becomes meaningfully mind-like without becoming stochastic, theatrical, or LLM-dependent.

This milestone is not about making the commander sound smarter.
It is about making the commander:

- reason through beliefs instead of reading raw state too directly
- compare multiple candidate intents instead of evaluating one path at a time
- remember prior outcomes and feed them back into future scoring
- distinguish hard constraints from preferences
- produce explanation traces that engineers and later UI can trust
- track relationships that matter for `v0.8.3` order interpretation

If this milestone succeeds, later political bot, order interpretation, and optional LLM layers will sit on top of a commander that already behaves like a coherent decision-maker.

---

## 1. Existing Scaffolding

The good news is that the repo already has a strong structural base for this milestone.

### 1.1 Existing commander pipeline

The per-corps loop already exists and is cleanly segmented:

- `briefing.ts` - structured input assembly
- `assess.ts` - zone / force / threat assessment
- `allocate.ts` - garrison and surplus allocation
- `plan.ts` - multi-turn intention management
- `decide.ts` - reactive stance, reserve, and intel adaptation
- `emit.ts` - bridge back into existing execution pipeline
- `commander_loop.ts` - orchestration and state application

This is the correct seamful architecture for a maturity pass.

### 1.2 Existing persistent state

`commander_state.ts` already defines several useful persistence hooks:

- `CommanderState`
- `CommanderPlan`
- `IntelPicture`
- `SectorActivityEntry`
- `OperationHistoryEntry`
- `ThreatAssessment`
- `ForceAssessment`

This means `v0.8.1` does **not** need to invent a persistence model from scratch.
It needs to deepen and reorganize the one that already exists.

### 1.3 Existing plan and memory hints

The current system already has early forms of:

- multi-turn plans
- intel confidence
- operation history
- sector activity logging
- officer personality
- reinforcement requests

Those are not yet a mature reasoning system, but they are the right scaffolding for one.

### 1.4 Existing test base

The repo already has `tests/commander/commander.test.ts` covering:

- zone detection
- force evaluation
- allocation
- planning
- commander loop integration

This provides a safe place to add maturity tests rather than building the whole QA surface from zero.

### 1.5 Existing limitations that v0.8.1 must not ignore

The current commander still leans heavily on:

- threshold logic
- single-plan lifecycle thinking
- direct readings of current state
- legacy output translation through `emit.ts`

So the maturity pass must add reasoning depth **without pretending these limits do not exist**.

---

## 2. What This Milestone Must Deliver

Per roadmap, `v0.8.1` is done only when all of the following are true:

1. belief state exists separately from raw world state
2. candidate intents compete
3. memory affects future scoring
4. constraints and preferences are structurally distinct
5. reasoning traces exist
6. relationship model exists

This plan turns those six conditions into phased implementation work.

---

## 3. Design Decisions

### 3.1 Deterministic first, always

No stochastic cognition layer.
No LLM dependency.
No flavor-first reasoning.

Everything added here must remain:

- deterministic
- inspectable
- testable
- replay-safe

### 3.2 Extend the current commander state instead of bypassing it

`CommanderState` is the correct home for new persistent reasoning data.

Do not create a parallel “smart commander cache” living outside corps command state.

### 3.3 Candidate competition instead of branch explosion

The right upgrade is not “more if-statements.”
It is:

- generate a small set of candidate intents
- score them with explicit factors
- choose one
- record why it won

### 3.4 Explanation trace is a system feature, not a debug afterthought

Every major maturity feature should emit a structured explanation trace.

Without traces, future debugging and UI briefing work will collapse into guesswork.

### 3.5 Relationship model is functional, not decorative

Relationship tracking is not for lore.
It must directly support:

- future order interpretation
- trust-sensitive compliance
- sibling-cooperation logic
- patron/player dependence

---

## 4. Proposed State Additions

The following additions are recommended in `commander_state.ts`.

### 4.1 Belief state

Add a persistent belief layer, distinct from raw world truth:

```typescript
export interface ZoneBelief {
    readonly zone_id: ZoneId;
    readonly estimated_enemy_strength: number;
    readonly estimated_enemy_intent: 'hold' | 'probe' | 'attack' | 'mass' | 'unknown';
    readonly confidence: number;
    readonly last_confirmed_turn: number;
}
```

```typescript
export interface CommanderBeliefState {
    readonly zone_beliefs: readonly ZoneBelief[];
    readonly supply_continuity_confidence: number;
    readonly subordinate_reliability: Readonly<Record<string, number>>;
    readonly neighbor_support_confidence: Readonly<Record<string, number>>;
}
```

### 4.2 Relationship model

```typescript
export interface CommanderRelationships {
    readonly player_trust: number;
    readonly sibling_corps_trust: Readonly<Record<FormationId, number>>;
    readonly patron_alignment: number;
}
```

This can start simple and deepen later.

### 4.3 Lesson-based memory

```typescript
export interface CommanderLesson {
    readonly lesson_id: string;
    readonly category: 'offensive_failure' | 'reserve_misuse' | 'intel_surprise' | 'staging_delay' | 'success_pattern';
    readonly zone_id?: ZoneId;
    readonly weight: number;
    readonly created_turn: number;
    readonly expires_turn?: number;
}
```

### 4.4 Candidate intent and trace types

```typescript
export type CommanderIntentType =
    | 'hold_line'
    | 'reinforce_zone'
    | 'stage_operation'
    | 'launch_opportunity'
    | 'thin_quiet_sector'
    | 'recall_exposed_brigades'
    | 'request_army_support';
```

```typescript
export interface CommanderIntentCandidate {
    readonly intent_id: string;
    readonly type: CommanderIntentType;
    readonly target_zone?: ZoneId;
    readonly score: number;
    readonly score_breakdown: Readonly<Record<string, number>>;
    readonly blocked_by: readonly string[];
}
```

```typescript
export interface CommanderDecisionTrace {
    readonly turn: number;
    readonly winning_intent_id: string | null;
    readonly candidates: readonly CommanderIntentCandidate[];
    readonly hard_constraints: readonly string[];
    readonly lessons_applied: readonly string[];
}
```

### 4.5 CommanderState extension

Add:

- `belief_state`
- `relationships`
- `lessons`
- `decision_trace`

to `CommanderState`.

---

## 5. Pyrrhic Execution Plan

All phases below are discrete Pyrrhic phases with explicit ownership, deliverables, gates, and mandatory simplify/verification discipline.

### Phase 1. State And Type Foundation (~1-2 sessions)

**Assigned to:** Systems Programmer + Gameplay Programmer  
**Reviewer:** `/simplify`, Code Review  
**Sign-off:** Orchestrator, Architect, War-or-Game

Goal:
Add the missing state and type scaffolding without changing live behavior too aggressively.

Tasks:

- [ ] `src/sim/combat/commander/commander_state.ts` - add belief, relationship, lesson, candidate-intent, and trace types; scope = state schema only
- [ ] `src/sim/combat/commander/commander_loop.ts` - add safe defaults / initialization wiring; scope = preserve old behavior while new fields exist
- [ ] Serialization / migration layer - add coverage if any new structures require it; scope = deterministic persistence compatibility
- [ ] `tests/commander/commander.test.ts` or helper fixture file - add mature-state fixture builders; scope = test scaffolding only

**Deliverables:**
- new commander maturity state schema
- deterministic default initialization path
- reusable test fixtures for new state

**Done gate:**
- new types compile
- old commander loop still runs with sensible defaults
- tests can construct mature-state fixtures without hacks

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

### Phase 2. Belief Layer In `briefing.ts` And `decide.ts` (~1-2 sessions)

**Assigned to:** Gameplay Programmer  
**Reviewer:** `/simplify`, Code Review  
**Sign-off:** Orchestrator, Architect, War-or-Game

Goal:
Stop the commander from reading the battlefield too directly.

Tasks:

- [ ] `src/sim/combat/commander/briefing.ts` - add belief assembly/update helpers that transform raw intel and recent events into `CommanderBeliefState`
- [ ] `src/sim/combat/commander/decide.ts` - update beliefs each turn rather than only computing confidence deltas
- [ ] `src/sim/combat/commander/commander_loop.ts` - keep raw state available in `CommanderBriefing`, but route decision logic through belief objects where possible
- [ ] Tests - prove separation between observed truth, inferred enemy intent, and confidence

**Deliverables:**
- persistent belief state update loop
- deterministic confidence handling
- first commander decisions reading belief instead of raw state

**Done gate:**
- beliefs persist across turns
- confidence is explicitly stored and updated
- at least some decisions read belief state rather than direct raw signals

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

### Phase 3. Candidate Intent Competition In `plan.ts` (~1-2 sessions)

**Assigned to:** Gameplay Programmer + Systems Programmer  
**Reviewer:** `/simplify`, Code Review  
**Sign-off:** Orchestrator, Architect, War-or-Game

Goal:
Replace the single-plan tunnel with explicit option competition.

Tasks:

- [ ] `src/sim/combat/commander/plan.ts` - introduce a bounded candidate generation step each turn
- [ ] `src/sim/combat/commander/plan.ts` - generate 2-5 plausible intents from posture, surplus, threats, and current plan history
- [ ] `src/sim/combat/commander/plan.ts` - score candidates using pressure, opportunity, logistics confidence, personality, lessons, and relationships
- [ ] `src/sim/combat/commander/emit.ts` / `allocate.ts` - convert winning intent into a `CommanderPlan` or explicit non-plan action path without silent bridge rescoring

**Deliverables:**
- explicit candidate-intent generation
- deterministic candidate scoring
- winner/loser intent visibility

**Done gate:**
- command behavior is no longer "only this plan or nothing"
- candidate comparison is explicit and inspectable
- a losing-but-plausible intent can be seen in traces

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

### Phase 4. Lesson Memory And Relationship Effects (~1 session)

**Assigned to:** Gameplay Programmer  
**Reviewer:** `/simplify`, Code Review  
**Sign-off:** Orchestrator, Architect, War-or-Game

Goal:
Make prior outcomes shape future choices.

Tasks:

- [ ] `src/sim/combat/commander/decide.ts` / `plan.ts` - convert operation history and sector activity into reusable lessons
- [ ] `src/sim/combat/commander/commander_state.ts` - add lesson decay or expiry to avoid infinite memory bloat
- [ ] State + scoring path - add relationship values for player trust, sibling corps trust, and patron alignment
- [ ] Candidate scoring - feed lessons and relationships into the winner-selection model

**Deliverables:**
- lesson creation/decay model
- functional relationship model
- scoring impact from prior outcomes and trust

**Done gate:**
- a repeated failure in one zone lowers future offensive appetite there
- some reserve or support choices are visibly affected by trust/relationship terms
- lessons can be named in decision traces

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

### Phase 5. Constraints vs Preferences Separation (~1 session)

**Assigned to:** Systems Programmer + Technical Architect  
**Reviewer:** `/simplify`, Code Review  
**Sign-off:** Orchestrator, Architect, War-or-Game

Goal:
Make the reasoning model legible instead of mixing all weights together.

Tasks:

- [ ] `src/sim/combat/commander/plan.ts` - define the hard-constraint / soft-preference / contextual-pressure distinction in one consistent scoring model
- [ ] `src/sim/combat/commander/plan.ts` - make blocked candidates record which hard constraint excluded them
- [ ] `src/sim/combat/commander/emit.ts` - stop execution bridge logic from silently re-scoring or mutating strategic intent semantics
- [ ] Engineering comments / ADR note - flag any architectural decisions for user review if command data flow changes

**Deliverables:**
- explicit constraint vocabulary
- blocked-candidate reason recording
- stable handoff from reasoning to execution bridge

**Done gate:**
- engineers can point at a rejected candidate and say whether it failed because it was impossible or merely unattractive
- later order-interpretation work has a stable base for "refusal," "delay," or "creative compliance"

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

### Phase 6. Decision Traces And QA Surface (~1-2 sessions)

**Assigned to:** QA Engineer + Gameplay Programmer  
**Reviewer:** `/simplify`, Code Review  
**Sign-off:** Orchestrator, Architect, War-or-Game

Goal:
Make the new cognition debuggable and later exposable to UI.

Tasks:

- [ ] `src/sim/combat/commander/emit.ts` / `commander_loop.ts` - emit structured decision traces every turn into `CommanderState`
- [ ] Debug helpers / logs - surface trace output in a deterministic, engineer-readable form
- [ ] `tests/commander/commander.test.ts` - add belief, candidate, lesson, and trace coverage
- [ ] Integration test - prove that prior-turn failure can change a later intent choice

**Deliverables:**
- structured commander decision trace
- deterministic QA surface for reasoning
- regression and integration coverage for the maturity model

**Done gate:**
- each turn has a traceable winning intent
- candidate scoring is testable
- later UI work has a real data source for commander briefings and order interpretation reasons

→ `/simplify` → smoke-test triad → verification-before-completion → pre-commit-check → commit

---

## 6. Recommended Acceptance Test Matrix

The milestone should not be considered done without tests in these buckets:

### Belief tests

- belief confidence rises with contact and corroborating signals
- belief confidence decays or stays bounded without confirmation
- inferred enemy intent changes when signs change

### Candidate competition tests

- multiple valid intents are generated in the same turn
- candidate scoring is deterministic
- the winning candidate changes when key weights or lessons change

### Lesson memory tests

- failed offensive reduces score for similar repeat intent
- successful offensive increases similar future appetite, within bounds
- lessons expire or decay deterministically

### Relationship tests

- low trust / low alignment affects chosen intent or support request behavior
- relationship state persists across turns

### Trace tests

- trace contains at least one winning candidate and at least one rejected alternative when multiple options exist
- blocked candidates record hard-constraint reasons

### Regression tests

- no new nondeterminism
- old `v0.8.0` commander tests still pass unless intentionally superseded

---

## 7. Non-Goals

This milestone should **not** do the following:

- political leader bot behavior
- player-order interpretation / refusal UI
- freeform LLM integration
- ops lifecycle cleanup that belongs in `v0.8.x-final`
- UI-heavy commander narrative polish

Those are separate milestones or prerequisites.

---

## 8. Risks

### Risk 1. Smarter-looking branch jungle

Bad version:
more thresholds, more branches, more constants, same architecture.

Mitigation:
force candidate generation + scoring + traces.

### Risk 2. Belief layer that is only renamed raw state

Bad version:
copy raw state into belief fields without actual inference or persistence.

Mitigation:
test for belief persistence and divergence from immediate raw state.

### Risk 3. Trace output becomes prose theater

Bad version:
friendly strings with no structured reasoning value.

Mitigation:
make traces structured data first; prose is optional later.

### Risk 4. Relationship model becomes decorative

Bad version:
trust fields exist but never influence scores.

Mitigation:
require relationship-sensitive scoring tests before milestone sign-off.

### Risk 5. `emit.ts` continues to collapse rich intent into thin legacy outputs

Bad version:
internal model improves, but meaningful information is lost before execution/debugging.

Mitigation:
keep trace and structured metadata in `CommanderState` even if downstream execution bridge stays thin for now.

---

## 9. Implementation Order

Recommended order for engineers:

1. state and types
2. belief layer
3. candidate intent generation/scoring
4. lesson memory
5. relationship effects
6. trace output
7. regression and integration test sweep

This order matters because later phases depend on persistent state and inspectable candidate scoring.

## 10. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect decisions that change state shape, data flow, or execution boundaries are flagged for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is appended when behavior or milestone status materially changes
- [ ] `docs/life_lessons.md` is scanned before each phase and relevant lessons are named in the phase kickoff
- [ ] `npx tsc --noEmit`, `npm run test:vitest`, and `npm run desktop:map:build` run after every phase
- [ ] `/verification-before-completion` and `/awwv-pre-commit-check` are run before claiming a phase complete
- [ ] One logical phase change per commit; engine and pure UI work remain in separate commits
- [ ] `/create-report` produces a completion report in `docs/40_reports/implemented/` when the milestone closes

## 11. Completion Checklist

- [ ] Completion report created in `docs/40_reports/implemented/` using the milestone implementation report format
- [ ] `docs/plans/MASTER_ROADMAP.md` updated if scope, gate, or status changed during execution
- [ ] `docs/40_reports/audits/20260330_REPO_HEALTH_CONSOLIDATED.md` updated if the architectural target changed materially
- [ ] `docs/PROJECT_LEDGER.md` appended with milestone completion / major phase notes
- [ ] `.claude/napkin.md` updated with any new recurring commander maturity lessons
- [ ] Relevant canon / engineering docs propagated if state shape or command model changed
- [ ] `package.json` version bumped when the milestone completes
- [ ] version tag created and pushed when the milestone completes

---

## 12. What This Unblocks

If `v0.8.1` is done correctly, it unlocks:

- `v0.8.2` political bot built on a real military substrate
- `v0.8.3` order interpretation built on real trust and reasoning traces
- future commander-facing SITREP UI that reports actual structured reasons
- later optional LLM layers that narrate or extend a coherent deterministic system rather than replacing one

---

## 13. Summary For Implementers

The repo already has the right shell for `v0.8.1`.
The work is not to replace the commander loop.
The work is to deepen it in-place.

The shortest implementation brief is:

- extend `CommanderState`
- add a persistent belief model
- generate and score multiple candidate intents
- make lessons and relationships affect those scores
- emit structured decision traces
- prove it with deterministic tests

If the milestone ends with “more parameters but still one-path threshold logic,” it failed.
