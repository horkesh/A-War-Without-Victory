# 2026-04-02 - AoR Cap Bridge Retirement

## Purpose

This checkpoint resolves a repo-truth contradiction.

The docs already treated `setBrigadeDesiredAoRCap` as dead IPC, but the live Electron
bridge, desktop IPC wrapper, and tactical-map adapter still carried it. No current
non-archived player shell used that bridge.

## What changed

- removed `setBrigadeDesiredAoRCap(...)` from:
  - `src/desktop/preload.cjs`
  - `src/ui/map/desktop/useIPC.ts`
- removed the `set-brigade-desired-aor-cap` IPC handler from:
  - `src/desktop/electron-main.cjs`
- removed the live tactical-map adapter/view-model exposure of:
  - `brigadeDesiredAoRCap`
  - `state.military.brigade_desired_aor_cap`
  from:
  - `src/ui/map/data/GameStateAdapter.ts`
  - `src/ui/map/data/types.ts`
- added a regression proving the live player shell no longer exposes the bridge or adapter field:
  - `tests/engine_honesty_legacy_contracts.test.ts`

## Why this matters

This was not a harmless leftover:

- docs said the bridge was gone
- live code still exposed it
- future agents could have treated that as permission to revive AoR-era player controls

That is exactly how a repo drifts into believing two eras at once.

## Canonical truth after this pass

- `brigade_desired_aor_cap` remains compatibility-era state only
- the live desktop/player shell does not expose or depend on it

## Verification

- `node_modules\.bin\vitest.cmd run tests\engine_honesty_legacy_contracts.test.ts tests\ui_map_game_state_adapter.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
