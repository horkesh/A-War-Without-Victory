# Command Directive Target Affordances

**Date:** 2026-06-05

## Scope

Closed the second player-command review-backlog batch: command UI copy and request-operation target affordances in `DirectiveCard`.

This is UI/read-model only. It does not change simulation turn logic, operation construction, save schema, migrations, scenario data, baseline manifests, generated artifacts, randomness, timestamps, or deterministic ordering.

## Changes

- Request-operation copy now frames the player as sending an objective to corps staff for review, not directly ordering an attack as a field commander.
- `DirectiveCard` resolves fixed `targetOsid` captions through the player-safe OSID display-name map / humanizer instead of printing raw OSIDs.
- Typed request-operation display names still resolve to OSIDs when the display name maps to exactly one settlement.
- Ambiguous typed display names are blocked before `queryDirectiveObjection(...)` or `stageOpDirectiveOrder(...)` IPC calls, with a deterministic `strictCompare`-sorted list of exact OSID choices.
- Raw OSID input remains accepted for existing debug/load states when it exactly matches a controlled settlement key or OSID display-name key.

## Verification

- `npx.cmd vitest run tests/ui/directive_card_stop_op_action.test.ts --reporter=dot`
- `npm.cmd run typecheck -- --pretty false`

No scenario or baseline regression was required because the change is UI-only and does not affect sim/output/save/scenario bytes.

## Follow-Up

The full settlement/front picker remains open in the product backlog. The next recommended player-command batch is patron/diplomacy/receipt read models rather than another one-off target-field edit.
