# Army HQ Personnel Mobilization Visibility

**Date:** 2026-05-23
**Result:** Implemented

## Summary
- Army HQ Personnel now surfaces the selected faction's existing `mobilizationSummary` in a compact Mobilization section.
- The section shows available, committed, exhausted, strategic reserve, exhaustion percentage, and largest available militia pools.
- This is UI-only presentation from the current loaded-state adapter. No mobilization mechanics, JNA transfer behavior, save schema, scenario data, calibration, or baseline artifact changed.

## Changes Made
### Personnel Tab
- `src/ui/map/components/army_hq/PersonnelContent.tsx` now reads `state.mobilizationSummary?.[selectedArmyId]`.
- Added a scan-friendly Mobilization block between Force Overview and Order of Battle.
- Added deterministic `en-US` whole-number formatting for the new mobilization values so tests and UI punctuation do not depend on the host locale.

### Regression Coverage
- `tests/ui/officer_mini_bio.test.ts` now includes a Personnel roster regression that proves the Mobilization section displays pool health and top pool names for the selected faction.
- The test was added red-first and failed on missing `MOBILIZATION` before implementation.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/components/army_hq/PersonnelContent.tsx` | Adds the Personnel Mobilization section and deterministic number formatting for the new section. |
| `tests/ui/officer_mini_bio.test.ts` | Adds selected-faction mobilization summary fixture data and UI regression coverage. |

## Verification
- `npx.cmd vitest run tests\ui\officer_mini_bio.test.ts --reporter=dot` PASS 6/6 after the red failure.

## Next Steps
- Broader early-war/mobilization lift still needs JNA equipment-transfer visibility and recent-emergence trend explanation.
- Do not wire mobilization fields into behavior or alter pool decay without a separate gameplay/canon lane.
