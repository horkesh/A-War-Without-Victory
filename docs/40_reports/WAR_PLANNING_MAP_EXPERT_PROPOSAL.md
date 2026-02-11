# War Planning Map — Expert Advisor Proposal

**Date:** 2026-02-07  
**Author:** External Expert Advisor (GUI/UX, Interaction Design)  
**Scope:** Responses to all six decisions requested in the handover, plus additional recommendations  
**Governing Documents:** UI_DESIGN_SPECIFICATION v1.0, NATO_AESTHETIC_SPEC, Game Bible, Rulebook  
**Constraint Acknowledgement:** Read-only MVP; no simulation mutation; deterministic; canon-aligned.

---

## 0. Framing: What This Map Actually Is

Before addressing the six decisions, it's worth stating the design problem clearly, because getting this wrong will cascade into every interaction decision.

This map is **not** a Hearts of Iron IV strategic map, where the player issues orders by clicking provinces. It is **not** a CMANO/Command: Modern Operations tactical display, where the player manipulates individual units in real time. And it is not a Decisive Campaigns hex grid, where counters are dragged between hexes.

This map is closest in spirit to a **NATO Joint Operations Center situation display** — a large wall map that a political leader walks up to and inspects to understand the current situation, before turning to their staff and issuing verbal directives. The player is Alija Izetbegović staring at a grease-pencil map in the Presidency building, or Karadžić receiving a briefing at Pale — not a field commander with a radio handset.

This framing drives every decision below: **inspection-first, command-second**, with information architecture designed for a political leader who needs to understand *what is happening and what it means*, not a tactical operator who needs to select and move units.

---

## 1. Settlement Info Panel — Layout Proposal

### 1.1 Recommendation: Single Sliding Panel with Stacked Sections (Not Tabs)

**Against tabs.** Tabs (Settlement | Municipality | Side) would force the player to click between views to build a complete picture. In wargame UI precedent, the games that work best (War in the East 2, Decisive Campaigns: Barbarossa, Shadow Empire) use a **single panel with vertically stacked sections** where the player can see all layers of information simultaneously. Tabs fragment what should be a unified situational briefing.

**Against modals.** Modals (popup windows) break the player's spatial orientation on the map. The settlement's position relative to corps boundaries, front lines, and neighboring settlements is critical context. A modal that obscures the map defeats the purpose.

### 1.2 Panel Structure

**Position:** Right edge, 320–360px wide, full map height. Slides in from the right on settlement click. The map viewport shifts slightly left to accommodate (do not overlay/obscure the clicked settlement).

**Visual treatment:** Dark panel background (`rgb(35, 35, 30)`) with a subtle paper-grain texture, matching the NATO tactical aesthetic. Thin left border in faction color of the controlling faction. Header bar uses the faction color at 15% opacity.

```
┌──────────────────────────────────────────────┬──────────────────┐
│                                              │ ■ SETTLEMENT     │
│                                              │ ──────────────── │
│              MAP VIEWPORT                    │ Foča             │
│              (shifts left ~320px)             │ SID: 12045       │
│                                              │ Type: Town       │
│         [clicked settlement                  │ Pop: 14,423      │
│          remains visible]                    │                  │
│                                              │ ■ MUNICIPALITY   │
│                                              │ ──────────────── │
│                                              │ Foča (mun: 022)  │
│                                              │ Controller: RS   │
│                                              │ Settlements: 47  │
│                                              │                  │
│                                              │ ■ CONTROL        │
│                                              │ ──────────────── │
│                                              │ ██ RS (Crimson)   │
│                                              │ State: CONSOL.   │
│                                              │ Since: W03 Apr92 │
│                                              │                  │
│                                              │ ■ DEMOGRAPHICS   │
│                                              │ ──────────────── │
│                                              │ Serb: 51.2%      │
│                                              │ Bosniak: 45.3%   │
│                                              │ Croat: 2.1%      │
│                                              │ Other: 1.4%      │
│                                              │                  │
│                                              │ [× Close]        │
└──────────────────────────────────────────────┴──────────────────┘
```

### 1.3 Section Breakdown

Each section is a **collapsible block** (default: all expanded). Collapse state is not persisted — always resets to fully expanded on new click.

| Section | Header | Fields | Phase |
|---------|--------|--------|-------|
| **SETTLEMENT** | `■ SETTLEMENT` | Name, SID, Type (urban/town/village), Population (1991 census), Key attributes | MVP |
| **MUNICIPALITY** | `■ MUNICIPALITY` | Name, mun1990_id, # settlements in municipality, Municipality controller (majority faction) | MVP |
| **CONTROL** | `■ CONTROL` | Controlling faction + color swatch, Control state (CONSOLIDATED / CONTESTED / HIGHLY_CONTESTED / FRAGMENTED), Since-when (turn/week if available) | MVP |
| **DEMOGRAPHICS** | `■ DEMOGRAPHICS` | 1991 census ethnic breakdown (bar or inline percentages), Data provenance indicator ("Settlement-level" / "Municipality-derived") | MVP |
| **MILITARY** | `■ MILITARY (Phase II)` | Assigned brigade, Parent corps, Brigade exhaustion %, Supply state | Phase II |
| **STABILITY** | `■ STABILITY (Phase I+)` | Stability score, Control strain, Exhaustion (municipality-level) | Phase I+ |

### 1.4 Interaction Details

- **Click settlement on map** → panel slides in (200ms ease-out). If panel already open, content swaps instantly (no close/reopen animation).
- **Click different settlement** → panel content updates in-place; brief highlight flash on the new settlement's polygon.
- **Close panel** → click `[× Close]` button, press `Escape`, or click empty map area. Panel slides out (150ms ease-in).
- **Click settlement at wrong zoom level** → at L0 (strategic), clicking zooms to L1 centered on click. At L1, clicking zooms to L2. At L2+, clicking a settlement opens the panel. This matches the existing `handleMapClick` zoom-cascade spec.

### 1.5 Why This Works (Precedent)

- **War in the East 2:** Right-side detail panel showing hex info (terrain, units, supply) in a single scrollable view. Never uses tabs for hex inspection — all data is stacked. This is the gold standard for operational wargame information panels.
- **Shadow Empire:** Sliding right panel for hex/city inspection with collapsible sections. Data-dense but scannable.
- **Paradox Grand Strategy (EU4, HoI4, Victoria 3):** Province click → bottom or side panel with stacked info. The most successful Paradox UIs (Victoria 3's state view) present political, demographic, and military info in a single scrollable panel rather than splitting across tabs.

---

## 2. Zoom Interaction Model

### 2.1 Recommendation: Scroll Wheel + Click-to-Drill + Keyboard, with Visible +/− as Fallback

The current spec uses click-to-cycle between discrete zoom levels (L0 → L1 → L2). This is conceptually clean but creates a problem: **clicking the map is overloaded** — it must mean both "zoom in" and "inspect settlement."

### 2.2 Proposed Model

| Input | Action |
|-------|--------|
| **Scroll wheel** | Smooth zoom between levels. Anchor point = cursor position (already implemented with the fixed zoom invariant). Zoom snaps to nearest discrete level (L0/L1/L2) after 300ms of no further scrolling, with a gentle ease to the snap point. |
| **Left-click on map (L0 or L1)** | Zoom to next level, centered on click point. Same as current spec. |
| **Left-click on settlement (L2)** | Open settlement info panel. No further zoom. |
| **Right-click (any level)** | Context: if a settlement is under cursor at L2, opens panel. Otherwise, no action (reserved for future order-giving). |
| **`+` / `−` buttons** | Visible in bottom-right corner of map. Small, semi-transparent, NATO-style (stencil `+` and `−` inside a circle). Always visible. Click increments/decrements one zoom level. |
| **Keyboard `+` / `-` or `=` / `-`** | Same as button press — zoom in/out one level. |
| **Keyboard `1` `2` `3`** | Jump directly to L0 / L1 / L2. |
| **`Escape`** | If panel open: close panel. If no panel: zoom out one level. If at L0: close War Planning Map and return to warroom. |
| **`Backspace` or `B`** | Zoom out one level (explicit "back" action). |
| **`F` or `Home`** | Fit entire map to viewport (return to L0 full extent). |

### 2.3 Zoom Level Definitions (Refined)

| Level | Scale Metaphor | What's Visible | Settlement Rendering |
|-------|---------------|----------------|---------------------|
| **L0 — Strategic** | "The whole wall map" | Full BiH extent. Major cities labeled (Sarajevo, Banja Luka, Mostar, Tuzla, Zenica, Bihać, Brčko, Goražde). Municipality-grouped control zones. National boundary. Major rivers. | Municipality clusters (~50 polygons) |
| **L1 — Operational** | "Leaning in to a region" | Regional view (~1/4 to 1/3 of BiH). Corps boundaries visible. Brigade AoR outlines (Phase II). Front segments. Secondary city labels. Roads (MSR). | Sub-municipality clusters (~200 polygons) |
| **L2 — Tactical** | "Nose to the map, reading settlement names" | Individual settlement polygons. Settlement names (larger settlements). Unit symbols at AoR centers (Phase II). Full road network. All rivers. | Full settlement polygons (~1000+) |

### 2.4 Smooth vs. Discrete

The internal zoom is **continuous** (scroll wheel allows smooth movement). But the **LOD system and label visibility** snap to the three discrete levels. This means:

- Between L0 and L1, the map shows L0-style rendering (municipality clusters) until the scale crosses the L1 threshold, then pops to L1 rendering.
- This "pop" is acceptable and expected in tactical map interfaces. Smooth LOD interpolation would be a performance sink with minimal UX benefit.
- The brief ease-to-snap-point after scroll stops prevents the player from resting between LOD thresholds.

### 2.5 Why This Works (Precedent)

- **CMANO / Command: Modern Operations:** Scroll wheel for smooth zoom, left click for selection, right click for orders. The zoom-then-click-to-select pattern is the most natural for map interfaces and avoids the "did my click zoom or select?" ambiguity.
- **Google Maps / Leaflet / Mapbox:** Universal scroll-wheel zoom with cursor anchoring is the mental model every user already has. Fighting this (e.g., click-only zoom) creates unnecessary friction.
- **HoI4, EU4:** Scroll zoom + click-select province is the standard in Paradox games for good reason — it separates navigation from interaction.

---

## 3. Layer Toggle Placement

### 3.1 Recommendation: Floating Panel, Top-Right, Collapsible

**Against side panel (permanent).** A permanent side panel for layer toggles eats map real estate constantly, even when the player isn't adjusting layers. Layers are set-and-forget for most of a session.

**Against top bar.** A top bar competes with the map header (classification markings, title) and creates a horizontal strip that feels like a modern GIS application, not a tactical map.

### 3.2 Proposed Design

A small **floating panel** anchored to the top-right corner of the map viewport. Default state: **collapsed** to just a small icon (a stack-of-layers icon, ≈32×32px, semi-transparent). Click to expand.

```
Collapsed:                    Expanded:
┌───┐                         ┌────────────────────────────┐
│ ≡ │                         │ MAP OVERLAYS           [−] │
└───┘                         ├────────────────────────────┤
                              │ ☑ Political Control        │
                              │ ☑ Contested Zones          │
                              │ ☐ Command Structure  [II]  │
                              │ ☐ Supply Status      [II]  │
                              │ ☐ Exhaustion         [I+]  │
                              │ ☐ Stability          [0+]  │
                              │ ☐ Displacement       [I+]  │
                              │ ☐ Ethnicity (1991)         │
                              │ ☐ Municipality Borders     │
                              └────────────────────────────┘
```

**Phase badges** `[II]` `[I+]` `[0+]` indicate which simulation phase enables each overlay. Unavailable overlays are **visible but greyed out** with the phase badge — this signals to the player that more information will become available as the simulation develops. (Do NOT hide unavailable overlays; the educational value of showing the player *what information exists and when it becomes available* is too important.)

**Political Control** and **Contested Zones** default to ON (checked). Everything else defaults to OFF.

The panel should have the same dark background treatment as the info panel (`rgb(35, 35, 30)` with paper grain), with faction-neutral styling.

### 3.3 Keyboard Shortcut for Layer Toggle Panel

`L` key toggles the layer panel open/closed. No per-layer keyboard shortcuts at MVP (too many layers; let the user click checkboxes).

---

## 4. Brigade / Corps / OOB Info Presentation (Phase II)

### 4.1 Recommendation: Hover Tooltip (Quick) + Click-to-Panel (Deep)

This is a **two-tier** information architecture. The pattern comes directly from professional military C2 displays, and it's what Decisive Campaigns: Barbarossa and War in the East both use successfully.

### 4.2 Tier 1: Hover Tooltip (200ms Delay)

When the player hovers over a **brigade symbol** (at L1 or L2 zoom), a compact tooltip appears after 200ms:

```
┌──────────────────────────────┐
│ 2nd Mountain Brigade         │
│ 1st Corps (ARBiH)            │
│ Strength: 85%  Exhaust: 34%  │
│ Supply: OPEN                 │
│ ───────────────              │
│ Click for details            │
└──────────────────────────────┘
```

When hovering over a **corps boundary** (at L1):

```
┌─────────────────────────────────┐
│ 1st Corps (ARBiH) — SARAJEVO   │
│ Brigades: 14  Strength: 72%    │
│ Click boundary for details      │
└─────────────────────────────────┘
```

Tooltip styling: dark background, light text, thin faction-color border. No arrow/caret. Positioned to avoid obscuring the hovered element.

### 4.3 Tier 2: Click → Reuse the Same Right-Side Panel

Clicking a brigade symbol or corps boundary **replaces the settlement info panel content** with brigade/corps info. The panel structure is the same (right-side, 320–360px, stacked sections), but the content changes:

**Brigade click:**

| Section | Fields |
|---------|--------|
| **BRIGADE** | Name, designation, type (mountain/motorized/light), parent corps, faction |
| **STRENGTH** | Personnel %, Equipment status, Exhaustion %, Supply state |
| **AREA** | # settlements in AoR, # contested, list of key settlements |
| **COMMAND** | Command friction indicator (if > 0.5: ⚠ "Intent divergence detected"), last order received |

**Corps click:**

| Section | Fields |
|---------|--------|
| **CORPS** | Name, HQ location, faction, commander name (if modeled) |
| **SUBORDINATES** | List of brigades with inline strength % bars |
| **AREA** | Total settlements, front-line length estimate, contested count |
| **SUPPLY** | Corridor statuses for this corps zone |

### 4.4 Shared Panel, Not Separate Panels

The info panel is **one panel** that displays different content depending on what was clicked: settlement, brigade, or corps. This prevents the UI from proliferating side panels and keeps the interaction model simple: *click anything → details appear on the right*.

A small breadcrumb / back-link at the top of the panel allows navigation: "← Back to Settlement: Foča" if the player clicked a brigade from within a settlement's AoR.

### 4.5 Why Not Modals?

Modals for brigade/corps info would be disorienting. The player needs to see the brigade's AoR on the map simultaneously with its stats. A right-side panel preserves this spatial context. Every serious operational wargame (Gary Grigsby's War in the East, Decisive Campaigns, CMANO) uses side panels or embedded info bars rather than popups for unit inspection.

---

## 5. Accessibility

### 5.1 Already-Good Decisions in the Spec

The UI Design Specification already mandates:
- Hatching patterns (not color alone) for faction differentiation
- High contrast text (black on white/beige)
- Minimum 12pt body / 18pt headline font sizes

These are solid. Additional recommendations:

### 5.2 Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Cycle focus between: layer toggles → zoom controls → info panel close button → map canvas. |
| `Arrow keys` (when map focused) | Pan map in cardinal directions. |
| `Enter` (when map focused) | Act as left-click at viewport center (zoom in or select). |
| `Escape` | Close panel → zoom out → exit map (cascading). |

The map canvas should receive a visible **focus ring** (2px solid yellow, the NATO standard "own forces" color) when keyboard-focused.

### 5.3 Screen Reader Considerations

For an MVP of a visual map game, full screen reader support is impractical. However, two low-cost measures:

1. **aria-live region** for the info panel: when panel content changes, announce "Settlement panel: Foča, controlled by RS" to assistive technology.
2. **Alt-text on faction color swatches** in the panel: "RS (Republika Srpska) — Crimson Red" rather than relying solely on the color.

### 5.4 No Color-Only Critical Information (Reinforced)

Every piece of critical information must have a **text label or pattern** in addition to color:

- Settlement control: color fill + text label in panel + hatching pattern on map
- Exhaustion: color gradient on heatmap overlay + numeric value in tooltip/panel
- Supply status: color-coded corridor + text status ("OPEN" / "BRITTLE" / "CUT") in tooltip

This is already stated in the handover and spec; I'm reinforcing it as non-negotiable.

---

## 6. Order-Giving Placeholder

### 6.1 Recommendation: Reserve the Affordance, Don't Implement It

The map should **signal that orders will be given here** without implementing any order mechanics. This serves two purposes: (a) it anchors the player's mental model ("I will eventually give orders through this map"), and (b) it reserves UI real estate and interaction patterns so the future implementation doesn't require a retrofit.

### 6.2 Concrete Placeholder

At the **bottom of the info panel**, below all current sections, add a greyed-out section:

```
┌──────────────────────────────┐
│ ■ ORDERS                     │
│ ──────────────────────────── │
│                              │
│   [  Issue Order  ]          │
│   (Available in Phase II)    │
│                              │
└──────────────────────────────┘
```

The button is **visible but disabled** (greyed out, no hover effect, no click action). The text "(Available in Phase II)" tells the player this is coming.

**Do NOT:**
- Add a floating "Orders" toolbar or ribbon — this over-commits the layout before the order system is designed.
- Add right-click context menus for ordering — the right-click interaction pattern should be designed holistically with the order system, not piecemeal.
- Reserve a bottom bar or command panel — this implies a tactical command interface which conflicts with the political-leadership framing.

### 6.3 Why a Panel Section, Not a Separate UI Area

The order system, when it arrives, should feel like a natural extension of the inspection flow: *inspect settlement → understand situation → issue order*. Placing the order affordance at the bottom of the same panel that shows settlement/brigade information creates this narrative flow. The player reads the situation top-to-bottom and then acts at the bottom.

This is conceptually aligned with Decisive Campaigns: Barbarossa's approach, where clicking a unit shows its details and the available orders in one combined view, rather than splitting inspection and command into different UI modalities.

---

## 7. Additional Recommendations (Unprompted)

These were not among the six questions but emerge from the analysis:

### 7.1 Minimap / Overview Inset

At L1 and L2 zoom, add a small **overview inset** in the bottom-left corner (150×100px) showing the full BiH extent with a rectangle indicating the current viewport position. This is standard in every serious wargame (Gary Grigsby, HoI4, CMANO, War in the East) and prevents spatial disorientation during deep zooms.

The inset should be click-navigable: clicking a position on the inset pans the main map to that location.

Visual treatment: same dark background, thin border, faction colors for control zones at L0 resolution.

### 7.2 Turn / Date Display on Map

The War Planning Map should display the current game turn and calendar date (e.g., "W23 — 8 Jun 1992") in the **top-left corner** of the map viewport, with small stencil-font text. This prevents the player from losing temporal context when they're deep in the map and can't see the warroom's wall calendar.

### 7.3 Search / Jump-to-Settlement

Add a small search field (accessible via `/` or `Ctrl+F`) that allows the player to type a settlement name and jump to it on the map. With 1000+ settlements, spatial memory alone is insufficient. This is a standard feature in EU4, HoI4, and Victoria 3 for good reason.

The search should be fuzzy-tolerant of diacritics (searching "Gorazde" should find "Goražde").

### 7.4 Front-Line Emphasis at L1

At L1 (operational) zoom, the boundary between opposing faction control zones should be rendered as a **thickened, emphasized line** (3–4px black dashed) even before the Phase II front-line system is implemented. This can be derived purely from the political control data: wherever a settlement controlled by faction A borders a settlement controlled by faction B, the shared edge is a front line.

This is computationally similar to the municipality-border-from-shared-edges derivation already implemented (`derive_mun1990_boundaries_from_shared_borders_v2.ts`). The algorithm is: iterate settlement pairs, identify inter-faction borders, render those segments with a thicker stroke.

This gives the player immediate, visceral comprehension of *where the fighting is* without requiring any Phase II military data.

### 7.5 Map Legend

A small, toggleable legend (bottom-right, above the zoom controls) showing:

```
┌─────────────────────────┐
│ ██ RS (Republika Srpska) │
│ ██ RBiH (Bosnia-Herz.)   │
│ ██ HRHB (Herzeg-Bosnia)  │
│ ▓▓ Contested             │
│ ░░ Highly Contested      │
│ ── Front Line            │
└─────────────────────────┘
```

Players should never have to memorize the color scheme. This is especially important given the accessibility requirement for hatching patterns.

---

## 8. Interaction State Machine (Summary)

The complete interaction model can be described as a state machine:

```
                    ┌─────────────┐
         ESC ◄──────│   WARROOM   │
                    └──────┬──────┘
                      click wall map
                    ┌──────▼──────┐
            ┌───────│  L0: STRAT  │◄───── Home/F
            │       └──────┬──────┘
            │         click / scroll
            │       ┌──────▼──────┐
            │  ┌────│  L1: OPER   │
            │  │    └──────┬──────┘
            │  │      click / scroll
            │  │    ┌──────▼──────┐
            │  │    │  L2: TACT   │
            │  │    └──┬───┬──────┘
         ESC│ B│       │   │
            │  │  click│   │click brigade
            │  │  settl│   │(Phase II)
            │  │    ┌──▼───▼──────┐
            │  │    │ INFO PANEL  │
            │  │    │ (right side)│
            └──┴────│ Settlement  │
           (cascade)│ or Brigade  │
                    │ or Corps    │
                    └─────────────┘
                       ESC → close panel
                       ESC again → zoom out
```

Every state is reachable via both mouse and keyboard. `Escape` always cascades: close panel → zoom out → exit to warroom.

---

## 9. Visual Design Principles (Reinforcing the Spec)

The existing NATO_AESTHETIC_SPEC and UI_DESIGN_SPECIFICATION are strong. I want to reinforce a few principles that are easy to lose during implementation:

### 9.1 "Tactical Brutalism"

The map should feel like it was printed on heavy paper stock and annotated with a grease pencil. Every UI element on top of the map (panels, toggles, tooltips) should feel like they belong in a 1990s military planning room, not a modern web application.

**Concrete:** No rounded corners on panels or buttons (use sharp rectangles). No drop shadows (use thin solid borders). No gradients on UI elements (use flat fills). Typography is stencil or monospace. Backgrounds use paper-grain texture, not smooth fills.

### 9.2 Restrained Information Density

At each zoom level, show **only the information appropriate to that command echelon:**

- L0 (President's view): "Who controls what, roughly?" → big color blocks, major city names only.
- L1 (Corps commander's view): "Where are the corps, where are the fronts?" → corps boundaries, brigade AoRs, front segments.
- L2 (Brigade commander's view): "What's happening at this settlement?" → individual settlements, unit symbols, detailed labels.

**Do not** show settlement names at L0. **Do not** show individual settlements at L0. Information overload at the strategic level is the #1 failure mode in wargame UI. Hearts of Iron 4 and EU4 both learned this lesson: at world zoom, you see country colors and major city names, nothing more.

### 9.3 Color Discipline

The three faction colors are already defined:
- RS: `rgb(180, 50, 50)` — Crimson
- RBiH: `rgb(70, 120, 80)` — Forest Green
- HRHB: `rgb(60, 100, 140)` — Steel Blue

**These colors should appear ONLY for faction control indication.** All other UI elements (panels, buttons, tooltips, text) must be neutral (blacks, whites, beiges, greys). This prevents the player from confusing a green button with RBiH territory, for example.

---

## 10. Implementation Priority (Phased)

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| **P0** | Right-side info panel (settlement sections) | 2–3 days | Core interaction |
| **P0** | Scroll-wheel zoom with cursor anchoring | Already done | Foundation |
| **P0** | Click-to-zoom cascade (L0→L1→L2) with click-to-select at L2 | 1 day (refine existing) | Resolves click ambiguity |
| **P1** | Layer toggle floating panel | 1 day | Player customization |
| **P1** | Escape cascade (panel→zoom→exit) | 0.5 day | Navigation fluency |
| **P1** | +/− zoom buttons + keyboard shortcuts | 0.5 day | Accessibility + discoverability |
| **P2** | Front-line emphasis from control data | 1–2 days | Huge situational awareness payoff |
| **P2** | Minimap overview inset | 1 day | Spatial orientation |
| **P2** | Search/jump-to-settlement | 1 day | Usability for large maps |
| **P2** | Map legend | 0.5 day | Accessibility |
| **P3** | Turn/date display on map | 0.5 day | Context |
| **P3** | Orders placeholder in panel | 0.5 day | Future affordance |
| **Phase II** | Brigade/corps hover tooltips | 1–2 days | OOB integration |
| **Phase II** | Brigade/corps click → panel content | 1–2 days | OOB integration |

**Total MVP estimate: ~8–10 days** for P0 + P1 features, which aligns with the Phase G.2 timeline in the UI Design Specification.

---

## 11. Summary of Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Settlement info panel layout | **Single right-side panel with stacked collapsible sections.** No tabs. No modal. |
| 2 | Zoom interaction model | **Scroll wheel (smooth) + click-to-drill (L0→L1→L2→select) + keyboard shortcuts + visible +/− buttons.** |
| 3 | Layer toggle placement | **Floating top-right panel, collapsible to icon.** Unavailable layers visible but greyed with phase badges. |
| 4 | Brigade/corps info presentation | **Hover tooltip (quick scan) + click replaces panel content (deep dive).** Same right-side panel, different content. |
| 5 | Accessibility | **Keyboard nav (Tab/Arrows/Enter/Escape), aria-live panel, no color-only info.** Focus ring on map. |
| 6 | Order-giving placeholder | **Greyed-out "Issue Order" button at bottom of info panel.** No toolbars, no right-click menus, no command bars. |

---

*This proposal is designed to be implementable within the existing technical stack (Canvas-based `WarPlanningMap.ts`), respects all canon and determinism constraints, and aligns with the NATO tactical aesthetic established in the UI Design Specification. The recommendations are grounded in operational wargame UI precedent from titles that share AWWV's strategic-level, inspection-first design philosophy.*
