# Independent prelaunch review — v3

Verdict: **GO for the frozen fidelity-only command.** This verdict does not authorize the proposed 23-turn player-order fork.

Reviewer scope: canon, determinism, current-source runtime identity, retained-cohort identity, fail-closed ordering, and evidence preservation. No engine, advance, test, build, package, native, query, stage, or campaign command was run during review.

## Findings by pipeline stage

- **Question and cost:** GO. The sole question is exact current-source T16→T17 no-directive fidelity for the actual retained 704 cohort. The launcher permits one public advance, expects under two minutes, has a 180-second hard cap, fixes one absent attempt leaf, and forbids retry.
- **Cohort identity:** GO. Independently recomputed hashes match T16 `861d4e34…`, T17 `32d5b1bb…`, and final T39 `623cbaed…`. The final state scores 704/712 and has exactly the retained Korenici, Donje Žešće, and Tošići formerly-correct losses against n91/n92. The rejected v1 705 cohort is not an input.
- **Current-source runtime:** GO. HEAD is `33f99fc5`; `src/` and `data/` are clean. The child imports `src/desktop/desktop_sim.ts` through the literal authorized October-worktree TSX loader. The launcher verifies the same local loader and its local `tsx`, `esbuild`, `get-tsconfig`, `resolve-pkg-maps`, and `@esbuild/win32-x64` package trees before engine import. No other worktree runtime or source is referenced.
- **Freeze:** GO. `FREEZE.json` is `0b978915642590a9c6457c4395f875206afd93407c2f96cfcd777c7adc4e9dbd`; all seven listed packet files independently match their frozen byte counts and hashes. The reviewed CONFIG, entry, and sole launcher hashes are respectively `172ec9c13db0f87402929dc99ff6642947a957265fba9c5030180d70c6506e21`, `61e0182cd3a86df2bc2c31631723d4fda5e3d60eff1e612f40d9cc0fb90cfd74`, and `84f6b950dc338db7ede78c1565e6a0d4599ff68a47d747e1a80007a435498dc4`.
- **Exact fidelity gate:** GO. The retained T17 remains an independently hash-bound immutable file. The entry requires the T16 runtime serialize/deserialize handoff to reproduce the original T16 bytes, then compares current-source `serializeState` output directly against the raw retained T17 bytes. No shared normalization or lossy projection is used. A mismatch preserves the complete produced state, report, hashes, and uncapped JSON-pointer paths.
- **Reachability boundary:** GO. The fixed argv supplies only `fidelity-only`; the entry asserts that exact mode before the sole branch. That branch performs one `advanceTurn` and returns. Query/staging/fork code is unreachable, and v3 contains no fork launcher.
- **Evidence preservation:** GO. The fixed attempt leaf is absent and its parent exists. The preserved wrapper records entry snapshot, exact argv, stdout, stderr, child artifacts, and receipt. Pass and byte-mismatch paths write all five allowlisted artifacts. Earlier failures may add wrapper exit 126 for missing required artifacts; `receipt.json.child_exit` and `RESULT.json.error` retain the primary category and must both be reported.

## Authorized command

From the literal authorized worktree, run only the two-argument outer command frozen in `FREEZE.json`: Node `22.23.2` plus `launch_fidelity_v3.cjs`. Stop after the preserved result. Any hash, HEAD, source/data status, attempt-leaf, runtime-package, timeout, child, wrapper, artifact-contract, T16 handoff, blocker, advance, turn, or T17-byte failure is a final NO-FORK result with no retry.

## Output format changes

- None. This review authorizes no source, gameplay, data, schema, calibration, threshold, baseline, acceptance, package, native, or output-format change.
