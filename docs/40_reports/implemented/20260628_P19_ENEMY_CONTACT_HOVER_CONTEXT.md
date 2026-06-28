# P19 Enemy Contact Hover Context

**Date:** 2026-06-28  
**Branch:** `codex/p19-d2-polish-continuation`  
**Scope:** UI/map-interaction/read-model/test/docs polish only.

## Summary

This packet closes the Confucius P19 residual where synthetic `enemy_contact:*` map markers could lose settlement and sector context on hover.

- `useMapInteractions` now passes formation marker properties through `onFormationHover`.
- `MapContainer` uses `location_osid`, or the encoded synthetic contact id as fallback, to keep hovered-sector context for enemy contacts.
- `tooltipPlayerSafe` recovers the encoded enemy-contact OSID and renders the settlement subtitle while leaving hidden enemy identity and stats redacted.

## Verification

- `npm.cmd exec -- vitest run tests/ui_map_interactions.test.ts tests/ui_map_tooltip_player_visibility.test.ts --pool=forks --reporter=dot`
  - Passed: 2 files / 39 tests.
- `npm.cmd run typecheck`
  - Passed.

## Scope Guard

No simulation logic, event evaluator mechanics, event JSON, scenario source data, startup snapshot construction, save schema, calibration thresholds, golden manifests, structural fingerprint artifacts, Srebrenica/Zepa event-owned receipt behavior, packaging, randomness, persisted timestamps, locale sorting, or output ordering changed.
