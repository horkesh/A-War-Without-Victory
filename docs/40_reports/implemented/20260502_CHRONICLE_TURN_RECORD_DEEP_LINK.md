# Chronicle Turn Record Deep Link

**Date:** 2026-05-02

**Type:** UI/product-spine read-model work. No simulation mechanics, scenario data, OOB, painted targets, combat code, operation catalog content, or run artifacts changed.

## Why

Chronicle review filters made the war archive searchable, but the archive still stopped at "what happened." The player also needs the staff packet behind that moment: casualties, displacement, territory changes, strategic signals, and pending decisions for the same turn. That packet already exists in Army HQ `TURN AFTERMATH` records.

This change connects those two surfaces directly. Chronicle stays the memory surface; Army HQ Records stays the evidence surface.

## What Changed

- Added `openArmyHQAftermathRecord(state, turn)` in `src/ui/map/utils/shellNavigation.ts`.
- Added `focusedAftermathTurn` and `setFocusedAftermathTurn` to `src/ui/map/store/gameStore.ts`.
- Added `Open Turn Record` actions to Chronicle dossier entries in `ChronicleOverlay.tsx`.
- Updated `TurnAftermathRecordsPanel.tsx` so a focused turn:
  - switches the visible records filter back to `All`,
  - expands the record build window beyond the default latest-18 cap,
  - scrolls the matching record into view,
  - highlights it with a focused border and `data-focused-aftermath-turn`.
- Added `tests/ui_chronicle_turn_record_link.test.ts` covering the route, no-player-faction guard, Chronicle wiring, and focused-record persistence/rendering.

## Product Contract

Chronicle entries may route to the matching turn record, but they must not create a second history store. The flow is:

`Chronicle entry -> shellNavigation -> Army HQ Records / TURN AFTERMATH -> focused archive record`

All data remains derived from `turnSummaries`, `latestTurnSummary`, and the existing inbox/read-model spine.

## Verification

- Red-first: `npx.cmd vitest run tests\ui_chronicle_turn_record_link.test.ts` failed before implementation with the missing helper/store/wiring assertions.
- Green: `npx.cmd vitest run tests\ui_chronicle_turn_record_link.test.ts` = 4/4 pass after implementation.
- Focused UI regression pack: `npx.cmd vitest run tests\ui_chronicle_turn_record_link.test.ts tests\ui_shell_navigation.test.ts tests\ui_turn_aftermath_wiring.test.ts tests\chronicle_entries.test.ts tests\ui\chronicle_endgame_mount.test.ts tests\ui_chronicle_review_tools.test.ts tests\ui\gamestore_load_reset.test.ts` = 64/64 pass.
- `npx.cmd tsc --noEmit -p tsconfig.json` = clean.
- `npm.cmd run desktop:map:build` = success with existing Vite/browser-external/chunk-size warnings.
- `git diff --check` = clean apart from existing LF-to-CRLF warnings.

## Follow-Ups

- Browser-smoke the Chronicle dossier action during the next GUI visual pass.
- If record archives become very large, replace the `limit: 1000` focus expansion with a targeted `requiredTurn` option in `buildTurnAftermathRecordViews`.
