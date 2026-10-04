# Independent readiness review: continuation 7 front-writer campaign helpers

## Verdict

**NO-GO to launch the authorized campaign until the comparator replaces two proxy gates with exact typed event predicates.**

The normalizer and its fixture are ready. The fresh root-owned preflight has now completed with exit `0`: clean exact HEAD `2a1554a50866af292b949d3668ae45aec4e861fa`, Node 22, 11 reviewed source bindings, 30 normalized inputs with digest `ed7fa30986392451f797708a5a0fe9d3ac83f284692be04e199305c533a1f0b6`, runtime and prior-hook checks, and no provenance override. The earlier `_preflight*` collision remains a disclosed preservation defect, but the new `_root_preflight*` receipt independently supplies the launch prerequisite.

No campaign has run. This verdict concerns helper/campaign readiness only and is not calibration acceptance.

## Normalizer review

`continuation7_front_writer_campaign_20261004_normalizer.cjs` deep-clones each parsed weekly row, then removes exactly:

- top-level `front_distribution_diagnostics`;
- top-level `movement_phase_diagnostics`;
- top-level `bot_order_diagnostics`;
- nested `column_movement.column_rejections` only when `column_movement` is a non-null, non-array object.

It preserves `column_movement` itself, including an empty object after stripping; preserves null versus absent fields representable in JSON; and leaves ordinary counts, controller data, arrays, unrelated nested values, and all other keys unchanged. It does not mutate its input. Stable serialization sorts object keys while retaining array order.

The 13-assertion fixture imports the exact exported `normalizeWeeklyRow` and `stableText` functions used by the comparator. It proves the four deletions, input immutability, unrelated nested/null retention, empty/null/absent `column_movement` behavior, deterministic repeat, and sensitivity to changed ordinary/control counts. Retained RED is the missing-module failure; GREEN exits `0`; syntax for normalizer and comparator exits `0`.

Authoritative helper hashes match the packet:

- normalizer: `c3cb5e54e3a5ded5149e987582add7ed9eca71aa140e392fd8c3a46c09bd3990`;
- fixture: `7014df810e3255573c926792398a5e6b0118751c14b5d82e800a8e06bb24b69c`;
- comparator: `8e57420073add4f7cbfaee4b2feb42e84860c9b9215ff2d321617d3117e8b0ee`.

## Comparator checks that are ready

The comparator fails its verdict on false checks or read/hash failures. It checks the exact candidate commit and clean provenance, 139 weeks, exactly 30 consumed inputs, manifest and digest equality with n40, raw initial/final save SHA equality, reported final hash, three summary health categories, 139 normalized weekly rows, 139 control-count rows, and absence of `movement_phase_diagnostics`. It extracts actor-737 front-distribution invocations/writes and movement rejection values for completed turns 137–139.

Missing extracted fields are represented as `{ "status": "unreported" }`; an empty reported array remains reported and is not converted to zero activity. The helper does not claim the normalized weekly comparison is raw weekly byte equality. The unchanged continuation-4 full-control audit remains separately required for all controller maps, 173 ordered events, matching/protected OSIDs, and checkpoint denominators.

## Blocking proxy gates

### 1. Turn-138 write gate accepts any actor write

`actor_write_turn_138_reported` passes when the selected actor has any nonempty write array. It does not require the measured event needed by the authorized question: a `column_order` write whose `target_osid` is `op:bugojno:udurlije`, with a recognized helper and the expected `pre_write` / `post_selection_pre_write` boundary labels. A direct-location write or a write to another target would currently satisfy the pass criterion.

The strict front-writer reader validates receipt schema and call coverage, but it does not turn an arbitrary valid actor write into proof that the known Udurlije order was reproduced. The comparator must select and expose the exact matching write, while preserving all other writes as surrounding evidence.

### 2. Turn-139 rejection gate accepts an untyped actor entry

`actor_movement_reject_turn_139_reported` passes when `column_rejections` is a nonempty actor-filtered array. It does not require a nonempty recognized `reason`, the Udurlije destination, or the Gornja Rovna source context. An object containing only `formation_id` currently passes even though it cannot answer which rejection removed the known order.

Require an exact actor-737 rejection receipt with `destination_osid: "op:bugojno:udurlije"`, `location_osid: "op:busovaca:gornja_rovna"`, and a recognized movement-rejection reason. Preserve the full actor rejection array and use `{ status: "unreported" }` when the field is absent. Do not transfer n39's `posture_dig_in` value into the expected predicate; the new run must report its own actual reason.

These are measurement-identity gates, not gameplay expectations. They prevent an unrelated nonempty array from producing a passing comparison while still allowing the new campaign to reveal whichever valid helper and rejection reason actually occurred.

## Evidence integrity and limits

The original worker `_preflight*` source/log/exit paths were overwritten during a root/worker name collision. `continuation7_front_writer_campaign_20261004_collision_tool_readback.md` accurately labels the surviving facts as transcript-derived and the surviving JSON as insufficient for original byte provenance. The fresh `_root_preflight*` files are separate, current evidence and exit `0`; they do not retroactively recover the overwritten bytes.

After correcting the two comparator predicates, run only the existing 13-assertion fixture and syntax check needed to bind the changed helper, followed by one targeted readiness verification. The single authorized 139-week campaign remains unconsumed. No 188-week run, retry, production observer check, full suite, replay, gameplay correction, or source change is justified.

Any later passing run remains a bounded diagnostic measurement. It cannot prove the original dirty n37/517th cause, later 737th admission, Jajce/four-loss resolution, full-188 behavior, or calibration acceptance. The literal 31-input criterion remains failed and unwaived.
