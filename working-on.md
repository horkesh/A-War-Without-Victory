# Working On — Task Continuity

## Current State: n797 — Calibrated, Ready for New Task

### Session Summary (2026-03-15)
Massive session: ~50 calibration runs (n748-n797), 15+ commits.

**Major fixes shipped:**
1. Intelligent Corps Commander (Phases A-E): defensive health gate, salient aversion, threat-weighted density, SRK OOB, return-to-corps march, cross-corps enclave defense + guard
2. Mandatory spawn fix: 64/182 brigades restored (root cause: empty militia pools)
3. Overstacking redistribution: isMovementDestinationRisky removed for front redistribution (Teočak fix)
4. Drina OOB: +Rogatica, +Višegrad brigades, Čajniče home fix
5. Elite cohesion recall + tracker, catastrophic stall gate
6. Gradačac/Brčko brigade buffs + Brčko in 2nd Corps targets
7. Troop balance calibration: mobilization scales adjusted for all factions

### Current calibration (n797)
- 90.4% area, 13/13 anchors, 5/6 benchmarks
- w40: RS 99k (✓), ARBiH 153k (slightly over 130k, acceptable), HRHB 42k (✓)
- w206: RS 119k (✓), ARBiH 231k (over 200k), HRHB 66k (over 55k)
- Teočak, Gradačac, Bijela, Žepče all hold
- 166 total brigades (122 ARBiH mandatory + 44 emergent)

### Troop calibration targets (from docs/knowledge/*_ORDER_OF_BATTLE_MASTER.md)
| Period | ARBiH | VRS | HVO |
|--------|-------|-----|-----|
| Apr 1992 (w0) | 60-80k | ~80k | 25-35k |
| Dec 1992 (w40) | 110-130k | 90-100k | 40-45k |
| Apr 1993 (w52) | 135-155k | 100-110k | 50-55k |
| 1994 (w104) | 165-180k | 110-120k | 50-55k |
| Nov 1995 (w206) | 180-200k | 110-120k | 50-55k |

### Open items
- #49: preserve_survival_corridors benchmark (only failing benchmark)
- #42: Bot strategic targeting — demographic affinity filter still needed
- #44: ARBiH probing weak sectors
- #45: Salient retreat mechanism
- #43: UI shows brigade raw power not sector defensive power

### Key constants (current)
- FACTION_POOL_SCALE: RBiH 0.08, RS 0.25, HRHB 1.05
- FACTION_MOBILIZATION_SCALE: RBiH 0.02, RS 0.08, HRHB 0.20
- RS_JNA_INHERITANCE_BONUS: 10,000
- BASE_MOBILIZATION_RATE: 0.003
- DENSITY_FLOOR_EDGES_PER_BRIGADE: 8, THREAT_GATE: 300
- MAX_CORPS_BRIGADES_PER_OSID: 2
- CRITICAL_DENSITY_THRESHOLD: 0.10, STRAINED: 0.167
- SALIENT_RISK_THRESHOLD: 0.75
- MAX_CONSECUTIVE_CATASTROPHIC_ON_CURRENT: 2
