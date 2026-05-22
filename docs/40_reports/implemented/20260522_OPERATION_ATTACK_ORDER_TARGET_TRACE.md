# Operation Attack-Order Target Trace - 2026-05-22

## Scope

This packet extends the combat-causality weekly diagnostic output so operation attack orders can be audited against their emitted targets and participant locations.

## Changes

- `operation_combat_diagnostics[]` now includes sorted `attack_order_targets[]` rows with target OSID, order count, battle count, and whether the target is the operation's current objective.
- `operation_combat_diagnostics[]` now includes sorted `participant_attack_orders[]` rows with brigade id, current brigade location, attack target, current-objective match, and per-brigade battle count.
- The snapshot builder accepts both live `state.military.formations` and legacy test fixtures with top-level `formations`, preserving existing diagnostic fixture coverage.

## Evidence

- Red/green test coverage proves execution-phase operations with attack orders but zero battles now expose target and participant-level trace rows.
- Focused test: `npx.cmd vitest run tests\scenario_operation_diagnostics.test.ts --reporter=dot` passed 20/20.
- `npm.cmd run typecheck` passed.
- Fresh 188w run `runs\apr1992_definitive_188w__210e69404d054959__w188_n1944` completed with final hash `5766d470125f1220`, matching the prior battle-feedback run hash.
- `npm.cmd run test:baselines` first failed on the expected `apr1992_52w` `weekly_report.jsonl` diagnostic-output hash drift; `UPDATE_BASELINES=1 npm.cmd run test:baselines` refreshed the manifest and the follow-up `npm.cmd run test:baselines` passed.

## Donji Vakuf Finding

The new rows narrow the residual Donji Vakuf failure. In weeks 180-182, operation participants attack `op:donji_vakuf:komar_2` while the operation current objective is already `op:donji_vakuf:babin_potok_2`; no battles resolve. In weeks 183-184, participants attack `op:bugojno:brizina`, `op:skender_vakuf:donji_koricani`, and `op:teslic:blatnica_2`, again with zero battles and none matching the current objective.

## Residual

This is diagnostic/reporting only. It does not change operation behavior, save schema, scenario data, OOB rows, combat math, painted-control targets, or tuning. The next behavior lane is the operation-pinned order-target boundary: inspect why committed Donji participants can be routed to non-current, non-axis attack targets that do not resolve into battles.
