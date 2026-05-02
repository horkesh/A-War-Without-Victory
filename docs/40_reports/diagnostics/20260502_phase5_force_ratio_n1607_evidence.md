# Phase 5 Evidence Packet — `estimateForceRatio` Defender-Modifier Integration MEGA-LANE

**Author:** scenario-harness-engineer (raw evidence collection only — NO analysis)
**Date:** 2026-05-02
**Scope:** Combat-Math `estimateForceRatio` post-fix scenario validation (LANE-2026-05-02 Phases 3+4)
**Run produced:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1607`
**Final state hash:** `c6677e7ea3c7d3a4`
**Predecessor baseline:** `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1606` (hash `8692ee345b682598`)

---

## 1. Preflight

| Check | Result |
|---|---|
| `git log --oneline -3` HEAD | `8b5a2902 feat(combat): integrate defender modifiers into estimateForceRatio (LANE-2026-05-02 Phase 4)` — matches dispatch contract |
| `git status --short` | `M .claude/scheduled_tasks.lock`, `M data/derived/latest_run_final_save.json`, `?? dist-packaged/` (unrelated to lane) |
| `npx tsc --noEmit` | clean (no output) |
| Working-tree edits in lane source files | none |

---

## 2. Run identity

| Field | Value |
|---|---|
| Run folder | `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1607` |
| Run-id counter | n1607 |
| Scenario fingerprint (input hash) | `3649b3861a87e6ea` (matches n1606 → identical inputs) |
| Weeks | 40 |
| `final_state_hash` | `c6677e7ea3c7d3a4` |
| Files emitted | `initial_save.json`, `final_save.json`, `weekly_report.jsonl`, `run_summary.json`, `control_delta.json`, `end_report.md`, `activity_summary.json`, `formation_delta.json`, `operation_aars.json`, `destroyed_brigades.json`, `run_meta.json` |

---

## 3. Audit summary table

| Audit | Output file | Exit | One-line summary |
|---|---|---:|---|
| `tools/compare_painted_vs_sim.cjs` | `_phase5_compare.txt` (92 lines) | 0 | OVERALL Match 650/712 (91.3%); area-weighted RS=64.5% / RBiH=23.0% / HRHB=12.5% |
| `tools/diagnose_run.cjs` | `_phase5_diagnose.txt` (50 lines) | 0 | RESULT: WARN — Errors 0, Warnings 30 (29 brigade-drift, 1 stranded-pool vlasenica:RBiH) |
| `tools/diagnostics/operation_delivery_audit.cjs` | `_phase5_delivery.txt` (70 lines) | 0 | 15 ops; failure-mode: DELIV 11, UNDERDELIV 6, NO-CONTACT-OTHER 5, PRE-FRIENDLY 3 |
| `tools/diagnostics/opportunity_health_audit.cjs` | `_phase5_opp_health.txt` (27 lines) | 0 | 0 opportunity decisions / 0 broken AAR links / 0 duplicates |
| `tools/validate_run_consistency.cjs` | `_phase5_validate.txt` (57 lines) | 0 | RESULT: PASS — all 13 checks OK |

Baseline counterparts written to `_phase5_*_n1606.txt` for diff.

**Diff against baseline:** all four audit outputs differ from n1606 ONLY in the run-folder name string and the `final_state_hash` line. Every metric line is byte-identical (verified via `diff` and `JSON.stringify` deep equality on AAR field projections).

---

## 4. Anchor + benchmark deltas vs n1606

### Anchor checks (from `run_summary.json.anchor_checks`)

| | n1606 | n1607 | Δ |
|---|---|---|---|
| Total anchors | 27 | 27 | 0 |
| Passed | 26 | 26 | 0 |
| Failed | 1 | 1 | 0 |
| Failing anchor | `op:brcko:brka_2` (expected RBiH, actual RS) | identical | none |

### Bot benchmark evaluation (from `run_summary.json.bot_benchmark_evaluation`)

| Faction | Objective | Turn | n1606 share | n1607 share | Tolerance | Pass |
|---|---|---:|---:|---:|---:|---|
| HRHB | secure_herzegovina_core | 20 | 0.120787 | 0.120787 | 0.05 | both PASS |
| RBiH | hold_core_centers | 20 | 0.344101 | 0.344101 | 0.08 | both PASS |
| RS | early_territorial_expansion | 20 | 0.535112 | 0.535112 | 0.08 | both PASS |
| HRHB | hold_central_bosnia_nodes | 40 | 0.120787 | 0.120787 | 0.04 | both PASS |
| RBiH | preserve_survival_corridors | 40 | 0.344101 | 0.344101 | 0.05 | both PASS |
| RS | consolidate_gains | 40 | 0.535112 | 0.535112 | 0.05 | both PASS |

n1607: 6/6 PASS. n1606: 6/6 PASS. Numerically identical.

### Area-weighted control (from `compare_painted_vs_sim.cjs`)

| Metric | n1606 | n1607 | Δ |
|---|---|---|---|
| Overall match | 650/712 (91.3%) | 650/712 (91.3%) | 0 |
| Area-weighted RS | 33134 km² (64.5%) | 33134 km² (64.5%) | 0 |
| Area-weighted RBiH | 11790 km² (23.0%) | 11790 km² (23.0%) | 0 |
| Area-weighted HRHB | 6413 km² (12.5%) | 6413 km² (12.5%) | 0 |

### Per-region area % (from `compare_painted_vs_sim.cjs`)

| Region | n1606 | n1607 |
|---|---|---|
| KRAJINA | 99.6% | 99.6% |
| POSAVINA_NE | 95.4% | 95.4% |
| DRINA | 87.6% | 87.6% |
| CENTRAL_CORRIDOR | 97.0% | 97.0% |
| CENTRAL_BOSNIA | 86.1% | 86.1% |
| SARAJEVO | 88.1% | 88.1% |
| HERZEGOVINA | 93.3% | 93.3% |

### ZEA-rate (from `run_summary.json.behavioral_health.combat_causality`)

| Metric | n1606 | n1607 | Δ |
|---|---|---|---|
| `zero_eligible_attacker_operation_count` | 0 | 0 | 0 |
| `total_attack_orders` | 128 | 128 | 0 |
| `total_battles` | 100 | 100 | 0 |
| `total_objective_attempts` | 180 | 180 | 0 |
| `total_objective_captures` | 81 | 81 | 0 |
| `total_orders_by_faction.HRHB` | 14 | 14 | 0 |
| `total_orders_by_faction.RBiH` | 12 | 12 | 0 |
| `total_orders_by_faction.RS` | 102 | 102 | 0 |
| `valid_for_combat_calibration` | true | true | unchanged |

### Combat / casualty totals (from `run_summary.json.attack_resolution`)

| Metric | n1606 | n1607 | Δ |
|---|---|---|---|
| `casualty_attacker` | 15522 | 15522 | 0 |
| `casualty_defender` | 28616 | 28616 | 0 |
| `defender_absent_battles` | 22 | 22 | 0 |
| `defender_present_battles` | 78 | 78 | 0 |
| `flips_applied` | 43 | 43 | 0 |
| `unique_attack_targets` | 100 | 100 | 0 |
| `weeks_with_orders` | 37 | 37 | 0 |

### Control change attribution

| Bucket | n1606 | n1607 |
|---|---:|---:|
| combat | 82 | 82 |
| consolidation | 51 | 51 |
| abandoned | 0 | 0 |
| init_overrides | 0 | 0 |
| other | 4 | 4 |
| **total_changes** | **137** | **137** |

---

## 5. Force-ratio sample table

**Persistence note:** The `force_ratio_estimate` field is written by `tickPreparation` in `src/sim/combat/operation_preparation.ts` at lines 516, 538, 634 onto the live `op` object inside `corps_command[*].active_operations[*]`. It is NOT carried into the AAR record (`operation_history`) when an op completes; it is NOT serialized into `weekly_report.jsonl.preparation_events` despite the `PreparationEvent` shape declaring the field at `src/sim/turn_pipeline_types.ts:263`. The `report.preparation_events` array (set at `war_phases.ts:896`) is in-memory-only — the runner does not write it to disk.

**Consequence:** The only `force_ratio_estimate` value durably observable on disk is the snapshot for ops still in `active_operations` at end-of-scenario (turn 40). All 15 completed AARs lack the field.

### 5.1 Force-ratio values present in n1607 final_save

| Corps | Op name | Started turn | force_ratio_estimate | intel_confidence_at_assessment | supply_readiness_at_assessment | commander_assessment |
|---|---|---:|---:|---:|---:|---|
| arbih_3rd_corps | Operacija Pravda | 32 | 0.4525 | 0.9300 | 0.5000 | launch |

(All other active_operations at end-of-run are probes or VRS ops that have not yet exposed force_ratio_estimate; full survey table below.)

### 5.2 All active operations at end-of-run n1607 (force_ratio populated or not)

| Corps | Op | Started | force_ratio_estimate | commander_assessment |
|---|---|---:|---:|---|
| arbih_1st_corps | Operacija Kalem | 37 | undef | none |
| arbih_3rd_corps | Operacija Pravda | 32 | 0.4525 | launch |
| arbih_3rd_corps | probe_arbih_3rd_corps_t39 | 39 | undef | none |
| hvo_central_bosnia | probe_hvo_central_bosnia_t39 | 39 | undef | none |
| vrs_1st_krajina | probe_vrs_1st_krajina_t39 | 39 | undef | none |
| vrs_drina | Operation Cerska-Kamenica | 40 | undef | none |
| vrs_sarajevo_romanija | Operacija Obruč | 36 | undef | none |

### 5.3 Direct n1606 vs n1607 force_ratio delta on shared snapshot

| Corps | Op | n1606 ratio | n1607 ratio | Δ |
|---|---|---:|---:|---:|
| arbih_3rd_corps | Operacija Pravda (t32) | 0.4823 | 0.4525 | −0.0298 |

(Same op, same intel_confidence (0.9300), same supply_readiness (0.5000), same commander_assessment (`launch`), same brigades [`arbih_303rd_vitezka_mountain`, `arbih_706th_muslim_mountain`, `arbih_737th_muslim_light`], same objectives [`op:donji_vakuf:komar_2`, `op:skender_vakuf:donji_koricani`].)

### 5.4 War-or-game expected-range coverage (from working-on.md)

| Expected sample | Window present in 40w? | Force-ratio in run? |
|---|---|---|
| ARBiH 5th Corps Grmeč 94 | NO (Grmeč is 1994; 40w ends ~Jan 1993) | n/a |
| ARBiH 5th Corps Sana 95 axes A/B | NO (Sana 95 is summer 1995) | n/a |
| VRS attack on Bihać 1994-95 | NO | n/a |
| VRS Operation Corridor 92 (Posavina) — `Operation Koridor` | YES, AAR present (success, 5/5 captured, 8 attacks, t0–t9, vrs_east_bosnian) | `force_ratio_estimate` not persisted on completed AAR — predictor value not recoverable from this run |
| VRS Eastern Bosnia April 92 (Bijeljina/Zvornik/Foča/Višegrad) — `Operation Drina`, `Operation Visegrad`, `Operation Foca` | YES, AARs present | same — predictor value not recoverable |
| VRS Drina/Srebrenica July 95 | NO | n/a |
| HVO Operation Jackal 92 | YES, AAR present (failure, 0/2 captured, 0 attacks, t8–t13, hvo_southeast_herzegovina) | same — predictor value not recoverable |

### 5.5 Operation outcomes (full AAR list n1607, identical to n1606)

| Started | Faction | Corps | Op | Outcome | Attacks | Captured | Recovery |
|---:|---|---|---|---|---:|---|---|
| 0 | (jna) | jna_herzegovina_command | Operation Herzegovina | failure | 4 | 0/4 | completed |
| 0 | RS | vrs_1st_krajina | Operation Prijedor | success | 0 | 10/10 | completed |
| 0 | RS | vrs_drina | Operation Drina | success | 3 | 3/3 | completed |
| 0 | RS | vrs_east_bosnian | Operation Koridor | success | 8 | 5/5 | completed |
| 0 | RS | vrs_herzegovina | Operation Visegrad | partial | 0 | 1/2 | planning_invalidated |
| 0 | RS | vrs_sarajevo_romanija | Operation Prsten | partial | 9 | 6/7 | max_failures |
| 5 | RS | vrs_herzegovina | Operation Foca | partial | 4 | 2/3 | max_failures |
| 6 | RS | vrs_drina | Operation Podrinje Sweep | success | 2 | 2/2 | completed |
| 8 | HRHB | hvo_southeast_herzegovina | Operation Jackal | failure | 0 | 0/2 | political_blocked |
| 8 | RS | vrs_1st_krajina | Operation Donji Vakuf | partial | 2 | 2/3 | max_failures |
| 9 | RS | vrs_east_bosnian | Operacija Breza | partial | 4 | 1/2 | max_failures |
| 14 | RS | vrs_herzegovina | Operation Herzegovina Consolidation | success | 3 | 3/3 | completed |
| 22 | RBiH | arbih_3rd_corps | Operacija Grad | failure | 0 | 0/2 | no_logged_attempt |
| 31 | RS | vrs_east_bosnian | Operacija Prodor | failure | 0 | 0/2 | planning_invalidated |
| 35 | RS | vrs_east_bosnian | Operacija Vrbas | failure | 0 | 0/2 | planning_invalidated |

---

## 6. Launch-behavior delta vs n1606

| Metric | n1606 | n1607 | Δ |
|---|---:|---:|---|
| Total AARs (completed ops) | 15 | 15 | 0 |
| Newly launched in n1607 (not in n1606) | — | 0 | none |
| Launched in n1606 but absent in n1607 | 0 | — | none |
| Per-AAR `outcome` mismatch | — | 0 | none |
| Per-AAR `recovery_reason` mismatch | — | 0 | none |
| Per-AAR `total_attacks` mismatch | — | 0 | none |
| Per-AAR `objectives_captured` length mismatch | — | 0 | none |
| Active operations at end-of-run with `force_ratio_estimate` populated | 1 | 1 | same op (Operacija Pravda) |
| `commander_assessment` shifts (abort/postpone/launch) | — | 0 detectable in serialized data | (PreparationEvent stream not persisted) |

Aar deep-equality check (operation_id, faction, corps_id, started_turn, ended_turn, outcome, total_attacks, objectives_captured.length, objectives_targeted.length, recovery_reason): **`true`** byte-for-byte across all 15 ops.

---

## 7. 188w decision recommendation

**FLAT — no detectable launch-behavior shift in 40w window.**

Rationale (raw observables only):
- AAR set identical (count, identity, outcome, attacks, captures, recovery_reason).
- Anchor pass set identical (26/27, same single failure).
- All 6 bot benchmarks identical to 6 decimal places.
- Area-weighted control identical to 1 decimal across all 7 regions.
- Combat causality identical (orders, battles, casualties, ZEA-count).
- Single in-flight op showing predictor delta: Operacija Pravda Δ=−0.0298 (0.4823→0.4525), assessment unchanged (`launch`).

The orchestrator should weigh this against the per-`/qa-engineer` Phase 1 trigger condition ("188w ONLY IF any commander_assessment shifts in 40w"). On this scenario harness's read, no shifts surfaced in any disk-persisted artifact. **Caveat for Tier 1 panel:** the `PreparationEvent` stream (which carries pre-launch ratios for all ops, not just end-of-run survivors) is in-memory-only — if Tier 1 wants ratios for completed historical ops (Corridor, Jackal, Foca, etc.) it needs an instrumentation change, not a 188w run.

---

## 8. Attached file paths

All written to repo root (working dir was `F:\A-War-Without-Victory`):

- `_phase5_compare.txt` (n1607 painted-vs-sim, 92 lines)
- `_phase5_diagnose.txt` (n1607 diagnose_run, 50 lines)
- `_phase5_delivery.txt` (n1607 operation_delivery_audit, 70 lines)
- `_phase5_opp_health.txt` (n1607 opportunity_health_audit, 27 lines)
- `_phase5_validate.txt` (n1607 validate_run_consistency, 57 lines)
- `_phase5_compare_n1606.txt` (n1606 baseline tail-25)
- `_phase5_diagnose_n1606.txt` (n1606 baseline diagnose)
- `_phase5_delivery_n1606.txt` (n1606 baseline delivery)
- `_phase5_validate_n1606.txt` (n1606 baseline validate)

Run dirs:
- `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1607/` (this run)
- `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1606/` (baseline)

Disposition: `_phase5_*.txt` files are **left in place** for Tier 1 panel inspection.

---

## 9. Surprises / blockers for the orchestrator

1. **Force-ratio observability gap.** The lane's headline metric (`force_ratio_estimate`) is only persisted while an op is in-flight and is NOT carried to AARs or weekly_report. Of 15 completed ops in this 40w run, ZERO have a recoverable predictor value. This means war-or-game's GREEN-case expected ranges (Corridor 5–10, Eastern Bosnia 8–20, Jackal 3–6) cannot be checked from this run's artifacts as-is.
2. **Behavioral parity is total in 40w.** Every disk-observable behavioral metric is identical between n1606 (pre-fix) and n1607 (post-fix). The hash drift is real (`8692ee345b682598` → `c6677e7ea3c7d3a4`), but the only surface where a value-level delta is observable is the single in-flight Operacija Pravda snapshot (Δ=−0.0298).
3. **Predicted "BEHAVIORAL drift" classification by /determinism-auditor is technically confirmed (hash differs) but the behavioral surface area visible in 40w is essentially nil** — behaviors that were going to launch still launched, behaviors that were going to abort still aborted, identical attack counts and captures throughout. Tier 1 panel must decide whether this is (a) the predicted "cautious commander" effect being absent because no cautious commander faced an entrenched-defender op in this 40w window, or (b) the integration is correctly producing different ratios but downstream gating consumed them identically. The single observable Pravda delta (−0.0298) is too small to flip an `assessmentScore` threshold (per Phase 1 synthesis: ratio weight in score = 0.30; Δ_score = 0.30 × 0.0298 / req_ratio).
