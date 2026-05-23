# BCS Settings Audio Localization

**Date:** 2026-05-23

**Type:** Settings UI localization slice. No simulation behavior, combat math, operation behavior, scenario data, calibration/army-arc tuning, save schema, generated artifact, browser audio playback, network IO, or random source changed.

## Summary

The Settings Audio section now uses the existing English/BCS localization substrate instead of hard-coded English. This includes the Audio tab title, Soundscape row, Master Volume row, soundscape toggle aria label, and master-volume slider aria label.

This keeps the first localized Settings surface internally consistent: choosing BCS no longer leaves the default Audio page in English while the rest of the Settings shell switches locale.

## Scope

- `src/ui/map/components/SettingsScreen.tsx`
- `src/ui/map/i18n/messages.en.ts`
- `src/ui/map/i18n/messages.bcs.ts`
- `tests/ui/settings_screen_i18n.test.ts`

## Verification

- Red: `npx.cmd vitest run tests\ui\settings_screen_i18n.test.ts --reporter=dot` failed because the Settings Audio tab and row labels still rendered English after selecting BCS.
- Green: `npx.cmd vitest run tests\ui\settings_screen_i18n.test.ts --reporter=dot` passed 3/3 after localization.
- Focused localization pack: `npx.cmd vitest run tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts --reporter=dot` passed 11/11.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk-size warnings.
- `git diff --check` passed.

## Roadmap Delta

Localization remains early and unreviewed, but the existing Settings-first BCS lane is now internally cleaner: the default Settings landing section is no longer an English island inside the localized shell.
