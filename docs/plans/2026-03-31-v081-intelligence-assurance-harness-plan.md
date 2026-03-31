# v0.8.1 Intelligence Assurance Harness

**Date:** 2026-03-31  
**Status:** PLAN - READY FOR EXECUTION ONCE GATE OPENS  
**Roadmap slot:** v0.8.1  
**Overseer:** Orchestrator  
**Architect:** Technical Architect / Architect - may define proof surfaces, but architectural changes must be flagged for user review  
**Primary implementer roles:** Gameplay Programmer, QA Engineer, Systems Programmer  
**Primary reviewer roles:** Code Simplifier (`/simplify`) minimum every phase; QA Engineer; War-or-Game for realism smell test  
**Gate:** Starts only once `v0.8.0` P0 is fixed and `v0.8.1` commander maturity implementation is active enough that traces, beliefs, and candidate intents exist to audit  
**Prerequisites:** `docs/plans/2026-03-31-v081-commander-maturity-plan.md`; commander trace data exists in a structured form; deterministic scenario harness remains green  
**Authoring basis:** `MASTER_ROADMAP.md`, `20260330_REPO_HEALTH_CONSOLIDATED.md`, `2026-03-30-v080-corps-commander-intelligence-architecture.md`

**Relevant life lessons to respect while executing:**
- `docs/life_lessons.md`: Decisions without traces are undebuggable - instrument before investigating
- `docs/life_lessons.md`: Calibration % means nothing if reached through broken mechanics
- `docs/life_lessons.md`: Build diagnostic tools, not one-off scripts
- `docs/life_lessons.md`: Validate internal consistency after every run, not just calibration %

---

## 0. Purpose

This plan exists to stop the project from calling the corps commander “intelligent” just because it sounds richer or has more thresholds.

`v0.8.1` needs a proof harness that can answer:

- is the commander using belief instead of raw state?
- are multiple intents actually competing?
- does memory change later choices?
- are hard constraints distinct from soft preferences?
- can a reviewer see why a bad or surprising decision happened?

If the project cannot prove those things, it does not have intelligence.
It has better-decorated rails.

---

## 1. Deliverables

- a deterministic intelligence-assurance checklist tied to commander traces
- repeatable sampled corps scenarios that exercise distinct reasoning patterns
- anti-theater checks for fake flexibility, hidden overrides, and non-functional personality
- QA-facing trace review outputs that let implementers and owner judge commander behavior without guesswork
- clear milestone proof criteria for “intelligent enough to proceed” vs “not yet”

---

## 2. Proof Contract

The harness must prove all of the following:

1. **Belief proof:** at least one decision path reads persisted belief that can differ from immediate raw truth.
2. **Competition proof:** at least two plausible candidates are generated and the loser is visible.
3. **Memory proof:** a prior success/failure changes a later score or choice.
4. **Constraint proof:** at least one candidate is blocked by a hard rule and at least one loses as a soft preference tradeoff.
5. **Trace proof:** the system can explain a decision in structured data, not prose theater.
6. **Override proof:** downstream execution did not silently replace the winning intent with unrelated legacy rails.

---

## 3. Pyrrhic Execution Plan

### Phase 1. Assurance Spec And Audit Vocabulary (~1 session)

**Assigned to:** Technical Architect + QA Engineer

- [ ] `docs/plans/2026-03-30-v080-corps-commander-intelligence-architecture.md` - align assurance language and audit vocabulary; scope = docs only
- [ ] `tests/commander/` - identify fixture families needed for offensive, defensive, reactive, and degraded-confidence cases; scope = test planning only
- [ ] `docs/20_engineering/` or test helper docs - define anti-theater vocabulary: fake competition, hidden override, decorative relationship, raw-state masquerade; scope = reusable review language

**Gate:**
- proof vocabulary exists and is stable enough that implementers and reviewers are talking about the same failure modes

→ `/simplify` → commit

### Phase 2. Deterministic Scenario Fixtures (~1-2 sessions)

**Assigned to:** Gameplay Programmer + QA Engineer

- [ ] `tests/commander/commander.test.ts` and/or new fixture helpers - add deterministic sampled corps situations that force multiple options
- [ ] `tests/commander/` - add at least one repeated-failure scenario and one ambiguous-opportunity scenario
- [ ] scenario harness notes - define which small fixtures are enough for assurance without requiring full 40-week runs every time

**Gate:**
- fixture set covers success, failure, ambiguity, degraded confidence, and blocked-intent cases

→ `/simplify` → commit

### Phase 3. Trace Assertions And Anti-Theater Checks (~1-2 sessions)

**Assigned to:** QA Engineer + Systems Programmer

- [ ] commander trace tests - assert presence of winning intent, losing intent, hard constraints, lesson application, and belief inputs
- [ ] anti-theater tests - fail if “candidate competition” is effectively one candidate plus placeholders
- [ ] anti-theater tests - fail if relationship fields exist but never affect scores
- [ ] anti-theater tests - fail if execution output contradicts the winning structured intent without an explicit bridge reason

**Gate:**
- test suite can catch the main fake-intelligence failure modes automatically

→ `/simplify` → commit

### Phase 4. Review Surface And Human Judgment Loop (~1 session)

**Assigned to:** QA Engineer + Documentation Specialist

- [ ] create a compact reviewer-facing trace output or report format for sampled corps turns
- [ ] define the minimum review loop for “intelligence assurance” sign-off in milestone execution notes
- [ ] document what evidence the owner, Orchestrator, and War-or-Game should expect before calling the commander mature

**Gate:**
- a human reviewer can inspect a small sample and tell whether the commander is truly reasoning

→ `/simplify` → commit

### Phase 5. Milestone Done-Means Integration (~1 session)

**Assigned to:** Product Manager + Documentation Specialist

- [ ] `docs/plans/MASTER_ROADMAP.md` - keep done-means aligned with the final harness
- [ ] `docs/plans/2026-03-31-v081-commander-maturity-plan.md` - ensure acceptance criteria reference this harness
- [ ] `docs/40_reports/audits/20260330_REPO_HEALTH_CONSOLIDATED.md` - keep anti-theater criteria synced if implementation changes them materially

**Gate:**
- roadmap, plan, and audit all point at the same proof contract

→ `/simplify` → commit

---

## 4. Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect decisions that change proof semantics are flagged for user review
- [ ] `.claude/napkin.md` is read at session start and updated during execution
- [ ] `docs/PROJECT_LEDGER.md` is appended when the harness meaningfully changes workflow or milestone proof
- [ ] `docs/life_lessons.md` is scanned before each phase
- [ ] `npx tsc --noEmit`, `npm run test:vitest`, and `npm run desktop:map:build` run after every engine-touching phase
- [ ] `/verification-before-completion` and `/awwv-pre-commit-check` run before claiming the harness is complete
- [ ] One logical phase change per commit
- [ ] `/create-report` produces a completion report in `docs/40_reports/implemented/` when the harness closes

## 5. Completion Checklist

- [ ] deterministic assurance fixtures exist
- [ ] anti-theater checks exist and fail for fake competition / fake memory / fake relationship use
- [ ] reviewer-facing trace output exists
- [ ] roadmap and commander maturity plan reference the same proof contract
- [ ] `docs/PROJECT_LEDGER.md` appended
- [ ] `.claude/napkin.md` updated with recurring assurance lessons
- [ ] implementation report created in `docs/40_reports/implemented/`
- [ ] version bump/tag handled if this closes with the milestone

---

## 6. Success Criteria

- [ ] A reviewer can inspect a small deterministic sample and explain why a corps chose one intent over another
- [ ] The harness can prove memory changed a later choice
- [ ] The harness can prove at least one blocked candidate failed because of a hard constraint, not a low score
- [ ] The harness can catch decorative “intelligence” that does not actually alter decisions
- [ ] The project has an explicit, reusable standard for saying “this commander is intelligent enough to proceed”
