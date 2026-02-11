# GUI Implementation Plan — A War Without Victory
**Version:** 1.0
**Date:** 2026-02-05
**Audience:** Non-technical implementer with Sora + Photoshop access
**Purpose:** Step-by-step guide to create AWWV command HQ interface

---

## 📋 Table of Contents

1. [Overview & Preparation](#1-overview--preparation)
2. [Phase 1: Generate Sora Assets](#2-phase-1-generate-sora-assets)
3. [Phase 2: Post-Process in Photoshop](#3-phase-2-post-process-in-photoshop)
4. [Phase 3: Create Photoshop Templates](#4-phase-3-create-photoshop-templates)
5. [Phase 4: Organize Asset Delivery](#5-phase-4-organize-asset-delivery)
6. [Quality Checklist](#6-quality-checklist)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Overview & Preparation

### 1.1 What You're Building

You're creating visual assets for a command headquarters interface showing:
- **Wall section** (top 60%): Strategic map with national crest and calendar
- **Desk section** (bottom 40%): Wooden desk with props (phone, headgear, newspapers, ashtray, coffee)

### 1.2 Key Architecture Principle

**CRITICAL RULE:** Sora generates **stage props**, NOT snapshots of gameplay.

This means:
- ✅ Sora creates: Empty rooms, isolated objects, clean surfaces
- ❌ Sora NEVER creates: Maps with control zones, calendars with dates, newspapers with text
- ✅ Game engine adds: Dynamic content (map colors, dates, headlines) at runtime

**Why?** Game state changes every turn. If you bake state into images, they can't update. Instead: clean "stage" + dynamic "projections" = flexible UI.

### 1.3 Required Tools

- **Sora AI**: Image generation (OpenAI Sora access)
- **Photoshop**: Post-processing, cutouts, templates
- **File manager**: Organize 40+ final assets

### 1.4 Asset Inventory (What You'll Create)

| Category | Quantity | Purpose |
|----------|----------|---------|
| **HQ Base Plate** | 1 image | Unified background (wall + desk), used for all factions |
| **National Crests** | 3 images | Faction identification (RBiH, RS, HRHB) — sprite overlays |
| **Military Headgear** | 6 images | Faction props on desk (3 factions × 2 conditions) — sprite overlays |
| **Ashtray States** | 4 images | Desperation indicator (stable/strained/critical/desperate) — sprite overlays |
| **Coffee Cup States** | 4 images | Desperation indicator (stable/strained/critical/desperate) — sprite overlays |
| **Calendar Template** | 1 PSD | Layout grid for engine to render dates |
| **Newspaper Template** | 1 PSD | 3-column layout for engine to render headlines |
| **Magazine Template** | 1 PSD | Cover layout for monthly statistics |
| **Report Template** | 1 PSD | Memo layout for situation reports |

**Total deliverables:** 18 PNG images + 4 PSD templates = 22 files

---

## 2. Phase 1: Generate Sora Assets

### 2.1 Asset 1: HQ Base Plate (Most Important!)

**Goal:** One unified background image showing empty war room (wall + desk), NO game state.

#### Sora Prompt for HQ Base Plate

```
ASSET: Command Headquarters Base Plate

A photorealistic 2D illustration of a 1990s Bosnian War command headquarters
viewed from a cinematic overhead angle. The camera is tilted 35 degrees
downward, positioned 2 meters from the front edge of a heavy wooden desk.

COMPOSITION:

TOP SECTION (Wall, 60% of frame):
- Light grey concrete wall, RGB(160, 160, 165), clean surface with NO CRACKS
- Empty metal/wood tactical map frame mounted on wall (no map content inside,
  just empty frame)
- Blank wooden mounting plaque centered above map frame (50-80px above frame,
  for future coat of arms sprite overlay, currently empty)
- Empty wooden calendar frame mounted on wall to right of map (no dates, no
  numbers, just empty wooden frame)
- Bright fluorescent ceiling lights, even illumination, cool white (5000-6000K)
- Classification stamps: Red "TOP SECRET" stamp near upper left of map frame,
  red "SECRET NOFORN" stamp near lower right
- Black UTM grid reference numbers along left/right edges of map frame

BOTTOM SECTION (Desk, 40% of frame):
- Heavy 1970s socialist-era wooden desk, dark walnut wood grain, facing camera
  at 45-degree angle
- Clean desk surface (minimal wear, 1-2 faint coffee ring stains acceptable)
- Red rotary telephone on far left (1970s style, coiled cord visible)
- Small transistor radio on far right (1990s style, antenna extended, no LED)
- Empty spaces for future sprite overlays:
  * Left side: subtle shadow placeholder (for headgear sprite)
  * Center-right: subtle shadow placeholder (for ashtray sprite)
  * Right edge: subtle shadow placeholder (for coffee cup sprite)
- NO scattered papers
- NO newspapers, magazines, or reports visible
- NO ashtrays or coffee cups
- NO military headgear

TECHNICAL REQUIREMENTS:
- Resolution: 2048×1152 pixels (16:9 aspect ratio)
- Format: RGB (not RGBA, this is a background)
- Perspective: 35° downward camera tilt, desk at 45° angle to camera
- Depth of field: Desk in sharp focus (foreground), wall slightly softer but
  fully readable (background)
- Lighting: Bright, even fluorescent lighting
- Color grading: Desaturated with slight blue-grey cast (overcast daylight
  through unseen window)

STRICTLY PROHIBITED ELEMENTS (DO NOT INCLUDE):
- NO wall cracks (any severity)
- NO scattered papers on desk
- NO map content in frame (frame must be empty)
- NO calendar dates, numbers, or month names
- NO faction coat of arms on wall
- NO military headgear, ashtrays, or coffee cups
- NO newspapers, magazines, or reports with text
- NO game state of any kind

STYLE: Photorealistic, 1990s Eastern European administrative office converted
for wartime use, utilitarian aesthetic (not cinematic), NATO tactical command
center vibe, modest and functional.
```

**Expected Result:** Clean background showing empty room ready for game engine to add dynamic content.

**Save as:** `hq_base_clean_v1_sora.png`

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
- Official state symbol style, clean enamel-painted look (not weathered)

TECHNICAL REQUIREMENTS:
- Resolution: 512×512 pixels (square)
- Format: RGBA (transparent background REQUIRED)
- Perspective: Photographed straight-on (no angle, centered)
- Lighting: Even, neutral (no harsh directional shadows)
- Style: Professional heraldic illustration, enamel-painted metal or wood

COMPOSITION: The plaque with coat of arms should be centered in frame with
20-30px margin on all sides (not touching canvas edges). Background MUST be
fully transparent (alpha channel).

STYLE: Official state heraldic art, multiethnic Bosnia symbolism, period-
accurate 1992-1998 design.
```

**Save as:** `crest_rbih_v1_sora.png`

#### Sora Prompt: RS Crest

```
ASSET: RS National Crest (Coat of Arms)

High-resolution render of the Coat of Arms of Republika Srpska (1992 version)
for game UI overlay.

VISUAL ELEMENTS:
- Serbian cross (white cross) with four Cyrillic "С" letters in each quadrant
  (četiri s symbol)
- Shield divided into horizontal red/blue/white tricolor stripes (Serbian
  national colors)
- Double-headed golden eagle positioned above shield
- Ornate heraldic border around shield
- Mounted on dark wooden plaque with slight 3D depth
- Soft shadow cast by plaque

TECHNICAL REQUIREMENTS:
- Resolution: 512×512 pixels (square)
- Format: RGBA (transparent background REQUIRED)
- Perspective: Straight-on, centered
- Lighting: Even, neutral
- Style: Official Serbian royal heraldic style

COMPOSITION: Centered with 20-30px margin, transparent background.

STYLE: Serbian royal heraldry, official RS state symbol 1992 design.
```

**Save as:** `crest_rs_v1_sora.png`

#### Sora Prompt: HRHB Crest

```
ASSET: HRHB National Crest (Coat of Arms)

High-resolution render of the Coat of Arms of Croatian Republic of Herzeg-
Bosnia (1992-1994 version) for game UI overlay.

VISUAL ELEMENTS:
- Red-white checkerboard pattern (šahovnica) — 5×5 grid starting with red
  square in upper left corner
- Golden crown positioned above checkerboard
- Royal blue background behind shield, RGB(30, 70, 130)
- Decorative heraldic border around shield
- Mounted on dark wooden plaque with slight 3D depth
- Soft shadow cast by plaque

TECHNICAL REQUIREMENTS:
- Resolution: 512×512 pixels (square)
- Format: RGBA (transparent background REQUIRED)
- Perspective: Straight-on, centered
- Lighting: Even, neutral
- Style: Official Croatian heraldic style

COMPOSITION: Centered with 20-30px margin, transparent background.

STYLE: Croatian heraldic art, official HRHB state symbol 1992-1994.
```

**Save as:** `crest_hrhb_v1_sora.png`

---

### 2.3 Asset Set 3: Military Headgear (6 Images)

**Goal:** Three faction headgear types, each in two conditions (stable vs desperate).

#### Sora Prompt: RBiH Green Beret (Stable)

```
ASSET: RBiH Green Beret — Stable Condition

High-resolution product photograph of ARBiH (Army of Republic of Bosnia-
Herzegovina) green beret for game UI desk prop.

VISUAL ELEMENTS:
- Dark forest green military beret, RGB(30, 60, 30)
- Golden embroidered fleur-de-lis (lily) badge on front center
- Clean, well-maintained fabric with crisp texture
- Neatly positioned as if carefully placed on desk edge
- Slight shadow cast onto wooden desk surface (implied below beret)

TECHNICAL REQUIREMENTS:
- Resolution: 256×256 pixels
- Format: RGBA (transparent background REQUIRED)
- Perspective: Viewed from slightly above (10-15° downward angle), matching
  desk perspective in HQ base plate
- Lighting: Bright, even (matching HQ base lighting)
- Condition: Clean, maintained, no wear

COMPOSITION: Beret centered with 10-20px margin, transparent background,
positioned as if resting on wooden surface.

STYLE: Professional military uniform photography, 1990s Yugoslav War era,
"Zelene beretke" (Green Berets) distinctive ARBiH headgear.
```

**Save as:** `headgear_rbih_stable_v1_sora.png`

#### Sora Prompt: RBiH Green Beret (Desperate)

```
ASSET: RBiH Green Beret — Desperate Condition

Same as stable version BUT with worn, desperate condition:

VISUAL CHANGES:
- Color faded to lighter green RGB(50, 80, 50) (sun/wear fading)
- Worn fabric with visible creases and wrinkles
- Badge slightly tarnished (less shiny, dulled gold)
- Carelessly tossed position (crumpled, not neatly aligned, shows disorder)
- Same perspective and lighting as stable version

TECHNICAL REQUIREMENTS: Same as stable (256×256, RGBA, transparent).

STYLE: Shows heavy use, field wear, exhaustion.
```

**Save as:** `headgear_rbih_desperate_v1_sora.png`

#### Sora Prompt: RS Šajkača (Stable)

```
ASSET: RS Šajkača Field Cap — Stable Condition

High-resolution product photograph of VRS (Army of Republika Srpska)
traditional Serbian field cap for game UI desk prop.

VISUAL ELEMENTS:
- Blue-grey military wool cap, RGB(70, 80, 90)
- Boat-shaped with central crease running front to back (characteristic
  šajkača style)
- Red/blue/white tricolor cockade badge pinned to front
- Clean, crisp fabric
- Neatly positioned at 45-degree angle on desk

TECHNICAL REQUIREMENTS:
- Resolution: 256×256 pixels
- Format: RGBA (transparent background)
- Perspective: Overhead 10-15° downward angle
- Lighting: Bright, even
- Condition: Clean, maintained

COMPOSITION: Centered with margin, transparent background.

STYLE: Traditional Serbian military cap, widely used by VRS forces.
```

**Save as:** `headgear_rs_stable_v1_sora.png`

#### Sora Prompt: RS Šajkača (Desperate)

```
ASSET: RS Šajkača Field Cap — Desperate Condition

Same as stable version BUT with worn condition:

VISUAL CHANGES:
- Faded blue-grey RGB(90, 95, 100)
- Worn fabric showing field use, creases visible
- Cockade slightly askew or tarnished
- Carelessly tossed, not aligned properly

TECHNICAL REQUIREMENTS: Same as stable.

STYLE: Heavy field use, exhausted state.
```

**Save as:** `headgear_rs_desperate_v1_sora.png`

#### Sora Prompt: HRHB Peaked Cap (Stable)

```
ASSET: HRHB Peaked Officer's Cap — Stable Condition

High-resolution product photograph of HVO (Croatian Defense Council) officer's
peaked cap for game UI desk prop.

VISUAL ELEMENTS:
- Blue-grey military fabric, RGB(60, 70, 80)
- Stiff visor, tall crown, formal officer cap style (similar to Croatian Army)
- Croatian checkerboard (šahovnica) badge on front above visor
- Gold braid trim on visor edge
- Clean, formal, crisp condition
- Neatly positioned at 45-degree angle

TECHNICAL REQUIREMENTS:
- Resolution: 256×256 pixels
- Format: RGBA (transparent background)
- Perspective: Overhead 10-15° downward angle
- Lighting: Bright, even
- Condition: Clean, formal

COMPOSITION: Centered with margin, transparent background.

STYLE: Formal HVO officer headgear.
```

**Save as:** `headgear_hrhb_stable_v1_sora.png`

#### Sora Prompt: HRHB Peaked Cap (Desperate)

```
ASSET: HRHB Peaked Officer's Cap — Desperate Condition

Same as stable version BUT with worn condition:

VISUAL CHANGES:
- Visor scuffed, shows heavy use
- Gold braid slightly tarnished (less shiny)
- Placed carelessly on its side (not upright, shows disorder)
- Fabric shows field wear

TECHNICAL REQUIREMENTS: Same as stable.

STYLE: Field use, worn state.
```

**Save as:** `headgear_hrhb_desperate_v1_sora.png`

---

### 2.4 Asset Set 4: Ashtray States (4 Images)

**Goal:** Glass ashtray showing increasing cigarette count across desperation states.

#### Sora Prompt: Ashtray — Stable

```
ASSET: Ashtray — Stable State

Product photograph of clear glass ashtray for game UI desperation indicator.

VISUAL ELEMENTS:
- Clear glass circular ashtray (1990s style, ~10cm diameter)
- 1-2 cigarette butts (filter tips white/tan color visible)
- Light ash dust scattered in ashtray
- Clean glass showing reflections
- Photographed from overhead 10-15° downward angle

TECHNICAL REQUIREMENTS:
- Resolution: 256×256 pixels
- Format: RGBA (transparent background)
- Perspective: Overhead angle matching desk perspective
- Lighting: Bright, even (no harsh shadows)

COMPOSITION: Ashtray centered with margin, transparent background.

STYLE: Clean office environment, minimal use.
```

**Save as:** `ashtray_stable_v1_sora.png`

#### Sora Prompt: Ashtray — Strained

```
ASSET: Ashtray — Strained State

Same ashtray with increased use:

VISUAL CHANGES:
- 5-7 cigarette butts
- Half-full, some butts crushed together
- More ash accumulated
- Same lighting and perspective

TECHNICAL REQUIREMENTS: Same as stable.

STYLE: Moderate use, stress increasing.
```

**Save as:** `ashtray_strained_v1_sora.png`

#### Sora Prompt: Ashtray — Critical

```
ASSET: Ashtray — Critical State

Same ashtray with heavy use:

VISUAL CHANGES:
- 10-15 cigarette butts
- Nearly full, tightly packed together
- Heavy ash buildup obscuring glass bottom
- Same perspective

TECHNICAL REQUIREMENTS: Same as stable.

STYLE: Heavy use, high stress.
```

**Save as:** `ashtray_critical_v1_sora.png`

#### Sora Prompt: Ashtray — Desperate

```
ASSET: Ashtray — Desperate State

Same ashtray overflowing:

VISUAL CHANGES:
- 18+ cigarette butts overflowing above rim
- Pile-up of butts visible
- 2-3 butts on "ground" outside ashtray (will be composited onto desk in
  final render)
- Ash scattered around ashtray base
- Glass barely visible under pile of butts

TECHNICAL REQUIREMENTS: Same as stable.

STYLE: Extreme stress, chaotic use.
```

**Save as:** `ashtray_desperate_v1_sora.png`

---

### 2.5 Asset Set 5: Coffee Cup States (4 Images)

**Goal:** Ceramic coffee cup(s) showing increasing disorder across desperation states.

#### Sora Prompt: Coffee — Stable

```
ASSET: Coffee Cup — Stable State

Product photograph of single ceramic coffee cup for game UI desperation
indicator.

VISUAL ELEMENTS:
- Single white or tan ceramic cup (1990s Yugoslav style)
- Half-full of dark coffee (liquid visible)
- Clean rim, no stains
- Photographed from overhead 10-15° downward angle

TECHNICAL REQUIREMENTS:
- Resolution: 256×256 pixels
- Format: RGBA (transparent background)
- Perspective: Overhead angle
- Lighting: Bright, even

COMPOSITION: Cup centered with margin, transparent background.

STYLE: Clean office environment, single cup in use.
```

**Save as:** `coffee_stable_v1_sora.png`

#### Sora Prompt: Coffee — Strained

```
ASSET: Coffee Cup — Strained State

Same cup, now empty:

VISUAL CHANGES:
- Cup empty, dried coffee ring stain visible inside
- Slight brown residue at bottom
- Minor staining visible on exterior
- Same perspective

TECHNICAL REQUIREMENTS: Same as stable.

STYLE: Empty cup, moderate use.
```

**Save as:** `coffee_strained_v1_sora.png`

#### Sora Prompt: Coffee — Critical

```
ASSET: Coffee Cups — Critical State

Two cups showing increased use:

VISUAL CHANGES:
- Cup 1: Empty with heavy staining inside
- Cup 2: Half-empty, rim shows dried coffee residue
- Both cups positioned close together
- Same perspective

TECHNICAL REQUIREMENTS: Same as stable.

STYLE: Multiple cups, high stress.
```

**Save as:** `coffee_critical_v1_sora.png`

#### Sora Prompt: Coffee — Desperate

```
ASSET: Coffee Cups — Desperate State

Three or more cups in disorder:

VISUAL CHANGES:
- Cup 1: Tipped over on its side, dried coffee spill visible
- Cup 2: Empty, heavily stained interior
- Cup 3: Half-full, dirty rim
- Large coffee spill/stain on "ground" (will be composited onto desk)
- Multiple coffee rings overlapping
- General disorder

TECHNICAL REQUIREMENTS: Same as stable.

STYLE: Chaotic, extreme stress, multiple cups in disarray.
```

**Save as:** `coffee_desperate_v1_sora.png`

---

### 2.6 Phase 1 Summary Checklist

After completing Sora generation, you should have:

- [ ] `hq_base_clean_v1_sora.png` (2048×1152 RGB)
- [ ] `crest_rbih_v1_sora.png` (512×512 RGBA)
- [ ] `crest_rs_v1_sora.png` (512×512 RGBA)
- [ ] `crest_hrhb_v1_sora.png` (512×512 RGBA)
- [ ] `headgear_rbih_stable_v1_sora.png` (256×256 RGBA)
- [ ] `headgear_rbih_desperate_v1_sora.png` (256×256 RGBA)
- [ ] `headgear_rs_stable_v1_sora.png` (256×256 RGBA)
- [ ] `headgear_rs_desperate_v1_sora.png` (256×256 RGBA)
- [ ] `headgear_hrhb_stable_v1_sora.png` (256×256 RGBA)
- [ ] `headgear_hrhb_desperate_v1_sora.png` (256×256 RGBA)
- [ ] `ashtray_stable_v1_sora.png` (256×256 RGBA)
- [ ] `ashtray_strained_v1_sora.png` (256×256 RGBA)
- [ ] `ashtray_critical_v1_sora.png` (256×256 RGBA)
- [ ] `ashtray_desperate_v1_sora.png` (256×256 RGBA)
- [ ] `coffee_stable_v1_sora.png` (256×256 RGBA)
- [ ] `coffee_strained_v1_sora.png` (256×256 RGBA)
- [ ] `coffee_critical_v1_sora.png` (256×256 RGBA)
- [ ] `coffee_desperate_v1_sora.png` (256×256 RGBA)

**Total: 18 Sora-generated images**

---

## 3. Phase 2: Post-Process in Photoshop

### 3.1 Goal

Clean up Sora outputs, remove backgrounds (for sprites), ensure correct alpha channels, and optimize file sizes.

### 3.2 Workflow: HQ Base Plate (No Post-Processing Needed)

The HQ base plate (`hq_base_clean_v1_sora.png`) should be used as-is if Sora followed the prompt correctly.

**Quality Check:**
1. Open in Photoshop
2. Verify dimensions: 2048×1152 pixels
3. Verify RGB mode (no alpha channel)
4. Check that NO game state is present (no cracks, papers, maps, dates)
5. If all checks pass: Export as `hq_background_stable.png` (final name)

**If Sora added prohibited elements:**
- Use Photoshop healing tools to remove them
- Clone stamp for wall cracks (if any)
- Patch tool for scattered papers (if any)
- Save cleaned version as `hq_background_stable.png`

---

### 3.3 Workflow: National Crests (Background Removal)

**For each of the 3 crest images:**

#### Step-by-Step Process

1. **Open Sora image** in Photoshop
   - File → Open → Select `crest_rbih_v1_sora.png` (or RS/HRHB)

2. **Check if background is already transparent**
   - Look at Layers panel: Does layer show transparency (checkerboard pattern)?
   - If YES: Skip to step 6
   - If NO: Continue to step 3

3. **Remove background**
   - Select → Subject (Photoshop AI will select the crest)
   - OR use Magic Wand Tool (W) → Click background → Select → Inverse
   - Select → Modify → Contract by 1px (tightens selection)
   - Layer → New → Layer via Copy (Ctrl+J)
   - Delete original background layer

4. **Refine edges**
   - Select → Select and Mask
   - Adjust:
     - Radius: 0.5px
     - Feather: 0.5px
     - Shift Edge: -10%
   - Output To: New Layer with Layer Mask
   - Click OK

5. **Add subtle drop shadow (optional, recommended)**
   - Double-click layer → Layer Style → Drop Shadow
   - Settings:
     - Blend Mode: Multiply
     - Opacity: 30%
     - Angle: 120° (top-left light)
     - Distance: 2px
     - Spread: 0%
     - Size: 3px
     - Color: Black
   - Click OK

6. **Final check and export**
   - Image → Canvas Size → 512×512 (if not already)
   - Ensure crest is centered
   - File → Export → Export As
   - Format: PNG
   - Settings:
     - Transparency: ON
     - Convert to sRGB: ON
     - Quality: 100%
   - Save as:
     - `rbih_crest.png` (final name, no version suffix)
     - OR `rs_crest.png`
     - OR `hrhb_crest.png`

7. **Save PSD for future edits**
   - File → Save As → `crest_rbih_v1.psd`

**Repeat for all 3 crests.**

---

### 3.4 Workflow: Military Headgear (Background Removal)

**For each of the 6 headgear images:**

Follow the exact same process as National Crests (§3.3), with these changes:

- Canvas size: 256×256 pixels (not 512×512)
- Final export names:
  - `headgear_rbih_stable.png`
  - `headgear_rbih_desperate.png`
  - `headgear_rs_stable.png`
  - `headgear_rs_desperate.png`
  - `headgear_hrhb_stable.png`
  - `headgear_hrhb_desperate.png`

**Additional check for desperate variants:**
- Ensure tossed/crumpled appearance is visible
- Check that colors are visibly faded compared to stable

---

### 3.5 Workflow: Ashtray & Coffee Cup States (Background Removal)

**For each of the 8 prop state images (4 ashtrays + 4 coffee cups):**

Follow the same background removal process (§3.3), with these changes:

- Canvas size: 256×256 pixels
- Final export names:
  - Ashtrays: `ashtray_stable.png`, `ashtray_strained.png`, `ashtray_critical.png`, `ashtray_desperate.png`
  - Coffee: `coffee_stable.png`, `coffee_strained.png`, `coffee_critical.png`, `coffee_desperate.png`

**Quality checks:**
- Ashtray cigarette counts match spec:
  - Stable: 1-2 butts
  - Strained: 5-7 butts
  - Critical: 10-15 butts
  - Desperate: 18+ butts overflowing
- Coffee cup counts match spec:
  - Stable: 1 cup
  - Strained: 1 cup (empty)
  - Critical: 2 cups
  - Desperate: 3+ cups (one tipped over)

---

### 3.6 Phase 2 Summary Checklist

After Photoshop post-processing, you should have:

**Final PNG files (ready for game engine):**
- [ ] `hq_background_stable.png` (2048×1152 RGB)
- [ ] `rbih_crest.png` (512×512 RGBA)
- [ ] `rs_crest.png` (512×512 RGBA)
- [ ] `hrhb_crest.png` (512×512 RGBA)
- [ ] `headgear_rbih_stable.png` (256×256 RGBA)
- [ ] `headgear_rbih_desperate.png` (256×256 RGBA)
- [ ] `headgear_rs_stable.png` (256×256 RGBA)
- [ ] `headgear_rs_desperate.png` (256×256 RGBA)
- [ ] `headgear_hrhb_stable.png` (256×256 RGBA)
- [ ] `headgear_hrhb_desperate.png` (256×256 RGBA)
- [ ] `ashtray_stable.png` (256×256 RGBA)
- [ ] `ashtray_strained.png` (256×256 RGBA)
- [ ] `ashtray_critical.png` (256×256 RGBA)
- [ ] `ashtray_desperate.png` (256×256 RGBA)
- [ ] `coffee_stable.png` (256×256 RGBA)
- [ ] `coffee_strained.png` (256×256 RGBA)
- [ ] `coffee_critical.png` (256×256 RGBA)
- [ ] `coffee_desperate.png` (256×256 RGBA)

**PSD source files (for future edits):**
- [ ] `crest_rbih_v1.psd`, `crest_rs_v1.psd`, `crest_hrhb_v1.psd`
- [ ] `headgear_[faction]_[state]_v1.psd` (6 files)
- [ ] `ashtray_[state]_v1.psd` (4 files)
- [ ] `coffee_[state]_v1.psd` (4 files)

**Total: 18 final PNGs + 17 PSD sources = 35 files**

---

## 4. Phase 3: Create Photoshop Templates

### 4.1 Goal

Create layout templates (PSD files) that define structure for dynamic content. Game engine will fill these templates with text/data at runtime.

### 4.2 Template 1: Wall Calendar Grid

#### What This Template Does

Defines the grid layout for a monthly calendar. Game engine will render:
- Month name (e.g., "JUNE")
- Year (e.g., "1992")
- Day numbers (1-31)
- Red highlight around current week

#### Step-by-Step Creation

1. **Create new Photoshop document**
   - File → New
   - Width: 200px
   - Height: 280px
   - Resolution: 72 ppi
   - Color Mode: RGB
   - Background: White
   - Name: `calendar_template`

2. **Create background layer**
   - Rename "Background" layer to "background"
   - Fill with aged paper color: `#f4e8d8` (cream/beige)
   - Add subtle paper texture:
     - Filter → Noise → Add Noise (2%, Gaussian, Monochromatic)
     - Filter → Blur → Gaussian Blur (0.3px)

3. **Create month/year header areas**
   - New layer: "month_area_guide"
   - Use Rectangle Tool (U), no fill, 2px red stroke
   - Draw rectangle: X=20px, Y=15px, Width=160px, Height=25px
   - Label layer: "month_area (DELETE BEFORE EXPORT)"

   - New layer: "year_area_guide"
   - Draw rectangle: X=20px, Y=40px, Width=160px, Height=20px
   - Label layer: "year_area (DELETE BEFORE EXPORT)"

4. **Create calendar grid**
   - New layer: "grid"
   - Use Line Tool (U), 0.5px grey stroke `rgb(200, 200, 200)`
   - Draw 7 columns × 6 rows:
     - Column width: 26px
     - Row height: 30px
     - Grid origin: X=20px, Y=70px
   - **How to draw:**
     - Vertical lines: 8 lines at X positions: 20, 46, 72, 98, 124, 150, 176, 202
     - Horizontal lines: 7 lines at Y positions: 70, 100, 130, 160, 190, 220, 250

5. **Add day header guides**
   - New layer: "day_headers_guide"
   - Use Text Tool (T)
   - Font: Arial, 10px, Regular, `rgb(60, 60, 60)`
   - Type "M T W T F S S" centered in each column
   - Position Y: ~80px (centered in header row)
   - This is a REFERENCE layer (helps see layout)
   - Label: "day_headers (REFERENCE ONLY)"

6. **Add annotation text layer**
   - New layer: "INSTRUCTIONS"
   - Use Text Tool
   - Font: Arial, 8px
   - Type at top:
     ```
     CALENDAR TEMPLATE v1.0

     Engine renders:
     - Month name at (100, 30)
     - Year at (100, 50)
     - Day headers M-S at row 70
     - Day numbers in grid cells
     - Red rectangle around current week

     Export: calendar_background.png (background layer only)
     Grid is reference only, not exported.
     ```

7. **Organize layers**
   - Layer structure:
     ```
     calendar_template.psd
     ├── INSTRUCTIONS (text layer, hide before export)
     ├── day_headers_guide (reference, hide before export)
     ├── year_area_guide (reference, hide before export)
     ├── month_area_guide (reference, hide before export)
     ├── grid (vector shapes, grey lines)
     └── background (aged paper texture)
     ```

8. **Save PSD**
   - File → Save As → `calendar_template.psd`

9. **Export background texture**
   - Hide all guide/instruction layers
   - Show only: background layer
   - File → Export → Export As
   - Format: PNG
   - Name: `calendar_background.png`
   - Settings: RGB, no transparency, 100% quality

10. **Export layout guide (optional, for developers)**
    - File → Export → Export As
    - Format: SVG
    - Name: `calendar_grid_overlay.svg`
    - This allows developers to read grid coordinates programmatically

**Deliverables from this template:**
- `calendar_template.psd` (source file)
- `calendar_background.png` (200×280 RGB)
- `calendar_grid_overlay.svg` (optional, vector grid for dev reference)

---

### 4.3 Template 2: Newspaper Layout

#### What This Template Does

Defines a 3-column newspaper layout. Game engine will render:
- Masthead (faction-specific newspaper name)
- Date (e.g., "23 June 1992")
- Headline text
- Body text in columns
- Photo with caption

#### Step-by-Step Creation

1. **Create new document**
   - Width: 800px
   - Height: 1200px
   - Resolution: 72 ppi
   - Color Mode: RGB
   - Background: White
   - Name: `newspaper_template`

2. **Create background**
   - Rename "Background" to "background"
   - Fill with yellowed newsprint: `#ebe1cd` (beige)
   - Add newsprint texture:
     - Filter → Noise → Add Noise (3%, Gaussian, Monochromatic)
     - Filter → Blur → Gaussian Blur (0.5px)

3. **Create content area guides (red rectangles, reference only)**

   Use Rectangle Tool with NO FILL, 2px RED STROKE to mark these areas:

   | Area | X | Y | Width | Height | Label |
   |------|---|---|-------|--------|-------|
   | Masthead area | 50 | 30 | 700 | 40 | masthead_area |
   | Date area | 700 | 30 | 80 | 20 | date_area |
   | Headline area | 50 | 90 | 700 | 80 | headline_area |
   | Subhead area | 50 | 180 | 700 | 40 | subhead_area |
   | Photo area | 40 | 240 | 400 | 300 | photo_area |
   | Caption area | 40 | 550 | 400 | 30 | photo_caption_area |
   | Body column 1 | 40 | 590 | 220 | 600 | body_column_1 |
   | Body column 2 | 280 | 240 | 220 | 950 | body_column_2 |
   | Body column 3 | 520 | 240 | 220 | 950 | body_column_3 |

   Each rectangle should be on a separate layer labeled as shown above.

4. **Add typography style guide (text layer)**
   - New layer: "TYPOGRAPHY_GUIDE"
   - Add text showing font specs:
     ```
     NEWSPAPER TEMPLATE v1.0

     Typography:
     - Masthead: Franklin Gothic Bold, 32px, center, black
     - Date: Times New Roman, 14px, right, black
     - Headline: Franklin Gothic Condensed Bold, 36px, center, black
     - Subhead: Times New Roman Italic, 18px, center, black
     - Body: Times New Roman, 11px, justify, black, line-height 1.4
     - Caption: Times New Roman Italic, 10px, left, grey(60,60,60)

     Masthead variants:
     - RBiH: "OSLOBOĐENJE"
     - RS: "GLAS SRPSKE"
     - HRHB: "CROATIAN HERALD"
     ```

5. **Save and export**
   - File → Save As → `newspaper_template.psd`
   - Hide all guide/instruction layers
   - Show only: background
   - Export As → `newspaper_background.png` (800×1200 RGB)

**Deliverables:**
- `newspaper_template.psd` (source)
- `newspaper_background.png` (800×1200 RGB)

---

### 4.4 Template 3: Monthly Magazine Cover

#### Step-by-Step Creation

1. **Create new document**
   - Width: 600px
   - Height: 800px (A4 vertical proportions)
   - Resolution: 72 ppi
   - Name: `magazine_template`

2. **Create background**
   - Professional blue-grey gradient: `#3a4a5a` (top) to `#5a6a7a` (bottom)
   - Gradient Tool (G) → Linear gradient, top to bottom

3. **Create content area guides**

   Red rectangles (reference only) for these areas:

   | Area | X | Y | Width | Height | Label |
   |------|---|---|-------|--------|-------|
   | Title area | 50 | 40 | 500 | 60 | title_area |
   | Month/Year area | 50 | 110 | 500 | 40 | month_year_area |
   | Map preview area | 100 | 170 | 400 | 300 | map_preview_area |
   | Stat box 1 | 80 | 500 | 140 | 120 | stat_box_1 |
   | Stat box 2 | 240 | 500 | 140 | 120 | stat_box_2 |
   | Stat box 3 | 400 | 500 | 140 | 120 | stat_box_3 |
   | Table of contents | 50 | 650 | 500 | 130 | toc_area |

4. **Add typography guide**
   ```
   MAGAZINE TEMPLATE v1.0

   Typography:
   - Title: Arial Bold, 28px, center, white, uppercase
   - Month/Year: Arial Bold, 24px, center, white
   - Stat labels: Arial Bold, 12px, center, dark grey, uppercase
   - Stat values: Arial Bold, 36px, center, black

   Title: "MONTHLY OPERATIONAL REVIEW"
   Month format: "MAY 1992"
   ```

5. **Save and export**
   - Save as: `magazine_template.psd`
   - Export background: `magazine_cover_bg.png` (600×800 RGB)

**Deliverables:**
- `magazine_template.psd` (source)
- `magazine_cover_bg.png` (600×800 RGB)

---

### 4.5 Template 4: Situation Report Memo

#### Step-by-Step Creation

1. **Create new document**
   - Width: 700px
   - Height: 900px
   - Resolution: 72 ppi
   - Name: `report_template`

2. **Create background**
   - Semi-transparent onionskin paper: `rgba(240, 235, 220, 0.9)`
   - Add subtle texture (noise + blur)

3. **Create header block guides**

   Red rectangles for:

   | Area | X | Y | Width | Height | Label |
   |------|---|---|-------|--------|-------|
   | From field | 100 | 50 | 500 | 20 | from_field |
   | To field | 100 | 80 | 500 | 20 | to_field |
   | Date field | 100 | 110 | 500 | 20 | date_field |
   | Subject field | 100 | 140 | 500 | 20 | subject_field |
   | Body area | 50 | 200 | 600 | 600 | body_area |
   | Signature area | 400 | 820 | 250 | 60 | signature_area |

4. **Add classification stamps (reference text)**
   - Use Text Tool
   - Font: Arial Bold, 14px, red `rgb(200, 20, 20)`
   - Type "RESTRICTED" at (50, 30)
   - Type "CONFIDENTIAL" at (550, 870)

5. **Add typography guide**
   ```
   REPORT TEMPLATE v1.0

   Typography:
   - Header labels/values: Courier New, 12px, black
   - Body: Courier New, 11px, left-aligned, black, line-height 1.6
   - Classification stamps: Arial Bold, 14px, red
   - Signature: Courier New, 11px, right-aligned

   Format: Military situation report memo style
   ```

6. **Save and export**
   - Save as: `report_template.psd`
   - Export background: `report_background.png` (700×900 RGBA)

**Deliverables:**
- `report_template.psd` (source)
- `report_background.png` (700×900 RGBA with transparency)

---

### 4.6 Phase 3 Summary Checklist

After creating Photoshop templates, you should have:

**PSD source files:**
- [ ] `calendar_template.psd`
- [ ] `newspaper_template.psd`
- [ ] `magazine_template.psd`
- [ ] `report_template.psd`

**Exported backgrounds:**
- [ ] `calendar_background.png` (200×280 RGB)
- [ ] `newspaper_background.png` (800×1200 RGB)
- [ ] `magazine_cover_bg.png` (600×800 RGB)
- [ ] `report_background.png` (700×900 RGBA)

**Total: 4 PSD templates + 4 PNG backgrounds = 8 files**

---

## 5. Phase 4: Organize Asset Delivery

### 5.1 Final Folder Structure

Organize all deliverables into this structure:

```
AWWV_UI_Assets/
├── hq_backgrounds/
│   └── hq_background_stable.png                 (2048×1152 RGB)
│
├── crests/
│   ├── rbih_crest.png                           (512×512 RGBA)
│   ├── rs_crest.png                             (512×512 RGBA)
│   └── hrhb_crest.png                           (512×512 RGBA)
│
├── headgear/
│   ├── headgear_rbih_stable.png                 (256×256 RGBA)
│   ├── headgear_rbih_desperate.png              (256×256 RGBA)
│   ├── headgear_rs_stable.png                   (256×256 RGBA)
│   ├── headgear_rs_desperate.png                (256×256 RGBA)
│   ├── headgear_hrhb_stable.png                 (256×256 RGBA)
│   └── headgear_hrhb_desperate.png              (256×256 RGBA)
│
├── props/
│   ├── ashtray_stable.png                       (256×256 RGBA)
│   ├── ashtray_strained.png                     (256×256 RGBA)
│   ├── ashtray_critical.png                     (256×256 RGBA)
│   ├── ashtray_desperate.png                    (256×256 RGBA)
│   ├── coffee_stable.png                        (256×256 RGBA)
│   ├── coffee_strained.png                      (256×256 RGBA)
│   ├── coffee_critical.png                      (256×256 RGBA)
│   └── coffee_desperate.png                     (256×256 RGBA)
│
├── templates/
│   ├── calendar_template.psd
│   ├── calendar_background.png                  (200×280 RGB)
│   ├── newspaper_template.psd
│   ├── newspaper_background.png                 (800×1200 RGB)
│   ├── magazine_template.psd
│   ├── magazine_cover_bg.png                    (600×800 RGB)
│   ├── report_template.psd
│   └── report_background.png                    (700×900 RGBA)
│
└── sources/
    ├── sora_originals/
    │   ├── hq_base_clean_v1_sora.png
    │   ├── crest_rbih_v1_sora.png
    │   ├── crest_rs_v1_sora.png
    │   ├── crest_hrhb_v1_sora.png
    │   ├── headgear_[...]_v1_sora.png (6 files)
    │   ├── ashtray_[...]_v1_sora.png (4 files)
    │   └── coffee_[...]_v1_sora.png (4 files)
    │
    └── psd_sources/
        ├── crest_rbih_v1.psd
        ├── crest_rs_v1.psd
        ├── crest_hrhb_v1.psd
        ├── headgear_[...]_v1.psd (6 files)
        ├── ashtray_[...]_v1.psd (4 files)
        └── coffee_[...]_v1.psd (4 files)
```

### 5.2 File Naming Conventions

- **Lowercase only**, underscore-separated (`snake_case`)
- **Descriptive names**: `hq_background_stable.png`, NOT `bg1.png`
- **Consistent suffixes**: `_stable`, `_strained`, `_critical`, `_desperate`
- **Faction codes**: `rbih`, `rs`, `hrhb` (lowercase, no periods)

### 5.3 Technical Validation Checklist

Before delivery, verify each file:

#### HQ Background
- [ ] Dimensions: 2048×1152 pixels
- [ ] Format: PNG RGB (no alpha channel)
- [ ] File size: < 2 MB
- [ ] NO wall cracks visible
- [ ] NO papers on desk
- [ ] NO map content in frame
- [ ] NO calendar dates/numbers
- [ ] NO game state of any kind

#### Crests (all 3)
- [ ] Dimensions: 512×512 pixels
- [ ] Format: PNG RGBA (transparent background)
- [ ] File size: < 500 KB each
- [ ] Crest centered with margin
- [ ] Clean edges, no white halo
- [ ] Alpha channel smooth (not binary)

#### Headgear (all 6)
- [ ] Dimensions: 256×256 pixels
- [ ] Format: PNG RGBA (transparent)
- [ ] Stable variants: clean, neatly placed
- [ ] Desperate variants: worn, tossed carelessly
- [ ] Colors visibly different (faded for desperate)

#### Ashtrays (all 4)
- [ ] Dimensions: 256×256 pixels
- [ ] Format: PNG RGBA (transparent)
- [ ] Cigarette counts correct:
  - [ ] Stable: 1-2 butts
  - [ ] Strained: 5-7 butts
  - [ ] Critical: 10-15 butts
  - [ ] Desperate: 18+ butts overflowing

#### Coffee Cups (all 4)
- [ ] Dimensions: 256×256 pixels
- [ ] Format: PNG RGBA (transparent)
- [ ] Cup counts correct:
  - [ ] Stable: 1 cup (half-full)
  - [ ] Strained: 1 cup (empty)
  - [ ] Critical: 2 cups
  - [ ] Desperate: 3+ cups (one tipped)

#### Templates (all 4 PSDs)
- [ ] PSD files open without errors
- [ ] Layers organized and labeled
- [ ] Background textures clean
- [ ] Reference guides clearly marked
- [ ] Typography specs documented in file

#### Template Backgrounds (all 4 PNGs)
- [ ] Correct dimensions (see spec)
- [ ] Correct format (RGB or RGBA as specified)
- [ ] Clean texture, no artifacts

---

## 6. Quality Checklist

### 6.1 Visual Quality

For ALL assets:
- [ ] No JPEG artifacts (all PNG)
- [ ] No visible compression noise
- [ ] Colors match specifications (see color reference below)
- [ ] Lighting consistent across similar assets
- [ ] Period accuracy (1990s Eastern European aesthetic)

### 6.2 Technical Quality

- [ ] All file names match specification exactly
- [ ] All dimensions correct
- [ ] RGB vs RGBA correct for each asset type
- [ ] Transparent backgrounds where required
- [ ] Metadata stripped from PNG files (reduces file size)

### 6.3 Color Reference

Verify these colors appear correctly:

**Faction Colors (for future map rendering, not in these assets):**
- RBiH: `rgb(70, 120, 80)` — Forest Green
- RS: `rgb(180, 50, 50)` — Crimson Red
- HRHB: `rgb(60, 100, 140)` — Steel Blue

**Environmental Palette:**
- Concrete wall: `rgb(160, 160, 165)` — Light grey
- Desk wood: Dark walnut/oak brown (1970s)
- Classification stamps: `rgb(200, 20, 20)` — Bright red
- Aged paper: `#f4e8d8` — Cream/beige (calendar)
- Newsprint: `#ebe1cd` — Yellowed beige (newspaper)

---

## 7. Troubleshooting

### Problem: Sora added prohibited elements (cracks, papers, maps, dates)

**Solution:**
1. Open in Photoshop
2. Use Healing Brush Tool (J) or Clone Stamp Tool (S)
3. Sample nearby clean area (Alt+Click)
4. Paint over prohibited element
5. Use Patch Tool (J) for larger areas
6. Verify result looks natural

### Problem: Background removal left white halo around edges

**Solution:**
1. Open in Photoshop
2. Select layer with halo
3. Layer → Matting → Remove White Matte
4. OR: Select → Modify → Contract by 1px, then Feather 0.5px
5. Re-export

### Problem: PNG file size too large

**Solution:**
1. File → Export → Export As
2. Enable "Convert to sRGB"
3. Reduce "Quality" slider to 85-90%
4. Use "File → Save for Web (Legacy)" as alternative
5. Use TinyPNG.com for further compression (maintains transparency)

### Problem: Sora didn't follow prompt (wrong object, wrong angle, etc.)

**Solution:**
1. Regenerate with more specific prompt
2. Add negative prompts: "NOT [unwanted element]"
3. Try rephrasing: "isolated object on transparent background"
4. If still fails: Generate multiple variants, pick best, fix in Photoshop

### Problem: Alpha channel is binary (hard edges, not smooth)

**Solution:**
1. Open in Photoshop
2. Select → Select and Mask
3. Adjust "Smooth" slider (5-10)
4. Adjust "Feather" slider (0.5-1px)
5. Output To: New Layer with Layer Mask
6. Re-export

### Problem: Colors don't match specification

**Solution:**
1. Open in Photoshop
2. Image → Adjustments → Hue/Saturation
3. Target specific color range
4. Adjust Hue/Saturation/Lightness to match spec
5. Use Color Picker (I) to verify RGB values
6. Re-export

---

## 8. Delivery Checklist

Before final delivery, confirm:

### Files Organized
- [ ] All files in correct folders (hq_backgrounds/, crests/, headgear/, props/, templates/)
- [ ] Source files preserved in sources/ folder
- [ ] No stray files outside folder structure

### File Count
- [ ] 1 HQ background
- [ ] 3 crests
- [ ] 6 headgear variants
- [ ] 8 prop states (4 ashtray + 4 coffee)
- [ ] 4 PSD templates
- [ ] 4 template background PNGs
- [ ] **Total: 26 final deliverable files**

### Documentation
- [ ] README.txt in root folder explaining structure
- [ ] Color reference card (optional, helpful)
- [ ] Typography specs PDF (optional, from templates)

### Quality Assurance
- [ ] Spot-check 5 random files: open, verify dimensions, verify format
- [ ] Check all transparent PNGs have smooth alpha (open in Photoshop, check transparency)
- [ ] Verify NO game state embedded in any asset

---

## 9. FAQ

**Q: Why can't Sora generate the complete HQ with all desperation states?**

A: Because desperation is *game state*. If you bake 4 different wall crack patterns into 4 separate images, you'd need 4×3 = 12 images (4 desperation × 3 factions). Instead: 1 clean base + procedural overlays = flexible system.

**Q: Why separate crests/headgear as sprite overlays instead of baking them into HQ background?**

A: Faction changes. If you bake the RBiH crest into the wall, you need 3 separate HQ backgrounds (one per faction). With sprite overlays: 1 HQ base + 3 crest sprites = same visual result, less storage.

**Q: Can I add more desperation states (e.g., 8 states instead of 4)?**

A: Yes! Just generate more Sora variants for ashtrays/coffee with different cigarette/cup counts. The architecture supports any number of states.

**Q: What if Sora can't generate transparent backgrounds?**

A: That's expected. Sora typically generates opaque images. The Photoshop post-processing step (Phase 2) removes backgrounds and creates alpha channels.

**Q: Do I need to create templates for newspapers if the game engine renders text?**

A: Yes. Templates define *layout structure* (where headlines go, column widths, etc.). The engine needs this structure to know where to render text. Think of it as a "form" that the engine fills out.

**Q: Can I use different fonts than specified?**

A: No. The typography specs are part of the design contract. If you use different fonts, developers would need to update code. Stick to specified fonts (Arial, Times New Roman, Courier New, Franklin Gothic).

**Q: What if I don't have access to Franklin Gothic font?**

A: Use "Arial Black" as a substitute for Franklin Gothic Bold. Use "Arial Narrow" for Franklin Gothic Condensed.

---

## 10. Success Criteria

You've successfully completed this implementation when:

1. ✅ All 26 final deliverable files exist
2. ✅ All files pass technical validation (dimensions, format, transparency)
3. ✅ All files pass visual quality check (no artifacts, period-accurate)
4. ✅ NO game state embedded in any Sora-generated asset
5. ✅ All sprite overlays have clean transparent backgrounds
6. ✅ All templates have clear layout guides and typography specs
7. ✅ Files organized in specified folder structure
8. ✅ File names match specification exactly

**Congratulations!** You've created a complete visual asset set for the AWWV command HQ interface.

---

## 11. What Happens Next (Developer Handoff)

After you deliver these assets, developers will:

1. **Integrate HQ background** into game engine canvas renderer
2. **Position sprite overlays** (crests, headgear, ashtrays, coffee) dynamically based on game state
3. **Implement calendar renderer** using template structure, rendering dates/week highlights from turn counter
4. **Implement newspaper generator** using template, filling headlines from turn events
5. **Implement map renderer** that draws control zones onto empty map frame
6. **Add interactive regions** (click calendar to advance turn, click crest for faction overview, etc.)

Your assets are the **foundation**. The engine adds the **dynamic layer** on top.

---

**END OF IMPLEMENTATION PLAN**

**Document Status:** Ready for Execution
**Estimated Time:** 10-15 working hours (2-3 days)
**Next Step:** Begin Phase 1 (Generate Sora Assets)
