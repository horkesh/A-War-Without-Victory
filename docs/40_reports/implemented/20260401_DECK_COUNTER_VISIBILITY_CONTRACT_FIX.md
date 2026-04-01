## Summary

Fixed a tactical-map visibility regression where normal Deck counter rendering hid many formations while corps/sector/OOB selection could still reveal them through the highlighted overlay. The result was a broken visibility contract: selection acted like a second unit-visibility mode instead of just a highlight mode.

## Root Cause

- The base Deck counter layer in [buildTacticalDeckLayers.ts](/F:/A-War-Without-Victory/src/ui/map/layers/buildTacticalDeckLayers.ts) rendered only `is_stack_top` features.
- The highlighted overlay rendered from the full formation feature set.
- After the Deck migration, MapLibre `formation-markers` was hidden, so the base Deck layer became the sole normal visibility path.
- That meant normal map visibility and selection/highlight visibility no longer agreed on what counted as visible.

## Fix

- Changed the base Deck icon layer to render the full `formationsGeoJson.features` set instead of only top-of-stack features.
- Kept the dedicated highlighted overlay so white/unit-highlight styling still works for selected corps, sectors, brigades, and panel-driven selections.

## Verification

- Added regression test: [ui_map_deck_counter_visibility.test.ts](/F:/A-War-Without-Victory/tests/ui_map_deck_counter_visibility.test.ts)
- Verified:
  - `node_modules\\.bin\\tsx.cmd --test tests\\ui_map_deck_counter_visibility.test.ts`
  - `npx.cmd tsc --noEmit -p tsconfig.json`
  - `npm.cmd run desktop:map:build`
  - `npm.cmd run warroom:build`

## Files Changed

- [buildTacticalDeckLayers.ts](/F:/A-War-Without-Victory/src/ui/map/layers/buildTacticalDeckLayers.ts)
- [ui_map_deck_counter_visibility.test.ts](/F:/A-War-Without-Victory/tests/ui_map_deck_counter_visibility.test.ts)
