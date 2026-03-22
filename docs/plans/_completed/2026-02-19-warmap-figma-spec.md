# War Map GUI — Figma Recreate Spec

**Purpose:** Detailed description of the current tactical/war map GUI so it can be recreated in Figma for design iteration and testing.  
**Source:** `docs/20_engineering/TACTICAL_MAP_SYSTEM.md`, `GUI_DESIGN_BLUEPRINT.md`, `src/ui/map/tactical_map.html`, `styles/tactical-map.css`, `constants.ts`, `nato_tokens.ts`.  
**Date:** 2026-02-19.

---

## 1. Design identity and theme

- **Feel:** 1990s NATO C2 ops center meets basement war room — JSTARS-style green-on-dark CRT aesthetic, modernized. Dense information, no decorative chrome; the map is always the largest element.
- **Visual identity:**
  - **Canvas (map) background:** Deep dark navy `#0d0d1a` (NATO_TOKENS.paper).
  - **UI chrome:** Dark brown-tinted grays — toolbar `#111122`, panels `#10101e`–`#161628`, borders `#252540`–`#303050`.
  - **Primary text:** Warm cream / off-white `#d8d8e0`–`#e0e0e0`; secondary `#8888a0`; muted `#555570`–`#7a7a8a`.
  - **Accent:** Phosphor green `#00e878`–`#00ff88` for active states, zoom pill, turn display, layer title, key buttons; optional subtle CRT scanline overlay (very light green tint).
  - **Typography:** **IBM Plex Mono** throughout (300, 400, 500, 600, 700); 12px base, 10–11px for compact UI, uppercase + letter-spacing for labels.
- **Faction colors (canonical):**
  - **RS (VRS):** `rgb(180, 50, 50)` — deep crimson.
  - **RBiH (ARBiH):** `rgb(55, 140, 75)` — forest green.
  - **HRHB (HVO):** `rgb(50, 110, 170)` — steel blue.
  - **Neutral / unknown:** `rgba(60, 60, 70, 0.35)` grey.
- On the map, settlement fills use these faction colors at **65% opacity** (e.g. RBiH `rgba(55, 140, 75, 0.65)`).

---

## 2. Overall layout and dimensions

- **Root:** Full viewport; flex column: toolbar (fixed height) + main (flex 1).
- **Main area:** Single row: **OOB sidebar (left) | map canvas (center, flex) | settlement/formation panel (right)**. All panels collapsible; when closed, map fills the space.
- **Key widths:**
  - **Top toolbar:** 100% width, height ~38–48px (padding 5px 12px, so ~48px total with content).
  - **OOB sidebar:** **300px** when open; slides in from left.
  - **Settlement/formation panel:** **340px** when open; slides in from right.
  - **Map canvas:** Remaining width/height; always visible between the two sidebars.
- **Bottom status bar:** Full width, single line (e.g. “Loading map data…” or dataset label); ~24–32px height, dark background, muted text.

---

## 3. Top command bar (toolbar)

- **Background:** `#111122`; bottom border 1px `#252540`.
- **Layout:** Horizontal flex, align center, gap 6px, padding 5px 12px. Items left to right:
  1. **‹ HQ** (optional; only in embedded warroom mode) — amber/gold tint `#c8a050`, “Return to warroom”.
  2. **Menu** — opens main menu overlay.
  3. **Zoom pill** — badge: “STRATEGIC” | “OPERATIONAL” | “TACTICAL”. Background `rgba(0, 232, 120, 0.08)`, border `rgba(0, 232, 120, 0.2)`, color `#00e878`, 10px font, 600 weight, letter-spacing 2px, uppercase, border-radius 3px.
  4. **−** and **+** — zoom out / zoom in buttons (same style as toolbar buttons).
  5. **Legend** — toggles legend visibility.
  6. **Ethnic 1991** — toggles settlement fill between political control and 1991 ethnic majority.
  7. **OOB** — toggles left sidebar (Order of Battle).
  8. **Search** — opens search overlay.
  9. **Summary** — opens War Summary modal.
  10. **Settings** — opens Settings modal (“Settings coming soon.”).
  11. **Help** — opens Help modal (shortcuts).
  12. **Recruit** — opens Recruitment modal (when game state has player_faction).
  13. **Turn display** (right-aligned): e.g. “Turn 0 — Sep 1991” or “15 Apr 1992”; `#00e878`, 12px, 600 weight, optional subtle green glow.

- **Toolbar button style:** Padding 4px 10px, background `rgba(255,255,255,0.04)`, color `#8888a0`, border 1px `#252540`, border-radius 3px, 11px IBM Plex Mono, 500 weight, 0.5px letter-spacing, uppercase. Hover: background `#1e1e35`, color `#d8d8e0`, border `#303050`. Active/selected: background `rgba(0, 232, 120, 0.1)`, color `#00e878`, border `rgba(0, 232, 120, 0.3)`.

---

## 4. Map canvas area

- **Background:** `#0d0d1a` (same as canvas clear color).
- **Content (for Figma, represent as key layers):**
  - **Base geography (always on):** National boundary (line ~2px, `rgba(100,100,120,0.6)`), rivers (1.2px, steel blue), roads (MSR 1.5px grey, secondary 0.6px lighter grey). Municipality borders optional layer (1px, `rgba(80,80,100,0.25)`), usually off.
  - **Settlement polygons:** ~5,800 polygons; fill only (no stroke between settlements). Fill = faction color at 65% opacity or ethnic-majority colors when “Ethnic 1991” is on. Neutral = `rgba(60,60,70,0.35)`.
  - **Front lines:** Dual defensive arcs — paired faction-colored arcs along borders between different-faction settlements; small barb ticks toward enemy. Faction RGB: RBiH 55,140,75; RS 180,50,50; HRHB 50,110,170. Arc stroke ~1.5px, alpha 0.7; glow behind arc.
  - **Formation markers (when game state loaded):** Horizontal box: dark translucent background, faction border, army crest (left) + NATO symbol (right). Sizes by zoom: strategic 44×30, operational 54×38, tactical 66×46. Posture badge (D/P/A/E) in phosphor green when present. Co-located markers stacked vertically with 3px gap.
  - **Order arrows:** Attack = red solid; movement = dashed, faction-colored. From formation to target settlement/municipality.
  - **Brigade AoR highlight:** When a formation is selected, its area of responsibility (polygons) filled with faction color, low alpha (0.08–0.22 pulsed), diagonal crosshatch; boundary stroked.
  - **Selection/hover:** Hover = white semi-transparent outline; selected = white + faction-colored double outline.
  - **Labels:** URBAN_CENTER and TOWN only; IBM Plex Mono, halo (paper-colored stroke) for readability; URBAN_CENTER bold 12px, TOWN 10px. No labels on small settlements.

- **Overlays on top of map (positioned):**
  - **Minimap:** 200×150px, bottom-left (e.g. 16px from bottom and left). Dark background, border `#303050`, border-radius 4px. Content: colored dots at settlement centroids + white viewport rectangle.
  - **Zoom controls:** Two buttons stacked, bottom-right (e.g. 48px from bottom, 12px from right). Each 32×32px, border-radius 4px, “−” and “+”, phosphor green color.
  - **Legend:** Bottom, left of center (e.g. left 230px, bottom 12px). Small panel: background `rgba(16,16,30,0.92)`, border `#252540`, border-radius 4px, 10px text. Rows: faction swatch (12×12px) + label (RBiH, RS, HRHB, Neutral) and optional “Front” dash. Content depends on fill mode (political vs ethnic).
  - **Layer toolbar:** **Bottom center**, floating. Horizontal strip: “Layers” title (phosphor green, 10px, uppercase) + checkboxes: Control, Front, Municipalities, Minimap, Formations. Each: pill-style, border, 10px label. Background `rgba(10,10,26,0.92)`, border `#252540`, border-radius 6px, padding 8px 10px, gap 8px.
  - **Search overlay (when open):** Centered near top; min-width 320px. Input + results dropdown; same dark theme.
  - **Replay scrubber (when replay loaded):** Slider + “Week 1/52” label; typically bottom or integrated into toolbar.
  - **Tooltip:** Near cursor; small floating box, “Settlement name — Controller — pop X”.

---

## 5. OOB sidebar (left)

- **Width:** 300px. Slides in from left; when closed, map extends to left edge.
- **Background:** Same as panel `#10101e`; border-right `#252540`.
- **Header:** “ORDER OF BATTLE” (uppercase, 11–12px, letter-spacing) + close button “×” top-right.
- **Content (two blocks):**
  1. **War status:** Territory % by faction, personnel totals, flip counts, pending orders summary, faction overview, alerts. When no game state: “Load a game state to view war status.” (muted text.)
  2. **Formation list:** Grouped by faction (RBiH, RS, HRHB). Per faction: header with badge + label + count; up to 50 formation rows (readiness badge, name, kind); militia pool summary. Rows clickable (jump to formation on map). When no game state: “Load a game state to view formations.”

- **Style:** Section headers in accent or bold; rows compact; same font (IBM Plex Mono), muted secondary text for counts.

---

## 6. Settlement / formation panel (right)

- **Width:** 340px. Slides in from right; when closed, map extends to right edge.
- **Background:** `#10101e`; left border can use faction-colored accent (e.g. 3px solid faction color when a settlement is selected).
- **Header:** Optional flag image (hidden if none) + **Name** (e.g. settlement name or formation name) + **Subtitle** (e.g. “Urban center • 12,340 • RBiH”) + close “×”.
- **Body:** Two-column layout within the panel:
  - **Left column — tabs:** Vertical tab list, min-width 72px. Tabs: OVERVIEW, CONTROL, MILITARY, ORDERS/EVENTS, HISTORY. Active tab: left border accent (e.g. 3px phosphor green or faction color).
  - **Right column — content:** Tab content area.

- **Tab content (summary):**
  - **OVERVIEW:** Name, type (sentence case), Population (1991), Population (Current) if displacement data exists; ethnicity bar (Bosniak/Croat/Serb/Other); municipality/admin; no SID/ID/provenance.
  - **CONTROL:** Controller (faction swatch + name), control status (CONSOLIDATED / CONTESTED / HIGHLY_CONTESTED).
  - **MILITARY:** Formations in municipality (name, kind, readiness, cohesion); rows clickable → open formation panel; militia pool (available/committed/exhausted).
  - **ORDERS/EVENTS:** Pending attack/move orders affecting this settlement; recent control events.
  - **HISTORY:** Control-change history for the settlement.

- **Formation panel (same 340px panel, different content):** Shown when user clicks a formation marker. **Brigade:** Chain of Command (prominent parent corps link), Statistics (personnel, posture, fatigue, cohesion), AoR summary, SET POSTURE dropdown, MOVE / ATTACK (target-selection mode), Clear Orders, zoom-to-selection. **Corps:** CORPS COMMAND (stance, exhaustion, span), STRENGTH, OPERATIONAL GROUPS, ORDER OF BATTLE (clickable rows), ACTIONS (stance dropdown + bulk Apply postures). **Army HQ:** ARMY COMMAND, subordinate corps list (click-through).

- **Panel styling:** Section headers uppercase, 10–11px; fields with label + value; buttons/dropdowns same as toolbar button style; faction swatches 12×12px or inline.

---

## 7. Main menu overlay

- **Full screen;** dark semi-transparent backdrop; centered card.
- **Card:** “A War Without Victory” (title), “Bosnia-Herzegovina, 1992–1995” (subtitle). Buttons: **New Campaign**, **Load Save**, **Load Replay**, **Continue**. Same button style as toolbar; stacked vertically.

---

## 8. New Campaign / side picker overlay

- **Modal card:** Header “New Campaign” + close “×”.
- **Scenario briefing:** Optional image + title “April 1992 — Independence” + short blurb. Scenario selector: radio options “September 1991 (Phase 0)” and “April 1992” (default).
- **Copy:** “Choose your side. Other factions are controlled by AI.”
- **Side options:** Three large buttons in a row (or grid):
  - **RBiH (ARBiH):** Flag 80×53, label “RBiH (ARBiH)”, badge “HARD”, short description.
  - **RS (VRS):** Flag, “RS (VRS)”, “STANDARD”, description.
  - **HRHB (HVO):** Flag, “HRHB (HVO)”, “MODERATE”, description.
- Buttons: card-like, border, hover state; flag from `/assets/sources/crests/flag_*.png`.

---

## 9. Other modals

- **AAR (After Action Report):** Header “After Action Report” + close; content area for control events / battle summary.
- **War Summary:** Per-faction formation count, personnel, attack/move order counts, control gained/lost; “BATTLES THIS TURN” section with settlement-level changes and faction colors.
- **Settings:** “Settings coming soon.” (centered muted text.)
- **Help:** Title “Help”; intro paragraph; “KEYBOARD SHORTCUTS” section with key + action rows (e.g. +/− Zoom, Home/F Fit map, Space Play/Pause, M Menu, O OOB, S Search, R Recruit, Esc Close).
- **Recruitment:** Title “Recruitment & Mobilization”; content = player-side recruitable brigades only, cost legend (C/E/M), table; footer “Activate brigade” button (disabled until selection).

- **Modal common:** Backdrop `rgba(0,0,0,0.6)`; card background `#161628`, border `#252540`, border-radius; header with title + “×”; content area scrollable if needed.

---

## 10. Typography and color reference (Figma tokens)

| Token | Value | Usage |
|-------|--------|--------|
| **Canvas / map bg** | `#0d0d1a` | Map background |
| **Background deep** | `#0a0a1a` | Root, map wrap |
| **Background panel** | `#10101e` | Sidebars, panel |
| **Background card** | `#161628` | Modals, cards |
| **Background toolbar** | `#111122` | Top bar |
| **Border main** | `#252540` | Default borders |
| **Border light** | `#303050` | Hover borders |
| **Text primary** | `#d8d8e0` | Primary text |
| **Text secondary** | `#8888a0` | Secondary |
| **Text muted** | `#555570` | Placeholder, hints |
| **Accent green** | `#00e878` | Active, zoom pill, turn |
| **Accent amber** | `#ffab00` | Warnings |
| **Accent red** | `#ff3d00` | Alerts |
| **Faction RS** | `rgb(180, 50, 50)` | RS (VRS) |
| **Faction RBiH** | `rgb(55, 140, 75)` | RBiH (ARBiH) |
| **Faction HRHB** | `rgb(50, 110, 170)` | HRHB (HVO) |

- **Font:** IBM Plex Mono (Weights: 300, 400, 500, 600, 700).  
- **Sizes:** 10px (labels, pills), 11px (buttons, small UI), 12px (body, turn display), section headers 10–11px uppercase + letter-spacing.

---

## 11. Suggested Figma frame and components

- **Frame:** 1440×900 or 1920×1080; background `#0a0a1a`.
- **Components to create:**
  - Toolbar (with zoom pill, buttons, turn display).
  - Map canvas (placeholder rectangle `#0d0d1a` with optional simplified settlement blobs and one sample front line).
  - OOB sidebar (header + war status block + formation list placeholder).
  - Settlement panel (header + vertical tabs + one tab content).
  - Formation panel (brigade variant: Chain of Command, Statistics, AoR, actions).
  - Minimap (200×150), legend, layer toolbar.
  - Main menu card; side picker card; AAR / War Summary / Help / Recruitment modal cards.
- **Variants:** Toolbar with/without “Recruit”; panel with settlement vs formation content; zoom pill STRATEGIC / OPERATIONAL / TACTICAL; OOB and right panel open/closed.

Use this spec to build a high-fidelity Figma mock that matches the current war map GUI for design review and iteration.

**Implementation note (2026-02-19):** The live tactical map has been updated with UX improvements: accessibility (ARIA live region, keyboard settlement navigation, focus-visible rings), larger click targets and 12px toolbar typography, desaturated accent green (`#00d470`), toolbar grouping (View | Tools | Info), wider panel tabs (90px, 10px), hover/selection glow and formation glow, tooltips with shortcuts, loading/error/empty states, and an optional quick tour. The Figma spec above still reflects the canonical layout and tokens; accent green in implementations uses `#00d470`.
