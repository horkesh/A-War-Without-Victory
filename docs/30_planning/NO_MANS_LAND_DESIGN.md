# No-Man's Land: Abandoned Settlement Mechanic

**Date:** 2026-02-20
**Author:** Architect
**Status:** Proposal — pending Game Designer + Systems Programmer review
**Parent:** WARMAP_UI_UX_ARCHITECTURE_PROPOSAL.md (Section 10: Front Lines and Territorial Control)

---

## Problem Statement

AWWV's political control model is binary: every settlement is owned by a faction or `null`. This produces clean, wall-to-wall faction coloring on the map. In reality, the Bosnian War front lines developed depopulated buffer zones — villages shelled into rubble, mined, abandoned by both sides. These zones were a defining visual and strategic feature of the conflict, particularly along static fronts like the Sarajevo siege ring, the Posavina corridor edges, and the Lasva Valley contact lines.

The map should show this. The war should *scar the terrain*.

---

## Constraint: Political Controllers Must Stay Binary

`political_controllers: Record<SettlementId, FactionId | null>` is consumed by 15+ engine systems:

| System | Reads `political_controllers` for |
|--------|-----------------------------------|
| `computeFrontEdges()` | Front edge detection (faction A adj. faction B) |
| `resolveAttackOrders()` | Target validation, defender identification |
| `consolidation_flips` | Undefended enemy settlement detection |
| `supply_reachability` | Friendly-territory pathfinding |
| `brigade_movement` | Route through friendly territory only |
| `displacement_triggers` | Takeover-driven displacement |
| `aor_contiguity` | Brigade AoR must be contiguous friendly |
| `brigade_aor` assignment | Settlement must match brigade faction |
| `militia_garrison` | Garrison derived from faction's org. penetration |
| `minority_erosion` | Ethnic minority pressure in faction territory |
| `settlement_control` | Phase I control flip mechanics |
| `front_segments` | Active streak, stability classification |
| `front_pressure` | Pressure accumulation per front edge |
| `exhaustion` | Static front contribution to faction exhaustion |
| `negotiation_capital` | Territory valuation for treaty offers |

Introducing a third state (`abandoned` / `nml`) to this field would require auditing and modifying every one of these systems. That's a cross-cutting change with high regression risk and no clear benefit over the alternative below.

**Decision: `political_controllers` remains binary. The last faction to hold a settlement retains nominal ownership.**

---

## Proposed Mechanic: Abandoned Settlements (Option B)

### New State Field

```typescript
// Added to GameState
abandoned_settlements: Record<SettlementId, AbandonedState>;

interface AbandonedState {
  since_turn: number;       // turn when settlement was marked abandoned
  last_owner: FactionId;    // redundant with political_controllers, but useful for history
  battle_damage_at_abandon: number; // snapshot of damage level
}
```

### Trigger Conditions

A settlement becomes abandoned when ALL of the following are true at the end of a turn:

1. **`battle_damage[sid] >= 0.7`** — heavily destroyed by combat
2. **No brigade AoR coverage** — `brigade_aor[sid] === null` (no military unit claims it)
3. **Effective population below threshold** — displacement has emptied it below 20% of 1991 census

A settlement is **reclaimed** (exits abandoned state) when ANY of the following:

1. A brigade explicitly includes it in AoR (player/bot decision to garrison ruins)
2. A consolidation flip assigns it to a new owner
3. An attack order targets and captures it

### Effects on Existing Systems

| System | Effect of Abandoned Status | Implementation |
|--------|---------------------------|----------------|
| **Militia garrison** | Garrison multiplier = **0.0** (nobody left to fight) | Multiply `militia_garrison` output by `abandoned ? 0 : 1` |
| **Consolidation flips** | Abandoned enemy settlements flip with **zero resistance** (no cohesion cost) | Check `abandoned_settlements` in consolidation; skip garrison check |
| **Movement cost** | **+2 edge cost** for pathfinding through abandoned settlements (mines, rubble, no infrastructure) | Add penalty in `computeEdgeCost()` |
| **Supply routing** | **+1 supply distance penalty** (damaged infrastructure) | Add penalty in supply path computation |
| **Battle resolution** | If attacked, defender power = **base terrain only** (no garrison, no org. penetration) | Check abandoned in `computeDefenderPower()` |
| **Front edges** | **Unchanged** — abandoned settlements still have a `political_controllers` entry, so front edge detection works normally | No change |
| **AoR assignment** | **Unchanged** — brigades CAN include abandoned settlements in AoR (it's a player choice to garrison ruins) | No change |
| **Displacement** | **Unchanged** — population is already gone (that's a trigger condition) | No change |
| **Negotiation valuation** | Abandoned settlements valued at **50% of normal** (ruins have less strategic worth) | Multiply valuation by `abandoned ? 0.5 : 1` |

### What Does NOT Change

- `political_controllers` — binary, last owner retains nominal control
- `computeFrontEdges()` — front edges still work (faction adjacency unchanged)
- `front_segments` / `front_pressure` / `exhaustion` — all unchanged
- `brigade_aor` assignment logic — unchanged (brigades can garrison ruins if ordered)
- `resolveAttackOrders()` — targeting unchanged (you can still attack an abandoned settlement)
- All determinism properties — `abandoned_settlements` is derived deterministically from existing state

---

## Visual Treatment

### On the War Map

Abandoned settlements get a distinct rendering that makes them visually "dead":

**Day Mode:**
- Fill: desaturated grey-brown `rgba(140, 130, 120, 0.5)` replacing faction color
- Hatching: diagonal rubble pattern (thin dark lines at 30-degree angle, 6px spacing)
- Outline: dark grey `#666` dashed border
- Label: dimmed, italicized (if shown at all)
- Battle damage texture: cracked/pockmarked procedural pattern overlaid at 20% opacity

**Night Mode:**
- Fill: very dark grey `rgba(40, 35, 30, 0.4)` — darker than surrounding faction territory
- No city light gradient (the lights are out)
- Faint reddish-brown tint suggesting scorched earth
- No phosphor glow on settlement outline

**Both Modes:**
- A thin faction-colored ghost outline at 15% opacity reminds the viewer who nominally owns it
- At tactical zoom, a small ruined building icon appears at settlement centroid
- At strategic zoom, clusters of abandoned settlements merge into a visible grey scar along the front

### Progressive Scarring

Over the course of a 52-week game, the map should develop a visible wound pattern:

- **Weeks 1-10:** Few abandoned settlements. Map is clean, colorful.
- **Weeks 10-26:** Static fronts produce battle damage. First abandoned settlements appear along Sarajevo ring, Posavina corridor, Lasva Valley.
- **Weeks 26-40:** Wide bands of abandoned settlements along all major fronts. The grey scar is clearly visible at strategic zoom.
- **Weeks 40-52:** The scar stabilizes. New abandonment slows as fronts freeze. The map tells the story of where the war was fought hardest.

This visual progression reinforces the "negative-sum" theme without any text or numbers — the map itself becomes uglier as the war continues.

---

## Emergent Gameplay

The abandoned settlement mechanic creates interesting strategic decisions:

### 1. Buffer Zone Value
A band of abandoned settlements between you and the enemy is actually *useful*: enemy attacks must cross the NML (movement cost penalty, no militia support), giving your rear brigades warning and time to react. Deliberately *not* reclaiming abandoned settlements can be a valid defensive strategy.

### 2. Consolidation Exploit Prevention
Currently, a brigade in `consolidation` posture can flip undefended enemy settlements for free. With abandoned settlements, those flips are even easier (zero resistance) but the gained settlements are ruins — they don't provide militia garrison, they penalize supply, and they're expensive to hold. This prevents "free territory" exploits along static fronts.

### 3. Offensive Preparation Cost
Before launching an offensive through NML, an attacker must either:
- Accept the movement penalty (slower advance through rubble)
- Or garrison the NML first (costs a brigade's time and AoR capacity to hold ruins)

This creates a realistic "reconstitution phase" before offensives, matching historical patterns where clearing minefields and repairing roads preceded major operations.

### 4. Peace Treaty Implications
In negotiation, abandoned settlements are worth less. A faction holding a wide band of ruins along the front has less bargaining leverage than one holding intact, populated territory. This incentivizes protecting rear areas and adds weight to the decision of where to fight.

---

## Implementation Estimate

| File | Change | Lines |
|------|--------|-------|
| `src/state/game_state.ts` | Add `abandoned_settlements` field + `AbandonedState` type | ~15 |
| `src/state/schema.ts` | Add abandoned schema | ~10 |
| `src/state/serialize.ts` | Serialize/deserialize abandoned | ~10 |
| `src/state/clone.ts` | Clone abandoned map | ~5 |
| `src/sim/phase_ii/abandoned_settlement.ts` | **New file**: evaluate triggers, mark/unmark | ~80 |
| `src/sim/phase_ii/militia_garrison.ts` | Check abandoned before computing garrison | ~5 |
| `src/sim/phase_ii/consolidation_flips.ts` | Zero-resistance path for abandoned targets | ~10 |
| `src/sim/phase_ii/brigade_movement.ts` | Movement cost penalty in `computeEdgeCost()` | ~8 |
| `src/sim/phase_ii/battle_resolution.ts` | Abandoned defender power reduction | ~10 |
| `src/sim/turn_pipeline.ts` | Add `evaluate-abandoned-settlements` step after displacement | ~5 |
| `src/ui/map/data/GameStateAdapter.ts` | Extract abandoned state for rendering | ~15 |
| `src/ui/map/layers/SettlementControlLayer.ts` | Abandoned visual treatment | ~40 |
| `tests/abandoned_settlements.test.ts` | **New test file** | ~120 |
| **Total** | | **~330 lines** |

### Turn Pipeline Placement

```
... existing steps ...
phase-ii-minority-flight
evaluate-abandoned-settlements    <-- NEW: after displacement, before recruitment
phase-ii-recruitment
... existing steps ...
```

Placement after displacement ensures population thresholds are current. Placement before recruitment ensures abandoned status affects the rest of the turn's computations.

---

## Determinism Analysis

**Risk: NONE.**

- `abandoned_settlements` is derived deterministically from `battle_damage`, `brigade_aor`, and displacement population — all of which are already deterministic.
- The trigger conditions use only `>=` comparisons on fixed-precision values.
- No `Math.random()`, no timestamps, no iteration-order sensitivity.
- Map iteration over `abandoned_settlements` will use `strictCompare` sorted keys (standard pattern).

---

## Historical Validation

The mechanic should produce abandoned settlement bands matching known historical NML zones:

| Zone | Expected Abandoned Pattern | Validation Criteria |
|------|---------------------------|-------------------|
| Sarajevo siege ring | Ring of abandoned settlements around inner city (Grbavica, Dobrinja, Nedzarici contact zone) | 10-20 settlements abandoned by week 20 |
| Posavina corridor | Narrow band along RS corridor (Brcko-Modrica axis) | 5-15 settlements abandoned by week 30 |
| Lasva Valley | Contact zone between RBiH and HRHB (Vitez-Busovaca area) | 5-10 settlements abandoned by week 25 |
| Drina valley | RS-RBiH contact zone (Srebrenica-Bratunac area) | Variable — depends on enclave dynamics |

The 52-week scenario run should be checked for these patterns before declaring the mechanic validated.

---

## Open Questions for Game Designer

1. **Should abandoned settlements slowly "recover"?** If battle_damage decays over time (it currently doesn't — it's monotonic), settlements could naturally exit abandoned state. But monotonic battle_damage is a design choice reinforcing "war destroys permanently." Recommend: keep it monotonic. Abandoned is forever unless actively reclaimed.

2. **Should the 0.7 battle_damage threshold be tunable per scenario?** Lower threshold = more NML = more visual scarring. Higher threshold = less NML = cleaner map. Recommend: fixed at 0.7 for now, revisit after 52-week validation.

3. **Should abandoned settlements affect exhaustion?** A faction "owning" a band of ruins could plausibly suffer morale impact ("we hold nothing but ashes"). Recommend: defer to v2 — keep the initial mechanic simple.

4. **Should the player receive a notification when settlements are abandoned?** A small event: "3 settlements in Opstina Vogosca have been abandoned due to heavy damage and depopulation." Recommend: yes, as a turn report entry.
