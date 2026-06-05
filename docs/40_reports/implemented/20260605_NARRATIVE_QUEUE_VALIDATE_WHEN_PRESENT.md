# Narrative Queue Validate-When-Present Contract

**Date:** 2026-06-05

**Status:** Implemented

## Summary

`state.military.narrative_queue` is now classified as an optional validate-when-present AAR work queue. Absence remains valid because the queue materializes only when combat resolution enqueues pending AAR narrative generation. Present rows now validate entry shape, canonical faction fields, corps identifiers, and the nested `AARPromptInput` payload used by the narrative generator.

This is intentionally shape-only validation. It does not resolve OSIDs, formations, officer identities, combat outcome semantics, or generated prose correctness.

## Scope

- Added validator coverage for `military.narrative_queue` only when the field is present.
- Added rejection coverage for malformed queue rows and non-array queue payloads.
- Preserved absent-queue compatibility for current-version saves.

## Non-Scope

- No save-schema version bump.
- No migration or fixture refresh.
- No TypeScript optionality change.
- No combat resolution, AAR generation, AI prompt, scenario data, baseline artifact, replay writer, or player-facing UI behavior change.
- No catalog/OSID/officer resolution.

## Verification

- `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` passed 166/166.
- `npm.cmd run typecheck -- --pretty false` passed.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` stayed count-neutral at total 507 (`state: 172`, `sim: 327`, `derived: 8`, `unknown: 0`).
- `git diff --check` passed.

## GitHub Sweep

- Deployments API returned `[]`.
- Recent PR list showed no open PRs.
- #186 post-merge main checks are green.
- #187 post-merge main checks were still in progress during this slice, with no failure observed at the time of the local closeout proof.

## Files

- `src/state/validateGameState.ts`
- `tests/save_migration_validator_rejection.test.ts`
