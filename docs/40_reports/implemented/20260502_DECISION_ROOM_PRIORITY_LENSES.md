# Decision Room Priority Lenses

**Date:** 2026-05-02
**Status:** Implemented
**Lane:** Codex UI/product, Presidential Decision Room continuation

## Summary

The Presidential Decision Room now derives priority lenses from the same finalized card archive that powers Strategic Priorities. Lenses cover `all` plus non-empty source categories: Decision, Opportunity, SITREP, Briefing, Turn, Cost, and Memory.

Each lens carries deterministic counts, urgent counts, the top card id, and the top card's existing navigation target. The Army HQ panel uses those lenses as local filters over the visible card stack and `Inspect Next` list. `Review Before Advance` remains global so the advance-turn safety reminder does not change meaning when a player filters the board.

## Files

- `src/ui/map/data/presidentialDecisionRoom.ts`
- `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`
- `tests/ui/presidential_decision_room.test.ts`
- `tests/ui_presidential_decision_room_wiring.test.ts`

## Product Contract

- Lenses are presentation state over `PresidentialDecisionRoomCard[]`; they are not a new inbox, queue, ledger, Chronicle, event log, or record owner.
- Card actions still route through each card's existing `navigationTarget`.
- The read model remains deterministic: category ordering is explicit, card order remains the previously finalized card order, and no random/time APIs are introduced.
- The feature stays inside Army HQ / UI read-model code and imports no simulation, combat, scenario catalog, or sensitive-history mechanics.

## Verification

- Red run: `npx.cmd vitest run tests/ui/presidential_decision_room.test.ts tests/ui_presidential_decision_room_wiring.test.ts` failed on missing `view.lenses` and missing panel lens state.
- Green run: `npx.cmd vitest run tests/ui/presidential_decision_room.test.ts tests/ui_presidential_decision_room_wiring.test.ts` - 10/10 passed.
- Full verification completed after docs: focused UI suite, `npx.cmd tsc --noEmit -p tsconfig.json`, and `npm.cmd run desktop:map:build`.
