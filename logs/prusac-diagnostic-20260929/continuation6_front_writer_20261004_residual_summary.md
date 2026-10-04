# Continuation 6 residual reader correction

## Preserved boundary

- Pre-residual focused test bytes: `continuation6_front_writer_20261004_test_pre_residual.txt`, SHA-256 `98b318fb33f7c4b4b32777c09755ec1634e7f906530c41c637e5529521f5e7b7`.
- Pre-residual reader bytes: `continuation6_front_writer_20261004_reader_pre_residual.txt`, SHA-256 `cafa9bcde5995aa4543d1101f1cca92b3971cd272fc7f586afd9520d98cbd995`.
- The prior correction packet, failed verification, raw logs, producer, report wiring, and gameplay files remain unchanged.

## Consolidated diagnosis and correction

The remaining crash was the unconditional helper-specific validator call after the outer write-schema validator had already rejected `feature_inputs`. `validHelperFeatures` called `hasOwnProperty` on a missing, null, or primitive input. The sole reader change adds `isObject(inputs)` before any property access.

A validator-entrypoint scan found the other nested entrypoints already total for unknown JSON: `validPresence`, `validActorSnapshot`, `validFeatureInputs`, receipt safe-object subsets, and weekly-row validation guard before dereference. Table-driven controls now cover missing/null/primitive `feature_inputs`, null invocation snapshot, primitive write snapshot, null roster, primitive formation presence, null movement-state presence, and primitive target pool. Every case requires exit `1`, parseable JSON, and the named structured inconsistency. The valid two-call/two-actor production report-to-weekly-to-reader path remains in the same focused file.

## Exact evidence

- RED command: `node node_modules/vitest/vitest.mjs run tests/front_distribution_writer_diagnostic.test.ts`.
- RED exit: `1`; 1 of 5 tests failed with `Unexpected end of JSON input`, proving the CLI crashed before emitting its JSON result. Evidence: `continuation6_front_writer_20261004_residual_red.command.txt`, `.log`, `.exit.txt`.
- GREEN command: the same focused Vitest command.
- GREEN exit: `0`; 1 file, 5 tests passed. Evidence: `continuation6_front_writer_20261004_residual_green.command.txt`, `.log`, `.exit.txt`.
- Syntax command: `node --check tools/diagnostics/front_distribution_writer_coverage.cjs`.
- Syntax exit: `0`. Evidence: `continuation6_front_writer_20261004_residual_syntax.command.txt`, `.log`, `.exit.txt`.
- `git diff --check`: exit `0`.

No producer, gameplay, report, selector, state, canon, campaign, replay, broader suite, manual TypeScript check, stage, or commit action occurred. Main Phase B score and historical-causality limits remain exactly as stated in the prior correction summary.

## Final SHA-256

- `tests/front_distribution_writer_diagnostic.test.ts`: `3bd493d4b4d1f57fda979751e13abfd367054d66091d6ea3840fd38528124019`.
- `tools/diagnostics/front_distribution_writer_coverage.cjs`: `565b4b46af667008e1a2e88472ff1f9ca6dfc3a78ff82bb54e1e3f6f706e3152`.
