# Diagnosed Problems & Proposed Solutions — 2026-03-26

Comprehensive index of all mechanical issues discovered during the Deployment & Combat Audit session. Covers deployment pipeline, operations architecture, intelligence, combat, and data infrastructure.

## Status Key

- **FIXED** = implemented, tested, committed
- **IN PROGRESS** = being implemented now
- **PROPOSED** = solution designed, not yet implemented
- **DIAGNOSED** = root cause identified, no fix designed yet

---

## Deployment Layer

### P1: rs_2nd_romanija_brigade wrong corps (FIXED)

- **Problem**: `rs_2nd_romanija_brigade` was assigned to `vrs_drina` in OOB data, but the brigade is homed in Sokolac — a Sarajevo-Romanija Corps (SRK) municipality. The wrong corps assignment caused BFS territory mapping (`mapOsidsToCorps`) to seed Sokolac and adjacent Sarajevo ring OSIDs to the Drina Corps, distorting both SRK and Drina sector boundaries. Drina Corps was projecting force into the Sarajevo siege zone.
- **Solution**: Changed `corps_id` from `vrs_drina` to `vrs_sarajevo_romanija` in OOB data. Removed brigade from Operation Podrinje Sweep in `pre_planned_operations.ts`.
- **Calibration impact**: Primary contributor to -0.3pp regression (91.7% to 91.4%) — Drina Corps can no longer project into the Sarajevo ring.
- **Files**: `data/source/oob_brigades.json`, `src/sim/combat/pre_planned_operations.ts`
- **Commit**: `8b0d3aa0`

### P2: Cross-corps enclave defense lacks reachability check (FIXED)

- **Problem**: Step 6b in `brigade_assignment.ts` assigned brigades to sectors without checking BFS component reachability. A brigade in one connected component could be assigned to a sector in an unreachable component.
- **Solution**: Added component membership check before assignment, matching the pattern already used in Step 7 (`ensureMinimumSectorCoverage`).
- **Calibration impact**: Neutral — prevents nonsensical assignments but does not change outcomes at current OOB.
- **Files**: `src/sim/combat/brigade_assignment.ts`
- **Commit**: `8b0d3aa0`

### P3: MAX_REDISTRIBUTION_DISTANCE too low (FIXED)

- **Problem**: `MAX_REDISTRIBUTION_DISTANCE=8` in `brigade_front_distribution.ts` capped how far a rear brigade could column-march toward the front. Brigades more than 8 hops away were permanently stuck in the rear. Hidden blocker: `bfsDistance()` in `sector_utils.ts` had an internal `maxDepth=10` cap that was the true bottleneck — raising the outer constant alone would have been a no-op.
- **Solution**: Raised both `MAX_REDISTRIBUTION_DISTANCE` (8 to 20) and `bfsDistance()` `maxDepth` (10 to 20).
- **Calibration impact**: +0.4pp — previously-stranded brigades now reach the front.
- **Files**: `src/sim/combat/brigade_front_distribution.ts`, `src/sim/combat/sector_utils.ts`
- **Commit**: `8b0d3aa0`

### P4: Silent brigade drops in Phase 2 surplus (FIXED)

- **Problem**: Phase 2 surplus allocation in `brigade_assignment.ts` silently dropped brigades when `reachable.length === 0`. The brigade was skipped with no logging, no fallback, no error — it vanished from sector assignment entirely.
- **Solution**: Added fallback path: when no reachable sector exists, force-assign cross-component to best available sector with `console.warn`.
- **Calibration impact**: -0.4pp — brigades previously invisible to the sector system are now tracked and assigned.
- **Files**: `src/sim/combat/brigade_assignment.ts`
- **Commit**: `8b0d3aa0`

### P5: Posavina brigades teleporting to Mostar (FIXED)

- **Problem**: When the Posavina Corridor pocket falls to VRS (historically June-October 1992), the 103rd Derventa and 104th Bosanski Brod brigades were force-assigned to distant sectors (typically Mostar, ~200km away) because their home OSIDs were captured and `findEmergencyRetreatOsid` fell through home_osid, fallback_osid, corps HQ to "any friendly OSID."
- **Solution**: Tagged both brigades as `pocket_destroyable: true` in OOB data. When their pocket falls, they dissolve (personnel to strategic reserve at 50% retention) instead of teleporting.
- **Files**: `data/source/oob_brigades.json`, `src/sim/combat/brigade_assignment.ts`, `src/sim/combat/corps_front_sectors.ts`
- **Commit**: `cbf186b3`

---

## Operations Layer

### P6: Infinite probe loop (FIXED)

- **Problem**: `consecutive_probes` counter in `sector_offensive.ts` was reset on ALL operation completions, including probes themselves. The counter never reached `MAX=2` to force a full operation — every probe completion reset the counter, allowing infinite probe cycling.
- **Solution**: Only reset `consecutive_probes` on non-probe operation completion.
- **Files**: `src/sim/combat/sector_offensive.ts`
- **Commit**: `cbf186b3`

### P7: Zombie operation types (FIXED)

- **Problem**: `general_offensive` and `strategic_defense` operation types have no execution logic in the operations pipeline. Operations created with these types consumed corps slots without producing any battles — they were zombie ops.
- **Solution**: Coerce both types to `sector_attack` at creation time in `bot_corps_operations.ts`.
- **Files**: `src/sim/combat/bot_corps_operations.ts`
- **Commit**: `aac68902`

### P8: Paramilitary pipeline ordering (FIXED)

- **Problem**: `consolidate-rear-pockets` ran after `paramilitary-advance` in `war_phases.ts`. This caused 3 of 58 paramilitary missions (5.2%) to fail because the pocket they were operating in was consolidated before they completed their advance.
- **Solution**: Swapped order so `paramilitary-advance` runs before `consolidate-rear-pockets`.
- **Files**: `src/sim/turn_phases/war_phases.ts`
- **Commit**: `cbf186b3`

### P9: Zero eligible attackers in ad-hoc ops (FIXED)

- **Problem**: Planning duration too short for brigade march — operations plan for 1-2 turns, but brigades are 3-4 hops from the staging area. Execution begins before brigades arrive, producing operations with zero eligible attackers.
- **Solution**: (1) Extended `computePlanningDuration()` by estimated march time from furthest assigned brigade. (2) Enforced 60% assembly gate in `force_staging` phase — operation does not transition to execution until 60% of assigned brigades are at staging OSIDs.
- **Files**: `src/sim/combat/sector_offensive.ts`, `src/sim/combat/operation_preparation.ts`
- **Commit**: `4ec1794e`

### P10: Ad-hoc ops too small (PROPOSED — design discussion needed)

- **Problem**: Three architectural constraints cap ad-hoc operations at trivial scale: (1) Probe/feint HQ override caps all ad-hoc ops at 2-3 brigades. (2) `evaluateCorpsOffensiveLaunch` always creates exactly 1 axis (single line of advance). (3) `OBJECTIVES_PER_BRIGADE=0.5` means 2 brigades get only 1 objective.
- **Solution**: Game Designer recommends restoring a two-tiered model — distinguish tactical probes (2-3 brigades, limited objectives) from corps offensives (6+ brigades, multi-axis, deeper objectives). Requires design decision on scope boundaries before implementation.
- **Files to modify**: `src/sim/combat/bot_corps_directives.ts`, `src/sim/combat/bot_corps_operations.ts`, `src/sim/combat/sector_offensive.ts`
- **Estimated LOC**: ~150-250 (significant architectural change)

---

## Intelligence Layer

### P11: Intel decay crushing awareness (FIXED)

- **Problem**: RBiH intel buildup rate is 0.06 per turn but decay is 0.10 per turn, producing a net loss of -0.04/turn. All factions fall below intel thresholds by w40, meaning no faction has meaningful awareness of enemy dispositions.
- **Solution**: Raised RBiH buildup to 0.12, RS/HRHB to 0.08. This produces net positive awareness growth for active sectors.
- **Files**: `src/sim/combat/sector_intel_constants.ts`
- **Commit**: `afb44d1e`

### P12: OPSEC dead code (FIXED)

- **Problem**: `opsec_sectors` array is read (checked during intel calculations) but never written to. No operation ever gets OPSEC protection because nothing pushes sector IDs into the array.
- **Solution**: Pushed `sector_id` to `opsec_sectors[]` when an operation enters the planning phase.
- **Files**: `src/sim/combat/pre_planned_operations.ts`, `src/sim/combat/sector_offensive.ts`
- **Commit**: `c508ce2d`

### P13: Operation detection one-sided (FIXED)

- **Problem**: Defenders cannot detect enemy attacks during planning and concentration phases. Only probe execution triggers counter-intelligence. An entire corps can assemble for a major offensive with zero warning to the defender.
- **Solution**: Added +0.10 confidence boost when an enemy sector has 2+ reserve brigades (concentration detection). This provides passive early warning without revealing exact operation plans.
- **Files**: `src/sim/combat/sector_intel.ts`
- **Commit**: `5df45a67`

---

## Data Layer

### P14: Data silos — no join keys (FIXED)

- **Problem**: Battle data, operation data, casualty data, and territory data are tracked independently in separate state structures. There are no foreign keys between them — you cannot query "which battles did operation X produce?" or "which operation caused this territory flip?" This makes post-run analysis and debugging extremely difficult.
- **Solution**: Added deterministic `battle_id` (format: `{turn}:{osid}:{attacker}:{defender}`) to `WeeklyBattleEntry`, `ControlEvent`, and `BrigadeEngagement`. Added `operation_id` field to battle records. All fields optional for backward compatibility.
- **Files**: `src/scenario/scenario_reporting.ts`, `src/state/game_state.ts`, `src/sim/combat/brigade_history.ts`, `src/sim/combat/attack_resolution_osid.ts`
- **Commit**: `807aaf6b`

---

## Combat Layer

### P15: Friction invisible in brigade history (FIXED)

- **Problem**: Frontline attrition silently subtracts personnel each turn without creating engagement records. A brigade can lose 200 personnel over 10 weeks with zero engagements in its history. This makes brigade losses appear to come from nowhere when reviewing save files.
- **Solution**: When attrition casualties exceed a threshold (~20 personnel), deterministic random probabilistically creates a skirmish `BrigadeEngagement` record. Variable by turn — some weeks quiet, some notable. Also added to `turn_summaries` for weekly reporting.
- **Files**: `src/sim/combat/frontline_attrition.ts`, `src/sim/combat/brigade_history_recorder.ts`
- **Commit**: `05aad412`

### P16: Strategic reserve dead (DIAGNOSED — no fix proposed yet)

- **Problem**: All three factions show 0 manpower in strategic reserve at w40. Municipality pools are depleted. Brigades are locked to their `origin_mun` with no mechanism for cross-municipality reinforcement or rotation. Depleted brigades cannot be replenished from other areas.
- **Status**: Needs deeper investigation into the pool/reserve lifecycle — specifically why municipality pools drain to zero and whether the strategic reserve collection pipeline is functioning.
- **Key question**: Is the collection pipeline failing to move manpower into the reserve, or is the reserve being drained faster than it fills?

### P17: ARBiH 4th Corps 80% combat ineffective (DIAGNOSED)

- **Problem**: 8 of 10 brigades in the ARBiH 4th Corps (Neretva) are below 400 personnel at w40. The entire corps is effectively combat-destroyed. This is likely downstream of multiple upstream issues: low battle tempo means no victories to boost morale, pool depletion means no reinforcements, and the Neretva front faces strong VRS Herzegovina Corps.
- **Status**: Likely improves as upstream fixes land (probe loop fix, assembly gate, intel awareness). No independent fix proposed — monitor after P6/P9/P11 are resolved.

---

## Anomaly Detection

### P18: Anomaly detector built (FIXED)

- **Architecture**: 10 automated checks in `src/scenario/anomaly_detector.ts` (414 lines), with types in `src/scenario/anomaly_types.ts`. Entry point: `runAnomalyDetection(state: GameState): AnomalyReport[]`. Integration test: `tests/integration_anomaly.test.ts`.
- **Checks**: battle_tempo_floor (critical), outcome_distribution_skew (warning), zero_personnel_active (critical), brigade_never_fights (warning), unlocated_formations (warning), osid_seesawing (warning), operation_stagnation (warning), empty_contested_sector (warning), corps_out_of_area (info), casualty_ratio_check (info).
- **Current warnings at w40**: outcome_distribution_skew (87% decisive victories), brigade_never_fights (184 brigades), osid_seesawing (1 OSID), empty_contested_sector (6 sectors). Zero critical anomalies.
- **Commit**: `6e5166d7`

---

## Design Decisions Made

### D1: Battle definition (DECIDED)

- A "battle" = 50 or more total casualties at one OSID in one turn.
- Target throughput: 150-250 battles per 40 weeks.
- To be recalibrated after friction layer implementation (P15).

### D2: Calibration golden rule (DECIDED)

- Calibration percentage means nothing if reached through broken mechanics. A high number with broken mechanics is a lie; a lower number with correct mechanics is a foundation.
- Fix mechanics first. The number follows.
- Added to life lessons: `docs/life_lessons/calibration.md`.

---

## Summary Table

| ID | Layer | Status | Commit |
|----|-------|--------|--------|
| P1 | Deployment | FIXED | `8b0d3aa0` |
| P2 | Deployment | FIXED | `8b0d3aa0` |
| P3 | Deployment | FIXED | `8b0d3aa0` |
| P4 | Deployment | FIXED | `8b0d3aa0` |
| P5 | Deployment | FIXED | `cbf186b3` |
| P6 | Operations | FIXED | `cbf186b3` |
| P7 | Operations | FIXED | `aac68902` |
| P8 | Operations | FIXED | `cbf186b3` |
| P9 | Operations | FIXED | `4ec1794e` |
| P10 | Operations | PROPOSED | -- |
| P11 | Intelligence | FIXED | `afb44d1e` |
| P12 | Intelligence | FIXED | `c508ce2d` |
| P13 | Intelligence | FIXED | `5df45a67` |
| P14 | Data | FIXED | `807aaf6b` |
| P15 | Combat | FIXED | `05aad412` |
| P16 | Combat | DIAGNOSED | -- |
| P17 | Combat | DIAGNOSED | -- |
| P18 | Anomaly | FIXED | `6e5166d7` |

**Totals**: 16 FIXED, 1 PROPOSED (P10), 2 DIAGNOSED (P16, P17)
