# Army HQ Aftermath Focus Reset

**Date:** 2026-06-20  
**Type:** UI/store route-state hygiene  
**Branch:** `codex/army-hq-aftermath-focus-reset`

## Summary

Closing Army HQ now clears the focused aftermath turn along with focused operation AAR and decision-consequence records. This prevents stale Army HQ Records aftermath focus from reopening or expanding an old turn after the player leaves Army HQ for Chronicle, Codex, Desk, War Map, or other shell routes.

## What Changed

- `setArmyHQOpen(false)` now resets `focusedAftermathTurn` to `null`.
- `tests/ui/stale_state_resets.test.ts` now pins the full close behavior for all three focused Records targets.

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui/stale_state_resets.test.ts --pool=forks --reporter=dot` first failed because `focusedAftermathTurn` remained `17`.
- Green proof: `npm.cmd exec -- vitest run tests/ui/stale_state_resets.test.ts --pool=forks --reporter=dot`
- Green proof: `npm.cmd exec -- vitest run tests/ui/stale_state_resets.test.ts tests/ui/gamestore_field_inspection.test.ts tests/ui/gamestore_load_reset.test.ts tests/ui_shell_navigation.test.ts tests/ui/shell_navigation_ownership.test.ts tests/ui/records_button_behavior.test.ts --pool=forks --reporter=dot`
- Green proof: `npm.cmd run typecheck`

## Scope And Determinism

This is UI/store route-state cleanup, focused tests, and documentation only. It does not change simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer output, randomness, timestamps, or persisted output ordering.
