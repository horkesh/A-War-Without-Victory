# Independent review — suite scratch preservation repair

**Verdict: GO.** No critical, suggestion, or nice-to-have findings in the scoped change.

## Scope and authority

- Reviewed only `tests/run_vitest_balanced.test.ts`, `tests/vitest_balanced_receipts.test.ts`, and `tests/fixtures/vitest_balanced/receipt_nested_child.fixture.ts` against HEAD `b371adc3e0935825649e5eda4e6bbd45a44a359d`, plus the retained `suite-scratch-repair` evidence and the originating full-suite result.
- Did not inspect or assess the concurrent desktop/player-policy edits.
- Performed read-only source, hash, JSON, generated-config, and retained-output checks. No focused suite, full suite, build, native run, campaign, or commit was repeated.

## Findings

- Critical: none.
- Suggestions: none.
- Nice-to-have: none.

## Correctness and boundary review

- Each test module allocates a fresh output root using PID plus `randomUUID()` under the repository-ignored `tmp/player-bot-capability-parity-20261024/suite-scratch-repair/runs` root. `git check-ignore -v` binds this root to `.gitignore:215`.
- The old `rmSync` cleanup and writes into `.tmp_vitest_balanced_test` / `.tmp_vitest_balanced_receipts` are removed from the scoped execution paths. The only surviving `.tmp_vitest_balanced` reference is the unchanged negative assertion that receipt runs stay outside the generated-config directory.
- The production helpers remain the exercised boundary: fixture tests still call `renderBalancedVitestConfig`, `runVitestChild`, `runBalancedVitest`, `createReceiptRun`, and `receiptEnvironmentForLane`. No production runner code was changed or bypassed.
- Moving generated configs deeper requires a location-independent import. All 11 configs retained by the final run use the absolute `file:///.../tools/test/discover_test_files.mjs` URL produced by `pathToFileURL`; the retained failed first correction keeps its relative-import failure intact.
- `AWWV_VITEST_FIXTURE_OUTPUT_ROOT` is added only to explicit child environments in `vitest_balanced_receipts.test.ts`. The nested fixture requires that value and writes beneath it. It does not alter global `process.env`, receipt ownership, or unrelated `runVitestChild` calls.
- Test names and counts are unchanged: 16 contracts in `run_vitest_balanced.test.ts`, 7 in `vitest_balanced_receipts.test.ts`, and 1 nested-fixture contract. Assertions for intentional child failure, receipt identity, sequence, interruption, finalization error, fake-clock immunity, and create-new ownership remain present.
- The use of UUIDs and receipt clocks is confined to retained test diagnostics. It cannot enter GameState, saves, campaign outputs, or simulation ordering. This conforms to `docs/20_engineering/DETERMINISM_TEST_MATRIX.md` (balanced harness receipt diagnostics) and `docs/20_engineering/CODE_CANON.md` (receipt IDs/clocks are diagnostics only). No determinism risk was found. The determinism skill's listed `docs/PHASE_A_INVARIANTS.md` path is absent in this checkout; the applicable current authorities above and `docs/10_canon/Engine_Invariants_v0_9_0.md` were reviewed.

## Evidence binding

- The three `before/` snapshots have exact Git blob identity with HEAD. The three working files have exact SHA-256 identity with `final-manifest.json`, their `final/` snapshots, and the retained `final-source.diff` (10,230 bytes).
- All 22 entries in `evidence-hashes.json` match current file bytes and SHA-256 values.
- RED: exit 0, 23/23 outer tests passed, and independent opening/closing comparison finds 38 additions, 0 removals, and 0 modifications in the two legacy roots.
- First correction: exit 1, 17 passed / 6 failed. The retained log shows the expected deeper-config import-resolution failure. It remains unqualified and preserved.
- Final correction: exit 0, 23/23 tests passed. Independent opening/closing comparison finds 0 additions, 0 removals, and 0 modifications across the 461 pre-existing legacy-root files. The final output roots retain 8 files / 2,960 bytes and 31 files / 30,908 bytes respectively; inventory hashes are recorded in the JSON companion.
- Typecheck exited 0 (`tsc --noEmit -p tsconfig.json`). `git diff --check` is clean for all three scoped files.
- The originating full-suite result remains truthfully failed overall only because `scratch_preserved` was false: child exit 0, 15,020 passed / 0 failed / 33 skipped, receipt coverage pass, runtime authority exact before/after, telemetry prefixes exact, source stable, and 36 legacy-root additions. This review does not relabel that attempt as qualified.
- The repair changes only test fixture output ownership. It does not change production gameplay, telemetry producers, n91–n95 artifacts, tuning, calibration acceptance, or adoption state. Existing full-suite runtime and telemetry evidence remains reusable at its recorded scope.

