# Event Loader Fail-Closed Hardening

**Date:** 2026-05-27
**Result:** Workstream B loader slice closed

## Summary
- Required event catalog files now fail closed on missing, malformed, or non-array JSON.
- Valid catalog behavior is preserved: five fixed files, start-week filtering, deterministic `(turn_min, id)` ordering, and 247 current rows.
- Added a deterministic directory-injected loader seam for focused tests.

## Changes Made

### Loader
- `src/sim/events/event_loader.ts` now loads required files through `loadRequiredEventFile(...)`.
- `loadEventDefinitionsFromDir(scenarioStartWeek, eventsDir)` provides a deterministic test seam and uses the same fixed required-file list as production.
- `loadEventDefinitions(...)` still uses the canonical `data/scenarios/events` directory.

### Tests
- `tests/event_loader.test.ts` covers:
  - current 247-row catalog count;
  - deterministic `(trigger.turn_min ?? Number.MAX_SAFE_INTEGER, id)` order;
  - `scenarioStartWeek` filtering;
  - missing required file failure;
  - malformed JSON failure;
  - non-array JSON failure;
  - no silent partial return when one required file is bad.

## Review
- Systems Programmer worker implemented the loader slice.
- QA/Determinism reviewer found no blocking defects. Residual risk: parsed rows are still cast to `EventDefinition[]` without full row-level schema validation; that remains a future Workstream B slice.

## Verification
- `F:\A-War-Without-Victory\vitest.cmd run tests\event_loader.test.ts tests\events_evaluate.test.ts tests\event_timeline_integrity.test.ts tests\consequence_chains.test.ts --reporter=dot` - PASS; 98/98 tests.
- `npm.cmd run typecheck` - PASS.
- `git diff --check` - PASS with only the existing line-ending warning on `src/sim/events/event_loader.ts`.

## Files Changed

| File | Change |
| --- | --- |
| `src/sim/events/event_loader.ts` | Required-file fail-closed loading and deterministic directory test seam. |
| `tests/event_loader.test.ts` | Focused loader contract tests. |
| `docs/plans/COMMAND_BOARD.md` | Event row advanced to next Workstream B substrate step. |
| `docs/plans/2026-05-24-event-system-presidential-core-upgrade-plan.md` | Loader slice status and remaining substrate work updated. |
| `docs/plans/MASTER_ROADMAP.md` | Short loader addendum added. |
| `docs/PROJECT_LEDGER.md` | Closeout entry. |

## Next Steps
- Add row-level catalog schema validation.
- Decide mutex/queue behavior before changing live event firing outcomes.
