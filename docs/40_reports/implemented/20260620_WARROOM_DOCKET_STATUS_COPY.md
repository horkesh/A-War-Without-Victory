# Warroom Docket Status Copy

**Date:** 2026-06-20
**Result:** Implemented

## Summary
- Warroom priority docket badges now render localized player-facing status copy instead of internal `blocked` / `review` / `clear` / `unavailable` status ids.
- The read model keeps the machine `status` for logic and exposes a separate `statusLabel` for UI rendering.
- BCS docket chrome now covers the status label alongside the existing summary and open-Desk labels.

## Changes Made
### Warroom Priority Docket
- Added `statusLabel` to `WarroomPriorityDocketView`.
- Mapped pre-advance review statuses to localized EN/BCS i18n keys.
- Updated `WarroomStatusBar` to render `docket.statusLabel` in the visible badge.

### Tests
- Extended `tests/ui/warroom_priority_docket.test.ts` to assert player-facing status labels and to reject the internal status id as visible badge copy.

## Verification
- Red proof: `npm.cmd exec -- vitest run tests/ui/warroom_priority_docket.test.ts --pool=forks --reporter=dot` failed on missing `statusLabel`.
- Focused green: same command passed 4/4 after implementation.
- Expanded UI pack: `npm.cmd exec -- vitest run tests/ui/warroom_priority_docket.test.ts tests/ui/presidential_decision_room.test.ts tests/ui/presidential_decision_room_panel_i18n.test.ts --pool=forks --reporter=dot` passed 43/43.
- I18n sanity: `npm.cmd exec -- vitest run tests/ui_i18n.test.ts tests/ui/warroom_priority_docket.test.ts --pool=forks --reporter=dot` passed 16/16.
- Typecheck: `npm.cmd run typecheck` passed.
- Player journeys: `npm.cmd run qa:player-journeys` passed 27 files / 231 tests.
- Live browser: `npm.cmd run qa:live-surface:browser` passed with strict port cleanup; temporary evidence folder was removed after verification.

## Scope / Determinism
- UI/read-model copy, i18n, tests, and docs only.
- No simulation logic, scenario data, save schema, calibration floor, structural fingerprint, generated artifacts, golden manifests, packaged installer artifacts, randomness, timestamps, or persisted output ordering changed.

## Next Steps
- Continue the fresh Pyrrhic scout queue with the ops modal commander-display mismatch and turn-0 territory-summary guards.
