# GUI Audit Army HQ Commander Empty State H8

**Date:** 2026-05-22  
**Type:** Army HQ data-resolver/UI visibility fix from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or turn-advance logic changed.

## Why

The GUI visual audit Batch H P3-8 found an Army HQ BRIEFING card reading "No commander data available" at turn 188 and called for verification before either populating or hiding it.

## Finding

The card should populate when `namedOfficerData` already contains an active army commander. The resolver was too strict: `getFactionArmyCommander(...)` and the army-HQ branch of `getFormationCommander(...)` required `namedOfficerStateById[id].status === 'active'`, even though the flattened `NamedOfficerView` also carries `status`.

## Change

- Army commander lookup now accepts an active flattened `NamedOfficerView` when the sidecar state map row is absent.
- Existing sidecar state still wins when present, preserving KIA/captured/retired filtering.
- Added a regression in `tests/ui/officer_mini_bio.test.ts` proving Army HQ renders the commander dossier and does not show the empty state when flattened active officer data is sufficient.

## Verification

- Red run `npx.cmd vitest run tests\ui\officer_mini_bio.test.ts --reporter=dot` failed before the patch because Army HQ rendered the empty commander state.
- `npx.cmd vitest run tests\ui\officer_mini_bio.test.ts --reporter=dot` passed 4/4 after the patch.
- Focused GUI/officer suite `npx.cmd vitest run tests\ui\officer_mini_bio.test.ts tests\ui\supply_legend_overlap_contract.test.ts tests\ui\command_briefing_banner_contract.test.ts tests\ui\gui_audit_polish_cleanup.test.ts tests\ui\ops_planning_draft_guard.test.ts tests\ui\map_mode_shortcut_contract.test.ts tests\ui\warroom_shell_accessibility.test.ts tests\warroom_shell_layer.test.ts --reporter=dot` passed 65/65.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed.

## Remaining GUI Audit Queue

This closes Batch H item P3-8. Remaining Batch H work: optional retired-chrome deletion after import safety review.
