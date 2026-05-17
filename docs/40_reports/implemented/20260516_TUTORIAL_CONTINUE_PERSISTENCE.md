# Tutorial Continue Persistence

**Date:** 2026-05-16
**Run ID:** N/A
**Baseline:** Track D5 from `docs/plans/2026-05-16-gui-playtest-defects-plan.md`
**Result:** Continue loads of progressed saves no longer replay first-run onboarding, and the residual first-turn orientation card no longer uses a global browser flag.

## Summary
- Added a focused regression for tutorial visibility across fresh and progressed saves.
- Updated the tactical map UI read model to default absent tutorial state to dismissed only when `meta.turn > 0`.
- Preserved explicit saved tutorial state, including active/restarted tutorial progress, over turn-based defaults.
- Removed the first-turn orientation card's `localStorage` dependency; dismissal now lives in the App shell's current renderer session while progressed saves remain suppressed by the turn gate.

## Changes Made

### Tutorial Save Migration
- `src/ui/map/data/GameStateAdapter.ts` now normalizes `meta.tutorial_state` as it builds `LoadedGameState`.
- Missing tutorial state on turn 0 remains absent so new campaigns still show onboarding.
- Missing tutorial state on progressed saves becomes `{ dismissed: true, completed_steps: [] }`, preventing Continue at turn 40 from replaying the tutorial.

### Tests
- `tests/ui/tutorial_persistence.test.ts` covers progressed older saves, fresh turn-0 saves, and explicit saved tutorial state.
- `tests/ui/first_turn_orientation_persistence.test.ts` covers that first-turn orientation dismissal does not write `localStorage`.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/data/GameStateAdapter.ts` | Added tutorial-state normalization for absent progressed saves. |
| `src/ui/map/data/types.ts` | Documented the turn-based UI migration behavior. |
| `src/ui/map/App.tsx` | Switched first-turn orientation dismissal to current-session state instead of reading browser storage. |
| `src/ui/map/components/FirstTurnOrientationCard.tsx` | Removed browser-storage writes from orientation dismissal and item navigation. |
| `src/ui/map/data/firstTurnOrientation.ts` | Updated the read-model comments to reflect session-owned dismissal. |
| `tests/ui/first_turn_orientation_persistence.test.ts` | Added focused regression coverage for orientation dismissal persistence. |
| `tests/ui/tutorial_persistence.test.ts` | Added focused regression coverage for Track D5. |

## Verification
- `npx.cmd vitest run tests\ui\tutorial_persistence.test.ts` passed 3/3.
- `npx.cmd vitest run tests\ui\tutorial_persistence.test.ts tests\tutorial_content_v1.test.ts tests\tutorial_onboarding_skeleton.test.ts tests\v092_tutorial_lane_b_auto_dismiss.test.ts tests\v092_tutorial_lane_e_overlay_a11y.test.ts` passed 25/25.
- `npx.cmd vitest run tests\ui_map_game_state_adapter.test.ts tests\ui_adapter_boundary.test.ts tests\ui\tutorial_persistence.test.ts` passed 36/36.
- `npx.cmd vitest run tests\ui\first_turn_orientation_persistence.test.ts tests\ui\first_turn_orientation.test.ts tests\ui\tutorial_persistence.test.ts` passed 17/17.
- `npm.cmd run typecheck` passed.

## Next Steps
- Live-smoke Continue from the real turn-40 save in Electron or the dev map once the shared playtest environment is available.
