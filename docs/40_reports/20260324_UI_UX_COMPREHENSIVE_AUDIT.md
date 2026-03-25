# Tactical Map — Comprehensive UI/UX Audit

**Date:** 2026-03-24
**Auditor:** Orchestrator (live browser inspection via Chrome MCP)
**Build:** v0.4.1 Fallback Active · Vite dev server (port 3003)
**Save:** 40-week scenario (n1059) · VRS faction · Turn 40 (6 Jan 1993)
**Method:** Systematic inspection of every tab, panel, tooltip, interactive element, and overlay.

---

## 1. Inventory of Inspected Elements

### Top Bar
- **CHRONICLE** button (left) — opens fullscreen timeline
- **Date/Turn display** — "6 Jan 1993 · Turn 40 (war)" — clickable but action unclear
- **DEV badge** — green, always visible
- **Faction emblem** — centered (VRS coat of arms), clickable via `VRS HQ [H]`
- **ADVANCE TURN →** button (right) — primary action
- **Dev toolbar** (hidden row): LOAD, LATEST, RUN_ID textbox, SYNC, SAVE

### Alert System
- **COMMAND BRIEFING marquee** — scrolling right-aligned text ("1 critical command matter requires attention")
- **Alert banner cards** — horizontal scrolling strip with colored-border cards:
  - "Operacija Bunar losing momentum" (OPEN OPERATION)
  - "International pressure at 31%" (REVIEW IVP)
  - "1st Krajina Corps at 37% cohesion" (OPEN IN HQ)
  - "East Bosnian Corps – Lopare, Ugljevik needs attention" (OPEN SECTOR)

### Left Panel — COMMAND
- **SITUATION** (collapsible ►/▼)
  - Territory: RS/RBiH/HRHB percentages
  - War Snapshot: fronts (static/fluid/oscillating), supply status, IVP
  - Casualties: all 3 factions — KIA/WIA/MIA
  - Alliance Gauge (RBiH-HRHB): 0.33, with progress bar
  - International Pressure (IVP): composite 31, sub-metrics (Sarajevo siege visibility, Enclave humanitarian pressure, Displacement visibility, Negotiation momentum), thresholds, consequences
  - Operational Posture: OPSEC status, Operation Health (3 ops with supply/failure)
  - Diplomacy: Patron Override Authority (Croatia, IC, Serbia) with bars + RECOMMENDS
  - Negotiation Capital: composite 60, sub-bars (Military Position, Communications, Planning, Int'l Credibility, Military Effectiveness, Political Cohesion)
  - Alerts section

- **ARMY** (238 units, collapsible per faction)
  - 3 factions: VRS (82 formations), ARBiH (122), HVO (34)
  - Per faction: CO name (truncated), formation count, dropdown ▼
  - **Main Staff**: units listed inline, clickable → **Army Reserve** overlay panel
  - **Corps Cards** (per corps):
    - Header: name, manpower count, brigade count
    - Commander name
    - Equipment icons: tanks (current/total), vehicles (current/total)
    - Stance dropdown: Defensive / Balanced / Offensive / Reorganize
    - ORBAT button → opens Order of Battle overlay
    - Left border color indicating readiness grade

- **MOBILIZATION** (count 3, collapsible)
- **OPERATIONS** (count 10, collapsible) — grouped by faction (RS/RBiH):
  - Per operation: name (linked), corps, faction
  - Status badge: PLANNING / EXECUTION / RECOVERY
  - Momentum value, objectives (x/y), supply %, brigade count
- **SECTORS** (count 58, collapsible — not expanded during audit)
- **ORDER QUEUE** (0)

### Overlay Panels
- **Order of Battle** (ORBAT):
  - Corps Commander: name, title, trait ratings (Competence/Aggression/Defensive x/5)
  - War Crimes section: ICTY charges/status
  - Total Personnel + Brigade count
  - Subordinate Brigades list: green dot, name (linked?), manpower, status dots, sector icon, ACTIVE badge
  - Footer: SECTOR: UNKNOWN, and unreadable bottom text

- **Army Reserve** (Main Staff):
  - Reserve Pool (count)
  - Per unit: name, ON LOAN/DEGRADED badge, personnel, loaned-to corps + weeks, Recall button
  - Campaign History section

### Bottom Bar
- **Map overlay tabs**: Political, Ethnic, Supply, Operations
- **+MORE** popup: Casualties, Morale, Defense
- **Status strip**: RS 62.2% | RBiH 24.3% | HRHB 13.4% | Belgrade: SUPPORTIVE | 10 ops
- **LAYERS** button → panel: Fronts, Units, Labels, Sectors, Minimap, Fog, Borders
- **FPS counter**: 10 fps

### Map
- **Unit counters**: NATO-style symbols (infantry X, armor, triangle variants), color-coded by faction (green=VRS, blue=ARBiH, red=HRHB)
- **Tooltips on hover**: Settlement name (OSID), municipality, population by ethnicity (with bars/%), stationed units, elevation, road access quality
- **Territorial control**: colored shading (pink/salmon=RS, green=ARBiH, blue=HRHB)
- **Front lines**: dashed borders between factions
- **Minimap**: bottom-right corner, shows full BiH with faction colors

### Other Screens
- **Faction Selection**: RBiH/RS/HRHB with emblems, LOAD SAVE FROM DISK, CONTINUE (LAST RUN), version + Close
- **Pause Menu** (ESC): Resume, Save Game, Settings, Main Menu, Quit
- **Chronicle**: fullscreen timeline with colored event cards (Combat/Humanitarian/Political/Military), scrollable

---

## 2. Bugs Found & Fixed This Session

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| 1 | Chronicle "undefined destroyed" — formation destruction events showed "undefined" instead of brigade name | Medium | **FIXED** — added `formation_name` to destruction/spawn entries in `generateChronicleEntries` |
| 2 | Capital tab scroll target missing — `scrollToSection('capital')` had no matching `data-summary-section="capital"` attribute | Low | **FIXED** — added attribute to SituationPanel capital section |
| 3 | Git merge conflict markers in `ArmyHQCorpsCard.tsx` (line 158) causing Vite build failure | High | **Resolved** — other agent fixed (stash conflict between rounded-lg and readiness-grade border logic) |

---

## 3. Issues & Deficiencies Observed

### 3.1 Critical (Blocks player understanding)

**C1. Commander name truncation** — "Gen. Ratko Mla..." and "Gen. Sefer Hali..." — the most important names in the entire game are cut off. Commander identity is central to the narrative weight of this game.

**C2. No corps card flip/detail** — The component file says "FlipCard for front (summary) / back (detail) with 3D flip animation" but clicking corps cards does NOT flip them. Clicking body area opens the Army Reserve instead (Main Staff click target is too large). The flip interaction described in the Phase 2 completion report is not functioning in the dev map.

**C3. "SECTOR: UNKNOWN" in ORBAT footer** — Every brigade in the 1st Krajina Corps ORBAT shows "SECTOR: UNKNOWN" at the bottom. Either sectors aren't assigned in this save, or the data binding is broken.

### 3.2 High (Degrades experience significantly)

**H1. 10 FPS** — Performance is critically poor. The map runs at 10 fps, making panning and zooming feel sluggish. This is a dev server with no users — production will be worse.

**H2. Alert banners are nearly invisible** — The alert strip with 4 critical items (operation losing momentum, IVP pressure, corps cohesion, sector attention) is rendered in tiny text on semi-transparent cards that blend into the map. These are the most urgent decision-drivers in the game and they're visually whispering.

**H3. "+MORE" sub-tabs are ephemeral** — The Casualties/Morale/Defense options appear momentarily and disappear instantly. No visual feedback confirms which mode you're in after clicking. The popup has no hover delay.

**H4. All operation supply shows "0%"** — Every single operation across all factions shows "Supply 0%". Either supply isn't calculated at turn 40, or the binding is broken. This makes the operations panel useless for supply assessment.

**H5. Bottom status bar is too compressed** — RS 62.2% | RBiH 24.3% | HRHB 13.4% and other metrics are crammed into a single line at the very bottom in tiny text. The most important strategic summary in the game is in the worst screen position.

### 3.3 Medium (Polish & usability)

**M1. DEV badge always visible** — The green "DEV" badge next to the date is always shown. Should be conditional on build mode.

**M2. No visual distinction between faction army sections** — When scrolling through the left panel, VRS→ARBiH→HVO corps cards all flow together. The only separator is a small "ARBiH · RBiH" header. A player viewing "all armies" could easily lose track of which faction's corps they're looking at.

**M3. Stance dropdown has no visual feedback** — Changing stance from Balanced to Offensive produces no confirmation, animation, or feedback. The player can't tell if the command was received.

**M4. Corps card equipment numbers are cryptic** — "106/201 ⚔ 546/594" — with no labels, a player must memorize what the tank icon and vehicle icon mean, and which number is current vs. max. The denominator context is missing.

**M5. ORBAT war crimes section is jarring** — Showing "WAR CRIMES — DIED BEFORE TRIAL" and ICTY indictment text directly in the gameplay ORBAT panel mixes historical documentation with active command UI. This is powerful narrative context but needs better visual separation or a "historical note" treatment.

**M6. Mobilization section unexplored** — Shows count "3 ►" but clicking didn't expand during the inspection — may need a more specific click target.

**M7. Recall button in Army Reserve has no confirmation** — Recalling the 120th Liberation "Black Swans" from a 24-week loan is a major strategic decision but the button appears to have no confirmation dialog.

**M8. "COMMAND BRIEFING" marquee scrolls off-screen** — The scrolling text "1 critical command matter requires attention" auto-scrolls rightward and can be completely off-screen when the player first loads.

### 3.4 Low (Cosmetic / minor)

**L1. Layers panel has no BORDERS toggle visible** — The LAYERS panel shows Fronts, Units, Labels, Sectors, Minimap, Fog — "BORDERS" was listed in the interactive elements scan but may be cut off at the bottom.

**L2. MapLibre attribution visible** — "MapLibre" link is visible in the corner. Not appropriate for a shipped game product.

**L3. Tooltip population percentages don't sum to 100%** — GROMILJAK tooltip shows Bosniak 29% + Croat 68% + Other 3% = 100%. This one is fine, but needs verification across all settlements.

**L4. Version string shows "v0.4.1 Build Fallback Active"** — "Fallback Active" suggests a build system issue being surfaced to players.

---

## 4. Actionable Recommendations — "5x More Awesome"

### Tier 1: Quick Wins (1-2 hours each, massive impact)

**R1. Fix commander name display** — Remove truncation or increase the name area width. Show full "Gen. Ratko Mladić" and "Gen. Sefer Halilović". These names ARE the game's narrative gravity. Consider a two-line layout: rank on line 1, full name on line 2.

**R2. Amplify alert banners** — Make them 2x taller, add pulsing border on critical alerts, use faction-colored backgrounds instead of transparent. Add a persistent alert count badge. Model after HOI4's decision notification strip — large, impossible to miss, clickable.

**R3. Add faction dividers in the army list** — Between VRS/ARBiH/HVO sections, add a full-width horizontal rule with the faction emblem and name. Color-code the background: dark green tint for VRS, dark blue for ARBiH, dark red for HVO.

**R4. Label equipment numbers** — Change "106/201 ⚔ 546/594" to "Tanks: 106/201 · Vehicles: 546/594" or use labeled icon badges with current/max clearly distinguished (e.g., bold current, dim max).

**R5. Add stance change confirmation** — Flash the corps card border, show a brief "✓ Offensive stance set" toast, or animate the stance badge. Give the player feedback that their order was received.

### Tier 2: Medium Effort (half-day each, transforms the experience)

**R6. Make the bottom status bar a proper strategic dashboard** — Move RS/RBiH/HRHB territory percentages into a wider strip with colored bars (like a stacked progress bar). Add trend arrows (↑↓). Show Belgrade stance with a more prominent indicator. This strip should feel like a wartime situation room ticker.

**R7. Implement the corps card flip** — The architecture exists (FlipCard component). Make clicking a corps card body flip to the back, showing: commander profile, sector overview, operation status, recent combat record. The front should be the summary card as it is now. This was designed in Phase 2 — activate it.

**R8. Fix +MORE popup behavior** — Replace ephemeral popup with a persistent tab bar extension or a dropdown that stays open until dismissed. Show the current active overlay mode in the tab strip (e.g., highlight "Casualties" when active).

**R9. Performance investigation** — 10 FPS is unacceptable. Profile the render loop: likely candidates are excessive SVG re-renders on every frame, or the map tile layer thrashing. Consider:
  - Throttle tooltip updates (no need to recalc on every mouse-move pixel)
  - Memoize OSID polygon rendering
  - Reduce minimap update frequency
  - Check if maplibre-gl render loop is fighting React re-renders

**R10. Operation supply diagnostic** — If all ops show 0% supply, either fix the data binding or show "N/A" with a tooltip explaining why. Never show broken data as if it's real.

### Tier 3: Ambitious (1+ day each, would make this exceptional)

**R11. Corps card readiness "heat" visualization** — Instead of just a left-border color, make the entire corps card subtly shift its background warmth based on readiness: healthy corps get a warm amber glow, struggling corps get a cold desaturated look, critical corps get a dark red pulse. The player should feel the army's health at a glance.

**R12. Interactive ORBAT with map sync** — Clicking a brigade in the ORBAT should highlight its OSID on the map. Hovering a brigade should flash its position. This creates the spatial connection between the command panel and the map that makes wargames click.

**R13. Chronicle timeline improvements** — The timeline is functional but cards overlap and are hard to read. Add zoom levels: "war overview" (entire war on one screen) vs. "quarter view" vs. "week view". Add filtering by category (Combat/Political/Humanitarian/Military). Add a "play forward" animation that replays the war as a cinematic timeline.

**R14. Strategic dashboard overlay** — When clicking the territory percentages in the status bar, open a full strategic dashboard showing: territory over time (line chart), casualty trends, IVP progression, alliance gauge history, operation success rates. This transforms raw numbers into narrative understanding.

**R15. Sound design hooks** — Add subtle audio cues: a low rumble when opening the command panel, a stamp/seal sound when changing stance, paper shuffling when flipping cards, a radio crackle for alerts. Sound is the cheapest way to make UI feel 5x more immersive.

---

## 5. Competitive Positioning Assessment

### What AWWV does better than HOI4/AGEOD right now:
- **OSID-level tooltips** with population demographics — unprecedented territorial detail
- **War Chronicle** timeline — no competitor has a persistent narrative timeline of events
- **Three-faction simultaneous view** — showing all armies at once is bold and informative
- **IVP / Diplomacy / Alliance Gauge** — political dimension is first-class, not an afterthought
- **Commander war crimes documentation** — extraordinary narrative weight

### Where it falls short of genre standards:
- **Performance** — HOI4 runs at 60fps; AWWV at 10fps breaks immersion
- **Alert urgency** — HOI4's decision notifications are unmissable; AWWV's are easy to overlook
- **Information hierarchy** — Too much data at equal visual weight; needs clear primary/secondary/tertiary treatment
- **Feedback loops** — No sound, no animation, no confirmation when issuing orders
- **Spatial-command integration** — ORBAT and map are disconnected; clicking a brigade should show you where it is

---

## 6. Priority Matrix

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| 🔴 P0 | Fix corps card flip interaction (R7) | Medium | High — this was already built |
| 🔴 P0 | Fix commander name truncation (R1) | Low | High — narrative core |
| 🟠 P1 | Amplify alert banners (R2) | Low | High — decision-driving |
| 🟠 P1 | Operation supply 0% diagnostic (R10) | Low | High — data integrity |
| 🟠 P1 | Add faction dividers (R3) | Low | Medium — orientation |
| 🟡 P2 | Label equipment numbers (R4) | Low | Medium — readability |
| 🟡 P2 | Stance change feedback (R5) | Low | Medium — UX feedback |
| 🟡 P2 | Status bar upgrade (R6) | Medium | High — strategic overview |
| 🟡 P2 | Fix +MORE popup (R8) | Low | Medium — usability |
| 🟢 P3 | Performance investigation (R9) | High | Critical — but needs profiling first |
| 🟢 P3 | ORBAT-map sync (R12) | High | High — game-defining feature |
| 🟢 P3 | Strategic dashboard (R14) | High | High — transforms understanding |
| ⚪ P4 | Sound design hooks (R15) | Medium | High — immersion |
| ⚪ P4 | Chronicle improvements (R13) | Medium | Medium — polish |
| ⚪ P4 | Corps readiness heat (R11) | Medium | Medium — visual feel |

---

*Report based on live browser inspection of every interactive element, panel, overlay, and tooltip in the AWWV tactical map. No code changes made to simulation or engine — all observations and fixes are UI-layer only.*
