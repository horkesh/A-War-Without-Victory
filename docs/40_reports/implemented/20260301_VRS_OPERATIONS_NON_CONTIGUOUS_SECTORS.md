# VRS Pre-Planned Operations, Non-Contiguous Sectors, Operations GUI

**Date**: 2026-03-01
**Run**: n326 (40w, `apr1992_definitive_40w`)
**Hash**: `205b3676c8fe3ce4`

## Changes Implemented

### 1. Non-Contiguous Sector Separation
- Every DFS connected component becomes its own sector (no merging)
- `MIN_SECTOR_EDGES` no longer used for merge/promote decisions
- Disconnected pockets/enclaves retain geographic identity
- Post-BFS pocket claiming: brigades at unreachable friendly OSIDs seed new BFS
- `assignBrigadesToSectors()` now uses BFS nearest-sector fallback (not largest)
- **Result**: 29 sectors (up from ~22 before) — pockets get own sectors

### 2. Pre-Planned VRS Operations (5 named)
| Operation | Corps | Target Municipalities | Brigades | Objectives |
|---|---|---|---|---|
| Operacija Koridor | `vrs_east_bosnian` | brcko, bosanski_samac, modrica | 6 | 6 |
| Operacija Drina | `vrs_drina` | zvornik, bratunac, vlasenica | 5 | 6 |
| Operacija Prsten | `vrs_sarajevo_romanija` | ilidza, hadzici, vogosca, ilijas | 3 | 6 |
| Operacija Foca | `vrs_herzegovina` | foca, cajnice, kalinovik | 5 | 6 |
| Operacija Prijedor | `vrs_1st_krajina` | prijedor, sanski_most, kljuc | 23 | 6 |

- All start in `execution` phase at turn 0 (JNA pre-planned)
- Corps stances set to `offensive`
- Sector_id resolution added for orphaned ops (no sector at injection time)

### 3. Brigade Column March (Rule 1.5)
- Brigades in sector_attack operations that are not in sector's friendly_osids column march to nearest sector OSID
- BFS through friendly territory for pathfinding
- Rule inserted after supply gate, before Hold (Rule 2)

### 4. Operations GUI Panel
- New "Operations" accordion in OOB sidebar (between Army and Sectors)
- Shows operation name, corps, phase badge, momentum, objectives, supply, brigade count
- Grouped by faction

## Calibration Results (n326 vs n314 baseline)

| Metric | n314 | n326 | Delta |
|---|---|---|---|
| **Overall match** | 87.4% (658/753) | 84.7% (638/753) | -2.7pp |
| Krajina | 97.0% | 97.0% | 0.0pp |
| Posavina/NE | — | 76.1% | — |
| Drina | 75.0% | 71.9% | -3.1pp |
| Central Corridor | 91.5% | 90.4% | -1.1pp |
| Central Bosnia | — | 86.1% | — |
| Sarajevo | — | 77.4% | — |
| Herzegovina | — | 89.2% | — |

### RS Territory Progression
- Week 1: 283 OSIDs → Week 35 peak: 382 OSIDs (+99) → Week 40: 375 (-7 from peak)
- Final: RS=375, RBiH=289, HRHB=89

### Casualties (40w)
| Faction | Killed | Wounded | Missing | Total |
|---|---|---|---|---|
| RS | 1,713 | 4,225 | 1,249 | 7,187 |
| RBiH | 1,306 | 3,162 | 836 | 5,304 |
| HRHB | 618 | 1,506 | 424 | 2,548 |

### Personnel (final)
- RS: 125,847
- RBiH: 210,335
- HRHB: 64,700

### Key Control Checks
- Brcko corridor (RS): MISS (RBiH) — Operacija Koridor failed to secure
- Orasje pocket (HRHB): OK
- Gradacac (RBiH): OK
- Srebrenica (RBiH): OK
- Gorazde (RBiH): OK
- Bihac (RBiH): OK
- Ilidza (RS): MISS (RBiH) — Operacija Prsten unable to hold
- Sarajevo center (RBiH): MISS (null)
- Pale (RS): MISS (null)

## Analysis

The -2.7pp drop is expected for a first-pass operation injection. Key observations:

1. **Operations execute from turn 0**: All 5 operations confirmed active in initial save
2. **Column march displacement**: Brigades marching to sector positions leave gaps temporarily
3. **Drina degradation**: RS fails to take several Drina valley OSIDs that the baseline captured via free captures — operations may be disrupting natural displacement patterns
4. **Posavina corridor**: Operacija Koridor doesn't capture Brcko — operation objectives insufficient or brigade count too low (6 brigades)

## Tuning Recommendations

1. **Column march timing**: Consider delaying operations by 2-3 weeks to let initial displacement settle
2. **Drina Corps**: Only 5 brigades participating — may need to expand or adjust objectives
3. **SRK**: Only 3 brigades — Sarajevo encirclement needs more mass
4. **Consider operation removal for understrength corps**: If corps has < 5 brigades, skip pre-planned operation
5. **Calibration target**: Re-tune doctrine phases after operations stabilize
