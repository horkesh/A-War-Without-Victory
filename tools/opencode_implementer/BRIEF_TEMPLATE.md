# <job title>

## Goal
One or two sentences: the single outcome. Root-cause repair or diagnosis, not tuning, unless the brief says otherwise.

## Binding
- Base: `<branch>@<sha>` (the worktree is already checked out there).
- Facts already established (with paths to evidence). Do not re-derive these.

## Read first (exact paths, never "look around")
- `src/...:<line>`, `tests/...`

## Do
1. Write or extend the failing test `<tests/x.test.ts>` and run it: show RED.
2. Make the minimal change in `<src/...>`.
3. Run `node node_modules/vitest/vitest.mjs run <tests...>` and `node node_modules/typescript/bin/tsc --noEmit`, and report each exit code.

## Must not
- Change thresholds, scenarios, references, OOB data, or expected values in existing tests.
- Write outside the allowlist the launcher prints at the top of your instructions.

## Stop and report instead if
- The fix needs a file outside the allowlist, or a change to an expected value.
- The premise in "Binding" turns out to be false.

## Acceptance (the planner checks this, not you)
- `<tests>` green, tsc 0, gate:local green, diff limited to `<files>`.
