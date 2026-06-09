# CI C1 — Full-vitest gate + platform-stable structural fingerprint

**Date:** 2026-06-09
**Branch:** `ci/c1-full-vitest-structural-fingerprint`
**Task:** #68 (Pyrrhic Tech-Architect track) — close the CI false-green leak that let stale-pin slips reach/near main.
**Scope:** CI / tooling / infra only. NO sim/scenario/calibration byte changes. The 649 floor + the three horizon hashes are untouched.

## Root cause

The CI `test` job runs `npm run test:vitest:fast` (the **fast slice**, 1017 files) and the
`scenarios` job runs `npm run test:vitest:scenario` (the **scenario slice**, 27 files).
Slice membership is decided by content heuristics in `tools/test/discover_test_files.mjs`
(`fileUsesVitest`, `fileRunsScenario`). The full suite (`vitest.config.ts` / `npm run
test:vitest`) is fast ∪ scenario = 1044.

The leak: there was **no single required job that runs the FULL suite**. The union is only
as trustworthy as the unowned discovery heuristic — a test those heuristics mis-bucket or
fail to discover silently drops from BOTH slices with no machine signal. The three
stale-pin classes (`strict_null_inventory_progress`, `war_phase_step_order`,
consequence/substrate inventory) are full-suite-relevant pins that can slip this way.

Separately: the byte-hash baselines CI job was removed 2026-05-04 (platform-divergent
`final_save.json` SHA256, Win vs Linux) with an explicit TODO
(`LANE-NIGHTSHIFT-PLATFORM-STABLE-MANIFEST`) and never replaced → determinism regression
had NO machine signal on CI.

## What shipped

### 1. Full-suite required gate (path-aware)
`.github/workflows/full-suite-and-fingerprint.yml` → job `full-suite` runs
`npm run test:vitest` (the COMPLETE suite via `vitest.config.ts`, not a slice). A stale
strict-null/step-count/substrate pin can no longer reach main green regardless of slice
classification.

Path-aware per the 2026-06-05 CI/PR batching policy (`COMMAND_BOARD.md`): triggers only on
PRs touching `src/** tools/** tests/** data/scenarios/** data/calibration/** scripts/**
package.json vitest.config.ts tsconfig.json` + the workflow file itself. Doc-only PRs stay
fast.

### 2. Platform-stable structural fingerprint
- `tools/diagnostics/structural_fingerprint.cjs` — pure-node tool; reads a run dir's
  `run_summary.json` + `control_delta.json`, extracts platform-stable structural fields,
  emits a canonical object + 16-hex SHA256 fingerprint. Modes: default print, `--json`,
  `--full`, `--check --expected`, `--update --expected`.
- `tools/diagnostics/ci_structural_fingerprint.cjs` — CI driver: runs a fresh 40w, parses
  the runner's `outDir:` line, runs the fingerprint check/update.
- npm scripts: `ci:structural-fingerprint:check` / `:update`.
- Committed expected: `data/calibration/structural_fingerprint_40w.json`
  (fingerprint `78af6fc7a3278a3e`, generated from a fresh 40w on origin/main #339;
  `final_state_hash 235c61f408dc3d95` confirms canonical code).
- CI job `structural-fingerprint` compares fresh-run fingerprint vs committed expected.
- Tool self-test: `tests/structural_fingerprint.test.ts` (7 tests).

#### Fingerprint fields (all platform-stable — integers/strings/booleans)
- `control_counts` — per-faction OSID control map (`control_delta.net_control_counts_after`)
- `anchor_checks` + `anchors_passed`/`anchors_total` — anchor pass/fail (`run_summary.anchor_checks`)
- `benchmark` — `{evaluated, passed, failed, not_reached}` (`bot_benchmark_evaluation`)
- `scenario_id`, `weeks`, `final_turn`

#### DELIBERATELY EXCLUDED
- `final_save.json` byte-hash (`final_state_hash`) — the platform-divergent value the old
  job used.
- Per-faction brigade/formation counts (`historical_alignment.final.brigades_*`). **Empirical
  finding:** three 40w runs with an IDENTICAL territory byte-hash (`3649b3861a87e6ea`)
  produced identical control maps + anchors + benchmarks but DIFFERENT `brigades_active`
  (32 vs 31; 113 vs 116; 82 vs 83). Brigade tallies are a non-deterministic run-snapshot
  artifact, not territory truth; including them would make the gate flap. (The task brief
  suggested formation counts as a candidate field — this finding rules them out.)

## Reference platform declaration (DoD C2)
The CI reference platform is **Linux / Node 22**. Windows==Linux byte-hashes are NOT
promised (that is exactly why the byte-hash baselines job was removed). The structural
fingerprint fields are platform-stable by construction and ARE the cross-platform
determinism authority.

## Validation
- Fingerprint tool deterministic across two runs of the same dir (`c5fb51bc…`,
  `16c4d7a5…` reproduced exactly).
- Stable across three same-territory 40w runs after excluding formations (`16c4d7a50e4aee87` ×3).
- `--check` passes on match (exit 0), fails with legible field-diff on mismatch (exit 1).
- `tests/structural_fingerprint.test.ts`: 7/7 pass.
- Both workflow YAMLs parse valid (yaml package).
- **CI `full-suite` job: PASS on Linux (20m6s), exit 0** — the authoritative full-suite
  validation on the reference platform.
- **CI `structural-fingerprint` job: PASS on Linux (1m49s)** — a fresh Linux 40w matched
  the Windows-generated committed expected `78af6fc7a3278a3e`, proving the structural
  fields are platform-stable (DoD C2 confirmed empirically across platforms).
- Local Windows full-suite run reported 3 files / 6 tests failing
  (`political_control_audit_cli.test.ts` and siblings). These are a WORKTREE-ENVIRONMENT
  artifact, NOT a regression: the worktree junctions the main repo's `node_modules` but
  the junction lacks the platform `.bin/tsx` shims, so those tests' spawned tsx-CLI child
  processes fail to resolve and return the wrong exit status. The clean Linux CI checkout
  (real `npm install` with `.bin` shims) runs all of them green — see the `full-suite`
  PASS above. My changes are additive CI/tooling only and touch none of those tests.

## Operability note (required-check + path filter)
GitHub treats a required check that did not run (path-skipped) as pending, which can block
merge of doc-only PRs. Recommended branch-protection config: register `full-suite` and
`structural-fingerprint` as required via a ruleset that treats path-skipped runs as
passing, or rely on the existing `baseline-regression` required jobs for doc-only PRs and
make these two required only through the merge queue. Documented for the operator; not a
code change.

## Completion block
- Canonical owner: `.github/workflows/full-suite-and-fingerprint.yml` (CI gates);
  `tools/diagnostics/structural_fingerprint.cjs` (fingerprint definition).
- Demoted path: removed byte-hash baselines CI job stays removed; its determinism role is
  now owned by the structural fingerprint.
- Player-visible truth: none (CI/tooling only).
- Canonical UI surface: none.
- Done means: a stale full-suite-only pin or an undeclared structural/determinism change
  is machine-caught on the Linux reference platform before reaching main green.
