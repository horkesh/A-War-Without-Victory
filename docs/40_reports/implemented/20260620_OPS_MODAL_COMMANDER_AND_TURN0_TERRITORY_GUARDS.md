# Ops Modal Commander and Turn-0 Territory Guards

**Date:** 2026-06-20
**Result:** Implemented

## Summary
- Ops planning G2 and OPORD surfaces now use the shared opening commander display resolver when no explicit operation commander is seated.
- Turn-0 `territory_net` and `notable_flips` are treated as scenario-start provenance on player-facing digest/briefing/aftermath surfaces, not as ground taken after play began.
- Both fixes are UI/read-model only and preserve the existing no-mutation startup commander contract.

## Changes Made
### Ops Planning Commander Display
- Updated G2 assessment copy to resolve corps command through `resolveCorpsCommanderDisplay(...)`.
- Updated the OPORD authorization header to use the explicit operation commander when present, then fall back to the opening commander read model, then neutral `N/A` copy.
- Added regression coverage for opening commanders that are not actively assigned/seated at turn 0.

### Turn-0 Territory Summary Guard
- Added `shouldNarrateTerritorySummary(...)` as the shared guard for turn-summary territory narration.
- Updated the Generals Digest, Chief of Staff briefing, and Turn Aftermath read models so turn-0 `territory_net` / `notable_flips` cannot produce false "settlements taken" or "ground gained" copy.
- Added focused tests for digest, briefing, and aftermath surfaces.

## Verification
- Focused ops modal: `npm.cmd exec -- vitest run tests/ui/ops_planning_target_discovery.test.ts --pool=forks --reporter=dot` passed 18/18.
- Expanded commander/turn-0 pack: `npm.cmd exec -- vitest run tests/ui/ops_planning_target_discovery.test.ts tests/ui/opening_corps_commander_display.test.ts tests/ui/commander_read_model_surfaces.test.ts tests/generals_digest_chronicle.test.ts tests/ui/chief_of_staff_briefing_i18n.test.ts tests/ui/turn_aftermath.test.ts --pool=forks --reporter=dot` passed 79/79.
- Typecheck: `npm.cmd run typecheck` passed.
- Diff hygiene: `git diff --check` passed.

## Scope / Determinism
- UI/read-model display, focused tests, and docs only.
- No simulation logic, scenario data, save schema, calibration floor, structural fingerprint, generated artifacts, golden manifests, packaged installer artifacts, randomness, timestamps, or persisted output ordering changed.

## Next Steps
- Run the broader player journey and live browser gates before merging.
- Continue the Pyrrhic live-surface/raw-copy scout queue after this branch is integrated and main CI is green.
