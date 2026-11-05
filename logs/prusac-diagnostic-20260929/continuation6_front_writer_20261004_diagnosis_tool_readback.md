# Tool-return readback for unlogged focused diagnoses

This is a preservation of information still available in the agent tool-return transcript. It is not a copy or recovery of the original stdout bytes, and no command was rerun to create it.

## Candidate-versus-target expectation diagnosis

- Command shown in the tool call: `node node_modules/vitest/vitest.mjs run tests/front_distribution_writer_diagnostic.test.ts`
- Available exit: `1`
- Available result count: 1 file failed; 1 test failed.
- Available excerpt: `expected [ 'actor' ] to deeply equal [ 'front_a', 'front_b' ]` at the `candidate_ids` assertion. The producer correctly used formation candidates in `candidate_ids`; the test had confused that list with `target_ids`.

## Rear-stack selected-anchor fixture diagnosis

- Command shown in the tool call: `node node_modules/vitest/vitest.mjs run tests/front_distribution_writer_diagnostic.test.ts -t "other five"`
- Available exit: `1`
- Available result count: 1 file failed; 1 test failed; 3 tests skipped.
- Available excerpt: `missing actor column write: []` at the rear-stack helper assertion. Deterministic ordering retained `actor` as the local anchor, so the fixture was corrected to name the other formation `aaa_anchor` and make `actor` the moving selected formation.

The transcript also contains an earlier full-file observation of the same rear-stack setup category. This supplement preserves the two disclosed diagnosis categories and their available command/exit/excerpt; it cannot establish byte identity, timestamps beyond the surrounding tool record, or a complete raw-output archive.
