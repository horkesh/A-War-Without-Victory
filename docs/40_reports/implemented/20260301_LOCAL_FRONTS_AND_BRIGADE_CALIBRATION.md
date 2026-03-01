# Local Fronts Mechanic + Per-Brigade Defense Calibration

**Date:** 2026-03-01
**Run:** n295 (40w calibration)
**Baseline:** n291 (84.7% / 638 of 753)
**Result:** n295 (85.1% / 641 of 753) — +3 OSID matches, 0 regressions
**Benchmarks:** 6/6 pass

---

## 1. Motivation

Two complementary problems in the calibration baseline:

1. **Front coverage is binary.** A brigade either defends an OSID or doesn't. There is no mechanical representation of how thinly or densely a front is held. Historically, the ARBiH 2nd Corps held a vast front in NE Bosnia with limited forces — their defense was strong where concentrated but porous where stretched. The sim had no way to model this.

2. **All brigades of the same equipment class defend identically.** The 255th Slavna Mountain (Teočak pocket) held an isolated salient for the entire war against sustained VRS pressure. The 246th Vitezka Mountain (Šapna) blocked VRS northeastern expansion. Both had extreme terrain advantages (mountain fortifications, prepared positions) that the sim's generic terrain system couldn't capture at brigade granularity.

## 2. What Was Built

### 2.1 Local Fronts Mechanic

**New file:** `src/sim/phase_ii/local_front_defense.ts`

Each turn, after brigade-to-front assignment, the pipeline derives `LocalFront` records from the existing `assignable_front_segments` and `brigade_front_assignment` state. Each front has:

- **coverage_length**: number of front edges (proxy for front width)
- **assigned_brigade_ids**: brigades covering this sector
- **defensive_power**: computed from brigade strengths and density

The key mechanic is the **front density modifier**, applied multiplicatively to defender power in combat:

```
density = assigned_brigades / coverage_length

density < 0.5  →  penalty: 0.6× to 1.0× (linear)
0.5 ≤ density ≤ 1.0  →  normal: 1.0×
density > 1.0  →  bonus: 1.0× to 1.25× (linear, capped)
```

This means:
- A single brigade covering 10 edges (density 0.1) gets 0.68× defense — attackers exploit gaps
- Three brigades covering 3 edges (density 1.0) get 1.0× — properly manned
- Five brigades covering 3 edges (density 1.67) get 1.17× — mutual support, depth

**Integration points:**
- `computeDefenderPower()` in `attack_resolution_osid.ts` — actual combat
- `computeZocDefenderPower()` in `attack_resolution_osid.ts` — ZoC projection
- Both functions mirrored in `combat_predictor.ts` — bot AI prediction
- Pipeline step `compute-local-fronts` added after `ensure-brigade-front-assignment`

### 2.2 Per-Brigade Defense Terrain Bonus

**New field:** `defense_terrain_bonus` on `OobBrigade` and `FormationState`

A simple multiplicative modifier `× (1 + bonus)` applied to defender power. Propagated through:

1. `data/source/oob_brigades.json` — source data
2. `src/scenario/oob_loader.ts` — parsing
3. `src/sim/recruitment_engine.ts` — formation creation passthrough
4. `src/sim/phase_ii/attack_resolution_osid.ts` — combat (direct + ZoC)
5. `src/sim/phase_ii/combat_predictor.ts` — bot prediction (direct + ZoC)

**Assigned bonuses:**

| Brigade | Faction | Location | Bonus | Rationale |
|---------|---------|----------|-------|-----------|
| 255th Slavna Mountain "Hajrudin Mesić" | RBiH | Teočak | +30% | Isolated mountain pocket, held entire war. Honor: slavna (+10%). Combined: 1.43× |
| 246th Vitezka Mountain | RBiH | Šapna | +25% | Key forward position blocking VRS NE expansion. Honor: viteska (+20%). Combined: 1.50× |
| 328th Mountain | RBiH | Zavidovići | +20% | Vozuća pocket defense, mountain terrain advantage |
| 351st Liberation | RBiH | Zavidovići | +20% | Vozuća pocket defense, mountain terrain advantage |

These are multiplicative with the existing honor system. The 246th Vitezka with both viteska honor (1.20×) and defense_terrain_bonus (1.25×) gets 1.50× total defense multiplier — representing a veteran mountain brigade in prepared positions.

### 2.3 State Schema Changes

**`src/state/game_state.ts`:**

```typescript
interface LocalFront {
    id: string;
    faction: FactionId;
    name: string;
    created_turn: number;
    assigned_brigade_ids: string[];
    edge_ids: string[];
    coverage_length: number;
    defensive_power: number;
}
```

- Added `local_fronts?: Record<string, LocalFront>` to `GameState`
- Added `defense_terrain_bonus?: number` to `FormationState`
- Added `'local_fronts'` to serializer whitelist in `serializeGameState.ts`

## 3. Calibration Results

### 3.1 OSID Match Rate

| Metric | n291 (baseline) | n295 (after) | Change |
|--------|----------------|-------------|--------|
| Overall | 84.7% (638/753) | **85.1% (641/753)** | **+3** |
| Krajina | 97.0% (128/132) | 97.0% (128/132) | — |
| Posavina NE | 83.5% (91/109) | **85.3% (93/109)** | **+2** |
| Drina | 71.9% (92/128) | 71.9% (92/128) | — |
| Central Corridor | 90.4% (85/94) | 90.4% (85/94) | — |
| Central Bosnia | 80.7% (134/166) | **81.3% (135/166)** | **+1** |
| Sarajevo | 77.4% (24/31) | 77.4% (24/31) | — |
| Herzegovina | 90.3% (84/93) | 90.3% (84/93) | — |

### 3.2 Fixed Mismatches

Three OSIDs that were incorrectly flipping from RS to RBiH now correctly stay RS:

1. **op:brcko:krepsic** (Posavina NE) — RS defense now strong enough to hold
2. **op:kalesija:gojcin_2** (Central Bosnia) — front density bonus prevents RBiH overrun
3. **op:lopare:jablanica_2** (Posavina NE) — denser RS front holds

All three cases: RBiH was capturing OSIDs that should have remained RS-controlled. The front density mechanic makes RS defensive lines harder to penetrate where they are concentrated.

### 3.3 Benchmarks

All 6/6 pass (identical to baseline):

| Benchmark | Faction | Turn | Actual | Expected | Status |
|-----------|---------|------|--------|----------|--------|
| secure_herzegovina_core | HRHB | 20 | 0.12749 | 0.12 ± 0.05 | PASS |
| hold_core_centers | RBiH | 20 | 0.36919 | 0.35 ± 0.08 | PASS |
| early_territorial_expansion | RS | 20 | 0.50332 | 0.55 ± 0.08 | PASS |
| hold_central_bosnia_nodes | HRHB | 40 | 0.11554 | 0.118 ± 0.04 | PASS |
| preserve_survival_corridors | RBiH | 40 | 0.36255 | 0.329 ± 0.05 | PASS |
| consolidate_gains | RS | 40 | 0.52191 | 0.553 ± 0.05 | PASS |

### 3.4 Faction Totals

| Faction | Painted | n291 | n295 | Delta |
|---------|---------|------|------|-------|
| RS | 416 | 390 | 393 | +3 (closer to target) |
| RBiH | 248 | 276 | 273 | -3 (closer to target) |
| HRHB | 89 | 87 | 87 | — |

RS improved from -26 to -23 delta. RBiH improved from +28 to +25 delta. Both move toward painted targets.

### 3.5 Troop Strengths (initial → final)

| Faction | n291 | n295 | Change |
|---------|------|------|--------|
| ARBiH | 24,390 → 205,636 | 24,390 → 205,435 | -201 (marginal) |
| VRS | 60,100 → 120,389 | 60,100 → 122,310 | +1,921 (VRS takes fewer casualties) |
| HVO | 22,450 → 65,030 | 22,450 → 64,847 | -183 (marginal) |

VRS ending personnel increased by ~2k because denser defensive fronts reduce attacker success and thus defender casualties.

### 3.6 Combat Stats

| Metric | n291 | n295 | Change |
|--------|------|------|--------|
| Orders processed | 343 | 340 | -3 |
| Settlement flips | 167 | 164 | -3 |
| Attacker casualties | 24,953 | 24,486 | -467 |
| Defender casualties | 2,294 | 2,276 | -18 |
| Battles w/ defender | 137 | 137 | — |
| Free captures | 149 | 147 | -2 |

Fewer flips (defense holding better), slightly fewer casualties (some attacks deterred by density).

## 4. Remaining Structural Gaps

These are pre-existing and unchanged:

1. **Drina 71.9%** — RS Drina Corps too small to sweep 12 municipalities. Known L29 constraint: DO NOT add enclaves to Drina sweep.
2. **Bugojno 8 RS overruns** — RS takes all 8 Bugojno OSIDs; painted has mixed RS/RBiH/HRHB control.
3. **VRS 122k vs 100k historical target** — VRS ends with more personnel than historical.
4. **Teočak pocket (ugljevik:teocak_krstac_2)** — Still falls to RS despite +30% defense bonus. The 255th Slavna spawns at turn 26 (late), by which point RS may have already taken the area.

## 5. Files Modified

| File | Change |
|------|--------|
| `src/state/game_state.ts` | `LocalFront` interface, `defense_terrain_bonus` on `FormationState`, `local_fronts` on `GameState` |
| `src/sim/phase_ii/local_front_defense.ts` | **NEW** — front density calculation, `buildLocalFronts()`, `getLocalFrontDensityModifier()` |
| `src/sim/phase_ii/attack_resolution_osid.ts` | Import + apply `frontDensityMult` and `perBrigadeTerrainBonus` in both defender power functions |
| `src/sim/phase_ii/combat_predictor.ts` | Mirror of attack_resolution changes (predictor must stay synced) |
| `src/sim/turn_pipeline.ts` | Import + `compute-local-fronts` pipeline step after `ensure-brigade-front-assignment` |
| `src/scenario/oob_loader.ts` | `defense_terrain_bonus` field on `OobBrigade`, parsing |
| `src/sim/recruitment_engine.ts` | `defense_terrain_bonus` passthrough to `FormationState` at creation |
| `src/state/serializeGameState.ts` | `'local_fronts'` added to `GAMESTATE_TOP_LEVEL_KEYS` |
| `data/source/oob_brigades.json` | 4 brigades: 255th (+0.30), 246th (+0.25), 328th (+0.20), 351st (+0.20) |
| `docs/PROJECT_LEDGER.md` | Ledger entry |

## 6. Verification

- `npm run typecheck` — pass
- `npm run test:vitest` — 193/193 pass, 13 skipped (unchanged)
- `npm run sim:scenario:run:40w` — n295: 85.1%, 6/6 benchmarks, no regressions
- Determinism: all iteration sorted via `strictCompare`, no `Math.random()`, `LocalFront` is derived state recomputed each turn per Engine Invariants §13

## 7. Design Notes

### Why front density modifier rather than direct per-edge defense?

The density modifier keeps the existing combat system intact — it's just another multiplicative factor in the defender power chain. It doesn't require rewriting how attacks target specific edges or how ZoC projection works. The modifier naturally captures the key insight: a brigade covering too much front is weaker everywhere.

### Why per-brigade defense_terrain_bonus rather than per-OSID terrain?

The sim already has per-OSID terrain multipliers (slope, river, friction). But those are geographic — they apply to any defender at that location. The `defense_terrain_bonus` represents *unit-specific* terrain mastery: the 255th Slavna knew every goat path around Teočak because they'd been fighting there for years. A fresh VRS brigade defending the same position wouldn't have the same advantage. This is a unit quality, not a terrain feature.

### Constants rationale

- **THIN_FRONT_THRESHOLD (0.5)**: Below half a brigade per edge, defense is noticeably thin. Historical: ARBiH 2nd Corps stretched across NE Bosnia with gaps.
- **DENSE_FRONT_THRESHOLD (1.0)**: One brigade per edge is properly manned. Above this = depth/reserves.
- **MIN_COVERAGE_PENALTY (0.6)**: Even the thinnest front provides some defense. 0.6 rather than lower because even scattered troops provide observation and delay.
- **MAX_DENSITY_BONUS (1.25)**: Modest mutual support bonus. Dense fronts help but aren't transformatively better — there are diminishing returns to packing troops.
