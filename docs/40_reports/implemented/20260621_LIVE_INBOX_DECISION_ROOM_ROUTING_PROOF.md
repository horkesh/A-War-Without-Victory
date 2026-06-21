# Live Inbox Decision Room Routing Proof

**Date:** 2026-06-21
**Result:** Implemented

## Summary
- Hardened `qa:live-surface:browser` so Presidential Inbox and Desk operation-opportunity routing is proven in a real browser with a deterministic in-memory fixture.
- Extended Decision Room primary ownership to campaign-cost cards: Cost review opens the Decision Room cost lens first, with Army HQ Records preserved as the source handoff.
- Kept QA fixtures non-persistent: the committed startup save is deep-cloned and overlaid only inside the browser harness.

## Changes Made
### Live Browser Proof
- Added `buildOperationOpportunityLiveProofFixtureState()` and `loadOperationOpportunityLiveProofFixture()` to `tools/ui/live_surface_browser_sweep.cjs`.
- The live sweep now loads a RBiH-scoped operation-opportunity review fixture, then clicks:
  - `presidential-inbox-card[data-inbox-item-type="operation_opportunity"]`
  - `desk-card-operation_opportunity [data-testid="desk-card-action"]`
- The proof hard-fails unless each route reaches `warroom-decision-room-host` and `presidential-decision-room`.
- The command-surface `cat_record` card remains scoped to turn/cost/memory record cards. Operation-opportunity archive coverage is proven directly through the Records opportunity ledger.

### Decision Room Ownership
- `finalizeCards()` now treats `cost` cards like command, operational, and turn cards for primary-route ownership.
- `PresidentialDecisionRoomLoopStep` carries optional `sourceHandoffTarget`, so the Cost product-loop step can preserve its Records source context while opening the Decision Room first.

## Verification
- Red proof: `npx.cmd vitest run tests/ui/presidential_decision_room.test.ts` failed before implementation on the `campaign-cost` direct Records target.
- Red proof: `npx.cmd vitest run tests/ui/first_hour_browser_gate_contract.test.ts` failed before implementation on the missing operation-opportunity live fixture.
- Green focused proof: `npx.cmd vitest run tests/ui/first_hour_browser_gate_contract.test.ts tests/ui/presidential_decision_room.test.ts` passed 45/45.
- `node --check tools\ui\live_surface_browser_sweep.cjs` passed.
- `npm.cmd run typecheck` passed.
- `npm.cmd run qa:live-surface:browser` passed; evidence showed `operationOpportunityFixture`, `presidentialInboxRoutingLiveProof`, `recordsAarFormationLinkLiveProof`, and `serverPortCleanupVerified`.

## Determinism / Scope
- UI read-model and QA harness only.
- No simulation logic, scenario data, committed startup artifact, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, randomness, timestamps, packaged installer artifact, or persisted output ordering changed.

## Files Changed
| File | Change |
|------|--------|
| `src/ui/map/data/presidentialDecisionRoom.ts` | Cost cards now keep primary Decision Room ownership and loop handoff metadata. |
| `tools/ui/live_surface_browser_sweep.cjs` | Added deterministic operation-opportunity fixture and strict Inbox/Desk Decision Room live proof. |
| `tests/ui/first_hour_browser_gate_contract.test.ts` | Pinned the new live fixture, selectors, route ordering, and evidence. |
| `tests/ui/presidential_decision_room.test.ts` | Pinned Cost card and Cost loop routing to Decision Room with Records as source handoff. |

## Next Steps
- Continue the adjacent Presidential Inbox review lane for reserve/personnel cases; decide which are true command-review items versus direct staff-execution handoffs before changing routes.
