# Strategic Design: Terrain, Map, and Player Experience

**Date:** 2026-03-20
**Author:** Pyrrhic Games (deep-think session)
**Context:** We now have 3D terrain (ops modal), Deck.gl overlay (animated arrows), combat effectiveness at all levels, terrain info in tooltips/panels, and the `Icon.tsx` component recovered. This document thinks through what to build next — realistically, within MapLibre + Deck.gl capabilities, informed by what we already have.

---

## What We Already Have (reality check)

Before proposing anything, here's what the player can ALREADY see and do. Any proposal must add value BEYOND this:

### Panels & Modals (55 components)
- **AAR Panel** — per-battle: attacker/defender factions, brigade IDs, outcome, casualties, territory flips, concentrated attacks, per-brigade defender contributions with distance/home info. This is RICH.
- **War Summary Modal** — overview, IVP, convoys, briefing sections
- **Situation Tab** — area-weighted territory %, faction overviews
- **Formation Detail** — cohesion bar, morale bar, fatigue, personnel, combat effectiveness (new), entrenchment, disruption, movement status, narrative arc, war stories, engagement history, equipment
- **Corps Detail** — overview + combat effectiveness (new), ORBAT, sectors with per-sector effectiveness (new), ops, orders. Commander profile.
- **Army Detail** — whole-army stats + combat effectiveness (new), corps breakdown, manpower pools, casualty totals
- **Settlement Detail** — 3 tabs: overview (terrain badges, elevation, ethnic composition, population changes), military (formations at OSID), orders/events
- **Ops Planning Modal** — 4-phase flow with 3D terrain, animated Deck.gl arrows, selectability constraints, terrain tooltip, terrain-aware camera
- **Operation Detail** — phase, participating brigades, objectives, commander
- **Event Modal + Decision Modal** — narrative events with player choices
- **Command Briefing** — pending items, IVP, convoys, enclave dashboard
- **Recruitment Modal** — brigade recruitment with costs
- **Radial context menu** — right-click on map features

### Map Layers
- Political control fills (7 map modes: Political, Ethnic, Supply, Casualties, Morale, Operations, Defense)
- Front lines (stitched, continuous, faction-colored glow)
- Formation markers (NATO symbols, labels, zoom-dependent)
- Battle markers (white pulsing circles — **no tooltip, no click**)
- Operation arrows (main map, pink lines in ops mode)
- Sector demarcation (dashed, on corps selection)
- Fog of war (sector intel based)
- Hillshade raster (terrain visualization)
- OSID selection highlight (burnt orange + municipality context)
- Minimap with viewport rectangle
- Enclave outlines and labels

### What's Missing (the actual gaps)

1. **Battle markers are dead** — pulsing dots with no interaction. Can't click, can't hover for details. The AAR panel has everything but the MAP doesn't connect to it.
2. **No terrain awareness on the main map** — we added terrain tooltips and 3D to the ops modal, but the main map's battle/planning experience doesn't use terrain at all.
3. **Icon language not deployed** — `Icon.tsx` exists but isn't used anywhere yet. Every panel still says "Personnel: 3,000" instead of showing a soldier icon.
4. **Map counters are minimal** — no health bar, no supply dot, no operation indicator. You must hover to learn anything about a unit.
5. **Operations invisible on main map** — no visual distinction between a brigade in an active operation vs idle.
6. **No battle replay/history** — you can read the AAR text but can't *see* where the battle happened on the map with context.

---

## Proposals (Ranked by Impact vs. Effort)

### Tier 1: High Impact, Low Effort (1-2 sessions each)

#### 1.1 Battle Marker Upgrade — Click + Tooltip + Size

**What:** Make battle markers interactive. On hover, show a compact tooltip with the `TurnBattle` data (attacker vs defender, outcome, casualties). On click, open the AAR panel scrolled to that battle. Scale circle radius by total casualties. Color by outcome (green=attacker won, red=attacker lost, amber=stalemate).

**Why:** The data already exists in `latestTurnSummary.battles[]`. The markers already render at the correct OSIDs. We just need to:
1. Enrich `buildBattleMarkersGeoJSON` to include the full `TurnBattle` data as feature properties
2. Add the layer to MapContainer's hover/click query
3. Build a small `BattleTooltip` component (or reuse `BattleRow` from AARPanel)

**Deck.gl alternative:** Replace the MapLibre circle layer with a Deck.gl `ScatterplotLayer` with `radiusScale` animated (pulsing) and `getRadius` proportional to casualties. Deck.gl picking is per-pixel — better for dense battle clusters. The `onHover` callback shows the tooltip directly.

**Realistic?** YES. ~100 lines. No new data needed.

#### 1.2 Deploy Icon Language (Phase 1 of Visual Overhaul)

**What:** Replace text labels with `<Icon name="..." />` across FormationDetail, CorpsDetail, ArmyDetail, BrigadeRow, CorpsCard, BottomStatusStrip. The component already exists.

**Why:** Single highest-impact visual change per the design plan. Players learn icon language in minutes (HoI4 proves this).

**Realistic?** YES. `Icon.tsx` is recovered and has 22 icons. This is pure find-and-replace across ~8 components.

#### 1.3 Map Counter Enrichment (Micro-indicators)

**What:** Add 3 micro-indicators to each formation marker on the map:
- 2px health bar at bottom (cohesion: green/amber/red)
- 4px supply dot at top-right (adequate/strained/critical)
- Small icon at top-left for active operation (crosshairs) or column march (arrow)

**Why:** The map should tell you unit status at a glance. Currently you must hover every single unit.

**Deck.gl approach:** Use the existing `buildTacticalDeckLayers.ts` IconLayer stack. Add a `ScatterplotLayer` for the supply dot (4px, color-coded) and a thin `PathLayer` for the health bar (2px line at marker bottom, width = cohesion %). Enable `deckFormationCounters: true`.

**Realistic?** YES for the Deck.gl path. The capability flag already exists. ~150 lines.

### Tier 2: High Impact, Medium Effort (2-3 sessions)

#### 2.1 Battle Site Flyover

**What:** When clicking a battle marker, the camera smoothly flies to the battle location with terrain pitch (30-40 degrees) and shows a floating battle card (attacker vs defender, like UoC2). Uses `map.flyTo()` with bearing aligned to the attack direction (attacker OSID → defender OSID).

**Why:** Connects the strategic map to the tactical moment. The 3D terrain makes this meaningful — you SEE the mountain the defenders held.

**Implementation:** Add a "Battle View" mode triggered from battle marker click or AAR panel. `flyTo` with pitch + bearing. Show a Deck.gl `TextLayer` or HTML overlay with the battle summary. ESC or click anywhere returns to strategic view.

**Realistic?** YES — `flyTo` works, 3D terrain is loaded (we'd add `setTerrain` to the main map temporarily during the flyover). ~200 lines.

#### 2.2 Operation Visualization on Main Map

**What:** When in Operations map mode, show:
- Objective OSIDs tinted with faction color (10% opacity fill)
- Participating brigades connected to objectives via Deck.gl `ArcLayer`
- Operation status glow on participating unit markers (green=executing, amber=stalled, red=recovery)
- Click operation area → opens OperationDetail

**Why:** Operations are currently invisible on the map. You have to open the corps panel to see them.

**Implementation:** The data is in `LoadedGameState.operations[]` with `objective_osids`, `participating_brigade_ids`, `phase`. Use Deck.gl for the arcs and glows. MapLibre for the OSID tints.

**Realistic?** YES — we already have operation arrow rendering (main map has `order-arrows` source). This extends it with richer visualization. ~250 lines.

#### 2.3 Settlement Panel Mini-Profile

**What:** Enrich the settlement overview tab with a compact "terrain profile":
- Small elevation indicator (mountain icon + meters)
- Defense modifier badge (already done)
- Historical significance badge (if strategic/municipal seat/transit hub)
- Formation cards showing combat effectiveness of stationed units
- If under siege: siege status with supply indicator

**Why:** The settlement panel is the primary information interface for OSID clicks. Making it richer directly helps decision-making.

**Realistic?** YES — most of this data is already in `osidPropertiesMap` and `formationsAtOsid`. The combat effectiveness utility is ready.

### Tier 3: Medium Impact, Higher Effort (3+ sessions)

#### 3.1 Elevation Profile on Ops Modal Axes

**What:** Sample the DEM along each advance axis bezier curve. Show a mini elevation strip below the ops modal (SVG area chart, ~60px tall). Mark staging altitude, objective altitude, and any passes.

**Why:** Makes 3D terrain FUNCTIONAL for planning — "this attack climbs 800m through a mountain pass."

**Implementation:** Load `dem_clip_h6_2.tif` as a small raster in the browser (or pre-sample at each OSID centroid and store in the terrain scalars). Plot with an SVG `<path>` element.

**Realistic?** PARTIALLY — browser-side DEM sampling requires either a pre-computed lookup table (fast) or loading the TIF (heavy). The pre-computed approach is realistic: add `elevation_at_centroid` to terrain scalars, sample along the bezier using centroid elevations at each OSID the curve passes through.

#### 3.2 Terrain Cost Visualization for Movement

**What:** When a brigade is selected and in move mode, show movement cost overlay — OSIDs colored by terrain friction (green=easy, amber=moderate, red=difficult/mountain). Helps the player choose march routes.

**Why:** Movement currently shows no terrain cost. A column march through mountains takes the same hops as through flatland, but the sim actually applies friction penalties.

**Implementation:** Deck.gl `PolygonLayer` or MapLibre paint expression using `terrain_friction_index` from enriched `osidPropertiesMap`.

**Realistic?** YES for the visualization. The sim already uses friction for column march speed.

#### 3.3 Front Line Terrain Tinting

**What:** Front line edges at high elevation get a visual treatment — white/blue tint for mountain passes, darker for lowland. Communicates where the front is in mountainous terrain vs. river valleys.

**Implementation:** Add `terrain_friction_index` to front edge GeoJSON properties. Use MapLibre `line-color` interpolation based on the friction value.

**Realistic?** PARTIALLY — requires enriching front edge data with terrain scalars, which means modifying `buildCorpsFrontLinesGeoJSON` to look up friction per OSID. The data is available but the builder needs the terrain lookup.

### What We Should NOT Build

These sound cool but don't actually work well or aren't worth the effort:

1. **LOS/visibility cones** — Ray-casting against the DEM in the browser is computationally expensive and the result is hard to read on a strategic-scale map. This is a tactical feature on a strategic game. Skip.

2. **Full 3D terrain on main map** — We tried this. At strategic zoom, 3D terrain extrusion makes polygon fills unreadable and front lines distort. The ops modal (focused AO) is the right place for 3D. Main map stays flat with pitch for perspective.

3. **3D battle replay animation** — Cool in concept, but the sim resolves battles as single-turn discrete events, not as multi-step engagements. There's no "attack sequence" to animate — just a power ratio and an outcome. A flyover with a static battle card is more honest.

4. **Deck.gl HeatmapLayer for threat density** — We already have Defense map mode. Adding another heat layer adds complexity without new information. Better to improve the existing Defense mode.

5. **Pulsing markers (animated ScatterplotLayer)** — Looks flashy but adds no information. The battle markers already pulse via MapLibre. More animation ≠ more understanding.

---

## Recommended Execution Order

| Priority | Item | Sessions | Dependencies |
|----------|------|----------|-------------|
| 1 | 1.2 Deploy Icon Language | 1-2 | Icon.tsx (recovered) |
| 2 | 1.1 Battle Marker Upgrade | 1 | None |
| 3 | 1.3 Map Counter Enrichment | 1-2 | Icon language (for status icons) |
| 4 | 2.3 Settlement Panel Mini-Profile | 1 | Combat effectiveness (done) |
| 5 | 2.2 Operation Visualization | 2 | Deck.gl overlay (done) |
| 6 | 2.1 Battle Site Flyover | 1-2 | Battle markers (item 2), 3D terrain |
| 7 | 3.2 Terrain Cost Visualization | 1 | Terrain scalars (done) |
| 8 | 3.1 Elevation Profile | 2 | Pre-computed elevation per OSID |
| 9 | 3.3 Front Line Terrain Tinting | 1-2 | Terrain scalars enrichment |

**Total: ~12-16 sessions for the full stack.** Items 1-4 are the most impactful and could be done in 4-5 sessions.

---

## Roadmap Integration

These items align with the existing visual overhaul plan phases:
- **Phase 1 (Icons)** → Item 1.2 directly
- **Phase 2 (Counter Enrichment)** → Item 1.3 directly
- **Phase 6 (Map Operations Viz)** → Item 2.2 directly
- **New additions:** Battle marker upgrade (1.1), battle flyover (2.1), terrain cost viz (3.2)

The combat effectiveness system, terrain info display, and 3D terrain are already done — they're the foundation these items build on.

---

## Technical Constraints (Realism Check)

1. **Deck.gl interleaved mode:** Layers render in the MapLibre layer stack. Z-ordering is controlled by `beforeId` on each Deck layer. This works but means Deck layers can't arbitrarily overlap MapLibre layers — they slot into specific positions.

2. **MapLibre terrain (setTerrain):** Works for the ops modal's focused AO. On the main map at strategic zoom, it causes polygon fill distortion and performance issues. Keep main map flat.

3. **PathStyleExtension dash animation:** Works via `requestAnimationFrame` loop updating `offset`. CPU cost is minimal (one setProps call per frame). Already proven in ops modal arrows.

4. **Deck.gl picking:** `onHover` and `onClick` callbacks per layer. More precise than MapLibre's `queryRenderedFeatures` for overlapping features. Good for battle markers and unit counters.

5. **Performance:** Each Deck.gl layer is a WebGL draw call. Keep total layers under ~20 for smooth 60fps. Currently using 5 in ops modal. Main map could add 5-8 more without issues.

6. **Browser DEM access:** The DEM is a 2737x1946 Float32 GeoTIFF. Loading it in the browser for elevation sampling would require ~20MB download + TIFF parsing. Better to pre-compute per-OSID elevation and serve as JSON (already done in `settlements_terrain_scalars.json`).

7. **MapLibre `queryTerrainElevation(lngLat)`:** Returns elevation in meters at any point when terrain is active. Available in ops modal (setTerrain enabled). Could annotate objectives with altitude.

8. **`DataFilterExtension`:** GPU-based filtering by numeric range or category. Could toggle formation visibility by faction/posture/morale without rebuilding GeoJSON. Up to 4 simultaneous filter dimensions.

9. **`CollisionFilterExtension`:** Prevents label/icon overlap at low zoom. Priority-based (corps HQ > brigade labels). Works with IconLayer, TextLayer, ScatterplotLayer only.

10. **`FillStyleExtension`:** Hatch patterns for polygon layers. Could show siege zones, contested areas, ethnic-majority fills with crosshatching. Requires a pattern atlas texture.

11. **`TripsLayer`:** Time-animated polyline paths with trail fade. Drives `currentTime` externally. Could replay brigade movement over a campaign as animated trails.

12. **`beforeId` per Deck layer:** Z-order Deck layers between specific MapLibre layers (e.g. front lines between terrain fill and settlement labels). Not yet used — all current Deck layers render on top.

---

## Data Available But Not Shown to Player (Inventory)

Research found significant data the sim computes but the player never sees:

**High-value hidden data:**
- `home_defense_active` on FormationView — explains why a brigade won't attack. Currently invisible.
- `slope_index` numeric + max-attacker cap (`getMaxAttackersForTarget`: 1/2/3) — player sees "Mountain" label but not the attack width limit.
- `total_equipment_captured` per brigade — rendered for destroyed but the captured render block is missing.
- `firstBattleTurn`/`firstBattleOsid` — brigade's battle debut. Defined, never displayed.
- `NotableFlip.significance` tier (municipality_seat, enclave_breach, corridor) — all flips render identically in AAR.
- `sub_segments[].gap` on sectors — front coverage gaps computed but never shown.
- `consecutive_failures_on_current` on operations — more precise than total failures.
- `elevation_stddev_m` — terrain roughness, affects fighting. Never displayed.
- Per-axis operation status (`axes[].status`/`momentum`) — only aggregate shown in OperationDetail.

**Already shown (correction to earlier assumption):**
- AAR Panel shows rich battle data: attacker/defender factions, brigade IDs, outcome, casualties, per-brigade defender contributions with distance/home info.
- Supply mode (map mode 3) exists but is broken — uniform green, no variation visible.
- 7 map modes exist; 2 are broken/thin (Supply, Casualties need legends and scale fixes).

---

## Deck.gl Extensions Worth Exploiting

| Extension | Use Case | Effort |
|-----------|----------|--------|
| `CollisionFilterExtension` | Prevent formation label overlap at low zoom | Low — add to existing IconLayer/TextLayer |
| `DataFilterExtension` | Toggle faction visibility on GPU, filter by morale/posture | Low — GPU filtering, no data rebuild |
| `FillStyleExtension` | Hatch patterns for siege zones, contested territory | Medium — needs pattern atlas |
| `PathStyleExtension` + `getOffset` | Double-line front rendering (RS side / RBiH side as offset parallels) | Medium — already proven for dashes |
| `TripsLayer` | Campaign replay animation (brigade paths over weeks) | High — needs per-turn position history |
| `_TerrainExtension` | Drape Deck.gl layers onto 3D terrain in ops modal | Experimental — stability not guaranteed |
