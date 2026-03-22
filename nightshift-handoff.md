# Night Shift Handoff — 2026-03-22 (Night)

## Status

**v0.6.0 gate: CLOSED.** All 5 gate items implemented this session (event decision IPC, pressure indicators, auto-dismiss, VERSIONING fix, briefing decisions). Build clean: 1317 tests, tsc clean, desktop:map:build passes.

## Plans to Execute

### Primary: Game Chronicle (v0.6.2 scope)
**Plan:** `docs/plans/2026-03-22-game-chronicle-impl-plan.md`
**Design spec:** `docs/plans/2026-03-22-game-chronicle-design.md`
**Tasks:** 6 tasks
**Estimated time:** 3-4 hours

### Scope
Build the living vertical spine timeline — top-level feature showing the story of the player's war. 6 card types (combat/political/humanitarian/military/diplomatic/narrative) on a multi-layered ribbon. Toolbar button + clickable date + C keyboard shortcut.

## Execution Order

```
Task 1 (engine snapshots) ─────────────→ Task 5 (spine) ─┐
Task 2 (entry generator) → Task 4 (cards) ──────────────→ Task 6 (overlay)
Task 3 (store + toolbar) ────────────────────────────────→ Task 6 (overlay)
```

Tasks 1, 2, 3 are independent — parallelize if possible.
Task 4 needs Task 2 types.
Task 5 needs Task 1 snapshot data.
Task 6 needs Tasks 2-5 complete.

1. **Task 1** — Add territory_snapshot + supply_snapshot to TurnSummary (~30 min)
2. **Task 2** — generateChronicleEntries() with tests (~1 hr)
3. **Task 3** — gameStore state + toolbar button + C shortcut (~20 min)
4. **Task 4** — ChronicleCard component (6 types + headline) (~30 min)
5. **Task 5** — ChronicleSpine (territory ribbon + turn ticks) (~30 min)
6. **Task 6** — ChronicleOverlay full-screen assembly (~45 min)

## Special Instructions

- **Task 1 is the only engine change** — adds 2 optional fields to TurnSummary + ~10 lines in compile_turn_summary.ts. Everything else is UI.
- **Determinism is sacred.** The snapshot computation must use `strictCompare` for sorted iteration.
- **Significance filtering is critical.** Not every battle gets a card — only territory flips, major casualties (>100), and notable events. Without filtering, the timeline becomes unreadable (~15 cards per turn).
- **The spine ribbon renders from TurnSummary[].territory_snapshot.** Before Task 1 runs a scenario, there's no snapshot data — render gracefully (empty spine, just cards).
- **6 card types have distinct left border colors.** See design spec for the color table.
- **Headline cards span full width.** These are: foundational decisions, major operations completing, enclave falls/relief, peace plan offers, Graz Accords.
- **Create files in `src/ui/map/components/chronicle/` directory** — new subdirectory.

## DO NOT Touch

- `src/sim/combat/` — no combat changes
- `src/sim/events/` — no event changes
- `data/scenarios/events/` — no event definitions
- `src/sim/ai_commander/` — not in scope
- `.env` file
- `docs/10_canon/FORAWWV.md` — never auto-edit
- Any files related to Dayton dimension merge (v0.6.3 — different plan, don't mix)

## Pre-Made Architectural Decisions

1. **Chronicle is a full-screen overlay** (z-1000), not a tab inside Army HQ. It transcends the Two Rooms metaphor.
2. **Entry point is toolbar button + clickable date + C key.** All three open the same overlay.
3. **generateChronicleEntries() is a pure function.** Reads LoadedGameState, returns ChronicleEntry[]. No IPC, no side effects.
4. **Spine ribbon is CSS (not canvas).** Flex column with territory-colored rows. Canvas version deferred.
5. **Cards branch left and right of spine** alternating. Headlines span both sides.
6. **Newest turn at top** (descending order).
7. **Wrapped (game-end experience) is NOT in scope.** That's v0.6.3. Don't build WrappedOverlay.

## Build State

- tsc: clean (no real errors, only unused-variable warnings)
- vitest: 1317 tests, 111 suites, all pass
- desktop:map:build: passes
- Calibration: n1024, 93.1% area-weighted
- Last commit: fbebe43 (implementation plans)

## Context Files

- `.claude/napkin.md` — runbook
- `docs/plans/2026-03-22-v06x-master-roadmap.md` — master roadmap (Two Rooms, Chronicle in v0.6.2)
- `docs/plans/2026-03-22-game-chronicle-design.md` — **DESIGN SPEC** (read this first)
- `docs/plans/2026-03-22-game-chronicle-impl-plan.md` — **THE PLAN TO EXECUTE**
- `docs/life_lessons.md` — scan before starting

## What Success Looks Like

After the nightshift:
- CHRONICLE button visible on Presidential Toolbar (left of date)
- Date label clickable → opens Chronicle
- C keyboard shortcut opens Chronicle
- Full-screen Chronicle overlay with vertical spine
- 6 card types rendering with correct colors
- Headline cards spanning full width for major events
- Territory ribbon on spine showing faction-colored bands
- Significance filtering: minor battles hidden, major events shown
- TurnSummary has territory_snapshot + supply_snapshot populated
- tsc clean, vitest green (new tests for entry generator)
- desktop:map:build passes
- 40w scenario: zero regression
- Morning report in project root
- Ledger + napkin updated
