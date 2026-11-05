# 733 independent review

**CHANGES_REQUIRED.** The sealed 732 focused evidence is internally consistent at its tested one-file scope, but the final source does not yet support `PASS_SCOPED_HARNESS` for an actual balanced multi-file run.

Four correction categories remain:

1. `runVitestChild` defaults to the parent's complete environment. During the actual balanced suite, the real nested Vitest child in `tests/run_vitest_balanced.test.ts` inherits the outer lane identity and appends unplanned events to that lane.
2. Receipt sequence starts at 0 in every custom-runner instance. Installed Vitest 2.1.9 dispatches isolated files as separate worker tasks even with `fileParallelism: false`, constructs a runner for each task, and reuses the same planner lane file. The sequence therefore resets between ordinary files.
3. `onAfterRunSuite` writes `execution_finish` before awaiting Vitest's native finalization hook. A native snapshot/finalization error can leave a false `pass` finish in the receipt.
4. `recorded_at_utc` uses the mutable global `Date` after test execution. A fixture that leaves fake timers active can emit fabricated or regressing diagnostic timestamps; no retained test covers this boundary.

The reusable evidence remains valid: focused 4 files / 34 tests exit 0; corrected root noEmit exit 0 with zero diagnostics; all 15 sealed source pins match; 76 generated manifest/JSONL files remain retained; the baseline contains 1,342 positive run-718 measurements plus six retained prior positives and no zero or negative weights. Runtime code reads but does not rewrite the tracked baseline. The repeated partition file conservatively retains 853,246 ms.

No new tests, full suite, campaign, or build were run because final-source inspection and the installed Vitest worker lifecycle establish the defects. Retained run 718 remains TIMEOUT with unknown in-flight work; historical 703/712/718 evidence and every NO-GO/unadopted gate retain their actual scope.
