# Targeted correction verification — movement observer

## Verdict

**NO-GO for preparation integration until one remaining strict-schema defect and its fixture assertion are corrected.** The structural phase and terminal defects from the first independent review are corrected, but the current reader accepts nonnumeric weekly/receipt turn fields as valid coverage. The movement-positive production fixture also does not assert that either `runTurn` result is a success before treating its report as weekly-emittable evidence.

The first independent review remains preserved byte-for-byte at SHA-256 `a7c8b58fbc6cbc1689dfb421a808427a4d3e0a87f9190253ee30a6eca0906c1a`.

## Verified corrections

- **All actual named phases:** the central wrapper now appends every invoked phase to both `report.phases` and the observer manifest with the same zero-based index, name, and `war`/`early-war` group (`src/sim/turn_pipeline.ts:147-165,229-242`; `src/sim/combat/movement_phase_diagnostic.ts:109-125`). Duplicate phase names remain distinct by index. The bottom-up production fixture asserts that early-war entries are present and that the manifest equals `report.phases` (`tests/movement_phase_diagnostic.test.ts:95-115`).
- **Fresh terminal gap detection:** success and invariant-failure branches invoke `terminalBoundary` only after `runPostTurnInvariantBarrier`; the success receipt is immediately before return after the remaining hooks (`src/sim/turn_pipeline.ts:177-203`). `terminalBoundary` takes two fresh snapshots rather than copying the last phase result (`src/sim/combat/movement_phase_diagnostic.ts:127-135`). The reader separately requires terminal self-consistency and last-phase-to-terminal continuity (`tools/diagnostics/movement_phase_coverage.cjs:109-117`).
- **Mandatory full-chain coverage:** at least one `actor:completed_turn` expectation is required; a configured row must have a nonempty ordered manifest, exactly one receipt per manifest index, one terminal receipt, continuity, an active terminal actor, and no unexpected selected actor/turn (`tools/diagnostics/movement_phase_coverage.cjs:20-28,76-125`). The corrected reader tests cover missing/unconfigured/empty, duplicate, out-of-order, malformed nested, discontinuous, terminal-gap, removed-actor, and contradictory disposition cases (`tests/movement_phase_coverage_diagnostic.test.ts:23-52`).
- **Truthful detached presence:** snapshots distinguish `absent`, `present_undefined`, `present_null`, and `present_value`, copy movement arrays, and preserve formation removal (`src/sim/combat/movement_phase_diagnostic.ts:4-18,68-106`; `tests/movement_phase_diagnostic.test.ts:75-93`).
- **Movement-positive canonical path and neutrality:** the fixture uses an active brigade, operational topology, and a real A→B order. It proves the `apply-brigade-movement` receipt changes location A→B and consumes the order, while ON/OFF next state, ordinary report, and ordinary weekly row remain equal; the enabled weekly JSON passes the strict reader (`tests/movement_phase_diagnostic.test.ts:95-123`). Default-off still returns before selector parsing and adds no report/weekly key (`src/sim/combat/movement_phase_diagnostic.ts:138-142`; `tests/movement_phase_diagnostic.test.ts:47-54`). No `GameState`/save field was added.
- **Determinism:** actor selection is copied, deduplicated, and sorted with `sortedIds`; receipts follow the fixed central phase order; snapshots are detached; no RNG, time, locale comparison, or engine-array reorder was added. This remains consistent with Engine Invariants §11 and the determinism matrix.

Current hashes match the corrected execution summary: observer `2bd875e6ca9df60838ad2e9ae2f29aba3129761ac515b5dd072387a5c6d49cb1`, pipeline `df4f7a8815995bc05d7bfa0bd3d9b2b6d65d1ff53e181e09c62a4478d15d9076`, reader `9692ca9b649d51c53216f465f728a09e20417984e555fc13c7b996ace420aeb4`, observer test `b4d86b1bc0c4c90b646d1c59351a3c5c22b566810d71abc46a2e3b20ac5b0798`, and reader test `eb3c80e95089a11859ac38d59c22174970dc5574761a348efd752d6aba4c54bc`.

## Remaining blocking defect

### P1 — string turn fields pass the strict schema

The reader compares `r.completed_turn` and terminal `completed_turn` to `row.week_index`, but it never requires any of those fields to be integers (`tools/diagnostics/movement_phase_coverage.cjs:88,97-100,112-116`). A malformed artifact using string `"21"` for the weekly index and every completed-turn field therefore satisfies equality and the numeric command-line expectation after template-string conversion.

One novel discriminator created that otherwise-valid artifact and ran:

```text
node tools/diagnostics/movement_phase_coverage.cjs logs/prusac-diagnostic-20260929/continuation4_movement_observer_20261004_numeric_schema_probe_artifact --expect-boundary actor:21 --json
```

Required result was exit `1` with a schema inconsistency. Actual result was exit `0`, `coverage:["actor:21"]`, and no inconsistencies. Evidence:

- `continuation4_movement_observer_20261004_numeric_schema_probe.command.txt`
- `continuation4_movement_observer_20261004_numeric_schema_probe.log`
- `continuation4_movement_observer_20261004_numeric_schema_probe.exit.txt`
- `continuation4_movement_observer_20261004_numeric_schema_probe_artifact/weekly_report.jsonl`

**Required correction:** require `Number.isInteger(row.week_index)`, `Number.isInteger(r.completed_turn)`, and `Number.isInteger(t.completed_turn)` before accepting a row or receipt, and add this exact string-turn negative to the reader tests.

## Evidence limitations and required wording

- The movement-positive fixture uses `off.nextState`/`on.nextState` and their reports without asserting `off.status === 'success'` and `on.status === 'success'` (`tests/movement_phase_diagnostic.test.ts:97-104`). An invariant-failure result also carries those fields. Add explicit success assertions before claiming the fixture proves a production weekly-emittable run.
- The source now places terminal capture in both success and invariant-failure returns, but the current four observer tests do not directly execute and assert the invariant-failure terminal branch. Source inspection verifies placement; retained tests do not provide runtime proof of that branch.
- The reader expectation is per selected actor and completed turn. A future enabled 139-turn run that emits the selected actor every week must request all actor/turn pairs `1..139`; requesting only turns 137–139 will correctly reject turns 1–136 as `unexpected_selected_actor`. No range semantics exists or is required for this preparation.
- The independent-review correction RED is honest but incomplete: exit `1` proves the fixed-manifest and terminal API defects, while a reader-test syntax typo prevented a meaningful pre-fix no-expectation assertion. No retrospective RED may be claimed.
- The original execution summary was overwritten by the corrected summary. Raw initial red/green/affected/post-green logs and the first review preserve the earlier evidence and hashes, but summary preservation itself was not maintained. Restore a backup if one exists or record this overwrite explicitly; do not reconstruct an “original” summary from memory.

Retained corrected checks are: correction RED exit `1`; correction reader syntax exit `0`; correction green 4 files/19 tests exit `0`; reader hardening 2 files/17 tests exit `0`; bottom-up 1 file/4 tests exit `0`; final reader 14 tests with syntax/test/diff exits `0`. These checks are bound to the hashes above, but none exercises the newly demonstrated numeric-type defect.

No typecheck, campaign, prefix, replay, full suite, or unchanged review was run. Existing n40/n39 verdicts and every Farz/protected-control/paint/denominator/save/canon/188-week/default-campaign gap remain unchanged. This observer still prepares a future measurement; it proves no historical writer or gameplay correction.
