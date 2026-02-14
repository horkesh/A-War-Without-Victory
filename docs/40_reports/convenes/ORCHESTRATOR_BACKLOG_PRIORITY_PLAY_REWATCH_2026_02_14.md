# Backlog priority for play-myself + rewatch (excerpt)

**Date:** 2026-02-14  
**Owner:** PM (T6)  
**Purpose:** Prioritized short list of backlog items that support launchable GUI with play myself and rewatch. Source: CONSOLIDATED_BACKLOG §4 (GUI/War Planning Map), gui_improvements_backlog P0/P1/P2.

---

## 1. Priority order for launchable “play + rewatch”

| Order | Item | Rationale |
|-------|------|-----------|
| **1** | **Launchable packaging first** | No item helps “play myself” or “rewatch” if the user cannot launch the app. Tool choice (T8) and packaging (Electron/Godot/Tauri) are prerequisite. Not in backlog as a single ticket; covered by plan T8/T9. |
| **2** | **Unified “play myself” flow** | Load scenario or saved start → advance turn → see map update. Today warroom has advance but no scenario/save load; tactical map has load state but no advance. Backlog: PHASED_PLAN_MAP_AND_WAR_SYSTEM (Track A), IMPLEMENTATION_PLAN_GUI_MVP (scope: base map, layers, interaction). |
| **3** | **Rewatch in launchable app** | Replay timeline already supported by tactical map; launchable app must include same capability (load replay_timeline.json, play/pause/step). No separate backlog ticket; part of “single launchable app” scope. |
| **4** | **Base map + layers (strategic direction)** | GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION: base geographical map then layers. IMPLEMENTATION_PLAN_GUI_MVP, WAR_PLANNING_MAP_* docs. Tactical map and War Planning Map already have base + layers; any new or unified map must follow same pillar. |
| **5** | **Settlement click (settlement / municipality / side)** | Required per strategic direction. Already in tactical map and War Planning Map; retain in launchable app. |
| **6** | **P0 warroom polish (gui_improvements_backlog)** | WR-1–WR-6: placeholder labels, diplomacy message, faction (Est.), wall vs overlay doc, modal ESC, phase/turn visible. Safe, MVP-compatible; do when warroom is part of launchable app or before. |
| **7** | **P1 warroom (optional for “play + rewatch”)** | WR-7–WR-9: map hover tooltips, zoom center on click. Improves UX; not blocking for play or rewatch. |

---

## 2. Backlog reports to keep in view

- **CONSOLIDATED_BACKLOG §4:** IMPLEMENTATION_PLAN_GUI_MVP, GUI_AND_WAR_SYSTEM_STRATEGIC_DIRECTION, WAR_PLANNING_MAP_CLARIFICATION_REQUEST, PHASED_PLAN_MAP_AND_WAR_SYSTEM, UI_DESIGN_SPECIFICATION, NATO_AESTHETIC_SPEC.
- **gui_improvements_backlog:** P0 (WR-1–WR-6) for polish; P1 for UX extensions. P2 (Phase II+) out of scope for initial launchable play+rewatch.

---

## 3. Out of scope for initial “play + rewatch”

- War system (order-giving, chain of command) — separate track per strategic direction.
- Full War Planning Map “full scene” (if distinct from “map with layers + settlement click”) — clarify with PM/Game Designer; may be same as unified map in launchable app.
- Phase II+ diplomacy, B3 negotiation, etc. — post-MVP.

---

*T6 deliverable; feeds T9 phased plan.*
