# OSM credit visibility: rendered probe (2026-11-15)

Real Electron app (`desktop:release:check` build), RBiH save with the presidential inbox filled, 1280x720 and 1920x1080. For each credit plate (`data-testid="osm-attribution-*"`) the probe asks the browser for the topmost element at the plate's top-left, centre and bottom-right (`document.elementFromPoint`).

| State | Plate | Before (main) | After (this PR) |
| --- | --- | --- | --- |
| Map, inbox open, 1280x720 | war-map | topmost is the plate itself | topmost is the plate itself |
| Map, inbox open, 1280x720 | minimap | covered by the inbox ("Read later" button) | not drawn |
| Map, inbox open, 1920x1080 | war-map | topmost is the plate itself | topmost is the plate itself |
| Map, inbox open, 1920x1080 | minimap | covered by an inbox card | not drawn |
| Map, corps rail open, 1280x720 | war-map | not probed | not drawn (the rail covers its column) |
| Map, corps rail open, 1280x720 | minimap | not probed | drawn, topmost at all three points |
| Map, unit rail open, 1920x1080 | minimap | not probed | drawn, topmost at all three points |

After: in every map state exactly the plates that can be seen are drawn, and the one drawn is topmost at all three probe points. Screenshots: `before_*_map.webp` (inbox open), `after_*_map_inbox.webp` (war-map credit), `after_*_map_unit_selected.webp` (minimap credit).

The desk (Warroom) screen draws no map, so the war-map plate there sits under the desk scene; it is not covered by the inbox.
