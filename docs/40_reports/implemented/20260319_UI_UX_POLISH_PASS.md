# UI/UX Polish Pass — Implementation Report

**Date:** 2026-03-19
**Scope:** 14 tasks across 5 phases — bug fixes, interaction improvements, radial context menu, label polish, commander insignia
**Plan:** `docs/plans/2026-03-19-ui-ux-polish-pass.md`
**Audit:** `docs/40_reports/20260319_UI_UX_DEEP_AUDIT.md`
**Verification:** tsc clean, 1203/1203 tests pass, `desktop:map:build` success

---

## Phase 1: Critical Bug Fixes (P1)

### Task 1: Toolbar Button Routing (T1)

**Problem:** SUMMARY, AAR, OPS, EVENTS buttons in the top toolbar all opened the same War Summary modal. Players couldn't access the AAR panel, operation history, or event log.

**Root cause:** The WarSummaryModal renders at `zIndex: 1200` with a full-screen backdrop. AARPanel, OperationHistoryPanel, and EventLogPanel render at lower z-indices (`z-50`, `zIndex: 42`). When the summary modal was already open, clicking other buttons toggled their panels open *behind* the summary's opaque backdrop.

**Fix:** Made the four History-group panels mutually exclusive — opening one closes the others.

**File:** `src/ui/map/App.tsx` — `openSummary`, `onOpenAAR`, `onOpenOpsHistory`, `onOpenEventLog` callbacks now close sibling panels.

### Task 2: Minimap Toggle Bug (M1)

**Problem:** Toggling the minimap OFF then ON left the minimap blank. The MapLibre canvas existed in the DOM but didn't render tiles. Required page reload.

**Root cause:** The Minimap component used conditional rendering (`if (!minimapVisible) return null`) which destroyed the MapLibre map instance on toggle OFF. On remount, the new MapLibre instance failed to render — GeoJSON data effects didn't re-fire because their React deps (`loadedGameState`, `mapViewport`) hadn't changed.

**Fix:** Changed from unmount/remount to CSS `display: none/block`. The MapLibre instance is created once and persists. Added `map.resize()` call when visibility toggles back ON (MapLibre needs resize after display:none→block). Added `mapEpoch` counter to trigger data re-population on remount.

**File:** `src/ui/map/components/Minimap.tsx` — useEffect deps changed from `[minimapVisible]` to `[]`, render uses `style={{ display: minimapVisible ? 'block' : 'none' }}`.

---

## Phase 2: Map Interaction Improvements

### Task 3: OSID Click Highlight

**Problem:** Clicking a settlement opened the detail panel but didn't visually highlight the OSID polygon on the map. Players lost track of which settlement they selected.

**Fix:** Added `osid-selected-outline` layer to the map style — a gold outline (`rgba(220, 190, 120, 0.9)`, 2.5px width) filtered to the selected OSID. A useEffect in MapContainer reacts to `selectedOsid` changes and updates the filter. Clicking empty space clears the highlight.

**Files:** `src/ui/map/map/awwv_map_style.json` (new layer), `src/ui/map/map/MapContainer.tsx` (useEffect wiring)

### Task 4: Larger Brigade Markers

**Problem:** Brigade icons were too small at default zoom, clicks often hit the settlement fill underneath instead of the unit icon.

**Fix:** Increased `icon-size` on the `formation-markers` layer by ~30% at all zoom levels:
- Zoom 6: 0.3 → 0.4
- Zoom 9: 0.45 → 0.6
- Zoom 12: 0.6 → 0.8
- Zoom 14: 0.75 → 1.0

**File:** `src/ui/map/map/awwv_map_style.json`

---

## Phase 3: Radial Right-Click Context Menu

### Tasks 5-6: RadialMenu Component + Map Wiring

**Problem:** No right-click context menu on the map. Right-click showed the same settlement tooltip as left-click. Grand strategy games use right-click extensively for commands.

**Implementation:**

1. **RadialMenu.tsx** (new component): Animated radial menu appearing at cursor position. Items arranged in a circle with staggered fade-in animation (150ms). Click-outside or Escape to dismiss. Viewport clamping prevents overflow.

2. **Context-sensitive items by target type:**
   - **Formation**: View Unit, View Corps
   - **OSID**: Settlement Info, View Sector
   - **Front line**: Sector Detail
   - **Empty space**: Deselect All

3. **useMapInteractions.ts**: Added `onContextMenu` callback, `handleContextMenu` handler with feature query priority (formation > front-edge > OSID > empty), browser context menu suppression.

4. **MapContainer.tsx**: `contextMenu` state, `contextMenuItems` useMemo building items per type, RadialMenu rendered as floating overlay.

**Files:** `src/ui/map/components/RadialMenu.tsx` (new), `src/ui/map/map/useMapInteractions.ts`, `src/ui/map/map/MapContainer.tsx`

---

## Phase 4: Labels, Tooltips, and Legends

### Task 7: Disabled Button Tooltips (T2)

**Problem:** SAVE, ADVANCE TURN, CAMPAIGN, RECRUIT buttons were disabled with no explanation.

**Fix:** Added `title` attributes explaining "requires desktop app" when `!ipc.isAvailable`.

**File:** `src/ui/map/components/TopToolbar.tsx`

### Task 8: Map Mode Legends (B1)

**Problem:** Non-Political map modes (Ethnic, Supply, Casualties, Morale, Operations, Defense) showed color gradients with no legend.

**Fix:** Created `MapModeLegend.tsx` — floating glass panel in bottom-left showing color swatches with labels. Renders conditionally per mode. Added to App.tsx render tree.

**Files:** `src/ui/map/components/MapModeLegend.tsx` (new), `src/ui/map/App.tsx`

### Task 9: Corps Detail Label Polish (C1-C5)

**Fixes:**
- **Commander ratings**: `●●●●○` now shows `●●●●○ 4/5 Exceptional` — numeric fraction added
- **"OG Slots"** → **"Op Slots"** with tooltip: "Maximum simultaneous operations this corps can conduct"
- **"Exh: 16.0"** → **"Exhaustion: 16"** with color coding (green 0-20, amber 21-50, red 51+)
- **Equipment health color**: Operational count colored by percentage (green >80%, amber 50-80%, red <50%)
- **JNA badge tooltip**: "Yugoslav People's Army (JNA) — pre-war military service"

**Files:** `src/ui/map/components/OfficerProfile.tsx`, `src/ui/map/components/CorpsDetail.tsx`, `src/ui/map/utils/officerCharacter.ts`

### Task 10: Settlement Panel Label Polish (P1-P3)

**Problem:** Population flow labels "In/Out/Lost" were cryptic.

**Fix:** Changed to "Arrived/Displaced/Killed". Formula line updated to match. Colors were already correct (amber for displaced, red for killed — audit finding was a false positive on color).

**File:** `src/ui/map/components/SettlementDetailContent.tsx`

### Task 11: Commander Rank Insignia

**Problem:** Commander card showed only text. User wanted visual identity but portraits are inappropriate (war criminals).

**Solution:** CSS-only rank insignia with historically accurate faction-specific rank names:

- **Insignia design**: Five-pointed stars (★) on faction-colored background (RS red, RBiH green, HRHB blue). Colonel rank shows bar beneath star. Sized 40x28px.
- **Star mapping**: army_commander=3 stars, corps_commander=2 stars, deputy=1 star+bar
- **Faction rank names** (tooltip):
  - RS: General-pukovnik, General-major, Pukovnik (JNA-inherited)
  - RBiH: General-pukovnik, General-major, Brigadir, Pukovnik
  - HVO: General-bojnik, Brigadir, Pukovnik (Croatian HV ranks)

**Files:** `src/ui/map/components/OfficerProfile.tsx`, `src/ui/map/utils/officerCharacter.ts`

### Task 13: Toolbar Category Styling (T4, T8)

**Problem:** Category labels (SYSTEMS, PERSONNEL, INTEL, HISTORY) looked like buttons. Group dividers were too subtle.

**Fix:** Category labels restyled to `text-[8px] tracking-[0.15em] text-text-secondary/40` — smaller, dimmer, clearly non-interactive. Dividers thickened from `w-px bg-white/5` to `w-[2px] bg-white/15`.

**Files:** `src/ui/map/components/TopToolbar.tsx`, `src/ui/map/styles/globals.css`

---

## Phase 5: Sidebar & General UX

### Task 12: Corps Health Indicators (S1, S2)

**Problem:** Personnel numbers in sidebar had no health indication. Players couldn't tell which corps was in trouble at a glance.

**Fix:** Color-coded personnel numbers: green (≥8000, healthy), amber (4000-7999, attrition), red (<4000, critical).

**File:** `src/ui/map/components/CorpsCard.tsx`

### Task 14: Stance Dropdown Tooltips (S7)

**Problem:** Stance dropdown options (Offensive/Balanced/Defensive/Reorganize) had no explanation of mechanical effects.

**Fix:** Added `title` attributes to each option and the "Stance" label itself:
- Offensive: "Actively seeks engagements. Allows corps operations. Higher aggression."
- Balanced: "Holds positions. Defends and launches limited operations."
- Defensive: "Digs in. No offensive operations. Maximum entrenchment rate."
- Reorganize: "Halts all combat. Recovers cohesion and morale."

**File:** `src/ui/map/components/CorpsCard.tsx`

---

## Earlier Session Fixes (also in this commit)

| Fix | Detail | File |
|-----|--------|------|
| P0: Stuck GeoJSON sources | `triggerRepaint()` after deferred overlay setup | `MapContainer.tsx` |
| P1: PMTiles HMR race | `removeProtocol` guard before `addProtocol` | `MapContainer.tsx` |
| P2: Sector demarcation re-enabled | Removed `if(false)` gate, visibility=`sectorsVisible` | `MapContainer.tsx` |
| P2: Operation arrows hidden | Initial `visibility:'none'`, ops-mode-only toggle | `MapContainer.tsx` |
| P2: Front-line hover priority | Suppress OSID tooltip when front-edge hit | `useMapInteractions.ts` |
| P3: Pink seam artifacts | `fill-antialias: false` on osid-control-fill | `awwv_map_style.json` |
| P3: tsc errors | Return type fixes in EventDecisionModal, EventModal | `EventDecisionModal.tsx`, `EventModal.tsx` |
| P3: Vite launch config | Fixed for `preview_start` tool | `.claude/launch.json` |

---

## Files Changed (Complete List)

| File | Change Type |
|------|-------------|
| `src/ui/map/components/RadialMenu.tsx` | **NEW** |
| `src/ui/map/components/MapModeLegend.tsx` | **NEW** |
| `src/ui/map/map/MapContainer.tsx` | Modified (6 fixes) |
| `src/ui/map/map/useMapInteractions.ts` | Modified (hover priority + contextmenu) |
| `src/ui/map/map/awwv_map_style.json` | Modified (fill-antialias, icon-size, osid-selected-outline) |
| `src/ui/map/components/Minimap.tsx` | Modified (CSS toggle) |
| `src/ui/map/components/TopToolbar.tsx` | Modified (tooltips + category styling) |
| `src/ui/map/components/OfficerProfile.tsx` | Modified (rank insignia + JNA tooltip) |
| `src/ui/map/components/CorpsDetail.tsx` | Modified (Op Slots, exhaustion, equipment colors) |
| `src/ui/map/components/CorpsCard.tsx` | Modified (health colors + stance tooltips) |
| `src/ui/map/components/SettlementDetailContent.tsx` | Modified (Arrived/Displaced/Killed labels) |
| `src/ui/map/components/EventDecisionModal.tsx` | Modified (tsc fix) |
| `src/ui/map/components/EventModal.tsx` | Modified (tsc fix) |
| `src/ui/map/utils/officerCharacter.ts` | Modified (formatPips + rank insignia functions) |
| `src/ui/map/styles/globals.css` | Modified (module-header styling) |
| `src/ui/map/App.tsx` | Modified (panel routing + MapModeLegend) |
| `tests/ui_map_interactions.test.ts` | Modified (mock canvas fix) |
| `.claude/launch.json` | Modified (Vite launch config) |

---

## Verification

- **tsc**: Clean (0 errors)
- **vitest**: 1203 pass, 0 fail, 1 skipped (98 suites)
- **desktop:map:build**: Success (4.1s)
