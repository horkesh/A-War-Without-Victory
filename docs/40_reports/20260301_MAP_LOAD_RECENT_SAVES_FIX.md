# Map load: recent saves load reliably (parseGameState robustness)

**Date:** 2026-03-01  
**Phase:** AWWV_GUI_ARCHITECTURE_REWORK_v2 (React + MapLibre GUI)

## What was wrong

- User reported that **all recent saves are unloadable** in the map app (not a single bad file).
- **Investigation:** Compared current scenario run output (`data/derived/latest_run_final_save.json`) with what `parseGameState` and the map expect:
  - **meta:** present with `turn` (number) and `phase` ("war"); required only `meta.turn`.
  - **formations:** object keyed by formation id; adapter already accepts array or object.
  - **political_controllers:** OSID-keyed (`op:mun:slug`); adapter and ControlLookup accept any keys; map uses OSID for control layer.
- Running `src/ui/map/scripts/debugLoadSave.ts` in Node **succeeded** (parseGameState ~13 ms, 227 formations, 863 control keys). So the current engine output shape is valid for the adapter.
- Remaining causes addressed:
  1. **Wrapped payloads:** Some code paths (e.g. IPC or tools) may pass `{ state: GameState }` instead of raw GameState; the adapter did not unwrap, so `state.meta` was undefined and parsing failed.
  2. **Error message:** Missing `meta.turn` threw a generic "missing meta.turn" without suggesting the file might be wrong or wrapped.

## What was changed

1. **Unwrap single-level wrapper in `parseGameState`:** If the input object has exactly one key `state` or `gameState` and the value is an object, use that value as the GameState. Raw GameState and other shapes unchanged.
2. **Clearer validation errors:** If `meta` is missing or `meta.turn` is not a finite number, throw with a message that says to ensure the file is a `final_save.json` from the scenario runner.
3. **Tests:** Added test for unwrap (`{ state: GameState }`) and test that missing `meta.turn` throws the expected message.

No change to: phase handling (peace/war, phase_ii-as-war), formations object/array normalization, or political_controllers (OSID/SID); backward compatibility for legacy saves preserved.

## How to verify

- **Adapter + load path:**  
  `node_modules/.bin/tsx src/ui/map/scripts/debugLoadSave.ts`  
  Expect: "Turn 40 (war) | formations: 227 | control keys: 863" and overlay build times; no throw.

- **Unit tests:**  
  `node node_modules/tsx/dist/cli.mjs --test tests/ui_map_game_state_adapter.test.ts`  
  Expect: 7 tests pass (including unwrap and meta.turn error).

- **Map build:**  
  `cd src/ui/map && npm run build`  
  Expect: build succeeds.

- **In browser:** Run `npm run dev:map`, open map, use "Load Latest" or "Load Save" with `data/derived/latest_run_final_save.json` (or any run’s `final_save.json`). Map should load without freeze or error; if a file fails, the console shows the new error message (e.g. "meta.turn must be a number...").

## Files modified

- `src/ui/map/data/GameStateAdapter.ts` — unwrap logic, meta validation and error text
- `tests/ui_map_game_state_adapter.test.ts` — unwrap test, missing meta.turn test

## Ledger / napkin

- **PROJECT_LEDGER:** Entry added for 2026-03-01 (React map parseGameState robustness).
- **Napkin:** Recurring lesson: validate save file (schema, size, wrapper) against current engine output when map fails to load; adapter should accept current runner output and common wrappers.
