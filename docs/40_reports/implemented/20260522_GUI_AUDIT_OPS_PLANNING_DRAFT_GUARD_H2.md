# GUI Audit Ops Planning Draft Guard H2

**Date:** 2026-05-22
**Type:** Tactical-map Ops Planning UI correctness fix from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or operation launch logic changed.

## Why

The GUI visual audit Batch H identified two OpsPlanningModal defects:

- Escape and the close button discarded an in-progress operations plan immediately even when objectives or brigades were already assigned.
- Axis IDs came from a module-global `nextAxisCounter`, so IDs climbed across modal opens instead of deriving from the local plan state.

## Change

- Added `opsPlanningDraft.ts` as the local owner for dirty-draft detection and deterministic next-axis ID derivation.
- OpsPlanningModal now prompts with an in-app "Discard operations draft?" confirmation when the current plan has assigned objectives or brigades.
- Escape/close on a clean draft still exits immediately; Escape while the discard prompt is open cancels the prompt and keeps the draft.
- Removed the module-global axis counter and initializes the main axis from plan-local ID derivation.
- The discard confirmation title, body, actions, and close title route through the English/BCS dictionary with Bosnian BCS strings.
- Added `tests/ui/ops_planning_draft_guard.test.ts` guarding dirty-draft detection, plan-state axis IDs, and modal wiring.

## Verification

- Red run `npx.cmd vitest run tests\ui\ops_planning_draft_guard.test.ts --reporter=dot` failed before the patch because `opsPlanningDraft.ts` did not exist.
- `npx.cmd vitest run tests\ui\ops_planning_draft_guard.test.ts --reporter=dot` passed 3/3 after the patch.
- Focused surrounding suite `npx.cmd vitest run tests\ui\ops_planning_draft_guard.test.ts tests\ui\ops_planning_target_discovery.test.ts tests\ui\stale_state_resets.test.ts tests\ui\error_boundary_isolation.test.ts tests\z_index_canonical.test.ts --reporter=dot` passed 34/34 after localization reconciliation.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with the repository's existing Vite warnings.

## Remaining GUI Audit Queue

This closes Batch H items P2-8 and P3-9. Remaining Batch H work: map-mode docs/keyboard contract, Command Briefing banner contrast/placement, Warroom calendar date/font polish, supply legend overlap, desk-map projection polish, commander empty-state verification, and optional retired-chrome deletion after import safety review.
