# Commander Override Layer — Design Plan

**Date:** 2026-03-15
**Status:** IMPLEMENTED (v0.4.6, 2026-03-16) — Phase A (4 criteria + supply-aware sizing) and Phase B (army HQ overrides + probes/feints) both complete. Army HQ overrides dormant pending priority weight tuning.
**Depends on:** Budget-based brigade allocation (n806, implemented)
**Addresses:** REAL_WAR_MASTER #42 (strategic targeting), #44 (ARBiH probing), 2KK Prozor drift, SRK sector :4 over-allocation

---

## Problem Statement

The mechanical assignment pipeline (Phase 1 positional → budget allocation → BFS fill) produces a brigade distribution that the corps commander would often override. Examples from n808-n809:

1. **2KK at Prozor:** 6 of 8 brigades 150km from Bihać — the corps commander would say "bring those men back, the pocket is our primary mission"
2. **SRK sector :4:** 3 brigades at threat 13 (Vareš) while sector :0 (Sarajevo ring) has 2 at threat 400 — Galić would pull 2 from Vareš to the ring
3. **ARBiH 2nd Corps:** Can't counterattack at Brčko because supply strain blocks operations — but the commander with 5 surplus brigades should say "limited strike at Bijela, 3 brigades max"

The mechanical steps do the right thing LOCALLY (budget computation is correct) but can't express STRATEGIC INTENT — what the commander wants to accomplish this turn vs next turn.

## Architecture: Commander as Final Authority

### Current Pipeline
```
Sector construction → Phase 1 (positional) → Budget fill → Surplus
    → [assignment final]
    → Directive generation (sectorReassignmentOrders)
```

### Proposed Pipeline
```
Sector construction → Phase 1 (positional) → Budget fill → Surplus
    → [assignment proposal]
    → COMMANDER REVIEW (new)
    → [assignment final]
    → Directive generation
```

### Commander Review Function

```typescript
function commanderReviewAssignment(
    corpsId: string,
    sectors: CorpsFrontSector[],
    formations: FormationState[],
    armyPriorities: ArmyOperationPriority[],
    commanderProfile: CommanderProfile,
    state: GameState,
): CommanderOverride[]
```

The commander evaluates the proposed assignment against his strategic intent and issues overrides.

### What the Commander Evaluates

**1. Mission compliance:** Are my high-priority targets adequately covered?
- If army priorities say "target Bihać" but the Bihać-facing sector has 1 brigade → override: pull brigades from lowest-threat sectors to Bihać

**2. Non-priority area excess:** Am I wasting forces where I have no mission?
- If a sector faces territory that's NOT in `target_municipalities` AND has more than minimum garrison → override: release excess to garrison-deficient sectors

**3. Offensive preparation:** Am I staging for a planned operation?
- If an operation is in planning phase → override: concentrate surplus brigades at the operation's staging sector (this already exists in Phase 2d but runs too late)

**4. Defensive coherence:** Is any sector critically under-garrisoned relative to its threat?
- If a sector has threat > 200 and garrison < budget allocation → override: pull from lowest-threat sectors, even if entrenched

### Override Mechanics

Each override is:
```typescript
interface CommanderOverride {
    brigade_id: FormationId;
    from_sector: string;
    to_sector: string;
    reason: 'mission_priority' | 'non_priority_excess' | 'offensive_staging' | 'defensive_critical';
}
```

Overrides modify `assigned_brigade_ids` on sectors AFTER the mechanical pipeline. The brigade's sector assignment changes immediately; the march system moves it physically over subsequent turns.

### Commander Personality Effect

- **Aggressive commander** (aggressiveness ≥ 0.6): concentrates more at offensive staging, accepts thinner defensive coverage
- **Defensive commander** (aggressiveness ≤ 0.4): refuses to thin any sector below minimum, even for offensive operations
- **Competence gate**: low-competence commanders (< 0.35) skip the review entirely — they don't have the strategic vision to override the mechanical assignment

### Supply-Aware Offensive Sizing

When the commander decides to stage an operation with surplus brigades:

- **Adequate supply:** Full operation — up to `MAX_PARTICIPATING_BRIGADES` (12)
- **Strained supply:** Limited operation — max surplus count, shorter planning phase, quicker abort
- **Critical supply:** No operations — all brigades defend

This replaces the current binary gate (strained → upgrade min_attack_outcome) with a graduated response that allows limited counterattacks (Bijela) while preventing reckless offensives.

### Army HQ Override (Rare, Explicit)

Army HQ can issue orders that FORCE the corps commander to commit garrison brigades to an offensive:
```typescript
interface ArmyHQOverride {
    corps_id: string;
    operation_name: string;
    min_brigades: number;
    reason: string; // "Take Brčko corridor at all costs"
}
```

This is stored on `state.military.army_hq_overrides` and consumed by the commander review. When an army HQ override is active, the commander draws from garrison budget to fill the operation, accepting defensive risk.

**Historical examples:**
- Mladić ordering Drina Corps to take Srebrenica (July 1995)
- Halilović ordering 1st Corps breakout attempts (June 1992)
- These were rare, high-stakes decisions with full strategic awareness of the consequences

### Probes and Feints (Army HQ Directed)

Low-cost intelligence operations that don't draw from garrison:
- **Probes:** 1-2 brigades, 1 turn planning, automatic abort if repulsed. Purpose: test enemy defenses, update sector intel.
- **Feints:** 2-3 brigades stage aggressively but don't commit to full attack. Purpose: fix enemy reserves, prevent redeployment.

Both are directed by army HQ (via `standing_orders` in war_timeline or explicit `army_hq_overrides`). The corps commander executes without drawing from garrison budget.

---

## Implementation Steps

1. Add `commanderReviewAssignment()` function in `corps_front_sectors.ts` — runs after budget fill, before `reclassifyRearBrigades`
2. Implement the 4 review criteria (mission compliance, non-priority excess, offensive staging, defensive coherence)
3. Integrate commander personality (aggressiveness, competence)
4. Modify strained supply gate to size operations from surplus count
5. Add `army_hq_overrides` field to `MilitaryState` + army HQ override consumption
6. Add probe/feint operation types to `CorpsOperation`
7. Run `/simplify` between steps
8. Fresh 40w + 52w runs
9. `/war-or-game` approval

## Expected Outcomes

| Issue | Current | After Override |
|-------|---------|---------------|
| SRK sector :0 | 2 brigades | 3-4 (commander pulls from :4) |
| 2KK at Prozor | 6 brigades south | Recalled to Bihać front |
| ARBiH Brčko | Blocked by supply | Limited 3-brigade counterattack |
| VRS Drina over-extension | Uncontrolled | Commander caps non-priority areas |

## Files

| File | Change |
|------|--------|
| `src/sim/combat/corps_front_sectors.ts` | `commanderReviewAssignment()` after budget fill |
| `src/sim/combat/bot_corps_directives.ts` | Supply-aware operation sizing |
| `src/state/game_state.ts` | `army_hq_overrides` field |
| `src/sim/combat/sector_offensive.ts` | Probe/feint operation types |
| `docs/30_planning/BUDGET_BASED_BRIGADE_ALLOCATION.md` | Update with commander override |

## Design Principles

1. **Commander is final authority** — mechanical steps produce a proposal, commander decides
2. **Strategic intent over local optimization** — the commander may accept local risk for strategic gain
3. **Personality matters** — aggressive vs defensive commanders make different trade-offs
4. **Army HQ overrides are rare** — most decisions are corps-level; army steps in only for war-changing operations
5. **Supply constrains scope, not decision** — strained supply reduces operation size, doesn't block all action
