# April 1992 Scenario Force Calibration

**Date:** 2026-02-15
**Type:** Data / Engine calibration
**Scope:** Militia pool scaling, organizational penetration seeding, recruitment engine thresholds, scenario recruitment resources, desktop constants sync
**Prereq:** OOB brigade catalog (261 entries), recruitment engine (player_choice mode)

---

## 1. Problem Statement

The April 1992 scenario (`apr1992_definitive_52w.json`) spawned only **59 brigades** at game start despite the OOB catalog containing 211 mandatory turn-0 brigades (81 ARBiH, 97 VRS, 33 HVO). The per-faction breakdown was severely unbalanced:

| Faction | Brigades | Personnel | Historical Target |
|---------|----------|-----------|-------------------|
| RBiH | 37 | 26,296 | 80-100 brigades, 40-60k |
| RS | 21 | 13,596 | 60-80 brigades, 60-80k |
| HRHB | 1 | 623 | 30-40 brigades, 30-40k |

HRHB spawning only a single brigade made the game unplayable from that faction's perspective.

---

## 2. Root Cause Analysis

Four compounding issues prevented historical force levels:

### 2.1 Low Organizational Penetration Seed Values

`seedOrganizationalPenetrationFromControl()` seeded party penetration at 70 and paramilitary at 40 for all factions. The militia emergence formula (`computeMilitiaStrength`) produced average militia strength of only ~11 per municipality — far too low for wartime mobilization.

### 2.2 Low Pool Scale Factor

`POOL_SCALE_FACTOR = 30` converted militia strength [0-100] to available manpower. Combined with low militia strength, total manpower per faction was insufficient:
- RBiH: ~44,600 total (available + committed)
- RS: ~27,800
- HRHB: ~7,600

### 2.3 HRHB Faction Scale Too Aggressive

`FACTION_POOL_SCALE.HRHB = 0.58` reduced HVO pools by 42% relative to RBiH. While HVO was the smallest faction, the Croat population concentration in western Herzegovina meant near-total male mobilization — not a 42% penalty.

### 2.4 Mandatory Brigade Spawn Threshold Too High

The recruitment engine required `effectiveManpower >= MIN_BRIGADE_SPAWN / 2` (400 personnel) for mandatory brigades. In municipalities with small ethnic populations or multiple brigades sharing the same `home_mun`, the pool was exhausted before all historical brigades could spawn.

### 2.5 Population Data Loader (Minor)

The population data loader in `scenario_runner.ts` expected a `by_mun1990_id` top-level key. The data file had this key with all 110 municipalities, but no fallback existed for the alternative `by_municipality_id` keying. Added a fallback for robustness.

---

## 3. Changes Implemented

### 3.1 Organizational Penetration Seed Values (`seed_organizational_penetration_from_control.ts`)

Increased to reflect full wartime mobilization at April 1992 start:

| Asset | Old | New | Rationale |
|-------|-----|-----|-----------|
| Party penetration (SDA/SDS/HDZ) | 70 | 85 | All three parties had fully mobilized by April 1992 |
| Paramilitary (Patriotska Liga / RS para / HRHB para) | 40 | 60 | Paramilitaries active across all factions at war start |

Effect: Average militia strength increased from ~11 to ~30-40 per municipality.

### 3.2 Pool Scale Factor (`pool_population.ts`)

`POOL_SCALE_FACTOR`: 30 → **55**

Calibrated so April 1992 war-start produces historical manpower envelopes: ARBiH ~80-100k, VRS ~60-80k, HVO ~25-35k troops.

### 3.3 Faction Pool Scales (`pool_population.ts`)

| Faction | Old | New | Rationale |
|---------|-----|-----|-----------|
| RBiH | 1.18 | 1.20 | Minor adjustment |
| RS | 0.98 | 1.05 | JNA inheritance slightly boosted |
| HRHB | 0.58 | 1.60 | Near-total male mobilization in western Herzegovina; small Croat population requires higher per-capita draw |

### 3.4 Mandatory Brigade Spawn Threshold (`recruitment_engine.ts`)

Minimum manpower for mandatory brigade spawn: 400 → **200**

Historical formations that definitely existed should spawn even as skeleton crews — pools will reinforce them over subsequent turns. The 400 threshold was designed for emergent formation spawn, not for historical OOB mandatory brigades.

### 3.5 Population Data Loader Fallback (`scenario_runner.ts`)

Added support for `by_municipality_id` keying (numeric keys with `mun1990_id` field) as a fallback when `by_mun1990_id` is empty.

### 3.6 Recruitment Resources (`apr1992_definitive_52w.json` + `desktop_sim.ts`)

| Resource | RS | RBiH | HRHB |
|----------|-----|------|------|
| Capital (old → new) | 350 → 600 | 200 → 400 | 120 → 300 |
| Equipment (old → new) | 500 → 800 | 40 → 100 | 150 → 350 |
| Capital trickle (old → new) | 4 → 6 | 2 → 5 | 3 → 4 |
| Equipment trickle (old → new) | 3 → 5 | 0 → 2 | 2 → 4 |

Desktop constants in `desktop_sim.ts` updated to match scenario config.

---

## 4. Results

### Initial Spawn (Turn 0)

| Faction | Before | After | Mandatory in OOB |
|---------|--------|-------|------------------|
| HRHB | 1 brigade, 623 pers. | **25 brigades, 15,483 pers.** | 33 |
| RBiH | 37 brigades, 26,296 pers. | **58 brigades, 42,936 pers.** | 81 |
| RS | 21 brigades, 13,596 pers. | **63 brigades, 41,052 pers.** | 97 |
| **Total** | **59 brigades** | **146 brigades** | 211 |

### Militia Pool Totals (Available + Committed)

| Faction | Before | After |
|---------|--------|-------|
| HRHB | 7,619 | 42,090 |
| RBiH | 44,612 | 90,806 |
| RS | 27,797 | 60,322 |

### Remaining Recruitment Capital

| Faction | Capital | Equipment |
|---------|---------|-----------|
| HRHB | 300 | 350 |
| RBiH | 400 | 100 |
| RS | 600 | 800 |

### Unspawned Mandatory Brigades (65 total)

The 65 remaining mandatory brigades fail due to pool exhaustion in high-density municipalities — multiple brigades share the same `home_mun` (e.g., 6 ARBiH brigades in centar_sarajevo, 5 RS brigades in vlasenica). These become recruitable as pools replenish during gameplay.

- HRHB: 8 missing (brcko, novi_travnik, travnik, vares, kiseljak, kresevo, stolac)
- RBiH: 23 missing (mostly Sarajevo cantons: centar, stari_grad, hadzici, novi_grad; also fojnica, vares)
- RS: 34 missing (vlasenica cluster, doboj, banja_luka, han_pijesak, modrica, ugljevik, etc.)

---

## 5. Alliance State

The scenario initializes RBiH-HRHB as allies:

- `init_alliance_rbih_hrhb: 0.35` — fragile alliance (above ALLIED_THRESHOLD 0.20)
- `rbih_hrhb_war_earliest_week: 26` — bilateral war blocked before October 1992
- Mixed municipalities: Bugojno, Busovaca, Kiseljak, Mostar, Novi Travnik, Travnik, Vitez

---

## 6. Files Modified

| File | Changes |
|------|---------|
| `src/state/seed_organizational_penetration_from_control.ts` | Increased party penetration 70→85, paramilitary 40→60 for all factions |
| `src/sim/phase_i/pool_population.ts` | POOL_SCALE_FACTOR 30→55; FACTION_POOL_SCALE: RBiH 1.18→1.20, RS 0.98→1.05, HRHB 0.58→1.60 |
| `src/sim/recruitment_engine.ts` | Mandatory brigade minimum manpower 400→200 |
| `src/scenario/scenario_runner.ts` | Population data loader: added `by_municipality_id` fallback |
| `data/scenarios/apr1992_definitive_52w.json` | Updated recruitment_capital, equipment_points, trickle rates |
| `src/desktop/desktop_sim.ts` | Synced NEW_GAME_RECRUITMENT_CAPITAL and NEW_GAME_EQUIPMENT_POINTS to scenario config |

---

## 7. Verification

- `npx tsc --noEmit` — clean
- `npm run test:vitest` — 130/130 tests pass (9 suites)
- 4-week scenario run — completes successfully, 155 settlement flips, reasonable exhaustion/displacement dynamics
- No UI changes — pure engine/data calibration
