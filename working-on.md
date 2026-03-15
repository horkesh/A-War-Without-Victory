# Working On — Task Continuity

## Current State: n804 — Supply Embargo + Full OOB

### Latest run (n804)
- 89.7% area, 13/13 anchors, 5/6 benchmarks
- Supply: RS general=50.8/heavy=100, RBiH general=47.5/heavy=15, HRHB general=70/heavy=50
- Gradačac RBiH ✓, Teočak RBiH ✓, Žepče HRHB ✓, Pelagićevo RS ✓
- Bijela RS (target: RBiH — needs ARBiH counterattack capability)
- Drina 80.9% (improved from 74.8% after enclave debuffs)
- Troops: RS 106k, ARBiH 156k, HRHB 41k

### Session achievements (2026-03-15) — ~60 calibration runs
**Engine:**
- Intelligent Corps Commander (Phases A-E): defensive health, salient aversion, threat-weighted initial assignment (sqrt scaling, enemy personnel-aware), cross-corps enclave defense + guard, return-to-corps march
- Mandatory spawn fix: 64/182 brigades restored
- Overstacking fix: isMovementDestinationRisky removed for sector-internal redistribution
- Catastrophic stall gate, elite cohesion recall + tracker
- Supply embargo: EMBARGO_HEAVY_CAP (RBiH=15), strained supply offensive penalty

**OOB:**
- Drina: +Rogatica, +Višegrad, Čajniče home fix
- SRK: 9 brigades (Ilidža, Ilijaš, Igman, Trnovo)
- 255th Slavna Teočak: 2500 pers, defense 0.70
- Gradačac/Brčko: 213th=1000, 217th=800, 215th=800
- Goražde enclaves: 7×400 (was 7×1100). Srebrenica: 5×400 (was 5×900)
- Brčko added to 2nd Corps targets

**Calibration:**
- RBiH mobilization 0.10→0.02, pool_scale 0.25→0.08
- RS mobilization 0.12→0.08
- HRHB mobilization 0.29→0.20

### Key constants
- FACTION_POOL_SCALE: RBiH 0.08, RS 0.25, HRHB 1.05
- FACTION_MOBILIZATION_SCALE: RBiH 0.02, RS 0.08, HRHB 0.20
- EMBARGO_SUPPLY_CAP: RBiH 45, RS 90, HRHB 70
- EMBARGO_HEAVY_CAP: RBiH 15, RS 100, HRHB 50
- Threat-weighted need: sqrt(enemyPers/500) scaling
- SALIENT_RISK_THRESHOLD: 0.75
- CRITICAL_DENSITY_THRESHOLD: 0.10, STRAINED: 0.167

### Open items
- #49: preserve_survival_corridors benchmark (only failing — 0.382 vs 0.379 threshold)
- Bijela_2 doesn't hold — ARBiH 2nd Corps cautious under supply strain
- Drina at 80.9% — improved but still weak. VRS Drina brigades depleted (400-600 pers each)
- #42: Bot strategic targeting (demographic filter)
- #44: ARBiH probing weak sectors
- #45: Salient retreat mechanism
