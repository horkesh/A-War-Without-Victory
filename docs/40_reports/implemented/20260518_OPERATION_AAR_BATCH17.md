# Operation AAR Batch 17

**Date:** 2026-05-18
**Baseline:** Batch 16 Chronicle row focus
**Result:** Army HQ Records operation AAR rows now explain per-axis objective outcomes from existing AAR fields.

## Summary
- Audited the post-Batch 16 Operation AAR UI/read-model path for remaining presentation gaps that can be closed without new schema or simulation fields.
- Found one concrete player-answer gap: multi-axis completed operations showed only per-axis objective counts, so the player could not tell which axis captured, missed, or left objectives held by another axis.
- Added read-only per-axis objective chips inside Army HQ Records -> Operation History -> History expanded rows.

## Changes Made
### Records-Owned Axis Review
- `OperationHistoryPanel` now renders target labels under each `axis_summaries` row.
- Axis objectives are classified from existing fields only:
  - `axis_summaries.objectives_captured` -> `Axis captured`
  - operation-level `objectives_captured` but not axis-captured -> `Axis held elsewhere`
  - otherwise -> `Axis not held`
- No save schema, simulation state, scenario data, combat code, Chronicle data, or route state changed.

### Focused Test
- `tests/ui/operation_aar_records_review.test.ts` now locks the per-axis objective status presentation against a completed-operation AAR fixture.
- The test was added first and failed on the missing labels before the UI change.

## Closure Assessment
- Batch 14-17 now exhaust the current completed-operation AAR fields for compact Records-owned review:
  - operation result, attacks, casualties, grade, provenance, and overall objective status;
  - weekly timeline and notable events;
  - per-axis attacks, casualties, and objective status;
  - Chronicle time placement and exact-row return route.
- A larger Paradox-tier operation overlay would need either a new presentation mandate or richer authored/simulation fields. The remaining work is not blocked by Records readability anymore.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/components/OperationHistoryPanel.tsx` | Adds per-axis objective status chips from existing AAR fields. |
| `tests/ui/operation_aar_records_review.test.ts` | Adds focused regression coverage for per-axis objective labels. |
| `docs/40_reports/GUI_MASTER.md` | Registers Batch 17 in the GUI master. |
| `docs/40_reports/GAME_STATE_RATING_MASTER.md` | Updates the operations-system gap assessment after Batch 17. |
| `docs/40_reports/implemented/20260518_OPERATION_AAR_BATCH17.md` | Implementation report. |

## Verification
- RED: `npm.cmd exec -- vitest run tests/ui/operation_aar_records_review.test.ts` failed on the missing `Axis captured: Prijedor` label before implementation.
- GREEN: `npm.cmd exec -- vitest run tests/ui/operation_aar_records_review.test.ts` passed, 1 file / 4 tests.
- `npm.cmd exec -- vitest run tests/ui/operation_aar_records_review.test.ts tests/ui_chronicle_operation_aar_link.test.ts tests/ui_shell_navigation.test.ts` passed, 3 files / 23 tests.
- `npm.cmd run typecheck` passed.
- `npm.cmd run desktop:map:build` passed with existing Vite browser-external/dynamic-import/chunk-size warnings.
