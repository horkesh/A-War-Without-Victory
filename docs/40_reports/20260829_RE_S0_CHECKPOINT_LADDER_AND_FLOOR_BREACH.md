# RE — S0 checkpoint ladder, floor breach, and lane divergence

**Date:** 2026-08-29
**Author:** RE lane owner (session), measurements independently reproduced from the run artifacts
**Status:** evidence capture — no engine, scenario, calibration data, manifest, or canon file changed

## Why this report exists

The measurements below come from `runs/re_s0_*`, which is **gitignored** (`.gitignore:87`) and lives
only on the local machine. It is the per-commit evidence that attributes the current 188w baseline
drift and the jan1993 floor breach. Losing `runs/` would lose the attribution and force two or more
188-week re-runs to recover it. This report captures the figures into tracked history so that cannot
happen.

Every number here was re-measured by the report author with `tools/engine_health_gate.cjs
<run> --horizon 188w` against the same run directories, not copied from a summary.

## Floors

`data/calibration/engine_health_thresholds.json`, `188w` block (last moved 2026-08-26, `e42e64908`;
untouched by any commit discussed here):

| checkpoint | floor |
|---|---:|
| jan1993 | **694** |
| apr1994 | 648 |
| apr1995 | 642 |
| oct1995 | 622 |

`jan1993` is the **active** lane under the 2026-08-26 sequential-calibration directive and is pinned
tight at measured-3. The other three are pinned loose as uncalibrated, so they pass easily and are
not evidence of health.

## The ladder

All runs Node 22, `git_dirty:false`, scenario hash `46834a3b41033bff`, scored with one tool binary.

| commit | what landed | jan1993 | apr1994 | apr1995 | oct1995 |
|---|---|---:|---:|---:|---:|
| `7b6358d28` | incl. `5a2e152e3` elite commitments | **694** | — | — | 656 |
| `175bea593` | ops-only attack doctrine | **684** ❌ | — | — | 631 |
| `0f341929a` | operation movement ownership | 688 | — | — | 646 |
| `037396e3c` | operation planning ownership | 680 | 652 | 645 | **611** ❌ |
| `63671dd8c` | *(sibling lane)* staged opening plans | 688 | 661 | 656 | 637 |
| `47d6d9358` | *(this lane)* branch HEAD | 688 | 656 | 654 | 633 |

❌ marks a value below its floor at that commit.

## Findings

**1. The floor was not stale. The regression is real.** At `7b6358d28` jan1993 sits exactly on 694 —
on the floor, consistent with that floor having been set at measured-3 from n374's 697. The breach
begins at the next commit and never returns.

**2. The primary cause is `175bea593`, the ops-only attack doctrine commit** — jan1993 694 → 684,
crossing the floor. That commit deletes 192 lines from `bot_brigade_eval_attack.ts`, removing a whole
class of capture-capable independent brigade attack, so it is territory-moving by construction.

An earlier attribution in `PROJECT_LEDGER.md` named `037396e3c` as the cause because that commit
regenerated `data/derived/startup/apr_1992_initial_save.json` with five `planning_duration` values
changed `1 → 3/4` across the whole VRS April–May 1992 opening. That finding is true and the file is a
committed turn-0 photograph of a real behavioural change — but it is **not** what broke the active
lane. Plausible mechanism was mistaken for attribution; the ladder is what settles it. This is the
2026-04-01 lesson in `docs/life_lessons/calibration.md` ("expert hypotheses on regression causes need
mechanistic verification before acting") recurring.

**3. `037396e3c` is nonetheless the worst commit at the far horizon** — oct1995 646 → **611**, eleven
below its floor, together with the largest single cascade drop (37 → 26). Both are partially repaired
downstream.

**4. Attribution is unavailable at rung 4 and that is expected.** `op_schedule_diff` against n382
reports 48 vs 40 operations and 66.7% differing at corps+objectives, far past the 20% threshold at
which `CALIBRATION_MASTER` declares a checkpoint delta unattributable. A structural change to
operation selection always exceeds it; re-running does not fix it. The per-commit ladder above is
what substitutes for rung-4 attribution here.

## Lane divergence — an open owner question

```
git merge-base 63671dd8c 188f6e5d6  ->  037396e3c
63671dd8c is NOT an ancestor of 188f6e5d6
```

After the shared parent `037396e3c`, RE's history forks:

- **sibling lane:** `63671dd8c` "preserve staged opening plans and enclave chain"
- **this lane:** `7c472e065` then `a3f14d7f4`

They tie at jan1993 (688) and the sibling lane is ahead at every other checkpoint: **apr1994 +5,
apr1995 +2, oct1995 +4**, and cascade +3 (28 vs 25).

The sibling lane also already carries a **clean S0 pair**: `re_s0_pair_a_63671dd8c` and
`re_s0_pair_b_63671dd8c` are byte-identical across `final_save.json`, `control_delta.json`,
`run_summary.json`, `weekly_report.jsonl` and `formation_delta.json` (verified by SHA-256). That is
the S0 capture the engine-integrity plan has been owing since the reconcile.

**Which lane RE continues on is not a UI-branch decision and is not settled here.**

## What is NOT wrong

- **Enclave guard 9/9 INTACT.** Goražde, Bihać, Teočak and all four Sarajevo-core cells hold;
  Srebrenica and Žepa fall on schedule. `verify_checkpoints.cjs` exits 1 solely on the Operation
  Farz / "Uragan 95" discriminator, which `CALIBRATION_MASTER` already carves out as separately
  known-red. **This is not a §6 breach** and must not be reported as one — that tool's result string
  is generic.
- The two 4-week manifest entries (`baseline_ops_4w`, `noop_4w`) pass, but they carry no
  `init_control`, formations or territory, so their green detects none of these changes and is not
  evidence of health.

## Standing prohibition

The baseline manifest must **not** be re-reconciled on this evidence or from a UI branch. The
one-time reconcile authority was spent at `8511512f9` (exactly 19 hashes, 2026-08-27) and every
commit above lands after it. `CALIBRATION_MASTER` grants RE no calibration tuning. Refreshing a
golden from a branch that touches zero sim-path files would bury six commits' behavioural change
where nobody would look for it.
