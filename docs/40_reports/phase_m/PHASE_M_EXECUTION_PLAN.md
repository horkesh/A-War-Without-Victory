# Phase M: Year-One Mechanics Implementation

**Date:** 2026-03-01
**Status:** PLANNED — awaiting user approval
**Orchestrator-led.** Paradox Rules in effect (`docs/20_engineering/PARADOX_RULES.md`).
**Design source:** `docs/30_planning/20260228_phase_ii_mechanics_design.md`
**Canon review:** Completed — see §Canon Extensions Required below.

---

## Overview

Implement 7 new mechanics for Year One (1992) calibration within the existing `phase_ii` codebase.
Phase restructuring (Phase 0/I/II → Peace/War) is deferred to a separate workstream after n256.

**Goal:** Run n256 and hit >85% OSID match rate with historically plausible casualty distribution.

---

## Critical Code-Level Context

This section records findings from code research. Each phase references these as needed.

### FormationState (game_state.ts:239-300)
- 30+ fields. NO `morale` field currently.
- Key existing fields: `cohesion?: number`, `entrenchment_turns?: number`, `defense_streak?: number`, `disrupted_turns?: number`, `last_retreat_from?: { osid, turn }`, `personnel?: number`, `composition?: BrigadeComposition`, `equipment_class?: string`, `location_osid?: SettlementId`, `faction: FactionId`, `kind?: FormationKind`, `corps_id?: FormationId | null`.

### GameState (game_state.ts:1062-1261)
- 83+ top-level fields. NO `displacement_event_log` currently.
- Displacement fields (lines 1111-1117): `displacement_state?`, `hostile_takeover_timers?`, `displacement_camp_state?`, `minority_flight_state?`.
- War ZoC fields (lines 1092-1095): `war_enemy_zoc_by_faction?`, `war_linked_zoc_by_faction?`.

### migrateState (serialize.ts:172-583)
- Pattern: check if phase-group fields exist → if so, default missing sub-fields.
- FormationState defaults (lines 339-400): `kind → 'brigade'`, `cohesion → 60`, `readiness → 'active'`, etc.
- Phase II defaults only applied if `hasAnyPhaseII` (lines 531-553).
- Phase F defaults only applied if `hasAnyPhaseF` (lines 556-570).
- All sorting uses `localeCompare` for determinism.

### Attack Resolution (attack_resolution_osid.ts)
- Last stand: lines 610-630, `defenderPower *= 1.5; lastStandCasMult = 2` when `retreatDests.length === 0`.
- Outcome thresholds: decisive≥2.0, victory≥1.5, costly≥1.0, stalemate≥0.7, repulsed≥0.5, catastrophic<0.5.
- Casualty calc: lines 674-679, `BASE_ATTACKER_LOSS_RATE=0.03`, `BASE_DEFENDER_LOSS_RATE=0.015`, `KIA_FRACTION=0.25`.
- Outcome mods: `OUTCOME_ATTACKER_MOD = {decisive:1.0, victory:1.2, costly:1.8, stalemate:1.0, repulsed:2.0, catastrophic:3.0}`.
- `OUTCOME_DEFENDER_MOD = {decisive:2.5, victory:1.8, costly:1.2, stalemate:0.8, repulsed:0.5, catastrophic:0.3}`.
- Retreat logic: lines 796-814, picks `retreatDests[0]`, resets `entrenchment_turns=0`, `defense_streak=0`.
- `computeZocDefenderPower` ALREADY EXISTS (lines 901-928): `zocReadiness = Math.min(maxZocByTier, entrench / 4)`.
- `computeDefenderPower` (lines 858-885): base × posture × supply × terrain × entrenchment × corps × resilience × urban × disruption × enclave × toTerrain.
- Artillery suppression: lines 68-81, `(artEff * 1.0 + tankEff * 0.5) / 100`, cap 0.7.

### ZoC System (zoc.ts)
- `computeLinkedZocForFaction` (lines 112-189): BFS, requires 2+ brigades per component.
- `getValidRetreatDestinations` (lines 273-303): sorted by not-in-enemy-ZoC, then enemy adjacency ascending, then OSID string.
- `computeZoCState` (lines 229-246): builds adjacency, `enemyZocByFaction`, `linkedZocByFaction`.
- NO virtual defense logic currently.

### Bot AI (bot_strategy.ts, bot_brigade_ai_osid.ts, bot_corps_ai.ts)
- `RS_EARLY_WAR_END_WEEK = 20` (bot_strategy.ts line 216).
- Co-ethnic scoring (bot_brigade_ai_osid.ts lines 573-592): bipolar -80 to +80.
- Supply penalty (lines 595-612): RBiH CRITICAL = -300, HRHB = -250, RS = -200.
- Alliance filter ALREADY symmetric (lines 904-911): both HRHB→RBiH and RBiH→HRHB blocked.
- Army priorities: RS Drina Sweep (130), Corridor 92 (100), Sarajevo Siege (90); RBiH Sarajevo Defense (100), Bihać (90), Tuzla (80), Central Corridor (60).

### Turn Pipeline (turn_pipeline.ts)
- Step order: zoc-computation (584) → zoc-constrained-movement (665) → phase-ii-resolve-attack-orders (897) → phase-ii-cohesion-drift (946) → phase-f-displacement (1260) → update-displacement (1607).
- Morale drift should be added after cohesion drift step.

### Equipment System (equipment_effects.ts)
- `ensureBrigadeComposition`: defaults by faction only (ignores equipment_class).
- RBiH default: infantry=950, tanks=1, artillery=3, aa=0.
- RS default: infantry=800, tanks=40, artillery=30, aa=5.
- HRHB default: infantry=850, tanks=10, artillery=10, aa=2.
- No brigades in OOB have explicit `composition` field — all 240 use faction defaults.

### Enclave Brigades in OOB (oob_brigades.json)
- **Srebrenica (5):** arbih_280th–284th, equipment_class "police", personnel 900, cohesion 70, home_mun "srebrenica".
- **Goražde (7):** arbih_801st–851st, equipment_class "light_infantry", personnel 1100, cohesion 72, home_mun "gorazde".
- **Žepa (1):** arbih_285th_light, equipment_class "light_infantry", personnel 600, cohesion 48, home_mun "rogatica", home_osid "op:rogatica:zepa_2".
- Total: **13 enclave brigades** requiring material deprivation.

### Census Data (population_share.ts)
- `MunicipalityPopulation1991Map = Record<string, {total, bosniak, serb, croat, other}>`.
- RBiH aligns with Bosniak + Other, RS with Serb, HRHB with Croat.
- Data already loaded and available during combat resolution.

### Displacement System (displacement_takeover.ts)
- `processPhaseIIDisplacementTakeover()` at line 281.
- `getPrimaryRouteForSourceMun()` at lines 215-241 — THIS IS WHAT GETS REPLACED.
- Timer: `TAKEOVER_DISPLACEMENT_DELAY_TURNS=4`, `CAMP_REROUTE_DELAY_TURNS=4`.
- Kill fractions: `DISPLACEMENT_KILLED_FRACTION=0.10`, `ENCLAVE_OVERRUN_KILL_FRACTION=0.35`.
- Existing routing covers ~41 municipalities; ~70 fall through to generic `FALLBACK_ROUTES_BY_FACTION`.

### Cohesion Drift (cohesion_drift.ts)
- `runPhaseIICohesionDrift(state, engagedFormationIds)` at lines 85-131.
- Per-faction drift: RS stable then decay, RBiH rapid organization then slowing, HRHB flat 0.05.
- Skips engaged formations.
- Exhaustion penalties: -0.5 at 80% exhaustion, -1.5 at 95%.

### Combat Predictor (combat_predictor.ts)
- `predictCombatOutcome()` at lines 479-491.
- Same constants as resolver. MUST be kept in sync with resolver changes.
- `OUTCOME_SCORE = {decisive:100, victory:80, costly:40, stalemate:18, repulsed:-50, catastrophic:-200}`.

### Pool Population (pool_population.ts)
- `FACTION_POOL_SCALE`: RBiH=0.18, RS=0.28, HRHB=2.10 (lines 53-57).
- RS target: 0.28 → 0.30. (Design doc says 0.35→0.30 but current value is 0.28.)

---

## Canon Extensions Required (BEFORE any code)

These canon updates MUST be written and reviewed before implementation begins.

| Doc | Section | Change |
|---|---|---|
| Engine Invariants | §14 Brigade Operations | Add: `morale` field [0,100], non-monotonic; retreat resistance gate (deterministic, NOT stochastic) |
| Engine Invariants | §6 Front & Combat | Add: ZoC Defensive Projection — ZoC-locked brigades defend adjacent empty OSIDs via attack resolution (NOT passive flip) |
| Engine Invariants | §14.5 Retreat | Add: Breakthrough Retreat as 4th destination class (after friendly-not-ZoC, friendly-in-ZoC, breakthrough-to-friendly) |
| Systems Manual | §6 Deployment | Add: Enclave brigade equipment isolation; population affinity from census |
| Systems Manual | new §Displacement Routing | Add: Per-municipality routing tables; OSID-level tracking; ethnicity tracking |

**Owner:** Canon Compliance Reviewer
**Architect flags:** ZoC Defensive Projection is an attack-resolution modifier, NOT a passive control mechanism. Breakthrough Retreat must have deterministic gates (isolation ≥ N turns AND path within M hops).

---

## Phase M1: Schema & Canon Foundation

### M1.1 — Canon doc extensions

**READ:**
- `docs/10_canon/ENGINE_INVARIANTS.md` — find §14 Brigade Operations and §6 Front & Combat
- `docs/10_canon/SYSTEMS_MANUAL.md` — find §6 Deployment and look for displacement section

**WRITE:**
- In Engine Invariants §14, add subsection:
  ```
  ### 14.X Morale
  - `morale: number` field on FormationState, range [0,100].
  - Non-monotonic: can increase (population affinity, encirclement reversal) and decrease (defeat, low affinity).
  - Gates retreat decision: high morale + costly_victory → absorb casualties, hold position.
  - Deterministic: no randomness in morale calculation or retreat gate.
  - Distinct from cohesion: cohesion = tactical effectiveness, morale = willingness to fight.
  ```
- In Engine Invariants §6, add subsection:
  ```
  ### 6.X ZoC Defensive Projection
  - When attacker targets unoccupied OSID in a linked ZoC component: nearest ZoC-locked brigade provides virtual defense.
  - This is an attack-resolution modifier, NOT a passive control flip.
  - Virtual defense: 50% entrenchment, 50% casualty exposure for defender.
  - Priority: own-position defense > virtual defense (no dual combat).
  ```
- In Engine Invariants §14.5 (or create), add:
  ```
  ### 14.5 Retreat — Breakthrough Class
  - 4th destination class: breakthrough-to-friendly.
  - Gate: isolation ≥ N turns AND BFS path to friendly OSID within M hops.
  - Resolution: 60% power, 20-30% casualties per hop, entrenchment resets.
  - Fallback: last-stand if no breakthrough path exists.
  - Deterministic: no randomness in path selection or breakthrough resolution.
  ```
- In Systems Manual §6, add:
  ```
  Enclave brigades (Srebrenica, Goražde, Žepa) have explicitly set composition:
  infantry-only, tanks=0, artillery=0, condition 0.35-0.45.
  Population affinity computed from 1991 census data (MunicipalityPopulation1991Map).
  ```
- In Systems Manual, add new §Displacement Routing:
  ```
  Per-municipality routing tables replace generic faction-ordered lists.
  8 geographic regions × 3 ethnicities × ~110 municipalities.
  OSID-level tracking: displaced_out_by_osid, displaced_in_by_osid.
  Ethnicity tracking per displacement event.
  See design doc §Mechanic 8 for complete routing tables.
  ```

**GATE:** Review by Canon Compliance Reviewer. No code gate.

### M1.2 — Add morale field to FormationState

**READ:**
- `src/state/game_state.ts` lines 239-300 (FormationState interface)

**WRITE** in `src/state/game_state.ts`:
- Add `morale?: number;` to FormationState interface, after `cohesion` field (~line 262).
- Comment: `/** Willingness to fight [0,100]. Distinct from cohesion (tactical effectiveness). */`

**VERIFY:** `npx tsc --noEmit` — should pass (optional field, no consumers yet).

### M1.3 — Add DisplacementEvent type and displacement_event_log

**READ:**
- `src/state/game_state.ts` lines 516-559 (existing displacement types)
- `src/state/game_state.ts` lines 1111-1117 (displacement fields on GameState)

**WRITE** in `src/state/game_state.ts`:
- Add new interface after DisplacementCampState (~line 546):
  ```typescript
  /** Per-event displacement record for tracking and reporting. */
  export interface DisplacementEvent {
      turn: number;
      origin_mun: MunicipalityId;
      origin_osid?: string;
      dest_mun: MunicipalityId;
      dest_osid?: string;
      ethnicity: FactionId;
      displaced: number;
      killed: number;
      fled_abroad: number;
      settled: number;
  }
  ```
- Add to GameState interface (~line 1117, after `minority_flight_state`):
  ```typescript
  /** Cumulative displacement event log, sorted by (turn, origin_mun). */
  displacement_event_log?: DisplacementEvent[];
  ```
- Add to DisplacementState interface (lines 516-525):
  ```typescript
  /** Origin OSID → count displaced from. */
  displaced_out_by_osid?: Record<string, number>;
  /** Destination OSID → count settled in. */
  displaced_in_by_osid?: Record<string, number>;
  ```

**VERIFY:** `npx tsc --noEmit`

### M1.4 — Migration defaults in serialize.ts

**READ:**
- `src/state/serialize.ts` lines 339-400 (FormationState migration block)
- `src/state/serialize.ts` lines 556-570 (Phase F defaults)

**WRITE** in `src/state/serialize.ts`:
- In FormationState migration loop (after cohesion default at ~line 370), add:
  ```typescript
  // Default morale to 60 if missing
  if (f.morale === undefined || f.morale === null) {
      f.morale = 60;
  }
  // Clamp morale to [0, 100]
  f.morale = Math.max(0, Math.min(100, f.morale));
  ```
- In Phase F defaults block (~line 570), add:
  ```typescript
  // Default displacement_event_log
  if (!state.displacement_event_log) {
      state.displacement_event_log = [];
  }
  ```

**VERIFY:** `npx tsc --noEmit` ; `npx vitest run`

### M1.5 — Schema round-trip tests

**READ:**
- Find existing serialization tests: `tests/state/serialize*.test.*` or `tests/state/game_state*.test.*`
- Check `tests/` directory structure for patterns

**WRITE** — Add test cases (in existing test file or new `tests/state/morale_schema.test.ts`):
1. **Round-trip morale:** Create FormationState with morale=75, serialize → deserialize → verify morale=75.
2. **Default morale:** Create FormationState without morale, migrate → verify morale=60.
3. **Morale bounds:** Create FormationState with morale=150, migrate → verify clamped to 100. Same for morale=-10 → 0.
4. **Default event log:** Create GameState without displacement_event_log, migrate → verify `[]`.
5. **Event log preservation:** Create GameState with 3 events, serialize → deserialize → verify 3 events preserved with correct fields.

**GATE:** `npx tsc --noEmit` ; `npx vitest run`

**Concurrency:** M1.1 (canon docs) runs in parallel with M1.2+M1.3+M1.4+M1.5 (schema changes).

→ **Refactor-pass** → smoke test (`npx tsc --noEmit` ; `npx vitest run`)

---

## Phase M2: Core Combat Mechanics

### M2.1 — Morale System

#### M2.1a — Population affinity calculation

**READ:**
- `src/state/population_share.ts` — find `MunicipalityPopulation1991Map` and how it's accessed
- `src/sim/phase_ii/attack_resolution_osid.ts` — find where defender's OSID is available during combat

**WRITE** — New file `src/sim/phase_ii/population_affinity.ts`:
```typescript
/**
 * Compute population affinity for a defending brigade at an OSID.
 * affinity = fraction of OSID's 1991 population sharing ethnicity with defending faction.
 * RBiH aligns with bosniak + other; RS with serb; HRHB with croat.
 *
 * Deterministic: pure function, no randomness.
 */
export function computePopulationAffinity(
    faction: FactionId,
    osid: string,
    munPopulation: MunicipalityPopulation1991Map,
    osidToMun: Record<string, string>
): number {
    const munId = osidToMun[osid];
    if (!munId) return 0.5; // neutral default
    const pop = munPopulation[munId];
    if (!pop || pop.total === 0) return 0.5;
    switch (faction) {
        case 'RBiH': return (pop.bosniak + pop.other) / pop.total;
        case 'RS':   return pop.serb / pop.total;
        case 'HRHB': return pop.croat / pop.total;
        default:     return 0.5;
    }
}
```

**Note:** This is a municipality-level affinity (census is per-mun, not per-OSID). All OSIDs in a municipality share the same affinity. This is acceptable — mun boundaries are small enough.

#### M2.1b — Morale initialization

**READ:**
- `src/scenario/scenario_loader.ts` or `src/sim/formation_init.ts` — find where formations are created
- OOB brigade data patterns (personnel, cohesion init)

**WRITE** — Add morale initialization logic alongside cohesion init. Either:
- In the formation creation function, or
- In `migrateState` as part of M1.4 (already defaults to 60)

Per-type initialization values:
```typescript
const MORALE_INIT: Record<string, number> = {
    // By equipment class + enclave status
    'enclave_police': 70,      // Srebrenica — desperation bonus
    'enclave_light':  70,      // Goražde, Žepa — desperation bonus
    'regular_RS':     60,      // VRS professional
    'regular_RBiH':   50,      // Early ARBiH territorial defense
    'regular_HRHB':   55,      // HVO regular
};
```

The simplest approach: set morale during the formation creation loop. For existing saves, migrateState defaults to 60 (M1.4). For new scenarios, set from OOB data:
- Check if brigade's `home_mun` is in `['srebrenica', 'gorazde']` OR `home_osid` contains `zepa` → morale = 70.
- Else: RS → 60, RBiH → 50, HRHB → 55.

**Where to put this:** In `src/sim/phase_ii/recruitment_engine.ts` or wherever `ensureBrigadeComposition` is called during brigade setup. Read the file to find the exact location.

#### M2.1c — Retreat resistance gate

**READ:**
- `src/sim/phase_ii/attack_resolution_osid.ts` lines 796-814 (retreat logic)
- Find the exact point where `flip = true` leads to retreat

**WRITE** in `attack_resolution_osid.ts` — Insert morale check BEFORE retreat execution:

```typescript
// === MORALE-BASED RETREAT RESISTANCE ===
// High morale defenders absorb costly_victory without retreating.
// Deterministic: no randomness.
const MORALE_RESIST_FLOOR = 70;  // Minimum morale to resist retreat
const MORALE_ABSORB_CAS_MULT = 1.35;  // Casualty multiplier when absorbing

if (outcome === 'costly' && defenderFormation.morale !== undefined
    && defenderFormation.morale >= MORALE_RESIST_FLOOR
    && retreatDests.length > 0) {
    // Defender absorbs the costly victory — stays in position
    // Apply partial last-stand casualty multiplier
    defenderCasualties *= MORALE_ABSORB_CAS_MULT;
    attackerCasualties *= MORALE_ABSORB_CAS_MULT;
    // Morale drains from absorbing
    defenderFormation.morale = Math.max(0, defenderFormation.morale - 5);
    // Territory does NOT flip
    flip = false;
    // Mark as absorbed for logging
    // (defender stays, attacker stays, both bleed)
}
```

**Where exactly:** After the outcome is determined (after lines ~660-670 where outcome string is set) but BEFORE the retreat block at lines 796-814. The flip variable is set around lines 640-650 — modify the flip logic.

**Also update combat_predictor.ts** — mirror the morale gate in `predictCombatOutcome()` so bot AI accounts for morale resistance when estimating attack outcomes.

#### M2.1d — Morale drift per turn

**WRITE** — New file `src/sim/phase_ii/morale_drift.ts`:

```typescript
/**
 * Per-turn morale drift for all active formations.
 * Called from turn pipeline after cohesion drift.
 * Deterministic: no randomness.
 */
export function runPhaseIIMoraleDrift(
    state: GameState,
    engagedFormationIds: Set<string>,
    munPopulation: MunicipalityPopulation1991Map,
    osidToMun: Record<string, string>
): void {
    const sortedFormationIds = Object.keys(state.formations).sort();
    for (const fId of sortedFormationIds) {
        const f = state.formations[fId];
        if (!f || f.status !== 'active') continue;
        if (f.morale === undefined) f.morale = 60;

        const osid = f.location_osid;
        if (!osid) continue;

        // 1. Population affinity drift
        const affinity = computePopulationAffinity(f.faction, osid, munPopulation, osidToMun);
        if (affinity > 0.70) {
            f.morale = Math.min(100, f.morale + 2); // Defending own people
        } else if (affinity < 0.30) {
            f.morale = Math.max(0, f.morale - 2);   // Defending enemy territory
        }
        // 0.30-0.70: no affinity drift (neutral)

        // 2. Encirclement reversal
        const isEncircled = state.brigade_encircled?.[fId] === true;
        if (isEncircled && affinity > 0.50) {
            f.morale = Math.min(100, f.morale + 3); // Cornered rat — morale UP
        } else if (isEncircled && affinity <= 0.50) {
            f.morale = Math.max(0, f.morale - 3);   // Standard encirclement demoralization
        }

        // 3. Exhaustion penalty (mirrors cohesion drift pattern)
        const exhaustion = (f.ops?.fatigue ?? 0) / 100;
        if (exhaustion > 0.95) {
            f.morale = Math.max(0, f.morale - 1.5);
        } else if (exhaustion > 0.80) {
            f.morale = Math.max(0, f.morale - 0.5);
        }

        // Clamp
        f.morale = Math.max(0, Math.min(100, Math.round(f.morale * 100) / 100));
    }
}
```

**THEN** register in turn pipeline:
- **READ:** `src/sim/turn_pipeline.ts` line ~946 (phase-ii-cohesion-drift step)
- **WRITE:** Add new step AFTER cohesion drift:
  ```typescript
  {
      name: 'phase-ii-morale-drift',
      run: (state) => {
          if (state.meta.phase !== 'phase_ii') return;
          runPhaseIIMoraleDrift(state, engagedFormationIds, munPopulation, osidToMun);
      }
  },
  ```
  Note: the exact parameters depend on what's available in the pipeline scope. Read the pipeline to confirm how `engagedFormationIds` and population data are accessed.

#### M2.1e — Morale combat effects (attacker morale loss)

**WRITE** in `attack_resolution_osid.ts`:
After combat resolution, update attacker morale based on outcome:
```typescript
// Attacker morale effects
if (attackerFormation.morale !== undefined) {
    switch (outcome) {
        case 'decisive': attackerFormation.morale = Math.min(100, attackerFormation.morale + 3); break;
        case 'victory':  attackerFormation.morale = Math.min(100, attackerFormation.morale + 1); break;
        case 'costly':   /* neutral — costly win is expected */ break;
        case 'stalemate': attackerFormation.morale = Math.max(0, attackerFormation.morale - 2); break;
        case 'repulsed': attackerFormation.morale = Math.max(0, attackerFormation.morale - 5); break;
        case 'catastrophic': attackerFormation.morale = Math.max(0, attackerFormation.morale - 10); break;
    }
}
// Defender morale effects (when NOT absorbing — absorption already handled above)
if (defenderFormation.morale !== undefined && flip) {
    defenderFormation.morale = Math.max(0, defenderFormation.morale - 5); // Lost position
}
if (defenderFormation.morale !== undefined && !flip && outcome !== 'costly') {
    // Survived without absorbing
    defenderFormation.morale = Math.min(100, defenderFormation.morale + 1);
}
```

#### M2.1f — Tests

**WRITE** — New test file `tests/sim/phase_ii/morale.test.ts`:
1. **Population affinity calculation:** Srebrenica (73% Bosniak) → RBiH affinity 0.73. Banja Luka (54% Serb) → RS affinity 0.54.
2. **Retreat resistance gate:** morale=75 + costly_victory → no retreat, casualties applied. morale=40 + costly_victory → retreat as normal.
3. **Decisive always retreats:** morale=100 + decisive → retreat regardless.
4. **Morale drift direction:** High-affinity OSID → morale increases. Low-affinity → decreases.
5. **Encirclement reversal:** Encircled + high affinity → morale UP. Encircled + low affinity → morale DOWN.
6. **Morale bounds:** Never exceeds 100 or drops below 0.
7. **Combat morale effects:** Decisive win → attacker morale +3. Catastrophic → attacker morale -10.

---

### M2.2 — ZoC Defensive Projection

#### M2.2a — Find nearest ZoC-locked defender

**READ:**
- `src/sim/phase_ii/zoc.ts` lines 112-189 (computeLinkedZocForFaction) — understand ZoC component structure
- `src/sim/phase_ii/attack_resolution_osid.ts` lines 901-928 (existing computeZocDefenderPower)
- How the attack resolver knows if an OSID is unoccupied

**WRITE** in `zoc.ts` — New function:
```typescript
/**
 * Find the nearest brigade providing virtual defense for an unoccupied OSID
 * within a linked ZoC component.
 *
 * Returns the defending formation or null if no ZoC defense available.
 * Deterministic: BFS with sorted neighbor iteration.
 */
export function findZocVirtualDefender(
    targetOsid: string,
    defenderFaction: FactionId,
    linkedZoc: string[],          // OSIDs in this ZoC component
    formations: Record<string, FormationState>,
    adjacency: Record<string, string[]>,
    engagedFormationIds: Set<string>  // brigades already in combat
): FormationState | null {
    if (!linkedZoc.includes(targetOsid)) return null;

    // BFS from targetOsid through ZoC component to find nearest brigade
    const visited = new Set<string>();
    const queue = [targetOsid];
    visited.add(targetOsid);

    while (queue.length > 0) {
        const current = queue.shift()!;
        // Check if any non-engaged brigade is at this OSID
        const sortedFIds = Object.keys(formations).sort();
        for (const fId of sortedFIds) {
            const f = formations[fId];
            if (f.faction === defenderFaction
                && f.location_osid === current
                && f.status === 'active'
                && !engagedFormationIds.has(fId)) {
                return f;
            }
        }
        // Expand BFS to adjacent OSIDs within ZoC component
        const neighbors = (adjacency[current] ?? []).sort();
        for (const n of neighbors) {
            if (!visited.has(n) && linkedZoc.includes(n)) {
                visited.add(n);
                queue.push(n);
            }
        }
    }
    return null;
}
```

#### M2.2b — Virtual defense in attack resolution

**WRITE** in `attack_resolution_osid.ts`:
In the attack resolution function, BEFORE the "no defender → free capture" path:

```typescript
// === ZoC VIRTUAL DEFENSE ===
// If target OSID is unoccupied but in a linked ZoC component,
// find nearest ZoC-locked brigade to provide virtual defense.
if (!defenderFormation && targetOsid) {
    const defenderFaction = state.political_controllers?.[targetOsid];
    if (defenderFaction) {
        const linkedZoc = state.war_linked_zoc_by_faction?.[defenderFaction] ?? [];
        const virtualDefender = findZocVirtualDefender(
            targetOsid, defenderFaction, linkedZoc,
            state.formations, adjacency, engagedFormationIds
        );
        if (virtualDefender) {
            // Virtual defense: 50% entrenchment, 50% casualty exposure
            defenderFormation = virtualDefender;
            isVirtualDefense = true;
            virtualDefenseEntrenchmentMult = 0.5;
            virtualDefenseCasualtyMult = 0.5;
            // Brigade stays at its actual OSID — it's defending a forward position
        }
    }
}
```

Then modify the defense power calculation to apply virtual defense multipliers:
- When `isVirtualDefense`: entrenchment bonus × 0.5
- When `isVirtualDefense` and defender loses: OSID flips but defender does NOT retreat (stays at own position), takes 50% normal casualties

Also modify the retreat block: if `isVirtualDefense` and defender loses, skip retreat entirely — the brigade was never "at" the target OSID.

#### M2.2c — Update combat predictor

**READ:** `src/sim/phase_ii/combat_predictor.ts` lines 479-491

**WRITE:** Mirror the virtual defense logic in `predictCombatOutcome()` so bot AI accounts for ZoC defense when evaluating undefended targets. Specifically:
- When predicting attack on unoccupied OSID: check if in ZoC component
- If ZoC defender exists: use virtual defense power instead of "undefended" score
- This prevents bot from treating ZoC-defended OSIDs as free captures

#### M2.2d — Tests

**WRITE** — New test file `tests/sim/phase_ii/zoc_defense.test.ts`:
1. **Virtual defense triggers:** Unoccupied OSID in ZoC → nearest brigade found via BFS.
2. **No defense outside ZoC:** Unoccupied OSID NOT in ZoC → no virtual defender → free capture.
3. **Engaged priority:** Brigade already in combat at own OSID → not available for virtual defense.
4. **50% entrenchment:** Virtual defender's entrenchment bonus is halved.
5. **50% casualties:** Virtual defender takes half normal defender casualties.
6. **No retreat on loss:** When virtual defense loses, defender stays at own OSID; target flips.
7. **BFS determinism:** Multiple equidistant brigades → selected by sorted formation ID.

---

### M2.3 — Integration test

**WRITE** — New test file `tests/sim/phase_ii/combat_morale_zoc_integration.test.ts`:
1. **Combined scenario:** High-morale defender at OSID A, ZoC covers adjacent OSID B. Attacker attacks B.
   - Virtual defense triggers from A.
   - If costly_victory outcome: morale gate checked for virtual defender.
   - Verify: correct casualty application, correct morale drain.
2. **Enclave scenario:** Srebrenica brigade (morale 70, no equipment) defending own OSID.
   - Attacker with tanks/artillery attacks.
   - Verify: high morale resists costly retreat, both sides bleed.
3. **Low-affinity scenario:** RBiH brigade in RS-majority territory.
   - Verify: morale drifts down, retreats readily on costly_victory.

**GATE:** `npx tsc --noEmit` ; `npx vitest run`

**Concurrency:** M2.1 (morale — touches attack_resolution_osid.ts retreat logic) and M2.2 (ZoC — touches attack_resolution_osid.ts early in the function, different section) CAN be parallel IF they touch different sections of attack_resolution_osid.ts. **Risk:** both modify the same file. Safest approach: M2.1 first (morale affects retreat block at lines 796-814), then M2.2 (ZoC affects early no-defender check). Or: implement both in one subagent to avoid merge conflicts.

→ **Refactor-pass** → smoke test (`npx tsc --noEmit` ; `npx vitest run`)

---

## Phase M3: Material Conditions

### M3.1 — Enclave material deprivation

**READ:**
- `data/source/oob_brigades.json` — locate all 13 enclave brigades:
  - arbih_280th through arbih_284th (Srebrenica, 5 brigades)
  - arbih_801st, 802nd, 803rd, 807th, 808th, 843rd, 851st (Goražde, 7 brigades)
  - arbih_285th_light (Žepa, 1 brigade, home_mun "rogatica")
- `src/sim/phase_ii/equipment_effects.ts` — confirm `ensureBrigadeComposition` gives RBiH default (tanks=1, art=3)

**WRITE** in `data/source/oob_brigades.json`:
Add explicit `"composition"` field to each of the 13 enclave brigades:

For **Srebrenica** brigades (5):
```json
"composition": {
    "infantry": 900,
    "tanks": 0,
    "artillery": 0,
    "aa_systems": 0,
    "tank_condition": { "operational": 0, "degraded": 0, "non_operational": 0 },
    "artillery_condition": { "operational": 0, "degraded": 0, "non_operational": 0 }
},
"initial_condition": 0.35
```

For **Goražde** brigades (7):
```json
"composition": {
    "infantry": 1100,
    "tanks": 0,
    "artillery": 0,
    "aa_systems": 0,
    "tank_condition": { "operational": 0, "degraded": 0, "non_operational": 0 },
    "artillery_condition": { "operational": 0, "degraded": 0, "non_operational": 0 }
},
"initial_condition": 0.40
```

For **Žepa** brigade (1):
```json
"composition": {
    "infantry": 600,
    "tanks": 0,
    "artillery": 0,
    "aa_systems": 0,
    "tank_condition": { "operational": 0, "degraded": 0, "non_operational": 0 },
    "artillery_condition": { "operational": 0, "degraded": 0, "non_operational": 0 }
},
"initial_condition": 0.35
```

**ALSO:** Read the formation creation code to confirm how `composition` from OOB is loaded. Grep for where OOB JSON `composition` field is read during brigade creation. If the loader doesn't read `composition` from OOB, we need to add that. Check:
- `src/sim/phase_i/recruitment_engine.ts` or wherever brigades are spawned from OOB
- `src/scenario/scenario_loader.ts` for init-time brigade creation

If the loader only reads `default_equipment_class` and relies on `ensureBrigadeComposition` for defaults, then adding `composition` to OOB JSON alone won't work — we must ALSO ensure the loader copies the explicit composition. **This is a critical verification step.**

**Fallback approach:** If the loader doesn't handle explicit composition from OOB, instead of modifying the loader, add enclave composition overrides in the formation initialization code:
```typescript
// After formation creation, override enclave compositions
const ENCLAVE_MUNS = ['srebrenica', 'gorazde'];
const ZEPA_OSID_PREFIX = 'op:rogatica:zepa';
if (ENCLAVE_MUNS.includes(f.origin_mun ?? '') || f.location_osid?.startsWith(ZEPA_OSID_PREFIX)) {
    f.composition = {
        infantry: f.personnel ?? 900,
        tanks: 0, artillery: 0, aa_systems: 0,
        tank_condition: { operational: 0, degraded: 0, non_operational: 0 },
        artillery_condition: { operational: 0, degraded: 0, non_operational: 0 }
    };
}
```

### M3.2 — Equipment player-proofing verification

**READ:**
- `src/sim/phase_ii/attack_resolution_osid.ts` lines 68-81 (artillery suppression calculation)
- `src/sim/phase_ii/bot_brigade_ai_osid.ts` lines 595-612 (supply penalty)
- `src/sim/phase_ii/combat_predictor.ts` — verify predictor uses same suppression logic

**VERIFY** (document findings, may require no code changes):
1. **HVO→VRS attack:** HVO composition (tanks=10, art=10) vs VRS entrenched.
   - Artillery suppression: `(10*1.0 + 10*0.5) / 100 = 0.15` → only 15% entrenchment suppression.
   - VRS entrenchment at ~85% → HVO attack score should be marginal/negative.
2. **Enclave→VRS attack:** No tanks, no artillery → 0% suppression.
   - CRITICAL supply penalty: -300.
   - Attack score: strongly negative → bot never generates these targets.
3. **VRS→RBiH attack:** VRS (tanks=40, art=30) → suppression `(40*0.5 + 30*1.0) / 100 = 0.50` → 50% entrenchment suppression. Works as intended.

**WRITE:** If any gate is missing, add it. If all gates work, document in report only.

### M3.3 — VRS troop count

**READ:**
- `src/sim/phase_i/pool_population.ts` lines 53-57 (FACTION_POOL_SCALE)

**WRITE** in `pool_population.ts`:
- Change RS FACTION_POOL_SCALE: `0.28` → `0.30`
- Note: design doc says 0.35→0.30 based on older code. Current value is 0.28. Increasing to 0.30 INCREASES VRS from ~97k to ~104k. This may be wrong direction.
- **DECISION NEEDED:** Current RS pool gives ~97k. Target is 97-102k. Current value (0.28) may already be close to target. Check actual VRS strength in latest run before changing.
- If n246 already shows VRS at ~97-102k → do NOT change pool scale. Document "already at target."
- If VRS is still at 116k → investigate why (may be a different parameter causing inflation).

**VERIFY:** Run 40w scenario, check VRS strength at w40.

**Concurrency:** M3.1, M3.2, M3.3 are all independent — **all parallel**.

**GATE:** `npx tsc --noEmit` ; `npx vitest run`

→ **Refactor-pass** → smoke test

---

## Phase M4: Displacement & Bot Strategy

### M4.1 — Per-municipality displacement routing

**READ:**
- `src/state/displacement_routing_data.ts` — current region definitions (73 lines)
- `src/state/displacement_takeover.ts` lines 215-247 — `getPrimaryRouteForSourceMun()` and `getRoutingOrder()`
- Design doc §Mechanic 8 — complete routing tables for all 8 regions × 3 ethnicities

**WRITE** in `src/state/displacement_routing_data.ts`:
Replace the existing region-specific arrays with the comprehensive routing table from design doc.

New structure:
```typescript
interface DisplacementRoute {
    primary: MunicipalityId[];
    secondary: MunicipalityId[];
    abroad_fraction: number;
}

/** Bosniak displacement routes by origin region. */
const BOSNIAK_ROUTES: Record<string, DisplacementRoute> = {
    KRAJINA_NORTHWEST:  { primary: ['travnik', 'jajce'], secondary: ['zenica', 'bihac'], abroad_fraction: 0 },
    KRAJINA_BANJALUKA:  { primary: ['travnik', 'jajce', 'tesanj'], secondary: ['zenica', 'tuzla'], abroad_fraction: 0 },
    // ... (all 20 sub-regions from design doc)
};

/** Croat displacement routes by origin region. */
const CROAT_ROUTES: Record<string, DisplacementRoute> = {
    KRAJINA_ALL:        { primary: ['livno', 'kupres'], secondary: ['mostar', 'capljina'], abroad_fraction: 0.25 },
    POSAVINA_ORASJE:    { primary: ['orasje'], secondary: [], abroad_fraction: 0.70 },
    // ... (all 14 sub-regions from design doc)
};

/** Serb displacement routes by origin region. */
const SERB_ROUTES: Record<string, DisplacementRoute> = {
    TUZLA_AREA:         { primary: ['bijeljina', 'lopare'], secondary: ['doboj', 'banja_luka'], abroad_fraction: 0.30 },
    // ... (all 12 sub-regions from design doc)
};
```

Add the municipality-to-region mapping tables (from design doc §Municipality-to-region mapping):
```typescript
const BOSNIAK_ROUTING_REGION: Record<MunicipalityId, string> = {
    prijedor: 'KRAJINA_NORTHWEST',
    sanski_most: 'KRAJINA_NORTHWEST',
    // ... (all ~110 municipalities)
};
const CROAT_ROUTING_REGION: Record<MunicipalityId, string> = { ... };
const SERB_ROUTING_REGION: Record<MunicipalityId, string> = { ... };
```

Export a single lookup function:
```typescript
export function getDisplacementRoute(
    originMun: MunicipalityId,
    ethnicity: FactionId
): DisplacementRoute | null {
    const regionMap = ethnicity === 'RBiH' ? BOSNIAK_ROUTING_REGION
                    : ethnicity === 'HRHB' ? CROAT_ROUTING_REGION
                    : ethnicity === 'RS'   ? SERB_ROUTING_REGION
                    : null;
    if (!regionMap) return null;
    const region = regionMap[originMun];
    if (!region || region === 'INTERNAL' || region === 'NONE') return null;
    const routes = ethnicity === 'RBiH' ? BOSNIAK_ROUTES
                 : ethnicity === 'HRHB' ? CROAT_ROUTES
                 : SERB_ROUTES;
    return routes[region] ?? null;
}
```

**THEN** update `src/state/displacement_takeover.ts`:

Replace `getPrimaryRouteForSourceMun()` (lines 215-241):
```typescript
function getPrimaryRouteForSourceMun(
    sourceMun: MunicipalityId,
    ethnicity: FactionId,
    state: GameState
): MunicipalityId[] {
    const route = getDisplacementRoute(sourceMun, ethnicity);
    if (!route) return []; // falls to FALLBACK_ROUTES_BY_FACTION
    // Dynamic validation: only include destinations that are friendly-controlled
    const validPrimary = route.primary.filter(destMun =>
        factionControlsAnyOsidInMun(destMun, ethnicity, state)
    );
    const validSecondary = route.secondary.filter(destMun =>
        factionControlsAnyOsidInMun(destMun, ethnicity, state)
    );
    return [...validPrimary, ...validSecondary];
}
```

Keep `FALLBACK_ROUTES_BY_FACTION` as last-resort overflow.

### M4.2 — OSID-level displacement tracking

**READ:**
- `src/state/displacement_takeover.ts` — find where `displaced_out` and `displaced_in` are incremented
- `src/state/game_state.ts` — DisplacementState (already extended in M1.3)

**WRITE** in `displacement_takeover.ts`:
Where `displaced_out` is incremented, also update `displaced_out_by_osid`:
```typescript
displacementState.displaced_out += amount;
// NEW: Track by OSID
if (!displacementState.displaced_out_by_osid) displacementState.displaced_out_by_osid = {};
const originOsid = /* determine from context */;
if (originOsid) {
    displacementState.displaced_out_by_osid[originOsid] =
        (displacementState.displaced_out_by_osid[originOsid] ?? 0) + amount;
}
```

Where `displaced_in` is incremented, also update `displaced_in_by_osid`:
```typescript
destState.displaced_in += settled;
// NEW: Track by OSID
if (!destState.displaced_in_by_osid) destState.displaced_in_by_osid = {};
const destOsid = /* determine from context */;
if (destOsid) {
    destState.displaced_in_by_osid[destOsid] =
        (destState.displaced_in_by_osid[destOsid] ?? 0) + settled;
}
```

Add `ethnicity` field to displacement routing record wherever the routing record is created:
```typescript
const routingRecord: DisplacementRoutingRecord = {
    from_mun: sourceMun,
    to_mun: destMun,
    amount: settled,
    ethnicity: displacedEthnicity, // NEW
    reason: 'hostile_takeover'
};
```

Populate `displacement_event_log` on GameState:
```typescript
if (!state.displacement_event_log) state.displacement_event_log = [];
state.displacement_event_log.push({
    turn: state.meta.turn,
    origin_mun: sourceMun,
    origin_osid: originOsid,
    dest_mun: destMun,
    dest_osid: destOsid,
    ethnicity: displacedEthnicity,
    displaced: amount,
    killed: killedAmount,
    fled_abroad: abroadAmount,
    settled: settledAmount
});
```

### M4.3 — Bot strategy updates

#### M4.3a — Rear-area cleanup priority

**READ:**
- `src/sim/phase_ii/bot_corps_ai.ts` line 1194 (generateCorpsDirectives)
- `src/state/population_share.ts` — census data for hostile population identification

**WRITE** in `bot_corps_ai.ts`:
In `generateCorpsDirectives()`, add rear-area cleanup target generation for weeks 0-10:

```typescript
const REAR_CLEANUP_END_WEEK = 12;
const CLEANUP_WEIGHT = 150;

if (state.meta.turn < REAR_CLEANUP_END_WEEK) {
    // Find OSIDs behind front line with hostile-majority population
    const rearOsids = findRearAreaHostileOsids(
        corpsOsids, faction, state, munPopulation
    );
    for (const osid of rearOsids) {
        directive.offensive_targets.push({
            osid,
            priority: computeCleanupPriority(osid, faction, munPopulation) * CLEANUP_WEIGHT,
            reason: 'rear_cleanup'
        });
    }
}
```

New helper function:
```typescript
function findRearAreaHostileOsids(
    corpsOsids: string[],
    faction: FactionId,
    state: GameState,
    munPopulation: MunicipalityPopulation1991Map
): string[] {
    return corpsOsids
        .filter(osid => {
            // 1. Controlled by this faction
            if (state.political_controllers?.[osid] !== faction) return false;
            // 2. No enemy-controlled neighbors (behind front)
            const neighbors = adjacency[osid] ?? [];
            const hasEnemyNeighbor = neighbors.some(n =>
                state.political_controllers?.[n] &&
                state.political_controllers[n] !== faction
            );
            if (hasEnemyNeighbor) return false;
            // 3. Has hostile-majority population (>40%)
            const affinity = computePopulationAffinity(faction, osid, munPopulation, osidToMun);
            if (affinity > 0.60) return false; // Own population — no cleanup
            return true;
        })
        .sort(); // Deterministic ordering
}
```

#### M4.3b — ARBiH 3rd Corps corridor weight

**READ:**
- `src/sim/phase_ii/bot_strategy.ts` — find Central Corridor Counter priority for RBiH

**WRITE** in `bot_strategy.ts`:
- Find the RBiH army priority for Central Corridor Counter
- Change weight: 60 → 120 (or whatever current value is)
- Add `hold_osids` for: tešanj, maglaj, zavidovići, žepče key OSIDs

#### M4.3c — RS-HRHB co-ethnic scoring

**READ:**
- `src/sim/phase_ii/bot_brigade_ai_osid.ts` lines 573-592 (existing co-ethnic scoring)

**WRITE** in `bot_brigade_ai_osid.ts`:
The co-ethnic scoring already exists at ±80. The design doc calls for RS→HRHB penalty of -400.
Check if this is already handled or needs amplification:
- Current: co-ethnic bipolar -80 to +80 based on ethnic share
- Design: RS attacking HRHB-controlled OSID outside Posavina = -400

If current -80 is insufficient, add explicit RS→HRHB penalty:
```typescript
// RS-HRHB non-aggression (outside Posavina)
if (faction === 'RS' && controllerFaction === 'HRHB') {
    const isPosavina = POSAVINA_CORRIDOR_MUNS.includes(targetMun);
    score += isPosavina ? -100 : -400;
}
```

**Note:** Check if this overlaps with or replaces the existing co-ethnic scoring. May need to merge the logic.

#### M4.3d — Tests

**WRITE** — test files:
1. `tests/sim/phase_ii/rear_cleanup.test.ts`: Verify rear-area targets generated in weeks 0-10, not after.
2. `tests/sim/phase_ii/displacement_routing.test.ts`: Verify routing for key edge cases:
   - Prijedor Bosniak → travnik/jajce (not tuzla)
   - Bijeljina Bosniak → kalesija/tuzla (not zenica)
   - Posavina Croat → orasje + 70% abroad
   - Banja Luka Serb → NOT displaced (RS-controlled)

**Concurrency:** M4.1+M4.2 (displacement) and M4.3 (bot strategy) are independent — **parallel**.

**GATE:** `npx tsc --noEmit` ; `npx vitest run`

→ **Refactor-pass** → smoke test

---

## Phase M5: Advanced — Breakthrough Retreat

**DEPENDS ON:** M2 (morale + retreat changes must be in place first)

**NOTE:** If n256 hits targets without this, defer. HVO Orašje may survive via ZoC defense (M2.2) + material conditions (M3.1). Evaluate after M4.

### M5.1 — Cut-off brigade breakthrough

**READ:**
- `src/sim/phase_ii/zoc.ts` lines 273-303 (getValidRetreatDestinations)
- `src/sim/phase_ii/attack_resolution_osid.ts` lines 796-814 (retreat block)
- How `brigade_encircled` is computed and stored

**WRITE** in `zoc.ts`:
New function for breakthrough path finding:
```typescript
/**
 * Find breakthrough path from cut-off brigade to nearest friendly OSID.
 * BFS through adjacency graph, max M hops.
 * Deterministic: sorted neighbor iteration.
 */
export function findBreakthroughPath(
    fromOsid: string,
    faction: FactionId,
    state: GameState,
    adjacency: Record<string, string[]>,
    maxHops: number = 4
): string[] | null {
    // BFS from fromOsid
    const visited = new Map<string, string>(); // osid → parent
    const queue: Array<{osid: string, depth: number}> = [{osid: fromOsid, depth: 0}];
    visited.set(fromOsid, '');

    while (queue.length > 0) {
        const {osid, depth} = queue.shift()!;
        if (depth > maxHops) continue;

        // Check if this is a friendly OSID (not the start)
        if (osid !== fromOsid && state.political_controllers?.[osid] === faction) {
            // Reconstruct path
            const path: string[] = [];
            let current = osid;
            while (current !== fromOsid) {
                path.unshift(current);
                current = visited.get(current)!;
            }
            return path;
        }

        const neighbors = (adjacency[osid] ?? []).sort();
        for (const n of neighbors) {
            if (!visited.has(n)) {
                visited.set(n, osid);
                queue.push({osid: n, depth: depth + 1});
            }
        }
    }
    return null; // No path found → last stand
}
```

**WRITE** in `attack_resolution_osid.ts`:
In the retreat block (lines 796-814), add breakthrough as 4th destination class:
```typescript
// === BREAKTHROUGH RETREAT ===
// When retreatDests is empty AND isolation >= BREAKTHROUGH_ISOLATION_TURNS:
const BREAKTHROUGH_ISOLATION_TURNS = 2;
const BREAKTHROUGH_POWER_MULT = 0.60;
const BREAKTHROUGH_CASUALTY_PER_HOP = 0.25; // 25% casualties per hop

if (retreatDests.length === 0 && defenderFormation) {
    const isolationTurns = /* compute how long brigade has been without retreat options */;
    if (isolationTurns >= BREAKTHROUGH_ISOLATION_TURNS) {
        const path = findBreakthroughPath(
            defenderFormation.location_osid!,
            defenderFormation.faction,
            state, adjacency, 4
        );
        if (path && path.length > 0) {
            // Breakthrough attempt: move to first OSID in path
            // Apply casualties per hop
            const hopCasualties = Math.floor(
                (defenderFormation.personnel ?? 1000) * BREAKTHROUGH_CASUALTY_PER_HOP
            );
            defenderFormation.personnel = Math.max(0,
                (defenderFormation.personnel ?? 1000) - hopCasualties
            );
            // Move to first hop
            defenderFormation.location_osid = path[0];
            defenderFormation.entrenchment_turns = 0;
            defenderFormation.defense_streak = 0;
            defenderFormation.morale = Math.max(0, (defenderFormation.morale ?? 50) - 10);
            // If multi-hop path: store remaining path for subsequent turns
            // (or resolve all hops immediately with cumulative casualties)
            return; // Skip normal retreat
        }
    }
    // No breakthrough possible → fall through to last stand
}
```

**Isolation tracking:** Need to track how many consecutive turns a brigade has had no retreat destinations. Options:
- Add `isolation_turns?: number` to FormationState (requires schema change)
- Or compute from `brigade_encircled` duration (if tracked)
- Or simplify: trigger breakthrough when `retreatDests.length === 0` AND `brigade_encircled === true` for any duration (remove the N-turns gate for simplicity)

### M5.2 — Tests

**WRITE** — `tests/sim/phase_ii/breakthrough.test.ts`:
1. **HVO Derventa→Orašje:** Brigade at Derventa, no retreat, Orašje 3 hops away and HRHB-controlled. Breakthrough succeeds, 40-60% casualties.
2. **No path:** Brigade fully surrounded, no friendly OSID within 4 hops. Falls back to last stand.
3. **Short path:** 1-hop breakthrough, 25% casualties.
4. **Long path:** 4-hop breakthrough, ~60% cumulative casualties.
5. **Determinism:** Same inputs produce same breakthrough path and casualties.

**GATE:** `npx tsc --noEmit` ; `npx vitest run`

→ **Refactor-pass** → smoke test

---

## Phase M6: Calibration Run n256

### M6.1 — Run scenario

**EXECUTE:**
```bash
npm run sim:scenario:run:40w
```

### M6.2 — Compare against painted targets

**EXECUTE:**
```bash
node tools/compare_painted_vs_sim.cjs runs/<latest_n256_dir>
```

### M6.3 — Analyze results

**VERIFY** against success criteria:

| Metric | n254 | n256 Target | How to measure |
|---|---|---|---|
| Overall OSID match | 81.4% | >85% | compare tool output |
| DRINA region | 62.5% | >80% | compare tool regional |
| CORRIDOR region | 77.7% | >85% | compare tool regional |
| HRHB territory | 83 | 87-90 | count HRHB-controlled OSIDs |
| VRS strength | 116k | 97-102k | final_save.json → sum RS formation personnel |
| Free OSID captures | ~188 | <80 | battle log — combats with no defender |
| Total KIA (40w) | ~6,750 | ~12,000+ | casualty_ledger sum |

### M6.4 — Iterate if needed

If metrics miss targets:
- **DRINA too low:** Increase enclave morale init, strengthen ZoC defense
- **CORRIDOR too low:** Increase 3rd Corps weight further, add hold_osids
- **HRHB too low:** Increase RS-HRHB penalty, verify Orašje ZoC defense
- **VRS too high:** Reduce RS pool scale (0.28 → 0.26)
- **KIA too low:** Lower morale resist floor (70 → 60), increase absorption casualty multiplier
- **Free captures too high:** ZoC defense not triggering — check linked ZoC coverage

**WRITE:** Full report `docs/40_reports/phase_m/20260301_PHASE_M_CALIBRATION_REPORT.md`:
- Territory counts by faction and region
- Army strengths by faction
- Casualty breakdown (KIA, WIA by faction)
- Regional match rates
- Combat log analysis (free captures, morale absorptions, ZoC defenses)
- Comparison vs n254 baseline
- Identified regressions and proposed fixes

→ **Full Paradox team report** under `docs/40_reports/phase_m/`

---

## Phase M7: Closeout

### M7.1 — Final report

**WRITE:** `docs/40_reports/phase_m/20260301_PHASE_M_IMPLEMENTATION_REPORT.md`
- All mechanics implemented with file references
- Test results summary
- Calibration results vs targets
- Deferred items with rationale
- Lessons learned / patterns for napkin

### M7.2 — Update documentation

**WRITE:**
- `.claude/napkin.md` — add new patterns:
  - Morale constants (RESIST_FLOOR, init values)
  - ZoC virtual defense coverage patterns
  - Displacement routing architecture
  - Enclave material deprivation approach
  - Update RS_EARLY_WAR_END_WEEK to current value (20, not 30)
  - Update FACTION_POOL_SCALE to current values
- `docs/PROJECT_LEDGER.md` — append entries for M1-M6
- `docs/PROJECT_LEDGER_KNOWLEDGE.md` — reusable decisions:
  - Morale vs cohesion separation
  - ZoC as attack-resolution modifier (not passive)
  - Census-driven population affinity
  - Per-municipality displacement routing
- `docs/10_canon/ENGINE_INVARIANTS.md` — finalize canon extensions from M1.1
- `docs/10_canon/SYSTEMS_MANUAL.md` — finalize systems updates from M1.1

### M7.3 — Commit and push

**EXECUTE:**
```bash
git add -A
git commit -m "feat(phase-m): implement year-one mechanics — morale, ZoC defense, enclave deprivation, displacement routing

Mechanics: morale system with population affinity, ZoC defensive projection,
enclave material deprivation, per-municipality displacement routing, rear-area
cleanup, breakthrough retreat, equipment player-proofing verification.

Calibration: n256 results — [fill in match rate] OSID match.

Refs: PROJECT_LEDGER Phase M entries."
git push
```

---

## Role Assignments

| Role | Phases | Responsibility |
|---|---|---|
| **Orchestrator** | All | Priority, sequencing, handoffs, convening |
| **Architect** | All | Oversees process; flags decisions for user review |
| **Canon Compliance Reviewer** | M1 | Canon extensions; validates compliance |
| **Systems Programmer** | M1, M4 | Schema/migration, displacement routing, determinism |
| **Gameplay Programmer** | M2, M3, M4, M5 | Morale, ZoC, breakthrough, bot strategy |
| **Game Designer** | M3 | OOB data, equipment verification, enclave design |
| **QA Engineer** | M2, M6 | Integration tests, calibration verification |
| **Scenario Creator** | M6 | Run n256, compare painted targets |

---

## Concurrency Map

```
M1 ─────────────────────────────┐
  Canon docs ──┐                │
  Schema ──────┤ (parallel)     │
  Migration ───┘                │
               refactor-pass    │
                    │           │
M2 ─────────────────┤          │
  Morale ──────┐    │          │
  ZoC Defense ─┘    │          │  ← NOTE: both touch attack_resolution_osid.ts;
  Integration ─     │          │    safest as single subagent, not parallel
               refactor-pass   │
                    │          │
M3 ─────────────────┤         │
  Enclave OOB ─┐    │         │
  Equipment ───┤ (parallel)   │
  Pool scale ──┘    │         │
               refactor-pass  │
                    │         │
M4 ─────────────────┤        │
  Displacement ┐    │        │
  Bot strategy ┤ (parallel)  │
               ┘    │        │
               refactor-pass │
                    │        │
M5 (optional) ─────┤        │
  Breakthrough      │        │
               refactor-pass │
                    │        │
M6 ─────────────────┤       │
  n256 run + report │       │
                    │       │
M7 closeout ────────┘       │
```

---

## Deferred Work (Post-n256)

| Item | Reason |
|---|---|
| Phase restructuring (Phase 0/I/II → Peace/War) | 25-35 hours, 850 refs across 110 files; does not affect calibration |
| 52w validation | After 40w converges to >85% |
| Morale UI display | GUI work — separate workstream |
| Displacement event log UI | GUI work — separate workstream |

---

## Decisions Flagged for User Review

1. **Phase restructuring deferred:** Phase 0/I/II → Peace/War is already canon v0.6.0 but code uses old names. Implementing mechanics first within `phase_ii` is faster. Restructuring comes after n256. **Agree?**
2. **Breakthrough retreat (M5) is optional:** If n256 hits targets without it, defer. HVO Orašje may survive via ZoC defense + material conditions alone. **Agree?**
3. **Canon docs updated before code:** Engine Invariants and Systems Manual get extensions BEFORE Gameplay Programmer writes mechanics. **Agree?**
4. **Morale is NOT monotonic:** Unlike exhaustion, morale can increase (affinity bonus, encirclement reversal) and decrease (defeat, low affinity). This is a deliberate design decision. **Agree?**
5. **RS pool scale direction:** Current FACTION_POOL_SCALE for RS is 0.28 (not 0.35 as design doc states). Increasing to 0.30 would INCREASE VRS by ~6k. Need to verify current VRS strength before deciding direction. **Confirm current VRS strength target and whether pool change is still needed.**
6. **M2.1 and M2.2 sequencing:** Both morale (retreat logic) and ZoC defense (early attack logic) modify `attack_resolution_osid.ts`. Safest as a single subagent to avoid merge conflicts, despite touching different sections. **Agree with sequential implementation?**

---

## Discovered Issues

1. **Žepa has 1 brigade** (not 0 as previously thought): `arbih_285th_light` in municipality "rogatica" with home_osid `op:rogatica:zepa_2`. Personnel 600, cohesion 48.
2. **No explicit composition in OOB:** All 240 brigades rely on `ensureBrigadeComposition` faction defaults. Need to verify the loader actually reads/applies explicit `composition` from OOB before adding it to enclave brigade entries.
3. **Co-ethnic scoring already exists** at ±80 in bot_brigade_ai_osid.ts. The -400 RS→HRHB penalty in the design doc would be ADDITIVE on top of this.
4. **Alliance filter already symmetric:** Both RBiH→HRHB and HRHB→RBiH attack blocking already implemented.
5. **RS FACTION_POOL_SCALE is 0.28** (not 0.35) — design doc calibration proposal was based on older code.
6. **Napkin RS_EARLY_WAR_END_WEEK says 30** but code has 20 — napkin entry is stale. Will fix in M7.
