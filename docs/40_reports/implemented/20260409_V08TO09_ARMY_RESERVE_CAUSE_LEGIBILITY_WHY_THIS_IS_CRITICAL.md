# Army Reserve Cause Legibility / Why This Is Critical

Date: 2026-04-09
Lane: v0.8-to-v0.9
Status: Implemented

## Objective

Improve player-facing causal legibility for army reserve pressure without inventing new truth owners, folding reserve management back into presidential review, or widening into broad shell redesign.

## Seam Chosen

Critical reserve requests were already owned correctly and severity was already legible, but the player still could not tell what underlying condition made a request critical. The highest-value bounded seam was to derive one short, truthful "why this is critical" explanation from the existing reserve request packet and reuse it consistently across:

- the army-level toolbar signal title
- Army HQ reserve handoff copy
- the Army Reserve desk request cards

## Design

Truth ownership after cleanup:

- `pendingReserveRequests` remains the raw cause owner
  - `reason`
  - `purpose`
  - `why_needed`
  - `description`
  - `priority`
- `armyReserveQueue` remains the canonical army-level summary owner
- presentation helpers in `armyReserveSeverity.ts` are the only copy/framing owner

The contract stays narrow:

- no new causal claims beyond what the request already says
- no reserve/presidential queue merge
- no new alert layer

## Implementation

### New/strengthened contract

Added a canonical cause-framing rule in `src/ui/map/utils/armyReserveSeverity.ts`:

- `offensive_support` -> active offensive needs elite reinforcement to sustain its main effort
- `defensive_gap` -> thin defensive sector needs immediate reinforcement
- `exploitation` -> local breakthrough needs rapid reinforcement before closure
- `enclave_relief` -> enclave relief effort needs reinforcement to keep/open a corridor

### Adapter changes

`src/ui/map/data/GameStateAdapter.ts` now exports a richer `armyReserveQueue` summary with deterministic lead-critical cause fields sourced from the highest-priority critical request:

- `leadCriticalReason`
- `leadCriticalPurpose`
- `leadCriticalWhyNeeded`
- `leadCriticalDescription`

### Surface changes

- `src/ui/map/components/PresidentialToolbar.tsx`
  - reserve urgency title now includes the lead critical cause instead of relying on color alone
- `src/ui/map/components/army_hq/PresidentialAttentionPanel.tsx`
  - existing reserve handoff summary now explains the lead critical cause through the canonical queue summary
- `src/ui/map/components/ArmyReservePanel.tsx`
  - each request card now shows a canonical cause block:
    - `Why This Is Critical` for critical requests
    - `Why This Needs Review` for routine requests
  - the reserve desk now uses the canonical `armyReserveQueue` summary instead of rebuilding its own attention copy from counts

## Files Changed

- `src/ui/map/utils/armyReserveSeverity.ts`
- `src/ui/map/data/types.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/App.tsx`
- `src/ui/map/components/PresidentialToolbar.tsx`
- `src/ui/map/components/ArmyReservePanel.tsx`
- `tests/army_reserve_cause_legibility.test.ts`
- `tests/army_reserve_severity_legibility.test.ts`
- `tests/army_hq_presidential_review_coherence.test.ts`
- `tests/ui_map_game_state_adapter.test.ts`

## Verification

Targeted verification:

- `npx.cmd vitest run tests/army_reserve_cause_legibility.test.ts tests/army_hq_presidential_review_coherence.test.ts`
  - passed, 9/9 tests
- `npx.cmd tsx --test tests\ui_map_game_state_adapter.test.ts`
  - passed, 16/16 tests
- `npx.cmd vitest run tests/army_reserve_severity_legibility.test.ts tests/army_reserve_cause_legibility.test.ts tests/army_hq_presidential_review_coherence.test.ts`
  - passed, 15/15 tests

Required project verification:

- `npm.cmd run test:vitest`
  - failed outside this lane in pre-existing unrelated areas:
    - `tests/operation_completion_truth.test.ts` (2 failures)
    - `tests/commander/elite_formation_utilization.test.ts` (2 failures)
  - reserve-cause-legibility tests passed
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - passed
- `npm.cmd run build`
  - passed

## Result

The player-facing reserve story is now easier to explain:

- presidential review remains its own queue
- reserve pressure remains its own army-level signal
- critical reserve pressure now names the underlying condition that pushed it over the line
- the same cause-framing rule appears in every relevant surface instead of changing tone or going silent

## Deferred

This lane does not claim stronger causality than the sim provides. It does not explain the deeper model behind `priority`; it only explains the visible request cause using existing request truth.

The next likely product lane is not more framing. It is deeper reserve-cause explanation if desired, such as surfacing which theater condition or commander request path produced the request without overclaiming.
