# Casualty Source Breakdown — 188w Military Killed
**Date:** 2026-06-09  
**Scenario:** `apr1992_definitive_188w.json`  
**Baseline hash:** `5f57d17287b87dfb` (649/712, 30/30 anchors)  
**Method:** Throwaway instrumentation in `diag/casualty-source-breakdown` worktree — per-source counters at every `recordBattleCasualties` call site; no behavioral change; determinism confirmed (40w hash `be76e56dd9d288c2` byte-identical to floor).  
**Ledger ground truth:** 102,621 military killed / 383,288 WIA / 53,881 MIA (read from `final_save.json`).  
**Tally total:** 106,666 killed (3.3% above ledger) — gap is `distributeDefenderCasualties` rounding: tally records `finalDefenderCas` aggregate; ledger records per-brigade capped shares whose sum is slightly lower. Proportions are valid; ledger-scaled estimates in the table below.

---

## Paramilitary dispersal caveat

`dissolveParamilitary` (paramilitary_sweep.ts:676) sets `personnel=0` and `lifecycle_status='disbanded'` but **never calls `recordBattleCasualties`**. Dispersal contributes **zero** to the killed total. Only explicit combat losses (retreat under fire, capture, overwhelmed-defender) flow through `recordBattleCasualties`. The paramilitary row in the table below reflects only those real combat deaths.

---

## 1. Source breakdown table — 188w military killed (ledger-scaled)

| Source | Mechanism | Killed (raw tally) | Killed (ledger-scaled) | % of total |
|--------|-----------|-------------------|----------------------|------------|
| **battle_defender** | `attack_resolution_osid.ts` — defender side (sector-distributed) | 34,410 | 33,105 | **32.3%** |
| **frontline_base** | `frontline_attrition.ts` — BASE_ATTRITION_RATE term | 27,639 | 26,591 | **25.9%** |
| **battle_attacker** | `attack_resolution_osid.ts` — attacker side | 24,434 | 23,507 | **22.9%** |
| **frontline_bombardment** | `frontline_attrition.ts` — BOMBARDMENT_EXPOSURE_RATE term | 18,598 | 17,893 | **17.4%** |
| siege | `siege_attrition.ts` — Sarajevo + enclave shelling | 649 | 624 | 0.6% |
| battle_morale_abs | `attack_morale_absorption.ts` — homeland-determination extra cas | 704 | 677 | 0.7% |
| paramilitary | `paramilitary_sweep.ts` — combat losses only (dispersal = 0) | 232 | 223 | 0.2% |
| legacy_battle | `battle_resolution.ts` — fallback SID path | ~0 | ~0 | ~0% |

**Battle total (attacker + defender + morale_abs):** 59,548 raw → **55.8% of ledger**  
**Frontline total (base + bombardment):** 46,237 raw → **43.4% of ledger**  
**Other (siege + paramilitary):** 881 raw → **0.8%**

---

## 2. Per-faction split

| Faction | Ledger killed | % of total | Frontline base | Frontline bomb | Battle attacker | Battle defender | Siege | Para |
|---------|--------------|------------|---------------|---------------|----------------|----------------|-------|------|
| **RBiH** | 57,732 | **56.3%** | 19,772 (32.9%) | 17,005 (28.3%) | 15,380 (25.6%) | 7,063 (11.7%) | 580 (1.0%) | 37 |
| **RS** | 36,397 | **35.5%** | 5,484 (14.5%) | 72 (0.2%) | 4,695 (12.4%) | 27,062 (71.6%) | 0 | 151 |
| **HRHB** | 8,492 | **8.2%** | 2,383 (27.3%) | 1,521 (17.4%) | 4,359 (50.0%) | 285 (3.3%) | 69 (0.8%) | 44 |

**Faction share per source (which source inflates which faction):**

| Source | RBiH% | RS% | HRHB% | Direction vs target (RBiH ~52%, RS ~38%) |
|--------|-------|-----|-------|------------------------------------------|
| frontline_base | 71.5% | 19.8% | 8.6% | INFLATES RBiH (+19pp) |
| frontline_bombardment | 91.4% | 0.4% | 8.2% | INFLATES RBiH (+35pp) |
| battle_attacker | 62.9% | 19.2% | 17.8% | INFLATES RBiH (+11pp) |
| battle_defender | 20.5% | 78.6% | 0.8% | INFLATES RS (+41pp) |
| battle_morale_abs | 41.6% | 49.4% | 8.9% | Inflates RS slightly |
| paramilitary | 15.9% | 65.1% | 19.0% | Inflates RS slightly |
| siege | 89.4% | 0.0% | 10.6% | INFLATES RBiH (+33pp) |

**Key finding on faction imbalance:** RBiH share is too high (56.3% vs target ~52%) because frontline attrition — both base and bombardment — is overwhelmingly RBiH-heavy (71–91%). VRS has armor + artillery; ARBiH is rifle-only with nearly zero counter-battery, so `bombardmentFraction` is near 1.0 for RBiH brigades and near 0 for RS. This equipment asymmetry correctly models reality, but the *volume* of frontline attrition is driving RBiH share past target. Battle_defender is the main RS loss driver (78.6% RS) — RS is the attacker faction absorbing defender casualties — and correctly inflates RS share toward target. The net imbalance is: frontline paths are too RBiH-heavy relative to battle paths being RS-heavy.

---

## 3. Killed:wounded ratio per source

| Source | Killed | Wounded | K:W ratio |
|--------|--------|---------|-----------|
| frontline_base | 27,639 | 110,631 | **1:4.00** |
| frontline_bombardment | 18,598 | 75,764 | **1:4.07** |
| battle_attacker | 24,434 | 82,912 | 1:3.39 |
| battle_defender | 34,410 | 116,198 | 1:3.38 |
| battle_morale_abs | 704 | 2,386 | 1:3.39 |
| paramilitary | 232 | 835 | 1:3.60 |
| siege | 649 | 2,540 | 1:3.91 |
| **Overall** | **102,621** | **383,288** | **1:3.74** |

**Realistic war ratio is ~1:3.** The frontline paths (both base and bombardment) drive the ratio to 1:4.0–4.1, pulling the aggregate to 1:3.74. This is because `KIA_FRACTION=0.22` and `WIA_FRACTION=0.74` are applied uniformly — the ratio is the same by construction (0.22/0.74 = 0.297 ≈ 1:3.36 for battle; frontline uses the same fractions but `mia` is larger because `casualties - killed - wounded` overflows into MIA, making the effective K:W wider). Siege uses `SIEGE_KIA_FRACTION=0.20` / `SIEGE_WIA_FRACTION=0.65`, producing a wider ratio (more MIA). The aggregate ratio is pulled toward 1:3.74 by the high frontline volume.

---

## 4. Dominant-source verdict and levers

### Confirmed: base front-line attrition is NOT the dominant kill-volume source

| Source | % of total | Notes |
|--------|-----------|-------|
| battle_defender | **32.3%** | Dominant single source |
| frontline_base | 25.9% | Second |
| battle_attacker | 22.9% | Third |
| frontline_bombardment | 17.4% | Fourth |

**Battle resolution (attack_resolution_osid.ts) collectively accounts for 55.8% of all kills.** Frontline attrition (base + bombardment) accounts for 43.4%. This explains why cutting `BASE_ATTRITION_RATE` 0.0045→0.0035 (−22%) moved total military killed only −6.5% (102,621→95,986): the frontline base term is only 25.9% of the total, so a −22% change on that source moves the total by −22% × 25.9% = −5.7%, matching the observed −6.5% closely.

### Ranked levers to move the dominant sources

**1. `BASE_DEFENDER_LOSS_RATE` + `BASE_ATTACKER_LOSS_RATE` in `combat_math.ts`**  
File: `src/sim/combat/combat_math.ts` lines ~284–290 (`BASE_ATTACKER_LOSS_RATE = 0.08`, `BASE_DEFENDER_LOSS_RATE = 0.06`)  
These feed directly into `computeFinalCasualties()` (attack_casualty_distribution.ts:59–65) which sets `battle_attacker` + `battle_defender` combined = 55.1% of kills. A ±10% change on these rates moves total killed by ±5.5%. Reducing both also adjusts faction arc: `battle_defender` is 78.6% RS, so reducing it helps bring RS share toward target; `battle_attacker` is 62.9% RBiH (RBiH attacks more), so reducing it helps RBiH share.

**2. `BOMBARDMENT_EXPOSURE_RATE` in `frontline_attrition.ts`**  
File: `src/sim/combat/frontline_attrition.ts` line 81 (`BOMBARDMENT_EXPOSURE_RATE = 0.007`)  
This term is 17.4% of total kills and is 91.4% RBiH (because VRS bombardment fraction → near-0 for RS). It is the single largest per-faction RBiH-inflating lever. Cutting this rate moves RBiH share toward target without touching RS. A −20% cut (0.007→0.0056) would reduce total killed by ~3.5% and RBiH share from 56.3% toward ~54.5%.

**3. `BASE_ATTRITION_RATE` in `frontline_attrition.ts`**  
File: `src/sim/combat/frontline_attrition.ts` line 66 (`BASE_ATTRITION_RATE = 0.0045`)  
This is 25.9% of total kills and 71.5% RBiH. Reductions here reduce total volume and modestly help RBiH share, but the effect is diluted because RS also takes 19.8% of this source. Per the PR #357 test, a −22% cut produces only −6.5% total movement — confirming it as the second-order lever, not the dominant one.

---

## 5. Summary

**The dominant kill-volume source is battle resolution (`attack_resolution_osid.ts`), accounting for 55.8% of all military killed.** Frontline attrition (base + bombardment combined) is 43.4%. Base attrition alone is 25.9% — the third-largest source, explaining why the PR #357 −22% rate cut produced only −6.5% total movement.

**The RBiH over-share (56.3% vs target ~52%) is driven by the frontline paths**, specifically the bombardment term (91.4% RBiH, 17.4% of total) and the base term (71.5% RBiH, 25.9% of total). The equipment asymmetry model is correct directionally — ARBiH has near-zero counter-battery FP — but the *volume* of frontline attrition generates too many RBiH deaths relative to battle deaths.

**RS share (35.5% vs target ~38%) is correct directionally** — `battle_defender` (78.6% RS) moves RS toward target — but battle volume is insufficient to fully compensate for the frontline imbalance.

**Paramilitary dispersal contributes zero** to the killed total. Paramilitary combat deaths are 232 (0.2%), 65.1% RS, consistent with early-war RS offensive paramilitaries.

**K:W ratio at 1:3.74 is driven by frontline paths** (both running at 1:4.0+). Battle paths are at 1:3.39, close to the realistic 1:3 target. Reducing frontline volume relative to battle volume would improve the aggregate ratio.
