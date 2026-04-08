# Operation Truth Reconciliation And Axis Integrity Hardening

**Date:** 2026-04-08  
**Scope:** active-operation participant truth, axis-roster truth, final operation reconciliation, and physical-sector anchoring  
**Result:** live operations now end the turn with cleaned participant rosters, truthful sector anchors, axis membership kept in sync with elite-loan and replacement paths, and empty execution ops forced out of fake execution into deterministic recovery

## Summary
- Added a final end-of-turn operation-truth reconciliation pass so the saved state no longer relies on stale mid-turn operation membership or anchoring.
- Closed the elite-loan ghost-participant seam by making loan deploy/auto-join update both flat participants and axis rosters, and making loan recall remove the elite from live operations before the brigade teleports home.
- Hardened operation anchoring so sector selection prefers physical brigade location truth over stale roster overlap.
- Closed the damaged-brigade replacement seam where non-sector operations could replace a participant without updating the axis roster that still claimed the old brigade.
- Verified the new contracts with targeted tests, recovery, and a fresh 40-week scenario run.

## Why This Was Necessary
The operations lane still had multiple truth-owner seams after the earlier harness hardening:
- live operations could keep participants after elite recall
- axis rosters could drift away from `participating_brigades`
- operation anchoring could prefer stale sector overlap over the sector that physically owned the brigades
- late brigade lifecycle changes could happen after operations were created, with no final cleanup before save

Those seams do not always crash the sim, but they quietly poison diagnostics, reporting, combat-causality, and downstream scenario analysis.

## Changes Made

### Final operation truth reconciliation
- [src/sim/combat/final_operation_truth_reconciliation.ts](/F:/A-War-Without-Victory/src/sim/combat/final_operation_truth_reconciliation.ts)
  - Added a final authority pass that:
    - deduplicates and filters operation participants to active formations only
    - filters every axis roster to the surviving active participants
    - re-derives `sector_id` from final sector truth plus live formation locations
    - forces execution-phase operations with zero surviving participants into `recovery` with `recovery_reason: brigade_attrition`
- [src/sim/turn_phases/war_phases.ts](/F:/A-War-Without-Victory/src/sim/turn_phases/war_phases.ts)
  - Wired the new `reconcile-final-operation-truth` phase immediately after final sector reconciliation and before the final operation lifecycle assertion.

### Elite loan / active operation integrity
- [src/sim/combat/army_reserve_system.ts](/F:/A-War-Without-Victory/src/sim/combat/army_reserve_system.ts)
  - Added `attachEliteToOperation(...)` so offensive-support and exploitation loans join both `participating_brigades` and a deterministic live axis.
  - Loan recall now removes the brigade from the receiving corps's active operation before clearing the loan state.
  - Auto-join for already-loaned elites now uses the same shared attachment helper instead of a flat-participant-only path.
- [src/sim/combat/brigade_dissolution.ts](/F:/A-War-Without-Victory/src/sim/combat/brigade_dissolution.ts)
  - Hardened `removeFromActiveOperation(...)` against missing `active_operations` arrays in reduced test states.

### Truthful sector anchoring for operations
- [src/sim/combat/corps_operation_helpers.ts](/F:/A-War-Without-Victory/src/sim/combat/corps_operation_helpers.ts)
  - Extended `derivePrimarySectorForBrigades(...)` to accept live formation state and count physical sector ownership through `territory_osids` and `sub_segment.friendly_osids`.
  - Sector selection now prefers physical matches over stale assigned/reserve roster overlap.
- Updated all launch/emit call sites to pass live formations:
  - [src/sim/combat/bot_corps_operations.ts](/F:/A-War-Without-Victory/src/sim/combat/bot_corps_operations.ts)
  - [src/sim/combat/bot_corps_corridor.ts](/F:/A-War-Without-Victory/src/sim/combat/bot_corps_corridor.ts)
  - [src/sim/combat/pre_planned_operations.ts](/F:/A-War-Without-Victory/src/sim/combat/pre_planned_operations.ts)
  - [src/sim/combat/triggered_operations.ts](/F:/A-War-Without-Victory/src/sim/combat/triggered_operations.ts)
  - [src/sim/combat/commander/emit.ts](/F:/A-War-Without-Victory/src/sim/combat/commander/emit.ts)

### Axis roster replacement integrity
- [src/sim/combat/sector_offensive.ts](/F:/A-War-Without-Victory/src/sim/combat/sector_offensive.ts)
  - Non-sector operation maintenance now remaps `axis.assigned_brigades` when damaged participants are replaced, preventing axis truth from drifting behind the new participant list.

## Test Coverage
- [tests/army_reserve_system.test.ts](/F:/A-War-Without-Victory/tests/army_reserve_system.test.ts)
  - Added coverage for:
    - offensive elite loans joining a live execution axis
    - recalled elites being removed from active operations and axes
    - already-loaned elites auto-joining newly launched execution operations through axis membership
- [tests/corps_operation_helpers.test.ts](/F:/A-War-Without-Victory/tests/corps_operation_helpers.test.ts)
  - Added physical-anchor selection tests for `derivePrimarySectorForBrigades(...)`
- [tests/final_operation_truth_reconciliation.test.ts](/F:/A-War-Without-Victory/tests/final_operation_truth_reconciliation.test.ts)
  - Added coverage for final participant cleanup, truthful re-anchoring, and empty execution ops entering `brigade_attrition` recovery
- [tests/operation_progress_replacement_truth.test.ts](/F:/A-War-Without-Victory/tests/operation_progress_replacement_truth.test.ts)
  - Added axis-roster synchronization coverage for damaged-brigade replacement

## Verification

### Commands
- `cmd /c npx vitest run tests\army_reserve_system.test.ts`
- `cmd /c npx vitest run tests\corps_operation_helpers.test.ts`
- `cmd /c npx vitest run tests\final_operation_truth_reconciliation.test.ts`
- `cmd /c npx vitest run tests\operation_progress_replacement_truth.test.ts`
- `cmd /c npx vitest run tests\corps_operation_helpers.test.ts tests\operation_progress_replacement_truth.test.ts tests\army_reserve_system.test.ts tests\final_operation_truth_reconciliation.test.ts tests\bot_corps_corridor.test.ts`
- `cmd /c npm run typecheck`
- `cmd /c npx vitest run tests\scenario_operation_diagnostics.test.ts`
- `cmd /c npx tsx --test tests\scenario_vrs_operation_proof.test.ts`
- `cmd /c npm run recovery:check`
- `cmd /c npm run sim:scenario:run:40w`

### Outcome
- Targeted operation-truth regressions passed.
- Typecheck passed.
- Operation diagnostics and proof contracts still passed.
- Recovery gate passed.
- Fresh scenario run completed successfully and produced:
  - run directory: `runs/apr1992_definitive_40w__8ba9e38bf6ab76dc__w40_n1371`
  - final state hash: `4387d27e4f472314`

## Residual Pressure After This Wave
The fresh `n1371` scenario still surfaced live operation-quality pressure:
- several probes and some larger ops still reached execution or recovery with zero eligible attackers / no logged attempts
- this is no longer a participant-truth problem; it is now an execution-quality and launch-quality problem
- the next hardening wave should target dead-on-arrival operation launch and no-attempt execution cleanup so the operation lane reaches the same practical `A+` standard that the truth layer now has structurally

## Follow-On Plan: Dead-On-Arrival Probe Hardening
After the truth-reconciliation wave, the next `A+` gap became much narrower and more concrete:
- fresh 40-week run `n1372` reduced invalid operations from `116` to `70`
- zero-eligible-attacker operations dropped from `65` to `7`
- the remaining dominant pattern is no longer stale participants or anchors
- the remaining dominant pattern is repeated probe launches that reach recovery with `no_logged_attempt`

### Current evidence
- Fresh `n1372` operation diagnostics are now dominated by `probe | recovery | no_logged_attempt | recovery_without_logged_attempt`
- Remaining execution-phase invalids are a much smaller set, mostly genuine execution-without-attack cases rather than stale roster truth
- `combat_causality.ts` already exempts maneuvering operations when movement orders exist, so the surviving invalidations are not just report noise

### Working root-cause model
- Probe birth is still too permissive: launch paths can create a probe from reachability / objective presence without proving a realistic attack or approach path
- Probe execution is still too strict in one key place: probe attack thresholds can reject all local attack options, leaving the probe alive just long enough to die honestly as `no_logged_attempt`
- This leaves a smaller but still important class of fake work: operations that are now truthfully serialized, but should never have existed in the first place

### Next implementation pass
1. Add red tests for probe launch viability and probe no-attempt lifecycle edges
2. Tighten probe launch so a probe must have a truthful path to do at least one useful thing:
   - produce an acceptable direct or intermediate attack prediction, or
   - reach a valid approach/staging route that execution can actually use
3. Revisit probe attack threshold defaults so probes can perform limited recon-by-force without demanding full offensive quality
4. Rerun fresh scenario and recovery gates, then inspect weekly invalid operation summaries until this class of failure is genuinely quiet

## Final Wave: Execution-Quality Hardening To A+
The final wave closed the remaining gap between structurally truthful operations and practically truthful combat-causality.

### Root cause narrowed from `n1376`
The post-reconciliation audit of run `n1376` showed that the remaining invalid operations were no longer caused by stale participants, stale anchors, or axis drift. The residual failure family was narrower:
- probes could still launch from a geometric or coarse objective signal even when the specific brigade could not issue a viable attack this turn
- politically blocked objectives could leave operations alive in `execution` even though Graz/truce rules prevented any legal attack from happening
- `eligible_attacker_count` diagnostics were counted before the final attack-order trim and political blocking filters, so the metric could disagree with the actual surviving attack orders

### Additional changes made

#### Exact launch-time probe feasibility
- [src/sim/combat/commander/commander_state.ts](/F:/A-War-Without-Victory/src/sim/combat/commander/commander_state.ts)
  - Extended `CommanderBriefing` with optional `state_ref` and `reverse_map` so launch logic can inspect exact current-world legality and adjacency.
- [src/sim/combat/commander/briefing.ts](/F:/A-War-Without-Victory/src/sim/combat/commander/briefing.ts)
  - Populates the new briefing fields from live game state.
- [src/sim/combat/commander/emit.ts](/F:/A-War-Without-Victory/src/sim/combat/commander/emit.ts)
  - Probe launch now rejects candidate objectives unless the chosen brigade has a truthful immediately-usable path:
    - direct or approach adjacency exists this turn
    - the target is not on failed-objective cooldown
    - the target is not politically blocked by Graz/truce rules
    - exact adjacent attack prediction for that brigade meets the probe threshold
  - This closes the old seam where a probe could be "interesting" in map geometry but dead on arrival in brigade reality.

#### Political blockage becomes explicit recovery, not fake execution
- [src/state/game_state.ts](/F:/A-War-Without-Victory/src/state/game_state.ts)
  - Added `political_blocked` to the `recovery_reason` union for corps operations.
- [src/sim/combat/sector_offensive.ts](/F:/A-War-Without-Victory/src/sim/combat/sector_offensive.ts)
  - Added `hasOnlyPoliticallyBlockedCurrentObjectives(...)`.
  - Planning-to-execution and execution maintenance now push operations straight into one-turn `political_blocked` recovery when every current objective is legally blocked.
  - `political_blocked` recovery is intentionally not recorded as a failed-objective attack failure and uses a short deterministic recovery window.

#### Final eligible-attacker diagnostics now read post-trim truth
- [src/sim/combat/bot_brigade_ai_osid.ts](/F:/A-War-Without-Victory/src/sim/combat/bot_brigade_ai_osid.ts)
  - Recomputes `eligible_attackers_by_corps` from the final surviving `attack_orders` after corps-level trimming and Graz filtering, instead of using a pre-trim approximation.
- [src/scenario/combat_causality.ts](/F:/A-War-Without-Victory/src/scenario/combat_causality.ts)
  - `recovery_without_logged_attempt` now only fires for operations that entered recovery this turn with `recovery_reason: 'no_logged_attempt'`, preventing legitimate clean exits such as `political_blocked` from being misclassified as invalid.

### Test coverage added in the final wave
- [tests/commander/elite_formation_utilization.test.ts](/F:/A-War-Without-Victory/tests/commander/elite_formation_utilization.test.ts)
  - Added coverage proving probes skip:
    - truce-blocked directly adjacent targets
    - directly adjacent targets whose exact predicted outcome is below the probe threshold
- [tests/sector_offensive_idle_recovery.test.ts](/F:/A-War-Without-Victory/tests/sector_offensive_idle_recovery.test.ts)
  - Added coverage that truce-blocked execution probes enter one-turn `political_blocked` recovery instead of stalling in `execution`
- [tests/scenario_operation_diagnostics.test.ts](/F:/A-War-Without-Victory/tests/scenario_operation_diagnostics.test.ts)
  - Added coverage proving politically blocked recovery is not misreported as `recovery_without_logged_attempt`

### Final verification

#### Commands
- `cmd /c npx vitest run tests\commander\elite_formation_utilization.test.ts tests\sector_offensive_idle_recovery.test.ts tests\scenario_operation_diagnostics.test.ts`
- `cmd /c npx tsc --noEmit`
- `cmd /c npm run sim:scenario:run:40w`
- `cmd /c npm run sim:scenario:run:40w`
- `cmd /c npm run recovery:check`

#### Outcome
- Targeted tests passed.
- Typecheck passed.
- Fresh 40-week run `n1377` completed with final hash `54e1820f5728e841` and combat-causality metrics:
  - `invalid_operation_count: 0`
  - `recovery_without_logged_attempt_count: 0`
  - `zero_eligible_attacker_operation_count: 0`
- Fresh rerun `n1378` completed with the same final hash `54e1820f5728e841`, confirming deterministic stability for this code state.
- Recovery gate passed.

## Final Status
The operations / execution / combat-causality lane now reaches the same `A+` practical standard as the sector/frontline truth lane:
- launch-time feasibility matches brigade-side execution reality
- politically impossible operations exit honestly instead of pretending to execute
- diagnostics now describe final post-trim attack truth instead of a stale approximation
- fresh scenario evidence shows zero combat-causality invalid operations on deterministic reruns

## Lessons Learned
- Final-turn reconciliation is not just a sector problem. Any system with late brigade/location writers needs one last truth-owner pass before serialization.
- A flat participant list is not enough once operations have axes. Axis rosters are part of runtime truth and must be updated everywhere the flat roster changes.
- Sector anchoring for operations should prefer where brigades physically are, not where stale assignment residue says they belong.
- Empty execution operations are not neutral debris. If they survive into the save, they become false live authority for diagnostics and reporting.
