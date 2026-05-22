# GUI Audit Modal Palette Unification

**Date:** 2026-05-22  
**Type:** Tactical-map modal visual-system fix from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or operation logic changed.

## Why

The GUI visual audit identified two consequential operation-command modals as visually detached from the rest of the dark command shell:

- `OperationBriefingModal.tsx` still used a light command-card palette across its shell, cards, action bar, and assessment badges.
- `CommanderSelectionModal.tsx` still used `bg-white`, neutral light borders, and light hover fills on the officer roster.

These surfaces are part of the operation go/no-go flow and should look like the same command system as Army HQ, Warroom, and the shared modal stack.

## Change

- Re-skinned `OperationBriefingModal` to `bg-panel-bg`, `bg-panel-card`, `border-panel-border`, and `text-text-primary` shell tokens.
- Re-skinned command-record, readiness, constraint, direct-intervention, and action-button regions away from light neutral/amber/red card fills.
- Re-skinned `CommanderSelectionModal` shell, header, roster cards, footer, and fit/casualty status colors to the dark panel palette.
- Added `tests/ui/modal_palette_unification.test.ts`, a static regression guard forbidding the old light palette tokens in both Batch D target files.

## Verification

- Red run `npx.cmd vitest run tests\ui\modal_palette_unification.test.ts --reporter=dot` failed before the patch because both target files lacked `bg-panel-bg` and still carried the old light palette.
- `npx.cmd vitest run tests\ui\modal_palette_unification.test.ts --reporter=dot` passed 2/2 after the patch.
- `npx.cmd vitest run tests\ui\modal_palette_unification.test.ts tests\modal_migration_2.test.ts tests\v093_a11y_lane_a_modal_stack.test.ts --reporter=dot` passed 35/35.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite warnings.
- `git diff --check` passed.

## Remaining GUI Audit Queue

This closes GUI visual audit Batch D. Remaining 2026-05-22 GUI audit batches: E stale-state resets, F Warroom chrome/shell ownership, G no-op controls/onboarding spotlight/bridge-unavailable feedback, and H polish cleanup.
