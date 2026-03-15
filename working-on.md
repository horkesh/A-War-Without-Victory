# Working On — Task Continuity

## BASELINE: n806 — War-or-Game APPROVED

### What shipped (2026-03-15) — ~60 calibration runs, 30+ commits

**Architecture:**
- Budget-based brigade allocation (garrison-first, threat-proportional, home affinity as distance modifier)
- Intelligent Corps Commander (defensive health gate, salient aversion, threat-weighted density)
- Cross-corps enclave defense + corps theft guard
- Return-to-corps march for orphaned brigades
- Overstacking redistribution fix (isMovementDestinationRisky removed for front OSIDs)
- Mandatory spawn fix (64/182 brigades restored — empty militia pools)
- Supply embargo (EMBARGO_HEAVY_CAP: RBiH=15, strained supply offensive penalty)
- Catastrophic stall gate, elite cohesion recall + tracker

**OOB:**
- Drina: +Rogatica, +Višegrad, Čajniče home fix
- SRK: 9 brigades (Ilidža, Ilijaš, Igman, Trnovo mandatory)
- 255th Slavna Teočak: 2500/0.70
- Gradačac: 213th=1000, 217th=800, 215th=800
- Goražde 7×400, Srebrenica 5×400
- Brčko in 2nd Corps targets

### n806 state
- 89.8% area, 13/13 anchors, 4/6 benchmarks
- Supply: RS general=58/heavy=100, RBiH general=47.5/heavy=15, HRHB general=70/heavy=50
- SRK: 2 brigades on siege ring (1st Mech + Ilijaš), 2 on Hadžići, 2 on Trnovo, 3 on Vareš
- Gradačac RBiH ✓, Teočak RBiH ✓, Žepče HRHB ✓, Pelagićevo RS ✓
- Bijela RS (ARBiH strained supply prevents counterattack — historically correct constraint)

### Remaining calibration items
- consolidate_gains benchmark (RS w40 0.502 vs 0.553±0.05)
- preserve_survival_corridors benchmark (RBiH w40 0.386 vs 0.329±0.05)
- Drina at 80.9% (enclave brigade growth)
- SRK sector :4 still has 3 brigades at threat 13 (Phase 1 positional lock)
- Bijela — needs army HQ override or longer run for ARBiH counterattack

### Future mechanics (jotted down)
- Army HQ override: explicit orders that draw from garrison ("take Brčko at all costs")
- Probes/feints: army HQ-directed, low supply cost
- Salient retreat: commander reviews existing positions
- Demographic targeting filter (#42)
- ARBiH probing weak sectors (#44)

### Key constants (n806)
- EDGES_PER_GARRISON_BRIGADE: 6 | THREAT_BASELINE: 2000
- FACTION_POOL_SCALE: RBiH 0.08, RS 0.25, HRHB 1.05
- FACTION_MOBILIZATION_SCALE: RBiH 0.02, RS 0.08, HRHB 0.20
- EMBARGO_SUPPLY_CAP: RBiH 45, RS 90, HRHB 70
- EMBARGO_HEAVY_CAP: RBiH 15, RS 100, HRHB 50
- SALIENT_RISK_THRESHOLD: 0.75
- CRITICAL_DENSITY_THRESHOLD: 0.10, STRAINED: 0.167
