# 2026-04-02 Tactical Shell Density Pass 4

## Summary

Extended the density cleanup from the tactical shell into the larger strategic overlays:

- `ArmyHQModal`
- `CodexPanel`

This pass keeps the same information architecture, but removes the roomy dashboard feel that still made these screens slower to scan than the tighter tactical shell.

## What Changed

- `src/ui/map/components/army_hq/ArmyHQModal.tsx`
  - reduced header chrome, crest footprint, tab row padding, and top-grid spacing
  - tightened the commander/briefing/strategic-position strip so more command content sits above the fold
  - compacted the corps-card section header and grid spacing
- `src/ui/map/components/CodexPanel.tsx`
  - narrowed the shell and sidebar slightly
  - reduced list-row, header, and content padding
  - tightened the paper-view header/body/footer rhythm so essays still feel archival without wasting vertical space

## Why

The shared shell-density pass improved the command rails, but the larger overlays were still telling a different UX story:

- Army HQ still felt like a roomy admin dashboard instead of a military command surface
- Codex still felt like a generic modal instead of a compact archival tool

For a strategy game, those shells should not feel separated from the rest of the command language. Density is part of coherence.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_map_render_smoke.test.ts tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts`
  - PASS (`26` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Outcome

Army HQ and Codex now sit closer to the same command-density standard as the tactical shell. There is still room for a more holistic UI architecture pass later, but these two large overlays no longer lag so far behind the rest of the swamp-drain work.
