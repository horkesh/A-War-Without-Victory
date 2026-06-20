# OOB HQ Reserve Drilldown

**Date:** 2026-06-20  
**Type:** UI/read-model command-surface polish  
**Branch:** `codex/oob-hq-reserve-drilldown`

## Summary

The tactical OOB sidebar now renders HQ-assigned reserve brigades under their actual Army HQ parent and lets the player click individual reserve brigade labels into the correct Army HQ + formation drilldown.

## What Changed

- OOB HQ reserve rows are built from the reserve brigade grouping instead of the already-filtered corps army grouping.
- Army HQ formations are included in the OOB command-name lookup, so the reserve header shows the real HQ formation name instead of generic `Main Staff`.
- HQ reserve brigade labels are buttons with an atomic Army HQ + formation selection route, preserving the parent command context.
- `qa:player-journeys` now includes the OOB HQ reserve drilldown regression.

## Verification

- Red proof: `npm.cmd exec -- vitest run tests/ui/oob_drilldown_routing.test.ts --pool=forks --reporter=dot` first failed because `Reserve HQ / Main Staff VRS` was absent.
- Green proof: `npm.cmd exec -- vitest run tests/ui/oob_drilldown_routing.test.ts --pool=forks --reporter=dot` (1/1).
- Green proof: `npm.cmd exec -- vitest run tests/ui/oob_drilldown_routing.test.ts tests/ui/oob_operations_panel.test.ts tests/ui_map_panel_rail.test.ts tests/ui/panel_rail_ownership.test.ts --pool=forks --reporter=dot` (15/15).
- Green proof: `npm.cmd run typecheck`.
- Green proof: `npm.cmd run qa:player-journeys` (22 files / 211 tests).
- Green proof: `npm.cmd run qa:live-surface:browser` (`live surface browser sweep ok`, strict-port cleanup verified).
- Green proof: `git diff --check`.

## Scope And Determinism

This is UI/read-model route polish, focused tests, QA gate coverage, and documentation only. It does not change simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer output, randomness, timestamps, or persisted output ordering.
