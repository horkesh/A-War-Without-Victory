# Pre-Advance Review Item Deep Links

**Date:** 2026-05-02
**Status:** Implemented
**Lane:** Codex UI/product, Presidential Decision Room / Strategic Priorities continuation

## Summary

The advance-turn confirmation already projected the Presidential Decision Room's `Review Before Advance` list, but row actions were not first-class handoffs. This slice preserves each Decision Room card's `navigationTarget` in `buildPreAdvanceCommandReviewView(...)` and routes individual modal rows to the same owning surfaces as the source board.

The broad `Review Priorities` button still opens Army HQ BRIEFING. Row actions now open exact targets: Army HQ tabs, Army HQ Records subtabs, focused Turn Aftermath records, corps briefings, or Chronicle.

## Files

- `src/ui/map/data/preAdvanceCommandReview.ts`
- `src/ui/map/utils/presidentialDecisionRoomNavigation.ts`
- `src/ui/map/components/army_hq/PresidentialDecisionRoomPanel.tsx`
- `src/ui/map/components/warroom/AdvanceTurnModal.tsx`
- `src/ui/map/App.tsx`
- `tests/ui/pre_advance_command_review.test.ts`
- `tests/ui_pre_advance_command_review_wiring.test.ts`
- `tests/ui_presidential_decision_room_wiring.test.ts`
- `tests/ui_shell_navigation.test.ts`

## Product Contract

- The pre-advance review is a reminder and handoff surface, not a new inbox or blocker.
- Decision Room targets route through `openPresidentialDecisionRoomNavigationTarget(...)`, which delegates to existing `shellNavigation` helpers.
- Source truth remains with the underlying owners: presidential review queue, Army HQ Records, Turn Aftermath, corps briefing, Chronicle, and related read models.
- No simulation state, combat logic, scenario catalog, or sensitive-history mechanics are imported or mutated.

## Verification

- `npx.cmd vitest run tests/ui/pre_advance_command_review.test.ts tests/ui_pre_advance_command_review_wiring.test.ts tests/ui_presidential_decision_room_wiring.test.ts tests/ui_shell_navigation.test.ts tests/ui_warroom_priority_pulse_wiring.test.ts tests/army_hq_presidential_review_coherence.test.ts` - 43/43 passed.
- `npx.cmd tsc --noEmit -p tsconfig.json` - passed.
- `npm.cmd run desktop:map:build` - passed; Vite emitted the repo's existing chunk-size/dynamic-import warnings.
