# Operation Idle Objective Skip Repair

Date: 2026-05-22

## Scope

This repairs a sector-operation lifecycle accounting bug:

- Multi-axis and legacy sector operations no longer advance `current_objective_index` from idle no-movement / no-attack turns.
- Consecutive resolved combat failures can still advance to the next objective through the existing combat-failure branch.
- Idle zero-attempt axes now remain on their current objective until the existing idle-stall / recovery path handles them.

No combat odds, OOB rows, painted targets, operation catalog predicates, force-trajectory predicates, or scenario data changed.

## Root Cause

The Donji Vakuf 95 evidence after COHA expiry showed an axis could finish objectives it had not attacked. The lifecycle code incremented `consecutive_failures_on_current` during truly idle turns, then reused the same objective-advance rule used for resolved combat failures.

That meant an axis with no movement, no attack order, and no resolver battle could skip its current objective after repeated idle turns. In late-war traces this hid the real delivery gap by converting no-attempt turns into apparent objective progress.

## Evidence

The new red/green test fixes the boundary directly: a multi-axis execution operation with zero attacks and zero movement at `consecutive_failures_on_current = 2` must stay on the same objective after the next idle update. Before the patch it entered recovery by completing the only objective; after the patch it remains in execution with `current_objective_index = 0` and `idle_execution_turn_streak = 3`.

Fresh 188w `n1954`:

- Final hash: `955c0e5fd25e97cc`
- Oct 1995 painted comparison: 76.4% count match, 72.1% area-weighted match
- Donji Vakuf 95 remains active at turn 188 instead of silently completing/skipping.
- Donji Vakuf 95 records 7 real battles/captures through `prusac_2`.
- Remaining RS-held Donji targets are `jemanlici`, `korenici`, and `oborci_2`.

This is intentionally not outcome tuning. The patch makes the residual Donji delivery gap more honest by removing false objective advancement.

## Verification

- `npx.cmd vitest run tests\sector_offensive_idle_recovery.test.ts -t "does not advance a multi-axis objective" --reporter=dot` PASS
- `npx.cmd vitest run tests\sector_offensive_idle_recovery.test.ts tests\scenario_operation_diagnostics.test.ts tests\probe_territory_flip.test.ts --reporter=dot` PASS, 45/45
- `npm.cmd run typecheck` PASS
- `npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --map --out runs` PASS, `n1954`, hash `955c0e5fd25e97cc`
- `node tools\compare_painted_vs_sim.cjs runs\apr1992_definitive_188w__210e69404d054959__w188_n1954 --target oct1995` PASS, 72.1% area-weighted match
- `npm.cmd run test:baselines` first failed on expected 52w behavior-output drift; `UPDATE_BASELINES=1 npm.cmd run test:baselines` refreshed `data/derived/scenario/baselines/manifest.json`; follow-up `npm.cmd run test:baselines` PASS

## Residuals

- Donji Vakuf 95 still under-delivers the painted target set. The next lane should diagnose why post-`prusac_2` objectives do not receive enough remaining-turn delivery, not reintroduce skip-through accounting.
- Oct 1995 painted targets remain diagnostic-only.
- Krajina collapse, Jajce/Mrkonjic delivery, Sana/Mistral predicates, and W3 casualty-trajectory wiring remain separate roadmap lanes.
