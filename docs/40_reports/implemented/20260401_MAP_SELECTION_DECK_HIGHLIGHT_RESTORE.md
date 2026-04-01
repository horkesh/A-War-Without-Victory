# 2026-04-01 Map Selection Deck Highlight Restore

## Summary

Restored visible brigade selection/highlight behavior after the counter renderer moved from MapLibre symbols to Deck.gl icons.

The core fix was to move white-counter selection rendering into the active Deck icon layer instead of relying on the hidden MapLibre `formation-white-pulse-overlay` path.

## Behavior Restored

- selecting a corps now paints its brigades white in the visible Deck counter layer
- selecting a sector now paints that sector's brigades white in the visible Deck counter layer
- selecting a brigade now paints that brigade white in the visible Deck counter layer
- brigade sub-segment glow remains handled by the existing MapLibre AoR highlight layers
- formation-label interaction hooks were removed so the interaction model no longer depends on hidden formation labels

## Root Cause

Selection state and MapLibre highlight logic were still mostly intact in `MapContainer.tsx`, but the user-visible brigade counters had moved to Deck.gl.

That created a split:

- selection state changed correctly
- MapLibre overlays updated correctly
- the user-visible Deck counters never received the white-highlight state

So the feature looked "gone" even though the state pipeline still existed.

## Implementation

### Deck icon selection awareness

Added highlighted-formation support to the tactical Deck layer builder so counter icons can switch from `icon_id` to `white_icon_id` when the formation is selected by:

- brigade selection
- sector selection
- corps selection
- existing hover-derived sector/corps highlight state

### Shared selection-to-Deck bridge

Added a small selection bridge in `MapContainer.tsx` that derives highlighted brigade ids from:

- `selectedFormationId`
- `selectedCorpsId`
- `selectedCorpsFrontSectorId`
- `hoveredSectorId`
- `hoveredCorpsId`
- current `formationsGeoJson`
- current `loadedGameState.corpsFrontSectors`

This keeps Deck icon whitening aligned with the same authority already used by the MapLibre sector/front highlight path.

### Formation-label cleanup

Removed `formation-labels` from the remaining MapLibre interaction priority/context-hover path because visible brigade interaction is now owned by:

- Deck icon picking for counters
- MapLibre front-edge/osid layers for line and terrain interactions

## Files

- `src/ui/map/layers/buildTacticalDeckLayers.ts`
- `src/ui/map/layers/composeTacticalDeckLayers.ts`
- `src/ui/map/map/MapContainer.tsx`
- `src/ui/map/map/useMapInteractions.ts`

## Verification

Ran:

- `npm run warroom:build`

Result:

- build passed
- no new TypeScript or Vite errors introduced by the selection/highlight bridge

## Notes

- This change restores visible selection truth for the active Deck counter renderer.
- It does not redesign corps-card click semantics or broader sidebar selection UX.
- It also does not attempt to restore MapLibre-only brigade hover behavior; this pass focused on the explicit selection behaviors requested.
