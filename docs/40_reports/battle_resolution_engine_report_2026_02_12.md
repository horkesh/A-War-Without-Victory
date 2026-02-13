# Battle Resolution Engine Implementation Report

**Date:** 2026-02-12
**Scope:** Replace simplistic garrison-based combat with multi-factor battle resolution engine consuming terrain, equipment, experience, corps command, and introducing casualty tracking with dramatic snap events.

---

## 1. Summary

The previous combat system was a placeholder: a brigade attacked a settlement, and if its aggregated garrison exceeded the defender's garrison, the settlement flipped with fixed 40/60 personnel losses. No terrain effects, no experience scaling, no battle reports, no casualty breakdown.

This implementation replaces that system with a comprehensive battle engine that:
- Consumes all six terrain scalars (previously modeled but completely inert since Phase H6.8)
- Integrates every formation-level attribute into a unified combat power formula
- Produces per-battle casualty breakdowns (KIA, WIA, MIA/captured) and equipment losses
- Tracks cumulative war-long casualties per faction and per formation
- Generates four deterministic "snap & pop" surprise events that emerge from existing state
- Maintains full backward compatibility with the existing report interface

---

## 2. Problem Statement

### Before
| Aspect | Previous Behavior |
|--------|-------------------|
| Combat resolution | Garrison sum comparison, flat threshold |
| Casualty model | Fixed 40 attacker / 60 defender per flip |
| Terrain effects | None (six scalars computed but INERT) |
| Experience/training | Not consumed in combat |
| Corps command | Not consumed in combat |
| Named operations | Not consumed in combat |
| Battle reports | Minimal: brigade_id, target, won/lost |
| Cumulative tracking | None |
| Equipment losses in battle | None (only degradation over time) |

### After
| Aspect | New Behavior |
|--------|-------------|
| Combat resolution | Multi-factor power ratio with 1.3× victory threshold |
| Casualty model | Intensity-scaled, 25% KIA / 55% WIA / 20% MIA |
| Terrain effects | Rivers (+40%), slope (+30%), urban (+25/40%), friction (+20%), roads |
| Experience/training | 0.6× (green) to 1.4× (veteran) multiplier |
| Corps command | Stance multipliers (defensive 0.7×–1.2×, offensive 1.2×–0.8×) |
| Named operations | Execution phase: 1.5× pressure |
| Battle reports | Full breakdown: every factor itemized, terrain, snap events |
| Cumulative tracking | Per-faction and per-formation KIA/WIA/MIA + equipment |
| Equipment losses | Tanks at 2%/intensity, artillery at 1%/intensity per battle |

---

## 3. Implementation Delivered

### 3.1 New files

**`src/map/terrain_scalars.ts`** — Terrain data loader
- Reads `data/derived/terrain/settlements_terrain_scalars.json` (6,137 settlement entries)
- Caches after first load; sync getter with default flat-terrain fallback
- Exports: `TerrainScalars`, `TerrainScalarsData`, `loadTerrainScalars()`, `getTerrainScalarsForSid()`, `setTerrainScalarsCache()` (for tests), `clearTerrainScalarsCache()`

**`src/state/casualty_ledger.ts`** — Casualty tracking state
- `FormationCasualties { killed, wounded, missing_captured }`
- `FactionEquipmentLosses { tanks, artillery, aa_systems }`
- `FactionCasualtyLedger` with faction-level totals + `per_formation` breakdown
- `CasualtyLedger = Record<FactionId, FactionCasualtyLedger>`
- Helpers: `initializeCasualtyLedger()`, `recordBattleCasualties()`, `recordEquipmentLoss()`, `getFactionTotalCasualties()`

**`src/sim/phase_ii/battle_resolution.ts`** — Main combat engine (~550 lines)
- Entry point: `resolveBattleOrders(state, edges, terrainData, settlementToMun): BattleResolutionReport`
- Exported types: `BattleOutcome`, `BattleCasualties`, `CombatPowerBreakdown`, `TerrainModifiers`, `SnapEvent`, `BattleReport`, `BattleResolutionReport`
- Exported helper: `computeTerrainModifier()` (for direct testing)

### 3.2 Modified files

**`src/state/game_state.ts`**
- Added `casualty_ledger?: CasualtyLedger` to `GameState` interface
- Added import of `CasualtyLedger` from `casualty_ledger.ts`

**`src/sim/phase_ii/resolve_attack_orders.ts`**
- Replaced entire implementation body with delegation to `resolveBattleOrders()`
- `resolveAttackOrders()` now accepts optional `terrainData` and `settlementToMun` params (defaults to empty for backward compatibility)
- `ResolveAttackOrdersReport` retains flat `casualty_attacker`/`casualty_defender`/`details` fields; new `battle_report?: BattleResolutionReport` field provides full detail

**`src/sim/turn_pipeline.ts`**
- `phase-ii-resolve-attack-orders` step now:
  1. Loads settlement graph (with `mun1990_id` for municipality lookup)
  2. Builds `settlementToMun` map from `graph.settlements`
  3. Loads terrain scalars (cached, with fallback to empty on error)
  4. Passes terrain + mun map to `resolveAttackOrders()`
- Added import of `loadTerrainScalars`

---

## 4. Combat Power Formula

### 4.1 Attacker combat power

```
AttackerPower = AggregateGarrison
  × EquipmentMult(formation, posture)    // tanks + artillery with condition
  × ExperienceMult(experience)            // 0.6 + 0.8 × exp[0,1]
  × CohesionFactor(cohesion / 100)        // [0, 1]
  × PosturePressureMult(posture)          // defend=0.3, probe=0.7, attack=1.5, elastic=0.2
  × SupplyFactor                          // 1.0 if supplied within 2 turns, else 0.4
  × ReadinessMult                         // active=1.0, overextended=0.5, degraded=0.2, forming=0
  × CorpsStancePressureMult               // defensive=0.7, balanced=1.0, offensive=1.2, reorg=0.0
  × OperationMult                         // execution=1.5, planning=1.0, recovery=0.6
  × OGBonus                               // 1.3 if OG, else 1.0
  × ResilienceMult                        // existential threat, home defense, cohesion under pressure
  × DisruptionMult                        // 0.5 if disrupted, else 1.0
```

AggregateGarrison = sum of garrison at all attacker's AoR settlements adjacent to target (existing pattern from `getBrigadeAoRSettlements` + `getSettlementGarrison`).

### 4.2 Defender combat power

Same formula as attacker, but with:
- Defense posture multipliers (defend=1.5, probe=1.0, attack=0.5, elastic=1.2)
- Defense corps stance multipliers (defensive=1.2, offensive=0.8)
- **Terrain modifier** (composite, applied to defender only)
- **Front hardening** (1 + min(0.5, active_streak × 0.05))

### 4.3 Terrain modifier (defending settlement)

```
TerrainMult = (1 + River + Slope + Urban + Friction) × RoadAccess
```

| Factor | Source scalar | Formula | Range |
|--------|-------------|---------|-------|
| River crossing | `river_crossing_penalty` | `penalty × 0.40` | [0, +40%] |
| Slope/elevation | `slope_index` | `slope × 0.30` | [0, +30%] |
| Urban defense | municipality lookup | 0.25 (large urban) / 0.40 (Sarajevo core) | fixed |
| Terrain friction | `terrain_friction_index` | `friction × 0.20` | [0, +20%] |
| Road access | `road_access_index` | `0.85 + 0.15 × road_access` | [0.85, 1.0] mult |

Sarajevo core = centar_sarajevo, novi_grad_sarajevo, novo_sarajevo, stari_grad_sarajevo.
Large urban = 18 municipalities with 1991 pop ≥ 60k (from `LARGE_URBAN_MUN_IDS`).

---

## 5. Outcome Determination

| Power Ratio (Attacker / Defender) | Outcome | Settlement Flips? |
|-----------------------------------|---------|-------------------|
| ≥ 1.3 | `attacker_victory` | Yes |
| 0.8 – 1.3 | `stalemate` | No |
| < 0.8 | `defender_victory` | No |
| Defender power = 0 | `attacker_victory` (undefended) | Yes |

The threshold was raised from the old 1.0 to 1.3, reflecting historical reality: defenders generally held positions unless the attacker had a decisive advantage.

---

## 6. Casualty Model

### 6.1 Personnel casualties

Casualties scale with **engagement intensity** (the weaker side's combat power, normalized to 500-garrison baseline):

```
intensity_factor = min(AttackerPower, DefenderPower) / 500
base_casualties = 20 × intensity_factor

Attacker losses = base × (1 / max(0.5, power_ratio)) × urban_mult × snap_mults
Defender losses = base × min(2.0, power_ratio) × (1 / terrain_composite) × snap_mults
Both sides: minimum 5 casualties per engagement
```

**Urban casualty multiplier** (attacker only):
- Standard large urban: 1.5×
- Sarajevo core: 2.0×
- Non-urban: 1.0×

**Category breakdown**: 25% KIA, 55% WIA, 20% MIA/captured (historical BiH war ratios).

**Surrender cascade override**: 5% KIA, 10% WIA, 85% captured.

### 6.2 Equipment losses

Per battle, based on intensity:
- **Tank loss rate**: 2% × intensity_factor × posture_mult (attack = 1.5×)
- **Artillery loss rate**: 1% × intensity_factor
- Defender equipment losses reduced by terrain protection (1 / terrain_composite)
- Lost units removed from brigade composition; surviving equipment takes additional condition wear

### 6.3 Personnel floor

No formation can be reduced below `MIN_BRIGADE_SPAWN` (currently 1000) through combat casualties. This preserves the formation as a functional unit that can be reinforced.

---

## 7. Snap & Pop Events

Four deterministic surprise mechanics, all triggered by existing state conditions:

### 7.1 Ammunition Crisis
- **Trigger**: Defender unsupplied for ≥ 4 consecutive turns
- **Effect**: Defender combat power × 0.3; more captured than killed
- **Historical basis**: Bihac pocket, Srebrenica, Gorazde enclaves all faced severe ammo shortages

### 7.2 Commander Casualty
- **Trigger**: Formation loses ≥ 15% personnel in one battle AND experience > 0.3
- **Effect**: Experience drops 0.15, cohesion drops 8
- **Historical basis**: Loss of JNA-trained officers was devastating for all sides early in the war

### 7.3 Last Stand
- **Trigger**: Defender surrounded (all adjacent settlements enemy-controlled) AND cohesion ≥ 40
- **Effect**: Defender power × 1.8, attacker casualties × 1.5, defender casualties × 1.3
- **Historical basis**: Brcko corridor defense, Maglaj pocket — desperate defense, bloody for everyone

### 7.4 Surrender Cascade
- **Trigger**: Defender surrounded AND cohesion < 15 AND unsupplied ≥ 2 turns
- **Effect**: Defender power × 0.1, entire garrison captured, equipment seized at 25% rate
- **Historical basis**: Fall of Jajce, collapse of Krajina pocket

Last Stand and Surrender Cascade are **mutually exclusive** (cohesion threshold 40 vs 15).

### 7.5 Pyrrhic Victory (post-battle)
- **Trigger**: Attacker wins but loses > 20% of personnel
- **Effect**: Outcome reclassified as `pyrrhic_victory`, brigade gets -10 cohesion and is marked disrupted
- Settlement still flips, but the winning brigade is combat-ineffective next turn

---

## 8. Cumulative Casualty Ledger

`GameState.casualty_ledger` tracks total war casualties:

```
CasualtyLedger[FactionId] = {
  killed: number,
  wounded: number,
  missing_captured: number,
  equipment_lost: { tanks, artillery, aa_systems },
  per_formation: {
    [FormationId]: { killed, wounded, missing_captured }
  }
}
```

Initialized automatically on the first Phase II turn with attack orders. Updated after each battle. Persists across turns in GameState.

---

## 9. Historical Plausibility

| Scenario | Expected Outcome | Mechanism |
|----------|-----------------|-----------|
| RS attacks RBiH in open terrain | RS wins | 40 tanks + 30 artillery vs 3+8 → massive equipment multiplier gap |
| RS attacks Sarajevo | Stalemate or pyrrhic | Urban +40%, river, resilience up to +65%, front hardening up to +50% |
| RBiH defends mountain village | RBiH holds | Slope +30%, friction +20%, home defense +20%, low road access |
| HRHB attacks Mostar | HRHB wins slowly | Medium equipment, urban +25%, Croatia supply (maintained equipment) |
| Encircled pocket (Gorazde-like) | Ammo crisis → eventual surrender | Unsupplied 4+ turns, cohesion decay, snap events cascade |
| Large offensive with high casualties | Pyrrhic victory | >20% loss → disrupted, cannot press advantage next turn |

---

## 10. Battle Report Structure

Each engagement produces a `BattleReport` containing:

- **Identification**: turn, attacker/defender brigade IDs and factions, target settlement
- **Combat power breakdown**: every multiplier factor itemized for both sides (equipment, experience, cohesion, posture, supply, readiness, corps stance, operation, OG, resilience, disruption, terrain, hardening, total)
- **Terrain modifiers**: river, elevation, urban, friction, road access, composite
- **Power ratio**: attacker / defender (rounded to 2 decimals)
- **Outcome**: `attacker_victory` | `defender_victory` | `stalemate` | `pyrrhic_victory`
- **Casualties**: { attacker: {killed, wounded, missing_captured, tanks_lost, artillery_lost}, defender: same }
- **Settlement flipped**: boolean
- **Snap events**: array of { type, description, affected_formation, mechanical_effect }

The aggregate `BattleResolutionReport` includes `battles_fought`, `flips_applied`, totals, and the full `battles[]` array.

---

## 11. Verification

### Type checking
- `npx tsc --noEmit` — PASS (clean)

### New tests (`tests/battle_resolution.test.ts` — 15 tests, all PASS)
1. Attacker wins on open terrain with superior force
2. Defender holds with terrain advantage (river + mountain + friction)
3. Terrain modifier computation (exact values)
4. Urban defense bonus for Sarajevo (0.40)
5. Casualty ledger tracks cumulative losses (per-faction and per-formation)
6. Equipment losses reduce brigade composition
7. Undefended settlement falls with minimal casualties
8. Determinism — identical inputs produce identical outputs
9. Backward compatibility via `resolveAttackOrders` wrapper
10. Snap event: ammo crisis when unsupplied 4+ turns
11. Snap event: last stand when surrounded with cohesion ≥ 40
12. Snap event: surrender cascade when surrounded + low cohesion + unsupplied
13. No attack orders → no battles
14. Casualty ledger: initialize and accumulate
15. Battle report contains all expected fields

### Existing tests
- `npx vitest run` — 94/94 PASS (no regressions)

---

## 12. Constants Reference

| Constant | Value | Purpose |
|----------|-------|---------|
| `ATTACKER_VICTORY_THRESHOLD` | 1.3 | Power ratio for settlement flip |
| `STALEMATE_LOWER_BOUND` | 0.8 | Below this, defender wins outright |
| `BASE_CASUALTY_PER_INTENSITY` | 20 | Casualties per 500-strength intensity unit |
| `MIN_CASUALTIES_PER_BATTLE` | 5 | No free wins |
| `KIA_FRACTION` | 0.25 | 25% of total casualties |
| `WIA_FRACTION` | 0.55 | 55% of total casualties |
| `EXPERIENCE_MULT_BASE / SCALE` | 0.6 / 0.8 | Green=60%, veteran=140% effectiveness |
| `RIVER_DEFENSE_SCALE` | 0.40 | Max river crossing defender bonus |
| `SLOPE_DEFENSE_SCALE` | 0.30 | Max slope defender bonus |
| `URBAN_DEFENSE_BONUS` | 0.25 | Standard large urban defense |
| `SARAJEVO_DEFENSE_BONUS` | 0.40 | Sarajevo core defense |
| `FRICTION_DEFENSE_SCALE` | 0.20 | Max terrain friction defender bonus |
| `PYRRHIC_THRESHOLD` | 0.20 | 20% personnel loss = pyrrhic |
| `AMMO_CRISIS_TURNS` | 4 | Unsupplied turns for ammo crisis |
| `LAST_STAND_DEFENDER_MULT` | 1.8 | Defender power in last stand |
| `SURRENDER_COHESION_MAX` | 15 | Below this + surrounded + unsupplied = surrender |
| `SURRENDER_CAPTURE_RATE` | 0.25 | Equipment capture on surrender |
| `TANK_LOSS_RATE` | 0.02 | Base tank loss per intensity unit |
| `ARTILLERY_LOSS_RATE` | 0.01 | Base artillery loss per intensity unit |

---

## 13. Artifacts

| File | Status |
|------|--------|
| `src/map/terrain_scalars.ts` | **New** |
| `src/state/casualty_ledger.ts` | **New** |
| `src/sim/phase_ii/battle_resolution.ts` | **New** |
| `src/state/game_state.ts` | Modified (added `casualty_ledger`) |
| `src/sim/phase_ii/resolve_attack_orders.ts` | Modified (delegated to battle engine) |
| `src/sim/turn_pipeline.ts` | Modified (terrain loading, mun map) |
| `tests/battle_resolution.test.ts` | **New** (15 tests) |
| `docs/PROJECT_LEDGER.md` | Updated |
| `docs/40_reports/battle_resolution_engine_report_2026_02_12.md` | **New** (this report) |
