# Convoy System Completion

**Date:** 2026-05-16
**Status:** Tasks 1-2 implemented; Tasks 3-4 blocked on canon ruling
**Plan:** `docs/plans/2026-05-16-convoy-system-completion-plan.md`

## Summary

Humanitarian convoys now have direct lifecycle coverage and a dedicated player decision modal.

- Added `tests/humanitarian_convoy_lifecycle.test.ts` covering convoy generation thresholds, deterministic IDs, dedupe/sorting, player-route persistence, AI default decisions, allow/block/divert effects, empty-queue behavior, and determinism.
- Added `ConvoyDecisionModal`, reachable from the Presidential Inbox convoy card.
- Inbox convoy items now route to `convoy_decision_modal` instead of the War Summary convoy tab.
- `player_decision_manifest` now names `convoy_decision_modal` as the owner surface for the modal-required convoy family.
- The legacy Situation tab convoy controls remain available as a secondary summary surface, but the manifest-backed decision path has a dedicated resolver modal.

## Verification

- `npx.cmd vitest run tests\humanitarian_convoy_lifecycle.test.ts tests\phase_c_supply_agency.test.ts` passed 20/20.
- `npx.cmd vitest run tests\ui\convoy_decision_modal.test.ts tests\ui\inbox_items.test.ts tests\player_decision_manifest.test.ts` passed 36/36.
- Integrated focused regression with ops planning and decision-surface tests passed 100/100.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed for touched files with CRLF normalization warnings only.

## Open Canon Decisions

Task 3 remains blocked on a design/historical ruling for convoy aging or expiry.

Task 4 remains blocked on a design/historical ruling for route-controller versus target-owner semantics. Until that ruling lands, the canonical action owner remains the route controller.
