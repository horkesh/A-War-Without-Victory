# GUI Audit Warroom Shell Ownership

**Date:** 2026-05-22  
**Type:** Tactical-map / Warroom shell UI ownership fix from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or operation logic changed.

## Why

The GUI visual audit Batch F found shell-ownership bleed between the tactical map and the React Warroom:

- Tactical chrome such as map-mode controls, minimap/zoom affordances, layer controls, and Strategic Dashboard entrypoints could remain mounted while `appScreen === 'warroom'`.
- Army HQ exposed two controls with the same close label and did not offer Warroom return in browser Warroom-launched sessions.
- Decision Room command-loop lanes could repeat the same top headline across multiple lanes, making distinct lenses read like duplicates.

## Change

- `App.tsx` now mounts `MapModeLegend`, `Minimap`, and `BottomStatusStrip` only when `appScreen === 'game'`.
- `shouldShowWarroomReturn(...)` now treats `?view=warroom` as a Warroom-launched shell path, in addition to desktop IPC and embedded tactical map mode.
- `ArmyHQModal` keeps one explicit `Close Army Headquarters` label for the header close control while the backdrop uses a distinct dismissal label.
- `presidentialDecisionRoom.ts` de-duplicates repeated command-question headlines by prefixing subsequent duplicates with the lane label.
- Added `tests/ui/warroom_shell_ownership.test.ts` covering tactical chrome gates, Warroom return, Army HQ exit labels, and Decision Room headline de-duplication.

## Verification

- Red run `npx.cmd vitest run tests\ui\warroom_shell_ownership.test.ts --reporter=dot` failed before the patch across all four expected Batch F contracts.
- `npx.cmd vitest run tests\ui\warroom_shell_ownership.test.ts --reporter=dot` passed 4/4 after the patch.
- `npx.cmd vitest run tests\ui\warroom_shell_ownership.test.ts tests\warroom_shell_layer.test.ts tests\ui_shell_navigation.test.ts tests\ui_presidential_decision_room_wiring.test.ts tests\v093_a11y_lane_c_warroom_decision_room.test.ts --reporter=dot` passed 77/77.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite warnings.
- `git diff --check` passed.

## Remaining GUI Audit Queue

This closes GUI visual audit Batch F. Remaining 2026-05-22 GUI audit batches: G no-op controls/onboarding spotlight/bridge-unavailable feedback and H polish cleanup.
