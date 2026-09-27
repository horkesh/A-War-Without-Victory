# Full-suite rerun — false-red diagnosis (2026-09-16)

## Summary

The first suite rerun at clean `ac3e5e152` exited 1 with **50 failed tests across 10 files**.
**None is attributable to the branch.** Nine files fail on one cause — `bash` resolution on this
Windows host — and the tenth is the already-known setup-hook timeout under suite load. A second
rerun with Git Bash prepended to `PATH` is the authoritative measurement.

Two distinct causes, kept separate rather than merged:

| Files | Cause |
|---|---|
| 8 × `tests/hook_guard_*.test.ts` + `tests/desktop_release_ci_guardrails.test.ts` | `bash` resolves to WSL, below |
| `tests/runtime_dependency_resolution.test.ts` | `Error: Hook timed out in 10000ms` — setup-hook timing under suite load, the same category Codex classified in the Jajce packet. Not a bash failure and not fixed by the `PATH` change. |

## Root cause

Vitest spawns `bash` for the hook-guard and CI-guardrail tests via `execFileSync('bash', …)`.
Launched from PowerShell without Git Bash on `PATH`, `bash` resolves to:

```
C:\Windows\system32\bash.exe        <- WSL bash
C:\Users\User\AppData\Local\Microsoft\WindowsApps\bash.exe
```

WSL bash cannot resolve MSYS-form paths. The guardrail test failed with the diagnostic that
names the cause exactly:

```
Error: Command failed: bash /f/A-War-Without-Victory/.github/scripts/detect-changed-paths.sh
/bin/bash: /f/A-War-Without-Victory/.github/scripts/detect-changed-paths.sh: No such file or directory
```

The file exists (`Test-Path F:\A-War-Without-Victory\.github\scripts\detect-changed-paths.sh`
is `True`); WSL would require `/mnt/f/...`. The hook-guard tests fail the same way one step
later: the guard script produces no stdout, so `JSON.parse(out)` throws
`SyntaxError: Unexpected end of JSON input` and the decision helper falls back to `allow`,
yielding `expected 'allow' to be 'deny'`.

This is the hazard `CLAUDE.md` already records: *"On this Windows host, scenario/release Bash
checks require Git Bash where their paths use MSYS syntax."*

## Evidence that the branch is not implicated

- The guard script works correctly when invoked from Git Bash directly:
  `echo '{"tool_input":{"command":"git stash pop"}}' | bash tools/hooks/guard_stash_pop.sh`
  returns a well-formed `deny` payload, exit 0.
- All ten failing files are **byte-identical to `main`** (`git diff --quiet main..HEAD -- <file>`
  is clean for each). The branch touches no file under `tools/hooks/`, `.claude/` or
  `.github/scripts/`.
- With `C:\Program Files\Git\bin` prepended to `PATH`, `tests/hook_guard_stash_pop.test.ts` and
  `tests/desktop_release_ci_guardrails.test.ts` pass **34/34, exit 0**.

## Affected files in the invalid run

Bash-resolution cause (nine files):
`tests/hook_guard_{stash_pop,inline_script,pipe_exit_code,large_read,dirty_citation,lookup_absence,scope_drift,truncated_search}.test.ts`
and `tests/desktop_release_ci_guardrails.test.ts`.

Separate timing cause (one file): `tests/runtime_dependency_resolution.test.ts`, as tabled above.

`tests/fixtures/vitest_balanced/deliberate_failure.fixture.ts` also reports one failure in every
run; it is the intentional child-process failure control asserted by
`tests/run_vitest_balanced.test.ts`, which passes. It is not a defect.

## Disposition

`full-suite-rerun.log` and `full-suite-rerun-launch.json` are retained as the invalid run.
`full-suite-rerun2.log` and `full-suite-rerun2-launch.json` carry the authoritative result and
record the resolved bash path in their first line. No source, test or configuration file was
changed to obtain the green.
