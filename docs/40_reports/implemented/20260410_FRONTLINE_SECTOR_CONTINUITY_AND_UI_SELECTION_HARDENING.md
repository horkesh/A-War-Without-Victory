# Frontline Sector Continuity And UI Selection Hardening

Date: 2026-04-10

## Problem

The live tactical map exposed three linked failures around the 2nd Krajina / Bosanska Krupa front:

1. Sector selection and hover only worked reliably after selecting a brigade first because map interactions did not query `sector-fill` at all.
2. A tiny Arapusa-side fragment could survive as its own sector even after sibling-front canonicalization, producing broken sector glow continuity.
3. A winning probe against an undefended enemy-held OSID could still leave political control unchanged, which kept `op:bosanska_krupa:arapusa_2` enemy-held even after a successful RS attack.

The root cause was not "bad map geometry." It was a split engine/UI ownership problem:

- the UI only mapped sectors from front-adjacent friendly OSIDs instead of full sector territory,
- the sector builder had no late same-front fragment repair after sibling-front ownership rewrites,
- and probe control-flip logic treated undefended tiles like defended reconnaissance targets.

## Files changed

- `src/ui/map/data/types.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/utils/sectorUtils.ts`
- `src/ui/map/map/useMapInteractions.ts`
- `src/sim/combat/corps_front_sectors.ts`
- `src/sim/combat/attack_resolution_osid.ts`
- `tests/ui_map_interactions.test.ts`
- `tests/ui_map_sector_lookup.test.ts`
- `tests/late_sibling_front_fragment_merge.test.ts`
- `tests/probe_territory_flip.test.ts`

## What changed

### 1. Sector selection now uses sector territory, not brigade-first indirection

- `CorpsFrontSectorView` now carries `territory_osids` through the adapter.
- `buildOsidToSectorMap()` now indexes a sector by `territory_osids` first and only falls back to the old front-friendly collection path.
- `useMapInteractions()` now registers click / hover / leave handlers for `sector-fill`, so the map can resolve a sector directly from the sector area.

### 2. Tiny sibling-front fragments are repaired after late ownership rewrites

- Added `mergeLateSiblingFrontFragments(...)` to `corps_front_sectors.ts`.
- It reruns the existing small-sector merge + disconnected-territory repair after `canonicalizeSiblingFrontOwnership(...)` and before sealing / relocation.
- This closes the exact failure mode where a valid local front line is split into a tiny leftover fragment late in the builder pipeline.

### 3. Undefended probe victories can now take empty enemy-held ground

- `attack_resolution_osid.ts` now allows territorial flip when:
  - the attacker wins,
  - the operation is a probe,
  - the target is enemy-controlled,
  - and there are no defending formations on the tile.
- Defended probes still do not flip control.

## Proof

### UI interaction proof

- Before: `useMapInteractions()` did not register `sector-fill` at all, so direct sector click/hover depended on other selected surfaces.
- After: `sector-fill` is part of the registered click / mousemove / mouseleave layer set, and sector lookup is territory-aware.

### Engine continuity proof

Baseline run: `n1421`

- `sector:vrs_2nd_krajina:0` survived as a 2-edge Arapusa fragment:
  - `op:bosanska_krupa:arapusa_2__op:bosanska_krupa:donji_dubovik_2`
  - `op:bosanska_krupa:arapusa_2__op:bosanska_krupa:jasenica_2`
- A separate sibling front (`sector:vrs_2nd_krajina:2`) carried the rest of the Bihać / Krupa line.

Post-fix run: `n1422`

- The tiny Arapusa fragment no longer exists as its own sector.
- `op:bosanska_krupa:arapusa_2` now belongs to `sector:vrs_2nd_krajina:1`, the main Bihać / Krupa sector.
- The 2nd Krajina corps now has:
  - one Kupres / Glamoč front sector
  - one Bihać / Krupa front sector
- The fragment merge stayed local to the actual sibling front; it did not merge those two distinct fronts together.

### Arapusa control proof

Baseline behavior from prior run state:

- `op:bosanska_krupa:arapusa_2` could remain politically `RBiH` after a successful RS probe attack on an undefended tile.

Post-fix run: `n1422`

- `political.initial_political_controllers['op:bosanska_krupa:arapusa_2'] = 'RBiH'`
- `political.political_controllers['op:bosanska_krupa:arapusa_2'] = 'RS'`
- `political.contested_control['op:bosanska_krupa:arapusa_2'] = false`

## Verification

- `npx.cmd vitest run tests/ui_map_interactions.test.ts tests/ui_map_sector_lookup.test.ts tests/late_sibling_front_fragment_merge.test.ts tests/probe_territory_flip.test.ts tests/front_sector_player_visibility.test.ts tests/ui_map_tooltip_player_visibility.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run sim:scenario:run:40w`
- `node tools/validate_run_consistency.cjs runs\\apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1422`
- `npm.cmd run test:vitest`
- `npm.cmd run build`
- `npm.cmd run recovery:check`

Key results:

- fresh 40w run: `n1422`
- final state hash: `c947e033c9699c70`
- consistency validation: `PASS`
- full vitest: `250 files / 3146 tests passed`

## Architecture lesson

When a sector is supposed to represent a frontline line, there are two separate contracts that must both hold:

1. the engine must keep late sibling-front rewrites from leaving micro-fragments behind,
2. the UI must resolve sectors from their full territory/selection surface rather than only from brigade-selected or front-adjacent OSIDs.

If either side drifts, the player sees the same symptom: a broken or non-clickable sector line.

## Follow-up correction

The first pass of this lane fixed the engine-side fragment and the Arapuša control issue, but it did **not** fully solve the visible broken selected-sector glow in the live map.

That remaining symptom turned out to be a renderer-level bug:

- the black/white frontline base was stitched into longer polylines,
- but the selected-sector glow still rendered raw per-edge `glow` segments from `buildCorpsFrontLinesGeoJSON()`.

So even with correct sector ownership, the selected white trail could still appear broken at edge joints.

The follow-up fix:

- merges connected glow segments per `(faction, corps_id, sector_id, sub_segment_id, offset_side)` group before emitting the front-lines source,
- and highlights selected sector territory from `territory_osids` rather than the older front-friendly subset.

Additional verification:

- `npx.cmd vitest run tests/ui_sector_glow_continuity.test.ts tests/ui_map_interactions.test.ts tests/ui_map_sector_lookup.test.ts tests/front_sector_player_visibility.test.ts tests/ui_map_tooltip_player_visibility.test.ts`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

This follow-up is renderer/UI only. It does not change the `n1422` simulation outcome; it corrects how the already-correct sector is highlighted on the map.
