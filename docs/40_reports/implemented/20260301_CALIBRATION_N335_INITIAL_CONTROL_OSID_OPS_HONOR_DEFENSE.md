# Calibration n335: Initial Control, OSID Operations, Honor Defense

**Date:** 2026-03-01
**Run ID:** `apr1992_definitive_40w__205b3676c8fe3ce4__w40_n335`
**Baseline:** n326 (84.7%), n314 (87.4%), n334 (87.9%)
**Result:** n335 — **87.6% OSID match** (660/753)
**State hash:** `95071b5e32846570`

---

## Summary

- **Honor rename**: Fixed misspelling `vitezka` → `viteska` across all code and data (19 OOB entries, 5 source files)
- **Honor-based defense terrain bonus**: Auto-derives DTB from honor designation — slavna +10%, viteska +15%. Explicit OOB DTB overrides. Strengthens enclave/pocket defense (Bihać now holds)
- **Brčko corridor overrides**: Two OSIDs (`op:brcko:brcko`, `op:brcko:krepsic`) start RS-controlled in scenarios
- **OSID-based pre-planned operations**: Replaced municipality-scanned targets with specific OSID lists, added staging OSIDs, operations inject in `planning` phase (not `execution`), transition to execution at turn 1
- **Rule 1.5 expansion**: Bot brigade AI now marches to staging_osid during planning phase, sector during execution

---

## Changes Made

### Phase 1: Honor Rename (vitezka → viteska)

Global rename of the ARBiH honor designation string. Historical spelling correction.

| File | Change |
|------|--------|
| `src/state/game_state.ts` L279-280 | Type literal `'vitezka'` → `'viteska'` + JSDoc |
| `src/sim/combat/combat_math.ts` L62 | `HONOR_MULT` key renamed |
| `src/sim/combat/local_front_defense.ts` L51 | String comparison updated |
| `src/scenario/oob_loader.ts` L34-35,124 | Type + validation (3 sites) |
| `data/source/oob_brigades.json` | All 19 `"honor": "vitezka"` → `"honor": "viteska"` |

### Phase 2: Honor-Based Defense Terrain Bonus

New constant in `combat_math.ts`:
```typescript
export const HONOR_DEFENSE_BONUS: Record<string, number> = { slavna: 0.10, viteska: 0.15 };
```

In `computeDefenderPower()`, the per-brigade terrain bonus now falls back to honor-derived DTB when no explicit `defense_terrain_bonus` exists in OOB:
```typescript
const honorDefBonus = HONOR_DEFENSE_BONUS[(formation as { honor?: string }).honor ?? ''] ?? 0;
const perBrigadeTerrainBonus = 1.0 + (formation.defense_terrain_bonus ?? honorDefBonus);
```

**Effect on combat multipliers:**
| Honor | HONOR_MULT | DTB (new) | Combined defense |
|-------|-----------|-----------|-----------------|
| slavna (14 brigades) | 1.10× | 1.10× | 1.21× |
| viteska (19 brigades) | 1.20× | 1.15× | 1.38× |
| (explicit OOB DTB) | (per honor) | (OOB value) | overrides honor DTB |

**Key outcome:** Bihać pocket (5th Corps, multiple viteska brigades) now **survives** — was falling to RS in n334.

### Phase 3: Brčko Corridor Initial Control Overrides

Added to both `apr1992_definitive_40w.json` and `apr1992_definitive_52w.json`:
```json
"osid_control_overrides": {
    "op:brcko:brcko": "RS",
    "op:brcko:krepsic": "RS"
}
```

Historical basis: JNA barracks in Brčko and Krepšić approach node were Serbian-controlled from April 1992. Shifts Brčko from 9:4 RBiH:RS to 7:6.

**Outcome:** Overrides apply at init, but Brčko is recaptured by RBiH during the run. The structural issue is that East Bosnian Corps doesn't have enough offensive power directed at Brčko corridor.

### Phase 4: OSID-Based Pre-Planned Operations

#### 4.1 CorpsOperation schema
Added `staging_osid?: string` field to `CorpsOperation` interface.

#### 4.2 PrePlannedOp interface rewrite
Replaced `target_muns: string[]` with `target_osids: string[]` + `staging_osid: string`.

#### 4.3 Operation definitions (OSID-specific)

| Operation | Corps | staging_osid | target_osids |
|-----------|-------|-------------|--------------|
| Operacija Koridor | vrs_east_bosnian | op:brcko:brcko | op:modrica:garevac_2 |
| Operacija Drina | vrs_drina | op:zvornik:kozluk_2 | op:zvornik:zvornik, op:bratunac:bratunac_2, op:vlasenica:vlasenica_2, op:zvornik:drinjaca, op:zvornik:krizevici |
| Operacija Prsten | vrs_sarajevo_romanija | op:ilidza:kasindo | op:ilidza:sarajevo_dio_ilidza_2, op:vogosca:hotonj, op:ilijas:dragoradi, op:hadzici:hadzici |
| Operacija Foča | vrs_herzegovina | op:foca:foca_3 | op:foca:ustikolina, op:foca:miljevina_2, op:cajnice:todorovici, op:kalinovik:varos_2 |
| Operacija Prijedor | vrs_1st_krajina | op:prijedor:prijedor_2 | op:prijedor:kozarac_2, op:prijedor:kamicani, op:sanski_most:sanski_most_2, op:kljuc:kljuc_2 |

#### 4.4 Injection logic
- Operations validate target OSIDs (skip RS-controlled)
- Inject in `planning` phase with `planning_duration: 1` (was `execution`)
- Bot/player orders trigger execution next turn

#### 4.5 Rule 1.5 expansion
Bot brigade AI (`bot_brigade_ai_osid.ts`) Rule 1.5 now fires during both phases:
- **Planning**: March to `staging_osid`
- **Execution**: March to sector (existing behavior)

#### 4.6 Dynamic sector offensives
`evaluateSectorOffensiveLaunch()` now assigns `staging_osid` from the first friendly OSID in the sector (deterministic, sorted).

#### 4.7 GUI
`OperationView` in `types.ts` and `GameStateAdapter.ts` now parse and display `staging_osid`.

---

## Scenario Results (n335, 40 weeks)

### OSID Match Rate

**Overall: 660/753 (87.6%)**

| Region | Match | Pct | vs n314 | vs n326 |
|--------|-------|-----|---------|---------|
| Krajina | 126/132 | 95.5% | -2.2pp | — |
| Posavina NE | 79/109 | 72.5% | -12.8pp | — |
| Drina | 109/128 | 85.2% | +10.2pp | +13.3pp |
| Central Corridor | 87/94 | 92.6% | +1.1pp | — |
| Central Bosnia | 142/166 | 85.5% | -2.5pp | — |
| Sarajevo | 27/31 | 87.1% | +9.7pp | — |
| Herzegovina | 90/93 | 96.8% | +6.5pp | — |

**Faction totals (sim vs painted):**
| Faction | Sim | Painted | Delta |
|---------|-----|---------|-------|
| RS | 387 | 416 | -29 |
| RBiH | 273 | 248 | +25 |
| HRHB | 93 | 89 | +4 |

### Troop Strengths (initial → final)

| Faction | Personnel Start | Personnel End | Brigades Start | Brigades End |
|---------|----------------|---------------|----------------|--------------|
| ARBiH (RBiH) | 24,390 | 207,788 | 36 | 96 (+1 inactive) |
| VRS (RS) | 60,100 | 129,630 | 58 | 78 (+2 inactive) |
| HVO (HRHB) | 22,450 | 69,895 | 28 | 32 |

**Militia pools (avail / committed):**
- RBiH: 101,308 / 203,101
- RS: 10,471 / 87,337
- HRHB: 63,212 / 69,058

### Military Casualties

| Metric | Value |
|--------|-------|
| Attacker casualties | 17,526 |
| Defender casualties | 2,362 |
| Total combat casualties | 19,888 |
| Attack orders | 291 (RS=207, RBiH=83, HRHB=5) |
| Free captures | 210/248 (86.9%) |
| A:D casualty ratio | 7.4:1 |

### Displacement

| Metric | Value |
|--------|-------|
| Total displaced | 643,834 |
| Fled abroad | 84,400 |
| Displacement killings | 64,291 |

**Civilian casualties by nationality:**
| Nationality | Killed | Fled Abroad |
|-------------|--------|-------------|
| Bosniak | 43,209 | 0 |
| Croat | 13,860 | 64,858 |
| Serb | 7,222 | 19,542 |

### Key Control Checks

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| RS controls Brčko | RS | RBiH | **FAIL** |
| HVO holds Orašje | HRHB | RS | **FAIL** |
| ARBiH holds south of Brčko | RBiH | RBiH | PASS |
| RS holds Vozuća | RS | RS | PASS |
| RBiH holds Bihać pocket | RBiH | RBiH | **PASS (was FAIL in n334)** |
| RBiH holds Srebrenica | RBiH | RBiH | PASS |
| RBiH holds Goražde | RBiH | RBiH | PASS |
| RBiH holds Žepa | RBiH | RS | FAIL (persistent) |
| RS holds Sarajevo suburbs | RS | RS | PASS |
| RBiH holds Sarajevo center | RBiH | RBiH | PASS |

**Anchor checks: 12/14 pass (85.7%)**

### Bot Benchmarks: 6/6 PASS

| Faction | Turn | Benchmark | Expected | Actual | Result |
|---------|------|-----------|----------|--------|--------|
| HRHB | 20 | secure_herzegovina_core | 0.12 ± 0.05 | 0.129 | PASS |
| RBiH | 20 | hold_core_centers | 0.35 ± 0.08 | 0.356 | PASS |
| RS | 20 | early_territorial_expansion | 0.55 ± 0.08 | 0.515 | PASS |
| HRHB | 40 | hold_central_bosnia_nodes | 0.118 ± 0.04 | 0.124 | PASS |
| RBiH | 40 | preserve_survival_corridors | 0.329 ± 0.05 | 0.363 | PASS |
| RS | 40 | consolidate_gains | 0.553 ± 0.05 | 0.514 | PASS |

---

## Lessons Learned

### L38: Honor-based DTB effectively protects enclaves/pockets
The auto-derived defense terrain bonus from honor designation (+15% for viteska) provides meaningful defensive strength to ARBiH brigades defending pockets (Bihać, enclaves). This is historically accurate — these units earned their honors through sustained defensive action. **Bihać pocket survival is the key improvement.**

### L39: Brčko initial control override insufficient alone
Setting op:brcko:brcko to RS at init doesn't prevent recapture. The East Bosnian Corps (Operacija Koridor) needs better targeting or more forces committed to the Brčko corridor specifically. The 1-OSID objective (`op:modrica:garevac_2`) may be too narrow.

### L40: OSID-based operations improve targeting precision
Municipality-scanned targets produced operations attacking wrong priorities. OSID-specific targets ensure each operation pushes exactly where intended. However, overall match rate regressed slightly (87.9%→87.6%) — the new targeting is tighter but misses some opportunistic captures the old system got.

### L41: Planning phase creates a 1-turn delay
Operations now inject at turn 0 in `planning` phase and execute at turn 1. This is historically more accurate (JNA plans existed but needed coordination) but means 1 fewer week of offensive action in the critical early-war window.

---

## Files Changed

| File | Phase | Change |
|------|-------|--------|
| `src/state/game_state.ts` | 1,4 | `vitezka→viteska` type + `staging_osid` field on CorpsOperation |
| `src/sim/combat/combat_math.ts` | 1,2 | Honor rename + `HONOR_DEFENSE_BONUS` constant + auto-DTB fallback |
| `src/sim/combat/local_front_defense.ts` | 1 | Honor string comparison fix |
| `src/scenario/oob_loader.ts` | 1 | Honor type + validation rename |
| `data/source/oob_brigades.json` | 1 | 19× `"vitezka"` → `"viteska"` |
| `data/scenarios/apr1992_definitive_40w.json` | 3 | `osid_control_overrides` for Brčko |
| `data/scenarios/apr1992_definitive_52w.json` | 3 | `osid_control_overrides` for Brčko |
| `src/sim/combat/pre_planned_operations.ts` | 4 | Full rewrite: OSID targets, staging, planning phase |
| `src/sim/combat/bot_brigade_ai_osid.ts` | 4 | Rule 1.5: planning-phase staging march |
| `src/sim/combat/sector_offensive.ts` | 4 | staging_osid on dynamic launches |
| `src/ui/map/data/types.ts` | 4 | staging_osid on OperationView |
| `src/ui/map/data/GameStateAdapter.ts` | 4 | Parse staging_osid |
| `tests/pre_planned_operations.test.ts` | 4 | Rewritten for OSID-based ops |

---

## Test Results

- **tsc --noEmit**: Clean (0 errors)
- **vitest**: 189 pass, 1 skipped (18 suites)
- **pre_planned_operations.test.ts**: 9/9 pass (node:test)

---

## Next Steps (Priority Order)

1. **Brčko corridor**: East Bosnian Corps needs multi-OSID Koridor objectives or stronger force commitment. Consider adding `op:brcko:donji_rahic`, `op:brcko:skakava_donja` to target_osids.
2. **Orašje pocket**: HVO defense mechanics need investigation — RS overruns it consistently. May need HVO-specific avoided_osids or defense bonus.
3. **Zvornik**: Drina Corps reaches bratunac_2 but not zvornik itself. May need reordering target_osids or increasing Drina Corps brigade count.
4. **Posavina NE (72.5%)**: Weakest region. Structural issue with East Bosnian Corps spreading too thin vs concentrated RBiH 2nd Corps defense.
5. **Žepa**: Persistent failure — RS captures it when RBiH should hold. May need enclave-specific defense bonus or avoided_osids.
