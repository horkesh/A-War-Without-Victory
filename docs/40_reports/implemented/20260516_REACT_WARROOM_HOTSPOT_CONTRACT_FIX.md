# React Warroom Hotspot Contract Fix

## Summary

The React Warroom shell now uses the same canonical clickable-region contract as the legacy Warroom: faction files under `/data/ui/hq_<faction>_clickable_regions.json`, authored against the fixed 2752x1536 scene plate. Bundled JSON remains only a fallback when the canonical file cannot be fetched.

## Root Cause

The React rewiring used bundled `hq_*_regions.json` files as primary input and treated the cork-board hotspot as a Warroom-local `strategic-overview` command. The canonical Warroom contract uses `desk_map` for primary tactical-map access. React also laid hotspots over the full viewport while the room image used contained image fitting, so hitboxes could drift away from the actual plate on non-matching aspect ratios.

## Changes

- `WarroomShellLayer` now fetches canonical `/data/ui/hq_*_clickable_regions.json` by faction and falls back to bundled JSON only when that request fails.
- The hotspot overlay is fitted to a centered 2752x1536 scene frame so authored coordinates stay aligned with the visible room plate.
- Region polygons are converted into CSS `clip-path` values so polygon-authored clickable areas are honored instead of acting as plain rectangles.
- The cork-board/map region in current data is restored to canonical `desk_map` / `open_operational_map` / `Operational Map` semantics across root data, bundled fallback data, and staged public data.
- `warroom_stage_assets.ts` now stages the faction-specific clickable-region files into `src/ui/warroom/public/data/ui/` as well as `dist/warroom/data/ui/`, preventing stale dev/public region JSON from drifting away from root data.

## Determinism

No simulation state, scenario data, save schema, turn ordering, random source, or persisted scenario output changed. The change is UI data routing, static JSON semantics, and build/staging support.

## Verification

- `npx.cmd vitest run tests\warroom_shell_layer.test.ts tests\ui\warroom_shell_accessibility.test.ts` - passed, 38 tests.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run desktop:map:build` - passed with existing Vite warnings.
- `npm.cmd run warroom:build` - passed with existing Vite warning.
- `npm.cmd run warroom:regions:validate -- data\ui\hq_rbih_clickable_regions.json data\ui\hq_rs_clickable_regions.json data\ui\hq_hrhb_clickable_regions.json` - non-gating fail on known planned anchors not present in current room art (`enclave_dispatch_folder`, `honors_memorial`, `intelligence_packet`, and `intelligence_journal` in current faction files). The hotspot fix does not add planned modal anchors.

## Notes

The installed build must be regenerated after this patch before Windows testing can reflect the fix.
