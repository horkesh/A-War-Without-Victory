# Targeted correction verification: front-distribution writer reader

## Verdict

**NO-GO.** Four consolidated correction categories are closed, and candidate/helper linkage is substantially corrected, but structured malformed-input handling still has one concrete fail-open crash path. Do not adopt the preparation or proceed to the required hook until this reader boundary is consolidated and corrected.

Current reviewed bindings:

- Test SHA-256: `98b318fb33f7c4b4b32777c09755ec1634e7f906530c41c637e5529521f5e7b7`.
- Reader SHA-256: `cafa9bcde5995aa4543d1101f1cca92b3971cd272fc7f586afd9520d98cbd995`.
- Producer files were unchanged during the correction.

## Closed findings

1. **Production call coverage:** the reader now requires the exact production sequence `0/distribute-brigades-to-front`, then `1/final-distribute-brigades-to-front`. The positive sends both real phase-call reports through weekly attachment to the CLI for two explicitly expected actors. Missing, reversed, gapped, duplicated, and `direct-call` substitution cases are retained negatives.
2. **Global write ordinals:** validation now operates across each complete invocation/call group, matching the producer's invocation-wide ordinal. The real positive covers two actors and global sequences `[0,1,2]` and `[0,1]`; a duplicate ordinal is rejected. Per-actor count and helper-sequence checks remain separate.
3. **Typed snapshots and primitives:** movement state and movement order have separate allowlists and required fields. Status, stance, owner, turns, destinations, path, finite scalars, and homogeneous arrays are checked. Retained negatives cover numeric status, malformed stance/turns, missing order destinations, non-finite JSON numeric input, and mixed arrays.
4. **Candidate and helper linkage:** writes require nonempty string candidate/target pools, actor membership, selected-target membership, invocation linkage, and helper-specific required feature keys/types.
5. **Previously unsafe receipt arrays:** safe object subsets prevent the earlier null/primitive invocation and write dereferences. Retained controls require exit `1`, parseable JSON, and named inconsistencies.

## Remaining blocker

`tools/diagnostics/front_distribution_writer_coverage.cjs:105` correctly marks a missing, null, or primitive `feature_inputs` as an invalid write receipt through `validFeatureInputs`. The same write then reaches `validHelperFeatures` unconditionally at `:108`. That function checks the helper spec but does not first require `inputs` to be an object (`:76-79`); it calls `Object.prototype.hasOwnProperty.call(inputs, key)`. With a valid helper and `feature_inputs: null` or missing, this can throw instead of returning the promised structured JSON inconsistency.

The current `feature_inputs = {}` negative is safe and therefore does not exercise this path. The original requirement covered malformed presence and primitive/schema boundaries generally; a crash after an inconsistency has already been detected remains a failure of that same consolidated category.

**Required consolidated correction:** begin `validHelperFeatures` with an `isObject(inputs)` guard, and add null plus missing/primitive `feature_inputs` controls requiring exit `1`, parseable JSON, and a named `invalid write receipt` or `invalid helper feature inputs` inconsistency. Review the helper-specific validation call sites once for the same validate-then-dereference pattern. No producer or gameplay change is needed.

## Evidence and limits

- Correction RED: exit `1`, 2/5 failed, proving the old reader accepted incomplete one-call coverage; the two-actor fixture also initially emitted no writes until its real corps-boundary path included `mid`.
- First GREEN attempt: exit `1`, 1/5 failed because the real fixture emitted five valid writes rather than the asserted two. This fixture-count failure is preserved and was corrected without gameplay change.
- Subsequent focused GREEN: exit `0`, 5/5.
- Final expanded focused GREEN: exit `0`, 5/5.
- Reader syntax: exit `0`.

The diagnosis readback preserves two disclosed failure categories and notes another earlier full-file observation of the same rear-stack category. It is explicitly a tool-transcript readback, not raw-byte recovery or proof that exactly two unlogged runs occurred. All original receipts remain preserved.

Main Phase B `score` is correctly limited in the correction summary to a deterministic hook-time reconstruction from selected locals, not a comparator trace or pre-selection proof. Historical limits remain unchanged: no n41 helper/rejection attribution, original dirty n37/517th pre-order cause, later 737th admission link, Jajce/four-loss change, campaign, baseline, or calibration acceptance.

This verification did not rerun tests, syntax, TypeScript, the hook, a campaign, replay, extractor, or unchanged review scope.
