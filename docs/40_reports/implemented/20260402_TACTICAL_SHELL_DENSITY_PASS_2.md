# 2026-04-02 Tactical Shell Density Pass 2

## Summary

Continued the UI/UX density pass in `F:\AWWV_exec_clean`, this time targeting the structural shell surfaces that define spacing conventions across the product:

- OOB sidebar
- Army HQ modal
- Codex panel
- shared `GlassPanel` primitive

## What Changed

- `src/ui/map/components/OOBSidebar.tsx`
  - slightly narrowed the rail width
  - reduced command-header height and accordion section padding
  - tightened faction divider and mobilization/operations blocks
- `src/ui/map/components/army_hq/ArmyHQModal.tsx`
  - compacted header, tab row, top-grid spacing, and corps-card grid gaps
  - reduced crest/button footprint so more command content fits above the fold
- `src/ui/map/components/CodexPanel.tsx`
  - narrowed the shell slightly
  - reduced sidebar row padding and content-pane padding
  - tightened paper-view header/body/footer spacing
- `src/ui/map/components/GlassPanel.tsx`
  - reduced header height and content padding for all shared glass-panel users
  - this lifts density across multiple downstream panels without changing their logic

## Why

The first density pass handled the tactical detail panels, but the broader product still inherited roomy spacing from its structural shells. These components matter more than they look:

- `OOBSidebar` defines how dense command browsing feels
- `ArmyHQModal` sets the standard for strategic command surfaces
- `CodexPanel` needs to feel archival and readable, not padded into sluggishness
- `GlassPanel` is a spacing multiplier because so many overlays inherit from it

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_map_render_smoke.test.ts`
  - PASS (`26` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Outcome

The larger shell now spends less space on chrome and more on command content. This is still not the final UX pass, but the tactical/strategic shells are now moving toward a denser, more studio-grade command presentation.
