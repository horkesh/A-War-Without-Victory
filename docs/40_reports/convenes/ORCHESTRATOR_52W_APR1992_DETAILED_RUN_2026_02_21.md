# 52-Week apr1992 Run — Detailed Report

**Date:** 2026-02-21  
**Scenario:** apr1992_definitive_52w  
**Run id:** apr1992_definitive_52w__102fea508092873d__w52_n45  
**Run folder:** `runs/apr1992_definitive_52w__102fea508092873d__w52_n45`  
**Final state hash:** 798741a42ffd136a

---

## 1. Consolidation mechanic

### What the mechanic is

- **Phase II consolidation flips** (turn pipeline step `phase-ii-consolidation-flips`): Brigades in **consolidation** posture, in municipalities with **no enemy brigade**, can flip civilian/undefended settlements up to **3 per brigade per turn** (Option B cap). Implemented in `src/sim/phase_ii/consolidation_flips.ts`; deterministic (sorted formation IDs, sorted settlement IDs).
- **Bot use:** Bots assign **consolidation** posture on “soft” fronts (no enemy brigade) and use **consolidation scoring** (rear cleanup, isolated clusters, fast-cleanup muns) in target selection (`consolidation_scoring.ts`, `bot_brigade_ai.ts`).
- **RS bot benchmark:** The RS strategy has a **consolidate_gains** objective (turn 52, expected control share 0.5, tolerance 0.15). In this run it **passed**.

### What the run artifacts show

- **run_summary.json** does **not** currently include an aggregate for Phase II consolidation flips (e.g. total flips from consolidation, or per-week consolidation flips). The turn pipeline writes `phase_ii_consolidation_flips` into the per-turn report only when `flips_applied > 0`; the scenario runner does not aggregate that into run_summary.
- So: the **mechanic ran** (step is in the pipeline and bots use consolidation posture/scoring), and the **RS “consolidate gains” benchmark passed**, but we **cannot** report “X control flips from consolidation” from existing artifacts. Adding consolidation-flip aggregation to run_summary would be a harness/reporting enhancement.

---

## 2. Displacement

Yes. Displacement is fully active and reported in two streams.

### Takeover displacement (control flip → timers → camps → routing)

| Metric | Value |
|--------|--------|
| Timers started | 25 |
| Timers matured | 16 |
| Camps created | 10 |
| Camps routed (populations moved on) | 207 |
| **Displaced (takeover)** | **218,355** |
| Routed (takeover) | 175,010 |
| Fled abroad (takeover) | 21,516 |
| Killed (takeover) | 21,829 |
| Weeks with activity | 37 |
| Weeks with Phase II | 52 |

Notable source municipalities (from weekly breakdown): bijeljina, zavidovici, banovici, bugojno, konjic, lukavac, stari_grad_sarajevo, zvornik, ilidza, centar_sarajevo, hadzici, novo_sarajevo, novi_grad_sarajevo, visoko, vogosca, vlasenica.

### Minority flight (ethnic minority in controlled settlement)

| Metric | Value |
|--------|--------|
| **Displaced (minority flight)** | **357,186** |
| Routed (minority flight) | 289,260 |
| **Killed** | **33,851** |
| **Fled abroad** | **32,015** |
| Settlements displaced (total) | 6,724 |
| Settlements evaluated (total) | 285,278 |
| Weeks with activity | 25 |

Largest minority-flight wave was in turn 4 (week_index 3): 334,036 displaced, 27,404 fled abroad, 31,954 killed, 2,706 routed, 3,663 settlements displaced (from 5,822 evaluated that week).

### Combined displacement summary

- **Total displaced (both streams):** 218,355 (takeover) + 357,186 (minority flight) = **575,541** (note: some double-count possible if a population is first displaced by takeover and later by minority flight).
- **Civilian casualties (by faction, from run_summary):** HRHB 4,576 killed, 11,050 fled abroad; RBiH 34,416 killed, 0 fled abroad; RS 16,688 killed, 42,481 fled abroad.

---

## 3. Troop numbers (sides)

From **run_summary.json** → `historical_alignment` (initial vs final).

### Brigades

| Faction | Initial (active / total) | Final (active / total) | Delta |
|---------|---------------------------|-------------------------|-------|
| HRHB | 25 / 25 | 28 / 28 | +3 |
| RBiH | 81 / 81 | 81 / 81 | 0 |
| RS | 66 / 66 | 67 / 67 | +1 |
| **Total** | **172** | **176** | **+4** |

### Personnel

| Faction | Initial | Final | Delta |
|---------|--------:|------:|------:|
| HRHB | 17,646 | 23,355 | +5,709 |
| RBiH | 61,233 | 100,675 | +39,442 |
| RS | 43,835 | 56,857 | +13,022 |
| **Total** | **122,714** | **180,887** | **+58,173** |

### Recruitment capital (end-of-run)

| Faction | Initial | Final | Delta |
|---------|--------:|------:|------:|
| HRHB | 300 | 503 | +203 |
| RBiH | 400 | 857 | +457 |
| RS | 600 | 984 | +384 |

### Phase II combat (attack resolution)

- **Orders processed:** 82 (HRHB 1, RBiH 8, RS 73).
- **Settlement flips applied:** 73.
- **Casualties:** 424 attacker, 438 defender.
- **Defender-present battles:** 0; **defender-absent battles:** 82.
- **Weeks with orders:** 35 (weeks 36–52 had zero attack orders).

---

## 4. Theatres and front structure

From **final_save.json** for this run:

### Theatres created: **3** (one per faction)

| Theatre id | Faction | Name | Army IDs |
|------------|---------|------|----------|
| HRHB_default | HRHB | HRHB Theatre | hvo_main_staff |
| RBiH_default | RBiH | RBiH Theatre | arbih_general_staff |
| RS_default | RS | RS Theatre | vrs_main_staff |

These are the default theatres created by the front/theatre system (one theatre per faction, linked to that faction’s army HQ).

### Assignable front segments: **111**

- **assignable_front_segments** in final_save: **111** segments (contiguous hostile-boundary segments used for brigade front assignment and reserve rule).

### Corps and front edges

- **front_corps_tracking** (run_summary): **corps_count 9**, **corps_front_edges_present true**.
- So: 9 corps had derived front edges; headless pipeline step `ensure-derived-corps-front-edges` populated `corps_front_edges` for the run.

---

## 5. Control and anchors (recap)

- **Net control (start → end):** HRHB 1,018 → 1,014; RBiH 2,297 → 2,256; RS 2,507 → 2,552. **109** settlements with controller change.
- **Historical anchors:** 6/8 passed. Failed: **centar_sarajevo** (expected RBiH, actual RS), **S163520/Sapna** (expected RBiH, actual RS).
- **vs jan1993 reference:** HRHB +58, RBiH +165, RS −223 settlements (final vs reference).

---

## 6. Artifacts

- **Run directory:** `runs/apr1992_definitive_52w__102fea508092873d__w52_n45/`
- **Files:** run_summary.json, end_report.md, final_save.json, control_delta.json, formation_delta.json, activity_summary.json, control_events.jsonl
- **Latest run copy:** `data/derived/latest_run_final_save.json` (when run with `--map`)

---

## 7. Summary table

| Topic | Answer |
|-------|--------|
| **Consolidation mechanic** | In pipeline and used by bots; RS “consolidate_gains” benchmark passed. No aggregate consolidation-flip count in run_summary (harness does not collect it yet). |
| **Displacement** | Yes: 218,355 (takeover) + 357,186 (minority flight); 10 camps created, 207 routed; 33,851 + 21,829 killed (minority + takeover); 32,015 + 21,516 fled abroad. |
| **Troop numbers (final)** | HRHB 28 bdes / 23,355 pers; RBiH 81 bdes / 100,675 pers; RS 67 bdes / 56,857 pers. +4 brigades, +58,173 personnel. |
| **Theatres created** | **3** (HRHB_default, RBiH_default, RS_default). **111** assignable front segments; **9** corps with front edges. |
