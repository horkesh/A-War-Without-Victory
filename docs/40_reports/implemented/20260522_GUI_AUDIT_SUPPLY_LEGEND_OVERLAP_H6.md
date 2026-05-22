# GUI Audit Supply Legend Overlap H6

**Date:** 2026-05-22  
**Type:** Tactical-map visual polish fix from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or turn-advance logic changed.

## Why

The GUI visual audit Batch H P2-13 found that the Supply mode "SUPPLY STATUS" legend could overlap the left-sidebar Alliance Gauge label.

## Change

- `MapModeLegend` now anchors just to the right of the fixed 15.5rem OOB sidebar instead of inside the sidebar column.
- `SupplyPanel` now uses the same sidebar-aware left offset, keeping logistics bars off the Situation/Alliance content.
- Added stable test ids and a static overlap regression contract in `tests/ui/supply_legend_overlap_contract.test.ts`.

## Verification

- Red run `npx.cmd vitest run tests\ui\supply_legend_overlap_contract.test.ts --reporter=dot` failed before the patch because both overlays were still anchored inside the left OOB sidebar column.
- `npx.cmd vitest run tests\ui\supply_legend_overlap_contract.test.ts --reporter=dot` passed 2/2 after the patch.
- Focused GUI audit suite `npx.cmd vitest run tests\ui\supply_legend_overlap_contract.test.ts tests\ui\command_briefing_banner_contract.test.ts tests\ui\gui_audit_polish_cleanup.test.ts tests\ui\ops_planning_draft_guard.test.ts tests\ui\map_mode_shortcut_contract.test.ts tests\ui\warroom_shell_accessibility.test.ts tests\warroom_shell_layer.test.ts --reporter=dot` passed 61/61.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed.

## Remaining GUI Audit Queue

This closes Batch H item P2-13. Remaining Batch H work: desk-map projection polish, commander empty-state verification, and optional retired-chrome deletion after import safety review.
