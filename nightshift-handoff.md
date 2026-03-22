# Night Shift Handoff — 2026-03-22 (Night)

## Status

**v0.6.0 gate: CLOSED.** Build clean: 1317 tests, tsc clean, desktop:map:build passes.

## Plans to Execute

Execute in order. Complete each plan fully before starting the next. Run `/simplify` between plans.

### Plan 1: Game Chronicle (v0.6.2 scope, ~3-4 hrs)
**Plan:** `docs/plans/2026-03-22-game-chronicle-impl-plan.md`
**Design spec:** `docs/plans/2026-03-22-game-chronicle-design.md`
**Tasks:** 6

### Plan 2: AI Commander + Events Integration (v0.6.2 scope, ~2-3 hrs)
**Plan:** `docs/plans/2026-03-22-ai-commander-events-impl-plan.md`
**Audit:** `docs/plans/2026-03-22-integration-audit-findings.md` §2
**Tasks:** 3

### Plan 3: Dayton Dimension Merge (v0.6.3 scope, ~2-3 hrs)
**Plan:** `docs/plans/2026-03-22-dayton-dimension-merge-impl-plan.md`
**Design spec:** `docs/plans/2026-03-22-dayton-dimension-merge-design.md`
**Tasks:** 5

**Total: 14 tasks, ~7-10 hours.**

## Execution Order

### Plan 1: Chronicle (6 tasks)
```
Task 1 (engine snapshots) ─────────────→ Task 5 (spine) ─┐
Task 2 (entry generator) → Task 4 (cards) ──────────────→ Task 6 (overlay)
Task 3 (store + toolbar) ────────────────────────────────→ Task 6 (overlay)
```
Tasks 1, 2, 3 parallelizable.

### /simplify gate

### Plan 2: AI Commander Events (3 tasks)
```
Task 1 (prompt enrichment) — independent
Task 2 (event decisions) — independent
Task 3 (validation) — independent
```
All 3 parallelizable.

### /simplify gate

### Plan 3: Dayton Merge (5 tasks)
```
Task 1 → Task 2 → Task 3 → Task 4
                          ↘ Task 5
```
Sequential except Task 5 (UI) can parallel with Task 4.

### Final verification
- `npx tsc --noEmit`
- `npx vitest run`
- `npm run desktop:map:build`
- `npm run sim:scenario:run:40w` — verify zero regression

## Special Instructions

- **Plan 1 Task 1 is the only engine change in Plan 1.** Everything else is UI.
- **Plan 2 is engine-only.** AI Commander code, no UI changes.
- **Plan 3 touches both engine and UI.** Task 3 renames a type across many files — be careful.
- **Determinism is sacred.** Sorted iteration via `strictCompare`. No Math.random().
- **Create Chronicle files in `src/ui/map/components/chronicle/`** — new subdirectory.
- **Run 40w scenario after Plan 3 Task 4** — dimension merge changes negotiation computation.
- **AI Commander integration is opt-in** — no calibration impact (formula bot is default).
- **Read `docs/life_lessons.md` at startup.** Write new lessons under `## Night Shift Lessons` if anything goes wrong.

## DO NOT Touch

- `data/scenarios/events/` — no event definition changes
- `.env` file — contains rotated API keys
- `docs/10_canon/FORAWWV.md` — never auto-edit
- Any worktree files

## Pre-Made Architectural Decisions

### Chronicle
1. Full-screen overlay (z-1000), not inside Army HQ
2. Entry points: toolbar button + clickable date + C key
3. generateChronicleEntries() is pure function, no IPC
4. Spine is CSS (not canvas), newest at top
5. 6 card types with distinct border colors
6. Wrapped (game-end) NOT in scope

### AI Commander Events
1. Prompt enrichment: add fired event titles, aggression mods, constraints to army/corps prompts
2. Event decisions: `generateEventDecision()` with personality, JSON output, fallback to formula
3. Validation: reject illegal decisions (forced stance, operation blocks), fallback to formula
4. Model: claude-haiku-4-5-20251001 for event decisions (cheap, fast)

### Dayton Merge
1. 6 strategic dimensions = single source of truth
2. base_value from state, event_modifier from choices, effective_value = clamp(base+mod, 0, 100)
3. NegotiationCapital → NegotiationBreakdown (raw stats only)
4. DIMENSION_WEIGHTS replaces CAPITAL_WEIGHTS (6-dim, faction-specific)
5. Pipeline: compute-dimension-bases AFTER evaluate-events
6. UI: composite bar + weight emphasis + tooltips

## Build State

- tsc: clean
- vitest: 1317 tests, 111 suites
- desktop:map:build: passes
- Calibration: n1024, 93.1% area-weighted
- Last commit: 1d6e054

## What Success Looks Like

**Chronicle:** CHRONICLE button + date click + C shortcut → full-screen spine timeline with 6 card types + territory ribbon.

**AI Commander:** Army/corps prompts include event context. generateEventDecision() lets Claude make event choices. Constraint validation rejects illegal decisions.

**Dayton Merge:** Single unified dimension system. Composite Negotiating Capital score in UI. Dayton reads from DimensionStore. 40w regression: zero.

**All:** tsc clean, vitest green (~1330-1350 tests), desktop:map:build passes, morning report, ledger + napkin updated.
