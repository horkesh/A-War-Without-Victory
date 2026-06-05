# Supply Siege State Validate-When-Present

**Date:** 2026-06-05

## Summary
- Closed a batched optional `GameState` validator slice for `military.siege_turn_counters` and `military.sarajevo_tunnel_operational`.
- Kept both fields optional: absence remains valid, and no save schema version, migration, fixture, scenario output, baseline, or supply mechanic changed.
- Added focused rejection coverage for malformed present payloads while preserving well-formed present values.

## Changes Made

### Validator
- `military.siege_turn_counters` now validates as an object when present, with non-negative integer values keyed by existing runtime string keys such as `<faction>:<osid>`.
- `military.sarajevo_tunnel_operational` now validates as a boolean when present.
- The validator does not materialize either field, enforce reserve-pool bounds, resolve OSIDs, or change supply-reserve behavior.

### Tests
- Added current-version acceptance coverage for absent and well-formed supply siege state.
- Added rejection coverage for negative, fractional, and non-numeric siege counters; non-object counter payloads; and non-boolean tunnel flags.

## Determinism
- Validation-only change.
- No timestamps, randomness, new iteration-dependent serialization, scenario output, replay output, baseline artifact, or generated artifact changed.
- Existing supply code already sorts siege-counter keys before runtime consumption; this slice only rejects malformed save shapes.

## Files Changed

| File | Change |
|------|--------|
| `src/state/validateGameState.ts` | Added validate-when-present hooks for supply siege state. |
| `tests/save_migration_validator_rejection.test.ts` | Added absent/well-formed acceptance and malformed-present rejection tests. |
| `docs/40_reports/implemented/20260605_SUPPLY_SIEGE_STATE_VALIDATE_WHEN_PRESENT.md` | Implementation report. |
| `docs/40_reports/README.md` | Added index entry. |
| `docs/40_reports/CONSOLIDATED_IMPLEMENTED.md` | Added consolidated entry. |
| `docs/plans/COMMAND_BOARD.md` | Updated optional schema lane status and next action. |
| `docs/plans/MASTER_ROADMAP.md` | Added roadmap addendum. |
| `docs/plans/2026-05-24-engine-quality-residuals-execution-plan.md` | Updated Phase 2 status. |
| `docs/PROJECT_LEDGER.md` | Added ledger entry. |
| `docs/PROJECT_LEDGER_KNOWLEDGE.md` | Recorded reserve-boundary lesson for future schema cleanup. |
| `.claude/napkin.md` | Added runbook note for the supply siege optional-state boundary. |

## Verification
- Red proof: `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` failed before production changes because malformed present supply siege state was accepted.
- Green focused proof: `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` passed 172/172.
- Final closeout proof is recorded in the project ledger for this batch.

## Next Steps
- Continue optional-schema cleanup by classifying the next related low-risk family before implementation.
- Do not add reserve-map upper-bound enforcement until oversized reserve fixtures are audited and an explicit migration/schema decision exists.
