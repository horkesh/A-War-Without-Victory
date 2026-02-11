# Formation brigade counts vs historical OOB comparison

**Purpose:** Compare sim brigade outputs to historical Order of Battle (personnel and structure) to assess alignment and scaling.

**OOB sources:** `docs/knowledge/ARBIH_ORDER_OF_BATTLE_MASTER.md`, `VRS_ORDER_OF_BATTLE_MASTER.md`, `HVO_ORDER_OF_BATTLE_MASTER.md`.

---

## OOB alignment target (what “good” looks like)

- **Time window:** Compare run end state to the OOB band for the same calendar period (e.g. 20-week run from Apr 1992 → late Aug 1992; 52-week → Apr 1993; Sept 1991→Sept 1992 = 52 weeks with war start ~week 30).
- **Scale:** **1,000 troops per formation** for all factions. Implied personnel = formations × 1,000; should sit **within or within ~30% of** the historical band. Brigade counts are unequal (ARBiH max) via population-weighted pool.
- **Structure:** Key OOB areas should have formations:
  - **ARBiH:** At least one formation (or brigade presence) in each of: Sarajevo area, Tuzla, Zenica, Mostar area, Bihać, Konjic area, Travnik area (7 corps HQs / regions).
  - **VRS:** Presence in Banja Luka, Drvar area, Bijeljina area, Drina (Vlasenica/Han Pijesak), Sarajevo-Romanija (Lukavica), Herzegovina (Bileća) (6 corps areas).
  - **HVO:** Presence in Southeast Herzegovina (Mostar), Central Bosnia (Vitez/Busovača), Northwest Bosnia (Posavina), Tomislavgrad (4 OZs).
- **Pass criterion:** For a scenario with historically plausible control at start and limited divergence: (1) implied personnel per faction within ~30% of OOB band for the run’s time window, and (2) no major OOB area missing formations for that faction.

---

## Historical reference (personnel bands)

| Faction | Apr 1992 | Dec 1992 | Notes |
|--------|----------|----------|--------|
| **ARBiH** | ~60–80k | ~110–130k | 7 corps; Sarajevo, Tuzla, Zenica, Mostar, Bihać, Konjic, Travnik |
| **VRS** | ~80k | ~90–100k | 6 corps; Banja Luka, Drvar, Bijeljina, Drina, Sarajevo-Romanija, Herzegovina |
| **HVO** | ~25–35k | ~40–45k | 4 OZs; Mostar, Central Bosnia, Northwest Bosnia, Tomislavgrad |

---

## Run outputs

### Example: phase0 full progression 52w repeat (fixed 1k batch)

- **Formations added:** 3,504 (all brigades).
- **End state formations by faction:** HRHB 1,731, RBiH 1, RS 1,775.

Interpretation: This scenario uses control-path seeding and Phase I formation spawn. Control outcomes in the run are heavily skewed (RBiH ends with almost no territory; RS and HRHB gain most). Organizational penetration is seeded from control, so only factions that *hold* municipalities get pool strength and spawn. Hence RBiH keeps only the single initial formation (e.g. 1st Corps); RS and HRHB spawn ~1,700+ brigades each.

### Example: sep1991_to_sep1992_52w (population-weighted pool, 22 weeks Phase I)

- **Scenario:** 52 weeks, phase_0 to turn 30 then Phase I (war start ≈ Apr 1992); 22 weeks of formation spawn to ≈ Sept 1992. Pool weighted by 1991 census (Bosniak/Serb/Croat per mun); FACTION_POOL_SCALE so ARBiH is largest.
- **Formations added:** ~281 (all brigades); end state ~284 total (3 initial + 281).
- **End state by faction:** RBiH 104, RS 103, HRHB 80 — **ARBiH (RBiH) maximum**, counts unequal and population-driven.
- **Implied personnel:** RBiH 104k, RS 103k, HRHB 80k (1,000 per formation).
- **Historical Sept 1992:** ARBiH ~80–100k, VRS ~85–95k, HVO ~40–45k. RBiH in band; RS/HRHB slightly high (tune ELIGIBLE_POP_NORMALIZER or scale if needed).

---

## Same nominal brigade size (population-driven counts)

The sim uses **one nominal size (1,000 troops) per formation for all factions** (`getBatchSizeForFaction` in `src/state/formation_constants.ts`). **Brigade counts** are unequal because the **militia pool is population-weighted**: pool available per (mun, faction) = strength × scale × (eligible population from 1991 census / normalizer). Eligible = Bosniak for RBiH, Serb for RS, Croat for HRHB. So the faction with more controlled eligible population gets more formations; ARBiH is calibrated as largest (FACTION_POOL_SCALE in `pool_population.ts`). **Implied personnel** = formations × 1,000 per faction; compare to historical bands.

---

## Scaling (brigade → personnel)

Using **1,000 per formation** and population-weighted pool (sep1991_to_sep1992_52w):

- **Run RBiH:** 104 × 1,000 = 104k. **Historical ARBiH Sept 1992:** ~80–100k. **Verdict:** In band; ARBiH is largest formation count as intended.
- **Run RS:** 103 × 1,000 = 103k. **Historical VRS Sept 1992:** ~85–95k. **Verdict:** Slightly high; tune if needed.
- **Run HRHB:** 80 × 1,000 = 80k. **Historical HVO Sept 1992:** ~40–45k. **Verdict:** High; normalizer/scale can be tuned.

With **population-weighted pool** and **ARBiH calibrated as largest**, sep1991_to_sep1992_52w gives RBiH in the Sept 1992 band. RS/HRHB can be tuned via ELIGIBLE_POP_NORMALIZER or FACTION_POOL_SCALE if needed.

---

## When runs might align better

- **Historical control at start:** Scenarios that load historical control (e.g. Sept 1992) and run with limited flips would give op and spawn in historically held areas (e.g. ARBiH in Sarajevo, Tuzla, Zenica, enclaves).
- **Tuning:** Pool is population-weighted (1991 census); FACTION_POOL_SCALE (pool_population.ts) calibrates ARBiH as largest. To bring implied personnel into bands, adjust ELIGIBLE_POP_NORMALIZER or FACTION_POOL_SCALE, or use historical control (e.g. Sept 1992).

---

## Summary

- **Target:** See **OOB alignment target** above — same time window, 1 brigade ≈ 1k troops, implied personnel within ~30% of OOB band, key corps/OZ areas have formations.
- **Structure:** Sim has no corps/OZ hierarchy; we only have brigades per (mun, faction). Comparing “which muns have brigades” to OOB corps/OZ areas is the right structural check.
- **Scale:** 1,000 per formation for all; brigade counts unequal (population-weighted pool, ARBiH max). Compare implied personnel to OOB bands for the same time window.
- **Current phase0 runs:** Brigade counts are driven by control; when control diverges from history (RBiH nearly eliminated), formation counts diverge accordingly. Meeting the target requires scenarios with historical or historically plausible control and, if needed, tuning of pool/brigade scaling.
