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
| `data/derived/scenario/baselines/manifest.json` | `npm.cmd run test:baselines -- --update` (or `UPDATE_BASELINES=1 npm.cmd run test:baselines`) | `npm.cmd run test:baselines`; `tests/baseline_regression_ci_guardrails.test.ts` | Committed. Refresh only after scenario expert confirms anchors/benchmarks/casualty-band; preserve any prior surgical trim of `artifacts[]` rather than letting `UPDATE_BASELINES=1` re-expand. | Not transient. |
| `data/derived/scenario/baselines/<scenario>/*.json` | `npm.cmd run test:baselines -- --update` (or `UPDATE_BASELINES=1`) | `npm.cmd run test:baselines` | Committed where listed in `manifest.json` `artifacts[]`. | Not transient. |
| `data/derived/latest_run_final_save.json` | One of `npm.cmd run sim:scenario:run:40w` / `sim:scenario:run:default` (whichever scenario was executed) | None — caller decides intent. | **Decide intentionally.** Either commit as a fixture refresh with a paired ledger entry naming why, or treat as transient run output and do not commit. Default: transient. | Transient unless explicitly promoted. |
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
