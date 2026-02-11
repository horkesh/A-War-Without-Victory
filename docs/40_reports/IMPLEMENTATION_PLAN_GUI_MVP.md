# GUI Implementation Plan (MVP) — A War Without Victory
**Version:** 1.0 MVP (Minimum Viable Product)
**Date:** 2026-02-05
**Audience:** Non-technical implementer with Sora + Photoshop access
**Purpose:** Step-by-step guide to create AWWV command HQ interface (simplified baseline)

---

## 📋 Table of Contents

1. [Overview & Scope (MVP)](#1-overview--scope-mvp)
2. [Phase 1: Generate Sora Assets (MVP)](#2-phase-1-generate-sora-assets-mvp)
3. [Phase 2: Post-Process in Photoshop](#3-phase-2-post-process-in-photoshop)
4. [Phase 3: Create Photoshop Templates](#4-phase-3-create-photoshop-templates)
5. [Phase 4: Interaction Specifications](#5-phase-4-interaction-specifications)
6. [Phase 5: Organize Asset Delivery](#6-phase-5-organize-asset-delivery)
7. [Quality Checklist](#7-quality-checklist)

---

## 1. Overview & Scope (MVP)

### 1.1 What's in the MVP

**Included:**
- ✅ Single unified HQ background (wall + desk, clean state only)
- ✅ 3 faction crests (RBiH, RS, HRHB) — **only faction-specific element**
- ✅ Generic desk props (newspapers, magazine, reports visible but not faction-specific)
- ✅ Wall calendar (engine-rendered dates)
- ✅ Interactive map with 3 zoom levels
- ✅ All interactive elements with modal/overlay specifications

**Excluded (Future Phases):**
- ❌ Desperation states (ashtrays, coffee cups, wall cracks)
- ❌ Faction-specific headgear
- ❌ Multiple desk prop variants
- ❌ Faction-specific newspapers/magazines (generic placeholders only)

### 1.2 Asset Count (MVP)

| Category | Quantity | Purpose |
|----------|----------|---------|
| HQ Base Plate | 1 image | Unified background with generic props visible |
| National Crests | 3 images | **Only faction-specific visual** — sprite overlays |
| Calendar Template | 1 PSD | Layout for engine-rendered dates |
| Newspaper Template | 1 PSD | Layout for pop-up newspaper modal |
| Magazine Template | 1 PSD | Layout for pop-up magazine modal |
| Report Template | 1 PSD | Layout for pop-up report modal |

**Total: 1 PNG background + 3 PNG crests + 4 PSD templates = 8 core files**

### 1.3 Key Simplifications

1. **Single HQ state** — No desperation variants, just clean baseline
2. **Generic props** — Newspapers/magazines/reports visible on desk but not readable until clicked
3. **Faction ID via crest only** — No headgear, no faction-specific newspapers on desk
4. **Simple interactions** — Click → Modal overlay (no complex animations for MVP)

---

## 2. Phase 1: Generate Sora Assets (MVP)

### 2.1 Asset 1: HQ Base Plate with Generic Props

**Goal:** One unified background showing war room with generic props visible on desk.

#### Sora Prompt for MVP HQ Base Plate

```
ASSET: Command Headquarters Base Plate (MVP)

A photorealistic 2D illustration of a 1990s Bosnian War command headquarters
viewed from a cinematic overhead angle. Camera tilted 35 degrees downward,
positioned 2 meters from desk front edge.

COMPOSITION:

TOP SECTION (Wall, 60% of frame):
- Light grey concrete wall RGB(160, 160, 165), clean surface, NO CRACKS
- Empty metal/wood tactical map frame mounted on wall (no map content inside)
- Blank wooden mounting plaque centered above map frame (for future coat of
  arms sprite overlay, currently empty)
- Empty wooden calendar frame mounted on wall to right of map (no dates/numbers)
- Bright fluorescent ceiling lights, even illumination
- Red "TOP SECRET" stamp near upper left of map frame
- Red "SECRET NOFORN" stamp near lower right of map frame
- Black UTM grid reference numbers along map frame edges

BOTTOM SECTION (Desk, 40% of frame):
- Heavy 1970s socialist-era wooden desk, dark walnut, at 45-degree angle
- Clean desk surface (minimal wear, 1-2 faint coffee ring stains)

DESK OBJECTS (left to right):
1. RED ROTARY TELEPHONE (far left) — 1970s style, coiled cord visible
2. GENERIC NEWSPAPER (left-center) — folded newspaper, BLANK masthead area
   (no text visible), grainy grey placeholder where photo would be, positioned
   at slight angle, aged newsprint color #ebe1cd
3. GENERIC MAGAZINE (center) — glossy vertical magazine, BLANK cover area
   (no text/charts visible), professional blue-grey color #4a5a6a, standing
   upright or at slight angle
4. GENERIC REPORT STACK (right-center) — 3-4 typewritten onionskin pages
   stacked, red "CONFIDENTIAL" stamp visible on top page edge, pages slightly
   fanned so stack is visible
5. SMALL TRANSISTOR RADIO (far right) — 1990s style, antenna extended, no LED

EMPTY SPACES for future overlays:
- Above desk between newspaper and magazine: subtle shadow (future headgear)
- Center-right of desk: subtle shadow (future ashtray)
- Right edge near radio: subtle shadow (future coffee cup)

TECHNICAL REQUIREMENTS:
- Resolution: 2048×1152 pixels (16:9)
- Format: RGB (background, not transparent)
- Perspective: 35° downward tilt, desk at 45° to camera
- Depth of field: Desk sharp focus, wall slightly softer but readable
- Lighting: Bright, even fluorescent
- Color grading: Desaturated, slight blue-grey cast

CRITICAL: Generic props on desk MUST have:
- NO readable text (mastheads, headlines, titles)
- NO specific faction symbols
- BLANK placeholder areas where text/images would appear
- Aged/period-appropriate materials and colors
- Clear boundaries for future click detection

STRICTLY PROHIBITED:
- NO wall cracks
- NO scattered loose papers
- NO map content in frame
- NO calendar dates/numbers
- NO faction coat of arms
- NO headgear, ashtrays, or coffee cups
- NO readable text on any desk prop
- NO game state

STYLE: Photorealistic, 1990s Eastern European office, utilitarian, NATO
tactical command center aesthetic.
```

**Expected Result:** Clean HQ showing empty map frame + generic props on desk (newspaper/magazine/reports visible but not readable).

**Save as:** `hq_base_mvp_v1_sora.png`

---

### 2.2 Asset Set 2: National Crests (3 Images)

**Goal:** Three faction coat of arms on wooden plaques, isolated with transparent backgrounds.

#### Sora Prompt: RBiH Crest

```
ASSET: RBiH National Crest (Coat of Arms)

High-resolution render of the Coat of Arms of Republic of Bosnia and
Herzegovina (1992-1998 version) for game UI overlay.

VISUAL ELEMENTS:
- White heraldic shield with six golden fleur-de-lis (lily symbols) arranged
  in diagonal band from upper left to lower right
- Royal blue background behind shield, RGB(30, 60, 140)
- Subtle gold border around shield edge
- Mounted on dark wooden plaque (oak or walnut finish) with slight 3D depth
- Soft shadow cast by plaque onto background (implies wall mounting)
- Official state symbol style, clean enamel-painted look

TECHNICAL REQUIREMENTS:
- Resolution: 512×512 pixels (square)
- Format: RGBA (transparent background REQUIRED)
- Perspective: Straight-on, centered
- Lighting: Even, neutral (no harsh shadows)
- Style: Professional heraldic illustration

COMPOSITION: Plaque centered with 20-30px margin, transparent background.

STYLE: Official state heraldic art, multiethnic Bosnia symbolism.
```

**Save as:** `crest_rbih_v1_sora.png`

#### Sora Prompt: RS Crest

```
ASSET: RS National Crest (Coat of Arms)

High-resolution render of the Coat of Arms of Republika Srpska (1992 version).

VISUAL ELEMENTS:
- Serbian cross (white) with four Cyrillic "С" letters in each quadrant
- Shield divided into horizontal red/blue/white tricolor stripes
- Double-headed golden eagle above shield
- Ornate heraldic border
- Mounted on dark wooden plaque with slight 3D depth
- Soft shadow cast by plaque

TECHNICAL REQUIREMENTS:
- Resolution: 512×512 pixels
- Format: RGBA (transparent background)
- Perspective: Straight-on, centered
- Lighting: Even, neutral
- Style: Official Serbian royal heraldic style

COMPOSITION: Centered with margin, transparent background.

STYLE: Serbian royal heraldry, official RS state symbol.
```

**Save as:** `crest_rs_v1_sora.png`

#### Sora Prompt: HRHB Crest

```
ASSET: HRHB National Crest (Coat of Arms)

High-resolution render of the Coat of Arms of Croatian Republic of Herzeg-
Bosnia (1992-1994 version).

VISUAL ELEMENTS:
- Red-white checkerboard pattern (šahovnica) — 5×5 grid, red square upper left
- Golden crown above checkerboard
- Royal blue background RGB(30, 70, 130)
- Decorative heraldic border
- Mounted on dark wooden plaque with slight 3D depth
- Soft shadow

TECHNICAL REQUIREMENTS:
- Resolution: 512×512 pixels
- Format: RGBA (transparent background)
- Perspective: Straight-on, centered
- Lighting: Even, neutral
- Style: Official Croatian heraldic style

COMPOSITION: Centered with margin, transparent background.

STYLE: Croatian heraldic art, official HRHB state symbol.
```

**Save as:** `crest_hrhb_v1_sora.png`

---

### 2.3 Phase 1 MVP Summary Checklist

After Sora generation:

- [ ] `hq_base_mvp_v1_sora.png` (2048×1152 RGB) — HQ with generic props
- [ ] `crest_rbih_v1_sora.png` (512×512 RGBA)
- [ ] `crest_rs_v1_sora.png` (512×512 RGBA)
- [ ] `crest_hrhb_v1_sora.png` (512×512 RGBA)

**Total: 4 Sora images for MVP**

---

## 3. Phase 2: Post-Process in Photoshop

### 3.1 HQ Base Plate (Quality Check Only)

**Goal:** Verify base plate is clean, no post-processing needed unless Sora added prohibited elements.

**Steps:**
1. Open `hq_base_mvp_v1_sora.png` in Photoshop
2. Verify dimensions: 2048×1152
3. Verify RGB mode (no alpha)
4. Check that generic props are visible but have NO readable text
5. Check NO cracks, NO map content, NO calendar dates
6. If clean: Export as `hq_background_mvp.png` (final name)
7. If Sora added errors: Use healing brush to remove, then export

**Deliverable:** `hq_background_mvp.png` (2048×1152 RGB)

---

### 3.2 National Crests (Background Removal)

**For each of the 3 crests:**

**Steps:**
1. Open Sora image in Photoshop
2. Check if background already transparent (checkerboard visible)
3. If not: Select → Subject → Layer → New → Layer via Copy → Delete background
4. Select → Select and Mask:
   - Radius: 0.5px
   - Feather: 0.5px
   - Shift Edge: -10%
5. Add drop shadow (optional):
   - Opacity: 30%, Angle: 120°, Distance: 2px, Size: 3px
6. Image → Canvas Size → 512×512 (center)
7. File → Export → Export As:
   - Format: PNG
   - Transparency: ON
   - Quality: 100%
8. Save as:
   - `rbih_crest.png` (final)
   - `rs_crest.png` (final)
   - `hrhb_crest.png` (final)
9. Save PSD: `crest_[faction]_v1.psd`

**Deliverables:**
- `rbih_crest.png` (512×512 RGBA)
- `rs_crest.png` (512×512 RGBA)
- `hrhb_crest.png` (512×512 RGBA)

---

## 4. Phase 3: Create Photoshop Templates

### 4.1 Template 1: Wall Calendar Grid

**Purpose:** Layout structure for engine to render month/year/dates/week highlight.

**Steps:**

1. **Create document:**
   - Width: 200px, Height: 280px, 72 ppi, RGB, White background
   - Name: `calendar_template`

2. **Background layer:**
   - Rename to "background"
   - Fill: `#f4e8d8` (aged paper cream)
   - Filter → Noise → Add Noise (2%, Gaussian, Monochromatic)
   - Filter → Blur → Gaussian Blur (0.3px)

3. **Create grid (reference guides):**
   - New layer: "grid_reference"
   - Line Tool: 0.5px grey `rgb(200, 200, 200)`
   - Draw 7 columns × 6 rows:
     - Column width: 26px
     - Row height: 30px
     - Origin: (20px, 70px)

4. **Add annotation:**
   - Text layer: "INSTRUCTIONS"
   - Font: Arial 8px
   - Content:
     ```
     CALENDAR TEMPLATE — MVP v1.0
     Engine renders: month name, year, day numbers, week highlight
     Export: calendar_background.png (background only)
     Grid: reference only, not exported
     ```

5. **Save and export:**
   - Save as: `calendar_template_mvp.psd`
   - Hide instruction/grid layers
   - Export background: `calendar_background.png` (200×280 RGB)

**Deliverables:**
- `calendar_template_mvp.psd`
- `calendar_background.png` (200×280 RGB)

---

### 4.2 Template 2: Newspaper Modal Overlay

**Purpose:** Full-screen overlay showing faction-specific newspaper when desk newspaper is clicked.

**Steps:**

1. **Create document:**
   - Width: 1200px, Height: 1600px (readable newspaper size for modal)
   - 72 ppi, RGB, White
   - Name: `newspaper_modal_template`

2. **Background:**
   - Fill: `#ebe1cd` (yellowed newsprint)
   - Add texture: Noise 3% + Blur 0.5px

3. **Content guides (red rectangles, reference):**

   | Area | X | Y | Width | Height | Label |
   |------|---|---|-------|--------|-------|
   | Masthead | 80 | 50 | 1040 | 60 | masthead_area |
   | Date | 1000 | 50 | 120 | 30 | date_area |
   | Headline | 80 | 140 | 1040 | 120 | headline_area |
   | Subhead | 80 | 280 | 1040 | 60 | subhead_area |
   | Photo | 80 | 370 | 600 | 450 | photo_area |
   | Caption | 80 | 840 | 600 | 40 | photo_caption |
   | Column 1 | 80 | 900 | 330 | 680 | body_col_1 |
   | Column 2 | 430 | 370 | 330 | 1210 | body_col_2 |
   | Column 3 | 780 | 370 | 330 | 1210 | body_col_3 |

4. **Typography guide (text layer):**
   ```
   NEWSPAPER MODAL — MVP v1.0

   Typography:
   - Masthead: Franklin Gothic Bold, 48px, center, black
     (RBiH: "OSLOBOĐENJE" / RS: "GLAS SRPSKE" / HRHB: "CROATIAN HERALD")
   - Date: Times New Roman, 18px, right, black
   - Headline: Franklin Gothic Condensed Bold, 54px, center, black
   - Subhead: Times New Roman Italic, 24px, center, black
   - Body: Times New Roman, 14px, justify, black, line-height 1.4
   - Caption: Times New Roman Italic, 13px, left, grey(60,60,60)

   Content: T-1 turn events (yesterday's news)
   ```

5. **Save and export:**
   - Save: `newspaper_modal_template_mvp.psd`
   - Export background: `newspaper_modal_bg.png` (1200×1600 RGB)

**Deliverables:**
- `newspaper_modal_template_mvp.psd`
- `newspaper_modal_bg.png` (1200×1600 RGB)

---

### 4.3 Template 3: Magazine Modal Overlay

**Purpose:** Full-screen overlay showing monthly statistics magazine.

**Steps:**

1. **Create document:**
   - Width: 900px, Height: 1200px (A4 proportions, magazine size)
   - 72 ppi, RGB
   - Name: `magazine_modal_template`

2. **Background:**
   - Blue-grey gradient: `#3a4a5a` (top) to `#5a6a7a` (bottom)

3. **Content guides:**

   | Area | X | Y | Width | Height | Label |
   |------|---|---|-------|--------|-------|
   | Title | 80 | 60 | 740 | 80 | title_area |
   | Month/Year | 80 | 160 | 740 | 60 | month_year_area |
   | Map preview | 150 | 250 | 600 | 450 | map_preview |
   | Stat box 1 | 120 | 750 | 210 | 180 | stat_box_1 |
   | Stat box 2 | 345 | 750 | 210 | 180 | stat_box_2 |
   | Stat box 3 | 570 | 750 | 210 | 180 | stat_box_3 |
   | TOC | 80 | 980 | 740 | 180 | toc_area |

4. **Typography guide:**
   ```
   MAGAZINE MODAL — MVP v1.0

   Typography:
   - Title: Arial Bold, 42px, center, white, uppercase
     ("MONTHLY OPERATIONAL REVIEW")
   - Month/Year: Arial Bold, 36px, center, white
     (e.g., "MAY 1992")
   - Stat labels: Arial Bold, 16px, center, dark grey, uppercase
   - Stat values: Arial Bold, 54px, center, black

   Content: Monthly aggregate data (4 turns = 1 month)
   ```

5. **Save and export:**
   - Save: `magazine_modal_template_mvp.psd`
   - Export: `magazine_modal_bg.png` (900×1200 RGB)

**Deliverables:**
- `magazine_modal_template_mvp.psd`
- `magazine_modal_bg.png` (900×1200 RGB)

---

### 4.4 Template 4: Situation Report Modal

**Purpose:** Overlay showing typed situation report from corps commanders.

**Steps:**

1. **Create document:**
   - Width: 1000px, Height: 1400px
   - 72 ppi, RGB
   - Name: `report_modal_template`

2. **Background:**
   - Semi-transparent onionskin: `rgba(240, 235, 220, 0.95)`
   - Add texture: Noise 2% + Blur 0.3px

3. **Content guides:**

   | Area | X | Y | Width | Height | Label |
   |------|---|---|-------|--------|-------|
   | From field | 150 | 80 | 700 | 30 | from_field |
   | To field | 150 | 120 | 700 | 30 | to_field |
   | Date field | 150 | 160 | 700 | 30 | date_field |
   | Subject field | 150 | 200 | 700 | 30 | subject_field |
   | Body area | 100 | 280 | 800 | 1000 | body_area |
   | Signature | 600 | 1300 | 300 | 80 | signature_area |

4. **Add stamps (text, red):**
   - Font: Arial Bold, 18px, red `rgb(200, 20, 20)`
   - "RESTRICTED" at (80, 50)
   - "CONFIDENTIAL" at (800, 1360)

5. **Typography guide:**
   ```
   REPORT MODAL — MVP v1.0

   Typography:
   - Headers: Courier New Bold, 16px, black
     (FROM: / TO: / DATE: / SUBJECT:)
   - Body: Courier New, 15px, left, black, line-height 1.6
   - Signature: Courier New, 15px, right, black

   Content: Situation reports from corps (T-1 to T-2 delay)
   ```

6. **Save and export:**
   - Save: `report_modal_template_mvp.psd`
   - Export: `report_modal_bg.png` (1000×1400 RGBA with transparency)

**Deliverables:**
- `report_modal_template_mvp.psd`
- `report_modal_bg.png` (1000×1400 RGBA)

---

### 4.5 Phase 3 Summary Checklist

After creating templates:

**PSD source files:**
- [ ] `calendar_template_mvp.psd`
- [ ] `newspaper_modal_template_mvp.psd`
- [ ] `magazine_modal_template_mvp.psd`
- [ ] `report_modal_template_mvp.psd`

**Exported backgrounds:**
- [ ] `calendar_background.png` (200×280 RGB)
- [ ] `newspaper_modal_bg.png` (1200×1600 RGB)
- [ ] `magazine_modal_bg.png` (900×1200 RGB)
- [ ] `report_modal_bg.png` (1000×1400 RGBA)

**Total: 4 PSDs + 4 PNGs = 8 files**

---

## 5. Phase 4: Interaction Specifications

### 5.1 Overview: Interactive Elements

**Wall Section:**
- National Crest → Opens Faction Overview Panel
- Wall Map → Zoom controls (3 levels)
- Wall Calendar → Advances turn

**Desk Section:**
- Red Telephone → Opens Diplomacy Panel (Phase II+, disabled in MVP)
- Newspaper → Opens Newspaper Modal (full-screen overlay)
- Magazine → Opens Magazine Modal (full-screen overlay)
- Reports → Opens Report Modal (full-screen overlay)
- Transistor Radio → Opens News Ticker Overlay

---

### 5.2 Interaction 1: Wall Map → War Planning Map (separate GUI system)

**Implemented behaviour:** Clicking the wall map opens the **War Planning Map**, which is a **separate GUI system** (not merely an overlay). It is currently presented as a full-screen layer from the warroom (it does not cycle zoom on the wall). The three zoom levels (Strategic → Operational → Tactical) apply inside the War Planning Map. The War Planning Map has a map-like frame (border and corner marks), closes via [X] or ESC (and optionally by clicking the dimmed backdrop “Back to HQ”), and includes a **side panel** with layer toggles: Political control and Contested outline (now); Order of Battle, population by ethnicity, and displacement (placeholders for Phase II).

#### Zoom Level 0: Strategic Overview (Default)

**View:**
- Entire Bosnia-Herzegovina visible
- Settlement-level political control polygons rendered
- Faction colors: RBiH green, RS red, HRHB blue
- Major cities labeled with stencil capitals
- Rivers, major roads visible
- No brigade/corps details visible

**Interaction:**
- **Click map** → Zoom to Level 1 (cursor shows magnifying glass +)
- **Hover settlements** → Tooltip shows: settlement name, controller faction, population
- **Click settlement** → Select settlement, highlight border (no zoom change)

**Canvas Render:**
```typescript
// Map fills empty frame area: ~1200×800px region
drawMapLevel0(gameState) {
  // Draw settlement polygons with faction colors
  for (settlement in settlements) {
    fill = FACTION_COLORS[settlement.controller]; // green/red/blue
    drawPolygon(settlement.geometry, fill, opacity=0.65);
    drawBorder(settlement.geometry, 'rgba(0,0,0,0.2)', width=0.5);
  }

  // Draw major cities
  drawCityLabels(MAJOR_CITIES, font='12px Stencil', color='black');

  // Draw rivers (blue)
  drawRivers(OSM_WATERWAYS, 'rgba(30, 100, 180, 0.4)', width=1);
}
```

**Visual Treatment:**
- Solid color fills for controlled settlements (no hatching at this level)
- Clean NATO tactical map aesthetic
- Topographic base layer (brown contour lines optional for MVP)

---

#### Zoom Level 1: Operational Theater

**View:**
- Zoomed to clicked region (~400km² area)
- Corps boundaries visible (thick dashed lines)
- Brigade areas of responsibility (AoR) outlined
- Settlement names visible for all settlements in view
- Front segments highlighted (thicker lines between opposing sides)

**Interaction:**
- **Click map again** → Zoom to Level 2
- **Right-click or ESC** → Zoom out to Level 0
- **Hover brigade AoR** → Tooltip shows: brigade name, parent corps, exhaustion %
- **Click brigade AoR** → Select brigade, show info sidebar (no zoom change)

**Canvas Render:**
```typescript
drawMapLevel1(gameState, zoomCenter) {
  // Calculate zoom bounds
  const bounds = calculateBounds(zoomCenter, zoomScale=2.5);

  // Draw settlements (same as Level 0 but larger scale)
  drawSettlements(bounds);

  // Draw corps boundaries (thick dashed lines)
  for (corps in gameState.corps) {
    drawCorpsBoundary(corps, 'rgba(0,0,0,0.8)', dash=[10,5], width=3);
  }

  // Draw brigade AoRs (thinner outlines)
  for (brigade in gameState.brigades) {
    drawBrigadeAoR(brigade, 'rgba(0,0,0,0.5)', dash=[5,3], width=1.5);
  }

  // Draw front segments (opposing AoR contacts)
  drawFrontSegments(gameState.front_segments, 'rgba(200,20,20,0.9)', width=4);

  // Draw settlement names
  drawSettlementLabels(visibleSettlements, font='10px Arial', color='black');
}
```

**Visual Treatment:**
- Corps boundaries: Black dashed lines (10px dash, 5px gap)
- Brigade AoRs: Lighter dashed lines (5px dash, 3px gap)
- Front segments: Thick red lines where opposing forces meet

---

#### Zoom Level 2: Tactical Detail

**View:**
- Maximum zoom (~100km² area)
- Individual settlement polygons large and clear
- Brigade unit symbols visible (NATO APP-6 style)
- Settlement names labeled clearly
- Roads visible (if OSM data integrated)
- Pressure indicators visible (if Phase 3 implemented)

**Interaction:**
- **Right-click or ESC** → Zoom out to Level 1
- **Click settlement** → Opens Settlement Info Panel (modal overlay)
- **Hover unit symbol** → Tooltip shows: unit name, strength, exhaustion

**Canvas Render:**
```typescript
drawMapLevel2(gameState, zoomCenter) {
  const bounds = calculateBounds(zoomCenter, zoomScale=5);

  // Draw settlement polygons (large, detailed)
  drawSettlements(bounds);

  // Draw roads
  drawRoads(OSM_ROADS, 'rgba(80,80,80,0.6)', width=2);

  // Draw brigade unit symbols (NATO style)
  for (brigade in visibleBrigades) {
    const position = getBrigadeHQPosition(brigade);
    drawUnitSymbol(position, brigade.type, brigade.faction, size=40);
  }

  // Draw settlement labels (larger)
  drawSettlementLabels(visibleSettlements, font='14px Arial', color='black');

  // Draw pressure edges (if Phase 3 active)
  if (gameState.phase >= 3) {
    drawPressureIndicators(gameState.front_pressure);
  }
}
```

**Visual Treatment:**
- Unit symbols: NATO APP-6 standard (rectangles for infantry, diamonds for armor, etc.)
- Symbol size: 40×40px
- Labels: Larger font (14px) for readability

---

#### Zoom Controls UI

**Visual Design:**
- Zoom level indicator: "STRATEGIC / OPERATIONAL / TACTICAL"
- Displayed as pill/badge in top-right of map frame
- Font: Arial Bold, 10px, white text on semi-transparent black `rgba(0,0,0,0.7)`

**Button controls (optional, click map is primary):**
- Small [+] and [-] buttons in bottom-right of map
- Click [+] → zoom in one level
- Click [-] → zoom out one level

**Keyboard shortcuts:**
- `+` or `=` → Zoom in
- `-` or `_` → Zoom out
- `0` → Reset to Strategic (Level 0)
- `ESC` → Zoom out one level

---

### 5.3 Interaction 2: National Crest → Faction Overview Panel

**Trigger:** Click national crest above map

**Effect:** Semi-transparent modal overlay appears centered on screen.

**Panel Design:**

```
┌────────────────────────────────────────────┐
│  [Crest]  REPUBLIC OF BOSNIA-HERZEGOVINA  │ ← Header (15%)
│           Week 23, June 1992            [X]│
├────────────────────────────────────────────┤
│                                            │
│  ┌──────────────┐  ┌──────────────┐       │
│  │  TERRITORY   │  │   MILITARY   │       │ ← Top quadrants
│  │ 523 / 1,000  │  │  145,000 ppl │       │
│  │   52.3%      │  │ Exhaustion:  │       │
│  │              │  │   45% (Med)  │       │
│  └──────────────┘  └──────────────┘       │
│                                            │
│  ┌──────────────┐  ┌──────────────┐       │
│  │  AUTHORITY   │  │ POPULATION   │       │ ← Bottom quadrants
│  │ Central: 0.68│  │ Under Ctrl:  │       │
│  │ (Contested)  │  │   2.1M       │       │
│  │ Fragmented:  │  │ Displaced:   │       │
│  │   12 muns    │  │   380K total │       │
│  └──────────────┘  └──────────────┘       │
│                                            │
├────────────────────────────────────────────┤
│  ⚠ STRATEGIC WARNINGS                      │ ← Bottom (25%)
│  • Brčko Corridor at risk — VRS 5km away  │
│  • Exhaustion critical in 1st Corps       │
│  • Supply corridor to Goražde severed     │
└────────────────────────────────────────────┘
```

**Specifications:**
- **Dimensions:** 800×600px
- **Background:** `rgba(40, 40, 40, 0.85)` (dark grey, semi-transparent)
- **Border:** 2px solid white
- **Position:** Centered on screen
- **Close:** Click [X], click outside panel, or press ESC

**Data Sources:**
```typescript
interface FactionSnapshot {
  territory: {
    settlementsControlled: number;
    settlementsTotal: number;
    territoryPercent: number;
    changeThisTurn: number;
  };
  military: {
    personnel: number;
    exhaustion: number; // 0-100
    supplyDays: number;
  };
  authority: {
    centralAuthority: number; // 0-1
    fragmentedMunicipalities: number;
  };
  population: {
    underControl: number;
    totalDisplaced: number;
  };
}
```

---

### 5.4 Interaction 3: Wall Calendar → Advance Turn

**Trigger:** Click wall calendar

**Effect:**
1. **Confirmation modal** appears (optional, can be disabled in settings):
   ```
   ┌─────────────────────────────────┐
   │  ADVANCE TO NEXT TURN?          │
   │                                 │
   │  Current: Week 23, June 1992    │
   │  Next: Week 24, June 1992       │
   │                                 │
   │  [Cancel]      [Advance Turn]   │
   └─────────────────────────────────┘
   ```

2. **If confirmed:** "Processing Turn..." indicator appears below calendar

3. **Game engine executes turn pipeline:**
   - Update control zones (settlements may flip)
   - Calculate exhaustion, supply, authority
   - Generate displacement flows
   - Increment turn counter

4. **UI updates:**
   - Calendar re-renders with new week highlighted
   - Map re-renders with new control state
   - Newspaper content updates (T-1 events now available)

**Visual Feedback:**
- Calendar shows "page tear" animation (optional polish)
- Loading spinner during turn processing (0.5-2s)
- Brief fade transition on map (0.3s)

**Keyboard Shortcut:** `SPACE` or `ENTER` advances turn

---

### 5.5 Interaction 4: Newspaper → Full-Screen Modal

**Trigger:** Click newspaper on desk

**Effect:** Full-screen modal overlay appears with faction-specific newspaper content.

**Modal Design:**

```
┌──────────────────────────────────────────────┐
│ [Dark semi-transparent backdrop]             │
│                                              │
│   ┌────────────────────────────────┐        │
│   │      OSLOBOĐENJE               │ [X]    │ ← Masthead (faction-specific)
│   │      23 June 1992              │        │ ← Date (T-1)
│   │                                │        │
│   │  VRS ADVANCES ON BRČKO         │        │ ← Headline
│   │  Corridor under threat...      │        │ ← Subhead
│   │                                │        │
│   │  [Photo: grainy B&W halftone]  │        │ ← Lead photo
│   │  Caption: VRS forces...        │        │
│   │                                │        │
│   │  [Body text in 3 columns]      │        │ ← Body content
│   │  Lorem ipsum dolor...          │        │
│   │                                │        │
│   └────────────────────────────────┘        │
│                                              │
└──────────────────────────────────────────────┘
```

**Specifications:**
- **Backdrop:** `rgba(0, 0, 0, 0.85)` (dark overlay covering entire screen)
- **Newspaper size:** 1200×1600px (readable size)
- **Position:** Centered on screen with 50px margin
- **Content:** Renders using `newspaper_modal_template_mvp.psd` structure
- **Masthead:**
  - RBiH: "OSLOBOĐENJE"
  - RS: "GLAS SRPSKE"
  - HRHB: "CROATIAN HERALD"
- **Date:** Current turn - 1 (yesterday's news)
- **Close:** Click [X], click backdrop, or press ESC

**Content Generation:**
```typescript
generateNewspaper(gameState, faction) {
  const previousTurn = gameState.turn - 1;
  const events = extractEvents(gameState.turnLog, previousTurn);
  const topEvents = rankEvents(events).slice(0, 5);

  return {
    faction,
    masthead: MASTHEAD_NAMES[faction],
    date: turnToDate(previousTurn),
    headline: generateHeadline(topEvents[0]),
    subhead: generateSubhead(topEvents[0]),
    leadStory: generateStory(topEvents.slice(0, 3)),
    photo: generateNewsPhoto(topEvents[0]),
    photoCaption: generateCaption(topEvents[0])
  };
}
```

**Visual Treatment:**
- Halftone effect on photos (simulates newspaper printing)
- Justified text in columns
- Aged newsprint background texture
- Period-appropriate typography (Franklin Gothic, Times New Roman)

---

### 5.6 Interaction 5: Magazine → Full-Screen Modal

**Trigger:** Click magazine on desk

**Effect:** Full-screen modal overlay with monthly statistics magazine cover.

**Modal Design:**

```
┌──────────────────────────────────────────────┐
│ [Dark backdrop]                              │
│                                              │
│   ┌────────────────────────────────┐        │
│   │ MONTHLY OPERATIONAL REVIEW     │ [X]    │ ← Title
│   │        MAY 1992                │        │ ← Month/Year
│   │                                │        │
│   │  [Small map snapshot]          │        │ ← Control map preview
│   │                                │        │
│   │  ┌─────┐  ┌─────┐  ┌─────┐    │        │
│   │  │+15  │  │ 45% │  │380K │    │        │ ← Statistics
│   │  │SETT │  │EXHT │  │DISP │    │        │
│   │  └─────┘  └─────┘  └─────┘    │        │
│   │                                │        │
│   │  INSIDE:                       │        │ ← TOC
│   │  • Corps Performance Review    │        │
│   │  • Supply Analysis            │        │
│   │  • Territorial Changes        │        │
│   └────────────────────────────────┘        │
│                                              │
└──────────────────────────────────────────────┘
```

**Specifications:**
- **Backdrop:** `rgba(0, 0, 0, 0.85)`
- **Magazine size:** 900×1200px
- **Position:** Centered with margin
- **Content:** Monthly aggregate data (4 turns = 1 month)
- **Map preview:** Small control map showing territorial changes
- **Close:** Click [X], backdrop, or ESC

**Content Generation:**
```typescript
generateMagazine(gameState) {
  const currentMonth = Math.floor(gameState.turn / 4);
  const monthData = aggregateMonthData(gameState, currentMonth);

  return {
    title: "MONTHLY OPERATIONAL REVIEW",
    monthYear: turnToMonthYear(gameState.turn),
    mapSnapshot: generateControlMapSnapshot(monthData),
    statistics: {
      settlementsGained: monthData.territoryChange,
      exhaustionPercent: monthData.avgExhaustion,
      displacedTotal: monthData.totalDisplaced
    },
    tableOfContents: [
      "Corps Performance Review",
      "Supply Analysis",
      "Territorial Changes",
      "Population Displacement Trends"
    ]
  };
}
```

---

### 5.7 Interaction 6: Reports → Full-Screen Modal

**Trigger:** Click situation report stack on desk

**Effect:** Full-screen modal showing typed military situation report.

**Modal Design:**

```
┌──────────────────────────────────────────────┐
│ [Dark backdrop]                              │
│                                              │
│   ┌────────────────────────────────┐        │
│   │  RESTRICTED                    │ [X]    │
│   │                                │        │
│   │  FROM: 1st Corps Commander     │        │
│   │  TO: Chief of General Staff    │        │
│   │  DATE: 22 June 1992            │        │
│   │  SUBJECT: Situation Report     │        │
│   │                                │        │
│   │  Current tactical situation... │        │ ← Body (Courier New monospace)
│   │  [Typewritten text content]    │        │
│   │                                │        │
│   │  Supply status critical in...  │        │
│   │                                │        │
│   │  Request immediate...          │        │
│   │                                │        │
│   │              Signed,           │        │
│   │              Commander 1st Corps│        │
│   │                                │        │
│   │  CONFIDENTIAL                  │        │
│   └────────────────────────────────┘        │
│                                              │
└──────────────────────────────────────────────┘
```

**Specifications:**
- **Backdrop:** `rgba(0, 0, 0, 0.85)`
- **Report size:** 1000×1400px (memo page proportions)
- **Background:** Onionskin texture with transparency
- **Font:** Courier New (typewriter effect)
- **Classification stamps:** Red "RESTRICTED" and "CONFIDENTIAL"
- **Content:** T-1 to T-2 delay (field reports lag by 1-2 turns)
- **Close:** Click [X], backdrop, or ESC

**Content Generation:**
```typescript
generateSituationReport(gameState, corpsId) {
  const reportTurn = gameState.turn - 1; // 1 turn delay
  const corpsData = getCorpsData(gameState, corpsId, reportTurn);

  return {
    from: `${corpsData.name} Commander`,
    to: "Chief of General Staff",
    date: turnToDate(reportTurn),
    subject: "Situation Report",
    body: generateReportBody(corpsData),
    signature: `Commander, ${corpsData.name}`,
    classification: corpsData.sensitive ? "CONFIDENTIAL" : "RESTRICTED"
  };
}
```

---

### 5.8 Interaction 7: Transistor Radio → News Ticker Overlay

**Trigger:** Click transistor radio on desk

**Effect:** News ticker overlay appears at bottom of screen, scrolling international/regional news.

**Ticker Design:**

```
┌────────────────────────────────────────────────────────────┐
│  [Full HQ background remains visible]                      │
│                                                            │
│                                                            │
│  [Map and desk visible as normal]                         │
│                                                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
  ▼ ▼ ▼ News ticker appears here ▼ ▼ ▼
┌────────────────────────────────────────────────────────────┐
│ 🔴 LIVE  UN Security Council debates intervention...       │ ← Scrolling text
│          EC recognizes BiH independence... NATO considers  │
│          air strikes... International aid convoy arrives...│
└────────────────────────────────────────────────────────────┘
```

**Specifications:**
- **Position:** Bottom edge of screen, 60px tall
- **Background:** `rgba(20, 20, 20, 0.9)` (dark semi-transparent bar)
- **Text color:** White
- **Font:** Arial, 16px
- **Animation:** Scroll right-to-left continuously
- **Speed:** ~100px per second
- **Content:** Mix of T (breaking) and T-7 (week-old international news)
- **Close:** Click radio again (toggle), or click [X] on ticker

**Content Generation:**
```typescript
generateNewsTicker(gameState) {
  const recentEvents = getInternationalEvents(gameState.turn - 7, gameState.turn);
  const headlines = recentEvents.map(event => generateTickerHeadline(event));

  return {
    headlines: headlines.join(' ... '),
    speed: 100, // pixels per second
    loop: true
  };
}
```

**Visual Treatment:**
- Red "🔴 LIVE" indicator on left
- Scrolling text loops continuously
- Click anywhere on ticker to pause/resume
- Ticker remains visible until toggled off

---

### 5.9 Phase 4 Summary: Interactive Elements

| Element | Trigger | Effect | Content Source |
|---------|---------|--------|----------------|
| **National Crest** | Click | Faction Overview Panel (modal) | Current turn snapshot |
| **Wall Map** | Click | Zoom through 3 levels (Strategic → Operational → Tactical) | Settlement control + formations |
| **Wall Calendar** | Click | Advance Turn (with confirmation) | Turn pipeline execution |
| **Newspaper** | Click | Full-screen newspaper modal | T-1 events (yesterday's news) |
| **Magazine** | Click | Full-screen magazine modal | Monthly aggregate (4 turns) |
| **Reports** | Click | Full-screen report modal | Corps reports (T-1 to T-2 lag) |
| **Radio** | Click | Bottom ticker overlay (toggle) | International news (T to T-7) |

---

## 6. Phase 5: Organize Asset Delivery

### 6.1 Final MVP Folder Structure

```
AWWV_UI_Assets_MVP/
├── hq_backgrounds/
│   └── hq_background_mvp.png                    (2048×1152 RGB)
│
├── crests/
│   ├── rbih_crest.png                           (512×512 RGBA)
│   ├── rs_crest.png                             (512×512 RGBA)
│   └── hrhb_crest.png                           (512×512 RGBA)
│
├── templates/
│   ├── calendar_template_mvp.psd
│   ├── calendar_background.png                  (200×280 RGB)
│   ├── newspaper_modal_template_mvp.psd
│   ├── newspaper_modal_bg.png                   (1200×1600 RGB)
│   ├── magazine_modal_template_mvp.psd
│   ├── magazine_modal_bg.png                    (900×1200 RGB)
│   ├── report_modal_template_mvp.psd
│   └── report_modal_bg.png                      (1000×1400 RGBA)
│
├── interaction_specs/
│   └── UI_INTERACTION_SPECIFICATION.md          (this document, §5)
│
└── sources/
    ├── sora_originals/
    │   ├── hq_base_mvp_v1_sora.png
    │   ├── crest_rbih_v1_sora.png
    │   ├── crest_rs_v1_sora.png
    │   └── crest_hrhb_v1_sora.png
    │
    └── psd_sources/
        ├── crest_rbih_v1.psd
        ├── crest_rs_v1.psd
        └── crest_hrhb_v1.psd
```

### 6.2 File Count (MVP)

**Final deliverables:**
- 1 HQ background
- 3 crests
- 4 PSD templates
- 4 template backgrounds
- 1 interaction specification document

**Total: 13 files**

---

## 7. Quality Checklist

### 7.1 HQ Background MVP

- [ ] Dimensions: 2048×1152 pixels
- [ ] Format: PNG RGB (no alpha)
- [ ] Generic props visible (newspaper, magazine, reports, radio, phone)
- [ ] NO readable text on any desk prop
- [ ] NO faction-specific symbols (except empty crest plaque)
- [ ] NO wall cracks
- [ ] NO map content in frame
- [ ] NO calendar dates/numbers
- [ ] Clean desk surface (1-2 coffee rings acceptable)

### 7.2 National Crests (all 3)

- [ ] Dimensions: 512×512 pixels each
- [ ] Format: PNG RGBA (transparent backgrounds)
- [ ] Crests centered with margin
- [ ] Clean edges, no white halo
- [ ] Alpha channel smooth (not binary)
- [ ] Period-accurate heraldic designs

### 7.3 Templates (all 4)

- [ ] PSD files open without errors
- [ ] Layers organized and labeled
- [ ] Background textures clean
- [ ] Reference guides clearly marked (red rectangles)
- [ ] Typography specs documented in file
- [ ] Exported backgrounds match dimensions

### 7.4 Interaction Specifications

- [ ] All 7 interactive elements documented
- [ ] Map zoom levels (3) fully specified
- [ ] Modal overlay designs specified
- [ ] Content generation logic outlined
- [ ] Keyboard shortcuts documented
- [ ] Close/escape behaviors defined

---

## 8. Success Criteria

MVP is complete when:

1. ✅ All 13 MVP files exist and pass quality checks
2. ✅ HQ background shows generic props (no faction specifics except crest)
3. ✅ All 3 faction crests have clean transparent backgrounds
4. ✅ All 4 templates have clear layout guides
5. ✅ Interaction specifications document all 7 interactive elements
6. ✅ Map zoom system (3 levels) fully specified
7. ✅ All modal overlays designed and specified
8. ✅ NO desperation states included (simplified MVP)

---

## 9. What's Next (Post-MVP)

**Future phases will add:**
- Desperation system (wall cracks, ashtray/coffee states, paper scatter)
- Faction-specific headgear on desk
- Faction-specific desk newspapers (before click)
- Multiple HQ background variants
- Animation polish (page tear, fade transitions)
- Sound effects (radio static, paper rustle)

**But for now:** Focus on getting the clean MVP working with basic interactions.

---

**END OF MVP IMPLEMENTATION PLAN**

**Status:** Ready for Execution
**Estimated Time:** 6-8 working hours
**Next Step:** Begin Phase 1 (Generate 4 Sora images)
