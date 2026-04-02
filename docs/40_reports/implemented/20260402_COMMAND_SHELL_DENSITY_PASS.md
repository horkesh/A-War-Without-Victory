# 2026-04-02 - Command shell density pass

## Summary

Performed a focused density/blank-space pass on the most frequently used command shells rather than chasing one-off widgets. The goal was to make the live player experience feel more like an operational desk and less like a presentation layer with oversized gutters.

This pass tightened:

- `ArmyHQModal`
- `PersonnelContent`
- `WarSummaryModal`
- `CodexPanel`

## What changed

### Army HQ

- tightened header and tab-strip padding
- reduced crest footprint so briefing content stays higher on the screen
- reduced briefing grid and section spacing
- trimmed the main scroll area padding

### Personnel tab

- reduced vertical spacing between sections
- reduced card padding and inter-card gaps
- tightened reserve-pool spacing
- slightly reduced stat-card headline height to keep the tab denser

### War Summary modal

- reduced outer modal padding and overall width
- reduced tab spacing and section spacing
- shortened the non-overview panel height a little so the modal reads denser and less floaty

### Codex

- slightly reduced overall panel width/height
- narrowed the year sidebar
- reduced content padding and essay-paper padding
- tightened empty/locked-state callouts so the shell wastes less space

## Why this matters

In AWWV, “too much space everywhere” is not usually a per-component styling mistake. It tends to come from a small number of command-shell wrappers and summary surfaces carrying oversized defaults. Tightening those shared shells improves the whole product tone much faster than polishing isolated panels.

This also reinforces the product-shell hierarchy work: Warroom, Tactical Map, Army HQ, and Codex should feel like connected command tools, not separate UI eras with different density expectations.

## Files changed

- `src/ui/map/components/army_hq/ArmyHQModal.tsx`
- `src/ui/map/components/army_hq/PersonnelContent.tsx`
- `src/ui/map/components/WarSummaryModal.tsx`
- `src/ui/map/components/CodexPanel.tsx`

## Verification

- `F:\A-War-Without-Victory\node_modules\.bin\vitest.cmd run tests\ui_map_render_smoke.test.ts tests\ui_shell_navigation.test.ts tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts`
- `npm.cmd run warroom:build`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Known limitation

`npm.cmd run desktop:map:build` in the merge worktree still fails because that worktree environment cannot resolve `@vitejs/plugin-react`. This is the same merge-worktree environment issue already seen earlier, not a regression introduced by this density pass.
