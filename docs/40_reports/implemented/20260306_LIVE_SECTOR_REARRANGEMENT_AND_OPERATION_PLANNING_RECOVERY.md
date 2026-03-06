# Live Sector Rearrangement and Operation Planning Recovery

Date: 2026-03-06

## Summary

This recovery slice finished three connected fixes in the live Phase II combat path:

1. `sector_attack` planning now includes brigade movement into position, not just passive waiting on a staging timer.
2. Live corps AI again uses sector rearrangement and offensive concentration to turn adjacent thin sectors into launchable offensive windows.
3. Combat-causality reporting now distinguishes broken attack pipelines from quiet weeks, so healthy operational lulls no longer invalidate an otherwise combat-valid run.

The result is a restored and verified April 1992 40-week baseline at:

- run: `apr1992_definitive_40w__7c821fa7d934716d__w40_n158`
- `final_state_hash = 3bfada3e56322112`
- `behavioral_health.valid_for_combat_calibration = true`
- `combat_causality.valid_for_combat_calibration = true`
- `total_attack_orders = 124`
- `total_battles = 103`
- `invalid_operation_count = 0`
- `zero_eligible_attacker_operation_count = 0`

## Problem

The remaining live failures after the earlier causality recovery were no longer “combat does not happen.” They were subtler:

- operation planning still treated positioning as a precondition outside the planning phase instead of part of it
- brigades could reach useful objective-approach positions, but operations still stayed in `planning` waiting for exact `staging_osid` occupancy
- sector rearrangement had to stay in the live game, but it needed to create launchable offensive clusters rather than just static cleanup
- weekly `zero_battles` rows were over-invalidating healthy runs even when there were no broken operations and no failed attack resolutions

## Implementation

### 1. Planning phase now moves brigades into position

Updated:

- `src/sim/combat/bot_brigade_ai_osid.ts`
- `src/sim/combat/sector_offensive.ts`

Behavior:

- planning-phase operation-owned brigades now move toward first-objective approach OSIDs during planning
- staging remains a fallback, not the only acceptable planning destination
- planning can end early once at least one real planning turn elapsed and participants are either:
  - at `staging_osid`, or
  - already on friendly approach positions for the current objective

This makes planning a real maneuver/preparation phase rather than dead time.

### 2. Live sector rearrangement stays in corps AI

Updated:

- `src/sim/combat/sector_rearrangement.ts`
- `src/sim/combat/bot_corps_ai.ts`

Behavior:

- live corps directive generation keeps `rearrangeSectorsForCorps()`
- adjacent thin sectors can now be concentrated into launchable offensive groupings with `concentrateSectorsForOffensive()`
- launch checks use live brigade positioning, not just stale assigned-sector metadata

This preserves sector rearrangement as a permanent runtime behavior instead of a helper-only experiment.

### 3. Combat-causality diagnostics no longer mislabel post-capture turns or quiet weeks

Updated:

- `src/scenario/combat_causality.ts`
- `src/scenario/scenario_runner.ts`

Behavior:

- if an operation already resolved a capture/failure this turn, diagnostics do not flag the same execution window as inert simply because `current_objective_index` advanced
- `zero_battles` now invalidates a weekly row only when attack orders were present but resolved to no battles
- full-run zero-combat still hard-fails at scenario-runner level
- quiet weeks remain visible under `behavioral_health.battleless_weeks`

Architect decision for later review:

- quiet weeks with no attack orders and no invalid operations are warnings, not combat-causality failures

## Tests

Added or expanded coverage:

- `tests/bot_operation_objective_focus.test.ts`
- `tests/sector_offensive.test.ts`
- `tests/bot_corps_ai_sector_contract.test.ts`
- `tests/scenario_operation_diagnostics.test.ts`

Key regression coverage now includes:

- planning-phase operations keep moving from staging into objective approach positions
- adjacent thin sectors can still produce a launchable offensive concentration
- post-capture execution windows are not mislabeled as inert
- quiet weeks do not invalidate otherwise healthy runs

## Verification

Passed:

- `cmd /c node_modules\.bin\tsx.cmd --test tests\bot_operation_objective_focus.test.ts`
- `cmd /c node_modules\.bin\tsx.cmd --test tests\sector_offensive.test.ts`
- `cmd /c node_modules\.bin\tsx.cmd --test tests\bot_corps_ai_sector_contract.test.ts`
- `cmd /c node_modules\.bin\tsx.cmd --test tests\scenario_operation_diagnostics.test.ts`
- `cmd /c npm run typecheck`
- `cmd /c npm run recovery:check`

Scenario evidence:

- `runs/apr1992_definitive_40w__7c821fa7d934716d__w40_n158/run_summary.json`

## Outcome

The operational recovery plan is materially stronger after this slice:

- planning now behaves like operational preparation instead of a fixed wait state
- sector rearrangement remains part of the live game
- combat-causality validity is protected against real silent failures without being tripped by ordinary operational lulls

This does not by itself complete the broader calibration/governance cleanup, but it does restore a working and test-backed runtime baseline suitable for continuing that work.
