# AAR / ORBAT Role Label Copy

## Summary

AAR battle casualty rows and ORBAT recent-engagement rows now spell out attacker/defender roles instead of compact staff shorthand.

## Changes

- Replaced AAR casualty labels `att` / `def` with localized full role labels.
- Replaced ORBAT recent-engagement labels `ATK` / `DEF` with localized full role labels.
- Widened the ORBAT recent-engagement role column so the full labels fit without crowding casualty numbers.
- Added focused regression coverage for AAR casualty rows and ORBAT recent engagements.

## Verification

- Red focused proof first failed on visible `att -12 / def -20` AAR casualty copy and `ATK` / `DEF` ORBAT recent-engagement copy.
- Green focused proof passed: `npm.cmd exec -- vitest run tests/ui/aar_tooltip_friction_labels.test.ts tests/ui/operation_aar_records_review.test.ts --pool=forks --reporter=dot` (20/20).
- TypeScript proof passed: `npm.cmd run typecheck`.
- Whitespace proof passed: `git diff --check`.
- Player-journey proof passed: `npm.cmd run qa:player-journeys` (232/232).
- Live browser proof passed: `npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`); `.tmp_live_surface_browser_sweep` was deleted afterward.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
