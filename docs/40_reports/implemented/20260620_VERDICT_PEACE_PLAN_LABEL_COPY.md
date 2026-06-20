# Verdict Peace-Plan Label Copy

## Summary

Faction verdict reports now render authored peace-plan names instead of raw internal ids.

## Changes

- Resolved `peace_plans_accepted` and `peace_plans_rejected` entries through the peace-plan catalog before rendering Faction Report statistics.
- Kept a neutral player-safe fallback for unknown future peace-plan ids instead of printing underscore ids.
- Added a direct component proof that the verdict report shows `Vance-Owen Peace Plan` and `Contact Group Plan` while hiding `vance_owen` and `contact_group`.

## Verification

- Red focused proof first failed because the Faction Report rendered `vance_owen, contact_group`.
- Green focused proof passed: `npm.cmd exec -- vitest run tests/ui/endgame_verdict_screen_mount.test.ts --pool=forks --reporter=dot` (46/46).
- Integrated focused proof passed: `npm.cmd exec -- vitest run tests/ui/endgame_verdict_screen_mount.test.ts tests/ui/command_surface_repurpose_panels.test.ts tests/ui/recruitment_modal_player_copy.test.ts --pool=forks --reporter=dot` (51/51).
- Broader gates passed: `npm.cmd run typecheck`; `npm.cmd exec -- vitest run tests/ui_i18n.test.ts tests/ui/accessibility_form_labels.test.ts --pool=forks --reporter=dot` (14/14); `git diff --check`; `npm.cmd run qa:player-journeys` (232/232); `npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`). `.tmp_live_surface_browser_sweep` was deleted afterward.

## Scope

UI/read-model/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
