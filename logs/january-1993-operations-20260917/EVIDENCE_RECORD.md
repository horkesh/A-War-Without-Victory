# January-1993 operations packet — compact evidence record (2026-09-17)

Independent, self-contained record of the measured January candidates. Raw versus derived evidence is
labelled throughout. Canonical authority: [CALIBRATION_MASTER.md](../../docs/40_reports/CALIBRATION_MASTER.md);
this file is the durable evidence receipt, not a competing master.

## 1. Source candidates

| candidate | commit(s) | production patch | notes |
|---|---|---|---|
| n399 / n400 | working tree on `e9024b61a` (`git_dirty true`) | `n396_worktree.patch` (SHA-256 `d971f361…`) | isolated-position predicate correction only |
| n401 / n402 | working tree on `772a67808` (`git_dirty true`) | `final_candidate_production.patch` (`ba05e3c0…`) + `n401_pjesivac.patch` (`fa3b5beb…`) | predicate + reservation, then Pješivac-Kula objective |
| **n403 (current)** | **`41a148bf9` (`git_dirty false`)** | **committed history** | same production source, clean tree |

`n401_pjesivac.patch` SHA-256 `fa3b5beb216b02e23a954ab9020f2aefc2552c3e7431ac1d357bea4d8336c0e7` equals the
patch hash recorded in the ledger/calibration provenance — verified, not copied. The canonical patch for the
current candidate is `git show 41a148bf9` (and `git show 772a67808` for the predicate/reservation commit).

## 2. Scenario / runtime / inputs (all January runs)

- Scenario: `data/scenarios/apr1992_definitive_188w.json`
- Duration override: `--weeks 39`; checkpoint **t39 = 4 January 1993**; launcher `--unique --out runs` (no `--map`)
- Runtime: Node `v22.23.2`; no §6/override env vars
- Input digest (over the 31 scenario/data inputs): `f8ace65496620fad1c8219a9dcaa8e2c5cdba2f3f541b156c7ba112b4748caaf`

## 3. Painted reference hashes used for the January comparison

| reference | SHA-256 |
|---|---|
| `data/source/calibration/painted_control_jan1993.json` | `abb4f9d20472016d21be4130a1e555b7c7f82094612e7e1777d9916e10a0ba24` |
| `painted_control_apr1994.json` | `afacdc25d9eb96344cdb48ccb7122d705fe1a3d9706cce0f43e6e0fdba191a4a` |
| `painted_control_apr1995.json` | `c3429f6e4e4afa0778619fcf1f999089ff26068487947e1c5fe3f6b391ba61f7` |
| `painted_control_oct1995.json` | `54f29d6e7a5158c521a83983476da5d832f9b4a66a83b2d69673f8db04e50429` |

## 4. Run identities (raw, local-only under `runs/`)

| run | final_state_hash | final-save SHA-256 | source | dirty |
|---|---|---|---|---|
| `apr1992_definitive_188w__9137f75e9f35be20__w39_n399` | `31b0388ecdacd0c4` | `31b0388ecdacd0c42702ccc64e0239f64059bc4445715c164c38e75757ac5c48` | `e9024b61a` | true |
| `…_n400` | `31b0388ecdacd0c4` | `31b0388ecdacd0c42702ccc64e0239f64059bc4445715c164c38e75757ac5c48` | `e9024b61a` | true |
| `…_n401` | `e3b6b2d34dd1101c` | `e3b6b2d34dd1101c601b11abd30c2c060717995a0fe748f662214d4ebecf6899` | `772a67808` | true |
| `…_n402` | `e3b6b2d34dd1101c` | `e3b6b2d34dd1101c601b11abd30c2c060717995a0fe748f662214d4ebecf6899` | `772a67808` | true |
| **`…_n403`** | **`e3b6b2d34dd1101c`** | **`e3b6b2d34dd1101c601b11abd30c2c060717995a0fe748f662214d4ebecf6899`** | **`41a148bf9`** | **false** |

## 5. Artifact comparison (n401 vs n402 vs n403 — byte-identical)

Seven artifacts compared by SHA-256 and found identical across all three runs. `run_meta.json` was **not**
compared and is **not** claimed identical (its `out_dir`/provenance path differs). No claim is made that
all possible artifacts were compared.

| artifact | SHA-256 (n401 = n402 = n403) |
|---|---|
| `initial_save.json` | `45bcfd9746aabaa85e49d2ce2a44efffdd36ecb7a53966edd450ed419f67a3bf` |
| `final_save.json` | `e3b6b2d34dd1101c601b11abd30c2c060717995a0fe748f662214d4ebecf6899` |
| `run_summary.json` | `0cffc21cb122629201e86796d278dffb97557d7967a22594b19b823a298ad435` |
| `control_delta.json` | `01aa30585e7f0457815c39efffe2faab829d25f637e8635c0619881b4eb6d2b0` |
| `weekly_report.jsonl` | `cf2406616ac79a8308befaa6281901b52448e4ab560f373e7dcc15edde9cc57f` |
| `formation_delta.json` | `939af5a9a956c9e7ae09983576ef9eac8801dd138939b5f2e5b00ffa0909cf62` |
| `activity_summary.json` | `8c0a93b82ea5662aa9d38a260129cf24798b46d635358ddbae08391d8469b5cf` |

## 6. Operation / battle / control receipts (from n403 `final_save.json` / `operation_aars.json`)

**Čardak (`op:zavidovici:cardak_2`).** Control event: `RS → RBiH`, `mechanism: combat`, `turn 23`, battle
`23:op:zavidovici:cardak_2:arbih_303rd_vitezka_mountain:null`, attacker `arbih_303rd_vitezka_mountain`.
Operation: `arbih_3rd_corps:Operacija Izlaz:t21`, `operation_type sector_attack`, started t21, outcome
`success`; axis `cmd_arbih_3rd_corps_main` participants
`arbih_303rd_vitezka_mountain`, `arbih_314th_slavna_liberation`, `arbih_329th_mountain`. t23 = 1992-09-14.

**Pješivac-Kula (`op:stolac:pjesivac_kula_2`).** Control event: `RS → HRHB`, `mechanism: combat`, `turn 15`,
battle `15:op:stolac:pjesivac_kula_2:hrhb_1st_brigade_mostar:null`, attacker `hrhb_1st_brigade_mostar`,
`defender_brigade: null`, `defender_kind: militia`, `defender_militia_pool_key: stolac:RS`, outcome
`decisive_victory`, `power_ratio 55.33`. Operation `hvo_southeast_herzegovina:Operation Jackal:t8`, outcome
`success`. Defence power is the militia-only denominator
`max(5000, 3169) × 0.05 × 0.25 = 62.5`; no combat value was adjusted. The RS↔HRHB Graz truce was declared
**before** Jackal (t8–t15); authored operations are not gated by the truce's bot target filter and no truce
break is recorded. Outstanding truce-scope/design interpretation is retained separately.

## 7. Complete January mismatch list (n403, t39)

`op:donji_vakuf:prusac_2` RS→RBiH · `op:foca:donje_zesce` RBiH→RS · `op:ilijas:krivajevici` RS→RBiH ·
`op:jablanica:doljani_2` RBiH→HRHB · `op:kalesija:seher_2` RS→RBiH · `op:konjic:glavaticevo_2` RS→RBiH ·
`op:konjic:ljuta` RS→RBiH · `op:maglaj:jablanica` RBiH→RS · `op:mostar:vranjevici_2` RBiH→RS ·
`op:trnovo:tosici` RBiH→RS · `op:vlasenica:sebiocina` RBiH→RS.

Observed history (10 of 11 frozen turn-0 discrepancies with no control event) is kept distinct from
diagnosed cause; "no control event through t39" is not sufficient to classify a cell as a missing-operation
defect. April 1994 / April 1995 / October 1995 are **NOT REACHED** by this candidate.

## 8. Tests, exit statuses, limitations

- `npx tsc --noEmit` — exit 0 (recorded at the n401 commit).
- `tests/pre_planned_operations.test.ts` — **76/76 passed** (includes the objective-ordering / Hatelji-exclusion test).
- Adjacent pre-planned/commander/truce/snapshot/operation suites 694/694; anchor + reporting contracts 9/9.
- **Full-suite qualification (not green):** the reported full invocation `npm run test:vitest` (balanced, 4
  shards) returned top-level **exit 1**. Two separate causes: (a) the expected negative-control child output
  from `tests/fixtures/vitest_balanced/deliberate_failure.fixture.ts` (its parent test passes); and (b) a
  real `Error: Hook timed out in 10000ms` in `tests/runtime_dependency_resolution.test.ts` (shard 3), which
  passes **12/12 in isolation**. This is **not** "full suite entirely green".
- Limitations: n403 stops at t39; determinism is established only for this candidate at this scope. The
  reference files are owner-corrected (some unsourced); jan1993 is scored against
  `painted_control_jan1993.json` revision 4.

## 9. Reproducible commands

- Run: `npx tsx tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --weeks 39 --unique --out runs`
- Checkpoint score: `node tools/verify_checkpoints.cjs runs/apr1992_definitive_188w__9137f75e9f35be20__w39_n403`
- Painted-vs-sim mismatch list: `node tools/compare_painted_vs_sim.cjs <run_dir> --target jan1993`
- Run comparison: see `compare_n401_n402.cjs`; receipts: `izlaz.cjs`, `cardak_prov.cjs`, `pjesivac_explain.cjs`.

## 10. Durable vs local-only

- **Tracked here (this lane) and on the pushed branch:** the production patches, the extraction/comparison
  scripts, `full_suite.log`, `MANIFEST.txt`, and this record.
- **Local-only (not tracked):** the raw run directories under `runs/` (gitignored), including n399–n403 and
  their large `final_save.json`/`weekly_report.jsonl` artifacts. They remain in place at the paths above.
