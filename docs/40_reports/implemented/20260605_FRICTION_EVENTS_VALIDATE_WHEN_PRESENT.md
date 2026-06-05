# Command Friction Events Validate-When-Present Contract

Date: 2026-06-05
Branch: `codex/friction-events-validate`
Type: Optional `GameState` schema contract

## Summary

`military.friction_events` remains an optional command-friction event bus. It is written lazily by warlord-friction / command-strain paths when low-reliability commanders ignore orders, launch unauthorized operations, or refuse releases. Absence remains valid for saves where no friction has fired.

The save validator now rejects malformed present friction-event payloads while preserving the existing runtime writers and UI consumers. No migration, save-schema version bump, TypeScript optionality change, scenario data, baseline artifact, command-friction behavior, AI behavior, replay writer, or player-facing UI behavior changed.

## Contract

`military.friction_events` validates as an array of objects with:

- `officer_id`: non-empty string.
- `turn`: non-negative integer.
- `type`: one of `ignored_stance`, `unauthorized_op`, or `refused_release`.
- `resolved`: boolean.

The validator deliberately does not resolve officer IDs, corps ownership, command-authority state, or UI acknowledgement semantics. This is shape validation only.

## Verification

- Focused validator: `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` passed 160/160.
- `npm.cmd run typecheck -- --pretty false` passed.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` stayed count-neutral at total `507` (`state: 172`, `sim: 327`, `derived: 8`, `unknown: 0`).

## Notes

This slice follows the command-board schema lane recommendation to classify another optional family before implementation. The next safest candidate remains triggered/preplanned operation observability (`military.op_injection_warnings`, `military.watched_operations`) as validate-when-present; derived sector/transient combat caches should stay docs-only retention unless a separate materialization decision is made.
