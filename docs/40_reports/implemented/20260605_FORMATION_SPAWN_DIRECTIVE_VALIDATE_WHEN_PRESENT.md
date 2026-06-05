# Formation Spawn Directive Validate-When-Present Contract

**Date:** 2026-06-05

**Status:** Implemented

## Summary

`state.military.formation_spawn_directive` is now classified as an optional validate-when-present formation-spawn control surface. Absence remains valid because formation spawn remains explicitly directive-gated; an empty present object also remains valid, matching the existing runtime contract where a present directive without `kind` or `turn` is active when present.

Present directives now validate only the local directive shape: optional `kind` must be `militia`, `brigade`, or `both`; optional `turn` must be a non-negative integer; optional `allow_displaced_origin` must be boolean.

## Scope

- Added validator coverage for `military.formation_spawn_directive` only when the field is present.
- Added current-version save rejection coverage for malformed directive fields and non-object payloads.
- Preserved absent directive compatibility and valid empty-object directives.

## Non-Scope

- No save-schema version bump.
- No migration or fixture refresh.
- No TypeScript optionality change.
- No formation spawning behavior, militia pools, OOB data, scenario data, baseline artifact, replay writer, or player-facing UI behavior change.
- No validation of spawn eligibility, turn activity beyond scalar shape, displaced-origin semantics, formation IDs, or sector/front ownership.

## Verification

- `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` passed 169/169.
- `node node_modules\vitest\vitest.mjs run tests\formation_spawn_directive_narrowing.test.ts tests\militia_rework.test.ts --reporter=dot` passed 7/7.
- `npm.cmd run typecheck -- --pretty false` passed.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` stayed count-neutral at total 507 (`state: 172`, `sim: 327`, `derived: 8`, `unknown: 0`).
- `git diff --check` passed.

## Files

- `src/state/validateGameState.ts`
- `tests/save_migration_validator_rejection.test.ts`
