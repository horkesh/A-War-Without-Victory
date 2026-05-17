# CRT Command Surface Art Direction

**Date:** 2026-05-17  
**Scope:** GUI_POLISH_MASTER P1-9  
**Result:** The live tactical command surfaces no longer use the CRT scanline overlay.

## Summary

The GUI polish audit flagged the command rail CRT treatment as a dated visual signal for AWWV's sober institutional tone. The conservative autonomous decision was to remove the scanline overlay from the live tactical command surfaces while keeping the existing dark panel, border, paper-grain, and command-shell styling.

## Changes

- Removed `crt-overlay` from `OOBSidebar.tsx`.
- Removed `crt-overlay` from the empty and loaded `OperationsPanel.tsx` / Field Ops Snapshot paths.
- Added a static regression so those two live tactical command surfaces cannot reintroduce the CRT overlay class.

## UX Rationale

- The command rail and Field Ops Snapshot are repeated-use operational surfaces, not diegetic retro terminals.
- The existing dark institutional shell, amber headings, panel borders, and paper texture already match the game's command-room tone.
- Removing the scanline layer reduces visual noise over dense text and counters without changing layout or behavior.

## Determinism

Renderer-only visual cleanup. No simulation rule, scenario data, save schema, serializer, random path, combat pipeline, or scenario output changed.

## Verification

- `tests/ui/no_crt_command_surfaces.test.ts` guards the live tactical command rail and Field Ops Snapshot against `crt-overlay`.
- `npx.cmd vitest run tests/ui/no_crt_command_surfaces.test.ts tests/ui_shell_frame_contract.test.ts` passed 9/9.
- `npx.cmd tsc --noEmit` passed.
- `npm.cmd run desktop:map:build` passed with the existing Vite browser-external/dynamic-import/chunk warnings.
