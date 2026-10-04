# Independent review: front-distribution writer observation preparation

## Verdict

**NO-GO for adopting the preparation yet.** The producer-side observation is well bounded and the focused fixtures establish all six column-capable writer hooks plus both production callsites without a gameplay-state difference. The strict reader does not yet enforce the schema and full-call coverage claimed by the packet, and it can throw on malformed receipt-array elements instead of returning its structured inconsistency result.

The required correction is confined to the reader and focused diagnostic tests. No gameplay predicate, writer hook, threshold, order lifecycle, selector, canon, `GameState`, save, data, campaign, replay, or full-suite change is indicated.

## Actionable findings

### 1. Malformed receipt elements can bypass structured fail-closed handling

`tools/diagnostics/front_distribution_writer_coverage.cjs:68` detects a non-object invocation, and `:78` detects a non-object write, but later loops dereference those same values without guarding them:

- `:72` reads `write.formation_id` while matching invocation writes.
- `:81-83` reads invocation fields while grouping.
- `:87` reads write fields while linking.
- `:90-92` reads invocation fields while checking ordinals.

A `null` or primitive entry can therefore raise an uncaught `TypeError`. A nonzero process status is not enough for this reader contract: it must preserve the JSON result and report a deterministic inconsistency. The current negative controls cover a primitive weekly row, numeric actor, primitive candidate element, and malformed nested status, but do not cover null/primitive invocation or write entries.

**Correction:** validate arrays into safe object subsets, or guard every later traversal; add null and primitive invocation/write controls that require exit `1`, parseable JSON, and a named inconsistency rather than an uncaught exception.

### 2. The reader does not prove the two production calls or invocation-ordinal continuity

The reader accepts any listed callsite and any nonnegative invocation ordinal (`:68`), then checks only uniqueness of the combined actor/turn/ordinal/callsite key (`:69-70`). It does not require the production sequence `distribute-brigades-to-front` ordinal 0 followed by `final-distribute-brigades-to-front` ordinal 1, and it does not reject gaps, reversals, a single surviving call, or a `direct-call`-only weekly artifact. The CLI positive at `tests/front_distribution_writer_diagnostic.test.ts:76-106` contains one manually attached `final-distribute-brigades-to-front` invocation and therefore cannot establish the claimed two-call report-to-weekly-to-reader chain.

The separate phase fixture at `:117-142` does show both actual named phase callers in memory, ordered 0 then 1, and shows ON/OFF state plus ordinary-report equality. Those diagnostics are not passed through the weekly projection and strict reader in that fixture.

**Correction:** make expected production call coverage explicit and fail closed on a missing, duplicated, reversed, gapped, or unexpected call. The focused positive should pass the diagnostics produced by both actual phase callers through the real weekly attachment and the CLI. Preserve `direct-call` only for an explicitly declared direct-fixture mode, not as an implicit substitute for production coverage.

### 3. Write-ordinal validation disagrees with the producer for multiple selected actors

The producer assigns `write_ordinal` from the invocation-wide `this.writes.length` at `src/sim/combat/front_distribution_diagnostic.ts:134-143`. The reader groups writes per actor and requires each actor's ordinals to equal `[0, 1, ...]` at `tools/diagnostics/front_distribution_writer_coverage.cjs:90-92`. With two selected actors, a valid second actor's first write can have invocation-wide ordinal 1 and be rejected as non-contiguous. Conversely, per-actor duplicate zero ordinals can evade a true invocation-wide continuity check.

**Correction:** retain the producer's invocation-wide ordinal and validate the full write list once per invocation/callsite as a unique contiguous sequence, while keeping per-actor count/helper linkage separate. Add a two-selected-actor fixture with writes for both actors and a malformed global ordinal negative.

### 4. Movement snapshot and feature-input validation is not fully typed

`validActorSnapshot` uses one permissive validator for both movement state and movement order (`tools/diagnostics/front_distribution_writer_coverage.cjs:44-48`). It treats every checked field as optional, does not validate `stance`, `turns_remaining`, or other typed fields, and accepts an empty object or `{ stance: 737 }` as either a present movement state or order. This is inconsistent with the packet's claim of typed state/order snapshots. The retained RED proves only the newly added numeric `status` case.

`validFeatureInputs` at `:54-56` also accepts non-finite scalar numbers and mixed string/number arrays, although the TypeScript contract allows finite runtime numbers and homogeneous `string[]` or `number[]` values. Presence tags themselves are handled honestly: absent/undefined/null reject a stray `value`, and present values require one.

**Correction:** split movement-state and movement-order validators around their actual serialized shapes and validate every emitted field's primitive/array type. Require finite scalar numbers and homogeneous arrays. Add narrow malformed `stance`, `turns_remaining`, non-finite numeric, and mixed-array controls.

### 5. The reader does not enforce the candidate/selection linkage needed by the diagnostic claim

At `:78`, `candidate_ids` and `target_ids` need only be string arrays and `feature_inputs` need only contain allowed primitive categories. The reader accepts empty arrays, a selected `target_osid` absent from `target_ids`, a writing actor absent from `candidate_ids`, or an empty/wrong helper-specific feature object. That permits a syntactically valid receipt which omits the local selection evidence the observer exists to capture.

**Correction:** enforce formation membership in `candidate_ids`, target membership in `target_ids`, nonempty relevant lists, and helper-specific required feature keys/types. Keep the boundary honest: these are the producer's available gameplay-ordered pools and selected locals at `post_selection_pre_write`, not proof of every rejected pre-selection candidate.

## Producer and fixture assessment

The producer hooks are placed immediately before the existing direct-location or column-order mutations in `brigade_front_distribution.ts`. The recorder snapshots formation/order/state/roster/operation data into detached objects and arrays, labels the write boundary `pre_write`, labels selection inputs `post_selection_pre_write`, and states `prior_mutations_in_invocation_possible: true` and `causal_proof: false`. Invocation receipts cover selected actors even when no write occurs; an empty write list is coverage, not a refusal reason.

Topic gating occurs before selector lookup and the `state.meta.turn` fallback in `front_distribution_diagnostic.ts:160-167`, resolving the retained 29-test default-off compatibility failure. OFF does not create the recorder, read the movement selector, add a report key, or snapshot actors. Both production callers preserve the existing effective standing-OG feature value and merge diagnostics into `TurnReport`; the scenario writer projects that report field to the weekly row only when present.

The five focused cases empirically cover main Phase B plus the other five column-capable families through real `distributeBrigadesToFront` calls. Main Phase A's direct-location hook is source-inspected rather than separately exercised, which is consistent with the packet's six-column-writer fixture claim. The real-caller fixture proves both named phase calls, selected-actor no-write coverage at the second call, and ON/OFF state and ordinary-report equality. Repeated producer comparisons show the observer does not change the synthetic choices.

One summary phrase needs qualification even after the reader fixes: main Phase B's logged `score` is reconstructed at the hook from `target_stack_count + PHASE_B_DISTANCE_WEIGHT * distance`; it is not a captured comparator trace or pre-selection record. It is a deterministic post-selection derivation from selected locals. Candidate and target arrays likewise describe the source-provided pool at that hook, not all candidates rejected earlier.

## Evidence and process

- Required initial RED: exit `1`, one expected failure for missing observation capability.
- Initial focused GREEN: exit `0`, 5/5.
- First affected selection: exit `1`, 29 failures in one disclosed compatibility category caused by pre-gate `state.meta.turn` access.
- Corrected affected selection: exit `0`, four files / 61 tests.
- Reader-hardening RED: exit `1`, the numeric movement-status negative was accepted before correction.
- Reader-hardening GREEN: exit `0`, 5/5.
- Final affected selection: `continuation6_front_writer_20261004_final4_green.log`, exit `0`, four files / 61 tests.
- Final reader syntax: exit `0`.
- Inventory: exit `0`; parent bindings, 52 retained raw artifacts, six run directories, two junctions, and protected state/data/canon/hook boundaries are preserved.

Two intermediate focused diagnosis failures were not logged: one confused target IDs with candidate IDs and one selected the rear-stack anchor rather than the intended actor. The implementation summary discloses them, but no raw-byte evidence exists. Any tool-readback supplement can preserve the disclosed account, not recover original output bytes. This is a process limitation, not evidence against the final producer behavior.

I did not rerun tests, syntax, TypeScript, the hook, a campaign, replay, extractor, or unchanged source investigation. The retained green results establish current behavior only for their covered cases; they do not cure the reader contract gaps above.

## Claim limits and stopping rule

This preparation does not identify n41's helper or rejection reason, prove the original dirty n37/517th pre-order cause, connect later 737th admission, or alter Jajce/four-loss conclusions. n40/n41/n39 and late acceptance evidence remain reused; there is no baseline or calibration acceptance.

Correct the reader and focused tests once, then perform one targeted verification of these findings. The required repository hook remains root-owned after documentation settles. No production writer, gameplay, canon, save, state, data, campaign, replay, full suite, or manual TypeScript expansion is justified by this review.
