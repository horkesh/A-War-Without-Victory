# Army Reserve Active-Operation Evidence / Why Support Is Needed Now

Date: 2026-04-09
Lane: v0.8-to-v0.9
Status: Implemented

## Objective
Preserve one real active-operation evidence seam without inventing deeper operation causality than the sim owns. The chosen seam was active-operation reserve generation: the reserve system already used live operation state (name, phase/sub-phase, momentum) to decide that elite support was needed now, but the canonical request packet and UI flattened that truth into generic offensive-support language.

## Candidate Seams Considered
1. Preserve active-operation phase/sub-phase/momentum evidence end-to-end.
- Chosen.
- Highest-value bounded step because the reserve generator already owned these values and used them directly.

2. Preserve captured-objectives exploitation evidence end-to-end.
- Deferred.
- Valuable, but it is a separate driver and should stay its own lane rather than being bundled into active-operation support.

3. Expose deeper commander escalation evidence.
- Deferred.
- Current commander packet already preserves the strongest owned signal; going deeper risks sim redesign.

## Seam Chosen
- Chosen seam: `active_operation` requests preserved the driver but not the concrete operation state that made reserve support necessary now.
- Why it was the best bounded step:
  - the sim already owned the evidence truth
  - the values were deterministic and already part of the reserve-generation decision
  - no operation-system redesign was required
  - it materially improves offensive reserve support explanation without widening into shell redesign

## Implementation
### Sim packet truth
Added canonical active-operation evidence fields to `ArmyReserveRequest`:
- `operation_name`
- `operation_phase`
- `operation_preparation_sub_phase`
- `operation_momentum`

`generateArmyReserveRequests()` now persists those values only when the winning reserve request driver is `active_operation`.
Other drivers continue to leave those fields unset, avoiding false evidence.

### Read-model preservation
`GameStateAdapter` now preserves active-operation evidence into `pendingReserveRequests`.
`armyReserveQueue` now preserves lead-critical active-operation evidence via:
- `leadCriticalOperationName`
- `leadCriticalOperationPhase`
- `leadCriticalOperationPreparationSubPhase`
- `leadCriticalOperationMomentum`

### Canonical evidence framing
Added one helper-driven active-operation evidence contract in `armyReserveSeverity.ts`:
- execution-phase operations with momentum produce:
  - `Operation "X" is already in execution with momentum +Y.Y, so reserve support is needed now.`
  - `Army HQ is reinforcing a live offensive before the current push loses tempo.`
- planning-phase operations with a preparation sub-phase produce:
  - `Operation "X" is in <sub-phase> preparation, so reserve support is being staged before execution begins.`
  - `Army HQ wants elite support in place before the operation commits to execution.`
- the helper remains silent for drivers whose packets do not own comparably sharp evidence.

### Player-facing surfaces
- `PresidentialToolbar` reserve signal title now includes lead critical active-operation evidence when present.
- `ArmyReservePanel` automatically renders the same canonical `What Signal Triggered This` block for active-operation requests through the shared helper.
- No new evidence owner was introduced.

## Files Changed
- `src/state/elite_loan_types.ts`
- `src/sim/combat/army_reserve_system.ts`
- `src/ui/map/data/types.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/utils/armyReserveSeverity.ts`
- `src/ui/map/components/PresidentialToolbar.tsx`
- `tests/army_reserve_system.test.ts`
- `tests/ui_map_game_state_adapter.test.ts`
- `tests/army_reserve_evidence_legibility.test.ts`

## Verification
### Red/green evidence cycle
- `npx.cmd vitest run tests/army_reserve_system.test.ts tests/army_reserve_evidence_legibility.test.ts`
  - initial run failed as expected because active-operation evidence fields and helper output did not exist
  - rerun after implementation passed: 2 files, 27 tests
- `npx.cmd tsx --test tests\ui_map_game_state_adapter.test.ts`
  - initial run failed as expected because the adapter did not preserve active-operation evidence
  - rerun after implementation passed: 17/17 tests

### Full validation
- `npm.cmd run test:vitest`
  - Passed: 231/231 files, 3084/3084 tests
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - Passed
- `npm.cmd run build`
  - Passed

## Resulting Product Truth
The reserve story now has a sharper evidence contract:
- `reason`: what kind of military need this is
- `severityBand`: how urgent it is
- `provenance_driver`: what produced the request
- driver-specific evidence:
  - sector-threat requests can expose the exact threat signal
  - active-operation requests can now expose the exact operation state that makes support necessary now

## Deferred
- captured-objectives / exploitation trigger evidence
- deeper upstream evidence for why a commander escalated a commander-driven request
- broader command-shell alert redesign

## Notes For Follow-On Work
The next clean evidence lane is not to generalize active-operation copy to every offensive request. It is to preserve another driver�s owned trigger evidence only if the sim packet already has it. If not, stop rather than inventing pseudo-causality.
