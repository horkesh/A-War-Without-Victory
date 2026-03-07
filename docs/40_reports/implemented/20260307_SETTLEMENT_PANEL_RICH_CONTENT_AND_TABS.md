# Settlement Panel — Rich Content, Tabs, Nation Labels, and Current Ethnic Structure

**Date:** 2026-03-07  
**Classification:** Implemented  
**Scope:** Tactical map GUI — settlement (right) panel only. No engine, canon, or persistence changes.

---

## 1. Summary

The settlement detail panel (right rail, opened on settlement click) was brought in line with the GUI comprehensive review and TACTICAL_MAP_SYSTEM §13.2: richer engine-backed content, horizontal tabs (same style as sector/operations panels), “fled” labels using nation names (e.g. Bosniaks) instead of faction codes (RBiH), a **current ethnic structure** block below pre-war ethnic structure, and removal of the Control tab (controller/status moved into Overview).

---

## 2. What Was Implemented

### 2.1 Panel position and rail

- Settlement panel remains on the **right edge** of the screen via `getRightPanelStyle('20rem')` and `RIGHT_PANEL_STYLE` in `panelRail.ts`.
- Selection does not clear when opening sector, corps, army, formation, or operation panels; settlement can stay open beside other detail panels.

### 2.2 Richer settlement content (engine data)

- **Population (dramatic):** Pre-war → current with delta; Out / In / Lost cards; “Arrived: RBiH +n …”; “Fled from this settlement:” by **nation** (see §2.5).
- **Front sector:** When the selected OSID is in a corps front sector, shows sector name and holding faction.
- **Brigade summary:** “N brigades · RBiH x RS y” in the Stationed units header.
- **Pending orders:** Attack orders targeting this settlement, movement orders with this OSID in `targetSettlementIds`, reposition orders with this OSID in `settlementIds`; each listed with brigade name when available.
- **Militia pool:** Per-municipality (mun derived from selected OSID) stacked bar: available (green) / committed (amber) / exhausted (red), with numeric summary.
- **Formation rows:** Readiness badge and cohesion bar per formation when data present; rows **clickable** to open Formation detail (`onFormationClick` → `setSelectedFormationId`).

### 2.3 Horizontal tabs (Overview | Military | Orders & events)

- **Tab bar** (panel only): Same visual pattern as CorpsFrontPanel/operations — `border-b border-panel-border`, `bg-panel-card/50`, active tab `border-accent-gold text-accent-gold bg-panel-bg`, `role="tablist"` / `role="tab"` / `aria-selected` / `aria-controls`.
- **Three tabs:**
  - **Overview:** Municipality, political control, status, population (dramatic block), pre-war ethnic structure, **current ethnic structure** (§2.4), terrain context.
  - **Military:** Front sector, stationed units (with readiness/cohesion, click-through), militia pool.
  - **Orders & events:** Operation target, pending orders, recent control.
- **Control tab removed;** controller and status are shown in Overview.

### 2.4 Current ethnic structure

- **Data:** `getCurrentEthnicForOsid(osid, osidPropertiesMap, displacementByMun, departedByOsid)` in `src/ui/map/map/builders/buildEthnicGeoJSON.ts` — same logic as ethnic map mode: base populations minus OSID-level departures (RBiH/RS/HRHB) plus proportionally distributed municipal arrivals.
- **UI:** “Current ethnic structure” section below “Pre-war ethnic structure” in Overview: Bosniaks / Serbs / Croats / Others with percentage bars (accent-gold fill); only shown when computed total > 0.
- **Wiring:** `SelectionPanel` calls `getCurrentEthnicForOsid` and passes `currentEthnic` into `SettlementDetailContent`.

### 2.5 “Fled from this settlement” — nation labels

- **Helper:** `ethnicityOrFactionToNationLabel(key)` in `SettlementDetailContent.tsx`: RBiH/Bosniak → Bosniaks, RS/Serb → Serbs, HRHB/Croat → Croats, Other → Others.
- **Display:** “Fled from this settlement: Bosniaks 1,200 Serbs 300 …” instead of “RBiH 1,200 RS 300 …”.

### 2.6 Type safety (buildEthnicGeoJSON)

- `getCurrentEthnicForOsid` uses a type guard for `displacementByMun` entry so `arrivedByFaction` and `originalPopulation`/`currentPopulation` are safely accessed (avoids `"" | object` union inference).

---

## 3. Files Touched

| Path | Change |
|------|--------|
| `src/ui/map/components/panelRail.ts` | (prior) `RIGHT_PANEL_STYLE`, `getRightPanelStyle`, rail state when settlement selected |
| `src/ui/map/components/SelectionPanel.tsx` | Formations with readiness/cohesion; `pendingOrders` (attack/move/reposition); `militiaPoolsForMun`; `currentEthnic` via `getCurrentEthnicForOsid`; `onFormationClick={setSelectedFormationId}` |
| `src/ui/map/components/SettlementDetailContent.tsx` | Tabs (Overview/Military/Orders & events); `ethnicityOrFactionToNationLabel`; `currentEthnic` prop and Current ethnic structure block; Control tab removed; controller/status in Overview; pending orders, militia pool, formation readiness/cohesion, click-through |
| `src/ui/map/store/gameStore.ts` | (prior) Selection setters no longer clear `selectedOsid` |
| `src/ui/map/utils/sectorUtils.ts` | (prior) `buildOsidToSectorMap` for sector name/faction |
| `src/ui/map/map/builders/buildEthnicGeoJSON.ts` | `getCurrentEthnicForOsid()` exported; type guard for displacement entry |

---

## 4. Verification

- `npx tsc --noEmit` — clean for `src/ui/map/` (pre-existing failures only in `tests/paramilitary_sweep.test.ts`).
- `npx vitest run` — 35 files passed, 351 tests passed, 1 skipped.
- No new engine, canon, or persistence behavior; no new overlay layer or simulation mechanic.

---

## 5. References

- **Spec:** `docs/20_engineering/TACTICAL_MAP_SYSTEM.md` §13.2 (Settlement Panel).
- **Review:** `docs/40_reports/convenes/20260307_GUI_COMPREHENSIVE_REVIEW_PLAYER_PERSPECTIVE.md` (under-surfaced displacement, municipality support).
- **Handover:** `docs/40_reports/handovers/20260307_WARROOM_NANO_BANANA_IMAGE_AND_MODAL_BRIEF.md` (warroom visual/modal; no settlement content change).
- **Panel rail:** `docs/40_reports/implemented/20260307_GUI_COMMAND_EXPERIENCE_EXECUTION.md` (right-drill flow, SelectionPanel on rail).

---

## 6. Doc propagation

- **TACTICAL_MAP_SYSTEM.md** §13.2 updated to describe three tabs (Overview, Military, Orders & events), nation labels for “fled”, current ethnic structure, and controller/status in Overview.
- **CONSOLIDATED_IMPLEMENTED.md** and **40_reports/README.md** updated to reference this report.
- **PROJECT_LEDGER.md** — new chronological entry.
- **.claude/napkin.md** — GUI/Map entry for settlement panel tabs and nation labels.
