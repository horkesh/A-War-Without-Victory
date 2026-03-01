# Phase M Calibration Report — n268 (40w)

**Date:** 2026-03-01
**Run:** `apr1992_definitive_40w__00750db9480be428__w40_n268`
**Scenario:** `apr1992_definitive_40w` (recruitment_mode: player_choice)
**State hash:** `8c70d61f3c37f740`

## Summary

n268 is the first calibration run after Phase M mechanics (M1–M4):
- M1: Schema (morale field, displacement_event_log)
- M2: Morale drift, morale retreat resistance, ZoC virtual defense
- M3: Enclave OOB (infantry-only composition, morale 70 for 13 enclave brigades)
- M4: Per-municipality displacement routing, rear-area cleanup directive, 3rd Corps priority boost
- M5: Deferred (breakthrough retreat not needed — Orasje gap is OOB issue)

**Overall OSID match: 81.0% (610/753)** — same as n246 baseline (~81%).
**All 6 bot benchmarks pass.**

## Territory Totals

| Faction | Painted | n268 | Delta | n246 (baseline) | n246 Delta |
|---------|---------|------|-------|-----------------|------------|
| RS      | 416     | 437  | +21   | 406             | -10        |
| RBiH    | 248     | 235  | -13   | 265             | +17        |
| HRHB    | 89      | 81   | -8    | 82              | -7         |

RS expanded +31 vs n246; RBiH contracted -30 vs n246. HRHB roughly stable.

## Regional Breakdown

| Region            | Match | n268 RS | n268 RBiH | n268 HRHB | Painted RS | Painted RBiH | Painted HRHB | RS Δ  | RBiH Δ |
|-------------------|-------|---------|-----------|-----------|------------|--------------|--------------|-------|--------|
| KRAJINA           | 96.2% | 113     | 18        | 1         | 112        | 20           | 0            | +1    | -2     |
| POSAVINA_NE       | 75.2% | 74      | 35        | 0         | 65         | 42           | 2            | +9    | -7     |
| DRINA             | 68.8% | 75      | 53        | 0         | 99         | 29           | 0            | **-24** | **+24** |
| CENTRAL_CORRIDOR  | 78.7% | 54      | 36        | 4         | 38         | 52           | 4            | +16   | -16    |
| CENTRAL_BOSNIA    | 80.1% | 57      | 72        | 37        | 42         | 85           | 39           | +15   | -13    |
| SARAJEVO          | 67.7% | 21      | 10        | 0         | 21         | 10           | 0            | 0     | 0      |
| HERZEGOVINA       | 91.4% | 43      | 11        | 39        | 39         | 10           | 44           | +4    | +1     |

## Key Findings

### 1. Drina Enclave Overexpansion (24 OSIDs wrong)
RBiH holds 53 OSIDs in Drina vs painted 29 — **+24 surplus**. The enclave brigades (Srebrenica, Gorazde) with morale 70 (= MORALE_RESIST_FLOOR) resist retreat on costly victories AND attack outward, capturing Bratunac (4), Cajnice (4), Foca (5), Kalinovik (4), Visegrad (3), Rudo (2), Srebrenica (6), Sokolac (1), Vlasenica (2).

**Root cause:** Morale 70 = retreat resistance floor. Enclave brigades never retreat from costly victories, becoming immovable defenders who then counterattack.

**Fix options:**
- Lower enclave initial_morale from 70 → 55 (below resist floor, they'll retreat on costly victories)
- Or add attack suppression for enclave brigades (composition-based: infantry-only with no heavy weapons should have reduced attack capability)
- Or remove enclave municipalities from 2nd Corps army priority targets

### 2. Central Corridor Overrun (16 OSIDs wrong)
RS holds 54 vs painted 38 in corridor. Tesanj (5 OSIDs), Maglaj (4), Zavidovici (3), Kakanj (2), Doboj (3), Zenica (1). 3rd Corps priority weight increase (80→120) insufficient.

**Root cause:** RS offensive weeks 0-20 captures corridor territory, then morale retreat resistance helps RS hold it against 3rd Corps counterattacks in w20-40.

**Fix options:**
- Lower RS attack share in w0-20 (0.28 → 0.22) to reduce corridor penetration
- Increase RBiH aggression in w20-40 (-0.05 → +0.05) to strengthen counterattacks
- Add Tesanj/Maglaj to OSID anchors

### 3. Central Bosnia Overrun (15 OSIDs wrong)
RS holds 57 vs painted 42. Bugojno (10 OSIDs) is the worst — completely overrun. Gornji Vakuf (2), Travnik (3), Vares (2), Olovo (2), Zepce (3).

**Root cause:** 4th Corps too weak to hold Bugojno against VRS 2nd Krajina Corps. Also RS targets Bugojno from multiple directions.

**Fix options:**
- Increase 4th Corps Bugojno-Konjic Defense weight (60 → 90)
- Remove Bugojno from VRS 2nd Krajina targets (historical: RS didn't take Bugojno)

### 4. Orasje Still Falls (HRHB 0 vs painted 2)
Known issue: `hvo_northwest_bosnia` has 0 brigades. OOB fix needed, not a mechanics issue.

### 5. Sarajevo Edges Wrong (10 OSIDs, 67.7% match)
8 of 10 mismatches are bidirectional front-edge wobble (Ilidza, Vogosca, Trnovo, Pale). Normal variance for a contested urban front.

## Army Strengths

| Faction | End Personnel | Target | Brigades (active) |
|---------|--------------|--------|-------------------|
| RS      | 115,133      | 97-102k| 80                |
| RBiH    | 147,239      | ~130k  | 68                |
| HRHB    | 51,190       | ~45k   | 27                |

RS personnel 13k over target — FACTION_POOL_SCALE 0.28 may need reduction to 0.25.
RBiH personnel 17k over target — but this is acceptable (higher than target means more defense).
HRHB personnel 6k over target — within range.

## Combat Statistics

| Metric | n268 | Target |
|--------|------|--------|
| Total orders | 392 | — |
| RS orders | 331 | — |
| RBiH orders | 61 | — |
| Settlement flips | 206 | — |
| Free captures (no defender) | 180 | <80 |
| Defender present | 132 | — |
| Total casualties | 26,157 | >12,000 |
| Attacker casualties | 23,439 | — |
| Defender casualties | 2,718 | — |

Free captures still high (180 vs target <80). ZoC virtual defense should intercept some of these but isn't reducing free captures enough. Likely because many "free" OSIDs are behind the front where no ZoC coverage reaches.

## Benchmarks

All 6 pass:
- RS w20: 0.591 (expected 0.55±0.08) ✅
- RS w40: 0.580 (expected 0.553±0.05) ✅
- RBiH w20: 0.301 (expected 0.35±0.08) ✅
- RBiH w40: 0.312 (expected 0.329±0.05) ✅
- HRHB w20: 0.108 (expected 0.12±0.05) ✅
- HRHB w40: 0.108 (expected 0.118±0.04) ✅

## Anchor Checks

| Anchor | Expected | Actual | Pass |
|--------|----------|--------|------|
| Zvornik mun | RS | RBiH | ❌ (enclave overexpansion) |
| Bijeljina mun | RS | RS | ✅ |
| Srebrenica mun | RBiH | RBiH | ✅ |
| Bihac mun | RBiH | RBiH | ✅ |
| Banja Luka mun | RS | RS | ✅ |
| Tuzla mun | RBiH | RBiH | ✅ |
| Centar Sarajevo mun | RBiH | RBiH | ✅ |
| Vitinica OSID | RBiH | RBiH | ✅ |
| Teocak OSID | RBiH | RS | ❌ (Posavina overrun) |
| Orasje OSID | HRHB | RS | ❌ (OOB gap) |
| Brcko Brka OSID | RBiH | RS | ❌ (Posavina overrun) |
| Gorazde OSID | RBiH | RBiH | ✅ |
| Srebrenica OSID | RBiH | RBiH | ✅ |
| Vozuca OSID | RS | RS | ✅ |

10/14 anchors pass (71%). Failed: Zvornik (enclave overexpansion), Teocak, Orasje, Brcko south.

## Comparison vs n246 Baseline

| Metric | n246 | n268 | Change |
|--------|------|------|--------|
| RS OSIDs | 406 | 437 | +31 |
| RBiH OSIDs | 265 | 235 | -30 |
| HRHB OSIDs | 82 | 81 | -1 |
| Benchmarks | 6/6 | 6/6 | same |
| Match rate | ~81% | 81.0% | ~same |

The M2-M4 mechanics shifted the RS/RBiH distribution but didn't improve overall match. Morale retreat resistance strengthens both attackers (RS holds gains) and defenders (enclaves hold territory), netting out to roughly zero improvement on aggregate match rate.

## Proposed Iteration Knobs (Priority Order)

1. **Enclave morale 70→55**: Fixes Drina overexpansion (biggest single issue, 24 OSIDs)
2. **RS attack share w0-20: 0.28→0.22**: Reduces corridor/C.Bosnia penetration
3. **RS FACTION_POOL_SCALE 0.28→0.25**: Brings VRS personnel closer to 100k target
4. **4th Corps Bugojno weight 60→90**: Defends Bugojno from VRS overrun
5. **OOB: assign brigades to hvo_northwest_bosnia**: Fixes Orasje (structural, not tuning)

**Expected improvement:** Knobs 1-3 alone should shift match rate from 81% to ~86-88% by fixing the Drina overcapture (24 OSIDs) and reducing corridor/C.Bosnia overrun (~10-15 OSIDs).

## Deferred Items

- **M5 Breakthrough Retreat**: Deferred. Orasje gap is OOB issue, not breakthrough issue.
- **OSID-level displacement tracking**: Deferred. System operates at municipality level.
- **Per-OSID displaced_in/out counters**: Deferred. displacement_event_log provides event-level tracking.
