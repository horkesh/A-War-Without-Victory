# Cosmetic AI Buffers Validate-When-Present Contract

Date: 2026-06-04
Branch: `codex/cosmetic-ai-buffers-validate`
Type: Optional `GameState` schema contract

## Summary

`military.corps_dialogues`, `military.war_dispatches`, and `military.battle_narratives` remain optional cosmetic AI/read-model buffers. They are generated for flavor and player-facing presentation only; they do not feed gameplay, scenario calibration, operation launch, or combat resolution.

The save validator now rejects malformed present buffers while keeping absence valid. No migration, save-schema version bump, TypeScript optionality change, materialization, scenario data, baseline artifact, AI prompt/prose generation, or runtime behavior changed.

## Contract

- `corps_dialogues`: array of objects with non-negative integer `turn`, canonical `faction`, non-empty string `corps_id`, `officer_name`, and `acknowledgment`, string `concern`, and confidence in `high | medium | low`.
- `war_dispatches`: array of objects with non-negative integer `turn`, string `source`, `headline`, and `body`, and perspective in `humanitarian | military | civilian | diplomatic`. Text fields intentionally match `parseDispatchResponse(...)`, which accepts empty or whitespace strings from cosmetic AI output.
- `battle_narratives`: array of objects with non-negative integer `turn`, canonical `faction`, and non-empty string `target_osid`, `corps_id`, `officer_name`, `narrative`, `tone`, and `outcome`.

`military.narrative_queue` is deliberately left out because it is pending combat-work input, not a finished cosmetic read-model buffer.

## Verification

- Red proof: `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` failed because malformed present cosmetic AI buffers were accepted.
- Review follow-up red proof: parser-accepted whitespace `war_dispatches` strings were rejected before the validator aligned to the parser's string-only contract.
- Green focused validator: `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` passed 157/157.
- `npm.cmd run typecheck -- --pretty false` passed.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` stayed count-neutral at total `507` (`state: 172`, `sim: 327`, `derived: 8`, `unknown: 0`).
- `git diff --check` passed.

## Notes

This is shape validation only. It does not inspect, rewrite, classify, or judge generated narrative prose.
