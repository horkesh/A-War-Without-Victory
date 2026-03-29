# Canon Propagation Needed (2026-03-28 Session 2)

These mechanical changes need to be reflected in canon docs. Use `/propagate-to-canon` to apply.

## 1. Supply filter change (Systems_Manual_v0_7_0.md §6.5)
- **Old**: "Brigades at critical supply are forced to defend (no voluntary attacks). At strained supply, min_attack_outcome is upgraded to 'victory'"
- **New**: Supply gate for operation pool: only `critical` excluded. `strained` brigades CAN participate in operations — 0.75× combat penalty models degraded effectiveness. The per-brigade strained gate (min_outcome upgrade to 'victory') still applies at brigade AI level.
- **Where**: Line 154, supply gating section

## 2. Counter-attack broadening (Systems_Manual_v0_7_0.md §6.5)
- **Old**: "Counter-attacks — brigades may retake a recently lost position (enabled by counterattack_window_turns > 0) without an active operation."
- **New**: Sector-wide counter-attacks: when ANY brigade in a sector retreats within 2 turns, other healthy brigades (personnel≥600, cohesion≥30, not disrupted) on that sector's front can counter-attack adjacent enemy OSIDs within 2 hops. Max 2 per sector per turn.
- **Where**: Line 213, counter-attack exception

## 3. Planning duration cap (Systems_Manual_v0_7_0.md §6.4)
- **New**: MAX_PLANNING_DURATION=4. Planning duration capped regardless of objective count.

## 4. Probe lifecycle (Systems_Manual_v0_7_0.md §6.4)
- **New**: evaluateOperationProgress() skips probe AND feint (not just sector_attack). Probes don't trigger theater cooldown (don't set last_completed_operation).
- **Where**: Line 150, "evaluateOperationProgress() skips sector_attack ops"

## 5. Casualty ratio fix (Systems_Manual_v0_7_0.md §5 or combat section)
- **New**: getPowerRatioCasualtyMult() bilateral scaling now fully applied. attCasMult multiplied into attacker casualty formula in both attack_resolution_osid.ts and combat_predictor.ts.

## 6. Exhaustion gate (Systems_Manual_v0_7_0.md §6.4)
- **New**: Corps with exhaustion > MAX_EXHAUSTION_FOR_OPERATION (30) cannot launch sector offensives. Probe threshold: 40.
- SECONDARY_OP_COOLDOWN_TURNS: 8→5

## 7. Territory reconciliation Phase 1.5 (Systems_Manual_v0_7_0.md §6.3 or sector section)
- **New**: classifyBrigadesByTerritory has Phase 1.5 between front-line (Phase 1) and BFS pool (Phase 2). Matches pooled brigades by location_osid vs territory_osids.
