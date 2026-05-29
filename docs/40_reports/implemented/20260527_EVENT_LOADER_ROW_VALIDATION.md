# Event Loader Row Validation

**Date:** 2026-05-27
**Result:** Workstream B row-level structural validation slice closed

## Summary
- Required event catalog files now fail closed on structurally invalid rows after JSON parsing and before the `EventDefinition[]` cast.
- The validation is deliberately structural: row object shape, id, trigger shell, turn bounds, `requires_events`, primary `effect.kind`, optional `effects`, and optional `response_options`.
- Semantic policy remains with taxonomy diagnostics: effect/condition vocabulary, source/default gates, sensitive-history classification, modal readiness, and trigger-authoring classification.

## Changes Made

### Loader
- `src/sim/events/event_loader.ts` validates every parsed row in required catalog files.
- Failure messages include the source filename and row index, e.g. `Invalid event row in war_1992.json[0]: ...`.
- Response options may omit `effects`, matching the current catalog contract.

### Tests
- `tests/event_loader.test.ts` now covers malformed rows, ids, triggers, turn bounds, `requires_events`, primary effects, effect arrays, response options, and the explicit allowance for response options without effects.
- Existing loader tests still prove the current catalog remains 247 rows and preserves deterministic file/count/order/filter behavior.

## Review
- Systems Programmer worker implemented the validation slice.
- Parent verification confirmed the taxonomy report still reads all 247 events and reports the same 180 warnings / 0 errors baseline.
- Residual risk: this does not enforce semantic vocabulary or historical/source policy in the loader; those remain taxonomy/report gates to avoid duplicating policy logic.

## Verification
- `F:\A-War-Without-Victory\vitest.cmd run tests\event_loader.test.ts tests\sim\events\event_taxonomy_report.test.ts --reporter=dot` - PASS; 40/40 tests.
- `F:\A-War-Without-Victory\vitest.cmd run tests\events_evaluate.test.ts tests\event_timeline_integrity.test.ts tests\consequence_chains.test.ts --reporter=dot` - PASS; 91/91 tests.
- `npx.cmd tsx tools\diagnostics\event_taxonomy_report.ts --json` - PASS; 247 events, 180 warnings, 0 errors.
- `npm.cmd run typecheck` - PASS.
- `git diff --check` - PASS with only the existing line-ending warning on `src/sim/events/event_loader.ts`.

## Files Changed

| File | Change |
| --- | --- |
| `src/sim/events/event_loader.ts` | Row-level structural validation before casting parsed JSON to event definitions. |
| `tests/event_loader.test.ts` | Focused malformed-row and optional response-option-effects coverage. |
| `docs/plans/COMMAND_BOARD.md` | Event row advanced from row-validation to semantic validation / mutex decision packet. |
| `docs/plans/2026-05-24-event-system-presidential-core-upgrade-plan.md` | Workstream B status and remaining validation boundary updated. |
| `docs/plans/MASTER_ROADMAP.md` | Short row-validation addendum added. |
| `docs/PROJECT_LEDGER.md` | Closeout entry. |

## Next Steps
- Decide whether semantic catalog validation should remain diagnostics-only or move selected checks into the loader.
- Produce a mutex/queue decision packet before adding persisted overflow/backlog behavior.
