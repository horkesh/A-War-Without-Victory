# Deep Dive Audit: Sectors, Operations & Combat — n412 (Turn 40)

**Date:** 2026-03-08
**Save:** `runs/apr1992_definitive_40w__3577d2a7a845ba79__w40_n412/final_save.json`
**Scenario:** apr1992_definitive_40w (40-week calibration)
**ATH:** 88.6% area-weighted
**Prior work:** Sector system overhaul (n406-n412) — hostile-side bridging removed, reserve discipline, ghost sector pruning, non-contiguous split fix, rear brigade reclassification.

---

## Methodology

Five parallel diagnostic agents examined the n412 save across:
1. Sector structural/topological integrity
2. Brigade assignment and operational readiness
3. Operations system health
4. Combat mechanics and balance
5. Sector intelligence and bot AI decision quality

Diagnostic scripts preserved at `tools/tmp_deep_*.cjs`.

---

## CRITICAL Issues

### C1: Frozen Front — 100% Catastrophic Attack Outcomes

**Evidence:** 23 of 24 battles in the last 3 turns resulted in catastrophic outcomes for the attacker. Attacker:defender casualty ratio is 27:1. Only 1 territory flip in 3 turns. The front is essentially static.

**Root cause:** Universal entrenchment. Most formations are at ~12 turns entrenchment (effective defensive bonus +0.62-0.65). Combined with the sqrt-based diminishing returns curve, defenders are nearly invulnerable.

**Cascade effects:**
- RS burns supply on futile attacks (-> C2)
- Morale degrades from catastrophic outcomes (-> C3)
- Bot aggression goes negative because attacks always fail (-> H1)
- 3 of 5 active VRS operations stalled (-> L5)

**Potential remedies (design decision required):**
- Offensive concentration bonuses (artillery prep, multi-brigade coordination multiplier)
- Entrenchment degradation under sustained pressure
- Attacker force-ratio override at sufficient concentration
- Seasonal/weather effects on entrenchment

### C2: RS General Supply at Zero

**Evidence:** RS `general_supply_reserve` = 0.0 (critical). RBiH at 47.5 (low). HRHB healthy at 69.9. Heavy munitions adequate for all factions. 103 active sieges, 94 targeting RBiH positions (many running since turn 0).

**Impact:** RS cannot sustain offensive operations. Combined with C1, this means RS offensive doctrine is structurally impossible to execute — attacks fail AND the supply to attempt them is exhausted.

### C3: Widespread Morale Collapse

**Evidence:** 60 formations (28% of all active) have critical morale or cohesion (<30). RS worst: 24/84 formations below 30, average morale 51.2. Multiple formations at morale=0 while still active (e.g., rs_2nd_armored: 2,178 personnel, 0 morale).

**Question:** Should formations at morale=0 remain active? Current system allows them to fight at reduced effectiveness. Consider collapse/surrender mechanics at extreme morale thresholds.

---

## HIGH Issues

### H1: All Factions Have Negative Aggression

**Evidence:** RS averages -0.127 aggression modifier. RBiH -0.133. HRHB -0.160. Zero formations in "attack" posture across ALL factions despite 5 active VRS operations with 17 participating brigades.

**Expected:** RS should be significantly offensive at week 40 (early war peak). RS_EARLY_WAR_END_WEEK=20 reduces aggression from 0.15 to 0.05, but the actual values are negative.

**Impact:** RS offensive doctrine (starts professional, JNA inheritance) is not manifesting. The war arc is inverted — RS should be at peak offensive capability at w40.

### H2: Hold OSID Compliance at 16.7%

**Evidence:** Only 106 of 635 hold-ordered OSIDs have a brigade from the ordered corps present. 529 positions are vacant. Hold lists appear to be faction-wide rather than corps-local.

**Example:** ARBiH 1st Corps ordered to hold Bihac pocket OSIDs that belong to 5th Corps territory — structurally impossible.

**Fix:** `generateCorpsDirectives` hold_osid generation should filter to OSIDs within the corps's sector territory.

### H3: 37 Unclaimed HRHB Front Edges

**Evidence:** HRHB controls one side of 37 front edges with no HRHB sector claiming them. Concentrated in central Bosnia: Kotor Varos (9), Jajce (5), Mrkonjic Grad (4), Bugojno (3), Travnik (3), Skender Vakuf (3), Teslic (3).

**Root cause:** HVO Central Bosnia corps is in `EXEMPT_CORPS_IDS` (reserved for Bosniak-Croat conflict). These edges are on RS-facing fronts in HVO-controlled central Bosnia with no active HVO corps to claim them.

**Status:** Deferred — requires HVO Central Bosnia / Drina corps rework.

### H4: VRS Drina — 8 Consecutive Empty Sectors

**Evidence:** 8 consecutive sectors (indices 0-7) with 0 assigned brigades covering 34 front edges. Only 2 of 11 Drina sectors have any reserves. The corps has 7 brigades for 11 sectors spanning Sarajevo to Foca to Visegrad.

**Root cause:** VRS Drina corps definition is too broad geographically. Its territory BFS sweeps in areas that should belong to Sarajevo-Romanija or Herzegovina.

**Status:** Deferred — requires Drina corps rework.

### H5: 46 Active Brigades Unassigned (23.5%)

| Group | Count | Personnel | Reason |
|-------|-------|-----------|--------|
| HVO SE Herzegovina (rear) | 11 | ~18,700 | Only 6 edges for 14 brigades |
| HVO Central Bosnia (exempt) | 6 | ~7,300 | Corps has no sectors |
| VRS 1KK rear (Banja Luka) | 10+ | ~25,000 | Deep rear, reserve cap drops them |
| Enclave brigades (Gorazde, Srebrenica) | 6 | ~3,000 | Enclave sectors may not exist |
| General staff / main staff (exempt) | 3 | ~5,000 | Expected — HQ corps |

**Total idle force:** ~59,000 personnel across factions.

### H6: Absurd Target Lists

**Evidence:** ARBiH General Staff has 60 offensive targets. ARBiH 2nd Corps has 40. HVO Tomislavgrad has 14 targets including deep RS rear (Vlasenica, Zvornik, Doboj) — geographically unreachable.

**Impact:** Target spray prevents concentration of force. Combined with C1 (frozen front), forces that should be concentrated on 2-3 achievable objectives are theoretically committed to 40+ targets.

### H7: Faction Casualty Imbalance

| Faction | KIA (n412) | Pro-rata target | Delta |
|---------|-----------|----------------|-------|
| RBiH | 7,427 | ~6,667 | +11% |
| RS | 7,475 | ~5,333 | **+40%** |
| HRHB | 1,110 | ~1,778 | -38% |

RS is over-dying. HRHB is under-dying. Graz Accords cold-front logic (`isColdFront()`) suppresses HRHB combat too aggressively. RS bears disproportionate attacker casualties from futile assaults (C1).

---

## MEDIUM Issues

### M1: 58% of Reserves Physically Unreachable

28 of 48 reserve brigades are NOT within 2 BFS hops of their sector's territory. Worst: VRS 1KK (10 unreachable in Banja Luka rear). Reserves assigned to sectors they cannot quickly reinforce.

### M2: Intel Accuracy 57%

127/223 intel estimates correct. Systematic underestimation: "thin->normal" in 62 cases. 6 dangerous misreads on `vrs_1st_krajina:2` (estimated "thin", actually "dense" with 5 brigades). Bot may attack positions it believes are weakly held but are actually fortified.

### M3: 10 Cross-Corps Front Overlaps

Same OSID appears in sub_segments of 2+ corps (same faction). 5 RBiH (corps boundary zones), 5 RS. Cosmetic in current system (brigade assignment is deduplicated), but could cause issues in future per-sector calculations.

### M4: Density Spread >3x in 8/14 Corps

Equalization runs but cannot fully flatten density because it only moves non-front-line brigades. If all brigades are on front OSIDs, equalization has nothing to move. ARBiH 1st Corps: 14x spread. VRS 1KK: 13.3x.

### M5: Operation Participant Without Sector

`rs_1st_guards_motorized` participates in Operation Corridor but is NOT in any sector's assigned or reserve list. Likely a VRS Main Staff formation (exempt corps) temporarily assigned to an operation.

### M6: Reserve Fraction Non-Compliance

9/17 corps deviate >15% from ordered reserve fraction. VRS 1KK orders 13% but has 33%. VRS Herzegovina orders 16% but has 43%. HVO NW Bosnia orders 20% but has 0%. The reserve cap (max 2 per sector) may conflict with directive reserve_fraction targets.

### M7: Over-Mobilization

All factions 3-8k over 40w troop strength targets. RS strategic reserve at 23k+ surplus. Not harmful but indicates mobilization scaling may need adjustment.

---

## LOW / Informational

| # | Finding |
|---|---------|
| L1 | 1 bloated territory sector (vrs_1st_krajina:4: 40 territory OSIDs, 3 edges) |
| L2 | 4 sectors with 0 territory_osids (pure front stubs without hinterland) |
| L3 | 6 micro-sectors (1 edge each) — may be noise from over-splitting |
| L4 | 5 formations near FATIGUE_MAX (30). RS has 31 "forming" readiness (37%) |
| L5 | All 5 active operations are RS. 3/5 stalled. All have valid commanders. |
| L6 | Sector intel coverage 77/77 (full). 59% high confidence. |
| L7 | 1 critically understrength assigned brigade (arbih_285th: 193 personnel) |

---

## Clean Areas

| Area | Status |
|------|--------|
| Non-contiguous sectors | 0 (fixed this session) |
| Ghost sectors (0-edge) | 0 (fixed this session) |
| Cross-corps brigade assignment | 0 mismatches |
| Double-assigned brigades | 0 |
| Edge polarity (friendly/enemy) | 771/771 correct |
| Sub-segment structural integrity | Perfect |
| Corps directive consistency | All 17 valid |
| Operation commander system | All 5 assigned, all valid |
| Operation name uniqueness | Clean |
| Sector ID sequencing | Sequential, no gaps |
| Assigned brigade location accuracy | 102/102 correct |
| Encircled formations | 0 |

---

## Priority Triage

### Immediate (affects simulation validity)
1. **C1**: Frozen front — entrenchment makes all attacks catastrophic. Design decision required.
2. **H1**: Negative aggression for RS at w40 — investigate aggression modifier calculation.
3. **H2**: Hold OSID generation producing faction-wide lists — scope to corps territory.

### Short-term (calibration / balance)
4. **C2**: RS supply depletion — investigate drain rate vs patron aid scaling.
5. **C3**: Morale=0 formations remaining active — consider collapse thresholds.
6. **H7**: Casualty imbalance — Graz cold-front may be over-suppressing HRHB combat.
7. **H6**: Target list size — cap or filter to achievable targets within corps reach.

### Deferred (structural rework)
8. **H3/H4/H5**: HRHB Central Bosnia, VRS Drina, HVO SE Herzegovina — corps definition rework.
9. **M1**: Reserve reachability — consider geographic proximity in reserve assignment.
10. **M2**: Intel accuracy — tune strength category thresholds.

---

## Diagnostic Scripts

| Script | Purpose |
|--------|---------|
| `tools/tmp_deep_sector_struct.cjs` | Sector structure, edge ownership, territory ratios |
| `tools/tmp_deep_brigade_ops.cjs` | Brigade assignment, coverage gaps, formation health |
| `tools/tmp_deep_ops_system.cjs` | Operations, commanders, directives, attack orders |
| `tools/tmp_deep_combat.cjs` | Casualties, entrenchment, morale, supply, battles |
| `tools/tmp_deep_intel_bot.cjs` | Sector intel accuracy, bot AI decisions, postures |
