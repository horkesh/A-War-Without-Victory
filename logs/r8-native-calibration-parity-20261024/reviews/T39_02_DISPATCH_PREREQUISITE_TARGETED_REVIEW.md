# Targeted review: Advance dispatch prerequisite integration

**Verdict: GO for one short packaged RBiH Historical turn that proves the corrected production Advance route and settled turn-1 capture.** This does not yet re-authorize a 39-turn campaign.

## Frozen sources

- `tools/ui/paradox_local_qa.cjs`: `e47dce360ea538ccdae4fff4cc183d4c6166c64c4dd7f46585db285fc9ab6086`
- `tests/paradox_local_qa_harness.test.ts`: `9e978fd94759b767dfbf3acd37eb6b9c23a81bd702acc1f806d836c6acd6e955`
- Receipt: `T39_02_DISPATCH_PREREQUISITE_CORRECTION_RECEIPT.json`, SHA-256 `f4c4d4cf3dca1f541db9e24c620b4ff289ba69833d8e1a2fd97cea11f567eedb`

The prior reachability defect is closed. `prepareAdvanceDispatch` now rejects the retained pre-handler blocker state before surface recovery, archive, checkpoint, or dispatch. On the zero-blocker path it recovers the exact advance surface, captures settled evidence and checkpoint work for turns above zero, rereads canonical state, and requires both zero blockers and the settled-turn record before returning. Turn zero is explicitly identified as the separately captured canonical-initial boundary.

The behavioral hostile invokes the actual helper with a nonzero blocker and proves zero surface and archive calls. Its zero-blocker case proves the order `surface -> archive -> checkpoint` and requires the settled record. `playTurns` awaits preparation before invoking the dispatcher.

Independent targeted execution passed: **1 passed, 89 skipped**, exit 0. Implementer evidence records the complete focused suite at **90/90**, syntax exit 0, and nonincremental TypeScript exit 0. Previously reviewed exact modal ownership, direct-or-dialog outcomes, Decision Room closure, hydration, and t1 Save/Resume findings remain reusable.

Because t39-01 and t39-02 exposed distinct real-UI harness failures, the next native question should be limited to one turn with a fresh profile and no automatic retry. Pass requires an actual packaged normal Historical Advance transition, canonical initial boundary, provisional turn-1 archive, settled turn-1 archive after terminal drain, exact archive identities/hashes, and clean runtime/input diagnostics. The known daily two-OSID parity failure remains outside this reliability pass criterion and must remain reported.
