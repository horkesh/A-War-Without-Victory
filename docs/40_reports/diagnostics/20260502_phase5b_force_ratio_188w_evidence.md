# Phase 5b Evidence Packet — `estimateForceRatio` Defender-Modifier Integration MEGA-LANE (188w)

**Author:** scenario-harness-engineer (raw evidence collection only — NO analysis)
**Date:** 2026-05-02
**Scope:** 188w scenario validation post Phase 5a AAR `force_ratio_estimate` carryover (commit `cb7562a3`)
**Run produced:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1608`
**Final state hash:** `75da76dbe69ccf24`
**Predecessor 188w baseline:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1605` (hash `488d2c6917e48fcb`)

---

## 1. Preflight

| Check | Result |
|---|---|
| `git log --oneline -1` HEAD | `cb7562a3 feat(operations): persist force_ratio_estimate on AAR finalize (LANE-2026-05-02 Phase 5a)` |
| Run folder exists | yes — 11 files including `final_save.json` (31.5 MB), `operation_aars.json` (403 KB), `run_summary.json` (579 KB) |
| Run folder timestamp | 2026-05-02 01:31 (start) → 01:42 (final_save written) |
| `run_meta.json` git ref recorded | NO — only scenario path/id/weeks |
| `git status --short` | `M .claude/scheduled_tasks.lock`, `M data/derived/latest_run_final_save.json`, untracked `_phase5*.txt` from prior phases, `?? dist-packaged/`, `?? docs/40_reports/diagnostics/20260502_phase5_force_ratio_n1607_evidence.md` |

Run was on HEAD `cb7562a3` per dispatch context (Phase 5a in-lane carryover lands the AAR field exposed in this evidence).

---

## 2. Run identity

| Field | Value |
|---|---|
| Run folder | `runs/apr1992_definitive_188w__210e69404d054959__w188_n1608` |
| Run-id counter | n1608 |
| Scenario fingerprint (input hash) | `210e69404d054959` (matches n1605 → identical inputs) |
| Weeks | 188 |
| `final_state_hash` | `75da76dbe69ccf24` |
| Files emitted | `initial_save.json`, `final_save.json`, `weekly_report.jsonl`, `run_summary.json`, `control_delta.json`, `end_report.md`, `activity_summary.json`, `formation_delta.json`, `operation_aars.json`, `destroyed_brigades.json`, `run_meta.json` |

---

## 3. Audit summary table

| Audit | Output file | Exit | One-line summary |
|---|---|---:|---|
| `tools/compare_painted_vs_sim.cjs` | `_phase5b_compare.txt` | 0 | OVERALL Match 586/712 (82.3%); area-weighted RS=50.4% / RBiH=38.3% / HRHB=11.3% (vs painted RS=65.1% / RBiH=23.5% / HRHB=11.3%) |
| `tools/diagnose_run.cjs` | `_phase5b_diagnose.txt` | 0 | RESULT: WARN — Errors 0, Warnings 35 (drift + 1 stranded foca:RBiH 273-pool) |
| `tools/diagnostics/operation_delivery_audit.cjs` | `_phase5b_delivery.txt` | 0 | 46 ops; per-axis failure mix UNDERDELIV 13 / NO-CONTACT-OTHER 26 / NO-CONTACT-PATH 7 / DELIV 10 / PRE-FRIENDLY 5 |
| `tools/diagnostics/opportunity_health_audit.cjs` | `_phase5b_opp_health.txt` | 0 | 4 decisions / 4 completed / 2 successes (APWB/Tigar grade=5; Grmeč 94 grade=2; Sana 95 grade=3); 0 broken AAR / 0 dupes |
| `tools/validate_run_consistency.cjs` | `_phase5b_validate.txt` | 1 | RESULT: FAIL — 18 failures: 9 HRHB war-front faction-side missing from sector layer + 1 empty contested sector vrs_herzegovina:1 + 8 misc (pre-existing pattern; identical to n1605 baseline) |

Baseline counterparts written to `_phase5b_*_n1605.txt`.

**Diff against n1605 baseline:**
- `compare`: 1 line differs (run-folder name only). All match counts/area %/region breakdowns byte-identical.
- `diagnose`: 1 line differs (run-folder name only). All warning counts/messages byte-identical.
- `delivery`: differs ONLY in (a) folder name + hash header (b) the `recovery_reason` column (`n/a` in n1605, real values in n1608). This is an observability artifact from the predecessor LANE B `recovery_reason` carryover (commit `dd083454`) — n1605 was generated BEFORE that field was carried, n1608 generated AFTER. Op count, outcome, total_attacks, objectives_captured, delivery-mode all byte-identical.
- `opp_health`: 2 lines differ (folder name + hash). All 4 decision rows byte-identical (APWB, Tigar, Grmeč 94, Sana 95).
- `validate`: 1 line differs (folder name only). 18 failures byte-identical (same sector segments, same shortfalls, same stranded pool).

---

## 4. Anchor + benchmark deltas vs n1605

### Anchor checks

| | n1605 | n1608 | Δ |
|---|---:|---:|---:|
| Total anchors | 27 | 27 | 0 |
| Passed | 23 | 23 | 0 |
| Failed | 4 | 4 | 0 |

Identical 4 failures both runs:
1. `op:brcko:brcko` — expected RS, actual RBiH
2. `op:zavidovici:vozuca_2` — expected RS, actual RBiH
3. `op:gracanica:petrovo_2` — expected RS, actual RBiH
4. `op:lukavac:brijesnica_donja_2` — expected RS, actual RBiH

### Bot benchmark evaluation (from `run_summary.json.bot_benchmark_evaluation`)

| Faction | Objective | Turn | n1605 share | n1608 share | Tolerance | Pass |
|---|---|---:|---:|---:|---:|---|
| HRHB | secure_herzegovina_core | 20 | 0.123596 | 0.123596 | 0.05 | both PASS |
| RBiH | hold_core_centers | 20 | 0.376404 | 0.376404 | 0.08 | both PASS |
| RS | early_territorial_expansion | 20 | 0.500000 | 0.500000 | 0.08 | both PASS |
| HRHB | hold_central_bosnia_nodes | 40 | 0.110955 | 0.110955 | 0.04 | both PASS |
| RBiH | preserve_survival_corridors | 40 | 0.383427 | 0.383427 | 0.05 | both FAIL (dev +0.054) |
| RS | consolidate_gains | 40 | 0.505618 | 0.505618 | 0.05 | both PASS |

n1605: 5/6 PASS. n1608: 5/6 PASS. Numerically identical to 6 decimals.

### Area-weighted control (from `compare_painted_vs_sim.cjs`)

| Metric | n1605 | n1608 | Δ |
|---|---|---|---|
| Overall match | 586/712 (82.3%) | 586/712 (82.3%) | 0 |
| Area-weighted match (km²) | 40787 / 51337 (79.4%) | 40787 / 51337 (79.4%) | 0 |
| Sim RS area | 25888 km² (50.4%) | 25888 km² (50.4%) | 0 |
| Sim RBiH area | 19647 km² (38.3%) | 19647 km² (38.3%) | 0 |
| Sim HRHB area | 5802 km² (11.3%) | 5802 km² (11.3%) | 0 |
| (painted target) RS | 33441 km² (65.1%) | — | — |
| (painted target) RBiH | 12088 km² (23.5%) | — | — |
| (painted target) HRHB | 5808 km² (11.3%) | — | — |

### Per-region area % (from `compare_painted_vs_sim.cjs`)

| Region | n1605 | n1608 |
|---|---|---|
| KRAJINA | 99.6% | 99.6% |
| POSAVINA_NE | 85.7% | 85.7% |
| DRINA | 69.5% | 69.5% |
| CENTRAL_CORRIDOR | 87.4% | 87.4% |
| CENTRAL_BOSNIA | (per file tail) | (per file tail) |
| SARAJEVO | (per file tail) | (per file tail) |
| HERZEGOVINA | (per file tail) | (per file tail) |

### ZEA-rate (from `run_summary.json.behavioral_health.combat_causality`)

| Metric | n1605 | n1608 | Δ |
|---|---|---:|---|
| `zero_eligible_attacker_operation_count` | 3 | 3 | 0 |
| `total_attack_orders` | 460 | 460 | 0 |
| `total_battles` | 270 | 270 | 0 |
| `total_objective_attempts` | 381 | 381 | 0 |
| `total_objective_captures` | 61 | 61 | 0 |
| `total_orders_by_faction.HRHB` | 22 | 22 | 0 |
| `total_orders_by_faction.RBiH` | 336 | 336 | 0 |
| `total_orders_by_faction.RS` | 102 | 102 | 0 |
| `invalid_operation_count` | 19 | 19 | 0 |
| `valid_for_combat_calibration` | false | false | unchanged |

### Combat / casualty totals (from `run_summary.json.attack_resolution`)

| Metric | n1605 | n1608 | Δ |
|---|---|---|---|
| `casualty_attacker` | 54467 | 54467 | 0 |
| `casualty_defender` | 78049 | 78049 | 0 |
| `defender_absent_battles` | 73 | 73 | 0 |
| `defender_present_battles` | 197 | 197 | 0 |
| `flips_applied` | 81 | 81 | 0 |
| `unique_attack_targets` | 298 | 298 | 0 |
| `weeks_with_orders` | 112 | 112 | 0 |
| `weeks_at_war` | 188 | 188 | 0 |
| `orders_processed` | 340 | 340 | 0 |

---

## 5. Force-ratio sample table (THE KEY EVIDENCE)

### 5.1 Field-presence preflight

- n1605 AARs: 46 / 46 lack `force_ratio_estimate` (predates Phase 5a carryover)
- n1605 AARs: 46 / 46 also lack `recovery_reason` (predates predecessor LANE B carryover)
- n1608 AARs: 45 / 46 carry `force_ratio_estimate` (1 missing: hvo_main_staff Operation Mistral 2 — see row 44)
- n1608 AARs: 46 / 46 carry `recovery_reason`

### 5.2 Full force-ratio table (n1608 AARs)

War-or-game expected ranges (per dispatch + working-on.md):

- **HONEST/should-be-low:**
  - ARBiH 5th Corps Grmeč 94 (`grmec_ridge_breakout`): 0.30–0.60
  - ARBiH 5th Corps Sana 95 axes A/B (`sana_*`): 0.50–0.90
  - VRS-as-attacker on Bihać 1994-95 (objectives in `op:bihac:*`): 0.80–1.40 (no green light)
  - ARBiH Sana 95 final phase post-Storm: 2.0–3.5 (green light)
- **GREEN/should-be-high:**
  - VRS Operation Corridor 92 (Posavina): 5.0–10.0
  - VRS Eastern Bosnia April 92 (Bijeljina/Zvornik/Foča/Višegrad): 8.0–20.0
  - VRS Drina/Srebrenica July 95: 3.0–5.0
  - ARBiH Bosna 95 / Vlašić heights: 3.0–4.0
  - HVO Operation Jackal: gap-finder confirmed sim's `Op Jackal` is 1993-period — near-parity expected, not 3.0–6.0 dominance.

| # | Op | Corps | Faction | Outcome | force_ratio_estimate | Started | Recovery | Class | War-or-game range | In range? |
|---:|---|---|---|---|---:|---:|---|---|---|---|
| 1 | Operation Herzegovina (t0) | jna_herzegovina_command | RS (JNA) | failure | 1.0000 | 0 | planning_invalidated | sentinel-flip-1 | (Eastern-Bosnia 8–20 if applicable) | NO |
| 2 | Operation Visegrad (t0) | vrs_herzegovina | RS | failure | 1.0000 | 0 | planning_invalidated | sentinel-flip-1 | Eastern-Bosnia 8–20 | NO |
| 3 | Operation Prijedor (t0) | vrs_1st_krajina | RS | success | 1.0000 | 0 | completed | sentinel-flip-1 | (Krajina early-92, BB-eq) | NO |
| 4 | Operation Drina (t0) | vrs_drina | RS | success | 1.0000 | 0 | completed | sentinel-flip-1 | Eastern-Bosnia 8–20 | NO |
| 5 | **Operation Prsten (t0)** | vrs_sarajevo_romanija | RS | partial | **7.2596** | 0 | max_failures | high | (n1607 also showed Prsten anomaly; sector-expert proved STALE-launch-tick) | n/a |
| 6 | **Operation Koridor (t0)** | vrs_east_bosnian | RS | partial | **6.8144** | 0 | max_failures | high | **5.0–10.0 ✓** | **YES** |
| 7 | **Operation Jackal (t8)** | hvo_southeast_herzegovina | HRHB | failure | **6.2294** | 8 | political_blocked | high | gap-finder note (sim is 1993-Jackal not 1992) | n/a |
| 8 | Operation Foca (t5) | vrs_herzegovina | RS | failure | 3.0966 | 5 | max_failures | mid | Eastern-Bosnia 8–20 | NO (below) |
| 9 | Operacija Topola (t10) | vrs_2nd_krajina | RS | success | 3.0000 | 10 | completed | sentinel-flip-3 | n/a | n/a |
| 10 | **Operation Podrinje Sweep (t6)** | vrs_drina | RS | failure | **11.2311** | 6 | max_failures | high | n/a | n/a |
| 11 | Operation Jajce (t7) | vrs_1st_krajina | RS | partial | 4.3425 | 7 | max_failures | mid | n/a | n/a |
| 12 | Operation Herzegovina Consolidation (t14) | vrs_herzegovina | RS | failure | 0.1592 | 14 | max_failures | low | n/a | n/a |
| 13 | Operacija Sadejstvo (t29) | vrs_1st_krajina | RS | failure | 0.5428 | 29 | planning_invalidated | low | n/a | n/a |
| 14 | Operacija Hajka (t31) | arbih_3rd_corps | RBiH | failure | 0.2650 | 31 | brigade_attrition | low | n/a | n/a |
| 15 | Operacija Tvrđava (t39) | vrs_1st_krajina | RS | failure | 0.0712 | 39 | planning_invalidated | low | n/a | n/a |
| 16 | Operation Cerska-Kamenica (t40) | vrs_drina | RS | failure | 1.0000 | 40 | planning_invalidated | sentinel-flip-1 | n/a | n/a |
| 17 | Operacija Osvit (t40) | arbih_1st_corps | RBiH | failure | 0.7268 | 40 | max_failures | low | n/a | n/a |
| 18 | Operacija Sjena (t54) | arbih_1st_corps | RBiH | failure | 3.0000 | 54 | brigade_attrition | sentinel-flip-3 | n/a | n/a |
| 19 | Operacija Ponos (t64) | arbih_1st_corps | RBiH | failure | 3.0000 | 64 | no_logged_attempt | sentinel-flip-3 | n/a | n/a |
| 20 | Operacija Lukavac (t64) | vrs_1st_krajina | RS | failure | 0.0967 | 64 | planning_invalidated | low | n/a | n/a |
| 21 | Operacija Naprijed (t67) | arbih_4th_corps | RBiH | partial | 2.6133 | 67 | max_failures | mid | n/a | n/a |
| 22 | Operacija Javor (t70) | vrs_1st_krajina | RS | failure | 0.1855 | 70 | planning_invalidated | low | n/a | n/a |
| 23 | Operacija Nada (t72) | arbih_2nd_corps | RBiH | success | 4.2062 | 72 | completed | mid | n/a | n/a |
| 24 | Operacija Farz (t76) | arbih_2nd_corps | RBiH | success | 14.1039 | 76 | completed | high | n/a | n/a |
| 25 | Operacija Grab (t82) | vrs_1st_krajina | RS | failure | 0.0427 | 82 | planning_invalidated | low | n/a | n/a |
| 26 | **Operacija Pravda (t86)** | arbih_4th_corps | RBiH | success | **47.4677** | 86 | completed | high | n/a | n/a |
| 27 | Operacija Stjena (t87) | vrs_1st_krajina | RS | failure | 0.1155 | 87 | planning_invalidated | low | n/a | n/a |
| 28 | Operacija Zora (t97) | arbih_4th_corps | RBiH | failure | 3.0000 | 97 | no_logged_attempt | sentinel-flip-3 | n/a | n/a |
| 29 | Operacija Prodor (t100) | vrs_1st_krajina | RS | failure | 0.3932 | 100 | no_logged_attempt | low | n/a | n/a |
| 30 | Operacija Zvijezda (t111) | vrs_1st_krajina | RS | failure | 0.4030 | 111 | planning_invalidated | low | n/a | n/a |
| 31 | **Operation Tigar-Sloboda (t113)** | arbih_5th_corps | RBiH | success | **3.0000** | 113 | completed | sentinel-flip-3 | n/a | n/a |
| 32 | **Operation APWB Pressure (t113)** | arbih_5th_corps | RBiH | success | **3.0000** | 113 | completed | sentinel-flip-3 | n/a | n/a |
| 33 | Operacija Bor (t118) | vrs_1st_krajina | RS | failure | 0.0897 | 118 | planning_invalidated | low | n/a | n/a |
| 34 | Operacija Plamen (t123) | vrs_1st_krajina | RS | failure | 0.3088 | 123 | planning_invalidated | low | n/a | n/a |
| 35 | **Operation Grmeč 94 (t133)** | arbih_5th_corps | RBiH | failure | **1.1033** | 133 | max_failures | low-mid | **0.30–0.60 (lane primary target)** | **NO (above range; was ~5.748 pre-fix per Phase 4 synthetic)** |
| 36 | Operacija Čelik (t137) | vrs_1st_krajina | RS | failure | 0.0541 | 137 | planning_invalidated | low | n/a | n/a |
| 37 | Operacija Zaslon (t141) | vrs_1st_krajina | RS | failure | 0.0651 | 141 | planning_invalidated | low | n/a | n/a |
| 38 | Operacija Bedem (t146) | vrs_1st_krajina | RS | failure | 0.0666 | 146 | planning_invalidated | low | n/a | n/a |
| 39 | Operacija Vrbas (t156) | vrs_1st_krajina | RS | failure | 0.0745 | 156 | planning_invalidated | low | n/a | n/a |
| 40 | Operacija Jesen (t161) | vrs_1st_krajina | RS | failure | 0.0793 | 161 | planning_invalidated | low | n/a | n/a |
| 41 | **Operation Krivaja-95 (t168)** | vrs_drina | RS | failure | **0.0838** | 168 | planning_invalidated | low | **3.0–5.0 (Srebrenica July 95 GREEN spec)** | **NO (below — 36× under spec)** |
| 42 | Operacija Kamen (t172) | vrs_1st_krajina | RS | failure | 0.0279 | 172 | planning_invalidated | low | n/a | n/a |
| 43 | **Operation Stupčanica-95 (t172)** | vrs_drina | RS | failure | **0.0475** | 172 | planning_invalidated | low | (Žepa pocket July 95) | n/a |
| 44 | Operation Mistral 2 (t175) | hvo_main_staff | HRHB | failure | **(undef)** | 175 | brigade_attrition | absent | n/a | n/a |
| 45 | **Operation Sana (t175)** | arbih_5th_corps | RBiH | failure | **2.5554** | 175 | max_failures | mid | **0.50–0.90 axes A/B; 2.0–3.5 final phase** | **YES (matches final-phase 2.0–3.5 spec)** |
| 46 | Operacija Bastion (t181) | vrs_1st_krajina | RS | failure | 0.1215 | 181 | planning_invalidated | low | n/a | n/a |

### 5.3 Special-focus operations summary (THE LANE'S CORE TARGETS)

| Lane target | Op found | force_ratio | War-or-game expected | In range? |
|---|---|---:|---|---|
| **Grmeč 94** (`grmec_ridge_breakout`) | Operation Grmeč 94 (t133) arbih_5th_corps | 1.1033 | 0.30–0.60 | **NO (above; ~2× above ceiling)** |
| **Sana 95 axes A/B** (`sana_*`) | Operation Sana (t175) arbih_5th_corps | 2.5554 | 0.50–0.90 (axes) / 2.0–3.5 (final-phase) | NO for axes; **YES for final-phase** |
| **VRS-attacker on Bihać 94-95** | none found in AARs (no VRS op targets `op:bihac:*` in 94-95 window) | n/a | 0.80–1.40 (no green light) | n/a — op-absence finding |
| **Operation Storm-related** | Operation Sana + Operation Mistral 2 both at t175 (Storm-companion turns) | 2.5554 / undef | n/a | n/a |
| **VRS Corridor 92 (Posavina)** | Operation Koridor (t0) | 6.8144 | 5.0–10.0 | **YES** |
| **VRS Drina/Srebrenica July 95** | Operation Krivaja-95 (t168) | 0.0838 | 3.0–5.0 | **NO (36× under spec) — STOP-GATE BREACH** |
| **HVO Operation Jackal** | Operation Jackal (t8) | 6.2294 | (sim is 1993-Jackal — gap-finder note) | n/a |
| **VRS Eastern Bosnia April 92** (Bijeljina/Zvornik/Foča/Višegrad) | Operation Drina (t0) `1.0000` (sentinel-1); Operation Visegrad (t0) `1.0000` (sentinel-1); Operation Prijedor (t0) `1.0000` (sentinel-1); Operation Foca (t5) `3.0966`; jna Operation Herzegovina (t0) `1.0000` (sentinel-1) | 1.0–3.10 | 8.0–20.0 | **NO (4 sentinels + Foca low)** — see Section 7 stop-gate |

---

## 6. Launch-behavior delta vs n1605

### 6.1 Op-count and identity

| Metric | n1605 | n1608 | Δ |
|---|---:|---:|---|
| Total AARs | 46 | 46 | 0 |
| Newly launched in n1608 (not in n1605) | — | 0 | (none) |
| Absent in n1608 (was in n1605) | 0 | — | (none) |

### 6.2 Per-AAR field equality (n1605 ↔ n1608, matched by `operation_id`)

| Field | n1608 ops differing from n1605 | Notes |
|---|---:|---|
| `outcome` | 0 | byte-identical |
| `total_attacks` | 0 | byte-identical |
| `objectives_captured.length` | 0 | byte-identical |
| `recovery_reason` | 46 | ALL — but n1605 lacks the field entirely (predates LANE B carryover `dd083454`); not a behavioral diff |
| `force_ratio_estimate` | 45 | ALL — but n1605 lacks the field entirely (predates Phase 5a carryover `cb7562a3`); not a behavioral diff |

### 6.3 Faction op counts (orders, from `run_summary.behavioral_health.combat_causality.total_orders_by_faction`)

| Faction | n1605 | n1608 | Δ |
|---|---:|---:|---|
| HRHB | 22 | 22 | 0 |
| RBiH | 336 | 336 | 0 |
| RS | 102 | 102 | 0 |

### 6.4 Late-war event firing

`run_summary.json.behavioral_health.combat_causality.invalidation_reasons` set IDENTICAL between n1605 and n1608 (5 entries, same strings).

`opportunity_health_audit.cjs` decisions identical (4 rows, same proposals, same approvals, same outcomes, same grades). No new event firings, no missed event firings, no shifts in approve/decline.

`Operation Krivaja-95` (Srebrenica July 95) DID launch t168 in BOTH runs (`vrs_drina`); outcome failure both runs (0/5 captured, planning_invalidated).
`Operation Stupčanica-95` (Žepa) DID launch t172 in BOTH runs; outcome failure both runs.
`Operation Storm` proxies (Operation Sana + Operation Mistral 2) DID launch t175 in BOTH runs; outcomes failure both runs.

---

## 7. Stop-gate check — GREEN cases below 2.5

Per dispatch brief: "if GREEN cases drop below 2.5 post-fix, the integration has overshot."

GREEN-case operations found in this run with `force_ratio_estimate < 2.5`:

| Op | Corps | Faction | Target type | force_ratio_estimate | War-or-game GREEN spec | Recovery reason |
|---|---|---|---|---:|---|---|
| Operation Herzegovina (t0) | jna_herzegovina_command | RS (JNA) | Eastern-Bosnia opening | 1.0000 (sentinel-flip-1) | 8.0–20.0 | planning_invalidated |
| Operation Visegrad (t0) | vrs_herzegovina | RS | Eastern-Bosnia (Višegrad) | 1.0000 (sentinel-flip-1) | 8.0–20.0 | planning_invalidated |
| Operation Prijedor (t0) | vrs_1st_krajina | RS | Krajina opening | 1.0000 (sentinel-flip-1) | (Krajina-92) | completed |
| Operation Drina (t0) | vrs_drina | RS | Eastern-Bosnia (Zvornik/Bratunac) | 1.0000 (sentinel-flip-1) | 8.0–20.0 | completed |
| Operation Foca (t5) | vrs_herzegovina | RS | Eastern-Bosnia (Foča) | 3.0966 | 8.0–20.0 | max_failures (above 2.5 but below GREEN floor 8.0) |
| Operation Krivaja-95 (t168) | vrs_drina | RS | Srebrenica July 95 | 0.0838 | 3.0–5.0 | planning_invalidated |
| Operation Cerska-Kamenica (t40) | vrs_drina | RS | (Drina sector) | 1.0000 (sentinel-flip-1) | n/a (not in war-or-game GREEN spec) | planning_invalidated |

**Total stop-gate breaches (GREEN-case ops with `force_ratio_estimate < 2.5`):** 5 confirmed (rows 1, 2, 3, 4, 6 above), plus row 5 (Foca) which is above 2.5 but well below 8.0 GREEN floor.

**Sentinel pattern observed:** Every t0 (scenario opening) op except Prsten and Koridor ratios at exactly `1.0000` (the `confidence < 0.5` sentinel branch). This includes the major historical Eastern-Bosnia openings (Drina/Bijeljina/Zvornik/Visegrad, Foca/Visegrad).

**Krivaja-95 spec gap:** war-or-game's GREEN spec for Srebrenica fall (3.0–5.0) is BREACHED by 36× — `force_ratio_estimate=0.0838`.

---

## 8. Hash drift class confirmation

| | n1605 | n1608 |
|---|---|---|
| `final_state_hash` | `488d2c6917e48fcb` | `75da76dbe69ccf24` |
| Hash differs | — | YES |
| Compare audit byte-equal (excluding folder name) | — | YES |
| ZEA / battles / casualties / orders / captures / unique_targets | — | byte-identical |
| AAR outcome / attacks / objectives_captured | — | byte-identical |
| Anchor pass set | — | byte-identical |
| Benchmark deltas to 6 decimals | — | byte-identical |

**Predicted class (BEHAVIORAL) is technically confirmed by hash drift.** Observable behavioral surface area in this 188w window: nil at the calibration / outcome / faction-order / capture level — see Section 4 totals.

The hash drift comes from the `force_ratio_estimate` field being added to `CorpsOperation` and `aar` records (Phase 5a) plus its values populated by Phase 4's predictor rewrite. Both shape and value of the field flow into final_save serialization → hash.

(Same shape as predecessor's n1606→n1607 40w drift: hash differs, observable behavior identical.)

---

## 9. Sentinel-flip count

| Sentinel value | Count (n1608) | Notes |
|---|---:|---|
| `force_ratio_estimate === 1.0000` (confidence-low: `enemyStrength === 0 → 1.0`) | 5 | rows 1, 2, 3, 4, 16 in the table |
| `force_ratio_estimate === 3.0000` (confidence-high: `enemyStrength === 0 → 3.0`) | 6 | rows 9, 18, 19, 28, 31, 32 |
| Total exact sentinel hits | 11 | 23.9% of 46 AARs |
| `force_ratio_estimate` absent | 1 | row 44 (Mistral 2) |

Sentinel-flip-1 ops by recovery: 2 `completed`, 3 `planning_invalidated`.
Sentinel-flip-3 ops by recovery: 3 `completed`, 1 `brigade_attrition`, 2 `no_logged_attempt`.

Phase 4's tightened sentinel (`enemyStrength === 0 → confidence >= 0.5 ? 3.0 : 1.0`) IS firing in production: 11 of 46 AARs land on the exact sentinel values.

---

## 10. Attached file paths

All written to repo root (`F:\A-War-Without-Victory`):

- `_phase5b_compare.txt` (n1608 painted-vs-sim, 92 lines)
- `_phase5b_diagnose.txt` (n1608 diagnose_run, 51 lines)
- `_phase5b_delivery.txt` (n1608 operation_delivery_audit, 77 lines)
- `_phase5b_opp_health.txt` (n1608 opportunity_health_audit, 28 lines)
- `_phase5b_validate.txt` (n1608 validate_run_consistency, 116 lines)
- `_phase5b_compare_n1605.txt` (n1605 baseline)
- `_phase5b_diagnose_n1605.txt` (n1605 baseline)
- `_phase5b_delivery_n1605.txt` (n1605 baseline)
- `_phase5b_opp_health_n1605.txt` (n1605 baseline)
- `_phase5b_validate_n1605.txt` (n1605 baseline)
- `_phase5b_delivery_diff.txt` (delivery audit diff)
- `_phase5b_force_ratio_compare.tsv` (TSV of n1605 vs n1608 force_ratio per AAR)

Run dirs:
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1608/` (this run)
- `runs/apr1992_definitive_188w__210e69404d054959__w188_n1605/` (baseline)

Disposition: `_phase5b_*.txt` files left in place for Tier 1 panel inspection.

---

## 11. Surprises / blockers for the orchestrator

1. **Behavioral parity is total in 188w.** Every disk-observable behavioral metric (anchors, area-weighted, region %, ZEA, battles, attacks, captures, casualties, faction orders, AAR outcomes, AAR total_attacks, opp_health decisions, sector validate failures) is BYTE-IDENTICAL between n1605 and n1608. Only `final_state_hash` and the new `force_ratio_estimate` / `recovery_reason` field values flow into the diff.
2. **Special-focus targets WERE reached in the 188w window:** Grmeč 94 (t133), Sana 95 (t175) — both with force_ratio values now persisted on disk per Phase 5a.
3. **Grmeč 94 force-ratio = 1.1033, war-or-game expected 0.30–0.60.** Bug-proof intact (was ~5.748 in Phase 4 synthetic pre-fix → 1.68 post-fix synthetic → 1.1033 in production 188w). Production ratio still ~2× above war-or-game's honest-spec ceiling. Phase 4 implementer flagged this as a known limitation: "Layer-1.5 cannot reach 0.30–0.60 without Layer-2 attrition."
4. **Sana 95 force-ratio = 2.5554, in war-or-game's "final-phase 2.0–3.5" range BUT not in "axes A/B 0.50–0.90" range.** The lane brief's special-focus expects axes A/B values for the named operation; sim emits one Sana op-record at the `arbih_5th_corps` level, ratio sits between the two specs.
5. **Krivaja-95 (Srebrenica July 95) force-ratio = 0.0838, war-or-game expected 3.0–5.0.** This is a **stop-gate breach** in the GREEN-case sense: a historical clear-superiority op shows a fantasy-low ratio. Op `planning_invalidated` (no objectives held, 0 attacks).
6. **Sentinel-flip-1 cluster at t0 historical openings.** The historical Eastern-Bosnia openings (Drina, Visegrad, Prijedor, Herzegovina) all carry `force_ratio_estimate = 1.0000` exactly — the `confidence < 0.5` branch fires for all of them. War-or-game's GREEN spec for these (8.0–20.0) cannot be checked because the predictor exits via the sentinel before computing.
7. **Operation Mistral 2 has NO `force_ratio_estimate` field at all** (the only AAR that lacks it). hvo_main_staff Operation Mistral 2 (t175). Recovery `brigade_attrition` — likely never reached `assessment` sub-phase or anti-paralysis exit at `operation_preparation.ts:516,538,634`.
8. **VRS-attacker on Bihać 94-95 ops absent from AAR list.** No VRS op targets `op:bihac:*` in the 94-95 window (turns 100-180). Lane spec asked for these; the run does not produce them.

---

## 12. Checkpoint snippet for working-on.md

```
2026-05-02 — Phase 5b 188w n1608 evidence packet written: docs/40_reports/diagnostics/20260502_phase5b_force_ratio_188w_evidence.md.
Hash 75da76dbe69ccf24 (vs n1605 488d2c6917e48fcb — BEHAVIORAL drift confirmed but observable surface byte-identical: anchors 23/27 same 4 fail, area 79.4% identical, ZEA 3 identical, AAR outcomes/attacks/captures byte-equal, opp_health 4 decisions same).
Special-focus FORCE RATIOS: Grmeč 94 = 1.1033 (war-or-game spec 0.30–0.60: above ceiling); Sana 95 = 2.5554 (in 2.0–3.5 final-phase spec, NOT in axes 0.50–0.90); VRS Bihać 94-95 = no ops found.
GREEN-case stop-gate breaches: 5 confirmed sentinel-flip-1 (t0 historical openings ratio=1.0 vs spec 8–20); Krivaja-95 ratio=0.0838 vs Srebrenica spec 3.0–5.0 (36× under).
Sentinel-flip count: 11 / 46 AARs land exactly on sentinel values (5 at 1.0, 6 at 3.0).
```
