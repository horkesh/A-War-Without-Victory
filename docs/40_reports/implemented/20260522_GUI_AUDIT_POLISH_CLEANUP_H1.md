# GUI Audit Polish Cleanup H1

**Date:** 2026-05-22  
**Type:** Tactical-map / Army HQ polish cleanup from the 2026-05-22 GUI visual audit. No simulation behavior, save schema, scenario data, calibration/army-arc tuning, combat math, or operation logic changed.

## Why

The GUI visual audit Batch H included several source-level polish issues that were safe to close without changing player-command mechanics:

- `CoachmarkLayer` carried a dead selector field that the resolver never used.
- `OrderInterpretationPanel` used a dev-style `//` separator in a player-facing header.
- `OperationBriefingModal` showed raw warning glyphs on Direct Intervention labels.
- `FORCE_LAUNCH_COST = 15` was duplicated between the operation briefing modal and Army HQ operations section.
- `OpsMapRenderer` shipped player-runtime `console.log('[OpsMap] ...')` diagnostics.

## Change

- Removed the unused `target` field from coachmark definitions and updated the consolidation test to assert the live `data-coachmark-id` contract.
- Replaced the order-interpretation header separator with plain player-facing punctuation.
- Removed raw warning glyphs from OperationBriefingModal Direct Intervention labels.
- Added `src/ui/map/utils/commandAuthority.ts` as the shared UI command-authority constant owner for force-launch cost and recovery rate; both operation surfaces now import it.
- Gated OpsMap diagnostics behind a disabled `debugOpsMap(...)` helper using `console.debug` instead of unconditional `console.log`.
- Added `tests/ui/gui_audit_polish_cleanup.test.ts` guarding the H1 cleanup contracts.

## Verification

- Red run `npx.cmd vitest run tests\ui\gui_audit_polish_cleanup.test.ts --reporter=dot` failed before the patch because the shared command-authority module did not exist.
- `npx.cmd vitest run tests\ui\gui_audit_polish_cleanup.test.ts --reporter=dot` passed 5/5 after the patch.
- Focused surrounding suite `npx.cmd vitest run tests\ui\gui_audit_polish_cleanup.test.ts tests\ui\coachmark_layer.test.ts tests\ui\onboarding_track_d_consolidation.test.ts tests\command_authority_lifecycle.test.ts tests\command_authority_interpretation_review.test.ts tests\modal_migration_2.test.ts tests\ui\modal_palette_unification.test.ts tests\ui\ops_planning_target_discovery.test.ts --reporter=dot` passed 136/136.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with the repository's existing Vite warnings.
- `git diff --check` passed.

## Remaining GUI Audit Queue

This closes the source-level H1 polish slice. Remaining Batch H work: map-mode docs/keyboard contract, Command Briefing banner contrast/placement, OpsPlanningModal draft-discard confirmation, Warroom calendar date/font polish, supply legend overlap, desk-map projection polish, commander empty-state verification, module-global ops axis counter cleanup, and optional retired-chrome deletion after import safety review.
