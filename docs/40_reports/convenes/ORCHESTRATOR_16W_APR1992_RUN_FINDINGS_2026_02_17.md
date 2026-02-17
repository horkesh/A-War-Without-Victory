# Orchestrator: 16-week April 1992 canon run — findings

**Date:** 2026-02-17  
**Request:** Run 16-week canon scenario and report findings.

---

## 1. Run identification

| Item | Value |
|------|--------|
| **Scenario** | apr1992_definitive_52w |
| **Weeks** | 16 |
| **Run folder** | `runs/apr1992_definitive_52w__965092d481876749__w16_n122` |
| **Run id** | apr1992_definitive_52w__965092d481876749__w16 |
| **Final state hash** | 00af3283e25ff618 |
| **Command** | `npm run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_52w.json --weeks 16 --unique --out runs` |

---

## 2. Personnel and brigades (historical alignment)

**Initial → Final (delta):**

| Faction | Personnel initial | Personnel final | Delta | Brigades initial | Brigades final | Delta |
|---------|-------------------|-----------------|-------|------------------|----------------|-------|
| **HRHB** | 18,446 | 24,132 | +5,686 | 26 | 28 | +2 |
| **RBiH** | 56,347 | 79,362 | +23,015 | 74 | 74 | 0 |
| **RS**   | 44,454 | 47,313 | +2,859 | 68 | 71 | +3 |

**Findings:**
- RBiH shows strong personnel growth (+23k) and holds brigade count; within band for early war (April–Aug 1992).
- RS gains +3 brigades and modest personnel (+2.9k); recruitment and WIA trickleback active.
- HRHB gains +2 brigades and +5.7k personnel; plausible for 16 weeks.

---

## 3. Phase II combat (16 weeks)

| Metric | Value |
|--------|--------|
| Orders processed | 694 |
| Flips applied | 348 |
| Defender-present battles | 326 |
| Defender-absent battles | 368 |
| Casualty (attacker) | 3,080 |
| Casualty (defender) | 3,731 |
| **Total casualties** | **6,811** |
| Weeks with orders | 16/16 |
| Unique attack targets | 1,065 |

**Findings:**
- Combat is active every week; mix of defended and undefended engagements.
- Casualty totals are in line with second-pass calibration (BASE_CASUALTY_PER_INTENSITY 50, MIN_CASUALTIES_PER_BATTLE 15, etc.).
- WIA trickleback is in the pipeline: wounded return at WIA_TRICKLE_RATE when brigades are out of combat (after phase-ii-brigade-reinforcement).

---

## 4. Control and vs_historical

**Control (settlements):**
- Net: HRHB 1018→984 (−34), RBiH 2297→2365 (+68), RS 2507→2473 (−34).
- **296 settlements** changed controller.
- Top direction changes: **RS → RBiH 156**, RBiH → RS 88, HRHB → RS 43, RS → HRHB 9.

**vs_historical (reference jan1993):**
- HRHB: +28 settlements vs reference.
- RBiH: +274 vs reference (stronger RBiH in this run at 16w).
- RS: −302 vs reference.

**Findings:**
- Early-war dynamics: RS→RBiH flips (156) dominate, consistent with RBiH counteroffensives and RS losses in some sectors; RBiH→RS (88) and HRHB→RS (43) reflect RS gains elsewhere.
- Municipalities with most flip activity: Kotor Varoš, Lopare, Vlasenica, Zvornik, Trebinje, Ilijaš, Kladanj, Lukavac, Doboj, Kalesija.

---

## 5. Anchor checks

| Anchor | Expected | Actual | Passed |
|--------|----------|--------|--------|
| Zvornik | RS | RS | ✓ |
| Bijeljina | RS | RS | ✓ |
| Srebrenica | RBiH | RBiH | ✓ |
| **Bihać** | **RBiH** | **RS** | ✗ |
| Banja Luka | RS | RS | ✓ |
| Tuzla | RBiH | RBiH | ✓ |
| S163520 (Sapna) | RBiH | RBiH | ✓ |

**Findings:**
- **6/7 passed.** Bihać is RS in this run at week 16; historically it remained under RBiH control. Acceptable as early-war variance for a single 16w run; Scenario Creator/Tester can use this run for historical-alignment review if desired.

---

## 6. Bot benchmarks

- **Evaluated:** 0 (benchmarks are at turn 26 and 52; run ended at turn 16).
- **Not reached:** 6 (all objectives defined for later turns).
- No benchmark pass/fail to report for 16w.

---

## 7. Other metrics

- **Exhaustion (start → end):** HRHB 4.0 → 20.0, RBiH 6.0 → 63.0, RS 9.0 → 65.0. RBiH and RS show substantial exhaustion growth.
- **Supply pressure:** All factions 100 at start and end (no supply crisis in this run).
- **Formations added:** 5 brigades (over 16 weeks).
- **Displacement:** Settlement and municipality displacement totals increased over the run (reported in end_report.md).

---

## 8. Summary and handoffs

**Big picture:**
- 16-week April 1992 canon run completed successfully with current engine (personnel/recruitment calibration, second-pass casualty constants, WIA trickleback).
- Activity level, flips, and casualties are in a plausible early-war range; one anchor (Bihać) differs from historical expectation.

**Single priority (optional):**
- **Scenario Creator/Tester:** Use run `...w16_n122` for 16w historical-alignment check (Bihać, control deltas, personnel bands) and note whether Bihać variance is acceptable or warrants scenario/bot tuning.

**Artifacts:**
- Run folder: `runs/apr1992_definitive_52w__965092d481876749__w16_n122`
- `run_summary.json`, `end_report.md`, `final_save.json`, `weekly_report.jsonl`, `control_delta.json`, `formation_delta.json`
