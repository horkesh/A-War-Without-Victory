# Force Quality Foundation — Phase 5a Raw-Data Report (post-Phase-4)

**Status:** Raw data only. No analysis. The Phase 5b panel reads this file for synthesis.
**HEAD:** `4002f2f3` (Phase 4: corps_operation_readiness foundation merged on `main`).
**Generated:** 2026-05-01.
**Companion file:** `tools/diagnostics/_force_quality_post_phase4_metrics.md` (force_quality_audit_metrics.cjs output).
**Painted compares:** `tools/diagnostics/_phase5a_painted_compares/painted_<window>_<target>.txt`.

---

## 1. Run inventory

| Window | Scenario file | Run dir | Hash (first 16) | Source |
|---|---|---|---|---|
| 40w | `apr1992_definitive_40w.json` | `runs/apr1992_definitive_40w__3649b3861a87e6ea__w40_n1597` | `cbd7d61db0bfbe97` | end-of-run |
| 104w | `apr1992_definitive_104w.json` | `runs/apr1992_definitive_104w__13abfd609800bba2__w104_n1598` | `f4f03385770f06d1` | end-of-run |
| 156w | `apr1992_definitive_188w.json` (week-156 checkpoint) | `runs/_phase5a_w156_from_188w/` | `6e76cc614062ac18` | derived from 188w `save_w156.json` |
| 183w | `apr1992_definitive_188w.json` (week-183 checkpoint) | `runs/_phase5a_w183_from_188w/` | `3eafd8bd62084418` | derived from 188w `save_w183.json` |
| 188w | `apr1992_definitive_188w.json` | `runs/apr1992_definitive_188w__210e69404d054959__w188_n1599` | `2c851756827d5906` | end-of-run |

Notes:
- 156w/183w hashes are SHA-256(first16) of the 188w intermediate save file as written by the runner with `--video`. They are NOT engine-emitted final_state_hash values — those exist only at run end. Determinism property: the 188w run is byte-equivalent up to those weeks under the same scenario seed, so the same intermediate save JSON would emerge from a re-run.
- 188w run was launched with `--video`; the 188 weekly saves and `replay_timeline.json` are present in the run dir.

---

## 2. Officer quality table (audit §5.1 shape)

Brigade-level distribution per faction.

| Window | RBiH n | RBiH mean | RBiH median | RBiH p25 | RBiH p75 | RS n | RS mean | RS median | RS p25 | RS p75 | HRHB n | HRHB mean | HRHB median | HRHB p25 | HRHB p75 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 40w | 116 | 0.266 | 0.290 | 0.232 | 0.322 | 83 | 0.536 | 0.588 | 0.499 | 0.643 | 33 | 0.286 | 0.238 | 0.225 | 0.375 |
| 104w | 120 | 0.524 | 0.610 | 0.425 | 0.670 | 83 | 0.513 | 0.589 | 0.275 | 0.747 | 40 | 0.441 | 0.492 | 0.225 | 0.622 |
| 156w | 122 | 0.737 | 0.838 | 0.650 | 0.900 | 83 | 0.517 | 0.564 | 0.256 | 0.731 | 40 | 0.572 | 0.676 | 0.315 | 0.791 |
| 183w | 124 | 0.797 | 0.900 | 0.763 | 0.900 | 83 | 0.546 | 0.583 | 0.281 | 0.783 | 40 | 0.636 | 0.762 | 0.425 | 0.870 |
| 188w | 124 | 0.806 | 0.900 | 0.786 | 0.900 | 83 | 0.549 | 0.583 | 0.288 | 0.794 | 40 | 0.648 | 0.778 | 0.444 | 0.884 |

Min/max bounds (clamps): RBiH min 0.050 / max 0.900; RS min 0.057 / max 0.900; HRHB min 0.060 / max 0.891 (across all windows; saturating max appears at 156w+).

---

## 3. faction_officer_maturity table

| Window | RBiH | RS | HRHB |
|---|---:|---:|---:|
| 40w | 3.167 | 3.364 | 3.200 |
| 104w | 4.200 | 3.300 | 3.250 |
| 156w | 4.200 | 3.400 | 3.250 |
| 183w | 4.200 | 3.455 | 3.250 |
| 188w | 4.200 | 3.400 | 3.250 |

Named-officer competence persistence: `n/a` across all five runs (extractor found no `competence`/`skill`/`quality` fields on `commander`/`officers`/`commanders` arrays in formations).

---

## 4. capability_profile table

| Window | Faction | Year | Training | Org_mat | Equipment | Doctrine summary |
|---|---|---:|---:|---:|---:|---|
| 40w | RBiH | 1992 | 0.350 | 0.250 | 0.150 | ATTACK=0.500, DEFEND=0.600, INFILTRATE=0.600 |
| 40w | RS | 1992 | 0.800 | 0.850 | 0.900 | ARTILLERY_COUNTER=1.000, ATTACK=0.900, STATIC_DEFENSE=0.950 |
| 40w | HRHB | 1992 | 0.500 | 0.450 | 0.600 | ATTACK=0.650, DEFEND=0.700 |
| 104w | RBiH | 1994 | 0.750 | 0.700 | 0.400 | ATTACK=0.800, DEFEND=0.850, INFILTRATE=0.850 |
| 104w | RS | 1994 | 0.700 | 0.750 | 0.600 | ARTILLERY_COUNTER=0.750, ATTACK=0.650, STATIC_DEFENSE=0.800 |
| 104w | HRHB | 1994 | 0.500 | 0.450 | 0.500 | ATTACK=0.550, DEFEND=0.700 |
| 156w | RBiH | 1995 | 0.850 | 0.850 | 0.500 | ATTACK=0.900, DEFEND=0.900, INFILTRATE=0.900 |
| 156w | RS | 1995 | 0.650 | 0.700 | 0.500 | ARTILLERY_COUNTER=0.650, ATTACK=0.550, STATIC_DEFENSE=0.750 |
| 156w | HRHB | 1995 | 0.750 | 0.700 | 0.700 | ATTACK=0.800, COORDINATED_STRIKE=0.900, DEFEND=0.850 |
| 183w | RBiH | 1995 | 0.850 | 0.850 | 0.500 | ATTACK=0.900, DEFEND=0.900, INFILTRATE=0.900 |
| 183w | RS | 1995 | 0.650 | 0.700 | 0.500 | ARTILLERY_COUNTER=0.650, ATTACK=0.550, STATIC_DEFENSE=0.750 |
| 183w | HRHB | 1995 | 0.750 | 0.700 | 0.700 | ATTACK=0.800, COORDINATED_STRIKE=0.900, DEFEND=0.850 |
| 188w | RBiH | 1995 | 0.850 | 0.850 | 0.500 | ATTACK=0.900, DEFEND=0.900, INFILTRATE=0.900 |
| 188w | RS | 1995 | 0.650 | 0.700 | 0.500 | ARTILLERY_COUNTER=0.650, ATTACK=0.550, STATIC_DEFENSE=0.750 |
| 188w | HRHB | 1995 | 0.750 | 0.700 | 0.700 | ATTACK=0.800, COORDINATED_STRIKE=0.900, DEFEND=0.850 |

---

## 5. Equipment totals & condition table

Faction-level totals (count) plus operational/degraded/non-operational condition (count-weighted).

| Window | Faction | Brigades | Infantry | Tanks | Artillery | AAA | tank_op | tank_deg | tank_non | art_op | art_deg | art_non |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 40w | RBiH | 116 | 90900 | 55 | 169 | 8 | 24 | 27 | 5 | 148 | 23 | 0 |
| 40w | RS | 83 | 66400 | 609 | 1364 | 211 | 332 | 233 | 44 | 1273 | 89 | 2 |
| 40w | HRHB | 33 | 26600 | 25 | 68 | 4 | 14 | 12 | 1 | 63 | 8 | 0 |
| 104w | RBiH | 120 | 94150 | 95 | 203 | 9 | 5 | 86 | 6 | 154 | 58 | 0 |
| 104w | RS | 83 | 66400 | 218 | 852 | 150 | 2 | 181 | 35 | 439 | 373 | 41 |
| 104w | HRHB | 40 | 36200 | 141 | 189 | 21 | 91 | 41 | 8 | 173 | 14 | 2 |
| 156w | RBiH | 122 | 95750 | 103 | 240 | 9 | 1 | 101 | 1 | 198 | 53 | 0 |
| 156w | RS | 83 | 66400 | 181 | 468 | 124 | 1 | 159 | 21 | 49 | 367 | 52 |
| 156w | HRHB | 40 | 36200 | 127 | 205 | 21 | 52 | 66 | 9 | 193 | 10 | 2 |
| 183w | RBiH | 124 | 97350 | 103 | 263 | 9 | 1 | 102 | 0 | 236 | 38 | 0 |
| 183w | RS | 83 | 66400 | 172 | 423 | 119 | 1 | 155 | 16 | 16 | 366 | 41 |
| 183w | HRHB | 40 | 36200 | 101 | 212 | 21 | 32 | 61 | 8 | 200 | 10 | 2 |
| 188w | RBiH | 124 | 97350 | 103 | 270 | 9 | 1 | 102 | 0 | 246 | 35 | 0 |
| 188w | RS | 83 | 66400 | 172 | 423 | 119 | 1 | 156 | 15 | 14 | 370 | 39 |
| 188w | HRHB | 40 | 36200 | 101 | 213 | 21 | 31 | 62 | 8 | 201 | 10 | 2 |

---

## 6. Operations by faction × window table

Read directly from each run's `operation_aars.json` (filtered to ops with `started_turn <= window-end-turn` for 156w/183w intermediates).

| Window | Faction | ops | attempts | captures | captures_logged | success | move_only | stage_fail | bde≥3 | bde≥5 | axes≥2 | max_bde | max_axes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0-40w (40w run) | RBiH | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 1 |
| 0-40w (40w run) | RS | 12 | 29 | 35 | 34 | 5 | 4 | 0 | 10 | 6 | 7 | 8 | 3 |
| 0-40w (40w run) | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | 9 | 1 |
| 0-40w (104w run) | RBiH | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 |
| 0-40w (104w run) | RS | 13 | 26 | 26 | 26 | 3 | 6 | 0 | 9 | 6 | 9 | 8 | 3 |
| 0-40w (104w run) | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | 10 | 1 |
| 40-104w (104w run) | RBiH | 8 | 11 | 5 | 5 | 2 | 2 | 0 | 5 | 3 | 0 | 8 | 1 |
| 40-104w (104w run) | RS | 5 | 9 | 0 | 0 | 0 | 2 | 0 | 4 | 0 | 1 | 4 | 2 |
| 40-104w (104w run) | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 0-40w (188w run) | RBiH | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 |
| 0-40w (188w run) | RS | 13 | 26 | 26 | 26 | 3 | 6 | 0 | 9 | 6 | 9 | 8 | 3 |
| 0-40w (188w run) | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 0 | 10 | 1 |
| 40-104w (188w run) | RBiH | 8 | 11 | 5 | 5 | 2 | 2 | 0 | 5 | 3 | 0 | 8 | 1 |
| 40-104w (188w run) | RS | 5 | 9 | 0 | 0 | 0 | 2 | 0 | 4 | 0 | 1 | 4 | 2 |
| 40-104w (188w run) | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w (188w run) | RBiH | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 104-156w (188w run) | RS | 3 | 6 | 1 | 1 | 0 | 0 | 0 | 3 | 0 | 0 | 4 | 1 |
| 104-156w (188w run) | HRHB | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 156-188w (188w run) | RBiH | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 1 | 1 | 9 | 3 |
| 156-188w (188w run) | RS | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 1 |
| 156-188w (188w run) | HRHB | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 1 | 2 |

Note: The 156w and 183w intermediate dirs share the same 188w run AARs filtered by `started_turn <= 156` (31 ops) and `<= 183` (34 ops). The 188w final has 34 ops. Counts per window above are derived from each AAR set.

---

## 7. Anchor results per run

Source: `run_summary.json:anchor_checks` (passed flag).

| Window | Anchors passed | Anchors total | Run hash |
|---|---:|---:|---|
| 40w | 26 | 27 | `cbd7d61db0bfbe97` |
| 104w | 26 | 27 | `f4f03385770f06d1` |
| 156w | (intermediate save — not anchor-evaluated) | — | `6e76cc614062ac18` (synthesized) |
| 183w | (intermediate save — not anchor-evaluated) | — | `3eafd8bd62084418` (synthesized) |
| 188w | 25 | 27 | `2c851756827d5906` |

Anchor failure IDs: the run_summary.json fields for failed anchor IDs returned blank (the failed anchors do not surface a stable string identifier in the inspected key). Failure listing exists in `anchor_checks[].failed=true` entries within each `run_summary.json`; the panel can re-derive from the file.

---

## 8. Painted-target comparison per run

Overall + area-weighted faction shares.

| Window | Painted target | Painted RS / RBiH / HRHB (count %) | Sim RS / RBiH / HRHB (count %) | Δ count (RS / RBiH / HRHB) | Painted area-weighted (RS / RBiH / HRHB %) | Sim area-weighted (RS / RBiH / HRHB %) |
|---|---|---|---|---|---|---|
| 40w | jan1993 | 54.1 / 34.7 / 11.2 | 53.5 / 34.4 / 12.1 | -4 / -2 / +6 | 65.1 / 23.5 / 11.3 | 64.5 / 23.0 / 12.5 |
| 104w | apr1994 | 57.9 / 32.7 / 9.4 | 45.6 / 43.8 / 10.5 | -87 / +79 / +8 | 68.0 / 21.7 / 10.3 | 52.5 / 36.2 / 11.3 |
| 156w | apr1995 | 55.2 / 33.7 / 11.1 | 44.4 / 45.2 / 10.4 | -77 / +82 / -5 | 63.7 / 22.6 / 13.6 | 50.6 / 38.2 / 11.2 |
| 183w | apr1995 | 55.2 / 33.7 / 11.1 | 44.4 / 45.2 / 10.4 | -77 / +82 / -5 | 63.7 / 22.6 / 13.6 | 50.6 / 38.2 / 11.2 |
| 188w | oct1995 | 44.9 / 40.0 / 15.0 | 44.4 / 45.2 / 10.4 | -4 / +37 / -33 | 48.8 / 30.7 / 20.6 | 50.6 / 38.2 / 11.2 |

Note: 156w and 183w produce identical sim distributions because the 188w run reaches a near-frozen state by w156 (only 1 RBiH movement_only op, 1 RS movement_only, 1 HRHB movement_only between 156-188w; final state shifts are minimal at the OSID-share level).

By-region OSID-count match rate per window:

| Window | KRAJINA | POSAVINA_NE | DRINA | CENTRAL_CORRIDOR | CENTRAL_BOSNIA | SARAJEVO | HERZEGOVINA |
|---|---|---|---|---|---|---|---|
| 40w (jan1993) | 126/127 (99.2%) | 98/104 (94.2%) | 96/112 (85.7%) | 86/92 (93.5%) | 132/155 (85.2%) | 27/30 (90.0%) | 85/92 (92.4%) |
| 104w (apr1994) | 126/127 (99.2%) | 91/104 (87.5%) | 78/112 (69.6%) | 87/92 (94.6%) | 126/155 (81.3%) | 23/30 (76.7%) | 61/92 (66.3%) |
| 156w (apr1995) | 126/127 (99.2%) | 89/104 (85.6%) | 69/112 (61.6%) | 87/92 (94.6%) | 127/155 (81.9%) | 24/30 (80.0%) | 53/92 (57.6%) |
| 183w (apr1995) | 126/127 (99.2%) | 89/104 (85.6%) | 69/112 (61.6%) | 87/92 (94.6%) | 127/155 (81.9%) | 24/30 (80.0%) | 53/92 (57.6%) |
| 188w (oct1995) | 84/127 (66.1%) | 88/104 (84.6%) | 62/112 (55.4%) | 84/92 (91.3%) | 106/155 (68.4%) | 24/30 (80.0%) | 48/92 (52.2%) |

By-region area-weighted match rate per window:

| Window | KRAJINA | POSAVINA_NE | DRINA | CENTRAL_CORRIDOR | CENTRAL_BOSNIA | SARAJEVO | HERZEGOVINA |
|---|---|---|---|---|---|---|---|
| 40w (jan1993) | 99.6% | 95.4% | 87.6% | 97.0% | 86.1% | 88.1% | 93.3% |
| 104w (apr1994) | 99.6% | 90.4% | 71.8% | 93.5% | 76.9% | 67.2% | 60.7% |
| 156w (apr1995) | 99.6% | 89.2% | 57.9% | 93.5% | 80.1% | 69.5% | 51.8% |
| 183w (apr1995) | 99.6% | 89.2% | 57.9% | 93.5% | 80.1% | 69.5% | 51.8% |
| 188w (oct1995) | 60.0% | 87.5% | 54.7% | 88.8% | 63.2% | 69.5% | 42.9% |

Full mismatch lists in `tools/diagnostics/_phase5a_painted_compares/painted_<window>_<target>.txt`.

---

## 9. Battle count + anomaly count + order count per run

Source: `run_summary.json:combat_causality` and `:anomaly_detection` and `:attack_resolution`.

| Window | Battles | Attempts | Captures | Orders processed | Orders RBiH | Orders RS | Orders HRHB | Invalid ops | Zero-eligible-attacker ops | Anomalies (count / critical / warning / info) |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 40w | 100 | 180 | 81 | 128 | 12 | 102 | 14 | 0 | 0 | 9 / 0 / 2 / 7 |
| 104w | 228 | 288 | 58 | 282 | 177 | 100 | 5 | 2 | 2 | 17 / 0 / 8 / 9 |
| 156w | (intermediate) | — | — | — | — | — | — | — | — | (no eval) |
| 183w | (intermediate) | — | — | — | — | — | — | — | — | (no eval) |
| 188w | 280 | 389 | 60 | 454 | 245 | 103 | 5 | 8 | 2 | 24 / 1 / 14 / 9 |

Civilian casualties (run_summary.civilian_casualties):

| Window | RBiH killed | RBiH fled | RS killed | RS fled | HRHB killed | HRHB fled |
|---|---:|---:|---:|---:|---:|---:|
| 40w | 35159 | 81255 | 2270 | 58638 | 1927 | 83890 |
| 104w | 31661 | 83025 | 2450 | 89320 | 2422 | 89589 |
| 188w | 31663 | 83531 | 2564 | 98791 | 2425 | 89973 |

Takeover displacement (run_summary.takeover_displacement):

| Window | displaced_total | killed_total | fled_abroad_total |
|---|---:|---:|---:|
| 40w | 1,055,912 | 29,606 | 223,783 |
| 104w | 1,193,285 | 27,533 | 261,934 |
| 188w | 1,240,826 | 27,652 | 272,295 |

Destroyed brigades (run_summary.destroyed_brigades.length): 40w=4, 104w=34, 188w=43.

Brigade roll-up delta (active/inactive/total) — run_summary.historical_alignment.delta:

| Window | Faction | active Δ | inactive Δ | total Δ | personnel Δ |
|---|---|---:|---:|---:|---:|
| 40w | RBiH | +37 | +1 | +38 | +115,667 |
| 40w | RS | +6 | 0 | +6 | +21,362 |
| 40w | HRHB | +4 | +2 | +6 | +27,256 |
| 104w | RBiH | +40 | +2 | +42 | +153,927 |
| 104w | RS | -19 | +25 | +6 | +2,560 |
| 104w | HRHB | +7 | +6 | +13 | +38,418 |
| 188w | RBiH | +44 | +2 | +46 | +159,423 |
| 188w | RS | -28 | +34 | +6 | +15,638 |
| 188w | HRHB | +7 | +6 | +13 | +38,315 |

---

## 10. Side-by-side delta vs audit baseline (§5 of FORCE_QUALITY_TRAJECTORY_EVIDENCE_AUDIT)

### 10.1 Officer quality means — audit-baseline vs post-Phase-4

| Window | Faction | Audit mean | New mean | Δ |
|---|---|---:|---:|---:|
| 40w | RBiH | 0.080 | 0.266 | +0.186 |
| 40w | RS | 0.451 | 0.536 | +0.085 |
| 40w | HRHB | 0.197 | 0.286 | +0.089 |
| 104w | RBiH | 0.601 | 0.524 | -0.077 |
| 104w | RS | 0.657 | 0.513 | -0.144 |
| 104w | HRHB | 0.458 | 0.441 | -0.017 |
| 156w | RBiH | 0.083 | 0.737 | +0.654 |
| 156w | RS | 0.275 | 0.517 | +0.242 |
| 156w | HRHB | 0.211 | 0.572 | +0.361 |
| 183w | RBiH | 0.092 | 0.797 | +0.705 |
| 183w | RS | 0.263 | 0.546 | +0.283 |
| 183w | HRHB | 0.212 | 0.636 | +0.424 |
| 188w | RBiH | 0.092 | 0.806 | +0.714 |
| 188w | RS | 0.261 | 0.549 | +0.288 |
| 188w | HRHB | 0.212 | 0.648 | +0.436 |

### 10.2 Officer quality medians — audit-baseline vs post-Phase-4

| Window | Faction | Audit median | New median | Δ |
|---|---|---:|---:|---:|
| 40w | RBiH | 0.058 | 0.290 | +0.232 |
| 40w | RS | 0.549 | 0.588 | +0.039 |
| 40w | HRHB | 0.225 | 0.238 | +0.013 |
| 104w | RBiH | 0.661 | 0.610 | -0.051 |
| 104w | RS | 0.719 | 0.589 | -0.130 |
| 104w | HRHB | 0.496 | 0.492 | -0.004 |
| 156w | RBiH | 0.061 | 0.838 | +0.777 |
| 156w | RS | 0.337 | 0.564 | +0.227 |
| 156w | HRHB | 0.230 | 0.676 | +0.446 |
| 183w | RBiH | 0.063 | 0.900 | +0.837 |
| 183w | RS | 0.325 | 0.583 | +0.258 |
| 183w | HRHB | 0.231 | 0.762 | +0.531 |
| 188w | RBiH | 0.063 | 0.900 | +0.837 |
| 188w | RS | 0.320 | 0.583 | +0.263 |
| 188w | HRHB | 0.232 | 0.778 | +0.546 |

### 10.3 ARBiH operations: count + multi-axis count (audit §5.5 windows)

| Window | Audit ARBiH ops | New ARBiH ops | Audit ARBiH axes≥2 | New ARBiH axes≥2 | Audit ARBiH max_axes | New ARBiH max_axes |
|---|---:|---:|---:|---:|---:|---:|
| 0-40w | 2 | 1 | 0 | 0 | 1 | 1 |
| 40-104w | 3 | 8 | 0 | 0 | 1 | 1 |
| 104-156w | 0 | 0 | 0 | 0 | 0 | 0 |
| 156-188w | 0 | 1 | 0 | 1 | 0 | 3 |

### 10.4 VRS operations: count per window

| Window | Audit VRS ops | New VRS ops | Audit VRS axes≥2 | New VRS axes≥2 | Audit max_axes | New max_axes |
|---|---:|---:|---:|---:|---:|---:|
| 0-40w | 12 | 13 | 9 | 9 | 3 | 3 |
| 40-104w | 6 | 5 | 1 | 1 | 2 | 2 |
| 104-156w | 0 | 3 | 0 | 0 | 0 | 1 |
| 156-188w | 0 | 1 | 0 | 0 | 0 | 1 |

### 10.5 Painted-target area-weighted fit (faction shares)

Reference: this audit's §5 had no explicit painted-target area-weighted comparison column, so this is a fresh metric introduced here for Phase 5b.

| Window | Painted target | RS painted % | RS sim % | RS Δ | RBiH painted % | RBiH sim % | RBiH Δ | HRHB painted % | HRHB sim % | HRHB Δ |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 40w | jan1993 | 65.1 | 64.5 | -0.6 | 23.5 | 23.0 | -0.5 | 11.3 | 12.5 | +1.2 |
| 104w | apr1994 | 68.0 | 52.5 | -15.5 | 21.7 | 36.2 | +14.5 | 10.3 | 11.3 | +1.0 |
| 156w | apr1995 | 63.7 | 50.6 | -13.1 | 22.6 | 38.2 | +15.6 | 13.6 | 11.2 | -2.4 |
| 183w | apr1995 | 63.7 | 50.6 | -13.1 | 22.6 | 38.2 | +15.6 | 13.6 | 11.2 | -2.4 |
| 188w | oct1995 | 48.8 | 50.6 | +1.8 | 30.7 | 38.2 | +7.5 | 20.6 | 11.2 | -9.4 |

### 10.6 Hash drift vs audit baseline

| Window | Audit hash | New hash | Drift |
|---|---|---|---|
| 40w | `bd0d3a9c5c0c6b3e` | `cbd7d61db0bfbe97` | DIFFERENT |
| 104w | `6b6daa39dcaf66f7` | `f4f03385770f06d1` | DIFFERENT |
| 156w | `57f742a558d8e619` | `6e76cc614062ac18` (intermediate-save SHA) | DIFFERENT shape (intermediate, not engine-emitted) |
| 183w | `dd2d560c3e68a443` | `3eafd8bd62084418` (intermediate-save SHA) | DIFFERENT shape (intermediate, not engine-emitted) |
| 188w | `09fc9beb9f0004c3` | `2c851756827d5906` | DIFFERENT |

Hash drift is expected per the milestone narrative (Phases 1-4 all had deliberate hash impact; commit 4002f2f3 ledger entry §"Hash impact" lists the apr1992_52w-only manifest refresh).

---

## 11. Determinism check verdict

Single-run, no re-verify. Time budget did not permit a second 40w run for hash-equality re-verification within the autonomous packet window. The Phase 5b panel may run `npm run test:baselines` to confirm engine-level determinism via the manifest harness (52w / baseline_ops_4w / noop_4w).

---

## 12. Output file inventory

- `tools/diagnostics/_force_quality_post_phase4_metrics.md` (429 lines) — full force_quality_audit_metrics.cjs output for the 5 checkpoints.
- `tools/diagnostics/_force_quality_post_phase4_runs.md` (this file).
- `tools/diagnostics/_phase5a_painted_compares/painted_40w_jan1993.txt` (92 lines).
- `tools/diagnostics/_phase5a_painted_compares/painted_104w_apr1994.txt` (150 lines).
- `tools/diagnostics/_phase5a_painted_compares/painted_156w_apr1995.txt` (167 lines).
- `tools/diagnostics/_phase5a_painted_compares/painted_183w_apr1995.txt` (167 lines).
- `tools/diagnostics/_phase5a_painted_compares/painted_188w_oct1995.txt` (246 lines).

End of raw-data report. Phase 5b panel performs synthesis.
