# Report: UI/UX Audit & Premium Polish Plan
**Date:** March 14, 2026
**Status:** Investigation Complete -> Planning Phase

## 1. Executive Summary
The current UI is functional but suffers from **interaction depth friction** (too many clicks for common tasks), **geometric inaccuracy** (arrows not aligned with front lines), and **visual artifacts** (raw IDs leaking into the human-readable layer). 

The goal of this plan is to transform the tactical interface from a "data viewer" into a "premium military workstation" inspired by high-end grand strategy and modern tactical simulations.

---

## 2. Core Findings & Diagnoses

### A. The "Arrow Disconnect" (Geometry)
- **Finding**: Operation arrows currently originate from the **centroid** of assigned units.
- **Diagnosis**: Because OSIDs represent large polygons, units located at a settlement center appear "behind" the front. When an arrow starts there, it looks like it's coming from the rear, even if the unit is on the line.
- **Solution**: Arrow origins for Sector-based operations must be snapped to the **closest point on the sector edge list** relative to the objective.

### B. "Action Modes" vs. "One-Click Orders"
- **Finding**: The "Order" button in the Brigade panel opens a *second* panel, which contains "Attack" and "Move" buttons, which *then* require a map click.
- **Diagnosis**: 3-4 steps to issue a basic move order is too slow. The lack of visual feedback (no cursor change, no line preview) makes the system feel "broken" until the user clicks the map.
- **Solution**: 
  - Move "Attack/Move/AoR" actions to the **primary Brigade header**.
  - Implement a **Crosshair Cursor** and **Ghost Line Preview** when an action mode is active.

### C. The "Ops Planning" Discovery Problem
- **Finding**: Accessing operations planning requires: `Select Corps -> Orders -> Prepare`.
- **Diagnosis**: Operations are the "game-winning" mechanic but are buried as a sub-menu of a sub-panel.
- **Solution**: Elevate "Ops Planning" to a **Global Action Toolbar** (top-right or lower-right) and add a "New Op" button directly on the **Operations History Panel**.

### D. The "Artifact" Leakage (Raw IDs)
- **Finding**: Raw IDs like `op:zavidovici:cardak` and `VRS_1_CORPS` still appear in tooltips and narrative arcs.
- **Diagnosis**: Inconsistent use of the `getOsidDisplayName` and `formatRawId` utilities.
- **Solution**: Centralize all string rendering through a **Display Name Provider** that automatically strips internal prefixes from ANY rendered ID unless in Dev Mode.

### E. Lower Toolbar Confusion
- **Finding**: Labels like "Points" (Strategic Points) and toggles that "do nothing" (due to fog or lack of data).
- **Diagnosis**: The bar is a mix of Map Modes (Radio) and Layer Toggles (Checkboxes) with no visual hierarchy.
- **Solution**: Redesign as a **"System Console"** with distinct groupings for:
  - **Lenses** (Political, Ethnic, Supply)
  - **Tactical Overlays** (Fronts, Sectors, Operations)
  - **Environment** (Fog, Battles, Strategic Targets)

---

## 3. Structural Suggestions

| Current Component | Proposed Change | Rationale |
| :--- | :--- | :--- |
| **FormationDetail** | Add **"Sector Assignment Box"** directly under the name. | Instant context on where this unit is assigned without scrolling. |
| **FormationDetail** | Promote **Orders** to top-level icons (Sword/Arrow). | One-click access to the "Active Order" state. |
| **CorpsDetail** | Add **"Active Objective"** mini-map or mini-list. | Show what the corps is doing at a glance. |
| **MapModeToolbar** | Use **Icon + Label** (e.g., 🛡️ Defense). | Improves scanability and feels more "slick". |
| **Tooltip** | Implement **Multi-Stage Delay**. | 100ms for ID, 400ms for full data (avoids visual noise when panning). |

---

## 4. Premium Styling Plan (The "Slick" Overhaul)

### A. Visual Language: "The War Room"
- **Palette**: `Space Gray (#1a1a1e)` backgrounds with `Amber Gold (#c4a35a)` accents and `Tactical Cyan (#00f2ff)` for interaction highlights.
- **Glassmorphism**: All panels use `backdrop-filter: blur(12px)` and `background: rgba(26, 26, 30, 0.85)`. This allows the map to be seen "through" the UI, increasing situational awareness.

### B. Micro-Animations
- **Panel Transitions**: Use `framer-motion` for spring-based slide-ins (not linear). 
- **Action Mode**: When "Attack" is selected, the map source should slightly "darken" everywhere except valid target OSIDs (The "Spotlight" effect).
- **Pulse**: Operations objectives should have a subtle, faction-colored pulse.

### C. Typography
- **Primary**: `Outfit` (Modern, clean, military tech feel).
- **Data**: `JetBrains Mono` or `Roboto Mono` for numbers and coordinates.

---

## 5. Implementation Roadmap (Post-Approval)

1.  **Phase 1: Geometric Fix & Direct Action**
    - SNAP arrow origins to front lines.
    - Flat "Order" buttons in `FormationDetail`.
2.  **Phase 2: Global Navigation & Modals**
    - "Quick Plan" button in global UI.
    - Restructure `OpsPlanningModal` for better flow.
3.  **Phase 3: Visual Polish & Artifact Clean-out**
    - Apply glassmorphism and premium colors.
    - Final audit of all `id` rendering.

---
> [!IMPORTANT]
> This plan focuses on **reducing time-to-action** and **increasing immersion**. We want the user to feel like they are looking at a real-time digital sand table, not a web application.
