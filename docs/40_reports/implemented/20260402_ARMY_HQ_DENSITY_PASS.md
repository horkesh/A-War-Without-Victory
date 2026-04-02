# 2026-04-02 - Army HQ density pass

## Summary

This pass tightened the mounted Army HQ shell so corps cards and expanded operations stop consuming vertical space faster than the information justifies.

## Scope

- `src/ui/map/components/army_hq/CollapsibleSection.tsx`
- `src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx`
- `src/ui/map/components/army_hq/OperationsSection.tsx`

## What changed

- reduced shared collapsible-section padding and body spacing
- reduced corps-card minimum height and trimmed front-face vertical rhythm
- tightened expanded corps-card header spacing and summary metrics gap
- reduced expanded operation-detail padding and stack spacing

## Why this mattered

Army HQ is supposed to feel like a compressed command desk, not a slide deck. The previous shell had too much inherited vertical breathing room, which made corps cards feel sparse and pushed useful detail lower than it needed to be.

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_map_render_smoke.test.ts tests\ui_player_visibility.test.ts tests\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Follow-up

- continue the density pass on any mounted map-side shells that still accumulate empty bands
- once the shell wave is coherent enough, move into the broader architecture pass and rationalize the UI/product ownership lines
