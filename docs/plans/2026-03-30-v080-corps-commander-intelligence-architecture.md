# v0.8.0 Corps Commander Intelligence Architecture

**Status:** ARCHITECTURE / DESIGN REFERENCE  
**Roadmap slot:** v0.8.0  
**Use this document for:** architecture, model boundaries, migration rationale, and deletion targets  
**Do not use this document as the sole execution plan.** Active execution is governed by:
- `docs/plans/2026-03-30-p0-combat-drought-fix.md` for live stabilization
- `docs/plans/2026-03-31-v081-commander-maturity-plan.md` for post-stabilization commander deepening
- `docs/plans/2026-03-31-v08x-command-authority-cleanup-plan.md` for singular-ownership cleanup

## Intelligence Assurance

This is how the project should decide whether the corps commanders are genuinely intelligent or just better-organized railroads.

### What must be true

- commanders reason from a persistent belief state, not only current raw truth
- multiple candidate intents are generated and scored, not just one path evaluated in isolation
- prior outcomes change future decisions through lessons or memory
- hard constraints and soft preferences are distinct in the decision model
- the execution bridge does not silently replace or nullify commander intent
- structured decision traces exist for every major corps decision

### What does NOT count as intelligence

- more personality flavor text
- more thresholds with no competing intents
- hidden doctrine rails dressed up as preferences
- downstream systems quietly overriding commander choices
- corps-name special cases that fake good behavior

### Required proof

- two similar corps with different personalities make different but still legible choices in the same broad situation
- a commander that fails in one zone becomes more cautious there later for a visible reason
- a commander under degraded intel behaves differently from one with strong confidence
- a rejected intent can be explained as impossible, unattractive, or politically blocked
- post-run traces can explain why a corps attacked, waited, redirected, or refused

### Anti-theater rule

If the system cannot explain a decision in structured terms, or if the explanation does not match the actual execution path, treat that as failure. Good prose is not evidence of intelligence.

## Problem

The current engine uses a 114-step pipeline with 15+ separate brigade movement systems that fight each other. Each system was added to patch a specific bug. Result: Sarajevo's garrison marches to Breza, 44% of operations have zero attacks, besieged corps launch offensives 100km away.

The concurrent ops change (n1211) exposed the fragility: allowing multiple ops per corps caused more aggressive brigade redistribution, emptying Sarajevo by turn 11. 1200+ prior runs never showed this because the single-op cap accidentally prevented it.

## Architecture: PERCEIVE → DECIDE → EXECUTE

Replace the flat 114-step pipeline with three phases. Current 114 steps → ~55.

### Phase 1: PERCEIVE (World State)

Pure functions computing what the world looks like. ~20 grouped steps.

Produces `TurnSituation` — immutable snapshot containing SpatialContext, supply, sectors, intel, faction state. This becomes the AI player's prompt context.

### Phase 2: DECIDE (Commander Loop)

One `CorpsCommander` per corps, replacing 15 separate systems. ~5 steps total.

The commander runs a 5-phase loop:
1. **ASSESS** — zones, threats, force evaluation
2. **ALLOCATE** — garrison first (posture-dependent budget), surplus to pool
3. **PLAN** — multi-turn intentions ("take Jajce in 4 weeks")
4. **DECIDE** — react to intel, shift reserves, adjust stance
5. **EMIT** — produce CorpsDirective, operations, stances (same interface as today)

### Phase 3: EXECUTE (Resolution & Effects)

Combat resolution, attrition, morale, displacement, political. ~25 steps. Unchanged.

## Commander State (Persistent)

```
CommanderState
  ├─ zone_assessment: ZoneAssessment     (territory partitioned into zones)
  ├─ threat_assessment: ThreatAssessment (where is danger)
  ├─ force_assessment: ForceAssessment   (what can I fight with)
  ├─ current_plan: CommanderPlan | null  (multi-turn intention)
  ├─ sector_activity_log[]               (quiet/active/contested over time)
  ├─ operation_history[]                 (what worked, what failed)
  ├─ intel_picture                       (accumulated confidence per zone)
  └─ garrison_budget: Map<zone, number>  (min brigades per zone)
```

Lives on CorpsCommandState in game_state.ts.

## Zone Assessment

Corps territory partitioned by connected component from SpatialContext. Each zone:
- front_edges, depth, corridor_width (narrowest connection to main body)
- population_value (co-ethnic population at risk)
- strategic_value (chokepoints, connectivity)
- garrison_budget (posture-dependent: besieged=8, defending=12, balanced=15, projecting=20 edges/brigade)
- is_besieged: corridor_width < 2 OSIDs (Game Designer recommendation — graph connectivity, not encirclement ratio)

**Commitment ratio** (War-or-Game): SRK isn't besieged but is fully committed (~5 edges/brigade). High commitment = zero surplus even if not encircled.

## Force Evaluation

Not all brigades are equal:
- fitness_offense: personnel × supply × cohesion × equipment_priority × (not disrupted)
- fitness_defense: personnel × supply × cohesion × (1 + entrenchment) × 0.5
- fitness_garrison: even depleted brigades can garrison (floor 0.2)

Elite/mechanized brigades → schwerpunkt (main effort). Depleted rifle-only → garrison. Equipment class from existing resolveEquipmentClass.

Tiered assignment (Decisive Campaigns pattern): tier 1 (main effort), tier 2 (active defense), tier 3 (garrison/reserve).

## Population Protection

Zones with high co-ethnic population get higher garrison_budget. During DECIDE phase, if zone is under threat AND has co-ethnic population above threshold, commander refuses to abandon regardless of military logic (hold_osids unconditional). Uses existing getCoEthnicShare from ethnic_defense.ts.

## Operation Intelligence

- **Reachability at launch** (P0): brigade must BFS-reach staging through friendly territory. Kills 44% zero-attack problem.
- **Static garrison holdback**: garrison brigades do NOT participate in ops. Period.
- **Zone surplus as ceiling**: size ops to objectives, fill from zones by priority. Surplus of 3 doesn't mean 3-brigade op.
- **Minimum force**: 3 brigades floor, scale to estimated defender × 2.5 (War-or-Game).
- **Pre-planned ops**: drop unreachable brigades per-axis, don't cancel entire op.
- **Mid-op zone transition**: release recalled brigades, re-evaluate viability. Do NOT auto-abort.
- **Culmination point**: if casualties > threshold AND progress < threshold, recommend cancellation.

## Multi-Turn Planning

CommanderPlan: "I want Jajce in 4 weeks, need 5 brigades concentrated."
- Status: concentrating → ready → executing → suspended → abandoned
- Each turn: advance concentration, check viability, respond to situation changes
- Besieged corps can plan LOCAL breakout ops (within 2 hops of zone boundary) but NOT distant offensives. 5th Corps Bihac was aggressive from encirclement — transfer lock ≠ operation lock.

## Intel Consumption

- Read OPSEC offensive_signs and concentration detection
- Shift reserves to threatened sectors BEFORE enemy attacks
- Track sector activity over time (quiet/active/contested)
- Plan based on what commander knows, not omniscient state (light staleness, not full fog)

## Personality Parameters (Deterministic)

Per Decisive Campaigns: Barbarossa pattern:
- aggression: willingness to attack at marginal ratios (0.7 = attacks at 1.3:1)
- caution: reserve holdback fraction (0.4 = holds 40% surplus as reserve)
- initiative: exploits unexpected opportunities

These are deterministic constants per officer, producing consistent calibratable behavior.

## What Gets Deleted

| Old System | Replacement |
|---|---|
| SIEGE_EXEMPT_CORPS | Zone besieged check |
| isSiegeCorps / enclaveFraction | Zone posture |
| DRIFT_RECALL_MAX_HOPS | Commander ALLOCATE (brigade in besieged zone stays) |
| POCKET_EVACUATION_MAX_TERRITORY | Zone surplus/deficit |
| FAR_FROM_HOME_LINE_THRESHOLD | Zone assignment |
| evaluateHomeReturn exemptions | Commander ALLOCATE |
| Enclave movement tags | Zone besieged flag |
| 15 separate brigade movement systems | ONE commander decision loop |
| 1400-line generateCorpsDirectives | 5-phase commander loop |

## New Files

```
src/sim/combat/commander/
  ├─ commander_state.ts    (types: CommanderState, ZoneAssessment, etc.)
  ├─ commander_loop.ts     (5-phase decision loop)
  ├─ assess.ts             (zones, threats, force eval)
  ├─ allocate.ts           (garrison budget, surplus)
  ├─ plan.ts               (multi-turn intentions)
  ├─ decide.ts             (reactive intel, stance)
  ├─ emit.ts               (produce CorpsDirective)
  ├─ briefing.ts           (assemble inputs)
  └─ force_eval.ts         (brigade fitness scoring)
```

## AI Player Interface

```typescript
interface ICorpsCommander {
  decide(briefing: CommanderBriefing, state: CommanderState): CommanderOutput;
}

class BotCorpsCommander implements ICorpsCommander { /* deterministic logic */ }
class AiApiCorpsCommander implements ICorpsCommander { /* LLM via API */ }
class PlayerCorpsCommander implements ICorpsCommander { /* UI input */ }
```

Same input, same output, different implementation. TurnSituation = prompt. CommanderOutput = structured response.

## Migration Plan (Incremental, Per-Commit Calibration)

1. Type definitions (no behavior change)
2. Extract buildBriefing() — assemble all inputs
3. Extract ASSESS phase — zones, threats, force eval
4. Extract ALLOCATE phase — garrison budgets, surplus (THIS fixes Sarajevo)
5. Extract PLAN phase — multi-turn intentions (genuinely new)
6. Extract DECIDE phase — intel reactive
7. Extract EMIT phase — produce existing interface types
8. Wire commander loop, replace generateCorpsDirectives
9. Add CommanderState to game_state.ts
10. Delete old code (phased removal of patch systems)

Each step: one commit, tsc clean, vitest pass, 40w calibration check.

## Wargame Design Patterns Applied

| Pattern | Source | How Used |
|---|---|---|
| Two-pass allocation | Grigsby War in the East | Defense min first, surplus to offense |
| Commander personality | Decisive Campaigns: Barbarossa | Deterministic traits filter intent |
| Objective scoring | Strategic Command WWII | f(value, ratio, supply, distance) |
| Situation re-evaluation | Command Ops 2 | Cancel zombie ops when situation changes |
| Pocket economics | Unity of Command | Expensive for both sides, breakout possible |
| Posture as garrison | AGEOD Civil War II | Stance IS the garrison mechanic |

## AWWV-Unique: Negative-Sum Design

"None of these games truly model a war where everyone loses. The corps AI should internalize that attacking is usually a bad idea, that holding ground costs less than taking it, and that the 'right' move is often to do nothing." — Wargame Expert

The Bosnian War was defined by static fronts, attritional sieges, and occasional sharp offensives. The commander should reflect that rhythm.

## Expert Panel

- **Game Designer**: Corridor-width besieged detection. Posture-dependent garrison budgets. Besieged zones allow local ops. Feed into doctrine, don't replace. Remove patches in 3 phases.
- **War-or-Game**: 1st Corps was two commands. SRK needs commitment ratio. Bihac aggressive from encirclement. Inter-corps transfers need army override. Min 3 brigades for ops.
- **Operations Expert**: Reachability at launch (P0). Static holdback (P1). Zone surplus as ceiling. Don't auto-abort on zone transition. Add zone fatigue modifier.
- **Modern Wargame Expert**: Grigsby two-pass, DC:B personality, SC objective scoring, CO2 re-evaluation, UoC pocket economics, AGEOD posture.
- **Technical Architect**: PERCEIVE→DECIDE→EXECUTE. ICorpsCommander interface. Shadow mode migration. 114→55 steps. 15 systems → 1 commander loop.

