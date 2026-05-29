# GUI Audit Retired Chrome Removal H9

**Date:** 2026-05-22
**Type:** GUI source cleanup from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or turn-advance logic changed.

## Why

The GUI visual audit Batch H P3-6 identified `_retired_chrome/MapModeToolbar.tsx` and `_retired_chrome/TopToolbar.tsx` as dead source files that could confuse future audits because the live tactical shell is owned by `PresidentialToolbar`, `BottomStatusStrip`, and App-level orchestration.

## Review

`rg` found no live App imports of `_retired_chrome`, `TopToolbar`, or `MapModeToolbar`. Follow-up reconciliation removed the stale Storybook story import and updated the Lane E a11y source-scan test so it no longer expects the retired toolbar file to exist.

## Change

- Deleted `src/ui/map/components/_retired_chrome/MapModeToolbar.tsx`.
- Deleted `src/ui/map/components/_retired_chrome/TopToolbar.tsx`.
- Deleted the stale `src/ui/map/stories/TopToolbar.stories.tsx` story that imported the removed component.
- Updated `tests/v093_a11y_lane_e_forms_live_regions.test.ts` to treat retired chrome deletion as the live a11y contract.
- Added `tests/ui/retired_chrome_removed.test.ts` to keep the retired chrome files off disk and out of App imports.

## Verification

- Red run `npx.cmd vitest run tests\ui\retired_chrome_removed.test.ts --reporter=dot` failed before deletion because the retired files still existed.
- `npx.cmd vitest run tests\ui\retired_chrome_removed.test.ts tests\v093_a11y_lane_e_forms_live_regions.test.ts --reporter=dot` passed after deletion and source-scan reconciliation.
- Focused GUI audit suite `npx.cmd vitest run tests\ui\retired_chrome_removed.test.ts tests\ui\officer_mini_bio.test.ts tests\ui\supply_legend_overlap_contract.test.ts tests\ui\command_briefing_banner_contract.test.ts tests\ui\gui_audit_polish_cleanup.test.ts tests\ui\ops_planning_draft_guard.test.ts tests\ui\map_mode_shortcut_contract.test.ts tests\ui\warroom_shell_accessibility.test.ts tests\warroom_shell_layer.test.ts --reporter=dot` passed 66/66.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed.

## Remaining GUI Audit Queue

This closes Batch H item P3-6. Batch H from `docs/40_reports/GUI_VISUAL_AUDIT_2026-05-22.md` is implementation-closed.
