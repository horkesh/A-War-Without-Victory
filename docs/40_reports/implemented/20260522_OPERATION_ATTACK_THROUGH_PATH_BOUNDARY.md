# Operation Attack-Through Path Boundary - 2026-05-22

## Scope

This packet repairs the operation attack-through fallback so committed operation brigades do not attack unrelated adjacent enemy OSIDs when they cannot march to the current objective.

## Changes

- Attack-through candidates are now bounded by tactical distance to the operation current objective.
- A candidate intermediate target must be held by the same controller as the current objective and must reduce the brigade's objective-path distance through friendly or objective-controller territory.
- This preserves direct current-objective attacks and friendly approach marching, but blocks arbitrary adjacent same-controller attacks outside the objective path.

## Evidence

- Red/green test coverage proves an execution-phase operation participant will not attack an unrelated easy adjacent target off the current objective path.
- Focused suite: `npx.cmd vitest run tests\bot_operation_objective_focus.test.ts tests\sector_offensive_idle_recovery.test.ts tests\operation_completion_truth.test.ts tests\scenario_operation_diagnostics.test.ts --reporter=dot` passed 49/49.
- `npm.cmd run typecheck` passed.
- `npm.cmd run test:baselines` passed with no manifest update.

## 188w Proof

Fresh 188w run:

- Run: `runs\apr1992_definitive_188w__210e69404d054959__w188_n1945`
- Final hash: `150d112d2ae6958a`
- Oct 1995 painted area match: `71.8%` (was 71.6% in n1943/n1944).
- `donji_vakuf_95` still surfaces and approves at turn 177, but now exits `did_not_launch` / `no_logged_attempt` / `NO_OPENING_ATTACK:1` without the unrelated attack-order targets seen in n1944.

## Residual

This is not outcome tuning and does not make Donji Vakuf deliver. It removes a false attack-through path so the remaining blocker is honest opening-contact/approach delivery. No scenario data, OOB source rows, painted-control targets, combat odds, save schema, or force-trajectory predicates changed.
