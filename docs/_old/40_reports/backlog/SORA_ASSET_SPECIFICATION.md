# Sora Asset Specification — A War Without Victory
**Version:** v2.0 (Wall Calendar, No Designer)
**Date:** 2026-02-03
**Status:** Enforceable Rules for AI Image Generation
**Purpose:** Define exactly what Sora can and cannot generate

---

## 1. Core Principle

**Sora generates stage props, not snapshots of gameplay.**

Game state (control zones, desperation, dates, factions) is **never** embedded in Sora-generated images. State is projected onto static plates by the game engine at runtime.

---

## 2. Allowed Assets (Exhaustive List)

### 2.1 HQ Base Plate

**File:** `hq_base_clean.png` (2048×1152 RGB, single image for all factions/states)

**Sora must generate:**
✓ Empty concrete wall (light grey `rgb(160, 160, 165)`, clean surface, **NO CRACKS**)
✓ Wooden desk at 45° angle to camera (dark walnut wood grain, clean, **NO PAPERS**)
✓ Fluorescent lights (on, bright, even lighting from ceiling)
✓ Empty metal/wood map frame mounted on wall (no map content inside)
✓ Blank mounting plaque above map frame (for crest sprite overlay)
✓ **Empty calendar frame** mounted on wall to right of map (wooden or metal frame, **NO DATES, NO NUMBERS**)
✓ Red rotary telephone on desk (far left, 1970s style, coiled cord visible)
✓ Transistor radio on desk (far right, 1990s style, antenna extended, no LED)
✓ Empty spaces on desk for sprite overlays:
  - Left edge: headgear placeholder (subtle shadow optional)
  - Center-right: ashtray placeholder
  - Right edge: coffee cup placeholder

**Viewing specifications:**
- Camera angle: 35-degree downward tilt from eye level
- Camera position: 2 meters from desk front edge
- Desk orientation: 45-degree angle facing camera
- Depth of field: Desk sharp focus, wall slightly softer but readable
- Color grading: Desaturated, slight blue-grey cast (overcast daylight)
- Lighting: Bright, even fluorescent

**What Sora MUST NOT include:**
- ✗ Wall cracks (any state)
- ✗ Scattered papers on desk
- ✗ Newspapers, magazines, reports (any text)
- ✗ Map content in frame
- ✗ Calendar dates, numbers, month names
- ✗ Faction crests on wall
- ✗ Headgear on desk
- ✗ Ashtrays or coffee cups

---

### 2.2 National Crests (3 Isolated Props)

**Files:**
- `crest_rbih_raw.png` (512×512 RGBA)
- `crest_rs_raw.png` (512×512 RGBA)
- `crest_hrhb_raw.png` (512×512 RGBA)

**Sora must generate (one image per faction):**

#### RBiH Crest
✓ Coat of Arms of Republic of Bosnia and Herzegovina (1992-1998)
✓ White shield with six golden fleur-de-lis (diagonal band arrangement)
✓ Blue background `rgb(30, 60, 140)`
✓ Mounted on wooden plaque (oak/walnut, subtle depth/shadow)
✓ Full color, official state symbol style
✓ Photographed straight-on (no angle)
✓ Isolated on **transparent background** (alpha channel)

#### RS Crest
✓ Coat of Arms of Republika Srpska (1992)
✓ Serbian cross with four Cyrillic "С" (četiri s)
✓ Red/blue/white tricolor shield
✓ Double-headed golden eagle above shield
✓ Ornate heraldic border
✓ Mounted on wooden plaque
✓ Isolated on **transparent background**

#### HRHB Crest
✓ Coat of Arms of Croatian Republic of Herzeg-Bosnia (1992-1994)
✓ Red-white checkerboard (šahovnica), 5×5 grid
✓ Golden crown above checkerboard
✓ Royal blue background `rgb(30, 70, 130)`
✓ Decorative heraldic border
✓ Mounted on wooden plaque
✓ Isolated on **transparent background**

**Lighting:** Even, neutral (no directional shadows)
**Style:** Official heraldic art, enamel-painted look

---

### 2.3 Military Headgear (6 Isolated Props)

**Files:**
- `headgear_rbih_stable.png` (256×256 RGBA)
- `headgear_rbih_desperate.png` (256×256 RGBA)
- `headgear_rs_stable.png` (256×256 RGBA)
- `headgear_rs_desperate.png` (256×256 RGBA)
- `headgear_hrhb_stable.png` (256×256 RGBA)
- `headgear_hrhb_desperate.png` (256×256 RGBA)

**Sora must generate (one image per variant):**

#### RBiH Green Beret — Stable
✓ Dark forest green beret `rgb(30, 60, 30)`
✓ Golden embroidered fleur-de-lis badge on front
✓ Clean, well-maintained fabric
✓ Neatly positioned (as if placed carefully on desk edge)
✓ Slight shadow cast onto wooden surface
✓ Isolated on **transparent background**

#### RBiH Green Beret — Desperate
✓ Faded green beret `rgb(50, 80, 50)` (sun/wear fading)
✓ Worn fabric, creases visible
✓ Badge slightly tarnished
✓ Carelessly tossed (crumpled, not aligned)
✓ Isolated on **transparent background**

#### RS Šajkača — Stable
✓ Blue-grey Serbian field cap `rgb(70, 80, 90)`
✓ Boat-shaped with central crease (traditional šajkača style)
✓ Red/blue/white tricolor cockade badge on front
✓ Clean, crisp fabric
✓ Neatly positioned at 45-degree angle
✓ Isolated on **transparent background**

#### RS Šajkača — Desperate
✓ Faded blue-grey `rgb(90, 95, 100)`
✓ Worn fabric, field use visible
✓ Cockade askew or tarnished
✓ Carelessly tossed, not aligned
✓ Isolated on **transparent background**

#### HRHB Peaked Cap — Stable
✓ Blue-grey peaked officer's cap `rgb(60, 70, 80)`
✓ Stiff visor, tall crown (formal officer style)
✓ Croatian checkerboard badge above visor
✓ Gold braid trim on visor edge
✓ Clean, formal, crisp
✓ Neatly positioned at 45-degree angle
✓ Isolated on **transparent background**

#### HRHB Peaked Cap — Desperate
✓ Well-worn visor, scuffed
✓ Braid slightly tarnished (less shiny)
✓ Placed on its side (not upright)
✓ Shows field use
✓ Isolated on **transparent background**

**Perspective:** Viewed from slightly above (~10-15° downward angle), as if resting on wooden desk
**Lighting:** Match HQ base lighting (bright for stable, dim for desperate)

---

### 2.4 Ashtray States (4 Isolated Props)

**Files:**
- `ashtray_stable.png` (256×256 RGBA)
- `ashtray_strained.png` (256×256 RGBA)
- `ashtray_critical.png` (256×256 RGBA)
- `ashtray_desperate.png` (256×256 RGBA)

**Sora must generate (one image per variant):**

#### Stable
✓ Clear glass ashtray (1990s style, circular, ~10cm diameter)
✓ 1-2 cigarette butts (filter tips white/tan)
✓ Light ash dust
✓ Clean glass, reflections visible
✓ Isolated on **transparent background**

#### Strained
✓ Same ashtray
✓ 5-7 cigarette butts
✓ Half-full, some crushed
✓ More ash accumulated
✓ Isolated on **transparent background**

#### Critical
✓ Same ashtray
✓ 10-15 cigarette butts
✓ Nearly full, tightly packed
✓ Heavy ash buildup
✓ Isolated on **transparent background**

#### Desperate
✓ Same ashtray
✓ 18+ cigarette butts overflowing
✓ Pile-up above rim
✓ 2-3 butts on "ground" outside ashtray (will be composited onto desk)
✓ Ash scattered around ashtray base
✓ Isolated on **transparent background**

**Perspective:** Overhead ~10-15° downward angle
**Lighting:** Bright, even (no harsh shadows)

---

### 2.5 Coffee Cup States (4 Isolated Props)

**Files:**
- `coffee_stable.png` (256×256 RGBA)
- `coffee_strained.png` (256×256 RGBA)
- `coffee_critical.png` (256×256 RGBA)
- `coffee_desperate.png` (256×256 RGBA)

**Sora must generate (one image per variant):**

#### Stable
✓ Single white/tan ceramic cup (1990s Yugoslav style)
✓ Half-full of dark coffee
✓ Clean rim, no stains
✓ Isolated on **transparent background**

#### Strained
✓ Same cup
✓ Empty, dried coffee ring inside
✓ Slight brown residue visible
✓ Isolated on **transparent background**

#### Critical
✓ 2 cups
✓ Cup 1: Empty with heavy staining inside
✓ Cup 2: Half-empty, rim shows dried coffee
✓ Isolated on **transparent background**

#### Desperate
✓ 3+ cups
✓ Cup 1: Tipped on side, dried spill visible
✓ Cup 2: Empty, heavily stained
✓ Cup 3: Half-full, dirty rim
✓ Coffee spill/stain on "ground" (will be composited onto desk)
✓ Isolated on **transparent background**

**Perspective:** Overhead ~10-15° downward angle
**Lighting:** Bright, even

---

## 3. Prohibited Assets (What Sora Must Never Generate)

### 3.1 Absolute Prohibitions

**Sora MUST NEVER generate images containing:**

✗ **Wall cracks** (any severity, any state)
  - Rationale: Cracks are SVG overlays, opacity-controlled by engine

✗ **Paper scatter on desk**
  - Rationale: Paper sprites positioned procedurally by engine

✗ **Newspapers with any text** (mastheads, headlines, dates, body text)
  - Rationale: Newspaper content generated from game state T-1 events

✗ **Magazines with any text or graphics** (covers, charts, titles)
  - Rationale: Magazine content generated from aggregated turn data

✗ **Situation reports with any text**
  - Rationale: Reports generated from game state

✗ **Maps with control zones, colors, symbols, or annotations**
  - Rationale: Maps rendered dynamically every turn from settlement substrate

✗ **Calendar pages with dates, numbers, month names, or week markers**
  - Rationale: Calendar content rendered from current turn state

✗ **Clock hands** (if clock were used instead of calendar)
  - Rationale: Would be positioned by engine based on current turn

✗ **Turn/Date cards with any text** ("Week XX", "June 1992", etc.)
  - Rationale: Text rendered by engine from turn counter

✗ **Any element embedded in base HQ image that contains game state:**
  - Faction control information
  - Desperation indicators (except isolated props like ashtrays)
  - Turn/time information
  - Player faction identity (except isolated crest props)

✗ **Multiple desperation variants of HQ base image**
  - Rationale: ONE base plate only, desperation applied via overlays

✗ **Faction-specific HQ variants**
  - Rationale: ONE unified base for all factions, sprites differentiate

---

## 4. Quality Standards

### 4.1 Technical Requirements

**Resolution:**
- HQ base plate: 2048×1152 (16:9 ratio)
- Crests: 512×512 (will be scaled to ~120×140px in-game)
- Headgear: 256×256 (will be scaled to ~100×120px)
- Ashtrays: 256×256 (will be scaled to ~80×80px)
- Coffee cups: 256×256 (will be scaled to ~60×80px)

**Format:**
- Base plate: PNG 24-bit RGB (no alpha)
- All props: PNG 32-bit RGBA (transparent background required)

**Color space:** sRGB

**Compression:** Lossless PNG (no JPEG artifacts)

### 4.2 Visual Style Requirements

**Period accuracy:**
- 1990s technology only (no modern elements)
- Eastern European office aesthetic
- Socialist-era furniture (1970s-80s heavy wood)
- Utilitarian, not polished (worn but functional)

**Lighting consistency:**
- Bright, even fluorescent (base plate)
- Neutral lighting for isolated props (no strong directional shadows)
- Color temperature: Cool white (5000-6000K)

**Texture detail:**
- Wood grain visible on desk
- Concrete texture on wall (subtle, not distracting)
- Fabric texture on headgear
- Glass reflections on ashtray (if applicable)

**Perspective consistency:**
- Base plate: 35° downward tilt, 45° desk angle
- Isolated props: Slight overhead angle matching desk perspective

---

## 5. Asset Delivery Checklist

Before accepting Sora-generated assets, verify:

- [ ] HQ base plate is **completely clean** (no cracks, papers, maps, dates)
- [ ] Calendar frame is **empty** (no dates, numbers, month names)
- [ ] Map frame is **empty** (no control zones, colors)
- [ ] All isolated props have **transparent backgrounds** (alpha channel)
- [ ] Props are photographed in **isolation** (no desk/wall visible in frame)
- [ ] Headgear variants show clear **stable vs desperate** condition difference
- [ ] Ashtray cigarette counts match specification (1-2, 5-7, 10-15, 18+)
- [ ] Coffee cup counts match specification (1, 1, 2, 3+)
- [ ] Lighting is **neutral** for props (no harsh directional shadows)
- [ ] Perspective matches specification (overhead angle for desk items)
- [ ] Color grading is desaturated with blue-grey cast (base plate only)
- [ ] NO game state embedded in any image

---

## 6. Sora Prompt Structure Template

**All Sora prompts must follow this structure:**

```
[ASSET TYPE]: [SPECIFIC ITEM]

Visual description:
- [Key visual elements, materials, colors]
- [Period accuracy requirements (1990s)]
- [Condition/state if applicable]

Technical requirements:
- Resolution: [dimensions]
- Format: PNG [RGB/RGBA]
- Background: [solid/transparent]
- Perspective: [camera angle]
- Lighting: [type, quality]

PROHIBITED ELEMENTS:
- [List what must NOT appear in image]

Style: Photorealistic, [additional style notes]
```

**Example (HQ Base Plate):**

```
ASSET TYPE: Command HQ Base Plate

Visual description:
- Empty concrete wall, light grey (rgb 160,160,165), clean surface, NO CRACKS
- Heavy wooden desk at 45° angle, dark walnut grain, clean, NO PAPERS
- Fluorescent ceiling lights, bright, even lighting
- Empty metal/wood map frame mounted on wall (no map inside)
- Empty calendar frame on wall right of map (no dates/numbers)
- Red rotary telephone on desk far left
- Transistor radio on desk far right
- Empty spaces for sprite overlays (headgear left, ashtray center-right, coffee right)

Technical requirements:
- Resolution: 2048×1152
- Format: PNG RGB
- Background: Solid (part of scene)
- Perspective: 35° downward tilt, camera 2m from desk, desk at 45° to camera
- Lighting: Bright fluorescent, even, cool white (5000-6000K)
- Color grading: Desaturated, slight blue-grey cast

PROHIBITED ELEMENTS:
- NO wall cracks
- NO scattered papers
- NO newspapers/magazines/reports
- NO map content in frame
- NO calendar dates/numbers
- NO faction crests
- NO headgear/ashtrays/coffee cups
- NO game state of any kind

Style: Photorealistic, 1990s Eastern European office, utilitarian aesthetic
```

---

## 7. Version Control

**Asset versioning:**
- `v1` = Initial Sora generation
- `v2` = Photoshop post-processing (cutouts, cleanup)
- `v3` = Engine integration testing

**Filename convention:**
```
[asset_name]_v[version].png

Examples:
hq_base_clean_v1.png
crest_rbih_raw_v1.png
headgear_rs_stable_v2.png
```

---

## 8. Approval Criteria

**An asset is approved when:**
1. ✓ Matches specification exactly (no deviations)
2. ✓ Contains NO prohibited elements
3. ✓ Technical requirements met (resolution, format, transparency)
4. ✓ Visual quality acceptable (period accuracy, lighting, texture)
5. ✓ Integrates correctly with engine (tested in-game)

**An asset is rejected when:**
1. ✗ Contains any game state (dates, control zones, desperation markers)
2. ✗ Wrong format (RGB instead of RGBA for props, or vice versa)
3. ✗ Wrong perspective (doesn't match desk angle)
4. ✗ Anachronistic elements (modern technology visible)
5. ✗ Technical defects (artifacts, incorrect alpha channel)

---

**END OF SORA ASSET SPECIFICATION**

**Status:** Ready for prompt writing

**Next step:** Write executable Sora prompts following this specification
