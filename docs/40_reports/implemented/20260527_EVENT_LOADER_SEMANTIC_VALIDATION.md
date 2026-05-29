# Event Loader Semantic Validation

**Date:** 2026-05-27
**Result:** Workstream B semantic catalog validation slice closed

## Summary
- Event semantic vocabulary is now centralized in `src/sim/events/event_vocabulary.ts`.
- `loadEventDefinitions(...)` now fails closed for unknown event effect kinds, unknown trigger/pressure condition types, duplicate event IDs, missing event references, invalid response defaults, invalid response ownership, and declared enum/range violations.
- The current five-file event catalog still loads as 247 rows; taxonomy output remains 247 rows, 44 choice events, 36 required-response rows, 17 modal-ready rows, 180 warnings, and 0 errors.

## Changes Made

### Loader
- Validates `effect.kind`, `effects[].kind`, response option `effect.kind`, and response option `effects[].kind` against the shared event vocabulary.
- Validates `trigger.condition` and `pressure.modifiers[].condition` recursively against the shared condition vocabulary.
- Validates `trigger.phase`, `turn_min <= turn_max`, `category`, `bot_response_logic`, `probability`, `once`, `requires_player_response`, `responding_faction`, duplicate response option ids, and `historical_default_response_id`.
- After all five required files are loaded, validates duplicate event IDs and references from `trigger.requires_events`, `enables_events`, `week_since_event.event_id`, and `event_fire_count.event_id`.

### Diagnostics
- `tools/diagnostics/event_taxonomy_report.ts` now consumes the same vocabulary sets as the runtime loader, preventing drift between diagnostic warnings and startup validation.

## Boundary
- No event JSON, historical prose, evaluator ordering, event firing, save schema, GUI ownership, bot-choice policy, scenario data, generated artifacts, or calibration tuning changed.
- Missing sources, missing historical-default markers, sensitive-history review gates, modal readiness, and `legacy_calendar_pending_conversion` policy remain diagnostic/content gates rather than loader-fatal startup blockers.

## Verification
- `node node_modules\vitest\vitest.mjs run tests\event_loader.test.ts tests\sim\events\event_taxonomy_report.test.ts tests\event_timeline_integrity.test.ts --reporter=dot` - PASS; 65/65 tests.
- `npx.cmd tsx tools\diagnostics\event_taxonomy_report.ts --json` - PASS; 247 events, 180 warnings, 0 errors.
- `npm.cmd run typecheck` - PASS.

## Files Changed

| File | Change |
| --- | --- |
| `src/sim/events/event_vocabulary.ts` | Shared event effect, condition, and faction vocabulary. |
| `src/sim/events/event_loader.ts` | Runtime fail-closed semantic catalog validation. |
| `tools/diagnostics/event_taxonomy_report.ts` | Uses shared vocabulary for taxonomy findings. |
| `tests/event_loader.test.ts` | Focused semantic validation regression coverage. |
| `docs/plans/COMMAND_BOARD.md` | Event row advanced to acceptance diagnostics. |
| `docs/plans/2026-05-24-event-system-presidential-core-upgrade-plan.md` | Workstream B status and next action updated. |
| `docs/plans/MASTER_ROADMAP.md` | Short semantic-validation addendum added. |
| `docs/PROJECT_LEDGER.md` | Closeout entry. |

## Next Steps
- Run Workstream E acceptance diagnostics before authoring more event prose or pressure-driven decision packets.
- Keep sensitive-history/default/source gaps behind the existing gated decision packet.
