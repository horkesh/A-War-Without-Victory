# Decision Room Source Handoffs

**Date:** 2026-05-02
**Status:** Implemented on current main working tree before commit.

## Summary

- Added deterministic `sourceHandoffs` over the existing Presidential Decision Room card archive.
- Projected the same grouped handoffs into pre-advance review and the Warroom priority docket so the command loop shows which existing surface explains each urgent item.
- Preserved all source ownership: no new inbox, records owner, Chronicle, cost ledger, event log, combat planner, or turn blocker.

## Changes Made

### Read Model

- `src/ui/map/data/presidentialDecisionRoom.ts`
  - Added `PresidentialDecisionRoomSourceHandoff`.
  - Added `buildPresidentialDecisionRoomSourceHandoffs(...)`.
  - Grouped cards by existing `navigationTarget` family: Army HQ tabs, Army HQ records, focused Turn Aftermath records, corps briefings, and Chronicle.
  - Preserved deterministic order by the earliest card `sortKey`, with `id` as a stable tie-breaker.
- `src/ui/map/data/preAdvanceCommandReview.ts`
  - Added `sourceHandoffs` grouped over `advanceReadiness.items`.
- `src/ui/map/data/warroomPriorityDocket.ts`
  - Added `sourceHandoffs` and `sourceHandoffSummary` to the compact Warroom docket projection.

### UI

- `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`
  - Added a `Source Handoffs` side section with direct buttons into the existing owning surfaces.
- `src/ui/map/components/warroom/WarroomStatusBar.tsx`
  - Added compact source-handoff buttons to the priority docket tray.
  - Kept row-level and source-handoff actions routed through App-owned Decision Room target handlers.
- `src/ui/map/App.tsx`
  - Added `reviewPreAdvanceTarget(...)`, which receives a preserved `PresidentialDecisionRoomNavigationTarget` from Warroom source handoffs and routes it through `openPresidentialDecisionRoomNavigationTarget(...)`.
  - Passed the target callback into `WarroomStatusBar` without teaching Warroom how to open Army HQ, Turn Aftermath, corps briefing, or Chronicle directly.

### Tests

- `tests/ui/presidential_decision_room.test.ts`
  - Proves grouped source handoffs are deterministic, severity-counted, and routed to existing owners.
- `tests/ui/pre_advance_command_review.test.ts`
  - Proves pre-advance review carries source handoffs only for the items at risk of being buried.
- `tests/ui/warroom_priority_docket.test.ts`
  - Proves Warroom docket summary and handoff projection stay in sync with the pre-advance packet.
- Static wiring guards prove the model and UI do not create `sourceHandoffQueue` or `sourceHandoffLedger`, do not import combat/sensitive-history internals, and render the source handoff surface.
- Follow-up wiring guards prove Warroom source handoff buttons route through App-owned target handling, not a Warroom-local router.

## Verification

- RED: focused UI suite failed as expected before implementation on missing `sourceHandoffs`, `sourceHandoffSummary`, and UI wiring strings.
- GREEN before docs:
  - `npx.cmd vitest run tests/ui/presidential_decision_room.test.ts tests/ui_presidential_decision_room_wiring.test.ts tests/ui/pre_advance_command_review.test.ts tests/ui_pre_advance_command_review_wiring.test.ts tests/ui/warroom_priority_docket.test.ts tests/ui_warroom_priority_docket_wiring.test.ts`
  - 26/26 tests passed.
- Follow-up RED/GREEN:
  - RED: `npx.cmd vitest run tests/ui_warroom_priority_docket_wiring.test.ts tests/ui_warroom_priority_pulse_wiring.test.ts`
  - Failed as expected on missing `onReviewTarget` / `reviewPreAdvanceTarget`.
  - GREEN: same command after implementation.
  - 6/6 tests passed.
- Final verification:
  - `npx.cmd vitest run tests/ui/presidential_decision_room.test.ts tests/ui_presidential_decision_room_wiring.test.ts tests/ui/pre_advance_command_review.test.ts tests/ui_pre_advance_command_review_wiring.test.ts tests/ui/warroom_priority_docket.test.ts tests/ui_warroom_priority_docket_wiring.test.ts tests/ui_warroom_priority_pulse_wiring.test.ts tests/ui_shell_navigation.test.ts`
  - 51/51 tests passed.
  - `npx.cmd tsc --noEmit -p tsconfig.json`
  - Clean.
  - `npm.cmd run desktop:map:build`
  - Passed. Existing Vite warnings remain: `@loaders.gl` browser-external `spawn`, dynamic import chunks, and large bundle size.
  - `git diff --check`
  - Clean, with Windows line-ending warnings only.

## Files Changed

| File | Change |
|---|---|
| `src/ui/map/data/presidentialDecisionRoom.ts` | Added grouped source-handoff read model and included handoffs in the Decision Room view. |
| `src/ui/map/data/preAdvanceCommandReview.ts` | Added source handoffs for the advance-readiness item slice. |
| `src/ui/map/data/warroomPriorityDocket.ts` | Added source handoffs and handoff summary. |
| `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx` | Rendered source handoff buttons in the Army HQ Decision Room. |
| `src/ui/map/components/warroom/WarroomStatusBar.tsx` | Rendered source handoff buttons in the Warroom priority docket. |
| `src/ui/map/App.tsx` | Routed Warroom source handoff targets through the centralized Decision Room target helper. |
| `tests/ui/presidential_decision_room.test.ts` | Added deterministic source-handoff model coverage. |
| `tests/ui/pre_advance_command_review.test.ts` | Added pre-advance source-handoff coverage. |
| `tests/ui/warroom_priority_docket.test.ts` | Added Warroom docket handoff coverage. |
| `tests/ui_presidential_decision_room_wiring.test.ts` | Added source-handoff wiring guard. |
| `tests/ui_pre_advance_command_review_wiring.test.ts` | Added pre-advance source-handoff wiring guard. |
| `tests/ui_warroom_priority_docket_wiring.test.ts` | Added Warroom source-handoff wiring guard. |
| `docs/40_reports/GUI_MASTER.md` | Registered the GUI change. |
| `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` | Updated canonical map/shell reference. |
| `docs/20_engineering/PRODUCT_SHELL_HIERARCHY.md` | Updated shell ownership contract. |
| `docs/PROJECT_LEDGER.md` | Added implementation ledger entry. |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Added durable source-handoff lesson. |
| `.claude/napkin.md` | Updated runbook note. |

## Next Steps

- Keep future Decision Room inspection affordances as projections over cards and preserved navigation targets.
- If the Warroom docket needs direct source buttons later, route them through the same centralized Decision Room navigation target helper rather than adding a Warroom-owned router.
