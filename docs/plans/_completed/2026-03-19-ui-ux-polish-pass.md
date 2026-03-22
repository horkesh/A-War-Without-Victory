# UI/UX Polish Pass Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all P1/P2 bugs from the UI/UX audit, add OSID click highlighting, larger brigade markers, radial right-click context menu, and polish labels/tooltips throughout.

**Architecture:** 5 phases of increasing scope. Phase 1 fixes critical bugs (toolbar routing, minimap). Phase 2 improves map interactions (OSID highlight, larger markers, hover). Phase 3 adds the radial context menu. Phase 4 polishes labels, tooltips, legends. Phase 5 adds sidebar health indicators and commander card improvements.

**Tech Stack:** React 18, MapLibre GL JS, Zustand, Tailwind CSS, TypeScript

**Audit reference:** `docs/40_reports/20260319_UI_UX_DEEP_AUDIT.md`

---

## Phase 1: Critical Bug Fixes (P1)

### Task 1: Fix Toolbar Button Routing (T1)

**Problem:** SUMMARY, AAR, SITUATION, EVENTS all open the same War Summary modal on the Overview tab. Each should open its specific panel/modal.

**Files:**
- Modify: `src/ui/map/App.tsx` (~lines 161-172, 500+)
- Modify: `src/ui/map/components/TopToolbar.tsx` (~lines 320-324)

**Step 1: Read App.tsx to find how callbacks are wired**
Read the TopToolbar invocation in App.tsx render section. Verify that `onOpenAAR`, `onOpenSummary`, `onOpenEventLog`, `onOpenOpsHistory` each set different state.

**Step 2: Verify each modal has a separate open state**
Confirm that `aarOpen`, `summaryOpen`, `eventLogOpen`, `opsHistoryOpen` are independent useState booleans. If they all alias the same setter, that's the bug.

**Step 3: Fix the callback wiring**
Ensure:
- SUMMARY button → `setSummaryOpen(true)` (War Summary modal, Overview tab)
- AAR button → `setAarOpen(true)` (AARPanel)
- OPS button → `setOpsHistoryOpen(true)` (OperationHistoryPanel)
- EVENTS button → `setEventLogOpen(true)` (EventLogPanel)
- SITUATION button → `setSummaryOpen(true)` (War Summary, Overview tab — this is correct if Situation IS the summary)

**Step 4: Run smoke test**
```bash
npx tsc --noEmit ; npx vitest run ; npm run desktop:map:build
```

**Step 5: Verify in browser**
Click each button, confirm different modals open.

**Step 6: Commit**
```
feat(ui): fix toolbar button routing — each button opens correct modal
```

---

### Task 2: Fix Minimap Toggle Bug (M1)

**Problem:** Toggle minimap OFF then ON: MapLibre canvas doesn't re-render. DOM exists but tiles don't load.

**Files:**
- Modify: `src/ui/map/components/Minimap.tsx`

**Step 1: Read Minimap.tsx**
Understand how the MapLibre instance is created in useEffect and how it's torn down. The bug is likely that:
- The MapLibre map is created in a useEffect with `[]` deps
- When the component unmounts (toggle OFF), `map.remove()` is called
- When it remounts (toggle ON), a new map is created but the style/tiles don't load

**Step 2: Identify root cause**
Check if the minimap uses the same PMTiles protocol as the main map. If the main map registers the protocol and the minimap relies on it, the protocol may be in a broken state after the minimap's map.remove() call.

**Step 3: Fix**
Most likely fix: add `map.triggerRepaint()` after the minimap map is created, or ensure the minimap registers its own protocol handler (or shares the main one safely). May also need to delay minimap creation by a frame (`requestAnimationFrame`) to avoid race with style loading.

**Step 4: Smoke test + browser verify**
Toggle minimap OFF and ON. Minimap should re-render with faction colors.

**Step 5: Commit**
```
fix(ui): minimap re-renders after toggle OFF→ON
```

---

## Phase 2: Map Interaction Improvements

### Task 3: OSID Click Highlight (User Request)

**Problem:** Clicking a settlement opens the panel but doesn't visually highlight the OSID polygon on the map.

**Files:**
- Modify: `src/ui/map/map/MapContainer.tsx` (~lines 1389-1553, applySectorHighlight area)
- Modify: `src/ui/map/map/awwv_map_style.json` (may need a new layer or reuse osid-control-outline)

**Step 1: Read how OSID click works**
In `useMapInteractions.ts`, `onOsidClick` sends the osid to MapContainer. In MapContainer, this sets `selectedOsid` or similar in the store. Find where the right panel is opened.

**Step 2: Add OSID highlight layer**
Either:
- (A) Use the existing `osid-control-outline` layer and change its filter to highlight the selected OSID (thicker outline, brighter color), OR
- (B) Add a new `osid-selected-highlight` fill layer with a bright faction-colored fill at higher opacity, filtered to the selected OSID.

Option (A) is simpler. Set the outline filter to `['==', ['get', 'osid'], selectedOsid]` when an OSID is selected, and style it with a 2-3px bright white or gold outline.

**Step 3: Wire the highlight to OSID selection**
In the useEffect that handles selection state, update the filter on the highlight layer when `selectedOsid` changes.

**Step 4: Clear highlight on deselect**
When clicking empty space or pressing Escape, reset the filter to `['==', ['get', 'osid'], '__none__']`.

**Step 5: Smoke test + browser verify**
Click an OSID → polygon lights up. Click empty → highlight clears.

**Step 6: Commit**
```
feat(ui): OSID polygon highlights on click
```

---

### Task 4: Larger Brigade Markers (M3 + User Request)

**Problem:** Brigade icons are too small at default zoom, clicks often hit the settlement underneath.

**Files:**
- Modify: `src/ui/map/map/awwv_map_style.json` (~line 1119, formation-markers icon-size)

**Step 1: Read current icon-size expression**
Current: zoom 6→0.3, zoom 9→0.45, zoom 12→0.6, zoom 14→0.75

**Step 2: Increase sizes by ~30-40%**
New: zoom 6→0.4, zoom 9→0.6, zoom 12→0.8, zoom 14→1.0

This makes icons noticeably larger at all zoom levels, especially at the default zoom (~8-9) where they'll go from 0.45→0.6.

**Step 3: Also increase the click hit area**
In `useMapInteractions.ts`, the click handler uses `queryRenderedFeatures` which respects icon size. Larger icons = larger hit area. No additional code needed if icon-size increases.

Alternatively, check if there's an `icon-allow-overlap` setting that could help with stacking.

**Step 4: Smoke test + browser verify**
Check that icons are larger, easier to click, don't overlap excessively at medium zoom.

**Step 5: Commit**
```
feat(ui): larger brigade markers — 30% bigger for easier selection
```

---

## Phase 3: Radial Right-Click Context Menu (User Priority)

### Task 5: Create RadialMenu Component

**Problem:** No right-click context menu. Right-click shows same settlement tooltip as left-click.

**Files:**
- Create: `src/ui/map/components/RadialMenu.tsx`
- Create: `src/ui/map/components/RadialMenu.css` (or use Tailwind)

**Step 1: Design the radial menu**
A CSS-animated radial menu that appears at cursor position. 4-6 items arranged in a circle. Each item is a sector of the ring with an icon/label.

Structure:
```tsx
interface RadialMenuItem {
  id: string;
  label: string;
  icon?: string;  // emoji or icon class
  disabled?: boolean;
  action: () => void;
}

interface RadialMenuProps {
  items: RadialMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
}
```

**Step 2: Implement the component**
- Absolute positioned at `position.x, position.y`
- Items arranged in a circle (CSS transform: rotate + translateY)
- Background: dark glass (`bg-panel/90 backdrop-blur-md`)
- Each item: 60px sector, gold text on hover
- Center: small circle with current target name
- Click outside or Escape closes

**Step 3: Add animation**
- Items fly out from center on mount (scale 0→1, staggered 30ms each)
- Items fly back on close
- Total animation: 150ms

**Step 4: Commit**
```
feat(ui): RadialMenu component — animated radial context menu
```

---

### Task 6: Wire RadialMenu to Map Right-Click

**Files:**
- Modify: `src/ui/map/map/useMapInteractions.ts`
- Modify: `src/ui/map/map/MapContainer.tsx`
- Modify: `src/ui/map/App.tsx`

**Step 1: Add contextmenu handler in useMapInteractions.ts**
```typescript
const handleContextMenu = (e: MapLayerMouseEvent) => {
  e.preventDefault();
  const point = { x: e.originalEvent.clientX, y: e.originalEvent.clientY };

  // Priority: formation > front-edge > OSID > empty
  const hits = map.queryRenderedFeatures(e.point, {
    layers: ['formation-markers', 'formation-labels',
             'front-edges-hover-pos', 'front-edges-hover-neg',
             'osid-control-fill'].filter(id => !!map.getLayer(id))
  });

  const first = hits[0];
  if (!first) { onContextMenu?.('empty', null, point); return; }

  if (['formation-markers', 'formation-labels'].includes(first.layer.id)) {
    onContextMenu?.('formation', first.properties, point);
  } else if (first.layer.id.includes('front-edges')) {
    onContextMenu?.('front', first.properties, point);
  } else {
    onContextMenu?.('osid', first.properties, point);
  }
};
```

**Step 2: Add context menu items per target type**
In MapContainer or App, define menus:

```typescript
const contextMenuItems = {
  formation: (props) => [
    { id: 'view', label: 'View Unit', icon: '👁', action: () => selectFormation(props.id) },
    { id: 'corps', label: 'View Corps', icon: '⚔', action: () => selectCorps(props.corps_id) },
    { id: 'sector', label: 'View Sector', icon: '🗺', action: () => selectSector(props.sector_id) },
  ],
  osid: (props) => [
    { id: 'info', label: 'Settlement Info', icon: '🏘', action: () => selectOsid(props.osid) },
    { id: 'sector', label: 'View Sector', icon: '🗺', action: () => selectSectorForOsid(props.osid) },
    { id: 'target', label: 'Set Op Target', icon: '🎯', action: () => setOpTarget(props.osid) },
  ],
  front: (props) => [
    { id: 'sector', label: 'Sector Detail', icon: '🗺', action: () => selectSector(props.sector_id) },
    { id: 'ops', label: 'Plan Operation', icon: '⚔', action: () => planOp(props.sector_id) },
  ],
  empty: () => [
    { id: 'zoom', label: 'Zoom to Fit', icon: '🔍', action: () => zoomToFit() },
    { id: 'deselect', label: 'Deselect All', icon: '✕', action: () => deselectAll() },
  ],
};
```

**Step 3: Suppress browser context menu on the map canvas**
```typescript
map.getCanvas().addEventListener('contextmenu', (e) => e.preventDefault());
```

**Step 4: Manage RadialMenu state in App or MapContainer**
```typescript
const [contextMenu, setContextMenu] = useState<{ type: string; props: any; position: {x:number,y:number} } | null>(null);
```

**Step 5: Smoke test + browser verify**
Right-click on unit → radial menu with View Unit / View Corps / View Sector.
Right-click on empty map → Zoom to Fit / Deselect All.

**Step 6: Commit**
```
feat(ui): radial right-click context menu — formation, OSID, front, empty targets
```

---

## Phase 4: Labels, Tooltips, and Legends

### Task 7: Disabled Button Tooltips (T2)

**Files:**
- Modify: `src/ui/map/components/TopToolbar.tsx` (~lines 245-273)

**Step 1: Add title attributes to disabled buttons**
For each disabled button, add a `title` explaining why:
- SAVE: `title="Save requires the Electron desktop app"`
- ADVANCE TURN: `title="Advance turn requires the Electron desktop app"`
- CAMPAIGN: `title="Campaign info requires the Electron desktop app"`
- RECRUIT: `title="Recruitment requires the Electron desktop app"`

**Step 2: Commit**
```
feat(ui): disabled toolbar buttons show tooltip explaining why
```

---

### Task 8: Heat Map Mode Legends (B1)

**Files:**
- Create: `src/ui/map/components/MapModeLegend.tsx`
- Modify: `src/ui/map/App.tsx` (render legend when non-political mode active)

**Step 1: Create MapModeLegend component**
A small floating legend in the bottom-left corner (above minimap when visible). Shows a gradient bar with min/max labels.

```tsx
const LEGENDS: Record<MapMode, { title: string; stops: {color: string; label: string}[] } | null> = {
  political: null, // no legend needed
  ethnic: { title: 'Majority Ethnicity', stops: [
    { color: '#8B3232', label: 'Serb' },
    { color: '#378C4B', label: 'Bosniak' },
    { color: '#326EAA', label: 'Croat' },
  ]},
  supply: { title: 'Supply Status', stops: [
    { color: '#1a4a1a', label: 'Critical' },
    { color: '#2d7a2d', label: 'Strained' },
    { color: '#4aaa4a', label: 'Adequate' },
    { color: '#6ddd6d', label: 'Surplus' },
  ]},
  casualties: { title: 'Civilian Casualties', stops: [
    { color: 'rgba(255,255,255,0)', label: '0' },
    { color: 'rgba(200,50,50,0.6)', label: 'High' },
  ]},
  morale: { title: 'Avg. Brigade Morale', stops: [
    { color: '#aa2222', label: 'Broken' },
    { color: '#ddaa33', label: 'Shaky' },
    { color: '#44aa44', label: 'Steady' },
  ]},
  operations: { title: 'Operational Effort', stops: [
    { color: 'rgba(80,124,173,0.3)', label: 'Holding' },
    { color: 'rgba(209,139,53,0.34)', label: 'Supporting' },
    { color: 'rgba(191,57,43,0.4)', label: 'Main Effort' },
  ]},
  defense: { title: 'Defense Density', stops: [
    { color: '#44aa44', label: 'Dense' },
    { color: '#ddaa33', label: 'Moderate' },
    { color: '#aa2222', label: 'Thin' },
  ]},
};
```

**Step 2: Style it**
- Glass panel: `bg-panel/80 backdrop-blur-sm rounded-lg`
- Title: 10px uppercase, gold
- Color stops: small squares with labels
- Width: ~140px, height: auto

**Step 3: Render conditionally**
Only show when `mapMode !== 'political'`. Position: bottom-left, above minimap.

**Step 4: Commit**
```
feat(ui): map mode legends — color scale explanation per mode
```

---

### Task 9: Polish Corps Detail Labels (C1-C5)

**Files:**
- Modify: `src/ui/map/components/OfficerProfile.tsx` (~lines 52-60)
- Modify: `src/ui/map/components/CorpsDetail.tsx` (~lines 163, 187-193)

**Step 1: Fix commander rating display (C1)**
Change from dots to labeled bars:
```
Competence: ████░ 4/5 Exceptional
Aggression: ████░ 4/5 Bold
Defense:    ███░░ 3/5 Resilient
```
Add numeric value after dots: `●●●●○ 4/5 — Exceptional`

**Step 2: Fix "OG Slots" label (C2)**
Change `OG Slots` → `Op Slots` and add tooltip: `title="Maximum simultaneous operations this corps can conduct"`

**Step 3: Fix "Exh:" abbreviation (C3)**
Change `Exh: 16.0` → `Exhaustion: 16` and add color:
- 0-20: green (fresh)
- 20-50: yellow (fatigued)
- 50+: red (exhausted)

**Step 4: Add equipment health color (C4)**
For "Tanks 109/198", calculate percentage and apply color class:
- >80%: `text-emerald-400`
- 50-80%: `text-amber-400`
- <50%: `text-red-400`

**Step 5: Add JNA badge tooltip (C5)**
Add `title="This officer served in the Yugoslav People's Army (JNA) before the war"` to the JNA badge.

**Step 6: Commit**
```
feat(ui): polish corps detail — ratings with numbers, clear labels, equipment health colors
```

---

### Task 10: Polish Settlement Panel Labels (P1-P3)

**Files:**
- Modify: `src/ui/map/components/SettlementDetailContent.tsx` (~lines 399-418)

**Step 1: Differentiate "Out" vs "Lost" colors (P1)**
Currently "Out" uses `text-amber-400` and "Lost" uses `text-red-400` — WAIT, re-reading the agent's findings, "Out" already uses amber and "Lost" already uses red! The audit may have been wrong about them being the same color. Verify in browser.

If they ARE already different: mark as already-fixed in the audit doc.
If they ARE the same: change "Out" (displaced) to amber, "Lost" (killed) to red.

**Step 2: Improve column headers (P2)**
Change the compact header labels:
- "In" → "Arrived"
- "Out" → "Displaced"
- "Lost" → "Killed"

**Step 3: Add militia pool units (P3)**
After "7 avail" add " men" or use thousands format: "7k avail" or add tooltip explaining the number.

**Step 4: Commit**
```
feat(ui): settlement panel — clearer population labels and militia units
```

---

### Task 11: Commander Identity — Rank Insignia Instead of Portraits

**Problem:** User wants something for commanders but portraits are inappropriate (war criminals).

**Alternative: Rank insignia + personality badge**
Instead of portraits, show:
- A **stylized rank insignia** (stars/bars matching Yugoslav military ranks) sized to fill the portrait area
- Below it: a **personality archetype badge** ("Master Strategist", "Aggressive Commander", "Cautious Defender") in gold text
- The insignia is faction-colored (RS red, RBiH green, HRHB blue)
- War crimes annotation stays as-is (ICTY charges box)

This keeps commanders feeling personal without using photographs of individuals who committed atrocities.

**Files:**
- Modify: `src/ui/map/components/OfficerProfile.tsx`

**Step 1: Create rank insignia SVG/CSS component**
Map officer rank to visual insignia:
- General (4 stars)
- Colonel (3 stars)
- Lt. Colonel (2 stars + bar)
- Major (2 stars)

Simple CSS stars arranged horizontally, faction-colored.

**Step 2: Add personality archetype badge**
Already present as text ("Master Strategist"). Make it more prominent — larger font, centered below insignia, with a subtle background.

**Step 3: Commit**
```
feat(ui): commander rank insignia — visual rank display instead of portraits
```

---

## Phase 5: Sidebar & General UX

### Task 12: Corps Health Indicators in Sidebar (S1, S2)

**Files:**
- Modify: `src/ui/map/components/CommandSidebar.tsx` (or wherever corps cards are rendered in the sidebar)

**Step 1: Add a compact health bar per corps**
Next to the personnel count, add a 3-segment mini health bar:
- Segment 1: Personnel strength (% of initial)
- Segment 2: Average morale (% of max)
- Segment 3: Supply status (adequate/strained/critical)

Each segment: 4px tall, 20px wide, color-coded (green/yellow/red).

**Step 2: Color-code personnel count**
Apply color to the personnel number:
- >80% strength: `text-emerald-400`
- 50-80%: `text-amber-400`
- <50%: `text-red-400`

This requires knowing the initial personnel count. If not available in the sidebar data, use a simple heuristic (e.g., compare to 10,000 threshold).

**Step 3: Commit**
```
feat(ui): corps health indicators in sidebar — strength/morale/supply bars
```

---

### Task 13: Toolbar Category Labels (T3, T4, T8)

**Files:**
- Modify: `src/ui/map/components/TopToolbar.tsx`

**Step 1: Restyle category labels**
Change SYSTEMS, PERSONNEL, INTEL, HISTORY from plain text to dimmer, smaller, uppercase labels:
```tsx
<span className="text-[8px] text-text-secondary/40 uppercase tracking-widest mr-2">SYSTEMS</span>
```

**Step 2: Make ECONOMY a non-clickable label (T3)**
If ECONOMY has no modal to open, restyle it as a category label (same as SYSTEMS) rather than a button. Or: make it open the War Summary modal on a hypothetical "Economy" tab.

**Step 3: Thicken group dividers (T8)**
Change the divider between button groups from `w-[1px] bg-white/10` to `w-[2px] bg-white/15 mx-2`.

**Step 4: Commit**
```
feat(ui): toolbar categories restyled — clearer grouping and labels
```

---

### Task 14: Stance Dropdown Tooltips (S7) + Deselect on Empty Click (M4)

**Files:**
- Modify: `src/ui/map/components/CommandSidebar.tsx` (stance dropdown)
- Modify: `src/ui/map/map/useMapInteractions.ts` (empty click behavior)

**Step 1: Add stance tooltips**
For each stance option in the combobox, add `title` attributes:
- "Offensive: Corps actively seeks engagements. +0.15 aggression."
- "Balanced: Corps holds current positions. Defends and launches limited attacks."
- "Defensive: Corps digs in. No offensive operations. -0.30 aggression."

**Step 2: Deselect on empty click**
In the existing `handleMapClick` handler, when no feature is hit (line ~225), also clear any active OSID highlight and close the right panel:
```typescript
onOsidClick?.('', {}); // already exists
// Also trigger panel close:
onDeselectAll?.();
```

**Step 3: Commit**
```
feat(ui): stance tooltips + deselect-all on empty map click
```

---

## Phase Summary

| Phase | Tasks | Scope | Est. Effort |
|-------|-------|-------|-------------|
| 1 | Tasks 1-2 | Fix P1 bugs (toolbar routing, minimap) | Small |
| 2 | Tasks 3-4 | OSID highlight, larger markers | Small |
| 3 | Tasks 5-6 | Radial context menu (new component + wiring) | Medium |
| 4 | Tasks 7-11 | Labels, tooltips, legends, commander insignia | Medium |
| 5 | Tasks 12-14 | Sidebar health, toolbar categories, stance tooltips | Small |

**Smoke test after each phase:**
```bash
npx tsc --noEmit
npx vitest run
npm run desktop:map:build
```

**Browser verify after each phase:**
Load `http://localhost:3001/?live=1`, test affected interactions.

---

## Deferred Items (Not in This Plan)

These items from the audit are intentionally deferred:

| Item | Reason |
|------|--------|
| G1: Onboarding/tutorial | Major feature — needs full design spec first |
| G2: Undo for stance changes | Needs order queue integration in Electron |
| G3: Notification system | Cross-cutting — needs event bus design |
| G4: Faction selector context | Needs game design input on difficulty ratings |
| B2: Supply mode broken | Needs data investigation (may be engine issue) |
| B5: Territory trend sparklines | Nice-to-have, needs historical state storage |
| Turn timeline scrubber | Major feature — needs historical save replay |
| War overview dashboard | Major feature — needs dedicated design |
| Battle replay | Major feature — needs animation system |
| Sound design hooks | Cross-cutting — needs audio asset pipeline |
| Map mode scroll-cycle | Nice-to-have, low priority |
| Commander's intent overlay | Needs painted target visualization pipeline |
