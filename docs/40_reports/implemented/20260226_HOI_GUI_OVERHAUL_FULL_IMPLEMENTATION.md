# HoI Visual & GUI Overhaul — Full Implementation Report

**Date:** 2026-02-26  
**Scope:** Rounds 2–6 of the Orchestrator continuation plan (order arrows, sidebar interactivity, tabs, typography, status strip, minimap stub, smoke test).  
**Companion:** [20260226_HOI_GUI_OVERHAUL_SESSION_REPORT.md](../20260226_HOI_GUI_OVERHAUL_SESSION_REPORT.md), [20260226_implementation_plan.md](../../30_planning/20260226_implementation_plan.md).

---

## Summary

Execution completed as Orchestrator + Architect: Round 2 (order arrows), Round 3 (sidebar + War/Diplomacy/Logistics tabs), Round 4 (typography, brigade row polish, status strip alerts), Round 5 (strategic/enclave visibility gates, MinimapComponent stub), Round 6 (Puppeteer smoke test script). Pre-existing tsc fix: `FACTION_PERSONNEL_CAP` added to formation_constants and imported in formation_spawn.

---

## Round 2 — Order Arrows

- **HoIMapRenderer:** `setOrderArrows()` enhanced with 20% perpendicular Bézier offset, `LineDashedMaterial` for movement orders, `LineBasicMaterial` for attack, arrowhead cones (`ConeGeometry(0.02, 0.06, 8)`). Order arrows and cones gated on `layerVisibility.formations` in `applyLayerVisibility()`. Cones disposed in `setOrderArrows` and in `dispose()`.
- **map_hoi:** `buildOrderArrows(loaded, getWorldPosition)` derives `OrderArrowInput[]` from `attackOrders`, `movementOrdersSettlement`, and `movementOrders` (mun fallback via control keys). Sorted for determinism. Called when state applies to renderer; pending orders stored in `PendingRendererData` and applied when renderer becomes ready.
- **Architect decision #2:** Bézier offset = 20% of segment length in XZ perpendicular direction; arrowhead = ConeGeometry.

---

## Round 3 — Sidebar + Tabs

- **BrigadeRowComponent:** `onBrigadeClick` callback, `cursor: pointer`, optional `faction` for left-border color.
- **CorpsCardComponent:** `onCorpsClick` on corps name, `onBrigadeClick` passed to rows; stance change and Plan Operation log `[IPC STUB]`.
- **ArmySidebarComponent:** Callbacks `onBrigadeClick`, `onCorpsClick`; `setWarStatus`, `setDiplomacy`, `setLogistics`; War Status / Diplomacy / Logistics tabs render `WarStatusTabComponent`, `DiplomacyTabComponent`, `LogisticsTabComponent` with derived data.
- **New components:** `WarStatusTabComponent` (territory % bars, personnel by faction, front stability placeholder), `DiplomacyTabComponent` (RBiH–HRHB alliance gauge, war earliest turn), `LogisticsTabComponent` (recruitment capital, corridor/equipment placeholders).
- **Types:** `HoIWarStatusData`, `HoIDiplomacyData`, `HoILogisticsData`; `HoIMapStateData` extended; `loadedStateToHoIState` derives warStatus, diplomacy, logistics.
- **map_hoi:** `onBrigadeClick` → `renderer.centerOnSettlement(loc)` + `overlayLayer.onFormationClick(brigadeId)`. `onCorpsClick` → center on first subordinate location + formation click. `centerOnSettlement` added as public API on renderer. State and sidebar receive warStatus, diplomacy, logistics.

---

## Round 4 — Typography + Polish + Status Strip

- **Brigade rows:** Faction-colored left border (`.hoi-brigade-faction-rs/rbih/hrhb`), OG dashed border, degraded amber override. `faction` added to `HoIBrigadeRowData` and set in `buildCorps`.
- **Status strip:** `deriveAlerts(loaded)` stub in `loadedStateToHoIState` (enclave/corridor/operation placeholders for future data).
- **CSS:** Territory bar and alliance gauge styles for War Status and Diplomacy tabs; faction-colored territory bars.

---

## Round 5 — Strategic / Enclaves / Minimap

- **HoIMapRenderer:** `strategicMarkers` and `enclaveRings` visibility set in `applyLayerVisibility()` (labels and control respectively).
- **MinimapComponent:** New stub component (250×180 canvas, bottom-left, placeholder draw). Instantiated in map_hoi after renderer init. Full terrain + faction + viewport draw TBD.

---

## Round 6 — Smoke Test

- **tools/smoke_test_hoi_map.ts:** Puppeteer script: navigate to `MAP_URL`, wait for WebGL canvas (placeholder hidden), assert sidebar exists, optionally click first formation marker and assert `.selected`. Exit 0/1. Usage: `MAP_URL=http://localhost:3002/map_hoi.html npx tsx tools/smoke_test_hoi_map.ts`.

---

## Verification

- `npx tsc --noEmit` — clean.
- `npx vitest run` — 159 passed, 13 skipped.
- Smoke test requires dev server running (`npm run dev:map`); script created and ready.

---

## Files Modified / Created

**Modified:** `src/ui/map/renderer/HoIMapRenderer.ts`, `src/ui/map/map_hoi.ts`, `src/ui/map/map_hoi/types.ts`, `src/ui/map/map_hoi/loadedStateToHoIState.ts`, `src/ui/map/map_hoi/HoIMapState.ts`, `src/ui/map/map_hoi/BrigadeRowComponent.ts`, `src/ui/map/map_hoi/CorpsCardComponent.ts`, `src/ui/map/map_hoi/ArmySidebarComponent.ts`, `src/ui/map/styles_hoi.css`, `src/state/formation_constants.ts`, `src/sim/formation_spawn.ts`.  
**Created:** `src/ui/map/map_hoi/WarStatusTabComponent.ts`, `src/ui/map/map_hoi/DiplomacyTabComponent.ts`, `src/ui/map/map_hoi/LogisticsTabComponent.ts`, `src/ui/map/map_hoi/MinimapComponent.ts`, `tools/smoke_test_hoi_map.ts`.

---

## Canon / Docs

- CONSOLIDATED_IMPLEMENTED §48 added (this report).
- PROJECT_LEDGER entry appended.
- TACTICAL_MAP_SYSTEM and DESKTOP_GUI_IPC_CONTRACT unchanged; HoI map remains canonical player-facing map per existing §2.
