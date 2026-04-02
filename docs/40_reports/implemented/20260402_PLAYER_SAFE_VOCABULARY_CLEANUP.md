# 2026-04-02 - Player-safe vocabulary cleanup

## Scope

This slice removed remaining engine-facing language from live player-facing shell surfaces after the larger shell-ownership pass.

## Changes

- Army HQ `CombatRecordSection` now uses `Positions` instead of `Territory` for front-line gain/loss summaries.
- Ops modal `ObjectiveList` now says `Staging Area` instead of `Staging OSID`.
- Chronicle Wrapped now uses political-side display names:
  - `Republic of Bosnia and Herzegovina`
  - `Republika Srpska`
  - `Herceg-Bosna`
- Chronicle Wrapped territory copy now uses `positions` instead of `OSIDs`.

## Why this matters

Player-facing vocabulary is part of shell integrity. Even when the underlying data is filtered correctly, raw engine words make the product feel like an internal debugger rather than a finished command environment.

## Regression coverage

- `tests/wrapped_slides.test.ts`
- `tests/ui_opord_player_safe_labels.test.ts`

The guards were added to canonical existing suites because this repo's Vitest config does not auto-discover arbitrary new test files.

## Verification

- `node_modules\.bin\vitest.cmd run tests\wrapped_slides.test.ts tests\ui_opord_player_safe_labels.test.ts tests\warroom_player_visibility.test.ts tests\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
