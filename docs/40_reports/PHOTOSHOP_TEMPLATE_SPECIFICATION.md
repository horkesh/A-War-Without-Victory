# Photoshop Template Specification — A War Without Victory
**Version:** v1.0
**Date:** 2026-02-03
**Status:** Layout Structures for Content Projection
**Purpose:** Define fixed templates that engine fills with dynamic content

---

## 1. Core Principle

**Photoshop creates STRUCTURE, engine provides CONTENT.**

Templates define layout grids, typographic styles, and content slots. Game engine renders text, images, and data into slots at runtime based on game state.

---

## 2. Template Hierarchy

| Template | Purpose | Update Frequency | Content Source |
|----------|---------|------------------|----------------|
| **Calendar Grid** | Monthly calendar layout | Never (fixed structure) | Engine renders dates + week marker from turn state |
| **Newspaper Layout** | News article grid (3-column) | Never (fixed structure) | Engine renders headlines/text from T-1 events |
| **Magazine Layout** | Monthly stats report | Never (fixed structure) | Engine renders charts/data from T-4 to T-1 aggregate |
| **Report Layout** | Situation report memo format | Never (fixed structure) | Engine renders typed text from corps reports |

---

## 3. Template 1: Wall Calendar Grid

### 3.1 File Structure

**Source:** `calendar_template.psd`
**Exports:**
- `calendar_background.png` (200×280 RGB) — Aged paper texture only
- `calendar_grid_overlay.svg` (vector) — Grid lines for engine to use as guides

### 3.2 Layout Specifications

**Dimensions:** 200×280px (vertical orientation)

**Layer Structure:**
```
calendar_template.psd
├── background (layer)
│   └── Aged paper texture (#f4e8d8 cream/beige)
├── grid (layer, export as SVG)
│   ├── 7 columns × 6 rows
│   ├── Column width: 26px
│   ├── Row height: 30px
│   ├── Grid origin: (20px, 70px)
│   └── Line color: rgb(200, 200, 200), 0.5px thin
├── day_headers (reference layer, NOT exported)
│   └── M T W T F S S (centered in columns)
├── month_area (reference rectangle, NOT exported)
│   └── (20px, 15px, 160px, 25px)
└── year_area (reference rectangle, NOT exported)
    └── (20px, 40px, 160px, 20px)
```

**Typography Guidelines** (for engine rendering):
```css
.calendar-month {
  font-family: 'Arial', sans-serif;
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  color: rgb(30, 30, 30);
  text-transform: uppercase;
}

.calendar-year {
  font-family: 'Arial', sans-serif;
  font-size: 14px;
  font-weight: bold;
  text-align: center;
  color: rgb(30, 30, 30);
}

.calendar-day-header {
  font-family: 'Arial', sans-serif;
  font-size: 10px;
  text-align: center;
  color: rgb(60, 60, 60);
}

.calendar-day-number {
  font-family: 'Arial', sans-serif;
  font-size: 12px;
  text-align: center;
  color: rgb(30, 30, 30);
}

.calendar-week-highlight {
  stroke: rgb(200, 20, 20);
  stroke-width: 2px;
  fill: none;
}
```

### 3.3 Content Slots

| Slot | Position | Dimensions | Content Type | Rendered By |
|------|----------|------------|--------------|-------------|
| Month name | (100, 30) | 160×25 | Text (e.g., "JUNE") | Engine |
| Year | (100, 50) | 160×20 | Text (e.g., "1992") | Engine |
| Day headers | Column centers, y=80 | 26×15 each | Text ("M", "T", ...) | Engine |
| Day numbers | Grid cells | 26×30 each | Text (1-31) | Engine |
| Week marker | Cell outline | 26×30 (varies) | Red rectangle stroke | Engine |

**Engine Integration:**
```typescript
interface CalendarContent {
  month: string;      // "JUNE"
  year: string;       // "1992"
  days: number;       // 30 (days in month)
  firstDay: number;   // 0-6 (Mon=0, Sun=6)
  currentWeek: number; // 1-4 (week of month to highlight)
}

function renderCalendar(template: HTMLImageElement, content: CalendarContent): HTMLCanvasElement {
  const canvas = createCanvas(200, 280);
  const ctx = canvas.getContext('2d');

  // 1. Draw template background
  ctx.drawImage(template, 0, 0);

  // 2. Draw month/year
  ctx.font = 'bold 18px Arial';
  ctx.fillStyle = 'rgb(30, 30, 30)';
  ctx.textAlign = 'center';
  ctx.fillText(content.month, 100, 30);

  ctx.font = 'bold 14px Arial';
  ctx.fillText(content.year, 100, 50);

  // 3. Draw day headers
  ctx.font = '10px Arial';
  ctx.fillStyle = 'rgb(60, 60, 60)';
  const dayHeaders = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  dayHeaders.forEach((day, i) => {
    ctx.fillText(day, 20 + i * 26 + 13, 80);
  });

  // 4. Draw day numbers with week highlight
  ctx.font = '12px Arial';
  ctx.fillStyle = 'rgb(30, 30, 30)';

  let dayNum = 1;
  for (let week = 0; week < 6; week++) {
    for (let day = 0; day < 7; day++) {
      if (week === 0 && day < content.firstDay) continue;
      if (dayNum > content.days) break;

      const x = 20 + day * 26 + 13;
      const y = 100 + week * 30 + 15;

      // Highlight current week
      const weekOfMonth = Math.ceil(dayNum / 7);
      if (weekOfMonth === content.currentWeek) {
        ctx.strokeStyle = 'rgb(200, 20, 20)';
        ctx.lineWidth = 2;
        ctx.strokeRect(20 + day * 26 + 3, 100 + week * 30, 20, 24);
      }

      ctx.fillText(dayNum.toString(), x, y);
      dayNum++;
    }
  }

  return canvas;
}
```

---

## 4. Template 2: Newspaper Layout

### 4.1 File Structure

**Source:** `newspaper_template.psd`
**Exports:**
- `newspaper_background.png` (800×1200 RGB) — Yellowed newsprint texture
- `newspaper_layout_guide.svg` (vector) — Column guides, text boxes

### 4.2 Layout Specifications

**Dimensions:** 800×1200px (portrait, scaled to 180×120px when displayed on desk)

**Layer Structure:**
```
newspaper_template.psd
├── background
│   └── Yellowed newsprint texture (#ebe1cd beige)
├── masthead_area (reference rect)
│   └── (50, 30, 700, 40) — Faction name renders here
├── date_area (reference rect)
│   └── (700, 30, 80, 20) — Date renders here
├── headline_area (reference rect)
│   └── (50, 90, 700, 80)
├── subhead_area (reference rect)
│   └── (50, 180, 700, 40)
├── photo_area (reference rect)
│   └── (40, 240, 400, 300)
├── photo_caption_area (reference rect)
│   └── (40, 550, 400, 30)
├── column_1 (reference rect)
│   └── (40, 590, 220, 600)
├── column_2 (reference rect)
│   └── (280, 240, 220, 950)
└── column_3 (reference rect)
    └── (520, 240, 220, 950)
```

**Typography Guidelines:**
```css
.newspaper-masthead {
  font-family: 'Franklin Gothic', 'Arial Black', sans-serif;
  font-size: 32px;
  font-weight: bold;
  text-align: center;
  color: rgb(30, 30, 30);
  text-transform: uppercase;
}

.newspaper-date {
  font-family: 'Times New Roman', serif;
  font-size: 14px;
  text-align: right;
  color: rgb(30, 30, 30);
}

.newspaper-headline {
  font-family: 'Franklin Gothic Condensed', 'Arial Narrow', sans-serif;
  font-size: 36px;
  font-weight: bold;
  text-align: center;
  color: rgb(30, 30, 30);
  line-height: 1.1;
}

.newspaper-subhead {
  font-family: 'Times New Roman', serif;
  font-size: 18px;
  text-align: center;
  color: rgb(30, 30, 30);
  font-style: italic;
  line-height: 1.2;
}

.newspaper-body {
  font-family: 'Times New Roman', serif;
  font-size: 11px;
  text-align: justify;
  color: rgb(30, 30, 30);
  line-height: 1.4;
}

.newspaper-caption {
  font-family: 'Times New Roman', serif;
  font-size: 10px;
  font-style: italic;
  text-align: left;
  color: rgb(60, 60, 60);
  line-height: 1.3;
}
```

### 4.3 Content Slots

| Slot | Position | Dimensions | Content Type | Rendered By |
|------|----------|------------|--------------|-------------|
| Masthead | (400, 50) | 700×40 | Text (faction newspaper name) | Engine |
| Date | (740, 45) | 80×20 | Text (e.g., "23 June 1992") | Engine |
| Headline | (400, 130) | 700×80 | Text (main headline) | Engine |
| Subhead | (400, 200) | 700×40 | Text (subheadline) | Engine |
| Photo | (240, 390) | 400×300 | Image (halftone effect) | Engine |
| Caption | (40, 565) | 400×30 | Text (photo caption) | Engine |
| Body col 1 | (40, 590) | 220×600 | Text (justified, flowing) | Engine |
| Body col 2 | (280, 240) | 220×950 | Text (justified, flowing) | Engine |
| Body col 3 | (520, 240) | 220×950 | Text (justified, flowing) | Engine |

**Faction Masthead Variants:**
- RBiH: "OSLOBOĐENJE" (Liberation)
- RS: "GLAS SRPSKE" (Voice of Srpska)
- HRHB: "CROATIAN HERALD"

---

## 5. Template 3: Monthly Magazine Layout

### 5.1 File Structure

**Source:** `magazine_template.psd`
**Exports:**
- `magazine_cover_bg.png` (600×800 RGB) — Glossy cover background
- `magazine_interior_bg.png` (600×800 RGB) — Interior page background

### 5.2 Cover Layout

**Dimensions:** 600×800px (A4 vertical, scaled to 140×180px on desk)

**Layer Structure:**
```
magazine_template.psd (cover)
├── background
│   └── Professional blue-grey gradient (#3a4a5a to #5a6a7a)
├── title_area (reference rect)
│   └── (50, 40, 500, 60) — "MONTHLY OPERATIONAL REVIEW"
├── month_year_area (reference rect)
│   └── (50, 110, 500, 40) — "MAY 1992"
├── map_preview_area (reference rect)
│   └── (100, 170, 400, 300) — Small control map snapshot
├── statistics_grid (reference rects)
│   ├── stat_box_1: (80, 500, 140, 120) — Settlements gained/lost
│   ├── stat_box_2: (240, 500, 140, 120) — Exhaustion %
│   └── stat_box_3: (400, 500, 140, 120) — Displaced persons
└── table_of_contents (reference rect)
    └── (50, 650, 500, 130) — "INSIDE: Corps Performance, Supply..."
```

**Typography:**
```css
.magazine-title {
  font-family: 'Arial', 'Helvetica', sans-serif;
  font-size: 28px;
  font-weight: bold;
  text-align: center;
  color: rgb(255, 255, 255);
  text-transform: uppercase;
}

.magazine-month-year {
  font-family: 'Arial', 'Helvetica', sans-serif;
  font-size: 24px;
  font-weight: bold;
  text-align: center;
  color: rgb(255, 255, 255);
}

.magazine-stat-label {
  font-family: 'Arial', 'Helvetica', sans-serif;
  font-size: 12px;
  font-weight: bold;
  text-align: center;
  color: rgb(60, 60, 60);
  text-transform: uppercase;
}

.magazine-stat-value {
  font-family: 'Arial', 'Helvetica', sans-serif;
  font-size: 36px;
  font-weight: bold;
  text-align: center;
  color: rgb(30, 30, 30);
}
```

---

## 6. Template 4: Situation Report Layout

### 6.1 File Structure

**Source:** `report_template.psd`
**Exports:**
- `report_background.png` (700×900 RGBA) — Onionskin paper with transparency
- `report_header_template.png` (700×150 RGBA) — Memo header format

### 6.2 Layout Specifications

**Dimensions:** 700×900px (onionskin memo page)

**Layer Structure:**
```
report_template.psd
├── background
│   └── Semi-transparent onionskin texture (rgba(240, 235, 220, 0.9))
├── header_block (reference rects)
│   ├── from_field: (100, 50, 500, 20)
│   ├── to_field: (100, 80, 500, 20)
│   ├── date_field: (100, 110, 500, 20)
│   └── subject_field: (100, 140, 500, 20)
├── classification_stamp_top (reference)
│   └── (50, 30) — "RESTRICTED" in red
├── body_area (reference rect)
│   └── (50, 200, 600, 600)
├── signature_area (reference rect)
│   └── (400, 820, 250, 60)
└── classification_stamp_bottom (reference)
    └── (550, 870) — "CONFIDENTIAL" in red
```

**Typography:**
```css
.report-header-label {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  font-weight: bold;
  color: rgb(30, 30, 30);
}

.report-header-value {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: rgb(30, 30, 30);
}

.report-body {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  text-align: left;
  color: rgb(30, 30, 30);
  line-height: 1.6;
}

.report-classification {
  font-family: 'Arial', sans-serif;
  font-size: 14px;
  font-weight: bold;
  color: rgb(200, 20, 20);
  text-transform: uppercase;
}

.report-signature {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  text-align: right;
  color: rgb(30, 30, 30);
}
```

---

## 7. Post-Processing Pipeline (Photoshop → Engine)

### 7.1 Sprite Cutout Workflow

**For Sora-generated props (crests, headgear, ashtrays, coffee):**

1. **Import Sora PNG** into Photoshop
2. **Remove background:**
   - Use Magic Wand/Quick Select for clean edges
   - Refine Edge with 0.5px feather for anti-aliasing
   - Delete background, leaving only prop
3. **Add subtle drop shadow** (optional):
   - Angle: 120° (top-left light source)
   - Distance: 2px
   - Blur: 3px
   - Opacity: 30%
   - Color: Black
4. **Export as PNG-32** (RGBA with transparency)
5. **Save PSD** for future edits

**Quality check:**
- Zoom to 200% and inspect edges (no jaggies, no halo)
- Alpha channel is smooth gradient (not binary)
- Prop is centered in canvas with 10-20px margin

### 7.2 Template Export Workflow

**For layout templates:**

1. **Create PSD** with layers as specified above
2. **Export backgrounds:**
   - Save individual layers as PNG (backgrounds, textures)
   - RGB for opaque backgrounds, RGBA for transparency
3. **Export layout guides as SVG:**
   - Select all reference rectangles/lines
   - Export → Export As → SVG
   - Preserve layer names as SVG IDs for engine parsing
4. **Create style guide PDF:**
   - Document typography specs (font, size, color, alignment)
   - Include measurements for all content slots
   - Save as `[template_name]_style_guide.pdf`

---

## 8. Engine Integration Contract

### 8.1 Template Loading

```typescript
interface Template {
  background: HTMLImageElement;  // Base texture
  slots: ContentSlot[];          // Defined content areas
  typography: TypographySpec;    // Font styles for each slot
}

interface ContentSlot {
  id: string;                    // Unique identifier
  bounds: { x: number, y: number, width: number, height: number };
  contentType: 'text' | 'image' | 'chart';
  style: string;                 // CSS class name
  alignment: 'left' | 'center' | 'right' | 'justify';
}

class TemplateManager {
  private templates: Map<string, Template> = new Map();

  async loadTemplate(name: string): Promise<Template> {
    const background = await loadImage(`assets/templates/${name}_background.png`);
    const layout = await loadJSON(`assets/templates/${name}_layout.json`); // Exported from SVG

    return {
      background,
      slots: layout.slots.map(parseContentSlot),
      typography: layout.typography
    };
  }

  renderContent(template: Template, content: Record<string, any>): HTMLCanvasElement {
    const canvas = createCanvas(template.background.width, template.background.height);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.drawImage(template.background, 0, 0);

    // Render content into slots
    for (const slot of template.slots) {
      const slotContent = content[slot.id];
      if (!slotContent) continue;

      this.renderSlotContent(ctx, slot, slotContent, template.typography);
    }

    return canvas;
  }
}
```

### 8.2 Typography Rendering

**Engine must implement text wrapping/flowing for newspaper columns:**

```typescript
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = text.split(' ');
  let line = '';
  let currentY = y;

  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && line.length > 0) {
      ctx.fillText(line, x, currentY);
      line = word + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  ctx.fillText(line, x, currentY);
}

function flowText(
  ctx: CanvasRenderingContext2D,
  text: string,
  columns: Array<{x: number, y: number, width: number, height: number}>
): void {
  // Split text into columns, respecting column height
  // (Implementation left as exercise - requires word-by-word flow with height checking)
}
```

---

## 9. Deliverables Checklist

- [ ] `calendar_template.psd` with layers as specified
- [ ] `calendar_background.png` (200×280 RGB)
- [ ] `calendar_layout.json` (slot definitions exported from SVG)
- [ ] `newspaper_template.psd` with layers as specified
- [ ] `newspaper_background.png` (800×1200 RGB)
- [ ] `newspaper_layout.json` (slot definitions)
- [ ] `magazine_template.psd` with cover + interior pages
- [ ] `magazine_cover_bg.png` (600×800 RGB)
- [ ] `magazine_interior_bg.png` (600×800 RGB)
- [ ] `magazine_layout.json` (slot definitions)
- [ ] `report_template.psd` with layers as specified
- [ ] `report_background.png` (700×900 RGBA)
- [ ] `report_layout.json` (slot definitions)
- [ ] Style guide PDFs for each template (typography specs)

---

**END OF PHOTOSHOP TEMPLATE SPECIFICATION**

**Status:** Ready for Photoshop asset creation

**Next step:** Engine integration (content → template rendering system)
