# Settlement Status Label I18n

**Date:** 2026-06-20

**Type:** UI/read-model i18n copy polish.

## Summary

Settlement overview status rows now render authored localized labels for known settlement status ids instead of printing raw enum values such as `CONTESTED`. Unknown values fall back to neutral status-pending copy rather than exposing implementation ids.

## Player Impact

The selected-settlement panel now reads as player-facing staff copy in both English and BCS. Contested or consolidated status remains visible, but the UI no longer leaks uppercase adapter vocabulary into the live command surface.

## Verification

- Red proof first failed on visible `CONTESTED` in `SettlementDetailContent`.
- `npm.cmd exec -- vitest run tests/ui/settlement_supply_status.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot`
- `npm.cmd run typecheck`
- `npm.cmd run qa:player-journeys`
- `npm.cmd run qa:live-surface:browser`
- `git diff --check`

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
