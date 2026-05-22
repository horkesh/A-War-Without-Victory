# GUI Audit Warroom Calendar H4

**Date:** 2026-05-22
**Type:** Warroom visual polish fix from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or turn-advance logic changed.

## Why

The GUI visual audit Batch H P2-9 found that the Warroom wall-calendar label could render as a truncated partial date and used a casual marker fallback stack including Comic Sans.

## Change

- `getWarroomBoardDateLabel(...)` now falls back to the canonical turn date when metadata is partial, month-only, or missing a year.
- Full raw metadata dates are still preserved when they include a day and year.
- The Warroom date-board label now uses a sober fallback stack, smaller responsive type, centered wrapping, and no ellipsis truncation.
- Added regression coverage to `tests/ui/warroom_shell_accessibility.test.ts`.

## Verification

- Red run `npx.cmd vitest run tests\ui\warroom_shell_accessibility.test.ts --reporter=dot` failed before the patch because partial metadata returned `8 Nov` and the source still contained `Comic Sans MS`.
- `npx.cmd vitest run tests\ui\warroom_shell_accessibility.test.ts --reporter=dot` passed 8/8 after the patch.
- Focused surrounding suite `npx.cmd vitest run tests\ui\warroom_shell_accessibility.test.ts tests\ui\warroom_shell_ownership.test.ts tests\warroom_shell_layer.test.ts tests\ui\stale_state_resets.test.ts --reporter=dot` passed 53/53.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed.

## Remaining GUI Audit Queue

This closes Batch H item P2-9. Remaining Batch H work: Command Briefing banner contrast/placement, supply legend overlap, desk-map projection polish, commander empty-state verification, and optional retired-chrome deletion after import safety review.
