# Clickable Regions Specification — A War Without Victory
**Version:** 1.0
**Date:** 2026-02-05
**Purpose:** Define interactive hotspots on static HQ background image

---

## 1. Problem Statement

**Challenge:** The HQ background is a single static image with baked-in props (phone, newspaper, magazine, reports, radio). How does the game engine know:
1. Where these objects are located?
2. How to detect clicks on them?
3. How to show hover highlights?

**Solution:** Create a **clickable regions map** — a JSON file defining rectangular bounds for each interactive element.

---

## 2. Architecture Overview

```
Static Image (hq_background_mvp.png)
         +
Clickable Regions Map (hq_clickable_regions.json)
         ↓
Game Engine reads map → Creates invisible clickable areas
         ↓
Player hovers/clicks → Engine checks if cursor inside any region
         ↓
If inside region → Show highlight + trigger action
```

---

## 3. Clickable Regions JSON Format

### 3.1 File Structure

**File:** `hq_clickable_regions.json`

```json
{
  "schema_version": "1.0",
  "image_dimensions": {
    "width": 2048,
    "height": 1152
  },
  "regions": [
    {
      "id": "national_crest",
      "type": "sprite_overlay",
      "bounds": {
        "x": 914,
        "y": 30,
        "width": 220,
        "height": 140
      },
      "action": "open_faction_overview",
      "hover_style": "red_outline",
      "cursor": "pointer",
      "tooltip": "Faction Overview",
      "layer": "wall"
    },
    {
      "id": "wall_map",
      "type": "dynamic_render",
      "bounds": {
        "x": 200,
        "y": 80,
        "width": 1200,
        "height": 800
      },
      "action": "map_zoom_in",
      "hover_style": "magnifying_glass_cursor",
      "cursor": "zoom-in",
      "tooltip": "Click to zoom",
      "layer": "wall"
    },
    {
      "id": "wall_calendar",
      "type": "dynamic_render",
      "bounds": {
        "x": 1600,
        "y": 100,
        "width": 200,
        "height": 280
      },
      "action": "advance_turn",
      "hover_style": "red_outline",
      "cursor": "pointer",
      "tooltip": "Advance to next turn",
      "layer": "wall"
    },
    {
      "id": "red_telephone",
      "type": "baked_prop",
      "bounds": {
        "x": 150,
        "y": 920,
        "width": 120,
        "height": 100
      },
      "action": "open_diplomacy_panel",
      "hover_style": "red_outline",
      "cursor": "pointer",
      "tooltip": "Diplomacy (Phase II+)",
      "disabled": true,
      "layer": "desk"
    },
    {
      "id": "newspaper_current",
      "type": "baked_prop",
      "bounds": {
        "x": 350,
        "y": 900,
        "width": 180,
        "height": 120
      },
      "action": "open_newspaper_modal",
      "hover_style": "red_outline",
      "cursor": "pointer",
      "tooltip": "Today's Newspaper (T-1 events)",
      "layer": "desk"
    },
    {
      "id": "magazine",
      "type": "baked_prop",
      "bounds": {
        "x": 650,
        "y": 880,
        "width": 140,
        "height": 180
      },
      "action": "open_magazine_modal",
      "hover_style": "red_outline",
      "cursor": "pointer",
      "tooltip": "Monthly Review",
      "layer": "desk"
    },
    {
      "id": "report_stack",
      "type": "baked_prop",
      "bounds": {
        "x": 900,
        "y": 870,
        "width": 160,
        "height": 200
      },
      "action": "open_reports_modal",
      "hover_style": "red_outline",
      "cursor": "pointer",
      "tooltip": "Situation Reports",
      "layer": "desk"
    },
    {
      "id": "transistor_radio",
      "type": "baked_prop",
      "bounds": {
        "x": 1650,
        "y": 950,
        "width": 100,
        "height": 80
      },
      "action": "toggle_news_ticker",
      "hover_style": "red_outline",
      "cursor": "pointer",
      "tooltip": "International News Ticker",
      "layer": "desk"
    }
  ]
}
```

### 3.2 Region Properties Explained

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier for this region |
| `type` | enum | `"baked_prop"` (in image), `"sprite_overlay"` (rendered on top), `"dynamic_render"` (engine-generated) |
| `bounds` | object | Rectangle defining clickable area: `{x, y, width, height}` in pixels |
| `action` | string | Function to call when clicked (e.g., `"open_newspaper_modal"`) |
| `hover_style` | enum | `"red_outline"`, `"magnifying_glass_cursor"`, `"glow"`, `"none"` |
| `cursor` | string | CSS cursor style: `"pointer"`, `"zoom-in"`, `"default"` |
| `tooltip` | string | Text shown on hover (optional) |
| `disabled` | boolean | If true, region is non-interactive (grayed out) |
| `layer` | enum | `"wall"` or `"desk"` (for visual organization) |

---

## 4. How to Create the Regions Map

### 4.1 Manual Method (Using Image Editor)

**Steps:**

1. **Open HQ background** in Photoshop or GIMP

2. **Enable ruler** (View → Rulers, or Ctrl+R)

3. **Use Info Panel** (Window → Info, or F8)

4. **For each interactive object:**
   - Use Rectangle Marquee Tool (M)
   - Draw rectangle around object
   - Note coordinates shown in Info Panel:
     - X: left edge position
     - Y: top edge position
     - W: width
     - H: height

5. **Record coordinates** in JSON file

**Example (Newspaper):**
- Draw rectangle around newspaper on desk
- Info panel shows: X=350, Y=900, W=180, H=120
- Add to JSON:
  ```json
  {
    "id": "newspaper_current",
    "bounds": {"x": 350, "y": 900, "width": 180, "height": 120}
  }
  ```

**Tips:**
- Make bounds slightly larger than visual object (10-20px padding) for easier clicking
- Overlapping regions are OK (engine checks in order, first match wins)
- For irregular shapes, use bounding box (smallest rectangle that fits)

---

### 4.2 Semi-Automated Method (Using Web Tool)

**Create an HTML tool for region mapping:**

**File:** `tools/ui/region_mapper.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>HQ Clickable Region Mapper</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #222;
      color: #eee;
      font-family: monospace;
    }
    #canvas-container {
      position: relative;
      display: inline-block;
    }
    canvas {
      border: 2px solid #fff;
      cursor: crosshair;
    }
    .region-overlay {
      position: absolute;
      border: 2px solid red;
      background: rgba(255, 0, 0, 0.2);
      pointer-events: none;
    }
    #controls {
      margin-top: 20px;
      padding: 20px;
      background: #333;
      border: 1px solid #555;
    }
    #output {
      margin-top: 20px;
      padding: 20px;
      background: #111;
      border: 1px solid #555;
      white-space: pre;
      font-size: 12px;
      max-height: 400px;
      overflow-y: auto;
    }
    input, select, button {
      margin: 5px;
      padding: 8px;
      font-family: monospace;
    }
    .region-list {
      margin-top: 10px;
    }
    .region-item {
      padding: 5px;
      margin: 5px 0;
      background: #444;
      cursor: pointer;
    }
    .region-item:hover {
      background: #555;
    }
  </style>
</head>
<body>
  <h1>HQ Clickable Region Mapper</h1>

  <div id="canvas-container">
    <canvas id="canvas"></canvas>
  </div>

  <div id="controls">
    <h3>Draw Region</h3>
    <label>ID: <input type="text" id="region-id" placeholder="e.g., newspaper_current"></label>
    <label>Type:
      <select id="region-type">
        <option value="baked_prop">Baked Prop</option>
        <option value="sprite_overlay">Sprite Overlay</option>
        <option value="dynamic_render">Dynamic Render</option>
      </select>
    </label>
    <label>Action: <input type="text" id="region-action" placeholder="e.g., open_newspaper_modal"></label>
    <label>Tooltip: <input type="text" id="region-tooltip" placeholder="e.g., Today's Newspaper"></label>
    <label>Layer:
      <select id="region-layer">
        <option value="desk">Desk</option>
        <option value="wall">Wall</option>
      </select>
    </label>
    <br>
    <button id="clear-selection">Clear Selection</button>
    <button id="add-region">Add Region</button>

    <div class="region-list">
      <h4>Regions:</h4>
      <div id="regions-list"></div>
    </div>
  </div>

  <div id="output">
    <strong>JSON Output:</strong>
    <div id="json-output">{}</div>
  </div>

  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('canvas-container');

    let image = new Image();
    let regions = [];
    let currentRect = null;
    let isDragging = false;
    let startX, startY;

    // Load HQ background image
    image.onload = function() {
      canvas.width = image.width;
      canvas.height = image.height;
      redraw();
    };
    image.src = '../../assets/hq_backgrounds/hq_background_mvp.png'; // Adjust path

    canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      isDragging = true;
      currentRect = { x: startX, y: startY, width: 0, height: 0 };
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      currentRect.width = x - startX;
      currentRect.height = y - startY;
      redraw();
    });

    canvas.addEventListener('mouseup', (e) => {
      isDragging = false;
      // Normalize negative widths/heights
      if (currentRect.width < 0) {
        currentRect.x += currentRect.width;
        currentRect.width = Math.abs(currentRect.width);
      }
      if (currentRect.height < 0) {
        currentRect.y += currentRect.height;
        currentRect.height = Math.abs(currentRect.height);
      }
      redraw();
    });

    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0);

      // Draw existing regions
      regions.forEach((region, index) => {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.lineWidth = 2;
        ctx.strokeRect(region.bounds.x, region.bounds.y, region.bounds.width, region.bounds.height);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.fillRect(region.bounds.x, region.bounds.y, region.bounds.width, region.bounds.height);

        // Label
        ctx.fillStyle = 'white';
        ctx.font = '14px monospace';
        ctx.fillText(region.id, region.bounds.x + 5, region.bounds.y + 20);
      });

      // Draw current selection
      if (currentRect) {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.strokeRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fillRect(currentRect.x, currentRect.y, currentRect.width, currentRect.height);
      }
    }

    document.getElementById('add-region').addEventListener('click', () => {
      if (!currentRect || currentRect.width === 0 || currentRect.height === 0) {
        alert('Draw a rectangle first!');
        return;
      }

      const id = document.getElementById('region-id').value;
      if (!id) {
        alert('Enter a region ID!');
        return;
      }

      const region = {
        id: id,
        type: document.getElementById('region-type').value,
        bounds: {
          x: Math.round(currentRect.x),
          y: Math.round(currentRect.y),
          width: Math.round(currentRect.width),
          height: Math.round(currentRect.height)
        },
        action: document.getElementById('region-action').value,
        hover_style: "red_outline",
        cursor: "pointer",
        tooltip: document.getElementById('region-tooltip').value,
        layer: document.getElementById('region-layer').value
      };

      regions.push(region);
      currentRect = null;
      updateUI();
      redraw();
    });

    document.getElementById('clear-selection').addEventListener('click', () => {
      currentRect = null;
      redraw();
    });

    function updateUI() {
      // Update regions list
      const listEl = document.getElementById('regions-list');
      listEl.innerHTML = regions.map((r, i) =>
        `<div class="region-item" onclick="removeRegion(${i})">
          ${i + 1}. ${r.id} (${r.bounds.x}, ${r.bounds.y}, ${r.bounds.width}×${r.bounds.height}) [Click to remove]
        </div>`
      ).join('');

      // Update JSON output
      const output = {
        schema_version: "1.0",
        image_dimensions: {
          width: canvas.width,
          height: canvas.height
        },
        regions: regions
      };
      document.getElementById('json-output').textContent = JSON.stringify(output, null, 2);
    }

    function removeRegion(index) {
      regions.splice(index, 1);
      updateUI();
      redraw();
    }
    window.removeRegion = removeRegion; // Make globally accessible
  </script>
</body>
</html>
```

**Usage:**
1. Open `tools/ui/region_mapper.html` in browser
2. Image loads automatically (adjust path in script if needed)
3. Click and drag on image to draw rectangles
4. Fill in region properties (ID, action, tooltip)
5. Click "Add Region"
6. Repeat for all interactive elements
7. Copy JSON output at bottom
8. Save as `hq_clickable_regions.json`

---

## 5. Engine Integration

### 5.1 Loading Regions Map

```typescript
// src/ui/warroom/ClickableRegionManager.ts

interface Region {
  id: string;
  type: 'baked_prop' | 'sprite_overlay' | 'dynamic_render';
  bounds: { x: number; y: number; width: number; height: number };
  action: string;
  hover_style: 'red_outline' | 'magnifying_glass_cursor' | 'glow' | 'none';
  cursor: string;
  tooltip?: string;
  disabled?: boolean;
  layer: 'wall' | 'desk';
}

interface RegionsMap {
  schema_version: string;
  image_dimensions: { width: number; height: number };
  regions: Region[];
}

class ClickableRegionManager {
  private regionsMap: RegionsMap;
  private hoveredRegion: Region | null = null;

  async loadRegions(jsonPath: string) {
    const response = await fetch(jsonPath);
    this.regionsMap = await response.json();
  }

  /**
   * Check if cursor position is inside any region
   */
  getRegionAtPoint(x: number, y: number): Region | null {
    for (const region of this.regionsMap.regions) {
      if (region.disabled) continue;

      const { x: rx, y: ry, width: rw, height: rh } = region.bounds;
      if (x >= rx && x <= rx + rw && y >= ry && y <= ry + rh) {
        return region;
      }
    }
    return null;
  }

  /**
   * Handle mouse move (for hover effects)
   */
  onMouseMove(canvasX: number, canvasY: number, canvas: HTMLCanvasElement) {
    const region = this.getRegionAtPoint(canvasX, canvasY);

    if (region !== this.hoveredRegion) {
      this.hoveredRegion = region;

      if (region) {
        // Apply cursor style
        canvas.style.cursor = region.cursor;

        // Show tooltip
        if (region.tooltip) {
          this.showTooltip(region.tooltip, canvasX, canvasY);
        }
      } else {
        // Reset cursor
        canvas.style.cursor = 'default';
        this.hideTooltip();
      }
    }
  }

  /**
   * Handle mouse click
   */
  onClick(canvasX: number, canvasY: number, gameState: any) {
    const region = this.getRegionAtPoint(canvasX, canvasY);

    if (region && !region.disabled) {
      console.log(`Clicked region: ${region.id}, action: ${region.action}`);
      this.executeAction(region.action, gameState);
    }
  }

  /**
   * Execute action based on region
   */
  private executeAction(action: string, gameState: any) {
    switch (action) {
      case 'open_faction_overview':
        this.openFactionOverview(gameState);
        break;
      case 'map_zoom_in':
        this.zoomMap(gameState);
        break;
      case 'advance_turn':
        this.advanceTurn(gameState);
        break;
      case 'open_newspaper_modal':
        this.openNewspaperModal(gameState);
        break;
      case 'open_magazine_modal':
        this.openMagazineModal(gameState);
        break;
      case 'open_reports_modal':
        this.openReportsModal(gameState);
        break;
      case 'toggle_news_ticker':
        this.toggleNewsTicker(gameState);
        break;
      case 'open_diplomacy_panel':
        this.openDiplomacyPanel(gameState);
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
  }

  // Action implementations...
  private openFactionOverview(gameState: any) { /* ... */ }
  private zoomMap(gameState: any) { /* ... */ }
  // ... etc
}
```

### 5.2 Rendering Hover Highlights

```typescript
// src/ui/warroom/HoverRenderer.ts

class HoverRenderer {
  renderHighlight(ctx: CanvasRenderingContext2D, region: Region) {
    const { x, y, width, height } = region.bounds;

    switch (region.hover_style) {
      case 'red_outline':
        ctx.strokeStyle = 'rgb(200, 20, 20)';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
        break;

      case 'glow':
        ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
        ctx.shadowBlur = 15;
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        ctx.shadowBlur = 0; // Reset
        break;

      case 'magnifying_glass_cursor':
        // Cursor handled by CSS, no overlay needed
        break;

      case 'none':
        // No visual highlight
        break;
    }
  }
}
```

### 5.3 Main Warroom Integration

```typescript
// src/ui/warroom/warroom.ts

import { ClickableRegionManager } from './ClickableRegionManager.js';
import { HoverRenderer } from './HoverRenderer.js';

class WarroomApp {
  private regionManager = new ClickableRegionManager();
  private hoverRenderer = new HoverRenderer();

  async init() {
    // Load regions map
    await this.regionManager.loadRegions('/data/ui/hq_clickable_regions.json');

    // Set up event listeners
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.onClick(e));

    this.renderLoop();
  }

  private onMouseMove(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    this.regionManager.onMouseMove(canvasX, canvasY, this.canvas);
  }

  private onClick(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    this.regionManager.onClick(canvasX, canvasY, this.gameState);
  }

  render() {
    // 1. Draw HQ background
    if (this.bgImage) {
      this.ctx.drawImage(this.bgImage, 0, 0, this.canvas.width, this.canvas.height);
    }

    // 2. Draw dynamic elements (map, calendar, crests)
    // ... (see previous implementation)

    // 3. Draw hover highlight (if any)
    const hoveredRegion = this.regionManager.getHoveredRegion();
    if (hoveredRegion) {
      this.hoverRenderer.renderHighlight(this.ctx, hoveredRegion);
    }
  }
}
```

---

## 6. Example: Complete Regions Map for MVP

**File:** `data/ui/hq_clickable_regions.json`

```json
{
  "schema_version": "1.0",
  "image_dimensions": {
    "width": 2048,
    "height": 1152
  },
  "regions": [
    {
      "id": "national_crest",
      "type": "sprite_overlay",
      "bounds": {"x": 914, "y": 30, "width": 220, "height": 140},
      "action": "open_faction_overview",
      "hover_style": "red_outline",
      "cursor": "pointer",
      "tooltip": "Faction Overview",
      "layer": "wall"
    },
    {
      "id": "wall_map",
      "type": "dynamic_render",
      "bounds": {"x": 200, "y": 80, "width": 1200, "height": 800},
      "action": "map_zoom_in",
      "hover_style": "magnifying_glass_cursor",
      "cursor": "zoom-in",
      "tooltip": "Click to zoom",
      "layer": "wall"
    },
    {
      "id": "wall_calendar",
      "type": "dynamic_render",
      "bounds": {"x": 1600, "y": 100, "width": 200, "height": 280},
      "action": "advance_turn",
      "hover_style": "red_outline",
      "cursor": "pointer",
      "tooltip": "Advance to next turn",
      "layer": "wall"
    },
    {
      "id": "red_telephone",
      "type": "baked_prop",
      "bounds": {"x": 150, "y": 920, "width": 120, "height": 100},
      "action": "open_diplomacy_panel",
      "hover_style": "red_outline",
      "cursor": "pointer",
      "tooltip": "Diplomacy (Phase II+)",
      "disabled": true,
      "layer": "desk"
    },
    {
      "id": "newspaper_current",
      "type": "baked_prop",
      "bounds": {"x": 350, "y": 900, "width": 180, "height": 120},
      "action": "open_newspaper_modal",
      "hover_style": "red_outline",
      "cursor": "pointer",
      "tooltip": "Today's Newspaper (T-1 events)",
      "layer": "desk"
    },
    {
      "id": "magazine",
      "type": "baked_prop",
      "bounds": {"x": 650, "y": 880, "width": 140, "height": 180},
      "action": "open_magazine_modal",
      "hover_style": "red_outline",
      "cursor": "pointer",
      "tooltip": "Monthly Review",
      "layer": "desk"
    },
    {
      "id": "report_stack",
      "type": "baked_prop",
      "bounds": {"x": 900, "y": 870, "width": 160, "height": 200},
      "action": "open_reports_modal",
      "hover_style": "red_outline",
      "cursor": "pointer",
      "tooltip": "Situation Reports",
      "layer": "desk"
    },
    {
      "id": "transistor_radio",
      "type": "baked_prop",
      "bounds": {"x": 1650, "y": 950, "width": 100, "height": 80},
      "action": "toggle_news_ticker",
      "hover_style": "red_outline",
      "cursor": "pointer",
      "tooltip": "International News Ticker",
      "layer": "desk"
    }
  ]
}
```

---

## 7. Workflow Summary

### Step 1: Generate HQ Background (Sora)
✅ You already have this in the plan

### Step 2: Create Clickable Regions Map
**Option A (Manual):**
1. Open HQ background in Photoshop
2. Use Rectangle Marquee to measure each object
3. Note X, Y, Width, Height for each
4. Manually write JSON file

**Option B (Semi-Automated):**
1. Use the HTML region mapper tool (§4.2)
2. Load HQ background image
3. Click-and-drag to draw rectangles
4. Fill in properties for each region
5. Copy JSON output

### Step 3: Save Regions Map
Save as: `data/ui/hq_clickable_regions.json`

### Step 4: Engine Loads and Uses Map
Engine reads JSON → Creates invisible clickable areas → Handles hover/click

---

## 8. Coordinate Adjustment for Different Resolutions

**Problem:** HQ background is 2048×1152, but game window might be different size (e.g., 1920×1080).

**Solution:** Scale coordinates proportionally.

```typescript
function scaleRegion(region: Region, scaleX: number, scaleY: number): Region {
  return {
    ...region,
    bounds: {
      x: region.bounds.x * scaleX,
      y: region.bounds.y * scaleY,
      width: region.bounds.width * scaleX,
      height: region.bounds.height * scaleY
    }
  };
}

// Usage
const canvasWidth = 1920;
const canvasHeight = 1080;
const scaleX = canvasWidth / 2048;
const scaleY = canvasHeight / 1152;

const scaledRegions = regionsMap.regions.map(r => scaleRegion(r, scaleX, scaleY));
```

---

## 9. Testing Checklist

After creating regions map:

- [ ] All 8 interactive elements have regions defined
- [ ] Hover over each element shows correct cursor
- [ ] Tooltips appear after 0.5s hover
- [ ] Click on each element triggers correct action
- [ ] Red outlines appear on hover (where specified)
- [ ] Disabled elements (telephone) show disabled state
- [ ] Regions don't overlap unintentionally
- [ ] Coordinates scale correctly to different resolutions

---

## 10. Addendum to MVP Implementation Plan

**Add to `IMPLEMENTATION_PLAN_GUI_MVP.md`:**

### Phase 2.5: Create Clickable Regions Map

**Insert after Phase 2 (Post-Process in Photoshop), before Phase 3 (Templates):**

After generating and processing the HQ background image, create the clickable regions map:

1. **Choose method:**
   - Manual (Photoshop + JSON editing) — See CLICKABLE_REGIONS_SPECIFICATION.md §4.1
   - Semi-automated (HTML tool) — See CLICKABLE_REGIONS_SPECIFICATION.md §4.2

2. **Define regions for 8 interactive elements:**
   - National crest (sprite overlay position)
   - Wall map frame
   - Wall calendar frame
   - Red telephone
   - Newspaper
   - Magazine
   - Report stack
   - Transistor radio

3. **Save as:** `data/ui/hq_clickable_regions.json`

4. **Validate:** Open in JSON validator, check all required fields present

**Deliverable:** `hq_clickable_regions.json`

---

**END OF CLICKABLE REGIONS SPECIFICATION**

**Status:** Ready for Use
**Next Step:** After generating HQ background, use this spec to create regions map
