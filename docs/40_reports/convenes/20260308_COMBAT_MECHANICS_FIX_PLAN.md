# Combat Mechanics Fix Plan — 6 Phases [EXECUTED]

**Date**: 2026-03-08
**Owner**: Orchestrator
**Source**: N292 Combat Mechanics Report (2026-03-07)
**Scope**: Fix all 8 issues identified in the combat audit
**Status**: All 6 phases implemented, tests passing (365/365). Pending: validation run (n293).

---

## Execution Summary

All 6 phases implemented in 3 parallel batches:
- **Batch A** (parallel): Phase 1 + Phase 3 — equipment loss fix + supply embargo
- **Batch B** (parallel): Phase 2 + Phase 4 — brigade dissolution + fatigue rebalance
- **Batch C** (parallel): Phase 5 + Phase 6 — siege attrition + cohesion/enclave/OOB

**Key discovery during execution**: Equipment loss infrastructure was already fully wired (battle_resolution.ts had `applyEquipmentBattleLoss()`, `recordEquipmentLoss()`, and casualty calculation with `tanks_lost`/`artillery_lost`). The actual bug was `Math.floor()` on sub-1.0 products producing zero. Fix: increased rates (0.02→0.08 tanks, 0.01→0.04 artillery) + changed to `Math.round()`.

## Original Plan

Six execution phases, ordered by priority and dependency. Each phase follows the same cadence:

1. **Implementation** (agent team with Paradox roles)
2. **Tests** (Vitest + typecheck)
3. **/simplify** (code review)
4. **Documentation** (master, canon, technical docs, napkin)
5. **Commit** (single atomic commit per phase)

After all 6 phases: **40w validation run** (n293) to verify fixes against n292 baseline.

---

## Dependency Graph

```
Phase 1 (Equipment Attrition) ──┐
Phase 2 (Brigade Dissolution) ──┤── Phase 5 (Siege Casualties) ── Phase 7 (Validation Run)
Phase 3 (Supply Rebalance) ─────┘         │
Phase 4 (Fatigue Rebalance) ──────────────┘
Phase 6 (Cohesion + Enclave + OOB) ───────┘
```

Phases 1-4 are independent and can be parallelized in pairs (1+3, 2+4). Phase 5 depends on Phase 3 (supply must be correct before siege casualties make sense). Phase 6 is independent.

---

## Phase 1: Equipment Attrition (P0)

### Problem
Zero equipment destroyed across 168 battles. `degradeEquipment()` exists but is never called. `TANK_LOSS_RATE`/`ARTILLERY_LOSS_RATE` constants defined but unused. VRS heavy weapon superiority never degrades.

### Existing Infrastructure
- `src/sim/combat/equipment_effects.ts`: `degradeEquipment(formation, posture, maintenanceCapacity)` — fully implemented, never wired
- `src/sim/combat/battle_resolution.ts`: `TANK_LOSS_RATE=0.02`, `ARTILLERY_LOSS_RATE=0.01` — defined, unused
- `src/state/casualty_ledger.ts`: `recordEquipmentLoss()` — stub, never called
- `tests/brigade_composition.test.ts`: existing test coverage for degradation math

### Plan

**Step 1.1 — Wire `degradeEquipment()` into war pipeline**
- File: `src/sim/turn_phases/war_phases.ts`
- Add new NamedPhase `apply-equipment-degradation` after `apply-vrs-equipment-decay`
- Iterate all active brigades, call `degradeEquipment(formation, derivedPosture, maintenanceFromSupply)`
- Maintenance capacity derived from faction supply state: adequate=1.0, strained=0.6, critical=0.3

**Step 1.2 — Add battle equipment losses**
- File: `src/sim/combat/battle_resolution.ts`
- After casualty application, apply equipment losses:
  - `tanks_lost = floor(tanks * TANK_LOSS_RATE * intensity)`
  - `artillery_lost = floor(artillery * ARTILLERY_LOSS_RATE * intensity)`
  - `intensity` = outcome severity scalar (decisive=1.5, victory=1.2, costly=1.0, stalemate=0.5, repulsed=0.3)
  - Apply to BOTH attacker and defender (attacker at higher rate)
- Wire `recordEquipmentLoss()` in casualty_ledger to track losses

**Step 1.3 — Equipment condition cascade**
- File: `src/sim/combat/equipment_effects.ts`
- Battle losses reduce `operational` count first, then `degraded`
- Degraded equipment has 50% chance of becoming non_operational each turn (deterministic: use formation index % 2)
- Non-operational equipment is destroyed after 4 turns without maintenance (new counter)

**Step 1.4 — Tests**
- Extend `tests/brigade_composition.test.ts`:
  - Test battle loss calculation at each outcome severity
  - Test degradation pipeline integration
  - Test equipment condition cascade
  - Test casualty ledger recording
- Run `npm run test:vitest` + `npm run typecheck`

### Team
- **Game Designer**: Validate loss rates and intensity scalars against historical VRS equipment degradation arc
- **Gameplay Programmer**: Implement Steps 1.1-1.3
- **QA Engineer**: Write tests (Step 1.4)
- **Historian**: Confirm VRS started with ~400 tanks, lost ~30% by 1995; ARBiH heavy weapons stayed scarce

### Determinism Safeguards
- No randomness — intensity scalar is deterministic from battle outcome
- Sorted iteration over formations (existing pattern)
- Equipment counts are integers; use `Math.floor()` for losses

### Constants to Add/Modify
```typescript
// battle_resolution.ts (existing, activate)
TANK_LOSS_RATE = 0.02        // 2% per battle per intensity unit
ARTILLERY_LOSS_RATE = 0.01   // 1% per battle per intensity unit

// equipment_effects.ts (new)
OUTCOME_INTENSITY = { decisive: 1.5, victory: 1.2, costly_victory: 1.0, stalemate: 0.5, repulsed: 0.3, catastrophic: 0.2 }
ATTACKER_EQUIPMENT_LOSS_MULT = 1.3  // Attackers lose 30% more equipment
MAINTENANCE_CAPACITY_BY_SUPPLY = { adequate: 1.0, strained: 0.6, critical: 0.3 }
```

### After Implementation
1. /simplify
2. Update docs: `docs/20_engineering/REPO_MAP.md` (equipment pipeline), `docs/10_canon/systems_manual.md` (equipment attrition rules), napkin
3. Commit: `feat: equipment attrition — wire degradation pipeline + battle losses`

---

## Phase 2: Brigade Dissolution (P0)

### Problem
Brigades with 0 cohesion, 0 morale, <200 personnel remain active indefinitely. No automatic dissolution mechanic. The 65th Protection Regiment fights as a zombie with 169 personnel.

### Existing Infrastructure
- `src/sim/formation_lifecycle_events.ts`: Has `'disband'` action and `'personnel_collapse'` trigger (< 100 personnel)
- `src/state/formation_lifecycle.ts`: `deriveReadinessState()` — readiness from cohesion/fatigue
- `src/state/game_state.ts`: `lifecycle_status: 'destroyed'`, `status: 'inactive'`
- Battle resolution already sets `personnel=0, status='inactive'` when no retreat path exists

### Plan

**Step 2.1 — Add combat-ineffective dissolution phase**
- File: `src/sim/combat/brigade_dissolution.ts` (new)
- New function `dissolveCombatIneffectiveBrigades(state: GameState): DissolutionReport`
- Dissolution criteria (ALL must be true):
  - `personnel < DISSOLUTION_PERSONNEL_THRESHOLD` (200)
  - `cohesion < DISSOLUTION_COHESION_THRESHOLD` (10)
  - `readiness === 'degraded'`
- On dissolution:
  - `status = 'inactive'`
  - `lifecycle_status = 'destroyed'`
  - Remaining personnel added to faction's strategic reserve (they disperse, some reintegrate)
  - Equipment redistributed to nearest same-faction brigade in same corps (if any) via existing capture logic
  - Record in casualty_ledger as `dissolved` (new category)
  - Log dissolution in `brigade_history`

**Step 2.2 — Wire into war pipeline**
- File: `src/sim/turn_phases/war_phases.ts`
- Add `check-brigade-dissolution` phase after `apply-frontline-attrition` and before `derive-readiness`
- Runs every turn

**Step 2.3 — Garrison unit protection**
- File: `src/state/game_state.ts` (FormationState)
- Add optional `garrison: boolean` field to OOB
- Garrison units (like 65th Protection Regiment) are excluded from frontline assignment by bot AI
- They can still defend their home OSID if directly attacked but are never sent to front
- File: `data/source/oob/rbih_oob.json` — flag 65th Protection Regiment as `garrison: true`

**Step 2.4 — Tests**
- New test file: `tests/brigade_dissolution.test.ts`
  - Test dissolution triggers at boundary conditions
  - Test personnel redistribution to strategic reserve
  - Test equipment redistribution
  - Test garrison protection exclusion
  - Test that dissolution is deterministic (sorted iteration)
- Run `npm run test:vitest` + `npm run typecheck`

### Team
- **Game Designer**: Validate dissolution thresholds (200 pers + 10 cohesion + degraded)
- **Gameplay Programmer**: Implement Steps 2.1-2.3
- **QA Engineer**: Write tests (Step 2.4)
- **Historian**: Confirm historical brigade dissolutions (e.g., HVO brigades in central Bosnia 1993-94)

### Determinism Safeguards
- Sorted iteration over formations by ID (strictCompare)
- Equipment redistribution: deterministic nearest-brigade selection (by OSID graph distance, tie-break by formation ID)
- Personnel to strategic reserve: exact integer transfer

### Constants to Add
```typescript
// brigade_dissolution.ts (new)
export const DISSOLUTION_PERSONNEL_THRESHOLD = 200;
export const DISSOLUTION_COHESION_THRESHOLD = 10;
export const DISSOLUTION_EQUIPMENT_TRANSFER_RATE = 0.7;  // 70% of equipment salvaged
export const DISSOLUTION_PERSONNEL_TO_RESERVE_RATE = 0.5; // 50% rejoin pool
```

### After Implementation
1. /simplify
2. Update docs: Systems Manual (brigade lifecycle), REPO_MAP (new file), napkin
3. Commit: `feat: brigade dissolution — auto-dissolve combat-ineffective units`

---

## Phase 3: Supply Rebalance — RBiH Embargo (P0)

### Problem
RBiH general supply reaches 100% despite historical arms embargo. Patron aid (3.6-7.2/turn) massively exceeds maintenance drain (~0.225/turn). ARBiH was the most supply-constrained force in the war.

### Existing Infrastructure
- `src/state/supply_reserves.ts`: Full supply pipeline with patron aid, embargo multipliers, siege drain
- `src/state/supply_reserve_constants.ts`: All constants
- `src/state/war_timeline.ts`: `EquipmentDecayConfig` and patron commitment profiles
- Embargo system exists but doesn't effectively constrain RBiH

### Plan

**Step 3.1 — Add embargo effectiveness cap for RBiH**
- File: `src/state/supply_reserve_constants.ts`
- New constant: `EMBARGO_SUPPLY_CAP_BY_FACTION` — maximum general supply achievable under embargo
  - RBiH: 45 (historically never had adequate supply; always strained/critical)
  - RS: 90 (Serbia provided steady resupply, slight logistical friction)
  - HRHB: 70 (Croatia provided material but limited by corridor access)
- File: `src/state/supply_reserves.ts`
- In `updateSupplyReserves()`, after income calculation, clamp: `Math.min(cap, computed)`

**Step 3.2 — Rebalance patron aid rates**
- File: `src/state/supply_reserve_constants.ts`
- Reduce `PATRON_AID_SCALE` from 12 to 6 (halve base patron income)
- Add faction-specific patron efficiency: RBiH=0.3, RS=0.8, HRHB=0.6
  - Reflects: embargo blocks most RBiH external supply; Serbia has direct land border to RS; Croatia has corridor constraints to HRHB
- Net effect: RBiH patron aid = 0.3 × 6 × commitment = 0.54-1.08/turn (was 3.6-7.2)

**Step 3.3 — Increase RBiH maintenance drain**
- File: `src/state/supply_reserve_constants.ts`
- `MAINTENANCE_DRAIN_PER_FORMATION` stays at 0.045 (correct for RS/HRHB)
- Add `MAINTENANCE_DRAIN_FACTION_MULT`: RBiH=1.5 (larger army, worse logistics), RS=1.0, HRHB=1.2
- This increases RBiH drain proportionally to their larger formation count

**Step 3.4 — Timeline-driven embargo relaxation**
- File: `data/scenarios/timelines/apr1992.json`
- Add embargo timeline entries:
  - w0-w52: Full embargo (cap applies)
  - w52-w104: Slight relaxation (smuggling routes mature; cap += 10)
  - w104+: Further relaxation (pipeline improvements; cap += 15)
- Wire via existing `war_timeline` infrastructure

**Step 3.5 — Tests**
- Extend `tests/supply_reserves.test.ts`:
  - Test embargo cap prevents RBiH from exceeding 45
  - Test patron efficiency per faction
  - Test timeline-driven cap changes
  - Test that RS/HRHB supply behavior unchanged at broad level
- Run `npm run test:vitest` + `npm run typecheck`

### Team
- **Game Designer**: Validate embargo cap values against historical ammunition shortage reports
- **Gameplay Programmer**: Implement Steps 3.1-3.4
- **QA Engineer**: Write tests (Step 3.5)
- **Historian**: Confirm ARBiH supply constraints — cite Balkan Battlegrounds on ammunition rationing, weapon shortages, black market procurement rates

### Determinism Safeguards
- Pure arithmetic; no randomness
- Timeline values from deterministic JSON

### Constants to Add/Modify
```typescript
// supply_reserve_constants.ts
export const PATRON_AID_SCALE = 6;  // was 12
export const PATRON_AID_FACTION_EFFICIENCY: Record<string, number> = {
    RBiH: 0.3, RS: 0.8, HRHB: 0.6
};
export const EMBARGO_SUPPLY_CAP: Record<string, number> = {
    RBiH: 45, RS: 90, HRHB: 70
};
export const MAINTENANCE_DRAIN_FACTION_MULT: Record<string, number> = {
    RBiH: 1.5, RS: 1.0, HRHB: 1.2
};
```

### After Implementation
1. /simplify
2. Update docs: Systems Manual (supply embargo), SUPPLY_DESIGN.md, REPO_MAP, napkin
3. Commit: `feat: supply rebalance — RBiH embargo cap + patron efficiency`

---

## Phase 4: Fatigue Rebalance (P1)

### Problem
98% of brigades have fatigue at zero. Recovery (-1 every 2 turns) outpaces accumulation (+0.5/turn frontline, +2/+1 per battle). Fatigue has zero practical combat impact.

### Existing Infrastructure
- `src/state/formation_fatigue.ts`: Full system — accumulation, recovery, reporting
- `src/sim/combat/combat_math.ts`: `getFatigueMult()` — multiplier from fatigue
- `src/state/formation_constants.ts`: `FATIGUE_MAX=30`
- Recovery: `-1` every 2 turns (FATIGUE_RECOVERY_INTERVAL=2)
- Frontline: `FRONTLINE_FATIGUE_PER_TURN=0.5`

### Plan

**Step 4.1 — Increase frontline fatigue accumulation**
- File: `src/state/formation_fatigue.ts`
- Change `FRONTLINE_FATIGUE_PER_TURN` from 0.5 to 1.5
- Rationale: frontline duty is exhausting; 1.5/turn means a permanently frontline brigade accumulates 60 fatigue points over 40 weeks, but recovery brings equilibrium to ~15 (meaningful multiplier)

**Step 4.2 — Reduce recovery rate**
- File: `src/state/formation_fatigue.ts`
- Change `FATIGUE_RECOVERY_INTERVAL` from 2 to 3 (recover -1 every 3 turns instead of every 2)
- Add recovery condition: only recover if NOT on frontline this turn
  - Brigades on continuous frontline duty never recover — they must be rotated to rear
  - This creates strategic tension: rotate exhausted units vs. hold the line

**Step 4.3 — Add combat fatigue scaling**
- File: `src/sim/combat/battle_resolution.ts`
- Scale combat fatigue by engagement intensity:
  - Attacker: `2 * intensity_scalar` (decisive=1.5, costly=1.3, stalemate=1.0, repulsed=0.8)
  - Defender: `1 * intensity_scalar`
- High-intensity battles exhaust units faster

**Step 4.4 — Tests**
- Extend existing fatigue tests:
  - Test that frontline brigade reaches fatigue 10+ within 10 turns
  - Test that recovery only works for rear brigades
  - Test combat fatigue scaling per outcome
  - Test equilibrium point for continuously frontline brigade (~15-20)
- Run `npm run test:vitest` + `npm run typecheck`

### Team
- **Game Designer**: Validate fatigue equilibrium targets (frontline ~15-20 after 20 weeks)
- **Gameplay Programmer**: Implement Steps 4.1-4.3
- **QA Engineer**: Write tests (Step 4.4)

### Determinism Safeguards
- Pure arithmetic; existing sorted iteration patterns

### Constants to Modify
```typescript
// formation_fatigue.ts
FRONTLINE_FATIGUE_PER_TURN = 1.5   // was 0.5
FATIGUE_RECOVERY_INTERVAL = 3      // was 2
// Recovery gated: only if not front-assigned this turn
```

### After Implementation
1. /simplify
2. Update docs: Systems Manual (fatigue), formation_constants reference, napkin
3. Commit: `fix: fatigue rebalance — increase accumulation, gate recovery on rotation`

---

## Phase 5: Siege Bombardment Casualties (P1)

### Problem
Casualty ratio is inverted: RS KIA > RBiH KIA (1.22:1). Historically ARBiH suffered 1.5-2x VRS casualties due to siege bombardment (Sarajevo, enclaves). No passive siege casualty mechanic exists outside formal battles.

### Existing Infrastructure
- `src/sim/combat/frontline_attrition.ts`: Passive attrition with bombardment exposure (`BOMBARDMENT_EXPOSURE_RATE=0.008`)
- `src/sim/combat/combat_math.ts`: `getBombardmentCasualtyMult()` — scales defender casualties by attacker firepower
- `src/state/supply_reserves.ts`: `siege_turn_counters` — per-OSID siege duration tracking
- Siege drain already reduces supply; need to add direct personnel attrition

### Plan

**Step 5.1 — Add siege bombardment attrition phase**
- File: `src/sim/combat/siege_attrition.ts` (new)
- New function `applySiegeBombardmentAttrition(state: GameState): SiegeAttritionReport`
- For each besieged OSID (siege_turn_counter > 0):
  - Find defending brigades at that OSID
  - Calculate incoming firepower from adjacent enemy brigades (artillery + tanks)
  - Apply passive casualties: `BASE_SIEGE_ATTRITION_RATE * firepower_ratio * siege_duration_scalar`
  - Casualties are KIA/WIA split (no MIA — these are bombardment, not capture)
  - Record in casualty_ledger

**Step 5.2 — Siege duration escalation**
- Siege attrition increases over time (besiegers range in artillery, establish observation posts):
  - `siege_duration_scalar = Math.min(2.0, 1.0 + counter * 0.05)`
  - Counter=0: 1.0x, Counter=10: 1.5x, Counter=20+: 2.0x (cap)

**Step 5.3 — Faction firepower asymmetry**
- VRS has massive artillery advantage — this should drive differential casualties
- Firepower ratio naturally handles this: VRS brigades with 30 artillery vs ARBiH brigades with 3
- Add terrain protection modifier: urban terrain reduces bombardment effectiveness by 40% (Sarajevo rubble cover)
- Mountain/forest terrain reduces by 30%

**Step 5.4 — Wire into war pipeline**
- File: `src/sim/turn_phases/war_phases.ts`
- Add `apply-siege-bombardment-attrition` phase after `apply-frontline-attrition`
- Only fires when `supply_reserves_enabled` (consistent with siege system gating)

**Step 5.5 — Tests**
- New test file: `tests/siege_attrition.test.ts`
  - Test attrition rate calculation with known firepower ratios
  - Test siege duration escalation
  - Test terrain protection modifier
  - Test casualty ledger recording
  - Test that RBiH enclaves under VRS siege take expected casualties
- Run `npm run test:vitest` + `npm run typecheck`

### Team
- **Game Designer**: Validate attrition rates — target: Sarajevo siege inflicted ~500 military casualties/month (~125/week)
- **Gameplay Programmer**: Implement Steps 5.1-5.4
- **QA Engineer**: Write tests (Step 5.5)
- **Historian**: Provide Sarajevo siege casualty data, enclave bombardment rates from Balkan Battlegrounds

### Determinism Safeguards
- Sorted iteration by OSID, then by formation ID within OSID
- No randomness — firepower ratio is deterministic
- Terrain modifier from static OSID terrain data

### Constants to Add
```typescript
// siege_attrition.ts (new)
export const BASE_SIEGE_ATTRITION_RATE = 0.003;  // 0.3% personnel per turn per firepower unit
export const SIEGE_ATTRITION_ESCALATION = 0.05;   // +5% per siege turn
export const SIEGE_ATTRITION_CAP = 2.0;            // Max 2x escalation
export const URBAN_TERRAIN_PROTECTION = 0.6;       // 40% reduction in urban
export const MOUNTAIN_TERRAIN_PROTECTION = 0.7;    // 30% reduction in mountain
export const SIEGE_ATTRITION_KIA_FRACTION = 0.25;  // 25% of siege casualties are KIA (lower than combat)
export const SIEGE_ATTRITION_WIA_FRACTION = 0.75;  // 75% WIA (shelling wounds)
```

### After Implementation
1. /simplify
2. Update docs: Systems Manual (siege bombardment), REPO_MAP (new file), napkin
3. Commit: `feat: siege bombardment attrition — passive casualties from artillery superiority`

---

## Phase 6: Cohesion Floor + Enclave Differentiation + OOB Fixes (P2-P3)

### Problem
Three minor fixes: HRHB cohesion floor too high (50), enclave resilience undifferentiated, 65th Protection Regiment misused.

### Plan

**Step 6.1 — Reduce HRHB cohesion floor**
- File: `src/sim/combat/faction_progression.ts` line 113
- Change HRHB floor from 50 to 30
- Rationale: HVO suffered severe cohesion collapse in 1993 two-front war; floor of 50 prevents this
- Add time-varying floor: w0-w52=40 (Croatian cadre baseline), w52+=30 (two-front pressure)

**Step 6.2 — Per-enclave resilience differentiation**
- File: `src/sim/combat/enclave_resilience.ts`
- Add per-enclave max resilience and growth rate modifiers:
  ```
  bihac_pocket:  max=40, growth_mult=1.2  (large, organized, 5th Corps)
  srebrenica:    max=25, growth_mult=0.8  (small, isolated, poor terrain access)
  zepa:          max=20, growth_mult=0.7  (smallest, most vulnerable)
  gorazde:       max=35, growth_mult=1.0  (moderate, some terrain advantage)
  sarajevo:      max=45, growth_mult=1.3  (largest, tunnel, international attention)
  ```
- Replace global `MAX_ENCLAVE_RESILIENCE=30` with per-enclave values
- Growth rate modifier scales `RESILIENCE_GROWTH_CRITICAL` and `RESILIENCE_GROWTH_STRAINED`

**Step 6.3 — 65th Protection Regiment garrison flag**
- File: `data/source/oob/rbih_oob.json`
- Add `"garrison": true` to 65th Protection Regiment entry
- File: `src/sim/combat/bot_brigade_ai_osid.ts`
- In brigade assignment: skip garrison-flagged units for offensive targets
- Garrison units defend home_osid only

**Step 6.4 — Tests**
- Extend cohesion tests: verify HRHB floor is 40 at w26, 30 at w60
- Extend enclave tests: verify per-enclave max resilience values
- Add garrison test: verify 65th not assigned to offensive operations
- Run `npm run test:vitest` + `npm run typecheck`

### Team
- **Game Designer**: Validate per-enclave differentiation against historical siege outcomes
- **Gameplay Programmer**: Implement Steps 6.1-6.3
- **QA Engineer**: Write tests (Step 6.4)
- **Historian**: Confirm enclave relative vulnerability ordering (Zepa most vulnerable, Sarajevo most resilient)

### Constants to Add/Modify
```typescript
// faction_progression.ts
HRHB_COHESION_FLOOR_KEYFRAMES = [[0, 40], [52, 30]]  // was constant 50

// enclave_resilience.ts
ENCLAVE_CONFIG: Record<string, { max_resilience: number; growth_mult: number }> = {
    bihac_pocket: { max_resilience: 40, growth_mult: 1.2 },
    srebrenica: { max_resilience: 25, growth_mult: 0.8 },
    zepa: { max_resilience: 20, growth_mult: 0.7 },
    gorazde: { max_resilience: 35, growth_mult: 1.0 },
    sarajevo: { max_resilience: 45, growth_mult: 1.3 },
}
```

### After Implementation
1. /simplify
2. Update docs: Systems Manual (cohesion, enclaves), OOB reference, napkin
3. Commit: `fix: HRHB cohesion floor, per-enclave resilience, 65th garrison flag`

---

## Phase 7: Validation Run (n293)

### Purpose
Run 40w scenario and compare against n292 baseline to verify all fixes produce expected improvements.

### Acceptance Criteria

| Metric | n292 Baseline | n293 Target | Pass/Fail Criterion |
|--------|---------------|-------------|---------------------|
| Equipment lost | 0 | >50 | Any equipment loss = pass |
| Brigades dissolved | 0 | 2-8 | Any dissolution = pass |
| RBiH supply (w40) | 100% | <50% | Must be below embargo cap |
| Avg fatigue (frontline brigades) | ~0 | >5 | Meaningful accumulation |
| RS KIA : RBiH KIA ratio | 1.22:1 (RS>RBiH) | <1.0 (RBiH>RS) | Ratio must flip |
| HRHB min cohesion | 50 | <40 | Floor reduction visible |
| Enclave resilience (Zepa vs Sarajevo) | Both 30 | Zepa<25, Sarajevo>35 | Differentiation visible |
| ATH area-weighted | 88.1% | >85% | No major regression |
| Total casualties | 84,565 | 60,000-90,000 | Reasonable range |

### Process
1. `npm run sim:scenario:run:40w`
2. Run analysis script (updated `tools/analyze_n293.cjs`)
3. Compare against n292
4. /historian review of results
5. Report: `docs/40_reports/convenes/20260308_N293_VALIDATION_REPORT.md`
6. Ledger entry
7. Final commit: `chore: n293 validation — combat mechanics fixes verified`

### Team
- **Orchestrator**: Commission run, review results
- **Historian**: Grade against historical expectations
- **Game Designer**: Assess mechanical balance
- **QA Engineer**: Verify acceptance criteria

---

## Execution Schedule

| Phase | Priority | Est. Complexity | Dependencies | Parallelizable With |
|-------|----------|-----------------|--------------|---------------------|
| 1. Equipment Attrition | P0 | Medium | None | Phase 3, Phase 4 |
| 2. Brigade Dissolution | P0 | Low-Medium | None | Phase 3, Phase 4 |
| 3. Supply Rebalance | P0 | Medium | None | Phase 1, Phase 4 |
| 4. Fatigue Rebalance | P1 | Low | None | Phase 1, Phase 3 |
| 5. Siege Casualties | P1 | Medium | Phase 3 | Phase 6 |
| 6. Cohesion+Enclave+OOB | P2-P3 | Low | None | Phase 5 |
| 7. Validation Run | — | Low | All above | None |

### Recommended Execution Order
1. **Batch A** (parallel): Phase 1 + Phase 3
2. **Batch B** (parallel): Phase 2 + Phase 4
3. **Batch C** (parallel): Phase 5 + Phase 6
4. **Batch D** (sequential): Phase 7

Each batch: implement → test → /simplify → docs → commit.

---

## Risk Register

| Risk | Mitigation |
|------|------------|
| Equipment attrition causes VRS to lose too fast | Conservative loss rates; VRS starts with massive advantage (40 tanks/brigade) |
| Supply embargo cap makes RBiH too weak | Cap at 45 (strained, not critical); timeline relaxation after w52 |
| Fatigue rebalance causes all offensives to stall | Recovery still happens (every 3 turns for rear brigades); bot AI can rotate |
| Siege attrition compounds with frontline attrition to over-punish defenders | Cap total passive attrition per brigade per turn |
| Brigade dissolution cascades (too many dissolve at once) | Thresholds require BOTH low personnel AND low cohesion AND degraded readiness |
| ATH regression from supply/combat changes | Monitor area-weighted % in validation; accept +-3% |

---

## Canon Impact Assessment

| Document | Section | Change |
|----------|---------|--------|
| Systems Manual | Equipment | Add equipment attrition rules |
| Systems Manual | Brigade Lifecycle | Add dissolution criteria |
| Systems Manual | Supply | Add embargo cap mechanic |
| Systems Manual | Fatigue | Update accumulation/recovery rates |
| Systems Manual | Siege | Add bombardment attrition |
| Systems Manual | Cohesion | Update HRHB floor timeline |
| Phase II Spec | Combat Resolution | Reference equipment losses |
| Engine Invariants | Determinism | Confirm all new mechanics deterministic |
| REPO_MAP | New Files | brigade_dissolution.ts, siege_attrition.ts |
| SUPPLY_DESIGN.md | Embargo | Add embargo cap design |

**Note**: No FORAWWV changes — all changes are within existing systems, not new design philosophy. Route through Pyrrhic-panel sign-off if any change touches core design intent.
