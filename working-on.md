# Working On — Session 2026-03-29 (Nightshift)

## Completed This Session (8 commits on main)

### SpatialContext Shared Spatial Layer (Phases 0-4)
- `src/sim/spatial_context.ts` — interface, computeSpatialContext(), convenience queries
- 22 buildOsidAdjacency calls → 1 per turn. All systems read from cache.
- Design spec: `docs/30_planning/SPATIAL_CONTEXT_DESIGN_SPEC.md`
- Remaining Phases 5-7 (paramilitaries, supply, events) are low-priority backward-compatible.

### P0: Corps Launch Feasibility Check
- `checkLaunchFeasibility` in sector_offensive.ts gates op creation
- Rejects ops where no objective achievable at costly_victory

### P0: Ops Reevaluation on Brigade Loss
- `reevaluateWeakenedOperations` pipeline step (after advance-sector-offensives)
- Aborts degenerate ops: 0 brigades, below type minimum, personnel <50% initial
- `reevaluation_log` on operations for diagnostics

### P1: Emergency Retreat Reachability
- Component-based reachability check before home_osid/fallback_osid/corps_HQ
- Friendly-only BFS (was raw adjacency)
- 7-step fallback: home → fallback → BFS friendly → corps HQ → same component → largest component → any
- 4 new tests in emergency_retreat_reachability.test.ts

### P1: Phantom Defender Fix
- Non-sector defense paths: co-located defenders share casualties proportionally by personnel
- Was: primary-only takes damage, secondaries = free power

### P1: bfsDistance Friendly-Only
- sector_utils.ts bfsDistance accepts friendlyOsids filter
- brigade_front_distribution.ts and subsegment_assignment.ts pass faction's friendly set

### P2: Multi-Brigade Main/Support Operations
- assignBrigadeRoles: highest basePower = MAIN, rest = SUPPORT
- SUPPORT_POWER_MULT = 0.70, SUPPORT_CASUALTY_MULT = 0.40
- isSupportBrigadeOnActiveOp checked during combat resolution
- Pre-planned and triggered operations also assign roles

### Gap Finder Agent Created
- `.claude/skills/gap-finder/SKILL.md` — design intent oracle
- 13 expert questions generated, bugs confirmed, design gaps identified

## Calibration Results
- **n1203 (pre-multi-brigade): 92.1%** area-weighted, consistency PASS
- **n1204 (all changes): 90.9%** area-weighted, consistency PASS
- Expert panel reports pending (war-or-game, scenario tester, ops expert dispatched)

## Remaining Open Items (from gap finder)
- P2: Attack-through stall counter false positive on multi-objective ops
- P2: Narrow-front case (≤1 friendly adjacent) should skip repositioning
- P2: Reinforcement paths skip corridor safety check
- P2: Sectors stale after combat (once/turn rebuild)
- Remaining SpatialContext Phases 5-7 (low priority)
