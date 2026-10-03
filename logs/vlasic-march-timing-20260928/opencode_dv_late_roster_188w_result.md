# Donji Vakuf late-roster — single 188-week measurement (2026-09-29)

**Verdict: PASS on every checkpoint-fit and named-seat criterion of
`opencode_dv_late_roster_188w_handoff.md`. One campaign, child exit 0, one unique run, no retry,
tuning, edit or full suite.** w39/w104/w156 are unchanged from the n13 prefix (707/707/706), April
1995 keeps all 40/40 protected anchors, and October 1995 comes out **671/712** against retained
n0's **669/712** (current-reference replay; n0's own stale summary says 668/712). No critical
anomaly. The **Farz P-A §6 no-merge gate remains open** and this run fails it — identically to
retained n0 — so a score pass does not by itself authorize merge or baseline adoption.

## Run identity and raw facts

| Fact | Value |
|---|---|
| Command (run once, repo root, `pwsh`) | `node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --weeks 188 --unique --out runs` |
| Child exit | **0** (`opencode_dv_late_roster_188w.exit`) |
| Unique run dir | `runs/apr1992_definitive_188w__6deb5845c150c196__w188_n14` |
| final_state_hash | `34cd42f71e70c2ba` |
| final_save.json sha256 | `34cd42f71e70c2ba056718d619a3b5d17cd5ddf0fd0b8c9570222c8412042b20` |
| initial_save.json sha256 | `413ce64acaa420e130e293230dfa470dcaa46c5b4df2c6d3706d7e31cb8455e1` |
| Initial save vs retained n0/n9/n12/n13 | **byte-identical** (same sha256) |
| weekly_report rows | **188** |
| Final unresolved refs | **0** (`FINAL_SEAL kind=final_save turn=188 unresolved=0`) |
| Pre-run dirs → post-run dirs | 13 → 14 (the only new dir is `…_w188_n14`; `…_w188_n5` is a pre-existing incomplete dir) |

Raw evidence paths:
- child stdout/stderr: `opencode_dv_late_roster_188w.out`; exit: `opencode_dv_late_roster_188w.exit`
- pre-run snapshot: `opencode_dv_late_roster_188w_started.txt`, `opencode_dv_late_roster_188w_prerun_dirs.txt`
- repo instrument replay: `opencode_dv_late_roster_188w_verify_checkpoints.out` (`verify_checkpoints.cjs`, exit 1 — see P-A below)
- extracted facts: `opencode_dv_late_roster_188w_extract.json`; analysis log `opencode_dv_late_roster_188w_analysis.out`
- retained comparators: `…__w188_n0`, `…__w156_n9`, `…__w156_n12`, `…__w156_n13`

## Checkpoint fits, anchors, failed IDs (all from this one run)

| Checkpoint | This run (n14) | n13 prefix | retained n0 (188w) | Required | Result |
|---|---|---|---|---|---|
| w39 January 1993 | **707/712** (31/31) | 707/712 | 707/712 | ≥707 | PASS |
| w104 April 1994 | **707/712** (32/32) | 707/712 | 707/712 | ≥707 | PASS |
| w156 April 1995 | **706/712** (40/40) | 706/712 | 703/712 | ≥705, 40/40 | PASS |
| w188 October 1995 | **671/712** (31/31) | — | 668/712 (summary) / 669/712 (replayed vs current refs) | ≥ retained n0 | PASS |

**Failed anchor IDs: none at any checkpoint.** Every epoch scored all its anchors (31/31, 32/32,
40/40, 31/31), including all 40 April anchors. `verify_checkpoints.cjs` independently replays the
run's own `control_events` against the current painted references and reproduces 707/707/706/671
(only deviation from the run summary is that it also confirms n0's stale-summary figure risen to
669).

Handoff discrepancy, measured: the handoff cites "retained n0's 669/712"; n0's own
`run_summary.json` says **668/712**. 669 is what n0 scores when replayed against the current
painted files. The candidate beats both.

## Named seats at w156 — from this run only

Computed from this run's own `final_save.political.control_events` replayed over its initial
controls to week 156 (same semantics as `verify_checkpoints.cjs`). **The w156 controller map is
byte-identical to n13 (0 differences across all 712 OSIDs), so nothing here is a stitched
comparison.**

| Seat | Expected at w156 | This run w104 | This run w156 | This run w188 (reported separately) |
|---|---|---|---|---|
| Donja Mahala `op:orasje:donja_mahala` | HRHB | HRHB | **HRHB** | HRHB |
| Doljani_2 `op:jablanica:doljani_2` (incl. w104) | RBiH | **RBiH** | **RBiH** | RBiH |
| Ljubunci `op:prozor:ljubunci_2` | HRHB | HRHB | **HRHB** | HRHB |
| Lug_2 `op:prozor:lug_2` | HRHB | HRHB | **HRHB** | HRHB |
| Paroš `op:prozor:paros` | HRHB | HRHB | **HRHB** | HRHB |
| Gornja Presjenica `op:trnovo:gornja_presjenica` | RS | RS | **RS** | RS |
| Donji Vakuf_2 `op:donji_vakuf:donji_vakuf_2` | RS | RS | **RS** | **RBiH** (lost t184) |
| Korenici `op:donji_vakuf:korenici` | RS | RS | **RS** | RS |
| Oborci_2 `op:donji_vakuf:oborci_2` | RS | RS | **RS** | RS |
| Paklarevo `op:travnik:paklarevo` | RBiH | RS | **RBiH** | RBiH |
| Gornje Krčevine `op:travnik:gornje_krcevine` | RBiH | RS | **RBiH** | RBiH |
| Varošluk `op:travnik:varosluk` | RS | RS | **RS** | RS (no control event in 188 weeks) |

**All twelve named seats hold the required controller at w156.** Post-w156 divergence: only
`donji_vakuf_2` changes (RBiH at t184); the other eleven keep their w156 controller to w188.

## Donji Vakuf trio, 16th Krajina, operation windows — measured

- `Operation Donji Vakuf` (vrs_1st_krajina): **t28–t36, success, Brilliant (5★)**, initial_strength
  **9646**, **7 participants incl. `rs_16th_krajina_motorized`**, captured 7 objectives including
  the trio `oborci_2`, `donji_vakuf_2`, `korenici` and `op:travnik:gornje_krcevine`.
- Trio provenance is ordinary combat (battles in `weekly_report.jsonl`; control events
  `mech=combat`, `op=null`, battle-id attributed):
  | t | target | attacker | defender | ratio | outcome |
  |---|---|---|---|---|---|
  | 32 | `op:donji_vakuf:oborci_2` | `rs_16th_krajina_motorized` | `arbih_705th_slavna_mountain` | 3.17 | decisive_victory |
  | 33 | `op:donji_vakuf:donji_vakuf_2` | `rs_16th_krajina_motorized` | `arbih_770th_slavna_mountain` | 4.77 | decisive_victory |
  | 34 | `op:donji_vakuf:korenici` | `rs_16th_krajina_motorized` | `arbih_705th_slavna_mountain` | 2.41 | decisive_victory |
- 16th Krajina timeline (`brigade_temporal_log.jsonl`): t26–28 `op:teslic:blatnica_2` in transit →
  **t29 `op:donji_vakuf:torlakovac_2` under `vrs_1st_krajina:Operation Donji Vakuf:t28` (execution)**
  → t30–31 staging → t32 `oborci_2` → t33 `donji_vakuf_2` → t34 `korenici` (op in recovery) →
  t36 released. No engagement gap, no generic-operation claim.
- `Operation Jajce`: t19–28, success, 3 participants — unchanged.
- Vlašić cells: t29 `gornje_krcevine` RS (`rs_1st_banja_luka` over `arbih_706th`, ratio 12.81);
  t153 `paklarevo` RBiH (`arbih_17th_vitezka_mountain` over `rs_1st_armored`, 2.71); t154–156
  `gornje_krcevine` contested (stalemate 0.99, catastrophic 0.46, decisive 5.93) → RBiH t156,
  holds to w188. `varosluk` never had a control event or battle in 188 weeks.
- Late loss of `donji_vakuf_2` at t184: `arbih_17th_vitezka_mountain` vs
  `rs_2nd_krajina_infantry`, ratio 115.62, decisive — same endpoint as retained n0 (not in the
  n0→n14 w188 diff).

## Final controller differences vs retained comparators

- **n13 (w156) → this run (w156): 0** — the 188-week trajectory passes through the prefix state
  unchanged.
- n9 (w156) → this run (w156): 2 — `op:travnik:gornje_krcevine`, `op:travnik:paklarevo` RS→RBiH.
- n12 (w156) → this run (w156): 3 — the Donji Vakuf trio RBiH→RS.
- n0 (w188) → this run (w188): **12** (all measured, no inferred direction):
  `op:bosanski_novi:krslje_2` RS→RBiH; `op:bosanski_petrovac:dobro_selo_2` RBiH→RS;
  `op:bosanski_petrovac:jasenovac_2` RBiH→HRHB; `op:bosansko_grahovo:ugarci` HRHB→RS;
  `op:donji_vakuf:prusac_2` RBiH→RS; `op:kljuc:hadzici` RBiH→RS; `op:mrkonjic_grad:gerzovo_2`
  RS→HRHB; `op:orasje:donja_mahala` RS→HRHB; `op:sanski_most:jelasinovci`,
  `op:sanski_most:lusci_palanka_2`, `op:sanski_most:skucani_vakuf_2` RS→RBiH;
  `op:travnik:gornje_krcevine` RS→RBiH. Western-Bosnia cascade site matched 31 cells (n0: 31) —
  no cascade regression.

## Anomalies and diagnostic failures

| Run | total | critical | warnings | info |
|---|---|---|---|---|
| **n14 (this run)** | **27** | **0** | 6 | 21 |
| n0 (188w retained) | 26 | 1 (`hvo_central_bosnia` combat-ineffective) | 5 | 20 |
| n13 (156w prefix) | 23 | 0 | 3 | 20 |

No new anomaly category; no critical anomaly. n14 warnings: `frontline_density_imbalance`
(7 sectors), `osid_seesawing` (`op:srebrenica:obadi`, 3+ flips), `empty_contested_sector`
(`sector:vrs_1st_krajina:6`), `weaker_faction_attack_imbalance` (RBiH vs HRHB),
`adjacent_uncontested_territory` (7 cells incl. `donji_vakuf:korenici`, `jemanlici`,
`prusac_2`, `travnik:varosluk`), `brigade_far_from_home_unassigned` (`hrhb_travnik_brigade`).
The longer horizon adds the seesawing/empty-sector warnings relative to the 156w prefix.

Diagnostic failures:
- `op_injection_validation`: 19 warnings, **0 errors** — identical count to n0 and n13
  (pre-existing authored-formation misses, e.g. `arbih_1st_cerska`, `visoko_breza` guards).
- Turn seals t63 and t64 emitted `unresolved=1` for `hrhb_travnik_brigade` ("fell through sector
  pipeline, corps=hvo_central_bosnia", 1395 pers); resolved from t65 and by the final seal. This
  is **pre-existing**: the n13 prefix log has the identical t63/t64 pair. Final unresolved refs: 0.
- `destroyed_brigades`: 25 entries; `rs_16th_krajina_motorized` not among them.
- `recovery_status.state_protected: true`, `reporting_split_complete: true`.

## Gate status (score pass cannot waive these)

- **Farz P-A §6 — OPEN, fails here.** `verify_checkpoints.cjs` exit 1: the 2nd-Corps signature
  cell `op:lukavac:brijesnica_donja_2` was taken t167 by `arbih_7th_vitezka_muslim_liberation`
  (`arbih_3rd_corps`), not by 2nd Corps at t≥160. **The retained n0 fails the same gate** (t168,
  3rd Corps), so this is pre-existing and the handoff already keeps it open. Enclave guard: 7/7
  holds and 2/2 falls on schedule; eastern capture provenance clean.
- Full suite, April-floor-by-other-runs, baseline adoption, merge: not attempted; open per handoff.

## Measured facts vs inference

- **Measured:** exit 0, one unique run, byte-identical initial save, 188 rows, final unresolved 0,
  the four checkpoint fits/anchor counts with zero failed IDs, the w156 named-seat table from the
  run's own control events, the 16th's t28–36 route and roster, DV/Jajce AAR windows and captures,
  trio and Vlašić battle provenance, the controller diffs, the 12-cell w188 difference, anomaly
  and injection counts, the P-A failure.
- **Inference (not proven here):** that the execution-phase admission is the sole cause of the
  16th joining and of the RS trio recovery; that the Vlašić-side shifts are downstream of it
  rather than ordinary divergence; any generalization to other authored brigades.

## Scope discipline

One 188-week campaign, exactly the authorized command. No production code, tests, scenario,
paint, canon or acceptance criteria edited; no retry, retune, second campaign, map refresh, merge,
baseline adoption or October work. Worktree dirty changes preserved.