# Save Migration Hardening

Date: 2026-05-17

## Scope

Implemented the save migration hardening portion of `docs/plans/2026-05-17-save-migration-hardening-plan.md` within the assigned worker write scope. Roadmap, ledger, and knowledge-ledger updates remain with the parent/integration owner.

## Runtime Changes

- `CURRENT_SCHEMA_VERSION` bumped from 2 to 12.
- `src/state/save_migration.ts` now registers versioned migrations for v3-v12:
  - v3: Phase 0 meta and faction declaration/default negotiation fields.
  - v4: political defaults (`negotiation_status`, `ceasefire`, `negotiation_ledger`, `supply_rights`, `municipalities`).
  - v5: military skeleton defaults and front segment counters.
  - v6: peace-phase war substrate defaults.
  - v7: war-phase supply/exhaustion/displacement substrate defaults.
  - v8: humanitarian aggregate defaults.
  - v9: formation lifecycle and militia-pool fatigue defaults.
  - v10: A2/C1 command substrate skeleton defaults.
  - v11: `meta.player_faction` schema advertisement only; no default is written.
  - v12: optional top-level save family defaults when that optional family is already present.
- `src/state/serialize.ts` now delegates legacy defaulting to `applyMigrations`, retains top-level residue rescue/sweep and current-save canonicalization, and validates deserialized saves after migration.
- `src/state/validateGameState.ts` now supports opt-in strict version gating through `validateGameStateShape(state, { requireVersion })`.
- `tools/diagnostics/save_migration_drift_audit.cjs` writes `tools/diagnostics/output/save_migration_drift.json`; current post-migration anonymous default count is `0`.
- `tests/fixtures/save_migration/` now contains v1-v11 fixtures; v12 is covered by `data/derived/startup/apr_1992_initial_save.json`.
- `docs/20_engineering/SAVE_SCHEMA_EVOLUTION.md` and `PIPELINE_ENTRYPOINTS.md` document the future schema bump procedure.

## Determinism And Sensitivity

All migrations use sorted record traversal where traversal can affect emitted state order. No migration uses time, randomness, I/O, logging, or environment state.

Sensitivity classification:

- v3-v10, v12: Sensitive: no. Defaults are structural skeletons, empty collections, null turn markers, or legacy canonicalization matching previous load behavior.
- v11: Sensitive: yes. `meta.player_faction` is schema-advertised but intentionally left unset by migration; scenario/desktop startup remains the owner of the actual player-faction default.

40-week integrated confirmation: n1848 completed with hash `c09a498b7dc9ccae`, 27/27 anchors, 6/6 benchmarks, `diagnose_run.cjs` 0 errors / 28 warnings, and consistency PASS. The migration defaults are structurally inert except the v11 `meta.player_faction` schema advertisement, which writes no default and preserves scenario/desktop startup ownership. The final-save hash changes under the schema-v12 save/output contract; control-alignment counts match the preceding n1846 timing run.

## Verification

Passing during this worker pass:

- `npx.cmd vitest run tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts`
- `npx.cmd vitest run tests\save_migration.test.ts tests\migration_nested_ownership.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts`
- `npx.cmd vitest run tests\save_migration_drift_audit.test.ts tests\save_migration_round_trip_contract.test.ts`
- `node tools\diagnostics\save_migration_drift_audit.cjs`
- `npm.cmd run desktop:startup-snapshot:build`
- `npx.cmd vitest run tests\save_migration.test.ts tests\save_migration_drift_audit.test.ts tests\save_migration_versioned_steps.test.ts tests\save_migration_validator_rejection.test.ts tests\save_migration_round_trip_contract.test.ts tests\migration_nested_ownership.test.ts tests\startup_snapshot_contract.test.ts`
- `npm.cmd run typecheck`

Parent verification:

- `npm.cmd run sim:scenario:run:40w` -> n1848 `c09a498b7dc9ccae`, 27/27 anchors, 6/6 benchmarks.
- `node tools\diagnose_run.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1848` -> 0 errors / 28 warnings.
- `node tools\validate_run_consistency.cjs runs\apr1992_definitive_40w__3649b3861a87e6ea__w40_n1848` -> PASS.

## Follow-Up For Parent Integration

- Update `docs/PROJECT_LEDGER.md`, `docs/PROJECT_LEDGER_KNOWLEDGE.md`, and `docs/plans/MASTER_ROADMAP.md`.
- Resolve unrelated lane failures if they still affect repo-wide typecheck.
- Run and record the 40w calibration hash comparison.
