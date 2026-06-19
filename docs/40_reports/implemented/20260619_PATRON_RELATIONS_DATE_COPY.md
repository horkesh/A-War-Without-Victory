# Patron Relations Date Copy

**Date:** 2026-06-19
**Result:** UI/read-model copy polish; no simulation, scenario, save schema, calibration, or packaging changes.

## Summary
- Patron Relations defiance summaries and material consequence receipt rows now render calendar dates instead of raw `turn`, `T`, or BCS `P` timing copy.
- The adjacent Diplomacy negotiation timeline now renders calendar dates instead of compact `T{turn}` labels.
- A Pyrrhic explorer sweep identified the next raw-copy queue for follow-up lanes, including President's Desk, Turn Aftermath, Decision History, operation briefing, replay, verdict, and shared enum fallback surfaces.

## Changes Made

### Patron Relations
- `src/ui/map/components/DiplomacyPanel.tsx` imports `turnToDateString(...)` and passes calendar labels into Patron Relations defiance summary and receipt i18n templates.
- The negotiation timeline marker in the same panel uses `turnToDateString(...)` and a wider fixed column so full dates fit where `T40` previously appeared.
- `src/ui/map/i18n/messages.en.ts` and `src/ui/map/i18n/messages.bcs.ts` now use `{date}` for the defiance summary and receipt label. BCS remains concise and date-only.

### Tests
- `tests/ui/diplomacy_panel.test.ts` asserts EN defiance copy uses a calendar date, BCS receipt copy uses a calendar date, raw `T31`/`T44`/`P31`/`turn 44`/`potez 31` tokens are absent, and negotiation timeline timing no longer shows `T40`.

## Verification
- `node .\node_modules\vitest\vitest.mjs run tests\ui\diplomacy_panel.test.ts tests\ui\diplomacy_player_truth.test.ts tests\diplomacy_panel_patron_relations.test.ts --reporter=dot` - passed, 3 files / 11 tests.
- `npm.cmd run typecheck -- --pretty false` - passed.

## Files Changed
| File | Change |
| --- | --- |
| `src/ui/map/components/DiplomacyPanel.tsx` | Calendar date rendering for Patron Relations defiance rows and negotiation timeline. |
| `src/ui/map/i18n/messages.en.ts` | Replaced raw turn placeholders with `{date}`. |
| `src/ui/map/i18n/messages.bcs.ts` | Replaced raw turn placeholders with `{date}`. |
| `tests/ui/diplomacy_panel.test.ts` | Added EN/BCS/timeline raw-token guards. |
| `docs/PROJECT_LEDGER.md` | Recorded the implementation and verification. |

## Next Steps
- Address the next raw-copy wave from the Pyrrhic explorer sweep: President Desk strategic situation header, Army HQ presidential attention, Turn Aftermath receipts, Decision History rows, operation briefing readiness timeline, Operations panel phase labels, Replay/Verdict timing, Territory chart ticks, and shared enum fallback labels.
- Keep Srebrenica/Zepa fall ownership event-owned; this lane did not touch operations or sensitive-history mechanics.
