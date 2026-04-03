# 2026-04-03 - Frontline authority and player-shell intel reduction

## Summary
- Retired `brigade_front_assignment` as a live runtime frontline authority.
- Made sectors the only accepted frontline truth for runtime assignment, fatigue, and local density logic.
- Reduced the tactical-map player shell `sectorIntel` DTO so it no longer carries enemy corps/faction identity that the Army HQ threat UI does not use.
- Added regression coverage so future work cannot quietly resurrect the legacy frontline writer or broaden the shell DTO again.

## Why
- The repo still had a split frontline model: canonical corps-front sectors on one side, and a legacy `brigade_front_assignment` writer/fallback on the other.
- That is exactly the sort of compatibility lane that Claude or a tired implementer will accidentally treat as co-equal truth.
- On the UI side, `GameStateAdapter` was still exporting enemy-facing identity fields in `sectorIntel` even though the live threat assessment only needs friendly-sector threat summary data.

## Files changed
- `src/sim/combat/front_assignment.ts`
- `src/sim/combat/local_front_defense.ts`
- `src/sim/turn_phases/war_phases.ts`
- `src/ui/map/data/types.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/components/army_hq/generateThreatAssessment.ts`
- `src/ui/map/components/army_hq/ThreatAssessment.tsx`
- `tests/front_assignment.test.ts`
- `tests/formation_fatigue_frontline_assignment.test.ts`
- `tests/local_front_density_modifier_precedence.test.ts`
- `tests/ui_map_fog_and_operation_contracts.test.ts`
- `tests/ui_map_render_smoke.test.ts`
- `tests/engine_honesty_legacy_contracts.test.ts`
- `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`
- `docs/40_reports/GUI_MASTER.md`
- `docs/PROJECT_LEDGER.md`
- `docs/PROJECT_LEDGER_KNOWLEDGE.md`

## What changed

### 1. Frontline truth is now sectors-only at runtime
- `front_assignment.ts` now does one thing: derive the frontline-assigned brigade set from `corps_front_sectors`.
- The old `ensureBrigadeFrontAssignments(...)` writer is gone.
- `war_phases.ts` no longer runs the legacy `ensure-brigade-front-assignment` pipeline step.
- `local_front_defense.ts` no longer falls back to `brigade_front_assignment` when sectors are absent; it returns neutral density (`1.0`) outside canonical sector truth.

### 2. Runtime mechanics no longer revive legacy front-assignment state
- Frontline fatigue only accrues from sector-based frontline truth.
- Local density modifiers in combat only use sector assignments.
- The engine-honesty test suite now asserts that:
  - `front_assignment.ts` no longer exports `ensureBrigadeFrontAssignments`
  - `war_phases.ts` no longer contains the `ensure-brigade-front-assignment` runtime step

### 3. Player shell `sectorIntel` is narrower and safer
- `SectorIntelRecordView` no longer exposes:
  - `enemy_faction`
  - `enemy_corps_id`
- `GameStateAdapter` still derives fog-of-war visibility from raw `sector_intel`, but it only exports the reduced threat-summary DTO to the player shell.
- `generateThreatAssessment.ts` was aligned to the reduced DTO and still produces the same player-facing threat cards.

## Verification
- `node .\\node_modules\\tsx\\dist\\cli.mjs --test tests\\front_assignment.test.ts tests\\formation_fatigue_frontline_assignment.test.ts tests\\local_front_density_modifier_precedence.test.ts tests\\ui_map_fog_and_operation_contracts.test.ts tests\\ui_map_game_state_adapter.test.ts`
- `node .\\node_modules\\vitest\\vitest.mjs run tests\\engine_honesty_legacy_contracts.test.ts tests\\ui_map_render_smoke.test.ts tests\\ui_player_visibility.test.ts`

## Follow-up
- Next shell hardening slice:
  - player-scope `operations`, `activeOperations`, `operationHistory`, and `pendingReserveRequests` at `GameStateAdapter`
  - remove remaining direct `loadedGameState.operations` reads in live shell components
  - shrink Warroom `ownCorpsOps` away from raw `CorpsOperation`

## Outcome
- The engine is now harder to lie to: sectors are the only frontline authority path that runtime mechanics accept.
- The player shell is now narrower by default: Army HQ threat assessment sees threat summary, not extra enemy identity detail it does not use.
