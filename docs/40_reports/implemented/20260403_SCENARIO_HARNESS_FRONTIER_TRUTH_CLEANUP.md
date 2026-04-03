# 2026-04-03 — Scenario Harness Frontier Truth Cleanup

## Summary

Removed the most dangerous remaining synthetic-frontier writer from the scenario harness.

`scenario_runner.ts` previously used `postureAllPushAndApplyBreaches` to:

- force-populate `state.military.front_posture`
- assign unassigned formations to synthetic edge assignments
- seed `front_segments`
- seed `front_pressure`

That meant the harness could invent frontier truth purely to force breaches and control flips.

The harness now applies breach-based control flips only from real engine state.

## Why

This repo is trying to move toward sectors and canonical live state as the only truth owners. A scenario harness that writes fake frontier state is worse than dead code:

- it hides engine-health problems
- it can make bad calibrations look acceptable
- it teaches future agents the wrong authority model

Diagnostic tooling may observe, summarize, and compare real state. It must not manufacture it.

## Changes

- [src/scenario/scenario_runner.ts](F:/A-War-Without-Victory/src/scenario/scenario_runner.ts)
  - removed synthetic `front_posture` seeding under `postureAllPushAndApplyBreaches`
  - removed synthetic brigade `assignment = { kind: 'edge' }` injection
  - removed synthetic `front_segments` breach seeding
  - removed synthetic `front_pressure` breach seeding
  - updated the option comment so it is described honestly as a legacy harness flag that observes/applies real breach results without seeding frontier state
- [tests/engine_honesty_legacy_contracts.test.ts](F:/A-War-Without-Victory/tests/engine_honesty_legacy_contracts.test.ts)
  - added a regression assertion that the harness no longer seeds synthetic frontier state to force breaches

## What remains intentionally true

- The harness can still:
  - compute real breaches
  - apply breach-based control flips when enabled
  - report breach diagnostics
- The harness may no longer:
  - fabricate the preconditions for those breaches

## Verification

- `node .\node_modules\vitest\vitest.mjs run tests\engine_honesty_legacy_contracts.test.ts tests\ui_shell_navigation.test.ts`
- `powershell -ExecutionPolicy Bypass -File scripts\repo\check_claude_governance.ps1`

## Outcome

Scenario runs driven by this harness now expose frontier weakness more honestly. If breach behavior is missing or too weak, that is now an engine problem to solve in canonical systems, not something the runner papers over.
