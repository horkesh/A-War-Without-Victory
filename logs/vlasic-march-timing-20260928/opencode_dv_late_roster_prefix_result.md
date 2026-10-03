# Donji Vakuf late authored-roster — 156-week prefix measurement (2026-09-29)

**Verdict: PASS** against the bounded measurement criteria in
`opencode_dv_late_roster_prefix_handoff.md`. One valid prefix was produced (child exit 0). The
reviewed execution-phase admission let the 16th Krajina join Operation Donji Vakuf on the turn
after injection; April 1995 came out **706/712 with all 40 protected anchors**, and the
January 1993 and April 1994 checkpoints both stayed at **707/712**. The named protection set is
intact. This single prefix does **not** satisfy the full 188-week, full-suite or Farz P-A §6
gates. No retry, tuning, edit or second campaign was performed.

## Run identity and raw facts

| Fact | Value |
|---|---|
| Command (run once, from repo root) | `node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --weeks 156 --unique --out runs` |
| Child exit | 0 (`opencode_dv_late_roster_prefix_156w.exit`) |
| Unique run dir | `runs/apr1992_definitive_188w__2cb8853e73fa74b8__w156_n13` |
| final_state_hash | `66e196202b71e016` |
| final_save.json sha256 | `66e196202b71e01643ac8011e8e3e14446b2b8700c33e6e0def698f091e8ea4d` |
| initial_save.json sha256 | `413ce64acaa420e130e293230dfa470dcaa46c5b4df2c6d3706d7e31cb8455e1` |
| Initial save vs retained n9/n12 | **byte-identical** (same sha256 for all three) |
| weekly_report row count | 156 |
| Final unresolved refs | 0 (`FINAL_SEAL kind=final_save turn=156 unresolved=0`; every logged turn unresolved=0) |

Raw evidence paths:
- stdout/stderr: `opencode_dv_late_roster_prefix_156w.out`, exit `opencode_dv_late_roster_prefix_156w.exit`
- pre-run snapshot: `opencode_dv_late_roster_prefix_started.txt`, `opencode_dv_late_roster_prefix_prerun_dirs.txt`
- extracted facts: `opencode_dv_late_roster_prefix_extract.json`, `opencode_dv_late_roster_prefix_facts.txt`
- analysis logs: `opencode_dv_late_roster_prefix_analysis.out`, `opencode_dv_late_roster_prefix_named.out`, `opencode_dv_late_roster_prefix_anomalies.out`
- retained comparison runs: `runs/..._w156_n9` (hash `bc483288e3452f11`), `runs/..._w156_n12` (hash `34ee9fcb3a1aee24`)

## Checkpoint fits, anchors, named seats

Measured from `run_summary.json` of each run (all three use the byte-identical initial save):

| Run | w39 Jan 1993 | w104 Apr 1994 | w156 Apr 1995 | Protected anchors |
|---|---|---|---|---|
| n9 (retained) | 707/712 (31/31) | 707/712 (32/32) | 704/712 (40/40) | 40/40 |
| n12 (failed) | 704/712 (31/31) | 704/712 (32/32) | 703/712 (39/40) | 39/40 — `op:donji_vakuf:donji_vakuf_2` RBiH |
| **n13 (this prefix)** | **707/712 (31/31)** | **707/712 (32/32)** | **706/712 (40/40)** | **40/40, no failures** |

Named-seat check at the April 1995 (w156) checkpoint, from `final_save.json` `political_controllers`:

| Seat | Expected | n9 | n12 | n13 |
|---|---|---|---|---|
| Donja Mahala (`op:orasje:donja_mahala`) | HRHB | HRHB | HRHB | **HRHB** |
| Doljani_2 (`op:jablanica:doljani_2`) | RBiH | RBiH | RBiH | **RBiH** |
| Ljubunci (`op:prozor:ljubunci_2`) | HRHB | HRHB | HRHB | **HRHB** |
| Lug_2 (`op:prozor:lug_2`) | HRHB | HRHB | HRHB | **HRHB** |
| Paroš (`op:prozor:paros`) | HRHB | HRHB | HRHB | **HRHB** |
| Gornja Presjenica (`op:trnovo:gornja_presjenica`) | RS | RS | RS | **RS** |
| Paklarevo (`op:travnik:paklarevo`) | RBiH | RS | RBiH | **RBiH** |
| Gornje Krčevine (`op:travnik:gornje_krcevine`) | RBiH | RS | RBiH | **RBiH** |
| Varošluk (`op:travnik:varosluk`) | RS | RS | RS | **RS** |
| Donji Vakuf_2 (`op:donji_vakuf:donji_vakuf_2`) | RS (anchor) | RS | RBiH | **RS** |
| Korenici (`op:donji_vakuf:korenici`) | RS | RS | RBiH | **RS** |
| Oborci_2 (`op:donji_vakuf:oborci_2`) | RS | RS | RBiH | **RS** |

## The 16th Krajina: t28–31 roster and movement (measured)

From `brigade_temporal_log.jsonl` (`rs_16th_krajina_motorized`):

| t | location | active_op | phase | mv_state / destination |
|---|---|---|---|---|
| 27 | `op:teslic:blatnica_2` | — | — | in_transit → `op:sipovo:pribeljci_2` |
| 28 | `op:teslic:blatnica_2` | — | — | in_transit → `op:sipovo:pribeljci_2` |
| **29** | `op:donji_vakuf:torlakovac_2` | **`vrs_1st_krajina:Operation Donji Vakuf:t28`** | **execution** | — |
| 30 | `op:donji_vakuf:torlakovac_2` | `…Donji Vakuf:t28` | execution | — (next dest `babin_potok_2`) |
| 31 | `op:donji_vakuf:torlakovac_2` | `…Donji Vakuf:t28` | execution | in_transit → `op:donji_vakuf:babin_potok_2` |
| 32 | `op:donji_vakuf:oborci_2` | `…Donji Vakuf:t28` | execution | — |
| 33 | `op:donji_vakuf:donji_vakuf_2` | `…Donji Vakuf:t28` | execution | — |
| 34 | `op:donji_vakuf:korenici` | `…Donji Vakuf:t28` | recovery | — |

Contrast (measured): in **n12**, on t29 the same brigade sat at `op:sipovo:pribeljci_2` with
`active_op_id = null`, and on t30 a generic `vrs_1st_krajina:Operacija Bedem:t30` claimed it
(phase planning) before it drifted to `op:sipovo:volari_2` and `op:donji_vakuf:kutanja`. In **n9**
the brigade reached `op:sipovo:pribeljci_2` on t29 under `…Operation Donji Vakuf:t29`
(planning), then moved to `op:donji_vakuf:torlakovac_2` on t30 (execution).

## Donji Vakuf operation and captured trio (measured)

`operation_aars.json`, `Operation Donji Vakuf` (corps `vrs_1st_krajina`):

| Run | window | outcome / grade | participants (16th?) | captured objectives |
|---|---|---|---|---|
| n9 | t29–39 | success, Brilliant (5★) | 6, **incl. 16th** | 7 incl. torlakovac_2, oborci_2, donji_vakuf_2, korenici, prusac_2, jemanlici, gornje_krcevine |
| n12 | t28–39 | partial, Solid (4★) | 5, **16th absent** | 4 (torlakovac_2, prusac_2, jemanlici, gornje_krcevine) |
| **n13** | **t28–36** | **success, Brilliant (5★)** | **7, incl. 16th** | **all 7 incl. the trio `oborci_2`, `donji_vakuf_2`, `korenici`** |

n13 ordinary-combat provenance for the RS trio (battles logged in `weekly_report.jsonl`, not
scripted control flips):

| t | target | attacker(s) | defender | power ratio | outcome |
|---|---|---|---|---|---|
| 32 | `op:donji_vakuf:oborci_2` | `rs_16th_krajina_motorized` | `arbih_705th_slavna_mountain` | 3.17 | decisive_victory |
| 33 | `op:donji_vakuf:donji_vakuf_2` | `rs_16th_krajina_motorized` | `arbih_770th_slavna_mountain` | 4.77 | decisive_victory |
| 34 | `op:donji_vakuf:korenici` | `rs_16th_krajina_motorized` | `arbih_705th_slavna_mountain` | 2.41 | decisive_victory |

n13 initial_strength for the operation is 9646 (vs n9 8263, n12 6098) — consistent with the
authored 16th and additional brigades rostering (measured); no score was used to infer victory.

## Jajce / Donji Vakuf timing (measured)

- Operation Jajce: t19–28, success (5★), 3 participants — identical in n12 and n13; operation
  objectives unchanged.
- The 16th arrives t29 into `Operation Donji Vakuf:t28` already in `execution`; the
  execution-phase admission admits it that turn. Planning turn for the operation was t28
  (attacks begin t29, per `operation_aars.json` `weekly_log`).

## Paklarevo / Gornje Krčevine / Varošluk control and provenance

Final control (w156): Paklarevo **RBiH**, Gornje Krčevine **RBiH**, Varošluk **RS**.

Battle path in n13 (measured):
- t29 `op:travnik:gornje_krcevine`: `rs_1st_banja_luka_light_infantry` decisive victory over
  `arbih_706th_muslim_mountain` (RS takes it during the early DV window).
- t153 `op:travnik:paklarevo`: `arbih_17th_vitezka_mountain` decisive victory over `rs_1st_armored`.
- t154–156 `op:travnik:gornje_krcevine`: `arbih_17th_vitezka_mountain` vs `rs_1st_tesli_infantry` /
  `rs_1st_armored` (stalemate t154, catastrophic t155, decisive victory t156) → RBiH holds at w156.

n9 differs: gornje_krcevine and paklarevo stayed RS at w156 (its paklarevo battles t153–156 were
all stalemate/repulsed/catastrophic for RBiH). n12's gornje_krcevine battles are vs
`rs_2nd_krajina_infantry` rather than `rs_1st_armored`. These provenance differences are reported
as measured; the mechanism linking the roster fix to the Vlasic-side outcome is **inference**, not
established here.

## Controller differences vs n9 and n12

Full `political_controllers` diff at final_save (only these differ):

- **n9 → n13 (2):** `op:travnik:gornje_krcevine` RS → RBiH; `op:travnik:paklarevo` RS → RBiH.
- **n12 → n13 (3):** `op:donji_vakuf:donji_vakuf_2`, `op:donji_vakuf:korenici`,
  `op:donji_vakuf:oborci_2` RBiH → RS.

Thus n13 keeps the n9 trio intact and additionally carries the RBiH Paklarevo/Gornje Krčevine
result that n12 had, netting +2 April-fit over n9 and +3 over n12.

## Anomalies

`run_summary.json` `anomaly_detection`:

| Run | count | critical | warnings | info |
|---|---|---|---|---|
| n9 | 26 | 1 | 3 | 22 |
| n12 | 24 | 0 | 3 | 21 |
| **n13** | **23** | **0** | **3** | **20** |

n13 warnings: `frontline_density_imbalance` (2 sectors), `weaker_faction_attack_imbalance`
(RBiH–HRHB), `brigade_far_from_home_unassigned` (1/218, `hrhb_travnik_brigade`). No critical
anomaly; the single n9 critical (`hvo_central_bosnia` combat-ineffective concentration) is absent
in n13. No new anomaly category appeared.

## Measured facts vs inference

- **Measured:** exit 0 and one unique prefix; byte-identical initial save; 156 rows; final
  unresolved 0; the t28–31 roster/movement table; the DV AAR window/participants/captures; the
  trio battle provenance; checkpoint fits/anchor counts; named-seat controls; the two/three
  controller diffs; anomaly counts.
- **Inference (not proven by this prefix):** that the execution-phase admission is the sole cause
  of the 16th joining and of the RS trio recovery; that the Vlasic-side Paklarevo/Gornje Krčevine
  shift is a downstream consequence rather than ordinary divergence; and any generalization to
  other authored brigades or to the full 188-week slate.

## Scope limits

One 156-week prefix only. It cannot alone satisfy the full 188-week run, the full test suite, or
the Farz P-A §6 gates. No production code, tests, scenario, paint, canon or acceptance criteria
were edited; the dirty worktree was preserved. Per the handoff, no retry, retune, or second
campaign was started, and no automatic tuning is proposed.
