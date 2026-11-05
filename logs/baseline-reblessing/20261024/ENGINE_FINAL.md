# Engine / determinism final review

Date: 2026-10-24  
Seat: independent Engine, systems, and determinism review  
Scope: qualified adoption of the eight baseline hashes only; no gameplay or calibration tuning

## Verdict

**GO — adopt the qualified eight-hash manifest change.**

The final working-tree change is confined to `data/derived/scenario/baselines/manifest.json`: eight removed hash values and eight replacement hash values. The retained producer completed successfully, and the bounded read-only qualifier independently established that the produced target and manifest meet the approved Engine and determinism gates.

This verdict does **not** convert the original update wrapper to green. `tmp/baseline-rebless-20261024/update-01/receipt.json` remains the authoritative RED wrapper receipt (`child_exit: 1`, `wrapper_exit: 126`). Its retained producer record is green (`exit: 0`, no timeout); the wrapper failed afterward because it trimmed the leading porcelain status column and compared `M ...` with the required ` M ...` form.

## Final evidence reviewed

- `tmp/baseline-rebless-20261024/update-qualification-01/receipt.json`: qualifier `child_exit: 0`, `wrapper_exit: 0`, no timeout, no stderr, complete artifact contract. The bound qualifier snapshot has raw SHA-256 `1aed441a1d420b7504e1b4b5a8943c1889a37ae76862a527e552da5052084645`.
- `tmp/baseline-rebless-20261024/update-qualification-01/QUALIFICATION.json`: `pass: true`, `failures: []`, elapsed 11,825 ms under the 180,000 ms cap, expected clean source head `a913286803a095b6dc3f57a44175081d6ae4b8eb`.
- The retained RED attempt is bound as exactly ten regular files with exact byte counts and raw SHA-256 values. Its receipt, entry snapshot, preflight artifacts, launch, producer execution, stdout, and stderr all match the reviewed attempt.
- Raw manifest reconstruction passes: replacing precisely the eight new hashes with the eight old hashes recreates the prior manifest byte-for-byte (`67774c275f206633a931d1d1aa3990336d1dd0e0877ebaaf924feb6f75378888`). Every old and new hash occurs exactly once.
- The target contains exactly 15 regular files and no other entries. All eight default-profile artifact hashes equal the accepted manifest hashes, including `weekly_report.jsonl` SHA-256 `b7024560561a2e8eceae114c77b6003d939163d81971e9f610842f2e90de296f`.
- The seven non-weekly artifacts match the n94 accepted-run inventory exactly. The weekly default-profile CI hash is checked directly; the separate n93 diagnostic projection is not used as a weakened comparator.
- Provenance is clean and bound to the expected head: 32 consumed inputs, zero mismatches, recomputed digest `88cf2d9ad4913bc62dde684d71465a28622c28b559713e4d0f13124ad8031c69`.
- Source outside the manifest matches the post-campaign snapshot exactly: 10,153 checked entries, one intentional manifest exclusion, zero failures.
- All 3,226 preservation bindings pass. C-lane telemetry retains the exact opening prefix and appends 1,893,342 bytes; D-lane telemetry is unchanged.
- The n94 run inventory remains exactly 40 files with zero mismatches.
- Fresh read-only checkpoint, consistency, health, protected-vs-n91, and protected-vs-n92 readers each exited 0 without timeout.

## Adoption boundary

The evidence supports only the eight hash replacements already present in the manifest. No production source change, baseline producer rerun, gameplay adjustment, calibration adjustment, comparator relaxation, or override is part of this GO. Final documentation and commit checks must retain the original wrapper failure and the later read-only qualification as separate facts.
