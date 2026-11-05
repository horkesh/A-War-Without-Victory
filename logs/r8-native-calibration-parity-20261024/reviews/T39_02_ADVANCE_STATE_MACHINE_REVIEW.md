# Targeted review: consolidated Advance state machine

**Verdict: BLOCK.** Exact owner classification and direct-or-dialog outcome observation are correct, but the play-loop integration can invoke the Advance dispatcher after detecting unresolved state blockers and skipping settlement.

## Frozen sources reviewed

- `tools/ui/paradox_local_qa.cjs`: `5cfb9d2e8d0e036c90200f4daf8d8876ed1f97381877700474d08dda70933170`
- `tests/paradox_local_qa_harness.test.ts`: `241bb3835b2703a18ada1492bdb2af9684d3f0662d7d95171f258be668d373c8`
- Receipt: `T39_02_ADVANCE_STATE_MACHINE_CORRECTION_RECEIPT.json`, SHA-256 `7e221daf37a4f4125116a1fc977011b025e32fa01237e943367f4e501c4f1f3e`

The helpers correctly replace whole-body classification with exact `[aria-labelledby="advance-turn-title"]` ownership, fail on duplicate/hidden/query errors, distinguish a direct one-turn transition from exact dialog appearance, and reject neither/both/skipped-turn outcomes. The production DOM and navigation tests support the two source-owned branches.

## Blocking integration defect

In `playTurns`, `archiveSettledTurn` and checkpoint work are guarded by `if (!unresolvedStateBlocker)`, but `dispatchAdvanceAfterSettlement` is called after that block unconditionally. If `handleCurrentSurface` returns false while blocker inventory is nonzero—for example, a blocker has no recognized or available visible action—the loop skips settlement and still clicks the exact toolbar or held confirmation.

That path violates the central invariant this correction is meant to establish: no Advance dispatch may occur unless the current state has zero blockers and the required settlement boundary has been reached. The current test proves only lexical ordering, not conditional reachability.

After an unhandled surface, the loop must fail immediately when `unresolvedStateBlocker` is true, retaining the exact blocker inventory. The dispatcher may run only on the zero-blocker branch after settlement/checkpoint work. Add a hostile test in which blocker inventory is nonzero and the handler returns false; it must prove the dispatcher is never called. Apply the same condition to a held confirmation so it cannot dispatch through a skipped settlement branch.

No native retry is qualified by this review. Closed exact-owner, direct-or-dialog, reserve-closure, hydration, and t1 reliability findings remain reusable.
