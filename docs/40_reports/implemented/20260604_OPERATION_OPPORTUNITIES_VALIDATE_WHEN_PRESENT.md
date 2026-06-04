# Operation Opportunities Validate-When-Present

**Date:** 2026-06-04
**Branch:** `codex/opportunity-contract`
**Lane:** Optional `GameState` schema contract

## Summary

`state.military.operation_opportunities`, `state.military.operation_opportunity_resolutions`, `state.military.operation_opportunity_diagnostics`, and `state.military.operation_opportunity_traces` are now covered as optional validate-when-present operation-opportunity lifecycle records.

These fields remain optional. There is no save-schema version bump, migration, fixture materialization, TypeScript optionality promotion, simulation behavior change, scenario data change, UI routing change, calibration movement, or player-facing command change.

## Classification

The operation-opportunity family is a lazy lifecycle bus:

- Opportunity state exists only when a catalog opportunity becomes eligible, delayed, redirected, approved, declined, expired, or under-resourced.
- Resolutions exist only after a player/AI response is recorded.
- Diagnostics and traces exist only when opportunity evaluation emits observability rows.
- Absent fields remain valid for saves before opportunity materialization and for scenarios where no opportunity rows exist.

Because these records are lifecycle evidence rather than required current-save substrate, the correct contract is validate-when-present, not migration/materialization.

## Validator Coverage

The validator now rejects malformed present payloads for:

- `operation_opportunities`: malformed IDs, turn windows, status, approver faction, optional response/redirect/executed/reevaluation fields, axis evaluation rows, footprint snapshots, redirect variants, and persisted force-quality trait snapshots.
- `operation_opportunity_resolutions`: malformed IDs, responses, response turns, optional executed-op metadata, and exit classes.
- `operation_opportunity_diagnostics`: malformed turn/opportunity IDs, required/optional failed-axis rows, and optional-axis counters.
- `operation_opportunity_traces`: malformed turn/opportunity IDs, trace event values, optional proposal IDs, failed-axis rows, counters, executed-op names, and redirect variant IDs.

The validator deliberately does not resolve catalog IDs, normalize arrays, sort rows, materialize absent lifecycle buses, or validate OSID existence. When `last_force_quality_traits` is present, it validates the seven persisted trait values as finite numbers in `[0, 1]`.

## Verification

- Red proof: `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\operation_opportunity_state_validation.test.ts --reporter=dot` failed before implementation because malformed present opportunity lifecycle payloads were accepted.
- Focused green proof: `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\operation_opportunity_state_validation.test.ts --reporter=dot` passed 2/2.
- Opportunity pack: `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\operation_opportunity_state_validation.test.ts tests\operation_opportunities_substrate.test.ts tests\operation_opportunities_phase2_decisions.test.ts tests\operation_opportunities_catalog.test.ts --reporter=dot` passed 106/106.
- Typecheck: `npm.cmd run typecheck -- --pretty false`.
- Strict-null inventory: `node tools\diagnostics\strict_null_inventory.cjs --field-domains` stayed count-neutral at total 507 with `state: 172` and `sim: 327`.
- Whitespace: `git diff --check`.

## GitHub Sweep

- Open PR list returned empty before this branch was opened.
- Deployments API returned no deployment rows.
- Recent Actions failure sweep returned no failed runs in the default GitHub Actions run window.
- Open-PR Codex search returned no rows because there were no open PRs at sweep time.

## Files

- `src/state/validateGameState.ts`
- `tests/operation_opportunity_state_validation.test.ts`
- `docs/40_reports/implemented/20260604_OPERATION_OPPORTUNITIES_VALIDATE_WHEN_PRESENT.md`
- `docs/plans/COMMAND_BOARD.md`
- `docs/plans/MASTER_ROADMAP.md`
- `docs/40_reports/README.md`
- `.claude/napkin.md`
- `docs/PROJECT_LEDGER.md`
