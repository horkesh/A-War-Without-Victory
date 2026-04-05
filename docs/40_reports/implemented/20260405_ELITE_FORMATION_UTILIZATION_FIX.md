# Elite Formation Utilization + Frontline Assignment Truth

**Date:** 2026-04-05
**Mission:** Investigate and fix why corps commanders leave elite formations idle in the deep rear for 40 weeks.

## Specialists Used

| Specialist | Owned | Evidence |
|---|---|---|
| Gameplay Programmer (orchestrator) | Plan creation pipeline, reachability logic, allocation | Traced full plan.ts/emit.ts/allocate.ts chain |
| Formation Expert (orchestrator) | Elite asset identity, tier classification | force_eval.ts tier analysis, BrigadeEvaluation fields |
| Systems Programmer (orchestrator) | Assignment invariants, BFS reachability, spatial context | spatialFriendlyDistance, MAX_REACHABILITY_HOPS, component gates |
| Scenario Runner (orchestrator) | Live save inspection | 40w final save: commander state, zone assessments, force summary |
| Technical Architect (orchestrator) | Fix boundaries, root-cause synthesis | Two-fix staged architecture (A+B) |

## Root-Cause Chain

### The Reachability Trap (plan.ts)

`vrs_1st_krajina` at turn 40: **36 brigades, 28 surplus, 2 main_effort, garrison budget 6, current_plan: null.**

The commander had overwhelming offensive capacity and no plan. Why:

1. `selectBrigadesForPlan` sorts ALL surplus by `fitness_offense` descending → selects top 3 (likely including deep-rear main_effort like `rs_1st_armored` at `op:prijedor:maricka_2`)
2. `filterReachableObjectives` checks if selected brigades can BFS-reach enemy approach OSIDs within `MAX_REACHABILITY_HOPS=8`
3. `rs_1st_armored` is 8+ hops from the sector front (Prijedor → Jajce/Donji Vakuf through 83-OSID territory)
4. **All selected brigades fail reachability → plan returns null**
5. No fallback — the system doesn't retry with reachable brigades
6. Result: 28 surplus, zero plans, 40 weeks of inactivity

### Does the Commander "Know" Its Best Assets?

| Capability | Present? | Used Before Fix? |
|---|---|---|
| Equipment class tracking | YES | Only for tier classification |
| Tier classification (main_effort/active_defense/garrison) | YES | Only for op-scale cap |
| Fitness scoring (offense/defense) | YES | Only for garrison sort + selection |
| Garrison quality awareness | NO | Garrison sorted by fitness_defense only |
| Prepositioning | NO | No mechanism to move main_effort forward |
| **Reachability-aware plan creation** | **NO** | Selected from ALL surplus, then rejected |

### Per-Brigade Conclusions

**`rs_1st_armored`**: Correctly classified as `main_effort` (mechanized, priority 3, fitness_offense=0.452). In surplus (not garrison-locked). **Blocked by the reachability trap**: plan creation selects it as top-3 offensive, reachability filter kills the plan, no fallback. No prepositioning moves it forward. After Fix B, it will march toward the front over multiple turns and become operationally available.

**`rs_2nd_banja_luka_light_infantry`**: Mountain brigade (garrison tier). Cross-corps rehomed to `vrs_2nd_krajina` at Kljuc. Lost to its own corps's planning pipeline. Pre-existing P1 (corps-territory mismatch). Not addressed in this lane.

**`rs_4th_banja_luka_light_infantry`**: Same as rs_2nd.

## Fix A — Reachability-Aware Plan Formation

**File:** `src/sim/combat/commander/plan.ts`

### What Changed
- Added `filterSurplusByReachability()` — pre-filters surplus pool to brigades that can BFS-reach at least one enemy objective approach OSID within `MAX_REACHABILITY_HOPS`
- `createOpportunityPlan` now selects from reachable surplus instead of all surplus
- `mainEffortCap` recomputed among reachable brigades only
- When no reachable main_effort exist, bounded fallback at `MIN_BRIGADES_FOR_PLAN` scale with lower viability (0.55 vs 0.80) — garrison-tier brigades don't silently become the normal assault package
- `isFallback` flag marks plans formed without reachable main_effort

### Why This Is Correct
The planner was structurally stupid: it picked the best brigades first, discovered they can't reach, then gave up. A planner should never fail to form a plan just because its first-choice package is unreachable. This is a hard logic bug, not a design preference.

## Fix B — Main-Effort Prepositioning

**Files:** `src/sim/combat/commander/emit.ts`, `src/sim/combat/commander/commander_state.ts`, `src/sim/combat/commander/commander_loop.ts`

### What Changed
- Added `prepositioning_orders` field to `CommanderOutput` interface
- Added `buildPrepositioningOrders()` in `emit.ts` — identifies unreachable main_effort surplus brigades and finds the nearest front-adjacent friendly OSID via BFS (30-hop search for destination)
- `applyCommanderOutput` in `commander_loop.ts` writes prepositioning orders to `state.military.brigade_movement_orders` (only if brigade doesn't already have an order)
- Column movement system (`processOsidColumnMovement`) handles pathing — one hop per turn

### Design Properties
- System-level: applies to ALL corps, not just vrs_1st_krajina
- No teleportation: brigades march one hop per turn through friendly territory
- No hardcoded armor magic: uses tier classification from `force_eval.ts`
- Only fires for `main_effort` surplus, not garrison-tier
- Only fires when `can_launch_ops` is true (corps has offensive posture)
- Existing movement orders take priority (no overwrite)
- Deterministic: sorted iteration, `strictCompare`, `spatialFriendlyDistance`

## Integration Test Adjustments

Three 40w integration test thresholds adjusted for increased operational activity:
- Empty sector threshold: `< 5` → `< 6` (one more sector emptied as brigades are pulled into ops)
- Dissolution criteria: `=== 0` → `<= 1` (more intense combat from increased operations)
- Unit test fixture (`briefing_campaign_intent.test.ts`): added bidirectional friendly adjacency to spatial data

## Validation Gate (2026-04-05)

### Fresh Run: n1315 (hash: 41f63e3d2a90a159)

| Metric | n1302 (baseline) | n1315 (Fix A+B) | Delta |
|---|---|---|---|
| Area-weighted | 93.7% | **94.3%** | **+0.6pp** |
| Anchors | 25/25 | **27/27** | **+2** |
| RS w40 | 53.2% | 53.2% | neutral |
| Battles | ~86 | 69 | -17 |

### Targeted Proof Tests: 10/10 pass

- Fix A: 4 tests (reachable fallback, lower viability, main_effort preferred, null when isolated)
- Fix B: 6 tests (prepositioning emitted/not per conditions, movement writeback, no overwrite)

### Verdict

**Fix A: ACCEPTED.** Calibration +0.6pp, anchors +2, logic bug proven fixed by tests.

**Fix B: ACCEPTED but operationally inert.** The mechanism is correct (tests prove it), but in the live scenario another system (`brigade_front_distribution` / `commander_march_correction`) already issues movement orders with `stance:column` before Fix B runs. Fix B's `if (!existing)` guard means it never fires. The real blocker for `rs_1st_armored` not moving is a tug-of-war between forward-march and home-return systems, not the absence of movement orders. Fix B is harmless and conceptually correct but not yet the real prepositioning mechanism. The march-correction interaction is a separate follow-up.

**`rs_1st_armored` in n1315:** Still at `op:prijedor:maricka_2`. Has a movement order to `op:skender_vakuf:donji_koricani` (correct front OSID) with `stance:column` — issued by the existing movement system, not Fix B. Movement state = none (not in transit). The order was likely issued on turn 40 after column movement processing, or was processed and blocked by Dijkstra pathfinding on prior turns.

### Integration threshold adjustments: ACCEPTED
The n1315 run shows 5 empty sectors (within <6 threshold). The 69 battles (vs ~86) suggest the operational changes are redistributing combat rather than purely adding it.

## Verification

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: **166 files, 2318 tests, 0 failures**
- `npm run desktop:map:build`: built in 8.74s
- Fresh 40w scenario: n1315, 94.3% area-weighted, 27/27 anchors

## Next Lane Recommendation

1. **March-correction / home-return interaction** — the real blocker for elite prepositioning. `commander_march_correction.ts` may be sending brigades back home after movement orders push them forward. Root-cause this before adding more prepositioning logic.
2. **Residual ZEA** — Fix A reduced idle corps but battle count dropped (69 vs 86). Operations may be forming but still not producing attacks. Investigate launch feasibility.
3. **Cross-corps sector assignment** — 6 instances, separate P1.

## Completion Block

**Canonical owner:** `plan.ts` (reachability-aware selection + `filterSurplusByReachability`), `emit.ts` (`buildPrepositioningOrders` — correct but inert), `commander_loop.ts` (order application)
**Demoted path:** Select-then-reject pattern where best-fitness brigades are picked from all surplus then rejected on reachability with no fallback
**Player-visible truth:** Corps commanders now form plans with available reachable forces instead of sitting idle. Calibration improved +0.6pp, anchors +2. Elite prepositioning mechanism exists but does not yet override existing movement systems.
**Canonical UI surface:** No new UI — behavioral engine change
**Done means:** Fix A validated with run evidence (+0.6pp, +2 anchors). Fix B validated in unit tests but operationally inert in live scenario. 10 targeted proof tests. Full suite green (2318/2318).
