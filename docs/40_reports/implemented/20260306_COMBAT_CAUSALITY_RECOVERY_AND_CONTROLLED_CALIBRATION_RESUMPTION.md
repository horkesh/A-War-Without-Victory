# Combat Causality Recovery and Controlled Calibration Resumption

Date: 2026-03-06

## Executive Summary

This report closes the main recovery lane that began when calibration success was shown to be partially disconnected from live combat behavior.

The repo could produce historically better-looking control results while parts of the operation and combat pipeline were inert, stalled, or misreported. That made debugging, calibration, and historical shaping contaminate each other.

The recovery lane re-separated those concerns and restored a calibration-safe runtime baseline.

Final verified recovery baseline:

- run: `apr1992_definitive_40w__7c821fa7d934716d__w40_n158`
- path: `runs/apr1992_definitive_40w__7c821fa7d934716d__w40_n158/run_summary.json`
- `final_state_hash = 3bfada3e56322112`
- `behavioral_health.valid_for_combat_calibration = true`
- `combat_causality.valid_for_combat_calibration = true`
- `total_attack_orders = 124`
- `total_battles = 103`
- `invalid_operation_count = 0`
- `zero_eligible_attacker_operation_count = 0`

## Recovery Goals

1. Freeze combat-calibration claims until combat causality was restored.
2. Debug one narrow causal chain:
   - operation injection
   - planning -> execution
   - brigade order generation
   - attack resolution
   - operation progress tracking
3. Split reporting into:
   - `behavioral_health`
   - `historical_fit`
   - `control_change_attribution`
4. Add hard invalid-state diagnostics and invariants.
5. Build a deterministic proof scenario.
6. Resume calibration only after the causality gate passed again.

## What Was Implemented

### Combat-causality gate

Primary files:

- `src/scenario/combat_causality.ts`
- `src/scenario/scenario_runner.ts`
- `src/scenario/scenario_reporting.ts`
- `src/scenario/scenario_end_report.ts`

Stable output families:

- `behavioral_health`
- `historical_fit`
- `control_change_attribution`

The live harness no longer depends on legacy `control_events.jsonl`.

### Hard invalid-state signaling

The harness now detects and reports:

- execution without attack orders
- execution without eligible attackers
- attack orders without battles
- recovery without logged attempt
- whole-run zero battles

Refinement:

- quiet weeks with no attacks and no invalid operations are warnings, not automatic failures
- attack-orders-without-battles still fails
- whole-run zero battles still fails

Architect decision flagged for later review:

- quiet operational lulls should not invalidate a run that otherwise has healthy combat causality

### Deterministic proof scenario

The proof lane exists and passes:

- scenario: `data/scenarios/apr1992_vrs_operation_proof_4w.json`
- test: `tests/scenario_vrs_operation_proof.test.ts`

Acceptance:

- at least one attack order
- at least one battle
- at least one operation-progress update
- deterministic rerun stability

### Operation lifecycle and brigade-control recovery

Primary files:

- `src/sim/combat/corps_command.ts`
- `src/sim/combat/sector_offensive.ts`
- `src/sim/combat/bot_brigade_ai_osid.ts`
- `src/sim/combat/bot_corps_ai.ts`
- `src/sim/combat/sector_rearrangement.ts`
- `src/sim/combat/pre_planned_operations.ts`

Recovered behaviors:

- `sector_attack` phase timing has one owner: `sector_offensive.ts`
- no-progress execution windows spend failure budget instead of hanging forever
- planning includes brigade movement into position
- planning can complete once brigades are staged or already on friendly approach positions
- operation-owned brigades stay under operation logic rather than being retaken by generic corps behavior
- live sector rearrangement remains in corps AI
- adjacent thin sectors can be concentrated into launchable offensive windows

### Reporting/UI/runtime coherence

Primary files:

- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/map/builders/buildFogOfWarGeoJSON.ts`
- `src/ui/map/components/FormationDetail.tsx`

Recovered behaviors:

- tactical fog uses the live `fogOfWar` adapter path
- operation-owned brigades are not incorrectly blocked in UI by `home_defense_active`
- benchmark fraction/share fields remain fractional in run summaries

## Lessons Learned

### 1. Good map fit is not proof of healthy combat

Do not treat area-weighted or count-based control fit as evidence that the combat engine is behaving correctly.

Do instead:

- cite `behavioral_health` first
- then `historical_fit`
- then `control_change_attribution`

### 2. Planning is a maneuver phase, not a timer

If an operation is in planning, brigades should already be moving into position.

Do not:

- model planning as passive waiting for a nominal duration to expire

Do instead:

- let planning move brigades toward staging and approach positions
- allow planning to end early once the force is actually ready

### 3. Quiet weeks and broken pipelines are not the same thing

Do not:

- invalidate a healthy run only because one week had no battles

Do instead:

- fail the run when there are attack orders but no battles
- fail the run when the whole run totals zero battles
- keep quiet weeks visible as warnings

### 4. Sector rearrangement must be judged at scenario scale

Do not:

- declare a live topology change safe because helper tests passed

Do instead:

- require full-run combat-causality evidence before accepting live corps-AI sector rewrites

### 5. Operation ownership must be real

Do not:

- let reserve logic, home-defense logic, or generic target selection silently retake operation brigades

Do instead:

- keep operation-owned brigades under the operation path until the op ends or is terminated

### 6. Recovery work needs discipline against bundled fixes

Use:

- one hypothesis
- one instrumentation/fix slice
- one verification cycle
- then docs update

## Must-Have Assumptions

1. `CALIBRATION_MASTER.md` is the control file for combat-calibration validity.
2. `behavioral_health` outranks `historical_fit` when interpreting run quality.
3. `control_change_attribution` is the live explanation layer for territorial change.
4. `control_events.jsonl` is obsolete for this war-phase lane.
5. Planning includes brigade movement into position.
6. Sector rearrangement is part of the live runtime, but only acceptable when full-run combat-causality stays green.
7. Whole-run zero battles is a hard failure.
8. No controller overrides from `RBiH` to `RS` are acceptable as a substitute for healthy opening-operation behavior.

## Do / Don’t

### Do

- read `docs/40_reports/CALIBRATION_MASTER.md` before touching calibration
- prove causality with attack orders, battles, and attribution
- use the proof scenario before broadening operation work
- treat operation planning/execution/recovery as one causal chain
- verify live topology or cadence changes with full-run evidence
- update ledger, calibration master, and napkin in the same session as the change

### Don’t

- call a run “better” because the map fit improved while behavioral health regressed
- revive Phase I flip-log thinking for current war-phase analysis
- treat quiet weeks as proof of broken causality without checking attacks and invalidation reasons
- patch scenario fit by hiding engine failures behind overrides
- let `sector_attack` lifecycle timing be owned by more than one subsystem

## Verification

Representative verification for this lane included:

- `cmd /c node_modules\.bin\tsx.cmd --test tests\scenario_vrs_operation_proof.test.ts`
- `cmd /c node_modules\.bin\tsx.cmd --test tests\scenario_operation_diagnostics.test.ts`
- `cmd /c node_modules\.bin\tsx.cmd --test tests\sector_offensive.test.ts`
- `cmd /c node_modules\.bin\tsx.cmd --test tests\bot_operation_objective_focus.test.ts`
- `cmd /c node_modules\.bin\tsx.cmd --test tests\bot_corps_ai_sector_contract.test.ts`
- `cmd /c npm run typecheck`
- `cmd /c npm run recovery:check`

## Final Status

The repo is now in the intended post-recovery state:

- combat causality restored
- reporting split in place
- proof scenario in place
- live scenario working again
- controlled calibration may resume under the gate

Remaining follow-on work is governance-level cleanup, not emergency runtime recovery:

- fuller override classification
- continued calibration under the reporting split
- continued discipline against mixing debugging, shaping, and tuning
