# Operations Planning Modal Redesign — Implementation Plan

**Design source:** `docs/30_planning/design/OPS_PLANNING_REDESIGN.md`
**Target version:** v0.5.3 (UI Completion)
**Status:** PLAN — ready for execution

---

## Overall Scope & Numbering

This redesign falls under **v0.5.3 — UI Completion** in the `ROADMAP_TO_1_0.md`, specifically building upon: *"All panels finalized"*. 

It also relates to the **Phase G — Player Interface & UX (Prototype)** from canonical architectural planning (`ROADMAP_v1_0.md`), moving the operation planning system from a functional MVP (checkboxes, disjointed inputs) to a polished, final-form interaction model.

## Implementation Phases

The redesign will be broken down into 5 sequential phases:

### Phase 1: Architectural UI Shell & Command Dashboard
### Phase 2: Tactical Cards & State Slotting
### Phase 3: Interactive Drawing & Map Rendering
### Phase 4: G-2 Forecast & Predictions Engine
### Phase 5: Commander Selection Integration

---

## Phase 1: Architectural UI Shell & Command Dashboard

**Goal:** Establish the new visual layout: map as background, bottom tray for unused forces, right panel for intel, and floating glassmorphic panels.

### 1.1 Layout Structure
- **Target File:** `src/ui/map/components/OpsPlanningModal.tsx`
- Replace the current flex-row split (left panel / right map) with an absolute-positioned overlay system.
- Implement the "Bottom Shelf" container for unassigned brigades (Tactical Cards).
- Implement the "Right Panel" container for the G-2 Forecast.
- Implement the "Top Bar" for operation metadata (Name, Type, Commander slot).

### 1.2 Theming & Styling
- Apply dark theme, NATO ops center aesthetic with frosted glass (`backdrop-blur`) and phosphor-green/accent-gold highlights.

**Gate:** The modal opens and displays the new layout skeleton over the existing map view. Elements are correctly positioned but currently empty.

---

## Phase 2: Tactical Cards & State Slotting

**Goal:** Replace the checkbox list with interactive Tactical Cards that can be slotted into Axes of Advance.

### 2.1 Tactical Card Component
- **New Component:** `src/ui/map/components/TacticalCard.tsx`
- Renders NATO symbol, brigade name, strength (personnel/tanks), and cohesion/fatigue mini-bars.

### 2.2 Drag-and-Drop / Slotting Logic
- **Target File:** `src/ui/map/components/OpsPlanningModal.tsx`
- Refactor the `activeAxis.brigadeIds` set management to handle distinct "slots".
- Clicking a card from the UNASSIGNED tray moves it to the ACTIVE AXIS slot area.
- Visual state update: Assigned cards leave the tray and appear in the axis definition box.

**Gate:** User can add an axis, and assign/unassign brigades to it using the new card UI instead of checkboxes.

---

## Phase 3: Interactive Drawing & Map Rendering

**Goal:** Fix the broken arrow MapLibre implementation and replace it with smooth, drawn paths.

### 3.1 Path Waypointing
- **Target File:** `src/ui/map/components/OpsPlanningModal.tsx`
- Change map click handler: clicking creates an ordered list of waypoints instead of just "objectives".
- Draw a glowing tether from assigned brigades to the Staging area.

### 3.2 Bezier Spline Arrows
- **Target File:** `src/ui/map/map/builders/buildMultiAxisArrows.ts`
- Instead of static feature replacement that causes map flashing, use `turf` bezier splines (or similar interpolation) to draw smooth arrows connecting staging -> wpt 1 -> wpt 2.
- Add an animated line-dash pattern (flow texture) to indicate the direction of the operation using MapLibre's `line-dasharray` transition trick.

**Gate:** As objectives are clicked, a smooth, glowing, animated arrow is drawn on the map.

---

## Phase 4: G-2 Forecast & Predictions Engine

**Goal:** Implement the real-time prediction panel on the right side.

### 4.1 Prediction Derivation
- Calculate **Odds of Success** (friendly assigned power vs estimated enemy power in target OSIDs).
- Calculate **Expected Casualties** based on `MinAttackOutcome` tolerance and `Tempo`.
- Calculate **Duration** (weeks) based on `Tempo` and distance.
- Calculate **Supply Warning** if the sector supply is insufficient for the `Tempo`.

### 4.2 UI Integration
- **Target File:** `src/ui/map/components/OpsPlanningModal.tsx` 
- Render the G-2 Forecast panel containing dial/gauge for success, and text readouts for casualties, duration, and supply.
- Ensure these values instantly recalculate whenever a Brigade is slotted, an objective is added, or Tempo is changed.

**Gate:** The forecast panel updates dynamically and accurately reflects the player's choices as they build the operation.

---

## Phase 5: Commander Selection Integration

**Goal:** Integrate the previously separate Commander Assignment flow directly into the planning dashboard.

### 5.1 Officer Slot UI
- **Target File:** `src/ui/map/components/OpsPlanningModal.tsx`
- Top-left Commander slot. Clicking it opens a carousel/dropdown of available Corps officers.

### 5.2 Mechanical Hooks 
- Ensure selecting a commander updates the operation `assigned_officer_id`.
- Modify the Phase 4 G-2 Forecast to account for the Commander's stats (`aggressive` increases casualties but reduces duration, etc.).
- Explicitly display the commander's modifiers in the UI (e.g., "+10% Breakthrough Speed").

**Gate:** Player can select a commander from within the modal, and see their impact on the G-2 Forecast immediately. Operations submit successfully with all required parameters.
