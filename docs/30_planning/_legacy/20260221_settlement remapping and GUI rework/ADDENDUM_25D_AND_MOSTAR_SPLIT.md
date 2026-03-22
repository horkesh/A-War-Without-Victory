# Addendum: 2.5D Map Rendering & Mostar Settlement Split

**Date:** 2026-02-21  
**Status:** PROPOSAL ADDENDUM  
**Applies to:** SETTLEMENT_CLUSTERING_PROPOSAL_v2.md (§A: Mostar split), HOI_VISUAL_GUI_OVERHAUL_SPEC.md (§B: 2.5D rendering)

---

## Part A: Mostar Central Settlement Split

### A.1 Problem

The canonical substrate has a single "Mostar" settlement covering the entire city. Historically, Mostar was split along the Neretva River: the west bank was Croat-majority (HVO-controlled), the east bank was Bosniak-majority (ARBiH-controlled). The siege of East Mostar (May 1993–Feb 1994) and the destruction of Stari Most are among the war's most significant events. A single Mostar settlement makes it impossible to model the east/west split, the siege, or the three-way dynamics in the city.

### A.2 Solution: Pre-Clustering Geometric Split

Before the clustering algorithm runs, the canonical Mostar central settlement is **split into two operational settlements** along the Neretva River:

| Unit | Name | Geometry | Notes |
|---|---|---|---|
| **Mostar West** | Mostar Zapad | West bank polygons (everything west of the Neretva) | HVO heartland, OZ HQ |
| **Mostar East** | Mostar Istok | East bank polygons (everything east of the Neretva) | Besieged ARBiH pocket 1993–94 |

The split is performed by clipping the original Mostar settlement polygon against the Neretva River centerline (available from the river geometry in the base features dataset). This is a geometric operation in the derivation pipeline, producing two new polygons from one.

### A.3 Population Distribution

The 1991 census reports Mostar municipality's total population (~126,000) with the following approximate ethnic breakdown: ~34% Bosniak, ~34% Croat, ~19% Serb, ~13% Other/Yugoslav.

The city of Mostar (the central settlement, not the full municipality) had a pre-war population of approximately **75,000–80,000**. The distribution between banks is modeled as follows:

**Distribution rule — realistic mixing, NOT pure segregation:**

| | Mostar West | Mostar East |
|---|---|---|
| **Total population share** | 55% | 45% |
| **Croat %** | 55% | 15% |
| **Bosniak %** | 18% | 52% |
| **Serb %** | 14% | 20% |
| **Other/Yugoslav %** | 13% | 13% |

**Rationale:** Pre-war Mostar was mixed, not segregated. The west bank had a Croat plurality but substantial Bosniak and Serb minorities. The east bank had a Bosniak plurality but substantial minorities of all groups. The clean ethnic division only emerged *during* the war through ethnic cleansing. The simulation must start from the mixed pre-war reality — the segregation is something the war *produces*, not something it starts from.

The 55/45 population split (west/east) reflects that the west bank contained the main commercial center, university, and government buildings — slightly more densely populated.

**These distribution ratios are tuning parameters** stored in the zone configuration file. They should be validated against any available neighborhood-level census data if it can be sourced.

### A.4 Ethnic Key Assignment

Given the above distribution:
- **Mostar West:** Croat plurality at 55% → ethnic key **C** (Croat supermajority, since ≥40% and is plurality... wait, 55% exceeds 40% and Croat is plurality → `Cm`. But it also doesn't reach 70% so it's NOT supermajority → **Cm**)
- **Mostar East:** Bosniak plurality at 52% → ethnic key **Bm** (Bosniak majority)

Both halves are **merge-protected** (municipal seat status, urban center classification, and full-protection zone). They will never be merged with anything.

### A.5 Adjacency

Mostar West and Mostar East are adjacent to each other (they share the Neretva river boundary). Each inherits the adjacency relationships of the original Mostar settlement with surrounding settlements — West inherits adjacencies to settlements on the western/southwestern side, East inherits adjacencies to settlements on the eastern/northeastern side. Adjacencies are determined by the new clipped polygon geometries using the standard contact graph rules.

### A.6 Impact on Other Systems

- **Political control:** At game start (April 1992), both halves initialize with the same controller (per Mostar municipality's initial political controller). The east/west split becomes meaningful when the RBiH-HRHB alliance deteriorates and the 1993 war begins — at that point, Mostar West can flip to HRHB and Mostar East remains RBiH (or is contested).
- **Brigade AoR:** HVO's Mostar Brigade operates on the west bank; ARBiH 4th Corps formations (441st, 442nd, 448th, 449th Brigades) operate on the east bank. The split allows proper AoR assignment.
- **Siege mechanics:** East Mostar as a separate operational settlement can be modeled as besieged (surrounded by HRHB-controlled West Mostar + surrounding settlements), with the siege system tracking supply, humanitarian pressure, and IVP impact independently.
- **Stari Most:** The bridge connecting the two halves is implicit in their adjacency. Its destruction (November 1993) could be modeled as severing or degrading the adjacency — a future mechanic.

### A.7 Pipeline Position

The Mostar split happens **before** the clustering algorithm (Phase A.0 — pre-clustering splits). The pipeline order is:

1. **A.0: Pre-clustering splits** — split Mostar (and any future splits) into constituent parts, generate new geometries and census data
2. **A: Classify** — assign ethnic keys to all settlements including the new split parts
3. **B–E:** Clustering as specified

The split is defined in the zone configuration file:

```json
{
  "pre_clustering_splits": [
    {
      "source_settlement": "mostar_central",
      "split_by": "river:neretva",
      "parts": [
        {
          "name": "Mostar Zapad",
          "side": "west",
          "population_share": 0.55,
          "ethnic_distribution": {
            "croat_share": 0.55,
            "bosniak_share": 0.18,
            "serb_share": 0.14,
            "other_share": 0.13
          }
        },
        {
          "name": "Mostar Istok",
          "side": "east",
          "population_share": 0.45,
          "ethnic_distribution": {
            "croat_share": 0.15,
            "bosniak_share": 0.52,
            "serb_share": 0.20,
            "other_share": 0.13
          }
        }
      ]
    }
  ]
}
```

This mechanism is extensible — if other settlements need splitting in the future (e.g., a Brčko urban split), the same framework handles it.

---

## Part B: 2.5D Map Rendering Architecture

### B.1 Why 2.5D

Hearts of Iron renders its world map as a 3D mesh viewed from a tilted camera — terrain has actual geometric height, the camera can zoom from country-level to province-level smoothly, and UI elements (unit counters, labels, icons) scale proportionally with zoom. This is what makes it feel like a physical map on a table rather than a flat diagram.

AWWV already has both 2D and 3D map implementations with DEM data available. The 2.5D approach — a height-displaced terrain mesh viewed from a fixed oblique angle — combines the best of both: terrain relief is visible as actual geometry (mountains rise, valleys dip), political fills are draped over the terrain, and the camera system supports smooth continuous zoom without per-frame polygon redrawing.

Canvas 2D cannot achieve this without severe performance constraints at deep zoom levels. With ~1,500–2,500 operational settlement polygons, a naive redraw approach hits frame budget limits at tactical zoom. WebGL solves this fundamentally: the GPU handles the mesh, textures, and sprite rendering, freeing the CPU for simulation work.

### B.2 Rendering Stack

**Engine:** Three.js (r128, already available in the project's dependency set)

**Camera:** Orthographic with a fixed tilt angle of ~20° from vertical (adjustable). This gives subtle parallax on terrain features without the disorientation of a full perspective camera. The tilt is small enough that the map reads as "top-down with depth" rather than "3D landscape."

**Core rendering layers (bottom to top):**

| Layer | Geometry | Texture/Material | Update Frequency |
|---|---|---|---|
| 1. **Terrain mesh** | Subdivided plane displaced by DEM heightmap | Painted relief texture (pre-rendered from DEM) | Static (built once) |
| 2. **Water** | River/lake polygons, slightly below terrain | Blue-grey semi-transparent | Static |
| 3. **Political control** | Settlement polygon meshes draped on terrain | Dynamic texture: faction color per OSID | Per turn (when control changes) |
| 4. **Roads** | Line geometries draped on terrain | Thin ochre/brown | Static |
| 5. **Front bands** | Ribbon meshes along front edges, draped on terrain | Dynamic: band color/opacity from persistence | Per turn |
| 6. **Province borders** | Line geometries on terrain | Thin dark lines (same-faction), dashed (municipality) | Static |
| 7. **Enclave rings** | Dashed ring geometries | Faction-colored dashed | Per turn |
| 8. **Order arrows** | 3D Bézier tube/ribbon meshes | Faction-colored, animated UV scroll | Per order change |
| 9. **Formation markers** | Billboarded sprites | Counter texture with faction color, name, posture | Per turn + per zoom |
| 10. **Labels** | Billboarded text sprites | Settlement/municipality names | Per zoom (LOD filter) |
| 11. **Strategic points** | Billboarded icon sprites | Diamond/star markers | Static |
| 12. **UI overlays** | HTML/CSS overlay div | Tooltips, panels, modals | On interaction |

### B.3 Zoom & LOD System

**Continuous zoom** from strategic (all of BiH) to tactical (neighborhood-level in Sarajevo) without discrete zoom levels.

**LOD tiers** — content appears/disappears based on camera altitude:

| Camera Altitude | Equivalent | Terrain Detail | Settlements Shown | Labels | Formations |
|---|---|---|---|---|---|
| >500 | Strategic | Low-res mesh, coarse texture | All (as colored blobs) | Major cities only | Corps markers only |
| 200–500 | Operational | Medium mesh, medium texture | All with distinct borders | Towns + municipal seats | Corps + brigade markers |
| 50–200 | Tactical | High-res mesh, full texture | All with full detail | All protected settlements | All formations, expanded counters |
| <50 | Close tactical | Maximum mesh detail | Individual polygons crisp | All labels | Formation counters at maximum size |

**Tile-based terrain streaming (optional optimization):** If the full terrain mesh is too large for GPU memory at maximum detail, split into tiles (e.g., 16×16 grid) and stream high-detail tiles for the viewport area only, with lower-detail tiles for the periphery. Three.js supports this via LOD objects.

### B.4 Scaling Behavior

**Formation markers scale with zoom** — this is critical for the HoI feel:

- At strategic zoom, corps counters are ~30px on screen, brigade counters are hidden
- At operational zoom, brigade counters are ~25px, corps counters grow to ~40px
- At tactical zoom, brigade counters are ~40px with full detail (name, personnel, cohesion bar), corps hidden
- Scaling is **continuous** (interpolated), not step-wise — counters smoothly grow/shrink as you zoom

**Implementation:** Formation markers are Three.js `Sprite` objects with a scale factor that is a function of camera altitude. The sprite texture is rendered at high resolution and downscaled by the GPU — this means they're always crisp regardless of zoom.

```
sprite.scale = BASE_SIZE * (REFERENCE_ALTITUDE / camera_altitude) * SCALE_FACTOR
```

Where `SCALE_FACTOR` is a tuning parameter per marker type (corps = 1.5, brigade = 1.0, OG = 0.8).

**Labels scale similarly** but with a floor and ceiling:
- Below minimum size → hidden (LOD filter)
- Above maximum size → clamped (don't let Sarajevo's label fill the screen at close zoom)

**Strategic point markers (diamonds/stars)** scale with zoom but more slowly — they should be subtle at strategic zoom and prominent at tactical zoom.

### B.5 Political Control Rendering

Political control fills are rendered as **colored meshes** that follow the terrain surface:

1. Each operational settlement's polygon is triangulated (Delaunay or ear-clipping)
2. The triangulated mesh is displaced vertically by sampling the DEM heightmap at each vertex
3. The mesh is given a uniform color material (faction color at 75% opacity)
4. When control changes, only the affected settlement's material color is updated — no geometry rebuild

**Terrain visibility through control:** The terrain texture shows through the semi-transparent control fill, giving the "painted on a relief map" effect. Mountains are darker (terrain shadow shows through), lowlands are lighter.

### B.6 Front Band Rendering

Front bands are rendered as **ribbon meshes** draped on the terrain:

1. For each front edge, compute the shared boundary line between two operational settlements
2. Create a ribbon mesh centered on this line (width = 8 world units, adjustable)
3. Displace the ribbon vertices vertically to follow terrain height
4. Apply a material with opacity modulated by active_streak persistence
5. The center line is a separate thin mesh on top

**Performance:** Front bands are rebuilt each turn (or when control changes). With ~500–1,000 front edges expected (from the operational adjacency graph), this is computationally trivial for the GPU.

### B.7 Performance Expectations

| Element | Count (est.) | GPU Cost | Notes |
|---|---|---|---|
| Terrain mesh | 1 (subdivided) | Low (static geometry) | Single draw call with texture |
| Settlement meshes | 1,500–2,500 | Medium (instanced or merged) | Merge same-faction adjacent into single draw calls |
| Front ribbons | 500–1,000 | Low | Rebuilt per turn, few triangles each |
| Formation sprites | 80–100 | Very low | Billboarded, GPU-scaled |
| Labels | 100–500 (LOD) | Low | Text sprites, LOD-culled |
| Order arrows | 5–20 | Very low | Bézier tubes |

**Total expected draw calls per frame:** ~50–200 (with instancing and merging). Well within 60fps budget on any modern GPU. For comparison, HoI IV renders ~15,000 provinces with full terrain at 60fps.

### B.8 Camera Controls

| Input | Action |
|---|---|
| Scroll wheel | Zoom in/out (continuous, smooth easing) |
| Middle-click drag | Pan |
| Right-click drag | (reserved for context menu) |
| Left-click | Select settlement/formation |
| Keyboard arrows | Pan |
| `+` / `-` | Zoom |
| `Home` | Reset to strategic view (full country) |
| `M` | Center on player capital |
| Double-click settlement | Zoom to tactical level centered on settlement |

**Zoom easing:** Zoom transitions use exponential easing (fast start, slow finish) — this gives the HoI "swoop" feel when zooming in on a location.

**Camera bounds:** Camera cannot pan beyond the BiH boundary + 10% padding. Zoom is clamped between strategic maximum (full country visible) and tactical minimum (single settlement fills ~20% of viewport).

### B.9 Migration from Canvas 2D

The existing Canvas 2D tactical map (`src/ui/map/MapApp.ts`) handles interaction, data loading, state management, and UI panels. The migration preserves all of this:

1. **Replace the `<canvas>` element** with a Three.js renderer target (`WebGLRenderer`)
2. **Move polygon rendering** from `drawSettlements()` / `drawFrontLines()` / etc. into Three.js meshes and materials
3. **Keep HTML/CSS panels** as DOM overlay elements positioned over the Three.js canvas — tooltips, sidebar, right panel, modals all stay as HTML
4. **Keep the data pipeline** — `DataLoader`, `ControlLookup`, `GameStateAdapter` are unchanged
5. **Replace `MapProjection`** with Three.js camera/raycaster for coordinate transforms
6. **Replace `SpatialIndex`** with Three.js raycasting for hit testing

The interaction model (click settlement → open panel, right-click → context menu) stays identical. Only the rendering backend changes.

### B.10 Fallback

If WebGL is unavailable (rare in 2026, but possible), fall back to the existing Canvas 2D renderer with the warm palette applied as flat 2D. The 2.5D terrain relief and smooth zoom are lost, but the map is still functional. Detect via `WebGLRenderingContext` availability check at startup.

---

## Part C: Addendum to Both Proposals

### C.1 Updated Settlement Clustering Pipeline Order

```
0. Pre-clustering splits (Mostar → West/East; future extensible)
1. Phase A: Classify (ethnic keys, zone protection)
2. Phase B: Seed (protected settlements)
3. Phase C: Cluster (greedy absorption)
4. Phase D: Merge small clusters
5. Phase E: Derive (geometry union, census sum, adjacency rebuild)
6. Phase F: Generate 2.5D assets (triangulate polygons, compute terrain displacement, 
   pre-render terrain texture tiles)
```

Phase F is new — it converts the flat operational settlement GeoJSON into GPU-ready mesh data for the Three.js renderer. This includes triangulation, DEM sampling, and texture atlas generation.

### C.2 Updated Visual Spec: All Map References Are 2.5D

The HOI_VISUAL_GUI_OVERHAUL_SPEC.md should be read with the understanding that:
- "Map canvas" = Three.js WebGL renderer with oblique orthographic camera
- "Polygon fill" = terrain-draped colored mesh
- "Front band" = terrain-draped ribbon mesh
- "Formation marker" = billboarded sprite with zoom-proportional scaling
- "Label" = billboarded text sprite with LOD filtering
- "Terrain relief base layer" = actual geometric displacement, not a flat texture

The warm palette, faction colors, front band styling, and all visual constants remain as specified. The rendering technology changes from Canvas 2D to WebGL/Three.js, but the visual *output* is the same design intent — just with depth, parallax, and smooth zoom.

---

*End of addendum.*
