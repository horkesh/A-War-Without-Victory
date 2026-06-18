# Command Briefing Route Contracts

**Date:** 2026-06-18
**Status:** Implemented
**Type:** UI/read-model routing polish

## Summary

The command briefing had several action chips that looked actionable but either mapped to `none`, reopened stale Army HQ state, or fell through to a generic briefing surface. This slice makes the action contract explicit and routeable:

- supply briefing rows preserve a Summary/support route
- peace-plan briefing rows route to the inbox/modal owner
- officer interpretation/personnel rows route to Army HQ briefing/personnel
- corps rows use shell-navigation helpers instead of selected-army side effects
- Army HQ Situation Briefing renders normalized chip labels and routes supported target types
- enclave briefing titles humanize identifier-like ids before player display

The new target metadata is additive on `military.last_briefing.target`; existing saves without it remain valid.

## Verification

- Red/green command-briefing route pack: `tests/command_briefing.test.ts`, `tests/ui_map_render_smoke.test.ts`, `tests/ui/situation_briefing_progressive_disclosure.test.ts`, `tests/ui/command_briefing_banner_contract.test.ts`, `tests/ui/presidential_decision_room.test.ts`
- Result: 5 files / 65 tests passed
- Persisted-state validation pack: `tests/save_migration_validator_rejection.test.ts`, `tests/state.test.ts`, `tests/ui_map_game_state_adapter.test.ts`
- Result: 3 files / 229 tests passed
- TypeScript: passed

## Scope

UI/read-model route ownership plus optional briefing target metadata. No combat logic, scenario setup, map geometry, startup artifact, save schema version, serialization ordering, calibration floor, golden baseline, randomness, timestamp, persisted output ordering, or packaged installer artifact changed.
