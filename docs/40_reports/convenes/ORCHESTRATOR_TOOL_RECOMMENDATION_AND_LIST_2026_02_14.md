# Tool recommendation and concrete tools list (launchable GUI)

**Date:** 2026-02-14  
**Owner:** Technical Architect + PM (T8)  
**Purpose:** Short tool recommendation (1–2 preferred options) with rationale and a **list of concrete tools we will need** so implementation can start with a clear stack. Based on T4 (runner/replay), T7 (architecture options), and scope (play myself + rewatch, non-web).

---

## 1. Recommendation (1–2 preferred options)

### Preferred: Electron + electron-builder

- **Rationale:** Fastest path to one launchable app that reuses the full tactical map and TypeScript sim. Main process runs `runScenario` and turn advance in-process (no subprocess); renderer is the tactical map (or warroom + map). Same codebase; determinism and replay format unchanged. Packaging is well-understood (electron-builder, one exe or installer).
- **Trade-off:** Larger bundle (Chromium + Node). Acceptable for “works and I can launch” on Windows (and optionally macOS/Linux).
- **Play myself:** Load scenario or saved state from UI → main runs init/runScenario or step advance → writes to app user dir → renderer loads state and refreshes map.  
- **Rewatch:** Load replay_timeline.json (file picker or “Last run”) → same replay playback as tactical map today.

### Alternative: Tauri + Node sidecar (if smaller binary is required)

- **Rationale:** Smaller binary (Rust host + system webview); no bundled Chromium. Tactical map still runs in webview; sim runs in Node sidecar (or require Node on PATH). Same replay and state format.
- **Trade-off:** Must ship or require Node; sidecar invocation and path contract add some integration work. Good if “small download” or “no Chromium” is a hard requirement.

### Godot

- **When to choose:** If we want a native game-engine feel and are willing to reimplement (or tightly embed) the map and panels in GDScript/C#. Sim stays in Node (subprocess or local server). More work for feature parity with current tactical map; recommended only if product explicitly prefers engine-centric UI and native look over reusing the existing map app.

---

## 2. Concrete tools we will need (Electron path)

Assuming **Electron** as the recommended path:

| Category | Tool / artifact | Purpose |
|----------|------------------|--------|
| **Runtime** | Node.js 20 LTS (or current LTS) | Same as project; Electron bundles Node in main process. |
| **Desktop shell** | Electron (e.g. ^28 or current stable) | Main process (Node) + renderer (Chromium). |
| **Packaging** | electron-builder | Produce .exe (Windows), .dmg/.app (macOS), or portable. Config: app id, icon, asar, extraResources if needed for data. |
| **Build** | Vite (existing) | Build tactical map (and/or warroom) as static bundle; Electron loads file:// or custom protocol. |
| **Map data** | Copy or link `data/derived/` (and required inputs) into app resources or user data dir | settlements_a1_viewer.geojson, political_control_data.json, etc.; serve via custom protocol or file path so map loads without dev server. |
| **Sim entry** | Existing `runScenario`, `runPhase0TurnAndAdvance`, Phase I/II browser runners | No new tools; call from Electron main. |
| **Optional** | electron-builder notarization (macOS) / code signing (Windows) | For distribution; not required for “launch and test” on own machine. |

**Concrete list (minimal):**

1. **Electron** — `npm install electron` (or yarn/pnpm).  
2. **electron-builder** — `npm install electron-builder --save-dev`; configure in package.json or electron-builder.yml (app id, directories, files, nsis/dmg).  
3. **Vite build for map** — Add or reuse `build:map` (Vite build of `src/ui/map/`) so output is a static bundle (e.g. `dist/tactical-map/`) that Electron can load.  
4. **Main process script** — e.g. `src/desktop/main.js` (or .ts compiled) that creates BrowserWindow, loads map index.html, exposes IPC for “run scenario”, “load state path”, “load replay path”, and invokes `runScenario` / turn advance in main.  
5. **Data path resolution** — Decide and implement: bundle `data/derived` in extraResources, or copy to user data dir on first run, or point to project data dir in development.  
6. **Replay / state paths** — App user data dir (e.g. `app.getPath('userData')/runs/`) for run output; pass paths to renderer for “Latest run” and “Load replay”.

---

## 3. Concrete tools we will need (Tauri path, if chosen)

| Category | Tool / artifact | Purpose |
|----------|------------------|--------|
| **Host** | Tauri 2.x (Rust) | App shell; system webview. |
| **Rust** | Rust toolchain (stable) | Build Tauri host. |
| **Node (sidecar)** | Node binary (bundled or on PATH) | Run scenario runner script; Tauri can bundle a prebuilt Node or invoke system node. |
| **Build** | Vite build for map (same as above) | Webview content. |
| **Contract** | Sidecar args + stdout or small JSON file in shared dir | Scenario path, options → outDir, replay_timeline path. |
| **Map data** | Same as Electron | Serve from Tauri asset dir or file://. |

---

## 4. Concrete tools we will need (Godot path, if chosen)

| Category | Tool / artifact | Purpose |
|----------|------------------|--------|
| **Engine** | Godot 4.x (e.g. 4.2 stable) | Editor + export. |
| **Export** | Godot export templates (Windows, etc.) | One-click export to .exe. |
| **Sim** | Node + scenario runner (subprocess or HTTP server) | Same as today; Godot spawns or talks to it. |
| **Map** | GeoJSON import in Godot, or WebView node (if available) | Render map in engine or embed existing map in browser node. |
| **Replay** | JSON parsing in GDScript/C# | Parse replay_timeline.json; drive map from frames. |

---

## 5. Summary

- **Recommended stack for implementation:** **Electron + electron-builder + Vite-built tactical map + existing sim in main process.**  
- **Concrete tools list (Electron):** Electron, electron-builder, Node 20 LTS, Vite, main process entry (e.g. `src/desktop/main.js`), build:map (or equivalent), data path strategy, user data dir for runs/replay.  
- **Alternative stacks:** Tauri + Node sidecar (smaller binary); Godot (engine-centric, more reimplementation). Use this memo when locking the stack in T9 phased plan.

---

*T8 deliverable; feeds T9 phased implementation plan.*
