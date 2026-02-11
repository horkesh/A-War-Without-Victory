# Map Design — Handover Brief for External Consultancy

**Project:** A War Without Victory (AWWV) — wargame simulation prototype  
**Date:** 2026-02-06  
**Purpose:** Copy/paste brief for external experts taking over map design. Contains current status, constraints, plans, and open decisions.

---

## 1. Project context

- **AWWV** is a turn-based wargame simulation set in Bosnia and Herzegovina (early 1990s). The simulation has a **warroom GUI** (headquarters view) and a **War Planning Map** — a separate, full-screen map interface opened by clicking the wall map.
- The **map** must support: (a) one **base geographical map** as the visual foundation, (b) **information layers** on top (political control, contested status, later Order of Battle, ethnicity, displacement), (c) **settlement click** giving layered information (settlement, municipality, side/faction).
- **War system** (orders to brigades/corps/army, chain of command) is **out of scope** for map design — it is a separate system; the map shows *results* of simulation state, not order-giving.

---

## 2. Current map status

### What exists today

- **Geometry and data (Path A architecture):**
  - **Polygons** (`poly_id`): Territorial micro-areas from SVG source (~6148 polygons). Linked to municipalities via `mun_code` → `mid` crosswalk. **Not** 1:1 with settlements.
  - **Settlements** (`sid`): Simulation entities from Excel (~6100+ after filtering aggregates). Point + graph entities; linked to municipalities via `mid`. **Not** polygon entities.
  - **Municipalities** (`mid`): Pre-1991 opštine IDs. Polygons and settlements both link via municipalities; there is no direct polygon–settlement link.
  - **Canonical settlement substrate:** `settlements_substrate.geojson` (SVG-derived, canonical). Contact graph and enriched graph exist (`settlement_contact_graph.json`, `settlement_contact_graph_enriched.json`). Settlement edges: `settlement_edges.json` (or equivalent) used by simulation.
  - **Municipality outlines:** Derived from polygon fabric or from drzava.js; `municipality_outline.geojson`, `national_outline.geojson`. Municipality crosswalk (`mun_code_crosswalk.csv`) may be missing — in that case all polygons have `mid = null` and mid-based outlines are empty; fallbacks exist (mun_code outline, national outline).

- **GUI map usage:**
  - **War Planning Map:** Separate GUI system (not just an overlay). Currently shows: political control by settlement (`political_control_data.json`), contested crosshatch (CONTESTED / HIGHLY_CONTESTED from `control_status_by_settlement_id`), layer toggles (Political control, Contested live; Order of Battle, population/ethnicity, displacement placeholders). Three zoom levels (Strategic / Operational / Tactical). Opened from warroom by clicking the wall map.
  - **Wall map (warroom):** Simplified tactical map in the HQ view; should ultimately share the **same base geographical map** as the War Planning Map (base map not yet formally defined).
  - **Other viewers:** Substrate viewer, adjacency viewer, political control viewer, phase0 viewer, map viewer — various derived HTML/JS tools for inspection and dev.

### What is *not* yet done

- **One canonical base geographical map** has **not** been created or formally adopted. Current behaviour (political control + contested layers) is built on existing geometry (e.g. settlement substrate, polygon fabric); the “base map” as a single, documented artifact for all map views is still an open deliverable (Phase A1).
- **Settlement click → layered info panel** (settlement / municipality / side) is required by product/design but not yet implemented as specified.
- **Hover tooltips**, **accessibility** (focus trap, keyboard, no color-only critical info), and **Phase II layers** (Order of Battle, ethnicity, displacement) are planned after the base map and settlement click.

---

## 3. Non‑negotiable constraints (must be respected)

1. **Path A:** Polygons are territorial micro-areas (`poly_id`); settlements are entities (`sid`). No forced 1:1 polygon–settlement matching. Polygons and settlements link only via municipalities (`mid`).
2. **Determinism:** All map/build outputs must be deterministic: stable sort order, fixed precision (e.g. 3 decimals for coordinates), canonical JSON key ordering, no timestamps in outputs.
3. **Settlement ID uniqueness:** Every `settlement_id` must be globally unique.
4. **Empty GeoJSON valid:** Pipeline must emit valid GeoJSON even when the feature set is empty.
5. **Render-valid as primary gate:** Geometry is accepted if render-valid (finite, non-zero area, non-self-intersecting/triangulatable). GIS validity is diagnostic only; convex hull salvage is allowed when defined, with inflation reported.
6. **Aggregate rows:** Any row containing "∑" in any cell is excluded from settlement-level data (aggregates are validation-only).
7. **Source data:** Raw files in `data/source/` are read-only; derived outputs go to `data/derived/` or equivalent.

---

## 4. Strategic direction (three pillars)

These are the product/design pillars that map work must align with:

1. **One base geographical map, then layers**  
   Create or adopt **one** base geographical map as the single visual foundation. Then add **information layers** (political control, contested, later OOB, ethnicity, displacement). Base map first; layers second. War Planning Map and wall map should use the same base where applicable.

2. **War system separate**  
   Order-giving (brigades, corps, OGs, army) and order flow are **not** part of the map/GUI. Map displays simulation state; orders are a separate system.

3. **Settlement click → layered information**  
   User must be able to click a settlement and get: **Settlement** (identity, attributes), **Municipality** (containing municipality, boundaries), **Side** (faction/control). This is a must-have for the map GUI.

---

## 5. Phased plan (map / GUI track)

| Phase | Deliverable | Notes |
|-------|-------------|------|
| **A1** | Base geographical map defined and documented | Create or adopt from existing geometry (e.g. settlements_viewer_v1.geojson or derived). Single canonical visual base; no information layers on this artifact. War Planning Map and wall map use it as bottom layer. |
| **A2** | Information layers on base map | Political control, contested (current behaviour) as explicit layers on top of A1 base. Data: political_control_data.json, control_status_by_settlement_id. No new sim outputs. |
| **A3** | Settlement click → panel (settlement / municipality / side) | Click settlement → panel or drill-down with three sections: Settlement, Municipality, Side. Data from existing artifacts; deterministic. |
| **A4** | Should-haves (in order) | Hover tooltips; accessibility (focus trap, keyboard, labels); Order of Battle layer (Phase II); population/ethnicity and displacement layers (Phase II). |

**Next single priority:** A1 — confirm base map source (create from scratch vs adopt/derive from existing geometry) and document it.

---

## 6. Key artifacts and references

- **Geometry / substrate:** `data/derived/settlements_substrate.geojson`, `settlement_contact_graph.json`, `settlement_contact_graph_enriched.json`, `polygon_fabric.geojson`, `national_outline.geojson`, `municipality_outline.geojson` (or mun_code/national fallbacks).
- **Political control / UI:** `political_control_data.json`, `control_status_by_settlement_id` (or equivalent). Settlement metadata, municipality lookup.
- **Documentation (in repo):**  
  - `docs/40_reports/PHASED_PLAN_MAP_AND_WAR_SYSTEM.md` — phased plan (A1–A4, war system separate).  
  - `docs/40_reports/WAR_PLANNING_MAP_CLARIFICATION_REQUEST.md` — PM + Game Designer clarification (filled): scope, priority, joint recommendations.  
  - `docs/40_reports/GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION.md` — three pillars (base map → layers, war system separate, settlement click).  
  - `docs/PROJECT_LEDGER.md` — non-negotiables, Geometry Contract (Path A), current state, decisions.

---

## 7. Open decision for consultancy

- **Base geographical map (A1):** Should the canonical base map be **created from scratch** or **adopted/derived** from existing geometry (e.g. settlement substrate, polygon fabric, or a product like `settlements_viewer_v1.geojson`)? Technical and product alignment is needed; the handover to UI/UX and Graphics assumes one chosen base that all map views use.
- **Coordinate system / precision:** Current pipeline uses LOCAL_PIXELS_V2 and 3-decimal precision for deterministic output; any new or adopted base map should be consistent with existing coordinate and precision rules.

---

## 8. What we need from the consultancy

- **Design and recommendation** for the **base geographical map** (A1): single canonical visual base; recommend create vs adopt/derive and document format, coordinate system, and handover to implementation.
- **Alignment** with the **phased plan** (A1 → A2 → A3 → A4) and the **three pillars** (base map then layers, war system out of scope, settlement click with settlement/municipality/side).
- **Respect** for **Path A** and the **non-negotiable constraints** (determinism, settlement ID uniqueness, no 1:1 polygon–settlement forcing, render-valid gate, etc.).
- **Clear handoff** so that after A1 (and optionally A2–A3), UI/UX and dev can implement without inventing scope; reference the clarification request and phased plan documents above.

---

*End of handover brief. All section content is suitable for copy/paste into an external brief or email.*
