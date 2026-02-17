# GUI Design Blueprint — A War Without Victory

**Version:** 1.0
**Date:** 2026-02-14
**Purpose:** Comprehensive GUI design specification for implementation by engineers. Covers all screens, panels, interactions, visual language, and data bindings. Intended as the single reference for building the playable wargame interface.

---

## Table of Contents

1. [Design Philosophy and Visual Identity](#1-design-philosophy-and-visual-identity)
2. [Screen Architecture](#2-screen-architecture)
3. [Main Game Screen — Layout](#3-main-game-screen--layout)
4. [Top Command Bar](#4-top-command-bar)
5. [Strategic Sidebar (Left)](#5-strategic-sidebar-left)
6. [Tactical Map (Center)](#6-tactical-map-center)
7. [Right Intelligence Panel](#7-right-intelligence-panel)
8. [Bottom Ticker / Status Strip](#8-bottom-ticker--status-strip)
9. [Order System — Giving and Displaying Orders](#9-order-system--giving-and-displaying-orders)
10. [Brigade Management Screen](#10-brigade-management-screen)
11. [Corps and Army Command](#11-corps-and-army-command)
12. [Recruitment and Mobilization](#12-recruitment-and-mobilization)
13. [After-Action Reports (AAR)](#13-after-action-reports-aar)
14. [Front Visualization](#14-front-visualization)
15. [Supply and Logistics Overlay](#15-supply-and-logistics-overlay)
16. [Diplomatic / International Panel](#16-diplomatic--international-panel)
17. [War Summary Dashboard](#17-war-summary-dashboard)
18. [Replay / Rewatch Mode](#18-replay--rewatch-mode)
19. [Main Menu and Scenario Selection](#19-main-menu-and-scenario-selection)
20. [Audio Design Notes](#20-audio-design-notes)
21. [Typography and Color System](#21-typography-and-color-system)
22. [Keyboard Shortcuts](#22-keyboard-shortcuts)
23. [Implementation Priority](#23-implementation-priority)

---

## 1. Design Philosophy and Visual Identity

### 1.1 The Feel: "NATO Ops Center Meets Basement War Room"

The interface should feel like a **1990s NATO Combined Operations Center** — the kind of facility at SHAPE HQ or a CAOC — crossed with the **improvised basement command post** of a Bosnian brigade headquarters where maps are pinned to concrete walls and acetate overlays are marked with grease pencils.

**Key visual references:**
- NATO C2 displays from JSTARS ground stations (green-on-dark CRT aesthetic, but modernized)
- CIA situation room during Desert Storm — wall-mounted status boards, ticker tape feeds
- Yugoslav-era military map tables with hand-drawn unit positions and grease-pencil frontlines
- Gary Grigsby's War in the East (dense information, hex-based, no wasted space)
- Hearts of Iron IV (front arrows, army group management, production panels)
- Unity of Command (clean movement arrows, supply visualization)
- Command: Modern Operations (NATO APP-6 symbology, side panel OOB trees)

### 1.2 Design Principles

1. **Information density over aesthetics** — This is a serious wargame. Every pixel should convey state. No decorative chrome, no padding for padding's sake. Dense but legible.
2. **The map is king** — The tactical map is always visible, always the largest element. All panels overlay or dock beside it; nothing replaces it.
3. **NATO symbology** — All military units use APP-6 style symbols (rectangle for infantry, crossed diagonals for HQ, etc.) with faction colors. This is not negotiable.
4. **No hidden state** — If the simulation tracks it, the player should be able to see it. Cohesion, fatigue, supply, equipment condition, exhaustion — all inspectable.
5. **Orders are visible** — Every order the player gives (or the bot gives, in replay) should have a visible artifact on the map: arrows, markers, posture icons.
6. **CRT glow** — Subtle scanline/phosphor effects on key elements. Not overdone. A faint green or amber tint on status displays. The feeling that this data is being rendered on military-grade equipment from 1993.
7. **Red-on-black for warnings** — Critical alerts (low cohesion, supply cut, enclave falling) pulse in amber/red with military-style flash codes.

### 1.3 The "Plot Twist" Features

Beyond the standard wargame UI, AWWV should include:

- **The War Correspondent's Notebook** — A scrolling narrative log (bottom ticker or separate tab) that converts dry simulation events into journalistic prose: "Week 23: The 1st Romanija Brigade pushed into Foča municipality, displacing an estimated 4,200 civilians. International pressure mounts." This transforms numbers into stories.
- **The Situation Board** — A separate overlay that mimics a physical briefing board with pinned documents, control percentages written in marker, and casualty tallies. Updated each turn like a Pentagon situation room.
- **Fog of War Commander's Estimate** — For future: show the player what they *think* the enemy has vs. what they actually have. Perfect information is un-warlike. (Design hook only; implementation later.)
- **The Grease Pencil Layer** — Let the player draw directly on the map with a freehand tool. Plans, notes, arrows. Saved per-turn. This is how real commanders work.

---

## 2. Screen Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MAIN MENU SCREEN                            │
│   New Campaign │ Load Save │ Load Replay │ Scenarios │ Quit        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      MAIN GAME SCREEN                              │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   TOP COMMAND BAR                            │  │
│  ├────────┬─────────────────────────────────────┬───────────────┤  │
│  │STRATEGIC│          TACTICAL MAP              │ INTELLIGENCE  │  │
│  │SIDEBAR  │         (center, largest)          │   PANEL       │  │
│  │(left)   │                                    │   (right)     │  │
│  │         │                                    │               │  │
│  │ - War   │  Settlements, fronts, units,       │ - Settlement  │  │
│  │   Stats │  orders, supply overlays           │ - Brigade     │  │
│  │ - OOB   │                                    │ - Battle AAR  │  │
│  │ - Fac-  │        ┌──────────┐                │ - Front Intel │  │
│  │   tion  │        │ MINIMAP  │                │               │  │
│  │ - Corps │        └──────────┘                │               │  │
│  ├────────┴─────────────────────────────────────┴───────────────┤  │
│  │              BOTTOM TICKER / STATUS STRIP                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  MODAL OVERLAYS: AAR popup, Recruitment dialog, Diplomacy panel,   │
│  War Summary dashboard, Settings                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### Screen Transitions

| From | To | Trigger |
|------|----|---------|
| Main Menu | Game Screen | "New Campaign" or "Load Save" |
| Main Menu | Replay Screen | "Load Replay" |
| Game Screen | AAR Modal | End of turn (if battles occurred) |
| Game Screen | War Summary | Hotkey `F5` or button |
| Game Screen | Recruitment | Hotkey `R` or button |
| Game Screen | Main Menu | `Esc` → confirm |

---

## 3. Main Game Screen — Layout

### 3.1 Layout Proportions

| Element | Width | Height | Position |
|---------|-------|--------|----------|
| Top Command Bar | 100% | 48px | Fixed top |
| Strategic Sidebar | 280px | calc(100% - 48px - 32px) | Fixed left |
| Tactical Map | remaining | remaining | Center fill |
| Intelligence Panel | 320px | same as sidebar | Fixed right, collapsible |
| Bottom Ticker | 100% | 32px | Fixed bottom |
| Minimap | 200×150px | — | Bottom-left of map area |

All panels are **collapsible** via toggle buttons or hotkeys. When collapsed, the map expands to fill. Double-click the panel edge to collapse/expand.

### 3.2 Panel State Persistence

Panel open/closed state, widths, and scroll positions persist across sessions via local storage. The player's layout preferences are sacred.

---

## 4. Top Command Bar

A single 48px strip across the top. Dark background (#1a1a2e). Divided into zones:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [⚙] │ WEEK 23 │ APR 1992 + 23w │ ▶ ADVANCE │ █████ │ MAP LAYERS ▼ │ 🔍 │
│     │ Phase II │ Sat 15 Sep '92 │  [AUTO▶]  │ Zoom  │              │    │
└──────────────────────────────────────────────────────────────────────────┘
  ↑        ↑            ↑              ↑          ↑          ↑          ↑
 Menu   Turn/Phase  Calendar Date  Turn Controls  Zoom    Layer Menu  Search
```

### 4.1 Elements (left to right)

| Element | Description | Data Binding |
|---------|-------------|--------------|
| **Menu gear** | Opens dropdown: New, Load, Save, Settings, Quit | — |
| **Turn indicator** | `WEEK 23` in large monospace, `Phase II` below in smaller text | `state.meta.turn`, `state.meta.phase` |
| **Calendar date** | Derived from scenario start date + turn weeks. "Sat 15 Sep '92" format. Display-only, never in state. | Derived from scenario `start_date` + `meta.turn × 7` |
| **ADVANCE button** | Primary action button. Green background, white text. Prominent. Pulses faintly when it's the player's turn. Text: `▶ ADVANCE WEEK` | Triggers turn pipeline |
| **Auto-advance** | `[AUTO ▶]` toggle. When on, advances every N seconds (configurable 1-10s). Shows progress: `Week 23/52`. For "run to end" mode. | — |
| **Zoom controls** | `STRATEGIC / OPERATIONAL / TACTICAL` pill selector + `+`/`-` buttons. Current zoom level highlighted. | Map zoom state |
| **Layer menu** | Dropdown: Political Control (default), Ethnic 1991, Supply Status, Front Pressure, Terrain, Brigade AoR, Displacement. Checkboxes for overlays: Front Lines, Unit Markers, Order Arrows, Settlement Labels. | Map render flags |
| **Search** | Magnifying glass icon. Opens search overlay (settlement names, formation names, municipality names). Diacritic-insensitive. | Existing search |

### 4.2 Turn Advance Behavior

1. Player clicks `▶ ADVANCE WEEK`
2. Button grays out, shows spinner: `RESOLVING...`
3. Turn pipeline runs
4. If battles occurred: AAR modal auto-opens (dismissible)
5. Map updates, all panels refresh
6. Button re-enables with updated week number
7. Bottom ticker scrolls new events

---

## 5. Strategic Sidebar (Left)

Width: 280px. Dark panel (#12121f). Organized into **collapsible sections** with military-style headers (all-caps, underlined, faction crest where applicable).

### 5.1 Section: WAR STATUS

Always visible at the top. Shows the strategic picture at a glance.

```
╔══════════════════════════════╗
║       WAR STATUS             ║
╠══════════════════════════════╣
║ TERRITORY CONTROL            ║
║ ┌──────────────────────────┐ ║
║ │ ██████████░░░░░░░░░░░░░░ │ ║
║ │ RS 47.2%  RBiH 38.1%    │ ║
║ │           HRHB 11.3%    │ ║
║ │           NULL  3.4%    │ ║
║ └──────────────────────────┘ ║
║                              ║
║ POPULATION UNDER CONTROL     ║
║  RS:   1,241,000  (32.1%)   ║
║  RBiH: 1,890,000  (48.9%)   ║
║  HRHB:   512,000  (13.2%)   ║
║  Disp.:  224,000  ( 5.8%)   ║
║                              ║
║ TOTAL PERSONNEL UNDER ARMS   ║
║  RS:   42,180  [▼ -320]     ║
║  RBiH: 38,450  [▼ -180]     ║
║  HRHB: 12,200  [▲ +450]     ║
║                              ║
║ WAR CASUALTIES (cumulative)  ║
║  RS:    2,340 KIA │ 4,120 W ║
║  RBiH:  1,890 KIA │ 3,450 W ║
║  HRHB:    340 KIA │   820 W ║
║                              ║
║ EXHAUSTION                   ║
║  RS:   ████████░░  38.2     ║
║  RBiH: ██████░░░░  27.1     ║
║  HRHB: ███░░░░░░░  14.5     ║
╚══════════════════════════════╝
```

**Data bindings:**
- Territory control: count settlements in `political_controllers` per faction / total settlements
- Population: sum `militia_pools[].available + committed + exhausted` per faction, or derived from settlement population data
- Personnel: sum `formations[].personnel` per faction, with delta from last turn
- Casualties: `casualty_ledger[faction].killed`, `.wounded`, `.missing_captured`
- Exhaustion: `phase_ii_exhaustion[faction]` — bar visualization, 0-100 scale

### 5.2 Section: ORDER OF BATTLE (OOB)

Expandable tree grouped by faction → corps → brigade.

```
╔══════════════════════════════╗
║ ▼ ORDER OF BATTLE            ║
╠══════════════════════════════╣
║ ▼ [🟢] ARBiH                ║
║   ▼ 1st Corps (Sarajevo)    ║
║     ├ 1st Mech Bde  [A] 1840║
║     ├ 2nd Inf Bde   [D] 2100║
║     ├ 5th Mtn Bde   [P] 1650║
║     └ 7th Inf Bde   [A]  920║
║   ▶ 2nd Corps (Tuzla)       ║
║   ▶ 3rd Corps (Zenica)      ║
║ ▶ [🔴] VRS                  ║
║ ▶ [🔵] HVO                  ║
╚══════════════════════════════╝
```

Each brigade row shows:
- NATO unit symbol (tiny, color-coded by kind: infantry ╬, mechanized ╬⊗, artillery ⊙)
- Name (abbreviated)
- Posture indicator: `[D]`efend, `[P]`robe, `[A]`ttack, `[E]`lastic, `[C]`onsolidation
- Personnel count (right-aligned)
- Status dot: green (active), yellow (overextended), red (degraded), gray (forming)

**Interactions:**
- Click brigade → Intelligence Panel switches to Brigade view; map highlights AoR
- Right-click brigade → context menu: Set Posture, Move (municipality), Reshape AoR, View Details
- Click corps → shows corps stance, operation status
- Drag brigade between corps → transfer (if allowed)

### 5.3 Section: FACTION OVERVIEW

Collapsed by default. Shows selected faction's detailed stats:
- Authority profile (authority, legitimacy, control, logistics, exhaustion)
- Patron state (material support, diplomatic isolation, constraint severity)
- Embargo profile (heavy equipment access, ammo resupply, maintenance)
- Capability profile (training quality, organizational maturity)
- Alliance status (RBiH-HRHB relationship value and phase name)

### 5.4 Section: ACTIVE OPERATIONS

Lists any active named corps operations:
```
╔══════════════════════════════╗
║ ACTIVE OPERATIONS            ║
╠══════════════════════════════╣
║ ▶ OP CORRIDOR '92            ║
║   2nd Corps │ EXECUTION      ║
║   Turn 3/4 │ +50% pressure  ║
║   Brigades: 3rd, 7th, 11th  ║
║                              ║
║ ▶ OP IGMAN                   ║
║   1st Corps │ PLANNING       ║
║   Turn 1/3 │ +5% defense    ║
╚══════════════════════════════╝
```

### 5.5 Section: ALERTS AND WARNINGS

Military-style flash messages:
```
╔══════════════════════════════╗
║ ⚠ ALERTS                    ║
╠══════════════════════════════╣
║ ▲ 7th Inf Bde: COHESION 18  ║
║   Auto-downgrade to DEFEND   ║
║ ▲ Goražde enclave: INTEGRITY ║
║   dropped to 0.31            ║
║ ▲ Supply cut: Srebrenica     ║
║   corridor INTERDICTED       ║
║ ● Ceasefire: RBiH-HRHB      ║
║   Active since Week 41       ║
╚══════════════════════════════╝
```

Severity colors:
- Red (▲): Immediate threat — cohesion collapse, enclave falling, supply cut
- Amber (▲): Degrading — exhaustion rising fast, equipment worn
- Blue (●): Informational — ceasefire, diplomatic event, phase transition

---

## 6. Tactical Map (Center)

### 6.1 Base Layer

The map renders ~5,800 settlement polygons. Each settlement is filled with its **political controller** faction color:

| Faction | Fill Color | Border | Hex Code |
|---------|-----------|--------|----------|
| RS (Republika Srpska) | Deep crimson | Darker crimson | `#8B0000` fill, `#5C0000` border |
| RBiH (Republic of BiH) | Forest green | Darker green | `#1B5E20` fill, `#0D3B0F` border |
| HRHB (Herceg-Bosna) | Royal blue | Darker blue | `#0D47A1` fill, `#072E6F` border |
| Null / Uncontrolled | Charcoal gray | Dark gray | `#37474F` fill, `#263238` border |

Borders between settlements of the same faction: thin (#2a2a3a, 0.5px). Borders between different factions: thick (2px, white or bright contrasting).

### 6.2 Front Lines

Front lines are the **most important visual element** after control fill.

**Rendering approach:** For each edge in `front_segments` where the two adjacent settlements have different non-null `political_controller`:
- Draw a thick line (3-4px) along the shared boundary
- Color: bright white or faction-pair specific (RS-RBiH front: orange-red; RS-HRHB: purple; RBiH-HRHB: cyan)
- **Static fronts** (active_streak ≥ 4): solid line, slight glow
- **Fluid fronts** (active_streak < 4): dashed line, no glow
- **Oscillating fronts**: animated dash (marching ants effect)

**Front hardening visual:** As `active_streak` increases, the front line gets slightly thicker and gains a subtle double-line effect (like fortification on a military map).

### 6.3 Unit Markers on Map

Every active brigade with a known position (HQ settlement or municipality centroid) gets an on-map marker.

**Marker design (NATO APP-6 inspired):**
```
┌─────────┐
│ ╬  1.Mz │   ← NATO symbol + abbreviated name
│ 1840    │   ← personnel count
│ [ATK] ▶ │   ← posture + order indicator
└─────────┘
    │
    ● HQ location marker
```

- Background: faction color (semi-transparent)
- Border: white 1px
- Size: scales with zoom level. At strategic zoom: small dot + faction color. At operational: NATO symbol + name. At tactical: full marker with personnel and posture.
- **Posture badge:** Small icon in corner:
  - Shield (🛡) = Defend
  - Crosshair (⊕) = Attack
  - Arrow (→) = Probe
  - Wave (~) = Elastic Defense
  - Wrench (⚒) = Consolidation

**Forming brigades:** Shown with dashed border and "(FORMING)" label. Gray-tinted.

**Operational Groups:** Shown with a diamond-shaped marker (NATO OG symbol) and connecting lines to member brigades.

### 6.4 Order Arrows on Map

**This is critical.** When a brigade has orders, they must be visible:

#### Movement Orders (Municipality reassignment)
- **Thick dashed arrow** from current municipality centroid to target municipality centroid
- Color: faction color, semi-transparent
- Arrow head: open chevron (military style)
- Label on arrow: brigade abbreviation

#### Attack Orders
- **Bold red arrow** from brigade HQ to target settlement
- Arrow style: solid, pointed, with small explosion/star icon at the tip
- Thicker than movement arrows
- If multiple brigades attack the same target: arrows converge (but currently one-brigade-per-target rule)
- Color: bright red with white outline for visibility

#### AoR Reshape Orders
- **Thin curved arrow** from donor settlement to receiving brigade's AoR
- Color: yellow/amber
- Temporary: shown only during order phase

#### Planned vs. Executed
- **Pending orders** (not yet resolved): semi-transparent, animated pulse
- **Executed orders** (post-resolution): solid, with result icon (checkmark for success, X for failure, ~ for stalemate)

### 6.5 AoR Visualization

When a brigade is selected or AoR overlay is active:
- All settlements in the brigade's AoR get a highlighted border (thick, faction color, glowing)
- Settlements outside all AoRs (rear political control zones) get a subtle diagonal hatch pattern
- Settlement density indicators: small bar or number showing personnel/settlement ratio
- Front-active settlements within the AoR get a slightly brighter fill

### 6.6 Map Overlays (togglable)

| Overlay | Visual | Data Source |
|---------|--------|-------------|
| **Political Control** | Default fill colors | `political_controllers` |
| **Ethnic 1991** | Settlement fill by majority ethnicity (Bosniak green, Serb blue, Croat orange, mixed gray) | Census data |
| **Supply Status** | Green/yellow/red dots on settlements by supply state | Supply derivation |
| **Front Pressure** | Heat map on front edges: green (defender advantage) through yellow (balanced) to red (attacker advantage) | `front_pressure` values |
| **Terrain** | Contour-style shading showing elevation/roughness | `settlements_terrain_scalars.json` |
| **Brigade AoR** | Colored borders per brigade AoR assignment | `brigade_aor` |
| **Displacement** | Gradient overlay (darker = more displaced) | `displacement_state` |
| **Cohesion Heat** | Per-brigade AoR shaded by cohesion (green=high, red=low) | `formations[].cohesion` |
| **Equipment Condition** | Per-brigade AoR shaded by operational equipment ratio | `formations[].composition` |

### 6.7 Minimap

200×150px in bottom-left. Shows:
- Full BiH outline
- Faction control colors (simplified)
- Current viewport rectangle (draggable)
- Front lines (simplified thick lines)
- Optional: flash locations of recent battles

### 6.8 Map Interactions

| Action | Effect |
|--------|--------|
| Left-click settlement | Select → Right panel shows settlement intel |
| Left-click unit marker | Select brigade → Right panel shows brigade intel; AoR highlights |
| Right-click settlement | Context menu: Attack here (from selected brigade), View details |
| Right-click unit marker | Context menu: Set posture, Move brigade, Reshape AoR, Attach to corps |
| Scroll wheel | Zoom in/out |
| Middle-click drag | Pan |
| Shift+click settlements | Multi-select (for AoR reshape) |
| Ctrl+click | Add to selection |
| Double-click settlement | Zoom to tactical level centered on settlement |

---

## 7. Right Intelligence Panel

Width: 320px. Context-sensitive: shows different content based on what's selected.

### 7.1 Settlement Intelligence View

When a settlement is clicked:

```
╔══════════════════════════════════╗
║ [🟢] SETTLEMENT INTEL            ║
║ ─────────────────────────────── ║
║ 🏛 Višegrad                      ║
║ Municipality: Višegrad           ║
║ Controller: RS [since Week 4]    ║
║                                  ║
║ ┌─ DEMOGRAPHICS ───────────────┐ ║
║ │ Population:  21,400           │ ║
║ │ Bosniak:     63.0%           │ ║
║ │ Serb:        32.8%           │ ║
║ │ Croat:        0.4%           │ ║
║ │ Other:        3.8%           │ ║
║ │ Displaced out: 8,200         │ ║
║ │ Displaced in:  1,100         │ ║
║ └──────────────────────────────┘ ║
║                                  ║
║ ┌─ MILITARY ───────────────────┐ ║
║ │ Brigade AoR: 3rd Drinski Bde │ ║
║ │ Garrison: ~450 personnel     │ ║
║ │ Front-active: YES            │ ║
║ │ Opposing: 1st Višegrad Bde   │ ║
║ │ (RBiH, across 3 edges)       │ ║
║ └──────────────────────────────┘ ║
║                                  ║
║ ┌─ TERRAIN ────────────────────┐ ║
║ │ Elevation: 420m              │ ║
║ │ River crossing: YES (+def)   │ ║
║ │ Urban: NO                    │ ║
║ │ Road access: 0.7             │ ║
║ │ Defense scalar: 1.35         │ ║
║ └──────────────────────────────┘ ║
║                                  ║
║ ┌─ RECENT EVENTS ─────────────┐ ║
║ │ Week 21: Attack by 1st Bde  │ ║
║ │   Result: DEFENDER VICTORY   │ ║
║ │   Attacker: 12 KIA, 28 WIA │ ║
║ │   Defender:  4 KIA, 11 WIA │ ║
║ │ Week 18: Control flip RS→RB │ ║
║ │ Week 19: Control flip RB→RS │ ║
║ └──────────────────────────────┘ ║
╚══════════════════════════════════╝
```

### 7.2 Brigade Intelligence View

When a brigade is selected:

```
╔══════════════════════════════════╗
║ [APP-6 SYM] 1st Romanija Bde    ║
║ ─────────────────────────────── ║
║ Faction: RS (VRS)                ║
║ Corps: Sarajevo-Romanija Corps   ║
║ Status: ACTIVE   Posture: ATK    ║
║                                  ║
║ ┌─ STRENGTH ───────────────────┐ ║
║ │ Personnel:   1,840 / 2,500   │ ║
║ │ ████████████████░░░░  73.6%  │ ║
║ │ Cohesion:    62 / 100        │ ║
║ │ ██████████████░░░░░░  62.0%  │ ║
║ │ Experience:  0.45            │ ║
║ │ Fatigue:     23              │ ║
║ └──────────────────────────────┘ ║
║                                  ║
║ ┌─ EQUIPMENT ──────────────────┐ ║
║ │ Infantry: 1,640              │ ║
║ │ Tanks:    12 (8 oper / 3 deg │ ║
║ │              / 1 non-op)     │ ║
║ │ Artillery: 8 (6 oper / 2 deg)│ ║
║ │ AA:        2 (2 oper)        │ ║
║ │ Equip Mult: 1.24             │ ║
║ └──────────────────────────────┘ ║
║                                  ║
║ ┌─ AREA OF RESPONSIBILITY ─────┐ ║
║ │ Municipalities: Rogatica,    │ ║
║ │   Sokolac (shared w/ 2nd)    │ ║
║ │ AoR settlements: 34          │ ║
║ │ Front-active: 12             │ ║
║ │ Density: 54.1 pers/settle    │ ║
║ │ Operational coverage: 78%    │ ║
║ │ Urban fortress: NO           │ ║
║ └──────────────────────────────┘ ║
║                                  ║
║ ┌─ CURRENT ORDERS ─────────────┐ ║
║ │ Posture: ATTACK              │ ║
║ │ Target: S104023 (Prača)      │ ║
║ │ Movement: none               │ ║
║ │ Disrupted: NO                │ ║
║ └──────────────────────────────┘ ║
║                                  ║
║ ┌─ COMBAT RECORD ─────────────┐ ║
║ │ Battles fought: 8            │ ║
║ │ Victories: 4 │ Defeats: 2   │ ║
║ │ Stalemates: 2                │ ║
║ │ Total KIA: 142               │ ║
║ │ Total WIA: 318               │ ║
║ │ Total MIA/Captured: 24       │ ║
║ └──────────────────────────────┘ ║
║                                  ║
║ ┌─ ACTIONS ────────────────────┐ ║
║ │ [SET POSTURE ▼]              │ ║
║ │ [MOVE BRIGADE]               │ ║
║ │ [RESHAPE AOR]                │ ║
║ │ [VIEW ON MAP]                │ ║
║ └──────────────────────────────┘ ║
╚══════════════════════════════════╝
```

### 7.3 Panel Tabs

The right panel has tabs at the top for quick switching:

```
[ INTEL ] [ ORDERS ] [ AAR ] [ EVENTS ]
```

- **INTEL** — Settlement or brigade details (context-sensitive, as above)
- **ORDERS** — Current turn's pending orders for the player's faction (list view)
- **AAR** — Last turn's after-action report (battles, flips, events)
- **EVENTS** — Running event log (war correspondent's notebook)

---

## 8. Bottom Ticker / Status Strip

A 32px strip across the bottom. Two zones:

### 8.1 Left Zone: Event Ticker (scrolling)

Auto-scrolling one-line event messages in chronological order. Military message format:

```
[W23] 1ST ROMANIJA BDE ATTACKS PRAČA — STALEMATE ● [W23] SUPPLY CORRIDOR GORAŽDE: STRAINED ● [W23] CEASEFIRE RBIH-HRHB HOLDS — WEEK 3 ●
```

Color-coded by severity:
- White: neutral events
- Green: friendly victories, reinforcements
- Red: losses, defeats, supply cuts
- Amber: warnings, degradation
- Cyan: diplomatic events

Click any event to expand details in the right panel.

### 8.2 Right Zone: System Status

```
                    ... │ FPS: 60 │ Seed: a7f3c2 │ Save: auto │ ⚙
```

Shows technical status, current seed (for determinism verification), auto-save indicator.

---

## 9. Order System — Giving and Displaying Orders

### 9.1 Order Types Available to Player

| Order | How to Issue | Visual on Map | Data |
|-------|-------------|---------------|------|
| **Set Brigade Posture** | Right-click brigade → posture menu; or brigade panel dropdown | Posture icon on unit marker changes | `brigade_posture_orders[]` |
| **Move Brigade** (municipality) | Right-click brigade → "Move"; click target municipality | Dashed arrow, brigade→target mun | `brigade_mun_orders[brigade_id]` |
| **Attack Settlement** | Select brigade → right-click enemy settlement → "Attack" | Bold red arrow, brigade→settlement | `brigade_attack_orders[brigade_id]` |
| **Reshape AoR** | Select brigade → Shift+click settlements to transfer | Curved yellow arrows | `brigade_aor_orders[]` |
| **Set Corps Stance** | Click corps in OOB → stance dropdown | Corps icon changes | `corps_command[corps_id].stance` |
| **Set Army Stance** | Faction overview → army stance dropdown | Affects all corps indicators | `army_stance[faction_id]` |
| **Launch Named Operation** | Corps context menu → "Plan Operation" → wizard | Operation icon on map near target | `corps_command[corps_id].active_operation` |
| **Activate OG** | Corps context menu → "Form Operational Group" → select donors + focus | OG marker on map | `og_orders[]` |
| **Recruit Brigade** | Recruitment panel → select available slot → pay costs → activate | New unit marker appears (forming) | `recruitment_state` mutations |

### 9.2 Order Confirmation Flow

1. Player issues an order (any of the above)
2. Order appears in the **ORDERS tab** of the right panel as a pending item
3. Order visual appears on the map (semi-transparent arrow, pulsing)
4. Player can cancel any pending order before advancing the turn
5. When `▶ ADVANCE WEEK` is clicked, all pending orders are submitted to the pipeline
6. Orders are consumed and resolved
7. Results shown in AAR

### 9.3 Order Validation Feedback

When the player attempts an invalid order, show inline feedback:

- "Cannot attack: cohesion too low (18 < 40 required for Attack posture)"
- "Cannot move: target municipality not adjacent"
- "Cannot reshape: donor must retain ≥ 1 settlement"

Show as amber text near the relevant UI element, auto-dismiss after 5 seconds.

### 9.4 Bot Orders Visibility (Replay Mode)

In replay mode, bot-issued orders are shown with a **different arrow style** (thinner, dotted) and labeled `[BOT]`. This lets the player study AI behavior.

---

## 10. Brigade Management Screen

Accessed via the brigade's detail panel or a dedicated "FORMATIONS" button. This is a **full-width modal overlay** that shows all brigades for the player's faction in a sortable table.

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        FORMATION MANAGEMENT — ARBiH                    ║
╠══════════════════════════════════════════════════════════════════════════╣
║ Sort: [Name ▼] [Personnel] [Cohesion] [Posture] [Status] [AoR Size]   ║
╠════╤════════════════╤═══════╤═══════╤═══════╤════════╤════════╤════════╣
║ ## │ Formation      │ Pers. │ Coh.  │ Post. │ Status │ AoR    │ Orders ║
╠════╪════════════════╪═══════╪═══════╪═══════╪════════╪════════╪════════╣
║ 01 │ 1st Mech Bde   │ 1840  │  62   │  ATK  │ Active │ 34 stl │ → S104 ║
║ 02 │ 2nd Inf Bde    │ 2100  │  78   │  DEF  │ Active │ 41 stl │  none  ║
║ 03 │ 5th Mtn Bde    │ 1650  │  55   │  PRB  │ Active │ 28 stl │ → S203 ║
║ 04 │ 7th Inf Bde    │  920  │  18   │  DEF  │ Degrad │ 22 stl │  none  ║
║ 05 │ 11th Mtn Bde   │  --- │  --- │  ---  │Forming │  ---   │  ---   ║
╠════╧════════════════╧═══════╧═══════╧═══════╧════════╧════════╧════════╣
║ Total active: 4 │ Forming: 1 │ Total personnel: 6,510                 ║
║ Average cohesion: 53.3 │ Brigades in ATK: 1 │ Brigades degraded: 1    ║
╚══════════════════════════════════════════════════════════════════════════╝
```

Color coding per row:
- Green: cohesion ≥ 60
- Yellow: cohesion 30-59
- Red: cohesion < 30

Click any row → jumps to that brigade on the map and opens its Intelligence panel.

---

## 11. Corps and Army Command

### 11.1 Corps Command Panel

Accessible from OOB tree (click corps) or dedicated hotkey. Shows:

```
╔══════════════════════════════════════════╗
║ SARAJEVO-ROMANIJA CORPS (VRS)            ║
╠══════════════════════════════════════════╣
║ Commander: [historical name, flavor]     ║
║ Stance: [OFFENSIVE ▼]                   ║
║ Command span: 5 (subordinates: 4)        ║
║ OG slots: 2 (used: 1)                   ║
║ Corps exhaustion: 14.2                   ║
║                                          ║
║ SUBORDINATE BRIGADES                     ║
║  1st Romanija Bde .... ATK  1840 pers   ║
║  2nd Sarajevo Bde .... DEF  2100 pers   ║
║  3rd Drinski Bde ..... PRB  1650 pers   ║
║  Igman OG ............ ATK   800 pers   ║
║                                          ║
║ ACTIVE OPERATION                         ║
║  OP CORRIDOR '92 — EXECUTION            ║
║  Phase turn: 3/4                         ║
║  Pressure bonus: +50%                    ║
║  Participating: 1st, 3rd                 ║
║  [CANCEL OPERATION]                      ║
║                                          ║
║ ACTIONS                                  ║
║  [PLAN NEW OPERATION]                    ║
║  [FORM OPERATIONAL GROUP]                ║
║  [CHANGE STANCE ▼]                       ║
╚══════════════════════════════════════════╝
```

### 11.2 Army Stance

Top-level control for the entire faction's military. Accessible from faction overview:

```
ARMY STANCE: [BALANCED ▼]
  Options:
  - GENERAL DEFENSIVE → all corps forced defensive
  - BALANCED → corps choose own stance
  - GENERAL OFFENSIVE → all corps forced offensive
  - TOTAL MOBILIZATION → all corps reorganize
```

Changing army stance shows a confirmation dialog: "Setting GENERAL OFFENSIVE will override all corps stances. Proceed?"

---

## 12. Recruitment and Mobilization

### 12.1 Recruitment Panel

Modal overlay accessed via `R` hotkey or toolbar button. Shows available brigade slots and costs.

```
╔══════════════════════════════════════════════════════════════════════════╗
║                      RECRUITMENT & MOBILIZATION                        ║
╠══════════════════════════════════════════════════════════════════════════╣
║ RESOURCES                                                              ║
║  Recruitment Capital: 42.3 / 100  [████████░░░░░░░░░░░░]              ║
║  Equipment Points:    18.7 / 50   [███████░░░░░░░░░░░░░]              ║
║  Capital accrual: +2.1 / turn                                          ║
║  Equipment accrual: +0.8 / turn                                        ║
║                                                                        ║
║ AVAILABLE BRIGADE SLOTS                                                ║
╠══════╤══════════════════════╤══════════╤═══════════╤═══════╤═══════════╣
║  ##  │ Brigade Name         │ Home Mun │ Avail From│ Man.  │ Cost      ║
╠══════╪══════════════════════╪══════════╪═══════════╪═══════╪═══════════╣
║  01  │ 17th Krajina Bde     │ Ključ    │ Week 28   │ 1000  │ 15C + 8E ║
║  02  │ 210th Brdska Bde     │ Kupres   │ Week 32   │ 1000  │ 12C + 6E ║
║  03  │ HQ Defense Plt       │ Sarajevo │ NOW       │  500  │  8C + 3E ║
╠══════╧══════════════════════╧══════════╧═══════════╧═══════╧═══════════╣
║                                                                        ║
║ MILITIA POOLS (top 10 by available)                                    ║
╠══════════════════════╤══════════╤═══════════╤═════════════════════════╣
║ Municipality         │ Faction  │ Available │ Committed / Exhausted    ║
╠══════════════════════╪══════════╪═══════════╪═════════════════════════╣
║ Sarajevo (Centar)    │ RBiH     │ 2,340     │ 1,200 / 180             ║
║ Tuzla                │ RBiH     │ 1,890     │   800 / 120             ║
║ Zenica               │ RBiH     │ 1,620     │   600 /  90             ║
╠══════════════════════╧══════════╧═══════════╧═════════════════════════╣
║                                                                        ║
║ [ACTIVATE BRIGADE ▶] (select slot above, then click)                  ║
║ [CLOSE]                                                                ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 12.2 Activation Flow

1. Select a brigade slot where `available_from` ≤ current week
2. Check eligibility: home municipality controlled, sufficient manpower, capital, equipment
3. Click "ACTIVATE BRIGADE"
4. Confirmation: "Activate 17th Krajina Brigade? Costs: 15 Capital, 8 Equipment, 1000 manpower from Ključ pool."
5. On confirm: brigade enters `forming` state, appears in OOB with dashed icon
6. After formation period: auto-activates to `active`

---

## 13. After-Action Reports (AAR)

### 13.1 Turn-End AAR Modal

After each turn advance, if battles occurred, a modal overlay appears:

```
╔══════════════════════════════════════════════════════════════════════════╗
║                 AFTER-ACTION REPORT — WEEK 23                          ║
║                 15 September 1992                                       ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║ ENGAGEMENTS THIS WEEK: 4                                               ║
║ ──────────────────────────────────────────────────────────────────────  ║
║                                                                        ║
║ ┌─ BATTLE OF PRAČA ─────────────────────────────────────────────────┐  ║
║ │                                                                    │  ║
║ │ Attacker: 1st Romanija Bde (RS)     Defender: 1st Višegrad Bde    │  ║
║ │ Combat Power: 847.3                 Combat Power: 621.8           │  ║
║ │ Power Ratio: 1.36 — ATTACKER VICTORY                              │  ║
║ │                                                                    │  ║
║ │ TERRAIN MODIFIERS (defender):                                      │  ║
║ │   River crossing: +15%   Slope: +8%   Road access: -5%            │  ║
║ │   Urban bonus: none      Front hardening: +10% (streak 2)         │  ║
║ │                                                                    │  ║
║ │ CASUALTIES:                                                        │  ║
║ │   Attacker: 23 KIA │ 41 WIA │ 2 MIA    Total: 66                 │  ║
║ │   Defender: 34 KIA │ 58 WIA │ 12 MIA   Total: 104                │  ║
║ │                                                                    │  ║
║ │ EQUIPMENT LOSSES:                                                  │  ║
║ │   Attacker: 1 tank destroyed, 1 artillery damaged                  │  ║
║ │   Defender: 2 tanks captured by attacker                           │  ║
║ │                                                                    │  ║
║ │ RESULT: Settlement S104023 (Prača) control flipped RS → RBiH      │  ║
║ │ SNAP EVENT: ● Commander Casualty — defender cohesion -8            │  ║
║ │                                                                    │  ║
║ │ [VIEW ON MAP]  [VIEW BRIGADE DETAILS]                              │  ║
║ └────────────────────────────────────────────────────────────────────┘  ║
║                                                                        ║
║ ┌─ BATTLE OF STOLAC ────────────────────────────────────────────────┐  ║
║ │ ... (collapsed, click to expand) ...                               │  ║
║ └────────────────────────────────────────────────────────────────────┘  ║
║                                                                        ║
║ ──────────────────────────────────────────────────────────────────────  ║
║ WEEKLY SUMMARY                                                         ║
║                                                                        ║
║ Control changes: 3 settlements flipped                                 ║
║   RS gained: 1 (Prača) │ RS lost: 0                                   ║
║   RBiH gained: 0       │ RBiH lost: 1 (Prača)                        ║
║   HRHB gained: 2       │ HRHB lost: 0                                ║
║                                                                        ║
║ Total casualties this week:                                            ║
║   RS:   89 KIA │ 156 WIA │ 14 MIA                                    ║
║   RBiH: 67 KIA │ 123 WIA │  8 MIA                                    ║
║   HRHB: 12 KIA │  28 WIA │  0 MIA                                    ║
║                                                                        ║
║ Formations degraded: 7th Inf Bde (cohesion → 18, auto-defend)         ║
║ Supply alerts: Goražde corridor strained                               ║
║ Diplomatic: IVP negotiation momentum +0.02                             ║
║                                                                        ║
║                          [DISMISS]  [SAVE REPORT]                      ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 13.2 Battle Report Data Sources

Each battle in the AAR draws from:

| Field | Source |
|-------|--------|
| Attacker/defender brigade | `brigade_attack_orders[fid]`, brigade in `brigade_aor[target_sid]` |
| Combat power | Computed in `battle_resolution.ts`: garrison × equipment × experience × cohesion × posture × supply × terrain × corps × operations × OG × resilience × disruption |
| Power ratio | attacker_power / defender_power |
| Outcome | ≥1.3 attacker victory, 0.8-1.3 stalemate, <0.8 defender victory |
| Terrain modifiers | `settlements_terrain_scalars.json` (river, slope, urban, road, friction) |
| Casualties | KIA/WIA/MIA per side, computed in battle resolution |
| Equipment losses | Tanks/artillery/AA destroyed or captured |
| Snap events | Deterministic events: Ammunition Crisis, Commander Casualty, Last Stand, Surrender Cascade, Pyrrhic Victory |
| Control flip | Change in `political_controllers[target_sid]` |

### 13.3 Cumulative AAR (War Summary tab)

Accessible anytime. Shows:
- Total battles fought by faction
- Win/loss/stalemate record
- Cumulative casualties broken down by category
- Territory control graph over time (line chart: % per faction per week)
- Exhaustion curve over time
- Most contested municipalities (ranked by total flips)

---

## 14. Front Visualization

### 14.1 Front Line Rendering Rules

For each settlement adjacency edge where `political_controllers[sid_a] !== political_controllers[sid_b]` and neither is null:

1. Compute the shared geometric boundary between the two settlement polygons
2. Draw a line along this boundary
3. Style based on front segment state:

| Condition | Line Style | Width | Color |
|-----------|-----------|-------|-------|
| `active_streak` ≥ 8 | Solid, double line | 4px | Bright white with faction-pair tint |
| `active_streak` 4-7 | Solid | 3px | White |
| `active_streak` 1-3 | Dashed | 2px | Light gray |
| `active_streak` 0 (inactive) | Dotted, faint | 1px | Dark gray |
| `friction` > 5 | Add barbed-wire icon pattern | — | — |

### 14.2 Front Labels

At strategic/operational zoom, label major front segments with descriptive names (derived from largest municipality on each side):
- "SARAJEVO FRONT" (RS-RBiH, Sarajevo municipalities)
- "DRINA VALLEY FRONT" (RS-RBiH, eastern border)
- "POSAVINA CORRIDOR" (RS-RBiH, northern corridor)
- "LASVA VALLEY FRONT" (RBiH-HRHB, central)
- "MOSTAR FRONT" (RBiH-HRHB, Herzegovina)

Labels use a military stencil font, positioned along the front line at intervals.

### 14.3 Front Pressure Visualization

When "Front Pressure" overlay is active:
- Each front edge gets a colored indicator:
  - Green = defender heavily favored (pressure < -5)
  - Yellow = balanced (-5 to 5)
  - Red = attacker heavily favored (pressure > 5)
- Width of indicator proportional to absolute pressure value
- Animated flow direction showing which side has the initiative

---

## 15. Supply and Logistics Overlay

### 15.1 Supply Visualization

When "Supply Status" overlay is active:

- Each settlement gets a small icon:
  - Green dot = Adequate supply
  - Yellow dot = Strained
  - Red dot = Critical
  - Skull icon = Unsupplied (sustainability collapse imminent)

- Supply corridors are drawn as thick lines connecting supply sources to the interior:
  - Green = Open corridor
  - Yellow = Brittle
  - Red = Cut / Interdicted

- Enclave markers: settlements within an enclave get a distinctive border (dashed circle) with enclave name and integrity percentage.

### 15.2 Sarajevo Siege Indicator

Special visual for Sarajevo:
- Core municipalities highlighted with siege ring visualization
- Siege status icon: OPEN (green), PARTIAL (yellow), BESIEGED (red)
- External/internal supply gauges
- Tunnel indicator (when applicable)
- International focus meter (feeds into IVP)

---

## 16. Diplomatic / International Panel

### 16.1 Diplomacy Overlay

Accessed via hotkey `D` or toolbar button. A modal panel showing:

```
╔══════════════════════════════════════════════════════════════════╗
║                 INTERNATIONAL SITUATION                          ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║ INTERNATIONAL VISIBILITY PRESSURE (IVP)                          ║
║  Sarajevo siege visibility: ████████░░  0.72                    ║
║  Enclave humanitarian:      ██████░░░░  0.54                    ║
║  Atrocity visibility:       ████░░░░░░  0.38                    ║
║  Negotiation momentum:      ███░░░░░░░  0.29                    ║
║                                                                  ║
║ PATRON STATUS                                                    ║
║ ┌─ RS (Serbia/JNA) ──────────────────────────────────────────┐  ║
║ │ Material support:     ████████░░  0.78                      │  ║
║ │ Patron commitment:    ██████░░░░  0.62                      │  ║
║ │ Diplomatic isolation: ████████░░  0.71                      │  ║
║ │ Constraint severity:  ██████░░░░  0.55                      │  ║
║ └─────────────────────────────────────────────────────────────┘  ║
║ ┌─ RBiH (international community) ──────────────────────────┐   ║
║ │ ...                                                         │  ║
║ └─────────────────────────────────────────────────────────────┘  ║
║ ┌─ HRHB (Croatia) ───────────────────────────────────────────┐   ║
║ │ ...                                                         │  ║
║ └─────────────────────────────────────────────────────────────┘  ║
║                                                                  ║
║ ARMS EMBARGO                                                     ║
║  RS:   heavy equip access 0.85 │ ammo resupply 0.72            ║
║  RBiH: heavy equip access 0.25 │ ammo resupply 0.38            ║
║  HRHB: heavy equip access 0.55 │ ammo resupply 0.61            ║
║                                                                  ║
║ RBiH-HRHB ALLIANCE                                              ║
║  Value: 0.35 — FRAGILE ALLIANCE                                ║
║  ████████████████░░░░░░░░░░░░░░  (scale: -1 to +1)             ║
║  Phase: No flips, weakened coordination                          ║
║                                                                  ║
║ NEGOTIATION                                                      ║
║  RS  capital: 12 │ pressure: 34 │ spent: 8                      ║
║  RBiH capital: 8 │ pressure: 28 │ spent: 14                     ║
║  HRHB capital: 5 │ pressure: 18 │ spent: 6                      ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## 17. War Summary Dashboard

### 17.1 Full-Screen Dashboard

Accessed via `F5` or menu. Shows the "Pentagon briefing slide" — the strategic picture across the entire war.

```
╔══════════════════════════════════════════════════════════════════════════╗
║                     WAR SUMMARY — WEEK 23 (15 Sep 1992)                ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  ┌─ TERRITORY CONTROL OVER TIME ─────────────────────────────────────┐ ║
║  │  %  ┤                                                              │ ║
║  │ 50  ┤  ═══RS═══════════════════════════╗                           │ ║
║  │ 40  ┤                                  ║                           │ ║
║  │ 30  ┤  ═══RBiH══════════════════════════╝                         │ ║
║  │ 20  ┤                                                              │ ║
║  │ 10  ┤  ═══HRHB════════════════════════                             │ ║
║  │  0  ┼──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──────────────────────────  │ ║
║  │     W1 W4 W8 W12 W16 W20 W24                                      │ ║
║  └────────────────────────────────────────────────────────────────────┘ ║
║                                                                        ║
║  ┌─ EXHAUSTION OVER TIME ────────────────────────────────────────────┐ ║
║  │  (line chart, one line per faction, same x-axis)                   │ ║
║  └────────────────────────────────────────────────────────────────────┘ ║
║                                                                        ║
║  ┌─ CASUALTY SUMMARY ───────────────────────────────────────────────┐  ║
║  │                                                                    │  ║
║  │  Faction │  KIA  │  WIA  │ MIA/Cap │ Total │ Equip Lost          │  ║
║  │  ────────┼───────┼───────┼─────────┼───────┼─────────────────── │  ║
║  │  RS      │ 2,340 │ 4,120 │    180  │ 6,640 │ 14T 8A 2AA        │  ║
║  │  RBiH    │ 1,890 │ 3,450 │    142  │ 5,482 │  3T 4A 1AA        │  ║
║  │  HRHB    │   340 │   820 │     28  │ 1,188 │  2T 2A 0AA        │  ║
║  │  ────────┼───────┼───────┼─────────┼───────┼─────────────────── │  ║
║  │  TOTAL   │ 4,570 │ 8,390 │    350  │13,310 │                   │  ║
║  └────────────────────────────────────────────────────────────────────┘ ║
║                                                                        ║
║  ┌─ KEY EVENTS ──────────────────────────────────────────────────────┐ ║
║  │ W4:  War begins (referendum + 4 weeks)                             │ ║
║  │ W8:  Phase I → Phase II transition                                 │ ║
║  │ W12: Sarajevo siege begins (status: BESIEGED)                      │ ║
║  │ W18: First named operation: OP CORRIDOR '92                        │ ║
║  │ W21: RBiH-HRHB alliance strained (value dropped to 0.15)          │ ║
║  └────────────────────────────────────────────────────────────────────┘ ║
║                                                                        ║
║  ┌─ FORCE STRENGTH ─────────────────────────────────────────────────┐  ║
║  │ RS:   42,180 personnel │ 18 brigades │ 4 corps                    │  ║
║  │ RBiH: 38,450 personnel │ 22 brigades │ 5 corps                    │  ║
║  │ HRHB: 12,200 personnel │  8 brigades │ 2 corps                    │  ║
║  └────────────────────────────────────────────────────────────────────┘ ║
║                                                                        ║
║  ┌─ MOST CONTESTED MUNICIPALITIES ──────────────────────────────────┐  ║
║  │ 1. Brčko (12 flips)  2. Jajce (8 flips)  3. Bosanski Brod (7)   │  ║
║  └────────────────────────────────────────────────────────────────────┘ ║
║                                                                        ║
║                               [CLOSE]  [EXPORT PDF]                    ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 17.2 Time-Series Data Requirements

The war summary needs historical data per turn. This requires the scenario runner or turn pipeline to emit a **weekly snapshot array** (or the replay timeline already captures this). Each entry:

```typescript
interface WeeklySnapshot {
  turn: number;
  control_counts: Record<FactionId, number>;  // settlement counts
  personnel_totals: Record<FactionId, number>; // sum of formation personnel
  exhaustion: Record<FactionId, number>;
  casualties_cumulative: Record<FactionId, { killed: number; wounded: number; missing: number }>;
  key_events: string[]; // human-readable event strings
}
```

This can be derived from the replay timeline if it captures full state, or computed incrementally during play.

---

## 18. Replay / Rewatch Mode

### 18.1 Replay Controls

When in replay mode, the Top Command Bar transforms:

```
┌──────────────────────────────────────────────────────────────────────┐
│ REPLAY │ WEEK 23/52 │ ◀◀ │ ◀ │ ▶ PLAY │ ▶▶ │ Speed: [1x ▼] │ ⏹ │
└──────────────────────────────────────────────────────────────────────┘
```

| Control | Function |
|---------|----------|
| `◀◀` | Jump to start |
| `◀` | Step back one week |
| `▶ PLAY` | Auto-advance (toggles to `⏸ PAUSE`) |
| `▶▶` | Jump to end |
| Speed | 0.5x, 1x, 2x, 4x, 8x |
| `⏹` | Exit replay mode |

### 18.2 Replay Timeline Scrubber

Below the replay controls, a thin horizontal timeline bar:
```
W1 ──●───●───●──●●●──●────●───●──●──── W52
     ↑       ↑       ↑         ↑
   battles  flips   operation  ceasefire
```

Dots on the timeline mark turns with significant events. Color-coded. Click any point to jump to that week.

### 18.3 Bot Order Visibility in Replay

All bot orders are shown with their map artifacts (arrows, posture changes, etc.) so the player can study what happened. A toggle `[SHOW BOT ORDERS]` controls this.

---

## 19. Main Menu and Scenario Selection

### 19.1 Main Menu Screen

Full-screen. Dark background with subtle topographic map texture. Center-aligned menu items:

```
          ╔═══════════════════════════════════╗
          ║                                   ║
          ║    A   W A R   W I T H O U T     ║
          ║         V I C T O R Y             ║
          ║                                   ║
          ║    Bosnia-Herzegovina, 1992–1995   ║
          ║                                   ║
          ║    ┌─────────────────────────┐     ║
          ║    │   NEW CAMPAIGN          │     ║
          ║    │   LOAD SAVE             │     ║
          ║    │   LOAD REPLAY           │     ║
          ║    │   SCENARIOS             │     ║
          ║    │   SETTINGS              │     ║
          ║    │   QUIT                  │     ║
          ║    └─────────────────────────┘     ║
          ║                                   ║
          ║    v0.5.0 │ Build 2026.02.14      ║
          ╚═══════════════════════════════════╝
```

### 19.2 New Campaign (desktop)

When the user clicks **New Campaign** in the desktop app, the main menu closes and a **side-selection overlay** is shown (no scenario file picker). The overlay displays three options with faction flags: **RBiH (ARBiH)**, **RS (VRS)**, and **HRHB (HVO)**. Choosing one invokes the `start-new-campaign` IPC with that faction as `playerFaction`; the app then loads the canon April 1992 scenario (`data/scenarios/apr1992_definitive_52w.json`), sets `meta.player_faction`, injects recruitment state for the toolbar and Recruitment modal, and applies the state to the map. Other factions run on bot AI. Flag assets: same folder as crests (`/assets/sources/crests/`, see README there for `flag_RBiH.png`, `flag_RS.png`, `flag_HRHB.png`).

### 19.3 Scenario Selection Screen (Load scenario…)

Shows available scenario files from `data/scenarios/` when the user chooses "Load scenario…" (file picker):

```
╔══════════════════════════════════════════════════════════════════════╗
║                        SELECT SCENARIO                              ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ┌────────────────────────────────────────────────────────────────┐  ║
║  │ ● April 1992 — Historical Start (52 weeks)                    │  ║
║  │   Three-way conflict. Ethnic 1991 init. Full OOB.             │  ║
║  │   File: historical_mvp_apr1992_52w.json                        │  ║
║  ├────────────────────────────────────────────────────────────────┤  ║
║  │ ○ April 1992 — Phase II Quick Start (4 weeks)                 │  ║
║  │   Skip Phase I, start in Phase II. Test combat.                │  ║
║  │   File: apr1992_phase_ii_4w.json                               │  ║
║  ├────────────────────────────────────────────────────────────────┤  ║
║  │ ○ April 1992 — Bot vs Bot (50 weeks)                          │  ║
║  │   All factions bot-controlled. Observation mode.               │  ║
║  │   File: apr1992_50w_bots.json                                  │  ║
║  └────────────────────────────────────────────────────────────────┘  ║
║                                                                      ║
║  SELECTED FACTION: [RS ▼]  (play as RS, others bot-controlled)      ║
║                                                                      ║
║                    [START CAMPAIGN]     [BACK]                       ║
╚══════════════════════════════════════════════════════════════════════╝
```

The faction selector lets the player choose which side to play. Non-selected factions run on bot AI.

---

## 20. Audio Design Notes

Audio is low-priority but the design should account for it:

- **Ambient:** Low hum of radio static, distant artillery (volume tied to front intensity). Muffled voices on radio. The basement command post atmosphere.
- **Turn advance:** Teletype / dot-matrix printer sound (the briefing coming in)
- **Battle notification:** Short alarm tone (like a DEFCON change chime)
- **Alert:** Ascending three-tone warning (NATO alert tone style)
- **Victory/defeat in battle:** Brief fanfare or somber note
- **UI clicks:** Mechanical switch clicks (toggle switches, not mouse clicks)
- **Ambient music:** None by default. Optional: somber Balkan folk instrumental, very quiet, toggle in settings.

All audio must be togglable and volume-adjustable independently.

---

## 21. Typography and Color System

**Implementation reference:** The Tactical Map viewer was overhauled to match this spec (2026-02-14). As-built palette and tokens live in `src/map/nato_tokens.ts` (canonical) and `src/ui/map/constants.ts`. See [IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md](../40_reports/IMPLEMENTED_WORK_CONSOLIDATED_2026_02_15.md) §6 (GUI_VISUAL_OVERHAUL_NATO_OPS_CENTER, GUI_POLISH_PASS_AND_REFACTOR).

### 21.1 Fonts

| Use | Font | Weight | Size |
|-----|------|--------|------|
| Primary UI text | `'IBM Plex Mono', 'Consolas', monospace` | 400 | 13px |
| Headers / section titles | Same family | 700 | 14px, ALL CAPS |
| Turn indicator | Same family | 700 | 20px |
| Map labels (settlements) | Same family | 400 | 10-12px (zoom-dependent) |
| Numbers / data values | Same family | 600 | 13px |
| Ticker text | Same family | 400 | 12px |
| Title screen | `'Courier Prime', 'Courier New', monospace` | 700 | 36px |

Monospace throughout. This is a military terminal, not a magazine.

### 21.2 Color Palette

**Backgrounds:**
| Element | Color | Hex |
|---------|-------|-----|
| Main background | Near-black navy | `#0a0a1a` |
| Panel backgrounds | Dark navy | `#12121f` |
| Card/section backgrounds | Slightly lighter | `#1a1a2e` |
| Hover state | Charcoal highlight | `#2a2a3e` |
| Active/selected | Dark teal | `#1a3a3a` |

**Text:**
| Use | Color | Hex |
|-----|-------|-----|
| Primary text | Off-white | `#e0e0e0` |
| Secondary text | Muted gray | `#9e9e9e` |
| Accent text | Phosphor green | `#00ff88` |
| Warning text | Amber | `#ffab00` |
| Error/alert text | Signal red | `#ff3d00` |
| Link/interactive | Cyan | `#00bcd4` |

**Faction colors (UI elements, bars, charts):**
| Faction | Primary | Light variant | Dark variant |
|---------|---------|---------------|-------------|
| RS | `#c62828` | `#ef5350` | `#8B0000` |
| RBiH | `#2e7d32` | `#66bb6a` | `#1B5E20` |
| HRHB | `#1565c0` | `#42a5f5` | `#0D47A1` |
| Neutral | `#546e7a` | `#78909c` | `#37474F` |

**Map canvas (Tactical Map — as-built):** Settlement fill and formation markers use `nato_tokens.ts` values retuned for dark background: RS `rgb(180,50,50)`, RBiH `rgb(55,140,75)`, HRHB `rgb(50,110,170)`, fill alpha 0.65. Paper/canvas background `#0d0d1a`.

### 21.3 CRT / Terminal Effects (subtle)

- Faint scanline overlay on panels (CSS: repeating-linear-gradient, opacity 0.03)
- Slight text-shadow glow on phosphor-green elements (0 0 4px rgba(0,255,136,0.3))
- Subtle vignette on map edges (radial gradient, dark corners)
- Screen flicker on alerts (single-frame opacity dip, 200ms)

These effects must be toggle-able in Settings ("Retro CRT effects: ON/OFF").

---

## 22. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` or `Enter` | Advance turn |
| `Escape` | Close current modal / deselect |
| `Tab` | Cycle through panels (left → map → right) |
| `1` / `2` / `3` | Select faction (in OOB) |
| `F1` | Toggle OOB sidebar |
| `F2` | Toggle Intelligence panel |
| `F3` | Toggle Alerts panel |
| `F4` | Open Formation Management |
| `F5` | Open War Summary dashboard |
| `R` | Open Recruitment panel |
| `D` | Open Diplomacy panel |
| `O` | Toggle Order Arrows overlay |
| `F` | Toggle Front Lines overlay |
| `S` | Toggle Supply overlay |
| `A` | Toggle AoR overlay |
| `L` | Toggle Settlement Labels |
| `M` | Center map on player's capital |
| `Ctrl+S` | Quick save |
| `Ctrl+Z` | Undo last order (before turn advance) |
| `+` / `-` | Zoom in/out |
| `[` / `]` | Previous/next brigade (cycle) |
| `Ctrl+F` | Open search |
| `P` | Pause/play replay (in replay mode) |
| `,` / `.` | Step back/forward one week (in replay mode) |

---

## 23. Implementation Priority

### Phase 3A: Minimum Playable (first implementation pass)

1. **Top Command Bar** with turn indicator, ADVANCE button, zoom, layer menu
2. **Strategic Sidebar: War Status** section (territory %, personnel, casualties, exhaustion)
3. **OOB tree** (faction → corps → brigade, click to select)
4. **Map: order arrows** for attack orders (red arrows) and movement orders (dashed arrows)
5. **Map: posture icons** on unit markers
6. **Right panel: Brigade view** with strength, posture, orders, actions (set posture, attack)
7. **Right panel: Settlement view** with controller, demographics, military, terrain
8. **AAR modal** (basic: list of battles with attacker/defender, ratio, outcome, casualties)
9. **Order issuing**: right-click attack, posture dropdown, move brigade
10. **Scenario selection** screen (list scenarios, pick faction, start)

### Phase 3B: Full Feature (second pass)

11. Corps and army command UI
12. Recruitment panel
13. Named operations
14. Operational group formation
15. AoR reshaping (settlement transfer)
16. Front pressure overlay
17. Supply overlay
18. Alerts panel
19. Bottom ticker with war correspondent prose
20. War Summary dashboard with charts

### Phase 4: Polish

21. CRT visual effects
22. Audio (optional)
23. Grease pencil annotation layer
24. Replay timeline scrubber with event markers
25. Export features (PDF reports, screenshot)
26. Settings screen (key rebinding, visual toggles, audio)
27. The Situation Board overlay
28. Keyboard shortcut help modal

---

## Appendix A: Data Binding Reference

Quick reference for engineers — where each UI element gets its data.

| UI Element | Data Source | Type |
|------------|-------------|------|
| Turn number | `state.meta.turn` | number |
| Phase | `state.meta.phase` | PhaseName |
| Calendar date | scenario.start_date + meta.turn × 7 days | derived |
| Territory % per faction | count of `political_controllers` values per faction / total | derived |
| Personnel per faction | sum `formations[fid].personnel` where `formations[fid].faction === faction` | derived |
| Casualties per faction | `casualty_ledger[faction]` | CasualtyLedger |
| Exhaustion per faction | `phase_ii_exhaustion[faction]` | number |
| Brigade list | `Object.values(formations).filter(f => f.kind === 'brigade')` | FormationState[] |
| Brigade posture | `formations[fid].posture` | BrigadePosture |
| Brigade personnel | `formations[fid].personnel` | number |
| Brigade cohesion | `formations[fid].cohesion` | number |
| Brigade AoR | settlements where `brigade_aor[sid] === fid` | SettlementId[] |
| Brigade attack order | `brigade_attack_orders[fid]` | SettlementId \| null |
| Brigade movement order | `brigade_mun_orders[fid]` | MunicipalityId[] \| null |
| Corps stance | `corps_command[corps_id].stance` | CorpsStance |
| Corps operation | `corps_command[corps_id].active_operation` | CorpsOperation \| null |
| Army stance | `army_stance[faction]` | ArmyStance |
| Settlement controller | `political_controllers[sid]` | FactionId \| null |
| Settlement AoR brigade | `brigade_aor[sid]` | FormationId \| null |
| Front segments | `front_segments[edge_id]` | FrontSegmentState |
| Supply pressure | `phase_ii_supply_pressure[faction]` | number |
| IVP | `international_visibility_pressure` | IVP interface |
| Patron state | `factions[i].patron_state` | PatronState |
| Embargo | `factions[i].embargo_profile` | EmbargoProfile |
| Alliance RBiH-HRHB | `phase_i_alliance_rbih_hrhb` | number |
| Displacement | `displacement_state[mun_id]` | DisplacementState |
| Recruitment resources | `recruitment_state` | RecruitmentResourceState |
| Militia pools | `militia_pools` | Record |
| Enclave state | `enclaves[i]` | EnclaveState |
| Sarajevo state | `sarajevo_state` | SarajevoState |

## Appendix B: NATO APP-6 Symbol Guide for AWWV

Unit symbols to use on the map (simplified for screen rendering):

| Kind | Symbol | Notes |
|------|--------|-------|
| Infantry brigade | Rectangle with X inside (╬) | Standard ground unit |
| Mechanized brigade | Rectangle with X and oval | Tracks/wheels indicator |
| Mountain brigade | Rectangle with X and peak (▲) | Mountain warfare |
| Artillery | Rectangle with filled circle (●) | Fire support |
| Corps HQ | Rectangle with X and star | Command node |
| Operational Group | Diamond with X | Temporary formation |
| Militia | Rectangle with wavy line (~) | Irregular forces |

Size indicators:
- Brigade: two X marks (XX) above rectangle
- Battalion: one X (used for OG)
- Corps: three X marks (XXX)

All symbols rendered in faction color on dark background with white border.

## Appendix C: Wireframe — Main Game Screen

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [⚙] WEEK 23 │ Phase II │ 15 Sep '92 │ ▶ ADVANCE WEEK │ [AUTO▶] │ ZOOM ●●○ │ 🔍      │
├──────────┬─────────────────────────────────────────────────────────────┬───────────────┤
│          │                                                             │               │
│ WAR      │                                                             │  [ INTEL ]    │
│ STATUS   │                                                             │  [ ORDERS ]   │
│ ──────── │                                                             │  [ AAR ]      │
│ RS  47%  │              T A C T I C A L   M A P                       │  [ EVENTS ]   │
│ RBiH 38% │                                                             │               │
│ HRHB 11% │    ┌──┐                                                    │  Selected:    │
│          │    │MM│    Settlements + fronts + units + arrows            │  1st Romanija │
│ OOB      │    └──┘                                                    │  Bde (RS)     │
│ ──────── │                                                             │               │
│ ▼ ARBiH  │         [Front lines]                                      │  Personnel:   │
│  ▼ 1st C │              ───────══════───                              │  1840 / 2500  │
│   1Mz ATK│         [Unit markers]                                     │               │
│   2In DEF│              ┌───┐  ──→  ┌───┐                            │  Cohesion: 62 │
│   5Mt PRB│              │RS │       │RBH│                             │               │
│  ▶ 2nd C │              └───┘       └───┘                            │  Posture: ATK │
│ ▶ VRS    │                                                             │               │
│ ▶ HVO    │         [Attack arrows]                                    │  [SET POSTURE]│
│          │              ═══►                                          │  [MOVE]       │
│ ALERTS   │                                                             │  [ATTACK]     │
│ ──────── │                                                             │  [RESHAPE]    │
│ ▲ 7th Bde│                                                             │               │
│   Coh 18 │                                                             │               │
├──────────┴─────────────────────────────────────────────────────────────┴───────────────┤
│ [W23] 1ST ROMANIJA BDE → PRAČA: STALEMATE ● GORAŽDE SUPPLY STRAINED ●    FPS:60 ⚙    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

*End of GUI Design Blueprint. This document is the authoritative design reference for AWWV GUI implementation.*
