# Tactical Map Sector Demarcation Overlay Removal

**Date:** 2026-05-16
**Status:** Implemented
**Scope:** UI/render cleanup only

## Summary

Removed the same-faction lateral sector demarcation overlay from the tactical map. These were the red/green/blue internal sector boundary lines that crossed friendly territory and made the map read as cluttered or path-like.

Sector readability now uses:

- front/contact lines for hostile boundaries
- selected-sector fill and glow for active inspection
- brigade rings for sector-owned formations

No simulation state, scenario data, save schema, operation logic, combat math, OOB, or sensitive-history representation changed.

## Implementation

- Removed `buildSectorDemarcationGeoJSON.ts` and its builder tests.
- Removed `sector-demarcation` source/layer creation from `MapContainer.tsx`.
- Removed demarcation visibility toggling, click hit layers, and interaction priority plumbing.
- Removed demarcation hitbox constants from `interactionLayerConfig.ts`.
- Added a static regression guard that prevents `MapContainer.tsx` from rematerializing `sector-demarcation` sources/layers.
- Updated tactical map and GUI master docs to state that same-faction sector demarcation lines are removed.

## Determinism

UI-only removal. No timestamps, randomness, persisted output ordering, scenario output, save serialization, or engine state is affected.

## Verification

Focused red proof:

- `npx.cmd vitest run tests\dynamic_interaction_layers.test.ts tests\ui_map_no_sector_demarcation_overlay.test.ts` failed before implementation because `MapContainer.tsx` still contained `sector-demarcation`.

Focused green proof:

- `npx.cmd vitest run tests\dynamic_interaction_layers.test.ts tests\ui_map_no_sector_demarcation_overlay.test.ts tests\ui_map_interactions.test.ts` passed 21/21 after removal.

Broader checks are recorded in the ledger entry for this change.
