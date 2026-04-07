# 2026-04-07 - v0.8-to-v0.9 Packaged Desktop UI Smoke + Window Load Contract

## Summary

Strengthened the existing packaged runtime probe so it now validates the real initial BrowserWindow load path, not just packaged resources and headless startup state.

Before this lane, `desktop:package:probe` proved that the unpacked packaged executable could:

- boot in packaged mode
- load the desktop sim bundle
- consume the baked `apr_1992` startup snapshot
- serve tactical-map resources from packaged paths

But it still left one meaningful UI/runtime seam under-proven:

- the packaged app had not proven that its real initial `BrowserWindow` could load `awwv://warroom/index.html` cleanly and reach `did-finish-load`

This lane closes that seam by extending the existing canonical probe instead of inventing a second path.

## Why this lane

The next confidence gain after packaged runtime and CI probe enforcement was not another resource check. It was the first real window contract:

- the packaged executable already booted
- the packaged resources already resolved
- but the packaged app's actual initial window load was still inferred instead of proven

That made the launch story weaker than it needed to be.

## Audit findings

### Canonical before the change

- `desktop:package:probe` already owned the canonical packaged-runtime path.
- `src/desktop/electron-main.cjs` already contained the real initial load target: `awwv://warroom/index.html`.
- CI already enforced `desktop:package:probe` through the desktop release guard workflow.

### Remaining seam before the change

- the probe created no real `BrowserWindow`
- no source contract guaranteed that packaged runtime smoke included the actual initial window load
- packaged launch success still partly meant "resources and startup are present" rather than "the initial packaged window contract really loads"

## Design

### Ownership after cleanup

- **Canonical packaged runtime path:** `desktop:package:probe`
- **Initial window contract owner:** `src/desktop/electron-main.cjs`
- **Probe manifest owner:** packaged runtime probe branch in `electron-main.cjs`

### Rules after cleanup

1. No second packaged-runtime or window-smoke command is introduced.
2. The existing packaged runtime probe must create the real main window path.
3. The probe must validate `did-finish-load` for `awwv://warroom/index.html`.
4. The probe manifest must report that window-load proof in deterministic order.

### What was intentionally deferred

- packaged UI interaction testing beyond initial load
- tactical map secondary window interaction smoke
- installer or publish workflows

## Implementation

### Files changed

- `src/desktop/electron-main.cjs`
- `tests/desktop_packaged_runtime_probe.test.ts`
- `src/desktop/README.md`

### What changed

- Added `waitForWindowLoad(...)` in `src/desktop/electron-main.cjs` to make window-load success/failure explicit.
- Refactored main-window creation into `createMainWindow({ show, openDevTools })` so the packaged runtime probe can launch the real main window headlessly without creating a second launch path.
- Extended `runPackagedRuntimeProbe()` so it now:
  - creates the real main `BrowserWindow` with `show: false`
  - waits for `did-finish-load`
  - asserts the loaded URL is exactly `awwv://warroom/index.html`
  - records that proof under `window_checks` in the success manifest
- Extended `tests/desktop_packaged_runtime_probe.test.ts` so future edits must keep the real window-load contract inside the canonical packaged probe.
- Updated `src/desktop/README.md` so the desktop contract now truthfully states that `desktop:package:probe` verifies the initial packaged BrowserWindow load.

## Verification

### Targeted commands

- `npx.cmd tsx --test tests/desktop_packaged_runtime_probe.test.ts tests/desktop_release_ci_guardrails.test.ts`
- `npm.cmd run desktop:startup-snapshot:check`
- `npm.cmd run desktop:release:check`
- `npm.cmd run desktop:package:probe`

### Full commands

- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

### Proof points

- source tests now fail if the packaged runtime probe stops waiting for the real main window load event
- `desktop:package:probe` still passes through the same canonical packaged-runtime path
- the packaged probe success manifest now includes explicit `window_checks` proof for `awwv://warroom/index.html`

## Architectural outcome

The packaged desktop launch story is now easier to explain:

1. `desktop:package:probe` launches the real packaged executable
2. it proves resource and startup truth
3. it also proves the packaged app's initial BrowserWindow reaches `did-finish-load` on the real `awwv://warroom/index.html` path

That is stronger than "the package boots, so the window probably loads."

## Residual risks

- This remains an initial window-load contract, not a deeper packaged UI interaction suite.
- The tactical map secondary window is still only covered indirectly through packaged resource and HTTP checks.
- Only the Windows unpacked packaged target participates in this contract.

## Integration notes

This was a parallel-safe lane, so governance docs were not edited directly.

### `docs/PROJECT_LEDGER.md`

Add a 2026-04-07 entry for `Packaged Desktop UI Smoke + Window Load Contract` noting that:

- the canonical `desktop:package:probe` path now validates the real packaged BrowserWindow load for `awwv://warroom/index.html`
- the probe manifest now records `window_checks` alongside resource and startup checks
- no second packaged-runtime path was introduced

Suggested ledger note text:

> 2026-04-07 - Packaged Desktop UI Smoke + Window Load Contract: extended `desktop:package:probe` so the packaged executable now creates its real initial BrowserWindow headlessly, waits for `did-finish-load`, and asserts the packaged launch URL is `awwv://warroom/index.html`. The probe success manifest now records explicit window-load proof alongside packaged resource and startup checks, without adding a second runtime path.

### `docs/plans/MASTER_ROADMAP.md`

Mark the lane complete only if roadmap wording matches the delivered scope:

- packaged runtime smoke now includes the initial packaged window load contract
- deeper UI interaction smoke remains deferred
- installer/publish flow remains deferred

### `.claude/architect_notes.md`

Record the reusable lesson:

- once packaged-runtime smoke exists, promote the real initial BrowserWindow load into that same canonical probe so launch-path regressions cannot hide behind resource-only success
