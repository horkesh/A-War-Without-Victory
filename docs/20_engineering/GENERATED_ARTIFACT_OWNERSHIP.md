# Generated Artifact Ownership Matrix

**Date:** 2026-05-19
**Plan:** `docs/plans/2026-05-18-autonomous-ci-regression-hardening-plan.md` Task 3.

This matrix names the owner command and validation command for every committed
generated artifact that tests assert against. Hand-editing these files is the
forbidden shortcut named in the Fast-Suite Drift Taxonomy.

## How to use this matrix

When a committed JSON / manifest / fixture under `data/derived/` or
`tools/diagnostics/output/` shows in `git status` after a sim or schema change:

1. Identify the artifact below.
2. Run the **Owner command** to regenerate from canonical builder truth.
3. Run the **Validation command** to confirm shape and consumers.
4. Decide intentionally whether the diff is a committed fixture refresh or a
   transient run output. Transient run outputs do not get committed; see the
   **Commit policy** column.

If an artifact is not listed here, do not commit it. Add a matrix row first
with Codex/user sign-off.

## Matrix

| Artifact (repo-relative POSIX) | Owner command | Validation command | Commit policy | Transient/run-output policy |
|---|---|---|---|---|
| `data/derived/startup/apr_1992_initial_save.json` | `npm.cmd run desktop:startup-snapshot:build` | `npm.cmd run desktop:startup-snapshot:check`; `tests/startup_snapshot_contract.test.ts`; `tests/save_migration_round_trip_contract.test.ts` | Committed. Refresh on every schema bump or scenario-source canonical change. | Not transient. |
| `tools/diagnostics/output/save_migration_drift.json` | `node tools/diagnostics/save_migration_drift_audit.cjs` | `tests/save_migration_drift_audit.test.ts` | Committed. Refresh after every migration registry change. | Not transient. |
| `data/derived/scenario/baselines/manifest.json` | `npm.cmd run test:baselines -- --update` (or `UPDATE_BASELINES=1 npm.cmd run test:baselines`) | `npm.cmd run test:baselines`; `tests/baseline_regression_ci_guardrails.test.ts`; `tests/baseline_artifact_ownership.test.ts` | Only `manifest.json` is committed. Refresh only after scenario expert confirms anchors/benchmarks/casualty-band; preserve any prior surgical trim of `artifacts[]` rather than letting `UPDATE_BASELINES=1` re-expand. The manifest owns the hashed run outputs named in `artifacts[]`: `activity_summary.json`, `control_delta.json`, `end_report.md`, `final_save.json`, `formation_delta.json`, `run_summary.json`, `watched_operations.json`, `weekly_report.jsonl`. | Per-scenario run outputs are transient temp-run files hashed into the manifest; they are not committed under `data/derived/scenario/baselines/<scenario>/`. |
| `data/derived/scenario/baseline_ops_sensitivity*/` | `npm.cmd run sim:scenario:baseline-ops:sensitivity` | `tests/h1_11_baseline_ops_sensitivity.test.ts`; `tests/baseline_ops_sensitivity_artifact_ownership.test.ts` | Committed H1.11 evidence. Refresh only with scenario/calibration approval because these files are scenario-derived outputs. `baseline_ops_sensitivity_run2` is retained byte-identity evidence; it mirrors the primary tree, with only path-bearing `run_meta.json` `out_dir` values allowed to differ. | Not transient while committed. Do not delete, refresh, or add a third retained tree without updating this row and the ownership guard. |
| `data/derived/scenario/sweeps/h2_4/h2_4_sweep/` | `npm.cmd run sim:scenario:sweep` | `tests/scenario_sweep_artifact_ownership.test.ts`; `tests/scenario_harness_contracts.test.ts` H2.4 block | Committed H2.4 evidence. Refresh only with scenario/calibration approval because these are scenario-derived outputs. The current committed tree has six `aggregate_summary` scenarios plus retained run directories (`baseline_ops_26w`, `baseline_ops_52w`, `noop_52w`, `noop_52w_probe_intent`) that are intentionally classified by the static guard rather than deleted in-place. | Not transient while committed. Do not delete retained run directories, refresh the sweep tree, or add another sweep id without updating this row and the ownership guard. |
| `data/derived/scenario/recruitment_test_matrix_2026_02_11/` | None - retained static evidence; do not refresh in place. | `tests/recruitment_test_matrix_artifact_ownership.test.ts` | Committed recruitment matrix evidence. The tree is retained static evidence from the 2026-02-11 recruitment test matrix and must not be treated as a current owner-command refresh target. Retained run directories are `baseline_ops_4w__e5f478f75692aede__w4` (complete successful baseline run), `ethnic_1991_init_4w__74c48dae1e3cd0e3__w4` and `hybrid_1992_init_4w__f9347f6e907f3187__w4` (sparse successful init evidence), and `_tmp_player_choice_recruitment_4w__acc3c9d910eb73d8__w4` (failed player-choice recruitment evidence with `failure_report.*`). | Not transient while committed. Do not delete, refresh, or rerun this tree; add a new dated evidence tree instead if a future recruitment matrix must be captured, then update this row and the ownership guard. |
| `data/derived/latest_run_final_save.json` | One of `npm.cmd run sim:scenario:run:40w` / `sim:scenario:run:default` (whichever scenario was executed) | `tests/scenario_latest_run_final_save_map_copy.test.ts`; `tests/scenario_latest_run_final_save_artifact_ownership.test.ts` prove the `--map` copy helper writes byte-identical source bytes into a temp repo root without touching the tracked artifact, and that docs/scripts/helper ownership stay aligned. | **Decide intentionally.** Either commit as a fixture refresh with a paired ledger entry naming why, or treat as transient run output and do not commit. Default: transient. | Transient unless explicitly promoted. |
| `runs/<scenario_run>/replay.jsonl` | `npm.cmd run sim:scenario:run:* -- --video` or `runScenario({ emitWeeklySavesForVideo: true })` | `tests/replay_player.test.ts` for replay consumer contract. | Do not commit. | Transient run-output sidecar for video/timeline replay only. |
| `runs/<scenario_run>/replay_save_sequence.json` | `runScenario(...)` via `streamFinalizeReplaySaveSequenceFromJsonl(...)` | `tests/replay_save_emit.test.ts`; `tests/scenario_continue_from_save_equivalence.test.ts`; `tests/replay_player.test.ts` | Do not commit. | Transient full-state replay sidecar emitted beside the scenario run. |
| `runs/<scenario_run>/replay_save_manifest.json` | `runScenario(...)` via the replay save finalizer manifest writer | `tests/replay_save_emit.test.ts`; `tests/scenario_continue_from_save_equivalence.test.ts`; `tests/replay_player.test.ts` | Do not commit. | Transient sparse replay sidecar emitted beside `replay_save_sequence.json`. |
| `runs/<scenario_run>/...` | `npm.cmd run sim:scenario:run:*` | None. | Transient. Not committed. | Always transient. |
| `tools/diagnostics/output/*.json` (other than `save_migration_drift.json`) | Owner script under `tools/diagnostics/`. If unclear, the artifact does not belong in `git`. | Per-artifact diagnostic test if one exists. | Committed only when the diagnostic is part of canonical regression evidence. | Default transient. |

## Determinism contract

Every owner command in this matrix must produce byte-identical output for the
same inputs on the same platform. The list of stable-output writers includes:

- `desktop:startup-snapshot:build` — deterministic single-pass save build.
- `save_migration_drift_audit.cjs` — sorted iteration over the migration
  registry.
- `run_baseline_regression.ts` — fixed scenario seeds, sorted artifact emission.

If a refresh of any artifact above produces non-deterministic output, treat it
as a determinism bug — file under the "Behavior expectation drift" class in
`docs/40_reports/audits/20260519_FAST_SUITE_DRIFT_TAXONOMY.md` and stop.

## Cross-references

- Drift taxonomy: `docs/40_reports/audits/20260519_FAST_SUITE_DRIFT_TAXONOMY.md`
- CI triage playbook: `docs/20_engineering/CI_TRIAGE_PLAYBOOK.md`
- Pre-merge gate sequence: `docs/20_engineering/PRE_MERGE_GATE.md`
- Schema evolution: `docs/20_engineering/SAVE_SCHEMA_EVOLUTION.md` (if present)
- Determinism static guard: `tests/determinism_static_scan_r1_5.test.ts`
- Docs-truth no-skip guard: `tests/docs_truth_no_skip_guard.test.ts`
