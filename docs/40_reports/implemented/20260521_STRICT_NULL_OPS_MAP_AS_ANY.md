# Strict-Null OpsMap As-Any Tail

**Date:** 2026-05-21
**Type:** Strict-null cleanup; UI map type-surface refactor.

## Summary

Cleaned the two `as any` sites in `src/ui/map/components/ops_modal/OpsMap.tsx`.

- The Deck `MapboxOverlay` control is now passed directly to MapLibre through its implemented control interface.
- The animated dashed arrow `PathLayer` now uses typed `PathStyleExtensionProps<ArrowPathData>` for dash/offset extension props instead of widening the full layer config.
- The typed dashed layer uses the current luma/deck depth parameter names (`depthWriteEnabled: false`, `depthCompare: 'always'`) for the same no-depth-test intent.

No operation planning behavior, target selection, map data, save schema, scenario data, or output tuning changed.

## Inventory Result

Current strict-null inventory floor after this slice:

```text
as_factionid_casts 2
as_unknown_casts 2
as_any_casts 174
non_null_assertions_dot 0
non_null_assertions_index 0
optional_fields_game_state 473
```

## Verification

```text
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot
PASS 74/74

npm.cmd run typecheck
PASS

npm.cmd run desktop:map:build
PASS with existing Vite browser-external/dynamic-import/chunk-size warnings
```
