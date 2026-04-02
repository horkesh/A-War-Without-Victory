# 2026-04-03 - Player-scoped operations and Warroom shell summaries

## Summary
- Scoped tactical-map `operations`, `activeOperations`, `operationHistory`, and `pendingReserveRequests` at `GameStateAdapter` to the player faction.
- Replaced two more direct operation bypasses with `findPlayerFacingOperationByKey(...)`.
- Reduced Warroom corps-operation snapshots to summary-only data.
- Replaced Warroom enemy-contact sourcing from global enemy casualty ledgers with front-contact summaries.

## Why
- The map shell was still receiving all-faction operation/history/reserve-request collections and relying on late filters to make them player-safe.
- Warroom was still carrying raw `CorpsOperation` objects and deriving enemy contact from global enemy casualty ledgers, which is not an honest headquarters information model.

## Files changed
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/components/CommanderSelectionModal.tsx`
- `src/ui/map/components/ops_modal/AuthorizePhase.tsx`
- `src/ui/warroom/data/war_data_extractor.ts`
- `tests/ui_map_game_state_adapter.test.ts`
- `tests/ui_opord_player_safe_labels.test.ts`
- `tests/warroom_player_visibility.test.ts`
- `docs/40_reports/GUI_MASTER.md`
- `docs/40_reports/WARROOM_MASTER.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`

## What changed

### 1. Tactical-map operation datasets are now player-scoped at ingress
- `parseGameState(...)` now filters:
  - `operations`
  - `activeOperations`
  - `operationHistory`
  - `pendingReserveRequests`
- This means the shell is safer even before component-level player-visibility helpers run.

### 2. Direct operation bypasses were removed from planning/commander UI
- `CommanderSelectionModal.tsx` now resolves operations through `findPlayerFacingOperationByKey(...)`.
- `ops_modal/AuthorizePhase.tsx` now does the same instead of reading `loadedGameState.operations` directly.

### 3. Warroom no longer carries raw operation payloads
- `CorpsOperationSnapshot.operation` is now a summary DTO:
  - `type`
  - `phase`
  - `started_turn`
- That keeps Warroom aligned with its actual use cases instead of letting it quietly accumulate command-debug truth.

### 4. Warroom enemy contact is now derived from front contact, not enemy casualty ledgers
- `extractWarData()` now derives `contactedEnemyFormations` from `engagedFrontEdges`.
- This keeps Warroom acting like a headquarters shell: it knows there is contact on a hostile front, not exact enemy formation identity because some enemy ledger entry exists somewhere in state.

## Verification
- `node .\\node_modules\\tsx\\dist\\cli.mjs --test tests\\ui_map_game_state_adapter.test.ts`
- `node .\\node_modules\\vitest\\vitest.mjs run tests\\ui_player_visibility.test.ts tests\\ui_map_render_smoke.test.ts tests\\ui_opord_player_safe_labels.test.ts`
- `node .\\node_modules\\vitest\\vitest.mjs run tests\\warroom_player_visibility.test.ts tests\\ui_shell_navigation.test.ts tests\\warroom_smoke.test.ts`

## Outcome
- The tactical-map shell now receives less omniscient operation truth by default.
- Warroom now behaves more like a believable headquarters shell and less like a hidden debug surface.
