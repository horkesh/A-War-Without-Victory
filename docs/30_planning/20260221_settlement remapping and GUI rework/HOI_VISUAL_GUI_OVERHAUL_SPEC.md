# Hearts of Iron Visual & GUI Overhaul Specification

**Project:** A War Without Victory  
**Date:** 2026-02-21  
**Status:** PROPOSAL (pending design approval)  
**Companion to:** SETTLEMENT_CLUSTERING_PROPOSAL_v2.md  
**Supersedes:** GUI_DESIGN_BLUEPRINT.md §1, §6, §10, §11, §14, §21 (visual identity sections)  
**Preserves:** All simulation mechanics, determinism, data bindings

---

## 1. Design Vision Shift

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

**Implementation:** Pre-render a static terrain texture from DEM + OSM data at a resolution matching the canvas. Render as a background image layer, not as per-frame geometry. This is a one-time pipeline step.

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

**Province borders (intra-faction):** HoI renders same-faction province borders as very thin, dark lines — barely visible but subtly defining the province grid. For AWWV: same-faction operational settlement borders rendered as `rgba(0, 0, 0, 0.12)` at 0.5px. Present but not distracting.

**Municipality borders:** Thin dashed lines in `rgba(0, 0, 0, 0.25)` at 1px. These are the administrative layer — visible when you look for them, not competing with the military situation.

### 2.3 Front Lines: Painted Bands

**Current:** Two-pass rendering — amber glow + white dashed line. Reads as a technical overlay.

**New:** HoI-style thick painted front bands.

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

**New:** Brigade markers are positioned along their AoR's front edge, not at a centroid.

**Marker placement algorithm:**

1. For each active brigade, identify all front-active operational settlements in its AoR (settlements with at least one opposing-control adjacency edge)
2. Compute the centroid of only the front-active settlements (not the entire AoR)
3. Place the marker at this front centroid
4. If a brigade has no front-active settlements (fully rear), place at AoR geographic centroid (as now)

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

**Formation spacing:** When multiple brigade markers would overlap (adjacent AoRs on the same front), offset them vertically by 15px each, stacked perpendicular to the front line. HoI does this elegantly — a stack of counters along a front segment communicates density at a glance.

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

**New sidebar structure:**

```
┌─────────────────────── 300px ───────────────────────┐
│ ┌─ TABS ──────────────────────────────────────────┐ │
│ │ [ARMY]  [WAR STATUS]  [DIPLOMACY]  [LOGISTICS]  │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ ═══════ ARMY TAB (default) ════════════════════════  │
│                                                      │
│ ┌─ ARMY STANCE ─────────────────────────────────┐   │
│ │ [BALANCED ▼]  Personnel: 142,350              │   │
│ │               Brigades: 47 active / 3 forming │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ ┌─ 1ST CORPS (SARAJEVO) ──────── DEFENSIVE ◆ ──┐   │
│ │  ▼ Stance: [DEFENSIVE ▼]  Exhaustion: 14.2   │   │
│ │  OG: 1/2 slots   Personnel: 48,200           │   │
│ │  ┌─────────────────────────────────────────┐  │   │
│ │  │ ██ 101st Mountain  1840  ■■■■□ ATK     │  │   │
│ │  │ ██ 102nd Motorized 2100  ■■■■■ DEF     │  │   │
│ │  │ ██ 105th Motorized 1650  ■■■□□ PRB     │  │   │
│ │  │ ██ 111th Vitezka   920   ■□□□□ DEF ⚠  │  │   │
│ │  │ ── [Igman OG]      800   ■■■□□ ATK     │  │   │
│ │  └─────────────────────────────────────────┘  │   │
│ │  [+ PLAN OPERATION] [+ FORM OG]               │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ ┌─ 2ND CORPS (TUZLA) ─────────── BALANCED ◆ ──┐   │
│ │  ▼ Stance: [BALANCED ▼]  Exhaustion: 8.7     │   │
│ │  ...                                          │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ ┌─ 3RD CORPS (ZENICA) ──────── OFFENSIVE ◆ ──┐    │
│ │  ...                                         │    │
│ │  OP VLAŠIĆ — EXECUTION (turn 3/4)            │    │
│ │  ...                                         │    │
│ └───────────────────────────────────────────────┘    │
│                                                      │
│ ... (scrollable)                                     │
└──────────────────────────────────────────────────────┘
```

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

Replaces the top section of the current sidebar. Shows aggregate statistics:

- Territory control (% per faction, bar chart)
- Total personnel (per faction)
- Cumulative casualties (KIA/WIA/MIA)
- Exhaustion curve (sparkline)
- Front stability summary ("12 static, 3 fluid, 1 oscillating")
- Supply status summary ("4 corridors open, 1 strained, 1 cut")
- International Visibility Pressure gauge
- Key alerts ("Goražde integrity: 42% — critical")

### 3.5 Diplomacy Tab

Current Phase 0 / Phase I diplomatic state:

- RBiH-HRHB alliance gauge (visual bar from -1.0 to +1.0 with labeled thresholds)
- Patron commitment per faction (FRY → RS, Croatia → HRHB, international → RBiH)
- Embargo status
- Negotiation capital (when applicable)
- IVP events log

### 3.6 Logistics Tab

Supply and production overview:

- Supply corridors: list with status (open/strained/cut)
- Enclave supply status
- Equipment production rate
- Ammunition reserves (aggregate)
- Embargo impact indicators

### 3.7 Right Intelligence Panel: Context-Sensitive Detail

**Keep the current design** — settlement detail (7 tabs), brigade detail, corps detail. But restyle:

- Warm dark card backgrounds instead of cold navy
- Gold section headers instead of phosphor green
- Add a **"Focus on Map"** button that pans/zooms to the selected entity
- Brigade detail: add a visual AoR mini-map (small diagram showing the brigade's operational settlements, front edges highlighted)
- Settlement detail: add a strategic importance indicator (diamond size from §2.6)

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

### Phase A: Map Visual (pairs with settlement clustering)

1. Terrain relief base layer generation (DEM → painted texture)
2. Warm palette color constants (replace nato_tokens.ts values)
3. Political control fills at new opacity on warm base
4. Front band rendering (replace current two-pass line with thick painted band)
5. Province borders (thin intra-faction lines)
6. Municipality borders (thin dashed)

### Phase B: Formation Display

7. Front-distributed formation marker placement
8. HoI-style counter design (faction color, posture stripe, hover expand)
9. Corps markers at strategic zoom
10. Formation stacking on crowded fronts
11. Bézier curve order arrows

### Phase C: Army Management Sidebar

12. Tabbed sidebar structure (Army / War Status / Diplomacy / Logistics)
13. Corps cards with stance controls
14. Brigade rows with cohesion bars and posture badges
15. OG display within corps cards
16. Named operation cards and planning wizard

### Phase D: Panel Polish

17. Warm palette restyle of all panels (right panel, modals, management screen)
18. Typography update (add IBM Plex Sans Condensed)
19. Rich tooltip system
20. Formation management modal (grouped by corps)
21. Bottom status strip redesign

### Phase E: Map Polish

22. Strategic point markers (diamonds/stars)
23. Enclave visualization
24. Minimap overhaul
25. Map label improvements (LOD-appropriate sizing, warm colors)
26. Subtle vignette (keep) / remove CRT scanlines from panels

---

## 11. What Stays the Same

- **Warroom** (desk, props, atmosphere) — untouched, still dark and atmospheric
- **Simulation mechanics** — zero changes, pure visual/UI
- **Data bindings** — all GUI elements still bind to the same state fields
- **Keyboard shortcuts** — same set, same keys
- **Determinism** — visual-only changes
- **Canvas rendering technology** — still native Canvas 2D API, no external libraries
- **Settlement detail panel structure** — 7 tabs, same data, restyled
- **AAR modal** — same content, restyled
- **Order system mechanics** — same workflow (select → target → confirm), better visual feedback

---

## 12. Open Questions

1. **Terrain texture resolution:** Pre-rendering at 4096×4096 or 8192×8192? Higher resolution means better terrain detail at tactical zoom but larger asset size. Could tile at multiple zoom levels.

2. **Typography licensing:** IBM Plex Mono/Sans are open source (SIL OFL) — no issue. But confirm they're already bundled or if they need to be added to the build.

3. **Faction emblems:** The top bar faction banner wants a small emblem/flag. These need to be sourced or created: RS (double-headed eagle), RBiH (fleur-de-lis), HRHB (Croatian checkerboard). Simple silhouette versions would suffice.

4. **Performance of terrain base layer:** A large pre-rendered background image shouldn't impact frame rate (it's a single drawImage call), but needs testing at various canvas sizes.

5. **Transition plan:** This overhaul touches almost every visual constant and rendering function. Suggest implementing as a parallel "theme" system — a `theme.ts` module that exports all palette/sizing constants — so both old and new themes can coexist during transition, togglable in settings.

---

*End of proposal.*
