# Warroom Priority Docket

**Lane:** Codex UI/product, Presidential Decision Room continuation  
**Date:** 2026-05-02  
**Result:** Warroom `PRIORITIES` now opens a compact source-backed docket over the existing Decision Room / pre-advance read model.

## Summary

The Warroom priority pulse previously showed counts and routed directly to Army HQ BRIEFING. That made urgency visible, but it did not answer "which desk items are these?" while the player was still in the Warroom.

This change adds a pure read-model projection, `buildWarroomPriorityDocketView(...)`, over `buildPreAdvanceCommandReviewView(...)`. `WarroomStatusBar` now toggles a compact `Review Before Advance` tray with the top readiness rows, summary counts, and source owners. The tray has:

- `Open Decision Room`, routed through the existing App-owned Army HQ BRIEFING handoff.
- Per-row action buttons, routed through the same `openPresidentialDecisionRoomNavigationTarget(...)` path used by the advance-turn modal.

## Ownership

This is a Warroom shell summary, not a second command-review owner. Source truth still lives in the Decision Room inputs: presidential review queue, opportunity dossiers, operational SITREP, command briefing, Turn Aftermath records, active cost, and Chronicle. The docket does not write simulation state, block turn advance, duplicate inbox rows, or create a new event/history/cost ledger.

## Files

- `src/ui/map/data/warroomPriorityDocket.ts` - pure docket projection over pre-advance readiness.
- `src/ui/map/components/warroom/WarroomStatusBar.tsx` - toggled Warroom tray and row controls.
- `src/ui/map/App.tsx` - passes the existing pre-advance item router into the Warroom status bar.
- `tests/ui/warroom_priority_docket.test.ts` - deterministic projection tests.
- `tests/ui_warroom_priority_docket_wiring.test.ts` - source-level ownership and routing guards.
- `tests/ui_warroom_priority_pulse_wiring.test.ts` - updated pulse contract.

## Verification

- Red-first failure: new docket tests failed on missing `warroomPriorityDocket` module and missing status-bar tray wiring.
- Focused green run: `npx.cmd vitest run tests/ui_warroom_priority_pulse_wiring.test.ts tests/ui_warroom_priority_docket_wiring.test.ts tests/ui/warroom_priority_docket.test.ts tests/ui_pre_advance_command_review_wiring.test.ts tests/ui/pre_advance_command_review.test.ts tests/ui/presidential_decision_room.test.ts tests/ui_shell_navigation.test.ts` passed 42/42.
- `npx.cmd tsc --noEmit -p tsconfig.json` passed clean.
- `npm.cmd run desktop:map:build` passed; output contains the existing Vite browser-external / dynamic-import / chunk-size warnings only.
