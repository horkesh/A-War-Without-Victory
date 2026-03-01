# GUI design advisor — handover report

**Date:** 2026-02-14  
**Purpose:** Handover to an expert GUI/UX advisor for **design guidance** (elements, readability, information panels, layout) before implementing Phase 3 (play myself) and Phase 4 (polish). This report summarizes what exists, what is planned, and what we need from the advisor.

**Audience:** External or internal GUI/UX design expert who will advise on visual design, information hierarchy, and interaction patterns. Implementation will follow in a later phase.

---

## 1. Product context

- **Project:** A War Without Victory (AWWV) — wargame simulation prototype set in Bosnia and Herzegovina (BiH), 1992.
- **Scope (locked):** One **launchable desktop application** (non-web) that supports:
  1. **Play myself** — Load a scenario or saved state; advance turns; see map and state update.
  2. **Rewatch runs** — Load a replay file; play/pause/step through weeks.
- **Current stack:** Electron + tactical map (Canvas 2D, no Leaflet/Mapbox). Sim runs in main process (Phase 3) or via CLI; map and panels in renderer.
- **Constraints:** Canon and determinism are non-negotiable; no new game mechanics. Design advice must respect existing data and controls; we can restyle, re-layout, and clarify, not invent new systems.

---

## 2. What exists today

### 2.1 Launchable desktop app (Phase 1 + 2 — done)

- **Entrypoint:** `npm run desktop` (Electron). Build map first: `npm run desktop:map:build`.
- **What the user sees:** One window with the **tactical map** (full screen of the app). Menu: **File → Open replay...**, **File → Quit**. No main menu “New game” or “Advance turn” yet (Phase 3).
- **Data:** Map and panels load from project `data/derived/` (dev) or from app resources (packaged). Crests/flags from `assets/sources/crests/` (copied into build).

### 2.2 Tactical map — current UI inventory

The map is the primary view. All of the following are **already implemented** and visible when you run the app or `npm run dev:map` (browser).

| Area | Elements | Notes |
|------|----------|--------|
| **Top toolbar** | Zoom pill (STRATEGIC / OPERATIONAL / TACTICAL), +/- zoom buttons, Legend, Ethnic 1991, OOB, Search, Turn display, Army strength (e.g. “RBiH 16,019 \| RS 14,020 \| HRHB 975”) | Single row; turn and army strength on the right. |
| **Map canvas** | ~5,800 settlement polygons, political control fill (RS crimson, RBiH green, HRHB blue, neutral grey), front lines, optional labels, formation markers (crest + NATO symbol when state loaded) | Canvas 2D; pan/zoom; click settlement opens right panel. |
| **Minimap** | Small overview with viewport rectangle | Bottom-left of map. |
| **On-canvas controls** | +/- zoom buttons, Legend box (content depends on Political vs Ethnic 1991), **Layers** panel (collapsible) | Layers panel contains dataset dropdown, Load State, Load Replay, Open last run, Play replay, Export replay, replay status. |
| **Left sidebar (OOB)** | “ORDER OF BATTLE” header, close button, list of formations grouped by faction (RBiH, RS, HRHB) with crest, name, kind, personnel; click formation highlights AoR on map | Shown when “OOB” toolbar button toggled; populated when game state or replay loaded. |
| **Right panel (settlement/brigade)** | Header (flag, name, subtitle), **tabs: OVER, ADMIN, CTRL, INTEL**; tab content varies by selection (settlement vs brigade) | Settlement: overview, admin (mun, pop, ethnicity), control, intel. Brigade: ID, faction, kind, status, personnel, posture, fatigue, cohesion, AoR counts, operational coverage (cap, covered, overflow, urban fortress). |
| **Search overlay** | Text input, result list (settlement names); diacritic-insensitive | Opens from toolbar Search. |
| **Status bar** | One line at bottom: “Loading map data...” or “Ready” / error | |
| **Replay** | Load Replay... (file picker), Open last run (Electron only), Play replay, Export replay, replay status text | Replay controls live inside the Layers panel. |

**Visual style:** Dark wargame theme (dark background, light text, faction colors). CSS: `src/ui/map/styles/tactical-map.css`. No formal design system yet; colors and spacing are consistent but not documented for a designer.

### 2.3 Warroom (separate GUI — not in desktop app yet)

- A separate browser-based “headquarters” UI exists (`src/ui/warroom/`, `npm run dev:warroom`): desk, clickable regions (newspaper, magazine, map, etc.), War Planning Map overlay.
- It is **not** currently part of the Electron desktop app. Desktop app is **tactical map only** for Phases 1–3. Warroom integration, if any, would be later.
- Backlog items (WR-1–WR-6, etc.) in `docs/50_research/gui_improvements_backlog.md` apply to warroom; P0 items may apply to the launchable app when we do Phase 4.

### 2.4 What we implemented (summary)

- **Phase 1:** Electron shell, custom protocol (`awwv`) serving map app + `data/derived` + assets; Windows-focused; map loads and renders.
- **Phase 2:** Rewatch in app: Load Replay (file picker), File → Open replay (menu), Open last run (Electron), play/pause/step; IPC and “Open last run” wired. Replay format unchanged; no design changes to panels or toolbar.

---

## 3. What is planned (before design pass)

| Phase | Goal | Status |
|------|------|--------|
| **Phase 3** | Play myself: “New game” / “Load scenario” / “Load state”; “Advance turn”; map and state update each week. Sim runs in Electron main. Optional “Run to end” then “Rewatch”. | Not started; awaiting design input. |
| **Phase 4 (optional)** | Polish: P0 items from gui_improvements_backlog (e.g. phase/turn always visible, placeholder labels, modal consistency). | Not started. |

Planned **new UI elements for Phase 3** (to be designed):

- Entry points for “New game” / “Load scenario” / “Load state file” (menu or toolbar).
- “Advance turn” (or “Next week”) control — prominent and clear.
- Progress indication when “Run to end” is used (e.g. “Week 12/52”).
- Optional: after a run completes, “Rewatch” action that loads the generated replay.

All of the above need placement, hierarchy, and readability guidance from the design advisor.

---

## 4. What we need from the GUI design advisor

We want **design guidance** so that the next implementation phase (Phase 3 and 4) can follow a clear, readable, and consistent GUI design. We are **not** asking the advisor to implement code.

### 4.1 Suggested focus areas

1. **Layout and hierarchy**
   - Toolbar: density, grouping (zoom vs layers vs replay vs play), priority of “Advance turn” and “Load scenario” when added.
   - Panels: OOB (left) vs settlement/brigade (right) — size, collapse behavior, and whether replay/load controls should move (e.g. to menu or a dedicated “Game” strip).
2. **Readability**
   - Typography: font sizes, weights, and contrast for labels, values, and status text (including turn display, army strength, replay status).
   - Tables/lists: OOB rows, formation lists, settlement search results — spacing, alignment, and scanability.
   - Panel content: OVER / ADMIN / CTRL / INTEL and brigade sections (BRIGADE, STATISTICS, AoR, OPERATIONAL COVERAGE) — section headers vs field labels vs values.
3. **Information panels**
   - Settlement panel: what to show first, how to group (overview vs admin vs control vs intel); flag/crest usage.
   - Brigade panel: same; operational coverage and AoR numbers — how to avoid clutter while keeping data available.
   - OOB sidebar: grouping by faction, formation rows (crest, name, kind, personnel); whether to add more columns or keep minimal.
4. **Controls and actions**
   - Buttons: primary vs secondary (e.g. “Advance turn” vs “Load State...”); consistency of “Load Replay...”, “Open last run”, “Play replay”, “Export replay”.
   - Where to put “New game” / “Load scenario” / “Load state” and “Advance turn” (menu, toolbar, or dedicated strip).
   - Replay controls: keep in Layers panel vs separate toolbar row vs menu-only.
5. **Consistency and polish**
   - Naming: “Load State” vs “Load scenario” vs “Load replay”; “Open last run” vs “Last run”.
   - Phase/turn visibility: ensure phase and turn are always visible (P0 backlog); where and how.
   - Modals/dialogs: if we add “New game” or “Run to end” dialogs, style and behavior (ESC, backdrop) consistent with existing patterns.
   - Accessibility: aria labels, focus order, keyboard use — we have some; advisor can recommend improvements.

### 4.2 Deliverables we hope for (flexible)

- Short **design memo or checklist** (layout, typography, panels, controls) that implementation can follow.
- Optional: **wireframes or annotated screenshots** for current map + proposed placement of Phase 3 controls and any panel changes.
- Optional: **style notes** (e.g. primary/secondary button style, section header style) that we can encode in CSS.

No specific format is required; the goal is that a developer can read the advisor’s output and apply it in Phase 3/4 without inventing layout or hierarchy.

---

## 5. Key documents and how to run the app

| Document | Content |
|----------|---------|
| [ORCHESTRATOR_GUI_PLAY_AND_REWATCH_SCOPE_2026_02_14.md](../convenes/ORCHESTRATOR_GUI_PLAY_AND_REWATCH_SCOPE_2026_02_14.md) | Locked scope: play myself + rewatch, launchable, non-web. |
| [ORCHESTRATOR_PHASED_IMPLEMENTATION_PLAN_GUI_2026_02_14.md](../convenes/ORCHESTRATOR_PHASED_IMPLEMENTATION_PLAN_GUI_2026_02_14.md) | Phase 1–4 plan (1 and 2 done; 3 and 4 planned). |
| [TACTICAL_MAP_SYSTEM.md](../../20_engineering/TACTICAL_MAP_SYSTEM.md) | Engineering reference: map data, state, rendering, file list. |
| [src/desktop/README.md](../../../src/desktop/README.md) | Desktop app commands and Phase 2 rewatch. |
| [gui_improvements_backlog.md](../../50_research/gui_improvements_backlog.md) | P0/P1/P2 warroom and polish items (WR-1–WR-6 etc.). |
| [CONSOLIDATED_BACKLOG.md](../CONSOLIDATED_BACKLOG.md) §4 | GUI / War Planning Map / Warroom backlog and handovers. |

**Run the app (desktop):**

```bash
npm run desktop:map:build
npm run desktop
```

**Run the map in browser (same UI, no menu):**

```bash
npm run dev:map
# Open http://localhost:3001/tactical_map.html
```

**Generate a replay file (to test Load Replay / rewatch):**

```bash
npm run sim:scenario:run -- --scenario data/scenarios/apr1992_phase_ii_4w.json --video --map --out runs
# Then in app: Load Replay... → choose runs/<run_id>/replay_timeline.json
```

---

## 6. Constraints (for the advisor)

- **Canon:** Game rules, data semantics, and control/formation/OOB meaning are fixed. We can change how we *present* them, not what they mean.
- **Determinism:** No timestamps or randomness in UI that could affect simulation or saved outputs. Design should not require non-deterministic behavior.
- **Scope:** Phase 3 is “play myself” (load, advance turn, optional run to end + rewatch). We are not asking for war system (order-giving) or full warroom redesign in this handover; focus is the **tactical map + panels + desktop menu/toolbar** and where to put new Phase 3 controls and information.

---

## 7. Summary

- **Done:** Launchable Electron app with tactical map; rewatch (Load Replay, File → Open replay, Open last run, play/pause/step). Current UI: toolbar, layers panel, OOB sidebar, settlement/brigade right panel, search, minimap, replay controls.
- **Planned:** Phase 3 (play myself: load scenario/state, advance turn, optional run to end + rewatch); Phase 4 (P0 polish). New controls and possibly layout changes needed.
- **Ask:** Design guidance on layout, readability, information panels, and control placement so we can implement Phase 3 and 4 with a clear, consistent GUI. Deliverable: design memo and/or wireframes/style notes; no implementation by the advisor.

---

*Handover for GUI design advisor; implementation will follow design guidance in a later phase.*
