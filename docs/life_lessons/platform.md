# Life Lessons — Platform, Tooling
> Split from docs/life_lessons.md on 2026-03-24. Master index: docs/life_lessons.md

---

### [Desktop] Extend the probe manifest — never add parallel probe commands (2026-04-08) — NEW
- **Context**: Six new real desktop routes (Warroom window, operational map, multi-window secondary, sandbox, CI enforcement, interaction contract) were proved across six commits by extending a single canonical `desktop:package:probe` manifest — not by creating `desktop:sandbox:probe`, `desktop:operational:probe`, etc. Each new route was added as a `window_checks[]` entry in `tools/desktop_packaged_runtime_probe.mjs`.
- **Wrong approach**: Creating a separate npm script for each new packaged route. Parallel probe commands fragment the contract: each becomes an independent CI failure mode with no shared lifecycle, and the full desktop contract is only visible by running all commands in sequence.
- **Right approach**: One probe command proves the full packaged desktop lifecycle in one pass. When a new route needs proving, add it to the existing probe manifest as an additional `window_checks[]` entry. The probe tool enforces the contract; adding a route to it makes the route a first-class requirement.
- **Do instead**: Only create a new probe command if the new route requires a fundamentally different launch mode (different executable, different environment). Otherwise, extend `window_checks` in `tools/desktop_packaged_runtime_probe.mjs`.

### [Desktop] Unit tests cannot prove packaged-mode behavior — CI needs a separate packaged probe job (2026-04-08) — NEW
- **Context**: `desktop-release-guard.yml` was added after recognizing that vitest passes even when the Electron packaged build has broken resource resolution, window routing, or IPC initialization. The smoke-test triad (tsc + vitest + build) produces a clean artifact but cannot prove the artifact actually works in packaged mode. This gap was only visible after building and running the packaged app.
- **Wrong approach**: Treating tsc + vitest + `npm run build` as sufficient verification for a desktop release. Unit tests run in Node with mocked Electron APIs; `npm run build` verifies bundling, not runtime behavior. Neither catches packaged-mode regressions.
- **Right approach**: `desktop:package:probe` must be a mandatory CI gate before any release artifact is published. Packaged mode has asar resource path resolution, native module loading, and window lifecycle that unit tests never exercise. The probe tool (`tools/desktop_packaged_runtime_probe.mjs`) must run in CI against the actual packaged app.
- **Do instead**: Any time desktop packaging is modified (electron-main.cjs, window factories, IPC handlers, preload scripts, route helpers), add `desktop:package:probe` to the CI job and verify it passes before merging.

### [Tooling] Grep for unused files misses .js extension imports — always tsc after bulk deletions (2026-03-21) — NEW
- **Context**: Agent-driven dead code scan grepped for `from.*filename` to find imports. TypeScript uses `.js` extensions in import paths (`from './foo.js'` resolves to `foo.ts`). The grep pattern didn't match these, flagging 18 actively-imported files as "orphaned."
- **Wrong approach**: Trusting grep results for unused file detection without compilation verification. Deleted 18 files that were actively imported, causing tsc errors.
- **Right approach**: After ANY bulk deletion, run `npx tsc --noEmit` immediately before committing. Restore files that cause import errors. Only commit after clean typecheck.
- **Do instead**: For dead code detection, use `tsc` as the source of truth, not grep. Grep is a fast first pass; tsc is the verification gate. Never commit bulk deletions without a clean typecheck + test run.

### [Platform] Git worktrees do NOT isolate tsx module resolution — always merge to main and run there (2026-03-21) — NEW
- **Context**: 14 scenario runs in the `.worktrees/zepa-calibration` worktree all used the MAIN tree's source code despite the worktree having different committed files. File hashes differed between worktree and main. `npm install` in the worktree didn't help.
- **Root cause**: tsx resolves imports through node_modules which can chain back to the main tree. Worktrees share the git repo but import resolution follows filesystem symlinks and module resolution algorithms that cross worktree boundaries.
- **Impact**: Wasted hours of investigation — every "fix" appeared to have no effect because the runner was executing the old code from main.
- **Do instead**: For calibration work, ALWAYS merge the branch to main and run from the main working directory. Use worktrees only for code editing isolation, not for running scenarios. Verify with file hash comparison: `md5sum <worktree/file> <main/file>`.

### [Tooling] weekly_report.jsonl uses `week_index` not `week` (2026-03-10)
- **Context**: Extraction scripts used `w.week` and got `undefined` for all entries. Field name is `week_index`.
- **Do instead**: For weekly report extraction, always use `week_index`. Check field names with `Object.keys(line)` before writing extraction scripts.

### [Platform] Windows shell uses semicolons (2026-02-07)
- PowerShell: `;` not `&&`. No recent violations.

### [Platform] Before promoting a path-gated CI job to REQUIRED, verify it reports SUCCESS (not "skipped") on out-of-path PRs (2026-06-12) — NEW
- **Context**: Promoting `engine-health-188w` advisory→required risked blocking EVERY doc/CI PR. A *required* status check that resolves to "skipped" (job skipped via a job-level `if:` or a skipped `needs:` dependency) is treated as not-success by GitHub branch protection → blocks merge.
- **Right approach**: The always-report shim must be: job ALWAYS runs (no job-level `if`), heavy steps gated by `if: steps.changes.outputs.relevant == 'true'`, and a green-fast SUCCESS step for the non-relevant case. Verify the `needs:` chain also always-runs (a skipped `needs` job skips the dependent). Then empirically confirm a real out-of-path PR goes green BEFORE adding the check to branch protection.
- **Do instead**: For `engine-health-188w` this was confirmed by inspection (scenarios + engine-health-188w have no job-level `if`) and empirically on #431 (`engine-health-188w pass, 4m58s` green-fast on a CI-only PR). Never flip a path-gated check to required without that confirmation.

### [Platform] Windows caches a file's size and mtime while a writer holds the handle — file growth is NOT a liveness signal (2026-08-22) — NEW

- A 73-minute `vitest` run redirected to a log appeared **frozen at 30,134 bytes for 33 minutes**: `ls -la` reported an mtime 33 minutes stale and `wc -c` reported an unchanged size, twice, seconds apart. The run was perfectly healthy. Two effects stack on this platform: the directory entry's size/mtime are not flushed while the writing process holds the handle open, and `stdout` redirected to a file is **block-buffered**, so content lands in chunks rather than continuously. `cat file | wc -c` does not help — it reads through the same stale metadata path for the length.
- **Do instead**: to decide whether a long-running job is alive on Windows, sample the **process CPU counter**, not the output file — `(Get-Process -Id <pid>).CPU` twice a few seconds apart; a rising value is proof of work. Cross-check that total CPU seconds ≈ wall-clock seconds for a single-threaded job. Reserve log tailing for *progress*, and even then parse completed-unit markers rather than byte counts. **Corollary, learned the same hour:** do not report "no output for N minutes" as "stalled" — the harness notifies on completion; wait for it, or check CPU.

### [Platform] ★ NEVER JUNCTION `node_modules` ACROSS WORKTREES WHILE ANOTHER AGENT IS ACTIVE (2026-08-27) — NEW
- **Context**: A parallel lane's worktree was given a directory junction pointing `node_modules` at the main worktree's, to skip a 3-minute install. Mid-session the lane broke: `node_modules/playwright/` was stripped to a bare `lib/` with no `package.json` and `npm ls` reported empty, because the other agent was running an install in the main tree at that moment (the version also moved `0.9.6-alpha.1` → `0.9.9-beta.1`). This killed **both** drivers — the UI probe needed `playwright`, and the headless harness needed `tsx`.
- **Wrong approach**: Sharing a dependency tree between worktrees when anything else may write to it. For a lane whose entire purpose is running **in parallel** with another agent, this guarantees their every install breaks it mid-run, at an unpredictable moment, with confusing symptoms (`ERR_MODULE_NOT_FOUND` for a package that demonstrably worked minutes earlier).
- **Right approach**: An isolated worktree gets an isolated `npm install`. Three minutes once beats an unbounded number of mid-run failures. Note `src/ui/map/node_modules` is a **separate nested install** with the identical hazard.
- **Do instead**: If a symptom is "a module that worked five minutes ago is now missing", check `node_modules` mtime and look for a live install process before debugging your own code. Windows junctions make this invisible — the path resolves fine and the contents change underneath.
