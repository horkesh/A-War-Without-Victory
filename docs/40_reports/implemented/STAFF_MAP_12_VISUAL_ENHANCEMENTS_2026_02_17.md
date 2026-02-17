# Implemented Work — Staff Map: 12 Visual Enhancements

**Date:** 2026-02-17
**Status:** Complete
**Scope:** Visual polish pass for the staff map (4th zoom layer) — 12 enhancements spanning parchment atmosphere, front line rendering, formation counters, cartographic decorations, and faction identification

---

## 1. Faction-Colored Counter Sidebar Stripe

**What:** Added a 6px-wide vertical stripe on the left edge of each formation counter, filled with the formation's faction color at 0.8 alpha. Counter text (name, posture badge) shifted right to clear the stripe.

**Why:** All counters previously looked identical (parchment cream). Now RBiH (green), RS (red), and HRHB (blue) brigades are instantly distinguishable at a glance.

**Changes in `StaffMapRenderer.ts` — `drawFormationCounter()`:**
- After drawing rounded-rect background+stroke, clips to the rect path and fills a `COUNTER.stripeWidth`-wide rectangle with `paperFactionBorder(faction)` at `globalAlpha 0.8`
- Unit name text x-position shifted from `x + 5` to `x + COUNTER.stripeWidth + 4`
- Posture badge x-position shifted similarly

---

## 2. Barbed-Wire Front Lines

**What:** Replaced straight-line crimson front lines with curved barbed-wire motif: smooth quadratic Bezier curves with perpendicular control-point offsets, plus alternating barb ticks at regular intervals along each segment.

**Why:** The previous front lines were straight segments with minor wobble, making them visually stiff. The barbed-wire effect creates an organic, militarily evocative boundary that follows the front line contour.

**Changes in `StaffMapRenderer.ts` — `drawFrontLines()`:**
- Replaced `lineTo` with `quadraticCurveTo` using perpendicular control points offset by `detHash() * FRONT_LINES.curveOffset` (12px)
- Glow pass and main line pass both use curved paths
- Added barb pass: walks each segment at `FRONT_LINES.barbSpacing` (12px) intervals, draws perpendicular 4px ticks alternating sides via `detHash()`

**Theme changes in `StaffMapTheme.ts`:**
- Replaced `wobbleMax` with `curveOffset: 12`, `barbSpacing: 12`, `barbLength: 4`, `barbWidth: 1.5`

---

## 3. AoR Faction Fill with Crosshatch

**What:** When a brigade is selected, its Area of Responsibility (AoR) is shown as a faction-colored fill with diagonal crosshatch overlay. No settlement borders.

**Why:** The previous dashed-outline approach was hard to read and drew settlement borders, which the user wanted removed. The crosshatch pattern is visually distinct and faction-colored.

**Changes in `StaffMapRenderer.ts`:**
- Replaced `drawAoRBoundary()` with `drawAoRFill(aorSids, faction)`
- For each AoR settlement: clips to polygon, fills with `paperFactionFill(faction, 0.15)`, then draws 45-degree hatch lines at 8px spacing using faction RGB at 0.12 alpha

**Theme changes in `StaffMapTheme.ts`:**
- Replaced `aorDash`/`aorWidth` with `aorFillAlpha: 0.15`, `aorHatchSpacing: 8`, `aorHatchWidth: 0.8`, `aorHatchAlpha: 0.12`

---

## 4. Contour Lines from Elevation Data

**What:** Thin dashed brown contour-style lines drawn along shared borders where adjacent settlements straddle elevation thresholds (400m, 800m, 1200m).

**Why:** Adds topographic depth to the map without requiring a separate DEM overlay. Uses existing `terrainScalars` elevation data and `sharedBorders` geometry.

**Changes in `StaffMapRenderer.ts`:**
- New method `drawContourLinesOnContext()` called in terrain cache after roads/rivers
- Iterates `sharedBorders`, checks if settlements straddle a threshold, draws dashed lines with `TERRAIN.contourColors`

**Theme changes in `StaffMapTheme.ts`:**
- Added `contourThresholds: [400, 800, 1200]`, `contourColors` (3 brown tones at increasing alpha), `contourWidth: 0.5`, `contourDash: [4, 4]`

---

## 5. River Labels

**What:** Named rivers are labeled with italic blue serif text rotated along the river course, with a parchment halo behind for readability.

**Why:** Rivers are important terrain features for military planning. Labeling them in the cartographic tradition (italic blue, following the waterway) adds both utility and atmosphere.

**Changes in `StaffMapRenderer.ts`:**
- New method `drawRiverLabels()` called after `drawLabels()` in render pipeline
- Iterates `baseFeatures.rivers`, finds midpoint and angle, draws rotated label
- De-duplicates by river name (each labeled only once)

---

## 6. Fold Creases

**What:** Three subtle fold lines across the parchment — two roughly horizontal (at ~1/3 and ~2/3 height) and one roughly vertical (at ~1/2 width). Each crease is a shadow+highlight pair offset by 1px, with gentle deterministic waviness.

**Why:** Classic paper-map atmosphere detail. Suggests the map has been folded and carried in a field officer's pocket.

**Changes in `StaffMapRenderer.ts` — `ensureParchmentCache()`:**
- After aging spots: draws 3 creases, each as shadow line (`PARCHMENT.creaseShadow`, width 1.5) + highlight line (`PARCHMENT.creaseHighlight`, width 1.0)
- Waviness via `detHash(s, idx, 150)` with 40 line segments per crease

**Theme changes in `StaffMapTheme.ts`:**
- Added `PARCHMENT.creaseShadow: 'rgba(80, 60, 30, 0.06)'` and `PARCHMENT.creaseHighlight: 'rgba(255, 245, 220, 0.04)'`

---

## 7. Pencil Crosshatch for Contested Zones

**What:** Settlements that border multiple enemy factions (>=2 distinct cross-faction neighbors) receive a subtle 45-degree pencil crosshatch overlay, suggesting uncertainty and contested ground.

**Why:** Visualizes the front line density — areas where three factions meet or where the front is particularly contested are marked as a staff officer might pencil-shade an uncertain zone.

**Changes in `StaffMapRenderer.ts`:**
- New method `drawContestedOverlay(region)` called after `drawFrontLines()`
- Builds neighbor-faction map from `sharedBorders`, clips to qualifying settlement polygons, draws diagonal hatch at `CONTESTED.hatchSpacing` (6px)

**Theme changes in `StaffMapTheme.ts`:**
- New `CONTESTED` object: `hatchColor: INK.pencil`, `hatchSpacing: 6`, `hatchWidth: 0.5`, `minCrossFactionNeighbors: 2`

---

## 8. Coffee Stain Ring

**What:** A single semi-transparent coffee ring stain rendered via radial gradient in the parchment cache, positioned deterministically toward a corner.

**Why:** Classic atmosphere detail for a field map. The ring is very subtle (peak alpha 0.07) and adds lived-in character.

**Changes in `StaffMapRenderer.ts` — `ensureParchmentCache()`:**
- After fold creases: deterministic position via `detHash()`, radius 60-90px
- Radial gradient: transparent → brown ring at 0.78 radius → transparent

---

## 9. Margin Annotations

**What:** Two lines of small italic text below the cartouche showing tactical metadata: week number + formatted date, and active formation counts per faction.

**Why:** Provides at-a-glance operational context — the staff officer's field notes showing current turn and force disposition.

**Changes in `StaffMapRenderer.ts` — `drawCartouche()`:**
- Extended with annotation lines after the cartouche box
- Line 1: "Wk {turn} -- {date}" via `formatTurnDate()`
- Line 2: "Formations: HRHB: N, RBiH: N, RS: N" from `gs.formations`
- Uses `italic 8px` serif font in `INK.light`

**Theme changes in `StaffMapTheme.ts`:**
- Added `FONT_SIZES.annotation: 8`

---

## 10. Irregular Vignette Edge

**What:** Replaced the smooth 4-gradient vignette with a noise-modulated strip-based effect. Each edge has 40 semi-transparent strips with `detHash()`-modulated depth and alpha, creating an uneven worn-paper border.

**Why:** The smooth radial vignette looked too digital. The irregular version suggests natural paper aging and wear at the edges.

**Changes in `StaffMapRenderer.ts` — `drawVignette()`:**
- Complete rewrite: 4 edges × 40 strips each
- Each strip's depth modulated by `detHash(i, edge, 300) * 0.6 + 0.7`
- Alpha decreases from edge inward, further modulated by depth factor

---

## 11. Faction Army Crests at Top Center

**What:** Loads and renders the ARBiH, VRS, and HVO crest PNG assets side by side at top center of the map, below the cartouche area, with small labels beneath each.

**Why:** Immediately identifies the three armies present in the theatre. The crests are drawn at 0.85 alpha for a printed-on-paper feel.

**Changes in `StaffMapRenderer.ts`:**
- Added Vite `?url` imports for `crest_ARBiH.png`, `crest_VRS.png`, `crest_HVO.png` from `src/ui/warroom/assets/`
- Added `crestImages` map and `crestsLoaded` flag; `loadCrests()` called lazily from `render()`
- New method `drawFactionCrests()`: renders 3 crests at `DECORATIONS.crestHeight` (48px) tall, centered horizontally, with faction labels in `FONTS.data` at 7px

**Theme changes in `StaffMapTheme.ts`:**
- Added `DECORATIONS.crestHeight: 48`, `DECORATIONS.crestGap: 16`, `DECORATIONS.crestAlpha: 0.85`
- Added `FONT_SIZES.crestLabel: 7`

---

## 12. Exit Button Moved to Top-Left

**What:** Relocated the staff map exit button (✕) from top-right to top-left corner.

**Why:** The top-right corner is used by the compass rose. Moving the exit button to top-left avoids overlap and follows the convention of close/back buttons being on the left.

**Changes in `StaffMapRenderer.ts`:**
- `drawExitButton()`: `x = w - size - 12` → `x = 12`
- `isExitButtonHit()`: `cx = w - size - 12 + size / 2` → `cx = 12 + size / 2`

---

## Files Modified

**`src/ui/map/staff/StaffMapTheme.ts`** (249 lines)
- Added to `PARCHMENT`: `creaseShadow`, `creaseHighlight`
- Added to `INK`: `pencil`
- Added `rgb` tuple to each faction in `PAPER_FACTION_COLORS`
- New function: `paperFactionRgb()`
- Added to `FONT_SIZES`: `annotation`, `crestLabel`
- Added to `TERRAIN`: `contourThresholds`, `contourColors`, `contourWidth`, `contourDash`
- Replaced `FRONT_LINES.wobbleMax` with `curveOffset`, `barbSpacing`, `barbLength`, `barbWidth`
- Added `COUNTER.stripeWidth`
- Added to `DECORATIONS`: `crestHeight`, `crestGap`, `crestAlpha`
- New `CONTESTED` object
- Replaced `SELECTION.aorDash`/`aorWidth` with `aorFillAlpha`, `aorHatchSpacing`, `aorHatchWidth`, `aorHatchAlpha`

**`src/ui/map/staff/StaffMapRenderer.ts`** (1589 lines, grew from 1091)
- 3 Vite `?url` crest image imports
- New methods: `loadCrests()`, `drawFactionCrests()`, `drawRiverLabels()`, `drawContestedOverlay()`, `drawAoRFill()`, `drawContourLinesOnContext()`
- Modified methods: `render()`, `ensureParchmentCache()`, `drawFrontLines()`, `drawFormations()`, `drawFormationCounter()`, `drawCartouche()`, `drawVignette()`, `drawExitButton()`, `isExitButtonHit()`

---

## Determinism

All procedural effects use `detHash(x, y, seed)` — a deterministic hash function. Zero `Math.random()` calls. The three-tier caching architecture (parchment / terrain+geography / dynamic) is preserved with correct invalidation semantics.

---

## Caching Impact

| Cache Tier | New Content | Invalidation |
|---|---|---|
| Parchment | Fold creases, coffee stain | Canvas resize only (unchanged) |
| Terrain | Contour lines | Region or control change (unchanged) |
| Dynamic | Barbed-wire front lines, contested overlay, faction stripes, AoR fill, river labels, margin annotations, crests, vignette, exit button | Every frame (unchanged) |
