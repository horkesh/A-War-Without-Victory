# Runner and replay from launchable app — options memo

**Date:** 2026-02-14  
**Owner:** Scenario Harness Engineer (T4)  
**Purpose:** One-page options for how a launchable (non-web) app can run scenarios and consume replay artifacts.

---

## 1. Current invocation

- **CLI:** `npm run sim:scenario:run -- --scenario <path> [--video] [--map] --out runs` (see `tools/scenario_runner/run_scenario.ts`). Parses args, calls `checkDataPrereqs()`, then `runScenario(...)` from `src/scenario/scenario_runner.js`.
- **API:** `runScenario(options: RunScenarioOptions): Promise<RunScenarioResult>`.
  - Key options: `scenarioPath`, `outDirBase`, `weeksOverride`, `emitWeeklySavesForVideo` (→ replay_timeline.json + weekly saves), `uniqueRunFolder`, `postureAllPushAndApplyBreaches`, `use_smart_bots`.
  - Result: `outDir`, `run_id`, `paths.final_save`, `paths.replay_timeline`, `paths.weekly_saves`, etc. All paths are absolute or relative to cwd; artifacts written to disk.
- **Replay:** When `emitWeeklySavesForVideo: true`, runner stream-writes `replay_timeline.json` in `outDir` (meta + frames + control_events). Tactical map loads this file and parses it for week-by-week playback. Same format consumable by any client that can read JSON from disk (or from a URL if app serves it).

---

## 2. Options for launchable app

### Option A: App spawns CLI (subprocess)

- Launchable app (Godot, Electron, Tauri, etc.) spawns a **child process**: e.g. `npx tsx tools/scenario_runner/run_scenario.ts --scenario <path> --video --map --out <dir>`.
- **Pros:** No change to scenario runner; same CLI and behavior; works from any host that can run Node.  
- **Cons:** Requires Node on the user machine (or app bundles Node + deps); output parsing from stdout/stderr (runner already prints `outDir`, `paths.*`); run is async and blocking for the duration of the run (e.g. 52w can take minutes).
- **Replay:** App reads `replay_timeline.json` and `final_save.json` from the paths printed by CLI (or from a known outDir). Same format tactical map uses today.

### Option B: Sim API in-process (Electron main / Node backend)

- **Electron:** Main process (Node) imports and calls `runScenario(...)` directly (same codebase). No subprocess; run runs in main process. Progress can be exposed via IPC to renderer (e.g. “week 12/52”). Artifacts written to disk; renderer or map UI reads `paths.final_save` and `paths.replay_timeline` (e.g. file path or read into memory and pass to renderer).
- **Pros:** Single process; no Node-on-PATH requirement (Electron bundles Node); full control over progress and cancellation (if we add cancellation).  
- **Cons:** Only applies to Electron (or similar Node-based host). Godot cannot call TypeScript directly; would need Option A or C for Godot.
- **Replay:** Same as today: UI loads replay_timeline path or content; step through frames.

### Option C: Small local server + app front-end

- A **small Node server** (or script) runs in the background: exposes e.g. `POST /run` (body: scenario path, options) and runs `runScenario(...)`. When done, returns `outDir`, `paths.replay_timeline`, etc. Launchable app (Godot, Tauri, or Electron) is the front-end: it calls this server to start a run, polls or subscribes for progress, then opens replay from returned path (or server serves file at `/replay/<run_id>/replay_timeline.json`).
- **Pros:** Decouples “run” from “UI stack”; Godot/Tauri/any client can talk HTTP.  
- **Cons:** Two processes to ship or start; need to define and maintain the server API and lifecycle (start/stop with app).
- **Replay:** App fetches replay_timeline (URL or path) and consumes same JSON format.

---

## 3. Replay consumption (all options)

- **Format:** `replay_timeline.json`: `meta` (optional), `frames[]` (each with serialized game state, sorted by week_index), `control_events[]` (turn, settlement_id, from, to, mechanism). Tactical map already parses this in `DataLoader` / replay flow.
- **Launchable app:** Can consume the same file from:
  - **Disk:** App is given path to `replay_timeline.json` (e.g. from run result or file picker). Read and parse; step through frames; no change to format.
  - **In-memory:** If app receives JSON content (e.g. Electron IPC or HTTP response), same parsing applies.
- **Weekly saves:** Optional; `save_w1.json` … `save_wN.json` are full state snapshots. Replay timeline frames are sufficient for map playback; weekly saves useful for debugging or alternate tooling.

---

## 4. Recommendation (for T8/T9)

- **Electron:** Prefer **Option B** (in-process `runScenario` in main) for simplicity and no extra server.  
- **Godot / Tauri (no Node in UI process):** Prefer **Option A** (spawn CLI) or **Option C** (local server). Option A is simpler if Node can be assumed or bundled alongside the app.  
- **Rewatch:** No dependency on how the run was started; any launchable app that can read a file path and parse JSON can implement rewatch using the existing `replay_timeline.json` format.

---

*T4 deliverable; feeds T7 architecture and T8 tool recommendation.*
