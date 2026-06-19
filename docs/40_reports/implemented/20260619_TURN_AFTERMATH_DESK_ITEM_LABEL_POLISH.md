# Turn Aftermath Desk Item Label Polish

**Date:** 2026-06-19
**Type:** UI/read-model player-copy polish

## Summary

Turn Aftermath's Command Desk section now labels pending desk item types through the shared decision-surface registry instead of rendering raw inbox type values with underscores replaced by spaces.

This aligns the modal with the Army HQ Records aftermath panel, which already used the registry-backed labels.

## Player Impact

- `convoy_decision` now displays as `Humanitarian convoy`.
- Other registered desk item families use the same player-facing labels as Records and inbox surfaces.
- Unknown/unregistered item types fall back to `Review item` instead of raw internal identifiers.

## Verification

- Red/green regression: `npx.cmd vitest run tests/ui/turn_aftermath_modal_i18n.test.ts`
- Focused pack: `npx.cmd vitest run tests/ui/turn_aftermath_modal_i18n.test.ts tests/ui/turn_aftermath.test.ts tests/ui/records_button_behavior.test.ts`
- TypeScript: `npm.cmd run typecheck -- --pretty false`

## Scope

UI/read-model copy and tests only. No simulation logic, scenario data, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
