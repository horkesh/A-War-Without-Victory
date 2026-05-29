# Cost Ledger Annotation Schema Contract

**Date:** 2026-05-27
**Status:** Implemented
**Owner lane:** Optional `GameState` schema contract / endgame consequence save contract

## Summary

`military.cost_ledger_annotations` is now a persisted save/load contract at schema v26. Legacy v25-and-older saves materialize the annotation queue as `[]`, and current-version saves reject a missing or malformed annotation queue.

The TypeScript field remains optional in `GameState` so legacy/in-memory writers and readers can continue using `state.military.cost_ledger_annotations ?? []`. This slice does not change event firing, event JSON/prose, cost-ledger templates, paramilitary sweep behavior, negotiation capital math, GUI routing, scenario data, consequence scoring, or calibration tuning.

## Implementation

- Bumped `CURRENT_SCHEMA_VERSION` from 25 to 26.
- Added migration v26 in `src/state/save_migration.ts` using `ensureArray(asRecord(state.military), 'cost_ledger_annotations')`.
- Added v26 required-field validation in `src/state/validateGameState.ts`.
- Added current-version shape validation for annotation rows: non-empty `event_id`, non-empty `tag`, non-negative integer `turn`, optional string `text`, and optional canonical `faction`.
- Added `tests/fixtures/save_migration/v25_cost_ledger_annotations.json`.
- Updated strict current-version test states and nested migration fixtures to carry the new empty queue.
- Refreshed `tools/diagnostics/output/save_migration_drift.json` to reflect schema v26, 26 registered migrations, and 61 strict required fields.
- Rebuilt `data/derived/startup/apr_1992_initial_save.json` so the committed startup save matches the v26 persisted contract.

## Verification

- Red proof before production change: focused migration/validator tests failed on missing v26 version, migration default, and current-save required-field/shape validation.
- Green proof after production change: focused migration/validator/event-shape tests passed, 117/117 tests.
- Expanded pre-artifact proof passed all behavior/schema tests except the expected stale drift artifact byte mismatch, then the drift artifact and startup snapshot were regenerated.
- Independent classifier recommended this field family because writers/readers already treat missing as an empty queue and no behavior-moving default is required.

## Determinism Notes

The migration is pure and inserts only an empty array when absent. Existing annotation order and contents are preserved. Current readers either sort before use or already treat missing as empty; no cost-ledger, negotiation, event, scenario, or calibration behavior was changed.
