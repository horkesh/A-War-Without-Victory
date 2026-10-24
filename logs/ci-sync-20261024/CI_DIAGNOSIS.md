# Baseline Pins CI diagnosis — 2026-10-24

## Verdict

GitHub Actions run [39968256252](https://github.com/horkesh/A-War-Without-Victory/actions/runs/39968256252) is an honest advisory baseline-pin failure, not a CI or harness failure. Its sole job, [120463734255](https://github.com/horkesh/A-War-Without-Victory/actions/runs/39968256252/job/120463734255), installed dependencies successfully, completed the canonical 188-week scenario, and exited 1 after reporting eight artifact hash mismatches.

The committed manifest was last owner-authorized at `e607508bc` and is byte-unchanged from that commit through pushed HEAD `668de6f80`. The refresh commit is an ancestor of the pushed HEAD. The parent branch run [39873964794](https://github.com/horkesh/A-War-Without-Victory/actions/runs/39873964794) already reported eight mismatches. Commit `668de6f80` added the BEHAR-I gameplay opportunity and changed the April 1995 painted reference; compared with its parent CI run, six actual artifact hashes changed again while `formation_delta.json` and `watched_operations.json` stayed identical.

| Artifact | Committed manifest (`e607508bc` and current) | Run 39968256252 actual |
|---|---|---|
| `activity_summary.json` | `7d10356d0715db21370c3f7d6acc15db7948856c80962363f505641b48bfbd4e` | `a59b868cdde127a35b0a6012ff72848808f73a0a888e44732442c5bf42771ce5` |
| `control_delta.json` | `4cb8219cf3b7dcbfdd66476a7af5bbfa0709fdd24e0a37d6900a9b808d6acb85` | `de5cb5b59eb0abb2aba9f45a75e774d5d44bf73ed3f785fb59f2ed02d3da840c` |
| `end_report.md` | `fea39f3bf7eda907b290e3bd2579ac050c847ae2f783153117f95f1f94d0cf8d` | `c559c5ef8e9fc2ee7ab79028c77e986c463462168f4e563f5f7dc3f6253dde7a` |
| `final_save.json` | `e414dc69f6e875fcd2a7394582921f20ca03123112baf12e9308c50035c29c50` | `ff003195e966d163c27916cb0b9bb6293e9e8b0f2312684688318761cf6def34` |
| `formation_delta.json` | `bbd7260e219d311bea201053d0d7c913f4b30b83bcead72b05d5f2c957566cb1` | `ba416ce5b450f027a5cbbba941c9a68a286d8dbcb4f75041a1ef2279d4626c72` |
| `run_summary.json` | `b8ebc2c1ff4522fed0651be224ba360fcfeff0da4e6983f27d9df008eeba98cb` | `f8429e29760314d256f822d2f4d5aa9c997d5cfc053035e1859dcac560df71d5` |
| `watched_operations.json` | `785a073b9312e34d20ba143915478ab768ce7847ad337b121f98491df8325b18` | `41d0d2a62eac1d57c3d0bd1f53d5a46df3857b0d3598bc971af7bfa96b9858b6` |
| `weekly_report.jsonl` | `4c5cb00bde51a15e2f7766d31ececb03e86d81bfcf1f93a4c04c01cbda31b9cf` | `b7024560561a2e8eceae114c77b6003d939163d81971e9f610842f2e90de296f` |

The latest hashes also occur in retained n91/n92/n93 preservation evidence, including the final-save and run-summary hashes. This connects the CI result to the retained candidate rather than to a new CI-only divergence.

## Permissible repair disposition

No baseline or harness repair is justified. Making this workflow green would require one of three disallowed actions: adopting new baseline hashes, weakening the comparison/workflow conclusion, or reverting accepted gameplay/reference changes. `.github/workflows/baseline-pins.yml` explicitly requires the advisory workflow to remain honestly red when pins are stale and forbids refreshing pins merely to obtain green.

One stale comment-only defect was corrected in `.github/workflows/event-system-ci.yml`: its header now describes the two live event gates and the separately owned advisory Baseline Pins workflow. Executable YAML is unchanged.

## Commands and evidence

- `gh run view 39968256252 --repo horkesh/A-War-Without-Victory --json ...` — exit 0; metadata saved in `run-39968256252.json`.
- `gh run view 39968256252 --repo horkesh/A-War-Without-Victory --log-failed` — retrieval exit 0; CI step itself exited 1 after the eight mismatches; saved in `run-39968256252-failed.log`.
- Parent comparison log for run 39873964794 — retrieval exit 0; saved in `run-39873964794-failed.log`.
- `node node_modules/vitest/vitest.mjs run tests/baseline_regression_collects_all_failures.test.ts tests/baseline_regression_ci_guardrails.test.ts tests/ci_workflow_test_paths_exist.test.ts --reporter=verbose` — exit 0; 3 files, 16 tests passed; saved in `focused-vitest.log`.
- Post-comment focused rerun of `baseline_regression_ci_guardrails` and `ci_workflow_test_paths_exist` — exit 0; 2 files, 7 tests passed; saved in `post-comment-focused-vitest.log`.
- `git diff --check -- .github/workflows/event-system-ci.yml` — exit 0; saved in `diff-check.log`.

No local 188-week campaign, package build, native run, baseline adoption, commit, or push was performed. Existing n91/n92/n93 artifacts, all telemetry, failed evidence, and unrelated dirty work remain untouched.
