# Hostile-Takeover Displacement: 12-Week Scenario Audit

**Date:** 2026-02-17  
**Purpose:** Verify the hostile-takeover displacement redesign (timer → camp → reroute) in live simulation output.  
**Run:** `apr1992_definitive_52w__0ec50da46aff9f15__w12_n135` (12 weeks, apr1992 definitive, smart bots)

---

## 1. Implementation Summary

The displacement redesign adds:
- **4-turn takeover timer** for at-war hostile flips (RBiH↔HRHB excluded before war turn)
- **Camp phase**: displaced hostile share moves to displacement camp
- **4-turn camp phase** before reroute
- **Reroute**: population routed to motherland/urban centers; militia pools updated via `displaced_in_by_faction`
- **Enclave overrun**: higher kill fraction (0.35) for Srebrenica/Goražde/Žepa

---

## 2. Run Evidence

### 2.1 Phase II Takeover Displacement (run_summary.json)

| Metric | Total |
|--------|-------|
| timers_started | 144 |
| timers_matured | 70 |
| camps_created | 70 |
| camps_routed | 47 |
| displaced_total | 66,484 |
| killed_total | 6,616 |
| fled_abroad_total | 11,914 |
| routed_total | 47,954 |
| weeks_with_activity | 12 |
| weeks_with_phase_ii | 12 |

### 2.2 Weekly Flow (timer → camp → reroute)

| Week | Turn | timers_started | timers_matured | camps_created | camps_routed | displaced_total | routed_total |
|------|------|----------------|----------------|---------------|--------------|-----------------|--------------|
| 0 | 1 | 49 | 0 | 0 | 0 | 0 | 0 |
| 1 | 2 | 12 | 0 | 0 | 0 | 0 | 0 |
| 2 | 3 | 13 | 0 | 0 | 0 | 0 | 0 |
| 3 | 4 | 7 | 0 | 0 | 0 | 0 | 0 |
| 4 | 5 | 7 | **32** | **32** | 0 | 25,718 | 18,739 |
| 5 | 6 | 18 | 6 | 6 | 0 | 8,748 | 7,110 |
| 6 | 7 | 9 | 8 | 8 | 0 | 8,273 | 5,562 |
| 7 | 8 | 5 | 1 | 1 | 0 | 558 | 353 |
| 8 | 9 | 7 | 2 | 2 | **32** | 4,096 | 3,033 |
| 9 | 10 | 8 | 12 | 12 | 6 | 14,017 | 9,638 |
| 10 | 11 | 4 | 5 | 5 | 8 | 3,864 | 2,441 |
| 11 | 12 | 5 | 4 | 4 | 1 | 1,210 | 1,078 |

**Verification:**
- **Weeks 1–4:** Only timers started; no maturations (4-turn delay holds).
- **Week 5 (turn 5):** First batch (32) timers mature → 32 camps created, 25,718 displaced, 18,739 routed to urban centers.
- **Week 9 (turn 9):** First camp reroutes (32 camps from week 5 mature after 4 more turns).
- **Ongoing:** New timers, maturations, camps, and reroutes continue in parallel.

### 2.3 Source Municipalities (sample)

Week 5 source_municipalities (32 muns): banja_luka, banovici, bijeljina, bosanski_novi, bosanski_petrovac, celinac, foca, gracanica, hadzici, ilijas, kakanj, kalesija, kljuc, laktasi, maglaj, novi_grad_sarajevo, prijedor, prnjavor, sanski_most, sipovo, srbac, srebrenik, travnik, trebinje, tuzla, vares, visoko, zepce, zivinice, etc.

### 2.4 State Artifacts (final_save.json)

- `hostile_takeover_timers`: present; ongoing timers (e.g. doboj RBiH→RS).
- `displacement_camp_state`: present; camps by municipality and faction.
- `displacement_state`: present; `displaced_in` and routing totals by mun (e.g. banja_luka displaced_in: 14,983).

---

## 3. Conclusions

1. **Timer → camp → reroute chain** behaves as designed: 4-turn takeover delay, camp creation, 4-turn camp delay, then reroute.
2. **run_summary aggregation** includes `phase_ii_takeover_displacement` and `phase_ii_takeover_displacement_weekly`; scenario harness emits these when Phase II ran.
3. **Determinism:** Run completed with no nondeterminism indicators; `final_state_hash`: 35313ea22146dc78.

---

## 4. Artifacts

- Run dir: `runs/apr1992_definitive_52w__0ec50da46aff9f15__w12_n135/`
- run_summary.json: `phase_ii_takeover_displacement`, `phase_ii_takeover_displacement_weekly`
- final_save.json: `hostile_takeover_timers`, `displacement_camp_state`, `displacement_state`
