# 2026-04-03 - Retire dead corps-front and AoR shell bridges

## Summary

- Removed the dead desktop bridge exports for brigade AoR reshaping and corps/OG front-edge staging.
- Deleted the main-process handlers that still advertised those commands as if they were real player shell actions.
- Removed the unused `desktop_sim.ts` staging helpers behind those handlers.

## What changed

### Desktop bridge cleanup

- Updated `src/desktop/preload.cjs`
  - removed:
    - `stageBrigadeAoROrder`
    - `stageCorpsFrontOrder`
    - `stageOgSubfrontOrder`

- Updated `src/ui/map/desktop/useIPC.ts`
  - removed the same methods from the live IPC contract and fallback wrapper

### Main-process contract cleanup

- Updated `src/desktop/electron-main.cjs`
  - removed:
    - `stage-brigade-aor-order`
    - `stage-corps-front-order`
    - `stage-og-subfront-order`

### Desktop sim cleanup

- Updated `src/desktop/desktop_sim.ts`
  - removed the unused staging helpers that existed only for the retired shell bridge:
    - `stageCorpsFrontOrder(...)`
    - `stageOgSubfrontOrder(...)`

## Why

These commands were classic false authority:

- the live tactical shell was not using them
- the main process still exposed them
- the desktop bridge still advertised them
- future agents could easily assume they were valid player-facing command lanes

In a repo like AWWV, that is dangerous. Even a dead command path becomes active debt if it still looks official at the shell boundary.

This pass keeps the shell contract honest:

- sector override remains the real player-facing territorial override path
- movement/posture/operations remain the real live command lanes
- retired AoR/front-edge staging is no longer presented as a supported player command surface

## Verification

- `node .\\node_modules\\vitest\\vitest.mjs run tests\\engine_honesty_legacy_contracts.test.ts tests\\ui_shell_navigation.test.ts`
- `node .\\node_modules\\vite\\bin\\vite.js build --config src\\ui\\warroom\\vite.config.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`

## Follow-up

- The deeper sim-side `corps_front_edges` / `og_subfront_edges` residue still exists and should be classified honestly as canonical, compatibility-only, or dead.
- `corps_front_assign.ts` is still a likely next retirement/demotion candidate because it continues to look like a live frontline authority despite doing almost nothing useful.
