# Phased Plan — Map/GUI and War System (Product Manager)

**Date:** 2026-02-06  
**Source:** [WAR_PLANNING_MAP_CLARIFICATION_REQUEST.md](WAR_PLANNING_MAP_CLARIFICATION_REQUEST.md) (filled); [GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION.md](GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION.md)  
**Owner:** Product Manager  
**Purpose:** Single phased plan that sequences map/GUI work and keeps the war system as a separate track.

---

## Track A — Map / GUI (base map → layers → settlement click)

Execute in order. Each phase gates the next.

### Phase A1 — Base geographical map

- **Goal:** One canonical **base geographical map** as the visual foundation for the GUI (War Planning Map and wall map where applicable).
- **Scope:** Create or adopt a single base map from existing geometry (e.g. settlements_viewer_v1.geojson or derived product). Document it as the canonical visual base; no information layers yet (no political control coloring on this artifact — that is A2).
- **Handoff:** Map/Geometry + Technical Architect to confirm: create from scratch vs adopt/derive. UI/UX and Graphics use the chosen base for all map views.
- **Done when:** Base map artifact is defined and documented; War Planning Map and wall map can render it (or a stub) as the bottom layer.
- **Risks:** Dependency on map pipeline; clarify with Map/Geometry and Tech Architect.

### Phase A2 — Information layers on base map

- **Goal:** Add **information layers** on top of the base map: political control, contested (current behaviour), without changing data contracts.
- **Scope:** Current political_control_data.json and control_status_by_settlement_id drive layers; presentation explicitly “base map then layers.” War Planning Map and (where applicable) wall map use the same base from A1.
- **Handoff:** UI/UX Developer, Graphics Programmer. Data: political_control_data.json, settlements_viewer (or base map from A1). No new sim or pipeline outputs.
- **Done when:** Both map views render base + political control + contested layers; layer toggles work in War Planning Map.
- **Risks:** None if A1 is done.

### Phase A3 — Settlement click and layered info panel

- **Goal:** User **clicks a settlement** and gets a panel with **layered information**: settlement, municipality, side.
- **Scope:** Settlement click → panel (or drill-down) with three sections/tabs: **Settlement** (identity, key attributes), **Municipality** (containing municipality, boundaries), **Side** (faction/control). Data from political_control_data, settlement metadata, municipality lookup. Deterministic, no new canon.
- **Handoff:** UI/UX Developer. War Planning Map (and optionally wall map) get click hit-test and panel; data from existing artifacts.
- **Done when:** Click on settlement opens panel with settlement / municipality / side info; stable and deterministic.
- **Risks:** None if A2 is done.

### Phase A4 — Should-haves (order)

1. Settlement hover tooltips (name, control, optional authority).
2. Accessibility: focus trap, keyboard, labels (no color-only critical info).
3. Order of Battle layer (Phase II).
4. Population/ethnicity and displacement layers (Phase II).

---

## Track B — War system (separate)

- **Goal:** User gives **orders to brigades, corps, OGs, army**; orders **flow into one another** (chain of command). Not part of map/GUI.
- **Scope:** Order input, hierarchy (army → corps → OGs → brigades or as defined), order propagation. Technical Architect + Game Designer to align on hierarchy and flow; then scope implementation (sim state, UI for orders, etc.).
- **Handoff:** Technical Architect, Game Designer (design and hierarchy); then Gameplay Programmer, UI/UX as needed for order-giving UI. Do not conflate with map layers or settlement panel.
- **Done when:** Defined in a separate spec or roadmap item; implementation sequenced after design.
- **Risks:** Scope creep if merged with map/GUI; keep Track B separate.

---

## Summary

| Phase | Track | Deliverable |
|-------|--------|-------------|
| A1 | Map/GUI | Base geographical map defined and documented |
| A2 | Map/GUI | Information layers (control, contested) on base map |
| A3 | Map/GUI | Settlement click → panel (settlement, municipality, side) |
| A4 | Map/GUI | Hover tooltips, accessibility, then OOB/ethnicity/displacement (Phase II) |
| B  | War system | Hierarchy and order-flow design; then implementation (separate track) |

**Assumptions:** Base map may be adopted from existing geometry (confirm with Map/Geometry + Tech Architect). War system does not block map/GUI phases. Determinism and canon unchanged; no FORAWWV edit.

**Next single priority:** Phase A1 — confirm base map source with Map/Geometry and Technical Architect, then implement or adopt and document.
