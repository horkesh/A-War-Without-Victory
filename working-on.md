# Working On — Interrupted Session 2026-03-29

## Completed This Session (22 fixes in working tree, NOT committed)
All fixes verified: tsc clean, n1198 at 90.1% area-weighted, 21/22 anchors, 6/6 benchmarks, validate_run_consistency PASS.

### Intel/Probe Overhaul (5 fixes)
- `sector_intel.ts`: getStalestSectorIntelConfidence, getSectorPairIntelConfidence, offensive_signs threshold lowered to CONFIDENCE_FULL_STRENGTH (0.5)
- `bot_corps_directives.ts`: stalest per-sector-pair confidence, forced commitment removed
- `bot_brigade_ai_osid.ts`: default threshold stalemate→costly_victory
- `bot_brigade_eval_attack.ts`: min_attack_outcome raised
- `combat_predictor.ts`: fog scaled by intel confidence (FOG_BASE=0.70, FOG_INTEL_SCALE=0.25)

### Brigade Assignment (5 fixes)
- `brigade_assignment.ts`: drift skip removed, catch-all guard, component gate relaxation in ensureMinimumSectorCoverage
- `corps_front_sectors.ts`: unstaffable sector prevention (component check), syncSectorAssignmentsToFormations
- `game_state.ts`: FormationAssignment extended with sector kind

### Pocket Evacuation (4 fixes)
- `sector_offensive.ts`: post-op return march checks brigade in corps sector territory (not just "corps has front")
- `brigade_home_return.ts`: tiny pocket (≤2 OSIDs) brigades not exempt from home return
- `bot_brigade_eval_front.ts`: evaluatePocketEvacuation (column march home from non-enclave tiny sectors)
- `war_phases.ts`: drift recall uses bfsFriendlyDistance instead of bfsRawDistance

### Recording Fixes (4 fixes)
- `brigade_history_recorder.ts`: floor-division remainder distribution for casualty attribution
- `frontline_attrition.ts`: 65% of friction events now update total_casualties_taken
- `siege_attrition.ts`: siege bombardment casualties recorded in brigade_history
- `formation_spawn.ts`, `strategic_reserve.ts`, `brigade_reconstitution.ts`, `operational_groups.ts`: peak_personnel updated at 7 reinforcement sites

### Other Fixes
- `paramilitary_sweep.ts`: f.personnel = 0 on dissolution
- `anomaly_checks_extended.ts`: checks #24 (ghost paramilitaries), #25 (intel blindness), #26 (attack imbalance)
- `anomaly_detector.ts`: wired #24-#26, unassigned_frontline_brigades severity→critical
- `sector_offensive.ts`: isStagingCorridorSafe articulation point check
- `tools/validate_run_consistency.cjs`: 6 internal consistency checks

## Next Session — Priority Order

### P0: SpatialContext (architectural — do this FIRST)
Technical Architect proposed shared `SpatialContext` at pipeline boundaries. Eliminates entire category of "systems disagree about spatial reality" bugs. 15+ redundant adjacency rebuilds per turn. See napkin for full description.
- Design: `SpatialContext` interface with adjacency, friendlyOsids, components, reachable(), friendlyDistance()
- Computed at 2 points: pre-combat (after partition-corps-front-sectors), post-combat (after resolve-attack-orders)
- Every system that builds its own adjacency/friendlyOsids/BFS calls SpatialContext instead

### P0: Corps Launch Feasibility Check
`evaluateCorpsOffensiveLaunch` has NO combat prediction — creates ops brigades refuse to execute. Add predictor sample before creating op. If no target is achievable at costly_victory, don't create the op.

### P0: Ops Commander Reevaluation on Brigade Loss
Design spec at `docs/30_planning/OPERATION_REEVALUATION_DESIGN_SPEC.md`. When ANY brigade is removed from an active op, commander reevaluates feasibility, corps CO decides continue/reinforce/reduce/abort. Player always notified. 14 notification types specified. Implement per spec.

### P1: findEmergencyRetreatOsid — directional retreat
Currently direction-blind (picked sela_2 dead end over trnovo main body). Must prefer retreat toward home/corps HQ using friendly BFS distance ranking. The sela_2 investigation traced the full chain — see napkin and ledger.

### P1: Phantom Defender
Co-located brigades aggregate power but only primary takes casualties. Secondary = free power. `attack_resolution_osid.ts` lines 771-787. All co-located defenders must share casualties proportionally.

### P1: bfsDistance raw adjacency
`sector_utils.ts:174` — used by brigade_front_distribution and subsegment_assignment with NO faction filter. Must use friendly-only BFS.

### P2: Multi-Brigade Main/Support Operations
Design spec at `docs/30_planning/MULTI_BRIGADE_OPERATION_DESIGN_SPEC.md`. Main brigade advances, support provides 70% power at 40% casualties. Repositioning between objectives. Bot generates multi-axis ops with spread staging.

## Key Files Modified (for git diff review before commit)
- `src/sim/combat/`: bot_brigade_ai_osid.ts, bot_brigade_eval_attack.ts, bot_brigade_eval_front.ts, bot_corps_directives.ts, brigade_assignment.ts, brigade_history_recorder.ts, brigade_home_return.ts, brigade_reconstitution.ts, combat_predictor.ts, corps_front_sectors.ts, frontline_attrition.ts, operational_groups.ts, paramilitary_sweep.ts, sector_intel.ts, sector_offensive.ts, siege_attrition.ts
- `src/sim/turn_phases/war_phases.ts`
- `src/sim/formation_spawn.ts`
- `src/state/game_state.ts`
- `src/scenario/anomaly_detector.ts`, `anomaly_checks_extended.ts`
- `tools/validate_run_consistency.cjs`
- `docs/30_planning/MULTI_BRIGADE_OPERATION_DESIGN_SPEC.md`, `OPERATION_REEVALUATION_DESIGN_SPEC.md`
- `docs/40_reports/CALIBRATION_MASTER.md`, `SECTOR_MASTER.md`
- `docs/10_canon/Systems_Manual_v0_7_0.md`
- `docs/PROJECT_LEDGER.md`, `docs/life_lessons.md`, `docs/life_lessons/process.md`, `docs/life_lessons/calibration.md`
- `.claude/napkin.md`

## Expert Audit Reports (reference for next session)
- Systems Programmer: 33 pathfinding functions cataloged (friendly vs raw vs teleport)
- Technical Architect: SpatialContext proposal
- Gameplay Programmer: retreat/movement spatial awareness audit
- Operations Expert: n1198 full ops health report (20 completed, 9 active zombie)
- Defense Audit: phantom defender at ljuta
- Scenario Tester: n1198 full run report
- War-or-Game: n1198 realism assessment (P1: empty sectors)
