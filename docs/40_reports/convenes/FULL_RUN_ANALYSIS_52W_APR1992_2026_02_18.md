# Full Run Analysis: 52-Week apr1992_definitive_52w

**Date:** 2026-02-18  
**Run:** apr1992_definitive_52w__0af6ac1e57e861d2__w52_n7  
**Artifacts:** `runs/apr1992_definitive_52w__0af6ac1e57e861d2__w52_n7/`, `data/derived/latest_run_final_save.json`

---

## 1. Displaced persons

### 1.1 Minority flight (Phase II pressure-driven)

| Metric | Total |
|--------|--------|
| Displaced (total) | 790,151 |
| Routed (to friendly muns) | 639,166 |
| Killed | 74,596 |
| Fled abroad | 74,974 |
| Settlements displaced (count) | 19,070 (over 49 weeks with activity) |
| Settlement-evaluations | 302,744 |

Most displacement occurs in **week 1** (turn 1): 674,012 displaced, 546,690 routed, 65,673 killed, 60,339 fled abroad — reflecting initial pressure sweep. Later weeks have smaller bursts (e.g. ~46k displaced in week 9).

### 1.2 Hostile takeover displacement (timer → camp → reroute)

| Metric | Total |
|--------|--------|
| Timers started | 14 |
| Timers matured | 14 |
| Camps created | 11 |
| Camps routed | 715 |
| Displaced (total) | 96,311 |
| Routed to friendly muns | 82,542 |
| Killed | 9,626 |
| Fled abroad | 4,143 |

Source municipalities in first maturation week (week 5): banovici, bijeljina, bugojno, konjic, lukavac, zavidovici, zvornik; later stari_grad_sarajevo and others.

### 1.3 Civilian casualties (attribution by faction)

| Faction | Killed | Fled abroad |
|---------|--------|-------------|
| RBiH | 53,612 | 0 |
| RS | 20,999 | 56,578 |
| HRHB | 9,611 | 22,539 |

RBiH has no “fled abroad” in this attribution (mechanic reflects who is displaced from where); RS and HRHB show substantial flee-abroad.

**Civilian casualties attribution (by design):** `civilian_casualties.fled_abroad` and `.killed` are attributed by **displacing faction** (the controller when minority flight runs, or `timer.from_faction` in hostile takeover). When Bosniaks flee from RS-held territory, attribution goes to RS, not RBiH. Hence "RBiH fled_abroad = 0" is correct when RBiH is not the displacing side.

---

## 2. Military casualties (Phase II attack resolution)

| Metric | Value |
|--------|--------|
| Attacker casualties | 335 |
| Defender casualties | 335.6 (personnel-equivalent) |
| Orders processed | 76 |
| Unique attack targets | 76 |
| Defender-absent battles | 76 |
| Defender-present battles | 0 |
| Control flips applied | 37 |

All 76 attacks were against **undefended or militia-held** settlements (no brigade-vs-brigade battles). Orders by faction: RS 66, RBiH 9, HRHB 1. Military casualties are therefore low; combat is mostly takeover of empty/militia-held settlements.

---

## 3. What was expected but did not happen

- **Brigade-vs-brigade battles:** None. No defender-present battles, so no set-piece battles. Expected in a longer or differently calibrated run: some fronts with defending brigades and higher military casualties.
- **RBiH bot benchmarks:** Two failures:
  - **hold_core_centers** (26w): actual control share 0.39 vs expected 0.20 (RBiH overperformed).
  - **preserve_survival_corridors** (52w): actual 0.39 vs expected 0.25 (again RBiH overperformed).
- **Formal Sarajevo hold:** No municipality-level “Sarajevo” anchor in the runner; siege activity is present (displacement from centar_sarajevo, ilidza, hadzici, stari_grad_sarajevo) but no single anchor like `centar_sarajevo` expected RBiH for a “Sarajevo holds” check.

---

## 4. What happened that was unexpected (or notable)

- **RBiH control share above benchmark:** RBiH held core centers and survival corridors better than the benchmark expected (39% vs 20–25%), so the run is “RBiH-strong” relative to current tolerances.
- **65 settlement control flips** over 52 weeks; net control change small (RBiH 2297→2289, RS 2507→2518, HRHB 1018→1015) but churn concentrated in key muns (e.g. zvornik 13 flips, ilidza 8, bihac 5).
- **Direction of flips:** RBiH→RS 34, RS→RBiH 26, HRHB→RS 4, RS→HRHB 1 — consistent with RS expansion and RBiH counter-pressure.
- **Historical anchors:** All seven passed (Zvornik RS, Bijeljina RS, Srebrenica RBiH, Bihac RBiH, Banja Luka RS, Tuzla RBiH, Sapna S163520 RBiH).
- **Mass displacement in week 1:** Minority flight in the first week is very large (674k displaced), reflecting initial pressure evaluation across many settlements; later weeks are much smaller.

---

## 5. Why many settlements show a population of 15,000

### 5.1 Observation

In the tactical map (and in `displacement_state`), many **municipalities** end with **current population = 15,000**. In the 52w final save, **20 municipalities** have exactly 15,000 current population (e.g. banja_luka, bihac, bijeljina, brcko, cazin, doboj, gorazde, ilidza).

### 5.2 Root cause

1. **Default `original_population` = 10,000**  
   `displacement_state` is **not** pre-initialized from 1991 census. When a municipality is first touched by displacement (takeover timer maturation or minority flight), `getOrInitDisplacementState(state, munId, state.displacement_state?.[munId]?.original_population ?? 10000)` creates a new row with **`original_population = 10,000`**. So every such municipality starts with the same baseline.

2. **Receiving capacity = 1.5 × original**  
   In hostile takeover camp routing (`displacement_takeover.ts`), target capacity for a municipality is:
   - `targetCapacity = floor(original_population * DISPLACEMENT_CAPACITY_FRACTION)` with `DISPLACEMENT_CAPACITY_FRACTION = 1.5`.
   - So when `original_population = 10,000`, **capacity = 15,000**.

3. **Current population formula**  
   `currentPopulation = original_population - displaced_out - lost_population + displaced_in`.  
   For a municipality that is mainly a **receiver** (little or no displaced_out/lost at that mun), we keep adding `displaced_in` until `targetCurrent` reaches capacity. So we fill until **current = 15,000**, then `availableCapacity = 0` and no more are routed there.

4. **Result**  
   Any municipality that (a) was first created with default 10,000 and (b) acts as a major displacement receiver will tend to fill to **15,000** and then stop. Hence “a lot of settlements have a population of 15,000” — they are muns that hit the **receiving cap** derived from the 10k default.

### 5.3 Verification

- In `latest_run_final_save.json`, **every** municipality in `displacement_state` has `original_population: 10000`.
- For the 20 muns with current exactly 15,000, the arithmetic is always:  
  `10000 + displaced_in - displaced_out - lost_population = 15000` (e.g. net +5000 for banja_luka: 115971 - 93374 - 17597 = 5000).

### 5.4 Recommendation

- **Intended behavior:** Initialize `displacement_state` (or at least `original_population`) from **1991 census** at scenario load (e.g. from `municipality_population_1991` / `data/derived/municipality_population_1991.json`) so that:
  - Receiving capacity scales by real municipality size (e.g. 1.5 × 1991 total).
  - Current population and map “Population (Current)” reflect plausible scales (e.g. Banja Luka ~200k, not 15k).
- **Until then:** The 15,000 value is the **cap** for any mun created with the 10k default; it is not a separate constant or bug, but a consequence of that default and the 1.5× capacity rule.

---

## 6. Summary table

| Category | Summary |
|----------|---------|
| Displaced (minority flight) | 790k displaced, 639k routed, 75k killed, 75k fled abroad |
| Displaced (takeover) | 96k displaced, 82k routed, 9.6k killed, 4.1k fled abroad |
| Civilian casualties (by faction) | RBiH 53.6k killed; RS 21k killed / 56.6k fled; HRHB 9.6k killed / 22.5k fled |
| Military (Phase II) | 335 attacker / 335.6 defender; 76 orders, 37 flips; 0 defender-present battles |
| Control | 65 flips; RBiH 2289, RS 2518, HRHB 1015 (net small change) |
| Anchors | 7/7 passed |
| Bot benchmarks | 4/6 passed; RBiH hold_core_centers and preserve_survival_corridors overperformed |
| 15,000 population | 20 muns at cap; cause = default original 10k + receiving capacity 1.5× = 15k |

---

## 7. References

- Run summary: `runs/apr1992_definitive_52w__0af6ac1e57e861d2__w52_n7/run_summary.json`
- End report: `runs/apr1992_definitive_52w__0af6ac1e57e861d2__w52_n7/end_report.md`
- Phase L calibration: `docs/40_reports/convenes/PHASE_L_CALIBRATION_AND_TESTING_2026_02_18.md`
- Displacement logic: `src/state/displacement_takeover.ts` (capacity), `src/state/displacement_state_utils.ts` (getOrInitDisplacementState), `src/ui/map/data/GameStateAdapter.ts` (currentPopulation)
