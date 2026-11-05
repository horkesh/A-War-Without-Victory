# Player replay-input feasibility

**Verdict: `NOT_FEASIBLE_WITH_RETAINED_CONTRACT`.** The bounded owners were found, so this is not `SOURCE_OWNER_DISCOVERY_REQUIRED`. The inspected retained RBiH artifact and production replay path do not establish a complete input-reexecution contract. This is a scoped evidence gap, not a gameplay bug or a claim that replay input is globally absent or unrecoverable.

The producer chain is:

`paradox_local_qa.cjs` visible UI action -> desktop preload IPC -> `electron-main.cjs` mutation handler -> `desktop_sim.ts` mutation/`advanceTurn` -> `runTurn` -> harness result plus settled autosave archives.

The retained result has useful evidence: six event choices, two reserve receipts, two officer receipts, four final proposal records, 39 Advances, 39 settled archives, and 36 handled-action rows. The harness serializes them across `eventChoiceTranscript`, `events`, `playtest.turnEvents`, final-state receipts, and `proposalRecords` ([producer writes](../../../tools/ui/paradox_local_qa.cjs#L1317), [ordered loop rows](../../../tools/ui/paradox_local_qa.cjs#L5577), [result assembly](../../../tools/ui/paradox_local_qa.cjs#L7141)). The manifest binds faction, scenario/source, and initial/final autosaves, but contains no action stream.

The first failing seam is the absence of one complete consumed global action order. Concrete counterexamples from the retained artifact are:

- `rbih_state_identity` at turn 0 and `vance_owen_plan_1993` at turn 39 occur in `eventChoiceTranscript` outside `playtest.turnEvents`; the latter therefore cannot be the complete order.
- Four final `proposalRecords` exist, but this run has no `strategic-proposal:*` row in `turnEvents`; the final records do not establish the consumed selection or its position.
- Evidence contains 28 handled notice acknowledgements while `turnEvents` has 27 generic `acknowledge-visible-event-notice` rows. Exact notice identity lives in a separate array without a shared action ordinal.
- Event, reserve, officer, and proposal records do not all carry actor, phase, exact selection/payload, receipt, and direct settled-archive binding. Joining by turn or array position would invent order.

The direct positive consumer check also fails. Scenario replay output is a canonical `GameState` snapshot sequence or sparse frame summary produced after `runTurn` ([scenario emission](../../../src/scenario/scenario_runner.ts#L3417), [snapshot schema](../../../src/scenario/replay_save_emit.ts#L114)). Electron forwards those sidecars to the renderer ([sidecar owner](../../../src/desktop/electron-main.cjs#L337)). `ReplayScrubber` calls `replayPlayer`/`replaySummaryPlayer`, which only seek and select stored frames ([UI consumer](../../../src/ui/map/components/replay/ReplayScrubber.tsx#L51)). `replayPlayer` explicitly does not advance turns, mutate engine state, or trigger simulation effects ([consumer contract](../../../src/sim/replay/replay_player.ts#L3)). The real engine path is separately `advance-turn -> desktop_sim.advanceTurn -> runTurn` ([production advance](../../../src/desktop/electron-main.cjs#L2394)); no inspected replay consumer calls it.

This does not establish Engine Invariants §11.4's identical-input reproducibility requirement or the determinism matrix's requirement for identical state and phase inputs; it is not evidence of an invariant violation. Save/load reconstruction and stored-frame playback cannot substitute for input reexecution ([invariant](../../../docs/10_canon/Engine_Invariants_v0_9_0.md#L299), [matrix](../../../docs/20_engineering/DETERMINISM_TEST_MATRIX.md#L90)).

The smallest future implementation packet is:

1. Define a versioned deterministic `PlayerActionEnvelope` for the retained action kinds: global ordinal, kind, actor, faction, pre-turn, phase, exact payload/selection, authoritative receipt identity, post-action state hash, and settled-archive turn/hash.
2. Emit it at production IPC mutation and Advance boundaries, including pre-tour and post-loop actions, as one canonical ordered stream.
3. Add a production reexecution consumer that starts from the bound initial canonical save, dispatches each envelope through the same mutation owners, and calls real `advanceTurn`/`runTurn` for Advances. Reject missing, duplicate, reordered, or unconsumed actions.
4. Compare canonical bytes at every bound settled archive. Keep the existing snapshot/summary feature labeled as playback.

Cheap checks should cover schema round-trip, two same-turn actions, pre-tour/post-loop order, negative field/order cases, and one in-memory production-path micro fixture proving real action dispatch and `advanceTurn`; no native run or campaign is needed. One independent determinism/production-owner review is required after implementation, with one targeted correction verification if needed.

Both retained JSON inputs parsed, all 12 scoped files existed, and the raw search produced 15,365 matches in `source-matches.log`. Current harness SHA-256 `e47dce...6086` matches the retained manifest; current harness-test SHA-256 `9e978f...e955` matches the qualified 90/90 packet, so those tests were reused and not rerun. The source-trace worker ran no tests, native process, build, engine, replay or campaign. Root integration separately passed40/40 documentation/governance tests, plan-index validation and diff checks. No tuning or baseline action occurred. Raw evidence and hashes are beside this report.

Implementation remains a proposal, not part of this check. Record successful mutation-commit order rather than invocation or wall-clock order; retain rollback/error behavior and save compatibility. Existing run inputs must not be reconstructed by inventing missing payloads.
