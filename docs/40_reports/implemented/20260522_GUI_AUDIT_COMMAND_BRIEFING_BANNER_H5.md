# GUI Audit Command Briefing Banner H5

**Date:** 2026-05-22  
**Type:** Tactical-map visual polish fix from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or turn-advance logic changed.

## Why

The GUI visual audit Batch H P2-5 found that the COMMAND BRIEFING banner sat across the top-center map counter field and used low-contrast secondary text over terrain.

## Change

- `CommandBriefingLayer` now anchors to a compact right-side strip on desktop instead of spanning the top-center map.
- The banner uses an opaque panel backing, with an opaque red critical state and stronger border contrast.
- The headline line now uses `text-text-primary` instead of low-contrast secondary text.
- Briefing items stack vertically inside a bounded scroll area so the strip stays contained when several items are present.
- Added a static regression contract in `tests/ui/command_briefing_banner_contract.test.ts`.

## Verification

- Red run `npx.cmd vitest run tests\ui\command_briefing_banner_contract.test.ts --reporter=dot` failed before the patch because the banner lacked the right-side placement test id and opaque/high-contrast classes.
- `npx.cmd vitest run tests\ui\command_briefing_banner_contract.test.ts --reporter=dot` passed 2/2 after the patch.
- Focused GUI audit suite `npx.cmd vitest run tests\ui\command_briefing_banner_contract.test.ts tests\ui\gui_audit_polish_cleanup.test.ts tests\ui\ops_planning_draft_guard.test.ts tests\ui\map_mode_shortcut_contract.test.ts tests\ui\warroom_shell_accessibility.test.ts tests\warroom_shell_layer.test.ts --reporter=dot` passed 59/59.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed.

## Remaining GUI Audit Queue

This closes Batch H item P2-5. Remaining Batch H work: supply legend overlap, desk-map projection polish, commander empty-state verification, and optional retired-chrome deletion after import safety review.
