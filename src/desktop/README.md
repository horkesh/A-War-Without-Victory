# Desktop app (Electron) - tactical map + play myself

**Phase 1:** Launchable executable; map loads with bundled or project data.  
**Phase 2:** Play myself: Load scenario or state file, advance turn; map and state update after each advance.

## Commands

From repo root:

```bash
# Build the tactical map (required before running Electron)
npm run desktop:map:build

# Build the desktop sim bundle (required for Load scenario / Advance turn).
# This now also validates the baked April 1992 startup snapshot and fails
# loudly if `data/derived/startup/apr_1992_initial_save.json` is missing or stale.
npm run desktop:sim:build

# Regenerate the baked startup snapshot if the guarded desktop build reports drift.
npm run desktop:startup-snapshot:build

# Run the canonical desktop release/build verification path used by CI.
npm run desktop:release:check

# Build the unpacked packaged-desktop artifact through the canonical guard path.
npm run desktop:package:dir

# Build the unpacked package and launch a headless runtime probe against the
# packaged executable. This proves packaged boot/resource resolution without
# opening the full UI.
npm run desktop:package:probe

# Run the desktop app (runs desktop:sim:build then Electron)
npm run desktop
```

## Data paths

- **Dev (unpackaged):** Map app is served from `dist/tactical-map/`. Data and assets are read from project root `data/derived/` and `assets/` (protocol resolves `/data/derived/*` and `/assets/*` to repo).
- **Packaged:** The unpacked packaged build is produced by `npm run desktop:package:dir`. It first runs `desktop:release:check`, then packages Electron with `electron-builder`. Runtime assets live under `resources/` with this explicit contract:
  - `resources/app/` <- `dist/tactical-map/`
  - `resources/app/warroom/` <- `dist/warroom/`
  - `resources/dist/desktop/desktop_sim.cjs`
  - `resources/data/derived/`, `resources/data/source/`, `resources/data/ui/`
  - `resources/assets/`

## Phase 2: Play myself

- **Load scenario...** (layer panel when in Electron, or File -> Load scenario): Opens file picker for a scenario JSON; main process runs scenario init (one week) and sends initial state to the map. Map shows control, formations, turn.
- **Load state file...** (layer panel, or File -> Load state file): Opens file picker for a saved game (e.g. `final_save.json`); main process loads and sends state to the map.
- **Advance turn** (layer panel): Advances one week using Phase 0 / Peace phase / War phase browser-safe runners; main process sends updated state; map and OOB refresh.

Sim runs in the main process via `dist/desktop/desktop_sim.cjs` (built by `npm run desktop:sim:build`). Data paths use project root when dev, or resources when packaged.

## Startup snapshot guardrail

- `apr_1992` desktop `New Campaign` startup now consumes the baked artifact at `data/derived/startup/apr_1992_initial_save.json`.
- `npm run desktop:sim:build` validates that artifact against canonical builder truth before bundling `dist/desktop/desktop_sim.cjs`.
- `npm run desktop:release:check` is now the canonical shipped-build verification path. It runs the guarded desktop sim build plus the required map and Warroom bundles.
- `npm run desktop:package:dir` is the canonical packaged-desktop contract. It cannot bypass `desktop:release:check`, and it packages the runtime files into the `resources/` layout that `electron-main.cjs` already expects.
- `npm run desktop:package:probe` is the canonical packaged-runtime smoke. It first runs `desktop:package:dir`, then launches the unpacked packaged executable in a dedicated probe mode that verifies:
  - packaged resource files exist at the expected `resources/` paths
  - the packaged main process can load `dist/desktop/desktop_sim.cjs`
  - the baked `apr_1992` startup snapshot can be consumed from packaged resources
  - the packaged tactical-map HTTP server can serve `/` and the startup snapshot route
  - the real initial packaged BrowserWindow reaches `did-finish-load` for `awwv://warroom/index.html`
  - the real secondary packaged tactical-map window reaches `did-finish-load` for the deterministic operational map route `/?desktop_window=operational`
  - the real packaged tactical sandbox window reaches `did-finish-load` for the deterministic sandbox route `/tactical_sandbox.html?desktop_window=sandbox`
  - both packaged tactical-map windows successfully use the real preload bridge to resolve `getMapServerUrl()` and `getCurrentGameState()` with deterministic `route_mode`, `player_faction`, and `turn` assertions
  - both packaged tactical-map windows successfully receive a deterministic `game-state-updated` push through the real desktop subscription bridge after load
  - both packaged tactical-map windows successfully receive a deterministic `turn-report-updated` push through the real desktop subscription bridge after load
  - the real packaged operational tactical-map renderer deterministically reacts on the renderer side by updating its tactical-map store state from `game-state-updated` and `turn-report-updated` traffic under a probe-only observation hook, and proves that those store updates preserve the exact current pushed payload identity
  - packaged probe success is recorded in a deterministic manifest beside the unpacked executable so GUI runtime proof does not depend solely on stdout capture
- `.github/workflows/desktop-release-guard.yml` now enforces that same packaged-runtime probe on `windows-latest` after the canonical Ubuntu `desktop:release:check` job. CI shipped-build truth now covers both build inputs and packaged runtime boot/resource resolution.
- The current package productization target is an unsigned Windows `dir` build. Installer publishing, code signing, and store/distribution flow are still intentionally deferred.
- If the artifact is stale or missing, the build aborts and instructs the user to run `npm run desktop:startup-snapshot:build`.
- The builder remains the primary truth source; the baked startup snapshot is a one-way derived product artifact.
