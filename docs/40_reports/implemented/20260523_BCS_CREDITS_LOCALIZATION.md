# BCS Credits Localization

**Date:** 2026-05-23

**Type:** Credits-screen UI localization slice. No simulation behavior, combat math, operation behavior, scenario data, calibration/army-arc tuning, save schema, generated artifact, network IO, or random source changed.

## Summary

The Credits screen now renders through the existing English/BCS localization substrate. The slice covers the title, close affordances, section headings, strategic-simulation subtitle, source framing line, additional-sources line, technology heading, and dedication text.

Proper nouns and source titles remain untranslated. The visible date range is normalized to ASCII `1992-1995`.

## Scope

- `src/ui/map/components/CreditsScreen.tsx`
- `src/ui/map/i18n/messages.en.ts`
- `src/ui/map/i18n/messages.bcs.ts`
- `tests/ui/credits_screen_i18n.test.ts`

## Verification

- Red: `npx.cmd vitest run tests\ui\credits_screen_i18n.test.ts --reporter=dot` failed because BCS mode still rendered English credits copy.
- Green: `npx.cmd vitest run tests\ui\credits_screen_i18n.test.ts --reporter=dot` passed 2/2 after localization.
- Focused localization pack: `npx.cmd vitest run tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts --reporter=dot` passed 16/16.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk-size warnings.
- `git diff --check` passed.

## Roadmap Delta

Localization now covers four self-contained product-shell surfaces: Main Menu, Credits, Settings, and Pause Menu. Broad in-game surfaces and native-speaker review remain open.
