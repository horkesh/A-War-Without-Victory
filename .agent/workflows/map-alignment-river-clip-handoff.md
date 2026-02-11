---
description: Orchestrator delegation — Map alignment and river clipping. Assign to Map/Geometry + Technical Architect.
---

# Map Alignment & River Clipping — Orchestrator Handoff

**Date:** 2026-02-07  
**Status:** River clipping DONE (clip at derivation). Alignment open if control/base misalignment persists.  
**Owner:** Map/Geometry + Technical Architect  
**Context:** River clipping implemented at derivation; rivers/roads clipped to BiH in phase_A1_derive_base_map.ts. User confirmed `bih_adm0.geojson` is in `data/source/boundaries/`.

---

## Orchestrator Delegation (2026-02-07)

- **Next single priority:** If control polygons and A1 base map remain misaligned in the warroom, Map/Geometry + Technical Architect should document coordinate spaces (A1_BASE_MAP_REFERENCE.md) and determine whether to reproject control zones to match A1 or vice versa. Do not mix bounds at render time.
- **Success criterion:** Rivers no longer visible outside BiH (verify in warroom after `npm run map:a1:derive` and asset stage).

---

## Goal

1. **Align** settlement polygons (control layer) and A1 base map (rivers, roads) so they render consistently.
2. **Clip rivers** (and roads if needed) to BiH national boundary so nothing draws outside.

---

## Constraints (from preferences)

- Do not merge bounds from different coordinate spaces (A1 TPS vs SVG_PIXELS_LEGACY).
- Clip at **derivation time** when coordinate spaces differ — prefer fixing data in `phase_A1_derive_base_map.ts` over render-time clip.
- BiH boundary source: `data/source/boundaries/bih_adm0.geojson`.

---

## Current State

- **Control polygons / bounds:** `settlements_viewer_v1.geojson` (likely SVG_PIXELS_LEGACY).
- **Base map:** `A1_BASE_MAP.geojson` from `phase_A1_derive_base_map.ts` (TPS-projected from OSM + bih_adm0).
- **Boundary:** A1 already includes boundary from bih_adm0; phase_A1 loads from `data/source/boundaries/bih_adm0.geojson`.
- **Rivers:** OSM waterways, TPS-projected; extend beyond BiH border.

---

## Recommended Approach

1. **Document coordinate spaces** — Confirm which space each dataset uses (A1, settlements_viewer, control_zones). See `docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md`.

2. **Clip at derivation** — In `phase_A1_derive_base_map.ts`, intersect river (and road) LineStrings with BiH boundary polygon before writing. Use bih_adm0 (or the projected boundary) as the clipping polygon. Libraries: turf.js `booleanIntersects`/`lineSlice` or similar line-polygon intersection.

3. **Verify warroom** — Re-run `npm run map:a1:derive`, stage assets, confirm rivers no longer show outside BiH.

4. **Alignment** — If control polygons and A1 remain misaligned, determine whether to reproject one to match the other (single canonical space) or document the intended transform. Do not mix bounds at render time.

---

## Handoff

**Orchestrator → Map/Geometry + Technical Architect:** Execute the approach above. Update A1_BASE_MAP_REFERENCE.md if derivation steps change. Add ledger entry on completion.
