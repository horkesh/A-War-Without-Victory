# Army Reserve Driver Provenance / What Produced This Request

Date: 2026-04-09

## Lane Summary

This lane closes a reserve-request provenance seam that remained after ownership, urgency signaling, severity framing, and cause framing were already cleaned up.

Before this change, the player could see:
- how severe a reserve request was
- the immediate cause framing for that request
- whether it belonged to presidential review or army reserve management

But the player could not truthfully see what *produced* the request in the first place when the sim had already made that distinction internally.

The highest-value bounded seam was explicit commander reinforcement pressure. `generateArmyReserveRequests()` already knew when a request came from `commander_reinforcement_requests`, but that provenance was being collapsed into a generic `reason` bucket such as `defensive_gap` or `offensive_support` before it reached the player-facing reserve packet.

This lane preserves that driver truth in the canonical request packet, carries it through the adapter, and gives the UI one helper-driven way to explain it.

## Candidate Seams Considered

1. Preserve explicit commander-request provenance end-to-end
- Chosen.
- Highest-value bounded step because it repairs truth at the sim/request boundary instead of downstream copy only.

2. Adapter-only provenance summary
- Deferred.
- Would improve read-model visibility, but it would still leave the source packet flattened and under-owned.

3. Reserve-desk-only provenance copy
- Deferred.
- Too narrow. It would improve one surface without establishing a canonical provenance contract.

## Canonical Ownership After Cleanup

Reserve request provenance is now owned by the reserve request packet itself.

- Sim owner:
  - `src/sim/combat/army_reserve_system.ts`
- Packet/schema owner:
  - `src/state/elite_loan_types.ts`
- UI read-model owner:
  - `src/ui/map/data/GameStateAdapter.ts`
  - `src/ui/map/data/types.ts`
- Presentation owner:
  - `src/ui/map/utils/armyReserveSeverity.ts`

No second provenance owner was introduced.

## Exact Seam Fixed

### Before

Commander-driven reserve escalation was flattened like this:

- sim generation detected `commander_reinforcement_requests`
- request `description` mentioned the commander signal
- canonical request `reason` was still inferred as:
  - `offensive_support`, or
  - `defensive_gap`

That meant the UI could truthfully explain the *kind* of need, but not what produced the request packet.

### After

The canonical request packet now preserves:

- `provenance_driver`
- `commander_request_priority`
- `commander_request_brigades_needed`
- `commander_focus_zone_id`

Current canonical driver set:

- `active_operation`
- `sector_threat`
- `captured_objectives`
- `commander_request`

The UI summary path now preserves and exposes:

- per-request provenance on `pendingReserveRequests`
- lead-critical provenance on `armyReserveQueue`

## Player-Facing Result

The reserve story is now:

- `reason` answers: what kind of military need is this?
- `severityBand` answers: how urgent is it?
- `provenance_driver` answers: what produced this request?

This distinction matters most for commander-driven requests. A reserve request can still be a defensive-gap request in military character while also being produced by an explicit commander reinforcement escalation.

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
- `tests/army_reserve_cause_legibility.test.ts`
- `tests/army_reserve_severity_legibility.test.ts`
- `tests/army_reserve_provenance_legibility.test.ts`

## Verification

### Targeted provenance coverage

- `npx.cmd vitest run tests/army_reserve_system.test.ts tests/army_reserve_provenance_legibility.test.ts tests/army_reserve_cause_legibility.test.ts tests/army_reserve_severity_legibility.test.ts tests/ui_map_game_state_adapter.test.ts tests/army_hq_presidential_review_coherence.test.ts`
  - Passed
  - 5 Vitest files passed / 37 tests passed
- `npx.cmd tsx --test tests\\ui_map_game_state_adapter.test.ts`
  - Passed
  - 16 tests passed

### Required full verification

- `npm.cmd run test:vitest`
  - Passed
  - 230 test files / 3076 tests
- `npx.cmd tsc --noEmit -p tsconfig.json`
  - Passed
- `npm.cmd run build`
  - Passed

## Residual Risks

- The player can now see the driver class that produced the request, but not the full deeper engine provenance chain behind that driver.
- For example, a commander-driven request still does not expose every upstream contributor that caused the commander to escalate.
- That is deliberate. This lane preserves owned truth instead of inventing deeper causality than the sim packet currently owns.

## Integration Notes

### `docs/PROJECT_LEDGER.md`

Add:

`2026-04-09 - Army Reserve Driver Provenance / What Produced This Request: preserved reserve-request origin truth in the canonical army reserve request packet by adding provenance_driver plus commander escalation fields (commander_request_priority, commander_request_brigades_needed, commander_focus_zone_id). generateArmyReserveRequests() now keeps explicit commander reinforcement pressure distinct from the generic military reason bucket, GameStateAdapter preserves that provenance into pendingReserveRequests and armyReserveQueue, and the reserve UI now explains what produced a request through one helper-driven provenance contract without folding reserve management back into presidential review or inventing deeper sim causality than the request packet actually owns.`

### `docs/plans/MASTER_ROADMAP.md`

Mark complete only if wording matches:

- reserve request packets now preserve canonical driver provenance
- commander-driven reserve escalation is no longer flattened into generic reason-only UI truth
- toolbar/Army HQ/reserve desk use one provenance framing contract
- no claim of full reserve-generation causal redesign

Recommended next lane:

- `Army Reserve Driver Evidence / What Signal Triggered This`

### `.claude/architect_notes.md`

Add:

`When a player-facing request packet already has correct owner boundaries, the next explanation upgrade is usually provenance, not louder copy. Preserve the source driver at the packet boundary before it is flattened into a more generic reason bucket. In AWWV reserve management, a request can still be a defensive-gap or offensive-support request in military character while being produced by explicit commander reinforcement pressure. Keep both truths: reason explains the kind of need, provenance_driver explains what produced the request.`

## Stop Reason

This lane is complete as a bounded provenance contract.

The next step would no longer be “what produced this request?” but “what exact signal or evidence inside that driver caused it to fire?”, which is a deeper provenance/evidence lane and should be treated separately rather than folded into this change.
