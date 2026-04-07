# Packaged Desktop Tactical-Map Interaction Contract

Date: 2026-04-08  
Lane: `Packaged Desktop Tactical-Map Interaction Contract`

## Summary

This lane strengthened the canonical packaged runtime probe from route-load proof to minimal tactical-map interaction proof. The existing `desktop:package:probe` path already proved packaged boot, packaged resource resolution, baked startup snapshot loading, the initial Warroom window, the operational tactical-map window, and the tactical sandbox route. What remained implicit was whether the packaged tactical-map windows could actually use the real desktop preload bridge after load.

The probe now proves that both packaged tactical-map windows successfully call the real preload bridge for:

- `window.awwv.getMapServerUrl()`
- `window.awwv.getCurrentGameState()`

The resulting interaction contract is deterministic and recorded in the packaged runtime manifest as `tactical_interactions`.

## Chosen seam

Chosen seam: packaged tactical-map windows loaded successfully, but the runtime contract still did not prove a real post-load desktop interaction under the canonical probe.

Why this was the right bounded seam:

- it uses the real packaged window path already owned by `desktop:package:probe`
- it exercises the existing tactical-map preload/runtime assumptions instead of inventing UI automation
- it strengthens the packaged product path without widening into broader end-to-end behavior

## Canonical contract after cleanup

The canonical packaged runtime path remains:

1. `desktop:startup-snapshot:check`
2. `desktop:release:check`
3. `desktop:package:dir`
4. `desktop:package:probe`

`desktop:package:probe` now proves all of the following:

- packaged runtime files exist in the expected resources layout
- the packaged desktop sim bundle can load
- the baked April 1992 startup snapshot can be consumed
- the tactical-map HTTP server can serve packaged resources
- the Warroom packaged window reaches `did-finish-load`
- the operational packaged tactical-map window reaches `did-finish-load`
- the sandbox packaged tactical-map window reaches `did-finish-load`
- both tactical-map windows can perform a real deterministic desktop interaction through the preload bridge:
  - resolve `getMapServerUrl()`
  - resolve `getCurrentGameState()`
  - report deterministic `route_mode`
  - report `player_faction = RBiH`
  - report `turn = 0`

## Files changed

- `src/desktop/electron-main.cjs`
- `tools/desktop_packaged_runtime_probe.mjs`
- `tests/desktop_packaged_runtime_probe.test.ts`
- `src/desktop/README.md`

This report was added:

- `docs/40_reports/implemented/20260408_V08TO09_PACKAGED_DESKTOP_TACTICAL_MAP_INTERACTION_CONTRACT.md`

## Implementation details

### `src/desktop/electron-main.cjs`

Added `waitForTacticalMapInteraction(...)`, which runs a deterministic script inside the real packaged tactical-map window and proves:

- `window.awwv` exists
- `getMapServerUrl()` exists and returns the expected local packaged map-server base URL
- `getCurrentGameState()` exists and returns the current canonical desktop state
- the state resolves to the expected `player_faction` and `turn`
- the route mode is correct for the operational and sandbox windows

`runPackagedRuntimeProbe()` now records a deterministic `tactical_interactions` section in the manifest for:

- the operational tactical-map window
- the sandbox tactical-map window

### `tools/desktop_packaged_runtime_probe.mjs`

The external probe command now requires those interaction proofs. It fails loudly if either packaged tactical-map window is missing its interaction entry.

### `tests/desktop_packaged_runtime_probe.test.ts`

The source-level contract test now guards:

- the interaction helper exists
- the real preload bridge functions are required
- the probe manifest records `tactical_interactions`
- the operational and sandbox interaction proofs are required by the probe tool

### `src/desktop/README.md`

Updated the desktop contract documentation so the packaged probe is described truthfully as proving minimal tactical-map preload interaction, not just route loading.

## Verification

Required verification run for this lane:

- `node --check src\desktop\electron-main.cjs`
- `npx.cmd tsx --test tests\desktop_packaged_runtime_probe.test.ts`
- `npm.cmd run desktop:startup-snapshot:check`
- `npm.cmd run desktop:release:check`
- `npm.cmd run desktop:package:probe`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

All commands passed for this lane.

## Residual risks

This lane proves minimal tactical-map interaction, but not tactical-map UI behavior after the bridge resolves.

Still deferred:

- full packaged UI automation
- tactical-map interaction semantics beyond the minimal preload bridge contract
- non-Windows packaged targets
- installer/store/publish flow

## Integration notes for protected canon files

This lane intentionally did **not** edit:

- `docs/PROJECT_LEDGER.md`
- `docs/plans/MASTER_ROADMAP.md`
- `.claude/architect_notes.md`

Suggested `PROJECT_LEDGER.md` note:

`2026-04-08 - Packaged Desktop Tactical-Map Interaction Contract: strengthened desktop:package:probe so packaged tactical-map operational and sandbox windows must successfully use the real desktop preload bridge to resolve getMapServerUrl() and getCurrentGameState() with deterministic route_mode, player_faction, and turn assertions. This moves the packaged runtime contract from route-load proof to minimal packaged tactical-map interaction proof without adding a second smoke path.`

Suggested `MASTER_ROADMAP.md` note:

- mark the lane complete only if wording matches delivered scope:
  - tactical-map interaction proof under the canonical packaged probe
  - no claim of broad packaged UI automation

Suggested `.claude/architect_notes.md` note:

- once packaged route-load proof exists for desktop windows, the next bounded runtime contract should prove minimal preload-bridge interaction through the same packaged probe instead of adding separate UI smoke commands
