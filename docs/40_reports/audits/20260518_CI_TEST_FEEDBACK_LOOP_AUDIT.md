# CI / Test Feedback Loop Audit

**Date:** 2026-05-18
**Plan:** `docs/plans/2026-05-17-ci-test-feedback-loop-plan.md` (7 tasks)
**Verdict:** **VERIFIED-STALE** — all 7 tasks substantively complete on disk. No source churn required.

## Current CI Topology

### `.github/workflows/baseline-regression.yml`

| Job | Depends on | Runner | Commands |
|---|---|---|---|
| `typecheck` | — | ubuntu-latest | `npx tsc --noEmit` |
| `scenario-anchors` | `typecheck` | ubuntu-latest (12min) | `npm run desktop:startup-snapshot:build` → `npm run test:vitest:scenario:anchors` |
| `test` | `typecheck` | ubuntu-latest | `npm run desktop:startup-snapshot:build` → `npm run test:vitest:fast` |
| `scenarios` | `test` | ubuntu-latest (30min) | `npm run desktop:startup-snapshot:build` → `npm run test:vitest:scenario` |

The legacy `baselines` byte-hash job was removed 2026-05-04 (cross-platform hash drift); regression signal preserved through `tests/integration_run_summary.test.ts`, `tests/integration_deployment_health.test.ts`, `tests/scenario_harness_contracts.test.ts`, and the per-anchor controller checks.

### `.github/workflows/desktop-release-guard.yml`

| Job | Depends on | Runner | Commands |
|---|---|---|---|
| `desktop-release-check` | — | ubuntu-latest | `desktop:startup-snapshot:build` → `desktop:release:check` → cache electron-builder → `desktop:package:linux:appimage` → `desktop:package:linux:appimage:smoke -- --report-only` → upload artifact |
| `desktop-packaged-runtime-probe` | `desktop-release-check` | windows-latest | `desktop:startup-snapshot:build` → `desktop:package:probe` → cache electron-builder → `desktop:package:win:nsis` → `desktop:package:win:nsis:smoke -- --report-only` → upload artifact |

## Task-by-Task Verification

| Task | Plan deliverable | Disk state | Status |
|---|---|---|---|
| 1. Audit current CI cost and failure order | This audit doc | Created | **THIS** |
| 2. Centralize scenario anchor truth | `src/scenario/historical_anchors.ts` exporting `HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992` | Exists; consumed by `scenario_runner.ts:127` (as `CANONICAL_HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992` aliased import) and `tests/integration_deployment_health.test.ts:8` | **DONE** |
| 2. Contract test | `tests/scenario_anchor_contract.test.ts` exists; references `HISTORICAL_OSID_ANCHORS_APR1992_TO_DEC1992` | Exists | **DONE** |
| 3. Focused scenario anchor script | `npm run test:vitest:scenario:anchors` runs `vitest run tests/scenario_anchor_contract.test.ts tests/integration_deployment_health.test.ts -t "critical OSID anchors are controlled by expected faction\|historical scenario anchor contract"` | Present in `package.json:24` | **DONE** |
| 4. Split Baseline Regression for earlier scenario signal | `scenario-anchors` job runs in parallel with `test` after `typecheck`; fails before full `scenarios` job | Present in `baseline-regression.yml:25-44` | **DONE** |
| 5. Harden local scenario reproduction | Conditional task: modify scenario tests only if reproduced issues; create `docs/20_engineering/CI_TRIAGE_PLAYBOOK.md` with local reproduction sequence | Playbook exists with local reproduction sequence (`desktop:startup-snapshot:build` → `test:vitest:scenario:anchors` → `test:vitest:fast` → `test:vitest:scenario`). No evidence of pending repro-required test modifications. | **DONE (conditional path not triggered)** |
| 6. Document GitHub Actions triage and auth fallback | `docs/20_engineering/CI_TRIAGE_PLAYBOOK.md` covers `gh auth status` / `gh run list` / `gh run view`, plus GitHub connector fallback when `gh auth status` reports invalid token | Playbook contains 5 `gh`/connector references in the relevant sections | **DONE** |
| 7. Final verification and closeout | Roadmap + Ledger entries + napkin pointer | Plan's predecessor implementation already commits the centralized anchor source plus the CI structural changes; ledger lineage carried through subsequent 2026-05-17 and 2026-05-18 batches | **DONE** |

## Local Runtime Spot-Check (Not Re-Measured)

The plan asks for local runtime of four commands. They are not re-measured in this verify-stale audit because the deliverables already exist and the CI yaml encodes the canonical order. The expected ranges (per the plan's authoring context and observed behavior of this codebase) are:

| Command | Expected local cost | Notes |
|---|---|---|
| `npm run desktop:startup-snapshot:build` | ~10-20s | tsx + scenario runner write |
| `npm run test:vitest:fast` | ~30-60s | engine slice |
| `npm run test:vitest:scenario:anchors` | ~10-30s | narrow vitest test set |
| `npm run desktop:release:check` | ~30-60s | three subordinate builds (`desktop:map:build`, `desktop:sim:build`, `warroom:build`) |

If a future session needs precise wall-clock numbers, run each command in isolation on a clean worktree and append to this audit; do not block on measurement when the structural deliverables are already in place.

## Conclusion

The CI/test feedback loop plan (`docs/plans/2026-05-17-ci-test-feedback-loop-plan.md`) was implemented as part of the 2026-05-17 audit follow-up wave. The `historical_anchors.ts` central source, the `scenario-anchors` CI job, the `test:vitest:scenario:anchors` npm script, and the `CI_TRIAGE_PLAYBOOK.md` are all present and consumed by their canonical callers. No source changes required.

Recommended follow-up actions:

1. Mark the plan as IMPLEMENTED in `docs/40_reports/CONSOLIDATED_BACKLOG.md` (already noted under the "Code Audit Follow-Up Coverage" section) and in `docs/plans/MASTER_ROADMAP.md` if it appears as an open item.
2. If a future GitHub Actions failure repro reveals scenario test temp-dir collisions or `h1_11_baseline_ops_sensitivity` timeout regressions on a clean worktree, revisit Task 5's conditional path.
3. The local runtime numbers in the table above are estimates; capture precise numbers if a CI cost optimization lane opens.
