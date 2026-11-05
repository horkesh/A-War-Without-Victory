# Continuation 4 movement observer execution summary

## Corrected result

The independent-review NO-GO findings were corrected in one bounded pass. An enabled, explicitly selected actor is now observed before and after every actual central `NamedPhase`, including skipped phases and bottom-up early-war phases. The manifest is built at the same central wrapper that appends `report.phases` and records ordered `phase_index`, `phase_name`, and phase group. Duplicate names remain distinct by index.

The terminal receipt takes two fresh detached snapshots after the invariant result is known and immediately before each success or invariant-failure return. Its `before` is not copied from the last phase receipt. The strict reader compares the last actual phase `after` with the fresh terminal `before`, so a non-named return-interval mutation fails as `terminal_discontinuity` and is not assigned to a synthetic writer.

Presence has four serialized states: `absent`, `present_undefined`, `present_null`, and `present_value`. Formation context, movement state, and movement order remain separate and detached. The reader requires an explicit `formation:completed_turn` expectation, a nonempty ordered manifest, exactly one valid receipt per manifest index, exactly one terminal receipt, continuity, active terminal actor state, and no duplicate weekly diagnostic. It fails closed for missing, unconfigured, malformed, duplicate, out-of-order, discontinuous, removed/inactive, unexpected-actor, and contradictory data. It always reports `causal_proof: false`.

The production integration fixture uses a real active brigade, injected operational topology, and an ordinary movement order from A to adjacent friendly B. Real `runTurn` moves the brigade at `apply-brigade-movement` and consumes its order. The test checks exact before/after location and order, executed disposition, the complete report-bound manifest, bottom-up phase coverage, terminal continuity, ON/OFF state and ordinary report equality, ON/OFF ordinary weekly-row equality, real JSON serialization, and strict-reader acceptance.

The bounded `src/scenario/scenario_runner.ts` import and weekly attachment call are included. Default-off runs do not parse the formation selector, snapshot actors, or add report/weekly keys. Enabled runs without a usable selector emit explicitly unconfigured diagnostics with no actor receipts.

## Exact executions

- OpenCode GoLuna checklist attempt: child exit `126`; `provider.quota`, HTTP `429`, `Go usage limit exceeded`. One attempt, no retry. Evidence: `continuation4_movement_observer_20261004_opencode.stdout.jsonl`, `.stderr.log`, `.exit.txt`, `.command.txt`, and `_opencode_instruction.md`.
- Initial implementation RED: exit `1`. Preserved as `continuation4_movement_observer_20261004_red.log` and `.exit.txt`.
- Initial implementation green, affected checks, and post-green proof are preserved but stale after independent-review correction.
- Independent-review correction RED: exit `1`; current reviewed source failed on missing terminal API and its fixed six-entry manifest versus the actual 190-phase report. Three observer assertions failed and one passed. The reader test file also contained a syntax typo, so no separate pre-fix meaningful no-expectation reader assertion was captured. This evidence limitation is explicit rather than repaired retrospectively. Evidence: `continuation4_movement_observer_20261004_review_red.log` and `.exit.txt`.
- Correction reader syntax: exit `0`. Evidence: `continuation4_movement_observer_20261004_correction_reader_check.log` and `.exit.txt`.
- Exact correction green selection: exit `0`; 4 files passed, 19 tests passed. Evidence: `continuation4_movement_observer_20261004_correction_green.log` and `.exit.txt`.
- Targeted duplicate/schema/reader verification after reader hardening: syntax exit `0`, 2 files passed with 17 tests, test exit `0`. Evidence: `continuation4_movement_observer_20261004_correction_verification.log` and `.exit.txt`.
- Real bottom-up manifest verification after strengthening the production fixture: exit `0`; 1 file passed, 4 tests passed. Evidence: `continuation4_movement_observer_20261004_bottom_up_verification.log` and `.exit.txt`.
- Final reader fail-closed verification: syntax exit `0`, 14 tests passed, diff exit `0`. Evidence: `continuation4_movement_observer_20261004_final_targeted_verification.log` and `.exit.txt`.
- No manual typecheck, campaign, prefix, replay, package build, or full suite was run. Root owns the one commit-hook typecheck after targeted independent verification.

## Current source hashes

```text
2bd875e6ca9df60838ad2e9ae2f29aba3129761ac515b5dd072387a5c6d49cb1  src/sim/combat/movement_phase_diagnostic.ts
6d9f085f43e75c9166fe05fcdb39bb7666e194a1e17cfc5a9eb3637d259a810f  src/sim/combat/reason_code_debug.ts
df4f7a8815995bc05d7bfa0bd3d9b2b6d65d1ff53e181e09c62a4478d15d9076  src/sim/turn_pipeline.ts
88fafd1665da2197e30596a259c4515072936ef0394bf94097dd06cd0875caa6  src/sim/turn_pipeline_types.ts
4462d71be7f1aee1edbd7d35019ab419ef154ef197c68dce1407102101ddbc91  src/scenario/scenario_reporting.ts
5a3ae5ab8cc00c4f8b9b8abe3368cad6f75c489bf3b38302d1ed2300dfe0b462  src/scenario/scenario_runner.ts
9692ca9b649d51c53216f465f728a09e20417984e555fc13c7b996ace420aeb4  tools/diagnostics/movement_phase_coverage.cjs
b4d86b1bc0c4c90b646d1c59351a3c5c22b566810d71abc46a2e3b20ac5b0798  tests/movement_phase_diagnostic.test.ts
eb3c80e95089a11859ac38d59c22174970dc5574761a348efd752d6aba4c54bc  tests/movement_phase_coverage_diagnostic.test.ts
63d8aab3b3915c840f685a62946a75b2b0937871c41c4395c91d6c81d80e05d8  tests/reason_code_debug.test.ts
```

## Claim limits

This observer prepares a future configured run to localize a movement change to an actual named phase. It does not reconstruct turns 137–139, prove their historical writer or ownership, recover the original turn-517 evaluator inputs, close the 188-week/default-campaign acceptance gaps, or authorize a gameplay correction. A terminal discontinuity would identify an unobserved non-named interval, not a writer.
