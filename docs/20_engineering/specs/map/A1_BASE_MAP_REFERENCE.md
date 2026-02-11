# A1 Base Map — Tactical Base Map & Data Foundation (Canonical Reference)

**Status:** STABLE  
**Date:** 2026-02-07  
**Authority:** This document is the single source of truth for the Phase A1 tactical base map. All downstream map work, warroom rendering, and tactical modules build on this foundation.

---

## 1. Primary Map Products

| Product | Path | Description |
|---------|------|-------------|
| **A1 Base Map GeoJSON** | `data/derived/A1_BASE_MAP.geojson` | Definitive data product (~25,000 features): national borders, MSRs, secondary roads, hydrography, urban footprints. Settlements enriched with 1991 ethnicity and political control data for tactical modules. |
| **A1 Interactive Viewer** | `data/derived/A1_viewer.html` | Primary interactive viewing tool. Tactical coordinate grid, BiH clipping mask, consolidated metropolitan labeling. |

**Viewing:** Do not open via `file://`. Run `npx http-server -p 8080` from repo root, then open `http://localhost:8080/data/derived/A1_viewer.html`.

---

## 2. System Architecture

| Component | Path | Role |
|-----------|------|------|
| **1990 municipality boundaries (canonical)** | `data/source/boundaries/bih_adm3_1990.geojson` | 110 opštine, WGS84; used for mun1990 name/controller lookup in A1 derivation. |
| **Data derivation engine** | `scripts/map/phase_A1_derive_base_map.ts` | Transforms raw OSM/geographic data into project legacy SVG space via Thin Plate Spline (TPS) projection. |
| **Rendering logic** | `scripts/map/render_a1_snapshot.ts` | Logic-only; classifies layers for data product. Static PNG rendering disabled in favor of interactive viewer. |
| **Design system** | `src/map/nato_tokens.ts` | "1990s Paper" aesthetic: `#ebe1cd` paper, `#A0A0A0` roads, `#467850` Bosniak green. |
| **Lessons & patterns** | `.agent/napkin.md` | Coordinate spaces, visual styles, failure patterns (e.g., label clipping). Read at session start. |

---

## 3. Operational Features & Lessons Learned

### Visual Hierarchy
- Urban settlements: subtle red footprints (0.15 alpha), not discrete point markers, to avoid tactical clutter.
- Roads: MSR `#A0A0A0`, secondary `#D0D0D0`; thin lines (< 1.0).
- Rivers: dusty blue `rgb(100, 150, 200)`.
- Contours: burnt umber `rgb(139, 90, 43)`, thin and low-opacity.

### Coordinate Reference
- 100-unit grid with axis labels across all tools for military reference.
- North-Up mandatory; all products clipped to BiH border.
- Areas outside border: pure white for contrast.

### Label Consolidation
- De-duplication merges metropolitan subsets (e.g., Sarajevo, Ilidža) and administrative titles (e.g., "Grad Mostar") into single tactical labels.
- Population threshold: Pop > 20,000 for urban center labels.

### Critical Constraints (from preferences)
- **Label clipping:** Render labels *after* `ctx.restore()` (outside boundary clip); never inside mask.
- **Clipping & orientation:** Strictly clip to BiH border; North-Up mandatory.

---

## 4. Execution & Maintenance

To refresh base map data or update visual logic:

```powershell
# 1. Update the GeoJSON data product
node --max-old-space-size=8192 node_modules/tsx/dist/cli.mjs scripts/map/phase_A1_derive_base_map.ts

# Or via npm:
npm run map:a1:derive

# 2. Re-categorize and verify layers
node node_modules/tsx/dist/cli.mjs scripts/map/render_a1_snapshot.ts
# npm run map:a1:snapshot

# 3. View the map
# From repo root: npx http-server -p 8080
# Open: http://localhost:8080/data/derived/A1_viewer.html
```

**Related scripts:**
- `npm run map:a1:verify` — Coordinate verification (MSR bounds, georef TPS authoritative).
- `npm run map:contours:a1` — Regenerate contours if using elevation layer.
- `npm run map:control-zones:a1` — Regenerate control zones if using faction overlays.

---

## 5. Basis for the Game

The A1 base map is the **canonical geographical substrate** for:
- Warroom tactical display (TacticalMap, WarPlanningMap)
- Control zones, frontlines, and formation overlays
- Settlement click/panel and future tactical modules

All map-related UI and simulation spatial logic should consume `A1_BASE_MAP.geojson` or derivatives (contours, control zones) that share the same coordinate space and projection.

---

## 6. Determinism & Canon Alignment

- All derivation outputs are deterministic (stable sort, no timestamps).
- Coordinate projection issues resolved; visual style adheres to "tactical restraint" preference.
- See `.agent/napkin.md` for failure patterns to avoid (read at session start).
