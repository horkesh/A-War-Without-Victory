# Continuation 6 targeted reader correction

Scope was limited to `tools/diagnostics/front_distribution_writer_coverage.cjs` and `tests/front_distribution_writer_diagnostic.test.ts`. Producer hooks and all gameplay source remained unchanged during this correction.

## Preserved inputs

- Pre-review test copy: `continuation6_front_writer_20261004_test_pre_review.txt`, SHA-256 `61fa1efe43e07c1ec253ce2750695a9cd20b33384af9d8d340a108c08fb05314`.
- Pre-review reader copy: `continuation6_front_writer_20261004_reader_pre_review.txt`, SHA-256 `b287f7ffa94ba116a93e96f6c53bc66684bffc09947d39832dbc4054b20e3890`.
- Independent review and all prior packet/log files were left intact.
- The two disclosed unlogged diagnosis categories are preserved as transcript-derived readback, not raw-byte recovery, in `continuation6_front_writer_20261004_diagnosis_tool_readback.md`.

## Five corrected reader boundaries

1. Null or primitive invocation/write array elements now become named JSON inconsistencies. Later checks use safe object subsets and do not dereference malformed entries.
2. Strict production mode requires exactly the complete ordinal sequence `0/distribute-brigades-to-front`, then `1/final-distribute-brigades-to-front`, with every requested actor present once in each call group. Missing, duplicated, reversed, gapped, and `direct-call` substitution controls fail.
3. Write ordinals are validated globally for each turn/call/invocation, matching the producer. Per-actor write counts and helper sequences remain linked separately. The positive uses two selected actors and real global sequences `[0,1,2]` and `[0,1]`; a duplicate global ordinal fails.
4. Formation presence remains explicit. Movement state now requires a valid status and types optional stance, destinations, path, turns remaining, and owner. Movement order requires nonempty destinations and types optional stance and owner. Scalars must be finite and arrays homogeneous. Malformed status, stance, turns, missing order destinations, non-finite numeric JSON, and mixed-array controls fail.
5. Every write requires nonempty string candidate/target pools, the writing actor in `candidate_ids`, the selected target in `target_ids`, and typed helper-specific feature keys. Write identity must link to an invocation.

The positive reader fixture now calls both real named production phases, merges their diagnostics through the actual turn report, attaches that report through the weekly writer, and invokes the CLI with explicit expectations for both actors. It does not manufacture a single final-call receipt. OFF/ON complete-state and ordinary-report equality remain asserted.

Main Phase B `score` remains a deterministic hook-time reconstruction from the selected `target_stack_count`, `distance`, and constant weight. It is not a captured comparator trace or pre-selection record. Candidate/target pools are the available gameplay-ordered locals at `post_selection_pre_write`, not a record of every earlier rejected option. No historical n41 helper or original n37 cause is inferred.

## Exact checks

- Review-correction RED: `node node_modules/vitest/vitest.mjs run tests/front_distribution_writer_diagnostic.test.ts`, exit `1`, 2 of 5 tests failed. The old reader accepted the incomplete one-call artifact, and the new two-actor fixture initially had no writes until its real corps boundary included the path OSID. Evidence: `continuation6_front_writer_20261004_review_correction_red.*`.
- First correction GREEN attempt: same command, exit `1`, 1 of 5 failed. Reader/schema negatives passed; the fixture expected two writes but the real calls emitted five global writes (`[0,1,2]`, then `[0,1]`). This was a fixture assertion error, not a gameplay correction. Evidence: `continuation6_front_writer_20261004_review_correction_green.*`.
- Corrected focused GREEN before expanded mutation controls: same command, exit `0`, 5 of 5 passed. Evidence: `continuation6_front_writer_20261004_review_correction_green2.*`.
- Final focused GREEN with all call-order, ordinal, typed-schema, linkage, and structured-error controls: same command, exit `0`, 5 of 5 passed. Evidence: `continuation6_front_writer_20261004_review_correction_green3.*`.
- Final reader syntax: `node --check tools/diagnostics/front_distribution_writer_coverage.cjs`, exit `0`. Evidence: `continuation6_front_writer_20261004_review_correction_syntax.*`.
- `git diff --check`: exit `0`.

The 56 unaffected cases from the retained 61-case selection were not rerun. No manual TypeScript check, campaign, replay, broader suite, stage, commit, or documentation integration was performed.

## Final hashes

- Test: `98b318fb33f7c4b4b32777c09755ec1634e7f906530c41c637e5529521f5e7b7`.
- Reader: `cafa9bcde5995aa4543d1101f1cca92b3971cd272fc7f586afd9520d98cbd995`.
