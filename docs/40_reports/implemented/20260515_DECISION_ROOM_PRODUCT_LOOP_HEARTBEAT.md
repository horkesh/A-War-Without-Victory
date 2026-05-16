# Decision Room Product Loop Heartbeat

**Date:** 2026-05-15
**Type:** UI/read-model product-spine implementation
**Runtime impact:** No simulation mechanics, scenario data, OOB, operation-opportunity catalog files, painted targets, save schema, or serialization format changed.

## Summary

- Added a compact `Brief -> Inspect -> Decide -> Execute -> Report -> Cost -> Judge -> Next` heartbeat to the existing Presidential Decision Room.
- The heartbeat is a projection over the existing Decision Room card archive, Turn Aftermath records, active campaign cost, and Chronicle handoffs. It does not create a new inbox, ledger, command queue, cost ledger, or history owner.
- The UI renders the heartbeat as a small route strip inside Army HQ BRIEFING, with every click going through `openPresidentialDecisionRoomNavigationTarget(...)`.

## Changes Made

### Decision Room Read Model

- `src/ui/map/data/presidentialDecisionRoom.ts`
  - Added `PresidentialDecisionRoomLoopStepId` and `PresidentialDecisionRoomLoopStep`.
  - Added `buildLoopSteps(...)` plus bounded helpers for Report, Cost, Judge, and Next.
  - Each loop step carries stable ids, counts, urgent counts, card ids, copy, and an existing `PresidentialDecisionRoomNavigationTarget`.
  - Report and Cost route to Army HQ Turn Aftermath records; Judge routes to Chronicle; Brief/Decide/Inspect/Execute route through existing cards and readiness.

### Army HQ Surface

- `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`
  - Added `ProductLoopStep`, a compact button over the `loopSteps` read model.
  - Rendered the Product Loop strip above the existing Command Loop lanes.
  - Kept the existing panel and source handoff model; no new panel or owner was introduced.

## Verification

- Red first: `..\\..\\node_modules\\.bin\\vitest.cmd run tests/ui/presidential_decision_room.test.ts --reporter=dot`
  - Failed on missing `loopSteps`.
- Green targeted:
  - `..\\..\\node_modules\\.bin\\vitest.cmd run tests/ui/presidential_decision_room.test.ts --reporter=dot`
  - 10/10 pass.
- Focused regression:
  - `..\\..\\node_modules\\.bin\\vitest.cmd run tests/ui_presidential_decision_room_wiring.test.ts tests/ui/warroom_priority_docket.test.ts tests/ui/presidential_decision_room.test.ts --reporter=dot`
  - 22/22 pass.
- Typecheck attempted:
  - `..\\..\\node_modules\\.bin\\tsc.cmd --noEmit -p tsconfig.json`
  - Blocked by missing worktree-local UI dependencies (`maplibre-gl`, Deck.gl packages, `@vitejs/plugin-react`). No project-local `node_modules` exists in this worktree; root dependencies also lack those packages.

## Files Changed

| File | Change |
|------|--------|
| `src/ui/map/data/presidentialDecisionRoom.ts` | Added product-loop heartbeat read-model projection. |
| `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx` | Rendered Product Loop route strip in existing Decision Room panel. |
| `tests/ui/presidential_decision_room.test.ts` | Added deterministic product-loop read-model test. |
| `tests/ui_presidential_decision_room_wiring.test.ts` | Added wiring guard against duplicate product-loop owners. |
| `docs/40_reports/implemented/20260515_DECISION_ROOM_PRODUCT_LOOP_HEARTBEAT.md` | Implementation report and heartbeat record. |

## Next Steps

- Human/operator playtest should check whether the new heartbeat strip helps the first-minute Decision Room scan.
- If the strip feels visually dense, refine spacing inside the existing panel rather than adding a separate product-loop panel.
