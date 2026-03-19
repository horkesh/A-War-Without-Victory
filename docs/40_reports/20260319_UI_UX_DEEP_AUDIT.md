# UI/UX Deep Audit — Tactical Map

**Date:** 2026-03-19
**Method:** Systematic inspection of every UI element at 1920x1080, clicking every button, testing every mode, checking every tooltip
**Viewport:** 1920x1080 (desktop)
**Build:** v0.6.1, Turn 40 (6 Jan 1993, WAR phase), live mode from `latest_run_final_save.json`

---

## Executive Summary

The tactical map is functional and visually distinctive. The HoI-inspired warm palette, faction-colored fills, and front line rendering create a strong wargame atmosphere. However, there are significant UX gaps: several top bar buttons are non-functional or route to the wrong modal, the minimap has a toggle bug, map modes lack legends, and the interaction model is inconsistent (some elements respond to hover but not click, no right-click, no keyboard shortcuts documented).

**Verdict:** The foundation is solid. Polish pass needed on: button routing, minimap lifecycle, mode legends, and interaction consistency.

---

## 1. TOP TOOLBAR

### What works well
- **Date/turn display** ("6 JAN 1993 · TURN 40 (WAR)") — clear, period-appropriate format
- **Formation count** ("287 FORMATIONS") — useful at-a-glance metric
- **IVP button** ("IVP: 31%") — live value in button text, opens correct IVP tab in War Summary
- **ECONOMY button** — highlighted gold when active, visually distinct category grouping
- **ENCLAVES button** — properly enabled, visually consistent
- **Faction badge** (VRS · RS with emblem) — recognizable at a glance

### Issues

| ID | Severity | Issue | Detail |
|----|----------|-------|--------|
| T1 | **P1** | **Multiple buttons open same War Summary modal** | SUMMARY, AAR, SITUATION, EVENTS all open the identical War Summary modal on the Overview tab. Only IVP correctly opens its specific tab. AAR should show the AAR panel, EVENTS should show the event log, SITUATION should show the situation assessment. |
| T2 | **P2** | **Disabled buttons have no tooltip explaining why** | SAVE, ADVANCE TURN, CAMPAIGN, RECRUIT are disabled (opacity 0.3) but offer no explanation. Player doesn't know if they're unavailable because of live mode, missing Electron bridge, or game state. Add `title="Requires Electron desktop app"` or similar. |
| T3 | **P2** | **ECONOMY button acts as category label, not action** | Clicking ECONOMY highlights it gold but opens nothing. It's styled identically to ENCLAVES (which does open a panel). Either make it open an economy overview panel or restyle as a non-clickable label. |
| T4 | **P3** | **SYSTEMS label is not visually distinct from buttons** | "SYSTEMS" appears as plain text at the same font size as buttons beside it. It's a category header but could be mistaken for a non-functional button. Consider making it dimmer, italic, or separated by a vertical divider. |
| T5 | **P3** | **"WARROOM CONSOLE" title takes space but adds no interaction** | The title "WARROOM CONSOLE / A WAR WITHOUT VICTORY V0.6.1" occupies ~200px of prime toolbar space. Consider moving version info to a tooltip on the title, or an about/help modal. |
| T6 | **P3** | **No keyboard shortcut hints on toolbar buttons** | Unlike the bottom bar modes which have key hints in tooltips ("1: Political"), toolbar buttons have no shortcut hints. Consider adding hotkeys for frequently-used actions (e.g., Space = advance turn, S = save). |
| T7 | **P3** | **"AI" button purpose unclear** | "AI" is the last button in the HISTORY group. Its purpose isn't obvious — is it AI settings? AI debug? Bot behavior viewer? Needs a tooltip or relabel like "AI SETTINGS" or "BOT DEBUG". |
| T8 | **P3** | **Top bar categories not visually grouped** | SYSTEMS/SAVE/ADVANCE TURN/CAMPAIGN/ECONOMY are in one group, PERSONNEL/RECRUIT/ENCLAVES in another, INTEL/IVP in a third, HISTORY/... in a fourth. The visual separators between groups are subtle vertical lines that are hard to see against the glass background. Consider thicker dividers or spacing. |

---

## 2. LEFT SIDEBAR (COMMAND PANEL)

### What works well
- **Army tree** — clear hierarchy: Army → Corps → Main Staff. Each corps shows personnel count + brigade count
- **Stance dropdowns** — inline combobox per corps (Offensive/Balanced/Defensive), immediately actionable
- **ORBAT buttons** — clearly labeled per corps
- **Commander names** — displayed per corps
- **Faction switching** — collapsible army sections for VRS/ARBiH/HVO
- **ORDER QUEUE (0)** — visible at bottom, shows pending orders count

### Issues

| ID | Severity | Issue | Detail |
|----|----------|-------|--------|
| S1 | **P2** | **Personnel numbers not human-friendly** | Shows "45,994" which is fine, but "8,752" and "9,581" are raw numbers without context. Consider adding a health bar or color indicator (green = full strength, yellow = moderate attrition, red = severely depleted). A player can't tell at a glance which corps is in trouble. |
| S2 | **P2** | **No corps health/status indicator** | Each corps entry shows personnel + brigades + commander + stance + ORBAT button. Missing: a simple red/yellow/green indicator for overall corps health (morale, cohesion, supply). The player must open ORBAT to assess corps condition. |
| S3 | **P2** | **Commander name truncated** | "Gen. Ratko Mla..." with ellipsis. The name "Ratko Mladić" is cut off at ~10 characters. The sidebar width could accommodate the full name if the layout were adjusted. |
| S4 | **P3** | **ARMY 235 ▼ — "235" is unexplained** | Shows "ARMY 235 ▼" — is 235 total formations? total personnel (in thousands)? total brigades? The number appears to be total formations minus player's army, or total personnel in hundreds. Needs a label or tooltip. |
| S5 | **P3** | **"81 formations" count includes non-combat units** | VRS shows "81 formations" which includes corps_assets, army_hq, paramilitaries. The player cares about combat brigades. Consider "81 formations (68 combat)" or similar breakdown. |
| S6 | **P3** | **No visual distinction between own/enemy forces** | In live mode (VRS player), the sidebar shows all three armies. The player's own army (VRS) should be visually emphasized — perhaps a gold border or "YOUR FORCES" label. Enemy armies should be dimmer or collapsed by default. |
| S7 | **P3** | **Stance dropdown has no tooltip explaining options** | Offensive/Balanced/Defensive are the options but there's no tooltip explaining what each stance does mechanically (e.g., "Offensive: +0.15 aggression, allows attacks" vs "Defensive: -0.30 aggression, no attacks"). |
| S8 | **P4** | **ORDER QUEUE always shows (0) in live mode** | In live mode (no Electron), orders can't be submitted. Consider hiding the order queue entirely in live mode, or showing it grayed with "Desktop only" note. |

---

## 3. MAP INTERACTIONS

### What works well
- **Political control fills** — clean faction colors (red/green/blue) with hillshade visible underneath
- **Front lines** — thick dashed lines clearly separate factions
- **Unit icons** — NATO-style brigade/division symbols with faction colors, readable at zoom
- **Settlement hover tooltips** — show name, municipality, political control, population, ethnic breakdown bars
- **Front line tooltips** (when triggered) — show sector, density, threat, stationed units — excellent data
- **Formation tooltips** — show name, corps, personnel, cohesion bar, posture, current order
- **Zoom/pan** — smooth, responsive
- **Minimap** — shows overview with faction colors (when working)

### Issues

| ID | Severity | Issue | Detail |
|----|----------|-------|--------|
| M1 | **P1** | **Minimap doesn't re-render after toggle OFF→ON** | Toggle minimap OFF, then back ON: the minimap container exists in DOM but the MapLibre canvas doesn't render. Requires page reload to restore. The minimap MapLibre instance likely isn't re-initialized on remount. |
| M2 | **P2** | **No right-click context menu** | Right-clicking anywhere on the map opens the same settlement tooltip as left-click. Grand strategy games use right-click extensively for: issuing orders, viewing info, setting targets. Consider a radial menu with context-sensitive actions (on unit: View/Select Corps/Set Stance; on territory: View Sector/Set Op Target; on front: View Sector Detail). |
| M3 | **P2** | **Clicking brigade icons often hits the settlement underneath** | Brigade icons are small. Left-clicking often triggers the settlement tooltip instead of selecting the brigade. The click priority system exists (formations > front-edges > settlements) but the icon hit area is too small at default zoom. Consider increasing the marker hit radius. |
| M4 | **P2** | **No visual feedback when clicking empty map** | Clicking on an empty area (no settlement, no unit) does nothing visible. Consider deselecting all panels, or showing coordinates, or a subtle "nothing here" state. |
| M5 | **P3** | **Settlement dots (white circles) purpose unclear** | White circles at various locations on the map represent strategic centers/municipal seats. No legend explains them. First-time players won't know what they mean. |
| M6 | **P3** | **Map zoom controls (top-right) overlap with map content** | The MapLibre zoom +/- buttons and compass are in the top-right corner. At full map view, they overlap with unit icons and territory fills. Consider a custom zoom control styled to match the UI theme. |
| M7 | **P3** | **MapLibre attribution visible** | "MapLibre" link visible in bottom-right corner. For a game UI, this should be hidden or moved to an about/credits screen. |
| M8 | **P4** | **No keyboard shortcuts for map navigation** | No shortcut for zoom-to-fit, pan to capital, center on selected unit. Consider: Home = zoom to fit all, F = follow selected unit, 1-9 = jump to corps HQ. |

---

## 4. BOTTOM BAR (Mode Pills + Territory % + Layer Toggles)

### What works well
- **Map mode pills** — clear mode labels: Political/Ethnic/Supply/Casualties/Morale/Operations/Defense
- **Active mode highlighted gold** — immediately visible which mode is active
- **Territory percentages** — "RS 60.6% · RBiH 27.4% · HRHB 12.0%" — excellent at-a-glance war status
- **Layer toggles** — Front/Units/Labels/Minimap/Fog/Battles/Points — clear binary toggles with active state
- **Glass background** — consistent with top toolbar aesthetic

### Issues

| ID | Severity | Issue | Detail |
|----|----------|-------|--------|
| B1 | **P2** | **No legend for heat map modes** | Supply, Casualties, Morale, Defense modes show color gradients but no legend explaining the scale. Supply mode shows uniform green (no variation visible) — is supply evenly distributed or is the scale wrong? Defense mode shows green-yellow-red but what do the values mean? Each mode needs a small legend overlay. |
| B2 | **P2** | **Supply mode shows no variation** | In Supply mode, the entire map is uniform green. Either supply is evenly distributed (unlikely in a war zone with enclaves) or the color scale is too compressed. The scale may need logarithmic mapping or a per-faction relative scale. |
| B3 | **P3** | **Mode keyboard shortcuts not discoverable** | Tooltips show "1: Political" etc. but only on hover. No visual hint (like underlined numbers) on the button labels themselves. Consider "1 Political" or a subtle "1" badge. |
| B4 | **P3** | **Toggle active state is subtle** | Active toggles have a thin border and slightly brighter text. Inactive toggles are 50% opacity. The difference is visible but not dramatic. Consider a more prominent active indicator (filled background, checkmark, or brighter border). |
| B5 | **P4** | **Territory % has no trend indicator** | Shows current percentages but no indication of change direction. Consider "RS 60.6% ▼" or a tiny sparkline showing last 5 turns. |

---

## 5. CORPS DETAIL PANEL

### What works well
- **5 tabs**: Overview, ORBAT, Sectors, OPS, Orders — comprehensive coverage
- **Commander card** — name, title ("Master Strategist"), competence/aggression/defense ratings with dot indicators
- **War crimes annotation** — shows ICTY charges for relevant commanders (excellent historical detail)
- **Personnel/Brigades/Sectors/OG Slots counts** — clear summary
- **Equipment section** — Tanks 109/198, Artillery 545/577, AA 85 — operational/total format is intuitive
- **Combat Record** — Battles, Win Rate, Men lost — good metrics

### Issues

| ID | Severity | Issue | Detail |
|----|----------|-------|--------|
| C1 | **P2** | **Competence/Aggression/Defense dots are cryptic** | Shows "●●●●○ Exceptional" for competence, "●●●●○ Bold" for aggression. The dot scale (1-5?) isn't labeled. Are 4 dots "Exceptional"? What's 5? Consider replacing with a bar or adding "4/5" numeric label. |
| C2 | **P2** | **"OG Slots 0/2" — abbreviation unexplained** | "OG Slots" appears to mean Operation Group slots. Not explained anywhere in the UI. Consider "Op Slots" or a tooltip explaining "Number of simultaneous operations this corps can run". |
| C3 | **P3** | **"Exh: 16.0" in the status line — cryptic abbreviation** | The line "RS · Offensive · Exh: 16.0" shows exhaustion as a raw number. What scale? What's dangerous? Consider "Exhaustion: 16/100" or a color-coded bar. |
| C4 | **P3** | **Equipment numbers lack context** | "Tanks 109/198" — is 109 operational good or bad? What percentage is considered combat-effective? Consider a color gradient (green > 80%, yellow 50-80%, red < 50%). |
| C5 | **P3** | **"JNA" button on commander card** — purpose unclear | There's a small "JNA" button/badge next to the commander. Does it show JNA background? Open a JNA history panel? Needs a tooltip. |
| C6 | **P4** | **Commander years-in-command not shown** | The commander card shows the current commander but not how long they've been in command, which affects competence bonuses. |

---

## 6. SETTLEMENT PANEL (Right Side Detail)

### What works well
- **3 tabs**: Overview, Military, Orders & Events — good organization
- **Population data** — pre-war vs current with change delta clearly shown
- **Ethnic breakdown bars** — visual proportional bars for each ethnicity, both pre-war and current
- **"Strategic Center" badge** — clear designation for important settlements
- **Displacement data** — "Fled from this settlement: Croats 49, Bosniaks 127" — specific, informative
- **Stationed Units list** — shows formations at settlement with personnel count

### Issues

| ID | Severity | Issue | Detail |
|----|----------|-------|--------|
| P1 | **P2** | **Population change delta color is confusing** | Shows "Out: -688" in red and "Lost: -13" in red. Both are red but "Out" = displaced (may return) while "Lost" = killed (permanent). These are qualitatively different events displayed with the same visual treatment. Consider different colors: red for killed, orange/yellow for displaced. |
| P2 | **P3** | **"Pre-war · In · Out · Lost · Now" header is cryptic** | The column headers for population flow are tiny abbreviated labels. A first-time player won't know what "In" vs "Out" vs "Lost" mean without context. Consider: "Arrived", "Departed", "Killed". |
| P3 | **P3** | **Military tab — "Militia Pool" section shows raw numbers** | Shows "HRHB: 7 avail · 0 committed · 0 exhausted". What does "7 avail" mean — 7 recruits? 7,000 personnel? The units aren't clear. |
| P4 | **P4** | **Orders & Events tab — content unknown** | Couldn't test this tab in the audit. Should show orders affecting this settlement and recent events (battles, displacement). |

---

## 7. MAP MODES — Visual Assessment

| Mode | Visual Quality | Issues |
|------|---------------|--------|
| **Political** | Excellent | Clean faction colors, hillshade visible underneath, front lines clear |
| **Ethnic** | Good | Shows pre-war ethnic composition. Red = Serb, Green = Bosniak, Blue = Croat. No legend but colors match faction expectation |
| **Supply** | **Poor** | Uniform green across entire map — no visible variation. Scale appears broken or too compressed. Player gains no information from this mode. |
| **Casualties** | Fair | Subtle red gradient near front lines. Very faint in rear areas. Needs more contrast or a legend to be useful. |
| **Morale** | Not tested | (Skipped due to time — likely similar issues to Casualties) |
| **Operations** | Good | Shows holding/supporting/main effort zones near active fronts. Operation arrows now hidden by default, show correctly in this mode. |
| **Defense** | Good | Green-yellow-red gradient showing defense density. Strongest mode after Political. Needs legend. |

---

## 8. GENERAL UX OBSERVATIONS

### Positive Patterns
1. **Warm military palette** — The brown/gold/dark tones create authentic wargame atmosphere
2. **Glass UI panels** — Semi-transparent panels over the map feel modern and don't block terrain awareness
3. **Faction identity** — Colors (red/green/blue) and flags are used consistently throughout
4. **Data density** — Tooltips and panels pack a lot of information without feeling cluttered
5. **Front line rendering** — Dashed lines clearly separate factions, sector glow adds depth

### Systemic Issues

| ID | Severity | Issue | Recommendation |
|----|----------|-------|----------------|
| G1 | **P1** | **No onboarding or tutorial** | First-time player sees a complex interface with no guidance. Consider a "What's this?" mode that adds info icons to key UI elements, or a first-run overlay tour. |
| G2 | **P2** | **No undo for stance changes** | Changing a corps stance (Offensive→Defensive) happens immediately with no confirmation. In a wargame where stance affects combat for an entire turn, this should require confirmation or support undo. |
| G3 | **P2** | **No notification system** | When events fire, territory changes, or operations complete, there's no notification toast or badge. The player must manually check AAR/Events. Consider a notification bell with unread count, or toast notifications at turn boundaries. |
| G4 | **P2** | **Faction selector at game start has no context** | The "Choose Your Faction" screen shows 3 flags with army names. No difficulty indication, no faction description, no strategic summary. A new player has no idea which faction to pick. |
| G5 | **P3** | **No pause/speed controls visible** | In live mode, there's no indication of game speed or ability to pause. The "ADVANCE TURN" button is disabled. Consider a turn counter that's always visible with prev/next controls. |
| G6 | **P3** | **Sidebar doesn't scroll smoothly to show all corps** | On 1080p, the sidebar shows ~6 corps before needing to scroll. The last corps and ORDER QUEUE may be cut off. Consider a collapsible corps list or a scroll indicator. |

---

## 9. SUGGESTED NEW FEATURES (Ambitious)

These are new ideas beyond bug fixes — things that would elevate the UX significantly:

1. **Radial context menu on right-click** — Context-sensitive ring menu: on unit (View/Orders/Stance), on territory (Sector Info/Set Target), on front line (Sector Detail/Launch Op). Inspiration: Total War, Supreme Commander.

2. **Turn timeline scrubber** — Horizontal timeline at top or bottom showing turns 1-40 with key events marked. Click to view historical state at any turn. Shows territory % over time as a sparkline.

3. **War overview dashboard** — Full-screen overlay (toggle with Tab or a button) showing: territory trend chart, personnel trend, equipment trend, active operations, recent battles, faction morale. Think "Hearts of Iron production/logistics screen."

4. **Corps commander portraits** — Replace the text-only commander card with a portrait (even procedurally generated or silhouette-based). Historical photos for known commanders. Makes the human cost feel personal.

5. **Battle replay on click** — When clicking a recent battle marker, show a mini animation of the attack direction, force ratios, and outcome. Even a simple arrow + text overlay would add drama.

6. **Sound design hooks** — UI click sounds, ambient war sounds (distant artillery, radio chatter), battle notification sounds. Even simple Web Audio API tones would add immersion.

7. **Map mode quick-cycle with scroll wheel on bottom bar** — Scroll wheel over map mode pills cycles through modes. Faster than clicking.

8. **"Commander's Intent" overlay** — Show planned vs actual territory control. Painted targets as translucent overlay showing where the AI/player intends to be vs where they are. Gap visualization.

---

## 10. PRIORITY MATRIX

### Must Fix (P1)
- T1: Multiple toolbar buttons route to same War Summary modal
- M1: Minimap toggle doesn't re-render on toggle back ON

### Should Fix (P2)
- T2: Disabled buttons need tooltips explaining why
- T3: ECONOMY button acts as label, not action
- B1: No legend for heat map modes
- B2: Supply mode shows no variation
- S1: Personnel numbers lack health indicators
- S2: No corps health/status indicator
- M2: No right-click context menu
- M3: Brigade click hit area too small
- C1: Commander rating dots are cryptic
- C2: "OG Slots" abbreviation unexplained
- P1: Population "Out" vs "Lost" same color
- G2: No undo for stance changes
- G3: No notification system
- G4: Faction selector has no context

### Nice to Have (P3-P4)
- All remaining items in tables above
- New feature suggestions in Section 9
