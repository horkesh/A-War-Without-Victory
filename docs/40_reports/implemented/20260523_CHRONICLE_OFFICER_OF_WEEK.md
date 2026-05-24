# Chronicle Officer Of The Week

**Date:** 2026-05-23
**Result:** Implemented

## Summary
- Added deterministic Chronicle personnel cards for completed own-faction operations with a named commander.
- The card is sourced only from existing `operationHistory` AAR fields and links back to Army HQ Records through the existing operation AAR route.
- No simulation behavior, save schema, scenario data, calibration/army-arc tuning, or operation outcome logic changed.

## Changes Made
### Chronicle Read Model
- Extended `ChronicleCardType` with `personnel`.
- Added `buildOfficerSpotlightEntries(...)` to emit `Officer of the Week: <rank> <name>` cards for player-faction operation AARs with `commander_name`.
- Preserved operation AAR linkage through `metadata.operationAarId`.

### Chronicle UI
- Added a personnel accent/badge to `ChronicleCard`.
- Added Personnel to Chronicle filters and timeline dot colors.

## Verification
- Red/green: `npx.cmd vitest run tests\chronicle_entries.test.ts --reporter=dot` failed before implementation on the missing personnel spotlight, then passed 16/16 after implementation.
- `npx.cmd vitest run tests\chronicle_entries.test.ts tests\ui_chronicle_review_tools.test.ts tests\ui\chronicle_chapters.test.ts tests\ui\chronicle_chapter_ui.test.ts tests\ui\chronicle_chapter_guardrails.test.ts tests\ui_chronicle_operation_aar_link.test.ts --reporter=dot` PASS 32/32.
- `npm.cmd run typecheck` PASS.
- `npm.cmd run desktop:map:build` PASS with existing Vite/browser-external and chunk-size warnings.
- `git diff --check` PASS.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/components/chronicle/generateChronicleEntries.ts` | Adds personnel card type and completed-operation commander spotlight generation. |
| `src/ui/map/components/chronicle/ChronicleCard.tsx` | Adds personnel card styling. |
| `src/ui/map/components/chronicle/ChronicleOverlay.tsx` | Adds personnel timeline dot color. |
| `src/ui/map/components/chronicle/ChronicleReviewFilters.ts` | Adds Personnel filter/count support. |
| `tests/chronicle_entries.test.ts` | Adds commander spotlight regression coverage. |
| `tests/ui_chronicle_review_tools.test.ts` | Pins Personnel filter/count behavior. |

## Next Steps
- The larger officer-character lane still needs authored trait surfacing in Personnel if the data contract is extended.
- The current spotlight intentionally avoids inventing traits or historical judgments; richer officer copy should stay historian-reviewed.
