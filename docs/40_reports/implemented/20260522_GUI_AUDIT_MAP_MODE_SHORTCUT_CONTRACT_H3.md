# GUI Audit Map Mode Shortcut Contract H3

**Date:** 2026-05-22  
**Type:** Tactical-map map-mode shortcut/docs contract fix from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or map rendering layer semantics changed.

## Why

The GUI visual audit Batch H P2-1 found that the live bottom toolbar exposed nine modes while older documentation and shortcut comments still described five, six, or seven modes. The keyboard hook also carried a duplicated hard-coded mode list.

## Change

- `useKeyboardShortcuts.ts` now derives numeric map-mode shortcuts from `MAP_MODES` instead of a duplicate array.
- The shortcut header now names the live `1-9` contract.
- Engineering and player docs now describe the nine live modes: Political, Ethnic, Supply, Casualties, Morale, Operations, Defense, Authority, and Legitimacy.
- Added `tests/ui/map_mode_shortcut_contract.test.ts` to guard the `MAP_MODES` key order, key `9` behavior, data-driven shortcut ownership, and current docs.

## Verification

- Red run `npx.cmd vitest run tests\ui\map_mode_shortcut_contract.test.ts --reporter=dot` failed before the patch because the keyboard hook did not import `MAP_MODES` and `MAP_UI_MASTER` did not contain Authority/Legitimacy.
- `npx.cmd vitest run tests\ui\map_mode_shortcut_contract.test.ts --reporter=dot` passed 4/4 after the patch.
- Focused surrounding suite `npx.cmd vitest run tests\ui\map_mode_shortcut_contract.test.ts tests\ui\map_modes_no_duplicate_labels.test.ts tests\ui\bottom_status_strip_labels.test.ts tests\ui\pause_escape_shortcuts.test.ts tests\warroom_shell_ownership.test.ts --reporter=dot` passed 13/13.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with the repository's existing Vite warnings.

## Remaining GUI Audit Queue

This closes Batch H item P2-1. Remaining Batch H work: Command Briefing banner contrast/placement, Warroom calendar date/font polish, supply legend overlap, desk-map projection polish, commander empty-state verification, and optional retired-chrome deletion after import safety review.
