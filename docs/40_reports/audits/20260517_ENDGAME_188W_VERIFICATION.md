# 188w Endgame Verification - 2026-05-17

**Status:** ACCEPTED-WITH-SIGNALS.

**Plan:** `docs/plans/2026-05-17-endgame-188w-verification-plan.md`

**Accepted evidence run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1844`

**Baseline resolution:** the plan's frozen n1741 tuple (`a4bf8b8095050881`) is stale for current local evidence. `MASTER_ROADMAP.md` still lists n1741 as the 2026-05-08 calibration baseline, but later roadmap entries record the 2026-05-16 engine-health line: n1842/n1843 hash `a0111273f26f907d`, then post-fix n1844 hash `ccd3f9f770052614` with H4/H5 verified. `CALIBRATION_MASTER.md` has not yet been updated past its 2026-05-10 n1741 text. This report therefore accepts n1844 as the latest documented complete 188w artifact and rejects n1741 as stale for this lane.

**Rejected fresh run:** `runs/apr1992_definitive_188w__210e69404d054959__w188_n1847` produced hash `4d4bd75c1c6739de`, 25/27 anchors, 6/6 benchmarks, and a 6.02 MB final save. It is rejected as baseline evidence because it diverges from n1844 and was produced while unrelated concurrent sim/state work was present in the workspace. No further rerun was attempted in this lane because the current worktree remains dirty in files outside this lane's write scope.

## 1. Run Manifest

Accepted artifact manifest from `run_meta.json`:

| field | value |
|---|---|
| run_dir | `runs/apr1992_definitive_188w__210e69404d054959__w188_n1844` |
| scenario_path | `data/scenarios/apr1992_definitive_188w.json` |
| weeks | 188 |
| final_save | `runs/apr1992_definitive_188w__210e69404d054959__w188_n1844/final_save.json` |
| run_summary | `runs/apr1992_definitive_188w__210e69404d054959__w188_n1844/run_summary.json` |
| final_state_hash | `ccd3f9f770052614` |
| final_save_sha256 | `CCD3F9F770052614B385E06152087DD28BE7F8D0A89EE397EB67C8A9BAC1D6AC` |
| run_summary_sha256 | `729A0439878C5266AAF4085B8FE51405B81D8F66AFDC0499885D401AAB377DED` |
| final_save_size | 7,065,493 bytes / 6.74 MB |
| anchors | 26/27 |
| failed anchors | `op:brcko:brcko` actual `RBiH`, expected `RS` |
| benchmarks | 6/6 from `bot_benchmark_evaluation` |
| section 6 floors | no explicit machine field found in `run_summary.json` |
| artifact timestamp | 2026-05-16 22:07 local |

Accepted diagnostic invocations:

```powershell
node tools\diagnostics\sarajevo_casualty_railroad.cjs runs\apr1992_definitive_188w__210e69404d054959__w188_n1844\final_save.json
node tools\diagnostics\p0_latent_recheck.cjs runs\apr1992_definitive_188w__210e69404d054959__w188_n1844\final_save.json
node tools\diagnostics\patron_pressure_probe.cjs runs\apr1992_definitive_188w__210e69404d054959__w188_n1844\final_save.json
node tools\diagnostics\force_quality_trajectory.cjs runs\apr1992_definitive_188w__210e69404d054959__w188_n1844
node tools\diagnostics\reconstitution_188w_checkpoints.cjs runs\apr1992_definitive_188w__210e69404d054959__w188_n1844
```

Exit status: Sarajevo probe `2` by design because it detected `SIGNAL_SARAJEVO_OUTLIER`; all other diagnostics exited `0`.

## 2. Baseline Comparison vs n1741

| field | n1741 frozen tuple | accepted n1844 artifact | status |
|---|---:|---:|---|
| final_state_hash | `a4bf8b8095050881` | `ccd3f9f770052614` | n1741 stale; n1844 accepted |
| anchors | 26/27 | 26/27 | same count |
| failed anchor | `op:brcko:brcko` | `op:brcko:brcko` | same identity |
| benchmarks | 6/6 | 6/6 | same |
| final save size | 6.84 MB | 6.74 MB | compatible post-fix artifact size |

Local-doc basis: `MASTER_ROADMAP.md` later records n1842/n1843/n1844 188w engine-health evidence after the older n1741 "Latest baselines" paragraph. `CALIBRATION_MASTER.md` has not yet incorporated those 2026-05-16 188w artifacts, so it is stale for this specific endgame verification lane.

## 3. Sarajevo Railroad Probe

Diagnostic invocation: `node tools\diagnostics\sarajevo_casualty_railroad.cjs runs\apr1992_definitive_188w__210e69404d054959__w188_n1844\final_save.json`

Decision: **SIGNAL_SARAJEVO_OUTLIER**. Banja Luka had no battle records in the sampled city set, so the operative comparison is Sarajevo vs Mostar. Sarajevo's attacker:defender casualty ratio is 3.785, more than 3x Mostar's 1.140.

| city | attacker_casualties | defender_casualties | ratio_att_def | n_battles | osids_with_battles |
|---|---:|---:|---:|---:|---:|
| BanjaLuka | 0 | 0 | 0.000 | 0 | 0 |
| Mostar | 1061 | 931 | 1.140 | 3 | 2 |
| Sarajevo | 9614 | 2540 | 3.785 | 26 | 5 |

Highest-impact Sarajevo row:

| osid | municipality | attacker_casualties | defender_casualties | ratio_att_def | n_battles |
|---|---|---:|---:|---:|---:|
| `op:centar_sarajevo:radava` | `centar_sarajevo` | 8311 | 945 | 8.795 | 21 |

## 4. Four-P0 Endgame Latency

Diagnostic invocation: `node tools\diagnostics\p0_latent_recheck.cjs runs\apr1992_definitive_188w__210e69404d054959__w188_n1844\final_save.json`

All four previously identified P0s remain **LATENT** at accepted endgame. Active count: 0.

| P0 | description | endgame_status | evidence_field | evidence_value |
|---|---|---|---|---|
| P0_1 | NATO `patron_pressure` NaN propagation through `getYearForTurn` | LATENT | `$..patron_pressure` | `patron_pressure` absent from serialized state |
| P0_2 | Multi-brigade attacks lose pressure when `corps_command` is undefined | LATENT | `$.military.corps_command` | 19 `corps_command` rows for 18 corps formations |
| P0_3 | Settlement flips discarded when `state.political` is undefined | LATENT | `$.political` | defined with 30 top-level keys |
| P0_4 | Casualty-faction cast from `formation.faction` | LATENT | `$.military.formations[*].faction` | 333 formations have non-null faction |

## 5. Patron Pressure Probe

Diagnostic invocation: `node tools\diagnostics\patron_pressure_probe.cjs runs\apr1992_definitive_188w__210e69404d054959__w188_n1844\final_save.json`

Conclusion: **patron pressure engine appears to run via persisted `patron_relationships.override_authority`, but no `patron_pressure` field is serialized.**

| faction | bucket | value | evidence_path |
|---|---|---|---|
| HRHB | absent | n/a | `$.political.patron_pressure` |
| RBiH | absent | n/a | `$.political.patron_pressure` |
| RS | absent | n/a | `$.political.patron_pressure` |

Exact `patron_pressure` key paths: none.

| faction | override_authority | support_level | sanctions_active |
|---|---:|---:|---|
| HRHB | 5 | 100 | false |
| RBiH | 2.75 | 37 | false |
| RS | 49.78 | 65.5 | true |

## 6. Force-Quality Late-War Shape

Diagnostics:

```powershell
node tools\diagnostics\force_quality_trajectory.cjs runs\apr1992_definitive_188w__210e69404d054959__w188_n1844
node tools\diagnostics\reconstitution_188w_checkpoints.cjs runs\apr1992_definitive_188w__210e69404d054959__w188_n1844
```

Run hash in both diagnostics: `ccd3f9f770052614`.

Top force-quality divergence signals:

| Rank | Faction | Metric | Early mean | Late mean | Delta | Canonical sign | Verdict |
|---|---|---|---:|---:|---:|---:|---|
| 1 | RS | personnel | 1094.11 | 1597.92 | 503.81 | -1 | inverse |
| 2 | HRHB | personnel | 1316.56 | 1816.87 | 500.32 | -1 | inverse |
| 3 | HRHB | morale | 66.83 | 72.10 | 5.28 | -1 | inverse |
| 4 | RS | fatigue | 0.58 | 0.00 | -0.58 | 1 | inverse |
| 5 | HRHB | officer_quality | 0.24 | 0.26 | 0.01 | -1 | inverse |

Checkpoint snapshots:

| Checkpoint | Observed turn | Faction | active brigades | officer_quality | personnel avg/brigade |
|---|---:|---|---:|---:|---:|
| t52 | 52 | HRHB | 29 | 0.3362 | 1694.7 |
| t52 | 52 | RBiH | 116 | 0.3435 | 1551.7 |
| t52 | 52 | RS | 79 | 0.5691 | 1343.0 |
| t104 | 104 | HRHB | 34 | 0.3429 | 1794.9 |
| t104 | 104 | RBiH | 117 | 0.5583 | 1712.3 |
| t104 | 104 | RS | 68 | 0.5020 | 1381.3 |
| t188 | 188 | HRHB | 35 | 0.2467 | 1831.5 |
| t188 | 188 | RBiH | 122 | 0.8165 | 1705.1 |
| t188 | 188 | RS | 59 | 0.4425 | 1599.3 |

Late-war shape flags:

- HRHB personnel grows into endgame despite the expected attritional arc.
- RS personnel grows into endgame despite the expected attritional arc.
- Fatigue trends collapse to 0 late for all factions; RS is an inverse-sign divergence and HRHB/RBiH are drifting away.
- HRHB morale and officer quality improve against the expected degradation arc.

## 7. Findings Summary

- **Run manifest:** PASS for accepted artifact availability. n1844 has `final_save.json`, `run_summary.json`, 26/27 anchors, 6/6 benchmarks, and hash `ccd3f9f770052614`.
- **Baseline comparison:** PASS-WITH-CORRECTION. n1741 is stale for current local evidence; n1844 is accepted. n1847 is rejected because it was produced under concurrent dirty-worktree conditions and regressed to 25/27 anchors.
- **Sarajevo railroad probe:** **SIGNAL.** Sarajevo ratio 3.785 vs Mostar 1.140; Banja Luka has no sampled battles.
- **Four-P0 latency recheck:** PASS. All four P0s remain LATENT at t188.
- **Patron pressure probe:** SIGNAL. No serialized `patron_pressure` field, but persisted patron relationship values show patron-system state exists elsewhere.
- **Force-quality late-war shape:** SIGNAL. HRHB/RS personnel growth, fatigue collapse, and HRHB quality/morale inverse trends remain visible.
- **Section 6 floors:** INCONCLUSIVE from machine artifacts; no explicit §6 floor field exists in n1844 `run_summary.json`.

## 8. Follow-on Work

- Create a follow-on Sarajevo railroad/canon plan if the hardcoded Sarajevo casualty special case is not intended to produce a 3x Mostar attacker:defender ratio.
- Decide whether `patron_pressure` should be a persisted political field, a derived per-turn effect only, or renamed/retired in favor of `military.negotiation.patron_relationships`.
- File a force-quality/reconstitution follow-up for RS/HRHB late-war personnel growth and all-faction fatigue collapse.
- Update `CALIBRATION_MASTER.md` in the parent/global-doc lane so n1842/n1843/n1844 188w evidence no longer conflicts with the older n1741 calibration text.
- Add a machine-readable §6/sensitive-history floor summary to `run_summary.json` or a companion diagnostic so future 188w verification reports do not have to mark that field inconclusive.
