# Supply & Ammunition System — Master Plan

**Date:** 2026-03-01
**Authority:** Paradox full-team convene (Orchestrator-led). Supersedes `SUPPLY_DESIGN.md` (2026-02-24 design intent, retained as reference) and `SUPPLY_IMPLEMENTATION_PLAN.md` (2026-02-24 phased delivery, retained as reference).
**Owner:** Orchestrator (direction); Product Manager (phased delivery); Technical Architect (architecture); Game Designer (mechanics, enclave/hardening); Gameplay Programmer (implementation).

---

## 0. Executive Summary

The supply and ammunition system becomes a **first-class strategic constraint**: combat effectiveness, bot decision-making, siege pressure, and player-visible corridor state all reflect supply reality. The design uses **two categories** (general supply + heavy munitions), **faction-level reserves** (not per-brigade stockpiles), and **three consumption channels** (maintenance, combat, siege). Implementation is incremental across four phases with scenario-flag gating so each phase can be tested and calibrated independently.

**Key design principles:**
- **Decisions, not micromanagement** — player sees corridor state and isolation summary; no per-settlement supply routing
- **ARBiH can survive cut-off** — enclave resilience mechanics model local adaptation under isolation
- **Determinism required** — all supply trace, cascade, consumption, and reserve derivation use stable ordering, no timestamps or RNG
- **Backward compatible** — scenario flag gates new behavior; old saves load without change

---

## 1. Comparative Analysis — Wargame Expert Survey

### 1.1 AGEOD American Civil War II (AACW2)

**Dual supply system:** Separate *supply* (general logistics) and *ammunition* (combat-specific). Units have individual stockpiles that deplete in combat and replenish from supply network. Supply flows from depots through rail/road network with distance attenuation.

**Relevance to AWWV:** The dual-category model is the closest analogue. However, AACW2's per-unit stockpile micromanagement is too granular for AWWV's "decisions not micromanagement" philosophy.

**Adopted:** Two-category split (general supply / heavy munitions). **Rejected:** Per-brigade stockpiles — use faction-level reserves instead.

### 1.2 Decisive Campaigns: Barbarossa (DC:B)

**Decision-centric supply:** Supply is a political resource. Players make high-level decisions (prioritize front X, divert supply from Y). Logistics abstracted into "supply priority" sliders and political capital costs. Units receive supply based on front priority and distance from railheads.

**Relevance to AWWV:** Best match for AWWV's philosophy. Player-facing decisions about priority, not routing. The "supply as political constraint" maps directly to AWWV's corridor state and faction pressure mechanics.

**Adopted:** Decision-over-routing philosophy. Supply priority is implicit via corridor state (Open/Brittle/Cut) and isolation (Adequate/Strained/Critical). **Adopted:** Political/diplomatic supply effects (embargo profile, patron aid, treaty corridors).

### 1.3 War in the East 2 (WitE2)

**Freight-based logistics:** Supply capacity expressed in "freight" units. Railheads, truck pools, and depot chains determine throughput. Priority system allocates freight to HQs. Supply states: Full/Adequate/Shortage/Crisis.

**Relevance to AWWV:** Too detailed for AWWV's scale, but the **priority system** and **four supply states** are useful. WitE2's distinction between HQ-level allocation and unit-level consumption maps to AWWV's faction-level reserves.

**Adopted:** Hierarchical supply flow concept (faction → corps → brigade implicitly via OSID reachability). **Rejected:** Explicit freight/truck/rail modelling — too granular.

### 1.4 Hearts of Iron IV (HOI4)

**Rail bottleneck rule:** Supply flows from capital through rail network; choke points create natural supply constraints. Supply hub system (post-NSB DLC). Simple binary: supplied or undersupplied, with modifiers for distance and infrastructure.

**Relevance to AWWV:** The "rail bottleneck" concept maps to AWWV's corridor system (Brčko corridor, Posavina). HOI4's infrastructure-degradation-under-bombing has parallels with AWWV's production facility damage.

**Adopted:** Corridor as natural bottleneck. **Adopted:** Infrastructure/facility condition affecting supply capacity. **Rejected:** Explicit rail/hub modelling.

### 1.5 Synthesis — Design Principles for AWWV

| Principle | Source | AWWV Application |
|---|---|---|
| Two supply categories | AACW2 | General supply + heavy munitions |
| Faction-level reserves | WitE2 priority system | Reserve pool per faction, not per-brigade stockpile |
| Decision over routing | DC:B | Player sees corridor state; no per-settlement supply orders |
| Corridor as bottleneck | HOI4 | BFS reachability through OSID graph; brittle/cut corridors |
| Supply as strategic constraint | All four | Combat multiplier, bot gating, siege curve, exhaustion |

---

## 2. Current State (As-Is)

### 2.1 What Exists and Works

The following systems are **implemented and functional** (references in §11):

1. **BFS Supply Reachability** — SID-level (`supply_reachability.ts`) and OSID-level (`supply_reachability_osid.ts`). Per-faction reachable/isolated node sets.
2. **Corridor Derivation** — Open/Brittle/Cut per edge, both SID and OSID variants (`supply_state_derivation.ts`).
3. **Supply State Levels** — Adequate/Strained/Critical per settlement (SID) and per OSID (`supply_state_derivation.ts`).
4. **`getSupplyMult` in Combat** — Reads OSID supply state at `formation.location_osid`; maps Adequate→1.0, Strained→0.75, Critical→0.45(atk)/0.50(def); fallback to `last_supplied_turn` (`combat_math.ts`).
5. **Supply Pressure Accumulation** — `war_supply_pressure` per faction [0,100], monotonic, from front edges + isolation + production relief (`supply_pressure.ts`).
6. **Bot Supply Gating** — Corps directive: >50% critical → strip offensives; <30% adequate → require victory minimum. Sector offensive launch/abort thresholds. Brigade AI receives supply connectivity set.
7. **Production Facilities** — 7 strategic facilities (ammunition, heavy_equipment, small_arms) with base_capacity and current_condition. Production bonus reduces supply pressure growth.
8. **Ammo Crisis Snap Event** — Triggered when attacker loses with supply_mult < 0.5; forces defend posture, −10 cohesion.
9. **Embargo Profile** — `ammunition_resupply_rate` [0,1] scales recruitment capital accrual.
10. **Treaty Corridors** — `supply_rights` with corridor traversal rights used in BFS.
11. **Enclave Resilience** — Stub types exist (`EnclaveResilienceEntry`, `EnclaveResilienceReport`); step `phase-ii-enclave-resilience` exists but calls into a stub `updateEnclaveResilience()`.

### 2.2 What's Missing

| Gap | Impact | Priority |
|---|---|---|
| **Discrete ammo/munition reserves** | No separate heavy munition category; combat intensity has no ammo cost | Phase A |
| **Consumption model** | No maintenance drain, no per-battle ammo expenditure, no siege ammo cost | Phase A |
| **Replenishment from facilities/embargo/patron** | Production facilities compute bonus but don't feed discrete reserves | Phase B |
| **Enclave resilience implementation** | Stub only; no isolation adaptation mechanic | Phase C |
| **Supply UX panel** | No player-facing corridor/isolation summary in GUI | Phase D |
| **Siege supply curve** | No supply-based siege pressure escalation (Sarajevo exception exists but is bespoke) | Phase B |
| **Cascade propagation documentation** | Implicit (next-turn recompute) but not formally specified | Phase A |

---

## 3. Target Design

### 3.1 Two Categories

| Category | Represents | Unit | Faction-Level |
|---|---|---|---|
| **General Supply** | Food, fuel, medical, replacement parts | Abstract 0–100 scale | `general_supply_reserve` per faction |
| **Heavy Munitions** | Artillery shells, mortar rounds, anti-tank ammo | Abstract 0–100 scale | `heavy_munitions_reserve` per faction |

Both are **faction-level reserves**, not per-brigade stockpiles. A formation's effective supply state is determined by (a) OSID reachability (can supply reach it?) and (b) faction reserve level (does the faction have anything to send?).

### 3.2 Consumption Model — Three Channels

| Channel | Consumes | Rate | Notes |
|---|---|---|---|
| **Maintenance** | General Supply | Fixed per-turn drain proportional to formation count × equipment state | Always active; represents baseline logistics |
| **Combat** | Heavy Munitions (primary) + General Supply (secondary) | Per-battle expenditure proportional to battle intensity (power ratio × formation count) | Deducted in attack resolution |
| **Siege** | General Supply (primary) + Heavy Munitions (secondary) | Escalating drain per turn for besieged settlements/enclaves | Drives siege pressure curve |

### 3.3 Reserve Mechanics

```
reserve_next = clamp(0, 100,
    reserve_current
    - maintenance_drain
    - combat_expenditure
    - siege_expenditure
    + production_income
    + patron_aid_income
    - embargo_reduction
)
```

**Production income:** Sum of `base_capacity × current_condition` for all faction-controlled facilities of matching type, scaled by a global `PRODUCTION_SCALE` constant.

**Patron aid income:** From `patron_state` (existing System 1 — Patron + IVP). Gated by embargo profile. Represents external supply (Croatian logistics for HVO, Serbian logistics for VRS, humanitarian for ARBiH).

**Embargo reduction:** Direct subtraction from income when arms embargo is in effect (existing `embargo_profile`).

### 3.4 Reserve → Supply State Interaction

The **effective supply state** at a formation's OSID combines two factors:

1. **Reachability** (from BFS): Can supply physically reach this OSID? (Adequate/Strained/Critical from corridor state)
2. **Reserve level** (faction-level): Does the faction have reserves to send?

Combined effective supply state:

| Reachability | Reserve ≥ 50 | Reserve 20–49 | Reserve < 20 |
|---|---|---|---|
| Adequate | Adequate (1.0) | Strained (0.75) | Critical (0.45/0.50) |
| Strained | Strained (0.75) | Strained (0.75) | Critical (0.45/0.50) |
| Critical | Critical (0.45/0.50) | Critical (0.45/0.50) | Critical (0.45/0.50) |

The reserve thresholds (50, 20) are configurable constants: `RESERVE_ADEQUATE_THRESHOLD`, `RESERVE_STRAINED_THRESHOLD`.

### 3.5 Siege Supply Curve

Besieged settlements (those in Critical supply state for N consecutive turns) experience escalating pressure:

```
siege_pressure_increment = BASE_SIEGE_RATE × (1 + 0.1 × consecutive_critical_turns)
```

Capped at `MAX_SIEGE_PRESSURE_RATE`. This replaces bespoke Sarajevo siege logic with a general mechanic (Sarajevo exception layer applies additional modifiers on top).

### 3.6 Enclave Resilience (from existing design, now in-scope)

Per enclave: `resilience` value [0, `MAX_ENCLAVE_RESILIENCE`] that **grows** when isolated (bounded), reducing exhaustion accumulation in enclaves. Represents local adaptation, smuggling networks, morale hardening.

```
resilience_next = min(MAX_ENCLAVE_RESILIENCE,
    resilience_current + RESILIENCE_GROWTH_RATE × (is_isolated ? 1 : 0)
)

exhaustion_modifier = 1.0 - (resilience × RESILIENCE_EFFECT_SCALE)
```

**Hardening:** After `HARDENING_THRESHOLD` turns isolated, a small defense bonus (e.g., +5% defender power in enclave OSIDs). Bounded, deterministic.

### 3.7 Parameterization Table

All constants are collected in a single file for calibration:

| Constant | Default | Category | Notes |
|---|---|---|---|
| `MAINTENANCE_DRAIN_PER_FORMATION` | 0.15 | Consumption | Per-formation per-turn general supply drain |
| `COMBAT_HEAVY_MUNITIONS_RATE` | 2.0 | Consumption | Heavy munitions per battle (scaled by intensity) |
| `COMBAT_GENERAL_SUPPLY_RATE` | 0.5 | Consumption | General supply per battle (secondary) |
| `SIEGE_BASE_RATE` | 0.3 | Consumption | Per-turn drain for besieged settlements |
| `SIEGE_ESCALATION_RATE` | 0.1 | Consumption | Per-turn escalation multiplier |
| `MAX_SIEGE_PRESSURE_RATE` | 2.0 | Consumption | Cap on siege drain |
| `PRODUCTION_SCALE` | 1.0 | Replenishment | Global multiplier for facility income |
| `PATRON_AID_SCALE` | 1.0 | Replenishment | Global multiplier for patron aid |
| `RESERVE_ADEQUATE_THRESHOLD` | 50 | Reserve→State | Reserve ≥ this → adequate (if reachable) |
| `RESERVE_STRAINED_THRESHOLD` | 20 | Reserve→State | Reserve < this → critical |
| `MAX_ENCLAVE_RESILIENCE` | 30 | Enclave | Cap on resilience accumulation |
| `RESILIENCE_GROWTH_RATE` | 1.0 | Enclave | Per-turn growth when isolated |
| `RESILIENCE_EFFECT_SCALE` | 0.01 | Enclave | Resilience → exhaustion reduction |
| `HARDENING_THRESHOLD` | 8 | Enclave | Turns isolated before hardening activates |
| `HARDENING_DEFENSE_BONUS` | 0.05 | Enclave | Defender power bonus in hardened enclaves |

---

## 4. Implementation Phases

### Phase A: Reserve System + Consumption Model — COMPLETE (2026-03-01)

**Status:** IMPLEMENTED AND VERIFIED.

**Goal:** Introduce faction-level `general_supply_reserve` and `heavy_munitions_reserve`; wire maintenance drain and combat expenditure; cascade documentation.

**Scenario flag:** `supply_reserves_enabled: boolean` (default false). When false, all existing behavior is unchanged.

**Files created/modified:**
- `src/state/supply_reserve_constants.ts` — NEW: 15 constants for reserves, consumption, enclave resilience
- `src/state/supply_reserves.ts` — NEW: `ensureSupplyReserves()`, `updateSupplyReserves()`, `deductCombatExpenditure()`, `getEffectiveSupplyState()`
- `src/state/game_state.ts` — added `general_supply_reserve`, `heavy_munitions_reserve` fields; `supply_reserves_enabled` on StateMeta
- `src/state/serializeGameState.ts` — added to allowlist
- `src/scenario/scenario_types.ts` — added `supply_reserves_enabled` to Scenario
- `src/scenario/scenario_runner.ts` — wires flag to state.meta
- `src/sim/turn_phases/war_phases.ts` — new `compute-supply-reserves` step after `phase-ii-supply-osid`
- `src/sim/turn_pipeline_types.ts` — added `supply_reserves` field to TurnReport
- `src/sim/combat/combat_math.ts` — `getSupplyMult()` now combines reachability + reserves when enabled
- `src/sim/combat/attack_resolution_osid.ts` — deducts combat expenditure after each battle
- `tests/supply_reserves.test.ts` — 13 unit tests (init, drain, production, clamp, expenditure, effective state)
- `vitest.config.ts` — added test to include list

**Verification results (n338):**
- `npx tsc --noEmit` — 1 pre-existing error (corps_front_sectors.ts, unrelated); supply code clean
- `npm run test:vitest` — 19 suites, 202 pass, 1 skip (up from 189; +13 new supply tests)
- With `supply_reserves_enabled: false` — 86.9% OSID match (654/753), identical to n303 baseline
- No reserve fields in final save when disabled (0 occurrences)
- Deterministic: sorted iteration throughout, no RNG or timestamps

**Remaining for Phase A:**
- Cascade documentation in Engine Invariants §4 (deferred to canon update pass)
- Canon: Systems Manual §14 addition (requires Architect sign-off)

### Phase B: Siege Curve + Replenishment Wiring

**Goal:** Siege supply drain; patron aid and embargo wired to reserves; production facility condition changes affect income.

**Depends on:** Phase A complete.

**GameState changes:**
- Add `siege_turn_counters: Record<string, number>` (OSID → consecutive critical turns)
- Extend `ProductionFacilityState` with optional `damage_events` log

**Pipeline changes:**
- New step `update-siege-counters` (after supply OSID step): increment counters for critical OSIDs, reset for non-critical
- Modified `compute-supply-reserves`: add siege expenditure channel; wire patron aid from `patron_state`; apply embargo reduction
- Modified `update-heavy-equipment` or new step: facility damage from combat near facility OSID reduces `current_condition`

**Acceptance criteria:**
1. Smoke-test triad passes
2. Siege drain visible in 40w run: besieged enclaves show escalating supply pressure
3. Patron aid differential: VRS/HVO with Serbian/Croatian patron support maintain higher reserves than under full embargo
4. Facility capture: when OSID with production facility flips, controlling faction gains production

### Phase C: Enclave Resilience + Hardening

**Goal:** Implement enclave resilience growth under isolation; hardening defense bonus. Unstub `updateEnclaveResilience()`.

**Depends on:** Phase A complete (reserve + effective supply state).

**GameState changes:**
- Add `enclave_resilience: Record<string, EnclaveResilienceState>` (enclave_id → `{ resilience: number, hardening_active: boolean, isolation_turns: number }`)

**Pipeline changes:**
- Existing step `phase-ii-enclave-resilience` (to be renamed `war-enclave-resilience`): implement actual resilience growth, hardening check, and modifier output
- Modified exhaustion step: apply `exhaustion_modifier` from resilience in enclave OSIDs
- Modified combat resolution: apply `HARDENING_DEFENSE_BONUS` to defender power in hardened enclave OSIDs

**Acceptance criteria:**
1. Smoke-test triad passes
2. In 40w run: Bihać, Srebrenica, Goražde enclaves show resilience accumulation
3. After 8+ turns isolated: hardening_active = true, visible defense bonus
4. Resilience bounded at `MAX_ENCLAVE_RESILIENCE`
5. Game Designer + Architect sign-off on formula and caps

**Canon:** Recommend Systems Manual §14.4 or §16 addition for enclave resilience formula. Game Designer + Architect sign-off.

### Phase D: Supply UX + Bot Enhancement

**Goal:** Player-facing supply panel (corridor state + isolation summary + reserve levels); bot supply-aware target scoring.

**Depends on:** Phase A complete (reserve levels to display).

**No GameState changes.** Report and adapter only.

**Adapter/IPC changes:**
- Extend `GameStateAdapter` to expose: per-faction reserve levels, corridor summary (open/brittle/cut counts), isolation summary (adequate/strained/critical counts)
- Add or extend IPC `query-corridor-summary` to include reserve levels and isolation counts
- UI component: single "Logistics" panel showing per-faction corridor state, isolation summary, and reserve bars

**Bot enhancement:**
- Supply connectivity in shared intelligence (BFS from HQ through friendly OSIDs — already available from OSID reachability)
- Target scoring: incorporate supply state at target OSID (attack supply-strained targets preferentially)
- Defense priority: protect corridor chokepoints (brittle edges)

**Acceptance criteria:**
1. Smoke-test triad passes
2. UI panel renders correct data (manual QA)
3. Bot targeting shows supply-aware behavior (supply-strained enemy OSIDs scored higher)

---

## 5. Pipeline Step Naming Migration

All new steps use `war-` prefix (not `phase-ii-`). Existing steps will be renamed in a dedicated migration pass after Phase A is verified.

### New Steps (Phase A–D)

| New Step Name | Phase | After |
|---|---|---|
| `compute-supply-reserves` | A | `supply-resolution` |
| `update-siege-counters` | B | `war-supply-osid` |
| `war-supply-osid` | A (rename) | `zoc-computation` |
| `war-enclave-resilience` | C (rename) | `war-supply-osid` |

### Existing Steps — Rename Schedule

The following step renames are **deferred** to a dedicated migration pass (not part of supply work) to avoid scope creep. They are documented here as the authoritative rename plan.

See **Appendix A** for the full phase_i/phase_ii reference audit. The migration pass will:
1. Rename all pipeline step names (`phase-i-*` → `early-war-*`, `phase-ii-*` → `war-*`)
2. Rename all TurnReport field names correspondingly
3. Rename exported functions, types, and file names
4. Update all tests, imports, and documentation
5. Add save-migration logic for the `GameState.phase` field value guard in `GameStateAdapter.ts`

**Save compatibility note:** Pipeline step names and TurnReport fields are NOT serialized in GameState saves. The only save-compatibility risk is the `"phase": "phase_ii"` string value guard in `GameStateAdapter.ts:86` — this guard must be preserved during migration.

---

## 6. Determinism Contract

All supply system code must satisfy:

1. **No RNG:** No `Math.random()`, no `Date.now()`, no timestamps in any supply computation
2. **Sorted iteration:** All iteration over factions, OSIDs, edges, formations uses `strictCompare` or equivalent deterministic sort
3. **Stable ordering:** Reserve updates process factions in `faction_id` sort order; consumption deductions process battles in deterministic order (same as attack resolution)
4. **Reproducibility:** Same `GameState` + same edges + same orders → identical supply state, reserves, and consumption. Verified by determinism test suite.

---

## 7. Canon Changes Required

| Phase | Canon Document | Change | Sign-Off |
|---|---|---|---|
| A | Systems Manual §14 | Add §14.6: "Supply Reserves" — faction-level general supply and heavy munitions reserves; reserve → effective supply state mapping table | Architect |
| A | Engine Invariants §4 | Add cascade wording: "Cascade is next-turn visible. Propagation order: faction_id asc, OSID asc." | Architect |
| B | Systems Manual §14 | Add §14.7: "Siege Supply Curve" — escalating drain formula | Architect |
| C | Systems Manual §14.4 or §16 | Add enclave resilience and hardening formula, caps | Game Designer + Architect |
| D | None | No canon change for UI | — |

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Reserve balance breaks calibration | High | Medium | Scenario flag gating; Phase A acceptance requires identical results when disabled |
| Siege curve too aggressive → enclaves fall historically too early | Medium | High | `SIEGE_BASE_RATE` and `SIEGE_ESCALATION_RATE` are tunable constants; calibrate against Sarajevo siege timeline (Apr 1992 – Feb 1996) |
| Ammo consumption makes VRS too weak (smaller reserve, more battles) | Medium | High | VRS starts with patron aid advantage (Serbian logistics); embargo profile differentiates consumption rates |
| Enclave resilience makes enclaves invincible | Low | Medium | Bounded by `MAX_ENCLAVE_RESILIENCE`; hardening bonus is small (+5%) |
| Phase naming migration scope creep | Medium | Low | Deferred to dedicated pass; this plan only renames new steps |

---

## 9. Sequencing and Handoffs

```
Phase A (Reserve + Consumption)
    ├── Refactor-pass
    ├── Phase B (Siege + Replenishment) → Refactor-pass
    └── Phase C (Enclave Resilience) → Refactor-pass
         └── Phase D (UX + Bot) → Refactor-pass → Final verification
```

- Phase B and C can run in parallel after Phase A (no dependency between them)
- Phase D depends on Phase A only (reserves to display)
- Refactor-pass between each phase per napkin rule
- 20w/30w checkpoint runs for iteration; 52w for acceptance only

**Handoffs:**
- Orchestrator → PM: sequencing after Phase A verification
- PM → Gameplay Programmer: Phase A implementation
- PM → Game Designer: Phase C enclave formula and caps
- PM → Architect: Phase D UX spec and adapter contract
- Each phase → `/propagate-to-canon` for documentation sync

---

## 10. Files Modified (by phase)

| Phase | Key Files | New Files |
|---|---|---|
| A | `src/state/game_state.ts`, `src/state/supply_state_derivation.ts`, `src/sim/turn_phases/war_phases.ts`, `src/sim/combat/combat_math.ts`, `src/sim/combat/attack_resolution_osid.ts`, `src/state/serialize.ts`, `src/state/serializeGameState.ts` | `src/state/supply_reserve_constants.ts`, `src/state/supply_reserves.ts` |
| B | `src/state/game_state.ts`, `src/sim/turn_phases/war_phases.ts`, `src/state/supply_reserves.ts`, `src/state/production_facilities.ts` | — |
| C | `src/state/game_state.ts`, `src/sim/turn_phases/war_phases.ts`, `src/sim/combat/combat_math.ts`, existing `enclave_resilience` stub | — |
| D | `src/ui/map/data/GameStateAdapter.ts`, `src/ui/map/data/types.ts`, `src/sim/combat/bot_corps_ai.ts`, `src/sim/combat/bot_strategy.ts`, `src/desktop/desktop_sim.ts` | UI panel component |

---

## 11. References

**Design (retained as reference):**
- `docs/30_planning/SUPPLY_DESIGN.md` — original 2026-02-24 design intent
- `docs/30_planning/SUPPLY_IMPLEMENTATION_PLAN.md` — original 2026-02-24 phased delivery (5-phase, now superseded by this 4-phase plan)

**Canon:**
- `docs/10_canon/Systems_Manual_v0_6_0.md` §14 (Logistics, supply, corridors)
- `docs/10_canon/Engine_Invariants_v0_6_0.md` §4 (Supply and Corridor Invariants)
- `docs/10_canon/War_Specification_v0_6_0.md` §8 (Supply Pressure)

**Implementation (current code):**
- `src/state/supply_reachability.ts` — SID-level BFS
- `src/state/supply_reachability_osid.ts` — OSID-level BFS
- `src/state/supply_state_derivation.ts` — corridor + supply state derivation (SID and OSID)
- `src/state/production_facilities.ts` — strategic facility seeds
- `src/sim/combat/combat_math.ts` — `getSupplyMult()` function
- `src/sim/combat/supply_pressure.ts` — `updatePhaseIISupplyPressure()` (to be renamed)
- `src/sim/combat/attack_resolution_osid.ts` — ammo_crisis snap event
- `src/sim/combat/bot_corps_ai.ts` — `assessCorpsSupplyHealth()`, supply gating in directives
- `src/sim/combat/sector_offensive.ts` — `computeSupplyReadiness()`
- `src/sim/turn_phases/war_phases.ts` — pipeline step wiring

**Wargame references:**
- AGEOD American Civil War II — dual supply/ammo, per-unit stockpiles
- Decisive Campaigns: Barbarossa — decision-centric supply, political resource
- War in the East 2 — freight abstraction, HQ priority system
- Hearts of Iron IV — rail bottleneck, infrastructure degradation

---

## Appendix A: Phase I / Phase II Reference Audit

The following is a comprehensive audit of all remaining `phase_i` / `phase_ii` references in the codebase. These are flagged for a **dedicated naming migration pass** (separate from supply work) to avoid scope creep.

### A.1 Pipeline Step Names (38 total)

**Save compatibility: SAFE to rename** — step names are execution-time strings, not serialized in GameState saves.

#### Early-War Steps (18) — in `src/sim/turn_phases/peace_phases.ts`
Current → Target rename:

| Current Name | Target Name |
|---|---|
| `phase-i-militia-emergence` | `early-war-militia-emergence` |
| `phase-i-pool-population` | `early-war-pool-population` |
| `phase-i-minority-militia-decay` | `early-war-minority-militia-decay` |
| `phase-i-brigade-reinforcement` | `early-war-brigade-reinforcement` |
| `phase-i-formation-spawn` | `early-war-formation-spawn` |
| `phase-i-bot-posture` | `early-war-bot-posture` |
| `phase-i-alliance-update` | `early-war-alliance-update` |
| `phase-i-ceasefire-check` | `early-war-ceasefire-check` |
| `phase-i-washington-check` | `early-war-washington-check` |
| `phase-i-capability-update` | `early-war-capability-update` |
| `phase-i-control-flip` | `early-war-control-flip` |
| `phase-i-bilateral-flip-count` | `early-war-bilateral-flip-count` |
| `phase-i-displacement-hooks` | `early-war-displacement-hooks` |
| `phase-i-displacement-apply` | `early-war-displacement-apply` |
| `phase-i-control-strain` | `early-war-control-strain` |
| `phase-i-authority-update` | `early-war-authority-update` |
| `phase-i-jna-transition` | `early-war-jna-transition` |
| `phase-i-minority-erosion` | `early-war-minority-erosion` |

Also: 8 duplicated step names in `src/sim/run_early_war_browser.ts`.
Also: 3 step name references in `src/sim/turn_pipeline.ts` (guard logic).

#### War Steps (20+) — in `src/sim/turn_phases/war_phases.ts`
Current → Target rename:

| Current Name | Target Name |
|---|---|
| `phase-ii-location-osid-backfill` | `war-location-osid-backfill` |
| `phase-ii-supply-osid` | `war-supply-osid` |
| `phase-ii-enclave-resilience` | `war-enclave-resilience` |
| `phase-ii-equipment-progression` | `war-equipment-progression` |
| `phase-ii-resolve-attack-orders` | `war-resolve-attack-orders` |
| `phase-ii-cohesion-drift` | `war-cohesion-drift` |
| `phase-ii-morale-drift` | `war-morale-drift` |
| `phase-ii-consolidation-flips` | `war-consolidation-flips` |
| `phase-ii-hostile-takeover-displacement` | `war-hostile-takeover-displacement` |
| `phase-ii-alliance-update` | `war-alliance-update` |
| `phase-ii-ceasefire-check` | `war-ceasefire-check` |
| `phase-ii-washington-check` | `war-washington-check` |
| `phase-ii-operation-storm-check` | `war-operation-storm-check` |
| `phase-ii-recruitment` | `war-recruitment` |
| `phase-ii-ongoing-mobilization` | `war-ongoing-mobilization` |
| `phase-ii-brigade-reinforcement` | `war-brigade-reinforcement` |
| `phase-ii-wia-trickleback` | `war-wia-trickleback` |
| `phase-ii-consolidation` | `war-consolidation` |
| `phase-ii-front-emergence` | `war-front-emergence` |
| `phase-ii-recon-intelligence` | `war-recon-intelligence` |

Also: `phase-ii-advance` in `src/sim/run_combat_browser.ts`.

### A.2 TurnReport Field Names (28 total)

**Save compatibility: SAFE to rename** — TurnReport is in-flight per turn, not serialized in GameState.

All defined in `src/sim/turn_pipeline_types.ts`.

**Early-war fields (14):** `phase_i_militia_emergence`, `phase_i_pool_population`, `phase_i_minority_militia_decay`, `phase_i_brigade_reinforcement`, `phase_i_formation_spawn`, `phase_i_control_flip`, `phase_i_authority`, `phase_i_displacement_hooks`, `phase_i_displacement_apply`, `phase_i_alliance_update`, `phase_i_ceasefire_check`, `phase_i_washington_check`, `phase_i_bilateral_flip_count`, `phase_i_minority_erosion_report`

**War fields (14+):** `phase_ii_operation_storm_check`, `phase_ii_front_emergence`, `phase_ii_resolve_attack_orders`, `phase_ii_attack_resolution_osid`, `phase_ii_cohesion_drift`, `phase_ii_morale_drift`, `phase_ii_consolidation_flips`, `phase_ii_takeover_displacement`, `phase_ii_ongoing_mobilization`, `phase_ii_brigade_reinforcement`, `phase_ii_wia_trickleback`, `phase_ii_equipment_progression`, `phase_ii_enclave_resilience`, `phase_ii_recruitment`

Also inline in `war_phases.ts`: `phase_ii_column_movement`, `phase_ii_zoc_movement`

Also duplicated on `PhaseITurnReport` in `src/sim/run_early_war_browser.ts`.

### A.3 Exported Function Names (~25)

**Save compatibility: SAFE to rename.**

| Function | File | Target Name |
|---|---|---|
| `runPhaseITurn` | `src/sim/run_early_war_browser.ts` | `runEarlyWarTurn` |
| `runPhaseIBotPosture` | `src/sim/early_war/bot_phase_i.ts` | `runEarlyWarBotPosture` |
| `isPhaseIAllowed` | `src/sim/turn_phases/peace_phases.ts` | `isEarlyWarAllowed` |
| `assertNoAoRInPhaseI` | `src/sim/turn_phases/peace_phases.ts` | `assertNoAoRInEarlyWar` |
| `applyPhaseIDisplacementFromFlips` | `src/state/displacement.ts` | `applyEarlyWarDisplacementFromFlips` |
| `createOobFormationsAtPhaseIEntry` | `src/scenario/oob_early_war_entry.ts` | `createOobFormationsAtEarlyWarEntry` |
| `runPhaseIITurn` | `src/sim/run_combat_browser.ts` | `runWarTurn` |
| `runPhaseIICohesionDrift` | `src/sim/combat/cohesion_drift.ts` | `runWarCohesionDrift` |
| `runPhaseIIMoraleDrift` | `src/sim/combat/morale_drift.ts` | `runWarMoraleDrift` |
| `runPhaseIIOngoingMobilization` | `src/sim/combat/ongoing_mobilization.ts` | `runWarOngoingMobilization` |
| `getPhaseIICommandFrictionMultiplier` | `src/sim/combat/command_friction.ts` | `getWarCommandFrictionMultiplier` |
| `getPhaseIICommandFrictionMultipliers` | `src/sim/combat/command_friction.ts` | `getWarCommandFrictionMultipliers` |
| `updatePhaseIIExhaustion` | `src/sim/combat/exhaustion.ts` | `updateWarExhaustion` |
| `detectPhaseIIFronts` | `src/sim/combat/front_emergence.ts` | `detectWarFronts` |
| `updatePhaseIISupplyPressure` | `src/sim/combat/supply_pressure.ts` | `updateWarSupplyPressure` |
| `derivePhaseIIFrontsFromPressureEligible` | `src/sim/emergence/front_emergence.ts` | `deriveWarFrontsFromPressureEligible` |
| `processPhaseIIDisplacementTakeover` | `src/state/displacement_takeover.ts` | `processWarDisplacementTakeover` |

### A.4 Type/Interface Names (~14)

**Save compatibility: SAFE to rename** — TypeScript types are compile-time only.

| Type/Interface | File | Target Name |
|---|---|---|
| `PhaseIJNAState` | `src/state/game_state.ts` | `EarlyWarJNAState` |
| `PhaseIIFrontStability` | `src/state/game_state.ts` | `WarFrontStability` |
| `PhaseIIFrontDescriptor` | `src/state/game_state.ts` | `WarFrontDescriptor` |
| `PhaseIDisplacementFlipInfo` | `src/state/displacement.ts` | `EarlyWarDisplacementFlipInfo` |
| `PhaseIDisplacementHooksInfo` | `src/state/displacement.ts` | `EarlyWarDisplacementHooksInfo` |
| `PhaseIIBattleResolutionLike` | `src/state/displacement_takeover.ts` | `WarBattleResolutionLike` |
| `PhaseIITakeoverDisplacementReport` | `src/state/displacement_takeover.ts` | `WarTakeoverDisplacementReport` |
| `PhaseITurnInput` | `src/sim/run_early_war_browser.ts` | `EarlyWarTurnInput` |
| `PhaseITurnReport` | `src/sim/run_early_war_browser.ts` | `EarlyWarTurnReport` |
| `PhaseIITurnInput` | `src/sim/run_combat_browser.ts` | `WarTurnInput` |
| `PhaseIITurnReport` | `src/sim/run_combat_browser.ts` | `WarTurnReport` |
| `PhaseIIAttackResolutionSummary` | `src/scenario/scenario_end_report.ts` | `WarAttackResolutionSummary` |
| `PhaseIIAttackResolutionWeekRollup` | `src/scenario/scenario_end_report.ts` | `WarAttackResolutionWeekRollup` |
| `PhaseIFactionProfile` | `src/sim/early_war/bot_phase_i.ts` | `EarlyWarFactionProfile` |

### A.5 File Names (2)

| Current | Target | Importers |
|---|---|---|
| `src/sim/early_war/bot_phase_i.ts` | `src/sim/early_war/bot_early_war.ts` | peace_phases.ts, run_early_war_browser.ts |
| `src/sim/combat/phase_ii_adjacency.ts` | `src/sim/combat/war_adjacency.ts` | 7 files in `src/sim/combat/` + `src/desktop/desktop_sim.ts` |

### A.6 GameState Field Values (1 — SAVE-COMPAT RISK)

| Location | Issue | Risk |
|---|---|---|
| `src/ui/map/data/GameStateAdapter.ts:86` | Guard: `phase === 'phase_ii'` → treats as war | **HIGH** — older saves may have `"phase": "phase_ii"`. Guard must be preserved. |

### A.7 UI/Adapter Fields

| Location | Reference | Risk |
|---|---|---|
| `src/ui/map/__mocks__/loadedGameState.ts:5` | `label: 'Turn 12 (phase_ii)'` | Test mock — safe |
| `src/ui/warroom/ClickableRegionManager.ts` | `runPhaseITurn`, `runPhaseIITurn` imports | Safe when functions renamed |
| `src/ui/warroom/components/FactionOverviewPanel.ts` | `renderPhaseIPlus()` private | Safe |
| `src/ui/warroom/run_phase0_turn.ts` | `derivePhaseIHandoffOp`, `applyPhaseIHandoff` private | Safe |

### A.8 Documentation References

Active docs still using Phase I/Phase II terminology (update during `/propagate-to-canon` after migration):
- `docs/10_canon/Engine_Invariants_v0_6_0.md`
- `docs/10_canon/Systems_Manual_v0_6_0.md`
- `docs/10_canon/War_Specification_v0_6_0.md`
- `docs/10_canon/context.md`
- `docs/20_engineering/CODE_CANON.md`
- `docs/20_engineering/DESKTOP_GUI_IPC_CONTRACT.md`
- `docs/20_engineering/DISPLACEMENT_MASTER.md`
- `docs/20_engineering/PIPELINE_ENTRYPOINTS.md`
- `docs/20_engineering/REPO_MAP.md`
- `docs/30_planning/PHASE_I_II_EDGE_CASES.md`
- `docs/40_reports/CALIBRATION_MASTER.md`

~80+ historical report files in `docs/40_reports/` — archive, no action needed.

### A.9 Code Comments

~2,400+ lines with Phase I / Phase II in comments across `src/`, `tests/`, `tools/`. Informational only — update opportunistically during migration, not as a dedicated pass.

---

## Appendix B: Glossary

| Term | Definition |
|---|---|
| **General Supply** | Faction-level reserve representing food, fuel, medical, replacement parts |
| **Heavy Munitions** | Faction-level reserve representing artillery shells, mortar rounds, anti-tank ammunition |
| **Maintenance Drain** | Per-turn fixed consumption of general supply proportional to formation count |
| **Combat Expenditure** | Per-battle consumption of heavy munitions (primary) and general supply (secondary) |
| **Siege Expenditure** | Per-turn consumption in besieged (critical) settlements, escalating with duration |
| **Effective Supply State** | Combination of OSID reachability and faction reserve level → Adequate/Strained/Critical |
| **Corridor State** | Per-edge classification: Open (redundant paths), Brittle (sole bridge), Cut (no path) |
| **Enclave Resilience** | Per-enclave value growing under isolation; reduces exhaustion impact |
| **Hardening** | Defense bonus activated after N turns of isolation in an enclave |
