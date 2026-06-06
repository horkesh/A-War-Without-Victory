# Command Surface Repurpose Read-Models

## Summary

The presidential command surface repurpose batch deepens three existing dead-end or thin panels without adding simulation authority:

- `EnclaveDashboard` is reframed as the Humanitarian & Siege Ledger, adds a presidential readout for critical, heightened, and airdrop-ready enclaves, and sorts enclave rows through `strictCompare`.
- `EconomyPanel` is reframed as War Footing, adds a presidential readout for strained reserves, visible facilities, and disrupted routes, filters to the player faction as before, and sorts facilities, routes, and embargo rows through `strictCompare`.
- `AiAdvisorPanel` remains Chief-of-Staff Counsel and now sorts recommendation rows by priority plus stable text tie-breaks instead of rendering input-order/index-keyed rows.

## Scope

This is UI/read-model only. It does not change simulation phases, save schema, migrations, scenario data, generated baseline artifacts, command authority costs, event consequences, or persisted outputs.

## Determinism

The batch removes locale-sensitive ordering from the three repurposed panels and adds a focused static guard proving those files do not use `localeCompare`.

## Validation

- `node node_modules\vitest\vitest.mjs run tests\ui\command_surface_repurpose_panels.test.ts tests\ui\ai_advisor_panel.test.ts tests\ui\presidential_categories.test.ts tests\ui\presidential_decision_room.test.ts --reporter=dot`
- `npm.cmd run typecheck -- --pretty false`
- `git diff --check`

No scenario or baseline regression is required because the changed code is UI/read-model-only and cannot affect simulation, save, scenario, or baseline bytes.
