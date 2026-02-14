# Integration architecture options (launchable, non-web)

**Date:** 2026-02-14  
**Owner:** Technical Architect (T7)  
**Purpose:** 2–3 architecture options for a single launchable application that supports play myself and rewatch. ADR-ready bullets.

---

## 1. Option A: Electron shell around tactical map + in-process sim

**Description:** One Electron app. Main process (Node) holds game state and runs `runScenario` / turn advance (same codebase as today). Renderer loads the **tactical map** UI (current `src/ui/map/` built as Vite app, loaded in BrowserWindow). Play: user picks scenario or “New game” in UI → main runs init or runScenario (or step-by-step advance); main writes artifacts to app user dir; renderer loads state/replay from paths via IPC or file://. Rewatch: user picks replay_timeline.json (file picker or from last run); renderer parses and plays as today.

**Data flow:**
- Run/advance: Renderer → IPC → Main runs runScenario or runTurn → writes final_save, replay_timeline to disk → IPC paths to Renderer → Renderer loads and displays.
- Rewatch: User selects file or “Last run” → Main returns path or content → Renderer uses existing replay playback logic.
- Map data (GeoJSON, political_control_data): Bundled or read from app-relative path (e.g. resources/data); main or renderer fetches same as dev server.

**Pros:**
- Reuses 100% of TypeScript sim and tactical map code. No port to another language.
- Single executable (Electron packager); Node bundled; no separate server.
- In-process run avoids subprocess complexity; progress can stream via IPC.
- Determinism unchanged; same runScenario and turn pipeline.

**Cons:**
- Electron bundle size (Chromium + Node). Larger than native engine.
- Tactical map currently assumes Vite dev server for /data/; build and path resolution must be adapted (e.g. copy derived data into app resources or use file:// from user dir).

---

## 2. Option B: Godot front-end + Node/CLI sim (subprocess or sidecar)

**Description:** **Godot** (or similar game engine) as the only visible app: map, panels, main menu (“New game”, “Load”, “Rewatch”). Sim stays in TypeScript: either (1) **subprocess** — Godot spawns `node`/`npx` with scenario runner script, waits for exit, reads outDir from stdout, then loads replay_timeline.json and final_save from disk; or (2) **sidecar** — small Node server shipped next to Godot exe, Godot calls HTTP API to start run, polls for completion, then reads artifacts from disk. Play: Godot triggers run (subprocess or API); when done, Godot loads state and displays map (engine-rendered polygons or embedded webview for current map). Rewatch: Godot loads replay_timeline.json (file picker or from last run dir), steps through frames, updates engine-rendered map.

**Data flow:**
- Run: Godot → subprocess or HTTP → Node runs runScenario → writes to outDir → Godot reads paths from stdout or API response → Godot loads JSON from disk.
- Rewatch: Same replay_timeline.json format; Godot parses and drives its own map (or embeds a minimal browser for existing map UI).
- Map geography: Godot must render map (import GeoJSON, draw polygons) or embed webview that loads tactical map HTML; control/formation data from state JSON.

**Pros:**
- Small native binary (Godot export); no Chromium. Familiar game-engine workflow (scenes, scripts).
- Clear separation: “engine = UI”, “Node = sim”. Sim unchanged; run as today from CLI or API.
- Cross-platform export (Windows, Linux, macOS) via Godot.

**Cons:**
- Map and panels must be reimplemented in GDScript/C# or a thin wrapper around existing HTML/Canvas (e.g. Godot WebView) — more work if we want full tactical map feature parity.
- Subprocess: requires Node on PATH or bundled Node next to exe; run is blocking unless Godot runs runner in thread. Sidecar: two processes to ship and start.
- Replay consumption: either Godot parses replay_timeline and redraws map (duplicate logic) or Godot embeds browser with tactical map (brings back browser dependency in practice).

---

## 3. Option C: Tauri shell around tactical map + sim via sidecar or CLI

**Description:** **Tauri** app: Rust host, webview (system WebView2 on Windows, WebKit on macOS/Linux) shows tactical map (same HTML/JS/Canvas as today, built for production). Sim: (1) **Sidecar** — Tauri bundles Node scenario runner as sidecar binary; front-end invokes sidecar with args (scenario path, options); sidecar writes to app data dir; front-end reads paths from sidecar stdout or a small contract file. (2) Or **CLI subprocess** — Tauri spawns system `npx`/`node` if present. Play: User selects scenario in Tauri UI → Tauri invokes sidecar/CLI → on exit, Tauri tells webview “load this path” (or reads JSON and passes to webview). Rewatch: Same as Option A; webview loads replay_timeline from path.

**Data flow:**
- Same as Option A for “what the UI sees”; only the host is Tauri + webview instead of Electron. Sim runs in sidecar process or system Node.
- Map data: Served from app resources (Tauri can serve static files to webview) or file://.

**Pros:**
- Smaller binary than Electron (no bundled Chromium). Security: Rust host, minimal attack surface.
- Reuses tactical map and existing replay format; sim code unchanged (runs in Node sidecar or CLI).
- Single “app” from user perspective (one icon, one window).

**Cons:**
- Sidecar: must ship and invoke Node (or prebuild a Node binary). CLI: requires Node installed. Tauri does not bundle Node by default.
- Build and path setup for map assets and data dir (similar to Electron adaptation).

---

## 4. Recommendation (for T8/T9)

- **Fastest path to “play + rewatch” launchable:** **Option A (Electron)** — no reimplementation of map; sim in main process; one packaging story (electron-builder). Accept larger bundle.
- **If small binary and no Chromium are hard requirements:** **Option C (Tauri)** with Node sidecar or “Node required”; or **Option B (Godot)** if we accept reimplementing or embedding the map. Option B is more work for map parity; Option C is a middle ground (small binary, keep map HTML, sim in Node).
- **Data flow (all options):** Run artifacts → disk (final_save, replay_timeline) → UI loads from path or in-memory; “play myself” = advance turn or runScenario, then refresh map from new state; rewatch = load replay_timeline.json, step frames. Human “play myself” drives or reads from same sim pipeline; no new mechanics.

---

*T7 deliverable; feeds T8 tool recommendation and T9 phased plan.*
