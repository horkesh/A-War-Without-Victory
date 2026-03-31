# Desktop app (Electron) — tactical map + play myself

**Phase 1:** Launchable executable; map loads with bundled or project data.  
**Phase 2:** Play myself: Load scenario or state file, advance turn; map and state update after each advance.

## Commands

From repo root:

```bash
# Build the tactical map (required before running Electron)
npm run desktop:map:build

# Build the desktop sim bundle (required for Load scenario / Advance turn)
npm run desktop:sim:build

# Run the desktop app (runs desktop:sim:build then Electron)
npm run desktop
```

## Data paths

- **Dev (unpackaged):** Map app is served from `dist/tactical-map/`. Data and assets are read from project root `data/derived/` and `assets/` (protocol resolves `/data/derived/*` and `/assets/*` to repo).
- **Packaged:** App and data are under `resources/` (see electron-builder config in package.json if added).

## Phase 2: Play myself

- **Load scenario...** (layer panel when in Electron, or File → Load scenario): Opens file picker for a scenario JSON; main process runs scenario init (one week) and sends initial state to the map. Map shows control, formations, turn.
- **Load state file...** (layer panel, or File → Load state file): Opens file picker for a saved game (e.g. `final_save.json`); main process loads and sends state to the map.
- **Advance turn** (layer panel): Advances one week using Phase 0 / Peace phase / War phase browser-safe runners; main process sends updated state; map and OOB refresh.

Sim runs in the main process via `dist/desktop/desktop_sim.cjs` (built by `npm run desktop:sim:build`). Data paths use project root when dev, or resources when packaged.
