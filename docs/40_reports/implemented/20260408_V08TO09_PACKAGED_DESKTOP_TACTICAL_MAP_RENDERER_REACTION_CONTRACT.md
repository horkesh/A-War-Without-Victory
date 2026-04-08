# Packaged Desktop Tactical-Map Renderer Reaction Contract

Date: 2026-04-08

## Scope

Bounded `v0.8-to-v0.9` platform/runtime hardening lane:

- keep one canonical packaged runtime path: `desktop:package:probe`
- move one step past bridge delivery
- prove a deterministic renderer-side tactical-map reaction to real packaged desktop bridge traffic
- avoid broad UI automation

## Seam chosen

The packaged runtime probe already proved:

- packaged resources
- startup snapshot loading
- initial Warroom window load
- operational and sandbox tactical-map route loads
- preload pull interaction
- tactical-map `game-state-updated` push delivery
- tactical-map `turn-report-updated` push delivery

What remained implicit was renderer reaction.

The smallest truthful product-owned renderer reaction already in the app was:

- `useDesktopSession()` applies `game-state-updated` by calling `loadSave(...)`, which updates the tactical-map Zustand store
- `useDesktopSession()` applies `turn-report-updated` by calling `setLastTurnReport(...)`, which updates the same store

Audit note:

- this renderer-reaction seam belongs to the React tactical-map app loaded at `/`
- the tactical sandbox route is a separate legacy renderer and does not own the same `useDesktopSession()` store-update path today

## Contract after cleanup

`desktop:package:probe` remains the only packaged runtime proof path.

It now proves that the packaged operational tactical-map renderer reacts deterministically after bridge delivery by recording store-backed reactions for:

- `game-state-updated`
- `turn-report-updated`

## Implementation

Changed files:

- `src/ui/map/hooks/useDesktopSession.ts`
- `src/ui/map/store/gameStore.ts`
- `src/desktop/electron-main.cjs`
- `tools/desktop_packaged_runtime_probe.mjs`
- `tests/desktop_packaged_runtime_probe.test.ts`
- `src/desktop/README.md`
- `data/derived/startup/apr_1992_initial_save.json`

Key changes:

- added a probe-only renderer reaction recorder inside `useDesktopSession()`
- added a probe-safe readiness marker from `useDesktopSession()` so the packaged probe waits for the real operational tactical-map session hook instead of racing application bootstrap
- added a probe-safe scheduling gate in `gameStore.loadSave(...)` so hidden packaged probe windows do not starve the operational store update path
- added packaged probe helpers in `electron-main.cjs`:
  - `armRendererReactionProbe(...)`
  - `collectRendererReactionProbe(...)`
- added `waitForDesktopSessionReady(...)` in `electron-main.cjs`
- extended the packaged runtime manifest with `renderer_reaction_checks`
- extended the external probe validator to require the operational renderer-reaction proof
- narrowed the proof scope truthfully after audit: sandbox remains covered for route load, preload pull, and push delivery, but renderer reaction is only required where the real React tactical-map renderer exists
- refreshed the baked April 1992 startup snapshot so the packaged desktop bundle and probe run against current engine truth instead of a stale artifact

## Determinism

The renderer-reaction contract stays deterministic:

- one canonical probe path
- stable manifest ordering
- fixed route expectations
- fixed turn and player-faction assertions
- fixed turn-report probe marker
- no timestamp-based assertions in source or manifest

## Verification

Required commands run:

- `node --check src\\desktop\\electron-main.cjs`
- `npx.cmd tsx --test tests\\desktop_packaged_runtime_probe.test.ts`
- `npm.cmd run desktop:startup-snapshot:check`
- `npm.cmd run desktop:release:check`
- `npm.cmd run desktop:package:probe`
- `npm.cmd run test:vitest`
- `npx.cmd tsc --noEmit -p tsconfig.json`
- `npm.cmd run build`

Results:

- targeted packaged probe tests: `4/4` passed
- `desktop:startup-snapshot:check`: passed
- `desktop:release:check`: passed
- `desktop:package:probe`: passed
- `test:vitest`: `216/216` files passed, `3018/3018` tests passed
- `tsc --noEmit`: passed
- `build`: passed

Packaged manifest proof:

```json
{
  "renderer_reaction_checks": [
    {
      "game_state_updated": {
        "location_path": "/",
        "player_faction": "RBiH",
        "route_mode": "operational",
        "turn": 0
      },
      "route_mode": "operational",
      "turn_report_updated": {
        "location_path": "/",
        "probe": "awwv_turn_report_probe",
        "route_mode": "operational",
        "turn": 0
      }
    }
  ]
}
```

## Residual risks

- This proves deterministic operational renderer store-backed reaction, not broader renderer/UI behavior after that state settles
- The tactical sandbox route is still covered for load and bridge delivery, but not for the React store-backed reaction path because it is a separate legacy renderer today
- It remains packaged smoke, not full packaged UI automation
- Only the Windows unpacked packaged target is covered

## Integration notes

Do not edit protected files automatically from this lane. Apply these notes manually:

- `docs/PROJECT_LEDGER.md`
  - Add:
    - `2026-04-08 - Packaged Desktop Tactical-Map Renderer Reaction Contract: strengthened desktop:package:probe so the packaged operational tactical-map renderer must deterministically react on the renderer side through the existing useDesktopSession() store-update path after real desktop bridge delivery. The packaged runtime probe now records renderer_reaction_checks proving game-state-updated loads tactical-map state and turn-report-updated updates lastTurnReport for the operational React tactical-map app. Audit note: the tactical sandbox route remains covered for route load and bridge delivery, but it is a separate legacy renderer and does not own the same store-backed reaction seam today.`

- `docs/plans/MASTER_ROADMAP.md`
  - Mark complete only if wording matches delivered scope:
    - deterministic renderer-side tactical-map reaction proof
    - no claim of screenshot automation or broad UI end-to-end coverage

- `.claude/architect_notes.md`
  - Add:
    - `After packaged bridge delivery is proven, the next bounded runtime step is to instrument the real renderer consumption path in probe-safe form rather than inventing a parallel UI test. In AWWV desktop tactical-map windows, useDesktopSession() is the product-owned reaction seam because it loads pushed game state into the store and caches pushed turn reports.`
