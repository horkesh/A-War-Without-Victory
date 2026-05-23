# BCS Pause Menu Localization

**Date:** 2026-05-23

**Type:** Tactical-map UI localization slice. No simulation behavior, combat math, operation behavior, scenario data, calibration/army-arc tuning, save schema, generated artifact, browser audio, network IO, or random source changed.

## Summary

The in-game pause menu now uses the existing UI localization substrate instead of hard-coded English copy. The slice adds English/BCS dictionary keys for the pause title, resume shortcut, menu actions, resume overlay label, and preserved-planning notice.

The menu subscribes to the active locale with `useLocale()` and renders through `t(...)`, so changing the Settings language preference affects this common command surface without adding a new state store or persistence path.

## Scope

- `src/ui/map/components/PauseMenu.tsx`
- `src/ui/map/i18n/messages.en.ts`
- `src/ui/map/i18n/messages.bcs.ts`
- `tests/ui/pause_menu_i18n.test.ts`

## Verification

- Red: `npx.cmd vitest run tests\ui\pause_menu_i18n.test.ts --reporter=dot` failed because the pause menu still rendered hard-coded English after selecting BCS.
- Green: `npx.cmd vitest run tests\ui\pause_menu_i18n.test.ts --reporter=dot` passed 2/2 after wiring the component through the localization substrate.
- Focused localization pack: `npx.cmd vitest run tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts tests\ui\settings_screen_i18n.test.ts --reporter=dot` passed 10/10.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk-size warnings.
- `git diff --check` passed.

## Roadmap Delta

Rating #41 is no longer accurately described as English-only. Current truth is still a narrow early localization substrate, not full BCS coverage: Settings and Pause Menu are localized with English fallback, while Chronicle, Army HQ, Verdict, Decision Room, map overlays, and release-quality native-speaker review remain open.
