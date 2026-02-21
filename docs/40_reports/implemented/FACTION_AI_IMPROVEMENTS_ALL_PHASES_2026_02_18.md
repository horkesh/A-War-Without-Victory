# Implemented Work — Faction AI Improvements Across All Phases

**Date:** 2026-02-18
**Status:** Complete
**Scope:** Comprehensive faction AI overhaul across Phase 0 (pre-war), Phase I (early war), and Phase II (mid-war): pipeline integration fixes, faction-specific strategies, expanded operations catalog, defensive OGs, emergency operations, inter-corps coordination, and dynamic economy of force

---

## Summary

Six-stage improvement to faction bot AI spanning all three game phases. Fixes a critical integration gap where Phase 0 bot investments were silently skipped during headless scenario runs, creates a new Phase I bot AI from scratch, and substantially expands Phase II corps-level decision-making with more operations, defensive OGs, emergency defensive reactions, and multi-corps coordination.

---

## Stage 1: Phase 0 Bot Integration Fix

### Problem

`runPhase0BotInvestments()` was called from the warroom UI (`src/ui/warroom/run_phase0_turn.ts:130`) but **not** from `runOneTurn()` in `src/state/turn_pipeline.ts`. This meant all headless scenario runs via `scenario_runner.ts` skipped bot investments entirely — factions never invested during Phase 0 in automated runs.

### Fix

**File:** `src/state/turn_pipeline.ts`

Added Phase 0 bot investment and relationship initialization inside the `if (working.meta.phase === 'phase_0')` block, mirroring the warroom logic:

```typescript
// Ensure Phase 0 relationships are initialized (mirrors warroom logic)
if (!working.phase0_relationships) {
  working.phase0_relationships = initializePhase0Relationships();
}
// Bot AI: non-player factions invest (mirrors warroom run_phase0_turn.ts)
const playerFaction = working.meta.player_faction ?? undefined;
runPhase0BotInvestments(working, playerFaction, `phase0-bot-t${working.meta.turn}`);
```

### Impact

Headless scenario runs now produce municipalities with non-zero organizational penetration values, reflecting actual bot investment decisions during the pre-war period.

---

## Stage 2: Phase II Operations Catalog & Defensive OGs

### 2A: Expanded Named Operations

**File:** `src/sim/phase_ii/bot_corps_ai.ts` — `getOperationCatalog()`

Added 2 new operations per faction (6 total), bringing each faction from 3 to 5 named operations:

| Faction | New Operation | Type | Target Municipalities |
|---|---|---|---|
| RS | Bihac Containment | sector_attack | bihac, cazin, bosanska_krupa, bosanski_petrovac |
| RS | Krajina Consolidation | strategic_defense | prijedor, banja_luka, sanski_most, kljuc |
| RBiH | Tuzla Widening | sector_attack | tuzla, kalesija, lukavac, zivinice |
| RBiH | Bihac Pocket Defense | strategic_defense | bihac, cazin, velika_kladusa |
| HRHB | Usora Pocket | sector_attack | zepce, usora, maglaj |
| HRHB | Posavina Defense | strategic_defense | orasje, odzak, bosanski_brod |

### 2B: Defensive and Corridor Breach OGs

**File:** `src/sim/phase_ii/bot_corps_ai.ts` — `generateOGActivationOrders()`

Previously, OGs could only activate during `execution` phase of `sector_attack` or `general_offensive` operations. Now:

- **Defensive OGs enabled:** OGs can form during `strategic_defense` operations with `posture: 'defend'`
- **Type-aware posture:** `posture: op.type === 'strategic_defense' ? 'defend' : 'attack'`
- **Corridor breach minimum reduced:** Donor threshold lowered from 3 to 2 for corridor breach and HRHB operations, enabling smaller but still meaningful task forces

**File:** `src/state/game_state.ts` — `OGActivationOrder`

Extended posture type from `'probe' | 'attack'` to `'probe' | 'attack' | 'defend'` to support defensive OG orders.

---

## Stage 3: Emergency Defensive Operations

### Problem

Operations only launched from offensive/balanced corps. No mechanism existed for high-threat defensive corps to concentrate force and respond to emergencies.

### Solution

**File:** `src/sim/phase_ii/bot_corps_ai.ts`

New function `generateEmergencyDefensiveOperations()` (~80 lines):

1. Iterates defensive corps with no active operation
2. Computes sector threat ratio via `computeSectorThreat()`
3. When threat exceeds `EMERGENCY_THREAT_THRESHOLD` (2.0), launches a `strategic_defense` operation
4. Builds target settlements from enemy-held settlements adjacent to the corps AoR
5. Uses available healthy brigades as participants, up to `EMERGENCY_OP_MAX_BRIGADES` (4)

### Integration

Wired into `generateAllCorpsOrders()` as step 3b (after named operations, before corridor breach detection). This enables defensive OGs (from Stage 2B) to form during emergencies.

---

## Stage 4: Phase 0 Faction-Specific Strategies

### Problem

All factions used identical scoring/priority logic (police → TO → party → paramilitary) with the same budget and scoring weights. Historically, RS prioritized paramilitaries (White Eagles, Arkan's Tigers), HRHB focused on police and HDZ party apparatus in Herzegovina, and RBiH invested in Territorial Defense (TO).

### Solution

**File:** `src/phase0/bot_phase0.ts` — complete rewrite

Added `FactionPhase0Strategy` interface and `FACTION_PHASE0_STRATEGIES` record:

| Parameter | RS | RBiH | HRHB |
|---|---|---|---|
| Priority Order | paramilitary → party → police | TO → party → police → paramilitary | police → party → paramilitary |
| Budget Fraction | 15% (aggressive) | 12% | 12% |
| Budget Cap | 10 | 8 | 8 |
| Consolidation Bonus | 40 (deepen strongholds) | 25 | 35 |
| Contested Bonus | 5 (avoids contested areas) | 15 (must contest for survival) | 8 |
| Own Controller Bonus | +20 | +15 | +20 |
| Enemy Controller Penalty | -20 | -10 | -15 |

### Faction-Specific Scoring

`scoreMunicipality()` now accepts a faction `strategy` parameter and uses faction-specific weights instead of hardcoded values. RS gets higher consolidation bonuses (prefers deepening hold in strongholds), RBiH gets higher contested bonuses (must contest mixed areas for survival).

### Alliance-Aware Coordination

`shouldCoordinate()` function: RBiH and HRHB bots prefer coordinated investments when the alliance relationship > 0.2. Coordinated investments use the 0.8× cost multiplier and strengthen ties. After each successful investment, `updateAllianceAfterInvestment()` is called to maintain alliance tracking.

---

## Stage 5: Inter-Corps Coordination & Economy of Force

### 5A: Multi-Corps Offensive Coordination

**File:** `src/sim/phase_ii/bot_corps_ai.ts`

New function `coordinateMultiCorpsOffensive()` (~40 lines):

- Activates during `general_offensive` army standing orders
- Scores each corps by offensive potential: healthy brigades × average personnel, penalized by exhaustion
- Pre-sets top 2 corps to `offensive` stance, leaving others for local conditions to decide
- Wired into `generateAllCorpsOrders()` as step 0b (before per-corps stance logic)

### 5B: Broader Corridor Detection

**File:** `src/sim/phase_ii/bot_corps_ai.ts`

- Increased `CORRIDOR_BREACH_MAX_STRIP_WIDTH` from 5 to 8
- Allows detection and response to wider corridor configurations (6-8 settlements) that were previously ignored

### 5C: Dynamic Economy of Force

**File:** `src/sim/phase_ii/bot_brigade_ai.ts`

Replaced static `MAX_ELASTIC_DEFENSE_PER_FACTION = 2` with dynamic scaling:

```typescript
const MIN_ELASTIC_DEFENSE = 1;
const MAX_ELASTIC_DEFENSE = 4;
const ELASTIC_DEFENSE_RATIO = 5;

const frontBrigadeCount = brigades.filter(b => hasFrontActiveSettlements(state, b, adj)).length;
const maxElasticDefense = Math.max(
  MIN_ELASTIC_DEFENSE,
  Math.min(MAX_ELASTIC_DEFENSE, Math.floor(frontBrigadeCount / ELASTIC_DEFENSE_RATIO))
);
```

This scales the elastic defense reserve proportionally: 1 brigade per 5 front brigades, bounded [1, 4]. Factions with longer fronts get more flexible reserves; small factions don't over-commit to elastic defense.

---

## Stage 6: Phase I Bot AI (New)

### Problem

Phase I turn pipeline had no bot AI step. The legacy `SimpleGeneralBot`/`BotManager` only ran from `scenario_runner.ts`, not from the canonical `runTurn()` pipeline. Phase I (2-8 weeks of early war) had no automated posture management.

### Solution

**New file:** `src/sim/phase_i/bot_phase_i.ts`

Lightweight posture assignment bot for the Phase I transitional period. Assigns `hold`, `probe`, or `push` posture to front edges for each bot-controlled faction.

#### Faction Profiles (`PHASE_I_PROFILES`)

| Parameter | RS | RBiH | HRHB |
|---|---|---|---|
| Push Share | 0.40 | 0.08 | 0.20 |
| Probe Share | 0.30 | 0.25 | 0.25 |
| Early Push Boost (weeks 0-12) | +0.15 | -0.05 | 0.00 |

- **RS** aggressively pushes early (JNA equipment advantage), with 40% of edges on push and an additional 15% boost in the first 12 weeks
- **RBiH** mostly defensive in Phase I (survival mode), only 8% push, with a negative early boost
- **HRHB** moderate posture, consolidating Herzegovina

#### Algorithm

1. Filter front edges to those where the faction is on one side
2. **Alliance-aware:** RBiH and HRHB skip each other's edges when `phase_i_alliance_rbih_hrhb >= 0.2`
3. Sort edges by deterministic hash (`edgeHash`) for varied assignment (not alphabetical)
4. Assign `push` to top `push_share` fraction, `probe` to next `probe_share` fraction, `hold` to the rest
5. Write to `state.front_posture[faction].assignments`

#### Pipeline Integration

**File:** `src/sim/turn_pipeline.ts`

Added `phase-i-bot-posture` step to `phaseIPhases` array, positioned between `phase-i-formation-spawn` and `phase-i-alliance-update`:

- Computes front edges via `computeFrontEdges()`
- Determines bot factions (all factions minus `player_faction`)
- Calls `runPhaseIBotPosture(state, frontEdges, botFactions)`

---

## Files Modified

| File | Stages | Changes |
|---|---|---|
| `src/state/turn_pipeline.ts` | 1 | Wire Phase 0 bot investments + relationship init into `runOneTurn` |
| `src/sim/phase_ii/bot_corps_ai.ts` | 2, 3, 5A, 5B | Operations catalog (15 total), defensive OGs, emergency ops, multi-corps coordination, corridor width 8 |
| `src/state/game_state.ts` | 2 | `OGActivationOrder.posture` extended with `'defend'` |
| `src/phase0/bot_phase0.ts` | 4 | Complete rewrite: faction-specific strategies, alliance-aware investment |
| `src/sim/phase_ii/bot_brigade_ai.ts` | 5C | Dynamic elastic defense scaling [1, 4] based on front length |
| `src/sim/phase_i/bot_phase_i.ts` | 6 | **New file:** Phase I bot posture assignment |
| `src/sim/turn_pipeline.ts` | 6 | `phase-i-bot-posture` step added to Phase I pipeline |

---

## Verification

- `npx tsc --noEmit` — clean (0 errors)
- `npm run test:vitest` — 130/130 tests pass
- All changes maintain determinism invariants: `strictCompare` ordering, no `Math.random()`, sorted iteration

---

## Design Notes

### Determinism

Every new function maintains strict determinism:
- `edgeHash()` and `simpleHash()` for tie-breaking (no randomness)
- All iterations over Records/Maps use `Object.keys().sort(strictCompare)`
- OG donor selection uses sorted brigade IDs
- Emergency operation target building uses sorted settlement adjacency

### Historical Accuracy

- **RS paramilitaries first** reflects the actual pre-war pattern: Arkan's Tigers, White Eagles, and SDS party networks were mobilized before police takeovers
- **RBiH TO focus** reflects the Territorial Defense being the primary institutional asset available to the Bosniak side
- **HRHB police/party** reflects HDZ party apparatus and police loyalty in Herzegovina as the foundation of Croat control
- **RS early push boost** reflects the JNA equipment advantage in the first months of war
- **RBiH defensive stance** reflects the existential survival mode of the early war period

### Negative-Sum Design

The AI improvements reinforce the game's core negative-sum thesis:
- Emergency defensive operations create reactive force concentration, not proactive conquest
- Alliance-aware coordination has diminishing returns (alliance degradation over time)
- Dynamic economy of force prevents over-commitment but doesn't grant superiority
- Defensive OGs enable last-stand concentrations, reflecting historical pocket defense patterns
