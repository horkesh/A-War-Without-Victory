# Command Objective Picker

## Summary

Request-operation directives now offer a deterministic known-objective picker before the existing free-text OSID/display-name fallback. The picker appears in both the Decision Room `DirectiveCard` request-op path and the older Army HQ `OperationsSection` request row.

This is a UI/read-model affordance only. Selecting a row writes the selected OSID into the existing target input and then uses the existing objection review, command-authority cost, staging, and receipt path. It does not add brigade planning, axis planning, operation construction, save schema, simulation behavior, scenario data, baseline manifests, generated artifacts, randomness, timestamps, or persisted-output ordering.

## Scope

- Added a shared `buildObjectiveTargetOptions(...)` helper that derives known objective settlements from loaded control/display-name state and sorts labels with `strictCompare`.
- Updated `DirectiveCard` request-op controls to offer a localized known-objective picker while preserving typed exact-OSID and unique display-name resolution.
- Updated `OperationsSection` to offer the same picker for the older Army HQ request-operation row.
- Added English and BCS labels for the picker controls.
- Added focused fixture tests proving deterministic option ordering and unchanged request-op staging through both entry points.

## Verification

- `node node_modules\vitest\vitest.mjs run tests\ui\directive_card_stop_op_action.test.ts --reporter=dot`
- `npm.cmd run typecheck -- --pretty false`
- `git diff --check`

Scenario/baseline regression was not required because this is UI/read-model input selection only and cannot affect simulation, save, scenario, or generated output bytes.
