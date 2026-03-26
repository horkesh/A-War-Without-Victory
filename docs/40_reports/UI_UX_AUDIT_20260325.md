# UI/UX Comprehensive Audit — 25 March 2026

**Auditor:** UI/UX Developer (Pyrrhic)
**Version:** v0.6.1 · Week 40 · 6 Jan 1993 (RS faction)
**Method:** Live browser walkthrough of every screen, tab, panel, modal, overlay, and map mode.

---

## Executive Summary

The UI has strong bones — a military ops-center aesthetic, good information density in some panels, and a coherent visual language. But **wasted space** is the dominant problem: most screens use 20-40% of available area, leaving enormous dark voids that make the app feel unfinished. The second problem is **information scatter** — related data lives across too many tabs/sub-tabs, forcing excessive navigation instead of presenting a unified picture.

---

## 1. ARMY HQ MODAL — Detailed Findings

### 1.1 BRIEFING Tab

**What works:**
- Three-column layout (Commander | Daily Briefing | Strategic Position) is good conceptual grouping
- War crimes / ICTY section on commander card is a strong thematic touch
- Situation Briefing alert cards (corps cohesion, thin fronts) are actionable
- Corps cards at bottom with stance badges (OFF/BAL), personnel, ORBAT counts

**Problems:**
- **Daily Briefing parchment card** is a single paragraph of text in a box that's ~40% of the screen width but only 15% of its height. The bottom 60% of the parchment is blank. The briefing text itself is one short paragraph — this is a massive card for very little content.
- **Strategic Position bars** (right column) are cut off at the bottom — "INTERNAL COHESION" and "NEGOTIATING LEVERAGE" require scrolling to see. The VRS crest takes up significant vertical space above the bars. Recommendation: shrink crest, show all bars without scroll.
- **Corps cards row** at the bottom: 5 visible cards + 1 requires scrolling, but each card is mostly empty space. The bottom half of each card is blank dark area. They show: name, commander, EF rating, personnel/ORBAT/front counts, tanks/arty numbers — but this occupies ~30% of the card height.
- **Massive blank space** below the corps cards — after the 6th card (Sarajevo-Romanija), there's a full viewport of empty black. The page just... ends.

**Recommendations:**
1. **Kill the parchment card** or make it a narrow banner. The Chief of Staff briefing is one paragraph — it doesn't need a full-width card. Put it inline or as a dismissible toast.
2. **Strategic Position**: compact the VRS crest to 60px, show all 7 bars without scroll.
3. **Corps cards**: reduce card height by 40%, fill the space with a mini health bar or a 1-line sector summary.
4. **Remove dead space below corps cards** — either auto-fit the grid or fill with a "quick actions" zone.

### 1.2 Corps Expanded View (e.g. 1st Krajina Corps)

**What works:**
- Header with corps name, EF rating, personnel, ORBAT, sectors count, stance dropdown
- Commander card with war crimes info
- Collapsible sections (SECTORS, OPERATIONS, ORBAT, COMBAT RECORD)
- Bottom tab bar for switching between corps

**Problems:**
- **Commander card dominates** — takes ~50% of viewport before any operational data appears. The war crimes text block is large. For a corps-level view, the player cares about SECTORS and ORBAT more than the commander's biography.
- **Collapsible sections all start collapsed** — when you open the corps card, you see Commander + 3 collapsed section headers + lots of empty space. The player must click to expand each one. This is click-heavy for routine checks.
- **Sectors expanded** show good data (name, front length, density, stance dropdown) but each sector row is quite tall for the amount of data shown.
- **REASSIGN COMMANDER / DISMISS buttons** are prominent but rarely used — they occupy prime real estate.
- **Bottom corps tab bar** is good but tiny text — harder to read than it should be.

**Recommendations:**
1. **Collapse Commander section by default**, expand SECTORS by default (this is what the player needs every turn)
2. **Commander summary line** instead of full card: "Gen. Momir Talić · 4/5 · Offensive" in one row, expandable for details
3. **Auto-expand at least SECTORS** when entering corps view — or show a compact "at-a-glance" view with all sections partially visible
4. Move REASSIGN/DISMISS to a "..." overflow menu

### 1.3 SUMMARY Tab

**What works:**
- Sub-tabs (Overview, IVP, Convoys, Casualties, Support, OPSEC, Capital) cover all dimensions
- Data itself is correct and useful

**Problems — THE WORST TAB FOR BLANK SPACE:**
- **Overview** sub-tab: Territory table (3 factions, 1 row), Military Strength (3 rows), Displacement (1 line), Civilian Impact (1 line). This is maybe 10 lines of text. It occupies **the left 25% of the screen width** and **the top 35% of the screen height**. The remaining 75% width and 65% height is COMPLETELY EMPTY. This is the most egregious waste of space in the entire UI.
- **IVP** sub-tab: Same left-column-only layout. International Pressure box + Operational Posture box + Diplomacy box, all in a narrow left strip. ~70% of the screen is black void.
- **Casualties** sub-tab: Three lines of casualty data + Alliance Gauge + IVP repeat (!) — all crammed into left 25%. Same void.
- **Pattern**: Every sub-tab in Summary uses the same narrow left-column layout. None of them use the full width.

**Recommendations:**
1. **DELETE the sub-tab system entirely.** Merge Overview, Casualties, IVP, and Capital into ONE dashboard view using the full screen width. Use a 2-column or 3-column card layout.
2. **Use the full width** — territory bar chart should span the full width. Casualty tables should use full width with color-coded faction columns.
3. Or: **Redesign as a single scrollable dashboard** with sections, not tabs. The total amount of data across all 7 sub-tabs would fit in one well-designed screen.
4. The IVP data appears on BOTH the IVP sub-tab AND the Casualties sub-tab — remove the duplication.

### 1.4 RECORDS Tab

**What works:**
- Sub-tabs for After-Action Report, Operation History, Codex

**Problems:**
- **After-Action Report** shows only "FACTION PULSE" and "DISPLACEMENT" as collapsed headers. The entire screen below is empty. If there's no AAR data for this turn, it should say so prominently or show the most recent AAR.
- **Empty state is terrible** — just two collapsed labels and a void. No explanation, no "no battles occurred this turn", nothing.

**Recommendations:**
1. If no AAR data: show "No battles this turn" with a link to the most recent battle summary
2. Consider merging AAR into the Briefing tab's situation section
3. Operation History and Codex could be standalone panels rather than buried in a sub-tab

### 1.5 PERSONNEL Tab

**What works — THIS IS THE BEST TAB:**
- Force Overview stats (98,988 personnel, 83 brigades, 6 corps, 90 supply reserve) in full-width cards
- Order of Battle with two-column brigade list organized by corps
- Officer Roster with C/A ratings
- **Uses the full screen width** — this is the model for how all tabs should look

**Problems:**
- Minor: Brigade names could be more scannable with alternating row colors or subtle dividers
- Officer cards at bottom are plain text rows — could benefit from the compact card treatment

**Recommendations:**
- This tab is the gold standard. Use its full-width, multi-column layout as the template for Summary and Records tabs.

---

## 2. MAIN MAP VIEW — Findings

### 2.1 Top Toolbar / Presidential Toolbar

**What works:**
- CHRONICLE button, turn/date indicator, ADVANCE TURN button — clean and functional
- DEV badge for development mode indicator
- VRS HQ button with [H] hotkey hint

**Problems:**
- **Faction crest** in top-center is large (takes ~5% of viewport height) and purely decorative during gameplay. It's useful on first glance but not after turn 1.
- **Command Briefing alert strip** is good but takes significant vertical space. 4 alert cards in a row, each quite wide. On a crowded screen this pushes the map down.
- **DISMISS button** for alerts is tiny and far right — easy to miss

**Recommendations:**
1. Consider making the faction crest smaller or moving it to the left sidebar header
2. Command Briefing: make collapsible (auto-collapse after reviewing), or use a compact numbered badge that expands on hover
3. Hotkey hints on all toolbar buttons (not just HQ)

### 2.2 Left Sidebar (OOB Sidebar)

**What works:**
- Accordion sections (SITUATION, ARMY) are a good pattern
- Corps cards show key stats (personnel, brigades, tanks/arty, stance dropdown, ORBAT button)
- Color-coded by faction

**Problems:**
- **SITUATION section** appears to not expand (or was empty) — unclear if it has content
- **Sidebar doesn't resize** — fixed width regardless of content
- **Sector list mode** (after clicking map): all sectors show CRITICAL status in red. Every single sector says CRITICAL — if everything is critical, nothing is. This is alarm fatigue.
- **Density numbers** in sector list are shown as raw decimals (0.00, 0.11, 0.25, 1.00) — these are not player-friendly. Use words (Empty, Thin, Adequate, Strong) or color bars.
- **Scrolling required** to see all corps — the 6 RS corps + main staff don't fit in viewport

**Recommendations:**
1. Fix SITUATION section — show 2-3 key alerts or merge into Command Briefing
2. Add sector status thresholds: don't label everything CRITICAL. Use CRITICAL (red), WARNING (yellow), STABLE (green), STRONG (blue).
3. Replace density decimals with visual indicators (bars or words)
4. Consider a compact mode for the sidebar that shows more corps in less space

### 2.3 Center Map Area

**What works:**
- Political coloring (green/red/blue) is clear and readable
- Brigade NATO symbols are distinctive per type (X=infantry, triangle, circle)
- Front lines (dashed lines) visible between factions
- Settlement labels appear at zoom
- Multiple map modes (Political, Ethnic, Supply, Operations) change rendering meaningfully

**Problems:**
- **Brigade markers overlap** heavily in dense areas (Sarajevo especially) — markers stack on top of each other making it impossible to select individual brigades
- **No legend visible** on the main map — new players won't know what the symbols mean
- **Map modes** change the visual but don't provide a legend for the new coloring (Supply mode uses brown/green heat map — what do the colors mean?)

**Recommendations:**
1. Stack expansion: when multiple brigades overlap, show a count badge and click-to-expand fan
2. Add an auto-legend for the active map mode in the corner
3. Consider a "declutter" zoom level that hides brigade markers and shows only front lines + corps boundaries

### 2.4 Right Panel Rail (Settlement Info / Formation Detail)

**What works:**
- Settlement Info with tabs (Overview, Municipality, Timeline) is thorough
- Population data, ethnic composition bars, elevation, road access
- Pre-war vs current ethnic structure comparison

**Problems:**
- **Panel competes with map** — when open, it occludes ~20% of the map on the right side
- **Settlement popup on map** AND Settlement Info panel on right show OVERLAPPING data — the popup shows population + ethnic bars, and so does the right panel. Pick one.
- **No smooth transition** — panel just appears, pushing/overlaying content

**Recommendations:**
1. Remove the settlement popup — the right panel has all the same data and more. One click = right panel opens. The popup is redundant.
2. Or: Make the popup a compact preview with a "pin to panel" button, but don't show both simultaneously.

### 2.5 Sector Intelligence Panel (Center)

**What works:**
- COMBAT POWER ASSESSMENT with Strength/Personnel/Offensive Power/Defensive Power/Force Balance is excellent
- UNIT CONDITION (Morale/Cohesion/Fatigue) is compact and clear
- Front Length, Brigades, Sector Stance, Supply Priority — all useful
- Tabs: Overview, ORBAT, Logistics, Operations

**Problems:**
- **This is a THIRD panel** that opens simultaneously with Settlement Info AND the sidebar sector list. Three panels + map = incredibly cluttered. The center panel overlaps the Command Briefing alerts.
- **Sector Intelligence** should arguably BE the Army HQ corps view. It has most of the same data. Why are there two different views for the same corps-sector information?

**Recommendations:**
1. Merge Sector Intelligence into the right panel rail (replace Settlement Info when a sector is selected)
2. Or: Make it exclusive with Settlement Info — selecting a sector closes settlement, selecting a settlement closes sector
3. Never show 3 information panels simultaneously

### 2.6 Bottom Status Strip

**What works — BEST DENSITY IN THE APP:**
- Map mode selector tabs
- Territory bar chart (colored segments)
- Per-faction area percentages with trend arrows
- Patron status (BELGRADE: SUPPORTIVE)
- Operation count (9 ops)
- LAYERS button

**Problems:**
- Minor: Trend arrows (→) are small and hard to read at a glance
- "LAYERS" button is isolated on the far right — not obviously connected to the map mode tabs

**Recommendations:**
- This strip is already excellent. Only tweak: make trend arrows slightly larger or use up/down chevrons with color (green up, red down).

### 2.7 Chronicle Overlay

**What works:**
- Full-width timeline scrubber with faction-colored event density bars
- Date markers with "N events" badges
- Event cards categorized by type (HUMANITARIAN, etc.)
- Can scroll through the full war timeline

**Problems:**
- **Dominated by displacement waves** — at 40 weeks, almost every visible card is "Displacement wave" in identical formatting. No visual variety. The chronicle feels like a list of identical displacement events.
- **Event cards are all the same size** regardless of importance — a displacement wave gets the same card as (presumably) a major battle or political event
- The left sidebar sectors list persists under the chronicle, creating visual clutter

**Recommendations:**
1. Vary card sizes by event significance — major events get larger cards, routine displacement gets compact one-liners
2. Filter controls: let the player filter by event type (Military, Political, Humanitarian, Diplomatic)
3. Collapse the left sidebar when Chronicle is open (it's irrelevant in chronicle context)

---

## 3. CROSS-CUTTING ISSUES

### 3.1 Blank Space (The Primary Problem)

| Screen | Approx. Area Used | Blank Space |
|--------|-------------------|-------------|
| Army HQ > Briefing (bottom) | 70% | 30% below corps cards |
| Army HQ > Summary > Overview | 25% | **75% empty** |
| Army HQ > Summary > IVP | 25% | **75% empty** |
| Army HQ > Summary > Casualties | 25% | **75% empty** |
| Army HQ > Records > AAR | 5% | **95% empty** |
| Army HQ > Corps expanded | 50% | 50% (collapsed sections) |
| Army HQ > Personnel | 90% | 10% — **gold standard** |
| Main map view | 85% | 15% — good |
| Bottom status strip | 95% | 5% — excellent |

**Root cause**: The Summary and Records tabs appear to use a narrow `max-width` container that's ~400px on a 1920px screen. The Personnel tab does NOT have this constraint, proving it's a per-tab layout issue, not a global one.

### 3.2 Tab/Sub-tab Proliferation

Current navigation depth to reach some data:
- IVP data: Army HQ → Summary tab → IVP sub-tab = **3 clicks**
- Operation history: Army HQ → Records tab → Operation History sub-tab = **3 clicks**
- Brigade list for a corps: Army HQ → click corps card → expand ORBAT = **3 clicks**
- Sector stance: Army HQ → click corps → expand SECTORS → per-sector = **4 clicks**

Most wargames present this info in 1-2 clicks. The tab hierarchy adds cognitive load without adding clarity.

### 3.3 Redundant Data Presentation

Several pieces of data appear in multiple places:
- **IVP data**: shown in Summary > IVP AND Summary > Casualties sub-tabs
- **Sector data**: shown in Army HQ > corps > Sectors AND in the map's Sector Intelligence panel AND in the left sidebar sector list
- **Brigade data**: shown in Army HQ > Personnel AND Army HQ > corps > ORBAT AND in the left sidebar ARMY accordion AND in the map's Formation Detail panel
- **Commander info**: shown in Briefing tab top section AND in corps expanded view

Redundancy isn't always bad (multiple entry points to the same data), but when the redundant views show DIFFERENT subsets of the same data in DIFFERENT formats, it's confusing.

### 3.4 Critical Status Alarm Fatigue

In the left sidebar sector list, **every single sector** shows "CRITICAL" in red. When the entire list is red, the status system has failed — the player can't distinguish genuinely critical sectors from moderately weak ones. Need tiered severity.

### 3.5 Empty States

Several views have no meaningful empty state:
- Records > AAR with no battles: shows 2 collapsed headers and nothing else
- Sector Intelligence for a sector with 0 assigned brigades: shows "0 assigned" but no suggestion of what to do
- SITUATION accordion in sidebar: appears to have no content

Every empty state should explain what's missing and suggest an action.

---

## 4. WHAT TO DELETE / MERGE / ADD / CHANGE

### DELETE
1. **Settlement popup on map** — redundant with Settlement Info panel
2. **IVP sub-tab duplication** on the Casualties sub-tab
3. **Summary sub-tab system** — merge into single dashboard
4. **Dead blank space** below corps cards on Briefing tab

### MERGE
1. **Summary sub-tabs → single dashboard** using full-width card layout (model: Personnel tab)
2. **Records > AAR → into Briefing tab** as a collapsible "Last Turn" section
3. **Sector Intelligence center panel → right panel rail** (take over from Settlement Info when selecting sectors)
4. **Commander card in corps view → compact 1-line summary** (expandable)

### ADD
1. **Map legend** per active map mode
2. **Tiered severity labels** for sectors (not all CRITICAL)
3. **Empty state messages** with suggested actions
4. **Event type filters** on Chronicle
5. **Hotkey hints** on all toolbar buttons
6. **Brigade stack expansion** for overlapping markers

### CHANGE
1. **Summary tab layout** — remove the narrow container, use full screen width
2. **Corps expanded view** — default-expand SECTORS, default-collapse Commander
3. **Density numbers** in sector list — replace 0.00-1.00 with visual indicators
4. **Briefing parchment** — shrink from full card to narrow banner or toast
5. **Strategic Position bars** — show all 7 without scroll (shrink crest)
6. **Chronicle cards** — vary size by event importance, not uniform
7. **Alert strip** — make collapsible after dismissing individual alerts

---

## 5. PRIORITY RANKING

| Priority | Item | Impact | Effort |
|----------|------|--------|--------|
| P0 | Fix Summary tab layout (use full width) | Huge — biggest visual win | Low |
| P0 | Merge Summary sub-tabs into dashboard | Huge — eliminates 6 clicks | Medium |
| P1 | Fix Records > AAR empty state | High — currently looks broken | Low |
| P1 | Tiered sector severity labels | High — fixes alarm fatigue | Low |
| P1 | Default-expand SECTORS in corps view | High — saves clicks every turn | Low |
| P2 | Remove settlement popup (keep panel) | Medium — reduces clutter | Low |
| P2 | Compact Commander card in corps view | Medium — better space usage | Medium |
| P2 | Shrink Briefing parchment card | Medium | Low |
| P2 | Kill dead space below corps cards | Medium | Low |
| P3 | Map legend per mode | Nice to have | Medium |
| P3 | Brigade stack expansion | Nice to have | High |
| P3 | Chronicle event type filters | Nice to have | Medium |
| P3 | Chronicle card size variation | Nice to have | Medium |

---

*Generated by UI/UX Developer (Pyrrhic) via live browser audit.*

---
---

# PART II: THE 10x REDESIGN — How to Make This Legendary

*Added after deep second pass. Covers everything the first audit didn't: the underlying layout philosophy, what great wargames do differently, the formation detail panel, operation history, map mode heat maps, the stack expansion system, and a holistic vision for what this UI should feel like.*

---

## 6. ADDITIONAL FINDINGS (Second Pass)

### 6.1 Formation Detail Panel

**This is actually one of the best panels in the app.** The OVERVIEW tab packs a tremendous amount of actionable data into a compact space: corps/sector assignment (with clickable links), posture, readiness, officer cadre quality, TO&E equipment bars (color-coded by fill level), supply effectiveness, cohesion/morale dot indicators, fatigue, personnel, effectiveness percentage, entrenchment turns, movement status, location.

The RECORD tab is equally strong: Campaign Losses table, Combat Record stats (battles, win rate, exchange ratio, territory captured), UNIT HISTORY narrative with arc badge (GARRISON). The auto-generated narrative text ("The 12th Kotorsko Light Infantry has held its ground. With only 0 engagements, its war has been one of patience, not blood.") is an excellent touch — makes brigades feel alive.

The ORDERS tab shows Field Effectiveness with home distance mechanic, and a sector assignment list that doubles as a reassignment interface. Very functional.

**Problem:** This panel opens as a center overlay, same position as Sector Intelligence. Two information-rich panels compete for the same screen real estate. There's no way to see formation detail AND sector intelligence simultaneously — but you often want both (e.g., "is this brigade strong enough for this sector's threat level?").

### 6.2 Stack Expansion System

**Already works.** Clicking a stacked location triggers a zoomed-in expansion with blurred background showing individual brigade markers with unit names. "DISMISS EXPANSION" button to close. This is better than I expected — my original audit noted it as missing, but it exists. It's just hard to trigger intentionally because you have to click precisely on a stack, and the expansion view is modal (blocks other interaction).

**Improvement:** Instead of a modal blur overlay, show a small popover fan (like a card hand) that doesn't block the rest of the map.

### 6.3 Operation History (Records > Operation History)

**This is excellent — full-width, dense, actionable.** Shows all 9 active operations across ALL factions (not just yours): Operacija Domet (ARBiH), Pravda (ARBiH), Trokut (ARBiH), Sahin (ARBiH), Sjena (ARBiH), Maestral (HVO), Hrast (VRS), Cerska-Kamenica (VRS), plus history. Each card shows faction badge, operation name, OIC officer, corps, start week, brigade count, status (RECOVERY/PLANNING/EXECUTION), objectives, attacks.

ACTIVE (9) / HISTORY (15) sub-tabs work well.

**This tab proves the UI can be good when it uses full width and has real content.**

### 6.4 Records Tab Bug

The AAR, Codex, and Operation History sub-tabs appear to share the same content container. Clicking CODEX shows the same "FACTION PULSE / DISPLACEMENT" collapsed headers as AAR — either the Codex isn't implemented yet, or there's a rendering bug where the sub-tab switch doesn't actually change the content. This needs investigation.

### 6.5 Map Mode Heat Maps

The extended map modes (Morale, Defense, Casualties) work: they change polygon fill colors and show a small legend in the bottom-left of the sidebar. The legends use good labels ("Broken", "Shaky", "Steady" for morale). Supply mode adds logistics bars to the sidebar. Ethnic mode shows majority ethnicity with a clean 4-color legend.

**Problem:** The legend appears at the very bottom of the LEFT SIDEBAR, where it overlaps with the sector list. It's easy to miss. The legends are also quite small and use the same position regardless of what mode is active.

**Improvement:** Legends should appear ON the map in a fixed corner (bottom-right, above minimap) with higher contrast.

### 6.6 Layer Toggle Panel

Clean and functional — FRONTS, UNITS, LABELS, SECTORS, MINIMAP, FOG, BORDERS as toggle checkboxes. Opens as a small popover from the LAYERS button. No issues.

---

## 7. THE PHILOSOPHY: WHY IT'S NOT 10x YET

The current UI is a **developer's dashboard** — it shows every system accurately and gives access to every data point. That's necessary but not sufficient for a 10x experience. Here's what separates good from legendary:

### 7.1 The Single-Screen Problem

Right now, the player's workflow every turn is:
1. Open Army HQ → read briefing
2. Check Summary → look at territory/casualties
3. Check each corps → review sectors, operations
4. Close HQ → look at map → click sectors → review threats
5. Plan operations
6. Advance turn

That's **~15-25 clicks per turn** across 4+ screens. In Hearts of Iron IV, Crusader Kings III, or Command: Modern Operations, most of this information is visible on a SINGLE screen with contextual sidebars. The player never leaves the map.

**The fundamental insight: Army HQ should not be a separate screen. It should be a lens on the map.**

### 7.2 Information Architecture is Inverted

Currently: *Army HQ is the master view, and the map is for clicking individual things.*

It should be: *The map is the master view, and HQ-level data overlays it contextually.*

The map already shows political control, ethnic composition, supply status, morale heat maps, defense heat maps, unit positions, front lines, sectors. It IS the strategic picture. Army HQ duplicates much of this in text form.

### 7.3 Every Panel is an Island

The Formation Detail panel doesn't link to the Sector Intelligence for the sector it's in. The Sector Intelligence panel doesn't link to the Operations affecting it. The Operations panel doesn't link to the map view of the operation axes. Everything is self-contained, and navigation between related views requires closing one thing and opening another.

---

## 8. THE 10x VISION: "THE WAR ROOM"

### 8.1 Core Concept: Map-Centric Command

**Kill Army HQ as a separate modal.** Replace it with a **War Room mode** — a full-screen map with smart overlays that bring HQ-level information to you without leaving the map.

The map is always visible. Information surfaces around it like a HUD:

```
┌─────────────────────────────────────────────────────────┐
│ [Briefing Banner]  Turn 40 · 6 Jan 1993        [►TURN] │
├────────┬────────────────────────────────────┬───────────┤
│        │                                    │           │
│ CORPS  │                                    │ CONTEXT   │
│ RAIL   │           THE MAP                  │ PANEL     │
│        │                                    │           │
│ (all   │   (always visible, always the      │ (whatever │
│ corps  │    primary information source)      │  you last │
│ at a   │                                    │  clicked) │
│ glance)│                                    │           │
├────────┴────────────────────────────────────┴───────────┤
│ [Territory] [Supply] [IVP] [Ops:9] [Morale]   [Layers] │
└─────────────────────────────────────────────────────────┘
```

### 8.2 The Corps Rail (Left, Always Visible)

Replace the current sidebar accordion with a **compact corps rail** — a vertical stack of corps summary cards that are ALWAYS visible. No expand/collapse, no scrolling through a tree. Every corps is one card:

```
┌──────────────────────────┐
│ 1ST KRAJINA  ████░ 41k   │  ← health bar + personnel
│ OFF · 8 sec · 36 brg     │  ← stance · sectors · brigades
│ ⚠ Cohesion 35 · Hrast ▶  │  ← top alert · active op link
├──────────────────────────┤
│ 2ND KRAJINA  ██░░░ 9.2k  │
│ BAL · 3 sec · 8 brg      │
│ ✓ Stable                  │
├──────────────────────────┤
│ DRINA        ████░ 12k   │
│ OFF · 3 sec · 9 brg      │
│ ⚠ Cerska-Kamenica ▶      │
├──────────────────────────┤
│ ...                       │
└──────────────────────────┘
```

**3 lines per corps, all 6 visible without scrolling.** Clicking a corps card:
- Highlights its sectors on the map
- Opens the context panel (right) with corps detail
- Clicking the operation name ▶ opens the operation detail

This replaces: the OOB sidebar accordion, the Army HQ briefing corps cards, and the first level of the Army HQ corps expanded view — **eliminating 2-3 navigation layers**.

### 8.3 The Context Panel (Right, Contextual)

The right panel shows detail for WHATEVER you last interacted with:
- Click a corps card → Corps detail (sectors, operations, ORBAT)
- Click the map terrain → Settlement info
- Click a brigade marker → Formation detail
- Click a sector front line → Sector intelligence
- Click an operation in the corps rail → Operation detail

**One panel, many contexts.** The panel content morphs. Breadcrumbs at the top show the navigation path: `VRS > 1st Krajina > Sector: Jajce > 1st Banja Luka LI`. You can click any breadcrumb to navigate up.

This replaces: the center Sector Intelligence panel, the right Settlement Info panel, the center Formation Detail panel, AND the Army HQ corps expanded view — **five separate panels become one**.

### 8.4 The Briefing Banner (Top, Persistent)

Replace the Command Briefing alert strip with a **single-line scrolling ticker** or a collapsible banner:

```
⚠ 1st Krajina cohesion 35 · Hrast losing momentum · IVP 31% (Drina blockade) · Herzegovina needs attention    [4 alerts ▾]
```

One line. Click ▾ to expand into the current alert cards. Auto-collapses after the player addresses each alert. This reclaims the ~60px of vertical space that the current alert strip permanently occupies.

### 8.5 The Bottom Intelligence Bar (Bottom, Always Visible)

Expand the current bottom strip into a **thin intelligence bar** that replaces the Summary tab:

```
┌──────────────────────────────────────────────────────────────────────┐
│ RS 62.1%▲ RBiH 24.3%▼ HRHB 13.6%─ │ 119k⚔ 7k† 14k⚕ │ IVP 31 │ 90⊕ │
│ [Political] [Ethnic] [Supply] [Ops] [Morale] [Defense]     [Layers] │
└──────────────────────────────────────────────────────────────────────┘
```

**Territory + casualties + IVP + supply reserves — all in one persistent bar.** No need to open Army HQ > Summary > click through 7 sub-tabs. The critical strategic numbers are always visible.

Click any number to expand a tooltip/popover with the detailed breakdown (the data currently in Summary sub-tabs).

### 8.6 The War Summary: Overlay, Not a Tab

When the player wants the FULL strategic picture (currently Summary tab), show it as a **translucent overlay on top of the map** — like a situation report laid on the map table:

```
┌─────────────────────────────────────────────────┐
│            STRATEGIC SITUATION REPORT            │
│                 6 January 1993                   │
│                                                  │
│  ┌─────────┐ ┌───────────┐ ┌──────────────────┐ │
│  │TERRITORY│ │ MILITARY  │ │  INTERNATIONAL   │ │
│  │         │ │ STRENGTH  │ │    PRESSURE      │ │
│  │ RS 62%  │ │ RS  119k  │ │  Composite: 31   │ │
│  │ RBiH 24%│ │ RBiH 142k │ │  Sarajevo: 50%   │ │
│  │ HRHB 14%│ │ HRHB 45k  │ │  Enclave: 0%     │ │
│  └─────────┘ └───────────┘ │  Displ: 5%       │ │
│                             └──────────────────┘ │
│  ┌───────────┐ ┌───────────┐ ┌────────────────┐ │
│  │CASUALTIES │ │  SUPPLY   │ │   DIPLOMACY    │ │
│  │           │ │  RESERVES │ │                │ │
│  │ RS 7k KIA│ │ RS ████ 90│ │ Belgrade: SUPP │ │
│  │ RBiH 14k │ │ RBiH ██ 40│ │ Alliance: 0.33 │ │
│  │ HRHB 2k  │ │ HRHB ███ 70│ │               │ │
│  └───────────┘ └───────────┘ └────────────────┘ │
│                                                  │
│  Displaced: 1,039k  Killed: 38k  Fled: 227k     │
│                                        [CLOSE]   │
└─────────────────────────────────────────────────┘
```

**All 7 current sub-tabs' worth of data on ONE screen** using a 3x2 card grid. The map remains faintly visible underneath. Press `S` to toggle. This replaces the entire Summary tab system.

### 8.7 The Operation Theater View

When viewing an active operation, the map should become the primary visualization:

- **Objective OSIDs** glow/pulse on the map
- **Participating brigades** get highlighted markers with connecting lines to their objectives
- **Attack axes** shown as animated arrows on the map
- **Side panel** shows operation status, supply, timeline, participating brigades

Currently, operation data is text-only in the operation cards. The map could SHOW the operation — this is what "10x" means. The player should SEE Operacija Hrast on the map, not read about it in a list.

### 8.8 The Personnel / ORBAT View: Table Mode

The Personnel tab is already the best tab. Make it even better:

- **Sortable columns**: click "Personnel" header to sort all brigades by strength. Click "Cohesion" to find your most shaky units. Click "Sector" to see grouping.
- **Inline editing**: click a brigade's sector assignment to reassign it without opening a sub-panel
- **Color coding**: row background tints red for combat-ineffective, yellow for low morale, green for full strength
- **Search/filter**: type "Drina" to see only Drina Corps brigades

This transforms Personnel from a read-only list into a **command spreadsheet** — the primary tool for force management.

### 8.9 The Chronicle: Timeline-Driven Narrative

Current chronicle is a horizontal timeline with uniform "Displacement wave" cards. It should be:

- **Vertically scrollable** (like a real journal/diary)
- **Mixed media**: battle reports have mini-maps showing territory changes. Diplomatic events have faction relationship graphs. Displacement waves are compact one-liners grouped together ("Weeks 35-40: 12,000 displaced across 6 settlements").
- **Importance hierarchy**: Major battles and turning points get full-width narrative cards with dramatic formatting. Routine weekly events get compact summary lines.
- **Player bookmarks**: let the player flag important moments ("this is when the Drina offensive stalled")

---

## 9. SPECIFIC 10x IMPROVEMENTS (Tactical Level)

### 9.1 The Right-Click Context Menu

Currently there's no right-click menu on the map. Add one:
- Right-click territory: [View Settlement] [View Sector] [Start Operation Here] [Set Waypoint]
- Right-click brigade: [View Formation] [Reassign Sector] [Set Posture] [View Corps]
- Right-click operation arrow: [View Operation] [Cancel Operation]

This eliminates the need to know which panel to open — the context menu offers relevant actions.

### 9.2 Keyboard-Driven Navigation

Currently only `H` opens Army HQ. Add:
- `1-6`: Select corps 1-6, highlight on map
- `S`: Toggle strategic situation overlay
- `O`: Toggle operations view
- `C`: Open chronicle
- `Tab`: Cycle through corps
- `Space`: Toggle between last two map modes
- `Escape`: Close all panels, return to clean map
- `F`: Find — search for brigade, settlement, or officer by name

### 9.3 Tooltip Previews (Hover, Don't Click)

**Hover over a corps card** in the rail → show a tooltip with the top 3 alerts for that corps, no click needed.
**Hover over a brigade marker** → show a compact summary (name, personnel, cohesion, posture) without opening the formation panel.
**Hover over a sector front line** → show sector density and stance.

Reserve clicks for opening the full detail panel. Tooltips handle 80% of "I just need a quick look" moments.

### 9.4 Status-at-a-Glance Indicators

Replace text status labels with **micro-visualizations**:

- **Personnel**: a thin bar showing current/max (red if <50%, yellow if <75%)
- **Cohesion**: 5 dots (like the current morale display, but everywhere)
- **Morale**: same 5-dot or 10-dot strip
- **Supply**: a small gauge icon (full/half/empty)
- **Sector health**: a colored pip (green/yellow/orange/red) instead of the word "CRITICAL"

These should be consistent EVERYWHERE a brigade or sector appears — in the corps rail, in tooltips, in the right panel, in the Personnel tab. Same visual language, same sizes, same colors.

### 9.5 Animated Transitions

Currently, panels appear/disappear instantly. Add:
- **Slide-in** for the right context panel (200ms ease-out)
- **Fade** for map mode changes
- **Pulse** on updated values (when personnel changes, briefly flash the number)
- **Expand** animation for collapsible sections

Subtle animation makes the UI feel alive and helps the player track what changed.

### 9.6 Turn Summary Flash

After advancing a turn, instead of immediately showing the new state, show a **2-second flash overlay** that highlights what changed:

```
┌─────────────────────────────────┐
│      TURN 41 — 13 JAN 1993     │
│                                 │
│  2 battles fought               │
│  RS territory: 62.1% → 62.3%   │
│  1st Krajina: −400 personnel    │
│  Operacija Hrast: 1 objective ✓ │
│                                 │
│         [CONTINUE]              │
└─────────────────────────────────┘
```

This orients the player instantly. Currently they have to hunt through the AAR and look at territory numbers to figure out what happened.

---

## 10. THE DESIGN LANGUAGE: MAKING IT FEEL LIKE A WAR

### 10.1 Current Aesthetic Assessment

The dark ops-center theme is correct for the genre. The monospace military font (SCREAMING_HEADERS) is appropriate. The color coding (red=RS, green=RBiH, blue=HRHB) is clear. The parchment briefing card and faction crests add character.

But it feels **sterile**. It's a database viewer with military fonts. Compare with:
- **Hearts of Iron IV**: Every decision feels weighty because of dramatic framing, sound design, and cinematic event popups.
- **This War of Mine**: Every data point feels human because of art, sound, and narrative framing.
- **Command: Modern Operations**: Every panel feels urgent because information density is extremely high and nothing is wasted.

### 10.2 What "Feel" to Target

AWWV should feel like a **1993 NATO situation room** — the kind of room where intelligence analysts track the war on big screens, where briefing papers pile up, where every number represents a real consequence. Not flashy, not cinematic — but DENSE, SERIOUS, and CONSEQUENTIAL.

Specific texture recommendations:
- **Paper texture** for briefings and reports (the parchment card is on the right track — extend this to all text-heavy panels)
- **Screen texture** for data displays (subtle CRT scanlines or matte panel look for the data tables)
- **Stamp/seal metaphor** for status badges (PLANNING/EXECUTION/RECOVERY stamps on operation cards)
- **Redacted/classified marks** for enemy intelligence gaps (instead of showing "Unknown", show █████ with a [CLASSIFIED] label)
- **Handwritten annotations** for the Chief of Staff briefing (cursive font overlay on the briefing text, as if the CoS marked it up)

### 10.3 Sound Design Notes (Future)

Not in scope for this audit, but: a typewriter click for advancing turns, paper shuffle for opening briefings, radio static for receiving front line reports, and a subtle ambient hum for the war room would complete the atmosphere.

### 10.4 Color Refinement

Current colors work but could be elevated:
- Territory fills should have subtle **topographic contour lines** visible through the color (they already have terrain, but the fill colors are opaque — make them semi-transparent)
- Front lines should **glow faintly red** where active combat occurred this turn
- Sectors with active operations should have a **subtle animated border pulse**
- Low-morale areas on the morale map should have a **desaturated, grey-washed** look instead of just different color

---

## 11. THE 10x IMPLEMENTATION ROADMAP

### Phase 1: Layout Revolution (Est. Medium Effort)
1. **Summary tab → single-page dashboard** (card grid, full width)
2. **Corps rail** replaces sidebar accordion (compact 3-line cards)
3. **Context panel** unifies Formation Detail + Sector Intelligence + Settlement Info
4. **Bottom intelligence bar** shows key numbers persistently

### Phase 2: Map as Command Center (Est. High Effort)
5. **Operation theater view** — visualize operations on the map
6. **Right-click context menus** on map elements
7. **Tooltip previews** on hover (no-click inspection)
8. **Turn summary flash** after advancing

### Phase 3: Atmosphere & Polish (Est. Medium Effort)
9. **Status-at-a-glance** micro-visualizations everywhere
10. **Animated transitions** for panels and map modes
11. **Paper/screen texture** refinements
12. **Keyboard navigation** full implementation

### Phase 4: Chronicle & Narrative (Est. High Effort)
13. **Chronicle redesign** — vertical, mixed-media, importance hierarchy
14. **Sortable/filterable ORBAT table** mode
15. **Briefing banner** replaces alert strip
16. **War Room mode** — Army HQ data on the map, no separate modal

---

## 12. NEWLY DISCOVERED BUGS

1. **Records > Codex sub-tab shows AAR content** — clicking CODEX does not change the displayed content. Either the Codex component isn't wired up, or the sub-tab state isn't switching.
2. **Records > AAR sub-tabs share a container** — Faction Pulse / Displacement headers appear on both AAR and Codex views identically.
3. **Sector list click target is inconsistent** — clicking the SECTORS label in corps expanded view doesn't expand it. You have to find the correct unnamed button ref. The clickable area is not the visible text.
4. **Summary > Casualties shows IVP data** — the International Pressure section is duplicated on the Casualties sub-tab, which should only show casualty data.

---

*If we do Phase 1 alone, the UI goes from "functional developer dashboard" to "polished wargame UI." If we do all four phases, it becomes something no wargame has ever done — a war room that makes you FEEL the weight of command.*

*— UI/UX Developer (Pyrrhic), 25 March 2026*

---

# PART III: OPS PLANNING MODAL — Deep Examination

**Method:** Opened the modal via Sector Intelligence → Operations tab → "Draft New Directive" button for 2nd Krajina Corps. Clicked through Phase 1 (Commander) and Phase 2 (Plan). Read all source code for Phases 3 (G-2 Assessment) and 4 (Authorize). Examined every interactive element, layout choice, and information flow.

---

## 13. MODAL ARCHITECTURE OVERVIEW

The OpsPlanningModal is a **4-phase wizard** overlaid full-screen on a dedicated OpsMap:

| Phase | Name | Purpose |
|-------|------|---------|
| 1 | **Commander** | Select operations commander from officer roster |
| 2 | **Plan** | Set objectives, assign brigades, configure parameters |
| 3 | **G-2 Assessment** | Review intelligence prediction (clipboard document) |
| 4 | **Authorize** | OPORD document + stamp animation + IPC submission |

**Phase stepper** at top center: pill-shaped bar with gold dots and phase labels connected by lines. Completed phases get dimmer gold; current phase has glow effect. Keyboard nav: Arrow L/R, number keys 1-4, ESC to close. Backtracking allowed to any previously visited phase.

**OpsMap** renders behind all phases as a full-bleed background with faction-colored polygons, front lines, and click-to-select interaction (Plan phase only).

**Corps identity card** (bottom-left): faction color bar + corps name + personnel count + sector count. Persists across phases.

---

## 14. PHASE 1: COMMANDER SELECTION

### 14.1 What Works

- **Officer cards are information-rich**: Each card shows rank, name, regional fit badge (HOME CORPS / COMPATIBLE / OUT OF REGION), personality archetype (e.g. "Complete Commander — Fast prep, accepts risk"), competence pips (●●●●○ 4/5 Skilled), aggressiveness pips, prep time in turns, and ops commanded count.
- **Color-coded prep time**: Green ≤3 turns, amber 4-5, red 6+. Instant readability.
- **Regional fit badges**: Green HOME CORPS, amber COMPATIBLE, red OUT OF REGION. Immediately tells the player whether this officer belongs here.
- **Sorting**: Available officers sorted by regional fit (home first), then competence. Smart default ordering.
- **Unavailable officers shown as struck-through pills** at bottom with reason tags (ASSIGNED TO OP, CORPS CMDR, KIA, etc.). Good information — you see the full roster even if most are unavailable.

### 14.2 Problems Found

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| C1 | **Card click target unreliable** | 🔴 CRITICAL | Clicking the card via mouse coordinates failed repeatedly. The `pointer-events-none` on the parent container with `pointer-events-auto` on the inner div creates a layering issue. Only programmatic `.click()` worked. This is a **blocking UX bug** — the primary interaction (selecting a commander) doesn't respond to mouse clicks reliably. |
| C2 | **No visual selection feedback** | 🟡 Major | Clicking a card immediately advances to Phase 2. There's no selected state, no highlight, no confirmation. The player can't compare officers and then choose — they click and they're gone. |
| C3 | **2-column grid cuts off right column** | 🟡 Major | Cards are in a 2-column grid at max-width 720px. On the 2294px viewport, the right column's aggressiveness label is clipped ("3/" instead of "3/5 Balanced"). The grid needs more width or responsive sizing. |
| C4 | **No "Back" or "Cancel" affordance** | 🟠 Minor | Only ESC key closes. No visible close button is apparent at this phase (the ✕ button at top-right exists but is 8px and barely visible against the map). |
| C5 | **Empty officer cards** | 🟠 Minor | Two blank cards at bottom show "GEN." and "DEP." with only OUT OF REGION badges. These are officers with no name — likely data issue, but the UI should hide or grey them properly instead of showing empty cards. |
| C6 | **No commander comparison view** | 🟠 Minor | No way to see what picking a Bold vs Cautious commander actually MEANS for the operation. A tooltip or side panel showing "Bold → faster prep, higher casualties" would add strategic depth. |
| C7 | **Archetype description is passive** | 🟠 Minor | "Hesitant, may never launch" for Radivoje Tomanić is great flavor text but doesn't mechanically connect. Does this mean the operation might auto-cancel? The player doesn't know. |

### 14.3 Recommendations

1. **FIX CLICK TARGET** (P0): Debug the `pointer-events-none` / `pointer-events-auto` layering on the commander phase container. The parent `div` has `pointer-events-none` to let the map show through, but the officer grid div with `pointer-events-auto` isn't receiving clicks. Possible z-index / overlay conflict with the OpsMap canvas underneath.
2. **Add selection state before advancing**: Click → highlight card with gold border + "SELECTED" badge → show "Proceed to Planning →" button. Let players compare before committing.
3. **Widen grid or go single-column**: On wide viewports, the 720px max-width wastes 70% of screen. Either remove the max-width or use a 3-column layout on wide screens.
4. **Add mechanical tooltips**: On hover, show what competence/aggressiveness actually DO (prep turns, casualty modifier, launch probability).

---

## 15. PHASE 2: PLAN

### 15.1 Layout Structure

The Plan phase has three distinct zones:

| Zone | Position | Content |
|------|----------|---------|
| **OpsMap** | Full bleed background | Interactive map with selectable enemy/friendly OSIDs |
| **Parameters Strip** | Bottom bar (above brigade tray) | Op name, type pills, tempo pills, tolerance pills, arty toggle |
| **Brigade Tray** | Bottom-anchored, horizontal scroll | Brigade cards with personnel, equipment, cohesion, fatigue |
| **Objectives Panel** | Top-right floating | "Click enemy territory on the map to add objectives" |
| **G2 Assessment button** | Inside ObjectiveList panel | Disabled until objectives are set |

### 15.2 What Works

- **Operation name auto-generated**: "Operacija Bor" / "Operacija Vibor" — faction-appropriate Bosnian/Serbian name via hash. Editable Courier New text field. Great immersion detail.
- **Brigade cards show combat readiness at a glance**: Personnel count (large), attack rating (A:15), tanks (T:31), artillery (A:30), cohesion bar, fatigue bar. Click to toggle assignment. Unavailable brigades (combat ineffective / disrupted) are greyed at 30% opacity.
- **Auto-propose system**: When first objective is added, brigades are auto-proposed based on proximity to objective, marked with "Suggested" badge. Smart default that the player can override.

### 15.3 THE PARAMETER STRIP — Critical Design Failure

The parameter strip is the **most important decision surface in the entire game** — the player sets operation type, tempo, and casualty tolerance here. It is currently **14 unlabeled buttons with zero explanation of what any of them do.**

**Confirmed via hover test + source audit**: `PlanParameters.tsx` renders every pill as a bare `<button>` with no `title`, no `aria-label`, no tooltip, no description. Hovering over FEINT, PROBE, REORGANIZATION, METHODICAL, ALL-OUT, REGARDLESS, ARTY PREP — nothing happens. The player is expected to understand 14 military concepts from their labels alone.

#### 15.3.1 TYPE — Six Operation Types, Zero Explanation

| Button Label | Internal Key | What it actually does | What the player knows |
|---|---|---|---|
| SECTOR ATTACK | `sector_attack` | Attacks within a single corps sector | Nothing — label is self-explanatory-ish |
| GENERAL OFFENSIVE | `general_offensive` | Corps-wide multi-sector operation | Nothing — how is this different from Sector Attack? |
| STRATEGIC DEFENSE | `strategic_defense` | Defensive posture operation | Nothing — why would I "plan" a defense here? |
| REORGANIZATION | `reorganization` | Refit/regroup operation | Nothing — what does this do to my brigades? |
| FEINT | `feint` | Deception operation | Nothing — does this actually attack? Does the enemy react? |
| PROBE | `probe` | Limited reconnaissance-in-force | Nothing — how many brigades? What's the risk? |

**The problem**: A veteran grognard might guess. A new player has no idea. "REORGANIZATION" — does that merge brigades? Rest them? Move them? The UI doesn't say. "FEINT" — is this a real attack that turns back, or a bluff? Silence. "STRATEGIC DEFENSE" as an option in an *operation planning modal* is confusing on its face — the modal says "Draft New Directive (Ops Planning)" which implies offense.

#### 15.3.2 TEMPO — Three Speeds, No Tradeoff Visible

| Button Label | Internal Key | Actual Mechanic | What the player sees |
|---|---|---|---|
| METHODICAL | `methodical` | Slower advance, lower casualties, better logistics | Just the word |
| STANDARD | `standard` | Default balanced tempo | Just the word |
| ALL-OUT | `all_out` | Maximum speed, higher casualties, supply strain | Just the word |

**The problem**: The player has no idea that METHODICAL means fewer casualties but more time (giving the enemy time to reinforce), or that ALL-OUT means faster results but higher losses and supply burn. These are the core tradeoffs of operational planning. They need to be VISIBLE at the moment of decision — not buried in a game manual.

#### 15.3.3 TOLERANCE — Five Thresholds, Opaque Naming

| Button Label | Internal Key | Actual Mechanic | What the player sees |
|---|---|---|---|
| DECISIVE ONLY | `decisive_victory` | Brigades only attack if predicted decisive victory (≥2.0 ratio) | Sounds cautious? |
| VICTORY REQUIRED | `victory` | Attack if predicted victory (≥1.5 ratio) | Sounds normal? |
| ACCEPT COSTLY | `costly_victory` | Attack even if costly victory predicted (≥1.0 ratio) | The default — why? |
| ACCEPT STALEMATE | `stalemate` | Attack even if stalemate predicted (≥0.7 ratio) | Sounds desperate? |
| REGARDLESS | `repulsed` | Attack no matter what — even if predicted repulse (≥0.5 ratio) | Suicide orders? |

**The problem**: This is actually the **best-designed** of the three groups — the escalation ladder is intuitively ordered and the labels are evocative. But even here, the player doesn't know the actual thresholds. "ACCEPT COSTLY" sounds bad but it's the default — why? Because the engine defines "costly victory" as ≥1.0 power ratio, which is actually a reasonable outcome. But the player reads "costly" and thinks they're being reckless. A simple "(≥1.0 ratio)" or "Attacks when evenly matched" subtitle would transform understanding.

"REGARDLESS" maps to the internal key `repulsed` — meaning brigades will attack even when they predict they'll be **repulsed**. That's a suicide order. The player should KNOW that. A red warning subtitle: "Will attack into predicted defeat" would make this weight felt.

#### 15.3.4 ARTY PREP — Toggle With No Context

The artillery preparation toggle shows "◇ ARTY PREP" (off) or "◆ ARTY PREP" (on, red glow). No tooltip. The player doesn't know:
- Does this consume supply?
- How much supply?
- What's the combat effect? (+X% attack power?)
- Does it reveal the attack axis to the enemy?
- Is it available? (Does the corps even HAVE artillery?)

#### 15.3.5 THE FIX: Hover Tooltips + Inline Subtitles

Every parameter pill needs **at minimum** a `title` attribute with a one-sentence description. Ideally, each pill gets a **subtle subtitle line** below the label:

```
┌─────────────────┐  ┌─────────────────────┐  ┌────────────────┐
│ SECTOR ATTACK   │  │ GENERAL OFFENSIVE    │  │ FEINT          │
│ One sector push │  │ Corps-wide assault   │  │ Threaten, don't│
│                 │  │                      │  │ commit         │
└─────────────────┘  └─────────────────────┘  └────────────────┘
```

For tempo and tolerance, a **single-line summary** under the group label:

```
TEMPO: ▸ How fast do we push? Faster = more casualties, less enemy prep time
TOLERANCE: ▸ When do we stop? Lower threshold = more attacks, more losses
```

### 15.4 Problems Found

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| P1 | **Map click to add objectives doesn't work** | 🔴 CRITICAL | Clicking on enemy territory on the OpsMap did not add any objectives despite multiple attempts on different map regions. The `selectableOsids` constraint may be too restrictive, or there's a click-target layering issue similar to C1. The map canvas (`maplibregl-canvas`) may be intercepting clicks before they reach the React click handler. |
| P2 | **14 parameter buttons with ZERO tooltips** | 🔴 CRITICAL | Every pill in Type (6), Tempo (3), Tolerance (5), and Support (1) is a bare `<button>` with no `title`, no `aria-label`, no hover tooltip. Source confirmed: `PlanParameters.tsx` has zero tooltip infrastructure. The player must guess what FEINT, REORGANIZATION, METHODICAL, REGARDLESS, and ARTY PREP do. This is the most important decision surface in the game and it's completely opaque. |
| P3 | **No tradeoff visibility** | 🟡 Major | Even if labels are self-explanatory (debatable), the TRADEOFFS are invisible. ALL-OUT vs METHODICAL is a casualties-vs-time tradeoff. DECISIVE ONLY vs REGARDLESS is a risk-vs-aggression tradeoff. These tradeoffs are the entire POINT of operational planning, and they're hidden. |
| P4 | **Tolerance default is misleading** | 🟡 Major | Default is "ACCEPT COSTLY" which sounds reckless to a new player but maps to `costly_victory` (≥1.0 ratio) — actually a reasonable threshold. The label creates false alarm. |
| P5 | **"REGARDLESS" hides suicide orders** | 🟡 Major | Maps to `repulsed` threshold — brigades attack into predicted defeat. No visual warning, no red highlight, no confirmation. The player can casually click this without understanding they're ordering men to die in a hopeless attack. Should have a distinct red/danger treatment. |
| P6 | **Objectives panel is mostly empty** | 🟡 Major | 280px wide panel on the right shows only "Click enemy territory on the map to add objectives" — tiny italic text in a huge dark box. This is dead space until objectives are added. |
| P7 | **Parameters strip is horizontally cramped** | 🟡 Major | Six operation types + three tempos + five tolerances + name field + arty toggle all squeezed into one horizontal bar. On the 2294px viewport it fits, but the 7px group labels ("TYPE", "TEMPO", "TOLERANCE") are nearly unreadable. |
| P8 | **Brigade tray is single-row horizontal scroll** | 🟡 Major | 13 brigade cards visible on HRHB corps, horizontal scroll. Each card is 160×140px. No indication of total count vs visible count. No "3 of 13 assigned" counter. |
| P9 | **No staging OSID indicator** | 🟠 Minor | The plan tracks `stagingOsid` but there's no visible label saying "Staging area: [name]" or a map marker. The player clicks a friendly OSID to set staging but gets no feedback. |
| P10 | **No schwerpunkt (main effort) indicator** | 🟠 Minor | First objective auto-becomes schwerpunkt, but there's no visual distinction on the map or in the objective list to show which is the main effort. |
| P11 | **No axis management UI** | 🟠 Minor | The `AxisState` system supports multiple axes of advance (id, name, brigadeIds, objectives per axis), but the UI only shows "Main Axis" with no way to add/rename/switch axes. The multi-axis capability is dead code from the UI perspective. |
| P12 | **March turns info hidden** | 🟠 Minor | `estimateMarchTurns()` calculates how long each brigade takes to reach the staging area, and `getMarchColor()` color-codes it (green ≤1, amber ≤3, red 4+), but this info is tiny on the brigade card and easily missed. |
| P13 | **No operation summary/preview** | 🟠 Minor | Before advancing to G-2, there's no summary showing "4 brigades assigned, 2 objectives, estimated 3 turns prep." The player must mentally aggregate. |
| P14 | **Cannot get to G-2 Assessment** | 🔴 CRITICAL | Because P1 blocks adding objectives, the "G2 Assessment →" button stays disabled. The entire Phase 3 and 4 flow is unreachable through normal UI interaction. |

### 15.5 Recommendations

1. **FIX MAP CLICK HANDLING** (P0): The OpsMap `onOsidClick` handler only fires during `phase === 'plan'`, which is correct. Debug whether MapLibre's click event is reaching the React handler. Check if the dimming overlay (`bg-black/60` on the modal container) intercepts pointer events before the map. The modal has `z-[1000]` with the OpsMap inside it — verify the canvas click propagation.
2. **ADD TOOLTIPS TO EVERY PARAMETER PILL** (P0): At minimum, add `title` attributes to all 15 buttons in PlanParameters.tsx. Ideal: add a subtitle line below each pill label showing the one-sentence tradeoff. This is the single highest-impact UX improvement possible — it transforms the planning surface from opaque to informative.
3. **Mark "REGARDLESS" as dangerous**: Red background, warning icon, or confirmation prompt. The player is ordering attacks into predicted defeat. That should FEEL different from clicking "ACCEPT COSTLY."
4. **Add group-level descriptions**: Under each ParamGroup label, add a one-line question: TYPE → "What kind of operation?" / TEMPO → "How fast? Faster = more casualties" / TOLERANCE → "When do brigades stop attacking?"
5. **Fix tolerance default labeling**: Either rename "ACCEPT COSTLY" to something less alarming (e.g., "ACCEPT LOSSES" or "BALANCED RISK"), or add a subtitle: "Attack when roughly matched (≥1.0)".
6. **Show aggregated plan summary**: Above the "G2 Assessment →" button, show: X brigades / Y objectives / Z estimated prep turns / staging area name.
7. **Add axis management**: Even if initially just "Main Axis + Supporting Axis," a simple tab strip above the brigade tray.
8. **Make brigade tray 2-row**: Instead of horizontal scroll, use a 2-row wrapping layout with assignment counter.
9. **Staging area feedback**: When a friendly OSID is clicked, show a green pin/flag on map + "Staging: [name]" in objectives panel.

---

## 16. PHASE 3: G-2 ASSESSMENT (Source Review)

*Could not reach this phase through UI interaction due to P1/P10. Analysis based on source code review of `G2Phase.tsx`, `NarrativeTab.tsx`, `RawIntelTab.tsx`.*

### 16.1 Design Analysis

The G-2 phase presents as a **clipboard document** — a cream-colored paper panel (360px wide) sliding in from the right, with a decorative binder clip at the top. Two sub-tabs: Assessment and Raw Intel.

**Assessment tab** (`NarrativeTab.tsx`):
- Military document format with faction army headers (REPUBLIKA SRPSKA / VOJSKA REPUBLIKE SRPSKE)
- "OGRANIČENO" (RESTRICTED) classified stamp rotated -12° in red — excellent immersion
- Sections: 1. NEPRIJATELJ (Enemy), 2. VLASTITE SNAGE (Own Forces), 3. PROCJENA (Assessment)
- Shows force ratio, intel confidence %, estimated casualties, predicted outcome, recommended action
- Commander assessment sections if available from prediction engine
- Courier New monospace font throughout — typewriter aesthetic

**Raw Intel tab** (`RawIntelTab.tsx`):
- Quantitative data tables with the raw prediction numbers

**Action button at bottom**:
- Normal: "Proceed to Authorization →" (gold)
- Low intel (<40% confidence): "Proceed Despite Low Intel →" (amber warning color)

### 16.2 What Works (from source)

- **Immersion is outstanding**: The clipboard metaphor with binder clip, cream paper texture (SVG pattern), classified stamp, Courier New font, Bosnian/Croatian/Serbian military headers — this is production-quality flavor.
- **Low intel warning is smart UX**: When intel confidence < 40%, the advance button turns amber with warning text. Communicates risk without blocking.
- **Loading state**: Skeleton shimmer bars while prediction loads. Professional touch.
- **Two-tab structure**: Assessment (narrative) vs Raw Intel (numbers) serves both immersion and power-user needs.

### 16.3 Problems Found (from source)

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| G1 | **360px width is narrow** | 🟡 Major | The clipboard panel is 360px on a 2294px viewport — 15.7% width usage. The map behind it is dimmed anyway. The clipboard could be wider (480-540px) for better readability. |
| G2 | **No map context visible** | 🟡 Major | Phase 3 shows only the clipboard on the right. The map behind is still visible but not interactive. The player loses visual context of what territory they're attacking. A persistent mini-plan summary on the left would help. |
| G3 | **No way to go BACK to Plan from here** | 🟠 Minor | The phase stepper allows backtracking (click earlier phase dot), but there's no visible "← Back to Plan" button. Only the stepper dots, which are 2.5px wide and easy to miss. |
| G4 | **"Awaiting G2 prediction data..." may hang** | 🟠 Minor | If the `usePrediction` hook fails silently, the user sees this message indefinitely. There's an error state, but the "has objectives but no prediction" state could use a timeout or retry button. |

---

## 17. PHASE 4: AUTHORIZE (Source Review)

*Could not reach through UI. Analysis based on `AuthorizePhase.tsx` and `OpordDocument.tsx`.*

### 17.1 Design Analysis

The Authorize phase is the **dramatic climax** of the modal. It presents:

1. **OPORD Document** — a cream-paper formal Operations Order (max 600px wide, centered):
   - Faction army crest emoji (⚜ RBiH / 🦅 RS / 🛡 HRHB)
   - Republic + army name in 8px uppercase tracking
   - Operation order number: "OPERATIVNA ZAPOVIJED br. OZ/19930106/01"
   - Sections: 1. ZADAĆA (Mission), 2. SITUACIJA (Situation), etc.
   - All in Courier New monospace — typewriter/military order aesthetic

2. **Stamp animation**: When authorized, a green "ODOBRENO" (APPROVED) stamp appears rotated -20°, 5xl text with border, 0.3s ease-out animation. Extremely satisfying.

3. **"ZAPOVIJED PROSLIJEĐENA" (Directive Transmitted)** message fades in after stamp.

4. **Action buttons**:
   - Normal: Green "ODOBRITI OPERACIJU" (Authorize Operation) with small "Authorize Operation" subtitle
   - Low intel: Amber "NAREDITI IZVIĐANJE" (Order Probe) as primary + muted "Authorize Anyway" as secondary
   - Probe option auto-generates a probe variant (first 3 brigades, first objective only, 'repulsed' threshold)

5. **IPC submission**: Sends `CorpsOperationOrderPayload` via Electron IPC, assigns commander, sets target OSIDs, then auto-closes after 1s delay.

### 17.2 What Works (from source)

- **The OPORD document is the crown jewel of the entire UI.** It's the single most immersive, atmosphere-defining element in the game. Bosnian military terminology, formal order structure, typewriter font, cream paper — this is what makes the game feel real.
- **The stamp animation is a genius touch.** "ODOBRENO" slamming onto the page makes the authorization FEEL consequential. The player isn't clicking a submit button — they're stamping a military order.
- **"ZAPOVIJED PROSLIJEĐENA" in Bosnian** — not English. The player is IN the war room, not observing it.
- **Probe option on low intel is excellent game design**: Instead of just "do it or don't," the game offers a tactically meaningful alternative. This is what makes it a wargame and not just a strategy game.
- **Dim overlay (bg-black/40)** focuses attention on the OPORD document.

### 17.3 Problems Found (from source)

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| A1 | **OPORD at 600px max on 2294px viewport** | 🟡 Major | The document uses 26% of screen width. The rest is dimmed map. It works aesthetically (document-on-desk feeling) but wastes enormous space. |
| A2 | **No final summary of what's being authorized** | 🟡 Major | The OPORD document shows mission/situation sections, but based on the source it builds from `plan.axes.flatMap(objectives)` and `flatMap(brigadeIds)`. If the sections are sparse (no prediction data), the player authorizes a thin document. |
| A3 | **1500ms artificial delay** | 🟠 Minor | `await new Promise(r => setTimeout(r, 1500))` between stamp and IPC submission. Good for dramatic effect, but combined with the 1000ms auto-close delay, it's 2.5 seconds of non-interactive waiting. Should be skippable via click. |
| A4 | **No way to cancel after seeing the OPORD** | 🟠 Minor | Once in Phase 4, you can go back via phase stepper dots but there's no visible "← Return to Assessment" or "Cancel Operation" button. |
| A5 | **Error handling is toast-only** | 🟠 Minor | `setLoadError()` on IPC failure goes to a generic error state. No retry option. If the operation fails to stage, the modal closes and the player doesn't know what happened. |

---

## 18. CROSS-PHASE ISSUES

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| X1 | **Phase stepper dots are 2.5px** | 🟡 Major | The phase navigation dots are tiny. On a 2294px viewport, they're barely visible. Increasing to 6-8px with clearer labels would make backtracking discoverable. |
| X2 | **No ESC confirmation** | 🟠 Minor | ESC immediately closes the modal and discards all planning. No "Are you sure? You'll lose your operation plan" confirmation. |
| X3 | **Modal has no transition animation** | 🟠 Minor | The modal appears/disappears instantly (conditional render). A fade-in or slide-up would feel more polished. |
| X4 | **Close button (✕) is 8px** | 🟠 Minor | Top-right, blends into the map. Should be larger and more visible. |
| X5 | **OpsMap renders 3 MapLibre canvases** | 🟠 Perf | JavaScript found 3 map canvases when the modal is open (main map + ops map + minimap). The main map and minimap should be hidden/suspended when the modal is active to save GPU. |
| X6 | **No progress persistence** | 🟡 Major | If the player accidentally closes the modal (ESC, ✕, or misclick outside), all plan state is lost. No draft/resume capability. |

---

## 19. OPS MODAL — THE GOOD, THE BAD, THE VISION

### What's Already Great
The ops planning modal is **the most immersive UI in the game** and arguably the most immersive operation-planning interface in any wargame. The Bosnian military terminology, the OPORD document format, the classified stamp, the officer personality system, the tolerance ladder — these are design decisions that a AAA studio would be proud of. The 4-phase wizard flow (Commander → Plan → G-2 → Authorize) mirrors real military planning doctrine.

### What's Broken
Two critical bugs block the entire flow:
1. **Commander card clicks don't register** via mouse (only programmatic `.click()` works)
2. **Map clicks to add objectives don't register** (making Phases 3-4 unreachable)

These are likely the same root cause: `pointer-events-none` on container divs blocking event propagation to `pointer-events-auto` children, possibly compounded by the MapLibre canvas sitting between the click target and the React handlers.

### The Vision: What This Should Become

The ops planning modal is 80% of the way to being a **defining feature** of the game. To get to 100%:

1. **Fix the two critical click bugs** — this is prerequisite for everything else
2. **Commander selection → comparison view**: Don't auto-advance on click. Let the player select, see a side-panel preview of what this commander means for the op, then confirm.
3. **Plan phase → split-screen**: Map on left (60%), plan details on right (40%). Show objectives list, brigade assignments, staging area, and parameters all visible simultaneously. Kill the horizontal scroll brigade tray — use a grid.
4. **G-2 phase → full war-room briefing**: Show the clipboard on the right and a tactical overview on the left (zoomed to AO, with friendly/enemy unit positions, supply lines, terrain). The player should see the battlefield they're about to commit forces to.
5. **Authorize phase → add a "read the order aloud" moment**: After stamping ODOBRENO, briefly show the key parameters one last time (objective, forces committed, expected outcome). Make the player sit with the weight of what they just ordered.
6. **Multi-axis unlocked**: The `AxisState[]` system already supports it. Add a simple axis tab strip: "Main Effort | Supporting Attack | +Add Axis". Each axis gets its own objectives and brigade assignments. This is what separates a wargame from a strategy game.
7. **Draft persistence**: Auto-save plan state to localStorage so accidental closes don't lose work.

---

## 20. COMPREHENSIVE BUG LIST (Updated)

| # | Location | Bug | Severity |
|---|----------|-----|----------|
| B1 | Records > Codex | Sub-tab shows AAR content instead of Codex | 🟡 |
| B2 | Records > AAR | Faction Pulse / Displacement identical on both sub-tabs | 🟡 |
| B3 | Corps sidebar | Sector label click target doesn't match visible text | 🟠 |
| B4 | Summary > Casualties | Shows IVP data (duplication from IVP sub-tab) | 🟠 |
| B5 | Ops Modal > Commander | **Card clicks don't register via mouse** | 🔴 |
| B6 | Ops Modal > Plan | **Map clicks to add objectives don't register** | 🔴 |
| B7 | Ops Modal > Plan | Empty officer cards (no name) shown in grid | 🟠 |
| B8 | Ops Modal > Plan | Right-column card text clipped on wide viewports | 🟡 |
| B9 | Ops Modal | ✕ close button nearly invisible (8px, no contrast) | 🟠 |
| B10 | Ops Modal | ESC closes without confirmation, losing all plan state | 🟠 |

---

## 21. PRIORITY-RANKED IMPLEMENTATION ORDER (Updated)

### Tier 0 — Must Fix (Blocking)
1. **B5 + B6: Fix pointer-events click propagation** in OpsPlanningModal. Both commander cards and map clicks are non-functional via mouse. This renders the entire ops planning flow unusable.
2. **P2: Add tooltips/descriptions to all 15 parameter pills** in PlanParameters.tsx. The most important decision surface in the game has zero explanation of what any button does. At minimum: `title` attributes. Ideal: inline subtitles.

### Tier 1 — High Impact, Low Effort
3. **Mark "REGARDLESS" as dangerous** — red treatment, distinct from other tolerance pills
4. **Add ParamGroup descriptions** — one-line question under each group label
5. Commander comparison view (select → preview → confirm)
6. Phase stepper dots: 2.5px → 8px, add clickable labels
7. Close button: 8px → 24px, add high-contrast background
8. ESC confirmation dialog
9. Brigade tray count badge + scroll indicator ("3 of 13 assigned")

### Tier 2 — High Impact, Medium Effort
10. Plan phase split-screen layout (map left, details right)
11. G-2 clipboard: 360px → 480px with tactical map context on left
12. OPORD document width increase or zoom-to-fill
13. Staging area and schwerpunkt visual indicators on map
14. Plan summary before G-2 advance
15. Fix tolerance default label ("ACCEPT COSTLY" → clearer name or subtitle)

### Tier 3 — Polish
16. Modal open/close transitions
17. Multi-axis UI (tab strip)
18. Draft auto-save to localStorage
19. Phase transition animations
20. Skip button for 2.5s authorize animation
21. ARTY PREP tooltip showing supply cost + combat effect + availability

---

*The ops planning modal is the beating heart of player agency in AWWV. When the click bugs are fixed, it will be the single most impressive screen in the game. The OPORD document with "ODOBRENO" stamp is a masterpiece. Everything else is optimization around that core moment.*

*— UI/UX Developer (Pyrrhic), 25 March 2026*

---

# PART IV: CRITICAL RE-EXAMINATION — Ops Modal Deep Dive

*The initial audit was too generous. This section applies the same rigor used on the parameter strip to EVERY remaining ops modal element.*

---

## 22. BRIGADE CARDS — Opaque Combat Power

The brigade tray is the player's tool for choosing which units to commit. Each card shows:

```
┌──────────────────┐
│ 94th Brigade     │
│ 1,500            │  ← personnel count (18px bold)
│ A:1              │  ← attack rating??
│ ████████░░       │  ← cohesion bar (no label on hover)
│ COH 40    FAT 1  │  ← 7px text, barely legible
│ —                │  ← march turns (null = "—")
└──────────────────┘
```

### 22.1 Problems

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| BC1 | **"A:1" is meaningless** | 🔴 CRITICAL | Every single HRHB brigade shows "A:1". What is "A"? Attack rating? Attack power? Armor? The source shows it's `brigade.composition?.artillery ?? 0` — so "A:1" means **1 artillery piece**. But it LOOKS like "Attack: 1" which would mean the brigade is nearly useless. The label actively misleads. Should be "ART: 1" or "🎯 1" or spelled out. |
| BC2 | **"T:" only shows when tanks > 0** | 🟡 Major | Tanks and artillery labels use "T:" and "A:" — identical single-letter format for completely different things. "T:31 A:30" reads as two versions of the same stat. And when a brigade has no tanks, the T: disappears entirely rather than showing "T:0", leaving just "A:1" alone — which looks even MORE like an attack rating. |
| BC3 | **"COH 40" and "FAT 1" at 7px** | 🟡 Major | Cohesion and fatigue are critical combat stats. They're rendered at 7px (`text-[7px]`) in `text-text-secondary/50` — that's 50% opacity on an already secondary color. Effectively invisible. The colored bar above helps, but the bar has no labels, no tooltip, no scale reference. Is COH 40 good or bad? The color says amber (40-70 = amber), but amber means what? |
| BC4 | **No tooltip on any card element** | 🟡 Major | Zero `title` attributes on the entire BrigadeCard component. No hover state shows expanded info. Personnel, equipment, cohesion, fatigue, march time — none explain themselves. |
| BC5 | **March time shows "—" for most brigades** | 🟠 Minor | `marchTurns === null || marchTurns === 99` renders as "—". On initial display before objectives are set, ALL brigades show "—" because there's no staging OSID to compute distance from. The field is useless until objectives exist. |
| BC6 | **No brigade type indicator** | 🟠 Minor | "94th Brigade" — is this infantry? Motorized? Mountain? The name sometimes hints ("7th Krajina Motorized") but most are just "Xth Brigade". The `FormationView` type surely has this info but the card doesn't show it. |
| BC7 | **Fixed 160×140px cards waste vertical space** | 🟠 Minor | Each card is 140px tall but the content only fills ~100px. The bottom 40px is empty space below the march time text. |

### 22.2 What "A:1" Should Look Like

Instead of the cryptic single-letter format:
```
Current:   T:31  A:30
Should be: 🔩 31 tanks  ·  🎯 30 artillery
Or:        TANKS 31  ·  ARTY 30
Or at minimum: T:31  ART:30
```

---

## 23. OPSMAP — Beautiful But Unguided

The OpsMap (source: `OpsMap.tsx`, 660 lines) is technically impressive — 3D terrain with terrain exaggeration, Deck.gl animated advance arrows, dimmed non-selectable OSIDs, terrain hover tooltips showing elevation/slope/defense bonus. But:

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| OM1 | **No visual legend** | 🔴 CRITICAL | The map uses color to distinguish friendly territory (white highlight), enemy territory (red tint), valid targets (dashed red border), selected objectives (dark red fill), and staging area (green fill). NONE of these colors are explained anywhere. No legend, no key, no help text. The player must intuit what every color means. |
| OM2 | **"selectable" / "out of range" labels only on hover** | 🟡 Major | The terrain tooltip says "selectable" (green) or "out of range" (red) — but only when hovering over a specific OSID. There's no way to see the full picture of what's selectable vs not at a glance, except via the 45% opacity black dimming layer (which is subtle). |
| OM3 | **Front line distinction unclear** | 🟡 Major | Corps-specific front line is highlighted in gold (rgba(255,220,120,0.8)), while other fronts are dark (rgba(0,0,0,0.65)). Good distinction, but the gold glow (16px width, 10px blur) bleeds into surrounding territory, making it hard to tell exactly where the front IS. |
| OM4 | **3D terrain exaggeration of 2.5** | 🟠 Minor | `map.setTerrain({ source: 'terrain-dem', exaggeration: 2.5 })` — the terrain looks dramatic but at 30° pitch it distorts polygon positions. Clicking on what looks like a flat valley may hit a mountain polygon behind it due to perspective. |
| OM5 | **No unit positions shown** | 🟡 Major | The brigade tray shows WHICH brigades exist, but the map doesn't show WHERE they are. The player assigns brigades to an objective without knowing if they're already nearby or on the other side of the map. The march time on the card helps, but only after objectives are set — and only as a number, not a visual. |
| OM6 | **Camera center/bearing hardcoded** | 🟠 Minor | `center: [17.7, 43.87]` and `bearing: 0` — the map initializes pointing north at a central Bosnia location, then `fitBounds` adjusts. But the fitBounds uses `padding: 80` which wastes 80px of an already space-constrained view. |

---

## 24. OBJECTIVE LIST — Functional But Disconnected

The ObjectiveList panel (280px, top-right) has proper micro-interactions: reorder (↑↓), remove (×), schwerpunkt star toggle (★). But:

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| OL1 | **Schwerpunkt star has no label** | 🟡 Major | A gold ★ appears next to the first objective. Hovering shows `title="Main effort"` (one of the very few tooltips in the entire UI!). But there's no visual cue that clicking the star on a DIFFERENT objective changes the main effort. The ★ on non-schwerpunkt objectives is at 20% opacity — nearly invisible. |
| OL2 | **Reorder/remove controls hidden until hover** | 🟠 Minor | ↑↓× only appear on `group-hover`. On touch devices, these are completely inaccessible. |
| OL3 | **No terrain/defense info per objective** | 🟡 Major | Each objective shows just the settlement name. No indication of enemy strength, terrain difficulty, or distance. The player picks objectives blind — the terrain tooltip on the MAP shows this info, but it's not carried into the objective list. |
| OL4 | **"Request G2 Assessment →" button placement** | 🟠 Minor | The advance button is inside the ObjectiveList panel, not in the main flow. If the ObjectiveList panel is small or scrolled, the button may be below the fold. It should be a persistent bottom-bar element. |

---

## 25. G-2 PHASE — Clipboard Aesthetic vs Information Design

Re-examining the G2 phase source with critical eyes:

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| G5 | **Clipboard paper texture is beautiful but hurts readability** | 🟡 Major | The cream background (#f0e8d8) with SVG dot pattern + Courier New monospace + 10px text size + #4a4238 color (dark brown on cream) — it looks authentic but the contrast ratio is poor. WCAG AA requires 4.5:1 for normal text. #4a4238 on #f0e8d8 is approximately 3.5:1 — **fails AA**. |
| G6 | **"OGRANIČENO" stamp obscures content** | 🟠 Minor | The classified stamp is positioned `absolute top-4 right-4 rotate-[-12deg]` at 20% opacity. If the assessment text is long, the stamp overlaps readable content. Flavor vs function tradeoff — flavor wins here but at a readability cost. |
| G7 | **Raw Intel tab abbreviations unexplained** | 🟡 Major | "FR: 1.23" (force ratio), "Def: 4,500" (defense strength) — Raw Intel tab uses abbreviations with no headers. A player who doesn't know military terminology won't understand "FR" or why "Def" matters. |
| G8 | **Commander recommendation has no explanation** | 🟡 Major | Green dot + "Commander recommends: LAUNCH" — but WHY? The recommendation is a single word with no reasoning. If the commander says "postpone," the player doesn't know if it's because of terrain, force ratio, supply, or weather. |

---

## 26. AUTHORIZE PHASE — The Stamp Moment vs the Blindfold

Re-examining AuthorizePhase.tsx:

| # | Issue | Severity | Detail |
|---|-------|----------|--------|
| AU1 | **Player authorizes without seeing brigade positions** | 🔴 CRITICAL | The OPORD document lists brigade IDs and objectives but the map behind is dimmed to 40% opacity. The player stamps "ODOBRENO" without a clear final view of the operational picture. The stamp animation is dramatic but the player is signing a document they can barely visualize. |
| AU2 | **Probe option auto-selects 3 brigades and 1 objective** | 🟡 Major | `handleProbe()` takes `allBrigades.slice(0, 3)` and `allObjs.slice(0, 1)`. This is hardcoded — the player doesn't choose WHICH 3 brigades or WHICH objective for the probe. Auto-selection might pick the weakest 3 or the hardest objective. |
| AU3 | **"NAREDITI IZVIĐANJE" / "ODOBRITI OPERACIJU" in B/C/S only** | 🟠 Minor | The button text is in Bosnian/Croatian/Serbian with tiny English subtitle below. Great immersion, but new players see "NAREDITI IZVIĐANJE" and must read 8px subtitle "Order Probe" to understand. The subtitle should be larger, or both languages should be equal weight. |
| AU4 | **No final cost/risk summary** | 🟡 Major | Before authorizing, the player should see: "This operation commits X brigades (Y personnel) against Z objectives. Estimated casualties: W. Estimated duration: V turns. Supply cost: U." Currently, the OPORD document has SOME of this, but it's in a formal document format where numbers are buried in prose. |

---

# PART V: CRITICAL RE-EXAMINATION — Full UI

*Applying the same "zero tolerance for unexplained elements" standard to every screen audited in Parts I and II.*

---

## 27. THE TOOLTIP CRISIS — App-Wide

### 27.1 The Numbers

| Metric | Value |
|--------|-------|
| Total buttons in DOM | **131** |
| Buttons with `title` or `aria-label` | **7** (5.3%) |
| Buttons without any tooltip | **124** (94.7%) |
| Buttons with titles | 3 MapLibre defaults (zoom/north) + 4 faction HQ buttons |

**94.7% of all interactive elements have zero tooltip.** This isn't a polish issue — it's a fundamental information design failure. The UI presents dozens of military concepts, abbreviations, and statistics without explaining any of them.

### 27.2 What Has No Tooltip — Categorized

**Navigation/System (should have tooltips)**:
- CHRONICLE, ADVANCE TURN →, LOAD, LATEST, SYNC, SAVE
- POLITICAL, ETHNIC, SUPPLY, OPERATIONS, +MORE, LAYERS
- DEV badge, turn indicator

**Status Bar (critical — player reads these every turn)**:
- "RS 62.1%" — 62.1% of WHAT? Territory? Population? The player is told a number with no context.
- "RBiH 24.3%" — same problem
- "HRHB 13.6%" — same problem
- "BELGRADE: SUPPORTIVE" — what does "supportive" mean mechanically? More supply? More volunteers? The word conveys sentiment but not game impact.
- "9 ops" — 9 operations running? 9 operations available? 9 operations completed?
- The colored progress bars (red/green/amber) between percentages — no labels at all

**Sidebar Sector List (player's primary command surface)**:
- "CRITICAL" badge — critical by what criteria? Density? Morale? Under attack?
- "Density: 0.50" — density of what? Brigades per km of front? The number is meaningless without a scale. Is 0.50 good or bad?
- "~14 km" — front length? Sector depth? Distance to enemy?
- "7 assigned + 1 reserve" — assigned to what? Reserve from what? The terminology assumes military knowledge.

**Command Briefing Cards (the first thing the player sees each turn)**:
- "Operacija Hrast losing momentum" — what IS momentum? How is it measured? What should the player DO?
- "International pressure at 31%" — 31% of what threshold? When does this trigger consequences?
- "1st Krajina Corps at 35% cohesion" — same as density: is 35% bad? Fatal? The word "CRITICAL" doesn't appear here but maybe it should.
- "Herzegovina Corps – Nevesinje, Konjic needs attention" — needs attention HOW? More brigades? Supply? The card says "OPEN SECTOR" underneath but that's an action, not an explanation.

### 27.3 The Fix: Tooltip Standards

Every interactive element needs at minimum a `title` attribute. For complex concepts, a hover tooltip component showing 1-2 sentences. Priority:

| Priority | Element Category | Count | Effort |
|----------|-----------------|-------|--------|
| P0 | Ops modal parameter pills | 15 | 30 min |
| P0 | Status bar items | ~12 | 1 hour |
| P1 | Sidebar sector metrics (CRITICAL, Density, front length) | ~40 | 2 hours |
| P1 | Command Briefing cards | 4 | 1 hour |
| P2 | Map mode buttons | 6 | 30 min |
| P2 | Navigation buttons | 8 | 30 min |
| P3 | Brigade cards in ops modal | ~8 fields per card | 2 hours |
| P3 | Army HQ modal elements | ~30 | 3 hours |

Total: ~10-12 hours of work to go from 5.3% to ~90% tooltip coverage.

---

## 28. THE ABBREVIATION CRISIS — App-Wide

The UI uses unexplained abbreviations everywhere:

| Abbreviation | Appears In | Meaning | Player Knows? |
|---|---|---|---|
| COH | Brigade cards | Cohesion | Maybe |
| FAT | Brigade cards | Fatigue | Maybe |
| A: | Brigade cards | Artillery count | NO — looks like "Attack" |
| T: | Brigade cards | Tank count | Probably |
| IVP | Army HQ Summary tab | International Pressure (?) | NO |
| OPSEC | Sector Intelligence | Operational Security status | Maybe |
| FR: | Raw Intel tab | Force Ratio | NO |
| Def: | Raw Intel tab | Defense Strength | Maybe |
| G-2 | Ops modal phase | Intelligence section | Only if military-trained |
| OPORD | Authorize phase | Operations Order | Only if military-trained |
| OZ | Sidebar | Operational Zone | NO |
| AoR | Various | Area of Responsibility | Only if military-trained |

**Rule**: Any abbreviation shorter than 4 characters that isn't universally understood needs either (a) a tooltip, (b) an inline expansion on first appearance, or (c) replacement with the full word.

---

## 29. THE "CRITICAL" EPIDEMIC

Every single sector in the sidebar shows a red "CRITICAL" badge. When EVERYTHING is critical, NOTHING is critical. The badge has lost all meaning.

**Root cause**: The classification thresholds are likely too aggressive. If "CRITICAL" means "density < 1.0 brigades/km" then every sector with a thin front is CRITICAL — which is most of them in a war of attrition.

**Fix options**:
1. Raise the CRITICAL threshold so fewer sectors qualify — maybe only <0.25 density
2. Add intermediate states: STRAINED (0.25-0.50), THIN (0.50-0.75), ADEQUATE (0.75+), STRONG (1.0+)
3. Use relative ranking: worst 20% of sectors get CRITICAL, next 30% get WARNING, rest get STABLE
4. At minimum: add a color-coded density bar next to the badge so the player can see relative severity

---

## 30. THE BLANK SPACE INDICTMENT — Revisited With Sharper Eyes

The Part I audit identified blank space as the #1 problem. The Part II "10x" vision proposed solutions. But re-examining with critical eyes, the REAL problem is worse than blank space — it's **information fragmentation**.

**The player's decision loop every turn**:
1. What happened? → Command Briefing cards (4 items on a strip)
2. Where's the front? → Map (click, scroll, zoom)
3. How are my corps? → Sidebar (scroll through 20+ sectors)
4. What's my overall position? → Army HQ → Summary → Overview (3 nested levels)
5. Should I launch an operation? → Click sector → Sector Intelligence → Operations tab → "Draft New Directive" → 4-phase modal
6. What are my options? → ??? (no strategic advisor, no recommendations, no "suggested next moves")

**Steps 1-5 require 6+ clicks, 3 different panels, and 2 modal layers to get from "what happened" to "what should I do."** Every step requires the player to CLOSE the previous view to open the next. There's no persistent overview that shows the war at a glance.

**The fix isn't wider panels or fewer tabs — it's a persistent strategic dashboard** that shows: current front status, top 3 threats, top 3 opportunities, running operations, resource burn rate. The existing Command Briefing cards are the embryo of this, but they're a narrow horizontal strip showing 4 items, not a war room dashboard.

---

## 31. REVISED COMPREHENSIVE BUG LIST

| # | Location | Bug | Severity |
|---|----------|-----|----------|
| B1 | Records > Codex | Sub-tab shows AAR content instead of Codex | 🟡 |
| B2 | Records > AAR | Faction Pulse / Displacement identical on both sub-tabs | 🟡 |
| B3 | Corps sidebar | Sector label click target doesn't match visible text | 🟠 |
| B4 | Summary > Casualties | Shows IVP data (duplication from IVP sub-tab) | 🟠 |
| B5 | Ops Modal > Commander | **Card clicks don't register via mouse** | 🔴 |
| B6 | Ops Modal > Plan | **Map clicks to add objectives don't register** | 🔴 |
| B7 | Ops Modal > Commander | Empty officer cards (no name) shown in grid | 🟠 |
| B8 | Ops Modal > Commander | Right-column card text clipped on wide viewports | 🟡 |
| B9 | Ops Modal | ✕ close button nearly invisible (8px, no contrast) | 🟠 |
| B10 | Ops Modal | ESC closes without confirmation, losing all plan state | 🟠 |
| B11 | **ENTIRE APP** | **124 of 131 buttons (94.7%) have no tooltip** | 🔴 |
| B12 | Ops Modal > Brigade Cards | "A:1" means artillery but reads as attack rating | 🔴 |
| B13 | Ops Modal > Plan | 15 parameter pills with zero explanation | 🔴 |
| B14 | Status Bar | "RS 62.1%" unexplained — 62.1% of what? | 🟡 |
| B15 | Status Bar | "BELGRADE: SUPPORTIVE" — no mechanical explanation | 🟡 |
| B16 | Status Bar | Colored progress bars have no labels | 🟡 |
| B17 | Sidebar | Every sector shows CRITICAL — badge is meaningless | 🟡 |
| B18 | Sidebar | "Density: 0.50" — no scale, no good/bad indication | 🟡 |
| B19 | Ops Modal > OpsMap | No color legend for territory/target/staging colors | 🟡 |
| B20 | Ops Modal > OpsMap | No unit position indicators on map | 🟡 |
| B21 | G-2 Phase | Cream paper text fails WCAG AA contrast (est. 3.5:1) | 🟡 |
| B22 | Authorize Phase | Player stamps order without clear operational picture | 🟡 |
| B23 | Authorize Phase | Probe auto-selects brigades/objective without player input | 🟡 |

---

## 32. FINAL PRIORITY-RANKED IMPLEMENTATION ORDER

### Tier 0 — Must Fix Before Any Playtesting
1. **B5 + B6**: Fix pointer-events click propagation in OpsPlanningModal
2. **B11**: App-wide tooltip pass — add `title` to all 124 untitled buttons (10-12 hours)
3. **B12 + B13**: Fix "A:1" label (→ "ART:1") + add tooltips/subtitles to all 15 parameter pills
4. **B17**: Fix CRITICAL badge — add severity tiers or relative ranking

### Tier 1 — High Impact, Required For Player Comprehension
5. Status bar tooltips: explain RS %, BELGRADE, progress bars, ops count
6. Sidebar metric tooltips: explain Density scale, front length, assignment counts
7. Command Briefing card tooltips: explain what each alert means + suggested action
8. Brigade card overhaul: expand abbreviations, add type indicator, larger COH/FAT
9. OpsMap legend: color key for territory types
10. "REGARDLESS" tolerance → red danger treatment

### Tier 2 — High Impact, Medium Effort
11. Commander selection → comparison view before committing
12. Phase stepper: 2.5px → 8px dots, add clickable labels
13. Plan phase split-screen (map left, details right)
14. G-2 clipboard → improve contrast ratio to WCAG AA
15. Authorize phase → show clear operational picture before stamp
16. Persistent strategic dashboard (embryo: expand Command Briefing)

### Tier 3 — Polish & Enhancement
17. Multi-axis UI (tab strip)
18. Unit positions on OpsMap
19. Per-objective terrain/defense info in ObjectiveList
20. Brigade tray → 2-row grid with assignment counter
21. Draft auto-save to localStorage
22. ESC confirmation dialog
23. Modal transitions
24. Probe customization (choose which brigades/objective)

---

## 33. EXECUTIVE SUMMARY — REVISED

The UI has two distinct quality tiers:

**Tier A — Immersive masterwork** (5% of the UI):
- OPORD document with "ODOBRENO" stamp
- Bosnian/Croatian/Serbian military terminology
- G-2 clipboard with classified stamp
- Officer personality system
- Operation name generation

**Tier B — Developer dashboard with zero user guidance** (95% of the UI):
- 94.7% of buttons have no tooltip
- Every abbreviation is unexplained
- Every status bar number lacks context
- Every sector badge says CRITICAL
- The most important decision surface (operation parameters) has 14 unlabeled buttons
- Brigade cards use misleading single-letter abbreviations

The gap between Tier A and Tier B is the core UX problem. The game has world-class immersion design trapped inside an interface that only its developer can read. **The fix is not more features — it's explaining the features that already exist.** A 12-hour tooltip/label pass would do more for playability than any new panel or modal.

---

*The OPORD stamp is a masterpiece. The rest of the UI is a briefing that forgot to include the briefing.*

*— UI/UX Developer (Pyrrhic), 25 March 2026*
