# 2026-04-03 - Summary and Codex shell integrity pass

## Summary
- Removed the `SituationTab` front-summary fallback that was reconstructing front state from compatibility `assignableFrontSegments` when canonical pressure data was absent.
- Reworked Army HQ Records so Codex is presented as a handoff to its own shell instead of a fake records subtab.
- Tightened a few remaining shell consistency helpers by using canonical `activeBrigades` in Warroom and making the shared player-facing label helper type-safe.

## Files changed
- `src/ui/map/components/SituationTab.tsx`
- `src/ui/map/components/army_hq/RecordsContent.tsx`
- `src/ui/shared/playerFacingLabels.ts`
- `src/ui/warroom/components/FactionOverviewPanel.ts`
- `tests/ui_player_visibility.test.ts`

## Why
- `SituationTab` was still able to invent front-state counts from compatibility front segments, which kept a second summary authority alive after the main engine cleanup.
- Army HQ Records visually implied that Codex was one more records tab even though it actually opens a separate shell. That is the kind of shell-hierarchy lie that keeps UX drift alive.
- Warroom and shared label helpers should consume canonical counts and sources, not quietly recompute or lean on brittle typing shortcuts.

## Verification
- `node .\\node_modules\\vitest\\vitest.mjs run tests\\ui_player_visibility.test.ts tests\\ui_map_render_smoke.test.ts tests\\warroom_player_visibility.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\\repo\\check_claude_governance.ps1`
