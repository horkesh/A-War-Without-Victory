# 2026-04-02 Dead Theatre View-Model Bridges Removal

## Summary

Removed dead `theatres` / `armyTheatreAssignment` bridges from the loaded tactical-map view model. The engine still keeps theatre/front-segment metadata for compatibility and simulation wiring, but the player-facing UI state no longer pretends those are live shell concepts when no current surface actually uses them.

## Problem

`GameStateAdapter` was still parsing:

- `state.military.theatres`
- `state.military.army_theatre_assignment`
- `segment.theatre_id`

into `LoadedGameState`, even though no live player-facing map or Warroom surface consumed them.

That is exactly the kind of stale bridge that makes a repo feel more alive than the product actually is: future agents see the fields in the loaded shell and assume they still matter to the UX.

## What Changed

### 1. Remove unused theatre fields from the loaded UI state

In `src/ui/map/data/types.ts`:

- removed `LoadedGameState.theatres`
- removed `LoadedGameState.armyTheatreAssignment`
- removed `AssignableFrontSegmentView.theatre_id`

### 2. Stop parsing dead theatre data

In `src/ui/map/data/GameStateAdapter.ts`:

- removed adapter extraction for `military.theatres`
- removed adapter extraction for `military.army_theatre_assignment`
- stopped copying `segment.theatre_id` into the UI-facing front-segment view

### 3. Tighten adapter regression coverage

In `tests/ui_map_game_state_adapter.test.ts`:

- updated front/pressure parsing coverage so the adapter contract no longer expects theatre fields in `LoadedGameState`

## Verification

- `node_modules\.bin\tsx.cmd --test tests\ui_map_game_state_adapter.test.ts`
- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Follow-on

- keep auditing the loaded UI state for other dead bridges that no current player-facing surface owns
- continue treating adapter/view-model shape as product policy, not harmless plumbing
