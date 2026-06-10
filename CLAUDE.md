# CLAUDE.md — A War Without Victory (AWWV)

Deterministic strategic-level simulation of the 1992-1995 Bosnian War. Negative-sum wargame: exhaustion, political collapse, constrained agency — not conquest. Three factions: **RBiH** (ARBiH), **RS** (VRS), **HRHB** (HVO).

## Session Startup (MANDATORY — before any work)

1. Read `.claude/napkin.md` — curated runbook. Internalize silently, curate on read (re-prioritize, merge dupes, cap 10/category). Update during work.
2. Read `docs/PROJECT_LEDGER.md` (latest 80 lines — current state).
3. Read `docs/life_lessons.md` (index) — always read "Recently Violated" and "New Lessons" sections. Then load the topic file(s) relevant to your current task (e.g. `docs/life_lessons/calibration.md` for calibration work, `docs/life_lessons/ui_map.md` for UI work). If about to violate an active lesson, STOP and flag it.
4. If `working-on.md` exists at project root, read it (interrupted task from previous session). Delete after reading.
5. Check crons via `CronList` — reschedule if missing (two required, see napkin §Session Startup).

## Key Commands

```bash
npm run test:vitest          # 3513 tests, 298 suites
npx tsc --noEmit             # Typecheck
npm run sim:scenario:run:40w # 40-week calibration scenario
npm run sim:scenario:run:default  # 52-week historical scenario
npm run desktop              # Electron app
npm run dev:map              # Vite tactical map (port 3001)
npm run desktop:map:build    # Build Electron map → dist/tactical-map/
```

Smoke-test triad after every change: `tsc --noEmit` + `vitest run` + `desktop:map:build`.

## Sacred Rules

- **Determinism is sacred**: No `Math.random()`, no timestamps, no `Date.now()` in sim code. Sorted iteration via `strictCompare`.
- **NEVER override initial OSIDs**: Initial OSID control from census/referendum is sacrosanct. Fix engine, OOB, operations, or scenario params instead.
- **NEVER use `avoided_osids_by_faction`**: Banned. Fix bot targeting, OOB stats, or painted targets instead.
- **Canon hierarchy**: Engine Invariants > Phase Specs > Systems Manual > Rulebook > Game Bible > context.md
- **Canonical faction IDs**: `RBiH`, `RS`, `HRHB` only.
- **One change per calibration run**: Change ONE thing, run scenario, compare, sign off. Never bundle.
- **GameState is single source of truth**: `src/state/game_state.ts`.
- **Ops-only attacks**: Brigades NEVER attack independently. All attacks flow through CorpsOperation.
- **Canon edits (incl. `docs/10_canon/FORAWWV.md`) require Pyrrhic-panel sign-off** — convene the appropriate panel (for §6: Historian + scenario-tester/calibration + Engine/systems + Red-team); a unanimous GO is the signature; a BLOCK or split verdict surfaces to the owner. Implementer ≠ reviewer. Bright lines (§6 atrocity-is-never-rewarded) and the canon hierarchy remain invariant.

## Shell & Platform

- **Windows**: Use `;` not `&&` to chain commands in PowerShell.
- **tsx**: Use `node_modules/.bin/tsx` directly (not `npx tsx`). Prefer `npm run test:vitest`.
- **Paths**: Always use absolute paths for tool calls.

## Architecture (pointers)

- Sim core: `src/sim/` | State: `src/state/` | Scenarios: `src/scenario/`
- Combat: `src/sim/combat/` | Bot AI: `bot_strategy.ts`, `bot_corps_ai.ts`, `bot_brigade_ai_osid.ts`
- Commander: `src/sim/combat/commander/` (v0.8 corps commander intelligence, 10 files)
- War pipeline: `src/sim/turn_phases/war_phases.ts` (151 steps)
- Desktop: `src/desktop/` | Tactical map: `src/ui/map/`
- Canon: `docs/10_canon/` | Engineering: `docs/20_engineering/` | Reports: `docs/40_reports/`
- Skills: `.claude/skills/` (60+ Pyrrhic team roles)

## Deep Reference (read as needed)

- **Napkin** (runbook): `.claude/napkin.md` — curated rules, backlog, patterns
- **Memory** (project knowledge): `.claude/projects/.../memory/MEMORY.md` — indexed topic files
- **Ledger** (changelog): `docs/PROJECT_LEDGER.md` + `docs/PROJECT_LEDGER_KNOWLEDGE.md`
- **Life lessons**: `docs/life_lessons.md` — hard-won development rules
- **Calibration**: `docs/40_reports/CALIBRATION_MASTER.md`
- **Canon docs**: `docs/10_canon/` — Game Bible, Rulebook, Systems Manual, Phase Specs

## Ledger Protocol

- Append behavioral/output changes to `docs/PROJECT_LEDGER.md`.
- Thematic knowledge to `docs/PROJECT_LEDGER_KNOWLEDGE.md`.
- Edits to `docs/10_canon/FORAWWV.md` require Pyrrhic-panel sign-off (convene the appropriate panel; unanimous GO = signature; BLOCK or split surfaces to the owner; implementer ≠ reviewer).
