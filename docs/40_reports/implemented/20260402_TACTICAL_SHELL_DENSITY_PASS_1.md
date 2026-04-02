# 2026-04-02 Tactical Shell Density Pass 1

## Summary

Started the queued UI/UX density pass in `F:\AWWV_exec_clean`, focusing on the highest-traffic tactical shell surfaces rather than decorative edge panels. This slice tightens spacing and chrome in the places the player sits in for entire sessions:

- top toolbar
- settlement selection panel
- formation detail
- corps detail
- operations center
- army reserve panel

## What Changed

- `src/ui/map/components/TopToolbar.tsx`
  - reduced horizontal gaps between toolbar modules
  - tightened button paddings and tracking
  - slightly reduced crest / divider footprint so the toolbar consumes less vertical attention
- `src/ui/map/components/SelectionPanel.tsx`
  - compacted skeleton and live panel padding
  - tightened the local-support box so it reads as part of the panel rather than a second roomy card
- `src/ui/map/components/FormationDetail.tsx`
  - reduced header and body padding
  - tightened internal vertical rhythm in the overview shell
- `src/ui/map/components/CorpsDetail.tsx`
  - reduced header, skeleton, and tab-body padding
  - tightened overview / sectors / ops / orders spacing
- `src/ui/map/components/OperationsPanel.tsx`
  - compacted the header, left rail, operation cards, and right detail pane
  - reduced whitespace without changing operation information hierarchy
- `src/ui/map/components/ArmyReservePanel.tsx`
  - reduced body/card spacing and per-entry padding
  - keeps reserve information dense enough to scan as a command table rather than a stack of oversized cards

## Why

The shell had started accumulating “comfortable web app” spacing in places that should feel more like a command console:

- too much empty chrome around primary actions
- detail panes that wasted vertical room before showing the important numbers
- list cards that felt individually precious instead of part of one operational surface

For a strategy game, especially one aiming at Paradox/Matrix-level command density, the default should be compact clarity, not generous whitespace.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_map_render_smoke.test.ts`
  - PASS (`26` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Outcome

The tactical shell now uses space more like a command surface and less like a roomy dashboard. This is a first density pass, not the final UI cleanup: it addresses obvious dead air in the primary shell before moving on to broader layout/ownership refinement.
