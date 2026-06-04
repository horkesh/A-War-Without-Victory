# Campaign Plans Validate-When-Present

**Date:** 2026-06-04
**Branch:** `codex/campaign-plan-contract`
**Lane:** Optional `GameState` schema contract
**Type:** Save/schema validator hardening

## Summary

`state.military.campaign_plans` and `state.military.last_gathering_turn` remain optional Army HQ gathering records, but malformed present nested campaign-plan payloads now fail save validation.

This is a validate-when-present contract only. It does not add a save-schema version, migration, fixture default, TypeScript required-field promotion, simulation behavior change, scenario data change, Tactical Group change, `army_hq_operations` change, UI routing change, or player-facing command change.

## Contract

`military.campaign_plans` is optional because Army HQ gathering materializes plans lazily per faction. Absence means no current Army HQ campaign plan has been written for that save. `military.last_gathering_turn` follows the same lazy record pattern.

When present, `campaign_plans` must be a record keyed by canonical faction id. Values may be `null` for a cleared plan, otherwise they must be valid `CampaignPlan` objects:

- `issued_turn`: non-negative integer.
- `valid_until_turn`: non-negative integer greater than or equal to `issued_turn`.
- `emergency`: boolean.
- `trigger_reason`: non-empty string.
- `front_priorities`: array of rows with non-empty `corps_id`, valid front role, valid suggested stance, and optional string-array `offensive_targets` / `hold_targets`.
- Optional `doctrine_override`: object with valid Army HQ army stance, finite `aggression_modifier`, and optional corps stance ceiling record.
- `synchronized_operations`: array of rows with non-empty `name`, valid launch window, string-array `target_area`, and valid participant rows.
- Sync participants require non-empty `corps_id`, valid participant role, string-array `target_osids`, and positive `min_brigades`. Empty `target_osids` arrays remain valid because sync operations can be generated from front priorities with no current offensive targets.
- `force_transfers`: array of rows with non-empty brigade/from/to ids, non-negative `march_turns` and `issued_turn`, and boolean `completed`.
- `excluded_corps`: string array.

When present, `last_gathering_turn` must be a canonical faction-keyed record of non-negative integer turns.

The validator does not normalize, sort, migrate, clear, or materialize either record. It deliberately avoids Tactical Groups, `army_hq_operations`, and v34 TG migration scaffolds.

## Verification

- Red proof: `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\army_hq_gathering.test.ts --reporter=dot` failed because malformed nested `campaign_plans` payloads were accepted.
- `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\army_hq_gathering.test.ts --reporter=dot` - 68/68.
- `node F:\A-War-Without-Victory\node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts tests\army_hq_gathering.test.ts tests\commander\briefing_campaign_intent.test.ts --reporter=dot` - 234/234.
- `npm.cmd run typecheck -- --pretty false`.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` stayed count-neutral at total 507 (`state: 172`, `sim: 327`).
- `git diff --check`.

Baseline regression is not required for this slice because it only rejects malformed present saves and does not change valid turn execution or scenario data.
