# Last Briefing Validate-When-Present Contract

Date: 2026-06-04
Branch: `codex/last-briefing-validate-when-present`
Type: Optional `GameState` schema contract

## Summary

`military.last_briefing` remains an optional war-phase command briefing packet. It is written only when the war-phase briefing path has a `meta.player_faction`, and it is cosmetic read-model state that does not affect gameplay.

The save validator now rejects malformed present `military.last_briefing` packets while keeping absence valid. No migration, schema version bump, TypeScript optionality change, materialization, scenario data, baseline artifact, or runtime behavior changed.

## Contract

When present, `military.last_briefing` must be an object with a non-negative integer `turn`, canonical `faction`, string `headline`, non-negative integer `criticalCount` and `warningCount`, and an `items` array.

Each item must include non-empty string `id`, `section`, `title`, and `detail`, plus `severity` in `critical | warning | info`. Optional `actionLabel` must be a string. Optional `target` remains a permissive object, but existing string keys such as `kind`, `osid`, `corpsId`, and `enclaveId` must be strings when present.

## Verification

- Red proof: `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` failed before the validator because malformed present `military.last_briefing` payloads were accepted.
- Inventory: `node tools\diagnostics\strict_null_inventory.cjs --field-domains` passed and stayed count-neutral at total `507` (`state: 172`, `sim: 327`, `derived: 8`, `unknown: 0`).
- Focused validator: `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` passed 154/154.
- Command briefing / UI visibility pack: `npx.cmd vitest run tests/state.test.ts tests/command_briefing.test.ts tests/ui_map_game_state_adapter.test.ts tests/warroom_player_visibility.test.ts --reporter=dot` passed 57/57.
- `npm.cmd run typecheck -- --pretty false` passed.
- `git diff --check` passed.
