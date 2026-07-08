# Warroom Live-Surface Decision Audit

Date: 2026-07-08
Packet: RR2-3B
Status: Audit complete; Warroom shell retained; non-runtime asset-history cleanup performed

## Decision

`src/ui/warroom` is a live desktop surface and must not be treated as dead code.

Keep the Warroom shell in the release path. Any cleanup should be split into smaller packets by class:

1. Keep and test the live Warroom shell, Electron route, IPC bridge, and staged data/assets.
2. Treat `map_viewer_standalone.*` as a developer/diagnostic viewer until a separate owner decision removes that build input.
3. Treat `assets/raw_sora/` and `assets/_old/` as asset-history, not runtime code. RR2 follow-up proved they are not live imports and removed them.

## Live Receipts

- `package.json`:
  - `desktop:release:check` runs `desktop:map:build`, `desktop:sim:build`, and `warroom:build`.
  - `warroom:build` runs Vite with `src/ui/warroom/vite.config.ts` and then `tools/ui/warroom_stage_assets.ts`.
  - electron-builder config copies `dist/warroom` to packaged `app/warroom`.
  - `qa:electron-runtime-contracts` includes Warroom tests.
- `src/desktop/electron-main.cjs`:
  - `createMainWindow()` loads `awwv://warroom/index.html`.
  - packaged runtime probe asserts `warroomIndex`.
  - custom protocol serves `warroom`, `warroom/assets`, `warroom/data`, and `warroom/tactical-map`.
  - IPC includes `focus-warroom`.
- `src/ui/warroom/vite.config.ts`:
  - root is `src/ui/warroom`.
  - build output is `dist/warroom`.
  - Rollup inputs include both `index.html` and `map_viewer_standalone.html`.
  - dev server intentionally serves `/data/` and `/assets/` fallbacks.
- `src/ui/warroom/index.html`:
  - is the desktop main window shell.
  - contains the main menu, side picker, Warroom canvas, tactical-map iframe host, toolbar, and modal hosts.
- `tools/ui/warroom_stage_assets.ts`:
  - stages data files and faction region JSON into `dist/warroom` and `src/ui/warroom/public`.

## Test Receipts

Representative direct coverage:

- `tests/warroom_new_campaign_flow_truth.test.ts`
- `tests/warroom_smoke.test.ts`
- `tests/warroom_player_visibility.test.ts`
- `tests/warroom_shell_layer.test.ts`
- `tests/ui/warroom_launch_screen_contract.test.ts`
- `tests/ui/warroom_shell_accessibility.test.ts`
- `tests/ui/warroom_shell_ownership.test.ts`
- `tests/ui/warroom_date_i18n.test.ts`
- `tests/ui/warroom_settings_modal_i18n.test.ts`

Release/runtime coverage:

- `tests/desktop_packaged_runtime_probe.test.ts`
- `tests/desktop_persistence_contract.test.ts`
- `tests/desktop_sim_bundle_smoke.test.ts`
- `package.json` script `qa:electron-runtime-contracts`

## Size And Cleanup Boundaries

Measured `src/ui/warroom`:

- Total files: 125
- Total bytes: 167,743,745
- Source/config/html/css/json subset: 55 files, 15,608,634 bytes
- Current top-level `assets/` files: 30 files, 10,412,330 bytes
- `assets/raw_sora/`: 9 files, 7,684,280 bytes
- `assets/_old/`: 23 files, 105,493,109 bytes

The biggest cleanup target is asset history, not Warroom code. Deleting or moving `_old` should be a packaging-size cleanup packet with proof that:

- no Vite import references it,
- `warroom:build` output is unchanged except expected removed archive bytes,
- packaged runtime probe still passes,
- any historically useful source art is moved to an explicit non-runtime archive if retained.

## What Not To Do

- Do not delete `src/ui/warroom` as archived or legacy code.
- Do not remove `warroom:build` from `desktop:release:check`.
- Do not remove `dist/warroom -> app/warroom` packaging.
- Do not remove `awwv://warroom/index.html` or protocol handlers without replacing the desktop main window contract.
- Do not delete `map_viewer_standalone.*` incidentally; it is a Vite build input and needs a separate diagnostic-viewer decision.

## Actionable Follow-Up Packets

### Packet A - Warroom Asset Archive Cleanup - Completed 2026-07-08

Objective: reduce repository and packaged asset bulk without changing runtime behavior.

Executed:

1. Proved no live references to `src/ui/warroom/assets/_old` or `src/ui/warroom/assets/raw_sora` outside those directories.
2. Removed the tracked asset-history directories with `git rm -r`.
3. Verified Warroom-focused and release packaging gates after deletion.

### Packet B - Standalone Map Viewer Ownership

Objective: decide whether `map_viewer_standalone.*` remains a developer viewer.

Steps:

1. Search references in scripts, docs, tests, and Vite config.
2. If retained, document it as a dev-only Warroom diagnostic viewer.
3. If retired, remove it from Rollup inputs and add a regression proving `warroom:build` still emits the main shell and packaged route.

### Packet C - Warroom Shell Contract Freeze

Objective: prevent future dead-code misclassification.

Steps:

1. Add or update a contract test that asserts:
   - `desktop:release:check` contains `warroom:build`,
   - electron-builder extraResources includes `dist/warroom`,
   - `electron-main.cjs` loads `awwv://warroom/index.html`,
   - packaged runtime probe checks `warroomIndex`.
2. Link this audit from the command board and roadmap until Packet A/B are resolved.
