# UI Designer Brief — A War Without Victory

**Project:** A War Without Victory (AWWV)
**Client:** Game Development Team
**Date:** 2026-02-02
**Deliverable:** Command HQ Visual Assets
**Format:** PNG images with transparent backgrounds where specified

---

## 1. Project Overview

**A War Without Victory** is a strategic-level simulation of the 1992-1995 Bosnian War. Players assume the role of political leadership (not tactical commanders) directing one of three factions through a complex civil conflict.

**Your Task:** Create visual assets for the command headquarters (HQ) interface—the primary screen where players interact with the game. The HQ uses a 2D overhead perspective showing a concrete-walled war room with a strategic wall map and a wooden desk with period-accurate props.

---

## 2. Visual Style Guide

### 2.1 Overall Aesthetic

**Primary Visual Reference:** Cold War-era NATO tactical command centers (circa 1990-1995)

**Key Visual Characteristics:**
- **Utilitarian, not cinematic**: Modest Eastern European administrative office converted for wartime use
- **Period authenticity**: 1990s technology only (no modern screens, no digital displays)
- **Tactical cartography**: NATO-standard military maps with hatching patterns, grease pencil annotations, stencil typography
- **Concrete brutalism**: Grey concrete walls, fluorescent lighting, socialist-era furniture
- **Muted color palette**: Institutional greens, browns, beiges, greys, crimson reds, steel blues

**Reference Images:** Three Sora-generated reference images have been provided showing:
1. NATO tactical map with colored zone hatching (red diagonal, blue polka-dot, green horizontal lines)
2. Operational planning map with topographic base, unit symbols, phase lines
3. Command room interior with concrete walls, wooden desk, utilitarian props

### 2.2 Color Palette

**Faction Zone Colors** (for map zones visible on wall):
- **RS (Republika Srpska)**: Crimson Red `rgb(180, 50, 50)`
- **RBiH (Republic of Bosnia-Herzegovina)**: Forest Green `rgb(70, 120, 80)`
- **HRHB (Herzeg-Bosnia)**: Steel Blue `rgb(60, 100, 140)`

**Environmental Palette:**
- **Concrete walls**: `rgb(160, 160, 165)` — slightly warm grey
- **Wooden desk**: Dark walnut/oak brown, 1970s socialist-era furniture style
- **Lighting**: Bright fluorescent (stable state) → dim harsh lighting (desperate state)
- **Map paper**: Aged beige/tan `rgb(235, 225, 205)`
- **Classification stamps**: Bright red `rgb(200, 20, 20)` — "TOP SECRET", "CONFIDENTIAL"

### 2.3 Typography

**Map Labels** (on wall map):
- **Font**: Stencil sans-serif capitals (e.g., "OCR-A", "Stencil", "Franklin Gothic Condensed")
- **City names**: 12-14pt black stencil capitals
- **Grid references**: 8pt black sans-serif along edges
- **Classification stamps**: 18pt bold red all-caps ("TOP SECRET", "SECRET NOFORN")

**Desk Props** (newspapers, reports):
- **Newspaper mastheads**: Bold condensed serif (Franklin Gothic), 24-36pt
- **Typed reports**: Courier New monospace (typewriter effect), 12pt
- All text in **English** (not Bosnian/Serbian/Croatian)

---

## 3. Asset Specifications and Deliverables

### 3.1 Unified HQ Background Images (4 variants)

**Purpose:** Base HQ scene (wall + desk combined) identical for all three factions. Desperation state determines which variant is shown.

**Viewing Perspective:** **Cinematic overhead 45-degree angled view**. Camera is positioned as if viewer is standing approximately 2 meters from the desk, looking down at both the desk and the wall map behind it. The desk faces the camera at a 45-degree angle, creating dynamic depth and immersion. This matches the reference image provided.

**Composition:**
```
┌─────────────────────────────────────────┐
│         WALL SECTION (60%)              │
│        (background, soft focus)         │
│                                         │
│   ┌──────────────────────────────┐     │
│   │        [CREST]               │ ┌──┐│
│   │   [Wall map placeholder]     │ │Cal││ Calendar
│   │                              │ │  ││
│   │   [NATO tactical map style]  │ └──┘│
│   │                              │     │
│   └──────────────────────────────┘     │
│                                         │
├─────────────────────────────────────────┤
│         DESK SECTION (40%)              │
│       (foreground, sharp focus)         │
│     [desk at 45° angle to camera]       │
│                                         │
│  [Phone] [Headgear] [Newspaper]         │
│     [Magazine] [Reports] [Radio]        │
│       [Ashtray] [Coffee]                │
│                                         │
└─────────────────────────────────────────┘
```

**Technical Specifications:**
- **Dimensions**: 2048 × 1152 pixels (16:9 aspect ratio)
- **Format**: PNG, 24-bit RGB (no alpha channel needed for base backgrounds)
- **Perspective**:
  - **Camera angle**: 35-degree downward tilt from eye level (overhead but not top-down)
  - **Camera position**: Standing 2 meters from desk front edge
  - **Desk orientation**: Heavy wooden desk faces camera at 45-degree angle
  - **Depth of field**: Desk items in sharp focus (foreground), wall map slightly softer but fully readable (background)
  - **Depth**: Strong perspective with desk edge closest to camera largest, receding toward wall
- **Color grading**: Desaturated with slight blue-grey cast suggesting overcast daylight through unseen window
- **Rendering style**: Photorealistic with period-accurate details (1990s Eastern European war room)
- **Lighting**: Bright even fluorescent (stable) → dim harsh shadows (desperate)

#### 3.1.1 HQ Background — Stable State

**File Name:** `hq_background_stable.png`

**Wall Section (Top 70%):**
- Concrete wall, light grey `rgb(160, 160, 165)`, clean surface
- **Wall cracks**: NONE visible (stable state shows pristine wall)
- Metal/wood frame for map (empty—map rendered separately at runtime)
- **National crest placeholder**: Empty mounting plaque or hook 50-80px above map frame (crest added as sprite overlay)
- **Classification stamps**:
  - "TOP SECRET" red stamp, upper left corner of map area
  - "SECRET NOFORN" red stamp, lower right corner of map area
- **Grid coordinates**: Black UTM reference numbers along left/right/top/bottom edges of map frame
- **Wall calendar frame**: Empty wooden/metal calendar frame (upper right), NO DATES OR NUMBERS (calendar content rendered by engine)
- **Note**: Calendar dates, month name, year, and week highlight are dynamically rendered by engine from game state
- **Lighting**: Bright, even fluorescent light from ceiling (simulate with soft top-down gradient)

**Desk Section (Bottom 40%):**
- **Desk surface**: Dark walnut wood grain, 1970s socialist-era heavy desk facing camera at 45-degree angle, fills foreground with strong perspective depth
- **Surface condition**: Clean wood visible, one or two faint coffee ring stains (minimal wear)
- **Objects positioned left to right** (all interactive objects except headgear/ashtray/coffee):
  1. **Red rotary telephone** (far left, 120×100px) — coiled cord visible, well-worn red plastic
  2. **Headgear placeholder** (left, on desk edge, 100×120px) — Empty space or subtle shadow (headgear added as sprite overlay)
  3. **Today's newspaper** (left-center, 180×120px) — Generic newspaper folded, masthead visible but generic/placeholder, grainy B&W photo, partially unfolded
  4. **Old newspaper** (behind current, 180×120px partial visibility) — Same as above, slightly behind/underneath
  5. **Monthly magazine** (center, 140×180px vertical) — Glossy cover, generic title like "OPERATIONAL REVIEW", bar charts/maps visible on cover
  6. **Situation report papers** (right-center, 160×200px stack) — 3-5 typewritten onionskin pages, top page has red "CONFIDENTIAL" stamp
  7. **Transistor radio** (far right, 100×80px) — Small 1990s radio, antenna extended, period-accurate
  8. **Ashtray placeholder** (center-right, 80×80px) — Empty space or subtle shadow (ashtray added as sprite overlay)
  9. **Coffee cup placeholder** (right edge, 60×80px) — Empty space or subtle shadow (coffee added as sprite overlay)

**Paper scatter**: Organized stacks, aligned edges, covers ~20% of desk surface (minimal clutter)

**Important Note on Interactive Elements**: The following elements in the HQ background will have **clickable regions** with red outline hover states applied at runtime:
- **Wall calendar** (advances turn when clicked)
- **National crest** above map (opens faction overview panel — rendered as sprite overlay)
- **Wall map** (zoom/inspect functionality)
- **Red telephone**, **newspapers**, **magazine**, **reports**, **radio** on desk

These interactive elements should be clearly visible and unobstructed in the base HQ image. Red outlines (`rgb(200, 20, 20)`, 3px) will be added programmatically on hover—do NOT include red outlines in the base image.

#### 3.1.2 HQ Background — Strained State

**File Name:** `hq_background_strained.png`

**Changes from Stable:**

**Wall Section:**
- **Wall cracks**: 1-2 thin hairline cracks (2-3mm wide, 20-30cm long) near map edges, barely visible, subtle stress indicators
- Map frame: Slightly dog-eared corners (subtle wear)
- Lighting: Slightly dimmer `brightness(0.9)` — simulate one fluorescent tube dimming

**Desk Section:**
- Surface condition: More coffee ring stains visible
- **Paper scatter**: Slightly scattered, some overlap, covers ~40% of desk (moderate clutter)
- Papers at slight angles (not perfectly aligned)
- Objects unchanged (same positions as stable)

#### 3.1.3 HQ Background — Critical State

**File Name:** `hq_background_critical.png`

**Changes from Strained:**

**Wall Section:**
- **Wall cracks**: 3-5 visible cracks (5-8mm wide, 50-80cm long) radiating from corners and map edges, some with slight branching, concrete stress visible
- Map frame: Torn edges at corners, visible wear from constant handling
- Lighting: Dim with harsh shadows `brightness(0.8)` — simulate one tube flickering effect (if animatable, show slightly uneven lighting)

**Desk Section:**
- Surface condition: Heavy coffee stains, visible grime buildup, ink marks
- **Paper scatter**: Very scattered, papers at various angles, covers ~65% of desk (heavy clutter)
- Some papers overlapping objects (telephone, magazine)
- Objects unchanged (same positions)

#### 3.1.4 HQ Background — Desperate State

**File Name:** `hq_background_desperate.png`

**Changes from Critical:**

**Wall Section:**
- **Wall cracks**: Extensive crack network (10-15mm wide, spanning full wall height/width, heavy branching patterns), spalling concrete (small chunks missing exposing darker inner concrete), hints of exposed rebar in largest cracks, severe structural deterioration
- Map frame: Heavily torn edges, creases from constant handling, visible damage
- Lighting: Harsh shadows, one tube completely out `brightness(0.7) contrast(1.2)` — dramatic side-lighting effect

**Desk Section:**
- Surface condition: Extensive staining, grime, ink spills, visible disorder
- **Paper scatter**: Chaotic, papers falling off edge of desk (visible overhang), covers ~85%+ of desk (extreme clutter)
- Papers at extreme angles, some crumpled
- Objects partially obscured by paper chaos
- Telephone cord tangled/messy (optional detail)

---

### 3.2 National Crest Sprite Overlays (3 variants)

**Purpose:** Faction identification emblems displayed above the wall map. These are rendered as sprite overlays on top of the unified HQ background.

**Technical Specifications:**
- **Dimensions**: 512 × 512 pixels (source resolution, will be scaled to ~120×140px in-game)
- **Format**: PNG with **transparent background** (alpha channel required)
- **Style**: Official coat of arms in full color, mounted on wooden plaque with subtle depth/shadow
- **Position in-game**: Centered above map frame, ~50-80px above top edge

#### 3.2.1 RBiH Crest

**File Name:** `rbih_crest.png`

**Description:** Coat of Arms of Republic of Bosnia and Herzegovina (1992-1998 version)

**Visual Elements:**
- **Shield**: White heraldic shield with subtle gold border
- **Symbol**: Six golden fleur-de-lis arranged in diagonal band from upper left to lower right
- **Background**: Royal blue `rgb(30, 60, 140)` behind shield
- **Mounting**: Wooden plaque (oak or walnut), subtle 3D depth with soft shadow
- **Style**: Official state symbol, clean enamel-painted look (not weathered)

**Historical Note:** The fleur-de-lis (golden lily) is the traditional Bosnian symbol representing multiethnic Bosnia.

#### 3.2.2 RS Crest

**File Name:** `rs_crest.png`

**Description:** Coat of Arms of Republika Srpska (1992 version)

**Visual Elements:**
- **Shield**: Divided into horizontal red/blue/white tricolor stripes (Serbian colors)
- **Central symbol**: White Serbian cross with four Cyrillic "С" letters in each quadrant (četiri s)
- **Eagle**: Double-headed golden eagle positioned above shield
- **Border**: Ornate heraldic border around shield
- **Mounting**: Wooden plaque, subtle 3D depth
- **Style**: Official heraldic style based on Serbian royal heraldry

#### 3.2.3 HRHB Crest

**File Name:** `hrhb_crest.png`

**Description:** Coat of Arms of Croatian Republic of Herzeg-Bosnia (1992-1994 version)

**Visual Elements:**
- **Shield**: Red-white checkerboard pattern (šahovnica) — 5×5 grid starting with red square in upper left
- **Crown**: Golden crown positioned above checkerboard
- **Background**: Royal blue `rgb(30, 70, 130)` behind shield
- **Border**: Decorative heraldic border
- **Mounting**: Wooden plaque, subtle 3D depth
- **Style**: Official Croatian heraldic style

---

### 3.3 Military Headgear Sprite Overlays (6 variants: 3 factions × 2 states)

**Purpose:** Faction-specific military headgear prop on desk, changes condition based on desperation state (stable vs desperate). Rendered as sprite overlay on unified HQ background.

**Technical Specifications:**
- **Dimensions**: 256 × 256 pixels (source resolution, will be scaled to ~100×120px in-game)
- **Format**: PNG with **transparent background** (alpha channel required)
- **Perspective**: Viewed from slightly above (~10-15° downward angle) resting on wooden desk surface, matching the desk perspective in the HQ background
- **Lighting**: Match HQ background lighting (bright for stable, dim for desperate)
- **Position in-game**: Left side of desk, on desk edge or slight overhang

#### 3.3.1 RBiH Green Beret — Stable

**File Name:** `headgear_rbih_stable.png`

**Description:** ARBiH (Army of Republic of Bosnia-Herzegovina) officer's beret

**Visual Elements:**
- **Color**: Dark forest green `rgb(30, 60, 30)`
- **Badge**: Golden embroidered fleur-de-lis (lily) badge on front center
- **Condition**: Clean, well-maintained, fabric shows crisp texture
- **Placement**: Neatly positioned on desk edge, slight shadow cast onto desk surface
- **Lighting**: Bright, even lighting

**Historical Note:** "Zelene beretke" (Green Berets) were distinctive ARBiH headgear.

#### 3.3.2 RBiH Green Beret — Desperate

**File Name:** `headgear_rbih_desperate.png`

**Changes from Stable:**
- **Color**: Faded to lighter green `rgb(50, 80, 50)` (sun/wear fading)
- **Condition**: Worn, slight creases, fabric shows wear
- **Badge**: Slightly tarnished (less shiny)
- **Placement**: Carelessly tossed, crumpled, not neatly positioned
- **Lighting**: Dim, harsh shadows

#### 3.3.3 RS Šajkača Field Cap — Stable

**File Name:** `headgear_rs_stable.png`

**Description:** VRS (Army of Republika Srpska) traditional Serbian field cap

**Visual Elements:**
- **Color**: Blue-grey military wool `rgb(70, 80, 90)`
- **Shape**: Boat-shaped cap with central crease running front to back (characteristic šajkača style)
- **Badge**: Red/blue/white tricolor cockade badge pinned to front
- **Condition**: Clean, fabric crisp
- **Placement**: Neatly positioned, 45-degree angle
- **Lighting**: Bright, even

**Historical Note:** Šajkača is traditional Serbian military cap, widely used by VRS forces.

#### 3.3.4 RS Šajkača Field Cap — Desperate

**File Name:** `headgear_rs_desperate.png`

**Changes from Stable:**
- **Color**: Faded blue-grey `rgb(90, 95, 100)`
- **Condition**: Worn fabric, creases, field use visible
- **Badge**: Cockade slightly askew or tarnished
- **Placement**: Carelessly tossed, not aligned
- **Lighting**: Dim, harsh shadows

#### 3.3.5 HRHB Peaked Officer's Cap — Stable

**File Name:** `headgear_hrhb_stable.png`

**Description:** HVO (Croatian Defense Council) officer's peaked cap

**Visual Elements:**
- **Color**: Blue-grey military fabric `rgb(60, 70, 80)`
- **Style**: Stiff visor, tall crown, formal officer cap (similar to Croatian Army style)
- **Badge**: Croatian checkerboard (šahovnica) badge on front above visor
- **Braid**: Gold braid trim on visor edge
- **Condition**: Clean, formal, crisp
- **Placement**: Neatly positioned, 45-degree angle
- **Lighting**: Bright, even

#### 3.3.6 HRHB Peaked Officer's Cap — Desperate

**File Name:** `headgear_hrhb_desperate.png`

**Changes from Stable:**
- **Condition**: Well-worn, visor scuffed
- **Braid**: Slightly tarnished (less shiny gold)
- **Placement**: Carelessly placed on its side (not upright), shows field use
- **Lighting**: Dim, harsh shadows

---

### 3.4 Ashtray Sprite Overlays (4 desperation variants)

**Purpose:** Visual indicator of headquarters desperation/stress. Same for all factions. Rendered as sprite overlay on unified HQ background.

**Technical Specifications:**
- **Dimensions**: 256 × 256 pixels (source resolution, will be scaled to ~80×80px in-game)
- **Format**: PNG with **transparent background** (alpha channel required)
- **Perspective**: Viewed from slightly above (~10-15° downward angle), matching desk perspective
- **Object**: Clear glass ashtray (1990s style), circular, ~10cm diameter
- **Position in-game**: Center-right of desk

#### 3.4.1 Ashtray — Stable

**File Name:** `ashtray_stable.png`

**Visual Elements:**
- **Cigarette count**: 1-2 cigarette butts
- **Condition**: Clean glass ashtray, fresh butts with light ash
- **Details**: Filter tips visible (white/tan), slight ash dust
- **Lighting**: Bright, glass shows clear reflections

#### 3.4.2 Ashtray — Strained

**File Name:** `ashtray_strained.png`

**Visual Elements:**
- **Cigarette count**: 5-7 cigarette butts
- **Condition**: Half-full, some butts crushed
- **Details**: More ash accumulated, filters darkened
- **Lighting**: Slightly dim

#### 3.4.3 Ashtray — Critical

**File Name:** `ashtray_critical.png`

**Visual Elements:**
- **Cigarette count**: 10-15 cigarette butts
- **Condition**: Nearly full, tightly packed
- **Details**: Heavy ash buildup, butts compressed together
- **Lighting**: Dim, harsh shadows

#### 3.4.4 Ashtray — Desperate

**File Name:** `ashtray_desperate.png`

**Visual Elements:**
- **Cigarette count**: 18+ cigarette butts overflowing
- **Condition**: Completely full, pile-up visible
- **Details**:
  - Butts piled high above rim
  - 2-3 butts on desk surface outside ashtray (overflow)
  - Ash scattered on desk around ashtray
  - Glass ashtray barely visible under butts
- **Lighting**: Dim, dramatic shadows

---

### 3.5 Coffee Cup Sprite Overlays (4 desperation variants)

**Purpose:** Visual indicator of headquarters desperation/stress. Same for all factions. Rendered as sprite overlay on unified HQ background.

**Technical Specifications:**
- **Dimensions**: 256 × 256 pixels (source resolution, will be scaled to ~60×80px in-game)
- **Format**: PNG with **transparent background** (alpha channel required)
- **Perspective**: Viewed from slightly above (~10-15° downward angle), matching desk perspective
- **Object**: Simple ceramic coffee cup(s), white or tan, 1990s Yugoslav style
- **Position in-game**: Right edge of desk

#### 3.5.1 Coffee Cup — Stable

**File Name:** `coffee_stable.png`

**Visual Elements:**
- **Cup count**: 1 cup
- **Condition**: Single cup, half-full of dark coffee
- **Details**: Clean rim, no stains on desk surface
- **Lighting**: Bright, clean ceramic

#### 3.5.2 Coffee Cup — Strained

**File Name:** `coffee_strained.png`

**Visual Elements:**
- **Cup count**: 1 cup
- **Condition**: Empty cup, dried coffee ring stain inside
- **Details**: Slight brown residue visible inside cup, minor staining on desk near cup
- **Lighting**: Slightly dim

#### 3.5.3 Coffee Cup — Critical

**File Name:** `coffee_critical.png`

**Visual Elements:**
- **Cup count**: 2 cups
- **Condition**:
  - Cup 1: Empty with heavy staining inside
  - Cup 2: Half-empty, rim shows dried coffee
- **Details**: Coffee ring stains on desk surface under/near cups
- **Lighting**: Dim, harsh shadows

#### 3.5.4 Coffee Cup — Desperate

**File Name:** `coffee_desperate.png`

**Visual Elements:**
- **Cup count**: 3+ cups
- **Condition**:
  - Cup 1: Tipped over on its side, dried spill visible
  - Cup 2: Empty, heavily stained
  - Cup 3: Half-full, rim dirty
- **Details**:
  - Large coffee spill/stain on desk surface
  - Multiple coffee rings overlapping
  - General disorder
- **Lighting**: Dim, dramatic shadows

---

## 4. Asset Organization and Delivery

### 4.1 Folder Structure

Please organize deliverables in this folder structure:

```
AWWV_UI_Assets/
├── hq_backgrounds/
│   ├── hq_background_stable.png       (2048×1152, RGB)
│   ├── hq_background_strained.png     (2048×1152, RGB)
│   ├── hq_background_critical.png     (2048×1152, RGB)
│   └── hq_background_desperate.png    (2048×1152, RGB)
├── crests/
│   ├── rbih_crest.png                 (512×512, RGBA)
│   ├── rs_crest.png                   (512×512, RGBA)
│   └── hrhb_crest.png                 (512×512, RGBA)
├── headgear/
│   ├── headgear_rbih_stable.png       (256×256, RGBA)
│   ├── headgear_rbih_desperate.png    (256×256, RGBA)
│   ├── headgear_rs_stable.png         (256×256, RGBA)
│   ├── headgear_rs_desperate.png      (256×256, RGBA)
│   ├── headgear_hrhb_stable.png       (256×256, RGBA)
│   └── headgear_hrhb_desperate.png    (256×256, RGBA)
├── props/
│   ├── ashtray_stable.png             (256×256, RGBA)
│   ├── ashtray_strained.png           (256×256, RGBA)
│   ├── ashtray_critical.png           (256×256, RGBA)
│   ├── ashtray_desperate.png          (256×256, RGBA)
│   ├── coffee_stable.png              (256×256, RGBA)
│   ├── coffee_strained.png            (256×256, RGBA)
│   ├── coffee_critical.png            (256×256, RGBA)
│   └── coffee_desperate.png           (256×256, RGBA)
└── references/
    └── [Any reference images used]
```

### 4.2 File Naming Conventions

- **Lowercase only**, underscore-separated (`snake_case`)
- **Descriptive names**: `hq_background_stable.png`, not `bg1.png`
- **Consistent suffixes**: `_stable`, `_strained`, `_critical`, `_desperate`

### 4.3 Technical Requirements

**All Assets:**
- **Color space**: sRGB
- **Compression**: PNG-8 for simple graphics, PNG-24 for complex gradients
- **No metadata**: Strip EXIF/metadata to reduce file size

**HQ Backgrounds** (4 files):
- **Dimensions**: Exactly 2048 × 1152 pixels (16:9 aspect ratio)
- **Format**: PNG, 24-bit RGB (no alpha channel)
- **File size target**: <2 MB per file (optimize with tools like TinyPNG if needed)

**Sprite Overlays** (crests, headgear, props):
- **Alpha channel required**: Transparent background (RGBA)
- **Edge treatment**: Soft anti-aliased edges (no hard jaggies)
- **File size target**: <500 KB per sprite
- **Padding**: Ensure sprite content doesn't touch canvas edges (leave 10-20px margin for safe cropping)

### 4.4 Quality Checklist

Before delivery, please verify:

- [ ] All file names match specifications exactly
- [ ] All dimensions are correct (2048×1152 for HQ, 512×512 for crests, 256×256 for props)
- [ ] Transparent backgrounds use alpha channel (RGBA) for sprites
- [ ] RGB (no alpha) for HQ backgrounds
- [ ] Colors match specified RGB values (faction colors, environmental palette)
- [ ] Lighting consistency: bright → dim progression across desperation states
- [ ] Text is in English (no Bosnian/Serbian/Croatian text except where historical accuracy requires transliterated names)
- [ ] All assets are visually aligned to 2D overhead/angled perspective
- [ ] Metadata stripped from PNG files

---

## 5. Reference Materials Provided

The following reference materials have been provided separately:

1. **Sora-generated reference images** (3 images):
   - Image 1: NATO tactical map with colored hatching zones
   - Image 2: Operational planning map with topographic base
   - Image 3: Command room interior with desk and props

2. **SORA_PROMPTS_UI.md**: Detailed text prompts used to generate the reference images (can be used as additional guidance)

3. **Historical coat of arms references**:
   - RBiH coat of arms (1992-1998 version)
   - RS coat of arms (1992 version)
   - HRHB coat of arms (1992-1994 version)

4. **Military headgear references**:
   - ARBiH green beret photos
   - VRS šajkača field cap photos
   - HVO peaked officer's cap photos

---

## 6. Timeline and Milestones

**Estimated Timeline:** 10-15 working days

**Suggested Milestones:**

1. **Days 1-3**: HQ background drafts (1 draft of stable state for approval)
2. **Day 4**: Revisions to HQ background stable state based on feedback
3. **Days 5-7**: Complete all 4 HQ backgrounds (strained, critical, desperate)
4. **Days 8-10**: Faction sprite overlays (crests + headgear, 9 files total)
5. **Days 11-13**: Desperation sprite overlays (ashtray + coffee, 8 files total)
6. **Days 14-15**: Revisions and final delivery

**Approval Gates:**
- HQ background stable state requires approval before proceeding to other states
- One complete set (HQ + all sprites for one desperation state) requires approval before batch completion

---

## 7. Budget and Licensing

**Budget:** [To be discussed with client]

**Usage Rights:**
- Client requires **full commercial usage rights** for all delivered assets
- Assets will be used in a commercial video game distributed digitally
- Client may require derivative works (resizing, color adjustments) without additional fees
- Credit will be provided in game credits as "[Designer Name] — UI Visual Assets"

**File Ownership:**
- Source files (PSD/AI/etc.) remain property of designer
- Exported PNG files transfer full usage rights to client upon final payment

---

## 8. Contact and Questions

**Primary Contact:** [Project Manager Name]
**Email:** [Email Address]
**Project Management:** [Link to shared folder / project management tool]

**Questions or Clarifications:**
- If any specification is unclear, please request clarification before beginning work
- Reference images are guides—creative interpretation within the specified style is encouraged
- Historical accuracy is important for crests and headgear; consult provided references

---

## 9. Acceptance Criteria

**Assets will be considered complete when:**

1. All 21 files delivered in correct folder structure
2. All files pass technical requirements checklist (dimensions, format, transparency)
3. Visual style matches NATO tactical aesthetic per reference images
4. Faction crests are historically accurate per provided references
5. Desperation progression is visually clear and consistent across states
6. Client approves final visual quality

**Revisions:**
- Two rounds of revisions included in quote
- Major revisions (>50% rework) will require additional negotiation

---

## 10. Notes and Clarifications

**Important Design Decisions:**

1. **Unified HQ backgrounds**: The same 4 HQ background images are used for all three factions. Faction identity is conveyed through **sprite overlays only** (crests and headgear). This simplifies asset creation and reduces storage requirements.

2. **Sprite overlay system**: Crests, headgear, ashtrays, and coffee cups are rendered as separate transparent PNG sprites positioned on top of the unified HQ background. This allows dynamic swapping based on faction and desperation state.

3. **Text language**: All visible text should be in **English** for accessibility. Historical names (Oslobođenje, Glas Srpske) are transliterated where needed, but keep all body text, labels, and UI elements in English.

4. **Desperation is not faction-specific**: Ashtray and coffee sprites are the same for all three factions—only the national crest and military headgear differ by faction.

5. **Period authenticity**: 1990s technology constraints are intentional. No modern flat-screen monitors, no digital displays, no smartphones. Only period-appropriate props (rotary phones, paper maps, typewritten reports, transistor radios).

6. **Wall cracks as desperation indicator**: The concrete wall behind the map progressively cracks and deteriorates across desperation states, serving as a visual metaphor for the faction's deteriorating situation. This is baked into the base HQ background images (not a separate sprite overlay):
   - **Stable**: Clean wall, no cracks
   - **Strained**: 1-2 hairline cracks (subtle)
   - **Critical**: 3-5 visible branching cracks
   - **Desperate**: Extensive crack network with spalling concrete and exposed rebar

---

**END OF DESIGNER BRIEF**

This document provides all specifications needed to create the visual assets for the AWWV command HQ interface. Please confirm receipt and estimated delivery timeline.
