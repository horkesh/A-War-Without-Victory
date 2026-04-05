# v0.8.1 Phase 6 — Decision Traces and QA Surface

**Date:** 2026-04-05
**Type:** Implementation — v0.8.1 Commander Maturity Phase 6
**Phase in series:** 6 of 6 (milestone closeout)
**Status:** ACCEPTED
**Baseline:** n1323 — 94.0%, 27/27 anchors, 6/6 benchmarks
**Verification:** tsc clean, 2498/2498 vitest (175 files)

---

## Purpose

Phase 6 closes the v0.8.1 commander maturity milestone by ensuring every planning path emits a traceable `CommanderDecisionTrace`. Phases 1–5 established the belief model, candidate competition, lesson memory, constraint/preference separation, and relationship effects — but `advanceExistingPlan()` still had four advancement paths (abandon by viability, abandon by suspension timeout, new suspension, and successful launch) that produced no trace entry. An engineer inspecting `CommanderState.decision_trace` after a multi-turn plan lifecycle could see the competition result from when the plan was created but had no record of what happened on subsequent advancement turns. Phase 6 fills this gap: lifecycle traces are now emitted on all four active `advanceExistingPlan()` paths, inert paths carry forward the last trace via `buildUpdatedState()` carry-forward semantics, and `commander_debug.ts` provides a deterministic pure-function formatter that renders the full belief/candidate/lesson/relationship/lifecycle picture for any trace object.

---

## Deliverables

### 1. Lifecycle Traces in advanceExistingPlan()

`advanceExistingPlan()` manages an existing plan across turns. Of its eight internal paths, four are active (they change plan state) and four are inert (plan continues unchanged). Active paths now emit a `decision_trace` populated into `CommanderState`. Inert paths rely on carry-forward in `buildUpdatedState()`, which preserves the most recent `decision_trace` without overwriting it — this is correct because the decision that produced the current plan state is still the authoritative trace until the plan state changes.

| Path | hard_constraint ID | winning_intent_id | Notes |
|---|---|---|---|
| abandon-by-viability | `plan_abandoned_viability` | (none) | Plan viability fell below threshold; plan cleared |
| abandon-by-suspension-timeout | `plan_abandoned_suspension_timeout` | (none) | `suspendedTurns` exceeded `MAX_SUSPENSION_TURNS`; plan cleared |
| new-suspension | `plan_suspended_<slug>` | (none) | Slug derived from suspension reason; plan enters suspended state |
| launched | `plan_ready_for_launch` | `plan.plan_id` | Plan cleared launch checks; handed to execution pipeline |

The four inert paths (plan already suspended, plan waiting for conditions, plan in preparation, plan executing) do not emit new traces — they carry forward the last active-path trace. This is intentional: the reason a plan is in its current state was recorded when the state last changed. Emitting a "no change" trace on every inert turn would produce noise without informational content.

---

### 2. commander_debug.ts

`commander_debug.ts` is a new pure-function file at `src/sim/combat/commander/commander_debug.ts`. It has no imports from game logic, state, or simulation code — only from `./types`. This keeps it safe to call from test harnesses, scenario runners, and future debug UIs without pulling in the full simulation graph.

**`formatDecisionTrace(trace: CommanderDecisionTrace | null | undefined): string`**

Produces deterministic multi-line engineer-readable output covering:

- Header line with corps ID, turn number, and lifecycle annotation: `[LAUNCHED]`, `[ABANDONED]`, or `[SUSPENDED]` when the trace records a lifecycle event; no annotation on competition-only traces.
- Winner block: `winning_intent_id` when present; `(no winner)` otherwise.
- Candidate list: each candidate annotated `[WINNER]`, `[BLOCKED]`, or `[LOSER]` based on whether it matches the winner, has non-empty `blocked_by`, or simply lost on score. Score, `score_breakdown` components, and `blocked_by` reasons are shown per candidate.
- Hard constraints: `hard_constraints[]` entries, one per line.
- Lessons applied: `lessons_applied[]` entries.
- Relationships applied: `relationships_applied[]` entries.
- Returns `"(no trace)"` gracefully when called with `null` or `undefined`.

**`formatTraceHeader(trace: CommanderDecisionTrace | null | undefined): string`**

One-liner variant: returns a single line with corps ID, turn, winner (or hard-constraint), and lifecycle annotation. Suitable for log scanning without the full candidate breakdown.

Both functions are deterministic: same input always produces identical output. No timestamps, no random ordering, no side effects.

---

### 3. Version Bump to v0.8.1

`package.json` version: `"0.8.0"` → `"0.8.1"`

---

## v0.8.1 Milestone Completion

All six maturity conditions defined in the 2026-03-31 planning documents are now met.

| Condition | Delivered by | Status |
|---|---|---|
| Belief state separate from raw world state | Phase 2 | Complete |
| Candidate intents compete | Phase 3 | Complete |
| Memory affects future scoring | Phase 4 | Complete |
| Constraints and preferences structurally distinct | Phase 5 | Complete |
| Reasoning traces exist | Phase 3 + 5 + 6 | Complete (Phase 6 closes) |
| Relationship model exists | Phase 1 + 5 | Complete |

Phase 3 introduced competition-round traces and `winning_intent_id`. Phase 5 added `managePlan()` early-return stubs covering all six pre-competition exits. Phase 6 adds the remaining four lifecycle events in `advanceExistingPlan()`, meaning every path through the full planning pipeline — creation, early exit, multi-turn advancement, final disposition — now produces or preserves a `CommanderDecisionTrace`.

---

## Hard Guards

- Lifecycle traces use the existing `hard_constraints` field in `CommanderDecisionTrace`. No new state schema fields were added.
- No changes to `GameState` schema. Saves from before Phase 6 load cleanly.
- Carry-forward semantics in `buildUpdatedState()` preserve the last active-path `decision_trace` on all inert advancement turns. Inert paths do not overwrite a competition trace with a null.
- `formatDecisionTrace` and `formatTraceHeader` are pure: no side effects, no game logic imports, no state mutation.

---

## Files Changed

| File | Change |
|---|---|
| `src/sim/combat/commander/managePlan.ts` | Lifecycle traces added to 4 `advanceExistingPlan()` paths (abandon-viability, abandon-suspension-timeout, new-suspension, launched) |
| `src/sim/combat/commander/commander_debug.ts` | New file: `formatDecisionTrace()` + `formatTraceHeader()` pure formatter |
| `package.json` | Version bumped `0.8.0` → `0.8.1` |

---

## Tests

14 targeted Phase 6 tests in `tests/commander/commander_phase6_trace_qa.test.ts`:

| Category | Count | Coverage |
|---|---|---|
| Lifecycle traces in advanceExistingPlan() | 6 | Abandon-viability, abandon-suspension-timeout, new-suspension, launched emit correct decision_trace; inert path (clearing) emits no trace; relationships_applied always [] |
| formatDecisionTrace() / formatTraceHeader() | 5 | undefined → "no trace"; [WINNER]/[BLOCKED]/[LOSER] labels present; lifecycle [LAUNCHED]/[ABANDONED] annotations; deterministic (same input → same output); single-line header |
| Multi-turn causality integration | 2 | offensive_failure lesson suppresses stage_operation score_breakdown; lesson weight change shifts winner score by ~0.35 |
| Trace structural invariant | 1 | Competition trace has ≥ 2 candidates when multiple intents are valid |

---

## Verification Results

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2484/2484 before QA tests

---

## Key Finding

The v0.8.1 commander maturity model is now complete. Every planning path is traceable — competition traces record why a plan was created, lifecycle traces record why it was abandoned, suspended, or launched, and carry-forward semantics preserve the most recent decision on inert advancement turns. `formatDecisionTrace()` provides an immediately usable engineer-facing view of the full trace structure: candidates ranked and annotated, score breakdowns itemized, hard constraints and relationship effects surfaced. The six maturity conditions first defined in the 2026-03-31 plan are all met. The commander is no longer a threshold machine with an undocumented decision path — it is a deterministic reasoner whose every significant planning choice is inspectable after the fact.

---

## Deferred to Later Phases

| Item | Target |
|---|---|
| Relationship mutation/decay model (how trust values change over time) | v0.8.3+ |
| Additional lesson categories (defensive_failure, reserve_misuse, intel_surprise, staging_delay) | v0.8.3 |
| Zone-specific lesson routing for corps-level intents | v0.8.3 |
| UI exposure of `decision_trace` | v0.9+ |

---

## Recommended Next Milestone

**v0.8.2 — Political Leader Bot + Patron Phone Call:** Faction-specific political personalities for non-player leaders (Karadzic, Izetbegovic, Boban), patron pressure phone call events with ICTY-sourced dialogue, and dual-track evaluator blending military situation with strategic dimensions. Gate: v0.8.1 Commander Maturity complete (now closed).
