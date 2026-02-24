# OSID as Base Layer Phase 2 (B(a)) — Implementation Report

**Date:** 2026-02-24  
**Status:** Complete  
**Plan:** [OSID_AS_BASE_LAYER_PHASE2_IMPLEMENTATION_PLAN.md](../../30_planning/OSID_AS_BASE_LAYER_PHASE2_IMPLEMENTATION_PLAN.md)

---

## Summary

Implemented **Option B(a)** of the OSID as base layer proposal: a build pipeline that produces operational geometry and contact graph **without** using canonical SID geometry as the input to the build. Operational boundaries are sourced from an **OSID-native** geometry file; the canonical layer is used only to **derive** `canonical_to_operational_map` via point-in-polygon.

---

## What was done

1. **Plan updated** — Locked B(a); documented that `canonical_to_operational_map` remains required and is derived via point-in-polygon (canonical settlement centroids → containing OSID polygon).

2. **New script: `scripts/derive_operational_osid_first.ts`**
   - **Inputs:**  
     - `data/derived/operational/operational_settlements.geojson` (OSID-native source; bootstrap from one legacy run or future Merger export).  
     - `data/derived/settlements_wgs84_1990.geojson` (canonical features for centroid and point-in-polygon).
   - **Steps:**  
     - Load OSID GeoJSON; build OSID → feature map; sort OSIDs (deterministic).  
     - Load canonical GeoJSON; for each canonical feature (sorted by sid), compute centroid, find containing OSID via `turf.booleanPointInPolygon`; build `canonical_to_operational_map`.  
     - Derive contact graph from OSID geometry: for each pair of OSID features (i &lt; j), if `turf.booleanIntersects` then add edge; sort edges (deterministic).  
     - Write same three artifacts to same paths: `operational_settlements.geojson` (passthrough), `canonical_to_operational_map.json`, `operational_contact_graph.json`.
   - **Determinism:** All iteration over OSIDs and SIDs uses `localeCompare` sort; no timestamps or randomness.

3. **npm script** — `map:derive:operational-osid-first` added to `package.json`.

4. **Docs** — [MAP_BUILD_SYSTEM.md](../../20_engineering/MAP_BUILD_SYSTEM.md): new subsection "Operational (OSID) layer (Phase 2 B(a))" documenting legacy vs OSID-first derive and when to use each.

---

## Verification

- **Run:** `npx tsx scripts/derive_operational_osid_first.ts` — 753 OSID features, 5797 canonical SIDs assigned, 2129 edges (geometry-only adjacency).
- **tsc:** `npx tsc --noEmit` — clean.
- **Vitest:** `npx vitest run` — 157 passed, 13 skipped.

---

## Decisions and flags for user review

- **Contact graph edge count:** OSID-first derives edges from **geometry only** (`booleanIntersects`). Legacy derives from canonical graph + merge (3259 edges). Phase 2 run produced **2129 edges**. If downstream (ZoC, movement, front edges) requires the same edge set, options are: (1) add centroid-distance adjacency as fallback for “near but not touching” OSIDs, or (2) accept geometry-only adjacency and validate scenario runs. **Architect decision:** Ship geometry-only; flag for user review if scenario or HoI map regress.
- **Canonical SID coverage:** 5797 SIDs assigned vs ~5823 canonical (Mostar split can add one; a few may lack centroid or fall outside all OSID polygons). Unassigned SIDs are omitted from `canonical_to_operational_map`; consumers that expect every canonical SID to have an OSID may need a fallback or validation. **Flag for user review** if init or scenario break.

---

## Files touched

| File | Change |
|------|--------|
| `docs/30_planning/OSID_AS_BASE_LAYER_PHASE2_IMPLEMENTATION_PLAN.md` | Status B(a) locked; §2.3 and §9 updated. |
| `scripts/derive_operational_osid_first.ts` | New (OSID-first derive pipeline). |
| `package.json` | Added `map:derive:operational-osid-first`. |
| `docs/20_engineering/MAP_BUILD_SYSTEM.md` | Subsection "Operational (OSID) layer (Phase 2 B(a))". |

---

## References

- [OSID_AS_BASE_LAYER_PROPOSAL.md](../../30_planning/OSID_AS_BASE_LAYER_PROPOSAL.md) — Option A/B/C.
- [20260222_OPERATIONAL_SETTLEMENT_MERGER_AND_HOI_MAP_REWORK.md](20260222_OPERATIONAL_SETTLEMENT_MERGER_AND_HOI_MAP_REWORK.md) — Legacy derive and 753 OSIDs.
- CONSOLIDATED_IMPLEMENTED §38 — Phase 1 (runtime OSID-only).
