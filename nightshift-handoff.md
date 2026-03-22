# Night Shift Handoff — 2026-03-22 (Night)

## Status

**v0.6.0 gate: CLOSED.** Build clean: 1317 tests, tsc clean, desktop:map:build passes.

## Plans to Execute

Execute in order. Complete each plan fully before starting the next. Run `/simplify` between plans. Keep going until all plans are done or you're blocked.

| # | Plan | Scope | Tasks | Hours | Plan File |
|---|------|-------|-------|-------|-----------|
| 1 | **Game Chronicle** | v0.6.2 | 6 | 3-4 | `docs/plans/2026-03-22-game-chronicle-impl-plan.md` |
| 2 | **AI Commander Events** | v0.6.2 | 3 | 2-3 | `docs/plans/2026-03-22-ai-commander-events-impl-plan.md` |
| 3 | **Dayton Dimension Merge** | v0.6.3 | 5 | 2-3 | `docs/plans/2026-03-22-dayton-dimension-merge-impl-plan.md` |
| 4 | **Calibration Framework** | v0.6.1 | 3 | 1-2 | `docs/plans/2026-03-22-calibration-framework-impl-plan.md` |
| 5 | **HQ Deep Drill-Down** | v0.6.2 | 4 | 2-3 | `docs/plans/2026-03-22-hq-deep-drill-impl-plan.md` |
| 6 | **Chronicle Wrapped** | v0.6.3 | 4 | 2-3 | `docs/plans/2026-03-22-chronicle-wrapped-impl-plan.md` |
| 7 | **Historical Essays** | v0.6.4 | 3 | 2-3 | `docs/plans/2026-03-22-historical-essays-impl-plan.md` |

**Total: 28 tasks, ~15-21 hours. Do as many as possible before morning.**

## Execution Order & Dependencies

```
Plan 1 (Chronicle) ────────────────→ Plan 6 (Wrapped) — needs Chronicle
Plan 2 (AI Commander) ─── independent
Plan 3 (Dayton Merge) ─── independent (run 40w after)
Plan 4 (Calibration) ──── should run AFTER Plan 3 (baseline includes new dims)
Plan 5 (HQ Deep Drill) ── independent
Plan 7 (Essays) ────────── independent (needs ANTHROPIC_API_KEY from .env)
```

**Recommended order:** 1 → 2 → 3 → 4 → 5 → 6 → 7

- Plan 6 depends on Plan 1 (Chronicle must exist for Wrapped)
- Plan 4 should come after Plan 3 (freeze baseline AFTER dimension merge)
- Everything else is independent

## Special Instructions

- **Determinism is sacred.** Sorted iteration via `strictCompare`. No Math.random().
- **Create Chronicle files in `src/ui/map/components/chronicle/`** — new subdirectory.
- **Run 40w scenario after Plan 3 Task 4** — dimension merge changes negotiation computation.
- **Plan 4 (Calibration) freezes the baseline AFTER Plan 3** — otherwise baseline is stale.
- **Plan 7 (Essays) uses the Anthropic API key from `.env`** — read it with `process.env.ANTHROPIC_API_KEY` or `require('dotenv')`. Generate a test batch of 5 first, review quality, then generate all 100.
- **ArmyDetail.tsx is already retired.** Do NOT archive it again. The OOB Sidebar (left Command panel) STAYS.
- **Read `docs/life_lessons.md` at startup.** Write new lessons under `## Night Shift Lessons`.
- **Run `/simplify` between each plan.**

## DO NOT Touch

- `data/scenarios/events/` — no event definition changes
- `.env` file — read but don't modify
- `docs/10_canon/FORAWWV.md` — never auto-edit
- OOB Sidebar / Command panel — stays as-is
- Any worktree files

## Pre-Made Architectural Decisions

### Chronicle (Plan 1)
- Full-screen overlay (z-1000), not inside Army HQ
- Entry points: toolbar button + clickable date + C key
- Spine is CSS (not canvas), newest at top
- 6 card types with distinct border colors
- Wrapped NOT in scope for Plan 1

### AI Commander Events (Plan 2)
- Enrich army/corps prompts with event context
- generateEventDecision() with personality, JSON output, fallback to formula
- Model: claude-haiku-4-5-20251001 for event decisions

### Dayton Merge (Plan 3)
- 6 strategic dimensions = single source of truth
- NegotiationCapital → NegotiationBreakdown (raw stats only)
- DIMENSION_WEIGHTS replaces CAPITAL_WEIGHTS
- Pipeline: compute-dimension-bases AFTER evaluate-events

### Calibration (Plan 4)
- Freeze baseline AFTER Plan 3 (includes new dimension computation)
- npm run calibrate:40w = run + compare + report

### HQ Deep Drill (Plan 5)
- Expand existing sections (OrbatSection, OperationsSection, SectorsSection)
- No new components — enhance what's there
- ArmyDetail already retired, don't touch

### Wrapped (Plan 6)
- Depends on Chronicle (Plan 1) being implemented
- 10-slide cinematic, SpiderChart for final dimensions
- generateWrappedSlides() is pure analysis function
- Trigger: "VIEW YOUR WAR" button in GameOverModal

### Essays (Plan 7)
- Sonnet-generated at dev time, ~$5-10 total cost
- Generate test batch of 5 first, review, then all 100
- Stored as JSON in data/scenarios/essays/
- Unlock state from fired_event_ids
- No runtime API calls

## Build State

- tsc: clean
- vitest: 1317 tests, 111 suites
- desktop:map:build: passes
- Calibration: n1024, 93.1% area-weighted
- Last commit: 244e4ba

## Design Specs (read before implementing)

| Plan | Design Spec |
|------|-------------|
| 1, 6 | `docs/plans/2026-03-22-game-chronicle-design.md` |
| 2 | `docs/plans/2026-03-22-integration-audit-findings.md` §2 |
| 3 | `docs/plans/2026-03-22-dayton-dimension-merge-design.md` |

## What Success Looks Like

**Best case (all 7 plans):** 28 tasks done, ~1345 tests, Chronicle + Wrapped + AI Commander Events + Dayton Merge + Calibration Framework + HQ Deep Drill + 100 Essays. Full v0.6.1-v0.6.4 scope complete.

**Realistic (Plans 1-5):** 21 tasks done, Chronicle + AI Commander + Dayton + Calibration + HQ Drill. Major infrastructure complete.

**Minimum (Plans 1-3):** 14 tasks done, Chronicle + AI Commander + Dayton. Core v0.6.2-v0.6.3 features.

Morning report in project root. Ledger + napkin updated. Life lessons appended if anything went wrong.
