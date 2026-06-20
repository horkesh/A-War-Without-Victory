# Recruitment Modal Label Copy

## Summary

The Recruitment modal now renders readable resource and equipment labels while preserving raw equipment ids for the backend command.

## Changes

- Replaced compact option copy (`cap`, `man`) with localized `Capital` and `Manpower` labels.
- Rendered faction and equipment-class values through player-safe/localized label helpers.
- Kept the raw selected equipment class as the internal value passed to `onApply`, while showing a read-only display label such as `Light Infantry`.
- Added focused modal coverage proving `cap`, `man`, `light_infantry`, and raw faction abbreviations do not appear in normal rendered copy.

## Verification

- Green focused proof passed: `npm.cmd exec -- vitest run tests/ui/endgame_verdict_screen_mount.test.ts tests/ui/command_surface_repurpose_panels.test.ts tests/ui/recruitment_modal_player_copy.test.ts --pool=forks --reporter=dot` (51/51).
- Worker focused proof also passed: `node node_modules\vitest\vitest.mjs run tests/ui/recruitment_modal_player_copy.test.ts --reporter=dot` (1/1).
- Broader gates passed: `npm.cmd run typecheck`; `npm.cmd exec -- vitest run tests/ui_i18n.test.ts tests/ui/accessibility_form_labels.test.ts --pool=forks --reporter=dot` (14/14); `git diff --check`; `npm.cmd run qa:player-journeys` (232/232); `npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`). `.tmp_live_surface_browser_sweep` was deleted afterward.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
