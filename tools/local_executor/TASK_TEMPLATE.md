# Executor task — <short title>

> Filled in by the PLANNER. The executor follows it and does not extend it.
> Copy this file, complete every section, delete the guidance lines.

## Files you may edit

<!-- Exact paths only. The executor must not search the repo: at 32K context it cannot
     hold it, and exploration is where a small model burns its budget and invents. -->

- `src/...`

## Files you may READ for context

- `src/...`

## The change

<!-- One paragraph, concrete. If it cannot be stated in a paragraph, it is too big for one
     executor task — split it. -->

## Acceptance — this is the oracle

<!-- Name the test files. The executor runs exactly this and may not choose a different
     definition of "done". If no test covers the change, the PLANNER writes one FIRST. -->

```bash
npm run gate:local -- --tests <comma,separated,test,files>
```

Done means that command exits **0**. Nothing else counts — not "it looks right", not
"the diff seems fine", not a passing subset.

## Hard rules

1. **Do not edit anything under `tests/`.** If a test looks wrong, stop and say so. The
   planner decides; the gate rejects test edits without explicit authorisation.
2. **Determinism.** No `Math.random`, no `Date.now`, no `new Date()`, no `.localeCompare(`.
   Sorted iteration uses `strictCompare`. The gate scans your added lines for these.
3. **Stay inside the file list above.** Touching anything else fails review even if the gate
   passes.
4. **Never `git stash`.** This repo has a deep stash stack containing other people's work;
   bare `git stash pop` pops `stash@{0}`, which is rarely yours. Use `git checkout HEAD -- <file>`
   to discard changes.
5. **Read a command's own exit code.** `cmd | tail; echo $?` reports the *filter's* status.
   Use `cmd > log 2>&1; echo $?`.
6. **If blocked, stop and report.** Do not widen scope to get unblocked. A stopped task with a
   clear reason is a good outcome; a silently expanded one is not.

## Out of scope

<!-- Name the adjacent things the executor might reasonably drift into, so it knows not to. -->

- Calibration, pins, floors, 188-week runs
- Canon (`docs/10_canon/`), §6, the enclave guard
- Anything not in the file list above

## Report back

- What changed, per file, in one line each
- The gate command you ran and its exit code
- Anything you noticed but did not touch
