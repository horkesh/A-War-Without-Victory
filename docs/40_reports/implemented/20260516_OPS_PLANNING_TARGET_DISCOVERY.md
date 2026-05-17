# Ops Planning Target Discovery

**Date:** 2026-05-16
**Status:** Implemented
**Plan:** `docs/plans/2026-05-16-ops-planning-modal-target-discovery-plan.md`

## Summary

The Ops Planning modal now gives the player a deterministic way out of the blind objective-hunt loop.

- Plan phase has a `Suggest Plan` button, disabled until commander selection exists.
- Suggestions fill a first available objective, set schwerpunkt, and assign ready corps brigades through the existing deterministic brigade scorer.
- Objective panel shows a live `Available` count for selectable enemy objectives.
- Ops map adds an `ops-available-targets` highlight source for in-range target discovery.
- Phase-gate failures now produce visible prerequisite messages instead of silent no-ops.
- Plan-to-G2 advance affordances are disabled until the plan has at least one objective and one brigade.
- CorpsDetail now prefers a forward sector when opening the modal and `OpsPlanningModal` honors that selected sector for default staging.

## Verification

- `npx.cmd vitest run tests\ui\ops_planning_target_discovery.test.ts tests\ui\ops_modal_auto_propose.test.ts` passed 18/18.
- Integrated focused regression with convoy and decision-surface tests passed 100/100.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed for the touched files with CRLF normalization warnings only.

## Residuals

The implemented target-discovery lane is renderer-only. It does not change the operation submit IPC, G-2 assessment content, operation naming pools, or simulation state. Future polish can replace the current MapLibre highlight source with a deck.gl halo if visual QA proves the source-layer highlight is insufficient.
