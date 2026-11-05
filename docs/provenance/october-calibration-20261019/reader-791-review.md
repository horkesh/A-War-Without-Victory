# 791 independent producer-reader review

**Verdict: accept the scoped reader repair with one inherited red test.** No open finding remains in the four-file change after the single targeted correction pass.

The review initially found three material defects: the reader and its test depended on ignored `logs/203` evidence; an empty or unrelated log passed with zero completion rows; and several computed filter values plus target/survivor ordering were not bound to producer semantics. The final code fixes these at `tools/diagnostics/commander_target_selection_reader.cjs:6`, `:194-250`, and `:333`. The tracked 203 copy is byte-identical to the immutable original at SHA-256 `250816bce802f41a02a3f6d8b215b0747fbf6c67466e8f2e588e30e40a629078`, while tracked tests no longer depend on the ignored original.

Fresh review evidence:

- `791-focused-final`: child/wrapper `0/0`, artifact contract PASS, producer-bound tests `2 passed / 0 failed / 14 skipped`; the negative matrix contains 23 contradictory or malformed mutations. The captured real producer output has nine rows and all nine statuses: `not_reached`, `no_brigade`, `no_sector`, `missing_adjacency_or_friendly_set_or_location`, `local_occupation_bypass`, `empty_enemy_set`, `empty_direct_set`, `all_filtered`, and `generic_search`. Rows SHA-256: `0837a8d40083ededc821dddfe92b42dfcdf4326382b78e175aab7e0c69ff2e67`.
- `791-reader-cli-final`: child/wrapper `0/0`, artifact contract PASS, `records=9`, `completion_rows=9`, `violations=0`.
- `791-require-safe-final`: child/wrapper `0/0`, artifact contract PASS; importing both reader and postrun modules caused no dispatch.
- Reused unaffected evidence: `790-observer-vitest` passed `60/60`; `790-exact-final-typecheck` ran on the frozen file and exited `0/0`. `790-closing-manifest` passed and independently pins all protected source/data/evidence bytes.

The focused baseline selector control is red by design of the existing HEAD, not by this repair. `791-baseline-selector-control` exits `1/1` on the assertion at `tests/commander/probe_target_selection_filter.test.ts:477`. A separate exact `git show HEAD` extraction at `790-head-baseline-probe-test` proves the baseline result: `14 total / 13 passed / 1 failed`, with the same selector assertion; the temporary baseline test was removed afterward. HEAD production at `src/sim/combat/commander/emit.ts:2306` unconditionally creates `probe_gate_receipt` whenever the `commander_creation` topic is enabled. Production source is unchanged and still has its opening hash. This is an inherited selector-contract contradiction requiring separate reconciliation; it does not invalidate the new producer-bound reader tests.

Final changed-file hashes:

- `tests/commander/probe_target_selection_filter.test.ts`: `e2a59b0b987c4ed11dc5fee66f274865b7852883856d6d9a615194097febd318`
- `tools/diagnostics/commander_creation_reader_203.cjs`: `250816bce802f41a02a3f6d8b215b0747fbf6c67466e8f2e588e30e40a629078`
- `tools/diagnostics/commander_target_selection_postrun.cjs`: `d4274e6c786a37ab7037feb85d2e1dd4ed590391aa8db67f6c38bc1591d95329`
- `tools/diagnostics/commander_target_selection_reader.cjs`: `98c9613c0d8fe2ce875cd14a75803f21c3cfbd96f7563e7851fe76740d3db21e`

Residual scope is explicit. The postrun composition is require-safe and ready but unexecuted against a campaign (`READY/UNREACHED`). This review qualifies only commander target-selection completion rows; it does not qualify the older stateful/intermediate-B reader, the whole personnel pipeline, telemetry, or campaign readiness. No full suite, package build, campaign, or telemetry run was performed or authorized.
