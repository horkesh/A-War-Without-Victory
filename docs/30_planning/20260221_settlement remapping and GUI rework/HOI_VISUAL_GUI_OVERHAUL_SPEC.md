# Hearts of Iron Visual & GUI Overhaul Specification

**Project:** A War Without Victory  
**Date:** 2026-02-21  
**Status:** PROPOSAL (pending design approval)  
**Companion to:** SETTLEMENT_CLUSTERING_PROPOSAL_v2.md  
**Supersedes:** GUI_DESIGN_BLUEPRINT.md §1, §6, §10, §11, §14, §21 (visual identity sections)  
**Preserves:** All simulation mechanics, determinism, data bindings

**Authority:** This document is the **authoritative aesthetic and look-and-feel target** for the map and GUI. Implementation status, technical stack choices, and component-level details are tracked in **AWWV_GUI_ARCHITECTURE_REWORK_v2.md** (§0). Use this spec for design decisions; use the v2 doc for what is built and what is next.

---

## 1. Design Vision Shift

**Implementation update (2026-02-28):** The rendering technology has changed from Canvas 2D to MapLibre GL JS. Map visuals (terrain, fills, front lines, formation markers) are now driven by a MapLibre style spec (`awwv_map_style.json`) with PMTiles raster and vector sources. GUI panels are React + Tailwind components overlaid on the MapLibre canvas. The visual design goals in this document remain the authoritative aesthetic target. Section 2 references to "drawImage", "Canvas 2D API", and "pre-rendered texture" should be read as "MapLibre raster/vector tile layers" — the visual effect is the same, the technology is different.

### 1.1 From NATO Ops Center to Printed War Map

The current aesthetic — dark navy canvas, phosphor-green CRT accents, IBM Plex Mono — was designed as a "NATO Ops Center meets basement command post." It works for conveying data density but reads as a *technical monitoring system*, not a *war game*. The map feels like a GIS viewer; the panels feel like a debug console.

Hearts of Iron's visual language communicates something different: **you are a head of state looking at an operations map on your desk**. The map itself is a physical object — printed, painted, marked up by staff officers. The GUI around it is the institutional apparatus of command: organized, hierarchical, but with the warmth of wood-paneled offices and brass fixtures rather than CRT terminals.

**The new vision:** The warroom (desk, props, atmosphere) remains dark and atmospheric — it's the *room you're sitting in*. But the *map* you're looking at is a warm, printed operations map: parchment base, saturated painted fills, bold painted fronts, terrain relief visible under the political overlay. The GUI panels are styled as institutional documents — formatted cards, clean hierarchy — not terminal windows.

### 1.2 The Two Layers

| Layer | Aesthetic | Reference |
|---|---|---|
| **The Room** (warroom background, desk, props) | Dark, atmospheric, 1990s Eastern European government office | Current warroom implementation — keep as-is |
| **The Map** (operations map rendered on canvas) | Warm parchment, painted terrain, saturated control fills, bold front bands | Hearts of Iron IV, operational war maps, CIA Balkan Battlegrounds map plates |
| **The Panels** (sidebar, intelligence, management screens) | Clean institutional cards, warm dark backgrounds, organized hierarchy | HoI IV panels — faction headers, sortable tables, nested trees, tooltip-rich |

---

## 2. Map Rendering Overhaul

### 2.1 Base Layer: Terrain Relief

**Current:** Flat dark navy canvas (`#0d0d1a`). No terrain visibility.

**New:** A pre-rendered terrain relief layer derived from DEM data, styled as a watercolor/painted topographic map.

- Elevation rendered as subtle shaded relief (hillshading) with warm tones: lowlands in pale tan/cream, hills in olive/sage, mountains in grey-brown with shadowed faces
- Major river courses visible as thin blue-grey lines (permanent, not toggleable — rivers are geography, not data)
- Forest/vegetation suggested by slight green tinting in lower elevations (subtle, not literal)
- The relief layer lives *underneath* the political control overlay and is always visible through it
- At full political fill opacity, terrain is dimly visible; as fill transparency increases, terrain becomes more prominent
- Road network rendered as thin ochre/brown lines (pre-modern road map style, not GIS vector style)

**Implementation:** Terrain relief is now delivered via **hillshade.pmtiles** (raster tiles from DEM, zoom 6–12) rather than a pre-rendered static texture. The visual goal — warm watercolor topographic feel — still applies; it is achieved through MapLibre's raster-opacity, hillshade coloring, and the paper-tone background layer underneath.

### 2.2 Political Control Fills

**Current:** Faction color at 65% alpha over dark canvas. Neutral settlements grey.

**New:** HoI-style saturated painted fills over parchment/terrain base.

| Faction | Fill Color | Style |
|---|---|---|
| RS | `rgba(178, 60, 60, 0.75)` — warm crimson, desaturated slightly from current | Solid painted fill |
| RBiH | `rgba(65, 145, 80, 0.75)` — forest green, slightly warmer than current | Solid painted fill |
| HRHB | `rgba(55, 115, 175, 0.75)` — steel blue, same family as current | Solid painted fill |
| Null/uncontrolled | `rgba(180, 170, 150, 0.30)` — warm parchment, minimal fill | Terrain shows through |
| Contested | Control fill + subtle diagonal hatch in opposing faction's color | Communicates instability |

**Key change:** Fills are at 75% alpha on a *warm light base*, not 65% on a *dark base*. This inverts the visual weight: territory is colorful and prominent, boundaries are defined by color contrast between factions rather than by bright white lines.

**Implementation:** Political control fills are now **MapLibre fill layers** driven by data-driven styling on the controller property. The alpha values in the table above (0.75) are aspirational — the current implementation uses lower opacity (e.g. 0.25) with a faction-border-glow for the HoI fade effect. These can be tuned to match the spec.

**Province borders (intra-faction):** HoI renders same-faction province borders as very thin, dark lines — barely visible but subtly defining the province grid. For AWWV: same-faction operational settlement borders rendered as `rgba(0, 0, 0, 0.12)` at 0.5px. Present but not distracting.

**Municipality borders:** Thin dashed lines in `rgba(0, 0, 0, 0.25)` at 1px. These are the administrative layer — visible when you look for them, not competing with the military situation.

### 2.3 Front Lines: Painted Bands

**Current:** Two-pass rendering — amber glow + white dashed line. Reads as a technical overlay.

**New:** HoI-style thick painted front bands.

**Implementation:** Front lines are computed by `generateFactionBorders.ts` and rendered as **MapLibre line layers**. The current implementation uses: dark base line + white dash (HoI barbed-wire style) + faction-colored glow. The spec's "thick painted band" approach below is a valid alternative that can be selected (e.g. via a style toggle).

The front is rendered as a **thick semi-transparent band** along the faction boundary, not as a thin line. The band straddles the boundary — extending slightly into both sides' territory — and is colored to indicate the *character* of the front.

**Band rendering:**

1. For each front edge (operational settlement pair with different non-null controllers), compute the shared boundary segment
2. Draw a band centered on that boundary:
   - **Width:** Base 8px at operational zoom, scaling with zoom level (4px at strategic, 12px at tactical)
   - **Color:** Neutral warm grey `rgba(80, 60, 40, 0.6)` — the front is a *scar* on the map, not faction-colored
   - **Intensity modulation by persistence:** `active_streak ≥ 8` → full opacity (entrenched front); `4–7` → 80%; `1–3` → 50%; `0` → 20% (flickering contact)
3. **Edge line:** A thin dark line (1px, `rgba(40, 30, 20, 0.8)`) runs along the center of the band — the actual front trace
4. **Barbed wire markers:** At high zoom, front edges with `friction > 5` get small barbed-wire hash marks perpendicular to the front line (drawn at intervals along the band)

**Front pressure overlay (when active):** The band color shifts from the neutral grey to a gradient: green (defender advantage) through yellow (balanced) to red (attacker advantage). Pressure value modulates the hue continuously.

**Result:** Fronts read as **physical features of the map** — like battle damage or defensive works painted onto the terrain — rather than as data overlays. Static, entrenched fronts are thick, dark, prominent. Fluid, newly formed contacts are thin and faint.

### 2.4 Formation Markers: Front-Distributed

**Current:** Single NATO marker per formation at HQ/centroid location.

**New:** Brigade markers are positioned at the centroid of their assigned settlement (OSID). When multiple brigades occupy the same settlement, they are visually stacked to remain individually visible and clickable.

**Implementation (2026-03-05):** Formation markers are **MapLibre symbol layers** with programmatically generated sprites in `formationIcons.ts`.
- **Centering:** Brigade markers are positioned exactly at the OSID centroid (front-line drift removed for precision).
- **Tactical Symbols:** Icons now feature scaled NATO tactical symbols (infantry X, mountain triangle, etc.) with refined line weights for clarity at small sizes.
- **Visual Stacking:** Implemented in `buildFormationsGeoJSON.ts`. Subsequent units in the same OSID are slightly offset (fanned stack effect) to ensure all units are distinguishable and clickable.
- **Filtering:** Corps and army HQs are filtered out (represented as command abstractions).
- **Scale:** Counter canvas 160×80 (pixelRatio 2), scaling across zoom levels.

**Marker placement algorithm:**

1. For each active brigade, resolve its location OSID.
2. If multiple formations share an OSID, apply a small cumulative offset (approx 30m east, 20m south per unit).
3. This creates a "fanned" stack where each marker's top-left corner is visible for selection.
4. If a brigade has no OSID (invalid state), it is skipped.

**Marker design (HoI-inspired):**

- Rectangular counter with rounded corners: 40×20px at operational zoom
- Background: faction color at 85% opacity with subtle drop shadow
- Content: short formation name (truncated to fit) in white 9px font
- Left edge: thin posture indicator stripe (green=defend, amber=probe, red=attack, blue=elastic defense)
- On hover: expand to show full name, personnel count, cohesion bar
- Cohesion-based wear: counters at <30 cohesion get a visual "battered" effect (slightly desaturated fill, roughened edge)

**Corps markers (strategic zoom):**

- Larger counter: 60×28px
- Corps name + stance indicator
- Shows at strategic zoom only; individual brigade markers hidden
- Click to expand subordinate list

**Formation spacing:** Handled via visual stacking logic in `buildFormationsGeoJSON.ts`. Stacks are fanned out so that subsequent units are offset slightly, maintaining clickability for the entire group.

### 2.5 Order Arrows: Bold and Directional

**Current:** Attack arrows are red lines with arrowheads. Movement arrows are dashed.

**New:** HoI-style thick, animated directional arrows.

**Attack arrows:**
- Thick shaft (6–8px) in faction color (not universal red), with darker edge stroke
- Large filled arrowhead pointing at target settlement
- Animated: subtle pulse/throb when pending (pre-resolution); solid when committed
- Shaft follows a curved Bézier path from formation position to target (not straight line) — this gives the "sweeping offensive" feel
- Multiple arrows from the same corps in the same direction create a visual impression of a coordinated thrust

**Movement arrows:**
- Thinner shaft (4px), dashed, in faction color
- Smaller arrowhead
- No animation

**Named operation arrows:**
- When a named operation is active, participating brigade arrows are grouped visually: same color intensity, parallel paths, with a small operation name label ("OP CORRIDOR '92") along the arrow group

### 2.6 Strategic Points / Victory Points

Merge-protected settlements (municipal seats, strategic towns from the clustering proposal) get a small **star or diamond marker** at their centroid, sized by strategic importance:

- Municipal seats: small diamond (3px)
- Settlements with population ≥ 5,000: medium diamond (5px)
- Major cities (Sarajevo, Banja Luka, Tuzla, Mostar, Bihać, Zenica): large star (8px)

These are the HoI "victory point" equivalents — they communicate at a glance where the strategically significant locations are, even without clicking.

### 2.7 Enclave Visualization

Enclaves (detected per Engine Invariants §F) get a distinctive visual treatment:

- A thick dashed border in the enclave faction's color encircles the enclave's operational settlements
- A small label: "SREBRENICA ENCLAVE" / "GORAŽDE POCKET" / "BIHAĆ POCKET"
- Integrity percentage shown next to the label
- When integrity is critical (<30%), the border pulses in red

---

## 3. GUI Panel Overhaul

### 3.1 Color Palette Shift

**Current:** Dark navy backgrounds (#0a0a1a, #12121f, #1a1a2e), phosphor green accents, CRT effects.

**New:** Warm dark backgrounds, institutional accents, no CRT effects on panels.

| Element | Current | New |
|---|---|---|
| Panel background | `#12121f` (cold navy) | `#1c1a17` (warm charcoal) |
| Card background | `#1a1a2e` (blue-tinted) | `#252220` (warm dark brown) |
| Hover state | `#2a2a3e` (blue) | `#332e2a` (warm highlight) |
| Active/selected | `#1a3a3a` (teal) | `#3a3020` (amber tint) |
| Section headers | Phosphor green `#00ff88` | Warm gold `#c4a35a` |
| Primary text | `#e0e0e0` (neutral) | `#ddd5c8` (warm off-white) |
| Accent text | Phosphor green | Warm gold `#c4a35a` |
| Interactive | Cyan `#00bcd4` | Muted blue `#6a9ec2` |
| Warning | Amber `#ffab00` | Keep amber |
| Alert | Signal red `#ff3d00` | Keep signal red |
| Border/divider | Blue-grey | `rgba(180, 160, 130, 0.15)` (warm) |

**Typography:** Keep IBM Plex Mono for data readouts and labels. Add a secondary font — **IBM Plex Sans Condensed** — for longer text, panel titles, and narrative content (AAR text, news ticker, situation reports). The monospace-only aesthetic was correct for a terminal; the new aesthetic mixes terminal precision (data) with institutional readability (text).

**CRT effects:** Remove scanline overlay and phosphor glow from panels. These made sense for the NATO ops center theme but clash with the institutional/HoI feel. The map canvas can retain a very subtle vignette (darkened edges) for atmosphere.

### 3.2 Top Command Bar

**Current:** 48px dark strip with monospace elements.

**Redesign:** HoI-style top bar — faction banner + essential controls.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [FLAG] REPUBLIKA SRPSKA │ WEEK 23 • 15 Sep 1992 │ ▶ ADVANCE │ ⚙ MENU  │
│        Phase II          │ Territory: 67.2%       │  WEEK     │         │
└──────────────────────────────────────────────────────────────────────────┘
```

- Left zone: faction flag/emblem + faction name + current phase
- Center: turn/date + key summary stat (territory %, or an alert if something critical happened)
- Right: advance button + menu
- Background: gradient from faction color (left edge) to warm dark (right). Subtle, not garish — HoI does this with a ~5% faction tint across the bar.
- Height: 52px (slightly taller for readability)
- Map layer toggles move to a floating toolbar on the map canvas itself (small button cluster, bottom-right above minimap)

### 3.3 Strategic Sidebar (Left): Army Management — HoI-Style

This is the biggest GUI change. The current left sidebar is a flat War Status + OOB tree. HoI's equivalent is the **army management panel** — a hierarchical tree showing Theater → Army Group → Army → Corps → Division, with drag-and-drop reorganization.

For AWWV, the hierarchy is: **Faction → Corps → Brigade** (plus OGs as temporary overlays). There are no theaters or army groups, but the concept of **theater-like groupings** maps naturally to the geographic corps structure.

**Tabbed sidebar: two tabs (not four).** The four-tab design (Army / War Status / Diplomacy / Logistics) spreads information too thin. War Status, Diplomacy, and Logistics are consolidated into a single **SITUATION** tab showing a condensed strategic overview. This matches how players think: "How are my troops?" (Army tab) vs "How is the war going?" (Situation tab).

```
┌─ TABS ──────────────────────┐
│ [⚔ ARMY]   [📊 SITUATION]   │
└─────────────────────────────┘
```

The **Army** tab is the default and contains the corps cards, brigade rows, and reserve section below. The **Situation** tab combines: territory % (faction bar chart — 3 colored bars, one line); front summary ("12 static, 3 fluid, 1 oscillating" — one line); supply summary ("4 corridors open, 1 strained" — one line); casualty totals (one line per faction); exhaustion sparkline (tiny chart, 30px tall); alliance gauge (RBiH–HRHB bar — one line); IVP gauge (one line); active alerts (enclave integrity, corridor strain — scrollable list). All of this fits in a single scrollable panel. See §3.4–§3.6 for detailed content that populates the Situation tab.

**Sidebar structure (Army tab):**

```
┌─────────────────────── 300px ───────────────────────┐
│ ┌─ TABS ──────────────────────────────────────────┐ │
│ │ [⚔ ARMY]   [📊 SITUATION]                        │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ ═══════ ARMY TAB (default) ════════════════════════  │
│                                                      │
│ ┌─ ARMY STANCE ─────────────────────────────────┐   │
│ │ [BALANCED ▼]  Personnel: 142,350              │   │
│ │               Brigades: 47 active / 3 forming │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ ┌─ 1ST CORPS (SARAJEVO) ──── DEFENSIVE ◆ ──┐       │
│ │  Front: SARAJEVO POCKET (12 contact edges) │       │
│ │  Stance: [DEFENSIVE ▼]  Exhaustion: 14.2   │       │
│ │  OG: 1/2 slots   Personnel: 48,200        │       │
│ │  ┌─────────────────────────────────────────┐  │   │
│ │  │ ● 101st Mountain  1840  ■■■■□ ATK     │  │   │
│ │  │ ██ 102nd Motorized 2100  ■■■■■ DEF     │  │   │
│ │  │ ██ 105th Motorized 1650  ■■■□□ PRB     │  │   │
│ │  │ ◐ 111th Vitezka   920   ■□□□□ DEF ⚠  │  │   │
│ │  │ ── [Igman OG]      800   ■■■□□ ATK     │  │   │
│ │  └─────────────────────────────────────────┘  │   │
│ │  [+ PLAN OPERATION] [+ FORM OG]               │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ ┌─ 2ND CORPS (TUZLA) ─────────── BALANCED ◆ ──┐   │
│ │  Front: CENTRAL BOSNIA (8 contact edges)      │   │
│ │  ▼ Stance: [BALANCED ▼]  Exhaustion: 8.7     │   │
│ │  ...                                          │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ ┌─ RESERVE ─────────────────────────────────────────┐│
│ │  ● 7th Reserve Bde   1200  ■■■□□  —           │   │
│ │  ● 14th Light Bde     880   ■■□□□  —           │   │
│ │  [ASSIGN TO FRONT ▼]                            │   │
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ ... (scrollable)                                     │
└──────────────────────────────────────────────────────┘
```

**Corps card — front assignment:** Each corps card header shows a **FRONT:** line indicating which assignable front segment(s) this corps covers (e.g. "Front: SARAJEVO POCKET (12 contact edges)"). This connects the sidebar to the map so the player sees "3rd CORPS → CENTRAL BOSNIA FRONT" and can immediately locate it.

**Brigade rows — supply indicator:** Each brigade row has a small supply status icon (colored dot). **Green dot (●)** = full supply; **amber half-dot (◐)** = strained; **red empty dot (○)** = cut off. Example: `● 101st Mountain  1840  ■■■■□ ATK` (supplied); `◐ 111th Vitezka    920  ■□□□□ DEF ⚠` (strained); `○ 281st Srebrenica 640  ■□□□□ DEF ⛔` (cut off).

**Reserve section:** Brigades not assigned to any front appear in a separate **RESERVE** section at the bottom of the Army tab, not inside a corps card. Reserve rows show the same supply dot and cohesion bar; **[ASSIGN TO FRONT ▼]** allows assignment when mechanics support it.

**Key HoI translations:**

| HoI Concept | AWWV Equivalent | UI Element |
|---|---|---|
| Theater | Geographic region (not a formal mechanic — emergent from corps AoR) | Section header within corps |
| Army Group | Corps | Collapsible card with stance control, exhaustion, OG slots |
| Army | (No equivalent — brigades report directly to corps) | — |
| Division | Brigade | Row within corps card: name, personnel, cohesion bar, posture badge |
| General skill | (No equivalent — command span is the relevant stat) | Command span shown on corps card |
| Battle plan arrows | Named operations | Operation status shown on corps card + arrows on map |

**Brigade row interaction:**
- **Click:** Select brigade → map pans to its AoR front centroid, AoR highlights, right panel opens with brigade detail
- **Right-click:** Context menu: Set Posture, Attack, Move, Reshape AoR
- **Drag (future):** Drag brigade between corps to reassign (if mechanics support it)

**Corps card interaction:**
- **Click header:** Select corps → map pans to corps area, all subordinate AoRs highlight
- **Stance dropdown:** Change corps stance (confirmation dialog for offensive/reorganize)
- **Plan Operation button:** Opens named operation wizard
- **Form OG button:** Opens OG creation dialog (select donor brigades, focus area)
- **Collapse/expand:** Click triangle to collapse to header-only (corps name + stance + personnel total)

**Cohesion bars:** Five-segment bars (each segment = 20 cohesion). Filled segments in faction color, empty in dark. Brigade row at <30 cohesion gets an amber ⚠ icon. At <15 (auto-defend threshold) gets a red ⛔ icon.

**OG rows:** Shown with a dashed left border and italic name to distinguish from permanent brigades. Lifecycle timer shown ("3/8 turns remaining").

### 3.4 War Status Tab

*Content for the SITUATION tab.* Shows aggregate statistics:

- Territory control (% per faction, bar chart)
- Total personnel (per faction)
- Cumulative casualties (KIA/WIA/MIA)
- Exhaustion curve (sparkline)
- Front stability summary ("12 static, 3 fluid, 1 oscillating")
- Supply status summary ("4 corridors open, 1 strained, 1 cut")
- International Visibility Pressure gauge
- Key alerts ("Goražde integrity: 42% — critical")

### 3.5 Diplomacy Tab

*Content for the SITUATION tab.* Current Phase 0 / Phase I diplomatic state:

- RBiH-HRHB alliance gauge (visual bar from -1.0 to +1.0 with labeled thresholds)
- Patron commitment per faction (FRY → RS, Croatia → HRHB, international → RBiH)
- Embargo status
- Negotiation capital (when applicable)
- IVP events log

### 3.6 Logistics Tab

*Content for the SITUATION tab.* Supply and production overview:

- Supply corridors: list with status (open/strained/cut)
- Enclave supply status
- Equipment production rate
- Ammunition reserves (aggregate)
- Embargo impact indicators

### 3.7 Right Intelligence Panel: Context-Sensitive Detail

**Current architecture:** The right panel is context-sensitive — **SelectionPanel** ("Settlement Info") when an OSID is selected, **FormationDetail** when a formation is selected. Restyle per §9.2:

- Warm dark card backgrounds instead of cold navy
- Gold section headers instead of phosphor green
- Add a **"Focus on Map"** button that pans/zooms to the selected entity
- Brigade detail: add a visual AoR mini-map (small diagram showing the brigade's operational settlements, front edges highlighted)
- Settlement detail: add a strategic importance indicator (diamond size from §2.6)
- A richer 7-tab settlement detail view can be revisited if needed; start with the simple SelectionPanel.

**Implementation (React+MapLibre app):** Position the selection panel on the right using **inline styles** as the source of truth (`position: absolute`, `left: auto`, `right`, `top`, `bottom`, `width`, `zIndex`, `direction: ltr`) so Tailwind purge or RTL cannot override. For layout verification in development, `?showPanel=1` (dev-only) shows the selection panel without requiring a map click.

### 3.8 Panel interaction patterns

Consistent interaction patterns across all panels:

- **Selection model:** Exactly one entity is selected at a time. Clicking an OSID on the map opens the right panel with settlement detail. Clicking a formation marker opens formation detail. Clicking a brigade row in the sidebar opens formation detail and pans the map. Clicking a corps header pans to the corps area. Each new selection replaces the previous one. Escape clears selection.
- **Panel persistence:** The left sidebar (Army/Situation) is always visible when the sidebar is open. The right panel is context-sensitive — it appears when something is selected and disappears on Escape or clicking empty map space. Modals (Formation Command, Attack Confirmation, War Summary) overlay everything and must be explicitly dismissed.
- **Map ↔ sidebar sync:** Selecting a formation in the sidebar highlights its OSID(s) on the map. Selecting an OSID on the map highlights any formations in it in the sidebar (scrolling the sidebar if needed to show them). This bidirectional sync is essential — the player should never have to mentally map between sidebar text and map geography.
- **Hover previews:** Hovering over a brigade row in the sidebar temporarily highlights its AoR on the map (light outline, no fill change). Hovering over a corps header temporarily highlights all its subordinate AoRs. These highlights disappear on mouse-out. This gives spatial context without committing to a selection.

---

## 4. Formation Management Screen (Full-Width Modal)

### 4.1 HoI-Style Formation Overview

The current formation management table (§10 of GUI Blueprint) is functional but flat. The HoI equivalent is the **division designer / army overview** — a full-screen view of all formations with visual indicators, sorting, filtering, and batch operations.

**Redesign:**

```
╔═══════════════════════════════════════════════════════════════════╗
║ FORMATION COMMAND — ARBiH                     [×] CLOSE          ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  FILTER: [All ▼] [Active ▼]  SORT: [Corps ▼]  SEARCH: [______]  ║
║                                                                   ║
║  ┌─ 1ST CORPS (SARAJEVO) ──────── 12 brigades ────────────────┐ ║
║  │                                                              │ ║
║  │  ┌─────┬────────────────┬──────┬────────┬──────┬──────────┐ │ ║
║  │  │     │ Formation      │ Pers │ Coh    │ Post │ Orders   │ │ ║
║  │  ├─────┼────────────────┼──────┼────────┼──────┼──────────┤ │ ║
║  │  │ ███ │ 101st Mountain │ 1840 │ ██████ │ ATK  │ → S104   │ │ ║
║  │  │ ███ │ 102nd Motor.   │ 2100 │ ████████│ DEF │  —       │ │ ║
║  │  │ ███ │ 105th Motor.   │ 1650 │ █████  │ PRB  │ → S203   │ │ ║
║  │  │ ▓▓▓ │ 111th Vitezka  │  920 │ ██     │ DEF  │  — ⚠    │ │ ║
║  │  └─────┴────────────────┴──────┴────────┴──────┴──────────┘ │ ║
║  │                                                              │ ║
║  │  Totals: 6,510 pers │ Avg coh: 53 │ ATK: 1 │ Degraded: 1  │ ║
║  └──────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║  ┌─ 2ND CORPS (TUZLA) ──────── 8 brigades ────────────────────┐ ║
║  │  ...                                                         │ ║
║  └──────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║  ┌─ FORMING / RESERVE ──────────────────────────────────────────┐ ║
║  │  11th Mtn Bde .... FORMING (turn 3/5) .... Zenica           │ ║
║  └──────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
```

**Grouped by corps** (the HoI "army group" equivalent). Each corps section is collapsible. Brigades within each corps show the same data as the sidebar row but with more space: full name, personnel, cohesion visual bar, posture, AoR size, active orders.

**Color coding per row:**
- Full-health rows: normal text on warm dark background
- Degraded (<30 cohesion): amber left border, ⚠ icon
- Critical (<15 cohesion, auto-defend): red left border, ⛔ icon
- Forming: dimmed text, progress indicator
- OG members: dashed left border, italic

**Click row → pan to formation on map + open right panel detail.**

---

## 5. Named Operations System (HoI Battle Plans)

HoI's battle plan system (draw front line → assign armies → execute) translates to AWWV's named operations with some adaptation.

### 5.1 Operation Planning Wizard

Triggered from corps card → "Plan Operation" button. Steps:

1. **Name the operation** (text input, or generate: "OP [geographic feature] [year suffix]")
2. **Select participating brigades** (checkboxes from this corps's subordinates, minimum 2)
3. **Set operation parameters:**
   - Planning duration: 2–4 turns (longer = better preparation bonus)
   - Execution duration: 3–6 turns
   - Focus area: click operational settlements on map to define objective area
4. **Review:** Summary card showing estimated pressure bonus, cohesion cost, participating forces
5. **Confirm** → operation enters PLANNING phase

### 5.2 Operation Visualization on Map

Active operations get a visual footprint on the map:

- **Planning phase:** Faint dashed outline around focus area in faction color. Small "PLANNING" label.
- **Execution phase:** Bold solid outline. Thickened front bands in the operation area. Animated arrow group from participating brigades toward objective. "OP CORRIDOR '92 — EXECUTION" label.
- **Recovery phase:** Outline fades. "RECOVERY" label. No arrows.

### 5.3 Operation Card on Corps Panel

```
┌─ OP VLAŠIĆ ────────────────── EXECUTION ──┐
│ Phase: EXECUTION   Turn: 3/4               │
│ Pressure bonus: +50%   Cohesion cost: -4/t │
│ Participating: 370th Mtn, 7th Corps Res    │
│ [CANCEL]                                    │
└─────────────────────────────────────────────┘
```

---

## 6. Minimap Overhaul

**Current:** 200×150px dark background with colored dots.

**New:** HoI-style minimap showing:

- Terrain relief (same painted base as main map, scaled down)
- Faction control as solid color fills (no individual settlement detail — just municipality-level color blocks)
- Front lines as bold colored strokes
- White viewport rectangle (draggable)
- Formation markers as small dots along fronts
- Flash indicators for recent battles (small burst, fades after 2 seconds)

Position: bottom-left, 250×180px. Slightly larger than current to be useful. Semi-transparent background border in warm dark tone.

---

## 7. Information Tooltip System

HoI's tooltips are one of its best UI features — hovering over almost anything shows a rich, formatted tooltip with all relevant data. AWWV should adopt this comprehensively:

### 7.1 Settlement Hover Tooltip

```
┌───────────────────────────────┐
│ VIŠEGRAD                      │
│ Municipality: Višegrad        │
│ Controller: RS                │
│ Pop: 21,400                   │
│ ┌──────────────────────────┐  │
│ │ Bosniak 63% ████████░░░ │  │
│ │ Serb    33% █████░░░░░░ │  │
│ │ Croat    0% ░░░░░░░░░░░ │  │
│ │ Other    4% █░░░░░░░░░░ │  │
│ └──────────────────────────┘  │
│ Brigade: 3rd Drinski (RS)     │
│ Terrain: Mountain, River      │
│ ◆ Municipal Seat              │
└───────────────────────────────┘
```

### 7.2 Formation Hover Tooltip

```
┌──────────────────────────────────┐
│ 101st MOUNTAIN BRIGADE           │
│ 1st Corps (Sarajevo)             │
│ Personnel: 1,840                 │
│ Cohesion: ████████░░ 62          │
│ Posture: ATTACK                  │
│ AoR: 14 settlements (4 front)   │
│ Order: → Attack Grbavica         │
│ Status: Active                   │
└──────────────────────────────────┘
```

### 7.3 Front Edge Hover Tooltip

```
┌──────────────────────────────────┐
│ FRONT: RS — RBiH                 │
│ Persistence: 23 turns (static)   │
│ Pressure: +2.4 (RS advantage)   │
│ RS: 3rd Drinski (defend)         │
│ RBiH: 1st Višegrad (probe)      │
└──────────────────────────────────┘
```

Tooltips appear on 300ms hover delay. Dismiss on mouse-out. Never block click interactions.

---

## 8. Bottom Status Strip

**Current:** 32px strip with ticker text + system status.

**Redesign:** HoI-style alert/event strip.

- Left zone: scrolling news ticker (war correspondent prose, international events) — keep as-is but restyle warm
- Center: alert badges that appear briefly for critical events:
  - 🔴 "ENCLAVE INTEGRITY CRITICAL: Srebrenica 28%"
  - 🟡 "CORRIDOR STRAINED: Posavina supply brittle"
  - 🟢 "OP CORRIDOR '92: Execution complete"
- Right zone: turn/date (redundant with top bar — remove), replaced with quick-stats: "Fronts: 12S 3F 1O | Supply: 4/1/1 | IVP: 47"

---

## 9. Color System Summary

### 9.1 Map Canvas Palette

| Element | Color |
|---|---|
| Terrain base (lowlands) | `#d4c5a0` (warm tan) |
| Terrain base (highlands) | `#a8977a` (sage) |
| Terrain base (mountains) | `#8a7d6d` (grey-brown) |
| Rivers | `rgba(90, 120, 145, 0.6)` |
| Roads | `rgba(160, 130, 80, 0.4)` |
| RS fill | `rgba(178, 60, 60, 0.75)` |
| RBiH fill | `rgba(65, 145, 80, 0.75)` |
| HRHB fill | `rgba(55, 115, 175, 0.75)` |
| Front band | `rgba(80, 60, 40, 0.6)` |
| Front center line | `rgba(40, 30, 20, 0.8)` |
| Province border (same faction) | `rgba(0, 0, 0, 0.12)` at 0.5px |
| Municipality border | `rgba(0, 0, 0, 0.25)` at 1px dashed |
| Country boundary | `rgba(30, 20, 10, 0.8)` at 2px |

### 9.2 Panel Palette

| Element | Color |
|---|---|
| Panel background | `#1c1a17` |
| Card background | `#252220` |
| Hover | `#332e2a` |
| Active/selected | `#3a3020` |
| Section header text | `#c4a35a` (warm gold) |
| Primary text | `#ddd5c8` |
| Secondary text | `#9a9080` |
| Interactive elements | `#6a9ec2` (muted blue) |
| Faction RS | `#c24040` |
| Faction RBiH | `#4a9a55` |
| Faction HRHB | `#4080b8` |
| Warning | `#e8a020` |
| Alert | `#d03030` |
| Success | `#40a050` |
| Border/divider | `rgba(180, 160, 130, 0.15)` |

### 9.3 Typography

| Use | Font | Weight | Size |
|---|---|---|---|
| Data values, labels, codes | IBM Plex Mono | 400/600 | 11–13px |
| Panel titles, section headers | IBM Plex Sans Condensed | 600 | 14px, UPPERCASE |
| Body text (AAR, news, reports) | IBM Plex Sans Condensed | 400 | 13px |
| Formation names in sidebar | IBM Plex Mono | 400 | 12px |
| Map labels (settlements) | IBM Plex Mono | 500 | 10–12px (zoom-dependent) |
| Top bar faction name | IBM Plex Sans Condensed | 700 | 16px |
| Turn indicator | IBM Plex Mono | 700 | 20px |
| Tooltips | IBM Plex Sans Condensed | 400 | 11px |

---

## 10. Implementation Priorities

Priorities aligned with the React + MapLibre implementation (canonical GUI in `src/ui/map/`). **Implementation status** (what is done vs not yet) is tracked in **AWWV_GUI_ARCHITECTURE_REWORK_v2.md** §0.

**Phase A: Panel styling (COMPLETE — 2026-02-28)**

1. Apply §9.2 panel palette to all existing React components (TopToolbar, OOBSidebar, SelectionPanel, FormationDetail, BottomStatusStrip, CorpsCard, BrigadeRow)
2. Add IBM Plex Sans Condensed as secondary font
3. Add warm gold section headers, warm charcoal backgrounds
4. Add faction color gradient to TopToolbar
5. Add cohesion bars to BrigadeRow (five-segment visual)
6. Add supply status dots to BrigadeRow

**Phase B: Sidebar enhancement (COMPLETE — 2026-02-28 baseline)**

7. Add tabbed sidebar (Army / Situation)
8. Build Situation tab content (territory bars, front summary, supply summary, alerts)
9. Add front assignment display to CorpsCard
10. Add Reserve section
11. Implement corps stance controls
12. Add hover-preview highlighting (sidebar ↔ map)

Phase B baseline now exists in `src/ui/map/`: Army/Situation tabs, Situation summary cards, corps front labels, reserve list, stance dropdowns, hover-preview map outline, and selection clearing on Escape.

**Phase C: Rich interactions (NEXT)**

13. Rich tooltip system (settlement hover, formation hover, front edge hover)
14. MapModeToolbar (Political Control / Ethnic / Supply / Pressure modes)
15. MapLayerToggles
16. Keyboard shortcuts (Escape, Enter, 1–4 for map modes)
17. Attack confirmation modal
18. Order queue panel

**Phase D: Map visual polish (COMPLETE — 2026-03-07)**

19. Tune faction fill opacity for best terrain visibility
20. Strategic point markers (diamonds/stars at municipal seats and major cities)
21. Enclave visualization (dashed border, integrity label, pulse at critical)
22. Precise OSID centering and visual stacking for formation markers (§2.4) (COMPLETE)
23. Subtle always-on sector boundaries (COMPLETE — 2026-03-07)
24. Sector hover previews (Map + Sidebar) (COMPLETE — 2026-03-07)
25. Surfaced institutional constraints (fatigue/supply) in ORBAT (COMPLETE — 2026-03-07)
26. Bézier order arrows
27. Settlement labels from OSM places layer
28. Selectable front line styles (dashed, glow, chevron)

**Phase E: Full modals**

26. Formation Command full-screen modal (§4)
27. Named Operation planning wizard (§5)
28. War Summary modal
29. Recruitment modal
30. Minimap (bottom-left, 250×180)

---

## 11. What Stays the Same

- **Warroom** (desk, props, atmosphere) — untouched, still dark and atmospheric
- **Simulation mechanics** — zero changes, pure visual/UI
- **Data bindings** — all GUI elements still bind to the same state fields
- **Keyboard shortcuts** — same set, same keys (extended per §10 Phase C)
- **Determinism** — visual-only changes
- **Canonical map/GUI:** The **React + MapLibre map app** (`src/ui/map/`, run via `npm run dev:map`) is the canonical player-facing GUI. Legacy `map_hoi.html` and `tactical_map.html` are archived; do not target them for new GUI work.
- **Map rendering:** MapLibre GL JS with PMTiles. **GUI:** React + Tailwind + Zustand.
- **AAR modal** — same content, restyled
- **Order system mechanics** — same workflow (select → target → confirm), better visual feedback

The right panel uses a simpler **SelectionPanel** (Settlement Info) for OSID detail rather than a 7-tab structure. A richer 7-tab settlement detail view can be revisited if needed; start simple.

---

## 12. Open Questions

**Resolved:**

1. **Terrain texture resolution:** Resolved — hillshade PMTiles at zoom 6–12, derived from 4× upscaled Copernicus 30m DEM. Sharp at tactical zoom.
2. **Typography licensing:** IBM Plex fonts are SIL OFL; already in use. Confirmed.
4. **Performance of terrain base layer:** Resolved — MapLibre handles raster tile rendering natively with GPU acceleration. No performance concern.
5. **Transition plan:** Resolved — legacy UI archived; new React map app is canonical.

**Open:**

3. **Faction emblems:** Still needed for TopToolbar faction banner. RS double-headed eagle, RBiH fleur-de-lis, HRHB checkerboard. Simple SVG silhouettes. Could use Excalidraw to sketch or commission.
6. **Front line style selection:** Three styles proposed (dashed, glow, chevron/barbed). Need to decide if this is a settings toggle or hardcoded to one style.
7. **Panel width responsiveness:** Current sidebar is 300px fixed. Should it flex on wider screens? Should the right panel be a fixed width or proportional?

---

*End of proposal.*
