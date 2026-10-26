# Current-source actual-704 T16→17 fidelity diagnostic v3

Status: **HOLD FOR FINAL INDEPENDENT PRELAUNCH GO AND ROOT LAUNCH**. No engine, advance, query, stage, test, native, package, or campaign command has run while preparing v3.

## Sole question

Does current source at HEAD `33f99fc5` reproduce the retained **actual 704 cohort** turn 16 to turn 17 byte exactly, with no directive?

The only launcher is `launch_fidelity_v3.cjs`. The frozen mode assertion accepts only `fidelity-only`. It loads immutable T16, checks the public runtime serialize/deserialize boundary, requires no blocker, performs exactly one public `advanceTurn`, preserves the report and produced T17, compares the complete bytes to retained T17, writes the result, and returns. Query, staging, and the retained fork loop are unreachable. No full-fork launcher exists in v3.

The wrapper cap is 180 seconds, expected runtime is under 120 seconds, the fixed attempt leaf is single-use, and retry is forbidden. A future 23-turn fork remains disabled and requires separate review after this evidence settles.

## Exact cohort and runtime

V3 binds the actual native package-03 cohort: T16 `861d4e34…`, T17 `32d5b1bb…`, final T39 `623cbaed…`, native source HEAD `a3063366…`, and retained controller-map SHA `6ed89306…`. The final state is statically verified at 704/712 with exactly the recorded Korenici, Donje Žešće, and Tošići losses against both n91 and n92.

V1 remains preserved and rejected for its stale desktop bundle and wrong 705 cohort. V2 remains preserved and rejected because its loader argv named another worktree.

V3 loads `src/desktop/desktop_sim.ts` through the **literal authorized October worktree** loader:
`C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory/node_modules/tsx/dist/loader.mjs`.
The child argv uses the file URL for that same path. The launcher verifies that exact loader and aggregates `tsx`, `esbuild`, `get-tsconfig`, `resolve-pkg-maps`, and `@esbuild/win32-x64` through the same literal root. It also verifies Node, package lock, current critical source, retained evidence, exact HEAD, and an empty tracked/untracked `src/` and `data/` status before the engine import.

## Failure retention

On mismatch, v3 preserves expected and actual hashes, the entire produced T17, its report, and complete uncapped JSON-pointer difference paths, then stops. Missing inputs, runtime drift, blocker inventory, handoff mismatch, wrong turn, advance error, or artifact drift fail closed.

`run_preserved_preflight.cjs` allows exactly five child artifacts plus its own entry snapshot, start record, stdout, stderr, and receipt. Since all five are written on either a fidelity pass or a byte-mismatch failure after the advance, the primary child exit remains visible. A failure before those writes can yield wrapper exit 126 for missing required artifacts; `receipt.json.child_exit` and `RESULT.json.error` remain the primary category.
