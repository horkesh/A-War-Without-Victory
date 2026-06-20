# Ops Commander Unavailable Reason Copy

## Summary

Commander selection in the operations-planning modal now renders unavailable-officer reasons as localized player copy instead of raw staff shorthand.

## Changes

- Maps killed/KIA, captured, retired, Army HQ, enclave-locked, assigned-operation, and other-command availability blocks through EN/BCS i18n.
- Treats `status: killed` as unavailable, matching the existing `kia` handling and preventing killed officers from remaining selectable.
- Hides raw assigned-operation ids and names the other corps/command when an officer is unavailable because they are commanding elsewhere.
- Syncs the stale AAR final-held test expectation to the current `held at close` copy so baseline CI no longer expects removed `OBJ` shorthand.

## Verification

- Red focused proof first failed on missing `Fallen in service` / `Pao u sluzbi` copy and exposed raw `KIA`, `ASSIGNED TO OP`, and `raw_operation_id` output.
- Green focused proof passed: `npm.cmd exec -- vitest run tests/ui/ops_planning_target_discovery.test.ts --pool=forks --reporter=dot` (22/22).
- Expanded focused+i18n proof passed: `npm.cmd exec -- vitest run tests/ui/ops_planning_target_discovery.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` (35/35).
- Focused CommanderPhase + i18n + AAR CI-sync proof passed: `npm.cmd exec -- vitest run tests/ui/ops_planning_target_discovery.test.ts tests/ui_i18n.test.ts tests/ui/operation_aar_records_review.test.ts --pool=forks --reporter=dot` (52/52).
- TypeScript proof passed: `npm.cmd run typecheck`.
- Player-journey proof passed: `npm.cmd run qa:player-journeys` (232/232).
- Live browser proof passed: `npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`); `.tmp_live_surface_browser_sweep` was deleted afterward.
- Whitespace proof passed: `git diff --check`.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
