# Bot run report: April 1992 scenario (16-week)

**Date:** 2026-02-16  
**Scenario:** apr1992_definitive_52w (canon)  
**Run id:** apr1992_definitive_52w__965092d481876749__w16  
**Artifacts:** `runs/apr1992_definitive_52w__965092d481876749__w16_n107/` (run_summary.json, end_report.md)

---

## 1. Troop strengths (personnel)

| Faction | Initial (week 0) | Final (week 16) | Delta |
|--------|-------------------|------------------|-------|
| **RBiH** | 52,942 | 69,485 | +16,543 |
| **RS**   | 36,459 | 36,494 | +35   |
| **HRHB** | 16,725 | 19,856 | +3,131 |

- **Brigade counts:** 1 added formation (HRHB `hrhb_kralj_tomislav_brigade`), none removed; final brigades RBiH 70, RS 62, HRHB 25.
- RBiH gains the most personnel; HRHB gains moderately with one new brigade; RS remains nearly flat (attrition offset by reinforcement).

---

## 2. Control (settlements)

**Initial (hybrid_1992, 5,822 settlements):**  
RBiH 2,297 · RS 2,507 · HRHB 1,018  

**Final (week 16):**  
RBiH 2,411 · RS 2,413 · HRHB 998  

**Total settlements with controller change:** 276  

**Largest direction changes:**
- RS → RBiH: 166
- RBiH → RS: 65
- HRHB → RS: 26
- RS → HRHB: 7  

**Top municipalities by flip count:** Lopare (23), Lukavac (14), Doboj (13), Ilijaš (13), Gračanica (11), Konjic (11), Prijedor (11), Kladanj (10), Ključ (9), Banja Luka (8).

---

## 3. Phase II attack resolution (16 weeks)

- **Weeks with Phase II:** 16  
- **Weeks with orders:** 16  
- **Orders processed:** 622  
- **Unique attack targets:** 934  
- **Flips applied:** 326  
- **Attacker casualties:** 1,511  
- **Defender casualties:** 967  
- **Defender-present battles:** 267  
- **Defender-absent battles:** 355  

Combat is heaviest in weeks 1–5 (56–40 flips/week, 72–44 orders/week), then tapers; weeks 12–16 show 7–12 flips/week. One brigade per faction per target (deterministic).

---

## 4. Anchor checks

All seven anchor checks **passed**:  
RS: Zvornik, Bijeljina, Banja Luka · RBiH: Srebrenica, Bihać, Tuzla, S163520 (Sapna).

---

## 5. Bot benchmarks

Run length is 16 weeks; AI_STRATEGY_SPECIFICATION benchmarks are at turns 26 and 52. **All 6 benchmarks:** status *not_reached* (turn outside run). No pass/fail evaluation for this horizon.

---

## 6. Other metrics and tuning checks

- **Exhaustion (start → end):** HRHB 4.0 → 10.0; RBiH 6.0 → 60.0; RS 9.0 → 68.0.  
- **Displacement:** Settlement count 3,785 → 3,838; total displaced 75.8 → 1,130.0.  
- **Formation delta:** 1 added, 0 removed (`hrhb_kralj_tomislav_brigade`).  
- **Total fatigue (brigades):** 0 → 1,486.  
- **vs historical (Jan 1993 reference):** RBiH +320, HRHB +42, RS −362 settlements vs reference.  
- **Prijedor check (requested):** remains RS-majority at week 16 (RS 47, RBiH 18, HRHB 6 settlements).
- **Recruitment check (requested):** ongoing recruitment now occurs before reinforcement and retries mandatory brigades; this run recruits 1 HRHB brigade, RS still recruits none because RS municipal pool headroom never reaches `MIN_MANDATORY_SPAWN` (max available per RS mun = 60 in final state).

---

## 7. Findings summary

- **Bots are active and deterministic:** Orders every week, 622 orders over 16 weeks, 326 flips, 2,478 total casualties (attacker + defender).  
- **RBiH gains ground and personnel:** Net +114 settlements and +16.5k personnel; RS loses 94 settlements and is nearly flat in personnel.  
- **Early-war intensity:** Most flips and orders occur in the first ~5 weeks, consistent with early 1992 pressure and consolidation.  
- **Anchor municipalities hold:** All seven historical anchor checks pass.  
- **Recruitment behavior improved but asymmetric:** At least one bot brigade recruitment now occurs (HRHB). RS still fails to recruit because manpower is fragmented across municipalities below mandatory spawn threshold.  
- **Benchmarks:** Not evaluated (16-week run; benchmarks defined at 26 and 52 weeks).

---

**How to reproduce:**  
`npm run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_52w.json --weeks 16 --unique --out runs`

**How to inspect in the tactical map (web viewer):**
1. Start the map dev server: `npm run dev:map` (serves at http://localhost:3002, or next free port if 3002 is in use).
2. Open the Layers panel (☰ Layers), then either:
   - **By URL:** Open (use **two** underscores in the run id: `52w__` and `__w16`)  
     `http://localhost:3002/?run=apr1992_definitive_52w__965092d481876749__w16_n107`  
     Or explicitly: `http://localhost:3002/tactical_map.html?run=apr1992_definitive_52w__965092d481876749__w16_n107`  
     to load this run’s final state automatically, or
   - **By form:** In “Run folder”, enter `apr1992_definitive_52w__965092d481876749__w16_n107` and click **Load run**.
3. The map shows final control, formations, front lines, and brigade AoR; use OOB and Summary to inspect forces and battles.
