# A1 Base Map — Handover Note for External Expert

**Status:** RESOLVED (2026-02-07)  
**Superseded by:** [docs/20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md](../20_engineering/specs/map/A1_BASE_MAP_REFERENCE.md) — Phase A1 tactical base map is STABLE. This handover brief was used to engage an expert; orientation and validation are complete.

---

**Original handover (archived):**

**Date:** 2026-02-07  
**Purpose:** Brief an outside expert to fix the A1 map orientation and validate the viewer. **Do not implement PNG rendering;** work only with the HTML viewer.

---

## 1. Goals

- **Display:** The A1 Base Map (Bosnia and Herzegovina) must render in **A1_viewer.html** with **north up** and correct scale, using the existing NATO-style palette.
- **Data source:** All display data comes from **data/derived/A1_BASE_MAP.geojson** (roads, rivers, settlements, and any background/landmass features). The viewer loads this file and draws it on a canvas.
- **Out of scope for you:** PNG snapshot generation (`render_a1_snapshot.ts` / `map:a1:snapshot`). Ignore it; focus only on the HTML viewer and the coordinate pipeline that feeds it.

---

## 2. Approach (What Exists)

### 2.1 Pipeline

1. **Georeferencing:** World (WGS84 lon/lat) is projected into “SVG” space via a Thin Plate Spline (TPS) stored in **data/derived/georef/world_to_svg_transform.json**. The TPS was fitted from municipality anchors (world adm3 centroids ↔ SVG municipality centroids from the settlement substrate).
2. **A1 derivation:** **scripts/map/phase_A1_derive_base_map.ts** reads OSM roads, OSM waterways, and the settlement substrate; projects every point through the TPS (with Bosnia bbox and sanity capping); applies a **90° CCW rotation** `(x,y) -> (-y, x)` so that “north up” was intended in the stored GeoJSON. It writes **data/derived/A1_BASE_MAP.geojson**.
3. **Viewer:** **data/derived/A1_viewer.html** fetches `./A1_BASE_MAP.geojson`, computes bounds from all features, fits the map to the canvas with a linear scale and offset, and draws: rivers, roads (MSR vs secondary), then settlements (points/polygons). Coordinates are used as `(coord[0], coord[1])` → canvas (x, y) with no extra transform.

### 2.2 Key Files

| Role | Path |
|------|------|
| Viewer (only output you need to fix) | **data/derived/A1_viewer.html** |
| A1 GeoJSON (input to viewer) | **data/derived/A1_BASE_MAP.geojson** |
| A1 derivation script | **scripts/map/phase_A1_derive_base_map.ts** |
| TPS coefficients (world → SVG) | **data/derived/georef/world_to_svg_transform.json** |
| TPS application (shared) | **scripts/map/lib/tps.ts** (`applyTps`) |
| NATO colors (reference) | **src/map/nato_tokens.ts** (viewer has its own inline palette) |

### 2.3 How to Run the Viewer

- **Do not open the HTML file via `file://`.** Browsers block local fetch. From repo root run:
  - `npx http-server -p 8080`
  - Open: **http://localhost:8080/data/derived/A1_viewer.html**
- If `A1_BASE_MAP.geojson` is missing, run: **`npm run map:a1:derive`** (requires Node, and georef + OSM inputs under `data/derived/` and `data/source/` as per script).

---

## 3. The Issue

- **Symptom:** In A1_viewer.html the landmass (Bosnia and Herzegovina) is **misoriented**: north does not point up. It has been observed rotated (e.g. ~90° clockwise or counter-clockwise) so the map does not match a standard north-up tactical map.
- **Attempted fix (in-repo):** In **phase_A1_derive_base_map.ts** a 90° CCW rotation was applied when writing coordinates: TPS output `(x, y)` is stored as `(-y, x)`. After re-running `map:a1:derive`, the problem **persists** (orientation still wrong).
- **Implication:** Either the correction is wrong (direction or axis), or the viewer applies an additional transform, or the georef SVG space is not as assumed. The expert should determine the correct transformation so that **when A1_viewer.html draws `A1_BASE_MAP.geojson`, north is up**.

---

## 4. What You Should Do

1. **Fix orientation for the viewer only**
   - Prefer fixing the **viewer** (A1_viewer.html) so that the same `A1_BASE_MAP.geojson` is drawn north-up (e.g. by applying a rotation or axis swap when mapping `(coord[0], coord[1])` to canvas). If you find it cleaner to fix the **derivation** instead (phase_A1_derive_base_map.ts), do that and document that `npm run map:a1:derive` must be re-run to refresh the GeoJSON.
2. **Do not add or change PNG rendering**
   - Ignore `scripts/map/render_a1_snapshot.ts` and any `map:a1:snapshot` usage. All validation should be done by loading **A1_viewer.html** in the browser (via local server as above).
3. **Keep determinism**
   - Any change to the derivation must remain deterministic (no timestamps, no randomness; same inputs → same GeoJSON).
4. **Optional**
   - If you identify a better or more robust fix (e.g. correcting the georef convention at the source), note it in a short comment or doc so the team can align the rest of the pipeline later.

---

## 5. Constraints (from project rules)

- **Canon:** Do not invent new mechanics; if in doubt, ask.
- **Determinism:** Map artifacts must be deterministic (stable sort, no time-based data in outputs).
- **Ledger:** If you change behavior or outputs, the project will add a PROJECT_LEDGER.md entry; you don’t need to edit it yourself.

---

## 6. Summary

- **Goal:** A1_viewer.html shows Bosnia north-up using **data/derived/A1_BASE_MAP.geojson**.
- **Problem:** Orientation is wrong despite a 90° CCW rotation in the A1 derivation script.
- **Scope:** Fix orientation in the viewer (or derivation); **do not** work on PNG rendering; validate only via A1_viewer.html served over HTTP.
