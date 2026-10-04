# Targeted verification — movement observer numeric correction

## Verdict

**NO-GO pending one adjacent actor-ID schema correction.** The requested turn/index validation and production success assertions are correct and bound to the new evidence, but the strict reader still accepts numeric actor IDs in the diagnostic manifest and receipts. A malformed numeric actor `737` is converted to the same templated expectation key as CLI actor text `737`, so the reader returns successful coverage.

This verification reuses the accepted structural observer review. It does not reopen phase coverage, terminal placement, presence semantics, report/save ownership, determinism, or the movement-positive production fixture beyond the two requested corrections.

## Verified requested corrections

- Current hashes exactly match the numeric correction packet:
  - reader `bb0a61a449e86304bfaa2fb8306a7082ef9c963ca10e51712175d5742788a6a9`
  - reader test `166406a0451e9e655aa7cb4a43b9e1023f75ff3b134b99fdc3a18d58a7b9cdd1`
  - observer test `4e8bcd9b72153c3d66300a79f8c326cad086d947884387a42287f14710793d8c`
- `week_index`, phase-receipt `completed_turn`, and terminal `completed_turn` must now be positive safe integers (`tools/diagnostics/movement_phase_coverage.cjs:75,100-103,116-120`). Receipt, terminal, and manifest indexes retain integer/exact-sequence validation.
- CLI turns now require canonical positive decimal spelling and a safe integer; zero, decimal, signed, scientific, and nonnumeric values exit at the argument boundary (`tools/diagnostics/movement_phase_coverage.cjs:22-28`).
- The exact string-`"21"` regression asserts `invalid_week_index`, `invalid_receipt_schema`, and `invalid_terminal_receipt`; CLI/index negatives are also present (`tests/movement_phase_coverage_diagnostic.test.ts:35-67`).
- The production fixture now asserts both OFF and ON `runTurn` results have `status === 'success'` before consuming state/report as weekly-emittable evidence (`tests/movement_phase_diagnostic.test.ts:95-106`).
- Retained evidence is coherent with those bytes: numeric RED exit `1` with the exact old-reader string-turn acceptance (1 failed, 18 passed); numeric GREEN exit `0` (2 files, 20 tests); current reader syntax exit `0`. The RED is meaningful for this correction and does not repair or replace the earlier incomplete reader RED.

## Remaining fail-open schema defect

The diagnostic top-level schema checks that `requested_formations` is an array but does not require its entries to be nonempty strings (`tools/diagnostics/movement_phase_coverage.cjs:78-84`). Receipt and terminal validation likewise do not require `formation_id` to be a string (`tools/diagnostics/movement_phase_coverage.cjs:87-100,112-120`). The loop templates any actor value into `${actor}:${row.week_index}` (`tools/diagnostics/movement_phase_coverage.cjs:89-95`), allowing numeric `737` to match CLI expectation `737:21`.

One novel discriminator created a complete, otherwise-valid two-phase artifact with numeric `737` in `requested_formations`, phase receipt `formation_id`, and terminal `formation_id`, then ran:

```text
node tools/diagnostics/movement_phase_coverage.cjs logs/prusac-diagnostic-20260929/continuation4_movement_observer_20261004_actor_schema_probe_artifact --expect-boundary 737:21 --json
```

Pass criterion for the strict reader was exit `1` with actor/schema rejection. Actual result was exit `0`, `coverage:["737:21"]`, and no inconsistencies. Evidence:

- `continuation4_movement_observer_20261004_actor_schema_probe.command.txt`
- `continuation4_movement_observer_20261004_actor_schema_probe.log`
- `continuation4_movement_observer_20261004_actor_schema_probe.exit.txt`
- `continuation4_movement_observer_20261004_actor_schema_probe_artifact/weekly_report.jsonl`

**Required correction:** require every `requested_formations` entry to be a nonempty string, and require every phase and terminal `formation_id` to be a nonempty string before membership/equality checks. Add the exact numeric-actor artifact as a negative regression. Preserve the existing sorted/deduplicated actor-manifest check and unrequested-actor failures.

## Preserved limits

- A future enabled 139-turn run must pass expectations for the selected actor at every emitted turn `1..139`; requesting only turns 137–139 will reject the other observed turns as unexpected. No range semantics is implied.
- The initial untracked execution summary was overwritten and has no byte backup. Root's labeled readback is not original-byte recovery. Raw initial logs/exits, the first independent NO-GO, parent campaign evidence, and protected artifacts remain intact; perfect artifact preservation must not be claimed.
- The earlier correction RED had a reader-fixture syntax error and remains incomplete for that historical no-expectation assertion. No retrospective RED is claimed.
- The observer remains preparation for a future configured measurement. It establishes no historical turns 137–139 writer, no turn-517 pre-order inputs, no gameplay correction, and closes none of the existing campaign/Farz/protected/control/paint/denominator/save/canon acceptance gaps.

No typecheck, campaign, prefix, replay, full suite, or unchanged test selection was run. The only execution was the single actor-schema discriminator above.
