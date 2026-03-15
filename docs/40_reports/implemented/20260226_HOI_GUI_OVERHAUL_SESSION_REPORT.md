# HoI Visual & GUI Overhaul — Session Report

**Date:** 2026-02-26
**Session scope:** Rounds 1–2 (partial) of the HoI Visual & GUI Overhaul implementation plan.
**Files modified:** `HoIMapRenderer.ts`, `FormationOverlayLayer.ts`, `map_hoi.ts`

---

## Orchestrator Setup

Invoked the Orchestrator Protocol per user request. Full Pyrrhic team assigned:

| Role | Responsibility |
|------|---------------|
| **Orchestrator** | Priority, sequencing, cross-role alignment |
| **Architect** ⭐ | All design decisions — flags for user review at round boundaries |
| **Product Manager** | Round gating, scope control |
| **Graphics Programmer** | Renderer: borders, arrows, strategic points, enclave rings, minimap |
| **Frontend Design** | CSS, typography, panel polish |
| **UI/UX Developer** | Sidebar components, tab content, status strip |
| **Modern Wargame Expert** | Advisory on HoI-like UX patterns |
| **QA Engineer** | tsc gate, browser checklist, Puppeteer smoke test |

Created a 6-round implementation plan covering all 18 remaining spec items, each gated by `tsc --noEmit` → browser inspection → `/refactor-pass`.

---

## Round 1 — Municipality Borders ✅

**Spec:** §2.2 item 6 — dashed intra-municipality borders on the WebGL map.

### Changes

**`HoIMapRenderer.ts`**
- Added `municipalityBorderLines: THREE.LineSegments | null` field.
- Added `buildMunicipalityBorders()` method (~65 lines):
  - Extracts municipality from OSID prefix (`op:municipality:settlement` → `municipality`).
  - Iterates `sharedBorderByEdge`; filters for pairs where both OSIDs are in the same municipality.
  - Draws dashed `LineSegments` using `LineDashedMaterial` at `rgba(0,0,0,0.25)`.
  - Elevation follows terrain via `sampleHeight` → `wgsToWorld`.
- Called from `init()` after `buildControlLayer()`.
- Gated on `control` layer visibility in `applyLayerVisibility()`.

### Architect Decision #1
Municipality borders share the `control` layer toggle (no separate toggle) — minimal UI complexity.

### Refactor-pass
- Removed unused `key` variable from `for...of` loop.

### Verification
- `tsc --noEmit` → exit 0 ✓

---

## Round 2 — Front Placement + Order Arrows (in progress)

**Spec:** §2.4 item 7 (front-distributed markers), §2.5 item 11 (Bézier order arrows).

### Changes completed

**`FormationOverlayLayer.ts`**
- Added `frontActiveOsids: Set<string>`, `controlBySettlement`, `adjacency` fields.
- Added `setFrontData(controlBySettlement, adjacency)` method:
  - Builds set of front-active OSIDs (those with at least one neighbor under different-faction control).
- Modified `syncPositions()`:
  - When a brigade's OSID is front-active, computes the average world position of opposing-faction neighbors.
  - Blends the brigade's position 30% toward that average (biasing markers toward the front line).
  - Falls back to OSID centroid for rear-area brigades and for corps.

**`map_hoi.ts`**
- Added `adjacencyRef` parameter to `applyStateJson()`.
- After setting control data, calls `overlayLayer.setFrontData(control, adjacencyRef.current)` when adjacency is available.
- Updated `applyState` lambda to pass `adjacencyRef`.

**`HoIMapRenderer.ts` — order arrows**
- Discovered existing `setOrderArrows()` method (line ~2050) with simple `QuadraticBezierCurve3` curves and no arrowheads.
- Removed accidentally-added duplicate implementation.
- Enhancement of existing method (arrowheads, dashed movement arrows) still pending.

### Architect Decision #2
Bézier control-point offset = 20% of arrow length perpendicular to the line. Arrowhead = `ConeGeometry(0.02, 0.06, 8)`.

### What remains in Round 2
- Enhance existing `setOrderArrows()` with: arrowheads at tip, dashed `LineDashedMaterial` for movement orders, perpendicular Bézier offset.
- Wire order arrow data from `map_hoi.ts` (`loaded.attackOrders` + `loaded.movementOrders`).
- Add order arrow lines to `applyLayerVisibility()` for formations toggle.
- Run `tsc --noEmit` gate.
- Run `/refactor-pass`.

---

## Rounds 3–6 — Not yet started

| Round | Content | Status |
|-------|---------|--------|
| 3 | Sidebar interactivity + War Status / Diplomacy / Logistics tabs | Pending |
| 4 | Typography (IBM Plex Sans Condensed) + panel polish + status strip | Pending |
| 5 | Strategic points + enclave visualization + minimap | Pending |
| 6 | Puppeteer smoke test + final gate | Pending |

---

## Bugs Found & Fixed

1. **Duplicate `setOrderArrows`**: Accidentally created a second implementation at line 1503 while an existing one already existed at line ~2136. Caught via tsc lint (`Duplicate function implementation`). Removed the duplicate.

2. **`wgsToWorld` signature mismatch**: Initially passed `HeightmapData` object instead of elevation number. Fixed to match the correct pattern: `sampleHeight(hm, lon, lat)` → `wgsToWorld(lon, lat, elev)`.

---

## Companion Artifacts

- [Implementation Plan](../../.gemini/../../../Users/User/.gemini/antigravity/brain/e2848689-af2e-494a-859c-b49c2293cbf0/implementation_plan.md)
- [Gap Analysis](../../.gemini/../../../Users/User/.gemini/antigravity/brain/e2848689-af2e-494a-859c-b49c2293cbf0/hoi_spec_gap_analysis.md)
