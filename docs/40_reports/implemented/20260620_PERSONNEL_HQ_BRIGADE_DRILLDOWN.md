# Personnel HQ Brigade Drilldown

**Date:** 2026-06-20  
**Type:** UI/read-model command-surface polish  
**Branch:** `codex/personnel-hq-brigade-drilldown`

## Summary

Army HQ Personnel now includes brigades and officers assigned directly to an `army_hq` command, instead of hiding the brigades and falling back to generic officer attachment copy.

## What Changed

- Personnel ORBAT grouping now treats `army_hq` formations as command owners for display and drilldown, while keeping corps counts and vacancy checks scoped to corps/corps assets.
- Officer assignment copy resolves Army HQ parent names, so HQ-assigned officers show the actual command name instead of `Attached command`.
- Personnel brigade rows are actionable buttons. Clicking an HQ-assigned brigade sets a compound Army HQ + formation selection in one store update so sequenced selection setters do not clear the parent context.

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui/personnel_player_safe_display.test.ts --pool=forks --reporter=dot` first failed because `Main Staff VRS` was absent and the HQ officer showed `Attached command`.
- Green proof: `npm.cmd exec -- vitest run tests/ui/personnel_player_safe_display.test.ts --pool=forks --reporter=dot` (6/6).
- Green proof: `npm.cmd run typecheck`.
- Green proof: `npm.cmd run qa:player-journeys` (21 files / 210 tests).
- Green proof: `npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`, strict-port cleanup verified).
- Green proof: `git diff --check`.

## Scope And Determinism

This is UI/read-model route polish, focused tests, browser QA, and documentation only. It does not change simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer output, randomness, timestamps, or persisted output ordering.
