# Paradox Team Convene: War Planning Map — Full-Screen Scene Implementation

**Date:** 2026-02-07  
**Convened by:** Orchestrator  
**Purpose:** Discuss how to implement [GUI_WAR_PLANNING_MAP_EXPERT_HANDOVER.md](GUI_WAR_PLANNING_MAP_EXPERT_HANDOVER.md) with a critical constraint: **the wall map click must open a whole new full-screen scene, not an overlay.**

---

## 1. Orchestrator Opening

**Strategic direction:** The War Planning Map is the primary game surface — "the meat of the game." The handover doc describes what it must show (base geography, layers, settlement click panel, zoom levels, etc.). 

**Critical constraint (user-specified):** Clicking the wall map must **not** show an overlay on top of the warroom. It must open a **whole new full-screen scene** dedicated to the map. The player transitions into a distinct, immersive map context.

**Current state:** The War Planning Map is implemented as an overlay (`war-planning-map-overlay`, `position: fixed`, `visibility` toggle). It sits on top of the warroom canvas and shares the same page. This does **not** satisfy the requirement.

---

## 2. Role Inputs

### 2.1 Product Manager

**Scope impact:** Treating the map as a full-screen scene changes the interaction model and navigation architecture. We need:

- **Scene transition:** Warroom → Map Scene → back to Warroom (close/dismiss).
- **No shared viewport:** When in map scene, the warroom is not visible. Clean context switch.
- **Return affordance:** Clear "Close" or "Back to HQ" so the player can exit. (ESC and [×] already exist in WarPlanningMap; they remain valid.)

**Phasing:** 
- **Phase A:** Refactor current overlay into a full-screen scene (same content, different presentation/context).
- **Phase B:** Implement handover spec (settlement panel, layers, zoom, etc.) within that scene.

**Assumption:** "Full-screen scene" means either (1) hide warroom DOM and show map in its place, or (2) route to a separate URL/view. Both achieve the same UX; implementation choice is technical.

---

### 2.2 Game Designer

**Design intent:** The map is "the same map, detailed" — same base geography as the wall map, but with more layers and interaction. The player enters a focused planning mode. A full-screen scene reinforces that: the map becomes the sole focus, no desk/wall/crests. This aligns with the game's mental model of "stepping up to the map."

**Acceptance:** Full-screen scene satisfies design intent. Overlay felt like a quick peek; full-screen signals "you are now in planning mode."

---

### 2.3 Technical Architect

**Options for full-screen scene:**

| Option | Description | Pros | Cons |
|--------|-------------|------|------|
| **A. Scene swap (same page)** | Hide warroom container; show map container. Single SPA, no route change. | Simple; preserves shared state; no URL/routing. | Both scenes loaded; need clear show/hide of root containers. |
| **B. Route-based** | `/warroom` vs `/warroom/map` (or `/map-planning`). Map is a separate view. | Clean separation; bookmarkable; back button semantics. | Requires router; state handoff (gameState) between views. |
| **C. New window** | `window.open()` for map. | True isolation. | Complex state sync; awkward UX for a primary flow. |

**Recommendation:** Option A (scene swap) for MVP. Minimal change: we already have `WarPlanningMap`; we change *where* it lives and *how* we show it. Instead of an overlay div, we:
1. Have a root container for "Warroom scene" (canvas + desk instruments + etc.).
2. Have a root container for "Map scene" (full-screen map).
3. On wall map click: hide Warroom scene, show Map scene. On close: reverse.

**Coordination spaces:** Unchanged. Map still uses A1_BASE_MAP, political_control_data, etc. No mixing of coordinate systems.

---

### 2.4 UI/UX Developer

**Current implementation:** `WarPlanningMap` is a `div.war-planning-map-overlay` appended to `#war-planning-map-root`, with a frame, backdrop, and canvas. `show()` adds `war-planning-map-visible`; `hide()` removes it. The overlay has `max-width: calc(100vw - 48px)`, `max-height: calc(100vh - 48px)`, and margin — it is not truly full-screen; it has a frame/border.

**Changes needed for full-screen scene:**
1. **Scene architecture:** Two root containers, e.g. `#warroom-scene` and `#map-scene`. Only one visible at a time.
2. **Map scene styling:** Map should occupy 100vw × 100vh. No backdrop dimming the warroom (warroom is hidden). Optional: subtle frame or none — the map *is* the scene.
3. **Transition:** Optional fade between scenes for polish. Not required for MVP.
4. **Close:** [×] and ESC return to warroom. Button label: "Back to HQ" or "Close" — per handover, expert decides.

**Accessibility:** Focus trap when in map scene; keyboard nav for layer toggles, settlement panel, close. No critical info by color alone.

---

### 2.5 Wargame Specialist

**NATO aesthetic:** Full-screen map reinforces the "operations room" feel — the large situation map is the center of attention. No distraction from desk props. Good for tactical focus.

**OOB layer (Phase II):** Full-screen scene will accommodate brigade/corps boundaries and symbols without crowding. Same handover spec applies.

---

## 3. Synthesis and Decision

**Agreed approach:** Implement a **scene swap** (Option A). Wall map click transitions from Warroom scene to Map scene. The map is shown full-screen (or near-full with minimal chrome). Close/ESC returns to Warroom.

**Concrete steps:**
1. Add `#warroom-scene` and `#map-scene` (or equivalent) containers. Warroom scene contains canvas, desk, modals. Map scene contains WarPlanningMap.
2. Move WarPlanningMap out of overlay pattern: it becomes the sole content of Map scene. Remove or repurpose backdrop (no need to dim warroom — it is hidden).
3. Update `ClickableRegionManager` / `openWarPlanningMap()`: instead of `warPlanningMap.show()`, trigger scene transition (hide warroom, show map scene).
4. WarPlanningMap close callback: trigger reverse transition (hide map scene, show warroom).
5. Update handover doc or add addendum: "Map opens as full-screen scene, not overlay."

**Scope boundary:** This convene addresses the **full-screen scene** requirement. Detailed implementation of settlement panel layout, zoom interaction, layer placement, etc. remains per the handover and expert proposal. PM to sequence Phase A (scene refactor) before further handover implementation.

---

## 4. Handoff

| From | To | Action |
|------|-----|--------|
| **Orchestrator** | **Product Manager** | Produce phased plan for full-screen scene refactor + handover implementation. Use awwv-plan-change for implementation steps. |
| **Product Manager** | **UI/UX Developer** | Implement scene swap and WarPlanningMap full-screen presentation per steps above. |
| **Technical Architect** | **UI/UX Developer** | Confirm container structure and state handoff (gameState passed to map scene). |

---

## 5. Constraints (Unchanged)

- **Canon:** No invented mechanics.
- **Determinism:** No timestamps, random seeds, nondeterministic iteration in sim-facing code.
- **Read-only for MVP:** Map inspects state; does not mutate simulation state.
- **Patterns:** `.agent/napkin.md`, NATO aesthetic, coordinate spaces.

---

## 6. Reference Documents

| Doc | Purpose |
|-----|---------|
| [GUI_WAR_PLANNING_MAP_EXPERT_HANDOVER.md](GUI_WAR_PLANNING_MAP_EXPERT_HANDOVER.md) | Primary spec; addendum: map opens as full-screen scene |
| [CLICKABLE_REGIONS_SPECIFICATION.md](CLICKABLE_REGIONS_SPECIFICATION.md) | wall_map action: change from overlay-open to scene-transition |
| [IMPLEMENTATION_PLAN_GUI_MVP.md](IMPLEMENTATION_PLAN_GUI_MVP.md) | Phase 4 interaction specs |

---

**Orchestrator:** Team aligned. Full-screen scene is the required UX. PM to draft implementation plan; UI/UX Developer to execute scene swap. Handover spec content (layers, settlement panel, zoom) applies unchanged within the new scene.
