# Live Foundational Archive Proof

**Date:** 2026-06-21
**Result:** First-hour and live-surface browser gates now hard-prove foundational decision receipts and archive round trips.

## Summary
- `qa:first-hour:browser` now verifies Records and Chronicle receipts for RBiH, RS, and HRHB foundational decisions instead of only checking RBiH.
- `qa:live-surface:browser` no longer accepts `skipped:no-chronicle-target` for Records-to-Chronicle routing; absence of the route is a hard failure with screenshot evidence.
- The branch is browser-gate only; it does not change event content, simulation, save schema, startup data, calibration, or packaging.

## Changes Made
### First-Hour Gate
- Generalized the receipt proof helper to `verifyDecisionRecordsAndChronicle(page, summary, flow)`.
- Enabled `receiptCheck` for RS and HRHB opening flows.
- Added `receiptChecksByFaction` evidence with event id, title, response label, Records proof, and Chronicle proof.

### Live-Surface Gate
- Replaced the Records-to-Chronicle skip path with an evidence capture and thrown error.
- Kept existing Chronicle-to-Records, Desk-to-Records, and deterministic AAR fixture proof ordering intact.

## Verification
- Red proof: `node node_modules\vitest\vitest.mjs run tests\ui\first_hour_browser_gate_contract.test.ts --pool=forks --reporter=dot` failed on missing generalized receipt proof and the live `skipped:no-chronicle-target` path.
- Green contract: same command passed 6/6 after the fix.
- `npm.cmd run qa:first-hour:browser` passed; evidence confirmed RBiH, RS, and HRHB all had Records and Chronicle receipts.
- `npm.cmd run qa:live-surface:browser` passed; evidence confirmed Chronicle-to-Records and Records-to-Chronicle hard proofs.

## Files Changed
| File | Change |
|---|---|
| `tools/ui/first_hour_browser_gate.cjs` | Generalized all-faction receipt proof and evidence. |
| `tools/ui/live_surface_browser_sweep.cjs` | Removed the Records-to-Chronicle skip path. |
| `tests/ui/first_hour_browser_gate_contract.test.ts` | Pinned all-faction receipt proof and no-skip archive routing. |

## Next Steps
- Add a live Presidential Inbox card routing proof so inbox-originated command cards are proven to route to Desk/Decision Room ownership before any Army HQ handoff.
- Add a live Army HQ commander-quality proof for unexpected active command vacancies and commander display clarity.
