# Sector Visualization Improvement Suggestions

**Status:** Proposed / Follow-up
**Date:** 2026-03-07

## Overview
Based on user feedback, sector visualization is currently difficult to read unless a sector is explicitly selected (clicked). To improve "at-a-glance" readability without cluttering the map, the following five approaches are suggested.

## Proposed Suggestions

### 1. Subtle Demarcation Lines (Always-On)
Render the boundaries between different sectors of the *same* faction as faint, dashed, or dotted lines.
- **Benefit:** Shows the "puzzle pieces" of areas of responsibility without overwhelming the map.
- **Implementation:** Utilize the existing `buildSectorDemarcationGeoJSON.ts` logic.

### 2. Corps-Colored Frontlines
Tint segments of the frontline using the unique color assigned to that sector's parent Corps.
- **Benefit:** Creates a strong visual association between the active front and the responsible unit.
- **Implementation:** Integrate `buildCorpsColorMap` into the `FrontLines` renderer.

### 3. Hover Previews (Tooltip + Light Glow)
Apply a faint fill (e.g., 5-10% opacity) and display the sector name near the cursor when hovering over any territory.
- **Benefit:** Provides immediate feedback on sector shapes before a click is made.
- **Implementation:** Update `map/useMapInteractions.ts` to handle sector hover states.

### 4. "Show All Sectors" Map Overlay
Modify the existing "Sectors" toggle to permanently fill all sectors with their semi-transparent Corps colors.
- **Benefit:** Shows the complete tactical layout and faction hierarchy at once.
- **Implementation:** Update `MapContainer.tsx` to handle a global fill layer when the toggle is active.

### 5. Sector Centroid Labels
Place faint labels (e.g., "1st Krajina Corps Sector") at the geographic center of each sector, fading in at mid-level zoom.
- **Benefit:** Provides geographical context and identification without searching.
- **Implementation:** Generate a centroid source and use a `symbol` layer with zoom-based opacity.
