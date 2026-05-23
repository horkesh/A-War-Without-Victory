# Settings Startup Language Fix - 2026-05-23

## Scope

UI shell and language preference fix only. No simulation behavior, scenario data, save schema, event routing, Codex unlock logic, diagnostics, OOB, or tuning changed.

## Changes

- Settings modal panel now sits on `relative z-10`; the click-to-close backdrop is `z-0`.
- Settings panel clicks stop propagation, so real Electron/browser clicks on tabs and controls do not close the modal.
- Main menu now exposes the same persisted language selector as Settings through `useLocale()` and `awwv.locale`.
- Added regression coverage for tab switching not calling `onClose`, modal stacking, and main-menu language persistence.

## Verification

- `npx.cmd vitest run tests/ui/settings_screen_shell_cleanup.test.ts tests/ui/main_menu_language.test.ts tests/ui/settings_screen_i18n.test.ts --reporter=dot` - 8/8 passed.
- `npm.cmd run typecheck` - passed.
- `npx.cmd vitest run tests/ui/settings_screen_shell_cleanup.test.ts tests/ui/main_menu_language.test.ts tests/ui/settings_screen_i18n.test.ts tests/ui_i18n.test.ts --reporter=dot` - 15/15 passed.
- `npm.cmd run desktop:map:build` - passed with existing Vite externalization/dynamic-import/chunk-size warnings.
