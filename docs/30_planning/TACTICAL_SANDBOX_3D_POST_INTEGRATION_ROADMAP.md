# Phase 6D: Tactical Sandbox 3D Map - Post-Integration Roadmap

**Date:** 2026-02-20
**Author:** Antigravity (Orchestrator Role)
**Status:** Draft - Future Polish and Streamlining Ideas
**Context:** These features are intended for implementation *after* the initial 3D Map Integration (Phases 6A-6C) is complete and stabilized. They focus on quality of life, performance, and aesthetic polish for a premium 1990s wargame experience.

---

## 1. Gameplay Mechanics: Solving the "Doomstack" & Surround Loopholes

### 1.1 Combat Width & Local Supply Ceiling
* **The Problem:** Currently, combat pressure scales primarily with density (personnel per area). Without limits, players/AI might exploit this by stacking excessive numbers of brigades in a single municipality to create unstoppable "doomstacks".
* **The Solution:** Introduce a **Combat Width** or **Local Supply Ceiling** for settlements/municipalities.
    * If a settlement exceeds a specific personnel density threshold, additional units contribute **zero** marginal combat pressure.
    * However, these surplus units still suffer casualties and accrue accelerated exhaustion due to crowding, friendly fire, and strained local logistics.
    * *Implementation note:* Requires updates to `brigade_pressure.ts` and `resolve_attack_orders.ts` to cap the effective personnel used in combat power calculations.

### 1.2 The "Free Teleport" Loophole (Surrounded Brigades)
* **The Problem:** The recently added `surrounded-brigade-reform` rule allows a brigade whose AoR is entirely cut off to automatically "reform" back in its home municipality. This could be exploited as a free teleport to save trapped units from annihilation.
* **The Solution:** Add severe penalties to the "reform" process, reflecting the reality of breaking out of a pocket or escaping without heavy gear.
    * When a brigade reforms due to being surrounded, its **personnel** should be severely depleted (representing troops taken POW, MIA, or breaking route).
    * Its **heavy equipment** (tanks, artillery, AA) should be permanently destroyed/abandoned (set to 0) or captured by the surrounding faction.
    * Its **cohesion** should instantly drop to `1` (or near zero), forcing it into a prolonged `forming` or degraded state before it can be used again.

---

## 2. Streamlining UX: Eliminating "Order Friction"

### 2.1 Contextual Right-Clicking (Standard GSG UX)
* **The Problem:** The Sandbox currently relies on explicit mode switching (clicking "MOVE" or "ATTACK" buttons on the toolbar) to issue orders. This is tedious for managing 100+ brigades.
* **The Solution:** Implement contextual right-click actions on the 3D map.
    * **Action:** Select a friendly brigade (Left Click).
    * **Context:** Right-click an **enemy** settlement within movement/attack range.
    * **Result:** Automatically stages an `attack-order` (prompts the confirmation panel if necessary).
    * **Context:** Right-click a **friendly** or **uncontrolled** settlement within movement range.
    * **Result:** Automatically stages a `move-order`.
    * *Benefits:* Significantly reduces mouse travel and makes the interface feel fluid and tactile, matching modern grand strategy standards (e.g., HoI4, EU4).

### 2.2 Managing Large Orders of Battle (100+ Brigades)
* **The Problem:** As the war progresses, players may field hundreds of brigades. Finding units in contact or managing the front line becomes overwhelming.
* **The Solution: "Frontline Overview" and Quick Filters**
    * **Frontline Highlight Hotkey:** A hotkey (e.g., 'F') that temporarily highlights all friendly brigades currently **in contact** with the enemy (i.e., adjacent to enemy territory), dimming all rear-echelon units.
    * **"Idle Brigades" Alert/Filter:** Add a toggle in the OOB sidebar or an interface alert to quickly cycle through brigades that have high cohesion, are near the front, but currently have *no orders* and are in a passive posture (like `defend` when an attack might be warranted).
    * **Quick Posture Painting:** Allow the player to select a corps, choose a posture (e.g., `Attack`), and "paint" that posture across all subordinate brigades on the map with a click-and-drag, rather than setting it individually or via a clunky dropdown.

### 2.3 Corps AoR Visualization
* **The Problem:** The current visualization focuses on brigade-level AoRs. With the implementation of Corps Command structures, players need to see the broader operational picture.
* **The Solution: Corps-Level Overlays**
    * When a **Corps HQ** is selected (or via a new layer toggle), group the AoRs of all its subordinate brigades and draw a **thick, distinct perimeter border** around the entire Corps operational area.
    * Use a different, softer crosshatch pattern for the Corps area to distinguish it from individual brigade AoRs.
    * This helps players ensure their Corps fronts are contiguous and identify gaps in the line at the operational level.

---

## 3. Polish: The "NATO Ops Center" Atmosphere

### 3.1 3D Post-Processing (The "CRT Look")
* **The Problem:** Moving from 2D Canvas to WebGL/Three.js often results in a map that looks "too clean" or sterile, losing the gritty, tactile feel of the original UI.
* **The Solution:** Implement a Three.js `EffectComposer` post-processing pass over the 3D canvas.
    * **Subtle CRT Scanlines:** Overlay a faint scanline pattern.
    * **Chromatic Aberration:** Add very slight color fringing at the edges of the screen to simulate an old monitor.
    * **Vignette:** Darken the corners to focus attention on the center of the map.
    * **Phosphor Glow:** Ensure bright elements (like front lines and selected units) have a slight bloom/glow effect.
    * *Goal:* Make the 3D map feel like it's being viewed through a military-grade CRT monitor in a 1990s command bunker.

### 3.2 Immersive Audio Design (Foley & Ambience)
* **The Problem:** Visuals alone aren't enough for a premium feel. The game currently lacks an audio landscape.
* **The Solution:** Plan a comprehensive audio subsystem.
    * **Ambience:** A continuous, low-volume "server room" or "command bunker" hum (fans cooling equipment, distant muted conversations).
    * **UI Foley:** Sharp, satisfying mechanical "clacks" when pressing buttons or placing orders (like pressing heavy plastic buttons on a console).
    * **Radio Chatter:** When selecting a formation, play a brief, randomized snippet of radio static or "squelch". For major operations, perhaps faint, unintelligible tactical radio chatter.

---

## 4. Code Execution & Architecture

### 4.1 Defending Determinism: The 52-Week Headless VCR Test
* **The Problem:** Integrating the 3D Sandbox code into `MapApp.ts` risks breaking the engine's strict determinism. If the UI accidentally mutates the `GameState` (e.g., during floating-point coordinate calculations or picking), replays will desync.
* **The Solution: Automated 'VCR' Regression Testing**
    * The 3D Viewer must be strictly **read-only** regarding the `GameState` (only emitting IPC actions/orders).
    * Before declaring Phase 6 complete, establish a robust headless "VCR" test:
        1. Run a 52-week simulation using the CLI harness with a fixed seed. Save the final hash (`final_save.json`).
        2. Run the exact same sequence of turns/orders through the new 3D GUI (perhaps using an automated test script like Playwright to simulate clicks, or just feeding the staged orders through the IPC layer).
        3. Assert that the resulting `final_save.json` hash perfectly matches the CLI hash.
    * *Goal:* Guarantee that the 3D rendering pipeline introduces zero butterfly effects to the combat math.

### 4.2 "Fog of War" Memory (Intel System)
* **The Problem:** The current plan for Fog of War simply hides enemy formations if `meta.player_faction` is set. This is binary and unrealistic.
* **The Solution: "Ghost Counters" (Last Known Position)**
    * Track the last known position and timestamp of enemy units that break contact.
    * Instead of vanishing instantly, enemy NATO counters remain on the map in their last known location but are rendered **faded out/translucent** with a `?` superimposed over them.
    * As turns pass without renewed contact, the "Ghost Counter" becomes more transparent until it eventually disappears.
    * This adds strategic depth, forcing the player to deal with imperfect, stale intelligence rather than perfect invisibility.

---

## 5. Visual Overhaul: The "Tracestrack Topo" Objective

### 5.1 The Goal
* **The Problem:** The current "NATO Ops Center" (dark canvas with phosphor green) aesthetic is somewhat sterile for a 3D terrain map.
* **The Solution:** Transition to the "Tracestrack Topo" (OpenStreetMap `layers=P`) visual style. This style is highly detailed, physically-inspired, and focuses on terrain relief and operational clarity, making it a strong reference for communicating both topography and military positioning.

### 5.2 Implementation Details
* **The Terrain Palette:** Shift the elevation color ramp (`getColorForElevation(z)`) to use lighter, vibrant greens for the valleys (e.g., `#d1e2b6`), transitioning to pale yellows (`#e7e3c3`) for mid-elevations, and light tans for peaks.
* **"Cased" Road Networks:** Draw roads onto the offscreen canvas texture in **two passes**.
    * *Pass 1 (The Casing):* Draw all roads with a dark grey stroke (`#555`, `lineWidth: 4`).
    * *Pass 2 (The Fill):* Draw all roads again directly over the casing with a slightly thinner stroke (`lineWidth: 2`). Use Red/Orange for Major Supply Routes (MSRs) and Yellow for secondary roads.
* **Typography with "Halos":** Apply heavy white halos around all labels to ensure text readability over complex terrain and bright roads. Uses `.strokeText` with an opaque white halo (`rgba(255, 255, 255, 0.9)`, `lineWidth: 4`) before `.fillText` with dark grey (`#222222`).
* **Water Bodies & Settlements:** Use a crisp, solid light cyan (`#7bc0cf`) for rivers. Change the settlement polygon fill inside `buildBaseTexture()` from off-white to a translucent pale tan/grey (`rgba(210, 200, 190, 0.4)`).
* **Lighting and Hillshading:** Enhance visual depth either through painted multidirectional hillshading or by tweaking Three.js lighting (sharp white light from Top-Left/North-West, with cool `AmbientLight` for shadows).
