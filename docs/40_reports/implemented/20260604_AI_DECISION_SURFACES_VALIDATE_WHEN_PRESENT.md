# AI Decision Surfaces Validate-When-Present

**Date:** 2026-06-04  
**Branch:** `codex/ai-decision-contract`  
**Lane:** Optional `GameState` schema contract  
**Type:** Save/schema validator hardening

## Summary

`state.military.ai_decision_log` and `state.military.ai_army_decisions` remain optional AI commander surfaces, but malformed present payloads now fail save validation.

This is primarily a validate-when-present contract. It does not add a save-schema version, migration, fixture default, TypeScript required-field promotion, scenario data change, UI routing change, or player-facing command change. The producer boundary is also hardened so malformed AI response arrays are sanitized before they can be persisted.

## Contract

`military.ai_army_decisions` is optional because cadet/formula/headless saves and turns before AI commander materialization legitimately omit it. When present it must be an object keyed by canonical faction id. Each value must be a valid `ArmyDecision` shape:

- `faction`: canonical faction matching the key.
- `turn`: non-negative integer.
- `corps_directives`: object whose directive stances are `offensive`, `balanced`, or `defensive`.
- `operation_decisions`: object with string-array `approve`, `postpone`, and `abort`.
- Optional `peace_plan_response`: `accept`, `reject`, or `null`.
- Optional `reserve_deployment`: `null` or `{ deploy_to, reason }`.
- `strategic_reasoning` and `briefing_text`: strings.

`military.ai_decision_log` is optional because it is a replay/audit log only written when AI commander calls are recorded. When present it must be an array of log entries with non-negative turn, known decision level, canonical faction, a required non-empty corps id for corps-level replay entries, non-empty model id, optional finite non-negative token/latency numbers, and a level-appropriate decision payload. Army, corps, advisor, political, and event decision payloads are checked against the current AI type shapes.

`parseArmyResponse` now filters non-string entries out of AI-returned operation-decision arrays and directive target arrays before the state writer persists them. This keeps malformed-but-recoverable AI output from bricking a later load while the save validator still rejects malformed present state that bypasses the parser.

Cosmetic buffers (`corps_dialogues`, `war_dispatches`, `battle_narratives`) were deliberately not hardened in this slice. They remain lower-priority read-model/cosmetic retention fields and do not affect command behavior or replay selection.

## Verification

- `node node_modules\vitest\vitest.mjs run tests\ai_commander_parser.test.ts tests\save_migration_validator_rejection.test.ts --reporter=dot` - 162/162.
- `node node_modules\vitest\vitest.mjs run tests\save_migration_validator_rejection.test.ts --reporter=dot` - 147/147.
- `node node_modules\vitest\vitest.mjs run tests\ai_commander_ipc.test.ts --reporter=dot` - 16/16.
- `node node_modules\vitest\vitest.mjs run tests\events_evaluate.test.ts tests\event_state_shape_validation.test.ts tests\save_migration_validator_rejection.test.ts tests\ai_commander_validation.test.ts tests\ai_commander_ipc.test.ts tests\ai_commander_parser.test.ts --reporter=dot` - 233/233.
- `npm.cmd run typecheck -- --pretty false`.
- `node tools\diagnostics\strict_null_inventory.cjs --field-domains` stayed count-neutral at total 507 (`state: 172`, `sim: 327`).

Baseline regression is not required for this slice because it only rejects malformed present saves and does not change valid turn execution or scenario data.
