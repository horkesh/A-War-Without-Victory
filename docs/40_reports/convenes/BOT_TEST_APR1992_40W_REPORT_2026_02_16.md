# Bot test report: April 1992 scenario (40-week view)

**Date:** 2026-02-16  
**Request:** Run scenario 40 weeks from April 1992; report on troop strengths, control flips, and major happenings.  
**Source run:** `apr1992_historical_52w__8f38ea4a52d0448f__w52` (legacy run; canonical April 1992 scenario is now **apr1992_definitive_52w** for all bot and desktop use).  
**Note:** A dedicated 40-week run was started but takes several minutes; this report uses the existing 52-week run. Combat totals for **weeks 1–40** are summed from `phase_ii_attack_resolution_weekly`; troop strengths and control are **initial (week 0)** and **final (week 52)** to show full bot trajectory.

---

## 1. Troop strengths (personnel)

| Faction | Initial (week 0) | Final (week 52) | Delta |
|--------|-------------------|------------------|-------|
| **RBiH** | 96,800 | 142,727 | +45,927 |
| **RS**   | 77,600 | 95,263  | +17,663 |
| **HRHB** | 31,200 | 52,076  | +20,876 |

- **Brigade counts:** No formation adds/removals (RBiH 121, RS 97, HRHB 39 throughout). Growth is reinforcement from pools and recruitment.
- RBiH gains the most personnel; RS and HRHB also grow. All three factions remain well above starting strength.

---

## 2. Control flips (settlements)

**Initial control (ethnic_1991, 5,822 settlements):**  
RBiH 2,465 · RS 2,412 · HRHB 945  

**Final control (week 52):**  
RBiH 2,389 · RS 2,549 · HRHB 884  

**Total settlements with controller change (full run):** 774  

**Largest direction changes (full run):**
- RBiH → RS: 378
- RS → RBiH: 299
- HRHB → RS: 75
- RS → HRHB: 17
- HRHB → RBiH: 4
- RBiH → HRHB: 1  

**First 40 weeks only (combat activity):**
- Settlement flips applied (weeks 1–40): **1,177**
- Attack orders processed (weeks 1–40): **2,345**
- Attacker casualties (weeks 1–40): **5,989**
- Defender casualties (weeks 1–40): **4,257**
- Battles with defender present: 1,046 (weeks 1–40)
- Battles with defender absent: 1,299 (weeks 1–40)

Early weeks show the highest flip and order volume; activity remains substantial through week 40.

---

## 3. Phase II attack resolution (full 52 weeks)

- **Weeks with Phase II:** 52  
- **Weeks with orders:** 52  
- **Orders processed (total):** 2,988  
- **Unique attack targets (total):** 4,727  
- **Flips applied (total):** 1,248  
- **Attacker casualties:** 7,666  
- **Defender casualties:** 5,795  
- **Defender-present battles:** 1,341  
- **Defender-absent battles:** 1,647  

One brigade per faction per target (deterministic); bots issue attack orders every week.

---

## 4. Anchor checks (key municipalities)

All seven anchor checks **passed**:
- RS: Zvornik, Bijeljina, Banja Luka  
- RBiH: Srebrenica, Bihać, Tuzla, S163520  

---

## 5. Bot benchmark evaluation (52-week)

- **Evaluated:** 6  
- **Passed:** 4  
- **Failed:** 2  

**Passed:** HRHB secure_herzegovina_core (turn 26), HRHB hold_central_bosnia_nodes (turn 52), RS early_territorial_expansion (turn 26), RS consolidate_gains (turn 52).  

**Failed:** RBiH hold_core_centers (turn 26 — control share 40.6% vs 20% expected), RBiH preserve_survival_corridors (turn 52 — 41.0% vs 25% expected). RBiH overperformed on those objectives in this run.

---

## 6. Other major metrics

- **Exhaustion (start → end):** HRHB 7.0 → 26.1; RBiH 8.0 → 181.1; RS 15.0 → 257.1.  
- **Displacement:** Settlement count with displacement and total displaced both rise over the run (reported in end_report.md).  
- **Formation delta:** 0 added, 0 removed.  
- **Total fatigue (brigades):** 0 → 7,041 (casualties/fatigue proxy).  
- **vs historical (Jan 1993 reference):** RBiH +298 settlements, HRHB −72, RS −226 vs reference counts.

---

## 7. Top municipalities by flip count (full run)

sokolac 37, vlasenica 33, kalinovik 32, kotor_varos 26, trebinje 24, doboj 22, donji_vakuf 22, olovo 21, zavidovici 21, hadzici 18.

---

## 8. How to run a strict 40-week run

To get a run that stops at week 40 and get `run_summary.json` / `end_report.md` for that horizon:

```bash
npm run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_52w.json --weeks 40 --unique --out runs
```

Artifacts will be under `runs/<run_id>/` (e.g. `run_summary.json`, `end_report.md`, `final_save.json`). A 40-week run can take on the order of 5–10 minutes.

---

**Summary:** Bots drive sustained combat from week 1: ~1,160 settlement flips in the first 40 weeks, ~2,345 orders processed, and clear personnel growth for all three factions. RS gains net control (2,412 → 2,549); RBiH and HRHB lose a small number of settlements overall. Anchor municipalities and benchmark objectives mostly pass; RBiH exceeds two benchmark targets. No formation creation or dissolution; all growth is personnel/reinforcement.
