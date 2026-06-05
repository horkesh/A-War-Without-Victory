# Operation Observability Validate-When-Present Contract

Date: 2026-06-05
Branch: `codex/operation-observability-validate`
Type: Optional `GameState` schema contract

## Summary

`military.op_injection_warnings` and `military.watched_operations` remain optional operation-observability surfaces. They are written lazily by preplanned/triggered-operation validation and scenario observability paths, and absence remains valid before those paths emit evidence.

The save validator now rejects malformed present rows while preserving existing operation launch, validation, scenario-runner, and watched-operation writer behavior. No migration, save-schema version bump, TypeScript optionality change, scenario data, baseline artifact, replay writer, operation-launch behavior, or player-facing UI behavior changed.

## Contract

- `op_injection_warnings`: array of objects with non-empty `op_name`, optional string `axis_id`, `check` in the closed operation-injection check vocabulary, non-empty `detail`, `severity` in `error | warning`, and non-negative integer `turn`.
- `watched_operations`: array of trace rows with string identifiers, closed status enums for catalog/eligibility/launch/delivery, string blocker fields, non-negative integer `turn`, and optional launch evidence fields (`launch_*`) constrained to strings, string arrays, non-negative integers, or finite non-negative numbers.
- `launch_defender_power_by_id`: when present, each row validates `formation_id`, `power`, `stacked_power`, and optional power-breakdown numbers.

The validator deliberately does not resolve OSID existence, formation existence, defender-power semantics, operation catalog membership, or launch feasibility correctness.

## Verification

- Focused validator: `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` passed 163/163.
- `npm.cmd run typecheck -- --pretty false` passed.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` stayed count-neutral at total `507` (`state: 172`, `sim: 327`, `derived: 8`, `unknown: 0`).

## Notes

This closes the next schema slice named by the command-board engine-health sync after `military.friction_events`. Derived sector/transient combat caches should remain docs-only retention unless a separate materialization decision exists.
