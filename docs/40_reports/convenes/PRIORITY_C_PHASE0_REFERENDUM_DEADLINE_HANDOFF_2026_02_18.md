# Priority (C): Phase 0 Referendum / Deadline Fix — Handoff

**Date:** 2026-02-18  
**Authority:** Orchestrator (per state-of-game meeting 2026-02-17, option C)  
**Single priority:** Phase 0 referendum and eligibility-deadline alignment so scheduled referendum can fire before Phase 0 terminates.

**Reference:** [PARADOX_STATE_OF_GAME_MEETING_2026_02_17.md](PARADOX_STATE_OF_GAME_MEETING_2026_02_17.md) §13 — (A) and (B) complete; (C) Phase 0 referendum/deadline fix when blocking play.

**Implementation complete (2026-02-18):** Single source of truth in `buildPhase0TurnOptions`: referendum options (deadlineTurns, scheduledReferendumTurn, scheduledWarStartTurn) are derived from `meta.phase_0_scheduled_referendum_turn` and `meta.phase_0_scheduled_war_start_turn`. Callers (run_phase0_turn.ts, state/turn_pipeline.ts) use built options without override. Test added: deadline from schedule so no early non_war_terminal.

---

## 1. Scope

Ensure that when a scenario **schedules a referendum later than the default 12-turn eligibility deadline** (e.g. Nov/Jan declaration windows in Sep 1991 starts), Phase 0 does **not** hit `non_war_terminal` before the scheduled referendum can fire. Align scenario schedule and `deadlineTurns` everywhere: scenario init, scenario_runner, and desktop/warroom Phase 0 turn execution.

- **In scope:** (1) Define intended behavior in one sentence (Game Designer). (2) Ensure `deadlineTurns` is derived from scenario schedule (e.g. `scheduledReferendumTurn + 1`) whenever the scenario has a scheduled referendum turn, so eligibility deadline is not earlier than the scheduled event. (3) Verify all Phase 0 entry points pass the correct referendum options (state pipeline, run_phase0_turn, scenario runner if it runs Phase 0). (4) Optional: Sep 1991 / Phase 0 scenario sanity check (referendum fires at scheduled turn, then transition to Phase I).
- **Out of scope:** New Phase 0 mechanics; declaration pressure or threshold tuning; full Sep 1991 calibration.

---

## 2. Design intent (Game Designer)

- **Goal:** For scenarios that schedule a referendum at a specific turn (e.g. `phase_0_referendum_turn` / `phase_0_scheduled_referendum_turn`), the eligibility deadline must be at or after that turn so Phase 0 does not end in `non_war_terminal` before the scheduled referendum can fire.
- **Constraint:** Default (no scheduled referendum) remains 12-turn eligibility deadline; only when schedule is set do we extend deadline from schedule.
- **Canon:** Phase 0 Specification §4.5 (referendum, war delay); napkin "Phase 0 scheduled referendum vs deadline trap" (2026-02-16).

---

## 3. Acceptance criteria

| Criterion | Owner | Check |
|-----------|--------|--------|
| When scenario sets `phase_0_scheduled_referendum_turn` (or equivalent), `deadlineTurns` used in `updateReferendumEligibility` is at least `scheduledReferendumTurn + 1` (or schedule-based) so deadline ≥ scheduled turn | Gameplay Programmer | Code + init path review |
| All Phase 0 turn entry points (state pipeline, warroom run_phase0_turn, runner) pass referendum options derived from `meta.phase_0_scheduled_referendum_turn` when present | Gameplay Programmer | Trace and test |
| No regression: scenarios without scheduled referendum still use default 12-turn deadline | QA / Gameplay Programmer | Phase 0 test or fixture |
| Optional: Sep 1991 scenario runs to scheduled referendum turn and holds referendum, then transitions to Phase I | Scenario-creator-runner-tester | Manual or harness run |

---

## 4. Implementation hints

- **Napkin:** "If a scenario schedules referendum later than the default 12-turn eligibility deadline, set `deadlineTurns` from schedule (e.g. `scheduledReferendumTurn + 1`) or Phase 0 will hit `non_war_terminal` before the scheduled event can fire."
- **Existing code:** `run_phase0_turn.ts` and `state/turn_pipeline.ts` already pass `deadlineTurns: refTurn + 1` and `scheduledReferendumTurn: refTurn` when `meta.phase_0_scheduled_referendum_turn` is set. Confirm scenario_runner and any other Phase 0 init/run paths set `phase_0_scheduled_referendum_turn` from scenario and that no path uses default 12 without considering schedule.
- **Referendum module:** `src/phase0/referendum.ts` — `REFERENDUM_DEADLINE_TURNS_DEFAULT = 12`; `updateReferendumEligibility(options.deadlineTurns ?? default)`; `applyScheduledReferendum(scheduledReferendumTurn)`. Options must be supplied by callers from state/scenario.

---

## 5. Owners and handoff

| Role | Responsibility |
|------|-----------------|
| **Game Designer** | Confirm one-sentence intended behavior and sign-off on deadline-from-schedule rule. |
| **Gameplay Programmer** | Implement or verify deadline/schedule alignment in all Phase 0 paths; add or extend test if needed. |
| **Scenario-creator-runner-tester** | Optional: sanity-check Sep 1991 (or scheduled referendum) scenario for referendum firing and Phase I transition. |
| **Process QA** | After implementation, invoke quality-assurance-process for sign-off if needed. |

---

## 6. References

- [PARADOX_STATE_OF_GAME_MEETING_2026_02_17.md](PARADOX_STATE_OF_GAME_MEETING_2026_02_17.md) §13 (options A–D; C = Phase 0 referendum/deadline fix)
- [CONSOLIDATED_BACKLOG.md](../CONSOLIDATED_BACKLOG.md) §4 (Phase 0 referendum/deadline), §6 (convenes)
- .agent/napkin.md — "Phase 0 scheduled referendum vs deadline trap"
- Phase 0 Specification (referendum, war start delay)
