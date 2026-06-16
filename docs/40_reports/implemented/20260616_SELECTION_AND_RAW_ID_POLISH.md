# Selection Context and Raw-ID Polish

**Date:** 2026-06-16  
**Type:** tactical-map UI/player-facing copy hardening  
**Scope:** selection store, panel rail context, request-operation objective labels, Corps front objective labels, and parent drilldown routing

## Summary

This slice closes two Pyrrhic specialist sweep findings:

- Standalone brigade selection could inherit stale corps/army/HQ selection context after the player clicked from an OOB parent into a map brigade.
- Request-operation and Corps front objective surfaces could expose raw OSIDs in normal player-facing copy.

`setSelectedFormationId(non-null)` now clears stale entity/operation context before selecting the clicked formation. Contextual sector/corps drilldowns still preserve their explicit context through their direct context paths. Formation parent navigation now routes army-HQ parents through `selectedArmyHqId` and corps parents through `selectedCorpsId` without also selecting the parent as a formation.

Objective target duplicate labels now use deterministic player-safe ordinal text such as `Kamenica - option 1`, while the hidden option value still preserves the exact OSID for IPC. Ambiguous typed-target warnings use the same safe labels and no longer instruct the player to use an exact OSID. Corps front objective focus copy now resolves through `getOsidDisplayName(...)` instead of falling back directly to raw objective IDs.

## Files

- `src/ui/map/store/gameStore.ts`
- `src/ui/map/components/FormationDetail.tsx`
- `src/ui/map/components/CorpsFrontPanel.tsx`
- `src/ui/map/components/army_hq/DirectiveCard.tsx`
- `src/ui/map/utils/objectiveTargetOptions.ts`
- `src/ui/map/i18n/messages.en.ts`
- `tests/ui_map_selection_store.test.ts`
- `tests/ui_map_panel_rail.test.ts`
- `tests/ui/objective_target_options.test.ts`
- `tests/ui/directive_card_stop_op_action.test.ts`
- `tests/ui_opord_player_safe_labels.test.ts`

## Verification

- Red proof first: focused suite failed on stale formation selection context, duplicate objective labels showing raw `op:` OSIDs, and ambiguous typed-target warnings showing raw OSIDs.
- Green proof: `npx.cmd vitest run tests\ui_map_selection_store.test.ts tests\ui_map_panel_rail.test.ts tests\ui\objective_target_options.test.ts tests\ui\directive_card_stop_op_action.test.ts tests\ui_opord_player_safe_labels.test.ts --pool=forks --reporter=dot` -> 5 files / 51 tests passed.
- TypeScript: `npm.cmd run typecheck` passed.
- Player-journey gate: `npm.cmd run qa:player-journeys` -> 11 files / 102 tests passed.
- Live browser smoke: `http://127.0.0.1:4184/` RS start loaded the first-hour overlay, produced no console/page errors, and did not expose raw `op:` objective copy in the visible first-hour text.

## Calibration

No simulation logic, scenario data, save schema, baseline manifest, golden artifacts, or packaging outputs changed. This is a UI/store/read-model presentation hardening slice.
