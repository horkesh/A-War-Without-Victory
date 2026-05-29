# GUI Audit Warroom Desk Map H7

**Date:** 2026-05-22
**Type:** Warroom visual polish fix from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or turn-advance logic changed.

## Why

The GUI visual audit Batch H P3-7 found that the Warroom `desk_map` projection was small and faint on a large empty corkboard.

## Change

- The Warroom projected-map projector now uses a larger 98x94 viewBox footprint instead of the prior 92x84 footprint.
- The desk-map wrapper padding is reduced so the map fills more of the authored hotspot.
- The paper/frame treatment has stronger opacity, border, shadow, outline, territory stroke, and front-line stroke values.
- `tests/warroom_shell_layer.test.ts` now asserts the larger projected footprint through deterministic path coordinates.

## Verification

- Red run `npx.cmd vitest run tests\warroom_shell_layer.test.ts --reporter=dot` failed before the patch because the projected outline still started at `M4 73`.
- `npx.cmd vitest run tests\warroom_shell_layer.test.ts --reporter=dot` passed 37/37 after the patch, with the projected outline now reaching `M1 74.5`.
- Focused GUI audit suite `npx.cmd vitest run tests\ui\supply_legend_overlap_contract.test.ts tests\ui\command_briefing_banner_contract.test.ts tests\ui\gui_audit_polish_cleanup.test.ts tests\ui\ops_planning_draft_guard.test.ts tests\ui\map_mode_shortcut_contract.test.ts tests\ui\warroom_shell_accessibility.test.ts tests\warroom_shell_layer.test.ts --reporter=dot` passed 61/61.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed.

## Remaining GUI Audit Queue

This closes Batch H item P3-7. Remaining Batch H work: commander empty-state verification and optional retired-chrome deletion after import safety review.
