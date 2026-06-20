# Ops Planning Prediction Labels

**Date:** 2026-06-20
**Result:** Implemented

## Summary
- G2 assessment and Narrative briefing now render prediction outcomes and staff recommendations through localized player-facing labels instead of raw enum ids.
- The left G2 snapshot, Narrative quick assessment, and Narrative fallback prose now share the same label helpers.
- Unknown prediction/recommendation values fall back to neutral copy instead of echoing raw identifiers.

## Changes Made
- `src/ui/map/components/ops_modal/planningAssessmentLabels.ts`
  - Added localized helper functions for predicted outcomes and recommended actions.
- `src/ui/map/components/ops_modal/G2Phase.tsx`
  - Replaced direct `prediction.overall.predictedOutcome` rendering in the G2 snapshot.
- `src/ui/map/components/ops_modal/NarrativeTab.tsx`
  - Replaced direct predicted-outcome and recommendation rendering in quick assessment and fallback prose.
- `tests/ui/ops_planning_target_discovery.test.ts`
  - Added EN and BCS regressions that fail on visible `costly_victory`, `postpone`, or `abort` in G2/Narrative copy.

## Verification
- Red proof: `npm.cmd exec -- vitest run tests/ui/ops_planning_target_discovery.test.ts --pool=forks --reporter=dot` failed on visible `costly_victory`, `postpone`, and `abort`.
- Green proof: `npm.cmd exec -- vitest run tests/ui/ops_planning_target_discovery.test.ts --pool=forks --reporter=dot` passed 20/20.
- `npm.cmd exec -- vitest run tests/ui/ops_planning_target_discovery.test.ts tests/ui_i18n.test.ts --pool=forks --reporter=dot` passed 33/33.
- `npm.cmd run typecheck` passed.
- `git diff --check` passed.
- `npm.cmd run qa:player-journeys` passed 232/232.
- `npm.cmd run qa:live-surface:browser` passed with strict dev-server cleanup; temporary `.tmp_live_surface_browser_sweep` evidence was removed after verification.

## Determinism / Scope
UI/read-model copy, localized presentation helpers, and focused tests only. No simulation logic, scenario data, Srebrenica/Zepa lifecycle ownership, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.

## Next Steps
- Fix the CommanderPhase unavailable-reason copy leak identified by the Pyrrhic scout.
- Harden live-surface raw-token guards with low-noise exact telemetry patterns after the current UI copy slices land.
