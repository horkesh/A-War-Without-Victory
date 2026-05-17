# CI Test Feedback Loop Audit - 2026-05-17

## Scope

Audit and first implementation batch for `docs/plans/2026-05-17-ci-test-feedback-loop-plan.md`.

This audit covers Baseline Regression and Desktop Release Guard feedback order. It records the current command shape, local runtime evidence gathered during implementation, and why a focused scenario-anchor signal was added.

## Current CI Order

Baseline Regression before this patch:

| Job | Dependency | Command signal |
| --- | --- | --- |
| `typecheck` | none | `npx tsc --noEmit` |
| `test` | `typecheck` | `npm run desktop:startup-snapshot:build`, then `npm run test:vitest:fast` |
| `scenarios` | `test` | `npm run desktop:startup-snapshot:build`, then `npm run test:vitest:scenario` |

Desktop Release Guard:

| Job | Command signal |
| --- | --- |
| `desktop-release-check` | `npm run desktop:release:check` |
| `desktop-packaged-runtime-probe` | `npm run desktop:package:probe` |

## Local Runtime Evidence

Environment:

- Worktree used for first proof: `implement/ci-test-feedback-loop` in `.worktrees/ci-test-feedback-loop`
- Setup: `npm.cmd install --legacy-peer-deps` and `npm.cmd install --legacy-peer-deps --prefix src/ui/map`
- Puppeteer setup note: root install required `PUPPETEER_SKIP_DOWNLOAD=1` because the local Puppeteer Chrome cache had a folder with no executable.

| Command | Result | Time |
| --- | --- | --- |
| `npm.cmd run desktop:startup-snapshot:build` | PASS | 5.514s |
| `npm.cmd run test:vitest:scenario:anchors` | PASS, 2 files / 3 tests, 10 skipped | 106.96s |
| `npx.cmd tsc --noEmit` | PASS | 43s |
| `npm.cmd run test:vitest:fast` | TIMEOUT in local harness | 600s timeout, then Vitest `EPIPE` after process termination |

`npm.cmd run desktop:release:check` was not run after the fast-suite timeout in this batch. The timeout itself is material evidence for the feedback-loop issue: the local fast gate can consume more than 10 minutes and still fail to provide a clean later scenario signal.

## Findings

1. The Brka anchor drift class had two sources of truth: scenario runner anchor diagnostics and deployment-health assertions.
2. A focused anchor command is valuable because the relevant scenario anchor assertion takes roughly 107 seconds locally, while the broader fast suite exceeded a 10-minute local timeout in this worktree.
3. The new CI job must remain an early signal only. It does not replace the full `test` or `scenarios` jobs.
4. Local Windows reproduction needs two setup caveats documented: use `npm.cmd` instead of `npm` in PowerShell, and set `PUPPETEER_SKIP_DOWNLOAD=1` if the Puppeteer cache is broken.

## Implemented In This Batch

- Added `src/scenario/historical_anchors.ts` as the canonical anchor source.
- Updated `src/scenario/scenario_runner.ts` to consume the canonical anchor arrays.
- Updated `tests/integration_deployment_health.test.ts` to consume canonical OSID anchors.
- Added `tests/scenario_anchor_contract.test.ts`.
- Added `npm run test:vitest:scenario:anchors`.
- Added the Baseline Regression `scenario-anchors` job after `typecheck`.

## No-Gate-Weakening Statement

The full `test` and `scenarios` jobs remain in Baseline Regression. The new `scenario-anchors` job is additive early signal only.
