# 2026-04-02 Warroom And Detail Player-Safe Name Hardening

## Summary

Continued the clean-lane player-truth cleanup in `F:\AWWV_exec_clean` by hardening another set of player-facing naming seams. This slice focused on operation-detail allocations, settlement/detail municipality labels, and Warroom snapshot/newspaper naming so those surfaces stop falling back to raw corps, brigade, and municipality identifiers.

## What Changed

- `src/ui/map/components/OperationsPanel.tsx`
  - allocated-asset chips now use player-safe brigade fallback text instead of raw brigade ids
- `src/ui/map/components/FormationDetail.tsx`
  - municipality line now uses player-safe municipality labeling
  - elite-loan destination already routed through player-facing corps naming
- `src/ui/map/components/SettlementDetailContent.tsx`
  - municipality population section now falls back to player-safe municipality labels instead of raw ids
- `src/ui/warroom/data/war_data_extractor.ts`
  - own-force snapshot names now use player-safe corps/brigade labels
  - own corps-operation labels now use player-safe corps naming
- `src/ui/warroom/components/NewspaperModal.ts`
  - newspaper succession copy now uses neutral officer fallback text and player-safe corps naming
- `tests/warroom_player_visibility.test.ts`
  - extended regression coverage so `extractWarData(...)` cannot quietly return raw corps/brigade ids in player-facing snapshots

## Why

The repo had already cleaned up the large omniscient leaks, but some smaller surfaces were still using `name ?? id` or `display_name ?? key` patterns. Those are dangerous because they make the product feel truthful until a label is missing, at which point the UI suddenly speaks in engine identifiers.

This pass keeps pushing the same rule:

- player-facing surfaces may degrade to neutral or humanized text
- they may not degrade to raw internal identifiers

## Verification

- `node_modules\.bin\vitest.cmd run tests\ui_player_visibility.test.ts tests\warroom_player_visibility.test.ts tests\ui_map_render_smoke.test.ts`
  - PASS (`25` tests)
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`
  - PASS

## Outcome

Warroom snapshots, newspaper succession prose, operation allocation chips, and settlement/detail municipality labels are now more consistent with the same player-safe naming layer already used elsewhere in the shell.
