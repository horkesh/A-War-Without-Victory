# Opening Brief Dismissal Persistence

**Date:** 2026-06-05

## Summary

The presidential opening brief dismissal now survives same-faction save refreshes in the renderer store. This closes the product-facing P0 recurrence where the first-session guidance reappeared after navigation or desktop save reloads.

## Scope

- `gameStore` now records the player faction associated with an opening-brief dismissal.
- Loading another save keeps the dismissal only when the dismissed faction matches the newly loaded `LoadedGameState.player_faction`.
- First load, no-faction loads, and different-faction loads still reset the opening brief.
- The existing legacy onboarding-overlay guard remains unchanged: `App.tsx` still must not mount `OnboardingOverlay` or legacy first-turn overlays.

## Non-Goals

- No `GameState` or save-schema field was added.
- No migration was added.
- No tutorial IPC or `meta.tutorial_state` persistence path changed.
- No simulation turn logic, scenario data, baseline manifest, generated artifact, randomness, timestamps, or persisted output changed.

## Verification

- `npx.cmd vitest run tests/ui/gamestore_load_reset.test.ts tests/ui/onboarding_track_d_consolidation.test.ts --reporter=dot`

