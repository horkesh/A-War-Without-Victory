# Operation AAR Chronicle Batch 15

**Date:** 2026-05-18
**Baseline:** `954ec1a9` on `codex/execute-2026-05-17-plans`; active 40w proof n1890 hash `248202ee4fd13027`
**Result:** Chronicle now files compact completed-operation AAR cards from existing `operationHistory` data and routes them back to Army HQ Operation History.
**Integrated proof:** Parent Batch 15 proof passed typecheck, desktop map build, focused UI tests, and 40w n1891 `0d8d9ccdc477d77a`.

## Summary
- Extended the Chronicle read model so completed player-faction operations appear as military Chronicle entries at their `ended_turn`.
- Kept the entry compact: outcome, objectives captured/targeted, attacks, casualties suffered/inflicted, and star grade only.
- Added a Chronicle dossier action that opens Army HQ Records -> Operation History, reusing the Batch 14 deep-review owner.

## Changes Made
### Chronicle Operation AAR Cards
- `src/ui/map/components/chronicle/generateChronicleEntries.ts` now projects `operationHistory` into player-scoped Chronicle entries.
- Enemy-faction completed operations are filtered out before titles or metrics are rendered.
- The projection uses existing AAR fields only; no save fields, scenario data, engine output, or hidden enemy truth were added.

### Chronicle Route Polish
- `src/ui/map/utils/shellNavigation.ts` adds `openArmyHQOperationHistory(...)`, matching the existing turn-record helper shape.
- `src/ui/map/components/chronicle/ChronicleOverlay.tsx` labels operation AAR dossier actions as `Open Operation Record` and routes them to Army HQ Records -> Operation History.

### Focused Tests
- `tests/ui_chronicle_operation_aar_link.test.ts` covers player-scoped AAR card generation, enemy-operation suppression, route helper behavior, no-player-faction guard, and the rendered Chronicle dossier button.

## Verification
- `npm.cmd exec -- vitest run tests/ui_chronicle_operation_aar_link.test.ts` - passed, 4 tests.
- `npm.cmd exec -- vitest run tests/ui_chronicle_turn_record_link.test.ts tests/ui_chronicle_operation_aar_link.test.ts tests/ui/operation_aar_records_review.test.ts tests/ui/chronicle_chapters.test.ts tests/ui/chronicle_chapter_ui.test.ts` - passed, 5 files / 14 tests.
- `npm.cmd run desktop:map:build` - passed with existing Vite/browser-external/chunk-size warnings.
- Parent `npm.cmd run typecheck` - passed after the concurrent sector-lane nullable-corps guard fix.
- Parent `npm.cmd run sim:scenario:run:40w` - passed n1891 `0d8d9ccdc477d77a`, 27/27 anchors, 6/6 bot benchmarks; consistency validation passed.
- `git diff --check` - passed with CRLF conversion warnings only, including unrelated dirty files from parallel lanes.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/components/chronicle/generateChronicleEntries.ts` | Added player-scoped operation AAR Chronicle entries. |
| `src/ui/map/components/chronicle/ChronicleOverlay.tsx` | Added operation-record action routing from the Chronicle dossier. |
| `src/ui/map/utils/shellNavigation.ts` | Added Operation History route helper. |
| `tests/ui_chronicle_operation_aar_link.test.ts` | Added focused Chronicle/read-model/route coverage. |
| `docs/40_reports/GUI_MASTER.md` | Registered the Batch 15 GUI change. |
| `docs/PROJECT_LEDGER.md` | Added behavior/output ledger entry. |

## Residual Risk
- The route opens the Operation History owner but does not auto-expand a specific completed-operation row; that avoids touching `OperationHistoryPanel.tsx` during parallel work.
- Chronicle chapter cards still use the existing turn-record action for chapter refs; the richer operation-specific action is exposed in the dossier for the selected operation entry.
