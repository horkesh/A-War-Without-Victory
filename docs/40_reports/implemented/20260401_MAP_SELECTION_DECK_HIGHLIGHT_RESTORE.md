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

## Follow-up: Formation Panels + Non-Top-Stack White Selection

After the first restore pass, two additional issues remained:

- formation-driven panels were not always feeding the same corps/sector hover truth as the OOB sidebar
- selected brigades could still fail to appear white when they were not the top-of-stack feature rendered by the base Deck counter layer

### Follow-up implementation

- added a dedicated highlighted Deck icon layer so selected/highlighted brigades render in white even when they are not the top stack feature
- bridged formation panels into map highlight state:
  - `OrbatPanel.tsx`
  - `CorpsDetail.tsx`
  - `CorpsFrontPanel.tsx`
- panel-driven corps/sector context now updates the same `hoveredCorpsId` / `hoveredSectorId` state used by the map highlight logic

### Follow-up verification

- `npm run warroom:build`

## Follow-up: Deck Visibility Contract (2026-04-01)

After the selection restore, a deeper regression surfaced: non-top-stack formations could be hidden in normal map view but reappear when selected through corps/sector/OOB highlighting.

### Root cause

- the base Deck counter layer rendered only `is_stack_top` features
- the highlighted Deck overlay rendered matching formations from the full feature set
- MapLibre `formation-markers` was already hidden when Deck counters were enabled

That created a broken invariant:

- normal visibility used one rule
- highlight visibility used another

So selection acted like a hidden visibility mode instead of a pure styling layer.

### Correction

The base Deck counter layer was changed to render the full formation feature set, restoring a single visibility contract between normal map state and highlighted state.

See:

- [20260401_DECK_COUNTER_VISIBILITY_CONTRACT_FIX.md](./20260401_DECK_COUNTER_VISIBILITY_CONTRACT_FIX.md)

## Follow-up: Hover Must Not Whiten Brigades (2026-04-01)

After the visibility-contract fix, one more regression remained: merely hovering a corps or sector could still change brigade counters, making units appear to flicker between faction color and white.

### Root cause

The Deck highlight bridge was still mixing two different concepts:

- transient hover context used for line emphasis
- durable selection state used for brigade whitening

`collectHighlightedFormationIds()` accepted both selected and hovered ids, so the same highlighted formation set was being used for:

- corps/sector line glow
- white brigade overlays

At the same time, the base Deck icon layer had been taught to swap to white icons when a formation id appeared in that highlighted set.

### Correction

- `MapContainer.tsx`: Deck brigade whitening now derives only from real selection state:
  - `selectedFormationId`
  - `selectedCorpsId`
  - `selectedCorpsFrontSectorId`
- hover state remains available for sector/front-line emphasis, but no longer feeds the Deck white-counter path
- `buildTacticalDeckLayers.ts`: base Deck counters always render faction-colored `icon_id`; white counters are produced only by the dedicated highlighted overlay layer

### Resulting contract

- all brigades remain visible in faction color in normal map state
- hover may emphasize lines/sector context, but must not recolor brigade counters
- only selected brigade / sector / corps state may whiten brigade counters

## Follow-up: Corps Selection Must Use Corps Ownership, Not Only Sector Membership (2026-04-01)

After the hover/selection split, one more corps-specific gap remained: selecting a corps still failed to whiten every brigade belonging to that corps.

### Root cause

The corps highlight path was still effectively sector-derived:

- corps selection gathered sector ids from `corpsFrontSectors`
- highlighted brigades were then discovered by matching `feature.properties.sector_id`

That misses real corps-owned brigades which do not currently have a sector assignment, such as reserves or other non-front brigades.

### Correction

- `buildFormationsGeoJSON.ts` now carries `corps_id` into formation marker properties
- the selection helper now highlights corps-owned brigades directly by `corps_id`
- sector selection remains sector-scoped
- MapLibre pulse/white-overlay fallback filters for corps selection now also use `corps_id` instead of only `sector_id`

### Resulting contract

- sector selection highlights brigades assigned to that sector
- corps selection highlights all brigades belonging to that corps, including brigades without a current sector assignment
