# Sector Demarcation Labels — Design (unfinished)

> Paused due to MapLibre font/glyph issues. Resume in fresh session.

## What works (commit 9f00edf)
- Chaikin-smoothed sector demarcation lines (3 passes)
- Increased DP tolerance (0.001°)
- Wide invisible hit-target layer (8-20px) for easier clicking

## What was attempted but broke
- Depth-faded lines (2-hop BFS from front, opacity 0.6→0.35→0.15)
- Corps boundary labels (XXX + names) as MapLibre symbol layers
- Live mode visibility (was dev-only)

## Known blocker
MapLibre font 404: `demotiles.maplibre.org/font/Open Sans Bold,Arial Unicode MS Bold/0-255.pbf`
returns 404. The `Cannot read properties of null (reading '0')` error cascades and may
block other layers. Need to either:
1. Self-host a glyph PBF server (protomaps font-maker or maplibre-gl-fonts)
2. Use a different glyph CDN that has Open Sans
3. Convert labels to HTML overlays (MapLibre markers) instead of symbol layers

The existing formation labels (line 1030 in MapContainer) use the SAME broken font stack
but render — investigate why (maybe icons mask the text failure, or labels load via different path).

## Design intent (from user)
- Reference: BB atlas map showing Sarajevo-Romanija / Herzegovina corps boundary near Rogatica
- Red line → XXX marker → red line, corps names in boxes on either side
- Short full names: "Sarajevo-Romanija", "Herzegovina", "Drina", "1st Krajina" etc.
- Always visible when fronts are visible (not dev-mode gated)
- Depth fade: lines extend 2 hops behind front, fading opacity

## Code ready (in buildSectorDemarcationGeoJSON.ts)
- `SectorDemarcationResult` type with `lines` + `labels` FeatureCollections
- BFS-based vertex depth computation (MAX_DEPTH=2)
- Label point computation (midpoint of longest chain, with angle)
- `CORPS_SHORT_NAMES` lookup table
- All pure-function, deterministic, no runtime issues

## Files to resume from
- `src/ui/map/map/builders/buildSectorDemarcationGeoJSON.ts` — has label generation
- `src/ui/map/map/MapContainer.tsx` — needs symbol layers added correctly
- Fix the font issue first, then wire the layers
