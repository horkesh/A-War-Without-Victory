# 811 independent review: strict reinforcement allocation reader

Verdict: **REJECT — one blocking completeness defect.** The v2 close manifest and the reader's complete-record checks are otherwise well scoped, but the reader can qualify a byte-truncated target record when truncation occurs inside the topic prefix.

## Blocking finding

**Critical — `tools/diagnostics/reinforcement_allocation_reader.cjs:237`: partial target prefixes are silently ignored.** The parser returns immediately for every line that does not start with the complete `[reinforcement_allocation]` token. Starting with the sealed real-producer fixture, I appended `[reinforcement_alloc` to model stdout ending mid-write. The reader accepted the stream, so the preserved probe deliberately exited 1:

- receipt: `logs/claude-channel-20261004/811-allocation-reader-review/attempt-01-partial-prefix/receipt.json`
- child exit: 1
- wrapper exit: 1
- artifact contract: pass
- stderr: `FAIL: reader accepted a stream truncated inside the target topic prefix`
- stderr SHA-256: `5fd44d00bbe3e9224dc1b8060ff93b8d6ea5196752de523bd4b549a431e7d094`

This violates the requested fail-closed treatment of truncated allocation records. A future source-bound campaign stdout could end in this state and still pass based on earlier complete blocks. Correct the parser so an identifiable partial target-topic prefix is rejected, then add real-fixture negative controls for cuts inside the prefix as well as inside JSON. Only the affected focused test and one targeted correction verification need to be rerun.

## What passed review

The observer keeps the gameplay file and its access order unchanged. It records the attempted recipient manifest before recipient emission, carries diagnostic construction failures to the close record, and the reader rejects nonzero diagnostic errors. Schema v1 is explicitly unsupported because it cannot prove omitted zero-transfer rows. Complete schema-v2 blocks enforce exact fields and presence tags, selector/header order, recipient order and uniqueness, per-recipient arithmetic, pool continuity and conservation, close manifests, all-observed-block validation, monotonic completed-turn order, and explicit per-turn invocation cardinality. The CLI is require-safe, requires all selectors, writes with `wx`, and retains exit classes 0/2/3.

Reviewed packet SHA-256: `ea62ebabf5672e7e953b806d084e1fb42287f470f71024e7b5e8a8a4891a2fa3`.

Reviewed file hashes:

- `src/sim/combat/reinforcement_allocation_diagnostic.ts` — 7113 bytes — `12d24113946ad414ae3f310a45c9d7f52e0a24bde916ed60f0001d18d4bacdc6`
- `tools/diagnostics/reinforcement_allocation_reader.cjs` — 20358 bytes — `f3a5959c79f4514843c779e0a73c9e2febe34358fcffb981466d7e14d7ae0237`
- `tests/reinforcement_allocation_diagnostic.test.ts` — 35098 bytes — `2fa7cd7770a5af6fe32ccd6a4b57689a3640e11188257b30983e4bddb30a33d9`

## Evidence reused

I reused the sealed implementer evidence because it snapshots these exact file hashes:

- final focused receipt `attempt-15-final-focused/receipt.json`: child 0, wrapper 0, artifact contract pass; 3 files, 67 tests, 67 passed, 0 failed
- final typecheck receipt `attempt-16-final-typecheck/receipt.json`: child 0, wrapper 0, artifact contract pass; nonincremental `--noEmit`
- seal receipt `attempt-17-seal/receipt.json`: child 0, wrapper 0, artifact contract pass
- 31 retained negative controls and real-producer fixtures; all six named red attempts remain preserved with child/wrapper exit 1 and passing artifact contracts

I did not repeat the unchanged focused run or typecheck. The one fresh check addressed an uncovered truncation boundary and used `run_preserved_preflight.cjs` with the entry, probe, reader, and real fixture snapshotted before execution. The closed probe inventory is recorded in `811-review.json`.

Protected hashes remain exact: `formation_spawn.ts` `741ec5e…`, reason gate `b7467c…`, C telemetry 102947714 bytes / `edbbff42…`, D telemetry 1041 bytes / `ff120d4a…`, threshold 3775 bytes / `c62dca5a…`, October reference 35266 bytes / `fef1c52b…`.

No production, test, or documentation file was edited by this reviewer. No build, full suite, replay, `runTurn`, scenario, or campaign was run. The future 188-week diagnostic is not ready for owner execution while this finding remains. The retained 703/712 result stays NO-GO and unadopted; this review makes no campaign-neutrality, historical-n80-cause, adoption, or acceptance-waiver claim.
