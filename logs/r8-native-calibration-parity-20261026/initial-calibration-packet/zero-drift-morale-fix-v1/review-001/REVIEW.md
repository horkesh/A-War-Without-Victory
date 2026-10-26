# Independent implementation review — zero-drift morale repair

**Verdict: GO at source/focused-test scope. No blockers found.**

Reviewed only `src/sim/combat/morale_drift.ts`, `tests/morale_victory_feedback.test.ts`, and the preserved evidence under the parent directory. No test, API, campaign, or package run was added.

## Implementation

The production diff removes only `if (drift === 0) continue;` at the former line 266. It changes no constants, faction/home/existential floor values or eligibility, engagement/status/kind filtering, drift arithmetic/cap, floor ordering, critical-morale predicates, cohesion/personnel consequences, diagnostics, low-streak loop, schema, serialization, or phase ordering.

For nonzero drift, execution and output are identical. For zero net drift, the already-existing downstream invariants now execute: morale is clamped, eligible home/Standing-OG/existential floors apply, then critical cohesion/desertion consequences apply only if final morale remains below the existing threshold. `formations_updated` changes only when a floor changes morale. The later low-streak loop was already unconditional; a newly applied floor can now correctly reset rather than extend a stale low-morale streak. These are the intended, canon-backed differences.

The implementation preserves deterministic ordering: formation IDs remain `Object.keys(...).sort(strictCompare)` before both loops (`morale_drift.ts:188-191,350-362`); no RNG, time, unordered write, or new serialized field was introduced. **No determinism risks found** under `Engine_Invariants_v0_9_0.md:352-369`, `CODE_CANON.md:101-123`, and the stable-order rules in `DETERMINISM_TEST_MATRIX.md`.

## Tests and receipts

The two added production regressions are precise:

- zero-drift HRHB home defender: morale `0 -> 25`, cohesion/personnel unchanged, proving floor-before-consequences;
- zero-drift non-floor HRHB formation: morale remains `0`, cohesion `40 -> 38`, personnel `700 -> 665`, proving existing collapse consequences execute.

Preserved RED `red-01` exits child/wrapper `1/1`: 23/25 pass, with exactly those two tests failing (`0 != 25`, `40 != 38`). `green-01` exits `0/0`, 25/25. `focused-green-01` runs the six named morale/dissolution/Standing-OG/personnel files, exits `0/0`, 69/69. `typecheck-01` exits `0/0` with empty stdout/stderr. Every receipt reports no timeout/spawn error, matching entry-script pre/post hashes, and a passing artifact contract. Current SHA-256 bindings match exactly: source `170273f88521779af70cb71d87f5db5008bc2a5b0ac4e6206d0b0b2c59d4d8df`; test `f11492b2ace45f4fc259344fdeaa42db8b4f6123cb4e3db553b3595a40ea57aa`. `git diff --check` is clean.

## Canon and limits

The change restores the existing home-floor contract (`Systems_Manual_v0_9_0.md:139-141`) and existing morale/collapse behavior (`Systems_Manual_v0_9_0.md:85-87,389-393`; `Engine_Invariants_v0_9_0.md:86-93,352-369`). It adds no enclave exception or canon amendment, so no §6 panel is triggered at this exact scope.

Evidence limitation: preserved receipts fingerprint the worktree command, entry script, logs, and result artifact, but do not embed source/test hashes at run time; current hashes and exact RED/GREEN behavior provide the binding available. `node_modules` is an existing junction to the `april-1995-glamoc` worktree, visible in Vitest stack paths; this does not redirect project source imports, but dependency-tree provenance is not independently pinned.

This GO does not establish full-suite, authoritative campaign, package/native, calibration, or protected-anchor qualification. It does not resolve `health 13 > 3` and makes no score/calibration-gain claim.
