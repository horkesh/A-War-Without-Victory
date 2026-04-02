# 2026-04-02 Tactical Shell Density Pass 3

## Summary

Continued the command-density cleanup in `F:\AWWV_exec_clean`, this time tightening the top-level shell rails and shared spacing authority surfaces:

- `TopToolbar`
- `OOBSidebar`
- `AccordionHeader`
- shared shell clearance in `App`
- shared chrome rhythm in `globals.css`
- shared panel density in `GlassPanel`

## What Changed

- `src/ui/map/components/TopToolbar.tsx`
  - reduced overall toolbar padding and section gaps
  - compressed command crest/title telemetry block
  - narrowed the telemetry block on the right
  - tightened dev-only run sync controls so they stop dominating the shell
- `src/ui/map/components/OOBSidebar.tsx`
  - narrowed the command rail
  - tightened command header, army section spacing, and faction dividers
  - reduced mobilization/operations/sectors block padding
  - compressed army summary rows so more structure fits above the fold
- `src/ui/map/components/AccordionHeader.tsx`
  - reduced padding and title tracking so every accordion in the map shell inherits denser section chrome
- `src/ui/map/components/GlassPanel.tsx`
  - reduced header height and content padding again
  - raised usable content height for overlays/trays instead of spending that space on chrome
- `src/ui/map/App.tsx`
  - reduced the shell toolbar clearance variable so side rails sit closer to the top command bar
- `src/ui/map/styles/globals.css`
  - tightened `.module-header`, which affects every modular toolbar block

## Why

The swamp here was not one ugly panel. It was spacing authority:

- the toolbar was still spending too much room on chrome instead of command context
- the left command rail still felt like a roomy web sidebar instead of a command browser
- accordion headers and shared module headers were silently re-inflating every section
- overlay panels were still giving too much height away to header and padding rhythm

In a strategy shell like this, density is not cosmetic. It determines how much command state the player can hold on screen at once.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_map_render_smoke.test.ts`
  - PASS (`13` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Verification Limitation

- `npm.cmd run desktop:map:build`
  - could not run in this clean worktree because the local environment is missing `@vitejs/plugin-react`
  - this is an execution-lane environment problem, not a known product regression from the density changes

## Outcome

The shell now spends less space on ornamental padding and more on command content. Toolbar modules, accordion rails, and floating panels are all moving toward a denser command-console feel instead of a roomy dashboard layout.
