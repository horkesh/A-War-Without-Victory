# Historical Event Fallback Copy

**Date:** 2026-06-20
**Type:** UI/read-model i18n copy polish
**Branch:** `codex/historical-event-fallback-copy`

## Summary

Historical events with missing or unsafe display text no longer fall back to raw event ids in adapter or settlement timeline copy. The adapter now keeps event ids as metadata while using localized neutral fallback copy for player-facing text, and settlement timelines sanitize any raw-looking historical-event text before rendering.

## Implementation

- Added localized `settlementTimeline.historicalEvent.fallback` copy in EN and BCS.
- Updated `deriveHistoricalEvents(...)` to use neutral fallback text when event text is absent, identical to the id, or raw-token-like.
- Updated `buildSettlementTimeline(...)` to guard historical event titles against raw ids at the final display boundary.
- Extended `tests/ui/settlement_timeline_i18n.test.ts` to prove a missing-text event preserves its internal id while rendering neutral BCS copy.

## Verification

- `npm.cmd exec -- vitest run tests/ui/settlement_timeline_i18n.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 2 files / 17 tests.
- `npm.cmd run typecheck` passed.

## Scope

UI/read-model/i18n/test/docs polish only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
