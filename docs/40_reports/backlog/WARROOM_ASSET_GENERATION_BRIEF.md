# Warroom Asset Generation Brief
## External Expert Handover — Complete Specification

**Project:** A War Without Victory (AWWV)  
**Date:** 2026-02-07  
**Version:** 1.0  
**Audience:** External image generation / Photoshop expert  
**Deliverables:** 1 clean background + 5 desk prop sprites (6 PNG files total)

---

## 1. Project Context (Read This First)

You are generating assets for the command headquarters (HQ) screen of a Bosnian War simulation. The player sits at a desk in a 1990s-era government office that has been converted into a wartime command center. The visual style is **photorealistic** — think a film still from a 1990s Eastern European war drama, not a video game.

The camera is positioned as if the viewer is standing approximately 2 meters from a heavy wooden desk, looking slightly downward (about 35° tilt). The desk fills the lower 40% of the frame; the wall behind it fills the upper 60%. The desk is angled roughly 45° to the camera, creating a sense of depth.

**What you are replacing:** Currently the scene is a single baked image (`hq_background_mvp.png`) with desk props painted directly into it. We need the desk props extracted into separate transparent-background sprites so they can be placed programmatically (for click detection). You are generating a **clean version** of the same scene (no desk props) plus **five individual prop sprites**.

**Period:** 1992–1995, former Yugoslavia. Everything in this room predates the war — it's a 1970s–1980s socialist-era administrative office, not a purpose-built military facility. Equipment is old, institutional, and heavily used.

---

## 2. Asset #1 — Clean HQ Background

### 2.1 Filename & Format

| Property | Value |
|----------|-------|
| **Filename** | `hq_background_clean.png` |
| **Format** | PNG, RGB (no alpha needed) |
| **Dimensions** | **2048 × 1152 px** (16:9) |
| **Color depth** | 24-bit (8 bits per channel) |

### 2.2 Scene Description

A photorealistic interior of a converted government office serving as a wartime command headquarters in Bosnia, circa 1993. The image must be a single unified scene — wall and desk together in one frame, not composited.

**Camera & Perspective:**
- Cinematic overhead view, ~35° downward tilt from eye level
- Viewer stands ~2 meters from desk front edge
- Desk faces camera at ~45° angle (not straight-on, not profile)
- Strong perspective: desk edge closest to camera is largest, recedes toward wall
- Depth of field: desk surface in sharp focus (foreground), wall slightly softer but fully readable

**Wall (upper 60% of frame):**
- **Material:** Light grey poured concrete, slightly rough texture. Socialist-era institutional construction — not decorative. Think government municipal building, not bunker.
- **Condition (STABLE state):** Clean concrete, no cracks, no damage. Minor surface texture variation is fine but no deterioration.
- **Map frame:** A large rectangular area (roughly center-wall, ~60% of wall width) with a thin metal or wood frame, corner clips (tactical map holder style). The interior of the map frame should be **empty / blank** — a flat neutral surface (light beige or off-white). The game engine renders the tactical map dynamically into this space.
- **Calendar frame:** A small rectangular frame (~10% of wall width) positioned to the **upper right** of the map frame. Interior is **empty / blank**. The game engine renders calendar content dynamically.
- **Crest plaque area:** A small mounting point or wall plaque (empty, ~6% of wall width) centered **above** the map frame. The game engine overlays faction-specific coat of arms sprites here.
- **Lighting:** Overhead fluorescent tube lighting, bright and even (`brightness(1.0)` — this is the "stable" state). Slight blue-grey color cast suggesting overcast daylight from an unseen window. No dramatic shadows.
- **Additional wall details (subtle):** 
  - A light switch or electrical conduit visible on one wall edge
  - Perhaps a small coat hook or nail hole
  - Fluorescent tube fixture visible at ceiling/wall junction
  - No posters, no decorations beyond the frames described above

**Desk (lower 40% of frame):**
- **Material:** Dark walnut wood, heavy institutional desk from the 1970s. Think Yugoslav-made, socialist-era government furniture — solid, utilitarian, not decorative. Some wear on edges, minor scratches consistent with decades of use.
- **Shape:** Large rectangular desk with squared edges, possibly with a modest modesty panel visible at the front. Two or three drawers visible on one side.
- **Surface condition:** The desk surface must be **clear of props**. No phone, no newspaper, no magazine, no reports, no radio. The desk should show:
  - The wood grain and surface clearly
  - Subtle shadow zones where props will be overlaid (soft circular/rectangular shadows at the five prop positions described in §3 below) — these shadows are optional but help with compositing
  - Minor surface wear: faint ring stains from cups past, slight discoloration from years of use
  - A desk lamp (non-interactive, can be baked in) — small, adjustable-arm type, 1970s style
  - An ashtray area (the ashtray itself is a separate sprite in the full system, but a faint shadow or clean spot where one would sit is fine)
- **Papers:** 20% desk coverage of **organized papers** (neatly stacked, aligned edges). These are baked into the background because paper scatter varies by desperation state. Keep the paper coverage minimal and tidy — small stacks near back edge of desk, nothing overlapping the five prop zones.

**Color Grading:**
- Desaturated palette with slight blue-grey cast
- Not warm/amber — this is a concrete government building under fluorescent lights
- Think institutional, tired, utilitarian
- Overall: muted but not dark

### 2.3 Generation Prompt (for Sora, Midjourney, or equivalent)

> Photorealistic interior photograph of a 1990s Bosnian wartime command headquarters. Camera angle: 35-degree downward tilt, standing 2 meters from desk. Heavy dark walnut 1970s socialist-era government desk fills lower 40% of frame, angled 45 degrees to camera. Desk surface mostly clear — small neat paper stacks near back edge, desk lamp with adjustable arm, minor wood grain wear. Wall behind desk: light grey poured concrete, fluorescent tube lighting, bright even illumination. Large empty rectangular metal picture frame centered on wall (for tactical map), small empty calendar frame upper-right, small empty crest mounting plaque centered above map frame. No phone, no newspaper, no magazine, no radio, no stack of reports on desk. Desaturated blue-grey color grading, overcast daylight cast. 1970s–1980s Eastern European government office aesthetic. 16:9 aspect ratio. 2048×1152 resolution.

### 2.4 Post-Processing Notes

After generation, the following post-processing may be needed:
- Ensure the map frame interior is clean and neutral (mask and fill if generation put content there)
- Ensure the calendar frame interior is clean
- Ensure the crest plaque area above the map is empty
- Ensure the five desk prop zones (§3) are clear — no generated objects in those areas
- Color-correct to match the muted blue-grey palette
- Sharpen desk foreground, soften wall background slightly (depth of field)

### 2.5 Prop-Free Zones on Desk

The following approximate zones on the desk surface **must be clear** (these are where sprites will be overlaid). Coordinates are in 2048×1152 space, origin top-left:

| Zone | Approximate bounds (x, y, w, h) | Notes |
|------|----------------------------------|-------|
| Phone zone | (80–500, 800–1050) | Far left of desk |
| Newspaper zone | (550–900, 820–1020) | Left-center of desk |
| Magazine zone | (950–1250, 800–1000) | Center-right of desk |
| Reports zone | (1300–1650, 810–1030) | Right-center of desk |
| Radio zone | (1680–2000, 790–1000) | Far right of desk |

These are rough guides. The exact prop positions depend on desk perspective, but props should be distributed **left-to-right across the desk surface** with gaps between them.

---

## 3. Assets #2–#6 — Desk Prop Sprites

### 3.1 Universal Sprite Requirements

All five sprites share these requirements:

| Property | Value |
|----------|-------|
| **Format** | PNG, RGBA (transparent background) |
| **Background** | Fully transparent (alpha = 0) |
| **Perspective** | Must match desk camera angle (~35° overhead, desk at 45° angle) |
| **Lighting** | Must match background lighting direction and color temperature (overhead fluorescent, blue-grey cast, bright even) |
| **Shadow** | Include a soft contact shadow on the bottom edge of the object (as if sitting on the desk surface). Shadow should be semi-transparent black, not hard-edged. |
| **Edge quality** | Clean anti-aliased edges against transparent background. No fringing, no white/dark halos. |
| **Period accuracy** | 1970s–1990s Eastern European. No modern objects, no Western brands, no post-2000 design. |
| **Padding** | Include 10–20px of transparent padding around each sprite so edges don't clip when placed |

### 3.2 Sprite #1 — Red Telephone (`sprite_phone.png`)

| Property | Value |
|----------|-------|
| **Filename** | `sprite_phone.png` |
| **Suggested dimensions** | ~400 × 240 px (adjust to fit object naturally) |
| **Object** | 1970s red rotary-dial telephone |

**Detailed Description:**
- Classic **red rotary telephone** — not a modern pushbutton phone, not a field telephone
- Chunky Bakelite or hard plastic body in deep red (think Yugoslav PTT standard-issue)
- Rotary dial with white number ring and finger holes visible
- **Coiled handset cord** visible, curling from handset cradle toward back of phone
- Handset resting in cradle (on-hook position)
- Slight wear/scuffing on high-touch areas (dial center, handset grip)
- The phone should look heavy, institutional, and well-used
- Viewed from the same overhead 35° angle as the desk

**Generation prompt:**
> 1970s red rotary dial telephone, Bakelite body, coiled cord visible, on transparent background. Viewed from 35-degree overhead angle. Overhead fluorescent lighting with blue-grey cast. Photorealistic, slight wear on dial and handset. Eastern European government office telephone. RGBA transparent background.

**In-game purpose:** Clicking this opens the Diplomacy Panel (Phase II+). Currently disabled with tooltip "Diplomacy (Phase II+)".

---

### 3.3 Sprite #2 — Newspaper (`sprite_newspaper.png`)

| Property | Value |
|----------|-------|
| **Filename** | `sprite_newspaper.png` |
| **Suggested dimensions** | ~380 × 260 px |
| **Object** | Folded broadsheet newspaper |

**Detailed Description:**
- A **folded broadsheet newspaper**, folded once horizontally (so the top half of the front page is visible)
- **Blank masthead area** — no readable text, no real newspaper name. The masthead zone should be a slightly darker band at the top, but text is illegible/smudged (the game engine overlays dynamic newspaper content)
- Newsprint color: aged cream/ivory (#ebe1cd), not bright white
- Visible column lines suggesting text blocks, but text itself is not readable — just grey smudges suggesting print
- Slight fold crease visible where the paper bends
- Corners slightly dog-eared or soft — it's been handled
- One or two photos suggested as grey rectangles within the layout
- Paper feels thin, slightly translucent at edges — onionskin broadsheet quality
- Lying flat on desk surface, slightly rotated (~5–10° off-axis for naturalism)

**Generation prompt:**
> Folded broadsheet newspaper lying on desk, aged cream-colored newsprint, blank masthead, illegible grey text columns, slightly dog-eared corners, on transparent background. 35-degree overhead view. Fluorescent lighting. Photorealistic. RGBA transparent background.

**In-game purpose:** Clicking opens the Newspaper overlay (turn events, fog-of-war reports).

---

### 3.4 Sprite #3 — Magazine (`sprite_magazine.png`)

| Property | Value |
|----------|-------|
| **Filename** | `sprite_magazine.png` |
| **Suggested dimensions** | ~280 × 380 px (portrait orientation) |
| **Object** | Glossy magazine, portrait format |

**Detailed Description:**
- A **glossy magazine** in portrait (vertical) orientation, lying flat on desk
- **Blank cover** — no readable title, no identifiable publication. The cover should be a **blue-grey tone** (#4a5a6a) suggesting a serious/analytical publication (think foreign policy journal, intelligence review, or military affairs magazine)
- A suggested photo area (dark rectangle) in the upper portion of the cover
- Suggested title text as illegible light-colored smudges at top
- Glossy paper — visible light reflection/sheen on the cover surface from overhead fluorescent
- **Staple-bound** (not perfect-bound) — a thin magazine, ~30–40 pages
- Slightly curled at corners from handling
- Lying flat, slightly rotated (~5° off-axis)

**Generation prompt:**
> Glossy blue-grey magazine lying flat on desk, portrait orientation, blank cover with illegible title, suggested photo area, staple-bound, slight curl at corners, on transparent background. 35-degree overhead view. Fluorescent lighting with sheen reflection. Photorealistic. RGBA transparent background.

**In-game purpose:** Clicking opens the Monthly Magazine (detailed statistics, faction overview).

---

### 3.5 Sprite #4 — Situation Reports (`sprite_reports.png`)

| Property | Value |
|----------|-------|
| **Filename** | `sprite_reports.png` |
| **Suggested dimensions** | ~350 × 280 px |
| **Object** | Small stack of typewritten pages |

**Detailed Description:**
- **3–4 typewritten pages** stacked loosely on the desk
- **Onionskin/typing paper** — thin, slightly translucent, cream/ivory colored
- Top page has a **red "POVJERLJIVO" (CONFIDENTIAL) stamp** — rectangular, slightly smudged, positioned upper-right of the page. (Alternative: "TAJNO" = SECRET, or if Cyrillic/Latin ambiguity is undesirable, use the English "CONFIDENTIAL" in red stamp form)
- Visible typewriter text — irregular, mechanical, not laser-printed. Text is **not readable** (too small at this scale / intentionally blurred) but the impression of monospaced typewriter characters should be clear
- Pages slightly offset from each other (not perfectly aligned) — 2–5mm stagger between sheets
- Perhaps a paperclip on the top-left corner or a staple
- Slight curl/wave in the paper edges
- The pages look like they've been handled, read, passed around

**Generation prompt:**
> Stack of 3-4 typewritten onionskin pages on transparent background, slightly offset, red CONFIDENTIAL stamp on top page, cream-colored paper, irregular typewriter text not readable, paperclip on corner. 35-degree overhead view. Fluorescent lighting. Photorealistic. RGBA transparent background.

**In-game purpose:** Clicking opens Situation Reports (military status, delayed intelligence).

---

### 3.6 Sprite #5 — Transistor Radio (`sprite_radio.png`)

| Property | Value |
|----------|-------|
| **Filename** | `sprite_radio.png` |
| **Suggested dimensions** | ~320 × 260 px |
| **Object** | Portable transistor radio, 1980s–1990s |

**Detailed Description:**
- A **portable transistor radio** — battery-powered, handheld size (roughly 15×10×4 cm in real life)
- 1980s–early 1990s design: rectangular body, black or dark grey plastic housing
- **Telescoping antenna extended** at ~60° angle — this is important for the silhouette and recognizability
- Visible speaker grille (perforated pattern or horizontal slats) on the front face
- Small analog tuning dial/wheel visible on one edge
- AM/FM band selector switch
- Perhaps a small "GRUNDIG" or "PHILIPS" or generic brand badge (or no brand — keep it generic)
- Volume knob visible
- Minor scuffs, the plastic is slightly dulled from use
- Sitting upright on desk (not lying flat) — resting on its base edge, antenna pointing up-and-back

**Generation prompt:**
> 1980s portable transistor radio, dark plastic housing, telescoping antenna extended at 60 degrees, speaker grille visible, analog tuning dial, sitting upright on transparent background. 35-degree overhead view. Fluorescent lighting with blue-grey cast. Photorealistic, slightly worn. RGBA transparent background.

**In-game purpose:** Clicking opens the Radio overlay (international news, UN resolutions, external pressure events). Currently disabled with tooltip "Radio (Phase II+)".

---

## 4. Placement & Coordinate Expectations

### 4.1 Coordinate System

All coordinates are in **2048 × 1152 pixel space**, origin at **top-left** (0,0).

- **X** increases rightward (0 = left edge, 2048 = right edge)
- **Y** increases downward (0 = top edge, 1152 = bottom edge)

### 4.2 Expected Prop Placement Map

Below is the approximate spatial layout of all interactive elements in the 2048×1152 scene. These are target placement zones — the exact coordinates will be finalized after asset delivery using a region-mapping tool.

```
0,0 ─────────────────────────────────────────────── 2048,0
│                                                         │
│                     WALL (concrete)                     │
│                                                         │
│            ┌──── CREST PLAQUE ────┐                    │
│            │     (empty, ~120px)  │                    │
│            └──────────────────────┘                    │
│   ┌─────────────────────────────────────────┐  ┌────┐ │
│   │                                         │  │CAL-│ │
│   │          MAP FRAME (empty)              │  │END-│ │
│   │          ~1200 × 800 px area            │  │AR  │ │
│   │                                         │  │    │ │
│   └─────────────────────────────────────────┘  └────┘ │
│                                                         │
├─ ─ ─ ─ ─ ─ ─ DESK EDGE (approx y=750) ─ ─ ─ ─ ─ ─ ─ ┤
│                                                         │
│   DESK SURFACE                                          │
│                                                         │
│  ┌──────┐  ┌──────────┐  ┌────────┐  ┌───────┐  ┌───┐│
│  │PHONE │  │NEWSPAPER │  │MAGAZINE│  │REPORTS│  │RAD││
│  │      │  │          │  │        │  │       │  │IO ││
│  └──────┘  └──────────┘  └────────┘  └───────┘  └───┘│
│                                                         │
│                                                         │
0,1152 ──────────────────────────────────────────── 2048,1152
```

### 4.3 Approximate Prop Bounds (2048×1152 space)

These are initial estimates. After you deliver the sprites, we will measure exact bounds using a region-mapping tool. If you can provide tighter bounds with your delivery, that saves us a step.

| Sprite | Target x | Target y | Approx width | Approx height | Notes |
|--------|----------|----------|-------------|--------------|-------|
| `sprite_phone.png` | ~100 | ~830 | ~380 | ~210 | Far left desk, slightly forward |
| `sprite_newspaper.png` | ~520 | ~840 | ~360 | ~200 | Left-center, slight rotation |
| `sprite_magazine.png` | ~950 | ~810 | ~260 | ~350 | Center-right, portrait orientation |
| `sprite_reports.png` | ~1300 | ~830 | ~340 | ~220 | Right-center |
| `sprite_radio.png` | ~1720 | ~800 | ~280 | ~240 | Far right, antenna extends upward |

### 4.4 Deliverable: Coordinate Sheet

Please provide a simple table with your final measured pixel bounds for each sprite as placed on the 2048×1152 canvas. Format:

```
sprite_phone.png:      x=102, y=836, w=380, h=214
sprite_newspaper.png:  x=530, y=842, w=355, h=198
sprite_magazine.png:   x=960, y=808, w=258, h=345
sprite_reports.png:    x=1310, y=832, w=338, h=218
sprite_radio.png:      x=1725, y=798, w=275, h=238
```

If you cannot provide exact bounds, we will measure post-delivery.

---

## 5. Visual Consistency Requirements

### 5.1 Lighting Must Match Across All 6 Assets

The clean background and all five sprites will be composited at runtime. They **must** share consistent:

- **Light direction:** Overhead, slightly behind/above the viewer (fluorescent ceiling fixture)
- **Light temperature:** Cool/neutral white (5000–6500K) with slight blue-grey cast
- **Shadow direction:** Shadows fall downward and slightly toward the viewer
- **Contrast level:** Moderate — this is even fluorescent lighting, not dramatic

### 5.2 Perspective Must Match

All sprites must be drawn from the **same camera position** as the background:
- 35° downward tilt
- Desk at 45° angle to camera
- Objects on the desk surface appear slightly foreshortened (back edge shorter than front edge)
- Objects should have minimal but correct perspective distortion consistent with their position on the desk

### 5.3 Color Palette Reference

| Surface | Hex | RGB | Notes |
|---------|-----|-----|-------|
| Concrete wall | #b0b0b0 | 176,176,176 | Light grey, slight texture variation |
| Desk surface | #3d2b1a | 61,43,26 | Dark walnut, warm brown under cool light |
| Newsprint | #ebe1cd | 235,225,205 | Aged cream, not white |
| Magazine cover | #4a5a6a | 74,90,106 | Blue-grey, serious publication |
| Phone body | #b22222 | 178,34,34 | Firebrick red, slightly dulled |
| Radio housing | #2a2a2a | 42,42,42 | Near-black, slightly warm |
| Reports paper | #e8e0d0 | 232,224,208 | Onionskin, slightly translucent feel |
| CONFIDENTIAL stamp | #cc0000 | 204,0,0 | Bright red, ink-stamp style |
| Contact shadows | #000000 @ 20% | — | Soft, semi-transparent |

### 5.4 Scale Relationships

All objects should be sized realistically relative to each other and to the desk. For reference, the desk is approximately 150cm × 75cm in real life.

| Object | Real-world size (approx) | Relative note |
|--------|--------------------------|---------------|
| Phone | 25cm × 15cm × 12cm | Chunky, heavy |
| Newspaper (folded) | 40cm × 30cm | Large broadsheet, folded once |
| Magazine | 21cm × 28cm (A4-ish) | Standard magazine format |
| Reports stack | 21cm × 29.7cm × 1cm | A4 paper, thin stack |
| Radio | 15cm × 10cm × 4cm | Handheld, compact |

---

## 6. Quality Checklist & Acceptance Criteria

### 6.1 Background Acceptance Criteria

- [ ] Resolution is exactly 2048 × 1152 px
- [ ] Format is PNG RGB (no alpha channel needed)
- [ ] Desk surface is clear of the five prop objects (phone, newspaper, magazine, reports, radio)
- [ ] Map frame interior is empty/neutral (no generated map content)
- [ ] Calendar frame interior is empty/neutral
- [ ] Crest plaque area is empty
- [ ] Wall concrete is clean (stable state — no cracks, no damage)
- [ ] Lighting is bright and even (stable state)
- [ ] Color grading is desaturated blue-grey (not warm amber)
- [ ] Camera angle matches spec (~35° overhead, desk at 45°)
- [ ] Desk is 1970s socialist-era dark walnut, heavy institutional furniture
- [ ] Paper scatter is minimal and tidy (~20% desk coverage, organized stacks near back)
- [ ] No modern objects visible anywhere in the scene
- [ ] File size is reasonable (<10MB)

### 6.2 Sprite Acceptance Criteria (each sprite)

- [ ] Format is PNG RGBA with fully transparent background
- [ ] No background remnants, fringing, or halo artifacts around object edges
- [ ] Perspective matches background camera angle (35° overhead, 45° desk angle)
- [ ] Lighting direction and temperature match background
- [ ] Soft contact shadow included on bottom edge
- [ ] 10–20px transparent padding around object
- [ ] Object is period-accurate (1970s–1990s Eastern European)
- [ ] Object is clearly recognizable at the expected display size (~200–400px wide in viewport)

### 6.3 Compositing Test

After delivery, we will overlay all five sprites onto the clean background at their specified positions. The composited result should:

- [ ] Look like a natural photograph of a desk with objects on it
- [ ] Have no visible seams, lighting mismatches, or color temperature shifts
- [ ] Have objects that sit naturally on the desk surface (correct shadow contact, correct perspective)
- [ ] Be visually equivalent to (or better than) the current baked `hq_background_mvp.png`

---

## 7. File Delivery

### 7.1 Filenames (Exact)

```
hq_background_clean.png
sprite_phone.png
sprite_newspaper.png
sprite_magazine.png
sprite_reports.png
sprite_radio.png
```

### 7.2 Delivery Location

Place all 6 files in: `assets/raw_sora/`

### 7.3 Optional Extras (Not Required)

If convenient, also provide:
- A **composited preview** image showing all sprites placed on the background (for visual QA)
- **PSD/layered source files** in case adjustments are needed
- **Alternate angle variants** of any sprite that was difficult to get right

---

## 8. Reference Images & Context

### 8.1 Existing Asset

The current baked background is `assets/raw_sora/hq_background_mvp.png` — use this as your primary visual reference for:
- Desk wood tone and finish
- Wall concrete texture and color
- Overall scene composition and camera angle
- Lighting quality and direction
- General aesthetic and mood

### 8.2 UI Design Specification

For full context on the HQ scene design, see `docs/40_reports/UI_DESIGN_SPECIFICATION.md`:
- §2.1: Overall composition, camera specs, screen division
- §2.2: Wall section details (map frame, calendar, crest)
- §2.3: Desk section details (interactive objects, positions)
- §4: Desperation indicator system (the "stable" state is what we're generating)

### 8.3 Historical Photo References

If seeking additional reference material, search for:
- "1993 Bosnian government office interior"
- "Yugoslav municipal building interior 1980s"
- "Eastern European command post 1990s"
- "Predsjedništvo Sarajevo interior" (Presidency building)
- "1970s red rotary telephone Yugoslavia"
- "Grundig transistor radio 1990s"

---

## 9. FAQ

**Q: Why are desk props separate sprites instead of baked into the background?**  
A: Click regions need to align precisely with visible objects. When props are baked in, the click targets drift as the image scales across screen sizes. Separate sprites let us define click bounds that exactly match the sprite bounds.

**Q: Will there be more background variants later?**  
A: Yes — there are 4 desperation states (stable, strained, critical, desperate) that need different backgrounds with increasing wall cracks, desk mess, and lighting degradation. This delivery covers the **stable** state only. Future states will reference this as the baseline.

**Q: Can the sprites have slight rotation?**  
A: Yes, encouraged. Objects should look casually placed on a desk, not grid-aligned. 5–10° rotation is natural. Just ensure the rotation is consistent with the overhead camera angle.

**Q: What if the AI generation tool can't do transparent backgrounds?**  
A: Generate on a solid green (#00FF00) or magenta (#FF00FF) background, then remove it in Photoshop using Select → Color Range or equivalent. Ensure clean edge extraction.

**Q: What about the headgear, ashtray, and coffee cup sprites?**  
A: Those are separate deliverables under a different system (faction-specific and desperation-specific sprites). They are NOT part of this brief. This brief covers only the 5 desk props listed.

**Q: Should text on the newspaper/magazine/reports be readable?**  
A: No. All text should be **illegible** — smudged, too small, or blurred. The game engine overlays dynamic content. Readable text would conflict with game-generated content and create localization issues.
