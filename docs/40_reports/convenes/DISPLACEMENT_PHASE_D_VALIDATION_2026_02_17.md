# Phase D: Displacement Validation Run and Audit

**Date:** 2026-02-17  
**Purpose:** Validate both hostile-takeover displacement and minority flight in live simulation. Phase D was previously cancelled; this run completes it.  
**Run:** `apr1992_definitive_52w__0ec50da46aff9f15__w12_n149` (12 weeks, apr1992 definitive, smart bots)

---

## 1. Scope

Phase D validates the full displacement redesign:

1. **Hostile-takeover displacement** — 4-turn timer → camp → 4-turn hold → reroute (existing DISPLACEMENT_TAKEOVER_12W_AUDIT covered this).
2. **Minority flight** — Settlement-level non-takeover displacement (RBiH 50% gradual, HRHB/RS 100% immediate). Now aggregated in `run_summary.json` via `phase_ii_minority_flight` and `phase_ii_minority_flight_weekly`.

---

## 2. Run Evidence

### 2.1 Hostile-takeover displacement (run_summary.json)

| Metric | Total |
|--------|-------|
| timers_started | 157 |
| timers_matured | 62 |
| camps_created | 62 |
| camps_routed | 154 |
| displaced_total | 134,620 |
| killed_total | 13,438 |
| fled_abroad_total | 16,013 |
| routed_total | 105,169 |
| weeks_with_activity | 12 |

**Verification:** Timer → camp → reroute chain behaves as designed. Weeks 1–4 only start timers; first maturations at week 5; camp reroutes begin week 9.

### 2.2 Minority flight (run_summary.json)

| Metric | Total |
|--------|-------|
| weeks_with_activity | 7 |
| settlements_evaluated_total | 69,864 |
| settlements_displaced_total | 6,452 |
| displaced_total | 602,260 |
| killed_total | 58,400 |
| fled_abroad_total | 56,281 |
| routed_total | 486,373 |

**Weekly activity (minority flight):**

| Week | Turn | settlements_evaluated | settlements_displaced | displaced_total | routed_total |
|------|------|------------------------|------------------------|-----------------|--------------|
| 0 | 1 | 5,822 | 2,888 | 266,700 | 207,446 |
| 4 | 5 | 5,822 | 901 | 2,712 | 2,122 |
| 5 | 6 | 5,822 | 7 | 39 | 31 |
| 8 | 9 | 5,822 | 1,721 | 182,838 | 153,129 |
| 9 | 10 | 5,822 | 462 | 55,742 | 49,210 |
| 10 | 11 | 5,822 | 437 | 94,021 | 74,277 |
| 11 | 12 | 5,822 | 36 | 208 | 158 |

**Verification:** Minority flight runs every Phase II turn (5,822 settlements evaluated). Activity spikes align with control changes: week 0 (initial ethnic mix under hybrid_1992), weeks 8–11 (post-takeover control shifts). Skips settlements in municipalities with active takeover timer or camp (canon).

### 2.3 Phase II combat context

| Metric | Value |
|--------|-------|
| flips_applied | 342 |
| orders_processed | 545 |
| casualty_attacker | 2,160 |
| casualty_defender | 2,728 |

---

## 3. Implementation changes (this run)

- **run_summary aggregation:** Added `phase_ii_minority_flight` and `phase_ii_minority_flight_weekly` to scenario runner so minority flight is auditable alongside hostile-takeover.

---

## 4. Conclusions

1. **Hostile-takeover displacement** — Verified (timer → camp → reroute; 4-turn delays hold).
2. **Minority flight** — Verified; now reported in run_summary. Both paths run in parallel; minority flight skips muns in takeover/camp per canon.
3. **Determinism:** Run completed; `final_state_hash`: 836763a7d079fb3f.

---

## 5. Artifacts

- Run dir: `runs/apr1992_definitive_52w__0ec50da46aff9f15__w12_n149/`
- run_summary.json: `phase_ii_takeover_displacement`, `phase_ii_takeover_displacement_weekly`, `phase_ii_minority_flight`, `phase_ii_minority_flight_weekly`
- final_save.json: `hostile_takeover_timers`, `displacement_camp_state`, `displacement_state`, `minority_flight_state`
