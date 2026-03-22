# Night Shift Handoff — 2026-03-22 (Evening)

## Plans to Execute

### Primary: v0.6.0 Gate Completion
**Plan:** `docs/plans/2026-03-22-v060-gate-completion-plan.md`
**Tasks:** 5 tasks, execution order specified in plan
**Priority:** Tasks 4 (VERSIONING), 1 (Event Decision IPC), 2 (Pressure), 3 (Notification), 5 (Briefing decisions)
**Parallelizable:** Tasks 1, 2, 3 are independent. Task 5 depends on Task 1.

### Scope
Close the v0.6.0 merge gate: player can respond to event decisions, pressure indicators visible, consequence events auto-dismiss.

## Execution Order

1. **Task 4** — VERSIONING.md update (housekeeping, 10 min)
2. **Task 1** — Event Decision IPC wiring (critical path, ~1 hr)
3. **Task 2** — Pressure indicators (independent, ~30 min)
4. **Task 3** — Notification UI for consequence events (~30 min)
5. **Task 5** — Pending decisions in SituationBriefing (~20 min)

## Special Instructions

- **UI-only changes.** Zero engine or calibration impact.
- **Do NOT bump package.json to 0.6.0** — that happens after War-or-Game sign-off
- **Do NOT create v0.6.0 git tag** — same reason
- **Smoke test after every task:** `tsc --noEmit` + `vitest run` + `desktop:map:build`
- **Run 40w scenario at the end** to verify no regression: `npm run sim:scenario:run:40w`
- **Determinism is sacred.** No Math.random() or timestamps in any new code.
- **Follow existing IPC patterns** — `stageCorpsStanceOrder` for handler shape, `advanceTurnAndSync` for reload pattern.

## DO NOT Touch

- `src/sim/` engine code (no calibration changes)
- `data/scenarios/events/` event definitions
- `src/sim/ai_commander/` (AI Commander integration is v0.6.2+ scope)
- `.env` file (contains rotated API keys)
- `docs/10_canon/FORAWWV.md` — never auto-edit

## Pre-Made Architectural Decisions

1. **Event Decision IPC** follows the pattern of `stageCorpsStanceOrder` — IPC handler in electron-main.cjs calls engine function, returns `{ ok, error }`.
2. **Pressure indicators** derive from `state.military.event_readiness` — any event with readiness > 50 counts as pressure warning.
3. **Consequence events** (no response options) auto-dismiss after 3-5 seconds. No button needed.
4. **Pending decisions in briefing** use severity `critical`, target type `none` (stays in HQ).

## Build State

- tsc: clean
- vitest: 1317 tests, 111 suites
- desktop:map:build: passes
- Calibration: n1024, 93.1% area-weighted
- Last commit: b5bd77c (master roadmap update)
- No uncommitted changes (except nightshift-handoff.md itself)

## Context Files

- `.claude/napkin.md` — runbook
- `docs/plans/2026-03-22-v06x-master-roadmap.md` — master roadmap (has "Two Rooms" section, orphan audit, integration review)
- `docs/plans/2026-03-22-army-hq-nerve-center-roadmap.md` — HQ phases (3/3.5 complete, 4 complete with tabs)
- `docs/plans/2026-03-22-v060-gate-completion-plan.md` — **THE PLAN TO EXECUTE**
- `docs/life_lessons.md` — scan before starting

## What Success Looks Like

After the nightshift:
- Player can respond to event decisions from EventDecisionModal
- Pressure "TENSIONS RISING" badge appears in toolbar when events approach threshold
- Consequence events auto-dismiss (no infinite modal blocking)
- Pending event decisions appear in Army HQ Situation Briefing
- VERSIONING.md matches reality (v0.5.4, milestone status correct)
- tsc clean, vitest green, desktop:map:build passes
- 40w scenario passes (no regression)
- Morning report in project root
- Ledger + napkin updated
