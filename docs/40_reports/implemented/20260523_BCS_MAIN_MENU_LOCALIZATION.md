# BCS Main Menu Localization

**Date:** 2026-05-23

**Type:** Main-menu UI localization slice. No simulation behavior, combat math, operation behavior, scenario data, calibration/army-arc tuning, save schema, generated artifact, network IO, or random source changed.

## Summary

The full-screen Main Menu now renders through the existing English/BCS localization substrate. The slice covers the publisher line, theater/date line, New Game, Continue, Load Game, Settings, Credits, and Quit.

The game title remains untranslated as the product title. The theater/date line now uses ASCII `1992-1995`, removing the prior mojibake in the source while preserving the intended display.

## Scope

- `src/ui/map/components/MainMenu.tsx`
- `src/ui/map/i18n/messages.en.ts`
- `src/ui/map/i18n/messages.bcs.ts`
- `tests/ui/main_menu_i18n.test.ts`

## Verification

- Red: `npx.cmd vitest run tests\ui\main_menu_i18n.test.ts --reporter=dot` failed because BCS mode still rendered English Main Menu copy.
- Green: `npx.cmd vitest run tests\ui\main_menu_i18n.test.ts --reporter=dot` passed 3/3 after localization.
- Focused localization pack: `npx.cmd vitest run tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts --reporter=dot` passed 14/14.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk-size warnings.
- `git diff --check` passed.

## Roadmap Delta

Localization still needs broad extraction and review, but three high-frequency product-shell surfaces now use the BCS substrate: Main Menu, Settings, and Pause Menu.
