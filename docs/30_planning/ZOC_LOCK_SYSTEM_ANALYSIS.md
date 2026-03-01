# ZoC-Lock System Analysis and Calibration Proposal

**Date:** 2026-02-28
**Status:** Analysis / Proposal
**Scope:** Zone of Control lock mechanics, linked ZoC defense, and the gap between "ZoC-projected defense" and "brigade-present defense" in the OSID model.

---

## 1. Current System Description

### 1.1 ZoC Projection

A deployed brigade at OSID X projects Zone of Control to all OSIDs adjacent to X in the operational contact graph. Only deployed brigades (not in-transit/column) project ZoC.

**Source:** `src/sim/combat/zoc.ts` — `computeEnemyZocOsidsForFaction()`

### 1.2 ZoC-Lock Rule

A brigade is "ZoC-locked" when its `location_osid` falls within any enemy brigade's ZoC. A ZoC-locked brigade's options narrow to:

1. **Stay** at current OSID
2. **Retreat** to a friendly OSID not in enemy ZoC
3. **Attack** the adjacent enemy ZoC source

The brigade AI implements this as Rule 1 (highest priority) in `executeFactionDirectives()`:

```typescript
// src/sim/combat/bot_brigade_ai_osid.ts, line 795-805
if (isLocked) {
    const retreatDests = getValidRetreatDestinations(...);
    if (retreatDests.length > 0) {
        result.movement_orders[brigade.id] = retreatDests[0]!;
    } else if (adjEnemy.length > 0) {
        result.posture_orders.push({ brigade_id: brigade.id, posture: 'attack' });
        result.attack_orders[brigade.id] = adjEnemy[0]!;
    }
    continue;
}
```

### 1.3 Linked ZoC

When two or more same-faction brigades are close enough that their ZoC sets connect through the adjacency graph, the intermediate ZoC OSIDs form a "linked front." Enemy brigades cannot move into linked ZoC OSIDs (movement is blocked), though they can still attack into enemy-controlled territory that happens to be in linked ZoC.

**Source:** `src/sim/combat/zoc.ts` — `computeLinkedZocForFaction()`

The linked ZoC system uses BFS through a "ZoC subgraph" (union of brigade positions and their ZoC projections). A connected component with 2+ brigades marks all intermediate ZoC OSIDs as "linked." Maximum linking distance: 2 hops between brigades (brigade A -> ZoC -> ZoC -> brigade B). At 3 hops, the gap breaks.

### 1.4 Defense Hierarchy for Attacked OSIDs

When an enemy-controlled OSID is attacked, the defense strength is resolved in three tiers:

| Tier | Condition | Defense Strength |
|------|-----------|-----------------|
| **Direct** | Brigade physically present at OSID | 100% of `computeDefenderPower()` (entrenchment, resilience, terrain, posture, all bonuses) |
| **Linked ZoC** | No brigade present, but OSID is in defender faction's linked ZoC chain | 50% of `computeDefenderPower()` of the adjacent ZoC-projecting brigade(s) — `LINKED_ZOC_READINESS = 0.50` |
| **Unlinked ZoC** | No brigade present, but adjacent enemy brigade projects ZoC | `computeZocDefenderPower()` — scales 0%->100% with entrenchment (0->4 turns). Fresh brigade = 0% ZoC defense |
| **Militia** | No brigade present or projecting ZoC | `population * 0.03 * 0.25` — token resistance (~37.5 power for 5000 pop) |

**Source:** `src/sim/combat/attack_resolution_osid.ts`, lines 506-559

### 1.5 Movement Blocking via Linked ZoC

Linked ZoC blocks enemy *movement* (not attacks) into those OSIDs. In `zoc_constrained_movement.ts`:

```typescript
// If destination is friendly-controlled but in enemy's linked ZoC -> blocked
if (linkedZocByFaction && controller === factionId) {
    for (const [enemyFid, linkedSet] of linkedZocByFaction) {
        if (enemyFid === factionId) continue;
        if (linkedSet.has(destOsid)) {
            report.moves_blocked_by_linked_zoc += 1;
            return false;
        }
    }
}
```

Attacks into enemy-controlled territory bypass this check.

### 1.6 Graph Analysis Classification

`osid_graph_analysis.ts` classifies each faction-controlled OSID:

- **interior**: no enemy neighbors
- **undefended**: on the front (has enemy neighbors) but brigade_power = 0
- **critical**: brigade present but enemy_threat / brigade_power > 2.0
- **threatened**: enemy_threat / brigade_power > 1.0
- **active**: enemy present with brigade coverage
- **quiet**: front OSID, brigade present, no enemy brigade power nearby

Crucially, the "undefended" classification ignores ZoC entirely. An OSID may be deeply within linked ZoC but still classified as "undefended" if no brigade sits on it.

---

## 2. Identified Issues

### 2.1 The Binary Defense Gap

The core problem: there is a stark binary between "brigade present" (full defense with entrenchment, resilience, terrain, etc.) and "no brigade" (ZoC defense at 0-50%, or militia at ~37.5 power). In the actual Bosnian War, the front line between two brigade positions was not free real estate. It was:

- **Mined**: Extensive mine belts between positions
- **Observed**: Forward observation posts with radio communication
- **Covered by indirect fire**: Pre-registered artillery/mortar fire zones
- **Patrolled**: Regular patrols between fixed positions

An attacker moving into the "gap" between two deployed brigades would face significant resistance from both flanking positions, not just the weak ZoC projection currently modeled.

### 2.2 ZoC-Locked OSIDs Are Not Treated as Defended for Movement Purposes

Currently, the linked ZoC system blocks *friendly* movement into enemy linked ZoC, but it does not treat ZoC-locked OSIDs as meaningfully defended against attack. The defense hierarchy already partially addresses this (linked ZoC = 50% defense, unlinked = 0-100% scaling with entrenchment), but:

1. The 50% linked ZoC multiplier was calibrated for Srebrenica (5 brigades covering 14 OSIDs) and may be too generous or too weak in other contexts.
2. Unlinked ZoC defense starts at 0% for freshly placed brigades, creating a vulnerability window.
3. The bot AI's graph analysis marks these OSIDs as "undefended" and actively tries to fill them with brigades — often pulling brigades from positions where they're needed.

### 2.3 Front-Fill Thrashing

Because `osid_graph_analysis` classifies ZoC-covered-but-empty OSIDs as "undefended," the bot AI (Rule 6 in `executeFactionDirectives`) constantly tries to move brigades to fill these gaps. This creates:

- **Oscillation**: Brigades move to fill gap A, creating gap B, then another brigade moves to fill gap B, creating gap C.
- **Weakened defensive positions**: Brigades abandon entrenched positions (losing entrenchment_turns) to cover a gap that was already defended by ZoC projection.
- **Unrealistic behavior**: Historical front lines had deliberate gaps between strongpoints; commanders did not shuffle brigades every week to fill every empty hex.

### 2.4 Asymmetry in ZoC Treatment

The current system treats ZoC inconsistently across its subsystems:

| Subsystem | Treatment of ZoC-locked empty OSID |
|-----------|-----------------------------------|
| **Movement blocking** | Linked ZoC blocks enemy movement (strong) |
| **Attack defense** | 50% of defender power for linked, 0-100% for unlinked (moderate) |
| **Graph analysis** | Classified as "undefended" (ignores ZoC entirely) |
| **Bot AI front-fill** | Treated as gap to be filled (actively undermines ZoC defense) |
| **Combat predictor** | ZoC defense visible at 60% through fog of war |

---

## 3. Proposed Changes

### 3.1 Introduce "ZoC-Defended" Classification

Add a new front classification that distinguishes between truly undefended OSIDs and those covered by ZoC projection.

**In `osid_graph_analysis.ts`:**

```typescript
export type FrontClassification =
    'undefended' | 'zoc_covered' | 'critical' | 'threatened' | 'active' | 'quiet' | 'interior';

// In analyzeFactionGraph():
// After computing brigade_power and enemy_neighbors...
if (enemyNeighbors.length === 0) {
    classification = 'interior';
} else if (brigadePower === 0) {
    // NEW: Check if this OSID is in the faction's own linked ZoC
    const isInOwnLinkedZoc = linkedZocForFaction?.has(osid) ?? false;
    // Or check if adjacent friendly brigades project ZoC here
    const hasAdjacentFriendlyBrigade = friendlyNeighbors.some(fn => {
        const { power } = getBrigadePowerAtOsid(state, fn, faction);
        return power > 0;
    });
    if (isInOwnLinkedZoc || hasAdjacentFriendlyBrigade) {
        classification = 'zoc_covered';  // Defended by projection, not "undefended"
    } else {
        classification = 'undefended';   // Truly undefended: no brigade, no ZoC
    }
} else if (enemyThreat > 0 && enemyThreat / brigadePower > 2.0) {
    classification = 'critical';
}
// ... rest unchanged
```

This would require passing linked ZoC data into `analyzeFactionGraph()`, which currently does not receive it. The function signature would gain an optional `linkedZocForFaction?: Set<Osid>` parameter.

**Impact on bot AI front-fill:** The front-fill logic (Rule 6 in `executeFactionDirectives`) currently looks for `classification === 'undefended' || classification === 'critical'`. With the new `zoc_covered` classification, brigades would stop trying to fill gaps that are already ZoC-defended. They would still fill truly undefended gaps (no ZoC coverage at all).

### 3.2 Calibrate Linked ZoC Defense Strength

The current `LINKED_ZOC_READINESS = 0.50` is a single global constant. It should vary based on contextual factors that historically determined how well the "between positions" zone was defended.

**Proposed: Multi-factor Linked ZoC readiness:**

```typescript
function computeLinkedZocReadiness(
    state: GameState,
    targetOsid: Osid,
    zocDefenders: FormationState[],
    adjacency: Map<Osid, Osid[]>
): number {
    let readiness = BASE_LINKED_ZOC_READINESS; // 0.35 base

    // Factor 1: Average entrenchment of ZoC-projecting brigades
    // Well-entrenched brigades have better minefields, OPs, registered fire zones
    const avgEntrench = zocDefenders.reduce((s, d) =>
        s + Math.min(6, (d as any).entrenchment_turns ?? 0), 0) / zocDefenders.length;
    const entrenchBonus = Math.min(0.15, avgEntrench * 0.025);
    readiness += entrenchBonus;

    // Factor 2: Number of ZoC-projecting brigades (crossfire bonus)
    // If 2+ brigades project ZoC here, they have interlocking fields of fire
    if (zocDefenders.length >= 2) {
        readiness += 0.10;
    }

    // Factor 3: Terrain — mountainous/forested terrain between positions is
    // harder to move through even without troops physically present
    // (uses existing terrain multiplier infrastructure)

    return Math.min(MAX_LINKED_ZOC_READINESS, readiness); // Cap at 0.65
}
```

**Calibration knobs:**
- `BASE_LINKED_ZOC_READINESS`: 0.35 (base, lower than current 0.50)
- `MAX_LINKED_ZOC_READINESS`: 0.65 (cap, prevents ZoC from being as strong as direct defense)
- Entrenchment bonus: 0 to 0.15 (rewards static front lines)
- Crossfire bonus: 0.10 (rewards tight brigade spacing)

The net effect: early-war linked ZoC (low entrenchment) provides ~0.35x defense, while late-war static front linked ZoC (high entrenchment, tight spacing) provides up to ~0.60x defense. This better models the Bosnian War's progression from fluid early fighting to entrenched stalemate.

### 3.3 Unlinked ZoC Defense Floor

Currently, unlinked ZoC defense is `computeZocDefenderPower()` which scales linearly from 0% to 100% over 4 turns of entrenchment. This means a freshly placed brigade projects zero ZoC defense. In reality, even a brigade that just arrived has some ability to respond to adjacent threats (they have communications, vehicles, weapons).

**Proposed: Add a floor to ZoC readiness:**

```typescript
// In computeZocDefenderPower():
const entrench = Math.min(MAX_ENTRENCHMENT, (formation as any).entrenchment_turns ?? 0);
const zocReadiness = Math.min(1.0, ZOC_READINESS_FLOOR + (entrench / ZOC_READINESS_RAMP));
```

**Calibration knobs:**
- `ZOC_READINESS_FLOOR`: 0.15 (newly deployed brigade still projects 15% ZoC defense)
- `ZOC_READINESS_RAMP`: 4 (reaches 100% at 4 turns, same as current)

This prevents the "free walkover" window for freshly deployed brigades while maintaining the current ramp for full effectiveness.

### 3.4 Alternative System: Projected Defense Zones (PDZ)

If the above incremental changes are insufficient, a more fundamental restructuring could replace the binary "brigade present / not present" model with a continuous "projected defense zone."

**Concept:** Each deployed brigade projects a defense gradient to adjacent OSIDs, proportional to:
- The brigade's combat power
- Its entrenchment level (proxy for minefields, OPs, registered fire)
- Distance from the brigade (attenuated by graph distance)
- Terrain between the brigade and the projected OSID

This would replace the current linked/unlinked ZoC defense calculation with a unified system:

```typescript
function computeProjectedDefense(
    targetOsid: Osid,
    projectors: Array<{ formation: FormationState; distance: number; terrain: number }>,
    artillerySuppression: number
): number {
    let totalProjection = 0;
    for (const p of projectors) {
        const base = basePower(p.formation);
        const entrench = Math.min(6, (p.formation as any).entrenchment_turns ?? 0);
        // Projection strength decays with distance and improves with entrenchment
        const projectionFactor = (0.15 + entrench * 0.04) / p.distance;
        // Artillery suppresses projected defense (less effectively than direct)
        const suppressed = projectionFactor * (1.0 - artillerySuppression * 0.5);
        totalProjection += base * suppressed * p.terrain;
    }
    return totalProjection;
}
```

**Advantages:**
- Unified model: no separate code paths for linked vs unlinked vs direct defense
- Continuous: defense strength degrades smoothly with distance rather than binary transitions
- Physically intuitive: models observation, indirect fire, patrol coverage as continuous phenomena
- Naturally handles enclave defense (Srebrenica, Gorazde) where few brigades must cover many OSIDs

**Disadvantages:**
- More complex to implement and debug
- Harder to explain to players (current system has clear tiers)
- Requires careful calibration to avoid making fronts impenetrable
- Performance: computing projected defense for every attacked OSID requires iterating nearby brigades

**Recommendation:** Pursue the incremental changes (3.1-3.3) first. They address the immediate issues (front-fill thrashing, binary defense gap) without the risk and complexity of a full restructuring. Reserve the PDZ system for a future phase if the incremental approach proves insufficient.

---

## 4. Calibration Knobs Summary

| Knob | Current | Proposed | Effect |
|------|---------|----------|--------|
| `LINKED_ZOC_READINESS` | 0.50 (flat) | 0.35-0.65 (variable) | Linked ZoC defense strength relative to direct defense |
| `BASE_LINKED_ZOC_READINESS` | N/A | 0.35 | Minimum linked ZoC defense (low entrenchment) |
| `MAX_LINKED_ZOC_READINESS` | N/A | 0.65 | Maximum linked ZoC defense (high entrenchment, crossfire) |
| `ZOC_READINESS_FLOOR` | 0.00 | 0.15 | Minimum unlinked ZoC defense (freshly deployed) |
| `ZOC_READINESS_RAMP` | 4 turns | 4 turns (unchanged) | Turns to reach full unlinked ZoC defense |
| Front classification | binary (undefended/has brigade) | ternary (undefended/zoc_covered/has brigade) | Controls bot AI gap-filling behavior |
| `FOG_ZOC_VISIBILITY` | 0.60 | 0.60 (unchanged) | Bot predictor visibility of ZoC defense |

### 4.1 Calibration Strategy

Run the 52-week default scenario with each change independently to measure:

1. **Territory control at week 52** (target: RS ~55-60%, per historical)
2. **Brigade movement frequency** (lower = more stable fronts, but too low = static)
3. **Undefended front OSID count** (should decrease with `zoc_covered` classification)
4. **Attack success rate against ZoC-defended OSIDs** (should be lower than against truly undefended, higher than against brigade-present)
5. **Enclave survival** (Srebrenica, Gorazde should hold with current brigade counts)

### 4.2 Sensitivity Analysis

The most dangerous calibration risk is making linked ZoC too strong, which would:
- Make the front impenetrable (no offensive progress)
- Reduce the value of concentrated force (the current corps directive system)
- Eliminate the historical pattern of VRS early-war territorial expansion

To mitigate: always test with `MAX_LINKED_ZOC_READINESS <= 0.65`. At 0.65, a solo attacker faces 65% of the defender power that a direct defense would provide. Two concentrated attackers can still break through (combined ratio well above the 1.5 victory threshold).

---

## 5. Risks and Mitigations

### 5.1 Risk: Impenetrable Fronts

**Concern:** If ZoC-defended OSIDs resist attack too strongly, offensive operations become impossible. The Bosnian War featured successful offensives (VRS 1992 expansion, ARBiH Operation Vrbanija, etc.) that would be unreproducible.

**Mitigation:**
- Cap `MAX_LINKED_ZOC_READINESS` at 0.65 (never stronger than 65% of direct defense)
- Artillery suppression still applies (at 50% effectiveness for projected defense)
- Concentrated attacks (2-3 brigades) easily overwhelm ZoC defense
- The changes only affect defense *between* brigades, not the brigades themselves

### 5.2 Risk: Srebrenica/Gorazde Enclave Calibration

**Concern:** The `LINKED_ZOC_READINESS` was originally tuned for enclave defense (5 brigades covering 14 OSIDs in Srebrenica). Changing the constant could break enclave survival.

**Mitigation:**
- The variable readiness (0.35 base + entrenchment bonus) would likely produce ~0.50 for well-entrenched enclave brigades, matching the current flat value
- Run enclave-specific scenario tests after any change
- The `enclave_resilience.ts` bonus (`getEnclaveDefenseBonus`) provides a separate multiplicative layer for enclave defense

### 5.3 Risk: Bot AI Behavior Regression

**Concern:** Changing the graph analysis classification could cause unexpected bot behavior changes (brigades no longer filling critical gaps).

**Mitigation:**
- The `zoc_covered` classification would only prevent filling gaps that already have ZoC coverage
- Truly undefended gaps (no adjacent friendly brigade) remain classified as `undefended` and will still trigger gap-fill
- The `critical` classification (brigade present but outmatched) remains unchanged

### 5.4 Risk: Performance

**Concern:** Computing linked ZoC for use in graph analysis adds a dependency between `computeLinkedZocForFaction` and `analyzeFactionGraph`.

**Mitigation:**
- Both are already computed once per turn per faction
- The linked ZoC set is already available in the turn context (computed in the `zoc-computation` pipeline step)
- Just pass it through to `analyzeFactionGraph` — no additional computation needed

---

## 6. Implementation Priority

1. **Phase A (Low risk, high impact):** Add `zoc_covered` classification to `osid_graph_analysis.ts`. This alone would reduce front-fill thrashing without changing any combat mechanics.

2. **Phase B (Medium risk, medium impact):** Add `ZOC_READINESS_FLOOR = 0.15` to `computeZocDefenderPower()`. Eliminates the "zero defense" window for freshly deployed brigades.

3. **Phase C (Higher risk, higher impact):** Replace flat `LINKED_ZOC_READINESS = 0.50` with the variable readiness calculation. Requires careful calibration testing.

4. **Phase D (Future consideration):** Projected Defense Zones (PDZ) system. Only if Phases A-C prove insufficient.

---

## 7. Files Affected

| File | Change |
|------|--------|
| `src/sim/combat/osid_graph_analysis.ts` | Add `zoc_covered` classification, accept linked ZoC input |
| `src/sim/combat/attack_resolution_osid.ts` | Variable `LINKED_ZOC_READINESS`, `ZOC_READINESS_FLOOR` |
| `src/sim/combat/combat_predictor.ts` | Mirror changes from attack_resolution (predictor must stay in sync) |
| `src/sim/combat/bot_brigade_ai_osid.ts` | Update gap-fill logic to respect `zoc_covered` classification |
| `src/sim/turn_pipeline.ts` | Pass linked ZoC data to `analyzeFactionGraph` |
| `tests/linked_zoc.test.ts` | Add test cases for variable readiness and `zoc_covered` classification |

---

## 8. Historical Justification

The Bosnian War's front lines were characterized by:

1. **Thin manning with deep ZoC**: Brigades held strongpoints separated by gaps. The gaps were covered by observation posts, mine belts, and pre-registered indirect fire. Moving through these gaps was extremely costly even without encountering a formed unit.

2. **Static front solidification**: After the initial VRS expansion (weeks 1-12), front lines stabilized. The stabilization was not because every hex was manned, but because the *capability to respond* became credible. Entrenched brigades could cover much wider frontages than their physical positions suggested.

3. **Breakthroughs required concentration**: When offensives succeeded (VRS at Srebrenica 1995, ARBiH at Kupres 1994), they required massing 3-5 brigades against 1-2 defenders. The "gap" between defenders was not free; it was where the concentrated force had to absorb flanking fire from adjacent positions.

4. **Early war vs late war**: In April-June 1992, ZoC projection was weak (no minefields, no registered fire, brigades newly formed). By late 1992, the same positions were much harder to attack because the defenders had organized their areas. The variable ZoC readiness tied to entrenchment naturally models this progression.

The proposed changes align the simulation with this historical reality: ZoC-covered gaps between brigades should resist attack (not as strongly as manned positions, but not as weakly as open ground), and the resistance should increase over time as brigades entrench.
