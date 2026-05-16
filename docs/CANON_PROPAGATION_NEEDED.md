# Canon Propagation Needed (2026-03-28 Session 2)

These mechanical changes need to be reflected in canon docs. Use `/propagate-to-canon` to apply.

## 1. Supply filter change (Systems_Manual_v0_9_0.md §6.5)
- **Old**: "Brigades at critical supply are forced to defend (no voluntary attacks). At strained supply, min_attack_outcome is upgraded to 'victory'"
- **New**: Supply gate for operation pool: only `critical` excluded. `strained` brigades CAN participate in operations — 0.75× combat penalty models degraded effectiveness. The per-brigade strained gate (min_outcome upgrade to 'victory') still applies at brigade AI level.
- **Where**: Line 154, supply gating section

## 2. Counter-attack broadening (Systems_Manual_v0_9_0.md §6.5)
- **Old**: "Counter-attacks — brigades may retake a recently lost position (enabled by counterattack_window_turns > 0) without an active operation."
- **New**: Sector-wide counter-attacks: when ANY brigade in a sector retreats within 2 turns, other healthy brigades (personnel≥600, cohesion≥30, not disrupted) on that sector's front can counter-attack adjacent enemy OSIDs within 2 hops. Max 2 per sector per turn.
- **Where**: Line 213, counter-attack exception

## 3. Planning duration cap (Systems_Manual_v0_9_0.md §6.4)
- **New**: MAX_PLANNING_DURATION=4. Planning duration capped regardless of objective count.

## 4. Probe lifecycle (Systems_Manual_v0_9_0.md §6.4)
- **New**: evaluateOperationProgress() skips probe AND feint (not just sector_attack). Probes don't trigger theater cooldown (don't set last_completed_operation).
- **Where**: Line 150, "evaluateOperationProgress() skips sector_attack ops"

## 5. Casualty ratio fix (Systems_Manual_v0_9_0.md §5 or combat section)
- **New**: getPowerRatioCasualtyMult() bilateral scaling now fully applied. attCasMult multiplied into attacker casualty formula in both attack_resolution_osid.ts and combat_predictor.ts.

## 6. Exhaustion gate (Systems_Manual_v0_9_0.md §6.4)
- **New**: Corps with exhaustion > MAX_EXHAUSTION_FOR_OPERATION (30) cannot launch sector offensives. Probe threshold: 40.
- SECONDARY_OP_COOLDOWN_TURNS: 8→5

## 7. Territory reconciliation Phase 1.5 (Systems_Manual_v0_9_0.md §6.3 or sector section)
- **New**: classifyBrigadesByTerritory has Phase 1.5 between front-line (Phase 1) and BFS pool (Phase 2). Matches pooled brigades by location_osid vs territory_osids.

## 8. SpatialContext shared spatial layer (Systems_Manual_v0_9_0.md - new section needed)
- **New**: `SpatialContext` interface computed at 2 pipeline points (pre-combat after supply-osid, post-combat after resolve-attack-orders). Contains adjacency, sharedBoundaryAdjacency, friendlyOsidsByFaction, componentsByFaction, frontEdgesOsid. All pipeline consumers read from cache instead of rebuilding. 22→1 buildOsidAdjacency calls per turn.
- **File**: `src/sim/spatial_context.ts`

## 9. Corps launch feasibility (Systems_Manual_v0_9_0.md §6.4 operations section)
- **New**: `checkLaunchFeasibility` gates operation creation. Samples basePower ratio for each proposed objective. If no objective achievable at costly_victory (ratio >= 1.0), operation rejected.

## 10. Ops reevaluation on brigade loss (Systems_Manual_v0_9_0.md §6.4 operations section)
- **New**: `reevaluate-weakened-operations` pipeline step. After brigade mutations, checks each active op: 0 active brigades → abort, below type minimum (probe=1, sector_attack=2) → abort, personnel <50% of initial → abort. Recovery reason: `brigade_attrition` (1 turn).

## 11. Emergency retreat reachability (Systems_Manual_v0_9_0.md §6.9 retreat section)
- **Old**: findEmergencyRetreatOsid checks home_osid control only, BFS through raw adjacency.
- **New**: Connected component reachability check before home_osid/fallback_osid/corps_HQ. Friendly-only BFS (no traversing enemy territory). 7-step fallback: home → fallback → BFS friendly → corps HQ → same component → largest component → any.

## 12. Multi-brigade main/support (Systems_Manual_v0_9_0.md §6.4 operations section)
- **New**: Operations assign main_brigade (highest basePower) and support_brigades per axis. Power-neutral model: SUPPORT_POWER_MULT=1.0 (concentration bonus already handles multi-unit synergy). MAIN_CASUALTY_MULT=1.40, SUPPORT_CASUALTY_MULT=0.55. Renormalized casualty distribution preserves total. BB1 p.182 sourced.

## 13. Phantom defender fix (Systems_Manual_v0_9_0.md §5 combat section)
- **Old**: Non-sector defense paths: only primary defender takes casualties.
- **New**: Co-located defenders share casualties proportionally by personnel in all defense paths.

## 14. bfsDistance friendly-only (Systems_Manual_v0_9_0.md §6.3 sector/assignment section)
- **Old**: bfsDistance in sector_utils.ts uses raw adjacency (no faction filter).
- **New**: Accepts friendlyOsids parameter. brigade_front_distribution and subsegment_assignment pass faction's friendly set.
