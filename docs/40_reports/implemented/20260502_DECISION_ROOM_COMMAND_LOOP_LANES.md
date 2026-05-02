# Decision Room Command-Loop Lanes

**Date:** 2026-05-02
**Status:** Implemented on current main working tree before commit.

## Summary

- Added five deterministic command-loop lanes to the existing Presidential Decision Room: `Urgent`, `Decisions`, `Fronts`, `Inspect`, and `Advance`.
- Kept the Decision Room as a projection and router over existing source owners; no new inbox, checklist, Chronicle, cost ledger, or combat-planning owner.
- Refined the pre-advance item selection so it prefers one item per source category before allowing duplicates, keeping hard-turn and SITREP warnings visible beside opportunity dossiers.

## Changes Made

### Read Model

- `src/ui/map/data/presidentialDecisionRoom.ts`
  - Added `PresidentialDecisionRoomCommandQuestion` and command question ids.
  - Added `buildCommandQuestions(...)`, projecting the already-sorted card archive into five scan lanes.
  - Added category-diverse `advanceReadiness.items` selection before duplicate categories fill remaining slots.
  - Preserved existing navigation targets on each lane; no new routing owner.

### UI

- `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`
  - Added compact `Command Loop` lane cards above priority lenses.
  - Each lane shows headline, count, urgent count, summary, and an action button using `openPresidentialDecisionRoomNavigationTarget(...)`.
  - Kept dense Army HQ styling and stable card dimensions.

### Tests

- `tests/ui/presidential_decision_room.test.ts`
  - Added red-first coverage for deterministic command-loop lanes, lane ids/order, card membership, source target routing, category-diverse advance reminders, and no-player empty state.
- `tests/ui_presidential_decision_room_wiring.test.ts`
  - Added wiring guard that the panel renders command-loop lanes and does not create another queue owner.

### Docs

- Updated `docs/40_reports/GUI_MASTER.md`, `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`, and `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md`.
- Prepended durable ledger/knowledge entries and updated `.claude/napkin.md`.

## Verification

- `npx.cmd vitest run tests/ui/presidential_decision_room.test.ts tests/ui_presidential_decision_room_wiring.test.ts tests/ui/pre_advance_command_review.test.ts tests/ui_pre_advance_command_review_wiring.test.ts tests/ui/warroom_priority_docket.test.ts tests/ui_warroom_priority_docket_wiring.test.ts tests/ui_warroom_priority_pulse_wiring.test.ts tests/ui_shell_navigation.test.ts`
  - 49/49 tests passed.
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - Clean.
- `npm.cmd run desktop:map:build`
  - Passed. Existing Vite warnings remain: `@loaders.gl` browser-external `spawn`, dynamic import chunks, and large bundle size.

## Files Changed

| File | Change |
|---|---|
| `src/ui/map/data/presidentialDecisionRoom.ts` | Added command-loop lane read model and category-diverse advance readiness selection. |
| `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx` | Rendered `Command Loop` lane cards. |
| `tests/ui/presidential_decision_room.test.ts` | Added command-loop model tests. |
| `tests/ui_presidential_decision_room_wiring.test.ts` | Added source-level wiring guard. |
| `docs/40_reports/GUI_MASTER.md` | Registered the GUI change. |
| `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` | Updated canonical GUI reference. |
| `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md` | Updated shell ownership language. |
| `docs/PROJECT_LEDGER.md` | Added implementation entry. |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Added durable command-loop projection lesson. |
| `.claude/napkin.md` | Added concise runbook note. |

## Next Steps

- Keep adding future "what next?" affordances as projections of the Decision Room card archive.
- If a later UI pass needs more lane detail, add it as card evidence expansion or source-owner deep links, not as another queue.
