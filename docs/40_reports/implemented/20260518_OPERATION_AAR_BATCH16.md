# Operation AAR Batch 16

**Date:** 2026-05-18
**Baseline:** Batch 15 Chronicle operation AAR route
**Result:** Chronicle completed-operation cards now open the exact Army HQ Operation History row.

## Summary
- Closed the Batch 15 gap where Chronicle operation AAR cards routed to Army HQ Records -> Operation History but did not select a specific completed operation.
- Added transient UI-shell focus state only; no save schema, simulation state, scenario data, combat code, or event JSON changed.
- Kept Army HQ Records as the detailed completed-operation AAR owner.

## Changes Made
### Chronicle To Records Focus
- `openArmyHQOperationHistory(...)` now accepts an optional completed-operation AAR id.
- Chronicle operation dossier actions pass `entry.metadata.operationAarId` through that helper.
- `gameStore` keeps `focusedOperationHistoryId` as transient renderer state, clears it when leaving Records/Operation History or loading a new save.

### Operation History Selection
- `OperationHistoryPanel` switches to the History tab when a focused operation id is present.
- The matching completed operation row initializes expanded, re-expands on focus changes, and carries `aria-current="true"` plus a subtle highlight.

## Lessons Learned
- Chronicle should keep routing into Records with enough source identity to land on evidence, not duplicate the completed-operation review surface.
- Transient UI focus state is enough for this route; completed-operation AAR schema already has the needed durable id.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/components/OperationHistoryPanel.tsx` | Opens History and expands/highlights the focused completed-operation row. |
| `src/ui/map/components/chronicle/ChronicleOverlay.tsx` | Passes Chronicle operation AAR id into the Records route. |
| `src/ui/map/store/gameStore.ts` | Adds transient `focusedOperationHistoryId` renderer state. |
| `src/ui/map/utils/shellNavigation.ts` | Accepts optional operation AAR id for Operation History navigation. |
| `tests/ui/operation_aar_records_review.test.ts` | Covers focused row expansion from Records. |
| `tests/ui_chronicle_operation_aar_link.test.ts` | Covers Chronicle route id preservation. |
| `docs/40_reports/GUI_MASTER.md` | Registers the Batch 16 GUI change. |
| `docs/40_reports/CONSOLIDATED_BACKLOG.md` | Marks Operation AAR UI/read-model polish implemented through Batch 16. |
| `docs/40_reports/GAME_STATE_RATING_MASTER.md` | Updates the operations-system gap now that row-specific expansion is closed. |
| `docs/plans/MASTER_ROADMAP.md` | Adds the Batch 16 Operation AAR addendum. |
| `docs/PROJECT_LEDGER.md` | Records the renderer-only UI/read-model behavior change. |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Adds the durable route-identity pattern for Chronicle -> Records AAR handoffs. |

## Verification
- `npm.cmd exec -- vitest run tests/ui_chronicle_operation_aar_link.test.ts tests/ui/operation_aar_records_review.test.ts` - passed, 2 files / 7 tests.
- `npm.cmd exec -- vitest run tests/ui_shell_navigation.test.ts tests/ui_chronicle_operation_aar_link.test.ts tests/ui/operation_aar_records_review.test.ts` - passed, 3 files / 22 tests.
- `npm.cmd run typecheck` - passed.
- `npm.cmd run desktop:map:build` - passed with existing Vite browser-external/dynamic-import/chunk-size warnings.
- `npm.cmd run sim:scenario:run:40w` parent integration - passed; produced n1893 `b14179d65639860c`, 27/27 anchors, 6/6 bot benchmarks. Operation AAR focus is renderer-only; the hash move is from the concurrent intel casualty hook.

## Next Steps
- Keep any richer operation AAR overlay polish inside the Records owner unless existing AAR fields cannot answer the player question.
