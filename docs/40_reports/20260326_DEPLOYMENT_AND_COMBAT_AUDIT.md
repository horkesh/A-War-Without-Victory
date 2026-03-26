# Deployment & Combat Audit — 2026-03-26

## Session Summary

Four deployment-level mechanical bugs were discovered and fixed, an automated anomaly detector was built (10 checks), and deep investigations were conducted into battle tempo, operations architecture, casualty mechanics, and troop strengths. The session established a golden rule for calibration work: **calibration % means nothing if reached through broken mechanics**. Net calibration moved from 91.7% to 91.4% — a regression in number but an advance in correctness. Three commits landed on main; two additional changes (paramilitary pipeline swap, Posavina pocket dissolution) are implemented but not yet committed.

---

## Part 1: Deployment Fixes (Completed & Committed)

**Commit:** `8b0d3aa0` — `fix(deployment): 4 mechanical fixes — corps assignment, reachability, distribution, silent drops`

### Fix 1: rs_2nd_romanija_brigade Corps Assignment

- **Root cause:** `rs_2nd_romanija_brigade` was assigned to `vrs_drina` in `data/source/oob_brigades.json`, but the brigade is homed in Sokolac — a Sarajevo-Romanija Corps (SRK) municipality. The wrong corps assignment caused BFS territory mapping (`mapOsidsToCorps`) to assign Sokolac and adjacent Sarajevo ring OSIDs to the Drina Corps, which then attempted to operate in the Sarajevo siege zone.
- **Impact:** Drina Corps was claiming Sarajevo ring territory via BFS seeding from an incorrectly-assigned brigade. This distorted both SRK and Drina sector boundaries.
- **Fix:** Changed `corps_id` from `vrs_drina` to `vrs_sarajevo_romanija` in OOB data. Removed the brigade from Operation Podrinje Sweep (`pre_planned_operations.ts`), which is a Drina Corps operation.
- **Files:** `data/source/oob_brigades.json`, `src/sim/combat/pre_planned_operations.ts`
- **Calibration impact:** Primary contributor to the -0.3pp regression (91.7% to 91.4%), because Drina Corps can no longer project force into the Sarajevo ring.

### Fix 2: Step 6b Component Reachability Guard

- **Root cause:** Cross-corps enclave defense (Step 6b in `brigade_assignment.ts`) assigned brigades to sectors without checking BFS component reachability. A brigade in one connected component could be assigned to a sector in another, unreachable component.
- **Fix:** Added a component membership check before assignment, matching the pattern already used in Step 7 (`ensureMinimumSectorCoverage`).
- **Files:** `src/sim/combat/brigade_assignment.ts`
- **Calibration impact:** Neutral — the guard prevents nonsensical assignments but does not change outcomes at current OOB.

### Fix 3: MAX_REDISTRIBUTION_DISTANCE 8 to 20

- **Root cause:** `MAX_REDISTRIBUTION_DISTANCE=8` in `brigade_front_distribution.ts` capped how far a rear brigade could column-march toward the front. Brigades more than 8 hops away were silently stuck in the rear forever.
- **Hidden blocker:** Even raising the constant would have been a no-op because `bfsDistance()` in `sector_utils.ts` had an internal `maxDepth=10` that capped BFS traversal. This was the true bottleneck — the outer constant was downstream of a tighter inner limit.
- **Fix:** Raised both `MAX_REDISTRIBUTION_DISTANCE` (8 to 20) and `bfsDistance()` `maxDepth` (10 to 20).
- **Files:** `src/sim/combat/brigade_front_distribution.ts`, `src/sim/combat/sector_utils.ts`
- **Calibration impact:** +0.4pp — previously-stranded brigades now reach the front and participate in combat.

### Fix 4: Silent Brigade Drops Fallback

- **Root cause:** Phase 2 surplus allocation in `brigade_assignment.ts` silently dropped brigades when `reachable.length === 0`. The brigade was simply skipped with no logging, no fallback, and no error. It vanished from sector assignment entirely.
- **Fix:** Added a fallback path: when no reachable sector exists, force-assign the brigade cross-component to the best available sector, with a `console.warn` so the anomaly is visible in logs.
- **Files:** `src/sim/combat/brigade_assignment.ts`
- **Calibration impact:** -0.4pp — brigades that were previously invisible to the sector system are now tracked and assigned, which slightly disrupts the balance that had formed around their absence.

### Net Calibration Result

91.7% to 91.4% (net -0.3pp). The regression is expected and correct: the previous 91.7% was inflated by broken mechanics (Drina Corps projecting into Sarajevo, brigades silently dropped, brigades permanently stuck in rear). The 91.4% reflects a mechanically sound deployment pipeline.

**Golden rule established:** Calibration percentage is an indicator, not a decision criterion. A high number with broken mechanics is a lie; a lower number with correct mechanics is a foundation.

---

## Part 2: Anomaly Detector (Committed)

**Commit:** `6e5166d7` — `feat(harness): add post-run anomaly detector — 10 automated checks`

### Architecture

- **File:** `src/scenario/anomaly_detector.ts` (414 lines)
- **Types:** `src/scenario/anomaly_types.ts` (AnomalyReport interface)
- **Entry point:** `runAnomalyDetection(state: GameState): AnomalyReport[]`
- **Integration test:** `tests/integration_anomaly.test.ts` — runs 40w scenario, asserts zero critical anomalies

### The 10 Checks

| # | Type | Severity | What It Catches |
|---|------|----------|----------------|
| 1 | `battle_tempo_floor` | critical | Average < 1 battle/week across the run |
| 2 | `outcome_distribution_skew` | warning | > 70% of battles are decisive_victory |
| 3 | `zero_personnel_active` | critical | Active formation with 0 personnel |
| 4 | `brigade_never_fights` | warning | Active brigade with 0 battles after 10+ turns |
| 5 | `unlocated_formations` | warning | Active brigade with no `location_osid` |
| 6 | `osid_seesawing` | warning | OSID flips faction control 3+ times |
| 7 | `operation_stagnation` | warning | Operation in execution 4+ turns with 0 attack attempts |
| 8 | `empty_contested_sector` | warning | Sector with front edges but 0 assigned brigades |
| 9 | `corps_out_of_area` | info | > 50% of a corps' brigades outside home municipality |
| 10 | `casualty_ratio_check` | info | Reports attacker vs. defender casualty totals |

### Current Warnings at w40

The integration test passes (zero critical anomalies). Current warnings:

- **outcome_distribution_skew:** 87% of battles are decisive_victory (threshold: 70%). Indicates combat may be too one-sided — likely driven by VRS equipment advantage and bombardment multipliers.
- **brigade_never_fights:** 184 active brigades have 0 battles after 40 turns. Many of these are rear-area, reserve, or recently-mobilized formations, but the count warrants investigation.
- **osid_seesawing:** 1 OSID flipped control 3+ times. Localized territorial instability.
- **empty_contested_sector:** 6 sectors have front edges but 0 assigned or reserve brigades. These are gaps in the defensive line.

### Design Principles

- Deterministic: sorted iteration via `strictCompare`, no `Math.random()`, no timestamps
- Pure functions: each detector takes `GameState`, returns `AnomalyReport[]`
- Composable: new detectors can be added to the array without changing the runner
- Severity hierarchy: `critical` (blocks deployment health), `warning` (needs investigation), `info` (situational awareness)

---

## Part 3: Paramilitary System (Investigated)

Investigation into whether paramilitaries were spawning but never dissolving ("limbo" formations):

- **Finding:** 58 paramilitaries properly spawned and dissolved across the 40-week run. None are stuck in limbo.
- **Mission success rate:** 94.8% — paramilitaries accomplish their assigned missions before dissolution.
- **Pipeline ordering bug discovered:** `consolidate-rear-pockets` runs after `paramilitary-advance` in `war_phases.ts`. This means 3 of 58 paramilitary missions fail because the pocket they are operating in gets consolidated before they complete their advance.
- **Fix:** Swap the order so `paramilitary-advance` runs before `consolidate-rear-pockets`.
- **Status:** Implemented in `war_phases.ts`, **not committed**.

---

## Part 4: Posavina Pocket Dissolution (Implemented, Not Committed)

When the Posavina Corridor pocket falls to VRS (historically June-October 1992), two ARBiH brigades — the 103rd Derventa and 104th Bosanski Brod — were being force-assigned to distant sectors (typically Mostar) because their home OSIDs were captured and no local friendly territory remained.

- **Root cause:** The fallback assignment logic (`findEmergencyRetreatOsid`) falls through home_osid, fallback_osid, corps HQ, and eventually lands on any friendly OSID — which can be hundreds of kilometers away.
- **Fix:** Tag both brigades as `pocket_destroyable: true` in OOB data. When their pocket falls, they dissolve (personnel to strategic reserve at 50% retention) instead of teleporting.
- **Files changed:** `data/source/oob_brigades.json`, `src/sim/combat/brigade_assignment.ts` (dissolution check), `src/sim/combat/brigade_dissolution.ts` (pocket dissolution path)
- **Scope:** ~40 lines across 3 files.
- **Status:** Implemented, **not committed**.

---

## Part 5: Operation System Deep Dive

### Preplanned Operations

- 14 preplanned operations defined in `pre_planned_operations.ts`
- **All 14 fired** at their scheduled turns
- **All 14 produced battles** — 100% launch rate
- Operations include: Podrinje Sweep, Corridor 92, Jajce, Cerska-Kamenica, Bihac Counteroffensive, and others

### Triggered Operations

- 4 event-triggered operations
- **All 4 accepted and fired** when their trigger conditions were met

### Ad-Hoc Corps-Generated Operations

- ~15 ad-hoc operations generated by `evaluateCorpsOffensiveLaunch` in `bot_corps_directives.ts` (line 1860)
- Examples: Operacija Neretva, Nada, Gazija, and others
- These are smaller and produce fewer battles than preplanned operations

### Why Ad-Hoc Operations Are Small

Analysis identified three architectural constraints:

1. **Probe/feint HQ override caps:** Probe operations capped at 2 brigades, feint at 3. Most ad-hoc operations are probes.
2. **Single-axis architecture:** `evaluateCorpsOffensiveLaunch` (line 1530) always creates exactly 1 axis, limiting the operation to a single line of advance.
3. **OBJECTIVES_PER_BRIGADE = 0.5:** With 2 brigades, the operation gets only 1 objective. This mechanically limits how much territory can be contested.

### Why Battles Per Operation Are Low

Two complementary bottlenecks identified:

1. **Zero-progress abort:** After 3 consecutive failures with 0 OSID captures, the operation aborts early (`MAX_TOTAL_FAILURES=5`, `MAX_CONSECUTIVE_FAILURES_ON_CURRENT=3`).
2. **Target adjacency gate:** 9 corps cannot find reachable targets (`reachableTargets` is empty). Without adjacent enemy OSIDs that pass the prediction threshold, the corps cannot generate attack orders.
3. **Prediction threshold:** `min_attack_outcome='stalemate'` requires a predicted power ratio of 0.7 or better. Marginal attacks are blocked.
4. **No tactical friction system:** Every attack requires the full operation lifecycle (plan, prepare, execute, assess). There is no mechanism for skirmishes, raids, or opportunistic engagements outside of operations.

### Expert Contradiction

The Operations Expert identified probe/feint caps as the primary bottleneck (operations are too small to achieve anything). The Gameplay Programmer identified target adjacency as the primary bottleneck (corps cannot find targets to attack at all). Both analyses may be correct at different stages: adjacency limits whether an operation launches, and caps limit what it can accomplish if it does.

---

## Part 6: Casualty Mechanics (Investigated)

### Observation

Attacker-to-defender casualty ratio at w40 is approximately 0.33:1 — **defenders take 3x more casualties than attackers**. This is the inverse of the conventional military wisdom (attackers typically suffer more).

### Root Cause Analysis

This is not a bug. The inversion is driven by three multiplicative systems:

1. **VRS equipment advantage:** Bombardment multiplier can reach 2.2x for equipment-heavy attackers (VRS has substantial artillery and armor inherited from JNA). Applied to attacker combat power before resolution.
2. **Power-ratio casualty scaling:** Cube-root exponent (0.33) applied to defender casualties via `getPowerRatioCasualtyMult()`. When attackers have 3:1 power advantage, defenders take `3^0.33 = 1.44x` casualties. Range: 0.4x to 2.0x (`POWER_RATIO_CASUALTY_MAX`).
3. **Outcome modifiers:** Decisive victory (87% of outcomes) applies heavy casualty modifiers to the losing side (defender in most VRS attacks).

### Base Rates

- `BASE_ATTACKER_CASUALTY_RATE = 0.08` (8% of engaged personnel)
- `BASE_DEFENDER_CASUALTY_RATE = 0.06` (6% of engaged personnel)
- Base rates slightly favor the defender, but the multiplier stack inverts this for equipment-dominant factions.

### Assessment

The casualty ratio reflects VRS's historical equipment superiority (inherited JNA arsenal vs. arms-embargoed ARBiH). However, a 3:1 defender-casualty ratio is extreme and should be validated against historical data. A Pyrrhic meeting was convened to evaluate whether the combined multiplier stack produces realistic aggregate losses.

---

## Part 7: Troop Strengths (Verified)

### Active Brigade Personnel at w40

| Faction | Active Personnel | Historical Target |
|---------|-----------------|-------------------|
| RBiH (ARBiH) | 139,000 | ~150,000-200,000 |
| RS (VRS) | 100,000 | ~80,000-100,000 |
| HRHB (HVO) | 41,000 | ~40,000-50,000 |

### Force Balance

- **RS + HRHB = 141,000** vs. **RBiH = 139,000** — near parity at the brigade level
- Including strategic reserve pools: **RBiH 172,000** vs. **RS + HRHB 166,000** — RBiH slightly dominant in total mobilizable strength

### Mobilization Scales (Current)

| Faction | Scale | Notes |
|---------|-------|-------|
| RBiH | 0.09 | Updated from stale 0.10 in MEMORY |
| RS | 0.04 | Updated from stale 0.12 in MEMORY |
| HRHB | 0.12 | Updated from stale 0.29 in MEMORY |

These values have been stable since the March 25 calibration session. No regression from the deployment fixes.

---

## Part 8: Documentation & Propagation

### PROJECT_LEDGER.md

Updated with all 4 deployment fixes, file lists, and calibration impact.

### PROJECT_LEDGER_KNOWLEDGE.md

7 thematic entries added:

1. BFS component reachability pattern for sector assignment
2. Hidden inner caps in utility functions (bfsDistance maxDepth)
3. Silent pipeline drops as an anti-pattern
4. Corps assignment cascading through BFS territory mapping
5. Anomaly detector architecture and integration
6. Harness enforcement pattern (computed-but-untested diagnostics)
7. Golden rule for calibration work

### Life Lessons

3 new lessons added (142 total):

1. **Calibration golden rule** (`calibration.md`): Calibration % means nothing if reached through broken mechanics
2. **Hidden BFS caps** (`architecture.md`): When raising an outer constant has no effect, check inner caps in utility functions
3. **Silent pipeline drops** (`architecture.md`): Every branch that can skip an entity must either log or fallback — silent drops are invisible bugs

### Memory

- Golden rule saved to calibration context
- Stale mobilization scales corrected (RBiH 0.10 to 0.09, RS 0.12 to 0.04, HRHB 0.29 to 0.12)

### Napkin

Curated during session: test counts updated, night shift items cleared, v0.7.0 marked complete.

---

## Open Questions (Pyrrhic Meeting Convened)

1. **Should ad-hoc operations be bigger?** Probe/feint caps of 2-3 brigades may be too restrictive for corps with 8+ brigades. (Game Designer)
2. **Should tactical friction exist outside operations?** Currently every engagement requires a full operation lifecycle. Skirmishes, raids, and border friction have no mechanism. (Technical Architect)
3. **Is 54 battles in 40 weeks historically realistic?** The anomaly detector shows ~1.35 battles/week average. Historical data needed. (War-or-Game Arbiter + Historian)
4. **What is the target battle count for 40 weeks?** No canonical target exists. Experts need to establish one. (All)
5. **Is the 0.33:1 attacker:defender casualty ratio historically defensible?** VRS equipment advantage justifies inversion, but 3:1 may be too extreme. (Casualty Study + Historian)

---

## Pending Work (Not Committed)

| Item | File(s) | Status |
|------|---------|--------|
| Paramilitary pipeline swap | `src/sim/turn_phases/war_phases.ts` | Implemented, needs commit |
| Posavina pocket dissolution | `oob_brigades.json`, `brigade_assignment.ts`, `brigade_dissolution.ts` | Implemented, needs commit |
| Operation history `name=undefined` bug | Unknown source | Needs investigation |
| Data completeness audit | Cross-cutting | Agent running |

---

## Commits This Session

| Hash | Message | Key Changes |
|------|---------|-------------|
| `d6c8741d` | `chore: night shift — integration tests, OSID anchors, morning report` | 5 integration test suites, OSID anchor assertions |
| `8b0d3aa0` | `fix(deployment): 4 mechanical fixes — corps assignment, reachability, distribution, silent drops` | OOB fix, BFS guard, rear march distance, fallback assignment |
| `6e5166d7` | `feat(harness): add post-run anomaly detector — 10 automated checks` | 414-line detector, types, integration test |

---

## Key Files Modified

- `data/source/oob_brigades.json` — rs_2nd_romanija corps fix
- `src/sim/combat/brigade_assignment.ts` — Step 6b guard + Phase 2 fallback
- `src/sim/combat/brigade_front_distribution.ts` — MAX_REDISTRIBUTION_DISTANCE 8 to 20
- `src/sim/combat/sector_utils.ts` — bfsDistance maxDepth 10 to 20
- `src/sim/combat/pre_planned_operations.ts` — removed rs_2nd_romanija from Podrinje Sweep
- `src/scenario/anomaly_detector.ts` — 10-check anomaly detection system
- `src/scenario/anomaly_types.ts` — AnomalyReport interface
- `tests/integration_anomaly.test.ts` — anomaly integration test
- `docs/life_lessons/calibration.md` — golden rule
- `docs/life_lessons/architecture.md` — hidden caps, silent drops lessons
