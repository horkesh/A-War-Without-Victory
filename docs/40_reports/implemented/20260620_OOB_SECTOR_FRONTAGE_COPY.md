# OOB Sector Frontage Copy

**Date:** 2026-06-20  
**Type:** UI/read-model copy polish  
**Branch:** `codex/oob-sector-frontage-copy`

## Summary

The OOB sector rows no longer label `length_edges` as an approximate kilometer distance. That field is a frontage segment count, so the player now sees `{count} front segments` instead of `~{count} km`.

## What Changed

- `OOBSidebar` renders sector frontage through a localized `oob.sectorFrontSegments` label.
- English and BCS i18n maps include the new OOB frontage label.
- `tests/ui/oob_operations_panel.test.ts` pins the player copy and rejects the stale `~4 km` display.

## Verification

- Red proof: focused OOB test first failed with `Central Bosnia lineheld1 on line - ~4 km - Held coverage` when expecting `4 front segments`.
- Green proof: `npm.cmd exec -- vitest run tests/ui/oob_operations_panel.test.ts tests/ui/gui_audit_label_discipline.test.ts --pool=forks --reporter=dot`
- Green proof: `npm.cmd run typecheck`
- Green proof: `npm.cmd run qa:player-journeys`

## Scope And Determinism

This is UI/read-model copy, i18n, focused tests, and documentation only. It does not change simulation logic, sector construction, map geometry, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer output, randomness, timestamps, or persisted output ordering.
