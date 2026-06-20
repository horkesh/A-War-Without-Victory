# Economy Facility-Type Label Copy

## Summary

The Economy panel now renders production facility type names instead of raw internal facility ids.

## Changes

- Added localized labels for `heavy_equipment`, `small_arms`, and `ammunition`.
- Replaced raw facility `type` display with a player-safe facility-type resolver and neutral fallback.
- Extended the command-surface repurpose panel test to prove readable facility labels render while raw ids do not.

## Verification

- Green focused proof passed: `npm.cmd exec -- vitest run tests/ui/endgame_verdict_screen_mount.test.ts tests/ui/command_surface_repurpose_panels.test.ts tests/ui/recruitment_modal_player_copy.test.ts --pool=forks --reporter=dot` (51/51).
- Worker focused proof also passed: `node node_modules\vitest\vitest.mjs run tests/ui/command_surface_repurpose_panels.test.ts --pool=forks --reporter=dot` (4/4).
- Broader gates passed: `npm.cmd run typecheck`; `npm.cmd exec -- vitest run tests/ui_i18n.test.ts tests/ui/accessibility_form_labels.test.ts --pool=forks --reporter=dot` (14/14); `git diff --check`; `npm.cmd run qa:player-journeys` (232/232); `npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`). `.tmp_live_surface_browser_sweep` was deleted afterward.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
