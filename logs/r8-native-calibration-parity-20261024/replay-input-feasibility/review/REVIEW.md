# Independent replay-input feasibility review

**Verdict: GO.** The retained evidence supports the scoped conclusion `NOT_FEASIBLE_WITH_RETAINED_CONTRACT`, and the integrated documentation carries the same bounded next action without claiming campaign qualification, an engine defect, or global absence of replayable inputs.

## Decisive evidence

- The retained RBiH artifact contains six `eventChoiceTranscript` rows, including `rbih_state_identity` at turn 0 and `vance_owen_plan_1993` at turn 39. Its `playtest.turnEvents` contains only 39 `advance-click`, 39 `settled-turn-archive`, and 36 `handled` rows. Those two choices are outside that array, so `turnEvents` cannot establish one complete consumed global order. Four final `proposalRecords` also have no `strategic-proposal:*` turn-event row; those records show final resolution state but do not prove a consumed player selection or its order. Evidence: `tmp-paradox-qa-20260710/paradox-local-qa-native-calibration-rbih-t39-20261024-03.json`; summarized without alteration in `artifact-action-coverage.json`.
- The 28 event-notice observations versus 27 generic `acknowledge-visible-event-notice` turn rows are only evidence that identity and loop action records are split. They do not establish a missing state mutation or gameplay bug, and the packet does not use them that way.
- The harness appends event choices separately at `tools/ui/paradox_local_qa.cjs:1317-1338`, loop actions/archives at `5577-5656`, and serializes the arrays together at `7135-7145`. Final proposal projection is independently sorted at `1501-1510`. Joining these surfaces by turn or final state would infer data that the retained contract does not serialize.
- The production replay surface is read-only stored-frame selection: `ReplayScrubber` constructs `replayPlayer`/`replaySummaryPlayer` and seeks cursors (`src/ui/map/components/replay/ReplayScrubber.tsx:51-98`); `replayPlayer` expressly does not advance or mutate simulation state (`src/sim/replay/replay_player.ts:1-10,100-126`); summary playback likewise selects stored frames (`src/sim/replay/replay_summary_player.ts:29-56`). Replay frames are canonical state snapshots emitted after turns (`src/scenario/replay_save_emit.ts:5-17,114-120,169-188`).
- Production Advance is a separate path: Electron handles `advance-turn`, deserializes current state, calls `desktop_sim.advanceTurn`, then writes the canonical state (`src/desktop/electron-main.cjs:2394-2443`); `desktop_sim.advanceTurn` calls canonical `runTurn` (`src/desktop/desktop_sim.ts:368-438`). No inspected replay consumer connects to that path.

## Determinism and ownership review

No determinism risks were introduced by this evidence/documentation-only packet. It correctly leaves same-input determinism `UNREACHED`: identical-output claims require identical inputs (`docs/10_canon/Engine_Invariants_v0_9_0.md:299-305`; `docs/20_engineering/DETERMINISM_TEST_MATRIX.md:90-94`), while stored snapshots are outputs rather than a reexecuted input stream. The proposed consumer remains future work and correctly targets the canonical desktop mutation and `runTurn` owners rather than treating snapshot playback as an engine entrypoint (`docs/20_engineering/CODE_CANON.md:36-42,90-94`).

Future implementation has two required boundary conditions:

1. Capture and bind a canonical starting save before action ordinal 0. The current retained initial save happens before `resolvePendingEventDecisionsBeforeFreeNavigation` (`tools/ui/paradox_local_qa.cjs:7023-7062`), but a new recorder must make this relation explicit for every recorded run rather than assume the current harness timing.
2. Assign global ordinals at successful durable mutation commit, after serialization, autosave, and renderer broadcast. Failed or rolled-back attempts must not become consumable actions. This follows the desktop durability invariant (`Engine_Invariants_v0_9_0.md:303-305`) and the packet's own successful-mutation wording; invocation time and wall-clock order are insufficient.

These are implementation acceptance conditions, not findings against the feasibility result. The proposed stream must also retain exact payload/selection, actor/faction/phase/turn, authoritative receipt, post-action state identity, and an unambiguous many-actions-to-settled-archive binding; it must reject missing, duplicate, reordered, or unconsumed envelopes without changing save compatibility.

## Documentation and preservation

Task-only diffs against `tmp/player-replay-input-feasibility-20261024/root/before/` agree across the active plan, Command Board, Master Roadmap, Calibration Master, knowledge ledger, project ledger, plan index, and `.gitignore`. They consistently say feasibility is complete, implementation is proposed but not authorized, same-input determinism remains unproved, and faction/native campaigns remain deferred. The portable `RESULT.json` records the root's focused governance result: 40 passed, 0 failed, plan-index exit 0, diff-check exit 0, and 10 protected files unchanged. Those checks were reused and not rerun here. All ten hashes in `source-hashes.json` match the current inspected files. No native, engine, replay, campaign, build, tuning, baseline, or source edit was performed by this review.

Residual scope remains the already-open player qualification: no same-input reexecution, later checkpoints, all-faction coverage, or campaign acceptance follows from this GO.
