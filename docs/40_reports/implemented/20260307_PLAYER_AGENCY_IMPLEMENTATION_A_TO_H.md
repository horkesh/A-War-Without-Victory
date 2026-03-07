# Player Agency Implementation A-H

**Date:** 2026-03-07
**Primary Runs:** `n226`, `n242`, `n245`, `n248`, `n249`
**Baseline:** Pre-plan war map and war pipeline before `docs/30_planning/PLAYER_AGENCY_IMPLEMENTATION_PLAN.md`
**Result:** Phases `A` through `H` implemented and verified; `Phase E` remains deferred by plan

## Summary
- Executed the player-agency implementation plan across defensive surfacing, offensive levers, sector-level defensive orders, supply-agency decisions, intelligence warfare, and the H-phase calibration closure.
- Added the missing player-facing desktop/UI plumbing and the engine-side state/pipeline behavior so the new controls are not cosmetic.
- Closed the 40-week combat-calibration gate again at run `n248`/`n249`; the remaining misses are territorial-anchor calibration issues, not engine-integrity failures.

## Changes Made

### Phase A: Surface Defensive Systems
- Added enclave-facing defensive surfacing in [`EnclaveDashboard.tsx`](/F:/A-War-Without-Victory/src/ui/map/components/EnclaveDashboard.tsx) and adapter support in [`GameStateAdapter.ts`](/F:/A-War-Without-Victory/src/ui/map/data/GameStateAdapter.ts).
- Expanded defensive summaries in [`OOBSidebar.tsx`](/F:/A-War-Without-Victory/src/ui/map/components/OOBSidebar.tsx), [`FormationDetail.tsx`](/F:/A-War-Without-Victory/src/ui/map/components/FormationDetail.tsx), and [`buildCorpsFrontLinesGeoJSON.ts`](/F:/A-War-Without-Victory/src/ui/map/map/builders/buildCorpsFrontLinesGeoJSON.ts).
- Surfaced posture and entrenchment state in the map-side briefing panels.

### Phase F: Expose Offensive Levers
- Expanded `CorpsOperation` state in [`game_state.ts`](/F:/A-War-Without-Victory/src/state/game_state.ts) to carry `min_attack_outcome`, `tempo`, `schwerpunkt_osid`, `artillery_preparation`, `force_launch`, and halt/dig-in flags.
- Wired the planning UI through [`OpsPlanningModal.tsx`](/F:/A-War-Without-Victory/src/ui/map/components/OpsPlanningModal.tsx), [`OperationsPanel.tsx`](/F:/A-War-Without-Victory/src/ui/map/components/OperationsPanel.tsx), [`electron-main.cjs`](/F:/A-War-Without-Victory/src/desktop/electron-main.cjs), [`preload.cjs`](/F:/A-War-Without-Victory/src/desktop/preload.cjs), and [`useIPC.ts`](/F:/A-War-Without-Victory/src/ui/map/desktop/useIPC.ts).
- Added the `6: Operations` map mode with [`buildOperationalWeightGeoJSON.ts`](/F:/A-War-Without-Victory/src/ui/map/map/builders/buildOperationalWeightGeoJSON.ts), toolbar/shortcut support, and richer operation read models in the adapter.

### Phase B: Sector-Level Defensive Orders
- Added `sector_stance_orders` to state and implemented translation in [`sector_stance_orders.ts`](/F:/A-War-Without-Victory/src/sim/combat/sector_stance_orders.ts).
- Applied sector intent in the war pipeline via [`war_phases.ts`](/F:/A-War-Without-Victory/src/sim/turn_phases/war_phases.ts) rather than brigade-specific hacks.
- Added UI controls for stance and logistics priority in [`CorpsFrontPanel.tsx`](/F:/A-War-Without-Victory/src/ui/map/components/CorpsFrontPanel.tsx).

### Phase G: Shaping the Fight
- Made operation-level levers affect execution in [`sector_offensive.ts`](/F:/A-War-Without-Victory/src/sim/combat/sector_offensive.ts) and target approval in [`bot_brigade_ai_osid.ts`](/F:/A-War-Without-Victory/src/sim/combat/bot_brigade_ai_osid.ts).
- Added early launch penalties, all-out tempo cohesion burn, artillery preparation shock, manual halt handling, and dig-in-on-halt recovery behavior.

### Phase C: Supply as Player Agency
- Extended the existing patron-pressure system in [`patron_pressure.ts`](/F:/A-War-Without-Victory/src/state/patron_pressure.ts) with `composite_ivp` and hysteretic consequence bands.
- Implemented player-stageable airdrop allocation, deterministic humanitarian convoy decisions, smuggling allocation, and Sarajevo tunnel hooks in [`supply_reserves.ts`](/F:/A-War-Without-Victory/src/state/supply_reserves.ts) and [`war_phases.ts`](/F:/A-War-Without-Victory/src/sim/turn_phases/war_phases.ts).
- Surfaced pending convoy decisions, IVP consequences, and tunnel/airdrop status in [`SituationTab.tsx`](/F:/A-War-Without-Victory/src/ui/map/components/SituationTab.tsx), [`TopToolbar.tsx`](/F:/A-War-Without-Victory/src/ui/map/components/TopToolbar.tsx), and [`EnclaveDashboard.tsx`](/F:/A-War-Without-Victory/src/ui/map/components/EnclaveDashboard.tsx).

### Phase H: Intelligence Warfare
- Completed schema/lifecycle support for `feint` and `probe` operations in [`game_state.ts`](/F:/A-War-Without-Victory/src/state/game_state.ts) and [`sector_offensive.ts`](/F:/A-War-Without-Victory/src/sim/combat/sector_offensive.ts).
- Added sector-level `opsec_sectors` behavior in [`sector_intel.ts`](/F:/A-War-Without-Victory/src/sim/combat/sector_intel.ts) and sector controls in [`CorpsFrontPanel.tsx`](/F:/A-War-Without-Victory/src/ui/map/components/CorpsFrontPanel.tsx).
- Closed the H acceptance gate with harness-boundary artifact repair in [`scenario_runner.ts`](/F:/A-War-Without-Victory/src/scenario/scenario_runner.ts) and immediate idle-execution recovery in [`sector_offensive.ts`](/F:/A-War-Without-Victory/src/sim/combat/sector_offensive.ts).

### Refactor Passes
- Performed multiple simplify/refactor passes across the implementation footprint, including UI adapter cleanup, dead-code removal, helper extraction in Electron IPC, duplicated operation-message cleanup, harness fallback deduplication, and probe-intel reveal extraction.
- Final cleanup-only verification preserved the same post-H final hash between `n248` and `n249`.

## Verification Timeline

### Compilation and Tests
- `npm run typecheck`
- `npm run test:vitest`
- `npm run desktop:map:build`

### Scenario Regression Milestones
- `n226`: early offensive/UI groundwork baseline after initial implementation slice.
- `n242`: benchmark-fit passed `6/6`, but combat-causality invalid (`invalid_operation_count = 6`).
- `n245`: Phase C mechanics live; still `invalid_operation_count = 6`.
- `n248`: H gate restored. `invalid_operation_count = 0`, `valid_for_combat_calibration = true`, benchmark suite `6/6`.
- `n249`: post-refactor verification. Same final state hash as `n248` (`f5e0e48c6d2538ab`), same green combat-calibration status.

## Final State

### Completed
- Phase `A`
- Phase `B`
- Phase `C`
- Phase `F`
- Phase `G`
- Phase `H`

### Deferred by Plan
- Phase `E` (`Advanced Mobilization Agency`)

## Remaining Follow-Up
- Territorial anchor drift still remains at municipality `srebrenica` and OSID `op:brcko:brka_2`.
- Those are calibration/scenario-anchor issues, not player-agency feature failures.
- Session process discipline was not completed as originally sequenced in the plan because the worktree already contained broad in-flight changes, so no clean per-phase commit sequence was produced during execution.

## Files Changed

| Area | Key Files |
|------|-----------|
| State/schema | `src/state/game_state.ts`, `src/state/patron_pressure.ts`, `src/state/supply_reserves.ts`, `src/state/serializeGameState.ts` |
| War pipeline and combat | `src/sim/turn_phases/war_phases.ts`, `src/sim/combat/sector_stance_orders.ts`, `src/sim/combat/sector_offensive.ts`, `src/sim/combat/sector_intel.ts`, `src/sim/combat/bot_brigade_ai_osid.ts`, `src/sim/combat/bot_corps_ai.ts` |
| Scenario harness/reporting | `src/scenario/scenario_runner.ts`, `tests/scenario_runner_artifact_repair.test.ts`, `tests/sector_offensive_idle_recovery.test.ts`, `tests/h_phase_intelligence_warfare.test.ts` |
| Desktop bridge | `src/desktop/electron-main.cjs`, `src/desktop/preload.cjs`, `src/ui/map/desktop/useIPC.ts` |
| UI and adapter | `src/ui/map/components/CorpsFrontPanel.tsx`, `src/ui/map/components/EnclaveDashboard.tsx`, `src/ui/map/components/OperationsPanel.tsx`, `src/ui/map/components/OpsPlanningModal.tsx`, `src/ui/map/components/SituationTab.tsx`, `src/ui/map/components/TopToolbar.tsx`, `src/ui/map/components/MapModeToolbar.tsx`, `src/ui/map/hooks/useKeyboardShortcuts.ts`, `src/ui/map/data/GameStateAdapter.ts`, `src/ui/map/data/types.ts`, `src/ui/map/map/builders/buildOperationalWeightGeoJSON.ts` |
| Verification | `tests/sector_stance_orders.test.ts`, `tests/operation_tempo.test.ts`, `tests/phase_c_supply_agency.test.ts`, `tests/supply_airdrop.test.ts`, `tests/ui_map_front_lines_phase_a.test.ts`, `tests/ui_map_operations_mode.test.ts`, `vitest.config.ts` |

## Lessons Learned
- The “UI-only” classification in the plan was misleading for parts of Phase F; schema, IPC, and lifecycle changes made it engine-touching from the start.
- Player-agency surfaces only became reliable once the desktop IPC contract, adapter contract, and war-phase behavior were updated together.
- Combat-calibration validity depends on harness and lifecycle correctness as much as on target scoring or calibration constants. The H gate was closed by invariant repair and idle-operation recovery, not by tuning.

## Next Steps
- Investigate `srebrenica` and `op:brcko:brka_2` as calibration/anchor follow-up.
- If needed, isolate the completed implementation in a clean branch/worktree and restore the intended commit discipline retroactively.
