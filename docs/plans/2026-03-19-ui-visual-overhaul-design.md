# UI Visual Overhaul — Design Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade the tactical map UI from functional-but-flat to visually rich and tactile, borrowing proven patterns from HoI4, Unity of Command 2, EU4, and AGEOD — without reinventing anything.

**Guiding principle:** "Dark Frame, Paper Content" — the command interface (sidebar, controls, bottom bar) stays dark. Documents and reports (events, OPORDs, battle results, officer dossiers) get the cream-paper treatment already established in the ops modal. Icons replace text labels everywhere.

**Current state:** The UI is more capable than it looks. Rich tooltips already exist (unit hover shows cohesion bar, personnel, posture, corps, orders). The ops modal is the visual gold standard (clipboard, OPORD, ODOBRENO stamp). The gap is the SIDEBAR and PANELS, which are text-heavy data dumps.

---

## Design Philosophy

### What we borrow and from whom

| Pattern | Source Game | Where in AWWV | Why |
|---------|------------|---------------|-----|
| Icons replace text for stats | HoI4 | Sidebar, panels, bottom strip | Single highest-impact visual change |
| Micro-indicators on map counters | UoC2, Panzer Corps 2 | Formation markers | Instant unit status without hovering |
| Fold-out card from map counter | UoC2, Civ VI | Unit quick-inspect | Tactile, reduces right-panel dependency |
| Enriched persistent strip | HoI4, Stellaris | Bottom status strip | Strategic awareness always visible |
| Operation status on map units | HoI4 | Formation markers | Operation health visible at a glance |
| Card-vs-card battle preview | UoC2, Total War | Attack planning/preview | Physical card metaphor for key decisions |
| Paper for documents only | AGEOD (lesson: not too much) | Events, AARs, officer dossiers | Already established in ops modal |
| Rubber stamps as accents | AGEOD | Status badges | Extends ODOBRENO pattern |

### What we DON'T do

- No paper in the sidebar (AGEOD proves it hurts readability)
- No redesign of tooltips (already HoI4-level quality)
- No redesign of map counters core shape (NATO symbols are authentic and working)
- No text on generated images (UI overlays titles)
- No emoji anywhere — SVG icons or nothing

---

## Phase 1: Icon Language (P0 — Foundation)

**The single highest-impact change.** Every text label "Personnel: 3,000" becomes "soldier-icon 3,000". Every "Cohesion: 64%" becomes a filled bar with a shield icon. HoI4 proves players learn icon language in minutes.

### 1.1 Define the icon set

20-25 monochrome SVG icons at 16px and 24px, matching accent-gold (#c4a35a) on dark backgrounds, dark (#3a3228) on paper backgrounds. Simple flat silhouettes — military iconography, not decorative art.

**Stat icons (12):**
| Icon | Represents | Used In |
|------|-----------|---------|
| Soldier silhouette | Personnel | Sidebar, panel, tooltip, bottom strip |
| Shield | Cohesion | Sidebar, panel, tooltip |
| Flame/heart | Morale | Panel, tooltip |
| Lightning bolt | Fatigue | Sidebar, panel |
| Supply crate | Supply state | Sidebar, panel, bottom strip |
| Shovel/trench | Entrenchment | Panel |
| Tank silhouette | Tanks (operational) | Panel, corps detail |
| Crossed cannons | Artillery | Panel, corps detail |
| AA gun | Air defense | Panel |
| Skull/cross | Casualties (KIA) | Panel record tab |
| Bandage | Casualties (WIA) | Panel record tab |
| Star | Decoration/prestige | Sidebar, panel |

**Action/status icons (10):**
| Icon | Represents | Used In |
|------|-----------|---------|
| Sword pointing right | Offensive stance | Sidebar stance, map counter |
| Shield with chevron | Defensive stance | Sidebar stance, map counter |
| Balanced scales | Balanced stance | Sidebar stance |
| Wrench | Reorganize stance | Sidebar stance |
| Arrow (marching) | In transit / column march | Map counter, sidebar |
| Crosshairs | Active operation | Map counter |
| Exclamation triangle | Disrupted / critical | Map counter, sidebar |
| Home house | Home municipality | Tooltip (replaces ⌂ emoji) |
| Eye | Intel / recon | Fog, sector intel |
| Lock | Enclave locked | Officer panel |

**Faction crests** (already exist as .webp — keep as-is).

### 1.2 Implementation

- Create `src/ui/map/components/icons/` directory with one React component per icon (or a single `<Icon name="personnel" size={16} />` component)
- Each icon is an inline SVG (no external file loading, instant render)
- Color inherits from CSS `currentColor` so it adapts to dark/paper contexts
- Replace every raw text stat label in:
  - `BrigadeRow.tsx` — personnel, cohesion, fatigue, stance
  - `CorpsCard.tsx` — personnel total, brigade count, stance
  - `FormationDetail.tsx` — all stat grid items
  - `CorpsDetail.tsx` — all stat grid items
  - `BottomStatusStrip.tsx` — territory faction indicators

**Estimated: 2-3 sessions. No art assets needed — SVG paths drawn in code.**

---

## Phase 2: Map Counter Enrichment

**Add 3 micro-indicators to each unit counter on the map.** Proven by UoC2 — the map should tell you unit status at a glance.

### 2.1 Health micro-bar

2px-high bar at the BOTTOM of the counter. Color gradient: green (>70% cohesion) → amber (40-70%) → red (<40%). Width proportional to cohesion percentage. Draws inside the existing counter canvas.

### 2.2 Supply indicator dot

4px circle at TOP-RIGHT corner of counter. Green = adequate, amber = strained, red = critical/cutoff. Uses existing `getSupplyState()` derivation.

### 2.3 Orders indicator

Small icon at TOP-LEFT corner of counter:
- Sword icon (4px) if in active operation (attacking)
- Arrow icon if in column march
- Nothing if stationary/defending (default state)

### 2.4 Stack count badge

When 2+ units at same OSID: white circle with count number at bottom-right of topmost counter. Replaces the current fan-out for zoomed-out view (fan-out stays at tactical zoom).

**Implementation:** Modify `drawFormationIcon()` in `buildFormationsGeoJSON.ts` to add these 4 elements to the canvas-rendered counter image. No new layers needed — same marker, richer icon.

**Estimated: 1 session. No art assets needed.**

---

## Phase 3: Sidebar Visual Upgrade

**Keep dark. Add icons. Improve density and hierarchy.** The sidebar stays dark (#1c1a17) — no paper treatment.

### 3.1 Corps cards

Current: text rows (name, personnel count, commander, stance dropdown, ORBAT button).

Upgraded:
- **Left faction stripe** (4px, already exists on some cards) — consistent
- **Top row:** Corps name (bold) | soldier-icon + personnel | brigade-count badge
- **Commander row:** commander-icon + name (or "No Commander" muted)
- **Stance row:** Stance icon (sword/shield/scales/wrench) + dropdown — icon is visual, dropdown is interactive
- **Micro health bar** at bottom of card (same green→amber→red as map counter, represents average corps cohesion)

### 3.2 Brigade rows

Current: supply dot (●) + name + cohesion segments + fatigue + decoration stars.

Upgraded:
- **Left edge:** 3px stance-colored stripe (consistent with map counter)
- **Name:** Faction-colored, slightly smaller to make room
- **Right cluster:** `soldier-icon 2,400` | cohesion-bar (keep 5 segments, works well) | `fatigue-icon 12`
- **Status badge:** Replace text badges with small rubber-stamp-style labels (rotated 2°, slightly faded, uppercase) — "DISRUPTED" in red, "ON LOAN" in blue, "IN TRANSIT" in amber
- **Remove:** ● supply dot (replaced by corps-level supply indicator), decoration stars (move to panel only)

### 3.3 Operations section

Current: text list of active operations.

Upgraded: Each operation as a small **mission card**:
- Left edge colored by operation status (green=executing, amber=stalled, red=recovery)
- Operation name (bold)
- Phase badge (small pill: INTEL | STAGING | EXECUTING | RECOVERY)
- Brigade count + objective count (icon + number)

**Estimated: 2 sessions. Rubber stamp assets needed (8-10 small text stamps, can be CSS-generated).**

---

## Phase 4: Document Treatment for Panels

**Extend the ops modal's paper aesthetic to other information displays.**

### 4.1 Event modal upgrade

Current: GlassPanel with gradient placeholder and text.

Upgraded: Keep GlassPanel container (dark frame). Inside:
- **Dispatch paper** — cream (#f0e8d8) card with slight noise texture (same as OPORD)
- **Category stamp** — top-right corner, rotated rubber stamp in category color (MILITARY in olive, DIPLOMATIC in navy, HUMANITARIAN in amber)
- **Date line** — typewriter font, top of paper
- **Narrative** — Courier New on paper, like a field report
- **Decision buttons** — bottom of paper, each as a **wax-sealed choice** (colored circle + option text), not flat HTML buttons

### 4.2 Battle After-Action Report

Current: battle results shown in weekly report or text in panel.

New: When a battle occurs, the AAR could be a **flippable card**:
- **Front:** Summary (attacker name vs defender name, outcome badge, power ratio)
- **Back:** Detail (casualties, equipment lost, terrain modifiers, territory change)
- Click/tap to flip — CSS 3D transform (perspective + rotateY)
- Card stock appearance: dark cream (#e8e0d0), slight shadow

### 4.3 Officer dossier

Current: OfficerProfile component with name, pips, stats.

Upgraded: When opening officer detail from corps panel:
- **Personnel file folder** — manila tab at top with officer name
- **Photo area** — paper-clipped rectangle (placeholder: faction-colored silhouette; real: Gemini portrait when available)
- **Stat bars** on paper background (same pip system, but on cream not dark)
- **War crimes badge** — if applicable, red CLASSIFIED stamp across corner
- **Service record** — typewriter text below stats

### 4.4 Settlement intelligence dossier

Current: SettlementDetailContent with tabs.

Upgraded: Keep dark panel frame. Overview tab content gets:
- **Intel header** — small "INTELLIGENCE ASSESSMENT" stamp at top
- **Ethnic composition** — keep the bar chart, add a "DEMOGRAPHIC DATA" label in typewriter
- **Formations list** — each formation as a small index card (cream background, formation name, key stat)
- **Control history** — typewriter-style log entries with dates

**Estimated: 3-4 sessions. Art assets needed: paper textures (have from ops modal), rubber stamps (8-10), folder tab texture, paperclip SVG (already exists).**

---

## Phase 5: Bottom Strip Enrichment

**Add macro indicators.** HoI4's top bar is always showing you the strategic picture.

Current: map mode pills + territory % + layer toggles.

Add between territory % and layer toggles:
- **Manpower pool:** soldier-icon + current/max (faction-colored)
- **Supply reserves:** crate-icon + level (green/amber/red bar)
- **Active operations:** crosshairs-icon + count
- **Alliance status** (HRHB-RBiH): handshake-icon + status pill (ALLIED/STRAINED/MOBILIZING/WAR)

All using the P0 icon set. Compact — 4 indicators, ~200px total width.

**Estimated: 1 session. No art assets.**

---

## Phase 6: Map Operation Visualization

**Show operation health on the map without opening panels.**

### 6.1 Operation area tint

When an operation is active, tint the objective OSIDs with a semi-transparent faction overlay (10% opacity). Clicking the tinted area opens the operation detail.

### 6.2 Participating unit indicators

Units in an active operation get the crosshairs icon (from Phase 2.3) and a subtle colored glow matching operation status:
- Green glow: executing normally
- Amber glow: stalled (no progress for 2+ turns)
- Red glow: failed / in recovery

### 6.3 Attack preview card (UoC2-style)

When hovering over an attack arrow (staged or active):
- Floating card appears near the arrow midpoint
- Left side: attacker card (faction color, icon, personnel, cohesion bar)
- Right side: defender card (same layout)
- Center: power ratio + predicted outcome (decisive/victory/costly/stalemate/repulsed)
- Compact: 300px wide, 100px tall

**Estimated: 2 sessions. No art assets.**

---

## Art Asset Requirements (for Gemini Pro)

| Asset | Count | Format | Priority | Notes |
|-------|-------|--------|----------|-------|
| SVG icon set | 22 | Inline SVG | **P0** | Can be code-drawn, no Gemini needed |
| Rubber stamp text overlays | 10 | CSS-generated or WebP | P2 | DISRUPTED, ON LOAN, CLASSIFIED, etc. |
| Paper clip SVG | 1 | SVG | — | Already exists |
| Paper noise texture | 1 | SVG pattern | — | Already exists in ops modal |
| Folder tab texture | 1 | SVG or WebP | P3 | Simple manila tab shape |
| Wax seal icons | 4 | SVG | P3 | Gold, grey, red, blue — for decision buttons |

**Total NEW art assets needed: ~16 small items, most of which can be CSS/SVG-generated.** The icon set is code-only. The paper textures already exist. The rubber stamps are CSS text with `transform: rotate(-3deg)` and border styling (like ODOBRENO).

---

## Implementation Priority

| Phase | Sessions | Dependencies | Impact |
|-------|----------|-------------|--------|
| **P1: Icons** | 2-3 | None | Highest — changes visual language everywhere |
| **P2: Counter enrichment** | 1 | P1 (uses icons) | High — map becomes informative at a glance |
| **P3: Sidebar upgrade** | 2 | P1 (uses icons) | High — most-used UI element |
| **P4: Document panels** | 3-4 | P1, rubber stamps | Medium-high — extends ops modal quality |
| **P5: Bottom strip** | 1 | P1 (uses icons) | Medium — strategic awareness |
| **P6: Map operations** | 2 | P2 (counter glow) | Medium — operation feedback |

**Total: ~11-13 sessions across 6 phases.** Can be done incrementally — each phase is independently valuable and shippable.

---

## What This Does NOT Change

- Map rendering (MapLibre layers, polygon fills, front lines) — untouched
- Tooltip content and behavior — already good, untouched
- Ops planning modal — already the gold standard, untouched
- Map mode system — untouched
- IPC/desktop integration — untouched
- Game state adapter — untouched
- Any simulation code — zero sim changes

This is a **pure presentation layer upgrade.** Same data, better visual language.
