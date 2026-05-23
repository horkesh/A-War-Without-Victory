# BCS Side Picker Localization

**Date:** 2026-05-23

**Type:** New-campaign side-picker UI localization slice. No simulation behavior, combat math, operation behavior, scenario data, calibration/army-arc tuning, save schema, generated artifact, network IO, or random source changed.

## Summary

The side-picker/new-campaign overlay now renders through the existing English/BCS localization substrate. The slice covers the modal title, faction force suffix, load-save file aria label, Load Save from Disk action, Continue Last Run action, and Close action.

Faction IDs and army names remain canonical/proper labels.

## Verification

- Red: `npx.cmd vitest run tests\ui\side_picker_i18n.test.ts --reporter=dot` failed because BCS mode still rendered English side-picker copy.
- Green: `npx.cmd vitest run tests\ui\side_picker_i18n.test.ts --reporter=dot` passed 2/2 after localization.
- Focused localization pack: `npx.cmd vitest run tests\ui\side_picker_i18n.test.ts tests\ui\credits_screen_i18n.test.ts tests\ui\main_menu_i18n.test.ts tests\ui\settings_screen_i18n.test.ts tests\ui\pause_menu_i18n.test.ts tests\ui_i18n.test.ts --reporter=dot` passed 18/18.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/chunk-size warnings.
- `git diff --check` passed.

## Roadmap Delta

Localization now covers another first-session product-shell surface: the new-campaign side picker. Broad in-game surface extraction and native-speaker review remain open.
