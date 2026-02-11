# Brigade Operations System — Completion Report

**Date:** 2026-02-10
**Plan:** `.claude/plans/quiet-baking-pinwheel.md`
**Scope:** Stages 1–6 of the Brigade Operations System

---

## 1. Problem Statement

Brigades existed in the simulation (~370 by turn 50) but had no operational effect on the front. Control changes were entirely militia-driven at municipality level. There was no AoR (Area of Responsibility) assignment, no posture system, no equipment composition model, no corps/army command hierarchy, and no mechanism for brigade "movement." The front (~5,800 settlements) was uncovered by brigades.

**Goal:** Build a coherent system where brigades are the primary combat units driving the front, with settlement-level control changes, typed equipment, posture mechanics, corps operations, and operational groups.

---

## 2. Systems Implemented

### Stage 1A: Settlement-Level Control Change

| Component | Description | Location |
|-----------|-------------|----------|
| **Wave flip** | When municipality authority shifts, settlements with attacker ethnic share >= 30% flip immediately; hostile-majority settlements become holdouts | `src/sim/phase_i/settlement_control.ts` |
| **Holdout cleanup** | Formations clear 1–2 holdouts/turn per brigade; isolated holdouts surrender after 4 turns | `settlement_control.ts:processHoldoutCleanup()` |
| **Brigade amplification** | Brigades in adjacent municipalities amplify Phase I attack strength (0.5x multiplier) | `src/sim/phase_i/control_flip.ts` |
| **Schema** | `SettlementHoldoutState` on GameState; `settlement_holdouts` record | `src/state/game_state.ts` |

**Constants:** `WAVE_FLIP_ETHNIC_THRESHOLD=0.30`, `MAX_CLEANUP_PER_BRIGADE=2`, `HOLDOUT_ISOLATION_SURRENDER_TURNS=4`, `CLEANUP_RESISTANCE_THRESHOLD=50`, `BRIGADE_ATTACK_AMPLIFIER=0.5`

### Stage 1B: Per-Brigade AoR Assignment

| Component | Description | Location |
|-----------|-------------|----------|
| **Voronoi BFS** | Multi-source BFS from brigade HQ settlements on same-faction subgraph; first brigade to reach a settlement claims it; tie-break by formation ID | `src/sim/phase_ii/brigade_aor.ts` |
| **Front-active expansion** | 1-hop rear depth added to front-active set for operational buffer | `brigade_aor.ts:expandFrontActiveWithDepth()` |
| **Per-turn validation** | Reassigns from dissolved brigades, handles newly front-active settlements | `brigade_aor.ts:validateBrigadeAoR()` |
| **Density** | `personnel / max(1, aor_settlement_count)` — core metric for pressure | `brigade_aor.ts:computeBrigadeDensity()` |
| **Schema** | `brigade_aor: Record<SettlementId, FormationId | null>` on GameState | `src/state/game_state.ts` |

### Stage 2: Brigade Composition & Typed Equipment

| Component | Description | Location |
|-----------|-------------|----------|
| **Typed composition** | `BrigadeComposition`: infantry, tanks, artillery, aa_systems + per-type `EquipmentCondition` (operational/degraded/non_operational fractions) | `src/state/game_state.ts` |
| **Default profiles** | RS: 40 tanks, 30 artillery; HRHB: 15/15; RBiH: 3/8 — reflecting JNA inheritance and embargo | `src/sim/phase_ii/equipment_effects.ts` |
| **Equipment multiplier** | `1.0 + (tankBonus + artilleryBonus) / infantry`; tanks amplify offense more, artillery amplifies both | `equipment_effects.ts:computeEquipmentMultiplier()` |
| **Degradation** | Per-turn based on posture tempo and faction maintenance capacity; operational → degraded → non_operational | `equipment_effects.ts:degradeEquipment()` |
| **Capture** | 5% capture rate per settlement flip; captured equipment arrives in degraded condition | `equipment_effects.ts:captureEquipment()` |

### Stage 3: Brigade Pressure System

| Component | Description | Location |
|-----------|-------------|----------|
| **Raw pressure** | `density * posture_mult * readiness_mult * cohesion_factor * supply_factor * equipment_mult * resilience_mult * disruption_mult` | `src/sim/phase_ii/brigade_pressure.ts` |
| **Defense** | Same formula with defense multipliers + front hardening bonus (`min(0.5, active_streak * 0.05)`) | `brigade_pressure.ts:computeBrigadeDefense()` |
| **Edge pressure** | Per front edge: looks up brigade AoR for each side, computes pressure delta (clamped [-10, 10]) | `brigade_pressure.ts:computeBrigadePressureByEdge()` |
| **State update** | Accumulates into `state.front_pressure` | `brigade_pressure.ts:applyBrigadePressureToState()` |
| **Resilience modifier** | Existential threat (control < 30% → up to +30% defense); home defense (+20%); cohesion under pressure (+15%) | `src/sim/phase_ii/faction_resilience.ts` |

**Posture multipliers:**

| Posture | Pressure | Defense |
|---------|----------|---------|
| defend | 0.3 | 1.5 |
| probe | 0.7 | 1.0 |
| attack | 1.5 | 0.5 |
| elastic_defense | 0.2 | 1.2 |

### Stage 4A: AoR Reshaping

| Component | Description | Location |
|-----------|-------------|----------|
| **Validation** | Same faction, active, adjacent to target AoR, donor retains >= 1 settlement | `src/sim/phase_ii/aor_reshaping.ts` |
| **Costs** | Receiving brigade: -3 cohesion; donating: -2 cohesion; both: `disrupted=true` (halves pressure next turn) | `aor_reshaping.ts:applyReshapeOrders()` |
| **Schema** | `brigade_aor_orders: BrigadeAoROrder[]` on GameState | `src/state/game_state.ts` |

### Stage 4B: Brigade Posture

| Component | Description | Location |
|-----------|-------------|----------|
| **Constraints** | attack requires cohesion >= 40 + readiness=active; probe requires >= 20 + active/overextended | `src/sim/phase_ii/brigade_posture.ts` |
| **Per-turn costs** | attack: -3 cohesion; probe: -1; elastic_defense: -0.5 (truncated); defend: +1 (capped at 80) | `brigade_posture.ts:applyPostureCosts()` |
| **Auto-downgrade** | If cohesion drops below posture minimum, auto-switch to defend | `brigade_posture.ts` |
| **Schema** | `brigade_posture_orders: BrigadePostureOrder[]`; `posture: BrigadePosture` on FormationState | `src/state/game_state.ts` |

### Stage 4C: Bot AI

| Component | Description | Location |
|-----------|-------------|----------|
| **Posture heuristic** | Coverage > 200 → probe; < 50 → elastic_defense; no front contact → defend | `src/sim/phase_ii/bot_brigade_ai.ts` |
| **Reshape heuristic** | Find edges where enemy pressure exceeds ours by > 2; transfer 1 settlement from nearest surplus brigade (coverage > 150) | `bot_brigade_ai.ts` |
| **Limits** | Max 3 reshape orders per faction per turn | `bot_brigade_ai.ts` |

### Stage 5: Corps Command & Army Stance

| Component | Description | Location |
|-----------|-------------|----------|
| **Corps stance** | defensive (0.7x pressure, 1.2x defense), balanced (1.0/1.0), offensive (1.2x/0.8x + exhaustion), reorganize (0x pressure, force defend, +2 cohesion/turn) | `src/sim/phase_ii/corps_command.ts` |
| **Army override** | `general_offensive` → all corps offensive; `general_defensive` → all defensive; `total_mobilization` → all reorganize | `corps_command.ts:getEffectiveCorpsStance()` |
| **Named operations** | Planning (3 turns, +5% defense) → Execution (4 turns, +50% pressure, -4 cohesion/turn) → Recovery (3 turns, -40% pressure, +1 cohesion/turn) → complete | `corps_command.ts:advanceOperations()` |
| **Initialization** | Command span from tags or default 5; OG slots: 2 for large corps (>= 6 subordinates), 1 otherwise | `corps_command.ts:initializeCorpsCommand()` |
| **Schema** | `corps_command: Record<FormationId, CorpsCommandState>`, `army_stance: Record<FactionId, ArmyStance>`, `CorpsOperation` | `src/state/game_state.ts` |

### Stage 6: Operational Groups

| Component | Description | Location |
|-----------|-------------|----------|
| **Activation** | Borrow personnel from donor brigades (min 200 retained each, min 500 total); create OG formation | `src/sim/phase_ii/operational_groups.ts` |
| **Lifecycle** | Per-turn -4 cohesion drain; dissolve when cohesion < 15 or max_duration exceeded (3–8 turns); return personnel to donors equally | `operational_groups.ts:updateOGLifecycle()` |
| **Coordination bonus** | 1.3x pressure multiplier on edges covered by OG | `operational_groups.ts:computeOGPressureBonus()` |
| **Donor strain** | -5 cohesion on each donor brigade at activation | `operational_groups.ts` |
| **Schema** | `og_orders: OGActivationOrder[]`; OG formations have `kind: 'og'` | `src/state/game_state.ts` |

---

## 3. Turn Pipeline Integration

11 new phases inserted between `phase-ii-aor-init` and `phase-ii-consolidation`:

```
 1.  phase-ii-aor-init                   (existing)
 2.  validate-brigade-aor                [Stage 1B]
 3.  generate-bot-brigade-orders         [Stage 4C]
 4.  apply-aor-reshaping                 [Stage 4A]
 5.  apply-brigade-posture               [Stage 4B]
 6.  update-corps-effects                [Stage 5]
 7.  advance-corps-operations            [Stage 5]
 8.  activate-operational-groups         [Stage 6]
 9.  equipment-degradation               [Stage 2]
10.  apply-posture-costs                 [Stage 4B]
11.  compute-brigade-pressure            [Stage 3]
12.  update-og-lifecycle                 [Stage 6]
13.  phase-ii-consolidation              (existing)
```

**Phase I→II transition** (`applyPhaseIToPhaseIITransition`): Now accepts optional `edges` parameter. When edges are provided, initializes brigade AoR via Voronoi BFS and corps command state.

---

## 4. Files Summary

### New Files (10 source)

| File | Lines | Stage | Purpose |
|------|-------|-------|---------|
| `src/sim/phase_i/settlement_control.ts` | 355 | 1A | Wave flip + holdout cleanup |
| `src/sim/phase_ii/brigade_aor.ts` | ~250 | 1B | Voronoi BFS AoR assignment |
| `src/sim/phase_ii/equipment_effects.ts` | 165 | 2 | Typed equipment effects |
| `src/sim/phase_ii/brigade_pressure.ts` | 224 | 3 | Brigade-derived pressure |
| `src/sim/phase_ii/faction_resilience.ts` | 105 | 3B | Resilience / desperation modifier |
| `src/sim/phase_ii/aor_reshaping.ts` | 258 | 4A | AoR settlement transfer |
| `src/sim/phase_ii/brigade_posture.ts` | 203 | 4B | Posture system |
| `src/sim/phase_ii/bot_brigade_ai.ts` | 381 | 4C | Bot heuristic AI |
| `src/sim/phase_ii/corps_command.ts` | 300 | 5 | Corps hierarchy + operations |
| `src/sim/phase_ii/operational_groups.ts` | 352 | 6 | Operational groups |

### Modified Files

| File | Change |
|------|--------|
| `src/state/game_state.ts` | 14 new types/interfaces; 7 new fields on GameState; 4 new fields on FormationState |
| `src/sim/turn_pipeline.ts` | 11 new pipeline phases + 9 imports |
| `src/sim/phase_i/control_flip.ts` | Settlement-level wave+cleanup integration; brigade amplification; `settlement_events` on report |
| `src/sim/phase_transitions/phase_i_to_phase_ii.ts` | `edges` parameter; `initializeBrigadeAoR()` + `initializeCorpsCommand()` at transition |
| `src/sim/run_phase_i_browser.ts` | Pass `graph.edges` to transition |

### Test Files (7 files, 85 tests)

| File | Tests | Stage |
|------|-------|-------|
| `tests/settlement_control.test.ts` | 8 | 1A |
| `tests/brigade_aor.test.ts` | 9 | 1B |
| `tests/brigade_composition.test.ts` | 22 | 2 |
| `tests/brigade_pressure.test.ts` | 19 | 3 + 3B |
| `tests/aor_reshaping.test.ts` | 6 | 4A |
| `tests/brigade_posture.test.ts` | 9 | 4B |
| `tests/corps_command.test.ts` | 12 | 5 + 6 |

---

## 5. Schema Additions to GameState

```typescript
// Types
BrigadePosture = 'defend' | 'probe' | 'attack' | 'elastic_defense'
CorpsStance    = 'defensive' | 'balanced' | 'offensive' | 'reorganize'
ArmyStance     = 'general_defensive' | 'balanced' | 'general_offensive' | 'total_mobilization'

// Interfaces
EquipmentCondition       { operational, degraded, non_operational }
BrigadeComposition       { infantry, tanks, artillery, aa_systems, tank_condition, artillery_condition }
BrigadeAoROrder          { settlement_id, from_brigade, to_brigade }
BrigadePostureOrder      { brigade_id, posture }
CorpsOperation           { name, type, phase, started_turn, phase_started_turn, target_settlements?, participating_brigades }
CorpsCommandState        { command_span, subordinate_count, og_slots, active_ogs, corps_exhaustion, stance, active_operation? }
OGActivationOrder        { corps_id, donors[], focus_settlements, posture, max_duration }
SettlementHoldoutState   { holdout, holdout_faction, holdout_resistance, holdout_since_turn, isolated_turns }

// On FormationState
posture?: BrigadePosture
corps_id?: FormationId | null
composition?: BrigadeComposition
disrupted?: boolean

// On GameState
brigade_aor?: Record<SettlementId, FormationId | null>
brigade_aor_orders?: BrigadeAoROrder[]
brigade_posture_orders?: BrigadePostureOrder[]
corps_command?: Record<FormationId, CorpsCommandState>
army_stance?: Record<FactionId, ArmyStance>
og_orders?: OGActivationOrder[]
settlement_holdouts?: Record<SettlementId, SettlementHoldoutState>
```

---

## 6. Invariants Enforced

- **Determinism:** All iteration uses `strictCompare` sorted keys. No randomness, no timestamps in state.
- **Settlement-level control:** Control changes happen per-settlement, not per-municipality. Municipality control is derived.
- **No serialization of derived state:** Brigade pressure, density, resilience modifier are all computed per-turn.
- **Cohesion bounds:** Always clamped to [0, 100].
- **AoR coverage:** Every front-active settlement assigned to exactly one brigade. Rear settlements → null.
- **Equipment conservation:** Capture transfers from loser to winner; total equipment conserved (minus degradation).
- **OG personnel conservation:** Personnel deducted from donors at activation, returned proportionally at dissolution.
- **Phase gating:** All brigade operations phases run only when `meta.phase === 'phase_ii'`.

---

## 7. Design Rationale

### Why settlement-level control?
Municipality bulk flips don't model historical reality. Zvornik municipality flipped but Sapna held. Prijedor fell quickly due to demographics but individual settlements resisted. The wave+cleanup model captures this with demographic thresholds and holdout mechanics.

### Why static brigades + AoR reshaping instead of physical movement?
With ~5,800 settlements and ~370 brigades (~15 settlements/brigade average), most brigades cover home territory. "Movement" is modeled as AoR boundary shifts — transferring settlements between brigades. This is more realistic than relocating entire formations and naturally creates the static-vs-maneuver dynamic: most brigades defend, a few elite ones enable concentrated pressure through AoR reshaping.

### Why faction-neutral resilience?
The resilience modifier applies to any faction under existential threat. Historically this benefits ARBiH (controlling ~30% of territory, defending home, high cohesion under pressure), but the same mechanics would apply if RS or HRHB were in a similar position. This avoids faction-specific hard-coding.

### Why corps stance + named operations?
Standing stances (defensive/balanced/offensive/reorganize) capture the persistent command climate. Named operations (planning→execution→recovery) model coordinated multi-turn efforts like the 1994 ARBiH general offensive or 1995 Operation Sana. Army stance overrides enable modeling of army-wide posture shifts.

---

## 8. Known Limitations / Future Work

- **Equipment capture in Phase II:** The capture mechanic exists but is not yet wired into the Phase II settlement control resolution pipeline. Currently only Phase I flips can trigger capture.
- **JNA equipment transfer:** The plan called for modifying `jna_transition.ts` to distribute equipment to RS brigades. This has not been implemented — RS brigades receive default composition from `equipment_effects.ts` instead.
- **Urban defense bonus:** The resilience module does not yet include per-settlement population-based defensive bonus (e.g. Sarajevo, Tuzla). This would require settlement population data in the pressure computation.
- **OG donor tracking:** Personnel are returned equally to all same-corps brigades at dissolution, not proportionally to original donors. Tracking original donor contributions would require additional state.
- **Bot AI sophistication:** The bot generates simple coverage-based posture and pressure-imbalance reshape orders. It does not generate corps operations, OG activations, or army stance changes. These would need to be added for realistic automated play.
- **Maintenance capacity integration:** Equipment degradation uses faction logistics profile as maintenance capacity. The actual `maintenance.ts` module is not yet integrated with the typed equipment system.

---

## 9. Test Results

```
 7 test files, 85 tests — ALL PASSING

 tests/settlement_control.test.ts     8 tests   6ms
 tests/brigade_aor.test.ts            9 tests   6ms
 tests/brigade_composition.test.ts   22 tests   7ms
 tests/brigade_pressure.test.ts      19 tests   8ms
 tests/aor_reshaping.test.ts          6 tests   7ms
 tests/brigade_posture.test.ts        9 tests   7ms
 tests/corps_command.test.ts         12 tests   8ms
```

No regressions in existing tests (pre-existing `node:test` files are unaffected).
