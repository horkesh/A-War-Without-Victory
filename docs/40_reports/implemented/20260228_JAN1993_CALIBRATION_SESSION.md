# January 1993 Painted Target Calibration Session

**Date**: 2026-02-28
**Best run**: n241 (82.1% OSID match rate)
**Run directory**: `runs/apr1992_definitive_40w__4524ee926374c26f__w40_n241`

## Targets vs Results

| Metric | Target | n241 Result | Delta |
|---|---|---|---|
| RS OSIDs | 416 | 428 | +12 |
| RBiH OSIDs | 248 | 251 | +3 |
| HRHB OSIDs | 89 | 74 | -15 |
| VRS army | 100,000 | 112,738 | +12,738 |
| ARBiH army | 130,000 | 134,250 | +4,250 |
| HVO army | 45,000 | 44,933 | -67 |
| Match rate | 100% | 82.1% | -17.9% |

## Iteration History

| Run | RS | RBiH | HRHB | Match% | Key change |
|---|---|---|---|---|---|
| n233 (baseline) | 526 | 163 | 64 | 76.0% | Pre-calibration (52w settings) |
| n234 | 495 | 190 | 68 | 78.6% | RS_EARLY_WAR 30→20, RS pool 0.35→0.30, doctrine phases |
| n235 | 418 | 259 | 76 | 78.5% | RBiH standing orders balanced@w12, RS pool→0.26 |
| n236 | 425 | 252 | 76 | 80.9% | SRK weight↑, Drina weight↑, RS pool→0.28 |
| n237 | 429 | 248 | 76 | 80.9% | SRK 90, removed Ozren, Corridor 92→100 |
| n238 | 475 | 213 | 65 | 75.7% | RS pool→0.24, early share→0.32 (REVERTED) |
| n239 | 444 | 239 | 70 | 79.5% | RS_EARLY_WAR→22, post share→0.06 (REVERTED) |
| n240 | 429 | 250 | 74 | 81.9% | Reverted to n237 params + HRHB pool 1.85 |
| **n241** | **428** | **251** | **74** | **82.1%** | **HRHB pool 2.10** |

## Regional Match Rates (n241)

| Region | Wrong | Total | Match% | Dominant error |
|---|---|---|---|---|
| Krajina | 3 | 65 | 95% | RS→HRHB |
| Bihac | 3 | 48 | 94% | RBiH→RS |
| Herzegovina | 5 | 64 | 92% | Mixed |
| Posavina/NE | 12 | 57 | 79% | RS→RBiH |
| Central Corridor | 15 | 67 | 78% | RS→RBiH |
| Central Bosnia | 23 | 105 | 78% | RS→RBiH/HRHB |
| Sarajevo | 16 | 48 | 67% | RBiH→RS |
| **Drina Valley** | **37** | **97** | **62%** | RBiH→RS |

## Edge Cases (3/7 pass)

| Case | Expected | Actual | Status |
|---|---|---|---|
| Vozuca | RS | RS | PASS |
| Gorazde | RBiH | RBiH | PASS |
| Srebrenica | RBiH | RBiH | PASS |
| Orasje | HRHB | RS | FAIL |
| Teocak | RBiH | RS | FAIL |
| Sapna | RBiH | RS | FAIL |
| Brcko South | RBiH | RS | FAIL |

## Key Learnings

### What worked
1. **RS_EARLY_WAR_END_WEEK 30→20**: Biggest single lever. RS was at 488 OSIDs by w20 in baseline.
2. **RBiH standing orders balanced@w12**: Critical. With general_defensive, RBiH issued only 3 attacks in 40 weeks. Balanced enabled 91 attacks.
3. **Symmetric alliance filter**: RBiH was attacking HRHB territory. Added RBiH→HRHB block.
4. **Army operation priorities**: RS Drina Sweep weight↑, SRK weight↑, removed Ozren Operations, reduced Central Corridor/Krajina Sweep.
5. **RBiH army priorities**: Added Central Corridor Counter, Bugojno-Konjic Defense, Brcko South Hold.
6. **RS pool scale 0.35→0.28**: Reduced VRS from 113k to 113k (diminishing returns below 0.28).

### What didn't work
1. **RS pool scale below 0.26**: Caused RS to lose Drina/Sarajevo while still overrunning Central.
2. **Higher RS early-war aggression (0.32)**: Combined with lower pool, made RS MORE aggressive.
3. **Extending RS_EARLY_WAR_END_WEEK beyond 20**: RS overruns Bihac/Central with extra weeks.
4. **HRHB pool scale 1.60→2.10**: Zero impact on HRHB territory. Issue is structural (RS takes HRHB territory regardless of troop count).

### Structural limits (82% ceiling)
1. **Drina Valley (37 wrong)**: Srebrenica enclave (7 OSIDs in municipality should be RS) + Bratunac/Visegrad/Zvornik borders. Enclave brigades defend entire municipality; RS can't selectively take outskirts.
2. **Sarajevo (16 wrong)**: SRK has 3-5 subordinate brigades vs 48 suburb OSIDs. Weight increases don't help without more troops.
3. **HRHB deficit (15 wrong)**: RS Corridor 92 steamrolls HVO positions in Orasje/Posavina. HVO brigade count insufficient for defense.
4. **Central Corridor (15 wrong)**: RS 1KK overruns Maglaj/Zavidovici despite reduced priority weights.

### Future fixes beyond parameter tuning
- **Enclave resilience**: Srebrenica/Gorazde enclave brigades should not defend outlying municipality OSIDs
- **Corps-level troop allocation**: SRK needs more brigades (currently 3-5)
- **HVO Orasje**: Dedicated enclave-style defense for Orasje pocket
- **Supply/logistics**: Constrain RS overextension via supply mechanics
- **Displacement**: Currently 0 — coercion pressure system not generating displacement events

## Changes Applied (Final State)

### bot_strategy.ts (phase_ii)
- RS_EARLY_WAR_END_WEEK: 30→20
- RS doctrine: w0-20 share 0.28 aggr 0.15, w20-40 share 0.08 aggr -0.05, w40+ share 0.10 aggr -0.1
- RBiH doctrine: w0-20 share 0.10 aggr -0.10, w20-40 share 0.15 aggr -0.05, w40-56 share 0.20 aggr 0.0
- RBiH strategy: max_attack_share 0.15, attack_coverage_threshold 180, min_active_brigades 2
- HRHB strategy: corridor_municipalities += orasje, HRHB_LASVA_ATTACK_SHARE 0.45→0.35
- RBiH standing orders: general_defensive w0-12 only, balanced w12-56
- HRHB standing orders: Lasva Offensive→Anti-RS Defense (balanced)
- RS army priorities: Corridor 92 weight 120→100 end 25, Krajina Sweep end 30 weight 45, Sarajevo Siege weight 90, Drina Sweep weight 130 end 30 + cajnice/rudo, Central Corridor weight 30 end 20, Herzegovina Hold weight 50 + cajnice/rudo/foca, Western Krajina + bosanska_krupa/sanski_most weight 55, Ozren Operations REMOVED
- RBiH army priorities: Tuzla Defense weight 80, Central Corridor Counter (w12-56 weight 80), Bugojno-Konjic Defense (w0-56 weight 60), Brcko South Hold (w0-56 weight 90)
- HRHB army priorities: Central Bosnia Defense weight 75 + kakanj/fojnica, Posavina Defense weight 85, Orasje Pocket weight 90, Lasva Offensive → Central Bosnia Anti-RS

### bot_brigade_ai_osid.ts (phase_ii)
- Symmetric alliance filter: RBiH→HRHB attack blocking at 3 locations

### pool_population.ts (phase_i)
- RS FACTION_POOL_SCALE: 0.35→0.28
- HRHB FACTION_POOL_SCALE: 1.60→2.10

### bot_strategy.ts (bot/)
- Benchmarks updated for 40w targets (turn 20 + turn 40)

### scenario_runner.ts
- OSID anchors: Orasje (HRHB), Brka/Brcko South (RBiH), Gorazde (RBiH), Srebrenica (RBiH), Vozuca (RS)
- Fixed OSID names: orasje_2→orasje, brcko_3→brka_2, maglaj:vozuca_2→zavidovici:vozuca_2

### Other
- Created `data/scenarios/apr1992_definitive_40w.json`
- Added `npm run sim:scenario:run:40w`
- Created `tools/compare_painted_vs_sim.cjs`
