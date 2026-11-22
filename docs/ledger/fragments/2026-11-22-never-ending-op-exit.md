## 2026-11-22 — Never-ending-op exit: an executing op silent for 5 turns ends via the no-attack exit (hash-neutral on main)

Must-fix from the P3 brief 13 ruling 1, a pre-freeze engine gap. Calibration is held.

**Defect.** The no-attack exit in `advanceSectorOffensives` (5 execution turns) fired only while an operation's lifetime attack count was 0. An operation that attacked early and then went silent stayed in execution until `max_failures`. Its participants kept attack posture, which resets the idle streak, but drew no orders. Candidate B's runs show this for Operation Posavina Corridor (vrs_1st_krajina): silent after week 52 but never ending, carrying the whole idle-execution jump.

**Change.** `recordExecutionOrderSilence` (`sector_offensive.ts`) runs after `confirmLaunchedOperationOrders` on the same turn's orders. It keeps `silent_execution_turn_streak` on each executing sector attack or probe:
- **+1** when no participant holds an attack order and none has a move in flight (a movement order, or a column packing, in transit or unpacking). Attack posture without an order is not an order.
- **Cleared** by any attack or move, by a late-phase hold on every axis, and outside execution.
- **Frozen** for manual-player factions, COHA-paused operations and corps bound by the October 1995 ceasefire.

At 5 the operation leaves through the same `beginRecovery(..., getNoAttemptRecoveryReason(op))` exit, which gives `max_failures` for an operation that attacked. The field is absent when 0, so saves are unchanged. The operations-expert seat accepted it, with its conditions applied.

**Measured.** No operation on main reaches the state; the longest silent streak in main's c2 pair is 4. An unlogged 188w pair at e9133d09f reproduces main's hashes: historical `7cb87ce9da304d62`, emergent `55644ff8370e0f3a`. final_save, AARs, temporal log, control and formation deltas, and the replay manifest are byte-identical. The weekly report and run summary differ from the saved c2 pair by one report-only masked_by_march week, from #838: c2 was produced before #838. Hash-neutral; rule 7.

**Tests.** `tests/never_ending_op_exit.test.ts` (8 tests; 7 fail on old code):
- an op that attacked, then is silent 5 turns, exits;
- a silent op with moves or a packing column in flight stays;
- the lifetime-0 exit is unchanged;
- an attack resets the streak;
- the manual-player freeze;
- the late-phase hold clear;
- determinism.

Canon: Systems Manual, beside the launch and recovery rules.
