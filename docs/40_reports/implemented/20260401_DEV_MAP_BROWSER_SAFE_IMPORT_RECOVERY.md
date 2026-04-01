# 2026-04-01 - Dev Map Browser-Safe Import Recovery

## Summary

Recovered `npm run dev:map` after a browser-bundle regression pulled Node-only modules into the client import graph. The visible failure was Vite's `__vite-browser-external:fs` crash originating from `combat_math.ts`.

The fix split file-system loaders into explicit Node-only modules and restored browser-safe boundaries for the shared map/combat helpers. `dev:map` and the tactical-map production build now compile without importing `fs` or `path` into browser code.

## Symptom

- Browser crash on load:
  - `Module "fs" has been externalized for browser compatibility`
- Stack pointed into `combat_math.ts`
- `favicon.ico` 404 was present but unrelated

## Root Cause

Two shared modules in the tactical-map import graph were no longer browser-safe:

1. `src/sim/combat/combat_math.ts`
   - had direct Node-oriented terrain/OSID loading responsibilities mixed into shared combat helpers
2. `src/map/terrain_scalars.ts`
   - still contained Node loader logic, which is safe in Node callers but not in the browser dependency graph

The result was architectural leakage:

- browser UI imported shared combat/math helpers
- shared helpers reached Node loaders
- Vite externalized `fs`
- `dev:map` crashed at runtime

## Implementation

### 1. Node-only terrain loader extracted

Added:

- `src/map/terrain_scalars_node.ts`

This file now owns disk access for settlement terrain scalars:

- `loadTerrainScalars()`

`src/map/terrain_scalars.ts` now remains browser-safe and owns only:

- types
- cache helpers
- pure lookup helpers

### 2. Node-only combat terrain set loader extracted

Added:

- `src/sim/combat/combat_terrain_sets_node.ts`

This file now owns disk access for:

- `urban_osids.json`
- `forest_osids.json`

and exports:

- `loadUrbanOsidSet()`
- `loadForestOsidSet()`

### 3. Shared combat math restored to browser-safe boundary

Updated:

- `src/sim/combat/combat_math.ts`

Changes:

- removed direct Node import dependency from the browser-facing combat helper boundary
- kept terrain-set state as injected runtime data via:
  - `setUrbanOsidSet()`
  - `setForestOsidSet()`
  - `getUrbanOsidSet()`
  - `getForestOsidSet()`

This keeps `combat_math.ts` usable from both:

- browser tactical map
- Node simulation/runtime code

without file-system access in the shared module itself.

### 4. Node callers rewired to the extracted loaders

Updated:

- `src/desktop/desktop_sim.ts`
- `src/scenario/scenario_runner.ts`
- `src/sim/turn_phases/war_phases.ts`

These callers now import from the new Node-only modules instead of the browser-safe shared ones.

## Verification

Executed:

```powershell
node_modules\.bin\tsx.cmd --test tests\ui_map_browser_safe_imports.test.ts
npx.cmd tsc --noEmit -p tsconfig.json
npm.cmd run desktop:map:build
```

All passed.

## Regression Coverage

Added:

- `tests/ui_map_browser_safe_imports.test.ts`

This test bundles browser entrypoints with `esbuild` in browser mode and asserts that the output does not contain Node builtins such as:

- `node:fs`
- `node:path`
- `from "fs"`
- `from "path"`

## Lessons

- Shared tactical-map dependencies must remain browser-safe all the way down the import graph.
- If a helper is used by both simulation/runtime code and browser UI, file loading must be injected from adjacent `*_node.ts` modules rather than embedded into the shared helper.
- `dev:map` crashes caused by Node externalization are usually architecture leaks, not just build-config problems.
