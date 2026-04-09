# Army Reserve Driver Evidence / What Signal Triggered This

Date: 2026-04-09
Lane: v0.8-to-v0.9
Status: Implemented

## Objective
Preserve one real reserve-driver evidence seam without inventing deeper causality than the sim owns. The chosen seam was sector-threat reserve generation: the sim already knew the concrete trigger signal (`threat_ratio` and assigned brigade count), but the canonical request packet and UI flattened that into generic urgency.

## Why This Lane
After reserve ownership, urgency signaling, severity framing, cause framing, and driver provenance were cleaned up, the highest-value remaining bounded gap was evidence. Commander-driven requests already preserved their strongest owned signal (`priority`, brigades needed, focus zone). Sector-threat requests did not yet preserve the exact signal that crossed the line.

## Seam Chosen
- Chosen seam: `sector_threat` requests preserved `provenance_driver`, but not the exact signal that triggered reserve escalation.
- Why it was the best bounded step:
  - the sim already owned the evidence truth
  - no redesign was required
  - the evidence is deterministic and numerically stable
  - it materially improves player-facing explanation for defensive reserve pressure without widening into shell redesign

## Implementation
### Sim packet truth
- Added canonical evidence fields to `ArmyReserveRequest`:
  - `sector_threat_ratio`
  - `sector_assigned_brigade_count`
- `generateArmyReserveRequests()` now persists those values only when the winning reserve request driver is `sector_threat`.
- Other drivers continue to leave those fields unset, avoiding false evidence.

### Read-model preservation
- `GameStateAdapter` now preserves sector-threat evidence into `pendingReserveRequests`.
- `armyReserveQueue` now preserves lead-critical sector-threat evidence via:
  - `leadCriticalThreatRatio`
  - `leadCriticalAssignedBrigadeCount`

### Canonical evidence framing
- Added one helper-driven evidence contract in `armyReserveSeverity.ts`:
  - only `sector_threat` with both numeric fields present produces evidence copy
  - summary: `Threat ratio X.Y with N brigade(s) on the line triggered this reserve request.`
  - detail: `Army HQ flagged this sector as too threatened for its current frontage.`
- The helper returns `null` for other drivers so we do not invent evidence the packet does not own.

### Player-facing surfaces
- `PresidentialToolbar` reserve signal title now includes lead critical evidence when present.
- `ArmyReservePanel` now renders a dedicated `What Signal Triggered This` block for requests whose packet owns evidence.
- The reserve desk now explains sector-threat reserve pressure through the same canonical rule used by the army-level summary, rather than local ad hoc copy.

## Files Changed
- `src/state/elite_loan_types.ts`
- `src/sim/combat/army_reserve_system.ts`
- `src/ui/map/data/types.ts`
- `src/ui/map/data/GameStateAdapter.ts`
- `src/ui/map/utils/armyReserveSeverity.ts`
- `src/ui/map/components/ArmyReservePanel.tsx`
- `src/ui/map/components/PresidentialToolbar.tsx`
- `tests/army_reserve_system.test.ts`
- `tests/ui_map_game_state_adapter.test.ts`
- `tests/army_reserve_evidence_legibility.test.ts`

## Verification
### Targeted reserve/evidence checks
- `npx.cmd vitest run tests/army_reserve_system.test.ts tests/army_reserve_evidence_legibility.test.ts tests/army_reserve_cause_legibility.test.ts tests/army_reserve_severity_legibility.test.ts`
  - Passed: 4 files, 34 tests
- `npx.cmd tsx --test tests\ui_map_game_state_adapter.test.ts`
  - Passed: 16/16 tests

### Full validation
- `npm.cmd run test:vitest`
  - Passed: 231/231 files, 3080/3080 tests
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - Passed
- `npm.cmd run build`
  - Passed

## Resulting Product Truth
The reserve story now has four distinct, non-overlapping layers:
- `reason`: what kind of military need this is
- `severityBand`: how urgent it is
- `provenance_driver`: what produced the request
- sector-threat evidence: what concrete signal triggered this request when the sim actually owns that signal

## Deferred
- deeper evidence for active-operation or captured-objectives requests
- upstream evidence for why a commander escalated a commander-driven request
- broader command-shell alert redesign

## Notes For Follow-On Work
The next clean evidence lane is not more copy work. It is whether another driver already owns comparable concrete trigger evidence that can be preserved without redesigning the sim. If not, stop rather than inventing pseudo-causality.
