# Decision Room Priority Dossier

**Date:** 2026-05-02
**Status:** Implemented on current main working tree before commit.

## Summary

- Added an active priority dossier to the Presidential Decision Room read model.
- The dossier is derived from the same sorted card archive, source handoffs, and advance-readiness packet that already power Strategic Priorities.
- Army HQ BRIEFING now lets the player select a priority card and inspect full explanation, evidence, source owner, same-surface related items, advance-review status, and the existing action route.

## Changes Made

### Read Model

- `src/ui/map/data/presidentialDecisionRoom.ts`
  - Added `PresidentialDecisionRoomDossier`.
  - Added `selectedCardId` to the Decision Room input.
  - Added `activeDossier`, defaulting deterministically to the top sorted card when no valid selection is supplied.
  - Related items are derived from the existing `sourceHandoffs` group for the selected card; no new owner or ledger is created.

### UI

- `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`
  - Added local `activeCardId` selection.
  - Added a `Priority Dossier` side pane with source, evidence, advance status, same-surface related cards, and the selected card's canonical action button.
  - Priority cards now expose a compact `Dossier` selector while retaining their existing direct source action.

### Tests

- `tests/ui/presidential_decision_room.test.ts`
  - Proves the default dossier follows the deterministic top card.
  - Proves explicit selection changes the dossier without changing the card archive.
  - Proves invalid selection falls back safely and no-player empty state returns `activeDossier: null`.
- `tests/ui_presidential_decision_room_wiring.test.ts`
  - Guards the UI wiring and forbids `priorityDossierQueue` / `priorityDossierLedger`.

## Verification

- RED:
  - `npx.cmd vitest run tests/ui/presidential_decision_room.test.ts`
  - Failed as expected on missing `activeDossier`.
  - `npx.cmd vitest run tests/ui_presidential_decision_room_wiring.test.ts`
  - Failed as expected on missing priority dossier wiring.
- GREEN before docs:
  - `npx.cmd vitest run tests/ui/presidential_decision_room.test.ts`
  - 9/9 tests passed.
  - `npx.cmd vitest run tests/ui_presidential_decision_room_wiring.test.ts`
  - 8/8 tests passed.
  - `npx.cmd vitest run tests/ui/presidential_decision_room.test.ts tests/ui/pre_advance_command_review.test.ts tests/ui/warroom_priority_docket.test.ts`
  - 15/15 tests passed.
  - `npx.cmd vitest run tests/ui_presidential_decision_room_wiring.test.ts tests/ui_pre_advance_command_review_wiring.test.ts tests/ui_warroom_priority_docket_wiring.test.ts`
  - 14/14 tests passed.
- Final verification:
  - `npx.cmd vitest run tests/ui/presidential_decision_room.test.ts tests/ui_presidential_decision_room_wiring.test.ts tests/ui/pre_advance_command_review.test.ts tests/ui_pre_advance_command_review_wiring.test.ts tests/ui/warroom_priority_docket.test.ts tests/ui_warroom_priority_docket_wiring.test.ts tests/ui_warroom_priority_pulse_wiring.test.ts tests/ui_shell_navigation.test.ts`
  - 54/54 tests passed.
  - `npx.cmd tsc --noEmit -p tsconfig.json`
  - Clean.
  - `npm.cmd run desktop:map:build`
  - Passed. Existing Vite warnings remain: `@loaders.gl` browser-external `spawn`, dynamic import chunks, and large bundle size.
  - `git diff --check`
  - Clean, with Windows line-ending warnings only.

## Files Changed

| File | Change |
|---|---|
| `src/ui/map/data/presidentialDecisionRoom.ts` | Added active priority dossier read model. |
| `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx` | Rendered selected dossier pane and card selection. |
| `tests/ui/presidential_decision_room.test.ts` | Added dossier model tests. |
| `tests/ui_presidential_decision_room_wiring.test.ts` | Added dossier wiring guard. |
| `docs/40_reports/GUI_MASTER.md` | Registered the GUI change. |
| `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` | Updated canonical map/shell reference. |
| `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md` | Updated shell ownership contract. |
| `docs/PROJECT_LEDGER.md` | Added implementation entry. |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Added durable dossier projection lesson. |
| `.claude/napkin.md` | Updated runbook note. |

## Next Steps

- If future work needs more detail, add source-backed evidence fields to `PresidentialDecisionRoomCard` rather than creating a second dossier store.
- Warroom and pre-advance surfaces should continue to route to the owning source target; the dossier remains an Army HQ inspection affordance.
