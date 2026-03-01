# 3D Map and GUI Integration Report

**Date:** February 20, 2026
**Subject:** 3D Map Performance Optimization, Warroom/GUI Integration, and Electron Compilation Fixes

## Executive Summary
This report summarizes the modifications implemented to resolve severe application hangs, integrate the 3D WebGL (Night Satellite) map natively under the main game interface, resolve placeholder asset graphical bugs, and successfully stabilize the Electron desktop build. The standalone 3D sandbox has been successfully merged into the operational gameplay GUI.

---

## 1. 3D Map Performance Optimization (`map_operational_3d.ts`)
Previously, the `map_operational_3d.ts` viewer would completely freeze the application window upon startup on the "LOADING TERRAIN" step.

* **Texture Size Reduction:** Scaled down the main terrain texture generation dimensions (`TEX_W` and `TEX_H`) from `8192` to `2048`. The 67-million-pixel generation overhead was blocking the main thread, and `2048` provides sufficient fidelity at a fraction of the processing cost.
* **Heightmap Smoothing Optimization:** Reduced the CPU-bound smoothing loops when deriving the 3D terrain.

## 2. Integrated 3D Map beneath Tactical GUI (`tactical_map.html` & `MapApp.ts`)
The 3D map was previously operating as an isolated development routing (`map_operational_3d.html`), entirely bypassing the actual game HUD (sidebars, turn clocks, orders).

* **Architecture Change:** Extracted the core Three.js instancing loop from `map_operational_3d.ts` by exposing an `init3DMap(container)` function, removing auto-executing closures.
* **Native Embedding:** Created an `#operational-3d-container` element sitting natively in the DOM under the main `tactical_map` interface. 
* **Seamless Toggle Interaction:** Expanded `MapApp.ts` to bridge user layer interactions with the `<input type="checkbox" id="layer-3d">`. When active, it displays the 3D WebGL container while preserving standard 2D map opacity and pointer events.
* **Default Active:** Set the initial game-load layer state such that the 3D WebGL tactical map initiates completely by default.

## 3. Re-Routed Development and Production Entrypoints
Reverted dev server rules and Electron launch configurations that forcefully pushed users into the isolated sandbox environments.
* **Electron (`electron-main.cjs`):** Swapped default load URL backward to strictly serve `tactical_map.html`.
* **Warroom Flow (`warroom.ts`):** Ensuring that completing the Campaign faction and scenario selection drops the payload directly into `tactical_map.html`.
* **Vite (`vite.config.ts`):** Root redirect rules are now correctly pointing local compilation into the canonical game environment.

## 4. Main Menu Speed & Graphical Fixes (`warroom.ts` / `index.html`)
The "New Campaign" screen displayed a yellow overlay artifact and suffered from unresponsive interactions directly following load.
* **Graphical Replacement:** Deleted the placeholder `game start.png` AI-generated asset, which caused yellow graphical artifacting across the main menu. Replaced the loading screen backing with a clean, programmatic CSS radial gradient (`rgba(30, 40, 60, 0.95)` to `rgba(5, 5, 15, 0.98)`).
* **DOM Event Blocking:** The buttons (`New Campaign`, `Load Save`) were not triggering because they were programmatically wired *after* `warPlanningMap.loadData()` downloaded heavy synchronous GeoJSON structures. The event listeners `wireMainMenuButtons()` were moved to the direct peak of `init()`, making the menu instantly clickable.

## 5. Electron `protocol` API Crash Repair
The desktop bundling pipeline failed upon attempting to launch the `.exe` logic via `electron-main.cjs`.
* **Privileged Scheme Bug:** The previous code attempted to register custom API privileges (`awwv://`) before the application was initialized using an outdated or unsafe destructuring of the `protocol` object. 
* **Fix Applied:** Modified line 38 to dynamically verify and invoke `require('electron').protocol.registerSchemesAsPrivileged`, successfully compiling the Desktop Sim build without `TypeError: Cannot read properties of undefined` failures.
