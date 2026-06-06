# Optional Local State Validate-When-Present Contract

Date: 2026-06-06
Branch: `codex/optional-schema-batch-20260606`
Type: Optional `GameState` schema contract

## Summary

`military.casualty_ledger` and `military.enclave_state` remain optional local state/read-model records. Absence remains valid for saves that have not materialized the corresponding battle-casualty or enclave status surfaces.

The save validator now rejects malformed present payloads for those records while preserving existing writers and readers. No migration, save-schema version bump, fixture refresh, scenario data, simulation behavior, baseline artifact, replay writer, UI behavior, generated artifact, randomness, timestamps, or persisted output ordering changed.

## Contract

`military.casualty_ledger` validates as a canonical faction-keyed casualty ledger with finite non-negative killed, wounded, missing/captured, equipment-loss, and per-formation casualty values. The validator deliberately does not require every faction to be present, resolve formation ids, or materialize an absent ledger.

`military.enclave_state` validates as an enclave-keyed record. Known optional leaves validate as `fallen?: boolean` and `status?: string`; additional extension fields remain allowed because the existing type permits enclave-specific payloads.

## Verification

- Focused validator: `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\validate_game_state_shape.test.ts --reporter=dot` passed 15/15.
- Typecheck: `npm.cmd run typecheck -- --pretty false` passed.
- Strict-null inventory: `node tools\diagnostics\strict_null_inventory.cjs --field-domains` stayed total `507` (`state: 172`, `sim: 327`, `derived: 8`).
- `git diff --check` passed.

## Notes

This batch keeps `military.war_militia_strength`, sector/front snapshots, `corps_command`, `war_timeline`, and TG/Army-HQ operation scaffolds out of scope. Those records carry broader compatibility, runtime, or materialization semantics and need separate classification before validation tightens.
