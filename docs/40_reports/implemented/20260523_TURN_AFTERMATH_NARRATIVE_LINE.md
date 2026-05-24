# Turn Aftermath Narrative Line

**Date:** 2026-05-23
**Result:** Implemented

## Summary
- Turn Aftermath now carries one deterministic authored line per tone (`gain`, `loss`, `mixed`, `quiet`).
- The line renders in the immediate Turn Aftermath modal and in Army HQ Records aftermath cards.
- This is UI/read-model presentation only. No turn summary schema, sim behavior, scenario data, save schema, calibration, or baseline artifact changed.

## Changes Made
### Read Model
- `src/ui/map/data/turnAftermath.ts` adds `narrativeLine` to `TurnAftermathView`.
- `buildTurnAftermathView(...)` derives the line from the already-classified aftermath tone.

### UI Surfaces
- `src/ui/map/components/TurnAftermathModal.tsx` renders the narrative line below the factual headline.
- `src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx` renders the same line in archived aftermath cards.

### Regression Coverage
- `tests/ui/turn_aftermath.test.ts` pins the gain, loss, and quiet authored lines red-first.
- `tests/ui/records_button_behavior.test.ts` verifies the mixed line is visible in the modal while preserving Records / Chronicle routing.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/data/turnAftermath.ts` | Adds deterministic tone-to-prose line. |
| `src/ui/map/components/TurnAftermathModal.tsx` | Shows the line in the immediate aftermath modal. |
| `src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx` | Shows the line in archived records. |
| `tests/ui/turn_aftermath.test.ts` | Pins read-model prose output. |
| `tests/ui/records_button_behavior.test.ts` | Pins visible modal rendering. |

## Verification
- `npx.cmd vitest run tests\ui\turn_aftermath.test.ts tests\ui\records_button_behavior.test.ts --reporter=dot` PASS 13/13 after the red failure.

## Next Steps
- Further narrative lift should move to Chronicle chapter recap / endgame prose depth rather than adding more one-off aftermath copy.
