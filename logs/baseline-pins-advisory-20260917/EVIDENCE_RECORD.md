# Baseline Pins (advisory) failure — compact evidence record (2026-09-17)

Self-contained diagnostic record for the failed **Baseline Pins (advisory)** workflow run on
`codex/january-1993-operations-20260914`. Observed facts, locally reproduced results and unresolved
questions are labelled separately throughout.

Canonical calibration authority remains
[CALIBRATION_MASTER.md](../../docs/40_reports/CALIBRATION_MASTER.md). This file is a durable evidence
receipt for one advisory CI failure; it is not a calibration measurement record and not a competing master.
The January packet's own evidence lives in
[`logs/january-1993-operations-20260917/`](../january-1993-operations-20260917/EVIDENCE_RECORD.md) and is
**unchanged by this task**.

---

## 1. What was investigated (observed)

| field | value |
|---|---|
| workflow | `Baseline Pins` — `.github/workflows/baseline-pins.yml` |
| run ID | `35190324522` |
| job | `105101245112` — *"Baseline pins (advisory, non-blocking)"* |
| failed step | #5 **"Baseline regression"** |
| command | `node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts` |
| commit tested | `0033517b6724a7f05763c079cbddd323e9ee749e` |
| branch | `codex/january-1993-operations-20260914` |
| conclusion | failure — `Process completed with exit code 1` |
| CI runtime | Node **v22.23.2** (`node-version: 22` resolved), npm `ci --legacy-peer-deps`, 1368 packages |

### 1a. Correction to the task brief's identifiers

The task brief named a job `baseline-verify`, a step *"Verify baseline report signature"* and a command
`npm run sim:baseline:verify`. **None of those exist.** The run/job IDs are correct; the job, step and
command names are not. Verified:

- `package.json` defines no `sim:baseline:verify`, `sim:baseline:record` or `sim:baseline:pin` script. The
  only baseline scripts are `test:baselines` and `sim:scenario:baseline-ops:sensitivity`.
- The workflow's sole substantive step is *"Baseline regression"*, running the `tsx` invocation above.

The check is an **artifact SHA-256 comparison**, not a report signature check. Nothing in this path signs
or verifies a signature. See §3.

Raw log: [`ci_failure_excerpt.txt`](ci_failure_excerpt.txt) (paths sanitized to `<WORKSPACE>`);
runtime: [`ci_runtime_provenance.txt`](ci_runtime_provenance.txt).

**Log access:** the failed log WAS retrievable with the repository's authorized `gh` CLI
(`gh run view 35190324522 --log-failed`). The HTTP 403 reported previously was a limitation of the external
connector, not of access generally. No token or credential value appears in this record or in any committed
evidence file.

---

## 2. The verifier's actual contract (observed, from source)

`tools/scenario_runner/run_baseline_regression.ts`:

- **Scenario:** exactly one — `apr1992_188w` → `data/scenarios/apr1992_definitive_188w.json`, taken from
  `manifest.scenarios` in `data/derived/scenario/baselines/manifest.json`.
- **Duration: 188 weeks.** `runScenarioAndHash` calls `runScenario` **without** `weeksOverride`, so the
  scenario file's own `"weeks": 188` governs. The manifest's `weeks: 188` field is recorded metadata; it is
  not what drives the run.
- **Signed/compared content:** none. Eight whole artifacts are hashed byte-for-byte with SHA-256 —
  `activity_summary.json`, `control_delta.json`, `end_report.md`, `final_save.json`, `formation_delta.json`,
  `run_summary.json`, `watched_operations.json`, `weekly_report.jsonl`.
- **Expected values:** the `hashes` map in `manifest.json`, produced by a prior run under
  `UPDATE_BASELINES=1`. That variable was **not** set in CI and was **not** set in any command run for this
  task.
- **Failure mode:** `compareAgainstBaselines` collects every failure and throws one
  `BaselineRegressionError`; `main` catches it and sets exit code 1.

> **Boundary confirmed.** This is **not** equivalent to
> `data/scenarios/apr1992_definitive_188w.json --weeks 39`. The advisory verifier runs the same scenario
> file at its full 188 weeks and reaches all four historical checkpoints; the January candidate runs
> (n399–n403) override to 39 weeks and reach only jan1993. The two are different measurements of the same
> scenario file and their artifacts are not comparable.

---

## 3. Classification of the failure (observed)

**Signature difference — no.** There is no signature. **Missing artifact — no**; all eight were produced.
**Execution error — no**; the run completed and the scenario reached week 188. **Invalid metadata — no**;
the manifest parsed and its single entry was reached.

The failure is **eight artifact hash mismatches**, `kind: 'mismatch'`, one per pinned artifact:

```
Baseline regression FAILED: 8 failures across 1 scenario.
  apr1992_188w: 8 failures
```

---

## 4. Local reproduction (reproduced, not observed remotely)

| field | value |
|---|---|
| command | `node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts` |
| commit | `0033517b6` — working tree clean (`git status --porcelain` empty) |
| platform | Windows 11 (`win32`) |
| Node | **v22.23.2** — identical to CI |
| npm | 10.9.8; `package-lock.json` `lockfileVersion: 3`, unmodified |
| `UPDATE_BASELINES` | unset |
| output dir | `data/derived/scenario/_baseline_tmp/apr1992_188w` (gitignored via `.gitignore:98`) |
| exit status | **1** — same failure, same eight artifacts |

Raw: [`local_repro_excerpt.txt`](local_repro_excerpt.txt).

### 4a. Cross-platform hash identity — the determinism result

[`hash_comparison.txt`](hash_comparison.txt), produced by
[`compare_baseline_hashes.cjs`](compare_baseline_hashes.cjs):

| artifact | pinned | CI actual (ubuntu) | local actual (win32) | CI == local |
|---|---|---|---|---|
| `activity_summary.json` | `7d10356d…` | `fe8f0198…` | `fe8f0198…` | **YES** |
| `control_delta.json` | `4cb8219c…` | `e50d6ab6…` | `e50d6ab6…` | **YES** |
| `end_report.md` | `fea39f3b…` | `31e0eff8…` | `31e0eff8…` | **YES** |
| `final_save.json` | `e414dc69…` | `1c332850…` | `1c332850…` | **YES** |
| `formation_delta.json` | `bbd7260e…` | `d761d665…` | `d761d665…` | **YES** |
| `run_summary.json` | `b8ebc2c1…` | `559856bb…` | `559856bb…` | **YES** |
| `watched_operations.json` | `785a073b…` | `41d0d2a6…` | `41d0d2a6…` | **YES** |
| `weekly_report.jsonl` | `4c5cb00b…` | `0d33e38c…` | `0d33e38c…` | **YES** |

**8 of 8 byte-identical between Linux CI and Windows local; 8 of 8 drifted from the pin.**

Two independent executions, on different operating systems, different hardware and independent dependency
installs, produced the same SHA-256 for every artifact. This **rules out nondeterminism** as the cause. It
is a stronger determinism result than two runs on one machine would be, which is why a second same-machine
run was not performed.

> **Note, not a change.** `tests/scenario_golden_baselines_h2_3.test.ts:42` is `test.skip`-ped with the
> stated reason that *"byte-hash baseline comparison is platform-bound — Local Windows dev machine produces
> different SHA-256 of run_summary.json (and other artifacts) than Linux CI runners."* That premise is
> **contradicted** by the table above at this commit. The skip is left untouched: un-skipping it changes
> what CI guarantees and needs its own proposal. Recorded here so the stale rationale is visible, with
> `LANE-NIGHTSHIFT-PLATFORM-STABLE-MANIFEST` named in that file as the existing follow-up lane.

---

## 5. Cause (reproduced + history)

### 5a. The pin's provenance and the causal window

- The pinned hashes were written by `e607508bc` — *"chore(calibration): refresh the 188w baseline pins
  (owner-authorised) (#518)"*, 2026-09-12, measured at clean `2a8eb4244`.
- **`origin/main` is `e607508bc`.** That commit is both where the pins were blessed and the last
  **green** Baseline Pins run (run `34715162775`, 2026-09-12T19:46:56Z).
- `HEAD` (`0033517b6`) is **50 commits ahead of `origin/main`, 0 behind**. The causal window is exactly
  those 50 commits.

Every Baseline Pins run on this branch has been red — the only two are `e9024b61a` (run `35089760868`) and
`0033517b6` (run `35190324522`). The branch has never been green on this check and never could have been.

### 5b. What in that window changes the run

| kind | change |
|---|---|
| engine source | **29 commits** touching `src/sim/**` / `src/state/**` |
| consumed input | `data/derived/startup/apr_1992_initial_save.json` (+26/−2), via `c126ddec3` |
| pinned manifest | **untouched** — `git log e607508bc..HEAD -- …/baselines/manifest.json` is empty |

Largest engine deltas in the window: `commander/emit.ts` (+729), `pre_planned_operations.ts` (+635),
`commander/plan.ts` (+302), `triggered_operations.ts` (+250), `army_reserve_system.ts` (+68),
`subsegment_assignment.ts` (+53), `sector_offensive.ts` (+34). These are the April-1994 operational
calibration series, the isolated-position/occupation operations series, and the January-1993 packet.

All are already committed and recorded; none is introduced by this task.

### 5c. Why all eight moved, where the last accepted drift moved six

`docs/plans/2026-09-10-baseline-reblessing-packet.md` §1 records the previous accepted drift as **6 of 8**,
with `formation_delta.json` and `watched_operations.json` unchanged — the signature of a **consumed-input**
change. This window is **8 of 8**, a strict superset, because it changes **engine code** governing formation
lifecycle, reserves and operations — not only inputs. Both of the artifacts that held still last time are
precisely the ones that code touched.

Supporting datum: between the two red runs, `formation_delta.json` is byte-identical
(`d761d665…` at both `e9024b61a` and `0033517b6`) while the other seven moved. The only executable commits
between them are `772a67808` (predicate/reservation) and `41a148bf9` (Jackal objective), neither of which
creates or destroys formations. Outputs track the code changes structurally.

---

## 6. Engine health at the tested commit (reproduced)

The workflow header prescribes the diagnosis: *"compare the checkpoint scores against their floors via the
engine health gate. If the checkpoints still clear their floors, the engine is fine and the pins are
behind."* Run on the reproduction's own run directory — [`engine_health_gate.txt`](engine_health_gate.txt):

`node tools/engine_health_gate.cjs data/derived/scenario/_baseline_tmp/apr1992_188w --horizon 188w`
→ **exit 0, `PASS`**. No `--update`, no `--force`.

| hard check | value | bound |
|---|---:|---|
| `zero_eligible_ops` | 0 | ≤ 3 |
| `invalid_op_weeks` | 0 | ≤ 3 |
| `ghost_destroyed` | 1 | ≤ 3 |
| `stranded_brigades` | 12 | ≤ 16 |
| `matched_osids` | 668 | ≥ 644 |
| `checkpoint_jan1993` | **701** | ≥ 694 |
| `checkpoint_apr1994` | **706** | ≥ 674 |
| `checkpoint_apr1995` | **701** | ≥ 668 |
| `checkpoint_oct1995` | **668** | ≥ 641 |
| `consistency_failures` | 0 | ≤ 3 |
| `kw_ratio` | 3.72 | in [3.221, 4.358] |

**All ten hard checks pass. Anchors 31/31.** Advisories reported, not gated: `dead_ops_corrected`
14/62 ops and 15/95 axes with zero attacks; `planning_deaths` probe 316/316, sector_attack 31/65 of 381
distinct ops; `hollow_ratio` HRHB 0.69 / RBiH 0.99 / RS 0.38. `total_killed` 47,597,
`total_wounded` 177,070. These advisories are pre-existing and are not introduced or changed here.

Checkpoints against the recorded records — floors **694/674/668/641 unchanged**:

| checkpoint | pin authority `n392`/#518 | last recorded 188w (`ac3e5e152`) | **this reproduction (`0033517b6`)** | floor |
|---|---:|---:|---:|---:|
| jan1993 | 702 | 700 | **701** | 694 |
| apr1994 | 678 | 702 | **706** | 674 |
| apr1995 | 672 | 697 | **701** | 668 |
| oct1995 | 667 | 667 | **668** | 641 |

Against the most recent full-horizon evidence, **every checkpoint improved** (+1/+4/+4/+1). Against the
stale pin, three of four improved substantially (+28 apr1994, +29 apr1995, +1 oct1995) and jan1993 is −1,
still **7 above its floor** and **1 above the January packet's recorded minimum of 700**.

This is an accepted-change drift profile. It is not a regression profile.

### 6a. Incidental new datum — later checkpoints, recorded but NOT accepted

`git diff 41a148bf9..0033517b6 -- src/ data/ tools/` returns two hunks, both **wholly inside `//` comment
blocks** (`pre_planned_operations.ts` Mostar-heights citation, `triggered_operations.ts` Mostar citation).
The ledger's "comment-only" claim was checked against the diff, not taken on trust. **HEAD is executably
identical to the January production candidate `41a148bf9`.**

The advisory verifier's required 188-week run therefore also constitutes the first full-duration
measurement of that candidate's source. CALIBRATION_MASTER §C records April 1994, April 1995 and October
1995 as **NOT REACHED** by the January candidate; this run reaches them, at 706 / 701 / 668.

Internal consistency: this 188-week run scores jan1993 **701**, matching n403's **701/712** at
`--weeks 39` — the same January score by two different durations, on the same executable source.

> **This is a recorded measurement, not an acceptance.** It does not close, promote or validate January
> calibration; it does not alter any floor, pin, reference or gate; and it is not an owner sign-off. The
> eleven January mismatches remain open, Prusac remains OPEN and the Vranjevići/Kružanj reference and
> aggregation question remains UNRESOLVED. Promotion belongs to the calibration lane's own gates.

---

## 7. Conclusion

**Intentional, reproducible advisory drift. No code change warranted, and none was made to any
simulation, verification or reporting path.**

- The engine has not regressed — ten of ten hard checks pass, 31/31 anchors, every checkpoint above floor.
- The verifier is behaving exactly as specified.
- The pins are behind by 50 commits, because `origin/main` still sits on the commit that blessed them.

The pins were deliberately **not** refreshed. `docs/open_gates.yml` `R7-BASELINE-SIX-PIN` states that the
later calibration candidate *"must be measured separately under R6-CALIBRATION-INTEGRATION; its pins are not
refreshed."* Re-blessing is an owner-gated procedure
(`docs/plans/2026-09-10-baseline-reblessing-packet.md`), and the workflow header is explicit: *"do NOT
refresh the pins to make this green."*

**The advisory check remains RED on this branch, and that is the correct outcome.** It is advisory by
design, deliberately excluded from `main`'s required status checks. It is expected to stay red until the
branch's work reaches `main` and the pins are re-blessed under their own owner gate.

---

## 8. Verification path — no defect found

Focused tests over the verification/reporting path, run with Git Bash ahead of WSL `bash` on `PATH`:

```
npx vitest run tests/baseline_regression_ci_guardrails.test.ts \
               tests/baseline_regression_collects_all_failures.test.ts \
               tests/scenario_golden_baselines_h2_3.test.ts \
               tests/baseline_artifact_ownership.test.ts
```

**exit 0 — 14 passed, 1 skipped** (3 files passed, 1 skipped). The single skip is the platform-bound
`test.skip` discussed in §4a; it was skipped before this task and is skipped after it.

No implementation defect was found, so **no regression test was added** — there is no defect for one to
demonstrate. Adding a test here would assert current behavior, not a repaired contract.

### 8a. Documentation gates — two pre-existing failures, not caused and not fixed here

`receipts:validate` **OK**, `tasks:validate` **OK**, `gates:validate` **OK**.

`npm run plans:check` exits **1** ("plan index: STALE") and `tests/plan_index.test.ts` fails **3** tests, so
the targeted docs set is **74 passed / 3 failed of 77** — correcting the preceding ledger entry's "77/77"
and "`plans:check` up to date". All three failures share one root cause: `docs/plans/plan_index.yml` is
stale against `docs/plans/MASTER_ROADMAP.md`. **Both of those files are unmodified in this task's working
tree**, so running the check now is equivalent to running it at `0033517b6` — the failures are pre-existing,
introduced by the preceding commit's roadmap edit. Regenerating the index is unrelated to this closeout and
is left for the next task or the owner.

---

## 9. Facts vs. hypotheses

**Observed (remote):** run/job/step identity; exit code 1; eight mismatches with their expected and actual
hashes; CI Node v22.23.2; the run/green history of the workflow; `origin/main` at `e607508bc`.

**Reproduced (local):** exit code 1 with the same eight artifacts; all eight actual hashes byte-identical to
CI; engine health gate PASS with the figures in §6; 31/31 anchors; verification-path tests 14 passed /
1 skipped; the comment-only nature of `41a148bf9..0033517b6`.

**Eliminated by evidence:**

- *Node version difference* — the brief flagged `node-version: 22` vs the recorded `v22.23.2` as worth
  inspecting. CI resolved `22` to **v22.23.2**, and the local reproduction ran **v22.23.2**. Same version;
  not a factor.
- *Nondeterminism* — refuted by byte-identical cross-platform hashes (§4a).
- *Verification or reporting defect* — refuted by §2, §3 and §8.
- *Simulation regression* — refuted by §6.
- *Signature mismatch* — there is no signature in this path (§2, §3).

**Unresolved / not addressed here (all pre-existing, none opened by this task):**

1. When and under which gate the pins are next re-blessed — **owner decision**, `R7-BASELINE-SIX-PIN` /
   `R6-CALIBRATION-INTEGRATION`.
2. The stale platform-bound rationale on `scenario_golden_baselines_h2_3.test.ts` (§4a) —
   `LANE-NIGHTSHIFT-PLATFORM-STABLE-MANIFEST`.
3. The `dead_ops` / `planning_deaths` / `hollow_ratio` advisories (§6), reported by the gate and not gated.
4. The eleven January mismatches, Prusac (**OPEN**), and Vranjevići/Kružanj (**UNRESOLVED**).
5. The stale `docs/plans/plan_index.yml` behind `plans:check` and the 3 `plan_index.test.ts` failures
   (§8a) — pre-existing, one command to regenerate, left to the next task or the owner.

---

## 10. Reproduction commands

```bash
# Remote evidence (authorized gh CLI)
gh run view 35190324522 --repo horkesh/A-War-Without-Victory --log-failed
gh run view --repo horkesh/A-War-Without-Victory --job 105101245112 --log

# Local reproduction — the verifier's own scenario and duration (188 weeks), UPDATE_BASELINES unset
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts   # exit 1

# Prescribed health diagnosis (no --update, no --force)
node tools/engine_health_gate.cjs data/derived/scenario/_baseline_tmp/apr1992_188w --horizon 188w  # exit 0

# Hash comparison
node logs/baseline-pins-advisory-20260917/compare_baseline_hashes.cjs <ci_failed_log> <local_run_log>
```

## 11. What this task did not change

Baseline pins (`data/derived/scenario/baselines/manifest.json`), the three `preserve/*` tags, `main`,
`gh-pages` and the published viewer are **all unchanged**. No baseline-recording or pin-refresh command was
run; `UPDATE_BASELINES` was never set. No checkpoint reference, initial ownership, OSID aggregation,
historical operation objective, threshold, floor or test assertion was altered. No simulation, verification
or reporting source file was modified. **January calibration remains open.**
